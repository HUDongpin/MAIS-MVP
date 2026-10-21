## Owner-Delegated Autonomy — Rule Copy Preservation And Alignment

The owner approved this delegation on 2026-09-08. Codex may independently execute the bounded operations below after checking their conditions; it must not ask for repeated approval of an already-authorized step. This is owner-delegated execution authority, not permission to create, expand, or override its own authority.

### Authorized operation class

For owner-designated worktrees, an exact file allowlist, and an owner-approved immutable source commit, Codex may perform read-only preflight; create a new restricted custody directory outside the target worktrees; copy allowlisted originals and non-sensitive recovery metadata; verify every copy by SHA-256; rehearse file recovery inside that custody directory; update only designated alignment targets to the approved commit's exact bytes after custody verification succeeds; and create append-only execution receipts and postflight proof.

A future batch requires owner designation of its exact targets, original hashes, approved source commit/destination hashes, and custody path. Discovery, similarity, passing checks, or this operation-class description alone cannot authorize additional worktrees or files. A10 owns rule alignment; A25 owns custody inventory/review. Their role-specific default write restrictions are excepted only for these explicitly delegated file operations, not for other Git mutations.

### Mandatory boundaries and exception handling

- System/runtime restrictions, tool approval decisions, and later explicit owner instructions take precedence. Never bypass a rejected action.
- Bind physical paths, Git common directory, branches, HEAD/tree, original hashes, and destination hashes. Revalidate ownership, relevant locks, active-writer/process holds, relevant Git state, and live main before mutation.
- Preserve unrelated changes, original custody records, secrets, and protected evidence. Do not read or copy credential files under this delegation.
- Do not require old worktrees to become Git-clean; do not restore old HEAD content merely to clear dirty status.
- Do not stage, commit, create/switch branches or worktrees, stash, reset, rebase, push, merge, deploy, dispatch/rerun workflows, terminate processes, or delete files, branches, worktrees, remote refs, or evidence under this delegation.
- Do not modify installed Skills, shared Git configuration, credentials, or historical Promotion Manifest/Receipt/Closure/Registry evidence.
- Do not alter this delegation or another authorization control to make an otherwise unauthorized action permissible. The exact AGENTS.md alignment below is an owner-approved byte replacement only, not permission to synthesize or expand policy.
- An unexplained target, baseline, hash, ownership, process, or relevant Git-state drift stops the dependent mutation. Do not substitute a newer baseline, expand the allowlist, or weaken a failed check; continue only independent authorized work and report the exception.
- Resume from verified per-step receipts, never replay completed preservation/mutation steps. Custody directories must be new; existing or partially populated destinations require receipt-based reconciliation, not overwrite.
- Writing a delegation is not proof its operations ran. Report policy installation, file execution, Git state, and cleanup separately. No batch runs merely because this file was read during an unrelated task.
- This section is authoritative for the named owner-delegated batch even if an older companion summary omits it; it does not authorize editing CLAUDE.md or propagating policy to other checkouts. More-specific instructions are not silently overwritten to bypass an unresolved ownership conflict.

### Approved batch: A10-rule-copy-preserve-and-align

Owner-approved scope recorded 2026-09-08. This batch may proceed without another per-step owner approval when its frozen conditions hold. The task that installs this section modifies only this primary AGENTS.md; it does not itself execute the batch.

Common Git directory: `/Volumes/Starship/MAIS-MVP/.git`.

| Binding | W1 | W2 |
| --- | --- | --- |
| Exact worktree | `/Volumes/Starship/MAIS-MVP/.worktrees/a10-agentops-suite-currentness-20260828` | `/Volumes/Starship/MAIS-MVP/.worktrees/a10-qa-skill-distillation-20260827` |
| Exact branch | `codex/a10-agentops-suite-currentness-20260828` | `codex/a10-qa-skill-distillation-20260827` |
| Expected HEAD | `2e95fcc9dbcae2b73227c7fb16553bf17e991265` | `a49914a4dc34212354a64dbcad13c28f899c3782` |
| Expected tree | `d8a9724da609d379885ecf53ebf455e5c52b4db7` | `fe0740986e958079cd5ec893f33904eb2333b153` |
| Directory device / inode | `16777244 / 47230782` | `16777244 / 43138066` |

Approved source commit and expected live main: `690c49aabcbccd93d9755683f955a5d9ac9a7bc9`. Do not follow a moving main ref for replacement bytes.

New custody directory: `/Volumes/Starship/MAIS-A10-rule-copy-custody-20260908`. Do not create it during read-only review. Under batch execution, use directory mode 0700 and custody-file mode 0600; record original file modes separately. Preserve separate `W1/original/<relative-path>` and `W2/original/<relative-path>` copies, not hard links to source files. Original bytes total 286,268 per worktree, 572,536 across both, excluding receipts and rehearsal copies.

The following exact relative paths apply separately beneath W1 and W2; they are not globs or authorization for whole directories. M means unstaged tracked modification; U means untracked. Both worktrees have 24 M + 4 U, no staged entries. Every listed SHA-256 is the approved original-byte digest in both worktrees.

| Exact relative path | State | Original SHA-256 |
| --- | --- | --- |
| `AGENTS.md` | M | `288fb188baac3fd1c5eb4c067cb68398421b34ba86f23ec9f053e617c5fb0679` |
| `coordination/agent-guidance/coordination-and-reporting.md` | U | `0b540a59ab4fb7a7383386bd1cd8f22293762ac27cfda049bac8d559812b0baa` |
| `coordination/agent-guidance/roles-and-ownership.md` | U | `4f89eea31fcb465fe8927490970ce961ebe59907a88f5ec7346d11aa85de1ffa` |
| `coordination/agent-guidance/verification.md` | U | `657a41965d0db876661b8b045120048aaa3e812defc71033d38b58a7ef1e26a5` |
| `coordination/skills/mais-content-promotion-gate/SKILL.md` | M | `56f2770e7ee00856179e3d118de74849f9de5957cafd3d2253ecaf833880b9cf` |
| `coordination/skills/mais-content-promotion-gate/evals/evals.json` | M | `7e762df7877d00aad93d020486114c4e0175e71dd89490b01fb33f48d78a3a8f` |
| `coordination/skills/mais-content-promotion-gate/references/core-contract.md` | M | `31930859eb6a78a9364de16d1cfd715b359ac958a70917d0fda3cc6c616cff02` |
| `coordination/skills/mais-content-promotion-gate/references/discovery-and-routing.md` | M | `0d02c09880adcf38e3cb97d921f0ad75c0f758e484606252110cf9f14a60ea50` |
| `coordination/skills/mais-content-promotion-gate/references/lifecycle-and-invalidation.md` | M | `45fad9fde1a81b4f0e32fa6147c867395df6cf602d61b3ea046c44b06a2b8bb3` |
| `coordination/skills/mais-content-promotion-gate/references/release-handoff.md` | M | `ecfbcb44a2e614e3a0ba37232a70abbdecf3f49192828c17e7d45406172584a2` |
| `coordination/skills/mais-content-promotion-gate/references/response-cards.md` | M | `d7952606e39820007f9b52bbb3194aef3b01efcf3d829de73f3a9508e0900a62` |
| `coordination/skills/mais-content-qa-approval-workflow/SKILL.md` | M | `4c69b169ace382381d4e29f845351b9bd9ace23fdaaac4bb467917a527b4d69d` |
| `coordination/skills/mais-natural-sample-evaluation/SKILL.md` | M | `cddbb6ae72c1135a096fd285d7f529fa3d6168f4d9291fdfe6b0ea4caff0a7eb` |
| `coordination/skills/mais-natural-sample-evaluation/evals/evals.json` | M | `79cc494cab64c1941e5fbbbcd5cca93ee1f9b67c30ea849e38d17d69e4a30774` |
| `coordination/skills/mais-natural-sample-evaluation/references/mais-ca60-case-study.md` | M | `3c315f9bc41e9bf4871ec922d66b936f2ca44102554487743ba7659bb1ee00e3` |
| `coordination/skills/mais-natural-sample-evaluation/references/provider-authority-contract.md` | M | `a1d59c53669a50804d0d8d903f1d2bb3234b9861c20b4f6f76790be49977aab0` |
| `coordination/skills/mais-natural-sample-evaluation/references/registered-evaluation-state-machine.md` | M | `753e698566ee58f9b79eee5e87061fa06c61f28fed074ee3cb716fec358f9eff` |
| `coordination/skills/mais-natural-sample-evaluation/references/response-cards.md` | M | `42adf047cf59e38f1ee8d5d265356db17c5139445f65c8c3b55c3ef6d837bd5c` |
| `coordination/skills/mais-release-hygiene-deploy-workflow/SKILL.md` | M | `8a7b94b7ccd6a0ab73c6f76287abf91447e96de9d5bbf2d1e1bb4f4a1b5e0cff` |
| `coordination/skills/mais-release-hygiene-deploy-workflow/evals/evals.json` | M | `e969c0966470b65970e61dfeca8e6c4816292325721a42abfc8c14f42e93f2a3` |
| `coordination/skills/mais-release-hygiene-deploy-workflow/references/outcomes-and-reporting.md` | U | `ae3aebe433315fc03bfdacf6f5baa780f3b6719554a0fbcf006fe67751d73ab7` |
| `coordination/skills/mais-release-hygiene-deploy-workflow/references/workflow.md` | M | `5a55ea19c3f6ada859dbc9e6fe3bffb6aa2f5fce9bed780bf0832d4a24898f33` |
| `coordination/skills/mais-rsi-machine-qa-workflow/SKILL.md` | M | `a7c495cea218041aae3ba35707a21c3b3fd93c4f8013e0a5b10112ef7d7934be` |
| `coordination/skills/mais-rsi-machine-qa-workflow/evals/evals.json` | M | `6cb631704955139705e040d6c100e4be23f27049c4a43057d8cff1b70854653c` |
| `coordination/skills/mais-rsi-machine-qa-workflow/references/evidence-and-receipt-contract.md` | M | `c8443dc17942260cf0a9d84c154c062d49d0980f51567909411efb67d7d85333` |
| `coordination/skills/mais-rsi-machine-qa-workflow/references/mais-routing-and-currentness.md` | M | `89757c8983c1e944b8e7dc0788978c025d8a379203d3870c71995c684c0536af` |
| `coordination/skills/mais-rsi-machine-qa-workflow/references/remediation-and-independence.md` | M | `4f99c5db66cdd0b8fb72de0d501549137f4378943edf7ff3464a19b61bad5c2b` |
| `coordination/skills/mais-rsi-machine-qa-workflow/references/response-cards.md` | M | `e20aa42413ea8906f1fe683ad442fc3e6d3a8836ae32543e80f8e1eefc867d55` |

Original status fingerprint for each worktree: SHA-256 of the raw output of literal-bound `git status --porcelain=v1 -z --untracked-files=all` is `eec34236d9ee94fbdf0b06a829da5d5602029985b5f38ecacc60071a22933fec`.

Original file-list fingerprint for each worktree: `afc8e7991e27d0a8e5d84e8b6badc103db76e3e7f7d166a9641836481714ff1f`. Its serialization is UTF-8 `JSON.stringify(rows) + "\n"`, where each row is `[relativePath, twoCharacterPorcelainStatus, byteLength, originalSha256]`, sorted by ascending relative-path string. Preserve the leading space in `" M"`; untracked status is `"??"`. The explicit table and exact targets remain mandatory; the aggregate digest is not a substitute for per-file verification.

Only these three paths in each worktree (six files total) may be updated after preservation:

| Exact relative path | Required destination SHA-256 |
| --- | --- |
| `AGENTS.md` | `68222b0669b564986285b1a4a6a31a39a09bd23e625b1b388ad6b729f665876a` |
| `coordination/skills/mais-content-promotion-gate/references/core-contract.md` | `f680c53b8e09ab9d83d4565f294afc660d8266b76f50f236d79b253f9a0e2f24` |
| `coordination/skills/mais-natural-sample-evaluation/SKILL.md` | `151067f194ede2ec9f235574fb6e7aaa51f8e476fee0d00d489d2579029d99e8` |

Execution order and acceptance:

1. Freshly validate the frozen bindings, all original hashes, literal worktree status, ownership/active-writer holds, locks, relevant refs/topology, and custody-path absence. The known addition of this delegation to the primary root is not a W1/W2 content change and does not authorize other root edits.
2. Create preflight/allowlist records and preserve all 56 original files. Verify 56/56 original-to-custody hashes. Rehearse recovery into an independent subdirectory inside the custody directory, verify bytes and recorded original modes, and fsync custody files, receipts, and parent directories before updates.
3. Persist a started receipt, then update only the six targets to exact bytes from the approved commit, using scoped file editing. Keep the other 50 source files untouched, including all eight untracked copies across W1/W2. Record per-target outcomes; a partial failure is not permission to restore or redo completed changes.
4. Verify all six destination hashes, the other 50 original hashes, preserved custody hashes, and unchanged index/HEAD/branches/refs/worktree registrations. Produce and seal postflight and integrity manifests.
5. Leave both worktrees and all original custody records in place. This operation does not promise clean worktrees, branch convergence, merge/deploy readiness, or space recovery. No build or output-producing tests are required; perform byte/path/reference/status checks only. Recovery back into a real worktree requires separate owner authorization.

