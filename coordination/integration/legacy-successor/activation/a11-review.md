# A11 independent v4 review — legacy successor activation C1d

- Reviewer identity and session: `/root/a11_pr172_copy_verify` (A11).
- Reviewed at: 2026-09-28T12:39:24.808Z.
- Exact code commit: `3218740bb421d835c22265cf16cb865d4c0f1d70`, whose sole parent is Receipt storage commit `5b1445e32f72156e1effa27ae31c3e08ec4d0fab`.
- Scoped decision: **approved-for-required-check-integration** for this nine-file code release only. `liveAllowed=false`. This does not assert a new GitHub required-check PASS, whole-pack acceptance, merge, deployment, or closure of #172 or #262.

## Source binding and review

A11 independently read all nine C1d Git blobs and working files. Each has mode `100644`; the worktree was clean before and after the exact-head focused test. The sole C1d diff from storage is these nine paths. The SHA-256 of sorted canonical `[path, mode, rawSha256]` rows is `b276144694d56bb969aa29970fb79e9abac131ec71bd36e92377467215abe983`.

| Relative path | Raw SHA-256 |
| --- | --- |
| `.github/workflows/promotion-shadow.yml` | `d926355fc69cb3f29850651af814b99b24d0fcdef229599e33ccda66cc08cccd` |
| `scripts/audit-us-math-item-quality.mjs` | `5015c0dcbb85efee6cf4e077875285df4aa494ee3055fc33525cf77e927fc1a2` |
| `scripts/correction-audit-alias.mjs` | `e67adc5a3b03fd38e47ff84cf5b4190cab523801156de56b3b4bce934c857550` |
| `scripts/correction-audit-alias.test.mjs` | `70b3c5a516343489929bce58668408109b189c929a0f8a49cafed45df62a1119` |
| `scripts/promotion-required-check-legacy-successor-v1.mjs` | `9c288118eb247b72f594b2e4d5089c1c780601a96ce38065f0eaa1d3843a4cd6` |
| `scripts/promotion-required-check-legacy-successor-v1.test.mjs` | `06801406bfca5679bb540d1c1a3245e8f5610b66d79a84cfdfdb731f6867c5da` |
| `scripts/promotion-shadow-workflow-legacy-successor-v1.test.mjs` | `29463256dd1af83b5caf843202d7e56e0eb8b7213a269b8ab1bcb69eca89225b` |
| `scripts/promotion-shadow-workflow-v2.test.mjs` | `b25f95237961612d6e645c096ebfa457074758b04bcd7e8f3c4a18241c50a37c` |
| `scripts/release-governance.test.mjs` | `9b33138536f4a55d9d11096b2473a3c499432300435311b65f56b5d2da9d74ac` |

The corrected Arkansas alias audit uses the new helper only for `acceptedAnswers`. It removes commas only from a whole, conventionally grouped numeric alias and then applies the existing correction parser. Stored answers, multiple-choice options, the candidate pack, the student answer matcher, and the frozen solver were not changed in C1d. Bad grouping and wrong numeric values remain rejected by the focused tests and A11's additional malformed-input probes. The nine-file `CODE_PATHS` includes the current-head audit script and its helper/test, while excluding the frozen solver and public/native checker. Future-path checks continue to reject protected source and workflow changes, plus helper/fixture/setup/support paths disguised as standalone tests.

The activation checker records `auditAuthority` with the old frozen audit SHA-256 `8ce651dee106622caf42b2212de7ee4d78fb05d0c1f41943e977bba9a03212be` and the distinct current-head audit SHA-256 above, scoped to `current-head-ci-only`. The native verifier and Shadow replay still execute the immutable `ff709c0141ef8660604a20340b1c476bf2941f60` source and checker release `611eacd502547cb75355de66e216a3785634f159`. The workflow keeps the old v2 leg conditional and runs its regression suite on the successor leg. The separate `validate` workflow runs the full current-head US math audit. The changed audit bytes are therefore explicit current-head CI authority, not a revision of the frozen Receipt.

## Verification and historical split

On the exact C1d worktree, A11 independently reran the alias, successor, and workflow tests: **12/12 pass, 0 fail**. Earlier in this same nine-file review A11 independently ran the unchanged Promotion suite (**107/107 pass**), release-governance suite (**86 pass, 11 pre-existing skips, 0 fail**), and complete current-head US math audit (exit 0; **0 P0, 0 P1, eight unrelated AR K–G5 P2 distractor findings**). The coordinator's final 12/12 log was separately read back at `/private/tmp/mais-g4-successor-tests-final.log` with SHA-256 `e0aa88d3b22ebd8d5657c0b9a25938cf0d529a4403df3a01396e2817fa217fe8`; that log is coordinator-executed evidence, not an additional A11 run. `git diff --check` passed.

The prior exact-head [#267](https://github.com/HUDongpin/MAIS-MVP/pull/267) check split is historical: Promotion Shadow succeeded with a non-live decision, while required `validate` failed on two P1 audit false positives for valid grouped aliases `38,000` and `38,000 dollars`. The student matcher accepted those answers and A18 verified their mathematical value; the frozen audit parser returned null because it did not parse grouped commas. C1d addresses that current-head audit failure without rewriting #267, its frozen checker, candidate, Receipt, or recorded failed outcome. No C1d/C2d GitHub CI PASS is claimed here.

## Remaining authority and disposition

No internal P0/P1/P2 false-green finding remains in the reviewed nine-file code. The external P1 remains: required GitHub contexts exist, but main protection does not require independent approving reviews or code-owner review and has no ruleset. Reviewer identity strings and candidate-controlled workflow bytes are not an external signature. Repository protection, a fresh marker/review evidence commit, actual exact-head GitHub required checks, and artifact readback remain separate gates. This report authorizes only use of these reviewed bytes as a non-live required-check integration candidate.

This file is A11's source report for byte-for-byte transport to `coordination/integration/legacy-successor/activation/a11-review.md`; the accompanying decision binds its raw SHA-256. A11 wrote only the two assigned primary review files and made no C1d branch, Git, PR, workflow, or historical evidence mutation.
