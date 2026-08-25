import { defineConfig, devices } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  assertStarshipE2eEnvironment,
  assertStarshipPath,
  buildStarshipE2ePathManifest
} from "./scripts/starship-e2e-path-gate.mjs";
import { validateStarshipPlaywrightPrebuildReceipt } from "./scripts/run-starship-playwright.mjs";

const port = Number(process.env.PLAYWRIGHT_PORT ?? 3020);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`;
const browserChannel = process.env.PLAYWRIGHT_BROWSER_CHANNEL ?? "chrome";
if (browserChannel !== "chrome") {
  throw new Error(`Starship E2E requires PLAYWRIGHT_BROWSER_CHANNEL=chrome; actual=${browserChannel}.`);
}
const runId = sanitizePathSegment(process.env.PLAYWRIGHT_RUN_ID ?? `${port}-${process.pid}`);
const starshipPathManifest = buildStarshipE2ePathManifest({
  repositoryRoot: process.cwd(),
  runId,
  overrides: {
    browserProfileEvidencePath: process.env.PLAYWRIGHT_BROWSER_PROFILE_EVIDENCE_PATH?.trim(),
    browserProcessEvidencePath: process.env.PLAYWRIGHT_BROWSER_PROCESS_EVIDENCE_PATH?.trim(),
    browserTempDir: process.env.PLAYWRIGHT_BROWSER_TEMP_DIR?.trim(),
    crashDumpDir: process.env.PLAYWRIGHT_CRASH_DUMP_DIR?.trim(),
    databasePath: process.env.HK_MATH_DB_PATH?.trim(),
    e2eRunRoot: process.env.PLAYWRIGHT_E2E_ROOT?.trim(),
    nextDistDir: process.env.PLAYWRIGHT_NEXT_DIST_DIR?.trim(),
    nextTsconfigPath: process.env.PLAYWRIGHT_NEXT_TSCONFIG_PATH?.trim(),
    nodeCompileCacheDir: process.env.NODE_COMPILE_CACHE?.trim(),
    npmCacheDir: process.env.npm_config_cache?.trim(),
    outputDir: process.env.PLAYWRIGHT_OUTPUT_DIR?.trim(),
    pathManifestPath: process.env.PLAYWRIGHT_PATH_MANIFEST_PATH?.trim(),
    reportDir: process.env.PLAYWRIGHT_REPORT_DIR?.trim(),
    serverCommandOwnerPidPath: process.env.PLAYWRIGHT_SERVER_COMMAND_OWNER_PID_PATH?.trim(),
    serverLogPath: process.env.PLAYWRIGHT_SERVER_LOG_PATH?.trim()
  }
});
const e2eRunRoot = starshipPathManifest.paths.e2eRunRoot;
const e2eNextDistDir = starshipPathManifest.paths.nextDistDir;
const e2eNextDistRelative = path.relative(starshipPathManifest.paths.repositoryRoot, e2eNextDistDir);
const e2eNextTsconfigPath = starshipPathManifest.paths.nextTsconfigPath;
const e2eDbPath = starshipPathManifest.paths.databasePath;
const e2eNodeCompileCacheDir = starshipPathManifest.paths.nodeCompileCacheDir;
const e2eNpmCacheDir = starshipPathManifest.paths.npmCacheDir;
const e2eOutputDir = starshipPathManifest.paths.outputDir;
const e2eReportDir = starshipPathManifest.paths.reportDir;
const e2eBrowserTempDir = starshipPathManifest.paths.browserTempDir;
const e2eCrashDumpDir = starshipPathManifest.paths.crashDumpDir;
const e2eServerLogPath = starshipPathManifest.paths.serverLogPath;
const e2eServerCommandOwnerPidPath = starshipPathManifest.paths.serverCommandOwnerPidPath;
const e2ePathManifestPath = starshipPathManifest.paths.pathManifestPath;
assertStarshipE2eEnvironment(
  process.env,
  e2eBrowserTempDir,
  e2eNodeCompileCacheDir,
  e2eNpmCacheDir
);
validateStarshipPlaywrightPrebuildReceipt({
  baseURL,
  environment: process.env,
  pathManifest: starshipPathManifest,
  port,
  processIdentity: process
});
const reporterPathEnvironmentNames = [
  "PLAYWRIGHT_BLOB_OUTPUT_DIR",
  "PLAYWRIGHT_BLOB_OUTPUT_FILE",
  "PLAYWRIGHT_HTML_OUTPUT_DIR",
  "PLAYWRIGHT_HTML_REPORT",
  "PLAYWRIGHT_JSON_OUTPUT_FILE",
  "PLAYWRIGHT_JUNIT_OUTPUT_DIR",
  "PLAYWRIGHT_JUNIT_OUTPUT_FILE"
];
const reporterExternalPaths: Record<string, string> = {};
for (const name of reporterPathEnvironmentNames) {
  const value = process.env[name]?.trim();
  if (value) reporterExternalPaths[name] = assertStarshipPath(name, value);
}
const jsonReportPath = reporterExternalPaths.PLAYWRIGHT_JSON_OUTPUT_FILE;
const outputArgumentIndex = process.argv.findIndex((argument) => argument === "--output");
const outputArgument = process.argv.find((argument) => argument.startsWith("--output="));
const outputOverride = outputArgumentIndex >= 0
  ? process.argv[outputArgumentIndex + 1]
  : outputArgument?.slice("--output=".length);
if (outputOverride) {
  const canonicalOutputOverride = assertStarshipPath("Playwright --output", outputOverride);
  if (canonicalOutputOverride !== e2eOutputDir) {
    throw new Error(
      `Playwright --output must equal the canonical run outputDir ${e2eOutputDir}; ` +
      `actual=${canonicalOutputOverride}.`
    );
  }
}
process.env.PLAYWRIGHT_RUN_ID = runId;
process.env.PLAYWRIGHT_E2E_ROOT = e2eRunRoot;
process.env.PLAYWRIGHT_BROWSER_PROFILE_EVIDENCE_PATH = starshipPathManifest.paths.browserProfileEvidencePath;
process.env.PLAYWRIGHT_BROWSER_PROCESS_EVIDENCE_PATH = starshipPathManifest.paths.browserProcessEvidencePath;
process.env.PLAYWRIGHT_BROWSER_TEMP_DIR = e2eBrowserTempDir;
process.env.PLAYWRIGHT_CRASH_DUMP_DIR = e2eCrashDumpDir;
process.env.PLAYWRIGHT_NEXT_DIST_DIR = e2eNextDistDir;
process.env.PLAYWRIGHT_NEXT_TSCONFIG_PATH = e2eNextTsconfigPath;
process.env.PLAYWRIGHT_OUTPUT_DIR = e2eOutputDir;
process.env.PLAYWRIGHT_PATH_MANIFEST_PATH = e2ePathManifestPath;
process.env.PLAYWRIGHT_REPORT_DIR = e2eReportDir;
process.env.PLAYWRIGHT_SERVER_COMMAND_OWNER_PID_PATH = e2eServerCommandOwnerPidPath;
process.env.PLAYWRIGHT_SERVER_LOG_PATH = e2eServerLogPath;
process.env.HK_MATH_DB_PATH = e2eDbPath;
process.env.npm_config_cache = e2eNpmCacheDir;
for (const directory of [
  e2eBrowserTempDir,
  e2eCrashDumpDir,
  path.dirname(e2eDbPath),
  path.dirname(e2eNextTsconfigPath),
  e2eNodeCompileCacheDir,
  e2eNpmCacheDir,
  e2eOutputDir,
  path.dirname(e2ePathManifestPath),
  path.dirname(starshipPathManifest.paths.browserProcessEvidencePath),
  e2eReportDir,
  path.dirname(e2eServerCommandOwnerPidPath),
  path.dirname(e2eServerLogPath)
]) {
  mkdirSync(directory, { recursive: true });
}
writeFileSync(
  e2ePathManifestPath,
  `${JSON.stringify({
    ...starshipPathManifest,
    externalEvidencePaths: {
      ...reporterExternalPaths,
      ...(jsonReportPath ? { jsonReportPath: path.resolve(jsonReportPath) } : {})
    },
    process: { cwd: process.cwd(), pid: process.pid, ppid: process.ppid },
    status: "preflight-passed"
  }, null, 2)}\n`,
  "utf8"
);
const disabledProviderEnv = [
  "LLM_API_KEY=",
  "OPENAI_API_KEY=",
  "LLM_MODEL=",
  "OPENAI_MODEL=",
  "LLM_API_URL=",
  "DEEPSEEK_API_KEY=",
  "DEEPSEEK_MODEL=",
  "DEEPSEEK_API_URL=",
  "QWEN_API_KEY=",
  "QWEN_API_URL=",
  "QWEN_MODEL=",
  "QWEN_TEXT_MODEL=qwen3.7-plus",
  "QWEN_IMAGE_MODEL=",
  "QWEN_IMAGE_API_URL=",
  "QWEN_REALTIME_MODEL=",
  "QWEN_REALTIME_API_URL=",
  "AI_TUTOR_PROVIDER_PROFILE=offline-fixture",
  "NEXT_TELEMETRY_DISABLED=1",
  `npm_config_cache=${shellQuote(e2eNpmCacheDir)}`,
  "npm_config_update_notifier=false"
].join(" ");
const isolatedStatefulSpecs = [
  "tests/e2e/rewards.spec.ts",
  "tests/e2e/gamification.spec.ts",
  "tests/e2e/fishing-game.spec.ts",
  "tests/e2e/adventure-island.spec.ts",
  "tests/e2e/parent-console-stress.spec.ts"
];
const selectedSpecArgs = process.argv
  .slice(2)
  .map((arg) => arg.replace(/\\/g, "/"))
  .filter((arg) => arg.endsWith(".spec.ts") || arg.includes("tests/e2e/"));
const runsOnlyIsolatedStatefulSpecs =
  selectedSpecArgs.length > 0 &&
  selectedSpecArgs.every((arg) => isolatedStatefulSpecs.some((spec) => arg === spec || arg.endsWith(`/${spec}`)));
const useGlobalWebServer = !process.env.PLAYWRIGHT_SKIP_WEBSERVER && !runsOnlyIsolatedStatefulSpecs;

assertSafeE2eGeneratedPath("PLAYWRIGHT_E2E_ROOT", e2eRunRoot);
assertSafeE2eGeneratedPath("PLAYWRIGHT_NEXT_DIST_DIR", e2eNextDistDir);

function sanitizePathSegment(value: string) {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "default";
}

function isPathInside(absolutePath: string, root: string) {
  const relative = path.relative(root, absolutePath);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function assertSafeE2eGeneratedPath(label: string, value: string) {
  const absolutePath = path.resolve(value);
  const defaultNextDir = path.resolve(".next");
  const tmpDir = path.resolve(".tmp");

  if (absolutePath === defaultNextDir || isPathInside(absolutePath, defaultNextDir)) {
    throw new Error(`${label} must not point at the shared .next directory for Playwright release runs.`);
  }

  if (!isPathInside(absolutePath, tmpDir)) {
    throw new Error(`${label} must stay under the Starship worktree's .tmp directory.`);
  }
}

function shellQuote(value: string) {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

export default defineConfig({
  globalSetup: "./tests/e2e/starship-e2e-global-setup.ts",
  testDir: "./tests/e2e",
  outputDir: e2eOutputDir,
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  // These are long, sequential teacher/parent journeys (navigate → create →
  // upload → publish → export in a single test). The default 30s per-test /
  // 5s expect timeouts are fine locally but too tight on the 2-core CI runner,
  // where a publish→POST→router.push round-trip alone can exceed 5s. Give CI
  // headroom; the flows themselves are verified working (POST 201 + navigation).
  timeout: process.env.CI ? 120_000 : 60_000,
  expect: { timeout: process.env.CI ? 15_000 : 8_000 },
  reporter: [["list"], ["html", { open: "never", outputFolder: e2eReportDir }]],
  use: {
    baseURL,
    channel: browserChannel || undefined,
    launchOptions: {
      args: [
        "--disable-breakpad",
        "--disable-crash-reporter",
        `--crash-dumps-dir=${e2eCrashDumpDir}`
      ]
    },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure"
  },
  webServer: !useGlobalWebServer
    ? undefined
    : {
        command: [
          `echo $$ > ${shellQuote(e2eServerCommandOwnerPidPath)}`,
          `exec env NEXT_DIST_DIR=${shellQuote(e2eNextDistRelative)} ${disabledProviderEnv} AUTH_SESSION_SECRET=e2e-session-secret HK_MATH_DB_PATH=${shellQuote(e2eDbPath)} HK_MATH_EXPOSE_LOCAL_RESET_LINKS=true HK_MATH_ENABLE_DEMO_USER=true AI_TUTOR_MAX_REQUESTS_PER_MINUTE=2 HK_MATH_E2E_LOGIN_IDENTIFIER_MAX=400 npm run start -- --hostname 127.0.0.1 --port ${port} >> ${shellQuote(e2eServerLogPath)} 2>&1`
        ].join(" && "),
        url: baseURL,
        reuseExistingServer: false,
        timeout: 600_000
      },
  projects: [
    {
      name: "desktop-chrome",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 1100 } }
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 5"], isMobile: true }
    }
  ]
});
