import type { ThreeDSceneVariant, ThreeDSceneVariantMetadata } from "./threeDSceneTypes";

export const threeDSceneVariantMetadata = {
  "array-blocks": {
    minPrimitiveCount: 8,
    pedagogicalRole: "area, multiplication, and rectangular structure",
    spatialModel: "raised unit block array"
  },
  "balance-scale": {
    minPrimitiveCount: 5,
    pedagogicalRole: "equation equivalence and comparative quantity",
    spatialModel: "tilting beam balance"
  },
  "conic-section-deep": {
    minPrimitiveCount: 5,
    pedagogicalRole: "conic sections as plane slices through solids",
    spatialModel: "double cone with slicing plane and traces"
  },
  "cross-section-slicer": {
    minPrimitiveCount: 4,
    pedagogicalRole: "solid geometry cross-section reasoning",
    spatialModel: "transparent cylinder with movable slicing plane"
  },
  "curriculum-crosswalk": {
    minPrimitiveCount: 10,
    pedagogicalRole: "cross-region topic alignment and representation transfer",
    spatialModel: "linked vertical concept columns"
  },
  "distribution-machine": {
    minPrimitiveCount: 10,
    pedagogicalRole: "probability, samples, and statistical distribution shape",
    spatialModel: "histogram bars with sample particles"
  },
  "exam-strategy-capstone": {
    minPrimitiveCount: 7,
    pedagogicalRole: "multi-step strategy sequencing and exam readiness",
    spatialModel: "ascending milestone path"
  },
  "fraction-slices": {
    minPrimitiveCount: 5,
    pedagogicalRole: "part-whole fractions and active numerator slices",
    spatialModel: "radial slice model on a whole base"
  },
  "function-ribbon": {
    minPrimitiveCount: 8,
    pedagogicalRole: "function behavior, rate, and linked graph traces",
    spatialModel: "layered 3D curve ribbon with sampled points"
  },
  "geometry-axes": {
    minPrimitiveCount: 5,
    pedagogicalRole: "coordinate, angle, and right-triangle relationships",
    spatialModel: "orthogonal axes with vector and projection legs"
  },
  "measurement-rail": {
    minPrimitiveCount: 5,
    pedagogicalRole: "number line, scale, and measurement comparison",
    spatialModel: "graduated rail with movable marker"
  },
  "optimization-landscape": {
    minPrimitiveCount: 10,
    pedagogicalRole: "derivatives, extrema, and modeling paths",
    spatialModel: "height-field blocks with an optimization path"
  },
  "place-value-blocks": {
    minPrimitiveCount: 6,
    pedagogicalRole: "base-ten composition and regrouping",
    spatialModel: "tens rods and ones cubes"
  },
  "solid-net-fold": {
    minPrimitiveCount: 6,
    pedagogicalRole: "nets, volume, and folding into solids",
    spatialModel: "folding panels around a translucent solid"
  },
  "space-vector-plane": {
    minPrimitiveCount: 6,
    pedagogicalRole: "vectors, lines, and planes in three dimensions",
    spatialModel: "plane grid with lines, vectors, and anchor points"
  },
  "statistical-inference": {
    minPrimitiveCount: 10,
    pedagogicalRole: "sampling variability, mean, and interval inference",
    spatialModel: "sample cloud with confidence interval band"
  },
  "vector-conic-strategy": {
    minPrimitiveCount: 7,
    pedagogicalRole: "senior vector, conic, and strategy synthesis",
    spatialModel: "mixed cone, torus, path, and strategy blocks"
  }
} as const satisfies Record<ThreeDSceneVariant, ThreeDSceneVariantMetadata>;
