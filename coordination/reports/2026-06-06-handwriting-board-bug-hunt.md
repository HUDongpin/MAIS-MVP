# 2026-06-06 Lesson / Practice Handwriting Board Bug Hunt

- Session: S11
- Scope: Practice Arena and Lesson handwriting board, including mocked UI state paths and authenticated live OCR route smoke.
- Findings: 1 total (P0 0, P1 0, P2 1)
- Secret hygiene: no provider credentials, cookies, auth headers, or token values are recorded.

## HWB-01 [P2] Live OCR route returns empty text for clear common math expressions
- Surface: API
- Expected: Clear math images for equations and trigonometric expressions return recognized text or at least non-empty alternatives for learner review.
- Actual: 3/5 live OCR calls returned HTTP 200 from a provider but `accepted=false` with empty text.
- Repro: POST generated PNG data URLs for common math expressions such as `2x+3=9` and `sin30=1/2` to `/api/handwriting-recognition`.
- Evidence: [{"caseId":"live-1","input":"x^2+4x","httpStatus":200,"provider":"simpletex","accepted":false,"text":"","reason":"Recognition requires review: low-confidence.","alternativesCount":1,"latencyMs":9144},{"caseId":"live-4","input":"2x+3=9","httpStatus":200,"provider":"simpletex","accepted":false,"text":"","reason":"Recognition requires review: low-confidence.","alternativesCount":1,"latencyMs":2485},{"caseId":"live-5","input":"sin30=1/2","httpStatus":200,"provider":"simpletex","accepted":false,"text":"","reason":"Recognition requires review: low-confidence.","alternativesCount":1,"latencyMs":2190}]
- Root cause hypothesis: The route/provider acceptance threshold or post-processing may be dropping usable OCR candidates instead of surfacing them for learner review.

## Live OCR Rows

| Case | Input | HTTP | Provider | Accepted | Text | Latency |
| --- | --- | ---: | --- | --- | --- | ---: |
| live-1 | `x^2+4x` | 200 | simpletex | false | `` | 9144 ms |
| live-2 | `3/5+1/2` | 200 | simpletex | true | `3/5+1/2` | 2968 ms |
| live-3 | `0.9+0.1` | 200 | simpletex | true | `0.9+0.1` | 1985 ms |
| live-4 | `2x+3=9` | 200 | simpletex | false | `` | 2485 ms |
| live-5 | `sin30=1/2` | 200 | simpletex | false | `` | 2190 ms |