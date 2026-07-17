import { redirect } from "next/navigation";
import { TeacherInboxManager } from "@/components/teacher/TeacherManagementViews";
import { getTeacherInboxData } from "@/lib/server/userStore";
import { emptyTeacherInboxData } from "../../emptyTeacherData";
import { getTeacherFoundationForPage, getTeacherShellForLayout } from "../../getTeacherFoundation";

export default async function TeacherCommunicationsInboxPage({ searchParams }: { searchParams: Promise<{ thread?: string; filter?: string }> }) {
  const shell = await getTeacherShellForLayout();
  const params = await searchParams;
  if (!shell.classes.length) {
    return <TeacherInboxManager inbox={emptyTeacherInboxData} />;
  }

  const foundation = await getTeacherFoundationForPage();
  const inbox = await getTeacherInboxData(foundation.teacher.id, params.thread);

  if (!inbox) {
    redirect("/teacher/dashboard");
  }

  return <TeacherInboxManager inbox={inbox} />;
}
