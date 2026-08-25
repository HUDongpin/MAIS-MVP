import { defineConfig, devices } from "@playwright/test";
import baseConfig from "./playwright.config";

// This matrix owns a clean, disposable build and does not reuse webpack's
// filesystem cache. On constrained QA disks the cache can exceed 2 GiB while
// the complete server/static evidence build is below 200 MiB.
process.env.MAIS_DISABLE_WEBPACK_CACHE ??= "1";

/**
 * Isolated A11 matrix for the bounded MAIS Manim v3 authoring slice. The base
 * config still owns its clean build, private SQLite database, provider-offline
 * environment, and run-owned output paths. These projects deliberately unset
 * the workstation Chrome channel so the Playwright-version-matched browsers in
 * PLAYWRIGHT_BROWSERS_PATH are the evidence executables.
 */
export default defineConfig({
  ...baseConfig,
  fullyParallel: false,
  workers: 1,
  testMatch: [
    "**/guest-login-prompt.spec.ts",
    "**/teacher-visualization-authoring.spec.ts"
  ],
  projects: [
    {
      name: "v3-chromium-desktop",
      use: {
        ...devices["Desktop Chrome"],
        channel: undefined,
        viewport: { width: 1440, height: 1100 }
      }
    },
    {
      name: "v3-chromium-mobile-390",
      use: {
        ...devices["Pixel 5"],
        channel: undefined,
        isMobile: true,
        viewport: { width: 390, height: 844 }
      }
    },
    {
      name: "v3-firefox-desktop",
      use: {
        ...devices["Desktop Firefox"],
        channel: undefined,
        viewport: { width: 1440, height: 1100 }
      }
    },
    {
      name: "v3-webkit-desktop",
      use: {
        ...devices["Desktop Safari"],
        channel: undefined,
        viewport: { width: 1440, height: 1100 }
      }
    }
  ]
});
