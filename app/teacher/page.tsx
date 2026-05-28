import { redirect } from "next/navigation";
import { TeacherDashboardView } from "@/components/teacher/TeacherDashboardView";
import { getTeacherDashboardData } from "@/lib/server/userStore";
import { getTeacherFoundationForPage } from "./getTeacherFoundation";

export default async function TeacherPage() {
  const foundation = await getTeacherFoundationForPage();
  const dashboard = await getTeacherDashboardData(foundation.teacher.id);

  if (!dashboard) {
    redirect("/dashboard");
  }

  return <TeacherDashboardView dashboard={dashboard} />;
}
