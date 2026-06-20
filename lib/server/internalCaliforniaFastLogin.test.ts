import assert from "node:assert/strict";
import test from "node:test";
import { authenticateInternalCaliforniaFastLogin } from "./internalCaliforniaFastLogin";

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

test("internal California demo accounts authenticate without hot auth tables", async () => {
  const previousStorageProvider = process.env.HK_MATH_STORAGE_PROVIDER;
  const previousHotAuth = process.env.HK_MATH_POSTGRES_HOT_AUTH_TABLES;

  try {
    delete process.env.HK_MATH_STORAGE_PROVIDER;
    delete process.env.HK_MATH_POSTGRES_HOT_AUTH_TABLES;

    const result = await authenticateInternalCaliforniaFastLogin({
      username: "Student Jon",
      password: "12345",
      grade: "P1",
      language: "en",
      theme: "light"
    });

    assert.equal(result?.status, "authenticated");
    if (result?.status === "authenticated") {
      assert.equal(result.session.user.id, "student-jon-us-ca-super");
      assert.equal(result.session.user.username, "Student Jon");
      assert.equal(result.session.user.role, "student");
      assert.equal(result.session.user.grade, "P1");
      assert.equal(result.session.user.curriculumTrack, "US_CA_MATH");
      assert.equal(result.session.settings.selectedGrade, "P1");
      assert.equal(result.session.settings.language, "en");
      assert.equal(result.session.settings.theme, "light");
      assert.equal(result.session.lessonEntryTarget, null);
    }
  } finally {
    restoreEnv("HK_MATH_STORAGE_PROVIDER", previousStorageProvider);
    restoreEnv("HK_MATH_POSTGRES_HOT_AUTH_TABLES", previousHotAuth);
  }
});

test("public example accounts authenticate through the storage-free fast path", async () => {
  const cases = [
    {
      username: "Student Shirleen",
      curriculumTrack: "US_CA_MATH",
      curriculumProfile: { region: "US", publisher: "US_CA_MATH" },
      grade: "P1",
      expectedId: "student-shirleen-us",
      expectedRole: "student",
      expectedPublisher: "US_CA_MATH"
    },
    {
      username: "Teacher Scott",
      curriculumTrack: "US_CA_MATH",
      curriculumProfile: { region: "US", publisher: "US_CA_MATH" },
      grade: "P1",
      expectedId: "teacher-scott-us",
      expectedRole: "teacher",
      expectedPublisher: "US_CA_MATH"
    },
    {
      username: "Student Peter",
      curriculumTrack: "MAINLAND_PEP_HIGH",
      curriculumProfile: { region: "MAINLAND", publisher: "MAINLAND_PEP" },
      grade: "S4",
      expectedId: "student-li-mainland",
      expectedRole: "student",
      expectedPublisher: "MAINLAND_PEP"
    },
    {
      username: "Teacher Phoebe",
      curriculumTrack: "MAINLAND_PEP_HIGH",
      curriculumProfile: { region: "MAINLAND", publisher: "MAINLAND_PEP" },
      grade: "S4",
      expectedId: "teacher-mainland-phoebe",
      expectedRole: "teacher",
      expectedPublisher: "MAINLAND_PEP"
    },
    {
      username: "HK Student Peter",
      curriculumTrack: "HK",
      curriculumProfile: { region: "HK", publisher: "HK_UNITED_PRIME_MIA" },
      grade: "S4",
      expectedId: "student-peter",
      expectedRole: "student",
      expectedPublisher: "HK_UNITED_PRIME_MIA"
    },
    {
      username: "HK Teacher Chan",
      curriculumTrack: "HK",
      curriculumProfile: { region: "HK", publisher: "HK_UNITED_PRIME_MIA" },
      grade: "S4",
      expectedId: "teacher-ms-chan",
      expectedRole: "teacher",
      expectedPublisher: "HK_UNITED_PRIME_MIA"
    }
  ] as const;

  for (const example of cases) {
    const result = await authenticateInternalCaliforniaFastLogin({
      username: example.username,
      password: "12345",
      grade: example.grade,
      curriculumTrack: example.curriculumTrack,
      curriculumProfile: example.curriculumProfile,
      language: "en",
      theme: "dark"
    });

    assert.equal(result?.status, "authenticated", example.username);
    if (result?.status === "authenticated") {
      assert.equal(result.session.user.id, example.expectedId);
      assert.equal(result.session.user.role, example.expectedRole);
      assert.equal(result.session.user.curriculumProfile.publisher, example.expectedPublisher);
      assert.equal(result.session.settings.selectedGrade, example.grade);
      assert.equal(result.session.lessonEntryTarget, null);
    }
  }
});

test("internal California demo accounts still reject incorrect passwords before storage", async () => {
  const result = await authenticateInternalCaliforniaFastLogin({
    username: "Student Jon",
    password: "wrong-password",
    grade: "P1"
  });

  assert.equal(result?.status, "invalid");
});
