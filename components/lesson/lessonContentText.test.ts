import assert from "node:assert/strict";
import test from "node:test";
import {
  californiaCourseTitleForGrade,
  cleanLessonConceptContent,
  cleanLessonDisplayTitle,
  cleanLessonUnitTitle,
  cleanLessonVisualizationContent,
  compactLessonVisualizationMenuTitle,
  splitLessonContentForAnswerReveal,
  splitLessonVisualizationTitle
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

test("removes California knowledge-point codes and grade labels from lesson titles", () => {
  assert.equal(
    cleanLessonDisplayTitle("1-A.1 Grade 1 Operations and Algebraic Thinking: Add Subtract"),
    "Operations and Algebraic Thinking: Add Subtract"
  );

  assert.equal(
    cleanLessonDisplayTitle("A.1 Grade 1 Operations and Algebraic Thinking: Add Subtract"),
    "Operations and Algebraic Thinking: Add Subtract"
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

test("removes generated California visualization safeguard prefaces from lesson panels", () => {
  assert.equal(
    cleanLessonVisualizationContent(
      "Use the number line lab to manipulate this knowledge point before checkpoint practice. The lab is aligned to CA.CCSS.Math.1.OA (1.OA.1, 1.OA.2, 1.OA.3, 1.OA.4...), carries a Safeguard Review record, and shows its Read me first note before students interact with the model."
    ),
    ""
  );

  // The signature-bench variant of the block copy (Phase 1, 2026-08-25) is
  // hidden the same way.
  assert.equal(
    cleanLessonVisualizationContent(
      "Use the Hundred Chart interactive bench to manipulate this knowledge point before checkpoint practice. The bench is aligned to CA.CCSS.Math.1.NBT (1.NBT.1, 1.NBT.2, 1.NBT.3, 1.NBT.4...), carries a Safeguard Review record, and shows its Read me first note before students interact with the model."
    ),
    ""
  );
});

test("keeps regular lesson visualization descriptions", () => {
  assert.equal(
    cleanLessonVisualizationContent("Move the sliders to compare the graph, table, and story."),
    "Move the sliders to compare the graph, table, and story."
  );
});

test("splits California visualization titles after the grade segment", () => {
  assert.deepEqual(
    splitLessonVisualizationTitle("Visualization Lab: 1-A.1 Grade 1 Operations and Algebraic Thinking: Add Subtract"),
    [
      "Visualization Lab: 1-A.1 Grade 1",
      "Operations and Algebraic Thinking: Add Subtract"
    ]
  );
});

test("splits Kindergarten visualization titles before the domain title", () => {
  assert.deepEqual(
    splitLessonVisualizationTitle("Visualization Lab: K-A.1 Kindergarten Counting and Cardinality: Count Sequence"),
    [
      "Visualization Lab: K-A.1 Kindergarten",
      "Counting and Cardinality: Count Sequence"
    ]
  );
});

test("keeps non-California visualization titles on one line", () => {
  assert.deepEqual(
    splitLessonVisualizationTitle("Visualization Lab: Coordinate Plane Explorer"),
    ["Visualization Lab: Coordinate Plane Explorer"]
  );
});

test("compacts California visualization menu titles to the lab code", () => {
  assert.equal(
    compactLessonVisualizationMenuTitle("Visualization Lab: 1-A.1 Grade 1 Operations and Algebraic Thinking: Add Subtract"),
    "Visualization Lab: 1-A.1"
  );
});

test("compacts Kindergarten visualization menu titles to the lab code", () => {
  assert.equal(
    compactLessonVisualizationMenuTitle("Visualization Lab: K-A.1 Kindergarten Counting and Cardinality: Count Sequence"),
    "Visualization Lab: K-A.1"
  );
});

test("keeps non-California visualization menu titles unchanged", () => {
  assert.equal(
    compactLessonVisualizationMenuTitle("Visualization Lab: Coordinate Plane Explorer"),
    "Visualization Lab: Coordinate Plane Explorer"
  );
});

test("splits inline answer markers into answer reveal segments", () => {
  assert.deepEqual(
    splitLessonContentForAnswerReveal("Try 8 + 3. Answer: 11. Reasoning: 8 + 3 = 11."),
    [
      {
        answerText: "Answer: 11. Reasoning: 8 + 3 = 11.",
        id: "line-0",
        kind: "answer",
        promptText: "Try 8 + 3."
      }
    ]
  );
});

test("turns standalone answer lines into answer reveal segments by default", () => {
  assert.deepEqual(
    splitLessonContentForAnswerReveal("Try 8 + 3.\n\nAnswer: 11."),
    [
      {
        answerText: "Answer: 11.",
        id: "line-0",
        kind: "answer",
        promptText: "Try 8 + 3."
      }
    ]
  );
});

test("turns the Grade 1 sticker prompt and standalone answer into one reveal card", () => {
  assert.deepEqual(
    splitLessonContentForAnswerReveal(
      "Lena has 7 stickers and gets 4 more. How many stickers does Lena have now?\n\nAnswer: 11.\n\nReasoning: 7 + 4 = 11, so Lena has 11 stickers."
    ),
    [
      {
        answerText: "Answer: 11.\n\nReasoning: 7 + 4 = 11, so Lena has 11 stickers.",
        id: "line-0",
        kind: "answer",
        promptText: "Lena has 7 stickers and gets 4 more. How many stickers does Lena have now?"
      }
    ]
  );
});
