import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

/**
 * BK-05 / the first open item on PRODUCTION-READINESS-CHECKLIST.md: a stranger must
 * not be able to mint a teacher account, and the gate must not leak onto the student
 * or parent paths.
 */
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

test("teacher registration is gated on an invite code while student registration is not", async () => {
  const previousAuthSecret = process.env.AUTH_SESSION_SECRET;
  const previousDbDir = process.env.HK_MATH_DB_DIR;
  const previousDbPath = process.env.HK_MATH_DB_PATH;
  const previousDemoFlag = process.env.HK_MATH_ENABLE_DEMO_USER;
  const previousInviteCodes = process.env.TEACHER_INVITE_CODES;
  const previousStorageProvider = process.env.HK_MATH_STORAGE_PROVIDER;
  const previousVercel = process.env.VERCEL;
  const previousVercelEnv = process.env.VERCEL_ENV;
  const dbDir = await mkdtemp(path.join(tmpdir(), "mais-teacher-invite-gate-"));

  try {
    process.env.AUTH_SESSION_SECRET = "teacher-invite-gate-test-secret";
    process.env.HK_MATH_DB_DIR = dbDir;
    process.env.HK_MATH_ENABLE_DEMO_USER = "false";
    delete process.env.HK_MATH_DB_PATH;
    delete process.env.HK_MATH_STORAGE_PROVIDER;
    delete process.env.VERCEL;
    delete process.env.VERCEL_ENV;

    // With nothing configured the gate is closed outright, not open by default.
    delete process.env.TEACHER_INVITE_CODES;
    const unconfigured = await registerRequest(teacherPayload("unconfigured"));
    assert.equal(unconfigured.status, 403);
    assert.equal((await unconfigured.json() as { code?: string }).code, "teacher-invite-registration-closed");

    process.env.TEACHER_INVITE_CODES = "  first-school-code , second-school-code ";

    const missing = await registerRequest(teacherPayload("missing"));
    assert.equal(missing.status, 403);
    assert.equal((await missing.json() as { code?: string }).code, "teacher-invite-code-required");

    const wrong = await registerRequest({ ...teacherPayload("wrong"), teacherInviteCode: "not-a-real-code" });
    assert.equal(wrong.status, 403);
    assert.equal((await wrong.json() as { code?: string }).code, "teacher-invite-code-invalid");

    // A rejected signup must not have written anything: the same username still
    // registers cleanly once the right code is supplied.
    const accepted = await registerRequest({ ...teacherPayload("missing"), teacherInviteCode: "First-School-Code" });
    assert.equal(accepted.status, 200);
    const acceptedBody = await accepted.json() as { user?: { role?: string } };
    assert.equal(acceptedBody.user?.role, "teacher");

    // The second configured code works too, and surrounding whitespace is tolerated.
    const secondCode = await registerRequest({ ...teacherPayload("second"), teacherInviteCode: " second-school-code " });
    assert.equal(secondCode.status, 200);

    // Students are untouched by the gate.
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
    restoreEnv("AUTH_SESSION_SECRET", previousAuthSecret);
    restoreEnv("HK_MATH_DB_DIR", previousDbDir);
    restoreEnv("HK_MATH_DB_PATH", previousDbPath);
    restoreEnv("HK_MATH_ENABLE_DEMO_USER", previousDemoFlag);
    restoreEnv("TEACHER_INVITE_CODES", previousInviteCodes);
    restoreEnv("HK_MATH_STORAGE_PROVIDER", previousStorageProvider);
    restoreEnv("VERCEL", previousVercel);
    restoreEnv("VERCEL_ENV", previousVercelEnv);
    await rm(dbDir, { recursive: true, force: true });
  }
});
