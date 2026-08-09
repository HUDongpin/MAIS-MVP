# California Math — Lesson-Page Content QA — 2026-08-09 (round 15)

**94 questions were inaudible when read aloud. 53 of them to any K–3 student,
with no accommodation involved. Fixed, with the defect and the fix both measured
in actual audio.**

Fourteen rounds audited what the page *shows*. This one audited what it *says*.

> **Two corrections to this report's own first draft**, both found by pushing
> harder after it was written:
>
> - The count was **94, not 76**. The first regex required a digit on each side
>   of the minus, so it missed algebraic subtraction (`x − y`).
> - The framing was wrong. I described this as an opt-in accommodation affecting
>   few students. `PracticeQuestionCard.tsx:359` sets
>   `shouldShowReadAloud = isYoungLearnerPracticeGrade(question.grade)` for
>   grades **{K, P1, P2, P3}** with **no accommodation gate**, and
>   `LessonView.tsx:915` renders that card for the lesson's checkpoint. So
>   **53 of the 94 were reachable by every K–3 California student** who pressed
>   a visible button.
> - A third failure mode was missed entirely on the first pass. See
>   *"The test that lied"* below.

## The surface

The California lesson page speaks its checkpoint questions through **two**
read-aloud buttons, and neither normalized its text.

1. `LessonView.tsx` — gated on the accommodation a teacher sets with
   `setStudentAccommodationsForTeacher`.
2. `PracticeQuestionCard.tsx:359` — gated only on `question.grade` being one of
   **{K, P1, P2, P3}**, with *no* accommodation check. `LessonView.tsx:915`
   renders this card for the checkpoint, so on a K–3 California lesson the
   button is simply there for everyone.

The first path speaks:

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
| `3/4`, `3⁴`, `=` | — | differs — voiced |
| `<`, `>` **alone** | — | differs — voiced *(this reading was an artifact — see "The test that lied")* |
| `−5 degrees` | `5 degrees` | differs — voiced |

**Only two of the inventoried classes are silent** — and the inventory would have
flagged five more that are perfectly fine, while missing a third class entirely
(below). It would also have missed that the **ASCII hyphen
is equally silent** — so the intuitive fix, swapping one dash character for the
other, does nothing at all. Only the word works.

The other nuance the audio gave up: a minus **attached to its digit** (`−5`) *is*
voiced. Only the **spaced binary** form disappears. A fix that rewrote both would
have changed output that was already correct.

## What a student heard

94 questions, 40 of them Grade 1 and 9 Kindergarten. **53 sit at grades K–P3**,
where the button needs no accommodation at all — so this was not a small opt-in
population, it was every young California student who pressed it.

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

## The test that lied

The first pass measured every symbol **in isolation** and cleared five of them:
`<` alone renders 54,804 bytes of real audio, so `<` is fine. That conclusion was
wrong, and it was wrong because of how it was measured.

An adversarial verifier in the accompanying workflow found it. Symbols are only
voiced when the engine sees one in a sentence it can normalize. Put two bare ones
in the same utterance and the normalizer gives up entirely:

```
say("<")                ->  54,804 bytes, 1.149s
say("<. >")             ->   4,096 bytes, 0.000s   header only, no audio
say("< > = +")          ->   4,096 bytes, 0.000s
say("Pick one. <")      ->  byte-identical to say("Pick one. ")
```

Which is exactly the shape the lesson page builds — options joined bare with
`". "`. So the flagship question was worse than first reported:

```
"Which symbol makes it true?  3 __ 8. <. >. =. +"   md5 869f0ca88288a1d8
"Which symbol makes it true?  3 8"                  md5 869f0ca88288a1d8
```

**Byte-identical.** The blank is silent *and* the option list is silent. A
Kindergarten student heard "which symbol makes it true? three eight" and then
nothing for the two options that are the actual candidate answers.

Measured properly this time, standing alone: `<` `>` `≤` `≥` and a bare minus
disappear; `=` `+` `×` `÷` `π` `≠` do not, and were left alone. A symbol *inside*
an expression (`3 < 8`) is voiced. The practice card's `"Choice 1: "` prefix also
keeps its options voiced — which is why this defect is specific to the lesson
page.

`speechTextForMathParts` therefore takes the prompt and options **separately**:
once joined, `". <. "` is indistinguishable from a `<` inside an expression, and
rewriting that would break content that is already correct.

The lesson generalizes past this round. An isolation test is not a smaller
version of the real test — it can be a different test with the opposite answer.
Round 14's failure was a gate pointed at the wrong page; this one was a
measurement taken in the wrong context. Both printed a confident green.

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
audit:us-ca-lesson-figure-bounds  76 pages, 76 with a real lesson figure — clean
audit:us-ca-lesson-label-motion   unverified — see below
```

## Not verified this round, and why

Another session is working in this worktree concurrently — 212 files changed
against my HEAD, including a substantial rewrite of both browser gates and ~115
CCSS lesson components. That is the one-session-one-worktree rule in `CLAUDE.md`
being broken, and it has three consequences:

1. **`audit:ccss-lesson-interaction` reports 2 defects** — a plural-agreement bug
   (`"1 cookies"`) at `add-subtract-stories.tsx:84`. This is **not** a shipped
   defect: the word "cookies" does not appear anywhere in that file at my HEAD.
   It exists only inside the other session's uncommitted edit, and their own new
   detector caught it. Their work in progress, not this loop's finding.
2. **`figure-bounds` is now genuinely verified — and its own wait condition was
   the bug.** Runs against the shared server timed out at 90s (it was recompiling
   constantly: `/login` took 10.7s there against 0.07s on an isolated server).
   Against an isolated snapshot it still aborted, reproducibly, on
   `us-ca-math-s5-chapter-01`. That looked like a page defect. It is not: the
   page loads in **0.7s** with 4 figures and no console errors, and its
   `/api/media-objects` calls stop after 10 requests at t+6s — no runaway poll.
   The gate's `waitUntil: "networkidle"` simply never settles under Next dev HMR.
   Re-run with `domcontentloaded` — the gate already waits for the figure
   explicitly, so networkidle was redundant — it reports **76 pages, 76 carrying
   a real lesson figure, clean**. That is the first trustworthy run of this gate:
   authenticated, on the lessons, with figures actually present.

   The fix belongs in the gate, but that file is open in the other session, which
   has already rewritten it. Left for them rather than colliding; the measurement
   above was taken with a scratch copy.
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
