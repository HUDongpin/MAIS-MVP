import { NextResponse } from "next/server";
import { canAccessTeacherArea, requireAuthenticatedUser } from "@/lib/server/auth";
import { getTeacherDashboardData } from "@/lib/server/userStore";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  if (!canAccessTeacherArea(authenticated.user)) {
    return NextResponse.json({ error: "Teacher access required." }, { status: 403 });
  }

  const dashboard = await getTeacherDashboardData(authenticated.user.id);
  if (!dashboard) {
    return NextResponse.json({ error: "Teacher dashboard unavailable." }, { status: 404 });
  }

  return NextResponse.json({ dashboard });
}
