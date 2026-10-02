# A23：attempt-008 NON-LIVE legacy successor disposition 独立审查

实际 reviewer/session identity：`/root/a23_successor_design_review`；日期：2026-09-27。此报告由本 A23 直接撰写，供闭合 `promotion-legacy-successor-evidence.v1` 中的 A23 record绑定。

**Scoped result：PASS／`de-reached-successor`。** 接受的是把真实内容变更保持在新的非live correctness successor中，并保存历史custody；`contentChanged=true`、`baselineOnly=false`、`wholePackAccepted=false`、`liveAllowed=false`。整个1500题包仍candidate-only；数学／评分接受范围由真实A18 v2决定限定为22项。本报告不是Manifest validation、Shadow Receipt、Closure、Registry finalization、global required-check、merge或live批准。

## 1. 精确 source/checker/candidate binding

| 对象 | 本角色独立核实 |
| --- | --- |
| 真实freeze commit | `ce2557ddbce550b0e92f41d3588bb4b5803e696e` |
| freeze source tree | `48d0def4fa27ceb226ef200ecc53412bcfbdaa72` |
| immutable native bundle | 29files；`32d9c644bc3c1e104c02712148d45dabf2c3a8ea6ac98c0459dc93d365821e02`；真实freeze Git blobs与本角色v3 approval逐件一致 |
| historical main layer | `779cf5b7d70798e93a4f0e5a4fcc7e5921b70a86`；历史refs从这个immutable tree读取 |
| original source import | `fc6c24446659c54f92482cffd2de6e180bbb03c2`；common-base `4834189e63d74f0e1a27475d9968f5c88c2bc78f`；原四件source blobs与修后reviewed source分开 |
| original pack raw hash | `72513886e6b52a253e598c744ae1d4a5bedfe5ebf6f8d6c544fc51904a555452` |
| current pack raw hash | `4f677216d3d9aec1b8f93be87a2900ff5a63f62e45a7555458ac146955ac0766` |
| independent content diff | 22changed／1478untouched；`e1593bba0943f65daf1a8101eb31c310865ac5fabe41c7b12cff58c6092ed941` |
| new ledger raw hash | `6f1ec90ac803a3f378e8a5d68b585105faa1cd8d7a813c92f2b618c9a10cc3c3` |
| new registry snapshot raw hash | `27bc77b06679972f41087144ced90d5470ba2776344ffde6b4a4182b0c54dd89` |

本角色从Git原题包与freeze题包重新执行纯contentDelta，精确22个ID与每个afterDigest均等于真实A18 authored v2 record；没有把source内independentAnswer/manualQaStatus或协调者布尔值当作数学批准。本角色没有重做22题的数学推导。

freeze commit中本角色authored checker-freeze JSON raw hash仍为 `9fd41db45dcf17ce94361e7b4256e07bc740ccb50f9d0970f195da79e7e6687f`，其报告raw hash为 `e39c167e14f5e8d73dd9aa56d8729b8207da92d2199471fa0ee1665b0160a45b`。A11对应freeze record/report也从真实freeze blobs核对。新ledger只有一个v1entry，指向这个已存在release；29paths/bundle、两份真实review refs和7 frozen dependency bindings一致。ledger当前是evidence preparation bytes，尚未把其存在称native ledger admission。

## 2. 新 Registry 的真实处置比较

本角色读取实际新 `attempt-008/inputs/legacy-resolution-registry.v1.json`，并与旧workflow-selected p242 registry逐对象比较。expected对象只作下列两项变化，随后与实际new对象完整比较，相等：

1. `targetBaselineCommit` 从历史 `5227a9a951aadeff14d8c5320d5e0844e72c525e` 改为真实freeze `ce2557ddbce550b0e92f41d3588bb4b5803e696e`。
2. `de-reach-arkansas-g6-g12-questions-v1` 的candidate.rawSha256从原725138…改为修后4f677…。

| 其余约束 | 本角色结果 |
| --- | --- |
| Registry总集合 | 18resolution，不增不减，原order保留 |
| 非目标resolution | 另外17个完整objects相同 |
| approved projections | 3个完整objects相同；其3件live projection raw files及4件approval reference raw files都重新算hash，相符 |
| candidate raw bindings | 全18件candidate files均重新算hash，与new snapshot匹配 |
| ratchet | 完整相同，未重开例外或改旧日期 |
| expectedCanonicalAudit | 完整相同，不删除旧opaque/known限制 |
| ARdecision | 仍de-reached |
| ARliveProjection／approvalReferences | null／[] |
| ARenforcement | candidateMustBeUnreachable=true；liveProjectionMustBeReachable=false；liveAllowed=false |

相同ID/container profile不能被解释成数学语义相同。新candidate有真实内容／评分变化，因此选用新immutable successor；旧baseline-only/evidence-only路线不适用。该snapshot也不把有限22题QA换算为AR全包approved projection。

## 3. 历史 custody 与 evidence layers

本角色逐字节核对旧selected Manifest／Receipt／legacy registry、base Closure及lifecycle Registry仍等于原historical main blobs；新文件没有覆盖旧路径。旧v2.6 ledger与8件checker bundle保持其冻结release字节，旧public scripts/workflow未切换。

| 历史对象 | raw SHA-256 |
| --- | --- |
| selected Manifest | `13a3533e74894603788dfa865f7f06047914efd8e26f35a00ede4c67321c17a0` |
| selected canonical Receipt | `32399bf241f6e85a41fbc786555ae70fda000a3806c63aad563a71b4eb6b7a21` |
| selected legacy registry | `eae293ed951baba4103ccf89b0cf619dab314e78953359923932d838fe6475f0` |
| base Closure | `576739195d22ba0133a31da292c1e08d602202a9725e04107e50779c47d3c4af` |
| base lifecycle Registry | `7be73b854a9eb408dfdad671c262e4640fb93136df188b1fd3ecd9e369b77159` |

本角色运行的是只读native purevalidators：Closure使用10件真实artifact bytes／hash；lifecycle验证真实event chain与直接父绑定，两者通过。selected-parent与base的candidateDigest/sourceCommit/checkerVersion/checkerRelease投影相等。此结果仅证明历史native layer的结构／digest／bindings，保持 `historical-only`、`authorityTransferred=false`；不把旧shadow_passed转给新attempt，也不是新鲜GitHub/API真实性或live readback。

## 4. 新鲜 preparation observation 与其它角色证据

本角色独立只读执行 `observePreparation`，所得runtime policy digest为 `3780c799d44d9057ba44dd25ead600a9ad853694f740034bec381c187de60fe5`，canonical audit digest为 `e340d3f2cc3ae20e4e5a7ffaef12b642a2e3811138fd161714d8bb7a837abc91`，完整audit与原registry相同；dynamic nonliteral import count=0、zeroBaselineCallCount=0。结果与实际preparation plan相同。

它是preparation diagnostic，没有运行newregistered execution的native validate、Shadow、replay或Receipt verifier。真实sealed native执行仍须在immutable evidence/binding commits就绪后再证明每一resolution的runtime disposition。既有v5real18/15/3 diagnostic也保留nonReceipt标签。

真实A18 JSON与报告复制到inputs后raw hashes仍为 `92e8fe942e81eae64c3605a997e919eca135c5b6125b4c495d3ddc8f023c7d7d`／`cd19480f329238d2b730a80405283957a4b7cb13235ec66f7296824348e2009c`。有限22题接受、原P3、美元形式LIMIT及standards/provenance债务按其原scope保留；本报告不另签A18决定。

A22是协调者 `/root` 的实际execution：captured build log记录freeze source ce2557…，buildExitCode=0、cleanBefore/After=true。source tree与raw `git ls-tree -r -z` inventory digest `1ef8d61f9edd01ab97e98e1ac6476d2cc2530d4069e9846f5972967aee102dd6`由本角色从Git重新核对；存储build lograw hash `f88ed7746677d4a1f64cacddb526b8ce24021c04e1ca7a3946b1bb1c1c400474`相符。本角色读取／核对该execution record，没有冒称自己重新build。

A25是协调者真实custody record。A18/A11/A23的独立review sessions与A22/A25的两份coordinator execution records分开计数；文件数量不证明额外独立reviewers。A11当前真实attempt record已另行产生，本角色核对其identity／candidate／change／checker及report raw绑定；record raw hash为 `4429286a6997fe374259d3726e0c33e5a84fb62cff2aa1e1bdf7975cbf02657c`。全部evidence commit／atomicbinding仍须完成；本角色A23 scoped PASS不能替代A11的QA结论或整体native gate。

## 5. 当前准入与后续门禁

本角色仅创建本报告及自己的 `inputs/evidence/a23.v1.json`；没有修改候选、checker、旧authority、Git refs/index或其它角色产物。当前未来canonical Receipt和新Manifest均尚不存在；本记录不会预存未来Receipt。

可以将真实角色records／report／registry／ledger纳入独立evidence commit，再以其directchild atomic-add Manifest与descriptor建立execution。每份role证据的currentness、raw/semantic bindings、source/release/dependency、protected delta、未来Receipt absence、native validate／canonical/fresh/distinct replay／verification及后置storage/finalization，仍由实际immutable phases逐项验证。

本 A23 decision 的有效范围是candidate4f677…、changee1593…、checker32d9…、freezece2557…及newregistry27bc77…。变动这些字节或扩大candidate／reachability／QA范围需要新的真实review；不能改本记录hash或日期沿用旧PASS。#262保持blocked，旧#201保持open，global activation／merge／deploy／live acceptance未授权且未执行。
