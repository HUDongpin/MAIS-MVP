import { buildApprovedSceneSpecExport } from "./mathSceneExport";
import { buildMathSceneSpecForThreeDFamily, maisManimFamilyIds } from "./mathSceneRegistry";
import type { ThreeDFamilyId, ThreeDStateSummary } from "../threeDSceneTypes";

export type MathSceneSelectorCatalogEntry = {
  approvedForRuntime: boolean;
  cameraShotCount: number;
  familyId: ThreeDFamilyId;
  formulaTokenCount: number;
  label: string;
  objectCount: number;
  sceneId: string;
  semanticBindingCount: number;
  signature: string;
  timelineStepCount: number;
};

export type MathSceneSelectorSummary = {
  activeFamilyId: string;
  activeSceneId: string;
  approvedSceneCount: number;
  familyIds: string;
  sceneCount: number;
  sceneIds: string;
  summary: string;
};

function stateForFamily(state: ThreeDStateSummary, familyId: ThreeDFamilyId): ThreeDStateSummary {
  if (state.familyId === familyId) return state;
  return { ...state, familyId };
}

export function buildMathSceneSelectorCatalogEntry({
  accent,
  familyId,
  state
}: {
  accent: string;
  familyId: ThreeDFamilyId;
  state: ThreeDStateSummary;
}): MathSceneSelectorCatalogEntry | null {
  const scene = buildMathSceneSpecForThreeDFamily({
    accent,
    state: stateForFamily(state, familyId)
  });
  if (!scene) return null;

  const exportPlan = buildApprovedSceneSpecExport(scene);

  return {
    approvedForRuntime: exportPlan.approvedForRuntime,
    cameraShotCount: exportPlan.cameraShotCount,
    familyId,
    formulaTokenCount: exportPlan.formulaTokenCount,
    label: scene.sceneId,
    objectCount: exportPlan.objectCount,
    sceneId: scene.sceneId,
    semanticBindingCount: exportPlan.semanticBindingCount,
    signature: exportPlan.signature,
    timelineStepCount: exportPlan.timelineStepCount
  };
}

export function buildMathSceneSelectorCatalog({
  accent,
  state
}: {
  accent: string;
  state: ThreeDStateSummary;
}): MathSceneSelectorCatalogEntry[] {
  return maisManimFamilyIds.flatMap((familyId) => {
    const entry = buildMathSceneSelectorCatalogEntry({ accent, familyId, state });
    return entry ? [entry] : [];
  });
}

export function summarizeMathSceneSelectorCatalog(
  catalog: MathSceneSelectorCatalogEntry[],
  selectedFamilyId?: string
): MathSceneSelectorSummary {
  const activeEntry = catalog.find((entry) => entry.familyId === selectedFamilyId) ?? catalog[0] ?? null;
  const approvedSceneCount = catalog.filter((entry) => entry.approvedForRuntime).length;
  const familyIds = catalog.map((entry) => entry.familyId).join(",") || "none";
  const sceneIds = catalog.map((entry) => entry.sceneId).join(",") || "none";
  const activeFamilyId = activeEntry?.familyId ?? "none";
  const activeSceneId = activeEntry?.sceneId ?? "none";

  return {
    activeFamilyId,
    activeSceneId,
    approvedSceneCount,
    familyIds,
    sceneCount: catalog.length,
    sceneIds,
    summary: [
      `scenes=${catalog.length}`,
      `approved=${approvedSceneCount}`,
      `selected=${activeSceneId}`,
      `family=${activeFamilyId}`,
      `families=${familyIds}`,
      `sceneIds=${sceneIds}`
    ].join(";")
  };
}

export function mathSceneSelectorDataAttributes(summary: MathSceneSelectorSummary) {
  return {
    "data-viz-manim-scene-selector-approved-count": String(summary.approvedSceneCount),
    "data-viz-manim-scene-selector-count": String(summary.sceneCount),
    "data-viz-manim-scene-selector-family-ids": summary.familyIds,
    "data-viz-manim-scene-selector-scene-ids": summary.sceneIds,
    "data-viz-manim-scene-selector-selected-family-id": summary.activeFamilyId,
    "data-viz-manim-scene-selector-selected-scene-id": summary.activeSceneId,
    "data-viz-manim-scene-selector-summary": summary.summary
  } as const;
}
