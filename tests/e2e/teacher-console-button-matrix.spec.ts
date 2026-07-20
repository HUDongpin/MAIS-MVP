import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  authenticateAsDemoStudent,
  authenticateAsTeacher,
  collectPageErrors,
  demoStudent,
  expectDownloadFrom,
  expectNoPageErrors,
  fixturePath,
  loginAsTeacher,
  uniqueSuffix
} from "./helpers";

type TeacherNavItem = {
  label: string;
  path: string;
  heading: RegExp;
};

const teacherNavItems: TeacherNavItem[] = [
  { label: "Overview", path: "/teacher/dashboard", heading: /Today.?s teaching queue/i },
  { label: "Classes", path: "/teacher/classes", heading: /Class and student management/i },
  { label: "Analytics", path: "/teacher/analytics", heading: /Class insight and intervention/i },
  { label: "Rewards", path: "/teacher/rewards", heading: /Rewards and gift redemptions/i },
  { label: "Live", path: "/teacher/classroom-sessions", heading: /S3A quadratic checkpoint|Start a classroom check/i },
  { label: "Assignments", path: "/teacher/assignments", heading: /Assignment distribution/i },
  { label: "Resources", path: "/teacher/resources", heading: /Teaching resources and papers/i },
  { label: "Assessments", path: "/teacher/assessments", heading: /Quiz, test, and mock exam management/i },
  { label: "Reports", path: "/teacher/reports", heading: /Bilingual learning reports/i },
  { label: "Inbox", path: "/teacher/communications/inbox", heading: /^Inbox$/i },
  { label: "Lesson kits", path: "/teacher/lesson-kits", heading: /Lesson Kit Center/i },
  { label: "School admin", path: "/teacher/operations/notices", heading: /Teacher operations|S1 Foundation Group|S3A Mathematics/i }
];

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function teacherNav(page: Page) {
  return page.getByRole("navigation", { name: /Teacher navigation/i });
}

function navLink(page: Page, label: string) {
  return teacherNav(page).getByRole("link", { name: new RegExp(`^${escapeRegex(label)}$`, "i") });
}

async function clickTeacherNav(page: Page, item: TeacherNavItem) {
  await expect(teacherNav(page)).toBeVisible();
  await navLink(page, item.label).click();
  await expect(page).toHaveURL(new RegExp(`${escapeRegex(item.path)}(?:[?#].*)?$`));
  await expect(navLink(page, item.label)).toHaveAttribute("aria-current", "page");
}

async function expectTeacherPageReady(page: Page, item: TeacherNavItem) {
  await expect(page.getByRole("heading", { name: item.heading }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: /This page is not available|Page not found/i })).toHaveCount(0);
  const mainText = await page.locator("main").innerText();
  expect(mainText.trim().length, `${item.label} should render meaningful main content`).toBeGreaterThan(60);
}

async function logoutThroughApi(page: Page) {
  const response = await page.request.post("/api/auth/logout");
  expect(response.ok()).toBeTruthy();
}

async function expectSelectHasOptions(select: Locator, expectedValues: string[]) {
  const optionValues = await select.locator("option").evaluateAll((options) =>
    options.map((option) => (option as HTMLOptionElement).value)
  );
  expectedValues.forEach((value) => {
    expect(optionValues, `Expected select to include option value "${value}"`).toContain(value);
  });
}

async function expectSelectHasLabel(select: Locator, labelPattern: RegExp) {
  const optionText = await select.locator("option").evaluateAll((options) =>
    options.map((option) => (option.textContent ?? "").trim()).join("\n")
  );
  expect(optionText).toMatch(labelPattern);
}

async function expectBackToTopWorks(page: Page) {
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const backToTop = page.getByRole("button", { name: /Back to top/i });
  await expect(backToTop).toBeVisible();
  await backToTop.click();
  await page.waitForFunction(() => window.scrollY < 80, null, { timeout: 5000 });
}

test.describe("teacher console button matrix", () => {
  test.describe.configure({ timeout: 90_000 });

  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chrome", "Full teacher console matrix runs on desktop; mobile has a smoke pass.");
  });

  test("teacher area enforces guest, student, and teacher role routing", async ({ page }) => {
    const pageErrors = collectPageErrors(page);

    await page.goto("/teacher/dashboard");
    await expect(page).toHaveURL(/\/login\?next=(?:%2Fteacher%2Fdashboard|\/teacher\/dashboard)/);

    await authenticateAsDemoStudent(page);
    await page.goto("/teacher/dashboard");
    // A teacher URL must never serve another account's student workspace (QA
    // BUG-003/004/005): non-teacher sessions get an explicit teacher-login ask.
    await expect(page).toHaveURL(
      /\/login\?next=(?:%2Fteacher%2Fdashboard|\/teacher\/dashboard)&reason=teacher-account-required/
    );
    await expect(
      page.getByText(/needs a teacher account|需要教師帳戶|需要教师账号/).first()
    ).toBeVisible();

    await logoutThroughApi(page);
    await authenticateAsTeacher(page);
    await page.goto("/teacher");
    await expect(page).toHaveURL(/\/teacher\/dashboard$/);
    await expect(page.getByRole("navigation", { name: /Teacher navigation/i })).toBeVisible();
    await expect(navLink(page, "Overview")).toHaveAttribute("aria-current", "page");

    expectNoPageErrors(pageErrors);
  });

  test("left-side console buttons navigate, activate, and render their pages", async ({ page }) => {
    const pageErrors = collectPageErrors(page);

    await loginAsTeacher(page);

    for (const item of teacherNavItems) {
      await clickTeacherNav(page, item);
      await expectTeacherPageReady(page, item);
    }

    expectNoPageErrors(pageErrors);
  });

  test("global class focus dropdown updates the active teacher workspace query", async ({ page }) => {
    const pageErrors = collectPageErrors(page);

    await loginAsTeacher(page);

    const classFocus = page.getByLabel(/Class focus/i);
    await expectSelectHasOptions(classFocus, ["all", "class-s3a-2026"]);
    await classFocus.selectOption("class-s3a-2026");
    await expect(page).toHaveURL(/\/teacher\/dashboard\?classId=class-s3a-2026$/);
    await expect(classFocus).toHaveValue("class-s3a-2026");

    await classFocus.selectOption("all");
    await expect(page).toHaveURL(/\/teacher\/dashboard$/);

    expectNoPageErrors(pageErrors);
  });

  test("overview dashboard links open the intended teacher queues", async ({ page }) => {
    const pageErrors = collectPageErrors(page);

    await loginAsTeacher(page);
    await clickTeacherNav(page, teacherNavItems[0]);

    await page.locator("main").getByRole("link", { name: /Pending grading/i }).click();
    await expect(page).toHaveURL(/\/teacher\/assignments\?filter=grading$/);

    await clickTeacherNav(page, teacherNavItems[0]);
    await page.locator("main").getByRole("link", { name: /Unreplied messages/i }).click();
    await expect(page).toHaveURL(/\/teacher\/communications\/inbox\?filter=open$/);

    await clickTeacherNav(page, teacherNavItems[0]);
    await page.locator("main").getByRole("link", { name: /Weekly completion/i }).click();
    await expect(page).toHaveURL(/\/teacher\/assignments$/);

    await clickTeacherNav(page, teacherNavItems[0]);
    await page.locator("main").getByRole("link", { name: /Needs attention/i }).click();
    await expect(page).toHaveURL(/\/teacher\/analytics$/);

    await clickTeacherNav(page, teacherNavItems[0]);
    const classStatus = page.locator("section").filter({ hasText: /Class learning status/i }).first();
    const firstClassCard = classStatus.getByRole("link").first();
    await expect(firstClassCard).toHaveAttribute("href", /\/teacher\/classes(?:[/?]|$)/);
    await firstClassCard.click();
    await expect(page).toHaveURL(/\/teacher\/classes(?:[/?]|$)/);

    await clickTeacherNav(page, teacherNavItems[0]);
    const heatmap = page.locator("section").filter({ hasText: /Weak topics by class/i }).first();
    const firstHeatmapCell = heatmap.getByRole("link").first();
    await expect(firstHeatmapCell).toHaveAttribute("href", /\/teacher\/classes\/[^?]+\?/);
    await firstHeatmapCell.click();
    await expect(page).toHaveURL(/\/teacher\/classes\/[^?]+\?/);

    await clickTeacherNav(page, teacherNavItems[0]);
    const actionQueue = page.locator("aside").filter({ hasText: /What needs attention/i }).first();
    const firstAction = actionQueue.getByRole("link").first();
    await expect(firstAction).toHaveAttribute("href", /\/teacher\/(assignments|classes|communications\/inbox)/);
    await firstAction.click();
    await expect(page).toHaveURL(/\/teacher\/(assignments|classes|communications\/inbox)/);

    await clickTeacherNav(page, teacherNavItems[0]);
    await page.locator("main").getByRole("link", { name: /Open rewards/i }).click();
    await expect(page).toHaveURL(/\/teacher\/rewards$/);
    await expect(navLink(page, "Rewards")).toHaveAttribute("aria-current", "page");

    expectNoPageErrors(pageErrors);
  });
});

test.describe("teacher action endpoint sanity", () => {
  test.describe.configure({ timeout: 60_000 });

  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chrome", "Teacher endpoint sanity runs once on desktop.");
  });

  test("page-control endpoints are mounted before deep UI workflows rely on them", async ({ page }) => {
    await loginAsTeacher(page);

    const rewardAwardValidation = await page.request.post("/api/teacher/reward-awards", { data: {} });
    expect.soft([400, 422], "reward award route should exist and reject invalid bodies with validation, not 404").toContain(rewardAwardValidation.status());

    const redemptionValidation = await page.request.patch("/api/teacher/rewards/redemptions/reward-redemption-peter-eraser", {
      data: { status: "pending" }
    });
    expect.soft([400, 409, 422], "reward redemption route should exist and reject invalid status transitions, not 404").toContain(redemptionValidation.status());

    const resourceDownload = await page.request.get("/api/teacher/resources/resource-s3-quadratics-slides/downloads");
    expect.soft(resourceDownload.status(), "teacher resource download route should return the seeded file").toBe(200);
    if (resourceDownload.ok()) {
      expect.soft(resourceDownload.headers()["content-disposition"]).toContain("s3-quadratics-intro.txt");
      expect.soft(await resourceDownload.text()).toContain("File name: s3-quadratics-intro.pptx");
    }

    const reportPdf = await page.request.get("/api/teacher/report-exports?format=pdf&type=class&language=en&classId=class-s3a-2026&remarks=Endpoint%20sanity");
    expect.soft(reportPdf.status(), "teacher report PDF route should return a PDF").toBe(200);
    if (reportPdf.ok()) {
      expect.soft(reportPdf.headers()["content-type"]).toContain("application/pdf");
    }

    const reportSave = await page.request.post("/api/teacher/saved-reports", {
      data: {
        type: "class",
        language: "en",
        classId: "class-s3a-2026",
        remarks: "Endpoint sanity save"
      }
    });
    expect.soft([200, 201], "teacher report save route should persist a valid report request").toContain(reportSave.status());

    const draftReply = await page.request.post("/api/teacher/inbox/message-thread-quadratic-help/draft-replies");
    expect.soft(draftReply.status(), "teacher inbox draft route should return a suggested reply").toBe(200);
    if (draftReply.ok()) {
      const payload = await draftReply.json() as { draft?: string };
      expect.soft(payload.draft?.length ?? 0).toBeGreaterThan(20);
    }
  });
});

test.describe("teacher console page workflows", () => {
  test.describe.configure({ timeout: 90_000 });

  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chrome", "Stateful teacher workflows run once on desktop.");
  });

  test("classes page creates a class and adds a student", async ({ page }, testInfo) => {
    test.slow();
    const pageErrors = collectPageErrors(page);
    const className = `Matrix S4 ${uniqueSuffix(testInfo).slice(0, 18)}`;

    await loginAsTeacher(page);
    await clickTeacherNav(page, teacherNavItems[1]);

    const classSection = page.locator("section").filter({ hasText: /Class and student management/i }).first();
    await classSection.getByLabel(/Class name/i).fill(className);
    const gradeSelect = classSection.getByLabel(/Grade/i);
    await expectSelectHasOptions(gradeSelect, ["P1", "S3", "S4", "S6"]);
    await gradeSelect.selectOption("S4");
    await classSection.getByLabel(/Academic year/i).fill("2026-2027");
    await classSection.getByLabel(/Notes/i).fill("Created by teacher console matrix coverage.");
    const createClassResponse = page.waitForResponse((response) =>
      response.url().includes("/api/teacher/classes") && response.request().method() === "POST"
    );
    await classSection.getByRole("button", { name: /^Create$/i }).click({ force: true });
    expect((await createClassResponse).ok()).toBeTruthy();
    await page.reload();

    const classLink = page.getByRole("link", { name: new RegExp(escapeRegex(className), "i") });
    await expect(classLink).toBeVisible();
    await classLink.click();
    await expect(page.getByRole("heading", { name: new RegExp(escapeRegex(className), "i") })).toBeVisible();
    await page.getByRole("link", { name: /Back to classes/i }).click();
    await expect(page).toHaveURL(/\/teacher\/classes$/);
    await classLink.click();
    await expect(page.getByRole("heading", { name: new RegExp(escapeRegex(className), "i") })).toBeVisible();

    await page.getByPlaceholder(/Student username/i).fill(demoStudent.username);
    const addStudentResponse = page.waitForResponse((response) =>
      response.url().includes("/api/teacher/classes/") &&
      response.url().includes("/students") &&
      response.request().method() === "POST"
    );
    await page.getByRole("button", { name: /Add student/i }).click();
    expect((await addStudentResponse).ok()).toBeTruthy();
    await page.reload();
    const studentLink = page.getByRole("link", { name: /HK Student Peter/i });
    await expect(studentLink).toBeVisible();
    await studentLink.click();
    await expect(page).toHaveURL(/\/teacher\/classes\/[^/]+\/students\/student-peter$/);
    await expect(page.getByRole("heading", { name: /HK Student Peter/i })).toBeVisible();
    await page.getByRole("link", { name: /Back to classes/i }).click();
    await expect(page).toHaveURL(/\/teacher\/classes\/[^/]+$/);

    expectNoPageErrors(pageErrors);
  });

  test("analytics page filters class context and creates a follow-up", async ({ page }) => {
    const pageErrors = collectPageErrors(page);

    await loginAsTeacher(page);
    await clickTeacherNav(page, teacherNavItems[2]);

    const hero = page.locator("section").filter({ hasText: /Class insight and intervention/i }).first();
    const classSelect = hero.getByRole("combobox", { name: /^Class$/i });
    await expectSelectHasOptions(classSelect, ["all", "class-s3a-2026"]);
    await classSelect.selectOption("class-s3a-2026");
    await expect(page).toHaveURL(/\/teacher\/analytics\?classId=class-s3a-2026$/);
    await classSelect.selectOption("all");
    await expect(page).toHaveURL(/\/teacher\/analytics$/);
    await classSelect.selectOption("class-s3a-2026");
    await expect(page).toHaveURL(/\/teacher\/analytics\?classId=class-s3a-2026$/);

    const heatmap = page.locator("section").filter({ hasText: /Topic mastery heatmap/i }).first();
    await expect(heatmap.getByRole("link").first()).toHaveAttribute("href", /\/teacher\//);

    const riskList = page.locator("section").filter({ hasText: /Student risk list/i }).first();
    await expect(riskList.getByRole("link").first()).toHaveAttribute("href", /\/teacher\/classes\/[^/]+\/students\//);

    const followUp = page.getByRole("button", { name: /Create follow-up/i }).first();
    await expect(followUp).toBeVisible();
    const followUpResponse = page.waitForResponse((response) =>
      response.url().includes("/api/teacher/analytics/follow-up") && response.request().method() === "POST"
    );
    await followUp.click();
    expect((await followUpResponse).ok()).toBeTruthy();
    await expect(page.getByRole("button", { name: /Added/i }).first()).toBeVisible();

    expectNoPageErrors(pageErrors);
  });

  test("rewards page awards points and processes redemption decisions", async ({ page }) => {
    test.slow();
    const pageErrors = collectPageErrors(page);

    await loginAsTeacher(page);
    await clickTeacherNav(page, teacherNavItems[3]);

    const studentSelect = page.getByRole("combobox", { name: /^Student$/i });
    const reasonSelect = page.getByRole("combobox", { name: /^Reason$/i });
    const pointsInput = page.getByRole("spinbutton", { name: /^Points$/i });
    await expectSelectHasLabel(studentSelect, /HK Student Peter/);
    await expectSelectHasOptions(reasonSelect, ["great-effort", "helping-classmates", "improved-accuracy", "completed-challenge"]);
    await studentSelect.selectOption({ label: demoStudent.username });
    await reasonSelect.selectOption("completed-challenge");
    await expect(pointsInput).toHaveValue("30");
    await pointsInput.fill("30");
    await page.getByRole("textbox", { name: /^Note$/i }).fill("Matrix coverage: clear working and persistence.");
    const awardResponse = page.waitForResponse((response) =>
      response.url().endsWith("/api/teacher/reward-awards") && response.request().method() === "POST"
    );
    await page.getByRole("button", { name: /^Award points$/i }).click();
    expect((await awardResponse).ok()).toBeTruthy();
    await expect(page.getByText(/Points awarded/i)).toBeVisible();
    await expect(page.getByText(/Teacher bonus: Completed challenge/i).first()).toBeVisible();

    await logoutThroughApi(page);
    await authenticateAsDemoStudent(page);
    const redemptionResponse = await page.request.post("/api/rewards/redeem", {
      data: { itemId: "reward-eraser" }
    });
    expect(redemptionResponse.ok()).toBeTruthy();

    await logoutThroughApi(page);
    await authenticateAsTeacher(page);
    await page.goto("/teacher/rewards");
    await expect(page.getByRole("heading", { name: /Rewards and gift redemptions/i })).toBeVisible();

    const firstPendingEraser = page.locator("article").filter({ hasText: /Eraser/ }).filter({ hasText: /Pending approval/ }).first();
    await expect(firstPendingEraser).toBeVisible();
    const rejectResponse = page.waitForResponse((response) =>
      response.url().includes("/api/teacher/rewards/redemptions/") && response.request().method() === "PATCH"
    );
    await firstPendingEraser.getByRole("button", { name: /Reject/i }).click();
    expect((await rejectResponse).ok()).toBeTruthy();
    await expect(page.getByText(/^Rejected$/i).first()).toBeVisible();

    const nextPendingEraser = page.locator("article").filter({ hasText: /Eraser/ }).filter({ hasText: /Pending approval/ }).first();
    await expect(nextPendingEraser).toBeVisible();
    const approveResponse = page.waitForResponse((response) =>
      response.url().includes("/api/teacher/rewards/redemptions/") && response.request().method() === "PATCH"
    );
    await nextPendingEraser.getByRole("button", { name: /Approve request/i }).click();
    expect((await approveResponse).ok()).toBeTruthy();
    await expect(page.getByText(/^Approved$/i).first()).toBeVisible();
    const fulfillResponse = page.waitForResponse((response) =>
      response.url().includes("/api/teacher/rewards/redemptions/") && response.request().method() === "PATCH"
    );
    await page.locator("article").filter({ hasText: /Eraser/ }).filter({ hasText: /Approved/i }).first().getByRole("button", { name: /Mark fulfilled/i }).click();
    expect((await fulfillResponse).ok()).toBeTruthy();
    await expect(page.getByText(/^Fulfilled$/i).first()).toBeVisible();

    const studentBalanceLink = page.locator("section").filter({ hasText: /Student balances/i }).getByRole("link", { name: /HK Student Peter/i }).first();
    await expect(studentBalanceLink).toHaveAttribute("href", /\/teacher\/(?:students\/student-peter|classes\/class-s3a-2026\/students\/student-peter)/);
    await expectBackToTopWorks(page);
    await studentBalanceLink.click();
    await expect(page).toHaveURL(/\/teacher\/(?:students\/student-peter|classes\/class-s3a-2026\/students\/student-peter)$/);

    expectNoPageErrors(pageErrors);
  });

  test("live page starts, previews, and ends a classroom session", async ({ page }) => {
    test.slow();
    const pageErrors = collectPageErrors(page);

    await loginAsTeacher(page);
    await clickTeacherNav(page, teacherNavItems[4]);

    const startSection = page.locator("section").filter({ hasText: /Start session/i }).first();
    const classSelect = startSection.getByRole("combobox", { name: /^Class$/i });
    const modeSelect = startSection.getByRole("combobox", { name: /^Mode$/i });
    const answerSelect = startSection.getByRole("combobox", { name: /Answer/i });
    await expectSelectHasOptions(classSelect, ["class-s3a-2026"]);
    await expectSelectHasOptions(modeSelect, ["poll", "exit-ticket"]);
    await classSelect.selectOption("class-s3a-2026");
    await modeSelect.selectOption("exit-ticket");
    await expect(answerSelect).toBeDisabled();
    await modeSelect.selectOption("poll");
    await expect(answerSelect).toBeEnabled();
    await startSection.getByRole("textbox", { name: /Question/i }).fill("Which option shows the next step?");
    await expectSelectHasOptions(answerSelect, ["a", "b", "c", "d"]);
    await answerSelect.selectOption("a");
    await startSection.getByRole("textbox", { name: /Topic ID/i }).fill("quadratic-patterns");
    const startResponse = page.waitForResponse((response) =>
      response.url().endsWith("/api/teacher/classroom-sessions") && response.request().method() === "POST"
    );
    await startSection.getByRole("button", { name: /^Start$/i }).click();
    expect((await startResponse).ok()).toBeTruthy();
    await expect(page.getByText(/Join code/i).first()).toBeVisible();
    const visualizationLink = page.locator("section").filter({ hasText: /Student-facing prompt/i }).first().getByRole("link").first();
    await expect(visualizationLink).toHaveAttribute("href", /\/student\/lessons\/|\/student\/tools\/visualizations/);
    await visualizationLink.click();
    await expect(page).toHaveURL(/\/student\/lessons\/|\/student\/tools\/visualizations/);
    await page.goto("/teacher/classroom-sessions");
    await expect(page.getByRole("button", { name: /End session/i })).toBeVisible();
    const currentJoinCode = (await page.locator("text=/^[A-Z0-9]{5,8}$/").first().innerText()).trim();

    const studentViewLink = page.getByRole("link", { name: /Open student view/i });
    await expect(studentViewLink).toHaveAttribute("href", /\/classroom\?code=/);
    await studentViewLink.click();
    await expect(page).toHaveURL(/\/classroom\?code=/);
    await expect(page.getByRole("heading", { name: /Join live classroom/i })).toBeVisible();
    await expect(page.getByText(/Teacher preview/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /^A ·/i }).first()).toBeDisabled();
    await expect(page.getByRole("button", { name: /Preview only/i })).toBeDisabled();

    await page.goto("/teacher/classroom-sessions");
    const endResponse = page.waitForResponse((response) =>
      response.url().endsWith("/api/teacher/classroom-sessions") && response.request().method() === "PATCH"
    );
    await page.getByRole("button", { name: /End session/i }).click();
    expect((await endResponse).ok()).toBeTruthy();
    await page.reload();
    await expect(page.getByText(currentJoinCode)).toHaveCount(0);

    expectNoPageErrors(pageErrors);
  });

  test("assignments page creates a selected-student assignment and saves a grade", async ({ page }, testInfo) => {
    test.slow();
    const pageErrors = collectPageErrors(page);
    const assignmentTitle = `Matrix assignment ${uniqueSuffix(testInfo)}`;

    await loginAsTeacher(page);
    await clickTeacherNav(page, teacherNavItems[5]);
    await page.getByRole("link", { name: /New assignment/i }).click();
    await expect(page).toHaveURL(/\/teacher\/assignments\/new$/);
    await expect(page.getByRole("heading", { name: /Create assignment/i })).toBeVisible();

    const classSelect = page.getByRole("combobox", { name: /^Class$/i });
    const contentTypeSelect = page.getByRole("combobox", { name: /Content type/i });
    await expectSelectHasOptions(classSelect, ["class-s3a-2026"]);
    await expectSelectHasOptions(contentTypeSelect, ["lesson", "practice", "visualization", "resource", "assessment"]);
    await classSelect.selectOption("class-s3a-2026");
    await contentTypeSelect.selectOption("resource");
    const resourceTarget = page.getByRole("combobox", { name: /^Resource$/i });
    await expect(resourceTarget).toBeVisible();
    await resourceTarget.selectOption("resource-s3-quadratics-slides");
    await contentTypeSelect.selectOption("assessment");
    const assessmentTarget = page.getByRole("combobox", { name: /^Assessment$/i });
    await expect(assessmentTarget).toBeVisible();
    await assessmentTarget.selectOption("assessment-s3-algebra-quiz");
    await contentTypeSelect.selectOption("lesson");
    await page.getByRole("button", { name: /Selected students/i }).click();
    await expect(page.getByLabel(/HK Student Peter/i)).toBeVisible();
    await page.getByRole("button", { name: /Whole class/i }).click();
    await expect(page.getByLabel(/HK Student Peter/i)).toHaveCount(0);
    await page.getByRole("button", { name: /Selected students/i }).click();
    await page.getByLabel(/HK Student Peter/i).check();
    await page.getByRole("textbox", { name: /^Title$/i }).fill(assignmentTitle);
    await page.getByRole("textbox", { name: /Target ID/i }).fill("quadratic-functions");
    await page.getByRole("textbox", { name: /Description/i }).fill("Created by teacher console matrix coverage.");
    await page.getByRole("button", { name: /^Create assignment$/i }).click();

    await expect(page).toHaveURL(/\/teacher\/assignments\/assignment-/);
    await expect(page.getByRole("heading", { name: new RegExp(escapeRegex(assignmentTitle), "i") })).toBeVisible();
    const submissionCard = page.locator("article").filter({ hasText: /HK Student Peter/i }).first();
    await expect(submissionCard).toBeVisible();
    await submissionCard.getByRole("spinbutton", { name: /^Score$/i }).fill("91");
    const scoreResponse = page.waitForResponse((response) =>
      response.url().includes("/api/teacher/submissions/") &&
      response.url().includes("/reviews") &&
      response.request().method() === "PATCH"
    );
    await submissionCard.getByRole("button", { name: /Save score/i }).click();
    expect((await scoreResponse).ok()).toBeTruthy();
    await expect(page.getByText(/Review recorded/i)).toBeVisible();
    await page.getByRole("link", { name: /Back to assignments/i }).click();
    await expect(page).toHaveURL(/\/teacher\/assignments$/);

    expectNoPageErrors(pageErrors);
  });

  test("resources page uploads, filters, and downloads a resource", async ({ page }, testInfo) => {
    test.slow();
    const pageErrors = collectPageErrors(page);
    const resourceTitle = `Matrix PDF ${uniqueSuffix(testInfo).slice(0, 18)}`;

    await loginAsTeacher(page);
    await clickTeacherNav(page, teacherNavItems[6]);

    const uploadSection = page.locator("section").filter({ hasText: /Upload resource/i }).first();
    await uploadSection.getByLabel(/Title/i).fill(resourceTitle);
    const uploadGrade = uploadSection.getByLabel(/Grade/i);
    const uploadType = uploadSection.getByLabel(/Type/i);
    const uploadTopic = uploadSection.getByLabel(/Topic/i);
    const uploadDifficulty = uploadSection.getByLabel(/Difficulty/i);
    await expectSelectHasOptions(uploadGrade, ["P1", "S3", "S6"]);
    await expectSelectHasOptions(uploadType, ["slides", "practice", "worksheet", "exam-paper", "document"]);
    await expectSelectHasOptions(uploadDifficulty, ["Low", "Medium", "High"]);
    await uploadGrade.selectOption("S3");
    await uploadType.selectOption("worksheet");
    await uploadTopic.selectOption("quadratic-patterns");
    await uploadDifficulty.selectOption("Medium");
    await uploadSection.locator('input[name="file"]').setInputFiles(fixturePath("sample-resource.pdf"));
    const uploadResponse = page.waitForResponse((response) =>
      response.url().includes("/api/teacher/resources") && response.request().method() === "POST"
    );
    await uploadSection.getByRole("button", { name: /Upload/i }).click();
    expect((await uploadResponse).ok()).toBeTruthy();
    await page.reload();
    await expect(page.getByRole("table").getByText(resourceTitle)).toBeVisible();

    const library = page.locator("section").filter({ hasText: /Resource library/i }).first();
    await library.locator("select").nth(0).selectOption("S3");
    await library.locator("select").nth(1).selectOption("quadratic-patterns");
    await library.locator("select").nth(2).selectOption("PDF");
    await library.getByLabel(/Recent/i).check();
    const uploadedResourceRow = library.locator("tr").filter({ hasText: resourceTitle }).first();
    await expect(uploadedResourceRow).toBeVisible();
    await expectDownloadFrom(page, () => uploadedResourceRow.getByRole("link", { name: /Download/i }).click(), /sample-resource\.pdf/);

    expectNoPageErrors(pageErrors);
  });

  test("assessments page switches source modes, creates an assessment, and exports CSV", async ({ page }, testInfo) => {
    test.slow();
    const pageErrors = collectPageErrors(page);
    const assessmentTitle = `Matrix quiz ${uniqueSuffix(testInfo).slice(0, 18)}`;

    await loginAsTeacher(page);
    await clickTeacherNav(page, teacherNavItems[7]);
    await page.getByRole("link", { name: /New assessment/i }).click();
    await expect(page).toHaveURL(/\/teacher\/assessments\/new$/);

    const classSelect = page.getByRole("combobox", { name: /^Class$/i });
    const assessmentTypeSelect = page.getByRole("combobox", { name: /Assessment type/i });
    await expectSelectHasOptions(classSelect, ["class-s3a-2026"]);
    await expectSelectHasOptions(assessmentTypeSelect, ["quiz", "test", "mock-exam", "exam"]);
    await classSelect.selectOption("class-s3a-2026");
    await assessmentTypeSelect.selectOption("quiz");
    await page.getByRole("textbox", { name: /^Title$/i }).fill(assessmentTitle);
    await page.getByRole("spinbutton", { name: /Time limit/i }).fill("20");
    await page.getByRole("spinbutton", { name: /Weight/i }).fill("10");
    await page.getByRole("spinbutton", { name: /Attempts/i }).fill("2");
    await page.getByRole("button", { name: /2\. Select/i }).click();
    await expect(page.getByRole("button", { name: /Question bank/i })).toBeVisible();
    await page.getByRole("button", { name: /3\. Custom/i }).click();
    await page.getByPlaceholder(/Question prompt/i).fill("What is 2 + 2?");
    await page.getByRole("textbox", { name: /^Answer$/i }).fill("4");
    await page.getByRole("button", { name: /Add manual question/i }).click();
    await expect(page.locator("aside").getByText(/What is 2 \+ 2\?/i)).toBeVisible();
    const createAssessmentResponse = page.waitForResponse((response) =>
      response.url().includes("/api/teacher/assessments") && response.request().method() === "POST"
    );
    await page.getByRole("button", { name: /^Publish assessment$/i }).click();
    expect((await createAssessmentResponse).ok()).toBeTruthy();

    await expect(page).toHaveURL(/\/teacher\/assessments\/assessment-/);
    await page.reload();
    await expect(page.getByRole("heading", { name: new RegExp(escapeRegex(assessmentTitle), "i") })).toBeVisible();
    await expect(page.getByText(/Score distribution/i)).toBeVisible();
    await expectDownloadFrom(page, () => page.getByRole("link", { name: /Export CSV/i }).click(), /assessment-.*-scores\.csv/);
    await page.getByRole("link", { name: /Back to assessments/i }).click();
    await expect(page).toHaveURL(/\/teacher\/assessments$/);

    expectNoPageErrors(pageErrors);
  });

  test("reports page refreshes preview, exports, and saves report history", async ({ page }) => {
    test.slow();
    const pageErrors = collectPageErrors(page);
    const remarks = "Matrix report remarks: practise vertex form and explain each graph move.";

    await loginAsTeacher(page);
    await clickTeacherNav(page, teacherNavItems[8]);

    const typeSelect = page.getByRole("combobox", { name: /^Type$/i });
    const languageSelect = page.getByRole("combobox", { name: /Language/i });
    const classSelect = page.getByRole("combobox", { name: /^Class$/i });
    await expectSelectHasOptions(typeSelect, ["student", "class", "assignment", "assessment", "parent-summary"]);
    await expectSelectHasOptions(languageSelect, ["en", "zh", "zh-Hans"]);
    await expectSelectHasOptions(classSelect, ["class-s3a-2026"]);
    await typeSelect.selectOption("class");
    await classSelect.selectOption("class-s3a-2026");
    await typeSelect.selectOption("assignment");
    const assignmentSelect = page.getByRole("combobox", { name: /^Assignment$/i });
    await expect(assignmentSelect).toBeVisible();
    await expectSelectHasLabel(assignmentSelect, /Quadratic/i);
    await typeSelect.selectOption("assessment");
    const assessmentSelect = page.getByRole("combobox", { name: /^Quiz$/i });
    await expect(assessmentSelect).toBeVisible();
    await assessmentSelect.selectOption("assessment-s3-algebra-quiz");
    await typeSelect.selectOption("parent-summary");
    await expect(page.getByRole("combobox", { name: /^Student$/i })).toBeVisible();
    await typeSelect.selectOption("student");
    await languageSelect.selectOption("zh");
    await expect(page.locator("article").filter({ hasText: /教師備註/ }).first()).toBeVisible({ timeout: 10000 });
    await languageSelect.selectOption("en");
    await page.getByRole("textbox", { name: /Teacher remarks/i }).fill(remarks);
    const preview = page.locator("article").filter({ hasText: /Teacher remarks/i }).first();
    await expect(preview.getByText(remarks)).toBeVisible({ timeout: 10000 });

    await expectDownloadFrom(page, () => page.getByRole("link", { name: /Export CSV/i }).click({ force: true }), /student-report-.*\.csv/);
    await expectDownloadFrom(page, () => page.getByRole("link", { name: /Export PDF/i }).click({ force: true }), /student-report-.*\.pdf/);
    await page.getByRole("button", { name: /Save report/i }).click({ force: true });
    await expect(page.getByText(/Report saved and added to history/i)).toBeVisible();
    await expectBackToTopWorks(page);

    expectNoPageErrors(pageErrors);
  });

  test("inbox page selects a thread, drafts, toggles status, and sends a reply", async ({ page }, testInfo) => {
    test.slow();
    const pageErrors = collectPageErrors(page);
    const reply = `Matrix reply ${uniqueSuffix(testInfo)}: please show the first algebra step.`;

    await loginAsTeacher(page);
    await clickTeacherNav(page, teacherNavItems[9]);

    await page.getByRole("link", { name: /Need help with vertex form/i }).click();
    await expect(page).toHaveURL(/\/teacher\/communications\/inbox\?thread=message-thread-quadratic-help$/);
    const currentAssignmentLink = page.locator("aside").filter({ hasText: /Current assignments/i }).getByRole("link").first();
    await expect(currentAssignmentLink).toHaveAttribute("href", /\/teacher\/assignments\//);
    await currentAssignmentLink.click();
    await expect(page).toHaveURL(/\/teacher\/assignments\//);
    await page.goto("/teacher/communications/inbox?thread=message-thread-quadratic-help");

    const draftResponse = page.waitForResponse((response) =>
      response.url().endsWith("/api/teacher/inbox/message-thread-quadratic-help/draft-replies") && response.request().method() === "POST"
    );
    await page.getByRole("button", { name: /Draft reply/i }).click();
    expect((await draftResponse).ok()).toBeTruthy();
    const replyBox = page.getByPlaceholder(/Reply to the student/i);
    await expect(replyBox).not.toBeEmpty();

    const starButton = page.getByRole("button", { name: /Star|Unstar/i });
    const starResponse = page.waitForResponse((response) =>
      response.url().includes("/api/teacher/inbox/message-thread-quadratic-help") && response.request().method() === "PATCH"
    );
    await starButton.click();
    expect((await starResponse).ok()).toBeTruthy();
    await expect(page.getByRole("button", { name: /Star|Unstar/i })).toBeVisible();
    const resolveButton = page.getByRole("button", { name: /Resolve|Reopen/i });
    const resolveResponse = page.waitForResponse((response) =>
      response.url().includes("/api/teacher/inbox/message-thread-quadratic-help") && response.request().method() === "PATCH"
    );
    await resolveButton.click();
    expect((await resolveResponse).ok()).toBeTruthy();
    await expect(page.getByRole("button", { name: /Resolve|Reopen/i })).toBeVisible();

    await replyBox.fill(reply);
    const replyResponse = page.waitForResponse((response) =>
      response.url().endsWith("/api/teacher/inbox/message-thread-quadratic-help/replies") && response.request().method() === "POST"
    );
    await page.getByRole("button", { name: /Send reply/i }).click();
    expect((await replyResponse).ok()).toBeTruthy();
    await expect(replyBox).toBeEmpty();
    await expect(page.locator("main").getByText(reply).last()).toBeVisible();

    expectNoPageErrors(pageErrors);
  });
});

test.describe("teacher console mobile smoke", () => {
  test("mobile teacher console keeps every nav destination reachable", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-chrome", "Mobile smoke runs only in the mobile project.");

    await authenticateAsTeacher(page);
    await page.goto("/teacher");
    await expect(page).toHaveURL(/\/teacher\/dashboard$/);

    for (const item of teacherNavItems) {
      await page.goto(item.path);
      await expect(page).toHaveURL(new RegExp(`${escapeRegex(item.path)}(?:[?#].*)?$`));
      await expect(navLink(page, item.label)).toHaveAttribute("aria-current", "page");
      await expectTeacherPageReady(page, item);
    }
  });
});
