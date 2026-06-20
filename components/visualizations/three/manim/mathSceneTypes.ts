import type { ThreeDFamilyId } from "../threeDSceneTypes";

export type Vec3 = [number, number, number];

export type Range2 = [number, number];

export type AxisRangeSpec = {
  x: Range2;
  y: Range2;
  z: Range2;
};

export type CoordinateSpaceSpec = {
  mathRange: AxisRangeSpec;
  worldRange: AxisRangeSpec;
};

export type SampledPoint = {
  math: Vec3;
  t: number;
  world: Vec3;
};

export type MathObjectSpec =
  | { type: "axis3d"; id: string; range: AxisRangeSpec; conceptId?: string }
  | { type: "parametricCurve"; id: string; samples: Vec3[]; colorRole: string; conceptId: string }
  | { type: "movingPoint"; id: string; pathObjectId: string; colorRole: string; conceptId: string }
  | { type: "trace"; id: string; sourceObjectId: string; durationSeconds: number; colorRole: string }
  | { type: "vector"; id: string; from: Vec3; to: Vec3; colorRole: string; conceptId: string };

export type FormulaTokenSpec = {
  conceptId: string;
  id: string;
  text: string;
};

export type FormulaSpec = {
  id: string;
  latex: string;
  tokens: FormulaTokenSpec[];
};

export type FormulaBinding = {
  conceptId: string;
  formulaId: string;
  objectId: string;
  tokenId: string;
};

export type AnimationStep =
  | { type: "revealCurve"; objectId: string; duration: number; easing: "linear" | "smooth" }
  | { type: "moveAlongPath"; objectId: string; pathObjectId: string; duration: number }
  | { type: "highlight"; conceptId: string; duration: number }
  | { type: "cameraTo"; shotId: string; duration: number }
  | { type: "wait"; duration: number };

export type CameraShot = {
  fov?: number;
  id: string;
  position: Vec3;
  target: Vec3;
};

export type MathSceneDiagnosticsSpec = {
  expectedBindingCount: number;
  expectedObjectCount: number;
  expectedTokenCount: number;
};

export type MathSceneSpec = {
  bindings: FormulaBinding[];
  cameraShots: CameraShot[];
  coordinateSpace: CoordinateSpaceSpec;
  diagnostics: MathSceneDiagnosticsSpec;
  familyId: ThreeDFamilyId;
  formulas: FormulaSpec[];
  objects: MathObjectSpec[];
  sceneId: string;
  timeline: AnimationStep[];
};

export type TimelineState = {
  activeConceptId: string;
  activeStep?: AnimationStep;
  activeStepIndex: number;
  elapsedSeconds: number;
  localProgress: number;
  progress: number;
  totalDuration: number;
};
