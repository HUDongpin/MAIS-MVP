# Proposal — make `V2_TARGET_BASELINE_DRIFT` proportionate

**Status:** proposal, not implemented
**Author:** prepared 2026-08-27
**Scope of change:** `coordination/integration/**` and `scripts/**` only

---

## The problem, in one line

`promotion-shadow-gate` is a check that **cannot pass for an entire class of change**, is **not required**, and therefore trains people to merge through red.

## Evidence

Branch protection requires exactly one check:

```
required_status_checks.contexts = ["validate"]
```

`promotion-shadow-gate` is not among them. PRs #176 and #179 both report
`mergeable=MERGEABLE, mergeStateStatus=UNSTABLE` — mergeable, with a non-required
check failing. The gate is **advisory in practice and blocking in appearance**.

It fires on a path test: `git diff baseline..HEAD -- app components data lib public`,
where any classification other than `test-code` counts as drift. Three consequences:

1. **Unsatisfiable before merge.** The baseline can only legitimately advance to a
   commit the runtime has reached. For a PR that changes runtime code, the gate
   goes green only if the baseline is set to the PR's own head — evidence
   attesting to the unreviewed change — or after merging. So a runtime PR can
   never legitimately show green.
2. **Blast radius unrelated to scope.** One California grade-6 ratios pilot's
   currency requirement turns a Hong Kong grading fix red. The protected surface
   is five whole roots — 3,799 files.
3. **Path-based where the question is semantic.** Measured for #176: **0 US_CA_MATH
   verdict changes across 11,217 probes**, and across all tracks 82 verdicts move,
   every one previously-wrong → now-correct, **0** to wrong. The gate cannot see
   any of that, and no measurement will make it green.

None of this means the control is wrong in principle. It caught the genuine first
runtime change since the baseline was pinned: 70 paths had moved on `main` with
not one runtime source file among them. Fail-closed is the right default, and
evidence about a runtime *should* expire when that runtime changes. The **design
is right; the granularity and the enforcement posture are not.**

---

## What I checked before proposing

The obvious fix is to scope drift to paths the pilot actually depends on, and the
manifest already carries a reachability model:

```
liveReachability.expectedRuntimePolicy:
  coveredFileCount:     3799
  reachablePathCount:   1451
  frameworkEntrypointCount: 301
  edgeCount:            3582
```

`observeCanonicalRuntimePolicy` and `scanLiveReachability` are both exported, so
intersecting the drift diff with the 1,451-path reachable set looked like a small
change reusing trusted machinery.

**It is not currently available.** Running `scanLiveReachability` against `HEAD`
fails:

```
LIVE_REGISTRY_COVERAGE_MISMATCH
"Declared live roots contain missing, new, or unregistered files."
details: { actualFileCount: 3799 }
```

The live registry is itself pinned to a stale snapshot. So the reachability graph
has the same currency problem as the baseline it would be used to scope — it
cannot be the foundation without first solving registry currency. That is worth
knowing independently: **a second staleness exists in the same family, and it is
not currently visible because nothing runs the scan at HEAD.**

The proposal below therefore does not depend on it.

---

## P1 — Declared drift surface per pilot

**Change.** Add an optional field to the manifest:

```jsonc
"driftSurface": [
  "lib/server/answerMatching.ts",
  "lib/server/questionStore.ts",
  "data/questions.ts"
]
```

`collectV2BaselineProof` intersects the existing diff with `driftSurface` when
present. **Absent means today's behaviour**, so every existing pilot is unchanged
and the field is opt-in.

**Why declared rather than derived.** A derived graph is more principled but
inherits the registry staleness above. A declared list is reviewable, is authored
by the roles who already know what their evidence depends on, and fails safe: a
surface that is too narrow is a review question, not a silent hole, because the
list is in the manifest under the same `rawSha256` discipline as everything else.

**Effect on the two live PRs.** #179 changes `data/lessons.ts`,
`data/visualizationLabs.ts` and `components/visualizations/VisualizationLabPage.tsx`
— none of which a CA ratios practice item's evidence depends on. It would go
green. #176 changes `lib/server/answerMatching.ts`, which grades that pilot's
practice item, so it would still fire — **correctly**, and P2 resolves it.

**Effort:** hours. **Risk:** low; narrows, never widens.

---

## P2 — Materiality verdict when drift fires

**Change.** When drift is detected, run a behaviour probe rather than stopping at
the path test: grade the pilot's candidate artifacts under both the baseline and
the current runtime, compare verdicts, and emit a third outcome alongside
`pass`/`blocked`:

```jsonc
{ "result": "drift-immaterial",
  "probeCount": 11217,
  "verdictChanges": 0,
  "probeDigest": "…" }
```

This is exactly the measurement assembled by hand for the current re-base
(`baseline-rebase-justification.md`), promoted to a first-class gate output so the
next runtime PR does not require a human to reconstruct it.

**Design note.** `drift-immaterial` must not be a pass. It should still require
role re-affirmation, but it turns nine open-ended judgements into nine
confirmations against a machine-checked result — which is the difference between
the roles doing analysis and the roles doing sign-off.

**Effort:** days. Needs a per-pilot probe definition; for a practice item that is
the grader, for a lesson the DTO projection.

---

## P3 — Decide the enforcement posture

**Change.** Pick one, deliberately:

- **Required**, once P1 and P2 make it satisfiable. A red gate then means
  something and blocks.
- **Advisory by design**, named as such — e.g. `promotion-shadow-gate (advisory)`
  — so a permanent red does not read as a failure.

**Why this matters most.** Today it is neither. The current state costs the
credibility of every other check on the PR: eight green and one permanently red
teaches everyone that red is normal. That is the real damage, and it is larger
than the pilot's currency problem.

**Effort:** minutes for the rename; a policy decision for the rest.

---

## Sequencing

P3 first — it is nearly free and stops the signal erosion immediately. P1 next,
which alone would have made #179 green. P2 last, as the durable fix.

Registry currency (`LIVE_REGISTRY_COVERAGE_MISMATCH`) is a separate thread; it
blocks any future derived-reachability approach but nothing proposed here.

## Not proposed

- **An exception for content or grading PRs.** It would have to exempt
  `lib/server/answerMatching.ts`, the shared grader every curriculum runs through,
  including this pilot's own practice item. The single worst file to carve out,
  and the exemption would be permanent while the safety argument holds only for
  today's diff.
- **Widening `test-code` to include documentation or data JSON.** The pathspec
  already limits the diff to five runtime roots; loosening classification inside
  them would hide real changes.
