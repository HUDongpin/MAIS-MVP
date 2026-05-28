# S18 Broad QA Remediation - Mainland BNU Primary V2

- Date: 2026-05-27
- Session ID: S18
- Source issue set: refreshed DeepSeek V4 Pro broad QA, 4 warn / 3 fail
- Result: 7 rows remediated in candidate artifacts
- Generation batch cache files updated: 7
- Product integration status: none; candidate package only.

| ID | Issue tags | S18 remediation |
| --- | --- | --- |
| bnu-primary-ds-v2-p1-129 | public_readiness | Rewrite prompt to state the two class events directly instead of referencing an implicit timetable. |
| bnu-primary-ds-v2-p3-169 | ambiguous_mc\|bad_options | Replace unclear vertical-form choices with one unique correct distributive calculation process. |
| bnu-primary-ds-v2-p3-233 | ambiguous_mc | Make all distractors false so the data-reading multiple-choice item has exactly one correct option. |
| bnu-primary-ds-v2-p4-192 | language_issue | Remove the answer from the stem and ask students to sum the visible layer counts. |
| bnu-primary-ds-v2-p4-243 | ambiguous_mc\|accepted_answer_gap | Change the shape set and classification standard so only one option is mathematically robust. |
| bnu-primary-ds-v2-p5-069 | accepted_answer_gap | Remove the decimal accepted answer because the prompt explicitly asks for a fraction. |
| bnu-primary-ds-v2-p5-241 | ambiguous_mc | Replace the algebraically equivalent distractor with an actually incorrect expression. |

## Notes

- Updated `question-pack.json`, `questions.jsonl`, `questions.csv`, and affected generation `batches/batch-*.json` caches.
- No public question-bank, lesson, practice, API, UI, shared type, or production data files were edited.
- Rerun deterministic audit and affected DeepSeek QA/hard-gate batches after this remediation.
