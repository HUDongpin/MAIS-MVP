# California Math — Lesson-Page Content QA — 2026-08-09 (round 13)

**0 defects fixed. The lens was tested and rejected.**

This round is a negative result, recorded because the alternative was shipping 23
false findings and a gate that would fail on correct content.

## The lens

Readability banding is a standard publisher check: is the prose written at the
grade it targets? Twelve rounds here asked whether the text is *true*; none asked
whether the intended reader can read it. A Kindergarten lesson written at a
sixth-grade reading level is a content defect even when every number in it is
right.

Implemented as Flesch-Kincaid over student-facing prose, with notation stripped
(standard codes, formulas, bare numerals) because `3.NF.A.1` and `2 × 3 = 6` are
not sentences and wreck a syllable count.

## First result, and why it was not trusted

**23 of 76 pages read more than 4 grades above target**, worst a Kindergarten page
at grade 6.1.

Two things had to be checked before that became a finding.

**First, was it scoring what a student reads?** No. It was scoring the seed data.
Applying what rounds 7–8 established by driving the page — teacher guides render
for teachers only, `extension` blocks have no renderer at all, the visualization
block's content is blanked, and elementary checklists are replaced by four canned
sentences — the corpus shrank to 31–139 words per page. At that size
Flesch-Kincaid is noise.

**Second, is the instrument valid on maths prose?** It is not. Scored against the
CCSS standards' own text:

| Text | Target | Flesch-Kincaid |
|---|---|---|
| 3.G.A.1 verbatim — *"…rhombuses, rectangles, and squares as examples of quadrilaterals"* | G3 | **G15.6** |
| 1.OA.A.1 verbatim | G1 | **G14.5** |
| plain Grade 1 story prose — *"A picture shows eight crackers…"* | G1 | G4.9 |

**A gate built on this would flag the curriculum it implements.**

The 23 "findings" were the words *attributes*, *quadrilateral*, *subtraction* and
*equation* — which are the lesson, not a defect. The worst-scoring page,
`p3-3-g-categories` at "G9.5", is two sentences totalling 31 words, both of them
lesson-card summaries quoting 3.G.A.1 almost directly.

## What was done instead

`scripts/audit-us-ca-lesson-readability.mts` is kept as a **reporting tool that
never fails a build**, with the falsification recorded in its own header. It is
not registered in `package.json` as a gate.

Kept rather than deleted for one reason: the per-page numbers are still a useful
input to human judgement, and deleting it invites someone to rebuild the same
thing and repeat the mistake.

## Why this is worth a report

Every previous round ended with defects fixed. This one ends with a lens
discarded, and that is the same discipline: the four gate corrections in rounds
9–12 all came from checking a result instead of believing it. Here the check
happened *before* anything was filed.

Twelve rounds of finding real defects makes the next 23-item list feel like a
result. It was an artifact — and the cost of shipping it would have been 23
rewrites of correct, standards-aligned copy, plus a gate that fails whenever
someone writes "quadrilateral".

**A lens that cannot distinguish correct content from incorrect content is worse
than no lens.**

## Gates unchanged

```
audit:ccss-lesson-interaction    270 interactive lessons — clean
audit:us-ca-lesson-content        76 lessons, 614 blocks — clean
audit:us-ca-checkpoint-grading   608 questions — clean
audit:us-ca-lesson-page-runtime   76 pages, both extremes — clean
audit:us-ca-lesson-figure-bounds  76/76 — clean
audit:us-ca-lesson-label-motion   76/76 — clean
test:ccss-textbook · test:question-bank 98 · test:mvp 32 · answerMatching 10
usCaliforniaLessons.test.ts 12 · tsc --noEmit — all pass
```

## Still open

- Readability remains genuinely unaudited. Doing it properly needs a measure
  calibrated for mathematical text — sentence length and clause depth with a
  domain-vocabulary allowlist — or human review against the grade band. Neither
  is Flesch-Kincaid.
- The two long-standing owner decisions: 76 `extension` blocks have no renderer,
  and 41 elementary pages discard their authored guided practice.
