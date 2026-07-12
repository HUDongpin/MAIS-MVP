# 2026-06-04 S06/S13 Math Workbench Deep Link Brief

## Owner Request

Dr. Peter Hu accepted the recommendation to define the next scope for deep math-tool linkage after the first live classroom tools implementation.

## Current State

The first implementation stores and synchronizes `mathWorkbench` state in the live session. Teacher can push a tool type and parameters; student view displays the pushed state.

This is sufficient for first-pass classroom sync, but it is not yet a full deep link into each visualization component.

## Next Scope

Coordinate S06 visualization ownership with S13 teacher workflow ownership to implement:

- Function graph parameter serialization and hydration.
- Coordinate plane state serialization and hydration.
- Geometry explorer state serialization and hydration.
- Compass/straightedge construction state model.
- Whiteboard stroke overlay alignment over a visualization canvas or SVG area.
- Teacher-side "generate classroom question from current visualization state" action.
- Student-side readonly visualization render that respects the pushed state.

## Proposed Contract

Extend `MathWorkbenchState.parameters` into versioned tool-specific payloads while keeping the current generic record backward compatible.

Suggested shape:

- `version`: number
- `tool`: `function-graph` | `coordinate-plane` | `geometry` | `compass-straightedge`
- `parameters`: tool-specific serializable state
- `annotationLayerId`: optional whiteboard/overlay binding

## Acceptance Criteria

- Teacher can push current visualization state from a real component, not just canned parameters.
- Student view renders the same mathematical state after polling.
- Whiteboard annotations align with the pushed math surface.
- Existing `/visualization-lab` standalone behavior is not regressed.
- `npm run type-check` passes and targeted visual route checks are documented.
