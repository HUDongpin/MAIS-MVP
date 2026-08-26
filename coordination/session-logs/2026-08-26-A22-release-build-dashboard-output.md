# 2026-08-26 A22 Release Build Dashboard Output

- Agent: A22, production reliability and release engineering.
- Baseline: `main` merge commit `c8009edf7015f9eab5072f70948245091b4201e4`.
- Branch: `codex/release-build-dashboard-output-20260826`.
- Target PR: pending.
- Created: 2026-08-26.
- Expected closeout: 2026-08-26 after PR and exact-main CI evidence.
- Objective: make the production release build gate validate the dashboard output that Next.js App Router actually emits.

## Scope

- `scripts/release-build-gate.mjs`
- `scripts/release-build-gate.test.mjs`
- `scripts/deploy-vercel-production.test.mjs`
- `coordination/session-logs/2026-08-26-A22-release-build-dashboard-output.md`

## Root Cause And Change

- A fresh 228-route production build emitted `server/app/dashboard/page.js`.
- The release gate still required the obsolete `server/app/dashboard.html`, so the build completed but the gate failed afterward.
- The required-output contract now checks `server/app/dashboard/page.js` and exports the output list and pure verifier for direct regression coverage.
- The production evidence fixture now uses the same current App Router output path.

## Verification

- Red test: the new App Router output regression failed because the required-output contract and verifier were not exported and the old path was still configured.
- Focused green test: `node --test scripts/release-build-gate.test.mjs` passed 7/7.
- Release governance: `npm run test:release-governance` passed 91/91.
- Deployment wrappers: preview and production deployment tests passed 14/14.
- Type check: `npm run type-check` passed.
- Real isolated gate: `MAIS_RELEASE_BUILD_GATE_RUN_ID=dashboard-output-20260826 npm run release:build-gate -- --json` passed after generating 228/228 pages and finding all six required outputs.
- Build hygiene: `tsconfig.next.json` and `next-env.d.ts` hashes were unchanged, and the run-owned isolated build directory was removed automatically.
- No production deployment or production write was performed in this slice.
