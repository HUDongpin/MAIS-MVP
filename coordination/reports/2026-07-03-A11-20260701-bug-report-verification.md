# A11 20260701 Deliverable Bug Report Verification

- Agent: A11 QA and release quality lead, consuming A22 local runtime evidence and A25 dirty-tree intake.
- Source report: `/Users/dongpinhu/Downloads/20260701_Deliverable Bug and QA Report.docx`.
- Verification date: 2026-07-03 Asia/Hong_Kong.
- Scope: current dirty root at `/Users/dongpinhu/Desktop/MAIS-MVP`, local dev server on `http://127.0.0.1:3037`.
- Caveat: production `https://mais.hk/about` did not reach `domcontentloaded` within 90s from this environment; production Student Jon `/personalized-learning` did not show "Teacher-assigned work" within 90s. Production was therefore only partially usable as corroborating evidence.

## Summary Matrix

| Bug | Reported area | Current finding | Evidence |
| --- | --- | --- | --- |
| 126 | Personalized Learning - Assignment loading | Real current issue. Local personalized page became ready, but clicking `All assignments` took 21.1s to show `My assignments`. Focused E2E also failed the assignments route within 15s and the personalized-link navigation within 5s. Production Student Jon did not show `Teacher-assigned work` within 90s. | Local browser verifier; A11 E2E failures in `tests/e2e/reported-bug-regressions.spec.ts`. |
| 127 | About - curriculum stat route | Real current route mismatch. The About top stat "China/HK SAR/US Curriculum" links to `/register`, not a curriculum list page. | Local browser verifier; source in `components/home/HeroSection.tsx`. |
| 128 | About - games stat route | Real for the top stat only. The top stat "Games (Adventure Island and Fishing Master)" links to `/practice`. Separate lower game showcase links are covered by a passing source test, but the reported top-stat route is still `/practice`. | Local browser verifier; passing `components/home/aboutGamePathShowcaseLinks.test.ts` only covers the lower showcase. |
| 129 | About - wrong button routing duplicate | Duplicate of Bug 128 in the report text. | DOCX extraction showed the same title/steps as Bug 128. |
| 130 | About - logged-out gamification route | Exact reported bug not reproduced. The top stat still links to `/dashboard`, but logged-out local navigation lands at `/login?next=%2Fdashboard`, not the student dashboard. This may still be a copy/CTA route decision, but not the reported auth bypass. | Local browser verifier. |
| 131 | About - question tallying | Not reproduced from current evidence; report text is internally inconsistent and appears copied from Bug 130. Current About uses `questions.length`, shows `24k Practice questions`, and source test confirms a five-question Mission Setup preview. Needs a clarified expected tally if still disputed. | Local browser verifier; passing `tests/e2e/reported-bug-source-regressions.test.ts`. |
| 132 | Student Lesson - lesson check button | Real current lesson-completion gap, but symptom differs from report. The P1 lesson route loads quickly, but no "Mark lesson complete" or "Lesson complete" button appears after 60s for Student Shirleen. Source still contains a completion button path, but this California elementary lesson renders without the completion checklist/button. | Focused local lesson probe; screenshot `/tmp/mais_bug_verify_20260701/bug132-lesson-focused.png`. |
| 133 | Practice Arena - Adventure Island re-routing | Not reproduced locally. `/student/practice/games/adventure-island` loaded in 291ms, and legacy `/practice/adventure-island` returned 308 to `/student/practice/games/adventure-island`. | Local browser verifier; `next.config.ts` redirect; source game hrefs. |
| 134 | Visualization Lab - P6 fraction bars clipping | Real visual risk. Fraction and equivalent-fraction overlay `rect` nodes have no `rx` and can show square ends over rounded containers. | Local browser verifier DOM inspection; screenshot `/tmp/mais_bug_verify_20260701/bug134-fraction-current.png`. |
| 135 | Visualization Lab - S6 bivariate text block | Not reproduced locally. DOM bounds check found no SVG overflow in the opened S6 bivariate lab. | Local browser verifier; screenshot `/tmp/mais_bug_verify_20260701/bug135-bivariate-current.png`. |
| 136 | Visualization Lab - S1 equation-balance clipping | Not reproduced locally. Left/right 9 state remained contained, and the source regression test confirms a pan-contained fit contract. | Local browser verifier; passing source regression; screenshot `/tmp/mais_bug_verify_20260701/bug136-equation-current.png`. |
| 137 | Visualization Lab - 3D module loading | Real/slow for the likely intended S4 Plane Vectors lab. The pasted report URL points to S6 bivariate and has no 3D widget, but the intended `pep-high-s4-plane-vectors` lab reached `data-viz-three-ready=true` after 27.5s, above the report's 10s threshold. | Local browser verifier; screenshot `/tmp/mais_bug_verify_20260701/bug137-plane-vectors-current.png`. |
| 138 | Visualization Lab - exp/log Quadratic min vector | Not reproduced locally. Current S4 exp/log function-family SVG exposes only x axis, y axis, main function, comparison function, and sample point markers; no minimum/maximum/vector marker was present. | Local browser verifier; screenshot `/tmp/mais_bug_verify_20260701/bug138-function-family-quadratic.png`. |
| 139 | Visualization Lab - exp/log Wave min vector | Not reproduced locally. Same current marker set as Bug 138. | Local browser verifier; screenshot `/tmp/mais_bug_verify_20260701/bug139-function-family-wave.png`. |
| 140 | Visualization Lab - exp/log Log growth max vector | Not reproduced locally. Same current marker set as Bug 138. | Local browser verifier; screenshot `/tmp/mais_bug_verify_20260701/bug140-function-family-log-growth.png`. |

## Checks Run

- `npm run release:dirty-map -- --reason "A11 verify 20260701 deliverable bug report"`: completed; A25 dirty-tree map generated.
- DOCX extraction via local ZIP/XML inspection: extracted 15 numbered bugs, severity section, URLs, and media references.
- Local browser verifier against `http://127.0.0.1:3037`: completed all rows.
- Focused lesson probe for Bug 132: completed; button absent after 60s.
- `npx tsx --test tests/e2e/reported-bug-source-regressions.test.ts components/home/aboutGamePathShowcaseLinks.test.ts app/practice/practiceArenaPageRegressions.test.ts`: 20 passed.
- `PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3037 PLAYWRIGHT_PORT=3037 PLAYWRIGHT_BROWSER_CHANNEL= npx playwright test tests/e2e/reported-bug-regressions.spec.ts --project=desktop-chrome --grep "student assignments route|personalized learning All assignments|authenticated login page|function model graph|complex plane" --reporter=line --timeout=90000`: 1 passed, 4 failed. Two failures directly support Bug 126; two visualization failures are harness/test-drift or modal-interference signals and are not counted as Bugs 138-140 reproduction.
- Production smoke against `https://mais.hk`: partial only; About timed out at 90s and personalized Teacher-assigned work was not visible within 90s.

## Suggested Routing

- A02/A12/A22: Bug 126 assignment loading/navigation latency.
- A01/A09: Bugs 127, 128, 130, 131 About top-stat route/copy decisions.
- A05/A08: Bug 132 lesson completion availability semantics for California elementary lessons.
- A06/A22: Bugs 134 and 137 visualization rendering/performance.
- A11: Keep Bugs 133, 135, 136, 138, 139, 140 in regression-watch status rather than active fixes unless new evidence appears.
