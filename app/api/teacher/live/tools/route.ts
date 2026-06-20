import { NextResponse } from "next/server";
import { canAccessTeacherArea, requireAuthenticatedUser } from "@/lib/server/auth";
import { updateTeacherLiveTool } from "@/lib/server/userStore";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) return NextResponse.json({ error: "Teacher access required." }, { status: 403 });

  const body = await request.json().catch(() => null) as {
    sessionId?: unknown;
    action?: unknown;
    payload?: unknown;
  } | null;

  if (!body || typeof body.sessionId !== "string" || typeof body.action !== "string") {
    return NextResponse.json({ error: "Invalid live tool payload." }, { status: 400 });
  }

  const result = await updateTeacherLiveTool({
    teacherId: authenticated.user.id,
    sessionId: body.sessionId,
    action: body.action,
    payload: body.payload
  });

  if (result.status !== "updated") {
    const status = result.status === "forbidden" ? 403 : result.status === "not-found" ? 404 : 400;
    return NextResponse.json({ error: result.status }, { status });
  }

  return NextResponse.json({ session: result.session });
}
