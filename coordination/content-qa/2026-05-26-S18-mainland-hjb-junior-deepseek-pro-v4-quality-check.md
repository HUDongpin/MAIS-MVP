# S18 Mainland HJB Junior DeepSeek-Pro-V4 Quality Check

- Date: 2026-05-26
- Session ID: S18
- Workstream: Curriculum QA and content quality
- Scope: Mainland Shanghai Education Press / HuJiaoBan junior-secondary S1-S3 question bank, current package `mainland-hjb-junior-generated-bank-v2-1500`
- Requested checks: question is solvable; stored answer matches the question
- Current status: fresh live DeepSeek V4 Pro run completed with an owner-provided transient DeepSeek API key; current integrated package remains local-gate green but DeepSeek flagged 139 rows for S18 adjudication.

## Fresh DeepSeek Call Status

S18 followed the project `aliyun-model-studio-cli` instruction and attempted to use `bl` first.

- `bl --version`: `bl 1.0.1`
- `bl auth status --output json`: failed with `No API key found`
- `bl text chat --model deepseek-pro-v4 ...`: failed with `No API key found`
- Current shell credential-name scan found no `DASHSCOPE`, `DEEPSEEK`, `LLM`, `OPENAI`, or `ALIYUN` environment variables.

The owner then provided a transient DeepSeek API key in chat for this run. S18 used it only as a runtime environment variable for direct `api.deepseek.com` calls. No secret value was written to `.env*`, reports, logs, or command output. Security note: because the key was pasted into chat, rotate it after this QA run if it should remain production-grade.

## Live DeepSeek V4 Pro Audit Result

- Results JSON: `coordination/content-qa/mainland-hjb-junior-generated-bank-v2-1500/deepseek-model-qa/deepseek-model-qa-results.json`
- Issues CSV: `coordination/content-qa/mainland-hjb-junior-generated-bank-v2-1500/deepseek-model-qa/deepseek-model-qa-issues.csv`
- Generated report: `coordination/content-qa/mainland-hjb-junior-generated-bank-v2-1500/deepseek-model-qa/deepseek-model-qa-report.md`
- Model: `deepseek-v4-pro`
- API host: `api.deepseek.com`
- Scope: all 1,500 current package rows
- Run id: `2026-05-26-live-owner-key`
- Batch cache dir: `deepseek-model-qa/batches-94306f3557`
- Batch files: 188 / 188
- Review records: 1,500 / 1,500

| Result | Count |
| --- | ---: |
| Pass | 1,361 |
| Needs S18 review | 139 |
| P0 | 0 |
| P1 | 135 |
| P2 | 4 |

DeepSeek issue-code counts, noting that one row may have multiple codes:

| Issue code | Count |
| --- | ---: |
| `wrong-answer` | 111 |
| `explanation-mismatch` | 88 |
| `multiple-correct-options` | 18 |
| `ambiguous-prompt` | 8 |
| `accepted-answer-gap` | 4 |
| `missing-condition` | 3 |
| `no-correct-option` | 2 |
| `terminology-risk` | 1 |

Grade split of DeepSeek review rows:

| Grade | Needs review |
| --- | ---: |
| S1 | 32 |
| S2 | 51 |
| S3 | 56 |

Top unit concentrations:

| Unit | Needs review |
| --- | ---: |
| S3 统计初步 | 17 |
| S2 直角三角形 | 14 |
| S2 四边形 | 13 |
| S3 圆与正多边形 | 11 |
| S3 锐角的三角比 | 10 |
| S1 等腰三角形 | 9 |
| S2 实数 | 9 |
| S3 二次函数 | 9 |
| S3 相似三角形 | 9 |

## Existing DeepSeek Evidence

The project already contains a prior full DeepSeek-v4-pro QA run for the HJB junior V2 candidate package:

- Source report: `coordination/content-qa/mainland-hjb-junior-generated-bank-v2-1500/deepseek-model-qa/deepseek-model-qa-report.md`
- Scope: all 1,500 candidate rows
- Model: `deepseek-v4-pro`
- Result before repair: 1,264 pass, 236 needs-review, 0 P0, 233 P1, 3 P2
- Main issue families before repair: wrong-answer, explanation-mismatch, multiple-correct-options, missing-condition, ambiguous-prompt, accepted-answer-gap, no-correct-option

Those DeepSeek findings were not ignored. They fed the repair and post-repair QA flow:

- Targeted repair report: `coordination/content-qa/mainland-hjb-junior-generated-bank-v2-1500/deepseek-repair/s18-repair-report.md`
- DeepSeek targeted repair completed 201 / 201 target rows.
- Repair split: 197 repair-required rows plus 4 minor/format-review rows; 35 DeepSeek false positives retained unchanged after review.
- Post-repair local gate: 0 duplicate prompts, 0 structural/source-risk row issues.

## Current Package Check

Current `question-pack.json` inventory:

| Metric | Count |
| --- | ---: |
| Total questions | 1,500 |
| S1 | 500 |
| S2 | 500 |
| S3 | 500 |
| Multiple-choice | 600 |
| Fill-in | 525 |
| Short-answer | 375 |
| `mathQaStatus: pass` | 1,500 |

Current local HJB junior solvability gate:

- Command: `node coordination/content-qa/mainland-hjb-junior-generated-bank-v2-1500/audit-solvability.mjs`
- Result: passed
- Output summary: 1,500 rows, manual queue 150, question-pack promoted

Current integrated question-bank gate:

- Command: `npm run test:question-bank`
- Result: passed
- Test count: 48 passed, 0 failed
- Relevant covered assertions include:
  - full question bank independently solvable and answer-key matched
  - Mainland HJB junior V2 bank integrated as a 1,500-question publisher-scoped pool
  - Mainland HJB S1-S3 lesson and practice surfaces expose only HJB junior V2 content
  - tracked attempts reject questions outside the learner curriculum track

## QA Conclusion

The fresh live DeepSeek V4 Pro pass completed. DeepSeek accepted 1,361 / 1,500 rows and flagged 139 / 1,500 rows for S18 review. The flagged rows should be treated as a model-generated review queue, not as automatically confirmed source-data bugs, because several generated issue explanations visibly self-correct or contradict their own `needs-review` label.

The current HJB junior V2 production package is not the old unrepaired DeepSeek-flagged candidate; it is the post-repair package with:

- 1,500 / 1,500 current rows passing the local solvability gate.
- 48 / 48 question-bank tests passing.
- 0 current duplicate ID groups, duplicate prompt groups, structural/source/content-residue issue rows, numeric answer/explanation echo misses, or post-repair blocking rows in the recorded QA artifacts.
- Fresh DeepSeek second-opinion queue: 139 rows requiring S18 adjudication before any production data edit.

## Remaining Risk

DeepSeek is useful as an independent reviewer, but it produced some self-contradictory review text in the issue queue. Therefore the 139 flagged rows require S18 math adjudication before source data is changed. No question-bank source files were edited by this run.

## Safe Next Step

Review `deepseek-model-qa-issues.csv`, classify each of the 139 rows as confirmed bug / DeepSeek false positive / minor wording or accepted-answer gap, then coordinate any source-data repair with the proper question-bank owner before editing production data.
