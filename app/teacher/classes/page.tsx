import { redirect } from "next/navigation";
import { TeacherClassesManager } from "@/components/teacher/TeacherManagementViews";
import { getTeacherShellForLayout } from "../getTeacherFoundation";

export default async function TeacherClassesPage({ searchParams }: { searchParams: Promise<{ class?: string; classId?: string; focus?: string; q?: string; student?: string; topic?: string }> }) {
  const shell = await getTeacherShellForLayout();
  const params = await searchParams;

  if (params.class) {
    const nextParams = new URLSearchParams();
    if (params.topic) nextParams.set("topic", params.topic);
    if (params.focus) nextParams.set("focus", params.focus);
    redirect(`/teacher/classes/${encodeURIComponent(params.class)}${nextParams.toString() ? `?${nextParams.toString()}` : ""}`);
  }

  if (params.student) {
    const nextParams = new URLSearchParams();
    if (params.focus) nextParams.set("focus", params.focus);
    redirect(`/teacher/students/${encodeURIComponent(params.student)}${nextParams.toString() ? `?${nextParams.toString()}` : ""}`);
  }

  const q = params.q?.trim().toLowerCase() ?? "";
  const classes = shell.classes.filter((teacherClass) => {
    if (params.classId && teacherClass.id !== params.classId) return false;
    if (q && !`${teacherClass.name} ${teacherClass.grade} ${teacherClass.description.en} ${teacherClass.description.zh}`.toLowerCase().includes(q)) return false;
    return true;
  });

  return <TeacherClassesManager classes={classes} />;
}
