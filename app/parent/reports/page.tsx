import { notFound } from "next/navigation";
import { ParentReportsView } from "@/components/parent/ParentViews";
import { getParentReportData } from "@/lib/server/userStore";
import { getParentFoundationForPage } from "../getParentFoundation";

export default async function ParentReportsPage({ searchParams }: { searchParams: Promise<{ studentId?: string }> }) {
  const params = await searchParams;
  const foundation = await getParentFoundationForPage(params.studentId);
  const data = await getParentReportData(foundation.parent.id, params.studentId);

  if (!data) notFound();

  return <ParentReportsView data={data} />;
}
