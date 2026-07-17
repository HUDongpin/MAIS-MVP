# S23 Promotion Decision - us-ca-math-grade1-h-l-micro-lessons-v1

Decision: promoted to S05 live lesson integration and published to production through an S22 clean release slice.

Reason: S18 approved the 12 Grade 1 micro-lessons for integration review, and S05 integrated them into California lesson topics and production lesson seeds. Targeted TypeScript/lesson tests passed locally.

Production publication evidence:

- S11 route regression covered one addition micro-lesson and one subtraction micro-lesson.
- S22 release slice used `.tmp/vercel-staging/ca-grade1-micro-lessons-clean-slice-20260619T131407Z`.
- S22 runtime build passed with 141 pages.
- Vercel production deployment ID: `dpl_AVqXfXQEAsqZU27KDbRQ2PBCeMNN`.
- Final Vercel inspect status: Ready.
- Production aliases include `https://www.mais.hk` and `https://mais.hk`.

Residual note:

- The full staging `npm run type-check` is not a valid clean-slice gate because the slice intentionally excludes coordination/scripts test-only dependencies while retaining some historical `lib/*QuestionBank.test.ts` files. The production runtime gate for this slice is `npm run build`, which passed.
