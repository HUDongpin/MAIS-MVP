# A25 — PR134 / PR94 / PR91 / PR86 历史归档保管接替登记

- 登记时间：2026-10-20T21:30:57.479905+08:00，Asia/Hong_Kong。
- 状态：**evidence archive；完整历史保全、空仓库独立恢复验证、保管接替已完成。四条远端分支仍在，删除未授权、未执行。**
- 所有者明确授权本次保全和接替，并要求保留原始证据及未采纳状态，暂不删除。
- 仓库：`/Volumes/Starship/MAIS-MVP`；common Git：`/Volumes/Starship/MAIS-MVP/.git`。

## 精确对象

| 原 PR | origin 分支 | 精确提交 | 完整历史提交数 | main 外提交 |
| --- | --- | --- | ---: | ---: |
| PR134 | `archive/pr134-app-state-row-tables-20260823` | `e48c2a67e2f0208d4ed8aad4bb5e1feaaf8438ed` | 392 | 5 |
| PR94 | `archive/pr94-check-answer-fast-path-20260823` | `6c5ddfc46c0b3dff8af57e878d35e496ba777cb6` | 359 | 3 |
| PR91 | `archive/pr91-starship-migration-cleanup-20260823` | `d2ffff12aed07cf60ef790c1133c031f74be00a9` | 359 | 3 |
| PR86 | `archive/pr86-legal-accessibility-foundation-20260823` | `4a26ef985f1324bebeec72c8efe5ceb818cc0898` | 354 | 3 |

完整 tree 和原始引用映射见 [ref-map.json](/Volumes/Starship/MAIS-pr134-pr94-pr91-pr86-preservation-20261020-01a1591c/ref-map.json)。main 外提交表示原始 Git 历史差异，不是待实现功能数，也不是当前 main 不具备相似行为的证明。

## 已完成的保全和实际恢复

- 单个完整 bundle：`pr134-pr94-pr91-pr86-complete-history.bundle`，766970481 字节，四个原始 ref；无 prerequisite。
- SHA-256：`169f128ad40f899a874cdc22e9886f01b50d7b1e325ca71312454d1a3df2c712`。
- 合计 401 个不同提交、16877 个 Git 对象；四条历史共享祖先，逐条提交数不能直接相加。
- 独立脚本从全新空 bare 仓库开始，预检四个 tip 全部不存在；仅从本地 bundle 恢复，网络协议禁用，全局/系统 Git 配置禁用，未读取原项目对象库。
- 对象 ID/类型/大小、每条完整提交列表、tree 和递归文件树全部与源一致；main 外提交的原始 commit payload 逐字节匹配。严格 `git fsck --full --strict --no-reflogs` 通过。
- 恢复库无 alternates、shallow、promisor 或远端依赖。此处“独立”指独立于源仓库和网络，不声称另有人或另一个 agent 进行审查。
- 6 份本地原始关账/复核/清单文件逐字节保存并记录源路径和 SHA-256；另保存四个 PR 的当前 metadata、reviews、review comments、discussion、events、files、commits。

## 未采纳状态和保管接替

四个原 PR 仍为 CLOSED、未合并，head 与对应归档 tip 一致：

- PR134：共享持久化/快照并发和读取成本来源，旧包未作为整包接纳。
- PR94：SQLite hot-row/cache 优化和正确性修复来源，旧包未作为整包接纳。
- PR91：图片、报告与旧清理改动的混合来源，旧包未作为整包接纳。
- PR86：法律/无障碍草稿来源，保留未批准、不可因此发布的状态。

本登记只接替 [Stage C-D-E 原关账记录](/Volumes/Starship/MAIS-MVP/coordination/release-intake/2026-08-23-A25-stage-c-d-e-branch-pr-closure.md)及[原复核记录](/Volumes/Starship/MAIS-MVP/coordination/release-intake/2026-08-23-A25-stage-c-d-e-delta-revalidation.md)中这四条精确远端引用的恢复保管职责。原文、原 JSON、原 PR 处置记录保持不变；其他 archive 引用的保留要求不受影响。

完整历史和原始证据今后由此档案持续保管。整包未采纳、未合并及未批准状态不变，不代表功能全部进入 main，也不代表放弃潜在有效工作。未来采用代码仍需单独从当前 main 审查。没有执行旧测试、研究、provider、发布或法律审批流程。

## 精确删除准备清单

[exact-deletion-candidates.json](/Volumes/Starship/MAIS-pr134-pr94-pr91-pr86-preservation-20261020-01a1591c/exact-deletion-candidates.json)仅列上述四条：

- `technical_preservation_ready=true`
- `custody_succession_registered=true`
- `delete_authorized=false`
- `delete_performed=false`

登记前 live origin 为 53 条，main 为 `f573ac62c97cb0716054bc516f7d5136491ca002`；四条 tip 未变，无开放 PR head/base、本地同名分支/upstream 或注册工作树检出关联。删除前仍须获得这四条精确目标的明确授权，再重查 live SHA、PR 关联、档案及完整 ref-map。

## 保留范围与交付

源仓库未 stage、commit、merge、fetch、push、改配置或删除任何引用/工作树；Git 写入只发生在新档案目录的组装库和恢复库。项目中只新增本登记，保留未提交；其他既有文件、分支和工作树保持不变。

保全范围是完整已提交 Git 历史和所列原始证据；不声称保存历史未提交/ignored 文件或 Git 之外的外部资源。档案与源都在 Starship；未验证异盘或远端备份。

- [完整恢复说明](/Volumes/Starship/MAIS-pr134-pr94-pr91-pr86-preservation-20261020-01a1591c/README.md)
- [空仓库实际恢复证明](/Volumes/Starship/MAIS-pr134-pr94-pr91-pr86-preservation-20261020-01a1591c/recovery-summary.json)
- [原始记录映射及校验](/Volumes/Starship/MAIS-pr134-pr94-pr91-pr86-preservation-20261020-01a1591c/evidence/historical-records-manifest.json)
- [当前保管状态](/Volumes/Starship/MAIS-pr134-pr94-pr91-pr86-preservation-20261020-01a1591c/CUSTODY-CURRENT.json)
- [登记后复核](/Volumes/Starship/MAIS-pr134-pr94-pr91-pr86-preservation-20261020-01a1591c/evidence/post-registration-verification.json)
