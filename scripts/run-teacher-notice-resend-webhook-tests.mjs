import { spawn } from "node:child_process";

const tests = [
  "lib/server/teacherNoticeResendWebhook.test.ts",
  "lib/server/teacherNoticeResendWebhookHandler.test.ts",
  "lib/server/teacherNoticeResendWebhookMaintenanceHandler.test.ts",
  "lib/server/teacherNoticeResendWebhookStore.test.ts",
  "lib/server/userStore/teacherNoticeResendWebhookPersistence.test.ts",
  "app/api/webhooks/resend/teacher-notices/route.test.ts",
  "app/api/cron/teacher-notice-resend-webhook-maintenance/route.test.ts",
  "scripts/teacher-notice-resend-webhook-migration.test.mjs"
];

const child = spawn(process.execPath, ["--import", "tsx", "--test", ...tests], {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit"
});
child.once("error", (error) => {
  throw error;
});
child.once("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exitCode = code ?? 1;
});
