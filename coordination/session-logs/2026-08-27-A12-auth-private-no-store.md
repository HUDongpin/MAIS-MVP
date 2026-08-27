# 2026-08-27 A12 Auth Private No-Store Boundary

- Owner: A12 Backend/API platform lead
- Branch: `codex/a12-auth-private-no-store-20260827`
- Worktree: `.worktrees/a12-auth-private-no-store-20260827`
- Target PR: pending
- Created: 2026-08-27 (Asia/Hong_Kong)
- Expected closeout: 2026-08-27
- Baseline: `origin/main@1ec4df2e1dd3288d40418f963c2782edf39641a6`
- Declared slice: require browser, shared-CDN, and Vercel-CDN private no-store headers on every response that crosses the shared authentication JSON boundary, including rate-limit and stable service-unavailable responses.
- Hard boundary: no feature UI, parent persistence, deployment workflow, environment variable, credential, provider, database, or production mutation changes.

## Evidence and handoff

- The protected Vercel candidate exposed `/api/me` as an unauthenticated `401` with only `Cache-Control: no-store`; the release smoke correctly rejected the missing `private` directive.
- A regression test first reproduced the unsafe header on success, `503`, and standalone `429` responses, then passed after the shared boundary was fixed.
- The runtime change overwrites any public cache directive with `private, no-store` at `Cache-Control`, `CDN-Cache-Control`, and `Vercel-CDN-Cache-Control`.
- Verification on the clean isolated worktree:
  - focused auth guard test: 6/6 pass;
  - related authentication/session tests: 32/32 pass;
  - parent console gate: 400/400 pass, 0 skipped;
  - deployment read-only smoke unit tests: 16/16 pass;
  - release governance: 91 pass, 11 explicit skips, 0 failures;
  - `npm run type-check`: pass;
  - `npm run build`: pass (202 routes generated; `/api/me` included);
  - `git diff --check`: pass.
- Production behavior remains unclaimed until this exact slice is merged, deployed from the resulting main SHA, and the protected candidate plus public aliases are re-probed.
