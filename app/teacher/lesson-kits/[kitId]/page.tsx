import { notFound } from "next/navigation";
import { TeacherPrepDetailView } from "@/components/teacher/TeacherPrepViews";
import { getTeacherLessonKitDetailData } from "@/lib/server/userStore";
import { getTeacherFoundationForPage } from "../../getTeacherFoundation";

export default async function TeacherLessonKitDetailPage({ params }: { params: Promise<{ kitId: string }> }) {
  const foundation = await getTeacherFoundationForPage();
  const { kitId } = await params;
  const kit = await getTeacherLessonKitDetailData(foundation.teacher.id, decodeURIComponent(kitId));

  if (!kit) {
    notFound();
  }

  return <TeacherPrepDetailView initialKit={kit} />;
}
