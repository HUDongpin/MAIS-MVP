# A25 Wave 02 Shared Contract Readiness

Generated: 2026-07-10T17:09:39.884Z

Dirty map signature: `e30d647e1b51432945713f42ac78b0a2466fcb17192de0235a801ac877a0801f`

Expanded dirty entries: 7636

Worktree: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A08-A12-shared-contract-closure`

Branch: `codex/A08-A12-shared-contract-closure`

This is readiness evidence only. It does not authorize staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, worktree removal, or any other physical cleanup.

## Result

- Commit ready: no
- Blocking reasons: 1 dirty entries are outside the A08/A12 pathspec union; testAnalytics failed; testBackend failed; typeCheck failed; build failed
- Status entries: 186
- Covered by A08/A12 pathspec union: 185
- Uncovered entries: 1
- Type-check errors: 689

## Checks

| Check | Result | Status | Command |
| --- | --- | ---: | --- |
| testAnalytics | fail | 2 | `npm run test:analytics` |
| testBackend | fail | 1 | `npm run test:backend` |
| typeCheck | fail | 2 | `npm run type-check -- --pretty false` |
| build | fail | 1 | `npm run build` |

## Uncovered Entries

| Status | Path |
| --- | --- |
| `??` | `coordination/reports/2026-07-10-A08-A12-shared-contract-validation.md` |

## Type-Check Hotspots

| File | Errors |
| --- | ---: |
| `components/visualizations/three/scenes/TemplatePrimitiveScene.tsx` | 206 |
| `data/questions.ts` | 91 |
| `data/topics.ts` | 49 |
| `data/mainlandPepPrimaryTopics.ts` | 24 |
| `lib/adaptiveLearning.ts` | 24 |
| `data/mainlandPepHighTopics.ts` | 22 |
| `components/visualizations/three/ThreeDGraphCanvas.tsx` | 21 |
| `components/visualizations/VisualizationLabPage.tsx` | 14 |
| `components/games/MathVirusBlasterGame.tsx` | 13 |
| `components/visualizations/three/manim/MathSceneRuntime.tsx` | 12 |
| `data/mainlandPepHighQuestions.ts` | 11 |
| `components/games/MightyTankBattleGame.tsx` | 10 |
| `components/visualizations/three/ThreeDLabCanvas.tsx` | 10 |
| `data/mainlandPepPrimaryQuestions.ts` | 10 |
| `components/visualizations/three/threeDSceneMath.catalog.test.ts` | 9 |
| `data/mainlandBnuJuniorTopics.ts` | 9 |
| `components/lesson/CaliforniaHighSchoolTextbookPage.tsx` | 7 |
| `components/lesson/CaliforniaHighSchoolTextbookStudentPage.tsx` | 7 |
| `components/games/MathMatchQuestGame.tsx` | 6 |
| `lib/adaptiveLearning.test.ts` | 6 |
