# California Math — Lesson-Page Content QA — 2026-08-03 (round 1)

Content quality assurance of **everything a student reads on the California
math lesson page**: all 76 live US_CA_MATH lesson seeds, 614 rendered blocks —
lesson title, description, block titles, block bodies, and every checklist and
extension item, as the production `usCaliforniaLessonSeeds` path emits them.

Judged against the acceptance criteria a digital-learning publisher applies to
shipped courseware:

| # | Standard | Round-1 result |
|---|---|---|
| 1 | **Mathematical accuracy** — every literal arithmetic identity in displayed copy is true | 0 defects (24 identities re-derived; 0 mismatches) |
| 2 | **Instructional integrity** — guidance is specific to the lesson, not generic filler | 261 defects fixed |
| 3 | **Language quality** — grammar, article agreement, sentence type matches punctuation | 40 defects fixed |
| 4 | **Internal consistency** — copy promises and references only blocks the page renders | 163 defects fixed |
| 5 | **Learner-facing hygiene** — no internal identifiers, no stray punctuation | 172 defects fixed |

**375 → 0** on the automated gate (`npm run audit:us-ca-lesson-content`), plus
the authored remediation of boilerplate that a regex cannot judge.

Companion tooling:

- `scripts/audit-us-ca-lesson-content.mts` — renders every CA lesson seed to
  displayed text and asserts standards 1, 3, 4, 5. Run via
  `npm run audit:us-ca-lesson-content`; `--dump <file>` writes the full
  rendered corpus for manual review. Verified to fire: 375 findings against
  `HEAD`, 0 after the fixes in this round.

## Scope note — where the displayed text comes from

All 29 K–G5 textbook topics and all 35 G6–G12 chapter topics now render an
**interactive CCSS lesson core**, so the generated `launch` /
`conceptExplanation` / `workedExample` fields of the K-5 pack are no longer
displayed. What *is* displayed from that pack is `learningGoals`,
`guidedPractice`, `independentPractice`, `commonPitfalls` and `exitTicket` —
and that is where the round-1 defects clustered. The 12 Grade-1 H/L micro
lessons keep their own hand-authored concept and worked-example blocks; those
were reviewed and found clean.

## Defects found and fixed

### 1. Internal identifiers printed to students (105 instances, 35 lessons)

The scaffolded-practice checklist printed the machine-readable skill-stage ids:

> Foundation skill **us-ca-math-p6-chapter-01:foundation**: restate what the
> question asks…

Fixed: learner copy names the stage in words ("Foundation: …"). The stage ids
stay in the coverage record and the teacher guide, which is what consumes them.

### 2. Template splice broke every K-5 learning goal (25 lessons)

`learningGoals[0]` was assembled as `"Use models and words to reason about " +
<cluster goal>`, and the cluster goal is itself a verb phrase — producing
"…reason about **connect** number words…", "…reason about **use** one-to-one
correspondence…", "…reason about **treat** teen numbers…" in 25 of 29 lessons.

Fixed: all 29 lessons' three learning goals were re-authored per lesson against
their CCSS cluster, replacing both the spliced goal and the two boilerplate
goals that were byte-identical across all 29 lessons.

### 3. Guided-practice prompts punctuated as questions but written as commands (9 lessons)

> A ten-frame is full and 7 more counters are beside it. **Explain what teen
> number is shown?**

Nine prompts had an "Explain what …?" shape. Fixed to direct questions
("What teen number is shown?").

### 4. Guided-practice coaching did not match its own prompt (29 lessons)

Every `expectedMove` was the same sentence — "Name the quantities, choose a
representation, solve, and check the units or labels" — including on
"Which shape has 3 straight sides?", which has no quantities and no units.

Fixed: each expected move now describes the actual move for that prompt
("Count the straight sides on each shape, then name the one with exactly 3").

### 5. Mistake-repair moves did not address the named misconception (57 pitfalls)

Every `repairMove` in the K-5 pack was the same sentence — "Return to the model,
label each quantity, and compare the result with the question" — attached
indiscriminately to "counting objects twice", "2D/3D confusion",
"adding denominators", and 54 others. A repair move that does not name the
repair is not remediation.

Fixed: all 57 pitfalls now carry a specific repair (e.g. "adding denominators"
→ "Only the numerators add; the denominator names the size of the part and
stays the same once the parts match").

### 6. Independent practice was identical in all 29 lessons

"Create one similar problem with different numbers or objects." /
"Swap with a partner and explain the checking step." — in every K-5 lesson.
Re-authored per lesson.

### 7. Lesson descriptions promised blocks the page does not render (64 lessons, 128 findings)

Descriptions still advertised "concept explanation, worked example, …" after
the interactive CCSS core replaced those blocks. Fixed: the description is now
derived from the core the topic actually renders.

### 8. Mistake repair pointed at a worked example that is not on the page (35 lessons)

> Redo one missed checkpoint with a new representation, then compare it with
> **the worked example**.

Fixed: topics with an interactive core now point at the Math Check inside the
lesson; topics that still have a worked-example block keep the original wording.

### 9. Misconception watch listed other chapters' topics (35 lessons)

The watch list was built from the generated question bank's `conceptIds`, which
are shared across a whole grade band and are rotated one chapter off against the
chapter topics (the same rotation `scripts/build-ccss-lesson-assignments.mjs`
documents as "tag … is rotated"). Result: **12-A.1 Quantities, Units, and
Precision** told students to re-check "Quantitative Reasoning, Polynomial
Models, Decision Statistics", and every Grade 6 chapter — including
**6-E.1 Statistics and Data Distributions** — told students to re-check
"Ratios, Unit Rate, Rational Numbers".

The same rotation drove the first repair line, which named the wrong domain:
**9-C.1 Linear and Quadratic Models** said "carrying out the **coordinate
geometry** calculation".

Fixed: the watch list is now built from the topic's own assigned CCSS lesson
titles (authoritative and per-lesson); the first line no longer asserts a
domain it cannot verify.

### 10. Punctuation defects in rendered copy (67 findings)

- `".: "` — 24 items. Grade-1 micro-lesson pitfalls are full sentences ending
  in a period, and the template joined them as `${pitfall}: ${repairMove}`,
  rendering "…groups are close together**.:** Mark each object…". Fixed with a
  shared `pitfallItemText` join that trims the sentence-final period.
- `"...)"` — a bare three-dot truncation inside the visualization block's
  standard list ("(K.OA.A.1, K.OA.A.2, K.OA.A.3**...**)"), which reads as a
  rendering bug. Now "…, and more".

### 11. Article agreement (6 lessons)

"…helped you solve **a operations** and algebraic thinking problem." Removed
along with the exit-ticket rewrite (exit tickets are now lesson-specific and no
longer interpolate a domain title behind an article).

## Verified clean this round

- **Arithmetic** — every literal identity in displayed lesson-page copy and in
  the 270 ported interactive lesson sources re-derived; 0 mismatches.
- **Interactive CCSS lesson prose** (270 lessons, ~185k chars of static copy) —
  scanned for doubled words, article disagreement, unescaped entities and stray
  punctuation. Every hit inspected against source was an artifact of the text
  extractor stripping `{…}` expressions; **0 genuine defects**. The library's
  hand-built/verified claim holds under this check.
- **Visualization Lab block titles** — match their lesson titles in all 76.

## Open findings — not fixed here, for the owning session

1. **Signature-lab template selection mismatches the lesson topic** for some
   chapters. The lesson page truthfully reports the lab's own category, so the
   copy is accurate but the *lab choice* reads wrong:
   - `us-ca-math-s4-chapter-01` **Congruence and Proof** → "right triangles" lab
   - `us-ca-math-s6-chapter-01` **Quantities, Units, and Precision** →
     "statistics and distributions" lab
   - `us-ca-math-s6-chapter-05` **Capstone Modeling** →
     "statistics and distributions" lab

   Selection is keyword-driven in `templateForTopic`
   (`data/visualizationLabs.ts`). Rewriting the lesson-page sentence would hide
   the mismatch rather than fix it, so it is reported instead. Owner:
   visualization-lab session.

2. **Lab summaries lowercase the lesson title.**
   `labDescriptionForTopic` interpolates `title.en.toLowerCase()`, producing
   "Use a focused right triangles model to explore **10-a.1 congruence and
   proof**…". Not displayed on the lesson page (the lesson page uses
   `lab.title` and `lab.category` only), so it is out of this round's scope —
   but it is a real defect on the Visualization Lab catalog surface, and it
   affects every curriculum track, not just California.

## Round 2 queue

- Browser pass over the rendered lesson page for **interaction** copy: control
  labels, live readouts, and empty/edge states inside the interactive CCSS
  lesson bodies (this round audited their static prose only).
- Deep mathematical review of the interactive lesson bodies' *conceptual*
  claims (the Math Check statements), beyond the arithmetic check that is
  already automated.
- Traditional/Simplified Chinese review of the rewritten California copy —
  round 1 rewrote English learner copy; the templated Chinese in
  `usCaliforniaLessons.ts` was kept in sync, but the K-5 pack is English-only
  by design and its Chinese surface should be confirmed with the
  `audit:zh-hans` gate.

## Gates run

```
npm run audit:us-ca-lesson-content        ✓ 76 lessons, 614 blocks, 0 defects
npx tsc --noEmit -p tsconfig.json         ✓
npx tsx --test data/usCaliforniaLessons.test.ts
                                          ✓ 12/12
npx tsx --test data/usCaliforniaMathematicalPractices.test.ts
                                          ✓ 5/5
npm run test:ccss-textbook                ✓ class audit 276 files clean + 8/8 contract
```
