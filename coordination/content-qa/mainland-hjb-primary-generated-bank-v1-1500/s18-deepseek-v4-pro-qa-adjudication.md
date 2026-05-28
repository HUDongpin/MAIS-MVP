# S18 DeepSeek V4 Pro QA Adjudication - Mainland HJB Primary V1 Candidate

- Date: 2026-05-25
- Session ID: S18
- Workstream: Curriculum QA and content quality
- Scope: `coordination/content-qa/mainland-hjb-primary-generated-bank-v1-1500/questions.jsonl`
- Rows reviewed: 1500
- Model: `deepseek-v4-pro`
- API host: `api.deepseek.com`
- Secret handling: local provider configuration was used; no key values or raw provider payloads are recorded.
- Public integration status: candidate QA package only; `data/questions.ts`, app UI, APIs, and production question exports were not edited.

## QA Runs

| Gate | Result |
| --- | --- |
| Initial DeepSeek-v4-pro full QA | 1500 reviewed: 1445 pass, 18 warn, 37 fail |
| Initial DeepSeek issue count | 55 flagged rows, including 4 blocker findings |
| Remediation applied | 62 targeted candidate rows repaired or clarified |
| Final deterministic solvability audit | Passed: 1500 rows, 0 inventory issues, 300 manual queue rows |
| Final DeepSeek-v4-pro full QA | Passed: 1500 pass, 0 warn, 0 fail |
| Final DeepSeek severity count | none 1500 |
| Final DeepSeek token usage | prompt 320014, completion 111643, total 431657 |

## Remediation Summary

S18 treated the initial 55 DeepSeek findings as release-relevant until adjudicated. The repair pass addressed answer/explanation mismatches, wrong arithmetic, multiple-correct choices, unsupported visual wording, accepted-answer gaps, duplicate/near-duplicate prompts, and prompt/type ambiguity.

During post-remediation reruns, DeepSeek surfaced 7 additional model-visible risks. Those were also corrected, including duplicate classification/addition items, overly open classification prompts, a percentage-place accepted-answer gap, and a non-unique small-decimal comparison item.

## Final Adjudication

The HJB primary v1 1500-row candidate QA package is now **S18 candidate-QA green after DeepSeek-v4-pro remediation**.

This does not approve public-bank integration. It remains a candidate QA artifact only until the owner explicitly assigns a later S04/S08/S18 production integration task.

## Artifacts

- DeepSeek summary: `coordination/content-qa/mainland-hjb-primary-generated-bank-v1-1500/deepseek-v4-pro-qa/deepseek-v4-pro-qa-summary.md`
- DeepSeek JSON results: `coordination/content-qa/mainland-hjb-primary-generated-bank-v1-1500/deepseek-v4-pro-qa/deepseek-v4-pro-qa-results.json`
- DeepSeek issue CSV: `coordination/content-qa/mainland-hjb-primary-generated-bank-v1-1500/deepseek-v4-pro-qa/deepseek-v4-pro-qa-issues.csv`
- Cached batch responses: `coordination/content-qa/mainland-hjb-primary-generated-bank-v1-1500/deepseek-v4-pro-qa/batches/`
- Deterministic audit: `coordination/content-qa/mainland-hjb-primary-generated-bank-v1-1500/solvability-audit.md`
