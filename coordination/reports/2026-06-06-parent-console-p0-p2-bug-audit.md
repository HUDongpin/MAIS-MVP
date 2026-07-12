# MAIS-MVP 家长端 P0/P1/P2 Bug 穷举审计报告

- 日期: 2026-06-06
- 会话: S11 QA and release quality
- 范围: `/parent`、`/parent/reports`、`/parent/messages`、`/parent/notices`、`/parent/connect`、`/api/parent/*`、家长端多孩子工作流
- 写入范围: 仅本 QA 报告、S11 日志、`.tmp` 探针证据；未修改产品代码

## 结论

本轮未确认家长端 P0。当前较高风险集中在多孩子家庭的孩子焦点丢失、通知/消息深链失效，以及家长绑定码安全模型。

确认 10 个 P1/P2 bugs:

| ID | Severity | Area | Summary |
| --- | --- | --- | --- |
| PC-P1-001 | P1 | Child linking security | 家长绑定 invite code 可由 `studentId` 直接计算，缺少真正随机 secret。 |
| PC-P1-002 | P1 | Notices receipt | Parent-safe review lesson 通知显示 pending，但家长端没有确认回执按钮。 |
| PC-P1-003 | P1 | Multi-child navigation | 选中第二个孩子后点家长端导航，页面静默回到第一个孩子。 |
| PC-P2-004 | P2 | Notices filter | `/api/parent/notices?studentId=...` 和 `/parent/notices?studentId=...` 忽略 `studentId`。 |
| PC-P2-005 | P2 | Notices deep link | 通知外链生成 `recipientId`，但家长 notices 页面完全不消费该参数。 |
| PC-P2-006 | P2 | Messages deep link | `/api/parent/messages?thread=<second-child-thread>` 在多孩子家庭会默认第一个孩子并找不到该 thread。 |
| PC-P2-007 | P2 | Messages URL state | 点击消息 thread 只改客户端 state，不把 `thread` 写进 URL，刷新/分享/返回都会丢失选中线程。 |
| PC-P2-008 | P2 | Messages state mismatch | 在第二孩子消息页切换右侧发信孩子后，再点第二孩子 thread，当前线程内容消失。 |
| PC-P2-009 | P2 | Messages default scope | 多孩子家长直接进 `/parent/messages` 时只显示第一个孩子 thread，第二孩子消息被默认过滤。 |
| PC-P2-010 | P2 | Child link validation | `/api/parent/children/link` 接受非法 `relationship` 并静默写成 `guardian`。 |

## 主要证据

增强多孩子探针:

```bash
node .tmp/s11-parent-multichild-probe.mjs
```

最新通过的结构化结果:

- `.tmp/s11-parent-multichild-1780682411703/probe-results.json`
- `.tmp/s11-parent-multichild-1780682411703/messages-default-child-filter.png`
- `.tmp/s11-parent-multichild-1780682411703/messages-after-second-thread-click.png`

关键结果摘录:

- `navPreservesSelectedStudent.lostSelection: true`
- `noticesStudentIdFilter.leakedFirstChildNotice: true`
- `messageApiQueryScoping.secondThreadNoStudentQuery.selectedThreadId: null`
- `secondChildThreadVisibility.urlAfterSecondQueryClick` 没有 `thread=...`
- `secondChildThreadVisibility.losesThreadWhenComposeChildDiffers: true`
- `invalidRelationshipAccepted.status: 200`

E2E 复跑:

- `tests/e2e/parent-console.spec.ts`: 6 passed, 5 skipped, 1 failed。
- `tests/e2e/parent-console-stress.spec.ts`: 4 passed, 4 skipped, 2 failed。
- Stress 中 API auth/privacy/idempotent link、pending/revoked guardian link、并发 parent message persistence、same-SQLite preflight 通过；因此本轮未开 P0。

## Findings

### PC-P1-001: 家长 invite code 是可计算值，不是真随机 secret

状态: Confirmed。

复现/证据:

1. 探针注册第二个学生，未从教师 UI 读取任何 invite code。
2. 用 `SHA1("parent-link:" + studentId).slice(0, 6)` 计算 `MAIS-XXXXXX`。
3. POST `/api/parent/children/link` 成功把 demo parent 绑定到第二个学生。

根因:

- `lib/server/userStore.ts:1824`: `guardianInviteCodeForStudent(studentId)` 用 `studentId` 做 SHA1。
- `lib/server/userStore.ts:1825`: 只取 6 个 hex 字符，约 24-bit。
- `lib/server/userStore.ts:12171`: link API 先按 invite code 查已有 link。
- `lib/server/userStore.ts:12172`: 没有已有 link 时，直接对所有 student 用同一算法反推匹配。

影响:

知道或拿到 `studentId` 的人可以计算绑定码；如果 student id 出现在 URL、日志、截图或其他接口中，guardian 绑定不再依赖教师分发的 secret。

### PC-P1-002: Parent-safe review lesson 通知无法确认回执

状态: Confirmed by code path。

根因:

- `components/parent/ParentNoticesView.tsx:27`: `teacher-review-lesson` 通知被从 regular notices 过滤掉。
- `components/parent/ParentNoticesView.tsx:54`: parent-safe drafts 单独渲染。
- `components/parent/ParentNoticesView.tsx:66`: 只显示 `Receipt pending` / `Receipt confirmed` 文案。
- `components/parent/ParentNoticesView.tsx:96`: `Confirm receipt` 按钮只存在于 regular notices。

影响:

教师审核后的 parent-safe 讲评更新会产生 pending receipt，但家长端没有操作入口完成确认，教师侧统计会一直 pending。

### PC-P1-003: 家长导航丢失已选孩子焦点

状态: Confirmed。

复现:

1. 同一 parent 绑定两个孩子。
2. 打开 `/parent?studentId=<secondChildId>`。
3. Child focus 显示第二个孩子。
4. 点击左侧 `Reports`。

实际:

- URL: `/parent/reports`
- Child focus: `student-peter`
- 探针: `lostSelection: true`

预期:

导航到 `/parent/reports?studentId=<secondChildId>`，并继续显示第二个孩子。

根因:

- `components/parent/ParentShell.tsx:11`: nav href 都是静态 path。
- `components/parent/ParentShell.tsx:81`: Link 直接使用 `item.href`，没有保留当前 `studentId` query。
- `components/parent/ParentShell.tsx:50`: 没有 query 时默认第一个 linked child。

### PC-P2-004: 家长 notices 的 `studentId` filter 被忽略

状态: Confirmed。

复现:

1. 同一 parent 绑定两个孩子。
2. 分别给两个孩子所在班级发送 notice。
3. 请求 `/api/parent/notices?studentId=<secondChildId>`。

实际:

`actualSubjects` 同时包含:

- `S11 second-child notice ...`
- `S11 first-child notice ...`

根因:

- `app/parent/notices/page.tsx:6`: 页面声明接收 `studentId`。
- `app/parent/notices/page.tsx:9`: 调用 `getParentNoticeData(foundation.parent.id)` 时没有传入 `studentId`。
- `app/api/parent/notices/route.ts:7`: API GET 接收 request。
- `app/api/parent/notices/route.ts:11`: API 同样完全忽略 URL search params。
- `lib/server/userStore.ts:10664`: `getParentNoticeData(parentId)` 没有 selected student 参数。

影响:

ParentShell 显示了 Child focus，但 notices 页面/API 不按孩子过滤；多孩子家庭会看到与当前孩子无关的通知。

### PC-P2-005: 通知回执 deep link 生成 `recipientId`，但家长页面不处理

状态: Confirmed by code path。

根因:

- `lib/server/userStore.ts:10329`: `noticeAckLink()` 生成 `/parent/notices?recipientId=...`。
- `app/parent/notices/page.tsx:6`: 页面 searchParams 类型只有 `studentId`。
- `app/parent/notices/page.tsx:9`: 未读取 `recipientId`。
- `components/parent/ParentNoticesView.tsx:76`: UI 只按 notice 列表渲染，没有定位到指定 recipient。

影响:

WeCom/外部通知里的 “Confirm in MAIS” 链接不能聚焦目标回执，也不能直接呈现目标确认动作。通知多、孩子多时，家长可能确认错项或找不到对应项。

### PC-P2-006: Message `thread` deep link 在多孩子家庭失效

状态: Confirmed。

复现:

1. 同一 parent 绑定两个孩子。
2. 分别创建 first-child thread 和 second-child thread。
3. 请求 `/api/parent/messages?thread=<secondThreadId>`。

实际:

- `selectedChildId: student-peter`
- `selectedThreadId: null`
- `threadSubjects` 只包含 first-child thread。

预期:

仅凭合法 `thread` id 应能选中该 parent 可访问的 thread，或返回明确错误；不应静默切回第一个孩子。

根因:

- `lib/server/userStore.ts:11930`: `selectedParentChild()` 无 `studentId` 时默认 `children[0]`。
- `lib/server/userStore.ts:12029`: `visibleStudentIds` 因默认 selected child 变成第一个孩子。
- `lib/server/userStore.ts:12034`: selectedThread 只在已过滤 threads 中查找。

### PC-P2-007: 点击消息 thread 不更新 URL

状态: Confirmed。

复现:

1. 打开 `/parent/messages?studentId=<secondChildId>`。
2. 点击 second-child thread。

实际:

- thread 内容显示成功。
- URL 仍是 `/parent/messages?studentId=<secondChildId>`，没有 `thread=<threadId>`。

根因:

- `components/parent/ParentViews.tsx:299`: `reload(threadId)` 只 fetch API。
- `components/parent/ParentViews.tsx:353`: thread button `onClick={() => void reload(thread.id)}`，没有 `router.push` / URL state 更新。

影响:

刷新、复制链接、浏览器返回/前进无法保留当前 thread。

### PC-P2-008: 发信表单的 child state 会让已选 thread 消失

状态: Confirmed。

复现:

1. 打开 `/parent/messages?studentId=<secondChildId>`。
2. second-child thread 显示正常。
3. 在右侧 `Ask teacher` 表单把 child select 切到第一个孩子。
4. 再点左侧 second-child thread。

实际:

- `secondHeadingAfterComposeChildSwitch: false`
- `choosePlaceholderAfterComposeChildSwitch: true`
- 当前 thread 内容消失。

根因:

- `components/parent/ParentViews.tsx:289`: `studentId` state 同时服务于右侧发信表单。
- `components/parent/ParentViews.tsx:299`: `reload(threadId)` 复用这个 form state 构造 API query。
- `components/parent/ParentViews.tsx:301`: 如果表单 child 被改成 first child，点击 second child thread 会请求 `studentId=first&thread=second`。

### PC-P2-009: `/parent/messages` 默认只显示第一个孩子消息，其他孩子 thread 被隐藏

状态: Confirmed。

复现:

1. 同一 parent 绑定两个孩子，并分别创建 thread。
2. 直接打开 `/parent/messages`。

实际:

- `defaultFirstThreadButtonCount: 1`
- `defaultSecondThreadButtonCount: 0`
- `/api/parent/messages` 的 `threadSubjects` 只包含 first-child thread。

预期:

如果页面标题是整体 `Threads`，应显示全部 linked children 的 thread，或提供明确的 per-child scope/未读提示，避免家长漏看第二个孩子消息。

根因:

- `lib/server/userStore.ts:11934`: 无 query 时默认第一个孩子。
- `lib/server/userStore.ts:12029`: 默认孩子进入 `visibleStudentIds` 后过滤掉其他孩子。

### PC-P2-010: Child link API 接受非法 relationship 并静默改成 guardian

状态: Confirmed。

复现:

```json
POST /api/parent/children/link
{
  "inviteCode": "<valid-code>",
  "relationship": "grandparent-admin-typo"
}
```

实际:

- HTTP 200
- response link relationship: `guardian`
- 探针: `acceptedInvalidRelationship: true`

预期:

非法 enum 应返回 400，提醒客户端修正，不应静默改写家庭关系。

根因:

- `app/api/parent/children/link/route.ts:38`: 直接 cast `body.relationship as GuardianRelationship`。
- `lib/server/userStore.ts:12170`: 非法 relationship 被 fallback 成 `guardian`。

## 未计入 10 个 bugs 的复核项

- 2026-06-04 报告中的旧 `P1-LOGIN-001` “默认 GET 泄露 password” 在当前代码已被修掉: `app/login/page.tsx:472` 当前已有 `method="post" action="/api/auth/login"`，且 submit button 在 hydration 前 disabled。
- 当前 parent E2E 仍有 login URL timeout 失败；本轮把它记录为入口可靠性/冷启动性能风险，而不是纳入 10 个产品 bug，因为现有证据显示 API 首次编译/登录耗时可达 7-11s，且旧 GET 根因已不存在。
- Parent message create/reply 缺少提交中 disabled state、report dropdown 在切换发信孩子后可能没有刷新该孩子 reports；这两个是合理 P2 候选，但本轮未纳入 10 个已确认列表。

## Checks

| Check | Result | Notes |
| --- | --- | --- |
| `git status --short` | Dirty tree observed | 当前工作树有大量其他 owner/session 改动；未 revert、未 stage。 |
| `tests/e2e/parent-console.spec.ts` desktop/mobile | 6 passed, 5 skipped, 1 failed | 失败在 parent login URL expectation。 |
| `tests/e2e/parent-console-stress.spec.ts` desktop/mobile | 4 passed, 4 skipped, 2 failed | 页面 login helper 失败；API/privacy/restart/concurrency/preflight checks 通过。 |
| `.tmp/s11-parent-multichild-probe.mjs` | Pass | 产出 10 个 findings 的主要结构化证据。 |

## Owner Handoff

- S14: Parent UI should own Child focus propagation, notices rendering, messages URL/state behavior, and parent-safe receipt action.
- S12: Parent API/storage should own invite code entropy/model, `relationship` validation, `studentId`/`thread` query semantics, and notice filtering contract.
- S11: After fixes, add regression coverage for multi-child navigation, notices filtering/deep link, message thread deep link, compose-child mismatch, and invalid relationship rejection.
