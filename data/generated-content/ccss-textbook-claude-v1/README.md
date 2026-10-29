# ccss-textbook-claude-v1 — MAIS-authored interactive chapter openers

One interactive textbook lesson per California G6–G12 chapter topic
(`us-ca-math-<grade>-chapter-NN`), authored by Claude on 2026-09-02 to replace
the Codex text-only California textbooks (`us-ca-math-middle-school-textbooks-v2`
on the middle-school route and the `usCaliforniaHighSchoolLessonIllustrations`
repair package on the high-school review route).

- `lessons/<slug>.meta.json` — the per-lesson record: slug, CCSS grade, chapter
  `topicId`, title, the CCSS standards the lesson develops, summary, emoji,
  read-aloud narration, and three hand-checked chapter-check questions.
- `source.json` — the assembled snapshot the generators merge
  (`node scripts/build-ccss-claude-snapshot.mjs`, then
  `node scripts/generate-ccss-registry.mjs` and
  `node scripts/build-ccss-lesson-assignments.mjs`).
- Lesson bodies live in `components/lesson/ccss/lessons/<slug>.tsx`; each ships
  `components/lesson/ccss/lessons/<slug>.test.ts`, a `node:test` harness that
  checks its mathematical domains and source contracts (run by the
  `test:components` gate). These tests are one input to independent content and
  rendered-state review; they do not by themselves establish full acceptance.

The original authoring and verification notes are retained at the fixed
[PR225 source commit](https://github.com/HUDongpin/MAIS-MVP/tree/a2a1efacedbc1ebaca3c07c8cba44d433a1cb2e3/coordination/content-qa/2026-09-02-claude-textbook-replacement).
They describe the historical authoring process and do not establish acceptance
of later revisions. The separate
[2026-09-06 A18 review](https://github.com/HUDongpin/MAIS-MVP/blob/a2a1efacedbc1ebaca3c07c8cba44d433a1cb2e3/coordination/content-qa/2026-09-06-A18-pr225-chapter-check-review.json)
is limited to the exact 105 English chapter-check objects. Current integration
status is established by source-bound content, figure and regression reviews
and the separate native Promotion records.

The chapter-check questions are rendered on the textbook routes only. They are
not part of any live question-bank pack; promoting them into the bank goes
through the A21 → A18 → A23 content chain.
