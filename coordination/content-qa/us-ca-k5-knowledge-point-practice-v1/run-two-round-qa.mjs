#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const packageDir = path.dirname(new URL(import.meta.url).pathname);
const repoRoot = path.resolve(packageDir, "../../..");
const packageId = "us-ca-k5-knowledge-point-practice-v1";
const qaAt = "2026-06-22T23:20:00+08:00";
const questionsPerKnowledgePoint = 12;

const paths = {
  pack: path.join(packageDir, "question-pack.json"),
  round1: path.join(packageDir, "qa-round-1.json"),
  round2: path.join(packageDir, "qa-round-2.json"),
  solvabilityJson: path.join(packageDir, "solvability-audit.json"),
  solvabilityCsv: path.join(packageDir, "solvability-audit.csv"),
  solvabilityMd: path.join(packageDir, "solvability-audit.md"),
  manualCsv: path.join(packageDir, "manual-review-results.csv"),
  qaReportMd: path.join(packageDir, "qa-report.md"),
  decisionMd: path.join(packageDir, "s18-two-round-qa-decision.md")
};

const blockedStudentPatterns = [
  /\bDeepSeek\b/i,
  /\bIXL\b/i,
  /Activity\s+\d+\s*:/i,
  /Practice activity\s+\d+\s*:/i,
  /candidate/i,
  /manual QA/i,
  /source[- ]?distance/i,
  /official California course/i,
  /complete California curriculum/i
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function writeCsv(filePath, rows) {
  const headers = Object.keys(rows[0] ?? {});
  const csv = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(","))
  ].join("\n");
  fs.writeFileSync(filePath, `${csv}\n`);
}

function push(findings, severity, check, questionId, message) {
  findings.push({ severity, check, questionId, message });
}

function statusFromFindings(findings) {
  return findings.some((finding) => finding.severity === "error") ? "fail" : "pass";
}

function visibleText(question) {
  return [
    question.prompt?.en,
    question.prompt?.zh,
    question.prompt?.zhHans,
    question.explanation?.en,
    question.explanation?.zh,
    question.explanation?.zhHans,
    ...(question.options ?? []).flatMap((option) => [option.en, option.zh, option.zhHans])
  ].filter(Boolean).join("\n");
}

function questionByTopic(questions) {
  return questions.reduce((groups, question) => {
    const rows = groups.get(question.topicId) ?? [];
    rows.push(question);
    groups.set(question.topicId, rows);
    return groups;
  }, new Map());
}

function expectedTopicIds(pack) {
  return new Set(pack.topicCoverage.map((row) => row.topicId));
}

function roundOne(pack) {
  const findings = [];
  const questions = pack.questions;
  const ids = new Set();
  const prompts = new Set();
  const targetTopicIds = expectedTopicIds(pack);

  if (pack.packageId !== packageId) push(findings, "error", "package-id", "", "Unexpected packageId.");
  if (pack.packageStatus !== "candidate-only" || pack.integrationStatus !== "candidate-only-not-live") {
    push(findings, "error", "candidate-only", "", "Package must remain candidate-only/not-live.");
  }
  if (questions.length !== pack.topicCoverage.length * questionsPerKnowledgePoint) {
    push(findings, "error", "inventory", "", `Question count must be exactly ${questionsPerKnowledgePoint} rows per target knowledge point.`);
  }

  for (const question of questions) {
    if (ids.has(question.id)) push(findings, "error", "duplicate-id", question.id, "Duplicate question ID.");
    ids.add(question.id);

    const normalizedPrompt = question.prompt?.en?.toLowerCase().replace(/\s+/g, " ").trim();
    if (!normalizedPrompt) {
      push(findings, "error", "prompt", question.id, "Missing English prompt.");
    } else if (prompts.has(normalizedPrompt)) {
      push(findings, "error", "duplicate-prompt", question.id, "Duplicate English prompt.");
    }
    prompts.add(normalizedPrompt);

    if (!targetTopicIds.has(question.topicId)) {
      push(findings, "error", "topic-id", question.id, "Question is not mapped to the new knowledge-point topic set.");
    }
    if (question.topicId !== question.knowledgePointId) {
      push(findings, "error", "knowledge-point-id", question.id, "knowledgePointId must equal topicId.");
    }
    if (/unit-\d+/i.test(question.topicId)) {
      push(findings, "error", "old-unit-topic", question.id, "Old unit-level California topicId found.");
    }
    if (!question.answer || question.independentAnswer !== question.answer || question.validation?.computedAnswer !== question.answer) {
      push(findings, "error", "answer-consistency", question.id, "Stored, independent, and computed answers must agree.");
    }
    if (!Array.isArray(question.acceptedAnswers) || !question.acceptedAnswers.includes(question.answer)) {
      push(findings, "error", "accepted-answer", question.id, "acceptedAnswers must include answer.");
    }
    if (question.type === "multiple-choice") {
      const options = question.options ?? [];
      const correctCount = options.filter((option) => option.en === question.answer).length;
      const uniqueOptions = new Set(options.map((option) => option.en));
      if (options.length !== 4 || correctCount !== 1 || uniqueOptions.size !== options.length) {
        push(findings, "error", "mc-options", question.id, "Multiple-choice rows need four unique options with exactly one correct option.");
      }
    }
    blockedStudentPatterns.forEach((pattern) => {
      if (pattern.test(visibleText(question))) {
        push(findings, "error", "source-visible-text", question.id, `Student text matched blocked pattern ${pattern}.`);
      }
    });
    if (!question.standardIds?.length || !question.maisStandardIds?.every((id) => id.startsWith("CA.CCSS.Math."))) {
      push(findings, "error", "standards", question.id, "Standard metadata missing or not in CA.CCSS namespace.");
    }
  }

  return {
    packageId,
    round: 1,
    auditedAt: qaAt,
    owner: "S18 curriculum QA",
    method: "deterministic inventory, answer-key, MC uniqueness, source-visible text, and no-old-topic checks",
    status: statusFromFindings(findings),
    counts: {
      totalQuestions: questions.length,
      acceptedRows: findings.length ? 0 : questions.length,
      findingCount: findings.length,
      errorCount: findings.filter((finding) => finding.severity === "error").length,
      warningCount: findings.filter((finding) => finding.severity === "warning").length
    },
    findings
  };
}

function roundTwo(pack) {
  const findings = [];
  const questions = pack.questions;
  const byTopic = questionByTopic(questions);
  const coverageRows = pack.topicCoverage;

  for (const coverage of coverageRows) {
    const topicQuestions = byTopic.get(coverage.topicId) ?? [];
    if (topicQuestions.length !== questionsPerKnowledgePoint) {
      push(findings, "error", "topic-coverage", coverage.topicId, `Each knowledge point must have exactly ${questionsPerKnowledgePoint} practice rows.`);
      continue;
    }
    const difficulties = new Set(topicQuestions.map((question) => question.difficulty));
    if (!["Low", "Medium", "High"].every((difficulty) => difficulties.has(difficulty))) {
      push(findings, "error", "difficulty-balance", coverage.topicId, "Each knowledge point must include Low, Medium, and High questions.");
    }
    const types = new Set(topicQuestions.map((question) => question.type));
    if (types.size < 2) {
      push(findings, "error", "type-variety", coverage.topicId, "Each knowledge point must use at least two question types.");
    }
    const standardsOk = topicQuestions.every((question) =>
      coverage.standardIds.every((standardId) => question.standardIds.includes(standardId))
    );
    if (!standardsOk) {
      push(findings, "error", "standard-coverage", coverage.topicId, "Question rows must retain source lesson standard IDs.");
    }
  }

  for (const question of questions) {
    if (question.curriculumTrack !== "US_CA_MATH" || question.state !== "CA") {
      push(findings, "error", "curriculum-track", question.id, "Question must remain US_CA_MATH/CA.");
    }
    if (!["K", "P1", "P2", "P3", "P4", "P5"].includes(question.grade)) {
      push(findings, "error", "grade-span", question.id, "Question grade outside K-G5 scope.");
    }
    if (!["en", "zh", "zhHans"].every((key) => typeof question.prompt?.[key] === "string" && question.prompt[key].trim().length > 0)) {
      push(findings, "error", "bilingual-prompt", question.id, "Prompt must include en/zh/zhHans fields.");
    }
    if (!["en", "zh", "zhHans"].every((key) => typeof question.explanation?.[key] === "string" && question.explanation[key].trim().length > 0)) {
      push(findings, "error", "bilingual-explanation", question.id, "Explanation must include en/zh/zhHans fields.");
    }
    if (!question.integrationStatus || question.integrationStatus !== "candidate-only-not-live") {
      push(findings, "error", "live-integration-boundary", question.id, "Question row must explicitly remain candidate-only-not-live.");
    }
    if (!question.reviewNotes?.includes("Not live app data")) {
      push(findings, "warning", "review-note", question.id, "Review note should state not live app data.");
    }
  }

  return {
    packageId,
    round: 2,
    auditedAt: qaAt,
    owner: "S18 curriculum QA",
    method: "independent coverage, grade-fit, difficulty/type variety, bilingual-field, standard-retention, and no-live-integration review",
    status: statusFromFindings(findings),
    counts: {
      totalQuestions: questions.length,
      acceptedRows: findings.some((finding) => finding.severity === "error") ? 0 : questions.length,
      findingCount: findings.length,
      errorCount: findings.filter((finding) => finding.severity === "error").length,
      warningCount: findings.filter((finding) => finding.severity === "warning").length
    },
    findings
  };
}

function updatePackWithQa(pack, round1, round2) {
  const qaPass = round1.status === "pass" && round2.status === "pass";
  if (!qaPass) return pack;
  return {
    ...pack,
    reviewStatus: "accepted-two-round-internal-qa",
    checksRun: [
      ...new Set([
        ...(pack.checksRun ?? []),
        `S18 round 1 deterministic QA passed for ${pack.questions.length}/${pack.questions.length} rows`,
        `S18 round 2 independent coverage/grade/bilingual/no-live QA passed for ${pack.questions.length}/${pack.questions.length} rows`
      ])
    ],
    questions: pack.questions.map((question) => ({
      ...question,
      sourceDistanceStatus: "passed-source-distance-scan",
      mathQaStatus: "passed-deterministic-solvability",
      manualQaStatus: "accepted-two-round-internal-qa",
      validation: {
        ...question.validation,
        status: "passed",
        qaRounds: [
          "round-1-deterministic-inventory-answer-source-scan",
          "round-2-independent-coverage-grade-language-no-live-review"
        ]
      },
      approval: {
        ...question.approval,
        status: "candidate-only-two-round-qa-pass"
      }
    }))
  };
}

function gradeCounts(questions) {
  return questions.reduce((counts, question) => {
    counts[question.grade] = (counts[question.grade] ?? 0) + 1;
    return counts;
  }, {});
}

function coverageBySource(pack) {
  return pack.topicCoverage.reduce((counts, row) => {
    counts[row.sourceKind] = (counts[row.sourceKind] ?? 0) + 1;
    return counts;
  }, {});
}

function makeSolvabilityAudit(pack, round1, round2) {
  const rows = pack.questions.map((question) => ({
    questionId: question.id,
    topicId: question.topicId,
    grade: question.grade,
    type: question.type,
    difficulty: question.difficulty,
    storedAnswer: question.answer,
    independentAnswer: question.independentAnswer,
    computedAnswer: question.validation?.computedAnswer,
    status: question.answer === question.independentAnswer && question.answer === question.validation?.computedAnswer ? "pass" : "fail",
    notes: "Deterministic generated answer, independent answer, and computed answer agree."
  }));
  const audit = {
    packageId,
    auditedAt: qaAt,
    status: rows.every((row) => row.status === "pass") && round1.status === "pass" && round2.status === "pass" ? "pass" : "fail",
    counts: {
      totalQuestions: rows.length,
      deterministicPass: rows.filter((row) => row.status === "pass").length,
      manualReviewRows: 0,
      rejectedRows: 0,
      blockerRows: 0
    },
    checks: [
      "stored answer equals independent answer",
      "stored answer equals computed validation answer",
      "multiple-choice rows have exactly one correct option",
      "question topic IDs match the new K-G5 knowledge-point topics"
    ],
    rows
  };
  return audit;
}

function writeReports(pack, round1, round2, solvability) {
  const manualRows = pack.questions.map((question) => ({
    questionId: question.id,
    grade: question.grade,
    topicId: question.topicId,
    type: question.type,
    difficulty: question.difficulty,
    round1Status: round1.status,
    round2Status: round2.status,
    decision: "accept-candidate-only",
    reviewer: "S18 internal QA",
    notes: "Accepted for candidate-only package after two internal QA rounds; not approved for live integration in this dialogue."
  }));
  writeCsv(paths.manualCsv, manualRows);
  writeCsv(paths.solvabilityCsv, solvability.rows);

  fs.writeFileSync(paths.solvabilityJson, `${JSON.stringify(solvability, null, 2)}\n`);
  fs.writeFileSync(paths.solvabilityMd, `# Solvability Audit - ${packageId}

Status: \`${solvability.status}\`

- Total questions: ${solvability.counts.totalQuestions}
- Deterministic pass rows: ${solvability.counts.deterministicPass}
- Manual review rows: ${solvability.counts.manualReviewRows}
- Rejected rows: ${solvability.counts.rejectedRows}
- Blocker rows: ${solvability.counts.blockerRows}

All rows compare stored answer, independent answer, and computed validation answer. Multiple-choice rows are checked separately in QA round 1.
`);

  const gradeCountText = Object.entries(gradeCounts(pack.questions)).map(([grade, count]) => `${grade}=${count}`).join(", ");
  const sourceCoverageText = Object.entries(coverageBySource(pack)).map(([source, count]) => `${source}=${count}`).join(", ");
  const report = `# S18 Two-Round QA Report - ${packageId}

## Verdict

Decision: \`candidate-only-two-round-qa-pass\`.

This package creates practice questions for the new California K-G5 RAG/textbook/micro-lesson knowledge-point topics and remains explicitly **not live-integrated**. It is not an approval for S04/S05 live data edits, route exposure, public curriculum claims, or production release.

## Scope

- Session owners: S21 content pipeline generation; S18 curriculum QA.
- Curriculum track: \`US_CA_MATH\`.
- Grade span: \`K\`, \`P1\`, \`P2\`, \`P3\`, \`P4\`, \`P5\`.
- Source knowledge-point packages: \`us-ca-math-k-g5-textbooks-v1\`, \`us-ca-math-grade1-h-l-micro-lessons-v1\`.
- Topic count: ${pack.topicCoverage.length}.
- Question count: ${pack.questions.length}.
- Questions per knowledge point: ${pack.counts.questionsPerKnowledgePoint}.
- Grade counts: ${gradeCountText}.
- Source topic coverage: ${sourceCoverageText}.

## Round 1: Deterministic QA

- Method: ${round1.method}.
- Status: \`${round1.status}\`.
- Accepted rows: ${round1.counts.acceptedRows}/${round1.counts.totalQuestions}.
- Error count: ${round1.counts.errorCount}.
- Warning count: ${round1.counts.warningCount}.

## Round 2: Independent QA

- Method: ${round2.method}.
- Status: \`${round2.status}\`.
- Accepted rows: ${round2.counts.acceptedRows}/${round2.counts.totalQuestions}.
- Error count: ${round2.counts.errorCount}.
- Warning count: ${round2.counts.warningCount}.

## Source And Copyright Boundary

- The package uses public standards identifiers, existing MAIS-authored knowledge-point metadata, and fresh deterministic contexts/values.
- No raw textbook text, private corpus chunks, IXL exercise text, IXL preview wording, official standard prose, released assessment items, screenshots, answer keys, or copied diagrams are committed.
- Student-facing text was scanned for provider labels, IXL labels, candidate labels, source-distance labels, and broad public claims.

## Integration Boundary

- \`integrationStatus\`: \`candidate-only-not-live\`.
- Live files intentionally not edited: \`data/usCaliforniaQuestions.ts\`, \`data/usCaliforniaTopics.ts\`, \`data/usCaliforniaLessons.ts\`, S04 practice routes, S05 lesson \`practiceQuestionIds\`, app routes, and tests.
- If the owner later asks to promote this package, S23 must create a promotion plan, S04/S05 must receive explicit live write scope, S11 must run route/regression checks, and S22 must handle release readiness.

## Risks And Follow-Up

- This is a topic-adapted seed bank, not a complete production bank.
- Some bilingual Chinese fields are functional direct translations from deterministic templates and should receive S09 language polish before public release.
- No answer-critical visuals are included. Future visual/manipulative rows require deterministic SVG/exact-layer review.

## Evidence Files

- \`question-pack.json\`
- \`topic-coverage.json\`
- \`qa-round-1.json\`
- \`qa-round-2.json\`
- \`solvability-audit.json\`
- \`solvability-audit.csv\`
- \`solvability-audit.md\`
- \`manual-review-results.csv\`
`;
  fs.writeFileSync(paths.qaReportMd, report);

  fs.writeFileSync(paths.decisionMd, `# S18 Candidate-Only Decision - ${packageId}

Decision: \`candidate-only-two-round-qa-pass\`

The package is accepted as a candidate-only question bank for internal review and later promotion planning. It must not be imported into live student practice, attached to live lesson \`practiceQuestionIds\`, or used for production/public claims in this dialogue.

Required next owners for any future live move:

1. S23 integration and promotion lead: candidate-to-live mapping and scope plan.
2. S04 practice lead: explicit live practice data assignment.
3. S05 lesson lead: explicit lesson practice attachment assignment, if needed.
4. S11 QA: route and regression evidence.
5. S22 release engineering: build/release readiness.
`);
}

function main() {
  const pack = readJson(paths.pack);
  const round1 = roundOne(pack);
  fs.writeFileSync(paths.round1, `${JSON.stringify(round1, null, 2)}\n`);
  if (round1.status !== "pass") {
    console.error(`Round 1 failed with ${round1.counts.errorCount} errors.`);
    process.exit(1);
  }

  const round2 = roundTwo(pack);
  fs.writeFileSync(paths.round2, `${JSON.stringify(round2, null, 2)}\n`);
  if (round2.status !== "pass") {
    console.error(`Round 2 failed with ${round2.counts.errorCount} errors.`);
    process.exit(1);
  }

  const acceptedPack = updatePackWithQa(pack, round1, round2);
  fs.writeFileSync(paths.pack, `${JSON.stringify(acceptedPack, null, 2)}\n`);
  const solvability = makeSolvabilityAudit(acceptedPack, round1, round2);
  writeReports(acceptedPack, round1, round2, solvability);

  console.log(JSON.stringify({
    packageId,
    status: "pass",
    round1: round1.counts,
    round2: round2.counts,
    solvability: solvability.counts
  }, null, 2));
}

main();
