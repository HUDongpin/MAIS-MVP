# A25 — Unicode 分支保管接替登记

- 登记时间：2026-10-20T12:47:01.667133+08:00（Asia/Hong_Kong）。
- 当前状态：**保管接替已获所有者批准并登记；必须保留该远端分支的旧条件已解除。**
- 执行边界：**暂不删除任何分支；旧 staging 分支继续保留。**
- 本登记是当前状态。原保留决定、原审议台账和恢复记录保留为历史证据，不回写、不覆盖。

## 本次明确授权

> 批准由现有完整档案接替 codex/a22-classroom-unicode-path-test-20260901 及其代管来源的历史保管，解除必须保留该远端分支的旧条件，并登记接替结果。暂不删除任何分支，旧 staging 分支继续保留。

## 精确保管对象

| 对象 | 原始 ref | 精确提交 | 提交树 |
| --- | --- | --- | --- |
| Unicode 分支 | `refs/heads/codex/a22-classroom-unicode-path-test-20260901` | `e08f7c3c41a933f4a906703a0371cccad37bf808` | `08ce1561b8bbee32e19afc37521324dc886cf463` |
| 此前代管、已退役的 forward-port 来源 | `refs/heads/codex/a22-classroom-load-staging-forward-port-20260830` | `9e68e54b314ed4bad4d501b9a830988463c8fa52` | `b5d86eb38b11561f770eb615f67e2a0a7e19e02c` |

新保管介质为 [现有完整档案](/Volumes/Starship/MAIS-classroom-branch-preservation-20261020-01a15749)。完整恢复单元必须同时保留：

1. `verified/inputs/complete-prerequisite.pack`，SHA-256 `b9869e8591fdf4504beb71ebaf53152f3b6947023995221f2849b09728911c86`。
2. `verified/targets/01-codex__a22-classroom-unicode-path-test-20260901/original-incremental.bundle`，SHA-256 `a24ee5f29f36290edb89a5f77bdc8cf935dcd2697f8dd8d83958141de2d3c7f9`。
3. 输入清单、精确来源映射、原始保留/退役回执、恢复结果和校验清单。前置 pack 同时被旧 staging 档案使用，不得在处置其他分支时丢弃这一共同依赖。

## 接替范围与核验依据

- 解除 [2026-10-05 保留记录](/Volumes/Starship/MAIS-MVP/coordination/release-intake/2026-10-05-A25-origin-next-four-candidates-01a106d2.md:27) 中针对 Unicode 后继的“必须保留远端引用”条件。
- 完整提交历史、原始来源身份、相关保管记录和回执的保存要求继续有效，由上述档案承接。
- AgentOps 和 Whisper 后继的保留条件未改变。
- 登记前重新校验了原档案 332 个已登记文件，全部匹配。Unicode 及代管来源的提交树匹配；Unicode 远端仍在精确提交 `e08f7c3c41a933f4a906703a0371cccad37bf808`。
- 已验证的独立恢复覆盖 1,071 个提交和 24,183 个 Git 对象，严格完整性检查通过；此次复用未变化的恢复证据，没有把它声称为新一轮应用验收。
- 档案与原仓库同在 Starship 磁盘。本次接替不声称已验证异盘备份，也不扩展为历史未提交/忽略文件的保管证明。

## 保留与后续操作边界

旧 staging 分支 `codex/classroom-load-staging-only-20260829` @ `23e393f09f56efcd6d0b9b592e103aaa49aa21a7` 继续保留。S7 身份连续性、S8 文件写入方式、S9 参数与报告契约仍待明确处置，尚未进入删除执行。

本次批准的是保管接替与旧条件解除，**没有授予删除权限**。本轮未删除远端或本地分支、未移除工作树、未实际 prune、未 stage/commit、未合并或部署。将来删除仍须新的精确操作授权及执行前复核。

## 当前记录入口

- [接替回执](/Volumes/Starship/MAIS-classroom-branch-preservation-20261020-01a15749/custody-succession/2026-10-20-owner-approved-unicode/receipt.json)
- [档案当前状态](/Volumes/Starship/MAIS-classroom-branch-preservation-20261020-01a15749/CUSTODY-CURRENT.json)
- [原始恢复证明](/Volumes/Starship/MAIS-classroom-branch-preservation-20261020-01a15749/verified/recovery-summary.json)
- 登记后的引用与文件保护核验保存为 `custody-succession/2026-10-20-owner-approved-unicode/post-registration-verification.json`。

项目登记文件保留为未提交的 A25 文档；这是本轮指定的唯一项目内新增文件。
