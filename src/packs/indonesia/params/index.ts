// H11.1a — Indonesia parameters wired into the ConfigService.
// The pack builds a StaticConfigProvider from these tables so engines read
// via `ctx.config` and never import the tables directly.
import { StaticConfigProvider, ConfigService } from "@/sdk/config";
import { TER_TABLES, TER_CONFIG_KEYS, type TerCategory } from "./ter-tables";
import { UMP_2026, UMP_FALLBACK, umpConfigKey } from "./ump-2026";
import { UMK_TABLE, umkConfigKey } from "./umk-2026";
import { ID_EID_AL_FITR, eidAlFitrConfigKey } from "./eid-al-fitr";
import { BPJS_2026 } from "./bpjs-2026";
import { RELIGIONS, resolveThrHoliday, religiousHolidayConfigKey } from "./religious-holidays";

export * from "./ter-tables";
export * from "./ump-2026";
export * from "./umk-2026";
export * from "./eid-al-fitr";
export * from "./bpjs-2026";
export * from "./religious-holidays";

export function buildIndonesiaParamsMap(): Record<string, unknown> {
  const map: Record<string, unknown> = {};
  (["A", "B", "C"] as TerCategory[]).forEach((c) => {
    map[TER_CONFIG_KEYS.table(c)] = TER_TABLES[c];
    map[TER_CONFIG_KEYS.zero(c)] = TER_TABLES[c].zeroThreshold;
  });
  for (const entry of UMP_2026) map[umpConfigKey(entry.province)] = entry;
  map[umpConfigKey("Other")] = UMP_FALLBACK;
  for (const entry of UMK_TABLE) map[umkConfigKey(entry.province, entry.region)] = entry;
  for (const entry of ID_EID_AL_FITR) map[eidAlFitrConfigKey(entry.year)] = entry;
  // H23-A — BPJS parameters served from the ConfigService (no longer code constants).
  map["id.bpjs.version"] = BPJS_2026.version;
  map[BPJS_2026.health.key] = BPJS_2026.health;
  map[BPJS_2026.jht.key] = BPJS_2026.jht;
  map[BPJS_2026.jp.key] = BPJS_2026.jp;
  map[BPJS_2026.jkk.key] = BPJS_2026.jkk;
  map[BPJS_2026.jkm.key] = BPJS_2026.jkm;
  map[BPJS_2026.jkp.key] = BPJS_2026.jkp;
  // H23-B — THR anchor holidays per declared religion.
  for (const religion of RELIGIONS) {
    for (const year of [2025, 2026, 2027]) {
      const entry = resolveThrHoliday(religion, year);
      if (entry) map[religiousHolidayConfigKey(religion, year)] = entry;
    }
  }
  return map;
}

export function buildIndonesiaConfigService(base: Record<string, unknown> = {}): ConfigService {
  return new ConfigService([
    new StaticConfigProvider({ ...base, ...buildIndonesiaParamsMap() }),
  ]);
}
