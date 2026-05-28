import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LessonEntryClient } from "@/app/lesson/LessonEntryClient";
import { getAuthenticatedUserFromToken } from "@/lib/server/auth";
import { getLessonEntryTarget } from "@/lib/server/userStore";
import { SESSION_COOKIE_NAME } from "@/lib/session";

export const runtime = "nodejs";

export default async function LessonEntryPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const authenticated = await getAuthenticatedUserFromToken(token);

  if (authenticated?.user.role === "student") {
    const lessonEntryTarget = await getLessonEntryTarget(
      authenticated.user.id,
      authenticated.user.grade,
      authenticated.user.curriculumProfile
    );
    if (lessonEntryTarget?.href) {
      redirect(lessonEntryTarget.href);
    }
  }

  return <LessonEntryClient />;
}
