// H11.1a — Indonesia parameters wired into the ConfigService.
// The pack builds a StaticConfigProvider from these tables so engines read
// via `ctx.config` and never import the tables directly.
import { StaticConfigProvider, ConfigService } from "@/sdk/config";
import { TER_TABLES, TER_CONFIG_KEYS, type TerCategory } from "./ter-tables";
import { UMP_2026, UMP_FALLBACK, umpConfigKey } from "./ump-2026";
import { ID_EID_AL_FITR, eidAlFitrConfigKey } from "./eid-al-fitr";

export * from "./ter-tables";
export * from "./ump-2026";
export * from "./eid-al-fitr";

export function buildIndonesiaParamsMap(): Record<string, unknown> {
  const map: Record<string, unknown> = {};
  (["A", "B", "C"] as TerCategory[]).forEach((c) => {
    map[TER_CONFIG_KEYS.table(c)] = TER_TABLES[c];
    map[TER_CONFIG_KEYS.zero(c)] = TER_TABLES[c].zeroThreshold;
  });
  for (const entry of UMP_2026) map[umpConfigKey(entry.province)] = entry;
  map[umpConfigKey("Other")] = UMP_FALLBACK;
  for (const entry of ID_EID_AL_FITR) map[eidAlFitrConfigKey(entry.year)] = entry;
  return map;
}

export function buildIndonesiaConfigService(base: Record<string, unknown> = {}): ConfigService {
  return new ConfigService([
    new StaticConfigProvider({ ...base, ...buildIndonesiaParamsMap() }),
  ]);
}
