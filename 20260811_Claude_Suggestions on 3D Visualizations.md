# Suggestions on 3D Visualizations for MAIS-MVP

**Date:** 11 August 2026
**Prepared by:** Claude (Fable 5), from a four-track research pass over the img2threejs repository, both skill documents, and the MAIS-MVP visualization-lab codebase
**Aim under evaluation:** building 3D visualizations for math concepts such as **Cube** and **3D Distance**

---

## Executive summary

1. **Question 1 — img2threejs:** The repo is real, popular (~10.5k stars, Apache-2.0, actively maintained), and technically interesting — but it is **not useful for MAIS visualization labs**. It rebuilds *photographs of objects* as decorative, animation-ready Three.js models judged by visual likeness. Math labs need the opposite: mathematically exact, labeled, unit-accurate, *interactive* geometry driven by a formula, not an image. Direct authoring in Three.js/react-three-fiber (which MAIS already ships) is simpler and correct-by-construction. The one thing worth borrowing is its **render-and-verify quality-gate pattern**, which happens to match the `audit-*.mjs` proof-script culture MAIS signature benches already use.

2. **Question 2 — which skill:** **Professor Hu's interactive-math-bench skill is the most useful primary skill** for this aim, with the **3blue1brown handbook as a complementary layer**, not a competitor. The bench skill is already MAIS's house standard — the repo's 192 signature benches, *including the existing `CubeLab.jsx` and `DistanceLab.jsx`*, were built to it — and it is the only one of the two that contains the lesson machinery (locked dials, predict-then-check, calibration capstone). The 3b1b handbook contributes what the bench skill lacks for true 3D: directed camera shots, formula-to-geometry anchor binding, and semantic color rules — and it targets exactly the react-three-fiber stack that MAIS's `ThreeDLabCanvas` pipeline already implements.

3. **Neither skill covers the hardest 3D interaction work** your two labs need — raycast-based dragging of points in 3D, labeled vertices/edges in world space, net unfolding, and the right-triangle decomposition of the 3D distance formula. That engineering must be designed fresh (a concrete plan is in §4).

---

## 1. Question 1 — Is img2threejs useful for MAIS visualization labs?

*(Note: it is a GitHub repo, not GitLab — https://github.com/img2threejs/img2threejs)*

### What it actually is (verified 2026-08-11)

| Aspect | Finding |
|---|---|
| Purpose | Rebuilds the object in **one reference photograph** as a code-only, procedural, animation-ready Three.js model ("token-efficient image-to-3D") |
| Form | Not a library — an **AI-agent skill** that runs under Claude Code / Codex / OpenCode; installs to `~/.claude/skills/img2threejs` |
| Pipeline | 8 staged passes (blockout → structural → form → material → surface → lighting → interaction → optimization); each pass renders the model and **vision-compares it against the photo** before advancing; deterministic Python scripts gate quality |
| Output | A TypeScript factory returning a `THREE.Group` (deterministic primitives: rounded boxes, spheres, cylinders, cones, torus, extruded outlines) + an `ObjectSculptSpec` JSON + comparison renders. Explicitly **not** photogrammetry or depth-map extrusion |
| Health | Apache-2.0; ~10.5k stars / ~790 forks; last commit 2026-08-06 (v1.5 beta — character track); good README and docs |
| Showcase content | Game-asset/decorative: CS2-style weapons, knives, earbuds, armored vehicles, a Doraemon diorama (gallery: hoainho.github.io/img2threejs-showcase) |

### Why it does not fit the labs

The mismatch is in the objective function, not the code quality:

| Math lab requirement (Cube, 3D Distance) | img2threejs delivers |
|---|---|
| Geometry defined by a **formula/spec** (edge length *s*, points P₁ P₂) | Geometry inferred from a **photo** |
| Correctness = mathematically exact (s√3 space diagonal, unit-true axes) | Correctness = **visual likeness** judged by a vision model |
| Semantic parameters students manipulate (sliders for *s*, draggable points) | Parameters are internal construction details, not pedagogical dials |
| Labeled vertices/edges/faces, coordinate axes, measurement readouts | No labels, no coordinate semantics, no measurement logic |
| Interaction: drag, predict-then-check, calibration | Output is a static/animatable prop; interactivity is pivots/sockets for game animation |

A cube for a math lesson is ~5 lines of `BoxGeometry` plus the *labeling and lesson logic that is the actual work* — there is nothing for an image-to-3D tool to shortcut. And MAIS already has the runtime it would target (`three@0.184`, `@react-three/fiber@9.6.1`, `@react-three/drei@10.7.7` in `package.json`), so the repo adds no capability the project lacks.

### Where it could still earn a place (narrow, optional)

- **Decorative context assets** for word-problem or engagement scenes (a real-world object next to the abstract solid — e.g., a dice model or a shipping box in a volume lesson). This is a nice-to-have, not a lab engine.
- **Its verify-loop pattern** — generate → render → compare → gate — is the same philosophy as the signature benches' `audit-*.mjs` numeric proofs and the production QA sweeps. Worth reading once as prior art if you ever automate *visual* regression of 3D lab scenes; nothing to install.

**Verdict: Skip it for the visualization labs.** Bookmark the quality-gate idea; don't adopt the tool.

---

## 2. Question 2 — Which existing skill md serves the aim best?

### What each skill actually is

**A. 3blue1brown skill** — [coordination/research/2026-06-20-3blue1brown-skill-distillation-handbook.md](coordination/research/2026-06-20-3blue1brown-skill-distillation-handbook.md) (668 lines) + effects report + provenance sidecar.
A distillation of 3Blue1Brown's *method* into a web-stack blueprint: eight capability layers, a seven-beat scene narrative, a semantic color code (cyan = primary object, green = area, yellow = rate, red = error, purple = parameter, gray = reference), "continuity of identity" animation, a typed `CameraShot` director (intro/explain/reveal/explore/reset), formula-layer anchors that pin KaTeX symbols to world-space geometry, and an explicit **Manim → React Three Fiber mapping table**. Crucially, MAIS has *already partially built* its proposed MathSceneKit: `components/visualizations/three/manim/` (~200 `mathScene*` modules), `ThreeDLabCanvas.tsx`, `ThreeDLabSceneRegistry.tsx`.

**B. Professor Hu's interactive-math-bench skill** — `/Volumes/Starship/Claude Math Visual/interactive-math-bench SKILL_1.md` (modeled on STEM Bench, stembench.xiangenhu.info).
The house standard behind MAIS's **192 signature benches** (`components/visualizations/signature/*.jsx`) — including the shipped `CubeLab.jsx` (hand-rolled 3D canvas pipeline: rotation, perspective, painter's-algorithm face sorting; zero dependencies) and the 2D `DistanceLab.jsx`. It carries the complete **tutoring machinery**: state→model→render spine, dials that unlock one per lesson step, predict-then-check questions gated on *answered* not *correct*, and a calibration capstone with a live match meter. Its 3-D track (`surface-bench.html`, `saddle-bench.html`) is a Three.js surface explorer for z = f(x, y) — scene scaffold, lighting recipe, damped orbit camera — but is an *explorer*, not yet a staged lesson.

### Head-to-head for "3D Cube + 3D Distance labs"

| Criterion | 3b1b handbook | Prof Hu's math-bench |
|---|---|---|
| Matches MAIS's shipped lab pattern | Partially (premium `ThreeDLabCanvas` path) | **Yes — it defined the pattern** (192 signature benches, incl. CubeLab/DistanceLab) |
| Lesson/tutoring machinery | Principles only (seven beats, guided-then-explore) | **Complete, proven engine** (locked dials, predict-then-check, calibration) |
| True-3D scene scaffold | Architectural guidance (R3F, camera director) | **Working code** (Three.js scene, lighting, orbit — surface benches) |
| Camera direction & depth reveals | **Strong** (typed CameraShot vocabulary) | Weak (free orbit only) |
| Formula ↔ geometry binding, color semantics | **Strong** (FormulaLayer anchors, semantic palette) | Basic (equation readout) |
| Solid geometry (polyhedra, nets, labeled edges) | Absent (no polyhedron in its MathObject catalog) | Absent (3D track is height-field surfaces only) |
| 3D point dragging (raycasting, drag/orbit conflict) | Absent | Absent |
| Known gaps on disk | Never accessed actual 3b1b video sources (documented in provenance) | The packaged `references/` files (incl. `3d-surfaces.md`) are **not on disk** — only SKILL_1.md and the HTML benches survive |

### Answer

**Use Professor Hu's interactive-math-bench skill as the primary skill, and layer the 3blue1brown handbook on top for the 3D-specific direction.** Reasoning:

1. **It is the lineage your two labs already live in.** `CubeLab.jsx` and `DistanceLab.jsx` exist in the repo as signature benches built to this skill. "3D Cube" is an upgrade of an existing bench; "3D Distance" is a z-axis extension of one. Starting from the bench skill means starting from working, audited code and a familiar UX.
2. **Pedagogy is the scarce asset.** The bench skill's lesson engine (predict-then-check, calibration) is what makes a MAIS lab a *lab* rather than a demo — and it is the piece the 3b1b handbook only philosophizes about.
3. **But the 3b1b handbook owns exactly what the bench skill lacks in 3D:** directed camera shots for depth reveals (a free-orbit cube teaches less than a camera that *shows* the space diagonal emerging), world-to-screen formula anchors for labeling P₁, P₂, Δx/Δy/Δz, and the semantic color discipline for the three legs of the right-triangle decomposition. It also speaks the language of the `three/manim` runtime MAIS already built.

They are complements: **bench skill = the lab's body and lesson; 3b1b handbook = the 3D scene's direction and visual grammar.**

---

## 3. A decision you should make first: which 3D pipeline

MAIS-MVP has **two** production-ready ways to render 3D, and the right skill emphasis depends on which you choose per lab:

| | Path A — Signature-bench style | Path B — Premium `ThreeDLabCanvas` (R3F) |
|---|---|---|
| Tech | Hand-rolled 3D on plain `<canvas>` (as `CubeLab.jsx` does today) | `@react-three/fiber` + drei `OrbitControls`, WebGL with detection + SVG fallback |
| Strengths | Zero dependencies, ~50KB own chunk, runs without WebGL, full lesson engine already proven | True lighting/occlusion/orbit, the `three/manim` animation engine, premium direct routes (`/student/tools/visualizations/[labId]`) |
| Cost | Every 3D feature (occlusion, picking) is hand math | Larger bundle; WebGL required (fallback exists); scene registry work |
| Best for | **Cube** (already 80% there — add space/face-diagonal reveals, net unfolding) | **3D Distance** (needs real depth perception, orbit, and draggable points in space) |

**Recommendation:** upgrade **CubeLab along Path A** (stay in its proven zero-dependency style; the painter's-algorithm pipeline already handles a convex cube perfectly) and build **3D-Distance along Path B** (depth is the *point* of that lab — orbit and perspective are pedagogically load-bearing, and the premium 3D pipeline with its SVG fallback and WebGL detection already exists to host it).

---

## 4. Concrete build plan for the two labs

### 3D Distance lab (new; Path B)
The one idea to make visible: **d = √(Δx² + Δy² + Δz²) is Pythagoras applied twice.** The 2D `DistanceLab` already teaches leg² + leg² = d²; the 3D lab shows the floor diagonal √(Δx² + Δy²) becoming a *leg* of a second right triangle with Δz.

1. Scene: axes with ticks (build a real 3D axis object — the surface benches only have a floor `GridHelper`), two points P₁ P₂, the segment between them, and a **stair-step right-triangle pair** (floor triangle + vertical triangle) toggled per lesson step.
2. Interaction: raycast-based dragging of P₁/P₂ constrained to a chosen plane (drag on floor moves x/y; a modifier or handle moves z) — with explicit **drag-vs-orbit mode resolution** (e.g., drag on a point handle wins; orbit elsewhere). *This is the piece neither skill provides — budget real design time for it.*
3. Direction (from 3b1b): scripted camera shots — top-down (the 2D case students know) → dolly down to reveal Δz → orbit to the composite triangle. Color the three legs with the semantic palette; anchor Δx/Δy/Δz/d labels via world-to-screen projection.
4. Lesson (from the bench skill): dials/steps unlock progressively (2D floor case first, then z), predict-then-check ("if Δz doubles, does d double?"), capstone = **construction goal** ("place P₂ so that d = 7") with the live match meter — the bench skill's documented swap for calibration.
5. QA: an `audit-distance3d.mjs` numeric proof (assert rendered d against the formula across sampled states), `data-viz-*` attributes per the adapter contract, grade banding + CCSS alignment via `data/visualizationLabs.ts` / `signatureLabAssignments.ts` conventions (the assignments file is generated — extend via the override file, don't hand-edit).

### Cube lab (upgrade; Path A)
`CubeLab.jsx` already renders the cube with edge dials and unfold. Suggested 3D-deepening within its own style: staged reveals of the **face diagonal s√2 and space diagonal s√3** as a two-step Pythagoras story (mirroring the 3D-distance narrative — the two labs reinforce each other), plus cross-section teasers. Keep its zero-dependency pipeline; nothing about the cube needs WebGL.

### Skill-library housekeeping (recommended)
- **Recover or rebuild `references/3d-surfaces.md`** and the packaged `.skill` bundle — the session log says they existed, but they are not on disk anywhere. Until then, the surface benches themselves are the de-facto reference.
- After building 3D-Distance, **fold the new machinery back into the bench skill as a third track** ("3D solid & coordinate geometry": axes object, raycast drag pattern, labeled points, camera-shot presets). That turns this one-off build into the reusable asset for every future 3D concept (sphere, prism, vectors, cross-sections).

---

## Appendix — evidence base and caveats

**Sources read:** img2threejs GitHub repo + README + showcase gallery (fetched 2026-08-11); the 3b1b handbook, effects report, and provenance sidecar in `coordination/research/`; `interactive-math-bench SKILL_1.md`, the 2026-07-14 session log, `surface-bench.html`/`saddle-bench.html` in `/Volumes/Starship/Claude Math Visual/`; MAIS-MVP code: `data/visualizationLabs.ts`, `components/visualizations/` (ConfiguredVisualizationLab, VisualizationLabPage, SignatureLabAdapter, signature/CubeLab.jsx, signature/DistanceLab.jsx, premiumThreeDDirectLabs.ts, three/ThreeDLabCanvas.tsx, three/threeDSceneMath.ts, three/manim/), `package.json`.

**Caveats:**
- img2threejs star/commit figures come from page fetches (the GitHub API was blocked); third-party listings show older, lower counts. The unfit-for-math-labs verdict is an assessment from its documented behavior, not from running the tool.
- The bench skill's five `references/*.md` files (including the 3D guide) could not be located on disk; their contents are known only through the session log.
- `ThreeDLabCanvas.tsx` (~11k lines) was read selectively (mount points, WebGL gating, registry), not exhaustively.
- Line-level claims reflect the working tree on `main` as of 2026-08-11.
