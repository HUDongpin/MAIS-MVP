import { notFound } from "next/navigation";
import { ParentNoticesView } from "@/components/parent/ParentNoticesView";
import { getParentNoticeData } from "@/lib/server/userStore";
import { getParentFoundationForPage } from "../getParentFoundation";

export default async function ParentNoticesPage({ searchParams }: { searchParams: Promise<{ studentId?: string; recipientId?: string }> }) {
  const params = await searchParams;
  const foundation = await getParentFoundationForPage(params.studentId);
  const data = await getParentNoticeData(foundation.parent.id, {
    selectedStudentId: params.studentId,
    recipientId: params.recipientId
  });

  if (!data) notFound();

  return <ParentNoticesView data={data} targetRecipientId={params.recipientId} />;
}
