# Detection report — the two textbook families on the California lesson surfaces

**Date:** 2026-09-02 · **Branch:** `replacing-Codex-textbook-by-Claude` (from `origin/main` be92640f4b)
**Author:** Claude Fable 5.1 (A05 lane), with two independent read-only audit agents and a completeness critic
**Scope:** `US_CA_MATH` only.

## 1. Yes — there are two textbook families, and they are easy to tell apart

| | Claude family — interactive CCSS lessons | Codex family — text-only textbook packages |
|---|---|---|
| Code home | `components/lesson/ccss/lessons/*.tsx` (270 bodies ported 2026-07-19 from the CCSS-Math-Textbook app, plus 35 MAIS-authored chapter openers from this branch) rendered through `CcssLessonAdapter` | JSON/TS content packages rendered as prose: `data/generated-content/us-ca-math-middle-school-textbooks-v2/live-lessons.json`, `data/generated-content/us-ca-math-k-g5-textbooks-v1/lessons.json`, `data/usCaliforniaHighSchoolLessonIllustrations.ts`, `data/usCaliforniaMicroLessons.ts`, `data/generated-content/us-ca-math-textbooks-v1/textbook-pack.json` |
| Origin | Hand-built React lessons; each carries a `MathCheck` stating the fact it demonstrates and why it is true; hand-checked practice (`ccss-textbook-practice-v1`) | `generator: "Codex S21 deterministic template generator"` / `"S21 deterministic California middle-school textbook generator"` (2026-06-19); HS worked examples carry `copyReviewStatus: "s09-candidate-copy-reviewed-by-codex"` |
| What the student sees | Prose + a live `<Figure>` with steppers, sliders, choice buttons, SVG that redraws from state; a "Math check" callout; standards chips | Paragraph blocks: launch, concept explanation, worked example ("Answer: … Reasoning: …"), guided/independent practice, pitfalls, exit ticket; a static concept PNG/WEBP; no controls |
| Mathematical guarantee | Every displayed value computed from state; `scripts/audit-ccss-lesson-interaction.mjs` (interaction copy) and, for the new openers, a per-lesson `node:test` harness over the full control grid | Generator templates + S18 manual sampling; arithmetic in text only |
| Registration | `data/ccssTextbookRegistry.ts` + `components/lesson/ccss/registry.ts` (generated) + `data/ccssLessonAssignments.ts` (topic → lessons), gated by `npm run test:ccss-textbook` | Imported directly by a page component or a seed builder |
| Fingerprint | `.ccss-lesson` scope, `data-ccss-lesson="<slug>"`, buttons with `aria-pressed`, `Math check` heading | `data-testid="california-replacement-lesson-*"`, "Concept" / "Worked example" / "Answer:" prose, `/lesson-illustrations/us-ca-*/…png` images |

## 2. Where each family was reachable (main, 2026-09-02, before this branch)

| Surface | Route | Family before | Count | Who reaches it |
|---|---|---|---|---|
| Lesson page core (K–G12) | `/student/lessons/us-ca-math-*` (64 topics) | **Claude** — every topic has a `ccssLessonAssignments` entry, so `toLessonSeed` renders `interactive-lesson` blocks (286) and never the templated concept/worked-example text | 64 topics · 286 interactive blocks | Any CA student, via the roadmap / Learning Worlds menu |
| Middle-school textbook | `/student/lessons/california-middle-school-textbook` (+ legacy `/lesson/…`) | **Codex** — `CaliforniaMiddleSchoolReplacementTextbookPage` rendering the S21 package (15 domain-overview lessons + 15 candidate PNGs) | 15 lessons | Authenticated users, URL only — no UI link on main |
| High-school textbook | `/lesson/california-high-school-textbook/review` (public and student routes redirect) | **Codex** — `CaliforniaHighSchoolTextbookPage` rendering 20 chapters × 2 text worked examples + 60 images; `productionApproval: not-approved-for-production-integration` | 20 chapters | Reviewers, URL only (noindex) |
| Lesson-page shell blocks | same lesson pages | Codex-era **templated** text: "Scaffolded practice path" checklist, "Mistake repair" extension (generic per-topic sentences) | 64 × 2 blocks | Same students; these are MAIS shell blocks, not textbook content — left in place, flagged as follow-up |
| K–5 textbook package | none (projected empty: `californiaK5TextbookLessonSeeds = []`) | Codex — retained as data only; still the topic-metadata source for the assignment/practice builders | 29 lessons | Nobody |
| Grade-1 micro-lessons | none on main (projected empty) | Codex — 12 `1-H.x / 1-L.x` text lessons | 12 | Nobody on main — **but the primary root's checked-out branch `codex/llm-whisper` (654 commits behind main) still seeds them, so a dev server started from the root shows 12 text-only lessons beside 64 interactive ones. That is the mixed picture reported.** |
| Dead renderer | none | Codex — `CaliforniaMiddleSchoolTextbookPage.tsx` importing `us-ca-math-textbooks-v1` (35 chapters of prose) | 35 | Nobody (unrouted) |

## 3. What this branch replaces

- Both live Codex textbook routes now render the Claude interactive library through `components/lesson/ccss/CcssInteractiveTextbook.tsx`: each chapter = its MAIS-authored interactive opener + the ported interactive lessons for the chapter's standards + a hand-checked chapter check.
- 35 new chapter openers (`ca-g6-ch01-…` … `ca-g12-ch05-…`) are registered in the CCSS library and pinned as the primary lesson of their chapter topic, so the **lesson page** for every G6–G12 chapter now opens with the Claude textbook chapter as well.
- The Codex packages stay on disk (nothing deleted; the seed and pages simply stop reading them), except the two dead Codex page components, which were removed.
- Route policy is unchanged: the high-school book remains review-only (noindex) until the owner's release decision — see the verification record for the exact gates.

The independent audit agents' findings and any disagreements are appended in §4 once the workflow completes.

## 4. Independent audit findings (appended 2026-09-02 after the workflow completed)

Two read-only auditors mapped the surfaces independently. Their material findings,
which the implementation above acted on:

- **The lesson page was already 100% Claude.** All 64 `us-ca-math-*` topics carry a
  `ccssLessonAssignments` entry, so `toLessonSeed()` emits 286 `interactive-lesson`
  blocks and **zero** generated concept / worked-example text blocks. The templated
  concept/worked-example path in `usCaliforniaLessons.ts` is dead code for California.
  Verified by running the topic census, not by reading the code alone.
- **The two Codex textbook routes were reachable but unlinked.** No `Link` or `href`
  to `/student/lessons/california-middle-school-textbook` exists anywhere in `app/`,
  `components/` or `lib/` — it was URL-only, and served to *any* authenticated user
  regardless of role, profile or grade. The high-school draft was noindex/review-only.
- **Two Codex page components were already orphaned** (no route imported them):
  `CaliforniaMiddleSchoolTextbookPage` and `CaliforniaHighSchoolTextbookStudentPage`.
  Both are removed by this branch.
- **Candidate-only Codex data never reached a render path**: the K–G5 textbook pack
  (29 lessons), the Grade-1 micro-lessons (13), the DeepSeek K–G5 bank and the K–5
  knowledge-point practice pack are all projected to empty arrays at runtime. They
  stay on disk as the topic-metadata source for the assignment and practice builders.
- Ancillary per-lesson blocks — the "Scaffolded practice path" checklist and the
  "Mistake repair" extension — remain **templated MAIS text**, not interactive. They
  are shell blocks rather than textbook content, and are left in place; replacing them
  is a separate piece of work.

One correction to the pre-workflow draft above: the middle-school package rendered on
three routes (the `/lesson/...`, `/student/lessons/...` and a `/review` alias), not two.
