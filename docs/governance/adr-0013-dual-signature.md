# ADR-0013 — Dual Signature (Ed25519) + TrustStore + Trust Policy

**Status:** Accepted (H10)

## Decision

### Signatures
Country packs carry a list of signatures (not just one). Each signature has:
`{ signer, publicKey, algo: "ed25519", signature, capability, ts }`.

Two capabilities: `pack.sign` (author) and `pack.countersign` (reviewer /
global CTO). Signatures are verified against the raw manifest bytes using
Web Crypto Ed25519.

### TrustPolicy (configurable per environment)
| Environment | Signatures | Capabilities | Distinct signers | Experimental |
|-------------|:----------:|---------------------------------|:----------------:|:------------:|
| preview     | 1          | pack.sign                       | no               | allowed      |
| staging     | 1          | pack.sign                       | no               | denied       |
| production  | 2          | pack.sign + pack.countersign    | yes              | denied       |

Seeded in `public.trust_policies`; overridable by `platform_admin`.

### TrustStore abstraction
```
TrustStore (interface)
├── DbTrustStore   (H10, reads public.pack_signing_keys)
├── AwsKmsTrustStore   (future)
├── GoogleKmsTrustStore(future)
└── HsmTrustStore      (future)
```
Runtime & CompatibilityService depend only on the interface; swapping the
provider does not touch business code.

## Consequences

- Preview stays low-friction (single signature); production hardens by policy.
- Trust boundary can be lifted into KMS/HSM with zero code changes in Runtime.
- Pack tampering post-publish is detectable during install.
