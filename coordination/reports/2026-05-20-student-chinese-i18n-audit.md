# Student Chinese UI English-Leak Audit

- Date: 2026-05-20
- Session: S09
- Project: MAIS-MVP
- Scope: Student-facing UI in Traditional Chinese (`zh`) and Simplified Chinese (`zh-Hans`)
- Status: Completed

## Executive Summary

本次 S09 审计覆盖 19 条学生端路线、2 种中文语言模式（`zh` 繁体、`zh-Hans` 简体）和 desktop/mobile 两类视口。`npm run audit:zh-hans` 未发现 critical issue；运行时路线矩阵全部返回 200。

结论：主导航、登录/注册入口、课程/练习/学习路径主标题整体已按中文显示；但仍有若干学生可见或读屏可读的英文漏显，集中在练习附件按钮、AI Tutor 附件菜单、学生 dashboard/progress 的状态/趋势 token、作业/资源/测验类型状态 chip、游戏返回链接和少量可视化 fallback/aria 文案。建议按下表优先修复，不直接在本轮改业务代码。

## Method

- Ran the existing Simplified Chinese audit script to confirm no critical Traditional-to-Simplified conversion defects.
- Performed static scans for hard-coded English in JSX visible text, accessibility labels, placeholders, titles, and alt text.
- Used Playwright to visit the planned student route matrix in desktop and mobile viewports under `zh` and `zh-Hans`, then reviewed visible text and key accessible names.
- Filtered allowed English tokens including `MAIS`, `PedaNova`, `AI`, `BKT`, `XP`, `HP`, `KB`, math variables/symbols, file names, real names, and course codes.

## Route Matrix

- `/`
- `/login`
- `/register`
- `/dashboard`
- `/adaptive-learning`
- `/progress`
- `/learning-path`
- `/primary-roadmap`
- `/secondary-roadmap`
- `/lesson/quadratic-functions`
- `/practice`
- `/mistake-book`
- `/visualization-lab`
- `/messages`
- `/classroom/join`
- `/assessment/assessment-s3-algebra-quiz`
- `/resource/resource-s3-quadratics-slides`
- `/practice/fishing-game`
- `/practice/adventure-island`

## Findings

### P0 - Core Student Action Copy

| ID | Route(s) | Language | Evidence | Source / likely component | Recommended owner |
| --- | --- | --- | --- | --- | --- |
| ZH-AUDIT-P0-01 | `/lesson/quadratic-functions`, `/practice` | `zh`, `zh-Hans` | Visible attachment button displays `Add photos`; button aria label is also `Add photos`. | `components/practice/PracticeQuestionCard.tsx:1041`, `components/practice/PracticeQuestionCard.tsx:1050` | S04 for practice surface; coordinate S09 copy |

### P1 - Visible UI, Accessibility, Status, Tooltip-Level Copy

| ID | Route(s) | Language | Evidence | Source / likely component | Recommended owner |
| --- | --- | --- | --- | --- | --- |
| ZH-AUDIT-P1-01 | Most authenticated student routes after AI Tutor is available | `zh`, `zh-Hans` | AI Tutor attachment menu/accessible name exposes `Add photos & files` and `Add photos and files`. | `components/ai/AITutorProvider.tsx:998`, `components/ai/AITutorProvider.tsx:1004` | S07 for AI Tutor; coordinate S09 copy |
| ZH-AUDIT-P1-02 | `/adaptive-learning`, `/progress` | `zh`, `zh-Hans` | Progress cards show trend pills such as `0 attempts`, `0 total`, `0 active mistakes`. | `lib/server/userStore.ts:11343`, `lib/server/userStore.ts:11349`, `lib/server/userStore.ts:11355`, rendered by `components/cards/ProgressCard.tsx:20` | S08 for analytics data text; S02 for dashboard/progress surface |
| ZH-AUDIT-P1-03 | `/adaptive-learning` | `zh`, `zh-Hans` | Assignment cards show raw tokens such as `lesson` and `in-progress` beside Chinese assignment text. | `components/dashboard/AdaptiveLearningContent.tsx:535`, `components/dashboard/AdaptiveLearningContent.tsx:537` | S02 for dashboard UI; coordinate S12/S08 if API contract changes |
| ZH-AUDIT-P1-04 | `/assessment/assessment-s3-algebra-quiz` | `zh`, `zh-Hans` | Assessment chips show raw `quiz` and `graded`. | `app/assessment/[assessmentId]/page.tsx:95`, `app/assessment/[assessmentId]/page.tsx:97` | S12 for assignment/assessment route contract if mapped server-side; S09 copy mapping |
| ZH-AUDIT-P1-05 | `/resource/resource-s3-quadratics-slides` | `zh`, `zh-Hans` | Resource metadata and linked assignment line show raw `resource.type` and `submission.status`. | `app/resource/[resourceId]/page.tsx:82`, `app/resource/[resourceId]/page.tsx:109` | S12 for resource route contract if mapped server-side; S09 copy mapping |
| ZH-AUDIT-P1-06 | `/dashboard` | `zh`, `zh-Hans` | Student reward thumbnails display `Toy`, `Pen`, `Erase`, `Kit`. | `components/dashboard/StudentRewardsPanel.tsx:84`; seeded by `lib/server/userStore.ts` reward `thumbnail_label` records | S17 for reward data; S02 for dashboard UI; coordinate S09 copy |
| ZH-AUDIT-P1-07 | `/practice/fishing-game`, `/practice/adventure-island` | `zh`, `zh-Hans` | Back link displays mixed label `Back to Practice / 返回練習場`. | `app/practice/fishing-game/page.tsx:12`, `app/practice/adventure-island/page.tsx:12` | S20 for game pages; coordinate S09 copy |
| ZH-AUDIT-P1-08 | `/lesson/quadratic-functions`, possibly other question-card render paths | `zh`, `zh-Hans` | Coordinate SVG accessible name is `Coordinate grid diagram`. | `components/practice/PracticeQuestionCard.tsx:540` | S04 for practice/lesson card; coordinate S09 copy |

### P2 - Low-Frequency Fallbacks / Static Candidates

| ID | Route(s) | Language | Evidence | Source / likely component | Recommended owner |
| --- | --- | --- | --- | --- | --- |
| ZH-AUDIT-P2-01 | `/visualization-lab` geometry module paths | `zh`, `zh-Hans` | Static scan found `Angle A`, `Angle B`, `Angle C`, and `deg` labels. These were not reached by the route-matrix smoke pass, but should be localized if visible in the Geometry Explorer mode. | `components/visualizations/GeometryExplorer.tsx:510`-`513` | S06 for visualization; coordinate S09 copy |
| ZH-AUDIT-P2-02 | Roadmap visualization SVG fallback only | `zh`, `zh-Hans` | Static scan found fallback SVG copy `Missing visualization` and `Add a topic-specific model case`. Not observed in the successful route matrix. | `components/visualizations/RoadmapVisualizationSuite.tsx:843`-`844` | S03 for roadmap visualization; coordinate S09 copy |

### Not Classified As Issues

- Product/acronym tokens: `MAIS`, `PedaNova`, `AI`, `BKT`, `XP`, `HP`, `KB`.
- Course codes and class labels such as `S3A Mathematics` where they represent real class/course names.
- Math variables, symbols, units, file extensions, and filenames.
- Contact/domain text such as `hudongpin@126.com` and `hudongpin.com`.
- Demo/user-generated communication content in `/messages`, for example sender names or a seeded English message body. If the demo experience must be fully Chinese, this should be a separate content-localization task rather than UI chrome leakage.
- One initial automated `/learning-path` desktop `zh` row appeared to report `lang=en`; focused reruns for `/learning-path` and `/primary-roadmap` stayed in `zh-Hant-HK` with Chinese headers. Treat as automation flake, not a reproduced product issue.

## Checks

- `npm run audit:zh-hans` passed.
  - Critical: 0
  - Warnings: 0
  - Advisory: 3372 (`missing-zhHans` and punctuation-spacing advisories, no critical Simplified Chinese conversion issue)
- `npm run build` passed.
- Runtime Playwright audit passed route loading for 19 planned routes x 2 languages x 2 viewports = 76 route checks, all status 200.
- Runtime evidence written to `coordination/reports/2026-05-20-student-chinese-i18n-evidence/runtime-candidates.json`.
- Screenshots for the route matrix were written under `coordination/reports/2026-05-20-student-chinese-i18n-evidence/`.
- `next start` was attempted after build but failed locally with missing `.next/required-server-files.json`; the runtime audit therefore used `npm run dev` on a local audit port instead.
- Not run: no permanent Playwright regression spec was added, because `tests/e2e/` belongs to S11 and this assignment requested audit/report first.

## Recommended Ownership

- S09: Own copy mapping recommendations and verify final Chinese wording in both `zh` and `zh-Hans`.
- S04: Fix PracticeQuestionCard attachment button and coordinate grid aria label.
- S07: Fix AI Tutor attachment menu text and aria label.
- S02/S08: Localize progress metric trend strings and dashboard/adaptive status display. Prefer localized display labels rather than exposing raw server tokens.
- S12/S09: Decide whether assessment/resource type/status labels are mapped in route UI or server response helpers.
- S17/S02: Localize reward thumbnail labels or replace them with language-neutral icons.
- S20: Localize game back links.
- S06/S03: Localize low-frequency visualization/fallback text if those paths are reachable.
- S11: If this audit should become a release gate, add `tests/e2e/student-chinese-i18n-audit.spec.ts` with a maintained allowlist and run the targeted Playwright command plus `npm run type-check`.

## Suggested Fix Order

1. Fix P0 attachment button text/aria in `PracticeQuestionCard`.
2. Fix AI Tutor attachment menu and all raw status/type token displays.
3. Fix dashboard/progress trend strings and reward thumbnail labels.
4. Fix game links and visualization/fallback P2 candidates.
5. Add S11-owned Playwright regression only after copy fixes are merged, so the allowlist stays small and meaningful.
