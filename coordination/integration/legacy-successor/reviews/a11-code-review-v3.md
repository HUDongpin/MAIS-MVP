# A11 independent checker freeze review v3

Date: 2026-09-27. Author and reviewer identity: `/root/a11_pr172_copy_verify`.

Verdict: **approved-for-checker-freeze**, restricted to the exact 29-file bundle below. No unresolved P0/P1/P2 remains in this bounded checker-code review. This is not an attempt validation, Shadow Receipt, replay verification, build acceptance, global workflow activation, merge, deployment, live acceptance or whole-pack approval.

## Immutable review binding

The worktree baseline is `779cf5b7d70798e93a4f0e5a4fcc7e5921b70a86`. The coordinator paused all 29 bundle-file writes before this final review. The independent final read recomputed every raw SHA-256 from the supplied final packet: **29/29 matched**.

Bundle digest:

`32d9c644bc3c1e104c02712148d45dabf2c3a8ea6ac98c0459dc93d365821e02`

`BUNDLE_PATHS` and the built-in bootstrap's `TRUSTED_BUNDLE_PATHS` contain the same ordered 29 paths. The actual seven owned dependency trees match the Git-bound frozen dependency record, including their versions, lockfile integrity references, paths, modes, file counts and tree digests. Their recomputed dependency digest is:

`1c7dbf08aebc2ace01b787ce759512ac9dc1b2aa800df1609e790d5b9a007fa3`

The 29 paths include the successor code, embedded-parser bootstrap, worker, new closed schemas and tests, frozen dependency bindings, the invoked old native v2.6/finalization code and schemas, lock/package files, strict parser and four candidate/source files. The original public promotion dispatcher and workflow retain v2.6 routing. This review does not replace those selectors.

## Independent verification

- Independently ran `node --test coordination/integration/legacy-successor/contract.test.mjs`: **35/35 passed**, no skipped tests, exit 0, 7.50 seconds.
- Recomputed the final bundle hashes independently after reading the final packet. An initial diagnostic read expected the older packet key `paths` and returned KeyError; reading the actual final `bindings` field resolved that diagnostic formatting error without changing any authority or code.
- Independently observed actual installed dependency trees and compared them with the newly frozen dependency record.
- Previously independently exercised rehashed production claims, nonzero external effects and impossible dates; the new closed native Receipt validator rejected them. Final contract tests repeat these boundaries and include poisoned-dependency and rehashed-ledger adversarial cases.
- Read the actual v5 sealed-observer integration diagnostic. It reports pass for 18 resolutions, 15 de-reached objects and 3 approved projections, explicitly `preparationEvidenceOnly:true`, `authoritativeReceipt:false`, `liveAllowed:false`. Its source snapshot digest is `a5b6a3db6370caecc5a6916e62c938789407fd619a1d53f7f80c20b9d6ceea09`. This was coordinator-executed diagnostic evidence, independently inspected here; it is not an A11-executed attempt, a Shadow Receipt or a lifecycle transition.
- Read the final alternate-config/source guards. Four actual Git-fixture regressions reject post-freeze changes to next.config.mjs, jsconfig.alias.json, tsconfig.next.json and pages/hidden.tsx. The final evidence-delta rule rejects every changed path outside the new successor ROOT.

The contract tests create their own synthetic Git fixtures. They neither mutate the task worktree's Git state nor provide substitute Promotion authority. No native attempt validation, Shadow, replay or publication was executed by this reviewer.

## Prior findings and closure

1. **Independent role identity:** A18/A11/A23 session and identity are pinned separately to the actual assigned reviewer paths. Tests reject identity/session substitution. Freeze review records bind the exact code bundle and report. These are repository/coordination identity assertions, not cryptographic claims about distinct people; authentic records must still be authored by the assigned tasks.
2. **No unverified dependency imports:** The entrypoint bootstrap uses only Node built-ins and its embedded frozen bounded parser. It authenticates all code Git blobs and dependency trees, verifies the release-bound frozen dependency record, captures exact bytes/modes and copies them into a new private runtime before dynamic imports. A changed dependency is rejected before its code loads; rehashing the subsequent ledger does not change the release-bound expected tree.
3. **Sealed observer Git identity:** The observer uses a Git-object snapshot with private metadata and read-only common object alternates. This supplies Git identity even when the frozen old helper discards inherited GIT_DIR/GIT_WORK_TREE. It does not modify the old v2.6 helper or shared Git metadata.
4. **Archive and alternate entrypoints:** Git archive receives only selectors represented by actual tree records. Missing alternate roots remain part of the discovery boundary. Root next.config.*, jsconfig.* and framework special files, tsconfig.next.json and alternate pages/src roots are retained. Exported bytes/modes are checked against the parent Git records by the worker.
5. **Strict actual JSON consumers:** The worker strictly parses compatibility/registry, all candidate/projection JSON, canonical discovery inputs using the frozen basename/excluded-segment rules, public JSON and graph-reachable JSON before old semantic parsing. Other source snapshot bytes remain hash/mode authenticated. TS JSONC configs are treated as authenticated source with the fixed TypeScript resolver semantics, not mislabelled as strict JSON. The five unused large audit/EASE files remain authenticated opaque bytes; parser node/byte/work/depth limits were not relaxed. Consumer scoping matches the frozen legacy code rather than excluding a path to suppress a semantic failure.
6. **History and future Receipt:** Manifest and descriptor must both be first-added atomically in the same direct evidence-child execution commit. Future canonical Receipt absence is checked. Tests reject pre-added descriptor and future Receipt fixtures. Source import/common base are pinned; reviewed source is separately bound to the actual release/target baseline instead of inventing imported-source ancestry.
7. **Closed non-live grammar:** Runtime policy has its fixed 18 keys. Manifest/evidence/descriptor/Receipt schemas are closed; native role checks bind row digests and meaningful details. Receipt positive authority aliases, nonzero external effects, live admission, historical approval transfer, fake closure and invalid run/date fields are rejected even after consistent digest recalculation.
8. **Actual temporary rehearsal and transport:** Shadow code performs exclusive temporary output write/readback, verifies cleanup absence, and revalidates before and after. Receipt verification uses explicit canonical relative path, descendant storage Git blob and authorized SHA, then exact native proof cross-binding and replay. Those execution paths were reviewed but not executed in this code-freeze review.
9. **Historical custody:** Old Closure/Registry native pure validators and complete artifact lineage are used. Old release entries and bundle bytes remain bound; historical authority is explicitly not transferred. The successor registry can change only its baseline and Arkansas raw hash, preserving the other 17 resolution objects and all 3 projections.
10. **Build evidence:** A22 source inventory/tree/commit and stored log bytes are checked. Actual source regression, complete build and exact release/evidence binding remain later attempt obligations; this code-freeze verdict does not certify them.

## Preserved failures and limits

The earlier reports remain separate and are not overwritten. The v3 positive probe failed with `SUCCESSOR_SNAPSHOT_EXPORT_FAILED`; independent read-only reproduction showed missing `pages` pathspec yields Git archive exit 128. The v4 worker rejected legitimate JSONC config with `PROMOTION_WORKFLOW_JSON_INVALID`. Both failures were preserved, addressed explicitly and followed by the v5 diagnostic; neither was silently converted into a passing receipt. The earlier unused-JSON limit diagnostic remains non-authoritative, and no parser limit was raised.

The frozen checker is restricted to the 22-row correctness successor of a de-reached Arkansas candidate. The remaining 1478 records and the entire 1500-row pack are not accepted. This reviewer did not replace A18 mathematical approval or independently re-grade all candidate answers in this code review. Remaining grading/provenance limits must remain in the genuine A18 decision.

Private copies and a read-only worker program are an execution isolation boundary for the coordinated task. They do not assert operating-system enforcement against all processes running as the same user. A trusted Node invocation and exclusive-writer/process hold remain execution prerequisites. Native timeout/termination is an internal failure, not a reusable PASS.

## Authorized next boundary

This author approves freezing exactly the bundle digest above with this independently authored report and approval JSON. Any bundle-file or frozen dependency change invalidates this verdict and requires renewed exact-byte review. The still-pending genuine attempt requires independent role records, actual source regression and A22 build evidence, clean registered execution, native validate/Shadow/replay/Receipt transport and later finalization under their respective authorizations.

`liveAllowed=false`, `wholePackAccepted=false`, `historicalAuthorityTransferred=false` remain mandatory. No global required check is cleared by this standalone review; #262 is not merged and #201 is not closed.
