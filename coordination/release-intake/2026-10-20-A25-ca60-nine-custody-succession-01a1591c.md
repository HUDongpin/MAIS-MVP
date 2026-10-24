# A25 — CA60 九条分支联合历史保管接替登记

- 登记时间：2026-10-20T22:51:30.426992+08:00，Asia/Hong_Kong。
- 状态：**evidence archive；联合完整历史保全、空仓库独立恢复验证及保管接替完成。九条远端仍在，未授权或执行删除。**
- 授权：所有者要求在前批四条删除后，联合保全 CA60 九条，保留全部原始引用、身份和审查证据，先给精确删除清单，暂不删除 CA60。
- 仓库/common Git：`/Volumes/Starship/MAIS-MVP`、`/Volumes/Starship/MAIS-MVP/.git`。

## 九个原始入口

| 对象 | origin 分支 | 精确 SHA | 完整历史提交数 |
| --- | --- | --- | ---: |
| runner | `codex/a07-natural-ca60-live-runner-v5-r3-20260826` | `00c4b37f3381427e9f44ab9cc1fad4d5d1350e2f` | 530 |
| r10 | `codex/a11-natural-ca60-v5-r10-review-identity-anchor-20260827` | `d9ab746bf3b4242a3439ea794ca1aab8a633e7b0` | 521 |
| r2 | `codex/a11-natural-ca60-v5-r2-review-20260826` | `916d2430ba7b7b057aea018c68acdf0a9a14b13c` | 500 |
| r3 | `codex/a11-natural-ca60-v5-r3-review-20260826` | `1bada03e41f140233fd49c2f7ebdbabf77c1dce0` | 502 |
| r4 | `codex/a11-natural-ca60-v5-r4-review-20260826` | `2bfd5ba703ecf1509a3ac47430fe6f06b80077f7` | 504 |
| r5 | `codex/a11-natural-ca60-v5-r5-review-20260826` | `311bc2ea99595fd6a52c52cc21bb19f83ff11f47` | 507 |
| r6 | `codex/a11-natural-ca60-v5-r6-review-20260826` | `5070a135ab4f02fb9d2fb33662c08abca46fca05` | 510 |
| r9 | `codex/a11-natural-ca60-v5-r9-review-identity-anchor-20260826` | `f84cbba8aab457208fa3474a439f144f9dc5eb62` | 517 |
| frame | `codex/a22-natural-ca60-frame-readiness-exec-v5-20260826` | `481da7a7a518fc7df26e5fbc89e1b3334df737b5` | 488 |

完整 tree/父节点/全历史提交图见 [ref-map.json](/Volumes/Starship/MAIS-ca60-nine-preservation-20261020-01a1591c/ref-map.json)。各条历史共享祖先；没有把 reviewer 分支替换为 runner 中的 cherry-pick，也没有只保留最新 runner。

## 完整保全与空库实际恢复

- 完整 bundle：`ca60-nine-complete-history.bundle`，713767782 字节，无 prerequisite。
- SHA-256：`40b254529d87b4e00f8336087a3fb4401f1622fac90aa8ad2ee79ef04aecfac1`。
- 去重后 **538 个不同提交、18853 个 Git 对象、9 个原始 ref**。
- 从真正空 bare 仓库开始，预先证明九个 tip 不存在；仅读取本地 bundle，禁用网络协议和全局/系统 Git 配置，不访问源对象库。
- 对象 ID/类型/大小、每条完整提交链和父节点图、tree/递归文件树、原始 commit payload 和逐父节点 raw delta 全部一致；严格 fsck 通过。
- 恢复库无 alternates、shallow、promisor 或远端依赖。独立指独立于源仓库和网络，不声称另一个人员/agent 审查。
- 11 份原始本地记录/清单/旧增量包按原字节保存；9 份关键 Git 内审查/身份/关账记录在恢复库逐 blob/字节核对。

## 原始身份与审查证据专门核验

- 九个 tip 的 CA60 reports/research/session-log 路径共索引 **2447 个版本**，对应 **350 个不同 blob**，逐字节恢复匹配；每项保留原 ref、revision、路径、blob 和 SHA-256。
- 各保留 verifier 中 **122 处显式 COMMIT 常量引用**对应 **34 个不同原始提交**，均在恢复库中从原始九个 ref 可达。
- 对 **12 条公开身份 anchor/独立审查 receipt 路径**，恢复库 `git log --all -- <path>` 的提交集合与源库原 `--all` 集合一致，未丢失早期身份及审查历史。
- 没有运行原 CA60 verifier、builder、runner、scorer、provider 或实验，也没有读取/复制保护目录中的 reviewer 私钥。保全已提交的公开身份和签名/审查证据，不宣称本轮重新做签名语义审查或科学验收。

## 保管接替和继续有效的边界

本登记接替这九个精确远端 ref 承担的已提交历史、原始提交身份和审查记录恢复职责。原记录、旧增量包、不可变 registration、DISCREPANCY、身份 anchor、失败/修复证据均保留原字节；原始来源身份今后从联合档案的九个原 ref 恢复。

R2/R3/R4/R5/R6 的原 DISCREPANCY 与限制继续作为历史事实保存。R9/R10 身份 anchor 的原始提交不被后续复制提交替代。runner tip 的 R11 `CONCURRED` 仅是历史离线 runner registration 审查结论，不授予本次 provider、token、attempt、USD、自然题外发或实验执行权限。frame-readiness 也不是 provider 执行证据。

本次归档不改变冻结 frame/sample、权利/隐私筛查、阈值、审查方法、决策上限或后续执行门禁。不声称 CA60_EXECUTED、研究 PASS 或泛化证据，不恢复任何暂停工作。后续如要恢复运行或采用代码，须另外满足相应新授权和验证。

## 精确删除准备清单

[exact-deletion-candidates.json](/Volumes/Starship/MAIS-ca60-nine-preservation-20261020-01a1591c/exact-deletion-candidates.json)仅九条，均为 `technical_preservation_ready=true`、`custody_succession_registered=true`、`delete_authorized=false`、`delete_performed=false`。

登记前 origin 为 **35 条**，main 为 `f573ac62c97cb0716054bc516f7d5136491ca002`；九个 SHA 未变，无开放 PR head/base、本地同名分支/upstream 或注册工作树关联。未来删除需九条精确目标明确授权，并重查 SHA/PR/关联/联合档案及完整 ref-map。

本阶段原项目全部引用、工作树、HEAD/index/config 和既有未提交内容保持不变；只新增本登记并保留未提交。未 fetch/merge/push/delete/prune，未执行应用/研究/发布任务。

完整恢复范围是已提交 Git 历史和明确列明的证据，不包括历史未提交/ignored、reviewer 私钥或外部资源；原保护存储及其他证据保管要求不解除。档案与源同在 Starship，未验证异盘备份。California 非 Git/ignored 物理材料的原保管要求继续有效。

## 证据

- [恢复说明](/Volumes/Starship/MAIS-ca60-nine-preservation-20261020-01a1591c/README.md)
- [实际恢复证明](/Volumes/Starship/MAIS-ca60-nine-preservation-20261020-01a1591c/recovery-summary.json)
- [2,447 个审查记录版本映射](/Volumes/Starship/MAIS-ca60-nine-preservation-20261020-01a1591c/evidence/review-evidence-map.json)
- [原始身份提交依赖](/Volumes/Starship/MAIS-ca60-nine-preservation-20261020-01a1591c/evidence/verifier-identity-dependencies.json)
- [身份/审查路径提交历史](/Volumes/Starship/MAIS-ca60-nine-preservation-20261020-01a1591c/evidence/identity-path-mutations.json)
- [原始文件保管映射](/Volumes/Starship/MAIS-ca60-nine-preservation-20261020-01a1591c/evidence/historical-records-manifest.json)
- [当前保管状态](/Volumes/Starship/MAIS-ca60-nine-preservation-20261020-01a1591c/CUSTODY-CURRENT.json)
- [登记后复核](/Volumes/Starship/MAIS-ca60-nine-preservation-20261020-01a1591c/evidence/post-registration-verification.json)
