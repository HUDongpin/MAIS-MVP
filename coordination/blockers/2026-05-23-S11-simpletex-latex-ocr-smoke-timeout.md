# Blocker Report

- Date: 2026-05-23
- Session ID: S11
- Task: SimpleTex `latex_ocr` vs `simpletex_ocr rec_mode=formula` pure math A/B
- Blocker type: Other
- What happened: The required provider smoke failed twice. Each smoke executed 10 direct SimpleTex calls; both returned only 9/10 HTTP 200 because `simpletex_ocr rec_mode=formula` failed once per smoke. The second smoke failure was a 45s timeout.
- Files involved: `tests/e2e/simpletex-latex-ocr-fractions-ab.mjs`, `coordination/reports/2026-05-23-simpletex-latex-ocr-fractions-ab.md`, `coordination/reports/2026-05-23-simpletex-latex-ocr-provider-smoke.md`, `coordination/reports/2026-05-23-simpletex-latex-ocr-provider-smoke-rerun.md`.
- Why the session stopped: The approved plan requires a clean 10/10 provider smoke before running the 184-call A/B matrix. Continuing would violate the hard gate and risk wasting SimpleTex quota.
- Decision needed from owner: Confirm whether S19 should verify SimpleTex provider reachability/account status and whether S12 should consider retry/failure classification before another full A/B attempt.
- Safe next step: Rerun a 10-call provider smoke in a quiet local window. If it passes 10/10 HTTP 200, S11 can run the full A/B harness.
