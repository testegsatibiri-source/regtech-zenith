# Permission Matrix

_Status: **Active** · Owner: `@cto-global` · Effective: Sprint H7-Gov._

Defines **who can do what** on each area of the codebase. CODEOWNERS enforces
this mechanically; this document is the source of truth for reviewers.

## Roles

| Role                | Handle placeholder      | Description                                          |
| ------------------- | ----------------------- | ---------------------------------------------------- |
| CEO                 | `@ceo`                  | Final approver for architecture freeze changes.      |
| CTO Global          | `@cto-global`           | Owns Core, SDK, Runtime, CI, governance docs.        |
| SDK Maintainer      | `@sdk-maintainers`      | Reviews SDK-contract PRs alongside CTO Global.       |
| Country CTO {iso2}  | `@country-cto-{iso2}`   | Owns `src/packs/{code}/` end-to-end.                 |
| Contributor         | *(any team member)*     | Opens PRs, may not self-approve.                     |
| Auditor             | `@auditor`              | Read-only + release-note approval; no merge rights.  |

## Matrix

Columns:
- **Edit** — may push commits to a branch touching this scope.
- **Review** — approval counts against required-review count.
- **Merge** — may merge the PR once approvals + CI are green.
- **Approve Release** — may sign the release checklist for this scope (see
  `release-process.md`, "Release Gates"). **Distinct from Merge**: approving
  code and approving publication are separate responsibilities.

| Scope                                | Contributor | Country CTO {iso2} | SDK Maintainer | CTO Global | CEO   | Auditor |
| ------------------------------------ | ----------- | ------------------ | -------------- | ---------- | ----- | ------- |
| `src/lib/**` (Core)                  | Edit        | —                  | Review         | Edit / Review / Merge / Approve Release | Review / Approve Release | Review |
| `src/sdk/**` (SDK & Runtime)         | Edit        | —                  | Edit / Review  | Edit / Review / Merge / Approve Release | Approve Release | Review |
| `src/packs/{iso2}/**`                | Edit        | Edit / Review / Merge / Approve Release | Review | Review / Merge (override) | — | Review |
| `src/routes/**`                      | Edit        | —                  | Review         | Edit / Review / Merge / Approve Release | — | Review |
| `docs/architecture/**`               | Edit        | —                  | Review         | Edit / Review / Merge | Review / Approve Release | Review |
| `docs/governance/**` (ADRs, freeze)  | Edit        | Review             | Review         | Edit / Review / Merge | Review / Approve Release | Review |
| `.github/**` (CI, CODEOWNERS)        | Edit        | —                  | Review         | Edit / Review / Merge | — | — |
| `docs/tech-debt.md`                  | Edit        | Review             | Review         | Edit / Review / Merge | — | Review |

## Notes

- **Merge (override)** on packs: CTO Global may merge a pack PR only for a
  cross-cutting Core change that must land atomically (rare; requires ADR).
- **Approve Release ≠ Merge.** A merged commit is not a release. Release
  approval requires passing the gates in `release-process.md`.
- **Architecture freeze changes** (`docs/governance/architecture-freeze.md` or
  any file listed inside it) require both `@cto-global` and `@ceo` review.
- Placeholder handles (`@cto-global`, `@country-cto-id`, …) are wired to real
  GitHub teams when the org is provisioned. Until then, individuals stand in.

## Related

- `.github/CODEOWNERS` — mechanical enforcement.
- `docs/governance/contribution-guide.md` — PR flow using this matrix.
- `docs/governance/architecture-freeze.md` — extra approval layer.
