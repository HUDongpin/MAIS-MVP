# A18/A21 Physical Cleanup Extraction Handoff

Date: 2026-07-17 HKT

Agents: A18 curriculum QA and content quality; A21 content pipeline and RAG operations

Branch: `codex/A18-A21-content-evidence-closure`

Source baseline: `cef544e09bee8118ddcf3bf3005e570bdf4977e3`

## Objective

Extract the reviewed A18/A21 QA and candidate evidence from this dirty worktree into exact, reviewable commits without promoting live content or staging generated review renders.

## Write and staging scope

- Commit-ready A18/A21 evidence selected from the formal 2026-07-17 physical-cleanup fingerprint.
- Eight approved evidence files after removing machine-local absolute paths and local-file URL schemes.
- This handoff log.

## Explicit exclusions

- Eight differing files under `data/generated-content/` remain HOLD for row-level A18 review and A23 promotion decisions.
- The mode-only audit-script duplicate remains unstaged.
- Rendered QA output, static review output, screenshots, public game/reference images, and other PNG files remain unstaged.
- No integration-main files, provider credentials, environment files, or secrets are in scope.

## Plan

1. Freeze exact A18 and A21 path lists from the formal fingerprint.
2. Sanitize the eight approved evidence files using repo-relative or descriptive source labels.
3. Create separate exact A18 QA-evidence and A21 pipeline/candidate commits where ownership permits.
4. Verify staged boundaries, syntax, JSON parsing, candidate validation, local-path removal, and secret-like pattern gates.
5. Leave HOLD and discard candidates dirty for the parent physical-cleanup workflow.

## Baseline evidence

- Index was empty before extraction.
- The source is an existing linked worktree; no new worktree was created.
- The package validator had a pre-existing old-branch dependency failure before edits: `data/usCaliforniaMicroLessons.ts` is absent. The raw failure will be preserved as baseline evidence, and an isolated temporary-copy run may supply the current-main dependency without adding it to this source branch.

## Extraction results

### A18 QA evidence

- Commit: `6332bb7a4f9a75ae7b673f15cf5793dd5399a53c`
- Scope: 65 exact files, comprising 62 direct A18 evidence files and 3 sanitized A18 files.
- Committed bytes: 4,809,170.
- No A21-owned file, HOLD file, rendered/review artifact, PNG, public asset, or handoff log entered this commit.

### A21 pipeline and candidate evidence

- Scope: 28 exact evidence files, comprising 23 direct A21 artifacts and 5 sanitized A21 files, plus this handoff log.
- Evidence bytes before adding this log: 2,264,650.
- The containing commit identifier is reported in the parent physical-cleanup handoff because a commit cannot record its own identifier.
- No A18-owned file, HOLD file, rendered/review artifact, PNG, or public asset entered this package.

## Validation evidence

- `git diff --cached --check`: passed for each exact package before commit.
- Staged JSON parsing: A18 17/17; A21 13/13.
- Staged `.mjs` syntax checks: A18 9/9; A21 4/4.
- Staged local-path and high-confidence secret-like pattern scan: passed without printing candidate content or credential-like values.
- Raw candidate validator: retained the pre-existing `ENOENT` for missing old-branch dependency `data/usCaliforniaMicroLessons.ts`.
- Isolated temporary-copy validator with the current-main dependency supplied read-only: passed with 41 topics, 492 expected questions, 492 actual questions, and 0 findings.
- A21 generators ran only in an isolated temporary copy: 11 grade buttons, 392 standards, 146 cards, 68 question candidates, 68 lesson candidates, 0 errors, 0 warnings, 0 blocked phrases, and a 2-question/2-lesson static review page.
- Texas review still states that no source-distance audit was completed; it remains `needs-repair` and `candidate-only`.
- Independent fingerprint review found zero missing or extra paths in both owner packages.

## Code-quality correction

Independent review found that a later generator run could reintroduce machine-local source labels and local-file URLs even though the committed evidence had been sanitized. It also found that removing Markdown hard-break whitespace could collapse metadata lines under CommonMark rendering.

The separate corrective package therefore:

- persists the descriptive `<california-math-common-core-skill-root>` label while retaining environment-variable and repo-local runtime resolution;
- keeps the browser navigation URL runtime-only and persists repo-relative review/screenshot labels;
- sanitizes success, warning, and failure messages before writing smoke evidence;
- restores metadata separation with explicit blank lines and no trailing whitespace.

The temporary portability suite passed both a successful browser smoke and an expected missing-review-page failure. Generated JSON/Markdown contained no machine-local absolute path or local-file URL. The containing corrective commit identifier is reported in the parent handoff.

## Remaining HOLD inventory

The following eight differing live-data candidates remain unstaged and require A18 row-level review plus A23 promotion approval:

- `data/generated-content/mainland-bnu-junior-generated-bank-v1-1500/approved-question-pack.json`
- `data/generated-content/mainland-hjb-junior-generated-bank-v2-1500/question-pack.json`
- `data/generated-content/hk-ease-practice-bank-v1/question-pack.json`
- `data/generated-content/us-ar-math-g6-g12-generated-bank-v1-1500/question-pack.json`
- `data/generated-content/us-ar-math-k-g5-generated-bank-v1-1500/question-pack.json`
- `data/generated-content/us-ca-k5-knowledge-point-practice-v1/question-pack.json`
- `data/generated-content/us-ca-math-g6-g12-generated-bank-v2-1500/question-pack.json`
- `data/generated-content/us-fl-math-middle-school-textbooks-v1/textbook-pack.json`

## Remaining discard inventory

- 15 generated paths under `coordination/content-qa/us-ca-k5-knowledge-point-practice-v1/rendered*/`.
- 2 generated static-review paths under `coordination/content-qa/us-ca-math-rag-v2-candidate/review/`.
- 1 mode-only duplicate: `scripts/audit-mainland-high-rag-v4-candidate-solvability.ts`.

These paths remain dirty and unstaged. Physical deletion is deferred to the parent workflow after commit integration, fresh fingerprint verification, and duplicate/HOLD rechecks.
