import { redirect } from "next/navigation";
import { TeacherPrepListView } from "@/components/teacher/TeacherPrepViews";
import { getTeacherLessonKitListData } from "@/lib/server/userStore";
import { emptyTeacherLessonKitListData } from "../emptyTeacherData";
import { getTeacherFoundationForPage, getTeacherShellForLayout } from "../getTeacherFoundation";

export default async function TeacherLessonKitsPage() {
  const shell = await getTeacherShellForLayout();
  if (!shell.classes.length) {
    return <TeacherPrepListView data={emptyTeacherLessonKitListData(shell)} />;
  }

  const foundation = await getTeacherFoundationForPage();
  const data = await getTeacherLessonKitListData(foundation.teacher.id);

  if (!data) {
    redirect("/teacher/dashboard");
  }

  return <TeacherPrepListView data={data} />;
}
