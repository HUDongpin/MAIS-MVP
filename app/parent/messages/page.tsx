import { notFound } from "next/navigation";
import { ParentMessagesView } from "@/components/parent/ParentViews";
import { getParentMessagesData } from "@/lib/server/userStore";
import { getParentFoundationForPage } from "../getParentFoundation";

export default async function ParentMessagesPage({ searchParams }: { searchParams: Promise<{ studentId?: string; thread?: string }> }) {
  const params = await searchParams;
  const foundation = await getParentFoundationForPage(params.studentId);
  const data = await getParentMessagesData(foundation.parent.id, params.studentId, params.thread);

  if (!data) notFound();

  return <ParentMessagesView initialData={data} />;
}
