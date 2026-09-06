# Promotion Shadow Bootstrap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let PR #220's automatic `promotion-shadow-gate` run fresh/replay Shadow against registered execution commit `3ccdb882d705516bfdf18cd8925c3b75a6550b8e` before the active canonical Receipt exists, upload the complete genuine intermediate artifact envelope while remaining red, and pass later only after a distinct append-only descendant stores the exact canonical Receipt.

**Architecture:** Preserve the installed Promotion skill's fixed five-file semantic authority graph and its existing workflow grammar. Change only the already-approved inline canonical resolver: one bounded read-only `git show` history call derives the unique commit that first introduced the exact active Manifest and descriptor together, while current bytes are bound by Git blob IDs computed locally. The workflow's seven-file artifact envelope stays exact; during bootstrap the canonical native verification is a genuine error report for the absent file and the existing semantic decision is blocked, while fresh/replay and their native verification evidence are still uploaded before final enforcement. Once the canonical Receipt is committed at a descendant, the same unbranched full workflow performs the existing three verifications and comparator and may pass.

**Tech Stack:** GitHub Actions YAML, inline Node.js ESM, strict repository JSON parser, one `git show --raw -z` history read, `node:test`, installed Promotion discovery parser.

---

### Task 1: Freeze baseline and authority constraints

**Files:**
- Read: `.github/workflows/promotion-shadow.yml`
- Read: `coordination/integration/**/runtime-policy-exact-delta-20260901/reaffirmation.v2.json`
- Read: `coordination/integration/**/runtime-policy-exact-delta-20260901/promotion-manifest.v2.json`
- Read: `/Users/dongpinhu/.codex/skills/mais-content-promotion-gate/scripts/discover-promotion-gate.mjs`

- [x] **Step 1: Prove exact isolated state**

Expected and observed: named isolated branch, HEAD `3ccdb882...`, empty exact status, no visible holder, future active Receipt absent from the execution tree.

- [x] **Step 2: Prove the pre-change baseline in an ASCII clone**

Run `npm run test:promotion-gate` at exact `3ccdb882...` in a task-owned clean ASCII clone.

Expected and observed: `76/76 PASS`; clone moved recoverably to Trash after holder check.

- [x] **Step 3: Freeze the installed semantic authority**

Keep these raw SHA-256 values unchanged:

```text
scripts/promotion-required-check-semantic-rescope-cli.mjs
9f3c56f59f29858485bf85751b857ce26188439648c2a6a8ef9fde91c3c23e8b

scripts/promotion-required-check-semantic-rescope.mjs
0b73e3c50b9065f1323e5953626901b00c9c928e0678e1d5eec22b8ce29d8c2c
```

Any change to either file is out of scope because it would trigger `SEMANTIC_REQUIRED_CHECK_AUTHORITY_DRIFT`.

### Task 2: TDD the one-command history resolver

**Files:**
- Modify: `scripts/promotion-shadow-workflow-v2.test.mjs`
- Modify: `.github/workflows/promotion-shadow.yml`

- [x] **Step 1: Fix only the workflow-test Unicode path harness**

Replace URL `.pathname` use with `fileURLToPath(import.meta.url)` so the test can run from the authorized Unicode worktree. This is test harness plumbing, not Promotion authority.

- [x] **Step 2: Write the failing bootstrap regression first**

Extract the resolver's inline Node program from the parsed workflow and execute it in a real temporary Git fixture with:

```text
evidence commit
  -> binding commit adding exact Manifest + exact descriptor
  -> workflow-fix descendant with active canonical Receipt absent
```

Expected RED: the current resolver fails with `ENOENT` because it reads the Receipt before deriving execution.

- [x] **Step 3: Add fail-closed fixture mutations**

The same real-program fixture must reject:

```text
descriptor self-reference authority keys
Manifest or descriptor modification after introduction
different introduction commits
delete/re-add history
Receipt present at the execution commit
current Receipt with wrong Manifest, execution commit, or liveAllowed=true
non-direct evidence -> execution ordering
Receipt added on an evidence sibling branch and merged beside the binding
Receipt mutation, deletion, or delete/re-add after storage
oversized inputs, workspace mismatch, unsafe copy targets, or invalid UTF-8 Git paths
```

- [x] **Step 4: Implement the minimal inline resolver**

The inline program must retain exactly one child process matching the installed policy:

```js
execFileSync("git", ["show", /* bounded raw NUL history arguments */], {
  cwd: repoRoot,
  encoding: null,
  maxBuffer: 32 * 1024 * 1024
});
```

It must:

```text
strict-parse the tracked descriptor
reject execution/storage/finalization/Receipt-digest self-reference keys
bind descriptor revision Manifest path and SHA-256
compute current Manifest/descriptor Git blob IDs without another process
parse all commits and raw path changes from evidence..HEAD
require one shared first-add commit whose only parent is evidenceCommit
require no later Manifest/descriptor mutation
prove the Receipt absent at execution
allow current Receipt absence without creating a copy
validate and copy a present current Receipt exactly as before
append only execution_commit=<derived SHA> to GITHUB_OUTPUT
```

It must never use current HEAD, `HEAD^`, an observer commit, or caller-provided SHA as registered execution authority.

- [x] **Step 5: Verify GREEN**

Run:

```text
node --test --test-concurrency=1 scripts/promotion-shadow-workflow-v2.test.mjs
```

Expected: all workflow tests pass, including real bootstrap/full resolver fixtures.

### Task 3: Preserve full workflow and installed-parser compatibility

**Files:**
- Modify: `scripts/release-governance.test.mjs`
- Read-only verify: `scripts/promotion-required-check-semantic-rescope.mjs`
- Read-only verify: `scripts/promotion-required-check-semantic-rescope-cli.mjs`

- [x] **Step 1: Add RED governance assertions**

Require that the resolver uses one exact `git show` call, does not require the canonical Receipt before execution resolution, preserves the existing exact comparator, keeps one validate/two Shadows/three verify calls/two semantic CLI calls, and preserves upload-before-enforcement.

- [x] **Step 2: Verify the intended RED**

Expected: current Receipt-first resolver violates the new assertions.

- [x] **Step 3: Verify all governance assertions GREEN after Task 2**

Run the focused release-governance test and assert the semantic authority file SHA-256 values are unchanged.

- [x] **Step 4: Run installed workflow parser directly**

Import `parsePromotionWorkflow()` from the installed skill and parse current workflow bytes.

Expected: PASS with event-head profile, exactly one validate, fresh/replay, three verifications, one comparator, and exact semantic evaluate/verify pair.

- [ ] **Step 5: Run the complete Promotion baseline from an ASCII clone of the new commit**

Expected: all repository Promotion tests pass. Do not run native Shadow locally.

### Task 4: Review and publish the repair commit

**Files:**
- Modify: `coordination/session-logs/2026-09-01-A23-promotion-shadow-bootstrap.md`
- Create outside repository: exact spec, code-quality, A11, A22 and A25 reviews plus `MANIFEST.sha256`

- [ ] **Step 1: Commit only exact implementation paths**

Stage only workflow, two test files, the plan and the session log. Confirm the active Receipt remains absent in the commit tree.

- [x] **Step 2: Complete two-stage implementation review**

Spec review checks Option A and authorization boundaries. Code-quality review checks raw-history parsing, ambiguity, malformed bytes, size bounds, no-follow/path rules, and installed-parser compatibility.

- [ ] **Step 3: Complete independent A11/A22/A25 exact-HEAD reviews**

Every review binds the clean exact repair HEAD and evidence hashes; none grants merge/deploy/live authority.

- [ ] **Step 4: Ordinary non-force push and PR #220 fast-forward**

Recheck live main, current PR source, ancestry, branch and worktree cleanliness immediately before pushing. Never dispatch or manually rerun a workflow.

### Task 5: Verify the automatic bootstrap evidence

**Files:**
- Create outside repository: downloaded exact run artifacts, logs, reviews and SHA-256 manifest

- [ ] **Step 1: Wait for the automatic `pull_request` run at the repair HEAD**

Require exact event, workflow, job and SHA.

- [ ] **Step 2: Require intended intermediate execution**

Evidence must prove:

```text
current validation completed
detached execution worktree is exactly 3ccdb882...
fresh and replay Shadow both ran
fresh and replay native Receipt verification passed
canonical copy remained absent
canonical verification is a genuine native error artifact, not a placeholder
semantic decision remained blocked
the exact seven-file artifact set uploaded before final failure
```

- [ ] **Step 3: Reject accidental green or incomplete bootstrap**

Any current-HEAD execution, absent replay, fake canonical bytes, missing artifact, live permission, skipped upload or successful required check invalidates the run.

### Task 6: Store the verified canonical Receipt append-only

**Files:**
- Create: `coordination/integration/**/runtime-policy-exact-delta-20260901/promotion-shadow-receipt.v2.json`
- Modify: `coordination/session-logs/2026-09-01-A23-promotion-shadow-bootstrap.md`
- Create outside repository: Receipt provenance, A11/A22/A25 transport reviews and `MANIFEST.sha256`

- [ ] **Step 1: Select only the verified automatic fresh Receipt bytes**

Recompute raw/native schema and binding evidence; require execution `3ccdb882...`, exact Manifest SHA, unchanged candidate/source/baseline/checker, zero external side effects and `liveAllowed=false`.

- [ ] **Step 2: Create a distinct append-only storage commit**

Add only the exact active canonical Receipt and evidence log. Do not modify the descriptor, Manifest, historical Receipt, Closure or Registry.

- [ ] **Step 3: Independently verify the transport**

Prove execution -> storage ancestry, Receipt absence at execution, exact regular Git blob/mode/SHA at storage, and no merge/deploy/live authority.

- [ ] **Step 4: Ordinary non-force push and PR fast-forward**

Allow only the resulting automatic pull-request checks.

### Task 7: Verify full required checks and stop before integration

**Files:**
- Create outside repository: full-run artifacts, required-context readback, postflight and `MANIFEST.sha256`

- [ ] **Step 1: Verify the full automatic chain**

Require execution `3ccdb882...`, exact committed canonical Receipt, new fresh/replay with distinct identities, three passing native verifications, equal semantic digests, exact artifact set, and `liveAllowed=false`.

- [ ] **Step 2: Read back all PR #220 checks and branch protection**

Require both `validate` and `promotion-shadow-gate` success at the exact PR HEAD.

- [ ] **Step 3: Stop before main integration**

Main merge remains unauthorized. Request separate integration authorization; do not advance PR #199/#222 evaluation until #220 is actually integrated.
