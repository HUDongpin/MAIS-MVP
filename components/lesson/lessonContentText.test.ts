import assert from "node:assert/strict";
import test from "node:test";
import {
  californiaCourseTitleForGrade,
  cleanLessonConceptContent,
  cleanLessonDisplayTitle,
  cleanLessonUnitTitle
} from "./lessonContentText";

test("removes leading California grade label without deleting the concept sentence", () => {
  const content = "California Grade 1: Counting On and Back develops Operations and Algebraic Thinking.";
  const description = "Counting On and Back develops Operations and Algebraic Thinking.";

  assert.equal(
    cleanLessonConceptContent(content, description),
    "Counting On and Back develops Operations and Algebraic Thinking."
  );
});

test("removes California grade labels across grade numbers and keeps later California metadata", () => {
  const content = "  California Grade 12: Model transformations. This California beta lesson uses standards identifiers only as metadata.";

  assert.equal(
    cleanLessonConceptContent(content, ""),
    "Model transformations. This California beta lesson uses standards identifiers only as metadata."
  );
});

test("keeps the existing duplicate description cleanup for non-California lessons", () => {
  assert.equal(
    cleanLessonConceptContent("Equivalent fractions compare equal parts with the same value. Use number lines.", "Equivalent fractions compare equal parts with the same value."),
    "Use number lines."
  );
});

test("removes the California grade label from generated lesson titles", () => {
  assert.equal(
    cleanLessonDisplayTitle("California Grade 1: Counting On and Back Lesson Module"),
    "Counting On and Back Lesson Module"
  );
});

test("uses compact California unit names without grade labels or generic lesson suffixes", () => {
  assert.equal(
    cleanLessonUnitTitle("California Grade 1: Counting On and Back Lesson Module"),
    "Counting On and Back"
  );
});

test("removes the California Kindergarten label from compact unit names", () => {
  assert.equal(
    cleanLessonUnitTitle("California Kindergarten: Counting Collections Lesson Module"),
    "Counting Collections"
  );
});

test("preserves meaningful colons inside compact unit names", () => {
  assert.equal(
    cleanLessonUnitTitle("California Grade 6: Geometry: Area, Surface Area, and Volume Lesson Module"),
    "Geometry: Area, Surface Area, and Volume"
  );
});

test("provides student-friendly California course names for every grade", () => {
  const californiaGrades = ["K", "P1", "P2", "P3", "P4", "P5", "P6", "S1", "S2", "S3", "S4", "S5", "S6"];

  californiaGrades.forEach((grade) => {
    const title = californiaCourseTitleForGrade(grade);
    assert.ok(title, `Missing California course title for ${grade}`);
    assert.equal(title.en.includes("Counting On and Back"), false);
  });

  assert.equal(californiaCourseTitleForGrade("K")?.en, "Kindergarten Math Explorers");
  assert.equal(californiaCourseTitleForGrade("P1")?.en, "First Grade Math Adventures");
  assert.equal(californiaCourseTitleForGrade("S6")?.en, "Precalculus and Statistics Pathways");
});
