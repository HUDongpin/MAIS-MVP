import { NextResponse } from "next/server";
import { requireAuthenticatedUser, canAccessTeacherArea } from "@/lib/server/auth";
import { getTeacherFoundationData } from "@/lib/server/userStore";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  if (!canAccessTeacherArea(authenticated.user)) {
    return NextResponse.json({ error: "Teacher access required." }, { status: 403 });
  }

  const foundation = await getTeacherFoundationData(authenticated.user.id);
  if (!foundation) {
    return NextResponse.json({ error: "Teacher workspace unavailable." }, { status: 404 });
  }

  return NextResponse.json({ foundation });
}
