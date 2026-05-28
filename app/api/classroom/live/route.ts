import { NextResponse } from "next/server";
import { canAccessTeacherArea, requireAuthenticatedUser } from "@/lib/server/auth";
import { getClassroomLiveSessionForStudent, getClassroomLiveSessionForTeacherPreview, submitClassroomLiveResponse } from "@/lib/server/userStore";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (!code) return NextResponse.json({ error: "Join code is required." }, { status: 400 });

  const session = canAccessTeacherArea(authenticated.user)
    ? await getClassroomLiveSessionForTeacherPreview(authenticated.user.id, code)
    : await getClassroomLiveSessionForStudent(authenticated.user.id, code);
  if (!session) return NextResponse.json({ error: "Session not found." }, { status: 404 });

  return NextResponse.json({ session });
}

export async function POST(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (authenticated.user.role !== "student") return NextResponse.json({ error: "Student access required." }, { status: 403 });

  const body = await request.json().catch(() => null) as {
    sessionId?: unknown;
    promptId?: unknown;
    answer?: unknown;
  } | null;
  if (!body || typeof body.sessionId !== "string" || typeof body.promptId !== "string" || typeof body.answer !== "string") {
    return NextResponse.json({ error: "Invalid classroom response." }, { status: 400 });
  }

  const result = await submitClassroomLiveResponse({
    userId: authenticated.user.id,
    sessionId: body.sessionId,
    promptId: body.promptId,
    answer: body.answer
  });

  if (result.status !== "submitted") {
    const status = result.status === "forbidden" ? 403 : result.status === "not-found" ? 404 : 400;
    return NextResponse.json({ error: result.status }, { status });
  }

  return NextResponse.json({ session: result.session });
}
