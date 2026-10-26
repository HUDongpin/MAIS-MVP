# Pending A11 placeholder for the PR #295 schedule admission

Reviewer: pending-independent-a11
Result: pending-independent-review
Reviewed at: 2026-10-26T01:55:04.195Z

This file is a hash-bound placeholder written by the packaging session that built admission pull request #296. It is not an independent A11 approval. An independent A11 reviewer must still inspect source S and tooling T. Replacing this report requires a new evidence commit. The checker rejects approved-for-ordinary-code-required-check on this sealed package.

The regression question is whether the hourly cron and its test assertion are the only product delta, and whether the monitor suite still passes. This placeholder records that question. It does not answer it as an independent reviewer.

## Pinned bytes

- Admission pull request: 296
- Source pull request: 295
- Base: 63b02c4ec6a4415af0056313e8ad384bf4b61ee1
- Reviewed head: 50f323b0ee86437490ffbe2267fdd2f9709ab5de
- Reviewed parent: fbc0f7e53bf95d534d7665d2d7c4dc621556315d
- Source S: a7b7d104f2dfc93e8ab5282b5e90586e123f452c
- Source tree: a155bf47370adee1fcd4c2ad00d50d15ea4e2bb9
- Source inventory SHA-256: c17f40a337ae7c18511bc1445616a1b3c50471ed9caeae9fcb7e801aa98711e5
- Tooling T: cd5eedb77f6cabb9ca627a38d15fce7713dbc84d
- Tooling tree: f676edca97330fafdb31b7315c097e64b4202395
- Tooling inventory SHA-256: a333ef913eb7fd6ed16378e087018b2b12242fd121dd56f1511918135ca16a00
- Probe blob: 34d8b50957af26e9bfdef6f343117b6bea4db0b4
- Schedule: 7 * * * *
- source-checks.json raw SHA-256: af708ee467b49334ae97301ced2ccb468f06987de4f2f243c41e9a6c27d245b6

| Tooling file | Raw SHA-256 |
| --- | --- |
| .github/workflows/promotion-shadow.yml | b29ce1407044903299dcea0505832f5b13df700f984b897a14c022f0e62e23a6 |
| docs/pr295-reviewed-code-gate.md | ac7c9681cdfd0e3cd3495bdc5558066e246c42aa06cc203f2c9bd3effb85ce67 |
| scripts/promotion-reviewed-code-pr295.mjs | fdeb98d0b87ce6aade5541c5d968c7b1d4b616cccf7f0229b91de8510454de38 |
| scripts/promotion-reviewed-code-pr295.test.mjs | 9faf096b5735bef236859daacba123f02580823c9e99efd83b3bc2e97d062873 |

## Local commands already run by the packaging session

- Contract tests: 22 passed, 0 failed. The checker reruns them.
- Monitor tests: 7 passed, 0 failed. The checker reruns them.
- Probe pass/fail criteria were not edited. The probe blob matches base, source, and the reviewed head.

liveAllowed is false. ordinaryCodeEligible is false. Merge, preview, deploy, and production database writes stay unauthorized.
