import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { captureServerError } from "@/lib/server/errorMonitor";
import { consumeInMemoryRateLimit } from "@/lib/server/rateLimit";

/**
 * Ingest endpoint for browser crash reports (components/observability/ClientErrorReporter.tsx
 * and app/global-error.tsx). Unauthenticated by necessity — a crash on the login page is
 * exactly the one worth seeing — so it is bounded on every axis: per-IP rate limit, hard body
 * cap, fixed field allowlist, and the monitor's own per-minute shipping budget. It always
 * answers 204 so a caller learns nothing about whether monitoring is configured.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const maxBodyBytes = 8 * 1024;
const clientErrorRateLimit = { max: 20, windowMs: 15 * 60 * 1000 };

// Hashed, like every other rate-limit subject in lib/server/authRouteGuards.ts: the bucket
// key never holds a raw address.
function clientIpKey(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "local";
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

const noContent = () => new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  const allowance = consumeInMemoryRateLimit(`observability:client-error:${clientIpKey(request)}`, clientErrorRateLimit);
  if (!allowance.allowed) return noContent();

  let payload: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (!raw || raw.length > maxBodyBytes) return noContent();
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return noContent();
    payload = parsed as Record<string, unknown>;
  } catch {
    return noContent();
  }

  const name = asString(payload.name, "ClientError");
  const message = asString(payload.message, "Unknown client error");
  const route = asString(payload.route, "unknown");
  const source = asString(payload.source, "client");

  const error = new Error(message);
  error.name = name;
  error.stack = asString(payload.stack) || undefined;

  captureServerError(error, {
    scope: "client",
    route,
    kind: source,
    tags: { source, runtime: "browser" }
  });

  return noContent();
}
