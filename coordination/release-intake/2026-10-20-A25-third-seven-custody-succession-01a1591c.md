# A25 — 第三批七条历史归档保管接替登记

- 登记时间：2026-10-20T21:58:38.124990+08:00，Asia/Hong_Kong。
- 状态：**evidence archive；完整已提交历史、空仓库实际恢复验证及保管接替完成。七条远端均保留，删除未授权、未执行。**
- 授权：完成 Lesson/Next/OAuth 三条远端删除后，保全第三批七条完整历史、恢复验证并接替保管；先给精确删除清单，暂不删除第三批。
- 仓库及 common Git：`/Volumes/Starship/MAIS-MVP`、`/Volumes/Starship/MAIS-MVP/.git`。

## 精确对象

| origin 分支 | 精确 SHA | 完整历史提交数 | main 外提交 |
| --- | --- | ---: | ---: |
| `archive/a05-15-bug-loop-wip-20260823` | `8c4d06ab2760b82b34ab2946d0688e75b8740e29` | 393 | 1 |
| `archive/a18-hk-all-math-lesson-qa-wip-20260823` | `47dc3395521044ac8728d790c90d30516b9c94fa` | 385 | 1 |
| `archive/a06-hk-visualization-labs-loop-wip-20260823` | `d5595131afb3028e769689998e7a67090865afae` | 385 | 1 |
| `archive/a06-china-visualization-labs-loop-wip-20260825` | `eedf0977047369a54ef4694201ecb647d713d090` | 389 | 5 |
| `archive/a23-closeouts-main-merge-20260823` | `543d8ec8b02eae0b42f0690d3929191c777adaac` | 444 | 11 |
| `archive/a23-closeouts-main-ready-20260823` | `66fddde4782b125c49f50c43348c1829ef8e1267` | 439 | 6 |
| `archive/a06-ca-visualization-labs-loop-wip-20260823` | `777f46db6ef16c209f3493f58ec1fb13df8daf94` | 383 | 1 |

完整 tree、源分支、原始父节点、全历史提交图和来源映射见 [ref-map.json](/Volumes/Starship/MAIS-third-seven-archive-preservation-20261020-01a1591c/ref-map.json)。逐条提交数共享祖先，不能相加当作不同提交总数。main 外提交数不是功能数或未采纳功能范围的量化。

## 完整保全与空仓库恢复

- 完整 bundle：`third-seven-complete-history.bundle`，716566250 字节，无 prerequisite。
- SHA-256：`2bbdde40cc93d163238f7236c15d51f12d2988bafcb82946b0c8b7e41be4c542`。
- 去重后完整保存 **452 个提交、18236 个 Git 对象、7 个原始 ref**。
- 独立脚本从全新空 bare 仓库开始，预先确认七个目标提交均不存在，只读取本地 bundle；禁用网络协议和全局/系统 Git 配置，不访问源仓库对象库。
- 对象 ID/类型/大小、每条完整提交列表、所有父节点的完整提交图、tree/递归文件树、main 外原始 commit payload 和每个 tip 相对于各父节点的 raw delta 全部匹配。
- 两个 A23 closeout 原始 tip 各有两个父节点；两条完整历史互不包含，分别恢复原 ref，并验证了这一关系。
- 严格 `git fsck --full --strict --no-reflogs` 通过；恢复库无 alternates、shallow、promisor 或远端依赖。
- 16 份原始归档/关账/复核/清单文件按原字节保存、记录源路径与 SHA-256；另存原始 binary patch、逐父节点 raw delta、路径清单、提交 payload 和 PR 关联快照。
- 独立恢复指不依赖源对象库及网络，不声称另一个人员或 agent 独立审查。

## 接替范围与原状态

本登记仅接替上述七条精确远端引用的已提交历史恢复保管职责。原五份归档 MD/JSON、Stage C-D-E 关账和复核记录保持原字节；对应恢复介质改由本完整档案承担。原始状态继续有效：

| 来源 | 保留状态与边界 |
| --- | --- |
| A05 bug loop | 原 83 路径混合 WIP、`Oops.rej`、未采纳工作保留，不能当作统一已验收功能包。 |
| HK 全课程 QA | 原 84 路径、JSON/CSV 及课程 QA 证据保留；不声称完整课程验收。 |
| HK visualization | 原 182 路径混合树保留；PR136 窄切片不等于旧整树被吸收。 |
| China visualization | 原 127 路径及完整祖先链保留；STOPPED、65 项 repair-required、C5 HOLD 的历史记录不变。 |
| A23 closeouts merge | 完整合并图、原始提交身份和来源保管；不执行合并或将旧历史重新认定为当前通过。 |
| A23 closeouts ready | 独立完整合并图和原始身份保管；不能因名字相近被当作另一分支副本。 |
| California visualization | 原 227 路径、历史 0 passed/2 failed/100 skipped、已消耗回执、无 producer-success/terminal seal 的证据保留；不授权重跑浏览器验收。 |

前述路径数量已与五个原归档提交相对原父提交的变更端点逐项核对；原始未采纳、暂停、HOLD 和失败状态没有改变。没有采纳或放弃旧工作，没有运行应用、课程、研究、provider 或发布流程。

## California 非 Git 保管边界

[独立保留记录](/Volumes/Starship/MAIS-third-seven-archive-preservation-20261020-01a1591c/evidence/unresolved-physical-custody.json)保存了原物理残留和 ignored 测量/授权材料、三份非 Git generated config 的处置要求，以及对原路径是否存在的浅层检查。历史约 150 GB/1,090,191 个 .tmp 文件是原记录数据，不是本轮重新计量。

本包恢复验证覆盖完整已提交 Git 历史和明确复制的记录，**不声称保全或恢复那些 ignored/非 Git 物理材料，也没有解决其保管或清理决定**。即使原路径已不可见，也不据此推断材料已妥善清理或允许删除。原来的单独保留及所有者/A22 决策要求继续有效，本轮没有清理残留、修改权限或恢复暂停任务。

## 精确删除准备清单

[exact-deletion-candidates.json](/Volumes/Starship/MAIS-third-seven-archive-preservation-20261020-01a1591c/exact-deletion-candidates.json)仅包含这七条，均为：

- `technical_preservation_ready=true`（限定已提交历史和所列证据）
- `custody_succession_registered=true`
- `delete_authorized=false`
- `delete_performed=false`

登记前 live origin 为 **46 条**，main 为 `f573ac62c97cb0716054bc516f7d5136491ca002`；七个 SHA 未变，无开放 PR head/base、本地同名分支/upstream 或注册工作树关联。未来删除仍须七条精确目标的明确授权，并重查 live SHA、关联、档案与完整 ref-map；California 的非 Git 保管义务不因远端引用退役而解除。

源仓库本阶段所有原引用和既有文件、工作树、HEAD/index/config 保持不变，只新增本登记，保留未提交。没有删除七条远端或任何本地分支/工作树，没有实际 prune、合并或部署。

档案与源同在 Starship，未验证异盘或远端备份。Git 之外的资源及历史未提交/ignored 内容不在本次完整 Git 历史恢复证明内。

## 证据

- [完整档案与恢复说明](/Volumes/Starship/MAIS-third-seven-archive-preservation-20261020-01a1591c/README.md)
- [实际恢复证明](/Volumes/Starship/MAIS-third-seven-archive-preservation-20261020-01a1591c/recovery-summary.json)
- [原记录与变更端点核验](/Volumes/Starship/MAIS-third-seven-archive-preservation-20261020-01a1591c/evidence/original-record-verification.json)
- [原始记录校验映射](/Volumes/Starship/MAIS-third-seven-archive-preservation-20261020-01a1591c/evidence/historical-records-manifest.json)
- [两个 closeout 的独立历史关系](/Volumes/Starship/MAIS-third-seven-archive-preservation-20261020-01a1591c/evidence/closeout-dag-relations.json)
- [当前保管状态](/Volumes/Starship/MAIS-third-seven-archive-preservation-20261020-01a1591c/CUSTODY-CURRENT.json)
- [登记后复核](/Volumes/Starship/MAIS-third-seven-archive-preservation-20261020-01a1591c/evidence/post-registration-verification.json)
