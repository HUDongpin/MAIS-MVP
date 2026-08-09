# California Math — Lesson-Page Content QA — 2026-08-09 (round 15)

**76 questions on 33 pages were inaudible to the students who need them read
aloud. Fixed, with the defect and the fix both measured in actual audio.**

Fourteen rounds audited what the page *shows*. This one audited what it *says*.

## The surface

The California lesson page carries a read-aloud accommodation. When a teacher
enables it (`setStudentAccommodationsForTeacher`), a **Read aloud** button
appears on the checkpoint, and `LessonView.tsx` speaks the question:

```ts
const parts = [t(question.prompt), ...(question.options ?? []).map(t)];
readAloud.speak(parts.join(". "));
```

`useReadAloud.ts` does **zero preprocessing** — the raw string goes straight into
`new SpeechSynthesisUtterance(text)`.

## The measurement

The obvious move is to inventory the notation and call it a finding: 51 minus
signs, 36 fraction slashes, 31 multiplication signs, 29 superscripts, 27 blanks,
26 assorted symbols, 15 division signs. **That list is wrong**, and round 13
already taught why guessing is not evidence.

So it was measured. Each string was rendered with
`say -v Samantha -r 95` — the Apple voice assets the browser exposes as its local
en-US voice, at the app's own rate — and the audio compared by MD5 against the
identical string with the token deleted. **Identical bytes means the token was
never voiced.**

| string | vs. token deleted | verdict |
|---|---|---|
| `80 − 30 = ?` | `80  30 = ?` | **byte-identical — silent** |
| `80 - 30 = ?` | `80  30 = ?` | **byte-identical — silent** |
| `6 + ___ = 10` | `6 +  = 10` | **byte-identical — silent** |
| `3 __ 8` | `3  8` | **byte-identical — silent** |
| `6 + 4 = 10` | `6  4 = 10` | differs — voiced |
| `9 × 80` | `9  80` | differs — voiced |
| `24 ÷ 6` | `24  6` | differs — voiced |
| `35° and 40°` | `35 and 40` | differs — voiced |
| `3/4`, `3⁴`, `<`, `>`, `=` | — | differs — voiced |
| `−5 degrees` | `5 degrees` | differs — voiced |

**Only two token classes are silent**, and the inventory would have flagged five
more that are perfectly fine. It would also have missed that the **ASCII hyphen
is equally silent** — so the intuitive fix, swapping one dash character for the
other, does nothing at all. Only the word works.

The other nuance the audio gave up: a minus **attached to its digit** (`−5`) *is*
voiced. Only the **spaced binary** form disappears. A fix that rewrote both would
have changed output that was already correct.

## What a student heard

76 questions across 33 pages, overwhelmingly Kindergarten and Grade 1 — which is
exactly the population a read-aloud accommodation exists for.

| shown | heard |
|---|---|
| `10 + 8 = ___.` | "ten plus eight equals." |
| `5 is made of 2 and ___.` | "five is made of two and." |
| `The lamp is ___ the table.` | "the lamp is the table." |
| `80 − 30 = ?` | "eighty thirty equals" |
| `Which symbol makes it true? 3 __ 8` | "which symbol makes it true? three eight" |

The blank is the entire question. Without it there is nothing to answer.

## The fix

`lib/mathSpeech.ts` — `speechTextForMath`, applied only to the spoken string,
never to what is displayed:

- a run of 2+ underscores becomes " blank "
- a **spaced** binary minus, either dash character, becomes " minus "
- nothing else

Deliberately narrow, in the round-12 style. The tests assert the
non-transformations as hard as the transformations: `twenty-one`, `a left-hand
turn`, `2026-08-09`, `−5 degrees`, `3 < 8`, `1,234` and `0.5` must all survive
untouched, and no rewrite may reverse a comparison or alter a number.

Then the fix itself was measured the same way it was found:

```
BEFORE   "80 − 30 = ?"      vs stripped -> STILL SILENT
AFTER    "80 minus 30 = ?"  vs stripped -> now audible
BEFORE   "10 + 8 = ___."    vs stripped -> STILL SILENT
AFTER    "10 + 8 = blank ." vs stripped -> now audible
```

**Applied to the practice card too.** `PracticeQuestionCard.tsx` already runs
`toPlainMathText` before speaking — but that function resolves LaTeX and leaves
both silent tokens alone, so the same defect was live on a second surface. Naming
a gap and not closing it is how rounds 3, 5 and 9 went wrong.

## New gate: `audit:us-ca-lesson-readaloud`

Builds the string the app actually speaks for all 608 checkpoint questions, runs
the same normalizer, and fails on any surviving silent token.

Proven to fire before being trusted: **94 instances with the normalizer bypassed,
0 with it.** It also refuses to report a pass if it checked nothing, or if its own
detector stops firing on a known-bad canary — so a future edit that neuters
`speechTextForMath` cannot leave this gate green.

It deliberately does **not** flag `+ = × ÷ °`, superscripts or `3/4`. Each was
measured as audible, and a gate that fails on correct content is worse than no
gate.

## An agent's claim that did not survive checking

An adversarial verifier reported that `lib/practiceReadAloud.ts` contains a
`toPlainMathText` that "flips a comparison" and "flips a sign". Checked directly:
that function is not in that file, and running the real
`toPlainMathText` over the California corpus reproduced **no** sign or comparison
flip.

The underlying point was still worth having — there *is* a second, more mature
read-aloud stack, in `PracticeQuestionCard.tsx` — which is why the fix was applied
there too. But the specific defect claim was wrong, and a report built on it would
have been wrong.

One genuine oddity did turn up while checking: `toPlainMathText("Evaluate
8^(1/3).")` returns `Evaluate 8^{1/3}.`, **introducing** braces before the text is
spoken. Filed below rather than fixed, because it belongs to the practice
question pipeline rather than this lens.

## Gates

```
audit:us-ca-lesson-readaloud     608 questions — every one audible
audit:us-ca-lesson-illustrations   2 records — loadable, proportioned, described
audit:us-ca-lesson-content        76 lessons, 614 blocks — clean
audit:us-ca-checkpoint-grading   272 free-entry + 336 multiple-choice — clean
lib/mathSpeech.test.ts             6 pass · answerMatching 10 pass
data/usCaliforniaLessons.test.ts  13 pass · tsc --noEmit clean
audit:ccss-lesson-interaction      2 defects — NOT mine, see below
audit:us-ca-lesson-figure-bounds  unverified — see below
audit:us-ca-lesson-label-motion   unverified — see below
```

## Not verified this round, and why

Another session is working in this worktree concurrently — 212 files changed
against my HEAD, including a substantial rewrite of both browser gates and ~115
CCSS lesson components. That is the one-session-one-worktree rule in `CLAUDE.md`
being broken, and it has three consequences:

1. **`audit:ccss-lesson-interaction` reports 2 defects** — a plural-agreement bug
   (`"1 cookies"`) at `add-subtract-stories.tsx:84`, found by *their* new
   detector, in a file they have open. Real, in scope for this loop, and left to
   them rather than colliding on it.
2. **The browser gates are unverified.** Runs against the shared server timed out
   at 90s (it was recompiling constantly — `/login` took 10.7s there against
   0.07s on an isolated server). A run against an isolated snapshot worktree then
   aborted on a Next-dev navigation race. In both cases the gate refused to
   report a pass, which is the hardening from round 14 working. But neither is
   evidence of clean.
3. Their rewrite **improved my round-14 auth assertion**: I compared with
   `landed.includes(path)`, they compare `new URL(landed).pathname`. Substring
   matching would pass on `/login?next=/student/lessons/<slug>` were it not for
   my separate `/login` check. Theirs is the better test.

## Still open

- `toPlainMathText` rewrites `8^(1/3)` to `8^{1/3}` before speech.
- The plural-agreement defect above, once the other session lands.
- Both California illustration records remain unreachable (round 14).
- 76 `extension` blocks have no renderer; 41 elementary pages discard their
  authored guided practice.
- Readability remains genuinely unaudited (round 13).
