import assert from "node:assert/strict";
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
    grade: "S5",
    curriculumProfile,
    language: "zh",
    theme: "light"
  });

  assert.equal(second.status, "authenticated");
  assert.equal(second.session.user.id, first.session.user.id);
  assert.equal(second.session.user.grade, "S4");
});

test("authenticateGoogleIdentityForLogin links a verified Google identity to an existing MAIS email account", async () => {
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
    displayName: "Google Existing Student",
    requestedRole: "student",
    grade: "S1",
    curriculumProfile,
    language: "en",
    theme: "dark"
  });

  assert.equal(linked.status, "linked");
  assert.equal(linked.session.user.id, created.session.user.id);
  assert.equal(linked.session.user.grade, "S5");
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
