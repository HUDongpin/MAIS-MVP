# Independent A11 review of immutable PR300-v2 repair and tooling

Reviewer: /root/pr286_source_review

Reviewed at: 2026-10-28T16:28:49.284Z

Decision: approved-for-exact-pr300-v2-required-check

Scope: exact-pr300-v2-classroom-safety-required-check-only

This is a new independent review of actual immutable R and T2. No blocking actionable finding remains in this bounded repair/tooling package. The old v1 approval remains bound to its original S/T1, and the failed v1 Ubuntu run remains failure evidence. Neither has been relabeled as v2 approval or remote acceptance.

## Exact identities and preservation

| Item | Verified value |
| --- | --- |
| Main base B | 1b03f8f1300c360188ada33a382070eba06cb075 |
| Preserved v1 evidence E1 | c9c934621e0b9c53a3830d988332f941381df785 |
| Repaired source R | 455d6ed9247163341599e219d2deef18271d01d2 |
| R tree | b4cdfd4a8eb5794e3471b6816efc9125d4550110 |
| E1-to-R repair inventory digest | 326d7e7e0e9b07afecea68eeb832972f7083953048dcc15180b5fb2c24933d30 |
| B-to-R source inventory digest | d452d4d2eb7b0bfbd97424beebf6b5432812d301aca7beb2b3b64cbe6632e7ab |
| Tooling T2 | 49205d3b661ec50c69527ca5e30d0d437e075931 |
| T2 tree | 71e85941d9745d4a1c56b15ccb2fc63ae8627212 |
| R-to-T2 tooling inventory digest | 0b225a5e90f7e60d18e5f9ff4a8566a0c8065bd47e4f7c8c4e572ced359751a4 |
| Clean-R source-check JSON raw SHA-256 | 99840b075cb5c81935bfca74f239bc2980005657b828db2854af024e1ff6ccd9 |

I independently verified the direct E1 -> R -> T2 parents, source/tooling trees, exact two-path repair inventory, complete fifteen-path B-to-R inventory, and exact four-path tooling inventory. Every non-overlapping source file matches its R blob; every tooling file matches T2 and the freeze record. The original v1 checker/test/documentation, seven v1 evidence files and lifecycle record retain their E1 blobs. I separately checked that the old A11 JSON and Markdown still bind only the original v1 tooling. HEAD, hashes and tracked/untracked Git cleanliness were stable before and after testing.

## Repair correctness and runtime policy

E1 -> R consists of 13 added lines in the classroom runner and test: the unsafe-permission self-test fixture now receives an explicit chmod(0644) followed by a mode assertion, and a subprocess regression sets caller umask 077 before running the real CLI self-test. The original failure occurred because writeFile's requested 0644 creation mode was filtered to safe 0600 by umask 077. The writer correctly accepted that safe file. The new chmod establishes the intended unsafe fixture independently of the caller mask.

The production report writer's 0600 requirement, no-group/other access, fd/path identity checks and refusal rules are unchanged. The workflow retains umask 077. The repair does not relax the actual security policy. The previous classroom safety changes and corrected expected-user header/body contract remain covered by the full classroom suite. The separately reviewed red/green repair evidence is retained; fresh immutable-T2 execution below confirms the fix under the CI mask.

## New gate and workflow

The v2 checker pins R's tree, B-to-R inventory, E1 parent and exact two-file repair digest. I verified that the only source/tooling overlap is .github/workflows/promotion-shadow.yml. Its worktree bytes are checked against T2 and its full content must equal deterministic reconstruction from R; excluding it from the ordinary R-byte loop does not leave an unconstrained overlap. The rest of the v1 source/evidence/checker material remains byte-bound to R/E1.

T2 is a direct R child with exactly four tooling paths. The prospective E2 must be a direct T2 child with exactly seven first-added v2 evidence files. The closed review schema binds actual R/T2 commits, trees, inventory digests, frozen source-check bytes, each reviewer's identity and actual Markdown bytes. Timing and all-false permissions are checked. Same-repository PR300 requires exact B and E2; a prospective main event requires ordered [B, E2] parents and E2's tree. Descendants, wrong events, paths, modes, hashes, stale/future reviews, malformed or duplicate JSON, dirty/aliased files, altered history and permission widening fail closed.

The actual workflow equals the deterministic v2 selector/mode/verify/upload additions before v1. Removing those additions reconstructs R's workflow byte-for-byte. Older modes, step controls and action pins remain unchanged; a failing selected v2 marker cannot fall through to v1. The full materialization guard remains before and after execution, followed by fresh preflight/currentness checks. Credential-restricted child execution and fresh private repository-external artifact requirements remain in place.

## Independently executed tests

All four commands ran at clean immutable T2 with Node v24.15.0, caller umask 077 and the v2 checker's restricted command environment. Current classroom source bytes were verified equal to R.

| Command | Fresh result |
| --- | --- |
| node --test --test-reporter=tap scripts/promotion-reviewed-code-pr300-v2.test.mjs | 37 passed; zero failures, skips, cancellations or TODOs |
| node --test --test-reporter=tap --test-concurrency=1 scripts/classroom-load-smoke.test.mjs | 71 passed; zero failures, skips, cancellations or TODOs |
| node --test --test-reporter=tap scripts/release-build-gate.test.mjs | 7 passed; zero failures, skips, cancellations or TODOs |
| node --test --test-reporter=tap scripts/prod-certification.test.mjs | 24 passed; zero failures, skips, cancellations or TODOs |
| git diff --check B T2 | Passed |

The gate contract tests exercise the exact source and repair constraints, workflow reconstruction, v1 preservation, wrong PR/fork/base/head and merge parents, extra paths, forged review bindings/permissions, malformed JSON/TAP, unsuccessful child execution, hidden index flags, history mutation, output directory restrictions and credential exclusion. Synthetic fixtures demonstrate executable accept/reject behavior; they are not the actual approval.

I read the clean-R source-check JSON and all three original source stdout/stderr pairs, recomputed their raw SHA-256 values, parsed the complete exact TAP names/counts, validated the record schema, and checked that execution occurred after R and no later than T2. All original stderr files were empty. Independent reruns occurred at T2, not in another R checkout. Fresh logs and their hashes are in .local/pr300-v2-admission/reviews/a11/verification.json and the gate-contract, classroom, release-build and prod-certification stdout/stderr files.

I also inspected the parent's tooling-regressions record and raw summary showing broader release-governance 164 passed, 11 existing historical skips, zero failed, and strict-JSON 5 passed. I did not independently rerun those broader suites in this formal review. Those 11 skips are not represented as historical Promotion revalidation.

## Remaining limits

The parent's actual-T2 local-materialization.json records blocked-local, ENAMETOOLONG and fullMaterialization=false on a historical long coordination path. I read that actual-T2 receipt and did not rerun or waive the guard. Whole-tree materialization has not passed locally. Actual Ubuntu PR and authorized main checks must pass the unchanged full guard on the final v2 evidence/merge identities. The earlier v1 initial materialization success and its later classroom failure do not substitute for v2 acceptance.

No actual E2/main or remote required-check success is asserted by this review. No live provider, database, classroom load, Preview, production deployment or browser acceptance was performed. Tests used offline/synthetic or loopback fixtures. All six permission fields remain false: historicalPromotionRevalidated, liveAllowed, previewAllowed, deployAllowed, wholePackAccepted and historicalAuthorityTransferred. Live classroom capacity remains unproven.

This approval is bounded eligibility of the exact immutable R/T2 pair for the PR300-v2 required-check evidence package. It does not authorize or claim merge, remote gate success, main acceptance, historical authority transfer, content whole-pack acceptance or live operation.
