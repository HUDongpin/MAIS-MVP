import { notFound } from "next/navigation";
import { TeacherAssessmentDetailView } from "@/components/teacher/TeacherResourceAssessmentViews";
import { getTeacherAssessmentDetailData } from "@/lib/server/userStore";
import { getTeacherFoundationForPage } from "../../getTeacherFoundation";

export default async function TeacherAssessmentDetailPage({ params }: { params: Promise<{ assessmentId: string }> }) {
  const foundation = await getTeacherFoundationForPage();
  const { assessmentId } = await params;
  const detail = await getTeacherAssessmentDetailData(foundation.teacher.id, assessmentId);

  if (!detail) notFound();

  return <TeacherAssessmentDetailView detail={detail} />;
}
