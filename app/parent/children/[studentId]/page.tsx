import { notFound } from "next/navigation";
import { ParentChildDetail } from "@/components/parent/ParentViews";
import { getParentChildSummary } from "@/lib/server/userStore";
import { toParentChildSummarySafe } from "@/lib/server/userStore/parentSafeDto";
import { getParentFoundationForPage } from "../../getParentFoundation";

export default async function ParentChildPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const foundation = await getParentFoundationForPage(studentId);
  const child = await getParentChildSummary(foundation.parent.id, studentId);

  if (!child) notFound();
  const safeChild = toParentChildSummarySafe(child);

  return <ParentChildDetail child={safeChild} />;
}
