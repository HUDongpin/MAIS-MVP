import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import { curriculumProfileForTrack } from "@/lib/curriculumProfile";

const dbDir = mkdtempSync(path.join(tmpdir(), "mais-google-auth-"));

process.env.HK_MATH_DB_DIR = dbDir;
process.env.HK_MATH_ENABLE_DEMO_USER = "false";
process.env.AUTH_SESSION_SECRET = crypto.randomUUID().replaceAll("-", "");

after(async () => {
  await rm(dbDir, { recursive: true, force: true });
});

test("authenticateGoogleIdentityForLogin creates and reuses a verified student Google identity", async () => {
  const store = await import("./userStore");
  const curriculumProfile = curriculumProfileForTrack("HK");

  const first = await store.authenticateGoogleIdentityForLogin({
    providerSubject: "google-student-subject",
    email: "google.student@example.test",
    emailVerified: true,
    displayName: "Google Student",
    requestedRole: "student",
    studentAge13OrOlder: true,
    grade: "S4",
    curriculumProfile,
    language: "en",
    theme: "dark"
  });

  assert.equal(first.status, "created");
  assert.equal(first.session.user.role, "student");
  assert.equal(first.session.user.email, "google.student@example.test");
  assert.equal(first.session.user.grade, "S4");
  assert.equal(first.session.user.curriculumTrack, "HK");

  const second = await store.authenticateGoogleIdentityForLogin({
    providerSubject: "google-student-subject",
    email: "google.student@example.test",
    emailVerified: true,
    displayName: "Updated Google Student",
    requestedRole: "student",
    studentAge13OrOlder: true,
    grade: "S5",
    curriculumProfile,
    language: "zh",
    theme: "light"
  });

  assert.equal(second.status, "authenticated");
  assert.equal(second.session.user.id, first.session.user.id);
  assert.equal(second.session.user.grade, "S4");

  const forgedRoleBypass = await store.authenticateGoogleIdentityForLogin({
    providerSubject: "google-student-subject",
    email: "google.student@example.test",
    emailVerified: true,
    requestedRole: "teacher",
    grade: "S4",
    curriculumProfile
  });

  assert.equal(forgedRoleBypass.status, "invalid");
});

test("a Google identity is reused by an independent server process", async () => {
  const processDbDir = mkdtempSync(path.join(tmpdir(), "mais-google-auth-process-"));
  const providerSubject = `google-process-${crypto.randomUUID()}`;
  const email = `${providerSubject}@example.test`;
  const workerPath = path.join(__dirname, "userStoreGoogleAuthProcessWorker.js");
  const workerEnv = {
    ...process.env,
    HK_MATH_STORAGE_PROVIDER: "sqlite",
    HK_MATH_DB_DIR: processDbDir,
    HK_MATH_ENABLE_DEMO_USER: "false"
  };

  const runWorker = () => spawnSync(process.execPath, [workerPath, providerSubject, email], {
    encoding: "utf8",
    env: workerEnv
  });

  try {
    const first = runWorker();
    assert.equal(first.status, 0, first.stderr);
    const firstResult = JSON.parse(first.stdout) as { status: string; userId?: string };
    assert.equal(firstResult.status, "created");
    assert.ok(firstResult.userId);

    const second = runWorker();
    assert.equal(second.status, 0, second.stderr);
    const secondResult = JSON.parse(second.stdout) as { status: string; userId?: string };
    assert.equal(secondResult.status, "authenticated");
    assert.equal(secondResult.userId, firstResult.userId);
  } finally {
    await rm(processDbDir, { recursive: true, force: true });
  }
});

test("authenticateGoogleIdentityForLogin does not auto-link a non-authoritative Google email collision", async () => {
  const store = await import("./userStore");
  const curriculumProfile = curriculumProfileForTrack("HK");
  const created = await store.createStudentUser({
    name: "Existing Student",
    username: "existing-google-link@example.test",
    email: "existing-google-link@example.test",
    password: "ExistingPassword123!",
    grade: "S5",
    curriculumProfile,
    language: "en",
    theme: "dark"
  });
  assert.equal(created.status, "created");

  const linked = await store.authenticateGoogleIdentityForLogin({
    providerSubject: "google-existing-student-subject",
    email: "existing-google-link@example.test",
    emailVerified: true,
    emailAuthoritative: false,
    displayName: "Google Existing Student",
    requestedRole: "student",
    grade: "S1",
    curriculumProfile,
    language: "en",
    theme: "dark"
  });

  assert.equal(linked.status, "account-link-required");
});

test("authenticateGoogleIdentityForLogin never auto-links an email collision without MAIS email ownership proof", async () => {
  const store = await import("./userStore");
  const curriculumProfile = curriculumProfileForTrack("HK");
  const created = await store.createStudentUser({
    name: "Existing Gmail Student",
    username: "existing.authoritative@gmail.com",
    email: "existing.authoritative@gmail.com",
    password: "ExistingPassword123!",
    grade: "S5",
    curriculumProfile,
    language: "en",
    theme: "dark"
  });
  assert.equal(created.status, "created");

  const linked = await store.authenticateGoogleIdentityForLogin({
    providerSubject: "google-authoritative-student-subject",
    email: "existing.authoritative@gmail.com",
    emailVerified: true,
    emailAuthoritative: true,
    displayName: "Authoritative Gmail Student",
    requestedRole: "student",
    grade: "S1",
    curriculumProfile,
    language: "en",
    theme: "dark"
  });

  assert.equal(linked.status, "account-link-required");
});

test("authenticateGoogleIdentityForLogin treats a legacy email-shaped username as an account collision", async () => {
  const store = await import("./userStore");
  const curriculumProfile = curriculumProfileForTrack("HK");
  const created = await store.createStudentUser({
    name: "Legacy Username Student",
    username: "legacy.username.owner@example.test",
    password: "ExistingPassword123!",
    grade: "S4",
    curriculumProfile,
    language: "en",
    theme: "dark"
  });
  assert.equal(created.status, "created");

  const result = await store.authenticateGoogleIdentityForLogin({
    providerSubject: "google-legacy-username-subject",
    email: "legacy.username.owner@example.test",
    emailVerified: true,
    displayName: "Google Legacy Username",
    requestedRole: "student",
    studentAge13OrOlder: true,
    grade: "S4",
    curriculumProfile
  });

  assert.equal(result.status, "account-link-required");
});

test("authenticateGoogleIdentityForLogin never auto-links privileged or guardian accounts by email", async () => {
  const store = await import("./userStore");
  const curriculumProfile = curriculumProfileForTrack("HK");
  const teacher = await store.createTeacherUser({
    name: "Existing Teacher",
    username: "existing.teacher@gmail.com",
    email: "existing.teacher@gmail.com",
    password: "ExistingPassword123!",
    grade: "S5",
    curriculumProfile,
    language: "en",
    theme: "dark"
  });
  const parent = await store.createParentUser({
    name: "Existing Parent",
    email: "existing.parent@gmail.com",
    password: "ExistingPassword123!",
    language: "en",
    theme: "dark"
  });
  assert.equal(teacher.status, "created");
  assert.equal(parent.status, "created");

  for (const [providerSubject, email, requestedRole] of [
    ["google-existing-teacher-subject", "existing.teacher@gmail.com", "teacher"],
    ["google-existing-parent-subject", "existing.parent@gmail.com", "parent"]
  ] as const) {
    const result = await store.authenticateGoogleIdentityForLogin({
      providerSubject,
      email,
      emailVerified: true,
      emailAuthoritative: true,
      displayName: "Existing Account",
      requestedRole,
      grade: "S1",
      curriculumProfile,
      language: "en",
      theme: "dark"
    });
    assert.equal(result.status, "account-link-required");
  }
});

test("authenticateGoogleIdentityForLogin explicitly links matching authenticated teacher and parent accounts", async () => {
  const store = await import("./userStore");
  const curriculumProfile = curriculumProfileForTrack("HK");
  const teacher = await store.createTeacherUser({
    name: "Explicit Link Teacher",
    username: "explicit.link.teacher@example.test",
    email: "explicit.link.teacher@example.test",
    password: "ExistingPassword123!",
    grade: "S5",
    curriculumProfile,
    language: "en",
    theme: "dark"
  });
  const parent = await store.createParentUser({
    name: "Explicit Link Parent",
    email: "explicit.link.parent@example.test",
    password: "ExistingPassword123!",
    language: "en",
    theme: "dark"
  });
  assert.equal(teacher.status, "created");
  assert.equal(parent.status, "created");
  if (teacher.status !== "created" || parent.status !== "created") {
    throw new Error("Expected password accounts for explicit Google linking.");
  }

  for (const item of [
    {
      account: teacher,
      providerSubject: "google-explicit-teacher-subject",
      email: "explicit.link.teacher@example.test",
      requestedRole: "teacher" as const
    },
    {
      account: parent,
      providerSubject: "google-explicit-parent-subject",
      email: "explicit.link.parent@example.test",
      requestedRole: "parent" as const
    }
  ]) {
    const linked = await store.authenticateGoogleIdentityForLogin({
      providerSubject: item.providerSubject,
      email: item.email,
      emailVerified: true,
      emailAuthoritative: false,
      authenticatedUserId: item.account.session.user.id,
      displayName: "Google Profile Name Must Not Replace MAIS Profile",
      requestedRole: item.requestedRole,
      grade: "S1",
      curriculumProfile,
      language: "zh",
      theme: "light"
    });

    assert.equal(linked.status, "linked");
    if (linked.status !== "linked") throw new Error("Expected explicit Google account link.");
    assert.equal(linked.session.user.id, item.account.session.user.id);
    assert.equal(linked.session.user.role, item.account.session.user.role);
    assert.equal(linked.session.user.name, item.account.session.user.name);

    const subsequentGoogleLogin = await store.authenticateGoogleIdentityForLogin({
      providerSubject: item.providerSubject,
      email: item.email,
      emailVerified: true,
      emailAuthoritative: false,
      requestedRole: "student",
      grade: "S1",
      curriculumProfile
    });
    assert.equal(subsequentGoogleLogin.status, "authenticated");
    if (subsequentGoogleLogin.status !== "authenticated") {
      throw new Error("Expected the explicitly linked identity to support later Google login.");
    }
    assert.equal(subsequentGoogleLogin.session.user.id, item.account.session.user.id);
    assert.equal(subsequentGoogleLogin.session.user.role, item.account.session.user.role);
  }
});

test("authenticateGoogleIdentityForLogin explicitly links a matching non-authoritative student account", async () => {
  const store = await import("./userStore");
  const curriculumProfile = curriculumProfileForTrack("HK");
  const student = await store.createStudentUser({
    name: "Explicit Link Student",
    username: "explicit.link.student@example.test",
    email: "explicit.link.student@example.test",
    password: "ExistingPassword123!",
    grade: "S5",
    curriculumProfile,
    language: "en",
    theme: "dark"
  });
  assert.equal(student.status, "created");
  if (student.status !== "created") throw new Error("Expected an existing student account.");

  const linked = await store.authenticateGoogleIdentityForLogin({
    providerSubject: "google-explicit-student-subject",
    email: "explicit.link.student@example.test",
    emailVerified: true,
    emailAuthoritative: false,
    authenticatedUserId: student.session.user.id,
    displayName: "Different Google Name",
    requestedRole: "student",
    studentAge13OrOlder: true,
    grade: "S1",
    curriculumProfile,
    language: "zh",
    theme: "light"
  });

  assert.equal(linked.status, "linked");
  if (linked.status !== "linked") throw new Error("Expected an explicit non-authoritative student link.");
  assert.equal(linked.session.user.id, student.session.user.id);
  assert.equal(linked.session.user.name, "Explicit Link Student");
  assert.equal(linked.session.user.grade, "S5");
});

test("authenticateGoogleIdentityForLogin rejects explicit linking when the verified email differs", async () => {
  const store = await import("./userStore");
  const curriculumProfile = curriculumProfileForTrack("HK");
  const student = await store.createStudentUser({
    name: "Email Mismatch Student",
    username: "link.email.owner@example.test",
    email: "link.email.owner@example.test",
    password: "ExistingPassword123!",
    grade: "S5",
    curriculumProfile,
    language: "en",
    theme: "dark"
  });
  assert.equal(student.status, "created");
  if (student.status !== "created") throw new Error("Expected an existing student account.");

  const rejected = await store.authenticateGoogleIdentityForLogin({
    providerSubject: "google-email-mismatch-subject",
    email: "different.google.email@example.test",
    emailVerified: true,
    emailAuthoritative: true,
    authenticatedUserId: student.session.user.id,
    displayName: "Different Google User",
    requestedRole: "student",
    grade: "S1",
    curriculumProfile
  });

  assert.equal(rejected.status, "account-link-email-mismatch");
});

test("authenticateGoogleIdentityForLogin never switches or rebinds a subject owned by another MAIS user", async () => {
  const store = await import("./userStore");
  const curriculumProfile = curriculumProfileForTrack("HK");
  const originalOwner = await store.createStudentUser({
    name: "Original Google Owner",
    username: "original.google.owner@gmail.com",
    email: "original.google.owner@gmail.com",
    password: "ExistingPassword123!",
    grade: "S4",
    curriculumProfile,
    language: "en",
    theme: "dark"
  });
  const otherUser = await store.createStudentUser({
    name: "Other MAIS User",
    username: "other.mais.user@gmail.com",
    email: "other.mais.user@gmail.com",
    password: "ExistingPassword123!",
    grade: "S5",
    curriculumProfile,
    language: "en",
    theme: "dark"
  });
  assert.equal(originalOwner.status, "created");
  assert.equal(otherUser.status, "created");
  if (originalOwner.status !== "created" || otherUser.status !== "created") {
    throw new Error("Expected two distinct MAIS users.");
  }

  const originalLink = await store.authenticateGoogleIdentityForLogin({
    providerSubject: "google-owned-subject",
    email: "original.google.owner@gmail.com",
    emailVerified: true,
    emailAuthoritative: true,
    authenticatedUserId: originalOwner.session.user.id,
    requestedRole: "student",
    studentAge13OrOlder: true,
    grade: "S1",
    curriculumProfile
  });
  assert.equal(originalLink.status, "linked");

  const conflict = await store.authenticateGoogleIdentityForLogin({
    providerSubject: "google-owned-subject",
    email: "other.mais.user@gmail.com",
    emailVerified: true,
    emailAuthoritative: true,
    authenticatedUserId: otherUser.session.user.id,
    requestedRole: "student",
    grade: "S1",
    curriculumProfile
  });
  assert.equal(conflict.status, "account-link-conflict");

  const subsequentOwnerLogin = await store.authenticateGoogleIdentityForLogin({
    providerSubject: "google-owned-subject",
    email: "original.google.owner@gmail.com",
    emailVerified: true,
    emailAuthoritative: true,
    requestedRole: "student",
    studentAge13OrOlder: true,
    grade: "S1",
    curriculumProfile
  });
  assert.equal(subsequentOwnerLogin.status, "authenticated");
  if (subsequentOwnerLogin.status !== "authenticated") throw new Error("Expected original subject owner login.");
  assert.equal(subsequentOwnerLogin.session.user.id, originalOwner.session.user.id);
  assert.notEqual(subsequentOwnerLogin.session.user.id, otherUser.session.user.id);
});

test("authenticateGoogleIdentityForLogin blocks uninvited teacher self-creation", async () => {
  const store = await import("./userStore");

  const blocked = await store.authenticateGoogleIdentityForLogin({
    providerSubject: "google-teacher-subject",
    email: "teacher.selfservice@example.test",
    emailVerified: true,
    displayName: "Teacher Self Service",
    requestedRole: "teacher",
    language: "en",
    theme: "dark"
  });

  assert.equal(blocked.status, "teacher-invite-required");
});

test("authenticateGoogleIdentityForLogin requires a password account before linking a new parent identity", async () => {
  const store = await import("./userStore");
  const first = await store.authenticateGoogleIdentityForLogin({
    providerSubject: "google-parent-subject",
    email: "google.parent@example.test",
    emailVerified: true,
    displayName: "Google Parent",
    requestedRole: "parent",
    language: "zh",
    theme: "light"
  });

  assert.equal(first.status, "account-link-required");
});

test("authenticateGoogleIdentityForLogin rejects unsupported new-student curriculum and grade combinations", async () => {
  const store = await import("./userStore");
  const invalidSetups = [
    {
      providerSubject: "google-invalid-hk-kindergarten",
      email: "invalid.hk.kindergarten@example.test",
      grade: "K" as const,
      curriculumProfile: curriculumProfileForTrack("HK")
    },
    {
      providerSubject: "google-hidden-north-carolina",
      email: "hidden.north.carolina@example.test",
      grade: "P5" as const,
      curriculumProfile: curriculumProfileForTrack("US_NC_MATH")
    }
  ];

  for (const setup of invalidSetups) {
    const result = await store.authenticateGoogleIdentityForLogin({
      ...setup,
      emailVerified: true,
      displayName: "Invalid New Student",
      requestedRole: "student",
      studentAge13OrOlder: true,
      language: "en",
      theme: "dark"
    });
    assert.equal(result.status, "invalid", setup.providerSubject);
  }
});

test("authenticateGoogleIdentityForLogin rejects unverified Google emails", async () => {
  const store = await import("./userStore");

  const rejected = await store.authenticateGoogleIdentityForLogin({
    providerSubject: "google-unverified-subject",
    email: "unverified@example.test",
    emailVerified: false,
    displayName: "Unverified User",
    requestedRole: "student",
    grade: "S4",
    curriculumProfile: curriculumProfileForTrack("HK"),
    language: "en",
    theme: "dark"
  });

  assert.equal(rejected.status, "invalid");
});
