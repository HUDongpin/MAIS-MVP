# A25 Seven-Step Closure Session Log

- Date: 2026-07-14
- Agent ID: A25 Git hygiene and release intake
- Coordinating owners: A10 tooling/docs/config; A22 production reliability and release engineering
- Worktree: `/Users/dongpinhu/Desktop/MAIS-MVP/.worktrees/A25-ci-backup-workflow`
- Branch: `codex/A25-seven-step-closure-20260711`
- Objective: complete the owner-authorized preserve-first closure sequence: slice, extract, verify, merge, and clean, with exact evidence currentness and no dirty-root release.
- Current package: typed FSEvents evidence monitor integration for the A25 external archive/currentness gate, coordinated with A22 release isolation.
- Intended files for the protocol-v2 subpackage: `coordination/release-intake/native/mais-fsevents-journal.c`, `coordination/release-intake/evidence-archive-lib.mjs`, `coordination/release-intake/refresh-linked-worktree-archive-evidence.test.mjs`, and this session log. Gate wiring may later add `coordination/release-intake/refresh-linked-worktree-archive-evidence.mjs` and `coordination/release-intake/assert-linked-worktree-archive-evidence-current.mjs` after the protocol gate is green.
- Forbidden scope: root/main mutation, feature-owner code, secret files, generated evidence in a code commit, protection-ref deletion, evidence-set garbage collection, broad staging, push, deploy, reset, clean, prune, or worktree deletion.
- Plan: preserve RED for the v1 terminal-journal substitution bypass; upgrade the helper ACK/commit chain to bind exact roots and journal endpoint provenance; add parent-liveness cleanup; integrate fixed-point classification; publish attestation before the A/B gate report; run focused, full archive, currentness, scale, and independent spec/quality checks; stage only an exact allowlist after all Critical and Important findings are zero.
- Current evidence: native helper Task 1 is committed at `ed7c50e4c3b6e12b490b6ba9d710f063cd41ec7d`; Task 2 schema/parser/bootstrap work is uncommitted. Schema review is Critical 0 / Important 0. A fresh runtime review found a Critical v1 gap because ACK did not bind the journal digest/inode after STOP, plus an Important parent-death orphan case; v1 monitor integration, gate publication, and scale claims are intentionally paused until protocol v2 is green.
- Safety state: no external evidence writer is active; the persistent advisory writer-lock file is expected and retained; preservation refs and `.git/worktrees/A25-ci-backup-workflow/gc.log` must not be removed; no push or deployment is authorized.

## 2026-07-15 A25/A22 protocol-v2 prerequisite

- Agent IDs: A25 Git hygiene/release intake; A22 production reliability/release engineering.
- Objective: upgrade the frozen native typed-FSEvents control protocol to v2 so every committed endpoint binds the exact consumed roots and held journal prefix, and make native lifetime depend on its monitor child through stdin EOF/HUP rather than PID cleanup.
- Write scope: `coordination/release-intake/native/mais-fsevents-journal.c`, `coordination/release-intake/evidence-archive-lib.mjs`, `coordination/release-intake/refresh-linked-worktree-archive-evidence.test.mjs`, and this append-only session log.
- Forbidden scope: gate/writer files, package/config files, xattr reconciliation, scale work, root/main, staging, committing, pushing, deploying, cleaning, resetting, pruning, or deleting preserved evidence.
- TDD plan: add focused v2 frame/root/journal/held-FD/liveness tests; capture and report the expected RED; implement the minimum native and JS changes; run the focused suite twice plus Node syntax, strict clang syntax, and exact diff checks.
- Preservation: pre-existing uncommitted Task 2 library and test changes are owner work and will not be reverted or rewritten outside the protocol-v2 seams.

### Protocol-v2 TDD and verification handoff

- RED, synthetic v2 ACK consumer: `node --test --test-name-pattern='typed FSEvents v2 ACK reader' coordination/release-intake/refresh-linked-worktree-archive-evidence.test.mjs` initially reported 0 passing / 5 failing because the valid 136-byte v2 roots+journal-bound endpoint was rejected.
- RED, held-reader FIFO liveness: the focused FIFO endpoint test reported 0 passing / 4 failing; each `ack.bin`, `ack.commit`, and `journal.bin` child hit the 1,000 ms `ETIMEDOUT` bound before `O_NONBLOCK` plus immediate held-FD type/size validation was added.
- RED, native stdin lifetime: the initial focused stdin test reported 0 passing / 4 failing because EOF, HUP/data, and non-pipe fd0 did not terminate fail-closed. A later read-write FIFO regression reported 3 passing / 2 failing because an `O_RDWR` FIFO could self-hold its writer end.
- RED, native FIFO command endpoint: the focused native FIFO test reported 1 passing / 2 failing because `command.bin` could block in `openat`; the roots FIFO control already failed closed at its pre-open type check.
- GREEN implementation: MFSC v2 remains 20 bytes; MFSA v2 is exactly 136 bytes with root count at 48, exact `roots.config` SHA-256 at 56, held journal device/inode at 88/96, and exact held-prefix SHA-256 at 104; MFAC v2 remains exactly 72 bytes and hashes all 136 ACK bytes. Every READY/FLUSH/STOP ACK is parsed against the expected root tuple and the held/visible journal identity and digest.
- GREEN lifetime and cleanup: native fd0 now accepts only a read-only FIFO or a connected stream socket, polls for EOF/HUP/ERR/unexpected data instead of sleeping, and fails closed. The monitor owns the native `ChildProcess` handle; outer cleanup signals only the monitor child handle. The PID sidecar is a bounded, held-FD, nonblocking diagnostic and has no signal authority.
- GREEN held-file hardening: ACK, commit, journal, source snapshot, native binary, roots config, monitor bootstrap config, and diagnostic PID reads use `O_NOFOLLOW | O_NONBLOCK`, immediate regular-file/mode/owner/link/size checks, repeated held reads or snapshots, and visible-name rebinding before acceptance. FIFO replacement, same-inode pwrite, visible replacement, v1/mixed/truncated frames, root-count/digest, journal tuple/digest, and MFSC v1 negatives are covered.
- GREEN focused run 1: 50 tests passed, 0 failed, duration 20.958703083 seconds.
- GREEN focused run 2: 50 tests passed, 0 failed, duration 21.665924291 seconds.
- Final static checks: both modified `.mjs` files pass `node --check`; native source passes `/usr/bin/xcrun --sdk macosx clang -std=c11 -Wall -Wextra -Werror -fsyntax-only`; `git diff --check` passes for the exact four-file scope.
- Intentionally not run as a completion gate: xattr/material-event reconciliation, gate/writer wiring, scale, staging, commit, push, deployment, deletion, or cleanup. One exploratory aggregate pattern included the explicitly out-of-scope xattr/material-event test and observed its existing `journal event classification is not yet reconciled` fail-closed state; the protocol-v2 focused gate excludes that future package.
- Files changed in this package: `coordination/release-intake/native/mais-fsevents-journal.c`, `coordination/release-intake/evidence-archive-lib.mjs`, `coordination/release-intake/refresh-linked-worktree-archive-evidence.test.mjs`, and this session log only.
- Current handoff state: protocol-v2 prerequisite is green and ready for independent A22/A25 review. No Git operation or external publication was performed.
- Independent moving-diff review at frozen production/test hashes completed with Critical 0, Important 0, Minor 0; the reviewer found no remaining protocol-v2 defect and explicitly did not claim the later classification/gate package.

## 2026-07-15 A22/A25 terminal-ACK child-lifecycle follow-up

- Agent IDs: A22 production reliability/release engineering; A25 Git hygiene/release intake.
- Objective: make the production typed-FSEvents ACK wait contract bind nonterminal acceptance to a live owned `ChildProcess`, and terminal acceptance to that child's observed clean exit (`exitCode === 0`, `signalCode === null`).
- Exact write scope: `coordination/release-intake/evidence-archive-lib.mjs`, `coordination/release-intake/refresh-linked-worktree-archive-evidence.test.mjs`, and this append-only session log.
- Forbidden scope: native helper, writer/gate executables, journal classification, package/config, staging, commit, push, external writer, cleanup, deletion, reset, or prune.
- TDD plan: add a cross-platform pure decision-contract test for live/dead nonterminal and running/clean/failed terminal states; capture the expected RED; embed the minimum reviewed decision helper into the monitor child; make STOP request and await terminal handling; update only generic platform-dependent schema assertions made stale by typed schema v3; run focused GREEN, `node --check`, and exact-scope `git diff --check`.
- Preservation note: the existing large uncommitted protocol-v2 library/test diff is owner work and remains intact; this follow-up is limited to the lifecycle seam and stale generic schema expectations.

### Terminal-ACK lifecycle TDD handoff

- RED 1: `node --test --test-name-pattern='typed FSEvents ACK wait decision' coordination/release-intake/refresh-linked-worktree-archive-evidence.test.mjs` reported 0 passing / 1 failing with the expected missing `decideTypedFseventsAcknowledgementWait` function.
- RED 2: after restoring the old STOP call for an independent wiring check, `node --test --test-name-pattern='typed FSEvents production STOP' coordination/release-intake/refresh-linked-worktree-archive-evidence.test.mjs` reported 0 passing / 1 failing because STOP was synchronous and did not request terminal handling.
- GREEN implementation: exported and embedded one pure `accept`/`wait`/`reject` lifecycle decision. Nonterminal acceptance now requires a live child with no exit or signal; terminal acceptance requires the matching ACK plus `exitCode === 0`, `signalCode === null`, and a non-live child. A running/unreaped terminal child waits; signal and nonzero exit reject. The terminal poll yields to the event loop so the owned `ChildProcess` can publish authoritative exit state.
- GREEN STOP wiring: `stopTypedFsevents` is async, awaits `waitTypedAcknowledgement(3, sequence, true)`, and `finalizeStop` awaits STOP before retaining the existing exact exit check.
- GREEN focused decision/wiring run: 2 tests passed, 0 failed.
- GREEN expanded cross-platform run after the schema review correction: `node --test --test-name-pattern='typed FSEvents (ACK wait decision|production STOP|v2 ACK reader)' coordination/release-intake/refresh-linked-worktree-archive-evidence.test.mjs` passed 19 tests, 0 failed, in 622.576541 ms.
- Generic schema maintenance: the four stale generic state/report assertions now expect the production monitor's unconditional schema v3 on every platform; no watch-mode, event, journal-classification, writer, or gate behavior was changed.
- Generic Darwin end-to-end attempt: the two selected descriptor-monitor tests did not reach their schema assertions on this host. The direct monitor test failed closed during startup with `typed FSEvents helper acknowledgement timed out`; the writer-backed test hit its child timeout and returned `status === null`. These environment/runtime results are recorded, not treated as a GREEN gate.
- Static checks: `node --check` passed for both modified `.mjs` files; exact two-file `git diff --check` passed.
- Frozen post-correction hashes: library `5c85a68f38b75b1ee2d14f49e996b4e99eb511f75bf0333458d5750f6ba40fb8`; test `a0f862101169f4d3783b9321d5dd7b2f8c481662888cea985e9d47f6b37718bf`.
- Git/release action: no stage, commit, push, writer, deploy, cleanup, deletion, reset, or prune was performed. The worktree and all pre-existing owner changes remain retained.
- Independent incremental review initially returned Critical 0 / Important 1 / Minor 0: the reviewer caught the incorrect non-Darwin v2 expectation. The four assertions were corrected to unconditional v3; lifecycle logic and STOP ordering had no finding.
- Final current-state re-review: Critical 0 / Important 0 / Minor 0. The reviewer re-read the corrected hash binding, confirmed both recorded file hashes match, and found no lifecycle, schema, STOP-ordering, or scope-expansion issue.

## 2026-07-15 A22/A25 streaming journal and pure-classification Task 3A

- Agent IDs: A22 production reliability/release engineering; A25 Git hygiene/release intake.
- Objective: add native pre-write journal limits, a checkpoint-bound streaming typed-FSEvents journal visitor, and a pure immutable event-classification transaction before later fixed-point/gate wiring.
- Exact write scope: `coordination/release-intake/native/mais-fsevents-journal.c`, `coordination/release-intake/evidence-archive-lib.mjs`, `coordination/release-intake/refresh-linked-worktree-archive-evidence.test.mjs`, and this append-only session log.
- Forbidden scope: writer/gate executables, fixed-point production wiring, package/config files, staging, commit, push, deploy, external evidence publication, cleanup, deletion, reset, or prune. The inherited untracked `coordination/release-intake/refresh-dirty-worktree-remediation-evidence.mjs` is read-only and excluded.
- TDD plan: first add focused tests for native cap ordering/values, checkpoint-bound journal extension validation, strict host event-ID monotonicity, canonical root containment, pure classification precedence and proof equality, and a separate 300,000-record visitor bounded-memory/runtime run; capture the expected RED; implement the minimum compatible primitives; then run focused Node tests, strict clang, syntax, and exact-scope diff checks.
- Intended production edits: only the native append preconditions and two pure library seams. `parseTypedFseventsJournalPrefix` will remain a compatibility collector over the new visitor; no caller/gate/classification integration occurs in Task 3A.
- Preservation: all inherited protocol-v2 and lifecycle changes are owner work and must remain intact; Task 3A will not rewrite their contracts or touch unrelated dirty files.

### Task 3A TDD, hardening, and verification handoff

- Initial RED: the focused Task 3A pattern reported 0 passing / 7 failing because native caps were absent and neither the journal-extension visitor nor the pure classification transaction existed.
- Native GREEN: journal append now rejects, before the first `pwrite`, any write beyond 512 MiB, 1,000,000 entries, or a 1 MiB event path. Integer and `off_t` overflow guards remain fail-closed.
- Journal GREEN: `visitTypedFseventsJournalExtension` validates framing, UInt64 count/high-water/last-ID/digest endpoints, contiguous sequence, strictly increasing host event IDs, UTF-8/NUL/canonical absolute paths, exact root containment, and fatal/unknown flags while visiting only the authenticated extension. It never returns a records array.
- Checkpoint hardening: module-private WeakMap provenance makes plain, copied, forged, and zero-delta checkpoints invalid. Every nonempty checkpoint is bound to the exact ordered canonical event-root tuple; broader, narrower, different, and reordered roots fail closed. Only the factory-issued genuinely empty checkpoint is root-neutral.
- Classification GREEN: fatal/unknown flags precede classification; exact metadata paths and exact metadata-root self/descendants are metadata; metadata ancestors remain source; only exact `0x18000` events with equal direct-regular semantic proofs become xattr-only. Direct regular proofs require canonical UInt64 observations, valid regular-file mode bits, positive link count, and valid ctime observation; ctime remains outside semantic equality.
- Scale gate: a distinct 300,000-record child run samples peak heap during visitation, asserts no returned record collection, and calibrates the same measurement with an intentionally retained 300,000-record visitor so a collector implementation would fail the 32 MiB bound.
- Compatibility: `parseTypedFseventsJournalPrefix` remains the collecting compatibility API and preserves its exact prior record-key shape; the new `flagClass` field is visitor-only.
- Final focused run: the Task 3A pattern passed 9/9; the expanded parser/classifier/Task 3A pattern passed 11/11. The protocol-v2/lifecycle/native regression pattern passed 49/49, including real Darwin helper start, stdin liveness, FIFO rejection, ACK races, journal replacement/pwrite, and reproducible compile checks.
- Static gates: both modified `.mjs` files pass `node --check`; native source passes strict macOS clang `-std=c11 -Wall -Wextra -Werror -fsyntax-only`; exact four-file `git diff --check` passes.
- Independent review sequence: the first SPEC review found invalid/missing ctime acceptance; the first quality review then found forgeable zero-delta checkpoints, a post-GC-only memory gate, malformed regular proofs, and missing event-root context binding. All were repaired with RED tests. Final SPEC and quality reviews are Critical 0 / Important 0 / Minor 0.
- Frozen implementation hashes: native `add0d4e9612cf695e184dbc9e01db74482feb9ce372d844ec6f7ac83eddcab30`; library `57a4ce3ccef59bfe7b5b0942598bfd4849d892543ee9e9e50565d4f156ea2eca`; test `acc9dc08fdd68a93cb25c15a96f1fd05ed08283038418a452de02dd746bdfd61`.
- Deliberately deferred: empty native ACK `lastEventId: 0` to checkpoint `null` adaptation, production fixed-point capture/reconciliation, terminal post-fence sealing, Gate A/B publication, external writer execution, staging/commit, push, deploy, deletion, and cleanup.
