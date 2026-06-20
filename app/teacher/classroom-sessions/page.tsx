import { redirect } from "next/navigation";
import { TeacherLiveView } from "@/components/teacher/TeacherLiveView";
import { getTeacherLiveData } from "@/lib/server/userStore";
import { getTeacherFoundationForPage } from "../getTeacherFoundation";

export default async function TeacherClassroomSessionsPage({ searchParams }: { searchParams: Promise<{ classId?: string }> }) {
  const foundation = await getTeacherFoundationForPage();
  const params = await searchParams;
  const live = await getTeacherLiveData(foundation.teacher.id);

  if (!live) {
    redirect("/teacher/dashboard");
  }

  return <TeacherLiveView live={live} initialClassId={params.classId ?? ""} />;
}
