import { expect, test } from "@playwright/test";
import { collectPageErrors, expectNoPageErrors } from "./helpers";

const guestPromptRoutes = [
  { name: "Practice Arena", path: "/practice", expectedPath: /\/practice/ },
  { name: "Personalized Learning", path: "/personalized-learning", expectedPath: /\/personalized-learning/ }
] as const;

test.describe("guest login reminder", () => {
  test.setTimeout(60_000);

  test("redirects guest lesson entry to login instead of showing lesson content", async ({ page }) => {
    await page.goto("/student/lessons");
    await expect(page).toHaveURL(/\/login\?next=%2Fstudent%2Flessons/);
  });

  test("redirects guest lesson detail routes to login before content renders", async ({ page }) => {
    await page.goto("/student/lessons/quadratic-functions");
    await expect(page).toHaveURL(/\/login\?next=%2Fstudent%2Flessons%2Fquadratic-functions/);

    await page.goto("/lesson/quadratic-functions");
    await expect(page).toHaveURL(/\/login\?next=%2Fstudent%2Flessons%2Fquadratic-functions/);
  });

  for (const route of guestPromptRoutes) {
    test(`shows a login prompt after 10 seconds on ${route.name}`, async ({ page }) => {
      const pageErrors = collectPageErrors(page);

      await page.goto(route.path);
      await expect(page).toHaveURL(route.expectedPath);

      const reminder = page.getByRole("dialog", { name: /save your progress with a MAIS account/i });
      await page.waitForTimeout(9_000);
      await expect(reminder).toBeHidden({ timeout: 500 });
      await expect(reminder).toBeVisible({ timeout: 4_000 });
      await expect(reminder.getByRole("link", { name: /^log in$/i })).toBeVisible();
      await expect(reminder.getByRole("link", { name: /^register$/i })).toBeVisible();
      await expect(reminder.getByRole("button", { name: /continue as guest/i })).toBeVisible();

      expectNoPageErrors(pageErrors);
    });
  }

  test("waits for the first visualization timeline and then uses a non-modal reminder", async ({ page }) => {
    const pageErrors = collectPageErrors(page);
    await page.goto("/student/tools/visualizations");
    await expect(page).toHaveURL(/\/student\/tools\/visualizations/);

    await page.waitForTimeout(10_500);
    await expect(page.getByRole("dialog", { name: /save your progress with a MAIS account/i })).toBeHidden();
    await expect(page.locator('[data-guest-login-prompt-mode="non-modal-after-guided-timeline"]')).toBeHidden();

    await page.evaluate(() => {
      const timeline = document.querySelector<HTMLElement>(
        '[data-viz-manim-playback-state]:not([data-viz-manim-playback-state="primitive"])'
      ) ?? document.createElement("div");
      timeline.setAttribute("data-viz-manim-playback-state", "playing");
      timeline.setAttribute("data-viz-manim-timeline-step-count", "6");
      timeline.setAttribute("data-e2e-guest-timeline", "true");
      // The live R3F clock wraps with modulo arithmetic. A frame can move
      // from near-complete to the beginning without ever committing 1.000.
      timeline.setAttribute("data-viz-manim-timeline-progress", "0.950");
      if (!timeline.isConnected) {
        timeline.hidden = true;
        document.body.append(timeline);
      }
    });

    await expect(page.locator('[data-guest-login-prompt-mode="non-modal-after-guided-timeline"]')).toBeHidden();
    await page.evaluate(() => {
      document.querySelector("[data-e2e-guest-timeline='true']")
        ?.setAttribute("data-viz-manim-timeline-progress", "0.020");
    });

    const reminder = page.getByRole("region", { name: /save this learning progress/i });
    await expect(reminder).toBeVisible({ timeout: 5_000 });
    await expect(reminder).not.toHaveAttribute("aria-modal", "true");
    await expect(reminder.getByRole("link", { name: /^log in$/i })).toBeVisible();
    await expect(reminder.getByRole("link", { name: /^register$/i })).toBeVisible();
    await expect(reminder.getByRole("button", { name: /keep exploring/i })).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).not.toBe("hidden");

    expectNoPageErrors(pageErrors);
  });
});
