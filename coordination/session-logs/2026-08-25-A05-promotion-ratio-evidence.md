# Session Handoff

- Date: 2026-08-25 (Asia/Hong_Kong)
- Agent ID: A05
- Workstream: Promotion Gate Shadow v1 — independent Lesson semantics evidence
- Status: Completed
- Owner: A05 Lesson lead
- Branch: `codex/a05-promotion-ratio-evidence-20260825`
- Worktree: `/Volumes/Starship/MAIS-MVP/.worktrees/a05-promotion-ratio-evidence-20260825`
- Target PR: `pending` (A23 clean composition PR)
- Creation date: 2026-08-25
- Expected closeout date: 2026-08-25, after composition review/landing and clean-worktree verification
- Baseline/source/target SHA: `b6c7c347a49a813e454e707dd3c16399dcf29909`
- Promotion Unit: `us-ca-math-rag-v2-g6-ratios-v1`
- Parent package: `us-ca-math-rag-v2-candidate` remains `candidate-only`
- Decision: A05 Lesson semantics evidence passes for this exact Shadow slice only. The lesson remains candidate-only, requires repair before live use, and authorizes no live write, Preview, deploy, registry import, or production claim.
- Files changed:
  - `coordination/integration/pilots/us-ca-math-rag-v2-g6-ratios-v1/inputs/evidence/a05-lesson-semantics.v1.json`
  - `coordination/session-logs/2026-08-25-A05-promotion-ratio-evidence.md`

## Independent source readback

- Authoritative read source: clean worktree at Git object `b6c7c347a49a813e454e707dd3c16399dcf29909`; no dirty-root candidate bytes were used.
- Candidate file: `coordination/content-qa/us-ca-math-rag-v2-candidate/s05-lesson-candidate-pack.json`.
- Selected lesson ID: `s05-ca-rag-v2-lesson-031-6-rp-ratios`; unique match count `1`; JSON pointer `/lessons/30`.
- Raw source file SHA-256: `5904f83d47620749c97fa2471029e7d0c56d41cdefa5f57649f78d7131e23de3`.
- Stable-key normalized selected-record SHA-256: `7f3afb81f52b92854009ca5be3be62310e304736c554f9dba5caafe4bf0e3c0d`.
- Bound three-record candidate aggregate digest: `35c1d947840453fde081f80f32f1e0f47d080fdb6d2da2007f566084ebd780c7`.
- Candidate state readback: `languageMode=en`, `releaseStatus=not-live`, `manualQaStatus=candidate-only-pass-for-s18-review`, approval `candidate-only`, and S18/S11/S23 review states remain pending or not promoted.
- Lesson source container: `lessonModule`.
- Exact source sequence: `objective`, `prerequisiteCheck`, `conceptExplanation`, `workedExample`, `guidedPractice`, `independentPractice`, `remediation`, `teacherNotes`.
- Exact Shadow DTO sequence: `objective`, `workedExample`, `guidedPractice`, `independentPractice`, `remediation`.
- Fields deliberately omitted from the Shadow DTO: `prerequisiteCheck`, `conceptExplanation`, `teacherNotes`. Their omission is explicit compatibility evidence, not permission for a future live adapter to drop them silently.

## Lesson, Practice, and misconception checks

- The Lesson worked-example prompt is byte-for-byte equal to Practice `s04-ca-rag-v2-q031-6-rp-ratios` prompt locale `en`.
- The Lesson worked-example answer is `12 cups`, and its reasoning is byte-for-byte equal to the Practice English explanation: first `5 x 4 = 20`, then `3 x 4 = 12`. Independent numeric oracle: `12` cups; ratio direction is preserved.
- Lesson metadata targets both known misconceptions: `ratio order reversed` and `unit rate not normalized`.
- The current remediation targets only `ratio order reversed`. A05 therefore records `remediationRequired=true`; the full misconception set is not approved for live teaching as-is.
- Guided Practice is an open-ended prompt with a `teacherMove`, but no answer key or assessable rubric. Independent Practice is an open-ended creation task with a broad `evidenceExpected` statement, but no answer key or assessable rubric. Both remain blocked for live use.
- The selected record contains English-only lesson content and no bilingual lesson payload. A05 sets `inventBilingualFields=false`; a Shadow adapter must not fabricate Chinese or other localized fields.
- The concept explanation contains the frozen grammar defect `The double number lines and ratio tables becomes your map`; this evidence records it and does not repair or normalize it.

## Live blockers and exact boundary

1. `missing-bilingual-fields` at `lessonModule`: English-only source must remain explicit; localization cannot be guessed.
2. `known-grammar-issue` at `lessonModule.conceptExplanation`: the singular verb must be repaired in a new candidate version before live review.
3. `open-ended-practice-without-answer-or-rubric` at `lessonModule.guidedPractice+independentPractice`: deterministic assessment and feedback are not currently possible.

The existing remediation also fails to address `unit rate not normalized` explicitly. This is retained through `remediationRequired=true` and must be resolved during a new candidate/live-readiness review. The future boundary is exactly `candidate-only-no-live-write`.

## Evidence binding

- Evidence schema: `promotion-evidence.v1`.
- Checker version: `promotion-gate-shadow-v1`.
- Evidence raw SHA-256: `3b8b0320ce61b3510d9386a4d0e826ea8bd8b5416562f883ca858f196a269366`.
- Evidence semantic payload SHA-256: `cf2c656c21c3d3427ed0272a0bae32ad8ef65c1a7c4301f6e53949beab53494f`.
- Trust boundary: this file is a path/hash-bound A05 declaration for independent composition checks, not cryptographic identity or human authentication.

## Checks run

- Confirmed the worktree branch, exact baseline SHA, and clean start state.
- Ran `npm run type-check` successfully on the clean pinned baseline before writing evidence.
- Parsed all 68 lesson candidates from the exact baseline, asserted one-and-only-one selected ID, and checked the selected record path and pointer.
- Recomputed raw-file, stable-normalized record, and aggregate candidate SHA-256 digests with the current A23 canonicalization implementation.
- Compared Lesson and Practice prompt, answer, reasoning, and numeric oracle deterministically.
- Inspected the exact Lesson source sequence, Shadow-mapped sequence, omitted fields, language mode, misconception coverage, remediation target, and all three live blockers.
- Compared the evidence wrapper and semantic payload against the current A23 Promotion Gate implementation contract.
- Parsed the final evidence JSON and ran the A23 evidence validator with exact candidate and baseline bindings.
- Verified exact staged path scope and clean post-commit worktree state.

## Checks not run

- Application build/browser tests: not run because this is a machine-evidence/report-only slice with no TypeScript, route, registry, runtime, or live-source change.
- Full Promotion Gate pilot: not run in the A05 owner slice; A23 owns manifest composition and Shadow execution, while A11/A22 own independent replay and isolation proof.

## Risks and handoff

- A05 does not make the A18 curriculum/source-distance decision, the A23 state-transition decision, the A11 independent replay decision, or the A22 release-isolation decision.
- This evidence must become stale if its candidate digest, source commit, target baseline commit, checker version, selected record bytes, or versioned semantic contract changes.
- A23: hash-bind this exact immutable evidence artifact in the Pilot Manifest without rewriting it, and keep omitted fields visible in the compatibility report.
- A18: retain the live block until grammar, bilingual coverage, both misconception paths, and open-ended assessment criteria are repaired and independently re-reviewed.
- A11: independently replay the worked-example equality/oracle and negative cases for missing sequence fields, invented bilingual data, missing rubrics, and stale bindings.
- A22: prove the composed Shadow run is clean, temp-only, network-free, deployment-free, and live-write-free.
- A25: record this branch as an exact-path reviewed commit or blocker report after composition review.
- Next suggested owner/agent: A23 Integration and promotion lead.
