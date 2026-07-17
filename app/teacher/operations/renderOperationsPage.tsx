import { redirect } from "next/navigation";
import { TeacherOperationsView } from "@/components/teacher/TeacherOperationsView";
import { getTeacherOperationsData } from "@/lib/server/userStore";
import { emptyTeacherOperationsData } from "../emptyTeacherData";
import { getTeacherFoundationForPage, getTeacherShellForLayout } from "../getTeacherFoundation";

export type TeacherOperationsTab = "notices" | "reminders" | "roster" | "collaboration" | "archive" | "ai-governance";

export async function renderTeacherOperationsPage(
  initialTab: TeacherOperationsTab,
  searchParams: Promise<{ classId?: string }>
) {
  const shell = await getTeacherShellForLayout();
  const params = await searchParams;
  if (!shell.classes.length) {
    return <TeacherOperationsView data={emptyTeacherOperationsData(shell)} initialTab={initialTab} />;
  }

  const foundation = await getTeacherFoundationForPage();
  const data = await getTeacherOperationsData(foundation.teacher.id, params.classId);

  if (!data) {
    redirect("/teacher/dashboard");
  }

  return <TeacherOperationsView data={data} initialTab={initialTab} />;
}
