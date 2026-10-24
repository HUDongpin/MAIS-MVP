# A25 — Practice / Tutor 两条远端删除回执

- 复核时间：2026-10-20 21:15:33，Asia/Hong_Kong。
- 状态：PASS；仅两条获明确授权的 origin 远端引用已删除，55 → 53。
- 仓库及 common Git：`/Volumes/Starship/MAIS-MVP`、`/Volumes/Starship/MAIS-MVP/.git`。

## 精确授权与对象

所有者明确授权：“明确授权仅删除上述 Practice／Tutor 两条 origin 远端分支，保留完整档案、全部本地分支及工作树。完成后继续审查其余 14 条历史归档，先给清理清单。”后半项仅授权审查，不授权删除其他引用。

| origin 分支 | 删除前实时 SHA |
| --- | --- |
| `archive/a04-practice-two-doors-pre-review-20260823` | `f48f118c3da2e5396d5d6a49bd589272dbf264e0` |
| `archive/tutor-moderation-provider-pre-hardening-20260823` | `919d15eb78d54ad26919c2ce9a8cbfda2e75b1d9` |

## 验证结果

普通非强制 atomic push 删除，退出 0；命令级一次性 pre-push 检查限定恰好两个删除目标和 Git 公布的原始 SHA。无既有 pre-push hook 被覆盖，共享 Git 配置未修改。

- 完整 live ref-map：删除恰好 2 条，新增 0 条，无关 SHA 变化 0 条。
- 远端 main 保持 `f573ac62c97cb0716054bc516f7d5136491ca002`。
- 全部 20 条本地分支（含 upstream）、13 个注册工作树及元数据、主目录 HEAD/index/config、497 个既有 dirty 文件记录保持不变。
- 执行后 7 个 dirty 工作树、0 个 detached；未移除工作树，未实际 prune，未合并或部署。
- 原完整档案 120 项文件校验全部通过；独立恢复库严格 fsck 退出 0；两个 ref/commit/tree 匹配。
- 本回执是执行后新增的 A25 文档，保留未提交；Git 对两条 origin 跟踪缓存的正常更新不属于删除本地 refs/heads。

## 持续保管

[完整档案](/Volumes/Starship/MAIS-practice-tutor-archive-preservation-20261020-01a15856/README.md)继续保留。bundle SHA-256 为 `26ecd4e47ef19e149e0a14b2a7f7d8d1620e2c7ed8290df962c0dde07ba2c4ba`。本次没有重新创建恢复库，重新核验的是已有恢复库和所有交付文件。档案与源同盘，未声称异盘备份。

原 CUSTODY-CURRENT.json 和原登记保持原字节；[新远端退役状态](/Volumes/Starship/MAIS-practice-tutor-archive-preservation-20261020-01a15856/REMOTE-RETIREMENT-CURRENT.json)接替“远端仍在”的历史状态，完整历史和证据持续保留义务不变。远端引用删除不代表旧功能合并、验收或放弃。

## 证据

- [删除回执](/Volumes/Starship/MAIS-practice-tutor-archive-preservation-20261020-01a15856/remote-retirement/2026-10-20-practice-tutor-01a1591c/deletion-receipt.json)
- [完整引用比对](/Volumes/Starship/MAIS-practice-tutor-archive-preservation-20261020-01a15856/remote-retirement/2026-10-20-practice-tutor-01a1591c/remote-comparison.json)
- [命令执行结果](/Volumes/Starship/MAIS-practice-tutor-archive-preservation-20261020-01a15856/remote-retirement/2026-10-20-practice-tutor-01a1591c/push-result.json)
- [执行后拓扑](/Volumes/Starship/MAIS-practice-tutor-archive-preservation-20261020-01a15856/remote-retirement/2026-10-20-practice-tutor-01a1591c/topology-after.txt)

没有应用代码变更，未运行应用构建或业务测试；本次验证对象是引用变更、历史可恢复性和既有本地状态保护。
