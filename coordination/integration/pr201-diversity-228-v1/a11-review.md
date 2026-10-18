# A11 review — PR201 additive 228-row candidate

Result: **approved-for-nonlive-candidate-admission**. No blocking findings in the exact reviewed source commit.

- Reviewer: `/root/pr201_minimal_consumer_review`
- Reviewed at: `2026-10-18T12:52:17Z`
- Source commit: `2288c5efff2469108d61f84e7598246f0b9fe19d`
- Source tree: `db8b41ba09a2a33d4148496418be480b41b9906a`
- Sole parent: `656ac319b2ad5812d31ad952cbb18430b5e58065`
- Source inventory digest: `86401681cc60d04fee55029f67196367b54afae737c3e129a73d70b790e4c878`
- Source bytes digest: `c5ff21480db96707f450286b59c231ebe9747531970b3520a1fe8d63ee1ccc35`
- Exact delta: 21 paths, matching the previously reviewed local slice.

I independently verified the real commit, parent, tree, complete change inventory, source digest, frozen artifact hashes and local inspection result. The committed bytes match the previously reviewed and tested local slice. A component-relative, no-symlink read verified all 11,699 materialized tracked files against their committed Git blob hashes and executable modes.

The 228-row file and 12 frozen A18 evidence files were previously compared byte-for-byte with the original reviewed candidate; the unchanged source digest preserves that result. The original 1500-row package, q014=38000, Arkansas runtime loaders/topics, shared types and existing candidate-isolation/grading tests remain unchanged. The exact 228-ID/hash mapping and unchanged 1272-row mask are enforced. No unreviewed whole-pack or Chinese translation approval is inferred.

The reviewed local evidence is: 17/17 new contract tests, 55/55 prior contract tests, 2/2 grading tests including 1,281 historical cases for all 228 rows, 3/3 existing service-isolation/q018/q014 tests, and successful type-check. These checks retain positive and negative behavior assertions; no constraints were removed or relaxed. Repeating unchanged tests was unnecessary after exact committed-byte verification.

The new gate rejects absent or malformed admission, binds real source/evidence ancestry and review identities, and requires current tests plus fresh observation before formal CI acceptance. Its observation permits exactly one additional unreachable data file while preserving the other runtime policy and canonical audit. Synthetic missing-admission tests do not assume that the actual repository must remain admission-free.

Local limitation: the existing absolute-path `assertMaterializedTree` helper encountered macOS `ENAMETOOLONG` on a pre-existing deeply nested historical evidence path. The independent component-relative verification above established materialized-byte integrity without changing files or weakening checks. This report does not claim that local formal preflight completed, and the configured Linux CI must still execute its actual checks.

This approval establishes eligibility for the new non-live candidate admission gate against the exact source commit. It does not establish completed remote CI or a completed Shadow run, and it grants no merge, deployment, live-content, whole-pack acceptance or historical-authority transfer permission.
