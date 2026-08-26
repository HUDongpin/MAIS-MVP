import assert from "node:assert/strict";
import test from "node:test";

type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
  remaining: number;
  resetAt: number;
};

const allowed: RateLimitResult = {
  allowed: true,
  retryAfterSeconds: 0,
  remaining: 9,
  resetAt: Date.now() + 60_000
};
const blocked: RateLimitResult = {
  allowed: false,
  retryAfterSeconds: 17,
  remaining: 0,
  resetAt: Date.now() + 17_000
};
const privateHeaders = ["cache-control", "cdn-cache-control", "vercel-cdn-cache-control"];

function assertPrivate(response: Response) {
  for (const header of privateHeaders) {
    assert.equal(response.headers.get(header), "private, no-store", header);
  }
}

function teacherWriteRequest(method: "POST" | "DELETE", expectedUserId = "teacher-1") {
  return new Request("http://localhost", {
    method,
    headers: { "X-MAIS-Expected-User-Id": expectedUserId }
  });
}

test("parent guardian link handler returns a safe allowlisted DTO and stable status mapping", async () => {
  const handlers = await import("@/app/api/parent/handlers") as Record<string, unknown>;
  assert.equal(typeof handlers.createParentGuardianLinkHandler, "function");
  if (typeof handlers.createParentGuardianLinkHandler !== "function") return;

  let nextStatus = "linked";
  let rateLimit = allowed;
  const createHandler = handlers.createParentGuardianLinkHandler as (dependencies: Record<string, unknown>) => (request: Request) => Promise<Response>;
  const handler = createHandler({
    authenticateParent: async () => ({ user: { id: "parent-1" } }),
    consumeRateLimit: () => rateLimit,
    linkParent: async () => nextStatus === "linked"
      ? {
          status: "linked",
          link: {
            id: "link-1",
            parentId: "parent-1",
            parentName: "Private Parent Name",
            studentId: "student-1",
            studentName: "Student One",
            studentGrade: "S3",
            relationship: "guardian",
            status: "active",
            inviteCode: "MUST-NOT-LEAK",
            createdBy: "teacher-1",
            createdAt: "2026-08-23T10:00:00.000Z",
            updatedAt: "2026-08-23T10:00:00.000Z"
          }
        }
      : { status: nextStatus }
  });
  const request = () => new Request("http://localhost/api/parent/children/link", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "X-MAIS-Expected-User-Id": "parent-1"
    },
    body: JSON.stringify({ inviteCode: `MAIS-${"A".repeat(24)}`, relationship: "guardian" })
  });

  const success = await handler(request());
  assert.equal(success.status, 200);
  assertPrivate(success);
  assert.deepEqual(await success.json(), {
    link: {
      id: "link-1",
      studentId: "student-1",
      studentName: "Student One",
      studentGrade: "S3",
      relationship: "guardian",
      status: "active",
      createdAt: "2026-08-23T10:00:00.000Z",
      updatedAt: "2026-08-23T10:00:00.000Z"
    }
  });

  for (const [persistenceStatus, httpStatus] of [
    ["invalid", 400],
    ["forbidden", 403],
    ["not-found", 404],
    ["consumed", 409],
    ["conflict", 409],
    ["expired", 410],
    ["revoked", 410]
  ] as const) {
    nextStatus = persistenceStatus;
    const response = await handler(request());
    assert.equal(response.status, httpStatus, persistenceStatus);
    assertPrivate(response);
    assert.deepEqual(await response.json(), { error: persistenceStatus });
  }

  rateLimit = blocked;
  const limited = await handler(request());
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get("retry-after"), "17");
  assertPrivate(limited);
});

test("guardian access handlers fail closed with stable private 503 responses", async () => {
  const parentHandlers = await import("@/app/api/parent/handlers") as Record<string, unknown>;
  const teacherHandlers = await import("@/app/api/teacher/guardianAccessHandlers") as Record<string, unknown>;
  assert.equal(typeof parentHandlers.createParentGuardianLinkHandler, "function");
  assert.equal(typeof teacherHandlers.createTeacherGuardianInviteIssueHandler, "function");
  assert.equal(typeof teacherHandlers.createTeacherGuardianLinkRevokeHandler, "function");
  if (
    typeof parentHandlers.createParentGuardianLinkHandler !== "function" ||
    typeof teacherHandlers.createTeacherGuardianInviteIssueHandler !== "function" ||
    typeof teacherHandlers.createTeacherGuardianLinkRevokeHandler !== "function"
  ) return;

  const sensitive = "SENSITIVE-SQLITE-POSTGRES-GUARDIAN-ERROR";
  const throwingOperation = async () => { throw new Error(sensitive); };
  const parent = (parentHandlers.createParentGuardianLinkHandler as (dependencies: Record<string, unknown>) => (request: Request) => Promise<Response>)({
    authenticateParent: async () => ({ user: { id: "parent-1" } }),
    consumeRateLimit: () => allowed,
    linkParent: throwingOperation
  });
  const issue = (teacherHandlers.createTeacherGuardianInviteIssueHandler as (dependencies: Record<string, unknown>) => (
    request: Request,
    context: { params: Promise<{ classId: string; studentId: string }> }
  ) => Promise<Response>)({
    authenticateUser: async () => ({ user: { id: "teacher-1", role: "teacher" } }),
    consumeRateLimit: () => allowed,
    issueInvitation: throwingOperation
  });
  const revoke = (teacherHandlers.createTeacherGuardianLinkRevokeHandler as (dependencies: Record<string, unknown>) => (
    request: Request,
    context: { params: Promise<{ classId: string; studentId: string; linkId: string }> }
  ) => Promise<Response>)({
    authenticateUser: async () => ({ user: { id: "teacher-1", role: "teacher" } }),
    consumeRateLimit: () => allowed,
    revokeLink: throwingOperation
  });

  const responses = [
    await parent(new Request("http://localhost/api/parent/children/link", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "X-MAIS-Expected-User-Id": "parent-1"
      },
      body: JSON.stringify({ inviteCode: `MAIS-${"A".repeat(24)}`, relationship: "guardian" })
    })),
    await issue(teacherWriteRequest("POST"), {
      params: Promise.resolve({ classId: "class-1", studentId: "student-1" })
    }),
    await revoke(teacherWriteRequest("DELETE"), {
      params: Promise.resolve({ classId: "class-1", studentId: "student-1", linkId: "link-1" })
    })
  ];

  for (const response of responses) {
    assert.equal(response.status, 503);
    assertPrivate(response);
    const body = await response.json();
    assert.deepEqual(body, { error: "Guardian access temporarily unavailable." });
    assert.doesNotMatch(JSON.stringify(body), new RegExp(sensitive));
  }
});

test("teacher guardian writes reject a stale document identity before rate limiting or mutation", async () => {
  const handlers = await import("@/app/api/teacher/guardianAccessHandlers") as Record<string, unknown>;
  assert.equal(typeof handlers.createTeacherGuardianInviteIssueHandler, "function");
  assert.equal(typeof handlers.createTeacherGuardianLinkRevokeHandler, "function");
  if (
    typeof handlers.createTeacherGuardianInviteIssueHandler !== "function" ||
    typeof handlers.createTeacherGuardianLinkRevokeHandler !== "function"
  ) return;

  let rateLimitCalls = 0;
  let mutationCalls = 0;
  const dependencies = {
    authenticateUser: async () => ({ user: { id: "teacher-current", role: "teacher" } }),
    consumeRateLimit: () => {
      rateLimitCalls += 1;
      return allowed;
    }
  };
  const issue = (handlers.createTeacherGuardianInviteIssueHandler as (dependencies: Record<string, unknown>) => (
    request: Request,
    context: { params: Promise<{ classId: string; studentId: string }> }
  ) => Promise<Response>)({
    ...dependencies,
    issueInvitation: async () => {
      mutationCalls += 1;
      return { status: "forbidden" };
    }
  });
  const revoke = (handlers.createTeacherGuardianLinkRevokeHandler as (dependencies: Record<string, unknown>) => (
    request: Request,
    context: { params: Promise<{ classId: string; studentId: string; linkId: string }> }
  ) => Promise<Response>)({
    ...dependencies,
    revokeLink: async () => {
      mutationCalls += 1;
      return { status: "forbidden" };
    }
  });
  const issueContext = { params: Promise.resolve({ classId: "class-1", studentId: "student-1" }) };
  const revokeContext = { params: Promise.resolve({ classId: "class-1", studentId: "student-1", linkId: "link-1" }) };

  const responses = [
    await issue(new Request("http://localhost", { method: "POST" }), issueContext),
    await issue(teacherWriteRequest("POST", "teacher-old-document"), issueContext),
    await revoke(new Request("http://localhost", { method: "DELETE" }), revokeContext),
    await revoke(teacherWriteRequest("DELETE", "teacher-old-document"), revokeContext)
  ];

  for (const response of responses) {
    assert.equal(response.status, 409);
    assertPrivate(response);
    assert.deepEqual(await response.json(), {
      code: "authenticated-user-changed",
      error: "The authenticated user changed. Reload before retrying."
    });
  }
  assert.equal(rateLimitCalls, 0);
  assert.equal(mutationCalls, 0);
});

test("teacher issue and revoke handlers enforce teacher-only exact targets and safe responses", async () => {
  const handlers = await import("@/app/api/teacher/guardianAccessHandlers") as Record<string, unknown>;
  assert.equal(typeof handlers.createTeacherGuardianInviteIssueHandler, "function");
  assert.equal(typeof handlers.createTeacherGuardianLinkRevokeHandler, "function");
  if (
    typeof handlers.createTeacherGuardianInviteIssueHandler !== "function" ||
    typeof handlers.createTeacherGuardianLinkRevokeHandler !== "function"
  ) return;

  const issueFactory = handlers.createTeacherGuardianInviteIssueHandler as (dependencies: Record<string, unknown>) => (
    request: Request,
    context: { params: Promise<{ classId: string; studentId: string }> }
  ) => Promise<Response>;
  const revokeFactory = handlers.createTeacherGuardianLinkRevokeHandler as (dependencies: Record<string, unknown>) => (
    request: Request,
    context: { params: Promise<{ classId: string; studentId: string; linkId: string }> }
  ) => Promise<Response>;
  let role = "teacher";
  let issueStatus = "issued";
  let revokeStatus = "revoked";
  let rateLimit = allowed;
  const authenticateUser = async () => ({ user: { id: "teacher-1", role } });
  const issue = issueFactory({
    authenticateUser,
    consumeRateLimit: () => rateLimit,
    issueInvitation: async () => issueStatus === "issued"
      ? {
          status: "issued",
          invitation: {
            version: 2,
            token: `MAIS-${"B".repeat(24)}`,
            expiresAt: "2026-08-24T10:00:00.000Z",
            tokenDigest: "MUST-NOT-LEAK"
          }
        }
      : { status: issueStatus }
  });
  const revoke = revokeFactory({
    authenticateUser,
    consumeRateLimit: () => rateLimit,
    revokeLink: async () => revokeStatus === "revoked"
      ? {
          status: "revoked",
          revokedAt: "2026-08-23T10:00:00.000Z",
          invitation: {
            version: 3,
            token: `MAIS-${"C".repeat(24)}`,
            expiresAt: "2026-08-24T10:00:00.000Z",
            tokenDigest: "MUST-NOT-LEAK"
          },
          internal: "MUST-NOT-LEAK"
        }
      : { status: revokeStatus }
  });
  const issueContext = { params: Promise.resolve({ classId: "class-1", studentId: "student-1" }) };
  const revokeContext = { params: Promise.resolve({ classId: "class-1", studentId: "student-1", linkId: "link-1" }) };

  const issued = await issue(teacherWriteRequest("POST"), issueContext);
  assert.equal(issued.status, 201);
  assertPrivate(issued);
  assert.deepEqual(await issued.json(), {
    invitation: {
      version: 2,
      token: `MAIS-${"B".repeat(24)}`,
      expiresAt: "2026-08-24T10:00:00.000Z"
    }
  });

  const revoked = await revoke(teacherWriteRequest("DELETE"), revokeContext);
  assert.equal(revoked.status, 200);
  assertPrivate(revoked);
  assert.deepEqual(await revoked.json(), {
    revokedAt: "2026-08-23T10:00:00.000Z",
    invitation: {
      version: 3,
      token: `MAIS-${"C".repeat(24)}`,
      expiresAt: "2026-08-24T10:00:00.000Z"
    }
  });

  role = "admin";
  assert.equal((await issue(teacherWriteRequest("POST"), issueContext)).status, 403);
  assert.equal((await revoke(teacherWriteRequest("DELETE"), revokeContext)).status, 403);
  role = "teacher";

  for (const [persistenceStatus, httpStatus] of [
    ["forbidden", 403],
    ["class-not-found", 404],
    ["student-not-found", 404],
    ["link-not-found", 404],
    ["conflict", 409]
  ] as const) {
    issueStatus = persistenceStatus;
    revokeStatus = persistenceStatus;
    assert.equal((await issue(teacherWriteRequest("POST"), issueContext)).status, httpStatus);
    assert.equal((await revoke(teacherWriteRequest("DELETE"), revokeContext)).status, httpStatus);
  }

  issueStatus = "issued";
  revokeStatus = "revoked";
  const malformedIssue = await issue(teacherWriteRequest("POST"), {
    params: Promise.resolve({ classId: "%", studentId: "student-1" })
  });
  assert.equal(malformedIssue.status, 400);
  assertPrivate(malformedIssue);
  assert.deepEqual(await malformedIssue.json(), { error: "invalid" });
  const malformedRevoke = await revoke(teacherWriteRequest("DELETE"), {
    params: Promise.resolve({ classId: "class-1", studentId: "student-1", linkId: "%" })
  });
  assert.equal(malformedRevoke.status, 400);
  assertPrivate(malformedRevoke);
  assert.deepEqual(await malformedRevoke.json(), { error: "invalid" });

  rateLimit = blocked;
  const limited = await issue(teacherWriteRequest("POST"), issueContext);
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get("retry-after"), "17");
  assertPrivate(limited);
});
