# Practice Arena Design Memory - 2026-06-10

Session: S04 Practice lead

Purpose: Preserve the three Practice Arena visual directions for future MAIS design work. Scheme A was explored for live implementation and later rolled back after owner feedback, but the concept remains useful as a future reference.

## Saved Concepts

### Scheme A - Math Adventure Island

Image: `scheme-a-math-adventure-island.png`

Best future use:
- Primary and lower-secondary Practice Arena entry surfaces.
- Game-unlock journeys where a five-question practice round opens a themed challenge.
- Topic maps, mission paths, daily practice campaigns, and child-friendly onboarding.

Design notes:
- Bright sky-blue, island-map, route-checkpoint, star, gem, and mission-card language.
- Large approachable hero area with direct practice and topic-picking actions.
- Strong match for same-topic rounds, Adventure Island, Fishing Master, and reward progression.
- Best when the route/map illustration is polished and supported by real MAIS components instead of decorative clutter.

Implementation caution:
- Keep the island artwork refined, not toy-like or overcrowded.
- Avoid replacing clear practice controls with decoration.
- Validate mobile carefully because route maps and floating helper buttons can compete for space.
- Future implementation should start from a stronger visual system or designer-approved mockup before coding.

### Scheme B - Cosmic Math Mission Control

Image: `scheme-b-cosmic-mission-control.png`

Best future use:
- Upper primary, middle school, and high school practice surfaces.
- Competitive or mastery-oriented math flows where a darker, more advanced game feel is useful.
- Future mission-control dashboards, algebra/function practice, or challenge modes.

Design notes:
- Deep navy surface, teal/electric-blue primary accents, lime/amber success and reward accents.
- Central question card as a spacecraft console.
- Topic navigation as orbiting planets.
- Strong fit for mastery, rank, quest progress, and game unlock states.

Implementation caution:
- Keep contrast high and avoid overusing glow effects.
- Use this direction selectively so younger learners are not overwhelmed.
- Mobile version should collapse orbit topics into a horizontal mission carousel.

### Scheme C - Smart Study Scrapbook

Image: `scheme-c-study-scrapbook.png`

Best future use:
- Primary and lower-secondary student practice.
- Mistake review, teacher-assigned practice, and warm daily-study flows.
- A softer alternative when the product needs to feel less competitive.

Design notes:
- Paper, notebook, graph-grid, and desk-collage visual language.
- Large notebook-style question card with scratch-pad affordance.
- Right-side daily panel for streak, accuracy, next skill, and game unlocks.
- Mixed bento tiles for topics, mistakes, assignments, and mini games.

Implementation caution:
- Keep the collage controlled so it does not reduce readability.
- Avoid decorative labels over functional content.
- Maintain 44px touch targets and strong text contrast on paper-textured surfaces.

## Build Decision

Scheme A - Math Adventure Island was initially selected because it best matches the existing flow:
- Adaptive practice route.
- Free topic selection.
- Same-topic five-question rounds.
- Adventure Island and Fishing Master unlock progression.

The first coded pass was rejected visually by the owner and rolled back. The saved image remains a concept reference only.

Reference generated images are also available in the Codex generated image directory for this thread, but the saved PNGs above are copied into the MAIS project for durable future reference.
