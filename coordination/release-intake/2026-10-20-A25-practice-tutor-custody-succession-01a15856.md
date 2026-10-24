# A25 — Practice / Tutor 历史归档保管接替登记

- 登记时间：2026-10-20T16:38:04.279111+08:00，Asia/Hong_Kong。
- 负责人：A25；独立恢复复核：archive16_review。
- 状态：**evidence archive；完整 Git 历史、原始字节与回执已由独立可恢复档案接替保管。两条远端引用仍保留，本轮没有授权或执行删除。**
- 授权依据：所有者对这两个精确对象明确要求执行“完整历史保全 → 空仓库独立恢复验证 → 登记保管接替 → 形成精确删除清单”。

## 精确对象

| origin 分支 | 提交 | 提交树 | 完整历史提交数 |
| --- | --- | --- | ---: |
| `archive/a04-practice-two-doors-pre-review-20260823` | `f48f118c3da2e5396d5d6a49bd589272dbf264e0` | `4ad22cc17a657c585d7ef852a431ff9a29935bf8` | 377 |
| `archive/tutor-moderation-provider-pre-hardening-20260823` | `919d15eb78d54ad26919c2ce9a8cbfda2e75b1d9` | `32b203c00cfa87b1d872d2c411d802fc671d13ed` | 388 |

## 新恢复入口及验证

[完整档案与恢复说明](/Volumes/Starship/MAIS-practice-tutor-archive-preservation-20261020-01a15856/README.md)。

- 完整 bundle：`practice-tutor-complete-history.bundle`；710548488 字节。
- SHA-256：`26ecd4e47ef19e149e0a14b2a7f7d8d1620e2c7ed8290df962c0dde07ba2c4ba`。
- 无前置对象依赖；主恢复与另一个独立空仓库恢复均通过，恢复时网络协议禁用，仅允许本地 bundle。
- 合计 **389 个不同提交、16715 个 Git 对象、2 个精确 ref**；对象 ID/类型/大小、完整提交列表、tree/递归文件树均与源一致。
- 两份旧回执所列 **10 个原始文件 blob** 全部匹配；**5 份原始回执/关账记录**逐字节保存。
- 严格 `git fsck --full --strict --no-reflogs` 通过；恢复库无 alternates、shallow 或 promisor 依赖。

## 对旧保留条件的接替

本登记接替以下原记录中“由对应 origin/archive 分支承担精确字节恢复入口”的要求：

- [Practice 原归档记录](2026-08-23-A25-a04-practice-two-doors-evidence-archive.md)及同名 JSON。
- [Tutor 原归档记录](2026-08-23-A25-tutor-moderation-provider-evidence-archive.md)及同名 JSON。

旧记录不修改、不删除。其历史“不授权删除”及当时 PR/工作树状态继续作为原始证据；本次只改变未来恢复介质，不授予远端删除操作。原字节仍需持续保管，本包的完整 bundle、映射、原回执、校验清单与恢复证明不得因后续远端清理丢弃。

两条 source tip 各有 1 个原始提交未进入冻结 main `f573ac62c97cb0716054bc516f7d5136491ca002`。Practice PR141 与 Tutor 后继存在于主线，不等于旧整树全部被吸收或获运行验收。本次没有 merge、功能采纳或工作放弃。

## 删除准备清单与操作边界

[精确删除候选清单](/Volumes/Starship/MAIS-practice-tutor-archive-preservation-20261020-01a15856/exact-deletion-candidates.json)已形成：仅上述两条 origin 引用，均为 `delete_authorized=false`、`delete_performed=false`。后续执行需要针对这两个目标的明确删除授权，并重新核对 live SHA、PR 关联、档案及完整 ref-map。

登记前复核远端 **55 条**，两条目标与 main 未变；无目标开放 PR、本地 upstream 或注册工作树检出关联。未删除分支或工作树，未实际 prune，未 stage/commit/merge/push，未部署。新增本登记保留未提交。

档案与源仓库同盘；未验证异盘或远端备份。范围是完整已提交 Git 历史与所列回执，不扩大到历史未提交/ignored 工作树内容或外部资源。

## 证据

- [主恢复证明](/Volumes/Starship/MAIS-practice-tutor-archive-preservation-20261020-01a15856/recovery-summary.json)
- [独立恢复复核](/Volumes/Starship/MAIS-practice-tutor-archive-preservation-20261020-01a15856/independent-review.json)
- [当前保管状态](/Volumes/Starship/MAIS-practice-tutor-archive-preservation-20261020-01a15856/CUSTODY-CURRENT.json)
- [原始十个 blob 映射](/Volumes/Starship/MAIS-practice-tutor-archive-preservation-20261020-01a15856/evidence/original-ten-blobs.json)
- [登记后保护与实时复核](/Volumes/Starship/MAIS-practice-tutor-archive-preservation-20261020-01a15856/evidence/post-registration-verification.json)

本轮没有应用代码变更；应用构建和业务测试未运行。历史保全、两次实际恢复、严格完整性和本地/远端保留核验为本任务验收依据。
