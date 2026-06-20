import { notFound } from "next/navigation";
import { TeacherLivePresentView } from "@/components/teacher/TeacherPrepViews";
import { getTeacherLiveSessionById } from "@/lib/server/userStore";
import { getTeacherFoundationForPage } from "../../../getTeacherFoundation";

export default async function TeacherClassroomSessionPresenterPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const foundation = await getTeacherFoundationForPage();
  const { sessionId } = await params;
  const session = await getTeacherLiveSessionById(foundation.teacher.id, decodeURIComponent(sessionId));

  if (!session) {
    notFound();
  }

  return <TeacherLivePresentView session={session} />;
}
