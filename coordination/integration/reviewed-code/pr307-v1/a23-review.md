# Independent A23 review — exact PR307 hourly teacher-notice admission

Reviewer: `/root/content_release_review`. Reviewed at `2026-11-02T02:53:54.126Z`. Decision: `approved-for-exact-pr307-required-check`.

I independently reviewed immutable source S `462cf236fc599d332deb77c62bb9bb45b5f65465` and tooling T `b898a6b331a6bc7f0156aad9b71b04007e3767bc`. I did not author either commit. This report approves only the exact ordinary-code required-check admission. All six permissions remain false; this is not content promotion, deployment readiness or live recovery.

## Verified identity and scope

- Source tree: `464ba82371c91a37de03d819e03adc4b8ce389d9`; exact 17-path B→S inventory digest: `ab48a5bc2331532a91558d5f5b2ef9d7bd67bb428286712dd8e5853961469889`.
- Tooling tree: `a08d1ded09caeabe2f60a3efb326381891e550ae`; exact five-path S→T inventory digest: `38026fa8525cb75decf2506696f8b811220b735bebadafb9d8e72d274a019fc5`.
- Source-check raw SHA-256: `62aef65d947cf0e4d7475c695b92974f701f5a66448d02bc3630ce1e78db1894`.
- B is `b56ede5c36f94d7ee8884048ce80e6f1afea8521`; S has exactly B as parent and T has exactly S as parent. No E identity is invented by this review.

I recomputed both inventories from Git, checked the manifest's complete before/after bindings, and read every source path back against S. Source-check JSON and its raw stdout/stderr hashes match the retained producer evidence. The native command/result validator accepts exact strict TypeScript, 98 hourly regressions and 17 unchanged historical activation contract tests. I consumed those source runs as producer evidence rather than claiming I performed their original execution.

## Review findings

1. The new selector accepts only same-repository PR307 at exact B/E or an ordered B/E main merge with E's tree. Source, tooling and seven first-added evidence files are distinct phases. Extra paths, changed base/head, forks, unrelated descendants, stale review bindings, duplicate authority keys, hidden index flags, grafts/replacements and loaded Node hooks remain rejected.
2. Independent reviewer identities are distinct and fixed. Report bytes, review bytes, source/check/tooling identities and timestamps are bound, with reviews after T and before E. All permission fields are closed and false. The gate's result explicitly says historical native execution was not performed; it cannot upgrade local source tests to content promotion.
3. I reconstructed the Promotion workflow exactly from S plus its deterministic selector/mode/two-step additions. Earlier selectors, checks, receipt code and workflow controls remain unchanged. No fallback follows an invalid present PR307 marker, and the new verification step has no continue-on-error.
4. The two-line CI delta changes only the browser-job runner image to ubuntu-24.04. I independently read completed job `125061142878` in run `41377592917`: it ran image ubuntu-26.04 and failed before browser tests when Playwright 1.59.1 rejected chromium on ubuntu26.04-x64. The installed native dependency map contains Ubuntu 22.04/24.04 and no 26.04 entry. Test/event/permission/package controls are unchanged by this compatibility fix; the final browser jobs must still pass on the corrected image.
5. Child execution has an allowlisted environment without provider/health credentials or database URLs, bounded timeouts, private fresh external artifact storage, exact successful test counts/names, no skipped/cancelled/TODO results, and pre/post materialization/currentness verification. No Neon or live-provider execution was performed in this review.
6. The hourly source keeps exactly two aligned jobs and a separate hourly monitor. Its 75-minute age/failure windows and sparse bounded acceptance waits are coherent with hourly delivery; backlog and delayed stale detection remain documented. Actual failed/incomplete/missing/release-mismatched health states and private response/authentication checks remain enforced.

## Independent execution and limits

I ran `node --test --test-reporter=tap scripts/promotion-reviewed-code-pr307.test.mjs` against actual clean T: 45 passed, zero failures/cancellations/skips/TODOs, exit 0, empty stderr. Stdout SHA-256 `30b91dc52ada8f63747999ef623bb4abb100252fa9ffbb261c97cd9d814b5c59`; stderr SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`. The synthetic temporary Git fixtures test fail-closed admission behavior; they are not real candidate approvals. Fresh Git HEAD/status and whitespace checks remained clean after execution.

I additionally validated exact workflow reconstruction, source/check hashes and inventories using the checker pure functions. The managed macOS path can hit the inherited full-tree materialization long-path limit; this report does not waive it or claim final E preflight. Final immutable E and exact PR/main GitHub evidence remain required, including the corrected Linux browser jobs.

No actionable P0/P1/P2 remains in this bounded source/tooling admission. California CA003 closure/currentness and the accumulated production release remain separate tasks. The source's live schedules are not changed by this review or by a green required check.
