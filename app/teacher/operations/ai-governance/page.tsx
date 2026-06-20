import { renderTeacherOperationsPage } from "../renderOperationsPage";

export default async function TeacherOperationsAiGovernancePage({ searchParams }: { searchParams: Promise<{ classId?: string }> }) {
  return renderTeacherOperationsPage("ai-governance", searchParams);
}
