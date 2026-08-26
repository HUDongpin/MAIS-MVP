import { buildGraphCurveObject, buildParametricCurveObject, buildParametricSurfaceObject, createCoordinateSystem3D } from "./mathCoordinateSystem3D";
import { assignFormulaBindingAnchors } from "./mathFormulaBindingAnchors";
import { deriveMathSceneRandomSeed } from "./mathSceneRandom";
import type { MathSceneAlwaysRedrawScalarExpressionSpec, MathSceneParameterSpec, MathSceneSpec, Vec3 } from "./mathSceneTypes";
import { threeDFamilyIds, type ThreeDFamilyId, type ThreeDStateSummary } from "../threeDSceneTypes";

export const maisManimFamilyIds = threeDFamilyIds;

export type MaisManimFamilyId = (typeof maisManimFamilyIds)[number];

export function isMaisManimFamily(familyId: ThreeDFamilyId): familyId is MaisManimFamilyId {
  return (maisManimFamilyIds as readonly ThreeDFamilyId[]).includes(familyId);
}

function formatCoefficient(value: number) {
  return Number.isInteger(value) ? value.toFixed(0) : value.toFixed(2);
}

function normalizeFunctionMode(mode: number) {
  const rounded = Math.round(mode);
  if (rounded <= 0) return 0;
  if (rounded >= 2) return 2;
  return rounded;
}

function normalizeFunctionFamilyMode(mode: number) {
  // The function-family template has four modes (quadratic, wave, log, exp).
  const rounded = Math.round(mode);
  if (rounded <= 0) return 0;
  if (rounded >= 3) return 3;
  return rounded;
}

function functionValue(state: ThreeDStateSummary, x: number) {
  // The function-graph template's modes emphasize quadratic features
  // (vertex/roots/exponential-2D); they must never switch the 3D curve family.
  return functionFamilyValue(state, 0, x);
}

function functionFamilyValue(state: ThreeDStateSummary, mode: number, x: number) {
  const amplitude = Math.max(0.25, state.value / 6);
  const verticalShift = (state.comparison - 6) / 3;
  const activeMode = normalizeFunctionFamilyMode(mode);

  if (activeMode === 1) return Math.sin(x * 1.35) * amplitude + verticalShift;
  if (activeMode === 2) return Math.log(Math.max(0.05, x + 3.25)) * amplitude - 1 + verticalShift;
  if (activeMode === 3) return amplitude * Math.pow(2, x - 2) + verticalShift;
  return (amplitude * x * x) / 2.5 + verticalShift;
}

function formulaForFunctionGraph(state: ThreeDStateSummary) {
  const amplitude = Math.max(0.25, state.value / 6);
  const verticalShift = (state.comparison - 6) / 3;
  const sign = verticalShift >= 0 ? "+" : "-";

  return `$f(x)=${formatCoefficient(amplitude / 2.5)}x^2 ${sign} ${formatCoefficient(Math.abs(verticalShift))}$`;
}

function constantExpression(value: number): MathSceneAlwaysRedrawScalarExpressionSpec {
  return { type: "constant", value };
}

function tExpression(scale = 1, offset = 0): MathSceneAlwaysRedrawScalarExpressionSpec {
  return { type: "t", scale, offset };
}

function trackerExpression(
  trackerId: string,
  scale = 1,
  offset = 0
): MathSceneAlwaysRedrawScalarExpressionSpec {
  return { type: "tracker", trackerId, scale, offset };
}

function addExpression(...terms: MathSceneAlwaysRedrawScalarExpressionSpec[]): MathSceneAlwaysRedrawScalarExpressionSpec {
  return { type: "add", terms };
}

function multiplyExpression(...factors: MathSceneAlwaysRedrawScalarExpressionSpec[]): MathSceneAlwaysRedrawScalarExpressionSpec {
  return { type: "multiply", factors };
}

function maxExpression(...terms: MathSceneAlwaysRedrawScalarExpressionSpec[]): MathSceneAlwaysRedrawScalarExpressionSpec {
  return { type: "max", terms };
}

function sinExpression(value: MathSceneAlwaysRedrawScalarExpressionSpec): MathSceneAlwaysRedrawScalarExpressionSpec {
  return { type: "sin", value };
}

function logExpression(value: MathSceneAlwaysRedrawScalarExpressionSpec): MathSceneAlwaysRedrawScalarExpressionSpec {
  return { type: "log", value };
}

function mapMathExpressionToWorld(
  value: MathSceneAlwaysRedrawScalarExpressionSpec,
  mathRange: [number, number],
  worldRange: [number, number]
): MathSceneAlwaysRedrawScalarExpressionSpec {
  const mathSpan = mathRange[1] - mathRange[0];
  const worldSpan = worldRange[1] - worldRange[0];
  const scale = mathSpan === 0 ? 0 : worldSpan / mathSpan;

  return addExpression(
    constantExpression(worldRange[0]),
    multiplyExpression(addExpression(value, constantExpression(-mathRange[0])), constantExpression(scale))
  );
}

function functionGraphYExpression(
  _state: ThreeDStateSummary,
  xMath: MathSceneAlwaysRedrawScalarExpressionSpec
): MathSceneAlwaysRedrawScalarExpressionSpec {
  const amplitude = maxExpression(
    constantExpression(0.25),
    multiplyExpression(trackerExpression("parameter:value"), constantExpression(1 / 6))
  );
  const verticalShift = multiplyExpression(
    addExpression(trackerExpression("parameter:comparison"), constantExpression(-6)),
    constantExpression(1 / 3)
  );

  // Always the quadratic family: the function-graph modes (vertex/roots)
  // highlight features of the same curve rather than swapping families.
  return addExpression(
    multiplyExpression(amplitude, xMath, xMath, constantExpression(1 / 2.5)),
    verticalShift
  );
}

export function buildFunctionGraphMathSceneSpec({
  state
}: {
  accent: string;
  state: ThreeDStateSummary;
}): MathSceneSpec {
  const coordinateSpace = {
    mathRange: {
      x: [-3, 3] as [number, number],
      y: [-3, 4] as [number, number],
      z: [-1, 1] as [number, number]
    },
    worldRange: {
      x: [-2.35, 2.35] as [number, number],
      y: [0.12, 2.2] as [number, number],
      z: [-0.35, 0.35] as [number, number]
    }
  };
  const coordinateSystem = createCoordinateSystem3D(coordinateSpace);
  const xMathExpression = addExpression(constantExpression(-3), multiplyExpression(tExpression(), constantExpression(6)));
  const yMathExpression = functionGraphYExpression(state, xMathExpression);
  const zMathExpression = multiplyExpression(
    sinExpression(multiplyExpression(tExpression(), constantExpression(Math.PI * 2))),
    constantExpression(0.12)
  );
  const functionGraph = buildGraphCurveObject({
    colorRole: "function",
    conceptId: "function-rule",
    coordinateSystem,
    displaySampleCount: 72,
    id: "function-curve",
    sampleCount: 96,
    valueAt: (x, progress): Vec3 => [x, functionValue(state, x), Math.sin(progress * Math.PI * 2) * 0.12],
    xRange: [-3, 3]
  });
  const curveSamples = functionGraph.curve.samples;

  return {
    alwaysRedraw: [
      {
        dependencyTrackerIds: ["parameter:value", "parameter:comparison"],
        factory: {
          colorRole: "function",
          conceptId: "function-rule",
          sampleCount: curveSamples.length,
          tRange: [0, 1],
          type: "parametricCurve",
          x: mapMathExpressionToWorld(xMathExpression, coordinateSpace.mathRange.x, coordinateSpace.worldRange.x),
          y: mapMathExpressionToWorld(yMathExpression, coordinateSpace.mathRange.y, coordinateSpace.worldRange.y),
          z: mapMathExpressionToWorld(zMathExpression, coordinateSpace.mathRange.z, coordinateSpace.worldRange.z)
        },
        id: "function-curve:always-redraw",
        objectId: "function-curve"
      }
    ],
    animationPlans: [
      {
        duration: 1.2,
        id: "function-curve-attention-lift",
        lagRatio: 0.18,
        objectId: "function-curve",
        operations: [
          { type: "shift", vector: [0, 0.18, 0.08] },
          { type: "setColorRole", colorRole: "attention" }
        ],
        targetObjectId: "function-curve:attention-target"
      },
      {
        duration: 1.2,
        id: "function-probe-attention-pulse",
        objectId: "moving-probe",
        operations: [
          { type: "shift", vector: [0.18, 0.1, 0.05] },
          { type: "setColorRole", colorRole: "attention" }
        ],
        targetObjectId: "moving-probe:attention-target"
      }
    ],
    animationCompositions: [
      {
        animationPlanIds: ["function-curve-attention-lift", "function-probe-attention-pulse"],
        id: "function-attention-lagged-start",
        lagRatio: 0.2,
        type: "laggedStart"
      }
    ],
    bindings: [
      { anchorName: "upperRight", conceptId: "function-rule", formulaId: "function-formula", objectId: "function-curve", tokenId: "function-token" },
      { anchorName: "top", conceptId: "probe-point", formulaId: "function-formula", objectId: "moving-probe", tokenId: "point-token" }
    ],
    cameraShots: [
      { id: "overview", fov: 48, position: [3.4, 2.8, 4.1], target: [0, 0.78, 0] },
      { id: "curve-detail", fov: 44, position: [2.2, 2.15, 2.7], target: [0.2, 0.95, 0] }
    ],
    coordinateSpace,
    diagnostics: {
      expectedBindingCount: 2,
      expectedObjectCount: 4,
      expectedTokenCount: 2
    },
    familyId: "three-function-graph",
    formulas: [
      {
        id: "function-formula",
        latex: formulaForFunctionGraph(state),
        tokens: [
          { conceptId: "function-rule", id: "function-token", text: "f(x)" },
          { conceptId: "probe-point", id: "point-token", text: "(x,f(x))" }
        ]
      }
    ],
    formulaSvgMorphs: [
      {
        formulaId: "function-formula",
        id: "function-token-to-point-token",
        sourcePath: "M 0 0 L 10 0 L 10 10 Z",
        sourceTokenId: "function-token",
        targetPath: "M 0 2 L 8 2 L 8 12 Z",
        targetTokenId: "point-token"
      }
    ],
    objects: [
      { type: "axis3d", id: "axes", range: coordinateSpace.mathRange, conceptId: "coordinate-frame" },
      { type: "parametricCurve", id: "function-curve", samples: curveSamples, colorRole: "function", conceptId: "function-rule" },
      { type: "movingPoint", id: "moving-probe", pathObjectId: "function-curve", colorRole: "probe", conceptId: "probe-point" },
      { type: "trace", id: "probe-trace", sourceObjectId: "moving-probe", durationSeconds: 1.4, colorRole: "trace" }
    ],
    sceneId: "mais-manim-function-graph",
    timeline: [
      { type: "revealCurve", objectId: "function-curve", duration: 2.4, easing: "smooth" },
      { type: "moveAlongPath", objectId: "moving-probe", pathObjectId: "function-curve", duration: 3.6 },
      {
        type: "sweepParameter",
        trackerId: "parameter:value",
        fromValue: state.value,
        targetValue: state.comparison,
        duration: 1.2,
        easing: "smooth",
        conceptId: "function-rule",
        formulaTokenIds: ["function-token"]
      },
      { type: "animationComposition", compositionId: "function-attention-lagged-start", duration: 1.44 },
      { type: "cameraTo", shotId: "curve-detail", duration: 1.4 },
      { type: "wait", duration: 0.8 }
    ]
  };
}

function formulaForFunctionFamily(state: ThreeDStateSummary) {
  const activeMode = normalizeFunctionFamilyMode(state.mode);
  const nextMode = (activeMode + 1) % 4;
  const modeLabels = ["x^2", "\\sin x", "\\ln x", "2^x"];

  return `$f(x)\\in\\{${modeLabels.join(", ")}\\};\\ active=${modeLabels[activeMode]}\\ vs\\ ${modeLabels[nextMode]}$`;
}

export function buildFunctionFamilyMathSceneSpec({
  state
}: {
  accent: string;
  state: ThreeDStateSummary;
}): MathSceneSpec {
  const coordinateSpace = {
    mathRange: {
      x: [-3, 3] as [number, number],
      y: [-3, 4] as [number, number],
      z: [-1, 1] as [number, number]
    },
    worldRange: {
      x: [-2.35, 2.35] as [number, number],
      y: [0.12, 2.2] as [number, number],
      z: [-0.55, 0.55] as [number, number]
    }
  };
  const activeMode = normalizeFunctionFamilyMode(state.mode);
  const comparisonMode = (activeMode + 1) % 4;
  const coordinateSystem = createCoordinateSystem3D(coordinateSpace);
  const primaryFamilyGraph = buildGraphCurveObject({
    colorRole: "function",
    conceptId: "family-rule",
    coordinateSystem,
    displaySampleCount: 72,
    id: "primary-family-curve",
    sampleCount: 96,
    valueAt: (x): Vec3 => [x, functionFamilyValue(state, activeMode, x), -0.16],
    xRange: [-3, 3]
  });
  const comparisonFamilyGraph = buildGraphCurveObject({
    colorRole: "trace",
    conceptId: "comparison-rule",
    coordinateSystem,
    displaySampleCount: 72,
    id: "comparison-family-curve",
    sampleCount: 96,
    valueAt: (x): Vec3 => [x, functionFamilyValue(state, comparisonMode, x), 0.24],
    xRange: [-3, 3]
  });
  const primarySamples = primaryFamilyGraph.curve.samples;
  const comparisonSamples = comparisonFamilyGraph.curve.samples;

  return {
    bindings: [
      { anchorName: "upperRight", conceptId: "family-rule", formulaId: "family-formula", objectId: "primary-family-curve", tokenId: "family-token" },
      { anchorName: "upperLeft", conceptId: "comparison-rule", formulaId: "family-formula", objectId: "comparison-family-curve", tokenId: "comparison-token" },
      { anchorName: "top", conceptId: "probe-point", formulaId: "family-formula", objectId: "family-probe", tokenId: "probe-token" }
    ],
    cameraShots: [
      { id: "overview", fov: 48, position: [3.4, 2.8, 4.1], target: [0, 0.78, 0] },
      { id: "family-comparison", fov: 44, position: [2.4, 2.2, 3.1], target: [0.15, 1, 0.1] }
    ],
    coordinateSpace,
    diagnostics: {
      expectedBindingCount: 3,
      expectedObjectCount: 5,
      expectedTokenCount: 3
    },
    familyId: "three-function-family",
    formulas: [
      {
        id: "family-formula",
        latex: formulaForFunctionFamily(state),
        tokens: [
          { conceptId: "family-rule", id: "family-token", text: "active f(x)" },
          { conceptId: "comparison-rule", id: "comparison-token", text: "comparison g(x)" },
          { conceptId: "probe-point", id: "probe-token", text: "(x,f(x))" }
        ]
      }
    ],
    objects: [
      { type: "axis3d", id: "axes", range: coordinateSpace.mathRange, conceptId: "coordinate-frame" },
      { type: "parametricCurve", id: "primary-family-curve", samples: primarySamples, colorRole: "function", conceptId: "family-rule" },
      { type: "parametricCurve", id: "comparison-family-curve", samples: comparisonSamples, colorRole: "trace", conceptId: "comparison-rule" },
      { type: "movingPoint", id: "family-probe", pathObjectId: "primary-family-curve", colorRole: "probe", conceptId: "probe-point" },
      { type: "trace", id: "family-probe-trace", sourceObjectId: "family-probe", durationSeconds: 1.4, colorRole: "trace" }
    ],
    sceneId: "mais-manim-function-family",
    timeline: [
      { type: "revealCurve", objectId: "primary-family-curve", duration: 2.2, easing: "smooth" },
      { type: "revealCurve", objectId: "comparison-family-curve", duration: 1.8, easing: "smooth" },
      { type: "moveAlongPath", objectId: "family-probe", pathObjectId: "primary-family-curve", duration: 3.4 },
      { type: "highlight", conceptId: "family-rule", duration: 1 },
      { type: "cameraTo", shotId: "family-comparison", duration: 1.3 },
      { type: "wait", duration: 0.8 }
    ]
  };
}

function complexRadius(state: ThreeDStateSummary) {
  return clampValue(0.7 + state.value / 12, 0.85, 1.7);
}

function complexTheta(state: ThreeDStateSummary) {
  return (state.comparison / 12) * Math.PI * 2 + normalizeFunctionMode(state.mode) * Math.PI / 5;
}

function formulaForComplexPlane(state: ThreeDStateSummary) {
  return `$z=${formatCoefficient(complexRadius(state))}(\\cos\\theta+i\\sin\\theta);\\ \\theta=${formatCoefficient(complexTheta(state))}$`;
}

export function buildComplexPlaneMathSceneSpec({
  state
}: {
  accent: string;
  state: ThreeDStateSummary;
}): MathSceneSpec {
  const coordinateSpace = {
    mathRange: {
      x: [-2.4, 2.4] as [number, number],
      y: [-2.4, 2.4] as [number, number],
      z: [-1, 1] as [number, number]
    },
    worldRange: {
      x: [-2.25, 2.25] as [number, number],
      y: [0.12, 2.2] as [number, number],
      z: [-0.55, 0.55] as [number, number]
    }
  };
  const radius = complexRadius(state);
  const theta = complexTheta(state);
  const productTheta = theta + Math.PI / 5 + state.value / 18;
  const coordinateSystem = createCoordinateSystem3D(coordinateSpace);
  const origin: Vec3 = [0, 0, -0.2];
  const baseTip: Vec3 = [radius * Math.cos(theta), radius * Math.sin(theta), -0.2];
  const rotationFlowId = "complex-rotation-flow";
  const rotationFlowPathId = `${rotationFlowId}:trajectory-path`;
  const rotationFlowPointId = `${rotationFlowId}:current-state`;
  const productTip: Vec3 = [
    radius * 0.82 * Math.cos(productTheta),
    radius * 0.82 * Math.sin(productTheta),
    0.28
  ];
  const modulusCurve = buildParametricCurveObject({
    colorRole: "trace",
    conceptId: "modulus-circle",
    coordinateSystem,
    displaySampleCount: 72,
    id: "modulus-circle",
    sampleCount: 96,
    tRange: [0, 1],
    valueAt: (t): Vec3 => {
      const angle = t * Math.PI * 2;
      return [radius * Math.cos(angle), radius * Math.sin(angle), -0.22];
    }
  });
  const orbitCurve = buildParametricCurveObject({
    colorRole: "function",
    conceptId: "rotation-orbit",
    coordinateSystem,
    displaySampleCount: 56,
    id: "rotation-orbit",
    sampleCount: 96,
    tRange: [0, 1],
    valueAt: (t): Vec3 => {
      const angle = theta + t * (productTheta - theta);
      return [radius * 0.9 * Math.cos(angle), radius * 0.9 * Math.sin(angle), 0.2];
    }
  });
  const modulusSamples = modulusCurve.curve.samples;
  const orbitSamples = orbitCurve.curve.samples;

  return {
    bindings: [
      { conceptId: "modulus-circle", formulaId: "complex-formula", objectId: "modulus-circle", tokenId: "modulus-token" },
      { conceptId: "complex-vector", formulaId: "complex-formula", objectId: "complex-vector", tokenId: "complex-token" },
      { conceptId: "rotation-product", formulaId: "complex-formula", objectId: "product-vector", tokenId: "product-token" },
      { conceptId: "rotation-orbit", formulaId: "complex-formula", objectId: "orbit-probe", tokenId: "orbit-token" }
    ],
    cameraShots: [
      { id: "overview", fov: 48, position: [3.25, 2.75, 4.15], target: [0, 0.95, 0] },
      { id: "argument-detail", fov: 42, position: [2.35, 2.25, 2.75], target: [0.15, 1.02, 0] },
      { id: "rotation-product", fov: 43, position: [2.75, 2.15, 3.2], target: [0.35, 1.05, 0.18] }
    ],
    coordinateSpace,
    diagnostics: {
      expectedBindingCount: 4,
      expectedObjectCount: 6,
      expectedTokenCount: 4
    },
    familyId: "three-complex-plane",
    formulas: [
      {
        id: "complex-formula",
        latex: formulaForComplexPlane(state),
        tokens: [
          { conceptId: "modulus-circle", id: "modulus-token", text: "|z|" },
          { conceptId: "complex-vector", id: "complex-token", text: "z" },
          { conceptId: "rotation-product", id: "product-token", text: "zw" },
          { conceptId: "rotation-orbit", id: "orbit-token", text: "arg z" }
        ]
      }
    ],
    objects: [
      { type: "axis3d", id: "axes", range: coordinateSpace.mathRange, conceptId: "coordinate-frame" },
      { type: "parametricCurve", id: "modulus-circle", samples: modulusSamples, colorRole: "trace", conceptId: "modulus-circle" },
      { type: "parametricCurve", id: "rotation-orbit", samples: orbitSamples, colorRole: "function", conceptId: "rotation-orbit" },
      {
        type: "vector",
        id: "complex-vector",
        from: coordinateSystem.c2p(origin[0], origin[1], origin[2]),
        to: coordinateSystem.c2p(baseTip[0], baseTip[1], baseTip[2]),
        colorRole: "function",
        conceptId: "complex-vector"
      },
      {
        type: "vector",
        id: "product-vector",
        from: coordinateSystem.c2p(0, 0, 0.28),
        to: coordinateSystem.c2p(productTip[0], productTip[1], productTip[2]),
        colorRole: "probe",
        conceptId: "rotation-product"
      },
      { type: "movingPoint", id: "orbit-probe", pathObjectId: "rotation-orbit", colorRole: "probe", conceptId: "rotation-orbit" }
    ],
    odeTrajectories: [
      {
        bounds: coordinateSpace.mathRange,
        colorRole: "function",
        conceptId: "rotation-orbit",
        coordinateMode: "math",
        id: rotationFlowId,
        method: "rk4",
        start: [baseTip[0], baseTip[1], 0.2],
        stepCount: 144,
        system: {
          matrix: [
            [0, -1],
            [1, 0]
          ],
          type: "linear2d"
        },
        tailDurationSeconds: 1.2,
        tRange: [0, Math.PI * 2]
      }
    ],
    sceneId: "mais-manim-complex-plane",
    streamLines: [
      {
        bounds: coordinateSpace.mathRange,
        colorRole: "reference",
        conceptId: "rotation-orbit",
        coordinateMode: "math",
        dt: 0.08,
        id: "complex-rotation-streamlines",
        phaseOffsetStep: 0.18,
        stepCount: 18,
        system: {
          matrix: [
            [0, -1],
            [1, 0]
          ],
          type: "linear2d"
        },
        visibleProgress: 0.22,
        xRange: [-1.35, 1.35],
        xSteps: 2,
        yRange: [-1.35, 1.35],
        ySteps: 2,
        z: 0.2
      }
    ],
    timeline: [
      { type: "revealCurve", objectId: "modulus-circle", duration: 1.8, easing: "smooth" },
      { type: "revealCurve", objectId: "rotation-orbit", duration: 1.7, easing: "smooth" },
      { type: "revealCurve", objectId: rotationFlowPathId, duration: 1.6, easing: "linear" },
      { type: "highlight", conceptId: "complex-vector", duration: 1 },
      { type: "highlight", conceptId: "rotation-product", duration: 1 },
      { type: "moveAlongPath", objectId: "orbit-probe", pathObjectId: "rotation-orbit", duration: 3.1 },
      { type: "moveAlongPath", objectId: rotationFlowPointId, pathObjectId: rotationFlowPathId, duration: 3.2 },
      { type: "cameraTo", shotId: "argument-detail", duration: 1.2 },
      { type: "wait", duration: 0.8 }
    ],
    vectorFields: [
      {
        colorRole: "trace",
        conceptId: "rotation-orbit",
        coordinateMode: "math",
        id: "complex-rotation-field",
        maxArrowLength: 0.24,
        system: {
          matrix: [
            [0, -1],
            [1, 0]
          ],
          type: "linear2d"
        },
        xRange: [-1.7, 1.7],
        xSteps: 3,
        yRange: [-1.7, 1.7],
        ySteps: 3,
        z: 0.2
      }
    ]
  };
}

function clampValue(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function trigAmplitude(state: ThreeDStateSummary) {
  // Matches the 2D panel: the "Amplitude A" slider (comparison) sets amplitude,
  // in exact tenths over a 1..10 slider (see trigState in
  // configuredVisualizationLabModel.ts). Ninths here would put the scene and the
  // panel on different amplitudes for the same dial position.
  return clampValue(state.comparison / 10, 0.1, 1);
}

function trigPhase(state: ThreeDStateSummary) {
  // Matches the 2D mode buttons: 0 / +45deg / +90deg.
  return normalizeFunctionMode(state.mode) * Math.PI / 4;
}

function trigTheta(state: ThreeDStateSummary) {
  // Matches the 2D panel: the "Angle theta" slider (value) sets theta.
  return ((state.value - 1) / 8) * Math.PI * 2 + trigPhase(state);
}

function trigThetaDegrees(state: ThreeDStateSummary) {
  return ((((state.value - 1) / 8) * 360 + normalizeFunctionMode(state.mode) * 45) % 360 + 360) % 360;
}

function formulaForTrigUnitWave(state: ThreeDStateSummary) {
  return `$y=${formatCoefficient(trigAmplitude(state))}\\sin(x+\\theta);\\ (\\cos\\theta,\\sin\\theta);\\ \\theta=${formatCoefficient(trigThetaDegrees(state))}^\\circ$`;
}

export function buildTrigUnitWaveMathSceneSpec({
  state
}: {
  accent: string;
  state: ThreeDStateSummary;
}): MathSceneSpec {
  const coordinateSpace = {
    mathRange: {
      x: [-2.5, 6.8] as [number, number],
      y: [-1.6, 1.6] as [number, number],
      z: [-1, 1] as [number, number]
    },
    worldRange: {
      x: [-2.35, 2.35] as [number, number],
      y: [0.18, 2.15] as [number, number],
      z: [-0.55, 0.55] as [number, number]
    }
  };
  const centerX = -1.35;
  const amplitude = trigAmplitude(state);
  // The circle's radius IS the wave's amplitude — that is the correspondence
  // this scene exists to show, and at A = 1 it is the unit circle. It used to be
  // pinned at 0.72 while the amplitude varied, so the height of the rotating
  // point equalled the height of the wave at exactly one unreachable dial
  // setting, and the scene asserted a link it never drew.
  const circleRadius = amplitude;
  const activeTheta = trigTheta(state);
  const coordinateSystem = createCoordinateSystem3D(coordinateSpace);
  const center: Vec3 = [centerX, 0, -0.32];
  const radiusTip: Vec3 = [
    centerX + Math.cos(activeTheta) * circleRadius,
    Math.sin(activeTheta) * circleRadius,
    -0.32
  ];
  const unitCircleCurve = buildParametricCurveObject({
    colorRole: "trace",
    conceptId: "unit-circle",
    coordinateSystem,
    displaySampleCount: 72,
    id: "unit-circle",
    sampleCount: 96,
    tRange: [0, 1],
    valueAt: (t): Vec3 => {
      const theta = t * Math.PI * 2;
      return [centerX + Math.cos(theta) * circleRadius, Math.sin(theta) * circleRadius, -0.32];
    }
  });
  const sineWaveCurve = buildGraphCurveObject({
    colorRole: "function",
    conceptId: "sine-wave",
    coordinateSystem,
    displaySampleCount: 84,
    id: "sine-wave",
    sampleCount: 112,
    valueAt: (x): Vec3 => [x, amplitude * Math.sin(x + activeTheta), 0.24],
    // Starts at x = 0 so the point carrying the correspondence is actually
    // drawn: there the wave height is A sin(theta), which is exactly the height
    // of the rotating radius tip. The old range began at 0.12 and skipped it.
    xRange: [0, Math.PI * 2]
  });
  const circleSamples = unitCircleCurve.curve.samples;
  const waveSamples = sineWaveCurve.curve.samples;

  return {
    bindings: [
      { conceptId: "unit-circle", formulaId: "trig-formula", objectId: "unit-circle", tokenId: "circle-token" },
      { conceptId: "sine-wave", formulaId: "trig-formula", objectId: "sine-wave", tokenId: "wave-token" },
      { conceptId: "phase-probe", formulaId: "trig-formula", objectId: "wave-probe", tokenId: "probe-token" },
      { conceptId: "phase-angle", formulaId: "trig-formula", objectId: "phase-radius", tokenId: "angle-token" }
    ],
    cameraShots: [
      { id: "overview", fov: 48, position: [3.35, 2.85, 4.05], target: [0, 0.9, 0] },
      { id: "unit-circle-link", fov: 43, position: [2.25, 2.25, 2.7], target: [-0.65, 1.05, -0.08] },
      { id: "wave-detail", fov: 42, position: [2.55, 2.15, 2.6], target: [0.65, 1.05, 0.2] }
    ],
    coordinateSpace,
    diagnostics: {
      expectedBindingCount: 4,
      expectedObjectCount: 6,
      expectedTokenCount: 4
    },
    familyId: "three-trig-unit-wave",
    formulas: [
      {
        id: "trig-formula",
        latex: formulaForTrigUnitWave(state),
        tokens: [
          { conceptId: "unit-circle", id: "circle-token", text: "unit circle" },
          { conceptId: "sine-wave", id: "wave-token", text: "sin wave" },
          { conceptId: "phase-probe", id: "probe-token", text: "wave point" },
          { conceptId: "phase-angle", id: "angle-token", text: "theta" }
        ]
      }
    ],
    objects: [
      { type: "axis3d", id: "axes", range: coordinateSpace.mathRange, conceptId: "coordinate-frame" },
      { type: "parametricCurve", id: "unit-circle", samples: circleSamples, colorRole: "trace", conceptId: "unit-circle" },
      { type: "parametricCurve", id: "sine-wave", samples: waveSamples, colorRole: "function", conceptId: "sine-wave" },
      { type: "movingPoint", id: "wave-probe", pathObjectId: "sine-wave", colorRole: "probe", conceptId: "phase-probe" },
      {
        type: "vector",
        id: "phase-radius",
        from: coordinateSystem.c2p(center[0], center[1], center[2]),
        to: coordinateSystem.c2p(radiusTip[0], radiusTip[1], radiusTip[2]),
        colorRole: "probe",
        conceptId: "phase-angle"
      },
      { type: "trace", id: "phase-trace", sourceObjectId: "wave-probe", durationSeconds: 1.2, colorRole: "trace" }
    ],
    sceneId: "mais-manim-trig-unit-wave",
    timeline: [
      { type: "revealCurve", objectId: "unit-circle", duration: 1.8, easing: "smooth" },
      { type: "revealCurve", objectId: "sine-wave", duration: 2.3, easing: "smooth" },
      { type: "moveAlongPath", objectId: "wave-probe", pathObjectId: "sine-wave", duration: 3.4 },
      { type: "highlight", conceptId: "phase-angle", duration: 1 },
      { type: "cameraTo", shotId: "unit-circle-link", duration: 1.2 },
      { type: "highlight", conceptId: "sine-wave", duration: 1 },
      { type: "wait", duration: 0.8 }
    ]
  };
}

function calculusCoefficient(state: ThreeDStateSummary) {
  // Matches the 2D panel: "Curvature a" slider (value) sets a = value / 10.
  return state.value / 10;
}

function calculusProbeX(state: ThreeDStateSummary) {
  // Matches the 2D panel: "Probe x" slider (comparison) moves the probe.
  return clampValue((state.comparison - 5) / 1.25, -2.4, 2.4);
}

function calculusCurveValue(state: ThreeDStateSummary, x: number) {
  // Same curve as the 2D surface: f(x) = (a/2)x^2 + 0.35.
  return (calculusCoefficient(state) / 2) * x * x + 0.35;
}

function calculusDerivativeValue(state: ThreeDStateSummary, x: number) {
  return calculusCoefficient(state) * x;
}

/** Lower limit of the accumulation, matching the curve's drawn x range. */
const calculusAreaLowerLimit = -3;

/**
 * The exact accumulated area A(t) = the integral of f from -3 to t.
 *
 * With f(x) = (a/2)x^2 + 0.35 the antiderivative is (a/6)x^3 + 0.35x, so
 * A(t) = (a/6)(t^3 + 27) + 0.35(t + 3).
 *
 * This used to be `max(0, f(x)) * 0.72` — a scaled copy of f drawn under a
 * formula strip that claimed it was the integral. The shape was wrong (a
 * parabola where the accumulation is cubic), the value was wrong, and no
 * antiderivative was computed anywhere in the tree.
 */
function calculusAreaValue(state: ThreeDStateSummary, t: number) {
  const a = calculusCoefficient(state);
  const lower = calculusAreaLowerLimit;

  return (a / 6) * (t ** 3 - lower ** 3) + 0.35 * (t - lower);
}

/**
 * A(t) reaches about 8 at the top of the dial ranges while the frame holds
 * y in [-2, 5], so the accumulation curve is drawn at half height. The factor is
 * named here and published on the curve object rather than folded silently into
 * the sampled values, and the formula strip reports A(a) unscaled.
 */
const calculusAreaDisplayScale = 0.5;

function formulaForCalculusRateArea(state: ThreeDStateSummary) {
  const probe = calculusProbeX(state);

  return `$f'(a)\\approx ${formatCoefficient(calculusDerivativeValue(state, probe))};\\ A(a)=\\int_{-3}^{a} f(x)\\,dx\\approx ${formatCoefficient(calculusAreaValue(state, probe))}$`;
}

export function buildCalculusRateAreaMathSceneSpec({
  state
}: {
  accent: string;
  state: ThreeDStateSummary;
}): MathSceneSpec {
  const coordinateSpace = {
    mathRange: {
      x: [-3, 3] as [number, number],
      y: [-2, 5] as [number, number],
      z: [-1, 1] as [number, number]
    },
    worldRange: {
      x: [-2.35, 2.35] as [number, number],
      y: [0.12, 2.25] as [number, number],
      z: [-0.55, 0.55] as [number, number]
    }
  };
  const probeX = calculusProbeX(state);
  const probeY = calculusCurveValue(state, probeX);
  const tangentSlope = calculusDerivativeValue(state, probeX);
  const tangentHalfWidth = 0.64;
  const coordinateSystem = createCoordinateSystem3D(coordinateSpace);
  const tangentFrom = coordinateSystem.c2p(probeX - tangentHalfWidth, probeY - tangentSlope * tangentHalfWidth, 0.36);
  const tangentTo = coordinateSystem.c2p(probeX + tangentHalfWidth, probeY + tangentSlope * tangentHalfWidth, 0.36);
  const rateCurve = buildGraphCurveObject({
    colorRole: "function",
    conceptId: "rate-rule",
    coordinateSystem,
    displaySampleCount: 80,
    id: "rate-curve",
    sampleCount: 108,
    valueAt: (x): Vec3 => [x, calculusCurveValue(state, x), 0.06],
    xRange: [-3, 3]
  });
  const areaCurve = buildGraphCurveObject({
    colorRole: "trace",
    conceptId: "area-rule",
    coordinateSystem,
    displaySampleCount: 54,
    id: "area-accumulation",
    sampleCount: 72,
    valueAt: (x): Vec3 => [x, calculusAreaValue(state, x) * calculusAreaDisplayScale, -0.28],
    xRange: [calculusAreaLowerLimit, probeX]
  });
  const curveSamples = rateCurve.curve.samples;
  const areaSamples = areaCurve.curve.samples;

  return {
    bindings: [
      { conceptId: "rate-rule", formulaId: "calculus-formula", objectId: "rate-curve", tokenId: "rate-token" },
      { conceptId: "area-rule", formulaId: "calculus-formula", objectId: "area-accumulation", tokenId: "area-token" },
      { conceptId: "probe-point", formulaId: "calculus-formula", objectId: "calculus-probe", tokenId: "probe-token" },
      { conceptId: "tangent-line", formulaId: "calculus-formula", objectId: "tangent-vector", tokenId: "tangent-token" }
    ],
    cameraShots: [
      { id: "overview", fov: 48, position: [3.3, 2.8, 4.25], target: [0, 0.88, 0] },
      { id: "tangent-detail", fov: 42, position: [2.05, 2.1, 2.45], target: [0.2, 1.05, 0.2] },
      { id: "area-sweep", fov: 45, position: [2.8, 2.45, 3.15], target: [-0.35, 0.82, -0.18] }
    ],
    coordinateSpace,
    diagnostics: {
      expectedBindingCount: 4,
      expectedObjectCount: 6,
      expectedTokenCount: 4
    },
    familyId: "three-calculus-rate-area",
    formulas: [
      {
        id: "calculus-formula",
        latex: formulaForCalculusRateArea(state),
        tokens: [
          { conceptId: "rate-rule", id: "rate-token", text: "f'(a)" },
          { conceptId: "area-rule", id: "area-token", text: "A(a)" },
          { conceptId: "probe-point", id: "probe-token", text: "a" },
          { conceptId: "tangent-line", id: "tangent-token", text: "tangent" }
        ]
      }
    ],
    objects: [
      { type: "axis3d", id: "axes", range: coordinateSpace.mathRange, conceptId: "coordinate-frame" },
      { type: "parametricCurve", id: "rate-curve", samples: curveSamples, colorRole: "function", conceptId: "rate-rule" },
      { type: "parametricCurve", id: "area-accumulation", samples: areaSamples, colorRole: "trace", conceptId: "area-rule" },
      { type: "movingPoint", id: "calculus-probe", pathObjectId: "rate-curve", colorRole: "probe", conceptId: "probe-point" },
      { type: "vector", id: "tangent-vector", from: tangentFrom, to: tangentTo, colorRole: "probe", conceptId: "tangent-line" },
      { type: "trace", id: "area-trace", sourceObjectId: "calculus-probe", durationSeconds: 1.5, colorRole: "trace" }
    ],
    sceneId: "mais-manim-calculus-rate-area",
    timeline: [
      { type: "revealCurve", objectId: "rate-curve", duration: 2.2, easing: "smooth" },
      { type: "revealCurve", objectId: "area-accumulation", duration: 1.8, easing: "smooth" },
      { type: "moveAlongPath", objectId: "calculus-probe", pathObjectId: "rate-curve", duration: 3.5 },
      { type: "highlight", conceptId: "tangent-line", duration: 1.1 },
      { type: "cameraTo", shotId: "tangent-detail", duration: 1.2 },
      { type: "highlight", conceptId: "area-rule", duration: 1 },
      { type: "wait", duration: 0.8 }
    ]
  };
}

function vectorConicScale(state: ThreeDStateSummary) {
  return clampValue(0.9 + state.value / 16, 1.05, 1.65);
}

function vectorConicSlope(state: ThreeDStateSummary) {
  return clampValue((state.comparison - 5) / 8, -0.45, 0.65);
}

function formulaForVectorConicStrategy(state: ThreeDStateSummary) {
  const modeLabels = ["ellipse", "parabola", "hyperbola"];
  const activeMode = normalizeFunctionMode(state.mode);

  return `$\\vec v=\\langle a,b\\rangle;\\ ${modeLabels[activeMode]}\\ locus;\\ strategy=vector\\to conic\\to proof$`;
}

export function buildVectorConicStrategyMathSceneSpec({
  state
}: {
  accent: string;
  state: ThreeDStateSummary;
}): MathSceneSpec {
  const coordinateSpace = {
    mathRange: {
      x: [-3, 3] as [number, number],
      y: [-2.2, 3.2] as [number, number],
      z: [-1.6, 1.6] as [number, number]
    },
    worldRange: {
      x: [-2.35, 2.35] as [number, number],
      y: [0.12, 2.25] as [number, number],
      z: [-0.55, 0.55] as [number, number]
    }
  };
  const coordinateSystem = createCoordinateSystem3D(coordinateSpace);
  const scale = vectorConicScale(state);
  const slope = vectorConicSlope(state);
  const activeMode = normalizeFunctionMode(state.mode);
  const vectorOrigin: Vec3 = [-0.25, 0.22, -0.45];
  const vectorTip: Vec3 = [1.15 + slope, 0.72 + scale * 0.38, -0.45];
  const componentTip: Vec3 = [vectorTip[0], 0.22, -0.45];
  const conicCurve = buildParametricCurveObject({
    colorRole: "function",
    conceptId: "conic-locus",
    coordinateSystem,
    displaySampleCount: 80,
    id: "conic-locus",
    sampleCount: 112,
    tRange: [0, 1],
    valueAt: (t): Vec3 => {
      const u = -1 + t * 2;
      if (activeMode === 1) return [u * 1.65, 0.38 + scale * u * u, 0.18];
      if (activeMode === 2) return [Math.sinh(u) * 0.92, 0.62 + Math.cosh(u) * 0.42, 0.18 + u * 0.22];
      const angle = t * Math.PI * 2;
      return [Math.cos(angle) * scale, 0.74 + Math.sin(angle) * scale * 0.48, 0.18];
    }
  });
  const strategyCurve = buildParametricCurveObject({
    colorRole: "trace",
    conceptId: "strategy-path",
    coordinateSystem,
    displaySampleCount: 64,
    id: "strategy-path",
    sampleCount: 80,
    tRange: [0, 1],
    valueAt: (t): Vec3 => [
      -2.2 + t * 4.4,
      0.24 + Math.sin(t * Math.PI) * (0.9 + scale * 0.24),
      -0.52 + t * 0.96
    ]
  });

  return {
    bindings: [
      { conceptId: "vector-decomposition", formulaId: "vector-conic-formula", objectId: "strategy-vector", tokenId: "vector-token" },
      { conceptId: "conic-locus", formulaId: "vector-conic-formula", objectId: "conic-locus", tokenId: "conic-token" },
      { conceptId: "strategy-path", formulaId: "vector-conic-formula", objectId: "strategy-path", tokenId: "strategy-token" },
      { conceptId: "synthesis-checkpoint", formulaId: "vector-conic-formula", objectId: "strategy-probe", tokenId: "checkpoint-token" }
    ],
    cameraShots: [
      { id: "overview", fov: 48, position: [3.35, 2.8, 4.05], target: [0.05, 0.95, 0] },
      { id: "conic-locus-detail", fov: 42, position: [2.15, 2.1, 2.65], target: [0.15, 1.05, 0.12] },
      { id: "strategy-synthesis", fov: 43, position: [2.75, 2.4, 3.25], target: [0.35, 1.02, -0.12] }
    ],
    coordinateSpace,
    diagnostics: {
      expectedBindingCount: 4,
      expectedObjectCount: 7,
      expectedTokenCount: 4
    },
    familyId: "three-vector-conic-strategy",
    formulas: [
      {
        id: "vector-conic-formula",
        latex: formulaForVectorConicStrategy(state),
        tokens: [
          { conceptId: "vector-decomposition", id: "vector-token", text: "vector" },
          { conceptId: "conic-locus", id: "conic-token", text: "locus" },
          { conceptId: "strategy-path", id: "strategy-token", text: "strategy" },
          { conceptId: "synthesis-checkpoint", id: "checkpoint-token", text: "checkpoint" }
        ]
      }
    ],
    objects: [
      { type: "axis3d", id: "axes", range: coordinateSpace.mathRange, conceptId: "coordinate-frame" },
      { type: "parametricCurve", id: "conic-locus", samples: conicCurve.worldSamples, colorRole: "function", conceptId: "conic-locus" },
      { type: "parametricCurve", id: "strategy-path", samples: strategyCurve.worldSamples, colorRole: "trace", conceptId: "strategy-path" },
      {
        type: "vector",
        id: "strategy-vector",
        from: coordinateSystem.c2p(vectorOrigin[0], vectorOrigin[1], vectorOrigin[2]),
        to: coordinateSystem.c2p(vectorTip[0], vectorTip[1], vectorTip[2]),
        colorRole: "probe",
        conceptId: "vector-decomposition"
      },
      {
        type: "vector",
        id: "component-vector",
        from: coordinateSystem.c2p(vectorOrigin[0], vectorOrigin[1], vectorOrigin[2]),
        to: coordinateSystem.c2p(componentTip[0], componentTip[1], componentTip[2]),
        colorRole: "trace",
        conceptId: "vector-decomposition"
      },
      { type: "movingPoint", id: "strategy-probe", pathObjectId: "strategy-path", colorRole: "probe", conceptId: "synthesis-checkpoint" },
      { type: "trace", id: "strategy-trace", sourceObjectId: "strategy-probe", durationSeconds: 1.3, colorRole: "trace" }
    ],
    sceneId: "mais-manim-vector-conic-strategy",
    timeline: [
      { type: "revealCurve", objectId: "conic-locus", duration: 2.1, easing: "smooth" },
      { type: "revealCurve", objectId: "strategy-path", duration: 1.9, easing: "smooth" },
      { type: "highlight", conceptId: "vector-decomposition", duration: 1 },
      { type: "moveAlongPath", objectId: "strategy-probe", pathObjectId: "strategy-path", duration: 3.2 },
      { type: "highlight", conceptId: "conic-locus", duration: 1 },
      { type: "cameraTo", shotId: "conic-locus-detail", duration: 1.2 },
      { type: "cameraTo", shotId: "strategy-synthesis", duration: 1.2 },
      { type: "wait", duration: 0.8 }
    ]
  };
}

function spacePlaneTilt(state: ThreeDStateSummary) {
  return clampValue((state.comparison - 6) / 10, -0.32, 0.36);
}

function spaceVectorScale(state: ThreeDStateSummary) {
  return clampValue(0.85 + state.value / 14, 1.05, 1.7);
}

function formulaForSpaceVectorsLinesPlanes(state: ThreeDStateSummary) {
  const tilt = spacePlaneTilt(state);

  return `$\\Pi:\\vec n\\cdot(\\vec r-\\vec r_0)=0;\\ L:\\vec r=\\vec a+t\\vec d;\\ tilt=${formatCoefficient(tilt)}$`;
}

export function buildSpaceVectorsLinesPlanesMathSceneSpec({
  state
}: {
  accent: string;
  state: ThreeDStateSummary;
}): MathSceneSpec {
  const coordinateSpace = {
    mathRange: {
      x: [-3, 3] as [number, number],
      y: [-1, 3.2] as [number, number],
      z: [-2, 2] as [number, number]
    },
    worldRange: {
      x: [-2.35, 2.35] as [number, number],
      y: [0.12, 2.25] as [number, number],
      z: [-0.65, 0.65] as [number, number]
    }
  };
  const coordinateSystem = createCoordinateSystem3D(coordinateSpace);
  const tilt = spacePlaneTilt(state);
  const scale = spaceVectorScale(state);
  const planeY = (x: number, z: number) => 0.72 + tilt * x - 0.18 * z;
  const planeBoundaryPoint = (t: number): Vec3 => {
    const side = Math.floor(t * 4);
    const local = t * 4 - side;
    const extentX = 1.9;
    const extentZ = 1.2;
    if (side === 0) {
      const x = -extentX + local * extentX * 2;
      return [x, planeY(x, -extentZ), -extentZ];
    }
    if (side === 1) {
      const z = -extentZ + local * extentZ * 2;
      return [extentX, planeY(extentX, z), z];
    }
    if (side === 2) {
      const x = extentX - local * extentX * 2;
      return [x, planeY(x, extentZ), extentZ];
    }
    const z = extentZ - local * extentZ * 2;
    return [-extentX, planeY(-extentX, z), z];
  };
  const lineStart: Vec3 = [-2.18, planeY(-2.18, -0.88) + 0.42, -0.88];
  const lineEnd: Vec3 = [2.08, planeY(2.08, 0.92) + 0.18, 0.92];
  const normalBase: Vec3 = [0, planeY(0, 0), 0];
  const normalTip: Vec3 = [-tilt * scale, planeY(0, 0) + 0.92 * scale, 0.18 * scale];
  const directionTip: Vec3 = [
    lineStart[0] + (lineEnd[0] - lineStart[0]) * 0.28,
    lineStart[1] + (lineEnd[1] - lineStart[1]) * 0.28,
    lineStart[2] + (lineEnd[2] - lineStart[2]) * 0.28
  ];
  const planeBoundary = buildParametricCurveObject({
    colorRole: "trace",
    conceptId: "plane-equation",
    coordinateSystem,
    displaySampleCount: 72,
    id: "plane-boundary",
    sampleCount: 96,
    tRange: [0, 1],
    valueAt: (t): Vec3 => planeBoundaryPoint(t)
  });
  const spaceLine = buildParametricCurveObject({
    colorRole: "function",
    conceptId: "space-line",
    coordinateSystem,
    displaySampleCount: 56,
    id: "space-line",
    sampleCount: 80,
    tRange: [0, 1],
    valueAt: (t): Vec3 => [
      lineStart[0] + (lineEnd[0] - lineStart[0]) * t,
      lineStart[1] + (lineEnd[1] - lineStart[1]) * t,
      lineStart[2] + (lineEnd[2] - lineStart[2]) * t
    ]
  });
  const planeSurface = buildParametricSurfaceObject({
    colorRole: "surface",
    conceptId: "plane-equation",
    coordinateSystem,
    id: "plane-surface",
    uRange: [-1.9, 1.9],
    uSegments: 4,
    valueAt: (x, z): Vec3 => [x, planeY(x, z), z],
    vRange: [-1.2, 1.2],
    vSegments: 4
  });

  return {
    bindings: [
      { conceptId: "plane-equation", formulaId: "space-vector-formula", objectId: "plane-surface", tokenId: "plane-token" },
      { conceptId: "normal-vector", formulaId: "space-vector-formula", objectId: "normal-vector", tokenId: "normal-token" },
      { conceptId: "space-line", formulaId: "space-vector-formula", objectId: "space-line", tokenId: "line-token" },
      { conceptId: "intersection-point", formulaId: "space-vector-formula", objectId: "line-probe", tokenId: "intersection-token" }
    ],
    cameraShots: [
      { id: "overview", fov: 48, position: [3.45, 2.95, 4.3], target: [0.05, 1, 0] },
      { id: "plane-normal-detail", fov: 42, position: [2.25, 2.2, 2.75], target: [0.1, 1.08, 0.1] },
      { id: "line-intersection", fov: 43, position: [2.8, 2.35, 3.25], target: [0.35, 1.05, 0.16] }
    ],
    coordinateSpace,
    diagnostics: {
      expectedBindingCount: 4,
      expectedObjectCount: 8,
      expectedTokenCount: 4
    },
    familyId: "three-space-vectors-lines-planes",
    formulas: [
      {
        id: "space-vector-formula",
        latex: formulaForSpaceVectorsLinesPlanes(state),
        tokens: [
          { conceptId: "plane-equation", id: "plane-token", text: "plane" },
          { conceptId: "normal-vector", id: "normal-token", text: "normal" },
          { conceptId: "space-line", id: "line-token", text: "line" },
          { conceptId: "intersection-point", id: "intersection-token", text: "intersection" }
        ]
      }
    ],
    objects: [
      { type: "axis3d", id: "axes", range: coordinateSpace.mathRange, conceptId: "coordinate-frame" },
      {
        type: "parametricSurface",
        id: "plane-surface",
        samples: planeSurface.worldSamples,
        uRange: [-1.9, 1.9],
        vRange: [-1.2, 1.2],
        colorRole: "surface",
        conceptId: "plane-equation"
      },
      { type: "parametricCurve", id: "plane-boundary", samples: planeBoundary.worldSamples, colorRole: "trace", conceptId: "plane-equation" },
      { type: "parametricCurve", id: "space-line", samples: spaceLine.worldSamples, colorRole: "function", conceptId: "space-line" },
      {
        type: "vector",
        id: "normal-vector",
        from: coordinateSystem.c2p(normalBase[0], normalBase[1], normalBase[2]),
        to: coordinateSystem.c2p(normalTip[0], normalTip[1], normalTip[2]),
        colorRole: "probe",
        conceptId: "normal-vector"
      },
      {
        type: "vector",
        id: "direction-vector",
        from: coordinateSystem.c2p(lineStart[0], lineStart[1], lineStart[2]),
        to: coordinateSystem.c2p(directionTip[0], directionTip[1], directionTip[2]),
        colorRole: "trace",
        conceptId: "space-line"
      },
      { type: "movingPoint", id: "line-probe", pathObjectId: "space-line", colorRole: "probe", conceptId: "intersection-point" },
      { type: "trace", id: "line-trace", sourceObjectId: "line-probe", durationSeconds: 1.4, colorRole: "trace" }
    ],
    sceneId: "mais-manim-space-vectors-lines-planes",
    timeline: [
      { type: "revealCurve", objectId: "plane-boundary", duration: 2, easing: "smooth" },
      { type: "revealCurve", objectId: "space-line", duration: 1.8, easing: "smooth" },
      { type: "highlight", conceptId: "plane-equation", duration: 1 },
      { type: "highlight", conceptId: "normal-vector", duration: 1 },
      { type: "moveAlongPath", objectId: "line-probe", pathObjectId: "space-line", duration: 3.2 },
      { type: "highlight", conceptId: "intersection-point", duration: 1 },
      { type: "cameraTo", shotId: "plane-normal-detail", duration: 1.2 },
      { type: "wait", duration: 0.8 }
    ]
  };
}

function conicSectionScale(state: ThreeDStateSummary) {
  return clampValue(0.9 + state.value / 15, 1.05, 1.65);
}

function conicSliceTilt(state: ThreeDStateSummary) {
  return clampValue(0.16 + state.comparison / 18, 0.22, 0.72);
}

function formulaForConicSectionsDeep(state: ThreeDStateSummary) {
  const labels = ["ellipse", "parabola", "hyperbola"];
  const activeMode = normalizeFunctionMode(state.mode);

  return `$Ax^2+Bxy+Cy^2+Dx+Ey+F=0;\\ ${labels[activeMode]}=cone\\cap plane$`;
}

export function buildConicSectionsDeepMathSceneSpec({
  state
}: {
  accent: string;
  state: ThreeDStateSummary;
}): MathSceneSpec {
  const coordinateSpace = {
    mathRange: {
      x: [-3, 3] as [number, number],
      y: [-2, 3.2] as [number, number],
      z: [-2, 2] as [number, number]
    },
    worldRange: {
      x: [-2.35, 2.35] as [number, number],
      y: [0.12, 2.25] as [number, number],
      z: [-0.65, 0.65] as [number, number]
    }
  };
  const coordinateSystem = createCoordinateSystem3D(coordinateSpace);
  const scale = conicSectionScale(state);
  const tilt = conicSliceTilt(state);
  const activeMode = normalizeFunctionMode(state.mode);
  const rimRadius = 1.1 + scale * 0.18;
  const focusX = activeMode === 2 ? 0.72 : 0.48;
  const focusBase: Vec3 = [-focusX, 0.58, -0.38];
  const focusTip: Vec3 = [focusX, 0.58 + tilt * 0.34, -0.38];
  const upperRim = buildParametricCurveObject({
    colorRole: "trace",
    conceptId: "cone-surface",
    coordinateSystem,
    displaySampleCount: 60,
    id: "upper-cone-rim",
    sampleCount: 96,
    tRange: [0, 1],
    valueAt: (t): Vec3 => {
      const angle = t * Math.PI * 2;
      return [Math.cos(angle) * rimRadius, 1.82, Math.sin(angle) * rimRadius * 0.64];
    }
  });
  const lowerRim = buildParametricCurveObject({
    colorRole: "trace",
    conceptId: "cone-surface",
    coordinateSystem,
    displaySampleCount: 60,
    id: "lower-cone-rim",
    sampleCount: 96,
    tRange: [0, 1],
    valueAt: (t): Vec3 => {
      const angle = t * Math.PI * 2;
      return [Math.cos(angle) * rimRadius * 0.82, 0.2, Math.sin(angle) * rimRadius * 0.5];
    }
  });
  const slicingPlane = buildParametricCurveObject({
    colorRole: "probe",
    conceptId: "slicing-plane",
    coordinateSystem,
    displaySampleCount: 44,
    id: "slicing-plane",
    sampleCount: 88,
    tRange: [0, 1],
    valueAt: (t): Vec3 => {
      const x = -1.58 + t * 3.16;
      return [x, 0.72 + tilt * x, -0.46 + t * 0.92];
    }
  });
  const conicLocus = buildParametricCurveObject({
    colorRole: "function",
    conceptId: "conic-locus",
    coordinateSystem,
    displaySampleCount: 80,
    id: "conic-section-locus",
    sampleCount: 112,
    tRange: [0, 1],
    valueAt: (t): Vec3 => {
      const u = -1 + t * 2;
      if (activeMode === 1) return [u * 1.55, 0.48 + scale * u * u * 0.48, 0.18];
      if (activeMode === 2) return [Math.sinh(u) * 0.78, 0.66 + Math.cosh(u) * 0.34, 0.2 + u * 0.28];
      const angle = t * Math.PI * 2;
      return [Math.cos(angle) * scale, 0.72 + Math.sin(angle) * scale * 0.42, 0.2];
    }
  });

  return {
    bindings: [
      { conceptId: "cone-surface", formulaId: "conic-formula", objectId: "upper-cone-rim", tokenId: "cone-token" },
      { conceptId: "slicing-plane", formulaId: "conic-formula", objectId: "slicing-plane", tokenId: "slice-token" },
      { conceptId: "conic-locus", formulaId: "conic-formula", objectId: "conic-section-locus", tokenId: "locus-token" },
      { conceptId: "focus-directrix", formulaId: "conic-formula", objectId: "focus-vector", tokenId: "focus-token" }
    ],
    cameraShots: [
      { id: "overview", fov: 48, position: [3.45, 2.85, 4.3], target: [0, 1.02, 0] },
      { id: "slice-detail", fov: 42, position: [2.1, 2.05, 2.55], target: [0.08, 1.05, 0.05] },
      { id: "focus-locus", fov: 43, position: [2.75, 2.35, 3.1], target: [0.26, 0.95, 0.02] }
    ],
    coordinateSpace,
    diagnostics: {
      expectedBindingCount: 4,
      expectedObjectCount: 8,
      expectedTokenCount: 4
    },
    familyId: "three-conic-sections-deep",
    formulas: [
      {
        id: "conic-formula",
        latex: formulaForConicSectionsDeep(state),
        tokens: [
          { conceptId: "cone-surface", id: "cone-token", text: "cone" },
          { conceptId: "slicing-plane", id: "slice-token", text: "slice" },
          { conceptId: "conic-locus", id: "locus-token", text: "locus" },
          { conceptId: "focus-directrix", id: "focus-token", text: "focus" }
        ]
      }
    ],
    objects: [
      { type: "axis3d", id: "axes", range: coordinateSpace.mathRange, conceptId: "coordinate-frame" },
      { type: "parametricCurve", id: "upper-cone-rim", samples: upperRim.worldSamples, colorRole: "trace", conceptId: "cone-surface" },
      { type: "parametricCurve", id: "lower-cone-rim", samples: lowerRim.worldSamples, colorRole: "trace", conceptId: "cone-surface" },
      { type: "parametricCurve", id: "slicing-plane", samples: slicingPlane.worldSamples, colorRole: "probe", conceptId: "slicing-plane" },
      { type: "parametricCurve", id: "conic-section-locus", samples: conicLocus.worldSamples, colorRole: "function", conceptId: "conic-locus" },
      {
        type: "vector",
        id: "focus-vector",
        from: coordinateSystem.c2p(focusBase[0], focusBase[1], focusBase[2]),
        to: coordinateSystem.c2p(focusTip[0], focusTip[1], focusTip[2]),
        colorRole: "probe",
        conceptId: "focus-directrix"
      },
      { type: "movingPoint", id: "conic-probe", pathObjectId: "conic-section-locus", colorRole: "probe", conceptId: "conic-locus" },
      { type: "trace", id: "conic-probe-trace", sourceObjectId: "conic-probe", durationSeconds: 1.4, colorRole: "trace" }
    ],
    sceneId: "mais-manim-conic-sections-deep",
    timeline: [
      { type: "revealCurve", objectId: "upper-cone-rim", duration: 1.6, easing: "smooth" },
      { type: "revealCurve", objectId: "lower-cone-rim", duration: 1.4, easing: "smooth" },
      { type: "revealCurve", objectId: "slicing-plane", duration: 1.4, easing: "smooth" },
      { type: "revealCurve", objectId: "conic-section-locus", duration: 2, easing: "smooth" },
      { type: "moveAlongPath", objectId: "conic-probe", pathObjectId: "conic-section-locus", duration: 3.2 },
      { type: "highlight", conceptId: "focus-directrix", duration: 1 },
      { type: "cameraTo", shotId: "slice-detail", duration: 1.2 },
      { type: "wait", duration: 0.8 }
    ]
  };
}

function optimizationCurvature(state: ThreeDStateSummary) {
  return clampValue(0.18 + state.value / 28, 0.28, 0.58);
}

function optimizationConstraintSlope(state: ThreeDStateSummary) {
  return clampValue((state.comparison - 6) / 8, -0.35, 0.45);
}

function optimizationObjectiveValue(state: ThreeDStateSummary, x: number, y: number) {
  const curvature = optimizationCurvature(state);
  const ridge = Math.sin((x + state.mode * 0.25) * 1.15) * 0.22;

  return 1.45 - curvature * (x - 0.72) * (x - 0.72) - 0.34 * (y - 0.46) * (y - 0.46) + ridge;
}

function formulaForOptimizationModeling(state: ThreeDStateSummary) {
  const slope = optimizationConstraintSlope(state);

  return `$\\nabla f=\\lambda\\nabla g;\\ g(x,y)=0;\\ slope=${formatCoefficient(slope)}$`;
}

export function buildOptimizationModelingMathSceneSpec({
  state
}: {
  accent: string;
  state: ThreeDStateSummary;
}): MathSceneSpec {
  const coordinateSpace = {
    mathRange: {
      x: [-3, 3] as [number, number],
      y: [-1.8, 3.2] as [number, number],
      z: [-1.8, 1.8] as [number, number]
    },
    worldRange: {
      x: [-2.35, 2.35] as [number, number],
      y: [0.12, 2.25] as [number, number],
      z: [-0.65, 0.65] as [number, number]
    }
  };
  const coordinateSystem = createCoordinateSystem3D(coordinateSpace);
  const slope = optimizationConstraintSlope(state);
  const optimumX = clampValue((state.value - 6) / 2.8, -1.2, 1.35);
  const optimumY = 0.54 + slope * optimumX;
  const optimumZ = optimizationObjectiveValue(state, optimumX, optimumY);
  const gradientTip: Vec3 = [
    optimumX + 0.58,
    optimumY + 0.42,
    optimumZ + 0.18
  ];
  const objectiveRidge = buildParametricCurveObject({
    colorRole: "function",
    conceptId: "objective-function",
    coordinateSystem,
    displaySampleCount: 80,
    id: "objective-ridge",
    sampleCount: 112,
    tRange: [0, 1],
    valueAt: (t): Vec3 => {
      const x = -2.4 + t * 4.8;
      const y = 0.38 + 0.32 * Math.sin(t * Math.PI * 2 + state.mode * 0.3);
      return [x, optimizationObjectiveValue(state, x, y), y * 0.55];
    }
  });
  const constraintCurve = buildParametricCurveObject({
    colorRole: "trace",
    conceptId: "constraint-rule",
    coordinateSystem,
    displaySampleCount: 48,
    id: "constraint-curve",
    sampleCount: 72,
    tRange: [0, 1],
    valueAt: (t): Vec3 => {
      const x = -2.45 + t * 4.9;
      return [x, 0.54 + slope * x, -0.38];
    }
  });
  const levelSetContour = buildParametricCurveObject({
    colorRole: "trace",
    conceptId: "objective-function",
    coordinateSystem,
    displaySampleCount: 64,
    id: "level-set-contour",
    sampleCount: 96,
    tRange: [0, 1],
    valueAt: (t): Vec3 => {
      const angle = t * Math.PI * 2;
      return [
        optimumX + Math.cos(angle) * 0.96,
        optimumZ - 0.08 + Math.sin(angle) * 0.16,
        optimumY * 0.55 + Math.sin(angle) * 0.42
      ];
    }
  });
  const descentPath = buildParametricCurveObject({
    colorRole: "probe",
    conceptId: "optimum-point",
    coordinateSystem,
    displaySampleCount: 64,
    id: "descent-path",
    sampleCount: 88,
    tRange: [0, 1],
    valueAt: (t): Vec3 => {
      const x = -2.2 + (optimumX + 2.2) * t;
      const y = 0.2 + (optimumY - 0.2) * t + Math.sin(t * Math.PI) * 0.42;
      return [x, optimizationObjectiveValue(state, x, y) - (1 - t) * 0.35, y * 0.55];
    }
  });
  const objectiveSurface = buildParametricSurfaceObject({
    colorRole: "surface",
    conceptId: "objective-function",
    coordinateSystem,
    id: "objective-surface",
    uRange: [-2.4, 2.4],
    uSegments: 6,
    valueAt: (x, y): Vec3 => [x, optimizationObjectiveValue(state, x, y), y * 0.55],
    vRange: [-0.72, 1.68],
    vSegments: 6
  });

  return {
    bindings: [
      { conceptId: "objective-function", formulaId: "optimization-formula", objectId: "objective-surface", tokenId: "objective-token" },
      { conceptId: "constraint-rule", formulaId: "optimization-formula", objectId: "constraint-curve", tokenId: "constraint-token" },
      { conceptId: "gradient-condition", formulaId: "optimization-formula", objectId: "gradient-vector", tokenId: "gradient-token" },
      { conceptId: "optimum-point", formulaId: "optimization-formula", objectId: "optimizer-probe", tokenId: "optimum-token" }
    ],
    cameraShots: [
      { id: "overview", fov: 48, position: [3.35, 2.85, 4.25], target: [0, 1.02, 0] },
      { id: "constraint-detail", fov: 42, position: [2.25, 2.1, 2.65], target: [0.15, 1.02, -0.08] },
      { id: "gradient-optimum", fov: 43, position: [2.7, 2.35, 3.15], target: [0.42, 1.08, 0.06] }
    ],
    coordinateSpace,
    diagnostics: {
      expectedBindingCount: 4,
      expectedObjectCount: 9,
      expectedTokenCount: 4
    },
    familyId: "three-optimization-modeling",
    formulas: [
      {
        id: "optimization-formula",
        latex: formulaForOptimizationModeling(state),
        tokens: [
          { conceptId: "objective-function", id: "objective-token", text: "f(x,y)" },
          { conceptId: "constraint-rule", id: "constraint-token", text: "g=0" },
          { conceptId: "gradient-condition", id: "gradient-token", text: "gradients" },
          { conceptId: "optimum-point", id: "optimum-token", text: "optimum" }
        ]
      }
    ],
    objects: [
      { type: "axis3d", id: "axes", range: coordinateSpace.mathRange, conceptId: "coordinate-frame" },
      {
        type: "parametricSurface",
        id: "objective-surface",
        samples: objectiveSurface.worldSamples,
        uRange: [-2.4, 2.4],
        vRange: [-0.72, 1.68],
        colorRole: "surface",
        conceptId: "objective-function"
      },
      { type: "parametricCurve", id: "objective-ridge", samples: objectiveRidge.worldSamples, colorRole: "function", conceptId: "objective-function" },
      { type: "parametricCurve", id: "constraint-curve", samples: constraintCurve.worldSamples, colorRole: "trace", conceptId: "constraint-rule" },
      { type: "parametricCurve", id: "level-set-contour", samples: levelSetContour.worldSamples, colorRole: "trace", conceptId: "objective-function" },
      { type: "parametricCurve", id: "descent-path", samples: descentPath.worldSamples, colorRole: "probe", conceptId: "optimum-point" },
      {
        type: "vector",
        id: "gradient-vector",
        from: coordinateSystem.c2p(optimumX, optimumZ, optimumY * 0.55),
        to: coordinateSystem.c2p(gradientTip[0], gradientTip[1], gradientTip[2]),
        colorRole: "probe",
        conceptId: "gradient-condition"
      },
      { type: "movingPoint", id: "optimizer-probe", pathObjectId: "descent-path", colorRole: "probe", conceptId: "optimum-point" },
      { type: "trace", id: "optimizer-trace", sourceObjectId: "optimizer-probe", durationSeconds: 1.5, colorRole: "trace" }
    ],
    sceneId: "mais-manim-optimization-modeling",
    timeline: [
      { type: "revealSurface", objectId: "objective-surface", duration: 2, easing: "smooth" },
      { type: "revealCurve", objectId: "constraint-curve", duration: 1.5, easing: "smooth" },
      { type: "revealCurve", objectId: "level-set-contour", duration: 1.4, easing: "smooth" },
      { type: "revealCurve", objectId: "descent-path", duration: 1.7, easing: "smooth" },
      { type: "moveAlongPath", objectId: "optimizer-probe", pathObjectId: "descent-path", duration: 3.1 },
      { type: "highlight", conceptId: "gradient-condition", duration: 1 },
      { type: "cameraTo", shotId: "gradient-optimum", duration: 1.2 },
      { type: "wait", duration: 0.8 }
    ]
  };
}

function probabilitySuccessRate(state: ThreeDStateSummary) {
  return clampValue(0.18 + state.value / 12, 0.24, 0.86);
}

function probabilitySampleScale(state: ThreeDStateSummary) {
  return clampValue(0.78 + state.comparison / 16, 0.95, 1.45);
}

function probabilityMeanX(state: ThreeDStateSummary) {
  return (probabilitySuccessRate(state) - 0.5) * 3.2;
}

/** Sample size the formula strip quotes and the sampling error is derived from. */
function probabilitySampleSize(state: ThreeDStateSummary) {
  return Math.round(18 + probabilitySampleScale(state) * 28);
}

/**
 * Standard error of a sample proportion, sqrt(p(1 - p) / n).
 *
 * The deviation of the experimental curve from the theoretical one used to be
 * `sin(...) * 0.08 * sampleScale`, whose amplitude GREW with n — the exact
 * inverse of the law this topic exists to teach. Tying it to the standard error
 * makes a bigger sample visibly settle onto the model, which is the point.
 */
function probabilityStandardError(state: ThreeDStateSummary) {
  const p = probabilitySuccessRate(state);

  return Math.sqrt((p * (1 - p)) / probabilitySampleSize(state));
}

function formulaForProbabilityMachine(state: ThreeDStateSummary) {
  const p = probabilitySuccessRate(state);
  const sampleSize = probabilitySampleSize(state);

  return `$P(A)=${formatCoefficient(p)};\\ \\hat p_n\\to p;\\ n\\approx ${sampleSize};\\ SE=${formatCoefficient(probabilityStandardError(state))}$`;
}

export function buildProbabilityMachineMathSceneSpec({
  state
}: {
  accent: string;
  state: ThreeDStateSummary;
}): MathSceneSpec {
  const coordinateSpace = {
    mathRange: {
      x: [-3, 3] as [number, number],
      y: [-0.5, 3.4] as [number, number],
      z: [-1.8, 1.8] as [number, number]
    },
    worldRange: {
      x: [-2.35, 2.35] as [number, number],
      y: [0.12, 2.25] as [number, number],
      z: [-0.65, 0.65] as [number, number]
    }
  };
  const coordinateSystem = createCoordinateSystem3D(coordinateSpace);
  const meanX = probabilityMeanX(state);
  const p = probabilitySuccessRate(state);
  const spread = clampValue(1.25 - Math.abs(p - 0.5) * 1.1, 0.72, 1.18);
  const sampleScale = probabilitySampleScale(state);
  const theoreticalDistribution = buildParametricCurveObject({
    colorRole: "function",
    conceptId: "probability-model",
    coordinateSystem,
    displaySampleCount: 76,
    id: "theoretical-distribution",
    sampleCount: 108,
    tRange: [0, 1],
    valueAt: (t): Vec3 => {
      const x = -2.55 + t * 5.1;
      const density = Math.exp(-((x - meanX) * (x - meanX)) / (2 * spread * spread));
      return [x, 0.36 + density * 1.62, -0.32];
    }
  });
  const experimentalDistribution = buildParametricCurveObject({
    colorRole: "trace",
    conceptId: "experimental-frequency",
    coordinateSystem,
    displaySampleCount: 60,
    id: "experimental-distribution",
    sampleCount: 84,
    tRange: [0, 1],
    valueAt: (t): Vec3 => {
      const x = -2.55 + t * 5.1;
      const density = Math.exp(-((x - meanX) * (x - meanX)) / (2 * (spread * 1.08) * (spread * 1.08)));
      // Amplitude follows sqrt(p(1 - p)/n), so raising n settles the
      // experimental curve onto the model instead of shaking it harder.
      const samplingNoise = Math.sin(t * Math.PI * 8 + state.mode * 0.5) * probabilityStandardError(state) * 1.6;
      return [x, 0.28 + density * 1.25 + samplingNoise, 0.28];
    }
  });
  const trialStream = buildParametricCurveObject({
    colorRole: "probe",
    conceptId: "trial-process",
    coordinateSystem,
    displaySampleCount: 56,
    id: "trial-stream",
    sampleCount: 80,
    tRange: [0, 1],
    valueAt: (t): Vec3 => [
      -2.45 + (meanX + 2.45) * t,
      2.72 - t * 1.58 + Math.sin(t * Math.PI * 2) * 0.16,
      -0.78 + t * 1.05
    ]
  });

  return {
    bindings: [
      { conceptId: "probability-model", formulaId: "probability-formula", objectId: "theoretical-distribution", tokenId: "model-token" },
      { conceptId: "experimental-frequency", formulaId: "probability-formula", objectId: "experimental-distribution", tokenId: "frequency-token" },
      { conceptId: "trial-process", formulaId: "probability-formula", objectId: "outcome-probe", tokenId: "trial-token" },
      { conceptId: "expected-value", formulaId: "probability-formula", objectId: "expectation-vector", tokenId: "expectation-token" }
    ],
    cameraShots: [
      { id: "overview", fov: 48, position: [3.35, 2.75, 4.15], target: [0.05, 1, 0] },
      { id: "trial-machine", fov: 43, position: [2.2, 2.05, 2.6], target: [0.12, 1.35, -0.12] },
      { id: "frequency-compare", fov: 42, position: [2.65, 2.25, 3.05], target: [0.28, 0.92, 0.08] }
    ],
    coordinateSpace,
    diagnostics: {
      expectedBindingCount: 4,
      expectedObjectCount: 8,
      expectedTokenCount: 4
    },
    familyId: "three-probability-machine",
    formulas: [
      {
        id: "probability-formula",
        latex: formulaForProbabilityMachine(state),
        tokens: [
          { conceptId: "probability-model", id: "model-token", text: "P(A)" },
          { conceptId: "experimental-frequency", id: "frequency-token", text: "p-hat" },
          { conceptId: "trial-process", id: "trial-token", text: "trials" },
          { conceptId: "expected-value", id: "expectation-token", text: "E[X]" }
        ]
      }
    ],
    objects: [
      { type: "axis3d", id: "axes", range: coordinateSpace.mathRange, conceptId: "coordinate-frame" },
      { type: "parametricCurve", id: "theoretical-distribution", samples: theoreticalDistribution.worldSamples, colorRole: "function", conceptId: "probability-model" },
      { type: "parametricCurve", id: "experimental-distribution", samples: experimentalDistribution.worldSamples, colorRole: "trace", conceptId: "experimental-frequency" },
      { type: "parametricCurve", id: "trial-stream", samples: trialStream.worldSamples, colorRole: "probe", conceptId: "trial-process" },
      {
        type: "vector",
        id: "expectation-vector",
        from: coordinateSystem.c2p(meanX, 0.24, -0.32),
        to: coordinateSystem.c2p(meanX, 2.18, -0.32),
        colorRole: "probe",
        conceptId: "expected-value"
      },
      {
        type: "vector",
        id: "variability-vector",
        from: coordinateSystem.c2p(meanX - spread, 0.56, 0.28),
        to: coordinateSystem.c2p(meanX + spread, 0.56, 0.28),
        colorRole: "trace",
        conceptId: "experimental-frequency"
      },
      { type: "movingPoint", id: "outcome-probe", pathObjectId: "trial-stream", colorRole: "probe", conceptId: "trial-process" },
      { type: "trace", id: "trial-trace", sourceObjectId: "outcome-probe", durationSeconds: 1.35, colorRole: "trace" }
    ],
    sceneId: "mais-manim-probability-machine",
    timeline: [
      { type: "revealCurve", objectId: "trial-stream", duration: 1.5, easing: "smooth" },
      { type: "moveAlongPath", objectId: "outcome-probe", pathObjectId: "trial-stream", duration: 2.8 },
      { type: "revealCurve", objectId: "experimental-distribution", duration: 1.8, easing: "smooth" },
      { type: "revealCurve", objectId: "theoretical-distribution", duration: 1.8, easing: "smooth" },
      { type: "highlight", conceptId: "expected-value", duration: 1 },
      { type: "highlight", conceptId: "experimental-frequency", duration: 1 },
      { type: "cameraTo", shotId: "frequency-compare", duration: 1.2 },
      { type: "wait", duration: 0.8 }
    ]
  };
}

function statisticsCenter(state: ThreeDStateSummary) {
  return clampValue((state.value - 6) / 2.4, -1.35, 1.35);
}

function statisticsSpread(state: ThreeDStateSummary) {
  return clampValue(0.62 + state.comparison / 10, 0.85, 1.55);
}

function statisticsDensity(center: number, spread: number, x: number) {
  return Math.exp(-((x - center) * (x - center)) / (2 * spread * spread));
}

function formulaForStatisticsDistribution(state: ThreeDStateSummary) {
  const center = statisticsCenter(state);
  const spread = statisticsSpread(state);

  return `$\\bar{x}=${formatCoefficient(center)};\\ s=${formatCoefficient(spread)};\\ z=\\frac{x-\\bar{x}}{s}$`;
}

export function buildStatisticsDistributionMathSceneSpec({
  state
}: {
  accent: string;
  state: ThreeDStateSummary;
}): MathSceneSpec {
  const coordinateSpace = {
    mathRange: {
      x: [-3, 3] as [number, number],
      y: [-0.5, 3.4] as [number, number],
      z: [-1.8, 1.8] as [number, number]
    },
    worldRange: {
      x: [-2.35, 2.35] as [number, number],
      y: [0.12, 2.25] as [number, number],
      z: [-0.65, 0.65] as [number, number]
    }
  };
  const coordinateSystem = createCoordinateSystem3D(coordinateSpace);
  const center = statisticsCenter(state);
  const spread = statisticsSpread(state);
  const dotDistribution = buildParametricCurveObject({
    colorRole: "probe",
    conceptId: "sample-distribution",
    coordinateSystem,
    displaySampleCount: 62,
    id: "dot-distribution",
    sampleCount: 92,
    tRange: [0, 1],
    valueAt: (t): Vec3 => {
      const wave = Math.sin(t * Math.PI * 12 + state.mode * 0.3) * 0.12;
      const x = center + (t * 2 - 1) * spread * 1.52 + wave;
      const y = 0.48 + Math.abs(Math.sin(t * Math.PI * 9)) * 0.42;
      const z = -0.54 + Math.cos(t * Math.PI * 7) * 0.22;
      return [x, y, z];
    }
  });
  const histogramRidge = buildParametricCurveObject({
    colorRole: "trace",
    conceptId: "sample-distribution",
    coordinateSystem,
    displaySampleCount: 64,
    id: "histogram-ridge",
    sampleCount: 92,
    tRange: [0, 1],
    valueAt: (t): Vec3 => {
      const x = -2.6 + t * 5.2;
      const binPulse = Math.max(0, Math.sin(t * Math.PI * 10)) * 0.13;
      return [x, 0.32 + statisticsDensity(center, spread * 1.08, x) * 1.22 + binPulse, 0.08];
    }
  });
  const normalModelCurve = buildParametricCurveObject({
    colorRole: "function",
    conceptId: "normal-model",
    coordinateSystem,
    displaySampleCount: 76,
    id: "normal-model-curve",
    sampleCount: 108,
    tRange: [0, 1],
    valueAt: (t): Vec3 => {
      const x = -2.6 + t * 5.2;
      return [x, 0.28 + statisticsDensity(center, spread, x) * 1.68, 0.46];
    }
  });

  return {
    bindings: [
      { conceptId: "sample-distribution", formulaId: "statistics-formula", objectId: "dot-distribution", tokenId: "sample-token" },
      { conceptId: "center-mean", formulaId: "statistics-formula", objectId: "mean-vector", tokenId: "mean-token" },
      { conceptId: "spread-rule", formulaId: "statistics-formula", objectId: "spread-vector", tokenId: "spread-token" },
      { conceptId: "normal-model", formulaId: "statistics-formula", objectId: "normal-model-curve", tokenId: "model-token" }
    ],
    cameraShots: [
      { id: "overview", fov: 48, position: [3.35, 2.75, 4.15], target: [0.05, 1, 0] },
      { id: "center-spread", fov: 43, position: [2.2, 2.05, 2.6], target: [0.12, 1.02, 0] },
      { id: "model-compare", fov: 42, position: [2.65, 2.25, 3.05], target: [0.28, 0.9, 0.14] }
    ],
    coordinateSpace,
    diagnostics: {
      expectedBindingCount: 4,
      expectedObjectCount: 8,
      expectedTokenCount: 4
    },
    familyId: "three-statistics-distribution",
    formulas: [
      {
        id: "statistics-formula",
        latex: formulaForStatisticsDistribution(state),
        tokens: [
          { conceptId: "sample-distribution", id: "sample-token", text: "sample" },
          { conceptId: "center-mean", id: "mean-token", text: "x-bar" },
          { conceptId: "spread-rule", id: "spread-token", text: "s" },
          { conceptId: "normal-model", id: "model-token", text: "model" }
        ]
      }
    ],
    objects: [
      { type: "axis3d", id: "axes", range: coordinateSpace.mathRange, conceptId: "coordinate-frame" },
      { type: "parametricCurve", id: "dot-distribution", samples: dotDistribution.worldSamples, colorRole: "probe", conceptId: "sample-distribution" },
      { type: "parametricCurve", id: "histogram-ridge", samples: histogramRidge.worldSamples, colorRole: "trace", conceptId: "sample-distribution" },
      { type: "parametricCurve", id: "normal-model-curve", samples: normalModelCurve.worldSamples, colorRole: "function", conceptId: "normal-model" },
      {
        type: "vector",
        id: "mean-vector",
        from: coordinateSystem.c2p(center, 0.22, -0.48),
        to: coordinateSystem.c2p(center, 2.22, -0.48),
        colorRole: "probe",
        conceptId: "center-mean"
      },
      {
        type: "vector",
        id: "spread-vector",
        from: coordinateSystem.c2p(center - spread, 0.58, 0.08),
        to: coordinateSystem.c2p(center + spread, 0.58, 0.08),
        colorRole: "trace",
        conceptId: "spread-rule"
      },
      { type: "movingPoint", id: "sample-probe", pathObjectId: "dot-distribution", colorRole: "probe", conceptId: "sample-distribution" },
      { type: "trace", id: "sample-trace", sourceObjectId: "sample-probe", durationSeconds: 1.3, colorRole: "trace" }
    ],
    sceneId: "mais-manim-statistics-distribution",
    timeline: [
      { type: "revealCurve", objectId: "dot-distribution", duration: 1.6, easing: "smooth" },
      { type: "revealCurve", objectId: "histogram-ridge", duration: 1.6, easing: "smooth" },
      { type: "revealCurve", objectId: "normal-model-curve", duration: 1.8, easing: "smooth" },
      { type: "moveAlongPath", objectId: "sample-probe", pathObjectId: "dot-distribution", duration: 2.8 },
      { type: "highlight", conceptId: "center-mean", duration: 1 },
      { type: "highlight", conceptId: "spread-rule", duration: 1 },
      { type: "cameraTo", shotId: "model-compare", duration: 1.2 },
      { type: "wait", duration: 0.8 }
    ]
  };
}

function inferenceNullMean(state: ThreeDStateSummary) {
  return statisticsCenter(state) - clampValue((state.comparison - 6) / 4, -0.48, 0.48);
}

function inferenceStandardError(state: ThreeDStateSummary) {
  const sampleSize = 12 + Math.round(state.depthValue * 8);
  return clampValue(statisticsSpread(state) / Math.sqrt(sampleSize), 0.18, 0.42);
}

function formulaForStatisticalInference(state: ThreeDStateSummary) {
  const estimate = statisticsCenter(state);
  const margin = inferenceStandardError(state) * 1.96;
  const nullMean = inferenceNullMean(state);

  return `$\\bar{x}\\pm z^*SE=${formatCoefficient(estimate)}\\pm ${formatCoefficient(margin)};\\ H_0:\\mu=${formatCoefficient(nullMean)}$`;
}

export function buildStatisticalInferenceLabMathSceneSpec({
  state
}: {
  accent: string;
  state: ThreeDStateSummary;
}): MathSceneSpec {
  const coordinateSpace = {
    mathRange: {
      x: [-3, 3] as [number, number],
      y: [-0.5, 3.4] as [number, number],
      z: [-1.8, 1.8] as [number, number]
    },
    worldRange: {
      x: [-2.35, 2.35] as [number, number],
      y: [0.12, 2.25] as [number, number],
      z: [-0.65, 0.65] as [number, number]
    }
  };
  const coordinateSystem = createCoordinateSystem3D(coordinateSpace);
  const estimate = statisticsCenter(state);
  const nullMean = inferenceNullMean(state);
  const standardError = inferenceStandardError(state);
  const margin = standardError * 1.96;
  const testStatistic = clampValue((estimate - nullMean) / Math.max(standardError, 0.01), -2.6, 2.6);
  const samplingDistribution = buildParametricCurveObject({
    colorRole: "function",
    conceptId: "sample-estimate",
    coordinateSystem,
    displaySampleCount: 76,
    id: "sampling-distribution",
    sampleCount: 108,
    tRange: [0, 1],
    valueAt: (t): Vec3 => {
      const x = -2.65 + t * 5.3;
      const density = statisticsDensity(estimate, standardError * 4.2, x);
      return [x, 0.28 + density * 1.72, -0.34];
    }
  });
  const nullModelCurve = buildParametricCurveObject({
    colorRole: "trace",
    conceptId: "null-model",
    coordinateSystem,
    displaySampleCount: 76,
    id: "null-model-curve",
    sampleCount: 108,
    tRange: [0, 1],
    valueAt: (t): Vec3 => {
      const x = -2.65 + t * 5.3;
      const density = statisticsDensity(nullMean, standardError * 4.2, x);
      return [x, 0.28 + density * 1.48, 0.4];
    }
  });
  const confidenceBand = buildParametricCurveObject({
    colorRole: "probe",
    conceptId: "confidence-interval",
    coordinateSystem,
    displaySampleCount: 36,
    id: "confidence-band",
    sampleCount: 48,
    tRange: [0, 1],
    valueAt: (t): Vec3 => {
      const x = estimate - margin + t * margin * 2;
      return [x, 0.78 + Math.sin(t * Math.PI) * 0.08, 0.02];
    }
  });

  return {
    bindings: [
      { conceptId: "sample-estimate", formulaId: "inference-formula", objectId: "sampling-distribution", tokenId: "estimate-token" },
      { conceptId: "confidence-interval", formulaId: "inference-formula", objectId: "interval-vector", tokenId: "interval-token" },
      { conceptId: "null-model", formulaId: "inference-formula", objectId: "null-model-curve", tokenId: "null-token" },
      { conceptId: "test-statistic", formulaId: "inference-formula", objectId: "test-statistic-vector", tokenId: "test-token" }
    ],
    cameraShots: [
      { id: "overview", fov: 48, position: [3.35, 2.75, 4.15], target: [0.05, 1, 0] },
      { id: "interval-detail", fov: 43, position: [2.25, 2.05, 2.6], target: [0.12, 0.98, 0.02] },
      { id: "hypothesis-compare", fov: 42, position: [2.75, 2.28, 3.1], target: [0.28, 0.98, 0.14] }
    ],
    coordinateSpace,
    diagnostics: {
      expectedBindingCount: 4,
      expectedObjectCount: 8,
      expectedTokenCount: 4
    },
    familyId: "three-statistical-inference-lab",
    formulas: [
      {
        id: "inference-formula",
        latex: formulaForStatisticalInference(state),
        tokens: [
          { conceptId: "sample-estimate", id: "estimate-token", text: "x-bar" },
          { conceptId: "confidence-interval", id: "interval-token", text: "CI" },
          { conceptId: "null-model", id: "null-token", text: "H0" },
          { conceptId: "test-statistic", id: "test-token", text: "z" }
        ]
      }
    ],
    objects: [
      { type: "axis3d", id: "axes", range: coordinateSpace.mathRange, conceptId: "coordinate-frame" },
      { type: "parametricCurve", id: "sampling-distribution", samples: samplingDistribution.worldSamples, colorRole: "function", conceptId: "sample-estimate" },
      { type: "parametricCurve", id: "null-model-curve", samples: nullModelCurve.worldSamples, colorRole: "trace", conceptId: "null-model" },
      { type: "parametricCurve", id: "confidence-band", samples: confidenceBand.worldSamples, colorRole: "probe", conceptId: "confidence-interval" },
      {
        type: "vector",
        id: "interval-vector",
        from: coordinateSystem.c2p(estimate - margin, 0.78, 0.02),
        to: coordinateSystem.c2p(estimate + margin, 0.78, 0.02),
        colorRole: "probe",
        conceptId: "confidence-interval"
      },
      {
        type: "vector",
        id: "test-statistic-vector",
        from: coordinateSystem.c2p(nullMean, 0.34, 0.4),
        to: coordinateSystem.c2p(nullMean + testStatistic * standardError * 2.2, 1.14, -0.34),
        colorRole: "trace",
        conceptId: "test-statistic"
      },
      { type: "movingPoint", id: "estimate-probe", pathObjectId: "sampling-distribution", colorRole: "probe", conceptId: "sample-estimate" },
      { type: "trace", id: "estimate-trace", sourceObjectId: "estimate-probe", durationSeconds: 1.3, colorRole: "trace" }
    ],
    sceneId: "mais-manim-statistical-inference-lab",
    timeline: [
      { type: "revealCurve", objectId: "sampling-distribution", duration: 1.7, easing: "smooth" },
      { type: "revealCurve", objectId: "null-model-curve", duration: 1.7, easing: "smooth" },
      { type: "revealCurve", objectId: "confidence-band", duration: 1.2, easing: "smooth" },
      { type: "moveAlongPath", objectId: "estimate-probe", pathObjectId: "sampling-distribution", duration: 2.8 },
      { type: "highlight", conceptId: "confidence-interval", duration: 1 },
      { type: "highlight", conceptId: "test-statistic", duration: 1 },
      { type: "cameraTo", shotId: "hypothesis-compare", duration: 1.2 },
      { type: "wait", duration: 0.8 }
    ]
  };
}

function solidFoldAngleRadians(state: ThreeDStateSummary) {
  return clampValue(0.42 + state.value / 14 + normalizeFunctionMode(state.mode) * 0.08, 0.86, 1.34);
}

function solidScale(state: ThreeDStateSummary) {
  return clampValue(0.86 + state.depthValue / 4.5, 1.05, 1.45);
}

function formulaForSolidNetsFolding(state: ThreeDStateSummary) {
  const angleDegrees = solidFoldAngleRadians(state) * (180 / Math.PI);
  const scale = solidScale(state);

  return `$SA=2(lw+lh+wh);\\ V=lwh;\\ net\\to solid;\\ \\theta=${formatCoefficient(angleDegrees)}^\\circ;\\ scale=${formatCoefficient(scale)}$`;
}

function formulaForProjectionViews(state: ThreeDStateSummary) {
  const scale = clampValue(0.82 + state.depthValue / 5, 1.05, 1.48);

  return `$3D\\ solid\\rightarrow front+top+side;\\ views\\to model;\\ scale=${formatCoefficient(scale)}$`;
}

function buildProjectionViewsMathSceneSpec({
  state
}: {
  accent: string;
  state: ThreeDStateSummary;
}): MathSceneSpec {
  const coordinateSpace = {
    mathRange: {
      x: [-3, 3] as [number, number],
      y: [-0.8, 3.2] as [number, number],
      z: [-2, 2] as [number, number]
    },
    worldRange: {
      x: [-2.35, 2.35] as [number, number],
      y: [0.12, 2.25] as [number, number],
      z: [-0.65, 0.65] as [number, number]
    }
  };
  const coordinateSystem = createCoordinateSystem3D(coordinateSpace);
  const scale = clampValue(0.82 + state.depthValue / 5, 1.05, 1.48);
  const width = 1.08 * scale;
  const height = 1.02 * scale;
  const depth = 0.86 * scale;
  const baseX = -1.72;
  const baseY = 0.42;
  const baseZ = -0.34;
  const solidTopSurface = buildParametricSurfaceObject({
    colorRole: "surface",
    conceptId: "solid-model",
    coordinateSystem,
    id: "projection-solid-surface",
    uRange: [baseX, baseX + width],
    uSegments: 4,
    vRange: [baseZ, baseZ + depth],
    vSegments: 4,
    valueAt: (u, v): Vec3 => [u, baseY + height + (u - baseX) * 0.08 - (v - baseZ) * 0.05, v]
  });
  const frontCorners: [Vec3, Vec3, Vec3, Vec3] = [
    [0.18, 0.34, -1.16],
    [0.18 + width, 0.34, -1.16],
    [0.18 + width, 0.34 + height, -1.16],
    [0.18, 0.34 + height, -1.16]
  ];
  const topCorners: [Vec3, Vec3, Vec3, Vec3] = [
    [0.12, 0.12, -0.2],
    [0.12 + width, 0.12, -0.2],
    [0.12 + width, 0.12, -0.2 + depth],
    [0.12, 0.12, -0.2 + depth]
  ];
  const sideCorners: [Vec3, Vec3, Vec3, Vec3] = [
    [1.62, 0.34, -0.12],
    [1.62, 0.34, -0.12 + depth],
    [1.62, 0.34 + height, -0.12 + depth],
    [1.62, 0.34 + height, -0.12]
  ];
  const rectanglePointAt = (corners: [Vec3, Vec3, Vec3, Vec3], t: number): Vec3 => {
    const segmentProgress = t * corners.length;
    const segmentIndex = Math.min(corners.length - 1, Math.floor(segmentProgress));
    const localProgress = segmentProgress - segmentIndex;
    const from = corners[segmentIndex];
    const to = corners[(segmentIndex + 1) % corners.length];

    return [
      from[0] + (to[0] - from[0]) * localProgress,
      from[1] + (to[1] - from[1]) * localProgress,
      from[2] + (to[2] - from[2]) * localProgress
    ];
  };
  const frontViewOutline = buildParametricCurveObject({
    colorRole: "function",
    conceptId: "front-view",
    coordinateSystem,
    displaySampleCount: 48,
    id: "front-view-outline",
    sampleCount: 96,
    tRange: [0, 1],
    valueAt: (t): Vec3 => rectanglePointAt(frontCorners, t)
  });
  const topViewOutline = buildParametricCurveObject({
    colorRole: "trace",
    conceptId: "top-view",
    coordinateSystem,
    displaySampleCount: 48,
    id: "top-view-outline",
    sampleCount: 96,
    tRange: [0, 1],
    valueAt: (t): Vec3 => rectanglePointAt(topCorners, t)
  });
  const sideViewOutline = buildParametricCurveObject({
    colorRole: "probe",
    conceptId: "side-view",
    coordinateSystem,
    displaySampleCount: 48,
    id: "side-view-outline",
    sampleCount: 96,
    tRange: [0, 1],
    valueAt: (t): Vec3 => rectanglePointAt(sideCorners, t)
  });

  return {
    bindings: [
      { conceptId: "solid-model", formulaId: "projection-formula", objectId: "projection-solid-surface", tokenId: "solid-token" },
      { conceptId: "front-view", formulaId: "projection-formula", objectId: "front-view-outline", tokenId: "front-token" },
      { conceptId: "top-view", formulaId: "projection-formula", objectId: "top-view-outline", tokenId: "top-token" },
      { conceptId: "side-view", formulaId: "projection-formula", objectId: "side-view-outline", tokenId: "side-token" }
    ],
    cameraShots: [
      { id: "overview", fov: 48, position: [3.35, 2.75, 4.05], target: [0, 0.88, -0.08] },
      { id: "view-comparison", fov: 42, position: [2.2, 2.05, 2.62], target: [0.7, 0.82, -0.35] },
      { id: "solid-rebuild", fov: 42, position: [2.65, 2.35, 3.05], target: [-0.82, 1.05, -0.08] }
    ],
    coordinateSpace,
    diagnostics: {
      expectedBindingCount: 4,
      expectedObjectCount: 8,
      expectedTokenCount: 4
    },
    familyId: "three-projection-views",
    formulas: [
      {
        id: "projection-formula",
        latex: formulaForProjectionViews(state),
        tokens: [
          { conceptId: "solid-model", id: "solid-token", text: "solid" },
          { conceptId: "front-view", id: "front-token", text: "front" },
          { conceptId: "top-view", id: "top-token", text: "top" },
          { conceptId: "side-view", id: "side-token", text: "side" }
        ]
      }
    ],
    objects: [
      { type: "axis3d", id: "axes", range: coordinateSpace.mathRange, conceptId: "coordinate-frame" },
      {
        type: "parametricSurface",
        id: "projection-solid-surface",
        samples: solidTopSurface.worldSamples,
        uRange: [baseX, baseX + width],
        vRange: [baseZ, baseZ + depth],
        colorRole: "surface",
        conceptId: "solid-model"
      },
      { type: "parametricCurve", id: "front-view-outline", samples: frontViewOutline.worldSamples, colorRole: "function", conceptId: "front-view" },
      { type: "parametricCurve", id: "top-view-outline", samples: topViewOutline.worldSamples, colorRole: "trace", conceptId: "top-view" },
      { type: "parametricCurve", id: "side-view-outline", samples: sideViewOutline.worldSamples, colorRole: "probe", conceptId: "side-view" },
      {
        type: "vector",
        id: "view-direction-vector",
        from: coordinateSystem.c2p(baseX + width / 2, baseY + height + 0.42, baseZ + depth / 2),
        to: coordinateSystem.c2p(0.72, 1.18, -1.16),
        colorRole: "probe",
        conceptId: "view-direction"
      },
      { type: "movingPoint", id: "projection-probe", pathObjectId: "front-view-outline", colorRole: "probe", conceptId: "front-view" },
      { type: "trace", id: "projection-trace", sourceObjectId: "projection-probe", durationSeconds: 1.35, colorRole: "trace" }
    ],
    sceneId: "mais-manim-projection-views",
    timeline: [
      { type: "revealSurface", objectId: "projection-solid-surface", duration: 1.5, easing: "smooth" },
      { type: "revealCurve", objectId: "front-view-outline", duration: 1.1, easing: "smooth" },
      { type: "revealCurve", objectId: "top-view-outline", duration: 1.1, easing: "smooth" },
      { type: "revealCurve", objectId: "side-view-outline", duration: 1.1, easing: "smooth" },
      { type: "highlight", conceptId: "solid-model", duration: 1 },
      { type: "moveAlongPath", objectId: "projection-probe", pathObjectId: "front-view-outline", duration: 2.8 },
      { type: "cameraTo", shotId: "view-comparison", duration: 1.2 },
      { type: "wait", duration: 0.8 }
    ]
  };
}

export function buildSolidNetsFoldingMathSceneSpec({
  state
}: {
  accent: string;
  state: ThreeDStateSummary;
}): MathSceneSpec {
  const coordinateSpace = {
    mathRange: {
      x: [-3, 3] as [number, number],
      y: [-0.6, 3.4] as [number, number],
      z: [-2, 2] as [number, number]
    },
    worldRange: {
      x: [-2.35, 2.35] as [number, number],
      y: [0.12, 2.25] as [number, number],
      z: [-0.65, 0.65] as [number, number]
    }
  };
  const coordinateSystem = createCoordinateSystem3D(coordinateSpace);
  const scale = solidScale(state);
  const foldAngle = solidFoldAngleRadians(state);
  const baseY = 0.32;
  const halfLength = 1.08 * scale;
  const halfWidth = 0.66 * scale;
  const hingeZ = halfWidth;
  const faceHeight = 0.82 * scale;
  const foldedY = (height: number) => baseY + Math.sin(foldAngle) * height;
  const foldedZ = (height: number) => hingeZ + Math.cos(foldAngle) * height;
  const netLayoutSurface = buildParametricSurfaceObject({
    colorRole: "surface",
    conceptId: "net-layout",
    coordinateSystem,
    id: "net-layout-surface",
    uRange: [-halfLength, halfLength],
    uSegments: 3,
    vRange: [-halfWidth, halfWidth],
    vSegments: 3,
    valueAt: (u, v): Vec3 => [u, baseY, v]
  });
  const foldedFaceSurface = buildParametricSurfaceObject({
    colorRole: "function",
    conceptId: "surface-area",
    coordinateSystem,
    id: "folded-face-surface",
    uRange: [-halfLength, halfLength],
    uSegments: 3,
    vRange: [0, faceHeight],
    vSegments: 3,
    valueAt: (u, v): Vec3 => [u, foldedY(v), foldedZ(v)]
  });
  const hingeCurve = buildParametricCurveObject({
    colorRole: "trace",
    conceptId: "fold-angle",
    coordinateSystem,
    displaySampleCount: 24,
    id: "hinge-curve",
    sampleCount: 32,
    tRange: [0, 1],
    valueAt: (t): Vec3 => [-halfLength + t * halfLength * 2, baseY, hingeZ]
  });
  const foldPathCurve = buildParametricCurveObject({
    colorRole: "probe",
    conceptId: "volume-model",
    coordinateSystem,
    displaySampleCount: 44,
    id: "fold-path-curve",
    sampleCount: 64,
    tRange: [0, 1],
    valueAt: (t): Vec3 => {
      const angle = t * foldAngle;
      return [halfLength, baseY + Math.sin(angle) * faceHeight, hingeZ + Math.cos(angle) * faceHeight];
    }
  });

  return {
    bindings: [
      { conceptId: "net-layout", formulaId: "solid-net-formula", objectId: "net-layout-surface", tokenId: "net-token" },
      { conceptId: "fold-angle", formulaId: "solid-net-formula", objectId: "fold-angle-vector", tokenId: "angle-token" },
      { conceptId: "surface-area", formulaId: "solid-net-formula", objectId: "folded-face-surface", tokenId: "surface-token" },
      { conceptId: "volume-model", formulaId: "solid-net-formula", objectId: "fold-probe", tokenId: "volume-token" }
    ],
    cameraShots: [
      { id: "overview", fov: 48, position: [3.35, 2.75, 4.15], target: [0, 0.95, 0.05] },
      { id: "net-layout", fov: 43, position: [2.35, 2.05, 2.7], target: [0, 0.62, 0.12] },
      { id: "folded-solid", fov: 42, position: [2.7, 2.35, 3.15], target: [0.18, 1.08, 0.28] }
    ],
    coordinateSpace,
    diagnostics: {
      expectedBindingCount: 4,
      expectedObjectCount: 8,
      expectedTokenCount: 4
    },
    familyId: "three-solid-nets-folding",
    formulas: [
      {
        id: "solid-net-formula",
        latex: formulaForSolidNetsFolding(state),
        tokens: [
          { conceptId: "net-layout", id: "net-token", text: "net" },
          { conceptId: "fold-angle", id: "angle-token", text: "theta" },
          { conceptId: "surface-area", id: "surface-token", text: "SA" },
          { conceptId: "volume-model", id: "volume-token", text: "V" }
        ]
      }
    ],
    objects: [
      { type: "axis3d", id: "axes", range: coordinateSpace.mathRange, conceptId: "coordinate-frame" },
      {
        type: "parametricSurface",
        id: "net-layout-surface",
        samples: netLayoutSurface.worldSamples,
        uRange: [-halfLength, halfLength],
        vRange: [-halfWidth, halfWidth],
        colorRole: "surface",
        conceptId: "net-layout"
      },
      {
        type: "parametricSurface",
        id: "folded-face-surface",
        samples: foldedFaceSurface.worldSamples,
        uRange: [-halfLength, halfLength],
        vRange: [0, faceHeight],
        colorRole: "function",
        conceptId: "surface-area"
      },
      { type: "parametricCurve", id: "hinge-curve", samples: hingeCurve.worldSamples, colorRole: "trace", conceptId: "fold-angle" },
      { type: "parametricCurve", id: "fold-path-curve", samples: foldPathCurve.worldSamples, colorRole: "probe", conceptId: "volume-model" },
      {
        type: "vector",
        id: "fold-angle-vector",
        from: coordinateSystem.c2p(0, baseY, hingeZ),
        to: coordinateSystem.c2p(0, foldedY(faceHeight * 0.82), foldedZ(faceHeight * 0.82)),
        colorRole: "probe",
        conceptId: "fold-angle"
      },
      { type: "movingPoint", id: "fold-probe", pathObjectId: "fold-path-curve", colorRole: "probe", conceptId: "volume-model" },
      { type: "trace", id: "fold-trace", sourceObjectId: "fold-probe", durationSeconds: 1.35, colorRole: "trace" }
    ],
    sceneId: "mais-manim-solid-nets-folding",
    timeline: [
      { type: "revealSurface", objectId: "net-layout-surface", duration: 1.4, easing: "smooth" },
      { type: "revealSurface", objectId: "folded-face-surface", duration: 1.4, easing: "smooth" },
      { type: "highlight", conceptId: "net-layout", duration: 1 },
      { type: "highlight", conceptId: "surface-area", duration: 1 },
      { type: "moveAlongPath", objectId: "fold-probe", pathObjectId: "fold-path-curve", duration: 2.9 },
      { type: "highlight", conceptId: "fold-angle", duration: 1 },
      { type: "cameraTo", shotId: "folded-solid", duration: 1.2 },
      { type: "wait", duration: 0.8 }
    ]
  };
}

function crossSectionRadius(state: ThreeDStateSummary) {
  return clampValue(0.78 + state.value / 18, 1.02, 1.42);
}

function crossSectionHeight(state: ThreeDStateSummary) {
  return clampValue(1.55 + state.depthValue / 3.8, 1.88, 2.42);
}

function crossSectionTilt(state: ThreeDStateSummary) {
  return clampValue((state.comparison - 6) / 7, -0.22, 0.34);
}

function formulaForCrossSectionSlicer(state: ThreeDStateSummary) {
  const radius = crossSectionRadius(state);
  const sliceHeight = crossSectionHeight(state) * 0.52;

  return `$A_{slice}=\\pi r^2;\\ h=${formatCoefficient(sliceHeight)};\\ r=${formatCoefficient(radius)}$`;
}

export function buildCrossSectionSlicerMathSceneSpec({
  state
}: {
  accent: string;
  state: ThreeDStateSummary;
}): MathSceneSpec {
  const coordinateSpace = {
    mathRange: {
      x: [-3, 3] as [number, number],
      y: [-0.6, 3.4] as [number, number],
      z: [-2, 2] as [number, number]
    },
    worldRange: {
      x: [-2.35, 2.35] as [number, number],
      y: [0.12, 2.25] as [number, number],
      z: [-0.65, 0.65] as [number, number]
    }
  };
  const coordinateSystem = createCoordinateSystem3D(coordinateSpace);
  const radius = crossSectionRadius(state);
  const height = crossSectionHeight(state);
  const tilt = crossSectionTilt(state);
  const activeMode = normalizeFunctionMode(state.mode);
  const sliceHeight = height * (0.42 + activeMode * 0.08);
  const radiusAtHeight = (y: number) => {
    if (activeMode === 1) return radius * (1 - y / height * 0.28);
    if (activeMode === 2) return radius * (0.68 + y / height * 0.3);
    return radius;
  };
  const sliceRadius = radiusAtHeight(sliceHeight);
  const solidSurface = buildParametricSurfaceObject({
    colorRole: "surface",
    conceptId: "solid-model",
    coordinateSystem,
    id: "solid-surface",
    uRange: [0, height],
    uSegments: 5,
    vRange: [0, Math.PI * 2],
    vSegments: 7,
    valueAt: (y, angle): Vec3 => {
      const localRadius = radiusAtHeight(y);
      return [Math.cos(angle) * localRadius, y, Math.sin(angle) * localRadius];
    }
  });
  const slicingPlaneSurface = buildParametricSurfaceObject({
    colorRole: "probe",
    conceptId: "slicing-plane",
    coordinateSystem,
    id: "slicing-plane-surface",
    uRange: [-radius * 1.08, radius * 1.08],
    uSegments: 3,
    vRange: [-radius * 0.92, radius * 0.92],
    vSegments: 3,
    valueAt: (x, z): Vec3 => [x, sliceHeight + tilt * x, z]
  });
  const crossSectionCurve = buildParametricCurveObject({
    colorRole: "function",
    conceptId: "section-area",
    coordinateSystem,
    displaySampleCount: 64,
    id: "cross-section-curve",
    sampleCount: 96,
    tRange: [0, 1],
    valueAt: (t): Vec3 => {
      const angle = t * Math.PI * 2;
      const x = Math.cos(angle) * sliceRadius;
      const z = Math.sin(angle) * sliceRadius * (1 - Math.abs(tilt) * 0.22);
      return [x, sliceHeight + tilt * x, z];
    }
  });
  const scanPathCurve = buildParametricCurveObject({
    colorRole: "trace",
    conceptId: "scan-height",
    coordinateSystem,
    displaySampleCount: 48,
    id: "scan-path-curve",
    sampleCount: 72,
    tRange: [0, 1],
    valueAt: (t): Vec3 => [
      radius * 1.2,
      height * t,
      -radius * 0.72 + Math.sin(t * Math.PI) * 0.24
    ]
  });

  return {
    bindings: [
      { conceptId: "solid-model", formulaId: "cross-section-formula", objectId: "solid-surface", tokenId: "solid-token" },
      { conceptId: "slicing-plane", formulaId: "cross-section-formula", objectId: "slicing-plane-surface", tokenId: "slice-token" },
      { conceptId: "section-area", formulaId: "cross-section-formula", objectId: "cross-section-curve", tokenId: "area-token" },
      { conceptId: "scan-height", formulaId: "cross-section-formula", objectId: "slice-area-vector", tokenId: "height-token" }
    ],
    cameraShots: [
      { id: "overview", fov: 48, position: [3.35, 2.75, 4.15], target: [0, 1.02, 0] },
      { id: "plane-detail", fov: 43, position: [2.25, 2.1, 2.65], target: [0.1, sliceHeight, 0.04] },
      { id: "area-profile", fov: 42, position: [2.75, 2.35, 3.15], target: [0.28, sliceHeight + 0.12, 0.1] }
    ],
    coordinateSpace,
    diagnostics: {
      expectedBindingCount: 4,
      expectedObjectCount: 8,
      expectedTokenCount: 4
    },
    familyId: "three-cross-section-slicer",
    formulas: [
      {
        id: "cross-section-formula",
        latex: formulaForCrossSectionSlicer(state),
        tokens: [
          { conceptId: "solid-model", id: "solid-token", text: "solid" },
          { conceptId: "slicing-plane", id: "slice-token", text: "slice" },
          { conceptId: "section-area", id: "area-token", text: "A" },
          { conceptId: "scan-height", id: "height-token", text: "h" }
        ]
      }
    ],
    objects: [
      { type: "axis3d", id: "axes", range: coordinateSpace.mathRange, conceptId: "coordinate-frame" },
      {
        type: "parametricSurface",
        id: "solid-surface",
        samples: solidSurface.worldSamples,
        uRange: [0, height],
        vRange: [0, Math.PI * 2],
        colorRole: "surface",
        conceptId: "solid-model"
      },
      {
        type: "parametricSurface",
        id: "slicing-plane-surface",
        samples: slicingPlaneSurface.worldSamples,
        uRange: [-radius * 1.08, radius * 1.08],
        vRange: [-radius * 0.92, radius * 0.92],
        colorRole: "probe",
        conceptId: "slicing-plane"
      },
      { type: "parametricCurve", id: "cross-section-curve", samples: crossSectionCurve.worldSamples, colorRole: "function", conceptId: "section-area" },
      { type: "parametricCurve", id: "scan-path-curve", samples: scanPathCurve.worldSamples, colorRole: "trace", conceptId: "scan-height" },
      {
        type: "vector",
        id: "slice-area-vector",
        from: coordinateSystem.c2p(0, sliceHeight, 0),
        to: coordinateSystem.c2p(sliceRadius, sliceHeight + tilt * sliceRadius, 0),
        colorRole: "probe",
        conceptId: "scan-height"
      },
      { type: "movingPoint", id: "slice-probe", pathObjectId: "scan-path-curve", colorRole: "probe", conceptId: "scan-height" },
      { type: "trace", id: "slice-trace", sourceObjectId: "slice-probe", durationSeconds: 1.35, colorRole: "trace" }
    ],
    sceneId: "mais-manim-cross-section-slicer",
    timeline: [
      { type: "revealCurve", objectId: "cross-section-curve", duration: 1.6, easing: "smooth" },
      { type: "revealCurve", objectId: "scan-path-curve", duration: 1.4, easing: "smooth" },
      { type: "highlight", conceptId: "solid-model", duration: 1 },
      { type: "highlight", conceptId: "slicing-plane", duration: 1 },
      { type: "moveAlongPath", objectId: "slice-probe", pathObjectId: "scan-path-curve", duration: 2.8 },
      { type: "highlight", conceptId: "section-area", duration: 1 },
      { type: "cameraTo", shotId: "area-profile", duration: 1.2 },
      { type: "wait", duration: 0.8 }
    ]
  };
}

function crosswalkAlignment(state: ThreeDStateSummary) {
  return clampValue(0.55 + state.value / 18, 0.72, 1.08);
}

function crosswalkGap(state: ThreeDStateSummary) {
  return clampValue((state.comparison - 6) / 6, -0.18, 0.32);
}

function formulaForCurriculumCrosswalk(state: ThreeDStateSummary) {
  const alignment = crosswalkAlignment(state);
  const gap = crosswalkGap(state);

  return `$M:(HK,ML,CA)\\to topic;\\ bridge=t+\\Delta;\\ align=${formatCoefficient(alignment)};\\ gap=${formatCoefficient(gap)}$`;
}

export function buildCurriculumCrosswalkMapMathSceneSpec({
  state
}: {
  accent: string;
  state: ThreeDStateSummary;
}): MathSceneSpec {
  const coordinateSpace = {
    mathRange: {
      x: [-3, 3] as [number, number],
      y: [-0.6, 3.4] as [number, number],
      z: [-2, 2] as [number, number]
    },
    worldRange: {
      x: [-2.35, 2.35] as [number, number],
      y: [0.12, 2.25] as [number, number],
      z: [-0.65, 0.65] as [number, number]
    }
  };
  const alignment = crosswalkAlignment(state);
  const gap = crosswalkGap(state);
  const coordinateSystem = createCoordinateSystem3D(coordinateSpace);
  const curriculumMapSurface = buildParametricSurfaceObject({
    colorRole: "surface",
    conceptId: "curriculum-map",
    coordinateSystem,
    id: "curriculum-map-surface",
    uRange: [-2.2, 2.2],
    uSegments: 4,
    vRange: [-1.25, 1.25],
    vSegments: 5,
    valueAt: (x, z): Vec3 => [
      x,
      0.36 + Math.cos((x + 0.3) * 1.1) * 0.08 + Math.sin((z + state.mode * 0.2) * 2) * 0.06 + alignment * 0.28,
      z
    ]
  });
  const hongKongTopicPath = buildParametricCurveObject({
    colorRole: "trace",
    conceptId: "curriculum-map",
    coordinateSystem,
    displaySampleCount: 52,
    id: "hong-kong-topic-path",
    sampleCount: 72,
    tRange: [0, 1],
    valueAt: (t): Vec3 => [-2.3 + t * 4.6, 0.72 + Math.sin(t * Math.PI * 2) * 0.12, -0.72]
  });
  const mainlandTopicPath = buildParametricCurveObject({
    colorRole: "function",
    conceptId: "prerequisite-chain",
    coordinateSystem,
    displaySampleCount: 52,
    id: "mainland-topic-path",
    sampleCount: 72,
    tRange: [0, 1],
    valueAt: (t): Vec3 => [-2.15 + t * 4.3, 1.04 + Math.cos(t * Math.PI * 2 + 0.4) * 0.1 + gap, 0]
  });
  const topicBridgePath = buildParametricCurveObject({
    colorRole: "probe",
    conceptId: "topic-bridge",
    coordinateSystem,
    displaySampleCount: 60,
    id: "topic-bridge-path",
    sampleCount: 84,
    tRange: [0, 1],
    valueAt: (t): Vec3 => {
      const x = -1.7 + t * 3.4;
      return [x, 1.2 + Math.sin(t * Math.PI) * alignment * 0.68, -0.72 + t * 1.34];
    }
  });

  return {
    bindings: [
      { conceptId: "curriculum-map", formulaId: "crosswalk-formula", objectId: "curriculum-map-surface", tokenId: "map-token" },
      { conceptId: "topic-bridge", formulaId: "crosswalk-formula", objectId: "topic-bridge-path", tokenId: "bridge-token" },
      { conceptId: "prerequisite-chain", formulaId: "crosswalk-formula", objectId: "mainland-topic-path", tokenId: "prerequisite-token" },
      { conceptId: "readiness-gap", formulaId: "crosswalk-formula", objectId: "gap-vector", tokenId: "gap-token" }
    ],
    cameraShots: [
      { id: "overview", fov: 48, position: [3.35, 2.75, 4.15], target: [0, 1.02, 0] },
      { id: "bridge-detail", fov: 43, position: [2.25, 2.05, 2.65], target: [0.08, 1.2, 0] },
      { id: "gap-transfer", fov: 42, position: [2.7, 2.35, 3.15], target: [0.28, 1.18, 0.18] }
    ],
    coordinateSpace,
    diagnostics: {
      expectedBindingCount: 4,
      expectedObjectCount: 8,
      expectedTokenCount: 4
    },
    familyId: "three-curriculum-crosswalk-map",
    formulas: [
      {
        id: "crosswalk-formula",
        latex: formulaForCurriculumCrosswalk(state),
        tokens: [
          { conceptId: "curriculum-map", id: "map-token", text: "map" },
          { conceptId: "topic-bridge", id: "bridge-token", text: "bridge" },
          { conceptId: "prerequisite-chain", id: "prerequisite-token", text: "pre-req" },
          { conceptId: "readiness-gap", id: "gap-token", text: "gap" }
        ]
      }
    ],
    objects: [
      { type: "axis3d", id: "axes", range: coordinateSpace.mathRange, conceptId: "coordinate-frame" },
      {
        type: "parametricSurface",
        id: "curriculum-map-surface",
        samples: curriculumMapSurface.worldSamples,
        uRange: [-2.2, 2.2],
        vRange: [-1.25, 1.25],
        colorRole: "surface",
        conceptId: "curriculum-map"
      },
      { type: "parametricCurve", id: "hong-kong-topic-path", samples: hongKongTopicPath.worldSamples, colorRole: "trace", conceptId: "curriculum-map" },
      { type: "parametricCurve", id: "mainland-topic-path", samples: mainlandTopicPath.worldSamples, colorRole: "function", conceptId: "prerequisite-chain" },
      { type: "parametricCurve", id: "topic-bridge-path", samples: topicBridgePath.worldSamples, colorRole: "probe", conceptId: "topic-bridge" },
      {
        type: "vector",
        id: "gap-vector",
        from: coordinateSystem.c2p(0.62, 0.82, -0.64),
        to: coordinateSystem.c2p(0.62 + gap * 1.8, 1.52 + alignment * 0.28, 0.54),
        colorRole: "probe",
        conceptId: "readiness-gap"
      },
      { type: "movingPoint", id: "transfer-probe", pathObjectId: "topic-bridge-path", colorRole: "probe", conceptId: "topic-bridge" },
      { type: "trace", id: "transfer-trace", sourceObjectId: "transfer-probe", durationSeconds: 1.35, colorRole: "trace" }
    ],
    sceneId: "mais-manim-curriculum-crosswalk-map",
    timeline: [
      { type: "revealSurface", objectId: "curriculum-map-surface", duration: 1.8, easing: "smooth" },
      { type: "revealCurve", objectId: "hong-kong-topic-path", duration: 1.4, easing: "smooth" },
      { type: "revealCurve", objectId: "mainland-topic-path", duration: 1.4, easing: "smooth" },
      { type: "revealCurve", objectId: "topic-bridge-path", duration: 1.7, easing: "smooth" },
      { type: "moveAlongPath", objectId: "transfer-probe", pathObjectId: "topic-bridge-path", duration: 2.9 },
      { type: "highlight", conceptId: "readiness-gap", duration: 1 },
      { type: "cameraTo", shotId: "gap-transfer", duration: 1.2 },
      { type: "wait", duration: 0.8 }
    ]
  };
}

function examStrategyScoreLift(state: ThreeDStateSummary) {
  return clampValue(0.48 + state.value / 18, 0.68, 1.12);
}

function examStrategyRisk(state: ThreeDStateSummary) {
  return clampValue((8 - state.comparison) / 8, -0.12, 0.48);
}

function formulaForExamStrategyCapstone(state: ThreeDStateSummary) {
  const scoreLift = examStrategyScoreLift(state);
  const risk = examStrategyRisk(state);

  return `$Score=concept\\times accuracy\\times time;\\ T_i\\propto marks_i;\\ risk=${formatCoefficient(risk)};\\ lift=${formatCoefficient(scoreLift)}$`;
}

export function buildExamStrategyCapstoneMathSceneSpec({
  state
}: {
  accent: string;
  state: ThreeDStateSummary;
}): MathSceneSpec {
  const coordinateSpace = {
    mathRange: {
      x: [-3, 3] as [number, number],
      y: [-0.6, 3.6] as [number, number],
      z: [-2, 2] as [number, number]
    },
    worldRange: {
      x: [-2.35, 2.35] as [number, number],
      y: [0.12, 2.25] as [number, number],
      z: [-0.65, 0.65] as [number, number]
    }
  };
  const scoreLift = examStrategyScoreLift(state);
  const risk = examStrategyRisk(state);
  const coordinateSystem = createCoordinateSystem3D(coordinateSpace);
  const strategySurface = buildParametricSurfaceObject({
    colorRole: "surface",
    conceptId: "score-model",
    coordinateSystem,
    id: "strategy-landscape-surface",
    uRange: [-2.2, 2.2],
    uSegments: 5,
    vRange: [-1.25, 1.25],
    vSegments: 5,
    valueAt: (concept, time): Vec3 => [
      concept,
      0.48 + scoreLift * Math.exp(-((concept - 0.4) * (concept - 0.4) + (time - 0.15) * (time - 0.15)) / 2.6) - risk * 0.24,
      time
    ]
  });
  const timeAllocationPath = buildParametricCurveObject({
    colorRole: "probe",
    conceptId: "time-allocation",
    coordinateSystem,
    displaySampleCount: 60,
    id: "time-allocation-path",
    sampleCount: 84,
    tRange: [0, 1],
    valueAt: (t): Vec3 => {
      const x = -2.2 + t * 4.4;
      const z = -0.95 + Math.sin(t * Math.PI) * 1.58;
      return [x, 0.82 + Math.sin(t * Math.PI * 2) * 0.1 + t * scoreLift * 0.36, z];
    }
  });
  const strategyFrontierPath = buildParametricCurveObject({
    colorRole: "function",
    conceptId: "strategy-frontier",
    coordinateSystem,
    displaySampleCount: 64,
    id: "strategy-frontier-path",
    sampleCount: 92,
    tRange: [0, 1],
    valueAt: (t): Vec3 => {
      const x = -2.15 + t * 4.3;
      return [x, 1.42 + Math.sin(t * Math.PI) * scoreLift * 0.72, 0.62 - t * 0.78];
    }
  });

  return {
    bindings: [
      { conceptId: "score-model", formulaId: "exam-strategy-formula", objectId: "score-vector", tokenId: "score-token" },
      { conceptId: "time-allocation", formulaId: "exam-strategy-formula", objectId: "time-allocation-path", tokenId: "time-token" },
      { conceptId: "risk-control", formulaId: "exam-strategy-formula", objectId: "risk-vector", tokenId: "risk-token" },
      { conceptId: "strategy-frontier", formulaId: "exam-strategy-formula", objectId: "strategy-frontier-path", tokenId: "frontier-token" }
    ],
    cameraShots: [
      { id: "overview", fov: 48, position: [3.35, 2.75, 4.15], target: [0.05, 1.12, 0] },
      { id: "time-plan", fov: 43, position: [2.25, 2.05, 2.65], target: [0.08, 1.2, -0.05] },
      { id: "score-risk", fov: 42, position: [2.7, 2.35, 3.15], target: [0.32, 1.38, 0.12] }
    ],
    coordinateSpace,
    diagnostics: {
      expectedBindingCount: 4,
      expectedObjectCount: 8,
      expectedTokenCount: 4
    },
    familyId: "three-exam-strategy-capstone",
    formulas: [
      {
        id: "exam-strategy-formula",
        latex: formulaForExamStrategyCapstone(state),
        tokens: [
          { conceptId: "score-model", id: "score-token", text: "score" },
          { conceptId: "time-allocation", id: "time-token", text: "time" },
          { conceptId: "risk-control", id: "risk-token", text: "risk" },
          { conceptId: "strategy-frontier", id: "frontier-token", text: "frontier" }
        ]
      }
    ],
    objects: [
      { type: "axis3d", id: "axes", range: coordinateSpace.mathRange, conceptId: "coordinate-frame" },
      {
        type: "parametricSurface",
        id: "strategy-landscape-surface",
        samples: strategySurface.worldSamples,
        uRange: [-2.2, 2.2],
        vRange: [-1.25, 1.25],
        colorRole: "surface",
        conceptId: "score-model"
      },
      { type: "parametricCurve", id: "time-allocation-path", samples: timeAllocationPath.worldSamples, colorRole: "probe", conceptId: "time-allocation" },
      { type: "parametricCurve", id: "strategy-frontier-path", samples: strategyFrontierPath.worldSamples, colorRole: "function", conceptId: "strategy-frontier" },
      {
        type: "vector",
        id: "score-vector",
        from: coordinateSystem.c2p(-0.55, 0.58, -0.45),
        to: coordinateSystem.c2p(0.72, 1.58 + scoreLift * 0.42, 0.22),
        colorRole: "probe",
        conceptId: "score-model"
      },
      {
        type: "vector",
        id: "risk-vector",
        from: coordinateSystem.c2p(0.82, 0.72, 0.62),
        to: coordinateSystem.c2p(0.82 - risk * 1.4, 1.12, -0.58),
        colorRole: "trace",
        conceptId: "risk-control"
      },
      { type: "movingPoint", id: "strategy-probe", pathObjectId: "time-allocation-path", colorRole: "probe", conceptId: "time-allocation" },
      { type: "trace", id: "strategy-trace", sourceObjectId: "strategy-probe", durationSeconds: 1.35, colorRole: "trace" }
    ],
    sceneId: "mais-manim-exam-strategy-capstone",
    timeline: [
      { type: "revealSurface", objectId: "strategy-landscape-surface", duration: 1.8, easing: "smooth" },
      { type: "revealCurve", objectId: "time-allocation-path", duration: 1.6, easing: "smooth" },
      { type: "revealCurve", objectId: "strategy-frontier-path", duration: 1.6, easing: "smooth" },
      { type: "moveAlongPath", objectId: "strategy-probe", pathObjectId: "time-allocation-path", duration: 2.8 },
      { type: "highlight", conceptId: "score-model", duration: 1 },
      { type: "highlight", conceptId: "risk-control", duration: 1 },
      { type: "cameraTo", shotId: "score-risk", duration: 1.2 },
      { type: "wait", duration: 0.8 }
    ]
  };
}

function numberLinePoint(state: ThreeDStateSummary) {
  return clampValue(state.value, 0.4, 8.8);
}

function numberLineComparisonPoint(state: ThreeDStateSummary) {
  return clampValue(state.comparison, 0.2, 8.6);
}

function formulaForNumberLine(state: ThreeDStateSummary) {
  const point = numberLinePoint(state);
  const comparison = numberLineComparisonPoint(state);
  const distance = Math.abs(point - comparison);

  return `$x=${formatCoefficient(point)};\\ y=${formatCoefficient(comparison)};\\ |x-y|=${formatCoefficient(distance)};\\ unit=1$`;
}

export function buildNumberLineMathSceneSpec({
  state
}: {
  accent: string;
  state: ThreeDStateSummary;
}): MathSceneSpec {
  const coordinateSpace = {
    mathRange: {
      x: [-0.5, 9.5] as [number, number],
      y: [-0.6, 2.1] as [number, number],
      z: [-1, 1] as [number, number]
    },
    worldRange: {
      x: [-2.35, 2.35] as [number, number],
      y: [0.12, 1.92] as [number, number],
      z: [-0.45, 0.45] as [number, number]
    }
  };
  const point = numberLinePoint(state);
  const comparison = numberLineComparisonPoint(state);
  const direction = point >= comparison ? 1 : -1;
  const coordinateSystem = createCoordinateSystem3D(coordinateSpace);
  const numberRail = buildParametricCurveObject({
    colorRole: "function",
    conceptId: "unit-interval",
    coordinateSystem,
    displaySampleCount: 64,
    id: "number-rail",
    sampleCount: 96,
    tRange: [0, 1],
    valueAt: (t): Vec3 => [t * 9, 0, 0]
  });
  const unitHopPath = buildParametricCurveObject({
    colorRole: "trace",
    conceptId: "unit-interval",
    coordinateSystem,
    displaySampleCount: 54,
    id: "unit-hop-path",
    sampleCount: 72,
    tRange: [0, 1],
    valueAt: (t): Vec3 => {
      const unit = Math.floor(t * 9);
      const local = t * 9 - unit;
      return [unit + local, 0.12 + Math.sin(local * Math.PI) * 0.08, -0.18];
    }
  });
  const numberJumpPath = buildParametricCurveObject({
    colorRole: "probe",
    conceptId: "comparison-distance",
    coordinateSystem,
    displaySampleCount: 48,
    id: "number-jump-path",
    sampleCount: 72,
    tRange: [0, 1],
    valueAt: (t): Vec3 => {
      const x = comparison + (point - comparison) * t;
      return [x, 0.28 + Math.sin(t * Math.PI) * 0.34, 0.18];
    }
  });

  return {
    bindings: [
      { conceptId: "unit-interval", formulaId: "number-line-formula", objectId: "number-rail", tokenId: "unit-token" },
      { conceptId: "value-point", formulaId: "number-line-formula", objectId: "number-probe", tokenId: "point-token" },
      { conceptId: "step-size", formulaId: "number-line-formula", objectId: "step-vector", tokenId: "step-token" },
      { conceptId: "comparison-distance", formulaId: "number-line-formula", objectId: "number-jump-path", tokenId: "distance-token" }
    ],
    cameraShots: [
      { id: "overview", fov: 47, position: [2.9, 2.25, 3.55], target: [0, 0.72, 0] },
      { id: "point-detail", fov: 41, position: [1.85, 1.85, 2.35], target: [0.2, 0.82, 0.05] }
    ],
    coordinateSpace,
    diagnostics: {
      expectedBindingCount: 4,
      expectedObjectCount: 7,
      expectedTokenCount: 4
    },
    familyId: "three-number-line",
    formulas: [
      {
        id: "number-line-formula",
        latex: formulaForNumberLine(state),
        tokens: [
          { conceptId: "unit-interval", id: "unit-token", text: "unit" },
          { conceptId: "value-point", id: "point-token", text: "x" },
          { conceptId: "step-size", id: "step-token", text: "step" },
          { conceptId: "comparison-distance", id: "distance-token", text: "|x-y|" }
        ]
      }
    ],
    objects: [
      { type: "axis3d", id: "axes", range: coordinateSpace.mathRange, conceptId: "coordinate-frame" },
      { type: "parametricCurve", id: "number-rail", samples: numberRail.worldSamples, colorRole: "function", conceptId: "unit-interval" },
      { type: "parametricCurve", id: "unit-hop-path", samples: unitHopPath.worldSamples, colorRole: "trace", conceptId: "unit-interval" },
      { type: "parametricCurve", id: "number-jump-path", samples: numberJumpPath.worldSamples, colorRole: "probe", conceptId: "comparison-distance" },
      {
        type: "vector",
        id: "step-vector",
        from: coordinateSystem.c2p(comparison, 0.18, -0.1),
        to: coordinateSystem.c2p(comparison + direction, 0.18, -0.1),
        colorRole: "trace",
        conceptId: "step-size"
      },
      { type: "movingPoint", id: "number-probe", pathObjectId: "number-rail", colorRole: "probe", conceptId: "value-point" },
      { type: "trace", id: "number-probe-trace", sourceObjectId: "number-probe", durationSeconds: 1.15, colorRole: "trace" }
    ],
    sceneId: "mais-manim-number-line",
    timeline: [
      { type: "revealCurve", objectId: "number-rail", duration: 1.2, easing: "smooth" },
      { type: "revealCurve", objectId: "unit-hop-path", duration: 1.1, easing: "smooth" },
      { type: "revealCurve", objectId: "number-jump-path", duration: 1.4, easing: "smooth" },
      { type: "moveAlongPath", objectId: "number-probe", pathObjectId: "number-rail", duration: 2.4 },
      { type: "highlight", conceptId: "comparison-distance", duration: 1 },
      { type: "cameraTo", shotId: "point-detail", duration: 1.1 },
      { type: "wait", duration: 0.8 }
    ]
  };
}

function measurementUnits(state: ThreeDStateSummary) {
  return clampValue(state.value, 1, 8.8);
}

function measurementUnitScale(state: ThreeDStateSummary) {
  return clampValue(0.75 + state.comparison / 12, 0.88, 1.48);
}

function formulaForMeasurementScale(state: ThreeDStateSummary) {
  const units = measurementUnits(state);
  const unitScale = measurementUnitScale(state);
  const measured = units * unitScale;

  return `$L=n\\cdot u;\\ n=${formatCoefficient(units)};\\ u=${formatCoefficient(unitScale)};\\ L=${formatCoefficient(measured)}$`;
}

export function buildMeasurementScaleMathSceneSpec({
  state
}: {
  accent: string;
  state: ThreeDStateSummary;
}): MathSceneSpec {
  const coordinateSpace = {
    mathRange: {
      x: [-0.5, 9.5] as [number, number],
      y: [-0.6, 2.2] as [number, number],
      z: [-1, 1] as [number, number]
    },
    worldRange: {
      x: [-2.35, 2.35] as [number, number],
      y: [0.12, 1.96] as [number, number],
      z: [-0.45, 0.45] as [number, number]
    }
  };
  const units = measurementUnits(state);
  const unitScale = measurementUnitScale(state);
  const coordinateSystem = createCoordinateSystem3D(coordinateSpace);
  const scaleRail = buildParametricCurveObject({
    colorRole: "function",
    conceptId: "unit-model",
    coordinateSystem,
    displaySampleCount: 64,
    id: "scale-rail",
    sampleCount: 96,
    tRange: [0, 1],
    valueAt: (t): Vec3 => [t * 9, 0, 0]
  });
  const scaleTickPath = buildParametricCurveObject({
    colorRole: "trace",
    conceptId: "unit-count",
    coordinateSystem,
    displaySampleCount: 54,
    id: "scale-tick-path",
    sampleCount: 72,
    tRange: [0, 1],
    valueAt: (t): Vec3 => {
      const unit = Math.floor(t * 9);
      const local = t * 9 - unit;
      return [unit + local, 0.16 + Math.sin(local * Math.PI) * 0.1, -0.16];
    }
  });
  const measurementSweepPath = buildParametricCurveObject({
    colorRole: "probe",
    conceptId: "measurement-probe",
    coordinateSystem,
    displaySampleCount: 48,
    id: "measurement-sweep-path",
    sampleCount: 72,
    tRange: [0, 1],
    valueAt: (t): Vec3 => [
      units * t,
      0.48 + Math.sin(t * Math.PI) * 0.18,
      0.2 + Math.sin(t * Math.PI * 2) * 0.04
    ]
  });

  return {
    bindings: [
      { conceptId: "unit-model", formulaId: "measurement-formula", objectId: "scale-rail", tokenId: "unit-token" },
      { conceptId: "measured-length", formulaId: "measurement-formula", objectId: "measurement-vector", tokenId: "measure-token" },
      { conceptId: "unit-count", formulaId: "measurement-formula", objectId: "scale-tick-path", tokenId: "count-token" },
      { conceptId: "measurement-probe", formulaId: "measurement-formula", objectId: "measure-probe", tokenId: "probe-token" }
    ],
    cameraShots: [
      { id: "overview", fov: 47, position: [2.9, 2.25, 3.55], target: [0, 0.76, 0] },
      { id: "measure-detail", fov: 41, position: [1.9, 1.85, 2.4], target: [0.24, 0.88, 0.06] }
    ],
    coordinateSpace,
    diagnostics: {
      expectedBindingCount: 4,
      expectedObjectCount: 7,
      expectedTokenCount: 4
    },
    familyId: "three-measurement-scale",
    formulas: [
      {
        id: "measurement-formula",
        latex: formulaForMeasurementScale(state),
        tokens: [
          { conceptId: "unit-model", id: "unit-token", text: "unit" },
          { conceptId: "measured-length", id: "measure-token", text: "L" },
          { conceptId: "unit-count", id: "count-token", text: "n" },
          { conceptId: "measurement-probe", id: "probe-token", text: "measure" }
        ]
      }
    ],
    objects: [
      { type: "axis3d", id: "axes", range: coordinateSpace.mathRange, conceptId: "coordinate-frame" },
      { type: "parametricCurve", id: "scale-rail", samples: scaleRail.worldSamples, colorRole: "function", conceptId: "unit-model" },
      { type: "parametricCurve", id: "scale-tick-path", samples: scaleTickPath.worldSamples, colorRole: "trace", conceptId: "unit-count" },
      { type: "parametricCurve", id: "measurement-sweep-path", samples: measurementSweepPath.worldSamples, colorRole: "probe", conceptId: "measurement-probe" },
      {
        type: "vector",
        id: "measurement-vector",
        from: coordinateSystem.c2p(0, 0.3, 0.1),
        to: coordinateSystem.c2p(units, 0.3 + (unitScale - 1) * 0.16, 0.1),
        colorRole: "probe",
        conceptId: "measured-length"
      },
      { type: "movingPoint", id: "measure-probe", pathObjectId: "measurement-sweep-path", colorRole: "probe", conceptId: "measurement-probe" },
      { type: "trace", id: "measure-trace", sourceObjectId: "measure-probe", durationSeconds: 1.15, colorRole: "trace" }
    ],
    sceneId: "mais-manim-measurement-scale",
    timeline: [
      { type: "revealCurve", objectId: "scale-rail", duration: 1.2, easing: "smooth" },
      { type: "revealCurve", objectId: "scale-tick-path", duration: 1.1, easing: "smooth" },
      { type: "revealCurve", objectId: "measurement-sweep-path", duration: 1.4, easing: "smooth" },
      { type: "highlight", conceptId: "measured-length", duration: 1 },
      { type: "moveAlongPath", objectId: "measure-probe", pathObjectId: "measurement-sweep-path", duration: 2.4 },
      { type: "cameraTo", shotId: "measure-detail", duration: 1.1 },
      { type: "wait", duration: 0.8 }
    ]
  };
}

function standardCoordinateSpace(): MathSceneSpec["coordinateSpace"] {
  return {
    mathRange: {
      x: [-3, 3] as [number, number],
      y: [-0.8, 3.2] as [number, number],
      z: [-2, 2] as [number, number]
    },
    worldRange: {
      x: [-2.35, 2.35] as [number, number],
      y: [0.12, 2.25] as [number, number],
      z: [-0.65, 0.65] as [number, number]
    }
  };
}

function formulaForBaseTenBlocks(state: ThreeDStateSummary) {
  const value = Math.round(state.value * 10);
  return `$${value}=100h+10t+o;\\ place\\ value\\ by\\ regrouping$`;
}

function buildBaseTenBlocksMathSceneSpec({
  state
}: {
  accent: string;
  state: ThreeDStateSummary;
}): MathSceneSpec {
  const coordinateSpace = standardCoordinateSpace();
  const height = clampValue(state.value / 4, 1.1, 2.4);
  const coordinateSystem = createCoordinateSystem3D(coordinateSpace);
  const hundredsStack = buildParametricCurveObject({
    colorRole: "function",
    conceptId: "place-value",
    coordinateSystem,
    displaySampleCount: 48,
    id: "hundreds-stack",
    sampleCount: 72,
    tRange: [0, 1],
    valueAt: (t): Vec3 => [-1.6 + Math.sin(t * Math.PI * 6) * 0.12, 0.22 + t * height, -0.36]
  });
  const tensRail = buildParametricCurveObject({
    colorRole: "trace",
    conceptId: "ten-unit",
    coordinateSystem,
    displaySampleCount: 48,
    id: "tens-rail",
    sampleCount: 72,
    tRange: [0, 1],
    valueAt: (t): Vec3 => [-0.9 + t * 3.2, 0.38 + Math.sin(t * Math.PI) * 0.18, 0.1]
  });
  const onesPath = buildParametricCurveObject({
    colorRole: "probe",
    conceptId: "digit-value",
    coordinateSystem,
    displaySampleCount: 44,
    id: "ones-path",
    sampleCount: 72,
    tRange: [0, 1],
    valueAt: (t): Vec3 => [1.15 + Math.cos(t * Math.PI * 2) * 0.42, 0.58 + Math.sin(t * Math.PI * 2) * 0.28, 0.34]
  });

  return {
    bindings: [
      { conceptId: "place-value", formulaId: "base-ten-formula", objectId: "hundreds-stack", tokenId: "place-token" },
      { conceptId: "digit-value", formulaId: "base-ten-formula", objectId: "value-probe", tokenId: "digit-token" },
      { conceptId: "ten-unit", formulaId: "base-ten-formula", objectId: "tens-rail", tokenId: "ten-token" },
      { conceptId: "regrouping", formulaId: "base-ten-formula", objectId: "regroup-vector", tokenId: "regroup-token" }
    ],
    cameraShots: [
      { id: "overview", fov: 47, position: [3, 2.4, 3.6], target: [0, 0.95, 0] },
      { id: "regroup-detail", fov: 41, position: [2.05, 1.9, 2.5], target: [0.15, 0.92, 0.02] }
    ],
    coordinateSpace,
    diagnostics: { expectedBindingCount: 4, expectedObjectCount: 7, expectedTokenCount: 4 },
    familyId: "three-base-ten-blocks",
    formulas: [
      {
        id: "base-ten-formula",
        latex: formulaForBaseTenBlocks(state),
        tokens: [
          { conceptId: "place-value", id: "place-token", text: "100h" },
          { conceptId: "digit-value", id: "digit-token", text: "digit" },
          { conceptId: "ten-unit", id: "ten-token", text: "10t" },
          { conceptId: "regrouping", id: "regroup-token", text: "regroup" }
        ]
      }
    ],
    objects: [
      { type: "axis3d", id: "axes", range: coordinateSpace.mathRange, conceptId: "coordinate-frame" },
      { type: "parametricCurve", id: "hundreds-stack", samples: hundredsStack.worldSamples, colorRole: "function", conceptId: "place-value" },
      { type: "parametricCurve", id: "tens-rail", samples: tensRail.worldSamples, colorRole: "trace", conceptId: "ten-unit" },
      { type: "parametricCurve", id: "ones-path", samples: onesPath.worldSamples, colorRole: "probe", conceptId: "digit-value" },
      {
        type: "vector",
        id: "regroup-vector",
        from: coordinateSystem.c2p(-0.2, 0.42, -0.2),
        to: coordinateSystem.c2p(0.95, 1.02, 0.26),
        colorRole: "probe",
        conceptId: "regrouping"
      },
      { type: "movingPoint", id: "value-probe", pathObjectId: "tens-rail", colorRole: "probe", conceptId: "digit-value" },
      { type: "trace", id: "value-trace", sourceObjectId: "value-probe", durationSeconds: 1.2, colorRole: "trace" }
    ],
    sceneId: "mais-manim-base-ten-blocks",
    timeline: [
      { type: "revealCurve", objectId: "hundreds-stack", duration: 1.2, easing: "smooth" },
      { type: "revealCurve", objectId: "tens-rail", duration: 1.2, easing: "smooth" },
      { type: "revealCurve", objectId: "ones-path", duration: 1.1, easing: "smooth" },
      { type: "moveAlongPath", objectId: "value-probe", pathObjectId: "tens-rail", duration: 2.3 },
      { type: "highlight", conceptId: "regrouping", duration: 1 },
      { type: "cameraTo", shotId: "regroup-detail", duration: 1.1 },
      { type: "wait", duration: 0.8 }
    ]
  };
}

function formulaForArrayAreaBlocks(state: ThreeDStateSummary) {
  const rows = Math.max(2, Math.round(state.value));
  const columns = Math.max(2, Math.round(state.comparison));
  return `$A=${rows}\\times${columns};\\ rows\\cdot columns=area$`;
}

function buildArrayAreaBlocksMathSceneSpec({
  state
}: {
  accent: string;
  state: ThreeDStateSummary;
}): MathSceneSpec {
  const coordinateSpace = standardCoordinateSpace();
  const rows = clampValue(Math.round(state.value), 2, 8);
  const columns = clampValue(Math.round(state.comparison), 2, 8);
  const coordinateSystem = createCoordinateSystem3D(coordinateSpace);
  const arraySurface = buildParametricSurfaceObject({
    colorRole: "surface",
    conceptId: "area-model",
    coordinateSystem,
    id: "array-surface",
    uRange: [-1.6, 1.6],
    vRange: [-0.9, 0.9],
    uSegments: 4,
    vSegments: 3,
    valueAt: (x, z): Vec3 => [x, 0.38 + Math.sin((x + z) * 1.2) * 0.04, z]
  });
  const rowPath = buildParametricCurveObject({
    colorRole: "function",
    conceptId: "row-count",
    coordinateSystem,
    displaySampleCount: 42,
    id: "row-path",
    sampleCount: 72,
    tRange: [0, 1],
    valueAt: (t): Vec3 => [-1.65 + t * 3.3, 0.55, -0.72]
  });
  const columnPath = buildParametricCurveObject({
    colorRole: "trace",
    conceptId: "column-count",
    coordinateSystem,
    displaySampleCount: 42,
    id: "column-path",
    sampleCount: 72,
    tRange: [0, 1],
    valueAt: (t): Vec3 => [-1.35, 0.58 + Math.sin(t * Math.PI) * 0.1, -0.82 + t * 1.64]
  });

  return {
    bindings: [
      { conceptId: "area-model", formulaId: "array-formula", objectId: "array-surface", tokenId: "area-token" },
      { conceptId: "factor-pair", formulaId: "array-formula", objectId: "factor-vector", tokenId: "factor-token" },
      { conceptId: "row-count", formulaId: "array-formula", objectId: "row-path", tokenId: "row-token" },
      { conceptId: "column-count", formulaId: "array-formula", objectId: "column-path", tokenId: "column-token" }
    ],
    cameraShots: [
      { id: "overview", fov: 47, position: [3.1, 2.35, 3.6], target: [0, 0.78, 0] },
      { id: "factor-detail", fov: 41, position: [2.05, 1.85, 2.45], target: [0.1, 0.78, 0] }
    ],
    coordinateSpace,
    diagnostics: { expectedBindingCount: 4, expectedObjectCount: 7, expectedTokenCount: 4 },
    familyId: "three-array-area-blocks",
    formulas: [
      {
        id: "array-formula",
        latex: formulaForArrayAreaBlocks(state),
        tokens: [
          { conceptId: "area-model", id: "area-token", text: "A" },
          { conceptId: "factor-pair", id: "factor-token", text: `${rows}x${columns}` },
          { conceptId: "row-count", id: "row-token", text: "rows" },
          { conceptId: "column-count", id: "column-token", text: "columns" }
        ]
      }
    ],
    objects: [
      { type: "axis3d", id: "axes", range: coordinateSpace.mathRange, conceptId: "coordinate-frame" },
      { type: "parametricSurface", id: "array-surface", samples: arraySurface.worldSamples, uRange: [-1.6, 1.6], vRange: [-0.9, 0.9], colorRole: "surface", conceptId: "area-model" },
      { type: "parametricCurve", id: "row-path", samples: rowPath.worldSamples, colorRole: "function", conceptId: "row-count" },
      { type: "parametricCurve", id: "column-path", samples: columnPath.worldSamples, colorRole: "trace", conceptId: "column-count" },
      {
        type: "vector",
        id: "factor-vector",
        from: coordinateSystem.c2p(-1.6, 0.72, -0.95),
        to: coordinateSystem.c2p(1.6, 1.02, 0.95),
        colorRole: "probe",
        conceptId: "factor-pair"
      },
      { type: "movingPoint", id: "array-probe", pathObjectId: "row-path", colorRole: "probe", conceptId: "area-model" },
      { type: "trace", id: "array-trace", sourceObjectId: "array-probe", durationSeconds: 1.2, colorRole: "trace" }
    ],
    sceneId: "mais-manim-array-area-blocks",
    timeline: [
      { type: "revealSurface", objectId: "array-surface", duration: 1.4, easing: "smooth" },
      { type: "revealCurve", objectId: "row-path", duration: 1.1, easing: "smooth" },
      { type: "revealCurve", objectId: "column-path", duration: 1.1, easing: "smooth" },
      { type: "moveAlongPath", objectId: "array-probe", pathObjectId: "row-path", duration: 2.1 },
      { type: "highlight", conceptId: "factor-pair", duration: 1 },
      { type: "cameraTo", shotId: "factor-detail", duration: 1.1 },
      { type: "wait", duration: 0.8 }
    ]
  };
}

function formulaForFractionSlices(state: ThreeDStateSummary) {
  const denominator = Math.max(2, Math.round(state.comparison));
  const numerator = clampValue(Math.round(state.value), 1, denominator);
  return `$\\frac{${numerator}}{${denominator}}=part\\div whole$`;
}

function buildFractionSlicesMathSceneSpec({
  state
}: {
  accent: string;
  state: ThreeDStateSummary;
}): MathSceneSpec {
  const coordinateSpace = standardCoordinateSpace();
  const denominator = Math.max(2, Math.round(state.comparison));
  const numerator = clampValue(Math.round(state.value), 1, denominator);
  const angle = (numerator / denominator) * Math.PI * 2;
  const coordinateSystem = createCoordinateSystem3D(coordinateSpace);
  const fractionCircle = buildParametricCurveObject({
    colorRole: "function",
    conceptId: "whole",
    coordinateSystem,
    displaySampleCount: 64,
    id: "fraction-circle",
    sampleCount: 96,
    tRange: [0, 1],
    valueAt: (t): Vec3 => [Math.cos(t * Math.PI * 2) * 1.15, 0.72 + Math.sin(t * Math.PI * 2) * 0.52, -0.15]
  });
  const slicePath = buildParametricCurveObject({
    colorRole: "probe",
    conceptId: "part",
    coordinateSystem,
    displaySampleCount: 42,
    id: "slice-path",
    sampleCount: 72,
    tRange: [0, 1],
    valueAt: (t): Vec3 => [Math.cos(t * angle) * 1.15, 0.72 + Math.sin(t * angle) * 0.52, 0.22]
  });
  const sliceBoundary = buildParametricCurveObject({
    colorRole: "trace",
    conceptId: "denominator",
    coordinateSystem,
    displaySampleCount: 32,
    id: "slice-boundary",
    sampleCount: 48,
    tRange: [0, 1],
    valueAt: (t): Vec3 => [Math.cos(angle) * 1.15 * t, 0.72 + Math.sin(angle) * 0.52 * t, 0.22]
  });

  return {
    bindings: [
      { conceptId: "whole", formulaId: "fraction-formula", objectId: "fraction-circle", tokenId: "whole-token" },
      { conceptId: "part", formulaId: "fraction-formula", objectId: "slice-probe", tokenId: "part-token" },
      { conceptId: "denominator", formulaId: "fraction-formula", objectId: "slice-boundary", tokenId: "denominator-token" },
      { conceptId: "unit-fraction", formulaId: "fraction-formula", objectId: "unit-radius", tokenId: "unit-token" }
    ],
    cameraShots: [
      { id: "overview", fov: 47, position: [3, 2.35, 3.6], target: [0, 0.82, 0] },
      { id: "slice-detail", fov: 41, position: [2, 1.8, 2.45], target: [0.25, 0.82, 0.08] }
    ],
    coordinateSpace,
    diagnostics: { expectedBindingCount: 4, expectedObjectCount: 7, expectedTokenCount: 4 },
    familyId: "three-fraction-slices",
    formulas: [
      {
        id: "fraction-formula",
        latex: formulaForFractionSlices(state),
        tokens: [
          { conceptId: "whole", id: "whole-token", text: "whole" },
          { conceptId: "part", id: "part-token", text: "part" },
          { conceptId: "denominator", id: "denominator-token", text: "denominator" },
          { conceptId: "unit-fraction", id: "unit-token", text: "unit" }
        ]
      }
    ],
    objects: [
      { type: "axis3d", id: "axes", range: coordinateSpace.mathRange, conceptId: "coordinate-frame" },
      { type: "parametricCurve", id: "fraction-circle", samples: fractionCircle.worldSamples, colorRole: "function", conceptId: "whole" },
      { type: "parametricCurve", id: "slice-boundary", samples: sliceBoundary.worldSamples, colorRole: "trace", conceptId: "denominator" },
      { type: "parametricCurve", id: "slice-path", samples: slicePath.worldSamples, colorRole: "probe", conceptId: "part" },
      { type: "vector", id: "unit-radius", from: coordinateSystem.c2p(0, 0.72, 0.22), to: coordinateSystem.c2p(1.15, 0.72, 0.22), colorRole: "trace", conceptId: "unit-fraction" },
      { type: "movingPoint", id: "slice-probe", pathObjectId: "slice-path", colorRole: "probe", conceptId: "part" },
      { type: "trace", id: "slice-trace", sourceObjectId: "slice-probe", durationSeconds: 1.2, colorRole: "trace" }
    ],
    sceneId: "mais-manim-fraction-slices",
    timeline: [
      { type: "revealCurve", objectId: "fraction-circle", duration: 1.2, easing: "smooth" },
      { type: "revealCurve", objectId: "slice-boundary", duration: 1, easing: "smooth" },
      { type: "revealCurve", objectId: "slice-path", duration: 1.2, easing: "smooth" },
      { type: "moveAlongPath", objectId: "slice-probe", pathObjectId: "slice-path", duration: 2.1 },
      { type: "highlight", conceptId: "part", duration: 1 },
      { type: "cameraTo", shotId: "slice-detail", duration: 1.1 },
      { type: "wait", duration: 0.8 }
    ]
  };
}

function formulaForClockMoneyData(state: ThreeDStateSummary) {
  return `$data\\to value;\\ rate=${formatCoefficient(state.value)};\\ compare=${formatCoefficient(state.comparison)}$`;
}

function buildClockMoneyDataMathSceneSpec({
  state
}: {
  accent: string;
  state: ThreeDStateSummary;
}): MathSceneSpec {
  const coordinateSpace = standardCoordinateSpace();
  const valueAngle = (state.value / 9) * Math.PI * 1.6 + Math.PI * 0.15;
  const coordinateSystem = createCoordinateSystem3D(coordinateSpace);
  const dataArc = buildParametricCurveObject({
    colorRole: "function",
    conceptId: "data-cycle",
    coordinateSystem,
    displaySampleCount: 56,
    id: "data-arc",
    sampleCount: 96,
    tRange: [0, 1],
    valueAt: (t): Vec3 => [Math.cos(t * valueAngle) * 1.25, 0.82 + Math.sin(t * valueAngle) * 0.52, -0.18]
  });
  const moneyRail = buildParametricCurveObject({
    colorRole: "trace",
    conceptId: "unit-exchange",
    coordinateSystem,
    displaySampleCount: 48,
    id: "money-rail",
    sampleCount: 72,
    tRange: [0, 1],
    valueAt: (t): Vec3 => [-1.9 + t * 3.8, 0.28 + Math.sin(t * Math.PI) * 0.14, 0.28]
  });

  return {
    bindings: [
      { conceptId: "data-cycle", formulaId: "clock-money-formula", objectId: "data-arc", tokenId: "data-token" },
      { conceptId: "measured-value", formulaId: "clock-money-formula", objectId: "value-vector", tokenId: "value-token" },
      { conceptId: "unit-exchange", formulaId: "clock-money-formula", objectId: "money-rail", tokenId: "unit-token" },
      { conceptId: "comparison-value", formulaId: "clock-money-formula", objectId: "comparison-vector", tokenId: "compare-token" }
    ],
    cameraShots: [
      { id: "overview", fov: 47, position: [3, 2.35, 3.55], target: [0, 0.82, 0] },
      { id: "value-detail", fov: 41, position: [2.05, 1.85, 2.45], target: [0.25, 0.82, 0.05] }
    ],
    coordinateSpace,
    diagnostics: { expectedBindingCount: 4, expectedObjectCount: 7, expectedTokenCount: 4 },
    familyId: "three-clock-money-data",
    formulas: [
      {
        id: "clock-money-formula",
        latex: formulaForClockMoneyData(state),
        tokens: [
          { conceptId: "data-cycle", id: "data-token", text: "data" },
          { conceptId: "measured-value", id: "value-token", text: "value" },
          { conceptId: "unit-exchange", id: "unit-token", text: "unit" },
          { conceptId: "comparison-value", id: "compare-token", text: "compare" }
        ]
      }
    ],
    objects: [
      { type: "axis3d", id: "axes", range: coordinateSpace.mathRange, conceptId: "coordinate-frame" },
      { type: "parametricCurve", id: "data-arc", samples: dataArc.worldSamples, colorRole: "function", conceptId: "data-cycle" },
      { type: "parametricCurve", id: "money-rail", samples: moneyRail.worldSamples, colorRole: "trace", conceptId: "unit-exchange" },
      { type: "vector", id: "value-vector", from: coordinateSystem.c2p(0, 0.82, -0.18), to: coordinateSystem.c2p(Math.cos(valueAngle) * 1.25, 0.82 + Math.sin(valueAngle) * 0.52, -0.18), colorRole: "probe", conceptId: "measured-value" },
      { type: "vector", id: "comparison-vector", from: coordinateSystem.c2p(-0.6, 0.32, 0.28), to: coordinateSystem.c2p(0.65, 0.72, 0.28), colorRole: "trace", conceptId: "comparison-value" },
      { type: "movingPoint", id: "data-probe", pathObjectId: "data-arc", colorRole: "probe", conceptId: "data-cycle" },
      { type: "trace", id: "data-trace", sourceObjectId: "data-probe", durationSeconds: 1.2, colorRole: "trace" }
    ],
    sceneId: "mais-manim-clock-money-data",
    timeline: [
      { type: "revealCurve", objectId: "data-arc", duration: 1.3, easing: "smooth" },
      { type: "revealCurve", objectId: "money-rail", duration: 1.1, easing: "smooth" },
      { type: "highlight", conceptId: "measured-value", duration: 1 },
      { type: "moveAlongPath", objectId: "data-probe", pathObjectId: "data-arc", duration: 2.2 },
      { type: "highlight", conceptId: "unit-exchange", duration: 1 },
      { type: "cameraTo", shotId: "value-detail", duration: 1.1 },
      { type: "wait", duration: 0.8 }
    ]
  };
}

function formulaForAngleGeometry(state: ThreeDStateSummary) {
  // Matches the 2D panel: Angle A = round(value) * 18, from 0 to 180 degrees.
  const degrees = clampValue(Math.round(state.value) * 18, 0, 180);
  return `$\\theta=${formatCoefficient(degrees)}^\\circ;\\ rotating\\ ray\\ defines\\ angle$`;
}

function buildAngleGeometryMathSceneSpec({
  state
}: {
  accent: string;
  state: ThreeDStateSummary;
}): MathSceneSpec {
  const coordinateSpace = standardCoordinateSpace();
  const theta = clampValue(Math.round(state.value) * 18, 0, 180) * (Math.PI / 180);
  const coordinateSystem = createCoordinateSystem3D(coordinateSpace);
  // The math->world mapping is anisotropic (x spans 6 units over 4.7 world,
  // y spans 4 units over 2.13 world). Scale the y components by that ratio so
  // a theta-degree angle renders as theta degrees in the scene plane.
  const angleAspect = ((4.7 / 6) / (2.13 / 4));
  const angleArc = buildParametricCurveObject({
    colorRole: "function",
    conceptId: "angle-measure",
    coordinateSystem,
    displaySampleCount: 48,
    id: "angle-arc",
    sampleCount: 72,
    tRange: [0, 1],
    valueAt: (t): Vec3 => [Math.cos(theta * t) * 0.75, 0.48 + Math.sin(theta * t) * 0.75 * angleAspect, 0.05]
  });
  const baseRay = buildParametricCurveObject({
    colorRole: "trace",
    conceptId: "reference-ray",
    coordinateSystem,
    displaySampleCount: 36,
    id: "base-ray",
    sampleCount: 48,
    tRange: [0, 1],
    valueAt: (t): Vec3 => [t * 1.8, 0.48, -0.18]
  });

  return {
    bindings: [
      { conceptId: "angle-measure", formulaId: "angle-formula", objectId: "angle-arc", tokenId: "angle-token" },
      { conceptId: "rotating-ray", formulaId: "angle-formula", objectId: "rotating-ray", tokenId: "ray-token" },
      { conceptId: "reference-ray", formulaId: "angle-formula", objectId: "base-ray", tokenId: "base-token" },
      { conceptId: "bisector", formulaId: "angle-formula", objectId: "bisector-ray", tokenId: "bisector-token" }
    ],
    cameraShots: [
      { id: "overview", fov: 47, position: [3, 2.35, 3.55], target: [0.35, 0.82, 0] },
      { id: "angle-detail", fov: 41, position: [2, 1.85, 2.35], target: [0.45, 0.82, 0] }
    ],
    coordinateSpace,
    diagnostics: { expectedBindingCount: 4, expectedObjectCount: 7, expectedTokenCount: 4 },
    familyId: "three-angle-geometry",
    formulas: [
      {
        id: "angle-formula",
        latex: formulaForAngleGeometry(state),
        tokens: [
          { conceptId: "angle-measure", id: "angle-token", text: "theta" },
          { conceptId: "rotating-ray", id: "ray-token", text: "ray" },
          { conceptId: "reference-ray", id: "base-token", text: "base" },
          { conceptId: "bisector", id: "bisector-token", text: "bisector" }
        ]
      }
    ],
    objects: [
      { type: "axis3d", id: "axes", range: coordinateSpace.mathRange, conceptId: "coordinate-frame" },
      { type: "parametricCurve", id: "angle-arc", samples: angleArc.worldSamples, colorRole: "function", conceptId: "angle-measure" },
      { type: "parametricCurve", id: "base-ray", samples: baseRay.worldSamples, colorRole: "trace", conceptId: "reference-ray" },
      {
        type: "vector",
        id: "rotating-ray",
        from: coordinateSystem.c2p(0, 0.48, 0.05),
        to: coordinateSystem.c2p(Math.cos(theta) * 1.2, 0.48 + Math.sin(theta) * 1.2 * angleAspect, 0.05),
        colorRole: "probe",
        conceptId: "rotating-ray"
      },
      {
        type: "vector",
        id: "bisector-ray",
        from: coordinateSystem.c2p(0, 0.48, -0.08),
        to: coordinateSystem.c2p(Math.cos(theta / 2) * 0.95, 0.48 + Math.sin(theta / 2) * 0.95 * angleAspect, -0.08),
        colorRole: "trace",
        conceptId: "bisector"
      },
      { type: "movingPoint", id: "angle-probe", pathObjectId: "angle-arc", colorRole: "probe", conceptId: "angle-measure" },
      { type: "trace", id: "angle-trace", sourceObjectId: "angle-probe", durationSeconds: 1.2, colorRole: "trace" }
    ],
    sceneId: "mais-manim-angle-geometry",
    timeline: [
      { type: "revealCurve", objectId: "base-ray", duration: 1, easing: "smooth" },
      { type: "revealCurve", objectId: "angle-arc", duration: 1.3, easing: "smooth" },
      { type: "highlight", conceptId: "rotating-ray", duration: 1 },
      { type: "moveAlongPath", objectId: "angle-probe", pathObjectId: "angle-arc", duration: 2.2 },
      { type: "highlight", conceptId: "angle-measure", duration: 1 },
      { type: "cameraTo", shotId: "angle-detail", duration: 1.1 },
      { type: "wait", duration: 0.8 }
    ]
  };
}

function formulaForRightTrianglePythagorean(state: ThreeDStateSummary) {
  const a = clampValue(state.value / 2, 2, 4.5);
  const b = clampValue(state.comparison / 2, 1.8, 4.2);
  return `$a^2+b^2=c^2;\\ c=${formatCoefficient(Math.sqrt(a * a + b * b))}$`;
}

function buildRightTrianglePythagoreanMathSceneSpec({
  state
}: {
  accent: string;
  state: ThreeDStateSummary;
}): MathSceneSpec {
  const coordinateSpace = standardCoordinateSpace();
  const a = clampValue(state.value / 3, 1.2, 2.2);
  const b = clampValue(state.comparison / 3, 1.1, 2);
  const coordinateSystem = createCoordinateSystem3D(coordinateSpace);
  const trianglePath = buildParametricCurveObject({
    colorRole: "function",
    conceptId: "hypotenuse",
    coordinateSystem,
    displaySampleCount: 60,
    id: "triangle-path",
    sampleCount: 96,
    tRange: [0, 1],
    valueAt: (t): Vec3 => {
      if (t < 1 / 3) return [-1.1 + a * t * 3, 0.38, -0.1];
      if (t < 2 / 3) return [-1.1 + a, 0.38 + b * (t - 1 / 3) * 3, -0.1];
      return [-1.1 + a * (1 - (t - 2 / 3) * 3), 0.38 + b * (1 - (t - 2 / 3) * 3), -0.1];
    }
  });
  const legSquarePath = buildParametricCurveObject({
    colorRole: "trace",
    conceptId: "square-area",
    coordinateSystem,
    displaySampleCount: 36,
    id: "leg-square-path",
    sampleCount: 48,
    tRange: [0, 1],
    valueAt: (t): Vec3 => [-1.1 + a * t, 0.18 + Math.sin(t * Math.PI) * 0.1, 0.32]
  });

  return {
    bindings: [
      { conceptId: "hypotenuse", formulaId: "right-triangle-formula", objectId: "hypotenuse-vector", tokenId: "hypotenuse-token" },
      { conceptId: "square-area", formulaId: "right-triangle-formula", objectId: "leg-square-path", tokenId: "square-token" },
      { conceptId: "leg-a", formulaId: "right-triangle-formula", objectId: "leg-a-vector", tokenId: "leg-a-token" },
      { conceptId: "leg-b", formulaId: "right-triangle-formula", objectId: "leg-b-vector", tokenId: "leg-b-token" }
    ],
    cameraShots: [
      { id: "overview", fov: 47, position: [3, 2.35, 3.55], target: [0, 0.82, 0] },
      { id: "hypotenuse-detail", fov: 41, position: [2, 1.85, 2.45], target: [0.15, 0.9, 0] }
    ],
    coordinateSpace,
    diagnostics: { expectedBindingCount: 4, expectedObjectCount: 7, expectedTokenCount: 4 },
    familyId: "three-right-triangle-pythagorean",
    formulas: [
      {
        id: "right-triangle-formula",
        latex: formulaForRightTrianglePythagorean(state),
        tokens: [
          { conceptId: "hypotenuse", id: "hypotenuse-token", text: "c" },
          { conceptId: "square-area", id: "square-token", text: "squares" },
          { conceptId: "leg-a", id: "leg-a-token", text: "a" },
          { conceptId: "leg-b", id: "leg-b-token", text: "b" }
        ]
      }
    ],
    objects: [
      { type: "axis3d", id: "axes", range: coordinateSpace.mathRange, conceptId: "coordinate-frame" },
      { type: "parametricCurve", id: "triangle-path", samples: trianglePath.worldSamples, colorRole: "function", conceptId: "hypotenuse" },
      { type: "parametricCurve", id: "leg-square-path", samples: legSquarePath.worldSamples, colorRole: "trace", conceptId: "square-area" },
      {
        type: "vector",
        id: "hypotenuse-vector",
        from: coordinateSystem.c2p(-1.1, 0.38, -0.1),
        to: coordinateSystem.c2p(-1.1 + a, 0.38 + b, -0.1),
        colorRole: "probe",
        conceptId: "hypotenuse"
      },
      {
        type: "vector",
        id: "leg-a-vector",
        from: coordinateSystem.c2p(-1.1, 0.38, -0.18),
        to: coordinateSystem.c2p(-1.1 + a, 0.38, -0.18),
        colorRole: "trace",
        conceptId: "leg-a"
      },
      {
        type: "vector",
        id: "leg-b-vector",
        from: coordinateSystem.c2p(-1.1 + a, 0.38, -0.18),
        to: coordinateSystem.c2p(-1.1 + a, 0.38 + b, -0.18),
        colorRole: "trace",
        conceptId: "leg-b"
      },
      { type: "movingPoint", id: "triangle-probe", pathObjectId: "triangle-path", colorRole: "probe", conceptId: "hypotenuse" }
    ],
    sceneId: "mais-manim-right-triangle-pythagorean",
    timeline: [
      { type: "revealCurve", objectId: "triangle-path", duration: 1.4, easing: "smooth" },
      { type: "revealCurve", objectId: "leg-square-path", duration: 1.1, easing: "smooth" },
      { type: "highlight", conceptId: "leg-a", duration: 1 },
      { type: "moveAlongPath", objectId: "triangle-probe", pathObjectId: "triangle-path", duration: 2.2 },
      { type: "highlight", conceptId: "hypotenuse", duration: 1 },
      { type: "cameraTo", shotId: "hypotenuse-detail", duration: 1.1 },
      { type: "wait", duration: 0.8 }
    ]
  };
}

function formulaForCoordinateTransform(state: ThreeDStateSummary) {
  const scale = clampValue(0.72 + state.value / 10, 0.9, 1.6);
  return `$T(x,y)=A\\vec p;\\ scale=${formatCoefficient(scale)};\\ grid\\to image$`;
}

function buildCoordinateTransformMathSceneSpec({
  state
}: {
  accent: string;
  state: ThreeDStateSummary;
}): MathSceneSpec {
  const coordinateSpace = standardCoordinateSpace();
  const scale = clampValue(0.72 + state.value / 10, 0.9, 1.6);
  const shear = clampValue((state.comparison - 5) / 8, -0.35, 0.45);
  const coordinateSystem = createCoordinateSystem3D(coordinateSpace);
  const sourceGrid = buildParametricCurveObject({
    colorRole: "trace",
    conceptId: "source-grid",
    coordinateSystem,
    displaySampleCount: 64,
    id: "source-grid",
    sampleCount: 96,
    tRange: [0, 1],
    valueAt: (t): Vec3 => {
      const segment = Math.floor(t * 4);
      const local = t * 4 - segment;
      if (segment === 0) return [-1.5 + local * 3, 0.34, -0.8];
      if (segment === 1) return [1.5, 0.34, -0.8 + local * 1.6];
      if (segment === 2) return [1.5 - local * 3, 0.34, 0.8];
      return [-1.5, 0.34, 0.8 - local * 1.6];
    }
  });
  const targetGrid = buildParametricCurveObject({
    colorRole: "function",
    conceptId: "target-grid",
    coordinateSystem,
    displaySampleCount: 56,
    id: "target-grid",
    sampleCount: 72,
    tRange: [0, 1],
    valueAt: (t): Vec3 => {
      const x = -1.4 + t * 2.8;
      return [x * scale + shear * Math.sin(t * Math.PI), 0.72 + Math.sin(t * Math.PI) * 0.28, -0.62 + t * 1.24];
    }
  });
  const transformPath = buildParametricCurveObject({
    colorRole: "probe",
    conceptId: "mapped-point",
    coordinateSystem,
    displaySampleCount: 48,
    id: "transform-path",
    sampleCount: 64,
    tRange: [0, 1],
    valueAt: (t): Vec3 => [-1.25 + t * 2.5, 0.42 + Math.sin(t * Math.PI) * 0.78, -0.4 + t * 0.9]
  });

  return {
    bindings: [
      { conceptId: "source-grid", formulaId: "transform-formula", objectId: "source-grid", tokenId: "grid-token" },
      { conceptId: "mapped-point", formulaId: "transform-formula", objectId: "transform-probe", tokenId: "point-token" },
      { conceptId: "basis-transform", formulaId: "transform-formula", objectId: "basis-i-vector", tokenId: "basis-token" },
      { conceptId: "target-grid", formulaId: "transform-formula", objectId: "target-grid", tokenId: "image-token" }
    ],
    cameraShots: [
      { id: "overview", fov: 47, position: [3.1, 2.4, 3.7], target: [0, 0.85, 0] },
      { id: "mapping-detail", fov: 41, position: [2.05, 1.9, 2.5], target: [0.2, 0.92, 0.06] }
    ],
    coordinateSpace,
    diagnostics: { expectedBindingCount: 4, expectedObjectCount: 8, expectedTokenCount: 4 },
    familyId: "three-coordinate-transform",
    formulas: [
      {
        id: "transform-formula",
        latex: formulaForCoordinateTransform(state),
        tokens: [
          { conceptId: "source-grid", id: "grid-token", text: "grid" },
          { conceptId: "mapped-point", id: "point-token", text: "T(p)" },
          { conceptId: "basis-transform", id: "basis-token", text: "basis" },
          { conceptId: "target-grid", id: "image-token", text: "image" }
        ]
      }
    ],
    objects: [
      { type: "axis3d", id: "axes", range: coordinateSpace.mathRange, conceptId: "coordinate-frame" },
      { type: "parametricCurve", id: "source-grid", samples: sourceGrid.worldSamples, colorRole: "trace", conceptId: "source-grid" },
      { type: "parametricCurve", id: "target-grid", samples: targetGrid.worldSamples, colorRole: "function", conceptId: "target-grid" },
      { type: "parametricCurve", id: "transform-path", samples: transformPath.worldSamples, colorRole: "probe", conceptId: "mapped-point" },
      {
        type: "vector",
        id: "basis-i-vector",
        from: coordinateSystem.c2p(0, 0.34, -0.2),
        to: coordinateSystem.c2p(scale, 0.34 + shear * 0.2, -0.2),
        colorRole: "probe",
        conceptId: "basis-transform"
      },
      {
        type: "vector",
        id: "basis-j-vector",
        from: coordinateSystem.c2p(0, 0.34, -0.2),
        to: coordinateSystem.c2p(shear, 1.24, 0.48),
        colorRole: "trace",
        conceptId: "basis-transform"
      },
      { type: "movingPoint", id: "transform-probe", pathObjectId: "transform-path", colorRole: "probe", conceptId: "mapped-point" },
      { type: "trace", id: "transform-trace", sourceObjectId: "transform-probe", durationSeconds: 1.2, colorRole: "trace" }
    ],
    sceneId: "mais-manim-coordinate-transform",
    timeline: [
      { type: "revealCurve", objectId: "source-grid", duration: 1.1, easing: "smooth" },
      { type: "revealCurve", objectId: "target-grid", duration: 1.2, easing: "smooth" },
      { type: "revealCurve", objectId: "transform-path", duration: 1.2, easing: "smooth" },
      { type: "highlight", conceptId: "basis-transform", duration: 1 },
      { type: "moveAlongPath", objectId: "transform-probe", pathObjectId: "transform-path", duration: 2.2 },
      { type: "highlight", conceptId: "mapped-point", duration: 1 },
      { type: "cameraTo", shotId: "mapping-detail", duration: 1.1 },
      { type: "wait", duration: 0.8 }
    ]
  };
}

function formulaForEquationBalance(state: ThreeDStateSummary) {
  const left = Math.round(state.value);
  const right = Math.round(state.comparison);
  return `$${left}+x=${right};\\ same\\ operation\\ preserves\\ balance$`;
}

function buildEquationBalanceMathSceneSpec({
  state
}: {
  accent: string;
  state: ThreeDStateSummary;
}): MathSceneSpec {
  const coordinateSpace = standardCoordinateSpace();
  const tilt = clampValue((state.value - state.comparison) / 12, -0.32, 0.32);
  const coordinateSystem = createCoordinateSystem3D(coordinateSpace);
  const balanceBeam = buildParametricCurveObject({
    colorRole: "function",
    conceptId: "balance-model",
    coordinateSystem,
    displaySampleCount: 48,
    id: "balance-beam",
    sampleCount: 64,
    tRange: [0, 1],
    valueAt: (t): Vec3 => [-1.75 + t * 3.5, 0.82 + tilt * (t - 0.5), -0.08]
  });
  const leftPan = buildParametricCurveObject({
    colorRole: "trace",
    conceptId: "equation-state",
    coordinateSystem,
    displaySampleCount: 40,
    id: "left-pan",
    sampleCount: 56,
    tRange: [0, 1],
    valueAt: (t): Vec3 => [-1.2 + Math.cos(t * Math.PI * 2) * 0.42, 0.42 + Math.sin(t * Math.PI * 2) * 0.12, -0.18]
  });
  const rightPan = buildParametricCurveObject({
    colorRole: "trace",
    conceptId: "equality",
    coordinateSystem,
    displaySampleCount: 40,
    id: "right-pan",
    sampleCount: 56,
    tRange: [0, 1],
    valueAt: (t): Vec3 => [1.2 + Math.cos(t * Math.PI * 2) * 0.42, 0.42 + Math.sin(t * Math.PI * 2) * 0.12, -0.18]
  });

  return {
    bindings: [
      { conceptId: "balance-model", formulaId: "balance-formula", objectId: "balance-beam", tokenId: "balance-token" },
      { conceptId: "equation-state", formulaId: "balance-formula", objectId: "balance-probe", tokenId: "equation-token" },
      { conceptId: "same-operation", formulaId: "balance-formula", objectId: "operation-vector", tokenId: "operation-token" },
      { conceptId: "equality", formulaId: "balance-formula", objectId: "equality-vector", tokenId: "equality-token" }
    ],
    cameraShots: [
      { id: "overview", fov: 47, position: [3.1, 2.35, 3.55], target: [0, 0.85, 0] },
      { id: "balance-detail", fov: 41, position: [2.05, 1.85, 2.45], target: [0.08, 0.82, -0.05] }
    ],
    coordinateSpace,
    diagnostics: { expectedBindingCount: 4, expectedObjectCount: 7, expectedTokenCount: 4 },
    familyId: "three-equation-balance",
    formulas: [
      {
        id: "balance-formula",
        latex: formulaForEquationBalance(state),
        tokens: [
          { conceptId: "balance-model", id: "balance-token", text: "balance" },
          { conceptId: "equation-state", id: "equation-token", text: "equation" },
          { conceptId: "same-operation", id: "operation-token", text: "operation" },
          { conceptId: "equality", id: "equality-token", text: "=" }
        ]
      }
    ],
    objects: [
      { type: "axis3d", id: "axes", range: coordinateSpace.mathRange, conceptId: "coordinate-frame" },
      { type: "parametricCurve", id: "balance-beam", samples: balanceBeam.worldSamples, colorRole: "function", conceptId: "balance-model" },
      { type: "parametricCurve", id: "left-pan", samples: leftPan.worldSamples, colorRole: "trace", conceptId: "equation-state" },
      { type: "parametricCurve", id: "right-pan", samples: rightPan.worldSamples, colorRole: "trace", conceptId: "equality" },
      {
        type: "vector",
        id: "operation-vector",
        from: coordinateSystem.c2p(-0.75, 1.16, 0.18),
        to: coordinateSystem.c2p(0.75, 1.16, 0.18),
        colorRole: "probe",
        conceptId: "same-operation"
      },
      {
        type: "vector",
        id: "equality-vector",
        from: coordinateSystem.c2p(-0.2, 0.62, -0.18),
        to: coordinateSystem.c2p(0.2, 0.62, -0.18),
        colorRole: "trace",
        conceptId: "equality"
      },
      { type: "movingPoint", id: "balance-probe", pathObjectId: "balance-beam", colorRole: "probe", conceptId: "equation-state" }
    ],
    sceneId: "mais-manim-equation-balance",
    timeline: [
      { type: "revealCurve", objectId: "balance-beam", duration: 1.2, easing: "smooth" },
      { type: "revealCurve", objectId: "left-pan", duration: 1, easing: "smooth" },
      { type: "revealCurve", objectId: "right-pan", duration: 1, easing: "smooth" },
      { type: "highlight", conceptId: "same-operation", duration: 1 },
      { type: "moveAlongPath", objectId: "balance-probe", pathObjectId: "balance-beam", duration: 2.2 },
      { type: "cameraTo", shotId: "balance-detail", duration: 1.1 },
      { type: "wait", duration: 0.8 }
    ]
  };
}

function sceneParametersFromState(scene: MathSceneSpec, state: ThreeDStateSummary): MathSceneParameterSpec[] {
  const firstObjectWithConcept = scene.objects.find((object) => "conceptId" in object && object.conceptId);
  const fallbackConceptId = firstObjectWithConcept && "conceptId" in firstObjectWithConcept ? firstObjectWithConcept.conceptId : undefined;
  const primaryConceptId = scene.bindings[0]?.conceptId ?? fallbackConceptId;
  const secondaryConceptId = scene.bindings[1]?.conceptId ?? primaryConceptId;

  return [
    {
      conceptId: primaryConceptId,
      id: "value",
      label: "Primary value",
      max: 12,
      min: 0,
      role: "control",
      value: state.value
    },
    {
      conceptId: secondaryConceptId,
      id: "comparison",
      label: "Comparison value",
      max: 12,
      min: 0,
      role: "control",
      value: state.comparison
    },
    {
      conceptId: primaryConceptId,
      id: "mode",
      label: "Mode",
      max: 2,
      min: 0,
      role: "control",
      value: normalizeFunctionMode(state.mode)
    },
    {
      conceptId: primaryConceptId,
      id: "depth",
      label: "Depth",
      max: 4,
      min: 0,
      role: "derived",
      value: state.depthValue
    },
    {
      conceptId: primaryConceptId,
      id: "primary",
      label: "Primary display value",
      max: 12,
      min: 0,
      role: "derived",
      value: state.primaryValue
    },
    {
      conceptId: secondaryConceptId,
      id: "secondary",
      label: "Secondary display value",
      max: 12,
      min: 0,
      role: "derived",
      value: state.secondaryValue
    }
  ];
}

function withSceneParameters(scene: MathSceneSpec, state: ThreeDStateSummary): MathSceneSpec {
  return {
    ...scene,
    parameters: [...(scene.parameters ?? []), ...sceneParametersFromState(scene, state)]
  };
}

function withSceneRandomSeed(scene: MathSceneSpec, state: ThreeDStateSummary): MathSceneSpec {
  return {
    ...scene,
    randomSeed: deriveMathSceneRandomSeed({
      familyId: scene.familyId,
      sceneId: scene.sceneId,
      stateSummary: state.stateSummary
    })
  };
}

export function buildMathSceneSpecForThreeDFamily({
  accent,
  state
}: {
  accent: string;
  state: ThreeDStateSummary;
}): MathSceneSpec | null {
  let scene: MathSceneSpec | null = null;

  if (state.familyId === "three-function-graph") scene = buildFunctionGraphMathSceneSpec({ accent, state });
  if (state.familyId === "three-function-family") scene = buildFunctionFamilyMathSceneSpec({ accent, state });
  if (state.familyId === "three-complex-plane") scene = buildComplexPlaneMathSceneSpec({ accent, state });
  if (state.familyId === "three-trig-unit-wave") scene = buildTrigUnitWaveMathSceneSpec({ accent, state });
  if (state.familyId === "three-calculus-rate-area") scene = buildCalculusRateAreaMathSceneSpec({ accent, state });
  if (state.familyId === "three-vector-conic-strategy") scene = buildVectorConicStrategyMathSceneSpec({ accent, state });
  if (state.familyId === "three-space-vectors-lines-planes") scene = buildSpaceVectorsLinesPlanesMathSceneSpec({ accent, state });
  if (state.familyId === "three-conic-sections-deep") scene = buildConicSectionsDeepMathSceneSpec({ accent, state });
  if (state.familyId === "three-optimization-modeling") scene = buildOptimizationModelingMathSceneSpec({ accent, state });
  if (state.familyId === "three-probability-machine") scene = buildProbabilityMachineMathSceneSpec({ accent, state });
  if (state.familyId === "three-statistics-distribution") scene = buildStatisticsDistributionMathSceneSpec({ accent, state });
  if (state.familyId === "three-statistical-inference-lab") scene = buildStatisticalInferenceLabMathSceneSpec({ accent, state });
  if (state.familyId === "three-projection-views") scene = buildProjectionViewsMathSceneSpec({ accent, state });
  if (state.familyId === "three-solid-nets-folding") scene = buildSolidNetsFoldingMathSceneSpec({ accent, state });
  if (state.familyId === "three-cross-section-slicer") scene = buildCrossSectionSlicerMathSceneSpec({ accent, state });
  if (state.familyId === "three-curriculum-crosswalk-map") scene = buildCurriculumCrosswalkMapMathSceneSpec({ accent, state });
  if (state.familyId === "three-exam-strategy-capstone") scene = buildExamStrategyCapstoneMathSceneSpec({ accent, state });
  if (state.familyId === "three-number-line") scene = buildNumberLineMathSceneSpec({ accent, state });
  if (state.familyId === "three-measurement-scale") scene = buildMeasurementScaleMathSceneSpec({ accent, state });
  if (state.familyId === "three-base-ten-blocks") scene = buildBaseTenBlocksMathSceneSpec({ accent, state });
  if (state.familyId === "three-array-area-blocks") scene = buildArrayAreaBlocksMathSceneSpec({ accent, state });
  if (state.familyId === "three-fraction-slices") scene = buildFractionSlicesMathSceneSpec({ accent, state });
  if (state.familyId === "three-clock-money-data") scene = buildClockMoneyDataMathSceneSpec({ accent, state });
  if (state.familyId === "three-angle-geometry") scene = buildAngleGeometryMathSceneSpec({ accent, state });
  if (state.familyId === "three-right-triangle-pythagorean") scene = buildRightTrianglePythagoreanMathSceneSpec({ accent, state });
  if (state.familyId === "three-coordinate-transform") scene = buildCoordinateTransformMathSceneSpec({ accent, state });
  if (state.familyId === "three-equation-balance") scene = buildEquationBalanceMathSceneSpec({ accent, state });

  return scene ? withSceneParameters(withSceneRandomSeed(assignFormulaBindingAnchors(scene), state), state) : null;
}
