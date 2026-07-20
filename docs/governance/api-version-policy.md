# API Version Policy

## URL scheme
- Stable: `/api/public/v1/{endpoint}`
- Legacy aliases (deprecated): `/api/public/{calculate-tax,calculate-bpjs}`

## Headers
- Every response includes `X-Ruleset-Version` and `X-Request-Id`.
- Deprecated endpoints add `Deprecation: true`, `Sunset: <RFC 7231 date>`,
  and `Link: </api/public/v1/…>; rel="successor-version"`.

## Rules
- **Never break a `vN` endpoint.** Additive fields only. Contract change → `vN+1`.
- Sunset period ≥ 90 days between announce and removal.
- OpenAPI at `/api/public/v1/openapi.json` is the source of truth.
