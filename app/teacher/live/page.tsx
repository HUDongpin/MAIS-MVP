import { redirect } from "next/navigation";

export default async function TeacherLivePage({ searchParams }: { searchParams: Promise<{ classId?: string }> }) {
  const params = await searchParams;
  redirect(params.classId ? `/teacher/classroom-sessions?classId=${encodeURIComponent(params.classId)}` : "/teacher/classroom-sessions");
}
