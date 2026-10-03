import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const registrationRequestSchema = z
  .object({
    organizationType: z.enum(["ACCOUNTING_FIRM", "COMPANY"]),
    organizationName: z.string().trim().min(2).max(200),
    legalName: z.string().trim().max(250).optional().nullable(),
    taxId: z.string().trim().max(100).optional().nullable(),
    countryRequested: z
      .string()
      .trim()
      .regex(/^[A-Za-z]{2}$/)
      .transform((value) => value.toUpperCase()),
    planRequested: z
      .string()
      .trim()
      .regex(/^[a-z][a-z0-9_-]{1,63}$/)
      .optional()
      .nullable(),
    expectedCompanies: z.number().int().min(1).max(100000).default(1),
    expectedUsers: z.number().int().min(1).max(100000).default(1),
  })
  .strict();

type RegistrationRequestRow = {
  id: string;
  applicant_user_id: string;
  organization_type: "ACCOUNTING_FIRM" | "COMPANY";
  organization_name: string;
  country_requested: string;
  plan_requested: string | null;
  expected_companies: number;
  expected_users: number;
  status: string;
  created_at: string;
};

type RegistrationInsertResult = {
  data: RegistrationRequestRow | null;
  error: { message: string } | null;
};

type RegistrationInsertQuery = {
  select(columns: string): {
    single(): Promise<RegistrationInsertResult>;
  };
};

type RegistrationTableAccess = {
  from(table: "registration_requests"): {
    insert(values: {
      applicant_user_id: string;
      organization_type: "ACCOUNTING_FIRM" | "COMPANY";
      organization_name: string;
      legal_name: string | null;
      tax_id: string | null;
      country_requested: string;
      plan_requested: string | null;
      expected_companies: number;
      expected_users: number;
    }): RegistrationInsertQuery;
  };
};

/**
 * Public intake for a registration request. Approval, Country Pack entitlement,
 * organization creation and subscription creation are deliberately not handled
 * here; those operations require a trusted review/conversion workflow.
 */
export const submitRegistrationRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => registrationRequestSchema.parse(input))
  .handler(async ({ data, context }) => {
    const db = context.supabase as unknown as RegistrationTableAccess;
    const { data: row, error } = await db
      .from("registration_requests")
      .insert({
        applicant_user_id: context.userId,
        organization_type: data.organizationType,
        organization_name: data.organizationName,
        legal_name: data.legalName ?? null,
        tax_id: data.taxId ?? null,
        country_requested: data.countryRequested,
        plan_requested: data.planRequested ?? null,
        expected_companies: data.expectedCompanies,
        expected_users: data.expectedUsers,
      })
      .select(
        "id, applicant_user_id, organization_type, organization_name, country_requested, plan_requested, expected_companies, expected_users, status, created_at",
      )
      .single();

    if (error) throw new Error(error.message);
    if (!row) throw new Error("Registration request was not created.");
    return row;
  });

const registrationListSchema = z.object({
  status: z
    .enum(["SUBMITTED", "IN_REVIEW", "APPROVED", "REJECTED", "WITHDRAWN", "CONVERTED"])
    .optional(),
  limit: z.number().int().min(1).max(200).default(100),
});

export const listRegistrationRequests = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => registrationListSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userHasAnyRole, PILOT_DECISION_ROLES, logPilotAudit } =
      await import("@/lib/pilot/authorization.server");
    if (!(await userHasAnyRole(context.userId, PILOT_DECISION_ROLES))) {
      throw new Error("Forbidden");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let query = supabaseAdmin
      .from("registration_requests")
      .select(
        "id, applicant_user_id, organization_type, organization_name, legal_name, country_requested, country_approved, plan_requested, expected_companies, expected_users, status, reviewed_by, reviewed_at, decision_reason, organization_id, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.status) query = query.eq("status", data.status);

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    await logPilotAudit({
      actor: context.userId,
      action: "registration_request.list",
      target: "registration_requests",
      country: null,
      payload: { status: data.status ?? null, count: (rows ?? []).length },
    });
    return rows ?? [];
  });

const registrationDecisionSchema = z
  .object({
    id: z.string().uuid(),
    action: z.enum(["START_REVIEW", "APPROVE", "REJECT"]),
    countryApproved: z
      .string()
      .trim()
      .regex(/^[A-Za-z]{2}$/)
      .transform((value) => value.toUpperCase())
      .optional(),
    reason: z.string().trim().max(1000).optional().nullable(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.action === "APPROVE" && !value.countryApproved) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["countryApproved"],
        message: "Approved country is required.",
      });
    }
    if (value.action === "REJECT" && !value.reason?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reason"],
        message: "A rejection reason is required.",
      });
    }
    if (value.action !== "APPROVE" && value.countryApproved) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["countryApproved"],
        message: "Only approvals can set an approved country.",
      });
    }
  });

export const decideRegistrationRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => registrationDecisionSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userHasAnyRole, PILOT_DECISION_ROLES, logPilotAudit } =
      await import("@/lib/pilot/authorization.server");
    if (!(await userHasAnyRole(context.userId, PILOT_DECISION_ROLES))) {
      throw new Error("Forbidden");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: previous, error: readError } = await supabaseAdmin
      .from("registration_requests")
      .select(
        "id, status, country_requested, country_approved, organization_type, organization_name, plan_requested",
      )
      .eq("id", data.id)
      .single();
    if (readError) throw new Error(readError.message);
    if (previous.status !== "SUBMITTED" && previous.status !== "IN_REVIEW") {
      throw new Error("Only submitted or in-review requests can be decided.");
    }

    let update: {
      status: "IN_REVIEW" | "APPROVED" | "REJECTED";
      country_approved?: string | null;
      reviewed_by?: string;
      reviewed_at?: string;
      decision_reason?: string | null;
    };

    if (data.action === "START_REVIEW") {
      update = { status: "IN_REVIEW" };
    } else if (data.action === "APPROVE") {
      const country = data.countryApproved!;
      const { assertPackAvailable } = await import("@/lib/packs/loader.server");
      await assertPackAvailable(country);
      update = {
        status: "APPROVED",
        country_approved: country,
        reviewed_by: context.userId,
        reviewed_at: new Date().toISOString(),
        decision_reason: data.reason ?? null,
      };
    } else {
      update = {
        status: "REJECTED",
        country_approved: null,
        reviewed_by: context.userId,
        reviewed_at: new Date().toISOString(),
        decision_reason: data.reason!.trim(),
      };
    }

    const { data: row, error } = await supabaseAdmin
      .from("registration_requests")
      .update(update)
      .eq("id", data.id)
      .in("status", ["SUBMITTED", "IN_REVIEW"])
      .select(
        "id, status, country_requested, country_approved, reviewed_by, reviewed_at, decision_reason",
      )
      .single();
    if (error) throw new Error(error.message);

    await logPilotAudit({
      actor: context.userId,
      action: `registration_request.${data.action.toLowerCase()}`,
      target: data.id,
      country: row.country_approved ?? row.country_requested,
      oldValue: previous,
      newValue: row,
    });
    return row;
  });


const convertRegistrationSchema = z.object({ id: z.string().uuid() }).strict();

type ConversionRpcResult = {
  data:
    | {
        registration_request_id: string;
        organization_id: string;
        organization_subscription_id: string;
      }[]
    | null;
  error: { message: string } | null;
};

type RegistrationConversionRpc = {
  rpc(
    functionName: "convert_registration_request",
    args: { _request_id: string; _actor_user_id: string },
  ): Promise<ConversionRpcResult>;
};

export const convertApprovedRegistrationRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => convertRegistrationSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userHasAnyRole, PILOT_DECISION_ROLES, logPilotAudit } =
      await import("@/lib/pilot/authorization.server");
    if (!(await userHasAnyRole(context.userId, PILOT_DECISION_ROLES))) {
      throw new Error("Forbidden");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: request, error: readError } = await supabaseAdmin
      .from("registration_requests")
      .select(
        "id, status, country_requested, country_approved, plan_requested, organization_id, applicant_user_id",
      )
      .eq("id", data.id)
      .single();
    if (readError) throw new Error(readError.message);
    if (request.status !== "APPROVED" && request.status !== "CONVERTED") {
      throw new Error("Only an approved request can be converted.");
    }
    if (request.status === "CONVERTED" && !request.organization_id) {
      throw new Error("Converted request is missing its organization link; manual reconciliation required.");
    }
    if (!request.country_approved) {
      throw new Error("An approved country is required before conversion.");
    }

    const { assertPackAvailable } = await import("@/lib/packs/loader.server");
    await assertPackAvailable(request.country_approved);

    // Call through the authenticated user's JWT so auth.uid() is available
    // and the database independently verifies the platform role.
    const rpc = context.supabase as unknown as RegistrationConversionRpc;
    const { data: converted, error: conversionError } = await rpc.rpc(
      "convert_registration_request",
      { _request_id: request.id, _actor_user_id: context.userId },
    );
    if (conversionError) throw new Error(conversionError.message);
    const result = converted?.[0];
    if (!result) throw new Error("Registration conversion returned no result.");

    await logPilotAudit({
      actor: context.userId,
      action: "registration_request.convert",
      target: request.id,
      country: request.country_approved,
      oldValue: request,
      newValue: result,
    });

    return result;
  });
