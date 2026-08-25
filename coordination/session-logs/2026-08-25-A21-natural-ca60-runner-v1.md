# A21 MAIS Natural CA60 runner-v1 session

## Session identity

- Lane: `A21` content-pipeline and QA-operations runner implementation.
- Worktree: `/Volumes/Starship/MAIS-MVP/.worktrees/a21-natural-ca60-runner-v1-20260825`.
- Branch: `codex/a21-natural-ca60-runner-v1-20260825`.
- Base commit: `01d3de03edb80358819862e41be8f91e8fd4b2a0`.
- Owner: A21 session under the owner's `2026-08-25T13:35:30Z` bounded authorization.
- Target PR: `pending`.
- Creation date: `2026-08-25`.
- Expected closeout date: `2026-08-26`, after a reviewable offline runner slice is verified and pushed or a blocker report is frozen.

## Authorized scope

- Implement tracked package-local runner and tests under `coordination/content-qa/mais-natural-ca60-v1/`.
- Implement protected-custody, append-only receipt, atomic marker, dry-run, and fail-closed authorization interfaces.
- Consume the committed V4 design contracts without changing their thresholds, taxonomy, prompts, provider model, or decision ceiling.
- Create and push this isolated session branch after a fresh reviewable commit.

## Explicit non-authorizations

- No push or merge to `main`.
- No deployment or live question-bank mutation.
- No credential value read, copy, print, log, screenshot, stage, or commit.
- No Qwen or DeepSeek provider request and no natural-question egress.
- No caller-selected trust root may grant provider execution or aggregate publication.
- Provider behavior remains A07-owned; this A21 slice may expose an injected transport boundary and fixture transport, but may not silently implement or change the live adapter contract.

## Starting evidence boundary

- Worktree is a clean linked worktree on the named branch at the exact V4 commit.
- `node_modules` is an ignored symlink to the repository-root dependency tree; it is not a tracked artifact.
- Baseline V4 package-integrity passed `9/9`.
- Candidate validation returned `ok=true`, `registrationHash=null`, `providerEventCount=0`, and `firstProviderExecutionAllowed=false`.
- ACTIVE remains V3. V4 remains `DRAFT_OWNER_DECISIONS_PENDING`.
- The exact Qwen endpoint/data region has not been supplied. All route-freeze and live-dispatch paths therefore remain blocked.

## Planned TDD slice

1. Protected custody registry and runner registration roots.
2. Append-only `0600` receipt persistence with file and directory fsync.
3. Atomic completed-item commit markers and tamper detection.
4. Authorization/cap/expiry/model/origin guards that guarantee zero dispatch on failure.
5. Fixture-only transport, canary/resume state machine, and CLI command routing.
6. Aggregate export guard fixed closed until the V4 review gate recognizes an out-of-band protected custody registry.

This is an implementation session log, not a provider authorization, execution registration, frame registration, result, or independent-review receipt.

## Implemented offline slice

- Added the tracked A21 package at `coordination/content-qa/mais-natural-ca60-v1/`.
- Added protected-custody registry, deterministic source manifest, append-only receipt-chain, completed-item marker, `0600`, fsync, atomic-write, tamper, traversal, symlink, and secret-sentinel controls.
- Added a production dispatch wrapper pinned to the on-disk V4 candidate and a test-only fixture seam. Only `FIXTURE_ONLY_NO_NETWORK_V1` is accepted; any live-like transport is rejected before invocation.
- Added the complete public CLI command vocabulary. At the current candidate state only `dry-run` succeeds; every freeze, provider, scoring, verification, and aggregate-export command returns a self-hashed zero-request receipt and a nonzero exit.
- Added manifest-first canary and resume planning with the exact two B-prime roles, exactly five optional C0-prime roles, two attempts per role, no successful-role rerun, and execution-leaf drift invalidation.
- Added a read-only real `questionStore` adapter over all 13 California grade projections, the topic catalog, and the attempt lookup path. It detects duplicate IDs before any map collapse and retains missing answer/options/explanation as potential defects.
- Added deterministic whole-inventory exact, template, near, and fine-grained source homology diagnostics using the registered `0.90` Jaccard and `0.92` edit-similarity conjunction.
- Added closed schemas for custody registry, completed-item marker, command receipt, and aggregate runtime diagnostic receipt.
- Added package documentation with explicit execution, claim, role-owner, and resume gates.

## Read-only runtime diagnostic snapshot

Observed on the current A21 worktree without writing a frame, sample, or protected item artifact:

- Raw source items: `2,802`.
- Converted full items: `2,802`.
- Runtime-visible public union: `2,802`.
- Grade counts: K `102`; P1 `237`; P2 `111`; P3 `120`; P4 `138`; P5 `120`; P6 `284`; S1 `275`; S2 `281`; S3 `299`; S4 `305`; S5 `264`; S6 `266`.
- Runtime serialization/route-parity failures: `0`.
- Homology components: `694`.
- Singletons: `147` (`0.21181556195965417`).
- Edges: `4,496`.
- Largest component: `20/2,802` (`0.007137758743754461`).
- Components over 5%: `0`.
- Components spanning more than two canonical topics: `0`.
- Provider requests: `0`.

These values are diagnostic observations, not a frozen frame count. The aggregate receipt deliberately records `sourceCleanProofBound=false`, `frameFreezeAuthorized=false`, `sampleFreezeAuthorized=false`, and `claimCeiling=DIAGNOSTIC_ONLY_NOT_A_FRAME_REGISTRATION`. The earlier ad-hoc aggregate root was superseded by the tracked code-point-ordering correction; a future exact-SHA clean run must recompute all roots rather than reuse this snapshot.

## Fresh verification

- A21 `.mjs` suite: `34/34` passed, `0` failed.
- A21 TypeScript and real-store integration suite: `7/7` passed, `0` failed.
- Unicode code-point manifest-order regression and affected diagnostic reruns: passed.
- `npm run type-check`: exit `0`.
- Full V4 research regression: `342/342` passed, `0` failed.
- V4 candidate validator: `ok=true`, `registrationHash=null`, `lifecycleStatus=DRAFT_OWNER_DECISIONS_PENDING`, `freezeAllowed=false`, `providerEventCount=0`, `thresholdFreezePrecedesProviderEvents=true`, decision ceiling `INCONCLUSIVE_MACHINE_REFERENCE`.
- JSON schema parse checks: passed.
- `git diff --cached --check`: passed after exact-pathspec staging.
- Secret scan: only the intentional fake `sk-this-is-a-secret-sentinel` negative-test value matched; no credential source was opened and no credential value was read or written.
- No `.local/mais-natural-ca60-v1/` execution artifact exists in this worktree.

## Handoff gates still open

1. Exact Qwen endpoint/data region owner decision and a new append-only A16 frozen registration.
2. A18/owner fine-grained lineage-rule and rights/egress roots.
3. A22 exact-SHA clean source/dependency/runtime evidence and protected frame execution.
4. A07 live Qwen/DeepSeek adapters; this package contains no live transport.
5. A19 redacted credential readiness plus two current hash-bound provider authorizations.
6. Frozen frame, CA60 sample, Qwen reference-label seal, DeepSeek execution registration, canary/full execution, scoring, A11 independent recomputation, and A18 claim-boundary review.

Until those gates are satisfied, the accurate state remains `OFFLINE_RUNNER_IMPLEMENTED / LIVE_EXECUTION_BLOCKED`, with zero natural-item results and no formal decision.
