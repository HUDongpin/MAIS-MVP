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

type WarmRouteDependencies = {
  getStorageReadinessSnapshot: () => Promise<{ durableReady?: boolean } | null>;
  now?: () => number;
  readCronSecret: () => string | undefined;
};

const privateNoStoreHeaders = {
  "Cache-Control": "private, no-store, max-age=0"
};

export function createWarmRouteHandler({
  getStorageReadinessSnapshot: readStorageReadinessSnapshot,
  now = Date.now,
  readCronSecret
}: WarmRouteDependencies) {
  return async function handleWarmRequest(request: Request) {
    const secret = readCronSecret()?.trim();
    if (!secret) {
      return NextResponse.json(
        { error: "Warm endpoint unavailable." },
        { status: 503, headers: privateNoStoreHeaders }
      );
    }
    if (request.headers.get("authorization") !== `Bearer ${secret}`) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401, headers: privateNoStoreHeaders }
      );
    }

    const startedAt = now();
    let storageReady = false;
    try {
      const snapshot = await readStorageReadinessSnapshot();
      storageReady = Boolean(snapshot?.durableReady);
    } catch {
      storageReady = false;
    }

    return NextResponse.json(
      { warm: true, storageReady, warmedInMs: Math.max(0, now() - startedAt) },
      { headers: privateNoStoreHeaders }
    );
  };
}

export const GET = createWarmRouteHandler({
  getStorageReadinessSnapshot,
  readCronSecret: () => process.env.CRON_SECRET
});
