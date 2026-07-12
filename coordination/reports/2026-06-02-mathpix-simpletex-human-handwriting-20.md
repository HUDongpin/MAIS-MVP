# Mathpix vs SimpleTex Human Handwriting OCR Comparison - 2026-06-02

- Session: S11
- Scope: 20 live OCR calls per provider using public human-handwritten mathematical-expression PNG images.
- Source: [krplt/trocr-handwritten-mathematical-expressions](https://huggingface.co/krplt/trocr-handwritten-mathematical-expressions), images folder [dataset/images](https://huggingface.co/krplt/trocr-handwritten-mathematical-expressions/tree/main/dataset/images), annotations [annotations.csv](https://huggingface.co/krplt/trocr-handwritten-mathematical-expressions/blob/main/dataset/annotations.csv).
- Source license noted on Hugging Face page: CC-BY-NC-4.0 as shown on Hugging Face page.
- SimpleTex mode: `simpletex_ocr` with `rec_mode=formula`.
- Mathpix mode: `/v3/text` image OCR.
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

| Provider | HTTP 200 | Exact | Actionable | Symbol token rate | Char/text token rate | Avg confidence | Avg latency |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| simpletex | 20/20 | 13/20 | 14/20 | 81% (34/42) | 96.8% (61/63) | 0.89 | 2934 ms |
| mathpix | 20/20 | 15/20 | 15/20 | 85.7% (36/42) | 98.4% (62/63) | 0.996 | 866 ms |

## Case Results

| # | Expected | SimpleTex output | SimpleTex eval | Mathpix output | Mathpix eval |
| ---: | --- | --- | --- | --- | --- |
| 1 | `0.9 + 0.1` | `0,9+0,1` | miss; symbols 1/3; chars 4/4 | `0,9+0,1` | miss; symbols 1/3; chars 4/4 |
| 2 | `1 + 1` | `1+1` | exact; symbols 1/1; chars 2/2 | `1+1` | exact; symbols 1/1; chars 2/2 |
| 3 | `2 + 2 * 2` | `\text{2+2.2}` | miss; symbols 1/2; chars 3/3 | `2+2 \cdot 2` | exact; symbols 2/2; chars 3/3 |
| 4 | `13 / 3 + 3^2` | `13/3+3^2` | exact; symbols 3/3; chars 4/4 | `13 / 3+3^{2}` | exact; symbols 3/3; chars 4/4 |
| 5 | `26 * 3` | `26\cdot3` | exact; symbols 1/1; chars 2/2 | `26 \cdot 3` | exact; symbols 1/1; chars 2/2 |
| 6 | `52 + 100` | `52+100` | exact; symbols 1/1; chars 2/2 | `52+100` | exact; symbols 1/1; chars 2/2 |
| 7 | `6.5 * 9` | `6,5.9` | miss; symbols 1/2; chars 3/3 | `6,5 \cdot 9` | miss; symbols 1/2; chars 3/3 |
| 8 | `89 * 9` | `89\times9` | exact; symbols 1/1; chars 2/2 | `89 \times 9` | exact; symbols 1/1; chars 2/2 |
| 9 | `46 - 2` | `46-2` | exact; symbols 1/1; chars 2/2 | `46-2` | exact; symbols 1/1; chars 2/2 |
| 10 | `28 - 9` | `28-9` | exact; symbols 1/1; chars 2/2 | `28-9` | exact; symbols 1/1; chars 2/2 |
| 11 | `4^3 / 7` | `4^{3}/7` | exact; symbols 2/2; chars 3/3 | `4^{3} / 7` | exact; symbols 2/2; chars 3/3 |
| 12 | `73 / 4 + (3 * 3)` | `73/4+(3.3)` | actionable; symbols 4/5; chars 4/4 | `73 / 4+(3 \cdot 3)` | exact; symbols 5/5; chars 4/4 |
| 13 | `0.123 + 0` | `0,123+0` | miss; symbols 1/2; chars 3/3 | `0,123+0` | miss; symbols 1/2; chars 3/3 |
| 14 | `1.34 + 5.67` | `\text{1,34+5,67}` | miss; symbols 1/3; chars 4/4 | `1,34+5,67` | miss; symbols 1/3; chars 4/4 |
| 15 | `123 - 49 + 7` | `123-49+7` | exact; symbols 2/2; chars 3/3 | `123-69+7` | miss; symbols 2/2; chars 2/3 |
| 16 | `1426 = 62 x` | `1426=62x` | exact; symbols 1/1; chars 3/3 | `1426=62 x` | exact; symbols 1/1; chars 3/3 |
| 17 | `103 = a + 91` | `103=a+91` | exact; symbols 2/2; chars 3/3 | `103=a+91` | exact; symbols 2/2; chars 3/3 |
| 18 | `799 x + 22 = 426688` | `799x+22=426688` | exact; symbols 2/2; chars 4/4 | `799 x+22=426688` | exact; symbols 2/2; chars 4/4 |
| 19 | `901 + 315 = 302 a - 274027` | `\text{901+315=3020-274027}` | miss; symbols 3/3; chars 3/5 | `901+315=302 a-274027` | exact; symbols 3/3; chars 5/5 |
| 20 | `20(58 x + 78) = 115240` | `20(58x+78)=115240` | exact; symbols 4/4; chars 5/5 | `20(58 x+78)=115240` | exact; symbols 4/4; chars 5/5 |

## Notes

- Raw non-secret JSON: `/tmp/mais-human-handwriting-ocr-20-2026-06-02.json`
- Local evidence images: `/tmp/mais-human-handwriting-ocr-20-images-2026-06-02`
- Rows 1-13 completed in the first live run; row 14 image download hit a Hugging Face TLS reset, so rows 14-20 were continued without rerunning 1-13. Case 19 SimpleTex was retried once after an initial request-layer TypeError; the report records the retry result.
- Metrics: symbol tokens are math operators/structure such as `+ - * / ^ = ( ) .`; char/text tokens are numeric strings and variable letters such as `799`, `x`, `a`, `c`.
- This is a direct-provider comparison. The current MAIS route uses SimpleTex first and Mathpix `/v3/strokes` only as fallback when SimpleTex does not return a candidate.
