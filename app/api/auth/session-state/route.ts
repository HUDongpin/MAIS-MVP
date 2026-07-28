import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { withAuthRouteJsonBoundary } from "@/lib/server/authRouteGuards";
import { getLessonEntryTarget } from "@/lib/server/userStore";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withAuthRouteJsonBoundary("auth-session-state", () => handleSessionState(request));
}

// The guest-tolerant twin of /api/me. The app shell asks "who is signed in?" on
// every pageview — including guest marketing pages — where "nobody" is a normal
// answer, not an error: a 401 here puts a red console error on every guest
// visit. /api/me keeps its strict 401 contract (asserted by the production
// certification's unauth-api-me check); this route only ever varies the payload.
async function handleSessionState(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) {
    return NextResponse.json({ user: null });
  }

  const includeLessonEntry = new URL(request.url).searchParams.get("includeLessonEntry") !== "false";
  const lessonEntryTarget = includeLessonEntry && authenticated.user.role === "student"
    ? await getLessonEntryTarget(authenticated.user.id, authenticated.settings.selectedGrade, authenticated.user.curriculumProfile)
    : null;

  return NextResponse.json({ ...authenticated, lessonEntryTarget });
}
