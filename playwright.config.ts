import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

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

  if (process.env.MAIS_ALLOW_EXTERNAL_ARTIFACTS !== "1" && !isPathInside(absolutePath, tmpDir)) {
    throw new Error(`${label} must stay under .tmp unless MAIS_ALLOW_EXTERNAL_ARTIFACTS=1 is set.`);
  }
}

function shellQuote(value: string) {
  return `'${value.replace(/'/g, "'\\''")}'`;
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
    exclude: [
      "node_modules",
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
    ]
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
          `env NEXT_DIST_DIR=${shellQuote(e2eNextDistDir)} ${disabledProviderEnv} AUTH_SESSION_SECRET=e2e-session-secret HK_MATH_DB_PATH=${shellQuote(e2eDbPath)} HK_MATH_EXPOSE_LOCAL_RESET_LINKS=true HK_MATH_ENABLE_DEMO_USER=true AI_TUTOR_MAX_REQUESTS_PER_MINUTE=2 npm run start -- --hostname 127.0.0.1 --port ${port}`
        ].join(" && "),
        url: baseURL,
        reuseExistingServer: false,
        timeout: 240_000
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
