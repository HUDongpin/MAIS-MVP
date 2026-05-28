# DeepSeek-pro-v4 Model QA Report - Mainland PEP High Questions

- Date: 2026-05-26
- Session ID: S18
- Scope: all
- Cache run id: full-20260526-v1
- Force cache refresh: no
- Batch cache dir: `batches-3fbeab65fc`
- Question source: `data/mainlandPepHighQuestions.ts`
- Model: `deepseek-v4-pro`
- API host: `api.deepseek.com`
- Started: 2026-05-26T14:25:29.499Z
- Finished: 2026-05-26T14:40:26.700Z
- Result: needs-review

## Hard-Gate Summary

- Reviewed rows: 4800
- Pass: 4760
- Needs review: 40
- P0: 0
- P1: 0
- P2: 40
- Unsolvable flagged: 0
- Answer mismatch flagged: 0
- Local model-contradiction corrections: 89

## By Grade

| grade | reviewed | pass | needs review | P0 | P1 | P2 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| S4 | 1600 | 1600 | 0 | 0 | 0 | 0 |
| S5 | 1600 | 1560 | 40 | 0 | 0 | 40 |
| S6 | 1600 | 1600 | 0 | 0 | 0 | 0 |

## By Batch

| batch | reviewed | pass | needs review | P0 | P1 | P2 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| rag-v2 | 900 | 860 | 40 | 0 | 0 | 40 |
| rag-v3 | 1500 | 1500 | 0 | 0 | 0 | 0 |
| rag-v4 | 1500 | 1500 | 0 | 0 | 0 | 0 |
| seed-v1 | 900 | 900 | 0 | 0 | 0 | 0 |

## Issue Codes

- explanation-mismatch: 40

## Top Issue Rows

| id | batch | grade | topic | severity | issue codes | details |
| --- | --- | --- | --- | --- | --- | --- |
| pep-high-s5-rag2-fi-021 | rag-v2 | S5 | 直线和圆的方程 | P2 | explanation-mismatch | 解析提及斜率计算，与题目求半径无关，但答案正确。 |
| pep-high-s5-rag2-fi-022 | rag-v2 | S5 | 直线和圆的方程 | P2 | explanation-mismatch | 解析提及斜率计算，与题目求半径无关，但答案正确。 |
| pep-high-s5-rag2-fi-023 | rag-v2 | S5 | 直线和圆的方程 | P2 | explanation-mismatch | 解析提及斜率计算，与题目求半径无关，但答案正确。 |
| pep-high-s5-rag2-fi-024 | rag-v2 | S5 | 直线和圆的方程 | P2 | explanation-mismatch | 解析提及斜率计算，与题目求半径无关，但答案正确。 |
| pep-high-s5-rag2-fi-025 | rag-v2 | S5 | 直线和圆的方程 | P2 | explanation-mismatch | 解析提及斜率计算，与题目求半径无关，但答案正确。 |
| pep-high-s5-rag2-fi-026 | rag-v2 | S5 | 直线和圆的方程 | P2 | explanation-mismatch | 解析提及斜率计算，与题目求半径无关，但答案正确。 |
| pep-high-s5-rag2-fi-027 | rag-v2 | S5 | 直线和圆的方程 | P2 | explanation-mismatch | 解析提及斜率计算，与题目求半径无关，但答案正确。 |
| pep-high-s5-rag2-fi-028 | rag-v2 | S5 | 直线和圆的方程 | P2 | explanation-mismatch | 解析提及斜率计算，与题目求半径无关，但答案正确。 |
| pep-high-s5-rag2-fi-029 | rag-v2 | S5 | 直线和圆的方程 | P2 | explanation-mismatch | 解析提及斜率计算，与题目求半径无关，但答案正确。 |
| pep-high-s5-rag2-fi-030 | rag-v2 | S5 | 直线和圆的方程 | P2 | explanation-mismatch | 解析提及斜率计算，与题目求半径无关，但答案正确。 |
| pep-high-s5-rag2-fi-031 | rag-v2 | S5 | 直线和圆的方程 | P2 | explanation-mismatch | 解析提及斜率计算，与题目求半径无关，但答案正确。 |
| pep-high-s5-rag2-fi-032 | rag-v2 | S5 | 直线和圆的方程 | P2 | explanation-mismatch | 解析提及斜率计算，与题目求半径无关，但答案正确。 |
| pep-high-s5-rag2-fi-033 | rag-v2 | S5 | 直线和圆的方程 | P2 | explanation-mismatch | 解析提及斜率计算，与题目求半径无关，但答案正确。 |
| pep-high-s5-rag2-fi-034 | rag-v2 | S5 | 直线和圆的方程 | P2 | explanation-mismatch | 解析提及斜率计算，与题目求半径无关，但答案正确。 |
| pep-high-s5-rag2-fi-035 | rag-v2 | S5 | 直线和圆的方程 | P2 | explanation-mismatch | 解析提及斜率计算，与题目求半径无关，但答案正确。 |
| pep-high-s5-rag2-fi-036 | rag-v2 | S5 | 直线和圆的方程 | P2 | explanation-mismatch | 解析提及斜率计算，与题目求半径无关，但答案正确。 |
| pep-high-s5-rag2-fi-037 | rag-v2 | S5 | 直线和圆的方程 | P2 | explanation-mismatch | 解析提及斜率计算，与题目求半径无关，但答案正确。 |
| pep-high-s5-rag2-fi-038 | rag-v2 | S5 | 直线和圆的方程 | P2 | explanation-mismatch | 解析提及斜率计算，与题目求半径无关，但答案正确。 |
| pep-high-s5-rag2-fi-039 | rag-v2 | S5 | 直线和圆的方程 | P2 | explanation-mismatch | 解析提及斜率计算，与题目求半径无关，但答案正确。 |
| pep-high-s5-rag2-fi-040 | rag-v2 | S5 | 直线和圆的方程 | P2 | explanation-mismatch | 解析提及斜率计算，与题目求半径无关，但答案正确。 |
| pep-high-s5-rag2-sa-021 | rag-v2 | S5 | 直线和圆的方程 | P2 | explanation-mismatch | 解析提到“斜率由两点坐标计算”，但题目只涉及圆的方程，与斜率无关，解析内容与题目不匹配。 |
| pep-high-s5-rag2-sa-022 | rag-v2 | S5 | 直线和圆的方程 | P2 | explanation-mismatch | 解析提到“斜率由两点坐标计算”，但题目只涉及圆的方程，与斜率无关，解析内容与题目不匹配。 |
| pep-high-s5-rag2-sa-023 | rag-v2 | S5 | 直线和圆的方程 | P2 | explanation-mismatch | 解析提到“斜率由两点坐标计算”，但题目只涉及圆的方程，与斜率无关，解析内容与题目不匹配。 |
| pep-high-s5-rag2-sa-024 | rag-v2 | S5 | 直线和圆的方程 | P2 | explanation-mismatch | 解析提到“斜率由两点坐标计算”，但题目只涉及圆的方程，与斜率无关，解析内容与题目不匹配。 |
| pep-high-s5-rag2-sa-025 | rag-v2 | S5 | 直线和圆的方程 | P2 | explanation-mismatch | 解析提到“斜率由两点坐标计算”，但题目只涉及圆的方程，与斜率无关，解析内容与题目不匹配。 |
| pep-high-s5-rag2-sa-026 | rag-v2 | S5 | 直线和圆的方程 | P2 | explanation-mismatch | 解析提到“斜率由两点坐标计算”，但题目只涉及圆的方程，与斜率无关，解析内容与题目不匹配。 |
| pep-high-s5-rag2-sa-027 | rag-v2 | S5 | 直线和圆的方程 | P2 | explanation-mismatch | 解析提到“斜率由两点坐标计算”，但题目只涉及圆的方程，与斜率无关，解析内容与题目不匹配。 |
| pep-high-s5-rag2-sa-028 | rag-v2 | S5 | 直线和圆的方程 | P2 | explanation-mismatch | 解析提到“斜率由两点坐标计算”，但题目只涉及圆的方程，与斜率无关，解析内容与题目不匹配。 |
| pep-high-s5-rag2-sa-029 | rag-v2 | S5 | 直线和圆的方程 | P2 | explanation-mismatch | 解析提到“斜率由两点坐标计算”，但题目只涉及圆的方程，与斜率无关，解析内容与题目不匹配。 |
| pep-high-s5-rag2-sa-030 | rag-v2 | S5 | 直线和圆的方程 | P2 | explanation-mismatch | 解析提到“斜率由两点坐标计算”，但题目只涉及圆的方程，与斜率无关，解析内容与题目不匹配。 |
| pep-high-s5-rag2-sa-031 | rag-v2 | S5 | 直线和圆的方程 | P2 | explanation-mismatch | 解析提到“斜率由两点坐标计算”，但题目只涉及圆的方程，与斜率无关，解析内容与题目不匹配。 |
| pep-high-s5-rag2-sa-032 | rag-v2 | S5 | 直线和圆的方程 | P2 | explanation-mismatch | 解析提到“斜率由两点坐标计算”，但题目只涉及圆的方程，与斜率无关，解析内容与题目不匹配。 |
| pep-high-s5-rag2-sa-033 | rag-v2 | S5 | 直线和圆的方程 | P2 | explanation-mismatch | 解析提到“斜率由两点坐标计算”，但题目只涉及圆的方程，与斜率无关，解析内容与题目不匹配。 |
| pep-high-s5-rag2-sa-034 | rag-v2 | S5 | 直线和圆的方程 | P2 | explanation-mismatch | 解析提到“斜率由两点坐标计算”，但题目只涉及圆的方程，与斜率无关，解析内容与题目不匹配。 |
| pep-high-s5-rag2-sa-035 | rag-v2 | S5 | 直线和圆的方程 | P2 | explanation-mismatch | 解析提到“斜率由两点坐标计算”，但题目只涉及圆的方程，与斜率无关，解析内容与题目不匹配。 |
| pep-high-s5-rag2-sa-036 | rag-v2 | S5 | 直线和圆的方程 | P2 | explanation-mismatch | 解析提到“斜率由两点坐标计算”，但题目只涉及圆的方程，与斜率无关，解析内容与题目不匹配。 |
| pep-high-s5-rag2-sa-037 | rag-v2 | S5 | 直线和圆的方程 | P2 | explanation-mismatch | 解析提到“斜率由两点坐标计算”，但题目只涉及圆的方程，与斜率无关，解析内容与题目不匹配。 |
| pep-high-s5-rag2-sa-038 | rag-v2 | S5 | 直线和圆的方程 | P2 | explanation-mismatch | 解析提到“斜率由两点坐标计算”，但题目只涉及圆的方程，与斜率无关，解析内容与题目不匹配。 |
| pep-high-s5-rag2-sa-039 | rag-v2 | S5 | 直线和圆的方程 | P2 | explanation-mismatch | 解析提到“斜率由两点坐标计算”，但题目只涉及圆的方程，与斜率无关，解析内容与题目不匹配。 |
| pep-high-s5-rag2-sa-040 | rag-v2 | S5 | 直线和圆的方程 | P2 | explanation-mismatch | 解析提到“斜率由两点坐标计算”，但题目只涉及圆的方程，与斜率无关，解析内容与题目不匹配。 |

## Notes

- This is a DeepSeek-assisted QA pass, not a production approval by itself.
- DeepSeek was asked to independently solve and check only the two requested hard gates: solvability and answer/question match.
- Any `needs-review` row should go to S18 math adjudication before source-data edits.
- This task did not edit `data/mainlandPepHighQuestions.ts`, feature UI, API routes, or shared types.
- The API key was provided at runtime only and is not stored in this artifact.
