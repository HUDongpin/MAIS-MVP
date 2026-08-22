# S18 Mainland PEP Full Question-Bank Solvability And Answer-Key QA

- Date: 2026-08-10
- Session ID: S18
- Scope: 1200 Mainland PEP primary questions, 1200 Mainland PEP junior questions, and 4800 Mainland PEP high-school questions
- Output type: Row-level deterministic QA report; no live LLM, OCR, external textbook corpus, or exam-paper source text

## Executive Summary

| Metric | Value |
| --- | --- |
| Expected Mainland PEP questions | 7200 |
| Actual Mainland PEP questions | 7200 |
| Primary questions | 1200 |
| Junior questions | 1200 |
| High-school questions | 4800 |
| Passing rows | 7200 |
| Rows requiring review | 0 |
| P0 rows | 0 |
| P1 rows | 0 |
| P2 rows | 0 |
| Duplicate IDs | 0 |
| Inventory issues | 0 |
| Manual review queue rows | 189 |
| Release recommendation | Green: all current Mainland PEP questions have deterministic row-level solvability and answer-key match verdicts; keep pass-sample manual review before external quality claims. |

## Source Status Counts

| Status | Count |
| --- | --- |
| pass | 7200 |
| content-error | 0 |
| solver-gap | 0 |
| answer-mismatch | 0 |
| ambiguous-mc | 0 |
| grader-gap | 0 |

## Solvability Counts

| Solvable status | Count |
| --- | --- |
| pass | 7200 |

## Answer Match Counts

| Answer match status | Count |
| --- | --- |
| pass | 7200 |

## Batch Counts

| Batch | Count |
| --- | --- |
| primary-rag-v1 | 1200 |
| junior-rag-v2-1200 | 1200 |
| seed-v1 | 900 |
| rag-v2 | 900 |
| rag-v3 | 1500 |
| rag-v4 | 1500 |

## Type Counts

| Type | Count |
| --- | --- |
| multiple-choice | 2470 |
| fill-in | 2440 |
| short-answer | 2290 |

## Inventory Issues

| Issue |
| --- |
| None |

## Pass-Sample Manual Review Queue

| questionId | grade | batch | type | topic | storedAnswer | acceptedAnswers | independentAnswer | solvableStatus | answerMatchStatus | qaStatus | severity | notes | recommendedAction |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| pep-primary-p1-u-mc-001 | P1 | primary-rag-v1 | multiple-choice | 20以内数感 | 3 | 3 | 3 | pass | pass | pass | none | OK | No blocking action; include in grade/batch/type pass-sample review before external quality claims. |
| pep-primary-p1-u-mc-002 | P1 | primary-rag-v1 | multiple-choice | 20以内数感 | 17 | 17 | 17 | pass | pass | pass | none | OK | No blocking action; include in grade/batch/type pass-sample review before external quality claims. |
| pep-primary-p1-u-mc-003 | P1 | primary-rag-v1 | multiple-choice | 20以内数感 | 10 | 10 | 10 | pass | pass | pass | none | OK | No blocking action; include in grade/batch/type pass-sample review before external quality claims. |
| pep-primary-p1-u-fi-091 | P1 | primary-rag-v1 | fill-in | 图形、位置与整时 | cuboid | cuboid; 长方体 | cuboid | pass | pass | pass | none | OK | No blocking action; include in grade/batch/type pass-sample review before external quality claims. |
| pep-primary-p1-u-fi-092 | P1 | primary-rag-v1 | fill-in | 图形、位置与整时 | cuboid | cuboid; 长方体 | cuboid | pass | pass | pass | none | OK | No blocking action; include in grade/batch/type pass-sample review before external quality claims. |
| pep-primary-p1-u-fi-093 | P1 | primary-rag-v1 | fill-in | 图形、位置与整时 | cube | cube; 正方体 | cube | pass | pass | pass | none | OK | No blocking action; include in grade/batch/type pass-sample review before external quality claims. |
| pep-primary-p1-l-sa-171 | P1 | primary-rag-v1 | short-answer | 人民币、时间与数据 | 9 | 9 | 9 | pass | pass | pass | none | OK | No blocking action; include in grade/batch/type pass-sample review before external quality claims. |
| pep-primary-p1-l-sa-172 | P1 | primary-rag-v1 | short-answer | 人民币、时间与数据 | 7 | 7 | 7 | pass | pass | pass | none | OK | No blocking action; include in grade/batch/type pass-sample review before external quality claims. |
| pep-primary-p1-l-sa-173 | P1 | primary-rag-v1 | short-answer | 人民币、时间与数据 | 9 | 9 | 9 | pass | pass | pass | none | OK | No blocking action; include in grade/batch/type pass-sample review before external quality claims. |
| pep-primary-p2-u-mc-001 | P2 | primary-rag-v1 | multiple-choice | 表内乘法与阵列 | 16 | 16 | 16 | pass | pass | pass | none | OK | No blocking action; include in grade/batch/type pass-sample review before external quality claims. |
| pep-primary-p2-u-mc-002 | P2 | primary-rag-v1 | multiple-choice | 表内乘法与阵列 | 12 | 12 | 12 | pass | pass | pass | none | OK | No blocking action; include in grade/batch/type pass-sample review before external quality claims. |
| pep-primary-p2-u-mc-003 | P2 | primary-rag-v1 | multiple-choice | 表内乘法与阵列 | 8 | 8 | 8 | pass | pass | pass | none | OK | No blocking action; include in grade/batch/type pass-sample review before external quality claims. |
| pep-primary-p2-u-fi-091 | P2 | primary-rag-v1 | fill-in | 长度、角与观察物体 | 39 cm | 39 cm; 39厘米; 39; 39cm; 39 厘米 | 39 cm | pass | pass | pass | none | OK | No blocking action; include in grade/batch/type pass-sample review before external quality claims. |
| pep-primary-p2-u-fi-092 | P2 | primary-rag-v1 | fill-in | 长度、角与观察物体 | 34 cm | 34 cm; 34厘米; 34; 34cm; 34 厘米 | 34 cm | pass | pass | pass | none | OK | No blocking action; include in grade/batch/type pass-sample review before external quality claims. |
| pep-primary-p2-u-fi-093 | P2 | primary-rag-v1 | fill-in | 长度、角与观察物体 | 41 cm | 41 cm; 41厘米; 41; 41cm; 41 厘米 | 41 cm | pass | pass | pass | none | OK | No blocking action; include in grade/batch/type pass-sample review before external quality claims. |
| pep-primary-p2-l-sa-171 | P2 | primary-rag-v1 | short-answer | 万以内数、质量、时间与数据 | 2 | 2 | 2 | pass | pass | pass | none | OK | No blocking action; include in grade/batch/type pass-sample review before external quality claims. |
| pep-primary-p2-l-sa-172 | P2 | primary-rag-v1 | short-answer | 万以内数、质量、时间与数据 | 6 | 6 | 6 | pass | pass | pass | none | OK | No blocking action; include in grade/batch/type pass-sample review before external quality claims. |
| pep-primary-p2-l-sa-173 | P2 | primary-rag-v1 | short-answer | 万以内数、质量、时间与数据 | 0 | 0 | 0 | pass | pass | pass | none | OK | No blocking action; include in grade/batch/type pass-sample review before external quality claims. |
| pep-primary-p3-u-mc-001 | P3 | primary-rag-v1 | multiple-choice | 多位数运算与分数初步 | 7/8 | 7/8 | 7/8 | pass | pass | pass | none | OK | No blocking action; include in grade/batch/type pass-sample review before external quality claims. |
| pep-primary-p3-u-mc-002 | P3 | primary-rag-v1 | multiple-choice | 多位数运算与分数初步 | 624 | 624 | 624 | pass | pass | pass | none | OK | No blocking action; include in grade/batch/type pass-sample review before external quality claims. |
| pep-primary-p3-u-mc-003 | P3 | primary-rag-v1 | multiple-choice | 多位数运算与分数初步 | 56 | 56 | 56 | pass | pass | pass | none | OK | No blocking action; include in grade/batch/type pass-sample review before external quality claims. |
| pep-primary-p3-u-fi-076 | P3 | primary-rag-v1 | fill-in | 测量、年月日与几何 | 235 cm | 235 cm; 235厘米; 235; 235cm; 235 厘米 | 235 cm | pass | pass | pass | none | OK | No blocking action; include in grade/batch/type pass-sample review before external quality claims. |
| pep-primary-p3-u-fi-077 | P3 | primary-rag-v1 | fill-in | 测量、年月日与几何 | 52 min | 52 min; 52分钟; 52; 52min | 52 min | pass | pass | pass | none | OK | No blocking action; include in grade/batch/type pass-sample review before external quality claims. |
| pep-primary-p3-u-fi-078 | P3 | primary-rag-v1 | fill-in | 测量、年月日与几何 | 18 min | 18 min; 18分钟; 18; 18min | 18 min | pass | pass | pass | none | OK | No blocking action; include in grade/batch/type pass-sample review before external quality claims. |
| pep-primary-p3-l-sa-151 | P3 | primary-rag-v1 | short-answer | 统计表达与综合复习 | 4 | 4; 4人; 4名; 4 students | 4 | pass | pass | pass | none | OK | No blocking action; include in grade/batch/type pass-sample review before external quality claims. |
| pep-primary-p3-l-sa-152 | P3 | primary-rag-v1 | short-answer | 统计表达与综合复习 | 22 | 22; 22本; 22本书; 22 books | 22 | pass | pass | pass | none | OK | No blocking action; include in grade/batch/type pass-sample review before external quality claims. |
| pep-primary-p3-l-sa-153 | P3 | primary-rag-v1 | short-answer | 统计表达与综合复习 | 9 | 9; 9票; 9 votes | 9 | pass | pass | pass | none | OK | No blocking action; include in grade/batch/type pass-sample review before external quality claims. |
| pep-primary-p4-u-mc-001 | P4 | primary-rag-v1 | multiple-choice | 大数认识与三位数乘两位数 | 3072 | 3072 | 3072 | pass | pass | pass | none | OK | No blocking action; include in grade/batch/type pass-sample review before external quality claims. |
| pep-primary-p4-u-mc-002 | P4 | primary-rag-v1 | multiple-choice | 大数认识与三位数乘两位数 | 3540 | 3540 | 3540 | pass | pass | pass | none | OK | No blocking action; include in grade/batch/type pass-sample review before external quality claims. |
| pep-primary-p4-u-mc-003 | P4 | primary-rag-v1 | multiple-choice | 大数认识与三位数乘两位数 | 12960 | 12960 | 12960 | pass | pass | pass | none | OK | No blocking action; include in grade/batch/type pass-sample review before external quality claims. |

## Retest And Remaining Risk

- Retest required after any source-data, answer-key, accepted-answer, option, explanation, or solver change: rerun `npm run type-check`, `npm run test:question-bank`, and `npm run qa:full-question-bank`.
- Remaining risk after a green deterministic audit: passing rows still need S18 pass-sample review for age appropriateness, Simplified Chinese naturalness, topic fit, and explanation quality before external quality claims.

## Assumptions

- The current Mainland PEP bank is identified by checked-in primary, junior, and high-school generation metadata.
- Solvable means an independent deterministic solver derives an answer from the checked-in prompt, options, diagram data, or generation metadata.
- Answer-key match means the independent answer matches answer or acceptedAnswers under MAIS answer normalization.
- All non-pass rows require 100% S18 manual review; passing rows enter a deterministic grade/batch/type sample queue before external quality claims.
- No live LLM provider, OCR provider, external textbook corpus, or exam-paper source text is used by this audit.
