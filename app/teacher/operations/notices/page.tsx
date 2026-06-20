import { renderTeacherOperationsPage } from "../renderOperationsPage";

export default async function TeacherOperationsNoticesPage({ searchParams }: { searchParams: Promise<{ classId?: string }> }) {
  return renderTeacherOperationsPage("notices", searchParams);
}
