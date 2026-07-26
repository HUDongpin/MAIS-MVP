import { NextResponse } from "next/server";
import { getStorageReadinessSnapshot } from "@/lib/server/userStore";

// Keep-warm endpoint. A scheduled ping (Vercel cron in vercel.json, or an external
// uptime pinger) hits this every few minutes so at least one serverless instance stays
// hot — its Node modules loaded and, critically, its pooled Postgres connection to Neon
// already established (TCP + TLS). That removes the cold-start + connection-handshake
// cost from the first login after an idle period, which was a large part of the ~10s
// "slow login" reports.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  // If no secret is configured, the endpoint is open (it only performs a read-only
  // readiness probe and returns no sensitive data). Vercel Cron automatically sends
  // `Authorization: Bearer <CRON_SECRET>` when the env var is set, so gate on it if present.
  if (!secret) return true;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const startedAt = Date.now();
  let storageReady = false;
  try {
    // Establishes/verifies the pooled DB connection and touches the hot auth tables —
    // the same durable path a login request exercises.
    const snapshot = await getStorageReadinessSnapshot();
    storageReady = Boolean(snapshot?.durableReady);
  } catch {
    // A warm ping must never fail the deployment health; report not-ready instead.
    storageReady = false;
  }

  return NextResponse.json(
    { warm: true, storageReady, warmedInMs: Date.now() - startedAt },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
