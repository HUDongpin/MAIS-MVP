# S18 Mainland PEP Safe Question Bank and RAG Card Content QA

- Date: 2026-05-18
- Session ID: S18
- Workstream: Curriculum QA and content quality
- Scope: `MAINLAND_PEP_HIGH` generated high-school question bank, curriculum RAG safe cards, exam-pattern RAG safe cards, and deterministic retrieval spot checks
- Output type: Content QA report only; no source-data edits

## Executive Summary

Overall release gate: **Red for production student-facing release of the current question bank until the conic short-answer defect is fixed.**

Safety gate: **Green.** No raw textbook, exam-paper, solution, OCR, page, figure, PDF, scan, or source-document leakage was found in question content, RAG content fields, or generated evidence packs. The RAG cards deliberately contain guard language such as "do not reproduce source stems"; those phrases are safety warnings, not source leakage.

RAG card gate: **Green with one retrieval-precision follow-up.** All 18 curriculum RAG cards and 11 exam-pattern RAG cards have the expected structured fields, curriculum track, concept tags, competency tags, item-type tags, difficulty bands, misconception tags, generation guidance, and reuse guards. Retrieval returns the correct top card in the checked scenarios, but narrow queries with larger limits fill the tail with low-relevance cards. This should be tightened before AI Tutor production wiring.

Question-bank gate: **Red because of a P1 answer-key defect.** The 900-question bank passes structural tests and safety scans, but 34 conic short-answer questions store half of the mathematically correct answer for the prompt `y^2=2px`. The stratified 180-question sample included 7 affected questions.

## Evidence Reviewed

- Source files reviewed:
  - `data/mainlandPepHighQuestions.ts`
  - `data/mainlandPepHighTopics.ts`
  - `data/rag/mainlandPepHigh.ts`
  - `data/rag/mainlandPepHighExamPatterns.ts`
  - `lib/rag/mainlandPepHigh.ts`
  - `lib/rag/mainlandPepHighExamPatterns.ts`
  - `lib/rag/mainlandPepHigh.test.ts`
  - `lib/mainlandPepHighQuestionBank.test.ts`
- Coordination decisions reviewed:
  - `coordination/decisions/2026-05-17-mainland-pep-high-rag.md`
  - `coordination/decisions/2026-05-17-mainland-pep-high-exam-pattern-rag.md`
- External anchors used for curriculum context:
  - Ministry of Education curriculum-standard notice: https://hudong.moe.gov.cn/srcsite/A26/s8001/202006/t20200603_462199.html
  - PEP high-school mathematics A-version training/catalog page: https://www.pep.com.cn/xw/zt/px/2019/shuxue/

## Automated Coverage Results

Question-bank inventory:

| Area | Result |
| --- | ---: |
| Total Mainland PEP high questions | 900 |
| S4 questions | 300 |
| S5 questions | 300 |
| S6 questions | 300 |
| Multiple-choice questions | 300 |
| Fill-in questions | 300 |
| Short-answer questions | 300 |
| Covered topic IDs | 22 |

Difficulty distribution:

| Difficulty | Count |
| --- | ---: |
| Foundation | 30 |
| Core | 180 |
| Exam | 564 |
| Challenge | 126 |

RAG-card inventory:

| Area | Result |
| --- | ---: |
| Curriculum RAG safe cards | 18 |
| Exam-pattern RAG cards | 11 |
| Curriculum modules | 10 compulsory, 8 selective-compulsory |
| Curriculum card difficulty bands | 1 foundation, 5 core, 12 exam |
| Exam-pattern difficulty bands | 2 core, 6 exam, 3 challenge |
| Structural field issues | 0 |
| Source-leakage hits in content fields | 0 |

## Stratified Sample Review

Sampling rule executed as assigned: for each grade `S4/S5/S6` and each type `multiple-choice/fill-in/short-answer`, reviewed IDs `001-015` and `096-100`. This produced 180 sample questions.

| Sample Area | Result |
| --- | ---: |
| Planned sample questions | 180 |
| Found sample questions | 180 |
| Missing sample questions | 0 |
| Sample coverage per grade/type | 20 each |
| Topic IDs covered in sample | 22 |
| Structural rubric issues | 0 |
| Source-safety issues | 0 |
| Math/answer-key defects found in sample | 7 |

Rubric fields checked: prompt clarity, answer presence, explanation presence, option count and uniqueness, answer appears exactly once for multiple choice, no options on non-MC questions, inline math delimiter balance, simplified Chinese readability, difficulty sanity, and source-distance safety.

## Findings

### P1 - Conic short-answer answers are half of the correct value

Affected source pattern: `draftConics` short-answer generation.

The prompt asks: given a parabola `y^2 = Cx`, find `p` in `y^2 = 2px`. The correct value is `p = C / 2`. The current generated answer stores `C / 4`, because the generator sets the displayed coefficient as `2 * latus` but stores `latus / 2`.

Examples from the stratified sample:

| ID | Prompt coefficient | Stored answer | Correct answer |
| --- | ---: | ---: | ---: |
| `pep-high-s5-sa-003` | `y^2=10x` | `2.5` | `5` |
| `pep-high-s5-sa-008` | `y^2=6x` | `1.5` | `3` |
| `pep-high-s5-sa-013` | `y^2=14x` | `3.5` | `7` |
| `pep-high-s6-sa-005` | `y^2=14x` | `3.5` | `7` |

Known affected IDs:

- S5 conics: `pep-high-s5-sa-003`, `pep-high-s5-sa-008`, `pep-high-s5-sa-013`, `pep-high-s5-sa-018`, `pep-high-s5-sa-023`, `pep-high-s5-sa-028`, `pep-high-s5-sa-033`, `pep-high-s5-sa-038`, `pep-high-s5-sa-043`, `pep-high-s5-sa-048`, `pep-high-s5-sa-053`, `pep-high-s5-sa-058`, `pep-high-s5-sa-063`, `pep-high-s5-sa-068`, `pep-high-s5-sa-073`, `pep-high-s5-sa-078`, `pep-high-s5-sa-083`, `pep-high-s5-sa-088`, `pep-high-s5-sa-093`, `pep-high-s5-sa-098`
- S6 analytic-geometry synthesis: `pep-high-s6-sa-005`, `pep-high-s6-sa-012`, `pep-high-s6-sa-019`, `pep-high-s6-sa-026`, `pep-high-s6-sa-033`, `pep-high-s6-sa-040`, `pep-high-s6-sa-047`, `pep-high-s6-sa-054`, `pep-high-s6-sa-061`, `pep-high-s6-sa-068`, `pep-high-s6-sa-075`, `pep-high-s6-sa-082`, `pep-high-s6-sa-089`, `pep-high-s6-sa-096`

Recommended owner/session: S04 or S08 with owner approval, because the fix requires editing question-bank generation source. S18 should re-review the affected family after the fix.

### P2 - Exp/log short-answer explanations omit the coefficient step

Affected family: S4 exponential/logarithmic short-answer prompts with coefficients greater than 1.

The stored answers are correct, but the explanation only states the logarithm value and does not multiply by the coefficient. Example: `4log_3(27)` stores `12`, but the explanation says the logarithm equals `3` without completing `4 * 3 = 12`.

Known affected IDs: `pep-high-s4-sa-014`, `pep-high-s4-sa-024`, `pep-high-s4-sa-034`, `pep-high-s4-sa-054`, `pep-high-s4-sa-064`, `pep-high-s4-sa-074`, `pep-high-s4-sa-094`.

Recommended fix: Update the explanation template so coefficient-bearing prompts explicitly state both the logarithm value and final multiplication.

### P2 - Retrieval tail precision is weak for narrow RAG queries

Spot checks show the most relevant card is ranked first, but when `limit` is larger than the number of strong matches, the retriever fills the remaining slots with low-relevance cards because intent score alone can make unrelated cards eligible.

Observed examples:

| Query | Strong top result | Low-relevance tail observed |
| --- | --- | --- |
| Curriculum derivative practice | `pep-high-derivatives-applications` | quadratic and exp/log cards |
| Curriculum trigonometric graph generation | `pep-high-trigonometric-functions` | sets, quadratic, function, exp/log cards |
| Exam conics | `pep-high-exam-conics-analytic-geometry` | derivatives, trigonometry, space vectors |
| Exam space vectors | `pep-high-exam-space-vectors-geometry` | derivatives, trigonometry, conics |
| Combined derivative evidence pack | derivative curriculum and exam cards first | lower-ranked function/trig cards |

This is not a source-safety failure, because all cards remain safe and track-scoped. It is a future AI Tutor quality risk: evidence packs could include distracting context unless retrieval applies a minimum relevance threshold or query-specific fallback behavior.

Recommended owner/session: S08 for retrieval behavior if shared logic changes are needed; S07 before AI Tutor prompt/evidence wiring; S18 to re-review evidence-pack quality after retrieval changes.

### P2 - Difficulty distribution is exam-heavy

The current generated bank has 564 Exam and 126 Challenge questions out of 900. This may be acceptable for an exam-readiness slice, but it is heavy for diagnostic onboarding or foundation repair. If Mainland PEP is intended for general learning, future generation should add more Foundation/Core items, especially for S4 concept introduction.

## RAG Card Review

Curriculum RAG cards:

- 18/18 cards are track-scoped to `MAINLAND_PEP_HIGH`.
- 18/18 cards contain concept IDs, competency tags, item-type tags, difficulty bands, safe summaries, generation guidance, misconception tags, and reuse guards.
- 18/18 cards avoid page references, source figures, source stems, official solution wording, scans, PDFs, OCR content, or long source passages in content fields.
- Chapter coverage matches the current first-slice project scope across compulsory and selective-compulsory high-school topics.

Exam-pattern RAG cards:

- 11/11 cards are track-scoped to `MAINLAND_PEP_HIGH`.
- 11/11 cards contain year ranges, exam families, chapter labels, concept IDs, competency tags, item-type tags, solution-strategy tags, difficulty bands, pattern summaries, misconception tags, generation guidance, and reuse guards.
- 11/11 cards remain aggregated pattern guidance, not source-paper storage.
- The legacy-stream migration card is appropriately framed as calibration only, not as current curriculum control.

## Checks Run

| Check | Result |
| --- | --- |
| `npm run test:rag` | Passed, 8/8 tests |
| `npm run test:question-bank` | Passed, 9/9 tests |
| `npm run type-check` | Passed |
| `npm run audit:zh-hans:strict` | Passed with 0 critical issues; 3334 advisory issues remain project-wide |
| Custom S18 QA compile and analysis under `.tmp/s18-qa` | Passed; identified the P1/P2 content findings above |

## Gate Decision

- **Do not treat the current 900-question Mainland PEP bank as production-ready** until the conic short-answer answer-key defect is fixed and rechecked.
- **RAG cards are safe for continued internal development review**, but retrieval should be tightened before student-facing AI Tutor use.
- **No source-leakage blocker was found.** Original textbooks, exam papers, official solutions, OCR, scans, screenshots, page images, and private archives remain outside the repository.

## Follow-Up Recommendations

1. Assign S04 or S08 to fix `draftConics` short-answer answer generation, then rerun `npm run test:question-bank` and ask S18 to re-review the affected 34 IDs.
2. Add a focused regression test that asserts the conic short-answer expected `p` equals half the displayed coefficient in `y^2=Cx`.
3. Update exp/log short-answer explanations so the final multiplication by the coefficient is explicit.
4. Add a RAG retrieval threshold or tail-filtering rule before S07 injects Mainland PEP evidence packs into the AI Tutor.
5. Consider a future S18/S04 content expansion pass to rebalance Mainland PEP Foundation/Core items if the track is intended for general learning, not only exam-readiness.

## Assumptions

- This S18 task is report-only. Source data and logic defects are intentionally documented, not patched.
- `MAINLAND_PEP_HIGH` is reviewed as the current project’s S4-S6 high-school Mainland PEP scope.
- External official anchors are used only for curriculum context. No textbook or exam source text was copied into this report.

