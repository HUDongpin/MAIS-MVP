import {
  expect,
  request as apiRequest,
  test,
  type APIRequestContext,
  type APIResponse
} from "@playwright/test";
import { demoParent, demoStudent, demoTeacher, uniqueSuffix } from "./helpers";
import { startIsolatedApp, type IsolatedApp } from "./isolated-app";

test.setTimeout(240_000);

type HttpMethod = "GET" | "POST" | "PATCH";

type ApiProbe = {
  label: string;
  method: HttpMethod;
  path: string;
  data?: unknown;
};

type LiveSessionPayload = {
  session: {
    id: string;
    joinCode: string;
    currentPrompt?: { id: string };
  };
};

const secretPatterns = [
  /sk-[A-Za-z0-9_-]{16,}/,
  /Bearer\s+[A-Za-z0-9._-]{20,}/i,
  /api[_-]?key["']?\s*[:=]\s*["'][^"']{8,}/i,
  /secret["']?\s*[:=]\s*["'][^"']{8,}/i
];

const teacherApiProbes: ApiProbe[] = [
  { label: "dashboard", method: "GET", path: "/api/teacher/dashboard" },
  { label: "foundation", method: "GET", path: "/api/teacher/foundation" },
  { label: "analytics", method: "GET", path: "/api/teacher/analytics" },
  { label: "analytics follow-up", method: "POST", path: "/api/teacher/analytics/follow-up" },
  { label: "classes list", method: "GET", path: "/api/teacher/classes" },
  { label: "class create", method: "POST", path: "/api/teacher/classes" },
  { label: "class add student", method: "POST", path: "/api/teacher/classes/class-s3a-2026/students" },
  { label: "assignments list", method: "GET", path: "/api/teacher/assignments" },
  { label: "assignment create", method: "POST", path: "/api/teacher/assignments" },
  { label: "assignment detail", method: "GET", path: "/api/teacher/assignments/assignment-quadratics-checkpoint" },
  { label: "submission grade", method: "PATCH", path: "/api/teacher/submissions/submission-quadratics-student-peter" },
  { label: "resources list", method: "GET", path: "/api/teacher/resources" },
  { label: "resource upload", method: "POST", path: "/api/teacher/resources" },
  { label: "resource download", method: "GET", path: "/api/teacher/resources/resource-s3-quadratics-slides/download" },
  { label: "assessments list", method: "GET", path: "/api/teacher/assessments" },
  { label: "assessment create", method: "POST", path: "/api/teacher/assessments" },
  { label: "assessment detail", method: "GET", path: "/api/teacher/assessments/assessment-s3-algebra-quiz" },
  { label: "assessment csv", method: "GET", path: "/api/teacher/assessments/assessment-s3-algebra-quiz/export" },
  { label: "live data", method: "GET", path: "/api/teacher/live" },
  { label: "live start", method: "POST", path: "/api/teacher/live" },
  { label: "live end", method: "PATCH", path: "/api/teacher/live" },
  { label: "question generation", method: "POST", path: "/api/teacher/question-generation" },
  { label: "report preview", method: "GET", path: "/api/teacher/reports/preview?type=class&language=en&classId=class-s3a-2026" },
  { label: "report csv", method: "GET", path: "/api/teacher/reports/export?type=class&language=en&classId=class-s3a-2026" },
  { label: "report pdf", method: "GET", path: "/api/teacher/reports/pdf?type=class&language=en&classId=class-s3a-2026" },
  { label: "report save", method: "POST", path: "/api/teacher/reports/save" },
  { label: "reward award", method: "POST", path: "/api/teacher/rewards/award" },
  { label: "redemption update", method: "PATCH", path: "/api/teacher/rewards/redemptions/reward-redemption-peter-eraser" },
  { label: "teacher gamification", method: "GET", path: "/api/teacher/gamification?classId=class-s3a-2026" },
  { label: "campaign create", method: "POST", path: "/api/teacher/gamification/campaigns" },
  { label: "campaign update", method: "PATCH", path: "/api/teacher/gamification/campaigns/campaign-s3a-steady-week" },
  { label: "inbox list", method: "GET", path: "/api/teacher/inbox" },
  { label: "inbox patch", method: "PATCH", path: "/api/teacher/inbox/message-thread-quadratic-help" },
  { label: "inbox draft", method: "POST", path: "/api/teacher/inbox/message-thread-quadratic-help/draft" },
  { label: "inbox reply", method: "POST", path: "/api/teacher/inbox/message-thread-quadratic-help/reply" }
];

function hasSecretLeak(value: string) {
  return secretPatterns.some((pattern) => pattern.test(value));
}

async function readTextNoSecrets(response: APIResponse, label: string) {
  const text = await response.text().catch(() => "");
  expect(hasSecretLeak(text), `${label} should not leak token-shaped secret values`).toBe(false);
  return text;
}

async function readJsonNoSecrets<T>(response: APIResponse, label: string) {
  const text = await readTextNoSecrets(response, label);
  return JSON.parse(text) as T;
}

async function newContext(app: IsolatedApp) {
  return await apiRequest.newContext({ baseURL: app.baseURL });
}

function expectedUserHeaders(userId: string) {
  return { "X-MAIS-Expected-User-Id": userId };
}

async function loginContext(app: IsolatedApp, username: string, password: string) {
  const context = await newContext(app);
  const response = await context.post("/api/auth/login", {
    data: {
      username,
      password,
      grade: "S3",
      language: "en",
      theme: "light"
    }
  });
  const payload = await readJsonNoSecrets<{ user?: { id?: string; role?: string } }>(response, `login ${username}`);
  expect(response.ok(), `login ${username} failed with ${response.status()}`).toBeTruthy();
  expect(payload.user?.role).toBeTruthy();
  expect(payload.user?.id, `login ${username} must return the authenticated user ID`).toBeTruthy();
  if (!payload.user?.id) throw new Error(`login ${username} did not return a user ID`);
  return { context, userId: payload.user.id };
}

async function sendProbe(context: APIRequestContext, probe: ApiProbe, expectedUserId?: string) {
  const headers = expectedUserId && probe.path.startsWith("/api/teacher/reports/")
    ? expectedUserHeaders(expectedUserId)
    : undefined;
  return await context.fetch(probe.path, {
    method: probe.method,
    data: probe.data,
    headers
  });
}

async function expectNoUnexpectedServerError(response: APIResponse, label: string, allowedProviderStatuses: number[] = []) {
  const status = response.status();
  await readTextNoSecrets(response, label);
  if (allowedProviderStatuses.includes(status)) return status;
  expect(status, `${label} should not return unexpected 5xx`).toBeLessThan(500);
  return status;
}

async function runConcurrent(
  label: string,
  count: number,
  action: (index: number) => Promise<APIResponse>,
  allowedProviderStatuses: number[] = []
) {
  const responses = await Promise.all(Array.from({ length: count }, (_, index) => action(index)));
  const statuses = await Promise.all(responses.map((response, index) =>
    expectNoUnexpectedServerError(response, `${label} #${index + 1}`, allowedProviderStatuses)
  ));
  expect(statuses.every((status) => status < 500 || allowedProviderStatuses.includes(status)), `${label} statuses ${statuses.join(",")}`).toBe(true);
  return statuses;
}

async function disposeAll(contexts: APIRequestContext[]) {
  await Promise.all(contexts.map(async (context) => {
    try {
      await context.dispose();
    } catch {
      // Browser request contexts may already be disposed during a failed worker shutdown.
    }
  }));
}

test.describe("teacher console API stress", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chrome", "API stress writes isolated local data and runs once.");
  });

  test("auth, role boundaries, invalid payloads, exports, and concurrent writes stay below unexpected 5xx", async ({}, testInfo) => {
    test.slow();
    const suffix = uniqueSuffix(testInfo).slice(0, 36);
    const hostileText = [
      `API stress ${suffix}`,
      "中英混合",
      "emoji-🚀",
      "<img src=x onerror=alert('stress')>",
      "x".repeat(500)
    ].join(" | ");
    const app = await startIsolatedApp("teacher-console-api-stress", testInfo);
    const contexts: APIRequestContext[] = [];

    try {
      const unauthenticated = await newContext(app);
      const { context: teacher, userId: teacherUserId } = await loginContext(app, demoTeacher.username, demoTeacher.password);
      const { context: student, userId: studentUserId } = await loginContext(app, demoStudent.username, demoStudent.password);
      const { context: parent, userId: parentUserId } = await loginContext(app, demoParent.username, demoParent.password);
      contexts.push(unauthenticated, teacher, student, parent);

      for (const probe of teacherApiProbes) {
        const anonymousResponse = await sendProbe(unauthenticated, probe);
        await readTextNoSecrets(anonymousResponse, `anonymous ${probe.label}`);
        expect(anonymousResponse.status(), `anonymous ${probe.label}`).toBe(401);

        const studentResponse = await sendProbe(student, probe, studentUserId);
        await readTextNoSecrets(studentResponse, `student ${probe.label}`);
        expect(studentResponse.status(), `student ${probe.label}`).toBe(403);

        const parentResponse = await sendProbe(parent, probe, parentUserId);
        await readTextNoSecrets(parentResponse, `parent ${probe.label}`);
        expect(parentResponse.status(), `parent ${probe.label}`).toBe(403);
      }

      const invalidPayloads: ApiProbe[] = [
        { label: "class empty", method: "POST", path: "/api/teacher/classes", data: {} },
        { label: "class invalid grade", method: "POST", path: "/api/teacher/classes", data: { name: hostileText, grade: "S99", academicYear: "2026-2027" } },
        { label: "add missing student", method: "POST", path: "/api/teacher/classes/class-s3a-2026/students", data: { username: "missing-student@example.test" } },
        { label: "assignment invalid content type", method: "POST", path: "/api/teacher/assignments", data: { classId: "class-s3a-2026", title: hostileText, contentType: "script" } },
        { label: "assignment missing class", method: "POST", path: "/api/teacher/assignments", data: { classId: "missing-class", title: hostileText, contentType: "lesson" } },
        { label: "submission negative score", method: "PATCH", path: "/api/teacher/submissions/submission-quadratics-student-peter", data: { score: -999, feedback: hostileText } },
        { label: "submission huge score", method: "PATCH", path: "/api/teacher/submissions/submission-quadratics-student-peter", data: { score: 10_000, feedback: hostileText } },
        { label: "assessment invalid type", method: "POST", path: "/api/teacher/assessments", data: { classId: "class-s3a-2026", title: hostileText, type: "mega-exam", sourceType: "manual" } },
        { label: "live invalid prompt", method: "POST", path: "/api/teacher/live", data: { classId: "class-s3a-2026", promptType: "poll", question: "" } },
        { label: "reward negative points", method: "POST", path: "/api/teacher/rewards/award", data: { studentId: "student-peter", reasonPresetId: "great-effort", amount: -1, note: hostileText } },
        { label: "redemption invalid transition", method: "PATCH", path: "/api/teacher/rewards/redemptions/reward-redemption-peter-ball-pen", data: { status: "fulfilled", teacherNote: hostileText } },
        { label: "campaign invalid budget", method: "POST", path: "/api/teacher/gamification/campaigns", data: { classId: "class-s3a-2026", budgetPoints: -50, titleEn: hostileText } },
        { label: "inbox empty reply", method: "POST", path: "/api/teacher/inbox/message-thread-quadratic-help/reply", data: { body: "" } },
        { label: "question generation empty prompt", method: "POST", path: "/api/teacher/question-generation", data: { prompt: "" } }
      ];

      for (const probe of invalidPayloads) {
        const response = await sendProbe(teacher, probe);
        await expectNoUnexpectedServerError(response, probe.label);
      }

      const malformedJson = await teacher.fetch("/api/teacher/classes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        data: "{not valid json"
      });
      await expectNoUnexpectedServerError(malformedJson, "malformed JSON class create");
      expect(malformedJson.status()).toBe(400);

      const resourceUpload = await teacher.post("/api/teacher/resources", {
        multipart: {
          title: `Unicode upload ${suffix}`,
          grade: "S3",
          topicId: "quadratic-functions",
          difficulty: "Core",
          type: "document",
          file: {
            name: `stress-${suffix}-中英-🚀.html`,
            mimeType: "text/html",
            buffer: Buffer.from("<script>window.__teacherStress=true</script>", "utf8")
          }
        }
      });
      await expectNoUnexpectedServerError(resourceUpload, "wrong MIME unicode upload");

      const exports = await Promise.all([
        teacher.get("/api/teacher/reports/export?type=class&language=en&classId=class-s3a-2026&remarks=stress", {
          headers: expectedUserHeaders(teacherUserId)
        }),
        teacher.get("/api/teacher/reports/pdf?type=student&language=zh&studentId=student-peter&remarks=stress", {
          headers: expectedUserHeaders(teacherUserId)
        }),
        teacher.get("/api/teacher/assessments/assessment-s3-algebra-quiz/export"),
        teacher.get("/api/teacher/resources/resource-s3-quadratics-slides/download")
      ]);
      for (const [index, response] of exports.entries()) {
        await expectNoUnexpectedServerError(response, `export/download #${index + 1}`);
      }
      expect(exports[0].headers()["content-type"]).toContain("text/csv");
      expect(exports[1].headers()["content-type"]).toContain("application/pdf");
      expect(exports[2].headers()["content-type"]).toContain("text/csv");
      expect(exports[3].headers()["content-disposition"]).toContain("s3-quadratics-intro");

      const studentAssignments = await student.get("/api/assignments");
      await expectNoUnexpectedServerError(studentAssignments, "student assignments read");
      expect(studentAssignments.status()).toBe(200);
      const teacherAssignments = await teacher.get("/api/assignments");
      await expectNoUnexpectedServerError(teacherAssignments, "teacher /api/assignments read");
      expect(teacherAssignments.status()).toBe(200);

      await runConcurrent("5-way class create", 5, (index) =>
        teacher.post("/api/teacher/classes", {
          data: {
            name: `Stress Class 5 ${index} ${suffix}`,
            grade: "S3",
            academicYear: "2026-2027",
            description: hostileText
          }
        })
      );

      await runConcurrent("20-way assignment create", 20, (index) =>
        teacher.post("/api/teacher/assignments", {
          data: {
            classId: "class-s3a-2026",
            title: `Stress Assignment ${index} ${suffix}`,
            description: hostileText,
            contentType: "lesson",
            targetId: "quadratic-functions",
            allowRetake: true,
            showAnswers: false,
            countTowardsGrade: true
          }
        })
      );

      await runConcurrent("50-way class create", 50, (index) =>
        teacher.post("/api/teacher/classes", {
          data: {
            name: `Stress Class 50 ${index} ${suffix}`,
            grade: index % 2 === 0 ? "S3" : "S4",
            academicYear: "2026-2027",
            description: hostileText
          }
        })
      );

      await runConcurrent("20-way submission grade", 20, (index) =>
        teacher.patch("/api/teacher/submissions/submission-quadratics-student-peter", {
          data: { score: index * 7 - 10, feedback: `${hostileText} grade ${index}` }
        })
      );

      await runConcurrent("20-way reward award", 20, (index) =>
        teacher.post("/api/teacher/rewards/award", {
          data: {
            studentId: "student-peter",
            reasonPresetId: index % 2 === 0 ? "great-effort" : "completed-challenge",
            amount: 1 + (index % 5),
            note: `${hostileText} reward ${index}`
          }
        })
      );

      await runConcurrent("20-way inbox patch", 20, (index) =>
        teacher.patch("/api/teacher/inbox/message-thread-quadratic-help", {
          data: { status: index % 2 === 0 ? "open" : "resolved", starred: index % 3 === 0 }
        })
      );

      await runConcurrent("5-way inbox reply", 5, (index) =>
        teacher.post("/api/teacher/inbox/message-thread-quadratic-help/reply", {
          data: { body: `${hostileText} reply ${index}` }
        })
      );

      const liveStart = await teacher.post("/api/teacher/live", {
        data: {
          classId: "class-s3a-2026",
          promptType: "poll",
          question: `Stress live prompt ${suffix}`,
          correctOptionId: "a",
          topicId: "quadratic-patterns"
        }
      });
      const livePayload = await readJsonNoSecrets<LiveSessionPayload>(liveStart, "live start payload");
      expect(liveStart.status()).toBe(201);
      expect(livePayload.session.joinCode).toBeTruthy();
      expect(livePayload.session.currentPrompt?.id).toBeTruthy();

      const liveStudent = await student.get(`/api/classroom/live?code=${encodeURIComponent(livePayload.session.joinCode)}`);
      await expectNoUnexpectedServerError(liveStudent, "student live join");
      expect(liveStudent.status()).toBe(200);

      await runConcurrent("5-way live answer", 5, (index) =>
        student.post("/api/classroom/live", {
          data: {
            sessionId: livePayload.session.id,
            promptId: livePayload.session.currentPrompt?.id,
            answer: index % 2 === 0 ? "a" : "b"
          }
        })
      );

      const liveEnd = await teacher.patch("/api/teacher/live", {
        data: { sessionId: livePayload.session.id, status: "ended" }
      });
      await expectNoUnexpectedServerError(liveEnd, "live end");
      expect(liveEnd.status()).toBe(200);

      const endedJoin = await student.get(`/api/classroom/live?code=${encodeURIComponent(livePayload.session.joinCode)}`);
      await readTextNoSecrets(endedJoin, "ended live join");
      expect.soft(endedJoin.status(), "Ended live join code should no longer be valid for students").toBe(404);
    } finally {
      await disposeAll(contexts);
      await app.attachLogs(testInfo);
      await app.stop();
    }
  });

  test("teacher EdUHK question generation uses live provider env when available and fails redacted when unavailable", async ({}, testInfo) => {
    test.slow();
    const suffix = uniqueSuffix(testInfo).slice(0, 32);
    const app = await startIsolatedApp("teacher-console-eduhk-live-stress", testInfo, {
      liveProviders: true,
      env: {
        EDUHK_LLM_PROVIDER_TIMEOUT_MS: process.env.EDUHK_LLM_PROVIDER_TIMEOUT_MS ?? "45000"
      }
    });
    const contexts: APIRequestContext[] = [];
    const providerStatusLines: string[] = [];

    try {
      const { context: teacher } = await loginContext(app, demoTeacher.username, demoTeacher.password);
      contexts.push(teacher);

      const prompts = [
        `Create one P4 equivalent fractions item. ${suffix}`,
        `Create one S3 quadratic vertex-form item with worked answer. ${"Use bilingual Hong Kong classroom wording. ".repeat(40)} ${suffix}`
      ];

      for (const [index, prompt] of prompts.entries()) {
        const response = await teacher.post("/api/teacher/question-generation", {
          data: { prompt, chatId: `teacher-stress-${suffix}-${index}` },
          timeout: 60_000
        });
        const status = response.status();
        const text = await readTextNoSecrets(response, `EdUHK prompt ${index + 1}`);
        providerStatusLines.push(`prompt-${index + 1}: status=${status}`);
        if (![502, 503].includes(status)) {
          expect(status, `EdUHK prompt ${index + 1} should not return unexpected 5xx`).toBeLessThan(500);
        }
        if (status === 200) {
          const payload = JSON.parse(text) as { questions?: unknown[] };
          expect(payload.questions?.length).toBe(2);
          providerStatusLines.push(`prompt-${index + 1}: generatedQuestions=${payload.questions?.length ?? 0}`);
        } else {
          expect([502, 503]).toContain(status);
        }
      }

      const batchStatuses = await runConcurrent("3-way EdUHK question generation", 3, (index) =>
        teacher.post("/api/teacher/question-generation", {
          data: {
            prompt: `Generate one concise S3 algebra diagnostic item ${index}. ${suffix}`,
            chatId: `teacher-stress-batch-${suffix}-${index}`
          },
          timeout: 60_000
        }),
        [502, 503]
      );
      providerStatusLines.push(`batch: statuses=${batchStatuses.join(",")}`);
    } finally {
      if (providerStatusLines.length) {
        await testInfo.attach("eduhk-status.txt", {
          body: providerStatusLines.join("\n"),
          contentType: "text/plain"
        });
      }
      await disposeAll(contexts);
      await app.attachLogs(testInfo);
      await app.stop();
    }
  });
});
