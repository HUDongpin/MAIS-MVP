import type { ReactNode } from "react";
import type { VisualizationTemplateId } from "../visualizationTemplateIds";

export const threeDFamilyIds = [
  "three-number-line",
  "three-base-ten-blocks",
  "three-array-area-blocks",
  "three-fraction-slices",
  "three-clock-money-data",
  "three-measurement-scale",
  "three-angle-geometry",
  "three-right-triangle-pythagorean",
  "three-coordinate-transform",
  "three-equation-balance",
  "three-function-graph",
  "three-function-family",
  "three-complex-plane",
  "three-trig-unit-wave",
  "three-probability-machine",
  "three-statistics-distribution",
  "three-calculus-rate-area",
  "three-vector-conic-strategy",
  "three-solid-nets-folding",
  "three-cross-section-slicer",
  "three-space-vectors-lines-planes",
  "three-conic-sections-deep",
  "three-optimization-modeling",
  "three-statistical-inference-lab",
  "three-curriculum-crosswalk-map",
  "three-exam-strategy-capstone"
] as const;

export type ThreeDFamilyId = (typeof threeDFamilyIds)[number];
export type ThreeDCoverageTier = "standard-3d" | "premium-3d" | "capstone-3d";
export type ThreeDRegionalPriority = "mainland" | "california" | "hong-kong" | "cross-region";
export type ThreeDSceneVariant =
  | "array-blocks"
  | "balance-scale"
  | "conic-section-deep"
  | "cross-section-slicer"
  | "curriculum-crosswalk"
  | "distribution-machine"
  | "exam-strategy-capstone"
  | "fraction-slices"
  | "function-ribbon"
  | "geometry-axes"
  | "measurement-rail"
  | "optimization-landscape"
  | "place-value-blocks"
  | "solid-net-fold"
  | "space-vector-plane"
  | "statistical-inference"
  | "vector-conic-strategy";

export type ThreeDVisualizationMetadata = {
  enabled: boolean;
  fallbackTemplateId: VisualizationTemplateId;
  familyId: ThreeDFamilyId;
  coverageTier: ThreeDCoverageTier;
  premiumLaunch?: boolean;
  regionalPriority?: ThreeDRegionalPriority;
};

export type ThreeDCanvasRuntime = "primitive" | "mais-manim";

export type ThreeDControlState = {
  comparison: number;
  mode: number;
  templateId: VisualizationTemplateId;
  value: number;
};

export type ThreeDStateSummary = ThreeDControlState & {
  depthValue: number;
  familyId: ThreeDFamilyId;
  primaryValue: number;
  secondaryValue: number;
  stateSummary: string;
};

export type ThreeDSceneProps = {
  accent: string;
  runtime?: ThreeDCanvasRuntime;
  state: ThreeDStateSummary;
};

export type ThreeDSceneVariantMetadata = {
  minPrimitiveCount: number;
  pedagogicalRole: string;
  spatialModel: string;
};

export type ThreeDLabCanvasProps = {
  accent: string;
  coverageTier?: ThreeDCoverageTier;
  fallback: ReactNode;
  label: string;
  premiumLaunch?: boolean;
  regionalPriority?: ThreeDRegionalPriority;
  runtime?: ThreeDCanvasRuntime;
  state: ThreeDStateSummary;
};
