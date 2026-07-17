import { LessonEntryClient } from "@/components/lesson/LessonEntryClient";
import { requireLessonAuthentication } from "@/components/lesson/lessonAuthGate";
import { studentLessonsPath } from "@/lib/lessonLinks";

export function LessonEntryInstantRedirect({ href }: { href: string }) {
  const redirectScript = `window.location.replace(${JSON.stringify(href)});`;

  return (
    <>
      <meta httpEquiv="refresh" content={`0;url=${href}`} />
      <script dangerouslySetInnerHTML={{ __html: redirectScript }} />
      <LessonEntryClient initialLessonHref={href} />
    </>
  );
}

export async function StudentLessonEntryPage() {
  const lessonEntryHref = await getStudentLessonEntryRedirectHref();

  if (lessonEntryHref) {
    return <LessonEntryInstantRedirect href={lessonEntryHref} />;
  }

  return <LessonEntryClient />;
}

export async function getStudentLessonEntryRedirectHref() {
  const authenticated = await requireLessonAuthentication(studentLessonsPath);
  const canUseAuthenticatedLessonEntry =
    authenticated.user.role === "student" ||
    authenticated.user.role === "teacher" ||
    authenticated.user.role === "admin";

  if (canUseAuthenticatedLessonEntry) {
    const { getLessonEntryTarget } = await import("@/lib/server/userStore");
    const lessonEntryTarget = await getLessonEntryTarget(
      authenticated.user.id,
      authenticated.settings.selectedGrade,
      authenticated.user.curriculumProfile
    );

    if (lessonEntryTarget?.href) {
      return lessonEntryTarget.href;
    }
  }

  return null;
}
