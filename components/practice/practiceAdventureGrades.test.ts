import { deepEqual, equal } from "node:assert/strict";
import { test } from "node:test";
import { partitionPracticeAdventureGradeChips, resolvePracticeAdventureGradeLock } from "./practiceAdventureGrades";

test("partitions adventure grade chips into primary and secondary groups without changing chip order", () => {
  const gradeChips = [
    { id: "K", label: "K" },
    { id: "P1", label: "P1" },
    { id: "P6", label: "P6" },
    { id: "S1", label: "S1" },
    { id: "S6", label: "S6" }
  ] as const;

  const groups = partitionPracticeAdventureGradeChips(gradeChips);

  deepEqual(groups.primary.map((grade) => grade.id), ["K", "P1", "P6"]);
  deepEqual(groups.secondary.map((grade) => grade.id), ["S1", "S6"]);
});

test("keeps every adventure grade chip in exactly one visible group", () => {
  const gradeChips = [
    { id: "K", label: "K" },
    { id: "P1", label: "P1" },
    { id: "P2", label: "P2" },
    { id: "P3", label: "P3" },
    { id: "P4", label: "P4" },
    { id: "P5", label: "P5" },
    { id: "P6", label: "P6" },
    { id: "S1", label: "S1" },
    { id: "S2", label: "S2" },
    { id: "S3", label: "S3" },
    { id: "S4", label: "S4" },
    { id: "S5", label: "S5" },
    { id: "S6", label: "S6" }
  ] as const;

  const groups = partitionPracticeAdventureGradeChips(gradeChips);
  const groupedIds = [...groups.primary, ...groups.secondary].map((grade) => grade.id);

  deepEqual(groupedIds, gradeChips.map((grade) => grade.id));
  equal(new Set(groupedIds).size, gradeChips.length);
});

test("locks adventure grade selection to the logged-in student's profile grade", () => {
  const lock = resolvePracticeAdventureGradeLock({
    gradeFilter: "P1",
    selectedGrade: "P1",
    studentGrade: "S4"
  });

  equal(lock.activeGradeFilter, "S4");
  equal(lock.activeGradeId, "S4");
  equal(lock.gradeSelectionDisabled, true);
});

test("keeps Student Jon's selected California grade editable when his K-12 override is enabled", () => {
  const lock = resolvePracticeAdventureGradeLock({
    gradeFilter: "S6",
    selectedGrade: "S6",
    studentGrade: "P1",
    allowStudentGradeSelection: true
  });

  equal(lock.activeGradeFilter, "S6");
  equal(lock.activeGradeId, "S6");
  equal(lock.gradeSelectionDisabled, false);
});

test("keeps guest adventure grade selection editable", () => {
  const lock = resolvePracticeAdventureGradeLock({
    gradeFilter: "all",
    selectedGrade: "P2",
    studentGrade: null
  });

  equal(lock.activeGradeFilter, "all");
  equal(lock.activeGradeId, "P2");
  equal(lock.gradeSelectionDisabled, false);
});
