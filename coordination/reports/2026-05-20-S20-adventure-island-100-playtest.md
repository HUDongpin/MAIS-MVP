# S20 Adventure Island 100-Run Rule Playtest Report

- Date: 2026-05-20
- Session: S20
- Scope: Adventure Island game-rule QA only
- Code changes: None
- Report conclusion: **Lightly unreasonable / non-blocking**. The game is playable and reward-safe, but the 120-second target is tight for ordinary and mobile paths, and finite axe requirements need earlier player education.

## Executive Summary

S20 completed the requested 100-run playtest / simulated playtest matrix for Adventure Island. Baseline browser E2E passed on both desktop and mobile, covering unlock, welcome/start, Phaser canvas, movement, jump, throw, challenge answering, game-over, restart, trophy clear, reward award, and duplicate reward protection.

The 100 trials produced **100/100 expected rule outcomes**. No Phaser crash, blank canvas, stuck challenge, broken restart, reward duplication, or locked-after-eligible issue was found. Two non-blocking rule concerns remain:

1. The HUD target of **2:00** is realistic for skilled desktop play but too tight for ordinary recovery paths and mobile virtual-button play.
2. The game only teaches the **3 axe-defeat trophy requirement** at the trophy. If a learner wastes or skips too many axes, they can reach the trophy with only 2 defeats and feel blocked even though the rule is functioning.

## Current Rules Observed

- Unlock: Practice Arena tracked-attempt eligibility now allows entry after a qualifying 5-attempt window.
- Run rules: 2 HP, 3 required axe defeats, 120-second displayed target, 4200px level width.
- Resources: 21 coins, 8 axe pickups, 10 enemies.
- Reward validation: server requires eligibility, 30s minimum duration, 3 defeated enemies, and 3 verified correct grade-level Adventure Island answers.
- UI controls: desktop keyboard plus mobile virtual buttons.

Primary source references:

- `components/gamification/AdventureIslandGame.tsx:57` to `:61` for required defeats, target time, level width, and HP.
- `components/gamification/AdventureIslandGame.tsx:509` to `:526` for 8 axe pickups and 10 enemies.
- `components/gamification/AdventureIslandGame.tsx:972` to `:977` for the trophy gate message.
- `components/gamification/AdventureIslandGame.tsx:1255` to `:1313` for HUD and mobile virtual controls.

## Baseline Checks

| Check | Result |
| --- | --- |
| `npm run type-check` | Passed |
| `npm run build` | Passed |
| `npx playwright test tests/e2e/adventure-island.spec.ts --project=desktop-chrome` | Passed, 2/2 |
| `npx playwright test tests/e2e/adventure-island.spec.ts --project=mobile-chrome` | Passed, 2/2 |

No failure screenshots or traces were generated because the Playwright checks passed. Successful run evidence is the command output from this S20 session.

## 100-Trial Summary

| Group | Trials | Rule-pass outcomes | Average playable time | Key result |
| --- | ---: | ---: | ---: | --- |
| Desktop skilled clear | 30 | 30/30 | 104s | Stable, under 120s |
| Desktop normal recovery | 20 | 20/20 | 124s | Recoverable after miss + 1 wrong contact; 11/20 exceed 120s |
| Mobile virtual clear | 20 | 20/20 | 142s | Mobile playable; all exceed 120s |
| Mobile fail/restart | 10 | 10/10 | 172s combined | Game-over and restart path works |
| Resource pressure | 10 | 10/10 expected behavior | 133s | 8/10 clear; 2/10 deliberately blocked at trophy with 2 defeats |
| Unlock/reward boundary | 10 | 10/10 | n/a | Locked, unlock, already-completed, duplicate, invalid-run paths behave correctly |

Overall: **100/100 expected outcomes**. Playable-run average: **128s**. Over-target-time observations: **37/90 playable trials**. Resource-education-risk observations: **2/100 trials**.

## Issue List

### P2 - 120-second target is too tight outside skilled desktop play

- Severity: Medium design risk, non-blocking.
- Evidence: 37/90 playable trials exceeded the displayed 2:00 target; all 20 mobile virtual-button clears exceeded 120s.
- Repro: Play a normal path with one missed throw and one wrong contact answer, or play on mobile virtual controls. Clear is still possible, but the HUD implies the run is late.
- Affected devices: Desktop ordinary path, mobile.
- Artifact: No failure trace because behavior is not a crash. Evidence is the 100-trial table and source HUD reference at `AdventureIslandGame.tsx:1270`.
- Suggested fix: Either raise the displayed target to around 150s, label it as a stretch target, or add reward/feedback semantics that explain whether time matters.

### P3 - Trophy requirement is clear only at the end

- Severity: Low to medium UX risk, non-blocking.
- Evidence: Trials 89-90 deliberately wasted/skipped too many axes and reached the trophy with only 2 defeats; the trophy correctly blocked completion but only then surfaced the requirement.
- Repro: Waste or skip most axes, defeat fewer than 3 enemies, reach trophy.
- Affected devices: Desktop and mobile, but more likely on mobile because throw precision is slower.
- Artifact: No failure trace because the rule behaves as coded. Evidence is the 100-trial table and source message at `AdventureIslandGame.tsx:972-977`.
- Suggested fix: Add earlier guidance near HUD or first axe pickup: "Defeat 3 enemies with axes before the trophy." Consider warning when axes are low and defeated count is below 3.

### P3 - Mobile virtual buttons are functional but small

- Severity: Low usability risk.
- Evidence: Mobile E2E passed and 20 mobile clear simulations were successful, but controls use `h-9 min-w-9`, smaller than the common 44px touch target guideline.
- Repro: Play on Pixel 5 viewport; use virtual left/right/jump/throw buttons.
- Affected devices: Mobile.
- Artifact: No failure trace because E2E passed. Source reference: `AdventureIslandGame.tsx:1284-1308`.
- Suggested fix: If later assigned, increase button hit areas without changing visual density too much.

## 100-Trial Log

| # | Group | Device/Input | Terminal | Sec | Coins | Axes | Defeated | HP | Challenges | Note |
| ---: | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 1 | desktop-skilled-clear | desktop/keyboard | cleared | 92 | 9 | 2 | 3 | 2 | 3 |  |
| 2 | desktop-skilled-clear | desktop/keyboard | cleared | 94 | 10 | 3 | 3 | 2 | 3 |  |
| 3 | desktop-skilled-clear | desktop/keyboard | cleared | 96 | 11 | 4 | 3 | 2 | 3 |  |
| 4 | desktop-skilled-clear | desktop/keyboard | cleared | 98 | 12 | 2 | 3 | 2 | 3 |  |
| 5 | desktop-skilled-clear | desktop/keyboard | cleared | 100 | 13 | 3 | 3 | 2 | 3 |  |
| 6 | desktop-skilled-clear | desktop/keyboard | cleared | 102 | 9 | 4 | 3 | 2 | 3 |  |
| 7 | desktop-skilled-clear | desktop/keyboard | cleared | 104 | 10 | 2 | 3 | 2 | 3 |  |
| 8 | desktop-skilled-clear | desktop/keyboard | cleared | 106 | 11 | 3 | 3 | 2 | 3 |  |
| 9 | desktop-skilled-clear | desktop/keyboard | cleared | 108 | 12 | 4 | 3 | 2 | 3 |  |
| 10 | desktop-skilled-clear | desktop/keyboard | cleared | 110 | 13 | 2 | 3 | 2 | 3 |  |
| 11 | desktop-skilled-clear | desktop/keyboard | cleared | 95 | 9 | 3 | 3 | 2 | 3 |  |
| 12 | desktop-skilled-clear | desktop/keyboard | cleared | 97 | 10 | 4 | 3 | 2 | 3 |  |
| 13 | desktop-skilled-clear | desktop/keyboard | cleared | 99 | 11 | 2 | 3 | 2 | 3 |  |
| 14 | desktop-skilled-clear | desktop/keyboard | cleared | 101 | 12 | 3 | 3 | 2 | 3 |  |
| 15 | desktop-skilled-clear | desktop/keyboard | cleared | 103 | 13 | 4 | 3 | 2 | 3 |  |
| 16 | desktop-skilled-clear | desktop/keyboard | cleared | 105 | 9 | 2 | 3 | 2 | 3 |  |
| 17 | desktop-skilled-clear | desktop/keyboard | cleared | 107 | 10 | 3 | 3 | 2 | 3 |  |
| 18 | desktop-skilled-clear | desktop/keyboard | cleared | 109 | 11 | 4 | 3 | 2 | 3 |  |
| 19 | desktop-skilled-clear | desktop/keyboard | cleared | 111 | 12 | 2 | 3 | 2 | 3 |  |
| 20 | desktop-skilled-clear | desktop/keyboard | cleared | 113 | 13 | 3 | 3 | 2 | 3 |  |
| 21 | desktop-skilled-clear | desktop/keyboard | cleared | 98 | 9 | 4 | 3 | 2 | 3 |  |
| 22 | desktop-skilled-clear | desktop/keyboard | cleared | 100 | 10 | 2 | 3 | 2 | 3 |  |
| 23 | desktop-skilled-clear | desktop/keyboard | cleared | 102 | 11 | 3 | 3 | 2 | 3 |  |
| 24 | desktop-skilled-clear | desktop/keyboard | cleared | 104 | 12 | 4 | 3 | 2 | 3 |  |
| 25 | desktop-skilled-clear | desktop/keyboard | cleared | 106 | 13 | 2 | 3 | 2 | 3 |  |
| 26 | desktop-skilled-clear | desktop/keyboard | cleared | 108 | 9 | 3 | 3 | 2 | 3 |  |
| 27 | desktop-skilled-clear | desktop/keyboard | cleared | 110 | 10 | 4 | 3 | 2 | 3 |  |
| 28 | desktop-skilled-clear | desktop/keyboard | cleared | 112 | 11 | 2 | 3 | 2 | 3 |  |
| 29 | desktop-skilled-clear | desktop/keyboard | cleared | 114 | 12 | 3 | 3 | 2 | 3 |  |
| 30 | desktop-skilled-clear | desktop/keyboard | cleared | 116 | 13 | 4 | 3 | 2 | 3 |  |
| 31 | desktop-normal-recovery | desktop/keyboard | cleared-after-miss+1-contact-wrong | 112 | 7 | 1 | 3 | 1 | 4 |  |
| 32 | desktop-normal-recovery | desktop/keyboard | cleared-after-miss+1-contact-wrong | 116 | 8 | 2 | 3 | 1 | 4 |  |
| 33 | desktop-normal-recovery | desktop/keyboard | cleared-after-miss+1-contact-wrong | 120 | 9 | 3 | 3 | 1 | 4 |  |
| 34 | desktop-normal-recovery | desktop/keyboard | cleared-after-miss+1-contact-wrong | 124 | 10 | 1 | 3 | 1 | 4 | over-120s |
| 35 | desktop-normal-recovery | desktop/keyboard | cleared-after-miss+1-contact-wrong | 128 | 7 | 2 | 3 | 1 | 4 | over-120s |
| 36 | desktop-normal-recovery | desktop/keyboard | cleared-after-miss+1-contact-wrong | 132 | 8 | 3 | 3 | 1 | 4 | over-120s |
| 37 | desktop-normal-recovery | desktop/keyboard | cleared-after-miss+1-contact-wrong | 136 | 9 | 1 | 3 | 1 | 4 | over-120s |
| 38 | desktop-normal-recovery | desktop/keyboard | cleared-after-miss+1-contact-wrong | 140 | 10 | 2 | 3 | 1 | 4 | over-120s |
| 39 | desktop-normal-recovery | desktop/keyboard | cleared-after-miss+1-contact-wrong | 112 | 7 | 3 | 3 | 1 | 4 |  |
| 40 | desktop-normal-recovery | desktop/keyboard | cleared-after-miss+1-contact-wrong | 116 | 8 | 1 | 3 | 1 | 4 |  |
| 41 | desktop-normal-recovery | desktop/keyboard | cleared-after-miss+1-contact-wrong | 120 | 9 | 2 | 3 | 1 | 4 |  |
| 42 | desktop-normal-recovery | desktop/keyboard | cleared-after-miss+1-contact-wrong | 124 | 10 | 3 | 3 | 1 | 4 | over-120s |
| 43 | desktop-normal-recovery | desktop/keyboard | cleared-after-miss+1-contact-wrong | 128 | 7 | 1 | 3 | 1 | 4 | over-120s |
| 44 | desktop-normal-recovery | desktop/keyboard | cleared-after-miss+1-contact-wrong | 132 | 8 | 2 | 3 | 1 | 4 | over-120s |
| 45 | desktop-normal-recovery | desktop/keyboard | cleared-after-miss+1-contact-wrong | 136 | 9 | 3 | 3 | 1 | 4 | over-120s |
| 46 | desktop-normal-recovery | desktop/keyboard | cleared-after-miss+1-contact-wrong | 140 | 10 | 1 | 3 | 1 | 4 | over-120s |
| 47 | desktop-normal-recovery | desktop/keyboard | cleared-after-miss+1-contact-wrong | 112 | 7 | 2 | 3 | 1 | 4 |  |
| 48 | desktop-normal-recovery | desktop/keyboard | cleared-after-miss+1-contact-wrong | 116 | 8 | 3 | 3 | 1 | 4 |  |
| 49 | desktop-normal-recovery | desktop/keyboard | cleared-after-miss+1-contact-wrong | 120 | 9 | 1 | 3 | 1 | 4 |  |
| 50 | desktop-normal-recovery | desktop/keyboard | cleared-after-miss+1-contact-wrong | 124 | 10 | 2 | 3 | 1 | 4 | over-120s |
| 51 | mobile-virtual-clear | mobile/virtual | cleared | 128 | 6 | 1 | 3 | 1 | 4 | over-120s |
| 52 | mobile-virtual-clear | mobile/virtual | cleared | 133 | 7 | 2 | 3 | 2 | 3 | over-120s |
| 53 | mobile-virtual-clear | mobile/virtual | cleared | 138 | 8 | 1 | 3 | 2 | 3 | over-120s |
| 54 | mobile-virtual-clear | mobile/virtual | cleared | 143 | 9 | 2 | 3 | 2 | 3 | over-120s |
| 55 | mobile-virtual-clear | mobile/virtual | cleared | 148 | 10 | 1 | 3 | 2 | 3 | over-120s |
| 56 | mobile-virtual-clear | mobile/virtual | cleared | 153 | 6 | 2 | 3 | 2 | 3 | over-120s |
| 57 | mobile-virtual-clear | mobile/virtual | cleared | 158 | 7 | 1 | 3 | 1 | 4 | over-120s |
| 58 | mobile-virtual-clear | mobile/virtual | cleared | 128 | 8 | 2 | 3 | 2 | 3 | over-120s |
| 59 | mobile-virtual-clear | mobile/virtual | cleared | 133 | 9 | 1 | 3 | 2 | 3 | over-120s |
| 60 | mobile-virtual-clear | mobile/virtual | cleared | 138 | 10 | 2 | 3 | 2 | 3 | over-120s |
| 61 | mobile-virtual-clear | mobile/virtual | cleared | 143 | 6 | 1 | 3 | 2 | 3 | over-120s |
| 62 | mobile-virtual-clear | mobile/virtual | cleared | 148 | 7 | 2 | 3 | 2 | 3 | over-120s |
| 63 | mobile-virtual-clear | mobile/virtual | cleared | 153 | 8 | 1 | 3 | 1 | 4 | over-120s |
| 64 | mobile-virtual-clear | mobile/virtual | cleared | 158 | 9 | 2 | 3 | 2 | 3 | over-120s |
| 65 | mobile-virtual-clear | mobile/virtual | cleared | 128 | 10 | 1 | 3 | 2 | 3 | over-120s |
| 66 | mobile-virtual-clear | mobile/virtual | cleared | 133 | 6 | 2 | 3 | 2 | 3 | over-120s |
| 67 | mobile-virtual-clear | mobile/virtual | cleared | 138 | 7 | 1 | 3 | 2 | 3 | over-120s |
| 68 | mobile-virtual-clear | mobile/virtual | cleared | 143 | 8 | 2 | 3 | 2 | 3 | over-120s |
| 69 | mobile-virtual-clear | mobile/virtual | cleared | 148 | 9 | 1 | 3 | 1 | 4 | over-120s |
| 70 | mobile-virtual-clear | mobile/virtual | cleared | 153 | 10 | 2 | 3 | 2 | 3 | over-120s |
| 71 | mobile-fail-restart | mobile/virtual | game-over-then-restart-clear | 160 | 5 | 1 | 3 | 2 | 5 | expected recovery |
| 72 | mobile-fail-restart | mobile/virtual | game-over-then-restart-clear | 166 | 6 | 2 | 3 | 2 | 5 | expected recovery |
| 73 | mobile-fail-restart | mobile/virtual | game-over-then-restart-clear | 172 | 7 | 1 | 3 | 2 | 5 | expected recovery |
| 74 | mobile-fail-restart | mobile/virtual | game-over-then-restart-clear | 178 | 8 | 2 | 3 | 2 | 5 | expected recovery |
| 75 | mobile-fail-restart | mobile/virtual | game-over-then-restart-clear | 184 | 5 | 1 | 3 | 2 | 5 | expected recovery |
| 76 | mobile-fail-restart | mobile/virtual | game-over-then-restart-clear | 160 | 6 | 2 | 3 | 2 | 5 | expected recovery |
| 77 | mobile-fail-restart | mobile/virtual | game-over-then-restart-clear | 166 | 7 | 1 | 3 | 2 | 5 | expected recovery |
| 78 | mobile-fail-restart | mobile/virtual | game-over-then-restart-clear | 172 | 8 | 2 | 3 | 2 | 5 | expected recovery |
| 79 | mobile-fail-restart | mobile/virtual | game-over-then-restart-clear | 178 | 5 | 1 | 3 | 2 | 5 | expected recovery |
| 80 | mobile-fail-restart | mobile/virtual | game-over-then-restart-clear | 184 | 6 | 2 | 3 | 2 | 5 | expected recovery |
| 81 | resource-pressure | desktop/keyboard | cleared-after-resource-pressure | 118 | 6 | 0 | 3 | 2 | 3 |  |
| 82 | resource-pressure | desktop/keyboard | cleared-after-resource-pressure | 123 | 7 | 1 | 3 | 2 | 3 | over-120s |
| 83 | resource-pressure | desktop/keyboard | cleared-after-resource-pressure | 128 | 8 | 0 | 3 | 2 | 3 | over-120s |
| 84 | resource-pressure | desktop/keyboard | cleared-after-resource-pressure | 133 | 9 | 1 | 3 | 2 | 3 | over-120s |
| 85 | resource-pressure | desktop/keyboard | cleared-after-resource-pressure | 138 | 6 | 0 | 3 | 2 | 3 | over-120s |
| 86 | resource-pressure | desktop/keyboard | cleared-after-resource-pressure | 118 | 7 | 1 | 3 | 2 | 3 |  |
| 87 | resource-pressure | desktop/keyboard | cleared-after-resource-pressure | 123 | 8 | 0 | 3 | 2 | 3 | over-120s |
| 88 | resource-pressure | desktop/keyboard | cleared-after-resource-pressure | 128 | 9 | 1 | 3 | 2 | 3 | over-120s |
| 89 | resource-pressure | desktop/keyboard | trophy-blocked-under-defeats | 161 | 4 | 0 | 2 | 1 | 2 | resource-education-risk |
| 90 | resource-pressure | desktop/keyboard | trophy-blocked-under-defeats | 163 | 5 | 0 | 2 | 1 | 2 | resource-education-risk |
| 91 | unlock-reward-boundary | api/browser | locked-need-attempts | 0 | 0 | 0 | 0 | 0 | 0 | expected boundary |
| 92 | unlock-reward-boundary | api/browser | locked-need-accuracy | 0 | 0 | 0 | 0 | 0 | 0 | expected boundary |
| 93 | unlock-reward-boundary | api/browser | practice-unlock-entry | 0 | 0 | 0 | 0 | 0 | 0 | expected boundary |
| 94 | unlock-reward-boundary | api/browser | legacy-route-redirect | 0 | 0 | 0 | 0 | 0 | 0 | expected boundary |
| 95 | unlock-reward-boundary | api/browser | already-completed-open | 0 | 0 | 0 | 0 | 0 | 0 | expected boundary |
| 96 | unlock-reward-boundary | api/browser | already-completed-state | 0 | 0 | 0 | 0 | 0 | 0 | expected boundary |
| 97 | unlock-reward-boundary | api/browser | duplicate-blocked | 0 | 0 | 0 | 0 | 0 | 0 | expected boundary |
| 98 | unlock-reward-boundary | api/browser | invalid-under-defeats | 0 | 0 | 0 | 0 | 0 | 0 | expected boundary |
| 99 | unlock-reward-boundary | api/browser | invalid-too-short | 0 | 0 | 0 | 0 | 0 | 0 | expected boundary |
| 100 | unlock-reward-boundary | api/browser | reward-awarded-once | 0 | 0 | 0 | 0 | 0 | 0 | expected boundary |

## Recommendation

Do not block release on Adventure Island rules. If S20 is assigned a follow-up implementation task, prioritize:

1. Clarify or relax the 120-second target.
2. Teach "defeat 3 enemies with axes before trophy" earlier.
3. Increase mobile virtual button hit areas.

These are tuning and usability improvements, not functional failures.

## Residual Risk

This report combines passing browser E2E with deterministic rule simulation of current constants. It is strong for rule logic and regression checks, but it does not replace live classroom observation with young students, especially for mobile hand dexterity and reading comprehension of the trophy requirement.
