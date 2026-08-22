import { defineConfig, devices } from "@playwright/test";
import { existsSync, lstatSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const STARSHIP_VOLUME_ROOT = "/Volumes/Starship";
const port = Number(process.env.PLAYWRIGHT_PORT ?? 3020);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`;
const browserChannel = process.env.PLAYWRIGHT_BROWSER_CHANNEL ?? "chrome";
const runId = sanitizePathSegment(process.env.PLAYWRIGHT_RUN_ID ?? `${port}-${process.pid}`);
const e2eRunRoot = process.env.PLAYWRIGHT_E2E_ROOT?.trim() || path.join(".tmp", `e2e-run-${runId}`);
const e2eNextDistDir = process.env.PLAYWRIGHT_NEXT_DIST_DIR ?? path.join(e2eRunRoot, "next-dist");
const e2eNextTsconfigPath = process.env.PLAYWRIGHT_NEXT_TSCONFIG_PATH ?? `tsconfig.playwright-${runId}.tmp.json`;
const e2eDbPath = path.resolve(process.env.HK_MATH_DB_PATH?.trim() || path.join(e2eRunRoot, "hk-math-db.sqlite"));
const e2eOutputDir = process.env.PLAYWRIGHT_OUTPUT_DIR?.trim() || path.join(e2eRunRoot, "test-results");
const e2eReportDir = process.env.PLAYWRIGHT_REPORT_DIR?.trim() || path.join(e2eRunRoot, "playwright-report");
process.env.PLAYWRIGHT_RUN_ID = runId;
process.env.PLAYWRIGHT_E2E_ROOT = e2eRunRoot;
process.env.HK_MATH_DB_PATH = e2eDbPath;
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
const runsFormalCaliforniaLayerAProductSmoke =
  process.env.CA_VIZ_PRODUCT_SMOKE_LAYER === "A" ||
  selectedSpecArgs.some((arg) => arg.endsWith("california-visualization-product-smoke.spec.ts"));
const useGlobalWebServer = !process.env.PLAYWRIGHT_SKIP_WEBSERVER && !runsOnlyIsolatedStatefulSpecs;

for (const forbiddenPrecedenceVariable of ["BREAKPAD_DUMP_LOCATION", "CFFIXED_USER_HOME"] as const) {
  if (process.env[forbiddenPrecedenceVariable] !== undefined) {
    throw new Error(
      `${forbiddenPrecedenceVariable} must be absent; Chrome Crashpad containment is owned only by ` +
      "PLAYWRIGHT_CRASHPAD_DIR and the command-line launch argument."
    );
  }
}
const configuredCrashpadDir = process.env.PLAYWRIGHT_CRASHPAD_DIR;
if (configuredCrashpadDir !== undefined && configuredCrashpadDir.trim() === "") {
  throw new Error("PLAYWRIGHT_CRASHPAD_DIR must not be empty when it is present.");
}
if (runsFormalCaliforniaLayerAProductSmoke && configuredCrashpadDir === undefined) {
  throw new Error("PLAYWRIGHT_CRASHPAD_DIR is required for the formal California Layer-A product smoke.");
}
const e2eCrashpadDir = assertSafeStarshipGeneratedPath(
  "PLAYWRIGHT_CRASHPAD_DIR",
  configuredCrashpadDir?.trim() || path.resolve(e2eRunRoot, "chrome-crashpad"),
  e2eRunRoot
);

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

function assertSafeStarshipGeneratedPath(label: string, value: string, generatedRootValue: string) {
  const generatedRoot = path.resolve(generatedRootValue);
  if (!path.isAbsolute(value)) {
    throw new Error(`${label} must be an absolute path under ${generatedRoot}.`);
  }
  const absolutePath = path.resolve(value);
  const starshipRoot = path.resolve(STARSHIP_VOLUME_ROOT);
  if (generatedRoot === starshipRoot || !isPathInside(generatedRoot, starshipRoot)) {
    throw new Error(`${generatedRoot} must be a strict descendant of ${STARSHIP_VOLUME_ROOT}.`);
  }
  if (absolutePath === generatedRoot || !isPathInside(absolutePath, generatedRoot)) {
    throw new Error(`${label} must be a strict descendant of ${generatedRoot}.`);
  }
  let current = absolutePath;
  while (current !== starshipRoot) {
    if (existsSync(current)) {
      const identity = lstatSync(current);
      if (identity.isSymbolicLink()) {
        throw new Error(`${label} must not traverse a symbolic link: ${current}`);
      }
      if ((current === absolutePath || current === generatedRoot) && !identity.isDirectory()) {
        throw new Error(`${label} and its generated root must be directories when they already exist: ${current}`);
      }
    }
    current = path.dirname(current);
  }
  if (!existsSync(starshipRoot) || !lstatSync(starshipRoot).isDirectory() || lstatSync(starshipRoot).isSymbolicLink()) {
    throw new Error(`${STARSHIP_VOLUME_ROOT} must be an existing non-symlink directory.`);
  }
  return absolutePath;
}

function assertSafeE2eGeneratedPath(label: string, value: string) {
  const absolutePath = path.resolve(value);
  const defaultNextDir = path.resolve(".next");
  const tmpDir = path.resolve(".tmp");

  if (absolutePath === defaultNextDir || isPathInside(absolutePath, defaultNextDir)) {
    throw new Error(`${label} must not point at the shared .next directory for Playwright release runs.`);
  }

  if (process.env.MAIS_ALLOW_EXTERNAL_ARTIFACTS !== "1" && !isPathInside(absolutePath, tmpDir)) {
    throw new Error(`${label} must stay under .tmp unless MAIS_ALLOW_EXTERNAL_ARTIFACTS=1 is set.`);
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
  const content = JSON.stringify({
    extends: "./tsconfig.json",
    include: [
      "next-env.d.ts",
      "**/*.ts",
      "**/*.tsx",
      ".next/types/**/*.ts",
      `${nextDistDir}/types/**/*.ts`
    ],
    exclude: e2eTempTsconfigExcludeGlobs()
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
    launchOptions: { args: [`--breakpad-dump-location=${e2eCrashpadDir}`] },
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
