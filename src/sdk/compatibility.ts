// H10-MKT / H11 — CompatibilityService. Central checker that sits between the
// Registry and the Runtime. Now versioned (engineVersion + matrixVersion) so
// historical reports stay interpretable across engine evolutions, and now
// emits structured SignatureRejectionCode values on failures.
import type { CountryPack } from "./CountryPack";
import type { InstalledPack } from "./runtime";
import type { TrustPolicy } from "./trust-policy";
import type { TrustStore } from "./trust-store";
import { CORE_VERSION, satisfies } from "./version";
import { validatePack } from "./validator";
import { verifyEd25519, type PackSignatureRecord } from "./signing";
import type { SignatureRejectionCode } from "./signature-rejection";
import {
  COMPATIBILITY_MATRIX_V1,
  checkPackAgainstMatrix,
  type CompatibilityMatrix,
} from "./compatibility-matrix";

export const COMPATIBILITY_ENGINE_VERSION = "1.0.0";

export interface CompatCheck {
  name: string;
  ok: boolean;
  severity: "error" | "warning" | "info";
  message?: string;
  code?: SignatureRejectionCode;
}
export interface CompatibilityReport {
  ok: boolean;
  engineVersion: string;
  matrixVersion: string;
  checks: CompatCheck[];
  rejections: Array<{ code: SignatureRejectionCode; message: string; signer?: string }>;
}

export interface CompatibilityInput {
  pack: CountryPack;
  installed: InstalledPack[];
  signatures?: PackSignatureRecord[];
  trust: TrustPolicy;
  trustStore?: TrustStore;
  /** Raw manifest bytes used to verify signatures. */
  manifestBytes?: Uint8Array;
  /** Override the matrix (defaults to COMPATIBILITY_MATRIX_V1). */
  matrix?: CompatibilityMatrix;
}

const err = (name: string, message: string, code?: SignatureRejectionCode): CompatCheck =>
  ({ name, ok: false, severity: "error", message, code });
const warn = (name: string, message: string): CompatCheck =>
  ({ name, ok: true, severity: "warning", message });
const ok = (name: string): CompatCheck => ({ name, ok: true, severity: "info" });

export class CompatibilityService {
  readonly engineVersion = COMPATIBILITY_ENGINE_VERSION;

  async check(input: CompatibilityInput): Promise<CompatibilityReport> {
    const checks: CompatCheck[] = [];
    const rejections: CompatibilityReport["rejections"] = [];
    const { pack, installed, signatures = [], trust, trustStore, manifestBytes } = input;
    const matrix = input.matrix ?? COMPATIBILITY_MATRIX_V1;
    const m = pack.manifest;

    // 1. Core compat
    if (!satisfies(m.requiresCore, CORE_VERSION)) {
      checks.push(err("core-version", `requires core ${m.requiresCore}, running ${CORE_VERSION}`));
    } else checks.push(ok("core-version"));

    // 2. Validator
    const v = validatePack(pack);
    if (!v.ok) v.errors.forEach((e) => checks.push(err("validator", e)));
    v.warnings.forEach((w) => checks.push(warn("validator", w)));

    // 3. Matrix
    const matrixCheck = checkPackAgainstMatrix(matrix, pack);
    if (!matrixCheck.ok) {
      const msg = `pack ${pack.manifest.country}@${matrixCheck.actual} does not satisfy matrix ${matrixCheck.required}`;
      checks.push(err("matrix", msg, "matrix_failed"));
      rejections.push({ code: "matrix_failed", message: msg });
    } else checks.push(ok("matrix"));

    // 4. Dependencies
    for (const dep of m.dependencies ?? []) {
      const rec = installed.find((r) => r.pack.manifest.country === dep.pack);
      if (!rec) checks.push(err("dependency", `missing dependency: pack ${dep.pack}`));
      else if (!satisfies(dep.range, rec.pack.manifest.version)) {
        checks.push(err("dependency", `${dep.pack}@${rec.pack.manifest.version} does not satisfy ${dep.range}`));
      } else checks.push(ok(`dependency:${dep.pack}`));
    }

    // 5. Signatures per TrustPolicy
    const sigCheck = await this.checkSignatures(signatures, trust, trustStore, manifestBytes);
    for (const c of sigCheck.checks) checks.push(c);
    for (const r of sigCheck.rejections) rejections.push(r);

    return {
      ok: checks.every((c) => c.ok || c.severity !== "error"),
      engineVersion: this.engineVersion,
      matrixVersion: matrix.version,
      checks,
      rejections,
    };
  }

  private async checkSignatures(
    signatures: PackSignatureRecord[],
    trust: TrustPolicy,
    store?: TrustStore,
    bytes?: Uint8Array,
  ): Promise<{ checks: CompatCheck[]; rejections: CompatibilityReport["rejections"] }> {
    const checks: CompatCheck[] = [];
    const rejections: CompatibilityReport["rejections"] = [];
    if (trust.requiredSignatures === 0) return { checks: [ok("signatures:not-required")], rejections };

    if (signatures.length < trust.requiredSignatures) {
      const msg = `need ${trust.requiredSignatures}, got ${signatures.length}`;
      checks.push(err("signatures", msg, "signature_missing"));
      rejections.push({ code: "signature_missing", message: msg });
      return { checks, rejections };
    }

    for (const cap of trust.requiredCapabilities) {
      if (!signatures.some((s) => s.capability === cap)) {
        const msg = `missing capability: ${cap}`;
        checks.push(err("signatures", msg, "capability_missing"));
        rejections.push({ code: "capability_missing", message: msg });
      }
    }

    if (trust.distinctSigners) {
      const signers = new Set(signatures.map((s) => s.signer));
      if (signers.size < trust.requiredSignatures) {
        const msg = `distinct signers required (${trust.requiredSignatures})`;
        checks.push(err("signatures", msg, "distinct_signers_required"));
        rejections.push({ code: "distinct_signers_required", message: msg });
      }
    }

    if (!store || !bytes) {
      checks.push(warn("signatures", "trust store or manifest bytes unavailable; treated as advisory"));
      return { checks, rejections };
    }

    for (const s of signatures) {
      // H11.1a — prefer keyId lookup; fall back to (publisher, publicKey).
      const key =
        (store.findByKeyId && s.keyId ? await store.findByKeyId(s.keyId) : undefined) ??
        (await store.find(s.signer, s.publicKey));
      if (!key) {
        const msg = `unknown key for ${s.signer} (keyId=${s.keyId})`;
        checks.push(err("signatures", msg, "key_unknown"));
        rejections.push({ code: "key_unknown", message: msg, signer: s.signer });
        continue;
      }
      if (!key.active) {
        const msg = `revoked key for ${s.signer} (keyId=${s.keyId})`;
        checks.push(err("signatures", msg, "key_revoked"));
        rejections.push({ code: "key_revoked", message: msg, signer: s.signer });
        continue;
      }
      if (!key.capabilities.includes(s.capability)) {
        const msg = `${s.signer} not authorised for ${s.capability}`;
        checks.push(err("signatures", msg, "capability_missing"));
        rejections.push({ code: "capability_missing", message: msg, signer: s.signer });
        continue;
      }
      const res = await verifyEd25519(bytes, s.signature, key.publicKey);
      if (!res.verified) {
        if (res.reason === "crypto-unavailable") {
          checks.push(warn("signatures", `verification skipped (${res.reason})`));
        } else {
          const msg = `verify failed for ${s.signer}: ${res.reason}`;
          checks.push(err("signatures", msg, "signature_invalid"));
          rejections.push({ code: "signature_invalid", message: msg, signer: s.signer });
        }
      } else checks.push(ok(`signature:${s.signer}`));
    }

    return { checks, rejections };
  }
}

export const compatibilityService = new CompatibilityService();

