import { notFound } from "next/navigation";
import { TeacherReviewLessonView } from "@/components/teacher/TeacherReviewLessonView";
import { getTeacherReviewLessonDetailData } from "@/lib/server/userStore";
import { getTeacherFoundationForPage } from "../../../../getTeacherFoundation";

export default async function TeacherAssessmentReviewLessonPage({
  params
}: {
  params: Promise<{ assessmentId: string; reviewLessonId: string }>;
}) {
  const foundation = await getTeacherFoundationForPage();
  const { assessmentId, reviewLessonId } = await params;
  const data = await getTeacherReviewLessonDetailData(foundation.teacher.id, decodeURIComponent(reviewLessonId));

  if (!data || data.assessment.id !== assessmentId) {
    notFound();
  }

  return <TeacherReviewLessonView data={data} />;
}
