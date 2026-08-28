# Discovery and routing

## Default audit

Start with the repository path and, when supplied, an expected 40-character HEAD. Discovery is offline and read-only. It should:

1. read Git HEAD, branch, and porcelain status without changing them;
2. read tracked/current `package.json`, require exactly the three public Promotion scripts, and prove their exact validate/Shadow/verify mapping;
3. locate exactly one tracked/current workflow and structurally prove, within one supported bash/sh Linux job, its reachable executable validate, fresh Shadow, distinct replay Shadow, three-Receipt verification, semantic comparison, and selectors; once Promotion evidence is present, enforce closed top-level/job/step authority and control key sets, reject duplicates, unknown keys, `continue-on-error`, and unsupported timeouts; parse job/step `if` and `shell`, fail on disabled/ambiguous evidence, accept reachable shell functions only by expanding their exact call sites, and ignore comments, echo/printf text, heredoc bodies, quoted dead text, constant-false branches, and commands after unconditional `exit`/`return`; require validate -> fresh -> replay, then allow comparison and all three unique verifications in either order; account for exactly one validate, two Shadows, three unique verifications, and one comparator, rejecting every extra relevant invocation;
4. resolve exactly one active Manifest selector and one canonical Receipt selector;
5. read those files as bounded regular files inside the repository, rejecting a symlink at every path component;
6. resolve the Manifest-declared checker ledger and exactly one matching release entry;
7. verify ledger raw digest, checker version, source/release commit ancestry, and release bindings;
8. enumerate/hash every release bundle path, compare it with release-commit bytes, recompute the documented bundle digest, and parse/apply bundled schemas without copying them into this skill;
9. compare Manifest and canonical Receipt candidate/source/baseline/checker bindings;
10. find the base attempt's direct Closure and lifecycle Registry, if present;
11. require a workflow-selected machine re-affirmation descriptor with exactly one direct base, exact base Manifest/Receipt/Closure/Registry hashes, the revision Manifest but no future Receipt hash, unchanged candidate/source/checker bindings, reviewed baseline-only delta, and evidence-before-registered-execution ordering;
12. emit only hashes, counts, enum states, and redacted references.

Fail closed when:

- more than one workflow or selector can be authoritative;
- a selector escapes the repository, is a symlink, is not a regular file, or is oversized;
- any authoritative input is ignored/untracked, differs from current HEAD bytes, or has mode drift;
- an additional `promotion:*` script exists or any public operation maps to the wrong native subcommand;
- the selected job contains a wrapper/indirection, network/remote command, or direct deploy/cloud/database/provider CLI, or its inline comparator has an executable/interpolated throw payload;
- the selected Promotion job contains a reachable plain `JSON.parse` outside the one exact proven semantic comparator program;
- the checker ledger is absent, ambiguous, or disagrees with the Manifest;
- the canonical Receipt binding differs from the Manifest;
- `liveAllowed` is not explicitly false;
- an expected HEAD is supplied and does not equal the observed HEAD;
- JSON or native output is malformed.

Every authoritative JSON read uses the same bounded recursive strict parser before ordinary semantic validation. Buffer decoding is fatal UTF-8, numeric overflow is rejected rather than normalized to a non-finite value, and byte/depth/work limits remain active. Duplicate keys at any nesting level fail closed with a redacted error that does not disclose the duplicated key or value. This includes current files, commit-tree blobs, checker schemas, native output, and canonical/fresh/replay CLI inputs.

When a nested selected Manifest has no workflow-selected machine descriptor, do not erase the discovery result. Mechanically resolve the nearest ancestor containing one complete Manifest/Receipt pair, skipping incomplete intermediate records; compare candidate/source/baseline/checker bindings; and retain the original attempt's deeply verified Closure/Registry only as historical evidence. Emit `relation=unresolved-reaffirmation`, `status=blocked`, `currentness=stale`, and `EXPLICIT_REAFFIRMATION_DESCRIPTOR_REQUIRED`; block every native wrapper operation. Directory names and depth never imply authorization. If candidate/source/checker changed, require a new immutable attempt.

## Audit response contract

Project the discovered envelope into the audit answer without dropping fields:

1. State that the active Manifest and canonical Receipt were selected by the current tracked workflow, and emit each redacted reference and raw SHA-256. Never substitute a guessed release, attempt directory, or candidate path.
2. Show the direct base and active revision as separate rows or evidence layers. Emit `candidateChanged`, `sourceChanged`, `checkerChanged`, `baselineChanged`, and `historicalClosureOverwritten` exactly as observed.
3. Emit relation, status, currentness, lifecycle state, Closure scope, live boundary, and `liveAllowed=false`. A valid base transition remains `historical-direct-base` and cannot be copied to the active revision.
4. Show canonical Receipt file/digest verification separately from native validate output, canonical/fresh/replay comparison, and Closure/Registry finalization. If a layer was not run or is missing, say so rather than borrowing authority from another layer.
5. Emit role evidence as `N evidence records`. Reviewer independence is a separate claim that requires its own verified evidence; file count alone never proves it.
6. Emit only hashes, commits, enum states, counts, fixed issue codes, and redacted references. Do not emit raw selectors, paths, run IDs, or protected content.

Use `assets/promotion-readiness-report.template.md` for this projection. Every required field must be populated, marked `unknown`/`not-run`, or named as a blocker; a generic prose summary is not a substitute.

## Version independence

Do not assume a checker release, attempt number, jurisdiction/curriculum case, fixed Manifest schema filename, or fixed candidate artifact IDs. Discover the current release from the selected Manifest and ledger. If the repository changes its public CLI shape, compare only the fields its authoritative exported result actually contains and fail closed on an unknown shape. Never synthesize omitted fields from discovery.

Do not reproduce candidate-specific semantic validation. The repository-native checker remains the only authority for its content contract and protected runtime graph.

Semantic comparison may be an exact external comparator or a strict inline workflow program. An external entry is authoritative only when its tracked/current bytes are release-bound in the checker bundle. An inline `node --input-type=module -e` comparator is authoritative only as part of the tracked/current workflow: prove all three Receipt arguments exactly once, passing/non-live checks, 64-hex semantic digests, equality, and throwing mismatch paths, then expose its workflow and program hashes as non-authoritative discovery metadata. Permit only inert literal throw text or the exact locally proven digest-list interpolation; reject any other interpolation or call. Never pretend the inline program is part of the checker release.

Trusted comparison discovery additionally binds the selected Manifest to the tracked canonical Receipt, its raw SHA-256, Git blob/mode, and execution commit. The public CLI reads the supplied canonical bytes and requires their identity to equal that tracked artifact; all canonical/fresh/replay binding projections must equal the trusted Manifest/canonical execution projection. A caller-supplied schema or a consistently rehashed alternate candidate is never authority.

## Routing collisions

- Ordinary mathematical, curriculum, localization, or age-appropriateness acceptance belongs to A18 and `mais-content-qa-approval-workflow`.
- Machine reviewer behavior and exact-package machine evidence belong to `mais-rsi-machine-qa-workflow`.
- Natural-population prevalence and generalization belong to the natural-sample evaluation skill.
- Dirty-tree slicing, build/CI collection, Vercel preview/production, same-SHA live readback, and deployment rollback belong to `mais-release-hygiene-deploy-workflow`. Promotion owns the exact candidate-to-Shadow proof and produces only the input handoff. The phrase “release readiness” alone routes to release hygiene unless an exact Manifest/Receipt/attempt/currentness question is present.

Trigger this skill on candidate Manifest/Receipt, A23, Shadow, checker release, currentness, attempt disposition, immutable promotion evidence, or baseline re-affirmation. Do not trigger on the phrase “release readiness” alone.
