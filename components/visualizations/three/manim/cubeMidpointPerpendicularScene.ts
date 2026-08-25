/**
 * Client-safe scene construction for the cube midpoint-plane proof.
 *
 * The exact proof DTO is built on the server. This module only translates its
 * finite render coordinates, authoritative LaTeX, and semantic token IDs into
 * the existing renderer-neutral MathSceneSpec contract.
 */

import type {
  CubeMidpointPerpendicularFormulaTokenId,
  CubeMidpointPerpendicularPointId,
  CubeMidpointPerpendicularProofDto,
} from "../../../../lib/math-kernel/demo/cubeMidpointPerpendicular.types";
import type { MathKernelLocale } from "./mathKernelSceneAdapter";
import type {
  AnimationStep,
  FormulaBinding,
  MathObjectSpec,
  MathSceneSpec,
  Vec3,
} from "./mathSceneTypes";

export const CUBE_MIDPOINT_PERPENDICULAR_SCENE_ID =
  "cube-midpoint-plane-perpendicular-v1" as const;

const CONCLUSION_NOTE: Readonly<Record<MathKernelLocale, string>> = Object.freeze({
  en: "Conclusion: DB₁ is perpendicular to plane EFG.",
  "zh-CN": "结论：DB₁ 垂直于平面 EFG。",
  "zh-HK": "結論：DB₁ 垂直於平面 EFG。",
});

const CUBE_EDGES = [
  ["A", "B"],
  ["B", "C"],
  ["C", "D"],
  ["D", "A"],
  ["A1", "B1"],
  ["B1", "C1"],
  ["C1", "D1"],
  ["D1", "A1"],
  ["A", "A1"],
  ["B", "B1"],
  ["C", "C1"],
  ["D", "D1"],
] as const satisfies readonly (readonly [
  CubeMidpointPerpendicularPointId,
  CubeMidpointPerpendicularPointId,
])[];

function worldPoint(
  points: CubeMidpointPerpendicularProofDto["renderPoints"],
  id: CubeMidpointPerpendicularPointId,
): Vec3 {
  const point = points[id];
  return [point[0], point[1], point[2]];
}

function cubeEdgeObjects(
  points: CubeMidpointPerpendicularProofDto["renderPoints"],
): MathObjectSpec[] {
  return CUBE_EDGES.map(([a, b]) => ({
    type: "parametricCurve",
    id: `cube-edge-${a}-${b}`,
    samples: [worldPoint(points, a), worldPoint(points, b)],
    colorRole: "reference",
    conceptId: "cube-frame",
    style: {
      strokeOpacity: 0.62,
      strokeWidth: 4,
    },
  }));
}

function formulaToken(
  proof: CubeMidpointPerpendicularProofDto,
  tokenId: CubeMidpointPerpendicularFormulaTokenId,
) {
  const token = proof.formula.tokens.find((entry) => entry.id === tokenId);
  if (!token) {
    throw new Error(`Cube proof DTO is missing formula token ${tokenId}.`);
  }
  return token;
}

function buildObjects(
  proof: CubeMidpointPerpendicularProofDto,
  options: { readonly finalState?: boolean } = {},
): MathObjectSpec[] {
  const point = proof.renderPoints;
  const p = (id: CubeMidpointPerpendicularPointId) => worldPoint(point, id);
  const finalState = options.finalState === true;

  return [
    ...cubeEdgeObjects(point),
    {
      type: "parametricCurve",
      id: "midpoint-path-E",
      samples: [p("A"), p("E")],
      colorRole: "reference",
      conceptId: "proof-midpoint-e",
      style: { strokeOpacity: 0, strokeWidth: 0 },
    },
    {
      type: "parametricCurve",
      id: "midpoint-path-F",
      samples: [p("B"), p("F")],
      colorRole: "reference",
      conceptId: "proof-midpoint-f",
      style: { strokeOpacity: 0, strokeWidth: 0 },
    },
    {
      type: "parametricCurve",
      id: "midpoint-path-G",
      samples: [p("C"), p("G")],
      colorRole: "reference",
      conceptId: "proof-midpoint-g",
      style: { strokeOpacity: 0, strokeWidth: 0 },
    },
    {
      type: "movingPoint",
      id: "point-E",
      pathObjectId: "midpoint-path-E",
      colorRole: "probe",
      conceptId: "proof-midpoint-e",
    },
    {
      type: "movingPoint",
      id: "point-F",
      pathObjectId: "midpoint-path-F",
      colorRole: "probe",
      conceptId: "proof-midpoint-f",
    },
    {
      type: "movingPoint",
      id: "point-G",
      pathObjectId: "midpoint-path-G",
      colorRole: "probe",
      conceptId: "proof-midpoint-g",
    },
    {
      type: "vector",
      id: "vector-EF",
      from: p("E"),
      to: p("F"),
      colorRole: "attention",
      conceptId: "proof-plane-vector-ef",
      style: { strokeWidth: 7 },
    },
    {
      type: "vector",
      id: "vector-EG",
      from: p("E"),
      to: p("G"),
      colorRole: "attention",
      conceptId: "proof-plane-vector-eg",
      style: { strokeWidth: 7 },
    },
    {
      type: "vector",
      id: "vector-normal",
      from: p("E"),
      to: p("N"),
      colorRole: "area",
      conceptId: "proof-plane-normal",
      style: { strokeWidth: 8 },
    },
    {
      type: "vector",
      id: "vector-DB1",
      from: p("D"),
      to: p("B1"),
      colorRole: "function",
      conceptId: "proof-conclusion",
      style: { strokeOpacity: finalState ? 1 : 0, strokeWidth: 8 },
    },
    {
      type: "parametricSurface",
      id: "plane-EFG",
      samples: [
        [p("E"), p("F")],
        [p("H"), p("G")],
      ],
      uRange: [0, 1],
      vRange: [0, 1],
      colorRole: "surface",
      conceptId: "proof-conclusion",
      style: {
        fillOpacity: finalState ? 0.24 : 0,
        fillRole: "surface",
        // The surface fill is the teaching signal. A transparent wireframe
        // prevents the runtime's zero-progress seed row from leaking before
        // the revealSurface beat begins.
        strokeOpacity: 0,
        strokeRole: "surface",
        strokeWidth: 3,
      },
    },
  ];
}

function binding(
  proof: CubeMidpointPerpendicularProofDto,
  tokenId: CubeMidpointPerpendicularFormulaTokenId,
  objectId: string,
  anchorName: FormulaBinding["anchorName"],
  conceptId = formulaToken(proof, tokenId).conceptId,
): FormulaBinding {
  return {
    anchorName,
    conceptId,
    formulaId: proof.formula.id,
    objectId,
    tokenId,
  };
}

function buildBindings(
  proof: CubeMidpointPerpendicularProofDto,
): FormulaBinding[] {
  return [
    binding(proof, "point-E", "point-E", "top"),
    binding(proof, "point-F", "point-F", "top"),
    binding(proof, "point-G", "point-G", "top"),
    binding(proof, "vector-EF", "vector-EF", "upperRight"),
    binding(proof, "vector-EG", "vector-EG", "upperRight"),
    binding(proof, "normal-n", "vector-normal", "upperRight"),
    // MathSceneSpec v1 gives each object one static concept. DB1 must reserve
    // that concept for the final two-object conclusion highlight, so its
    // intermediate token remains screen-fixed and is activated by the
    // phase-safe `proof-target-line` composition rather than a stale binding.
    binding(proof, "conclusion", "vector-DB1", "upperRight"),
    binding(proof, "conclusion", "plane-EFG", "upperRight"),
  ];
}

function buildAnimationPlans(): NonNullable<MathSceneSpec["animationPlans"]> {
  return [
    {
      duration: 1.05,
      id: "reveal-plane-EFG",
      objectId: "plane-EFG",
      operations: [
        { type: "setFill", fillOpacity: 0.24, fillRole: "surface" },
      ],
      targetObjectId: "plane-EFG:revealed",
    },
    {
      duration: 1.05,
      id: "reveal-vector-DB1",
      objectId: "vector-DB1",
      operations: [
        {
          type: "setStroke",
          strokeOpacity: 1,
          strokeRole: "function",
          strokeWidth: 8,
        },
      ],
      targetObjectId: "vector-DB1:revealed",
    },
  ];
}

function buildAnimationCompositions(): NonNullable<MathSceneSpec["animationCompositions"]> {
  return [
    {
      animationPlanIds: ["reveal-plane-EFG"],
      id: "proof-plane-surface",
      runTime: 1.05,
      type: "animationGroup",
    },
    {
      animationPlanIds: ["reveal-vector-DB1"],
      id: "proof-target-line",
      runTime: 1.05,
      type: "animationGroup",
    },
  ];
}

function fullTimeline(): AnimationStep[] {
  return [
    {
      type: "moveAlongPath",
      objectId: "point-E",
      pathObjectId: "midpoint-path-E",
      duration: 1.15,
    },
    {
      type: "moveAlongPath",
      objectId: "point-F",
      pathObjectId: "midpoint-path-F",
      duration: 1.15,
    },
    {
      type: "moveAlongPath",
      objectId: "point-G",
      pathObjectId: "midpoint-path-G",
      duration: 1.15,
    },
    {
      type: "growFromCenter",
      objectId: "vector-EF",
      duration: 0.85,
      easing: "smooth",
    },
    {
      type: "growFromCenter",
      objectId: "vector-EG",
      duration: 0.85,
      easing: "smooth",
    },
    {
      type: "animationComposition",
      compositionId: "proof-plane-surface",
      duration: 1.05,
    },
    {
      type: "growFromCenter",
      objectId: "vector-normal",
      duration: 0.95,
      easing: "smooth",
    },
    {
      type: "cameraTo",
      shotId: "proof-shot",
      duration: 1,
    },
    {
      type: "animationComposition",
      compositionId: "proof-target-line",
      duration: 1.05,
    },
    {
      type: "highlight",
      conceptId: "proof-plane-normal",
      duration: 0.8,
    },
    {
      type: "highlight",
      conceptId: "proof-conclusion",
      duration: 1,
    },
    {
      type: "highlight",
      conceptId: "proof-conclusion",
      duration: 1.4,
    },
  ];
}

export function buildCubeMidpointPerpendicularScene(
  proof: CubeMidpointPerpendicularProofDto,
  locale: MathKernelLocale,
  options: { readonly reducedMotion?: boolean } = {},
): MathSceneSpec {
  const reducedMotion = options.reducedMotion === true;
  const objects = buildObjects(proof, { finalState: reducedMotion });
  const bindings = buildBindings(proof);
  const formulas = [{
    id: proof.formula.id,
    // The exact formula is intentionally unchanged inside explicit display
    // delimiters. MathText only auto-detects short bare expressions, while
    // this multi-line proof is longer than that shared heuristic permits.
    latex: `\\[${proof.formula.latex}\\]`,
    tokens: proof.formula.tokens.map((token) => ({
      conceptId: token.conceptId,
      id: token.id,
      text: token.text,
    })),
  }];

  return {
    // Motion preference changes presentation, not the identity of the proof.
    sceneId: CUBE_MIDPOINT_PERPENDICULAR_SCENE_ID,
    familyId: "three-space-vectors-lines-planes",
    coordinateSpace: {
      mathRange: {
        x: [-0.5, 2.5],
        y: [-1.25, 2.5],
        z: [-0.5, 2.5],
      },
      worldRange: {
        x: [-0.5, 2.5],
        y: [-0.5, 2.5],
        z: [-1.25, 2.5],
      },
    },
    ...(reducedMotion
      ? {}
      : {
          animationPlans: buildAnimationPlans(),
          animationCompositions: buildAnimationCompositions(),
        }),
    objects,
    formulas,
    bindings,
    cameraShots: [
      {
        id: "overview",
        position: [5.4, 4.2, 5.8] satisfies Vec3,
        target: [1, 1, 1] satisfies Vec3,
        fov: 42,
      },
      {
        id: "proof-shot",
        position: [4.8, 3.4, 5.2] satisfies Vec3,
        target: [1.35, 0.85, 1] satisfies Vec3,
        fov: 38,
      },
    ],
    timeline: reducedMotion
      ? [{
          type: "wait",
          duration: 1,
          holdOnWait: true,
          note: CONCLUSION_NOTE[locale],
        }]
      : fullTimeline(),
    diagnostics: {
      expectedObjectCount: objects.length,
      expectedTokenCount: formulas[0].tokens.length,
      expectedBindingCount: bindings.length,
    },
  };
}
