import { redirect } from "next/navigation";
import { LessonEntryClient } from "@/components/lesson/LessonEntryClient";
import { requireLessonAuthentication } from "@/components/lesson/lessonAuthGate";
import { studentLessonsPath } from "@/lib/lessonLinks";

export async function StudentLessonEntryPage() {
  const authenticated = await requireLessonAuthentication(studentLessonsPath);

  if (authenticated?.user.role === "student") {
    const { getLessonEntryTarget } = await import("@/lib/server/userStore");
    const lessonEntryTarget = await getLessonEntryTarget(
      authenticated.user.id,
      authenticated.settings.selectedGrade,
      authenticated.user.curriculumProfile
    );
    if (lessonEntryTarget?.href) {
      redirect(lessonEntryTarget.href);
    }
  }

  return <LessonEntryClient />;
}
