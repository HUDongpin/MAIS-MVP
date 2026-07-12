# Handwriting API Router Human-Sample Local Test - 2026-06-02

- Session: S12
- Scope: 10 local `/api/handwriting-recognition` route calls using public human-handwritten mathematical-expression bitmap images.
- Source images: `/tmp/mais-human-handwriting-ocr-20-images-2026-06-02`
- Source dataset: `krplt/trocr-handwritten-mathematical-expressions` on Hugging Face.
- Provider mode: real local route with live SimpleTex image OCR and live Mathpix `/v3/strokes`.
- Stroke caveat: the public samples are bitmap images, not real browser handwriting-board stroke recordings. Strokes were vectorized from bitmap ink, which is weaker evidence than real canvas stroke telemetry.
- Secret hygiene: credentials, UAT, app keys, cookies, and auth headers are not recorded.

## Summary After Safety Fix

| Metric | Result |
| --- | ---: |
| Route HTTP 200 | 10/10 |
| Auto-accepted exact | 4/10 |
| Reviewable exact candidate | 2/10 |
| Wrong auto-accepted | 0/10 |
| SimpleTex final provider | 8/10 |
| Mathpix final provider | 2/10 |
| Average latency | 2504 ms |
| P95 latency | 5716 ms |

## Case Results

| # | Expected | Provider | Accepted | Route text | UX result | Latency |
| ---: | --- | --- | --- | --- | --- | ---: |
| 1 | `0.9+0.1` | simpletex | yes | `0.9+0.1` | exact auto-fill | 5716 ms |
| 2 | `1+1` | simpletex | no | `` | reviewable candidate `1+1` | 3103 ms |
| 3 | `2+2*2` | simpletex | no | `` | not solved; candidates `2+2.2`, `2+2` | 1442 ms |
| 4 | `13/3+3^2` | mathpix | yes | `13/3+3^2` | exact auto-fill | 1880 ms |
| 5 | `26*3` | simpletex | no | `` | reviewable candidate `26*3` | 1421 ms |
| 7 | `6.5*9` | simpletex | no | `` | not solved; candidates `6.5.9` | 1610 ms |
| 12 | `73/4+(3*3)` | simpletex | no | `` | not solved; candidates `73/4+(3.3)`, `13.4+(3-3)` | 3633 ms |
| 14 | `1.34+5.67` | mathpix | yes | `1.34+5.67` | exact auto-fill | 1687 ms |
| 19 | `901+315=302a-274027` | simpletex | no | `` | not solved; candidates `901+315=3020-274027`, low-confidence Mathpix noise | 1991 ms |
| 20 | `20(58x+78)=115240` | simpletex | yes | `20(58x+78)=115240` | exact auto-fill | 2553 ms |

## Safety Fix During Test

The first live run produced 3 wrong auto-accepted cases because Mathpix vectorized-stroke output had high confidence while disagreeing with lower-confidence but often correct SimpleTex output.

The router arbitration was tightened so Mathpix only auto-takes over when it clearly resolves a specific SimpleTex risk, such as multiplication-dot confusion with a real `*` result or a restored variable token. Generic provider disagreement now goes to learner review instead of auto-filling.

After the fix, wrong auto-accepted results dropped from 3/10 to 0/10.

## Product Interpretation

- Router switching works: Mathpix was invoked and selected when the routing rules allowed it.
- Safety is improved: no wrong auto-fill remained in this 10-case rerun.
- UX is not yet fully smooth-green: 4/10 auto-filled correctly, 2/10 were reviewable, and 4/10 still required manual correction.
- Main test limitation: bitmap-derived strokes are not equivalent to real handwriting-board strokes. The next stronger test should collect 10 real browser canvas handwriting attempts from a human tester and replay their actual `strokes` plus `imageDataUrl`.

## Recommended Next Step

Add a second Mathpix image fallback (`/v3/text`) for high-risk cases where Mathpix `/v3/strokes` and SimpleTex disagree, gated by cost controls. This would use the same canvas image already sent by the frontend and should handle bitmap-style evidence better than reconstructed strokes.
