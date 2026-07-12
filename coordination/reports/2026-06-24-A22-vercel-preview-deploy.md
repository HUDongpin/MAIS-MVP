# 2026-06-24 A22 Vercel Preview Deployment

Agent: A22 production reliability and release engineering  
Request: Deploy updated MAIS-MVP version through Vercel  
Target: Vercel Preview only; production was not requested explicitly.

## Deployment

- Preview URL: https://mais-5i0wtzj09-peter-dongpin-hu-s-projects.vercel.app
- Vercel deployment id: `dpl_4VUnREGLhm4cwUVXgLT5whUb9F7f`
- Vercel project: `mais-mvp`
- Vercel scope: `peter-dongpin-hu-s-projects`
- Inspect URL: https://vercel.com/peter-dongpin-hu-s-projects/mais-mvp/4VUnREGLhm4cwUVXgLT5whUb9F7f
- Alias reported by Vercel: `mais-mvp-hudongpin-7372-peter-dongpin-hu-s-projects.vercel.app`
- Deploy source: pruned A22 staging package, not dirty repository root
- Staging directory: `.tmp/vercel-staging/a22-preview-20260624T1539Z`
- Staging package: 2,276 files, 167,991,025 bytes, 0 forbidden paths
- Vercel inspect final state: `READY`; build state `READY`

## Guardrails

- A25 dirty-tree intake refreshed before deploy:
  - Report: `coordination/release-intake/2026-06-24-A25-dirty-tree-map-20260624T153358Z.md`
  - Expanded status entries: 1,164
  - Collapsed status entries: 901
  - Direct dirty-root deploy remained forbidden
- Deployed with `node scripts/deploy-vercel-preview.mjs --json --run-id a22-preview-20260624T1539Z`.
- No Git staging, commit, branch, push, reset, delete, or production promotion was performed.
- No secret values were read, printed, staged, or written.

## Checks

- `node scripts/release-env-guard.mjs preview --json`: passed.
- `node scripts/prepare-vercel-staging.mjs --dry-run --json --run-id a22-preview-20260624`: passed.
- `NEXT_DIST_DIR=.tmp/a22-next-build NEXT_TSCONFIG_PATH=tsconfig.next.json npm run build`: passed.
- `vercel inspect https://mais-5i0wtzj09-peter-dongpin-hu-s-projects.vercel.app --scope peter-dongpin-hu-s-projects --wait --timeout 10m --format json`: final state `READY`.

## Residual Risks

- `npm run type-check` failed before deploy in A06-owned visualization test contracts:
  - `FORMULA_BINDING_SOURCE_CONTRACT` is expected by tests but not exported from `mathFormulaBindings`.
  - `semanticBindingSourceContract` is expected on `MathSceneEvidenceSnapshot` but is absent.
- A direct root `npm run build` failed once while using the shared `.next` output with page-data collection errors for A12-owned admin storage routes. The same source passed with isolated A22 build output.
- Public unauthenticated smoke did not prove MAIS app route content because Vercel returned `Login - Vercel` HTML for preview routes. This appears to be Vercel Deployment Protection or preview authentication behavior. The deployment itself is `READY`; app-level route smoke needs a Vercel-authenticated browser session or a preview bypass.

## Handoff

- Production promotion remains blocked until the owner explicitly requests production and A22/A19 publish checks are run.
- A06 should clear the visualization type-check drift before this preview is considered fully regression-clean.
- A22 can rerun authenticated smoke after the owner provides a Vercel preview bypass path or confirms an authenticated browser smoke route.
