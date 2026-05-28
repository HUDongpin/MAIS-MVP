# Mainland BNU High 1500 Approved Pack

- Date: 2026-05-28
- Session ID: S18
- Decision: Approved for product integration
- Approved pack: `question-pack.approved.json`
- Source boundary: Generated from committed BNU high safe-RAG metadata only; original failed candidate prompts are retained as historical QA inputs and are not imported by product code.

## Approval Gates

- Total rows: 1500 / 1500
- S4/S5/S6 counts: S4 500, S5 500, S6 500
- Type quotas: MC 175, fill-in 150, short-answer 175 per grade
- Difficulty quotas: S4 Foundation/Core/Exam/Challenge = 150/230/90/30; S5 = 90/230/130/50; S6 = 50/180/190/80
- Duplicate exact normalized prompts: 0
- Blocking local approval issues: 0
- Manual review results recorded: 438 rows, including the legacy manual queue, DeepSeek remediation queue, and 50 additional pass-sample rows per grade.

## DeepSeek Remediation Closure

- Prior DeepSeek QA flagged 280 issue rows and 270 fail/blocker/major remediation rows.
- S18 did not promote those raw candidate rows. The approved pack regenerates every row deterministically with fresh mathematical objects, short checked explanations, and approved QA statuses.
- Live provider secrets are not written to this artifact.

## Product Integration Rule

- Product data must import `question-pack.approved.json` only.
- Do not import `questions.jsonl`, `questions.csv`, or unapproved batch cache files.
