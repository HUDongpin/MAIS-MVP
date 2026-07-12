# MAIS-MVP 教师端 P0/P1 Bug 穷举审计报告

- 日期: 2026-06-04
- 最新复审时间: 12:55 HKT
- 会话: S11 QA and release quality
- 范围: 本地 `/Users/dongpinhu/Desktop/MAIS-MVP` 教师端所有页面模板、教师端 API 权限边界、核心教师端 E2E 子集、构建/类型门禁
- 写入范围: 仅本报告和 `coordination/session-logs/2026-06-04-S11.md`

## 结论摘要

当前本地树没有复现教师端 P0。`npm run type-check` 和默认 `npm run build` 均已通过；上一版报告中的 `userStore.ts`/schema contract P0 和默认 build 产物 P0 在本轮最新树中不再成立。

本轮确认 2 个教师端移动窄屏 P1:

1. `/teacher/operations` 在 390px/320px 手机视口出现严重横向溢出，320px 下文档宽度被撑到 571px，核心校务操作区和浮动 AI Tutor 按钮会被推到屏幕外。
2. `/teacher/resources` 与 `/teacher/prep/new` 在窄屏出现横向溢出，320px 下资源页被撑到 405px，备课新建页被撑到 335px；影响上传/筛选/新建备课包页面的移动可用性。

未发现当前仍存在的教师端 5xx、404、登录后重定向失败、未捕获 page error、权限边界 401/403 失效、review lesson 动态页不可用、校务 API 不可用、备课发布链路 P0/P1。

## 覆盖口径

- 页面文件: `app/teacher/` 下 24 个页面/布局相关文件已枚举。
- 生产页面巡检: 22 条 seed route x 3 个视口，合计 66 次页面加载。
- 动态页补充:
  - `/teacher/prep/[kitId]`: `teacher-prep-toolchain.spec.ts` 覆盖并通过。
  - `/teacher/review-lessons/[reviewLessonId]`: `teacher-review-lesson.spec.ts` 覆盖并通过。
- API 边界: 34 个教师 API probe，匿名/学生/家长权限 + 教师只读 GET，共 122 次检查。

## Severity 口径

- P0: 阻断 `type-check`、`build`、教师端登录/布局、教师端全路由启动，或造成教师端核心功能完全不可用。
- P1: 不阻断构建，但会造成教师核心工作流大面积不可用、高影响移动不可用、安全/权限边界异常、数据损坏或关键流程高概率失败。

## P0 状态

当前确认 P0: 无。

已复核通过:

```bash
npm run type-check
npm run build
```

默认 `npm run build` 当前完整生成 100 个 app routes/pages，包含教师端页面和教师端 API route。

## P1-001: `/teacher/operations` 移动端严重横向溢出

状态: confirmed P1。

复现:

- 登录教师账号后访问 `/teacher/operations`。
- 390x844 手机视口: `document.documentElement.scrollWidth - clientWidth = 181px`。
- 320x568 手机视口: `document.documentElement.scrollWidth - clientWidth = 251px`。

证据:

- 自定义生产路由巡检: `/teacher/operations` 返回 200，无 5xx/pageerror，但移动横向溢出。
- DOM 定位显示 320px 下页面 `clientWidth=320`、`scrollWidth=571`。
- 主要撑宽元素:
  - operations tab buttons: `Collaboration`、`Term archive` 位于 viewport 右侧外。
  - operations hero/form sections 宽度约 555px。
  - AI Tutor fixed button 被推到 `left=503, right=559`，不可见。

相关代码:

- `components/teacher/TeacherOperationsView.tsx:347`: tablist 使用 `flex gap-2 overflow-x-auto`，但没有足够的 `min-w-0/max-w-full` 容器约束。
- `components/teacher/TeacherOperationsView.tsx:356`: tab button 使用 `shrink-0`，所有 tab 的 min-content 宽度会累加。
- `components/teacher/TeacherOperationsView.tsx:370`, `419`, `499`: 多个操作区使用 grid/form 布局，移动端容器链未统一设置 `min-w-0`。

影响:

- 校务落地页面是教师通知、未交提醒、花名册、协作、学期归档入口。
- 窄屏手机上需要横向拖动才能看到部分 tabs/内容；固定 AI Tutor 入口也会被推到屏幕外。
- 对真实教师移动端处理通知/花名册属于高影响可用性问题。

根因:

- `overflow-x-auto` 加在 tablist 上，但父 section 和页面内容链路仍可被子元素 min-content 宽度撑开。
- `shrink-0` tabs + 长英文 label + 未设置 `min-w-0` 的 block/grid 子树，让 `glass-panel` 自身扩宽，而不是仅 tablist 内部滚动。

建议修复:

1. 在 `TeacherOperationsView` 顶层和各主要 section/grid 子树加 `min-w-0 max-w-full`。
2. tablist 改为明确受限容器，例如 `className="mt-5 flex min-w-0 max-w-full gap-2 overflow-x-auto overscroll-x-contain pb-1"`。
3. 保留 tab 可横向滚动时，确保父 section 不扩大: 必要时给外层 `overflow-hidden`，内层单独 `overflow-x-auto`。
4. 表单、select、textarea、input 统一 `min-w-0 w-full`。
5. 加 S11 回归: 访问 `/teacher/operations` at 320x568/390x844，断言 `scrollWidth <= clientWidth + 8`，并断言所有 tab 可通过 tablist 内部滚动访问。

Owner 路由:

- S13: 教师端 UI 修复。
- S11: 修复后移动回归。

## P1-002: `/teacher/resources` 与 `/teacher/prep/new` 窄屏横向溢出

状态: confirmed P1 for narrow mobile usability。

复现:

- `/teacher/resources`
  - 390x844: overflow 15px。
  - 320x568: overflow 85px，文档宽度 405px。
- `/teacher/prep/new`
  - 320x568: overflow 15px，文档宽度 335px。

证据:

- 自定义生产路由巡检: 页面均返回 200，无 5xx/pageerror，但触发移动横向溢出。
- `/teacher/resources` 320px DOM 定位显示多个 `glass-panel` section 宽度约 389px，超出 viewport 85px。
- `/teacher/prep/new` 320px DOM 定位显示 select/form 内容链宽度约 298px，加上 page padding 后撑到 335px。

相关代码:

- `components/teacher/TeacherResourceAssessmentViews.tsx:149-205`: resources hero/upload/resource library sections 未统一收口 `min-w-0 max-w-full`。
- `components/teacher/TeacherResourceAssessmentViews.tsx:162-201`: upload form 内多个 select/file input 在窄屏没有显式 `min-w-0 w-full`。
- `components/teacher/TeacherPrepViews.tsx:201-256`: prep new form 和 select 使用固定高度/圆角样式，但没有窄屏宽度收口。

影响:

- 资源页承担上传、筛选、下载课件/试卷；备课新建页承担内地教材备课包创建。
- 320px 设备上出现页面级横向滚动，部分控件和浮动按钮位置不稳定。
- 这不会阻断 desktop，也不造成数据损坏，但会让移动端教师工作台不稳定，按 P1 移动可用性处理。

根因:

- 页面容器为 `page-container px-4`，有效内容宽度 288px；多个表单/section 子树以 298-389px min-content 宽度参与布局。
- 长 label、select option 文本、file input 和 `tracking` 文案没有窄屏降级。

建议修复:

1. 给 `TeacherShell` 主内容区域和教师页面根 grid 加 `min-w-0`，避免子页面把全局 shell 撑宽。
2. 在 `TeacherResourcesView` 与 `TeacherPrepNewView` 的 section/form/select/input 上补 `min-w-0 w-full max-w-full`。
3. 对窄屏 uppercase tracking 文案使用移动端更小 tracking，例如 `tracking-[0.12em] sm:tracking-[0.24em]`。
4. file input 可包装在 `min-w-0 overflow-hidden` 容器内，必要时把 accept format 文案换行。
5. 加 S11 回归: `/teacher/resources`、`/teacher/prep/new` at 320x568/390x844，断言无页面级 horizontal overflow。

Owner 路由:

- S13: 教师端页面修复。
- S01/S07 仅在修复发现全局 AI Tutor/fixed layer 仍随 overflow 错位时协调。
- S11: 修复后移动回归。

## 未升级为 P0/P1 的发现

### 已解除的旧 P0

- 旧报告里的 `lib/server/userStore.ts` schema/domain mapper 类型门禁问题: 本轮 `npm run type-check` 通过。
- 旧报告里的默认 `.next` build 产物问题: 本轮默认 `npm run build` 通过。

### `teacher-prep-toolchain` 首次失败: 502 vs 503

第一次运行:

```bash
PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test tests/e2e/teacher-prep-toolchain.spec.ts --project=desktop-chrome --reporter=line --retries=0
```

结果: fail，`/api/teacher/lesson-kits/[kitId]/generate` 返回 502，测试期望 503。

根因: 测试只在 spec 内设置 `DEEPSEEK_API_KEY: ""`，但本地环境仍可能存在其他 LLM provider env。`readLLMProviderConfig()` 读取到其他 provider config 后进入 provider request，失败后按 route contract 返回 `provider-error` 502。

复核:

```bash
PLAYWRIGHT_SKIP_WEBSERVER=1 LLM_API_KEY= OPENAI_API_KEY= LLM_MODEL= OPENAI_MODEL= LLM_API_URL= DEEPSEEK_API_KEY= DEEPSEEK_MODEL= DEEPSEEK_API_URL= QWEN_API_KEY= QWEN_API_URL= QWEN_IMAGE_MODEL= QWEN_IMAGE_API_URL= QWEN_REALTIME_MODEL= QWEN_REALTIME_API_URL= npx playwright test tests/e2e/teacher-prep-toolchain.spec.ts --project=desktop-chrome --reporter=line --retries=0
```

结果: pass。

判断: 不是当前教师备课页面 P0/P1。建议 S11/S19 后续把该 spec 的 env 禁用范围与 `playwright.config.ts` 的 `disabledProviderEnv` 对齐，避免误触 live provider 或产生假失败。

### 组合 E2E / button matrix 卡住

- 组合跑 `teacher-console-button-matrix + teacher-console-api-stress + teacher-operations + teacher-prep-toolchain + teacher-review-lesson + teacher-parent-p1-regressions` 卡在 `teacher-console-api-stress`，未产生可定级产品失败。
- 单跑 `teacher-console-button-matrix` 时，前 8 条通过，进入第 9 条 assignment workflow 后长时间无输出；已手动终止，未得到断言栈。
- 当前已有独立页面巡检、API 边界扫、review lesson、prep、operations、P1 regressions 通过，因此暂不升级为 P1。建议 S11 后续单独调查 button matrix/harness 卡住，避免长跑套件继续阻塞夜间报告。

## 已运行检查

| 检查 | 结果 | 关键结论 |
| --- | --- | --- |
| `npm run type-check` | pass | 当前无 TypeScript P0。 |
| `npm run build` | pass | 默认生产构建通过，生成教师端页面/API routes。 |
| 生产全路由浏览器巡检，22 routes x 3 viewports | 66 checks, 5 mobile overflow findings | 无 5xx/404/pageerror/login failure；发现 P1-001/P1-002。 |
| 教师 API 权限/只读边界脚本 | 122 checks pass | 匿名/学生/家长 401/403 正常；教师 GET 无 5xx。 |
| `teacher-review-lesson.spec.ts` | 1 passed | `/teacher/review-lessons/[id]` 可打开、保存、PPTX export。 |
| `teacher-prep-toolchain.spec.ts` with all provider env blank | 1 passed | `/teacher/prep/[kitId]`、publish、live present/controller、missing LLM gate 可用。 |
| `teacher-operations.spec.ts` | 2 passed | 通知回执、家长确认、CSV 花名册导入 API 可用。 |
| `teacher-parent-p1-regressions.spec.ts` | 2 passed | ended live code 不可读；教师/家长 SSR timestamp hydration 无 page error。 |

## Checks not completed

- Full `teacher-console-api-stress.spec.ts`: 组合跑中卡住，未得到正式 pass/fail。
- Full `teacher-console-button-matrix.spec.ts`: 单跑卡在 assignment workflow，前 8 条通过但完整套件未结束。
- 官方 mobile project 的全教师端 button matrix: 未跑；本轮用自定义 320/390 route audit 覆盖移动页面级 P1。

## 修复后验收建议

```bash
npm run type-check
npm run build
PLAYWRIGHT_PORT=3870 PLAYWRIGHT_RUN_ID=s11-teacher-mobile-overflow-3870 npx playwright test tests/e2e/teacher-console-button-matrix.spec.ts --project=desktop-chrome --reporter=line --retries=0
PLAYWRIGHT_PORT=3871 PLAYWRIGHT_RUN_ID=s11-teacher-p1-regressions-3871 npx playwright test tests/e2e/teacher-parent-p1-regressions.spec.ts --project=desktop-chrome --reporter=line --retries=0
```

还应新增一个轻量移动 overflow regression，覆盖:

- `/teacher/operations`
- `/teacher/resources`
- `/teacher/prep/new`
- 320x568 和 390x844
- 断言 `document.documentElement.scrollWidth <= document.documentElement.clientWidth + 8`

## Owner follow-up

1. S13 修复教师端移动 overflow。
2. S11 增加/复跑移动 overflow regression。
3. S11/S19 后续修正 `teacher-prep-toolchain.spec.ts` 的 provider env 隔离，防止本地 `.env.local` 影响“无 LLM 配置”测试。
4. S11 后续单独调查 `teacher-console-button-matrix` 和 `teacher-console-api-stress` 长跑卡住问题；目前不把它们列为产品 P0/P1。
