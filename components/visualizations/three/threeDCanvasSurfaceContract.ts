export const threeDCanvasRequiredDataAttributes = [
  "data-viz-surface",
  "data-viz-canvas-ready",
  "data-viz-camera-state",
  "data-viz-coverage-tier",
  "data-viz-depth-value",
  "data-viz-family-id",
  "data-viz-mark-count",
  "data-viz-premium-launch",
  "data-viz-primary-value",
  "data-viz-regional-priority",
  "data-viz-renderer",
  "data-viz-runtime",
  "data-viz-scene-pedagogical-role",
  "data-viz-scene-primitive-floor",
  "data-viz-scene-spatial-model",
  "data-viz-scene-variant",
  "data-viz-scene-id",
  "data-viz-secondary-value",
  "data-viz-active-step",
  "data-viz-camera-canonical-shot",
  "data-viz-camera-shot",
  "data-viz-formula-token-count",
  "data-viz-math-object-count",
  "data-viz-object-count",
  "data-viz-reduced-motion",
  "data-viz-semantic-binding-count",
  "data-viz-state-summary",
  "data-viz-template-id",
  "data-viz-tracker-count",
  "data-viz-updater-count"
] as const;

export const threeDCanvasRequiredSelectors = [
  "data-viz-three-formula",
  "data-viz-three-reset-camera",
  "three-d-r3f-surface"
] as const;

export const threeDCanvasSnapshotContract = {
  preserveDrawingBufferOption: "preserveDrawingBuffer",
  renderer: "three-r3f"
} as const;

export const threeDCanvasKeyboardContract = {
  resetCameraKey: "Home"
} as const;
