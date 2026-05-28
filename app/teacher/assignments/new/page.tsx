import { TeacherAssignmentNewView } from "@/components/teacher/TeacherManagementViews";
import {
  getTeacherAssessmentListData,
  getTeacherClassDetailData,
  getTeacherResourceLibraryData
} from "@/lib/server/userStore";
import type { TeacherClassDetailData } from "@/types";
import { getTeacherFoundationForPage } from "../../getTeacherFoundation";

export default async function TeacherAssignmentNewPage() {
  const foundation = await getTeacherFoundationForPage();
  const [classDetails, resources, assessments] = await Promise.all([
    Promise.all(foundation.classes.map((teacherClass) => getTeacherClassDetailData(foundation.teacher.id, teacherClass.id))),
    getTeacherResourceLibraryData(foundation.teacher.id),
    getTeacherAssessmentListData(foundation.teacher.id)
  ]);
  const availableClassDetails = classDetails.filter((detail): detail is TeacherClassDetailData => Boolean(detail));

  return (
    <TeacherAssignmentNewView
      classDetails={availableClassDetails}
      resources={resources?.resources ?? []}
      assessments={assessments?.assessments ?? []}
    />
  );
}
