# PH — RA 10173 (Data Privacy Act of 2012) — internal compliance assessment (audit item 8; 2026-09-23)

| Field | Value |
| --- | --- |
| Scope | Philippines Country Pack + pilot intake (`/ph`) — protection of statutory identifiers (TIN, SSS, PhilHealth, Pag-IBIG numbers) and bank data |
| Governing law | Republic Act No. 10173 (Data Privacy Act of 2012) and NPC implementing rules |
| Assessment date | 2026-09-23 |
| Author | UBoard Engineering |
| Reviewer | UBoard Compliance |
| Status | **Internal assessment (B2a-style). Not a legal opinion.** External review bundled with the B2b opinion scope. |

## What exists today by architecture

- **Pilot intake (`pilot_requests`):** RLS deny-all (no direct reads); submissions go
  through a server function with validation; IP addresses are stored only as a
  SHA-256 hash (`ip_hash`), never in plaintext; notifications contain no PII
  (generic alert only); rate limits per email (3/hour) and per network (10/hour).
- **Retention:** pilot request data is retained for 24 months, per the published
  privacy policy (`/ph/patakaran-sa-privacy`).
- **Access control:** platform reads of pilot requests are restricted to platform
  roles via the `has_role` security-definer function (roles live in a dedicated
  `user_roles` table, never on the profile); every read is written to the
  platform audit log.
- **Pack-side identifiers:** employee TIN/SSS/PhilHealth/Pag-IBIG numbers are
  validated for format (PH-STAT-IDS rule family) before any filing is generated,
  reducing the risk of corrupt personal data reaching government portals.
- **Filing artifacts:** stored with SHA-256 checksums and immutable after
  submission (`enforce_filing_immutability` trigger, ADR-0037).

## Gaps — each is a named ticket

| Ticket | Gap | Risk |
| --- | --- | --- |
| PH-RA10173-1 | Bank account data: processing register and storage rules not documented (pack does not store bank data today, but the pilot will) | Medium |
| PH-RA10173-2 | No named DPO (Data Protection Officer) for the PH operation | Medium — NPC expects a designated DPO for sensitive personal information processing |
| PH-RA10173-3 | No breach-notification runbook for PH — NPC requires notification within 72 hours of a qualifying breach | High if an incident occurs |
| PH-RA10173-4 | Employee statutory identifiers (TIN, SSS, PhilHealth, Pag-IBIG) are stored in plaintext in `country_metadata`; no field-level encryption decision documented for PH (contrast: ID pack has AES-GCM sealing per ADR-0038/Fase D) | Medium |

## Conclusion

Audit item 8 moves from "unverified" to **documented with named gaps**. This
assessment does not close the item: the final verdict requires external review
by Philippine counsel (same engagement as the B2b opinion — labor/tax plus data
privacy scope), and tickets PH-RA10173-1..4 must be resolved or explicitly
accepted before `commercialReady` can flip.
