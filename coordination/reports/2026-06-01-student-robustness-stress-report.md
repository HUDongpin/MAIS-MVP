# MAIS-MVP Student Robustness Stress Report

- Date: 2026-06-01 execution window, with SimpleTex artifact generated after local midnight
- Session: S11
- Scope: Student-facing local robustness, Playwright workflows, backend/API repeat pressure, live AI Tutor, adaptive LLM, and SimpleTex/OCR readiness
- Deliverable type: Defect report and reproduction notes only; no feature code changed

## Executive Summary

本轮学生端暴力/压力测试发现多个企业级 robustness 风险。最终 `npm run build` 和 `npm run type-check` 均通过，说明当前代码可以在安静窗口完成生产构建；桌面全量 suite 在清理后成功启动并完成 50 个用例，其中 23 passed、19 failed、3 skipped、5 did not run，移动端和 backend repeat suite 也暴露出稳定复现的学生端/平台缺陷。

Highest-risk findings:

1. P1 AI Tutor live quality gate is red: status endpoint is live DeepSeek-v4-pro, but role/language matrix success was only 9/81 (11.1%), with 72 fallback responses.
2. P1 backend/API repeat pressure is red across 5/5 repeats for curriculum publisher switching, login grade switching, lesson completion state, and admin storage health authorization.
3. P1/P2 student dashboard analytics contract is red on both desktop and mobile: student smoke and frontend tests expect `Personalized learning analytics report`, but dashboard does not render it.
4. P1 lesson/adaptive completion surfaces are red: backend repeat says lesson status remains `in-progress`, desktop adaptive summary cannot reach `Mastery: 85%|100%`, and full lesson sweep timed out after 900s.
5. P2 shell/home flows have accessibility and responsive test failures on desktop and mobile: duplicate `MAIS` heading match, missing expected homepage links/toggles, disabled grade controls, and role-default mismatch.
6. P2 Practice Arena free-selection path failed on desktop and mobile after answer/filter transitions, while locked/adaptive pager and handwriting UI paths passed.
7. P2 games/visualizations need follow-up: Fishing Master duplicate heading, Adventure Island legacy redirect contract, and Visualization Lab all-labs expansion failed.
8. SimpleTex/OCR live saturation did not run any provider calls because the safety preflight detected a concurrent local Playwright process.

## Commands And Results

| Gate | Command | Result |
| --- | --- | --- |
| Process preflight | `ps -axo ... rg 'MAIS-MVP|next dev|playwright|npm run ...'` | Found concurrent Next/Playwright/build activity before provider gates; later still found `/private/tmp/mais-viz-stress` Playwright/Next process. |
| TypeScript preflight, first run | `npm run type-check` | Failed because `.next/types/**/*.ts` was partially missing during active build churn. |
| TypeScript final | `npm run type-check` | Passed. |
| Build, first run | `npm run build` | Failed after static generation: missing `.next/static/.../_ssgManifest.js`. |
| Build, final retry | `npm run build` | Passed, 88 static pages generated. |
| Desktop student stress, first attempt | `PLAYWRIGHT_PORT=3020 npx playwright test ... --project=desktop-chrome` | Initially failed before tests; webServer could not start due missing `../chunks/ssr/[turbopack]_runtime.js`. Treated as stale `.next` / concurrent-build QA infrastructure risk because final clean build passed. |
| Desktop student stress, quiet rerun | Same approved desktop command on port 3020 | Completed 50 tests in 28.4m: 23 passed, 19 failed, 3 skipped, 5 did not run. Failure traces retained under `test-results/`. |
| Mobile subset | `PLAYWRIGHT_PORT=3021 npx playwright test ... --project=mobile-chrome` | 15 passed, 10 failed, 4 skipped. |
| Backend/API repeat | `PLAYWRIGHT_PORT=3022 npx playwright test tests/e2e/backend-api.spec.ts --project=desktop-chrome --repeat-each=5` | 20 failed / 20 run; same 4 failures repeated 5 times. |
| AI Tutor live text | `AI_TUTOR_LIVE_TEXT_QA=1 ... AI_TUTOR_LIVE_TEXT_SOAK_REQUESTS=180 ... ai-tutor-live-text.spec.ts` | Status passed; matrix failed; frontend live smoke and 180-request soak skipped by acceptance gate. |
| Adaptive LLM live canary | `ADAPTIVE_LLM_LIVE_SMOKE=1 ... adaptive-llm-smoke.spec.ts -g "@live"` | Failed by 30s timeout. |
| SimpleTex dry-run | `npm run smoke:simpletex:local -- --dry-run` | Env ready, but `readyToRun=false` due concurrent Playwright process. |
| SimpleTex saturation | `node tests/e2e/simpletex-saturation-harness.mjs ...` | Blocked before live OCR calls; report written to `coordination/reports/2026-06-01-simpletex-student-saturation.md`. |

## Defect Candidates

| ID | Severity | Area | Finding | Evidence / Repro | Owner |
| --- | --- | --- | --- | --- | --- |
| STU-P1-01 | P1 | AI Tutor live | Live provider is configured, but the role/language matrix falls back for most responses. Success rate 9/81, fallback responses 72/81, p95 2310 ms, sensitive leaks 0. | Run the AI Tutor live command above. Summary: `.tmp/ai-tutor-live-text/live-text-summary.json`. | S07 + S19 |
| STU-P1-02 | P1 | Backend auth/curriculum | Mainland demo student login with requested HJB profile still returns `curriculumProfile.publisher = MAINLAND_PEP`. | `backend-api.spec.ts:334`, repeated 5/5. | S12 + S03/S18 |
| STU-P1-03 | P1 | Backend auth/grade | Registered primary student login requesting P4 returns user/settings grade P3. | `backend-api.spec.ts:363`, expected P4, got P3, repeated 5/5. | S12 + S08 |
| STU-P1-04 | P1 | Lesson/adaptive evidence | Completing lesson via API leaves lesson status `in-progress` instead of `completed`, blocking adaptive evidence expectations. | `backend-api.spec.ts:646`, repeated 5/5. | S05 + S12 + S15 |
| STU-P1-05 | P1 | Admin/storage authorization | Promoted admin test context still receives 403 from `/api/admin/storage/health`. | `backend-api.spec.ts:726`, line 1022, repeated 5/5. | S12 |
| STU-P1-06 | P1 | Student dashboard contract | Student smoke/frontend workflows fail because dashboard no longer renders `Personalized learning analytics report` or matching export affordance. | Desktop and mobile `student-frontend.spec.ts:49` and `student-smoke.spec.ts:47` failed on missing text. | S02 + S11 |
| STU-P1-07 | P1 | Adaptive LLM live | Live adaptive judgement canary times out at 30s before completion. | `adaptive-llm-smoke.spec.ts:773`; current retained artifact: `test-results/adaptive-llm-smoke-live-De-fa013-ptive-judgement-canary-live-desktop-chrome/trace.zip`. | S15 + S07/S19 |
| STU-P1-08 | P1 | Lesson all-slug robustness | Full lesson sweep did not finish within its 900s timeout; browser/context closed while on a Mainland PEP S1 rational-numbers lesson. This prevents enterprise confidence for all valid `/lesson/[slug]` routes. | Desktop `lesson-all.spec.ts:917`, retained context: `test-results/lesson-all-lesson-page-all-5a895-ation-bugs-for-every-lesson-desktop-chrome/error-context.md`. | S05 + S12/S10 |
| STU-P1-09 | P1 | Lesson completion to adaptive/practice state | After marking a lesson complete, frontend still does not show `Mastery: 85%|100%`, matching the backend repeat symptom where lesson status stays `in-progress`. | Desktop `student-frontend.spec.ts:169`; backend `backend-api.spec.ts:646`, repeated 5/5. | S05 + S12 + S15 |
| STU-P2-01 | P2 | Shell accessibility/testability | `getByRole('heading', { name: /MAIS/i })` resolves to both hero H1 and `TRUST-MAIS adaptive engine` H2, causing strict-mode failure. | Desktop and mobile `app-shell-auth.spec.ts:14`; desktop `student-button-dropdown-matrix.spec.ts:292` also stopped on this. | S01 + S09 |
| STU-P2-02 | P2 | Auth/grade UX | Test trying to select S2 before login times out because S2 radio is disabled. This may be intended lock behavior or a stale QA contract; needs product decision. | Desktop and mobile `app-shell-auth.spec.ts:74`. | S01/S08 + S11 |
| STU-P2-03 | P2 | Registration role default | `/register` does not default to parent role when parent registration test expects it; parent radio remains `aria-checked=false`. | Desktop and mobile `app-shell-auth.spec.ts:100`. | S01/S14 + S11 |
| STU-P2-04 | P2 | Homepage links | Broad homepage functional test cannot find/click expected `Explore Visualizations` link inside the `Ready for class or self-study` section. | Desktop and mobile `home-functional.spec.ts:133`. | S01 |
| STU-P2-05 | P2 | Logged-in homepage controls | Logged-in student homepage cannot find expected `Secondary` toggle, blocking locked-grade check. | Desktop and mobile `home-functional.spec.ts:360`. | S01/S02 |
| STU-P2-06 | P2 | Practice free selection | Free-selection mode fails to show `Question 1 of ...` after filter/answer transition; desktop snapshot shows only 4 matching questions after `Challenge + Short answer`, so the expected 5-question free round cannot start. Locked/adaptive pager and handwriting paths passed. | Desktop and mobile `practice-pager.spec.ts:320`; most other practice-pager tests passed. | S04 |
| STU-P2-07 | P2 | Visualization Lab all-labs expansion | Desktop Visualization Lab stress, overlap, and value sweeps cannot reveal the final capstone card `lab-example-capstone-hk-mainland-crosswalk-explorer` after clicking the all-labs/curriculum expansion controls. | Desktop `visualization-lab-stress.spec.ts:34`, `visualization-overlap.spec.ts:67`, `visualization-values.spec.ts:6`; retained contexts under `test-results/visualization-*`. Mobile visualization checks earlier hit `ERR_CONNECTION_REFUSED` after the server stopped. | S06 + S10 |
| STU-P2-08 | P2 | Adventure Island legacy route | Legacy `/practice/super-platformer-like` returns 200 instead of redirecting with 307/308 to `/practice/adventure-island`. | Desktop `adventure-island.spec.ts:468`, line 486. | S20 + S12 |
| STU-P2-09 | P2 | Fishing Game accessibility/testability | Fishing Master renders two headings with the same accessible name, causing strict-mode ambiguity and blocking the coin-award completion test. | Desktop `fishing-game.spec.ts:378`, retained context: `test-results/fishing-game-Practice-Aren-20777-letion-awards-coins-x3-once-desktop-chrome/error-context.md`. | S20 + S09 |
| STU-P2-10 | P2 | Adaptive learning route contract | `/adaptive-learning` renders the Knowledge Galaxy, but console audit expects a `Progress` heading for the adaptive learning route. This may be a stale QA contract or a route-copy regression. | Desktop `console-readonly-audit.spec.ts:60`. | S02 + S15 + S11 |
| STU-P2-11 | P2 | Practice lesson topic navigation | Practice top navigation loses the current lesson topic expectation; the page renders the adaptive mission but not the expected `Adaptive practice set` section. | Desktop `student-frontend.spec.ts:209`; nav link shows `/practice` while the test is validating lesson-topic continuity. | S04 + S01 |
| STU-P2-12 | P2 | Teacher/student class sync wording | Cross-role assignment row renders `Not started` with a space; the test expects `/not-started/i`. Functional row exists, so classify as copy/QA contract mismatch until product confirms expected wording. | Desktop `teacher-student-cross-role.spec.ts:13`. | S13 + S11 |
| STU-QA-01 | QA infra | Playwright artifact retention | Later Playwright commands cleaned prior mobile/backend `test-results`, so their trace artifacts were not retained after subsequent provider runs. Desktop rerun artifacts are currently retained, but future stress runs should copy `test-results` after each gate. | Current retained artifacts include desktop failure traces and the adaptive LLM failure trace; mobile/backend details are preserved from command output. | S11/S10 |
| STU-QA-02 | QA infra | Stale/concurrent `.next` | Initial `type-check`, first build, and desktop suite failed under concurrent build/dev/test activity. Final build and type-check passed after cleanup, so this is a stress-window isolation risk, not a deterministic compile failure. | First build: `_ssgManifest.js` ENOENT; desktop suite: missing `[turbopack]_runtime.js`; final build passed. | S10/S11 |
| STU-QA-03 | OCR QA readiness | SimpleTex saturation blocked | SimpleTex credentials are present in redacted preflight, but live saturation was blocked by concurrent Playwright process; 0 provider calls executed. | `coordination/reports/2026-06-01-simpletex-student-saturation.md`, raw JSON `/tmp/mais-simpletex-student-saturation-2026-06-01.json`. | S11 + S19 |

## Positive Coverage

- Final `npm run build` passed.
- Final `npm run type-check` passed.
- Desktop student stress rerun completed and retained failure traces instead of stopping at webServer startup.
- Desktop 23/50 tests passed, including registered student login, teacher login route, Lesson AI selection for selected text/questions, guest Nova selection path, gamification core isolation, rewards redemption/fulfillment, Practice Arena answer feedback plus Mistake Book actions, and many handwriting UI checks.
- Mobile Practice Arena locked/adaptive pager passed.
- Mobile math soft keyboard passed.
- Mobile handwriting board mocked conversion and failure handling passed.
- Mobile practice answer feedback plus Mistake Book actions passed.
- AI Tutor live status endpoint confirmed configured live DeepSeek-v4-pro.
- AI Tutor matrix had 0 sensitive leaks and 0 infrastructure failures, despite failing quality mode due fallbacks.
- SimpleTex preflight confirmed UAT mode present, APP credentials empty, expected API URL, and LLM fallback disabled.

## Recommended Next Steps

1. S07/S19: diagnose why live AI Tutor returns `provider-fallback` / `context-summary-fallback` for 72/81 role/language cases despite live status being green. Do not run the 180-request soak until the matrix passes.
2. S12: triage backend repeat failures first; they are deterministic across 5 repeats and affect auth/curriculum, grade/session, storage admin, and classroom-adjacent API readiness.
3. S02/S11: decide whether the dashboard analytics expectation is stale or the dashboard lost a required student analytics surface.
4. S01/S09: tighten homepage heading accessible names and mobile homepage controls so route-level mobile tests are unambiguous.
5. S04: reproduce the mobile Practice Arena free-selection filter/auto-advance failure in isolation.
6. S05/S12/S15: fix or re-baseline lesson completion state before adaptive/practice summaries rely on it.
7. S05/S10: split or optimize `lesson-all.spec.ts`; a 900s timeout during an all-slug sweep is not a usable enterprise gate.
8. S06: fix Visualization Lab all-labs/capstone visibility, then rerun the stress/value/overlap trio.
9. S20: fix duplicate Fishing Master accessible headings and confirm legacy Adventure Island redirect behavior.
10. S11/S10: add a report-run wrapper that copies `test-results`/`output/playwright-report` after each gate into a dated artifact folder before the next Playwright command overwrites them.
11. S19/S11: rerun SimpleTex saturation only after the local process preflight is quiet; current run intentionally spent no OCR quota.

## Artifact Notes

- Retained AI Tutor live summary: `.tmp/ai-tutor-live-text/live-text-summary.json`.
- Retained desktop Playwright failure traces and screenshots: `test-results/*desktop-chrome/`.
- Retained adaptive LLM timeout trace: `test-results/adaptive-llm-smoke-live-De-fa013-ptive-judgement-canary-live-desktop-chrome/trace.zip`.
- Retained SimpleTex blocked report: `coordination/reports/2026-06-01-simpletex-student-saturation.md`.
- `lesson-all.spec.ts` did not leave the expected `output/playwright/lesson-qa/lesson-qa-results-desktop-chrome.json` because the test hit its 900s timeout; its retained error context is under `test-results/lesson-all-.../error-context.md`.
- Mobile/backend artifacts were generated during their runs but later Playwright invocations cleaned those earlier `test-results`; the failure details above are copied from command output.
