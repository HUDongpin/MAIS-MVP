# A25 — 第三批七条归档远端删除回执

- 复核时间：2026-10-20T22:24:22.234994+08:00，Asia/Hong_Kong。
- 结果：PASS；仅删除明确授权的七条 origin 引用，46 → 39。
- 仓库/common Git：`/Volumes/Starship/MAIS-MVP`、`/Volumes/Starship/MAIS-MVP/.git`。

## 精确授权与对象

所有者明确授权仅删除第三批清单七条 origin 分支，执行前复核 SHA、档案校验和恢复库完整性，保留全部档案、本地分支及工作树，并继续 California 非 Git/ignored 材料的原保管要求。本次不包含其他分支、目录或证据清理。

| origin 分支 | 删除前实时 SHA |
| --- | --- |
| `archive/a05-15-bug-loop-wip-20260823` | `8c4d06ab2760b82b34ab2946d0688e75b8740e29` |
| `archive/a18-hk-all-math-lesson-qa-wip-20260823` | `47dc3395521044ac8728d790c90d30516b9c94fa` |
| `archive/a06-hk-visualization-labs-loop-wip-20260823` | `d5595131afb3028e769689998e7a67090865afae` |
| `archive/a06-china-visualization-labs-loop-wip-20260825` | `eedf0977047369a54ef4694201ecb647d713d090` |
| `archive/a23-closeouts-main-merge-20260823` | `543d8ec8b02eae0b42f0690d3929191c777adaac` |
| `archive/a23-closeouts-main-ready-20260823` | `66fddde4782b125c49f50c43348c1829ef8e1267` |
| `archive/a06-ca-visualization-labs-loop-wip-20260823` | `777f46db6ef16c209f3493f58ec1fb13df8daf94` |

## 验证结果

普通非强制 atomic push，退出 0；一次性命令级 pre-push 检查限定恰好七个删除目标及 Git 公布的原 SHA。无既有 hook 被替换，共享配置未改。

- 完整实时引用差异：删除恰好 7 条；新增 0 条，无关 SHA 变化 0 条。
- 远端 main 保持 `f573ac62c97cb0716054bc516f7d5136491ca002`。
- 20 条本地分支及 upstream、13 个注册工作树及元数据、主目录 HEAD/index/config、504 个既有 dirty 文件记录保持不变。
- 执行后 7 个 dirty 工作树、0 个 detached；未移除工作树、未实际 prune、未合并或部署。
- 111 项档案交付文件校验全部通过；恢复库严格 fsck 退出 0，七个 ref/commit/tree 匹配。
- Git 正常更新对应 origin 跟踪缓存，不等于删除任何本地 refs/heads。

## main 对齐状态

本地 main 为 `58f1c71b71c30f07d1269e9fe8cf5d7ac6f820df`，缓存 origin/main 为 `fd2138127bdfe56981835c754c8bf944eabe7fb2`，实时 main 为 `f573ac62c97cb0716054bc516f7d5136491ca002`。本地 main 相对实时 main：ahead 0、behind 40。本次未同步或改变本地 main；远端数量和 main 证明使用实时查询，不用缓存替代。

## 持续保管

[完整档案](/Volumes/Starship/MAIS-third-seven-archive-preservation-20261020-01a1591c/README.md)继续保留。bundle SHA-256 为 `2bbdde40cc93d163238f7236c15d51f12d2988bafcb82946b0c8b7e41be4c542`。原 CUSTODY-CURRENT.json、原接替登记与清单保留原字节；[新远端退役状态](/Volumes/Starship/MAIS-third-seven-archive-preservation-20261020-01a1591c/REMOTE-RETIREMENT-CURRENT.json)仅接替其中历史“远端仍在”状态，不改原始证据和未采纳决定。

本次重新检查已有恢复库，未新建恢复库。完整已提交历史仍可恢复为七个原始引用；两个 closeout 各自的完整合并图保留。档案与源同盘，未声称异盘备份。

California 非 Git/ignored 测量与授权材料、三份非 Git configs 的[原单独保管要求](/Volumes/Starship/MAIS-third-seven-archive-preservation-20261020-01a1591c/evidence/unresolved-physical-custody.json)继续有效。本次没有删除、移动或修改权限，也不宣称其现位置已核实或保管问题已解决；原路径在先前浅层检查中不可见，不构成清理许可。Git 历史恢复证明不包含这些非 Git 物理材料。

## 证据

- [删除回执](/Volumes/Starship/MAIS-third-seven-archive-preservation-20261020-01a1591c/remote-retirement/2026-10-20-third-seven-01a1591c/deletion-receipt.json)
- [完整引用比对](/Volumes/Starship/MAIS-third-seven-archive-preservation-20261020-01a1591c/remote-retirement/2026-10-20-third-seven-01a1591c/remote-comparison.json)
- [执行结果](/Volumes/Starship/MAIS-third-seven-archive-preservation-20261020-01a1591c/remote-retirement/2026-10-20-third-seven-01a1591c/push-result.json)
- [执行后拓扑](/Volumes/Starship/MAIS-third-seven-archive-preservation-20261020-01a1591c/remote-retirement/2026-10-20-third-seven-01a1591c/topology-after.txt)
- [main 对齐记录](/Volumes/Starship/MAIS-third-seven-archive-preservation-20261020-01a1591c/remote-retirement/2026-10-20-third-seven-01a1591c/main-alignment.json)

项目中只新增本回执，保留未提交。没有应用代码变更或业务测试；核验范围是远端引用、档案与既有本地状态。
