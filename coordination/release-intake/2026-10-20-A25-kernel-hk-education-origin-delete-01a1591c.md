# A25 — cube/math-kernel、HK safe-closeout、education 三条远端删除回执

- 复核时间：2026-10-20T23:36:44.245953+08:00，Asia/Hong_Kong。
- 结果：PASS；仅三条明确授权引用删除，26 → 23；Knowledge Galaxy 远端保留。
- 仓库/common Git：`/Volumes/Starship/MAIS-MVP`、`/Volumes/Starship/MAIS-MVP/.git`。

所有者明确授权仅删除以下三条，要求先复核 SHA/档案并保留全部档案、本地分支/工作树及 education 外部产物缺口责任。三条暂停 QA 分支仅授权保全/恢复/接替和清单，不授权删除或恢复运行。

| origin 分支 | 删除前实时 SHA |
| --- | --- |
| `codex/a06-cube-midpoint-plane-proof-20260824` | `9672762593407d19df3746f4d361d2c10905f01d` |
| `codex/a18-hk-safe-closeout-20260822` | `80f927ceee90e825e57093f810a6ab4fac63feee` |
| `feat/education-capabilities-v1` | `58deda7fde9d76026aa18b31773d6d4054b37730` |

普通非强制 atomic push 退出 0；一次性命令级 pre-push 限定恰好三个目标及公布的旧 SHA。无既有 hook 被替换、共享配置未修改。

- 全量 live ref-map：仅删除 3 条，新增 0 条，无关 SHA 变化 0 条。
- main 保持 `f573ac62c97cb0716054bc516f7d5136491ca002`；Knowledge Galaxy 保持 `3ca7e514b7ec279333e4231d4aa33427ac13aeca`。
- 20 条本地分支及 upstream、13 个注册工作树及元数据、主目录 HEAD/index/config、512 个既有 dirty 文件记录保持不变。
- 7 个 dirty、0 个 detached 工作树；未实际 prune、未删除本地分支/工作树、未合并或部署。
- 106 项档案文件校验全部通过，已有恢复库严格 fsck 通过，全部四个原 ref/commit/tree 保留且匹配，包括 Knowledge Galaxy。

[完整档案](/Volumes/Starship/MAIS-galaxy-kernel-hk-education-preservation-20261020-01a1591c/README.md)继续保留；bundle SHA-256 为 `c0bd9dbf0cb33f454d551fe3123303c46dbc2b65966600080517360df372fa68`。math-kernel tarball 与原始证据继续保管；原登记和清单不回写，[新退役状态](/Volumes/Starship/MAIS-galaxy-kernel-hk-education-preservation-20261020-01a1591c/REMOTE-RETIREMENT-CURRENT.json)仅接替三条 origin 状态。

education 四个原 ZIP/精确外部验证报告未恢复的[缺口记录](/Volumes/Starship/MAIS-galaxy-kernel-hk-education-preservation-20261020-01a1591c/evidence/education-external-artifact-gap.json)及持续追踪责任不变，不因删除 ref 而解除。Knowledge Galaxy 的 groups-first 4.0 已在远端/本地 main；保留原分支是历史原型/旧版来源保管，本轮不删除它。

原未采纳/历史审查状态、California 非 Git/ignored 物理材料要求不变。没有运行 QA、数学/应用测试或 provider；本次核验已有恢复库，没有重建恢复库。档案与源同盘，不声称异盘备份。

- [删除回执](/Volumes/Starship/MAIS-galaxy-kernel-hk-education-preservation-20261020-01a1591c/remote-retirement/2026-10-20-kernel-hk-education-01a1591c/deletion-receipt.json)
- [完整引用差异](/Volumes/Starship/MAIS-galaxy-kernel-hk-education-preservation-20261020-01a1591c/remote-retirement/2026-10-20-kernel-hk-education-01a1591c/remote-comparison.json)
- [执行结果](/Volumes/Starship/MAIS-galaxy-kernel-hk-education-preservation-20261020-01a1591c/remote-retirement/2026-10-20-kernel-hk-education-01a1591c/push-result.json)
- [执行后拓扑](/Volumes/Starship/MAIS-galaxy-kernel-hk-education-preservation-20261020-01a1591c/remote-retirement/2026-10-20-kernel-hk-education-01a1591c/topology-after.txt)

新增本回执保留未提交。Git 对三个 origin 跟踪缓存的正常处理不等于删除本地 refs/heads。
