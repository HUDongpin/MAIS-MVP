import type {
  CaliforniaPhase4IndependentReferenceSceneEntry
} from "./california-signature-final-compositor-phase4-independent-reference-renderer-contract";

export const CALIFORNIA_PHASE4_INDEPENDENT_REFERENCE_TARGET_PLAN_SHA256 =
  "e353dbf78785a92410d367f5f12a4ecbb2ff5df081c58bdddd17dcd493818663";

const PAPER = [251, 251, 248, 255] as const;
const GRID = [222, 232, 239, 255] as const;
const CARMINE = [200, 30, 79, 255] as const;
const BLUE = [47, 111, 159, 255] as const;

const ABSOLUTE_VALUE_SCENE = {
  backgroundRgba: PAPER,
  curveRgba: CARMINE,
  gridRgba: GRID,
  insideIntercept: 0,
  insideLineRgba: BLUE,
  insideSlope: 1,
  kind: "absolute-value-fold",
  sceneId: "absolute-value-fold-m1-b0-complete-v1",
  world: { xMax: 8, xMin: -8, yMax: 8, yMin: -8 }
} as const;

const SHAPE_SCENE = {
  backgroundRgba: PAPER,
  badgeRgba: BLUE,
  closed: true,
  equalSides: true,
  gridRgba: GRID,
  halfExtentWorldMilli: 3_677,
  kind: "square-defining-attributes",
  outlineRgba: CARMINE,
  sceneId: "square-equal-closed-turn0-size3-v1",
  sides: 4,
  turnDegrees: 0,
  worldRadiusMilli: 10_600
} as const;

function deepFreeze<T>(value: T): T {
  if (value === null || (typeof value !== "object" && typeof value !== "function")) return value;
  for (const key of Reflect.ownKeys(value as object)) {
    deepFreeze((value as Record<PropertyKey, unknown>)[key]);
  }
  return Object.freeze(value);
}

export const CALIFORNIA_PHASE4_INDEPENDENT_REFERENCE_SCENES = deepFreeze([
  {
    scene: ABSOLUTE_VALUE_SCENE,
    target: {
      axisId: "desktop-en-dark",
      backingSize: { height: 1100, width: 1440 },
      benchId: "AbsoluteValueLab",
      bindingKey: "AbsoluteValueLab/canvasRef/ctx@0",
      canvasIndex: 0,
      classId: "desktop-chrome-source-dpr-cap-2",
      clipSize: { height: 1100, width: 1440 },
      cssSize: { height: 1100, width: 1440 },
      groupKey: "desktop-chrome\u0000AbsoluteValueLab\u0000desktop-en-dark\u0000layout",
      labId: "us-ca-math-p6-chapter-02",
      projectName: "desktop-chrome",
      reviewedClassSha256: "8b408d2fccfda253ce14a9b528c3f22c72ea3fbe829e9b5f92caa1eb66188979",
      reviewedPoliciesSha256: "780c0996b9c83d1d18dc26a9ce546e7864045606c9412af516334df503d51d72",
      targetSha256: "e5b3670a1310313f65208da19b5fcefe4898fa28f0fc323acec92a48462c4660"
    }
  },
  {
    scene: SHAPE_SCENE,
    target: {
      axisId: "desktop-en-dark",
      backingSize: { height: 1100, width: 1440 },
      benchId: "ShapesLab",
      bindingKey: "ShapesLab/canvasRef/ctx@0",
      canvasIndex: 0,
      classId: "desktop-chrome-source-dpr-cap-3",
      clipSize: { height: 1100, width: 1440 },
      cssSize: { height: 1100, width: 1440 },
      groupKey: "desktop-chrome\u0000ShapesLab\u0000desktop-en-dark\u0000layout",
      labId: "us-ca-math-k-k-g-shapes-position",
      projectName: "desktop-chrome",
      reviewedClassSha256: "23a1feebee48ae5e04e88d7010f147ddf29a3242467335746937d4a370c6a96a",
      reviewedPoliciesSha256: "e7869cc9f42bc96ac4a7d442f69b10724eddd9013376960f144eff4aa65e01b0",
      targetSha256: "87c4ef8bc22aceb92afe30506e7e951e375c6655cd4729f2ad000d06d6a7bc4a"
    }
  },
  {
    scene: ABSOLUTE_VALUE_SCENE,
    target: {
      axisId: "mobile-en-dark",
      backingSize: { height: 1454, width: 786 },
      benchId: "AbsoluteValueLab",
      bindingKey: "AbsoluteValueLab/canvasRef/ctx@0",
      canvasIndex: 0,
      classId: "mobile-chrome-source-dpr-cap-2",
      clipSize: { height: 727, width: 393 },
      cssSize: { height: 727, width: 393 },
      groupKey: "mobile-chrome\u0000AbsoluteValueLab\u0000mobile-en-dark\u0000layout",
      labId: "us-ca-math-p6-chapter-02",
      projectName: "mobile-chrome",
      reviewedClassSha256: "f2b3d94949d3f23ad22c89b59d2c8348dd1cd1eebaeb285589a441b0bc90bff2",
      reviewedPoliciesSha256: "e55378dd5155ba055543001351df2753f4ad7eb9d5e2527828a7c222f293e2f3",
      targetSha256: "8b084085ccb19535bbe136044551a5f3711a91887d9cc7a1dabe02194149081f"
    }
  },
  {
    scene: SHAPE_SCENE,
    target: {
      axisId: "mobile-en-dark",
      backingSize: { height: 1999, width: 1081 },
      benchId: "ShapesLab",
      bindingKey: "ShapesLab/canvasRef/ctx@0",
      canvasIndex: 0,
      classId: "mobile-chrome-source-dpr-cap-3",
      clipSize: { height: 727, width: 393 },
      cssSize: { height: 727, width: 393 },
      groupKey: "mobile-chrome\u0000ShapesLab\u0000mobile-en-dark\u0000layout",
      labId: "us-ca-math-k-k-g-shapes-position",
      projectName: "mobile-chrome",
      reviewedClassSha256: "a9c8dc011eff374930bf3daf1bd63c7bc42a2c382ee143edf6ac488f089c7bdb",
      reviewedPoliciesSha256: "120d04dd4587c8a47e90fc6040edeee4217246a70745181b19ea01ccad02dbf1",
      targetSha256: "e23694b1bcfde98786c9bbca9855bf7111645f97b2113085b6c9e0c6cb3d5276"
    }
  }
] satisfies readonly CaliforniaPhase4IndependentReferenceSceneEntry[]);
