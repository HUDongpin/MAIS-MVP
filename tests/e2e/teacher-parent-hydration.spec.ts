import { expect, test } from "@playwright/test";
import {
  collectPageErrors,
  expectNoPageErrors,
  loginAsDemoParent,
  loginAsTeacher
} from "./helpers";

test.describe("teacher and parent HKT hydration", () => {
  test.use({ timezoneId: "Asia/Hong_Kong" });

  test("teacher console first-load routes hydrate without React page errors", async ({ page }) => {
    const errors = collectPageErrors(page);

    await loginAsTeacher(page);

    const routes = [
      { path: "/teacher", heading: /Today.s teaching queue/i },
      { path: "/teacher/reports", heading: /Bilingual learning reports/i },
      { path: "/teacher/rewards", heading: /Rewards and gift redemptions/i }
    ];

    for (const route of routes) {
      await page.goto(route.path);
      await expect(page.getByRole("heading", { name: route.heading }).first()).toBeVisible();
      await page.waitForTimeout(100);
      expectNoPageErrors(errors);
    }
  });

  test("parent console first-load routes hydrate without React page errors", async ({ page }) => {
    const errors = collectPageErrors(page);

    await loginAsDemoParent(page);

    const routes = [
      { path: "/parent", heading: /Today.s home-school picture/i },
      { path: "/parent/reports", heading: /Teacher-published summaries/i }
    ];

    for (const route of routes) {
      await page.goto(route.path);
      await expect(page.getByRole("heading", { name: route.heading }).first()).toBeVisible();
      await page.waitForTimeout(100);
      expectNoPageErrors(errors);
    }
  });
});
