# A25 — Lehmann / Manim v3 RC / trig unit-wave / content-train 保管接替登记

- 登记时间：2026-10-20T22:40:45.851187+08:00，Asia/Hong_Kong。
- 状态：**evidence archive；完整历史保全、空仓库独立恢复验证、保管接替完成。四条远端仍保留，删除未授权、未执行。**
- 授权：所有者要求处理这四条完整历史及原始证据，保留未采纳状态和旧发布限制，先给精确删除清单，暂不删除。
- 仓库及 common Git：`/Volumes/Starship/MAIS-MVP`、`/Volumes/Starship/MAIS-MVP/.git`。

## 精确对象

| origin 分支 | 精确 SHA | 完整历史提交数 | main 外提交 |
| --- | --- | ---: | ---: |
| `claude/focused-lehmann-5027fa` | `d9bf553ef864bbeb830e666bf8171bf90aad6106` | 176 | 1 |
| `codex/a06-mais-manim-v3-rc-20260823` | `766bfa7b05a0e61d26161486451488ded85aabba` | 477 | 1 |
| `codex/a06-trig-unit-wave-redesign-20260823` | `ae9a9f3c3f9d1b41a8c2f21258e3ce09624e954c` | 477 | 1 |
| `release/2026-08-25-content-train` | `5eb48e0ad6d2ac5aff55c6ceb1cb68e1cda38931` | 534 | 5 |

完整 tree、原始父节点和提交图见 [ref-map.json](/Volumes/Starship/MAIS-lehmann-manim-trig-content-preservation-20261020-01a1591c/ref-map.json)。逐条历史共享祖先，提交数不能相加；main 外提交数不是功能数。

## 完整保全和空仓库实际恢复

- 完整 bundle：`lehmann-manim-trig-content-complete-history.bundle`，713080171 字节，无 prerequisite。
- SHA-256：`39b618b365dae2d705bbcd66f795657ba32d9af9ca2d4c6f7b013b9c0e2d54ba`。
- 去重后保存 **537 个提交、18177 个 Git 对象和 4 个原始 ref**。
- 独立脚本从真正的空 bare 仓库开始，先证明四个 tip 不存在，再只读取本地 bundle。网络协议及全局/系统 Git 配置禁用，未读取源对象库。
- 对象 ID/类型/大小、每条完整提交链和所有父节点关系、tree/递归文件树、main 外原始 commit payload、逐父节点 raw delta 全部匹配。
- 严格 fsck 通过；无 alternates、shallow、promisor 或远端依赖。独立指不依赖原项目和网络，不声称另一人员或 agent 审查。
- 10 份文件型原始记录/清单/既有增量包逐字节保存，另有 3 份 Git 内原始记录复制并在恢复库核对 blob 和字节。
- 原 Manim、trig、content-train 增量 bundle 保留为历史证据；新完整 bundle 不依赖它们或旧前置 pack。

## 保管接替及原状态

本登记只接替四个精确远端 ref 的完整已提交历史恢复职责。原关账/复核/清理候选记录、旧增量包和来源文件不修改、不删除。

- **Lehmann**：保留原 11 路径无障碍属性和分页 E2E WIP，以及原本地分支删除后指定远端保管的决定。未将其重新认定为已采纳/通过。
- **Manim v3 RC**：保留原 77 路径视频导出、教师 authoring 与相关测试 WIP；整包未采纳状态不变。
- **trig unit-wave**：保留原 19 路径场景重设计、视频管线及测试 WIP；不恢复渲染或开发任务。
- **content-train**：保留完整祖先/合并图、原发布例外与执行回执。历史事实为 deployment created、后续 latency gate 未通过、no promotion；本次不查询或改变当前部署，也不重新认定旧任务完成。旧例外与凭据授权不得因保管接替而重用，新发布须按当时有效的当前源和新授权处理。

三个 WIP 的路径端点数已重新核对。原始未采纳和旧发布限制继续有效；本次不表示全部功能进入 main，也不表示放弃旧工作。未来采纳仍需独立审查。

## 精确删除准备清单

[exact-deletion-candidates.json](/Volumes/Starship/MAIS-lehmann-manim-trig-content-preservation-20261020-01a1591c/exact-deletion-candidates.json)仅含这四条，均为 `technical_preservation_ready=true`、`custody_succession_registered=true`、`delete_authorized=false`、`delete_performed=false`。

登记前 origin 为 **39 条**，main 为 `f573ac62c97cb0716054bc516f7d5136491ca002`；四个 SHA 未变，无开放 PR head/base、本地同名分支/upstream 或注册工作树关联。未来执行须有这四条精确删除授权，重新核验实时 SHA、关联、档案和完整 ref-map。

源仓库本阶段全部既有引用、工作树、HEAD/index/config 和未提交内容保持不变，仅新增本登记，保留未提交。没有 fetch/merge/push、删除或实际 prune，没有运行应用/研究/渲染/发布或真实 provider 任务。

保管范围为完整已提交 Git 历史及明确列出的原始记录，不包括历史未提交/ignored 或 Git 外资源。档案与源同在 Starship，未验证异盘备份。California 原非 Git/ignored 材料的单独保管要求不受本批影响。

## 证据

- [恢复说明](/Volumes/Starship/MAIS-lehmann-manim-trig-content-preservation-20261020-01a1591c/README.md)
- [实际恢复证明](/Volumes/Starship/MAIS-lehmann-manim-trig-content-preservation-20261020-01a1591c/recovery-summary.json)
- [原文件记录映射](/Volumes/Starship/MAIS-lehmann-manim-trig-content-preservation-20261020-01a1591c/evidence/historical-records-manifest.json)
- [原 Git 记录映射](/Volumes/Starship/MAIS-lehmann-manim-trig-content-preservation-20261020-01a1591c/evidence/original-git-records.json)
- [旧发布限制](/Volumes/Starship/MAIS-lehmann-manim-trig-content-preservation-20261020-01a1591c/evidence/retained-release-restrictions.json)
- [当前保管状态](/Volumes/Starship/MAIS-lehmann-manim-trig-content-preservation-20261020-01a1591c/CUSTODY-CURRENT.json)
- [登记后复核](/Volumes/Starship/MAIS-lehmann-manim-trig-content-preservation-20261020-01a1591c/evidence/post-registration-verification.json)
