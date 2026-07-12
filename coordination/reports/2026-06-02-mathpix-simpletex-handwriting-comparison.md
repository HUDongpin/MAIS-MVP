# Mathpix vs SimpleTex Handwriting OCR Comparison - 2026-06-02

- Session: S11
- Scope: 10 live OCR calls per provider using the same handwriting-style PNG image per test case.
- SimpleTex mode: `simpletex_ocr` with `rec_mode=formula`, matching the current MAIS handwriting route.
- Mathpix mode: `/v3/text` image OCR for fair same-image comparison; current MAIS fallback code uses `/v3/strokes` for stroke fallback after SimpleTex.
- Secret hygiene: credentials, UAT, app keys, cookies, and auth headers are not recorded.

## Redacted Environment

| Variable | Status |
| --- | --- |
| `SIMPLETEX_UAT` | present |
| `SIMPLETEX_APP_ID` | empty |
| `SIMPLETEX_APP_SECRET` | empty |
| `SIMPLETEX_API_URL` | present:expected |
| `MATHPIX_APP_ID` | present |
| `MATHPIX_APP_KEY` | present |
| `MATHPIX_TEXT_API_URL` | missing |

## Summary

| Provider | HTTP 200 | Exact | Actionable | Math token rate | Text token rate | Avg confidence | Avg latency |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| simpletex | 10/10 | 8/10 | 9/10 | 96.8% | 100% | 0.857 | 2277 ms |
| mathpix | 10/10 | 7/10 | 10/10 | 100% | 100% | 1 | 506 ms |

## Case Results

| # | Category | Input | SimpleTex output | SimpleTex eval | Mathpix output | Mathpix eval |
| ---: | --- | --- | --- | --- | --- | --- |
| 1 | math-symbol | `x² + 4x` | `x^{2}+4x` | exact; math 4/4; text n/a | `x^{2}+4 x` | exact; math 4/4; text n/a |
| 2 | math-symbol | `(x+3)(x+2)` | `(x+3)(x+2)` | exact; math 3/3; text n/a | `(x+3)(x+2)` | exact; math 3/3; text n/a |
| 3 | math-symbol | `a² - b²` | `a^{2}-b^{2}` | exact; math 4/4; text n/a | `a^{2}-b^{2}` | exact; math 4/4; text n/a |
| 4 | math-symbol | `2x + 3 = 9` | `\text{2x+3=9}` | exact; math 3/3; text n/a | `2 x+3=9` | exact; math 3/3; text n/a |
| 5 | math-symbol | `y = 2x + 1` | `y=2x+1` | exact; math 3/3; text n/a | `y=2 x+1` | exact; math 3/3; text n/a |
| 6 | math-symbol | `3/5 + 1/2` | `3/5+1/2` | exact; math 3/3; text n/a | `3 / 5+1 / 2` | exact; math 3/3; text n/a |
| 7 | math-symbol | `√16 = 4` | `v_{16}=4` | miss; math 2/3; text n/a | `\sqrt{16}=4` | exact; math 3/3; text n/a |
| 8 | math-symbol | `sin 30° = 1/2` | `\sin30^{\circ}=1/2` | actionable; math 3/3; text n/a | `\sin 30^{\circ}=1 / 2` | actionable; math 3/3; text n/a |
| 9 | mixed-text | `Area = 24 cm²` | `Area=24cm^{2}` | exact; math 3/3; text 1/1 | `\text { Area }=24 \mathrm{~cm}^{2}` | actionable; math 3/3; text 1/1 |
| 10 | mixed-text | `radius r = 5 cm` | `\text{radiusr=5cm}` | exact; math 2/2; text 1/1 | `\text { radius } r=5 \mathrm{~cm}` | actionable; math 2/2; text 1/1 |

## Notes

- Raw non-secret JSON: `/tmp/mais-ocr-provider-comparison-2026-06-02.json`
- Evidence images: `/tmp/mais-ocr-provider-comparison-images-2026-06-02`
- This run uses generated handwriting-style images, not real student submissions. It is suitable for provider smoke/relative comparison, not final classroom acceptance.
- For final production fallback evidence, S12/S11 should add a forced-fallback route harness that disables SimpleTex temporarily and validates current `/api/handwriting-recognition` Mathpix `/v3/strokes` behavior end to end.
