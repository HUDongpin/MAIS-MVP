# MAIS Machine-QA Handoff / MAIS 机器质检交接

> Redacted evidence only. Do not paste raw questions, answers, gold rows, authorization text, credentials, provider reasoning, upstream bodies, or personal data. 仅填写脱敏证据；禁止粘贴原题、答案、金标、授权原文、凭据、模型推理、上游响应正文或个人资料。

## 1. Scope / 范围

- Schema version / 结构版本: `1.0`
- Skill / 技能: `mais-rsi-machine-qa-workflow`
- Evidence class / 证据类别: `synthetic-calibration | exact-package-machine-review`
- Mode / 模式: `audit-read-only | authorized-live-run`
- Issuer lane / 出具角色:
- Evidence ID / 证据编号: `evidence-<16 lowercase hex>`
- Observed at / 观察时间: `YYYY-MM-DDTHH:mm:ss.sssZ`
- Repository head / 仓库提交:
- Repository branch / 仓库分支:
- Repository clean / 仓库是否干净: `true | false`

## 2. Frozen identity / 冻结身份

- Candidate ID / 候选包编号: `candidate-<16 lowercase hex>`
- Candidate version / 候选包版本: `major.minor.patch`
- Candidate SHA-256 / 候选包哈希:
- Source identity entries / 来源身份条目: `source-<short-label>-<16 lowercase hex> + optional sha256/commit`
- Manifest SHA-256 / 清单哈希:
- Policy version / 政策版本: `major.minor.patch`
- Protocol ID and version / 协议编号与版本: `protocol-<short-label>-<16 lowercase hex> + major.minor.patch`
- Code manifest SHA-256 / 代码清单哈希:
- Taxonomy and RSI evidence-schema versions / 分类法与 RSI 证据结构版本: `major.minor.patch`
- Prompt manifest SHA-256 / 提示词清单哈希:
- Projection manifest SHA-256 / 投影清单哈希:
- C0 trigger assessment / C0 触发评估: `assessmentVersion: 1.0.0 + assessed: true + closed triggerCodes[] + derived c0Required`

### Active receipt manifest / 当前有效收据绑定清单

- Active manifest version / 有效清单版本: `1.0.0`
- Canonical control-plane SHA-256 recomputed / 已重算规范控制面哈希:
- Control plane exactly equals frozen identity / 控制面与冻结身份完全一致: `true | false`
- C0 required/status / C0 是否必需与状态: `true | false + complete | not-required`
- Each slot has a closed redacted result body / 每个槽位均有闭合脱敏结果正文: `fixed complete state + inspectionComplete + findingsCount + outputDigestSha256 + exact full control plane + closed validationProjection + validationProjectionSha256`
- Validation receipt body and projection closure / 验证收据正文与投影闭包: `domain-separated canonical ValidationReceiptBodyV1 + responseByteLength >= 1 + response/output digest equality + parse/projection/schema/role/taxonomy/coverage passed + exact role/surface/schema/taxonomy/control-plane bindings + all redaction flags false`
- Every resultSha256 recomputed from its result body / 每个结果哈希均由结果正文重算: `true | false`
- Deterministic six-domain output/validation-receipt/validation-projection/result/artifact/bound hashes / 确定性检查六域哈希:
- B-prime critique six-domain hashes / B-prime 初审六域哈希:
- B-prime revision six-domain hashes / B-prime 修订六域哈希:
- Exact-five C0 six-domain hashes when active / 启用时五个 C0 六域哈希:
- Independent-review six-domain hashes / 独立复核六域哈希:
- Canonical active-manifest SHA-256 recomputed / 已重算规范有效清单哈希:
- Top-level receipt hashes exactly equal bound receipts / 顶层收据哈希与绑定收据完全一致: `true | false`
- Top-level deterministic/B-prime finding counts equal bound result counts / 顶层发现数与绑定结果一致: `true | false`
- B-prime critique-before-fresh-revision predecessor bound / B-prime 初审先于全新上下文修订且前驱已绑定: `critiqueThenRevision: true + freshContext: true + predecessor equals critique bound receipt`
- All current SHA-256 references covered by evidenceHashes / 所有当前哈希引用均由证据哈希覆盖: `true | false`

## 3. Currentness / 当前有效性

- Candidate unchanged / 候选包未变更: `true | false`
- Receipt current / 收据当前有效: `true | false`
- Superseded / 已被取代: `true | false`
- Bound candidate hash matches / 绑定哈希一致: `true | false`
- Checked at / 核验时间:

## 4. Authorization / 授权

- Authority required / 所需授权项:
- Authority proven / 已证明授权项:
- Authority missing / 缺失授权项:
- Authority expires at / 授权到期时间:
- Live provider used / 是否使用实时模型: `true | false`
- Authorization status / 授权状态: `not-required | current-complete | blocked`
- Authorization hash only / 仅授权哈希:
- Canonical redacted authorization projection present / 已提供规范脱敏授权投影: `true | false`
- Authorization projection digest recomputed / 已重算授权投影哈希: `true | false`
- External-comparison trust status / 外部比对信任状态: `VERIFIED | blocked`
- Authorization trust receipt identity SHA-256 / 授权信任收据身份哈希:
- Trust source identity present in sourceIdentity / 信任来源身份已列入来源身份: `true | false`
- Exact current-task authorization compared to external trusted receipt / 已将当前任务精确授权与外部可信收据比对: `true | false`
- Fixed common authority code / 固定通用授权代码: `OFFLINE_AUDIT_AUTHORITY | LIVE_AUTHORIZATION_RECEIPT`
- Authorization-bound runner logical ID / 授权绑定运行器逻辑编号: `runner-<short-label>-<16 lowercase hex>`
- Authorization-bound executable runner path / 授权绑定可执行运行器路径:
- Authorization-bound runner SHA-256 / 授权绑定运行器哈希:
- Canonical executable-code-manifest digest equal in identity/authorization/live/runtime / 可执行代码清单规范哈希在身份、授权、执行与运行时完全一致: `true | false`
- Scope/cap match / 范围与上限一致: `true | false | not-applicable`
- Allowed roles (may be a superset) / 授权角色（可为超集）:
- Blocker codes / 阻断代码:

### Live execution when applicable / 实时执行（如适用）

- Runner path and logical ID / 运行器相对路径与逻辑编号:
- Repository commit / 仓库提交:
- Runner SHA-256 / 运行器哈希:
- Prompt/projection hashes match / 提示词与投影哈希一致: `true | false`
- Performed roles / 实际执行角色:
- Performed roles exactly B-prime, plus exact five C0 roles iff canonical C0 is required/complete / 实际角色仅为 B-prime，并且仅在规范 C0 必需且完成时加上五个固定角色: `true | false`
- Call at / 调用时间:
- Current tracked runner verified without execution / 已只读核验当前受跟踪运行器: `true | false`
- HEAD mode `100755` and working execute bits verified / 已核验 HEAD 模式与工作区执行位: `true | false`
- Authorization/liveExecution runner triple exactly equal / 授权与执行运行器三元组完全一致: `true | false`
- Executable manifest version/domain/resolution policy/runtime / 可执行清单版本、域、解析政策与运行时: `1.0.0 + mais-rsi-executable-code-manifest-v1 + static-esm-literal-require-v1 | standalone-bundle-v1 + exact Node version`
- Sorted unique manifest paths / 排序且唯一的清单路径: `package-lock.json + package.json + entrypoint + exact recursive local closure`
- Every file current in HEAD/worktree with exact bytes and modes; no symlink/submodule/untracked file / 每个文件在 HEAD 与工作区均保持相同字节与模式，且无符号链接、子模块或未跟踪文件: `true | false`
- Static closure complete with no unresolved/computed/custom-loader/outside import / 静态闭包完整且无未解析、动态计算、自定义加载器或仓库外导入: `true | false`
- Packet input outside runtime repository or Git-ignored quarantine / 数据包位于运行仓库外或经 Git ignore 验证的隔离目录: `true | false`
- Declared and observed repository clean / 声明与观测仓库状态均干净: `true | false`

> A `VERIFIED` field plus canonical hashes records a redacted comparison and byte closure; it is not a digital signature and does not authenticate an issuer. A structurally valid packet is never provider authority. `VERIFIED` 字段与规范哈希只记录脱敏比对与字节闭包，不是数字签名，也不能认证签发者；结构有效的数据包绝不等同于模型调用授权。

## 5. Machine review / 机器审查

- Resolved state / 已解析状态: `machine-evidence-complete | blocked | invalid`
- Common checks / 通用检查: `closed check-code registry + pass | fail | blocked | unknown + optional non-empty sha256:<64hex> | ref:IDENTITY_BOUND | ref:REVIEW_COMPLETE`
- Blockers / 阻断项: `closed blocker-code registry`
- Evidence hashes / 证据哈希列表:
- Deterministic / 确定性检查: `complete | blocked`
- B-prime critique / B-prime 初审:
- B-prime finding revision / B-prime 发现修订:
- C0-prime required / 是否必须 C0-prime: `true | false`
- C0-prime triggers / C0-prime 触发项: `closed C0-trigger registry; any registered trigger requires exact five roles`
- Five-role keyed receipt map / 五角色固定键收据映射: `answer-blind-solver | tool-verifier | adversarial-grader | bilingual-curriculum-critic | evidence-verifier`
- Five-role completeness / 五角色完整性: `complete | incomplete | not-required`
- Finding counts by code/severity / 按代码与严重度计数:
- Deviations and limitations / 偏差与限制:

## 6. Machine disposition / 机器处置

- `candidate-only | needs-repair | blocked`
- Reason codes / 原因代码:
- Claim ceiling / 声明上限: `machine-evidence-only`

## 7. Fresh independent review / 全新上下文独立复核

- Status / 状态: `unverified | passed | failed | blocked`
- Fresh context / 全新上下文: `true | false`
- Bound candidate SHA-256 / 绑定候选包哈希:
- Review receipt SHA-256 / 复核收据哈希:
- Reviewer role / 复核角色: `independent-machine-reviewer`
- Receipt distinct from deterministic/B-prime/C0-prime / 收据与其他审查收据不同: `true | false`

## 8. Seven proof boundaries / 七个证明位置

| Boundary / 证明位置 | Result / 结果 | Evidence SHA-256 / 证据哈希 |
| --- | --- | --- |
| `localTest` | `unverified | passed | failed | not-applicable` | |
| `receipt` | `unverified | passed | failed | not-applicable` | |
| `trackedCommitted` | `unverified | passed | failed | not-applicable` | |
| `main` | `unverified | passed | failed | not-applicable` | |
| `ci` | `unverified | passed | failed | not-applicable` | |
| `deployment` | `unverified | passed | failed | not-applicable` | |
| `live` | `unverified | passed | failed | not-applicable` | |

> These are evidence locations, not A18/A23/A11/A22 decisions. 这些是证据位置，不是 A18/A23/A11/A22 的决策。

> All active deterministic, B-prime critique/revision, C0-prime, and independent-review receipt hashes must be pairwise distinct. Every passed proof hash must also be disjoint from that receipt set. 所有有效审查收据哈希必须两两不同；任何 passed 证明哈希也不得复用审查收据哈希。

## 9. Remediation / 修复循环

- Candidate mutated / 候选包是否变更: `true | false`
- Prior candidate ID/version/hash / 旧候选包编号、版本与哈希:
- Prior envelope SHA-256 and canonical prior active-manifest body/digest / 旧证据包哈希与规范旧有效清单正文及哈希:
- Canonical prior-envelope body digest recomputed / 已重算规范旧证据包正文哈希: `true | false`
- Prior external-comparison status and receipt-identity SHA-256 / 旧证据外部比对状态与收据身份哈希: `VERIFIED + sha256`
- Prior trust source present and externally compared / 旧证据信任来源已记录并完成外部比对: `true | false`
- Prior C0 required/status and exact-five closure / 旧 C0 必需状态与五角色闭包:
- Authoritative prior deterministic/B-prime/C0/independent bound receipts / 权威旧绑定收据:
- New candidate ID/version/hash / 新候选包编号、版本与哈希:
- Invalidated receipt hashes, exact-equal to prior active set / 已失效收据哈希，必须与旧有效集合完全相等:
- New complete candidate/control-plane and active-manifest bindings / 新候选包完整控制面与有效清单绑定:
- New deterministic/B-prime/C0-prime/independent receipt hashes / 新审查与独立复核收据哈希:
- Fresh D-prime validation receipt / 全新 D-prime 验证收据: `closed canonical DPrimeValidationReceiptBodyV1 + prior/new candidate and manifest bindings + invalidated/current six-domain set digests + B-prime/C0/independent bindings + freshContext: true + validationReceiptSha256 == newReceiptBindings.dPrimeValidationReceiptSha256`
- D-prime validation receipt disjoint from prior/invalidated/current-active/proof hashes / D-prime 验证收据与旧、失效、当前及证明哈希不相交: `true | false`
- Old/new receipt sets disjoint / 新旧收据集合不相交: `true | false`
- Invalidated set absent from checks/authorization/proofs/evidence/manifests / 失效集合未出现在当前检查、授权、证明、证据与清单: `true | false`

## 10. Next handoff / 下一步交接

- Next owner / 下一责任角色:
- Next allowed action / 下一允许动作: `handoff-to-a18 | repair-candidate | record-calibration-result | revise-machine-qa-policy | supply-missing-evidence | renew-exact-authorization | revalidate-packet | stop-blocked`
- Transition mapping valid / 状态转换映射有效: `exact package candidate-only -> handoff-to-a18 | exact package needs-repair -> repair-candidate | synthetic candidate-only -> record-calibration-result | synthetic needs-repair -> revise-machine-qa-policy | blocked/invalid -> closed recovery actions only`
- Exact resume gate / 精确恢复条件:
- Explicitly unproved / 明确未证明:
- Safe receipt summary path/hash / 安全摘要路径或哈希:

> The safe summary emits hashes and fixed states, never input-controlled candidate/evidence/package/protocol/runner IDs. 安全摘要仅输出哈希与固定状态，不原样输出输入控制的候选包、证据、包、协议或运行器编号。

> Replacing both the prior envelope and external anchor creates a different untrusted evidence source and receipt identity; it does not preserve continuity until externally re-verified. 同时替换旧证据包与外部锚会形成不同且尚未信任的证据来源与收据身份；完成外部复核前不保留连续性。

## 11. Redaction declaration / 脱敏声明

- `protectedContentIncluded: false`
- `credentialsIncluded: false`
- `rawProviderResponsesIncluded: false`
