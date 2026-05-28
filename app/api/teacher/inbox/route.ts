import { NextResponse } from "next/server";
import { canAccessTeacherArea, requireAuthenticatedUser } from "@/lib/server/auth";
import { getTeacherInboxData } from "@/lib/server/userStore";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) return NextResponse.json({ error: "Teacher access required." }, { status: 403 });

  const url = new URL(request.url);
  const inbox = await getTeacherInboxData(authenticated.user.id, url.searchParams.get("thread"));
  if (!inbox) return NextResponse.json({ error: "Inbox unavailable." }, { status: 404 });

  return NextResponse.json({ inbox });
}
