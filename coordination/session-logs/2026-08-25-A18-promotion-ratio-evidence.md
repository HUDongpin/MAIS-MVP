# A18 Promotion Ratio Evidence — 2026-08-25

- Agent/lane: `A18` curriculum QA and content quality
- Assignment: independently bind and record the exact Grade 6 ratios QA evidence for Promotion Unit `us-ca-math-rag-v2-g6-ratios-v1`
- Branch: `codex/a18-promotion-ratio-evidence-20260825`
- Worktree: `/Volumes/Starship/MAIS-MVP/.worktrees/a18-promotion-ratio-evidence-20260825`
- Baseline/source commit: `b6c7c347a49a813e454e707dd3c16399dcf29909`
- Target baseline commit: `b6c7c347a49a813e454e707dd3c16399dcf29909`
- Target PR: `pending`
- Creation date: `2026-08-25`
- Expected closeout date: `2026-08-25`

## Declared write scope

Only these two files are authorized for this slice:

1. `coordination/integration/pilots/us-ca-math-rag-v2-g6-ratios-v1/inputs/evidence/a18-independent-qa.v1.json`
2. `coordination/session-logs/2026-08-25-A18-promotion-ratio-evidence.md`

No Promotion Gate core, candidate package, manifest, live data, app, component, test, release, provider, deployment, or secret file is in scope.

## Skill and review method

- Applied `california-math-common-core` to separate the declared Grade 6 `6.RP.1/.2/.3` cluster from the practice/lesson record's directly assessed `6.RP.3`, embedded prerequisite `6.RP.1`, and not-demonstrated `6.RP.2`.
- Applied `mais-content-qa-approval-workflow` to keep deterministic math correctness separate from curriculum, language, provenance, pedagogy, integration, and live-release decisions.
- Recomputed the selected records directly from Git object `b6c7c347a49a813e454e707dd3c16399dcf29909`, not from mutable working-tree copies.

## Bound records

| Kind | ID | Source pointer | Record SHA-256 |
| --- | --- | --- | --- |
| safe-card | `ca-rag-v2-cluster-grade-6-6-rp-ratios` | `safe-card-drafts.json#/108` | `7190eb88b93a8fb609b0531e5a374ea52e719a36d74295fbad2f67d9cb10f284` |
| practice | `s04-ca-rag-v2-q031-6-rp-ratios` | `s04-question-candidate-pack.json#/questions/30` | `d75e077adcf71fb6af89f0939479d2be99265495a8bcb5d571faa5d32bf1a305` |
| lesson | `s05-ca-rag-v2-lesson-031-6-rp-ratios` | `s05-lesson-candidate-pack.json#/lessons/30` | `7f3afb81f52b92854009ca5be3be62310e304736c554f9dba5caafe4bf0e3c0d` |

Candidate digest: `35c1d947840453fde081f80f32f1e0f47d080fdb6d2da2007f566084ebd780c7`.

## Independent decision

- The ordered oats-to-fruit ratio is `3:5`; scaling fruit from `5` to `20` uses factor `4`, so oats scale from `3` to `12`. The canonical answer `12 cups` and accepted forms `12`, `12 cups` are mathematically consistent.
- All three records are accepted for non-live shadow use and rejected for neither shadow nor archival review.
- All three require repair before live integration; `liveEligible` remains `false`.
- The evidence preserves the exact eight live blockers: item-level standard overclaim, unbound fine-grained live standard mapping, two unresolved live source IDs, missing bilingual fields, the known lesson grammar error, an internal misconception label exposed as student feedback, open-ended guided/independent tasks without answer or rubric, and prior S18 record mismatch.
- The source-ID blocker uses the four actual provenance IDs from the candidate record. `CA.CCSS.Math.G6.RP.1/.2/.3` remain standard IDs and are not represented as source IDs.

## Checker-currentness correction

- Bound `semanticPayload.priorReviewDrift` to the frozen source review's raw bytes with `rawSha256: 7b3bfa54b84e105e703e31b5f27e3a135e5a48d5e0ebac1805129056e05318f4`.
- Verified that hash directly from `s18-representative-sample-review.md` at source commit `b6c7c347a49a813e454e707dd3c16399dcf29909`.
- Corrected A18 evidence raw SHA-256: `874beed128491d1355eeb79b5dcd1f109f75a5efabd86db9cf4e3f2adb6968cf`.
- Corrected stable semantic-payload SHA-256: `033c32293262ff0066bed2c0afd54f42f9909c1d028c570bf4c2edb604150ca0`.

## Verification and closeout

Before commit, this slice must prove:

- exact JSON parse and exact outer evidence envelope;
- raw candidate-file and semantic record digests from the frozen Git object;
- candidate digest parity;
- semantic payload equality with A23's frozen `expectedRoleSemanticPayload(...).A18` contract;
- exact eight blocker codes and ordering;
- no paths outside the two-file assignment;
- clean index before exact staging, then exact two-path staging only.

Commit and push identifiers are reported in the final handoff because a commit cannot contain its own final SHA.
