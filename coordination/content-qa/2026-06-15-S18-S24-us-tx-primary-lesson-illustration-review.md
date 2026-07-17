# S18/S24 QA Review - US Texas K-G5 Lesson Illustration Promotion Packet

Date: 2026-06-15
Package: `us-tx-primary-lesson-illustrations-promotion-packet`
Warehouse location: owner-managed external candidate warehouse, package `2026-06-15-us-tx-primary-lesson-illustrations-promotion-packet`
Intended route from packet manifest: `/student/lessons/texas-k-g5-textbook`

## Verdict

`needs-repair` and `candidate-only`.

Do not promote this packet back into runtime yet. The packet is structurally complete and visually more controlled than the previously rejected mainland PEP high images, but it does not meet S18/S24 student-facing math illustration gates. Deterministic SVG generation is useful evidence, not approval.

## Owner Rejection Applied

Owner decision on 2026-06-15: delete the 14 coordinate-plane visuals because all 14 lacked x/y axes, tick marks, and point-coordinate labels.

Applied to the Desktop promotion packet only:

- Rejected assets: 14 `coordinate-plane-model` assets.
- Removed files: 28 PNG/SVG files.
- Remaining packet assets: 286.
- Remaining packet files under `files/`: 577.
- Rejection manifest: owner-managed external candidate warehouse path `2026-06-15-us-tx-primary-lesson-illustrations-promotion-packet/rejections/2026-06-15-coordinate-plane-missing-exact-layer.json`
- The root runtime packet paths remain empty; no tracked/runtime file was restored or promoted.

## Scope Reviewed

Packet inventory:

| Signal | Result |
| --- | ---: |
| Assets in data file | 300 |
| PNG files | 300 |
| SVG files | 300 |
| Manifest/data/component/route files | 5 |
| Total files in packet | 605 |
| Grades covered | K, G1, G2, G3, G4, G5 |
| Assets per grade | 50 |
| PNG dimension check | 300/300 are 1600x900 |
| Missing PNG/SVG refs from data file | 0 |

Desktop copy integrity had already been verified by SHA-256 before repo source cleanup.

## Automated Exact-Layer Signals

SVG text/label coverage:

| Visual kind | Count | Average text tags | No SVG text |
| --- | ---: | ---: | ---: |
| `array-or-area-model` | 39 | 2.00 | 0 |
| `coordinate-plane-model` | 14 | 0.00 | 14 |
| `counting-collection` | 51 | 2.00 | 0 |
| `data-display` | 20 | 0.00 | 20 |
| `decimal-place-value-model` | 9 | 0.00 | 9 |
| `fraction-model` | 41 | 3.00 | 0 |
| `geometry-model` | 22 | 0.00 | 22 |
| `math-model-scene` | 8 | 0.00 | 8 |
| `measurement-model` | 23 | 4.26 | 9 |
| `number-line-model` | 22 | 11.00 | 0 |
| `pattern-expression-model` | 4 | 0.00 | 4 |
| `place-value-model` | 37 | 0.00 | 37 |
| `volume-model` | 10 | 3.00 | 0 |

Risk signal:

- 123/300 SVGs have no `<text>` labels at all.
- 174/300 high-risk visuals have weak label coverage for their visual kind.
- All 14 coordinate-plane visuals have no axis labels, scale labels, or point-coordinate labels.
- All 20 data-display visuals have no category labels, scale labels, title, or units.
- All 37 place-value visuals have no place labels or value labels.

## Manual Sample Method

Reviewed 12 samples, 2 from each grade:

| Grade | Sample focus |
| --- | --- |
| K | counting collection; data display |
| G1 | counting on/back; data display |
| G2 | place value; arrays/repeated addition |
| G3 | multiplication meaning; scaled graph |
| G4 | measurement conversion; multi-digit multiplication |
| G5 | coordinate plane; fraction multiplication |

## Manual Findings

| Sample | Finding | Gate |
| --- | --- | --- |
| K counting collection | Shows count change with visible quantities and numbers. Usable as concept art, but lacks a prompt or student action. | `repair-minor` |
| K data display | Bar-style display has no title, category labels, scale, or unit. Cannot be approved as a data display. | `needs-repair` |
| G1 counting on/back | Shows 12 to 8 count change. Conceptually plausible, but no equation, action label, or problem context. | `repair-minor` |
| G1 data display | No category labels, y-axis scale, title, or unit. | `needs-repair` |
| G2 place value | Shows blocks/rods/ones, but no hundreds/tens/ones labels or represented number. | `needs-repair` |
| G2 arrays/repeated addition | Shows an array-like grid, but no row/column counts, repeated-addition sentence, or product. | `needs-repair` |
| G3 multiplication meaning | Array model lacks dimensions, equation, and explicit multiplication relationship. | `needs-repair` |
| G3 scaled graph | Bars are present, but there is no title, category label, scale, or unit. This fails the scaled graph purpose. | `needs-repair` |
| G4 measurement conversion | Numbered ruler is deterministic, but units and conversion relationship are absent. | `needs-repair` |
| G4 multi-digit multiplication | Shows grouped arrays and plus sign, but no factors, partial products, place-value decomposition, or result. | `needs-repair` |
| G5 coordinate plane | Grid and points are present, but no x/y labels, tick numbers, point labels, or coordinate pairs. | `needs-repair` |
| G5 fraction multiplication | Fraction labels `0/3`, `2/3`, `3/3` are exact, but the visual does not show two factors, an area overlap, or a multiplication equation. | `needs-repair` |

## Curriculum And Pedagogy Risks

1. Many `objective` fields are generic and sometimes mismatched to the visual kind. Example: G5 coordinate plane sample has objective `I can use fraction operations to solve a new problem`, which does not match coordinate-plane instruction.
2. Several visuals are decorative classroom scenes plus an abstract math object. They need explicit task context before being student-facing.
3. High-grade visuals need more exact labels than early-grade concept visuals. This packet currently treats many G3-G5 visuals too much like unlabeled concept art.
4. Data displays and coordinate planes fail the exact-layer checklist because answer-critical labels, scales, and units are missing.
5. Place-value, array, and fraction models often show a visual representation but not the mathematical relationship students are supposed to learn.

## Required Repairs Before Promotion

Minimum S24 exact-layer requirements:

- Coordinate-plane visuals: add x-axis/y-axis labels, tick labels, point labels, and coordinate pairs.
- Data-display visuals: add graph title, category labels, y-axis scale or pictograph key, and units.
- Measurement visuals: add units and conversion relationship, such as inches/feet or centimeters/meters where appropriate.
- Place-value visuals: add hundreds/tens/ones or decimal place labels and the represented number.
- Array/area visuals: add row/column counts, multiplication sentence, repeated-addition sentence, or partial-product labels.
- Fraction visuals: add factors, shaded-overlap/area interpretation when teaching multiplication, and a clear equation.
- Geometry/volume visuals: add dimensions, units, and labels for shapes/attributes.

Minimum S18 content QA requirements:

- Align each `objective` with the visual kind and lesson title.
- Add a row-level QA field or manifest status for `approved`, `needs-repair`, or `rejected`.
- Review at least one sample from every unit family, not only every grade.
- Ensure student-facing route copy does not claim this is a completed Texas K-G5 textbook illustration release until repairs are accepted.

## Release Recommendation

Keep the packet in Desktop warehouse as candidate-only:

- Do not restore `public/lesson-illustrations/us-tx-primary/` into root runtime.
- Do not restore `data/usTexasPrimaryLessonIllustrations.ts` or the route/gallery files until repairs are complete.
- Do not include this packet in a release PR.

After repair, extract a clean promotion branch such as:

- `codex/s05-s18-s24-us-tx-primary-lesson-illustrations`

Required gates for that future branch:

- S18 content/lesson objective review.
- S24 exact-layer review.
- S05 lesson surface ownership.
- S11 focused route smoke for `/student/lessons/texas-k-g5-textbook`.
- S22 staging dry run confirming deploy size and public asset policy.

## Checks Run

- Parsed Desktop packet manifest and cleanup result.
- Parsed `data/usTexasPrimaryLessonIllustrations.ts`.
- Verified 300 PNG refs and 300 SVG refs from the data file exist in the Desktop packet.
- Verified 300/300 PNG dimensions are 1600x900.
- Generated a temporary 12-sample contact sheet for manual inspection at `/tmp/us-tx-primary-s18-s24-sample-sheet.png`.
- Inspected high-risk samples for data display, coordinate plane, fraction model, scaled graph, and measurement model.

## Checks Not Run

- No browser route smoke was run because the packet remains outside runtime.
- No full 300-image human review was run in this pass.
- No source-distance audit against Texas source materials was completed in this pass.

## Final Status

This packet is better preserved as a repairable candidate than deleted, but it is not production-ready. The correct next action is repair plus re-review, not promotion.
