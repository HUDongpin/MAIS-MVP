import assert from "node:assert/strict";
import test from "node:test";
import {
  configuredTeacherInviteCodes,
  teacherSelfRegistrationConfigured,
  verifyTeacherInviteCode
} from "./teacherInviteCode";

const validInviteA = "tinv_0123456789abcdef0123456789abcdef";
const validInviteB = "tinv_fedcba9876543210fedcba9876543210";

function restoreEnv(value: string | undefined) {
  if (value === undefined) delete process.env.TEACHER_INVITE_CODES;
  else process.env.TEACHER_INVITE_CODES = value;
}

test("teacher invite verification requires exact 128-bit tokens and fails closed on any invalid configuration", () => {
  const previous = process.env.TEACHER_INVITE_CODES;
  try {
    delete process.env.TEACHER_INVITE_CODES;
    assert.equal(teacherSelfRegistrationConfigured(), false);
    assert.deepEqual(verifyTeacherInviteCode("anything"), {
      status: "rejected",
      reason: "registration-closed"
    });

    process.env.TEACHER_INVITE_CODES = ` ${validInviteA},\n${validInviteB} ,, `;
    assert.deepEqual(configuredTeacherInviteCodes(), [validInviteA, validInviteB]);
    assert.equal(teacherSelfRegistrationConfigured(), true);
    assert.deepEqual(verifyTeacherInviteCode(undefined), {
      status: "rejected",
      reason: "code-required"
    });
    assert.deepEqual(verifyTeacherInviteCode("not-a-token"), {
      status: "rejected",
      reason: "code-invalid"
    });
    assert.deepEqual(verifyTeacherInviteCode(`  ${validInviteA}  `), { status: "accepted" });
    assert.deepEqual(verifyTeacherInviteCode(`${" ".repeat(8)}${validInviteA}${" ".repeat(8)}`), { status: "accepted" });
    assert.deepEqual(verifyTeacherInviteCode(`${" ".repeat(9)}${validInviteA}${" ".repeat(8)}`), {
      status: "rejected",
      reason: "code-invalid"
    });
    assert.deepEqual(verifyTeacherInviteCode(validInviteA.replace("0123", "01 23")), {
      status: "rejected",
      reason: "code-invalid"
    });
    assert.deepEqual(verifyTeacherInviteCode(validInviteB), { status: "accepted" });
    assert.deepEqual(verifyTeacherInviteCode(validInviteA.toUpperCase()), {
      status: "rejected",
      reason: "code-invalid"
    });

    process.env.TEACHER_INVITE_CODES = `${validInviteA},legacy-school-code`;
    assert.deepEqual(configuredTeacherInviteCodes(), []);
    assert.equal(teacherSelfRegistrationConfigured(), false);
    assert.deepEqual(verifyTeacherInviteCode(validInviteA), {
      status: "rejected",
      reason: "registration-closed"
    });

    process.env.TEACHER_INVITE_CODES = `tinv_${"a".repeat(31)}`;
    assert.equal(teacherSelfRegistrationConfigured(), false);
  } finally {
    restoreEnv(previous);
  }
});
