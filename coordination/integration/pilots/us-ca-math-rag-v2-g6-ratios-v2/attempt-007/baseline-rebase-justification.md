# Target baseline re-base — justification

**Pilot:** `us-ca-math-rag-v2-g6-ratios-v2` / `attempt-007`
**Current baseline:** `14a041f372fb27fa4282104c247886ff1eea623b`
**Prepared:** 2026-08-27
**Status: PREPARATION ONLY — no evidence artifact has been re-attested.**

---

## What this document is, and is not

It **is** the measured argument that the pending runtime changes do not alter the
behaviour this pilot's evidence was validated against, so that each A-role can
re-affirm its existing finding quickly rather than re-deriving it.

It **is not** an attestation. No role has re-run its check. Nothing here permits
`scripts/rebase-promotion-baseline.mjs --write`; that script refuses until every
role in `evidenceBindings` is named in `--attested-by`.

## Why the gate fired

`V2_TARGET_BASELINE_DRIFT` blocks when live/runtime paths differ between the
evidence-bound baseline and the commit under validation.

The control has not been noisy. Between the baseline and `main`, **70 paths
changed and none of them is runtime source**:

| Area | Paths |
|---|---|
| `coordination/` | 54 |
| `scripts/` | 9 |
| `tests/` | 3 |
| `.github/` | 2 |
| `lib/` | 2 — both `*.test.ts`, classified `test-code` |

`main` validates `pass` against this baseline today. Two pending pull requests
are the first runtime changes since it was pinned:

- **#176** — `lib/server/answerMatching.ts`, `lib/server/questionStore.ts`,
  `data/topics.ts`, `data/questions.ts`, and the Hong Kong EASE question pack
- **#179** — `data/lessons.ts`, `data/visualizationLabs.ts`,
  `components/visualizations/VisualizationLabPage.tsx`

Of these, only `answerMatching.ts` can affect this pilot: its candidate practice
item (`s04-ca-rag-v2-q031-6-rp-ratios-v2`) is a short answer keyed `"12 cups"`
with `acceptedAnswers: ["12", "12 cups"]`, graded through that module.

## Measurement

Every question in the repository was graded under both the baseline
`answerMatching.ts` and the proposed one, across probes built from each item's
key, its accepted answers, its options, LaTeX-stripped and fraction-expanded
readings of the key, its bare numeric value, and two controls (`"0"`, `"999999"`).

### Verdict changes by curriculum track

| Track | Probes | Verdicts changed |
|---|---|---|
| **US_CA_MATH** | 11,217 | **0** |
| HK | 5,307 | 31 |
| MAINLAND_PEP_HIGH | 61,031 | 47 |
| US_AR_MATH | 10,057 | 4 |

### Direction of every change, all tracks

| | Count |
|---|---|
| previously **wrong** → now correct | 82 |
| previously **correct** → now wrong | **0** |

Two findings carry the argument:

1. **This pilot's curriculum is untouched.** Not one US_CA_MATH verdict changes,
   across 11,217 probes.
2. **No verdict moves in the unsafe direction on any track.** Every change accepts
   an answer that was previously rejected. No learner, in any curriculum, loses a
   mark that the baseline runtime awarded.

The changes exist because answer keys were stored as display text — LaTeX
fractions, Chinese unit suffixes, metric unit suffixes — and the grader now reads
them as the values they denote.

## Scope of the re-base

`semanticPayload` in each evidence artifact does **not** reference the baseline
commit, so `semanticDigest` is unchanged. Each role is being asked to confirm that
its existing finding still holds against a new runtime, not to form a new one.

The mechanical change set (from `scripts/rebase-promotion-baseline.mjs`, dry run):

- `promotion-manifest.v2.json` — `targetBaselineCommit` and all nine
  `evidenceBindings[].currentness.targetBaselineCommit`
- nine evidence artifacts — top-level `targetBaselineCommit`
- `inputs/evidence-index.v2.json`
- nine `evidenceBindings[].rawSha256`, recomputed because the artifact bytes change

**That last item is why this is gated.** Recomputing `rawSha256` makes a rewritten
artifact pass integrity checks. Performed without the roles re-affirming, it
converts "nobody re-ran this" into something indistinguishable from a freshly
issued attestation. The script refuses precisely so that cannot happen by
accident.

## What each role is being asked

| Role | Question |
|---|---|
| A04 practice semantics | Does the practice-item finding still hold when the grader accepts previously-rejected equivalent forms? Measured US_CA impact: zero verdict changes. |
| A05 lesson semantics | #179 changes lesson visualization routing. Does the lesson finding still hold? No CA lesson is routed by `topicModuleOverrides`. |
| A18 independent QA | Does the independent QA verdict stand against the new grader? |
| A21 candidate generation | Unchanged — candidate artifacts are not touched by either PR. |
| A11, A22, A23, A24, A25 | Preflight, build isolation, shadow readiness, exact layer, release intake — re-affirm against the new baseline commit. |

## Sequencing

Re-base **once, after both PRs merge**, targeting the resulting `main` commit —
not once per PR. The script requires the target to be an ancestor of `HEAD`, so it
cannot be pointed at a commit the runtime has not actually reached.

## Reproducing the measurement

The comparison harness is not committed; it loads the baseline module via
`git show <baseline>:lib/server/answerMatching.ts` alongside the working copy and
grades every question in `data/questions.ts` under both. Any reviewer can
reconstruct it, or ask for it to be added as a committed check if this becomes a
recurring need — which would be the durable fix: a semantic drift check would let
the gate distinguish a behaviour-neutral runtime change from a material one,
rather than every runtime PR requiring a manual argument like this one.
