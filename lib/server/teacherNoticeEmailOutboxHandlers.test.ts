import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const handlersPromise = import("@/lib/server/teacherNoticeEmailOutboxHandlers")
  .catch(() => null) as Promise<Record<string, unknown> | null>;

test("teacher send handler is teacher-only, origin-free, private, and preserves the notice-attempt response", async () => {
  const handlers = await handlersPromise;
  assert.ok(handlers, "teacher notice email outbox handlers must exist");
  if (!handlers) return;
  const calls: Array<Record<string, unknown>> = [];
  const createHandler = handlers.createTeacherNoticeEmailSendHandler as (dependencies: Record<string, unknown>) =>
    (request: Request, context: { params: Promise<{ noticeId: string }> }) => Promise<Response>;
  const handler = createHandler({
    authenticate: async () => ({ user: { id: "teacher-1", role: "teacher" } }),
    queueNoticeEmail: async (input: Record<string, unknown>) => {
      calls.push(input);
      return {
        status: "sent",
        notice: { id: "notice-1", status: "sent" },
        attempt: { id: "attempt-1", status: "sent" },
        email: { status: "queued", queued: 1, reused: 0, recovered: 0, skipped: 2 }
      };
    }
  });
  const response = await handler(
    new Request("https://untrusted.example/api/teacher/notices/notice-1/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idempotencyKey: "teacher-send-request-0001" })
    }),
    { params: Promise.resolve({ noticeId: "notice-1" }) }
  );

  assert.equal(response.status, 202);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.deepEqual(await response.json(), {
    notice: { id: "notice-1", status: "sent" },
    attempt: { id: "attempt-1", status: "sent" },
    email: { status: "queued", queued: 1, reused: 0, recovered: 0, skipped: 2 }
  });
  assert.deepEqual(calls, [{
    teacherId: "teacher-1",
    noticeId: "notice-1",
    idempotencyKey: "teacher-send-request-0001"
  }]);
});

test("teacher send handler rejects an explicit invalid key and derives a stable legacy key when omitted", async () => {
  const handlers = await handlersPromise;
  assert.ok(handlers);
  if (!handlers) return;
  const createHandler = handlers.createTeacherNoticeEmailSendHandler as (dependencies: Record<string, unknown>) =>
    (request: Request, context: { params: Promise<{ noticeId: string }> }) => Promise<Response>;
  let calls = 0;
  const handler = createHandler({
    authenticate: async () => ({ user: { id: "teacher-1", role: "teacher" } }),
    queueNoticeEmail: async () => {
      calls += 1;
      return { status: "queued", queued: 1, reused: 0, recovered: 0, skipped: 0 };
    }
  });
  for (const body of [{ idempotencyKey: "short" }, { idempotencyKey: 42 }]) {
    const response = await handler(new Request("https://mais.example/api/send", {
      method: "POST",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body)
    }), { params: Promise.resolve({ noticeId: "notice-1" }) });
    assert.equal(response.status, 400);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
  }
  const legacy = await handler(new Request("https://mais.example/api/send", {
    method: "POST"
  }), { params: Promise.resolve({ noticeId: "notice-1" }) });
  assert.equal(legacy.status, 202);
  assert.equal(calls, 1);
});

test("teacher send handler rejects stand-ins, returns opaque 404, and masks storage failures", async () => {
  const handlers = await handlersPromise;
  assert.ok(handlers);
  if (!handlers) return;
  const createHandler = handlers.createTeacherNoticeEmailSendHandler as (dependencies: Record<string, unknown>) =>
    (request: Request, context: { params: Promise<{ noticeId: string }> }) => Promise<Response>;
  const validRequest = () => new Request("https://mais.example/api/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idempotencyKey: "teacher-send-request-0002" })
  });
  for (const role of ["admin", "parent", "student"]) {
    let queueCalls = 0;
    const response = await createHandler({
      authenticate: async () => ({ user: { id: `${role}-1`, role } }),
      queueNoticeEmail: async () => { queueCalls += 1; return { status: "queued", queued: 1, reused: 0, recovered: 0, skipped: 0 }; }
    })(new Request("https://mais.example/api/send", { method: "POST" }), { params: Promise.resolve({ noticeId: "notice-1" }) });
    assert.equal(response.status, 403);
    assert.equal(queueCalls, 0);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
  }

  const missing = await createHandler({
    authenticate: async () => ({ user: { id: "teacher-1", role: "teacher" } }),
    queueNoticeEmail: async () => ({ status: "not-found" })
  })(validRequest(), { params: Promise.resolve({ noticeId: "foreign-notice" }) });
  assert.equal(missing.status, 404);
  assert.deepEqual(await missing.json(), { error: "Not found." });

  const noEligible = await createHandler({
    authenticate: async () => ({ user: { id: "teacher-1", role: "teacher" } }),
    queueNoticeEmail: async () => ({ status: "no-eligible", skipped: 2 })
  })(validRequest(), { params: Promise.resolve({ noticeId: "notice-1" }) });
  assert.equal(noEligible.status, 409);
  assert.equal(noEligible.headers.get("cache-control"), "private, no-store");
  assert.deepEqual(await noEligible.json(), {
    error: "No eligible family email recipients are currently available.",
    code: "NO_ELIGIBLE_RECIPIENTS"
  });

  const conflict = await createHandler({
    authenticate: async () => ({ user: { id: "teacher-1", role: "teacher" } }),
    queueNoticeEmail: async () => ({ status: "conflict" })
  })(validRequest(), { params: Promise.resolve({ noticeId: "notice-1" }) });
  assert.equal(conflict.status, 409);
  assert.equal(conflict.headers.get("cache-control"), "private, no-store");
  assert.deepEqual(await conflict.json(), {
    error: "Idempotency key conflict.",
    code: "IDEMPOTENCY_CONFLICT"
  });

  const unavailable = await createHandler({
    authenticate: async () => ({ user: { id: "teacher-1", role: "teacher" } }),
    queueNoticeEmail: async () => { throw new Error("postgres provider detail must not leak"); }
  })(validRequest(), { params: Promise.resolve({ noticeId: "notice-1" }) });
  assert.equal(unavailable.status, 503);
  assert.deepEqual(await unavailable.json(), { error: "Service temporarily unavailable." });

  const authUnavailable = await createHandler({
    authenticate: async () => { throw new Error("private session storage detail"); },
    queueNoticeEmail: async () => ({ status: "queued", queued: 1, reused: 0, recovered: 0, skipped: 0 })
  })(new Request("https://mais.example/api/send", { method: "POST" }), { params: Promise.resolve({ noticeId: "notice-1" }) });
  assert.equal(authUnavailable.status, 503);
  assert.deepEqual(await authUnavailable.json(), { error: "Service temporarily unavailable." });
});

test("reminder-run handler fails closed on arrays and every explicitly invalid optional field before persistence", async () => {
  const handlers = await handlersPromise;
  assert.ok(handlers);
  if (!handlers) return;
  const createHandler = handlers.createTeacherMissingWorkReminderRunHandler as (dependencies: Record<string, unknown>) =>
    (request: Request) => Promise<Response>;
  assert.equal(typeof createHandler, "function");

  let persistenceCalls = 0;
  const handler = createHandler({
    authenticate: async () => ({ user: { id: "teacher-1", role: "teacher" } }),
    authorize: () => true,
    runReminders: async () => {
      persistenceCalls += 1;
      return { status: "ran", runs: [] };
    }
  });
  const invalidBodies: unknown[] = [
    [],
    ["class-1"],
    null,
    { classId: 42 },
    { classId: "" },
    { classId: "c".repeat(257) },
    { assignmentId: false },
    { assignmentId: "" },
    { assignmentId: "a".repeat(257) },
    { manual: "true" },
    { manual: null },
    { cursor: 7 },
    { cursor: "" },
    { cursor: "x".repeat(501) }
  ];
  for (const body of invalidBodies) {
    const response = await handler(new Request("https://mais.example/api/teacher/reminders/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }));
    assert.equal(response.status, 400, `body must fail closed: ${JSON.stringify(body)?.slice(0, 80)}`);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.deepEqual(await response.json(), { error: "Invalid request." });
  }
  const malformed = await handler(new Request("https://mais.example/api/teacher/reminders/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{"
  }));
  assert.equal(malformed.status, 400);
  assert.equal(malformed.headers.get("cache-control"), "private, no-store");
  assert.equal(persistenceCalls, 0);
});

test("reminder-run handler masks auth, authorization, database, and schema failures with a private stable 503", async () => {
  const handlers = await handlersPromise;
  assert.ok(handlers);
  if (!handlers) return;
  const createHandler = handlers.createTeacherMissingWorkReminderRunHandler as (dependencies: Record<string, unknown>) =>
    (request: Request) => Promise<Response>;
  assert.equal(typeof createHandler, "function");
  const request = () => new Request("https://mais.example/api/teacher/reminders/run", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": "teacher-reminder-run-0001" },
    body: JSON.stringify({ classId: "class-1", assignmentId: "assignment-1", manual: true, cursor: "cursor-1" })
  });
  const cases = [
    {
      authenticate: async () => { throw new Error("private session database detail"); },
      authorize: () => true,
      runReminders: async () => ({ status: "ran", runs: [] })
    },
    {
      authenticate: async () => ({ user: { id: "teacher-1", role: "teacher" } }),
      authorize: () => { throw new Error("private authorization schema detail"); },
      runReminders: async () => ({ status: "ran", runs: [] })
    },
    {
      authenticate: async () => ({ user: { id: "teacher-1", role: "teacher" } }),
      authorize: () => true,
      runReminders: async () => { throw new Error("private postgres relation detail"); }
    }
  ];
  for (const dependencies of cases) {
    const response = await createHandler(dependencies)(request());
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.deepEqual(await response.json(), { error: "Service temporarily unavailable." });
  }
});

test("reminder-run handler preserves valid pagination and stable status mappings", async () => {
  const handlers = await handlersPromise;
  assert.ok(handlers);
  if (!handlers) return;
  const createHandler = handlers.createTeacherMissingWorkReminderRunHandler as (dependencies: Record<string, unknown>) =>
    (request: Request) => Promise<Response>;
  assert.equal(typeof createHandler, "function");
  const calls: Array<Record<string, unknown>> = [];
  const handler = createHandler({
    authenticate: async () => ({ user: { id: "teacher-1", role: "teacher" } }),
    authorize: (user: { role: string }) => user.role === "teacher",
    runReminders: async (input: Record<string, unknown>) => {
      calls.push(input);
      return { status: "ran", runs: [{ id: "run-1" }], nextCursor: "cursor-2" };
    }
  });
  const response = await handler(new Request("https://mais.example/api/teacher/reminders/run", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": "teacher-reminder-run-0002" },
    body: JSON.stringify({ classId: "class-1", assignmentId: "assignment-1", manual: true, cursor: "cursor-1" })
  }));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.deepEqual(await response.json(), { runs: [{ id: "run-1" }], nextCursor: "cursor-2" });
  assert.deepEqual(calls, [{
    teacherId: "teacher-1",
    classId: "class-1",
    assignmentId: "assignment-1",
    manual: true,
    cursor: "cursor-1",
    idempotencyKey: "teacher-reminder-run-0002"
  }]);

  const unauthenticated = await createHandler({
    authenticate: async () => null,
    authorize: () => true,
    runReminders: async () => ({ status: "ran", runs: [] })
  })(new Request("https://mais.example/api/teacher/reminders/run", { method: "POST" }));
  assert.equal(unauthenticated.status, 401);
  assert.equal(unauthenticated.headers.get("cache-control"), "private, no-store");

  const forbidden = await createHandler({
    authenticate: async () => ({ user: { id: "parent-1", role: "parent" } }),
    authorize: () => false,
    runReminders: async () => ({ status: "ran", runs: [] })
  })(new Request("https://mais.example/api/teacher/reminders/run", { method: "POST" }));
  assert.equal(forbidden.status, 403);
  assert.equal(forbidden.headers.get("cache-control"), "private, no-store");
});

test("cron handler requires the exact configured bearer and returns aggregate-only results", async () => {
  const handlers = await handlersPromise;
  assert.ok(handlers);
  if (!handlers) return;
  const createHandler = handlers.createTeacherNoticeEmailCronHandler as (dependencies: Record<string, unknown>) =>
    (request: Request) => Promise<Response>;
  const request = (authorization?: string) => new Request("https://mais.example/api/cron/teacher-notice-email", {
    headers: authorization ? { Authorization: authorization } : undefined
  });

  const cronSecret = "fixture-cron-secret-with-at-least-32-bytes";
  let workerCalls = 0;

  for (const invalidSecret of [
    undefined,
    "",
    "short-secret",
    ` ${cronSecret}`,
    `${cronSecret} `,
    `fixture-cron-secret-with-tab\tand-32-bytes`,
    "x".repeat(513)
  ]) {
    const invalidConfiguration = await createHandler({
      readCronSecret: () => invalidSecret,
      runWorker: async () => {
        workerCalls += 1;
        return {};
      }
    })(request(`Bearer ${cronSecret}`));
    assert.equal(invalidConfiguration.status, 503);
    assert.deepEqual(await invalidConfiguration.json(), {
      error: "Service temporarily unavailable."
    });
  }
  assert.equal(workerCalls, 0);

  const wrong = await createHandler({ readCronSecret: () => cronSecret, runWorker: async () => ({}) })(request("Bearer wrong"));
  assert.equal(wrong.status, 401);

  const aggregate = {
    claimed: 2,
    accepted: 1,
    deferred: 1,
    blocked: 0,
    deadLetter: 0,
    staleCompletions: 0,
    releasedWithoutProviderContact: 1,
    releaseFailures: 1,
    recipientId: "recipient-must-not-leak",
    email: "private-parent@example.test",
    providerMessageId: "00000000-0000-4000-8000-000000000001"
  };
  const success = await createHandler({
    readCronSecret: () => cronSecret,
    runWorker: async () => { workerCalls += 1; return aggregate; }
  })(request(`Bearer ${cronSecret}`));
  assert.equal(success.status, 200);
  assert.equal(success.headers.get("cache-control"), "private, no-store");
  assert.deepEqual(await success.json(), {
    claimed: 2,
    accepted: 1,
    deferred: 1,
    blocked: 0,
    deadLetter: 0,
    staleCompletions: 0,
    releasedWithoutProviderContact: 1,
    releaseFailures: 1
  });
  assert.equal(workerCalls, 1);

  const unavailable = await createHandler({
    readCronSecret: () => cronSecret,
    runWorker: async () => { throw new Error("private database detail"); }
  })(request(`Bearer ${cronSecret}`));
  assert.equal(unavailable.status, 503);
  assert.deepEqual(await unavailable.json(), { error: "Service temporarily unavailable." });
});

test("send, reminder-run, deliveries alias, and cron routes use the reviewed handlers and never read request origin", async () => {
  const sendRoute = await readFile(path.join(process.cwd(), "app/api/teacher/notices/[noticeId]/send/route.ts"), "utf8");
  const reminderRunRoute = await readFile(path.join(process.cwd(), "app/api/teacher/reminders/run/route.ts"), "utf8");
  const aliasRoute = await readFile(path.join(process.cwd(), "app/api/teacher/notices/[noticeId]/deliveries/route.ts"), "utf8");
  const cronRoute = await readFile(path.join(process.cwd(), "app/api/cron/teacher-notice-email/route.ts"), "utf8").catch(() => "");

  assert.match(sendRoute, /createTeacherNoticeEmailSendHandler/);
  assert.doesNotMatch(sendRoute, /new URL|\.origin/);
  assert.match(reminderRunRoute, /createTeacherMissingWorkReminderRunHandler/);
  assert.doesNotMatch(reminderRunRoute, /request\.json|NextResponse/);
  assert.match(aliasRoute, /export \{ POST \} from "\.\.\/send\/route"/);
  assert.match(cronRoute, /createTeacherNoticeEmailCronHandler/);
  assert.match(cronRoute, /CRON_SECRET/);
  assert.match(cronRoute, /export const maxDuration = 300/);
  assert.match(cronRoute, /deliverTeacherNoticeEmailOutboxBatch\(8\)/);
});

test("Vercel schedules the outbox worker separately and the environment example names only server-private configuration", async () => {
  const vercel = JSON.parse(await readFile(path.join(process.cwd(), "vercel.json"), "utf8")) as {
    crons?: Array<{ path?: string; schedule?: string }>;
  };
  const environmentExample = await readFile(path.join(process.cwd(), ".env.local.example"), "utf8");

  assert.deepEqual(
    vercel.crons?.filter((cron) => cron.path === "/api/cron/teacher-notice-email"),
    [{ path: "/api/cron/teacher-notice-email", schedule: "*/5 * * * *" }]
  );
  assert.match(environmentExample, /^CRON_SECRET=$/m);
  assert.doesNotMatch(environmentExample, /NEXT_PUBLIC_(?:CRON_SECRET|TEACHER_NOTICE_RESEND_API_KEY)/);
  assert.doesNotMatch(environmentExample, /not wired to routes or persistence/);
});
