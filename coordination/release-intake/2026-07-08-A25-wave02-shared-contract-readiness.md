# A25 Wave 02 Shared Contract Readiness

Generated: 2026-07-08T14:13:54.112Z

Dirty map signature: `4892e406613fc3846378621b84ba0f486bb8ebf371c35837eae544472596f318`

Expanded dirty entries: 6130

Worktree: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A08-A12-shared-contract-closure`

Branch: `codex/A08-A12-shared-contract-closure`

This is readiness evidence only. It does not authorize staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, worktree removal, or any other physical cleanup.

## Result

- Commit ready: no
- Blocking reasons: testAnalytics failed; testBackend failed; typeCheck failed; build failed
- Status entries: 185
- Covered by A08/A12 pathspec union: 185
- Uncovered entries: 0
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
| none | none |

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
