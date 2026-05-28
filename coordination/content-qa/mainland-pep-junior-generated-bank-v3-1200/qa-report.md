# S18 Mainland PEP Junior V3 DeepSeek Candidate Generation Report

- Generated at: 2026-05-25T03:36:14.385Z
- Started at: 2026-05-25T03:36:14.314Z
- Generator: DeepSeek API via local server-side LLM configuration
- Endpoint host: api.deepseek.com
- Model: deepseek-v4-pro
- Batch: junior-rag-v3-1200
- Target questions: 1200
- Generated questions: 1200
- Prior v2 bank checked: yes
- Prior v2 rows indexed: 1200

## Distribution

- Grade counts: {"S1":400,"S2":400,"S3":400}
- Type counts: {"multiple-choice":400,"fill-in":400,"short-answer":400}
- Difficulty counts: {"Foundation":230,"Core":610,"Exam":280,"Challenge":80}
- Math QA status counts: {"needs-review":1200}

## Non-Reuse Checks

- Duplicate v3 IDs: 0
- Exact v2 prompt reuse rows: 0
- Exact v2 full row-content reuse rows: 0

## Release Position

- This is an offline v3 candidate package only.
- Rows are marked `mathQaStatus: needs-review` and require S18 manual sampling or expanded deterministic QA before app integration.
- No production question-bank source file was edited by this generator.

## Artifacts

- `questions.jsonl`
- `questions.csv`
- `question-pack.json`
- `coverage-matrix.csv`
- `batches/*.json` resumable parsed batch cache
- `qa-report.md`
- `generate-with-deepseek.mjs`
- `audit-solvability.mjs`
