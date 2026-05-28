import { redirect } from "next/navigation";
import { TeacherAnalyticsView } from "@/components/teacher/TeacherAnalyticsView";
import { getTeacherAnalyticsData } from "@/lib/server/userStore";
import { getTeacherFoundationForPage } from "../getTeacherFoundation";

export default async function TeacherAnalyticsPage({ searchParams }: { searchParams: Promise<{ classId?: string }> }) {
  const foundation = await getTeacherFoundationForPage();
  const params = await searchParams;
  const analytics = await getTeacherAnalyticsData(foundation.teacher.id, params.classId);

  if (!analytics && params.classId) {
    redirect("/teacher/analytics");
  }

  if (!analytics) {
    redirect("/teacher");
  }

  return <TeacherAnalyticsView analytics={analytics} />;
}

