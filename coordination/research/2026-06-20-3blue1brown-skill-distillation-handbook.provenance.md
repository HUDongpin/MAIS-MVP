# Provenance - 3Blue1Brown 技能蒸馏手册

Date: 2026-06-20

## Scope

This sidecar records the source basis for `2026-06-20-3blue1brown-skill-distillation-handbook.md`.

## Sources Checked

- `https://www.3blue1brown.com/lessons/manim-demo`
  - Used for the public framing of the video as a behind-the-scenes look at the tool and workflow behind 3Blue1Brown animations.
- `https://raw.githubusercontent.com/3b1b/videos/master/README.md`
  - Used for the claim that the video repository contains the code used to generate explanatory math videos and mostly consists of Manim scenes.
  - Used for workflow details: `manimgl ... -se`, interactive mode, IPython terminal, `checkpoint_paste()`, skip/record modes, and editor shortcuts.
- `https://raw.githubusercontent.com/3b1b/manim/master/README.md`
  - Used for the description of Manim as an engine for precise programmatic animations for explanatory math videos.
  - Used for ManimGL vs Manim Community distinction and installation/runtime context.
- `https://raw.githubusercontent.com/ManimCommunity/manim/main/README.md`
  - Used for the community edition's Manim framing, `Scene` example, `Transform`, `FadeOut`, and command usage.
- `https://raw.githubusercontent.com/3b1b/videos/master/_2024/manim_demo/lorenz.py`
  - Used for concrete distillation of the Lorenz attractor demo: ODE definition, SciPy `solve_ivp`, `ThreeDAxes`, TeX equations, fixed frame overlay, colored variables, curves, `GlowDot`, `TracingTail`, camera updater, and `ShowCreation`.
- `https://raw.githubusercontent.com/mrdoob/three.js/dev/README.md`
  - Used for Three.js positioning as a JavaScript 3D library with scene, camera, geometry, material, WebGL renderer, and animation loop.
- `https://raw.githubusercontent.com/pmndrs/react-three-fiber/master/readme.md`
  - Used for React Three Fiber positioning as a React renderer for Three.js, declarative reusable components, state interaction, `Canvas`, and `useFrame`.

## Access Limits

- YouTube transcript access for `https://www.youtube.com/watch?v=rbu7Zu5X1zI` was blocked by YouTube bot detection in the earlier S16 report workflow.
- The prompt's `3b1b.co/faq#manim` route returned 404 in earlier checks, so this handbook relies on the official repositories and lesson page for the Manim/tooling claims.

## Distillation Method

The handbook synthesizes source evidence into transferable capabilities for MAIS:

- skill taxonomy,
- Manim-to-Three.js mapping,
- scene grammar,
- quality rubric,
- prototype roadmap,
- copyright-safe implementation guidance.
