import { notFound } from "next/navigation";
import { PremiumThreeDDirectRouteShell } from "@/components/visualizations/PremiumThreeDDirectRouteShell";
import {
  buildPremiumThreeDTopicStaticParams,
  getPremiumThreeDDirectLab
} from "@/components/visualizations/premiumThreeDDirectLabs";
import { isLivePremiumThreeDLab } from "@/components/visualizations/three/premiumThreeDLiveContract";

export const dynamicParams = false;

type PremiumThreeDVisualizationTopicPageProps = {
  params: Promise<{
    labId: string;
  }>;
};

function normalizeLabIdParam(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function generateStaticParams() {
  return buildPremiumThreeDTopicStaticParams();
}

export default async function PremiumThreeDVisualizationTopicPage({ params }: PremiumThreeDVisualizationTopicPageProps) {
  const { labId } = await params;
  const normalizedLabId = normalizeLabIdParam(labId);
  const directLab = getPremiumThreeDDirectLab(normalizedLabId);

  if (directLab && isLivePremiumThreeDLab(directLab)) {
    return <PremiumThreeDDirectRouteShell lab={directLab} />;
  }

  notFound();
}
