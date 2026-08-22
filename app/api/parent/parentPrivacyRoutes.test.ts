import assert from "node:assert/strict";
import test from "node:test";

import { defaultCurriculumProfile } from "@/lib/curriculumProfile";
import {
  createParentFoundationPersistenceStore,
  type ParentFoundationPersistenceDatabase
} from "@/lib/server/userStore/parentFoundationPersistence";
import {
  createParentNoticePersistenceStore,
  type ParentNoticePersistenceDatabase
} from "@/lib/server/userStore/parentNoticePersistence";
import {
  createParentReportPersistenceStore,
  type ParentReportPersistenceDatabase
} from "@/lib/server/userStore/parentReportPersistence";
import type { GuardianLink, ParentChildSummary, StudentSession } from "@/types";

type ParentGetHandler = (
  request: Request,
  context?: { params: Promise<{ studentId: string }> }
) => Promise<Response>;

type ParentRuntimeHandler = (
  request: Request,
  context?: { params: Promise<Record<string, string>> }
) => Promise<Response>;

const privateHeaders = ["cache-control", "cdn-cache-control", "vercel-cdn-cache-control"] as const;

async function requireStableUnavailableResponse(
  operation: () => Promise<Response>,
  label: string,
  sensitiveDiagnostic: string
) {
  const outcome = await operation().then(
    (response) => ({ response }),
    (error: unknown) => ({ error })
  );

  if (!("response" in outcome)) {
    const detail = outcome.error instanceof Error ? outcome.error.message : String(outcome.error);
    assert.fail(`${label} escaped its stable failure boundary: ${detail}`);
  }

  assert.equal(outcome.response.status, 503, `${label} must map unexpected failure to 503`);
  const body = await outcome.response.json();
  assert.deepEqual(body, { error: "Parent data temporarily unavailable." });
  assert.doesNotMatch(JSON.stringify(body), new RegExp(sensitiveDiagnostic));
  for (const header of privateHeaders) {
    assert.equal(outcome.response.headers.get(header), "private, no-store", `${label} ${header}`);
  }
}

async function assertPrivateNotFound(
  response: Response,
  error: string,
  sensitiveValues: string[] = []
) {
  assert.equal(response.status, 404);
  const body = await response.json();
  assert.deepEqual(body, { error });
  for (const sensitiveValue of sensitiveValues) {
    assert.doesNotMatch(JSON.stringify(body), new RegExp(sensitiveValue));
  }
  for (const header of privateHeaders) {
    assert.equal(response.headers.get(header), "private, no-store");
  }
}

function filterTestChild(studentId: string) {
  return { student: { id: studentId } } as ParentChildSummary;
}

function createFilterRuntimeStores() {
  const foundationDatabase: ParentFoundationPersistenceDatabase = {
    guardian_links: [{
      id: "link-1",
      parent_id: "parent-1",
      student_id: "student-1",
      status: "active",
      created_at: "2026-08-23T00:00:00.000Z"
    }],
    teacher_messages: [],
    teacher_reports: [],
    users: [
      { id: "parent-1", role: "parent" },
      { id: "admin-1", role: "admin" },
      { id: "student-1", role: "student" },
      { id: "student-other-family", role: "student" }
    ]
  };
  const foundation = createParentFoundationPersistenceStore({
    readDatabase: async () => foundationDatabase,
    buildParentChildSummary: (_database, studentId) => filterTestChild(studentId),
    toGuardianLink: () => ({}) as GuardianLink,
    toParentSession: (_database, user) => ({ id: user.id, role: user.role }) as StudentSession
  });

  const reportDatabase: ParentReportPersistenceDatabase = {
    guardian_links: [{ parent_id: "parent-1", student_id: "student-1", status: "active" }],
    teacher_reports: [],
    users: [
      { id: "parent-1", role: "parent" },
      { id: "admin-1", role: "admin" }
    ]
  };
  const reports = createParentReportPersistenceStore({
    readDatabase: async () => reportDatabase,
    getParentChildSummaries: (_database, user) => user.id === "parent-1"
      ? [filterTestChild("student-1")]
      : []
  });

  const noticeDatabase: ParentNoticePersistenceDatabase = {
    guardian_links: [],
    student_profiles: [],
    teacher_classes: [],
    teacher_notice_delivery_attempts: [],
    teacher_notice_recipients: [
      {
        id: "recipient-other-family",
        notice_id: "notice-1",
        student_id: "student-1",
        guardian_id: "parent-2",
        status: "pending",
        acknowledged_at: null,
        created_at: "2026-08-23T00:00:00.000Z"
      },
      {
        id: "recipient-student-2",
        notice_id: "notice-2",
        student_id: "student-2",
        guardian_id: "parent-1",
        status: "pending",
        acknowledged_at: null,
        created_at: "2026-08-23T00:00:00.000Z"
      }
    ],
    teacher_notices: [],
    teacher_review_lessons: [],
    users: [
      { id: "parent-1", role: "parent" },
      { id: "parent-2", role: "parent" },
      { id: "admin-1", role: "admin" }
    ]
  };
  const notices = createParentNoticePersistenceStore({
    readDatabase: async () => noticeDatabase,
    mutateDatabase: async (mutator) => mutator(noticeDatabase),
    getParentChildSummaries: (_database, user) => user.id === "parent-1"
      ? [filterTestChild("student-1"), filterTestChild("student-2")]
      : []
  });

  return { foundation, notices, reports };
}

const routeCases = [
  {
    label: "foundation",
    factoryName: "createParentFoundationGetHandler",
    loaderName: "loadFoundation",
    invoke: (handler: ParentGetHandler) => handler(new Request("http://localhost/api/parent/foundation"))
  },
  {
    label: "summary",
    factoryName: "createParentChildSummaryGetHandler",
    loaderName: "loadChildSummary",
    invoke: (handler: ParentGetHandler) => handler(
      new Request("http://localhost/api/parent/children/student-1/summary"),
      { params: Promise.resolve({ studentId: "student-1" }) }
    )
  },
  {
    label: "reports",
    factoryName: "createParentReportsGetHandler",
    loaderName: "loadReports",
    invoke: (handler: ParentGetHandler) => handler(new Request("http://localhost/api/parent/reports"))
  },
  {
    label: "notices",
    factoryName: "createParentNoticesGetHandler",
    loaderName: "loadNotices",
    invoke: (handler: ParentGetHandler) => handler(new Request("http://localhost/api/parent/notices"))
  }
] as const;

test("parent minor-data handlers return stable private no-store JSON for persistence failures", async () => {
  let handlerModule: Record<string, unknown> = {};
  try {
    handlerModule = await import("@/app/api/parent/handlers") as Record<string, unknown>;
  } catch {
    // The extraction RED is an assertion failure until the production handler module exists.
  }
  for (const routeCase of routeCases) {
    const factory = handlerModule[routeCase.factoryName];
    assert.equal(typeof factory, "function", `${routeCase.label} must expose its production handler factory`);
    if (typeof factory !== "function") continue;

    const sensitiveDiagnostic = `SENSITIVE-${routeCase.label}-database-path-and-provider-error`;
    const createHandler = factory as (dependencies: Record<string, unknown>) => ParentGetHandler;
    const handler = createHandler({
      authenticateParent: async () => ({ user: { id: "parent-1" } }),
      [routeCase.loaderName]: async () => {
        throw new Error(sensitiveDiagnostic);
      }
    });
    const response = await routeCase.invoke(handler);
    const body = await response.json();

    assert.equal(response.status, 503, `${routeCase.label} must map persistence failure to 503`);
    assert.deepEqual(body, { error: "Parent data temporarily unavailable." });
    assert.doesNotMatch(JSON.stringify(body), new RegExp(sensitiveDiagnostic));
    for (const header of privateHeaders) {
      assert.equal(response.headers.get(header), "private, no-store", `${routeCase.label} ${header}`);
    }
  }
});

test("parent response helper sets browser and edge cache controls and returns a non-sensitive 503", async () => {
  const helpers = await import("@/app/api/parent/response") as Record<string, unknown>;

  assert.equal(typeof helpers.parentPrivateJson, "function");
  assert.equal(typeof helpers.parentPersistenceUnavailable, "function");
  if (typeof helpers.parentPrivateJson !== "function" || typeof helpers.parentPersistenceUnavailable !== "function") return;

  const privateResponse = helpers.parentPrivateJson({ ok: true }) as Response;
  for (const header of privateHeaders) {
    assert.equal(privateResponse.headers.get(header), "private, no-store");
  }

  const failure = helpers.parentPersistenceUnavailable() as Response;
  assert.equal(failure.status, 503);
  assert.deepEqual(await failure.json(), { error: "Parent data temporarily unavailable." });
});

test("all parent minor-data handlers contain authentication failures inside the stable private boundary", async () => {
  const handlers = await import("@/app/api/parent/handlers") as Record<string, unknown>;
  const sensitiveDiagnostic = "SENSITIVE-auth-provider-secret-and-stack";
  const authenticationCases = [
    {
      label: "foundation auth",
      factoryName: "createParentFoundationGetHandler",
      invoke: (handler: ParentRuntimeHandler) => handler(
        new Request("http://localhost/api/parent/foundation")
      )
    },
    {
      label: "summary auth",
      factoryName: "createParentChildSummaryGetHandler",
      invoke: (handler: ParentRuntimeHandler) => handler(
        new Request("http://localhost/api/parent/children/student-1/summary"),
        { params: Promise.resolve({ studentId: "student-1" }) }
      )
    },
    {
      label: "reports auth",
      factoryName: "createParentReportsGetHandler",
      invoke: (handler: ParentRuntimeHandler) => handler(
        new Request("http://localhost/api/parent/reports")
      )
    },
    {
      label: "notices auth",
      factoryName: "createParentNoticesGetHandler",
      invoke: (handler: ParentRuntimeHandler) => handler(
        new Request("http://localhost/api/parent/notices")
      )
    },
    {
      label: "notice acknowledgement auth",
      factoryName: "createParentNoticeAckHandler",
      invoke: (handler: ParentRuntimeHandler) => handler(
        new Request("http://localhost/api/parent/notices/recipient-1/ack", { method: "POST" }),
        { params: Promise.resolve({ recipientId: "recipient-1" }) }
      )
    }
  ] as const;

  for (const routeCase of authenticationCases) {
    const factory = handlers[routeCase.factoryName];
    assert.equal(typeof factory, "function", `${routeCase.label} factory`);
    if (typeof factory !== "function") continue;

    const handler = (factory as (dependencies: Record<string, unknown>) => ParentRuntimeHandler)({
      authenticateParent: async () => {
        throw new Error(sensitiveDiagnostic);
      }
    });
    await requireStableUnavailableResponse(
      () => routeCase.invoke(handler),
      routeCase.label,
      sensitiveDiagnostic
    );
  }
});

test("child summary and notice acknowledgement contain rejected route params inside the stable private boundary", async () => {
  const handlers = await import("@/app/api/parent/handlers") as Record<string, unknown>;
  const sensitiveDiagnostic = "SENSITIVE-rejected-route-param";
  const rejectedParamsCases = [
    {
      label: "summary params",
      factoryName: "createParentChildSummaryGetHandler",
      url: "http://localhost/api/parent/children/student-1/summary",
      method: "GET"
    },
    {
      label: "notice acknowledgement params",
      factoryName: "createParentNoticeAckHandler",
      url: "http://localhost/api/parent/notices/recipient-1/ack",
      method: "POST"
    }
  ] as const;

  for (const routeCase of rejectedParamsCases) {
    const factory = handlers[routeCase.factoryName];
    assert.equal(typeof factory, "function", `${routeCase.label} factory`);
    if (typeof factory !== "function") continue;

    const handler = (factory as (dependencies: Record<string, unknown>) => ParentRuntimeHandler)({
      authenticateParent: async () => ({ user: { id: "parent-1" } })
    });
    await requireStableUnavailableResponse(
      () => handler(
        new Request(routeCase.url, { method: routeCase.method }),
        { params: Promise.reject(new Error(sensitiveDiagnostic)) }
      ),
      routeCase.label,
      sensitiveDiagnostic
    );
  }
});

test("each parent minor-data route directly exports a valid assembled runtime adapter", async () => {
  const routeModules = [
    {
      label: "foundation",
      module: await import("@/app/api/parent/foundation/route"),
      methodName: "GET",
      request: new Request("http://localhost/api/parent/foundation")
    },
    {
      label: "summary",
      module: await import("@/app/api/parent/children/[studentId]/summary/route"),
      methodName: "GET",
      request: new Request("http://localhost/api/parent/children/student-1/summary"),
      context: { params: Promise.resolve({ studentId: "student-1" }) }
    },
    {
      label: "reports",
      module: await import("@/app/api/parent/reports/route"),
      methodName: "GET",
      request: new Request("http://localhost/api/parent/reports")
    },
    {
      label: "notices",
      module: await import("@/app/api/parent/notices/route"),
      methodName: "GET",
      request: new Request("http://localhost/api/parent/notices")
    },
    {
      label: "notice acknowledgement",
      module: await import("@/app/api/parent/notices/[recipientId]/ack/route"),
      methodName: "POST",
      request: new Request("http://localhost/api/parent/notices/recipient-1/ack", { method: "POST" }),
      context: { params: Promise.resolve({ recipientId: "recipient-1" }) }
    }
  ] as const;

  for (const routeCase of routeModules) {
    const routeModule = routeCase.module as Record<string, unknown>;
    assert.equal(routeModule.runtime, "nodejs", `${routeCase.label} runtime`);
    assert.equal(typeof routeModule[routeCase.methodName], "function", `${routeCase.label} method export`);
    if (typeof routeModule[routeCase.methodName] !== "function") continue;

    const handler = routeModule[routeCase.methodName] as ParentRuntimeHandler;
    const response = await handler(routeCase.request, "context" in routeCase ? routeCase.context : undefined);
    assert.equal(response.status, 403, `${routeCase.label} adapter should reach its auth boundary`);
    assert.deepEqual(await response.json(), { error: "Parent access required." });
    for (const header of privateHeaders) {
      assert.equal(response.headers.get(header), "private, no-store", `${routeCase.label} ${header}`);
    }
  }
});

test("runtime parent handlers turn fail-closed store filters into private 404 responses", async () => {
  const handlers = await import("@/app/api/parent/handlers");
  const stores = createFilterRuntimeStores();
  const authenticateParent = async () => ({ user: { id: "parent-1" } });
  const foundationHandler = handlers.createParentFoundationGetHandler({
    authenticateParent,
    loadFoundation: stores.foundation.getParentFoundationData
  });
  const reportsHandler = handlers.createParentReportsGetHandler({
    authenticateParent,
    loadReports: stores.reports.getParentReportData
  });
  const noticesHandler = handlers.createParentNoticesGetHandler({
    authenticateParent,
    loadNotices: stores.notices.getParentNoticeData
  });

  await assertPrivateNotFound(
    await foundationHandler(new Request(
      "http://localhost/api/parent/foundation?studentId=student-does-not-exist"
    )),
    "Parent console unavailable.",
    ["student-does-not-exist"]
  );
  await assertPrivateNotFound(
    await reportsHandler(new Request("http://localhost/api/parent/reports?studentId=")),
    "Reports unavailable."
  );

  for (const url of [
    "http://localhost/api/parent/notices?studentId=",
    "http://localhost/api/parent/notices?recipientId=",
    "http://localhost/api/parent/notices?recipientId=recipient-other-family",
    "http://localhost/api/parent/notices?studentId=student-1&recipientId=recipient-student-2"
  ]) {
    await assertPrivateNotFound(
      await noticesHandler(new Request(url)),
      "Parent notices unavailable.",
      ["recipient-other-family", "recipient-student-2"]
    );
  }
});

test("runtime parent reads reject admins and child summary keeps an opaque private 404", async () => {
  const handlers = await import("@/app/api/parent/handlers");
  const stores = createFilterRuntimeStores();
  const authenticateAdmin = async () => ({ user: { id: "admin-1" } });
  const adminCases = [
    {
      handler: handlers.createParentFoundationGetHandler({
        authenticateParent: authenticateAdmin,
        loadFoundation: stores.foundation.getParentFoundationData
      }),
      request: new Request("http://localhost/api/parent/foundation"),
      error: "Parent console unavailable."
    },
    {
      handler: handlers.createParentReportsGetHandler({
        authenticateParent: authenticateAdmin,
        loadReports: stores.reports.getParentReportData
      }),
      request: new Request("http://localhost/api/parent/reports"),
      error: "Reports unavailable."
    },
    {
      handler: handlers.createParentNoticesGetHandler({
        authenticateParent: authenticateAdmin,
        loadNotices: stores.notices.getParentNoticeData
      }),
      request: new Request("http://localhost/api/parent/notices"),
      error: "Parent notices unavailable."
    }
  ];

  for (const routeCase of adminCases) {
    await assertPrivateNotFound(await routeCase.handler(routeCase.request), routeCase.error, ["admin-1"]);
  }

  const childHandler = handlers.createParentChildSummaryGetHandler({
    authenticateParent: async () => ({ user: { id: "parent-1" } }),
    loadChildSummary: stores.foundation.getParentChildSummary
  });
  const response = await childHandler(
    new Request("http://localhost/api/parent/children/student-other-family/summary"),
    { params: Promise.resolve({ studentId: "student-other-family" }) }
  );
  await assertPrivateNotFound(response, "Child summary unavailable.", ["student-other-family"]);
});

test("parent reports fail closed when persisted preview arrays contain nested private objects", async () => {
  const sensitiveAnswer = "SENSITIVE-raw-minor-answer";
  const sensitiveProviderId = "SENSITIVE-provider-message-id";
  const pollutedEntry = { answerText: sensitiveAnswer, providerMessageId: sensitiveProviderId };
  const database: ParentReportPersistenceDatabase = {
    guardian_links: [{ parent_id: "parent-1", student_id: "student-1", status: "active" }],
    teacher_reports: [{
      id: "report-polluted",
      type: "parent-summary",
      title_en: "Weekly report",
      title_zh: "每週報告",
      student_id: "student-1",
      generated_by: "teacher-1",
      generated_at: "2026-08-23T08:00:00.000Z",
      summary_en: "Steady progress",
      summary_zh: "穩步進展",
      preview_json: JSON.stringify({
        id: "preview-polluted",
        type: "parent-summary",
        language: "en",
        title: "Weekly report",
        subtitle: "S3 Algebra",
        generatedAt: "2026-08-23T08:00:00.000Z",
        subjectName: "Ada Student",
        studentId: "student-1",
        metrics: {
          learningMinutes: 90,
          masteryChange: 5,
          averageMastery: 82,
          accuracy: 88,
          completionRate: 75
        },
        strengths: [pollutedEntry],
        weaknesses: [pollutedEntry],
        mistakeTypes: [pollutedEntry],
        suggestedPractice: [pollutedEntry],
        teacherRemarks: "Private teacher note"
      })
    }],
    users: [{ id: "parent-1", role: "parent" }]
  };
  const store = createParentReportPersistenceStore({
    readDatabase: async () => database,
    getParentChildSummaries: () => [{
      student: {
        id: "student-1",
        name: "Ada Student",
        username: "ada@example.test",
        avatarId: "delta",
        grade: "S3",
        curriculumTrack: "HK",
        curriculumProfile: defaultCurriculumProfile,
        role: "student"
      },
      classes: [],
      generatedAt: "2026-08-23T08:00:00.000Z",
      averageMastery: 82,
      learningMinutes7d: 90,
      latestActivityAt: null,
      weeklyActivity: [],
      strengths: [],
      supportTopics: [],
      assignments: [],
      rewardSummary: {
        balance: 0,
        available: 0,
        reserved: 0,
        lifetimeEarned: 0,
        spent: 0,
        pendingRequests: 0,
        approvedRequests: 0
      },
      motivationSummary: null,
      latestParentReport: null,
      celebrate: [],
      support: []
    }]
  });
  const { createParentReportsGetHandler } = await import("@/app/api/parent/handlers");
  const handler = createParentReportsGetHandler({
    authenticateParent: async () => ({ user: { id: "parent-1" } }),
    loadReports: store.getParentReportData
  });

  const response = await handler(new Request("http://localhost/api/parent/reports"));
  assert.equal(response.status, 503);
  const body = await response.json();
  assert.deepEqual(body, { error: "Parent data temporarily unavailable." });
  const serialized = JSON.stringify(body);
  assert.doesNotMatch(serialized, /answerText|providerMessageId/);
  assert.doesNotMatch(serialized, new RegExp(`${sensitiveAnswer}|${sensitiveProviderId}`));
  for (const header of privateHeaders) {
    assert.equal(response.headers.get(header), "private, no-store");
  }
});
