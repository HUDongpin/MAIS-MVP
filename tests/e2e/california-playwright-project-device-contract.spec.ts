import { test } from "@playwright/test";

import {
  captureCaliforniaFormalProjectEvidence,
  enforceCaliforniaFormalReducedMotion
} from
  "./california-visualization-qa-helpers";

test.use({ screenshot: "off", trace: "off", video: "off" });

test("California Playwright project preserves the frozen viewport, screen, and reduced-motion contract", async ({ page }, testInfo) => {
  await enforceCaliforniaFormalReducedMotion(page);
  await captureCaliforniaFormalProjectEvidence(page, testInfo);
});
