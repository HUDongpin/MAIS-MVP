# S23 Candidate-To-Live Gate - Generated-Content Source Package Unblock

- Date: 2026-06-21
- Session ID: S23
- Candidate package set: generated-content runtime source packages imported by data adapters
- Upstream owner: S21
- Independent QA owner: S18
- Regression owner: S11
- Release owner: S22
- Current decision: `approved-for-integration-review` for adapter module-resolution unblock; production promotion remains package-specific.

## Required Evidence

- S21 candidate artifacts complete: Yes for the 24 unique runtime JSON targets currently imported by `data/*.ts` adapters.
- S18 QA decision: Yes for source-package import/signoff; package-specific content production approval remains limited as documented in `coordination/content-qa/2026-06-21-S18-generated-content-source-package-import-signoff.md`.
- S24 exact-layer decision: Not needed for this adapter/source-package unblock. Future answer-critical visuals still require S24.
- Live-surface integration plan: Hold. This task did not authorize direct edits to live `data/questions.ts`, `data/topics.ts`, `data/lessons.ts`, app routes, or API routes.
- S11 targeted regression: Not run.
- S22 clean release slice or release blocker: Not run; root dirty-tree policy still applies.
- Owner production approval: Not requested or recorded in this pass.

## Promotion Decision

Decision: unblock adapter-only module resolution by keeping/restoring the required `data/generated-content/` JSON source packages and documenting S18 import signoff. Do not promote candidate-only packages to production solely from this decision.

Files allowed into the integration-review slice:

- `data/generated-content/hk-ease-practice-bank-v1/question-pack.json`
- `data/generated-content/mainland-bnu-junior-lessons-v1/lessons.json`
- `coordination/content-qa/mainland-bnu-junior-lessons-v1/lessons.json`
- `coordination/content-qa/mainland-bnu-junior-lessons-v1/deepseek-v4-pro-lesson-qa.mjs`
- `coordination/content-qa/mainland-bnu-junior-lessons-v1/deepseek-v4-pro-lesson-qa/`
- US AR/CA/FL generated-content runtime source packages already present in the working tree and listed in the S21 inventory.

Files explicitly excluded from this gate:

- Live aggregate files such as `data/questions.ts`, `data/topics.ts`, `data/grades.ts`, and `data/lessons.ts`.
- App routes, API routes, UI components, and provider/environment files.
- Raw private corpus output or any secret-bearing file.

## Package Release Routing

| Slice | S23 routing |
| --- | --- |
| HK EASE practice | Route to S04/S11 only after owner selects this live practice slice; source package is import-ready. |
| BNU junior lessons | Route to S05 only after S18 smoke/full QA or owner-approved limited beta scope; preflight is green. |
| Arkansas question banks | Route to S03/S04/S11/S22 as a separate Arkansas slice; source packages are import-ready. |
| Arkansas textbook pack | Hold production; curriculum review pending and package says `not-integrated`. |
| California question banks | Route only within current adapter downlist/adaptive-beta limits unless owner expands scope. |
| California K-G5 textbooks | Existing S18/S23 evidence applies; release still depends on clean slice policy. |
| Florida middle-school textbooks | Hold production beyond current beta/candidate usage until S18 curriculum review and S11/S22 gates are recorded. |

## Checks

- Adapter import existence scan: 36 import statements, 24 unique targets, 0 missing.
- Runtime JSON parse: 31/31 valid.
- Targeted adapter import smoke: pass.
- BNU junior preflight: pass after schema-aware runner fix.
- `npm run type-check`: failed on unrelated S12 server test drift, not on generated-content module resolution.

## Rollback/Downlist Path

If release slicing finds the restored source packages too broad, downlist by removing the corresponding adapter slice from the release candidate rather than deleting source packages from the dirty root. For California K-G5 question content, keep the existing adapter downlist behavior unless the owner explicitly reopens broad practice promotion.

## Owner Decisions Needed

- Choose which regional source-package slice should be prepared first for S11/S22: HK EASE, BNU junior lessons, Arkansas, California, or Florida.
- Decide whether BNU junior lessons should proceed to S18 smoke/full QA using approved provider credentials and cost/rate-limit awareness.
- Confirm whether candidate-only US textbook packs should remain source-available but release-held, or be sent through full S18 review.
