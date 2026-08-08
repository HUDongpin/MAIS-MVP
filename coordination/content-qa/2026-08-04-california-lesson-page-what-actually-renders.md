# California Math — what the lesson page actually renders — 2026-08-04

This note exists because round 8 caught **two** of my own reports making claims
about "the lesson page" that were measured on the seed data and never checked
against the render path. Both were wrong. This is the ground truth, measured by
driving the page.

## Method

Playwright, an e2e session token for `student-shirleen-us`, both page tiers, all
sections walked. Each seed string was matched against the accumulated rendered
text of the page.

## What a **student** sees

| Block type | Blocks | Renders? |
|---|---|---|
| `interactive-lesson` | 286 | **Yes** — the React component draws its own copy |
| `concept`, `worked-example` | 24 | **Yes**, verbatim |
| `visualization` | 76 | **Title only.** `LessonView.tsx:2143` runs the content through `cleanLessonVisualizationContent`, which returns `""` for `/Safeguard Review[\s\S]*Read me first/i` — matched by **228 of 228** strings (76 pages × 3 locales) |
| `checklist` | 76 | **Grade-dependent.** `lessonCompletionChecklist.ts:61` — for `elementary` (any grade not starting with `S`) the authored items are **discarded** and four canned `elementaryQuickChecks` render instead ("I can draw it or use objects.", "I can write the number sentence.", …). For `S*` grades the authored items render. |
| `extension` (mistake repair / remediation) | 76 | **No.** There is no renderer. `LessonView` never calls `blocksByType(lesson, "extension")`; the only consumers are `lib/mvpReadiness.test.ts` and `userStore.ts:2315`, which counts it as a practice block |
| `teacher-guide` | 76 | **Teacher/admin only** — `canViewTeacherGuide` at `LessonView.tsx:2112`. Correct by design |

Measured:

```
us-ca-math-s1-chapter-01 (S tier)   checklist 4/5   extension 0/5   teacher-guide 0/5   visualization 1/2
us-ca-math-k-k-nbt-teen-numbers     checklist 0/5   extension 0/5   teacher-guide 0/3   visualization 1/2
                                    canned elementary check on screen: true
```

## What this means for rounds 1–8

It does **not** invalidate the fixes — the copy is real product data, the teacher
guide really does render for teachers, and the S-tier checklists really do render
for students. But it does correct the framing of two reports:

- **Round 7** audited 328 blocks and described them as "the part of the
  California lesson page that is not an interactive lesson". Of those, the 76
  `extension` blocks reach no student, the 76 `teacher-guide` blocks reach no
  student, and the authored items of the 41 elementary `checklist` blocks are
  replaced by canned text. Round 7's 9 fixes stand as data-quality fixes; they
  are not all student-visible fixes.
- **Round 8** claimed 18 pages showed unresolvable standard codes. Those codes
  sit in the visualization block's `content`, which never renders. The
  normalization was still right (81 ids failed `findStandard()`), but nothing
  changed on screen.

## The rule this replaces

Rounds 1, 2, 7 and round 8's locale lens all audited **seed data**. Round 3 and
round 6 drove the browser. Only the browser rounds were auditing the lesson page;
the others were auditing the content that feeds it.

Going forward, every finding carries a visibility class:

1. **student-visible** — verified present in rendered text for a student
2. **teacher-visible** — present only behind `canViewTeacherGuide`
3. **data-only** — real content, correct to fix, but no user path renders it

A round may not report a count of "defects on the lesson page" without splitting
it by class. "All gates green" was never convergence; neither is "the copy is
correct" when the copy has no reader.

## Open questions this raises for the owner

These are product questions, not QA findings:

- **`extension` blocks have no renderer.** 76 blocks of mistake-repair and
  remediation copy — authored, gated by `mvpReadiness.test.ts`, curated across
  four QA rounds — reach nobody. Either the renderer is missing or the blocks are
  dead weight.
- **Elementary checklists are discarded.** 41 pages author specific guided
  practice, and every one of them shows the same four generic sentences. The
  authored items are the ones the teacher guide and the coverage line describe.
