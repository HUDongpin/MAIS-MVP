import assert from "node:assert/strict";
import test from "node:test";
import {
  classAiTutorRateLimitRulesFromPolicy,
  mergeClassAiTutorPoliciesByStrictest,
  normalizeClassAiTutorMode,
  normalizeClassAiTutorHourLimit,
  normalizeClassAiTutorMinuteLimit
} from "./aiGovernance";
import type { ClassAiTutorPolicy } from "@/types";

function policy(input: Partial<ClassAiTutorPolicy> & { classId: string }): ClassAiTutorPolicy {
  return {
    classId: input.classId,
    mode: input.mode ?? "open",
    previousLiveMode: input.previousLiveMode ?? "open",
    perStudentMinuteLimit: input.perStudentMinuteLimit ?? 2,
    perStudentHourLimit: input.perStudentHourLimit ?? 20,
    fallbackOnFailure: true,
    updatedBy: input.updatedBy ?? "teacher-1",
    updatedAt: input.updatedAt ?? "2026-06-29T00:00:00.000Z"
  };
}

test("mergeClassAiTutorPoliciesByStrictest prefers fallback-only over live modes", () => {
  const merged = mergeClassAiTutorPoliciesByStrictest(
    [
      policy({ classId: "class-open", mode: "open", perStudentMinuteLimit: 6 }),
      policy({ classId: "class-limited", mode: "limited", perStudentMinuteLimit: 2 }),
      policy({ classId: "class-paused", mode: "fallback-only" })
    ],
    policy({ classId: "default" })
  );

  assert.equal(merged.classId, "class-paused");
  assert.equal(merged.mode, "fallback-only");
});

test("mergeClassAiTutorPoliciesByStrictest takes the tightest limited caps across classes", () => {
  const merged = mergeClassAiTutorPoliciesByStrictest(
    [
      policy({ classId: "class-a", mode: "limited", perStudentMinuteLimit: 4, perStudentHourLimit: 30 }),
      policy({ classId: "class-b", mode: "limited", perStudentMinuteLimit: 2, perStudentHourLimit: 12 })
    ],
    policy({ classId: "default" })
  );

  assert.equal(merged.mode, "limited");
  assert.equal(merged.perStudentMinuteLimit, 2);
  assert.equal(merged.perStudentHourLimit, 12);
});

test("classAiTutorRateLimitRulesFromPolicy uses classroom caps only for limited mode", () => {
  const limitedRules = classAiTutorRateLimitRulesFromPolicy(policy({
    classId: "class-limited",
    mode: "limited",
    perStudentMinuteLimit: 2,
    perStudentHourLimit: 20
  }));
  assert.deepEqual(limitedRules.map((rule) => [rule.name, rule.max]), [["class-minute", 2], ["class-hour", 20]]);

  const openRules = classAiTutorRateLimitRulesFromPolicy(policy({ classId: "class-open", mode: "open" }), {
    AI_TUTOR_MAX_REQUESTS_PER_MINUTE: "6",
    AI_TUTOR_MAX_REQUESTS_PER_HOUR: "30"
  });
  assert.deepEqual(openRules.map((rule) => [rule.name, rule.max]), [["minute", 6], ["hour", 30]]);
});

test("classroom policy mode normalization defaults unknown values to open", () => {
  assert.equal(normalizeClassAiTutorMode("limited"), "limited");
  assert.equal(normalizeClassAiTutorMode("fallback-only"), "fallback-only");
  assert.equal(normalizeClassAiTutorMode("paused"), "open");
  assert.equal(normalizeClassAiTutorMode(null), "open");
});

test("classroom caps are bounded for the pilot range", () => {
  assert.equal(normalizeClassAiTutorMinuteLimit(99), 6);
  assert.equal(normalizeClassAiTutorMinuteLimit(0), 1);
  assert.equal(normalizeClassAiTutorHourLimit(99), 60);
  assert.equal(normalizeClassAiTutorHourLimit(1), 5);
});
