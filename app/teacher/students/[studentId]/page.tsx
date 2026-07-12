import { notFound, redirect } from "next/navigation";
import { TeacherStudentProfileView } from "@/components/teacher/TeacherManagementViews";
import { getTeacherStudentProfileData } from "@/lib/server/userStore";
import { getTeacherFoundationForPage } from "../../getTeacherFoundation";

export default async function TeacherStudentProfilePage({
  params,
  searchParams
}: {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<{ focus?: string }>;
}) {
  const foundation = await getTeacherFoundationForPage();
  const { studentId } = await params;
  const query = await searchParams;
  const profile = await getTeacherStudentProfileData(foundation.teacher.id, studentId);

  if (!profile) notFound();

  const firstClassId = profile.classes[0]?.id;
  if (firstClassId) {
    const nextParams = new URLSearchParams();
    if (query.focus) nextParams.set("focus", query.focus);
    redirect(`/teacher/classes/${encodeURIComponent(firstClassId)}/students/${encodeURIComponent(studentId)}${nextParams.toString() ? `?${nextParams.toString()}` : ""}`);
  }

  return <TeacherStudentProfileView profile={profile} />;
}
