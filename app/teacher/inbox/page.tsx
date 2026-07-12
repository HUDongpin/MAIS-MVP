import { redirect } from "next/navigation";

export default async function TeacherInboxPage({ searchParams }: { searchParams: Promise<{ thread?: string; filter?: string }> }) {
  const params = await searchParams;
  const nextParams = new URLSearchParams();
  if (params.thread) nextParams.set("thread", params.thread);
  if (params.filter) nextParams.set("filter", params.filter);
  redirect(`/teacher/communications/inbox${nextParams.toString() ? `?${nextParams.toString()}` : ""}`);
}
