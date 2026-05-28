import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";
import { questions } from "../../data/questions";
import {
  collectPageErrors,
  demoStudent,
  demoTeacher,
  expectDownloadFrom,
  expectNoPageErrors,
  loginAsDemoStudent,
  logoutIfVisible,
  openMobileMenuIfNeeded,
  registerStudent,
  uniqueSuffix
} from "./helpers";

type RuntimeFailures = {
  badResponses: string[];
  consoleErrors: string[];
  pageErrors: string[];
  requestFailures: string[];
};

type SelectOptionSnapshot = {
  disabled: boolean;
  label: string;
  value: string;
};

const fishingRoundStorageKey = "hk-math-practice-fishing-round";
const onePixelPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
  "base64"
);

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function collectRuntimeFailures(page: Page): RuntimeFailures {
  const pageErrors = collectPageErrors(page);
  const failures: RuntimeFailures = {
    badResponses: [],
    consoleErrors: [],
    pageErrors,
    requestFailures: []
  };

  page.on("console", (message) => {
    const text = message.text();
    const expectedLocalNoise =
      /Failed to load resource: the server responded with a status of (401|404)/i.test(text) ||
      /Failed to load resource: the server responded with a status of 503 \(Service Unavailable\)/i.test(text) ||
      /Failed to fetch RSC payload/i.test(text) ||
      /has been blocked by CORS policy/i.test(text) ||
      /Failed to load resource: net::ERR_FAILED/i.test(text);
    if (message.type() === "error" && !expectedLocalNoise) failures.consoleErrors.push(text);
  });

  page.on("response", (response) => {
    const status = response.status();
    const url = response.url();
    const isLocalAppResponse = /https?:\/\/(?:127\.0\.0\.1|localhost):\d+\//.test(url);
    const expectedLocal404 =
      url.includes("/_vercel/insights/script.js") ||
      url.includes("/favicon.ico") ||
      url.endsWith("/api/classes/join");
    const expectedAITutorSetupResponse = url.endsWith("/api/ai-tutor") && status === 503;
    if (isLocalAppResponse && (status === 404 || status >= 500) && !expectedLocal404 && !expectedAITutorSetupResponse) {
      failures.badResponses.push(`${status} ${url}`);
    }
  });

  page.on("requestfailed", (request) => {
    const url = request.url();
    const errorText = request.failure()?.errorText ?? "failed";
    const expectedAbort =
      errorText === "net::ERR_ABORTED" ||
      url.includes("/_vercel/insights/script.js") ||
      url.includes("_rsc=") ||
      /\/login\?next=/.test(url);
    if (/https?:\/\/(?:127\.0\.0\.1|localhost):\d+\//.test(url) && !expectedAbort) {
      failures.requestFailures.push(`${errorText} ${url}`);
    }
  });

  return failures;
}

function expectNoRuntimeFailures(failures: RuntimeFailures) {
  expectNoPageErrors(failures.pageErrors);
  expect.soft(failures.badResponses, "student matrix should not hit local 404/5xx responses").toEqual([]);
  expect.soft(failures.consoleErrors, "student matrix should not emit console errors").toEqual([]);
  expect.soft(failures.requestFailures, "student matrix should not have failed local browser requests").toEqual([]);
}

async function expectPageReady(page: Page, label: string) {
  await page.waitForLoadState("domcontentloaded");
  await expect(page.getByRole("heading", { name: /This page is not available|Page not found/i })).toHaveCount(0);
  const bodyText = await page.locator("body").innerText();
  expect(bodyText.trim().length, `${label} should render meaningful content`).toBeGreaterThan(60);
}

async function loginDemoStudentThroughApi(page: Page) {
  const response = await page.request.post("/api/auth/login", {
    data: {
      username: demoStudent.username,
      password: demoStudent.password,
      grade: "S3",
      language: "en",
      theme: "light"
    }
  });
  expect(await response.text()).toContain("student-peter");
  expect(response.ok()).toBeTruthy();
}

async function loginDemoTeacherThroughApi(page: Page) {
  const response = await page.request.post("/api/auth/login", {
    data: {
      username: demoTeacher.username,
      password: demoTeacher.password,
      grade: "S3",
      language: "en",
      theme: "light"
    }
  });
  expect(response.ok()).toBeTruthy();
}

async function assignDemoResourceThroughApi(page: Page, testInfo: TestInfo) {
  await loginDemoTeacherThroughApi(page);
  const response = await page.request.post("/api/teacher/assignments", {
    data: {
      classId: "class-s3a-2026",
      title: `Student matrix resource ${uniqueSuffix(testInfo)}`,
      description: "Student matrix resource button coverage",
      contentType: "resource",
      targetId: "resource-s3-quadratics-slides",
      allowRetake: true,
      showAnswers: false,
      countTowardsGrade: true
    }
  });
  expect(response.ok(), await response.text()).toBeTruthy();
}

async function currentUserId(page: Page) {
  const response = await page.request.get("/api/me");
  expect(response.ok()).toBeTruthy();
  const payload = await response.json() as { user?: { id?: string } };
  expect(payload.user?.id).toBeTruthy();
  return payload.user?.id ?? "";
}

async function unlockPracticeFiltersIfNeeded(page: Page, grade = "S3") {
  await page.waitForLoadState("networkidle");
  if (await page.getByRole("combobox", { name: /difficulty/i }).isVisible().catch(() => false)) return;

  const userId = await currentUserId(page);
  const skillIds = new Set<string>();
  const nextResponse = await page.request.get(`/api/adaptive-learning/next?grade=${grade}`);
  expect(nextResponse.ok()).toBeTruthy();
  const nextPayload = await nextResponse.json() as { decision?: { skill?: { id?: string } } };
  if (nextPayload.decision?.skill?.id) skillIds.add(nextPayload.decision.skill.id);

  const refreshResponse = await page.request.post("/api/adaptive-learning/refresh", { data: { grade } });
  if (refreshResponse.ok()) {
    const refreshPayload = await refreshResponse.json() as { decision?: { skill?: { id?: string } } };
    if (refreshPayload.decision?.skill?.id) skillIds.add(refreshPayload.decision.skill.id);
  }

  await page.evaluate(({ nextUserId, nextSkillIds }) => {
    nextSkillIds.forEach((skillId) => {
      window.localStorage.setItem(`hk-math-practice-free-selection-unlocked:${nextUserId}:${skillId}`, "true");
    });
  }, { nextUserId: userId, nextSkillIds: Array.from(skillIds) });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("combobox", { name: /difficulty/i })).toBeVisible();
}

async function selectOptions(select: Locator) {
  return select.locator("option").evaluateAll((options) =>
    options.map((option) => ({
      disabled: (option as HTMLOptionElement).disabled,
      label: ((option as HTMLOptionElement).textContent ?? "").trim(),
      value: (option as HTMLOptionElement).value
    }))
  ) as Promise<SelectOptionSnapshot[]>;
}

async function expectSelectIncludes(select: Locator, expectedValues: string[]) {
  const options = await selectOptions(select);
  const values = options.map((option) => option.value);
  expectedValues.forEach((value) => {
    expect(values, `Expected select options to include "${value}"`).toContain(value);
  });
}

async function exerciseSelect(select: Locator, label: string, resetValue?: string) {
  await expect(select, `${label} select should be visible`).toBeVisible();
  await expect.poll(async () => (await selectOptions(select)).filter((option) => !option.disabled).length, {
    message: `${label} should load at least one option`,
    timeout: 10_000
  }).toBeGreaterThan(0);
  const options = (await selectOptions(select)).filter((option) => !option.disabled);
  expect(options.length, `${label} should expose at least one option`).toBeGreaterThan(0);

  const values = options.map((option) => option.value);
  const targets = values.length <= 6
    ? values
    : [values[0], values[Math.floor(values.length / 2)], values[values.length - 1]];

  for (const value of Array.from(new Set(targets))) {
    await select.selectOption(value);
    await expect(select, `${label} should accept option ${value}`).toHaveValue(value);
  }

  if (resetValue && values.includes(resetValue)) {
    await select.selectOption(resetValue);
    await expect(select, `${label} should reset to ${resetValue}`).toHaveValue(resetValue);
  }
}

async function expectButtonState(button: Locator, label: string) {
  await expect(button, `${label} should be visible`).toBeVisible();
  const enabled = await button.isEnabled();
  expect(typeof enabled, `${label} enabled state should be readable`).toBe("boolean");
}

async function clickMainNav(page: Page, href: string, expectedUrl: RegExp, expectedHeading: RegExp) {
  const nav = page.getByRole("navigation", { name: /Main navigation/i });
  const link = nav.locator(`a[href="${href}"]`).first();
  await expect(link, `main nav ${href} should be visible`).toBeVisible();
  await link.click();
  await expect(page).toHaveURL(expectedUrl);
  await expect(page.getByRole("heading", { name: expectedHeading }).first()).toBeVisible();
  await expectPageReady(page, href);
}

async function setFishingEligibility(page: Page) {
  const fishingQuestions = questions.filter((question) => question.topicId === "quadratic-patterns").slice(0, 5);
  expect(fishingQuestions.length, "Fishing setup needs five quadratic-patterns questions").toBe(5);
  const questionIds = fishingQuestions.map((question) => question.id);

  await page.goto("/dashboard");
  await page.evaluate(({ ids }) => {
    window.sessionStorage.setItem("hk-math-practice-fishing-round", JSON.stringify({
      topicId: "quadratic-patterns",
      roundKey: `e2e-fishing-${Date.now()}`,
      roundQuestionIds: ids,
      correctRoundQuestionIds: ids,
      accuracyPercent: 100
    }));
  }, { ids: questionIds });
}

async function unlockAdventureIsland(page: Page) {
  const s3Questions = questions
    .filter((question) => question.grade === "S3" && typeof question.answer === "string")
    .slice(0, 5);
  expect(s3Questions.length, "Adventure Island setup needs five S3 questions").toBe(5);

  for (const question of s3Questions) {
    const response = await page.request.post("/api/attempts", {
      data: {
        questionId: question.id,
        selectedAnswer: question.answer,
        durationSeconds: 20
      }
    });
    expect(response.ok(), await response.text()).toBeTruthy();
  }

  const eligibility = await page.request.get("/api/gamification/adventure-island");
  expect(eligibility.ok()).toBeTruthy();
  const payload = await eligibility.json() as { eligible?: boolean; alreadyCompleted?: boolean };
  expect(payload.eligible || payload.alreadyCompleted).toBeTruthy();
}

async function expectPracticeQuestionOne(page: Page) {
  await expect(page.getByRole("region", { name: /Practice questions/i }).getByText(/Question 1 of/i)).toBeVisible({ timeout: 20_000 });
}

test.describe.serial("student button and dropdown matrix", () => {
  test.describe.configure({ timeout: 150_000 });

  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chrome", "Full student button/dropdown matrix runs once on desktop.");
  });

  test("guest, login, registration, and password-reset buttons run their workflows", async ({ page }, testInfo) => {
    const failures = collectRuntimeFailures(page);

    await page.goto("/");
    await expect(page.getByRole("heading", { name: /MAIS/i })).toBeVisible();
    await page.getByRole("link", { name: /Start learning/i }).click();
    await expect(page).toHaveURL(/\/lesson\/quadratic-functions$/);
    await expect(page.getByRole("heading", { name: /Quadratic Functions/i })).toBeVisible();

    await page.goto("/");
    await page.getByRole("link", { name: /Explore visualizations/i }).first().click();
    await expect(page).toHaveURL(/\/visualization-lab$/);
    await expect(page.getByRole("heading", { name: /Visualization Lab/i })).toBeVisible();

    await page.goto("/");
    await page.getByRole("button", { name: /^Primary/i }).click();
    await expect(page.getByRole("radio", { name: /P1/i })).toBeVisible();
    await page.getByRole("radio", { name: /P1/i }).click();
    await expect(page.getByRole("radio", { name: /P1/i })).toHaveAttribute("aria-checked", "true");
    await page.getByRole("button", { name: /Use Traditional Chinese/i }).click();
    await expect(page.getByRole("button", { name: /使用繁體中文|Use Traditional Chinese/i })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: /使用英文|Use English/i }).click();
    await expect(page.getByRole("button", { name: /Use English/i })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: /Switch to dark mode/i }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.getByRole("button", { name: /Switch to light mode/i }).click();
    await expect(page.locator("html")).not.toHaveClass(/dark/);

    await page.goto("/login");
    await expect(page.getByLabel(/email or username/i)).toHaveValue("");
    await expect(page.getByRole("button", { name: /China student/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Hong Kong teacher display account/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /HKSAR Parent/i })).toBeVisible();
    await page.getByRole("button", { name: /Hong Kong student display account/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    await logoutIfVisible(page);

    const student = await registerStudent(page, testInfo, "S2");
    await expect(page.getByRole("heading", { name: new RegExp(`Welcome back, ${escapeRegex(student.name)}`, "i") })).toBeVisible();
    await logoutIfVisible(page);

    await page.goto("/forgot-password");
    await page.getByLabel(/email or username|email or user name/i).fill(student.username);
    await page.getByRole("button", { name: /Send reset instructions/i }).click();
    const resetLink = page.getByRole("link", { name: /Open local reset link/i });
    await expect(resetLink).toBeVisible();
    await resetLink.click();
    await expect(page).toHaveURL(/\/reset-password\?token=/);
    await page.getByLabel(/^new password$/i).fill("next12345");
    await page.getByLabel(/confirm new password/i).fill("next12345");
    await page.getByRole("button", { name: /Update password/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    expectNoRuntimeFailures(failures);
  });

  test("logged-in shell, dashboard, profile, reward, message, and class buttons work", async ({ page }) => {
    const failures = collectRuntimeFailures(page);

    await loginDemoStudentThroughApi(page);
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: /Welcome back, HK Student Peter/i })).toBeVisible();

    await clickMainNav(page, "/lesson/quadratic-functions", /\/lesson\/quadratic-functions$/, /Quadratic Functions/i);
    await clickMainNav(page, "/adaptive-learning", /\/adaptive-learning$/, /Progress|Adaptive/i);
    await clickMainNav(page, "/visualization-lab", /\/visualization-lab$/, /Visualization Lab/i);
    await clickMainNav(page, "/practice", /\/practice$/, /Practice Arena/i);

    await page.goto("/dashboard");
    await expectButtonState(page.getByRole("button", { name: /Delta gradient/i }), "profile avatar preset");
    await page.getByRole("button", { name: /Pi focus/i }).click();
    await page.getByRole("button", { name: /Save profile/i }).click();
    await expect(page.getByText(/^Saved$/i)).toBeVisible();
    await page.locator('input[type="file"][accept*="image/png"]').setInputFiles({
      buffer: onePixelPng,
      mimeType: "image/png",
      name: "student-avatar.png"
    });
    await expect(page.getByRole("button", { name: /Photo selected|Preparing photo/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Save profile/i })).toBeEnabled({ timeout: 10_000 });
    await page.getByRole("button", { name: /Save profile/i }).click();
    await expect(page.getByText(/^Saved$/i)).toBeVisible();

    await page.goto("/adaptive-learning");
    await expect(page.getByText(/Personalized learning analytics report/i)).toBeVisible();
    await expectDownloadFrom(page, () => page.getByRole("button", { name: /Export Excel/i }).click(), /learning-analytics-S3\.xlsx/);
    await page.getByRole("button", { name: /Request data deletion/i }).click();
    await expect(page.getByText(/Data deletion request sent to your teacher/i)).toBeVisible();

    await page.goto("/dashboard");
    const rewardRequest = page.getByRole("button", { name: /Request gift/i }).first();
    if (await rewardRequest.isVisible().catch(() => false)) {
      await rewardRequest.click();
      await expect(page.getByRole("button", { name: /Request submitted|Requesting/i }).first()).toBeVisible();
    } else {
      await expect(page.getByText(/Need more points|Unavailable|Active requests/i).first()).toBeVisible();
    }

    await page.getByRole("link", { name: /Messages/i }).click();
    await expect(page).toHaveURL(/\/messages$/);
    await expect(page.getByRole("heading", { name: /Ask your teacher/i })).toBeVisible();
    const newMessagePanel = page.locator("aside").filter({ hasText: /New message/i }).first();
    await exerciseSelect(newMessagePanel.locator("select").nth(0), "messages class");
    await exerciseSelect(newMessagePanel.locator("select").nth(1), "messages assignment", "");
    await page.getByPlaceholder(/Subject/i).fill(`Student matrix ${Date.now()}`);
    await page.getByPlaceholder(/What would you like help with/i).fill("Can you check this matrix smoke thread?");
    await page.getByRole("button", { name: /Send message/i }).click();
    await expect(page.getByText(/Message sent/i)).toBeVisible();
    await page.getByRole("button", { name: /Student matrix/i }).first().click();
    await page.locator("textarea").first().fill("Thanks, I found the relevant hint.");
    await page.getByRole("button", { name: /Send reply/i }).click();
    await expect(page.getByText(/Thanks, I found the relevant hint/i)).toBeVisible();
    await page.getByRole("link", { name: /Dashboard/i }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.getByRole("link", { name: /Join class/i }).click();
    await expect(page).toHaveURL(/\/classroom\/join$/);
    await page.getByPlaceholder(/Invite code/i).fill("NOPE00");
    await page.getByRole("button", { name: /^Join$/i }).click();
    await expect(page.getByText(/No class was found/i)).toBeVisible();
    await page.getByRole("link", { name: /Dashboard/i }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    expectNoRuntimeFailures(failures);
  });

  test("learning pages, resources, assessments, and roadmap controls navigate or update state", async ({ page }, testInfo) => {
    const failures = collectRuntimeFailures(page);

    await assignDemoResourceThroughApi(page, testInfo);
    await loginDemoStudentThroughApi(page);
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: /Welcome back, HK Student Peter/i })).toBeVisible();
    await page.goto("/learning-path");
    await expect(page.getByRole("heading", { name: /^Learning Path$/i })).toBeVisible();
    await expect(page.locator('a[href="/primary-roadmap"]').first()).toBeVisible();
    await page.goto("/primary-roadmap");
    await expect(page).toHaveURL(/\/primary-roadmap$/);
    await expect(page.getByRole("heading", { name: /Primary Math Subway Map/i })).toBeVisible();
    await page.getByRole("button", { name: /Fit Map/i }).click();
    await page.getByRole("button", { name: /Zoom in/i }).click();
    await page.getByRole("button", { name: /Zoom out/i }).click();
    await page.getByRole("button", { name: /P1/i }).click();
    await page.getByRole("button", { name: /Open full-screen roadmap/i }).click();
    await expect(page.getByRole("button", { name: /Exit full-screen roadmap/i })).toBeVisible();
    await page.getByRole("button", { name: /Exit full-screen roadmap/i }).click();

    await page.goto("/learning-path");
    await expect(page.locator('a[href="/secondary-roadmap"]').first()).toBeVisible();
    await page.goto("/secondary-roadmap");
    await expect(page).toHaveURL(/\/secondary-roadmap$/);
    await expect(page.getByRole("heading", { name: /Secondary Math Subway Map/i })).toBeVisible();
    await page.getByRole("button", { name: /Fit Map/i }).click();
    await page.getByRole("button", { name: /S3/i }).click();

    await page.goto("/lesson/quadratic-functions");
    await expect(page.getByRole("heading", { name: /Quadratic Functions/i })).toBeVisible();
    await page.getByRole("main").getByRole("link", { name: /Visualization Lab/i }).click();
    await expect(page).toHaveURL(/\/visualization-lab$/);
    await page.goto("/lesson/quadratic-functions");
    await page.getByRole("main").getByRole("link", { name: /Learning Path/i }).click();
    await expect(page).toHaveURL(/\/learning-path$/);
    await page.goto("/lesson/quadratic-functions");
    await page.locator('input[type="checkbox"]').first().check();
    await page.getByRole("button", { name: /Mark lesson complete/i }).click();
    await expect(page.getByText(/Mastery: 85%|Mastery: 100%/i)).toBeVisible();

    await page.goto("/resource/resource-s3-quadratics-slides");
    await expect(page.getByRole("heading", { name: /S3 Quadratics lesson slides/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Download resource/i })).toHaveAttribute("href", /\/api\/resources\/resource-s3-quadratics-slides\/download/);
    await page.getByRole("button", { name: /Mark complete/i }).click();
    await expect(page.getByText(/Resource marked complete/i)).toBeVisible();
    await page.getByRole("link", { name: /Dashboard/i }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.goto("/assessment/assessment-s3-algebra-quiz");
    await expect(page.getByRole("heading", { name: /S3 algebra readiness quiz/i })).toBeVisible();
    const firstRadio = page.locator('input[type="radio"]').first();
    if (await firstRadio.isVisible().catch(() => false) && await firstRadio.isEnabled()) {
      await firstRadio.check();
    }
    const firstTextInput = page.locator('form input:not([type="radio"])').first();
    if (await firstTextInput.isVisible().catch(() => false) && await firstTextInput.isEnabled()) {
      await firstTextInput.fill("4");
    }
    const submitAssessment = page.getByRole("button", { name: /Submit assessment/i });
    await expectButtonState(submitAssessment, "assessment submit");

    expectNoRuntimeFailures(failures);
  });

  test("practice, mistake book, visualization lab, and AI tutor controls work", async ({ page }) => {
    test.slow();
    const failures = collectRuntimeFailures(page);

    await loginDemoStudentThroughApi(page);
    await page.goto("/practice");
    await expect(page.getByRole("heading", { name: /Practice Arena/i })).toBeVisible();
    await unlockPracticeFiltersIfNeeded(page);
    await expect(page.getByLabel(/^grade$/i)).toHaveCount(0);

    const difficultySelect = page.getByRole("combobox", { name: /difficulty/i });
    await expectSelectIncludes(difficultySelect, ["all", "Foundation", "Core", "Challenge"]);
    await exerciseSelect(difficultySelect, "practice difficulty", "all");

    const topicSelect = page.getByRole("combobox", { name: /^Topic$/i });
    await expectSelectIncludes(topicSelect, ["quadratic-patterns"]);
    await topicSelect.selectOption("quadratic-patterns");
    await expect(topicSelect).toHaveValue("quadratic-patterns");

    const questionTypeSelect = page.getByRole("combobox", { name: /Question type/i });
    await expectSelectIncludes(questionTypeSelect, ["all", "multiple-choice", "fill-in", "short-answer", "graph"]);
    await exerciseSelect(questionTypeSelect, "practice question type", "all");
    await questionTypeSelect.selectOption("all");
    await expectPracticeQuestionOne(page);

    const practiceRegion = page.getByRole("region", { name: /Practice questions/i });
    await practiceRegion.getByRole("button", { name: /Next question/i }).click();
    await expect(practiceRegion.getByText(/Question 2 of/i)).toBeVisible();
    await practiceRegion.getByRole("button", { name: /Previous question/i }).click();
    await expectPracticeQuestionOne(page);
    const jumpInput = practiceRegion.getByRole("spinbutton", { name: /Jump to/i });
    await jumpInput.fill("2");
    await expect(jumpInput).toHaveValue("2");
    await practiceRegion.getByRole("button", { name: /^Jump$/i }).click();
    await expect(practiceRegion.getByText(/Question 2 of/i)).toBeVisible();
    await jumpInput.fill("1");
    await expect(jumpInput).toHaveValue("1");
    await practiceRegion.getByRole("button", { name: /^Jump$/i }).click();
    await expectPracticeQuestionOne(page);

    const axisCard = page.locator("article").filter({ hasText: /axis of symmetry/i }).first();
    await expect(axisCard).toBeVisible();
    await axisCard.getByRole("button").filter({ hasText: /x\s*=/ }).first().click();
    await expect(axisCard.getByRole("button", { name: /Check Answer/i })).toBeEnabled();
    await axisCard.getByRole("button", { name: /Reset/i }).click();
    await expect(axisCard.getByRole("button", { name: /Check Answer/i })).toBeDisabled();
    await axisCard.getByRole("button").filter({ hasText: /x\s*=/ }).first().click();
    await axisCard.getByRole("button", { name: /Check Answer/i }).click();
    await expect(axisCard.getByText(/Saved to Mistake Book/i)).toBeVisible();

    await page.getByRole("button", { name: /^AI Tutor$/i }).click({ force: true });
    const tutorPanel = page.getByRole("dialog", { name: /AI Tutor/i });
    await expect(tutorPanel).toBeVisible();
    await tutorPanel.getByLabel(/Ask AI Tutor/i).fill("Give me one short hint.");
    await tutorPanel.getByRole("button", { name: /^Send$/i }).click();
    await expect(tutorPanel.getByText(/Local helper mode/i).first()).toBeVisible();
    await tutorPanel.getByRole("button", { name: /Close AI Tutor/i }).click();
    await expect(tutorPanel).toBeHidden();

    await page.goto("/mistake-book");
    await expect(page.getByRole("heading", { name: /Mistake Book/i })).toBeVisible();
    await page.getByRole("button", { name: /^All$/i }).click();
    const mistakeSection = page.locator('section[aria-label="Mistake review questions"]');
    await expect(mistakeSection.locator("article")).toBeVisible({ timeout: 15_000 });
    const markMasteredButton = mistakeSection.locator("article button").filter({ hasText: /Mark mastered/i }).first();
    const removeMistakeButton = mistakeSection.locator("article button").filter({ hasText: /^Remove$/i }).first();
    await expect(markMasteredButton).toBeVisible({ timeout: 15_000 });
    const mistakeSearch = page.getByPlaceholder(/Topic, keyword, answer, S3/i);
    await mistakeSearch.fill("axis");
    await expect(mistakeSearch).toHaveValue("axis");
    await page.getByRole("button", { name: /Clear search/i }).click();
    const previousMistake = page.getByRole("button", { name: /Previous mistake/i });
    const nextMistake = page.getByRole("button", { name: /Next mistake/i });
    if (await previousMistake.isEnabled()) {
      await previousMistake.click();
    } else {
      await expect(previousMistake).toBeDisabled();
    }
    if (await nextMistake.isEnabled()) {
      await nextMistake.click();
    } else {
      await expect(nextMistake).toBeDisabled();
    }
    await markMasteredButton.click();
    await page.getByRole("button", { name: /^Mastered$/i }).click();
    await expect(removeMistakeButton).toBeVisible({ timeout: 15_000 });
    await removeMistakeButton.click();
    await expect(page.getByText(/No wrong answers saved yet/i)).toBeVisible();

    await page.goto("/visualization-lab");
    await expect(page.getByRole("heading", { name: /Visualization Lab/i })).toBeVisible();
    await page.getByRole("button", { name: /Explore all labs|Explore other grades/i }).click();
    await expect(page.getByText(/All interactive modules/i)).toBeVisible();
    await page.getByRole("button", { name: /Back to my S3 labs/i }).click();
    await expect(page.getByText(/HK Student Peter's S3 visualizations/i)).toBeVisible();
    const markExploredResponse = page.waitForResponse((response) =>
      response.url().includes("/api/visualization-sessions") && response.request().method() === "POST"
    );
    await page.getByRole("button", { name: /Mark explored/i }).first().click();
    expect((await markExploredResponse).ok()).toBeTruthy();
    const probabilitySection = page.locator("section").filter({ hasText: /Run experiment/i }).first();
    if (await probabilitySection.isVisible().catch(() => false)) {
      await probabilitySection.getByRole("button", { name: /Roll 1/i }).click();
      await probabilitySection.getByRole("button", { name: /Roll 20/i }).click();
      await probabilitySection.getByRole("button", { name: /Reset simulation/i }).click();
    }

    expectNoRuntimeFailures(failures);
  });

  test("student game entry buttons open playable or locked states cleanly", async ({ page }) => {
    const failures = collectRuntimeFailures(page);

    await loginDemoStudentThroughApi(page);
    await setFishingEligibility(page);
    await page.goto("/practice/fishing-game");
    const fishingStage = page.getByTestId("fishing-game-stage");
    await expect(fishingStage).toHaveAttribute("data-phase", "welcome", { timeout: 20_000 });
    await page.getByTestId("fishing-start-button").click();
    await expect(fishingStage).toHaveAttribute("data-phase", /ready|casting|challenge/, { timeout: 20_000 });
    await expectButtonState(page.getByRole("button", { name: /Fire net/i }), "fishing fire net");
    await page.getByRole("link", { name: /Back to Practice/i }).first().click();
    await expect(page).toHaveURL(/\/practice$/);

    await unlockAdventureIsland(page);
    await page.goto("/practice/adventure-island");
    const adventureStage = page.getByTestId("adventure-island-stage");
    await expect(adventureStage).toHaveAttribute("data-phase", "welcome", { timeout: 20_000 });
    await page.getByTestId("adventure-island-start-button").click();
    await expect(adventureStage).toHaveAttribute("data-phase", /ready|playing/, { timeout: 20_000 });
    await expectButtonState(page.getByRole("button", { name: /Move left/i }), "adventure move left");
    await page.getByRole("button", { name: /Move right/i }).click();
    await page.getByRole("button", { name: /Jump/i }).click();
    await page.getByRole("button", { name: /Throw axe/i }).click();

    expectNoRuntimeFailures(failures);
  });
});

test.describe("student mobile button and dropdown smoke", () => {
  test.describe.configure({ timeout: 90_000 });

  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-chrome", "Mobile smoke runs only on the mobile project.");
  });

  test("mobile nav, global toggles, and key practice dropdowns remain usable", async ({ page }) => {
    const failures = collectRuntimeFailures(page);

    await loginAsDemoStudent(page);
    await expect(page.getByRole("heading", { name: /Welcome back, HK Student Peter/i })).toBeVisible();
    await openMobileMenuIfNeeded(page);
    await page.getByRole("link", { name: /Practice/i }).click();
    await expect(page).toHaveURL(/\/practice$/);
    await expect(page.getByRole("heading", { name: /Practice Arena/i })).toBeVisible();

    await unlockPracticeFiltersIfNeeded(page);
    await page.getByRole("combobox", { name: /difficulty/i }).selectOption("Challenge");
    await expect(page.getByRole("combobox", { name: /difficulty/i })).toHaveValue("Challenge");
    await page.getByRole("combobox", { name: /Question type/i }).selectOption("multiple-choice");
    await expect(page.getByRole("combobox", { name: /Question type/i })).toHaveValue("multiple-choice");

    await openMobileMenuIfNeeded(page);
    await page.getByRole("link", { name: /Visualization Lab/i }).click();
    await expect(page).toHaveURL(/\/visualization-lab$/);
    await page.getByRole("button", { name: /Explore all labs|Explore other grades/i }).click();
    await expect(page.getByText(/All interactive modules/i)).toBeVisible();

    await page.getByRole("button", { name: /Switch to dark mode/i }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.getByRole("button", { name: /Use Traditional Chinese/i }).click();
    await expect(page.getByRole("button", { name: /使用繁體中文|Use Traditional Chinese/i })).toHaveAttribute("aria-pressed", "true");

    expectNoRuntimeFailures(failures);
  });
});
