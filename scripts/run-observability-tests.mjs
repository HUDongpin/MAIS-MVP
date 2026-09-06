import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

export const observabilityTests = [
  "lib/observability/privacy.test.ts",
  "lib/observability/browserReporter.test.ts",
  "lib/server/errorMonitor.test.ts",
  "lib/server/clientErrorReport.test.ts",
  "app/api/observability/client-error/route.test.ts",
  "app/api/observability/test-error/route.test.ts",
  "lib/server/healthCheck.test.ts",
  "app/api/health/route.test.ts"
];

export function offlineObservabilityEnv(inherited = process.env) {
  const env = { NODE_ENV: "test", TSX_DISABLE_CACHE: "1" };
  for (const key of ["PATH", "TMPDIR", "TMP", "TEMP", "LANG", "LC_ALL", "TZ", "NO_COLOR", "CI"]) {
    if (typeof inherited[key] === "string") env[key] = inherited[key];
  }
  return env;
}

export const offlineFetchGuard = `data:text/javascript,${encodeURIComponent('globalThis.fetch = async () => { throw new Error("Offline observability tests deny real fetch"); };')}`;

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = spawnSync(process.execPath, ["--import", offlineFetchGuard, "--import", "tsx", "--test", ...observabilityTests], {
    cwd: process.cwd(), env: offlineObservabilityEnv(), stdio: "inherit"
  });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
}
