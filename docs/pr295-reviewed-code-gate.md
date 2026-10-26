# Exact PR #295 teacher-notice schedule admission

This contract admits one ancestry-preserving merge of PR #295 onto reviewed
main. It is the admission pull request #296, in the same bounded shape as
PR #272 and PR #283, inserted ahead of the PR #293 selector the way later
admissions extend the shadow gate. It is not a probe-criteria change, a
deploy, or a production-database write.

PR #295 head `50f323b0ee86437490ffbe2267fdd2f9709ab5de` has parent
`fbc0f7e53bf95d534d7665d2d7c4dc621556315d`, whose parent is main
`63b02c4ec6a4415af0056313e8ad384bf4b61ee1`. Those two commits change only
`.github/workflows/teacher-notice-health-monitor.yml` and
`scripts/monitor-teacher-notice-health.test.mjs`. The cron is `7 * * * *`
while #273 is open. Restore `3-59/5 * * * *` after #273 closes.
`scripts/monitor-teacher-notice-health.mjs` stays blob
`34d8b50957af26e9bfdef6f343117b6bea4db0b4`.

Source S `a7b7d104f2dfc93e8ab5282b5e90586e123f452c` has ordered parents
[main, PR #295 head] and tree `a155bf47370adee1fcd4c2ad00d50d15ea4e2bb9`,
the same tree as the reviewed head. No squash and no rebase. The inventory
digest is `c17f40a337ae7c18511bc1445616a1b3c50471ed9caeae9fcb7e801aa98711e5`.

A direct tooling child contains only this document, the new checker, its
tests, and the exact additive workflow insertion. A direct evidence child
contains seven new records: source inventory, local check counts, the two
pending review decisions, the two pending reports, and admission. Current
HEAD must be that evidence commit. Its full tree is the only admitted tree.
The post-merge check accepts only a main merge whose ordered parents are
[base, evidence] and whose tree equals the evidence tree.

The packaged A11 and A23 reports are pending placeholders from the packaging
session. Their identities are `pending-independent-a11` and
`pending-independent-a23`, and their result is `pending-independent-review`.
The checker rejects `approved-for-ordinary-code-required-check`. Independent
reviewers must still inspect S and the tooling commit and bind any later
decision in a new evidence commit. Editing these reports in place fails closed.

Current verification materializes the tree, runs the 22 contract tests, and
reruns the 7 teacher-notice monitor tests. The monitor script's pass/fail
criteria are untouched. The decision result stays `pending`. Ordinary-code
eligibility, live promotion, integration, preview, deploy, whole-pack
acceptance, and historical authority transfer all stay false.
