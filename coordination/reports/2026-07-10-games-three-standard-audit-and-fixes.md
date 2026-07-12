# 2026-07-10 Fishing Master + Adventure Island: Three-Standard Audit and Fixes

## Scope

Systematic check of the two Practice Arena mini-games against three standards:

1. Obvious bugs
2. Question solvability (can the player always reach, read, and finish the question?)
3. Answer correctness (is grading and reward wiring correct?)

Files reviewed: `components/gamification/FishingGame.tsx`, `components/gamification/AdventureIslandGame.tsx`, `components/practice/PracticeQuestionCard.tsx`, `app/api/gamification/adventure-island/route.ts`, `app/api/gamification/fishing-game/complete/route.ts`, `app/api/attempts/route.ts`, `lib/server/answerMatching.ts`, `lib/server/userStore/gamificationGamePersistence.ts`, plus `tests/e2e/fishing-game.spec.ts` and `tests/e2e/adventure-island.spec.ts`.

## Verdicts

### Standard 3 — Answer correctness: PASS (both games, shared grading path)

- Both games grade via `PracticeQuestionCard` → POST `/api/attempts` → `questionAnswerMatches` (server-side). The grader normalizes NFKC, unicode minus/×/÷, TeX text/exponent wrappers, currency, %, °, mixed numbers, phrase fractions, and accepts numeric equivalence and cross-language option identity. 17/17 grading/persistence unit tests pass.
- Reward wiring: Fishing +1 coin per distinct correct catch; Adventure attack-defeat +2 coins and contact-protection — both verified server-side against real attempt rows (`verifiedTopicAdventureIslandQuestionCount`, `verifiedCorrectAttemptIds`).
- P3 note (not fixed here): the client submits zh-Hans-normalized option text produced by a 10-character replacement table. If a question has no `zhHans` variant and an option contains a replaced char, the submitted string matches no stored localization exactly. Narrow; recommend server-side Han normalization as follow-up.

### Standard 2 — Question solvability: PASS after one fix

- Question UI is fully solvable in-game: MC options, fill-in/short-answer with math soft keyboard + handwriting board, collision-avoiding diagram labels, image assets.
- FIXED (Fishing): the 120-second round clock kept running during a math challenge, so a challenge opened near the cutoff was force-closed mid-answer (question became unanswerable, catch wasted). The clock now runs only in `ready`/`casting` phases — a caught question always stays answerable without time pressure.

### Standard 1 — Obvious bugs: FAILURES found and fixed

Fishing Master:

- F1 (P1, the reported complaint): cannon inflexibility.
  - Aim arc was clamped to [-160°, -30°], leaving both bottom corners unreachable while fish can swim there (bounce world bounds cover the full 960×540 tank) — nets wasted on unhittable targets. Arc widened to [-178°, -2°] (near-horizontal both sides; full coverage of the tank above the seabed).
  - Hold-rotation was 70°/s (~1.9 s to sweep the arc). Raised to 160°/s; 5° tap nudge kept for fine keyboard aiming.
  - Aiming was locked during the entire 700 ms net flight and aim buttons disabled. Aiming (keyboard, hold, buttons, and pointer drag) is now allowed while `casting`, so the next shot can be lined up immediately; the in-flight net keeps its captured path. Firing stays one-net-at-a-time.
  - On-page instructions updated (EN/ZH) to teach drag-aiming and re-aim during flight.
- F2 (P1, silent reward loss): the completion API rejects a run when `coins !== correctCaughtQuestionIds.length` (distinct). The client incremented coins per correct answer even when the question bank cycled and re-served an already-banked question, so runs on small banks could be voided as `invalid-run`. Fixed: coins now derive from the distinct-correct set; the question picker skips already-correct questions; the run ends with settlement when every topic question has been solved.

Adventure Island:

- A1 (P1, soft-lock): the trophy handler paused the physics world and only `response.ok` unpaused into `cleared`. Every replay of an already-completed topic returns HTTP 409 `duplicate` — the UI explicitly invites replays — so replays always froze at the trophy (also any 4xx/network failure). Fixed: `duplicate` now lands on the cleared screen; real failures resume the world via a new `resume` scene control.
- A2 (P1, retry spam after failure): after a failed submit the player still stood on the trophy overlap, which would re-fire every physics step once resumed. Fixed: failed submits apply a 2.5 s trophy cooldown and a short knockback so retrying is a deliberate walk back in.
- A3 (P2, reward loss): `durationSeconds` was clamped to min 30 but not to the server max (20 min) — slow careful runs / idle tabs were voided as `invalid-run`. Fixed: clamped to [30, 1200].
- A4 (P2): the challenge question picker returned `questions[0]` forever after exhaustion, and repeated-correct answers let `defeatedEnemies` outrun the server-verified distinct-correct count (risk of `invalid-run` at the trophy). Fixed: fresh cycle on exhaustion, preferring questions not yet answered correctly.
- A5 (P3): Restart was clickable during `submitting`, racing the completion response. Fixed: disabled while submitting.
- A6 (P3, known S09 item, not fixed here): Traditional/Simplified mixing in game copy (e.g. simplified `探险岛` inside zh-Hant strings).

## Verification

- TypeScript Compiler API check on both components: 0 diagnostics.
- Unit: `lib/server/answerMatching.test.ts`, `components/gamification/adventureIslandGamePersistence.test.ts`, `components/practice/practiceAdventureGrades.test.ts` — 17/17 pass (tsx --test, unpiped exit 0).
- Live API chain against an isolated dev server (port 3210, isolated dist + sqlite), driving the exact payloads the fixed clients send:
  - register → 5 correct same-topic attempts → Adventure complete: 201 `awarded`.
  - Adventure replay: 409 `duplicate` in 958 ms (the case the client soft-lock fix maps to "cleared").
  - 5 post-Adventure attempts → Fishing complete with the NEW payload shape (`durationSeconds: 2` after the challenge-clock change, `coins` = distinct-correct count): 201 `awarded`, reward = coins × 3. Repeat POST: 409 `duplicate`.
  - Both game pages render HTTP 200.
- E2E (desktop-chrome, isolated app fixture) — ran 3× under abnormal machine conditions (loadavg 33-38 from a concurrent SENA `next build` + two sibling dev sessions; one run additionally hit ENOSPC at 97% disk):
  - `adventure-island.spec.ts` "uses Practice Arena topic evidence...": all product-path assertions through trophy POST passed in-browser (201 `awarded`, +35 XP, `adventure-island-clear` badge); the run then starved on a late unrelated `GET /api/rewards` (150 s test timeout) / ENOSPC on retry. Environmental.
  - `fishing-game.spec.ts` "Fishing Game renders...": all assertions through aiming (new arc visible: `data-cannon-angle` reached `-2`), catch → challenge → +1 coin, miss handling, and settlement-delayed UI (Retry button) passed in-browser; the final `submitted` assertion failed because the spec delays the settlement POST 6.5 s and cold route compile measured 5.3 s under load → total exceeded the client's 12 s abort budget, so the product correctly aborted and offered Retry. Environmental; arithmetic passes only when cold compiles take ≲5 s (idle machine, as in the June 12 green run).
  - Action: rerun both specs on a quiet machine for the green record; no product defect indicated. S11 note: the settlement-delay scenario has a structural margin of (12 s − 6.5 s) for first-compile latency on dev servers — consider pre-building or reducing the injected delay to 5 s.
- Browser preview note: this session could not attach the preview harness (another session's dev server holds port 3000 and preview_start refuses the folder); browser-level proof above comes from the Playwright runs (real Chromium) plus the live-server API chain.

## Files changed

- `components/gamification/FishingGame.tsx`
- `components/gamification/AdventureIslandGame.tsx`
- `.claude/launch.json` (added `mais-dev-games-qa` isolated QA server config)
- `coordination/reports/2026-07-10-games-three-standard-audit-and-fixes.md`

## Notes

- No git operations were performed. No secrets read or written.
- The reward APIs were not modified; all fixes are client-side and keep the server anti-abuse contracts intact.
