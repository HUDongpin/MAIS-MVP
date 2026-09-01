# A22 Classroom Unicode Integration — 2026-09-02

- Owner/lane: `A22 Production Reliability and Release Engineering`
- Branch: `codex/a22-classroom-unicode-integration-20260901`
- Worktree: `/Volumes/Starship/MAIS的衍生文件/MAIS-a22-classroom-unicode-integration-20260901`
- Baseline: live `origin/main` at `be92640f4bb8933ed8a99ed7c1ea604428c6a56f`
- Target PR: `pending`
- Creation date: `2026-09-02 HKT` (branch name was selected before the date boundary)
- Expected closeout date: `2026-09-02 HKT`
- Mode: `application-runtime-release`, local integration/readiness only
- Promotion: `not-applicable`
- Deployment/live/provider/production actions: `not-authorized`, `not-run`

## Exact scope

Use `codex/a22-classroom-unicode-path-test-20260901` as the implementation source, without merging the three overlapping Classroom histories. Preserve only valuable, compatible regression coverage from `codex/classroom-load-staging-only-20260829` in a dedicated test file. Do not modify or delete either source branch/worktree.

## Initial RED

On the unchanged live-main baseline, `npm run test:release-governance` ran 103 tests: 90 passed, 2 failed, and 11 were skipped. Both failures were the expected Unicode filesystem-path versus percent-encoded `import.meta.url` mismatch in `scripts/release-build-gate.test.mjs`. The baseline did not contain `scripts/classroom-load-smoke.mjs`.

## Selective integration

The Unicode source chain was replayed onto the live-main baseline without merging either historical branch:

- `391fc9a322` from source `8c73a3f6b9`: staging-only classroom smoke;
- `9f0c52bf8f` from source `9e68e54b31`: approved-origin and artifact hardening;
- `11e7fb4282` from source `8935690129`: Unicode filesystem path handling;
- `67a98b93bf` from source `e08f7c3c41`: path-portability closeout evidence.

The first replay had one conflict in the frozen release-governance command digest. Neither historical digest applied to the new live-main base, so the digest was recomputed from baseline `ce2ae5258013ca5bd79dd0cc56e7b1681d5cd411` and the exact staged package object. No allowlist or production boundary was weakened.

## Extracted legacy test value

The old branch's 888-line alternative regression file was not copied wholesale because it targets a different allowlist/mode API and a different smoke implementation. Five compatible, high-value behaviors were extracted into `scripts/classroom-load-smoke.test.mjs`:

1. the command remains standalone and absent from production wiring;
2. timeout remains active while reading a slow response body;
3. login redirects are rejected before a foreign origin receives credentials;
4. symlink/hardlink result nodes are rejected without changing their targets;
5. artifacts remain under ignored local-only storage.

TDD evidence:

- RED 1: on live main, the focused test failed because `scripts/classroom-load-smoke.mjs` did not exist;
- RED 2: after the Unicode source replay, 4/5 passed and the standalone test failed because the dedicated suite was not part of `test:release-governance`;
- GREEN: after the minimal package wiring, the dedicated suite passed 5/5;
- governance RED: exact command digest and two frozen command-string contracts rejected the new test command;
- governance GREEN: all three exact contracts were updated without loosening their assertions, and the full suite passed 108 tests with 97 pass, 0 fail, and 11 existing skips.

## Pre-commit verification

- `npm run smoke:classroom-load -- --self-test`: PASS;
- network-denied `sandbox-exec ... --self-test`: PASS;
- no-base, production-host, and mismatched-approved-origin probes: expected exit 1 before network or credential use;
- `npm run test:prod-certification`: 24/24 PASS;
- `npm run type-check`: PASS;
- working and staged `git diff --check`: PASS.

The source branches/worktrees remain unmodified. No real URL, provider, credential, deployment, workflow, Promotion, Shadow, production, or live action was executed. Final clean-commit governance/build verification remains required after this log is committed.

## Cross-review remediation

An independent quality review identified one P1 test-wiring gap and four P2 hardening gaps. The package was repaired in place without touching either historical Classroom source branch:

- the required governance suite now launches the security-heavy `--self-test`, twice concurrently, so the approved-origin, production-host, expected-user, topology, HTTP-error, and artifact assertions are no longer manual-only;
- response bodies are streamed under a 1 MiB ceiling, with a stable fail-closed result on overflow;
- artifact-directory admission now carries the accepted `dev`/`ino` into `writeReport`, which revalidates that inode before lock creation; permissive writable ancestors must be sticky;
- credential/identity sentinels are excluded from the returned report and serialized artifact, and printable CLI failures redact configured cookie, password, username, demo-password, and Vercel bypass values;
- the self-test symlink fixture now uses a unique task-owned temporary directory, avoiding fixed-name concurrency and crash-residue collisions.

Remediation TDD evidence:

- RED: the expanded focused suite ran 9 tests with 3 expected failures: oversized response bodies remained successful, pre-lock directory replacement was not detected, and the redaction helper did not exist;
- GREEN: the expanded focused suite passed 9/9, including two simultaneous `--self-test` subprocesses;
- final required governance: 112 tests, 101 passed, 0 failed, 11 existing skips;
- `node --check scripts/classroom-load-smoke.mjs`: PASS;
- direct `node scripts/classroom-load-smoke.mjs --self-test`: PASS;
- `npm run test:prod-certification`: 24/24 PASS;
- `npm run type-check`: PASS;
- isolated `NEXT_DIST_DIR=.tmp/a22-classroom-unicode-quality-build npm run build`: PASS, including all 202 static-generation entries.

These checks remain local code/test evidence. They do not prove CI, a merged PR, staging behavior, a real classroom load, deployment, provider configuration, production behavior, rollback, or monitoring.
