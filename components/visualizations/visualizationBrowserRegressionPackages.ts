import type {
  FeaturedLabDefinition,
  VisualizationCurriculumTrack
} from "../../data/visualizationLabs";
import { threeDCanvasRequiredDataAttributes } from "./three/threeDCanvasSurfaceContract";
import type { ThreeDSceneVariant } from "./three/threeDSceneTypes";
import { selectPremiumThreeDSceneVariantSmokeLabs } from "./visualizationDiagnostics";

export const VISUALIZATION_BROWSER_REGRESSION_PLAN_SOURCE_CONTRACT =
  "A06/A11 Visualization Lab browser regression split plan: HK demo-safe catalog chunks, premium scene variants, and non-HK account warnings" as const;

type ThreeDCanvasRootDataAttribute = (typeof threeDCanvasRequiredDataAttributes)[number];

export const VISUALIZATION_BROWSER_REGRESSION_RUN_FROM_BEAT_CHECKPOINT_INVALIDATION_DATA_ATTRIBUTES = [
  "data-viz-manim-run-from-beat-checkpoint-invalidates-count",
  "data-viz-manim-run-from-beat-checkpoint-invalidated-keys",
  "data-viz-manim-run-from-beat-checkpoint-invalidation-summary",
  "data-viz-manim-run-from-beat-checkpoint-retained-keys-after-restore",
  "data-viz-manim-run-from-beat-checkpoint-restore-action"
] as const satisfies readonly ThreeDCanvasRootDataAttribute[];

export type VisualizationBrowserRegressionPlanOptions = {
  maxLabsPerPackage?: number;
};

export type VisualizationBrowserRegressionCommandEnv = {
  VISUALIZATION_SWEEP_GRADES?: string;
  VISUALIZATION_SWEEP_LABS?: string;
  VISUALIZATION_SWEEP_TRACKS?: string;
};

export type VisualizationBrowserRegressionPackage = {
  commandEnv: VisualizationBrowserRegressionCommandEnv;
  curriculumTracks: VisualizationCurriculumTrack[];
  grade: string;
  id: string;
  labIds: string[];
  packageKind: "hk-demo-catalog-sweep" | "premium-scene-variant";
  sceneVariant?: ThreeDSceneVariant;
};

export type VisualizationBrowserRegressionPlan = {
  accountScopeWarnings: string[];
  hkDemoSafePackages: VisualizationBrowserRegressionPackage[];
  maxLabsPerPackage: number;
  nonHkDemoAccountTracks: VisualizationCurriculumTrack[];
  premiumSceneVariantPackages: VisualizationBrowserRegressionPackage[];
  premiumSceneVariants: ThreeDSceneVariant[];
  requiredRootDataAttributes: ThreeDCanvasRootDataAttribute[];
  requiredRunFromBeatCheckpointInvalidationDataAttributes: ThreeDCanvasRootDataAttribute[];
  sourceContract: typeof VISUALIZATION_BROWSER_REGRESSION_PLAN_SOURCE_CONTRACT;
};

function compareText(left: string, right: string) {
  return left.localeCompare(right);
}

function uniqueSorted<T extends string>(values: T[]) {
  return [...new Set(values)].sort(compareText);
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

function safeMaxLabsPerPackage(value: number | undefined) {
  if (!Number.isFinite(value) || value === undefined) return 8;
  return Math.max(1, Math.floor(value));
}

function verifiedCanvasRootDataAttributes(
  attributes: readonly ThreeDCanvasRootDataAttribute[]
): ThreeDCanvasRootDataAttribute[] {
  const missingAttributes = attributes.filter((attribute) => !threeDCanvasRequiredDataAttributes.includes(attribute));

  if (missingAttributes.length > 0) {
    throw new Error(`Browser regression plan references non-canonical root data attributes: ${missingAttributes.join(",")}`);
  }

  return [...attributes];
}

function hkDemoSafePackages(labs: FeaturedLabDefinition[], maxLabsPerPackage: number): VisualizationBrowserRegressionPackage[] {
  const hkLabs = labs
    .filter((lab) => lab.curriculumTrack === "HK")
    .sort((left, right) => compareText(left.grade, right.grade) || compareText(left.labId, right.labId));
  const grades = uniqueSorted(hkLabs.map((lab) => lab.grade));

  return grades.flatMap((grade) => {
    const gradeLabs = hkLabs.filter((lab) => lab.grade === grade);

    return chunk(gradeLabs, maxLabsPerPackage).map((packageLabs, index) => {
      const labIds = packageLabs.map((lab) => lab.labId);

      return {
        commandEnv: {
          VISUALIZATION_SWEEP_GRADES: grade,
          VISUALIZATION_SWEEP_LABS: labIds.join(","),
          VISUALIZATION_SWEEP_TRACKS: "HK"
        },
        curriculumTracks: ["HK"],
        grade,
        id: `hk-demo-${grade}-part-${index + 1}`,
        labIds,
        packageKind: "hk-demo-catalog-sweep"
      };
    });
  });
}

function premiumSceneVariantPackages(labs: FeaturedLabDefinition[]): VisualizationBrowserRegressionPackage[] {
  return selectPremiumThreeDSceneVariantSmokeLabs(labs).map((target) => ({
    commandEnv: {
      VISUALIZATION_SWEEP_LABS: target.lab.labId,
      VISUALIZATION_SWEEP_TRACKS: target.lab.curriculumTrack
    },
    curriculumTracks: [target.lab.curriculumTrack],
    grade: target.lab.grade,
    id: `premium-variant-${target.sceneVariant}`,
    labIds: [target.lab.labId],
    packageKind: "premium-scene-variant",
    sceneVariant: target.sceneVariant
  }));
}

export function buildVisualizationBrowserRegressionPlan(
  labs: FeaturedLabDefinition[],
  options: VisualizationBrowserRegressionPlanOptions = {}
): VisualizationBrowserRegressionPlan {
  const maxLabsPerPackage = safeMaxLabsPerPackage(options.maxLabsPerPackage);
  const requiredRunFromBeatCheckpointInvalidationDataAttributes = verifiedCanvasRootDataAttributes(
    VISUALIZATION_BROWSER_REGRESSION_RUN_FROM_BEAT_CHECKPOINT_INVALIDATION_DATA_ATTRIBUTES
  );
  const requiredRootDataAttributes = verifiedCanvasRootDataAttributes(
    uniqueSorted(requiredRunFromBeatCheckpointInvalidationDataAttributes)
  );
  const nonHkDemoAccountTracks = uniqueSorted(
    labs
      .filter((lab) => lab.curriculumTrack !== "HK")
      .map((lab) => lab.curriculumTrack)
  );
  const premiumPackages = premiumSceneVariantPackages(labs);

  return {
    accountScopeWarnings: nonHkDemoAccountTracks.map(
      (track) => `${track} requires a non-HK demo account or per-lab registration; do not include it in the HK demo catalog sweep.`
    ),
    hkDemoSafePackages: hkDemoSafePackages(labs, maxLabsPerPackage),
    maxLabsPerPackage,
    nonHkDemoAccountTracks,
    premiumSceneVariantPackages: premiumPackages,
    premiumSceneVariants: premiumPackages.map((regressionPackage) => regressionPackage.sceneVariant).filter(Boolean) as ThreeDSceneVariant[],
    requiredRootDataAttributes,
    requiredRunFromBeatCheckpointInvalidationDataAttributes,
    sourceContract: VISUALIZATION_BROWSER_REGRESSION_PLAN_SOURCE_CONTRACT
  };
}

export function visualizationBrowserRegressionPlanDataAttributes(plan: VisualizationBrowserRegressionPlan) {
  return {
    "data-viz-browser-regression-plan-hk-package-count": String(plan.hkDemoSafePackages.length),
    "data-viz-browser-regression-plan-hk-package-max-labs": String(plan.maxLabsPerPackage),
    "data-viz-browser-regression-plan-non-hk-tracks": plan.nonHkDemoAccountTracks.join(",") || "none",
    "data-viz-browser-regression-plan-premium-variant-count": String(plan.premiumSceneVariants.length),
    "data-viz-browser-regression-plan-premium-variants": plan.premiumSceneVariants.join(","),
    "data-viz-browser-regression-plan-projection-views": plan.premiumSceneVariants.includes("projection-views") ? "included" : "missing",
    "data-viz-browser-regression-plan-required-root-attribute-count": String(plan.requiredRootDataAttributes.length),
    "data-viz-browser-regression-plan-run-from-beat-checkpoint-invalidation-attributes":
      plan.requiredRunFromBeatCheckpointInvalidationDataAttributes.join(","),
    "data-viz-browser-regression-plan-source-contract": plan.sourceContract
  } as const;
}
