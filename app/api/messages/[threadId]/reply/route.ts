import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { replyToStudentMessageThread } from "@/lib/server/userStore";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function POST(request: Request, { params }: { params: Promise<{ threadId: string }> }) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = await request.json().catch(() => null) as unknown;
  if (!isRecord(body) || typeof body.body !== "string") {
    return NextResponse.json({ error: "Reply body is required." }, { status: 400 });
  }

  const { threadId } = await params;
  const result = await replyToStudentMessageThread({
    studentId: authenticated.user.id,
    threadId: decodeURIComponent(threadId),
    body: body.body
  });

  if (result.status === "not-found") return NextResponse.json({ error: "Thread not found." }, { status: 404 });
  if (result.status === "invalid") return NextResponse.json({ error: "Reply body is required." }, { status: 400 });

  return NextResponse.json({ thread: result.thread });
}

