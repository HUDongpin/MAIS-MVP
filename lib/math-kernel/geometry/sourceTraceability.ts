/**
 * Versioned traceability contract for the Edulab geometry_kernel.py source at
 * cf0bc1d68b4ea64307f57d7fac64667e6a3148cc (Apache-2.0).
 * See third_party/edulab for the upstream license and modification notice.
 */

export interface GeometrySourceCapabilityTrace {
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

export const GEOMETRY_SOURCE_TRACEABILITY = deepFreeze({
  schemaVersion: 1,
  sourceModule: "skills/edu-solid-geometry/lib/geometry_kernel.py",
  sourceRevision: "cf0bc1d68b4ea64307f57d7fac64667e6a3148cc",
  license: "Apache-2.0",
  capabilities: [
    {
      source: "V",
      typescript: ["core.Vec3", "numeric.vec3", "exact.server.vec3"],
      disposition: "ported as an immutable generic type plus numeric and exact constructors",
    },
    {
      source: "midpoint",
      typescript: ["core.vecMidpoint", "numeric.midpoint", "exact.server.midpoint"],
      disposition: "ported through the shared generic formula",
    },
    {
      source: "normal_from_points",
      typescript: ["core.normalFromThreePoints", "numeric.normalFromPoints", "exact.server.normalFromPoints"],
      disposition: "ported with explicit collinearity and finite-conditioning errors",
    },
    {
      source: "simplify_vec",
      typescript: ["numeric.primitiveDirectionForDisplay", "exact.server.primitiveDirectionForDisplay"],
      disposition: "ported as a bounded display-only primitive-direction operation",
    },
    {
      source: "line_plane_angle_sin",
      typescript: ["core.linePlaneAngleSinValue", "numeric.linePlaneAngleSin", "exact.server.linePlaneAngleSin"],
      disposition: "ported through the shared generic formula",
    },
    {
      source: "line_line_angle_cos",
      typescript: ["core.lineLineAngleCosValue", "numeric.lineLineAngleCos", "exact.server.lineLineAngleCos"],
      disposition: "ported through the shared generic formula",
    },
    {
      source: "point_plane_distance",
      typescript: ["core.pointPlaneDistanceValue", "numeric.pointPlaneDistance", "exact.server.pointPlaneDistance"],
      disposition: "ported through the shared generic formula",
    },
    {
      source: "dihedral_cos",
      typescript: ["numeric.dihedralHalfPlaneCos", "exact.server.dihedralHalfPlaneCos", "numeric.dihedralCos", "exact.server.dihedralCos"],
      disposition: "ported with an explicit half-plane name and deprecated compatibility aliases",
    },
    {
      source: "dihedral_cos_from_normals",
      typescript: ["core.dihedralCosFromNormalsValue", "numeric.dihedralCosFromNormals", "exact.server.dihedralCosFromNormals"],
      disposition: "ported through the shared generic formula",
    },
    {
      source: "volume_box",
      typescript: ["core.boxVolumeValue", "numeric.boxVolume", "exact.server.boxVolume"],
      disposition: "ported through the shared generic formula",
    },
    {
      source: "volume_prism",
      typescript: ["core.prismVolumeValue", "numeric.prismVolume", "exact.server.prismVolume"],
      disposition: "ported through the shared generic formula",
    },
    {
      source: "volume_pyramid",
      typescript: ["core.pyramidVolumeValue", "numeric.pyramidVolume", "exact.server.pyramidVolume"],
      disposition: "ported through the shared generic formula",
    },
    {
      source: "volume_tetra",
      typescript: ["core.tetrahedronVolumeValue", "numeric.tetrahedronVolume", "exact.server.tetrahedronVolume"],
      disposition: "ported through shared triple-product and volume formulas",
    },
    {
      source: "tex",
      typescript: ["shared.ExactValueDto.latex"],
      disposition: "replaced by LaTeX generated from the authoritative exact MathJSON DTO",
    },
    {
      source: "is_clean",
      typescript: ["cas.CasSession.isReadableExactMathJson", "exact.server.isReadableExactVec3"],
      disposition: "replaced by a bounded CAS-safe readability policy",
    },
    {
      source: "tex_vec",
      typescript: ["exact.server.formatExactVec3Latex"],
      disposition: "ported as validated DTO formatting with authoritative per-component LaTeX",
    },
    {
      source: "regular_quad_pyramid",
      typescript: ["solids.regularQuadPyramidCoordinates", "solids.regularQuadPyramidCoordinatesRaw"],
      disposition: "ported with stable source vertex order",
    },
    {
      source: "cuboid",
      typescript: ["solids.cuboidCoordinates", "solids.cuboidCoordinatesRaw"],
      disposition: "ported with stable source vertex order",
    },
    {
      source: "cube",
      typescript: ["solids.cubeCoordinates", "solids.cubeCoordinatesRaw"],
      disposition: "ported by reusing the cuboid layout",
    },
    {
      source: "regular_tetrahedron",
      typescript: ["solids.regularTetrahedronCoordinates", "solids.regularTetrahedronCoordinatesRaw"],
      disposition: "ported with stable source vertex order and positive-size validation",
    },
    {
      source: "to_three",
      typescript: ["coordinates.mathZUpToWorldYUp", "coordinates.worldYUpToMathZUp"],
      disposition: "replaced by explicit renderer-independent coordinate transforms",
    },
    {
      source: "solve_pyramid",
      typescript: ["solvers.server.solveRegularQuadPyramidLinePlaneAngle", "solvers.server.solvePyramidLinePlaneAngle"],
      disposition: "ported with a deterministic DTO solver and deprecated compatibility alias",
    },
    {
      source: "solve_cube",
      typescript: ["solvers.server.solveCubeLinePlaneAngle"],
      disposition: "ported as a deterministic exact-and-render DTO solver",
    },
  ] satisfies readonly GeometrySourceCapabilityTrace[],
} as const);
