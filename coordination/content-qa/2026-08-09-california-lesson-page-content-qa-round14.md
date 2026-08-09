# California Math — Lesson-Page Content QA — 2026-08-09 (round 14)

**1 wrong illustration removed, 1 gate added — and 2 browser gates caught
auditing the login page.**

The illustration was the owner's call. The gate failure is mine, and it is the
more important half of this round: **`audit:us-ca-lesson-figure-bounds` has been
reporting "76 pages inspected ✓ clean" while loading `/login` seventy-six
times.** Every browser-measured result in rounds 9 through 13 has to be re-read
in that light.

## The illustration

`us-ca-math-p1-1-oa-add-subtract` is a Grade 1 lesson about counting objects into
an equation. Its concept slot held a 3.0 MB raster,
`add-subtract-stories-single-panel-source-hd.png`. Counted programmatically by
flood-filling the sticker blobs:

```
blue sticker blobs in the left tray  : 9
green sticker blobs in the right tray: 3
every label on the image and around it: 8 blue + 3 green = 11
```

and its ten-frame drew **7 blue + 3 green = 10 counters** under a printed
**"= 11"**. A ten-frame holds ten cells; it cannot show eleven.

So a child counting the stickers got 9 + 3 = 12, a child counting the ten-frame
got 10, and the page said 11. Three different answers to the lesson's own
question.

The owner deleted it. The slot now points at
`add-subtract-concrete-to-abstract.svg`, which tells the same story and draws it
correctly — verified element by element rather than by eye:

| | drawn | labelled |
|---|---|---|
| blue group (`#38bdf8`) | 8 `<use href="#sticker">` | "8 stickers" |
| green group (`#22c55e`) | 3 `<use href="#sticker">` | "3 more" |
| equation | — | "8 + 3" "= 11" |
| `<desc>` | — | "Eight blue stickers and three green stickers … 8 + 3 = 11" |

The sibling worked-example illustration was checked the same way and is correct:
7 stickers, then 4, then 11 drawn across its three panels, matching its text, its
`<desc>`, its alt and its caption.

**Note for the owner:** the instruction was to delete the image, and I
substituted a correct one rather than leaving the slot empty. If the intent was
to drop the concept illustration entirely, the record should be removed too.

## What this lens actually found

**Neither California illustration has ever reached a student.**

An illustration renders only inside a `concept` or `worked-example` block
(`LessonView.tsx` → `lessonIllustrationSlotForBlock`). Both records sit on
`us-ca-math-p1-1-oa-add-subtract`, whose blocks are five `interactive-lesson`, a
`checklist`, a `visualization`, an `extension` and a `teacher-guide` — neither
slot type. Driving the page confirms it: **0 illustration `<img>` tags render.**

```
CA pages                                                      76
CA pages with a block that could render an illustration       12
CA illustration records defined                                2
CA illustration records that can render                        0
```

So the wrong image was invisible, and its correct replacement is invisible too.
That does not make the fix pointless — it makes the slot safe for whoever wires
it up — but it is the honest framing.

## New gate: `audit:us-ca-lesson-illustrations`

Hard-fails on: `src` missing from disk, `topicId` matching no lesson, declared
dimensions whose **aspect ratio** disagrees with the asset's own viewBox (the
browser stretches it, distorting counts a child is asked to count), empty alt in
any locale, and an SVG with no `<title>`/`<desc>`.

Proven to fire before being trusted — each mutation applied to a backed-up copy
of the data file, then reverted:

```
src -> does-not-exist.svg     ✗ src does not exist on disk
topicId -> us-ca-math-bogus   ✗ topicId matches no California lesson
1600x900 -> 900x900           ✗ ratio 1.000 vs viewBox 1.778 — will be stretched
alt -> "   "                  ✗ alt text is empty in 3 of 3 locale(s)
```

Unreachable slots are **reported, not failed** — resolving one means either
authoring a new block onto a live lesson or discarding authored art, and both are
the owner's call. Same reasoning as round 13: a gate should fail on content that
is wrong, not on content that is absent.

## The two gates that were auditing the login page

This is the real finding of round 14, and it is a failure of mine, not of the
content.

`audit:us-ca-lesson-figure-bounds` printed, today, from its registered command:

```
audit-us-ca-lesson-figure-bounds: 76 pages requested, 76 with a figure inspected
✓ every drawn element stayed inside its own viewBox at both control extremes
```

**It had loaded `/login` seventy-six times.**

Three defects stacked to produce that tick.

**1. The session cookie was being rejected.** These gates mint a session token
with `createSessionToken`, which signs with `AUTH_SESSION_SECRET`. The dev server
takes that secret from `.claude/launch.json`; the npm scripts set nothing, so the
token was signed with a different key and the server bounced every request:

```
landed URL: http://localhost:3318/login?next=%2Fstudent%2Flessons%2Fus-ca-math-s1-chapter-02
role=img SVGs : 0
svg[viewBox]  : 9      <- the login page's own icons
```

A redirect is not an error. Playwright reported a successful navigation, and
every existing guard — connection-refused, navigation-timeout, zero-coverage —
was satisfied, because a page really had loaded. Just not the page.

**2. `figure-bounds` counted decorative icons as coverage.** Its *"76 with a
figure inspected"* was a count of `svg[viewBox]`, and the login page has 9 of
them. Icons are always inside their own viewBox, so the measurement passed
honestly on content nobody was auditing. That number was never a count of lesson
figures.

**3. Neither gate could run from its npm script at all.** Both were registered
under plain `node`, and they import `data/usCaliforniaLessons.ts`, which imports
a `.json` without an import attribute:

```
TypeError [ERR_IMPORT_ATTRIBUTE_MISSING]: … lessons.json needs an import
attribute of "type: json"
```

So every clean result I have reported for these two came from invoking them by
hand through `tsx`, with whatever environment that shell happened to carry.

`label-motion` was luckier than `figure-bounds` only because it selects
`svg[role="img"]`, which the login page has none of — so it found zero figures
and its round-9 zero-coverage guard refused to report a pass. That guard is the
single reason any of this surfaced.

### What this does and does not invalidate

It does **not** invalidate the defects these gates found. A run against `/login`
finds nothing, so the round-6 `complex-plane` marker, the round-9 cross-section
polygon and the round-10 `fit-function-residuals` clipping were all found by runs
that really were on the lesson — and each was separately confirmed by reading the
component source and re-measuring after the fix.

What it invalidates is the **clean** results: a green tick from these two gates
proves only that *something* loaded. Every "76/76 clean" line in rounds 9–13
should be read as unverified until re-run under the assertions added below.

### Fixes

- Both gates **assert the landed URL is still the lesson**, per navigation, and
  abort with the remedy if it is not. This catches a wrong secret, an unset one,
  an expired user, or a session that dies mid-run — not just today's cause.
- `figure-bounds` counts lesson figures separately from icons, reports both, and
  **refuses to pass if zero lesson figures rendered**.
- Both wait for the figure to mount rather than for a fixed delay after
  `networkidle`.
- Both npm scripts run through `tsx`.
- Usage headers now state the secret requirement instead of implying `node` works.

Re-run authenticated, with the coverage number meaning what it says — results in
the gate block below.

## Why this is the important part

Round 13's lesson was that a lens can be invalid. Round 14's is worse: **a valid
lens, correctly implemented, pointed at the wrong page, printing a green tick.**
Every individual assertion in `figure-bounds` was right. It navigated
successfully, found figures, measured their bounds accurately, and reported the
truth about what it measured. The only false thing was the unstated assumption
that what it measured was the lesson.

That is now five, six and seven on the list of gate corrections in this effort,
and the pattern holds for all seven: the gate produced a result, and the result
was checked rather than believed. Nothing about "76 with a figure inspected"
reads as suspicious until you ask what "a figure" matched — and I did not ask
until round 14.

**The standing lesson of this whole effort, restated: green is a claim, not
evidence. It is only evidence once you know what population it covered.**

## Gates

```
audit:us-ca-lesson-illustrations   2 records — loadable, proportioned, described
audit:us-ca-lesson-content          76 lessons, 614 blocks — clean
audit:ccss-lesson-interaction      270 interactive lessons — clean
audit:us-ca-checkpoint-grading     272 free-entry + 336 multiple-choice — clean
audit:us-ca-lesson-figure-bounds   re-run after the coverage fix — see below
audit:us-ca-lesson-label-motion    re-run after the wait fix — see below
test:ccss-textbook · answerMatching 10 · usCaliforniaLessons.test.ts 12
tsc --noEmit                        clean
```

## Still open

- **Owner decision:** both California illustration records are unreachable. Wire
  a `concept`/`worked-example` block onto the page, or drop the records.
- The two long-standing owner decisions: 76 `extension` blocks have no renderer,
  and 41 elementary pages discard their authored guided practice.
- Readability remains genuinely unaudited (round 13).
