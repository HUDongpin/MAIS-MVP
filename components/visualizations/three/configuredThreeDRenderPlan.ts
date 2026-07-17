import type { VisualizationTemplateId } from "../visualizationTemplateIds";
import { isThreeDFamilyReady } from "./ThreeDLabSceneRegistry";
import { isMaisManimFamily } from "./manim/mathSceneRegistry";
import {
  buildThreeDStateSummary,
  familyForVisualizationTemplate,
  isPremiumThreeDLaunchLab,
  regionalPriorityForThreeDLaunchLab
} from "./threeDSceneMath";
import type {
  ThreeDCanvasRuntime,
  ThreeDCoverageTier,
  ThreeDRegionalPriority,
  ThreeDStateSummary,
  ThreeDFamilyId
} from "./threeDSceneTypes";

export type ConfiguredThreeDRenderPlanInput = {
  comparison: number;
  coverageTier?: ThreeDCoverageTier;
  explicitFamilyId?: ThreeDFamilyId | null;
  labId?: string | null;
  mode: number;
  premiumLaunch?: boolean;
  regionalPriority?: ThreeDRegionalPriority;
  templateId: VisualizationTemplateId;
  threeDEnabled?: boolean;
  value: number;
};

export type ConfiguredThreeDRenderPlan = {
  coverageTier: ThreeDCoverageTier;
  familyId: ThreeDFamilyId;
  premiumLaunch: boolean;
  regionalPriority?: ThreeDRegionalPriority;
  runtime: ThreeDCanvasRuntime;
  showThreeDCanvas: boolean;
  state: ThreeDStateSummary;
};

export function resolveConfiguredThreeDRenderPlan({
  comparison,
  coverageTier,
  explicitFamilyId,
  labId,
  mode,
  premiumLaunch,
  regionalPriority,
  templateId,
  threeDEnabled,
  value
}: ConfiguredThreeDRenderPlanInput): ConfiguredThreeDRenderPlan {
  const familyId = explicitFamilyId ?? familyForVisualizationTemplate(templateId);
  const inferredPremiumLaunch = labId ? isPremiumThreeDLaunchLab(labId) : false;
  const resolvedPremiumLaunch = premiumLaunch ?? inferredPremiumLaunch;
  const resolvedRegionalPriority = regionalPriority ?? (labId ? regionalPriorityForThreeDLaunchLab(labId) : undefined);
  const requiresAudited2DFallback = labId === "us-ca-math-s6-chapter-04" && templateId === "function-family" && familyId === "three-function-family";
  const state = buildThreeDStateSummary({
    comparison,
    familyId,
    mode,
    templateId,
    value
  });

  return {
    coverageTier: coverageTier ?? (resolvedPremiumLaunch ? "premium-3d" : "standard-3d"),
    familyId,
    premiumLaunch: resolvedPremiumLaunch,
    regionalPriority: resolvedRegionalPriority,
    runtime: isMaisManimFamily(familyId) ? "mais-manim" : "primitive",
    showThreeDCanvas: !requiresAudited2DFallback && (threeDEnabled ?? resolvedPremiumLaunch) && isThreeDFamilyReady(familyId),
    state
  };
}
