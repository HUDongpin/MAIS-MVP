import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = readFileSync(join(process.cwd(), "components/providers/AppProviders.tsx"), "utf8");

test("student first-paint routes suppress global provider warmups", () => {
  const routePredicate = source.indexOf("function isFirstPaintSensitiveStudentPath");
  const skipFlag = source.indexOf("const skipGlobalStudentWarmups");

  assert.notEqual(routePredicate, -1, "Provider should define a first-paint route predicate.");
  assert.notEqual(skipFlag, -1, "Provider should compute a student-only warmup skip flag.");
  assert.ok(source.includes('pathname === "/personalized-learning"'));
  assert.ok(source.includes('pathname === "/practice"'));
  assert.ok(source.includes('pathname === "/student/assignments"'));
});

test("mistakes and lesson-entry warmups are skipped on first-paint routes", () => {
  const mistakesWarmupEffect = source.indexOf("useEffect(() => {\n    if (!settingsReady || skipGlobalStudentWarmups) return;");
  const mistakesEffectEnd = source.indexOf("  }, [refreshMistakeRecords, settingsReady, skipGlobalStudentWarmups]);", mistakesWarmupEffect);
  const lessonEntryGuard = source.indexOf("skipGlobalStudentWarmups ||", source.indexOf("currentUser?.role !== \"student\""));
  const lessonEntryEffect = source.indexOf("void refreshLessonEntryTarget(selectedGrade);", lessonEntryGuard);

  assert.notEqual(mistakesWarmupEffect, -1, "Provider should skip initial mistake-record warmup on first-paint routes.");
  assert.notEqual(mistakesEffectEnd, -1, "Mistake-record warmup effect should depend on the skip flag.");
  assert.notEqual(lessonEntryGuard, -1, "Lesson-entry warmup should include the skip flag in its guard.");
  assert.notEqual(lessonEntryEffect, -1, "Provider should still warm lesson-entry targets outside skipped routes.");
  assert.ok(lessonEntryGuard < lessonEntryEffect, "Lesson-entry skip guard should run before the warmup call.");
});
