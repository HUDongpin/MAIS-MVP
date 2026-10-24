# A25 — AgentOps 与 Whisper 历史保管接替登记

- 登记日期：2026-10-20，Asia/Hong_Kong。
- 负责人：A25；只读辅助核对：historical_custody_review。
- 处置状态：**evidence archive；完整 Git 历史与保管记录已由独立可恢复档案接替，旧决定中必须依靠这两条远端分支保管历史的条件解除。**
- 本次依据：所有者要求处理这两条历史保管分支，先完成“完整可恢复档案接替其保管职责”，再调整原保留决定。本登记仅落实这一保管接替范围。
- **两条远端分支仍保留；本次没有执行、也不视为已获授权执行远端删除。**
- 原始登记、执行回执及旧 QA 规则拷贝决定保留原样；本文件是新增的当前状态记录。

## 精确保管对象

| 对象 | 原始 branch（`origin` 的 `refs/heads/` 下） | 完整提交 | 提交树 |
| --- | --- | --- | --- |
| AgentOps 后继 | `codex/a10-agentops-suite-currentness-20260828` | `2e95fcc9dbcae2b73227c7fb16553bf17e991265` | `d8a9724da609d379885ecf53ebf455e5c52b4db7` |
| AgentOps 原始来源 | `codex/a10-agentops-v1-20260827` | `150ded76db7d64c368e5db7e6cb30f3d90d40f78` | `2c79946fa790e33a896a204fe213fa5a072a04e9` |
| QA Skill 原始来源 | `codex/a10-qa-skill-distillation-20260827` | `a49914a4dc34212354a64dbcad13c28f899c3782` | `fe0740986e958079cd5ec893f33904eb2333b153` |
| Whisper 后继 | `codex/llm-whisper` | `9fd2aabb1e1f0bddeebfbb597261ccae4373982e` | `9c7b1fded3d1930ae2e13c22369c4f8e4a8464c9` |
| Edulab 原始来源 | `codex/edulab-mais` | `a0a325f18d36a7ae8a0e84706813e7feaf86ccd9` | `9b998b001b4829f4b6262056bccb206f3f5c435c` |

三条原始来源中，AgentOps、QA 的历史由 AgentOps 后继包含，Edulab 的历史由 Whisper 后继包含；三项祖先关系均重新核验通过。档案为五个入口分别保留原始 ref 名和完整历史。QA 的内部来源提交 `e33bf615846b708edf8339a4a82c6b760574c349` 亦完整可恢复。

## 新保管介质与恢复结果

档案目录：[MAIS-historical-branch-preservation-20261020-01a15840](/Volumes/Starship/MAIS-historical-branch-preservation-20261020-01a15840)。

- 完整 bundle：`historical-sources-complete.bundle`，725,007,075 字节。
- SHA-256：`5ca958382898989aacd57a33a1a792359e7ee8b664b4d154384fcc65e6655631`。
- 无 prerequisite；无须旧仓库、外部对象库、前置 pack 或远端下载即可恢复。
- 2026-10-20 15:46（Asia/Hong_Kong）完成空仓库 `git bundle verify`、从 bundle 导入独立 bare 仓库、`git fsck --full --strict --no-reflogs`，全部退出 0。
- 恢复结果：**5 个精确 ref、1,031 个不同提交、24,112 个 Git 对象**。
- 全部对象 ID／类型／大小清单完全一致；五个 tip 的 SHA、tree、递归文件树及完整提交列表均与原始对象逐项相同。
- `recovery.git` 不含 alternates、shallow、promisor 依赖；恢复过程未连接网络。
- 同时逐字节保留七份旧保管记录、执行回执和来源记录，来源及 SHA-256 见档案内清单。

保管对象包括完整已提交 Git 历史与所列七份记录。旧 QA `.skill` 二进制包、安装备份、历史未提交文件和 ignored AgentOps 运行目录不在本次已恢复的 Git 历史范围内；本登记不声称已保管它们。`A10-rule-copy-preserve-and-align` 旧批次没有因此被执行、完成或取消。

档案位于 Starship，与原仓库同盘；本次没有验证异盘或远端备份。

## 对原决定的接替

接替 [2026-10-05 原保留登记](2026-10-05-A25-origin-next-four-candidates-01a106d2.md) 中针对 AgentOps 后继和 Whisper 后继的历史保管要求；对应 [原删除执行回执](2026-10-05-A25-origin-next-four-execution-01a106d2.json) 与来源映射不变。

新条件是持续保留上述完整 bundle、精确 ref 映射、旧回执副本、校验清单和恢复说明。以后不得因清理其他分支而丢弃本档案。原先“必须保留两条远端分支才能保证历史可恢复”的依赖已被独立档案替代；实际删除仍是单独的精确 Git 操作。

比较基线为本次 live `main`：`f573ac62c97cb0716054bc516f7d5136491ca002`。AgentOps 仍有 15 个、Whisper 仍有 2 个原始提交不在该 main 历史中；本接替不是 merge、功能采纳、旧工作放弃或运行验收。

## 操作边界与证据入口

本次新增这一个项目内登记文件，保留未提交。未改旧保留文件，未 stage／commit／merge／push，未删除远端或本地分支，未移除工作树，未实际 prune，未部署。恢复用 bare 仓库仅在外部档案目录内，不登记为项目工作树。

- [档案说明与恢复命令](/Volumes/Starship/MAIS-historical-branch-preservation-20261020-01a15840/README.md)
- [完整恢复证明](/Volumes/Starship/MAIS-historical-branch-preservation-20261020-01a15840/recovery-summary.json)
- [精确 ref 与原始提交映射](/Volumes/Starship/MAIS-historical-branch-preservation-20261020-01a15840/ref-map.json)
- [当前保管状态](/Volumes/Starship/MAIS-historical-branch-preservation-20261020-01a15840/CUSTODY-CURRENT.json)
- [登记后保护与远端复核](/Volumes/Starship/MAIS-historical-branch-preservation-20261020-01a15840/evidence/post-registration-verification.json)

应用构建和业务测试未运行：本轮仅处理 Git 历史保管与登记，验证对象是完整性和实际恢复能力。
