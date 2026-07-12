# 2026-07-03 A11 Bug 167-202 Fix Verification

- Agent: A11, QA and release quality
- Source verification report: `coordination/reports/2026-07-03-A11-bug-167-202-real-bug-verification.md`
- Scope: the 20 rows previously verified as real/current from Bugs 167-202.
- Caveat: this is current dirty-root local verification, not clean release-slice proof. A22 should still release only from a clean reviewed slice.

## Fixed Rows

- Bug 168: logged-out `/student/roadmap` no longer enters the signed-in personalized current-grade path.
- Bugs 176-178: Teacher Scott assignment queue URLs now preserve active queue state for `grading`, legacy `returned`, and `correction-review`, including the no-class empty workspace path.
- Bugs 182-186 and 188-195: reported Grade 1 worked examples now render exact original MAIS SVG scenes instead of generic inferred visuals.
- Bugs 199-200: S4 `angle-geometry` lab separates close A/B labels at high slider values.
- Bug 202: visualization session save no longer waits for async side-effect hooks before returning the session.

## Verification

- `./node_modules/.bin/tsx --test tests/e2e/reported-bug-source-regressions.test.ts app/teacher/teacherNavigationPerformanceBoundary.test.ts components/lesson/workedExampleIllustrationMetadata.test.ts components/visualizations/configuredVisualizationLabRegressions.test.ts lib/server/userStoreStudentActivityPersistence.test.ts`
  - Result: 109/109 passed.
- `npm run type-check`
  - Result: passed.
- Local browser smoke against isolated dev server `http://127.0.0.1:3150` with `NEXT_DIST_DIR=.tmp/a11-bugfix-167-202-next`, SQLite `.tmp/a11-bugfix-167-202-db.sqlite`, demo accounts, and offline fixture tutor profile:
  - Bug 168: PASS, anonymous roadmap rendered public primary/secondary links and no personalized current-grade copy.
  - Bugs 176-178: PASS, `grading`, `returned`, and `correction-review` showed the correct active queue links and summaries.
  - Bugs 182-195: PASS, all 13 reported P1 lesson routes exposed their expected `data-worked-scene` exact scene ids.
  - Bugs 199-200: PASS, high-slider S4 angle labels rendered as `angle a label@58,196` and `angle b label@64,232` with no overlap.
  - Bug 202: PASS, visualization-session POST returned 200 in 1589 ms and the button reached `saved`.

## Notes

- Bug 187 remains classified as duplicate/inconsistent and was not treated as an independent fix target.
- Next temporarily added `.tmp/a11-bugfix-167-202-next/types/**/*.ts` to `tsconfig.json` during dev-server startup; that generated include was removed after verification.
- No files were staged, committed, branched, pushed, deleted, reset, or reverted.
