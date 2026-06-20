import type { VisualizationTemplateId } from "../visualizationTemplateIds";
import { isThreeDFamilyReady } from "./ThreeDLabSceneRegistry";
import { isMaisManimFamily } from "./manim/mathSceneRegistry";
import {
  buildThreeDStateSummary,
  familyForVisualizationTemplate
} from "./threeDSceneMath";
import type { ThreeDCanvasRuntime, ThreeDStateSummary, ThreeDFamilyId } from "./threeDSceneTypes";

export type ConfiguredThreeDRenderPlanInput = {
  comparison: number;
  explicitFamilyId?: ThreeDFamilyId | null;
  mode: number;
  templateId: VisualizationTemplateId;
  value: number;
};

export type ConfiguredThreeDRenderPlan = {
  familyId: ThreeDFamilyId;
  runtime: ThreeDCanvasRuntime;
  showThreeDCanvas: boolean;
  state: ThreeDStateSummary;
};

export function resolveConfiguredThreeDRenderPlan({
  comparison,
  explicitFamilyId,
  mode,
  templateId,
  value
}: ConfiguredThreeDRenderPlanInput): ConfiguredThreeDRenderPlan {
  const familyId = explicitFamilyId ?? familyForVisualizationTemplate(templateId);
  const state = buildThreeDStateSummary({
    comparison,
    familyId,
    mode,
    templateId,
    value
  });

  return {
    familyId,
    runtime: isMaisManimFamily(familyId) ? "mais-manim" : "primitive",
    showThreeDCanvas: isThreeDFamilyReady(familyId),
    state
  };
}
