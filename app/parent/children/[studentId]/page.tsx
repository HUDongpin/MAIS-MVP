import { notFound } from "next/navigation";
import { ParentChildDetail } from "@/components/parent/ParentViews";
import { getParentChildSummary } from "@/lib/server/userStore";
import { getParentFoundationForPage } from "../../getParentFoundation";

export default async function ParentChildPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const foundation = await getParentFoundationForPage(studentId);
  const child = await getParentChildSummary(foundation.parent.id, studentId);

  if (!child) notFound();

  return <ParentChildDetail child={child} />;
}
