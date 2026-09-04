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
- `src/lib/privacy/field-crypto.server.ts` (sealing envelope and key rotation)
- `src/lib/privacy/retention-purge.server.ts` (retention execution)
- `src/lib/privacy.functions.ts` (`RETENTION_CATALOG_ID`, DPO, incidents, DSR)
- Schema of `data_protection_officers`, `privacy_incidents`, `data_subject_requests`,
  `data_retention_policies`, `personal_data_access_log`
