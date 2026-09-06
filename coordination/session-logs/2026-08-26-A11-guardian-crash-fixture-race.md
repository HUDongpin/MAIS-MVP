# 2026-08-26 A11 — guardian-crash fixture readiness race

## Scope

- Owner lane: A11 QA/regression, with A22 release-gate coordination.
- Exact source baseline: `6224e66f2145a053d99d328cd3e4c1aef8961654`.
- Write scope:
  - `tests/e2e/isolated-app-preflight.test.ts`
  - this session log

## Failure evidence

- Exact-main CI run `32969624300` failed parent-console test 395 while the other 399 tests passed.
- The failing fixture asserted that the process group exited after SIGTERM, but it only proved that the stopped/resumed supervisor existed. Under runner scheduling pressure, the real child could start after SIGTERM and therefore miss the signal.
- The same exact test passed locally before the change, confirming that the failure was scheduling-sensitive rather than a deterministic product assertion.

## Change

- The fixture app now writes a test-owned readiness marker after the real child starts.
- The guardian-crash scenario waits for that marker before killing the guardian and later signaling the app group.
- The safety assertion is unchanged: a live app group must retain the durable lease and fail closed after guardian loss.

## Verification

- Focused regression repeated 10 times: 10 passed, 0 failed.
- `npm run test:parent-console`: 400 passed, 0 failed, 0 skipped.
- `git diff --check`: passed.

## Release boundary

- This slice changes only a regression fixture and its handoff record; it does not change parent runtime behavior.
- Production schema preflight and deployment remain blocked until this slice is reviewed, merged, and the resulting exact-main CI and Promotion checks are green.
