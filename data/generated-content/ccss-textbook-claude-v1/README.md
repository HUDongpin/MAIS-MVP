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
  enumerates the lesson's full control grid and recomputes every displayed claim
  independently (run by the `test:components` gate).

Verification record: every lesson passed three adversarial reviews
(mathematics across all control states, California CCSS-M alignment, UI/code
contract) and a repair loop before landing; see
`coordination/content-qa/2026-09-02-claude-textbook-replacement/`.

The chapter-check questions are rendered on the textbook routes only. They are
not part of any live question-bank pack; promoting them into the bank goes
through the A21 → A18 → A23 content chain.
