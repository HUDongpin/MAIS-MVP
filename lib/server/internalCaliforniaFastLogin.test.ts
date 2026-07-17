import assert from "node:assert/strict";
import test from "node:test";
import { publicLessonEntryTargetForGrade } from "@/components/lesson/lessonEntryTarget";
import {
  authenticateInternalCaliforniaFastLogin,
  getInternalFastNoClassTeacherSessionByUserId,
  getInternalFastNoClassTeacherShellByUserId
} from "./internalCaliforniaFastLogin";

const californiaProfile = { region: "US", publisher: "US_CA_MATH" } as const;

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
    const expectedLessonEntryTarget = publicLessonEntryTargetForGrade("P1", californiaProfile);
    assert.ok(expectedLessonEntryTarget);

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
      assert.deepEqual(result.session.lessonEntryTarget, expectedLessonEntryTarget);
    }
  } finally {
    restoreEnv("HK_MATH_STORAGE_PROVIDER", previousStorageProvider);
    restoreEnv("HK_MATH_POSTGRES_HOT_AUTH_TABLES", previousHotAuth);
  }
});

test("public example accounts authenticate through the storage-free fast path", async () => {
  const californiaGrade1LessonEntryTarget = publicLessonEntryTargetForGrade("P1", californiaProfile);
  const californiaKindergartenLessonEntryTarget = publicLessonEntryTargetForGrade("K", californiaProfile);
  assert.ok(californiaGrade1LessonEntryTarget);
  assert.ok(californiaKindergartenLessonEntryTarget);

  const cases = [
    {
      username: "Student Shirleen",
      curriculumTrack: "US_CA_MATH",
      curriculumProfile: californiaProfile,
      grade: "P1",
      expectedId: "student-shirleen-us",
      expectedRole: "student",
      expectedPublisher: "US_CA_MATH",
      expectedLessonEntryTarget: californiaGrade1LessonEntryTarget
    },
    {
      username: "Teacher Scott",
      curriculumTrack: "US_CA_MATH",
      curriculumProfile: californiaProfile,
      grade: "P1",
      expectedId: "teacher-scott-us",
      expectedRole: "teacher",
      expectedPublisher: "US_CA_MATH",
      expectedLessonEntryTarget: null
    },
    {
      username: "Student Jon",
      curriculumTrack: "US_CA_MATH",
      curriculumProfile: californiaProfile,
      grade: "K",
      expectedId: "student-jon-us-ca-super",
      expectedRole: "student",
      expectedPublisher: "US_CA_MATH",
      expectedLessonEntryTarget: californiaKindergartenLessonEntryTarget
    },
    {
      username: "Teacher Rhi",
      curriculumTrack: "US_CA_MATH",
      curriculumProfile: californiaProfile,
      grade: "K",
      expectedId: "teacher-rhi-us-ca-super",
      expectedRole: "teacher",
      expectedPublisher: "US_CA_MATH",
      expectedLessonEntryTarget: null
    },
    {
      username: "Student Peter",
      curriculumTrack: "MAINLAND_PEP_HIGH",
      curriculumProfile: { region: "MAINLAND", publisher: "MAINLAND_PEP" },
      grade: "S4",
      expectedId: "student-li-mainland",
      expectedRole: "student",
      expectedPublisher: "MAINLAND_PEP",
      expectedLessonEntryTarget: null
    },
    {
      username: "Teacher Phoebe",
      curriculumTrack: "MAINLAND_PEP_HIGH",
      curriculumProfile: { region: "MAINLAND", publisher: "MAINLAND_PEP" },
      grade: "S4",
      expectedId: "teacher-mainland-phoebe",
      expectedRole: "teacher",
      expectedPublisher: "MAINLAND_PEP",
      expectedLessonEntryTarget: null
    },
    {
      username: "HK Student Peter",
      curriculumTrack: "HK",
      curriculumProfile: { region: "HK", publisher: "HK_UNITED_PRIME_MIA" },
      grade: "S4",
      expectedId: "student-peter",
      expectedRole: "student",
      expectedPublisher: "HK_UNITED_PRIME_MIA",
      expectedLessonEntryTarget: null
    },
    {
      username: "HK Teacher Chan",
      curriculumTrack: "HK",
      curriculumProfile: { region: "HK", publisher: "HK_UNITED_PRIME_MIA" },
      grade: "S4",
      expectedId: "teacher-ms-chan",
      expectedRole: "teacher",
      expectedPublisher: "HK_UNITED_PRIME_MIA",
      expectedLessonEntryTarget: null
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
      assert.deepEqual(result.session.lessonEntryTarget, example.expectedLessonEntryTarget);
    }
  }
});

test("Teacher Scott no-class shell resolves by user id before storage-backed dashboard entry", () => {
  const session = getInternalFastNoClassTeacherSessionByUserId("teacher-scott-us");
  assert.equal(session?.user.id, "teacher-scott-us");
  assert.equal(session?.user.role, "teacher");
  assert.equal(session?.settings.selectedGrade, "P1");

  const shell = getInternalFastNoClassTeacherShellByUserId("teacher-scott-us");
  assert.equal(shell?.teacher.id, "teacher-scott-us");
  assert.equal(shell?.classes.length, 0);

  assert.equal(getInternalFastNoClassTeacherShellByUserId("teacher-ms-chan"), null);
  assert.equal(getInternalFastNoClassTeacherShellByUserId("teacher-mainland-phoebe"), null);
  assert.equal(getInternalFastNoClassTeacherShellByUserId("teacher-rhi-us-ca-super"), null);
  assert.equal(getInternalFastNoClassTeacherShellByUserId("student-shirleen-us"), null);
});

test("internal California demo accounts still reject incorrect passwords before storage", async () => {
  const result = await authenticateInternalCaliforniaFastLogin({
    username: "Student Jon",
    password: "wrong-password",
    grade: "P1"
  });

  assert.equal(result?.status, "invalid");
});
