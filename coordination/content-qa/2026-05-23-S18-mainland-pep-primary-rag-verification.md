# Mainland PEP Primary RAG Write-In Verification

- Date: 2026-05-23
- Session ID: S18
- Workstream: Curriculum/content QA
- Scope: Mainland PEP primary mathematics P1-P6 safe RAG data, retrieval, evidence packs, manifest tooling, and npm RAG gate
- Verdict: Verified with one remediation. P1-P6 Mainland PEP primary curriculum safe cards and primary paper-pattern cards are written into the safe RAG layer as metadata/safe abstractions, not as copied curriculum-standard, textbook, or paper content.

## Executive Summary

- Confirmed: `data/rag/mainlandPepPrimary.ts` contains 13 primary safe-abstraction cards covering every P1-P6 upper/lower slot.
- Confirmed: `data/rag/mainlandPepPrimaryExamPatterns.ts` contains 62 primary exam-pattern cards covering every P1-P6 upper/lower slot.
- Confirmed: `lib/rag/mainlandPep.ts` returns `primaryExamPatternCards` in `getMainlandPepEvidencePack()` for primary queries and returns no primary pattern cards for senior-secondary queries.
- Confirmed: `package.json` wires Mainland PEP primary manifest, paper manifest, exam manifest, RAG TypeScript compile, and `mainlandPep.test` into `npm run test:rag`.
- Remediated: The unified Mainland PEP entrypoint and the standalone primary exam-pattern helper had drifted in scoring weights. The unified entrypoint now matches the helper, and a regression test protects the consistency.
- Safety result: No source-material artifact patterns were found in committed Mainland PEP primary RAG data or evidence builders during the targeted scan.

## Coverage

### Primary Curriculum Safe Cards

| Grade-semester slot | Card count |
| --- | ---: |
| P1 upper | 2 |
| P1 lower | 1 |
| P2 upper | 1 |
| P2 lower | 1 |
| P3 upper | 1 |
| P3 lower | 1 |
| P4 upper | 1 |
| P4 lower | 1 |
| P5 upper | 1 |
| P5 lower | 1 |
| P6 upper | 1 |
| P6 lower | 1 |

Total: 13 safe-abstraction cards. Coverage status: complete for P1-P6 upper/lower.

### Primary Exam-Pattern Cards

| Grade-semester slot | Card count |
| --- | ---: |
| P1 upper | 5 |
| P1 lower | 5 |
| P2 upper | 5 |
| P2 lower | 5 |
| P3 upper | 5 |
| P3 lower | 5 |
| P4 upper | 5 |
| P4 lower | 5 |
| P5 upper | 5 |
| P5 lower | 5 |
| P6 upper | 6 |
| P6 lower | 6 |

Total: 62 aggregated paper-pattern cards. Coverage status: complete for P1-P6 upper/lower.

## Interface And Retrieval Verification

- Type surface confirmed:
  - `MainlandPepEvidencePack.primaryExamPatternCards`
  - `MainlandPepPrimaryExamPatternCard`
  - `MainlandPepPrimaryExamPatternQuery`
- The primary exam-pattern card type contains safe abstraction fields such as grade, semester, material kind, assessment family, unit-title cluster, concept tags, competency tags, item-type tags, misconception tags, generation guidance, and reuse restrictions.
- The type scan found no Mainland PEP primary source locator fields such as source archive path, archive entry path, OCR payload, page image, or source text field in the relevant interfaces.
- P1-P6 representative queries were verified through `npm run test:rag` and the targeted helper comparison:
  - P1 `20以内加减法`
  - P2 `乘法口诀`
  - P3 `分数初步`
  - P4 `平均数`
  - P5 `长方体正方体体积`
  - P6 `比例尺`
- S4/S5/S6 retrieval remains separated from the primary paper-pattern layer; senior-secondary queries do not return primary exam-pattern cards.

## Safety Verification

- Metadata tools confirmed:
  - `scripts/build-mainland-pep-primary-manifest.py`
  - `scripts/build-mainland-pep-primary-paper-manifest.py`
  - `scripts/build-mainland-pep-primary-exam-manifest.py`
- All three Mainland PEP primary manifest self-tests passed.
- Targeted scan of committed Mainland PEP primary RAG data and evidence builders found no matches for source-material artifact patterns including original-item wording markers, answer-dump markers, OCR markers, source archive/entry markers, scan/screenshot markers, or page markers.
- Local manifest outputs remain intended for ignored local storage under `.local/rag/`; committed RAG data stores safe abstractions and aggregate patterns only.
- Existing grade-specific paper QA files are now present for P1, P2, P3, P4, P5, and P6.

## Remediation Completed

- Updated `lib/rag/mainlandPep.ts` so the unified primary exam-pattern scoring matches `lib/rag/mainlandPepPrimaryExamPatterns.ts`.
- Added `unified Mainland PEP entrypoint matches the primary exam-pattern helper` to `lib/rag/mainlandPep.test.ts`.
- The new regression compares card IDs and evidence-pack card IDs across representative P1-P6 and S4 queries.

## Checks Run

- Passed: `python3 scripts/build-mainland-pep-primary-manifest.py --self-test`
- Passed: `python3 scripts/build-mainland-pep-primary-paper-manifest.py --self-test`
- Passed: `python3 scripts/build-mainland-pep-primary-exam-manifest.py --self-test`
- Passed: targeted helper-consistency check after temporary RAG compile; 10 representative queries compared successfully.
- Passed: `npm run test:rag`; 56/56 tests passed, including the new unified-entrypoint/helper consistency regression.
- Attempted: `npm run type-check`; exited with code `-1` after running without diagnostics. No leftover `tsc` process was found. This is consistent with same-day S18 logs that recorded local full-TypeScript check instability, while the RAG-focused compile inside `npm run test:rag` passed.

## Gaps And Follow-Up

- P1/P3 dedicated grade-level paper-review QA notes were added after the initial verification report to close the standalone reporting-evidence gap.
- Full app-wide `npm run type-check` remains inconclusive in this local environment. Rerun it in a stable compiler environment before treating this as a full app-wide release gate.
- Before any generated student-facing primary question bank is launched, S18 should sample generated outputs for mathematical correctness, source distance, Simplified Chinese terminology fit, and grade-level appropriateness.
