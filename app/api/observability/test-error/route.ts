import { NextResponse } from "next/server";
import { readErrorMonitorConfig, reportServerError } from "@/lib/server/errorMonitor";

/**
 * Deliberate-failure probe used to verify the monitoring pipeline end to end on a preview or
 * production deployment (see docs/observability.md, "Verifying the pipeline").
 *
 * It throws a real error, ships it through the normal capture path, and — unlike a production
 * route — reports back what the transport did, so "did the event actually leave the lambda?"
 * is answerable without opening the Sentry UI.
 *
 * Locked down: it 404s unless CRON_SECRET is configured AND the caller presents it, so it
 * cannot be used to burn the event budget or fingerprint the monitoring setup.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const notFound = () => NextResponse.json({ error: "Not found." }, { status: 404 });

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return notFound();
  if (request.headers.get("authorization") !== `Bearer ${secret}`) return notFound();

  const config = readErrorMonitorConfig();

  let result;
  try {
    throw new Error("Deliberate observability probe failure");
  } catch (error) {
    result = await reportServerError(error, {
      scope: "api-route",
      route: "/api/observability/test-error",
      kind: "deliberate-probe",
      status: 500,
      tags: { source: "observability-probe" }
    });
  }

  return NextResponse.json(
    {
      probe: "error-monitor",
      channel: config.channel,
      environment: config.environment,
      release: config.release,
      delivery: result.status,
      eventId: result.eventId ?? null,
      httpStatus: result.httpStatus ?? null,
      errorCode: result.errorCode ?? null
    },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}
