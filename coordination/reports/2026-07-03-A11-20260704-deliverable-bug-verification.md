# 2026-07-03 A11 20260704 Deliverable Bug Verification

- Agent: A11 QA and release quality lead.
- Source report: `/Users/dongpinhu/Downloads/20260704_Deliverable Bug and QA Report (1).docx`.
- Scope: verification only. No feature-code edits, Git operations, staging, commits, or secret handling.
- Repo context: dirty root on `main`; root used as read-only integration inventory for this QA pass.

## Executive Verdict

The DOCX contains six bug claims: four numbered rows and two unnumbered detailed rows. A11 classifies one as a current real bug, four as not reproduced/not current as written, and one as not reproduced with live-production uncertainty.

| Report item | A11 verdict | Verification summary | Owner routing |
| --- | --- | --- | --- |
| Bug 202 About logged-off progress | Real | Logged-out production `/about` exposes the static Personalized Practice Mission with both `Start` and `In progress`. Source confirms the homepage imports `PersonalizedPracticeMissionShowcase`, whose default first step is hard-coded active/in-progress. This is a logged-out visual/state-copy bug, not an API/auth bug. | A01/A09 |
| Bug 203 Personalized Learning loading animation | Not real as written | The student assignments loading state uses `animate-pulse` in source and production style inspection showed CSS animation `pulse` with a 2s duration. The bar does not translate across the track, but it is animated. Treat any desired moving loading bar as UX enhancement, not missing animation. | A02/A09 if UX change is requested |
| Bug 204 Primary roadmap P6 route-index label | Not current in source/regression evidence | Current source positions all route-index entries inside the panel, and the focused geometry regression passed. Production hydration checks were inconclusive, but the present source guardrail says P6 is no longer outside/crooked. | A03 if a fresh visual screenshot reproduces it |
| Bug 205 About/Curriculum Galaxy Primary roadmap P6 label | Duplicate / not current; evidence mismatch | This appears to duplicate Bug 204. The report evidence image does not show the roadmap condition, so A11 cannot validate it as a distinct bug. Current source/regression evidence says the route index fits. | A03 if new evidence is provided |
| Unnumbered Lessons database outage | Not reproduced as P0/current outage | Production direct lesson check reached a live California lesson page with HTTP 200 during this QA pass. Later authenticated browser probes were flaky/time-limited, so keep performance watch if needed, but the P0 "any lesson page outage" claim was not reproduced. | A05/A12/A22 only if fresh outage evidence appears |
| Unnumbered Visualization Lab clipping | Not reproduced; live route inconclusive | The exact P5 lab route was slow/inconclusive in production browser probing. Current source maps the requested lab to the equation-balance renderer, declares the pan-contained fit contract, and the visualization regression/diagnostic suite passed. A11 cannot confirm the clipping claim as current. | A06 if a fresh screenshot/video reproduces clipping |

## Focused Verification

- DOCX extraction/rendering: text, tables, and screenshots were inspected; six unique claims were identified.
- Fresh source regression command: `npx tsx --test tests/e2e/reported-bug-source-regressions.test.ts components/learning/subwayNetworkMapGeometry.test.ts` passed `20/20`.
- Fresh Visualization Lab diagnostic command: `npx tsx --test components/visualizations/configuredVisualizationLabRegressions.test.ts components/visualizations/visualizationDiagnostics.test.ts` passed `48/48`.
- Production probes were used for `/about`, `/student/assignments`, `/student/lessons/us`, and the exact visualization URL. The visualization live probe did not fully settle, so that item remains "not reproduced / inconclusive live" rather than "closed with live proof".

## Notes And Risks

- Bug 202 is the only item A11 would keep open immediately from this report.
- Bugs 204 and 205 should not be treated as two independent issues unless a new screenshot or video shows two different route-index failures.
- The Lessons item should be downgraded from P0 unless a fresh outage with timestamps and route evidence is produced.
- The Visualization item needs visual evidence if the owner wants A06 to reopen it, because the current source-level fit contract and diagnostics are green.
