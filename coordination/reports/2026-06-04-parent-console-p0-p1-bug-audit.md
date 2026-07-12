# MAIS-MVP 本地家长端 P0/P1 Bug 穷举审计报告

- 日期: 2026-06-04
- 会话: S11 QA and release quality
- 目标: 本地 `/Users/dongpinhu/Desktop/MAIS-MVP` 家长端 P0/P1 bug 发现、根因分析、修复建议
- 范围: `/parent`、`/parent/children/[studentId]`、`/parent/reports`、`/parent/messages`、`/parent/notices`、`/parent/connect`、`/api/parent/*`、家长入口登录链路
- 写入范围: 仅 QA 报告、S11 日志、Playwright 证据；未修改功能代码

## 结论摘要

本轮没有发现家长端页面/API 的 P0。`npm run type-check` 通过，独立 `NEXT_DIST_DIR` production build 通过，家长端核心页面在桌面和移动端均能渲染，父子绑定、孩子摘要、报告、家校私信、通知回执的权限边界和主要写入路径通过本地探针。

确认 1 个 P1:

1. **P1-LOGIN-001: 登录表单在未 hydration / 无 JS / 快速提交时使用浏览器默认 GET，把 `username` 和 `password` 写入 URL，并阻断家长登录。**

该问题不只影响家长账户，但家长进入 `/parent` 必经 `/login?next=/parent`，因此属于家长端入口 P1。稳定等待 JS hydration 后，家长登录可以进入 `/parent`，所以本轮不定为 P0。

## Severity 口径

- P0: 构建/type-check 阻断、家长端整体不可用、核心数据泄露/损坏、跨家长读写权限失效。
- P1: 家长核心入口或关键工作流高概率失败；凭据/隐私泄露；高影响但有稳定绕过路径的问题。

## P1-LOGIN-001: 登录表单默认 GET 泄露密码并阻断快速家长登录

状态: 确认 P1。

### 复现步骤

本地独立 dev server:

```bash
http://127.0.0.1:49325
```

复现 A: 无 JS / hydration 前提交

1. 打开 `/login?next=%2Fparent`。
2. 禁用 JavaScript，或在页面刚 `domcontentloaded` 后立即填写。
3. 输入 `Peter's Parent` / `12345`。
4. 点击 `Log in`。

实际结果:

```text
http://127.0.0.1:49325/login?username=Peter%27s+Parent&password=12345
```

预期结果:

- 密码不能进入 URL、浏览器历史、Referer 或服务器访问日志。
- 如果 JS 尚未接管，表单也必须用安全的 POST fallback，或提交按钮应在 hydration 前不可提交。

### 证据

- `output/playwright/2026-06-04-parent-console-p0-p1/parent-console-targeted-reprobe.json`
  - `login form without JS does not expose password in URL`: fail，URL 包含 `password=12345`。
  - `fast hydrated login submit reaches parent without URL password leak`: fail，请求序列包含 `GET /login?username=...&password=12345`。
  - `stable JS login reaches parent`: pass，等待 `networkidle + 1s` 后进入 `/parent`。
- 截图:
  - `output/playwright/2026-06-04-parent-console-p0-p1/login-no-js-get-password-leak.png`
  - `output/playwright/2026-06-04-parent-console-p0-p1/login-fast-submit-result.png`
  - `output/playwright/2026-06-04-parent-console-p0-p1/login-stable-submit-result.png`
- 官方 `tests/e2e/parent-console.spec.ts` 指向独立 dev server 复跑时，首个用例失败在 `loginAsDemoParent()` 未进入 `/parent`，与快速提交/hydration race 相符。
- 服务器日志也出现 `GET /login?username=Peter%27s+Parent&password=12345 200`。

### 根因

`app/login/page.tsx` 的表单只依赖 React `onSubmit` 阻止默认提交:

- `app/login/page.tsx:323`: `handleSubmit` 调用 `event.preventDefault()`，但只在客户端 hydration 完成后生效。
- `app/login/page.tsx:442`: `<form onSubmit={handleSubmit} ...>` 没有 `method` 和 `action`。
- `app/login/page.tsx:447` 与 `app/login/page.tsx:471`: 输入框有 `name="username"` 和 `name="password"`。

因此在 hydration 前、JS 禁用、或用户/自动化点击太快时，浏览器按 HTML 默认行为提交表单: `method="GET"` 到当前 URL，导致密码进入 query string。

### 影响

- 家长入口登录失败，停留在 `/login?...password=...`。
- 密码进入浏览器地址栏、历史记录、dev server / reverse proxy 访问日志，以及潜在 Referer。
- 慢网络、低端移动设备、首屏首次编译、Playwright/用户快速操作都可能触发。

### 建议修复

Owner 路由: S01/S09 负责登录 UI 表单；S12 如需 API fallback；S11 负责回归验证。

推荐修法:

1. 给登录表单设置安全 fallback:
   - `<form method="post" action="/api/auth/login" onSubmit={handleSubmit}>`
   - 或使用专门的 server action / route handler 处理 `application/x-www-form-urlencoded` 登录。
2. 如果暂不做无 JS 登录，仍要阻止 URL 泄露:
   - 使用 `method="post"`，并让 fallback 返回安全错误页或 400。
   - 或让提交按钮在 hydration 前 disabled，hydrated 后再启用。
3. 扩展 `/api/auth/login` 兼容 `application/x-www-form-urlencoded`，或新增安全 `POST /login` fallback，避免无 JS 时 400。
4. 加回归:
   - JS disabled: 提交后 URL 不得包含 `password=`。
   - Fast submit after `domcontentloaded`: 不得产生 `GET /login?...password=...`。
   - Stable JS login: `Peter's Parent` 应进入 `/parent`。
   - `tests/e2e/parent-console.spec.ts` 的 login helper 应等待 hydration-ready signal，避免误把 race 掩盖成随机失败。

## P0 结果

未发现当前家长端 P0。

证据:

- `npm run type-check`: pass。
- 独立 production build: pass，家长端 route 全部进入构建表:
  - `/parent`
  - `/parent/children/[studentId]`
  - `/parent/connect`
  - `/parent/messages`
  - `/parent/notices`
  - `/parent/reports`
  - `/api/parent/*`
- API role boundary:
  - anonymous/student/teacher 访问 `/api/parent/foundation`、`/api/parent/reports`、`/api/parent/messages`、`/api/parent/notices` 均返回 403。
  - demo parent 返回 200。
- 页面矩阵:
  - desktop/mobile `/parent`、child detail、reports、messages、notices、connect 均渲染预期内容。
  - 未捕获 pageerror 或 5xx。

## 被复测推翻的 P1 候选

### 通知回执链路

初始合并探针里 `teacher notice appears for linked parent and ack respects parent boundary` 失败，但根因是探针选了 `teacher operations` 的第一个 class，不保证包含 demo 家长绑定的孩子。

复测使用 `parent foundation` 返回的 linked child class `class-s3a-2026` 后通过:

- teacher 创建 notice: 201。
- teacher send notice: 200。
- linked parent 可见 notice recipient。
- unrelated parent ack: 403。
- linked parent ack: 200。
- acknowledged count >= 1。

证据: `output/playwright/2026-06-04-parent-console-p0-p1/parent-console-targeted-reprobe.json`。

### Route matrix 的 401 console error

页面矩阵在 desktop/mobile 都记录到一个 console error:

```text
Failed to load resource: the server responded with a status of 401 (Unauthorized)
```

服务器日志显示这是登录/未登录阶段 `/api/me?includeLessonEntry=false` 的预期探测噪声；没有 pageerror、没有 5xx，家长页面内容均渲染。当前不定为 P0/P1。

### 官方 parent-console.spec 的第二个失败

`tests/e2e/parent-console.spec.ts` desktop 复跑结果:

- 6 tests total。
- 1 passed。
- 2 failed。
- 3 did not run。

第一个失败与 P1-LOGIN-001 一致。第二个失败发生在 `logoutIfVisible()` 等待 `/login`，本地 dev server 日志显示 `POST /api/auth/logout 200` 用时约 5.5s，超过 helper 的 5s URL expectation。当前判断为 dev-server 性能/test-timeout 候选，不足以定为家长端 P1。

## 通过的核心家长端覆盖

合并 API 探针覆盖并通过:

- demo parent/student/teacher 登录。
- `/api/parent/*` role boundary。
- linked child summary 可读，anonymous/student/teacher 被拒。
- demo parent 不能读另一个 parent 的 child summary。
- demo parent reports 不包含另一个 parent 的 child。
- student-only 私信不会进入 parent messages。
- parent messages 拒绝 invalid JSON、invalid category、invalid report。
- parent 创建家校私信成功。
- parent reply 支持正常回复、拒绝超长回复、拒绝其他 parent 跨线程回复。
- child invite code 大小写/空格 normalization。
- repeated child link idempotent。
- invalid message thread 不会回退选择无关 thread。

证据:

- `output/playwright/2026-06-04-parent-console-p0-p1/parent-console-p0-p1-probe-results.json`
- `output/playwright/2026-06-04-parent-console-p0-p1/parent-console-route-matrix.json`
- route screenshots under `output/playwright/2026-06-04-parent-console-p0-p1/`

## Checks

| Check | Result | Notes |
| --- | --- | --- |
| `git status --short` | Dirty tree observed | 大量其他会话/owner 改动存在；未 revert、未 stage。 |
| `npm run type-check` | Pass | 启动/清理后均通过。 |
| `NEXT_DIST_DIR=.s11-parent-audit-build-20260604 npm run build` | Pass | 独立 dist build，避免污染默认 `.next`。 |
| Parent API/browser custom probe | P1 found | 发现登录 GET 泄露；其他 parent API 边界通过。 |
| Parent route desktop/mobile matrix | Content pass | 12/12 route content pass；401 console 噪声非 P0/P1。 |
| `parent-console.spec.ts` desktop against independent dev server | 2 failed, 1 passed, 3 not run | 首个失败支持 P1-LOGIN-001；第二个为 logout helper/dev timeout 候选。 |

## 建议后续

1. S01/S09/S12 修复 P1-LOGIN-001，优先保证登录表单未 hydration 时不会 GET 泄露密码。
2. S11 增加/更新登录安全回归: no-JS、fast-submit、stable-submit。
3. 修复后重跑:
   - `npm run type-check`
   - `npm run build`
   - `PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=<fixed-local> npx playwright test tests/e2e/parent-console.spec.ts --project=desktop-chrome --project=mobile-chrome`
   - targeted no-JS login probe。
