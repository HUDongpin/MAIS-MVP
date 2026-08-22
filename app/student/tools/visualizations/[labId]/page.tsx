import { notFound, redirect } from "next/navigation";
import { PremiumThreeDDirectRouteShell } from "@/components/visualizations/PremiumThreeDDirectRouteShell";
import {
  buildPremiumThreeDDirectRouteStaticParams,
  resolvePremiumThreeDDirectRoute
} from "@/components/visualizations/premiumThreeDDirectLabs";

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
  return buildPremiumThreeDDirectRouteStaticParams();
}

export default async function PremiumThreeDVisualizationTopicPage({ params }: PremiumThreeDVisualizationTopicPageProps) {
  const { labId } = await params;
  const normalizedLabId = normalizeLabIdParam(labId);
  const resolution = resolvePremiumThreeDDirectRoute(normalizedLabId);

  if (resolution.kind === "direct") {
    return <PremiumThreeDDirectRouteShell lab={resolution.lab} />;
  }

  if (resolution.kind === "catalog-fallback") redirect(resolution.href);

  notFound();
}
