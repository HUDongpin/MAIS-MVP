import { expect, test, type Page } from "@playwright/test";
import { demoStudent, demoTeacher } from "./helpers";
import { startIsolatedApp, type IsolatedApp } from "./isolated-app";

test.setTimeout(120_000);

async function loginThroughApi(app: IsolatedApp, page: Page, username: string, password: string) {
  const response = await page.request.post(app.url("/api/auth/login"), {
    data: {
      username,
      password,
      grade: "S3",
      language: "en",
      theme: "dark"
    }
  });
  expect(response.ok()).toBeTruthy();
}

test.describe.serial("gamification rewards workflows", () => {
  test("student redemption and teacher award fulfillment update point state", async ({ page }, testInfo) => {
    test.slow();
    const app = await startIsolatedApp("rewards", testInfo);

    try {
      expect(app.dbPath).toContain(".tmp/e2e-isolated/rewards/");

      await loginThroughApi(app, page, demoStudent.username, demoStudent.password);
      await page.goto(app.url("/dashboard"));
      // A fresh isolated dev server compiles the dashboard and its API routes on
      // first use. Keep this cold-start budget explicit; later assertions retain
      // the normal expect timeout.
      await expect(page.getByRole("heading", { name: /Points balance/i })).toBeVisible({ timeout: 30_000 });
      await page.getByText(/^Open reward shop$/i).click();
      await expect(page.getByRole("heading", { name: /^Reward shop$/i })).toBeVisible({ timeout: 30_000 });
      await expect(page.getByText(/Learning stationery kit/i)).toBeVisible();
      await expect(page.getByText(/Explore a visualization/i)).toBeVisible();
      await expect(page.getByText(/Review mistakes/i)).toBeVisible();
      await expect(page.getByText(/Learning kit/i)).toBeVisible();
      await expect(page.getByText(/^Available$/i).first()).toBeVisible();
      const lessonAward = await page.request.post(app.url("/api/lesson-progress"), {
        data: { slug: "trigonometry-basics", action: "complete" }
      });
      expect(lessonAward.ok()).toBeTruthy();
      const rewardsAfterLesson = await page.request.get(app.url("/api/rewards"));
      expect(rewardsAfterLesson.ok()).toBeTruthy();
      const lessonRewardPayload = await rewardsAfterLesson.json();
      expect(JSON.stringify(lessonRewardPayload)).toContain("lesson-complete");
      expect(JSON.stringify(lessonRewardPayload)).toContain("Trigonometry Basics");
      const pencilCard = page.locator("article").filter({ hasText: /Pencil set/i }).first();
      await expect(pencilCard).toBeVisible();
      await pencilCard.getByRole("button", { name: /Request gift/i }).click();
      await expect(page.getByText(/Gift request sent to HK Teacher Chan/i)).toBeVisible();

      await page.request.post(app.url("/api/auth/logout"));
      await loginThroughApi(app, page, demoTeacher.username, demoTeacher.password);
      await page.goto(app.url("/teacher/rewards"));
      await page.waitForLoadState("networkidle");
      await expect(page.getByRole("heading", { name: /Rewards and gift redemptions/i })).toBeVisible();

      await page.getByRole("combobox", { name: /^Student$/i }).selectOption({ label: "HK Student Peter" });
      await page.getByRole("combobox", { name: /^Reason$/i }).selectOption("completed-challenge");
      await page.getByRole("spinbutton", { name: /^Points$/i }).fill("33");
      await page.getByRole("textbox", { name: /^Note$/i }).fill("Solved the extension with clear working.");
      // The rewards view posts to reward-awards, which re-exports POST from
      // rewards/award. Matching only the canonical path never fires, so this
      // waited out the timeout instead of asserting the award. Accept either.
      const awardResponse = page.waitForResponse((response) =>
        (response.url().endsWith("/api/teacher/reward-awards") ||
          response.url().endsWith("/api/teacher/rewards/award")) &&
        response.request().method() === "POST"
      );
      await page.getByRole("button", { name: /^Award points$/i }).click();
      expect((await awardResponse).ok()).toBeTruthy();
      await expect(page.getByText(/Points awarded/i)).toBeVisible();

      const redemptionCard = page.locator("article").filter({ hasText: /Pencil set/i }).first();
      await expect(redemptionCard.getByText(/Pending approval/i)).toBeVisible();
      const approveResponse = page.waitForResponse((response) =>
        response.url().includes("/api/teacher/rewards/redemptions/") &&
        response.request().method() === "PATCH"
      );
      await redemptionCard.getByRole("button", { name: /Approve request/i }).click();
      expect((await approveResponse).ok()).toBeTruthy();
      await expect(redemptionCard.getByText(/^Approved$/i).first()).toBeVisible();
      const fulfillResponse = page.waitForResponse((response) =>
        response.url().includes("/api/teacher/rewards/redemptions/") &&
        response.request().method() === "PATCH"
      );
      await redemptionCard.getByRole("button", { name: /Mark fulfilled/i }).click();
      expect((await fulfillResponse).ok()).toBeTruthy();
      await expect(redemptionCard.getByText(/^Fulfilled$/i).first()).toBeVisible();

      await page.request.post(app.url("/api/auth/logout"));
      await loginThroughApi(app, page, demoStudent.username, demoStudent.password);
      await page.goto(app.url("/dashboard"));
      await expect(page.getByRole("heading", { name: /Points balance/i })).toBeVisible();
      await page.getByText(/^Open reward shop$/i).click();
      await expect(page.getByText(/Teacher bonus: Completed challenge/i)).toBeVisible();
      await expect(page.getByText(/Pencil set/i).first()).toBeVisible();
    } finally {
      await app.attachLogs(testInfo);
      await app.stop();
    }
  });
});
