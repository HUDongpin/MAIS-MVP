# A11 full-phase read-only capacity diagnosis

Date: 2026-09-27. Author: `/root/a11_pr172_copy_verify`.

**diagnosticOnly=true; authoritativeReceipt=false; nativeAttemptResult=not-produced; liveAllowed=false.** This is a measured diagnostic of modified private copies, not a native Promotion PASS. The original two native failures and the separate180s partial diagnosis remain intact.

## Scope and custody

Input execution commit: `cc8ae1018ccfc7329b383053a9a5513d7b66c6c6`.

Unchanged original bootstrap authenticated bundle `32d9c644bc3c1e104c02712148d45dabf2c3a8ea6ac98c0459dc93d365821e02` and dependency digest `1c7dbf08aebc2ace01b787ce759512ac9dc1b2aa800df1609e790d5b9a007fa3`, capturing929 files. All code/dependencies were copied into a new private runtime before diagnostic imports. The actual Manifest and registry were read unchanged.

Only private captured files were modified: phase/timing output in the observer and its core/v2 helpers, worker deadline300s, and diagnostic stderr forwarding. Original checks, strict consumers and three runtime observations remained unchanged. Each instrumentation step's original/modified SHA is recorded in instrumentation.json. No frozen code/schema/ledger/Manifest/role evidence/Git authority was changed, and no Shadow/replay was called.

The worker diagnostic deadline was300s and the whole-driver watchdog400s. This single full-phase run completed exit0 within the watchdog. Its diagnostic outcome counts are18 resolutions,15 de-reached and3 approved projections; source snapshot digest:

`6fbc58d06f911b9c0edba9e8a4d7acbaf1edd7745d78a81dfb21bbecf9bcb49e`

No canonical Receipt, native result or lifecycle transition was produced. The files result.json, stdout.log, stderr.log, instrumentation.json and captured-runtime retain their non-authoritative meaning.

## Full measurements

| Phase | Duration |
| --- | ---: |
| Authentic original bootstrap | 5.959s |
| Capture copy | 1.075s |
| Private module import | 0.273s |
| Worker pre-verify | 31.547s |
| Strict semantic JSON (63 calls) | 2.787s wall |
| Scan1, explicit observe | 45.481s |
| Strict reachable JSON (15 calls) | 0.933s wall |
| collectV2RuntimeAndLegacyProof total | 127.696s |
| Scan2 inside collect | 41.349s |
| Canonical legacy audit total | 77.803s |
| Scan3 inside canonical audit | 41.598s |
| Audit remainder after scan3 | 36.205s |
| Reachable-source text reads (1482 sources) | 5.984s |
| All18 resolution reference/currentness checks | 2.420s |
| Worker post-verify | 29.663s |
| Worker full elapsed at final marker | 238.168s |
| Entire diagnostic wall time | 298.874s |

Strict JSON accumulated parser/read timing is3.713s across78 calls; wall time across its two explicit sections is3.720s. Individual resolution durations are preserved in raw stderr (33–235ms in this run), not inferred from a fixture count.

The three complete observations total128.428s. Canonical audit's36.205s remainder includes its discovery/correlation work and other audit operations; instrumentation does not isolate every suboperation within that remainder. Its third scan must not be counted again when summing audit total.

The difference between the sealedRuntimeProof call wall duration and the worker's internal elapsed is approximately53.322s, combining parent source binding/archive/setup/cleanup and worker startup. Those components were not individually instrumented. This is a combined residual, not a separately measured parent-proof or cleanup duration.

## Original60s mismatch

The worker first full observation ended at79.876s in this complete run; the prior180s diagnosis ended that same phase at72.179s. Either exceeds the frozen60s worker budget before collect and post-verify. Original bootstrap authentication measured4.535s in the prior run and5.959s here, well below its30s Git deadline.

The earlier native JSON's raw ETIMEDOUT could not by itself identify the command; this read-only diagnostic demonstrates that the actual worker workload cannot finish under60s. The measured three scans plus required pre/post source verification alone consume about189.638s here, before the remaining audit/source/reference work. The18 resolution checks are not the principal bottleneck.

The earlier180s private diagnostic also failed to complete and retained exit124 at its230.596s whole-driver watchdog. It has no completed runtime result and is not replaced by this completed diagnostic. Native validate v1/v2 remain internal/ETIMEDOUT. Earlier scoped role/code/source/build PASS records remain scoped and do not fill native validation.

## Capacity-contract implications

These observations justify a separately reviewed capacity repair, not changing the old frozen deadline in place or rerunning until green. The observed worker range is not a percentile estimate or a CI-machine performance guarantee: this is one complete measured run, one partial run and two native failures on the local host. Instrumentation/logging and host load can affect timing.

A new immutable checker/attempt relation should bind the new capacity policy and preserve the old source, checks, schemas, strict JSON consumer semantics, dependency authentication and historical custody. If redundant observation is reduced, reuse must be proven against the same authenticated sealed-byte/path/mode set, with the same graph/resolver/candidate policy and complete legacy audit; mutable global caches or path exclusions are not equivalent.

If the integrity checks and three scans are intentionally retained, the new bounded worker deadline must account for the measured238.168s plus justified capacity margin, while keeping timeout/termination an internal failure. Whole validate/Shadow/replay capacity must also account for bootstrap, parent sealing/cleanup and repeated validation calls. This report alone does not authorize or approve any selected deadline.

After repair, require independent exact new-bundle review, new frozen ledger anchor, real attempt evidence and real native results under that immutable contract. Old attempt008 and its failures must not be rewritten. #262 remains blocked; no global workflow activation, merge, deployment or live claim follows from this diagnostic.
