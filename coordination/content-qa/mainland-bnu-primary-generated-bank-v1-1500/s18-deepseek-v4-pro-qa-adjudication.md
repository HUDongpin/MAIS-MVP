# S18 DeepSeek V4 Pro QA Adjudication - Mainland BNU Primary V1

- Date: 2026-05-27
- Session ID: S18
- Scope: `coordination/content-qa/mainland-bnu-primary-generated-bank-v1-1500/questions.jsonl`
- Decision: approved for BNUP primary public integration after minor-warning remediation.

## Completed Gates

- Generated package contains 1500 candidate rows: P1-P6 each have 250 questions across 97 BNUP primary topics.
- Deterministic S18 audit passed after targeted repairs: 0 duplicate IDs, 0 duplicate exact prompts, valid BNU RAG evidence IDs, valid BNU assessment-pattern evidence IDs, valid option/answer structure, and 300-row manual sample queue.
- DeepSeek hard gate is green: 1500 / 1500 solvable and 1500 / 1500 answer matched, with 0 blocker and 0 major rows.
- Latest broad DeepSeek QA had 1498 pass and 2 minor warnings, with 0 fail, 0 blocker, and 0 major rows.

## Minor Warning Disposition

- `bnu-primary-ds-v1-p2-077`: remediated from a learner-dependent measuring prompt into an objective 20 cm unit-selection prompt.
- `bnu-primary-ds-v1-p4-220`: remediated the stored answer to the expected variable form `x - c + 8 = 25`, while retaining the prose form as an accepted answer.
- `bnu-primary-ds-v1-p5-073`: remediated during full-bank release QA by replacing an equivalent-fraction distractor so the multiple-choice item has exactly one correct option.

## Approval Notes

- The 300-row manual review sample is marked `approved` in `manual-review-results.csv`.
- Original candidate QA fields remain as the generation-time snapshot: `pending-s18-review`.
- Production integration metadata separately marks the public rows as `mathQaStatus: "pass"`, `terminologyQaStatus: "pass"`, and `manualQaStatus: "approved"`.
- Approval is limited to BNUP primary P1-P6 v1 1500. BNUP junior and senior remain not connected to public Lesson or Practice Arena surfaces.
