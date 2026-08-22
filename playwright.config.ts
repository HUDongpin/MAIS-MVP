import { defineConfig, devices } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const port = Number(process.env.PLAYWRIGHT_PORT ?? 3020);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`;
const browserChannel = process.env.PLAYWRIGHT_BROWSER_CHANNEL ?? "chrome";
const runId = sanitizePathSegment(process.env.PLAYWRIGHT_RUN_ID ?? `${port}-${process.pid}`);
const e2eRuntimeRoot = path.join(".tmp", "china-lesson-e2e-runtime");
const e2eRunRoot = process.env.PLAYWRIGHT_E2E_ROOT?.trim() || path.join(e2eRuntimeRoot, "runs", runId);
const e2eNextDistDir = process.env.PLAYWRIGHT_NEXT_DIST_DIR?.trim() || path.join(e2eRunRoot, "next-dist");
const e2eNextTsconfigPath = process.env.PLAYWRIGHT_NEXT_TSCONFIG_PATH?.trim()
  || path.join(e2eRunRoot, "tsconfig.playwright.tmp.json");
const e2eDbPath = path.resolve(
  process.env.HK_MATH_DB_PATH?.trim() || path.join(e2eRunRoot, "db", "hk-math.sqlite")
);
const e2eOutputDir = process.env.PLAYWRIGHT_OUTPUT_DIR?.trim() || path.join(e2eRunRoot, "test-results");
const e2eReportDir = process.env.PLAYWRIGHT_REPORT_DIR?.trim() || path.join(e2eRunRoot, "playwright-report");
process.env.PLAYWRIGHT_RUN_ID = runId;
process.env.PLAYWRIGHT_E2E_ROOT = e2eRunRoot;
process.env.PLAYWRIGHT_NEXT_DIST_DIR = e2eNextDistDir;
process.env.PLAYWRIGHT_NEXT_TSCONFIG_PATH = e2eNextTsconfigPath;
process.env.HK_MATH_DB_PATH = e2eDbPath;
process.env.PLAYWRIGHT_OUTPUT_DIR = e2eOutputDir;
process.env.PLAYWRIGHT_REPORT_DIR = e2eReportDir;
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
  "QWEN_TEXT_MODEL=qwen3.8-max",
  "AI_TUTOR_QWEN_IMAGE_MODEL=",
  "QWEN_IMAGE_MODEL=",
  "QWEN_IMAGE_API_URL=",
  "QWEN_REALTIME_MODEL=",
  "QWEN_REALTIME_API_URL=",
  "AI_TUTOR_PROVIDER_PROFILE=offline-fixture"
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
assertSafeE2eGeneratedPath("PLAYWRIGHT_OUTPUT_DIR", e2eOutputDir);
assertSafeE2eGeneratedPath("PLAYWRIGHT_REPORT_DIR", e2eReportDir);
assertSafeE2eGeneratedPath("HK_MATH_DB_PATH", e2eDbPath);
assertSafeE2eGeneratedPath("PLAYWRIGHT_NEXT_TSCONFIG_PATH", e2eNextTsconfigPath);
assertRequiredE2eRuntimePaths();

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

function resolvePhysicalPath(value: string) {
  const absolutePath = path.resolve(value);
  const missingSegments: string[] = [];
  let existingAncestor = absolutePath;

  while (true) {
    try {
      fs.lstatSync(existingAncestor);
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      const parent = path.dirname(existingAncestor);
      if (parent === existingAncestor) {
        throw new Error(`Could not resolve an existing ancestor for Playwright path: ${absolutePath}`);
      }
      missingSegments.unshift(path.basename(existingAncestor));
      existingAncestor = parent;
    }
  }

  let physicalAncestor: string;
  try {
    physicalAncestor = fs.realpathSync(existingAncestor);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not resolve Playwright path ${absolutePath}: ${reason}`);
  }
  return path.resolve(physicalAncestor, ...missingSegments);
}

function assertSafeE2eGeneratedPath(label: string, value: string) {
  const absolutePath = path.resolve(value);
  const defaultNextDir = path.resolve(".next");
  const tmpDir = path.resolve(".tmp");
  const physicalPath = resolvePhysicalPath(absolutePath);
  const physicalDefaultNextDir = resolvePhysicalPath(defaultNextDir);
  const physicalTmpDir = resolvePhysicalPath(tmpDir);

  if (
    absolutePath === defaultNextDir
    || isPathInside(absolutePath, defaultNextDir)
    || physicalPath === physicalDefaultNextDir
    || isPathInside(physicalPath, physicalDefaultNextDir)
  ) {
    throw new Error(`${label} must not point at the shared .next directory for Playwright release runs.`);
  }

  if (process.env.MAIS_ALLOW_EXTERNAL_ARTIFACTS !== "1") {
    if (!isPathInside(absolutePath, tmpDir)) {
      throw new Error(`${label} must stay under .tmp unless MAIS_ALLOW_EXTERNAL_ARTIFACTS=1 is set.`);
    }
    if (!isPathInside(physicalPath, physicalTmpDir)) {
      throw new Error(`${label} must resolve under the worktree .tmp directory: ${physicalPath}`);
    }
  }
}

function assertRequiredE2eRuntimePaths() {
  const configuredRoot = process.env.MAIS_E2E_REQUIRED_WRITE_ROOT?.trim();
  if (!configuredRoot) return;

  if (Object.prototype.hasOwnProperty.call(process.env, "MAIS_ALLOW_EXTERNAL_ARTIFACTS")) {
    throw new Error(
      "MAIS_ALLOW_EXTERNAL_ARTIFACTS must be unset when MAIS_E2E_REQUIRED_WRITE_ROOT is enabled."
    );
  }

  const requiredRoot = resolvePhysicalPath(configuredRoot);
  const repoRoot = resolvePhysicalPath(".");
  if (!isPathInside(repoRoot, requiredRoot)) {
    throw new Error(`Playwright worktree must stay under MAIS_E2E_REQUIRED_WRITE_ROOT: ${requiredRoot}`);
  }

  const generatedPaths = [
    ["PLAYWRIGHT_E2E_ROOT", e2eRunRoot],
    ["PLAYWRIGHT_NEXT_DIST_DIR", e2eNextDistDir],
    ["PLAYWRIGHT_OUTPUT_DIR", e2eOutputDir],
    ["PLAYWRIGHT_REPORT_DIR", e2eReportDir],
    ["HK_MATH_DB_PATH", e2eDbPath],
    ["PLAYWRIGHT_NEXT_TSCONFIG_PATH", e2eNextTsconfigPath]
  ] as const;
  for (const [label, value] of generatedPaths) {
    const absolutePath = path.resolve(value);
    if (!isPathInside(absolutePath, requiredRoot)) {
      throw new Error(`${label} must stay under MAIS_E2E_REQUIRED_WRITE_ROOT (${requiredRoot}): ${absolutePath}`);
    }
    const physicalPath = resolvePhysicalPath(absolutePath);
    if (!isPathInside(physicalPath, requiredRoot)) {
      throw new Error(`${label} must resolve under MAIS_E2E_REQUIRED_WRITE_ROOT (${requiredRoot}): ${physicalPath}`);
    }
  }

  const runRoot = path.resolve(e2eRunRoot);
  const physicalRunRoot = resolvePhysicalPath(runRoot);
  const runtimePathVariables = [
    "HOME",
    "TMPDIR",
    "TMP",
    "TEMP",
    "XDG_CACHE_HOME",
    "NODE_COMPILE_CACHE",
    "PLAYWRIGHT_BROWSERS_PATH",
    "npm_config_cache",
    "npm_config_logs_dir"
  ] as const;
  for (const label of runtimePathVariables) {
    const value = process.env[label]?.trim();
    if (!value) {
      throw new Error(`${label} is required when MAIS_E2E_REQUIRED_WRITE_ROOT is enabled.`);
    }
    const absolutePath = path.resolve(value);
    if (!isPathInside(absolutePath, requiredRoot)) {
      throw new Error(`${label} must stay under MAIS_E2E_REQUIRED_WRITE_ROOT (${requiredRoot}): ${absolutePath}`);
    }
    const physicalPath = resolvePhysicalPath(absolutePath);
    if (!isPathInside(physicalPath, requiredRoot)) {
      throw new Error(`${label} must resolve under MAIS_E2E_REQUIRED_WRITE_ROOT (${requiredRoot}): ${physicalPath}`);
    }
    if (
      isPathInside(absolutePath, runRoot)
      || isPathInside(runRoot, absolutePath)
      || isPathInside(physicalPath, physicalRunRoot)
      || isPathInside(physicalRunRoot, physicalPath)
    ) {
      throw new Error(`${label} must stay outside PLAYWRIGHT_E2E_ROOT so webServer cleanup cannot remove it.`);
    }
  }
}

function shellQuote(value: string) {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

// Extra build-output globs the e2e temp tsconfig excludes on top of the
// canonical set. These are non-dot dirs `**/*.ts` would otherwise sweep;
// `.tmp` is intentionally NOT here because the temp config's own dist-types
// include lives under it.
const e2eTempTsconfigHardeningExcludes = [
  ".next-*",
  ".s??-*",
  "tmp",
  "temp",
  "output",
  "outputs",
  "coverage",
  "playwright-report",
  "test-results",
  "var",
  "var/**/*",
  "MAIS-MVP-*",
  "MAIS-MVP-*/**/*"
];

// Reuse tsconfig.json's own `exclude` as the single source of truth so the
// generated e2e temp tsconfig can't drift out of sync with it. That drift once
// dropped `private/**/*` here and let a stale private/tmp/*-next validator.ts
// (referencing a since-deleted route) fail the e2e build before any test ran.
// tsconfig.json is the right base — it's the config the custom-distDir build
// actually uses, and unlike tsconfig.next.json it does not exclude `.tmp`,
// where the temp config's dist-types include lives.
function e2eTempTsconfigExcludeGlobs() {
  const baseTsconfigPath = path.resolve("tsconfig.json");
  const { config, error } = ts.readConfigFile(baseTsconfigPath, (file) => ts.sys.readFile(file));
  const canonical = Array.isArray(config?.exclude) ? (config.exclude as string[]) : null;
  if (error || !canonical) {
    throw new Error(
      `Could not read \`exclude\` from ${baseTsconfigPath} for the e2e temp tsconfig` +
      `${error ? `: ${ts.flattenDiagnosticMessageText(error.messageText, "\n")}` : "."}`
    );
  }
  return Array.from(new Set([...canonical, ...e2eTempTsconfigHardeningExcludes]));
}

function writeTempTsconfigCommand(tsconfigPath: string, nextDistDir: string) {
  const tsconfigDir = path.dirname(path.resolve(tsconfigPath));
  const pathFromTsconfigDir = (target: string) => {
    const relative = path.relative(tsconfigDir, path.resolve(target)).replace(/\\/g, "/");
    return relative || ".";
  };
  const repoGlobFromTsconfigDir = (glob: string) => {
    const repoPrefix = pathFromTsconfigDir(".");
    return repoPrefix === "." ? glob : `${repoPrefix}/${glob}`;
  };
  const content = JSON.stringify({
    extends: repoGlobFromTsconfigDir("tsconfig.json"),
    compilerOptions: {
      baseUrl: pathFromTsconfigDir("."),
      paths: { "@/*": ["*"] },
      plugins: [{ name: "next" }]
    },
    include: [
      repoGlobFromTsconfigDir("next-env.d.ts"),
      repoGlobFromTsconfigDir("**/*.ts"),
      repoGlobFromTsconfigDir("**/*.tsx"),
      repoGlobFromTsconfigDir(".next/types/**/*.ts"),
      `${pathFromTsconfigDir(nextDistDir)}/types/**/*.ts`
    ],
    exclude: e2eTempTsconfigExcludeGlobs().map(repoGlobFromTsconfigDir)
  }, null, 2);
  const script = `require("fs").writeFileSync(${JSON.stringify(tsconfigPath)}, ${JSON.stringify(content)})`;
  return `node -e ${shellQuote(script)}`;
}

export default defineConfig({
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
    video: "retain-on-failure"
  },
  webServer: !useGlobalWebServer
    ? undefined
    : {
        command: [
          `rm -rf ${shellQuote(e2eRunRoot)} ${shellQuote(e2eNextDistDir)}`,
          `rm -f ${shellQuote(e2eNextTsconfigPath)}`,
          `mkdir -p ${shellQuote(path.dirname(e2eDbPath))} ${shellQuote(path.dirname(e2eNextTsconfigPath))} ${shellQuote(e2eOutputDir)}`,
          writeTempTsconfigCommand(e2eNextTsconfigPath, e2eNextDistDir),
          `env NEXT_DIST_DIR=${shellQuote(e2eNextDistDir)} NEXT_TSCONFIG_PATH=${shellQuote(e2eNextTsconfigPath)} ${disabledProviderEnv} NEXT_PUBLIC_SHOW_EXAMPLE_ACCOUNTS=true npm run build`,
          `rm -f ${shellQuote(e2eNextTsconfigPath)}`,
          `env NEXT_DIST_DIR=${shellQuote(e2eNextDistDir)} ${disabledProviderEnv} AUTH_SESSION_SECRET=e2e-session-secret HK_MATH_DB_PATH=${shellQuote(e2eDbPath)} HK_MATH_EXPOSE_LOCAL_RESET_LINKS=true HK_MATH_ENABLE_DEMO_USER=true AI_TUTOR_MAX_REQUESTS_PER_MINUTE=2 HK_MATH_E2E_LOGIN_IDENTIFIER_MAX=400 npm run start -- --hostname 127.0.0.1 --port ${port}`
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
