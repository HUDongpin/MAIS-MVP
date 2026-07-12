import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { teacherReportPreviewToCsv, teacherReportPreviewToPdf } from "@/lib/server/userStore/teacherOpsReportExport";
import { teacherReportPreviewToPdf as legacyTeacherReportPreviewToPdf } from "@/lib/server/userStore";
import type { TeacherReportPreview } from "@/types";

function previewFixture(): TeacherReportPreview {
  return {
    id: "preview-1",
    type: "class",
    language: "en",
    title: "Weekly \"Growth\" Report",
    subtitle: "S3 Algebra",
    generatedAt: "2026-06-20T10:00:00.000Z",
    subjectName: "Class 3A",
    className: "3A",
    metrics: {
      learningMinutes: 120,
      masteryChange: 8,
      averageMastery: 76,
      accuracy: 82,
      completionRate: null
    },
    strengths: ["Linear equations", "Graph reading"],
    weaknesses: ["Factorisation"],
    mistakeTypes: ["Sign errors"],
    suggestedPractice: ["Complete 5 targeted items"],
    teacherRemarks: "Use \"think aloud\" prompts."
  };
}

test("teacher ops report export renders escaped CSV without legacy userStore imports", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsReportExport.ts"), "utf8");
  assert.doesNotMatch(source, /from ["']\.\.\/userStore["']/);
  assert.doesNotMatch(source, /from ["']@\/lib\/server\/userStore["']/);

  assert.equal(teacherReportPreviewToCsv(previewFixture()), [
    "\"Field\",\"Value\"",
    "\"Title\",\"Weekly \"\"Growth\"\" Report\"",
    "\"Subtitle\",\"S3 Algebra\"",
    "\"Generated at\",\"2026-06-20T10:00:00.000Z\"",
    "\"Subject\",\"Class 3A\"",
    "\"Class\",\"3A\"",
    "\"Learning minutes\",\"120\"",
    "\"Mastery change\",\"8\"",
    "\"Average mastery\",\"76\"",
    "\"Accuracy\",\"82\"",
    "\"Completion rate\",\"\"",
    "\"Strengths\",\"Linear equations; Graph reading\"",
    "\"Weaknesses\",\"Factorisation\"",
    "\"Mistake types\",\"Sign errors\"",
    "\"Suggested practice\",\"Complete 5 targeted items\"",
    "\"Teacher remarks\",\"Use \"\"think aloud\"\" prompts.\""
  ].join("\n"));
});

test("teacher ops report export renders a portable PDF without legacy userStore imports", () => {
  const pdf = teacherReportPreviewToPdf(previewFixture());
  const legacyPdf = legacyTeacherReportPreviewToPdf(previewFixture());
  const source = pdf.toString("utf8");

  assert.equal(pdf.subarray(0, 8).toString("utf8"), "%PDF-1.4");
  assert.match(source, /\/BaseFont \/Helvetica/);
  assert.match(source, /\(Weekly "Growth" Report\) Tj/);
  assert.match(source, /\(Teacher remarks:\) Tj/);
  assert.match(source, /xref\n0 6\n/);
  assert.deepEqual(legacyPdf, pdf);
});
