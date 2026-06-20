import { redirect } from "next/navigation";
import { TeacherInboxManager } from "@/components/teacher/TeacherManagementViews";
import { getTeacherInboxData } from "@/lib/server/userStore";
import { getTeacherFoundationForPage } from "../../getTeacherFoundation";

export default async function TeacherCommunicationsInboxPage({ searchParams }: { searchParams: Promise<{ thread?: string; filter?: string }> }) {
  const foundation = await getTeacherFoundationForPage();
  const params = await searchParams;
  const inbox = await getTeacherInboxData(foundation.teacher.id, params.thread);

  if (!inbox) {
    redirect("/teacher/dashboard");
  }

  return <TeacherInboxManager inbox={inbox} />;
}
