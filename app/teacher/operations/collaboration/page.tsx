import { renderTeacherOperationsPage } from "../renderOperationsPage";

export default async function TeacherOperationsCollaborationPage({ searchParams }: { searchParams: Promise<{ classId?: string }> }) {
  return renderTeacherOperationsPage("collaboration", searchParams);
}
