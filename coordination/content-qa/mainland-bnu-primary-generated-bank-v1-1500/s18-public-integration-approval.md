# S18 Public Integration Approval - Mainland BNU Primary V1 1500

- Date: 2026-05-27
- Session ID: S18
- Package: `mainland-bnu-primary-generated-bank-v1-1500`
- Decision: approved-for-public-integration
- Public scope: BNUP primary P1-P6, 1500 questions total, 250 questions per grade.
- Held out of scope: `mainland-bnu-primary-generated-bank-v2-1500`, BNUP junior, and BNUP senior.

## Approval Basis

- Deterministic audit: passed after targeted remediation.
- DeepSeek hard gate: 1500 / 1500 solvable, 1500 / 1500 answer matched, 0 blocker, 0 major.
- Broad DeepSeek QA: 0 fail, 0 blocker, 0 major; 2 minor accepted-answer warnings were remediated.
- Full-bank release QA: 1 equivalent-fraction multiple-choice ambiguity was remediated before approval.
- Manual sample: 300 / 300 rows approved.
- Evidence: all rows cite committed BNUP primary safe-RAG and assessment-pattern card IDs.

## Production Contract

- Keep original candidate fields `mathQaStatus`, `terminologyQaStatus`, and `manualQaStatus` as `pending-s18-review` in the generated package snapshot.
- Expose production metadata in app code as `mathQaStatus: "pass"`, `terminologyQaStatus: "pass"`, and `manualQaStatus: "approved"`.
- Connect only `publisher: "MAINLAND_BNU"` P1-P6 rows to Lesson seeds and Practice Arena.
- Keep BNUP S1-S6 unavailable with coming-soon messaging.
