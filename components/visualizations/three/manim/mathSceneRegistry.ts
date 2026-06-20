import { mapMathPointToWorld, resampleCurveByArcLength, sampleParametricCurve } from "./mathCoordinateSpace";
import type { MathSceneSpec, Vec3 } from "./mathSceneTypes";
import type { ThreeDFamilyId, ThreeDStateSummary } from "../threeDSceneTypes";

export const maisManimFamilyIds = [
  "three-function-graph",
  "three-function-family",
  "three-complex-plane",
  "three-trig-unit-wave",
  "three-calculus-rate-area",
  "three-vector-conic-strategy"
] as const satisfies readonly ThreeDFamilyId[];

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

function functionValue(state: ThreeDStateSummary, x: number) {
  return functionFamilyValue(state, normalizeFunctionMode(state.mode), x);
}

function functionFamilyValue(state: ThreeDStateSummary, mode: number, x: number) {
  const amplitude = Math.max(0.25, state.value / 6);
  const verticalShift = (state.comparison - 6) / 3;
  const activeMode = normalizeFunctionMode(mode);

  if (activeMode === 1) return Math.sin(x * 1.35) * amplitude + verticalShift;
  if (activeMode === 2) return Math.log(Math.max(0.05, x + 3.25)) * amplitude - 1 + verticalShift;
  return (amplitude * x * x) / 2.5 + verticalShift;
}

function formulaForFunctionGraph(state: ThreeDStateSummary) {
  const amplitude = Math.max(0.25, state.value / 6);
  const verticalShift = (state.comparison - 6) / 3;
  const sign = verticalShift >= 0 ? "+" : "-";
  const activeMode = normalizeFunctionMode(state.mode);

  if (activeMode === 1) return `$f(x)=${formatCoefficient(amplitude)}\\\\sin(1.35x) ${sign} ${formatCoefficient(Math.abs(verticalShift))}$`;
  if (activeMode === 2) return `$f(x)=${formatCoefficient(amplitude)}\\\\ln(x+3.25) ${sign} ${formatCoefficient(Math.abs(verticalShift + 1))}$`;
  return `$f(x)=${formatCoefficient(amplitude / 2.5)}x^2 ${sign} ${formatCoefficient(Math.abs(verticalShift))}$`;
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
  const rawSamples = sampleParametricCurve({
    coordinateSpace,
    sampleCount: 96,
    tRange: [0, 1],
    valueAt: (t): Vec3 => {
      const x = -3 + t * 6;
      return [x, functionValue(state, x), Math.sin(t * Math.PI * 2) * 0.12];
    }
  });
  const curveSamples = resampleCurveByArcLength(rawSamples, 72).map((sample) => sample.world);

  return {
    bindings: [
      { conceptId: "function-rule", formulaId: "function-formula", objectId: "function-curve", tokenId: "function-token" },
      { conceptId: "probe-point", formulaId: "function-formula", objectId: "moving-probe", tokenId: "point-token" }
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
      { type: "highlight", conceptId: "function-rule", duration: 1.2 },
      { type: "cameraTo", shotId: "curve-detail", duration: 1.4 },
      { type: "wait", duration: 0.8 }
    ]
  };
}

function formulaForFunctionFamily(state: ThreeDStateSummary) {
  const activeMode = normalizeFunctionMode(state.mode);
  const nextMode = (activeMode + 1) % 3;
  const modeLabels = ["x^2", "\\\\sin x", "\\\\ln x"];

  return `$f(x)\\\\in\\\\{${modeLabels.join(", ")}\\\\};\\\\ active=${modeLabels[activeMode]}\\\\ vs\\\\ ${modeLabels[nextMode]}$`;
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
  const activeMode = normalizeFunctionMode(state.mode);
  const comparisonMode = (activeMode + 1) % 3;
  const rawPrimarySamples = sampleParametricCurve({
    coordinateSpace,
    sampleCount: 96,
    tRange: [0, 1],
    valueAt: (t): Vec3 => {
      const x = -3 + t * 6;
      return [x, functionFamilyValue(state, activeMode, x), -0.16];
    }
  });
  const rawComparisonSamples = sampleParametricCurve({
    coordinateSpace,
    sampleCount: 96,
    tRange: [0, 1],
    valueAt: (t): Vec3 => {
      const x = -3 + t * 6;
      return [x, functionFamilyValue(state, comparisonMode, x), 0.24];
    }
  });
  const primarySamples = resampleCurveByArcLength(rawPrimarySamples, 72).map((sample) => sample.world);
  const comparisonSamples = resampleCurveByArcLength(rawComparisonSamples, 72).map((sample) => sample.world);

  return {
    bindings: [
      { conceptId: "family-rule", formulaId: "family-formula", objectId: "primary-family-curve", tokenId: "family-token" },
      { conceptId: "comparison-rule", formulaId: "family-formula", objectId: "comparison-family-curve", tokenId: "comparison-token" },
      { conceptId: "probe-point", formulaId: "family-formula", objectId: "family-probe", tokenId: "probe-token" }
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
  return `$z=${formatCoefficient(complexRadius(state))}(\\\\cos\\\\theta+i\\\\sin\\\\theta);\\\\ \\\\theta=${formatCoefficient(complexTheta(state))}$`;
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
  const origin: Vec3 = [0, 0, -0.2];
  const baseTip: Vec3 = [radius * Math.cos(theta), radius * Math.sin(theta), -0.2];
  const productTip: Vec3 = [
    radius * 0.82 * Math.cos(productTheta),
    radius * 0.82 * Math.sin(productTheta),
    0.28
  ];
  const rawModulusSamples = sampleParametricCurve({
    coordinateSpace,
    sampleCount: 96,
    tRange: [0, 1],
    valueAt: (t): Vec3 => {
      const angle = t * Math.PI * 2;
      return [radius * Math.cos(angle), radius * Math.sin(angle), -0.22];
    }
  });
  const rawOrbitSamples = sampleParametricCurve({
    coordinateSpace,
    sampleCount: 96,
    tRange: [0, 1],
    valueAt: (t): Vec3 => {
      const angle = theta + t * (productTheta - theta);
      return [radius * 0.9 * Math.cos(angle), radius * 0.9 * Math.sin(angle), 0.2];
    }
  });
  const modulusSamples = resampleCurveByArcLength(rawModulusSamples, 72).map((sample) => sample.world);
  const orbitSamples = resampleCurveByArcLength(rawOrbitSamples, 56).map((sample) => sample.world);

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
        from: mapMathPointToWorld(origin, coordinateSpace),
        to: mapMathPointToWorld(baseTip, coordinateSpace),
        colorRole: "function",
        conceptId: "complex-vector"
      },
      {
        type: "vector",
        id: "product-vector",
        from: mapMathPointToWorld([0, 0, 0.28], coordinateSpace),
        to: mapMathPointToWorld(productTip, coordinateSpace),
        colorRole: "probe",
        conceptId: "rotation-product"
      },
      { type: "movingPoint", id: "orbit-probe", pathObjectId: "rotation-orbit", colorRole: "probe", conceptId: "rotation-orbit" }
    ],
    sceneId: "mais-manim-complex-plane",
    timeline: [
      { type: "revealCurve", objectId: "modulus-circle", duration: 1.8, easing: "smooth" },
      { type: "revealCurve", objectId: "rotation-orbit", duration: 1.7, easing: "smooth" },
      { type: "highlight", conceptId: "complex-vector", duration: 1 },
      { type: "highlight", conceptId: "rotation-product", duration: 1 },
      { type: "moveAlongPath", objectId: "orbit-probe", pathObjectId: "rotation-orbit", duration: 3.1 },
      { type: "cameraTo", shotId: "argument-detail", duration: 1.2 },
      { type: "wait", duration: 0.8 }
    ]
  };
}

function clampValue(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function trigAmplitude(state: ThreeDStateSummary) {
  return clampValue(state.value / 6, 0.35, 1.35);
}

function trigFrequency(state: ThreeDStateSummary) {
  return clampValue(0.8 + state.comparison / 8, 0.85, 2.2);
}

function trigPhase(state: ThreeDStateSummary) {
  return normalizeFunctionMode(state.mode) * Math.PI / 6;
}

function formulaForTrigUnitWave(state: ThreeDStateSummary) {
  return `$y=${formatCoefficient(trigAmplitude(state))}\\\\sin(${formatCoefficient(trigFrequency(state))}x+${formatCoefficient(trigPhase(state))});\\\\ (\\\\cos\\\\theta,\\\\sin\\\\theta)$`;
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
  const circleRadius = 0.72;
  const amplitude = trigAmplitude(state);
  const frequency = trigFrequency(state);
  const phase = trigPhase(state);
  const activeTheta = ((state.value + state.comparison) / 12) * Math.PI * 2 + phase;
  const center: Vec3 = [centerX, 0, -0.32];
  const radiusTip: Vec3 = [
    centerX + Math.cos(activeTheta) * circleRadius,
    Math.sin(activeTheta) * circleRadius,
    -0.32
  ];
  const rawCircleSamples = sampleParametricCurve({
    coordinateSpace,
    sampleCount: 96,
    tRange: [0, 1],
    valueAt: (t): Vec3 => {
      const theta = t * Math.PI * 2;
      return [centerX + Math.cos(theta) * circleRadius, Math.sin(theta) * circleRadius, -0.32];
    }
  });
  const rawWaveSamples = sampleParametricCurve({
    coordinateSpace,
    sampleCount: 112,
    tRange: [0, 1],
    valueAt: (t): Vec3 => {
      const x = 0.12 + t * Math.PI * 2;
      return [x, amplitude * Math.sin(frequency * x + phase), 0.24];
    }
  });
  const circleSamples = resampleCurveByArcLength(rawCircleSamples, 72).map((sample) => sample.world);
  const waveSamples = resampleCurveByArcLength(rawWaveSamples, 84).map((sample) => sample.world);

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
        from: mapMathPointToWorld(center, coordinateSpace),
        to: mapMathPointToWorld(radiusTip, coordinateSpace),
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

function calculusCurveValue(state: ThreeDStateSummary, x: number) {
  const curvature = Math.max(0.16, state.value / 24);
  const slopeShift = (state.comparison - 6) / 8;

  return curvature * x * x + slopeShift * x + 0.35 * Math.sin(x + state.mode * 0.35);
}

function calculusDerivativeValue(state: ThreeDStateSummary, x: number) {
  const curvature = Math.max(0.16, state.value / 24);
  const slopeShift = (state.comparison - 6) / 8;

  return 2 * curvature * x + slopeShift + 0.35 * Math.cos(x + state.mode * 0.35);
}

function formulaForCalculusRateArea(state: ThreeDStateSummary) {
  const probe = Math.max(-2.4, Math.min(2.4, (state.value - 6) / 2));

  return `$f'(a)\\\\approx ${formatCoefficient(calculusDerivativeValue(state, probe))};\\\\ A(a)=\\\\int_{-3}^{a} f(x)\\\\,dx$`;
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
  const probeX = Math.max(-2.4, Math.min(2.4, (state.value - 6) / 2));
  const probeY = calculusCurveValue(state, probeX);
  const tangentSlope = calculusDerivativeValue(state, probeX);
  const tangentHalfWidth = 0.64;
  const tangentFrom = mapMathPointToWorld(
    [probeX - tangentHalfWidth, probeY - tangentSlope * tangentHalfWidth, 0.36],
    coordinateSpace
  );
  const tangentTo = mapMathPointToWorld(
    [probeX + tangentHalfWidth, probeY + tangentSlope * tangentHalfWidth, 0.36],
    coordinateSpace
  );
  const rawCurveSamples = sampleParametricCurve({
    coordinateSpace,
    sampleCount: 108,
    tRange: [0, 1],
    valueAt: (t): Vec3 => {
      const x = -3 + t * 6;
      return [x, calculusCurveValue(state, x), 0.06];
    }
  });
  const rawAreaSamples = sampleParametricCurve({
    coordinateSpace,
    sampleCount: 72,
    tRange: [0, 1],
    valueAt: (t): Vec3 => {
      const x = -3 + t * (probeX + 3);
      return [x, Math.max(0, calculusCurveValue(state, x)) * 0.72, -0.28];
    }
  });
  const curveSamples = resampleCurveByArcLength(rawCurveSamples, 80).map((sample) => sample.world);
  const areaSamples = resampleCurveByArcLength(rawAreaSamples, 54).map((sample) => sample.world);

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

  return `$\\\\vec v=\\\\langle a,b\\\\rangle;\\\\ ${modeLabels[activeMode]}\\\\ locus;\\\\ strategy=vector\\\\to conic\\\\to proof$`;
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
  const scale = vectorConicScale(state);
  const slope = vectorConicSlope(state);
  const activeMode = normalizeFunctionMode(state.mode);
  const vectorTip: Vec3 = [1.15 + slope, 0.72 + scale * 0.38, -0.45];
  const componentTip: Vec3 = [vectorTip[0], 0.22, -0.45];
  const rawConicSamples = sampleParametricCurve({
    coordinateSpace,
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
  const rawStrategySamples = sampleParametricCurve({
    coordinateSpace,
    sampleCount: 80,
    tRange: [0, 1],
    valueAt: (t): Vec3 => [
      -2.2 + t * 4.4,
      0.24 + Math.sin(t * Math.PI) * (0.9 + scale * 0.24),
      -0.52 + t * 0.96
    ]
  });
  const conicSamples = resampleCurveByArcLength(rawConicSamples, 80).map((sample) => sample.world);
  const strategySamples = resampleCurveByArcLength(rawStrategySamples, 64).map((sample) => sample.world);

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
      { type: "parametricCurve", id: "conic-locus", samples: conicSamples, colorRole: "function", conceptId: "conic-locus" },
      { type: "parametricCurve", id: "strategy-path", samples: strategySamples, colorRole: "trace", conceptId: "strategy-path" },
      {
        type: "vector",
        id: "strategy-vector",
        from: mapMathPointToWorld([-0.25, 0.22, -0.45], coordinateSpace),
        to: mapMathPointToWorld(vectorTip, coordinateSpace),
        colorRole: "probe",
        conceptId: "vector-decomposition"
      },
      {
        type: "vector",
        id: "component-vector",
        from: mapMathPointToWorld([-0.25, 0.22, -0.45], coordinateSpace),
        to: mapMathPointToWorld(componentTip, coordinateSpace),
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

export function buildMathSceneSpecForThreeDFamily({
  accent,
  state
}: {
  accent: string;
  state: ThreeDStateSummary;
}): MathSceneSpec | null {
  if (state.familyId === "three-function-graph") return buildFunctionGraphMathSceneSpec({ accent, state });
  if (state.familyId === "three-function-family") return buildFunctionFamilyMathSceneSpec({ accent, state });
  if (state.familyId === "three-complex-plane") return buildComplexPlaneMathSceneSpec({ accent, state });
  if (state.familyId === "three-trig-unit-wave") return buildTrigUnitWaveMathSceneSpec({ accent, state });
  if (state.familyId === "three-calculus-rate-area") return buildCalculusRateAreaMathSceneSpec({ accent, state });
  if (state.familyId === "three-vector-conic-strategy") return buildVectorConicStrategyMathSceneSpec({ accent, state });
  return null;
}
