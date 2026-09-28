# A11 independent attempt-008 source and regression review

Date: 2026-09-27. Author/session/identity: `/root/a11_pr172_copy_verify`.

Result: **PASS, scoped independent A11 evidence**. This record covers exact frozen checker/source bytes, independent local regression and bound build-artifact readback. It is not native attempt validation, Shadow, replay, Closure/Registry finalization, global required-check success, deployment, student-route acceptance or whole-pack approval. `liveAllowed=false`.

## Frozen Git binding

Reviewed release/source commit: `ce2557ddbce550b0e92f41d3588bb4b5803e696e`.

- Source tree: `48d0def4fa27ceb226ef200ecc53412bcfbdaa72`.
- Checker bundle: `32d9c644bc3c1e104c02712148d45dabf2c3a8ea6ac98c0459dc93d365821e02`.
- Candidate raw SHA-256: `4f677216d3d9aec1b8f93be87a2900ff5a63f62e45a7555458ac146955ac0766`.
- Actual content delta digest: `e1593bba0943f65daf1a8101eb31c310865ac5fabe41c7b12cff58c6092ed941`.
- 22 changed records, 1478 untouched records; wholePackAccepted=false.

Independently read every one of the 29 frozen Git blobs and compared its raw bytes and executable mode with the working files. All 29 matched, all mode100644, and the bundle digest matched the earlier authenticated freeze opinion. The checkout was clean at the start of these checks. The later dirty state consists of separately assembling new attempt evidence/ledger under the authorized successor ROOT; it is not an execution checkout or a native validation pass.

The original independently authored A11 freeze JSON and report were preserved exactly in the release commit:

- freeze JSON SHA `fb39ccab93f84f837e0d8cd41c00149345a7382eeac03a62b2256c0c138f268c`;
- report SHA `8a6165bd49113231fb2597523fa90ea0a2ed453f1e171172ee8e3b04ad72f0b7`.

This attempt record does not modify or extend those frozen authorship bytes.

## Independent regression and negative-boundary evidence

Independently ran on the frozen release checkout:

```sh
node --import tsx --test lib/fullQuestionBankSolvability.test.ts
```

**5/5 PASS, exit0, 12.38 seconds.** This includes the local Arkansas calendar-year grader and dollar-scale grader. The larger existing bank tests are local solvability/admission checks; their labels do not confer mathematical/provenance acceptance on every record in a full pack or prove a live student route.

The final checker code was independently exercised before freeze with its exact bytes; all 35 contract tests passed. After freeze, all29 Git blobs/modes were rechecked against those tested bytes. The required negative boundaries remain:

- `changed-qa-row`: reject stale row digest in a selected A18 correction decision;
- `changed-release-code`: reject modified checker bytes even when a later ledger hash is recalculated;
- `duplicate-json-key`: reject duplicate keys, malformed UTF-8 and nonfinite numbers under the frozen bounded parser;
- `fake-baseline-only`: reject reclassifying this actual content mutation as baseline-only;
- `future-receipt`: reject an execution commit already containing its canonical Receipt;
- `live-admission`: reject live/full-pack authority and consistently rehashed positive Receipt claims;
- `non-ar-registry-change`: reject any unrelated resolution/projection change under full registry comparison;
- `same-reviewer`: reject role/session/identity substitution for independent reviewers.

Additional tests reject pre-added descriptors, source-ancestry fiction, dependency poisoning before imports, rehashed dependency ledgers and post-freeze alternate config/framework entrypoint changes. Test fixtures are bounded diagnostics, not substitute authority records. No actual native validate/Shadow/replay/Receipt verifier was executed in this review.

## Actual build readback

The production build was performed by the coordinator/A22 execution role from its own archive LB28, not by this independent A11 task. After its actual terminal result, this reviewer independently checked:

- sourceCommit/sourceTree equal the release/source above;
- source inventory digest equals recomputed raw `git ls-tree -r -z ce2557...`;
- all29 critical frozen archive files retain the exact reviewed bytes/modes;
- the actual final result records buildExitCode0 and cleanBeforeBuild/cleanAfterBuild=true;
- copied A22 build log/report raw hashes match the A22 record, and the copied complete log matches the coordinator's actual final log bytes.

Build inventory digest: `1ef8d61f9edd01ab97e98e1ac6476d2cc2530d4069e9846f5972967aee102dd6`.

Actual complete build log SHA: `f88ed7746677d4a1f64cacddb526b8ce24021c04e1ca7a3946b1bb1c1c400474`.

Terminal build-result JSON SHA: `aa4168a8b21ca2974c0f0177001672672d8a10974024b01579261a0ece6d752e`.

The A22 capture reports 11576 source files and 1024835413 source bytes verified before building. This A11 task rechecked the raw Git inventory/tree binding and critical29 files; it did not repeat the coordinator's entire archive materialization/hash pass. The dependency symlink is task-created and excluded only in the archive's own `.git/info/exclude`, with dependency source recorded. It is not a source-file exclusion or a changed checker rule. The earlier LB27 prebuild stop is retained by the coordinator; it was not overwritten as a successful build.

## Remaining boundaries

This evidence is for the 22-row de-reached candidate successor. Genuine A18 mathematical review, A23 disposition, A22 build and A25 custody remain separate role records. A11 local regression does not substitute for them.

The source release has been frozen, but this record's evidence commit, atomic Manifest/descriptor binding, clean registered execution, canonical Receipt storage and later finalization have not yet been completed by this author. Those steps retain their native checks and respective authorization. The readonly sealed18/15/3 preparation diagnostic is not a Receipt or a lifecycle approval.

The old global public Promotion scripts/workflow still route v2.6. This scoped PASS cannot clear #262's global required check or authorize its merge; #201 stays open. No production or cleanup proof is supplied.
