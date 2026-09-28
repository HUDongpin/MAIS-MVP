# A11 independent v3 review — legacy successor activation C1c

- Actual reviewer identity/session: `/root/a11_pr172_copy_verify` (A11).
- Reviewed UTC: 2026-09-28T12:04:50.660Z.
- Exact code freeze: `e8233d9215d048d9aea9b708613cbda1692351a0`, direct child of Receipt storage commit `5b1445e32f72156e1effa27ae31c3e08ec4d0fab`.
- Verdict: **approved-for-required-check-integration** for the reviewed six-file **code candidate only**. This is not a new GitHub required-check PASS, live promotion, merge, deployment, whole-pack QA acceptance or old #172/#262 closure.

## Git source binding

A11 independently read C1c Git blobs, working bytes and modes. All six are regular `100644` files. The SHA-256 of sorted stable `[path, mode, rawSha256]` rows is `0eeca0605843eabe72ec424ac1fc3fdd9b99bf9e10132c1ff3acf5179ccaf74b`. C1c has exactly one parent, `5b1445e32f72156e1effa27ae31c3e08ec4d0fab`, and its diff contains exactly these six paths:

| Exact relative path | Raw SHA-256 |
| --- | --- |
| `.github/workflows/promotion-shadow.yml` | `c6912ec7afc23a6377d1a81f76998a4d9c10d890c9ee2862a45e74ba3037859c` |
| `scripts/promotion-required-check-legacy-successor-v1.mjs` | `436a1bafdc31fab8e875d5f424a3a3a7bd6dd6d7d6d7ccbd09c07c31cbef221b` |
| `scripts/promotion-required-check-legacy-successor-v1.test.mjs` | `f7fb6f6fde1be9f2b657d70e9bc2f5afb3de99b87797154118ed44b8f3f45574` |
| `scripts/promotion-shadow-workflow-legacy-successor-v1.test.mjs` | `b0b130d554742780f760486ff5132d5f7f45ada45acded56d49ab3aa7e980d57` |
| `scripts/promotion-shadow-workflow-v2.test.mjs` | `b25f95237961612d6e645c096ebfa457074758b04bcd7e8f3c4a18241c50a37c` |
| `scripts/release-governance.test.mjs` | `9b33138536f4a55d9d11096b2473a3c499432300435311b65f56b5d2da9d74ac` |

The already reviewed successor workflow and two workflow test files retain their prior exact bytes. The release-governance test updates three v2-only workflow conditions to match the actual conditional v2 leg; the required-check script includes that test in its six-file `CODE_PATHS`. The separate required `validate` workflow runs `npm run test:release-governance`; code inclusion and test execution are distinct facts.

The final future-path rule allows standalone `tests/**` files with a `.test` or `.spec` basename and explicit script extension. It rejects helper, fixture, setup and support prefixes on every path segment after stripping leading underscores, without regard to case. A11's independent pure probes accepted four ordinary test paths and rejected twelve concrete non-standalone/role-prefix cases, including camelCase, capitalized and underscore-wrapped paths. This is a syntactic gate; a filename cannot prove semantic independence. Current-head policy and legacy observations and protected-path/mode checks remain in the reviewed checker.

## Independent and coordinator test evidence

A11 independently ran the focused successor tests in an owned isolated temporary directory: **10/10 PASS**, no failures/skips. Log `/private/tmp/mais-a11-activation-v3final-2tF0FF/new-tests.log`, raw SHA-256 `0f98ed8efc0c38c00667150881704df8699b4fa60bc0cdeb09b7693bcec13a57`. A11 also ran the read-only release-governance workflow assertion: **1/1 PASS**; log `/private/tmp/mais-a11-activation-v3final-2tF0FF/release-governance-targeted.log`, SHA-256 `b255d25779d642f468184d66ea40b731270393655366e22dbed85cd688b88d85`. JavaScript syntax checks and `git diff --check` passed before the C1c commit; the committed Git bytes above were re-read independently. Earlier A11 v3 probes and their logs remain historical, with former candidate digests superseded.

The previous #265 GitHub run failed at a local fixture/RUNNER_TEMP mismatch before native evaluation; the one-line correction was reviewed in C1b. The next activation C2b was associated with draft [#266](https://github.com/HUDongpin/MAIS-MVP/pull/266). A11's read-only GitHub status snapshot on 2026-09-28 showed that old head `e13ddc1cf162e8b699d7eda7b89668585a0e278f` had **promotion-shadow-gate SUCCESS** and required **validate FAILURE**. That split result belongs to historical #266/C2b; it neither satisfies overall required checks nor proves C1c passed GitHub CI. No C1c/C2c global PASS is claimed.

## Outstanding controls and disposition

**External P1 remains open.** A11 read the main-branch protection through GitHub's read-only API on 2026-09-28: required contexts are `validate` and `promotion-shadow-gate`, but required approving review count is 0, code-owner review is disabled, and repository rulesets are empty. PR-supplied workflow code can be changed by a sufficiently authorized writer while preserving the job name; reviewer identity strings and hashes within that same candidate workflow are not an external signature. Independently authored A11/A23 reports need out-of-band raw-byte readback, and owner action on repository protection is separate from this code decision.

**Actual v3 CI is pending.** A future C2c marker must bind this six-file digest and fresh independent A11/A23 review reports. The actual GitHub required checks, artifact chain, runner capacity and exact head must then be inspected. Prior local attempt-009 validate, non-live Shadow, Receipt storage and replay remain exact-source historical PASS, while #265 and #266 outcomes remain their actual separate CI results. `liveAllowed=false` throughout this review. No #172 closure, #262 merge or deployment is inferred.

This A11 report is the source for a byte-for-byte copy to `coordination/integration/legacy-successor/activation/a11-review.md`; its raw SHA-256 is bound by the accompanying decision JSON. A11 wrote only the two assigned primary review files and did not modify C1c, Git refs, the workflow, PRs, installed skills or historical evidence.
