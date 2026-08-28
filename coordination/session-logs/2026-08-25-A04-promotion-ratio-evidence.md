# Session Handoff

- Date: 2026-08-25 (Asia/Hong_Kong)
- Agent ID: A04
- Workstream: Promotion Gate Shadow v1 — independent Practice semantics evidence
- Status: Completed
- Owner: A04 Practice lead
- Branch: `codex/a04-promotion-ratio-evidence-20260825`
- Worktree: `/Volumes/Starship/MAIS-MVP/.worktrees/a04-promotion-ratio-evidence-20260825`
- Target PR: `pending` (A23 clean composition PR)
- Creation date: 2026-08-25
- Expected closeout date: 2026-08-25, after composition review/landing and clean-worktree verification
- Baseline/source/target SHA: `b6c7c347a49a813e454e707dd3c16399dcf29909`
- Promotion Unit: `us-ca-math-rag-v2-g6-ratios-v1`
- Parent package: `us-ca-math-rag-v2-candidate` remains `candidate-only`
- Summary: Independently recomputed and bound the selected Grade 6 ratio Practice record to the Promotion Gate v1 evidence contract. The evidence passes the A04 Shadow semantics check only; it does not approve live integration or any live write.
- Files changed:
  - `coordination/integration/pilots/us-ca-math-rag-v2-g6-ratios-v1/inputs/evidence/a04-practice-semantics.v1.json`
  - `coordination/session-logs/2026-08-25-A04-promotion-ratio-evidence.md`

## Independent source readback

- Authoritative read source: Git object `b6c7c347a49a813e454e707dd3c16399dcf29909:coordination/content-qa/us-ca-math-rag-v2-candidate/s04-question-candidate-pack.json`; no dirty-root candidate bytes were used.
- Selected ID: `s04-ca-rag-v2-q031-6-rp-ratios`; unique match count `1`; JSON pointer `/questions/30`.
- Raw source file SHA-256: `e86451098fce936f00b804ba8247486e3fb0bb7be80c5833ed6e9035f9b2ae50`.
- Stable-key normalized selected-record SHA-256: `d75e077adcf71fb6af89f0939479d2be99265495a8bcb5d571faa5d32bf1a305`.
- Prompt quantities preserve the ordered ratio `3 cups oats : 5 cups fruit`; target fruit amount is `20 cups`.
- Independent oracle: `20 / 5 = 4`, then `3 * 4 = 12` cups oats.
- Candidate answer: `12 cups`; exact accepted forms in source order: `12`, `12 cups`.
- A04 acceptance boundary: trim leading/trailing whitespace, then require an exact member of the declared accepted-form set; no fuzzy substring or guessed-unit matching.
- Candidate explanation explicitly states `5 x 4 = 20` and `3 x 4 = 12`, preserving ratio direction.
- Candidate canonical standards are exactly `6.RP.1`, `6.RP.2`, `6.RP.3`; this item directly uses `6.RP.3`, with `6.RP.1` embedded as prerequisite ratio reasoning. A04 does not claim that this one item independently demonstrates all three standards.
- Proposed runtime alias: `6.RP.A.3`. Repository readback shows that alias exists on other US-math surfaces, but no immutable mapping from this candidate record is established. Status is therefore `unverified-incompatible-preserved-outside-runtime`.
- Candidate source IDs read back unchanged: `california-math-common-core-skill`, `cde-ca-ccss-math-resources`, `common-core-state-standards-public-license`, and `ixl-california-math-standards-navigation-only`. Source certification remains an A18/A23 boundary; this A04 evidence does not upgrade it.
- Candidate approval readback remains `candidate-only`; no candidate or live file was edited.

## Evidence binding

- Evidence schema: `promotion-evidence.v1`.
- Candidate aggregate digest: `35c1d947840453fde081f80f32f1e0f47d080fdb6d2da2007f566084ebd780c7`.
- Checker version: `promotion-gate-shadow-v1`.
- Evidence raw SHA-256: `8a30a33f83e9dac2dd6429bad86683395ffa7ec55af53f4b3e1dc77a98b40622`.
- Evidence semantic payload SHA-256: `6f071d0bdbceeaad598d13e4dcb627ffbc5ca7c9acb8031e1285204e1e826260`.
- Trust boundary: this file is a path/hash-bound A04 declaration for independent composition checks, not cryptographic identity or human authentication.

## Checks run

- Confirmed worktree branch, exact baseline SHA, and clean start state.
- Parsed the candidate JSON from the exact Git baseline and asserted one-and-only-one selected ID.
- Recomputed raw-file and stable-normalized record digests with SHA-256.
- Independently asserted the numeric oracle, exact accepted forms, ratio-direction explanation, standards set, primary-standard inclusion, and candidate-only status.
- Compared the evidence wrapper and semantic payload against the current A23 Promotion Gate implementation contract.
- Parsed the final evidence JSON and ran the A23 evidence validator with the exact candidate artifact binding.
- Verified exact staged path scope and clean post-commit worktree state.

## Checks not run

- Application type-check/build/browser tests: not run because this is a machine-evidence/report-only slice with no TypeScript, route, registry, runtime, or live-source change.
- Full Promotion Gate pilot: not run in the A04 owner slice; A23 owns manifest composition and Shadow execution, while A11/A22 own independent replay and isolation proof.

## Assumptions, blockers, and risks

- Assumption: A23 will bind the final raw and semantic digests from this immutable evidence file in the Pilot Manifest without rewriting this owner artifact.
- Blocker for live: the `6.RP.3` to `6.RP.A.3` runtime mapping remains unverified and must be explicitly resolved before any live integration.
- Blocker for live: the current candidate feedback exposes the internal label `ratio order reversed`; this slice does not repair or ship it.
- Risk: the exact accepted-form policy is intentionally narrow. Any future locale, capitalization, Unicode, unit-alias, or numeric-equivalence support requires a new versioned adapter policy and new evidence.

## Follow-up recommendations

- A23: hash-bind this exact artifact in the immutable Pilot Manifest and preserve the `candidate-only-no-live-write` boundary.
- A18: retain final curriculum/source/wording authority and the narrower directly-assessed-standard conclusion.
- A11: independently replay exact accepted-form positive and fuzzy-match negative cases.
- A22: prove the composed Shadow run is clean, temp-only, network-free, deployment-free, and live-write-free.
- A25: record this branch as an exact-path reviewed commit or blocker report after composition review.
- Next suggested owner/agent: A23 Integration and promotion lead.
