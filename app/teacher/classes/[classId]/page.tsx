import { notFound } from "next/navigation";
import { TeacherClassDetailView } from "@/components/teacher/TeacherManagementViews";
import { getTeacherClassDetailData } from "@/lib/server/userStore";
import { getTeacherFoundationForPage } from "../../getTeacherFoundation";

export default async function TeacherClassDetailPage({ params }: { params: Promise<{ classId: string }> }) {
  const foundation = await getTeacherFoundationForPage();
  const { classId } = await params;
  const detail = await getTeacherClassDetailData(foundation.teacher.id, classId);

  if (!detail) notFound();

  return <TeacherClassDetailView detail={detail} />;
}

