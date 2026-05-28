import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { getLessonEntryTarget } from "@/lib/server/userStore";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const lessonEntryTarget = authenticated.user.role === "student"
    ? await getLessonEntryTarget(authenticated.user.id, authenticated.user.grade, authenticated.user.curriculumProfile)
    : null;

  return NextResponse.json({ ...authenticated, lessonEntryTarget });
}
