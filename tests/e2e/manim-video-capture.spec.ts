import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { collectPageErrors, dismissGuestLoginPrompt, expectNoPageErrors } from "./helpers";

const sineSceneId = "mais-manim-trig-unit-wave";
const expectedFileName = `${sineSceneId}.webm`;

// This spec validates the app's own MediaRecorder output. Playwright's
// parallel page recording would otherwise contend for the same canvas/GPU.
test.use({ trace: "off", video: "off" });

test("records the complete sine projection lesson as a downloadable WebM", async ({ page }) => {
  test.setTimeout(90_000);
  await dismissGuestLoginPrompt(page);
  const pageErrors = collectPageErrors(page);

  await page.goto("/student/tools/visualizations?grade=S5&track=all&lab=trigonometry-s5", {
    waitUntil: "domcontentloaded",
    timeout: 30_000
  });

  const activePanel = page.locator(
    '[data-viz-panel-mode="lab"][data-viz-active-lab-id="trigonometry-s5"]'
  );
  await expect(activePanel).toBeVisible({ timeout: 30_000 });
  const surface = activePanel.locator('[data-viz-surface][data-viz-renderer="three-r3f"]');
  await expect(surface).toHaveAttribute("data-viz-three-webgl-status", "ready", { timeout: 30_000 });
  await expect(surface).toHaveAttribute("data-viz-canvas-ready", "true", { timeout: 30_000 });
  await expect(surface).toHaveAttribute("data-viz-scene-id", sineSceneId);

  const videoButton = surface.locator("[data-viz-manim-capture-video]");
  await expect(videoButton).toBeVisible();
  await videoButton.click();

  await expect(surface).toHaveAttribute("data-viz-manim-browser-video-active", "true");
  await expect(surface).toHaveAttribute("data-viz-manim-capture-kind", "video");
  await expect(surface).toHaveAttribute("data-viz-manim-capture-quality-preset", "preview");
  await expect(surface).toHaveAttribute("data-viz-manim-capture-width", "854");
  await expect(surface).toHaveAttribute("data-viz-manim-capture-height", "480");
  await expect(surface).toHaveAttribute("data-viz-manim-capture-fps", "15");

  await expect(surface).toHaveAttribute("data-viz-manim-browser-video-download-ready", "true", {
    timeout: 30_000
  });
  await expect(surface).toHaveAttribute("data-viz-manim-browser-video-active", "false");
  await expect(surface).toHaveAttribute("data-viz-manim-browser-video-error", "none");
  await expect(surface).toHaveAttribute("data-viz-manim-capture-status", "captured");
  await expect(surface).not.toHaveAttribute("data-viz-manim-capture-byte-count", "0");

  const downloadLink = surface.locator("[data-viz-manim-video-download]");
  await expect(downloadLink).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await downloadLink.click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe(expectedFileName);

  const downloadedPath = await download.path();
  expect(downloadedPath).not.toBeNull();
  const stat = await fs.promises.stat(downloadedPath!);
  expect(stat.size).toBeGreaterThan(10_000);

  const requestedArtifactPath = process.env.MANIM_VIDEO_ARTIFACT_PATH?.trim();
  if (requestedArtifactPath) {
    const artifactPath = path.resolve(requestedArtifactPath);
    await fs.promises.mkdir(path.dirname(artifactPath), { recursive: true });
    await download.saveAs(artifactPath);
    expect((await fs.promises.stat(artifactPath)).size).toBe(stat.size);
  }

  expectNoPageErrors(pageErrors);
});
