# Mainland PEP Primary Practice Arena Stress Test

- Date: 2026-06-01
- Session ID: S11
- Scope: Current Mainland PEP primary Practice Arena question bank, P1-P6.
- Overall result: Data/API stress passed. Browser page smoke was blocked by local `.next` generated-artifact failures unrelated to the PEP primary question data.

## Executive Summary

人教版小学 P1-P6 当前练习场题库在数据层、筛选层、判分层和 attempt API 路由层均通过压力测试。当前可确认：1200 道题仍在应用题库中，六个年级各 200 道；正确答案、可接受答案、错误答案拒绝、多选题唯一正确选项、按年级/难度筛选、登录态题目 API、attempt 路由判分均正常。

页面级浏览器烟测没有完成，原因是本地 Next 生成目录 `.next` 出现缺失 manifest / runtime 文件，导致 dev server 和 build 在非题库路由或生成物读取阶段 500/失败。这个阻塞不指向人教版小学题目本身，但会影响“本机页面实际打开”验证。

## Stress Coverage

| Check area | Result | Evidence |
| --- | --- | --- |
| PEP primary inventory | Pass | 1200 questions, 1200 unique IDs, 24 topics |
| Grade coverage | Pass | P1-P6 each returned exactly 200 questions |
| Type quotas | Pass | P1/P2: 90 MC, 80 fill-in, 30 short-answer; P3/P4: 75/75/50; P5/P6: 60/70/70 |
| Difficulty quotas | Pass | P1/P2: 120 Foundation, 70 Core, 10 Challenge; P3/P4: 80/95/25; P5/P6: 60/100/30/10 Exam |
| App integration | Pass | All 1200 PEP primary IDs present in `data/questions.ts` combined bank |
| Deterministic answer audit | Pass | Independent answer matched stored answer for all 1200 questions |
| Accepted-answer grading | Pass | 1450 accepted-answer checks accepted |
| Wrong-answer grading | Pass | 1200 generated wrong-answer checks rejected |
| Multiple-choice integrity | Pass | 450 MC checks, 4 unique options and exactly 1 accepted option each |
| Authenticated question API | Pass | `/api/questions?publisher=MAINLAND_PEP&grade=P1...P6` returned 200 each with a PEP student session |
| Public field shape | Pass | Public API/direct public questions did not expose `answer`, `acceptedAnswers`, or `explanation` |
| Attempt route correct submissions | Pass | 1200 correct submissions through `/api/attempts` returned correct |
| Attempt route wrong submissions | Pass | 1200 wrong submissions through `/api/attempts` returned incorrect with `correctAnswer` |
| Burst grading loop | Pass | 10 full-bank rounds = 12,000 repeated grading checks |
| Unauthenticated PEP API gating | Pass | Unauthenticated non-default PEP query returned valid empty `questions: []`, not a crash |

## Commands And Results

- `node --test .tmp/question-bank-tests/lib/mainlandPepPrimaryQuestionBank.test.js`: Pass, 6/6 tests.
- Custom PEP primary stress harness: Pass; 1200 questions, 1450 accepted-answer checks, 1200 wrong-answer checks, 2400 attempt-route submissions, 12,000 burst checks.
- `npm run type-check`: Pass.
- `npm run test:question-bank`: Attempted twice, not green due to non-question-bank environment/build artifacts:
  - First attempt stopped at `components/lesson/LessonView.tsx(1558,11): error TS2657: JSX expressions must have one parent element`.
  - After `npm run type-check` passed, second attempt stopped on missing generated `.next/types/...` files matched by `tsconfig.json`.
- `npm run build`: Failed after successful compilation while collecting page data for `/api/assessments/[assessmentId]`; missing `.next/server/app/api/assessments/[assessmentId]/route.js`.
- Browser smoke:
  - `npm run dev -- --hostname 127.0.0.1 --port 3035/3036` with Turbopack: `/api/auth/register` returned 500 from missing `.next/static/development/_buildManifest.js.tmp...`.
  - `npx next dev --hostname 127.0.0.1 --port 3037` without Turbopack: `/api/auth/register` returned 500 from missing `.next/routes-manifest.json` / `../webpack-runtime.js`.

## Risks

- Local `.next` generated output is currently inconsistent/corrupt enough to block dev-server and production-build page verification.
- `npm run test:question-bank` is sensitive to `.next/types/**/*.ts` included by `tsconfig.json`; stale/missing generated Next type files can prevent the question-bank tests from reaching their assertions.
- Because browser smoke was blocked, this report confirms question data/API operability, but not a full visual browser run of `/practice` for P1-P6 in the current local `.next` state.

## Recommended Follow-Up

- S10/S12 should regenerate or clean the local Next generated output in a coordinated maintenance window, then rerun `npm run build`.
- S11 should rerun the browser smoke after `.next` is healthy: register P1-P6 PEP student accounts, open `/practice`, verify cards render, and submit one visible item per grade.
- Consider isolating question-bank tests from `.next/types` so data QA can run even when generated Next app artifacts are stale.
