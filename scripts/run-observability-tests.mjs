import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

export const observabilityTests = [
  "lib/observability/privacy.test.ts",
  "lib/observability/browserReporter.test.ts",
  "lib/server/errorMonitor.test.ts",
  "lib/server/clientErrorReport.test.ts",
  "app/api/observability/client-error/route.test.ts",
  "app/api/observability/test-error/route.test.ts"
];

export function offlineObservabilityEnv(inherited = process.env) {
  const env = { ...inherited };
  for (const key of Object.keys(env)) {
    if (/^(?:SENTRY_|ERROR_MONITOR_|HEALTH_ALERT_|OBSERVABILITY_|CRON_SECRET$|RESEND_API_KEY$)/.test(key)) delete env[key];
  }
  return env;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = spawnSync(process.execPath, ["--import", "tsx", "--test", ...observabilityTests], {
    cwd: process.cwd(), env: offlineObservabilityEnv(), stdio: "inherit"
  });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
}
