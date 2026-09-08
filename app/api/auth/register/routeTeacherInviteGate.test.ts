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

const validInvite = "tinv_0123456789abcdef0123456789abcdef";
const secondValidInvite = "tinv_fedcba9876543210fedcba9876543210";
const unifiedInviteDenial = {
  code: "teacher-invite-denied",
  error: "Teacher registration could not be authorized. Ask your school administrator for a current invite code."
};

async function registerRequest(body: RegisterBody, forwardedFor?: string) {
  const { POST } = await import("./route");
  return POST(new Request("https://example.test/api/auth/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(forwardedFor ? { "x-forwarded-for": forwardedFor } : {})
    },
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
    assert.deepEqual(await unconfigured.json(), unifiedInviteDenial);

    process.env.TEACHER_INVITE_CODES = `${validInvite},legacy-school-code`;
    const invalidConfiguration = await registerRequest({
      ...teacherPayload("invalid-configuration"),
      teacherInviteCode: validInvite
    });
    assert.equal(invalidConfiguration.status, 403);
    assert.deepEqual(await invalidConfiguration.json(), unifiedInviteDenial);

    process.env.TEACHER_INVITE_CODES = `${validInvite},${secondValidInvite}`;
    const missing = await registerRequest(teacherPayload("missing"));
    assert.equal(missing.status, 403);
    assert.deepEqual(await missing.json(), unifiedInviteDenial);

    const wrong = await registerRequest({ ...teacherPayload("wrong"), teacherInviteCode: "not-a-real-code" });
    assert.equal(wrong.status, 403);
    assert.deepEqual(await wrong.json(), unifiedInviteDenial);

    const accepted = await registerRequest({
      ...teacherPayload("missing"),
      teacherInviteCode: ` ${validInvite} `
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

    const parent = await registerRequest({
      role: "parent",
      name: "Invite Gate Parent",
      username: "invite-gate-parent@example.test",
      email: "invite-gate-parent@example.test",
      password: "start12345",
      language: "en",
      theme: "dark"
    });
    assert.equal(parent.status, 200);
    assert.equal((await parent.json() as { user?: { role?: string } }).user?.role, "parent");

    const admin = await registerRequest({
      ...teacherPayload("admin-forbidden"),
      role: "admin",
      teacherInviteCode: validInvite
    });
    assert.equal(admin.status, 403);
    assert.match((await admin.json() as { error: string }).error, /administrator/u);

    for (let attempt = 1; attempt <= 12; attempt += 1) {
      const rejected = await registerRequest({
        ...teacherPayload(`rate-limit-${attempt}`),
        teacherInviteCode: `tinv_${String(attempt).padStart(32, "0")}`
      }, "198.51.100.88");
      assert.equal(rejected.status, 403, `attempt ${attempt} should reach the uniform invite denial`);
      assert.deepEqual(await rejected.json(), unifiedInviteDenial);
    }
    const rateLimited = await registerRequest({
      ...teacherPayload("rate-limited"),
      teacherInviteCode: "tinv_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    }, "198.51.100.88");
    assert.equal(rateLimited.status, 429);
    assert.equal((await rateLimited.json() as { code?: string }).code, "rate-limited");
  } finally {
    for (const key of envKeys) restoreEnv(key, previous.get(key));
    await rm(dbDir, { recursive: true, force: true });
  }
});
