# Exact PR297 runtime admission

This contract admits only the reviewed P1 shape-copy, course-identity and S1/S2/S3 learner-storage integration in PR #297. It is not a Shadow receipt, content-package approval, deployment decision or production acceptance. All historical gates, markers, manifests, receipts, closures and registries retain their prior bytes and meaning.

The owner approved this exact extension on 2026-10-27. A10 owns the tooling slice; A18, A11 and A23 supply separate actual reviews. The existing branch is `codex/dirty-candidates-integration-20261027`, with PR297 as its target. The expected closeout is after the exact PR and main checks finish; no deployment is authorized.

## Immutable phases

- B is `b16991a6263d41642266b7b0b5f65446b11e5e1f`.
- S is `0d91ff35fd9a46a070119949ea4509fb8b46a011`, tree `f7453315bf0925d700ded5aba7e426c70ac0a3ca`.
- The complete B→S inventory contains 134 paths: 74 runtime/tooling sources, 57 tests and 3 documents. Every entry binds before/after mode, Git blob and raw SHA-256. The partition is descriptive; no partition is exempt from verification.
- T is the sole direct child of S changing exactly this document, the new checker, its test and `.github/workflows/promotion-shadow.yml`. T binds the already frozen source-checks and runtime-evidence raw hashes. Its actual commit/tree/inventory are recorded by the later reviews and admission; no self-referential future commit hash is invented.
- E is the sole first addition of `coordination/integration/reviewed-code/pr297-v1/admission.json`, with sole parent T. It adds exactly ten previously absent files: admission, source-inventory, source-checks and runtime-evidence JSON, plus JSON/Markdown pairs for A18, A11 and A23. Reviews are created only after actual T and the execution evidence have been inspected. No pending approvals are committed.
- A same-repository PR event must identify PR297, base B and head exactly E. The only main push accepted is a normal merge M whose ordered parents are `[B,E]`, whose tree equals E, and whose event says before B / after M. Empty descendants, squash/rebase, another PR, a moving base and edited evidence fail closed.

The E commit is discovered from the immutable first-addition history, then constrained to these exact parents, files, bytes and review bindings. Review identities name the actual independent sessions. Synthetic test fixtures exercise record validation and are explicitly not real approvals. The independent review records, Git history and owner review of E are the review trust boundary; a role label or self-consistent hash alone does not establish human independence.

## Workflow and current checks

The new selector is prepended before PR295-E2. A present or symlinked marker selects this path; a validation failure stops the shell under `set -euo pipefail` and never falls back to an old contract. The entire workflow must equal the old S workflow plus the deterministic selector/mode/run/upload insertions. Old action SHA pins, jobs, permissions, dependency-install commands, conditions and checker invocations are preserved.

The checker uses the existing bounded strict JSON parser, regular tracked blob checks, clean-tree/ancestry checks and unchanged full materialization guard. It refuses symlink or hardlink authority files, duplicate keys, extra keys in admission/review records, hidden index flags and source byte/mode drift. Source-checks and runtime-evidence have fixed raw SHA-256 bindings in T; changing even one field or adding an unknown field invalidates that binding. The complete source-inventory object is recomputed.

The fixed command table executes 25 adversarial gate tests, 565 critical unit tests in 43 explicit files, 10 schema contracts, 34 MVP contracts, strict TypeScript and strict Simplified Chinese audit. The three source TAP suites have zero failures and zero skips. Every recursive TAP result, title digest, plan, diagnostic and root summary must match. Both nested suites and nested `t.test` parents are handled without assuming a parent is always a suite. TypeScript uses a fixed `--max-old-space-size=6144` process argument, matching the existing Ubuntu memory budget while refusing inherited `NODE_OPTIONS`; it requires a successful exit and empty stdout. The zhHans result binds the measured 3511/3512 advisory count and zero non-pack critical/pack regression.

Child processes inherit only an allowlist: offline fixture settings, SQLite test-provider selection, disabled demo seed, tool paths and temporary-directory settings. Production database URLs, provider keys and `NODE_OPTIONS` are excluded. Test files own their synthetic temporary fixtures. Gate proof output is restricted to a new private runner temporary directory. Materialized source and HEAD are rechecked after execution. No provider or deployment command is introduced.

## Consumed runtime evidence and retained limits

The structured runtime file contains independently inspected execution facts, test titles/counts, measurements and artifact hashes. Original large logs remain in the preserved integration archive. A machine-readable hash binding is not described as a CI rerun of those external executions.

- PostgreSQL is **version 16.15**, and the latest store/route suite has **14 tests, zero failures and zero skips**. These include actual commits, durable reads and trigger-driven rollback. Route fixtures retain their existing authentication mocks; the real authentication boundary has separate HTTP evidence.
- The final HTTP/build source is `9b924d2559195201d6a01cde72d2423aaac9b93e`. It differs from S by exactly eleven enumerated test paths. The 11,102 non-test Git entries and 3,578 source-manifest non-test hashes match S. This is a precise runtime-equivalence relation, not complete-tree equality and not a new S build. The build snapshot's Next-generated `tsconfig.next.json` variation is disclosed separately.
- The synthetic two-worker HTTP runs use 2 and 20 learners. The 20-learner mixed workload has 80 flows, 40 cross-worker exactly-once replays, durable readback, at most two application database connections, full-flow p95 about 1763.546 ms and maximum about 1915.350 ms under its 2000 ms budget. It is not a production/cold-start/remote-network load test.
- The inherited **legacy/scoped direct-save budget remains failed**: mean about 439.873 ms, serial maximum about 460.262 ms and burst tail about 8772.207 ms against 90/100/2000 ms. Its fixture differs from the original frozen fixture; no speedup/regression or workload equivalence is claimed. Authority HTTP success does not replace this result.
- The broad **lesson-all run remains failed at its registration fixture**, which omitted `parentalConsent`. Account protection was retained. Separate actual browser checks cover the bounded P1 interaction and English/Traditional/Simplified Chinese copy, backend/course flows and teacher operations.
- A18 covers the original four English/Traditional Chinese strings plus two Simplified Chinese additions and their unchanged topic/GeometryExplorer dependencies. Its decision remains `approved-for-integration-review`; it does not approve the entire lessons file or a content pack.
- S4 prototypes and unrelated old-base features remain archived/deferred. This gate neither admits nor discards them.

The output scope is `exact-pr297-runtime-required-check-only`. It records the disclosed limits with `legacyDirectBudgetPassed=false` and `broadLessonAllPassed=false`; `nativePgReexecutedInCi=false` and `httpReexecutedInCi=false` distinguish consumed execution records. Historical revalidation, live, Preview, deploy, whole-pack and historical-authority-transfer flags remain false.

E's final GitHub checks can only be observed after E exists. The Promotion job checks E; ordinary CI may check the GitHub merge ref, whose parents and tree must be verified separately. Successful PR/main checks do not authorize deployment. After accepted integration, original source-worktree closeout uses the owner's exact archive scope and preserved full archives/restore receipts.
