# A25 — CA60 九条 origin 远端删除回执

- 复核时间：2026-10-20T23:04:00.200232+08:00，Asia/Hong_Kong。
- 结果：PASS；仅删除九条明确授权远端引用，35 → 26。
- 仓库/common Git：`/Volumes/Starship/MAIS-MVP`、`/Volumes/Starship/MAIS-MVP/.git`。

所有者明确授权仅删除 CA60 九条，执行前复核 SHA/联合档案/恢复库，保留全部原始引用、身份、审查证据和执行限制及本地分支/工作树。其余 26 条仅授权审查，不授权删除。

| origin 分支 | 删除前实时 SHA |
| --- | --- |
| `codex/a07-natural-ca60-live-runner-v5-r3-20260826` | `00c4b37f3381427e9f44ab9cc1fad4d5d1350e2f` |
| `codex/a11-natural-ca60-v5-r10-review-identity-anchor-20260827` | `d9ab746bf3b4242a3439ea794ca1aab8a633e7b0` |
| `codex/a11-natural-ca60-v5-r2-review-20260826` | `916d2430ba7b7b057aea018c68acdf0a9a14b13c` |
| `codex/a11-natural-ca60-v5-r3-review-20260826` | `1bada03e41f140233fd49c2f7ebdbabf77c1dce0` |
| `codex/a11-natural-ca60-v5-r4-review-20260826` | `2bfd5ba703ecf1509a3ac47430fe6f06b80077f7` |
| `codex/a11-natural-ca60-v5-r5-review-20260826` | `311bc2ea99595fd6a52c52cc21bb19f83ff11f47` |
| `codex/a11-natural-ca60-v5-r6-review-20260826` | `5070a135ab4f02fb9d2fb33662c08abca46fca05` |
| `codex/a11-natural-ca60-v5-r9-review-identity-anchor-20260826` | `f84cbba8aab457208fa3474a439f144f9dc5eb62` |
| `codex/a22-natural-ca60-frame-readiness-exec-v5-20260826` | `481da7a7a518fc7df26e5fbc89e1b3334df737b5` |

普通非强制 atomic push 退出 0；一次性命令级 pre-push 限定恰好九个删除目标和公布的旧 SHA。无既有 hook 被替换，共享配置未改。

- 全量 live ref-map：恰好删除 9 条，新增 0 条，无关 SHA 变化 0 条。
- main 保持 `f573ac62c97cb0716054bc516f7d5136491ca002`。
- 20 条本地分支及 upstream、13 个注册工作树及元数据、主目录 HEAD/index/config、509 个既有 dirty 文件记录保持不变。
- 执行后 7 个 dirty、0 个 detached 工作树；未移除工作树、未实际 prune、未合并或部署。
- 511 项联合档案校验全部通过；已有恢复库严格 fsck 通过，九个 ref/commit/tree 匹配。
- 122 处身份引用对应的 34 个原始提交在恢复库仍可达；12 条身份/审查路径的 git log --all 历史与原冻结结果一致，执行前后均重新检查。

[联合完整档案](/Volumes/Starship/MAIS-ca60-nine-preservation-20261020-01a1591c/README.md)继续保留。bundle SHA-256 为 `40b254529d87b4e00f8336087a3fb4401f1622fac90aa8ad2ee79ef04aecfac1`。原始九个 ref 名及提交仍存在于独立恢复库和 bundle；只删除 origin 上的引用。原 CUSTODY-CURRENT.json、接替登记和清单保留原字节；[新远端退役状态](/Volumes/Starship/MAIS-ca60-nine-preservation-20261020-01a1591c/REMOTE-RETIREMENT-CURRENT.json)只接替其历史“远端仍在”的描述。

R2–R6 的原 DISCREPANCY、R9/R10 身份及 R11 仅限离线 registration 的 CONCURRED 继续保留。本次未运行旧 verifier/runner/scorer/provider/实验，未读写 reviewer 私钥，不改变科学决策/执行门禁。California 非 Git/ignored 物理材料原保管要求不变。

本次复核已有恢复库，没有重新创建；档案与源同盘，未声称异盘备份。Git 正常处理九条 origin 缓存不等于删除本地 refs/heads。

- [删除回执](/Volumes/Starship/MAIS-ca60-nine-preservation-20261020-01a1591c/remote-retirement/2026-10-20-ca60-nine-01a1591c/deletion-receipt.json)
- [完整远端引用差异](/Volumes/Starship/MAIS-ca60-nine-preservation-20261020-01a1591c/remote-retirement/2026-10-20-ca60-nine-01a1591c/remote-comparison.json)
- [命令结果](/Volumes/Starship/MAIS-ca60-nine-preservation-20261020-01a1591c/remote-retirement/2026-10-20-ca60-nine-01a1591c/push-result.json)
- [执行后拓扑](/Volumes/Starship/MAIS-ca60-nine-preservation-20261020-01a1591c/remote-retirement/2026-10-20-ca60-nine-01a1591c/topology-after.txt)

本回执为新增未提交文档；没有应用代码变更或业务测试。
