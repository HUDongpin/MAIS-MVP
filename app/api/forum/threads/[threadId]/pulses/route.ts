import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { addClassForumLivePulse } from "@/lib/server/userStore";

export const runtime = "nodejs";

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
  if (!isRecord(body)) return NextResponse.json({ error: "Invalid live response payload." }, { status: 400 });

  const result = await addClassForumLivePulse({
    userId: authenticated.user.id,
    threadId,
    body: body.body,
    attachments: body.attachments
  });

  if (result.status === "created") return NextResponse.json({ thread: result.thread, pulse: result.pulse }, { status: 201 });
  if (result.status === "forbidden") return NextResponse.json({ error: "You do not have permission to respond in this forum." }, { status: 403 });
  if (result.status === "not-found") return NextResponse.json({ error: "Forum thread not found." }, { status: 404 });
  if (result.status === "locked") return NextResponse.json({ error: "This live discussion is closed." }, { status: 409 });
  return NextResponse.json({ error: "Live response text is required." }, { status: 400 });
}
