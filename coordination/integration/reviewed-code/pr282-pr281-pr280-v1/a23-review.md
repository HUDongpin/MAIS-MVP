# A23 review of the combined PR #282, #281, and #280 package

Status: **pending-independent-review**. I am the same packaging session that wrote the A11 report. Independence is not met. Do not read a green promotion-shadow-gate job as A23 approval or as permission to merge.

Reviewed source `64e2fad979f2a936e8347843fe1952fc1cf059f2` (tree `c792eb31abf1622800d54fd5a36082c318f09889`), tooling `f88aaaecfa74f5688df019ee4a7906108865cdc7` (tree `97ef75f38cf5afc2e47ee6bf01062b0c44ba5edb`), tooling digest `b0bce222b72a2e72819302dae0bb1ae9e44544bd003513f30aedca2412d31c81`, observation `3859d94c9dfa795d7c53bc7420f254965f37bf8a474a802786d3da0ec37e47a0`, checks `6de19a576536f7f71e99ddada6a7858258c1c2e1ec17139f901914b4e6d213d4`.

## Promotion boundary

The decision scope is `exact-pr282-pr281-pr280-pending-independent-review` and the decision result is `pending`. Every permission is false:

- ordinaryCodeEligible
- liveAllowed
- integrationAllowed
- previewAllowed
- deployAllowed
- wholePackAccepted
- historicalAuthorityTransferred

The checker rejects `approved-for-ordinary-code-required-check`, rejects `ordinaryCodeEligible: true`, and rejects `deployAllowed: true`. Evidence commit E must be the only addition of the seven evidence files, and HEAD must equal E's full tree.

## Gate shape

The new mode is selected only when `coordination/integration/reviewed-code/pr282-pr281-pr280-v1/admission.json` is present, and it is selected before the PR #276 v3 marker. An invalid present marker exits. It does not fall through to v3. I compared the workflow with main `fd2138127bdfe56981835c754c8bf944eabe7fb2`: the job name, triggers, permissions, and environment are unchanged, and every previous step other than the selector is still present with the same body. No step sets `continue-on-error`. The historical proof is still the isolated non-live base `03717842b19e8b8fa9a3a2dbecf1b359bb842233` and the unchanged legacy evaluator. Prior admission directories and checkers are byte-pinned to main.

This is ordinary application code plus tests and CI wiring. It is not a candidate content pack. The runtime observation covers 3,893 files under `app`, `components`, `data`, `lib`, and `public`, five more than the PR #276 v3 tree, which are the new demo-seed and auth-funnel modules and tests. Canonical legacy audit bytes are part of that observation and are not retargeted.

## Source disposition

#282 stops new stable-id demo seed writes on every non-empty `VERCEL_ENV`, including preview, unless `MAIS_DEMO_SEED_BACKFILL` is exactly `1` or `true`. Already stored rows are retained. That is not a production SQL edit and not a content promotion.

#281 makes the signup funnel beacon able to open its SQLite file. On Vercel that file is ephemeral `/tmp`. Counters are lost on each deploy and each cold instance. Durability is issue #284, which is not in this tree. Do not smoke-test the funnel against a preview: previews share the production database, and this package authorizes no database write.

#280 aligns dashboard and progress attempt totals on the merged projection. I am not promoting that read path to a live schema change. No production database edit is included.

## Binding

Leave #282, #281, and #280 unmerged. Do not merge PR #283 while these reviews are pending. Squash and rebase would not match this ancestry even after a later independent approval. A later approval has to be a new evidence commit bound to new report bytes, not an edit of these pending files.
