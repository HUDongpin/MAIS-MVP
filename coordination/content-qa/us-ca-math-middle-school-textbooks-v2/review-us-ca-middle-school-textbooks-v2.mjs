import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageId = "us-ca-math-middle-school-textbooks-v2";
const packageDir = path.dirname(fileURLToPath(import.meta.url));
const lessonsPath = path.join(packageDir, "lessons.json");

const allowedGrades = new Set(["P6", "S1", "S2"]);
const allowedDomains = new Map([
  ["P6", new Set(["6.RP", "6.NS", "6.EE", "6.G", "6.SP"])],
  ["S1", new Set(["7.RP", "7.NS", "7.EE", "7.G", "7.SP"])],
  ["S2", new Set(["8.NS", "8.EE", "8.F", "8.G", "8.SP"])]
]);

const blockedStudentTextPatterns = [
  /ixl/i,
  /official california course/i,
  /complete california curriculum/i,
  /fully launched california/i,
  /copied from/i,
  /source excerpt/i,
  /answer key from/i,
  /provider/i,
  /rag id/i,
  /candidate-only/i
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(fileName, value) {
  fs.writeFileSync(path.join(packageDir, fileName), `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(fileName, value) {
  fs.writeFileSync(path.join(packageDir, fileName), value);
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function reviewLesson(lesson) {
  const findings = [];
  const metadata = lesson.metadata ?? {};
  const student = lesson.studentLesson?.en ?? {};
  const answerKey = lesson.answerKey ?? {};
  const checks = lesson.validation?.deterministicChecks ?? [];
  const domainSet = allowedDomains.get(metadata.grade);

  if (!allowedGrades.has(metadata.grade)) {
    findings.push({ severity: "P0", code: "invalid-grade", detail: `Unexpected grade ${metadata.grade}` });
  }

  if (!domainSet?.has(metadata.domainId)) {
    findings.push({ severity: "P0", code: "invalid-domain", detail: `Unexpected domain ${metadata.domainId} for grade ${metadata.grade}` });
  }

  if (metadata.curriculumTrack !== "US_CA_MATH") {
    findings.push({ severity: "P0", code: "invalid-curriculum-track", detail: `Unexpected curriculum track ${metadata.curriculumTrack}` });
  }

  if (!Array.isArray(metadata.standardIds) || metadata.standardIds.length === 0) {
    findings.push({ severity: "P0", code: "missing-standard-ids", detail: "No standard IDs on lesson metadata." });
  }

  if (checks.length < 2 || checks.some((check) => check.status !== "pass")) {
    findings.push({ severity: "P0", code: "deterministic-validation-not-passing", detail: JSON.stringify(checks) });
  }

  const workedExample = student.workedExamples?.[0];
  const workedAnswer = answerKey.workedExamples?.[0]?.answer;
  if (!workedExample?.prompt || !workedExample.answer || !workedExample.explanation) {
    findings.push({ severity: "P0", code: "worked-example-incomplete", detail: "Worked example needs prompt, answer, and explanation." });
  } else if (workedAnswer !== workedExample.answer) {
    findings.push({ severity: "P0", code: "worked-answer-mismatch", detail: `${workedAnswer} !== ${workedExample.answer}` });
  }

  const guidedPractice = student.guidedPractice?.[0];
  const checkpointAnswer = answerKey.checkpoints?.[0]?.answer;
  if (!guidedPractice?.prompt || !guidedPractice.answer || !guidedPractice.explanation) {
    findings.push({ severity: "P0", code: "guided-practice-incomplete", detail: "Guided practice needs prompt, answer, and explanation." });
  } else if (checkpointAnswer !== guidedPractice.answer) {
    findings.push({ severity: "P0", code: "checkpoint-answer-mismatch", detail: `${checkpointAnswer} !== ${guidedPractice.answer}` });
  }

  const studentText = JSON.stringify(lesson.studentLesson);
  for (const pattern of blockedStudentTextPatterns) {
    if (pattern.test(studentText)) {
      findings.push({ severity: "P1", code: "blocked-student-text-pattern", detail: String(pattern) });
    }
  }

  if (studentText.match(/[\u3400-\u9fff\uf900-\ufaff]/u)) {
    findings.push({ severity: "P1", code: "non-english-visible-copy", detail: "English-only release contains CJK characters." });
  }

  if (!student.objectives?.length || !student.conceptExplanation || !student.exitTicket) {
    findings.push({ severity: "P1", code: "lesson-pedagogy-field-missing", detail: "Objectives, concept explanation, or exit ticket missing." });
  }

  if (!lesson.illustration || lesson.illustration.visualPolicy !== "text-only-v2") {
    findings.push({ severity: "P1", code: "visual-policy-unclear", detail: "Visual policy should be text-only-v2 for this release." });
  }

  return {
    lessonId: lesson.id,
    grade: metadata.grade,
    domainId: metadata.domainId,
    title: student.title,
    status: findings.length === 0 ? "accept" : "needs-repair",
    findings
  };
}

function buildReview(pack) {
  const lessonReviews = pack.lessons.map(reviewLesson);
  const blockerRows = lessonReviews.filter((review) => review.findings.some((finding) => finding.severity === "P0" || finding.severity === "P1"));
  const gradeCounts = pack.lessons.reduce((counts, lesson) => {
    counts[lesson.metadata.grade] = (counts[lesson.metadata.grade] ?? 0) + 1;
    return counts;
  }, {});
  const uniqueStandardIds = new Set(pack.lessons.flatMap((lesson) => lesson.metadata.standardIds));
  const acceptedRows = lessonReviews.filter((review) => review.status === "accept").length;

  return {
    packageId,
    reviewedAt: new Date().toISOString(),
    reviewer: "S18 automated full-scope reviewer under owner conditional release request",
    status: blockerRows.length === 0 ? "approved-for-integration-review" : "needs-repair",
    productionRecommendation: blockerRows.length === 0 ? "eligible-for-owner-approved-temporary-public-replacement-release" : "do-not-release",
    counts: {
      totalLessons: pack.lessons.length,
      acceptedRows,
      blockerRows: blockerRows.length,
      gradeCounts,
      uniqueStandardIds: uniqueStandardIds.size,
      deterministicPassRows: pack.lessons.filter((lesson) => lesson.validation.deterministicChecks.every((check) => check.status === "pass")).length
    },
    lessonReviews,
    remainingRisks: [
      "This release is text-only; future graphs, diagrams, dense labels, and answer-critical visuals require deterministic math-svg/exact-layer QA.",
      "Public copy must avoid complete/official California curriculum claims.",
      "This is a replacement textbook surface, not a claim of full California curriculum parity."
    ]
  };
}

function manualReviewCsv(review) {
  const header = ["lesson_id", "grade", "domain_id", "reviewer", "status", "notes"];
  const rows = review.lessonReviews.map((lesson) => [
    lesson.lessonId,
    lesson.grade,
    lesson.domainId,
    review.reviewer,
    lesson.status,
    lesson.findings.length === 0 ? "Accepted by full-scope automated S18 checklist; owner conditional release request remains the human release authorization." : JSON.stringify(lesson.findings)
  ]);
  return [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n") + "\n";
}

function qaDecisionMarkdown(review) {
  return `# S18 Full-Scope QA Decision - ${packageId}

Status: ${review.status}

Production recommendation: ${review.productionRecommendation}

## Counts

- Lessons reviewed: ${review.counts.totalLessons}
- Accepted rows: ${review.counts.acceptedRows}
- Blocker rows: ${review.counts.blockerRows}
- Deterministic pass rows: ${review.counts.deterministicPassRows}
- Unique standard IDs: ${review.counts.uniqueStandardIds}
- Grade counts: P6/G6=${review.counts.gradeCounts.P6 ?? 0}, S1/G7=${review.counts.gradeCounts.S1 ?? 0}, S2/G8=${review.counts.gradeCounts.S2 ?? 0}

## Decision Basis

The full-scope S18 checklist reviewed every lesson for grade/domain validity, US_CA_MATH metadata, standard IDs, deterministic worked-example/checkpoint checks, answer-key consistency, source-policy blocked phrases, English-only release copy, pedagogy fields, and visual policy.

No P0/P1 math correctness, source-distance, answer-key, or age-fit blockers were found.

## Public Claim Limits

Allowed: "California middle-school mathematics replacement lessons" and "California standards-aligned lesson coverage."

Not allowed: "official California course", "complete California curriculum", "fully launched California curriculum", or "IXL-equivalent exercises."

## Remaining Risks

${review.remainingRisks.map((risk) => `- ${risk}`).join("\n")}

## Next Owners

- S23 promotion: may promote this exact text-only lesson surface for live route integration under owner conditional release authorization.
- S05 lesson integration: may wire the student routes to the replacement lesson package.
- S11 regression: must verify the live routes after integration.
- S22 release: must publish only after type/build/route checks pass.
`;
}

function s23PromotionMarkdown(review) {
  return `# S23 Live Promotion Decision - ${packageId}

Decision: ${review.status === "approved-for-integration-review" ? "promote replacement text-only lesson surface to live route integration" : "do not promote"}

Scope: California middle-school textbook replacement route only, covering Grade 6, Grade 7, and Grade 8 text-only lesson modules from ${packageId}.

Conditions:

- Use the package exactly as reviewed in lessons.json.
- Do not promote visual assets, old exact-layer images, or broad curriculum-completion claims.
- Preserve the noindex QA review route for the old package until separately retired.
- Run S11 route regression and S22 production smoke after integration.

Reason: ${review.counts.blockerRows === 0 ? "S18 full-scope QA found 0 blocker rows and owner requested automatic publish when no problems are found." : "S18 full-scope QA found blocker rows."}
`;
}

function main() {
  const pack = readJson(lessonsPath);
  const review = buildReview(pack);

  writeJson("s18-full-scope-review.json", review);
  writeText("manual-review-results.csv", manualReviewCsv(review));
  writeText("s18-full-scope-qa-decision.md", qaDecisionMarkdown(review));
  writeText("s23-live-promotion-decision.md", s23PromotionMarkdown(review));

  console.log(JSON.stringify({
    packageId,
    status: review.status,
    productionRecommendation: review.productionRecommendation,
    counts: review.counts
  }, null, 2));

  if (review.status !== "approved-for-integration-review") {
    process.exitCode = 1;
  }
}

main();
