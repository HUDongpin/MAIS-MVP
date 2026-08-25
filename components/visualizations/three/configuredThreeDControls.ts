import type { VisualizationTemplateId } from "../visualizationTemplateIds";

export type ThreeDTemplateSliderBounds = {
  comparisonMax: number;
  comparisonMin: number;
  valueMax: number;
  valueMin: number;
};

export const explicitThreeDTemplateSliderBounds: Record<VisualizationTemplateId, ThreeDTemplateSliderBounds> = {
  "number-line": { comparisonMax: 9, comparisonMin: 0, valueMax: 9, valueMin: 0 },
  // value carries the hundreds and tens digits as one 0..99 reading so the model
  // can reach 999; comparison carries the ones (see baseTenState).
  "base-ten": { comparisonMax: 9, comparisonMin: 0, valueMax: 99, valueMin: 0 },
  "array-area": { comparisonMax: 9, comparisonMin: 0, valueMax: 9, valueMin: 0 },
  "fraction-bar": { comparisonMax: 9, comparisonMin: 0, valueMax: 9, valueMin: 1 },
  "clock-money-data": { comparisonMax: 11, comparisonMin: 0, valueMax: 12, valueMin: 1 },
  "measurement-scale": { comparisonMax: 9, comparisonMin: 0, valueMax: 9, valueMin: 0 },
  // 0..12 at 15 degrees per step reaches 30/45/60 (see angleGeometryState).
  // The former 0..10 at 18 degrees per step could not express any of them.
  "angle-geometry": { comparisonMax: 12, comparisonMin: 0, valueMax: 12, valueMin: 0 },
  "right-triangle-pythagorean": { comparisonMax: 9, comparisonMin: 1, valueMax: 9, valueMin: 1 },
  "coordinate-transform": { comparisonMax: 10, comparisonMin: 0, valueMax: 10, valueMin: 0 },
  "equation-balance": { comparisonMax: 9, comparisonMin: 0, valueMax: 9, valueMin: 0 },
  "function-graph": { comparisonMax: 9, comparisonMin: 1, valueMax: 9, valueMin: 1 },
  "function-family": { comparisonMax: 9, comparisonMin: 1, valueMax: 9, valueMin: 1 },
  "complex-plane": { comparisonMax: 9, comparisonMin: -9, valueMax: 9, valueMin: -9 },
  // comparison 1..10 maps to amplitude 0.1..1.0 in exact tenths (see trigState).
  "trig-unit-wave": { comparisonMax: 10, comparisonMin: 1, valueMax: 9, valueMin: 1 },
  "probability-simulation": { comparisonMax: 9, comparisonMin: 0, valueMax: 9, valueMin: 0 },
  "statistics-distribution": { comparisonMax: 9, comparisonMin: 1, valueMax: 10, valueMin: 0 },
  "calculus-rate-area": { comparisonMax: 9, comparisonMin: 1, valueMax: 9, valueMin: 1 },
  "vector-conic-3d/strategy-map": { comparisonMax: 10, comparisonMin: 0, valueMax: 10, valueMin: 0 }
};

export function sliderBoundsForThreeDTemplate(templateId: VisualizationTemplateId): ThreeDTemplateSliderBounds {
  return explicitThreeDTemplateSliderBounds[templateId];
}
