# Evidence E2 for the independent PR #295 reviews

E2 binds the independent A11 and A23 reports that were delivered as pull-request
comments so evidence commit E could keep its tree. Source S
`a7b7d104f2dfc93e8ab5282b5e90586e123f452c` stays the ancestry-preserving merge
of PR #295. The pending checker, its tests, and its gate note stay byte-for-byte
the tooling committed in `cd5eedb77f6cabb9ca627a38d15fce7713dbc84d`.

E `bead6e80cc82f916ee3801581031bd5df9954eac` remains the unique addition of the
pending admission and the parent of this tooling release. Its sealed reviews
stay `pending-independent-review` in that commit. E2 replaces the in-tree
placeholders with the comment bytes and copies those same bytes into
`coordination/integration/reviewed-code/pr295-e2/`. The v1 admission changes
only the four review hashes.

A11 `independent-a11-pr296` approved `approved-for-ordinary-code-required-check`.
A23 `/root/a23_pr296_review` approved `approved-for-later-ordinary-code-admission`
and withheld ordinary-code eligibility. `liveAllowed` stays false. Merge,
preview, deploy, and production-database writes stay unauthorized. The health
probe blob stays `34d8b50957af26e9bfdef6f343117b6bea4db0b4`.

HEAD must be E2. Its tree is the only tree this contract admits. A later main
merge passes only with ordered parents [base, E2] and that same tree.
