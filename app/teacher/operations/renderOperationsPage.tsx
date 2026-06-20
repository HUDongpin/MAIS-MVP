import { redirect } from "next/navigation";
import { TeacherOperationsView } from "@/components/teacher/TeacherOperationsView";
import { getTeacherOperationsData } from "@/lib/server/userStore";
import { getTeacherFoundationForPage } from "../getTeacherFoundation";

export type TeacherOperationsTab = "notices" | "reminders" | "roster" | "collaboration" | "archive" | "ai-governance";

export async function renderTeacherOperationsPage(
  initialTab: TeacherOperationsTab,
  searchParams: Promise<{ classId?: string }>
) {
  const foundation = await getTeacherFoundationForPage();
  const params = await searchParams;
  const data = await getTeacherOperationsData(foundation.teacher.id, params.classId);

  if (!data) {
    redirect("/teacher/dashboard");
  }

  return <TeacherOperationsView data={data} initialTab={initialTab} />;
}
