import { NextResponse, type NextRequest } from "next/server";
import { studentRoadmapPath } from "@/lib/roadmapRoutes";
import { SESSION_COOKIE_NAME } from "@/lib/session";

export const runtime = "nodejs";

function lessonLoginUrl(request: NextRequest) {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", "/student/lessons");
  return loginUrl;
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const { getAuthenticatedUserFromToken } = await import("@/lib/server/auth");
  const authenticated = await getAuthenticatedUserFromToken(token);

  if (!authenticated) {
    return NextResponse.redirect(lessonLoginUrl(request), 307);
  }

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
      return NextResponse.redirect(new URL(lessonEntryTarget.href, request.url), 307);
    }
  }

  return NextResponse.redirect(new URL(studentRoadmapPath, request.url), 307);
}
