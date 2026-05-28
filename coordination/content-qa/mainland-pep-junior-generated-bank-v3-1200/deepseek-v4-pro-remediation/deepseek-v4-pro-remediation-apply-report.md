# DeepSeek V4 Pro Remediation Apply Report

- Applied at: 2026-05-25T02:41:00.337Z
- Patch rows: 92
- Applied rows: 92
- Touched batch files: 53
- Action counts: {"repair":80,"keep_false_positive":12}
- S18 tail fallback rows due DeepSeek network timeout: 8

This updated only the offline v3 generated-bank batch caches. Regenerate package outputs and rerun deterministic plus DeepSeek QA gates before public integration.