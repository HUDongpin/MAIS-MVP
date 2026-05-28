# S18 Public Integration Approval - Mainland BNU Primary V2 1500

- Date: 2026-05-28
- Session ID: S04 with owner-authorized S18 approval artifact update
- Package: `mainland-bnu-primary-generated-bank-v2-1500`
- Decision: approved-for-public-integration-alongside-v1
- Public scope: BNUP primary P1-P6, 1500 v2 questions, 250 questions per grade.
- Combined public scope: BNUP primary v1 + v2, 3000 questions total, 500 questions per P1-P6 grade.
- Held out of scope: BNUP junior and BNUP senior.

## Approval Basis

- Deterministic audit: 1500 / 1500 rows passed, 0 failing rows, 0 duplicate IDs, 0 duplicate exact prompts, and 0 inventory issues.
- DeepSeek V4 Pro broad QA: green, reviewed 1500 rows, issues 0.
- DeepSeek V4 Pro hard gate: green, 1500 / 1500 solvable, 1500 / 1500 answer matched, 0 blocker, 0 major.
- S18 manual sample closure: 300 / 300 rows approved, including 50 rows per P1-P6 grade and 100% of auto-issue rows.
- Full-bank public integration gate: one equivalent-fraction distractor ambiguity in `bnu-primary-ds-v2-p3-215` was remediated before public integration by replacing the non-key option `1/3`.
- Evidence: all rows cite committed BNUP primary safe-RAG and assessment-pattern card IDs.
- V1 separation: v2 has no ID overlap with v1 and no exact or high-similarity v1 prompt reuse according to the candidate QA artifacts.

## Production Contract

- Keep original candidate fields `mathQaStatus`, `terminologyQaStatus`, and `manualQaStatus` as `pending-s18-review` in the generated package snapshot.
- Expose production metadata in app code as `mathQaStatus: "pass"`, `terminologyQaStatus: "pass"`, and `manualQaStatus: "approved"`.
- Connect v2 only for `publisher: "MAINLAND_BNU"` P1-P6 rows.
- Publish v1 and v2 together in Lesson and Practice Arena; do not expose batch labels in the student-facing `PublicQuestion` API.
- Keep BNUP S1-S6 unavailable with coming-soon messaging.
