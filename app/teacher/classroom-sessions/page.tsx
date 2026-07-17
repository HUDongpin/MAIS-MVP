import { redirect } from "next/navigation";
import { TeacherLiveView } from "@/components/teacher/TeacherLiveView";
import { getTeacherLiveData } from "@/lib/server/userStore";
import { emptyTeacherLiveData } from "../emptyTeacherData";
import { getTeacherFoundationForPage, getTeacherShellForLayout } from "../getTeacherFoundation";

export default async function TeacherClassroomSessionsPage({ searchParams }: { searchParams: Promise<{ classId?: string }> }) {
  const shell = await getTeacherShellForLayout();
  const params = await searchParams;
  if (!shell.classes.length) {
    return <TeacherLiveView live={emptyTeacherLiveData(shell)} initialClassId={params.classId ?? ""} />;
  }

  const foundation = await getTeacherFoundationForPage();
  const live = await getTeacherLiveData(foundation.teacher.id);

  if (!live) {
    redirect("/teacher/dashboard");
  }

  return <TeacherLiveView live={live} initialClassId={params.classId ?? ""} />;
}
