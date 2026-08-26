import assert from "node:assert/strict";
import test from "node:test";

function validPreview() {
  return {
    id: "preview-1",
    type: "parent-summary",
    language: "en",
    title: "Weekly report",
    subtitle: "S3 Algebra",
    generatedAt: "2026-08-23T08:00:00.000Z",
    subjectName: "Ada Student",
    classId: "class-1",
    className: "S3 Algebra",
    studentId: "student-1",
    metrics: {
      learningMinutes: 90,
      masteryChange: 5,
      averageMastery: 82,
      accuracy: 88,
      completionRate: null
    },
    strengths: ["Algebra"],
    weaknesses: ["Graph reading"],
    mistakeTypes: ["Sign errors"],
    suggestedPractice: ["Review examples"],
    teacherRemarks: "Private teacher note"
  };
}

test("teacher report preview decoder returns a canonical copy and strips unknown fields", async () => {
  let decoderModule: Record<string, unknown> = {};
  try {
    decoderModule = await import("@/lib/server/userStore/teacherReportPreviewDecoder") as Record<string, unknown>;
  } catch {
    // The TDD RED intentionally reaches the assertions until the shared decoder exists.
  }

  assert.equal(typeof decoderModule.decodeTeacherReportPreview, "function");
  assert.equal(typeof decoderModule.readTeacherReportPreview, "function");
  if (
    typeof decoderModule.decodeTeacherReportPreview !== "function" ||
    typeof decoderModule.readTeacherReportPreview !== "function"
  ) return;

  const preview = {
    ...validPreview(),
    provider: "must-not-cross-boundary",
    metrics: { ...validPreview().metrics, providerMessageId: "private-provider-id" }
  };
  const decoded = decoderModule.decodeTeacherReportPreview(preview);

  assert.deepEqual(decoded, validPreview());
  assert.notEqual(decoded, preview);
  assert.notEqual((decoded as { metrics: object }).metrics, preview.metrics);
  assert.notEqual((decoded as { strengths: unknown[] }).strengths, preview.strengths);
  assert.deepEqual(
    decoderModule.readTeacherReportPreview(JSON.stringify(preview)),
    validPreview()
  );
});

test("teacher report preview decoder rejects every invalid nested boundary", async () => {
  const decoderModule = await import("@/lib/server/userStore/teacherReportPreviewDecoder");
  const pollutedEntry = { answerText: "raw minor answer", providerMessageId: "private-provider-id" };
  const invalidValues: unknown[] = [
    null,
    [],
    { ...validPreview(), type: "internal-report" },
    { ...validPreview(), language: "fr" },
    { ...validPreview(), id: 7 },
    { ...validPreview(), title: 7 },
    { ...validPreview(), subtitle: false },
    { ...validPreview(), generatedAt: null },
    { ...validPreview(), subjectName: {} },
    { ...validPreview(), teacherRemarks: undefined },
    { ...validPreview(), classId: 7 },
    { ...validPreview(), className: false },
    { ...validPreview(), studentId: null },
    { ...validPreview(), metrics: null },
    { ...validPreview(), metrics: { ...validPreview().metrics, learningMinutes: Number.NaN } },
    { ...validPreview(), metrics: { ...validPreview().metrics, masteryChange: Number.POSITIVE_INFINITY } },
    { ...validPreview(), metrics: { ...validPreview().metrics, averageMastery: "82" } },
    { ...validPreview(), metrics: { ...validPreview().metrics, accuracy: undefined } },
    { ...validPreview(), metrics: { ...validPreview().metrics, completionRate: "75" } },
    { ...validPreview(), strengths: [pollutedEntry] },
    { ...validPreview(), weaknesses: [pollutedEntry] },
    { ...validPreview(), mistakeTypes: [pollutedEntry] },
    { ...validPreview(), suggestedPractice: [pollutedEntry] }
  ];

  for (const invalidValue of invalidValues) {
    assert.equal(decoderModule.decodeTeacherReportPreview(invalidValue), undefined);
  }
  assert.equal(decoderModule.readTeacherReportPreview(), undefined);
  assert.throws(
    () => decoderModule.readTeacherReportPreview("not-json"),
    /Invalid teacher report preview/
  );
  assert.throws(
    () => decoderModule.readTeacherReportPreview(JSON.stringify({ ...validPreview(), strengths: [pollutedEntry] })),
    /Invalid teacher report preview/
  );
});
