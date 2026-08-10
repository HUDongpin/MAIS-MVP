# California Math — Lesson-Page Content QA — 2026-08-11 (round 21)

**0 content defects. 1 defect in how I had been proving my gates work — which
applies retroactively to every fire test in this effort.**

## The lens

Rounds 9 and 10 found wrong *geometry* computed from control state. Round 18
verified the arithmetic a figure's accessible *name* asserts. Neither read the
numbers a figure **prints**.

So: drive every control to both extremes and, at each reachable state, check the
figure's own text for values that cannot exist.

```
897 accessible names
527 distinct printed figure states
 76 pages, 58 driven, 6220 control presses
```

Rules: `NaN` / `Infinity` / `undefined`, `[object Object]`, an unreplaced
`${...}`, a division shown over zero, negative zero, an unrounded float (>4
decimals), a probability outside 0..1, a percentage above 100.

**All clean.** Each rule was checked against its own probe (8/8 fire) and against
ordinary figure text (`8 | + | 3 | = | 11`, `P(A) = 0.35`, `45%` — 0 false
positives), and both checks now run inside the gate so a silently dead rule
cannot pass.

## The real finding: my fire tests could lie

I injected `const perimeter = 2 * (w + h) / 0` into a live component and re-ran
the gate. **It reported clean.** The obvious conclusion was that the rule did not
cover accessible names.

That conclusion was wrong. The dev server had not recompiled, so the gate read
the **old bundle**. The tell was in the coverage line:

```
... 137 control presses, 13 recomputable claims     <- unchanged
```

If the label had genuinely become `perimeter Infinity`, the perimeter pattern
would have stopped matching and that count would have **dropped**. It did not
move, which meant nothing had changed at all.

Reading the page directly settled it:

```
labels mentioning perimeter: [ 'rectangle 6 by 3, perimeter Infinity' ]
```

and the gate then fired on every driven state.

**This applies backwards.** Rounds 18 and 20 both "proved" their gates by
breaking real code, and both happened to pass — but only because the gap between
edit and run was long enough to recompile. Neither verified that the defect was
actually being served. They were right by luck, not by method.

From here: **see the broken value on the page before trusting a fire test.** The
rule is written into the gate's header so the next person does not repeat it.

## Why this matters more than the clean result

Five rounds have now turned on the same question — *is this green tick attached
to anything?*

| round | the tick that meant nothing |
|---|---|
| 14 | gate reported "76 pages clean" while loading `/login` |
| 17 | `independentAnswer` agreed with `answer` because it was a copy of it |
| 19 | equation parser matched nothing; a trailing `.` killed every match |
| 20 | standards check reported 0 mismatches from 0 comparisons |
| 21 | fire test passed against a stale bundle |

The countermeasure has been identical every time and is now in every gate I have
written: **print what was actually compared, and make the gate fail when that
number collapses.** Round 21 adds one more: a test that proves a gate works must
itself be verified.

## Folded in, not bolted on

The printed-value checks live inside `audit:us-ca-lesson-label-claims` rather
than in an eleventh gate, so CI still makes a single browser pass over the 76
pages instead of two.

## Gates

```
audit:us-ca-lesson-label-claims  897 names + 527 printed states — clean
audit:us-ca-question-alignment   608 questions, 1095 standard comparisons — clean
audit:us-ca-lesson-equations     435 printed equations — clean
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
  branch, still blocking my lesson-body block coverage in
  `audit-us-ca-lesson-readaloud.mts`.
