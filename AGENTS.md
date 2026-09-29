<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules

- Pilot access control lives in `src/lib/pilot/authorization.ts` (pure decision) and
  `authorization.server.ts` (identity + service-role lookup); UI never decides access —
  so a direct RPC or Google OAuth sign-in cannot bypass the gate.
- `createCompany` is the single workspace-creation boundary and must call
  `authorizePilotCountry` before any write — one gate, one place to audit.
- Pilot lifecycle transitions run only through `pilot.functions.ts` mutations with a
  platform role check and `approved_by` derived from the session, never client input.
