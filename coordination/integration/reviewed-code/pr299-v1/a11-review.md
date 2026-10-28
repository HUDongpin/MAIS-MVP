# Independent A11 review of exact PR299 required check

Decision: approved-for-exact-pr299-required-check.

Reviewer: `/root/p2_evidence_review` (A11). Reviewed at `2026-10-28T07:22:56.722Z`. This reviewer inspected the existing evidence and the proposed gate without authoring or modifying its implementation, source, workflow, Git history, or evidence inputs. This report is an actual review of the immutable tooling commit below, not a synthetic contract-test fixture.

## Immutable review context

| Binding | Exact value |
|---|---|
| Base B | `6e38018d2ab794bdf4034286fa05bd031c699a23` |
| Source S | `8bcb388e3eb27fb5d602557f0fa03ecfdb8755ea` |
| Source tree | `1325966de5df35028c2f783413c51b03f9024f5d` |
| Source inventory digest | `8f8b1311cf07600c31e61253b77f885dd99f6a629abbf7647af09e7bdb137a41` |
| Tooling T | `10f23b640d62ef1c789e7ea07a5d9c5e386a0cf3` |
| Tooling tree | `ba62f14f0dea87545ea9bfc368308c523f123bfb` |
| Tooling inventory digest | `d61f8ea2dbe26032f041014f1079cf890518fc3193a5238de537befcd72d6149` |
| Frozen source checks SHA-256 | `a5e916a43b1ab49c0e544489131a19e7a836600b165a2c950a4de63078f970e9` |
| Frozen consumed browser evidence SHA-256 | `069d7c90e07711e265e3d159f14cc6996e10b03e7b62f98d43ff3a7474d01294` |
| Contract-test log SHA-256 | `a38bcac54980940cc56f0f0ce5fb5a5a4d1c6a72b680febba8894e1337b8d94a` |

T has exactly S as parent; S has exactly B as parent. I recomputed both inventories using the checker library and independently checked the declared paths, source replacement, actual commit/tree identities and working-tree bytes. The checkout was clean at T at the conclusion of this review.

## Source and workflow assessment

B to S changes only `data/lessons.ts`. The fixed whole-file before/after contract matches exactly the unique P2 `p2-length-data` visualization title and instruction block replacement: English, Traditional Chinese and Simplified Chinese six strings. The resulting file SHA-256 remains `ebef4b43e92c9a97d036bf5e86a563c04ab6cd650d6a14d0a299f62ef9fd02b2`. No other lesson text, topic, model, routing, dependency or historical evidence changed in S.

S to T changes exactly the checker, its test, this PR's gate document and `.github/workflows/promotion-shadow.yml`. The applied bytes match the independently inspected proposal. The workflow equals the fixed source workflow with only the deterministic PR299 selector, accepted-mode condition and check/upload-step insertion. Existing checks, action pins, permissions, dependency commands and historical workflow content are retained byte-for-byte outside those insertions.

The gate binds an exact PR299 same-repository B/S/T/E chain and an exact prospective ordered-parent main event. Its selected-marker failure cannot fall back to older approval. Evidence files must be the exact first-added set; source and tooling bytes, modes, inventories, report hashes, distinct review identities, allowed decisions and six false permissions are bound. Strict JSON/key validation, shallow/replace/graft rejection, clean-state and full materialization guards remain in place. Children run with an environment allowlist, bounded timeout/output, explicit Node 24, and a new private artifact directory outside the repository.

## Execution evidence assessment

I read and hashed the actual supplied logs and applied the gate's report parsers to their bytes. I did not rerun those application tests in this review.

| Evidence | Observed result |
|---|---|
| Exact gate contract suite | 43 tests, 43 pass, 0 fail/cancelled/skipped/todo; root TAP plan and result names parsed successfully |
| TypeScript source check | Exit 0 recorded; exact fixed heap/tsc command; stdout and stderr both empty |
| Existing render/routing source tests | 8 tests, 8 pass, 0 fail/cancelled/skipped/todo; exact names digest `8b585d58dc37c6628a1eec352ff5ba17427660061e1393e8946c83a2b2fdefda` |
| Strict Simplified Chinese audit | Advisory 3509/3512, zero non-pack critical, no pack regression; command exit 0 recorded |

All frozen stdout/stderr bytes match `source-checks.json`. The source check timestamp is after S and before T; prior browser execution precedes S. The 43 top-level contract tests have unique names and match `CONTRACT_TEST_COUNT`. They exercise exact source changes, workflow preservation, invalid PR/base/head/fork composition, descendants, extra tooling/evidence paths, frozen evidence rewriting, reviewer/time/permission/schema restrictions, dirty/symlink/hardlink state, materialization flags, TAP failures/truncation/skips, child failure/signal/error rejection, environment filtering and artifact boundaries. I found no actionable defect within this reviewed scope.

## Consumed browser and A18 provenance

The original independent A18 review was read back from its actual reviewer conversation and is bound to the same lesson-file hash, with verdict `approved-for-integration-review` and zero findings. That source-bound prior review is provenance only; the new package separately requires actual post-T A18/A11/A23 reviews.

The three original local browser logs contain eight states per language and exactly match the frozen 24-state summary. Their arithmetic, longest-label ties, geometry checks, keyboard/pointer actions and zero recorded page errors were verified against the raw results. The three selected screenshots were opened and visually inspected, with the final copy, three sliders, bars and summary visible. The initially partially painted Simplified Chinese image is retained separately, and the complete reload image is the final reviewed one.

The twelve recorded source dependencies, including GeometryExplorer, LessonView, text cleaning/localization, routing and both existing test files, are unchanged between B, S and T and match their frozen hashes. The seven task-local dependency overlay versions and integrity records match the repository lock. The runtime record honestly consumes this prior local desktop evidence: `browserReexecutedInCi=false`, `liveAllowed=false`, `wholeLessonApproved=false`. It does not assert CI browser replay or production validation.

## Limits and disposition

This review approves only `exact-pr299-p2-copy-required-check-only` at the actual T binding above. E did not yet exist during this review; its assembly, actual event preflight, immutable evidence bytes and real Ubuntu CI results remain subsequent checks. This reviewer did not rerun the full materialization check, browser or application suites, and did not convert prior logs into fresh CI output. The full materialization guard is unchanged and must pass on the authoritative CI checkout; any macOS path limitation remains reportable rather than bypassable.

Historical promotion revalidation, live, Preview, deployment, whole-pack acceptance and historical authority transfer all remain false. This review does not authorize merge, deployment, branch/worktree cleanup or whole-lesson acceptance.
