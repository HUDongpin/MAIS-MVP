import { renderTeacherOperationsPage } from "../renderOperationsPage";

export default async function TeacherOperationsRemindersPage({ searchParams }: { searchParams: Promise<{ classId?: string }> }) {
  return renderTeacherOperationsPage("reminders", searchParams);
}
