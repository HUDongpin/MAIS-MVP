# S18 Generated-Content Source Package Import Signoff

- Date: 2026-06-21
- Session ID: S18
- Workstream: Curriculum/content QA signoff for generated-content source package availability
- Decision: `approved-for-integration-review` for adapter module-resolution unblock only.

## Decision Boundary

S18 signs off that the restored/confirmed `data/generated-content/` runtime source packages are valid inputs for the current adapter imports. This is not a blanket production approval for every package. Full student-facing promotion still depends on each package's content QA, live-surface owner, S11 regression, S22 release readiness, and owner production decision.

## Evidence Summary

- Adapter imports scanned: 36.
- Unique runtime JSON targets: 24.
- Missing generated-content targets: 0.
- Runtime JSON parse result: 31/31 files valid.
- Targeted adapter import smoke: pass for the restored HK, AR, CA, FL, and BNU junior paths.
- BNU junior lessons package-local preflight: pass after source archive restoration and schema-aware runner fix.

## Package-Level QA Interpretation

| Package group | S18 status for this pass | Reasoning and limits |
| --- | --- | --- |
| Existing mainland PEP/HJB/BNU question and lesson packages with same-name evidence | Retain existing package-specific status | Existing QA reports, audits, decisions, or approved packs remain the governing evidence. This pass only confirms runtime source availability for adapters. |
| HK EASE practice v1 | Approved for adapter import and S04/S11 validation | 701 rows parse; required question fields present; row metadata reports source-distance pass, math QA pass, answer QA pass, text-only asset status, and approved green-batch manual status. No broader HK curriculum release claim is added here. |
| Mainland BNU junior lessons v1 | Approved for preflight-cleared integration review; not full QA approved | Source archive restored to `coordination/content-qa/mainland-bnu-junior-lessons-v1/lessons.json`; preflight now passes with 105 lessons, 105 sections, S1/S2/S3 coverage, RAG coverage 105/105, and 0 issues. Smoke/full QA still remain next gates. |
| US Arkansas K-G5 and G6-G12 question banks | Approved for adapter import and S23 integration review | Both 1500-row packs parse; required question fields present; source-distance and math QA statuses are present. K-G5 includes 198 manual review rows and 1302 accepted auto-sample rows; G6-G12 records 1500 accepted S18 manual review rows. S11/S22 checks remain required before release. |
| US Arkansas textbook pack v1 | Candidate-only for content; approved only for adapter module resolution | Pack parses with 7 books, 35 chapters, and deterministic math facts, but package status is `generated-review-package` / `not-integrated` and chapter review status is pending human curriculum review. |
| US California G6-G12 and K-G5 question banks | Approved for adapter import and S23 integration review with live-scope limits | Both 1500-row packs parse; required question fields present. Current adapter downlists broad K-G5 practice and uses the adaptive beta subset only. S18 does not expand the public claim beyond the adapter's current gating. |
| US California K-G5 textbook lessons v1 | Existing approved-for-integration-review evidence applies | Same-name S18 and S23 artifacts exist. Prior decision covers English-primary text-only California K-5 textbook beta lessons, with release status controlled by S22/S25 release policy. |
| US Florida middle-school textbook pack v1 | Candidate-only for content; approved only for adapter module resolution | Pack parses with 3 books, 15 chapters, and deterministic math facts, but chapter review status remains generated-pending S18 curriculum review. |

## BNU Junior Runner Fix

The restored BNU junior `lessons.json` uses the current package schema with lesson metadata nested under `lesson.metadata`. The package-local QA runner previously looked only at top-level lesson fields for grade, semester, topic, unit title, and evidence cards. S18 updated the runner to read `metadata.*` as the fallback source and reran the same preflight.

Result: `Preflight pass: 105 lessons, 105 sections, 0 issue(s).`

## Checks Run

- Adapter import existence scan: pass, 0 missing.
- JSON parse for `data/generated-content/**/*.json`: pass.
- Targeted adapter runtime import smoke via `./node_modules/.bin/tsx`: pass.
- BNU junior QA runner preflight: red before schema fix, green after schema fix.
- `npm run type-check`: failed outside this task on S12/server test drift, specifically missing `@/lib/server/userStore/teacherOpsNoticePersistence` and related implicit-any errors in `lib/server/userStoreTeacherOpsNoticePersistence.test.ts`.

## Checks Not Run

- DeepSeek smoke/full QA for BNU junior lessons was not run.
- S11 Playwright regression was not run.
- S22 clean release-slice build or Vercel verification was not run.

## Risks And Stop Conditions

- Adapter module resolution is unblocked in the working tree, but untracked source packages still need S25/S22 release slicing before landing.
- Packages marked candidate-only here must not be described as production-ready.
- Any live integration beyond source-package availability requires explicit live-surface owner scope plus S11/S22 gates.
