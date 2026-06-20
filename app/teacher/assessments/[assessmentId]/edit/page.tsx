import { notFound } from "next/navigation";
import { TeacherAssessmentNewView } from "@/components/teacher/TeacherResourceAssessmentViews";
import { getTeacherAssessmentCreateData, getTeacherAssessmentDetailData } from "@/lib/server/userStore";
import { getTeacherFoundationForPage } from "../../../getTeacherFoundation";

export default async function TeacherAssessmentEditPage({ params }: { params: Promise<{ assessmentId: string }> }) {
  const foundation = await getTeacherFoundationForPage();
  const { assessmentId } = await params;
  const [createData, detail] = await Promise.all([
    getTeacherAssessmentCreateData(foundation.teacher.id),
    getTeacherAssessmentDetailData(foundation.teacher.id, assessmentId)
  ]);

  if (!detail) notFound();

  return (
    <TeacherAssessmentNewView
      data={createData ?? { classes: foundation.classes, resources: [], topicOptions: [], questionBank: [] }}
      initialAssessment={detail.assessment}
    />
  );
}
