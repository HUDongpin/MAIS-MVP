import { notFound } from "next/navigation";
import { TeacherAssignmentDetailView } from "@/components/teacher/TeacherManagementViews";
import { getTeacherAssignmentDetailData } from "@/lib/server/userStore";
import { getTeacherFoundationForPage } from "../../../../getTeacherFoundation";

export default async function TeacherAssignmentSubmissionPage({
  params
}: {
  params: Promise<{ assignmentId: string; submissionId: string }>;
}) {
  const foundation = await getTeacherFoundationForPage();
  const { assignmentId, submissionId } = await params;
  const detail = await getTeacherAssignmentDetailData(foundation.teacher.id, assignmentId);

  if (!detail || !detail.submissions.some((submission) => submission.id === submissionId)) {
    notFound();
  }

  return <TeacherAssignmentDetailView detail={detail} initialSubmissionId={submissionId} />;
}
