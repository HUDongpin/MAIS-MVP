import assert from "node:assert/strict";
import test from "node:test";
import {
  configuredTeacherInviteCodes,
  teacherSelfRegistrationConfigured,
  verifyTeacherInviteCode
} from "./teacherInviteCode";

function restoreEnv(value: string | undefined) {
  if (value === undefined) delete process.env.TEACHER_INVITE_CODES;
  else process.env.TEACHER_INVITE_CODES = value;
}

test("teacher invite verification fails closed and accepts only configured bounded codes", () => {
  const previous = process.env.TEACHER_INVITE_CODES;
  try {
    delete process.env.TEACHER_INVITE_CODES;
    assert.equal(teacherSelfRegistrationConfigured(), false);
    assert.deepEqual(verifyTeacherInviteCode("anything"), {
      status: "rejected",
      reason: "registration-closed"
    });

    process.env.TEACHER_INVITE_CODES = " first-school-code,\nSECOND-school-code ,, ";
    assert.deepEqual(configuredTeacherInviteCodes(), ["first-school-code", "SECOND-school-code"]);
    assert.equal(teacherSelfRegistrationConfigured(), true);
    assert.deepEqual(verifyTeacherInviteCode(undefined), {
      status: "rejected",
      reason: "code-required"
    });
    assert.deepEqual(verifyTeacherInviteCode("wrong"), {
      status: "rejected",
      reason: "code-invalid"
    });
    assert.deepEqual(verifyTeacherInviteCode("  First-School-Code  "), { status: "accepted" });
    assert.deepEqual(verifyTeacherInviteCode("second-SCHOOL-code"), { status: "accepted" });
    assert.deepEqual(verifyTeacherInviteCode("x".repeat(257)), {
      status: "rejected",
      reason: "code-invalid"
    });
    assert.deepEqual(verifyTeacherInviteCode(`  first-school-code${" ".repeat(238)}`), {
      status: "rejected",
      reason: "code-invalid"
    });
  } finally {
    restoreEnv(previous);
  }
});
