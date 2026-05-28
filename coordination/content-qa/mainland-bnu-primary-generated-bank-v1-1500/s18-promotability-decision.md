# S18 Promotability Decision - Mainland BNU Primary Generated Bank V1

- Date: 2026-05-27
- Session ID: S18
- Decision: approved-for-public-integration
- Generated rows: 1500
- Public integration scope: BNUP primary P1-P6 only.
- Manual/semi-manual review sample: 300 / 300 rows marked `approved`.
- Deterministic audit: passed, 1500 / 1500 rows, 0 inventory issues, 0 duplicate IDs, 0 duplicate exact prompts, valid BNU primary RAG evidence IDs, valid assessment-pattern IDs, and valid option/answer structure.
- DeepSeek hard gate: `hard-gate-green`, 1500 / 1500 solvable, 1500 / 1500 answer matched, 0 blocker, 0 major.
- DeepSeek broad QA: latest v1 run had 0 fail, 0 blocker, 0 major, and 2 minor accepted-answer warnings; both warning rows were remediated in `questions.jsonl`, `questions.csv`, and regenerated `question-pack.json`.
- Full-bank release QA: one additional ambiguous equivalent-fraction distractor was found during public integration testing and remediated before approval.
- Production metadata requirement: keep candidate snapshot fields as `pending-s18-review`; public app metadata must expose `mathQaStatus: "pass"`, `terminologyQaStatus: "pass"`, and `manualQaStatus: "approved"`.
- App integration status: Approved to connect this v1 1500-question package to `data/questions.ts`, `data/topics.ts`, Lesson checkpoints, and Practice Arena for `publisher: "MAINLAND_BNU"` P1-P6. Do not connect BNUP junior or senior content in this decision.
