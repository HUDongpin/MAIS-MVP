# A23 session privacy UX Promotion baseline re-affirmation

## Authorization and scope

- Owner authorization: on 2026-08-28 the owner explicitly authorized A23
  baseline re-affirmation and continuation through deployment for PR #218.
- Target baseline commit:
  `00929b2bdf88368dd838d7ff11bda13d3707e0e1`.
- Source Manifest: the tracked workflow-selected Manifest current at the target
  commit, whose target baseline is
  `e81f6b53515cf97dcd5351d0ff7add4224d7eab2`.
- Append-only revision root:
  `coordination/integration/pilots/us-ca-math-rag-v2-g6-ratios-v2/attempt-007/reaffirmations/auth-private-no-store-20260827/reaffirmations/k-g5-cot-leak-20260827/reaffirmations/app-storage-schema-20260827/reaffirmations/runtime-loader-policy-20260827/reaffirmations/legacy-readiness-marker-20260827/reaffirmations/runtime-loader-policy-20260827/reaffirmations/legacy-compat-readiness-v2-20260827/reaffirmations/runtime-loader-policy-v2-20260827/reaffirmations/parent-instance-proof-inline-20260827/reaffirmations/production-schema-diagnostic-20260827/reaffirmations/reviewed-main-runtime-graph-20260827/reaffirmations/production-schema-diagnostic-v2-tooling-20260827/reaffirmations/c0-i18n-content-legacy-byte-review-20260828/reaffirmations/session-privacy-ux-20260828`.
- Re-affirming evidence-record roles: A21, A18, A23, A04, A05, A11, A22,
  A24, and A25. These are nine bound evidence records produced sequentially
  in one owner-authorized integration session, not nine independent reviewers.

## Disposition

This is a baseline-only re-affirmation.

- Candidate package bytes and candidate semantics are unchanged.
- Candidate source commit and checker release are unchanged.
- The reviewed protected runtime delta is limited to
  `components/providers/AppProviders.tsx`, implementing the owner-requested
  session privacy UX repair.
- The protected test-only delta contains
  `components/providers/appProvidersSessionIsolation.test.ts` plus the
  pre-existing main-line `lib/server/userStoreNovaPostgresIntegration.test.ts`.
- Repository-native dry-run inspection reports the canonical runtime policy is
  retained and legacy candidate bytes are retained.
- A new candidate/attempt is therefore inapplicable because candidate bytes,
  candidate semantics, source, and checker are unchanged.
- Evidence-only correction is inapplicable because the prior evidence is not
  malformed; its target baseline has become historical after reviewed runtime
  drift.
- The prior Receipt remains immutable historical evidence. No frozen Manifest,
  Receipt, Closure, Registry, evidence record, or hash will be edited in place.

## Review evidence

The target commit has the following exact local evidence:

- type-check passed;
- provider contracts 11/11 passed;
- parent tooling 76/76 and runtime 403/403 passed;
- release governance 91 passed with 11 explicit skips;
- focused foreground/identity Playwright 3/3 passed;
- Student Shirleen desktop/mobile login 2/2 passed;
- production build generated 202/202 static pages;
- diff check passed and `next-env.d.ts` has zero drift.

Fresh PR CI for the target commit separately proved snapshot, visualization,
PostgreSQL integration, teacher-notice outbox, and Resend webhook jobs before
the A23 revision was prepared. The first Promotion Shadow run correctly failed
closed with `V2_TARGET_BASELINE_DRIFT`, identifying one runtime path. Those
results are historical target evidence; the revision must obtain new exact-head
CI and Promotion evidence after all append-only phases are committed.

## Non-live boundary

- `liveAllowed=false` remains mandatory for every revision Receipt.
- This re-affirmation does not change or promote candidate content, configure a
  provider, access credentials, mutate a database, or deploy anything.
- Shadow rollback covers only runner-owned temporary output.
- Application deployment and same-SHA production verification remain separate
  A22/A25 release operations after the code PR and all required checks pass.
