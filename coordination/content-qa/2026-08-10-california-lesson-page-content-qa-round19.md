# California Math — Lesson-Page Content QA — 2026-08-10 (round 19)

**0 content defects. 2 defects in my own detector, both of which produced a
confident green tick before being caught.**

## The lens

Round 11 audited the stored *answers*. This audits the **working shown next to
them**. An explanation reading `Answer: 8 - 3 = 4` teaches a false fact even when
the keyed answer is right — and the student reads the working, not the key.

Covers both surfaces that print arithmetic: the 608 checkpoint questions'
`explanation` and `independentSolution`, and the 386 lesson content blocks.

**435 printed equations evaluated. All correct.**

## A lens abandoned first

Before this, WCAG 1.4.1 — information carried by colour alone. Measured across
every student-visible surface: **31 colour mentions, and 0 of them in a figure's
accessible name.** All 31 are word-problem prose — "You have 3 red apples and 2
green apples", "A tank has 2 orange fish and 6 silver fish". Colour there is a
narrative label, not a visual encoding; a colour-blind student reads the numbers
and adds. No figure requires telling two things apart by hue.

Dropped rather than written up. Turning 31 harmless mentions into findings is
exactly what round 13 refused to do.

## The two bugs in the checker

Both were mine, and both are worth recording because each one printed a pass.

**1. A trailing full stop silenced the entire gate.** The negative lookahead
rejected a `.` after the result, to avoid matching `4.5` mid-decimal. It also
rejected `= 4.` at the end of a sentence — which is how explanations are written.
The detector matched **nothing**, including the deliberately wrong equations in
its own fire test, and reported *"every printed arithmetic equation evaluates to
its stated result"*.

```
NOT MATCHED  Answer: 8 - 3 = 4.
NOT MATCHED  Add three: 4 + 2 + 3 = 10.
NOT MATCHED  6 × 7 = 41.
```

**2. A one-character lookbehind invented two defects.** `½ × 6 × 4 = 12` was read
starting at `6`, giving `6 × 4 = 12`, "evaluates to 24" — flagged as wrong. The
content is correct; the parser could not see the `½`. Same for `2·3 + 1 = 7`,
read as `3 + 1 = 7`.

Coverage went **73 → 435** once both were fixed. The first number came with a
green tick attached.

## What the parser refuses to judge

Everything it cannot fully evaluate is skipped, not guessed. Each of these was a
false positive during development, and each is correct content:

| printed | why it is skipped |
|---|---|
| `11² − 4×1×1 = 121 − 4 = 117` | a fragment of a longer chain |
| `½ × 6 × 4 = 12` | leading vulgar fraction it cannot read |
| `90/360 = 1/4` | the result is a fraction, not a number |
| `30/50 = 60%` | a percentage |

## Guards

- fails if it evaluated **zero** equations — the exact shape of bug 1;
- fails if it matched **fewer than 300**, because this corpus yields 435 and a
  quiet narrowing is indistinguishable from clean content;
- an evaluator canary (`3 + 2 × 4 = 11`, precedence);
- a **detector** canary that must still catch `Answer: 8 - 3 = 4.` embedded in
  ordinary prose — bug 1 would have been caught on day one by this line.

## Proven to fire on real content

A canary is not proof the gate works against the corpus, so a real explanation
was broken:

```
question-pack.json:  "Each jump adds ten: 30 + 10 = 40."  ->  "= 41."

✗ ccss-textbook-practice-v1-count-to-100-q01 (explanation)
      printed      : 30 + 10 = 41
      evaluates to : 40
```

Restored and verified byte-identical to the backup, with 0 occurrences of the
injected string remaining.

## Gates

```
audit:us-ca-lesson-equations      435 printed equations — clean (new)
audit:us-ca-lesson-label-claims   896 names, 56 recomputable claims — clean
audit:us-ca-lesson-readaloud      608 questions + 386 blocks — clean
audit:us-ca-lesson-illustrations    2 records — clean
audit:us-ca-lesson-content         76 lessons, 614 blocks — clean
audit:us-ca-checkpoint-grading    272 free-entry + 336 multiple-choice — clean
audit:us-ca-lesson-figure-bounds   76 pages, 76 with a real lesson figure — clean
audit:us-ca-lesson-label-motion    76 pages, 76 inspected — clean
lib/mathSpeech.test.ts 10 · answerMatching 10 · tsc --noEmit clean
```

## Still open

- **Owner decision:** clear or re-derive `independentAnswer`/`independentSolution`
  for the 464 `ccss-textbook-practice-v1` questions (round 17).
- Both California illustration records remain unreachable (round 14).
- 76 `extension` blocks have no renderer; 41 elementary pages discard their
  authored guided practice.
- Readability remains genuinely unaudited (round 13).
- The other session's **275 uncommitted files** are now ~26 hours untouched on
  this shared branch. My lesson-body block coverage in
  `audit-us-ca-lesson-readaloud.mts` is entangled with them and cannot land until
  they commit.
