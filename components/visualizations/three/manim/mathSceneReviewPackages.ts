export const MANIM_REVIEW_PACKAGE_SOURCE_CONTRACT =
  "MAIS Manim v2 review packages: deterministic file ownership slices for scene, mobject, animation, camera, formula, authoring, evidence, and integration review" as const;

export const manimReviewPackageIds = [
  "scene",
  "mobject",
  "animation",
  "camera",
  "formula",
  "authoring",
  "evidence",
  "integration"
] as const;

export type ManimReviewPackageId = (typeof manimReviewPackageIds)[number];

export type ManimReviewPackageDefinition = {
  anchorFileNames: string[];
  id: ManimReviewPackageId;
  purpose: string;
  suggestedTestFileNames: string[];
  title: string;
};

export type ManimReviewPackageEvidence = ManimReviewPackageDefinition & {
  fileCount: number;
  fileNames: string[];
  productionFileCount: number;
  sourceContract: typeof MANIM_REVIEW_PACKAGE_SOURCE_CONTRACT;
  testFileCount: number;
  unclassifiedFileNames: string[];
};

const packageDefinitions: ManimReviewPackageDefinition[] = [
  {
    anchorFileNames: ["mathSceneRegistry.ts", "mathSceneRuntimeState.ts", "mathTimeline.ts"],
    id: "scene",
    purpose: "Scene specs, lifecycle state, timeline beats, playback, file-writer flow, and scene graph contracts.",
    suggestedTestFileNames: ["mathSceneRegistry.test.ts", "mathSceneRuntimeState.test.ts", "mathTimeline.test.ts"],
    title: "Scene Core"
  },
  {
    anchorFileNames: ["mathMobjectFamily.ts", "mathMobjectState.ts", "mathVMobjectStyle.ts"],
    id: "mobject",
    purpose: "Mobject and VMobject geometry, state, point clouds, coordinate helpers, updaters, and render-state payloads.",
    suggestedTestFileNames: ["mathMobjectFamily.test.ts", "mathMobjectState.test.ts", "mathVMobjectStyle.test.ts"],
    title: "Mobject Geometry"
  },
  {
    anchorFileNames: ["mathAnimationBuilder.ts", "mathAnimationRuntime.ts", "mathTransformBeginPlan.ts"],
    id: "animation",
    purpose: "Animation builders, transform alignment, creation/indication primitives, timing, and interpolation schedules.",
    suggestedTestFileNames: [
      "mathAnimationBuilder.test.ts",
      "mathAnimationRuntime.test.ts",
      "mathTransformBeginPlan.test.ts"
    ],
    title: "Animation Runtime"
  },
  {
    anchorFileNames: ["mathCameraDirector.ts", "mathCameraFrame.ts", "mathCameraShotAuthoring.ts"],
    id: "camera",
    purpose: "Camera frame state, shot authoring, timeline-directed camera motion, and renderer camera adapters.",
    suggestedTestFileNames: [
      "mathCameraDirector.test.ts",
      "mathCameraFrame.test.ts",
      "mathCameraShotAuthoring.test.ts"
    ],
    title: "Camera System"
  },
  {
    anchorFileNames: ["mathFormulaBindings.ts", "mathFormulaLayer.ts", "mathTexCompilePipeline.ts"],
    id: "formula",
    purpose: "Formula tokens, projected labels, TeX/SVG cache flow, color semantics, and formula-to-object bindings.",
    suggestedTestFileNames: [
      "mathFormulaBindings.test.ts",
      "mathFormulaLayer.test.ts",
      "mathTexCompilePipeline.test.ts"
    ],
    title: "Formula Layer"
  },
  {
    anchorFileNames: ["mathParameterPanel.ts", "mathSceneCheckpoint.ts", "mathSceneSelectorCatalog.ts"],
    id: "authoring",
    purpose: "Interactive authoring controls, checkpoints, selectors, capture controls, keyboard/pointer controls, and review UX hooks.",
    suggestedTestFileNames: [
      "mathParameterPanel.test.ts",
      "mathSceneCheckpoint.test.ts",
      "mathSceneSelectorCatalog.test.ts"
    ],
    title: "Authoring Controls"
  },
  {
    anchorFileNames: ["mathEvidenceHarness.ts", "mathSceneExport.ts", "mathSceneTeachingQuality.ts"],
    id: "evidence",
    purpose: "Cross-package QA evidence, export approval, teaching-quality precheck, source contracts, and smoke/reporting attributes.",
    suggestedTestFileNames: [
      "mathEvidenceHarness.test.ts",
      "mathSceneExport.test.ts",
      "mathSceneTeachingQuality.test.ts"
    ],
    title: "Evidence And QA"
  },
  {
    anchorFileNames: ["MathFormulaOverlay.tsx", "MathSceneRuntime.tsx", "mathSceneSmokeHook.ts"],
    id: "integration",
    purpose: "React runtime bridge, formula overlay bridge, smoke hooks, and canvas-facing integration contracts.",
    suggestedTestFileNames: ["mathSceneSmokeHook.test.ts"],
    title: "Runtime Integration"
  }
];

function includesAny(value: string, needles: string[]) {
  return needles.some((needle) => value.includes(needle));
}

function withoutTestSuffix(fileName: string) {
  return fileName.replace(/\.test(?=\.(ts|tsx)$)/, "");
}

function sortFileNames(fileNames: string[]) {
  return [...fileNames].sort((left, right) => left.localeCompare(right));
}

export function classifyManimReviewPackage(fileName: string): ManimReviewPackageId | null {
  const normalized = withoutTestSuffix(fileName);

  if (
    normalized === "MathSceneRuntime.tsx" ||
    normalized === "MathFormulaOverlay.tsx" ||
    normalized === "mathSceneSmokeHook.ts"
  ) {
    return "integration";
  }

  if (
    includesAny(normalized, [
      "mathEvidenceHarness",
      "mathSceneExport",
      "mathSceneReviewPackageHandoff",
      "mathSceneReviewPackages",
      "mathSceneReviewPackageSlices",
      "mathSceneV2CatalogDecoupledFixtures",
      "mathSceneV2ClosureEvidencePackage",
      "mathSceneV2CompletionAcceptanceChecklist",
      "mathSceneV2CompletionClosureQueue",
      "mathSceneV2CompletionEvidenceIntake",
      "mathSceneV2CompletionRerunPlan",
      "mathSceneV2CompletionStatusSummary",
      "mathSceneV2CrossAgentHandoff",
      "mathSceneV2FinalCompletionDossier",
      "mathSceneV2FinalAuditEvidenceId",
      "mathSceneV2FinalClosureAudit",
      "mathSceneV2FinalObjectiveAuditRecordIntake",
      "mathSceneV2FinalObjectiveAuditRequestPacket",
      "mathSceneV2FinalOwnerClosurePacket",
      "mathSceneV2FinalObjectiveProofLedger",
      "mathSceneV2FinalObjectiveVerifiedClosurePipeline",
      "mathSceneV2GoalGate",
      "mathSceneV2ObjectiveCompletionAudit",
      "mathSceneV2OwnerGateHandoffBundle",
      "mathSceneV2OwnerGateRerunIntake",
      "mathSceneV2OwnerGateRerunCommandPacket",
      "mathSceneV2OwnerGateRerunCommandEvidenceIntake",
      "mathSceneV2OwnerGateRerunCommandTranscriptIntake",
      "mathSceneV2OwnerGateTranscriptRequestPacket",
      "mathSceneV2OwnerEvidenceRequestPacket",
      "mathSceneV2OwnerEvidenceSubmissionIntake",
      "mathSceneV2ReleaseSliceManifest",
      "mathSceneV2SourceArchitectureHandoff",
      "mathSceneV2TranscriptVerifiedClosurePipeline",
      "mathSceneV2VerifiedClosurePipeline",
      "mathSceneTeachingReviewBrief",
      "mathSceneTeachingReviewCases",
      "mathSceneTeachingA06FinalReviewHandoffPacket",
      "mathSceneTeachingA06SourceConfirmationLedger",
      "mathSceneTeachingFinalDecisionIntake",
      "mathSceneTeachingFinalDecisionLedger",
      "mathSceneTeachingFinalReviewPacket",
      "mathSceneTeachingSignoffMatrix",
      "mathSceneTeachingInspectionTargets",
      "mathSceneTeachingRenderedReviewRoutes",
      "mathSceneTeachingReviewDossier",
      "mathSceneTeachingQuality",
      "mathConfigDigest",
      "mathSceneFrameAudit"
    ])
  ) {
    return "evidence";
  }

  if (normalized.includes("Camera")) return "camera";

  if (
    includesAny(normalized, [
      "Formula",
      "Tex",
      "ProjectedLabels",
      "SvgPathMorph"
    ])
  ) {
    return "formula";
  }

  if (
    includesAny(normalized, [
      "Animation",
      "Transform",
      "Fade",
      "Grow",
      "Creation",
      "Indication",
      "Lag",
      "Rate",
      "SubAlpha",
      "ShowCreation",
      "DrawBorderThenFill"
    ])
  ) {
    return "animation";
  }

  if (
    includesAny(normalized, [
      "Checkpoint",
      "Capture",
      "ParameterPanel",
      "SelectorCatalog",
      "RenderQuality",
      "RunFromBeat",
      "ShortcutCatalog",
      "KeyControls",
      "PointerControls",
      "WindowEvents",
      "History",
      "StateSnapshot",
      "ReloadPlan",
      "SkipControl",
      "SkippingWindow",
      "ProgressControl",
      "WaitControl",
      "PresenterHold",
      "InteractLoop"
    ])
  ) {
    return "authoring";
  }

  if (
    includesAny(normalized, [
      "Mobject",
      "VMobject",
      "ObjectTransform",
      "Coordinate",
      "Axis",
      "Curve",
      "Surface",
      "VectorField",
      "StreamLine",
      "StreamLines",
      "Ode",
      "PathFunctions",
      "RuntimeRenderState",
      "TracingTail",
      "ValueTracker",
      "Always",
      "Updater"
    ])
  ) {
    return "mobject";
  }

  if (normalized.startsWith("mathScene") || normalized.startsWith("mathTimeline")) return "scene";

  return null;
}

function isTestFile(fileName: string) {
  return fileName.endsWith(".test.ts") || fileName.endsWith(".test.tsx");
}

function existingAnchors(anchorFileNames: string[], fileNames: Set<string>) {
  return anchorFileNames.filter((fileName) => fileNames.has(fileName));
}

export function buildManimReviewPackageMatrix(fileNames: string[]): ManimReviewPackageEvidence[] {
  const sortedFileNames = sortFileNames(fileNames);
  const fileNameSet = new Set(sortedFileNames);
  const filesByPackage = new Map<ManimReviewPackageId, string[]>(
    manimReviewPackageIds.map((id) => [id, []])
  );
  const unclassifiedFileNames: string[] = [];

  for (const fileName of sortedFileNames) {
    const packageId = classifyManimReviewPackage(fileName);
    if (!packageId) {
      unclassifiedFileNames.push(fileName);
      continue;
    }

    filesByPackage.get(packageId)?.push(fileName);
  }

  return packageDefinitions.map((definition, index) => {
    const packageFileNames = sortFileNames(filesByPackage.get(definition.id) ?? []);
    const testFileCount = packageFileNames.filter(isTestFile).length;

    return {
      ...definition,
      anchorFileNames: existingAnchors(definition.anchorFileNames, fileNameSet),
      fileCount: packageFileNames.length,
      fileNames: packageFileNames,
      productionFileCount: packageFileNames.length - testFileCount,
      sourceContract: MANIM_REVIEW_PACKAGE_SOURCE_CONTRACT,
      suggestedTestFileNames: existingAnchors(definition.suggestedTestFileNames, fileNameSet),
      testFileCount,
      unclassifiedFileNames: index === 0 ? sortFileNames(unclassifiedFileNames) : []
    };
  });
}

export function manimReviewPackageDataAttributes(matrix: ManimReviewPackageEvidence[]) {
  const unclassifiedCount = matrix.reduce((sum, reviewPackage) => sum + reviewPackage.unclassifiedFileNames.length, 0);
  const totalFileCount = matrix.reduce((sum, reviewPackage) => sum + reviewPackage.fileCount, 0);
  const summary = matrix
    .map((reviewPackage) => `${reviewPackage.id}=${reviewPackage.productionFileCount}/${reviewPackage.testFileCount}`)
    .join(";");

  return {
    "data-viz-manim-review-package-count": String(matrix.length),
    "data-viz-manim-review-package-file-count": String(totalFileCount),
    "data-viz-manim-review-package-source-contract": MANIM_REVIEW_PACKAGE_SOURCE_CONTRACT,
    "data-viz-manim-review-package-summary": summary,
    "data-viz-manim-review-package-unclassified-count": String(unclassifiedCount)
  } as const;
}
