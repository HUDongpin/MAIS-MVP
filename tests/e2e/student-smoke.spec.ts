import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { clickLoginSubmit, registerStudent } from "./helpers";

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

async function openLearningAnalyticsBay(page: Page) {
  const signalBay = page.locator("details").filter({ hasText: /Signal bay/i }).first();
  await signalBay.locator("summary").click();
  await expect(signalBay.getByText(/Personalized learning analytics report/i)).toBeVisible();
  return signalBay;
}

async function mockTutorReply(page: Page, reply: string) {
  await page.route("**/api/ai-tutor", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ reply })
    });
  });
}

test.describe.serial("student website smoke", () => {
  test("auth, learning, practice, analytics, visualization, and tutor flows work end to end", async ({ page, context }, testInfo) => {
    test.slow();
    const student = buildStudent(testInfo);

    await expectNoClientPageErrors(page, async () => {
      await mockTutorReply(page, "Mocked student smoke tutor reply.");

      await page.goto("/progress");
      await expect(page).toHaveURL(/\/login\?next=%2Fprogress/);
      await expect(page.getByText(/Log in to view your saved progress/i)).toBeVisible();

      Object.assign(student, await registerStudent(page, testInfo, "S2"));
      await expect(page).toHaveURL(/\/dashboard/);
      await expect(page.getByRole("heading", { name: new RegExp(`Welcome back, ${student.name}`, "i") })).toBeVisible();
      await expect(page.getByText(/Learning course/i)).toBeVisible();

      await page.goto("/student/roadmap");
      await expect(page).toHaveURL(/\/student\/roadmap/);
      await expect(page.getByRole("heading", { name: /Learning Path|S2 Learning Path/i })).toBeVisible();

      const primaryRoadmapLink = page.getByRole("link", { name: /P1 to P6 primary Subway map/i });
      await expect(primaryRoadmapLink).toHaveAttribute("href", "/student/roadmap/primary");
      await page.goto("/student/roadmap/primary");
      await expect(page.getByRole("heading", { name: /Primary Math Subway Map/i })).toBeVisible();
      await expect(page.getByRole("heading", { name: /Complete Subway map with station-linked minibuses/i })).toBeVisible();
      await expect(page.getByRole("button", { name: /Fit Map/i })).toBeVisible();
      await expect(page.getByRole("button", { name: /P1/i })).toBeVisible();
      if ((page.viewportSize()?.width ?? 0) >= 1280) {
        await expect(page.getByText(/Mini map/i)).toBeVisible();
        await expect(page.getByText(/Minibus details/i)).toBeVisible();
      }

      await page.goto("/student/roadmap");
      const roadmapLink = page.getByRole("link", { name: /S1 to S6 secondary Subway map/i });
      await expect(roadmapLink).toHaveAttribute("href", "/student/roadmap/secondary");
      await page.goto("/student/roadmap/secondary");
      await expect(page.getByRole("heading", { name: /Secondary Math Subway Map/i })).toBeVisible();

      await page.goto("/student/lessons/linear-equations");
      await expect(page.getByRole("heading", { level: 1, name: /Linear Equations/i })).toBeVisible();
      // Lessons deliberately render one "Go to next item" CTA per section.
      await expect(page.getByRole("button", { name: /Go to next item/i }).first()).toBeVisible();
      await expect(page.getByRole("heading", { name: /Lesson practice/i })).toBeVisible();
      await expect(page.getByText(/Question 1 of/i)).toBeVisible();

      await page.goto("/practice");
      await unlockPracticeFiltersIfNeeded(page, "S2");
      await expect(page.getByLabel(/^grade$/i)).toHaveCount(0);
      await page.getByRole("combobox", { name: /difficulty/i }).selectOption("Medium");
      const coordinateCard = page.locator("article").filter({ hasText: /Point A is at/ }).first();
      await expect(coordinateCard).toBeVisible();
      await coordinateCard.getByRole("button", { name: /^I$/ }).click();
      await coordinateCard.getByRole("button", { name: /check answer/i }).click();
      await expect(coordinateCard.getByText(/Saved to Mistake Book/i)).toBeVisible();

      const linearCard = page.locator("article").filter({ hasText: /Solve:/ }).first();
      await linearCard.getByRole("textbox", { name: /Type the missing value|Fill in the blank/i }).fill(" 4 ");
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

      await page.goto("/student/tools/visualizations");
      await expect(page.getByRole("heading", { name: /Visualization Lab/i })).toBeVisible();
      // Exploration is earned: after the lab runtime is ready the student must
      // interact with the lab body and keep it on screen through a short dwell
      // before the automatic POST fires. Register the listener first.
      const visualizationResponse = page.waitForResponse((response) =>
        response.url().includes("/api/visualization-sessions") && response.request().method() === "POST"
      );
      await page.getByRole("link", { name: /Start Quest/i }).click();
      await expect(page.locator("[data-viz-card]")).toBeVisible({ timeout: 15_000 });
      await page.locator("[data-viz-card-body]").first().click({ position: { x: 8, y: 8 } });
      expect((await visualizationResponse).ok()).toBeTruthy();

      await page.goto("/personalized-learning");
      await openLearningAnalyticsBay(page);
      const downloadPromise = page.waitForEvent("download");
      await page.getByRole("button", { name: /Export Excel/i }).click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/learning-analytics-S2\.xlsx/);

      await page.goto("/practice");
      await page.getByRole("button", { name: /^Nova Tutor$/i }).click({ force: true });
      const tutorPanel = page.getByRole("dialog", { name: /Nova Tutor/i });
      await expect(tutorPanel).toBeVisible();
      await tutorPanel.getByLabel(/Ask Nova Tutor/i).fill("I am stuck. Give me one hint.");
      await tutorPanel.getByRole("button", { name: /^Send$/i }).click();
      await expect(tutorPanel.getByText("Mocked student smoke tutor reply.", { exact: true })).toBeVisible({ timeout: 10_000 });
      await tutorPanel.getByRole("button", { name: /Close Nova Tutor/i }).click();
      await expect(tutorPanel).toBeHidden();

      await openMobileMenuIfNeeded(page);
      await page.getByRole("button", { name: /Log out/i }).click();
      await expect(page).toHaveURL(/\/login/);

      await page.getByLabel(/email or username|email or user name|user name/i).fill(student.username);
      await page.getByLabel(/^password$/i).fill(student.password);
      await clickLoginSubmit(page);
      await expect(page).toHaveURL(/\/dashboard/);

      await page.goto("/forgot-password");
      await page.getByLabel(/email or username|email or user name/i).fill(student.username);
      await page.getByRole("button", { name: /Send reset instructions/i }).click();
      const resetLink = page.getByRole("link", { name: /Open local reset link/i });
      await expect(resetLink).toBeVisible();
      await resetLink.click();
      await expect(page).toHaveURL(/\/reset-password\?token=/);
      await page.getByLabel(/^new password$/i).fill(student.nextPassword);
      await page.getByRole("textbox", { name: /confirm new password/i }).fill(student.nextPassword);
      await expect(page.getByRole("button", { name: /Update password/i })).toBeEnabled();
      await expect(page.getByRole("link", { name: /Back to log in/i })).toHaveAttribute("href", "/login");

      const analyticsResponse = await context.request.get("/api/analytics/summary?grade=S2&window=7d");
      expect(analyticsResponse.ok()).toBeTruthy();
      const analytics = (await analyticsResponse.json()) as { summary?: { eventCount?: number } };
      expect(analytics.summary?.eventCount ?? 0).toBeGreaterThan(0);
    });
  });
});
