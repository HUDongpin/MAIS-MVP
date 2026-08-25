# 2026-08-20 A22/A11 — next-env precollection restore boundary

- Agent lanes: A22 production reliability, borrowing A11 focused harness-test scope.
- Objective: restore and verify exact canonical `next-env.d.ts` before any Playwright/spec process exists, then start the already-built server only on a runner-owned receipt.
- Authorized remediation expansion: `scripts/run-starship-playwright-supervised.mjs` and its focused test for descriptor-bound temporary-tsconfig creation evidence.
- Forbidden scope: product/runtime visualization code, China producer specs, C8/C3 edits, package upgrades, Git, build, browser, network, and database execution.
- Initial evidence: exact92 `china-exact92-20260820T053034Z` built successfully, but concurrent producer collection observed `next-env.d.ts` SHA `3c7d8d3f...` instead of approved `85ae5aee...`; cleanup restored it only after Playwright exited.
- Worktree policy: shared dirty isolated worktree; all unrelated changes are foreign and preserved.

## Implemented boundary

- `scripts/run-starship-playwright.mjs` runs the exact repository build command, `process.execPath scripts/next-clean-build.mjs`, while its existing focused run lock is held and before spawning Playwright. `playwright.config.ts` validates the runner receipt synchronously and its global web-server command is start-only.
- A whole-run `O_RDWR | O_NOFOLLOW` descriptor remains open on canonical `next-env.d.ts`. The nested build boundary restores changed bytes/mode through that same descriptor, `fsync`s, and re-verifies hash/bytes/mode/size/device/inode before receipt minting. The whole-run boundary remains active through Playwright termination so a post-receipt foreign successor is preserved and the run fails closed. The original inode is never replaced, satisfying the frozen outer supervisor.
- Build success, nonzero, signal, spawn/callback failure, exact-restore failure, runtime-source failure, descriptor-close failure, and server-log-close failure retain all applicable errors in deterministic primary-first order. No Playwright callback/spawn can run on any failure.
- The runner captures held `O_RDONLY | O_NOFOLLOW` raw receipts immediately before build and rechecks identity, bytes, hash, mode, size, mtime, and ctime immediately after build for the exact ordered runtime set: runner, path gate, next-clean build, generated cleanup, stray-types guard, Playwright config, Next config, both tsconfigs, package metadata/lock, and the installed Next/TypeScript entry files. A transient mutate-then-byte-restore changes ctime and fails closed. The exact before/after joins are serialized into the prebuild receipt and revalidated by Playwright config before collection.
- `BUILD_ID`, `required-server-files.json`, and `build-manifest.json` have exact live path/hash/mode/device/inode receipts. Receipt authority also binds repository/run/build paths, port/baseURL, runner PID, and independently observed OS start token. All runner-owned receipt environment names are rejected if inherited before run-root/build/spawn side effects.
- Receipt creation retains its `O_EXCL | O_NOFOLLOW` creation descriptor receipt and compares the reopened path identity/bytes before authority. A byte-identical successor is preserved and rejected.
- The temporary tsconfig is created with one held `O_RDWR | O_CREAT | O_EXCL | O_NOFOLLOW` descriptor, written through that descriptor, and disposed only if its final descriptor identity/bytes/hash/mode/change tokens still match creation. Its authority path is atomically renamed through an `O_DIRECTORY | O_NOFOLLOW` parent anchor with Darwin `RENAME_EXCL`; the exact owned inode is quarantined under a no-replace name, while a foreign or same-inode-mutated file is preserved and fails closed.
- The temporary tsconfig is honest-Next complete before build: it restates top-level `compilerOptions.plugins: [{ "name": "next" }]`, retains repository source/JSX includes, removes shared `.next/types`, adds the run-owned custom dist types include, and carries the hardened excludes. Next 15.5.23 therefore has no legitimate plugin/include reason to rewrite it.
- The outer supervisor preload now receipts numeric-fd tsconfig creation from that exact descriptor and joins its device/inode/bytes to the creator preload ACK and terminal archive. A narrow reentrancy marker preserves the established pathname `writeFileSync` compatibility path; direct descriptors remain restricted to writable `O_CREAT | O_EXCL | O_NOFOLLOW` creation.
- The focused run lock now uses the same held exclusive-file creation receipt and keeps its creation descriptor open until release. Terminal release no longer closes then pathname-unlinks the lock: it performs the same parent-descriptor-anchored, atomic no-replace disposition and verifies the moved inode/bytes/mode through both destination and held descriptor before closing.
- Both terminal dispositions expose a deterministic test-only interposition point after the final path/fd/bytes/mode/change-token check but before `RENAME_EXCL`. A late byte-identical or distinct foreign successor is never pathname-unlinked: a moved foreign inode is restored no-replace to the authority path, retained, and makes the run RED. Disposition and descriptor-close errors remain aggregated in primary-first order.

## TDD evidence

- Original RED: focused module instantiation failed because the prebuild boundary/export did not exist; the paused-build fixture demonstrated that producer collection otherwise overlaps mutated `next-env.d.ts`.
- Remediation REDs captured before their fixes:
  - transient runtime-source mutate/restore was not joined;
  - receipt close/reopen accepted a byte-identical successor;
  - held temporary-tsconfig cleanup could delete a foreign successor and then a same-inode byte mutation;
  - post-receipt next-env replacement could reach pathname-only cleanup;
  - nonzero/signal/spawn outcome could be masked by server-log close failure;
  - supervisor numeric-fd tsconfig creation ended `unproven-creation-preserved` with creation count 0.
  - source ordering showed temporary-tsconfig generation used TypeScript/`tsconfig.json` before the runtime-source descriptors were captured; preparation now runs inside the captured build callback.
  - held temporary-tsconfig cleanup could delete a foreign successor inserted after its final validation and before pathname unlink;
  - focused run-lock release could close its descriptor and delete a foreign successor inserted after its final validation and before pathname unlink.
- Full supervisor first remediation run was 52/54 and exposed one compatibility regression: strict descriptor flags intercepted pathname `writeFileSync` internals. The narrow reentrancy fix made the affected descriptor/SIGKILL/foreign-destination subset 4/4 and the complete suite 54/54.
- C5 RED was exactly 42 pass / 2 fail in the 44-test focused suite; both late-interposition mutants reported `Missing expected exception` against the old pathname unlink boundaries. The descriptor-anchored no-replace disposition made the complete focused suite 44/44.

## Current verification evidence

- Focused prebuild final: `node --test --test-concurrency=1 scripts/run-starship-playwright-prebuild.test.mjs` -> 44 passed, 0 failed, including both deterministic post-final-validation successor mutants.
- Full supervisor after the final C5 source bytes: `STARSHIP_SUPERVISOR_TEST_ROOT=/Volumes/Starship/mais-supervisor-c5-20260820-01 node --test --test-concurrency=1 scripts/run-starship-playwright-supervised.test.mjs` -> 54 passed, 0 failed, including all established command-transition, descriptor-created-tsconfig ACK, signal, descendant-harvest, symlink, foreign-inode, log, and cleanup negatives.
- Existing runner final short gate: `STARSHIP_INNER_WRAPPER_TEST_ROOT=/Volumes/Starship/mais-inner-wrapper-c5-final-20260820-01 node --test --test-concurrency=1 scripts/run-starship-playwright.test.mjs` -> 7 passed, 0 failed.
- Node syntax: `node --check` passed for runner, focused test, supervisor, supervisor test, path gate, next-clean build, generated cleanup, and stray-types guard.
- Final settled-tree `npm run type-check` -> exit 0 after both concurrent G01/G02 owners formally froze their TypeScript sources.
- Prohibited execution remained absent: no Next build, Playwright/browser launch, network, Git, or database command ran.

## Frozen changed-file hashes, bytes, and lines

- `scripts/run-starship-playwright.mjs`: SHA-256 `a54f85eef8dbac4a9ceb1f4b59218e3b249da6d67624b931a94a96589ccca407`; 68,227 bytes; 1,983 lines.
- `scripts/run-starship-playwright-prebuild.test.mjs`: SHA-256 `d012e24d6570080e56f88e53af1033031510e4ac74892e88b7e100b0acda6f79`; 38,758 bytes; 1,046 lines.
- `playwright.config.ts`: SHA-256 `a4089612217e0f3dc2cb0629cbd765bdf86ce82266cc1826ab3bb815bf94760c`; 10,628 bytes; 261 lines.
- `scripts/run-starship-playwright-supervised.mjs`: SHA-256 `80f517a83f250dc1ebc15170111b617ee7bdb63a617b7dc300921a5cf05f033d`; 161,603 bytes; 4,467 lines.
- `scripts/run-starship-playwright-supervised.test.mjs`: SHA-256 `67e5ce6707aa9572651a708c1957683b327e02ec4aeae19169657366ff39cc9b`; 159,079 bytes; 3,554 lines.
- Canonical `next-env.d.ts`: SHA-256 `85ae5aee75f011967cf2d25cbc342f62d69314e9d925f7f4aa3456fc2cffcca6`; 262 bytes; 6 lines; device `16777249`; inode `17738546`; mode `644`.

Runtime receipt/pin inputs:

- `scripts/starship-e2e-path-gate.mjs`: `e8ed4b0f0c61bbeb6645ec1fb42219c113d2b5414f00cf49096fa89d2141173a`
- `scripts/next-clean-build.mjs`: `3927b0b683abee4a13f69df27b0809821f96faf547f8638fdfdacbaf12e3b1ba`
- `scripts/cleanup-generated-artifacts.mjs`: `1adf99e24d8188bcb779dfc6bd75d619109bbde010db50127bad5210b83149b8`
- `scripts/check-stray-generated-types.mjs`: `05ea295b22e470e562b80b5d6dcc0bd2be6a86ad734c99a05af5cc76cda04c76`
- `next.config.ts`: `bc1aef29abe3909a85549ee745dc83ea2c5dfde592544baca3a2fc1c82d76f9e`
- `tsconfig.json`: `463a2abe6c2c803606ddf13aa6cb7d2f68cab049052ed876e5ffb77f5f4d96a8`
- `tsconfig.next.json`: `1f39ca3df18b90924fdf68bea41304033b29cf0de5311dccb15b23cd2dee1970`
- `package.json`: `e0a99bc4083877a72d0f768d21b27e68952f01bf7f41da443f904d311d6695e4`
- `package-lock.json`: `51e9e1c428df6ed4d3a4812a651b5048246fcc611dd7436c36fdaf6156051a66`
- `node_modules/next/dist/bin/next`: `6f8c0a49e5698df5ccd74f95840bc49896e42a7680d18ad26d48b7a8d689010f`
- `node_modules/typescript/lib/typescript.js`: `dd17428736a07e1db1a138d8a14295ddb2699ba780ee15038acdd2c6da5373a0`

## Handoff state

- The exact changed-file hashes above are frozen after settled-tree type-check and final short gates. Do not edit them before review; any byte change invalidates this evidence and requires re-running the relevant gates and re-freezing.
- Review remains mandatory: request a fresh DIFFERENT-agent review of this frozen set and do not self-approve.
- Parent C3/binder follow-up remains separate and must repin the final runner/config/supervisor/runtime set plus consume the serialized runtime-source joins before any authorized build/browser exact92 rerun.
