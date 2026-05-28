import { TeacherAssignmentsManager } from "@/components/teacher/TeacherManagementViews";
import { getTeacherAssignments } from "@/lib/server/userStore";
import { getTeacherFoundationForPage } from "../getTeacherFoundation";

export default async function TeacherAssignmentsPage({ searchParams }: { searchParams: Promise<{ classId?: string; filter?: string; q?: string }> }) {
  const foundation = await getTeacherFoundationForPage();
  const params = await searchParams;
  const assignments = await getTeacherAssignments(foundation.teacher.id);
  const q = params.q?.trim().toLowerCase() ?? "";
  const filtered = (assignments ?? []).filter((assignment) => {
    if (params.classId && assignment.classId !== params.classId) return false;
    if (params.filter === "grading" && assignment.completedCount <= 0) return false;
    if (q && !`${assignment.title.en} ${assignment.title.zh} ${assignment.description.en} ${assignment.description.zh} ${assignment.contentType}`.toLowerCase().includes(q)) return false;
    return true;
  });

  return <TeacherAssignmentsManager assignments={filtered} />;
}
