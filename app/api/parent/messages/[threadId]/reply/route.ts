import { NextResponse } from "next/server";
import { requireParentUser } from "@/lib/server/auth";
import { consumeInMemoryRateLimit } from "@/lib/server/rateLimit";
import { replyToParentMessageThread } from "@/lib/server/userStore";

export const runtime = "nodejs";

const replyRateLimit = { max: 30, windowMs: 60_000 };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function POST(request: Request, { params }: { params: Promise<{ threadId: string }> }) {
  const authenticated = await requireParentUser(request);
  if (!authenticated) return NextResponse.json({ error: "Parent access required." }, { status: 403 });

  const rateLimit = consumeInMemoryRateLimit(`parent-message:reply:${authenticated.user.id}`, replyRateLimit);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many parent replies. Please wait before trying again." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
    );
  }

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
  const status = result.status === "forbidden" ? 403 : result.status === "not-found" ? 404 : result.status === "too-long" ? 413 : 400;
  return NextResponse.json({ error: result.status === "too-long" ? "Parent reply is too long." : "Could not send parent reply." }, { status });
}
