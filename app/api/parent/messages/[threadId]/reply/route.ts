import { NextResponse } from "next/server";
import { requireParentUser } from "@/lib/server/auth";
import { replyToParentMessageThread } from "@/lib/server/userStore";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function POST(request: Request, { params }: { params: Promise<{ threadId: string }> }) {
  const authenticated = await requireParentUser(request);
  if (!authenticated) return NextResponse.json({ error: "Parent access required." }, { status: 403 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }
  if (!isRecord(body)) return NextResponse.json({ error: "Request body must be an object." }, { status: 400 });

  const { threadId } = await params;
  const result = await replyToParentMessageThread({
    parentId: authenticated.user.id,
    threadId,
    body: typeof body.body === "string" ? body.body : ""
  });

  if (result.status === "sent") return NextResponse.json({ thread: result.thread });
  const status = result.status === "forbidden" ? 403 : result.status === "not-found" ? 404 : 400;
  return NextResponse.json({ error: "Could not send parent reply." }, { status });
}
