import { StudentAssignmentsView } from "@/components/dashboard/StudentAssignmentsView";

type StudentAssignmentDetailPageProps = {
  params: Promise<{ assignmentId: string }>;
};

export default async function StudentAssignmentDetailPage({ params }: StudentAssignmentDetailPageProps) {
  const { assignmentId } = await params;
  return <StudentAssignmentsView assignmentId={assignmentId} />;
}
