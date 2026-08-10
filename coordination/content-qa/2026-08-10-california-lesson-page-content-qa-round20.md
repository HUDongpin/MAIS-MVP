# California Math — Lesson-Page Content QA — 2026-08-10 (round 20)

**0 defects. 1 circular check caught and removed before it could report a pass.**

Round 11 asked an agent to judge whether any question sat above the grade its
topic names. That judgement can be computed exactly, because a CCSS identifier
encodes its own grade.

## The gate

`audit:us-ca-question-alignment` checks four things:

1. every id in a page's `practiceQuestionIds` resolves to a real question
2. the question's own `topicId` is the page serving it — **608 comparisons**
3. the question's `grade` is that page's topic grade — **608 comparisons**
4. no `standardId` is **above** the question's grade — **1095 comparisons**

`K.CC.A.1` is Kindergarten, `3.OA.A.1` is grade 3, `G-C.1` and `A-SSE.2` are high
school. A Grade 1 question tagged `5.NF.A.1` asks for a skill the student has not
been taught.

**Below-grade standards are deliberately not flagged.** Spiral review of an
earlier standard is normal, correct pedagogy, and a gate that failed on it would
be failing on good content — round 13's rule.

**All clean.**

## The check that was circular

The obvious fifth check is: do a question's standards match the standards the
page *declares*? It ran, and reported **0 mismatches — from 0 actual
comparisons.**

`usCaliforniaLessons.ts:458`:

```ts
const standards = standardText(topicQuestions.flatMap((q) => q.standardIds));
```

The page's standard list is **derived from its own questions**. The page cannot
declare a standard its questions do not have, so the comparison is true by
construction and proves nothing.

That is correct design — a coverage line computed from actual content is
guaranteed honest — but as a *check* it is empty. It was removed rather than
shipped, and the gate's header records why.

This is the fourth round running in which a check produced a confident zero that
meant nothing: round 14's gate reading `/login`, round 17's `independentAnswer`
that was a copy of `answer`, round 19's equation parser that matched nothing, and
now this. The counter-measure is the same each time — **print the number of
comparisons actually made, not just the number of failures.**

## Coverage guards

- fails if it inspected **zero** questions
- fails below **900** standard comparisons, because this corpus yields 1095 and a
  quiet narrowing is indistinguishable from clean content
- fails if **any** grade or standard id cannot be mapped, listing them — an id
  shape nobody taught the gate must not silently shrink its coverage. This one
  earned its place immediately: `G-C.1` and the `CA.CCSS.Math.HS.*` family were
  invisible to the first version, and 15 standards went unchecked without a word.

## Proven to fire, on real data

Both rules were broken in `question-pack.json` and the gate re-run:

```
K question tagged 5.NF.A.1
  ✗ question ...count-to-100-q01 is grade K but is tagged 5.NF.A.1, which is above that grade

question grade K -> P4
  ✗ page grade K but question ...counting-ten-frame-q01 is grade P4
```

Restored and verified byte-identical.

## Gates

```
audit:us-ca-question-alignment   608 questions, 1095 standard comparisons — clean (new)
audit:us-ca-lesson-equations     435 printed equations — clean
audit:us-ca-lesson-label-claims  896 names, 56 recomputable claims — clean
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
  for the 464 `ccss-textbook-practice-v1` questions (round 17).
- Both California illustration records remain unreachable (round 14).
- 76 `extension` blocks have no renderer; 41 elementary pages discard their
  authored guided practice.
- Readability remains genuinely unaudited (round 13).
- The other session's **275 uncommitted files** are still untouched on this shared
  branch. My lesson-body block coverage in `audit-us-ca-lesson-readaloud.mts`
  cannot land until they commit.
