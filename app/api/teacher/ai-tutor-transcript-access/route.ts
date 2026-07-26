import { NextResponse } from "next/server";
import { canAccessTeacherArea, requireAuthenticatedUser } from "@/lib/server/auth";
import { listAiTutorTranscriptAccessForViewer } from "@/lib/server/userStore";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) {
    return NextResponse.json({ error: "Teacher access required." }, { status: 403 });
  }

  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? "50");

  const events = await listAiTutorTranscriptAccessForViewer(authenticated.user.id, {
    limit: Number.isFinite(limit) ? limit : 50
  });

  return NextResponse.json({ data: { events } });
}
