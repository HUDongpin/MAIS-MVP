import { NextResponse } from "next/server";
import { canAccessTeacherArea, requireAuthenticatedUser } from "@/lib/server/auth";
import { getClassroomLiveRoster } from "@/lib/server/userStore";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) {
    return NextResponse.json({ error: "Teacher access required." }, { status: 403 });
  }

  const classId = new URL(request.url).searchParams.get("classId");
  if (!classId) return NextResponse.json({ error: "A classId is required." }, { status: 400 });

  const roster = await getClassroomLiveRoster(authenticated.user.id, classId);
  if (!roster) return NextResponse.json({ error: "Class roster unavailable." }, { status: 404 });

  return NextResponse.json({ roster });
}
