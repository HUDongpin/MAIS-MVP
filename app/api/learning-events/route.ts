import { NextResponse } from "next/server";
import { isValidLearningAnalyticsEventLog, maxStoredLearningAnalyticsEvents } from "@/lib/learningAnalytics";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { appendLearningEvents, clearLearningEventsForUser } from "@/lib/server/userStore";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) {
    return NextResponse.json({ accepted: 0, ignored: true }, { status: 202 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const events = (body as { events?: unknown } | null)?.events;
  if (!isValidLearningAnalyticsEventLog(events)) {
    return NextResponse.json({ error: "Expected a valid learning analytics event batch." }, { status: 400 });
  }

  const accepted = await appendLearningEvents(
    authenticated.user.id,
    events.slice(-Math.min(maxStoredLearningAnalyticsEvents, 200))
  );

  return NextResponse.json({ accepted });
}

export async function DELETE(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  await clearLearningEventsForUser(authenticated.user.id);
  return NextResponse.json({ ok: true });
}
