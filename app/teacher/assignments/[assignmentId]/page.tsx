import { notFound } from "next/navigation";
import { TeacherAssignmentDetailView } from "@/components/teacher/TeacherManagementViews";
import { getTeacherAssignmentDetailData } from "@/lib/server/userStore";
import { getTeacherFoundationForPage } from "../../getTeacherFoundation";

export default async function TeacherAssignmentDetailPage({ params }: { params: Promise<{ assignmentId: string }> }) {
  const foundation = await getTeacherFoundationForPage();
  const { assignmentId } = await params;
  const detail = await getTeacherAssignmentDetailData(foundation.teacher.id, assignmentId);

  if (!detail) notFound();

  return <TeacherAssignmentDetailView detail={detail} />;
}
