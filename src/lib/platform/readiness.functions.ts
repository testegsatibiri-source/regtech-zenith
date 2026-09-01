// H11 — server function that returns the current Readiness Report to the
// platform UI. Requires an authenticated platform-staff session.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getReadiness = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const allowed = new Set([
      "platform_admin",
      "country_cto",
      "platform_operator",
      "platform_auditor",
    ]);
    if (!(roles ?? []).some((r) => allowed.has(r.role))) {
      throw new Error("Forbidden");
    }
    const { ensureBoot } = await import("@/lib/platform/boot.server");
    return ensureBoot();
  });
