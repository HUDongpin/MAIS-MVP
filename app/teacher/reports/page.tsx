import { redirect } from "next/navigation";
import { TeacherReportsView } from "@/components/teacher/TeacherReportsView";
import { getTeacherReportsData } from "@/lib/server/userStore";
import { emptyTeacherReportsData } from "../emptyTeacherData";
import { getTeacherFoundationForPage, getTeacherShellForLayout } from "../getTeacherFoundation";

export default async function TeacherReportsPage() {
  const shell = await getTeacherShellForLayout();
  if (!shell.classes.length) {
    return <TeacherReportsView reports={emptyTeacherReportsData(shell)} />;
  }

  const foundation = await getTeacherFoundationForPage();
  const reports = await getTeacherReportsData(foundation.teacher.id);

  if (!reports) {
    redirect("/teacher/dashboard");
  }

  return <TeacherReportsView reports={reports} />;
}
