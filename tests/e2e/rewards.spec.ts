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
      await expect(page.getByRole("heading", { name: /Points balance/i })).toBeVisible();
      await expect(page.getByText(/Reward shop/i)).toBeVisible();
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
      const awardResponse = page.waitForResponse((response) =>
        response.url().endsWith("/api/teacher/rewards/award") && response.request().method() === "POST"
      );
      await page.getByRole("button", { name: /^Award points$/i }).click();
      expect((await awardResponse).ok()).toBeTruthy();
      await expect(page.getByText(/Points awarded/i)).toBeVisible();

      const redemptionCard = page.locator("article").filter({ hasText: /Pencil set/i }).first();
      await expect(redemptionCard.getByText(/Pending approval/i)).toBeVisible();
      await redemptionCard.getByRole("button", { name: /Approve request/i }).click();
      await expect(redemptionCard.getByText(/^Approved$/i).first()).toBeVisible();
      await redemptionCard.getByRole("button", { name: /Mark fulfilled/i }).click();
      await expect(redemptionCard.getByText(/^Fulfilled$/i).first()).toBeVisible();

      await page.request.post(app.url("/api/auth/logout"));
      await loginThroughApi(app, page, demoStudent.username, demoStudent.password);
      await page.goto(app.url("/dashboard"));
      await expect(page.getByRole("heading", { name: /Points balance/i })).toBeVisible();
      await expect(page.getByText(/Teacher bonus: Completed challenge/i)).toBeVisible();
      await expect(page.getByText(/Pencil set/i).first()).toBeVisible();
    } finally {
      await app.attachLogs(testInfo);
      await app.stop();
    }
  });
});
