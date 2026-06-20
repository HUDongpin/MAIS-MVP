import { NextResponse } from "next/server";
import { canAccessTeacherArea, requireAuthenticatedUser } from "@/lib/server/auth";
import { sendTeacherNotice } from "@/lib/server/userStore";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ noticeId: string }> }) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) return NextResponse.json({ error: "Teacher access required." }, { status: 403 });

  const { noticeId } = await params;
  const url = new URL(request.url);
  const origin = url.origin;
  const result = await sendTeacherNotice({
    teacherId: authenticated.user.id,
    noticeId: decodeURIComponent(noticeId),
    origin
  });

  if (result.status !== "sent") {
    const status = result.status === "forbidden" ? 403 : result.status === "not-found" ? 404 : 400;
    return NextResponse.json({ error: result.status }, { status });
  }

  return NextResponse.json({ notice: result.notice, attempt: result.attempt });
}
