# MAIS — Accessibility Conformance Report (self-assessment)

**Standard:** WCAG 2.1 Level AA / Section 508 (36 CFR 1194, Appendix A–C)
**Report type:** vendor self-assessment. **Not** an independent third-party audit.
**Date:** 2026-07-31
**Evaluated build:** branch `feat/legal-accessibility-foundation`, based on `origin/main` @ `27343c8d7c`
**Owner:** unassigned — see [Open items](#open-items).

> This report exists so that a district can see exactly what has and has not been
> tested. Where something has not been evaluated, it says so. A VPAT that marks
> everything "Supports" without evidence is worse than no VPAT, because a district
> makes a procurement decision on it.

---

## 1. Evaluation method

| | |
|---|---|
| **Tool** | `axe-core` via `@axe-core/playwright`, rule tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` |
| **Harness** | `tests/e2e/accessibility-audit.spec.ts` — run with `npm run test:a11y` |
| **Browsers** | Desktop Chrome @ 1440×1100, and Pixel 5 mobile emulation @ 393×851 |
| **Colour scheme** | Light only |
| **Assistive tech** | None — no screen reader was used |
| **Result** | 18/18 checks pass (9 per viewport); 0 violations across the 7 routes below |

Machine-readable results are written to `<PLAYWRIGHT_E2E_ROOT>/a11y/<route>.json` on
every run, including the items axe could not decide.

### 1.1 Routes evaluated

`/` · `/login` · `/register` · `/privacy` · `/terms` · `/subprocessors` · `/accessibility`

### 1.2 Routes NOT evaluated

Everything behind authentication, which is most of the product:

- learner dashboard, lesson player, practice pager, mistake book, progress
- the practice games and the visualisation lab
- teacher console, parent console, admin views
- messages, forum, assessment and assignment flows

**No conformance claim is made for any of these.**

---

## 2. What automated testing can and cannot tell you

Automated rules reliably detect roughly a third of WCAG issues. They are good at
programmatic defects — missing names, bad contrast ratios, broken ARIA, heading
structure. They cannot judge whether alt text is *meaningful*, whether focus order is
*logical*, whether an error message is *understandable*, or whether a drag interaction
has a usable keyboard equivalent.

A clean automated run is therefore a floor, not a conformance claim. The criteria in
§4 marked **Not Evaluated** are not assumed to pass.

---

## 3. Conformance by WCAG 2.1 AA success criterion

Levels used: **Supports** (evaluated, no failure found) · **Partially Supports** ·
**Does Not Support** · **Not Evaluated** (no evidence either way).

Every "Supports" below is scoped to the seven public routes in §1.1, light mode,
automated testing only.

### 3.1 Perceivable

| SC | Name | Level | Status | Evidence / note |
|---|---|---|---|---|
| 1.1.1 | Non-text Content | A | Partially Supports | Automated checks pass on public routes. Visualisations and games carry no text alternative — see §4. |
| 1.2.x | Time-based Media | A/AA | Not Evaluated | Synthesised tutor speech has no caption/transcript path; not assessed. |
| 1.3.1 | Info and Relationships | A | Supports | Heading order, list and table semantics pass on all 7 routes. |
| 1.3.2 | Meaningful Sequence | A | Not Evaluated | Requires manual reading-order review. |
| 1.3.3 | Sensory Characteristics | A | Not Evaluated | Requires manual review; likely at risk in visualisations. |
| 1.3.4 | Orientation | AA | Not Evaluated | |
| 1.3.5 | Identify Input Purpose | AA | Not Evaluated | Autocomplete attributes on the auth forms not reviewed. |
| 1.4.1 | Use of Colour | A | Not Evaluated | Requires manual review. |
| 1.4.3 | Contrast (Minimum) | AA | Partially Supports | 0 violations on public routes in light mode. **Dark mode untested.** Gradient headings and decorative background glyphs return "needs review" — see §3.5. |
| 1.4.4 | Resize Text | AA | Not Evaluated | |
| 1.4.5 | Images of Text | AA | Not Evaluated | Mathematical notation is rendered visually; see §4. |
| 1.4.10 | Reflow | AA | Partially Supports | Public routes scanned at 393×851 with no violations, and the document does not scroll horizontally at 375 px. Authenticated routes untested. |
| 1.4.11 | Non-text Contrast | AA | Not Evaluated | |
| 1.4.12 | Text Spacing | AA | Not Evaluated | |
| 1.4.13 | Content on Hover or Focus | AA | Not Evaluated | |

### 3.2 Operable

| SC | Name | Level | Status | Evidence / note |
|---|---|---|---|---|
| 2.1.1 | Keyboard | A | **Does Not Support** | Canvas-based visualisations and drag-driven practice games have no keyboard equivalent. See §4, item 1. (The wide tables on the legal pages were caught failing this at mobile width during this assessment — a scroll container with no keyboard access — and were fixed before merge.) |
| 2.1.2 | No Keyboard Trap | A | Not Evaluated | |
| 2.1.4 | Character Key Shortcuts | A | Not Evaluated | |
| 2.2.1 | Timing Adjustable | A | Not Evaluated | Timed practice modes exist; interaction with the extended-time accommodation not assessed. |
| 2.2.2 | Pause, Stop, Hide | A | Not Evaluated | The animated background auto-animates; no pause control. At risk. |
| 2.3.1 | Three Flashes | A | Not Evaluated | |
| 2.4.1 | Bypass Blocks | A | **Does Not Support** | No skip-to-content link. |
| 2.4.2 | Page Titled | A | Supports | All 7 routes set a unique title. |
| 2.4.3 | Focus Order | A | Not Evaluated | |
| 2.4.4 | Link Purpose (In Context) | A | Supports | Automated checks pass on public routes. |
| 2.4.5 | Multiple Ways | AA | Not Evaluated | |
| 2.4.6 | Headings and Labels | AA | Supports | Exactly one `<h1>` per public route, verified by test. |
| 2.4.7 | Focus Visible | AA | Partially Supports | A `focus-ring` utility exists and is applied to new legal-page controls; not audited platform-wide. |
| 2.5.x | Pointer / Input Modality | A/AA | Not Evaluated | Drag interactions in games are at risk of failing 2.5.1. |

### 3.3 Understandable

| SC | Name | Level | Status | Evidence / note |
|---|---|---|---|---|
| 3.1.1 | Language of Page | A | Supports | **Fixed in this change.** The served document previously declared `lang="en"` regardless of the selected language; it was corrected only after hydration. A blocking bootstrap now applies the visitor's language before first paint (`lib/languageBootstrap.ts`), and a regression test asserts it. Residual gap: with JavaScript disabled, a signed-out visitor still gets the default tag. |
| 3.1.2 | Language of Parts | AA | **Does Not Support** | Mixed English/Chinese passages are not individually marked with `lang`. See §4, item 4. |
| 3.2.1 | On Focus | A | Not Evaluated | |
| 3.2.2 | On Input | A | Not Evaluated | |
| 3.2.3 | Consistent Navigation | AA | Not Evaluated | |
| 3.2.4 | Consistent Identification | AA | Not Evaluated | |
| 3.3.1 | Error Identification | A | Not Evaluated | Auth form error handling not audited. |
| 3.3.2 | Labels or Instructions | A | Supports | Form-field labelling passes on `/login` and `/register`. |
| 3.3.3 | Error Suggestion | AA | Not Evaluated | |
| 3.3.4 | Error Prevention | AA | Not Evaluated | |

### 3.4 Robust

| SC | Name | Level | Status | Evidence / note |
|---|---|---|---|---|
| 4.1.2 | Name, Role, Value | A | Supports | ARIA and native-control checks pass on all 7 routes. |
| 4.1.3 | Status Messages | AA | Not Evaluated | |

### 3.5 Items axe flagged for human review

Present on every scanned route, recorded in each run's JSON:

1. **Decorative background glyphs** — the animated maths background renders characters at
   8–12% opacity inside an `aria-hidden="true"` container. Assessed as **not a 1.4.3
   failure**: the glyphs are decoration, not content, and convey nothing. Recorded here
   rather than suppressed in the tool so the judgement is reviewable.
2. **Gradient headings** — the `gradient-text` utility paints text with a clipped
   background gradient, so no single computed colour exists for the tool to measure.
   **This one genuinely needs a manual measurement** against both gradient endpoints in
   light and dark mode. Not yet done.

---

## 4. Known barriers, in priority order

1. **Interactive visualisations and practice games are not keyboard operable** (SC 2.1.1).
   Canvas rendering and drag interactions with no keyboard path and no text alternative.
   A learner who cannot use a pointer cannot complete assigned work. This is the most
   serious barrier in the product and the hardest to remediate.
2. **The entire authenticated product is unaudited.** Dashboard, lesson player, teacher
   and parent consoles. Scope of the problem is currently unknown.
3. **No skip-to-content link** (SC 2.4.1). Cheap to fix.
4. **Language of parts** (SC 3.1.2). Bilingual passages are not marked, so a screen
   reader applies one language's pronunciation rules to both.
5. **Mathematical notation** is rendered visually via KaTeX; screen-reader announcement
   has not been verified (SC 1.1.1 / 1.4.5).
6. **Dark mode contrast is entirely untested** (SC 1.4.3).
7. **The animated background cannot be paused** (SC 2.2.2), and no reduced-motion
   preference is honoured.

---

## 5. Next steps to a defensible VPAT

In dependency order:

1. Extend `tests/e2e/accessibility-audit.spec.ts` to authenticated routes using the
   existing e2e login helpers, and to dark mode. Cheapest large gain in evidence.
2. Add a skip-to-content link and honour `prefers-reduced-motion`.
3. Mark `lang` on bilingual passages.
4. Manual keyboard-only walkthrough of one full learner journey; record findings here.
5. Manual screen-reader pass (VoiceOver and NVDA) of sign-in, dashboard, one lesson.
6. Decide the accessibility strategy for visualisations and games — text-alternative
   plus an accessible equivalent activity is likely more achievable than making canvas
   interactions keyboard operable.
7. Only then commission a third-party audit and publish a VPAT 2.5 based on it.

**Do not publish a VPAT before step 7.** Steps 1–6 are what makes the VPAT true.

---

## Open items

- No accessibility owner is named. A district will ask for one.
- No formal complaints/escalation procedure exists; `/accessibility` says so.
- No independent audit has been commissioned or budgeted.

## Re-running this assessment

```bash
npm run test:a11y
```

Against an already-running server (skips the ~10 minute production build):

```bash
PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3071 PLAYWRIGHT_E2E_ROOT=.tmp/e2e-a11y npx playwright test tests/e2e/accessibility-audit.spec.ts
```
