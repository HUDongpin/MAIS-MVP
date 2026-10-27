# PR298 final independent A11 review

Decision: **approved-for-exact-pr298-required-check**.

Reviewer: `/root/workflow_inventory`, acting as independent A11. Reviewed at `2026-10-27T04:55:16.000Z`, after the actual tooling commit T. This decision is limited to `exact-pr298-monitor-diagnostics-required-check-only`. No unresolved actionable finding blocks this exact admission package.

## Independently verified Git and evidence bindings

| Binding | Verified value |
| --- | --- |
| Base B | `62e471134682d26c367667dca8ecc1d96acd1ed8` |
| Source S | `fe94ba0e79c10451760c874785a0560a7ecafa43` |
| S tree | `f4ae9bec0f6d5cc666efc5194121f9c01a417564` |
| B-to-S inventory digest | `0c5df6d70dce564a584f3f9a757c24fc91c6825ec5e6ea38e8c4d08142d7867b` |
| Actual tooling T | `2f76b807aade16ed020af15d1c6fc2f74337168e` |
| T tree | `7c40e396b2ab0fce8a6028c7653f6c524873af80` |
| S-to-T inventory digest | `49a3af42bd0fdff4abcbf42e445731966dfd8f23b78f209c3e48644908ee6cb9` |
| Frozen source-checks raw SHA-256 | `4c239f77a99e21a0c7cd1d9c89f0641558fe2bf778d1dd7ab825baec2e10cd90` |

I independently reconstructed the inventories from Git raw diffs and blob contents, including before/after modes, Git object IDs and raw SHA-256 values, and recomputed their canonical digests. B-to-S is exactly the two approved monitor files. S has the ordered parents `[fa788aa4050a4ef430ae7f6079ad8dfeb9f812c9, B]`; both monitor blobs equal the original approved monitor commit. T has S as its sole parent and changes exactly four authorized tooling paths. T was committed at `2026-10-27T04:50:45Z`.

All four T file contents match both the current clean working tree and the exact pre-freeze candidate I reviewed and tested:

| T file | Raw SHA-256 |
| --- | --- |
| `.github/workflows/promotion-shadow.yml` | `141e505fb98ba8a488a47f6446305f0a2b5d0cc54177ddcd0ec5d9919a812825` |
| `docs/pr298-reviewed-code-gate.md` | `6d04503e76b0f50f9eb19ccc42ebb8ff7ccf823a65da70da90a783daa96fcb8e` |
| `scripts/promotion-reviewed-code-pr298.mjs` | `5c78ea0d41ca6f29dacc2d2392d6e2fd16e018aa6b93efa6a2472b586a4d03ed` |
| `scripts/promotion-reviewed-code-pr298.test.mjs` | `518b35e9cec160556c1192fe2bd5bd57dd290e6b590913b04bda54a5e29c2e8e` |

## Functional and false-pass review

The checker pins exact B/S identities, S's ordered merge parents, complete two-path inventory, ordinary file modes, original approved monitor blobs, and fixed source-check bytes. It requires T to be a direct child of S changing exactly the four tooling paths. E must be the unique first addition of its admission marker, have sole parent T, and add exactly seven previously absent evidence files. A PR event must identify same-repository PR298, base B and head E; an allowed main event must bind before B, after M, ordered parents `[B,E]`, and the E tree. Extra files, edited evidence, same-tree descendants, another PR, a changed base, and unsupported ancestry fail closed.

Strict JSON parsing and closed admission/review schemas remain in use. Review decisions bind the exact source, tooling, inventory and source-check identities, plus their actual report bytes and fixed independent reviewer identities. Source-check and review times must be canonical non-future UTC timestamps inside the required commit phases. These machine checks bind evidence; they do not manufacture independent review from a role label or self-consistent hashes. This report is the actual A11 contribution from the named independent reviewer.

I independently checked that the workflow is exactly the deterministic PR298 selector/mode/run/upload insertion into S's full previous workflow. Existing action pins, jobs, permissions, conditions, commands, checker files and historical evidence are preserved. A present or symlinked new marker selects the new leg, whose failure terminates under strict shell handling rather than falling back to an earlier admission.

Fresh child execution uses fixed commands and the current Node executable. The child environment omits health credentials, provider keys, database URLs, NODE_OPTIONS and NODE_PATH. It does not invoke the live monitor. Proof files require a fresh canonical private temporary directory outside the repository and exclusive creation. Successful execution requires exit status zero with no error or signal, followed by strict recursive TAP validation. Monitor titles and counts are fixed; the gate-contract count is fixed at 32 and its reviewed immutable test file supplies those contracts. Failed, skipped, TODO, malformed, truncated or mismatched reports cannot be accepted as a green result. Full materialization and preflight/currentness checks run before and after execution.

## Independently executed focused evidence

During my pre-freeze review I executed only the two authorized focused suites using the candidate's allowlisted child environment. Actual T is now proven byte-identical to that candidate. These are pre-freeze executions of those identical code bytes, not a fabricated full E check or a new Ubuntu run:

- Gate contracts: **32 passed**, zero failures/cancelled/skipped/TODO. Test-name digest `cb0ac9f575e20317351385aa7f2222c16bafca425b010800951b1345741f1e28`. Raw stdout SHA-256 `8392e6ce2af3511c5c52b1c2f58a3234f15ede07e03381b857f705aa8386d86d`.
- Offline monitor contracts: **12 passed**, zero failures/cancelled/skipped/TODO. Test-name digest `313e118d45e2228d944397fd319158d451ac0b022d44964f4d5f84dc5db47bf1`. Raw stdout SHA-256 `acd743a2f08f171232e89f699b9940505e94a90f4ba63cdbde22c8720596cd53`.
- Both fresh stderr files are empty, SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`.
- The original source monitor execution at `2026-10-27T03:25:59.997Z` remains separately frozen. Its original TAP raw SHA-256 `7014e069fcfdfc882192372a33fb4224e6aefa9f0039075282e684b8fca6279b` and exact parsed summary match source-checks.json and T's fixed CHECKS_SHA. I did not replace that evidence with the fresh run.

The reviewed monitor delta changes safe failure diagnostics only. Authentication, approved origins, no-store/cookie checks, bounded JSON, healthy-payload acceptance, retry counts/delays and the explicit drill remain intact. Output is restricted to approved origins, bounded status values, fixed diagnostic labels and allowlisted reasons; arbitrary network/response-stream messages and response bodies are excluded. The offline tests do not prove current production health.

## Scope and retained limits

This review authorizes only the stated exact PR298 required-check admission. It does not approve merging to main, deployment, Preview, a live health probe, production configuration changes, whole-pack/content promotion, historical revalidation or historical authority transfer. All six permission fields remain false: `historicalPromotionRevalidated`, `liveAllowed`, `previewAllowed`, `deployAllowed`, `wholePackAccepted`, `historicalAuthorityTransferred`.

No E commit, future PR/merge-ref/main result, or production-health recovery is claimed by this decision. E must preserve the actual final reviewer bytes and pass its real event/materialization/execution checks; Ubuntu CI must supply its own result. The existing full materialization guard remains unchanged, including its possible macOS long-path limitation. I did not execute broad application suites, native PostgreSQL work, live providers, deployment commands or authenticated production probes. I did not author or modify the candidate/checker source, alter source-repository Git state, or rewrite historical evidence; focused test suites used their ordinary disposable synthetic Git fixtures. Final review files were written only under `/private/tmp/pr298-independent/a11/final/`.
