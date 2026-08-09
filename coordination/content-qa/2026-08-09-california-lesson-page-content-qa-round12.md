# California Math — Lesson-Page Content QA — 2026-08-09 (round 12)

**538 rejections of correct answers, eliminated.** Round 11 asked whether the
stored answers are right. Round 12 asks whether a student who *is* right gets
**marked** right.

That is a different failure with the same consequence for the student, and no
audit of the question data can see it — the data was fine in all 538 cases.

## The gate

`audit:us-ca-checkpoint-grading` takes all **272 free-entry checkpoint
questions** rendered on the California lesson pages, generates the forms a
correct student would reasonably type, and asserts the grader accepts each.

It also asserts the grader still **rejects** a plainly wrong answer, so a
matcher that says yes to everything cannot pass — and it exits non-zero if it
checked nothing.

## What the grader was rejecting

Already handled: `3.0`, `3.00`, surrounding whitespace, `1/2 ↔ 0.5`.

Not handled:

| Student types | Stored | Why they write it |
|---|---|---|
| `.5` | `0.5` | omitting the leading zero is routine |
| `1,234` | `1234` | the app's own copy renders `3,648` with a comma |
| `+3` | `3` | the signed-number lessons print "+6" themselves |
| `3.` | `3` | sentence punctuation |
| `circles.` | `circles` | same, on a word answer |
| `(9, 6).` | `(9, 6)` | same, after a coordinate pair |

**538 → 0 correct forms rejected. 0 wrong answers accepted.**

## The care this needed

This is the highest-risk change of the whole effort — it alters grading for every
student — so it was made narrowly and tested in both directions.

Variants are **added alongside** the canonical form rather than folded into
`normalizeAnswer`, so nothing that already worked changes.

A comma is stripped **only inside a single numeric token in thousands position**.
Stored answers include coordinate pairs like `(9, 6)`; blanket comma-stripping
would turn that into `(96)`. Explicitly tested, along with:

```
0.5   vs 0.05      → still rejected
1234  vs 1234567   → still rejected
12    vs "1,2"     → still rejected
(9,6) vs (96)      → still rejected
3     vs 4         → still rejected
```

Regressions: `answerMatching` 10 pass, `question-bank` 98 pass, `mvp` 32 pass.

## Gate fixed along the way

The runtime sweep reported *"5 runtime content defects"* that were all
`Failed to load resource: ERR_CONNECTION_REFUSED` on `/_next/static` chunks — the
dev server had died mid-run. The gate was counting infrastructure failures as
findings, the exact opposite of the failure it was hardened against earlier
(reporting a pass over a server that was not running).

Resource-load failures are now tallied separately and reported as infrastructure
noise, with an explicit line saying the result cannot be trusted until re-run
against a healthy server. Genuine page and console errors still count.

That is the fourth gate correction in this effort. The pattern in all four: the
gate produced a result, and the result was checked rather than believed.

## Why this lens existed at all

Eleven rounds audited what the page *shows*. This one audited what the page
*does with what the student writes*. The distinction matters because the failure
is silent — a student who omits a leading zero on `.5` is simply told they are
wrong, and nothing in the content is incorrect.

## Gates

```
audit:ccss-lesson-interaction    270 interactive lessons — clean
audit:us-ca-lesson-content        76 lessons, 614 blocks — clean
audit:us-ca-checkpoint-grading   272 questions — every equivalent form accepted
test:ccss-textbook                passed
test:question-bank                98 pass, 0 fail
test:mvp                          32 pass, 0 fail
answerMatching.test.ts            10 pass, 0 fail
usCaliforniaLessons.test.ts       12 pass, 0 fail
tsc --noEmit                      clean
audit:us-ca-lesson-figure-bounds  76/76 — clean
audit:us-ca-lesson-label-motion   76/76 — clean
audit:us-ca-lesson-page-runtime   re-running against a healthy server
```

## Still open

- Multiple-choice questions are graded by option matching and were not covered by
  this gate; their options come from the same data the round-11 audit read, but
  the *matching* path for them is untested here.
- The two long-standing owner decisions: 76 `extension` blocks have no renderer,
  and 41 elementary pages discard their authored guided practice.
