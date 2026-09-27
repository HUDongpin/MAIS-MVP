# A23 attempt-009 non-live disposition and custody review — v2

Reviewer session and canonical identity: `/root/a23_successor_design_review`. Reviewed at `2026-09-27T12:39:58.000Z`. This is a fresh A23 disposition record for the genuinely frozen v1.1 checker and actual prepared attempt-009 inputs. The earlier attempt-008 record and failed native runs remain historical evidence.

## 1. Scoped decision and exact bindings

**PASS for the bounded non-live disposition and custody review. P0=0, P1=0, P2=0 in this reviewed scope.** AR remains de-reached and candidate-only. The 22 corrections receive the existing bounded A18 content decision; the other1478 unchanged rows and the whole1500-row pack receive no new acceptance. This report is role evidence for preparation, not a native validation result, Shadow Receipt, stored Receipt verification, lifecycle transfer, global activation or live acceptance.

| Binding | Independently verified value |
| --- | --- |
| Checker version | `promotion-legacy-successor-v1.1` |
| Genuine release and target baseline | `611eacd502547cb75355de66e216a3785634f159` |
| Frozen source tree | `dd1eefc1f5cf5de8a6b1b2074c4de1f2348de2f2` |
| Exact32-file bundle digest | `37da13cdb32066c73156b5809b5733796615f3f47870db4478c0e94c18510582` |
| Candidate raw SHA-256 | `4f677216d3d9aec1b8f93be87a2900ff5a63f62e45a7555458ac146955ac0766` |
| Actual22-row change digest | `e1593bba0943f65daf1a8101eb31c310865ac5fabe41c7b12cff58c6092ed941` |
| Current prepared ledger raw SHA-256 | `ac63ccfe4b890231ea2745863460ea02e7f1319cda0ce50d4cf7a417a1bd56ab` |
| Current attempt-009 Registry raw SHA-256 | `6261bfe67e4b1fab0f739c62cc244648d63de77eb79c49e3d7a5a04adec475ea` |

The physical checkout is `/Volumes/Starship/MLS28`; Git operations were bound to its literal Git directory/worktree with inherited Git worktree variables removed. HEAD remains the real release611 commit. The initial release readback was clean; the ledger and new inputs are now authorized uncommitted evidence preparation. I did not change source, checker bytes, Git index, refs or another role's files.

## 2. Immutable checker ledger prefix and authentic freeze reviews

I compared the old authoritative ledger blob at execution `cc8ae1018ccfc7329b383053a9a5513d7b66c6c6` with the ledger blob included in release611. Both have mode100644, object `ffd8d45f3f9559011cc020a8aa6f0c25aa8e41b2`, and exact raw SHA-256 `6f1ec90ac803a3f378e8a5d68b585105faa1cd8d7a813c92f2b618c9a10cc3c3`. Their bytes are equal.

The current container has exactly two unique versions, preserving the complete original v1 entry in position0 and appending exactly one v1.1 entry. It does not rewrite the failed v1 entry or attach a successful result to it. The v1.1 entry references real release611, the exact32 path set and bundle37da, fresh genuine A11/A23 v4 freeze decisions and the frozen dependency record. The built-in `anchoredLedgerEntry` pure check independently accepted this exact prefix and unique new entry; full native ledger admission remains a later execution check.

| Fresh freeze artifact at release611 | Raw SHA-256 |
| --- | --- |
| A11 approval JSON | `91a9d91135e5dc6618bc9ed6a3df0c816a71fbdfba927d03e84b26fef8f210e3` |
| A11 v4 report | `df56fbf5ffc39983c5ad1f3ffb6b52a7614b59d4f0a523600fbf113d144c73aa` |
| Own A23 approval JSON | `60877020c02d668069cee23c40f2d07b2f3faf62af59ea424433fd3df00fe38a` |
| Own A23 v4 report | `fd7f3f2155e66f92077b9076dbd1d78926959d6ac90d105da0b4c04db4512c48` |

All32 current regular100644 files equal release611 blobs and the reviewed bundle digest. I separately rehashed the seven actual owned, lock-bound dependency installation trees:900 files, package-record digest `1c7dbf08aebc2ace01b787ce759512ac9dc1b2aa800df1609e790d5b9a007fa3`. They match the release-bound frozen dependency artifact and new entry. Each review JSON and its referenced report is an actual committed freeze blob with the named independent canonical identity. This check does not reuse old v3 freeze authority for the changed checker.

## 3. Exact Registry successor comparison

I loaded the actual new attempt-009 Registry and the historical workflow-selected p242 Registry from historical main `779cf5b7d70798e93a4f0e5a4fcc7e5921b70a86`. A full expected-object comparison and native pure `assertRegistrySuccessor` check agree: only these two values differ.

1. targetBaselineCommit becomes real release611, from historical `5227a9a951aadeff14d8c5320d5e0844e72c525e`.
2. `de-reach-arkansas-g6-g12-questions-v1` candidate.rawSha256 becomes4f677…, from original725138….

| Registry constraint | Result |
| --- | --- |
| Complete resolution collection | Same18 objects/IDs/order, with only the two allowed values changed |
| Other resolutions | All17 complete objects preserved |
| Approved projections | All3 complete resolution/projection objects preserved; all3 actual projection-file hashes match |
| Approval references | All4 actual referenced files rehashed and match unchanged references |
| Candidate bindings | All18 actual candidate-file raw hashes match the new snapshot |
| Ratchet | Complete original object/dates/terminal state preserved, no active exception reopened |
| expectedCanonicalAudit | Complete original object preserved, including opaque discovery limits |
| AR disposition | decision remains de-reached, liveProjection=null, approvalReferences=[] |
| AR enforcement | candidateMustBeUnreachable=true, liveProjectionMustBeReachable=false, liveAllowed=false |

This is a true content/scoring successor relative to the historical725 pack: contentChanged=true, baselineOnly=false, wholePackAccepted=false. Registry collection identity does not imply mathematical equivalence. The policy remains non-live and does not turn finite correction QA into an approved full-pack projection.

## 4. Historical custody, failed attempt008 and repair relation

I compared the five historical references against both actual working bytes and original historical-main Git blobs. The selected Manifest, canonical Receipt and legacy Registry, plus base Closure and lifecycle Registry, remain exact bytes. Their raw hashes remain respectively13a3533e…,32399bf2…,eae293ed…,57673919… and7be73b85…. The previously independently validated historical Closure/lifecycle layer is preserved; this review makes no new historical Shadow or current external authenticity claim.

The old v2.6 eight-file checker bundle still equals its original release `f2f01782c93548f0ad5287570cf0cdaa432101b5`, digest `1465ea9dcf02b3a1a8d0b738a4715ea861a366c19711e476db15a354c66570ff`. The original public scripts/workflow and old ledger layer are unchanged. No old Manifest, Receipt, Closure or Registry is overwritten.

All15 original attempt-008 files retain their prior cc8 Git modes, object IDs and bytes in release611 and the current worktree. Original Manifest raw73869fd0… and descriptor rawc30c3382… remain preserved. The three additional failed-native artifacts are frozen in the32-file v1.1 bundle; failure-index raw SHA-256 is `3716700b315313cbd319cd00ae4b4c054b4774bb4a04654afd1f225fcac2877c`. Both validate outputs remain raw `9ef341263e8b7808f1f84201940468c029e27b4aba7a7a0287e35b97fccfb868`, literal internal/ETIMEDOUT, exit3. No attempt-008 canonical Receipt exists.

The two relations remain separate: historical legacy-content725→4f is contentChanged=true; failed attempt008→009 repairs checker capacity with candidateChanged=false, checkerChanged=true and shadowApprovalInherited=false. The explicit repairOf contract binds cc8, the original failed Manifest/descriptor and new failure index. A timeout is not promotion evidence, and original role PASS records are not a successful native result.

## 5. Candidate/A18 reuse and authentic current role records

I independently ran pure contentDelta over the common-base original pack and actual freeze candidate. It returned exactly22 changed IDs/digests,1478 unchanged objects and changeDigest e159. Every A18 reviewedRows afterDigest matches that delta. The four current candidate/scoring-source files preserve their prior accepted cc8 objects/modes/bytes; Git diff from original ce release to new611 contains only paths below the new legacy-successor root. Original sourcefc and common-base483 provenance, exact source-import blob references and subsequent bounded dollar-scale correction remain fixed.

New attempt009 contains the genuine original A18 JSON bytes `92e8fe942e81eae64c3605a997e919eca135c5b6125b4c495d3ddc8f023c7d7d`. Its actual original date `2026-09-27T10:24:27.000Z` and report path in attempt008 remain unchanged, with report raw `cd19480f329238d2b730a80405283957a4b7cb13235ec66f7296824348e2009c`. This is exact evidence reuse for unchanged candidate/scope; it is not a newly performed mathematical review. I did not author A18's decision or rederive all22 answers. Calendar-year P3, numeric-dollar form LIMIT, restricted machine coverage and standards/provenance debt remain as the original report records; wholePackAccepted=false.

I read and verified the fresh independently authored attempt009 A11 report and record. Record raw SHA-256 `4bf4dacb3e4782596cd45d667ea4e047de6621b5d22571c40839a1d3b1d621c1`, report raw `80b3fffcf147718514527657ced7a5d3b7be0be85f2f6078ee259286caf30eac`, canonical identity `/root/a11_pr172_copy_verify`. It binds new freeze611/bundle37da/candidate4f/changee159 and distinguishes focused regression, actual43-test coverage and coordinator build readback from native execution. I checked its schema/bindings; A11 owns its own QA conclusion.

The final A25 coordinator record/report were read after the preparation clarification. Their hashes are `804df83e420aec3a81e7d5809f42cae21d9c4f0a99543505c6c17466082705ab` and `57c8f2467890212733f515ca19a47a8825dd717912735b7c73fc49d973bcead4`. The clarification explicitly preserves old v2.6 bytes, old v1 entry, original15 modes/objects and failed-native records. These are actual `/root` coordinator execution records. Three independent A18/A11/A23 sessions and two coordinator A22/A25 records do not establish five independent reviewers.

## 6. Actual fresh build and historical policy reuse

The fresh actual A22 archive build completed `npm run build` with exit0 in `/Volumes/Starship/LB29`, source611/tree dd1eef…, cleanBeforeBuild=true and cleanAfterBuild=true. The captured source inventory checked11600 files/1024998736 bytes. I independently recomputed source tree and SHA-256 of raw `git ls-tree -r -z611`, inventory digest `00fdd6369c1ddf6ef3e69e889b8c02bc31084bccd6f139f55dcd0242c3b910c9`. The whole build started `2026-09-27T12:28:12.107Z` and completed `2026-09-27T12:34:20.183Z`.

Full original build log and transported `.txt` bytes both hash to `6c1ad6dd05ec3eb7155be9e101beccd5f05e62c54338920012eea431e2625aa3`. Actual new A22 record raw is `c065b1753254b468aac4d014e7f10a96ad27bb73a0c436cac29df0db0123197f`, report raw `f8db87ff9ba0ad9e701cc58fa7addf5ad7f3235d11272b0ee08c06a8a0109303`. I verified these raw bindings and coordinator identity. I did not repeat the production build or the full1GB archive materialization; this is independent readback of actual coordinator execution.

The expected runtime policy is the genuinely observed prior ce2557 policy, digest `3780c799d44d9057ba44dd25ead600a9ad853694f740034bec381c187de60fe5`, and canonical audit digest remains `e340d3f2cc3ae20e4e5a7ffaef12b642a2e3811138fd161714d8bb7a837abc91`. I proved ce→611 has no changed paths outside `coordination/integration/legacy-successor/`; actual runtime/legacy/scoring sources remain identical. The preparation plan explicitly records expectedPolicySource=ce2557. This permits a source-identical expected-policy reuse; it does not constitute a fresh attempt009 observation. I did not run observePreparation or a native operation for009. Actual sealed native execution must freshly observe all runtime/legacy resolutions and compare against the bound policy.

## 7. Remaining immutable execution gates and authority

I ran read-only byte/object/mode/hash comparisons and pure strict-JSON/schema/evidence/contentDelta/registry/prefix checks. I did not run validateAttempt, Shadow, replay, Receipt verification or freeze. At this review there is no attempt009 Manifest, descriptor, evidence index or canonical Receipt. The new ledger and real inputs remain evidence preparation for a subsequent immutable evidence commit, followed by its direct-child atomic Manifest/descriptor execution commit and actual native validation.

The later checker must enforce genuine release32/dependency/review binding, immutable prior ledger prefix and failure custody, protected source delta, actual role/report raw/semantic bindings, future-Receipt absence, fresh runtime/legacy observation, canonical and distinct replay results, exact Receipt storage/finalization and postflight custody. The300-second limit applies per worker: validate/shadow/verify use1/2/3 workers plus authentication, parent sealing, archive/materialization, historical checks and cleanup costs. Capacity diagnostics are not native PASS; insufficient total capacity or unsupported specialist/public-wrapper routing remains BLOCKED.

This A23 pass is scoped to the exact611/37da/4f/e159/Registry6261/ledgerac63 bytes. A change to these bindings or expansion of content/reachability authority requires a fresh genuine decision. #262 remains blocked and non-mergeable; #201 remains open. Global workflow activation, merge, deploy, cleanup, live acceptance and whole-pack promotion are outside this decision and were not executed.
