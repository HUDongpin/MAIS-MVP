import assert from "node:assert/strict";
import test from "node:test";
import {
  buildRegistrationRequestInit,
  classifyRegistrationFailure,
  teacherInviteInputAttributes
} from "./teacherInviteRegistrationClient";
import { TEACHER_INVITE_CODE_MAX_LENGTH } from "../../lib/teacherInviteCodeContract";

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

  assert.deepEqual(teacherInviteInputAttributes, {
    type: "password",
    autoComplete: "off",
    maxLength: TEACHER_INVITE_CODE_MAX_LENGTH
  });
  assert.equal(TEACHER_INVITE_CODE_MAX_LENGTH, validInvite.length);
});
