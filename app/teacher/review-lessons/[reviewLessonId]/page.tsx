import { notFound, redirect } from "next/navigation";
import { getTeacherReviewLessonDetailData } from "@/lib/server/userStore";
import { getTeacherFoundationForPage } from "../../getTeacherFoundation";

export default async function TeacherReviewLessonPage({ params }: { params: Promise<{ reviewLessonId: string }> }) {
  const foundation = await getTeacherFoundationForPage();
  const { reviewLessonId } = await params;
  const data = await getTeacherReviewLessonDetailData(foundation.teacher.id, decodeURIComponent(reviewLessonId));

  if (!data) notFound();

  redirect(`/teacher/assessments/${encodeURIComponent(data.assessment.id)}/review-lessons/${encodeURIComponent(reviewLessonId)}`);
}
