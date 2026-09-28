# A23/A10 v4：v1.1／attempt009 checker freeze 独立审查

日期：2026-09-27；实际 reviewer identity／session：`/root/a23_successor_design_review`。审查对象：`/Volumes/Starship/MLS28`，`promotion-legacy-successor-v1.1` 的精确32件候选。MLS28当前baseline HEAD为 `cc8ae1018ccfc7329b383053a9a5513d7b66c6c6`，本轮code尚未提交。

**Verdict：`approved-for-checker-freeze`，仅针对最终bundle `37da13cdb32066c73156b5809b5733796615f3f47870db4478c0e94c18510582`。最终P0=0、P1=0、P2=0。** 这是本角色新撰写的v4决定，没有复制v3 approval或把旧f95…候选换hash改判。新freeze／ledger／evidence／binding／native结果仍需真实建立。

此次scope批准的是有真实测量依据的新版本300秒worker容量合同。原v1／attempt008的60秒合同与两次internal/ETIMEDOUT保留；specialist wrapper仍不支持此新容量，global workflow／required check继续BLOCKED。#262不进入merge，旧#201保持open。

## 1. 最终精确字节及独立验证

| Binding | 本轮结果 |
| --- | --- |
| inventory | `/private/tmp/mais-successor-v11-final-review-inventory-v2.json`；authority=false |
| raw bundle algorithm | sorted `{path,rawSha256}` rows，sorted-key stable JSON，SHA-256 |
| 重新计算bundle digest | `37da13cdb32066c73156b5809b5733796615f3f47870db4478c0e94c18510582` |
| individual bindings | 32/32相符，全部regular100644 |
| native／bootstrap path arrays | 完全相同，32条 |
| candidate pack | `4f677216d3d9aec1b8f93be87a2900ff5a63f62e45a7555458ac146955ac0766`，相对原008不变 |
| content delta | 原22changed／1478untouched、`e1593bba0943f65daf1a8101eb31c310865ac5fabe41c7b12cff58c6092ed941`保留；本轮没有重签数学判定 |
| actualdependencies | 本角色重新遍历7个package trees、900files，全部匹配frozen artifact；packages digest `1c7dbf08aebc2ace01b787ce759512ac9dc1b2aa800df1609e790d5b9a007fa3` |
| finalsource4 | pack、solvability test、prompt-derived solver、audit script均等于cc8的原四件修后字节 |

本角色独立执行完整候选tests：**43/43 PASS**，exit0、0fail/skip/cancel，duration约32.317秒，stdout SHA-256 `1d49d47bc7481173c602c118e2d142dec9d8cd2804aa81f94f894397e87bf7e4`。测试使用工具owned disposable Git fixtures；本角色没有修改项目refs/index或source代码。

## 2. Ledger authority与旧v1保存

新builtin-only bootstrap与native collectAuthority都固定已知旧锚点，先验证它，再验证新release中的prefix，最后接受后置追加：

| 旧锚点字段 | 固定值 |
| --- | --- |
| previous execution | `cc8ae1018ccfc7329b383053a9a5513d7b66c6c6` |
| ledger path | `coordination/integration/legacy-successor/checker-releases.v1.json` |
| regularmode／blob | `100644`／`ffd8d45f3f9559011cc020a8aa6f0c25aa8e41b2` |
| raw SHA-256 | `6f1ec90ac803a3f378e8a5d68b585105faa1cd8d7a813c92f2b618c9a10cc3c3` |

bootstrap证明previous execution→newrelease→currentHEAD ancestry，要求新release ledger blob/mode/object等于锚点，并在外部imports前验证完整rawbytes。后置ledger必须保留旧entry完整与原order，只追加一个精确v1.1 entry；所有版本唯一。native重复相同证明，不以candidate-controlled新release自身作为唯一旧entry的信任来源。

测试真实拒绝改写release prefix、删除／重排／改旧bundleDigest、duplicate version及错误新version。newledger未提前写进freeze，避免用一个包含未来release SHA的对象形成自引用。旧v1 entry没有被补上failed字段或改写。

本角色再次核对当前oldledger等于原cc8 blob；旧8件v2.6bundle仍等于其原release，package/lockfile/globalworkflow/旧v2ledger不变。MLS27仍保留cc8与旧v1代码；v1.1不能冒称从最新入口执行旧008。

## 3. 两层relation与failed008 custody

legacy725138…→4f677…仍是22项内容变化；008→009是同candidate的checker repair。Manifest／descriptor通过精确 `repairOf` const分别绑定008execution、原Manifest raw73869…、原descriptor rawc30c…与新增failureIndex raw371670…，并固定candidateChanged=false、checkerChanged=true、shadowApprovalInherited=false。新attempt identity固定009、checker version固定v1.1，没有任意attempt regex或latest-entry fallback。

008没有canonical Receipt，不能构造完整Manifest/Receipt directparent。历史CA Manifest/Receipt/Closure/lifecycle维持独立historical-only layer；新Receipt semantics声明priorAttemptId=008／priorAttemptOutcome=internal-timeout，但不转移旧Shadow批准。

失败index和两份保留错误输出纳入这32件bundle：

- failureIndex raw SHA-256 `3716700b315313cbd319cd00ae4b4c054b4774bb4a04654afd1f225fcac2877c`。
- 两份native错误输出的raw SHA-256均为 `9ef341263e8b7808f1f84201940468c029e27b4aba7a7a0287e35b97fccfb868`；内容保持result=internal、code=ETIMEDOUT、liveAllowed=false；index绑定exit3及不同记录ID。

raw hashes相同不用于证明独立run identity；它们是协调者实际两次执行保留的错误输出records，没有被当Receipt或passing输出。本角色没有重新执行008，也没有改变失败code。

本角色从cc8枚举原008的15files，当前bytes与mode逐件相同；原canonical Receipt仍不存在。复审中的P2被修复：native现在同时比较old/currentmode、GitobjectId与bytes；actualGit mode-only旧A18artifact变更负例拒绝。它不再仅用bytes作custody证明。

## 4. 容量调整依据与operator完整时长

真实A11完整diagnostic report作者为 `/root/a11_pr172_copy_verify`，raw SHA-256 `3f4b030d55ad8485ebc86f86d2b1bfb85cffde24b005f28366ba054d176ba060`。原bootstrap认证bundle32d9…与dependency1c7d…后，在新private copies中作instrumentation、deadline300s与diagnostic stderr forwarding；没有编辑frozen source或运行Shadow。

该报告明确diagnosticOnly=true、authoritativeReceipt=false、nativeAttemptResult=not-produced。保留此前180秒partial diagnostic及两个native timeout，没有用本次诊断覆盖它们。测得worker238.168s、entire diagnostic298.874s；三个完整runtime observations合计128.428s，pre/post verification合计61.210s。完整diagnostic中的18/15/3结果只属于diagnostic layer。

v1.1采用固定worker300000ms，相对这次测量保留约61.832s容量；archive与tar仍各60000ms。它没有提高strict JSON的32MiB/depth128/work64Mi/nodes250000限制，没有去掉semantic consumers、三次scans、pre/postbyte/mode验证或17其它resolution／3projection保护。一次完整测量不构成percentile或CI机器时长保证；新原生操作仍要按实际结果通过或失败。

**Operator必须按完整CLI分配等待时间：**

| native operation | 实际worker次数 | worker预算合计 | 另须计入 |
| --- | ---: | ---: | --- |
| validate | 1 | 300s | bootstrap/capture/import、parent source sealing、archive、authority/currentness及cleanup |
| shadow | 2 | 600s | 两次完整validate，owned-output rehearsal与rollback，以及上述parent开销 |
| verify-receipt | 3 | 900s | 首次validate＋Shadow的pre/post两次validate，storage transport／Receipt shape/binding/replaycomparison及parent开销 |

300秒是单worker上限，不能作为整个CLI的watchdog。archive各阶段与parent/authority/cleanup还需足够margin；尤其verify不是一次worker。操作方必须使用覆盖完整操作的有界outer watchdog，保持timeout／termination失败及owned-process/temp custody。这个表没有承诺某个总时长必然成功，也没有把旧wrapper的60秒boundary改写为已支持新协议。

`rejectFailedWorker`对ETIMEDOUT/SIGTERM立即拒绝；任何nonzero child即使stdout含完整-looking PASS也拒绝；malformed/partial output不能变PASS。实际负例覆盖expired、terminated、nonzero、partial输出。修改版本容量后，成功仍只能来自实际新execution commit的完整native操作。

## 5. Receipt replay边界修复

本角色复审独立确认旧逻辑允许128字符canonical runID，但追加 `-verify`得到135字符，使合法Receipt无法verify。该P2只在新MLS28候选修复；旧v1源码与记录未重写。

新helper检查原grammar，改变首字符（原v→r，其余→v），附固定verify marker和SHA-256，产生72字符合法ID。首字符必然不同，故不依赖“哈希大概率不同”证明distinctness。相同input确定性相同；invalid129/empty拒绝。actualschema/shape test涵盖max128及合法字符边界，verifyStoredReceipt已使用helper。

run identity仍不进入semantic digest；此变更不修改candidate/source/baseline/checker proof、external effects或lifecycle权限。

## 6. 仍保持的内容／阶段边界

原A18decision raw `92e8fe942e81eae64c3605a997e919eca135c5b6125b4c495d3ddc8f023c7d7d` 与report raw `cd19480f329238d2b730a80405283957a4b7cb13235ec66f7296824348e2009c` 均在008ancestor保留精确bytes/date/report path。候选与真实评分相关source未改变，可在原22项scope引用它；fullpack仍candidate-only，原P3、美元形式LIMIT、standards/provenance债务仍保留。

新A11/A23 freeze records必须是针对37da…的真实freshv4记录；新A11合同/回归、新A23newbaseline/registry disposition、新A22 actualcleanreleasebuild与A25custody按新版本分别建立，不能只修改008记录的日期或bundlehash。evidence commit先于atomicbinding/execution，futurecanonical Receipt在execution tree不存在，storedReceipt仍需distinctdescendantstorage/regularblob/mode/authorizedrawhash与replay。

新registry仍只能更新实际newbaseline与ARraw绑定，保留另外17resolution／3projection／ratchet/canonicalaudit。历史Closure/Registry不overwrite，不把localvalidation或scopedrolePASS解释成完整Shadowclosure。

## 7. 本轮动作与approval范围

本角色只读source/Git/dependencies、运行ownedfixture tests，新增本v4report及自己的v4freezeJSON；没有编辑32件source、stage/commit/push、执行newnativevalidate/Shadow/replay或调用provider。

approval只适用于exact37da…和32paths/modes/hash；修改任何一件（含失败index/outputs、schema、容量或dependencyrecord）都需要重新独立审查。新freeze、后置appendledger、actualevidence/build、attempt009binding与native结果目前未由本报告建立。globalrequiredcheck/activation仍unsupported/BLOCKED；#262不merge、#201open、liveAllowed=false。
