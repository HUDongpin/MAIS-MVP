# 2026-06-19 S11 学生端 E2E 失败部分中文报告

- 负责会话：S11 QA and release quality lead。
- 依据来源：`coordination/reports/2026-06-18-S11-student-e2e-functional-check.md` 及对应 Playwright 执行结果。
- 检查范围：学生端核心链路、移动端关键可用性、多课程代表链路、DeepSeek live text 小样本、SimpleTex/live OCR 小样本。
- 操作边界：本轮只运行检查并记录证据；没有修改产品代码、API 行为、环境变量、真实密钥文件，也没有执行 Git staging、commit、branch、reset 或 revert。

## 一、总体结论

学生端 E2E 发布门禁为红灯。主要失败来自本地学生端流程和多课程功能链路，不能归因于生产环境或第三方 provider 本身。

DeepSeek 和 SimpleTex 的 live provider 健康状态本轮没有得到有效结论：两个 live 检查都在真正调用 provider 之前被其他问题阻断。因此，本报告将它们标记为“未验证/不确定”，不是“provider 失败”。

## 二、执行结果汇总

| 检查项 | 结果 | 判断 |
| --- | --- | --- |
| 核心学生端桌面链路 | 6 passed, 16 failed | 红灯 |
| 学生端移动端 smoke | 1 failed, 8 skipped | 红灯 |
| 多课程代表链路 | 10 passed, 11 failed | 红灯 |
| DeepSeek live text | 1 failed before provider calls, 3 did not run | 被构建隔离问题阻断 |
| SimpleTex/live OCR | 1 failed before live OCR provider rows | 被 Practice 页面 combobox 问题阻断 |

证据根目录：

- `.tmp/e2e-run-s11-student-core-20260618/test-results/`
- `.tmp/e2e-run-s11-student-mobile-20260618/test-results/`
- `.tmp/e2e-run-s11-student-multicourse-20260618/test-results/`
- `.tmp/e2e-run-s11-live-deepseek-text-20260618/test-results/`
- `.tmp/e2e-run-s11-student-live-ocr-20260618/test-results/`

## 三、失败部分详述

### 1. 注册、登录与基础入口存在 UI/测试选择器漂移

核心注册流程中，E2E 找不到预期的 `individual student` 入口以及 S2/S3/S5 年级 radio。部分密码确认字段也因为新增 password reveal 控件后，label 同时命中输入框和按钮，触发 Playwright strict mode 错误。

影响：

- 新用户注册链路无法通过现有 E2E 证明。
- Demo/角色选择入口的可测试性下降。
- 目前无法判断是 UI 文案/结构有意更新，还是注册入口实际缺失。

建议责任：

- S01 app shell / 注册入口。
- S09 copy、i18n 与 accessible label。
- S11 E2E selector 维护。

### 2. 学生 lesson route 与旧标题断言大面积不一致

多个学生 lesson route 没有呈现测试预期的旧标题，包括：

- `Quadratic Functions`
- `Algebra Basics`
- `Circles`
- `Integers`
- `Polynomials`

影响：

- Lesson 页面端到端完成、Lesson-to-Practice 导航、Lesson 手写输入等测试被连锁阻断。
- 目前无法确认这些 slug 是否仍应存在、是否被新课程数据替换，或只是 E2E 仍引用旧 seed。

建议责任：

- S05 lesson lead 确认 lesson slug/title/current source of truth。
- S18 curriculum QA 判断内容替换是否符合课程验收。
- S11 更新或重建 lesson route 回归基线。

### 3. Practice Arena free-selection / filter combobox 阻断核心练习链路

多项测试在尝试解锁 free-selection 后，仍找不到 `difficulty` 或 `Question type` combobox。该问题影响范围较广：

- Practice 答题反馈与错题本流程无法完整验证。
- 手写板与拍照上传相关测试被阻断。
- SimpleTex/live OCR route smoke 未能进入 live provider 调用阶段。

影响：

- Practice Arena 是学生端核心功能，本问题应按高优先级处理。
- OCR provider 健康暂时无法判断，因为页面前置状态没有进入可测路径。

建议责任：

- S04 practice lead 排查 Practice UI 状态与筛选器显示条件。
- S15 adaptive engine lead 确认 adaptive locked/free-selection 解锁语义。
- S11 修正或拆分 E2E 前置解锁 helper。

### 4. 数学软键盘被固定遮罩层拦截

`math soft keyboard` 测试中，Playwright 点击数字键时被一个 `fixed inset-0 z-[160]` 遮罩层拦截，导致长时间重试后超时。

影响：

- 学生在某些状态下可能无法点击数学键盘按钮。
- 如果遮罩是 setup dialog 或 overlay 未正确关闭，可能属于真实交互阻断。

建议责任：

- S04 practice UI 检查 overlay lifecycle。
- S11 复核测试是否需要显式关闭 learner setup dialog。

### 5. Personalized Learning / Adaptive UI 选择器与导出年级不一致

US adaptive smoke 找不到 `section[aria-label="Adaptive knowledge galaxy"]`。另一个学习分析导出测试期望 `learning-analytics-S3.xlsx`，实际收到 `learning-analytics-S4.xlsx`。

影响：

- 个性化学习页面的当前结构与 E2E 预期不一致。
- 导出年级可能存在 session/settings 漂移，或测试对当前 demo 用户年级假设过旧。

建议责任：

- S02 dashboard/progress/adaptive display UI。
- S15 adaptive semantics。
- S11 更新测试对当前页面结构和年级设置的断言。

### 6. 移动端 Visualization Lab 入口按钮缺失或改名

移动端 smoke 在 `/student/tools/visualizations` 找不到以下按钮之一：

- `Explore all labs`
- `Explore my curriculum`
- `Explore other grades`

影响：

- 移动端学生无法通过现有 E2E 证明 Visualization Lab 的入口可用。
- 可能是按钮文案调整，也可能是移动端布局/折叠状态导致控件不可达。

建议责任：

- S06 visualization lead。
- S11 mobile regression maintenance。

### 7. California 学生课程与作业链路失败

California lesson seed 没有呈现预期标题 `California Grade 9: Equations from Context Lesson Module`。另一个 California assignment 流程中，Student Shirleen dashboard 找不到 `Teacher-assigned work` heading。

影响：

- California 学生课程页无法通过当前代表性 E2E。
- Teacher assignment 到 Student Shirleen 的跨角色可见性未能被证明。

建议责任：

- S05 California lesson content/layer。
- S02 student dashboard assignment display。
- S13 teacher assignment source behavior如需联动。
- S11 E2E baseline。

### 8. Mainland HJB / PEP roadmap 入口与语言/demo selector 漂移

HJB Learning Path 测试找不到预期 heading。Mainland PEP roadmap 多个测试在登录时卡住，找不到 Simplified Chinese toggle 或 US Student demo 按钮。

影响：

- Mainland PEP/HJB account-scoped roadmap 不能通过当前 E2E 证明。
- i18n/demo account 选择器漂移会阻断多课程、跨地区测试矩阵。

建议责任：

- S03 roadmap lead。
- S09 i18n/demo label。
- S11 test selector baseline。

### 9. Mainland PEP High lesson API 与插图资产存在明确失败

多项测试发现 `lesson.topic.publisher` 为 `undefined`，但期望为 `MAINLAND_PEP`。同时，高中代表 lesson 页面没有渲染预期的 `mainland-pep-high` 插图，实际图片数量为 0。

补充观察：

- 当前 dirty tree 中存在大量 `public/lesson-illustrations/mainland-pep-high/...` 删除项，与测试中缺失高中插图的结果相互印证。

影响：

- Mainland PEP High lesson API shape 与测试契约不一致。
- 高中课程插图层不能通过 release gate。
- 这类失败比单纯 selector drift 更接近真实内容/资产集成问题。

建议责任：

- S05 lesson lead。
- S18 curriculum QA。
- S21 content pipeline。
- S23 candidate-to-live integration。
- S24 illustration exact-layer。
- S12 如 API 契约确实要求返回 `topic.publisher`。

### 10. DeepSeek live text 未完成 provider 验证

DeepSeek live text harness 在 `npm run build` 阶段失败，原因是 dirty copied directory `MAIS-MVP-california-practice-beta-clean/` 被 TypeScript include 进构建，并触发 out-of-scope `LLMProviderName` 类型错误。

影响：

- `/api/ai-tutor/status` live DeepSeek 检查没有真正跑到 provider 调用。
- 不能说 DeepSeek 失败，也不能说 DeepSeek 通过。

建议责任：

- S22 release engineering 修复 build/dev-server isolation。
- S25 release intake 处理 dirty-tree copied app directory。
- S07 仅在 harness 能跑到 provider 后再判断 AI Tutor provider 行为。

### 11. SimpleTex/live OCR 未完成 provider 验证

OCR bug-hunt 在进入 Practice fill-in 前置状态时卡住，找不到 `Question type` combobox，最终超时。因此 live OCR rows 没有生成，SimpleTex 没有被有效验证。

影响：

- SimpleTex provider 健康状态仍为不确定。
- 前置 blocker 实际来自 Practice 页面状态/筛选器，不是 SimpleTex 返回失败。

建议责任：

- S04/S15/S11 先修复 Practice 前置状态。
- S19/S12 后续再验证 SimpleTex provider env 与 route behavior。

## 四、优先级判断

P1 级阻断：

1. Practice Arena filter/free-selection 状态不可达。
2. 注册/年级选择流程不可达或测试无法定位。
3. 学生 lesson route/title 大面积漂移。
4. Mainland PEP High 缺少 lesson 插图资产。
5. DeepSeek live harness 被 dirty-tree build isolation 阻断。

P2 级跟进：

1. Personalized Learning/adaptive selector 与导出年级漂移。
2. 移动端 Visualization Lab 入口按钮不可定位。
3. Mainland/US/HK demo account selector 和语言 toggle 漂移。
4. California assignment dashboard heading 漂移。

## 五、建议修复顺序

1. S22/S25 先隔离或排除 `MAIS-MVP-california-practice-beta-clean/`，否则 live-provider build harness 会继续被污染。
2. S04/S15/S11 优先修复 Practice unlock/filter 前置状态，因为它同时阻断核心 Practice、错题、手写板和 OCR provider smoke。
3. S05/S18/S21/S23/S24 解决 Mainland PEP High API/asset readiness，尤其是高中 lesson 插图缺失。
4. S01/S09/S11 重新校准注册、语言切换、demo account、password reveal 等 accessible selector。
5. S02/S15/S11 校准 Personalized Learning/adaptive UI 与学习分析导出年级。
6. 完成上述修复后，重新运行同一组五条 E2E 命令，确认红灯是否转绿。

## 六、结论

本轮学生端 E2E 失败不是单一 bug，而是多个产品面、内容面、测试基线和构建隔离问题叠加。当前最影响学生真实体验证明的是 Practice Arena、注册/课程入口、lesson 内容层和多课程资产/API 一致性。DeepSeek 与 SimpleTex 本轮没有形成 provider 结论，应在前置 blocker 修复后单独复测。
