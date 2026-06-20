import { redirect } from "next/navigation";
import { TeacherPrepListView } from "@/components/teacher/TeacherPrepViews";
import { getTeacherLessonKitListData } from "@/lib/server/userStore";
import { getTeacherFoundationForPage } from "../getTeacherFoundation";

export default async function TeacherLessonKitsPage() {
  const foundation = await getTeacherFoundationForPage();
  const data = await getTeacherLessonKitListData(foundation.teacher.id);

  if (!data) {
    redirect("/teacher/dashboard");
  }

  return <TeacherPrepListView data={data} />;
}
