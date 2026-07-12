# A18 Review — Lesson Visualization Realignment (configured-visualization-lab)

- Date: 2026-07-10
- Prepared by: Claude (QA/bug-fix pass), for A18 curriculum/content-fit sign-off
- Context: The mvpReadiness gate "production lessons with visualization blocks reuse primary lab mappings" required every lesson visualization block to use `moduleId=configured-visualization-lab` and the primary lab's `analyticsSource`. 29 HK lesson blocks in `data/lessons.ts` were realigned to satisfy this (105 production lessons total now use the configured lab; all match their `primaryVisualizationLabs` analyticsSource).
- Scope of this review: **module-id realignment is mechanical and low-risk** (all embeds now route to the single configured lab renderer). The items below are the ones where the analytics **source category** changed relative to the lesson's previous declaration — these need a curriculum-fit sanity check, not just a structural pass.

## Priority review — analytics source category changed

| Topic | Previous source | New source (= primary lab) | Question for A18 |
| --- | --- | --- | --- |
| `functions` (S4) | function-model | function-graph | Does the function-graph lab present the right model for the S4 functions lesson objective? |
| `p6-speed` | coordinate-plane | function-model | Is a function-model visual appropriate for a P6 speed/rate lesson? |
| `p6-percentages` | function-model | geometry | Is a geometry visual appropriate for a P6 percentages lesson, or should the topic map to a different primary lab? |
| `statistics-s6` | calculus-stats | probability | Is the probability lab the intended visual for the S6 statistics lesson? |

## Notes

- If any of the four mappings is judged a poor curriculum fit, the correct fix is to change that topic's entry in `primaryVisualizationLabs` (`data/visualizationLabs.ts`) so lesson and lab agree — not to re-diverge the lesson block, which would re-break the mvpReadiness gate.
- The remaining ~25 realigned HK embeds kept their existing source category (module-only change) and need no curriculum review.
- Related runtime note for A06: the configured lab's manim deck still runs ~8s×2 main-thread render passes at mount; tracked separately from this content review.

## Verification status

- `npm run test:mvp` (incl. the lab-mapping contract): passing after realignment.
- E2E `reported-bug-regressions` "tangent gradient tick labels" retargeted to the configured Calculus lab and passing (tangent mark + numeric axis ticks preserved).
