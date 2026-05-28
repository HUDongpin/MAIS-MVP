import { TeacherClassesManager } from "@/components/teacher/TeacherManagementViews";
import { getTeacherFoundationForPage } from "../getTeacherFoundation";

export default async function TeacherClassesPage({ searchParams }: { searchParams: Promise<{ classId?: string; q?: string }> }) {
  const foundation = await getTeacherFoundationForPage();
  const params = await searchParams;
  const q = params.q?.trim().toLowerCase() ?? "";
  const classes = foundation.classes.filter((teacherClass) => {
    if (params.classId && teacherClass.id !== params.classId) return false;
    if (q && !`${teacherClass.name} ${teacherClass.grade} ${teacherClass.description.en} ${teacherClass.description.zh}`.toLowerCase().includes(q)) return false;
    return true;
  });

  return <TeacherClassesManager classes={classes} />;
}
