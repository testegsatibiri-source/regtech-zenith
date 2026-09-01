// H11-Mat — Version Compatibility Matrix (declarative).
// Consumed by the Boot Health Gate and before every install() decision.
// Change requires a new matrix version — old CompatibilityReports remain
// interpretable because engineVersion + matrixVersion are stored per report.
import type { CountryPack, InstalledPack } from "./index";
import { CORE_VERSION, satisfies } from "./version";

export interface CompatibilityMatrix {
  version: string; // matrix version (semver)
  runtime: string; // required runtime semver range
  sdk: string; // required SDK semver range
  packs: Record<string, string>; // country → semver range
}

export const COMPATIBILITY_MATRIX_V1: CompatibilityMatrix = {
  version: "1.0.0",
  runtime: `^${CORE_VERSION}`,
  sdk: `^${CORE_VERSION}`,
  packs: {
    ID: ">=0.1.0",
    PH: ">=0.1.0",
    MY: ">=0.1.0",
  },
};

export interface MatrixCheck {
  target: string;
  required: string;
  actual: string;
  ok: boolean;
}

export interface MatrixReport {
  matrixVersion: string;
  ok: boolean;
  checks: MatrixCheck[];
}

export function checkMatrix(
  matrix: CompatibilityMatrix,
  ctx: { runtimeVersion: string; sdkVersion: string; installed: InstalledPack[] },
): MatrixReport {
  const checks: MatrixCheck[] = [
    {
      target: "runtime",
      required: matrix.runtime,
      actual: ctx.runtimeVersion,
      ok: satisfies(matrix.runtime, ctx.runtimeVersion),
    },
    {
      target: "sdk",
      required: matrix.sdk,
      actual: ctx.sdkVersion,
      ok: satisfies(matrix.sdk, ctx.sdkVersion),
    },
  ];
  for (const [country, range] of Object.entries(matrix.packs)) {
    const rec = ctx.installed.find((p) => p.pack.manifest.country === country);
    if (!rec) {
      checks.push({ target: `pack:${country}`, required: range, actual: "—", ok: false });
    } else {
      checks.push({
        target: `pack:${country}`,
        required: range,
        actual: rec.pack.manifest.version,
        ok: satisfies(range, rec.pack.manifest.version),
      });
    }
  }
  return { matrixVersion: matrix.version, ok: checks.every((c) => c.ok), checks };
}

export function checkPackAgainstMatrix(
  matrix: CompatibilityMatrix,
  pack: CountryPack,
): MatrixCheck {
  const range = matrix.packs[pack.manifest.country];
  if (!range)
    return {
      target: `pack:${pack.manifest.country}`,
      required: "—",
      actual: pack.manifest.version,
      ok: true,
    };
  return {
    target: `pack:${pack.manifest.country}`,
    required: range,
    actual: pack.manifest.version,
    ok: satisfies(range, pack.manifest.version),
  };
}
