# S18 Mainland HJB Junior S2 Lower Paper Safe-RAG Verification

- Date: 2026-05-24
- Session ID: S18
- Scope: 八年级数学下册（沪教版） unit-test and midterm/final paper archives
- Source archives inspected locally:
  - `/Users/dongpinhu/Downloads/八年级数学下册（沪教版）/单元测试.zip`
  - `/Users/dongpinhu/Downloads/八年级数学下册（沪教版）/期中期末.zip`
- Committed RAG output: safe abstraction cards only; no source ZIP, document body text, prompt wording, worked-response wording, answer text, scoring wording, page images, OCR text, page locators, archive member paths, or embeddings.

## Metadata-Only Intake Result

Local ignored output was written to `.local/rag/mainland-hjb-junior-s2-lower-papers/`.

| Metric | Result |
| --- | ---: |
| Archives inspected | 2 |
| Files manifested | 166 |
| Extension counts | `.docx`: 124, `.doc`: 40, `.pdf`: 2 |
| Aligned student-facing paper files | 62 |
| Aligned support files | 64 |
| Quarantined files | 40 |
| Expected S2 lower coverage | 126 aligned/support files |

Quarantined material was not promoted into committed RAG cards:

| Quarantine reason | Count |
| --- | ---: |
| 代数方程 | 16 |
| 概率初步 | 16 |
| insufficient HJB S2 lower signal | 4 |
| 一元一次方程 | 2 |
| 轴对称 | 2 |

## Safe RAG Cards Added

The committed S2 lower paper-pattern layer covers:

- 四边形 / 平行四边形 / 特殊平行四边形
- 平面直角坐标系 / 点的坐标 / 坐标变换
- 一次函数 / 正比例函数 / 函数应用
- 反比例函数 / 图像与性质 / 应用
- 八年级下册期中、期末综合

These cards summarize only broad assessment design patterns: concept tags, competency tags, item-type tags, misconception tags, solution-strategy tags, and generation guidance for new MAIS-authored items.

## Release Gate

Verdict: `SAFE_RAG_PATTERN_LAYER_READY`.

This is not a student-facing question bank. Any future generated HJB S2 lower practice still needs S18 source-distance, math correctness, terminology, and grade-fit review before S04/S05/S08 integration.

## Checks

- `python3 scripts/build-mainland-hjb-junior-paper-manifest.py --self-test` passed.
- `python3 scripts/build-mainland-hjb-junior-paper-manifest.py <two owner ZIPs> --expected-slot S2:lower --out-dir .local/rag/mainland-hjb-junior-s2-lower-papers` passed.
- `npm run test:rag` passed with 103/103 Node RAG tests plus manifest self-tests.
- `npm run type-check` passed.
- `NEXT_TELEMETRY_DISABLED=1 npm run build` passed.

