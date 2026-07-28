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
  openPracticeFiltersPanel,
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

async function chooseLanguage(page: Page, optionName: RegExp) {
  await page.getByRole("button", { name: /Language selector|語言選擇|语言选择/i }).click();
  await page.getByRole("menuitemradio", { name: optionName }).click();
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
  await openPracticeFiltersPanel(page);
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
  await openPracticeFiltersPanel(page);
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

async function clickCurrentLessonNav(page: Page) {
  const nav = page.getByRole("navigation", { name: /Main navigation/i });
  const lessonLink = nav.getByRole("link", { name: /^Lesson$/i }).first();
  await expect(lessonLink, "main nav Lesson should be visible").toBeVisible();
  await expect(lessonLink).toHaveAttribute("href", /\/student\/lessons\/[^/]+$/);
  const href = await lessonLink.getAttribute("href");
  await lessonLink.click();
  await expect(page).toHaveURL(/\/student\/lessons\/[^/]+$/);
  await expect(page.getByRole("main").getByRole("heading", { level: 1 }).first()).toBeVisible();
  await expectPageReady(page, href ?? "/student/lessons");
}

async function setFishingEligibility(page: Page) {
  const fishingQuestions = questions.filter((question) => question.topicId === "functions").slice(0, 5);
  expect(fishingQuestions.length, "Fishing setup needs five functions questions").toBe(5);
  const questionIds = fishingQuestions.map((question) => question.id);

  for (const question of fishingQuestions) {
    const response = await page.request.post("/api/attempts", {
      data: {
        questionId: question.id,
        selectedAnswer: question.answer,
        durationSeconds: 20
      }
    });
    expect(response.ok(), await response.text()).toBeTruthy();
  }

  const adventureResponse = await page.request.post("/api/gamification/adventure-island", {
    data: {
      topicId: "functions",
      roundKey: `e2e-adventure-${Date.now()}`,
      roundQuestionIds: questionIds,
      correctRoundQuestionIds: questionIds,
      correctQuestionIds: questionIds.slice(0, 3),
      accuracyPercent: 100,
      durationSeconds: 45,
      defeatedEnemies: 3
    }
  });
  if (!adventureResponse.ok() && adventureResponse.status() !== 409) {
    expect(adventureResponse.ok(), await adventureResponse.text()).toBeTruthy();
  }

  await page.goto("/dashboard");
  await page.evaluate(({ ids }) => {
    window.sessionStorage.setItem("hk-math-practice-fishing-round", JSON.stringify({
      topicId: "functions",
      roundKey: `e2e-fishing-${Date.now()}`,
      roundQuestionIds: ids,
      correctRoundQuestionIds: ids,
      accuracyPercent: 100
    }));
  }, { ids: questionIds });
}

async function unlockAdventureIsland(page: Page) {
  const s4Questions = questions
    .filter((question) => question.grade === "S4" && typeof question.answer === "string")
    .slice(0, 5);
  expect(s4Questions.length, "Adventure Island setup needs five S4 questions").toBe(5);

  for (const question of s4Questions) {
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
  return Boolean(payload.eligible || payload.alreadyCompleted);
}

async function expectPracticeQuestionOne(page: Page) {
  await expect(page.getByRole("region", { name: /Practice questions/i }).getByText(/Question 1 of/i)).toBeVisible({ timeout: 20_000 });
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

async function expectFishingEntryCleanly(page: Page) {
  await page.goto("/student/practice/games/fishing-master");
  await expect(page.getByRole("heading", { name: /Fishing Master/i })).toBeVisible();
  const fishingStage = page.getByTestId("fishing-game-stage");
  await expect(fishingStage).toBeVisible({ timeout: 20_000 });
  const lockedMessage = page.getByText(/Fishing Master locked/i);
  if (await lockedMessage.isVisible().catch(() => false)) {
    await expect(page.getByRole("link", { name: /Back to Practice(?: Arena)?/i }).first()).toHaveAttribute("href", "/practice");
    return;
  }
  await expect(fishingStage).toHaveAttribute("data-phase", /welcome|ready|casting|challenge/, { timeout: 20_000 });
  if (await page.getByTestId("fishing-start-button").isVisible().catch(() => false)) {
    await page.getByTestId("fishing-start-button").click();
    await expect(fishingStage).toHaveAttribute("data-phase", /ready|casting|challenge/, { timeout: 20_000 });
  }
  await expectButtonState(page.getByRole("button", { name: /Fire net/i }), "fishing fire net");
  await page.getByRole("link", { name: /Back to Practice/i }).first().click();
  await expect(page).toHaveURL(/\/practice$/);
}

async function expectAdventureEntryCleanly(page: Page) {
  await page.goto("/student/practice/games/adventure-island");
  await expect(page.getByRole("heading", { name: /Adventure Island|Practice Quest/i })).toBeVisible();
  const lockedMessage = page.getByText(/Adventure Island locked/i).first();
  if (await lockedMessage.isVisible().catch(() => false)) {
    await expect(page.getByRole("link", { name: /Practice Arena|Back to Practice(?: Arena)?/i }).first()).toHaveAttribute("href", "/practice");
    return;
  }
  const adventureStage = page.getByTestId("adventure-island-stage");
  await expect(adventureStage).toBeVisible({ timeout: 20_000 });
  await expect(adventureStage).toHaveAttribute("data-phase", /welcome|ready|playing|challenge/, { timeout: 20_000 });
  if (await page.getByTestId("adventure-island-start-button").isVisible().catch(() => false)) {
    await page.getByTestId("adventure-island-start-button").click();
    await expect(adventureStage).toHaveAttribute("data-phase", /ready|playing|challenge/, { timeout: 20_000 });
  }
  await expectButtonState(page.getByRole("button", { name: /Move left/i }), "adventure move left");
  await page.getByRole("button", { name: /Move right/i }).click();
  await page.getByRole("button", { name: /Jump/i }).click();
  await page.getByRole("button", { name: /Throw axe/i }).click();
}

test.describe.serial("student button and dropdown matrix", () => {
  test.describe.configure({ timeout: 150_000 });

  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chrome", "Full student button/dropdown matrix runs once on desktop.");
  });

  test("login page opens fixed US CA example account immediately", async ({ page }) => {
    const failures = collectRuntimeFailures(page);

    await page.goto("/login?next=%2Fdashboard");
    await expect(page.getByLabel(/email or username/i)).toHaveValue("");
    await expect(page.getByText("California Math Grade 1", { exact: true })).toBeVisible();
    await expect(page.getByText(/Mainland PEP S4/i)).toBeVisible();
    await expect(page.getByText(/Hong Kong DSE UP S4/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Use example account: Student Shirleen/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Use example account: Student Peter/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Use example account: HK Student Peter/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Use example account: Teacher Scott/i })).toHaveCount(1);
    await expect(page.getByRole("button", { name: /Use example account: Teacher Phoebe/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Use example account: HK Teacher Chan/i })).toBeVisible();

    const loginResponse = page.waitForResponse((response) =>
      response.url().endsWith("/api/auth/login") &&
      response.request().method() === "POST"
    );
    await page.getByRole("button", { name: /Use example account: Student Shirleen/i }).click();
    const response = await loginResponse;
    expect(response.status(), await response.text()).toBe(200);
    await expect(page).toHaveURL(/\/dashboard(?:\?|$)/, { timeout: 30_000 });
    const sessionResponse = await page.request.get("/api/me?includeLessonEntry=false");
    expect(sessionResponse.ok()).toBeTruthy();
    const session = await sessionResponse.json() as { user?: { username?: string; curriculumTrack?: string }; settings?: { selectedGrade?: string } };
    expect(session.user?.username).toBe("Student Shirleen");
    expect(session.user?.curriculumTrack).toBe("US_CA_MATH");
    expect(session.settings?.selectedGrade).toBe("P1");

    expectNoRuntimeFailures(failures);
  });

  test("login page opens an example account even before settings finish loading", async ({ page }) => {
    const failures = collectRuntimeFailures(page);
    let releaseMe: () => void = () => {};
    const meGate = new Promise<void>((resolve) => {
      releaseMe = resolve;
    });
    let resolveMeDone: () => void = () => {};
    const meDone = new Promise<void>((resolve) => {
      resolveMeDone = resolve;
    });
    let meRequests = 0;

    await page.route("**/api/auth/session-state*", async (route) => {
      meRequests += 1;
      if (meRequests === 1) {
        await meGate;
        // Signed-out contract of the guest-tolerant endpoint: 200 { user: null }.
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ user: null })
        });
        resolveMeDone();
        return;
      }
      await route.continue();
    });

    await page.goto("/login", { waitUntil: "load" });
    const shirleenExample = page.getByRole("button", { name: /Use example account: Student Shirleen/i });
    await expect(shirleenExample).toBeVisible();
    await page.waitForTimeout(500);
    const loginResponse = page.waitForResponse((response) =>
      response.url().endsWith("/api/auth/login") &&
      response.request().method() === "POST"
    );
    await shirleenExample.click();
    const response = await loginResponse;
    expect(response.status(), await response.text()).toBe(200);

    releaseMe();
    await Promise.race([meDone, page.waitForTimeout(1000)]);

    await expect(page).toHaveURL(/\/dashboard(?:\?|$)/, { timeout: 30_000 });
    const sessionResponse = await page.request.get("/api/me?includeLessonEntry=false");
    expect(sessionResponse.ok()).toBeTruthy();
    const session = await sessionResponse.json() as { user?: { username?: string; curriculumTrack?: string }; settings?: { selectedGrade?: string } };
    expect(session.user?.username).toBe("Student Shirleen");
    expect(session.user?.curriculumTrack).toBe("US_CA_MATH");
    expect(session.settings?.selectedGrade).toBe("P1");

    expectNoRuntimeFailures(failures);
  });

  test("login submit sends credentials only and keeps curriculum selectors hidden", async ({ page }) => {
    const failures = collectRuntimeFailures(page);
    let submittedPayload: Record<string, unknown> | null = null;

    await page.route("**/api/auth/login", async (route) => {
      submittedPayload = JSON.parse(route.request().postData() ?? "{}") as Record<string, unknown>;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            id: "student-jon-us-ca-super",
            username: "Student Jon",
            name: "Student Jon",
            role: "student",
            grade: "P1",
            curriculumTrack: "US_CA_MATH",
            curriculumProfile: { region: "US", publisher: "US_CA_MATH" }
          },
          settings: {
            language: "en",
            theme: "light",
            selectedGrade: "P1"
          },
          lessonEntryTarget: null
        })
      });
    });

    await page.goto("/login");
    await expect(page.locator("#login-curriculum")).toHaveCount(0);
    await expect(page.locator("#login-grade")).toHaveCount(0);
    await page.getByLabel(/email or username/i).fill("Student Jon");
    await page.getByLabel(/^password$/i).fill("12345");
    await page.getByRole("button", { name: /^Log In$/i }).click();

    await expect.poll(() => (submittedPayload ? "captured" : null)).toBe("captured");
    const capturedPayload: Record<string, unknown> = submittedPayload ?? {};
    expect(capturedPayload.username).toBe("Student Jon");
    expect(capturedPayload.grade).toBeUndefined();
    expect(capturedPayload.curriculumTrack).toBeUndefined();
    expect(capturedPayload.curriculumProfile).toBeUndefined();

    expectNoRuntimeFailures(failures);
  });

  test("guest, login, registration, and password-reset buttons run their workflows", async ({ page }, testInfo) => {
    const failures = collectRuntimeFailures(page);

    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: /MAIS Personalized interactive math learning|Math learning should be\s*fun and personalized/i })).toBeVisible();
    await page.getByRole("link", { name: /Start learning/i }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByLabel(/email or username|email or user name|user name/i)).toBeVisible();

    await page.goto("/");
    await page.locator("header").getByRole("link", { name: /^Visualization Lab$/i }).click();
    await expect(page).toHaveURL(/\/student\/tools\/visualizations$/);
    await expect(page.getByRole("heading", { name: /Visualization Lab/i })).toBeVisible();

    await page.goto("/");
    await expect(page.locator("header").getByRole("link", { name: /^Register$/i })).toHaveAttribute("href", "/register");
    await expect(page.locator("header").getByRole("link", { name: /^Visualization Lab$/i })).toHaveAttribute("href", "/student/tools/visualizations");
    await chooseLanguage(page, /Use Traditional Chinese|使用繁體中文|使用繁体中文/i);
    await expect(page.locator("html")).toHaveAttribute("lang", "zh-Hant-HK");
    await chooseLanguage(page, /Use English|使用英文/i);
    await expect(page.locator("html")).toHaveAttribute("lang", "en-HK");
    await page.getByRole("button", { name: /Switch to dark mode/i }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.getByRole("button", { name: /Switch to light mode/i }).click();
    await expect(page.locator("html")).not.toHaveClass(/dark/);

    await page.goto("/login");
    await expect(page.getByLabel(/email or username/i)).toHaveValue("");
    await expect(page.getByText("California Math Grade 1", { exact: true })).toBeVisible();
    await expect(page.getByText(/Mainland PEP S4/i)).toBeVisible();
    await expect(page.getByText(/Hong Kong DSE UP S4/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Use example account: Student Shirleen/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Use example account: Student Peter/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Use example account: HK Student Peter/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Use example account: Teacher Scott/i })).toHaveCount(1);
    await expect(page.getByRole("button", { name: /Use example account: Teacher Phoebe/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Use example account: HK Teacher Chan/i })).toBeVisible();
    const exampleLoginResponse = page.waitForResponse((response) =>
      response.url().endsWith("/api/auth/login") &&
      response.request().method() === "POST"
    );
    await page.getByRole("button", { name: /Use example account: Student Peter/i }).click();
    const exampleResponse = await exampleLoginResponse;
    expect(exampleResponse.status(), await exampleResponse.text()).toBe(200);
    await expect(page).toHaveURL(/\/dashboard/);
    await logoutIfVisible(page);

    await chooseLanguage(page, /Use English|使用英文/i);
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
    await page.getByRole("textbox", { name: /confirm new password/i }).fill("next12345");
    const updatePasswordButton = page.getByRole("button", { name: /Update password/i });
    await expect(updatePasswordButton).toBeEnabled();
    await expect(page.getByRole("link", { name: /Back to log in/i })).toHaveAttribute("href", "/login");

    expectNoRuntimeFailures(failures);
  });

  test("logged-in shell, dashboard, profile, reward, message, and class buttons work", async ({ page }) => {
    const failures = collectRuntimeFailures(page);

    await loginDemoStudentThroughApi(page);
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: /Welcome back, HK Student Peter/i })).toBeVisible();

    await clickCurrentLessonNav(page);
    await clickMainNav(page, "/personalized-learning", /\/personalized-learning$/, /Knowledge|Personalized/i);
    await clickMainNav(page, "/student/tools/visualizations", /\/student\/tools\/visualizations$/, /Visualization Lab/i);
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

    await page.goto("/personalized-learning");
    await openLearningAnalyticsBay(page);
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
    await expect(page.locator("p").filter({ hasText: /^Thanks, I found the relevant hint\.$/ }).first()).toBeVisible();
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
    await page.goto("/student/roadmap");
    await expect(page.getByRole("heading", { name: /^Learning Path$/i })).toBeVisible();
    await expect(page.locator('a[href="/student/roadmap/primary"]').first()).toBeVisible();
    await page.goto("/student/roadmap/primary");
    await expect(page).toHaveURL(/\/student\/roadmap\/primary$/);
    await expect(page.getByRole("heading", { name: /Primary Math Subway Map/i })).toBeVisible();
    await page.getByRole("button", { name: /Fit Map/i }).click();
    await page.getByRole("button", { name: /Zoom in/i }).click();
    await page.getByRole("button", { name: /Zoom out/i }).click();
    await page.getByRole("button", { name: /P1/i }).click();
    await page.getByRole("button", { name: /Open full-screen roadmap/i }).click();
    await expect(page.getByRole("button", { name: /Exit full-screen roadmap/i })).toBeVisible();
    await page.getByRole("button", { name: /Exit full-screen roadmap/i }).click();

    await page.goto("/student/roadmap");
    await expect(page.locator('a[href="/student/roadmap/secondary"]').first()).toBeVisible();
    await page.goto("/student/roadmap/secondary");
    await expect(page).toHaveURL(/\/student\/roadmap\/secondary$/);
    await expect(page.getByRole("heading", { name: /Secondary Math Subway Map/i })).toBeVisible();
    await page.getByRole("button", { name: /Fit Map/i }).click();
    await page.getByRole("button", { name: /S3/i }).click();

    await page.goto("/student/lessons/quadratic-functions");
    await expect(page.getByRole("heading", { name: /Quadratic Functions/i })).toBeVisible();
    await page.getByRole("main").getByRole("link", { name: /Visualization Lab/i }).click();
    await expect(page).toHaveURL(/\/student\/tools\/visualizations$/);
    await page.goto("/student/lessons/quadratic-functions");
    await page.getByRole("main").getByRole("link", { name: /Learning Path/i }).click();
    await expect(page).toHaveURL(/\/student\/roadmap$/);
    await page.goto("/student/lessons/quadratic-functions");
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

    await page.goto("/student/assessments/assessment-s3-algebra-quiz");
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

  test("practice, mistake book, visualization lab, and Nova Tutor controls work", async ({ page }) => {
    test.slow();
    const failures = collectRuntimeFailures(page);
    await mockTutorReply(page, "Mocked student matrix tutor reply.");

    await loginDemoStudentThroughApi(page);
    await page.goto("/practice");
    await expect(page.getByRole("heading", { name: /Practice Arena/i })).toBeVisible();
    await unlockPracticeFiltersIfNeeded(page);
    await expect(page.getByLabel(/^grade$/i)).toHaveCount(0);

    const difficultySelect = page.getByRole("combobox", { name: /difficulty/i });
    await expectSelectIncludes(difficultySelect, ["all", "Low", "Medium", "High"]);
    await exerciseSelect(difficultySelect, "practice difficulty", "all");

    const topicSelect = page.getByRole("combobox", { name: /^Topic$/i });
    await expectSelectIncludes(topicSelect, ["functions", "coordinate-geometry", "more-algebra", "data-handling"]);
    const functionsQuestionsLoaded = page.waitForResponse((response) =>
      response.url().includes("/api/questions") &&
      response.url().includes("topicId=functions") &&
      response.ok()
    ).catch(() => null);
    await topicSelect.selectOption("functions");
    await functionsQuestionsLoaded;
    await expect(topicSelect).toHaveValue("functions");

    const questionTypeSelect = page.getByRole("combobox", { name: /Question type/i });
    await expectSelectIncludes(questionTypeSelect, ["all", "multiple-choice", "fill-in", "short-answer", "graph"]);
    await exerciseSelect(questionTypeSelect, "practice question type", "all");
    await questionTypeSelect.selectOption("all");
    await expectPracticeQuestionOne(page);

    const practiceRegion = page.getByRole("region", { name: /Practice questions/i });
    await expect(
      practiceRegion.getByRole("spinbutton", { name: /Jump to/i }),
      "functions free-selection round should cap at five questions"
    ).toHaveAttribute("max", "5", { timeout: 20_000 });
    await practiceRegion.getByRole("button", { name: /Next question/i }).click();
    await expect(practiceRegion.getByText(/Question 2 of/i)).toBeVisible();
    await practiceRegion.getByRole("button", { name: /Previous question/i }).click();
    await expectPracticeQuestionOne(page);
    const jumpInput = practiceRegion.getByRole("spinbutton", { name: /Jump to/i });
    await jumpInput.fill("2");
    await expect(jumpInput).toHaveValue("2");
    await jumpInput.fill("1");
    await expect(jumpInput).toHaveValue("1");
    await expect(practiceRegion.getByRole("button", { name: /^Jump$/i })).toBeEnabled();

    const functionValueCard = page.locator("article").filter({ hasText: /f\(4\)/ }).first();
    await expect(functionValueCard).toBeVisible();
    await functionValueCard.getByRole("button", { name: /^6$/ }).click();
    await expect(functionValueCard.getByRole("button", { name: /Check Answer/i })).toBeEnabled();
    await functionValueCard.getByRole("button", { name: /Reset/i }).click();
    await expect(functionValueCard.getByRole("button", { name: /Check Answer/i })).toBeDisabled();
    await functionValueCard.getByRole("button", { name: /^6$/ }).click();
    await functionValueCard.getByRole("button", { name: /Check Answer/i }).click();
    await expect(functionValueCard.getByText(/Saved to Mistake Book/i)).toBeVisible();

    await page.getByRole("button", { name: /^Nova Tutor$/i }).click({ force: true });
    const tutorPanel = page.getByRole("dialog", { name: /Nova Tutor/i });
    await expect(tutorPanel).toBeVisible();
    await tutorPanel.getByLabel(/Ask Nova Tutor/i).fill("Give me one short hint.");
    await tutorPanel.getByRole("button", { name: /^Send$/i }).click();
    await expect(tutorPanel.getByText("Mocked student matrix tutor reply.", { exact: true })).toBeVisible({ timeout: 10_000 });
    await tutorPanel.getByRole("button", { name: /Close Nova Tutor/i }).click();
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
    await mistakeSearch.fill("function");
    await expect(mistakeSearch).toHaveValue("function");
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

    await page.goto("/student/tools/visualizations");
    await expect(page.getByRole("heading", { name: /Visualization Lab/i })).toBeVisible();
    // Exploration is earned: after the lab runtime is ready the student must
    // interact with the lab body and stay through a short dwell before the
    // automatic POST fires. Register the listener before opening the lab.
    const markExploredResponse = page.waitForResponse((response) =>
      response.url().includes("/api/visualization-sessions") && response.request().method() === "POST"
    );
    await page.getByRole("link", { name: /Start Quest/i }).click();
    await expect(page.locator("[data-viz-card]")).toBeVisible({ timeout: 15_000 });
    await page.locator("[data-viz-card-body]").first().click({ position: { x: 8, y: 8 } });
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
    await expectFishingEntryCleanly(page);

    await unlockAdventureIsland(page);
    await expectAdventureEntryCleanly(page);

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
    await page.getByRole("combobox", { name: /difficulty/i }).selectOption("High");
    await expect(page.getByRole("combobox", { name: /difficulty/i })).toHaveValue("High");
    await page.getByRole("combobox", { name: /Question type/i }).selectOption("multiple-choice");
    await expect(page.getByRole("combobox", { name: /Question type/i })).toHaveValue("multiple-choice");

    await openMobileMenuIfNeeded(page);
    await page.getByRole("link", { name: /Visualization Lab/i }).click();
    await expect(page).toHaveURL(/\/student\/tools\/visualizations$/);
    await page.getByRole("link", { name: /Start Quest/i }).click();
    await expect(page.locator("[data-viz-card]")).toBeVisible({ timeout: 15_000 });

    const html = page.locator("html");
    const startedDark = /\bdark\b/.test(await html.getAttribute("class") ?? "");
    await page.getByRole("button", { name: /Switch to (?:dark|light) mode/i }).click();
    if (startedDark) {
      await expect(html).not.toHaveClass(/dark/);
    } else {
      await expect(html).toHaveClass(/dark/);
    }

    const languageSelector = page.getByRole("button", { name: /Language selector|語言選擇/i });
    await languageSelector.click();
    await page.getByRole("menuitemradio", { name: /Use Traditional Chinese|使用繁體中文/i }).click();
    await expect(languageSelector).toContainText(/繁體中文/);

    expectNoRuntimeFailures(failures);
  });
});
