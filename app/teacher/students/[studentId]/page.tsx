import { notFound } from "next/navigation";
import { TeacherStudentProfileView } from "@/components/teacher/TeacherManagementViews";
import { getTeacherStudentProfileData } from "@/lib/server/userStore";
import { getTeacherFoundationForPage } from "../../getTeacherFoundation";

export default async function TeacherStudentProfilePage({ params }: { params: Promise<{ studentId: string }> }) {
  const foundation = await getTeacherFoundationForPage();
  const { studentId } = await params;
  const profile = await getTeacherStudentProfileData(foundation.teacher.id, studentId);

  if (!profile) notFound();

  return <TeacherStudentProfileView profile={profile} />;
}

