import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const registrationRequestSchema = z
  .object({
    organizationType: z.enum(["ACCOUNTING_FIRM", "COMPANY"]),
    organizationName: z.string().trim().min(2).max(200),
    legalName: z.string().trim().max(250).optional().nullable(),
    taxId: z.string().trim().max(100).optional().nullable(),
    countryRequested: z.string().trim().regex(/^[A-Za-z]{2}$/).transform((value) => value.toUpperCase()),
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
