# CA math content — governance / provenance findings (lead session, independently verified)

## G1. Three of five live CA packs carry status metadata that says they are NOT live-approved

| Pack | Live? (evidence) | Self-declared status inside the pack file |
|---|---|---|
| `us-ca-k5-knowledge-point-practice-v1` (492) | LIVE — `knowledgePointPracticeLive: true`, `data/usCaliforniaTopics.ts:178` | `packageStatus: "candidate-only"`, `integrationStatus: "candidate-only-not-live"`, `nextOwner: "S18 content QA, then S23 promotion planning if owner later asks to integrate"` |
| `us-ca-math-g6-g12-generated-bank-v2-1500` (1500) | LIVE — unconditional entry in `questionPacks`, `data/usCaliforniaTopics.ts:215` | **no status fields at all** (no packageStatus / reviewStatus / integrationStatus) |
| `ccss-textbook-practice-v1` (810) | LIVE | `packageStatus: "live"`, `reviewStatus: "upstream-hand-checked"`, `integrationStatus: "phase-1"` — consistent |
| `us-ca-math-k-g5-textbooks-v1` (29 lessons) | LIVE — `textbookLive: true` | `packageStatus: "approved-for-review"`, `reviewStatus: "generator-validation-complete-s18-human-sampling-required"`, `integrationStatus: "candidate-only"`, `nextOwner: "S18 curriculum QA"` |
| `us-ca-math-middle-school-textbooks-v2` (15 lessons) | LIVE | `approved-for-production` / `integrated-into-california-middle-school-textbook-route` + `livePromotion` block — consistent |

Live CA practice footprint = 2,802 items. 1,992 of them (71%) come from the two packs whose own metadata does not authorise live serving.

## G2. The 492-item pack's own QA report disclaims the state it is now in
`coordination/content-qa/us-ca-k5-knowledge-point-practice-v1/qa-report.md`:
- Verdict: `candidate-only-two-round-qa-pass` — "remains explicitly **not live-integrated**. It is not an approval for S04/S05 live data edits, route exposure, public curriculum claims, or production release."
- "Live files intentionally not edited: `data/usCaliforniaQuestions.ts`, `data/usCaliforniaTopics.ts` ..." — both of which now serve it.
- `checksNotRun` in the pack file: `["live app integration", "browser regression for practice filters", "human classroom trial"]`.
- Named open risks never closed in the report: "topic-adapted seed bank, not a complete production bank"; "bilingual Chinese fields are functional direct translations ... should receive S09 language polish before public release"; "No answer-critical visuals are included."

## G3. The largest live CA pack has no committed QA evidence package
- Every one of the 1,500 G6–G12 rows is stamped `manualQaStatus: "accepted-auto-sample"`, `deepseekQaStatus: "not-run-not-needed"`, `sourceDistanceStatus: "passed-auto-source-scan"` — uniform, with no per-row distinction between reviewed and unreviewed rows.
- `coordination/session-logs/2026-06-01-S18.md:456` records the review as `manual_review_workflow.mjs --auto-accept-sample` accepting **63 sample rows** — 4.2% of the pack, auto-accepted rather than human-reviewed.
- The session log lists `coordination/content-qa/us-ca-math-g6-g12-generated-bank-v2-1500/` under "Files changed", but that directory **does not exist and has no git history** (`git log -- <path>` returns nothing; not gitignored). The evidence package was never committed.
- The repo's own audit agrees: `coordination/content-qa/2026-06-21-S21-generated-content-source-package-restoration-inventory.md:28` notes only "row metadata records auto QA/sample status" for this pack — no QA directory.

## G4. Prior art already predicted the failure mode this QA is testing for
`coordination/decisions/2026-07-18-deepseek-k-g5-pack-decision.md`: "the *live* 492 pack passed `fullQuestionBankSolvability` yet still shipped the P1 Kindergarten cardinality/attributes bugs fixed on 2026-07-18. A solvability-clean ... pack would carry the same conceptual-QA risk."
Machine gates verify keys and arithmetic; they have never verified pedagogy, alignment, variety or language.

## G5. Half the content audits that exist are not enforced by CI
`.github/workflows/ci.yml` runs: `audit:us-math-items` ✅, `audit:lesson-illustrations` ✅, `test:question-bank` ✅, `test:ccss-textbook` ✅.
It does NOT run: `audit:zh-hans` ❌, `check:hk-zh` ❌, `qa:full-question-bank` ❌, `audit:ccss-depth` ❌.
So bilingual quality and full-bank solvability can regress on any push without CI noticing.

## G6. Baseline: the enforced gate is green for CA
`node scripts/audit-us-math-item-quality.mjs` → `Findings: 10 (P0: 0, P1: 0, P2: 10)`, and **all 10 are Arkansas**. Zero CA findings across all three live CA packs (1500 templated items re-solved, 0 mismatched). Any CA defect this review reports is therefore, by construction, outside what CI can currently catch.

## G7. Variety signal (lead-session measurement, pre-agent)
- `us-ca-math-g6-g12-generated-bank-v2-1500`: 1,190 unique English prompts for 1,500 items — 152 duplicate-prompt groups covering **462 items (30.8%)**. 67 generation templates for 1,500 items.
- `us-ca-k5-knowledge-point-practice-v1`: 458 unique prompts / 492 items — 23 duplicate groups, 57 items (11.6%).
- `ccss-textbook-practice-v1`: 807 unique prompts / 810 items — 3 duplicate groups, 6 items (0.7%).

## G8. Classes RULED OUT by lead-session measurement (negative findings)
- **No contradictory answer keys.** Across all three live packs, every group of items sharing an identical English prompt shares an identical `answer`. 0 conflicting-key groups. So duplication is pure redundancy, not a correctness hazard.
- **No cross-pack duplication.** kp×ccss-tb = 0, ccss-tb×g6g12 = 0, kp×g6g12 = 0 identical prompts. The packs do not collide with each other; all redundancy is within-pack.

## G9. Live per-band item counts (what a student can actually be served)
- K–G5 live practice = 828 items (492 knowledge-point + 336 from the K–5 slice of `ccss-textbook-practice-v1`).
- G6–G12 live practice = 1,974 items (1,500 generated bank + 474 from `ccss-textbook-practice-v1`).
- Total live CA practice = 2,802 items.
