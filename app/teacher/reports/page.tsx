import { redirect } from "next/navigation";
import { TeacherReportsView } from "@/components/teacher/TeacherReportsView";
import { getTeacherReportsData } from "@/lib/server/userStore";
import { getTeacherFoundationForPage } from "../getTeacherFoundation";

export default async function TeacherReportsPage() {
  const foundation = await getTeacherFoundationForPage();
  const reports = await getTeacherReportsData(foundation.teacher.id);

  if (!reports) {
    redirect("/teacher");
  }

  return <TeacherReportsView reports={reports} />;
}

