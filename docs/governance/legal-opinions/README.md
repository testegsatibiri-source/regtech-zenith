# Legal opinions

Signed legal opinions that gate or unblock the `commercialReady` flag of a Country Pack
(ADR-0035 and ADR-0038).

## Rules

1. One file per opinion, named `<country-code>-<yyyy-mm-dd>.md` (e.g. `ID-2026-09-30.md`).
2. Every opinion follows `../legal-opinion-template.md`. Sections may not be dropped.
3. The author must be a lawyer licensed in the jurisdiction under review. Name, bar/PERADI
   number and scope go in the header table.
4. Opinions are append-only. A superseded opinion stays in place and gains a
   `Superseded by: <file>` line at the top.
5. ADR-0038 must reference the file before a pack flips `commercialReady: true`.

## Status

| Country | Opinion | State | Notes |
| --- | --- | --- | --- |
| `ID` — Indonesia | _none_ | **Pending** | Required by ADR-0038. Blocks the ID commercial gate together with Fase C (separations). Facts to review are frozen as of D5b: field-level AES-GCM sealing of NIK/NPWP/bank account, audited reveal trail, 72h incident register, data-subject requests, Indonesian retention catalogue and the scheduled purge routine. |
| `PH` — Philippines | _none_ | Not required yet | Pack is not commercially released. |

## What the reviewer receives

- `docs/adr/ADR-0038-commercial-readiness-privacy-extension.md`
- `docs/adr/ADR-0039-id-separation-ruleset.md`
- `src/lib/privacy/field-crypto.server.ts` (sealing envelope and key rotation)
- `src/lib/privacy/retention-purge.server.ts` (retention execution)
- `src/lib/privacy.functions.ts` (`RETENTION_CATALOG_ID`, DPO, incidents, DSR)
- Schema of `data_protection_officers`, `privacy_incidents`, `data_subject_requests`,
  `data_retention_policies`, `personal_data_access_log`
- Separation facts: `src/packs/indonesia/params/pp35-2021.ts`,
  `src/packs/indonesia/engines/separation.ts`, `src/packs/indonesia/__tests__/separation.test.ts`

## Open questions for Indonesian counsel (frozen 2026-07-21, Fase C)

1. **Entitlement matrix.** Confirm the pesangon/UPMK/UPH/uang-pisah composition per
   reason against PP 35/2021 arts. 36–56 as encoded in `ID_SEPARATION_REASONS`,
   including the 0.5×/0.75×/1× multipliers and the UPH scope.
2. **MK 168/PUU-XXI/2023 window.** Confirm that (a) blocking calculations dated
   on/after 2026-10-31 pending revalidation and (b) treating 2024-10-31 as the
   ruleset's effective-from are defensible readings of the transition rule.
3. **PKWT duration breach.** Confirm that refusing to auto-convert PKWT into PKWTT
   (violation flag + `requiresLegalClassification` + renewal block, no payment
   computed) is the correct platform posture under UU 13/2003 art. 59 as amended.
4. **Wage base.** Confirm (a) mandatory inclusion of fixed allowances in the
   separation wage base (UU 6/2023 art. 157) and (b) the 1/25 daily divisor
   (Permenaker 6/2016) used for UPH leave conversion.
