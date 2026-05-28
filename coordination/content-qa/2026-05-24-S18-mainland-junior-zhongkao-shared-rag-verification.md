# Mainland Junior Zhongkao Shared RAG Verification

- Date: 2026-05-24
- Session ID: S18
- Workstream: Curriculum QA and content quality
- Status: Implemented
- Source boundary: owner-provided local archive, metadata-only processing

## Summary

The nationwide Mainland junior zhongkao archive was safely absorbed into MAIS as a shared aggregated zhongkao pattern layer. The committed RAG layer stores only source-distant pattern abstractions and is shared across Mainland textbook publishers, including PEP, pending BNU, HJB, and future Mainland editions.

No source documents, extracted text, answer wording, worked solutions, OCR text, tables, figures, source member paths, page images, page locators, or embeddings were committed.

## Metadata Run

The local metadata-only manifest run wrote ignored artifacts to `.local/rag/mainland-junior-zhongkao-exams/`.

Classified files:

| Category | Count |
| --- | ---: |
| Files classified | 2247 |
| Ignored hidden/directory entries | 3073 |
| `.doc` | 1393 |
| `.docx` | 815 |
| `.pdf` | 33 |
| `.rar` quarantined | 6 |

Duplicate and intake status:

| Status | Count | QA handling |
| --- | ---: | --- |
| `skip_exact_duplicate` | 10 | Do not create new cards |
| `same_exam_variant` | 1802 | Keep coverage metadata only |
| `covered_by_existing_card` | 69 | Covered by shared safe-card layer |
| `historical_reference` | 357 | Metadata-only 2014-2020 trend reference |
| `quarantine` | 9 | Excluded from RAG |

Quarantine reasons:

| Reason | Count |
| --- | ---: |
| `unsupported-extension` | 6 |
| `non-math-or-unknown-subject` | 3 |

## Safe-Card QA

- The committed shared cards cover 2021-2025 aggregated S1-S3 zhongkao tendencies only.
- The cards preserve unit-title clusters, concept IDs, competency tags, item-type tags, strategy tags, misconception tags, and generation guidance.
- The PEP compatibility export is derived from the shared layer, so the same national zhongkao patterns are not separately maintained as PEP-only data.
- The HJB junior evidence pack now adds the shared zhongkao layer after HJB textbook and HJB paper-pattern layers.
- BNU remains a pending publisher track; this implementation does not add BNU-facing student content.

## Checks

- `python3 scripts/build-mainland-junior-zhongkao-manifest.py --self-test` passed.
- `npm run rag:mainland-junior-zhongkao-manifest -- <owner archive>` passed and produced ignored metadata-only artifacts.
- `npm run test:rag` passed with 111/111 Node RAG tests plus manifest self-tests.
- `npm run type-check` passed.
- `npm run build` passed.

## Risk Notes

- The local manifest uses filenames for coarse metadata only; it does not inspect or persist document bodies.
- The large number of `same_exam_variant` rows is expected because the archive includes many paper/solution variants for the same year-region exam family.
- Student-visible questions, explanations, AI Tutor responses, or lessons must still be MAIS-authored and pass S18 source-distance plus math-quality QA before promotion.
