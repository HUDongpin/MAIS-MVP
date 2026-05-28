import { expect, test, type Page } from "@playwright/test";
import { collectPageErrors, expectDownloadFrom, expectNoPageErrors, loginAs, loginAsDemoStudent, logoutIfVisible, registerStudent } from "./helpers";

type PracticeDecisionResponse = {
  decision: {
    skill: { id: string; difficulty: string };
    topic: { title: { en: string } };
    questions: Array<{ type: "multiple-choice" | "fill-in" | "short-answer" | "graph" }>;
  };
};

const practiceQuestionTypeLabels = {
  "multiple-choice": "Multiple choice",
  "fill-in": "Fill-in",
  "short-answer": "Short answer",
  graph: "Graph"
} as const;

function practiceQuestionTypeCounts(questions: PracticeDecisionResponse["decision"]["questions"]) {
  return questions.reduce<Record<keyof typeof practiceQuestionTypeLabels, number>>(
    (counts, question) => ({
      ...counts,
      [question.type]: counts[question.type] + 1
    }),
    {
      "multiple-choice": 0,
      "fill-in": 0,
      "short-answer": 0,
      graph: 0
    }
  );
}

async function unlockPracticeFiltersIfNeeded(page: Page) {
  await page.waitForLoadState("networkidle");
  if (await page.getByRole("combobox", { name: /difficulty/i }).isVisible().catch(() => false)) return;

  const response = await page.request.get("/api/adaptive-learning/next?grade=S3");
  const { decision } = await response.json() as PracticeDecisionResponse;
  await page.evaluate((skillId) => {
    window.localStorage.setItem(`hk-math-practice-free-selection-unlocked:student-peter:${skillId}`, "true");
  }, decision.skill.id);
  await page.reload();
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("combobox", { name: /difficulty/i })).toBeVisible();
}

test.describe("student frontend workflows", () => {
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

    await loginAsDemoStudent(page);
    await expect(page.getByRole("heading", { name: /Welcome back, HK Student Peter/i })).toBeVisible();
    await expect(page.getByText(/Personalized learning analytics report/i)).toBeVisible();
    await expectDownloadFrom(page, () => page.getByRole("button", { name: /Export summary/i }).click(), /learning-analytics-S3\.json/);

    await page.goto("/progress");
    await expect(page.getByRole("heading", { name: /Progress/i })).toBeVisible();
    await expect(page.getByText(/Weekly learning activity/i)).toBeVisible();
    await expect(page.getByText(/Mastery map/i)).toBeVisible();

    await page.goto("/learning-path");
    await expect(page.getByRole("heading", { name: /S3 Learning Path/i })).toBeVisible();
    const bodyText = await page.locator("body").innerText();
    expect(bodyText).not.toMatch(/\bMTR\b/i);
    await expect(page.getByRole("link", { name: /P1 to P6 primary Subway map/i })).toHaveAttribute("href", "/primary-roadmap");
    await expect(page.getByRole("link", { name: /S1 to S6 secondary Subway map/i })).toHaveAttribute("href", "/secondary-roadmap");

    await page.goto("/primary-roadmap");
    await expect(page.getByRole("heading", { name: /Primary Math Subway Map/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Fit Map/i })).toBeVisible();
    if ((page.viewportSize()?.width ?? 0) >= 1280) {
      await expect(page.getByText(/Mini map/i)).toBeVisible();
    }

    await page.goto("/secondary-roadmap");
    await expect(page.getByRole("heading", { name: /Secondary Math Subway Map/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Fit Map/i })).toBeVisible();

    await page.goto("/lesson/quadratic-functions");
    await expect(page.getByRole("heading", { name: /Quadratic Functions/i })).toBeVisible();
    await page.locator('input[type="checkbox"]').first().check();
    await page.getByRole("button", { name: /Mark lesson complete/i }).click();
    await expect(page.getByText(/Mastery: 85%|Mastery: 100%/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Ask AI Tutor/i }).first()).toBeVisible();

    await page.goto("/resource/resource-s3-quadratics-slides");
    await expect(page.getByRole("heading", { name: /S3 Quadratics lesson slides/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Download resource/i })).toHaveAttribute("href", /\/api\/resources\/resource-s3-quadratics-slides\/download/);
    await page.getByRole("button", { name: /Mark complete/i }).click();
    await expect(page.getByText(/Resource marked complete/i)).toBeVisible();

    await page.goto("/assessment/assessment-s3-algebra-quiz");
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

  test("practice filters, answer feedback, and mistake book actions work", async ({ page }) => {
    test.slow();
    const pageErrors = collectPageErrors(page);

    await loginAsDemoStudent(page);
    await page.goto("/practice");
    await expect(page.getByRole("heading", { name: /Practice Arena/i })).toBeVisible();
    await unlockPracticeFiltersIfNeeded(page);
    await page.getByRole("combobox", { name: /difficulty/i }).selectOption("Challenge");
    await page.getByRole("combobox", { name: /Question type/i }).selectOption("multiple-choice");
    await expect(page.locator("article").first()).toBeVisible();

    await page.getByRole("combobox", { name: /Question type/i }).selectOption("all");
    await expect(page.getByText(/Question 1 of/i)).toBeVisible();
    await page.getByRole("button", { name: /Next question/i }).click();
    await expect(page.getByText(/Question 2 of/i)).toBeVisible();
    await page.getByLabel(/Jump to/i).fill("1");
    await page.getByRole("button", { name: /^Jump$/i }).click();
    await expect(page.getByText(/Question 1 of/i)).toBeVisible();

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

    await page.goto("/lesson/polynomials");
    await expect(page.getByRole("heading", { level: 1, name: /Polynomials/i })).toBeVisible();
    await page.getByRole("button", { name: /Mark lesson complete/i }).click();
    await expect(page.getByText(/Mastery: 85%|Mastery: 100%/i)).toBeVisible();

    const expectedDecision = await (await page.request.get("/api/adaptive-learning/next?grade=S3&topicId=polynomials")).json() as PracticeDecisionResponse;
    expect(expectedDecision.decision.skill.id).toBe("polynomials:fluency");
    expect(expectedDecision.decision.skill.difficulty).toBe("Core");
    await page.getByRole("link", { name: /Practice Arena/i }).last().click();
    await expect(page.getByRole("heading", { name: /Practice Arena/i })).toBeVisible();

    const adaptivePanel = page.locator("section").filter({ hasText: /Adaptive practice set/i }).first();
    await expect(adaptivePanel).toBeVisible();
    await expect(adaptivePanel).toContainText(expectedDecision.decision.topic.title.en);
    await expect(adaptivePanel).toContainText(expectedDecision.decision.skill.difficulty);

    const questionMix = practiceQuestionTypeCounts(expectedDecision.decision.questions);
    for (const [type, count] of Object.entries(questionMix)) {
      if (!count) continue;
      await expect(adaptivePanel).toContainText(`${practiceQuestionTypeLabels[type as keyof typeof practiceQuestionTypeLabels]} x${count}`);
    }

    expectNoPageErrors(pageErrors);
  });
});
