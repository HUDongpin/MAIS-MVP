import { createHash, timingSafeEqual } from "node:crypto";
import { readErrorMonitorConfig, reportServerError, type ErrorMonitorEnv } from "@/lib/server/errorMonitor";

export function createTestErrorHandler({ env = process.env, report = reportServerError }: {
  env?: ErrorMonitorEnv; report?: typeof reportServerError;
} = {}) {
  return async function GET(request: Request) {
    const headers = { "Cache-Control": "no-store" };
    const secret = env.CRON_SECRET?.trim();
    if (env.OBSERVABILITY_TEST_ERROR_ENABLED !== "true" || !secret) return Response.json({ error: "Not found." }, { status: 404, headers });
    const presented = createHash("sha256").update(request.headers.get("authorization") ?? "").digest();
    const expected = createHash("sha256").update(`Bearer ${secret}`).digest();
    if (!timingSafeEqual(presented, expected)) return Response.json({ error: "Not found." }, { status: 404, headers });
    const config = readErrorMonitorConfig(env);
    try {
      const result = await report(new Error("Deliberate observability probe failure"), {
        scope: "api-route", route: "/api/observability/test-error", kind: "deliberate-probe", status: 500,
        tags: { source: "observability-probe" }
      }, { env });
      return Response.json({ probe: "error-monitor", channel: config.channel, delivery: result.status, eventId: result.eventId ?? null }, { headers });
    } catch {
      return Response.json({ probe: "error-monitor", delivery: "failed" }, { headers });
    }
  };
}
