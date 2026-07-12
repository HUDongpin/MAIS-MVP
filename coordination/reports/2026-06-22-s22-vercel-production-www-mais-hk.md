# S22 Vercel Production Deployment - www.mais.hk

## Summary

- Date/time: 2026-06-22 20:43 HKT.
- Request: update current latest MAIS-MVP to `www.mais.hk` through Vercel.
- Project: `peter-dongpin-hu-s-projects/mais-mvp`.
- Final deployment id: `dpl_13odczieHH6AVJ3cP9W28BBSU6EA`.
- Final deployment URL: `https://mais-goat4ke32-peter-dongpin-hu-s-projects.vercel.app`.
- Production aliases confirmed by Vercel inspect:
  - `https://mais.hk`
  - `https://www.mais.hk`

## Release Path

- Used S22 pruned staging, not direct dirty-root deploy.
- Final staging directory: `.tmp/vercel-staging/20260622T-production-www-mais-hk-assets`.
- Staging manifest: 2251 files, 164156766 bytes, forbiddenPathCount 0.
- Excluded by policy: local secrets/generated outputs, `.local`, `.tmp`, `.vercel`, coordination backlogs, `public/question-illustrations`.
- Included after staging-policy correction: `public/games`, `public/auth`, `public/forum-assets`, `public/robots.txt`.

## Gates And Evidence

- S25 dirty-tree map refreshed: `coordination/release-intake/2026-06-22-S25-dirty-tree-map-20260622T124237Z.json`.
- Dirty-tree counts at release time: 817 collapsed entries, 347 tracked modified, 470 untracked status entries, 662 untracked files.
- `npm run type-check`: passed.
- `npm run build`: passed locally, 223 static pages generated.
- `npm run release:runtime-preflight -- --json`: passed.
- `npm run release:env-preflight -- --json`: passed; required production variable names present, no secret values inspected.
- `npm run release:publish-preflight -- --json`: passed with dirty-root override for this owner-requested current-latest production staging release.
- Vercel cloud build: completed; final inspect status `Ready`.

## Notes

- Vercel CLI required shell proxy env: `NODE_USE_ENV_PROXY=1`, `HTTP_PROXY/HTTPS_PROXY=http://127.0.0.1:10808`, `ALL_PROXY=socks5h://127.0.0.1:10808`.
- No Git staging, commit, push, reset, delete, or branch operation was performed.
- Full Playwright and live browser smoke were not run during this deploy pass.
- Residual risk: this production release was cut from a very dirty, uncommitted worktree. S25/S22 should still separate runtime, tests, generated content, coordination evidence, and release tooling into reviewable slices.

## 23:25 HKT Update - California K-G5 492题 Live Package Production Deploy

### Summary

- Date/time: 2026-06-22 23:25 HKT.
- Request: deploy the current MAIS-MVP version after importing the S18 QA-passed California K-G5 492-question live package.
- Project: `peter-dongpin-hu-s-projects/mais-mvp`.
- Final deployment id: `dpl_GG39ztKvYAtrQK8BLgXH1wYw2sts`.
- Final deployment URL: `https://mais-7zlcbe3qr-peter-dongpin-hu-s-projects.vercel.app`.
- Production aliases confirmed by Vercel inspect:
  - `https://mais.hk`
  - `https://www.mais.hk`

### Release Path

- Used S22 pruned staging, not direct dirty-root deploy.
- Final staging directory: `.tmp/vercel-staging/20260622T2330-ca492-live`.
- Staging manifest: 2252 files, 166409711 bytes, forbiddenPathCount 0.
- Staging manifest included the live California package file: `data/generated-content/us-ca-k5-knowledge-point-practice-v1/question-pack.json`.
- Staging package equality check: staged California package matched `coordination/content-qa/us-ca-k5-knowledge-point-practice-v1/question-pack.json`.

### Gates And Evidence

- S25 dirty-tree map refreshed: `coordination/release-intake/2026-06-22-S25-dirty-tree-map-20260622T151937Z.md`.
- Dirty-tree counts at release time: 828 collapsed entries, 347 tracked modified, 481 untracked status entries, 710 untracked files.
- `npm run release:runtime-preflight -- --json`: passed.
- `npm run release:env-preflight -- --json`: passed; required production variable names present, no secret values inspected.
- `npm run release:publish-preflight -- --json`: passed with dirty-root override for this owner-requested current-version production staging release.
- `npm run build`: passed locally, 223 static pages generated.
- `npm run type-check`: passed after the build completed. A first concurrent run failed because `npm run build` was rewriting `.next/types`; it was rerun independently and passed.
- Vercel deploy command: `MAIS_ALLOW_DIRTY_ROOT_DEPLOY=1 node scripts/deploy-vercel-production.mjs --json --run-id 20260622T2330-ca492-live`.
- Vercel cloud build: completed; final inspect status `Ready`.
- Alias-level inspect: `vercel inspect https://www.mais.hk --scope peter-dongpin-hu-s-projects` resolved to `dpl_GG39ztKvYAtrQK8BLgXH1wYw2sts` with status `Ready`.

### Notes

- No Git staging, commit, push, reset, delete, or branch operation was performed.
- Vercel CLI worked directly in this pass; no proxy environment was required.
- Full Playwright and live browser/curl smoke were not run during this pass; Vercel inspect provided deployment and alias evidence.
- Residual risk: this production release was cut from a very dirty, uncommitted worktree. S25/S22 should still separate runtime, tests, generated content, coordination evidence, and release tooling into reviewable slices.
