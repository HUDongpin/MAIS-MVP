# Mainland BNU primary (P1-P6) is gated candidate content, not a wiring bug

Mainland BNU P1-P6 serves **zero** practice questions, while BNU S1-S6 serves 500
per grade. `mainlandBnuQuestions` in `lib/server/questionStore.ts` builds loaders
for the junior and high bands only, with no primary branch, even though
`data/mainlandBnuPrimaryQuestions.ts` exists, holds 3,000 questions, and is
covered by `npm run test:question-bank`. Next to `mainlandPepQuestions`, which has
all three bands, that reads like a forgotten band.

It is not. This record exists so the next reader does not "fix" it.

Measured on `main` at the time of writing, via `getPublicQuestions`:

| profile / grade | questions |
| --- | --- |
| `MAINLAND_BNU` P1-P6 | 0 each |
| `MAINLAND_BNU` S1-S6 | 500 each |
| `MAINLAND_PEP` P1 | 200 |
| BNU primary bank held in memory | 3,000 |

## Why it is deliberate

`coordination/integration/v2/legacy-resolution-registry.v2.json` carries
digest-bound resolutions `de-reach-bnu-primary-v1` and `de-reach-bnu-primary-v2`:

```
decision: "de-reached"
approvalReferences: []
enforcement: { candidateMustBeUnreachable: true,
               liveProjectionMustBeReachable: false,
               liveAllowed: false }
```

Both pin `rawSha256` and `idSetDigest` for the generated packs, and those digests
still match the files byte-for-byte, so the enforcement record governs exactly
today's content. **Adding a primary branch to `mainlandBnuQuestions` would breach
an active enforcement record.**

The gate is three-layered, and a promotion has to move all three together:

| layer | file | state |
| --- | --- | --- |
| question loader | `lib/server/questionStore.ts` | no primary band |
| topic aggregate | `data/topics.ts` | `mainlandBnuPrimaryTopics` not spread |
| lesson registry | `data/lessons.ts` | `mainlandBnuPrimaryLessonSeeds` not registered |

A single forgotten loader would be a one-point omission. These three were
de-reached on 2026-08-26 by the fail-closed Promotion Gate audit: A04 took the
question/topic aggregates, A05 the lesson seeds, A12 the dynamic loaders
(`coordination/session-logs/2026-08-26-A04-promotion-legacy-live-repair.md` and
the A05/A12 logs beside it). The same slice de-reached HJB primary/high and
Florida, which is why `mainlandHjbQuestions` is junior-only and
`unitedStatesQuestions` returns `[]` for `US_FL_MATH`.

`lib/mainlandBnuPrimaryQuestionBank.test.ts` then asserts the unreachability on
every surface -- "Mainland BNU P1-P6 candidate content remains unreachable from
Lesson and Practice", "...candidate topics cannot select questions in Practice
Arena", "question API returns no BNUP primary candidate questions to an
authenticated user". Those tests encode the live policy. They must flip as part of
an authorized promotion, never be deleted to make questions appear.

## The superseded May approvals

This is the trap. `coordination/content-qa/mainland-bnu-primary-generated-bank-v1-1500/s18-promotability-decision.md`
and the v2 equivalent *do* say `approved-for-public-integration`, dated
2026-05-27 and 2026-05-28, and explicitly approve connecting P1-P6 to
`data/questions.ts`, `data/topics.ts`, Lesson checkpoints and Practice Arena.
They also say to keep BNUP S1-S6 on coming-soon messaging -- the exact inverse of
what ships today.

Those records are **superseded, and are not authority to wire this up**. The
August Promotion Gate is fail-closed and recognizes only digest-bound resolution
records; A04 classified these packages as "candidate-only or incompletely
approved" precisely because their `approvalReferences` is empty. The May S18
sign-off was never registered in the form the gate reads.

Note also that all 3,000 rows in the generated packs carry
`mathQaStatus`/`terminologyQaStatus`/`manualQaStatus` = `pending-s18-review`. Only
`sourceDistanceStatus` (an automated scan) passed.

## What promotion requires

Per `AGENTS.md`, A23 is the candidate-to-live gatekeeper, and content may not
reach live question, topic, lesson, asset or route surfaces without the full
chain:

1. **A18** independent content QA, re-run against the current pack digests.
2. **A23** promotion planning, including a new registry resolution that carries
   real `approvalReferences` and lifts `candidateMustBeUnreachable`.
3. The owning live-surface change across all three layers above -- **A04** for
   Practice Arena, **A05** for lessons, **A03** for roadmap.
4. **A11** regression evidence, deliberately flipping the unreachability
   assertions in `lib/mainlandBnuPrimaryQuestionBank.test.ts`.
5. **A22** release readiness.

Expected post-promotion shape, for whoever picks this up: 500 questions per grade
P1-P6 (3,000 total, v1+v2 interleaved), 97 topics, and 8-question v1+v2 balanced
lesson checkpoints -- the invariants the existing bank tests already assert on the
candidate bank.

## QA metadata now reports the rows' real state

`metadataForQuestion` in `data/mainlandBnuPrimaryQuestions.ts` used to hardcode
`mathQaStatus: "pass"`, `terminologyQaStatus: "pass"` and `manualQaStatus:
"approved"` over rows that all say `pending-s18-review`. That was the May
approvals' stated "Production Contract", written when this bank was expected to
go live. The bank was de-reached instead, so the contract describes a state that
never happened, and the exported metadata was reporting QA this content has not
had.

It now propagates the rows verbatim, matching the shape A04 applied to the HJB
high adapter in the same de-reach slice ("changed the HJB high compatibility
adapter so it no longer turns embedded pending QA states into `pass`/`approved`"):

```ts
mathQaStatus: question.mathQaStatus,
terminologyQaStatus: question.terminologyQaStatus,
manualQaStatus: question.manualQaStatus,
```

The exported type narrows to the row types rather than to `"pass"`/`"approved"`,
so a future pack that genuinely carries passing QA will widen it honestly instead
of being overwritten. Nothing student-facing reads these fields, and nothing
filters on them: `lib/questionBankSolvability.ts` and
`data/mainlandBnuPrimaryLessons.ts` use only `batch` and `independentAnswer`. The
three assertions in `lib/mainlandBnuPrimaryQuestionBank.test.ts` were flipped to
`pending-s18-review` deliberately, with the reason recorded at the assertion.

Promoting this content means re-running A18 QA and updating the rows, which
flips those assertions back as part of that work -- and the metadata will then
report `pass`/`approved` because the rows do, not because the adapter says so.

## HJB primary carried the same overwrite, now fixed too

`data/mainlandHjbPrimaryQuestions.ts` had the identical defect and has had the
identical fix: all 1,500 rows say `pending-s18-review`, the adapter hardcoded
`"pass" as const`/`"approved" as const`, and it now propagates the rows. Its
registry resolution `de-reach-hjb-primary-v1` matches BNU primary's exactly --
`decision: "de-reached"`, `approvalReferences: []`,
`candidateMustBeUnreachable: true`, `liveAllowed: false` -- and its pack digest
also still matches byte-for-byte. The assertion in
`lib/mainlandPepHighQuestionBank.test.ts` flipped from `"approved"` to
`"pending-s18-review"`; that test already called it "a candidate bank ... outside
the public aggregate", so it had been contradicting itself in a single test.

**One history difference worth knowing.** BNU primary was approved but never
actually integrated. HJB primary *was*. Its
`coordination/content-qa/mainland-hjb-primary-generated-bank-v1-1500/s18-promotability-decision.md`
records `production-integrated-after-owner-approval`, an explicit owner approval
on 2026-05-25 for "production/public launch for 沪教版数学小学 P1-P6", and
integration into `data/questions.ts`, `data/topics.ts` and `data/lessons.ts`,
serving 250 questions per grade.

So the August de-reach withdrew content that had shipped under owner approval,
not merely content awaiting promotion. Measured today: `MAINLAND_HJB` P1-P6 => 0,
S1-S3 => 500, S4-S6 => 0 (HJB high was de-reached in the same slice). Whether
that withdrawal should stand is an owner and A23 question, well outside a
metadata fix, but it should not be discovered by accident -- which is why it is
recorded here.

## Still open: BNU junior

`data/mainlandBnuJuniorQuestions.ts` hardcodes `"pass" as const` over rows typed
`"pending-s18-review" | "pass"`. That bank *is* live and approved, so the values
are not false today, and unlike the two above it is not de-reached, so this is
not the same defect. The risk is narrower: a future pack with pending rows would
be silently reported as passing. Worth an A18 look, not urgent, and not changed
here because the live approval currently backs the values.
