// H11-Boot — server-only helpers for the Boot Gate.
// Kept in a *.server.ts file so nothing here can be pulled into the client
// bundle (uses supabaseAdmin for read-only gate + boot report persistence).
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { runBootGate, getReadinessReport, type ReadinessReport } from "@/sdk/boot";
import { CORE_VERSION } from "@/sdk";
import { currentEnv } from "@/sdk/feature-gates";

async function loadGates() {
  const { data, error } = await supabaseAdmin
    .from("platform_feature_gates")
    .select("gate, environment, enabled");
  if (error) throw new Error(error.message);
  return (data ?? []) as Array<{ gate: string; environment: string; enabled: boolean }> as never;
}

let bootPromise: Promise<ReadinessReport> | null = null;

export async function ensureBoot(): Promise<ReadinessReport> {
  if (!bootPromise) {
    bootPromise = (async () => {
      const report = await runBootGate({ loadGates });
      try {
        await supabaseAdmin.from("runtime_boot_reports").insert({
          ready: report.status === "ready" || report.status === "degraded",
          environment: currentEnv(),
          runtime_version: CORE_VERSION,
          sdk_version: CORE_VERSION,
          report: report as unknown as Record<string, unknown>,
        });
      } catch {
        /* boot must not fail if persistence is transient */
      }
      return report;
    })();
  }
  return bootPromise;
}

export function currentReadiness(): ReadinessReport {
  return getReadinessReport();
}
