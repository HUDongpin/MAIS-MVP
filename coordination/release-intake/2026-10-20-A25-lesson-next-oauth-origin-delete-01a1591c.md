# A25 — Lesson / Next / OAuth 三条远端删除回执

- 复核时间：2026-10-20T21:51:53.663734+08:00，Asia/Hong_Kong。
- 结果：PASS；仅删除三条获明确授权的 origin 引用，49 → 46。
- 仓库/common Git：`/Volumes/Starship/MAIS-MVP`、`/Volumes/Starship/MAIS-MVP/.git`。

## 精确授权与对象

所有者明确授权仅删除 Lesson/Next/OAuth 三条，执行前复核精确 SHA 和档案完整性，保留完整档案、全部本地分支及工作树。第三批七条仅授权保全、恢复、接替与清单，不授权删除。

| origin 分支 | 删除前实时 SHA |
| --- | --- |
| `archive/lesson-remove-viz-completion-wip-20260823` | `93cefbd1c0fa101e7d26a1fb7bab2d70fe32978d` |
| `archive/next16-3-parity-hold-20260823` | `02a6145dd9ccac86c7f4f4571a32ae9eac14f6d8` |
| `archive/google-oauth-loop-blocked-20260823` | `22d7c0f645837f8e1ef2094fdacb037879eb37af` |

## 验证结果

普通非强制 atomic push，退出 0；命令级一次性 pre-push 检查只允许这三个删除目标及 Git 公布的精确原 SHA。无既有 hook 被替换，共享配置未修改。

- 完整实时引用差异：恰好删除 3 条，新增 0 条，无关 SHA 变化 0 条。
- 远端 main 保持 `f573ac62c97cb0716054bc516f7d5136491ca002`。
- 20 条本地分支及 upstream、13 个注册工作树及元数据、主目录 HEAD/index/config、502 个既有 dirty 文件记录保持不变。
- 仍有 7 个 dirty、0 个 detached 工作树；未移除工作树，未实际 prune，未合并或部署。
- 60 项档案交付文件校验全部通过，恢复库严格 fsck 通过，三个 ref/commit/tree 匹配。
- Git 对三条 origin 跟踪缓存的正常处理不等于删除本地 refs/heads。

## 持续保管

[完整档案](/Volumes/Starship/MAIS-lesson-next-oauth-preservation-20261020-01a1591c/README.md)继续保留，bundle SHA-256 为 `ca757a77f35d44767ab48df5963763cbe15c4ab9b18d2b5f582b573f8e3354a7`。原 CUSTODY-CURRENT.json、接替登记和清单保持原字节；[新的远端退役状态](/Volumes/Starship/MAIS-lesson-next-oauth-preservation-20261020-01a1591c/REMOTE-RETIREMENT-CURRENT.json)只接替历史“远端仍在”状态。

原始 WIP/HOLD/blocked 及未采纳状态不变。本轮再次核验已有恢复库，没有重新恢复。档案与源同盘，未声称异盘备份。

## 证据

- [删除回执](/Volumes/Starship/MAIS-lesson-next-oauth-preservation-20261020-01a1591c/remote-retirement/2026-10-20-lesson-next-oauth-01a1591c/deletion-receipt.json)
- [完整引用比对](/Volumes/Starship/MAIS-lesson-next-oauth-preservation-20261020-01a1591c/remote-retirement/2026-10-20-lesson-next-oauth-01a1591c/remote-comparison.json)
- [执行结果](/Volumes/Starship/MAIS-lesson-next-oauth-preservation-20261020-01a1591c/remote-retirement/2026-10-20-lesson-next-oauth-01a1591c/push-result.json)
- [执行后拓扑](/Volumes/Starship/MAIS-lesson-next-oauth-preservation-20261020-01a1591c/remote-retirement/2026-10-20-lesson-next-oauth-01a1591c/topology-after.txt)

本回执是执行后新增未提交文档。没有应用代码变更或业务测试；核验范围为引用、档案和原本地状态。
