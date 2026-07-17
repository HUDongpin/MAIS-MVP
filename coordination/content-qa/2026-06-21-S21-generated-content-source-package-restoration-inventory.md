# S21 Generated-Content Source Package Restoration Inventory

- Date: 2026-06-21
- Session ID: S21
- Workstream: Content pipeline and generated-content source package handoff
- Objective: Restore and inventory the generated-content source packages required by adapter-only data modules so S18/S23 can sign off the module-resolution unblock.
- Status: Completed for adapter module-resolution evidence; content production approval remains package-specific.

## Scope

This pass covered TypeScript adapters that import runtime JSON from `data/generated-content/`.

- Adapter import statements scanned: 36.
- Unique runtime JSON targets: 24.
- Missing runtime JSON targets after restoration check: 0.
- Runtime JSON files under `data/generated-content/` parsed by syntax check: 31/31.
- BNU junior package-local S18 source archive restored at `coordination/content-qa/mainland-bnu-junior-lessons-v1/lessons.json` from the runtime source copy.

## Restored/Confirmed Source Packages

| Package | Runtime source path | Count | Import surface | S21 source status |
| --- | --- | ---: | --- | --- |
| HK EASE practice v1 | `data/generated-content/hk-ease-practice-bank-v1/question-pack.json` | 701 questions | `data/hongKongEasePracticeQuestions.ts` | Present; JSON valid; S18 import signoff required because no same-name QA directory exists. |
| Mainland BNU junior lessons v1 | `data/generated-content/mainland-bnu-junior-lessons-v1/lessons.json` | 105 lessons | `data/mainlandBnuJuniorLessons.ts` | Present; package-local QA source archive restored; S18 preflight now passes. |
| US Arkansas K-G5 questions v1 | `data/generated-content/us-ar-math-k-g5-generated-bank-v1-1500/question-pack.json` | 1500 questions | `data/usArkansasQuestions.ts`, `data/usArkansasTopics.ts` | Present; JSON valid; row metadata records S18/manual or auto sample status. |
| US Arkansas G6-G12 questions v1 | `data/generated-content/us-ar-math-g6-g12-generated-bank-v1-1500/question-pack.json` | 1500 questions | `data/usArkansasQuestions.ts`, `data/usArkansasTopics.ts` | Present; JSON valid; row metadata records S18 manual review status. |
| US Arkansas textbooks v1 | `data/generated-content/us-ar-math-textbooks-v1/textbook-pack.json` | 7 books, 35 chapters, 245 problems | `data/usArkansasMiddleSchoolLessons.ts` | Present; JSON valid; package itself says `integrationStatus: not-integrated`. |
| US California G6-G12 questions v2 | `data/generated-content/us-ca-math-g6-g12-generated-bank-v2-1500/question-pack.json` | 1500 questions | `data/usCaliforniaTopics.ts` | Present; JSON valid; row metadata records auto QA/sample status. |
| US California K-G5 DeepSeek questions v3 | `data/generated-content/us-ca-math-k-g5-generated-bank-v3-deepseek-1500/question-pack.json` | 1500 questions | `data/usCaliforniaTopics.ts` | Present; JSON valid; adapter currently downlists broad K-G5 practice and uses adaptive beta subset only. |
| US California K-G5 textbooks v1 | `data/generated-content/us-ca-math-k-g5-textbooks-v1/lessons.json` | 29 lessons | `data/usCaliforniaLessons.ts`, `data/usCaliforniaTopics.ts` | Present; same-name S18/S23 evidence exists. |
| US Florida middle-school textbooks v1 | `data/generated-content/us-fl-math-middle-school-textbooks-v1/textbook-pack.json` | 3 books, 15 chapters, 105 problems | `data/usFloridaMiddleSchoolTopics.ts` | Present; JSON valid; package itself says `candidate-live-beta` with chapter review pending. |

Existing mainland PEP/HJB/BNU generated-content packages were also confirmed present for their adapter imports and retain their earlier package-specific evidence and statuses.

## Source Hygiene

- No secrets, API keys, private credentials, or raw local corpus text were read or written.
- No live `data/questions.ts`, `data/topics.ts`, `data/lessons.ts`, app routes, API routes, or provider behavior were changed.
- No staging, commit, branch, push, reset, or cleanup operation was performed.

## Checks Run

- `git status --short`
- Adapter import scan: 36 generated-content imports, 24 unique targets, 0 missing.
- JSON syntax check for all `data/generated-content/**/*.json`: pass for 31 files.
- Targeted adapter runtime import smoke with local `tsx`: pass for HK EASE, Arkansas, California, Florida, and BNU junior lesson adapters.
- `node coordination/content-qa/mainland-bnu-junior-lessons-v1/deepseek-v4-pro-lesson-qa.mjs --preflight`: failed before runner schema fix, then passed after the S18 package-local runner learned the current `metadata.*` schema.

## Checks Not Run

- No DeepSeek smoke/full QA call was run; preflight estimated 0 provider calls and does not read keys.
- No S11 Playwright regression was run.
- No S22 clean release-slice build was run.

## Handoff

- Next owner: S18 content QA for import/signoff interpretation.
- Next owner: S23 integration for candidate-to-live gate and release routing.
- Follow-up: S11/S22 should rerun relevant regression/release checks only after the owner chooses the adapter/source package slice to land.
