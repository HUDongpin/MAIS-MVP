# A25 — Lehmann / Manim / trig / content-train 远端删除回执

- 复核时间：2026-10-20T22:46:26.026004+08:00，Asia/Hong_Kong。
- 结果：PASS；仅四条明确授权 origin 引用删除，39 → 35。
- 仓库/common Git：`/Volumes/Starship/MAIS-MVP`、`/Volumes/Starship/MAIS-MVP/.git`。

所有者明确授权这四条精确删除，要求复核 SHA/档案并保留档案、本地分支及工作树。CA60 九条仅授权联合保全、恢复、接替和清单，不授权删除。

| origin 分支 | 删除前精确 SHA |
| --- | --- |
| `claude/focused-lehmann-5027fa` | `d9bf553ef864bbeb830e666bf8171bf90aad6106` |
| `codex/a06-mais-manim-v3-rc-20260823` | `766bfa7b05a0e61d26161486451488ded85aabba` |
| `codex/a06-trig-unit-wave-redesign-20260823` | `ae9a9f3c3f9d1b41a8c2f21258e3ce09624e954c` |
| `release/2026-08-25-content-train` | `5eb48e0ad6d2ac5aff55c6ceb1cb68e1cda38931` |

普通非强制 atomic push 退出 0；一次性命令级 pre-push 核对恰好四个目标及 Git 公布的原 SHA。无既有 hook 被替换、无共享配置修改。

- 完整 live ref-map：恰好删除 4 条、新增 0 条、无关 SHA 变化 0 条。
- main 保持 `f573ac62c97cb0716054bc516f7d5136491ca002`。
- 20 条本地分支及 upstream、13 个工作树及元数据、主目录 HEAD/index/config、507 个既有 dirty 文件记录保持不变。
- 7 个 dirty、0 个 detached 工作树；未删除本地分支/工作树、未实际 prune、未合并或部署。
- 77 项档案文件校验全部通过，已有恢复库严格 fsck 通过，四个 ref/commit/tree 匹配。

[完整档案](/Volumes/Starship/MAIS-lehmann-manim-trig-content-preservation-20261020-01a1591c/README.md)继续保留，bundle SHA-256 为 `39b618b365dae2d705bbcd66f795657ba32d9af9ca2d4c6f7b013b9c0e2d54ba`。原记录不回写，[新的远端退役状态](/Volumes/Starship/MAIS-lehmann-manim-trig-content-preservation-20261020-01a1591c/REMOTE-RETIREMENT-CURRENT.json)仅接替“远端仍保留”的历史状态。原 WIP 未采纳状态和旧发布例外/未 promotion 限制继续有效；档案与源同盘，不声称异盘备份。

本次核验已有恢复库，未重新恢复。Git 正常处理四条 origin 跟踪缓存不等于删除本地 refs/heads。California 非 Git/ignored 保管要求不受影响。

- [删除证明](/Volumes/Starship/MAIS-lehmann-manim-trig-content-preservation-20261020-01a1591c/remote-retirement/2026-10-20-four-historical-01a1591c/deletion-receipt.json)
- [完整引用差异](/Volumes/Starship/MAIS-lehmann-manim-trig-content-preservation-20261020-01a1591c/remote-retirement/2026-10-20-four-historical-01a1591c/remote-comparison.json)
- [执行结果](/Volumes/Starship/MAIS-lehmann-manim-trig-content-preservation-20261020-01a1591c/remote-retirement/2026-10-20-four-historical-01a1591c/push-result.json)
- [执行后拓扑](/Volumes/Starship/MAIS-lehmann-manim-trig-content-preservation-20261020-01a1591c/remote-retirement/2026-10-20-four-historical-01a1591c/topology-after.txt)

本回执为新增未提交文档；未修改应用代码或执行业务测试。
