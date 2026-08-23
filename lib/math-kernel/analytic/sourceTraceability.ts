/**
 * Versioned capability map for the modified TypeScript rewrite of Edulab
 * analytic_kernel.py at cf0bc1d68b4ea64307f57d7fac64667e6a3148cc
 * (Apache-2.0). See third_party/edulab for attribution.
 */

export interface AnalyticSourceCapabilityTrace {
  readonly source: string;
  readonly typescript: readonly string[];
  readonly disposition: string;
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

export const ANALYTIC_SOURCE_TRACEABILITY = deepFreeze({
  schemaVersion: 1,
  sourceModule: "skills/edu-analytic-geometry/lib/analytic_kernel.py",
  sourceRevision: "cf0bc1d68b4ea64307f57d7fac64667e6a3148cc",
  license: "Apache-2.0",
  capabilities: [
    {
      source: "tex",
      typescript: ["shared.ExactValueDto.latex"],
      disposition: "replaced by LaTeX serialized from the authoritative exact MathJSON",
    },
    {
      source: "fnum",
      typescript: ["analyticKernel.server.toFiniteApprox"],
      disposition: "ported with an explicit failure when no finite safe approximation exists",
    },
    {
      source: "is_clean",
      typescript: ["analyticKernel.server.isReadableExact"],
      disposition: "ported as a display-quality classifier, never a correctness test",
    },
    {
      source: "interval_latex",
      typescript: ["analyticKernel.server.intervalToLatex"],
      disposition: "ported for versioned exact endpoint DTOs including open and infinite endpoints",
    },
    {
      source: "chord_setup",
      typescript: ["expressions.lineConicCoefficientExpressions", "analyticKernel.server.setupLineConicIntersection"],
      disposition: "ported for both line orientations with fixed application parameter m",
    },
    {
      source: "_xy_from_y",
      typescript: ["expressions.reconstructEndpointSymmetricExpressions", "analyticKernel.server.intersectLineConicExact"],
      disposition: "generalized to reconstruct either coordinate orientation and exact endpoints",
    },
    {
      source: "dot_product_expr",
      typescript: ["expressions.dotProductExpression"],
      disposition: "ported from shared Vieta quantities without a handwritten answer formula",
    },
    {
      source: "chord_len_sq_expr",
      typescript: ["expressions.chordLengthSquaredExpression"],
      disposition: "ported with the complete (1+m^2) factor derived from the discriminant",
    },
    {
      source: "triangle_area_expr",
      typescript: ["expressions.triangleAreaExpression"],
      disposition: "ported from exact line distance and chord data",
    },
    {
      source: "range_over_m",
      typescript: ["analyticKernel.server.rangeOverLineFamily"],
      disposition: "replaced by a fail-closed exact proof over domain boundaries, poles, critical points, and both projective limits",
    },
    {
      source: "is_constant_in_m",
      typescript: ["analyticKernel.server.isConstantInParameter"],
      disposition: "ported for the fixed parameter m using an exact rational derivative proof",
    },
    {
      source: "slope_product_central",
      typescript: ["analyticKernel.server.centralConicSlopeProduct"],
      disposition: "ported with point-on-ellipse validation and explicit undefined-slope errors",
    },
    {
      source: "ecc_range_focal_ratio",
      typescript: ["analyticKernel.server.eccentricityRangeFromFocalRatio"],
      disposition: "ported with exact open and closed endpoints plus geometric witnesses",
    },
  ] satisfies readonly AnalyticSourceCapabilityTrace[],
});
