# Decision: close the `us-ca-math-rag-v2-g6-ratios-v2` pilot; the required gate needs rescoping separately

- **Date:** 2026-08-27 (Asia/Hong_Kong)
- **Raised from:** `i18n/ca-translation-scaffold` (PR #174), blocked by the required `promotion-shadow-gate` check
- **Status:** **CORRECTED 2026-08-27.** attempt-007 **passed**. Neither option originally put to this session can unblock the gate — proof below. The only unblock is a required-checks change.

## The problem

`promotion-shadow-gate` is a **required status check** on `main`. It runs on **every** pull request — `.github/workflows/promotion-shadow.yml` triggers on `pull_request` with no `paths` filter and no job `if:` — and validates one hardcoded manifest:

```
PROMOTION_MANIFEST: coordination/integration/pilots/us-ca-math-rag-v2-g6-ratios-v2/attempt-007/promotion-manifest.v2.json
```

That manifest pins `targetBaselineCommit: 14a041f372`. `collectV2BaselineProof`
(`coordination/integration/v2/promotion-gate-v2-lib.mjs:975`) diffs `targetBaselineCommit..HEAD` across the protected live roots and fails if any changed path classifies as runtime rather than test-code.

**Consequence: no pull request that touches live content can merge.** Verified failing today on `i18n/ca-translation-scaffold`, `codex/a12-a22-production-app-storage-schema-20260827` and `codex/a12-auth-private-no-store-20260827`.

`main` stays green only incidentally: its two changed live-root files since that baseline are both `*.test.ts`, which classify as test-code and are allowed.

## Correction: attempt-007 did not fail

An earlier version of this record said `repair_required`. That was wrong. `attempt-007/shadow-receipt.v2.json` records `result: "pass"` with `recommendedState: "shadow_passed"`, and both postrun artifacts pass (A11 independent replay, A22 shadow isolation). The attempt executed and succeeded.

What fails is **re-validation of a frozen, already-passed attempt on every later pull request**. `targetBaselineCommit` is immutable and the repository advances past it, so `V2_TARGET_BASELINE_DRIFT` is permanent and unavoidable.

## Neither offered option can unblock this gate

**attempt-008 cannot.** A replacement attempt exists to retry a *failed* attempt; this one passed. It would also require nine fresh owner attestations (`A21 A18 A23 A04 A05 A11 A22 A24 A25`) each asserting `result: "pass"` for that role's independent review. `AGENTS.md:322` forbids bypassing that chain.

**Closure cannot, and this is structural.** `validateA25Closeout` (`promotion-shadow-finalization-v2-lib.mjs`) requires `role: "A25"`, `result: "pass"`, all ten owners at `finalState: "reviewed commit"`, **and a `mergeCommit` matching a post-merge proof on `main`**. Closure is a *post-merge* artifact. It cannot be the thing that unblocks a *pre-merge* required check — the ordering makes it impossible, independent of who authors it.

**Rewiring the gate cannot either, legitimately.** `scripts/promotion-shadow-workflow-v2.test.mjs` asserts *"Promotion Shadow v2 CI validates current HEAD and replays the exact canonical execution commit"*. Making the workflow skip validation would defeat a control the repository deliberately guards with a test.

## Decision: the pilot is shadow-passed and awaiting finalization

**1. Closure is the designed next step, not another attempt.** The finalization library already hardcodes this attempt as the closure target — `coordination/integration/finalization/promotion-shadow-finalization-v2-lib.mjs:21-23` names `attempt-007/shadow-closure.v2.json` and `attempt-007/lifecycle-registry.v2.json`, neither of which exists yet. The machinery was written for closing attempt-007.

**2. The unit is shadow-only and reaches no student.** `liveAllowed`, `integrationAllowed`, `previewAllowed`, `deployAllowed` are all `false`.

**3. Its own blockers are all open** — `LIVE_LOCALIZATION_MISSING`, `LIVE_INTEGRATION_UNPROVEN`, `LIVE_RELEASE_UNPROVEN`.

**4. Attempts 005 and 006 failed, but 007 succeeded** — 005 `V2_TARGET_BASELINE_DRIFT`, 006 `V2_GIT_ANCESTRY_INVALID`, **007 `pass`**. The pilot reached `shadow_passed` on the third try. Its remaining state is finalization, which is a post-merge act.

## What was done here

- `attempt-007/attempt-disposition.v2.json` — the factual disposition attempt-007 was missing (005 and 006 both have one). It records the passing shadow outcome, the reproducible re-validation output (`blocked`, exit 2, `V2_TARGET_BASELINE_DRIFT`, 6 drifting paths, manifest `rawSha256 a5a4fe98…`), and is explicitly marked as not an owner sign-off. An earlier version of it wrongly said `repair_required`; that is corrected.

## What is still owner-gated

**A. Closure itself.** Requires an A25 closeout asserting all ten owner packages reached `finalState: "reviewed commit"`, plus a `mergeCommit` matching a post-merge proof on `main`. It is both an owner attestation and a post-merge act, so it is not produced here — and, as shown above, it could not unblock this PR even if it were.

**B. The gate rescope — and this is the one that actually unblocks.** ⚠️ **Closing the pilot does NOT clear the check.** The gate validates a hardcoded manifest path and does not consult the lifecycle registry, so it will keep failing for every content PR regardless of the pilot's state.

Unblocking requires one of:

1. **Remove `promotion-shadow-gate` from the required status checks** on `main` (leaving it as an informational workflow), or
2. **Scope the workflow** to `paths: coordination/integration/**` *and* remove it from required — a skipped required check never reports and blocks forever, so path-scoping alone makes things worse, or
3. Re-point `PROMOTION_MANIFEST` at a live pilot once one exists.

Option 1 is the minimal unblock:

```bash
gh api -X PATCH repos/HUDongpin/MAIS-MVP/branches/main/protection/required_status_checks \
  -f 'contexts[]=validate'
```

This was **not run**. This session holds `admin` on the repository, but permission is not authorization: dropping a required governance check is a merge-control change, it was not among the options put to this session, and it should be an explicit owner decision recorded in its own right.

## Recommendation

Finalize the pilot after merge (A23/A25), and **first** rescope the required check so that one frozen, already-passed shadow pilot cannot block unrelated content work. Until the required-checks change is made, **every content PR in this repository is unmergeable** — this is not specific to PR #174.
