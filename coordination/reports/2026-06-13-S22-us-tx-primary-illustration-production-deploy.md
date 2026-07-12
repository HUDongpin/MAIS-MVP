# S22 Texas K-G5 Illustration Production Deploy

- Date/time: 2026-06-13 00:00-00:05 Asia/Hong_Kong.
- Owner request: put the Texas K-G5 textbook concept illustrations online.
- Release path: guarded S22 production wrapper with pruned Vercel staging and explicit dirty-root override for the owner-requested publish.
- Deployment id: `dpl_3CMPYRdgKFi5jkhp9NkeadE4NGwU`.
- Deployment URL: `https://mais-l21rgczmv-peter-dongpin-hu-s-projects.vercel.app`.
- Primary live URL: `https://mais.hk/student/lessons/texas-k-g5-textbook`.
- Target: `production`.
- Ready status: confirmed by `vercel inspect`.
- Staging directory: `.tmp/vercel-staging/prod-20260612-texas-primary-illustrations`.
- Staged files: 2880.
- Staged bytes: 639721022.

## Preflight Evidence

- `npm run release:preflight -- --json`: passed.
- `npm run release:env-preflight -- --json`: passed; all 7 required production variable names present.
- `MAIS_ALLOW_DIRTY_ROOT_DEPLOY=1 npm run release:publish-preflight -- --json`: passed with dirty-root override recorded.
- `npm run type-check`: passed.
- `npm run build`: passed; route table included `/student/lessons/texas-k-g5-textbook`.

## Production Smoke

- `https://mais.hk/student/lessons/texas-k-g5-textbook`: HTTP 200.
- `https://www.mais.hk/student/lessons/texas-k-g5-textbook`: HTTP 200.
- `https://mais-mvp.vercel.app/student/lessons/texas-k-g5-textbook`: HTTP 200.
- `https://mais.hk/lesson-illustrations/us-tx-primary/us-tx-k-u01-l01-counting-collections-in-action/concept.png`: HTTP 200, `image/png`.
- `https://mais.hk/lesson-illustrations/us-tx-primary/us-tx-k-u01-l01-counting-collections-in-action/concept.svg`: HTTP 200, `image/svg+xml`.
- In-app Browser production DOM smoke on `https://mais.hk/student/lessons/texas-k-g5-textbook`: 300 cards, 300 images, 6 grade sections, H1 `Texas K-G5 Mathematics`, no horizontal overflow.

## Residual Risk

- The root worktree remains broadly dirty. This deployment used the existing pruned staging wrapper and an owner-requested dirty-root override, not a clean release branch.
- The raw deployment URL is protected by Vercel access control and returned HTTP 401 anonymously; production aliases returned HTTP 200.
- No git staging, commit, branch, merge, rebase, push, reset, delete, or revert was performed.
