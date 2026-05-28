import { expect, test, type Browser, type Page, type TestInfo } from "@playwright/test";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { getMainlandHjbPrimaryLessonIllustration } from "../../data/mainlandHjbPrimaryLessonIllustrations";
import { mainlandHjbPrimaryTopics } from "../../data/mainlandHjbPrimaryTopics";
import { lessonSlugForTopicId } from "../../lib/lessonLinks";

type AuthSession = {
  user: {
    id: string;
    role: "student" | "teacher" | "admin" | "parent";
    grade: string;
    curriculumTrack?: string;
    curriculumProfile?: {
      region?: string;
      publisher?: string;
    };
  };
  settings: {
    language: string;
    selectedGrade: string;
  };
};

type AppStateRow = {
  payload: string;
};

type AppStatePayload = {
  users: Array<{
    id: string;
    role: "student" | "teacher" | "admin" | "parent";
  }>;
  student_profiles?: Array<{
    user_id: string;
    curriculum_region?: string;
    textbook_publisher?: string;
  }>;
};

type PublicQuestion = {
  id: string;
  topicId?: string;
  publisher?: string;
  curriculumProfile?: {
    publisher?: string;
  };
  prompt?: unknown;
};

type LessonEntryResponse = {
  lessonEntryTarget?: {
    href: string;
    slug: string;
    grade: string;
    topicId: string;
  } | null;
};

type LessonApiPayload = {
  lesson: {
    slug: string;
    topicId: string;
    grade: string;
    publisher?: string;
    title?: {
      en?: string;
      zh?: string;
      zhHans?: string;
    };
    topic?: {
      publisher?: string;
      curriculumProfile?: {
        publisher?: string;
      };
    };
    practiceQuestions?: PublicQuestion[];
    blocks?: Array<{ type: string }>;
  };
};

const e2eDbPath = process.env.HK_MATH_DB_PATH ?? path.join(process.cwd(), ".tmp/e2e/hk-math-db.sqlite");
const teacherGuideSelector = [
  'section[aria-label*="Teacher guide"]',
  'section[aria-label*="教師使用建議"]',
  'section[aria-label*="教师使用建议"]'
].join(", ");
const representativeHjbPrimaryIllustrationTopicIds = [
  "hjb-primary-p1-upper-school-math-habits",
  "hjb-primary-p3-lower-area-measurement",
  "hjb-primary-p5-lower-cuboid-cube",
  "hjb-primary-p6-lower-linear-equations-inequalities"
] as const;

function appUrl(baseURL: string, pathname: string) {
  return new URL(pathname, baseURL).toString();
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function simplifiedTitleVariant(value: string) {
  return value
    .replace(/滬/g, "沪")
    .replace(/級/g, "级")
    .replace(/冊/g, "册")
    .replace(/減/g, "减")
    .replace(/數/g, "数")
    .replace(/實/g, "实")
    .replace(/學/g, "学")
    .replace(/與/g, "与")
    .replace(/圖/g, "图")
    .replace(/圓/g, "圆")
    .replace(/線/g, "线")
    .replace(/範/g, "范")
    .replace(/圍/g, "围");
}

function mixedMainlandTitleVariant(value: string) {
  return value
    .replace(/級/g, "级")
    .replace(/冊/g, "册")
    .replace(/減/g, "减")
    .replace(/數/g, "数")
    .replace(/實/g, "实")
    .replace(/學/g, "学")
    .replace(/與/g, "与")
    .replace(/圍/g, "围");
}

function localizedTitlePattern(title: string) {
  const variants = [...new Set([title, mixedMainlandTitleVariant(title), simplifiedTitleVariant(title)])].filter(Boolean).map(escapeRegex);
  return new RegExp(variants.join("|"));
}

function uniqueUsername(testInfo: TestInfo, label: string) {
  return [
    "mainland-hjb-lesson-only",
    label,
    testInfo.project.name,
    testInfo.workerIndex,
    Date.now(),
    Math.random().toString(36).slice(2, 8)
  ]
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-");
}

async function newPage(browser: Browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  return { context, page };
}

async function registerHjbAccount(page: Page, baseURL: string, testInfo: TestInfo, label: string, grade = "S4") {
  const username = `${uniqueUsername(testInfo, label)}@example.test`;
  const password = "lesson12345";
  const response = await page.request.post(appUrl(baseURL, "/api/auth/register"), {
    data: {
      name: `Mainland HJB ${label} QA`,
      username,
      email: username,
      password,
      grade,
      curriculumTrack: "MAINLAND_PEP_HIGH",
      curriculumProfile: { region: "MAINLAND", publisher: "MAINLAND_HJB" },
      language: "zh-Hans",
      theme: "dark"
    }
  });

  expect(response.status(), `register Mainland HJB ${label}`).toBe(200);
  const session = (await response.json()) as AuthSession;
  expect(session.user.role).toBe("student");
  expect(session.user.grade).toBe(grade);
  expect(session.user.curriculumTrack).toBe("MAINLAND_PEP_HIGH");
  expect(session.user.curriculumProfile?.region).toBe("MAINLAND");
  expect(session.user.curriculumProfile?.publisher).toBe("MAINLAND_HJB");
  expect(session.settings.language).toBe("zh-Hans");
  expect(session.settings.selectedGrade).toBe(grade);
  return { session, username, password };
}

async function loginHjbAccount(page: Page, baseURL: string, username: string, password: string, grade = "S4") {
  const response = await page.request.post(appUrl(baseURL, "/api/auth/login"), {
    data: {
      username,
      password,
      grade,
      curriculumTrack: "MAINLAND_PEP_HIGH",
      curriculumProfile: { region: "MAINLAND", publisher: "MAINLAND_HJB" },
      language: "zh-Hans",
      theme: "dark"
    }
  });

  expect(response.status(), `login Mainland HJB ${grade} QA account`).toBe(200);
}

function setUserRole(userId: string, role: "teacher") {
  const sqlite = new DatabaseSync(e2eDbPath);
  try {
    const row = sqlite
      .prepare("SELECT payload FROM app_state WHERE id = ?")
      .get("primary") as AppStateRow | undefined;
    expect(row).toBeTruthy();

    const payload = JSON.parse(row?.payload ?? "{}") as AppStatePayload;
    const user = payload.users.find((candidate) => candidate.id === userId);
    expect(user).toBeTruthy();
    const profile = payload.student_profiles?.find((candidate) => candidate.user_id === userId);
    expect(profile?.curriculum_region).toBe("MAINLAND");
    expect(profile?.textbook_publisher).toBe("MAINLAND_HJB");
    if (!user) return;

    user.role = role;
    sqlite
      .prepare("UPDATE app_state SET payload = ?, updated_at = ? WHERE id = ?")
      .run(JSON.stringify(payload), new Date().toISOString(), "primary");
  } finally {
    sqlite.close();
  }
}

async function expectHjbSession(page: Page, baseURL: string, role: "student" | "teacher", grade = "S4") {
  const response = await page.request.get(appUrl(baseURL, "/api/me"));
  expect(response.status(), `GET /api/me as HJB ${role}`).toBe(200);
  const session = (await response.json()) as AuthSession;
  expect(session.user.role).toBe(role);
  expect(session.user.grade).toBe(grade);
  expect(session.user.curriculumTrack).toBe("MAINLAND_PEP_HIGH");
  expect(session.user.curriculumProfile?.region).toBe("MAINLAND");
  expect(session.user.curriculumProfile?.publisher).toBe("MAINLAND_HJB");
}

async function getStudentHjbLessonSlug(page: Page, baseURL: string, grade = "S4") {
  const response = await page.request.get(appUrl(baseURL, `/api/lesson-entry?grade=${encodeURIComponent(grade)}`));
  expect(response.status(), `GET /api/lesson-entry for Mainland HJB ${grade} student`).toBe(200);
  const body = (await response.json()) as LessonEntryResponse;
  expect(body.lessonEntryTarget?.slug, "HJB student receives a lesson entry slug").toBeTruthy();
  expect(body.lessonEntryTarget?.grade).toBe(grade);
  expect(body.lessonEntryTarget?.href).toBe(`/lesson/${encodeURIComponent(body.lessonEntryTarget?.slug ?? "")}`);
  return body.lessonEntryTarget?.slug ?? "";
}

async function getTeacherHjbLessonSlug(page: Page, baseURL: string, grade = "S4") {
  const response = await page.request.get(appUrl(baseURL, `/api/lesson-entry?grade=${encodeURIComponent(grade)}`));
  expect(response.status(), `GET /api/lesson-entry for Mainland HJB ${grade} teacher`).toBe(200);
  const body = (await response.json()) as LessonEntryResponse;
  expect(body.lessonEntryTarget?.slug, "HJB teacher receives a lesson entry slug").toBeTruthy();
  expect(body.lessonEntryTarget?.grade).toBe(grade);
  expect(body.lessonEntryTarget?.href).toBe(`/lesson/${encodeURIComponent(body.lessonEntryTarget?.slug ?? "")}`);
  return body.lessonEntryTarget?.slug ?? "";
}

async function expectHjbLessonApi(page: Page, baseURL: string, slug: string, grade = "S4", expectedPracticeCount = 8, questionIdPattern: RegExp | null = /^hjb-high-ds-v[1-4]-/i) {
  const response = await page.request.get(appUrl(baseURL, `/api/lessons/${encodeURIComponent(slug)}`));
  expect(response.status(), `GET /api/lessons/${slug}`).toBe(200);
  const body = (await response.json()) as LessonApiPayload;
  const lesson = body.lesson;
  expect(lesson?.slug).toBe(slug);
  expect(lesson?.grade).toBe(grade);
  expect(lesson?.publisher).toBe("MAINLAND_HJB");
  expect(lesson?.topic?.publisher).toBe("MAINLAND_HJB");
  expect(lesson?.topic?.curriculumProfile?.publisher).toBe("MAINLAND_HJB");
  expect(lesson?.practiceQuestions ?? []).toHaveLength(expectedPracticeCount);
  if (questionIdPattern) {
    expect(
      (lesson?.practiceQuestions ?? []).every((question) => question.publisher === "MAINLAND_HJB" && questionIdPattern.test(question.id)),
      "Lesson checkpoint questions are approved Mainland HJB questions."
    ).toBe(true);
  }

  const blockTypes = new Set((lesson?.blocks ?? []).map((block: { type: string }) => block.type));
  expect(blockTypes.has("concept")).toBe(true);
  expect(blockTypes.has("worked-example")).toBe(true);
  expect(blockTypes.has("checklist")).toBe(true);
  expect(blockTypes.has("teacher-guide")).toBe(true);
  return lesson;
}

async function expectApprovedPracticeQuestions(page: Page, baseURL: string, topicId?: string) {
  const response = await page.request.get(appUrl(baseURL, "/api/questions?grade=S4&publisher=MAINLAND_HJB"));
  expect(response.status(), "GET /api/questions for Mainland HJB S4").toBe(200);
  const body = await response.json();
  const questions = (body.questions ?? []) as PublicQuestion[];
  expect(questions).toHaveLength(2000);
  expect(
    questions.every((question) => question.publisher === "MAINLAND_HJB" || question.curriculumProfile?.publisher === "MAINLAND_HJB"),
    "Practice API stays scoped to Mainland HJB when it returns questions."
  ).toBe(true);
  expect(
    questions.filter((question) => /^hjb-high-ds-v1-/i.test(question.id)).map((question) => question.id),
    "V1 practice question IDs are exposed."
  ).toHaveLength(500);
  expect(
    questions.filter((question) => /^hjb-high-ds-v2-/i.test(question.id)).map((question) => question.id),
    "Owner-approved V2 practice question IDs are exposed."
  ).toHaveLength(500);
  expect(
    questions.filter((question) => /^hjb-high-ds-v3-/i.test(question.id)).map((question) => question.id),
    "Owner-approved V3-remediated practice question IDs are exposed."
  ).toHaveLength(500);
  expect(
    questions.filter((question) => /^hjb-high-ds-v4-/i.test(question.id)).map((question) => question.id),
    "Owner-approved V4-remediated practice question IDs are exposed."
  ).toHaveLength(500);

  if (topicId) {
    const topicResponse = await page.request.get(appUrl(baseURL, `/api/questions?grade=S4&publisher=MAINLAND_HJB&topicId=${encodeURIComponent(topicId)}`));
    expect(topicResponse.status(), `GET /api/questions for Mainland HJB topic ${topicId}`).toBe(200);
    const topicBody = await topicResponse.json();
    const topicQuestions = (topicBody.questions ?? []) as PublicQuestion[];
    expect(topicQuestions.length, "Topic-scoped Practice Arena pool is not empty.").toBeGreaterThanOrEqual(8);
    expect(topicQuestions.every((question) => question.topicId === topicId && /^hjb-high-ds-v[1-4]-/i.test(question.id))).toBe(true);
  }
}

async function expectApprovedJuniorPracticeQuestions(page: Page, baseURL: string, grade: string, topicId?: string) {
  const response = await page.request.get(appUrl(baseURL, `/api/questions?grade=${encodeURIComponent(grade)}&publisher=MAINLAND_HJB`));
  expect(response.status(), `GET /api/questions for Mainland HJB ${grade}`).toBe(200);
  const body = await response.json();
  const questions = (body.questions ?? []) as PublicQuestion[];
  expect(questions).toHaveLength(500);
  expect(questions.every((question) => question.publisher === "MAINLAND_HJB" && /^hjb-junior-ds-v2-/i.test(question.id))).toBe(true);

  if (topicId) {
    const topicResponse = await page.request.get(appUrl(baseURL, `/api/questions?grade=${encodeURIComponent(grade)}&publisher=MAINLAND_HJB&topicId=${encodeURIComponent(topicId)}`));
    expect(topicResponse.status(), `GET /api/questions for Mainland HJB junior topic ${topicId}`).toBe(200);
    const topicBody = await topicResponse.json();
    const topicQuestions = (topicBody.questions ?? []) as PublicQuestion[];
    expect(topicQuestions.length, "Topic-scoped HJB junior Practice Arena pool is not empty.").toBeGreaterThanOrEqual(8);
    expect(topicQuestions.every((question) => question.topicId === topicId && /^hjb-junior-ds-v2-/i.test(question.id))).toBe(true);
  }
}

async function expectStudentLessonPage(page: Page, baseURL: string, slug: string, title: string, expectedPracticeCount = 8) {
  await page.goto(appUrl(baseURL, `/lesson/${encodeURIComponent(slug)}`), { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: localizedTitlePattern(title) })).toBeVisible();
  await expect(page.getByText(/核心概念/).first()).toBeVisible();
  await expect(page.getByText(/练习前检查/).first()).toBeVisible();
  if (expectedPracticeCount > 0) {
    await expect(page.getByText(/第 1 題，共 8 題|第 1 题，共 8 题|Question 1 of 8/i).first()).toBeVisible();
  } else {
    await expect(page.getByText(/暫時未連結練習題|暂时未连结练习题|No linked practice question yet/i).first()).toBeVisible();
  }
  await expect(page.locator(teacherGuideSelector)).toHaveCount(0);
}

async function expectTeacherLessonPage(page: Page, baseURL: string, slug: string, title: string, expectedPracticeCount = 8) {
  await page.goto(appUrl(baseURL, `/lesson/${encodeURIComponent(slug)}`), { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: localizedTitlePattern(title) })).toBeVisible();
  await expect(page.getByText(/核心概念/).first()).toBeVisible();
  await expect(page.getByText(/练习前检查/).first()).toBeVisible();
  if (expectedPracticeCount > 0) {
    await expect(page.getByText(/第 1 題，共 8 題|第 1 题，共 8 题|Question 1 of 8/i).first()).toBeVisible();
  } else {
    await expect(page.getByText(/暫時未連結練習題|暂时未连结练习题|No linked practice question yet/i).first()).toBeVisible();
  }

  const teacherGuide = page.locator(teacherGuideSelector).first();
  await expect(teacherGuide).toBeVisible({ timeout: 15_000 });
}

async function expectHjbPrimaryLessonIllustrationsVisible(
  page: Page,
  baseURL: string,
  topicId: (typeof representativeHjbPrimaryIllustrationTopicIds)[number]
) {
  const topic = mainlandHjbPrimaryTopics.find((candidate) => candidate.id === topicId);
  const concept = getMainlandHjbPrimaryLessonIllustration(topicId, "concept");
  const workedExample = getMainlandHjbPrimaryLessonIllustration(topicId, "worked-example");
  if (!topic) throw new Error(`${topicId} topic exists`);
  if (!concept) throw new Error(`${topicId} concept illustration metadata exists`);
  if (!workedExample) throw new Error(`${topicId} worked-example illustration metadata exists`);

  await page.goto(appUrl(baseURL, `/lesson/${encodeURIComponent(lessonSlugForTopicId(topicId))}`), { waitUntil: "domcontentloaded" });
  await expect(page.locator("main")).toContainText(concept.caption.zhHans ?? concept.caption.zh, { timeout: 45_000 });
  await expect(page.locator(`img[src*="mainland-hjb-primary"][src*="${topicId}"]`)).toHaveCount(2);
  await expect(page.locator("main")).toContainText(workedExample.caption.zhHans ?? workedExample.caption.zh);
}

async function expectNoHjbPrimaryIllustrations(page: Page, baseURL: string, slug: string) {
  await page.goto(appUrl(baseURL, `/lesson/${encodeURIComponent(slug)}`), { waitUntil: "domcontentloaded" });
  await expect(page.locator('img[src*="mainland-hjb-primary"]')).toHaveCount(0);
}

test.describe("Mainland HJB high approved lesson and practice release gate", () => {
  test("serves owner-approved HJB high practice to students and teacher guide to teachers", async ({ browser, baseURL }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chrome", "HJB high release smoke runs once.");
    test.setTimeout(120_000);

    const resolvedBaseURL = baseURL ?? process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${process.env.PLAYWRIGHT_PORT ?? 3020}`;
    let slug = "";
    let title = "";

    const student = await newPage(browser);
    try {
      await registerHjbAccount(student.page, resolvedBaseURL, testInfo, "student");
      await expectHjbSession(student.page, resolvedBaseURL, "student");
      slug = await getStudentHjbLessonSlug(student.page, resolvedBaseURL);
      const lesson = await expectHjbLessonApi(student.page, resolvedBaseURL, slug);
      title = lesson.title?.zhHans ?? lesson.title?.zh ?? lesson.title?.en ?? "";
      expect(title, "HJB lesson title is present").toBeTruthy();
      await expectApprovedPracticeQuestions(student.page, resolvedBaseURL, lesson.topicId);
      await expectStudentLessonPage(student.page, resolvedBaseURL, slug, title);
    } finally {
      await student.context.close();
    }

    const teacher = await newPage(browser);
    try {
      const teacherAccount = await registerHjbAccount(teacher.page, resolvedBaseURL, testInfo, "teacher");
      setUserRole(teacherAccount.session.user.id, "teacher");
      await loginHjbAccount(teacher.page, resolvedBaseURL, teacherAccount.username, teacherAccount.password);
      await expectHjbSession(teacher.page, resolvedBaseURL, "teacher");
      expect(await getTeacherHjbLessonSlug(teacher.page, resolvedBaseURL)).toBe(slug);
      await expectHjbLessonApi(teacher.page, resolvedBaseURL, slug);
      await expectApprovedPracticeQuestions(teacher.page, resolvedBaseURL);
      await expectTeacherLessonPage(teacher.page, resolvedBaseURL, slug, title);
    } finally {
      await teacher.context.close();
    }
  });

  test("serves HJB junior safe-RAG lessons with approved public practice questions", async ({ browser, baseURL }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chrome", "HJB junior practice smoke runs once.");
    test.setTimeout(120_000);

    const resolvedBaseURL = baseURL ?? process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${process.env.PLAYWRIGHT_PORT ?? 3020}`;

    for (const grade of ["S1", "S2", "S3"]) {
      const student = await newPage(browser);
      try {
        await registerHjbAccount(student.page, resolvedBaseURL, testInfo, `junior-${grade}`, grade);
        await expectHjbSession(student.page, resolvedBaseURL, "student", grade);
        const slug = await getStudentHjbLessonSlug(student.page, resolvedBaseURL, grade);
        expect(slug).toMatch(/^hjb-junior-/);
        const lesson = await expectHjbLessonApi(student.page, resolvedBaseURL, slug, grade, 8, /^hjb-junior-ds-v2-/i);
        const title = lesson.title?.zhHans ?? lesson.title?.zh ?? lesson.title?.en ?? "";
        expect(title, `HJB junior ${grade} lesson title is present`).toBeTruthy();
        await expectApprovedJuniorPracticeQuestions(student.page, resolvedBaseURL, grade, lesson.topicId);
        await expectStudentLessonPage(student.page, resolvedBaseURL, slug, title, 8);
      } finally {
        await student.context.close();
      }
    }
  });

  test("shows approved HJB primary Lesson illustrations to students and teachers only on HJB primary lessons", async ({ browser, baseURL }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chrome", "HJB primary illustration smoke runs once.");
    test.setTimeout(180_000);

    const resolvedBaseURL = baseURL ?? process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${process.env.PLAYWRIGHT_PORT ?? 3020}`;

    for (const topicId of representativeHjbPrimaryIllustrationTopicIds) {
      const topic = mainlandHjbPrimaryTopics.find((candidate) => candidate.id === topicId);
      if (!topic) throw new Error(`${topicId} topic exists`);

      const student = await newPage(browser);
      try {
        await registerHjbAccount(student.page, resolvedBaseURL, testInfo, `primary-${topic.grade}-${topicId}`, topic.grade);
        await expectHjbSession(student.page, resolvedBaseURL, "student", topic.grade);
        await expectHjbPrimaryLessonIllustrationsVisible(student.page, resolvedBaseURL, topicId);
      } finally {
        await student.context.close();
      }
    }

    const teacher = await newPage(browser);
    try {
      const teacherAccount = await registerHjbAccount(teacher.page, resolvedBaseURL, testInfo, "primary-illustration-teacher", "P1");
      setUserRole(teacherAccount.session.user.id, "teacher");
      await loginHjbAccount(teacher.page, resolvedBaseURL, teacherAccount.username, teacherAccount.password, "P1");
      await expectHjbSession(teacher.page, resolvedBaseURL, "teacher", "P1");
      for (const topicId of representativeHjbPrimaryIllustrationTopicIds) {
        await expectHjbPrimaryLessonIllustrationsVisible(teacher.page, resolvedBaseURL, topicId);
      }
    } finally {
      await teacher.context.close();
    }

    const anonymous = await newPage(browser);
    try {
      await expectNoHjbPrimaryIllustrations(anonymous.page, resolvedBaseURL, "pep-primary-p1-upper-number-sense");
      await expectNoHjbPrimaryIllustrations(anonymous.page, resolvedBaseURL, "quadratic-functions");
    } finally {
      await anonymous.context.close();
    }
  });
});
