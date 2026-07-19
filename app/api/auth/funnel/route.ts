import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import {
  isValidAuthFunnelEvent,
  maxAuthFunnelBatchSize,
  readAuthFunnelCounters,
  recordAuthFunnelEvents
} from "@/lib/server/authFunnelMetrics";
import { authRateLimitRules, consumeAuthRateLimit } from "@/lib/server/authRouteGuards";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rateLimit = consumeAuthRateLimit({
    request,
    scope: "funnel-ip",
    rule: authRateLimitRules.funnelIp
  });
  if (rateLimit) return rateLimit;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ accepted: 0 }, { status: 202 });
  }

  const events = (body as { events?: unknown } | null)?.events;
  if (!Array.isArray(events)) {
    return NextResponse.json({ accepted: 0 }, { status: 202 });
  }

  const accepted = recordAuthFunnelEvents(
    events.filter(isValidAuthFunnelEvent).slice(0, maxAuthFunnelBatchSize)
  );
  return NextResponse.json({ accepted }, { status: 202 });
}

export async function GET(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  if (authenticated.user.role !== "admin") {
    return NextResponse.json({ error: "Admin role required." }, { status: 403 });
  }

  const requestedDays = Number.parseInt(new URL(request.url).searchParams.get("days") ?? "30", 10);
  const days = Number.isFinite(requestedDays) ? requestedDays : 30;
  return NextResponse.json({ counters: readAuthFunnelCounters(days) });
}
