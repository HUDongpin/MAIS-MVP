import { NextResponse } from "next/server";
import { captureServerError } from "@/lib/server/errorMonitor";
import { dispatchHealthAlertIfDue, probeStorageHealth } from "@/lib/server/healthCheck";
import { getStorageReadinessSnapshot } from "@/lib/server/userStore";

/**
 * Uptime endpoint. `/api/warm` keeps a lambda hot and deliberately never fails; this one is
 * the opposite — it verifies that durable storage is actually readable and answers 503 when
 * it is not, so an external uptime monitor (or the Vercel cron registered in vercel.json)
 * notices an outage without a student having to report it.
 *
 * Public callers get status only. Cron-authenticated callers (Vercel sends
 * `Authorization: Bearer $CRON_SECRET`) additionally get deployment detail and are the ones
 * that drive alert dispatch — see docs/observability.md.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isCronRequest(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  // Without a configured secret there is nothing to verify; treat local/dev pings as cron so
  // the alert path is exercisable. Alert channels are unconfigured there, so it no-ops.
  if (!secret) return true;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  const snapshot = await probeStorageHealth({ probe: () => getStorageReadinessSnapshot() });
  const trusted = isCronRequest(request);

  if (trusted) {
    // Best-effort: an alerting failure must never change what this endpoint reports.
    try {
      await dispatchHealthAlertIfDue({ snapshot });
    } catch (error) {
      captureServerError(error, { scope: "health", route: "/api/health", kind: "alert-dispatch-failed" });
    }
  }

  if (snapshot.status === "degraded") {
    captureServerError(new Error(`health check degraded: ${snapshot.failureKind || "unknown"}`), {
      scope: "health",
      route: "/api/health",
      kind: snapshot.failureKind || "unknown",
      status: 503,
      tags: { storage: snapshot.provider },
      extra: { checkedInMs: snapshot.checkedInMs, storageReady: snapshot.storageReady }
    });
  }

  const body = trusted
    ? {
        status: snapshot.status,
        storageReady: snapshot.storageReady,
        checkedInMs: snapshot.checkedInMs,
        failureKind: snapshot.failureKind || undefined,
        provider: snapshot.provider,
        posture: snapshot.posture,
        environment: snapshot.environment,
        release: snapshot.release,
        region: snapshot.region
      }
    : {
        status: snapshot.status,
        storageReady: snapshot.storageReady,
        checkedInMs: snapshot.checkedInMs
      };

  return NextResponse.json(body, {
    status: snapshot.status === "ok" ? 200 : 503,
    headers: { "Cache-Control": "no-store, max-age=0" }
  });
}
