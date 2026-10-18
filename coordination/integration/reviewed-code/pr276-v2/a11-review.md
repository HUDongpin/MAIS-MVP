# Independent A11 review of PR276 v2 frozen source and tooling

Reviewer: /root/a11_pr276_review. Reviewed at 2026-10-18T14:11:52.754Z.

Decision: approved for ordinary-code required-check eligibility only for exact S2/T2 below. Final E2 and merge must pass native Linux CI, current-head browser checks and the unchanged historical verification/Shadow. No deployment or content-promotion authority is granted by this review.

- PR base B: 656ac319b2ad5812d31ad952cbb18430b5e58065
- First-attempt E1 / repair parent: 5303de58d090b62967e45ec09d11fe331263f628
- S2: 9938db3f952d6715bca9fbe732da82a184f845df; tree 677eb4bd7bd50febd15c75638d8465dbe1f3fe02; sole parent E1.
- T2: 2920e9fcab4c01b42d7dbc525ed5f0e5d1356b77; tree 04f72c6dbfe6b4ee45d98cc9894167403a37f327; sole parent S2.
- Repair inventory digest: 06f8cce914143b162d190a2d86837d2ce0bb7d894801dd85b8cf9a6871486c1d
- Tooling digest: 5eef354b755027a34e248e919449e162e3df6cdda090e3619bd43ba35dd6a59d
- Fresh observation SHA-256: bb0d964567026e41f29dfd8d747ae2c3f971900a2f32ac5a1ba0694f8c4d3766
- Source-checks SHA-256: 646c609810fdaa0870f83c5dbed364b00dc443457895c408964552b2b8acdefe

The retained Linux run 39130914904 tested E1 and passed 28 browser cases while failing three English phone photo/headline separation assertions. Its original browser report SHA-256 is 03a0850fcb44749a39887ae1e54c620ef4b84a0f12b059664bd50d0ebc5cdb4e. These failures are preserved as failures. V1 source-checks and review bytes were independently compared with E1 and remain unchanged.

S2 adds exactly five CSS lines to the hero component: in the existing max-width 639px rule, the photo bottom becomes 13rem. This reserves another 16px at the observed root size, accommodating the additional English line without moving the brand, descriptor, headline or CTA. The selected PNG, all wording/font/button classes and the 640px-and-wider behavior remain unchanged. I inspected the actual source diff, recomputed its inventory, and inspected the six-size browser-style diagnostic and its 390px screenshot. That preliminary diagnostic is not repaired-source or Linux acceptance.

T2 changes exactly four tooling files. I reviewed its separate v2 marker precedence, direct E1/S2/T2/E2 ancestry, exact source and image binding, candidate-to-E2 tree equality, new review/evidence hashes, preserved v1 and older controls, and mandatory final verification. All 18 preserved bindings independently match E1. The original 31-case spec and its 7px thresholds are byte-identical; no assertions, retries or error checks were weakened. No open confirmed code or contract defect remains from this review.

Fresh independent execution used the detached, clean external clone at /Volumes/Starship/MAIS-MVP/.tmp/pr276-v2-verification-01a14e6c:

- All five contract suites: 94/94 passed, zero failures/skips/cancellations, 2026-10-18T14:02:29.683Z to 2026-10-18T14:04:32.353Z.
- Original nonincremental TypeScript command: exit 0, 2026-10-18T14:04:32.356Z to 2026-10-18T14:05:13.175Z.
- Original browser command: one fresh isolated production build followed by 31/31 first-attempt passing cases, zero skips/retries/flaky/unexpected results, 2026-10-18T14:06:14.523Z to 2026-10-18T14:09:01.524Z. Production verifyTestRecords and verifyBrowserReport accepted the raw output.
- Mac measurements show photo.bottom=549px at English 320px width and 581px at English 390px width. These confirm the intended CSS effect locally, not Linux font parity.
- Native reading of the historical manifest and the unchanged observePreparation function succeeded in this external clone. Fresh observation and canonical audit equal the frozen values.
- Before and after, all 11,694 tracked regular files, modes and Git blob hashes matched T2 using descriptor-relative O_NOFOLLOW reads; index flags were all H, HEAD unchanged, Git status clean, and complete inventory digests identical. Owned port 3396 had no listener after the command completed.

The full native absolute-path materialization helper still failed with macOS ENAMETOOLONG; its raw error and timestamps are retained. The local descriptor-relative byte proof does not replace native Linux CI. Unlike the first worktree's earlier observation attempt, this T2 run did not need a descriptor-relative historical-manifest fallback. Prepared fallback scripts were not executed.

The earlier preliminary React418 host-node hydration mismatch remains preserved and unexplained. It was not reproduced in the bounded 60-context diagnostic, v1 fresh local checks or this fresh T2 run. I do not claim it fixed. No suppression or retry-based acceptance is authorized; a recurrence in required CI must fail and be diagnosed.

Current local verification is sufficient for this bounded ordinary-code review, while Linux acceptance of the repaired phone gap remains pending. Raw logs, commands, timestamps, hashes, execution scripts, inventories, 18 preserved bindings and observation receipts are retained under /private/tmp/pr276-a11-review/frozen-T2 and bound by source-checks.json. This reviewer authored only the A11 decision.

Permissions: ordinaryCodeEligible=true; liveAllowed=false; integrationAllowed=false; previewAllowed=false; deployAllowed=false; wholePackAccepted=false; historicalAuthorityTransferred=false.
