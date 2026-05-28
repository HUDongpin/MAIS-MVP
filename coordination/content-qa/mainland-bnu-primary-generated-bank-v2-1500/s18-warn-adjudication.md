# S18 Warn Adjudication - Mainland BNU Primary V2

- Date: 2026-05-27
- Session ID: S18
- Scope: 11 prior DeepSeek V4 Pro minor warn rows
- Result: 11 remediated / 0 accepted-without-change / 0 needs-rewrite

| ID | Grade | Type | Original tags | Decision | S18 fix summary |
| --- | --- | --- | --- | --- | --- |
| bnu-primary-ds-v2-p1-046 | P1 | multiple-choice | ambiguous_mc | remediated | Multiple-choice options are now unique; only `4+3=7` matches the prompt. |
| bnu-primary-ds-v2-p1-057 | P1 | short-answer | accepted_answer_gap | remediated | Fruit-color classification now separates banana, orange, and purple grape categories. |
| bnu-primary-ds-v2-p1-060 | P1 | short-answer | accepted_answer_gap | remediated | Prompt explicitly says `紫葡萄`, and answer/accepted answers use the same term. |
| bnu-primary-ds-v2-p1-129 | P1 | short-answer | public_readiness | remediated | Prompt now states both school-time class events directly instead of relying on general life experience. |
| bnu-primary-ds-v2-p1-171 | P1 | short-answer | missing_condition | remediated | Prompt now states the left-to-right object order; answer aligns with that condition. |
| bnu-primary-ds-v2-p1-175 | P1 | multiple-choice | ambiguous_mc | remediated | Prompt now constrains the cylinder height and diameter so the front view can be a square. |
| bnu-primary-ds-v2-p2-060 | P2 | short-answer | accepted_answer_gap | remediated | Prompt restricts the two same rectangles to side-to-side joins that produce square and rectangle outcomes. |
| bnu-primary-ds-v2-p3-080 | P3 | fill-in | accepted_answer_gap | remediated | Answer is now an estimate (`约1600个字`) matching the approximate wording. |
| bnu-primary-ds-v2-p3-115 | P3 | multiple-choice | ambiguous_mc | remediated | `1.01` was replaced with `1.02`, making `0.99` the unique closest value to 1. |
| bnu-primary-ds-v2-p4-036 | P4 | short-answer | accepted_answer_gap | remediated | Estimate and explanation now consistently use 118≈120, yielding 1440 km before exact 1416 km. |
| bnu-primary-ds-v2-p5-240 | P5 | fill-in | public_readiness | remediated | Total book count changed to 544, producing the integer technology-book answer 340. |

## Notes

- This adjudication uses the current `question-pack.json` / `questions.jsonl` candidate text as the source of truth.
- The prior broad QA artifact is intentionally retained as historical evidence until the DeepSeek V4 Pro broad QA rerun refreshes it.
- No product question bank, app route, UI, lesson, or public data file is changed by this closure artifact.
