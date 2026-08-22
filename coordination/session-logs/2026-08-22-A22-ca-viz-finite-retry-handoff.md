# A22 California visualization finite retry handoff

## Scope and evidence boundary

- Lane: A22 production reliability, with owner-authorized A10/A11-adjacent runner and contract changes limited to the California visualization acceptance slice.
- No Git operation was performed.
- This handoff note was written after the formal frozen source snapshot and is not a member of source snapshot `f150c764faad704edd88f39252df983f7c1e4daba6f613e555a59d3cd9af00ea`.

## Implemented boundary repair

- Added one formal product-root resolver so composed collection reads source oracles from the frozen product tree while execution remains in the instrumented staging tree.
- Propagated `CA_SIGNATURE_PRODUCT_PROJECT_ROOT` only to Layer B; Layer A and ambient process state remain scrubbed.
- Added focused runner-environment and formal composed-collection regressions.

## Non-browser validation

- Focused RED reproduced the missing Layer B product-root binding and 56 staging-root source-oracle mismatches.
- Focused GREEN passed after the repair.
- Runner suite: 50/50 passed.
- Composed-staging suite: 6/6 passed.
- Type-check passed.
- Signature-lab retained run: 192 math audits plus 6 contracts passed and sealed.
- Source/provider suite: 44/45 passed; the remaining environment-only test could not create a browser process because its bundled Chromium executable was absent.

## Formal measured execution

- Run root: `/Volumes/Starship/MAIS-ca-viz-labs-wt/.tmp/ca-viz-measured-exhaustive-20260822-boundaryfix-93c7a18f12a1052c95619863a5fc7780`.
- One source-bound request and one owner-delegated Ed25519 receipt were validated before launch.
- One new durable consumption leaf was created before one exhaustive-only Playwright invocation with `desktop-chrome` and `mobile-chrome`, workers 1, retries 0, repeatEach 1.
- Playwright collected the exact 102 identities. Each project failed its first package before a page or browser context existed because system Chrome closed immediately after process launch; the remaining 100 identities were skipped.
- Result: 0 passed, 2 failed, 100 skipped. No producer-success receipt, 102-artifact terminal manifest, or terminal seal exists.
- The Layer B server stopped, port 43142 is free, and no run-owned Chrome/Playwright/server process remains.
- No second browser invocation was attempted.

## Authorization ledger closeout

- The old consumed receipt was archived with a same-byte evidence record.
- Post-run ledger inventory was observed as exactly anchor plus old and new consumption leaves.
- The single owner-authorized exact ledger verifier confirmed the physical 0700 root, exact three-name inventory, canonical 0600 anchor, exact anchor SHA, and exact request SHA. It then stopped on an over-strict verifier assumption that the valid pretty-printed request had to be compact single-line JSON, before externally rereading either consumption leaf.
- No second ledger verifier was run. New-leaf byte/schema/SHA verification therefore remains incomplete despite the runner's held-FD durable write having succeeded before Chrome launch.

## Resume boundary

Do not reuse the consumed receipt or rerun Chrome. A future attempt requires separate owner authorization to diagnose and fix the system-Chrome/CDP launch boundary outside the production ledger, then a fresh source-bound request, a fresh owner-delegated receipt, one new consumption, one new exhaustive-only dual-project invocation, and a renewed allowance for one corrected post-run exact ledger verifier.
