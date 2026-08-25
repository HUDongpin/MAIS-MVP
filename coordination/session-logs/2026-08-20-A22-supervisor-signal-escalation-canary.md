# 2026-08-20 A22/A11 — supervisor signal-escalation canary

- Agent lanes: A22 production reliability, borrowing A11 focused harness-test scope.
- Objective: diagnose and fix the frozen supervisor suite's `a signal-ignoring inner is escalated and cannot leave the supervisor awaiting forever` timeout without weakening fail-closed signal escalation or process ownership checks.
- Allowed write scope: `scripts/run-starship-playwright-supervised.mjs`, `scripts/run-starship-playwright-supervised.test.mjs`, and this unique A22 log.
- Prohibited execution: Next build, Playwright/browser, network, Git, and database commands.

## Root cause

- The production supervisor was not missing its escalation bound. With `termGraceMs: 100` and `killGraceMs: 1_000`, its live ownership-revalidated actions sent SIGTERM and then SIGKILL, reaped the exact inner group, proved the owned universe empty with consecutive scans, and sealed a RED terminal receipt as designed.
- The test's 1.5-second safety callback unconditionally set `safetyTriggered = true` before attempting external SIGKILL. It did not first ask whether the process group still existed. Therefore it classified a still-running terminal receipt-sealing phase as a failed escalation even when the supervisor had already killed and reaped the inner group.
- The timer never bounded an arbitrary post-kill supervisor hang: after firing and killing the group it still awaited the same execution promise. Its valid purpose is an external process-group safety kill, not a whole-receipt wall-clock service-level assertion.
- Current host process discovery is materially nonzero: ten direct stable-plus-environment `/bin/ps` snapshot pairs took 111–154 ms each. Ownership-safe delivery intentionally performs fresh revalidation before TERM/KILL, and terminal proof requires consecutive zero scans plus final recorded-group scans. Receipt sealing can therefore legitimately exceed 1.5 seconds without violating the configured child/group termination bounds.

## Phase evidence

An isolated one-shot fixture on the unchanged production source separated process death from receipt sealing:

- fixture ready: 299 ms after supervisor call;
- supervisor SIGTERM action: 214 ms after the test signal;
- supervisor SIGKILL action: 553 ms after the test signal;
- exact inner process group absent: 802 ms after the test signal;
- terminal receipt sealed: 1,618 ms after the test signal;
- ownership scans: 13;
- stdout/stderr stream waits: 0 ms each;
- final owned members: 0;
- `ownedUniverse.provenEmpty`: true;
- command transitions: 0.

This proves the former 1.5-second callback crossed the later receipt phase after the safety condition (an absent group) had already been satisfied.

## TDD

- Reproduction RED: three isolated executions of the frozen test failed at the existing `safetyTriggered === false` assertion; test durations were approximately 2.38–3.02 seconds.
- First GREEN slice: the unchanged 1.5-second callback now probes the exact negative process group with signal 0. `ESRCH` records `groupAlreadyGoneAtDeadline: true` and does not fail; only a still-live group sets `safetyTriggered` and receives external SIGKILL. The receipt must still prove its own sent SIGKILL action, `ownedUniverse.provenEmpty === true`, zero final members, and a dead inner PID. Focused result: 1/1 passed.
- Second RED: a new genuinely-live detached stubborn-group negative initially failed with `ReferenceError: armProcessGroupSafetyKill is not defined`.
- Second GREEN: the minimal test helper arms the same 1.5-second probe/kill protocol. The negative proves a group that is still live at the deadline sets `safetyTriggered: true`, receives external SIGKILL, exits, and is absent. The paired focused result was 2/2 passed.
- Fresh review C3 RED: the primary canary called a new exact receipt-conjunction assertion before it existed and failed with `ReferenceError: assertExactSignalEscalationReceipt is not defined`. This deliberately proved the prior test did not reject a partially correct or wrong-PGID escalation receipt.
- C3 GREEN: the primary fixture now requires the exact child PGID; one forwarded SIGTERM entry; native actions in exact SIGTERM-then-SIGKILL order; both native actions `sent: true`, targeting the exact inner PGID, with same-PGID witnesses; later cleanup `term.sent: false` and `kill.sent: false` because the group was already absent; cleanup `finalMembers: []` and `provenEmpty: true`; owned-universe actions/rows empty and proven empty; and registry command transitions/identity mismatches empty. A wrong-SIGKILL-PGID mutant must throw. The live safety negative now separately proves both direct PID `ESRCH` and negative-PGID `ESRCH` after exit.
- Fresh review C4 witness RED: changing the live canary to capture and pass an immutable process witness first failed with `ReferenceError: captureExactProcessWitness is not defined`. After exact `/bin/ps` PID/PGID/OS-start-token capture and deadline re-observation were implemented, the focused pair returned GREEN.
- C4 injected-control RED: an EPERM process-control canary failed because the prior helper ignored injected controls (`actual []`, `expected ['probe']`). The minimal injection boundary then made it and the real-process pair GREEN.
- C4 final safety contract: the immutable witness is `{ pid, pgid, startToken }`; immediately before any safety SIGKILL, the helper first probes the negative PGID and freshly observes the exact PID's PID/PGID/start-token. Probe EPERM, malformed observation, scan exception, or any identity mismatch fails closed without a signal attempt. Deterministic controls prove: EPERM performs only the probe; a same-PGID/different-start-token witness performs probe+observe but no signal; SIGKILL `ESRCH` records `attempted: true`, `sent: false`, `absentAtSignal: true`; and a valid exact witness performs exactly one SIGKILL with `sent: true`. The real stubborn-group negative retains direct-PID and negative-PGID `ESRCH` terminal proof.
- Fresh review C5 cleanup RED: the new deterministic cleanup EPERM canary first failed with `ReferenceError: signalExactProcessGroupForTestCleanup is not defined`. C5 GREEN centralizes every emergency process-group SIGKILL behind one immutable-witness boundary: exact negative-PGID probe, fresh PID/PGID/start-token observation, exact comparison, then at most one signal. Injected cleanup controls prove EPERM performs only the probe and same-PGID/start-token reuse performs probe plus observation but no signal. All twelve prior bare negative-PID SIGKILL fallback/finally sites now retain or recover an exact immutable witness and use that boundary; a source canary rejects reintroduction of a bare negative-PID SIGKILL.
- Fresh review C5 receipt RED: passing the immutable safety witness to the old receipt assertion first failed because it compared the child PGID to the entire witness object. C5 GREEN requires both native SIGTERM and native SIGKILL action evidence to contain the exact leader `{ pid, pgid, startToken }`, in addition to exact action PGID and sent state. Independent action-witness PID, start-token, and PGID mutants must all throw.
- No production source, grace duration, ownership predicate, kill escalation, residual-universe proof, foreign-process behavior, or command-transition logic changed.

## Verification

- Focused pair after C4: `STARSHIP_SUPERVISOR_TEST_ROOT=/Volumes/Starship/mais-supervisor-signal-c4-green-injected-20260820 node --test --test-concurrency=1 --test-name-pattern='signal-ignoring inner|escalation safety deadline' scripts/run-starship-playwright-supervised.test.mjs` -> 2 passed, 0 failed.
- Full supervisor after C4: `STARSHIP_SUPERVISOR_TEST_ROOT=/Volumes/Starship/mais-supervisor-signal-c4-full-20260820 node --test --test-concurrency=1 scripts/run-starship-playwright-supervised.test.mjs` -> 55 passed, 0 failed. Existing signal, process-group, residual-process, foreign-process, command-transition, descriptor, cleanup, and terminal-evidence tests remained GREEN.
- Focused signal pair after C5: `STARSHIP_SUPERVISOR_TEST_ROOT=/Volumes/Starship/mais-supervisor-c5-green-signal-pair.GrcA9v node --test --test-concurrency=1 --test-name-pattern='signal-ignoring inner|escalation safety deadline' scripts/run-starship-playwright-supervised.test.mjs` -> 2 passed, 0 failed.
- Affected cleanup matrix after C5: `STARSHIP_SUPERVISOR_TEST_ROOT=/Volumes/Starship/mais-supervisor-c5-affected.vLwm2Y node --test --test-concurrency=1 --test-name-pattern='detached child|leader exits|spawn registry window|PID or PGID reuse|preload ownership constants|registry parent replacement|command-changed detached|wrong nonce|recorded group remains|signal-ignoring inner|escalation safety deadline' scripts/run-starship-playwright-supervised.test.mjs` -> 12 passed, 0 failed.
- Full supervisor after C5: `STARSHIP_SUPERVISOR_TEST_ROOT=/Volumes/Starship/mais-supervisor-c5-full.X3W3Lx node --test --test-concurrency=1 scripts/run-starship-playwright-supervised.test.mjs` -> 55 passed, 0 failed. Existing signal, process-group, residual-process, foreign-process, command-transition, descriptor, cleanup, and terminal-evidence tests remained GREEN.
- Node syntax: `node --check scripts/run-starship-playwright-supervised.mjs` and `node --check scripts/run-starship-playwright-supervised.test.mjs` -> exit 0.
- Full type-check was attempted after the C5 gates and remained an integration-settle gate because parallel G07 browser/receipt sources were in a known intermediate incompatible state; C5 does not edit or own those files.
- No build, Playwright/browser, network, Git, or database command ran.

## Frozen hashes

- Production supervisor source unchanged: SHA-256 `80f517a83f250dc1ebc15170111b617ee7bdb63a617b7dc300921a5cf05f033d`; 161,603 bytes; 4,467 lines.
- Supervisor test after C5: SHA-256 `5ec4818a274fa21b013e406794835c69114b00386a9d3a95952250b0a7f973f6`; 177,443 bytes; 4,042 lines.
- Review state: frozen pending fresh DIFFERENT-agent review; do not self-approve or edit before review.
