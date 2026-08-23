import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { defaultCurriculumProfile } from "@/lib/curriculumProfile";
import {
  createParentMessagePersistenceStore,
  type ParentMessageMutationScope,
  type ParentMessagePersistenceDatabase
} from "@/lib/server/userStore/parentMessagePersistence";
import {
  createParentNoticePersistenceStore,
  type ParentNoticeMutationScope,
  type ParentNoticePersistenceDatabase
} from "@/lib/server/userStore/parentNoticePersistence";
import {
  createParentPostgresScopedMutationAdapter,
  type ParentPostgresClient,
  type ParentPostgresSql
} from "@/lib/server/userStore/parentPostgresScopedMutations";
import type { ParentChildSummary } from "@/types";

const firstTimestamp = "2026-08-23T10:00:00.000Z";
const laterTimestamp = "2026-08-23T11:00:00.000Z";

function childSummary(studentId: string, name: string): ParentChildSummary {
  return {
    student: {
      id: studentId,
      name,
      username: `${studentId}@example.test`,
      avatarId: "delta",
      grade: "S3",
      curriculumTrack: "HK",
      curriculumProfile: defaultCurriculumProfile,
      role: "student"
    },
    classes: [],
    generatedAt: firstTimestamp,
    averageMastery: 0,
    learningMinutes7d: 0,
    latestActivityAt: null,
    weeklyActivity: [],
    strengths: [],
    supportTopics: [],
    assignments: [],
    pendingAssignmentCount: 0,
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
  };
}

function messageDatabase(): ParentMessagePersistenceDatabase {
  return {
    users: [
      { id: "parent-1", role: "parent" },
      { id: "teacher-1", role: "teacher", disabled_at: null }
    ],
    student_profiles: [
      { user_id: "student-1", name: "Ada Student", grade: "S3" },
      { user_id: "teacher-1", name: "Teacher Chan" },
      { user_id: "parent-1", name: "Pat Parent" }
    ],
    guardian_links: [
      { parent_id: "parent-1", student_id: "student-1", status: "active" }
    ],
    class_enrollments: [
      { class_id: "class-1", student_id: "student-1" }
    ],
    teacher_classes: [
      { id: "class-1", teacher_id: "teacher-1", name: "S3 Algebra", grade: "S3" }
    ],
    school_memberships: [],
    teacher_reports: [],
    teacher_messages: [],
    teacher_message_entries: []
  };
}

function noticeDatabase(): ParentNoticePersistenceDatabase {
  return {
    users: [{ id: "parent-1", role: "parent" }],
    student_profiles: [],
    guardian_links: [
      { parent_id: "parent-1", student_id: "student-1", status: "active" }
    ],
    teacher_classes: [],
    teacher_notice_delivery_attempts: [],
    teacher_notice_recipients: [{
      id: "recipient-1",
      notice_id: "notice-1",
      student_id: "student-1",
      guardian_id: "parent-1",
      status: "pending",
      acknowledged_at: null,
      created_at: firstTimestamp
    }],
    teacher_notices: [{
      id: "notice-1",
      teacher_id: "teacher-1",
      class_id: "class-1",
      audience: "parents",
      channel_id: "email",
      channel_name: "Email",
      subject_en: "Reminder",
      subject_zh: "提醒",
      body_en: "Please review.",
      body_zh: "請查看。",
      status: "sent",
      due_at: null,
      created_at: firstTimestamp,
      updated_at: firstTimestamp,
      sent_at: firstTimestamp
    }],
    teacher_review_lessons: []
  };
}

function serializedScopedMutation<Database>() {
  let lane = Promise.resolve();
  return async <T>(_scope: unknown, database: Database, mutate: (database: Database) => T) => {
    const run = lane.then(() => mutate(database));
    lane = run.then(() => undefined, () => undefined);
    return run;
  };
}

test("parent stores prefer scoped dependencies and recheck idempotency inside the serialized mutation", async () => {
  const database = messageDatabase();
  let nextThreadId = 0;
  let nextEntryId = 0;
  const mutateSerially = serializedScopedMutation<ParentMessagePersistenceDatabase>();
  const scopes: ParentMessageMutationScope[] = [];
  const store = createParentMessagePersistenceStore({
    createThreadId: () => `thread-${++nextThreadId}`,
    createEntryId: () => `entry-${++nextEntryId}`,
    now: () => new Date(firstTimestamp),
    getParentChildSummaries: () => [childSummary("student-1", "Ada Student")],
    getParentReportsForStudent: () => [],
    readDatabase: async () => {
      throw new Error("generic read must not run for a Postgres write replay check");
    },
    mutateDatabase: async () => {
      throw new Error("generic mutation must not run for a Postgres parent write");
    },
    readMutationDatabase: async (scope) => {
      scopes.push(scope);
      return database;
    },
    mutateMutationDatabase: async (scope, mutate) => {
      scopes.push(scope);
      return mutateSerially(scope, database, mutate);
    }
  });
  const request = {
    parentId: "parent-1",
    studentId: "student-1",
    classId: "class-1",
    idempotencyKey: "stable-create-key-000001",
    subject: "Question",
    body: "Could you explain this?"
  };

  assert.equal((await store.findParentMessageCreateReplay(request)).status, "missing");
  const [first, replay] = await Promise.all([
    store.createParentMessageThread(request),
    store.createParentMessageThread(request)
  ]);

  assert.equal(first.status, "created");
  assert.equal(replay.status, "replayed");
  assert.equal(first.thread?.id, replay.thread?.id);
  assert.equal(database.teacher_messages.length, 1);
  assert.equal(database.teacher_message_entries.length, 1);
  assert.equal(nextThreadId, 1, "the second locked mutation must replay before allocating another id");
  assert.equal(nextEntryId, 1);
  assert.ok(scopes.every((scope) => scope.kind === "create"));
  assert.ok(scopes.every((scope) => scope.idempotencyKeyHash.length === 64));
  assert.doesNotMatch(JSON.stringify(scopes), /stable-create-key-000001/);
});

test("replay prechecks reconfirm current authorization under the locked mutation", async () => {
  const createDatabase = messageDatabase();
  let createEntryId = 0;
  const createRequest = {
    parentId: "parent-1",
    studentId: "student-1",
    classId: "class-1",
    idempotencyKey: "authorization-race-create-0001",
    subject: "Question",
    body: "Could you explain this?"
  };
  const createSeedStore = createParentMessagePersistenceStore({
    createThreadId: () => "thread-create-replay",
    createEntryId: () => `entry-create-${++createEntryId}`,
    now: () => new Date(firstTimestamp),
    getParentChildSummaries: () => [childSummary("student-1", "Ada Student")],
    getParentReportsForStudent: () => [],
    readDatabase: async () => createDatabase,
    mutateDatabase: async (mutate) => mutate(createDatabase)
  });
  assert.equal((await createSeedStore.createParentMessageThread(createRequest)).status, "created");
  const staleCreateSnapshot = structuredClone(createDatabase);
  createDatabase.guardian_links[0].status = "revoked";
  let createLockedConfirmations = 0;
  const createReplayStore = createParentMessagePersistenceStore({
    now: () => new Date(laterTimestamp),
    getParentChildSummaries: () => [childSummary("student-1", "Ada Student")],
    getParentReportsForStudent: () => [],
    readDatabase: async () => {
      throw new Error("generic read must not replace the scoped replay precheck");
    },
    mutateDatabase: async () => {
      throw new Error("generic mutation must not confirm a Postgres replay");
    },
    readMutationDatabase: async () => staleCreateSnapshot,
    mutateMutationDatabase: async (_scope, mutate) => {
      createLockedConfirmations += 1;
      return mutate(createDatabase);
    }
  });

  assert.deepEqual(await createReplayStore.findParentMessageCreateReplay(createRequest), {
    status: "forbidden"
  });
  assert.equal(createLockedConfirmations, 1);

  const replyDatabase = messageDatabase();
  let replyEntryId = 0;
  const replySeedStore = createParentMessagePersistenceStore({
    createThreadId: () => "thread-reply-replay",
    createEntryId: () => `entry-reply-${++replyEntryId}`,
    now: () => new Date(firstTimestamp),
    getParentChildSummaries: () => [childSummary("student-1", "Ada Student")],
    getParentReportsForStudent: () => [],
    readDatabase: async () => replyDatabase,
    mutateDatabase: async (mutate) => mutate(replyDatabase)
  });
  const replyThread = await replySeedStore.createParentMessageThread({
    ...createRequest,
    idempotencyKey: "authorization-race-thread-0001"
  });
  assert.equal(replyThread.status, "created");
  const replyRequest = {
    parentId: "parent-1",
    threadId: "thread-reply-replay",
    idempotencyKey: "authorization-race-reply-0001",
    body: "Durable reply"
  };
  assert.equal((await replySeedStore.replyToParentMessageThread(replyRequest)).status, "sent");
  const staleReplySnapshot = structuredClone(replyDatabase);
  replyDatabase.guardian_links[0].status = "revoked";
  let replyLockedConfirmations = 0;
  const replyReplayStore = createParentMessagePersistenceStore({
    now: () => new Date(laterTimestamp),
    getParentChildSummaries: () => [childSummary("student-1", "Ada Student")],
    getParentReportsForStudent: () => [],
    readDatabase: async () => {
      throw new Error("generic read must not replace the scoped reply precheck");
    },
    mutateDatabase: async () => {
      throw new Error("generic mutation must not confirm a Postgres reply replay");
    },
    readMutationDatabase: async () => staleReplySnapshot,
    mutateMutationDatabase: async (_scope, mutate) => {
      replyLockedConfirmations += 1;
      return mutate(replyDatabase);
    }
  });

  assert.deepEqual(await replyReplayStore.findParentMessageReplyReplay(replyRequest), {
    status: "not-found"
  });
  assert.equal(replyLockedConfirmations, 1);
});

test("notice acknowledgement uses its scoped mutation and preserves the first receipt timestamp", async () => {
  const database = noticeDatabase();
  let clock = firstTimestamp;
  const mutateSerially = serializedScopedMutation<ParentNoticePersistenceDatabase>();
  const scopes: ParentNoticeMutationScope[] = [];
  const store = createParentNoticePersistenceStore({
    now: () => new Date(clock),
    getParentChildSummaries: () => [childSummary("student-1", "Ada Student")],
    readDatabase: async () => database,
    mutateDatabase: async () => {
      throw new Error("generic mutation must not run for a Postgres notice acknowledgement");
    },
    mutateMutationDatabase: async (scope, mutate) => {
      scopes.push(scope);
      return mutateSerially(scope, database, mutate);
    }
  });

  const first = await store.acknowledgeParentNotice({ parentId: "parent-1", recipientId: "recipient-1" });
  clock = laterTimestamp;
  const replay = await store.acknowledgeParentNotice({ parentId: "parent-1", recipientId: "recipient-1" });

  assert.equal(first.status, "acknowledged");
  assert.deepEqual(replay, first);
  assert.equal(database.teacher_notice_recipients[0].acknowledged_at, firstTimestamp);
  assert.equal(database.teacher_notices[0].updated_at, firstTimestamp);
  assert.deepEqual(scopes, [{ kind: "ack", parentId: "parent-1", recipientId: "recipient-1" }, {
    kind: "ack",
    parentId: "parent-1",
    recipientId: "recipient-1"
  }]);
});

test("scoped reply retries return the same entry and never invoke the generic full-snapshot mutation", async () => {
  const database = messageDatabase();
  database.teacher_messages.push({
    id: "thread-1",
    class_id: "class-1",
    student_id: "student-1",
    teacher_id: "teacher-1",
    guardian_id: "parent-1",
    subject_en: "Question",
    subject_zh: "Question",
    latest_message: "Initial",
    status: "open",
    priority: "normal",
    starred: false,
    last_message_at: firstTimestamp,
    created_at: firstTimestamp
  });
  database.teacher_message_entries.push({
    id: "entry-initial",
    thread_id: "thread-1",
    sender_id: "teacher-1",
    sender_role: "teacher",
    recipient_id: "parent-1",
    body: "Initial",
    attachments: [],
    created_at: firstTimestamp
  });
  let nextEntryId = 0;
  let genericMutationCalls = 0;
  const mutateSerially = serializedScopedMutation<ParentMessagePersistenceDatabase>();
  const store = createParentMessagePersistenceStore({
    createEntryId: () => `entry-reply-${++nextEntryId}`,
    now: () => new Date(laterTimestamp),
    getParentChildSummaries: () => [childSummary("student-1", "Ada Student")],
    getParentReportsForStudent: () => [],
    readDatabase: async () => database,
    mutateDatabase: async (mutate) => {
      genericMutationCalls += 1;
      return mutate(database);
    },
    readMutationDatabase: async () => database,
    mutateMutationDatabase: (scope, mutate) => mutateSerially(scope, database, mutate)
  });
  const request = {
    parentId: "parent-1",
    threadId: "thread-1",
    idempotencyKey: "stable-reply-key-000001",
    body: "Durable reply"
  };

  const [first, replay] = await Promise.all([
    store.replyToParentMessageThread(request),
    store.replyToParentMessageThread(request)
  ]);

  assert.equal(first.status, "sent");
  assert.equal(replay.status, "replayed");
  assert.equal(first.entryId, replay.entryId);
  assert.equal(nextEntryId, 1);
  assert.equal(database.teacher_message_entries.filter((entry) => entry.id.startsWith("entry-reply-")).length, 1);
  assert.equal(genericMutationCalls, 0);
});

type CapturedStatement = {
  activeTransaction: boolean;
  text: string;
  values: unknown[];
};

type FakeSqlOptions = {
  createRow?: Record<string, unknown>;
  replyRow?: Record<string, unknown>;
  ackRow?: Record<string, unknown>;
  failProjection?: boolean;
};

function fakePostgres(options: FakeSqlOptions) {
  const statements: CapturedStatement[] = [];
  let activeTransaction = false;
  let beginCount = 0;
  const sql = (async (strings: TemplateStringsArray, ...values: unknown[]) => {
    const text = strings.join("$value");
    statements.push({ activeTransaction, text, values });
    if (text.includes("parent_message_create_scope")) return options.createRow ? [options.createRow] : [];
    if (text.includes("parent_message_reply_scope")) return options.replyRow ? [options.replyRow] : [];
    if (text.includes("parent_notice_ack_scope")) return options.ackRow ? [options.ackRow] : [];
    if (text.includes("parent_state_scope_lock")) return [{ id: "primary" }];
    if (text.includes("parent_message_projection_upsert") && options.failProjection) {
      throw new Error("projection unavailable");
    }
    if (text.includes("parent_message_state_patch") || text.includes("parent_notice_state_patch")) {
      return [{ id: "primary" }];
    }
    return [];
  }) as ParentPostgresSql;
  sql.json = (value: unknown) => ({ json: value });
  const client = Object.assign(sql, {
    begin: async <T>(operation: (transaction: ParentPostgresSql) => Promise<T>) => {
      beginCount += 1;
      assert.equal(activeTransaction, false);
      activeTransaction = true;
      try {
        return await operation(sql);
      } finally {
        activeTransaction = false;
      }
    }
  }) as ParentPostgresClient;
  return { client, statements, beginCount: () => beginCount };
}

function messageRow(database: ParentMessagePersistenceDatabase) {
  return {
    schema_valid: true,
    users: database.users,
    student_profiles: database.student_profiles,
    guardian_links: database.guardian_links,
    class_enrollments: database.class_enrollments,
    teacher_classes: database.teacher_classes,
    school_memberships: database.school_memberships,
    teacher_reports: database.teacher_reports,
    teacher_messages: database.teacher_messages,
    teacher_message_entries: database.teacher_message_entries
  };
}

function noticeRow(database: ParentNoticePersistenceDatabase) {
  return {
    schema_valid: true,
    users: database.users,
    student_profiles: database.student_profiles,
    guardian_links: database.guardian_links,
    teacher_classes: database.teacher_classes,
    teacher_notice_delivery_attempts: database.teacher_notice_delivery_attempts,
    teacher_notice_recipients: database.teacher_notice_recipients,
    teacher_notices: database.teacher_notices,
    teacher_review_lessons: database.teacher_review_lessons
  };
}

const stateIdentity = {
  id: "primary",
  tenantId: "platform",
  stateKind: "app-snapshot",
  schemaVersion: 1
};

test("Postgres message create locks an exact state row, patches only message arrays, and upserts one projection", async () => {
  const database = messageDatabase();
  const fake = fakePostgres({ createRow: messageRow(database) });
  const adapter = createParentPostgresScopedMutationAdapter({
    ensureSchema: async () => undefined,
    getClient: () => fake.client,
    state: stateIdentity
  });
  const scope: ParentMessageMutationScope = {
    kind: "create",
    parentId: "parent-1",
    studentId: "student-1",
    classId: "class-1",
    reportId: null,
    idempotencyKeyHash: "a".repeat(64)
  };

  const result = await adapter.mutateMessageDatabase(scope, (scoped) => {
    scoped.teacher_messages.unshift({
      id: "thread-1",
      class_id: "class-1",
      student_id: "student-1",
      teacher_id: "teacher-1",
      guardian_id: "parent-1",
      subject_en: "Question",
      subject_zh: "Question",
      latest_message: "Body",
      status: "unread",
      priority: "normal",
      starred: false,
      last_message_at: firstTimestamp,
      created_at: firstTimestamp,
      parent_idempotency_key_hash: scope.idempotencyKeyHash,
      parent_idempotency_request_hash: "b".repeat(64)
    });
    scoped.teacher_message_entries.push({
      id: "entry-1",
      thread_id: "thread-1",
      sender_id: "parent-1",
      sender_role: "parent",
      recipient_id: "teacher-1",
      body: "Body",
      attachments: [],
      created_at: firstTimestamp
    });
    return { status: "created" as const };
  });

  assert.deepEqual(result, { status: "created" });
  assert.equal(fake.beginCount(), 1);
  assert.ok(fake.statements.every((statement) => statement.activeTransaction));
  const lockQuery = fake.statements.find((statement) => statement.text.includes("parent_state_scope_lock"));
  assert.ok(lockQuery?.text.includes("FOR UPDATE"));
  const scopeQuery = fake.statements.find((statement) => statement.text.includes("parent_message_create_scope"));
  assert.doesNotMatch(scopeQuery?.text ?? "", /FOR UPDATE/iu);
  assert.ok(scopeQuery?.text.includes("jsonb_array_elements"));
  assert.match(scopeQuery?.text ?? "", /AS schema_valid/u);
  assert.match(scopeQuery?.text ?? "", /jsonb_typeof\(scoped_state\.scoped_payload->'teacher_message_entries'\) = 'array'/u);
  assert.match(scopeQuery?.text ?? "", /disabled_at/u);
  assert.ok(scopeQuery?.values.includes(stateIdentity.id));
  assert.ok(scopeQuery?.values.includes(stateIdentity.tenantId));
  assert.ok(scopeQuery?.values.includes(stateIdentity.stateKind));
  assert.ok(scopeQuery?.values.includes(stateIdentity.schemaVersion));
  assert.doesNotMatch(scopeQuery?.text ?? "", /SELECT\s+payload\s+FROM/iu);
  const patch = fake.statements.find((statement) => statement.text.includes("parent_message_state_patch"));
  assert.match(patch?.text ?? "", /\{teacher_messages\}/u);
  assert.match(patch?.text ?? "", /\{teacher_message_entries\}/u);
  assert.match(patch?.text ?? "", /revision\s*=\s*revision\s*\+\s*1/iu);
  assert.match(patch?.text ?? "", /disabled_at/u);
  assert.doesNotMatch(patch?.text ?? "", /password_reset_tokens|auth_users|DELETE FROM|payload\s*=\s*excluded\.payload/iu);
  assert.equal(fake.statements.filter((statement) => statement.text.includes("parent_message_projection_upsert")).length, 1);
});

test("the scoped write hot path never invokes the full-snapshot initializer", async () => {
  const source = await readFile(
    path.join(process.cwd(), "lib/server/userStore/parentPostgresScopedMutations.ts"),
    "utf8"
  );
  const userStoreSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");

  assert.doesNotMatch(
    source,
    /ensureInitialState|ensureInitialPostgresState|postgresDatabasePayload|createInitialDatabase|writePostgresDatabaseWith|syncPostgresProjectionTablesWith/u
  );
  assert.doesNotMatch(source, /\bfetch\s*\(|\bconsole\s*\./u);
  assert.match(source, /const result = mutate\(database\);\s*assertSynchronousMutation\(result\);/u);
  assert.match(userStoreSource, /createParentPostgresScopedMutationAdapter\(\{\s*ensureSchema:/u);
  assert.doesNotMatch(
    userStoreSource,
    /createParentPostgresScopedMutationAdapter\(\{[\s\S]{0,300}ensureInitialState/u
  );
});

test("scoped reads defensively discard another family's sentinel records", async () => {
  const database = messageDatabase();
  database.users.push({ id: "parent-other-family-secret", role: "parent" });
  database.student_profiles?.push({
    user_id: "student-other-family-secret",
    name: "other-family-secret"
  });
  database.guardian_links.push({
    parent_id: "parent-other-family-secret",
    student_id: "student-other-family-secret",
    status: "active"
  });
  database.teacher_messages.push({
    id: "thread-other-family-secret",
    class_id: "class-1",
    student_id: "student-other-family-secret",
    teacher_id: "teacher-1",
    guardian_id: "parent-other-family-secret",
    subject_en: "other-family-secret",
    subject_zh: "other-family-secret",
    latest_message: "other-family-secret",
    status: "unread",
    priority: "normal",
    starred: false,
    last_message_at: firstTimestamp,
    created_at: firstTimestamp,
    parent_idempotency_key_hash: "a".repeat(64),
    parent_idempotency_request_hash: "b".repeat(64)
  });
  database.teacher_message_entries.push({
    id: "entry-other-family-secret",
    thread_id: "thread-other-family-secret",
    sender_id: "parent-other-family-secret",
    sender_role: "parent",
    recipient_id: "teacher-1",
    body: "other-family-secret",
    attachments: [],
    created_at: firstTimestamp
  });
  const fake = fakePostgres({ createRow: messageRow(database) });
  const adapter = createParentPostgresScopedMutationAdapter({
    ensureSchema: async () => undefined,
    getClient: () => fake.client,
    state: stateIdentity
  });

  const scoped = await adapter.readMessageDatabase({
    kind: "create",
    parentId: "parent-1",
    studentId: "student-1",
    classId: "class-1",
    reportId: null,
    idempotencyKeyHash: "a".repeat(64)
  });

  assert.doesNotMatch(JSON.stringify(scoped), /other-family-secret/u);

  const notices = noticeDatabase();
  notices.users.push({ id: "parent-other-family-secret", role: "parent" });
  notices.guardian_links.push({
    parent_id: "parent-other-family-secret",
    student_id: "student-other-family-secret",
    status: "active"
  });
  notices.teacher_notice_recipients.push({
    id: "recipient-other-family-secret",
    notice_id: "notice-other-family-secret",
    student_id: "student-other-family-secret",
    guardian_id: "parent-other-family-secret",
    status: "pending",
    acknowledged_at: null,
    created_at: firstTimestamp
  });
  notices.teacher_notices.push({
    ...notices.teacher_notices[0],
    id: "notice-other-family-secret",
    subject_en: "other-family-secret",
    subject_zh: "other-family-secret"
  });
  const noticeFake = fakePostgres({ ackRow: noticeRow(notices) });
  const noticeAdapter = createParentPostgresScopedMutationAdapter({
    ensureSchema: async () => undefined,
    getClient: () => noticeFake.client,
    state: stateIdentity
  });
  let seenNoticeScope = "";
  await noticeAdapter.mutateNoticeDatabase({
    kind: "ack",
    parentId: "parent-1",
    recipientId: "recipient-1"
  }, (noticeScope) => {
    seenNoticeScope = JSON.stringify(noticeScope);
    return { status: "not-found" as const };
  });
  assert.doesNotMatch(seenNoticeScope, /other-family-secret/u);
});

test("reply and acknowledgement patch only their scoped records; projection failure rejects without fallback", async () => {
  const message = messageDatabase();
  message.teacher_messages.push({
    id: "thread-1",
    class_id: "class-1",
    student_id: "student-1",
    teacher_id: "teacher-1",
    guardian_id: "parent-1",
    subject_en: "Question",
    subject_zh: "Question",
    latest_message: "Initial",
    status: "open",
    priority: "normal",
    starred: false,
    last_message_at: firstTimestamp,
    created_at: firstTimestamp
  });
  message.teacher_message_entries.push({
    id: "entry-1",
    thread_id: "thread-1",
    sender_id: "teacher-1",
    sender_role: "teacher",
    recipient_id: "parent-1",
    body: "Initial",
    attachments: [],
    created_at: firstTimestamp
  });
  const notice = noticeDatabase();
  const fake = fakePostgres({
    replyRow: messageRow(message),
    ackRow: noticeRow(notice)
  });
  const adapter = createParentPostgresScopedMutationAdapter({
    ensureSchema: async () => undefined,
    getClient: () => fake.client,
    state: stateIdentity
  });

  await adapter.mutateMessageDatabase({
    kind: "reply",
    parentId: "parent-1",
    threadId: "thread-1",
    idempotencyKeyHash: "c".repeat(64)
  }, (scoped) => {
    scoped.teacher_messages[0].latest_message = "Reply";
    scoped.teacher_messages[0].status = "unread";
    scoped.teacher_messages[0].last_message_at = laterTimestamp;
    scoped.teacher_message_entries.push({
      id: "entry-2",
      thread_id: "thread-1",
      sender_id: "parent-1",
      sender_role: "parent",
      recipient_id: "teacher-1",
      body: "Reply",
      attachments: [],
      created_at: laterTimestamp,
      parent_idempotency_key_hash: "c".repeat(64),
      parent_idempotency_request_hash: "d".repeat(64)
    });
    return { status: "sent" as const };
  });
  const replyPatch = fake.statements.find((statement) => statement.text.includes("parent_message_state_patch"));
  assert.match(replyPatch?.text ?? "", /record->>'id'/u);
  assert.match(replyPatch?.text ?? "", /latest_message/u);
  assert.match(replyPatch?.text ?? "", /last_message_at/u);
  assert.doesNotMatch(replyPatch?.text ?? "", /guardian_links|teacher_reports/u);
  const replyProjection = fake.statements.find((statement) => statement.text.includes("parent_message_projection_upsert"));
  const replyProjectionRecord = replyProjection?.values
    .map((value) => (value as { json?: unknown } | null)?.json)
    .find((value) => (value as { id?: unknown } | null)?.id === "thread-1") as {
      latest_message?: unknown;
      last_message_at?: unknown;
      status?: unknown;
    } | undefined;
  assert.deepEqual(replyProjectionRecord && {
    latestMessage: replyProjectionRecord.latest_message,
    lastMessageAt: replyProjectionRecord.last_message_at,
    status: replyProjectionRecord.status
  }, {
    latestMessage: "Reply",
    lastMessageAt: laterTimestamp,
    status: "unread"
  });

  await adapter.mutateNoticeDatabase({
    kind: "ack",
    parentId: "parent-1",
    recipientId: "recipient-1"
  }, (scoped) => {
    scoped.teacher_notice_recipients[0].status = "acknowledged";
    scoped.teacher_notice_recipients[0].acknowledged_by = "parent-1";
    scoped.teacher_notice_recipients[0].acknowledged_at = laterTimestamp;
    scoped.teacher_notices[0].updated_at = laterTimestamp;
    return { status: "acknowledged" as const };
  });
  const ackPatch = fake.statements.find((statement) => statement.text.includes("parent_notice_state_patch"));
  assert.match(ackPatch?.text ?? "", /\{teacher_notice_recipients\}/u);
  assert.match(ackPatch?.text ?? "", /\{teacher_notices\}/u);
  assert.match(ackPatch?.text ?? "", /disabled_at/u);
  assert.doesNotMatch(ackPatch?.text ?? "", /teacher_messages|projection_teacher_messages|auth_users/u);

  const failing = fakePostgres({ replyRow: messageRow(message), failProjection: true });
  const failingAdapter = createParentPostgresScopedMutationAdapter({
    ensureSchema: async () => undefined,
    getClient: () => failing.client,
    state: stateIdentity
  });
  await assert.rejects(
    failingAdapter.mutateMessageDatabase({
      kind: "reply",
      parentId: "parent-1",
      threadId: "thread-1",
      idempotencyKeyHash: "e".repeat(64)
    }, (scoped) => {
      scoped.teacher_messages[0].latest_message = "Will roll back";
      scoped.teacher_messages[0].last_message_at = laterTimestamp;
      scoped.teacher_message_entries.push({
        id: "entry-failure",
        thread_id: "thread-1",
        sender_id: "parent-1",
        sender_role: "parent",
        recipient_id: "teacher-1",
        body: "Will roll back",
        attachments: [],
        created_at: laterTimestamp,
        parent_idempotency_key_hash: "e".repeat(64),
        parent_idempotency_request_hash: "f".repeat(64)
      });
      return { status: "sent" as const };
    }),
    /projection unavailable/u
  );
});

test("replays do not write and missing scoped state fails closed", async () => {
  const database = messageDatabase();
  const replayFake = fakePostgres({ createRow: messageRow(database) });
  const replayAdapter = createParentPostgresScopedMutationAdapter({
    ensureSchema: async () => undefined,
    getClient: () => replayFake.client,
    state: stateIdentity
  });
  const scope = {
    kind: "create",
    parentId: "parent-1",
    studentId: "student-1",
    classId: "class-1",
    reportId: null,
    idempotencyKeyHash: "a".repeat(64)
  } as const;
  await replayAdapter.readMessageDatabase(scope);
  assert.equal(replayFake.beginCount(), 0, "the rate-limit replay precheck must not open a transaction");
  assert.equal(
    replayFake.statements.some((statement) => statement.text.includes("parent_state_scope_lock")),
    false,
    "the replay precheck must not acquire the global app_state row lock"
  );
  const replayResult = await replayAdapter.mutateMessageDatabase(scope, () => ({ status: "replayed" as const }));

  assert.deepEqual(replayResult, { status: "replayed" });
  assert.equal(replayFake.beginCount(), 1, "the actual mutation must recheck under a transaction");
  assert.equal(
    replayFake.statements.filter((statement) => statement.text.includes("parent_state_scope_lock")).length,
    1
  );
  assert.equal(replayFake.statements.some((statement) => statement.text.includes("state_patch")), false);
  assert.equal(replayFake.statements.some((statement) => statement.text.includes("projection_upsert")), false);

  const missingFake = fakePostgres({});
  const missingAdapter = createParentPostgresScopedMutationAdapter({
    ensureSchema: async () => undefined,
    getClient: () => missingFake.client,
    state: stateIdentity
  });
  await assert.rejects(
    missingAdapter.mutateNoticeDatabase({
      kind: "ack",
      parentId: "parent-1",
      recipientId: "recipient-1"
    }, () => ({ status: "not-found" as const })),
    /state marker is unavailable/u
  );
  assert.equal(missingFake.statements.some((statement) => statement.text.includes("state_patch")), false);
});

test("malformed scoped arrays and asynchronous mutators fail closed before any state patch", async () => {
  const database = messageDatabase();
  const malformedFake = fakePostgres({
    createRow: {
      ...messageRow(database),
      teacher_message_entries: { not: "an-array" }
    }
  });
  const malformedAdapter = createParentPostgresScopedMutationAdapter({
    ensureSchema: async () => undefined,
    getClient: () => malformedFake.client,
    state: stateIdentity
  });
  const scope = {
    kind: "create",
    parentId: "parent-1",
    studentId: "student-1",
    classId: "class-1",
    reportId: null,
    idempotencyKeyHash: "a".repeat(64)
  } as const;

  await assert.rejects(
    malformedAdapter.mutateMessageDatabase(scope, () => ({ status: "created" as const })),
    /field teacher_message_entries is unavailable/u
  );
  assert.equal(malformedFake.statements.some((statement) => statement.text.includes("state_patch")), false);

  const missingFake = fakePostgres({
    createRow: {
      ...messageRow(database),
      teacher_message_entries: undefined,
      schema_valid: false
    }
  });
  const missingAdapter = createParentPostgresScopedMutationAdapter({
    ensureSchema: async () => undefined,
    getClient: () => missingFake.client,
    state: stateIdentity
  });
  await assert.rejects(
    missingAdapter.mutateMessageDatabase(scope, () => ({ status: "created" as const })),
    /schema is unavailable/u
  );
  assert.equal(missingFake.statements.some((statement) => statement.text.includes("state_patch")), false);

  const asyncFake = fakePostgres({ createRow: messageRow(database) });
  const asyncAdapter = createParentPostgresScopedMutationAdapter({
    ensureSchema: async () => undefined,
    getClient: () => asyncFake.client,
    state: stateIdentity
  });
  const asynchronousMutation = (async () => ({ status: "created" as const })) as unknown as (
    scoped: ParentMessagePersistenceDatabase
  ) => { status: "created" };
  await assert.rejects(
    asyncAdapter.mutateMessageDatabase(scope, asynchronousMutation),
    /must not await provider or transport I\/O/u
  );
  assert.equal(asyncFake.statements.some((statement) => statement.text.includes("state_patch")), false);
  assert.equal(asyncFake.statements.some((statement) => statement.text.includes("projection_upsert")), false);
});

test("disabled parents are removed from every scoped authorization snapshot and cannot write", async () => {
  const message = messageDatabase();
  message.users[0].disabled_at = firstTimestamp;
  const messageFake = fakePostgres({ createRow: messageRow(message) });
  const messageAdapter = createParentPostgresScopedMutationAdapter({
    ensureSchema: async () => undefined,
    getClient: () => messageFake.client,
    state: stateIdentity
  });
  const messageStore = createParentMessagePersistenceStore({
    createThreadId: () => "disabled-parent-thread",
    createEntryId: () => "disabled-parent-entry",
    now: () => new Date(firstTimestamp),
    getParentChildSummaries: () => [childSummary("student-1", "Ada Student")],
    getParentReportsForStudent: () => [],
    readDatabase: async () => message,
    mutateDatabase: async () => {
      throw new Error("disabled Postgres parent must not fall back to the generic mutation");
    },
    readMutationDatabase: messageAdapter.readMessageDatabase,
    mutateMutationDatabase: messageAdapter.mutateMessageDatabase
  });
  const messageResult = await messageStore.createParentMessageThread({
    parentId: "parent-1",
    studentId: "student-1",
    classId: "class-1",
    idempotencyKey: "disabled-parent-key-0001",
    subject: "Blocked",
    body: "This must not be written."
  });
  assert.deepEqual(messageResult, { status: "forbidden" });
  assert.equal(messageFake.statements.some((statement) => statement.text.includes("state_patch")), false);

  const replyMessage = messageDatabase();
  replyMessage.users[0].disabled_at = firstTimestamp;
  replyMessage.teacher_messages.push({
    id: "thread-disabled-parent",
    class_id: "class-1",
    student_id: "student-1",
    teacher_id: "teacher-1",
    guardian_id: "parent-1",
    subject_en: "Question",
    subject_zh: "Question",
    latest_message: "Initial",
    status: "open",
    priority: "normal",
    starred: false,
    last_message_at: firstTimestamp,
    created_at: firstTimestamp
  });
  const replyFake = fakePostgres({ replyRow: messageRow(replyMessage) });
  const replyAdapter = createParentPostgresScopedMutationAdapter({
    ensureSchema: async () => undefined,
    getClient: () => replyFake.client,
    state: stateIdentity
  });
  const replyStore = createParentMessagePersistenceStore({
    createEntryId: () => "disabled-parent-reply-entry",
    now: () => new Date(laterTimestamp),
    getParentChildSummaries: () => [childSummary("student-1", "Ada Student")],
    getParentReportsForStudent: () => [],
    readDatabase: async () => replyMessage,
    mutateDatabase: async () => {
      throw new Error("disabled Postgres parent reply must not use the generic mutation");
    },
    readMutationDatabase: replyAdapter.readMessageDatabase,
    mutateMutationDatabase: replyAdapter.mutateMessageDatabase
  });
  const replyResult = await replyStore.replyToParentMessageThread({
    parentId: "parent-1",
    threadId: "thread-disabled-parent",
    idempotencyKey: "disabled-parent-reply-0001",
    body: "This reply must not be written."
  });
  assert.deepEqual(replyResult, { status: "forbidden" });
  assert.equal(replyFake.statements.some((statement) => statement.text.includes("state_patch")), false);
  const replyScope = replyFake.statements.find((statement) => statement.text.includes("parent_message_reply_scope"));
  assert.match(replyScope?.text ?? "", /disabled_at/u);

  const notice = noticeDatabase();
  notice.users[0].disabled_at = firstTimestamp;
  const noticeFake = fakePostgres({ ackRow: noticeRow(notice) });
  const noticeAdapter = createParentPostgresScopedMutationAdapter({
    ensureSchema: async () => undefined,
    getClient: () => noticeFake.client,
    state: stateIdentity
  });
  const noticeStore = createParentNoticePersistenceStore({
    now: () => new Date(firstTimestamp),
    getParentChildSummaries: () => [childSummary("student-1", "Ada Student")],
    readDatabase: async () => notice,
    mutateDatabase: async () => {
      throw new Error("disabled Postgres parent must not fall back to the generic mutation");
    },
    mutateMutationDatabase: noticeAdapter.mutateNoticeDatabase
  });
  const noticeResult = await noticeStore.acknowledgeParentNotice({
    parentId: "parent-1",
    recipientId: "recipient-1"
  });
  assert.deepEqual(noticeResult, { status: "forbidden" });
  assert.equal(noticeFake.statements.some((statement) => statement.text.includes("state_patch")), false);
});
