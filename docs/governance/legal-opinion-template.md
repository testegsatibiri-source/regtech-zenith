# Template — Legal opinion for commercial-readiness exception

Use this template when a Country Pack needs a time-bounded exception to the `commercialReady` privacy requirement (ADR-0038). The completed opinion must be saved as `docs/governance/legal-opinions/<country-code>-<yyyy-mm-dd>.md` and referenced from ADR-0038.

---

## 1. Header

| Field | Value |
|---|---|
| Country Pack | e.g. `ID` — Indonesia |
| Governing law | e.g. Law 27/2022 on Personal Data Protection (UU PDP) |
| Opinion date | YYYY-MM-DD |
| Effective until | YYYY-MM-DD or event-driven condition |
| Author | Full name of lawyer / law firm |
| License / bar membership | e.g. PKPA / PERADI number, jurisdiction |
| Scope | Specific data elements, processing purpose, and system architecture reviewed |

## 2. Facts reviewed

Describe the actual system as reviewed:

- Database location and cloud provider region(s).
- Data elements stored in plaintext (e.g. NIK, NPWP, bank account number) and where (e.g. `employees.country_metadata`).
- Who can access the data (application roles, database roles, service accounts).
- Transfer mechanisms, if data leaves the country.
- Retention periods and deletion/anonymisation procedures.
- Incident-response process and notification timeline.

## 3. Legal analysis

For each obligation under the governing law, state:

- The rule (article / circular / official guidance).
- How the current implementation maps to the rule.
- Any gap and its assessed legal risk (low / medium / high).

Cover at minimum:

1. **Lawful basis** for processing each identifier.
2. **Sensitive / national ID data** rules (e.g. NIK under UU PDP).
3. **Data residency and cross-border transfer** restrictions.
4. **Retention and deletion** obligations.
5. **Data-subject rights** (access, correction, deletion, portability).
6. **Incident notification** deadline (e.g. 72 hours for UU PDP).
7. **DPO / representative** requirement.

## 4. Conclusion and conditions

State the binding conclusion:

> "Based on the facts above, operating the `<Country>` Country Pack without field-level encryption for `<data elements>` is legally defensible until `<date / condition>`, provided that `<conditions>` are met."

Conditions must be specific and verifiable, e.g.:

- A DPO is appointed and named by `<date>`.
- Incident-response runbook is operational and tested by `<date>`.
- Field-level encryption is deployed by `<date>`.
- Data does not leave `<region>`.
- A renewal opinion is obtained before expiry.

## 5. Revision and expiry

- Expiry date or event.
- Trigger that forces early revision (e.g. change in law, data breach, change of cloud region).
- Person responsible for tracking expiry.

## 6. Sign-off

| Role | Name | Date |
|---|---|---|
| Authoring lawyer | | |
| Reviewed by (Compliance) | | |
| Accepted by (Product / Engineering) | | |
