import { ParentOverview } from "@/components/parent/ParentViews";
import { getParentFoundationForPage } from "./getParentFoundation";

export default async function ParentPage({ searchParams }: { searchParams: Promise<{ studentId?: string }> }) {
  const params = await searchParams;
  const foundation = await getParentFoundationForPage(params.studentId);

  return <ParentOverview data={foundation} />;
}
