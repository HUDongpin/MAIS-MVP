# A11 independent review — legacy successor required-check activation C1

- Reviewer and actual task identity: `/root/a11_pr172_copy_verify` (A11).
- Reviewed at: 2026-09-28T11:18:24.765Z.
- Exact code commit: `fae1dd93ff05810ef19e4623b030068aa742bb26`, direct child of Receipt storage commit `5b1445e32f72156e1effa27ae31c3e08ec4d0fab`.
- Verdict: **approved-for-required-check-integration**, strictly for the five reviewed code files and a reviewable non-live integration candidate. This is a code-freeze decision, not a GitHub global required-check PASS, merge, deployment, live promotion, whole-pack QA approval, or authority to close #172 or #262.

## Exact source and verification

A11 independently read the C1 Git objects, current C1 working bytes and Git modes. All five are regular `100644` blobs and match the frozen packet. The code digest, recomputed from sorted `[path, mode, rawSha256]` rows, is `3e95ba6271b38a311d91c76c3e0f07329051bc0fdc415ed3eb94a1c2e929fd68`. C1 has the single parent `5b1445e32f72156e1effa27ae31c3e08ec4d0fab`; the C1 delta contains exactly these five paths:

| Path | Raw SHA-256 |
| --- | --- |
| `.github/workflows/promotion-shadow.yml` | `c6912ec7afc23a6377d1a81f76998a4d9c10d890c9ee2862a45e74ba3037859c` |
| `scripts/promotion-required-check-legacy-successor-v1.mjs` | `9944d4b6e4c8fa819a66ab5efe739a3975009cdf7a33308a448f5e46b3e4bbff` |
| `scripts/promotion-required-check-legacy-successor-v1.test.mjs` | `b75e3bf5b49ab02c8bb69fb967d55f80fee941ae3b8c83973c1eb3ba7924c0ce` |
| `scripts/promotion-shadow-workflow-legacy-successor-v1.test.mjs` | `b0b130d554742780f760486ff5132d5f7f45ada45acded56d49ab3aa7e980d57` |
| `scripts/promotion-shadow-workflow-v2.test.mjs` | `b25f95237961612d6e645c096ebfa457074758b04bcd7e8f3c4a18241c50a37c` |

A11 independently ran read-only `git diff --check`, `node --check` on the three new JavaScript files, YAML parsing, and the prior `assertRequiredWorkflowShape` assertion: all passed. A11 did **not** re-run tests that create temporary Git fixtures. The coordinator's terminal test logs were read back, not reclassified as independent A11 runs:

- New activation tests: **10/10 PASS**, zero failures/skips; `/private/tmp/mais-successor-activation-new-tests-c1-final.log`, raw SHA-256 `0d9f5f851cf2440f390f122888dbff80b6f0b43e7df21a46956369cb6ab85de1`.
- Preserved Promotion gate suite: **107/107 PASS**, zero failures/skips; `/private/tmp/mais-successor-activation-v2-regression-artifact-final.log`, raw SHA-256 `373c0e75385a98470c14e7e82ac15a266f093f8ddb5c1517d3a1f40a2b3b9989`.

The activation path is restricted to a first marker addition or an unchanged marker. Marker mutation, deletion and re-addition fail closed through selector/history checks. The code commit must be an exact child of the storage commit and change only these five files. The later marker commit must add the marker plus two independently authored decision JSON files and their matching reports as one bounded change. The verifier binds each decision to the code digest, commit, reviewer session/identity and raw report bytes. Future paths are limited to documents and standalone tests; protected promotion/source paths and symlinks are rejected, while current-head structural runtime and legacy observations repeat when later permitted paths exist.

The workflow retains the existing v2.6 leg and its required job name, adds a successor leg using the exact frozen execution commit, and runs the old and new tests in that leg. Native `verify-receipt` and a fresh Shadow run are required to exit zero with byte-bound stdout/stderr. The final step recomputes the non-live semantic and self digests and the decision. The repaired artifact boundary requires one physical `0700` runner-temp directory containing exactly six regular single-link `0600` files; the test rejects an extra file, a symlink and a `0644` file. Upload treats missing artifacts as an error. All decision permissions remain false for live, integration, preview and deploy.

## Unclosed authority and execution limits

**P1 — external required-check authority remains open.** A11 read the live GitHub main branch protection through the read-only GitHub API: required contexts are `validate` and `promotion-shadow-gate`, but required approving review count is **0**, code-owner review is disabled, and the repository has no rulesets. A PR author with sufficient write access can change the candidate-provided workflow and selector while preserving a same-named job. The in-workflow digest and session strings cannot prove independent authorship if that workflow is bypassed. Actual A11/A23 authors must be verified out of band by their exact file hashes, and an owner decision on protected workflow/review controls is needed before calling the CI status tamper-resistant global authority. The workflow uses `pull_request`; GitHub documents that PR runs use the merge-branch workflow and that checking out `github.event.pull_request.head.sha` executes PR head code: https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows .

**P2 — global run evidence is pending.** The synthetic Git fixture tests selector and marker history; it does not execute the complete future C2 review-marker `preflight`, artifact `evaluate`/`verify` sequence or the Ubuntu runner. C1 is a reviewed code candidate only. Actual GitHub `promotion-shadow-gate` success, artifacts, runner capacity, base/head binding and the final checked SHA must be observed and read back before any global-gate PASS. A moving main base can fail the exact ancestry contract; that is a blocker to resolve with a new reviewed source, not a reason to bypass the check.

The earlier standalone local attempt-009 validate, non-live Shadow, Git Receipt storage and native replay PASS remain separate exact-source evidence. They do not by themselves satisfy this new global workflow. Old attempt-008 failure outputs remain historical failures. This report is authored by A11 and must be copied byte-for-byte to `coordination/integration/legacy-successor/activation/a11-review.md` with its raw digest recorded in the decision JSON; no root, source, Git, PR, ledger or historical evidence mutation was made by A11 apart from this assigned report and decision JSON.
