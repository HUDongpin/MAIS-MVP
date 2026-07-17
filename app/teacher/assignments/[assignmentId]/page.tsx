import { notFound, redirect } from "next/navigation";
import { TeacherAssignmentDetailView } from "@/components/teacher/TeacherManagementViews";
import { getTeacherAssignmentDetailData } from "@/lib/server/userStore";
import { getTeacherFoundationForPage } from "../../getTeacherFoundation";

export default async function TeacherAssignmentDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ assignmentId: string }>;
  searchParams: Promise<{ submission?: string }>;
}) {
  const foundation = await getTeacherFoundationForPage();
  const { assignmentId } = await params;
  const query = await searchParams;

  if (query.submission) {
    redirect(`/teacher/assignments/${encodeURIComponent(assignmentId)}/submissions/${encodeURIComponent(query.submission)}`);
  }

  const detail = await getTeacherAssignmentDetailData(foundation.teacher.id, assignmentId);

  if (!detail) notFound();

  return <TeacherAssignmentDetailView detail={detail} />;
}
