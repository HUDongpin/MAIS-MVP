# A25 — Unicode origin 远端分支删除回执

- 登记时间：2026-10-20T13:07:48.996404+08:00（Asia/Hong_Kong）。
- 结果：**已成功删除唯一授权的远端引用，执行后验证通过。**
- 远端数量：**57 → 56**；0 新增引用、0 无关引用 SHA 变化。
- 原保管接替继续有效，全部既有档案保留。

## 本次精确授权

> 明确授权仅删除 origin 远端分支 codex/a22-classroom-unicode-path-test-20260901。执行前确认提交仍为 e08f7c3c41a933f4a906703a0371cccad37bf808，且接替档案校验通过；保留旧 staging、其他远端分支、全部本地分支、工作树及档案，完成后登记删除回执。

本次授权仅执行一次并已完成。没有剩余获准删除项，不扩展到本地分支、工作树、其他远端引用、档案、合并或部署。

## 实际删除对象与执行证据

| 字段 | 值 |
| --- | --- |
| 仓库 | `/Volumes/Starship/MAIS-MVP` |
| 公共 Git 目录 | `/Volumes/Starship/MAIS-MVP/.git` |
| 远端 | `origin` |
| 唯一删除 ref | `refs/heads/codex/a22-classroom-unicode-path-test-20260901` |
| 删除前实时 SHA | `e08f7c3c41a933f4a906703a0371cccad37bf808` |
| 原提交树 | `08ce1561b8bbee32e19afc37521324dc886cf463` |
| 操作开始 | 2026-10-20T13:05:17.637420+08:00 |
| 操作结束 | 2026-10-20T13:05:22.340126+08:00 |
| 操作退出码 | 0 |
| 执行后复核 | 2026-10-20T13:06:24.076706+08:00 |

使用普通、非强制的原子删除。临执行的实时 ref-map 与预检完全一致；附加的单次 pre-push 检查确认 Git 实际公布的旧 SHA 仍是授权值，且待更新列表恰好只有该删除。原仓库没有既有 pre-push hook，检查仅通过单次命令配置启用，没有修改共享 Git 配置。

完整命令、输出及退出码见 [执行记录](/Volumes/Starship/MAIS-classroom-branch-preservation-20261020-01a15749/remote-retirement/2026-10-20-unicode-01a15749/push-result.json)。执行前后完整引用比对见 [实时比对](/Volumes/Starship/MAIS-classroom-branch-preservation-20261020-01a15749/remote-retirement/2026-10-20-unicode-01a15749/remote-immediate-comparison.json)。

## 保管和保留范围

- 接替档案及先前登记共 **340 个文件记录**在执行前后全部通过校验，恢复库严格完整性检查通过。共同前置历史 pack、Unicode 精确增量 bundle、原始来源映射与回执均保留。
- 已删除的旧 forward-port 来源 `9e68e54b314ed4bad4d501b9a830988463c8fa52` 仍由完整档案保管。
- 旧 staging 分支 `codex/classroom-load-staging-only-20260829` 仍为 `23e393f09f56efcd6d0b9b592e103aaa49aa21a7`，继续保留。
- 其他 56 条 `origin` 引用均保持原 SHA；其中 `main` 保持 `f573ac62c97cb0716054bc516f7d5136491ca002`。
- **19 个本地分支**名称和 SHA 全部不变；**15 个注册工作树**、实际目录及 14 个关联元数据记录保持不变。仍有 8 个 dirty 工作树、0 个 detached 工作树。
- 主目录 HEAD、索引、共享配置、原有 tracked diff 和 dirty 文件清单保持不变。此次新增的项目删除回执单独保留为未提交文档。
- Git 按普通 push 行为移除了对应的 `refs/remotes/origin/...` 缓存；这不是本地 `refs/heads` 分支删除。没有执行额外的 fetch/prune 或本地引用清理。
- 未删除档案、未移除工作树、未实际 prune、未 stage/commit、未合并或部署。

本轮仅执行远端引用退役及登记，没有应用代码变更，因此没有重跑应用测试或构建。

## 当前状态与历史记录

[本次删除回执](/Volumes/Starship/MAIS-classroom-branch-preservation-20261020-01a15749/remote-retirement/2026-10-20-unicode-01a15749/deletion-receipt.json) 与 [当前远端退役状态](/Volumes/Starship/MAIS-classroom-branch-preservation-20261020-01a15749/REMOTE-RETIREMENT-CURRENT.json) 是本次操作后的状态入口。

先前 `CUSTODY-CURRENT.json` 及保管接替回执保留原字节，仍表示其登记时点的状态；本次明确授权及删除结果仅覆盖其中 Unicode 引用的“仍在远端、尚未授权删除”描述。原保管接替本身继续有效，其他分支的保留决定未改变。

执行后完整保留证明见 [最终核验](/Volumes/Starship/MAIS-classroom-branch-preservation-20261020-01a15749/remote-retirement/2026-10-20-unicode-01a15749/postflight-verification.json)。新增回执自身的文件校验清单保存于本操作目录的 `SHA256SUMS.txt`。
