# Baseline re-base — per-role re-affirmation briefs

**Pilot:** `us-ca-math-rag-v2-g6-ratios-v2` / `attempt-007`
**Current baseline:** `14a041f372fb27fa4282104c247886ff1eea623b`
**Prepared:** 2026-08-27

Companion to `baseline-rebase-justification.md`, which holds the measurement.
Nothing here is an attestation. Each role decides for itself; these briefs exist
so the decision is one paragraph rather than a re-derivation.

---

## Why you are being asked

`promotion-shadow-gate` blocks PRs [#176](https://github.com/HUDongpin/MAIS-MVP/pull/176)
and [#179](https://github.com/HUDongpin/MAIS-MVP/pull/179) with
`V2_TARGET_BASELINE_DRIFT`. They are the **first runtime changes since this
pilot's evidence was bound**: between the baseline and `main`, 70 paths changed
and none is runtime source (54 `coordination/`, 9 `scripts/`, 3 `tests/`,
2 `.github/`, and the only 2 `lib/` files are `*.test.ts`). `main` validates
`pass` against this baseline today.

What changed, and the only two files that can reach this pilot:

| PR | Runtime paths | Can it reach this pilot? |
|---|---|---|
| #176 | `lib/server/answerMatching.ts`, `lib/server/questionStore.ts`, `data/topics.ts`, `data/questions.ts`, EASE pack | **`answerMatching.ts` — yes.** It grades this pilot's practice item. |
| #179 | `data/lessons.ts`, `data/visualizationLabs.ts`, `components/visualizations/VisualizationLabPage.tsx` | Routing is keyed to 15 Hong Kong `p*` topics only. |

`semanticPayload` does not reference the baseline commit, so **`semanticDigest`
is unchanged**. You are confirming an existing finding still holds against a new
runtime — not forming a new one.

### The measurement

Every question in the repository graded under both the baseline and the proposed
`answerMatching.ts`:

| Track | Probes | Verdicts changed |
|---|---|---|
| **US_CA_MATH** | 11,217 | **0** |
| HK | 5,307 | 31 |
| MAINLAND_PEP_HIGH | 61,031 | 47 |
| US_AR_MATH | 10,057 | 4 |

Across all tracks: **82 verdicts change, every one previously-wrong → now-correct.
Zero move to wrong.** No learner on any track loses a mark the baseline awarded.

---

## A21 — candidate generation

**You attested:** `candidatePackage` `us-ca-math-rag-v2-g6-ratios-v2-candidate` at
version `2.0.0-shadow.1`, with `aggregateCandidateDigest`
`c83c4739…` over the safe-card, practice-item and lesson records.

**What changed:** nothing you attested. Neither PR touches
`coordination/content-qa/us-ca-math-rag-v2-g6-ratios-v2-candidate/`. The candidate
bytes, the package digest and the source-record policy are all identical.

> **Your decision:** does the candidate package finding still hold when no
> candidate artifact has changed? This is the cleanest of the nine.

---

## A04 — practice semantics

**You attested:** practice item `s04-ca-rag-v2-q031-6-rp-ratios-v2`,
`numericOracle: 12`, `acceptedAnswers: ["12", "12 cups"]`, under a stated
`acceptedAnswerPolicy`, with `recordSha256` `03122bc9…`.

**What changed:** `answerMatching.ts` — the module that grades exactly this item.
It now expands LaTeX fractions, sheds a Chinese unit tail anchored to the key's
own unit, and adds metric English units (`kg`, `g`, `m`, `mm`, `km`, `l`, `ml`) to
the known set. `cups` was already in that set and is untouched.

**Evidence for you specifically:** across 11,217 US_CA_MATH probes, **0 verdicts
change**. `"12"` and `"12 cups"` grade identically before and after; the wrong
answers this item rejects are still rejected. No change moves any verdict toward
*accepting* something previously wrong on this track.

> **Your decision:** does the practice-semantics finding still hold when the
> grader accepts previously-rejected equivalent forms on *other* tracks and none
> on this one? This is the role the measurement was built for.

---

## A05 — lesson semantics

**You attested:** lesson `s05-ca-rag-v2-lesson-031-6-rp-ratios-v2`, its
`instructionalSpine` (objective → workedExample → guidedPractice →
independentPractice), `workedExampleBinding`, `practiceChecks` and
`remediationTargets`, with `recordSha256` `0f71adbe…`.

**What changed:** #179 re-routes lesson visualizations, and #176 adds 16 Hong Kong
topic records. Both are keyed by topic id: `topicModuleOverrides` names 15 `p1`–`p6`
Hong Kong topics, and the new topics are all `hk-ease-*`. No CA lesson is routed,
re-templated or re-bound; the CA lesson record itself is untouched.

> **Your decision:** does the lesson-semantics finding still hold when the
> visualization routing that changed is scoped to Hong Kong topic ids and this
> lesson's record is byte-identical?

---

## A18 — independent QA

**You attested:** `accept-for-shadow` on all three records (safe-card, practice,
lesson), each with `liveDecision: blocked-localization-and-integration-unproven`,
plus an `independentMath` verdict and a `localizationBoundary`.

**What changed:** the grader. Your independent-math verdict was formed against the
baseline `answerMatching.ts`.

**Evidence for you specifically:** the direction of every change is one-way —
82 verdicts move previously-wrong → now-correct, **0** move correct → wrong. A
grader that only becomes *more* accepting of equivalent forms cannot invalidate an
independent-math verdict that already held; it can only stop rejecting answers
that were always right. On this track it does neither, changing nothing.

> **Your decision:** does `accept-for-shadow` still stand, and does the
> `liveDecision` block remain correct? Note the live block is unaffected either
> way — nothing here unblocks localization or integration.

---

## A11 — independent preflight

**You attested:** `reviewedCompositionCommit` and `targetBaselineCommit` both
`14a041f37…`, `mergedOriginMainCommit` `c8009edf…`, a pinned `checkerRelease`,
`preflightResults`, `ratchetedAssertions`, `replayMustUseExactExecutionCommit`
and `semanticReceiptDigestEqualityRequired`.

**What changed:** the baseline identity itself — this is the field being
re-pointed. Your replay-exactness and digest-equality requirements are unaffected;
the canonical receipt still pins its own `executionCommit`.

> **Your decision:** are the preflight results and ratcheted assertions still
> valid at the new baseline commit, and does the replay requirement still bind
> the same execution commit? You are the role that owns baseline identity, so
> the re-base is most directly yours to accept.

---

## A22 — build isolation

**You attested:** `typeCheck: npm-run-type-check → pass`,
`productionBuild: npm-run-build → pass, compiled, staticPageGenerationCount: 202,
deploymentPerformed: false`, and `runtimeBaselineDiff:
{protectedRuntimeChangeCount: 0, candidateSourceChangeCount: 0,
liveFileChangeCount: 0}` against `14a041f37…`.

**This is the one brief that is not a paper confirmation.** Your assertions are
build outputs, and both PRs change TypeScript that the build compiles. They
cannot be carried across by argument.

**What you need to re-run at the new baseline:** `npm run type-check` and
`npm run build`, then recompute `runtimeBaselineDiff` — `protectedRuntimeChangeCount`
should return to 0 once the baseline is the post-merge commit. Watch
`staticPageGenerationCount`: #179 adds seven explicit `dynamic()` imports to
`VisualizationLabPage.tsx`, deliberately written out rather than as a template
literal so each stays statically analysable and separately chunked. If that count
moves, the chunking assumption is worth a second look.

> **Your decision:** re-run both checks at the new baseline and confirm the
> isolation proof still holds.

---

## A23 — shadow readiness

**You attested:** transition `shadow_ready → shadow_passed`, `candidateDigest`
`c83c4739…`, `runtimePolicyDigest` `99fd38d7…`, `legacyResolutionCount: 18`,
`approvedProjectionCount: 3`, `dereachedCount: 15`, and three counters all at
zero: `selectedCandidateLiveHitCount`, **`unresolvedDynamicImportCount`**,
`unknownLiveRegistryCount`.

**What changed, and the number to watch:** #179 adds seven `dynamic()` imports.
They are written as explicit per-component imports precisely so a bundler can
resolve each statically — a template-literal form would collapse into a context
module. The expectation is therefore that `unresolvedDynamicImportCount` stays
**0**, but it is your counter and this is the change most likely to move it.

`runtimePolicyDigest` will need recomputing against the new runtime.

> **Your decision:** recompute the counters at the new baseline and confirm
> `unresolvedDynamicImportCount` is still 0 and the readiness transition still
> holds.

---

## A24 — exact layer

**You attested:** `exactLayerDisposition: not-applicable`, having scanned the
three candidate records for the prohibited field families — `bitmap`, `image`,
`illustration`, `asset`, `svg`, `plotly`, **`coordinate`**, `formula-overlay`,
`exact-layer` — with `matchingFieldPaths: []`.

**What changed, and why it is adjacent to you:** #179 is a visualization change
and touches coordinate-plane rendering, which brushes two of your prohibited
families by name. But your disposition is scoped to the three *candidate records*,
and those are byte-identical. The routing change alters which component renders a
Hong Kong lesson; it introduces no coordinate or SVG field into a CA candidate
record.

> **Your decision:** does `not-applicable` still hold, given the scan is over
> candidate records that have not changed? Say so explicitly rather than by
> silence — the adjacency is close enough to be worth a sentence.

---

## A25 — release intake

**You attested:** `finalDisposition: "reviewed commit"` at
`reviewedCompositionCommit` `14a041f37…`, reviewed branch
`codex/a23-promotion-shadow-attempt-002-20260826`, target PR
[#162](https://github.com/HUDongpin/MAIS-MVP/pull/162), plus an
`enforcementBoundary`, `remainingCloseoutConditions` and a `maturityClaim`.

**What changed:** the reviewed composition moves to a new commit, and the intake
record should name the PRs that caused it — #176 and #179 — alongside the original
target PR. The `enforcementBoundary` and `liveAllowed: false` are unaffected;
nothing here moves the pilot toward live.

> **Your decision:** re-issue the intake disposition against the new reviewed
> commit, and record whether the remaining closeout conditions are changed by
> either PR. You are also the natural owner of the question below.

---

## One question nobody currently owns

Every runtime PR will trip this gate and require nine re-affirmations. That is
correct for a change that alters behaviour and disproportionate for one that
provably does not — this re-base is the second kind, and the argument had to be
assembled by hand.

The durable fix is a semantic drift check: something that lets the gate
distinguish a behaviour-neutral runtime change from a material one, so
`V2_TARGET_BASELINE_DRIFT` fires on the latter only. Worth deciding whether that
is wanted before the next runtime PR repeats this exercise.

---

## After all nine

```
node scripts/rebase-promotion-baseline.mjs \
  --manifest coordination/integration/pilots/us-ca-math-rag-v2-g6-ratios-v2/attempt-007/promotion-manifest.v2.json \
  --target <post-merge main sha> \
  --attested-by A21,A18,A23,A04,A05,A11,A22,A24,A25 \
  --justification coordination/integration/pilots/us-ca-math-rag-v2-g6-ratios-v2/attempt-007/baseline-rebase-justification.md \
  --write
```

Once, after both PRs merge, targeting the resulting `main` — not once per PR. The
script refuses while any role is missing, and requires the target to be an
ancestor of `HEAD`.
