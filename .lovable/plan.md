## Sprint H7-Gov — Engineering Governance (revised)

Docs-and-config only. No app code, no schema, no runtime changes. Incorporates all 8 adjustments plus the new `architecture-freeze.md`.

### CI runner
GitHub Actions with `oven-sh/setup-bun@v2`. No alternative provider.

### Deliverables

**1. Repository Strategy** — `docs/architecture/repository-strategy.md` (new).
- Decision: **monorepo now**.
- Explicit **exit criteria** (any one triggers a split evaluation, not automatic):
  - Country Pack maintained by an external organization.
  - Independent release cadence required (pack ships > 2× the Core rhythm).
  - Contractual/regulatory isolation requirement for a pack's source.
  - Team scale: > 5 full-time contributors dedicated to a single pack.
- Folder layout, import rules (Core → SDK only; Packs → SDK only), branch conventions (`main`, `feat/*`, `fix/*`, `pack/{code}/*`, `chore/*`, `docs/*`).
- Pack publication model (in-repo, semver per `manifest.version`).

**2. Permission Matrix** — `docs/governance/permission-matrix.md` (new).
- Roles: CEO, CTO Global, Country CTO {code}, Contributor, Auditor.
- Columns: **Edit / Review / Merge / Approve Release**.
- Scopes: Core, SDK, Runtime, Pack-{code}, Docs, CI config.
- Cross-references CODEOWNERS (mechanism) and Contribution Workflow (process).

**3. Release Policy** — extend `docs/governance/release-process.md`.
- New "Component Versioning" section (Core / SDK / each Pack — independent semver; `manifest.version` vs `rulesetVersion` restated).
- New **"Release Gates" section — a Country Pack MUST NOT be released if**:
  - Conformance Suite fails (`bun test src/packs/{code}/`).
  - `validatePack()` returns any error (warnings allowed, must be documented).
  - `pack.health()` returns `status: "error"`.
- Changelog location per component.

**4. CODEOWNERS** — `.github/CODEOWNERS` (new).
- Core: `/src/lib/engines/`, `/src/lib/observability/`, `/src/lib/apiAuth.ts`, `/src/lib/apiCors.ts`, `/src/lib/events/`, `/src/router.tsx`, `/src/start.ts`, `/src/routes/` → `@cto-global`.
- SDK: `/src/sdk/` → `@cto-global @sdk-maintainers`.
- Packs: `/src/packs/indonesia/` → `@country-cto-id`; `/src/packs/philippines/` → `@country-cto-ph`; `/src/packs/malaysia/` → `@country-cto-my`.
- Governance & architecture (extra protection layer): `/docs/governance/`, `/docs/architecture/`, `/docs/adr/` (reserved for future ADRs outside `governance/`) → `@cto-global @ceo`.
- CI/workflows: `/.github/` → `@cto-global`.
- Header comment documents placeholder handles (real teams assigned when org is created).

**5. Contribution Workflow** — extend `docs/governance/contribution-guide.md`.
- Ordered flow: Branch → Develop → Test Kit → PR opened → **ADR gate** → Code review → CODEOWNERS approval → Merge → Release.
- **ADR gate** (mandatory step before merge): "Does this change touch SDK contracts, Runtime, Providers, Manifest schema, or event catalog? → Yes → Architecture Review + ADR under `docs/governance/ADR-XXXX-*.md` required before approval. → No → proceed to code review." Add checkbox to PR template.
- PR template `.github/pull_request_template.md` with checkboxes: tests green, ADR filed if required, no Core edits for pack-only PRs, `docs/tech-debt.md` updated.

**6. CI/CD Segmentation** — `.github/workflows/` (4 pipelines).
- `ci-shared.yml`: reusable setup (bun install + cache).
- `ci-core.yml`: paths `src/lib/**`, `src/routes/**`, `src/router.tsx`, `src/start.ts`, `vite.config.ts`, `tsconfig.json`. Runs `tsgo --noEmit` + full `bun test`.
- `ci-sdk.yml`: paths `src/sdk/**`. Runs typecheck + `bun test src/sdk/`.
- `ci-packs.yml`: matrix over `src/packs/{indonesia,philippines,malaysia}/**`. Runs the pack's conformance suite + coexistence test.
- `ci-docs.yml` (new, per your suggestion): paths `docs/**`, `.github/**`, `**/*.md`. Validates:
  - Markdown lint (`markdownlint-cli2`).
  - Internal link check (`lychee` limited to repo).
  - YAML lint on `.github/workflows/*.yml`.
  - CODEOWNERS syntax check (`gh api` dry-run OR `codeowners-validator`).
  - Cross-references: fail if a doc links to a governance file that doesn't exist.
- Per-component concurrency groups to cancel superseded runs.

**7. Tech Debt classification** — extend `docs/tech-debt.md`.
- Replace ad-hoc `P0/P1/P2` legend with fixed taxonomy: **P0 · P1 · P2 · P3 · Deferred · Won't Do**.
  - P0 blocks production launch.
  - P1 blocks next country expansion.
  - P2 post-GA polish.
  - P3 nice-to-have.
  - Deferred: valid but timeboxed out.
  - Won't Do: explicitly rejected (with reason).
- Reclassify existing DEBT-001…DEBT-021 into the new scale (no content changes, only tags).

**8. Architecture Freeze** — `docs/governance/architecture-freeze.md` (new, per your recommendation).
- Declares frozen surfaces (effective Sprint H7-Gov):
  - **SDK contracts** (`src/sdk/providers/*`, `src/sdk/CountryPack.ts`, `src/sdk/manifest.ts`).
  - **Runtime** (`src/sdk/runtime.ts`, `src/sdk/context.ts`, `src/sdk/validator.ts`, `src/sdk/interfaces.ts`).
  - **Event catalog** (`src/sdk/events.ts`, `src/lib/events/bus.ts`).
  - **Capability list** (`src/sdk/Capability.ts`).
- Change policy: any modification requires an approved ADR + `@cto-global` + `@ceo` sign-off.
- **Escape valve — v3.0 criteria**: enumerate objective triggers (breaking change accumulated in ≥ 3 ADRs; capability model insufficient for a signed pack contract; > 5 packs live requiring lifecycle state machine as a required, not optional, feature).
- Non-frozen: params, `rulesetVersion` content, Pack internals, UI, business modules, DB schema.

### Files touched

New:
- `docs/architecture/repository-strategy.md`
- `docs/governance/permission-matrix.md`
- `docs/governance/architecture-freeze.md`
- `.github/CODEOWNERS`
- `.github/pull_request_template.md`
- `.github/workflows/ci-shared.yml`
- `.github/workflows/ci-core.yml`
- `.github/workflows/ci-sdk.yml`
- `.github/workflows/ci-packs.yml`
- `.github/workflows/ci-docs.yml`

Edited (docs only):
- `docs/governance/release-process.md` (+ Component Versioning + Release Gates)
- `docs/governance/contribution-guide.md` (+ ordered flow + ADR gate)
- `docs/tech-debt.md` (reclassify to P0/P1/P2/P3/Deferred/Won't Do)

### Explicit non-goals
Marketplace, lifecycle state machine, signature verification, hot reload, remote plugins, microservices, actual GitHub team creation, real runtime code changes.

### Success criteria
- All 10 new artifacts + 3 doc edits exist and cross-reference each other consistently.
- All YAML workflows lint clean; `ci-docs.yml` self-validates the new docs.
- Zero changes under `src/lib/`, `src/sdk/`, `src/packs/`, `src/routes/`, `supabase/`.
- `docs/tech-debt.md` uses the new fixed classification end-to-end.
