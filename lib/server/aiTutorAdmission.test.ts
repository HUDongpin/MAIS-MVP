import assert from "node:assert/strict";
import test from "node:test";
import { runAiTutorAdmission } from "./aiTutorAdmission";

type AdmissionStageFixture = "auth" | "classroom-policy" | "rate-limit";

type AdmissionObservationFixture = {
  stage: AdmissionStageFixture;
  phase: "start" | "resolved" | "deadline" | "aborted" | "error";
};

type UserFixture = {
  id: string;
};

type ClassroomPolicyFixture = {
  mode: "open" | "fallback-only";
};

type RateLimitFixture = {
  allowed: boolean;
};

const authenticatedUser: UserFixture = { id: "student-fixture" };
const openClassroomPolicy: ClassroomPolicyFixture = { mode: "open" };
const allowedRateLimit: RateLimitFixture = { allowed: true };
const shortDeadlines = {
  authMs: 20,
  classroomPolicyMs: 20,
  rateLimitMs: 20
};

function tutorRequest() {
  return new Request("https://mais.example/api/ai-tutor/resolve", {
    method: "POST"
  });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((settle) => {
    resolve = settle;
  });

  return { promise, resolve };
}

function nextTurn() {
  return new Promise<void>((resolve) => setImmediate(resolve));
}

function recordObservation(target: string[]) {
  return ({ stage, phase }: AdmissionObservationFixture) => {
    target.push(`${stage}:${phase}`);
  };
}

function assertPromptFailClosed(elapsedMs: number) {
  assert.ok(
    elapsedMs < 500,
    `admission should fail closed near its short stage deadline, received ${elapsedMs}ms`
  );
}

test("a pending authentication lookup fails closed and ignores a late resolution", async () => {
  const lateAuthentication = deferred<UserFixture | null>();
  const observations: string[] = [];
  let classroomPolicyCalls = 0;
  let rateLimitCalls = 0;
  const startedAt = Date.now();

  const result = await runAiTutorAdmission({
    request: tutorRequest(),
    deadlines: shortDeadlines,
    dependencies: {
      authenticate: async (_request: Request, _signal: AbortSignal) => lateAuthentication.promise,
      resolveClassroomPolicy: async (_user: UserFixture, _signal: AbortSignal) => {
        classroomPolicyCalls += 1;
        return openClassroomPolicy;
      },
      consumeRateLimit: async (
        _user: UserFixture,
        _policy: ClassroomPolicyFixture,
        _signal: AbortSignal
      ) => {
        rateLimitCalls += 1;
        return allowedRateLimit;
      }
    },
    observe: recordObservation(observations)
  });

  assertPromptFailClosed(Date.now() - startedAt);
  assert.equal(result.status, "unavailable");
  if (result.status === "unavailable") {
    assert.equal(result.stage, "auth");
    assert.equal(result.reason, "deadline");
  }
  assert.deepEqual(observations, ["auth:start", "auth:deadline"]);
  assert.equal(classroomPolicyCalls, 0);
  assert.equal(rateLimitCalls, 0);

  lateAuthentication.resolve(authenticatedUser);
  await nextTurn();

  assert.deepEqual(observations, ["auth:start", "auth:deadline"]);
  assert.equal(classroomPolicyCalls, 0);
  assert.equal(rateLimitCalls, 0);
});

test("a pending classroom-policy lookup fails closed and ignores a late resolution", async () => {
  const lateClassroomPolicy = deferred<ClassroomPolicyFixture>();
  const observations: string[] = [];
  let rateLimitCalls = 0;
  const startedAt = Date.now();

  const result = await runAiTutorAdmission({
    request: tutorRequest(),
    deadlines: shortDeadlines,
    dependencies: {
      authenticate: async (_request: Request, _signal: AbortSignal) => authenticatedUser,
      resolveClassroomPolicy: async (_user: UserFixture, _signal: AbortSignal) => lateClassroomPolicy.promise,
      consumeRateLimit: async (
        _user: UserFixture,
        _policy: ClassroomPolicyFixture,
        _signal: AbortSignal
      ) => {
        rateLimitCalls += 1;
        return allowedRateLimit;
      }
    },
    observe: recordObservation(observations)
  });

  assertPromptFailClosed(Date.now() - startedAt);
  assert.equal(result.status, "unavailable");
  if (result.status === "unavailable") {
    assert.equal(result.stage, "classroom-policy");
    assert.equal(result.reason, "deadline");
  }
  assert.deepEqual(observations, [
    "auth:start",
    "auth:resolved",
    "classroom-policy:start",
    "classroom-policy:deadline"
  ]);
  assert.equal(rateLimitCalls, 0);

  lateClassroomPolicy.resolve(openClassroomPolicy);
  await nextTurn();

  assert.deepEqual(observations, [
    "auth:start",
    "auth:resolved",
    "classroom-policy:start",
    "classroom-policy:deadline"
  ]);
  assert.equal(rateLimitCalls, 0);
});

test("a pending rate-limit lookup fails closed and ignores a late resolution", async () => {
  const lateRateLimit = deferred<RateLimitFixture>();
  const observations: string[] = [];
  const startedAt = Date.now();

  const result = await runAiTutorAdmission({
    request: tutorRequest(),
    deadlines: shortDeadlines,
    dependencies: {
      authenticate: async (_request: Request, _signal: AbortSignal) => authenticatedUser,
      resolveClassroomPolicy: async (_user: UserFixture, _signal: AbortSignal) => openClassroomPolicy,
      consumeRateLimit: async (
        _user: UserFixture,
        _policy: ClassroomPolicyFixture,
        _signal: AbortSignal
      ) => lateRateLimit.promise
    },
    observe: recordObservation(observations)
  });

  assertPromptFailClosed(Date.now() - startedAt);
  assert.equal(result.status, "unavailable");
  if (result.status === "unavailable") {
    assert.equal(result.stage, "rate-limit");
    assert.equal(result.reason, "deadline");
  }
  assert.deepEqual(observations, [
    "auth:start",
    "auth:resolved",
    "classroom-policy:start",
    "classroom-policy:resolved",
    "rate-limit:start",
    "rate-limit:deadline"
  ]);

  lateRateLimit.resolve(allowedRateLimit);
  await nextTurn();

  assert.deepEqual(observations, [
    "auth:start",
    "auth:resolved",
    "classroom-policy:start",
    "classroom-policy:resolved",
    "rate-limit:start",
    "rate-limit:deadline"
  ]);
  assert.equal(result.status, "unavailable");
});

test("a null authentication result remains unauthenticated without governance calls", async () => {
  let classroomPolicyCalls = 0;
  let rateLimitCalls = 0;

  const result = await runAiTutorAdmission({
    request: tutorRequest(),
    deadlines: shortDeadlines,
    dependencies: {
      authenticate: async (_request: Request, _signal: AbortSignal) => null,
      resolveClassroomPolicy: async (_user: UserFixture, _signal: AbortSignal) => {
        classroomPolicyCalls += 1;
        return openClassroomPolicy;
      },
      consumeRateLimit: async (
        _user: UserFixture,
        _policy: ClassroomPolicyFixture,
        _signal: AbortSignal
      ) => {
        rateLimitCalls += 1;
        return allowedRateLimit;
      }
    }
  });

  assert.equal(result.status, "unauthenticated");
  assert.equal(classroomPolicyCalls, 0);
  assert.equal(rateLimitCalls, 0);
});

test("successful admission preserves auth then classroom-policy then rate-limit order", async () => {
  const calls: string[] = [];
  const observations: string[] = [];

  const result = await runAiTutorAdmission({
    request: tutorRequest(),
    deadlines: shortDeadlines,
    dependencies: {
      authenticate: async (_request: Request, _signal: AbortSignal) => {
        calls.push("auth");
        return authenticatedUser;
      },
      resolveClassroomPolicy: async (_user: UserFixture, _signal: AbortSignal) => {
        calls.push("classroom-policy");
        return openClassroomPolicy;
      },
      consumeRateLimit: async (
        _user: UserFixture,
        _policy: ClassroomPolicyFixture,
        _signal: AbortSignal
      ) => {
        calls.push("rate-limit");
        return allowedRateLimit;
      }
    },
    observe: recordObservation(observations)
  });

  assert.deepEqual(calls, ["auth", "classroom-policy", "rate-limit"]);
  assert.deepEqual(observations, [
    "auth:start",
    "auth:resolved",
    "classroom-policy:start",
    "classroom-policy:resolved",
    "rate-limit:start",
    "rate-limit:resolved"
  ]);
  assert.equal(result.status, "admitted");
  if (result.status === "admitted") {
    assert.equal(result.authenticated, authenticatedUser);
    assert.equal(result.classroomPolicy, openClassroomPolicy);
    assert.equal(result.rateLimit, allowedRateLimit);
  }
});

test("a fallback-only classroom policy stops before rate-limit consumption", async () => {
  let rateLimitCalls = 0;
  const fallbackOnlyPolicy: ClassroomPolicyFixture = { mode: "fallback-only" };

  const result = await runAiTutorAdmission({
    request: tutorRequest(),
    deadlines: shortDeadlines,
    dependencies: {
      authenticate: async () => authenticatedUser,
      resolveClassroomPolicy: async () => fallbackOnlyPolicy,
      shouldContinueAfterClassroomPolicy: (policy) => policy.mode !== "fallback-only",
      consumeRateLimit: async () => {
        rateLimitCalls += 1;
        return allowedRateLimit;
      }
    }
  });

  assert.equal(result.status, "classroom-policy-blocked");
  if (result.status === "classroom-policy-blocked") {
    assert.equal(result.authenticated, authenticatedUser);
    assert.equal(result.classroomPolicy, fallbackOnlyPolicy);
  }
  assert.equal(rateLimitCalls, 0);
});

test("an abort signal stops admission before a later stage can run", async () => {
  const controller = new AbortController();
  const lateClassroomPolicy = deferred<ClassroomPolicyFixture>();
  const observations: string[] = [];
  let rateLimitCalls = 0;

  const result = await runAiTutorAdmission({
    request: tutorRequest(),
    signal: controller.signal,
    deadlines: shortDeadlines,
    dependencies: {
      authenticate: async (_request: Request, _signal: AbortSignal) => authenticatedUser,
      resolveClassroomPolicy: async (_user: UserFixture, _signal: AbortSignal) => {
        controller.abort();
        return lateClassroomPolicy.promise;
      },
      consumeRateLimit: async (
        _user: UserFixture,
        _policy: ClassroomPolicyFixture,
        _signal: AbortSignal
      ) => {
        rateLimitCalls += 1;
        return allowedRateLimit;
      }
    },
    observe: recordObservation(observations)
  });

  assert.equal(result.status, "unavailable");
  if (result.status === "unavailable") {
    assert.equal(result.stage, "classroom-policy");
    assert.equal(result.reason, "aborted");
  }
  assert.deepEqual(observations, [
    "auth:start",
    "auth:resolved",
    "classroom-policy:start",
    "classroom-policy:aborted"
  ]);
  assert.equal(rateLimitCalls, 0);

  lateClassroomPolicy.resolve(openClassroomPolicy);
  await nextTurn();

  assert.deepEqual(observations, [
    "auth:start",
    "auth:resolved",
    "classroom-policy:start",
    "classroom-policy:aborted"
  ]);
  assert.equal(rateLimitCalls, 0);
});
