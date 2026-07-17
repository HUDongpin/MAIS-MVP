# S23 Promotability Decision

Package: `us-ca-adaptive-k-g5-beta-seed-v1`

Decision: promote to `US_CA_MATH` adaptive beta live seed after S15 regression evidence.

Promoted scope:
- `US_CA_MATH`
- Grades `K`, `P1`, `P2`, `P3`, `P4`, `P5`
- One beta topic and two beta questions per grade
- Adaptive Learning dashboard/next-action use only

Held scope:
- `US_NC_MATH`: `candidate-only`
- `US_CA_MATH` grades `P6`-`S6`: adaptive fallback until a separate S18/S15 gate exists
- Full California K-G5 generated bank: not promoted

Required gates:
- S18 verdict: `approved-for-integration-review` for the 12-row seed.
- S15 regression: green for track isolation, no empty recommendations, sparse bank stability, and dashboard/adaptive behavior.
- S02 fallback: dashboard must show a meaningful beta-pending state when content is not open.

Integration notes:
- Live mapping uses the existing US California topic/question adapters with a selected 12-row seed.
- Student-facing prompts are sanitized to remove provider/candidate labels.
- No raw protected source text, credentials, or private corpus chunks are committed in this package.
