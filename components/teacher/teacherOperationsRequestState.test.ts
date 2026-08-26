import assert from "node:assert/strict";
import test from "node:test";

async function loadRequestState(): Promise<Record<string, unknown>> {
  try {
    return await import("./teacherOperationsRequestState") as Record<string, unknown>;
  } catch {
    // The first strict-TDD run intentionally reaches the contract assertions
    // before the helper module exists.
    return {};
  }
}

function requireFunction(module: Record<string, unknown>, name: string) {
  assert.equal(typeof module[name], "function", `${name} must be implemented by the TeacherOperations request helper`);
  return module[name] as (...args: any[]) => any;
}

test("a new teacher-operation intent uses a browser-crypto UUID key", async () => {
  const module = await loadRequestState();
  const createTeacherOperationIdempotencyKey = requireFunction(module, "createTeacherOperationIdempotencyKey");
  const observed: string[] = [];
  const key = createTeacherOperationIdempotencyKey({
    randomUUID() {
      observed.push("randomUUID");
      return "123e4567-e89b-42d3-a456-426614174000";
    }
  });

  assert.deepEqual(observed, ["randomUUID"]);
  assert.equal(key, "teacher-operation/123e4567-e89b-42d3-a456-426614174000");
  assert.match(key, /^[A-Za-z0-9][A-Za-z0-9._:/-]{15,127}$/u);
});

test("double-click is ignored, a retry reuses its key, and a completed later click gets a fresh key", async () => {
  const module = await loadRequestState();
  const Registry = requireFunction(module, "TeacherOperationIntentRegistry") as unknown as new (
    createKey: () => string
  ) => {
    begin(intent: string): Promise<{ status: "started"; idempotencyKey: string } | { status: "busy" }>;
    finish(intent: string, idempotencyKey: string, retainForRetry: boolean): Promise<void>;
  };
  const generated = ["teacher-operation/key-0000000000000001", "teacher-operation/key-0000000000000002"];
  const registry = new Registry(() => generated.shift() ?? "unexpected");

  const first = await registry.begin("notice:notice-1");
  assert.deepEqual(first, {
    status: "started",
    idempotencyKey: "teacher-operation/key-0000000000000001"
  });
  assert.deepEqual(await registry.begin("notice:notice-1"), { status: "busy" });

  await registry.finish("notice:notice-1", first.status === "started" ? first.idempotencyKey : "", true);
  const retry = await registry.begin("notice:notice-1");
  assert.deepEqual(retry, first, "the same unconfirmed intent must reuse its original key");

  await registry.finish("notice:notice-1", retry.status === "started" ? retry.idempotencyKey : "", false);
  const laterClick = await registry.begin("notice:notice-1");
  assert.deepEqual(laterClick, {
    status: "started",
    idempotencyKey: "teacher-operation/key-0000000000000002"
  });
});

test("a reload restores the exact scoped base key but restarts reminder pagination at page zero", async () => {
  const module = await loadRequestState();
  const Registry = requireFunction(module, "TeacherOperationIntentRegistry") as unknown as new (
    createKey: () => string,
    recovery?: unknown
  ) => {
    begin(intent: string): Promise<{ status: "started"; idempotencyKey: string } | { status: "busy" }>;
    finish(intent: string, idempotencyKey: string, retainForRetry: boolean): Promise<void>;
  };
  const RecoveryStore = requireFunction(module, "TeacherOperationRecoveryStore") as unknown as new (
    scope: { teacherId: string; classId: string },
    storage: Storage,
    digest: (value: string) => Promise<string>
  ) => {
    saveReminderState(intent: string, state: Record<string, unknown>): Promise<void>;
    loadReminderState(intent: string): Promise<Record<string, unknown> | null>;
  };
  const values = new Map<string, string>();
  const storage = {
    get length() { return values.size; },
    clear() { values.clear(); },
    getItem(key: string) { return values.get(key) ?? null; },
    key(index: number) { return [...values.keys()][index] ?? null; },
    removeItem(key: string) { values.delete(key); },
    setItem(key: string, value: string) { values.set(key, value); }
  } satisfies Storage;
  const digest = async (value: string) => value.includes("class-private-2") ? "c".repeat(64) : "b".repeat(64);
  const recovery = new RecoveryStore({ teacherId: "teacher-private-1", classId: "class-private-1" }, storage, digest);
  const intent = "reminder:class-private-1:manual:assignment-private-1";
  const firstRegistry = new Registry(() => "teacher-operation/key-reload-00000001", recovery);
  const first = await firstRegistry.begin(intent);
  assert.equal(first.status, "started");
  const idempotencyKey = first.status === "started" ? first.idempotencyKey : "";
  await recovery.saveReminderState(intent, {
    baseIdempotencyKey: idempotencyKey,
    cursor: "assignment-private-1\u0000student-private-1",
    pageIndex: 1,
    runs: [{ id: "run-1", studentName: "must-not-persist", reason: "private message" }],
    acceptedRunCount: 100,
    seenCursors: ["assignment-private-1\u0000student-private-1"]
  });
  await firstRegistry.finish(intent, idempotencyKey, true);

  const reloadedRegistry = new Registry(() => "teacher-operation/key-should-not-be-used", recovery);
  assert.deepEqual(await reloadedRegistry.begin(intent), first);
  assert.deepEqual(await recovery.loadReminderState(intent), {
    baseIdempotencyKey: idempotencyKey,
    cursor: null,
    pageIndex: 0,
    runs: [],
    acceptedRunCount: 0,
    seenCursors: []
  });
  const serialized = [...values.entries()].flat().join("\n");
  assert.doesNotMatch(serialized, /teacher-private-1|class-private-1|assignment-private-1|student-private-1|studentName|must-not-persist|private message|reason/u);

  const otherClassRecovery = new RecoveryStore({ teacherId: "teacher-private-1", classId: "class-private-2" }, storage, digest);
  const otherClassRegistry = new Registry(() => "teacher-operation/key-other-class-00001", otherClassRecovery);
  assert.deepEqual(await otherClassRegistry.begin(intent), {
    status: "started",
    idempotencyKey: "teacher-operation/key-other-class-00001"
  });

  await reloadedRegistry.finish(intent, idempotencyKey, false);
  const afterTerminalRegistry = new Registry(() => "teacher-operation/key-fresh-0000000001", recovery);
  assert.deepEqual(await afterTerminalRegistry.begin(intent), {
    status: "started",
    idempotencyKey: "teacher-operation/key-fresh-0000000001"
  });
});

test("recovery synchronously claims the intent but persists only a hashed scope and opaque base key", async () => {
  const module = await loadRequestState();
  const Registry = requireFunction(module, "TeacherOperationIntentRegistry") as unknown as new (
    createKey: () => string,
    recovery?: unknown
  ) => {
    begin(intent: string): Promise<{ status: "started"; idempotencyKey: string } | { status: "busy" }>;
    finish(intent: string, idempotencyKey: string, retainForRetry: boolean): Promise<void>;
  };
  const RecoveryStore = requireFunction(module, "TeacherOperationRecoveryStore") as unknown as new (
    scope: { teacherId: string; classId: string },
    storage: Storage,
    digest: (value: string) => Promise<string>
  ) => unknown;
  const values = new Map<string, string>();
  const storage = {
    get length() { return values.size; },
    clear() { values.clear(); },
    getItem(key: string) { return values.get(key) ?? null; },
    key(index: number) { return [...values.keys()][index] ?? null; },
    removeItem(key: string) { values.delete(key); },
    setItem(key: string, value: string) { values.set(key, value); }
  } satisfies Storage;
  let releaseDigest!: () => void;
  const digestGate = new Promise<void>((resolve) => { releaseDigest = resolve; });
  const digestInputs: string[] = [];
  const recovery = new RecoveryStore(
    { teacherId: "teacher-private-1", classId: "class-private-1" },
    storage,
    async (value) => {
      digestInputs.push(value);
      await digestGate;
      return "a".repeat(64);
    }
  );
  const intent = "reminder:class-private-1:manual:assignment-private-1";
  const registry = new Registry(() => "teacher-operation/key-private-000001", recovery);

  const firstPromise = Promise.resolve(registry.begin(intent));
  const duplicate = await registry.begin(intent);
  assert.deepEqual(duplicate, { status: "busy" }, "the intent must be claimed before the digest resolves");
  let firstSettled = false;
  void firstPromise.then(() => { firstSettled = true; });
  await Promise.resolve();
  assert.equal(firstSettled, false, "the first request must wait for durable recovery lookup");

  releaseDigest();
  const first = await firstPromise;
  assert.deepEqual(first, {
    status: "started",
    idempotencyKey: "teacher-operation/key-private-000001"
  });
  assert.equal(digestInputs.length, 1);

  const rawCursor = "assignment-private-1\u0000student-private-1";
  const serializedStorage = [...values.entries()].flat().join("\n");
  for (const forbidden of [
    "teacher-private-1",
    "class-private-1",
    "notice-private-1",
    "assignment-private-1",
    "student-private-1",
    rawCursor
  ]) {
    assert.doesNotMatch(serializedStorage, new RegExp(forbidden.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "u"));
  }
  assert.match([...values.keys()][0] ?? "", /^mais\.teacher-operations\.v2\/[a-f0-9]{64}$/u);
  assert.deepEqual(JSON.parse([...values.values()][0] ?? "null"), {
    version: 2,
    idempotencyKey: "teacher-operation/key-private-000001"
  });
});

test("reminder pagination derives a stable distinct request key from one strong intent key", async () => {
  const module = await loadRequestState();
  const reminderPageIdempotencyKey = requireFunction(module, "reminderPageIdempotencyKey");
  const baseKey = "teacher-operation/123e4567-e89b-42d3-a456-426614174000";

  assert.equal(reminderPageIdempotencyKey(baseKey, 0), `${baseKey}/page/0`);
  assert.equal(reminderPageIdempotencyKey(baseKey, 1), `${baseKey}/page/1`);
  assert.equal(reminderPageIdempotencyKey(baseKey, 1), `${baseKey}/page/1`);
});

test("an initial reminder request omits null assignment and cursor fields from its JSON body", async () => {
  const module = await loadRequestState();
  const createState = requireFunction(module, "createTeacherReminderRequestState");
  const runPages = requireFunction(module, "runTeacherReminderPages");
  const bodies: Array<Record<string, unknown>> = [];

  const result = await runPages({
    intent: { teacherId: "teacher-1", classId: "class-1", assignmentId: null, manual: false },
    state: createState("teacher-operation/key-null-fields-000001"),
    request: async (_input: string, init?: RequestInit) => {
      bodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
      return new Response(JSON.stringify({ runs: [], nextCursor: null }), { status: 200 });
    }
  });

  assert.equal(result.ok, true);
  assert.deepEqual(bodies, [{
    classId: "class-1",
    manual: false,
    idempotencyKey: "teacher-operation/key-null-fields-000001/page/0"
  }]);
});

test("a reminder request fails closed before fetch when its top-level intent scope is invalid", async () => {
  const module = await loadRequestState();
  const createState = requireFunction(module, "createTeacherReminderRequestState");
  const runPages = requireFunction(module, "runTeacherReminderPages");
  let requests = 0;

  for (const intent of [
    null,
    undefined,
    { teacherId: "teacher-1", classId: null, assignmentId: null, manual: false },
    { teacherId: "teacher-1", classId: "   ", assignmentId: null, manual: false },
    { teacherId: "", classId: "class-1", assignmentId: null, manual: false },
    { teacherId: "teacher-1", classId: "class-1", assignmentId: "  ", manual: true },
    { teacherId: "teacher-1", classId: "class-1", assignmentId: null, manual: "false" }
  ]) {
    const result = await runPages({
      intent,
      state: createState("teacher-operation/key-invalid-scope-0001"),
      request: async () => {
        requests += 1;
        return new Response(JSON.stringify({ runs: [], nextCursor: null }), { status: 200 });
      }
    });
    assert.equal(result.ok, false);
    assert.equal(result.failure.kind, "bad-request");
    assert.equal(result.failure.acceptance, "not-accepted");
    assert.equal(result.failure.retainForRetry, false);
  }
  assert.equal(requests, 0, "invalid top-level scope must fail before any request, including for empty run pages");
});

test("A12 and A13 share the exact notice DTO, request key, conflict, and production partial-success contract", async () => {
  const client = await loadRequestState();
  const queueTeacherNoticeRequest = requireFunction(client, "queueTeacherNoticeRequest");
  const handlers = await import("@/lib/server/teacherNoticeEmailOutboxHandlers") as Record<string, unknown>;
  const createHandler = requireFunction(handlers, "createTeacherNoticeEmailSendHandler") as (
    dependencies: Record<string, unknown>
  ) => (
    request: Request,
    context: { params: Promise<{ noticeId: string }> }
  ) => Promise<Response>;
  const calls: Array<Record<string, unknown>> = [];
  const handler = createHandler({
    authenticate: async () => ({ user: { id: "teacher-1", role: "teacher" } }),
    queueNoticeEmail: async (input: Record<string, unknown>) => {
      calls.push(input);
      return {
        status: "sent",
        notice: teacherNotice(),
        attempt: teacherAttempt(),
        email: { status: "queued", queued: 1, reused: 0, recovered: 0, skipped: 0 }
      };
    }
  });
  const bridge = (
    target: (request: Request, context: { params: Promise<{ noticeId: string }> }) => Promise<Response>
  ) => async (input: string, init?: RequestInit) => target(
    new Request(new URL(input, "https://mais.example"), init),
    { params: Promise.resolve({ noticeId: "notice-1" }) }
  );

  const accepted = await queueTeacherNoticeRequest({
    intent: teacherNoticeQueueIntent(),
    idempotencyKey: "teacher-operation/direct-notice-000001",
    request: bridge(handler)
  });
  assert.equal(accepted.ok, true, "the real A12 202 response must pass the A13 closed DTO validator");
  assert.deepEqual(calls, [{
    teacherId: "teacher-1",
    noticeId: "notice-1",
    idempotencyKey: "teacher-operation/direct-notice-000001"
  }]);

  const noEmailHandler = createHandler({
    authenticate: async () => ({ user: { id: "teacher-1", role: "teacher" } }),
    queueNoticeEmail: async () => ({
      status: "sent",
      notice: teacherNotice(),
      attempt: teacherAttempt(),
      email: { status: "no-eligible", skipped: 1 }
    })
  });
  const acceptedWithoutEmail = await queueTeacherNoticeRequest({
    intent: teacherNoticeQueueIntent(),
    idempotencyKey: "teacher-operation/direct-no-email-0001",
    request: bridge(noEmailHandler)
  });
  assert.equal(acceptedWithoutEmail.ok, true, "a real sent result with no eligible email is terminal partial success");
  if (acceptedWithoutEmail.ok) {
    assert.deepEqual(acceptedWithoutEmail.payload.email, { status: "no-eligible", skipped: 1 });
  }

  for (const [serverStatus, expectedKind] of [
    ["conflict", "idempotency-conflict"]
  ] as const) {
    const conflictHandler = createHandler({
      authenticate: async () => ({ user: { id: "teacher-1", role: "teacher" } }),
      queueNoticeEmail: async () => ({ status: serverStatus })
    });
    const result = await queueTeacherNoticeRequest({
      intent: teacherNoticeQueueIntent(),
      idempotencyKey: `teacher-operation/direct-${serverStatus}-0001`,
      request: bridge(conflictHandler)
    });
    assert.equal(result.ok, false);
    assert.equal(result.kind, expectedKind);
    assert.equal(result.httpStatus, 409);
    assert.equal(result.retainForRetry, false);
  }
});

test("A12 accepts A13 automatic, manual, cursor, and page-key reminder requests", async () => {
  const client = await loadRequestState();
  const createState = requireFunction(client, "createTeacherReminderRequestState");
  const runPages = requireFunction(client, "runTeacherReminderPages");
  const handlers = await import("@/lib/server/teacherNoticeEmailOutboxHandlers") as Record<string, unknown>;
  const createHandler = requireFunction(handlers, "createTeacherMissingWorkReminderRunHandler") as (
    dependencies: Record<string, unknown>
  ) => (request: Request) => Promise<Response>;
  const calls: Array<Record<string, unknown>> = [];
  const handler = createHandler({
    authenticate: async () => ({ user: { id: "teacher-1", role: "teacher" } }),
    authorize: (user: { role: string }) => user.role === "teacher",
    runReminders: async (input: Record<string, unknown>) => {
      calls.push(input);
      return {
        status: "ran",
        runs: [],
        nextCursor: input.manual === false && input.cursor === null ? "cursor-direct-1" : null
      };
    }
  });
  const bridge = async (input: string, init?: RequestInit) => handler(
    new Request(new URL(input, "https://mais.example"), init)
  );

  const automatic = await runPages({
    intent: { teacherId: "teacher-1", classId: "class-1", assignmentId: null, manual: false },
    state: createState("teacher-operation/direct-auto-0000001"),
    request: bridge
  });
  assert.equal(automatic.ok, true);
  assert.deepEqual(calls.slice(0, 2), [
    {
      teacherId: "teacher-1",
      classId: "class-1",
      assignmentId: null,
      manual: false,
      cursor: null,
      idempotencyKey: "teacher-operation/direct-auto-0000001/page/0"
    },
    {
      teacherId: "teacher-1",
      classId: "class-1",
      assignmentId: null,
      manual: false,
      cursor: "cursor-direct-1",
      idempotencyKey: "teacher-operation/direct-auto-0000001/page/1"
    }
  ]);

  const manual = await runPages({
    intent: { teacherId: "teacher-1", classId: "class-1", assignmentId: "assignment-1", manual: true },
    state: createState("teacher-operation/direct-manual-0001"),
    request: bridge
  });
  assert.equal(manual.ok, true);
  assert.deepEqual(calls[2], {
    teacherId: "teacher-1",
    classId: "class-1",
    assignmentId: "assignment-1",
    manual: true,
    cursor: null,
    idempotencyKey: "teacher-operation/direct-manual-0001/page/0"
  });
});

function teacherNotice(id = "notice-1") {
  return {
    id,
    teacherId: "teacher-1",
    classId: "class-1",
    className: "Class 1",
    audience: "parents",
    channelId: "channel-1",
    channelName: "Channel 1",
    subject: { en: "Subject", zh: "標題" },
    body: { en: "Body", zh: "內容" },
    status: "queued",
    dueAt: null,
    createdAt: "2026-08-24T00:00:00.000Z",
    updatedAt: "2026-08-24T00:00:00.000Z",
    sentAt: null,
    recipients: [],
    deliveryAttempts: [],
    acknowledgement: { total: 0, acknowledged: 0, pending: 0 }
  };
}

function teacherAttempt(noticeId = "notice-1") {
  return {
    id: "attempt-1",
    noticeId,
    channelId: "channel-1",
    channelName: "Channel 1",
    status: "disabled",
    attemptedAt: "2026-08-24T00:00:00.000Z"
  };
}

function teacherNoticeQueueIntent(noticeId = "notice-1") {
  return {
    noticeId,
    teacherId: "teacher-1",
    classId: "class-1",
    channelId: "channel-1"
  };
}

test("notice queue responses are bound to the original card id, teacher, class, and channel", async () => {
  const module = await loadRequestState();
  const queueTeacherNoticeRequest = requireFunction(module, "queueTeacherNoticeRequest");
  const createIntent = requireFunction(module, "createTeacherNoticeQueueIntent");
  const intent = createIntent(teacherNotice());
  assert.deepEqual(intent, teacherNoticeQueueIntent());
  const request = (notice: Record<string, unknown>) => queueTeacherNoticeRequest({
    intent,
    idempotencyKey: "teacher-operation/key-bound-card-000001",
    request: async () => new Response(JSON.stringify({
      notice,
      attempt: teacherAttempt(),
      email: { status: "queued", queued: 1, reused: 0, recovered: 0, skipped: 0 }
    }), { status: 202 })
  });

  assert.equal((await request(teacherNotice())).ok, true);
  for (const notice of [
    { ...teacherNotice(), id: "notice-other" },
    { ...teacherNotice(), teacherId: "teacher-other" },
    { ...teacherNotice(), classId: "class-other" },
    { ...teacherNotice(), channelId: "channel-other" }
  ]) {
    const result = await request(notice);
    assert.equal(result.ok, false);
    assert.equal(result.kind, "invalid-response");
  }
});

test("an invalid notice-card intent fails closed before any request", async () => {
  const module = await loadRequestState();
  const queueTeacherNoticeRequest = requireFunction(module, "queueTeacherNoticeRequest");
  let requests = 0;
  for (const intent of [
    null,
    { ...teacherNoticeQueueIntent(), noticeId: "" },
    { ...teacherNoticeQueueIntent(), teacherId: " teacher-1" },
    { ...teacherNoticeQueueIntent(), classId: "\u0000class-1" },
    { ...teacherNoticeQueueIntent(), channelId: " " }
  ]) {
    const result = await queueTeacherNoticeRequest({
      intent,
      idempotencyKey: "teacher-operation/key-invalid-card-0001",
      request: async () => {
        requests += 1;
        return new Response(JSON.stringify({}), { status: 202 });
      }
    });
    assert.equal(result.ok, false);
    assert.equal(result.kind, "bad-request");
    assert.equal(result.retainForRetry, false);
  }
  assert.equal(requests, 0);
});

test("notice queue DTO rejects every malformed timestamp before UI consumption", async () => {
  const module = await loadRequestState();
  const queueTeacherNoticeRequest = requireFunction(module, "queueTeacherNoticeRequest");
  const recipient = {
    id: "recipient-1",
    noticeId: "notice-1",
    studentId: "student-1",
    studentName: "Student One",
    guardianId: "guardian-1",
    guardianName: "Guardian One",
    status: "acknowledged",
    acknowledgedBy: "guardian-1",
    acknowledgedAt: "2026-08-24T00:01:00.000Z",
    createdAt: "2026-08-24T00:00:00.000Z"
  };
  const validNotice = {
    ...teacherNotice(),
    dueAt: "2026-08-25T00:00:00.000Z",
    sentAt: "2026-08-24T00:02:00.000Z",
    recipients: [recipient],
    deliveryAttempts: [teacherAttempt()],
    acknowledgement: { total: 1, acknowledged: 1, pending: 0 }
  };
  const invalidNotices = [
    { ...validNotice, createdAt: "not-a-timestamp" },
    { ...validNotice, updatedAt: "2026-02-30T00:00:00.000Z" },
    { ...validNotice, dueAt: "24 August 2026" },
    { ...validNotice, sentAt: "2026-08-24" },
    { ...validNotice, recipients: [{ ...recipient, createdAt: "yesterday" }] },
    { ...validNotice, recipients: [{ ...recipient, acknowledgedAt: "soon" }] },
    { ...validNotice, deliveryAttempts: [{ ...teacherAttempt(), attemptedAt: "invalid" }] }
  ];

  for (const notice of invalidNotices) {
    const result = await queueTeacherNoticeRequest({
      intent: teacherNoticeQueueIntent(),
      idempotencyKey: "teacher-operation/key-invalid-time-0001",
      request: async () => new Response(JSON.stringify({
        notice,
        attempt: teacherAttempt(),
        email: { status: "queued", queued: 1, reused: 0, recovered: 0, skipped: 0 }
      }), { status: 202 })
    });
    assert.equal(result.ok, false);
    assert.equal(result.kind, "invalid-response");
  }

  const invalidReturnedAttempt = await queueTeacherNoticeRequest({
    intent: teacherNoticeQueueIntent(),
    idempotencyKey: "teacher-operation/key-invalid-time-0001",
    request: async () => new Response(JSON.stringify({
      notice: validNotice,
      attempt: { ...teacherAttempt(), attemptedAt: "invalid" },
      email: { status: "queued", queued: 1, reused: 0, recovered: 0, skipped: 0 }
    }), { status: 202 })
  });
  assert.equal(invalidReturnedAttempt.ok, false);
  assert.equal(invalidReturnedAttempt.kind, "invalid-response");
});

test("notice send posts its intent key and accepts only the 202 queued aggregate", async () => {
  const module = await loadRequestState();
  const queueTeacherNoticeRequest = requireFunction(module, "queueTeacherNoticeRequest");
  const requests: Array<{ input: string; init?: RequestInit }> = [];
  const queuedPayload = {
    notice: teacherNotice(),
    attempt: teacherAttempt(),
    email: { status: "queued", queued: 1, reused: 0, recovered: 0, skipped: 0 }
  };

  const result = await queueTeacherNoticeRequest({
    intent: teacherNoticeQueueIntent(),
    idempotencyKey: "teacher-operation/key-0000000000000001",
    request: async (input: string, init?: RequestInit) => {
      requests.push({ input, init });
      return new Response(JSON.stringify(queuedPayload), {
        status: 202,
        headers: { "Content-Type": "application/json" }
      });
    }
  });

  assert.deepEqual(result, { ok: true, payload: queuedPayload });
  assert.equal(requests.length, 1);
  assert.equal(requests[0]?.input, "/api/teacher/notices/notice-1/deliveries");
  assert.equal(requests[0]?.init?.method, "POST");
  assert.deepEqual(JSON.parse(String(requests[0]?.init?.body)), {
    idempotencyKey: "teacher-operation/key-0000000000000001"
  });
});

test("nearly complete but invalid 202 aggregates are rejected before rendering", async () => {
  const module = await loadRequestState();
  const queueTeacherNoticeRequest = requireFunction(module, "queueTeacherNoticeRequest");
  const base = {
    notice: teacherNotice(),
    attempt: teacherAttempt(),
    email: { status: "queued", queued: 1, reused: 0, recovered: 0, skipped: 0 }
  };
  const invalidPayloads = [
    { ...base, attempt: { status: "disabled" } },
    { ...base, attempt: { ...base.attempt, status: "invented" } },
    { ...base, notice: { ...base.notice, deliveryAttempts: [{}] } },
    { ...base, notice: { ...base.notice, acknowledgement: { total: 1, acknowledged: 1, pending: 1 } } },
    { ...base, notice: { ...base.notice, acknowledgement: { total: 0, acknowledged: Number.NaN, pending: 0 } } },
    { ...base, email: { ...base.email, queued: -1 } },
    { ...base, notice: { ...base.notice, id: "notice-other" } },
    { ...base, attempt: { ...base.attempt, channelId: "channel-other" } }
  ];

  for (const payload of invalidPayloads) {
    const result = await queueTeacherNoticeRequest({
      intent: teacherNoticeQueueIntent(),
      idempotencyKey: "teacher-operation/key-0000000000000001",
      request: async () => new Response(JSON.stringify(payload), { status: 202 })
    });
    assert.equal(result.ok, false);
    assert.equal(result.kind, "invalid-response");
    assert.equal(result.retainForRetry, true);
  }
});

test("a production 202 preserves the terminal no-eligible email outcome as partial success", async () => {
  const module = await loadRequestState();
  const queueTeacherNoticeRequest = requireFunction(module, "queueTeacherNoticeRequest");
  const result = await queueTeacherNoticeRequest({
    intent: teacherNoticeQueueIntent(),
    idempotencyKey: "teacher-operation/key-0000000000000001",
    request: async () => new Response(JSON.stringify({
      notice: teacherNotice(),
      attempt: teacherAttempt(),
      email: { status: "no-eligible", skipped: 1 }
    }), { status: 202 })
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.payload.email, { status: "no-eligible", skipped: 1 });
});

test("notice receipts must agree with recipient acknowledgement status and fields", async () => {
  const module = await loadRequestState();
  const queueTeacherNoticeRequest = requireFunction(module, "queueTeacherNoticeRequest");
  const pendingButCountedAsAcknowledged = {
    id: "recipient-1",
    noticeId: "notice-1",
    studentId: "student-1",
    studentName: "Student One",
    guardianId: "guardian-1",
    guardianName: "Guardian One",
    status: "pending",
    acknowledgedBy: "guardian-1",
    acknowledgedAt: "2026-08-24T00:00:00.000Z",
    createdAt: "2026-08-23T00:00:00.000Z"
  };
  const acknowledgedWithoutEvidence = {
    ...pendingButCountedAsAcknowledged,
    status: "acknowledged",
    acknowledgedBy: undefined,
    acknowledgedAt: null
  };

  for (const { recipient, acknowledgement } of [
    {
      recipient: pendingButCountedAsAcknowledged,
      acknowledgement: { total: 1, acknowledged: 1, pending: 0 }
    },
    {
      recipient: acknowledgedWithoutEvidence,
      acknowledgement: { total: 1, acknowledged: 1, pending: 0 }
    }
  ]) {
    const result = await queueTeacherNoticeRequest({
      intent: teacherNoticeQueueIntent(),
      idempotencyKey: "teacher-operation/key-0000000000000001",
      request: async () => new Response(JSON.stringify({
        notice: { ...teacherNotice(), recipients: [recipient], acknowledgement },
        attempt: teacherAttempt(),
        email: { status: "queued", queued: 1, reused: 0, recovered: 0, skipped: 0 }
      }), { status: 202 })
    });
    assert.equal(result.ok, false);
    assert.equal(result.kind, "invalid-response");
    assert.equal(result.acceptance, "accepted");
    assert.equal(result.retainForRetry, true);
  }
});

test("an acknowledged notice recipient is accepted only when acknowledgedBy equals guardianId", async () => {
  const module = await loadRequestState();
  const queueTeacherNoticeRequest = requireFunction(module, "queueTeacherNoticeRequest");
  const recipient = {
    id: "recipient-1",
    noticeId: "notice-1",
    studentId: "student-1",
    studentName: "Student One",
    guardianId: "guardian-1",
    guardianName: "Guardian One",
    status: "acknowledged",
    acknowledgedBy: "guardian-other",
    acknowledgedAt: "2026-08-24T00:00:00.000Z",
    createdAt: "2026-08-23T00:00:00.000Z"
  };
  const result = await queueTeacherNoticeRequest({
    intent: teacherNoticeQueueIntent(),
    idempotencyKey: "teacher-operation/key-ack-guardian-0001",
    request: async () => new Response(JSON.stringify({
      notice: {
        ...teacherNotice(),
        recipients: [recipient],
        acknowledgement: { total: 1, acknowledged: 1, pending: 0 }
      },
      attempt: teacherAttempt(),
      email: { status: "queued", queued: 1, reused: 0, recovered: 0, skipped: 0 }
    }), { status: 202 })
  });

  assert.equal(result.ok, false);
  assert.equal(result.kind, "invalid-response");
});

test("notice and returned delivery-attempt statuses must form one consistent state", async () => {
  const module = await loadRequestState();
  const queueTeacherNoticeRequest = requireFunction(module, "queueTeacherNoticeRequest");
  const send = (noticeStatus: string, attemptStatus: string) => queueTeacherNoticeRequest({
    intent: teacherNoticeQueueIntent(),
    idempotencyKey: "teacher-operation/key-status-pair-0001",
    request: async () => new Response(JSON.stringify({
      notice: {
        ...teacherNotice(),
        status: noticeStatus,
        sentAt: noticeStatus === "sent" ? "2026-08-24T00:01:00.000Z" : null
      },
      attempt: { ...teacherAttempt(), status: attemptStatus },
      email: { status: "queued", queued: 1, reused: 0, recovered: 0, skipped: 0 }
    }), { status: 202 })
  });

  for (const [noticeStatus, attemptStatus] of [
    ["queued", "queued"],
    ["queued", "disabled"],
    ["sent", "sent"],
    ["failed", "failed"]
  ]) {
    assert.equal((await send(noticeStatus, attemptStatus)).ok, true, `${noticeStatus}/${attemptStatus} should be consistent`);
  }
  for (const [noticeStatus, attemptStatus] of [
    ["draft", "queued"],
    ["queued", "sent"],
    ["queued", "failed"],
    ["sent", "queued"],
    ["sent", "disabled"],
    ["sent", "failed"],
    ["failed", "queued"],
    ["failed", "sent"],
    ["failed", "disabled"]
  ]) {
    const result = await send(noticeStatus, attemptStatus);
    assert.equal(result.ok, false, `${noticeStatus}/${attemptStatus} must fail closed`);
    assert.equal(result.kind, "invalid-response");
  }
});

test("notice reconciliation keeps a fresh local queue result until equal or newer server data arrives", async () => {
  const module = await loadRequestState();
  const reconcile = requireFunction(module, "reconcileTeacherNoticeOverride");
  const reconcileCollection = requireFunction(module, "reconcileTeacherNoticeCollection");
  const localQueued = {
    ...teacherNotice(),
    status: "queued",
    updatedAt: "2026-08-24T10:00:00.000Z"
  };
  const staleServer = {
    ...teacherNotice(),
    status: "draft",
    updatedAt: "2026-08-24T09:59:59.000Z"
  };
  const equalServer = {
    ...teacherNotice(),
    status: "sent",
    updatedAt: localQueued.updatedAt,
    sentAt: localQueued.updatedAt
  };
  const newerServer = {
    ...teacherNotice(),
    status: "failed",
    updatedAt: "2026-08-24T10:00:01.000Z"
  };

  assert.equal(reconcile(staleServer, localQueued), localQueued);
  assert.equal(reconcile(equalServer, localQueued), equalServer);
  assert.equal(reconcile(newerServer, localQueued), newerServer);
  assert.equal(reconcile(newerServer, undefined), newerServer);

  assert.deepEqual(reconcileCollection([staleServer], { [localQueued.id]: localQueued }), [localQueued],
    "old server props must not erase the immediate queued override");
  assert.deepEqual(reconcileCollection([equalServer], { [localQueued.id]: localQueued }), [equalServer],
    "an equal-timestamp server refresh must replace the local override");
  assert.deepEqual(reconcileCollection([newerServer], { [localQueued.id]: localQueued }), [newerServer],
    "a newer server refresh must replace the local override");
});

test("notice failures distinguish terminal HTTP errors, Retry-After, ambiguous network, and accepted-invalid JSON", async () => {
  const module = await loadRequestState();
  const queueTeacherNoticeRequest = requireFunction(module, "queueTeacherNoticeRequest");
  const idempotencyKey = "teacher-operation/key-0000000000000001";
  const requestForStatus = (status: number, retryAfter?: string) => queueTeacherNoticeRequest({
    intent: teacherNoticeQueueIntent(),
    idempotencyKey,
    now: 1_000,
    request: async () => new Response(JSON.stringify({ error: "opaque" }), {
      status,
      headers: retryAfter ? { "Retry-After": retryAfter } : undefined
    })
  });

  assert.deepEqual(await requestForStatus(400), {
    ok: false,
    kind: "bad-request",
    httpStatus: 400,
    acceptance: "not-accepted",
    retainForRetry: false,
    retryAfterMs: null
  });
  assert.equal((await requestForStatus(404)).kind, "not-found");
  assert.equal((await requestForStatus(413)).kind, "too-large");
  assert.deepEqual(await requestForStatus(429, "7"), {
    ok: false,
    kind: "rate-limited",
    httpStatus: 429,
    acceptance: "not-accepted",
    retainForRetry: true,
    retryAfterMs: 7_000
  });
  assert.equal((await requestForStatus(503)).kind, "service-unavailable");

  const network = await queueTeacherNoticeRequest({
    intent: teacherNoticeQueueIntent(),
    idempotencyKey,
    request: async () => {
      throw new TypeError("offline");
    }
  });
  assert.deepEqual(network, {
    ok: false,
    kind: "network",
    httpStatus: null,
    acceptance: "unknown",
    retainForRetry: true,
    retryAfterMs: null
  });

  const acceptedInvalidJson = await queueTeacherNoticeRequest({
    intent: teacherNoticeQueueIntent(),
    idempotencyKey,
    request: async () => new Response("not-json", { status: 202 })
  });
  assert.deepEqual(acceptedInvalidJson, {
    ok: false,
    kind: "invalid-response",
    httpStatus: 202,
    acceptance: "accepted",
    retainForRetry: true,
    retryAfterMs: null
  });
});

test("only allowlisted stable 409 codes distinguish idempotency conflict from no eligible recipients", async () => {
  const module = await loadRequestState();
  const queueTeacherNoticeRequest = requireFunction(module, "queueTeacherNoticeRequest");
  const send409 = (body: unknown) => queueTeacherNoticeRequest({
    intent: teacherNoticeQueueIntent(),
    idempotencyKey: "teacher-operation/key-0000000000000001",
    request: async () => new Response(JSON.stringify(body), { status: 409 })
  });

  assert.equal((await send409({ code: "IDEMPOTENCY_CONFLICT", error: "ignored" })).kind, "idempotency-conflict");
  assert.equal((await send409({ code: "NO_ELIGIBLE_RECIPIENTS", error: "ignored" })).kind, "no-eligible-recipients");
  assert.equal((await send409({ code: "SENSITIVE_INTERNAL_CODE", error: "do not trust" })).kind, "conflict");
  assert.equal((await send409({ error: "No eligible family email recipients are currently available." })).kind, "conflict");
});

test("partial reminder failures promise cursor recovery only for retryable outcomes", async () => {
  const module = await loadRequestState();
  const disposition = requireFunction(module, "teacherReminderPartialFailureDisposition");
  const retryable = {
    ok: false,
    kind: "service-unavailable",
    httpStatus: 503,
    acceptance: "not-accepted",
    retainForRetry: true,
    retryAfterMs: null
  };
  const terminal = {
    ok: false,
    kind: "idempotency-conflict",
    httpStatus: 409,
    acceptance: "not-accepted",
    retainForRetry: false,
    retryAfterMs: null
  };

  assert.equal(disposition(retryable, 2), "retryable-partial");
  assert.equal(disposition(terminal, 2), "terminal-partial");
  assert.equal(disposition(terminal, 0), "none");
});

test("a partial terminal 409 clears reload recovery and never promises the old cursor or request key", async () => {
  const module = await loadRequestState();
  const Registry = requireFunction(module, "TeacherOperationIntentRegistry") as unknown as new (
    createKey: () => string,
    recovery?: unknown
  ) => {
    begin(intent: string): Promise<{ status: "started"; idempotencyKey: string } | { status: "busy" }>;
    finish(intent: string, idempotencyKey: string, retainForRetry: boolean): Promise<void>;
  };
  const RecoveryStore = requireFunction(module, "TeacherOperationRecoveryStore") as unknown as new (
    scope: { teacherId: string; classId: string },
    storage: Storage,
    digest: (value: string) => Promise<string>
  ) => unknown;
  const createState = requireFunction(module, "createTeacherReminderRequestState");
  const runPages = requireFunction(module, "runTeacherReminderPages");
  const failureMessage = requireFunction(module, "teacherOperationFailureMessage");
  const values = new Map<string, string>();
  const storage = {
    get length() { return values.size; },
    clear() { values.clear(); },
    getItem(key: string) { return values.get(key) ?? null; },
    key(index: number) { return [...values.keys()][index] ?? null; },
    removeItem(key: string) { values.delete(key); },
    setItem(key: string, value: string) { values.set(key, value); }
  } satisfies Storage;
  const recovery = new RecoveryStore(
    { teacherId: "teacher-1", classId: "class-1" },
    storage,
    async () => "d".repeat(64)
  );
  const generatedKeys = [
    "teacher-operation/key-terminal-000001",
    "teacher-operation/key-after-terminal-01"
  ];
  const registry = new Registry(() => generatedKeys.shift() ?? "unexpected", recovery);
  const intentKey = "reminder:class-1:automatic:all";
  const started = await registry.begin(intentKey);
  assert.equal(started.status, "started");
  const idempotencyKey = started.status === "started" ? started.idempotencyKey : "";
  let page = 0;
  const result = await runPages({
    intent: { teacherId: "teacher-1", classId: "class-1", assignmentId: null, manual: false },
    state: createState(idempotencyKey),
    request: async () => {
      page += 1;
      if (page === 1) {
        return new Response(JSON.stringify({
          runs: [{ ...reminderRun("partial"), threshold: "overdue-24h" }],
          nextCursor: "assignment-private-1\u0000student-private-1"
        }), { status: 200 });
      }
      return new Response(JSON.stringify({ code: "IDEMPOTENCY_CONFLICT" }), { status: 409 });
    }
  });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.state.acceptedRunCount, 1);
  assert.equal(result.failure.kind, "idempotency-conflict");
  assert.equal(result.failure.retainForRetry, false);
  const copy = failureMessage(result.failure, "reminder", result.state.acceptedRunCount, ({ en }: { en: string }) => en);
  assert.match(copy, /Refresh and review the results before starting a new request/u);
  assert.doesNotMatch(copy, /same cursor|reuse the same request key/u);

  await registry.finish(intentKey, idempotencyKey, result.failure.retainForRetry);
  assert.equal(values.size, 0, "terminal partial failures must remove reload recovery");
  assert.deepEqual(await registry.begin(intentKey), {
    status: "started",
    idempotencyKey: "teacher-operation/key-after-terminal-01"
  });
});

test("a 202 body with an incomplete notice is accepted by HTTP but rejected as unsafe to render", async () => {
  const module = await loadRequestState();
  const queueTeacherNoticeRequest = requireFunction(module, "queueTeacherNoticeRequest");
  const result = await queueTeacherNoticeRequest({
    intent: teacherNoticeQueueIntent(),
    idempotencyKey: "teacher-operation/key-0000000000000001",
    request: async () => new Response(JSON.stringify({
      notice: { id: "notice-1", status: "queued" },
      attempt: { status: "disabled" },
      email: { status: "no-eligible", skipped: 1 }
    }), { status: 202 })
  });

  assert.deepEqual(result, {
    ok: false,
    kind: "invalid-response",
    httpStatus: 202,
    acceptance: "accepted",
    retainForRetry: true,
    retryAfterMs: null
  });
});

test("Retry-After supports both delta seconds and HTTP dates", async () => {
  const module = await loadRequestState();
  const retryAfterMilliseconds = requireFunction(module, "retryAfterMilliseconds");
  const now = Date.parse("2026-08-24T00:00:00.000Z");

  assert.equal(retryAfterMilliseconds("9", now), 9_000);
  assert.equal(retryAfterMilliseconds("Sun, 24 Aug 2026 00:00:12 GMT", now), 12_000);
  assert.equal(retryAfterMilliseconds("invalid", now), null);
  assert.equal(retryAfterMilliseconds(null, now), null);
});

function reminderRun(id: string) {
  return {
    id,
    teacherId: "teacher-1",
    classId: "class-1",
    assignmentId: `assignment-${id}`,
    studentId: `student-${id}`,
    threshold: "manual",
    status: "queued",
    reason: "fixture",
    createdAt: "2026-08-24T00:00:00.000Z"
  };
}

test("one reminder intent follows every cursor page exactly once with stable page keys", async () => {
  const module = await loadRequestState();
  const createTeacherReminderRequestState = requireFunction(module, "createTeacherReminderRequestState");
  const runTeacherReminderPages = requireFunction(module, "runTeacherReminderPages");
  const requestBodies: Array<Record<string, unknown>> = [];
  const pages = [
    { cursor: null, runs: Array.from({ length: 100 }, (_, index) => ({ ...reminderRun(`a-${index}`), threshold: "overdue-24h" })), nextCursor: "cursor-B" },
    { cursor: "cursor-B", runs: Array.from({ length: 100 }, (_, index) => ({ ...reminderRun(`b-${index}`), threshold: "overdue-24h" })), nextCursor: "cursor-C" },
    { cursor: "cursor-C", runs: Array.from({ length: 5 }, (_, index) => ({ ...reminderRun(`c-${index}`), threshold: "overdue-24h" })), nextCursor: null }
  ];

  const result = await runTeacherReminderPages({
    intent: { teacherId: "teacher-1", classId: "class-1", assignmentId: null, manual: false },
    state: createTeacherReminderRequestState("teacher-operation/key-0000000000000001"),
    request: async (_input: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      requestBodies.push(body);
      const page = pages[requestBodies.length - 1];
      assert.equal(Object.prototype.hasOwnProperty.call(body, "cursor"), page?.cursor !== null);
      if (page?.cursor !== null) assert.equal(body.cursor, page?.cursor);
      assert.equal(Object.prototype.hasOwnProperty.call(body, "assignmentId"), false);
      return new Response(JSON.stringify({ runs: page?.runs, nextCursor: page?.nextCursor }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
  });

  assert.equal(result.ok, true);
  assert.equal(result.state.runs.length, 205);
  assert.deepEqual(requestBodies.map((body) => body.idempotencyKey), [
    "teacher-operation/key-0000000000000001/page/0",
    "teacher-operation/key-0000000000000001/page/1",
    "teacher-operation/key-0000000000000001/page/2"
  ]);
  assert.deepEqual(requestBodies.map((body) => body.cursor ?? null), [null, "cursor-B", "cursor-C"]);
});

test("a failed reminder page retains its cursor, accumulated runs, and exact key for safe retry", async () => {
  const module = await loadRequestState();
  const createTeacherReminderRequestState = requireFunction(module, "createTeacherReminderRequestState");
  const runTeacherReminderPages = requireFunction(module, "runTeacherReminderPages");
  const failedBodies: Array<Record<string, unknown>> = [];
  let calls = 0;
  const firstAttempt = await runTeacherReminderPages({
    intent: { teacherId: "teacher-1", classId: "class-1", assignmentId: "assignment-1", manual: true },
    state: createTeacherReminderRequestState("teacher-operation/key-0000000000000001"),
    request: async (_input: string, init?: RequestInit) => {
      calls += 1;
      failedBodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
      if (calls === 1) {
        return new Response(JSON.stringify({ runs: [{ ...reminderRun("first"), assignmentId: "assignment-1" }], nextCursor: "cursor-next" }), { status: 200 });
      }
      throw new TypeError("offline");
    }
  });

  assert.equal(firstAttempt.ok, false);
  assert.equal(firstAttempt.failure.kind, "network");
  assert.equal(firstAttempt.state.cursor, "cursor-next");
  assert.equal(firstAttempt.state.pageIndex, 1);
  assert.deepEqual(firstAttempt.state.runs.map((run: { id: string }) => run.id), ["first"]);

  const retryBodies: Array<Record<string, unknown>> = [];
  const retry = await runTeacherReminderPages({
    intent: { teacherId: "teacher-1", classId: "class-1", assignmentId: "assignment-1", manual: true },
    state: firstAttempt.state,
    request: async (_input: string, init?: RequestInit) => {
      retryBodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
      return new Response(JSON.stringify({ runs: [{ ...reminderRun("second"), assignmentId: "assignment-1" }], nextCursor: null }), { status: 200 });
    }
  });

  assert.equal(retry.ok, true);
  assert.deepEqual(retry.state.runs.map((run: { id: string }) => run.id), ["first", "second"]);
  assert.equal(failedBodies[1]?.idempotencyKey, "teacher-operation/key-0000000000000001/page/1");
  assert.equal(retryBodies[0]?.idempotencyKey, failedBodies[1]?.idempotencyKey);
  assert.equal(retryBodies[0]?.cursor, "cursor-next");
});

test("each successful reminder page checkpoints the next exact cursor before another request starts", async () => {
  const module = await loadRequestState();
  const createTeacherReminderRequestState = requireFunction(module, "createTeacherReminderRequestState");
  const runTeacherReminderPages = requireFunction(module, "runTeacherReminderPages");
  const checkpoints: Array<Record<string, unknown>> = [];
  let calls = 0;
  const result = await runTeacherReminderPages({
    intent: { teacherId: "teacher-1", classId: "class-1", assignmentId: null, manual: false },
    state: createTeacherReminderRequestState("teacher-operation/key-0000000000000001"),
    onStateChange: (state: Record<string, unknown>) => checkpoints.push(state),
    request: async () => {
      calls += 1;
      if (calls === 1) {
        return new Response(JSON.stringify({ runs: [{ ...reminderRun("first"), threshold: "overdue-24h" }], nextCursor: "cursor-next" }), { status: 200 });
      }
      return new Response(JSON.stringify({ runs: [], nextCursor: null }), { status: 200 });
    }
  });

  assert.equal(result.ok, true);
  assert.equal(checkpoints.length, 2);
  assert.equal(checkpoints[0]?.cursor, "cursor-next");
  assert.equal(checkpoints[0]?.pageIndex, 1);
  assert.equal(checkpoints[0]?.acceptedRunCount, 1);
});

test("a reminder page rejects incomplete runs before the UI renders them", async () => {
  const module = await loadRequestState();
  const createTeacherReminderRequestState = requireFunction(module, "createTeacherReminderRequestState");
  const runTeacherReminderPages = requireFunction(module, "runTeacherReminderPages");
  const result = await runTeacherReminderPages({
    intent: { teacherId: "teacher-1", classId: "class-1", assignmentId: null, manual: false },
    state: createTeacherReminderRequestState("teacher-operation/key-0000000000000001"),
    request: async () => new Response(JSON.stringify({ runs: [{ id: "run-only" }], nextCursor: null }), { status: 200 })
  });

  assert.equal(result.ok, false);
  assert.equal(result.failure.kind, "invalid-response");
  assert.equal(result.failure.acceptance, "accepted");
});

test("a reminder page rejects invented threshold and delivery status values", async () => {
  const module = await loadRequestState();
  const createTeacherReminderRequestState = requireFunction(module, "createTeacherReminderRequestState");
  const runTeacherReminderPages = requireFunction(module, "runTeacherReminderPages");
  for (const run of [
    { ...reminderRun("bad-threshold"), threshold: "tomorrow-ish" },
    { ...reminderRun("bad-status"), status: "probably-sent" },
    { ...reminderRun("bad-time"), createdAt: "2026-02-30T00:00:00.000Z" }
  ]) {
    const result = await runTeacherReminderPages({
      intent: { teacherId: "teacher-1", classId: "class-1", assignmentId: null, manual: false },
      state: createTeacherReminderRequestState("teacher-operation/key-0000000000000001"),
      request: async () => new Response(JSON.stringify({ runs: [run], nextCursor: null }), { status: 200 })
    });
    assert.equal(result.ok, false);
    assert.equal(result.failure.kind, "invalid-response");
    assert.equal(result.failure.retainForRetry, true);
  }
});

test("reminder pages are bound to the requested teacher, class, assignment, and trigger mode", async () => {
  const module = await loadRequestState();
  const createTeacherReminderRequestState = requireFunction(module, "createTeacherReminderRequestState");
  const runTeacherReminderPages = requireFunction(module, "runTeacherReminderPages");
  const correctRun = {
    ...reminderRun("scoped"),
    teacherId: "teacher-1",
    classId: "class-1",
    assignmentId: "assignment-1",
    threshold: "manual"
  };
  const invalidCases = [
    { intent: { teacherId: "teacher-1", classId: "class-1", assignmentId: "assignment-1", manual: true }, run: { ...correctRun, teacherId: "teacher-other" } },
    { intent: { teacherId: "teacher-1", classId: "class-1", assignmentId: "assignment-1", manual: true }, run: { ...correctRun, classId: "class-other" } },
    { intent: { teacherId: "teacher-1", classId: "class-1", assignmentId: "assignment-1", manual: true }, run: { ...correctRun, assignmentId: "assignment-other" } },
    { intent: { teacherId: "teacher-1", classId: "class-1", assignmentId: "assignment-1", manual: true }, run: { ...correctRun, threshold: "overdue-24h" } },
    { intent: { teacherId: "teacher-1", classId: "class-1", assignmentId: null, manual: false }, run: { ...correctRun, threshold: "manual" } }
  ];

  for (const { intent, run } of invalidCases) {
    const result = await runTeacherReminderPages({
      intent,
      state: createTeacherReminderRequestState("teacher-operation/key-0000000000000001"),
      request: async () => new Response(JSON.stringify({ runs: [run], nextCursor: null }), { status: 200 })
    });
    assert.equal(result.ok, false);
    assert.equal(result.failure.kind, "invalid-response");
    assert.equal(result.failure.acceptance, "accepted");
    assert.equal(result.failure.retainForRetry, true);
  }
});

test("notice and every reminder page carry a client timeout AbortSignal", async () => {
  const module = await loadRequestState();
  const queueTeacherNoticeRequest = requireFunction(module, "queueTeacherNoticeRequest");
  const createTeacherReminderRequestState = requireFunction(module, "createTeacherReminderRequestState");
  const runTeacherReminderPages = requireFunction(module, "runTeacherReminderPages");
  const noticeSignal = new AbortController().signal;
  const reminderSignal = new AbortController().signal;
  let observedNoticeSignal: AbortSignal | null | undefined;
  let observedReminderSignal: AbortSignal | null | undefined;

  await queueTeacherNoticeRequest({
    intent: teacherNoticeQueueIntent(),
    idempotencyKey: "teacher-operation/key-0000000000000001",
    timeoutSignal: () => noticeSignal,
    request: async (_input: string, init?: RequestInit) => {
      observedNoticeSignal = init?.signal;
      return new Response(JSON.stringify({
        notice: teacherNotice(),
        attempt: teacherAttempt(),
        email: { status: "queued", queued: 1, reused: 0, recovered: 0, skipped: 0 }
      }), { status: 202 });
    }
  });

  await runTeacherReminderPages({
    intent: { teacherId: "teacher-1", classId: "class-1", assignmentId: null, manual: false },
    state: createTeacherReminderRequestState("teacher-operation/key-0000000000000001"),
    timeoutSignal: () => reminderSignal,
    request: async (_input: string, init?: RequestInit) => {
      observedReminderSignal = init?.signal;
      return new Response(JSON.stringify({ runs: [], nextCursor: null }), { status: 200 });
    }
  });

  assert.equal(observedNoticeSignal, noticeSignal);
  assert.equal(observedReminderSignal, reminderSignal);
});
