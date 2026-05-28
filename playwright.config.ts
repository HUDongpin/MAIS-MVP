import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PLAYWRIGHT_PORT ?? 3020);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`;
const browserChannel = process.env.PLAYWRIGHT_BROWSER_CHANNEL ?? "chrome";
const isolatedStatefulSpecs = [
  "tests/e2e/rewards.spec.ts",
  "tests/e2e/gamification.spec.ts",
  "tests/e2e/fishing-game.spec.ts",
  "tests/e2e/adventure-island.spec.ts"
];
const selectedSpecArgs = process.argv
  .slice(2)
  .map((arg) => arg.replace(/\\/g, "/"))
  .filter((arg) => arg.endsWith(".spec.ts") || arg.includes("tests/e2e/"));
const runsOnlyIsolatedStatefulSpecs =
  selectedSpecArgs.length > 0 &&
  selectedSpecArgs.every((arg) => isolatedStatefulSpecs.some((spec) => arg === spec || arg.endsWith(`/${spec}`)));
const useGlobalWebServer = !process.env.PLAYWRIGHT_SKIP_WEBSERVER && !runsOnlyIsolatedStatefulSpecs;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "output/playwright-report" }]],
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
          "rm -rf .tmp/e2e",
          "mkdir -p .tmp/e2e",
          "env LLM_API_KEY= OPENAI_API_KEY= LLM_MODEL= OPENAI_MODEL= LLM_API_URL= npm run build",
          `env LLM_API_KEY= OPENAI_API_KEY= LLM_MODEL= OPENAI_MODEL= LLM_API_URL= AUTH_SESSION_SECRET=e2e-session-secret HK_MATH_DB_PATH="$PWD/.tmp/e2e/hk-math-db.sqlite" HK_MATH_EXPOSE_LOCAL_RESET_LINKS=true HK_MATH_ENABLE_DEMO_USER=true AI_TUTOR_MAX_REQUESTS_PER_MINUTE=2 npm run start -- --hostname 127.0.0.1 --port ${port}`
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
