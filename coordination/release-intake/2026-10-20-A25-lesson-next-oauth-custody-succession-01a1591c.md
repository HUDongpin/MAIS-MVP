# A25 — Lesson / Next / OAuth 第二批历史归档保管接替登记

- 登记时间：2026-10-20T21:44:49.165751+08:00，Asia/Hong_Kong。
- 状态：**evidence archive；完整历史保全、空仓库恢复验证、保管接替完成。第二批三条远端仍保留，未授权或执行删除。**
- 授权：完成第一批四条删除后，处理第二批的完整历史保全、空仓库恢复和保管接替，先给精确删除清单，暂不删除第二批。
- 仓库及 common Git：`/Volumes/Starship/MAIS-MVP`、`/Volumes/Starship/MAIS-MVP/.git`。

## 精确对象

| 对象 | origin 分支 | 精确 SHA | 完整历史提交数 | 原变更路径端点 |
| --- | --- | --- | ---: | ---: |
| lesson | `archive/lesson-remove-viz-completion-wip-20260823` | `93cefbd1c0fa101e7d26a1fb7bab2d70fe32978d` | 357 | 14 |
| next | `archive/next16-3-parity-hold-20260823` | `02a6145dd9ccac86c7f4f4571a32ae9eac14f6d8` | 379 | 29 |
| oauth | `archive/google-oauth-loop-blocked-20260823` | `22d7c0f645837f8e1ef2094fdacb037879eb37af` | 383 | 57 |

完整 tree、源分支、原始 parent、提交列表和路径映射见 [ref-map.json](/Volumes/Starship/MAIS-lesson-next-oauth-preservation-20261020-01a1591c/ref-map.json)。Next 的 29 个端点对应原 28 个 Git 变更项，`middleware.ts → proxy.ts` 的旧、新路径均被保全。

## 完整保全及实际恢复

- 完整 bundle：`lesson-next-oauth-complete-history.bundle`，710720920 字节，无 prerequisite。
- SHA-256：`ca757a77f35d44767ab48df5963763cbe15c4ab9b18d2b5f582b573f8e3354a7`。
- 三条历史去重后合计 **385 个提交、16809 个 Git 对象、3 个原始 ref**。
- 独立脚本使用全新空 bare 仓库，先确认三个目标提交均不存在，再仅从本地 bundle 恢复；网络协议及全局/系统 Git 配置禁用，未读取源对象库。
- 对象 ID/类型/大小、每条完整提交链、tree/递归文件树、main 外原始 commit payload、原始 parent 与 raw delta 全部一致。
- 严格 `git fsck --full --strict --no-reflogs` 通过；无 alternates、shallow、promisor、远端依赖。
- 12 份原始归档/关账/复核/清单文件按原字节保存并记录 SHA-256；另保存原始 binary patch、raw delta、路径映射和 PR 关联快照。
- “独立”指独立于原仓库对象库及网络，不声称另一个人员或 agent 审查。

## 保管接替及持续保留的原状态

本登记接替以下原记录中三条精确 origin archive 引用承担的历史恢复保管职责：

- [Lesson 原记录](/Volumes/Starship/MAIS-MVP/coordination/release-intake/2026-08-23-A25-lesson-remove-viz-completion-evidence-archive.md)：原 14 路径删除可视化/完成流程的 WIP，仍未审、未采纳。保留原删除项及相关 UI/测试差异。
- [Next 原记录](/Volumes/Starship/MAIS-MVP/coordination/release-intake/2026-08-23-A25-next16-3-parity-evidence-archive.md)：Next 迁移包仍为 HOLD；原运行审查、浏览器断言、Preview/soak 及发布缺口记录保持不变。
- [OAuth 原记录](/Volumes/Starship/MAIS-MVP/coordination/release-intake/2026-08-23-A25-google-oauth-loop-evidence-archive.md)：blocked 状态及未批准法律/治理草稿继续保管；没有获得发布、provider 配置或部署批准。

对应原 JSON、Stage C-D-E 关账和复核记录均不回写、不删除。新的完整档案接替恢复介质，原始证据、WIP/HOLD/blocked 及未采纳状态继续有效；不代表三份旧整包已被 main 吸收、被放弃或通过运行验收。其他归档的保留决定不变。

## 精确删除清单与边界

[exact-deletion-candidates.json](/Volumes/Starship/MAIS-lesson-next-oauth-preservation-20261020-01a1591c/exact-deletion-candidates.json)仅列上述三条，均为 `technical_preservation_ready=true`、`custody_succession_registered=true`、`delete_authorized=false`、`delete_performed=false`。

登记前 live origin 为 **49 条**，main 为 `f573ac62c97cb0716054bc516f7d5136491ca002`；三个 SHA 未变，无开放 PR head/base、本地同名分支/upstream 或注册工作树关联。第二批没有删除，未来执行需另有精确授权并重查 SHA、关联、档案和完整 ref-map。

本阶段源仓库所有原引用、既有文件、工作树、HEAD/index/config 保留，仅新增本登记并保持未提交。没有执行应用/研究测试、真实 provider、旧验收、合并或部署；未恢复暂停工作。

保全范围为完整已提交 Git 历史及明确列出的原始证据，不扩大到历史未提交/ignored 或 Git 外资源。档案与源同在 Starship，未验证异盘或远端备份。

## 证据

- [完整档案与恢复说明](/Volumes/Starship/MAIS-lesson-next-oauth-preservation-20261020-01a1591c/README.md)
- [空仓库实际恢复证明](/Volumes/Starship/MAIS-lesson-next-oauth-preservation-20261020-01a1591c/recovery-summary.json)
- [原始增删及重命名端点核验](/Volumes/Starship/MAIS-lesson-next-oauth-preservation-20261020-01a1591c/evidence/original-delta-verification.json)
- [原始记录映射](/Volumes/Starship/MAIS-lesson-next-oauth-preservation-20261020-01a1591c/evidence/historical-records-manifest.json)
- [当前保管状态](/Volumes/Starship/MAIS-lesson-next-oauth-preservation-20261020-01a1591c/CUSTODY-CURRENT.json)
- [登记后复核](/Volumes/Starship/MAIS-lesson-next-oauth-preservation-20261020-01a1591c/evidence/post-registration-verification.json)
