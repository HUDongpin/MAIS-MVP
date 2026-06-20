import { redirect } from "next/navigation";

export default async function TeacherPrepDetailPage({ params }: { params: Promise<{ kitId: string }> }) {
  const { kitId } = await params;
  redirect(`/teacher/lesson-kits/${encodeURIComponent(kitId)}`);
}
