import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { addClassForumReply } from "@/lib/server/userStore";

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
  if (!isRecord(body)) return NextResponse.json({ error: "Invalid forum reply payload." }, { status: 400 });

  const result = await addClassForumReply({
    userId: authenticated.user.id,
    threadId,
    body: body.body,
    attachments: body.attachments
  });

  if (result.status === "created") return NextResponse.json({ thread: result.thread, reply: result.reply }, { status: 201 });
  if (result.status === "forbidden") return NextResponse.json({ error: "You do not have permission to reply in this forum." }, { status: 403 });
  if (result.status === "not-found") return NextResponse.json({ error: "Forum thread not found." }, { status: 404 });
  if (result.status === "locked") return NextResponse.json({ error: "This discussion is closed." }, { status: 409 });
  return NextResponse.json({ error: "Reply text is required." }, { status: 400 });
}
