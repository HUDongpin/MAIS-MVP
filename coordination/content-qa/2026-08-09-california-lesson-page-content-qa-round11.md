# California Math — Lesson-Page Content QA — 2026-08-09 (round 11)

**3 defects fixed** on a surface eleven rounds had walked past: the questions a
student actually answers.

## The surface

Every California lesson page ends in a **"Practice check"** section where the
student is graded — `30% of 60 = ?`, `Check Answer`, stars out of five. Rounds 1
to 10 audited the lesson prose, the interactive figures, the block copy, the
accessible names and the geometry. None of them audited the questions.

That is the one place on the page where being wrong has a consequence for the
student: **a wrong stored answer marks a correct answer wrong.**

## Coverage

**608 checkpoint questions across 76 pages**, all audited. Each was re-solved
from scratch and checked for: a wrong stored answer, an explanation whose
arithmetic lands elsewhere, a multiple choice with zero or several defensible
options, a prompt admitting more than one reading, a skill above the grade its
topic names, and language that would confuse that grade.

Every candidate then went to two independent verifiers — one re-solving the
question without seeing the verdict, one checking the proposed fix leaves exactly
one defensible answer at the right grade. **2 survived.**

## What the checkpoint got wrong

**`divide-two-digit-q02`** asks *"Estimate 432 ÷ 16 by rounding 16 to 20:
432 ÷ 20 ≈ ? (whole number)"* and keys **21**.

```
432 ÷ 20 = 21.6
21.6 → 22   (0.6 above 21, only 0.4 below 22)
check:  20 × 21 = 420,  432 − 420 = 12
        20 × 22 = 440,  440 − 432 =  8   → 432 is nearer 440
```

It is an exact-match fill-in, so **a student who rounds correctly is marked
wrong**. Worse, the stored explanation — *"432 ÷ 20 = 21.6 → about 21"* — teaches
the incorrect rounding as the method. Now keyed 22, with the multiples check in
the explanation.

**`circle-pi-q02`** keys **31** with the explanation *"2 × 3.14 × 5 = 31.4"*.
`acceptedAnswers` already held both, so grading was safe — but the review panel
prints **"Correct answer: 31"** directly above working that derives 31.4. A
student who writes 31.4 is marked right and then told the answer was 31. Now
keyed 31.4, with 31 still accepted.

## The page promised 8 questions and asks 5

Found while opening this round. Every page stores 8 approved checkpoint
questions; `StudentLessonPage.tsx:33` renders only the first
`lessonPracticeQuestionLimit` = **5** after deduping. The page itself displays
"QUESTION 1 OF 5".

The coverage line I wrote in **round 7** said *"Its checkpoint has 8 approved
questions"*, and that sentence is student-visible on the 35 chapter pages. I
fixed the *linkage* claim in that round and carried the wrong *count* straight
through — in the same round that withdrew two other claims for exactly this
data-versus-render mistake.

Now: *"this page develops &lt;standards&gt;. Its checkpoint asks 5 questions,
drawn from 8 approved for this page."*

## What 2-in-608 means

The question bank has been through its own QA rounds, and it shows: a 0.3% defect
rate against lens that found 116 defects in the lesson bodies. That is a real
result about the bank, not a weak audit — the same method, run against the
interactive lessons, produced an order of magnitude more.

It also means the **integration** was the weak point, not the questions. The
defect with the widest blast radius this round was the page telling students it
would ask 8 questions and asking 5.

## Gates

```
audit:ccss-lesson-interaction    270 interactive lessons — clean
audit:us-ca-lesson-content        76 lessons, 614 blocks — clean
test:ccss-textbook                passed
test:question-bank                98 pass, 0 fail
usCaliforniaLessons.test.ts       12 pass, 0 fail
tsc --noEmit                      clean
audit:us-ca-lesson-page-runtime   76 pages, both extremes — clean
audit:us-ca-lesson-figure-bounds  76/76 — clean
audit:us-ca-lesson-label-motion   76/76 — clean
```

## Still open

- The three questions per page that exist but are never asked (8 stored, 5
  rendered) were audited here, but no student sees them. Whether the pool should
  shrink to 5 or the limit rise to 8 is a product decision.
- The two long-standing owner decisions: 76 `extension` blocks have no renderer,
  and 41 elementary pages discard their authored guided practice.
