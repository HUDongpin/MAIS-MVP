import { NextResponse } from "next/server";
import { canAccessTeacherArea, requireAuthenticatedUser } from "@/lib/server/auth";
import { getTeacherOperationsData } from "@/lib/server/userStore";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) return NextResponse.json({ error: "Teacher access required." }, { status: 403 });

  const url = new URL(request.url);
  const data = await getTeacherOperationsData(authenticated.user.id, url.searchParams.get("classId"));
  if (!data) return NextResponse.json({ error: "Teacher reminders unavailable." }, { status: 404 });

  return NextResponse.json({
    policy: data.reminderPolicy,
    runs: data.reminderRuns,
    missingWork: data.missingWork
  });
}
