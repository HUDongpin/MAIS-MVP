# California Math — Lesson-Page Content QA — 2026-08-04 (round 7)

**9 defects found and fixed** in the part of the California lesson page that is
*not* an interactive lesson.

Round 6 partitioned the 270 interactive CCSS lessons and read every one. But the
lesson page renders **614 blocks**, and only 286 of them are those lessons. Round
7 partitions the other **328**:

| Block type | Blocks | Read |
|---|---:|---:|
| `checklist` (guided practice / scaffolded practice) | 76 | 76 |
| `visualization` (lab link) | 76 | 76 |
| `extension` (mistake repair / remediation) | 76 | 76 |
| `teacher-guide` (standards coverage) | 76 | 76 |
| `concept` | 12 | 12 |
| `worked-example` | 12 | 12 |
| **total** | **328** | **328** |

Every gate was green when round 7 started, including the four the previous six
rounds added.

## Claims the page makes that the data does not support

These are the round's most serious findings: sentences stating a relationship
that is simply not there.

**The coverage line invented a linkage.** Every scaffolded-practice block ended
with *"Coverage check: the lesson checkpoint links N approved questions to
&lt;standards&gt;."* The standards it prints come from the page's **interactive
lessons** — substituted deliberately in round 1, so the line would stop quoting a
different domain from every lesson above it — while the sentence attributes them
to the **checkpoint questions**. Checked against the real selection:

```
39 of 64 pages name standards their own 8 checkpoint questions do not carry
  p2-2-nbt-three-digit-place-value   prints 9 standards, its 8 questions carry 4
  p3-3-md-time-data-area-perimeter   prints 9 standards, its 8 questions carry 4
  p3-3-oa-mult-div                   prints 10 standards, its 8 questions carry 5
```

Now two facts, stated separately: *"this page develops &lt;standards&gt;. Its
checkpoint has N approved questions."*

**A teacher guide promised questions that do not exist.** *"The practice
checkpoint leads with the library's hand-checked questions before the generated
California bank"* appeared on `s5-chapter-04` and `s6-chapter-04`, which have
**zero** `ccss-textbook-practice-v1` questions in the bank — all 8 checkpoint
items come from the generated one. The sentence is now conditional on what the
checkpoint actually holds.

## An item above its own grade band

The Kindergarten K.MD worked example and guided practice both read:

> A pencil is **11 cubes** long. An eraser is **8 cubes** long. Which object is
> longer? — *11 is greater than 8, so the pencil is longer.*

Three problems, all in Kindergarten:

- **Iterating length units is 1.MD.A.2.** Nothing in K.MD asks a student to
  measure with units; K.MD.A.2 is *directly* comparing two objects.
- **K.CC.C.7 compares written numerals 1–10.** 11 is outside the range.
- The lesson's own `commonPitfalls` lists **"confusing length with count"** — and
  this item invites exactly that.

The page's `launch` already modelled the correct move ("a pencil is longer than
an eraser"), and the interactive lesson directly above it says *"line them up so
they start at the very same spot … the one that sticks out farther is longer."*
Both are now that direct comparison, and the pitfall's repair move follows.

## Labels that describe part of what they label

| Block | Contained | Titled |
|---|---|---|
| `guided-practice` | 3 learning goals, then the guided practice | "Guided practice" |
| `mistake-repair` | practice tasks, then pitfall/repair pairs, then an exit ticket | "Mistake repair" |

A student who has just missed a checkpoint opens "Mistake repair" and reads
*"Write a two-step problem for a classmate"* first. Both titles now name
everything in their list, in both builders.

## Lists a reader cannot parse

**Standards in no order.** Rendered in raw assignment order: `6.SP.A.3,
6.SP.B.5, 6.SP.B.4` — 17 of 76 coverage lines and 19 of 64 teacher guides. A
plain sort was the wrong fix (it would hoist a borrowed `3.MD.C.7` above the
unit's own `3.OA` standards), so domains keep the order the page introduces them
and the codes inside each domain are sorted.

**Lesson titles containing commas, joined by commas.** 7 of the 35
"Misconception watch" lines:

> re-check The Equation of a Circle, Parabolas, Ellipses, Hyperbolas, Coordinate
> Proofs & Slopes

Five items where the chapter has three lessons — the middle one is "Parabolas,
Ellipses, Hyperbolas". Lines whose titles carry commas now join with `; `.

## Notation inconsistent with the task

Eight Grade 1 take-away items wrote one quantity as a numeral and the other as a
word — *"A picture shows 8 crackers. Three crackers are eaten. Write a
subtraction equation"* — in tasks whose whole point is mapping the two story
numbers onto `8 - 3 = 5`. Two reasoning lines did it inside a single sentence
pair (*"Five remain, so the equation is 8 - 3 = 5"*). The sibling join (H)
lessons use numerals throughout; the take-away (L) lessons now match.

## Verification

```
coverage lines naming unbacked standards      39 → 0    (claim reworded)
teacher guides claiming a wrong lesson count   0        (was already right)
"leads with hand-checked" false                2 → 0
out-of-order coverage lines                   17 → 0
out-of-order teacher guides                   19 → 0
ambiguous misconception-watch lines            7 → 0
"11 cubes" anywhere on any of the 76 pages     4 → 0
```

Gates re-run after each batch:

```
audit:ccss-lesson-interaction   270 interactive lessons — no interaction-copy defects
audit:us-ca-lesson-content       76 lessons, 614 blocks — no content defects
test:ccss-textbook               class audit + assignment contract passed
usCaliforniaLessons.test.ts      12 pass, 0 fail
tsc --noEmit                     clean
```

## What this round says about the previous six

Every earlier round audited the **interactive lessons**, because that is where
the mathematics is. The 328 blocks around them carry the page's *claims about
itself* — what it covers, what its checkpoint contains, what each section is —
and those had never been partitioned. Nine defects, including a false linkage on
39 of 64 pages, were sitting in plain text under six rounds of green gates.

The rule from round 6 holds and extends: **name the corpus before declaring it
clean.** "The California lesson page passes" meant "the interactive lessons pass"
for six rounds running. It now means 270/270 lessons *and* 328/328 surrounding
blocks.

Still open, and belonging to the visualization-lab owner rather than the lesson
library:

- signature-lab template selection does not match the lesson topic in several CA
  chapters (`p5-5-md-volume-data`, a volume unit, links the "arrays and area" lab)
- `labDescriptionForTopic` lowercases lesson titles mid-sentence
