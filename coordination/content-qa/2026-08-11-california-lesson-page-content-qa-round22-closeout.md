# California Math — Lesson-Page Content QA — 2026-08-11 (round 22, close-out)

**The loop's open items are closed. The loop itself now pauses, with 11 gates as
the standing guard.**

Every item below was implemented on the owner's instruction ("I accept all
suggestions and please implement").

## 1. Everything is pushed

14 commits from rounds 14–21 existed only on one disk; they are on origin now,
along with everything below.

## 2. The dormant session's 315 files are landed — verified, not trusted

The concurrent session went quiet on 2026-08-09 with 275 modified + 40 untracked
files. Landed after: tsc clean, all six fast gates green, its own 11 new test
files 58/58, my three suites 35/35, and its `"1 cookies"` plural fix confirmed
in. Its `toPlainMathText` work closes the round-15 open item, and my lesson-body
readaloud coverage landed with it.

## 3. The four owner decisions

**Copied "independent" fields — cleared.** By landing day the copy pattern had
spread to all **810** questions in the pack (round 17 counted 462). Removed
both keys from every question, verified with a structural diff (exactly two keys
per question, zero other changes). One real consumer surfaced —
`acceptedAnswersFor` fed `independentAnswer` into grading, where a byte-copy of
`answer` was a dedup no-op — adjusted with behavior provably unchanged. The k5
(121) and g6-g12 (23) batches keep their fields: their prose differs from their
explanations, which is what a genuine second solve looks like.

**Illustrations — reachable at last.** Authored companion blocks restore the
`concept`/`worked-example` slots on the Grade 1 page, with copy agreeing with
the SVGs element-for-element (8 + 3 = 11; Lena's 7 + 4 = 11). Browser-verified:
**2 illustration `<img>` tags render at 1600×900** where round 14 measured 0.
The retiring test had promised "a later phase can re-attach it" — this is that
phase, and the tests now assert the re-attachment rather than the retirement.

**Extension blocks and discarded guided practice — rendered.** One hole, not
two: the completion checklist was the only place items-shaped blocks rendered.
A read-only "More practice" section now shows the extension block and the
authored guided-practice items past the elementary 3-item completion cap.
Browser-verified: 6 authored items visible on the Grade 1 page, completion
tracker untouched at exactly 3 checkboxes. Deliberately gated to `US_CA_MATH` —
nine other curricula also author never-rendered extension blocks, and switching
a decade of unseen content live on unaudited pages is a separate decision.

## 4. Gates wired into the release path

- `npm run audit:us-ca` — the seven fast data-layer gates in one command
- added to `npm run check` (the full local sweep) and to RELEASE.md step 3
- browser gates stay pre-release (they need a dev server), documented as such

## 5. One more lens, run and disciplined

`audit:us-ca-answer-shape`: a "rounded to the nearest ten" answer must be a
multiple of ten; "how many" must key a non-negative number unless an equation
was requested; "what fraction" keys a/b. **271 questions, 84 comparisons,
clean.** Its first draft flagged 4 questions — all correct content ("how many
cups per hour" keys 1.5; picture-story prompts request equations) — and was
narrowed to the defensible core before being trusted, per round 13.

Readability remains unaudited, deliberately: round 13 falsified the standard
instrument, and shipping an uncalibrated replacement would repeat the mistake
this loop spent nine rounds unlearning.

## The standing guard

```
audit:us-ca  (release path, seconds)
  lesson-content        76 lessons, 616 blocks
  checkpoint-grading    272 free-entry + 336 MC
  lesson-readaloud      608 questions + 388 blocks
  lesson-equations      333 printed equations
  question-alignment    608 questions, 1095 standard comparisons
  answer-shape          271 free-entry, 84 shape comparisons
  lesson-illustrations  2 records, both reachable

pre-release (browser)
  figure-bounds · label-motion · label-claims (+ printed-value rules)
```

Every gate prints what it compared and fails when that number collapses — the
one discipline that held up across all 22 rounds.

## Loop status: paused

Four consecutive content-clean rounds preceded this close-out, and the items
that remained were decisions, which are now made. The user can restart anytime
with /loop; the gates run without me.
