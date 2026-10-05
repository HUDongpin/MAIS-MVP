reviewerIdentity: /root/a23_pr270_pr271_review
reviewedAt: 2026-10-05T02:06:23.000Z
decision: approved-for-ordinary-code-required-check

A23 ordinary-code admission review for the combined PR #270 and PR #271 required-check contract. This review approves that contract as a required check for one exact ordinary-code tree. It does not authorize a merge, a preview, a deploy, or any production database write.

## Recomputed bindings

I recomputed inventory digests with `inventory()` and `hash` from `scripts/promotion-reviewed-code-pr270-pr271.mjs` and `stable()` from `scripts/promotion-required-check-legacy-successor-v1.mjs`, using the live git objects. File sha256 values below are raw SHA-256 of the bytes on disk or, where noted, git blob identity.

| Binding | Recomputed value | Matches the claim |
| --- | --- | --- |
| B `58f1c71b71c30f07d1269e9fe8cf5d7ac6f820df` tree | `8d8c074b06892c4d1d3038ce427f19f415dca1e3` | yes, same tree as evidence commit `05e9619613a56539982eea0f69fcb0d6b3f1b8e5` |
| PR #270 inventory, B..`b68871b5ccac18e1f6db7748c91eb14f0435ba7d` | `4bc492280d2fdd448f598f00e3ab06d94814ba272c87f572553ceab45933f445` | yes |
| PR #271 inventory, B..`b852e05e0d5153af0ec0e3784dfe70c8a3cd6170` | `081535bd13d09e57fd57e8ec57dfdb84c0717e7b3499fc51767a66cfca5e04f8` | yes |
| Integration source inventory, B..`302c0808a0e6b8651b5e86c05a3c2aa8ddb3581c` | `340c0338d676f7aa4013818eba6c14d98d2230dc21a806b5cbb4a662908a1740` | yes |
| Tooling inventory, S..T | `782b964269aadae7713b3b95de6d9cdc3a29d2999da2bc0f5164ac2a18e62968` | yes |
| T `acd24721e2f3412a66f76dcc31a1d8476ed03089` tree | `6301f7cf5c307ea7a7acb73e255ff57cddd4a043` | yes |
| `/tmp/review-draft/source-observation.json` | `a252937a63ac2ccd0cf037c6c4b3da5252803eb749cd33cb340a1d7e071817eb` | yes |
| `/tmp/review-draft/source-checks.json` | `0ba881f6189c6828cef3eac81c2762f1e8eb2b9dd0c0d34e552ea27b47114929` | yes |

Git checks that accompany those digests:

- `05e9619613a56539982eea0f69fcb0d6b3f1b8e5` is an ancestor of B. B is the merge of historical base `03717842b19e8b8fa9a3a2dbecf1b359bb842233` and that evidence commit, and B's tree equals the evidence tree.
- S270 `b68871b5ccac18e1f6db7748c91eb14f0435ba7d` has sole parent B. S271 `b852e05e0d5153af0ec0e3784dfe70c8a3cd6170` has sole parent B.
- Merge270 `09d7ab0dd6bb0e4af11b2c64a4053889c484aedb` has parents B and S270, and its tree equals S270 (`ca4b3ddbc72b80c95f4b176fed9b38dc34a05a18`).
- Integration S `302c0808a0e6b8651b5e86c05a3c2aa8ddb3581c` has parents Merge270 and S271. Its tree is `c4fe4342ee2f0c6b4f327c8490cf28eb2eba8363`.
- T `acd24721e2f3412a66f76dcc31a1d8476ed03089` has sole parent S. `git diff S T` changes exactly four regular `100644` paths: `.github/workflows/promotion-shadow.yml`, `docs/pr270-pr271-reviewed-code-gate.md`, `scripts/promotion-reviewed-code-pr270-pr271.mjs`, and `scripts/promotion-reviewed-code-pr270-pr271.test.mjs`.
- The admission marker `coordination/integration/reviewed-code/pr270-pr271-v1/admission.json` is absent at S270, S271, S, and T.
- The checker constant `PULL_REQUEST` is `272`. The tests reject event numbers 270, 271, and 259.

PR #259 bytes are unchanged from the evidence commit through B and through T. Both of these blob ids are identical at `05e9619613a56539982eea0f69fcb0d6b3f1b8e5`, at B, and at T:

- `scripts/promotion-reviewed-code-pr259.mjs` blob `b3621ceb862b1b2af3ea9a6ff2f2fa4e55c987a1`
- `coordination/integration/reviewed-code/pr259-v3/admission.json` blob `0672b17583c17a30f2688d5810cfef29cae21bf0`

The legacy successor script blob at `03717842b19e8b8fa9a3a2dbecf1b359bb842233` is `e867900f38555ec8e97aff093fbb32ed56c08f62`, and that same blob is still the copy in T.

## Evidence commit E

E does not exist yet. The marker has no first-addition commit. I am not pre-binding a future evidence commit, and I am not treating T, S, S270, or S271 as that commit.

## What this source is

The two pull requests are disjoint. B..S270 is six paths and B..S271 is eight paths. Their path intersection is empty. B..S is the sorted union of those fourteen paths, and each integration blob id matches the blob id from the pull request that introduced it.

PR #270 links the existing internal California demo student `student-jon-us-ca-super` into Teacher Scott's demo class `class-us-ca-p1-2026`. It adds one stable class-enrollment row and one stable assignment-submission row inside the TypeScript seed helpers that `normalizeDatabase` already applies when it reads a snapshot. It adds the unit tests for that link and a CI step that runs those tests. I found no SQL file, no migration, and no production database script on B..T.

PR #271 is a test and UI flake fix. The login form stays uncontrolled until hydration so an early fill is not cleared. The teacher inbox draft, send, and thread-patch actions take a generation and abort controller so overlapping clicks cannot apply a stale reply. The Playwright helpers wait for the login POST and for the inbox draft and reply responses. The specs call those helpers and wait on the session guard instead of a fixed 100ms sleep. No lesson directory, candidate pack, question bank, or publication route is in either diff.

## Strictness against the PR #259 v3 contract

I read `git diff S T`, the full checker, and its test, and I compared them with `scripts/promotion-reviewed-code-pr259.mjs` and the existing reviewed-code job steps.

The new contract keeps the same closed shape:

- Current HEAD must descend from the single evidence commit and its root tree must equal that commit's root tree.
- Tooling is one commit whose sole parent is S and whose path set is exactly the four maintenance files. Evidence is the single `git log --diff-filter=A` addition of the admission marker. That commit's parent must be the tooling commit, the added paths must be exactly the seven evidence files, those files must be absent on the tooling commit, and each must be mode `100644`.
- A11 and A23 reports are hash-bound. The checker accepts only reviewer identities `/root/a11_pr270_pr271_review` and `/root/a23_pr270_pr271_review`, result `approved-for-ordinary-code-required-check`, and `liveAllowed: false`, and it checks both the decision JSON and the markdown report bytes.
- A one-byte source edit, an extra file, an extra tooling file, a symlink evidence path, a deleted-and-readded marker, a forged reviewer identity, and `liveAllowed: true` are rejected in the checker and covered by the test. A rehashed decision that flips `liveAllowed` or widens the scope also fails the final comparison.
- The workflow `on` block is `pull_request` plus `push` to `main`. It has no `paths` filter and no `workflow_dispatch`. The job `promotion-shadow-gate` has no job-level `if`. The file contains no `continue-on-error`.
- The new historical steps still check out `03717842b19e8b8fa9a3a2dbecf1b359bb842233`, run `npm ci --ignore-scripts` there, and evaluate `scripts/promotion-required-check-legacy-successor-v1.mjs` from that checkout with `--repo` pointed at that checkout. The synthetic event is still number 259 with base and head both equal to that historical commit. The frozen execution checkout remains `ff709c0141ef8660604a20340b1c476bf2941f60`. The new decision function checks the baseline HEAD, checks the baseline script bytes against the historical blob, and calls `verify` from that baseline copy. The historical proof stays on the historical base.
- `PERMISSIONS` is `ordinaryCodeEligible: true`, with `liveAllowed`, `integrationAllowed`, `previewAllowed`, `deployAllowed`, `wholePackAccepted`, and `historicalAuthorityTransferred` all false. The checker requires that object on the admission record and copies it into the decision.

The selector does not fall through after an error. The new marker is tested first. The mode string is printed only after `preflight` returns, and a thrown preflight sets exit code 2. On this host, bash 5.2.21 with `set -euo pipefail` exits when `mode=$(false)` sits in the `then` branch, which is the form used by the workflow step. An empty or unexpected mode then fails the explicit mode whitelist. The `elif` PR #259 arm and the legacy arm are not reached after a new-selector failure.

S270 and S271 cannot pass on their own heads. Their trees differ from each other and from the PR #259 evidence tree, the new marker is absent, and the new checker admits pull request number 272 with base B only after a descendant of T has the single evidence commit and an equal root tree. Opening either source head as pull request 270 or 271 fails `REVIEWED_CODE_PR_BASE`.

## What I did not execute

I did not run `npm ci`, `npm run test:promotion-gate`, the legacy successor evaluator, the Student Jon link tests, `tsc`, Playwright, `node --test` for either reviewed-code suite, or `select` / `check` / `finalize` / `verify` against a GitHub event. I did not contact a production database. The draft checks file records a prior link-test and type-check run; I hashed that file and did not repeat those commands. The only checker functions I invoked were `inventory()`, `hash`, and `stable()` for the digests above, plus a local bash probe of `set -e` on a failing assignment.
