// H11-Sig — Structured signature-rejection codes.
// CompatibilityService and any signature-enforcing path MUST map failures to
// one of these codes. Codes are surfaced in `platform_audit_log`
// (`pack.signature.rejected`) and in the /platform/packs/signatures panel.

export type SignatureRejectionCode =
  | "signature_missing"
  | "signature_invalid"
  | "key_unknown"
  | "key_revoked"
  | "capability_missing"
  | "distinct_signers_required"
  | "policy_failed"
  | "matrix_failed";

export const SIGNATURE_REJECTION_LABELS: Record<SignatureRejectionCode, string> = {
  signature_missing: "Assinatura ausente",
  signature_invalid: "Assinatura inválida",
  key_unknown: "Chave desconhecida na TrustStore",
  key_revoked: "Chave revogada",
  capability_missing: "Capability de assinatura ausente",
  distinct_signers_required: "Assinantes distintos requeridos (dupla assinatura)",
  policy_failed: "Trust policy do ambiente falhou",
  matrix_failed: "Compatibility Matrix falhou",
};

export interface SignatureRejection {
  code: SignatureRejectionCode;
  message: string;
  signer?: string;
}
