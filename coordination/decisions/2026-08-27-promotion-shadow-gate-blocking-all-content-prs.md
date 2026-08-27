# Decision: close the `us-ca-math-rag-v2-g6-ratios-v2` pilot; the required gate needs rescoping separately

- **Date:** 2026-08-27 (Asia/Hong_Kong)
- **Raised from:** `i18n/ca-translation-scaffold` (PR #174), blocked by the required `promotion-shadow-gate` check
- **Status:** **RECOMMENDED — close the pilot.** Two follow-up actions are owner-gated and deliberately not taken here.

## The problem

`promotion-shadow-gate` is a **required status check** on `main`. It runs on **every** pull request — `.github/workflows/promotion-shadow.yml` triggers on `pull_request` with no `paths` filter and no job `if:` — and validates one hardcoded manifest:

```
PROMOTION_MANIFEST: coordination/integration/pilots/us-ca-math-rag-v2-g6-ratios-v2/attempt-007/promotion-manifest.v2.json
```

That manifest pins `targetBaselineCommit: 14a041f372`. `collectV2BaselineProof`
(`coordination/integration/v2/promotion-gate-v2-lib.mjs:975`) diffs `targetBaselineCommit..HEAD` across the protected live roots and fails if any changed path classifies as runtime rather than test-code.

**Consequence: no pull request that touches live content can merge.** Verified failing today on `i18n/ca-translation-scaffold`, `codex/a12-a22-production-app-storage-schema-20260827` and `codex/a12-auth-private-no-store-20260827`.

`main` stays green only incidentally: its two changed live-root files since that baseline are both `*.test.ts`, which classify as test-code and are allowed.

## Decision: close the pilot, do not open attempt-008

**1. Closure is the designed next step, not another attempt.** The finalization library already hardcodes this attempt as the closure target — `coordination/integration/finalization/promotion-shadow-finalization-v2-lib.mjs:21-23` names `attempt-007/shadow-closure.v2.json` and `attempt-007/lifecycle-registry.v2.json`, neither of which exists yet. The machinery was written for closing attempt-007.

**2. The unit is shadow-only and reaches no student.** `liveAllowed`, `integrationAllowed`, `previewAllowed`, `deployAllowed` are all `false`.

**3. Its own blockers are all open** — `LIVE_LOCALIZATION_MISSING`, `LIVE_INTEGRATION_UNPROVEN`, `LIVE_RELEASE_UNPROVEN`.

**4. Three consecutive attempts have failed** without reaching `shadow_passed`: 005 `V2_TARGET_BASELINE_DRIFT`, 006 `V2_GIT_ANCESTRY_INVALID`, 007 `V2_TARGET_BASELINE_DRIFT`. Two of the three are the same baseline-freshness failure, which will recur for any attempt frozen against a moving repository.

**5. Attempt-008 would require forging nine independent sign-offs.** Each attempt carries evidence files for `A21 A18 A23 A04 A05 A11 A22 A24 A25`, each asserting `result: "pass"` for that role's independent review. `AGENTS.md:322` states the promotion chain "A21 → A18 → A24 → A23 → A04/A05/A11/A22" and that it must not be bypassed. Those attestations must come from their owning roles. **They were deliberately not authored in this session**, and no scheduling pressure justifies writing them: they are the record the project uses to decide what is safe to ship.

## What was done here

- `attempt-007/attempt-disposition.v2.json` — the factual disposition attempt-007 was missing (005 and 006 both have one). It records only the reproducible validation output (`blocked`, exit 2, `V2_TARGET_BASELINE_DRIFT`, 6 drifting paths, manifest `rawSha256 a5a4fe98…`) and is explicitly marked as not an owner sign-off.

## What is still owner-gated

**A. Closure itself.** `promotion-shadow-closure.v2` requires `receiptDigests`, `legacyDisposition`, `unmetShadowConditions`, `liveBlockers` and a `trustBoundary` that states *"GitHub API authenticity requires independent repository-admin readback."* It is an A23/A25 finalization act with an independent-readback requirement, so it is not produced here.

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

Close the pilot (A23/A25), and separately rescope the required check so that one frozen shadow pilot cannot block unrelated content work. Until (B) is done, **every content PR in this repository is unmergeable.**
