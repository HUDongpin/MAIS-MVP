import { TeacherAssignmentNewView } from "@/components/teacher/TeacherManagementViews";
import {
  getTeacherAssessmentListData,
  getTeacherClassDetailData,
  getTeacherResourceLibraryData
} from "@/lib/server/userStore";
import type { AssignmentContentType, TeacherClassDetailData } from "@/types";
import { getTeacherFoundationForPage } from "../../getTeacherFoundation";

const assignmentContentTypes = new Set<AssignmentContentType>(["lesson", "practice", "visualization", "resource", "assessment"]);

function normalizeContentType(value: string | undefined) {
  return assignmentContentTypes.has(value as AssignmentContentType) ? (value as AssignmentContentType) : undefined;
}

export default async function TeacherAssignmentNewPage({ searchParams }: { searchParams: Promise<{ classId?: string; contentType?: string; targetId?: string; title?: string; groupId?: string }> }) {
  const foundation = await getTeacherFoundationForPage();
  const params = await searchParams;
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
      initialClassId={params.classId ?? ""}
      initialContentType={normalizeContentType(params.contentType)}
      initialTargetId={params.targetId ?? ""}
      initialTitle={params.title?.trim() ?? ""}
      initialGroupId={params.groupId ?? ""}
    />
  );
}
