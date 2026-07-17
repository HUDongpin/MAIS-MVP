import { VisualizationLabRouteShell } from "@/components/visualizations/VisualizationLabRouteShell";
import type { GradeId } from "@/types";

type VisualizationLabRoutePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export default async function VisualizationLabRoutePage({ searchParams }: VisualizationLabRoutePageProps) {
  const params = await searchParams;
  const initialGrade = firstSearchParam(params?.grade) as GradeId | null;
  const initialLabId = firstSearchParam(params?.lab);

  return <VisualizationLabRouteShell initialGrade={initialGrade} initialLabId={initialLabId} />;
}
