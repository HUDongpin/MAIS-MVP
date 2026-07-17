import { redirect } from "next/navigation";
import { TeacherAnalyticsView } from "@/components/teacher/TeacherAnalyticsView";
import { getTeacherAnalyticsData } from "@/lib/server/userStore";
import { emptyTeacherAnalyticsData } from "../emptyTeacherData";
import { getTeacherFoundationForPage, getTeacherShellForLayout } from "../getTeacherFoundation";

export default async function TeacherAnalyticsPage({ searchParams }: { searchParams: Promise<{ classId?: string }> }) {
  const shell = await getTeacherShellForLayout();
  const params = await searchParams;
  if (!shell.classes.length) {
    return <TeacherAnalyticsView analytics={emptyTeacherAnalyticsData(shell, params.classId)} />;
  }

  const foundation = await getTeacherFoundationForPage();
  const analytics = await getTeacherAnalyticsData(foundation.teacher.id, params.classId);

  if (!analytics && params.classId) {
    redirect("/teacher/analytics");
  }

  if (!analytics) {
    redirect("/teacher/dashboard");
  }

  return <TeacherAnalyticsView analytics={analytics} />;
}
