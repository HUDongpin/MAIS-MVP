import { defineConfig, devices } from "@playwright/test";
import { createHash } from "node:crypto";
import {
  closeSync,
  constants as fsConstants,
  fstatSync,
  lstatSync,
  openSync,
  readFileSync,
} from "node:fs";
import type { BigIntStats } from "node:fs";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import {
  assertHkVisualizationStarshipPath,
  buildHkVisualizationManagedWebServerCommand,
  buildHkVisualizationStarshipPathManifest,
} from "./tests/e2e/hk-visualization-starship-path-contract.mjs";
import {
  buildHkVisualizationCanonicalE2eTsconfigBytes,
} from "./tests/e2e/hk-visualization-e2e-tsconfig-contract.mjs";

const port = Number(process.env.PLAYWRIGHT_PORT ?? 3020);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`;
const browserChannel = process.env.PLAYWRIGHT_BROWSER_CHANNEL ?? "chrome";
const hkVisualizationCanonicalRelease =
  process.env.HK_VISUALIZATION_CANONICAL_RELEASE === "1";
const runId = sanitizePathSegment(process.env.PLAYWRIGHT_RUN_ID ?? `${port}-${process.pid}`);
const pathRunId = process.env.PLAYWRIGHT_RUN_ID?.trim()
  ? runId
  : `e2e-run-${runId}`;
const e2eWorkspace = assertHkVisualizationStarshipPath(
  "PLAYWRIGHT_WORKSPACE",
  path.resolve("."),
);
const starshipPaths = buildHkVisualizationStarshipPathManifest({
  runId: pathRunId,
  workspace: e2eWorkspace,
});
const exactManagedPath = (label: string, configured: string | undefined, expected: string) => {
  if (!configured?.trim()) return expected;
  const resolved = assertHkVisualizationStarshipPath(label, configured.trim());
  if (resolved !== expected) {
    throw new Error(
      `${label} must equal this run's canonical Starship path ${expected}; received ${resolved}.`,
    );
  }
  return resolved;
};

type RegularFileSnapshot = Readonly<{
  bytes: Buffer;
  device: bigint;
  inode: bigint;
  mode: number;
}>;

function isMissingEntry(error: unknown): error is NodeJS.ErrnoException {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === "ENOENT"
  );
}

function entryType(metadata: BigIntStats) {
  if (metadata.isSymbolicLink()) return "symlink";
  if (metadata.isFile()) return "regular file";
  if (metadata.isDirectory()) return "directory";
  return "non-regular filesystem entry";
}

function sameStableFileState(
  left: BigIntStats,
  right: BigIntStats,
) {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.size === right.size &&
    left.mtimeNs === right.mtimeNs &&
    left.ctimeNs === right.ctimeNs
  );
}

function readStableRegularFile(filePath: string, label: string): RegularFileSnapshot {
  assertHkVisualizationStarshipPath(label, filePath);
  let before: BigIntStats;
  try {
    before = lstatSync(filePath, { bigint: true });
  } catch (error) {
    if (isMissingEntry(error)) {
      throw new Error(`${label} must be prewritten by the canonical runner at ${filePath}.`, {
        cause: error,
      });
    }
    throw error;
  }
  if (before.isSymbolicLink() || !before.isFile()) {
    throw new Error(
      `${label} must be a regular non-symlink file; received ${entryType(before)} at ${filePath}.`,
    );
  }
  const noFollow = fsConstants.O_NOFOLLOW;
  if (!Number.isInteger(noFollow)) {
    throw new Error(`${label} cannot be opened fail-closed because O_NOFOLLOW is unavailable.`);
  }
  const descriptor = openSync(filePath, fsConstants.O_RDONLY | noFollow);
  try {
    const openedBefore = fstatSync(descriptor, { bigint: true });
    if (
      !openedBefore.isFile() ||
      openedBefore.dev !== before.dev ||
      openedBefore.ino !== before.ino
    ) {
      throw new Error(`${label} changed identity while it was opened.`);
    }
    const bytes = readFileSync(descriptor);
    const openedAfter = fstatSync(descriptor, { bigint: true });
    const after = lstatSync(filePath, { bigint: true });
    assertHkVisualizationStarshipPath(label, filePath);
    if (
      after.isSymbolicLink() ||
      !after.isFile() ||
      !sameStableFileState(openedBefore, openedAfter) ||
      openedAfter.dev !== after.dev ||
      openedAfter.ino !== after.ino ||
      openedAfter.size !== after.size ||
      openedAfter.mtimeNs !== after.mtimeNs ||
      openedAfter.ctimeNs !== after.ctimeNs
    ) {
      throw new Error(`${label} changed while its bytes were read.`);
    }
    const mode = Number(openedAfter.mode & BigInt(0o777));
    if (mode !== 0o600) {
      throw new Error(
        `${label} must use mode 0600; received ${mode.toString(8).padStart(4, "0")} at ${filePath}.`,
      );
    }
    return Object.freeze({
      bytes,
      device: openedAfter.dev,
      inode: openedAfter.ino,
      mode,
    });
  } finally {
    closeSync(descriptor);
  }
}

function requireStablePhysicalDirectory(
  directoryPath: string,
  label: string,
) {
  assertHkVisualizationStarshipPath(label, directoryPath);
  let before: BigIntStats;
  try {
    before = lstatSync(directoryPath, { bigint: true });
  } catch (error) {
    if (isMissingEntry(error)) {
      throw new Error(
        `${label} must be precreated by the canonical runner at ${directoryPath}.`,
        { cause: error },
      );
    }
    throw error;
  }
  if (before.isSymbolicLink() || !before.isDirectory()) {
    throw new Error(
      `${label} must be a physical non-symlink directory; received ${entryType(before)} at ${directoryPath}.`,
    );
  }
  const directoryFlag = fsConstants.O_DIRECTORY;
  const noFollow = fsConstants.O_NOFOLLOW;
  if (!Number.isInteger(directoryFlag) || !Number.isInteger(noFollow)) {
    throw new Error(
      `${label} cannot be opened fail-closed because O_DIRECTORY or O_NOFOLLOW is unavailable.`,
    );
  }
  const descriptor = openSync(
    directoryPath,
    fsConstants.O_RDONLY | directoryFlag | noFollow,
  );
  try {
    const opened = fstatSync(descriptor, { bigint: true });
    const after = lstatSync(directoryPath, { bigint: true });
    assertHkVisualizationStarshipPath(label, directoryPath);
    if (
      !opened.isDirectory() ||
      after.isSymbolicLink() ||
      !after.isDirectory() ||
      opened.dev !== before.dev ||
      opened.ino !== before.ino ||
      opened.dev !== after.dev ||
      opened.ino !== after.ino ||
      !sameStableFileState(opened, after)
    ) {
      throw new Error(
        `${label} changed identity while its physical directory was verified.`,
      );
    }
  } finally {
    closeSync(descriptor);
  }
}

function requireExactPrewrittenFile(
  filePath: string,
  expectedBytes: Buffer,
  label: string,
) {
  const snapshot = readStableRegularFile(filePath, label);
  if (!snapshot.bytes.equals(expectedBytes)) {
    throw new Error(`${label} byte identity drifted at ${filePath}.`);
  }
  return snapshot;
}

function requireExactPrewrittenPathManifest(
  filePath: string,
  expectedBytes: Buffer,
  expectedJson: unknown,
) {
  const label = "HK Visualization Starship path manifest";
  const snapshot = readStableRegularFile(filePath, label);
  let parsed: unknown;
  try {
    parsed = JSON.parse(snapshot.bytes.toString("utf8"));
  } catch (error) {
    throw new Error(`${label} JSON identity is unreadable at ${filePath}.`, {
      cause: error,
    });
  }
  if (!isDeepStrictEqual(parsed, expectedJson)) {
    throw new Error(`${label} JSON identity drifted at ${filePath}.`);
  }
  if (!snapshot.bytes.equals(expectedBytes)) {
    throw new Error(`${label} byte identity drifted at ${filePath}.`);
  }
}
const e2eRunRoot = exactManagedPath(
  "PLAYWRIGHT_E2E_ROOT",
  process.env.PLAYWRIGHT_E2E_ROOT,
  starshipPaths.artifactRoot,
);
const e2eNextDistDir = exactManagedPath(
  "PLAYWRIGHT_NEXT_DIST_DIR",
  process.env.PLAYWRIGHT_NEXT_DIST_DIR,
  starshipPaths.nextDistDir,
);
const e2eNextTsconfigPath = exactManagedPath(
  "PLAYWRIGHT_NEXT_TSCONFIG_PATH",
  process.env.PLAYWRIGHT_NEXT_TSCONFIG_PATH,
  starshipPaths.nextTsconfigPath,
);
const e2eDbPath = exactManagedPath(
  "HK_MATH_DB_PATH",
  process.env.HK_MATH_DB_PATH,
  starshipPaths.databasePath,
);
const e2eSqliteTmpDir = exactManagedPath(
  "SQLITE_TMPDIR",
  process.env.SQLITE_TMPDIR,
  starshipPaths.sqliteTmpDir,
);
const e2eOutputDir = exactManagedPath(
  "PLAYWRIGHT_OUTPUT_DIR",
  process.env.PLAYWRIGHT_OUTPUT_DIR,
  starshipPaths.outputDir,
);
const e2eReportDir = exactManagedPath(
  "PLAYWRIGHT_REPORT_DIR",
  process.env.PLAYWRIGHT_REPORT_DIR,
  starshipPaths.reportDir,
);
const e2eJsonReport = exactManagedPath(
  "PLAYWRIGHT_JSON_OUTPUT_FILE",
  process.env.PLAYWRIGHT_JSON_OUTPUT_FILE,
  starshipPaths.jsonReport,
);
const e2eRuntimeTmpDir = exactManagedPath(
  "PLAYWRIGHT_RUNTIME_TMPDIR",
  process.env.PLAYWRIGHT_RUNTIME_TMPDIR,
  starshipPaths.runtimeTmpDir,
);
const e2eRuntimeHomeDir = exactManagedPath(
  "HOME",
  process.env.HOME,
  starshipPaths.runtimeTmpDir,
);
const e2eBrowserProfileRoot = exactManagedPath(
  "PLAYWRIGHT_BROWSER_PROFILE_ROOT",
  process.env.PLAYWRIGHT_BROWSER_PROFILE_ROOT,
  starshipPaths.browserProfileParent,
);
const e2eServiceLogDir = exactManagedPath(
  "PLAYWRIGHT_SERVICE_LOG_DIR",
  process.env.PLAYWRIGHT_SERVICE_LOG_DIR,
  starshipPaths.serviceLogDir,
);
const e2eServicePidDir = exactManagedPath(
  "PLAYWRIGHT_SERVICE_PID_DIR",
  process.env.PLAYWRIGHT_SERVICE_PID_DIR,
  starshipPaths.servicePidDir,
);
const e2ePathManifestFile = exactManagedPath(
  "PLAYWRIGHT_PATH_MANIFEST_FILE",
  process.env.PLAYWRIGHT_PATH_MANIFEST_FILE,
  starshipPaths.pathManifestFile,
);
const e2eNodeCompileCacheDir = exactManagedPath(
  "NODE_COMPILE_CACHE",
  process.env.NODE_COMPILE_CACHE,
  starshipPaths.nodeCompileCacheDir,
);
const configuredNpmCacheValues = [
  process.env.NPM_CONFIG_CACHE,
  process.env.npm_config_cache,
].filter((value): value is string => Boolean(value?.trim()));
for (const configuredNpmCache of configuredNpmCacheValues) {
  exactManagedPath(
    "NPM_CONFIG_CACHE",
    configuredNpmCache,
    starshipPaths.npmCacheDir,
  );
}
const e2eNpmCacheDir = exactManagedPath(
  "NPM_CONFIG_CACHE",
  configuredNpmCacheValues[0],
  starshipPaths.npmCacheDir,
);
const configuredNpmLogsValues = [
  process.env.NPM_CONFIG_LOGS_DIR,
  process.env.npm_config_logs_dir,
].filter((value): value is string => Boolean(value?.trim()));
for (const configuredNpmLogsDir of configuredNpmLogsValues) {
  exactManagedPath(
    "NPM_CONFIG_LOGS_DIR",
    configuredNpmLogsDir,
    starshipPaths.npmLogsDir,
  );
}
const e2eNpmLogsDir = exactManagedPath(
  "NPM_CONFIG_LOGS_DIR",
  configuredNpmLogsValues[0],
  starshipPaths.npmLogsDir,
);
for (const [label, directory] of [
  ["artifact root", e2eRunRoot],
  ["Next distDir", e2eNextDistDir],
  ["runtime tmp", e2eRuntimeTmpDir],
  ["runtime home", e2eRuntimeHomeDir],
  ["browser profile root", e2eBrowserProfileRoot],
  ["Playwright output", e2eOutputDir],
  ["Playwright report", e2eReportDir],
  ["service log", e2eServiceLogDir],
  ["service pid", e2eServicePidDir],
  ["Node compile cache", e2eNodeCompileCacheDir],
  ["npm cache", e2eNpmCacheDir],
  ["npm logs", e2eNpmLogsDir],
  ["SQLite tmp", e2eSqliteTmpDir],
  ["XDG cache", starshipPaths.xdgCacheDir],
  ["XDG config", starshipPaths.xdgConfigDir],
  ["XDG state", starshipPaths.xdgStateDir],
  ["global profile monitor", starshipPaths.globalProfileMonitorDir],
  ["global profile monitor tmp", starshipPaths.globalProfileMonitorTmpDir],
  ["workload supervisor", starshipPaths.workloadSupervisorDir],
  ["workload supervisor tmp", starshipPaths.workloadSupervisorTmpDir],
] as const) {
  requireStablePhysicalDirectory(
    directory,
    `HK Visualization materialized directory (${label})`,
  );
}
const expectedPathManifestBytes = Buffer.from(
  `${JSON.stringify(starshipPaths, null, 2)}\n`,
  "utf8",
);
requireExactPrewrittenPathManifest(
  e2ePathManifestFile,
  expectedPathManifestBytes,
  starshipPaths,
);
process.env.PLAYWRIGHT_RUN_ID = runId;
process.env.PLAYWRIGHT_E2E_ROOT = e2eRunRoot;
process.env.PLAYWRIGHT_NEXT_DIST_DIR = e2eNextDistDir;
process.env.PLAYWRIGHT_NEXT_TSCONFIG_PATH = e2eNextTsconfigPath;
process.env.PLAYWRIGHT_OUTPUT_DIR = e2eOutputDir;
process.env.PLAYWRIGHT_REPORT_DIR = e2eReportDir;
process.env.PLAYWRIGHT_JSON_OUTPUT_FILE = e2eJsonReport;
process.env.PLAYWRIGHT_RUNTIME_TMPDIR = e2eRuntimeTmpDir;
process.env.HOME = e2eRuntimeHomeDir;
process.env.PLAYWRIGHT_BROWSER_PROFILE_ROOT = e2eBrowserProfileRoot;
process.env.PLAYWRIGHT_SERVICE_LOG_DIR = e2eServiceLogDir;
process.env.PLAYWRIGHT_SERVICE_PID_DIR = e2eServicePidDir;
process.env.PLAYWRIGHT_PATH_MANIFEST_FILE = e2ePathManifestFile;
process.env.NODE_COMPILE_CACHE = e2eNodeCompileCacheDir;
process.env.NPM_CONFIG_CACHE = e2eNpmCacheDir;
process.env.npm_config_cache = e2eNpmCacheDir;
process.env.NPM_CONFIG_LOGS_DIR = e2eNpmLogsDir;
process.env.npm_config_logs_dir = e2eNpmLogsDir;
process.env.HK_MATH_DB_PATH = e2eDbPath;
process.env.SQLITE_TMPDIR = e2eSqliteTmpDir;
process.env.TMPDIR = e2eRuntimeTmpDir;
process.env.TMP = e2eRuntimeTmpDir;
process.env.TEMP = e2eRuntimeTmpDir;
process.env.XDG_CACHE_HOME = starshipPaths.xdgCacheDir;
process.env.XDG_CONFIG_HOME = starshipPaths.xdgConfigDir;
process.env.XDG_STATE_HOME = starshipPaths.xdgStateDir;
process.env.CHROME_LOG_FILE = starshipPaths.chromeLogPath;
process.env.NEXT_TELEMETRY_DISABLED = "1";
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
  const absolutePath = assertHkVisualizationStarshipPath(label, value);
  const defaultNextDir = path.resolve(".next");
  const tmpDir = path.resolve(".tmp");

  if (absolutePath === defaultNextDir || isPathInside(absolutePath, defaultNextDir)) {
    throw new Error(`${label} must not point at the shared .next directory for Playwright release runs.`);
  }

  if (process.env.MAIS_ALLOW_EXTERNAL_ARTIFACTS !== "1" && !isPathInside(absolutePath, tmpDir)) {
    throw new Error(`${label} must stay under .tmp unless MAIS_ALLOW_EXTERNAL_ARTIFACTS=1 is set.`);
  }
}

const expectedNextTsconfigBytes =
  buildHkVisualizationCanonicalE2eTsconfigBytes({
    workspace: e2eWorkspace,
    nextDistDir: e2eNextDistDir,
  });
requireExactPrewrittenFile(
  e2eNextTsconfigPath,
  expectedNextTsconfigBytes,
  "HK Visualization disposable Playwright tsconfig",
);

const managedWebServerCommand =
  buildHkVisualizationManagedWebServerCommand({
    manifest: starshipPaths,
    port,
  });
const managedWebServerCommandSha256 = createHash("sha256")
  .update(managedWebServerCommand)
  .digest("hex");

export default defineConfig({
  metadata: {
    hkVisualizationStarshipPathManifest: starshipPaths,
    hkVisualizationWebServerCommandSha256: managedWebServerCommandSha256,
  },
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
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: hkVisualizationCanonicalRelease ? "off" : "retain-on-failure"
  },
  webServer: !useGlobalWebServer
    ? undefined
    : {
        command: managedWebServerCommand,
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
