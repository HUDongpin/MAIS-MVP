import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const outputDir = join(".tmp", `analytics-tests-${process.pid}-${Date.now()}`);
const tscBin = process.platform === "win32" ? "node_modules/.bin/tsc.cmd" : "node_modules/.bin/tsc";

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: process.env
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    process.exitCode = result.status ?? 1;
    return false;
  }

  return true;
}

function cleanup() {
  try {
    rmSync(outputDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`Warning: could not remove ${outputDir}: ${message}`);
  }
}

mkdirSync(".tmp", { recursive: true });
cleanup();

try {
  const compiled = run(tscBin, ["-p", "tsconfig.analytics.json", "--outDir", outputDir]);
  if (!compiled) process.exit(process.exitCode);

  const passed = run("node", [
    "--test",
    join(outputDir, "lib/learningAnalytics.test.js"),
    join(outputDir, "lib/adaptiveLearning.test.js"),
    join(outputDir, "lib/diagnosticPlacement.test.js"),
    join(outputDir, "data/ccssCoherenceMap.test.js")
  ]);
  if (!passed) process.exit(process.exitCode);
} finally {
  cleanup();
}
