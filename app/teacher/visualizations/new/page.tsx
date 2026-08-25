import { TeacherVisualizationAuthoringWorkspace } from "@/components/teacher/visualizations/TeacherVisualizationAuthoringWorkspace";
import { getTeacherAuthenticationForPage } from "../../getTeacherFoundation";

export default async function NewTeacherVisualizationPage() {
  const authenticated = await getTeacherAuthenticationForPage();
  return <TeacherVisualizationAuthoringWorkspace userId={authenticated.user.id} />;
}

