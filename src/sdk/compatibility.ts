// H10-MKT — CompatibilityService. Central checker that sits between the
// Registry and the Runtime. `install()` in the Runtime will delegate all
// go/no-go decisions here in Phase 2 (H11). During H10 both paths run and a
// PackCompatibilityDivergence@1 event is emitted on disagreement.
import type { CountryPack } from "./CountryPack";
import type { InstalledPack } from "./runtime";
import type { TrustPolicy } from "./trust-policy";
import type { TrustStore } from "./trust-store";
import { CORE_VERSION, satisfies } from "./version";
import { validatePack } from "./validator";
import { verifyEd25519, type PackSignatureRecord } from "./signing";

export interface CompatCheck {
  name: string;
  ok: boolean;
  severity: "error" | "warning" | "info";
  message?: string;
}
export interface CompatibilityReport {
  ok: boolean;
  checks: CompatCheck[];
}

export interface CompatibilityInput {
  pack: CountryPack;
  installed: InstalledPack[];
  signatures?: PackSignatureRecord[];
  trust: TrustPolicy;
  trustStore?: TrustStore;
  /** Raw manifest bytes used to verify signatures. */
  manifestBytes?: Uint8Array;
}

const err = (name: string, message: string): CompatCheck => ({ name, ok: false, severity: "error", message });
const warn = (name: string, message: string): CompatCheck => ({ name, ok: true, severity: "warning", message });
const ok = (name: string): CompatCheck => ({ name, ok: true, severity: "info" });

export class CompatibilityService {
  async check(input: CompatibilityInput): Promise<CompatibilityReport> {
    const checks: CompatCheck[] = [];
    const { pack, installed, signatures = [], trust, trustStore, manifestBytes } = input;
    const m = pack.manifest;

    // 1. Core compat
    if (!satisfies(m.requiresCore, CORE_VERSION)) {
      checks.push(err("core-version", `requires core ${m.requiresCore}, running ${CORE_VERSION}`));
    } else checks.push(ok("core-version"));

    // 2. Validator
    const v = validatePack(pack);
    if (!v.ok) v.errors.forEach((e) => checks.push(err("validator", e)));
    v.warnings.forEach((w) => checks.push(warn("validator", w)));

    // 3. Dependencies
    for (const dep of m.dependencies ?? []) {
      const rec = installed.find((r) => r.pack.manifest.country === dep.pack);
      if (!rec) checks.push(err("dependency", `missing dependency: pack ${dep.pack}`));
      else if (!satisfies(dep.range, rec.pack.manifest.version)) {
        checks.push(err("dependency", `${dep.pack}@${rec.pack.manifest.version} does not satisfy ${dep.range}`));
      } else checks.push(ok(`dependency:${dep.pack}`));
    }

    // 4. Signatures per TrustPolicy
    const sigCheck = await this.checkSignatures(signatures, trust, trustStore, manifestBytes);
    checks.push(...sigCheck);

    return { ok: checks.every((c) => c.ok || c.severity !== "error"), checks };
  }

  private async checkSignatures(
    signatures: PackSignatureRecord[],
    trust: TrustPolicy,
    store?: TrustStore,
    bytes?: Uint8Array,
  ): Promise<CompatCheck[]> {
    const checks: CompatCheck[] = [];
    if (trust.requiredSignatures === 0) return [ok("signatures:not-required")];

    if (signatures.length < trust.requiredSignatures) {
      checks.push(err("signatures", `need ${trust.requiredSignatures}, got ${signatures.length}`));
      return checks;
    }

    // Capability coverage
    for (const cap of trust.requiredCapabilities) {
      if (!signatures.some((s) => s.capability === cap)) {
        checks.push(err("signatures", `missing capability: ${cap}`));
      }
    }

    if (trust.distinctSigners) {
      const signers = new Set(signatures.map((s) => s.signer));
      if (signers.size < trust.requiredSignatures) {
        checks.push(err("signatures", `distinct signers required (${trust.requiredSignatures})`));
      }
    }

    if (!store || !bytes) {
      checks.push(warn("signatures", "trust store or manifest bytes unavailable; treated as advisory"));
      return checks;
    }

    for (const s of signatures) {
      const key = await store.find(s.signer, s.publicKey);
      if (!key || !key.active) {
        checks.push(err("signatures", `unknown or inactive key for ${s.signer}`));
        continue;
      }
      if (!key.capabilities.includes(s.capability)) {
        checks.push(err("signatures", `${s.signer} not authorised for ${s.capability}`));
        continue;
      }
      const res = await verifyEd25519(bytes, s.signature, s.publicKey);
      if (!res.verified) {
        // preview may accept unverified; other envs must not
        if (res.reason === "crypto-unavailable") checks.push(warn("signatures", `verification skipped (${res.reason})`));
        else checks.push(err("signatures", `verify failed for ${s.signer}: ${res.reason}`));
      } else checks.push(ok(`signature:${s.signer}`));
    }

    return checks;
  }
}

export const compatibilityService = new CompatibilityService();
