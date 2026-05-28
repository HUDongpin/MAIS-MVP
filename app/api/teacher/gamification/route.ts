import { NextResponse } from "next/server";
import { canAccessTeacherArea, requireAuthenticatedUser } from "@/lib/server/auth";
import { getTeacherGamificationData } from "@/lib/server/userStore";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) return NextResponse.json({ error: "Teacher access required." }, { status: 403 });

  const url = new URL(request.url);
  const classId = url.searchParams.get("classId");
  const gamification = await getTeacherGamificationData(authenticated.user.id, classId);
  if (!gamification) return NextResponse.json({ error: "Gamification data unavailable." }, { status: 404 });

  return NextResponse.json({ gamification });
}
