# Claude interactive chapter-textbook lesson — authoring contract

You are writing ONE new interactive textbook lesson for the MAIS California math
course, in exactly the house style of the 270 lessons in
`components/lesson/ccss/lessons/` (the Claude family: prose + live interactive
figure + "Math check"). It replaces a Codex text-only chapter. Everything below is
binding.

## Where things live (absolute paths — never touch any other checkout)

- Worktree root: `/Volumes/Starship/MAIS的衍生文件/MAIS-claude-textbook-wt` (call it `$WT`).
  Do NOT read or write `/Volumes/Starship/MAIS-MVP` (a different, stale branch).
- Do NOT run any `git` command at all (the shared git config is misconfigured and
  a git command can corrupt another session's work). Just write files.
- Your lesson body: `$WT/components/lesson/ccss/lessons/<slug>.tsx`
- Your math-verification test: `$WT/components/lesson/ccss/lessons/<slug>.test.ts`
- Your metadata: `<scratch>/generated/<slug>.meta.json` (path given in your task)
- Exemplars to read first (read at least these four, in full):
  - `$WT/components/lesson/ccss/lessons/number-bonds.tsx` (K, stepper + button grid)
  - `$WT/components/lesson/ccss/lessons/unit-rate.tsx` (G6, two steppers, derived readouts)
  - `$WT/components/lesson/ccss/lessons/ratio-double-number-line.tsx` (G6, SVG figure)
  - `$WT/components/lesson/ccss/lessons/conic-sections.tsx` (HS, choice buttons + SVG)
  - plus ONE lesson of your chapter's own grade band listed in your brief.
- Shared components (import these, never re-implement them):
  - `import { Figure } from "@/components/lesson/ccss/Figure";`
  - `import { MathCheck } from "@/components/lesson/ccss/MathCheck";`
  - `import { FigureScroll } from "@/components/lesson/ccss/FigureScroll";` (only if a figure has a fixed intrinsic width > ~560px)
- CSS tokens available inside the lesson scope (see `$WT/app/globals.css` `.ccss-lesson`):
  `--band-early/--band-upper/--band-middle/--band-high`, `--ink/--ink-soft/--ink-faint`,
  `--line`, `--surface/--surface-2`, `--brand`, classes `card`, `chip`, `prose-lesson`.
  Use `var(--band-middle)` as ACCENT for grades 6–8 and `var(--band-high)` for HS.

## What a chapter-textbook lesson is

It is the OPENER of a chapter. It must:

1. Open with 1–2 short prose paragraphs that put the whole chapter in one
   picture: what the big idea is and why it matters (a real, grade-appropriate
   situation; original writing — do not copy the Codex objectives you were shown).
2. Contain ONE central interactive `<Figure>` that models the chapter's big idea
   with live controls (steppers, choice buttons, or a range input). Every number
   or sentence the figure displays must be computed from state and must be TRUE
   in every reachable state. Prefer a figure that visibly connects at least two
   of the chapter's clusters (e.g., a ratio table that also draws the double
   number line; a triangle that shows both the Pythagorean relation and the
   distance formula).
3. Contain an interactive WORKED EXAMPLE: a short problem whose solution is
   revealed step by step with a "Next step" button (aria-expanded/aria-controls
   or aria-pressed as appropriate) — the student sees the reasoning unfold, not a
   block of text. Numbers in the worked example must be computed in code from
   constants (so the test can check them), not typed as literals in two places.
4. Contain a short "Try it" check: a question with 3–4 choice buttons; selecting
   reveals right/wrong with a one-sentence explanation. The correct choice must be
   derived in code.
5. End with a `<MathCheck>` that states, in plain language, the mathematical
   fact(s) the figure demonstrates and WHY they are true, citing the CCSS
   standard ids in parentheses exactly as they appear in your brief
   (e.g. `(6.RP.A.3)`). Cite ONLY standards listed in your brief — the audit
   gate rejects any other id.
6. Between the figure and the Math check, one `<h2>` section that names the
   chapter's lessons as a roadmap in prose (use the titles from your brief's
   `lessons[]`; the page will render those lessons after yours, so do not
   re-teach them — orient the student).

Length: 120–260 lines of TSX. Reading level: grade-appropriate (band
"middle" for 6–8, "high" for HS). English only.

## Hard technical rules (each one is enforced by a gate)

- File starts with `"use client";` then imports; default-export a component named
  `Lesson` that takes no props. Also `export` every pure math helper you use for
  computed values (e.g. `export function unitRate(cost: number, items: number)`)
  so the test file can exercise them. Keep helpers pure (no React inside).
- Tailwind 3.4 only. FORBIDDEN: `bg-linear-*`, `inset-shadow-*`, `text-shadow-*`,
  `field-sizing-*`, `not-[...]`, and the v4 shorthand `x-(--var)`. Use the v3
  arbitrary form `text-[var(--ink-soft)]`, `border-[var(--line)]`.
- Every `<button>` has `type="button"`.
- A button that visually shows the current choice/state MUST carry
  `aria-pressed={...}` (a boolean toggle may use `aria-expanded` with
  `aria-controls` pointing at an `id` created with `useId()` and placed via
  `id={thatId}` on the controlled element).
- A bounded +/- stepper: `aria-label` starting with "Increase"/"Decrease", clamps
  with `Math.min/Math.max`, and sets `disabled` at the bound (copy the Stepper
  from `unit-rate.tsx`). Every control has a declared inline min and max.
- Any readout that interpolates a control value next to a noun must pluralize
  correctly at every value (`{n} {n === 1 ? "apple" : "apples"}`) — the audit
  flags `"1 apples"`.
- SVG: give every `<svg>` a `viewBox`, `role="img"` and an `aria-label` that is
  TRUE in every state (compute it from state). Keep every drawn element inside
  the viewBox in EVERY reachable state — derive coordinates through a scale
  function with explicit padding, and clamp or scale the extremes. Use
  `className="mx-auto h-auto max-w-full"` with explicit width/height.
- No `Math.random`, no `fetch`, no storage, no `<form>`, no external images, no
  `next/image`, no `dangerouslySetInnerHTML`.
- No CJK characters anywhere. No internal identifiers (topic ids, "S18", "QA",
  "Codex", "candidate") in student-facing text.
- Floating point: display with `toFixed` only where the value can be non-integer,
  and make the test assert exact rational results where the mathematics is exact
  (integer / reduced-fraction equality), not `toBeCloseTo` unless irrational.

## The verification test (`<slug>.test.ts`)

Use `node:test` + `node:assert/strict`, importing your exported helpers with a
relative import (`./<slug>`) — see
`$WT/components/lesson/ccss/mathDiagramBoundaryRegressions.test.ts` and
`$WT/components/lesson/ccss/lessons/compose2dGeometry.test.ts` for the pattern.
It must:

1. Enumerate the FULL control grid (every reachable combination of your
   controls, bounded by their declared min/max) and, for each state, assert the
   mathematical invariants the figure claims (e.g. for every (a, b): the unit rate
   times b equals a; the drawn point stays within [PAD, W-PAD]; the displayed
   percent equals part/whole × 100).
2. Assert the worked-example answer and each step value by recomputing them
   independently in the test (write the arithmetic out, do not call the same
   helper for both sides when a direct computation is possible).
3. Assert the "Try it" correct option is the mathematically correct one.
4. Read the lesson source (`readFileSync`) and assert: every CCSS id cited in the
   file is in your brief's standard list; every `<svg` has `viewBox`; every
   `<button` has `type="button"`.

Commands you must run, from `$WT`, and make pass before you finish
(replace `<slug>`; `<scratch>` is given in your task):

```bash
sed "s#__SLUG__#<slug>#g" <scratch>/brief/tsconfig.lesson-check.template.json > <scratch>/generated/tsconfig.<slug>.json && npx tsc -p <scratch>/generated/tsconfig.<slug>.json
npx tsx --tsconfig "$WT/tsconfig.json" --test "$WT/components/lesson/ccss/lessons/<slug>.test.ts"
node scripts/audit-ccss-lesson-classes.mjs
node scripts/audit-ccss-lesson-interaction.mjs 2>&1 | grep "<slug>" ; true
```

The class audit must print "clean". The interaction audit prints 164 pre-existing
findings for OTHER files; the grep for your slug must print nothing.

## Metadata JSON (`<scratch>/generated/<slug>.meta.json`)

```json
{
  "slug": "<slug>",
  "gradeId": "6" | "7" | "8" | "HS",
  "topicId": "<chapter topicId from the brief>",
  "title": "<Chapter title, as in the brief>",
  "standardIds": ["..."],            // the standards your lesson actually develops, subset of the brief list, primary first
  "summary": "<one sentence, <= 140 chars, what the figure lets the student do>",
  "emoji": "<one emoji>",
  "narration": "<2–4 sentences read aloud by the audio guide: concrete, warm, no markup>",
  "practice": [                      // exactly 3 hand-checked questions about THIS chapter's big idea
    { "kind": "numeric", "prompt": "...", "answer": 12, "explanation": "..." },
    { "kind": "numeric", "prompt": "...", "answer": 2.5, "tolerance": 0.01, "explanation": "..." },
    { "kind": "mc", "prompt": "...", "choices": ["12", "15", "18", "20"], "answer": 0, "explanation": "..." }
  ]
}
```

Practice rules: `mc` questions have exactly 4 choices and `answer` is the index
of the correct one; numeric answers are numbers; every explanation shows the
arithmetic. You must solve each question independently in your final message
(show the computation) — a separate verifier will re-solve them.

## Return value

Your final message is data, not prose for a human. Return JSON:
`{"slug": "...", "files": [...], "checks": {"tsc": "pass|fail", "test": "pass|fail", "classAudit": "pass|fail", "interactionAudit": "clean|<findings>"}, "controls": [{"name": "...", "min": n, "max": n}], "claims": ["<each mathematical claim the lesson makes, one per line>"], "practiceSolutions": ["..."]}`
