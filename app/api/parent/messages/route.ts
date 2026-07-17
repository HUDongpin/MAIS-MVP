import { NextResponse } from "next/server";
import { requireParentUser } from "@/lib/server/auth";
import { consumeInMemoryRateLimit } from "@/lib/server/rateLimit";
import { createParentMessageThread, getParentMessagesData } from "@/lib/server/userStore";
import type { ParentMessageCategory } from "@/types";

export const runtime = "nodejs";

const createMessageRateLimit = { max: 12, windowMs: 60_000 };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function GET(request: Request) {
  const authenticated = await requireParentUser(request);
  if (!authenticated) return NextResponse.json({ error: "Parent access required." }, { status: 403 });

  const url = new URL(request.url);
  const data = await getParentMessagesData(
    authenticated.user.id,
    url.searchParams.get("studentId"),
    url.searchParams.get("thread")
  );
  if (!data) return NextResponse.json({ error: "Messages unavailable." }, { status: 404 });

  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const authenticated = await requireParentUser(request);
  if (!authenticated) return NextResponse.json({ error: "Parent access required." }, { status: 403 });

  const rateLimit = consumeInMemoryRateLimit(`parent-message:create:${authenticated.user.id}`, createMessageRateLimit);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many parent messages. Please wait before trying again." },
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

  const result = await createParentMessageThread({
    parentId: authenticated.user.id,
    studentId: typeof body.studentId === "string" ? body.studentId : "",
    category: body.category as ParentMessageCategory,
    subject: typeof body.subject === "string" ? body.subject : "",
    body: typeof body.body === "string" ? body.body : "",
    reportId: typeof body.reportId === "string" ? body.reportId : null
  });

  if (result.status === "created") return NextResponse.json({ thread: result.thread });
  const status = result.status === "forbidden" ? 403 : result.status === "not-found" ? 404 : result.status === "too-long" ? 413 : 400;
  return NextResponse.json({ error: result.status === "too-long" ? "Parent message is too long." : "Could not create parent message." }, { status });
}
