import type { ThreeDFamilyId } from "../threeDSceneTypes";
import type { TransformPathSpec } from "./mathPathFunctions";
import type { MathSceneSoundCueSpec } from "./mathSceneSoundCue";
import type { VMobjectStyleInput } from "./mathVMobjectStyle";

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

export type MathMobjectClippingPlaneSpec = {
  constant: number;
  normal: Vec3;
};

export type MathMobjectUniformSpec = {
  clippingPlanes?: MathMobjectClippingPlaneSpec[];
  fixedInFrame?: boolean;
  opacity?: number;
  shadeIn3D?: boolean;
};

export type MathObjectSpec =
  | { type: "axis3d"; id: string; range: AxisRangeSpec; conceptId?: string; uniforms?: MathMobjectUniformSpec; zIndex?: number }
  | { type: "parametricCurve"; id: string; samples: Vec3[]; colorRole: string; conceptId: string; style?: VMobjectStyleInput; uniforms?: MathMobjectUniformSpec; zIndex?: number }
  | { type: "parametricSurface"; id: string; samples: Vec3[][]; uRange: Range2; vRange: Range2; colorRole: string; conceptId: string; style?: VMobjectStyleInput; uniforms?: MathMobjectUniformSpec; zIndex?: number }
  | { type: "movingPoint"; id: string; pathObjectId: string; colorRole: string; conceptId: string; uniforms?: MathMobjectUniformSpec; zIndex?: number }
  | { type: "trace"; id: string; sourceObjectId: string; durationSeconds: number; colorRole: string; style?: VMobjectStyleInput; uniforms?: MathMobjectUniformSpec; zIndex?: number }
  | { type: "vector"; id: string; from: Vec3; to: Vec3; colorRole: string; conceptId: string; style?: VMobjectStyleInput; uniforms?: MathMobjectUniformSpec; zIndex?: number };

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

export type FormulaSvgPathMorphSceneSpec = {
  formulaId: string;
  id: string;
  sourcePath: string;
  sourceTokenId: string;
  targetPath: string;
  targetTokenId: string;
};

export type MathMobjectAnchorName =
  | "back"
  | "bottom"
  | "center"
  | "front"
  | "left"
  | "lowerLeft"
  | "lowerRight"
  | "right"
  | "top"
  | "upperLeft"
  | "upperRight";

export type FormulaBinding = {
  anchorName?: MathMobjectAnchorName;
  conceptId: string;
  formulaId: string;
  objectId: string;
  tokenId: string;
};

export type MathSceneParameterSpec = {
  conceptId?: string;
  id: string;
  label: string;
  max?: number;
  min?: number;
  role: "control" | "derived" | "timeline";
  value: number;
};

export type MathSceneValueTrackerSpec = {
  conceptId?: string;
  id: string;
  label?: string;
  max?: number;
  min?: number;
  value: number;
};

export type AnimationStep =
  | { type: "animationComposition"; compositionId: string; duration: number }
  | { type: "animateTracker"; trackerId: string; targetValue: number; duration: number; easing: "linear" | "smooth" }
  | {
      type: "sweepParameter";
      trackerId: string;
      targetValue: number;
      duration: number;
      easing: "linear" | "smooth";
      conceptId?: string;
      formulaTokenIds?: string[];
      fromValue?: number;
    }
  | { type: "revealCurve"; objectId: string; duration: number; easing: "linear" | "smooth" }
  | { type: "revealSurface"; objectId: string; duration: number; easing: "linear" | "smooth" }
  | { type: "fadeInObject"; objectId: string; duration: number; easing: "linear" | "smooth" }
  | { type: "fadeOutObject"; objectId: string; duration: number; easing: "linear" | "smooth" }
  | { type: "growFromCenter"; objectId: string; duration: number; easing: "linear" | "smooth" }
  | { type: "moveAlongPath"; objectId: string; pathObjectId: string; duration: number }
  | {
      type: "transformObject";
      objectId: string;
      targetObjectId: string;
      duration: number;
      lagRatio?: number;
      path?: TransformPathSpec;
    }
  | { type: "highlight"; conceptId: string; duration: number }
  | { type: "cameraTo"; shotId: string; duration: number }
  | {
      type: "wait";
      duration: number;
      holdOnWait?: boolean;
      ignorePresenterMode?: boolean;
      maxTime?: number;
      note?: string;
      presenterMode?: boolean;
      presenterReleaseAfterFrames?: number;
      stopConditionId?: string;
      stopConditionSatisfiedAt?: number;
    };

export type CameraShot = {
  fov?: number;
  id: string;
  position: Vec3;
  target: Vec3;
};

export type MathSceneCameraUpdaterSpec = {
  degreesPerSecond: number;
  enabled?: boolean;
  endSeconds?: number;
  id: string;
  startSeconds?: number;
  type: "ambientRotation";
};

export type MathSceneRandomSeedSpec = {
  algorithm: "mulberry32";
  seed: number;
  signature: string;
  source: "scene";
};

export type MathSceneDiagnosticsSpec = {
  expectedBindingCount: number;
  expectedObjectCount: number;
  expectedTokenCount: number;
};

export type MathSceneAlwaysRedrawSpec = {
  dependencyTrackerIds: string[];
  factory?: MathSceneAlwaysRedrawFactorySpec;
  id: string;
  objectId: string;
};

export type MathSceneAlwaysRedrawScalarExpressionSpec =
  | { type: "add"; terms: MathSceneAlwaysRedrawScalarExpressionSpec[] }
  | { type: "constant"; value: number }
  | { type: "log"; value: MathSceneAlwaysRedrawScalarExpressionSpec }
  | { type: "max"; terms: MathSceneAlwaysRedrawScalarExpressionSpec[] }
  | { type: "min"; terms: MathSceneAlwaysRedrawScalarExpressionSpec[] }
  | { type: "multiply"; factors: MathSceneAlwaysRedrawScalarExpressionSpec[] }
  | { type: "sin"; value: MathSceneAlwaysRedrawScalarExpressionSpec }
  | { type: "t"; offset?: number; scale?: number }
  | { type: "tracker"; offset?: number; scale?: number; trackerId: string };

export type MathSceneAlwaysMethodPointExpressionSpec = {
  x?: MathSceneAlwaysRedrawScalarExpressionSpec;
  y?: MathSceneAlwaysRedrawScalarExpressionSpec;
  z?: MathSceneAlwaysRedrawScalarExpressionSpec;
};

export type MathSceneAlwaysRedrawFactorySpec =
  | {
      type: "parametricCurve";
      colorRole?: string;
      conceptId?: string;
      sampleCount: number;
      style?: VMobjectStyleInput;
      tRange: Range2;
      uniforms?: MathMobjectUniformSpec;
      x: MathSceneAlwaysRedrawScalarExpressionSpec;
      y: MathSceneAlwaysRedrawScalarExpressionSpec;
      z?: MathSceneAlwaysRedrawScalarExpressionSpec;
    };

export type MathSceneAlwaysMethodOperationSpec =
  | { type: "center" }
  | {
      type: "alignTo";
      direction?: Vec3;
      targetObjectId: string;
    }
  | { type: "matchDepth"; aboutPoint?: Vec3; stretch?: boolean; targetObjectId: string }
  | { type: "matchHeight"; aboutPoint?: Vec3; stretch?: boolean; targetObjectId: string }
  | { type: "matchWidth"; aboutPoint?: Vec3; stretch?: boolean; targetObjectId: string }
  | { type: "matchX"; targetObjectId: string }
  | { type: "matchY"; targetObjectId: string }
  | { type: "matchZ"; targetObjectId: string }
  | {
      type: "moveTo";
      point?: Vec3;
      pointExpression?: MathSceneAlwaysMethodPointExpressionSpec;
    }
  | {
      type: "nextTo";
      buff?: number;
      buffExpression?: MathSceneAlwaysRedrawScalarExpressionSpec;
      direction?: Vec3;
      targetObjectId: string;
    }
  | {
      type: "setX";
      coordinate?: number;
      coordinateExpression?: MathSceneAlwaysRedrawScalarExpressionSpec;
    }
  | {
      type: "setY";
      coordinate?: number;
      coordinateExpression?: MathSceneAlwaysRedrawScalarExpressionSpec;
    }
  | {
      type: "setZ";
      coordinate?: number;
      coordinateExpression?: MathSceneAlwaysRedrawScalarExpressionSpec;
    }
  | {
      type: "setOpacity";
      opacity?: number;
      opacityExpression?: MathSceneAlwaysRedrawScalarExpressionSpec;
    }
  | {
      type: "setStroke";
      strokeOpacity?: number;
      strokeOpacityExpression?: MathSceneAlwaysRedrawScalarExpressionSpec;
      strokeRole?: string;
      strokeWidth?: number;
      strokeWidthExpression?: MathSceneAlwaysRedrawScalarExpressionSpec;
    }
  | {
      type: "setFill";
      fillOpacity?: number;
      fillOpacityExpression?: MathSceneAlwaysRedrawScalarExpressionSpec;
      fillRole?: string;
    }
  | ({
      type: "setStyle";
      antiAliasWidthExpression?: MathSceneAlwaysRedrawScalarExpressionSpec;
      fillOpacityExpression?: MathSceneAlwaysRedrawScalarExpressionSpec;
      jointAngleDegreesExpression?: MathSceneAlwaysRedrawScalarExpressionSpec;
      strokeOpacityExpression?: MathSceneAlwaysRedrawScalarExpressionSpec;
      strokeWidthExpression?: MathSceneAlwaysRedrawScalarExpressionSpec;
    } & VMobjectStyleInput)
  | {
      type: "shift";
      vector?: Vec3;
      vectorExpression?: MathSceneAlwaysMethodPointExpressionSpec;
    }
  | {
      type: "scale";
      aboutPoint?: Vec3;
      factor?: number;
      factorExpression?: MathSceneAlwaysRedrawScalarExpressionSpec;
    }
  | {
      type: "stretch";
      aboutPoint?: Vec3;
      dim: "x" | "y" | "z";
      factor?: number;
      factorExpression?: MathSceneAlwaysRedrawScalarExpressionSpec;
    }
  | {
      type: "setDepth";
      aboutPoint?: Vec3;
      depth?: number;
      depthExpression?: MathSceneAlwaysRedrawScalarExpressionSpec;
      stretch?: boolean;
    }
  | {
      type: "setHeight";
      aboutPoint?: Vec3;
      height?: number;
      heightExpression?: MathSceneAlwaysRedrawScalarExpressionSpec;
      stretch?: boolean;
    }
  | {
      type: "setWidth";
      aboutPoint?: Vec3;
      stretch?: boolean;
      width?: number;
      widthExpression?: MathSceneAlwaysRedrawScalarExpressionSpec;
    }
  | {
      type: "rotate";
      aboutPoint?: Vec3;
      angleExpression?: MathSceneAlwaysRedrawScalarExpressionSpec;
      angleRadians?: number;
      axis?: "x" | "y" | "z";
    }
  | {
      type: "toCorner";
      buff?: number;
      direction?: Vec3;
      frame?: MathSceneEdgeFrameSpec;
    }
  | {
      type: "toEdge";
      buff?: number;
      direction?: Vec3;
      frame?: MathSceneEdgeFrameSpec;
    };

export type MathSceneAlwaysMethodUpdaterSpec = {
  id: string;
  objectId: string;
  operation: MathSceneAlwaysMethodOperationSpec;
};

export type MathSceneEdgeFrameSpec = {
  max: Vec3;
  min: Vec3;
};

export type MathSceneAnimateOperationSpec =
  | { type: "alignTo"; direction?: Vec3; targetObjectId: string }
  | { type: "center" }
  | { type: "matchDepth"; aboutPoint?: Vec3; stretch?: boolean; targetObjectId: string }
  | { type: "matchHeight"; aboutPoint?: Vec3; stretch?: boolean; targetObjectId: string }
  | { type: "matchWidth"; aboutPoint?: Vec3; stretch?: boolean; targetObjectId: string }
  | { type: "matchX"; targetObjectId: string }
  | { type: "matchY"; targetObjectId: string }
  | { type: "matchZ"; targetObjectId: string }
  | { type: "moveTo"; point: Vec3 }
  | { type: "nextTo"; buff?: number; direction?: Vec3; targetObjectId: string }
  | { type: "rotate"; aboutPoint?: Vec3; angleRadians: number; axis?: "x" | "y" | "z" }
  | { type: "scale"; aboutPoint?: Vec3; factor: number }
  | { type: "setColorRole"; colorRole: string }
  | { type: "setDepth"; aboutPoint?: Vec3; depth: number; stretch?: boolean }
  | { type: "setFill"; fillOpacity?: number; fillRole?: string }
  | { type: "setHeight"; aboutPoint?: Vec3; height: number; stretch?: boolean }
  | { type: "setOpacity"; opacity: number }
  | { type: "setStroke"; strokeOpacity?: number; strokeRole?: string; strokeWidth?: number }
  | ({ type: "setStyle" } & VMobjectStyleInput)
  | { type: "setWidth"; aboutPoint?: Vec3; stretch?: boolean; width: number }
  | { type: "setX"; coordinate: number }
  | { type: "setY"; coordinate: number }
  | { type: "setZ"; coordinate: number }
  | { type: "shift"; vector: Vec3 }
  | { type: "toCorner"; buff?: number; direction: Vec3; frame?: MathSceneEdgeFrameSpec }
  | { type: "toEdge"; buff?: number; direction: Vec3; frame?: MathSceneEdgeFrameSpec };

export type MathSceneAnimatePlanSpec = {
  duration: number;
  id: string;
  lagRatio?: number;
  objectId: string;
  operations: MathSceneAnimateOperationSpec[];
  path?: TransformPathSpec;
  targetObjectId: string;
};

export type MathSceneTransformMatchingKey = "conceptId" | "tokenId" | "tokenText";

export type MathSceneTransformMatchingSpec = {
  id: string;
  key?: MathSceneTransformMatchingKey;
  sourceFormulaId?: string;
  sourceObjectIds?: string[];
  targetFormulaId?: string;
  targetObjectIds?: string[];
  type: "transformMatchingShapes" | "transformMatchingTex";
};

export type MathSceneAnimationCompositionSpec = {
  animationPlanIds: string[];
  id: string;
  lagRatio?: number;
  rateFunction?: "linear" | "smooth";
  runTime?: number;
  type: "animationGroup" | "laggedStart" | "succession";
};

export type MathSceneRenderGroupsSpec = {
  fixedInFrameObjectIds?: string[];
  foregroundObjectIds?: string[];
};

export type MathSceneOdeSystemSpec =
  | { type: "constantVelocity"; velocity: Vec3 }
  | { type: "linear2d"; matrix: [[number, number], [number, number]] }
  | { type: "lorenz"; beta: number; rho: number; sigma: number };

export type MathSceneOdeTrajectorySpec = {
  bounds?: AxisRangeSpec;
  colorRole?: string;
  conceptId: string;
  coordinateMode?: "math" | "world";
  id: string;
  method?: "euler" | "rk4";
  start: Vec3;
  stepCount: number;
  system: MathSceneOdeSystemSpec;
  tailDurationSeconds?: number;
  tRange: Range2;
};

export type MathSceneVectorFieldSpec = {
  colorRole?: string;
  conceptId: string;
  coordinateMode?: "math" | "world";
  id: string;
  maxArrowLength?: number;
  system: MathSceneOdeSystemSpec;
  xRange: Range2;
  xSteps: number;
  yRange: Range2;
  ySteps: number;
  z?: number;
};

export type MathSceneVectorFieldUpdaterSpec = {
  bounds?: AxisRangeSpec;
  coordinateMode?: "math" | "world";
  id: string;
  objectId: string;
  speedScale?: number;
  system: MathSceneOdeSystemSpec;
  type: "moveAlongVectorField";
};

export type MathSceneStreamLineSpec = {
  bounds?: AxisRangeSpec;
  colorRole?: string;
  conceptId: string;
  coordinateMode?: "math" | "world";
  cycleSeconds?: number;
  dt: number;
  id: string;
  phaseOffsetStep?: number;
  stepCount: number;
  system: MathSceneOdeSystemSpec;
  visibleProgress?: number;
  xRange: Range2;
  xSteps: number;
  yRange: Range2;
  ySteps: number;
  z?: number;
};

export type MathSceneSpec = {
  alwaysMethodUpdaters?: MathSceneAlwaysMethodUpdaterSpec[];
  alwaysRedraw?: MathSceneAlwaysRedrawSpec[];
  animationCompositions?: MathSceneAnimationCompositionSpec[];
  animationPlans?: MathSceneAnimatePlanSpec[];
  bindings: FormulaBinding[];
  cameraShots: CameraShot[];
  cameraUpdaters?: MathSceneCameraUpdaterSpec[];
  coordinateSpace: CoordinateSpaceSpec;
  diagnostics: MathSceneDiagnosticsSpec;
  familyId: ThreeDFamilyId;
  formulaSvgMorphs?: FormulaSvgPathMorphSceneSpec[];
  formulas: FormulaSpec[];
  matchingTransforms?: MathSceneTransformMatchingSpec[];
  objects: MathObjectSpec[];
  odeTrajectories?: MathSceneOdeTrajectorySpec[];
  parameters?: MathSceneParameterSpec[];
  randomSeed?: MathSceneRandomSeedSpec;
  renderGroups?: MathSceneRenderGroupsSpec;
  sceneId: string;
  soundCues?: MathSceneSoundCueSpec[];
  streamLines?: MathSceneStreamLineSpec[];
  timeline: AnimationStep[];
  valueTrackers?: MathSceneValueTrackerSpec[];
  vectorFields?: MathSceneVectorFieldSpec[];
  vectorFieldUpdaters?: MathSceneVectorFieldUpdaterSpec[];
};

export type TimelineState = {
  activeConceptId: string;
  activeStep?: AnimationStep;
  activeStepIndex: number;
  easedLocalProgress: number;
  elapsedSeconds: number;
  localProgress: number;
  progress: number;
  rateFunction: "linear" | "smooth";
  totalDuration: number;
};
