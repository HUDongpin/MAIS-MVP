# Solvability Audit

Package: `us-ca-adaptive-k-g5-beta-seed-v1`

Verdict: pass for the 12 selected K-G5 beta seed questions.

Checks run:
- Counted one topic and two questions for each grade: K, P1, P2, P3, P4, P5.
- Independently recomputed each answer from the student prompt.
- Confirmed every selected multiple-choice item has exactly one listed correct option.
- Confirmed no selected prompt requires an answer-critical image, graph, or exact geometry layer.

Status counts:
- Total questions: 12
- Deterministic pass: 12
- Manual-review rows: 0 new rows beyond inherited S18 accepted sampled rows
- Rejected rows: 0
- Blocker rows: 0

Risk note: this audit supports only the small adaptive beta seed. It does not approve the full K-G5 generated bank, US_CA grades P6-S6 adaptive routing, or US_NC live routing.
