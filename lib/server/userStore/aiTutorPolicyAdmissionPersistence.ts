import {
  maxClassAiTutorPerStudentHourLimit,
  maxClassAiTutorPerStudentMinuteLimit,
  mergeClassAiTutorPoliciesByStrictest,
  minClassAiTutorPerStudentHourLimit,
  minClassAiTutorPerStudentMinuteLimit
} from "@/lib/server/aiGovernance";
import {
  classAiTutorPolicyRecordToPublic,
  defaultClassAiTutorPolicyRecord,
  normalizeClassAiTutorPolicyRecord
} from "@/lib/server/userStore/aiGovernancePersistence";
import type { ClassAiTutorPolicy } from "@/types";

type UserRole = "student" | "teacher" | "parent" | "admin";
const userRoles = new Set<UserRole>(["student", "teacher", "parent", "admin"]);
const policyModes = new Set(["open", "limited", "fallback-only"]);
const policyLiveModes = new Set(["open", "limited"]);

export type AiTutorPolicyAdmissionRow = {
  class_id: unknown;
  policy_record: unknown;
  schema_ready: unknown;
  teacher_id: unknown;
  updated_at: unknown;
  user_role: unknown;
};

export type AiTutorAdmissionQuery<Result> = PromiseLike<Result>;

function policyAdmissionAbortError() {
  return new DOMException("AI Tutor classroom-policy admission was aborted.", "AbortError");
}

function throwIfPolicyAdmissionAborted(signal: AbortSignal) {
  if (signal.aborted) throw policyAdmissionAbortError();
}

function defaultPolicy(now: string) {
  return classAiTutorPolicyRecordToPublic(defaultClassAiTutorPolicyRecord({
    classId: "default",
    now,
    updatedBy: "system"
  }));
}

function strictExplicitPolicyRecord(value: unknown, classId: string, now: string) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("AI Tutor classroom-policy record is invalid.");
  }
  const record = value as Record<string, unknown>;
  if (
    typeof record.class_id !== "string"
    || record.class_id.trim() !== classId
    || !policyModes.has(record.mode as string)
    || !Number.isInteger(record.per_student_minute_limit)
    || Number(record.per_student_minute_limit) < minClassAiTutorPerStudentMinuteLimit
    || Number(record.per_student_minute_limit) > maxClassAiTutorPerStudentMinuteLimit
    || !Number.isInteger(record.per_student_hour_limit)
    || Number(record.per_student_hour_limit) < minClassAiTutorPerStudentHourLimit
    || Number(record.per_student_hour_limit) > maxClassAiTutorPerStudentHourLimit
    || (
      record.previous_live_mode !== undefined
      && record.previous_live_mode !== null
      && !policyLiveModes.has(record.previous_live_mode as string)
    )
  ) {
    throw new Error("AI Tutor classroom-policy record is invalid.");
  }
  const normalized = normalizeClassAiTutorPolicyRecord(record, now);
  if (!normalized || normalized.class_id !== classId) {
    throw new Error("AI Tutor classroom-policy projection key is invalid.");
  }
  return normalized;
}

export function mapAiTutorPolicyAdmissionRows(
  rows: readonly AiTutorPolicyAdmissionRow[],
  now = new Date().toISOString()
): ClassAiTutorPolicy {
  if (!rows.length || rows.some((row) => row.schema_ready !== true)) {
    throw new Error("AI Tutor classroom-policy schema is unavailable.");
  }

  const role = rows[0]?.user_role;
  if (typeof role !== "string" || !userRoles.has(role as UserRole)) {
    throw new Error("AI Tutor classroom-policy user projection is unavailable.");
  }

  const fallback = defaultPolicy(now);
  if (role !== "student") return fallback;

  const policies = rows.flatMap((row) => {
    if (typeof row.class_id !== "string" || !row.class_id.trim()) return [];
    const classId = row.class_id.trim();
    if (typeof row.teacher_id !== "string" || !row.teacher_id.trim()) {
      throw new Error("AI Tutor classroom-policy class projection is invalid.");
    }
    const updatedAt = typeof row.updated_at === "string" && row.updated_at.trim()
      ? row.updated_at
      : now;
    const explicitPolicy = row.policy_record === null
      ? null
      : strictExplicitPolicyRecord(row.policy_record, classId, now);
    const policy = explicitPolicy ?? defaultClassAiTutorPolicyRecord({
        classId,
        now: updatedAt,
        updatedBy: row.teacher_id.trim()
      });

    return [classAiTutorPolicyRecordToPublic(policy)];
  });

  return mergeClassAiTutorPoliciesByStrictest(policies, fallback);
}

export async function runAiTutorPolicyAdmissionQuery({
  createQuery,
  now,
  signal
}: {
  createQuery: () => AiTutorAdmissionQuery<readonly AiTutorPolicyAdmissionRow[]>;
  now?: string;
  signal: AbortSignal;
}) {
  const rows = await runCancellableAiTutorAdmissionQuery({ createQuery, signal });
  return mapAiTutorPolicyAdmissionRows(rows, now);
}

export async function runCancellableAiTutorAdmissionQuery<Result>({
  createQuery,
  signal
}: {
  createQuery: () => AiTutorAdmissionQuery<Result>;
  signal: AbortSignal;
}): Promise<Result> {
  throwIfPolicyAdmissionAborted(signal);
  const query = createQuery();
  let abortRequested = false;
  let rejectForAbort!: (error: DOMException) => void;
  const aborted = new Promise<never>((_resolve, reject) => {
    rejectForAbort = reject;
  });
  const abortQueryWait = () => {
    if (abortRequested) return;
    abortRequested = true;
    // postgres.js 3.4.x drops its internal CancelRequest Promise. Rely on the
    // independent abort result plus transaction-local timeout/rollback instead
    // of risking an unhandled cancellation-channel rejection.
    rejectForAbort(policyAdmissionAbortError());
  };

  signal.addEventListener("abort", abortQueryWait, { once: true });
  if (signal.aborted) abortQueryWait();
  try {
    const result = await Promise.race([Promise.resolve(query), aborted]);
    throwIfPolicyAdmissionAborted(signal);
    return result;
  } catch (error) {
    if (signal.aborted) throw policyAdmissionAbortError();
    throw error;
  } finally {
    signal.removeEventListener("abort", abortQueryWait);
  }
}
