# data/ccss — authoritative CCSS Mathematics dataset

Copied verbatim from the CCSS-Math-Textbook app (`src/data/ccss/`, 2026-07-19)
as part of the textbook port (plan §2.5). This is the authoritative standards
registry for lesson surfaces (full standard text, grades → domains → clusters →
standards, bands, mathematical practices).

`data/ccssStandards.ts` (paraphrased, Math-Universe-specific) is unrelated and
stays for the Math Universe map; consolidation is a tracked follow-up.

Do not hand-edit: re-copy from upstream if the source dataset changes. Note the
`GradeId` type here is the CCSS one ("K","1".."8","HS") — alias it on import
(e.g. `CcssGradeId`) to avoid confusion with the MAIS `GradeId`.
