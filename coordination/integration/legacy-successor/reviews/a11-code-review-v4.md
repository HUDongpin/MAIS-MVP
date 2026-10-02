# A11 independent v1.1 checker freeze review — v4

- Reviewer/session: /root/a11_pr172_copy_verify (independent A11).
- Reviewed at: 2026-09-27T12:21:52.521Z.
- Physical checkout: /Volumes/Starship/MLS28; review HEAD remains cc8ae1018ccfc7329b383053a9a5513d7b66c6c6. The new checker edits are a freeze candidate, not yet a new release commit at the time of this review.
- Verdict: **approved-for-checker-freeze** for the exact 32-file v1.1 bundle below. No unresolved P0, P1 or P2 finding remains in this review scope.
- Authority limit: this is an independent code-freeze decision. It is not an attempt-009 native PASS, build acceptance, Shadow Receipt, global workflow activation, merge, deployment, product acceptance, old PR closure or cleanup approval.

## Exact bindings and checks

| Check | Result | Independently observed binding |
| --- | --- | --- |
| Final candidate inventory | PASS | /private/tmp/mais-successor-v11-final-review-inventory-v2.json; raw SHA-256 7be47a0d15cf400bde3372a01c181e7e3fa1224cc63caee52ce47e575d6ff123 |
| Bundle | PASS | 32/32 path hashes, exact sorted path set and 32/32 regular 100644 file modes; stable canonical path/raw digest 37da13cdb32066c73156b5809b5733796615f3f47870db4478c0e94c18510582; identical before and after the final suite |
| Seven executable dependency trees | PASS | Actual owned installed trees equal the frozen dependency record; combined digest 1c7dbf08aebc2ace01b787ce759512ac9dc1b2aa800df1609e790d5b9a007fa3 |
| Independent final suite | PASS | node --test coordination/integration/legacy-successor/contract.test.mjs; 43/43, no skips/failures; 30054.827 ms |
| Final suite log | Preserved | /private/tmp/mais-a11-v11-contract-tests-final-v3.log; raw SHA-256 06fa8d2b9634afe2b165f778d75ada268dc8f61edc71fd48cfa5b9ef2e993a0e |
| Old attempt-008 inputs | PASS | All 15 actual cc8 committed artifact bytes and working Git modes remain unchanged; new custody compares old/current mode, objectId and bytes |
| Failure transport | PASS | Both appended output JSON files exactly equal actual original native validate-v1/v2 stdout; each raw SHA-256 9ef341263e8b7808f1f84201940468c029e27b4aba7a7a0287e35b97fccfb868; result internal, code ETIMEDOUT, liveAllowed false |
| Frozen observer | PASS | observer.mjs remains byte-for-byte equal to cc8; all three runtime scans, strict semantic consumers and pre/post full snapshot verification remain in place |
| Source candidate | PASS, bytes/delta only | Four source files unchanged from cc8; candidate 4f677216d3d9aec1b8f93be87a2900ff5a63f62e45a7555458ac146955ac0766; actual delta 22 changed/1478 unchanged, digest e1593bba0943f65daf1a8101eb31c310865ac5fabe41c7b12cff58c6092ed941; wholePackAccepted false |
| New build/native result | NOT PRODUCED BY THIS REVIEW | New version still needs its clean frozen build and independently bound role inputs, followed by real native operations |

This review authenticates the seven transitive checker dependencies used by the bootstrap. It does not declare the entire application dependency installation, an application-wide type-check or a new production build PASS. An initial readback helper imported dependencyBindings from the wrong module and failed before executing; it was corrected to the actual dependencies.mjs export. The final binding checks and terminal suite above are the substantive results.

## Review history and closed findings

The first supplied v1.1 inventory (f95ab81c2ac6922a719567c066d0164611741877cb6b77297847b7a173ef26d4) was reviewed with an independent 41/41 terminal run. Its log remains /private/tmp/mais-a11-v11-contract-tests-final.log, raw SHA-256 0d62eaf1598537c0637956ff54c1816ab9bf3077d47c4b8028771dfb20495579. That packet became stale when the following P2 custody defect was repaired; it authorizes no later bytes.

1. **P2 old-attempt mode custody — closed.** A11 identified that byte-only preservation would admit an old evidence file committed with 100755 rather than its original 100644 mode. verifyFailedAttemptCustody now compares old/current mode, objectId and bytes. The actual private Git fixture copies all 15 genuine cc8 artifacts and the three frozen failure inputs, verifies positive custody, then chmods/commits an old A18 artifact as 100755 and requires SUCCESSOR_PRIOR_ATTEMPT_REWRITTEN. An independent 42/42 intermediate run is preserved at /private/tmp/mais-a11-v11-contract-tests-final-v2.log, SHA-256 0f92e95ec588e33dfd17628c4faa2a337d692aa0e04701d0cb8cbd308ff3567c. Its interim 44bba48cd721b21e22c1f37d09138ed128e5b48964b800417ab4ff456a7c4cef bundle is also superseded.
2. **P2 valid maximum runId replay — closed.** A23 identified that appending -verify to a valid 128-character runId exceeds the accepted grammar. receiptReplayRunId now derives a deterministic 72-character marker plus SHA and forces a different first character, establishing inequality for every accepted original ID. verifyStoredReceipt calls that helper. The final test exercises maximum-length IDs, schema roundtrips, determinism, distinctness and rejected lengths 129/0. A11 also ran bounded pure checks for 128-character v/a IDs, a 72-character helper-like ID and a numeric-leading valid ID: all derive valid, distinct 72-character replay IDs.

Earlier v1/v2/v3 reports, genuine v3 approvals, the two native failures, the 180-second partial diagnostic and the completed diagnostic remain preserved. None was rewritten as a successful native attempt.

## Authority and failed-attempt relation

The bootstrap performs ledger authentication using built-in code before third-party imports. It pins the actual old cc8 ledger to mode 100644, Git object ffd8d45f3f9559011cc020a8aa6f0c25aa8e41b2 and raw SHA-256 6f1ec90ac803a3f378e8a5d68b585105faa1cd8d7a813c92f2b618c9a10cc3c3. The future new freeze must contain this exact old anchor blob. A later execution ledger admits precisely the unchanged old entry followed by one unique v1.1 entry. Changing a candidate ledger hash, rewriting the old prefix, dropping/reordering entries, adding two new versions or adding an unknown top-level authority key cannot authorize itself. Independent pure probes rejected each of these transformations; real Git prefix fixtures are in the final suite.

The immutable failure-index digest is 3716700b315313cbd319cd00ae4b4c054b4774bb4a04654afd1f225fcac2877c. Manifest and descriptor use the same exact repairOf relation to attempt-008 at cc8: candidateChanged false, checkerChanged true, shadowApprovalInherited false. There is no prior canonical Receipt field or inherited successful Shadow. The legacy content relation still describes the original 22 changes; the nested repair relation describes unchanged candidate bytes relative to the failed attempt. Closed Manifest/descriptor schemas enforce the complete constant relation; the Receipt proof fixes priorAttemptId attempt-008 and priorAttemptOutcome internal-timeout.

The unchanged candidate permits only exact reuse of the prior genuine scoped A18 mathematical record/report without changing its author, date or limitations. It does not transfer an old checker/build/native verdict. The new A11/A22/A23/A25 evidence and release references must bind the new version/release as required by the contract. The authentic A11 v3 approval remains the v1 approval; this new record is separate.

The captured private runtime still copies authenticated code and locked dependencies before dynamic import. The observer imports that copied runtime, not mutable original dependency files. Sealed snapshot Git metadata, strict actual JSON consumers, fixed native paths/environment, full modes/hashes and archive capacity remain as independently reviewed in v3. The old v2.6 eight-code bundle and public dispatcher/global workflow remain on their prior release; the current diff is confined to legacy-successor. No candidate/app/provider code is executed by the observer.

## Capacity contract and operational limits

The new worker deadline is fixed at 300000 ms; Git archive and tar limits remain 60000 ms. The original v1 worker60 contract remains unchanged in MLS27/cc8. The complete authorized diagnostic used unchanged integrity/quality logic in a separately marked private copy and measured 238.168 s worker / 298.874 s overall. The identical copied report at reviews/a11-complete-timing-diagnostic-v1.md has raw SHA-256 3f4b030d55ad8485ebc86f86d2b1bfb85cffde24b005f28366ba054d176ba060. Its diagnostic exit0 remains diagnosticOnly and authoritativeReceipt false.

That observation supports this bounded new per-worker capacity choice for the same source surface; it is one measured run, not a latency percentile, hardware-independent guarantee, complete native timing, or wrapper acceptance. The worker retains preverify31.547 s, strict semantic3.720 s, all three scans128.428 s, collect127.696 s including canonicalAudit77.803 s, and postverify29.663 s. These categories overlap where collection contains two scans; they must not be summed as independent work.

Operation-level budgets differ: validate invokes one sealed worker, shadow invokes two validations, and verify-receipt invokes one validation plus shadow replay (three workers). Parent source authentication, archives, historical authority/custody, snapshot materialization and cleanup add time. A 300-second worker limit cannot be treated as a 300-second total CLI limit. Public/specialist wrappers need a separately reviewed budget per operation; unsupported routing or insufficient total capacity remains BLOCKED. This review did not execute a native validate, Shadow or Receipt replay for attempt-009.

Expired ETIMEDOUT/SIGTERM workers always throw SUCCESSOR_OBSERVER_TIMEOUT. Nonzero or malformed-output workers remain failed; even complete-looking PASS stdout cannot admit partial green. Pure adversarial probes and the final suite verify this behavior. Native CLI classifies deadline failures as internal with exit3 rather than successful/partially accepted proof.

## Remaining disposition

No P0–P2 remains within the final 32-file checker candidate. The README archive-deadline sentence has a minor grammatical wording issue (P3 clarity); its operative code constants are unambiguous and it does not alter this digest. Formal native attempt-009 validation and later authorized Shadow/Receipt verification remain unperformed by A11. Required public workflow activation is a separate package. #262 remains blocked for merge under the assigned scope; #201 remains open. No old PR closure, merge, deployment or cleanup result is inferred.

A11 wrote only this new report and its own fresh freeze-review JSON. Frozen code, original histories, index, ledger, Manifest, source candidate and root-owned processes were not modified by A11. Contract tests used their own ephemeral synthetic Git repositories as test outputs; the actual MLS28 Git state was not mutated by A11.
