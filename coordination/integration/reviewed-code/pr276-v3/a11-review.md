# Independent A11 review of exact PR276/PR277 composition

Reviewer: /root/a11_pr276_review. Reviewed at 2026-10-18T15:23:51.974Z.

Decision: approved for ordinary-code required-check eligibility only for the exact C/T3 composition below. New E3 and merge acceptance still require native Linux CI, the current-tree proofs and the unchanged historical verification/Shadow. Neither parent's previous admission is treated as a combined-tree pass.

- Main base M277: 39cb64c9d9719ec39c8b4c244bc8d6818ee6a87d; tree 580f3fa6e4aa6970406bb41e949e3d002ac8a1f0.
- Homepage E2: b8cecebf0fe9d6e296d24af6007f850f92fba4bd; tree 14bd331c869cead154e1900e7d00e58fd3ea57d6.
- Combined source C: b8bba0fc661affd4ee0a71acd341280a2ab38cc4; tree d40dfd26310497a7cd118887a11dded04f99fc6e; exact ordered parents E2 then M277.
- Tooling T3: ffc99bcfedd7d5a017d130eec58e3becc2978a26; tree 4ee988298c4f4e620c840807847ebf7ed6ba9de2; sole parent C.
- M277-to-C source inventory digest: 0a2677b019c733ed24e2b134a34c840b11f147c230763e3fc48ab98c68a02290
- Tooling digest: d38fba246ff277f36fdb6dd7e85792ed623d4e68961d3be1e8b3d5c4dbf2148d
- Fresh combined observation SHA-256: 90408097b338eebafb1378c71ded0a402cd973e43b131eab408dde3c90c48e2f
- Source-checks SHA-256: fa11f4e9c180829634386db372ed7cf946b1fef4300ec921bfd579b24db903a0

I reviewed the exact source union and T3 change. The workflow is the only overlapping parent path; all non-workflow files are exact byte/mode/blob selections from their originating parent. The homepage and selected PNG are unchanged from E2, while the PR201 package stays a non-live candidate. All 29 preserved bindings match C at T3. Both earlier PR276 source-checks and A11 report/decision files remain byte-identical to their committed versions.

T3 changes exactly four tooling paths. Its new marker/event/parent/tree/evidence bindings remain specific to PR276 against M277. Invalid present markers fail without fallback. Existing source contracts and workflow legs are preserved. New tests exercise combined-parent rejection, candidate content preservation, policy reachability rejection, actual shell-selector failure, pinned historical-fetch wiring, frozen-main execution, and the real Playwright path guard. The browser environment now uses the unmodified commandEnvironment function and has neither NODE_ENV nor HK_MATH_DB_PATH; candidate regressions alone receive the isolated SQLite settings.

Fresh independent execution:

- At T3, all six contract suites passed 119/119, with zero failures/skips/cancellations, 2026-10-18T15:11:14.676Z to 2026-10-18T15:15:24.300Z.
- At the separate clean M277 snapshot (/Volumes/Starship/MAIS-MVP/.tmp/a11-pr276-t3-tmp-01a14e6c/pr277-main), the complete unchanged PR201 contract suite passed 22/22. Its real-root scope assertion was not filtered or weakened.
- On current T3, the unchanged grading regression passed both tests, replaying all 1,281 historical cases for all 228 reviewed rows and testing the q018 year aliases/bare-time rejection.
- On current T3, all three original candidate-unreachability/q018/q014 scale tests passed.
- Current nonincremental TypeScript passed.
- The original browser command performed one fresh isolated production build and passed all 31 unchanged homepage cases on their first attempt, with zero skips/retries/flaky/unexpected results, 2026-10-18T15:17:28.581Z to 2026-10-18T15:20:00.264Z. V3 verifyTestRecords and verifyBrowserReport accepted all five command records and raw output bytes.

The unchanged validateContent function verified the 228/1,272 split, A18 hashes, original bank and q014=38000. A new observation was computed at T3: 3,888 covered files versus 3,887 at E2. The unchanged candidate observation guard accepted exactly the one-file non-live addition and unchanged reachability/canonical-audit boundaries. Its bytes match the newly frozen 90408097... observation; the old observation was not reused.

Before and after execution, independent descriptor-relative O_NOFOLLOW traversal verified every regular tracked file's mode and Git blob: 11,734 files at T3 and 11,709 at M277. Both complete inventories were identical before/after; all index flags were H, both roots clean and both HEADs unchanged. Owned port 3396 had no listener after Playwright completed. The native full-tree materialization attempts for both roots encountered macOS ENAMETOOLONG; raw errors and timestamps are retained. These local fd proofs do not replace native Linux CI. Native historical-manifest reading and observation at the current root succeeded.

The original v1 Linux run 39130914904 remains recorded as 28/31 with three phone-spacing failures. I independently read back retained E2 gate 39135396635: its 31-case browser proof, command hashes, current-proof hash and decision digest bind E2 and pass. That is E2-only evidence. The earlier preliminary React 418 remains unexplained and is not claimed fixed. The pre-freeze v3 23/24 negative-fixture failure is retained, and the frozen 119-case run is separate fresh evidence. Any new recurrence or Linux failure must remain a blocker; no suppression or retry-based acceptance is authorized.

Raw logs, exact command arguments/environments/working directories/timestamps/hashes, both roots' inventories, preserved bindings, content and observation proofs, and retained-history references are under /private/tmp/pr276-a11-review/frozen-T3 and bound by source-checks.json. No E3, fabricated formal current proof, or A23 decision was created by this reviewer.

Permissions: ordinaryCodeEligible=true; mergeAllowed=false; liveAllowed=false; integrationAllowed=false; previewAllowed=false; deployAllowed=false; wholePackAccepted=false; historicalAuthorityTransferred=false.
