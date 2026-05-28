# Mainland HJB High Generated Bank V2 Release Note

- Date: 2026-05-24
- Session ID: S18
- Package: Mainland Shanghai Education Press / HuJiaoBan high-school mathematics V2
- Physical directory: `coordination/content-qa/mainland-hjb-high-generated-bank-v2`

## Version Naming

- `mainland-hjb-high-generated-bank-v1` is the prior production/lesson pilot package.
- `mainland-hjb-high-generated-bank-v2` is the current V2 candidate package. The physical directory, QA reports, product copy, generated IDs, and app batch metadata should all use V2 terminology.
- There is no other newer HJB high-school release package in this workspace.

## Release Gate

- Final QA status: green.
- Final V2 package size: 1500 questions.
- Grade distribution: S4 500, S5 500, S6 500.
- Type distribution: multiple-choice 600, fill-in 525, short-answer 375.
- Difficulty distribution: Foundation 375, Core 600, Challenge 375, Exam 150.
- Final quality audit: 1500/1500 answer-matched, 0 P0/P1/P2, 0 failing rows, 370/370 manual QA queue rows reviewed.
- Production input: `question-pack.json`, generated from `questions.jsonl`.

## Integration Note

The default Mainland HJB high-school question export uses V2. V1 remains available as a rollback export, and product copy plus QA reports should call the current package V2.
