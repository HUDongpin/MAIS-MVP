import { notFound } from "next/navigation";
import { PremiumThreeDDirectRouteShell } from "@/components/visualizations/PremiumThreeDDirectRouteShell";
import { getPremiumThreeDDirectLab } from "@/components/visualizations/premiumThreeDDirectLabs";
import { buildPremiumThreeDTopicStaticParams } from "@/components/visualizations/three/threeDSceneMath";

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

  if (directLab?.threeD?.premiumLaunch) {
    return <PremiumThreeDDirectRouteShell lab={directLab} />;
  }

  notFound();
}
