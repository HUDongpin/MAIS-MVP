import { renderTeacherOperationsPage } from "../renderOperationsPage";

export default async function TeacherOperationsRosterPage({ searchParams }: { searchParams: Promise<{ classId?: string }> }) {
  return renderTeacherOperationsPage("roster", searchParams);
}
