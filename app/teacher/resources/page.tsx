import { redirect } from "next/navigation";
import { TeacherResourcesView } from "@/components/teacher/TeacherResourceAssessmentViews";
import { getTeacherResourceLibraryData } from "@/lib/server/userStore";
import { getTeacherFoundationForPage } from "../getTeacherFoundation";

export default async function TeacherResourcesPage() {
  const foundation = await getTeacherFoundationForPage();
  const data = await getTeacherResourceLibraryData(foundation.teacher.id);

  if (!data) {
    redirect("/teacher");
  }

  return <TeacherResourcesView data={data} />;
}

