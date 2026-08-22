import type { ThreeDVisualizationMetadata } from "./threeDSceneTypes";

type LabWithThreeDMetadata = {
  threeD?: ThreeDVisualizationMetadata;
};

type LabWithModule = LabWithThreeDMetadata & {
  moduleId: string;
};

export const premiumThreeDDirectModuleId = "configured-visualization-lab" as const;

/**
 * The student-facing premium direct-route contract is deliberately stricter
 * than the historical candidate manifest. A lab must opt into both the 3D
 * runtime and premium launch; either flag being false keeps it out of live
 * URLs, static params, and browser smoke packages.
 */
export function isLivePremiumThreeDMetadata(
  threeD: ThreeDVisualizationMetadata | undefined
) {
  return threeD?.enabled === true && threeD.premiumLaunch === true;
}

export function isLivePremiumThreeDLab(lab: LabWithThreeDMetadata) {
  return isLivePremiumThreeDMetadata(lab.threeD);
}

/**
 * A direct premium route preserves the complete catalog entry and changes
 * only the renderer module. Keeping this generic makes future catalog display
 * metadata flow into the generated snapshot without a second field map.
 */
export function projectPremiumThreeDDirectLab<const Lab extends LabWithModule>(
  lab: Lab
): Omit<Lab, "moduleId"> & { moduleId: typeof premiumThreeDDirectModuleId } {
  return {
    ...lab,
    moduleId: premiumThreeDDirectModuleId
  };
}
