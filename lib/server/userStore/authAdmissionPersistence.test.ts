import assert from "node:assert/strict";
import test from "node:test";

import {
  createAbortableAuthAdmissionSlot,
  mapAuthAdmissionJoinedRow,
  runCancellableAuthAdmissionQuery
} from "@/lib/server/userStore/authAdmissionPersistence";

type TestRow = { id: string };
type TestSession = { userId: string };

function cancellableDeferredQuery<Row>() {
  let resolve!: (rows: readonly Row[]) => void;
  let reject!: (error: unknown) => void;
  let cancelCalls = 0;
  const query = new Promise<readonly Row[]>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  }) as Promise<readonly Row[]> & { cancel(): void };
  query.cancel = () => {
    cancelCalls += 1;
    const error = new Error("canceling statement due to user request");
    Object.assign(error, { code: "57014" });
    reject(error);
  };
  return {
    query,
    resolve,
    reject,
    cancelCalls: () => cancelCalls
  };
}

function mappedSession(row: TestRow): TestSession | null {
  return row.id ? { userId: row.id } : null;
}

test("auth admission maps one authoritative joined row", async () => {
  const deferred = cancellableDeferredQuery<TestRow>();
  const controller = new AbortController();
  let queriedUserId = "";
  const resultPromise = runCancellableAuthAdmissionQuery({
    createQuery: (userId) => {
      queriedUserId = userId;
      return deferred.query;
    },
    mapRow: mappedSession,
    signal: controller.signal,
    userId: "student-1"
  });

  deferred.resolve([{ id: "student-1" }]);

  assert.deepEqual(await resultPromise, { userId: "student-1" });
  assert.equal(queriedUserId, "student-1");
  assert.equal(deferred.cancelCalls(), 0);
});

test("auth admission treats zero authoritative rows as an unauthenticated miss", async () => {
  const deferred = cancellableDeferredQuery<TestRow>();
  const resultPromise = runCancellableAuthAdmissionQuery({
    createQuery: () => deferred.query,
    mapRow: mappedSession,
    signal: new AbortController().signal,
    userId: "missing-user"
  });

  deferred.resolve([]);

  assert.equal(await resultPromise, null);
  assert.equal(deferred.cancelCalls(), 0);
});

test("only an authoritative zero-row result can use the exact seeded fallback", async () => {
  const deferred = cancellableDeferredQuery<TestRow>();
  let fallbackCalls = 0;
  const resultPromise = runCancellableAuthAdmissionQuery({
    createQuery: () => deferred.query,
    mapRow: mappedSession,
    onAuthoritativeMiss: (userId) => {
      fallbackCalls += 1;
      return userId === "seeded-demo-1" ? { userId } : null;
    },
    signal: new AbortController().signal,
    userId: "seeded-demo-1"
  });

  deferred.resolve([]);

  assert.deepEqual(await resultPromise, { userId: "seeded-demo-1" });
  assert.equal(fallbackCalls, 1);
});

test("auth admission rejects corrupt joined rows instead of treating them as a miss", async () => {
  const deferred = cancellableDeferredQuery<TestRow>();
  const resultPromise = runCancellableAuthAdmissionQuery({
    createQuery: () => deferred.query,
    mapRow: mappedSession,
    signal: new AbortController().signal,
    userId: "corrupt-user"
  });

  deferred.resolve([{ id: "" }]);

  await assert.rejects(resultPromise, /invalid/i);
});

test("auth admission propagates database failures without converting them to null", async () => {
  const deferred = cancellableDeferredQuery<TestRow>();
  const databaseError = new Error("synthetic database failure");
  let fallbackCalls = 0;
  const resultPromise = runCancellableAuthAdmissionQuery({
    createQuery: () => deferred.query,
    mapRow: mappedSession,
    onAuthoritativeMiss: () => {
      fallbackCalls += 1;
      return { userId: "must-not-run" };
    },
    signal: new AbortController().signal,
    userId: "student-1"
  });

  deferred.reject(databaseError);

  await assert.rejects(resultPromise, (error) => error === databaseError);
  assert.equal(fallbackCalls, 0);
});

test("a missing auth migration table remains an unavailable database error", async () => {
  const deferred = cancellableDeferredQuery<TestRow>();
  const missingTableError = Object.assign(new Error("synthetic missing relation"), {
    code: "42P01"
  });
  let fallbackCalls = 0;
  const resultPromise = runCancellableAuthAdmissionQuery({
    createQuery: () => deferred.query,
    mapRow: mappedSession,
    onAuthoritativeMiss: () => {
      fallbackCalls += 1;
      return null;
    },
    signal: new AbortController().signal,
    userId: "student-1"
  });

  deferred.reject(missingTableError);

  await assert.rejects(resultPromise, (error) => error === missingTableError);
  assert.equal(fallbackCalls, 0);
});

test("a pre-aborted auth admission never creates a database query", async () => {
  const controller = new AbortController();
  controller.abort(new DOMException("deadline", "TimeoutError"));
  let createCalls = 0;

  await assert.rejects(
    runCancellableAuthAdmissionQuery({
      createQuery: () => {
        createCalls += 1;
        return cancellableDeferredQuery<TestRow>().query;
      },
      mapRow: mappedSession,
      signal: controller.signal,
      userId: "student-1"
    }),
    (error) => error instanceof DOMException && error.name === "AbortError"
  );
  assert.equal(createCalls, 0);
});

test("aborting a pending auth admission cancels its query exactly once", async () => {
  const deferred = cancellableDeferredQuery<TestRow>();
  const controller = new AbortController();
  const resultPromise = runCancellableAuthAdmissionQuery({
    createQuery: () => deferred.query,
    mapRow: mappedSession,
    signal: controller.signal,
    userId: "student-1"
  });

  controller.abort(new DOMException("deadline", "TimeoutError"));

  await assert.rejects(
    resultPromise,
    (error) => error instanceof DOMException && error.name === "AbortError"
  );
  assert.equal(deferred.cancelCalls(), 1);
});

test("auth admission removes abort listeners after success and failure", async () => {
  const success = cancellableDeferredQuery<TestRow>();
  const successController = new AbortController();
  const successPromise = runCancellableAuthAdmissionQuery({
    createQuery: () => success.query,
    mapRow: mappedSession,
    signal: successController.signal,
    userId: "student-1"
  });
  success.resolve([{ id: "student-1" }]);
  await successPromise;
  successController.abort();
  assert.equal(success.cancelCalls(), 0);

  const failure = cancellableDeferredQuery<TestRow>();
  const failureController = new AbortController();
  const databaseError = new Error("synthetic database failure");
  const failurePromise = runCancellableAuthAdmissionQuery({
    createQuery: () => failure.query,
    mapRow: mappedSession,
    signal: failureController.signal,
    userId: "student-2"
  });
  failure.reject(databaseError);
  await assert.rejects(failurePromise, (error) => error === databaseError);
  failureController.abort();
  assert.equal(failure.cancelCalls(), 0);
});

test("cancel listeners stay isolated across independently scheduled auth lookups", async () => {
  const first = cancellableDeferredQuery<TestRow>();
  const second = cancellableDeferredQuery<TestRow>();
  const third = cancellableDeferredQuery<TestRow>();
  const firstController = new AbortController();
  const secondController = new AbortController();
  const thirdController = new AbortController();
  const run = (query: typeof first.query, controller: AbortController, userId: string) =>
    runCancellableAuthAdmissionQuery({
      createQuery: () => query,
      mapRow: mappedSession,
      signal: controller.signal,
      userId
    });

  const firstPromise = run(first.query, firstController, "student-1");
  const secondPromise = run(second.query, secondController, "student-2");
  const thirdPromise = run(third.query, thirdController, "student-3");
  firstController.abort();
  secondController.abort();
  third.resolve([{ id: "student-3" }]);

  await assert.rejects(firstPromise, (error) => error instanceof DOMException && error.name === "AbortError");
  await assert.rejects(secondPromise, (error) => error instanceof DOMException && error.name === "AbortError");
  assert.deepEqual(await thirdPromise, { userId: "student-3" });
  assert.equal(first.cancelCalls(), 1);
  assert.equal(second.cancelCalls(), 1);
  assert.equal(third.cancelCalls(), 0);
});

test("auth admission rejects promptly even when best-effort cancellation does not settle the query", async () => {
  const deferred = cancellableDeferredQuery<TestRow>();
  let cancelCalls = 0;
  let mapCalls = 0;
  let fallbackCalls = 0;
  const controller = new AbortController();
  const resultPromise = runCancellableAuthAdmissionQuery({
    createQuery: () => Object.assign(deferred.query, {
      cancel() {
        cancelCalls += 1;
      }
    }),
    mapRow: (row) => {
      mapCalls += 1;
      return mappedSession(row);
    },
    onAuthoritativeMiss: () => {
      fallbackCalls += 1;
      return null;
    },
    signal: controller.signal,
    userId: "student-1"
  });

  controller.abort(new DOMException("deadline", "TimeoutError"));
  const outcome = await Promise.race([
    resultPromise.then(
      () => ({ kind: "resolved" as const }),
      (error: unknown) => ({ error, kind: "rejected" as const })
    ),
    new Promise<{ kind: "timeout" }>((resolve) => {
      setTimeout(() => resolve({ kind: "timeout" }), 100);
    })
  ]);

  assert.equal(outcome.kind, "rejected");
  if (outcome.kind === "rejected") {
    assert.equal(outcome.error instanceof DOMException && outcome.error.name === "AbortError", true);
  }
  assert.equal(cancelCalls, 1);

  deferred.resolve([{ id: "student-1" }]);
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(mapCalls, 0);
  assert.equal(fallbackCalls, 0);
});

test("the auth admission slot drops an aborted waiter before the next transaction starts", async () => {
  const slot = createAbortableAuthAdmissionSlot();
  let active = 0;
  let maxActive = 0;
  let resolveFirst!: () => void;
  const firstGate = new Promise<void>((resolve) => {
    resolveFirst = resolve;
  });
  const runTracked = async (gate?: Promise<void>) => {
    active += 1;
    maxActive = Math.max(maxActive, active);
    try {
      await gate;
      return "ok";
    } finally {
      active -= 1;
    }
  };

  const first = slot.run(new AbortController().signal, () => runTracked(firstGate));
  const secondController = new AbortController();
  let secondOperationCalls = 0;
  const second = slot.run(secondController.signal, async () => {
    secondOperationCalls += 1;
    return runTracked();
  });
  let thirdOperationCalls = 0;
  const third = slot.run(new AbortController().signal, async () => {
    thirdOperationCalls += 1;
    return runTracked();
  });

  secondController.abort(new DOMException("deadline", "TimeoutError"));
  resolveFirst();

  assert.equal(await first, "ok");
  await assert.rejects(
    second,
    (error) => error instanceof DOMException && error.name === "AbortError"
  );
  assert.equal(await third, "ok");
  assert.equal(secondOperationCalls, 0);
  assert.equal(thirdOperationCalls, 1);
  assert.equal(maxActive, 1);
  assert.equal(active, 0);
});

test("a pre-aborted auth admission never enters the transaction slot", async () => {
  const slot = createAbortableAuthAdmissionSlot();
  const controller = new AbortController();
  controller.abort(new DOMException("deadline", "TimeoutError"));
  let operationCalls = 0;

  await assert.rejects(
    slot.run(controller.signal, async () => {
      operationCalls += 1;
      return "must-not-run";
    }),
    (error) => error instanceof DOMException && error.name === "AbortError"
  );
  assert.equal(operationCalls, 0);
});

function validJoinedRow(overrides: Partial<{
  profile_record: unknown;
  schema_ready: unknown;
  settings_record: unknown;
  user_record: unknown;
}> = {}) {
  return {
    schema_ready: true,
    user_record: {
      id: "student-1",
      username: "Student One",
      normalized_username: "student one",
      email: "student.one@example.test",
      normalized_email: "student.one@example.test",
      password_hash: "synthetic-hash",
      password_salt: "synthetic-salt",
      password_must_change: false,
      role: "student",
      created_at: "2026-08-11T00:00:00.000Z"
    },
    profile_record: {
      user_id: "student-1",
      name: "Student One",
      grade: "S3",
      curriculum_track: "HK",
      curriculum_region: "HK",
      textbook_publisher: "HK_MODERN_EDUCATIONAL_RESEARCH_SOCIETY",
      avatar_id: "delta"
    },
    settings_record: {
      user_id: "student-1",
      language: "zh",
      theme: "light",
      selected_grade: "S3",
      updated_at: "2026-08-11T00:00:00.000Z"
    },
    ...overrides
  };
}

test("a missing or stale auth schema marker fails closed", () => {
  assert.throws(
    () => mapAuthAdmissionJoinedRow(validJoinedRow({ schema_ready: false }), {
      mediaObjectUrlForKey: () => null
    }),
    /schema is unavailable/i
  );
});

test("joined auth rows preserve the existing user, curriculum, and settings mapping", () => {
  const authenticated = mapAuthAdmissionJoinedRow(validJoinedRow(), {
    mediaObjectUrlForKey: () => null,
    now: new Date("2026-08-11T00:00:00.000Z")
  });

  assert.deepEqual(authenticated, {
    user: {
      id: "student-1",
      name: "Student One",
      username: "Student One",
      email: "student.one@example.test",
      schoolId: undefined,
      passwordMustChange: false,
      avatarId: "delta",
      avatarImageDataUrl: undefined,
      avatarImageObjectKey: undefined,
      avatarImageUrl: undefined,
      grade: "S3",
      curriculumTrack: "HK",
      curriculumProfile: {
        region: "HK",
        publisher: "HK_MODERN_EDUCATIONAL_RESEARCH_SOCIETY"
      },
      role: "student"
    },
    settings: {
      language: "zh",
      theme: "light",
      selectedGrade: "S3"
    }
  });
});

test("missing or malformed joined settings use the existing default settings", () => {
  for (const settingsRecord of [null, { user_id: "student-1", language: "invalid" }]) {
    const authenticated = mapAuthAdmissionJoinedRow(
      validJoinedRow({ settings_record: settingsRecord }),
      {
        mediaObjectUrlForKey: () => null,
        now: new Date("2026-08-11T00:00:00.000Z")
      }
    );

    assert.deepEqual(authenticated?.settings, {
      language: "en",
      theme: "dark",
      selectedGrade: "S3"
    });
  }
});

test("missing or malformed identity rows cannot become authenticated sessions", () => {
  assert.equal(
    mapAuthAdmissionJoinedRow(validJoinedRow({ profile_record: null }), {
      mediaObjectUrlForKey: () => null
    }),
    null
  );
  assert.equal(
    mapAuthAdmissionJoinedRow(validJoinedRow({ user_record: { id: "student-1", role: "student" } }), {
      mediaObjectUrlForKey: () => null
    }),
    null
  );
  assert.equal(
    mapAuthAdmissionJoinedRow(validJoinedRow({
      profile_record: {
        user_id: "student-1",
        name: "Student One",
        grade: "UNKNOWN",
        curriculum_track: "HK"
      }
    }), {
      mediaObjectUrlForKey: () => null
    }),
    null
  );
});

test("joined auth mapping preserves non-student roles", () => {
  const authenticated = mapAuthAdmissionJoinedRow(validJoinedRow({
    user_record: {
      id: "admin-1",
      username: "Admin One",
      normalized_username: "admin one",
      password_hash: "synthetic-hash",
      password_salt: "synthetic-salt",
      password_must_change: false,
      role: "admin",
      created_at: "2026-08-11T00:00:00.000Z"
    },
    profile_record: {
      user_id: "admin-1",
      name: "Admin One",
      grade: "S3"
    },
    settings_record: null
  }), {
    mediaObjectUrlForKey: () => null,
    now: new Date("2026-08-11T00:00:00.000Z")
  });

  assert.equal(authenticated?.user.role, "admin");
  assert.equal(authenticated?.user.curriculumTrack, "HK");
});
