# A11 review — historical-source fetch revision

Result: **approved-for-nonlive-candidate-admission**. No blocking findings in the exact four-file repair.

- Reviewer: `/root/pr201_minimal_consumer_review`
- Reviewed at: `2026-10-18T13:16:40Z`
- Source commit S2: `e7cc0a52a7e8ef50d94f631936e7b8f58bdbda5d`
- Source tree: `c8513cf4cf15529820969bfc176707814471be98`
- Sole parent E1: `ac9260368713c2ab364dedd5508c07fa6fc3b91d`
- Source inventory digest: `2bb95fd61f67994da92bf1aa489d4ea6ae3cbaebbded32a1949aa547800ee1f2`
- Source bytes digest: `5feb321e93f51458cc48ba98eb59156de31384bab959586c4a8b63c16f333612`

I independently read back the actual commit, sole parent, tree, clean working state and exact four-path inventory. The committed source digest matches the reviewed local revision. The only changes are the Promotion workflow, the PR201 checker, its contract test and its explanatory document. Original data, A18 evidence, E1 admission/reviews and historical checkers remain unchanged.

The workflow fetches the retained public PR262 head before historical native evaluation. It requires the fetched tip to equal `fc6c24446659c54f92482cffd2de6e180bbb03c2`, verifies the commit and four required blobs, and fails on fetch errors, a moved ref or missing objects. It supplies no token, disables credential helpers and applies no depth or blob filtering. The unchanged native ancestry/hash verification remains mandatory; successful retrieval is not substituted for that verification.

The v2 contract pins E1 as predecessor, restricts S2 to exactly four paths and requires a new five-file evidence/admission namespace. It rejects old admission fallback, wrong predecessor, an extra source path, stale review binding and elevated permissions. Historical native evaluate, finalization and always-run enforcement steps remain intact.

I read the final local results: 22/22 revision contract tests and 3/3 prior-workflow preservation tests, with zero failures, skipped tests or cancellations. These include executed shell positive/negative cases and synthetic real-Git ancestry tests, rather than only string assertions. No unchanged 228-row content QA was repeated.

The first Linux attempt's current proof remains preserved with contract, grading, isolation and types all at exit zero, alongside its historical `SUCCESSOR_GIT_PROOF_FAILED` receipt. That failure has not been rewritten or counted as a successful historical verification.

This approval establishes eligibility to execute the revised non-live admission gate for this exact S2. The final Linux CI and native historical verification are still pending. No merge, deployment, student access, whole-pack acceptance or historical-authority transfer permission is granted.
