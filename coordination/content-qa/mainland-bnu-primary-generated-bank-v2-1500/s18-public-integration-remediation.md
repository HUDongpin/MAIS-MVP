# S18 Public Integration Remediation - Mainland BNU Primary V2

- Date: 2026-05-28
- Session ID: S04 with owner-authorized S18 remediation note
- Scope: `bnu-primary-ds-v2-p3-215`
- Issue type: Multiple-choice equivalent-fraction ambiguity found by the full-bank public integration audit.
- What happened: The stored answer was `2/6`, but one distractor was `1/3`, which is mathematically equivalent and caused two options to match the independent answer.
- Remediation: Replaced the non-key distractors with `3/6` and `2/5`, keeping the prompt, answer, accepted answers, explanation, evidence IDs, and QA snapshot fields unchanged.
- Files updated: `question-pack.json`, `questions.jsonl`, and `questions.csv`.
- Post-remediation requirement: rerun `npm run test:question-bank` and `npm run qa:full-question-bank` before handoff.
