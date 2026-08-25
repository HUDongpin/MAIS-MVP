import assert from "node:assert/strict";
import test from "node:test";
import {
  mapAiTutorPolicyAdmissionRows,
  runAiTutorPolicyAdmissionQuery,
  type AiTutorPolicyAdmissionRow
} from "@/lib/server/userStore/aiTutorPolicyAdmissionPersistence";

const now = "2026-08-12T08:00:00.000Z";

test("policy admission maps projected class rows to the strictest student policy", () => {
  const rows: AiTutorPolicyAdmissionRow[] = [
    {
      schema_ready: true,
      user_role: "student",
      class_id: "class-open",
      teacher_id: "teacher-1",
      updated_at: "2026-08-11T08:00:00.000Z",
      policy_record: {
        class_id: "class-open",
        mode: "open",
        previous_live_mode: "open",
        per_student_minute_limit: 6,
        per_student_hour_limit: 60,
        fallback_on_failure: true,
        updated_by: "teacher-1",
        updated_at: "2026-08-11T08:00:00.000Z"
      }
    },
    {
      schema_ready: true,
      user_role: "student",
      class_id: "class-limited",
      teacher_id: "teacher-2",
      updated_at: "2026-08-11T09:00:00.000Z",
      policy_record: {
        class_id: "class-limited",
        mode: "limited",
        previous_live_mode: "limited",
        per_student_minute_limit: 3,
        per_student_hour_limit: 24,
        fallback_on_failure: true,
        updated_by: "teacher-2",
        updated_at: "2026-08-11T09:00:00.000Z"
      }
    }
  ];

  assert.deepEqual(mapAiTutorPolicyAdmissionRows(rows, now), {
    classId: "class-limited",
    mode: "limited",
    previousLiveMode: "limited",
    perStudentMinuteLimit: 3,
    perStudentHourLimit: 24,
    fallbackOnFailure: true,
    updatedBy: "teacher-2",
    updatedAt: "2026-08-11T09:00:00.000Z"
  });
});

test("aborting policy admission rejects promptly without unsafe postgres.js cancellation", async () => {
  const controller = new AbortController();
  let cancelCalls = 0;
  const neverSettles = new Promise<readonly AiTutorPolicyAdmissionRow[]>(() => undefined) as
    Promise<readonly AiTutorPolicyAdmissionRow[]> & { cancel(): void };
  neverSettles.cancel = () => {
    cancelCalls += 1;
  };

  const lookup = runAiTutorPolicyAdmissionQuery({
    createQuery: () => neverSettles,
    now,
    signal: controller.signal
  });
  controller.abort();

  await assert.rejects(
    Promise.race([
      lookup,
      new Promise((_, reject) => setTimeout(() => reject(new Error("lookup did not abort")), 50))
    ]),
    (error: unknown) => error instanceof DOMException && error.name === "AbortError"
  );
  assert.equal(cancelCalls, 0);
});

test("authoritative students without a class receive the existing default-open policy", () => {
  assert.deepEqual(mapAiTutorPolicyAdmissionRows([{
    schema_ready: true,
    user_role: "student",
    class_id: null,
    teacher_id: null,
    updated_at: null,
    policy_record: null
  }], now), {
    classId: "default",
    mode: "open",
    previousLiveMode: "open",
    perStudentMinuteLimit: 2,
    perStudentHourLimit: 20,
    fallbackOnFailure: true,
    updatedBy: "system",
    updatedAt: now
  });
});

test("policy admission fails closed on a stale schema marker or corrupt class projection", () => {
  assert.throws(() => mapAiTutorPolicyAdmissionRows([{
    schema_ready: false,
    user_role: null,
    class_id: null,
    teacher_id: null,
    updated_at: null,
    policy_record: null
  }], now), /schema is unavailable/);
  assert.throws(() => mapAiTutorPolicyAdmissionRows([{
    schema_ready: true,
    user_role: "student",
    class_id: "class-corrupt",
    teacher_id: null,
    updated_at: now,
    policy_record: null
  }], now), /class projection is invalid/);
});

test("a non-null malformed classroom policy fails closed instead of normalizing open", () => {
  const baseRow: AiTutorPolicyAdmissionRow = {
    schema_ready: true,
    user_role: "student",
    class_id: "class-strict",
    teacher_id: "teacher-1",
    updated_at: now,
    policy_record: null
  };
  const validPolicy = {
    class_id: "class-strict",
    mode: "limited",
    previous_live_mode: "limited",
    per_student_minute_limit: 2,
    per_student_hour_limit: 10,
    fallback_on_failure: true,
    updated_by: "teacher-1",
    updated_at: now
  };
  const malformedPolicies = [
    { ...validPolicy, mode: "invalid" },
    { ...validPolicy, per_student_minute_limit: 0 },
    { ...validPolicy, per_student_minute_limit: 1.5 },
    { ...validPolicy, per_student_hour_limit: 1000 },
    { ...validPolicy, previous_live_mode: "fallback-only" },
    { ...validPolicy, class_id: "different-class" }
  ];

  for (const policy_record of malformedPolicies) {
    assert.throws(
      () => mapAiTutorPolicyAdmissionRows([{ ...baseRow, policy_record }], now),
      /policy (record|projection key) is invalid/i
    );
  }
});
