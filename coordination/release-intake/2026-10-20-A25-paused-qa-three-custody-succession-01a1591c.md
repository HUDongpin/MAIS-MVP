# A25 — China QA / HK ease QA / California lesson QA 暂停分支保管接替

- 登记时间：2026-10-20T23:42:34.650357+08:00，Asia/Hong_Kong。
- 状态：**完整已提交历史和原始记录保全、空仓库恢复及保管接替完成；三条 QA 均保持 PAUSED，远端仍在，删除未授权、未执行。**
- 所有者授权：在前批三个精确远端删除后，保全此三条暂停分支、空库恢复、接替保管并给删除清单，保持暂停，暂不删除。
- 仓库/common Git：`/Volumes/Starship/MAIS-MVP`、`/Volumes/Starship/MAIS-MVP/.git`。

## 精确对象

| 对象 | origin 分支 | 精确 SHA | 完整历史提交数 | main 外提交 |
| --- | --- | --- | ---: | ---: |
| china | `codex/a18-china-all-math-qa` | `75e13af3a855df981943fcaf7a71f979e92a8fc3` | 388 | 6 |
| hk | `codex/a18-hk-ease-v2-qa` | `027f0c1be2aa5123ada35f5188f3784702cc416c` | 391 | 7 |
| california | `content/us-ca-math-lesson-qa` | `9a1ff26e7723e18462a46e7255ba027d4ce1de7a` | 455 | 99 |

完整 tree/父节点/历史映射见 [ref-map.json](/Volumes/Starship/MAIS-paused-qa-three-preservation-20261020-01a1591c/ref-map.json)。三条共享祖先，不能相加为不同提交总数；main 外提交数不是功能数或验收结果。

## 完整保全和实际恢复

- 完整 bundle：`paused-qa-three-complete-history.bundle`，721736787 字节，无 prerequisite。
- SHA-256：`a863761508ba97d295cb8cc6ce7f64e5476b39669d4d6c679e0bdff67aca4bcf`。
- 去重后 **496 个提交、18769 个 Git 对象和 3 个原始 ref**。
- 从真正的空 bare 库开始，证明三个 tip 不存在后仅从本地 bundle 恢复；禁用网络协议和全局/系统 Git 配置，未读取源库对象。
- 对象 ID/类型/大小、全历史提交列表和父节点图、tree/递归文件树、main 外原始 commit 内容及逐父节点差异全部一致；严格 fsck 通过。
- 无 alternates、shallow、promisor 或远端依赖。独立恢复指不依赖源库或网络，不声称另一人员/agent 审查。
- 6 份本地原关账/复核/清单按原字节保存；5 份关键 Git 内原停止/QA/closeout 记录逐 blob 和字节匹配。
- 三个 tip 下 content-qa/session-logs/reports 的 **18308 个路径版本、6288 个不同 blob**已在恢复库核对。完整 Git 包同时保留所有历史版本及数据，未改写 CSV/JSON 或历史报告。

## 暂停和历史验收边界

- **China QA**：原 stop-and-preserve 记录及其后追加提交均保留。原记录中的中断/无终结结果、未完成的英文/中文/provider/browser campaign 不被改为通过。当前 tip 的完整 6 个 main 外提交保全，不回退到旧列表的较早 tip。
- **HK ease QA**：保留原 stop-and-preserve、后续全库审查及全部 7 个 main 外提交。原 visualization closeout 的 TypeScript OOM/not accepted 与更早测试结果分别保留，不把早期结果当新通过。
- **California lesson QA**：保留全部 99 个 main 外提交、原 round22 closeout 的 PAUSED 及 standing gates。原“open items closed”是当时有范围的历史表述，不表示本轮重跑/批准了课程或整个主线。

本次只转移恢复介质，不运行三个 QA loop、audit/test 脚本、浏览器、provider、渲染、打分或内容晋升；调用次数为 0。未读取 provider 凭据，不恢复暂停任务。不改变原科学/课程/QA/发布结论，不采纳或放弃旧工作。

## 保管接替范围

原始 Git 记录和旧文件保持原字节；本包接替上述三个精确远端 ref 的完整已提交历史恢复职责。原暂停、未完成、失败、隔离依赖和未批准状态继续有效。将来运行 QA 或接入功能仍须相应新授权及验证。

[暂停与非 Git 边界记录](/Volumes/Starship/MAIS-paused-qa-three-preservation-20261020-01a1591c/evidence/pause-and-nongit-boundaries.json)明确保留原 handoff 排除的未提交路径、ignored .tmp/trace/database/browser profile/本地回执和其他工作树材料的原保管义务。本包不声称已经保全或解决这些非 Git 材料的位置/处置，不得借此清理。

Knowledge Galaxy 原远端继续保留，其 groups-first 4.0 已在远端/本地 main 的判断不变。前批 education 外部 ZIP/验证报告缺口责任和 California 非 Git/ignored 物理保管要求均不受影响。

## 精确删除准备清单

[exact-deletion-candidates.json](/Volumes/Starship/MAIS-paused-qa-three-preservation-20261020-01a1591c/exact-deletion-candidates.json)仅含三条，均为 `technical_preservation_ready=true`、`custody_succession_registered=true`、`delete_authorized=false`、`delete_performed=false`；`retained_state` 明确为 PAUSED。

登记前 live origin 为 **24 条**，main 为 `f573ac62c97cb0716054bc516f7d5136491ca002`；三个 SHA 未变，无开放 PR head/base、本地同名分支/upstream 或注册工作树关联。未来删除需要这三条精确授权并重查实时 SHA、档案、关联及完整 ref-map，且暂停状态和原非 Git 保管义务继续有效。

本阶段发生了已审查的并发变化：Codex 自身 turn-diff 快照引用更新，远端新增无关分支 `fix/ci-test-coverage-and-app-state-observability` @ `8ee4a36e3f49adafd496b86a23f725b7447dd33a`，总数由删除后的 23 变为 24。原有远端 SHA、main、三个 QA tip、本地 heads、工作树及既有文件/index/config 未变；详见 [并发变更复核](/Volumes/Starship/MAIS-paused-qa-three-preservation-20261020-01a1591c/evidence/concurrent-drift-review.json)。原冻结快照保留，登记前已重新冻结。该并发新增不是本任务创建。本任务在项目中只新增本登记，保留未提交。没有 fetch/merge/push/delete/prune，未运行应用/研究/发布。档案与源同在 Starship，未验证异盘备份。

## 证据

- [恢复说明](/Volumes/Starship/MAIS-paused-qa-three-preservation-20261020-01a1591c/README.md)
- [实际恢复证明](/Volumes/Starship/MAIS-paused-qa-three-preservation-20261020-01a1591c/recovery-summary.json)
- [QA 证据路径索引](/Volumes/Starship/MAIS-paused-qa-three-preservation-20261020-01a1591c/evidence/qa-evidence-index.json)
- [原 Git 停止与审查记录映射](/Volumes/Starship/MAIS-paused-qa-three-preservation-20261020-01a1591c/evidence/original-git-records.json)
- [暂停及非 Git 边界](/Volumes/Starship/MAIS-paused-qa-three-preservation-20261020-01a1591c/evidence/pause-and-nongit-boundaries.json)
- [当前保管状态](/Volumes/Starship/MAIS-paused-qa-three-preservation-20261020-01a1591c/CUSTODY-CURRENT.json)
- [登记后复核](/Volumes/Starship/MAIS-paused-qa-three-preservation-20261020-01a1591c/evidence/post-registration-verification.json)
