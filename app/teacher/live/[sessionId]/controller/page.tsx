import { redirect } from "next/navigation";

export default async function TeacherLiveControllerPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  redirect(`/teacher/classroom-sessions/${encodeURIComponent(sessionId)}/controller`);
}
