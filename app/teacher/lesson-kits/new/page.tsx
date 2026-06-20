import { redirect } from "next/navigation";
import { TeacherPrepNewView } from "@/components/teacher/TeacherPrepViews";
import { getTeacherLessonKitCreateData } from "@/lib/server/userStore";
import { getTeacherFoundationForPage } from "../../getTeacherFoundation";

export default async function NewTeacherLessonKitPage() {
  const foundation = await getTeacherFoundationForPage();
  const data = await getTeacherLessonKitCreateData(foundation.teacher.id);

  if (!data) {
    redirect("/teacher/dashboard");
  }

  return <TeacherPrepNewView data={data} />;
}
