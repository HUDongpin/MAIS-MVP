# S22 California K-5 Textbook Production Deploy - 2026-06-19

## Scope

- Session: S22 production reliability and release engineering.
- QA owners consumed: S18 curriculum QA, S05 lesson integration, S11 regression quality, S23 promotion.
- Target: `https://www.mais.hk`.
- Package: `coordination/content-qa/us-ca-math-k-g5-textbooks-v1/`.

## Release Slice

- Baseline: previous production staging snapshot `.tmp/vercel-staging/20260619T043704Z`, deployment `dpl_2CkFjJ9tfTrNwNXf7RxdjpnEnSe8`.
- Overlay files:
  - `data/usCaliforniaTopics.ts`
  - `data/usCaliforniaQuestions.ts`
  - `data/usCaliforniaLessons.ts`
  - `data/generated-content/us-ca-math-k-g5-textbooks-v1/lessons.json`
- Clean slice path: `.tmp/vercel-staging/ca-k5-clean-slice-20260619`.
- Source file count after local build cleanup: 3016.
- Forbidden path scan: no `.env*`, `.git`, `coordination/`, `.local/`, or `node_modules/` entries found in the clean slice.

## Verification

- Root `npm run type-check`: passed.
- Root `npm run test:question-bank`: passed, 75/75.
- Root `npm run build`: passed.
- Clean slice `npm run build`: passed, 141 pages.
- Vercel production env preflight: required production variable names present, missing 0.
- Local S11 route regression: passed, 1/1.
- Production S11 route regression:
  - Command: `PLAYWRIGHT_BASE_URL=https://www.mais.hk PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_RUN_ID=prod-ca-k5-textbook-final-20260619 npx playwright test tests/e2e/california-k5-textbook-lessons.spec.ts --project=desktop-chrome --reporter=list --timeout=90000`
  - Result: 1 passed.
- Live HTTP smoke: `https://www.mais.hk` returned HTTP 200.
- Live lesson API smoke: `https://www.mais.hk/api/lessons/us-ca-math-k-k-cc-count-sequence` returned slug `us-ca-math-k-k-cc-count-sequence`, grade `K`, and `practiceQuestions: 0`.
- Live questions API smoke: `https://www.mais.hk/api/questions?grade=K&publisher=US_CA_MATH` returned 0 questions, confirming the old California K practice bank remains downlisted in production.

## Deployment

- Command: `vercel deploy .tmp/vercel-staging/ca-k5-clean-slice-20260619 -y --prod --scope peter-dongpin-hu-s-projects --project mais-mvp --no-wait`.
- Deployment ID: `dpl_CV3Zi56yrp6MCazMSVboM5NeTckh`.
- Deployment URL: `https://mais-de7ro799r-peter-dongpin-hu-s-projects.vercel.app`.
- Vercel target: production.
- Final inspect status: Ready.
- Aliases:
  - `https://www.mais.hk`
  - `https://mais.hk`
  - `https://mais-mvp.vercel.app`
  - `https://mais-mvp-peter-dongpin-hu-s-projects.vercel.app`
  - `https://mais-mvp-hudongpin-7372-peter-dongpin-hu-s-projects.vercel.app`

## Notes

- The three earlier Mainland PEP PNG test blockers were resolved by enforcing PNG existence only for approved exact-image asset manifest entries; questions without approved assets remain text-only.
- No real secrets were printed, copied, staged, or committed.
- No Git staging, commit, branch, merge, rebase, push, reset, delete, or revert operations were performed.
