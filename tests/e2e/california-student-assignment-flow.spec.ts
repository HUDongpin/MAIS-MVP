import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";
import { collectPageErrors, expectNoPageErrors, logoutIfVisible, uniqueSuffix } from "./helpers";

type LocalizedTitle = {
  en?: string;
  zh?: string;
  zhHans?: string;
};

type AdaptiveNextResponse = {
  reason?: string;
  decision?: {
    skill?: {
      difficulty?: string;
      id?: string;
    };
    topic?: {
      curriculumTrack?: string;
      title?: LocalizedTitle;
    };
    questions?: Array<{
      id?: string;
      curriculumTrack?: string;
      type?: string;
    }>;
  };
};

type ClassCreateResponse = {
  class?: {
    id: string;
    name: string;
  };
};

type StudentAssignmentsResponse = {
  assignments?: Array<{
    assignment: {
      id: string;
      contentType: string;
      title: LocalizedTitle;
    };
    classGrade: string;
    className: string;
    submission: {
      status: string;
    };
  }>;
};

type LessonApiResponse = {
  lesson?: {
    title?: LocalizedTitle;
    topicId?: string;
    blocks?: Array<{
      content?: LocalizedTitle;
      items?: LocalizedTitle[];
      practiceQuestionIds?: string[];
      title?: LocalizedTitle;
      type?: string;
    }>;
    practiceQuestions?: Array<{
      curriculumTrack?: string;
      id?: string;
    }>;
  };
};

const californiaLessonSlug = "us-ca-math-s3-chapter-01";

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function expectOkJson<T>(response: { ok(): boolean; text(): Promise<string> }) {
  const body = await response.text();
  expect(response.ok(), body).toBeTruthy();
  return JSON.parse(body) as T;
}

async function loginAsCaliforniaTeacher(page: Page) {
  const response = await page.request.post("/api/auth/login", {
    data: {
      username: "Teacher Scott",
      password: "12345",
      grade: "P1",
      curriculumTrack: "US_CA_MATH",
      curriculumProfile: { region: "US", publisher: "US_CA_MATH" },
      language: "en",
      theme: "light"
    }
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  await page.goto("/teacher/dashboard");
  await expect(page.getByRole("link", { name: /Teacher Scott/i }).first()).toBeVisible();
}

async function loginAsCaliforniaStudent(page: Page) {
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

async function createCaliforniaClassWithStudent(page: Page, className: string) {
  const classPayload = await expectOkJson<ClassCreateResponse>(await page.request.post("/api/teacher/classes", {
    data: {
      name: className,
      grade: "P1",
      academicYear: "2026-2027",
      description: "California E2E class for student/teacher assignment coverage."
    }
  }));
  expect(classPayload.class?.id).toBeTruthy();
  const classId = classPayload.class?.id ?? "";

  await expectOkJson(await page.request.post(`/api/teacher/classes/${encodeURIComponent(classId)}/students`, {
    data: { username: "Student Shirleen" }
  }));

  await page.goto(`/teacher/classes/${encodeURIComponent(classId)}`);
  await expect(page.getByRole("heading", { name: new RegExp(escapeRegex(className), "i") })).toBeVisible();
  await expect(page.getByRole("link", { name: /Student Shirleen/i })).toBeVisible();

  return classId;
}

async function selectOptionContaining(select: Locator, expectedText: string) {
  const value = await select.locator("option").evaluateAll((options, text) => {
    const match = options.find((option) => (option.textContent ?? "").includes(text)) as HTMLOptionElement | undefined;
    return match?.value ?? "";
  }, expectedText);
  expect(value, `Expected select option containing ${expectedText}`).toBeTruthy();
  await select.selectOption(value);
}

async function createPracticeAssignmentThroughTeacherUi(page: Page, className: string, assignmentTitle: string) {
  await page.goto("/teacher/assignments/new");
  await expect(page.getByRole("heading", { name: /Create assignment/i })).toBeVisible();

  await selectOptionContaining(page.getByRole("combobox", { name: /^Class$/i }), className);
  await page.getByRole("combobox", { name: /Content type/i }).selectOption("practice");

  const aiGenerate = page.getByLabel(/AI generate practice/i);
  await expect(aiGenerate).toBeVisible();
  if (await aiGenerate.isChecked()) await aiGenerate.uncheck();

  await page.getByRole("button", { name: /Selected students/i }).click();
  await expect(page.getByLabel(/Student Shirleen/i)).toBeVisible();
  await page.getByLabel(/Student Shirleen/i).check();

  await page.getByRole("textbox", { name: /^Title$/i }).fill(assignmentTitle);
  await page.getByRole("textbox", { name: /Target ID/i }).fill("us-ca-e2e-practice");
  await page.getByRole("textbox", { name: /Description/i }).fill("Complete one California adaptive practice round and submit your reasoning.");
  await page.getByRole("button", { name: /^Create assignment$/i }).click();

  await expect(page).toHaveURL(/\/teacher\/assignments\/assignment-/);
  const assignmentId = new URL(page.url()).pathname.split("/").filter(Boolean).pop() ?? "";
  expect(assignmentId).toMatch(/^assignment-/);
  await expect(page.getByRole("heading", { name: new RegExp(escapeRegex(assignmentTitle), "i") })).toBeVisible();
  await expect(page.locator("article, tr").filter({ hasText: /Student Shirleen/i }).first()).toContainText(/not[-\s]started/i);

  return assignmentId;
}

async function currentStudentAssignment(page: Page, assignmentId: string) {
  const payload = await expectOkJson<StudentAssignmentsResponse>(await page.request.get("/api/assignments"));
  const assignment = payload.assignments?.find((item) => item.assignment.id === assignmentId);
  expect(assignment, `Expected student assignment ${assignmentId}`).toBeTruthy();
  return assignment!;
}

async function expectCaliforniaLessonPayload(page: Page) {
  const payload = await expectOkJson<LessonApiResponse>(await page.request.get(`/api/lessons/${encodeURIComponent(californiaLessonSlug)}`));
  const lesson = payload.lesson;
  expect(lesson?.topicId).toBe(californiaLessonSlug);
  expect(lesson?.title?.en).toBeTruthy();

  const blocks = lesson?.blocks ?? [];
  const blockTypes = new Set(blocks.map((block) => block.type));
  ["concept", "worked-example", "checklist", "practice", "extension", "teacher-guide"].forEach((type) => {
    expect(blockTypes.has(type), `Expected California lesson block type ${type}`).toBe(true);
  });

  const checklist = blocks.find((block) => block.type === "checklist");
  expect(checklist?.items?.length ?? 0).toBeGreaterThanOrEqual(3);
  expect(checklist?.items?.every((item) => item.en && item.zh && item.zhHans)).toBe(true);

  const practiceBlock = blocks.find((block) => block.type === "practice");
  expect(practiceBlock?.practiceQuestionIds?.length ?? 0).toBeGreaterThanOrEqual(5);
  expect(lesson?.practiceQuestions?.length ?? 0).toBeGreaterThan(0);
  expect(lesson?.practiceQuestions?.every((question) => question.curriculumTrack === "US_CA_MATH")).toBe(true);

  const teacherGuide = blocks.find((block) => block.type === "teacher-guide");
  expect(teacherGuide?.title?.en).toMatch(/Progress and standards coverage/i);
  expect(teacherGuide?.content?.en).toMatch(/standard identifiers/i);
  expect(teacherGuide?.items?.some((item) => /California Math Practice Beta/i.test(item.en ?? ""))).toBe(true);

  return lesson!;
}

async function makeVisibleQuestionAnswerable(page: Page) {
  const card = page.locator("article:visible").first();
  await expect(card).toBeVisible({ timeout: 20_000 });
  const textbox = card.getByRole("textbox").first();

  if (await textbox.isVisible().catch(() => false)) {
    await textbox.fill("not the final answer");
  } else {
    await card.locator("button")
      .filter({ hasNotText: /Check Answer|Reset|Math keyboard|Previous question|Next question|Jump|Read aloud|Stop|讀給我聽|读给我听|停止/i })
      .first()
      .click();
  }

  await expect(card.getByRole("button", { name: /Check Answer/i })).toBeEnabled();
  return card;
}

async function closeLearnerSetupIfVisible(page: Page) {
  const closeSetup = page.getByRole("button", { name: /关闭 15 秒设置/i });
  await closeSetup.waitFor({ state: "visible", timeout: 1_500 }).catch(() => undefined);
  if (await closeSetup.isVisible().catch(() => false)) {
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: /先帮你选一个舒服的开始方式/i })).toBeHidden();
  }
}

test.describe("California student, practice, adaptive, dashboard, and assignment E2E", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chrome", "California end-to-end check runs once on desktop.");
  });

  test("California lesson seed renders student checklist/practice and teacher guide", async ({ page }) => {
    const pageErrors = collectPageErrors(page);

    await loginAsCaliforniaStudent(page);
    const lesson = await expectCaliforniaLessonPayload(page);

    await page.goto(`/student/lessons/${encodeURIComponent(californiaLessonSlug)}`);
    await closeLearnerSetupIfVisible(page);
    await expect(page.getByText(new RegExp(escapeRegex(lesson.title?.en ?? "Lesson Module"), "i")).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Go to next item/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Lesson practice/i })).toBeVisible();
    await expect(page.getByText(/Question 1 of/i)).toBeVisible();
    await expect(page.locator('section[aria-label="Teacher guide"]')).toHaveCount(0);
    await logoutIfVisible(page);

    await loginAsCaliforniaTeacher(page);
    await page.goto(`/student/lessons/${encodeURIComponent(californiaLessonSlug)}`);
    const teacherGuide = page.locator('section[aria-label="Teacher guide"]');
    await expect(teacherGuide).toBeVisible();
    await expect(teacherGuide).toContainText(/Progress and standards coverage/i);
    await expect(teacherGuide).toContainText(/California Math Practice Beta/i);

    expectNoPageErrors(pageErrors);
  });

  test("Teacher Scott assignment reaches Student Shirleen across California student surfaces", async ({ page }, testInfo: TestInfo) => {
    test.slow();
    const pageErrors = collectPageErrors(page);
    const suffix = uniqueSuffix(testInfo).slice(0, 34);
    const className = `CA E2E P1 ${suffix}`;
    const assignmentTitle = `CA adaptive practice ${suffix}`;

    await loginAsCaliforniaTeacher(page);
    await createCaliforniaClassWithStudent(page, className);
    const assignmentId = await createPracticeAssignmentThroughTeacherUi(page, className, assignmentTitle);
    await logoutIfVisible(page);

    await loginAsCaliforniaStudent(page);
    await expect(page.getByRole("link", { name: /Student Shirleen/i }).first()).toBeVisible();
    await expect(page.getByText(/Learning course/i)).toBeVisible();
    await expect(page.getByText(/California Math Practice Beta/i).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: /Teacher-assigned work/i })).toBeVisible();
    await expect(page.getByRole("link", { name: new RegExp(escapeRegex(assignmentTitle), "i") })).toBeVisible();

    const initialAssignment = await currentStudentAssignment(page, assignmentId);
    expect(initialAssignment.classGrade).toBe("P1");
    expect(initialAssignment.className).toBe(className);
    expect(initialAssignment.assignment.contentType).toBe("practice");
    expect(initialAssignment.submission.status).toBe("not-started");

    const adaptivePayload = await expectOkJson<AdaptiveNextResponse>(await page.request.get("/api/adaptive-learning/next?grade=P1"));
    expect(adaptivePayload.reason).toBeUndefined();
    expect(adaptivePayload.decision?.topic?.curriculumTrack).toBe("US_CA_MATH");
    expect(adaptivePayload.decision?.questions?.length ?? 0).toBeGreaterThan(0);
    expect(adaptivePayload.decision?.questions?.every((question) => question.curriculumTrack === "US_CA_MATH")).toBe(true);

    await page.goto("/personalized-learning");
    const galaxy = page.locator('section[aria-label="Adaptive knowledge galaxy"]');
    await expect(galaxy).toBeVisible();
    await expect(galaxy).toContainText(/California/i);
    await expect(galaxy).not.toContainText(/This curriculum is not open in MAIS yet/i);
    await expect(page.getByRole("heading", { name: /Teacher-assigned work/i })).toBeVisible();
    await expect(page.getByRole("link", { name: new RegExp(escapeRegex(assignmentTitle), "i") })).toBeVisible();

    await page.goto("/practice");
    await expect(page.getByRole("heading", { name: /Practice Arena/i })).toBeVisible();
    const californiaStatus = page.locator('section[aria-label="California Math Practice Beta status"]');
    await expect(californiaStatus).toBeVisible();
    await expect(californiaStatus).toContainText(/P1|Primary 1|Grade 1|G1/i);
    const adaptivePanel = page.locator("#adaptive-practice-round");
    await expect(adaptivePanel).toBeVisible();
    await expect(adaptivePanel.getByRole("region", { name: /Practice questions/i }).getByText(/Question 1 of 5/i)).toBeVisible();
    await expect(adaptivePanel).toContainText(/California/i);
    await closeLearnerSetupIfVisible(page);
    const requiredQuestionCount = 5;
    const attemptFeedbackItems: Array<{ correct: boolean; correctAnswer?: string }> = [];

    for (let questionNumber = 1; questionNumber <= requiredQuestionCount; questionNumber += 1) {
      await expect(page.getByText(new RegExp(`Question ${questionNumber} of ${requiredQuestionCount}`, "i"))).toBeVisible();
      const practiceCard = await makeVisibleQuestionAnswerable(page);
      const attemptResponsePromise = page.waitForResponse((response) =>
        response.url().includes("/api/attempts") && response.request().method() === "POST"
      );
      await practiceCard.getByRole("button", { name: /Check Answer/i }).click();
      attemptFeedbackItems.push(await expectOkJson<{ correct: boolean; correctAnswer?: string }>(await attemptResponsePromise));

      if (questionNumber < requiredQuestionCount) {
        await expect(page.getByText(new RegExp(`Question ${questionNumber + 1} of ${requiredQuestionCount}`, "i"))).toBeVisible({ timeout: 8_000 });
      }
    }

    expect(attemptFeedbackItems.some((feedback) => !feedback.correct)).toBe(true);
    const summaryDialog = page.getByRole("dialog", { name: /Personalized practice round complete/i });
    await expect(summaryDialog).toBeVisible();
    await expect(summaryDialog).toContainText(/Review focus/i);
    await expect(summaryDialog).toContainText(/Correct answer:/i);
    await expect(summaryDialog).toContainText(/Personalized next path/i);
    await expect(summaryDialog.getByRole("link", { name: /Mistake Book/i })).toBeVisible();
    await closeLearnerSetupIfVisible(page);

    await page.goto(`/student/assignments/${encodeURIComponent(assignmentId)}`);
    await expect(page.getByRole("heading", { name: new RegExp(escapeRegex(assignmentTitle), "i") })).toBeVisible();
    await page.locator("textarea").first().fill("I completed a California adaptive practice round and checked one answer.");
    await page.getByRole("button", { name: /Submit work/i }).click();
    await expect(page.getByText(/Assignment submitted/i)).toBeVisible();
    const submittedAssignment = await currentStudentAssignment(page, assignmentId);
    expect(submittedAssignment.submission.status).toBe("submitted");
    await logoutIfVisible(page);

    await loginAsCaliforniaTeacher(page);
    await page.goto(`/teacher/assignments/${encodeURIComponent(assignmentId)}`);
    const submissionCard = page.locator("article").filter({ hasText: /Student Shirleen/i }).first();
    await expect(submissionCard).toContainText(/submitted/i);
    await expect(submissionCard).toContainText(/California adaptive practice round/i);
    await submissionCard.getByRole("spinbutton").fill("92");
    await submissionCard.getByRole("textbox", { name: /Teacher feedback/i }).fill("Strong California practice follow-through.");
    await submissionCard.getByRole("button", { name: /Save score/i }).click();
    await expect(submissionCard).toContainText(/graded/i);
    await expect(submissionCard).toContainText(/92/);

    expectNoPageErrors(pageErrors);
  });
});
