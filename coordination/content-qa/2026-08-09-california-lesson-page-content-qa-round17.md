# California Math — Lesson-Page Content QA — 2026-08-09 (round 17)

**The question bank's independent verification verifies nothing for 462 of its
608 California questions — and round 11 of this very effort made it worse.**

Nothing student-visible is wrong here. This is about the evidence the content
carries, and it matters because fifteen rounds have now found real defects in
content that was already marked QA-passed.

## What the field means in this repo

`independentAnswer` is not an invention of mine. It is this repo's own audit
vocabulary, used consistently:

- Solvability audits tabulate `storedAnswer | independentAnswer | status |
  severity` (`2026-05-24-S18-full-question-bank-solvability-audit.md` and four
  others).
- `generate-mainland-pep-primary-local-166-rag-replacement-audit.mjs:158`
  computes `deterministicAnswerStatus: independentAnswer === question.answer ?
  "pass" : "fail"`.

So an `independentAnswer` is a **second, separately derived answer**, and its
agreement with the stored answer is treated as evidence the stored answer is
right.

## It is a copy

```
copied-prose / total    copied-answer / total   batch
        462 / 464                 464 / 464     ccss-textbook-practice-v1
          0 / 121                 121 / 121     us-ca-k5-knowledge-point-practice-v1
          0 / 23                   23 / 23      us-ca-g6-g12-v2
```

All 608 have `independentAnswer` byte-identical to `answer`. On its own that
proves nothing — for a bare numeral, agreement *is* identity, and two correct
independent solves would look exactly like this.

**The prose field is the tell.** `independentSolution` is byte-identical to
`explanation` for 462 of 464 questions in one batch, and for 0 of 144 in the
other two. Two independent solves do not produce the same free-text sentence 462
times:

```
explanation         "10, 20, 30, 40, 50, 60, 70, 80, 90, 100 — that is ten numbers."
independentSolution "10, 20, 30, 40, 50, 60, 70, 80, 90, 100 — that is ten numbers."
```

The other two batches show what a real second pass looks like — same answer,
different words:

```
explanation         "Count each object once. The collection has 9 objects."
independentSolution "Count the collection once: 9."
```

## Why it matters, concretely

Run this repo's own `independentAnswer === answer` check over
`ccss-textbook-practice-v1` and **462 questions pass on evidence that cannot
fail**.

Two of them were wrong at the time. `divide-two-digit-q02` was keyed **21** for a
value that rounds to 22; `circle-pi-q02` was keyed **31** for 31.4. Both carried:

```
mathQaStatus      passed-ccss-textbook-hand-check
manualQaStatus    accepted-ccss-textbook-hand-check
independentAnswer identical to the stored (wrong) answer
```

Round 11 found them by re-solving from scratch. The dual-solve field, which
exists precisely to catch this, agreed with the error.

## My own part in it

Round 11's fix commit, `2263a2c13b`, changed both fields together:

```
-      "answer": "21",              -      "independentAnswer": "21",
+      "answer": "22",              +      "independentAnswer": "22",
-      "answer": "31",              -      "independentAnswer": "31",
+      "answer": "31.4",            +      "independentAnswer": "31.4",
```

I edited an independent-verification field so that it agreed with my new answer.
That destroys the only thing the field is for. The pack was born this way — at
creation (`bcdf95b7ff`) every question already had the two fields identical — but
round 11 propagated it rather than noticing it.

## Not fixed in code, deliberately

`scripts/report-us-ca-independent-solve-integrity.mts` is **reporting only** and
is not registered in `package.json`, following round 13: a gate should fail on
content that is wrong, and a verbatim copy is not a wrong answer — it is missing
evidence.

The two honest repairs are to **clear** these fields for this batch or to
**genuinely re-derive** them, and both belong to whoever owns the question bank.
Fabricating a second solve would be worse than the current state. Reverting the
round-11 edit would be worse still — it would make the data assert that an
independent solve returned a wrong answer.

To be fair to the batch: its real provenance is declared honestly on every
question as `passed-ccss-textbook-hand-check`, and a hand check is a legitimate
QA route. The defect is only that two extra fields assert a stronger, different
claim that was never earned.

## What this explains

Rounds 1–16 kept finding real defects in content marked QA-passed, and the
recurring question was how. Part of the answer is that one of the strongest
signals in the dataset — a disagreeing second solve — was structurally incapable
of disagreeing.

It is the same failure as round 14's gate reporting "76 pages clean" while
loading `/login`, and round 15's isolation test clearing a symbol that is silent
in context. Three rounds, three different layers, one shape: **a check that
cannot fail, reported as a check that passed.**

## Gates unchanged

```
audit:us-ca-lesson-readaloud     608 questions + 386 blocks — clean
audit:us-ca-lesson-illustrations   2 records — clean
audit:us-ca-lesson-content        76 lessons, 614 blocks — clean
audit:us-ca-checkpoint-grading   272 free-entry + 336 multiple-choice — clean
audit:us-ca-lesson-figure-bounds  76 pages, 76 with a real lesson figure — clean
audit:us-ca-lesson-label-motion   76 pages, 76 inspected — clean
lib/mathSpeech.test.ts 10 · answerMatching 10 · tsc --noEmit clean
```

## Still open

- **Owner decision:** clear or re-derive `independentAnswer`/`independentSolution`
  for `ccss-textbook-practice-v1` (464 questions).
- Both California illustration records remain unreachable (round 14).
- 76 `extension` blocks have no renderer; 41 elementary pages discard their
  authored guided practice.
- Readability remains genuinely unaudited (round 13).
