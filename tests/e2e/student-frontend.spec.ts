import { expect, test, type Page } from "@playwright/test";
import { collectPageErrors, expectDownloadFrom, expectNoPageErrors, loginAs, logoutIfVisible, openPracticeFiltersPanel, registerStudent, registerStudentApi, uniqueSuffix } from "./helpers";

type PracticeDecisionResponse = {
  decision: {
    skill: { id: string; difficulty: string };
    topic: { title: { en: string } };
    questions: Array<{ type: "multiple-choice" | "fill-in" | "short-answer" | "graph" }>;
  };
};

async function unlockPracticeFiltersIfNeeded(page: Page) {
  await page.waitForLoadState("networkidle");
  await openPracticeFiltersPanel(page);
  if (await page.getByRole("combobox", { name: /difficulty/i }).isVisible().catch(() => false)) return;

  const meResponse = await page.request.get("/api/me");
  expect(meResponse.ok()).toBeTruthy();
  const me = await meResponse.json() as { user?: { grade?: string; id?: string } };
  const grade = me.user?.grade ?? "S3";
  const userId = me.user?.id ?? "student-peter";
  const response = await page.request.get(`/api/adaptive-learning/next?grade=${encodeURIComponent(grade)}`);
  const { decision } = await response.json() as PracticeDecisionResponse;
  await page.evaluate((storageKey) => {
    window.localStorage.setItem(storageKey, "true");
  }, `hk-math-practice-free-selection-unlocked:${userId}:${decision.skill.id}`);
  await page.reload();
  await page.waitForLoadState("networkidle");
  await openPracticeFiltersPanel(page);
  await expect(page.getByRole("combobox", { name: /difficulty/i })).toBeVisible();
}

async function loginAsHkS3DemoStudentThroughApi(page: Page) {
  const response = await page.request.post("/api/auth/login", {
    data: {
      username: "HK Student Peter",
      password: "12345",
      grade: "S3",
      curriculumTrack: "HK",
      curriculumProfile: { region: "HK", publisher: "HK_UNITED_PRIME_MIA" },
      language: "en",
      theme: "light"
    }
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  await page.goto("/dashboard");
}

async function loginAsUsDemoStudent(page: Page) {
  const response = await page.request.post("/api/auth/login", {
    data: {
      username: "Student Shirleen",
      password: "12345",
      grade: "P1",
      curriculumTrack: "US_CA_MATH",
      curriculumProfile: { region: "US", publisher: "US_CA_MATH" },
      language: "en",
      theme: "light"
    }
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  await page.goto("/dashboard");
}

async function openLearningAnalyticsBay(page: Page) {
  const signalBay = page.locator("details").filter({ hasText: /Signal bay/i }).first();
  await signalBay.locator("summary").click();
  await expect(signalBay.getByText(/Personalized learning analytics report/i)).toBeVisible();
  return signalBay;
}

test.describe("student frontend workflows", () => {
  test("US adaptive page shows live California route", async ({ page }) => {
    const pageErrors = collectPageErrors(page);

    await loginAsUsDemoStudent(page);

    const adaptiveResponse = await page.request.get("/api/adaptive-learning/next?grade=P1");
    const adaptivePayload = await adaptiveResponse.json() as {
      reason?: string;
      decision?: { topic?: { curriculumTrack?: string }; questions?: unknown[] };
    };
    expect(adaptiveResponse.status()).toBe(200);
    expect(adaptivePayload.reason).toBeUndefined();
    expect(adaptivePayload.decision?.topic?.curriculumTrack).toBe("US_CA_MATH");
    expect(adaptivePayload.decision?.questions?.length ?? 0).toBeGreaterThan(0);

    await page.goto("/personalized-learning");
    const galaxy = page.locator('section[aria-label="Adaptive knowledge galaxy"]');
    await expect(galaxy).toBeVisible();
    await expect(galaxy).not.toContainText(/This curriculum is not open in MAIS yet/i);
    await expect(galaxy).not.toContainText(/Adaptive route unavailable for this course/i);
    await expect(galaxy).not.toContainText(/Your route appears after the adaptive engine receives enough saved learning evidence/i);
    await expect(galaxy).toContainText(/California/i);

    expectNoPageErrors(pageErrors);
  });

  test("dashboard, progress, roadmap, lessons, resources, assessments, and messages render functional UI", async ({ page }) => {
    const pageErrors = collectPageErrors(page);
    const resourceAssignmentTitle = `E2E resource assignment ${Date.now()}`;

    await loginAs(page, "HK Teacher Chan", "12345", /\/teacher/);
    const resourceAssignment = await page.request.post("/api/teacher/assignments", {
      data: {
        classId: "class-s3a-2026",
        title: resourceAssignmentTitle,
        description: "E2E resource completion coverage",
        contentType: "resource",
        targetId: "resource-s3-quadratics-slides",
        allowRetake: true,
        showAnswers: false,
        countTowardsGrade: true
      }
    });
    expect(resourceAssignment.ok()).toBeTruthy();
    await logoutIfVisible(page);

    await loginAsHkS3DemoStudentThroughApi(page);
    await expect(page.getByRole("heading", { name: /Welcome back, HK Student Peter/i })).toBeVisible();
    await expect(page.getByText(/Learning course/i)).toBeVisible();

    await page.goto("/personalized-learning");
    await openLearningAnalyticsBay(page);
    await expectDownloadFrom(page, () => page.getByRole("button", { name: /Export Excel/i }).click(), /learning-analytics-S4\.xlsx/);

    await page.goto("/progress");
    await expect(page.getByRole("heading", { name: /Progress/i })).toBeVisible();
    await expect(page.getByText(/Weekly learning activity/i)).toBeVisible();
    await expect(page.getByText(/Mastery map/i)).toBeVisible();

    await page.goto("/student/roadmap");
    await expect(page.getByRole("heading", { name: /Learning Path|S3 Learning Path/i })).toBeVisible();
    const bodyText = await page.locator("body").innerText();
    expect(bodyText).not.toMatch(/\bMTR\b/i);
    await expect(page.getByRole("link", { name: /P1 to P6 primary Subway map/i })).toHaveAttribute("href", "/student/roadmap/primary");
    await expect(page.getByRole("link", { name: /S1 to S6 secondary Subway map/i })).toHaveAttribute("href", "/student/roadmap/secondary");

    await page.goto("/student/roadmap/primary");
    await expect(page.getByRole("heading", { name: /Primary Math Subway Map/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Fit Map/i })).toBeVisible();
    if ((page.viewportSize()?.width ?? 0) >= 1280) {
      await expect(page.getByText(/Mini map/i)).toBeVisible();
    }

    await page.goto("/student/roadmap/secondary");
    await expect(page.getByRole("heading", { name: /Secondary Math Subway Map/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Fit Map/i })).toBeVisible();

    await page.goto("/student/lessons/quadratic-functions");
    await expect(page.getByRole("heading", { name: /Quadratic Functions/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Go to next item|前往下一項|前往下一项/i })).toHaveCount(0);
    await expect(page.locator("[data-lesson-next-item-button]")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: /Lesson practice/i })).toBeVisible();
    await expect(page.getByText(/Question 1 of/i)).toBeVisible();

    await page.goto("/resource/resource-s3-quadratics-slides");
    await expect(page.getByRole("heading", { name: /S3 Quadratics lesson slides/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Nova Tutor$/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Download resource/i })).toHaveAttribute("href", /\/api\/resources\/resource-s3-quadratics-slides\/download/);
    await page.getByRole("button", { name: /Mark complete/i }).click();
    await expect(page.getByText(/Resource marked complete/i)).toBeVisible();

    await page.goto("/student/assessments/assessment-s3-algebra-quiz");
    await expect(page.getByRole("heading", { name: /S3 algebra readiness quiz/i })).toBeVisible();
    await expect(page.getByText(/Current score/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Submit assessment/i })).toBeDisabled();

    await page.goto("/messages");
    await expect(page.getByRole("heading", { name: /Ask your teacher/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Threads/i })).toBeVisible();
    await page.getByPlaceholder(/Subject/i).fill(`E2E message ${Date.now()}`);
    await page.getByPlaceholder(/What would you like help with/i).fill("Can you check my vertex form steps?");
    await page.getByRole("button", { name: /Send message/i }).click({ force: true });
    await expect(page.getByText(/Message sent/i)).toBeVisible();

    expectNoPageErrors(pageErrors);
  });

  test("practice filters, answer feedback, and mistake book actions work", async ({ page }, testInfo) => {
    test.slow();
    const pageErrors = collectPageErrors(page);

    await registerStudentApi(page, testInfo, "S3");
    await page.goto("/practice");
    await expect(page.getByRole("heading", { name: /Practice Arena/i })).toBeVisible();
    await unlockPracticeFiltersIfNeeded(page);
    await page.getByRole("combobox", { name: /difficulty/i }).selectOption("High");
    await page.getByRole("combobox", { name: /^Topic$/i }).selectOption("quadratic-patterns");
    await page.getByRole("combobox", { name: /Question type/i }).selectOption("multiple-choice");
    await expect(page.locator("article").first()).toBeVisible();

    await page.getByRole("combobox", { name: /Question type/i }).selectOption("all");
    const practiceRegion = page.getByRole("region", { name: /Practice questions/i });
    await expect(practiceRegion.getByText(/Question 1 of/i)).toBeVisible();
    await practiceRegion.getByRole("button", { name: /Next question/i }).click();
    await expect(practiceRegion.getByText(/Question 2 of/i)).toBeVisible();
    await practiceRegion.getByRole("button", { name: /Previous question/i }).click();
    await expect(practiceRegion.getByText(/Question 1 of/i)).toBeVisible();

    const axisCard = page.locator("article").filter({ hasText: /axis of symmetry/ }).first();
    await expect(axisCard).toBeVisible();
    await axisCard.getByRole("button").filter({ hasText: /x\s*=/ }).first().click();
    await expect(axisCard.getByRole("button", { name: /check answer/i })).toBeEnabled();
    await axisCard.getByRole("button", { name: /reset/i }).click();
    await expect(axisCard.getByRole("button", { name: /check answer/i })).toBeDisabled();
    await axisCard.getByRole("button").filter({ hasText: /x\s*=/ }).first().click();
    await axisCard.getByRole("button", { name: /check answer/i }).click();
    await expect(axisCard.getByText(/Saved to Mistake Book/i)).toBeVisible();

    await page.goto("/mistake-book");
    await expect(page.getByRole("heading", { name: /Mistake Book/i })).toBeVisible();
    await page.getByRole("button", { name: /^All$/i }).click();
    await expect(page.getByText(/axis of symmetry/i)).toBeVisible();
    await page.getByRole("button", { name: /Mark mastered/i }).click();
    await page.getByRole("button", { name: /^mastered$/i }).click();
    await expect(page.getByText(/axis of symmetry/i)).toBeVisible();
    await page.getByRole("button", { name: /^Remove$/i }).click();
    await expect(page.getByText(/No wrong answers saved yet/i)).toBeVisible();

    expectNoPageErrors(pageErrors);
  });

  test("Practice Arena adaptive summary matches the API decision after a completed lesson outcome", async ({ page }, testInfo) => {
    const pageErrors = collectPageErrors(page);
    test.skip(testInfo.project.name !== "desktop-chrome", "Adaptive Practice Arena UI verification runs once.");

    await registerStudent(page, testInfo, "S3");
    const lessonAttempt = await page.request.post("/api/attempts", {
      data: {
        questionId: "supp-polynomials-key-fact",
        selectedAnswer: "7x^2",
        durationSeconds: 35
      }
    });
    expect(lessonAttempt.ok()).toBeTruthy();
    expect((await lessonAttempt.json() as { correct: boolean }).correct).toBe(true);

    await page.goto("/student/lessons/polynomials");
    await expect(page.getByRole("heading", { level: 1, name: /Polynomials/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Lesson practice/i })).toBeVisible();

    const expectedDecision = await (await page.request.get("/api/adaptive-learning/next?grade=S3&topicId=polynomials")).json() as PracticeDecisionResponse;
    expect(expectedDecision.decision.skill.id).toMatch(/^polynomials:/);
    expect(expectedDecision.decision.skill.difficulty).toMatch(/Low|Medium|High/);
    await page.getByRole("link", { name: /Practice Arena/i }).last().click();
    await expect(page.getByRole("heading", { name: /Practice Arena/i })).toBeVisible();

    const adaptivePanel = page.locator("#adaptive-practice-round");
    await expect(adaptivePanel).toBeVisible();
    await expect(adaptivePanel.getByRole("region", { name: /Practice questions/i }).getByText(/Question 1 of/i)).toBeVisible();
    await expect(adaptivePanel).toContainText(expectedDecision.decision.topic.title.en);

    expectNoPageErrors(pageErrors);
  });

  test("Practice Arena top navigation keeps the current lesson topic", async ({ page }, testInfo) => {
    test.setTimeout(60_000);
    const pageErrors = collectPageErrors(page);
    test.skip(testInfo.project.name !== "desktop-chrome", "Lesson-to-Practice navigation regression runs once.");

    const suffix = `${uniqueSuffix(testInfo)}-${Math.random().toString(36).slice(2, 8)}`;
    const username = `lesson-practice-${suffix}@example.test`;
    const registerResponse = await page.request.post("/api/auth/register", {
      data: {
        role: "student",
        name: `Lesson Practice ${suffix}`,
        username,
        email: username,
        password: "start12345",
        grade: "S3",
        curriculumTrack: "HK",
        curriculumProfile: { region: "HK", publisher: "HK_UNITED_PRIME_MIA" },
        language: "en",
        theme: "light"
      }
    });
    expect(registerResponse.ok()).toBeTruthy();

    await page.goto("/student/lessons/polynomials");
    await expect(page.getByRole("heading", { level: 1, name: /Polynomials/i })).toBeVisible();

    const expectedDecision = await (await page.request.get("/api/adaptive-learning/next?grade=S3&topicId=polynomials")).json() as PracticeDecisionResponse;
    const practiceNavLink = page.locator("header nav").getByRole("link", { name: /^Practice Arena$/i });
    await expect(practiceNavLink).toHaveAttribute("href", "/practice?lesson=polynomials");

    const topicScopedRecommendation = page.waitForResponse((response) => (
      response.url().includes("/api/adaptive-learning/next") &&
      response.url().includes("topicId=polynomials") &&
      response.ok()
    ));
    await practiceNavLink.click();
    await expect(page).toHaveURL(/\/practice\?lesson=polynomials$/);
    await expect(page.getByRole("heading", { name: /Practice Arena/i })).toBeVisible();
    await topicScopedRecommendation;

    const adaptivePanel = page.locator("#adaptive-practice-round");
    await expect(adaptivePanel).toBeVisible();
    await expect(adaptivePanel.getByRole("region", { name: /Practice questions/i }).getByText(/Question 1 of/i)).toBeVisible();
    await expect(adaptivePanel).toContainText(expectedDecision.decision.topic.title.en);

    expectNoPageErrors(pageErrors);
  });
});
