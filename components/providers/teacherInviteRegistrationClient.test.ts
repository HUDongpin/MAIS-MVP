import assert from "node:assert/strict";
import test from "node:test";
import {
  buildRegistrationRequestInit,
  classifyRegistrationFailure,
  teacherInviteInputAttributes
} from "./teacherInviteRegistrationClient";
import { isTeacherInviteCode, TEACHER_INVITE_CODE_MAX_LENGTH } from "../../lib/teacherInviteCodeContract";

const validInvite = "tinv_0123456789abcdef0123456789abcdef";

test("registration request and failure classification execute the teacher invite contract", async () => {
  const teacherRequest = buildRegistrationRequestInit({
    role: "teacher",
    name: "Teacher",
    password: "start12345",
    teacherInviteCode: validInvite
  });
  assert.equal(teacherRequest.method, "POST");
  assert.deepEqual(teacherRequest.headers, { "Content-Type": "application/json" });
  assert.deepEqual(JSON.parse(String(teacherRequest.body)), {
    role: "teacher",
    name: "Teacher",
    password: "start12345",
    teacherInviteCode: validInvite
  });

  const studentRequest = buildRegistrationRequestInit({
    role: "student",
    name: "Student",
    password: "start12345",
    teacherInviteCode: undefined
  });
  assert.equal("teacherInviteCode" in JSON.parse(String(studentRequest.body)), false);

  assert.equal(await classifyRegistrationFailure(new Response(null, { status: 409 })), "duplicate");
  assert.equal(await classifyRegistrationFailure(new Response(null, { status: 400 })), "invalid");
  assert.equal(await classifyRegistrationFailure(new Response(JSON.stringify({ code: "teacher-invite-denied" }), {
    status: 403,
    headers: { "Content-Type": "application/json" }
  })), "teacher-invite");
  assert.equal(await classifyRegistrationFailure(new Response(JSON.stringify({ code: "teacher-invite-not-a-real-server-code" }), {
    status: 403,
    headers: { "Content-Type": "application/json" }
  })), "error");
  assert.equal(await classifyRegistrationFailure(new Response(JSON.stringify({ code: "session-secret-missing" }), {
    status: 503,
    headers: { "Content-Type": "application/json" }
  })), "setup");
  assert.equal(await classifyRegistrationFailure(new Response("not-json", { status: 503 })), "error");

  // Model the browser's raw input limit before the server trims surrounding whitespace.
  for (const rawInvite of [`  ${validInvite}  `, `${" ".repeat(8)}${validInvite}${" ".repeat(8)}`]) {
    const enteredInvite = rawInvite.slice(0, teacherInviteInputAttributes.maxLength);
    const request = buildRegistrationRequestInit({ role: "teacher", teacherInviteCode: enteredInvite });
    const submittedInvite = JSON.parse(String(request.body)).teacherInviteCode as string;
    assert.equal(submittedInvite, rawInvite, "surrounding whitespace must not truncate the token");
    assert.equal(isTeacherInviteCode(submittedInvite.trim()), true);
  }

  assert.deepEqual(teacherInviteInputAttributes, {
    type: "password",
    autoComplete: "off",
    maxLength: TEACHER_INVITE_CODE_MAX_LENGTH + 16
  });
  assert.equal(TEACHER_INVITE_CODE_MAX_LENGTH, validInvite.length);
});
