import { expect, request as apiRequest, test, type APIRequestContext, type APIResponse, type TestInfo } from "@playwright/test";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";

const port = Number(process.env.PLAYWRIGHT_PORT ?? 3020);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`;
const e2eDbPath = path.join(process.cwd(), ".tmp/e2e/hk-math-db.sqlite");

type AuthSession = {
  user: {
    id: string;
    name: string;
    username: string;
    role: "student" | "teacher" | "parent" | "admin";
    grade: string;
    curriculumTrack?: string;
    curriculumProfile?: {
      region?: string;
      publisher?: string;
    };
    schoolId?: string;
    passwordMustChange?: boolean;
  };
  settings: {
    language: string;
    theme: string;
    selectedGrade: string;
  };
};

type TestStudent = {
  context: APIRequestContext;
  id: string;
  name: string;
  username: string;
  password: string;
  userId: string;
};

type AppStateRow = {
  payload: string;
};

type AppStatePayload = {
  users: Array<{
    id: string;
    role: "student" | "teacher" | "parent" | "admin";
    school_id?: string;
  }>;
  adaptive_skill_state?: AdaptiveSkillStateRecord[];
  lesson_progress?: LessonProgressRecord[];
  ai_tutor_usage?: Array<{
    id: string;
    user_id: string;
    model: string;
    prompt_tokens: number | null;
    completion_tokens: number | null;
    total_tokens: number | null;
    error: string | null;
    created_at: string;
  }>;
};

type ProvisioningCredential = {
  role: "student" | "teacher";
  name: string;
  username: string;
  temporaryPassword: string;
  schoolCode: string;
  classCode?: string;
  passwordChangeRequired: true;
};

type ProvisioningBatchResponse = {
  id: string;
  school: {
    id: string;
    code: string;
    name: string;
  };
  totals: {
    schools: number;
    classes: number;
    teachers: number;
    students: number;
    errors: number;
  };
  rows: Array<{
    type: "school" | "class" | "teacher" | "student";
    status: "created" | "valid" | "failed" | "skipped";
    classId?: string;
    classCode?: string;
    username?: string;
    name?: string;
    role?: "student" | "teacher" | "parent" | "admin";
    errors: string[];
  }>;
  credentials: {
    teachers: ProvisioningCredential[];
    studentsByClass: Record<string, ProvisioningCredential[]>;
  };
};

type AdaptiveSkillStateRecord = {
  user_id: string;
  skill_id: string;
  p_mastery: number;
  attempt_count: number;
};

type LessonProgressRecord = {
  user_id: string;
  topic_id: string;
  status: string;
  mastery: number;
};

type AdaptiveQuestionType = "multiple-choice" | "fill-in" | "short-answer" | "graph";

type AdaptiveDecisionResponse = {
  decision: {
    deterministic: boolean;
    action: string;
    confidence: string;
    skill: { id: string; topicId: string; difficulty: string };
    topic: { id: string };
    questions: Array<{ id: string; type: AdaptiveQuestionType; topicId: string; difficulty: string }>;
    explanation: { en: string; zh: string };
    evidence: unknown[];
  };
};

const adaptiveQuestionTypes: AdaptiveQuestionType[] = ["multiple-choice", "fill-in", "short-answer", "graph"];

function uniqueSlug(testInfo: TestInfo, label: string) {
  return `${label}-${Date.now()}-${testInfo.workerIndex}-${testInfo.project.name}-${Math.random().toString(36).slice(2, 8)}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function newApiContext(contexts: APIRequestContext[]) {
  const context = await apiRequest.newContext({ baseURL });
  contexts.push(context);
  return context;
}

async function readJson<T>(response: APIResponse, expectedStatus = 200) {
  expect(response.status()).toBe(expectedStatus);
  return await response.json() as T;
}

async function registerStudent(contexts: APIRequestContext[], testInfo: TestInfo, label: string, grade = "S3") {
  const context = await newApiContext(contexts);
  const id = uniqueSlug(testInfo, label);
  const student = {
    id,
    name: `API Student ${id}`,
    username: `${id}@example.test`,
    password: "start12345"
  };

  const session = await readJson<AuthSession>(
    await context.post("/api/auth/register", {
      data: {
        name: student.name,
        username: student.username,
        email: student.username,
        password: student.password,
        grade,
        curriculumTrack: "HK",
        language: "en",
        theme: "dark"
      }
    })
  );

  expect(session.user.role).toBe("student");
  return { ...student, context, userId: session.user.id } satisfies TestStudent;
}

async function registerParent(contexts: APIRequestContext[], testInfo: TestInfo, label: string) {
  const context = await newApiContext(contexts);
  const id = uniqueSlug(testInfo, label);
  const parent = {
    id,
    name: `API Parent ${id}`,
    email: `${id}@example.test`,
    password: "start12345"
  };

  const session = await readJson<AuthSession>(
    await context.post("/api/auth/register", {
      data: {
        role: "parent",
        name: parent.name,
        email: parent.email,
        password: parent.password,
        language: "en",
        theme: "dark"
      }
    })
  );

  expect(session.user.role).toBe("parent");
  expect(session.user.username).toBe(parent.email);
  return { ...parent, context, userId: session.user.id };
}

async function loginDemoTeacher(contexts: APIRequestContext[]) {
  const context = await newApiContext(contexts);
  const session = await readJson<AuthSession>(
    await context.post("/api/auth/login", {
      data: {
        username: "HK Teacher Chan",
        password: "12345",
        grade: "S3",
        language: "en",
        theme: "dark"
      }
    })
  );

  expect(session.user.role).toBe("teacher");
  return context;
}

async function disposeAll(contexts: APIRequestContext[]) {
  await Promise.all(contexts.map(async (context) => {
    try {
      await context.dispose();
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes("ENOENT")) throw error;
    }
  }));
}

function readAppStatePayload() {
  const sqlite = new DatabaseSync(e2eDbPath);
  try {
    const row = sqlite
      .prepare("SELECT payload FROM app_state WHERE id = ?")
      .get("primary") as AppStateRow | undefined;
    expect(row).toBeTruthy();

    return JSON.parse(row?.payload ?? "{}") as AppStatePayload;
  } finally {
    sqlite.close();
  }
}

function adaptiveStatesFor(userId: string, topicId?: string) {
  return (readAppStatePayload().adaptive_skill_state ?? []).filter((state) => {
    return state.user_id === userId && (!topicId || state.skill_id.startsWith(`${topicId}:`));
  });
}

function questionTypeCounts(questions: Array<{ type: AdaptiveQuestionType }>) {
  const counts = Object.fromEntries(adaptiveQuestionTypes.map((type) => [type, 0])) as Record<AdaptiveQuestionType, number>;
  questions.forEach((question) => {
    counts[question.type] += 1;
  });
  return counts;
}

function adaptiveSnapshot(decision: AdaptiveDecisionResponse["decision"]) {
  return {
    topicId: decision.topic.id,
    skillId: decision.skill.id,
    difficulty: decision.skill.difficulty,
    action: decision.action,
    confidence: decision.confidence,
    questionIds: decision.questions.map((question) => question.id),
    questionMix: questionTypeCounts(decision.questions)
  };
}

function promoteUserToAdmin(userId: string) {
  const sqlite = new DatabaseSync(e2eDbPath);
  try {
    const row = sqlite
      .prepare("SELECT payload FROM app_state WHERE id = ?")
      .get("primary") as AppStateRow | undefined;
    expect(row).toBeTruthy();

    const payload = JSON.parse(row?.payload ?? "{}") as AppStatePayload;
    const user = payload.users.find((candidate) => candidate.id === userId);
    expect(user).toBeTruthy();
    if (!user) return;

    user.role = "admin";
    sqlite
      .prepare("UPDATE app_state SET payload = ?, updated_at = ? WHERE id = ?")
      .run(JSON.stringify(payload), new Date().toISOString(), "primary");
  } finally {
    sqlite.close();
  }
}

function seedAITutorUsage(userId: string, totalTokens: number) {
  const sqlite = new DatabaseSync(e2eDbPath);
  try {
    const row = sqlite
      .prepare("SELECT payload FROM app_state WHERE id = ?")
      .get("primary") as AppStateRow | undefined;
    expect(row).toBeTruthy();

    const payload = JSON.parse(row?.payload ?? "{}") as AppStatePayload;
    payload.ai_tutor_usage = [
      ...(payload.ai_tutor_usage ?? []),
      {
        id: `e2e-ai-tutor-usage-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        user_id: userId,
        model: "e2e-seeded-usage",
        prompt_tokens: null,
        completion_tokens: null,
        total_tokens: totalTokens,
        error: null,
        created_at: new Date().toISOString()
      }
    ];

    sqlite
      .prepare("UPDATE app_state SET payload = ?, updated_at = ? WHERE id = ?")
      .run(JSON.stringify(payload), new Date().toISOString(), "primary");
  } finally {
    sqlite.close();
  }
}

test.describe("backend API integration", () => {
  test.describe.configure({ timeout: 90_000 });

  test("demo Mainland student can switch to HJB during login", async ({}, testInfo) => {
    const contexts: APIRequestContext[] = [];
    test.skip(testInfo.project.name !== "desktop-chrome", "API-only backend suite runs once.");

    try {
      const context = await newApiContext(contexts);
      const session = await readJson<AuthSession>(
        await context.post("/api/auth/login", {
          data: {
            username: "Mainland Student Ludwig",
            password: "12345",
            grade: "S2",
            curriculumTrack: "MAINLAND_PEP_HIGH",
            curriculumProfile: { region: "MAINLAND", publisher: "MAINLAND_HJB" },
            language: "zh-Hans",
            theme: "dark"
          }
        })
      );

      expect(session.user.username).toBe("Mainland Student Ludwig");
      expect(session.user.curriculumTrack).toBe("MAINLAND_PEP_HIGH");
      expect(session.user.curriculumProfile?.publisher).toBe("MAINLAND_HJB");
      expect(session.settings.selectedGrade).toBe("S2");
    } finally {
      await disposeAll(contexts);
    }
  });

  test("auth, student learning APIs, analytics, password reset, and AI tutor boundaries", async ({ page }, testInfo) => {
    const contexts: APIRequestContext[] = [];
    test.skip(testInfo.project.name !== "desktop-chrome", "API-only backend suite runs once.");

    try {
      const anonymous = await newApiContext(contexts);

      expect((await anonymous.get("/api/dashboard")).status()).toBe(401);
      expect((await anonymous.get("/api/analytics/summary?grade=S3")).status()).toBe(401);
      expect((await anonymous.get("/api/adaptive-learning/next?grade=S3")).status()).toBe(401);
      expect((await anonymous.get("/api/questions?grade=invalid")).status()).toBe(400);
      expect((await anonymous.post("/api/attempts", { data: { questionId: "q5", selectedAnswer: "wrong" } })).status()).toBe(401);

      const publicQuestions = await readJson<{ questions: Array<{ id: string; topicId?: string }> }>(
        await anonymous.get("/api/questions?grade=S3")
      );
      expect(publicQuestions.questions.length).toBeGreaterThan(0);
      const questionId = publicQuestions.questions[0].id;

      const student = await registerStudent(contexts, testInfo, "student-backend");
      expect(
        (await anonymous.post("/api/auth/register", {
          data: {
            name: student.name,
            username: student.username,
            email: student.username,
            password: student.password,
            grade: "S3",
            curriculumTrack: "HK"
          }
        })).status()
      ).toBe(409);
      const blockedRoleSuffix = uniqueSlug(testInfo, "blocked-role");
      expect(
        (await anonymous.post("/api/auth/register", {
          data: {
            role: "teacher",
            name: "Public Teacher",
            username: `teacher-${blockedRoleSuffix}@example.test`,
            email: `teacher-${blockedRoleSuffix}@example.test`,
            password: "start12345"
          }
        })).status()
      ).toBe(403);
      expect(
        (await anonymous.post("/api/auth/register", {
          data: {
            role: "admin",
            name: "Public Admin",
            username: `admin-${blockedRoleSuffix}@example.test`,
            email: `admin-${blockedRoleSuffix}@example.test`,
            password: "start12345"
          }
        })).status()
      ).toBe(403);

      const parent = await registerParent(contexts, testInfo, "parent-backend");
      const parentLogin = await readJson<AuthSession>(
        await anonymous.post("/api/auth/login", {
          data: {
            username: parent.email,
            password: parent.password,
            grade: "S3",
            language: "en",
            theme: "dark"
          }
        })
      );
      expect(parentLogin.user.role).toBe("parent");

      const primaryStudent = await registerStudent(contexts, testInfo, "primary-register", "P3");
      const primaryMe = await readJson<AuthSession>(await primaryStudent.context.get("/api/me"));
      expect(primaryMe.user.grade).toBe("P3");
      expect(primaryMe.settings.selectedGrade).toBe("P3");

      const primaryLoginContext = await newApiContext(contexts);
      const primaryLoginSession = await readJson<AuthSession>(
        await primaryLoginContext.post("/api/auth/login", {
          data: {
            username: primaryStudent.username,
            password: primaryStudent.password,
            grade: "P4",
            language: "en",
            theme: "dark"
          }
        })
      );
      expect(primaryLoginSession.user.grade).toBe("P4");
      expect(primaryLoginSession.settings.selectedGrade).toBe("P4");

      const me = await readJson<AuthSession>(await student.context.get("/api/me"));
      expect(me.user.id).toBe(student.userId);

      const settings = await readJson<AuthSession>(
        await student.context.patch("/api/me/settings", {
          data: { language: "zh", theme: "light", selectedGrade: "S3" }
        })
      );
      expect(settings.settings.language).toBe("zh");

      const lesson = await readJson<{ lesson: { slug: string; topic: { id: string } } }>(
        await student.context.get("/api/lessons/quadratic-functions")
      );
      expect(lesson.lesson.slug).toBe("quadratic-functions");
      expect((await student.context.get("/api/lessons/missing-lesson")).status()).toBe(404);

      expect((await student.context.post("/api/learning-events", { data: { events: [{ id: "bad" }] } })).status()).toBe(400);
      const analyticsEvent = {
        id: `${student.id}-page-view`,
        type: "page-view",
        source: "dashboard",
        timestamp: new Date().toISOString(),
        grade: "S3",
        topicId: lesson.lesson.topic.id,
        durationSeconds: 30
      };
      const accepted = await readJson<{ accepted: number }>(
        await student.context.post("/api/learning-events", { data: { events: [analyticsEvent] } })
      );
      expect(accepted.accepted).toBe(1);

      expect((await student.context.post("/api/lesson-progress", { data: { action: "complete" } })).status()).toBe(400);
      const lessonProgress = await readJson<{ lesson: { slug: string; status: string; mastery: number } }>(
        await student.context.post("/api/lesson-progress", {
          data: {
            slug: "quadratic-functions",
            action: "complete",
            durationSeconds: 600,
            checklistState: { intro: true, practice: true }
          }
        })
      );
      expect(lessonProgress.lesson.status).toBe("completed");
      expect(lessonProgress.lesson.mastery).toBeGreaterThanOrEqual(85);

      expect((await student.context.post("/api/visualization-sessions", { data: { moduleId: "coordinate-plane-demo" } })).status()).toBe(400);
      const visualization = await readJson<{ session: { explored: boolean; moduleId: string } }>(
        await student.context.post("/api/visualization-sessions", {
          data: {
            moduleId: "coordinate-plane-demo",
            topicId: "coordinates",
            source: "coordinate-plane"
          }
        })
      );
      expect(visualization.session.explored).toBe(true);

      const attempt = await readJson<{ correct: boolean; correctAnswer?: string }>(
        await student.context.post("/api/attempts", {
          data: {
            questionId,
            selectedAnswer: "__definitely_wrong__",
            durationSeconds: 45
          }
        })
      );
      expect(attempt.correct).toBe(false);
      expect(attempt.correctAnswer).toBeTruthy();

      const activeMistakes = await readJson<{ mistakes: Array<{ question: { id: string }; mastered: boolean }> }>(
        await student.context.get("/api/mistakes?status=active")
      );
      expect(activeMistakes.mistakes.some((mistake) => mistake.question.id === questionId && !mistake.mastered)).toBe(true);

      const mastered = await readJson<{ mistake: { question: { id: string }; mastered: boolean } }>(
        await student.context.patch(`/api/mistakes/${encodeURIComponent(questionId)}`)
      );
      expect(mastered.mistake.mastered).toBe(true);
      const removed = await readJson<{ ok: true; removed: boolean }>(
        await student.context.delete(`/api/mistakes/${encodeURIComponent(questionId)}`)
      );
      expect(removed.removed).toBe(true);

      const dashboard = await readJson<{ dashboard: { gradeTopics: unknown[] } }>(
        await student.context.get("/api/dashboard?grade=S3")
      );
      expect(dashboard.dashboard.gradeTopics.length).toBeGreaterThan(0);

      const progress = await readJson<{ progress: { weeklyActivity: unknown[]; totalMinutes: number } }>(
        await student.context.get("/api/progress?grade=S3&window=7d")
      );
      expect(progress.progress.weeklyActivity.length).toBeGreaterThan(0);
      expect(progress.progress.totalMinutes).toBeGreaterThanOrEqual(0);
      const roadmap = await readJson<{ roadmap: { grade: string; topics: unknown[] } }>(
        await student.context.get("/api/roadmap?grade=S3")
      );
      expect(roadmap.roadmap.grade).toBe("S3");
      expect(roadmap.roadmap.topics.length).toBeGreaterThan(0);

      const adaptiveNext = await readJson<{
        decision: {
          deterministic: boolean;
          action: string;
          skill: { id: string; topicId: string };
          topic: { id: string };
          questions: unknown[];
          explanation: { en: string; zh: string };
          evidence: unknown[];
          evidenceCount: number;
          guardFlags: string[];
          nextReviewAt: string | null;
        };
      }>(await student.context.get("/api/adaptive-learning/next?grade=S3"));
      expect(adaptiveNext.decision.deterministic).toBe(true);
      expect(["review", "repair", "practice", "lesson", "challenge"]).toContain(adaptiveNext.decision.action);
      expect(adaptiveNext.decision.skill.topicId).toBe(adaptiveNext.decision.topic.id);
      expect(adaptiveNext.decision.questions.length).toBeGreaterThan(0);
      expect(adaptiveNext.decision.explanation.en.length).toBeGreaterThan(10);
      expect(adaptiveNext.decision.evidence.length).toBeGreaterThan(0);
      expect(adaptiveNext.decision.evidenceCount).toBe(adaptiveNext.decision.evidence.length);
      expect(adaptiveNext.decision.guardFlags.length).toBeGreaterThan(0);
      expect(adaptiveNext.decision.nextReviewAt === null || typeof adaptiveNext.decision.nextReviewAt === "string").toBe(true);

      const summary = await readJson<{ summary: { eventCount: number } }>(
        await student.context.get("/api/analytics/summary?grade=S3&window=7d")
      );
      expect(summary.summary.eventCount).toBeGreaterThan(0);
      const analyticsExport = await student.context.get("/api/analytics/export?grade=S3&window=7d");
      expect(analyticsExport.status()).toBe(200);
      expect(analyticsExport.headers()["content-disposition"]).toContain("learning-analytics-S3.json");

      const tutorStatus = await readJson<{ configured: boolean; model?: string }>(
        await anonymous.get("/api/ai-tutor/status")
      );
      expect(tutorStatus.configured).toBe(false);
      const guestTutor = await readJson<{ reply: string; mode: string }>(
        await anonymous.post("/api/ai-tutor", { data: { input: "Help me.", language: "en" } })
      );
      expect(guestTutor.mode).toBe("registration-required");
      expect(guestTutor.reply).toContain("register or sign in");
      expect((await student.context.post("/api/ai-tutor", { data: {} })).status()).toBe(400);

      const tutorPayload = {
        input: "Give one hint.",
        context: { mode: "general", title: "API boundary test" },
        grade: "S3",
        language: "en",
        page: "/practice"
      };
      expect((await student.context.post("/api/ai-tutor", { data: tutorPayload })).status()).toBe(503);
      expect((await student.context.post("/api/ai-tutor", { data: { ...tutorPayload, input: "One more hint." } })).status()).toBe(503);
      const rateLimited = await student.context.post("/api/ai-tutor", {
        data: { ...tutorPayload, input: "Third hint should be limited." }
      });
      expect(rateLimited.status()).toBe(429);
      expect(rateLimited.headers()["retry-after"]).toBeTruthy();

      const quotaStudent = await registerStudent(contexts, testInfo, "ai-quota-student");
      seedAITutorUsage(quotaStudent.userId, 200_000_000);
      const quotaExceeded = await readJson<{ reply: string; mode: string; quota: { limitTokens: number; usedTokens: number } }>(
        await quotaStudent.context.post("/api/ai-tutor", { data: tutorPayload })
      );
      expect(quotaExceeded.mode).toBe("quota-exceeded");
      expect(quotaExceeded.reply).toContain("quota");
      expect(quotaExceeded.quota.limitTokens).toBe(200_000_000);
      expect(quotaExceeded.quota.usedTokens).toBeGreaterThanOrEqual(200_000_000);

      const resetRequest = await readJson<{ ok: true; resetUrl?: string }>(
        await anonymous.post("/api/auth/password-reset/request", {
          data: { identifier: student.username }
        })
      );
      expect(resetRequest.resetUrl).toBeTruthy();
      const token = new URL(resetRequest.resetUrl ?? "").searchParams.get("token");
      expect(token).toBeTruthy();

      const nextPassword = "next12345";
      const resetConfirm = await readJson<AuthSession>(
        await anonymous.post("/api/auth/password-reset/confirm", {
          data: { token, password: nextPassword }
        })
      );
      expect(resetConfirm.user.id).toBe(student.userId);
      expect((await anonymous.post("/api/auth/login", { data: { username: student.username, password: student.password } })).status()).toBe(401);
      expect((await anonymous.post("/api/auth/login", { data: { username: student.username, password: nextPassword } })).status()).toBe(200);

      const logout = await readJson<{ ok: true }>(await student.context.post("/api/auth/logout"));
      expect(logout.ok).toBe(true);
    } finally {
      await disposeAll(contexts);
    }
  });

  test("Practice Arena adaptive set uses completed lesson outcomes as engine evidence", async ({}, testInfo) => {
    const contexts: APIRequestContext[] = [];
    test.skip(testInfo.project.name !== "desktop-chrome", "API-only backend suite runs once.");

    try {
      const student = await registerStudent(contexts, testInfo, "practice-lesson-outcome", "S3");

      const baseline = await readJson<AdaptiveDecisionResponse>(
        await student.context.get("/api/adaptive-learning/next?grade=S3&topicId=polynomials")
      );
      expect(baseline.decision.deterministic).toBe(true);
      expect(baseline.decision.topic.id).toBe("polynomials");
      expect(baseline.decision.skill.id).toBe("polynomials:foundation");
      expect(baseline.decision.skill.difficulty).toBe("Foundation");
      expect(adaptiveStatesFor(student.userId, "polynomials")).toEqual([]);

      const baselineSnapshot = adaptiveSnapshot(baseline.decision);
      const lessonPracticeAttempt = await readJson<{ correct: boolean }>(
        await student.context.post("/api/attempts", {
          data: {
            questionId: "supp-polynomials-key-fact",
            selectedAnswer: "7x^2",
            durationSeconds: 35
          }
        })
      );
      expect(lessonPracticeAttempt.correct).toBe(true);

      const beforeCompletionStates = adaptiveStatesFor(student.userId, "polynomials");
      const beforeFoundation = beforeCompletionStates.find((state) => state.skill_id === "polynomials:foundation");
      expect(beforeFoundation?.attempt_count).toBe(1);
      expect(beforeFoundation?.p_mastery ?? 0).toBeLessThan(0.85);

      const completedLesson = await readJson<{ lesson: { slug: string; status: string; mastery: number } }>(
        await student.context.post("/api/lesson-progress", {
          data: {
            slug: "polynomials",
            action: "complete",
            durationSeconds: 540,
            checklistState: { concept: true, practice: true, reflection: true }
          }
        })
      );
      expect(completedLesson.lesson.status).toBe("completed");
      expect(completedLesson.lesson.mastery).toBeGreaterThanOrEqual(85);

      const afterCompletionStates = adaptiveStatesFor(student.userId, "polynomials");
      const afterFoundation = afterCompletionStates.find((state) => state.skill_id === "polynomials:foundation");
      expect(afterFoundation?.attempt_count).toBe((beforeFoundation?.attempt_count ?? 0) + 2);
      expect(afterFoundation?.p_mastery ?? 0).toBeGreaterThan(0.85);

      const repeatedCompletion = await readJson<{ lesson: { status: string } }>(
        await student.context.post("/api/lesson-progress", {
          data: {
            slug: "polynomials",
            action: "complete",
            durationSeconds: 600,
            checklistState: { concept: true, practice: true, reflection: true }
          }
        })
      );
      expect(repeatedCompletion.lesson.status).toBe("completed");
      expect(adaptiveStatesFor(student.userId, "polynomials").find((state) => state.skill_id === "polynomials:foundation")?.attempt_count)
        .toBe(afterFoundation?.attempt_count);

      const afterCompletion = await readJson<AdaptiveDecisionResponse>(
        await student.context.get("/api/adaptive-learning/next?grade=S3&topicId=polynomials")
      );
      const afterCompletionSnapshot = adaptiveSnapshot(afterCompletion.decision);
      expect(afterCompletion.decision.deterministic).toBe(true);
      expect(afterCompletion.decision.topic.id).toBe("polynomials");
      expect(afterCompletion.decision.skill.id).toBe("polynomials:fluency");
      expect(afterCompletion.decision.skill.difficulty).toBe("Core");
      expect(afterCompletionSnapshot).not.toEqual(baselineSnapshot);
      expect(afterCompletionSnapshot.questionMix).not.toEqual(baselineSnapshot.questionMix);
    } finally {
      await disposeAll(contexts);
    }
  });

  test("teacher, classroom, resource, assessment, reports, messaging, and admin APIs", async ({ page }, testInfo) => {
    const contexts: APIRequestContext[] = [];
    test.skip(testInfo.project.name !== "desktop-chrome", "API-only backend suite runs once.");

    try {
      const anonymous = await newApiContext(contexts);
      const teacher = await loginDemoTeacher(contexts);
      const student = await registerStudent(contexts, testInfo, "teacher-flow-student");
      const joinStudent = await registerStudent(contexts, testInfo, "join-flow-student");
      const outsideStudent = await registerStudent(contexts, testInfo, "outside-live-student");

      expect((await anonymous.get("/api/teacher/dashboard")).status()).toBe(401);
      expect((await student.context.get("/api/teacher/dashboard")).status()).toBe(403);

      await readJson<{ foundation: { classes: unknown[] } }>(await teacher.get("/api/teacher/foundation"));
      await readJson<{ dashboard: { teacher: unknown } }>(await teacher.get("/api/teacher/dashboard"));

      const createdClass = await readJson<{ class: { id: string; inviteCode: string; grade: string } }>(
        await teacher.post("/api/teacher/classes", {
          data: {
            name: `API S3 Class ${uniqueSlug(testInfo, "class")}`,
            grade: "S3",
            academicYear: "2026-2027",
            description: "Backend API integration class"
          }
        }),
        201
      );
      const classId = createdClass.class.id;
      expect(createdClass.class.inviteCode).toBeTruthy();

      expect((await teacher.post(`/api/teacher/classes/${classId}/students`, { data: {} })).status()).toBe(400);
      await readJson<{ ok: true }>(
        await teacher.post(`/api/teacher/classes/${classId}/students`, {
          data: { username: student.username }
        }),
        201
      );
      const enrollments = await readJson<{ enrollments: Array<{ studentId: string }> }>(
        await teacher.get(`/api/teacher/classes/${classId}/students`)
      );
      expect(enrollments.enrollments.some((enrollment) => enrollment.studentId === student.userId)).toBe(true);

      const joinResult = await readJson<{ status: "joined" | "duplicate"; class: { id: string } }>(
        await joinStudent.context.post("/api/classes/join", {
          data: { inviteCode: createdClass.class.inviteCode }
        })
      );
      expect(joinResult.status).toBe("joined");
      expect(joinResult.class.id).toBe(classId);
      const duplicateJoin = await readJson<{ status: "duplicate" }>(
        await joinStudent.context.post("/api/classes/join", {
          data: { inviteCode: createdClass.class.inviteCode }
        })
      );
      expect(duplicateJoin.status).toBe("duplicate");

      const analytics = await readJson<{ analytics: { classes: unknown[] } }>(
        await teacher.get(`/api/teacher/analytics?classId=${encodeURIComponent(classId)}`)
      );
      expect(analytics.analytics.classes.length).toBeGreaterThan(0);
      await readJson<{ assignment: { id: string } }>(
        await teacher.post("/api/teacher/analytics/follow-up", {
          data: {
            classId,
            studentIds: [student.userId],
            title: "API follow-up practice",
            description: "Created from backend API test",
            targetId: "quadratic-functions"
          }
        }),
        201
      );

      const uploadBody = Buffer.from("Backend resource fixture", "utf8");
      const resource = await readJson<{ resource: { id: string; fileName: string } }>(
        await teacher.post("/api/teacher/resources", {
          multipart: {
            title: "API resource fixture",
            grade: "S3",
            topicId: "quadratic-patterns",
            difficulty: "Core",
            type: "document",
            file: {
              name: "api-resource.pdf",
              mimeType: "application/pdf",
              buffer: uploadBody
            }
          }
        }),
        201
      );
      await readJson<{ resources: Array<{ id: string }> }>(await teacher.get("/api/teacher/resources"));
      const teacherDownload = await teacher.get(`/api/teacher/resources/${resource.resource.id}/download`);
      expect(teacherDownload.status()).toBe(200);
      expect(teacherDownload.headers()["content-disposition"]).toContain(resource.resource.fileName);
      expect(Buffer.from(await teacherDownload.body()).toString("utf8")).toContain("Backend resource fixture");

      const resourceAssignment = await readJson<{ assignment: { id: string } }>(
        await teacher.post("/api/teacher/assignments", {
          data: {
            classId,
            studentIds: [student.userId],
            title: "Read the API resource",
            description: "Open the attached resource.",
            contentType: "resource",
            targetId: resource.resource.id,
            allowRetake: true,
            showAnswers: false,
            countTowardsGrade: true
          }
        }),
        201
      );
      const assignmentDetail = await readJson<{ assignment: { submissions: Array<{ id: string; studentId: string }> } }>(
        await teacher.get(`/api/teacher/assignments/${resourceAssignment.assignment.id}`)
      );
      const submission = assignmentDetail.assignment.submissions.find((item) => item.studentId === student.userId);
      expect(submission).toBeTruthy();

      await readJson<{ data: { resource: { id: string } } }>(
        await student.context.get(`/api/resources/${resource.resource.id}`)
      );
      await readJson<{ resource: { id: string } }>(
        await student.context.post(`/api/resources/${resource.resource.id}`)
      );
      const studentDownload = await student.context.get(`/api/resources/${resource.resource.id}/download`);
      expect(studentDownload.status()).toBe(200);
      expect(Buffer.from(await studentDownload.body()).toString("utf8")).toContain("Backend resource fixture");

      if (submission) {
        const graded = await readJson<{ submission: { status: string; score: number } }>(
          await teacher.patch(`/api/teacher/submissions/${submission.id}`, {
            data: { score: 88, feedback: "Strong completion." }
          })
        );
        expect(graded.submission.status).toBe("graded");
        expect(graded.submission.score).toBe(88);
      }

      const assessment = await readJson<{ assessment: { id: string } }>(
        await teacher.post("/api/teacher/assessments", {
          data: {
            classId,
            title: "API manual quiz",
            type: "quiz",
            sourceType: "manual",
            manualQuestions: [
              {
                id: "manual-1",
                prompt: { en: "What is 2 + 2?", zh: "2 + 2 是多少？" },
                answer: "4",
                points: 10
              }
            ],
            maxAttempts: 2,
            randomizeQuestionOrder: false,
            showAnswersImmediately: true,
            gradeWeight: 10
          }
        }),
        201
      );
      await readJson<{ assessments: Array<{ id: string }> }>(await teacher.get("/api/teacher/assessments"));
      await readJson<{ assessment: { assessment: { id: string } } }>(
        await teacher.get(`/api/teacher/assessments/${assessment.assessment.id}`)
      );

      const studentAssessment = await readJson<{ data: { questions: Array<{ id: string }>; canSubmit: boolean } }>(
        await student.context.get(`/api/assessments/${assessment.assessment.id}`)
      );
      expect(studentAssessment.data.canSubmit).toBe(true);
      expect(studentAssessment.data.questions[0].id).toBe("manual-1");
      const assessmentSubmission = await readJson<{ submission: { id: string; status: string; score: number } }>(
        await student.context.post(`/api/assessments/${assessment.assessment.id}/submit`, {
          data: { answers: [{ questionId: "manual-1", answer: "4" }] }
        })
      );
      expect(assessmentSubmission.submission.status).toBe("graded");
      expect(assessmentSubmission.submission.score).toBe(10);

      const assessmentCsv = await teacher.get(`/api/teacher/assessments/${assessment.assessment.id}/export`);
      expect(assessmentCsv.status()).toBe(200);
      expect(assessmentCsv.headers()["content-type"]).toContain("text/csv");

      const reportQuery = `type=class&language=en&classId=${encodeURIComponent(classId)}&remarks=API%20test`;
      await readJson<{ preview: { title: string } }>(await teacher.get(`/api/teacher/reports/preview?${reportQuery}`));
      const reportCsv = await teacher.get(`/api/teacher/reports/export?${reportQuery}`);
      expect(reportCsv.status()).toBe(200);
      expect(reportCsv.headers()["content-type"]).toContain("text/csv");
      const reportPdf = await teacher.get(`/api/teacher/reports/pdf?${reportQuery}`);
      expect(reportPdf.status()).toBe(200);
      expect(reportPdf.headers()["content-type"]).toContain("application/pdf");
      await readJson<{ report: { id: string } }>(
        await teacher.post("/api/teacher/reports/save", {
          data: { type: "class", language: "en", classId, remarks: "API test" }
        }),
        201
      );

      const messageThread = await readJson<{ thread: { id: string } }>(
        await student.context.post("/api/messages", {
          data: {
            classId,
            subject: "Need help with API test",
            body: "Can you check my working?",
            priority: "urgent"
          }
        }),
        201
      );
      await readJson<{ data: { threads: unknown[] } }>(await student.context.get("/api/messages"));
      await readJson<{ inbox: { selectedThread: { id: string } } }>(
        await teacher.get(`/api/teacher/inbox?thread=${encodeURIComponent(messageThread.thread.id)}`)
      );
      const draft = await readJson<{ draft: string }>(
        await teacher.post(`/api/teacher/inbox/${messageThread.thread.id}/draft`)
      );
      expect(draft.draft.length).toBeGreaterThan(20);
      await readJson<{ thread: { id: string } }>(
        await teacher.post(`/api/teacher/inbox/${messageThread.thread.id}/reply`, {
          data: { body: "Thanks, please show the first algebra step." }
        }),
        201
      );
      const patchedThread = await readJson<{ thread: { status: string; starred: boolean } }>(
        await teacher.patch(`/api/teacher/inbox/${messageThread.thread.id}`, {
          data: { status: "resolved", starred: true }
        })
      );
      expect(patchedThread.thread.status).toBe("resolved");
      expect(patchedThread.thread.starred).toBe(true);
      await readJson<{ thread: { id: string } }>(
        await student.context.post(`/api/messages/${messageThread.thread.id}/reply`, {
          data: { body: "I will send it now." }
        })
      );

      const live = await readJson<{ session: { id: string; joinCode: string; currentPrompt: { id: string } } }>(
        await teacher.post("/api/teacher/live", {
          data: {
            classId,
            promptType: "poll",
            question: "What is the axis of symmetry?",
            correctOptionId: "b",
            topicId: "quadratic-patterns"
          }
        }),
        201
      );
      const teacherPreview = await readJson<{ session: { id: string; viewerMode: string; canSubmit: boolean; submitted: boolean } }>(
        await teacher.get(`/api/classroom/live?code=${encodeURIComponent(live.session.joinCode)}`)
      );
      expect(teacherPreview.session.id).toBe(live.session.id);
      expect(teacherPreview.session.viewerMode).toBe("teacher-preview");
      expect(teacherPreview.session.canSubmit).toBe(false);
      expect(teacherPreview.session.submitted).toBe(false);
      expect((await teacher.post("/api/classroom/live", {
        data: {
          sessionId: live.session.id,
          promptId: live.session.currentPrompt.id,
          answer: "b"
        }
      })).status()).toBe(403);
      const liveBeforeStudentSubmission = await readJson<{ live: { activeSession: { responseSummary: { totalSubmissions: number } } } }>(
        await teacher.get("/api/teacher/live")
      );
      expect(liveBeforeStudentSubmission.live.activeSession.responseSummary.totalSubmissions).toBe(0);
      expect((await outsideStudent.context.get(`/api/classroom/live?code=${encodeURIComponent(live.session.joinCode)}`)).status()).toBe(404);

      const classroom = await readJson<{ session: { id: string; currentPrompt: { id: string }; viewerMode: string; canSubmit: boolean } }>(
        await student.context.get(`/api/classroom/live?code=${encodeURIComponent(live.session.joinCode)}`)
      );
      expect(classroom.session.id).toBe(live.session.id);
      expect(classroom.session.viewerMode).toBe("student");
      expect(classroom.session.canSubmit).toBe(true);
      await readJson<{ session: { id: string } }>(
        await student.context.post("/api/classroom/live", {
          data: {
            sessionId: live.session.id,
            promptId: live.session.currentPrompt.id,
            answer: "b"
          }
        })
      );
      const endedLive = await readJson<{ session: { status: string } }>(
        await teacher.patch("/api/teacher/live", {
          data: { sessionId: live.session.id, status: "ended" }
        })
      );
      expect(endedLive.session.status).toBe("ended");

      expect((await teacher.get("/api/admin/storage/export")).status()).toBe(403);
      expect((await teacher.get("/api/admin/storage/health")).status()).toBe(403);
      const admin = await registerStudent(contexts, testInfo, "admin-promote");
      promoteUserToAdmin(admin.userId);
      const storageHealth = await readJson<{
        storage: {
          provider: string;
          status: "demo-only" | "durable-ready";
          durableReady: boolean;
          configuredPath: boolean;
          usingTmpFallback: boolean;
        };
      }>(await admin.context.get("/api/admin/storage/health"));
      expect(storageHealth.storage.provider).toBe("sqlite");
      expect(storageHealth.storage.status).toBe("durable-ready");
      expect(storageHealth.storage.durableReady).toBe(true);
      expect(storageHealth.storage.configuredPath).toBe(true);
      expect(storageHealth.storage.usingTmpFallback).toBe(false);
      const snapshot = await readJson<{ schemaVersion: number; storage: { provider: string }; database: { users: unknown[] } }>(
        await admin.context.get("/api/admin/storage/export")
      );
      expect(snapshot.schemaVersion).toBe(1);
      expect(snapshot.storage.provider).toBe("sqlite");
      expect(snapshot.database.users.length).toBeGreaterThan(0);

      expect((await teacher.post("/api/admin/provisioning/validate", { data: {} })).status()).toBe(403);

      const schoolCode = uniqueSlug(testInfo, "bulk-school").replace(/-/g, "").slice(0, 10).toUpperCase();
      const provisioningPayload = {
        school: {
          name: `Bulk Test School ${schoolCode}`,
          code: schoolCode,
          academicYear: "2026-2027",
          contactName: "Operations Lead",
          contactEmail: `ops-${schoolCode.toLowerCase()}@example.edu.hk`
        },
        classes: [
          {
            classCode: "S1A",
            name: "S1A Mathematics",
            grade: "S1",
            academicYear: "2026-2027"
          }
        ],
        teachers: [
          {
            name: "Provisioned Teacher",
            email: `teacher-${schoolCode.toLowerCase()}@example.edu.hk`,
            classCodes: ["S1A"]
          }
        ],
        students: [
          {
            name: "Provisioned Student One",
            grade: "S1",
            classCode: "S1A",
            studentNo: "001",
            email: `student-001-${schoolCode.toLowerCase()}@example.edu.hk`
          },
          {
            name: "Provisioned Student Two",
            grade: "S1",
            classCode: "S1A",
            studentNo: "002"
          }
        ]
      };

      const invalidProvisioning = await readJson<{ validation: { valid: boolean; errors: string[]; totals: { errors: number } } }>(
        await admin.context.post("/api/admin/provisioning/validate", {
          data: {
            ...provisioningPayload,
            students: [
              provisioningPayload.students[0],
              { ...provisioningPayload.students[1], grade: "BAD" }
            ]
          }
        })
      );
      expect(invalidProvisioning.validation.valid).toBe(false);
      expect(invalidProvisioning.validation.totals.errors).toBeGreaterThan(0);
      expect(invalidProvisioning.validation.errors.join(" ")).toContain("Student grade is invalid");

      const provisioningValidation = await readJson<{ validation: { valid: boolean; totals: { teachers: number; students: number; errors: number } } }>(
        await admin.context.post("/api/admin/provisioning/validate", { data: provisioningPayload })
      );
      expect(provisioningValidation.validation.valid).toBe(true);
      expect(provisioningValidation.validation.totals.teachers).toBe(1);
      expect(provisioningValidation.validation.totals.students).toBe(2);
      expect(provisioningValidation.validation.totals.errors).toBe(0);

      const provisioning = await readJson<{ batch: ProvisioningBatchResponse }>(
        await admin.context.post("/api/admin/provisioning/batches", { data: provisioningPayload }),
        201
      );
      expect(provisioning.batch.totals.classes).toBe(1);
      expect(provisioning.batch.totals.teachers).toBe(1);
      expect(provisioning.batch.totals.students).toBe(2);
      const importedClassId = provisioning.batch.rows.find((row) => row.type === "class" && row.classCode === "S1A")?.classId;
      expect(importedClassId).toBeTruthy();
      expect(provisioning.batch.credentials.teachers).toHaveLength(1);
      expect(provisioning.batch.credentials.studentsByClass.S1A).toHaveLength(2);

      const batchDetail = await readJson<{ batch: ProvisioningBatchResponse }>(
        await admin.context.get(`/api/admin/provisioning/batches/${encodeURIComponent(provisioning.batch.id)}`)
      );
      expect(batchDetail.batch.id).toBe(provisioning.batch.id);
      expect(batchDetail.batch.school.code).toBe(schoolCode);

      const credentialExport = await admin.context.get(`/api/admin/provisioning/batches/${encodeURIComponent(provisioning.batch.id)}/export`);
      expect(credentialExport.status()).toBe(200);
      expect(credentialExport.headers()["content-disposition"]).toContain("mais-provisioning");
      const credentialCsv = await credentialExport.text();
      expect(credentialCsv).toContain("temporaryPassword");
      expect(credentialCsv).toContain("Provisioned Student One");

      expect((await teacher.get(`/api/teacher/classes/${encodeURIComponent(importedClassId ?? "")}/students`)).status()).toBe(404);

      const provisionedTeacher = provisioning.batch.credentials.teachers[0];
      const provisionedTeacherContext = await newApiContext(contexts);
      const provisionedTeacherSession = await readJson<AuthSession>(
        await provisionedTeacherContext.post("/api/auth/login", {
          data: {
            username: provisionedTeacher.username,
            password: provisionedTeacher.temporaryPassword,
            grade: "S1",
            language: "en",
            theme: "dark"
          }
        })
      );
      expect(provisionedTeacherSession.user.role).toBe("teacher");
      expect(provisionedTeacherSession.user.passwordMustChange).toBe(true);
      await readJson<{ enrollments: Array<{ studentName: string }> }>(
        await provisionedTeacherContext.get(`/api/teacher/classes/${encodeURIComponent(importedClassId ?? "")}/students`)
      );
      const nextProvisionedTeacherPassword = `Teacher-${schoolCode}-12345`;
      await page.goto("/login");
      await page.getByLabel(/email or username/i).fill(provisionedTeacher.username);
      await page.getByLabel(/^password$/i).fill(provisionedTeacher.temporaryPassword);
      await page.getByRole("button", { name: /^log in$/i }).click();
      await expect(page).toHaveURL(/\/change-password\?next=/);
      await page.getByLabel(/temporary password/i).fill(provisionedTeacher.temporaryPassword);
      await page.getByLabel(/^new password$/i).fill(nextProvisionedTeacherPassword);
      await page.getByLabel(/confirm new password/i).fill(nextProvisionedTeacherPassword);
      await page.getByRole("button", { name: /update password/i }).click();
      await expect(page).toHaveURL(/\/teacher/);
      expect((await anonymous.post("/api/auth/login", {
        data: {
          username: provisionedTeacher.username,
          password: provisionedTeacher.temporaryPassword,
          grade: "S1"
        }
      })).status()).toBe(401);

      const provisionedStudent = provisioning.batch.credentials.studentsByClass.S1A[0];
      const provisionedStudentContext = await newApiContext(contexts);
      const temporaryLogin = await readJson<AuthSession>(
        await provisionedStudentContext.post("/api/auth/login", {
          data: {
            username: provisionedStudent.username,
            password: provisionedStudent.temporaryPassword,
            grade: "S1",
            language: "en",
            theme: "dark"
          }
        })
      );
      expect(temporaryLogin.user.role).toBe("student");
      expect(temporaryLogin.user.schoolId).toBe(provisioning.batch.school.id);
      expect(temporaryLogin.user.passwordMustChange).toBe(true);

      const nextProvisionedPassword = `Next-${schoolCode}-12345`;
      const changedPassword = await readJson<AuthSession>(
        await provisionedStudentContext.post("/api/auth/password-change", {
          data: {
            currentPassword: provisionedStudent.temporaryPassword,
            password: nextProvisionedPassword
          }
        })
      );
      expect(changedPassword.user.passwordMustChange).toBe(false);
      expect((await anonymous.post("/api/auth/login", {
        data: {
          username: provisionedStudent.username,
          password: provisionedStudent.temporaryPassword,
          grade: "S1"
        }
      })).status()).toBe(401);
      const finalProvisionedLogin = await readJson<AuthSession>(
        await anonymous.post("/api/auth/login", {
          data: {
            username: provisionedStudent.username,
            password: nextProvisionedPassword,
            grade: "S1",
            language: "en",
            theme: "dark"
          }
        })
      );
      expect(finalProvisionedLogin.user.passwordMustChange).toBe(false);
    } finally {
      await disposeAll(contexts);
    }
  });
});
