# Mainland HJB High DeepSeek V4 Pro Remediation

- Date: 2026-05-27
- Session ID: S18
- Source QA directory: `coordination/content-qa/mainland-hjb-high-deepseek-v4-pro-qa-2026-05-26`
- Reviewed DeepSeek flags: 177
- Data-fixed rows: 174
- False-positive adjudications: 3
- Ledger CSV: `remediation-ledger.csv`
- Ledger JSON: `remediation-ledger.json`

## Cluster Counts

- ABdotAC: 83
- trig-max-count: 42
- right-end-constant: 38
- probability: 4
- domain-accepted-answer: 1
- inequality-explanation: 1
- log-calculation: 1
- log-identity: 1
- monotonicity: 1
- quadratic-bound: 1
- rectangular-prism-volume: 1
- set-containment-empty-set: 1
- triangle-shape: 1
- trig-max-point: 1

## Package Counts

- mainland-hjb-high-generated-bank-v1: 43
- mainland-hjb-high-generated-bank-v2: 67
- mainland-hjb-high-generated-bank-v3-remediated: 38
- mainland-hjb-high-generated-bank-v4-remediated: 29

## Adjudication Policy

- S4 AB/AC rows were treated as side-length product rows because their topic and explanations were trigonometric side-length context; prompts now say "边 AB 与边 AC 的长度乘积" and omit the unused 60° angle.
- S6 AB/AC rows were treated as vector-context rows; prompts now ask for the vector dot product and answers/options use |AB||AC|cos60°.
- Trigonometric maximum-count rows were recomputed from 2x+φ=π/2+2kπ on [0,2π], with k values made explicit.
- Self-contradictory DeepSeek flags were retained in the ledger as false positives when deterministic math review confirmed the existing row.
