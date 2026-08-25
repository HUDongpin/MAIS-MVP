import { TeacherVisualizationDraftList } from "@/components/teacher/visualizations/TeacherVisualizationDraftList";
import { getTeacherAuthenticationForPage } from "../getTeacherFoundation";

export default async function TeacherVisualizationsPage() {
  const authenticated = await getTeacherAuthenticationForPage();
  return <TeacherVisualizationDraftList userId={authenticated.user.id} />;
}

