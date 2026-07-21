import { TeacherGradebookView } from "@/components/teacher/TeacherGradebookView";
import { getTeacherGradebookData } from "@/lib/server/userStore";
import { getTeacherFoundationForPage, getTeacherShellForLayout } from "../getTeacherFoundation";

export default async function TeacherGradebookPage({ searchParams }: { searchParams: Promise<{ classId?: string }> }) {
  const shell = await getTeacherShellForLayout();
  if (!shell.classes.length) {
    return <TeacherGradebookView data={null} classes={[]} activeClassId="" />;
  }

  const foundation = await getTeacherFoundationForPage();
  const params = await searchParams;
  const requestedClassId = params.classId?.trim();
  const activeClassId = foundation.classes.some((teacherClass) => teacherClass.id === requestedClassId)
    ? (requestedClassId as string)
    : foundation.classes[0].id;

  const data = await getTeacherGradebookData({ teacherId: foundation.teacher.id, classId: activeClassId });

  return <TeacherGradebookView data={data} classes={foundation.classes} activeClassId={activeClassId} />;
}
