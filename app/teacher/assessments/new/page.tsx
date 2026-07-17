import { TeacherAssessmentNewView } from "@/components/teacher/TeacherResourceAssessmentViews";
import { getTeacherAssessmentCreateData } from "@/lib/server/userStore";
import { getTeacherFoundationForPage } from "../../getTeacherFoundation";

export default async function TeacherAssessmentNewPage() {
  const foundation = await getTeacherFoundationForPage();
  const data = await getTeacherAssessmentCreateData(foundation.teacher.id);

  return <TeacherAssessmentNewView data={data ?? { classes: foundation.classes, resources: [], topicOptions: [], questionBank: [] }} />;
}
