# Contribution Guide — New Country Pack

1. Create `src/packs/<iso2>/index.ts` exporting a `CountryPack`.
2. Fill the manifest (see `country-pack-spec.md`). Start with `version: 0.1.0`
   and only the capabilities you actually implement.
3. Implement the providers listed in `manifest.engines`. Reuse pure helpers
   from your own pack folder; never import another pack.
4. Register in `src/sdk/bootstrap.ts` via `CountryRuntime.tryInstall(myPack)`.
5. Add a smoke check to `/country-packs` — it should render with the correct
   version and capability badges.
6. Add rules/obligations progressively; each PR bumps `rulesetVersion`, not
   `version` (unless the provider surface changed).

## PR checklist
- [ ] Manifest + providers align (declared engine ⇒ provider present).
- [ ] No import from `@/packs/<other>/*`.
- [ ] `bunx tsgo --noEmit` passes.
- [ ] Runtime install emits `CountryPackInstalled@1` (verified locally).
