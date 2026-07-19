# Porting CCSS-Math-Textbook to MAIS Lesson Page's Math Textbook System

**Date:** 2026-07-19
**Author:** Claude (with Peter's scoping decisions)
**Status:** Proposed plan — no code changes yet
**Companion precedent:** `Transferring Claude Math Visual to MAIS Visual Labs.md` (the signature-lab port, now shipped, whose playbook this plan reuses)

---

## 0. Executive summary

Two problems, one program:

1. **Issue 1 — content.** The MAIS US/California lesson page renders text-only, generated concept explanations and worked examples. The standalone `~/Desktop/CCSS-Math-Textbook` app has **270 hand-built, mathematically verified, interactive CCSS lessons** (K–HS) that are simply better textbook material. We port them in as the *core* of each MAIS lesson.
2. **Issue 2 — navigation.** Both apps use flat menus. MAIS's left-side unit accordion works but is rigid and boring for young learners. We replace it with **MAIS Learning Worlds**: one navigation engine, four themed worlds — a different world per grade band — so the menu itself becomes part of the adventure of growing up through math.

**Locked decisions (Peter, 2026-07-19):**

| Decision | Choice |
|---|---|
| Content mix | **CCSS lessons become the lesson core**, replacing the hand-authored concept text + worked example. MAIS keeps its shell (AI audio guide, Nova Tutor, star/XP practice, checklist). CCSS hand-checked practice merges into the practice section. |
| Scope | **K–G5 pilot first** (112 lessons), then G6–G12 in a later phase. |
| Menu direction | **A world per grade band** (maximum imagination): four themed worlds on a shared engine. |
| Language | **English-first** lesson bodies (US California track); MAIS chrome stays trilingual; zh/zhHans localization is a separate later workstream. |

The port follows the **proven signature-lab pattern** already in this repo: components copied faithfully into a dedicated directory, a slug-keyed registry with code-split dynamic imports, a CCSS-standards join script that produces a `primary + related[]` fan-out assignment file, an adapter that supplies MAIS host contracts, and a CI-gated audit/contract test suite.

---

## 1. What exists today (verified 2026-07-19)

### 1.1 CCSS-Math-Textbook (`~/Desktop/CCSS-Math-Textbook`)

- Next.js **16.2** / React 19.2 / **Tailwind 4** app; TypeScript.
- **270 lessons** in `src/lessons/<slug>/Lesson.tsx`, all `"use client"` React components: prose + interactive figures + a `MathCheck` ("why this works") callout. Per grade: K 10, G1 15, G2 21, G3 20, G4 26, G5 20, G6 23, G7 20, G8 22, HS 93. **K–G5 = 112 lessons.**
- `src/lessons/registry.tsx` — `LessonMeta { slug, gradeId, title, standardIds[], summary, emoji }` + a `lessonComponents` map of code-split `dynamic()` imports. Metadata is server-importable; bodies load on demand.
- `src/lessons/units.ts` — derives **units = one CCSS domain per grade**, lessons ordered by primary standard; produces `1.2`-style lesson numbers, prev/next sequence.
- `src/lessons/practice.ts` — **hand-checked** practice per lesson (`mc` + `numeric` with tolerance, each with an explanation), ~3 per lesson.
- `src/data/ccss/` — a complete, typed CCSS Mathematics dataset: grades → domains → clusters → standards (full text), plus grade **bands** (early/upper/middle/high) with color tokens, and the 8 Mathematical Practices. This is richer than MAIS's paraphrased `data/ccssStandards.ts` (which exists only to draw the Math Universe map).
- Lesson page chrome (`src/app/lesson/[slug]/page.tsx`): breadcrumb, emoji + grade pill header, band-tinted lesson number, interactive body with **band-tuned reading typography** (`reading-early` = bigger text for K–2), `PracticeSet`, "Standards developed" list, in-unit menu, prev/next cards.
- Styling relies on CSS custom properties: `--band-early/upper/middle/high`, `--ink`, `--ink-soft`, `--ink-faint`, `--line`, `--surface`, `--surface-2`, `--brand` + Tailwind utility classes.
- QA: `scripts/verify-lessons.ts`, `scripts/verify-ccss.ts`.

### 1.2 MAIS-MVP lesson system

- Next.js **15.5** / React 19.1 / **Tailwind 3.4**.
- Route: `/student/lessons/[lessonSlug]` → `StudentLessonPage` (server: auth, `getLessonBySlug`, grade roadmap) → `LessonView` (`components/lesson/LessonView.tsx`, ~3.4k-line client component).
- Content model: `LessonDetail.blocks[]` with `LessonBlockType = concept | worked-example | visualization | practice | checklist | extension | teacher-guide`. Visualization blocks resolve through `getLessonVisualization(moduleId)`.
- **California K–G5 textbook content** (what we are replacing): `data/generated-content/us-ca-math-k-g5-textbooks-v1/lessons.json` — **29 text-only topics** (K 6, P1 4, P2 4, P3 5, P4 5, P5 5), each with real CCSS `standardIds`, turned into blocks by `textbookBlocks()` in `data/usCaliforniaLessons.ts` (concept, worked example, guided-practice checklist, mistake-repair extension, teacher guide).
- Left menu: `components/lesson/LessonGalaxyDirectory.tsx` — unit accordion; each unit expands to `1.1 Concept explanation / 1.2 Worked example / 1.3 Interactive lab / 1.4 Practice check`.
- Practice: generated banks (`us-ca-k5-knowledge-point-practice-v1`, 492 Qs) with dedupe + 5-question selection, star/XP economy, handwriting-capable question slot.
- Shell features to preserve: AI audio guide (reads `lessonContentText`), Nova Tutor, lesson completion checklist → progress record, celebrations, trilingual chrome, teacher guide blocks.
- **Precedent that de-risks this whole plan:** the signature-lab port. `components/visualizations/signature/` holds 184 benches ported from Claude Math Visual; `data/signatureLabAssignments.ts` maps topics → benches via `primary + related[]`; `scripts/build-signature-lab-candidates.ts` does the CCSS join; `npm run test:signature-labs` gates it in CI. Same repo, same constraints, shipped and verified.

### 1.3 The mapping problem in numbers

112 CCSS K–G5 lessons must land on 29 MAIS K–G5 topics (plus the G1 micro-lesson topics). Both sides carry real CCSS `standardIds`, so this is the **same fan-out join** as signature labs (~4 lessons per topic on average). One MAIS topic = one *unit stop group*; its CCSS lessons become ordered sub-lessons within it.

---

## 2. Issue 1 — Porting the textbook system

### 2.1 Architecture (mirrors the signature-lab adapter)

```
CCSS-Math-Textbook (source, read-only)
   src/lessons/<slug>/Lesson.tsx  ──copy──▶  components/lesson/ccss/<Slug>Lesson.tsx
   src/lessons/registry.tsx       ──port──▶  data/ccssTextbookRegistry.ts        (meta, server-safe)
                                             components/lesson/ccss/registry.ts   (dynamic() component map)
   src/lessons/practice.ts        ──port──▶  data/generated-content/ccss-textbook-practice-v1/
   src/data/ccss/                 ──copy──▶  data/ccss/                           (authoritative CCSS dataset)
   src/lessons/units.ts           ──adapt─▶  lib/ccssTextbookUnits.ts             (numbering, prev/next)
   (new)                                     data/ccssLessonAssignments.ts        (topicId → primary + related[])
   (new)                                     scripts/build-ccss-lesson-candidates.ts  (CCSS join, reproducible)
   (new)                                     components/lesson/ccss/CcssLessonAdapter.tsx (host contracts + theme bridge)
```

Key rules carried over from the signature-lab port:

- **Lessons are never edited** during the port. Fidelity first; the adapter supplies what the host needs.
- **Fan-out, not 1:1** (owner's standing decision, see `data/signatureLabAssignments.ts`): every CCSS lesson whose `standardIds` intersect a topic's standards attaches to that topic; one becomes `primary`, the rest `related[]`, ordered by standard position (port of `units.ts` ordering). The join script is committed and reproducible; a contract test asserts every `related[]` slug is actually ported and every K–G5 topic has a `primary`.
- **Code-split everything**: the component map uses `dynamic()` exactly like the upstream registry, so 112 lesson bodies do not bloat the shell bundle.
- Grade-id translation at the join boundary only: CCSS `K,1..5` → MAIS `K,P1..P5` (later `6→P6, 7→S1, 8→S2, HS→S3–S6`).

### 2.2 Lesson page integration — "CCSS becomes the core"

New block type `interactive-lesson` in `LessonBlockType` (`types/index.ts`), with `interactiveLessonConfig: { ccssLessonSlug, standardIds }` alongside the existing `visualizationConfig` pattern. Then, for every topic with an assignment, `textbookBlocks()` in `data/usCaliforniaLessons.ts` changes shape:

| Today (per topic) | After (per topic) |
|---|---|
| 1 concept block (generated text) | **N `interactive-lesson` blocks** — the topic's assigned CCSS lessons in unit order (primary first). Each renders title/emoji/summary + the interactive body + its "Standards developed" footer. |
| 1 worked-example block (generated text) | *(retired — every CCSS lesson already contains worked reasoning + a `MathCheck`)* |
| guided-practice checklist | kept (feeds completion checklist) |
| mistake-repair extension | kept |
| teacher-guide block | kept; augmented with the full standard text from `data/ccss/` |
| practice block (generated bank) | kept, **merged** (see 2.4) |

`LessonView` gains one rendering branch: `interactive-lesson` blocks resolve through the component registry (same pattern as `getLessonVisualization`), wrapped in `CcssLessonAdapter`.

**The adapter provides:**

1. **Theme bridge.** A `.ccss-lesson` scope defining `--band-*`, `--ink*`, `--line`, `--surface*`, `--brand` mapped onto MAIS's palette for both light and dark modes. (Dark mode is a *deliberate improvement* over the signature-lab "paper sheet" decision — these are prose lessons, not canvas benches, so remapping ink/surface vars is cheap and worth it.)
2. **Analytics.** `recordLearningEvent` on mount/interaction, mirroring `SignatureLabAdapter`, so lesson interactivity feeds the adaptive engine and teacher console.
3. **Read-aloud.** The AI audio guide currently reads generated concept text. Interactive JSX prose can't be reliably extracted, so the registry port adds an optional `narration` field per lesson (default = `summary`; enriched over time). `lessonContentText` picks it up; the existing audio queue works unchanged.
4. **Reading level.** Port the `reading-early/upper/middle/high` typography classes into `app/globals.css`, keyed off the topic's grade band — K–2 students get the big roomy text upstream designed for them.

### 2.3 Tailwind 4 → Tailwind 3.4 compatibility

Upstream lessons use utility classes + CSS vars + inline styles. The port pipeline includes a **class audit script** (grep the copied files for Tailwind-4-only syntax; the expected hit list is small — e.g. any `size-*` shorthands or v4-only arbitrary syntax get mechanical rewrites). Everything CSS-var-driven ports untouched because the adapter owns the vars. This is a Phase 0 exit criterion: one lesson from each band renders pixel-faithfully in MAIS before bulk copying.

### 2.4 Practice merge

- Convert `src/lessons/practice.ts` (~336 hand-checked K–G5 questions) into a MAIS question pack: `data/generated-content/ccss-textbook-practice-v1/question-pack.json`, batch `"ccss-textbook-practice-v1"`, typed like the existing generated packs (`mc` → `multiple-choice`, `numeric` → `fill-in` with `acceptedAnswers` honoring tolerance; explanations preserved).
- Selection policy in `selectPracticeQuestionIds` / lesson practice limiting: **hand-checked CCSS questions first**, generated bank fills the remainder to 5, existing dedupe + handwriting-slot rules unchanged. Star/XP economy untouched — these enter as ordinary `PublicQuestion`s.
- The upstream answers were verified by `scripts/verify-lessons.ts`; port that check into the conversion script so the pack cannot drift from source.

### 2.5 CCSS dataset consolidation

`data/ccss/` (ported, full standard text) becomes the **authoritative** registry. `data/ccssStandards.ts` (paraphrased, Math-Universe-specific) stays as-is for the map in the pilot — consolidating the two is a follow-up, not on the critical path. The teacher guide block and "Standards developed" footers read from `data/ccss/`.

### 2.6 QA gates (CI)

New `npm run test:ccss-textbook` wired into `.github/workflows/ci.yml`, running:

1. Ported `verify-ccss` (dataset integrity: ids, cluster/domain structure).
2. Ported `verify-lessons` (registry ↔ components ↔ practice coherence; every slug has a component, valid standardIds, practice answers in range).
3. `data/ccssLessonAssignments.test.ts` — contract test: every K–G5 topic has a `primary`; every `related[]` slug is ported; no orphaned lessons (all 112 reachable through some topic); grade-id translation is total.
4. Existing suites must stay green: `usCaliforniaLessons.test.ts` (worked-example quality guards get retargeted or retired with the blocks they guard), lesson e2e specs.

---

## 3. Issue 2 — "MAIS Learning Worlds": a world per grade band

### 3.1 The concept

One narrative spine: **as you grow through math, you travel upward through four worlds.** The lesson menu is no longer a list — it *is* the world map of your grade band, and every unit is a place in it.

| Band | World | Units are… | Lessons are… | Mood |
|---|---|---|---|---|
| **K–2** | 🌱 **Sprout Meadow** — a storybook forest floor | sunlit clearings along a winding path | stepping stones / toadstools with the lesson's emoji | picture-book, big shapes, warm greens |
| **3–5** | ⛵ **Voyager Seas** — an ocean chart | islands in an archipelago | coves and lighthouses along the sailing route | explorer's map, teal/parchment |
| **6–8** | 🎈 **Skyline Heights** — a floating sky city | districts on floating platforms | stations linked by bridges and balloon lines | adventurous, cool blues/violet |
| **9–12** | 🌌 **Deep Space** — the galaxy | constellations | stars that ignite when completed | vast, luminous, indigo/black |

Why this works for MAIS specifically:

- **It unifies what already shipped instead of adding a fifth metaphor.** Voyager Seas is the grown-up sibling of Practice Island (map-as-interface, mission trail, kid mode — all shipped); Deep Space is the Knowledge Galaxy / Math Universe identity (also shipped). The two new worlds (Meadow, Skyline) fill in the arc. The product stops feeling like disconnected features and becomes one journey: *island kid → sea captain → sky explorer → astronaut.*
- **The band metaphor mirrors the pedagogy.** CCSS itself thinks in bands (the ported dataset has `bands[]` with color tokens; the lessons have band-tuned typography). Menu world, lesson colors, and reading level all key off the same band.
- **Graduation moments.** Finishing a grade band earns a "passage" ceremony (Meadow → Seas: your paper boat sets sail). These are natural, rare celebration beats the gamification stack (`GameResultsCeremony`, practice sounds) can reuse.

### 3.2 Information architecture

```
World header  (course + grade, band-themed, replaces the current cyan pill header)
 └─ Region = MAIS topic/unit        («Clearing 1 · Counting & Cardinality»)
     └─ Stop = ported CCSS lesson   («1.2 Counting with a Ten-Frame» 🔢)
         └─ In-lesson parts (current lesson only): Concept · Interactive · Practice quick-jumps
```

- **Stops come from `ccssLessonAssignments`** — the menu and the lesson body share one source of truth, and the `1.2` numbering comes from the ported `units.ts` logic. (This fixes the signature-lab lesson: `related[]` without UI is inert. Here the world map *is* the UI that makes fan-out reachable.)
- **States:** completed (lit, star + mastery), current ("You are here" marker, gentle pulse), next-up (soft glow at the path's edge), future (visible and tappable — MAIS philosophy: **no hard locks**, the path just visually encourages order).
- **Progress is spatial:** the path/route/bridge/constellation-line literally fills in behind you as lessons complete.

### 3.3 One engine, four skins

`components/lesson/worlds/` :

- `WorldMenu.tsx` — the engine. Takes `{ regions, stops, progress, bandTheme }`; renders an SVG path scene with positioned stops. All layout math, keyboard navigation, and state logic live here once.
- `worldThemes.ts` — four theme configs: palette, path stroke + terrain art (inline SVG, no image requests), stop iconography, ambient motion (fireflies / waves / drifting clouds / twinkling stars — pure CSS, `prefers-reduced-motion` disables), celebration effect.
- `WorldMenuListFallback.tsx` — the **enhanced accordion** (today's `LessonGalaxyDirectory` restyled with band colors, emoji, progress rings). Serves as: screen-reader/keyboard-first semantic structure (the SVG scene is `aria-hidden`; a parallel semantic list is always in the DOM), the reduced-motion + low-power presentation, and a user-selectable "List view" toggle (persisted; some kids — and teachers projecting to a class — genuinely want the list).
- **Mobile:** the world collapses to a horizontal path ribbon under the lesson header + a full-screen bottom-sheet map on tap. Desktop keeps the left rail position (familiar spatial anchor, novel content).
- **Kid mode** (shipped for Practice Island) applies in Meadow/Seas: bigger tap targets, read-aloud stop names on tap.

### 3.4 Delight details (cheap, high-yield)

- Each CCSS lesson already ships an **emoji** — the stops get instant, content-true iconography for free.
- Completing a stop: the stone/cove/station/star lights with the existing practice-sound kit's success motif; the path segment draws itself (~600ms, skipped under reduced motion).
- The world header greets by name and points at the next stop ("Jon, the ten-frame clearing is just ahead →") — text only, no LLM call needed.
- Seasonal micro-variants later (Meadow snow in December) — explicitly out of pilot scope.

### 3.5 Pilot scope for the menu

K–G5 pilot ships **Sprout Meadow (K–2) and Voyager Seas (3–5)** plus the list fallback. Skyline Heights and Deep Space land with the G6–G12 content phase — Deep Space largely restyles the existing galaxy assets.

---

## 4. Phasing

**Phase 0 — Vertical slice (reference implementation, worktree)**
Kindergarten only, end to end: theme bridge + adapter, ~3 ported lessons (one per interaction style, e.g. `counting-ten-frame`, `number-bonds`, `flat-shapes`), assignments for K's 6 topics, `interactive-lesson` block rendering inside `LessonView`, practice merge for those lessons, and a static Sprout Meadow with real data. **Exit criteria:** pixel-faithful lessons in light+dark, audio guide + checklist + stars unaffected, `next build` passes, class-audit script clean.
*(Per the signature-lab precedent: built in a worktree, owner assigns the git op.)*

**Phase 1 — Bulk content port (K–G5)**
Scripted copy of all 112 lessons + registry + practice conversion; run the join script; curate `primary` per topic (the `curated`/`curatedFull` override pattern from the signature-lab generator carries over for title-over-tag cases); wire `test:ccss-textbook` into CI.

**Phase 2 — Lesson page cutover**
`textbookBlocks()` switch for all 29 topics + G1 micro-lesson topics; retire the generated concept/worked-example blocks (keep them in the JSON package — nothing is deleted, the seed just stops reading them); teacher-guide augmentation; narration fields for K–2 first (read-aloud matters most there); retarget `usCaliforniaLessons.test.ts` guards.

**Phase 3 — Learning Worlds menu**
Engine + list fallback + Meadow + Seas; replace `LessonGalaxyDirectory` behind the toggle; e2e specs (stop navigation, fallback parity, reduced motion, mobile sheet); update `tests/e2e/helpers.ts` selectors.

**Phase 4 — Verification & release**
Full Browser-pane verification pass as Student Jon (per the established recipe), e2e baseline runs, then commit as a coherent stream (release hygiene is the known bottleneck — plan the commit series up front: data port → components → adapter/blocks → menu → tests).

**Phase 5 (separate program) — G6–G12 + remaining worlds + localization**
158 more lessons; HS course mapping (93 lessons onto S3–S6 chapter topics — the risky join, isolated here on purpose); Skyline Heights + Deep Space; zh/zhHans lesson-body localization workstream.

---

## 5. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Tailwind 4 → 3.4 class drift breaks lesson layouts | Phase 0 class-audit script + one-lesson-per-band visual check before bulk copy; CSS vars owned by the adapter. |
| Next 16 → 15.5 API differences | Lesson bodies are plain client React — no Next APIs inside them. Only the registry's `dynamic()` usage touches Next, and MAIS already uses the same pattern (signature labs). |
| Bundle size (112 client components) | Code-split registry (upstream already does this); only assigned lessons for the current topic load. |
| Read-aloud regression for K–2 | `narration` field with `summary` fallback ships in Phase 0; K–2 narrations authored in Phase 2 before cutover. |
| Two CCSS datasets diverge | `data/ccss/` is authoritative for lesson surfaces; consolidation with `ccssStandards.ts` tracked as follow-up; a lint test can assert code-level agreement on shared ids. |
| Menu rewrite destabilizes e2e | List fallback keeps a stable semantic DOM; e2e drives the fallback selectors; world scene is additive presentation. |
| Fan-out curation quality (which lesson is `primary`) | Reproducible join script + committed curated overrides + contract test — the exact workflow that mapped 169 benches onto 76 topics successfully. |
| Losing the generated content's guided-practice/mistake-repair value | Those blocks are kept, not replaced — only concept + worked-example text retires. |

---

## 6. Success criteria

1. Every K–G5 California topic renders at least one interactive CCSS lesson as its core; all 112 ported lessons are reachable from the menu.
2. Practice sections lead with hand-checked CCSS questions; star/XP, dedupe, and handwriting-slot behavior unchanged.
3. `npm run test:ccss-textbook` green in CI; existing lesson/e2e suites green.
4. K–2 and 3–5 students navigate via their band's world; list view remains one tap away; screen-reader and keyboard flows fully functional; reduced-motion honored.
5. Lesson completion, checklist, audio guide, Nova Tutor, and teacher console signals all keep working (verified live as Student Jon).
6. `next build` passes; no measurable regression in lesson-page first load (code-splitting verified).

## 6a. Phase 5 localization workstream (design — owner-gated)

Shipped English-first per the 2026-07-19 decision. Localizing the ported content to zh/zhHans is a
separate program because the lesson bodies are interactive JSX (never edited by the port), not data.
Proposed phasing, cheapest-first:

- **L1 — data-only surfaces (no body edits):** translate the 810 practice questions and the narration
  registry (`ccssTextbookNarrations.ts` gains zh/zhHans variants; the pack builder already carries
  LocalizedText everywhere, currently mirroring en). Mechanical, high-coverage, QA-able with the
  existing `audit:zh-hans` / `check:hk-zh` scripts.
- **L2 — lesson bodies via string catalogs:** a codegen transform extracts JSX text nodes per lesson
  into a catalog and re-emits locale-aware bodies at port time (the transform lives in the port
  script, preserving the never-hand-edit rule). ~270 components; needs a proof-of-concept on 3
  lessons before committing.
- **L3 — QA pass:** math-terminology consistency (zh-Hant HK vs zh-Hans mainland conventions differ;
  the repo's existing Chinese-audit tooling applies), plus native-speaker review of K–2 narrations.

Owner decisions needed before L1 starts: target variants (zh only vs both), whether the US CA track
should surface Chinese lesson bodies at all (vs. narration + chrome only), and translation sourcing
(model-assisted with human review vs. vendor).

## 7. Open questions (non-blocking, defaults chosen)

- **Worked-example quality guards:** `usCaliforniaLessons.test.ts` enforces near-transfer between worked example and practice. Default: retire the guard with the block it guards; CCSS `MathCheck` + explanations take over that duty.
- **G1 micro-lesson topics:** they sit beside the textbook topics in the menu. Default: they become stops in the same G1 Meadow regions, keeping their existing bodies until Phase 5 revisits them.
- **World naming:** "Sprout Meadow / Voyager Seas / Skyline Heights / Deep Space" are working names — happy to workshop with Peter before Phase 3.
