# S18 Approval Decision - Mainland BNU Junior Generated Bank V1

- Date: 2026-05-28
- Session ID: S18
- Decision: approved-for-public-integration
- Approved package: `approved-question-pack.json`
- Source candidate package: `question-pack.json`
- Generated rows: 1500
- DeepSeek V4 Pro issue rows reviewed: 153
- Remediated rows: 156
- Manual review queue rows approved: 300
- DeepSeek issue rows also present in manual queue: 32
- P0/P1 blocker rows after remediation: 0
- Duplicate IDs after remediation: 0
- Duplicate exact prompts after remediation: 0
- App integration status: Approved for data-layer integration only; lesson seeds, illustrations, and new UI routes remain out of scope.

## Approved Counts

- Grade counts: {"S1":500,"S2":500,"S3":500}
- Type counts: {"multiple-choice":525,"short-answer":525,"fill-in":450}
- Difficulty counts: {"Core":695,"Foundation":290,"Exam":385,"Challenge":130}
- Topic count: 35

## Evidence

- The original candidate passed deterministic structure/count/source-distance gates.
- The later DeepSeek V4 Pro QA pass identified 153 rows; all 153 were reviewed and repaired or adjudicated in `approved-remediation-results.csv`.
- The approved package marks rows as `mathQaStatus: pass`, `terminologyQaStatus: pass`, and `manualQaStatus: approved` only after remediation.
- The raw candidate package is preserved for audit traceability; app code must import only `approved-question-pack.json`.
