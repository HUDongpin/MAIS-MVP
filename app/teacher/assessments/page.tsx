import { TeacherAssessmentsView } from "@/components/teacher/TeacherResourceAssessmentViews";
import { getTeacherAssessmentListData } from "@/lib/server/userStore";
import { emptyTeacherAssessmentListData } from "../emptyTeacherData";
import { getTeacherFoundationForPage, getTeacherShellForLayout } from "../getTeacherFoundation";

export default async function TeacherAssessmentsPage() {
  const shell = await getTeacherShellForLayout();
  if (!shell.classes.length) {
    return <TeacherAssessmentsView data={emptyTeacherAssessmentListData(shell)} />;
  }

  const foundation = await getTeacherFoundationForPage();
  const data = await getTeacherAssessmentListData(foundation.teacher.id);

  return <TeacherAssessmentsView data={data ?? { generatedAt: new Date().toISOString(), classes: foundation.classes, assessments: [], totals: { assessments: 0, openAssessments: 0, submittedCount: 0, averageScore: null } }} />;
}
