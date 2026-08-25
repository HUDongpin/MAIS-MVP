import { TeacherVisualizationAuthoringWorkspace } from "@/components/teacher/visualizations/TeacherVisualizationAuthoringWorkspace";
import { getTeacherAuthenticationForPage } from "../../getTeacherFoundation";

export default async function TeacherVisualizationDraftPage({
  params
}: {
  params: Promise<{ draftId: string }>;
}) {
  const [authenticated, { draftId }] = await Promise.all([
    getTeacherAuthenticationForPage(),
    params
  ]);
  return <TeacherVisualizationAuthoringWorkspace userId={authenticated.user.id} draftId={draftId} />;
}

