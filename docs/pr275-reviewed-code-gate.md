# PR275 ordinary-code admission preparation

Owner: A23 implementation, A11 targeted verification, A22 workflow integration.
Workspace: `codex/viz-evidence-binding-20261018`; target PR: #275.
The initial preparation authorized local implementation, verification and independent
review only. The follow-up owner instruction authorizes committing and pushing the
exact S-to-T-to-E chain, commit-bound A11/A23 review and complete CI/Promotion
verification. Merge, deployment and branch/worktree cleanup remain unauthorized.

## Fixed source and preserved authority

- BASE B: `656ac319b2ad5812d31ad952cbb18430b5e58065`.
- SOURCE S: `f58fd25d913de68e75796b66e15247c199cdb99c`, with exactly `[B]` as parents.
- Source tree: `fd382a7974f248e459c57654aa881ed6a40e34b7`.
- Four-path source inventory: `8650aefefcffef3babf6933dae2ea15f8157e758c22a38db83cc30980c6f6c7e`.
- PR number: `275`.
- Fresh source observation SHA-256: `728f20e13198c00375e816d4b34363bf418790a12668fdd80b7c1467727d4758`.

The source is exactly the reviewed browser-evidence module, its test, the one
synthetic handoff-fixture change and the historical A11 session record. Its four
blobs remain untouched during tooling preparation. A fresh read-only observation
at clean S reproduced the same runtime policy and canonical content audit as the
previous observation. This is a new observation of S, not inherited acceptance.

The PR274 contract lives under the historical `pr264` names. Its checker, test,
document, evidence directory and the earlier PR259/PR270/PR271/native legacy
contracts are preserved against B. The workflow changes only by adding PR275
dispatch/execution/upload steps; all previous steps, triggers, permissions and
job environment remain unchanged. A new marker is checked before the old marker,
including dangling symlinks. A failed PR275 preflight never falls through.

## Exact source/tooling/evidence chain

1. S already exists and is fixed above. It is a single-parent source commit,
   not PR264's historical two-parent composition.
2. Future T must be a direct child of S, changing exactly four tooling paths:
   this document, `scripts/promotion-reviewed-code-pr275.mjs`, its test, and
   `.github/workflows/promotion-shadow.yml`.
3. Future E must be a direct child of T and first-add exactly seven files under
   `coordination/integration/reviewed-code/pr275-v1`: `admission.json`,
   `source-observation.json`, `source-checks.json`, and A11/A23 Markdown report
   and JSON decision pairs. Genuine reviews must inspect the frozen S/T and bind
   exact source/tooling/observation/check/report digests. Local reviews of this
   uncommitted proposal are not future commit-bound approval records.
4. Execution HEAD must descend E and have the entire E tree. PR events must bind
   PR275 and exact B. Main push composition must preserve B ancestry and the exact
   evidence tree. Other PRs, base changes, extra files, mode/byte drift, dirty or
   hidden/sparse materialization, reused markers and expanded permissions fail.

The real T/E commits and real admission directory are deliberately absent during
this authorization phase. No future commit hash or approval is invented. The
production CLI must remain blocked until genuine frozen T/E evidence exists.

## Checks required by the new route

The route keeps the existing coordinate model/source tests, non-incremental type
check and three-mode coordinate browser proof. It additionally requires all 49
browser-evidence/package/readiness behaviors through an exact TAP command. Both
that proof and the 35 model/source cases bind the exact test titles observed from
S, complete counts, and zero skips, cancellations or todos. Case-insensitive TAP
directives, bailout records, substituted test titles and empty model output are
rejected; successful type checking may legitimately have empty output.
Browser proof must contain the
three exact Translate/Reflect/Dilate cases, one attempt each, zero retries/skips,
no flaky/unexpected results and no report errors.

Checks execute at current HEAD with a minimal environment, offline providers and
owned build/browser paths. Command arguments and stdout/stderr hashes are bound.
Full tracked source, modes and index flags are checked before/after observation.
The current observation must equal the freshly frozen S observation.

Historical non-live evaluation and verification remain mandatory at their own
fixed baseline `03717842b19e8b8fa9a3a2dbecf1b359bb842233` and execution
`ff709c0141ef8660604a20340b1c476bf2941f60`. Current checks alone cannot finalize a
decision. Final enforcement runs with `always()` and re-verifies current/native
proof and every binding. All live, integration, Preview, deployment, whole-pack
and historical-authority-transfer permissions remain false.

## Local verification and review plan

- Run the new contract suite and unchanged PR259/PR270/PR271/PR264 suites.
- Exercise selector behavior with actual shell commands in synthetic directories;
  test strict S/T/E positives and scope/tampering/finalization negatives in isolated
  temporary Git fixtures. Fixture commits never modify real repository refs.
- Re-run the 49 focused evidence tests, type checking, preserved native Promotion
  tests and relevant browser proof as bounded local verification.
- Obtain independent A11/A23 review of the fixed uncommitted tooling bytes.
- Retain logs under `.tmp/pr275-admission`; do not replace historical evidence.

Synthetic positive fixtures establish checker behavior, not real admission or
Shadow authority. Stored reviewer names/hashes bind report content; they are not
cryptographic evidence of external human approval. The previously recorded 26
downstream Manim failures remain separate baseline issues and are not suppressed.

## Earlier preparation verification and review record (retained)

The initial selector behavior test failed twice before implementation: a PR275
marker incorrectly reached the legacy selector, including a dangling marker.
Both cases now execute the new checker and enforce its failure without fallback.

A23's initial review found the source/topology/workflow bindings sound. A11's
independent review found two proof-completeness gaps: malformed or substituted
evidence TAP could pass, and empty model output could satisfy an exit/hash-only
check. The new route now binds the exact 49/35 names and strict TAP outcomes;
the old PR274 verifier is unchanged. Initial failure logs are preserved.

Local evidence is retained in `.tmp/pr275-admission`:

- A fresh observation ran at clean S before editing. Its raw hash equals the
  frozen observation above and runtime/content reachability is unchanged.
- The focused 49-case TAP and 35-case model TAP were genuinely executed and
  accepted by the strengthened report validators.
- The final combined PR275/PR264/PR271/PR270/PR259 contract suites passed 79/79,
  with zero failures, cancellations, skips or todos. This includes all 24 new
  PR275 cases and 55 unchanged prior-contract cases. The final non-incremental
  application type check also passed.
- The three-mode browser proof passed with no retries/skips/flakes/errors in a
  new isolated local run, port 3395. Its raw JSON hash is
  `90ee38a685d270495b5eb2e4e3beb1d98c1a1ba0303c4a9b497d32445eedb539`.
  This macOS check used installed Chrome; the future CI check remains pinned to
  bundled Chromium. The local run is not a formal E-bound admission artifact.
- The historical native Promotion suite was 106/107 in this worktree: the one
  failure was `AUTHORITATIVE_PATH_UNSAFE` caused by macOS `ENAMETOOLONG` at the
  unchanged 960-byte Manifest path plus this 64-byte root. The exact unchanged
  test passed 1/1, with zero skips, in a shorter detached verification copy at
  `/private/tmp/p275-ji8jm0ig`; no safety check or test was edited. The current
  workflow bytes were used there and the copy's HEAD stayed S. These are separate
  results, not a claimed single 107/107 run. The fixture and path-length receipt
  remain available; real repository refs were untouched.
- The legacy successor/workflow/alias supplementary suites passed 12/12.
- All source and frozen prior-contract files remain unchanged. Real T/E commits,
  the PR275 admission marker, and any new remote CI execution remain absent.

A11 and A23 independently re-reviewed the repaired checker and tests. Both
closed the original proof-completeness findings and found no remaining in-scope
blocking defect. Each independently executed the genuine 49/35 TAP commands and
rejected 20 malformed proof variants. A11 additionally rejected invalid UTF-8,
changed model output and empty model output even with a matching recomputed hash.
A23's four targeted proof/finalizer cases passed 4/4; it confirmed 94 protected
source/contract files and all 44 prior workflow steps were preserved.

A11's complete new-suite rerun was 23/24 because the system Data volume exhausted
space while constructing a synthetic Git fixture, before proof assertions. The
unchanged failing finalizer case then passed 1/1 with zero skips, cancellations
or todos. These separate independent runs are not represented as a single 24/24
run; the parent-executed final combined run above was 79/79. No cleanup, test edit
or guard relaxation was used to obtain the targeted rerun. Both reviewers inspected
the retained browser proof without independently repeating that browser session.

The real production selector was also exercised against this uncommitted
preparation. It exited 2 with `REVIEWED_CODE_DIRTY`, `result: blocked` and
`liveAllowed: false`, as required. Local synthetic positives and preparation
reviews do not activate admission. The reviewed checker, test and workflow hashes
are recorded with the local review summary; the final documentation appendix is
recorded separately because it was added after those code reviews.

PR275's remote required check is unchanged until later separately authorized
publication and genuine activation evidence. The current result remains an
uncommitted preparation, with no merge, deployment or cleanup authority.

## Current independent recheck and repairs

This recheck adopted the existing four-file preparation rather than replacing it.
Its original bytes and hashes are retained under
`.tmp/pr275-admission-recheck-20261018T203308/intake-source`. The earlier test and
review records above remain historical; they are not reassigned to the revised
checker below.

Fresh A11 review found that extra/noncanonical TAP results and commented plans,
a browser filename suffix collision, and a singular `result.error` could pass.
Fresh A23 review demonstrated that `.git/info/grafts` could counterfeit the direct
S-to-T parent without changing committed objects. The new PR275 checker now:

- classifies every TAP result, plan and version header before enforcing its exact
  canonical record count, numbering and test-title set;
- accepts only the intended browser test filename/path and rejects non-null
  singular errors as well as entries in the errors array;
- fixes `GIT_GRAFT_FILE=/dev/null` in its sanitized Git environment, alongside
  disabled replacement refs, so ancestry is derived from committed objects.

All repairs are confined to the new PR275 checker and tests. The workflow remains
at the intake hash and the frozen PR274 contract is unchanged. New negative tests
first reproduced each problem, then passed after the repairs.

Final reviewed code hashes:

- Checker: `111732cb9424079e132f1989664f745dc59c95e7e35564ca71b7600477539dad`.
- Tests: `025ffca3fe1d8707b2991ca45b124dcb3f9e0dd0ce76d26925c0aed80ffe9035`.
- Workflow: `119dd36ab9809f6382c5f65077e7d551fe6ed49ae805a9a5937968072ac37576`.

The revised new contract's full suite passed **27/27**, zero skips. Fresh genuine
evidence and model/source commands passed **49/49** and **35/35**; the historical
supplementary suites passed **12/12**. A new isolated local browser run passed
**3/3**, with no retries, skips, flaky results or report errors, on port 3395.
Its raw report hash is
`0fa83800afc7cdf4213147fbe71fe76b4a5eab8ce4b46f6e7ad7b9af0f5bfa4b`.
This run used installed Chrome and is local preparation evidence; future CI
remains configured for bundled Chromium and must collect fresh E-bound proof.
The strengthened validators accepted all three genuine reports.

The combined old/new run completed **82/82**, but overlapped the repair window.
It is diagnostic evidence, not a single frozen-final 82-case acceptance. The
separate 27-case final run binds the revised checker/test hashes above. The older
native 106/107 plus short-path 1/1 results remain separate historical observations;
this recheck neither edits those tests nor relabels them as a fresh full pass.

Two fresh-context, read-only reviewers completed final rechecks:
`/root/pr275_a11_proof_recheck` and `/root/pr275_a23_contract_recheck`.
A11 independently reran 49/35 genuine tests, rejected 43 malformed proof/binding
variants, and passed 9 targeted cases. A23 independently rejected grafted S, T and
E parent claims, accepted a valid chain despite a misleading graft, and passed
8 targeted cases. Both found no remaining in-scope blocking defect. They confirmed
94 source/protected files and 44 prior non-selector workflow steps were preserved.
These are local preparation reviews, not the future T-bound A11/A23 records.
The reviewers did not repeat the new browser session; the parent executed it.

All fresh outputs, hashes and the final type-check/blocked-selector readbacks are
retained under `.tmp/pr275-admission-recheck-20261018T203308`. Real HEAD remains S;
no real T/E commits or PR275 admission marker have been created. The next authorized
publication phase would need a frozen T, genuine commit-bound reviews/evidence E,
and exact-head remote CI. This preparation does not grant those actions or turn
PR275's existing remote failure into a pass.

## Authorized S/T/E publication phase

Freeze these four tooling files as T, with S as its sole parent. Then collect
fresh checks and independent A11/A23 decisions against that immutable T and S.
Each reviewer must personally inspect the frozen source/tooling and the actual
observation/check artifacts before issuing its report and digest-bound decision.
Earlier uncommitted reviews remain historical and are not reused as formal
approvals. E may first-add only the seven specified evidence files, with T as its
sole parent. Publish only this branch and verify the exact E head through full
CI and the unchanged required Promotion route, including historical native
validation, fresh Shadow, distinct replay and final enforcement. No local test
result substitutes for those remote checks. No permission flag is expanded.

This document is frozen with T; actual T/E identities, later execution outcomes
and remaining limitations belong in E-bound evidence and retained CI artifacts,
not in an edit to the frozen tooling commit. The execution phase retains the
branch and worktree and does not authorize merge, deployment or cleanup.
