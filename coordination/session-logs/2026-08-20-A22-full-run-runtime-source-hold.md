# 2026-08-20 A22/A11 — full-run runtime-source hold

- Agent lanes: A22 production reliability, borrowing A11 focused harness-test scope.
- Objective: keep exact runtime source descriptors open continuously from before temporary-tsconfig creation/prebuild through Playwright child exit and terminal cleanup, then serialize evidence that the parent binder can independently join.
- Allowed write scope: `scripts/run-starship-playwright.mjs`, its focused prebuild test, the supervisor source/test only for carrying raw inner evidence, and this unique log.
- Prohibited execution: Next build, Playwright/browser, network, Git, and database commands.
- Worktree policy: shared dirty isolated worktree; unrelated concurrent changes are foreign and preserved.

## Implemented boundary

- `scripts/run-starship-playwright.mjs` acquires `O_RDONLY | O_NOFOLLOW` descriptors for every runtime source and `O_RDONLY | O_DIRECTORY | O_NOFOLLOW` descriptors for their exact parents before temporary-tsconfig creation or prebuild. It retains all descriptors through Playwright child exit and exact terminal cleanup.
- The exact ordered set is: the established thirteen prebuild/runtime entries; fixed `tests/e2e/starship-e2e-global-setup.ts`; fixed `tests/e2e/mainland-focused-canonical-cli.ts`; then the approved G03, G04, G05, and G06 producer entry files in their exact CLI order. Missing, reordered, additional, duplicated, repository-escaping, symlinked, and nonregular entry paths fail closed before prebuild/spawn.
- The boundary re-observes held descriptors, lexical paths, parent identities/change-token receipts, bytes/hash/mode/size/device/inode/mtime/ctime at `opened`, `postPrebuildPreSpawn`, `postSpawnLoad`, `immediatelyAfterChildExit`, and `beforeReceiptClose`. Source content restored byte-for-byte after a transient mutation is still rejected by immutable change tokens. Foreign missing paths, symlinks, and byte-identical successor inodes are preserved.
- The opened boundary is authoritative: a deterministic replacement after descriptor capture but before first observation prevents both prebuild and child spawn. No caller callback receives descriptor authority.
- The child receipt binds the exact absolute command, argv, repository cwd, child PID, child PGID, and independently read OS start token. Nonzero, signaled, and spawn-error outcomes still run the source joins, terminal cleanup, descriptor closes, and receipt write before the run remains RED.
- Every source and parent descriptor close failure is serialized without erasing the child outcome or another primary failure. An honest run proves all descriptors are closed only after terminal cleanup and cannot be reused (`EBADF`).
- The mode-600 exclusive `full-run-runtime-source-hold.json` includes the ordered set, open time, all ordered boundaries, invocation, child identity/outcome, per-source held/final joins, parent joins, and close errors.
- `scripts/run-starship-playwright-supervised.mjs` captures the inner receipt through its existing no-follow exact-byte reader and carries path, descriptor receipt, raw UTF-8, and raw Base64 in terminal `innerEvidence.fullRunRuntimeSourceHold`. It deliberately adds no `valid`, `approved`, `releaseReady`, or equivalent self-asserted authority. The separate parent C12 binder owns semantic validation and source-pin joins.

## TDD evidence

- Initial REDs: the focused test could not import the missing full-run boundary, source-set resolver, or process-group identity reader. Nonzero/signal child canaries reported “Missing expected rejection.” The supervisor normal-run fixture had no `innerEvidence.fullRunRuntimeSourceHold` field.
- Transient RED: a child-phase source mutation restored to identical bytes was not covered by the prebuild-only hold. GREEN now rejects on the held ctime/mtime/hash/identity join while retaining exact bytes.
- Source-set audit RED: the resolver returned only the explicit G03 path after the prebuild set and omitted config-loaded global setup plus the producer-loaded canonical-CLI helper. GREEN fixes deterministic order and rejects missing/reordered/extra/duplicate/unapproved producers.
- Opened-race RED: deterministic interposition after source capture still allowed the prebuild callback once. GREEN records a failed `opened` boundary and keeps both prebuild and child counts at zero while preserving the foreign successor.
- Negative matrix covers config, global setup, G03, path gate, and canonical-CLI helper mutate-load-restore; deletion; symlink; byte-identical new inode; child nonzero/signal; terminal-cleanup mutation; descriptor-close errors; and no descriptor leak.
- C6 DIFFERENT review returned HOLD/P1 after proving a transient whole-parent replacement could be restored before the next boundary: the source descriptor remained pristine, but the child could read malicious bytes through the temporary path. The former join serialized parent mode/size/mtime/ctime but enforced only dev/inode.
- C7 RED reproduced that exact attack (`Missing expected rejection`). GREEN now compares parent path and held-directory receipts against the captured parent across device, inode, mode, size, mtime, and ctime at every boundary. The malicious temporary parent is observed by the test, the original parent/source are restored and preserved, and `immediatelyAfterChildExit` is failed by the immutable parent change token.

## Verification

- Focused source/prebuild suite: `node --test --test-concurrency=1 scripts/run-starship-playwright-prebuild.test.mjs` -> 57 passed, 0 failed.
- Canonical runner gate: `STARSHIP_INNER_WRAPPER_TEST_ROOT=/Volumes/Starship/mais-inner-wrapper-c6-final-20260820-01 node --test --test-concurrency=1 scripts/run-starship-playwright.test.mjs` -> 7 passed, 0 failed.
- Full supervisor: `STARSHIP_SUPERVISOR_TEST_ROOT=/Volumes/Starship/mais-supervisor-c6-final-20260820-01 node --test --test-concurrency=1 scripts/run-starship-playwright-supervised.test.mjs` -> 55 passed, 0 failed. Existing command-transition, signal, ownership, descendant-harvest, descriptor, symlink, foreign-inode, log, and cleanup negatives remain GREEN.
- Node syntax: `node --check` passed for runner, focused prebuild test, supervisor, and supervisor test.
- Settled shared-tree type-check: `npm run type-check -- --incremental false` with `TEMP`, `TMP`, and `TMPDIR` under a unique `/Volumes/Starship` direct child -> exit 0, zero diagnostics.
- No Next build, Playwright/browser launch, network, Git, or database command ran.

## Frozen source/test inventory

- `scripts/run-starship-playwright.mjs`: SHA-256 `2a154c811b368024fa35a7269f6a13025d49fc6257a36f87a1db5c7ed85eea75`; 93,147 bytes; 2,653 lines.
- `scripts/run-starship-playwright-prebuild.test.mjs`: SHA-256 `b4ca1bd95198adab3598ce5665de60f641b59155f0cf819ad84d7b815eddb9ac`; 63,444 bytes; 1,612 lines.
- `scripts/run-starship-playwright-supervised.mjs`: SHA-256 `a9c5a3a406956b72533d6161cbb65e5b5004be12541361ade75b99b654402eff`; 162,865 bytes; 4,509 lines.
- `scripts/run-starship-playwright-supervised.test.mjs`: SHA-256 `e8b1c6003e1dc58015c5c38fd6d45ce041fb2c2f3ab7ec5c59c0ae5174e832b7`; 178,581 bytes; 4,063 lines.
- Unchanged `playwright.config.ts`: SHA-256 `a4089612217e0f3dc2cb0629cbd765bdf86ce82266cc1826ab3bb815bf94760c`; 10,628 bytes; 261 lines.
- Canonical `next-env.d.ts`: SHA-256 `85ae5aee75f011967cf2d25cbc342f62d69314e9d925f7f4aa3456fc2cffcca6`; 262 bytes; 6 lines.

## Handoff

- Parent C12 must repin the final runner, focused test, supervisor, and supervisor-test bytes; validate the raw inner full-run receipt independently; require the exact source set/order and every exact boundary/child/source/close join; and only then remove `blocked-missing-full-run-runtime-source-hold`.
- C6 DIFFERENT review correctly held the prior bytes; this C7 remediation requires a fresh DIFFERENT-agent review. Do not treat root remediation or green verification as approval.

## C8 honest-layout remediation after C7 review

- C7 DIFFERENT review correctly found that the strict parent change-token join made the native layout deterministically false-red: the full-run set holds repository-root sources, while the old manifest created `tsconfig.playwright-<runId>.tmp.json` directly in that same repository root after capture.
- RED 1 fixed the mutable-path contract: the canonical manifest still returned the repository-root tsconfig instead of the exact `e2eRunRoot/tsconfig.playwright-<runId>.tmp.json` path.
- RED 2 reproduced the native failure with a held repository-root source: honest run-owned temp-tsconfig creation made the post-prebuild and final parent joins fail before the child callback.
- RED 3 showed the outer supervisor still expected the repository-root path. Its exact invocation now owns the same nested e2e-run path and creates the fresh run root before the preload starts, so the preload can realpath and bind the exact parent before inner code runs.
- The generated temporary config rebases `extends`, canonical include patterns, canonical exclude patterns, and hardening excludes from the nested config directory back to the physical repository. It contains both the correctly rebased custom-dist glob and the exact repository-relative custom-dist spelling that Next compares before deciding whether to rewrite an explicit tsconfig.
- The paired safety canaries are both GREEN: honest nested tsconfig creation reaches all five exact source-hold boundaries and one child execution; the malicious whole-parent swap/read/restore canary remains rejected on the immutable parent change token.
- A locked-dependency integration canary writes the nested generated config in a Starship fixture, calls Next 15.5.23 `writeConfigurationDefaults`, and proves the bytes are unchanged. TypeScript 5.8.3 then resolves the repository TS input, signature JSX input, and custom-dist route declaration while excluding shared `.next/types`.
- Superseding gates: prebuild plus path-gate suites `65/65`; canonical inner runner `7/7`; full supervisor `55/55`; six Node syntax checks; whole-tree `npm run type-check -- --pretty false` exit 0. No Next build, Playwright/browser, network, Git, or database command ran.
- The earlier frozen hashes above are superseded. A new exact inventory follows and requires a fresh DIFFERENT review before parent-binder work or browser execution.

### C8 frozen code/test inventory

- `scripts/run-starship-playwright.mjs`: SHA-256 `e16bfbd49bb3d6fbf17e9c70f2a6463c0984f8da25f8d8a1e04a4ab02594f742`; 94,367 bytes; 2,671 lines.
- `scripts/run-starship-playwright-prebuild.test.mjs`: SHA-256 `8dfbfa7a35040610719fff1f7a95cd059dd747c49b4dcb169c4c688e4f523031`; 68,804 bytes; 1,769 lines.
- `scripts/starship-e2e-path-gate.mjs`: SHA-256 `6c34fff51a897ac2a016008050f53f2518273111048cc5799307148b2834e39c`; 14,062 bytes; 405 lines.
- `scripts/starship-e2e-path-gate.test.mjs`: SHA-256 `ec4a0f9de5455bc66d8faca29b0b49297b9701b1c46d3a44bc198cc4f22041aa`; 6,749 bytes; 186 lines.
- `scripts/run-starship-playwright-supervised.mjs`: SHA-256 `3c090db4cc0f430bed366c3bbf1ba7d6586c28b6dfb7acbb7b0a02d4ffff295b`; 162,933 bytes; 4,510 lines.
- `scripts/run-starship-playwright-supervised.test.mjs`: SHA-256 `e25480ef87fe8e09f1e5c3412de86dcf7fe47028cb58d2067fb95e17c2800923`; 178,968 bytes; 4,080 lines.
- Unchanged `playwright.config.ts`: SHA-256 `a4089612217e0f3dc2cb0629cbd765bdf86ce82266cc1826ab3bb815bf94760c`.
- Canonical `next-env.d.ts`: SHA-256 `85ae5aee75f011967cf2d25cbc342f62d69314e9d925f7f4aa3456fc2cffcca6`.

## C9 transitive first-party runtime closure remediation plan

- Agent lane: A22 production reliability, borrowing only the focused A11 harness-test scope explicitly assigned for this remediation.
- DIFFERENT review P1: the C8 source hold pinned the fixed setup/CLI and G03-G06 entry files, but omitted executable transitive first-party imports. A child could therefore mutate, load, and restore an omitted helper while every recorded entry-file boundary remained exact.
- Allowed writes remain limited to the inner runner, its focused prebuild test, supervisor source/test only if the raw receipt schema/order changes, path-gate source/test only if necessary, and this existing A22 log. Product files, G01/G02/G07 evidence, and the parent binder are forbidden.
- Interrupted-state audit: runner and prebuild-test hashes differ from C8 while supervisor, path-gate, and `next-env.d.ts` hashes still match C8. The focused real G03 helper mutate/load/restore canary is already GREEN in the interrupted draft; no new RED is claimed for that already-implemented checkpoint.
- Baseline after recovery: prebuild plus path-gate is `65/66`; the sole failure is an incomplete synthetic fixture in the new source-set test, which does not create the thirteen prebuild entry files before asking the closure resolver to read them.
- TDD plan: repair only that fixture, then add focused REDs for the real fixed/setup/CLI plus G03-G06 transitive closure, exact supported first-party resolution and third-party/builtin exclusion, unresolved/escape/symlink/ambiguity rejection, and held-byte graph mismatch after descriptor capture. Implement only the minimal deterministic closure required by those REDs, retain the five source/parent boundaries, and rerun all A22 gates before freezing hashes.
- Approval posture: GREEN checks are implementation evidence only. A fresh DIFFERENT-agent review is mandatory; this session does not self-approve.

## C9 implementation and TDD evidence

- The interrupted draft already contained the real G03 `helpers.ts` mutate/load/restore canary and a partial deterministic closure implementation. On recovery that focused canary was already `1/1` GREEN, so this session records it as recovered evidence and does not fabricate a new RED for it.
- The first recovered full baseline was `65/66`: the new synthetic source-set test had not created its thirteen prebuild entry fixtures before invoking the closure reader. A test-only fixture repair restored that contract without changing production behavior.
- New focused RED: an existing `tests/e2e/unsupported.txt` containing syntactically executable module text was accepted into the first-party closure. The exact failure was `Missing expected exception`.
- Minimal GREEN: an import with an explicit extension now resolves only when that extension is exactly one of `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs`, or `.json`. An extensionless first-party import enumerates those exact direct-file candidates, then those exact `index` candidates, in fixed order. Existing built-in and third-party package imports remain ignored.
- The closure starts with the established prebuild sources, fixed global setup, fixed canonical CLI validator, and exact ordered approved G03-G06 producers. It then walks first-party relative and `@/` static imports from exact bytes in deterministic breadth-first order. The real current tree canary proves stable repeated output and includes G03-G06 labs/models, catalog data, lesson/session helpers, collision/contrast helpers, and their nested first-party dependencies.
- Synthetic coverage proves every approved direct extension and every approved `index` extension; built-in/package exclusion; and fail-closed behavior for unresolved, repository-escaping, symlinked, ambiguous, unsupported-extension, and duplicate/invalid producer inputs.
- After every source descriptor is open, the runner recomputes the graph from the exact bytes retained on those descriptors and requires exact ordered equality with the captured set. A deliberately omitted imported helper is rejected before both prebuild and child spawn; its raw receipt keeps `opened`, `postPrebuildPreSpawn`, and `beforeReceiptClose` exact while correctly marking the two child-only boundaries `not-reached`.
- No full-run receipt schema or raw evidence order changed. Therefore the supervisor source/test and path-gate source/test remain byte-identical to C8; no compensating edits were made.

## C9 verification

- Focused closure contract after GREEN: `5/5` passed.
- Prebuild plus path-gate suites: `node --test --test-concurrency=1 scripts/run-starship-playwright-prebuild.test.mjs scripts/starship-e2e-path-gate.test.mjs` -> `71/71` passed.
- Canonical inner runner: `STARSHIP_INNER_WRAPPER_TEST_ROOT=/Volumes/Starship/mais-inner-wrapper-c9-20260821-a22-01 node --test --test-concurrency=1 scripts/run-starship-playwright.test.mjs` -> `7/7` passed.
- Full supervisor: `STARSHIP_SUPERVISOR_TEST_ROOT=/Volumes/Starship/mais-supervisor-c9-20260821-a22-01 node --test --test-concurrency=1 scripts/run-starship-playwright-supervised.test.mjs` -> `55/55` passed.
- Node syntax: `node --check` passed for runner, focused prebuild test, supervisor, supervisor test, path gate, and path-gate test.
- Whole-tree type-check: `TEMP`, `TMP`, and `TMPDIR` were pinned to `/Volumes/Starship/mais-a22-c9-typecheck-20260821-01`; `npm run type-check -- --pretty false --incremental false` exited `0` with zero diagnostics.
- Protected `next-env.d.ts` remained exactly SHA-256 `85ae5aee75f011967cf2d25cbc342f62d69314e9d925f7f4aa3456fc2cffcca6`.
- Not run by this slice: Next build, Playwright/browser launch, network, Git mutation, or database command.

### C9 frozen code/test inventory

- `scripts/run-starship-playwright.mjs`: SHA-256 `96f872940e921ed6ec5ea1c6d62112dbd094f7d334e6bda6f142054dd2f76e28`; 101,332 bytes; 2,885 lines.
- `scripts/run-starship-playwright-prebuild.test.mjs`: SHA-256 `7f3d469a06ebc0c0dfcdab507dd82fc1f2e3bc65ccb7c8dd7405bacd514fceb7`; 80,435 bytes; 2,036 lines.
- Unchanged `scripts/run-starship-playwright-supervised.mjs`: SHA-256 `3c090db4cc0f430bed366c3bbf1ba7d6586c28b6dfb7acbb7b0a02d4ffff295b`; 162,933 bytes; 4,510 lines.
- Unchanged `scripts/run-starship-playwright-supervised.test.mjs`: SHA-256 `e25480ef87fe8e09f1e5c3412de86dcf7fe47028cb58d2067fb95e17c2800923`; 178,968 bytes; 4,080 lines.
- Unchanged `scripts/starship-e2e-path-gate.mjs`: SHA-256 `6c34fff51a897ac2a016008050f53f2518273111048cc5799307148b2834e39c`; 14,062 bytes; 405 lines.
- Unchanged `scripts/starship-e2e-path-gate.test.mjs`: SHA-256 `ec4a0f9de5455bc66d8faca29b0b49297b9701b1c46d3a44bc198cc4f22041aa`; 6,749 bytes; 186 lines.
- Unchanged `playwright.config.ts`: SHA-256 `a4089612217e0f3dc2cb0629cbd765bdf86ce82266cc1826ab3bb815bf94760c`; 10,628 bytes; 261 lines.
- Canonical `next-env.d.ts`: SHA-256 `85ae5aee75f011967cf2d25cbc342f62d69314e9d925f7f4aa3456fc2cffcca6`; 262 bytes; 6 lines.

## C9 handoff posture

- Status: implementation and local verification complete; candidate remains HOLD pending a fresh DIFFERENT-agent review.
- Dirty-state final action: evidence archive in the existing isolated worktree; no staging, commit, branch, merge, push, reset, cleanup, or deletion was authorized or performed.
- Worktree lifecycle: retained for the parent visualization-lab loop and independent review.
- Parent C12 binder must not repin or release browser execution until the DIFFERENT review approves these exact C9 bytes. Browser/exact92/generic301/final335 execution remains downstream and was intentionally not run here.

## C10 candidate-precedence race remediation plan

- Fresh DIFFERENT review correctly returned HOLD/P1: an extensionless edge initially resolved to `choice/index.ts`; after that closure was computed but before descriptor capture, a newly created higher-priority `choice.ts` became the TypeScript/runtime winner. C9 recomputed held edges against only the held-path map, so it continued choosing the old index path and could authorize a child that loaded the unheld direct file.
- Assigned write scope remains the inner runner, its focused prebuild test, supervisor source/test only if the raw receipt schema/order changes, path-gate source/test only if required, and this existing A22 log. Product, G01/G02/G07, binder, build, browser, network, Git, and database scope remain forbidden.
- Strict TDD plan: first reproduce the exact initial-resolution/candidate-appearance/capture sequence and require zero prebuild/child execution. Add separate disappearance and byte-identical replacement canaries, direct-versus-index and supported-extension precedence cases, and parser canaries for type imports, export-from/export-type, literal dynamic import, literal require/import-equals, and unsupported first-party require forms.
- Intended GREEN: retain an immutable in-process closure plan for the exact ordered array returned to the native caller, including source change-token receipts and resolved edges. During hold acquisition, join captured descriptors to that initial plan. After all descriptors are open, parse only held bytes but resolve every edge against the live canonical filesystem candidate set in deterministic precedence order; require the live winner to be the same originally resolved edge, present in the held set, and joined to its held descriptor. Newly appearing higher-priority candidates, disappearance, replacement, symlink/escape, duplicate physical ambiguity, or any graph/order mismatch must fail before prebuild and child.
- Nested temporary-tsconfig behavior, all five source/parent boundaries, descriptor lifetime, and raw receipt schema/order must remain unchanged. GREEN implementation remains unapproved until another DIFFERENT review.

## C10 RED/GREEN evidence

- Exact P1 RED reproduced the reviewer attack: the initial closure selected `tests/e2e/choice/index.ts`; `tests/e2e/choice.ts` was then created before any parent/source descriptor capture. The old held-map-only recomputation returned successfully, producing `Missing expected rejection` and allowing both prebuild and child callbacks to run.
- A second RED replaced an initially resolved candidate with a byte-identical successor inode before descriptor capture. Because the old hold had no immutable initial receipt plan, it also returned successfully with `Missing expected rejection`.
- Precedence RED created all supported direct and index candidates. The old resolver threw `must resolve to exactly one` instead of applying the deterministic candidate order.
- Parser P2 RED proved `require.resolve("./resolve-only")` was silently omitted (`Missing expected rejection`). Characterization canaries were already GREEN for import type, export-from, export type, literal `import()`, literal `require()`, and TypeScript import-equals.
- GREEN keeps the public ordered-path array contract unchanged and binds that exact frozen array to an internal `WeakMap` closure plan. The plan records the exact repository/entries/order, source device/inode/mode/hash/size/mtime/ctime receipts, and every importer/specifier/resolved-path edge. Callers receive no descriptor or mutable plan authority.
- During capture, every opened source descriptor must join the initial plan receipt before it is retained. This rejects a missing, in-place mutated/restored, or byte-identical replacement candidate even though its parent descriptor is captured only after the attempted interposition.
- Extensionless live resolution now uses the exact order `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs`, `.json`, followed by the same `index` order. A direct candidate wins before every index candidate. Explicit extensions remain exact and restricted to the approved set. All candidate paths are no-follow/canonical checked; two lexical candidates naming the same physical inode are rejected as an ambiguous alias.
- After all descriptors are held, the graph parser consumes exact held bytes but every edge is resolved against the live canonical candidate set. The live winner must be present in the held map, its live receipt must exactly join the held descriptor receipt, the resulting ordered closure must equal the captured set, and the complete edge list must equal the initial plan. A newly appearing higher-priority candidate therefore fails before prebuild/child even when all newly captured parent tokens are internally exact.
- Literal first-party static imports, type imports, export-from/export-type declarations, literal dynamic imports, literal CommonJS `require`, and import-equals are included. Non-static import/require expressions remain rejected. First-party `require.resolve` and `module.require` are explicitly rejected rather than silently omitted; existing third-party `require.resolve` calls remain ignored.
- No full-run receipt field, source order, supervisor contract, path manifest, nested-tsconfig path, or five-boundary lifecycle changed.

## C10 verification

- Focused C10 candidate/precedence/parser suite after GREEN: `7/7` passed.
- Prebuild plus path gate: `node --test --test-concurrency=1 scripts/run-starship-playwright-prebuild.test.mjs scripts/starship-e2e-path-gate.test.mjs` -> `77/77` passed.
- Canonical inner runner: `STARSHIP_INNER_WRAPPER_TEST_ROOT=/Volumes/Starship/mais-inner-wrapper-c10-20260821-a22-01 node --test --test-concurrency=1 scripts/run-starship-playwright.test.mjs` -> `7/7` passed.
- Full supervisor: `STARSHIP_SUPERVISOR_TEST_ROOT=/Volumes/Starship/mais-supervisor-c10-20260821-a22-01 node --test --test-concurrency=1 scripts/run-starship-playwright-supervised.test.mjs` -> `55/55` passed.
- Node syntax: `node --check` passed for runner, focused prebuild test, supervisor, supervisor test, path gate, and path-gate test.
- Whole-tree type-check: `TEMP`, `TMP`, and `TMPDIR` were pinned to `/Volumes/Starship/mais-a22-c10-typecheck-20260821-01`; `npm run type-check -- --pretty false --incremental false` exited `0` with zero diagnostics.
- Protected `next-env.d.ts` remained exactly SHA-256 `85ae5aee75f011967cf2d25cbc342f62d69314e9d925f7f4aa3456fc2cffcca6`.
- Not run by this slice: Next build, Playwright/browser launch, network, Git mutation, or database command.

### C10 frozen code/test inventory

- `scripts/run-starship-playwright.mjs`: SHA-256 `d7f17ac2f8c9cebca5ee729dae91533dc70307bf764a47f8cbe7783b3aeb998f`; 106,367 bytes; 3,025 lines.
- `scripts/run-starship-playwright-prebuild.test.mjs`: SHA-256 `3b7685ec0d3f506e1de49391c64c4bfba2923486785ddd45e2345eea322c1549`; 90,744 bytes; 2,251 lines.
- Unchanged `scripts/run-starship-playwright-supervised.mjs`: SHA-256 `3c090db4cc0f430bed366c3bbf1ba7d6586c28b6dfb7acbb7b0a02d4ffff295b`; 162,933 bytes; 4,510 lines.
- Unchanged `scripts/run-starship-playwright-supervised.test.mjs`: SHA-256 `e25480ef87fe8e09f1e5c3412de86dcf7fe47028cb58d2067fb95e17c2800923`; 178,968 bytes; 4,080 lines.
- Unchanged `scripts/starship-e2e-path-gate.mjs`: SHA-256 `6c34fff51a897ac2a016008050f53f2518273111048cc5799307148b2834e39c`; 14,062 bytes; 405 lines.
- Unchanged `scripts/starship-e2e-path-gate.test.mjs`: SHA-256 `ec4a0f9de5455bc66d8faca29b0b49297b9701b1c46d3a44bc198cc4f22041aa`; 6,749 bytes; 186 lines.
- Unchanged `playwright.config.ts`: SHA-256 `a4089612217e0f3dc2cb0629cbd765bdf86ce82266cc1826ab3bb815bf94760c`; 10,628 bytes; 261 lines.
- Canonical `next-env.d.ts`: SHA-256 `85ae5aee75f011967cf2d25cbc342f62d69314e9d925f7f4aa3456fc2cffcca6`; 262 bytes; 6 lines.

## C10 handoff posture

- Status: implementation and local verification complete; candidate remains HOLD pending a fresh DIFFERENT-agent review of these exact C10 bytes.
- Dirty-state final action: evidence archive in the existing isolated worktree. No staging, commit, branch, merge, push, reset, cleanup, or deletion was authorized or performed.
- Worktree lifecycle: retained for the parent visualization-lab loop and independent review.
- Parent C12 binder/browser gates must remain closed until the new review approves; C10 GREEN is evidence, not authority.

## C11 resolution-directory and loader-grammar remediation plan

- C10 DIFFERENT verdict: `HOLD (0 P0 / 2 P1 / 0 P2)`. The reviewer independently reproduced all local green gates and confirmed every frozen hash before identifying two remaining bypasses.
- P1-1: C10 recomputes the graph before `operations.afterSourcesCaptured`, while later boundaries observe only each held source file's immediate parent. For an importer under `entries/` resolving `../deep/choice` to `deep/choice/index.ts`, a new higher-priority `deep/choice.ts` changes `deep/` but neither held source parent (`entries/` nor `deep/choice/`). The opened/prebuild/child path can therefore remain green after the one graph recomputation.
- P1-2: the parser handles direct literal require/import plus only `require.resolve` and `module.require`. Executable `require.call(null, "./helper")` and `module["require"]("./helper")` are silently omitted; the C10 negative covered only the implemented forms.
- Strict TDD plan: reproduce deep sibling appearance from `afterSourcesCaptured`, child mutate/load/restore, and terminal-cleanup mutate/load/restore with exact expected prebuild/child counts. Add literal safe loader forms, computed/dynamic loader negatives, and ordinary non-loader member-call false-positive canaries before changing production code.
- Intended GREEN: derive every candidate parent from every initial edge, continuously hold every existing canonical directory in the repository-root-to-candidate-directory ancestor chains, merge their immutable identity/change-token failures into all five existing boundary statuses without changing receipt shape, and close/audit every new descriptor. Recompute exact held-byte/live-winner/order/edge joins at every boundary. Explicitly support only direct literal require/import, literal `require.call`, literal `module.require`/`module["require"]`, and import-equals; dynamic/computed loader forms fail closed, while unrelated member calls remain ignored.
- Receipt schema/order, nested tsconfig, product scope, browser/build/network/Git/database prohibitions, and the fresh DIFFERENT approval requirement remain unchanged.

## C11 RED/GREEN evidence

- Strict deep-candidate RED reproduced all three requested races. A higher-priority `tests/deep/choice.ts` created by `afterSourcesCaptured` produced `Missing expected rejection` and allowed the old opened path to remain green. Creating, reading, and removing the same deep sibling after the post-spawn boundary or during terminal cleanup also produced `Missing expected rejection`. The child and cleanup tests proved the transient bytes were actually readable before restoration.
- Parser RED proved a computed `require[method](null, "./computed-require-call")` was silently omitted. The safe-form characterization separately failed because literal first-party `module.require("./module-require")` was rejected rather than included. The ordinary `helper.call` and `moduleFactory["requirement"]` negative was already GREEN, confirming the fix must remain loader-specific.
- GREEN derives the exact deterministic candidate list for every originally resolved edge. For every candidate parent it holds every existing physical canonical directory in the ancestor chain from repository root through that candidate directory using no-follow directory descriptors. A not-yet-existing candidate directory is guarded by its nearest existing held ancestor, while the live resolver is still reevaluated at the boundary.
- Every one of the five existing boundaries now merges three independent checks without changing the receipt shape or source order: the original source/path/parent joins; resolution-directory path/descriptor identity and device/inode/mode/size/mtime/ctime joins; and a fresh held-byte graph recomputation against the live canonical filesystem candidate set. The winner must remain held, exactly join its held receipt, equal the originally resolved edge, and produce the exact captured closure order.
- The after-capture deep sibling now fails `opened` with zero prebuild and zero child callbacks. Child and terminal-cleanup create/read/remove attacks fail on the immutable `deep/` resolution-directory change token even after the original index winner is restored. This closes the false exemption caused by observing only the importer and index-file immediate parents.
- Exact literal `require.call(null, "./target")`, `module.require("./target")`, and `module["require"]("./target")` are included in the closure alongside direct `require`, import-equals, static import/export/type forms, and literal `import()`. Computed targets or members, `require.apply`, sequenced/aliased loader calls, and chained `module.require.call` fail closed. Existing literal third-party `require.resolve` remains ignored; first-party `require.resolve` remains rejected. Ordinary non-loader member calls remain ignored.
- All new resolution-directory descriptors are retained through terminal cleanup and closed through the existing audited close path. Normal raw receipts remain shape/order compatible, so supervisor and path-gate sources/tests remain byte-identical.

## C11 verification

- Focused strict C11 canaries after GREEN: `6/6` passed. The strengthened real-closure/parser group, including sequenced and chained unsupported loader forms, passed `5/5`.
- Prebuild plus path gate: `node --test --test-concurrency=1 scripts/run-starship-playwright-prebuild.test.mjs scripts/starship-e2e-path-gate.test.mjs` -> `82/82` passed.
- Canonical inner runner: `STARSHIP_INNER_WRAPPER_TEST_ROOT=/Volumes/Starship/mais-inner-wrapper-c11-20260821-a22-01 node --test --test-concurrency=1 scripts/run-starship-playwright.test.mjs` -> `7/7` passed after creating the harness-required fresh empty root.
- Full supervisor: the first tool stream ended without a terminal summary and is not counted as evidence. A fresh rerun at `STARSHIP_SUPERVISOR_TEST_ROOT=/Volumes/Starship/mais-supervisor-c11-20260821-a22-02` was explicitly polled to exit `0` -> `55/55` passed.
- Node syntax: `node --check` passed for runner, focused prebuild test, supervisor, supervisor test, path gate, and path-gate test.
- Whole-tree type-check: `TEMP`, `TMP`, and `TMPDIR` were pinned to `/Volumes/Starship/mais-a22-c11-typecheck-20260821-01`; `npm run type-check -- --pretty false --incremental false` exited `0` with zero diagnostics.
- Protected `next-env.d.ts` remained exactly SHA-256 `85ae5aee75f011967cf2d25cbc342f62d69314e9d925f7f4aa3456fc2cffcca6`.
- Not run by this slice: Next build, Playwright/browser launch, network, Git mutation, or database command.

### C11 frozen code/test inventory

- `scripts/run-starship-playwright.mjs`: SHA-256 `59a51f34eabfd85cae2fb0cf1b82239663992d156306c3b02138a9f6febea514`; 117,590 bytes; 3,340 lines.
- `scripts/run-starship-playwright-prebuild.test.mjs`: SHA-256 `966d53228fa6418a8977cf18b5de56fa3def5b716c142f6a5eed005e1195d214`; 98,968 bytes; 2,437 lines.
- Unchanged `scripts/run-starship-playwright-supervised.mjs`: SHA-256 `3c090db4cc0f430bed366c3bbf1ba7d6586c28b6dfb7acbb7b0a02d4ffff295b`; 162,933 bytes; 4,510 lines.
- Unchanged `scripts/run-starship-playwright-supervised.test.mjs`: SHA-256 `e25480ef87fe8e09f1e5c3412de86dcf7fe47028cb58d2067fb95e17c2800923`; 178,968 bytes; 4,080 lines.
- Unchanged `scripts/starship-e2e-path-gate.mjs`: SHA-256 `6c34fff51a897ac2a016008050f53f2518273111048cc5799307148b2834e39c`; 14,062 bytes; 405 lines.
- Unchanged `scripts/starship-e2e-path-gate.test.mjs`: SHA-256 `ec4a0f9de5455bc66d8faca29b0b49297b9701b1c46d3a44bc198cc4f22041aa`; 6,749 bytes; 186 lines.
- Unchanged `playwright.config.ts`: SHA-256 `a4089612217e0f3dc2cb0629cbd765bdf86ce82266cc1826ab3bb815bf94760c`; 10,628 bytes; 261 lines.
- Canonical `next-env.d.ts`: SHA-256 `85ae5aee75f011967cf2d25cbc342f62d69314e9d925f7f4aa3456fc2cffcca6`; 262 bytes; 6 lines.

## C11 handoff posture

- Status: implementation and local verification complete; candidate remains `HOLD` pending a fresh DIFFERENT-agent review of the exact frozen C11 bytes.
- Dirty-state final action: evidence archive in the existing isolated worktree. No staging, commit, branch, merge, push, reset, cleanup, or deletion was authorized or performed.
- Parent binder, build, browser, exact92, generic301, and final335 gates remain closed until independent approval. C11 GREEN is implementation evidence only and is not self-approval.

## C12 raw-authority and loader-alias remediation plan

- C11 fresh DIFFERENT review was interrupted before a final verdict, but its concrete evidence is sufficient `HOLD`. First, the raw receipt serializes only runner-authored status/errors for the new directory/graph checks, so an outer binder cannot independently validate the held resolution-directory joins or originally resolved closure. Second, loader references can escape the approved call grammar through aliases such as `const load = require` or `const load = module.require` and then silently load omitted first-party code.
- Strict TDD will add an honest raw-receipt authority canary plus independent mutation checks for omitted, reordered, and foreign directory creation evidence; omitted/reordered/foreign edges; and omitted/foreign per-boundary path/descriptor joins. The raw evidence must carry exact entry paths, ordered source paths/edges, an independently recomputable closure digest, held resolution-directory receipts, and ordered per-boundary directory observations. The existing supervisor must continue transporting those exact raw bytes without interpreting them.
- Executable parser REDs will cover direct aliases, `module.require` aliases, object-destructuring aliases, assignment aliases, renamed element-access aliases, and indirect aliases followed by a first-party call. GREEN may continue to include the already approved exact literal direct forms, but any loader reference escaping that grammar must fail closed.
- Scope remains runner, focused prebuild test, supervisor source/test only if raw transport must change, and this log. Binder, product/browser sources, build, browser, network, Git, and database activity remain forbidden. A full freeze and new DIFFERENT review are mandatory.

## C12 RED/GREEN evidence

- Raw-authority RED used a real successful two-edge hold and an independent test-side validator. It failed immediately because the actual raw receipt still declared `starship-playwright-full-run-runtime-source-hold-v1` rather than the required independently auditable v2 contract. This was a direct missing-evidence failure before the mutation matrix.
- Alias RED used executable fixture files rather than eval. `const load = require; void load("./direct-alias")` produced `Missing expected rejection`, proving a first-party target could be loaded through an omitted alias edge.
- GREEN v2 raw evidence adds one deterministic closure envelope containing the exact ordered entry paths, exact ordered expected importer/specifier/resolved-path edges, exact ordered held source paths, and SHA-256 of that canonical JSON core. It also serializes every held resolution directory's creation receipt and exact order.
- Each of the five reached boundaries now serializes every resolution-directory observation, including exact index/path, path receipt, descriptor receipt, and local errors, in addition to the existing source observations/status/errors. Not-reached boundaries carry an explicit empty resolution-directory list. The top-level directory receipts and boundary receipts expose device, inode, mode, size, mtime, and ctime so the outer binder can recompute every join without trusting the runner's status string.
- The independent raw validator accepts the honest receipt, recomputes the closure digest, joins every directory path/descriptor observation to its held creation receipt at all five boundaries, and rejects nine raw mutations: omitted/reordered/foreign held directory evidence; omitted/reordered/foreign edges; and omitted/foreign/change-token-corrupted boundary joins.
- The contract is explicitly versioned as `starship-playwright-full-run-runtime-source-hold-v2` with `schemaVersion: 2`. The supervisor implementation remains an opaque exact-byte carrier. Its normal-run test canary now transports a v2 raw payload containing closure and resolution-directory fields and proves exact UTF-8/hash preservation without asserting validity or approval.
- Loader analysis now rejects any `require` or `module.require` reference that escapes the exact approved static call grammar, while permitting the runner's local `createRequire` binding and its approved direct calls. Executable negatives cover direct and `module.require` aliases, declaration and assignment destructuring, assignment, element-access rename, indirect alias chains, object-property aliases, named export aliases, and default export aliases. Returning or passing a loader reference, computed/chained loader calls, and dynamic targets remain fail-closed. Literal direct `require`, `require.call`, `module.require`, and `module["require"]` remain included; ordinary non-loader member calls remain ignored.
- The real fixed setup, canonical CLI, and G03-G06 transitive closure canary remains deterministic and complete after the stricter escape analysis.

## C12 verification

- Focused raw-authority/parser/real-closure group after GREEN: `6/6` passed.
- Final prebuild plus path gate: `node --test --test-concurrency=1 scripts/run-starship-playwright-prebuild.test.mjs scripts/starship-e2e-path-gate.test.mjs` -> `84/84` passed.
- Final canonical inner runner: `STARSHIP_INNER_WRAPPER_TEST_ROOT=/Volumes/Starship/mais-inner-wrapper-c12-20260821-a22-02 node --test --test-concurrency=1 scripts/run-starship-playwright.test.mjs` -> `7/7` passed.
- Final full supervisor: `STARSHIP_SUPERVISOR_TEST_ROOT=/Volumes/Starship/mais-supervisor-c12-20260821-a22-02 node --test --test-concurrency=1 scripts/run-starship-playwright-supervised.test.mjs` was explicitly polled to exit `0` -> `55/55` passed, including exact opaque v2 raw-byte transport.
- Node syntax: `node --check` passed for runner, focused prebuild test, supervisor, supervisor test, path gate, and path-gate test.
- Final whole-tree type-check: `TEMP`, `TMP`, and `TMPDIR` were pinned to `/Volumes/Starship/mais-a22-c12-typecheck-20260821-02`; `npm run type-check -- --pretty false --incremental false` exited `0` with zero diagnostics.
- Protected `next-env.d.ts` remained exactly SHA-256 `85ae5aee75f011967cf2d25cbc342f62d69314e9d925f7f4aa3456fc2cffcca6`.
- Not run by this slice: Next build, Playwright/browser launch, network, Git mutation, or database command.

### C12 frozen code/test inventory

- `scripts/run-starship-playwright.mjs`: SHA-256 `d8bc700472846416cb2fe8e7eb746a230aa62c7efd1a9af9291da9ccfda7b2ce`; 124,974 bytes; 3,555 lines.
- `scripts/run-starship-playwright-prebuild.test.mjs`: SHA-256 `7f4ff8af1f1eadf85a6e432105b1109dbc15bfe8ff50100b18e37f5849ac51c6`; 107,132 bytes; 2,625 lines.
- Unchanged `scripts/run-starship-playwright-supervised.mjs`: SHA-256 `3c090db4cc0f430bed366c3bbf1ba7d6586c28b6dfb7acbb7b0a02d4ffff295b`; 162,933 bytes; 4,510 lines.
- Raw-v2 transport canary only `scripts/run-starship-playwright-supervised.test.mjs`: SHA-256 `99d15e191b1ba133d5498dc600b1e80f09bad5ddcfc1737e78953cf1fdb13442`; 179,208 bytes; 4,082 lines.
- Unchanged `scripts/starship-e2e-path-gate.mjs`: SHA-256 `6c34fff51a897ac2a016008050f53f2518273111048cc5799307148b2834e39c`; 14,062 bytes; 405 lines.
- Unchanged `scripts/starship-e2e-path-gate.test.mjs`: SHA-256 `ec4a0f9de5455bc66d8faca29b0b49297b9701b1c46d3a44bc198cc4f22041aa`; 6,749 bytes; 186 lines.
- Unchanged `playwright.config.ts`: SHA-256 `a4089612217e0f3dc2cb0629cbd765bdf86ce82266cc1826ab3bb815bf94760c`; 10,628 bytes; 261 lines.
- Canonical `next-env.d.ts`: SHA-256 `85ae5aee75f011967cf2d25cbc342f62d69314e9d925f7f4aa3456fc2cffcca6`; 262 bytes; 6 lines.

## C12 handoff posture

- Status: implementation and complete local verification are frozen; candidate remains `HOLD` until a new DIFFERENT agent reviews these exact hashes and explicitly approves.
- Dirty-state final action: evidence archive in the existing isolated worktree. No staging, commit, branch, merge, push, reset, cleanup, or deletion was authorized or performed.
- Binder, product, build, browser, exact92, generic301, and final335 gates remain closed. This implementation session does not self-approve.

## C13 binding-aware loader provenance remediation plan

- C12 fresh DIFFERENT review returned `HOLD (0 P0 / 2 P1 / 0 P2)`. Executable probes showed that computed destructuring and aliases of the `module` object could still load an existing first-party dependency without adding it to the held closure. The same probes showed ordinary application members named `.require` were falsely rejected because the recursive escape check classified property-name text rather than binding provenance.
- Strict TDD will first add real source fixtures for computed direct/assignment destructuring, dynamic computed keys, module-object declaration/assignment/chained aliases, bare loader aliases escaping through parameters/returns/containers, and subsequent first-party calls. Separate positive fixtures will require ordinary `client.require`, `client["require"]`, property extraction/destructuring, and locally shadowed `require`/`module` parameters or variables to remain allowed and omitted from the Node-loader closure.
- GREEN will replace name-string recursion with lexical scope and binding resolution. Only the unshadowed CommonJS roots, plus the runner's exact local `createRequire(import.meta.url)` binding, receive loader provenance. Approved exact static calls consume that provenance; any real loader function/module object escaping as a value, alias, assignment, argument, return, container member, or computed/dynamic target fails closed. Ordinary same-spelling application properties and shadowed bindings remain non-loaders.
- The v2 raw closure/directory/boundary evidence, supervisor opaque transport, all five joins, source order, and nested tsconfig remain unchanged. Scope remains runner, focused test, existing log, and supervisor test only if raw fixture synchronization is needed. Binder/browser/product/profile files remain forbidden.

## C13 RED/GREEN evidence

- The exact executable RED matrix reproduced both C12 review findings. `const { ["require"]: load } = module` and `let m; m = module; m["require"]("./escaped")` were accepted while a real `escaped.ts` dependency was absent from the returned closure. Ordinary `client.require("./ordinary")` and `client["require"]("./ordinary")` were falsely rejected. Nested shadow parameters were also incorrectly treated as the outer Node loader. The focused RED group failed `0/3` before production changes.
- GREEN creates a one-file TypeScript `Program` and uses its `TypeChecker` binding identities. Unbound runtime CommonJS `require`/`module` roots and a directly initialized `createRequire(import.meta.url)` binding carry loader provenance; runtime parameters, variables, functions, classes, destructuring targets, and other lexical declarations shadow those roots. Erased ambient declarations do not create a false runtime shadow.
- Approved exact static calls remain `require("literal")`, `module.require("literal")`, `module["require"]("literal")`, bare `require.call(thisArg, "literal")`, static `import`/`export`/`import type`/`export type`, literal `import()`, and TypeScript import-equals. Their first-party targets enter the deterministic held closure exactly as before.
- Any proven Node loader function or CommonJS module object used as an alias, assignment source, destructuring source, argument, return value, container value, computed member, unsupported chained call, or dynamic target fails closed. This includes declaration, post-assignment, and chained `module` aliases; direct/assignment/computed destructuring; renamed and indirect `require` aliases; and loader escape through arrays, objects, parameters, returns, and exports.
- Ordinary application members with the same spelling remain non-loaders. Positive fixtures cover direct and element `client.require`, property extraction, renamed and same-name declaration/assignment destructuring, and locally shadowed `require`/`module` parameters, variables, functions, and classes. A nested shadow does not hide a separate outer unbound `require("./outer-real")`, whose dependency remains in the closure.
- A second strict RED found that `const factory = importedCreateRequire` could escape and that `createRequire("/tmp/foreign-base.cjs")` could make runtime resolution disagree with the importer-relative held graph. GREEN allows only a direct runtime named/renamed or namespace `node:module`/`module` `createRequire(import.meta.url)` variable initializer. Factory values, aliases, computed access, and non-canonical bases fail closed; a renamed canonical binding retains loader provenance and includes its literal first-party dependency.
- The v2 raw authority evidence was not weakened or reordered. The focused final group independently revalidated the exact ordered entry paths/edges/held closure digest, held resolution-directory creation receipts, and every per-boundary path/descriptor identity/change-token join. Supervisor remains an opaque byte-for-byte v2 transport.

## C13 verification

- Focused final binding/parser/real-closure/raw-authority group: `13/13` passed.
- Final prebuild plus path gate: `node --test --test-concurrency=1 scripts/run-starship-playwright-prebuild.test.mjs scripts/starship-e2e-path-gate.test.mjs` -> `90/90` passed.
- Final canonical inner runner: `STARSHIP_INNER_WRAPPER_TEST_ROOT=/Volumes/Starship/mais-inner-wrapper-c13-20260821-a22-03 node --test --test-concurrency=1 scripts/run-starship-playwright.test.mjs` -> `7/7` passed.
- Final full supervisor: `STARSHIP_SUPERVISOR_TEST_ROOT=/Volumes/Starship/mais-supervisor-c13-20260821-a22-03 node --test --test-concurrency=1 scripts/run-starship-playwright-supervised.test.mjs` was explicitly polled to exit `0` -> `55/55` passed, including exact opaque v2 raw-byte transport.
- Node syntax: `node --check` passed for runner, focused prebuild test, supervisor, supervisor test, path gate, and path-gate test.
- Final whole-tree type-check: `TEMP`, `TMP`, and `TMPDIR` were pinned to `/Volumes/Starship/mais-a22-c13-typecheck-20260821-03`; `npm run type-check -- --pretty false --incremental false` exited `0` with zero diagnostics.
- Protected `next-env.d.ts` remained exactly SHA-256 `85ae5aee75f011967cf2d25cbc342f62d69314e9d925f7f4aa3456fc2cffcca6`.
- Not run by this slice: Next build, Playwright/browser launch, network, Git mutation, or database command.

### C13 frozen code/test inventory

- `scripts/run-starship-playwright.mjs`: SHA-256 `133c9ab4a7cc63601b4f0c1447a0a7c89ca3dd93c7d2f9297135aa95a2b221ca`; 128,903 bytes; 3,640 lines.
- `scripts/run-starship-playwright-prebuild.test.mjs`: SHA-256 `373043945519ebe73851f4f53cfa17b4a256ac079125bc6fbd8aeddcfd603138`; 116,655 bytes; 2,843 lines.
- Unchanged `scripts/run-starship-playwright-supervised.mjs`: SHA-256 `3c090db4cc0f430bed366c3bbf1ba7d6586c28b6dfb7acbb7b0a02d4ffff295b`; 162,933 bytes; 4,510 lines.
- Unchanged C12 raw-v2 transport canary `scripts/run-starship-playwright-supervised.test.mjs`: SHA-256 `99d15e191b1ba133d5498dc600b1e80f09bad5ddcfc1737e78953cf1fdb13442`; 179,208 bytes; 4,082 lines.
- Unchanged `scripts/starship-e2e-path-gate.mjs`: SHA-256 `6c34fff51a897ac2a016008050f53f2518273111048cc5799307148b2834e39c`; 14,062 bytes; 405 lines.
- Unchanged `scripts/starship-e2e-path-gate.test.mjs`: SHA-256 `ec4a0f9de5455bc66d8faca29b0b49297b9701b1c46d3a44bc198cc4f22041aa`; 6,749 bytes; 186 lines.
- Unchanged `playwright.config.ts`: SHA-256 `a4089612217e0f3dc2cb0629cbd765bdf86ce82266cc1826ab3bb815bf94760c`; 10,628 bytes; 261 lines.
- Canonical `next-env.d.ts`: SHA-256 `85ae5aee75f011967cf2d25cbc342f62d69314e9d925f7f4aa3456fc2cffcca6`; 262 bytes; 6 lines.

## C13 handoff posture

- Status: C13 implementation and complete local verification are frozen. The candidate remains `HOLD` until a fresh DIFFERENT agent reviews these exact hashes and explicitly approves; this author does not self-approve.
- Dirty-state final action: evidence archive in the existing isolated worktree. No staging, commit, branch, merge, push, reset, cleanup, or deletion was authorized or performed.
- Binder, product, build, browser, exact92, generic301, and final335 gates remain closed pending independent review.

## C14 cross-file loader/factory escape remediation plan

- C13 remains `HOLD`: independent review produced an executable accepted-load case whose first-party dependency was absent from the held closure. The platform later interrupted the reviewer's formatted verdict, but the concrete acceptance/omission evidence is sufficient to continue strict TDD.
- RED will use real single-file and multi-file AST fixtures for `require("node:module").createRequire`, CommonJS `module.constructor.createRequire`, named/default/namespace Node-module factories, literal and computed factory access, exported loader functions/objects, named/default and barrel re-exports, multi-hop importer use, and `module.exports`/`exports` loader escape.
- GREEN policy is intentionally narrow: only a runtime named import of `createRequire` from `node:module`/`module`, called directly as a variable initializer with the exact current-file `import.meta.url`, may create a local loader binding. That binding may only be consumed by the already approved exact static call forms inside the same file. Every factory, loader function, or CommonJS module object crossing an export, assignment, return, argument, container, or cross-file boundary must fail closed in the exporter before an omitted dependency can be executed elsewhere.
- Ordinary non-loader properties and lexically shadowed `require`/`module` must remain accepted. The v2 raw closure/directory/boundary evidence, all five joins, source order, nested tsconfig, supervisor transport, path gate, config, and protected `next-env.d.ts` remain unchanged.

## C14 RED/GREEN evidence

- The initial strict C14 RED group failed `2/3`. `require("node:module").createRequire(import.meta.url)` was accepted and its real first-party target was absent from the closure. A first-party helper containing `export const load = createRequire(import.meta.url)` was also accepted; its importer invoked `load("./escaped-export")`, but that real dependency was absent. CommonJS `module.exports`/`exports` loader escapes were already fail-closed and served as characterization.
- GREEN narrows factory creation to a runtime named or renamed `createRequire` import from `node:module`/`module`, called directly as a local variable initializer with exactly `import.meta.url`. Namespace/default Node-module objects, named `Module`, `require("node:module")`, `require.call(..., "node:module")`, import-equals, dynamic import, computed factory access, non-canonical bases, and `module.constructor` factory paths all fail closed.
- Exporter-side enforcement rejects an exported local loader at its declaration, named/default export, container, return, argument, assignment, or CommonJS export boundary. Direct named/default Node-module factory re-exports, first-party barrels, and multi-hop re-exports fail in the exporting leaf before an importer can invoke an unclassified loader. Literal fixed first-party calls inside a non-exported local loader remain included in the closure.
- Binding-aware positive fixtures prove that ordinary local `Module`, namespace-shaped objects, shadowed `require`, shadowed `module`, and their ordinary `createRequire`-spelled properties remain non-loaders. Existing ordinary `client.require`, same-name declaration/assignment destructuring, and nested shadow fixtures remain green.
- A second self-audit RED proved that Module constructors reachable through `module.parent`, `module.children`, `require.main`, and `require.cache` could still be accepted with the dependency omitted. GREEN classifies those real CommonJS Module objects/containers, plus `module.__proto__`, as loader provenance and rejects their member chains. Exact approved `require.resolve` behavior remains unchanged.
- The final bounded dynamic-loading RED proved that a literal global `eval('require("./escaped")')` was accepted with the dependency omitted. GREEN rejects literal first-party loader code passed to unshadowed global `eval`/`Function`/`new Function`, rejects unshadowed `process.getBuiltinModule("module")`, named `Module._load`, `module.constructor._load`, `require.main.require`, and `module.parent.require`, while allowing locally shadowed same-spelling application bindings. Existing held collision-scanner uses of `Function` with its pinned non-literal decision-contract source remain accepted; the canary is deliberately limited to statically evident literal first-party loader code rather than attempting an unbounded dynamic-code interpreter.
- The final focused group revalidated the real fixed setup/canonical CLI/G03-G06 closure and the independent v2 raw authority receipt. No v2 field, ordering rule, held resolution-directory creation receipt, five-boundary path/descriptor identity/change-token join, supervisor transport byte, path-gate source, or config source changed in C14.

## C14 verification

- Focused final binding/factory/export/dynamic-loader/real-closure/raw-authority group: `19/19` passed.
- Final prebuild plus path gate: `node --test --test-concurrency=1 scripts/run-starship-playwright-prebuild.test.mjs scripts/starship-e2e-path-gate.test.mjs` -> `96/96` passed.
- Final canonical inner runner: `STARSHIP_INNER_WRAPPER_TEST_ROOT=/Volumes/Starship/mais-inner-wrapper-c14-20260821-a22-01 node --test --test-concurrency=1 scripts/run-starship-playwright.test.mjs` -> `7/7` passed.
- Final full supervisor: `STARSHIP_SUPERVISOR_TEST_ROOT=/Volumes/Starship/mais-supervisor-c14-20260821-a22-01 node --test --test-concurrency=1 scripts/run-starship-playwright-supervised.test.mjs` was explicitly polled to exit `0` -> `55/55` passed, including the unchanged opaque v2 raw-byte transport.
- Node syntax: `node --check` passed for runner, focused prebuild test, supervisor, supervisor test, path gate, and path-gate test.
- Final whole-tree type-check: `TEMP`, `TMP`, and `TMPDIR` were pinned to `/Volumes/Starship/mais-a22-c14-typecheck-20260821-01`; `npm run type-check -- --pretty false --incremental false` exited `0` with zero diagnostics.
- Protected `next-env.d.ts` remained exactly SHA-256 `85ae5aee75f011967cf2d25cbc342f62d69314e9d925f7f4aa3456fc2cffcca6`.
- Not run by this slice: Next build, Playwright/browser launch, network, Git mutation, or database command.

### C14 frozen code/test inventory

- `scripts/run-starship-playwright.mjs`: SHA-256 `703bb5a5197cce437e07cd0171159d48a123a0696d262806b36d6098f8588fa2`; 137,461 bytes; 3,835 lines.
- `scripts/run-starship-playwright-prebuild.test.mjs`: SHA-256 `233112fc5619c8314513e83197302476fd7b53a49cf11911539910907720ff22`; 130,658 bytes; 3,246 lines.
- Unchanged `scripts/run-starship-playwright-supervised.mjs`: SHA-256 `3c090db4cc0f430bed366c3bbf1ba7d6586c28b6dfb7acbb7b0a02d4ffff295b`; 162,933 bytes; 4,510 lines.
- Unchanged C12 raw-v2 transport canary `scripts/run-starship-playwright-supervised.test.mjs`: SHA-256 `99d15e191b1ba133d5498dc600b1e80f09bad5ddcfc1737e78953cf1fdb13442`; 179,208 bytes; 4,082 lines.
- Unchanged `scripts/starship-e2e-path-gate.mjs`: SHA-256 `6c34fff51a897ac2a016008050f53f2518273111048cc5799307148b2834e39c`; 14,062 bytes; 405 lines.
- Unchanged `scripts/starship-e2e-path-gate.test.mjs`: SHA-256 `ec4a0f9de5455bc66d8faca29b0b49297b9701b1c46d3a44bc198cc4f22041aa`; 6,749 bytes; 186 lines.
- Unchanged `playwright.config.ts`: SHA-256 `a4089612217e0f3dc2cb0629cbd765bdf86ce82266cc1826ab3bb815bf94760c`; 10,628 bytes; 261 lines.
- Canonical `next-env.d.ts`: SHA-256 `85ae5aee75f011967cf2d25cbc342f62d69314e9d925f7f4aa3456fc2cffcca6`; 262 bytes; 6 lines.

## C14 handoff posture

- Status: C14 implementation and complete local verification are frozen. The candidate remains `HOLD` until a fresh DIFFERENT agent reviews these exact hashes and explicitly approves; this author does not self-approve.
- Dirty-state final action: evidence archive in the existing isolated worktree. No staging, commit, branch, merge, push, reset, cleanup, or deletion was authorized or performed.
- Binder, product, build, browser, exact92, generic301, and final335 gates remain closed pending independent review.

## C15 dynamic-execution alias provenance remediation plan

- C14 fresh DIFFERENT review returned `HOLD (0 P0 / 2 P1 / 0 P2)` with executable evidence. Aliasing global `Function` and binding `process.getBuiltinModule` both let a literal first-party dependency execute while the parser accepted the source and omitted that dependency from the held closure. Extracted getters, `.call`, and aliased `Module._load` showed the same incomplete direct-call-only provenance model.
- Strict RED will first reproduce both reviewer cases with actual temporary `.mjs` execution and a real `.cjs` dependency marker, while independently recording whether the parser accepted the matching source and included the dependency. No eval-based test harness or malformed source generation is permitted.
- GREEN will treat every unshadowed global dynamic-execution constructor/evaluator and every real Node loader/module factory as provenance that cannot escape the exact approved grammar. Aliasing, extraction, binding, call/apply/Reflect.apply, sequencing, assignment, arguments, returns, containers, exports, and global/globalThis member access fail closed. Function/class constructor chains and `node:vm` execution functions may be conservatively rejected rather than supported.
- Local runtime shadows of `eval`, `Function`, `process`, and ordinary application methods named `getBuiltinModule`, `_load`, `createRequire`, `require`, or `constructor` remain ordinary. The sole supported Node loader construction remains a direct runtime named/renamed `createRequire(import.meta.url)` local variable initializer whose literal first-party calls are fully included.
- C15 changes only parser, focused tests, and this log. The v2 receipt, all five source/directory joins, supervisor transport, binder, browser, product, profile, path gate, config, and protected `next-env.d.ts` remain unchanged.

## C15 RED/GREEN evidence

- The two reviewer cases were reproduced before production changes with real executable `.mjs` fixtures and a real `.cjs` dependency marker. `const F = Function; F(<literal loader body>)()` and a loader obtained from `process.getBuiltinModule.bind(process)` both reported `accepted=true`, `dependencyIncluded=false`, and `dependencyActuallyExecuted=true`. These are the strict C15 RED results; no malformed source or eval-based test harness was used.
- Binding-aware GREEN recognizes only unshadowed runtime globals and follows declaration/assignment provenance rather than matching property names. Global `eval`/`Function` values now fail closed through aliases, post-assignment, bind/call/apply/`Reflect.apply`, sequences, arguments, returns, containers, exports, `globalThis`/`global` aliases, and computed or destructured access. Locally declared or parameter-shadowed `eval`, `Function`, and `process` remain ordinary application bindings.
- Real `process.getBuiltinModule` provenance now covers direct, extracted, destructured, computed, bound, call/apply/`Reflect.apply`, aliased-process, `globalThis`/`global`, container, argument, return, and export forms. Raw process aliases may be tracked locally so later loader access is rejected, but cannot cross an assignment, argument, return, container, or unknown-callee boundary.
- The one real config dependency-injection exception is exact and non-transitive: only the direct unshadowed `process` expression may initialize the exact `processIdentity` property of an immediate object-literal argument to a directly referenced runtime `ImportSpecifier`. The imported source name must be exactly `validateStarshipPlaywrightPrebuildReceipt` and its module edge exactly `./scripts/run-starship-playwright.mjs`. A process alias, validator local alias, foreign imported callee, return, or container is rejected. The focused exact-callee characterization and real config closure both remain GREEN.
- Function/class `.constructor` dynamic-code paths fail closed for direct expressions plus declaration, post-assignment, chained-assignment, destructuring, and container acquisition. The assignment provenance index is built once per parsed source and keyed by exact TypeScript symbols, so same-spelling ordinary members do not inherit loader meaning.
- Runtime imports/re-exports, import-equals, dynamic imports, and CommonJS acquisition of `node:vm`/`vm` execution functions fail closed, including `runInThisContext`, `runInNewContext`, and `compileFunction` aliases. Existing Node-module factory and `_load` prohibitions remain intact; the only supported construction remains a direct runtime named/renamed `createRequire(import.meta.url)` local initializer whose exact literal first-party calls enter the held closure.
- Two fixed browser-scanner sources intentionally construct their already pinned decision contracts with global `Function`. That narrow exception is now additionally pinned to the exact held source path and SHA-256: collision scanner `b775c93f615522da021cf813a42304bee27d5ba437b0e06247ccd4f5049f5824`, and text-contrast scanner `81cd3d4a612ae5934586be0cd0fa5a3e6987c96c3d6c89af32f76b8ef697913e`. Any byte change removes the exception and restores fail-closed global-dynamic-code handling.
- Ordinary objects with methods/properties named `getBuiltinModule`, `_load`, `constructor`, or VM execution names remain accepted. The real fixed setup, canonical CLI, G03-G06 transitive closure, nested tsconfig behavior, ordered v2 closure evidence, held resolution-directory receipts, all five path/descriptor identity/change-token joins, and opaque supervisor transport remain unchanged.

## C15 verification

- Final focused C15 executable/provenance group: `8/8` passed.
- Final prebuild plus path gate: `node --test --test-concurrency=1 scripts/run-starship-playwright-prebuild.test.mjs scripts/starship-e2e-path-gate.test.mjs` -> `104/104` passed.
- Final canonical inner runner: `STARSHIP_INNER_WRAPPER_TEST_ROOT=/Volumes/Starship/mais-inner-wrapper-c15-20260821-a22-01 node --test --test-concurrency=1 scripts/run-starship-playwright.test.mjs` -> `7/7` passed.
- Final full supervisor: `STARSHIP_SUPERVISOR_TEST_ROOT=/Volumes/Starship/mais-supervisor-c15-20260821-a22-01 node --test --test-concurrency=1 scripts/run-starship-playwright-supervised.test.mjs` was explicitly polled to exit `0` -> `55/55` passed, including unchanged opaque v2 raw-byte transport.
- Node syntax: `node --check` passed for runner, focused prebuild test, supervisor, supervisor test, path gate, and path-gate test.
- Final whole-tree type-check: `TEMP`, `TMP`, and `TMPDIR` were pinned to `/Volumes/Starship/mais-a22-c15-typecheck-20260821-01`; `npm run type-check -- --pretty false --incremental false` exited `0` with zero diagnostics.
- Protected `next-env.d.ts` remained exactly SHA-256 `85ae5aee75f011967cf2d25cbc342f62d69314e9d925f7f4aa3456fc2cffcca6`.
- Not run by this slice: Next build, Playwright/browser launch, network, Git mutation, or database command. One read-only exact-path `git diff` inventory command returned no output; it did not stage, commit, branch, merge, push, reset, clean, or otherwise mutate Git state.

### C15 frozen code/test inventory

- `scripts/run-starship-playwright.mjs`: SHA-256 `deeb50dd60ee1921de6a83eae1a94c3aca0b1be5af14745576b2f36e3574b343`; 153,776 bytes; 4,225 lines.
- `scripts/run-starship-playwright-prebuild.test.mjs`: SHA-256 `1618595821938ddd2d47e0d0293e442e72f6db327cf3eb5c3309a7a0d03d3ad6`; 147,777 bytes; 3,615 lines.
- Unchanged `scripts/run-starship-playwright-supervised.mjs`: SHA-256 `3c090db4cc0f430bed366c3bbf1ba7d6586c28b6dfb7acbb7b0a02d4ffff295b`; 162,933 bytes; 4,510 lines.
- Unchanged C12 raw-v2 transport canary `scripts/run-starship-playwright-supervised.test.mjs`: SHA-256 `99d15e191b1ba133d5498dc600b1e80f09bad5ddcfc1737e78953cf1fdb13442`; 179,208 bytes; 4,082 lines.
- Unchanged `scripts/starship-e2e-path-gate.mjs`: SHA-256 `6c34fff51a897ac2a016008050f53f2518273111048cc5799307148b2834e39c`; 14,062 bytes; 405 lines.
- Unchanged `scripts/starship-e2e-path-gate.test.mjs`: SHA-256 `ec4a0f9de5455bc66d8faca29b0b49297b9701b1c46d3a44bc198cc4f22041aa`; 6,749 bytes; 186 lines.
- Unchanged `playwright.config.ts`: SHA-256 `a4089612217e0f3dc2cb0629cbd765bdf86ce82266cc1826ab3bb815bf94760c`; 10,628 bytes; 261 lines.
- Unchanged pinned collision scanner `tests/e2e/hk-visualization-collision-scanner.ts`: SHA-256 `b775c93f615522da021cf813a42304bee27d5ba437b0e06247ccd4f5049f5824`; 73,660 bytes; 1,984 lines.
- Unchanged pinned text-contrast scanner `tests/e2e/hk-visualization-text-contrast-scanner.ts`: SHA-256 `81cd3d4a612ae5934586be0cd0fa5a3e6987c96c3d6c89af32f76b8ef697913e`; 55,143 bytes; 1,466 lines.
- Canonical `next-env.d.ts`: SHA-256 `85ae5aee75f011967cf2d25cbc342f62d69314e9d925f7f4aa3456fc2cffcca6`; 262 bytes; 6 lines.

## C15 handoff posture

- Status: C15 implementation and complete local verification are frozen. The candidate remains `HOLD` until a fresh DIFFERENT agent reviews these exact hashes and explicitly approves; this author does not self-approve.
- Dirty-state final action: evidence archive in the existing isolated worktree. No staging, commit, branch, merge, push, reset, cleanup, or deletion was authorized or performed.
- Binder, product, build, browser, exact92, generic301, and final335 gates remain closed pending independent review.
