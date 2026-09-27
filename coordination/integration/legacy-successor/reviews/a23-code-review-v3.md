# A23/A10：legacy successor 最终代码与冻结范围独立审查 v3

实际审查角色：A23/A10；reviewer identity／session：`/root/a23_successor_design_review`。日期：2026-09-27。审查对象：`/Volumes/Starship/MLS27` 的 standalone NON-LIVE legacy-content correctness successor v1。

**Verdict：`approved-for-checker-freeze`，仅针对下列 exact 29-file bundle；最终 P0=0、P1=0、P2=0。** 该决定允许把已审 checker 字节送入既定冻结步骤；它不表示已经建立 checker release／ledger、attempt-008 execution、native validation、Shadow Receipt、Closure、global required-check PASS 或 live acceptance。

旧 v2 报告及其 `34d2ff…` 候选保持 BLOCKED，不改判、不改hash。本报告审查的是新增 bootstrap／frozen dependency artifact 与其它修复后的不同 bundle。

## 1. 精确冻结对象与本角色复算

| Binding | 本轮证据 |
| --- | --- |
| checkout / Git-dir | `/Volumes/Starship/MLS27`；`/Volumes/Starship/MAIS-MVP/.git/worktrees/MLS27` |
| HEAD / branch | `779cf5b7d70798e93a4f0e5a4fcc7e5921b70a86`；`codex/a10-a23-legacy-content-successor-20260927` |
| inventory | `/private/tmp/mais-successor-bundle-review-v3.json`；标记 `final-uncommitted-review-v3`／`authority=false` |
| bundle algorithm | sorted `{path,rawSha256}` rows 的 sorted-key stable JSON，SHA-256；此算法不把 inventory 自身作为授权 |
| 独立重算 bundle digest | `32d9c644bc3c1e104c02712148d45dabf2c3a8ea6ac98c0459dc93d365821e02` |
| per-file match | 29/29 raw hashes相符，全部 regular `100644` |
| path authority | native `BUNDLE_PATHS`、builtin bootstrap `TRUSTED_BUNDLE_PATHS`、inventory paths 三者相同，均29条 |
| frozen dependency artifact | `coordination/integration/legacy-successor/frozen-dependency-bindings.v1.json`；raw SHA-256 `e3269b2b5618ccd9ae94430800c573b4642f2e7654e54dd052362720d583a7e5`；已在这29件bundle内 |
| dependency packages digest | `1c7dbf08aebc2ace01b787ce759512ac9dc1b2aa800df1609e790d5b9a007fa3`；实际7 package trees独立重算全部相同，共900files |

本角色对 actual installed package tree 使用独立 Python filesystem traversal／file-mode／SHA-256 编码重算，而非复制 `dependencyBindings()` 的输出作为对照。7 packages 为 AJV、fast-deep-equal、fast-uri、json-schema-traverse、require-from-string、TypeScript、YAML。lock版本与exact tree身份由bootstrap/native再次验证。

原题包 `72513886…`、imported #262 commit `fc6c24446659c54f92482cffd2de6e180bbb03c2`、common-base `4834189e63d74f0e1a27475d9968f5c88c2bc78f` 与修后current pack `4f677216d3d9aec1b8f93be87a2900ff5a63f62e45a7555458ac146955ac0766` 保持各自身份。current四文件哈希包括本次修后pack／solvability test／solver与原audit script，全部属于这29件bundle；没有把原 `b1038…` QA hash换成新版本hash。

## 2. 先前发现的闭合情况

### 执行前认证与 immutable dependencies：已解决

公共 standalone entry只导入Node built-ins与builtin-only bootstrap。bootstrap内嵌原bounded strict parser，不在认证前导入其它local/third-party模块。它先证明29件current HEAD/release Git bytes、regular mode、完整bundle digest和实际7依赖tree，再将已捕获bytes写入新私有短路径runtime，最后dynamic-import那里的entry。

v3复审早期，本角色用disposable Git fixture独立复现了“poisoned AJV + rehashed later ledger仍被authenticateRuntime捕获为trusted”的缺口，未执行payload。最终代码新增release内的frozen-dependency artifact；bootstrap在外部import之前、native在collectAuthority时，都要求later ledger与这个bundle-authenticated artifact精确相等。现有两种负例分别拒绝unchanged-ledger poison和rehashed-ledger poison，payload均未执行。冻结记录改变会改变本次29件bundle digest，不能靠修改后置ledger自授dependency权限。

worker由 `new URL("./observer.mjs", import.meta.url)` 解析；在正式CLI launch中，module URL来自私有authenticated runtime，transitive code/dependencies共享那个私有tree，原工作树worker或node_modules不会被再次作为executable导入。

### Sealed worker 的 Git history：已解决

owned snapshot拥有自己的bare `.git` metadata，HEAD为精确snapshot commit，objects通过真实physical common object directory的read-only alternate解析；不会依赖旧helper主动丢弃的ambient GIT_DIR/GIT_WORK_TREE。原项目refs、index、configuration未复制或写入snapshot。resolution commits还在父进程literal-bound repository上预先验证。

archive只选择完整tree inventory中实际存在的selectors，snapshot所有selected files逐blob/object/mode/hash验证；缺失alternate entrypoint不靠伪造文件补齐。worker既有pre/post fullbyte/mode proof，也保留真实native18resolution校验。

### Root config／framework surface：已解决

snapshot包含 `tsconfig.next.json`、pages/src alternate roots、proxy/middleware/instrumentation root families、alternate next.config families和jsconfig families，旧observer会看到它原本需要拒绝的真实root files。

freeze→evidence/binding阶段的完整Git changed-path集合只能位于新 `legacy-successor` package内；任何其它path差分直接拒绝。实际Git负例覆盖next.config.mjs、jsconfig.alias.json、tsconfig.next.json和pages/hidden.tsx，全部保持RED。它不再只依赖旧app/data等少数pathspec判断protected baseline。

### Manifest policy grammar：已解决

expectedRuntimePolicy固定18个required字段、counter/digest grammar、additionalProperties=false。本角色独立AJV probe确认合法fixture接受，empty object／unknown productionAccepted key／负counter拒绝。原nested对象与Receipt semantics闭合边界保留。

### Deadline和失败处置：已解决

archive、tar和worker各自60000ms deadline；两个export子进程均等待settled结果，异常与signal不会被当成success。timeout code通过entry投射为internal，partial结果不成为PASS。owned snapshots/private runtime在finally移除。该边界只证明owned temporary IO隔离，不表示production/content/database rollback。

## 3. Semantic JSON 范围与原冻结限制

原strict decoder限制没有增加：32MiB、depth128、work64Mi、nodes250000。协调者保存的diagnostic显示5个unused历史audit/EASE JSON超过node上限；本轮读取该诊断而未把其FAIL改判PASS。

最终worker的strict输入集合与旧冻结observer实际semantic消费者一致：compatibility／legacy registry，canonical discovery roots的固定basenames与excluded segments，18个registered candidates、3个projections，public JSON与runtime graph reachable JSON。对于不被该observer解释的unused audit／opaque runtime data，仍执行fullbyte/mode snapshot，但不声称strict semantic parsing。

本角色逐源码核对canonical basenames/excluded segments与旧 `isCanonicalLegacyCandidateArtifactPath` 相同；runtime reachable JSON和public JSON没有因这个调整退出strict集合。TS resolver configs是JSONC source，真实raw bytes/mode受snapshot与protected baseline限制，使用release-bound TypeScript resolver grammar；报告没有将JSONC冒称已经被strict JSON decoder接受。

这属于真实consumer范围的限定，未删除受审AR package或live projection，未放宽frozen parser／旧checker assertions。将来若consumer集合或parser契约变化，必须按新bundle重新评审。

## 4. Native contract仍保留的条件

- 固定attempt008与独立legacy-successor v1；contentChanged=true、baselineOnly=false、wholePackAccepted=false、candidate-only、de-reached、liveAllowed=false。
- 从原source Git blob/mode/hash证明四文件import；另从实际reviewed release/source证明fresh QA修后的四文件。没有宣称fc是newmain祖先。
- 22changed IDs／record digests与1478完整untouched objects分别重算，A18真实记录独立绑定每一changed row。原whole-pack standards／provenance needs-repair与P3不因这条链消失。
- 新registry whole-object比对只准baseline metadata＋ARraw hash两处改变；另外17resolution、3projection、ratchet/canonical audit保留。真实runtime观察仍要求18total、15de-reached、3approved-projection及AR不可达。
- 真正A18/A11/A23 canonical reviewer/session identities与A22/A25 coordinator execution分别计数；3独立review sessions不是5或9名独立reviewers。
- Freeze commit→独立新ledger/actualevidence commit→Manifest/descriptor atomic evidence-child执行commit；futurecanonical Receipt在execution tree必须不存在。
- oldClosure/lifecycle通过真实native purevalidators与allartifacts验证，candidate/source/checker投影相等，保留historical-only与authorityTransferred=false。
- storedReceipt需exact relative path、distinct descendant storage commit、regular blob/mode、授权rawhash；replay和完整binding/semantic/selfdigests都要重算；仅shape通过不是Receipt acceptance。
- Public old3scripts、workflow selector、old8件v2.6bundle、oldledger及历史authority保持原字节；standalone协议没有global activation。

## 5. 实际执行与证据上限

| 检查 | 结果／限度 |
| --- | --- |
| 29件raw hashes、stable bundle、paths/modes | 本角色独立PASS；exact32d9c644… |
| 7 actual dependency trees | 本角色独立PASS；7/7、900files；已由bundle内artifact固定 |
| final `node --test coordination/integration/legacy-successor/contract.test.mjs` | 本角色35/35 PASS，0fail/skip/cancel；exit0；duration约7.393秒；stdout SHA-256 `0297c6c773cccd02872316b093979a9d4715a53151a28f7a829f72ff6ca81729` |
| schema闭合／rehasheddependency／alternateconfig负例 | 本角色独立probe＋actualtests通过；没有payload、provider或app执行 |
| real18resolution preparation integration | 协调者diagnostic v5JSON：18total、15de-reached、3approved-projection、result=pass；本角色读取及核对其明确nonReceipt标签；未将它当正式nativePASS |
| positive diagnostic raw hash | `e55bd60c82da83a3764280b706240d1c7fd584b5ac887dac6fb83757d9b14a77`；source fixture commit `1bdf3f86776ec061bc86efea224f1e9522ecebff`、execution fixture `699c6b29b1f54f29187ac7dbbbeb69e02def97df` |
| old8件bundle | 本角色再次逐blob比较，8/8等于旧release `f2f01782c93548f0ad5287570cf0cdaa432101b5` |
| package/lockfile/oldworkflow/oldledger | 本角色再次证实等于指定main HEAD |
| actualcheckerfreeze／newledger／newattemptvalidation | NOT-RUN；本报告与authored JSON不是这些操作的收据 |
| isolatedproductionbuild／type-check | 本角色NOT-RUN；A22须提供真实clean exact-release/source build证据 |
| newcanonical/fresh/replay／storage／Closure | NOT-RUN；后续必须按immutable phases及独立证据顺序 |
| globalCI／#262merge／旧#201close／live | 未建立；#262仍blocked，旧#201open，liveAllowed=false |

35tests创建的Git fixtures都在工具owned temporary scope中；项目source/index/refs未由本角色修改。本角色只新增本报告及自己的freeze-review JSON。协调者可把本报告精确bytes复制到 `coordination/integration/legacy-successor/reviews/a23-code-review-v3.md`，其rawhash供本角色JSON绑定；不可改内容或借此签发其它角色。

## 6. Freeze decision的使用范围

此次approval只适用于exact29paths/modes/hash及上述bundle digest，仍需独立A11相同bundle决定。任何bundle byte变化（包括dependency artifact或semantic consumer边界变化）都会使本决定不适用于新版本。

之后才能按已授权步骤创建真实freeze commit、后置newledger、actualA22/A25及A18/A11/A23evidence commit，然后登记atomicexecution。后续runtime/Receipt/Closure/requiredCI仍按实际结果分别判定；不从code review approval推导Shadow PASS、全包接受、merge或live授权。
