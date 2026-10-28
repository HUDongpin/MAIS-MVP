# Independent A11 review of immutable PR300 source and tooling

Reviewer: /root/pr286_source_review

Reviewed at: 2026-10-28T15:54:35.819Z

Decision: approved-for-exact-pr300-required-check

Scope: exact-pr300-classroom-safety-required-check-only

This is an independently authored review of the actual frozen source S and tooling T. It is not the earlier uncommitted-source review or a synthetic contract-test approval. No blocking actionable findings remain in this bounded source/tooling slice. The earlier P2 lesson-progress identity mismatch is corrected and regression-tested.

## Exact binding

| Item | Verified value |
| --- | --- |
| Base B | 1b03f8f1300c360188ada33a382070eba06cb075 |
| Source S | bc967e739480db7c66a824bb1369ef3a7268b93f |
| Source tree | df2adb27f2ccf3ae5fd2f4fb15270d35b1936ebb |
| Source inventory digest | 77bf12baca47b784396acc6a1ccc1707b7f8c9567caf7019eb373f88c094a27b |
| Tooling T | 1eb19a315eaa54e82bd5f5cecc9d960e990bce72 |
| Tooling tree | fe00fde28faa8ecb62ad29c8589916e38ce20c16 |
| Tooling inventory digest | eb2620e46e384f98e070811fd24520ac3c413c974245adc957651b41c2172419 |
| Frozen source-check JSON SHA-256 | f640470c34ad93416b5283352a6cb08b6fba7cc0503f5b5ac9094404eef89e9b |

I verified the direct parent sequence B -> S -> T, both trees, the exact four source paths and four tooling paths, the inventory digests, and every source/tooling worktree file against its committed blob. HEAD and tracked/untracked cleanliness were checked before and after testing. The three source/runbook files retain the previously reviewed v2 bytes; S additionally contains the task lifecycle record. The records and comments do not substitute for later owner or remote acceptance.

## Source behavior and compatibility

The classroom CLI rejects unknown value-bearing arguments without printing their values and rejects invalid, fractional, non-decimal, unsafe, and out-of-bound numeric inputs. Defaults and exact bounds remain accepted. Cookie-bound student role, ID and origin checks run after login and before each workload round, once per independent session rather than virtual seat; a failed check prevents the dependent workload and a new report. These checks are outside workload timing and request counts. Reports distinguish actual authenticated IDs, login count and virtual seats, with local versus provider-verified Preview classification. UTF-8 report serialization is rejected above 8 MiB before filesystem mutation, while the exact boundary remains accepted and existing evidence is preserved. Existing provider binding, credential redaction, redirect rejection and artifact path/fd/race protections remain covered.

The fixed lesson-progress request supplies the bound student ID in both its header and body. I checked this against the current API route's requireConstraint guard and exact identity matching. The loopback regression exercises both actual write requests. No server-side guard was relaxed.

## Tooling and workflow assessment

The checker binds source inventory, source execution records, tooling commit/tree/inventory, review JSON and actual Markdown hashes, closed permission fields, and canonical review times. It restricts evidence to a direct child of T with exactly seven newly added evidence files. It admits only same-repository PR300 at the exact base/head combination, or a main push with ordered [B, E] parents and E's unchanged tree. Changed source/tooling/evidence paths, modes, hashes, chronology, events, reviewer identities, permissions, duplicate JSON, aliases, dirty state, shallow/replace/graft history and malformed or incomplete test output are rejected by executable negative cases.

I compared the actual workflow to deterministic reconstruction from S. Only the PR300 selector, accepted-mode addition and dedicated verify/upload steps are added; prior workflow bytes, checkers, action pins and controls are retained. A present invalid PR300 marker cannot fall through to an older contract. The full materialization checks remain before and after child execution. The child environment omits inherited provider/database credentials, NODE_OPTIONS and NODE_PATH. Artifacts require a fresh private canonical temporary directory outside the repository.

## Independent execution and evidence verification

All fresh commands ran at clean immutable T with Node v24.15.0, using the checker's restricted command environment. Source files at T were verified byte-identical to S.

| Command | Fresh result |
| --- | --- |
| node --test --test-reporter=tap scripts/promotion-reviewed-code-pr300.test.mjs | 35 passed; 0 failed, skipped, cancelled or TODO |
| node --test --test-reporter=tap --test-concurrency=1 scripts/classroom-load-smoke.test.mjs | 70 passed; 0 failed, skipped, cancelled or TODO |
| node --test --test-reporter=tap scripts/release-build-gate.test.mjs | 7 passed; 0 failed, skipped, cancelled or TODO |
| node --test --test-reporter=tap scripts/prod-certification.test.mjs | 24 passed; 0 failed, skipped, cancelled or TODO |
| Release-governance equivalent: node --test --test-reporter=tap --test-concurrency=1 scripts/classroom-load-smoke.test.mjs scripts/release-build-gate.test.mjs scripts/release-governance.test.mjs | 163 passed; 11 existing historical fixture skips; 0 failed |
| git diff --check B T | Passed |

I parsed the frozen clean-S source-check JSON with validateSourceChecks, checked its exact raw SHA-256, read all three original source-*.stdout and source-*.stderr files, recomputed their recorded hashes, and parsed their actual TAP summaries. Each original log agrees with the recorded complete test names/counts; stderr files are empty. I also verified that the execution timestamp lies after S and no later than T. This consumes and verifies the original execution evidence; the independent reruns above occurred at T, not at a newly created S checkout.

Fresh raw logs, their hashes and full parsed summaries are retained under .local/pr300-admission/reviews/a11/ in verification.json, gate-contract.stdout/.stderr, classroom.stdout/.stderr, release-build.stdout/.stderr, prod-certification.stdout/.stderr and release-governance.json/.stdout/.stderr. Synthetic S/T/E fixtures in the gate tests establish executable accept/reject behavior and are not actual reviewer approval or remote admission.

## Limits and pending acceptance

I read the parent's .local/pr300-admission/local-materialization.json: its actual-T full-tree probe records blocked-local, ENAMETOOLONG and fullMaterialization=false on a historical long coordination path. I did not rerun or waive that guard. Whole-tree materialization has not passed locally; the unchanged guard must succeed on actual Ubuntu against the final evidence head and any authorized main merge. Exact source/tooling byte verification and passing offline tests do not replace that remaining check.

No actual E commit or main merge was available for final remote gate acceptance during this review. I did not perform a live provider call, live classroom run, database operation, Preview deployment, production deployment, browser acceptance, or repository mutation. Tests used offline/synthetic and loopback fixtures. The 11 broader historical fixture skips are disclosed, not treated as historical Promotion revalidation. All six permission fields remain false: historicalPromotionRevalidated, liveAllowed, previewAllowed, deployAllowed, wholePackAccepted and historicalAuthorityTransferred. Live classroom performance remains unproven.

This approval establishes only bounded eligibility of the exact reviewed S/T pair for the PR300 required-check evidence package. It does not authorize or assert merge, remote gate success, main acceptance, whole-pack content acceptance, or live operation.
