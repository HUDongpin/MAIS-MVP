import { redirect } from "next/navigation";
import { TeacherResourcesView } from "@/components/teacher/TeacherResourceAssessmentViews";
import { getTeacherResourceLibraryData } from "@/lib/server/userStore";
import { emptyTeacherResourceLibraryData } from "../emptyTeacherData";
import { getTeacherFoundationForPage, getTeacherShellForLayout } from "../getTeacherFoundation";

export default async function TeacherResourcesPage() {
  const shell = await getTeacherShellForLayout();
  if (!shell.classes.length) {
    return <TeacherResourcesView data={emptyTeacherResourceLibraryData()} />;
  }

  const foundation = await getTeacherFoundationForPage();
  const data = await getTeacherResourceLibraryData(foundation.teacher.id);

  if (!data) {
    redirect("/teacher/dashboard");
  }

  return <TeacherResourcesView data={data} />;
}
