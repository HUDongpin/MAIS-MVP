import { NextResponse } from "next/server";
import { canAccessTeacherArea, requireAuthenticatedUser } from "@/lib/server/auth";
import { replyToTeacherMessageThread } from "@/lib/server/userStore";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ threadId: string }> }) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) return NextResponse.json({ error: "Teacher access required." }, { status: 403 });

  const { threadId } = await params;
  const body = await request.json().catch(() => null) as { body?: unknown } | null;
  if (!body || typeof body.body !== "string") {
    return NextResponse.json({ error: "Reply body is required." }, { status: 400 });
  }

  const result = await replyToTeacherMessageThread({
    teacherId: authenticated.user.id,
    threadId,
    body: body.body
  });

  if (result.status !== "sent") {
    return NextResponse.json({ error: result.status }, { status: result.status === "forbidden" ? 403 : result.status === "not-found" ? 404 : 400 });
  }

  return NextResponse.json({ thread: result.thread }, { status: 201 });
}
