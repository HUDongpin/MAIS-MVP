import type { VisualizationTemplateId } from "../visualizationTemplateIds";

export type ThreeDTemplateSliderBounds = {
  comparisonMax: number;
  comparisonMin: number;
  valueMax: number;
  valueMin: number;
};

export const explicitThreeDTemplateSliderBounds: Record<VisualizationTemplateId, ThreeDTemplateSliderBounds> = {
  "number-line": { comparisonMax: 9, comparisonMin: 0, valueMax: 9, valueMin: 0 },
  "base-ten": { comparisonMax: 9, comparisonMin: 0, valueMax: 9, valueMin: 0 },
  "array-area": { comparisonMax: 9, comparisonMin: 0, valueMax: 9, valueMin: 0 },
  "fraction-bar": { comparisonMax: 9, comparisonMin: 0, valueMax: 9, valueMin: 1 },
  "clock-money-data": { comparisonMax: 11, comparisonMin: 0, valueMax: 12, valueMin: 1 },
  "measurement-scale": { comparisonMax: 9, comparisonMin: 0, valueMax: 9, valueMin: 0 },
  "angle-geometry": { comparisonMax: 10, comparisonMin: 0, valueMax: 10, valueMin: 0 },
  "right-triangle-pythagorean": { comparisonMax: 9, comparisonMin: 1, valueMax: 9, valueMin: 1 },
  "coordinate-transform": { comparisonMax: 10, comparisonMin: 0, valueMax: 10, valueMin: 0 },
  "equation-balance": { comparisonMax: 9, comparisonMin: 0, valueMax: 9, valueMin: 0 },
  "function-graph": { comparisonMax: 9, comparisonMin: 1, valueMax: 9, valueMin: 1 },
  "function-family": { comparisonMax: 9, comparisonMin: 1, valueMax: 9, valueMin: 1 },
  "complex-plane": { comparisonMax: 9, comparisonMin: -9, valueMax: 9, valueMin: -9 },
  "trig-unit-wave": { comparisonMax: 9, comparisonMin: 1, valueMax: 9, valueMin: 1 },
  "probability-simulation": { comparisonMax: 9, comparisonMin: 0, valueMax: 9, valueMin: 0 },
  "statistics-distribution": { comparisonMax: 9, comparisonMin: 1, valueMax: 10, valueMin: 0 },
  "calculus-rate-area": { comparisonMax: 9, comparisonMin: 1, valueMax: 9, valueMin: 1 },
  "vector-conic-3d/strategy-map": { comparisonMax: 10, comparisonMin: 0, valueMax: 10, valueMin: 0 }
};

export function sliderBoundsForThreeDTemplate(templateId: VisualizationTemplateId): ThreeDTemplateSliderBounds {
  return explicitThreeDTemplateSliderBounds[templateId];
}
