# S18 DeepSeek V4 Pro Remediation Report

- Date: 2026-05-27
- Session ID: S18
- Package: `mainland-hjb-high-generated-bank-v1`
- Source QA: `mainland-hjb-high-deepseek-v4-pro-qa-2026-05-26`
- Flagged rows adjudicated in this package: 43
- Data-fixed rows: 42
- False-positive rows: 1
- Production data files synchronized: `question-pack.json`, `questions.jsonl`, `questions.csv`

## Cluster Counts

- ABdotAC: 30
- right-end-constant: 12
- rectangular-prism-volume: 1

## Notes

- AB/AC rows use the approved mixed policy: S4 trigonometry rows now ask for side-length product explicitly; S6 vector-context rows now ask for vector dot product and use |AB||AC|cos60°.
- DeepSeek self-contradictory flags were adjudicated by deterministic math review and recorded in the central remediation ledger.
- No API, UI, shared type, or app integration files were edited by this remediation script.
