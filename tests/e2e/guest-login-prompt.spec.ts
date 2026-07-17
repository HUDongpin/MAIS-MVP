import { expect, test } from "@playwright/test";
import { collectPageErrors, expectNoPageErrors } from "./helpers";

const guestPromptRoutes = [
  { name: "Practice Arena", path: "/practice", expectedPath: /\/practice/ },
  { name: "Personalized Learning", path: "/personalized-learning", expectedPath: /\/personalized-learning/ },
  { name: "Visualization", path: "/student/tools/visualizations", expectedPath: /\/student\/tools\/visualizations/ }
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
});
