import { notFound } from "next/navigation";
import { TeacherStudentProfileView } from "@/components/teacher/TeacherManagementViews";
import { getTeacherStudentProfileData } from "@/lib/server/userStore";
import { getTeacherFoundationForPage } from "../../../../getTeacherFoundation";

export default async function TeacherClassStudentProfilePage({ params }: { params: Promise<{ classId: string; studentId: string }> }) {
  const foundation = await getTeacherFoundationForPage();
  const { classId, studentId } = await params;
  const profile = await getTeacherStudentProfileData(foundation.teacher.id, studentId);

  if (!profile || !profile.classes.some((teacherClass) => teacherClass.id === classId)) {
    notFound();
  }

  return <TeacherStudentProfileView profile={profile} backHref={`/teacher/classes/${encodeURIComponent(classId)}`} activeClassId={classId} />;
}
