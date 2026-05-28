import { TeacherAssessmentsView } from "@/components/teacher/TeacherResourceAssessmentViews";
import { getTeacherAssessmentListData } from "@/lib/server/userStore";
import { getTeacherFoundationForPage } from "../getTeacherFoundation";

export default async function TeacherAssessmentsPage() {
  const foundation = await getTeacherFoundationForPage();
  const data = await getTeacherAssessmentListData(foundation.teacher.id);

  return <TeacherAssessmentsView data={data ?? { generatedAt: new Date().toISOString(), classes: foundation.classes, assessments: [], totals: { assessments: 0, openAssessments: 0, submittedCount: 0, averageScore: null } }} />;
}
