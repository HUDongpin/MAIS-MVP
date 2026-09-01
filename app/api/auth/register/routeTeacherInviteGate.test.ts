import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

type RegisterBody = Record<string, unknown>;

async function registerRequest(body: RegisterBody) {
  const { POST } = await import("./route");
  return POST(new Request("https://example.test/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  }));
}

function teacherPayload(suffix: string): RegisterBody {
  return {
    role: "teacher",
    name: "Invite Gate Teacher",
    username: `invite-gate-teacher-${suffix}@example.test`,
    email: `invite-gate-teacher-${suffix}@example.test`,
    password: "start12345",
    grade: "S3",
    curriculumTrack: "HK",
    language: "en",
    theme: "dark"
  };
}

test("teacher registration requires a configured invite while student registration stays open", async () => {
  const envKeys = [
    "AUTH_SESSION_SECRET",
    "HK_MATH_DB_DIR",
    "HK_MATH_DB_PATH",
    "HK_MATH_ENABLE_DEMO_USER",
    "HK_MATH_STORAGE_PROVIDER",
    "TEACHER_INVITE_CODES",
    "VERCEL",
    "VERCEL_ENV"
  ] as const;
  const previous = new Map(envKeys.map((key) => [key, process.env[key]]));
  const dbDir = await mkdtemp(path.join(tmpdir(), "mais-teacher-invite-gate-"));

  try {
    process.env.AUTH_SESSION_SECRET = "teacher-invite-gate-test-secret";
    process.env.HK_MATH_DB_DIR = dbDir;
    process.env.HK_MATH_ENABLE_DEMO_USER = "false";
    delete process.env.HK_MATH_DB_PATH;
    delete process.env.HK_MATH_STORAGE_PROVIDER;
    delete process.env.VERCEL;
    delete process.env.VERCEL_ENV;

    delete process.env.TEACHER_INVITE_CODES;
    const unconfigured = await registerRequest(teacherPayload("unconfigured"));
    assert.equal(unconfigured.status, 403);
    assert.equal((await unconfigured.json() as { code?: string }).code, "teacher-invite-registration-closed");

    process.env.TEACHER_INVITE_CODES = "first-school-code,second-school-code";
    const missing = await registerRequest(teacherPayload("missing"));
    assert.equal(missing.status, 403);
    assert.equal((await missing.json() as { code?: string }).code, "teacher-invite-code-required");

    const wrong = await registerRequest({ ...teacherPayload("wrong"), teacherInviteCode: "not-a-real-code" });
    assert.equal(wrong.status, 403);
    assert.equal((await wrong.json() as { code?: string }).code, "teacher-invite-code-invalid");

    const accepted = await registerRequest({
      ...teacherPayload("missing"),
      teacherInviteCode: " First-School-Code "
    });
    assert.equal(accepted.status, 200);
    assert.equal((await accepted.json() as { user?: { role?: string } }).user?.role, "teacher");

    const student = await registerRequest({
      role: "student",
      name: "Invite Gate Student",
      username: "invite-gate-student@example.test",
      password: "start12345",
      grade: "S3",
      curriculumTrack: "HK",
      language: "en",
      theme: "dark"
    });
    assert.equal(student.status, 200);
    assert.equal((await student.json() as { user?: { role?: string } }).user?.role, "student");
  } finally {
    for (const key of envKeys) restoreEnv(key, previous.get(key));
    await rm(dbDir, { recursive: true, force: true });
  }
});
