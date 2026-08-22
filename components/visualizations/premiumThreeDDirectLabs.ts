import type { FeaturedLabDefinition } from "@/data/visualizationLabs";
import {
  premiumThreeDDirectCatalogSnapshot,
  premiumThreeDDirectLabIds
} from "@/components/visualizations/generated/premiumThreeDDirectCatalog.generated";
import { isLivePremiumThreeDLab } from "@/components/visualizations/three/premiumThreeDLiveContract";

export { premiumThreeDDirectLabIds };

export function buildPremiumThreeDTopicStaticParams() {
  return premiumThreeDDirectLabIds.map((labId) => ({ labId }));
}

export function getPremiumThreeDDirectLab(labId: string): FeaturedLabDefinition | null {
  const lab = premiumThreeDDirectCatalogSnapshot[labId];
  return lab && isLivePremiumThreeDLab(lab) ? lab : null;
}
