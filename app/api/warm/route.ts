import { getStorageReadinessSnapshot } from "@/lib/server/userStore";
import { createWarmRouteHandler } from "./handler";

// Keep-warm endpoint. A scheduled ping (Vercel cron in vercel.json, or an external
// uptime pinger) hits this every few minutes so at least one serverless instance stays
// hot — its Node modules loaded and, critically, its pooled Postgres connection to Neon
// already established (TCP + TLS). That removes the cold-start + connection-handshake
// cost from the first login after an idle period, which was a large part of the ~10s
// "slow login" reports.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = createWarmRouteHandler({
  getStorageReadinessSnapshot,
  readCronSecret: () => process.env.CRON_SECRET
});
