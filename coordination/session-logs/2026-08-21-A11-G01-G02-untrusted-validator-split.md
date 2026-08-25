# A11 G01/G02 Untrusted/Public Validator Split

- Date: 2026-08-21
- Agent ID: A11, implementation author borrowing the Visualization Lab receipt-test slice
- Worktree: `/Volumes/Starship/MAIS-china-viz-labs-wt`
- Scope: G01/G02 receipt validators, receipt tests, browser source contracts, and the two unreachable browser-tail validator calls only
- Status: candidate implemented and locally verified; fresh DIFFERENT review required

## Objective

Separate caller-verifiable receipt structure from production authority before a
future native dedicated runner exists. Preserve the current hard runner guard,
`authorityAvailable: false`, `execution.complete: false`,
`releaseReady: false`, and `runnerReceiptSha256: null`.

## TDD Evidence

RED was observed before implementation:

- Both new browser source canaries failed because
  `validateG01UntrustedStructuralReceipt` and
  `validateG02UntrustedStructuralReceipt` did not exist.
- A direct behavioral RED over baseline desktop fixtures failed with
  `Missing expected exception` for both G01 and G02, proving the old public
  validators accepted structurally valid caller-sealed receipts.

GREEN:

- The former validation bodies are now exported only as the explicitly named
  untrusted structural helpers.
- Each public production validator first runs the structural helper and then
  always throws native runner authority/physical provenance unavailable.
- Fixtures and mutation tests call only the untrusted structural helpers.
- Public tests reject baseline receipts, exact caller environment JSON plus
  matching SHA, and structurally valid coordinated event-ID reseals.
- Browser source canaries prove the browser producers do not import the
  structural helpers and still call the hard authority assertion before page
  evidence.
- The unreachable browser tails directly call the never-returning public
  validator, matching G07 semantics; attachments remain unreachable.

## Verification

- G01/G02 browser source plus plan matrix: PASS, 117/117.
- G01/G02 receipt and mutation matrix: PASS, 275/275.
- Focused new authority-boundary tests: PASS, 9/9.
- `npm run type-check -- --pretty false`: PASS, exit 0.
- The first repeated `tsx` RED attempt hit host `ENOSPC` while creating its IPC
  socket. Equivalent `node --import tsx --test` execution avoided the IPC
  socket and completed the required matrices without deleting shared files.
- No Playwright browser run, production build, Git operation, network call, or
  database operation was performed.

## Frozen Candidate Hashes

```text
96ebea9bfc798608a93468446be3439a1336ee8805c674fe34b63c933a49cf87  tests/e2e/china-mainland-g01-production-receipt.ts
78342b396638c70d15e65bbb07b17be39a1174a729e2d48949e397cf48efef03  tests/e2e/china-mainland-g01-production-receipt.test.ts
eaa65182e57c48b5e858d5cb41d7c125fdf364682fdf658a8f54cfcc50b9224c  tests/e2e/china-mainland-g01-production-browser-source.test.ts
106110659c0d09ab8951d97858170aecc6359ea37faff36a349d8b5368e7afb5  tests/e2e/china-mainland-g01-production-browser.spec.ts
8f01d86c76e1e489492fe8125b16d13d43cd4ec369facf0841916ab07517f5c2  tests/e2e/china-mainland-g02-production-receipt.ts
ea923395e25b3c79fc4f36a56f1484c03d8724157c07d803f366ff1c65f65c53  tests/e2e/china-mainland-g02-production-receipt.test.ts
d7f073548206b94351d441fbef42fd76157f5135ef7a7bacf12eeb69e26fe688  tests/e2e/china-mainland-g02-production-browser-source.test.ts
5046e4731d10537f72a3f516201fb8e774fd6bcd83ed079fc99dea06d8097268  tests/e2e/china-mainland-g02-production-browser.spec.ts
5836ef5b0f5a60514621463683f0754bdb11a2557b4cc92688dd689269c90e4e  tests/e2e/china-mainland-g01-production-plan.ts
645490037c9bc5963b5923c5dd072b9ab744a48e8d5c0235b2dd8785af974755  tests/e2e/china-mainland-g02-production-plan.ts
85ae5aee75f011967cf2d25cbc342f62d69314e9d925f7f4aa3456fc2cffcca6  next-env.d.ts
```

## Handoff

- Candidate boundary only: this does not create native runner authority and
  does not authorize browser execution, partition release, or catalog release.
- Request a fresh DIFFERENT reviewer against the exact hashes above.
- Do not stage, commit, merge, push, or deploy this candidate without explicit
  owner authorization and the remaining native-runner/release gates.
