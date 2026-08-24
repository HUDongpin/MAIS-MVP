/**
 * Client-safe convenience entry for @mais/math-kernel.
 *
 * This barrel deliberately exports namespaces and never imports a `.server`
 * module. Fine-grained subpath imports remain preferred for small bundles.
 */
export * as bodies from "../bodies";
export * as conics from "../conics/numeric";
export * as conicModels from "../conics/model";
export * as geometry from "../geometry/numeric";
export * as geometryCoordinates from "../geometry/coordinates";
export * as geometrySolids from "../geometry/solids";
export * as analytic from "../analytic/numeric";

export { KERNEL_ERROR_CODES } from "../shared/errors";
export { MATH_JSON_LIMITS, validateMathJson } from "../shared/mathjson";
export type * from "../shared/types";
