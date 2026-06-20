import { notFound } from "next/navigation";
import { buildPremiumThreeDTopicStaticParams } from "@/components/visualizations/three/threeDSceneMath";

type PremiumThreeDVisualizationTopicPageProps = {
  params: Promise<{
    labId: string;
  }>;
};

export const dynamicParams = false;

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
  const [{ getVisualizationLabByLabId }, { VisualizationLabPage }] = await Promise.all([
    import("@/data/visualizationLabs"),
    import("@/components/visualizations/VisualizationLabPage")
  ]);
  const lab = getVisualizationLabByLabId(normalizeLabIdParam(labId));

  if (!lab?.threeD?.premiumLaunch) {
    notFound();
  }

  return <VisualizationLabPage initialGrade={lab.grade} initialLabId={lab.labId} />;
}
