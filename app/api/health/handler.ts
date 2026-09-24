import { createHash, timingSafeEqual } from "node:crypto";
import {
  createHealthAlertDispatcher,
  createStorageHealthReader,
  type HealthCheckEnv,
  type HealthCheckFetch,
  type StorageReadinessProbe
} from "@/lib/server/healthCheck";

/** Cron bearer is the only trusted identity, in every runtime. */
export function isTrustedHealthRequest(request: Request, env: HealthCheckEnv) {
  const secret = env.CRON_SECRET;
  if (typeof secret !== "string" || !secret || secret.length > 512 || /\s|[\x00-\x1f\x7f]/.test(secret)) return false;
  const actual = request.headers.get("authorization") ?? "";
  if (actual.length > 1024) return false;
  const expected = `Bearer ${secret}`;
  return timingSafeEqual(createHash("sha256").update(actual).digest(), createHash("sha256").update(expected).digest());
}

export function createHealthGetHandler({ probe, env = process.env, fetchImpl = fetch, now = Date.now }: {
  probe: StorageReadinessProbe;
  env?: HealthCheckEnv;
  fetchImpl?: HealthCheckFetch;
  now?: () => number;
}) {
  const reader = createStorageHealthReader({ probe, env, now });
  const alerts = createHealthAlertDispatcher({ env, fetchImpl });
  return async function healthGet(request: Request) {
    const trusted = isTrustedHealthRequest(request, env);
    const snapshot = await reader.read(trusted);
    if (trusted) {
      try { await alerts.dispatch({ snapshot, now: now() }); }
      catch { /* Alert failures do not change storage status or product responses. */ }
    }
    const body = trusted ? snapshot : {
      status: snapshot.status,
      storageReady: snapshot.storageReady,
      checkedInMs: snapshot.checkedInMs
    };
    return Response.json(body, {
      status: snapshot.status === "ok" ? 200 : 503,
      headers: { "Cache-Control": "no-store, max-age=0", "CDN-Cache-Control": "no-store", "Vercel-CDN-Cache-Control": "no-store" }
    });
  };
}
