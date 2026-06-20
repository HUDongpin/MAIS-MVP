export const visualizationTemplateIdValues = [
  "number-line",
  "base-ten",
  "array-area",
  "fraction-bar",
  "clock-money-data",
  "measurement-scale",
  "angle-geometry",
  "right-triangle-pythagorean",
  "coordinate-transform",
  "equation-balance",
  "function-graph",
  "function-family",
  "complex-plane",
  "trig-unit-wave",
  "probability-simulation",
  "statistics-distribution",
  "calculus-rate-area",
  "vector-conic-3d/strategy-map"
] as const;

export type VisualizationTemplateId = (typeof visualizationTemplateIdValues)[number];
