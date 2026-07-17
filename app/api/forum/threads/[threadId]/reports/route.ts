import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { reportClassForumContent } from "@/lib/server/userStore";
import type { ForumReportReason } from "@/lib/forum";

export const runtime = "nodejs";

const validReasons = new Set<ForumReportReason>(["unsafe-content", "harassment", "off-topic", "privacy", "other"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

type RouteContext = {
  params: Promise<{ threadId: string }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { threadId } = await params;
  const body = await request.json().catch(() => null);
  if (!isRecord(body)) return NextResponse.json({ error: "Invalid forum report payload." }, { status: 400 });

  const targetType = body.targetType === "reply" || body.targetType === "pulse" ? body.targetType : "thread";
  const targetId = typeof body.targetId === "string" && body.targetId.trim() ? body.targetId : threadId;
  const reason = validReasons.has(body.reason as ForumReportReason) ? body.reason as ForumReportReason : "other";
  const result = await reportClassForumContent({
    userId: authenticated.user.id,
    threadId,
    targetType,
    targetId,
    reason,
    note: body.note
  });

  if (result.status === "reported") return NextResponse.json({ report: result.report, thread: result.thread }, { status: 201 });
  if (result.status === "forbidden") return NextResponse.json({ error: "You do not have permission to report this forum content." }, { status: 403 });
  return NextResponse.json({ error: "Forum content not found." }, { status: 404 });
}
