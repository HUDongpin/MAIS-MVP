# A25 — Knowledge Galaxy / math-kernel / HK safe-closeout / education 保管接替

- 登记时间：2026-10-20T23:14:06.531472+08:00，Asia/Hong_Kong。
- 状态：**完整已提交历史、列明原始证据和 math-kernel tarball 保全及空仓库验证完成；按所有者授权明确登记 education 外部产物缺口，完成限定范围的保管接替。四条远端仍保留，未授权或执行删除。**
- 仓库/common Git：`/Volumes/Starship/MAIS-MVP`、`/Volumes/Starship/MAIS-MVP/.git`。
- 授权：四条完整历史、空仓库恢复、保管接替，保留原始证据及未采纳状态；保全已核验 tarball；追踪或明确记录 education 外部产物缺口；先给清单，暂不删除。

## 精确对象

| 对象 | origin 分支 | 精确 SHA | 完整历史提交数 | main 外提交 |
| --- | --- | --- | ---: | ---: |
| galaxy | `claude/knowledge-galaxy-ccss-math-c9590a` | `3ca7e514b7ec279333e4231d4aa33427ac13aeca` | 1212 | 1 |
| kernel | `codex/a06-cube-midpoint-plane-proof-20260824` | `9672762593407d19df3746f4d361d2c10905f01d` | 502 | 26 |
| hk_closeout | `codex/a18-hk-safe-closeout-20260822` | `80f927ceee90e825e57093f810a6ab4fac63feee` | 431 | 2 |
| education | `feat/education-capabilities-v1` | `58deda7fde9d76026aa18b31773d6d4054b37730` | 897 | 6 |

完整 tree/父节点/提交图及来源映射见 [ref-map.json](/Volumes/Starship/MAIS-galaxy-kernel-hk-education-preservation-20261020-01a1591c/ref-map.json)。历史共享祖先，逐条提交数不能相加；main 外提交数不是功能数量。

## 完整 Git 历史与实际恢复

- 完整 bundle：`galaxy-kernel-hk-education-complete-history.bundle`，733297051 字节，无 prerequisite。
- SHA-256：`c0bd9dbf0cb33f454d551fe3123303c46dbc2b65966600080517360df372fa68`。
- 去重后 **1246 个不同提交、27059 个 Git 对象、4 个原始 ref**。
- 从全新空 bare 仓库恢复，预先证明四个 tip 不存在，只读取本地 bundle；禁用网络协议和全局/系统 Git 配置，未访问源对象库。
- 对象 ID/类型/大小、全历史提交链和父节点图、tree/递归文件树、main 外 commit 原始内容及逐父节点差异一致；严格 fsck 通过。
- 无 alternates、shallow、promisor、远端对象依赖。独立指不依赖源库和网络，不声称另一人员/agent 审查。
- 10 份原始文件/清单/增量包/tarball/lock 按字节保存；5 份关键 Git 内来源记录在恢复库逐 blob 和字节匹配。

## math-kernel tarball

- 原位置：`/Users/dongpinhu/.codex/skills/edulab-for-mais/assets/mais-math-kernel-0.1.0.tgz`。
- 档案副本：[mais-math-kernel-0.1.0.tgz](/Volumes/Starship/MAIS-galaxy-kernel-hk-education-preservation-20261020-01a1591c/external-artifacts/mais-math-kernel-0.1.0.tgz)，978063 字节。
- SHA-256：`15d34839ab7d341313574f64756b33611b752a5781f48df4fa5947e4e913d3ff`，与原交接记录和 runtime-lock 一致。
- 131 个包内文件的路径、大小、mode 和 SHA-256 已记录，并由独立恢复脚本再次从档案副本读取核对。
- 对应源提交 `f77d4358f4e88ec8432a177f93c9a937a2935725` 在恢复库可达；runtime-lock 原字节同时保留。
- 未安装/执行 tarball，未重跑数学行为或第三方依赖测试；这里只证明已核验原包的精确字节保全和可读取性，不授予发布或新运行验收。

## education 外部产物缺口

原交接记录位于 `58deda7fde9d76026aa18b31773d6d4054b37730:coordination/capabilities/codex-education-skills/README.md`，已经随完整历史及单独记录副本保全。

[缺口登记](/Volumes/Starship/MAIS-galaxy-kernel-hk-education-preservation-20261020-01a1591c/evidence/education-external-artifact-gap.json)记录了：

- 原目录 `/Users/dongpinhu/Documents/Codex/2026-08-27/new-chat/outputs/codex-education-skills-v1` 及其日期目录当前不可见。
- 检查了三个当前安装技能目录（training-courseware/course-integration/learner-notes）中的 ZIP；未找到原包。
- 已知 `20261003_MAIS-MVP/00_整理清单` 的迁移清单/盘点记录没有上述目录和原 ZIP 名的匹配线索。
- 原四个 ZIP 的文件名及预期 SHA-256 继续保存；**原 ZIP 字节和精确外部验证报告本轮未恢复**。未把现安装目录、重新打包或合成报告当作原始产物。
- 查找是有范围的，不是全盘无备份或资料已丢失的断言；缺口不是 owner-approved discard。后续若找到原包，须按原哈希验证并补充保管登记。

所有者本轮明确允许“追踪或明确记录缺口”。因此本登记接替完整 Git 历史及已经取得的原始证据恢复职责；**不声称解决 education 外部 ZIP/验证报告的完整恢复**，其未决保管责任持续保留。该缺口及四个预期原 ZIP 哈希须随今后的远端引用退役决定一并保留，不得抹去。

## 原状态与保管接替边界

- Knowledge Galaxy：原型、来源、设计记录继续保管，后继 Math Universe 不被当作所有原始字节的替代；原 spec 中缺失 scratchpad 引用仍按历史缺口保留。
- cube/math-kernel：完整 26 个 main 外提交、local-candidate/package-review 证据及第三方许可证/来源都保留；不把最后一个 demo 当作整个来源，也不把历史 LOCAL_READY 升级为主线/发布验收。
- HK safe-closeout：两个 outbox/race-hardening 来源提交与原关账保管义务由本包接替；不据此认定当前 main 行为等价。
- education-capabilities：静态 SCORM、courseware、learner notes 及技能来源的能力边界、未部署/未整体接纳状态保留；现有技能安装不代表应用已合并或部署。

原记录不回写、不删除，不改变历史审查/未采纳状态，不自动采纳或放弃旧工作。其他档案及 California 非 Git/ignored 物理保管要求不受影响。

## 精确删除准备清单

[exact-deletion-candidates.json](/Volumes/Starship/MAIS-galaxy-kernel-hk-education-preservation-20261020-01a1591c/exact-deletion-candidates.json)仅含四条，均为 `technical_preservation_ready=true`（限定上述 Git/列明证据范围）、`custody_succession_registered=true`、`delete_authorized=false`、`delete_performed=false`。education 项另标记 `external_gap_remains=true`。

登记前 live origin 为 **26 条**，main 为 `f573ac62c97cb0716054bc516f7d5136491ca002`；四个 SHA 不变，无开放 PR head/base、本地同名分支/upstream 或注册工作树关联。未来删除需要包含上述缺口边界的四条精确授权并重查 SHA、档案、关联及完整 ref-map。

源项目全部既有引用、工作树、HEAD/index/config 和未提交内容保持不变，只新增本登记并保留未提交。未 fetch/merge/push/delete/prune，未运行应用、研究、部署、渲染或 provider。本包不覆盖历史未提交/ignored 或未取得的外部资源；与源同盘，未验证异盘备份。

## 证据

- [恢复说明](/Volumes/Starship/MAIS-galaxy-kernel-hk-education-preservation-20261020-01a1591c/README.md)
- [实际恢复证明](/Volumes/Starship/MAIS-galaxy-kernel-hk-education-preservation-20261020-01a1591c/recovery-summary.json)
- [原始记录映射](/Volumes/Starship/MAIS-galaxy-kernel-hk-education-preservation-20261020-01a1591c/evidence/historical-records-manifest.json)
- [tarball 包内文件清单](/Volumes/Starship/MAIS-galaxy-kernel-hk-education-preservation-20261020-01a1591c/evidence/math-kernel-tarball-manifest.json)
- [education 外部产物缺口](/Volumes/Starship/MAIS-galaxy-kernel-hk-education-preservation-20261020-01a1591c/evidence/education-external-artifact-gap.json)
- [当前保管状态](/Volumes/Starship/MAIS-galaxy-kernel-hk-education-preservation-20261020-01a1591c/CUSTODY-CURRENT.json)
- [登记后复核](/Volumes/Starship/MAIS-galaxy-kernel-hk-education-preservation-20261020-01a1591c/evidence/post-registration-verification.json)
