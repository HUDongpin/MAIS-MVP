import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("teacher notice webhook maintenance route is a dynamic Node cron endpoint", async () => {
  const source = await readFile(new URL("./route.ts", import.meta.url), "utf8");
  assert.match(source, /export const runtime = "nodejs"/u);
  assert.match(source, /export const dynamic = "force-dynamic"/u);
  assert.match(source, /export const maxDuration = 30/u);
  assert.match(source, /createTeacherNoticeResendWebhookMaintenanceHandler/u);
  assert.match(source, /maintainTeacherNoticeResendWebhook/u);
  assert.match(source, /export async function GET/u);
  const vercel = JSON.parse(await readFile(
    new URL("../../../../vercel.json", import.meta.url),
    "utf8"
  )) as { crons?: Array<{ path: string; schedule: string }> };
  assert.deepEqual(vercel.crons?.find((entry) =>
    entry.path === "/api/cron/teacher-notice-resend-webhook-maintenance"
  ), {
    path: "/api/cron/teacher-notice-resend-webhook-maintenance",
    schedule: "*/5 * * * *"
  });
});
