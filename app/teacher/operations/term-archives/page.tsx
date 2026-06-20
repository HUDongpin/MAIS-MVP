import { renderTeacherOperationsPage } from "../renderOperationsPage";

export default async function TeacherOperationsTermArchivesPage({ searchParams }: { searchParams: Promise<{ classId?: string }> }) {
  return renderTeacherOperationsPage("archive", searchParams);
}
