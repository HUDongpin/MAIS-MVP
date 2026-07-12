import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { updateClassForumThread } from "@/lib/server/userStore";
import type { ForumModerationStatus } from "@/lib/forum";

export const runtime = "nodejs";

const validActions = new Set(["me-too", "resolve", "pin", "lock", "hide", "delete", "edit", "moderate"]);
const validStatuses = new Set<ForumModerationStatus>(["visible", "needs-review", "hidden", "deleted"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

type RouteContext = {
  params: Promise<{ threadId: string }>;
};

export async function PATCH(request: Request, { params }: RouteContext) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { threadId } = await params;
  const body = await request.json().catch(() => null);
  if (!isRecord(body) || !validActions.has(String(body.action))) {
    return NextResponse.json({ error: "Invalid forum thread action." }, { status: 400 });
  }

  const result = await updateClassForumThread({
    userId: authenticated.user.id,
    threadId,
    action: body.action as "me-too" | "resolve" | "pin" | "lock" | "hide" | "delete" | "edit" | "moderate",
    value: typeof body.value === "boolean" ? body.value : undefined,
    title: body.title,
    body: body.body,
    reason: body.reason,
    targetType: body.targetType === "reply" || body.targetType === "pulse" ? body.targetType : "thread",
    targetId: body.targetId,
    moderationStatus: validStatuses.has(body.status as ForumModerationStatus) ? body.status as ForumModerationStatus : undefined
  });

  if (result.status === "updated") return NextResponse.json({ thread: result.thread });
  if (result.status === "forbidden") return NextResponse.json({ error: "You do not have permission to update this forum thread." }, { status: 403 });
  if (result.status === "not-found") return NextResponse.json({ error: "Forum thread not found." }, { status: 404 });
  if (result.status === "locked") return NextResponse.json({ error: "This discussion is closed." }, { status: 409 });
  return NextResponse.json({ error: "Invalid forum thread update." }, { status: 400 });
}
