import { redirect } from "next/navigation";
import { TeacherLiveView } from "@/components/teacher/TeacherLiveView";
import { getTeacherLiveData } from "@/lib/server/userStore";
import { getTeacherFoundationForPage } from "../getTeacherFoundation";

export default async function TeacherLivePage() {
  const foundation = await getTeacherFoundationForPage();
  const live = await getTeacherLiveData(foundation.teacher.id);

  if (!live) {
    redirect("/teacher");
  }

  return <TeacherLiveView live={live} />;
}

