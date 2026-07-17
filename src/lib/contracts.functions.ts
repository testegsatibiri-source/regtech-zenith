import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const listContracts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ companyId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("employment_contracts")
      .select("*")
      .eq("company_id", data.companyId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const contractSchema = z.object({
  id: z.string().uuid().optional(),
  company_id: z.string().uuid(),
  employee_id: z.string().uuid().nullable().optional(),
  contract_type: z.enum(["PKWT", "PKWTT"]),
  status: z.enum(["draft", "active", "expired", "terminated"]).default("draft"),
  position: z.string().nullable().optional(),
  base_salary: z.number().nonnegative(),
  start_date: z.string(),
  end_date: z.string().nullable().optional(),
  probation_end_date: z.string().nullable().optional(),
  version: z.number().int().min(1).default(1),
  clauses: z.record(z.string(), z.any()).default({}),
  notes: z.string().nullable().optional(),
});

export const upsertContract = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => contractSchema.parse(d))
  .handler(async ({ data, context }) => {
    const payload = {
      ...data,
      end_date: data.end_date || null,
      probation_end_date: data.probation_end_date || null,
      employee_id: data.employee_id || null,
    };
    const { data: row, error } = await context.supabase
      .from("employment_contracts")
      .upsert(payload)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteContract = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("employment_contracts")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
