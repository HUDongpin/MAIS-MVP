import { NextResponse } from "next/server";
import { canAccessTeacherArea, requireAuthenticatedUser } from "@/lib/server/auth";
import { updateTeacherMessageThread } from "@/lib/server/userStore";
import type { TeacherMessageStatus } from "@/types";

export const runtime = "nodejs";

const validStatuses = new Set<TeacherMessageStatus>(["unread", "open", "resolved"]);

export async function PATCH(request: Request, { params }: { params: Promise<{ threadId: string }> }) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) return NextResponse.json({ error: "Teacher access required." }, { status: 403 });

  const { threadId } = await params;
  const body = await request.json().catch(() => null) as { status?: unknown; starred?: unknown } | null;
  if (!body) return NextResponse.json({ error: "Patch body is required." }, { status: 400 });

  const status = validStatuses.has(body.status as TeacherMessageStatus) ? (body.status as TeacherMessageStatus) : undefined;
  const result = await updateTeacherMessageThread({
    teacherId: authenticated.user.id,
    threadId,
    status,
    starred: typeof body.starred === "boolean" ? body.starred : undefined
  });

  if (result.status !== "updated") {
    return NextResponse.json({ error: result.status }, { status: result.status === "forbidden" ? 403 : 404 });
  }

  return NextResponse.json({ thread: result.thread });
}
