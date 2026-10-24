# 历史文档与 Mars 档案索引（2026-10-23）

负责人：A10。基线：`00114a71813b589990e95a2ca44745c2650fa499`。本索引追加保存入口和历史回执关系；20 份原文档逐字保留，不重新签发内容批准、Promotion 或上线验收。

## 514 份原始材料的保管入口

- 档案 ID：`MAIS-uncommitted-514-archive-20261023-01a16956`。
- [Mars 档案说明](/Volumes/Mars/MAIS-uncommitted-514-archive-20261023-01a16956/README.md)、[逐文件清单](/Volumes/Mars/MAIS-uncommitted-514-archive-20261023-01a16956/manifest.json)、[SHA-256 清单](/Volumes/Mars/MAIS-uncommitted-514-archive-20261023-01a16956/SHA256SUMS)。
- 清单 SHA-256：`968b537b924bb0a0cc3ecd302961b0fa6a0c345932264bad0aea8fca4e33bc65`；514 份原件共 `761575888` bytes，原路径保留在 `original/` 下。
- [复制验证](/Volumes/Mars/MAIS-uncommitted-514-archive-20261023-01a16956/evidence/copy-verification.json)记录 514/514 大小及哈希一致、223 份 JSON 和 14 份 ZIP 通过检查。
- [独立恢复验证](/Volumes/Mars/MAIS-uncommitted-514-archive-20261023-01a16956/evidence/recovery-verification.json)：4 份原 Git bundle 加 1 份补充前置历史 bundle，在空仓库本地恢复；原始历史 8 个 ref、1,260 个不同提交、27,127 个对象与来源一致，严格 fsck 通过。恢复不依赖网络、alternates、shallow 或 promisor。
- [结构化文档清单](2026-10-23-A10-historical-document-index-01a16956.json)保存这 20 份文档的路径、大小、SHA-256 和档案映射。

档案在本机挂载的 Mars 上；这些绝对路径不保证其他机器可访问。19 份回执中引用的 142 处历史路径在本次检查时可达，文件哈希另存于[引用核验](/Volumes/Mars/MAIS-uncommitted-514-archive-20261023-01a16956/evidence/external-reference-verification.json)。所引用的外部档案仍按各自保管规则保留，本次未迁移全部外部 bundle、恢复仓库或 ignored 材料。

## 原始 A18 审查及冻结链接

- [2026-09-27 原始 A18 fresh review](../content-qa/2026-09-27-A18-successor-22-fresh-review.md)：SHA-256 `4a29cb13d5aeaa1fc4c5801678956ba4c6a418f70943353cf1ee9e85690750c1`，保留当时的 `needs-repair`。
- [既有修后 v2 审查](../integration/legacy-successor/attempt-008/inputs/reports/a18-content-review-v2.md)第 34 行引用上述原始文件及同一哈希。
- v2 原报告中的旧相对链接按冻结证据规则保留，原链接没有原地修复；本索引提供可解析的规范入口。没有向冻结 `inputs/` 目录加入新文件。
- 原 A23 v4 报告 `2026-09-28-A23-legacy-successor-activation-v4-review.md` 的同字节主分支副本是 [activation/a23-review.md](../integration/legacy-successor/activation/a23-review.md)；历史原路径也保存在本档案 `original/` 中。

## 保管登记与后续处置回执

各文档表述的“当前”“仍保留”“已删除”均属于原记录日期。下表只连接历史先后关系，不重新推断现在的远端状态，也不授权重复执行旧命令。

| 范围 | 保管接替登记 | 该批后续处置回执 |
| --- | --- | --- |
| AgentOps / Whisper | [2026-10-20-A25-agentops-whisper-custody-succession-01a15840.md](2026-10-20-A25-agentops-whisper-custody-succession-01a15840.md) | [2026-10-20-A25-agentops-whisper-origin-delete-01a15856.md](2026-10-20-A25-agentops-whisper-origin-delete-01a15856.md) |
| Practice / Tutor | [2026-10-20-A25-practice-tutor-custody-succession-01a15856.md](2026-10-20-A25-practice-tutor-custody-succession-01a15856.md) | [2026-10-20-A25-practice-tutor-origin-delete-01a1591c.md](2026-10-20-A25-practice-tutor-origin-delete-01a1591c.md) |
| PR134 / PR94 / PR91 / PR86 | [2026-10-20-A25-pr134-pr94-pr91-pr86-custody-succession-01a1591c.md](2026-10-20-A25-pr134-pr94-pr91-pr86-custody-succession-01a1591c.md) | [2026-10-20-A25-pr134-pr94-pr91-pr86-origin-delete-01a1591c.md](2026-10-20-A25-pr134-pr94-pr91-pr86-origin-delete-01a1591c.md) |
| Lesson / Next / OAuth | [2026-10-20-A25-lesson-next-oauth-custody-succession-01a1591c.md](2026-10-20-A25-lesson-next-oauth-custody-succession-01a1591c.md) | [2026-10-20-A25-lesson-next-oauth-origin-delete-01a1591c.md](2026-10-20-A25-lesson-next-oauth-origin-delete-01a1591c.md) |
| 第三批七条 | [2026-10-20-A25-third-seven-custody-succession-01a1591c.md](2026-10-20-A25-third-seven-custody-succession-01a1591c.md) | [2026-10-20-A25-third-seven-origin-delete-01a1591c.md](2026-10-20-A25-third-seven-origin-delete-01a1591c.md) |
| CA60 九条 | [2026-10-20-A25-ca60-nine-custody-succession-01a1591c.md](2026-10-20-A25-ca60-nine-custody-succession-01a1591c.md) | [2026-10-20-A25-ca60-nine-origin-delete-01a1591c.md](2026-10-20-A25-ca60-nine-origin-delete-01a1591c.md) |
| Knowledge Galaxy / kernel / HK / education | [2026-10-20-A25-galaxy-kernel-hk-education-custody-succession-01a1591c.md](2026-10-20-A25-galaxy-kernel-hk-education-custody-succession-01a1591c.md) | [2026-10-20-A25-kernel-hk-education-origin-delete-01a1591c.md](2026-10-20-A25-kernel-hk-education-origin-delete-01a1591c.md) |
| 暂停 QA 三条 | [2026-10-20-A25-paused-qa-three-custody-succession-01a1591c.md](2026-10-20-A25-paused-qa-three-custody-succession-01a1591c.md) | 本批没有删除回执；保留原暂停与未采纳状态 |
| Lehmann / Manim / trig content | [2026-10-20-A25-lehmann-manim-trig-content-custody-succession-01a1591c.md](2026-10-20-A25-lehmann-manim-trig-content-custody-succession-01a1591c.md) | [2026-10-20-A25-lehmann-manim-trig-content-origin-delete-01a1591c.md](2026-10-20-A25-lehmann-manim-trig-content-origin-delete-01a1591c.md) |
| Unicode | [2026-10-20-A25-unicode-custody-succession-01a15749.md](2026-10-20-A25-unicode-custody-succession-01a15749.md) | [2026-10-20-A25-unicode-origin-delete-01a15749.md](2026-10-20-A25-unicode-origin-delete-01a15749.md) |

Knowledge Galaxy 所在四条保管登记的删除回执仅涵盖 kernel、HK、education 三条；暂停 QA 的恢复运行、education 外部产物缺口、California 非 Git/ignored 材料和其他原保留条件继续按原记录约束。

## 验证与提交边界

2026-10-23 准备快照包含 20 份历史文档与本 Markdown/JSON 索引，共 22 个新增路径。原文档 SHA-256 与 Mars 档案一致。当时尚未暂存、提交或推送；后续提交状态以 Git 记录为准。大型备份和源 ZIP 不属于这 22 个文档路径。

应用构建/业务测试：Not run: documentation-only change。验证对象为文档一致性、索引、路径解析及档案完整性；不作当前发布或内容验收结论。

## 2026-10-24 追加引用核验

A25 重新核对了 514 份归档原件和本候选 20 份历史原文的哈希。补齐了上文原先缺失的档案 README 入口；未改写原始清单、原件或冻结审查。以下四个历史相对引用不属于本次 22 文件候选，规范入口指向保管原件；其中两份旧分支已跟踪文档按原提交字节补存到本轮证据目录：

| 历史文件 | 可解析归档入口 | SHA-256 |
| --- | --- | --- |
| `2026-10-05-A25-origin-next-four-candidates-01a106d2.md` | [归档原件](/Volumes/Mars/MAIS-uncommitted-514-archive-20261023-01a16956/original/coordination/release-intake/2026-10-05-A25-origin-next-four-candidates-01a106d2.md) | `c48eea95e4ef2538641aa2bad6310d26c07a677f4e8d657dc4c74fe354962ad4` |
| `2026-10-05-A25-origin-next-four-execution-01a106d2.json` | [归档原件](/Volumes/Mars/MAIS-uncommitted-514-archive-20261023-01a16956/original/coordination/release-intake/2026-10-05-A25-origin-next-four-execution-01a106d2.json) | `300ec80fca834c3ee4e9d07f2d8fcfb0ccb35da1b389386a5b3a1666a778963f` |
| `2026-08-23-A25-a04-practice-two-doors-evidence-archive.md` | [归档原件](/Volumes/Mars/MAIS-seven-worktree-closeout-20261024-01a16dfd/reference-sources/coordination/release-intake/2026-08-23-A25-a04-practice-two-doors-evidence-archive.md) | `69931dd834fc1ba27caac55fc8c5adefc9f6d93e05d2c2bf5d53a8bcd81c2ae4` |
| `2026-08-23-A25-tutor-moderation-provider-evidence-archive.md` | [归档原件](/Volumes/Mars/MAIS-seven-worktree-closeout-20261024-01a16dfd/reference-sources/coordination/release-intake/2026-08-23-A25-tutor-moderation-provider-evidence-archive.md) | `258e9a5ef9021a431bd94c44862734a0987cc5093fd95a7fa808e3c1a9a53711` |

原文中的相对链接继续保留为历史文本；上表和 JSON 的 `historical_reference_resolver` 提供追加式解析，不把旧决定重新宣布为当前批准。
