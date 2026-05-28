import { expect, test, type Page, type TestInfo } from "@playwright/test";

function buildStudent(testInfo: TestInfo) {
  const projectSlug = testInfo.project.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const runId = `${Date.now()}-${projectSlug}`;

  return {
    name: `E2E Student ${runId}`,
    username: `e2e-${runId}@example.test`,
    password: "start12345",
    nextPassword: "next12345"
  };
}

async function openMobileMenuIfNeeded(page: Page) {
  const menu = page.getByRole("button", { name: /open mobile menu/i });
  if (await menu.isVisible()) await menu.click();
}

async function expectNoClientPageErrors(page: Page, action: () => Promise<void>) {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await action();
  expect(pageErrors).toEqual([]);
}

async function unlockPracticeFiltersIfNeeded(page: Page, grade: string) {
  await page.waitForLoadState("networkidle");
  if (await page.getByRole("combobox", { name: /difficulty/i }).isVisible().catch(() => false)) return;

  const meResponse = await page.request.get("/api/me");
  expect(meResponse.ok()).toBeTruthy();
  const me = await meResponse.json() as { user: { id: string } };
  const decisionResponse = await page.request.get(`/api/adaptive-learning/next?grade=${grade}`);
  expect(decisionResponse.ok()).toBeTruthy();
  const { decision } = await decisionResponse.json() as { decision: { skill: { id: string } } };

  await page.evaluate(({ userId, skillId }) => {
    window.localStorage.setItem(`hk-math-practice-free-selection-unlocked:${userId}:${skillId}`, "true");
  }, { userId: me.user.id, skillId: decision.skill.id });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("combobox", { name: /difficulty/i })).toBeVisible();
}

test.describe.serial("student website smoke", () => {
  test("auth, learning, practice, analytics, visualization, and tutor flows work end to end", async ({ page, context }, testInfo) => {
    test.slow();
    const student = buildStudent(testInfo);

    await expectNoClientPageErrors(page, async () => {
      await page.goto("/progress");
      await expect(page).toHaveURL(/\/login\?next=%2Fprogress/);
      await expect(page.getByText(/Log in to view your saved progress/i)).toBeVisible();

      await page.goto("/register");
      await page.getByRole("radio", { name: /individual student/i }).click();
      await page.getByRole("radio", { name: /S2/ }).click();
      await page.getByLabel(/student name/i).fill(student.name);
      await page.getByLabel(/email/i).fill(student.username);
      await page.getByLabel(/username|student id|user name/i).fill(student.username);
      await page.getByLabel(/^password$/i).fill(student.password);
      await page.getByLabel(/confirm password/i).fill(student.password);
      await page.getByRole("button", { name: /create account/i }).click();
      await expect(page).toHaveURL(/\/dashboard/);
      await expect(page.getByRole("heading", { name: new RegExp(`Welcome back, ${student.name}`, "i") })).toBeVisible();
      await expect(page.getByText(/Personalized learning analytics report/i)).toBeVisible();

      await openMobileMenuIfNeeded(page);
      await page.getByRole("link", { name: /Learning Path/i }).click();
      await expect(page).toHaveURL(/\/learning-path/);
      await expect(page.getByRole("heading", { name: /S2 Learning Path/i })).toBeVisible();

      const primaryRoadmapLink = page.getByRole("link", { name: /P1 to P6 primary Subway map/i });
      await expect(primaryRoadmapLink).toHaveAttribute("href", "/primary-roadmap");
      await page.goto("/primary-roadmap");
      await expect(page.getByRole("heading", { name: /Primary Math Subway Map/i })).toBeVisible();
      await expect(page.getByRole("heading", { name: /Complete Subway map with station-linked minibuses/i })).toBeVisible();
      await expect(page.getByRole("button", { name: /Fit Map/i })).toBeVisible();
      await expect(page.getByRole("button", { name: /P1/i })).toBeVisible();
      if ((page.viewportSize()?.width ?? 0) >= 1280) {
        await expect(page.getByText(/Mini map/i)).toBeVisible();
        await expect(page.getByText(/Minibus details/i)).toBeVisible();
      }

      await page.goto("/learning-path");
      const roadmapLink = page.getByRole("link", { name: /S1 to S6 secondary Subway map/i });
      await expect(roadmapLink).toHaveAttribute("href", "/secondary-roadmap");
      await page.goto("/secondary-roadmap");
      await expect(page.getByRole("heading", { name: /Secondary Math Subway Map/i })).toBeVisible();

      await page.goto("/lesson/quadratic-functions");
      await expect(page.getByRole("heading", { name: /Quadratic Functions/i })).toBeVisible();
      const firstChecklistItem = page.locator('input[type="checkbox"]').first();
      await firstChecklistItem.check();
      await page.getByRole("button", { name: /Mark lesson complete/i }).click();
      await expect(page.getByText(/Mastery: 85%|Mastery: 100%/i)).toBeVisible();

      await page.goto("/practice");
      await unlockPracticeFiltersIfNeeded(page, "S2");
      await expect(page.getByLabel(/^grade$/i)).toHaveCount(0);
      const coordinateCard = page.locator("article").filter({ hasText: /Point A is at/ }).first();
      await expect(coordinateCard).toBeVisible();
      await coordinateCard.getByRole("button", { name: /^I$/ }).click();
      await coordinateCard.getByRole("button", { name: /check answer/i }).click();
      await expect(coordinateCard.getByText(/Saved to Mistake Book/i)).toBeVisible();

      const linearCard = page.locator("article").filter({ hasText: /Solve:/ }).first();
      await linearCard.getByLabel(/Fill in the blank/i).fill(" 4 ");
      await linearCard.getByRole("button", { name: /check answer/i }).click();
      await expect(linearCard.getByText(/Correct/i)).toBeVisible();

      await page.goto("/mistake-book");
      await expect(page.getByRole("heading", { name: /Mistake Book/i })).toBeVisible();
      await expect(page.getByText(/Point A is at/)).toBeVisible();
      await page.getByRole("button", { name: /Mark mastered/i }).click();
      await page.getByRole("button", { name: /^All$/i }).click();
      await expect(page.getByText(/Mastered items/i).last()).toBeVisible();
      await page.getByRole("button", { name: /^Remove$/i }).click();
      await expect(page.getByText(/No wrong answers saved yet/i)).toBeVisible();

      await page.goto("/visualization-lab");
      await expect(page.getByRole("heading", { name: /Visualization Lab/i })).toBeVisible();
      const visualizationResponse = page.waitForResponse((response) =>
        response.url().includes("/api/visualization-sessions") && response.request().method() === "POST"
      );
      await page.getByRole("button", { name: /Mark explored/i }).first().click();
      expect((await visualizationResponse).ok()).toBeTruthy();

      await page.goto("/dashboard");
      const downloadPromise = page.waitForEvent("download");
      await page.getByRole("button", { name: /Export summary/i }).click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/learning-analytics-S2\.json/);

      await page.goto("/practice");
      await page.getByRole("button", { name: /^AI Tutor$/i }).click({ force: true });
      const tutorPanel = page.getByRole("dialog", { name: /AI Tutor/i });
      await expect(tutorPanel).toBeVisible();
      await tutorPanel.getByLabel(/Ask AI Tutor/i).fill("I am stuck. Give me one hint.");
      await tutorPanel.getByRole("button", { name: /^Send$/i }).click();
      await expect(tutorPanel.getByText("Local helper mode", { exact: true })).toBeVisible();
      await tutorPanel.getByRole("button", { name: /Close AI Tutor/i }).click();
      await expect(tutorPanel).toBeHidden();

      await openMobileMenuIfNeeded(page);
      await page.getByRole("button", { name: /Log out/i }).click();
      await expect(page).toHaveURL(/\/login/);

      await page.getByLabel(/email or username|email or user name|user name/i).fill(student.username);
      await page.getByLabel(/^password$/i).fill(student.password);
      await page.getByRole("button", { name: /^Log In$/i }).click();
      await expect(page).toHaveURL(/\/dashboard/);

      await page.goto("/forgot-password");
      await page.getByLabel(/email or username|email or user name/i).fill(student.username);
      await page.getByRole("button", { name: /Send reset instructions/i }).click();
      const resetLink = page.getByRole("link", { name: /Open local reset link/i });
      await expect(resetLink).toBeVisible();
      await resetLink.click();
      await expect(page).toHaveURL(/\/reset-password\?token=/);
      await page.getByLabel(/^new password$/i).fill(student.nextPassword);
      await page.getByLabel(/confirm new password/i).fill(student.nextPassword);
      await page.getByRole("button", { name: /Update password/i }).click();
      await expect(page).toHaveURL(/\/dashboard/);

      const analyticsResponse = await context.request.get("/api/analytics/summary?grade=S2&window=7d");
      expect(analyticsResponse.ok()).toBeTruthy();
      const analytics = (await analyticsResponse.json()) as { summary?: { eventCount?: number } };
      expect(analytics.summary?.eventCount ?? 0).toBeGreaterThan(0);
    });
  });
});
