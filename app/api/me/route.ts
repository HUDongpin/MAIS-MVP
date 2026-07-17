import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { withAuthRouteJsonBoundary } from "@/lib/server/authRouteGuards";
import { getLessonEntryTarget } from "@/lib/server/userStore";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withAuthRouteJsonBoundary("auth-me", () => handleMe(request));
}

async function handleMe(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const includeLessonEntry = new URL(request.url).searchParams.get("includeLessonEntry") !== "false";
  const lessonEntryTarget = includeLessonEntry && authenticated.user.role === "student"
    ? await getLessonEntryTarget(authenticated.user.id, authenticated.settings.selectedGrade, authenticated.user.curriculumProfile)
    : null;

  return NextResponse.json({ ...authenticated, lessonEntryTarget });
}
