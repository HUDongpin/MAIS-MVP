import { TeacherDashboardClient } from "@/components/teacher/TeacherDashboardClient";
import { emptyTeacherDashboardData } from "../emptyTeacherData";
import { getTeacherShellForLayout } from "../getTeacherFoundation";

export default async function TeacherDashboardPage() {
  const foundation = await getTeacherShellForLayout();
  if (!foundation.classes.length) {
    return <TeacherDashboardClient initialDashboard={emptyTeacherDashboardData(foundation)} />;
  }

  return <TeacherDashboardClient />;
}
