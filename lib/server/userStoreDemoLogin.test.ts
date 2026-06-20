import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

test("public examples and internal California accounts seed without the demo seed env flag", async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousDemoFlag = process.env.HK_MATH_ENABLE_DEMO_USER;
  const previousDbDir = process.env.HK_MATH_DB_DIR;
  const previousStorageProvider = process.env.HK_MATH_STORAGE_PROVIDER;
  const dbDir = await mkdtemp(path.join(tmpdir(), "mais-demo-login-"));

  try {
    Object.assign(process.env, { NODE_ENV: "production" });
    process.env.HK_MATH_ENABLE_DEMO_USER = "false";
    delete process.env.HK_MATH_STORAGE_PROVIDER;
    process.env.HK_MATH_DB_DIR = dbDir;

    const {
      authenticateFlexibleExampleAccountForLogin,
      authenticateUserForLogin,
      completeStudentCurriculumTrackSelection,
      getTeacherClasses,
      updateUserSettings
    } = await import("./userStore");

    const result = await authenticateFlexibleExampleAccountForLogin({
      username: "Student Peter",
      password: "12345",
      curriculumProfile: { region: "MAINLAND", publisher: "MAINLAND_PEP" },
      selectedGrade: "S4",
      language: "en",
      theme: "light"
    });

    assert.equal(result.status, "authenticated");
    if (result.status === "authenticated") {
      assert.equal(result.session.user.id, "student-li-mainland");
      assert.equal(result.session.user.username, "Student Peter");
      assert.equal(result.session.user.curriculumProfile.publisher, "MAINLAND_PEP");
      assert.equal(result.session.settings.selectedGrade, "S4");
    }

    const internalStudent = await authenticateUserForLogin("Student Jon", "12345");
    assert.equal(internalStudent.status, "authenticated");
    if (internalStudent.status === "authenticated") {
      assert.equal(internalStudent.session.user.id, "student-jon-us-ca-super");
      assert.equal(internalStudent.session.user.role, "student");
      assert.equal(internalStudent.session.user.curriculumProfile.publisher, "US_CA_MATH");
      assert.equal(internalStudent.session.user.grade, "P1");
      assert.equal(internalStudent.session.settings.selectedGrade, "P1");
    }

    const internalStudentHongKongAttempt = await completeStudentCurriculumTrackSelection({
      username: "Student Jon",
      password: "12345",
      curriculumProfile: { region: "HK", publisher: "HK_UNITED_PRIME_MIA" },
      selectedGrade: "S6",
      language: "en",
      theme: "dark"
    });
    assert.equal(internalStudentHongKongAttempt.status, "authenticated");
    if (internalStudentHongKongAttempt.status === "authenticated") {
      assert.equal(internalStudentHongKongAttempt.session.user.curriculumProfile.publisher, "US_CA_MATH");
      assert.equal(internalStudentHongKongAttempt.session.settings.selectedGrade, "S6");
    }
    const internalStudentRelogin = await authenticateUserForLogin("Student Jon", "12345");
    assert.equal(internalStudentRelogin.status, "authenticated");
    if (internalStudentRelogin.status === "authenticated") {
      assert.equal(internalStudentRelogin.session.user.curriculumProfile.publisher, "US_CA_MATH");
      assert.equal(internalStudentRelogin.session.settings.selectedGrade, "S6");
    }

    const internalTeacher = await authenticateUserForLogin("Teacher Rhi", "12345");
    assert.equal(internalTeacher.status, "authenticated");
    if (internalTeacher.status === "authenticated") {
      assert.equal(internalTeacher.session.user.id, "teacher-rhi-us-ca-super");
      assert.equal(internalTeacher.session.user.role, "teacher");
      assert.equal(internalTeacher.session.user.curriculumProfile.publisher, "US_CA_MATH");
      assert.equal(internalTeacher.session.user.grade, "P1");
      assert.equal(internalTeacher.session.settings.selectedGrade, "P1");

      const updatedTeacher = await updateUserSettings(internalTeacher.session.user.id, { selectedGrade: "S6" });
      assert.equal(updatedTeacher?.user.curriculumProfile.publisher, "US_CA_MATH");
      assert.equal(updatedTeacher?.settings.selectedGrade, "S6");
      const internalTeacherRelogin = await authenticateUserForLogin("Teacher Rhi", "12345");
      assert.equal(internalTeacherRelogin.status, "authenticated");
      if (internalTeacherRelogin.status === "authenticated") {
        assert.equal(internalTeacherRelogin.session.user.curriculumProfile.publisher, "US_CA_MATH");
        assert.equal(internalTeacherRelogin.session.settings.selectedGrade, "S6");
      }

      const teacherClasses = await getTeacherClasses(internalTeacher.session.user.id);
      assert.deepEqual(
        teacherClasses?.map((teacherClass) => teacherClass.grade),
        ["K", "P1", "P2", "P3", "P4", "P5", "P6", "S1", "S2", "S3", "S4", "S5", "S6"]
      );
      assert.equal(teacherClasses?.every((teacherClass) => teacherClass.curriculumProfile?.publisher === "US_CA_MATH"), true);
    }
  } finally {
    restoreEnv("NODE_ENV", previousNodeEnv);
    restoreEnv("HK_MATH_ENABLE_DEMO_USER", previousDemoFlag);
    restoreEnv("HK_MATH_DB_DIR", previousDbDir);
    restoreEnv("HK_MATH_STORAGE_PROVIDER", previousStorageProvider);
    await rm(dbDir, { recursive: true, force: true });
  }
});
