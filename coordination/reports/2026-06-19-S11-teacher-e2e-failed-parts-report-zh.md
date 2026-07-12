# 教师端 E2E 失败项中文报告

- 报告日期：2026-06-19 HKT
- 责任会话：S11 QA and release quality lead
- 相关 owner：S13 Teacher Console lead、S22 release engineering、S12 backend/API platform lead
- 证据来源：`coordination/session-logs/2026-06-18-S11.md` 与 Playwright artifact

## 一、结论摘要

本轮教师端 E2E 本地发布门禁中，教师端核心产品工作流已经获得通过证据；当前仍失败的部分只有一个：`tests/e2e/teacher-prep-toolchain.spec.ts` 的 isolated app 运行路径。

最终桌面主跑结果为 `26 passed / 1 skipped / 1 failed`。移动教师端导航冒烟为 `1 passed`。失败不出现在普通教师端页面矩阵、班级、作业、测验、资源、报告、收件箱、奖励、课堂模式、lesson kit 普通 UI 流程、运营治理或跨角色闭环中。

当前唯一失败更接近 S22 release engineering 的隔离运行环境 / dev-server 生命周期问题，而不是已经证明的 S13 教师端产品功能缺陷。普通 Playwright server 下，`teacher-current-ui-probe.spec.ts` 已证明 lesson kit 创建、审核、发布和课堂链接可达。

## 二、最终运行结果

桌面主跑命令：

```bash
PLAYWRIGHT_PORT=3190 PLAYWRIGHT_RUN_ID=teacher-e2e-final-20260618171648 npx playwright test tests/e2e/teacher-console-button-matrix.spec.ts tests/e2e/teacher-current-ui-probe.spec.ts tests/e2e/teacher-prep-toolchain.spec.ts tests/e2e/teacher-review-lesson.spec.ts tests/e2e/teacher-student-cross-role.spec.ts tests/e2e/teacher-operations.spec.ts tests/e2e/teacher-parent-hydration.spec.ts --project=desktop-chrome
```

结果：`26 passed / 1 skipped / 1 failed`，耗时约 5.5 分钟。

移动冒烟命令：

```bash
PLAYWRIGHT_PORT=3189 PLAYWRIGHT_RUN_ID=teacher-mobile-20260618171224 npx playwright test tests/e2e/teacher-console-button-matrix.spec.ts --project=mobile-chrome --grep "mobile teacher console"
```

结果：`1 passed`。

## 三、唯一仍失败项

### 失败用例

- 文件：`tests/e2e/teacher-prep-toolchain.spec.ts`
- 用例：`mainland teacher prep toolchain › creates, reviews, publishes, presents, controls, and gates AI generation without LLM config`
- 当前 owner：S22 release engineering

### 失败发生阶段

该用例在 isolated app 中执行教师备课工具链。前半段 API 流程已经走到较后阶段：

1. 获取 teacher lesson kit 列表成功。
2. 创建 lesson kit 成功。
3. 在无 LLM 配置下触发 generation run，返回 `503`，这是预期的 redacted / disabled-provider 行为。
4. 审核 lesson kit 成功。
5. 发布 lesson kit 成功，并生成资源与课堂 session。
6. 随后浏览器访问 isolated app 的 `/teacher/lesson-kits/:id` 页面时失败。

失败页面不是教师端业务页面，而是 Chromium 网络错误页：

```text
This site can't be reached
127.0.0.1 refused to connect.
ERR_CONNECTION_REFUSED
```

测试断言原本等待 lesson kit 标题：

```text
有理数与数轴：把方向、距离和运算连起来
```

但因为 isolated app 已无法连接，标题自然不可见。

### 失败性质判断

当前证据显示，这不是普通页面标题或选择器漂移，也不是直接的 S13 teacher console 产品断言失败。更合理的初步判断是：

- isolated app 的 Next/dev-server 进程在 publish 后退出或崩溃；
- isolated app 端口仍被测试访问，但服务已不再监听；
- 或 isolated app harness 在该路径的生命周期管理、日志捕获、端口/进程隔离上存在缺口。

该判断仍需 S22 通过 server log、进程退出码和 isolated app 生命周期复现进一步确认。

### Artifact 路径

失败证据保存在本地 Playwright artifact 中：

```text
.tmp/e2e-run-teacher-e2e-final-20260618171648/test-results/teacher-prep-toolchain-mai-e9864-neration-without-LLM-config-desktop-chrome/test-failed-1.png
.tmp/e2e-run-teacher-e2e-final-20260618171648/test-results/teacher-prep-toolchain-mai-e9864-neration-without-LLM-config-desktop-chrome/video.webm
.tmp/e2e-run-teacher-e2e-final-20260618171648/test-results/teacher-prep-toolchain-mai-e9864-neration-without-LLM-config-desktop-chrome/trace.zip
.tmp/e2e-run-teacher-e2e-final-20260618171648/test-results/teacher-prep-toolchain-mai-e9864-neration-without-LLM-config-desktop-chrome/error-context.md
```

Playwright 同时附加了 `teacher-prep-isolated-app.log`，其中记录了 isolated app 的 `baseURL` 与本轮独立 SQLite DB 路径。该日志应由 S22 优先查看。

## 四、曾经失败但已修复或归零的部分

以下失败出现在前几轮诊断中，但已经通过 S11 测试同步修复，不再是当前剩余 blocker：

### 1. Demo 教师登录触发 rate limit

早期桌面主跑出现大量失败，主因之一是多个教师端用例反复使用同一个 demo teacher 账号走真实登录 API，触发 `loginIdentifier` rate limit。S11 已在 E2E helper 中改为使用签名 session cookie 进行 demo 角色 setup，避免测试本身把共享 demo 登录入口打爆。

当前状态：已修复，最终主跑中教师角色边界、导航和写流程不再因该问题失败。

### 2. 教师端路由与当前 S13 UI 不一致

旧断言仍指向部分历史路由或旧 UI，例如：

- `/teacher` 与 `/teacher/dashboard`
- `/teacher/live` 与 `/teacher/classroom-sessions`
- `/teacher/inbox` 与 `/teacher/communications/inbox`
- lesson kit 与 operations 新入口
- assessment builder、assignment grading、report save copy 等 UI 文案/结构变化

S11 已把测试目标同步到当前 S13 路由和页面结构。

当前状态：已修复，最终主跑中教师导航矩阵、作业、测验、资源、报告、inbox 和课堂流程均通过。

### 3. 跨角色闭环的学生完成路径漂移

早期 cross-role 用例仍试图通过旧 lesson checkbox UI 完成作业，最终停在学生 lesson 页面，找不到预期 checkbox。S11 已改为通过当前 assignment submission API 提交学生答案，再回到教师端评分。

当前状态：已修复，最终主跑中教师创建班级、学生加入、学生发消息、教师回复、教师布置作业、学生提交、教师评分同步均通过。

### 4. Review lesson 浏览器会话未真正登录

早期 review lesson 用例只在 API context 里带 teacher cookie，浏览器 page 本身没有 teacher session。S11 已补齐浏览器端 teacher 身份 setup。

当前状态：已修复，最终主跑中 generated review lesson 编辑与 PPTX export 通过。

## 五、已经通过的教师端覆盖

本轮最终桌面主跑已经通过以下教师端功能面：

- 未登录、学生、教师三类身份访问教师区的路由边界；
- `/teacher` 到 `/teacher/dashboard` 的重定向；
- Overview、Classes、Analytics、Rewards、Lesson kits、Live、Assignments、Resources、Assessments、Reports、Inbox、Operations 导航；
- 班级创建与添加学生；
- Analytics follow-up 创建；
- 奖励发放与兑换处理；
- 课堂 session 开始、预览、结束；
- 作业创建与教师评分；
- 资源上传、筛选、下载；
- 测验创建与 CSV 导出；
- 报告预览、导出、保存；
- Inbox 草稿、状态切换、回复；
- lesson kit 创建、审核、发布、课堂链接普通路径；
- disabled-mode WeCom 通知与家长 MAIS receipt；
- roster CSV validate / commit；
- Nova Tutor governance 教师只读与管理员保存/恢复策略；
- teacher / parent hydration；
- review lesson 编辑与 PPTX 导出；
- 教师-学生跨角色闭环；
- 移动端教师导航目的地可达、激活状态和主内容渲染。

## 六、风险与下一步

### 当前发布风险

教师端核心工作流在本地 E2E 中已经基本绿色。唯一剩余风险是：在 isolated app 模式下，mainland teacher prep toolchain 发布后服务拒绝连接，导致无法在该隔离环境内继续验证 lesson kit detail / presenter / controller 页面。

这意味着：如果发布门禁要求 isolated app prep toolchain 也必须全绿，则当前仍不能宣布教师端 E2E 门禁完全通过；如果门禁以普通本地 Playwright server 的用户路径为准，则 S13 教师端核心产品流已有通过证据，但 S22 仍需修复或解释 isolated app 稳定性。

### 建议 S22 下一步

1. 查看失败 artifact 中的 `teacher-prep-isolated-app.log`、server stdout/stderr、Next 进程退出状态。
2. 单独复现 `teacher-prep-toolchain.spec.ts`，在 publish API 后立即检查 isolated server 是否仍监听端口。
3. 在 isolated app helper 中增加 server liveness probe：publish 前后各请求一个轻量 route，例如 `/login` 或 `/api/teacher/lesson-kits`。
4. 如果服务崩溃，定位 publish route 后的 server error、unhandled rejection、SQLite 文件锁或端口/进程清理问题。
5. 如果服务未崩溃但浏览器连接失败，检查 isolated app baseURL、端口复用和测试进程生命周期。

### 建议 S11 下一步

S22 处理 isolated app 稳定性后，S11 应重跑：

```bash
PLAYWRIGHT_RUN_ID=teacher-e2e-rerun-$(date +%Y%m%d%H%M%S) npx playwright test tests/e2e/teacher-prep-toolchain.spec.ts --project=desktop-chrome
```

若单项通过，再重跑教师端桌面主门禁与移动冒烟，确认无回归。

## 七、未覆盖或未执行

- 未执行生产或预览环境 smoke；本报告只覆盖本地 E2E 证据。
- 未使用 live LLM、WeCom 或其他付费外部 provider。
- 未触碰真实生产数据。
- 未执行 `npm run type-check`，因为该命令不属于本轮教师端 E2E 失败项报告范围，并且当前 dirty tree 存在大量其他会话的无关漂移。

## 八、状态判断

当前状态：教师端 E2E 本地门禁为“部分通过，1 个 S22 isolated-app blocker 待处理”。

S13 教师端核心产品工作流：通过本轮覆盖范围内的本地 E2E 验证。

S22 isolated app / release harness：仍需修复或给出环境归因报告。

S12 backend/API contract：本轮最终失败中没有新的明确 S12 API contract blocker；此前相关 API 写流程在最终主跑中已通过。
