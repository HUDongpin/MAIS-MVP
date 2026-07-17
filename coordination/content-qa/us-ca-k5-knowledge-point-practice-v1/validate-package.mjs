#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const packageDir = path.dirname(new URL(import.meta.url).pathname);
const repoRoot = path.resolve(packageDir, "../../..");
const packageId = "us-ca-k5-knowledge-point-practice-v1";
const questionPackPath = path.join(packageDir, "question-pack.json");
const round1Path = path.join(packageDir, "qa-round-1.json");
const round2Path = path.join(packageDir, "qa-round-2.json");
const reportPath = path.join(packageDir, "qa-report.md");
const docxPath = path.join(packageDir, "qa-report.docx");
const questionsPerKnowledgePoint = 12;

const oldUnitTopicPattern = /us-ca-math-(?:k|g\d)-unit-\d+/i;
const blockedStudentPatterns = [
  /\bDeepSeek\b/i,
  /candidate/i,
  /\bIXL\b/i,
  /Activity\s+\d+\s*:/i,
  /Practice activity\s+\d+\s*:/i,
  /source[- ]?distance/i,
  /manual QA/i
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function parseMicroLessonTargets() {
  const source = fs.readFileSync(path.join(repoRoot, "data/usCaliforniaMicroLessons.ts"), "utf8");
  const blocks = Array.from(source.matchAll(/spec\(\{([\s\S]*?)\n\s*\}\),?/g)).map((match) => match[1]);
  return blocks.map((block) => {
    const getString = (field) => block.match(new RegExp(`${field}:\\s*"([^"]+)"`))?.[1] ?? "";
    const standardIds = Array.from(block.matchAll(/standardIds:\s*\[([^\]]+)\]/g))[0]?.[1]
      ?.match(/"([^"]+)"/g)
      ?.map((value) => value.slice(1, -1)) ?? [];
    const competencyTags = Array.from(block.matchAll(/competencyTags:\s*\[([^\]]+)\]/g))[0]?.[1]
      ?.match(/"([^"]+)"/g)
      ?.map((value) => value.slice(1, -1)) ?? [];
    return {
      sourcePackageId: "us-ca-math-grade1-h-l-micro-lessons-v1",
      sourceKind: "grade1-micro-lesson",
      topicId: getString("topicId"),
      grade: "P1",
      usGradeLabel: "Grade 1",
      domainId: "1.OA",
      domainTitle: "Operations and Algebraic Thinking",
      clusterId: getString("strandId"),
      clusterTitle: getString("strandTitle"),
      knowledgePointCode: getString("knowledgePointCode"),
      title: getString("maisTitle"),
      standardIds,
      competencyTags
    };
  }).filter((target) => target.topicId);
}

function textbookTargets() {
  const pack = readJson(path.join(repoRoot, "data/generated-content/us-ca-math-k-g5-textbooks-v1/lessons.json"));
  return pack.lessons.map((lesson) => ({
    sourcePackageId: pack.packageId,
    sourceKind: "k-g5-textbook-lesson",
    topicId: lesson.metadata.topicId,
    grade: lesson.metadata.grade,
    usGradeLabel: lesson.metadata.usGradeLabel,
    domainId: lesson.metadata.domainId,
    domainTitle: lesson.metadata.domainTitle,
    clusterId: lesson.metadata.clusterId,
    clusterTitle: lesson.metadata.clusterTitle,
    knowledgePointCode: lesson.metadata.topicId,
    title: lesson.studentLesson.en.title,
    standardIds: lesson.metadata.standardIds,
    competencyTags: lesson.metadata.competencyTags ?? []
  }));
}

function loadTargets() {
  const targets = [...textbookTargets(), ...parseMicroLessonTargets()];
  const byId = new Map(targets.map((target) => [target.topicId, target]));
  return { targets, byId };
}

function pushFinding(findings, severity, check, message, rowId = "") {
  findings.push({ severity, check, message, rowId });
}

function localizedText(value) {
  if (!value || typeof value.en !== "string" || typeof value.zh !== "string" || typeof value.zhHans !== "string") {
    return "";
  }
  return [value.en, value.zh, value.zhHans].join("\n");
}

function validateQuestion(question, targetById, findings) {
  const rowId = question?.id ?? "(missing-id)";
  const target = targetById.get(question?.topicId);

  if (!target) {
    pushFinding(findings, "error", "target-topic", `Question topicId is not a new K-G5 knowledge-point topic: ${question?.topicId}`, rowId);
    return;
  }
  if (oldUnitTopicPattern.test(question.topicId)) {
    pushFinding(findings, "error", "old-topic-id", "Question still uses old unit-level California topicId.", rowId);
  }
  if (question.knowledgePointId !== target.topicId) {
    pushFinding(findings, "error", "knowledge-point-id", "knowledgePointId must match the new topicId.", rowId);
  }
  if (question.curriculumTrack !== "US_CA_MATH" || question.state !== "CA") {
    pushFinding(findings, "error", "curriculum", "Question must remain in US_CA_MATH / CA.", rowId);
  }
  if (question.grade !== target.grade || question.usGradeLabel !== target.usGradeLabel) {
    pushFinding(findings, "error", "grade-fit", "Question grade must match its source knowledge point.", rowId);
  }
  if (!Array.isArray(question.standardIds) || !target.standardIds.every((id) => question.standardIds.includes(id))) {
    pushFinding(findings, "error", "standards", "Question standardIds must include the source knowledge-point standard IDs.", rowId);
  }
  if (!["multiple-choice", "fill-in", "short-answer"].includes(question.type)) {
    pushFinding(findings, "error", "type", `Unsupported question type: ${question.type}`, rowId);
  }
  if (!["Low", "Medium", "High"].includes(question.difficulty)) {
    pushFinding(findings, "error", "difficulty", `Unsupported difficulty: ${question.difficulty}`, rowId);
  }
  if (!question.answer || !Array.isArray(question.acceptedAnswers) || !question.acceptedAnswers.includes(question.answer)) {
    pushFinding(findings, "error", "answer-key", "Answer must be nonempty and included in acceptedAnswers.", rowId);
  }
  if (question.independentAnswer !== question.answer || question.validation?.computedAnswer !== question.answer) {
    pushFinding(findings, "error", "deterministic-answer", "Independent and computed answers must match the stored answer.", rowId);
  }
  if (!question.independentSolution || !question.explanation?.en) {
    pushFinding(findings, "error", "solution", "Question must include independentSolution and localized explanation.", rowId);
  }
  if (question.type === "multiple-choice") {
    if (!Array.isArray(question.options) || question.options.length !== 4) {
      pushFinding(findings, "error", "mc-options", "Multiple-choice rows must have exactly four options.", rowId);
    } else {
      const correctOptions = question.options.filter((option) => option.en === question.answer);
      if (correctOptions.length !== 1) {
        pushFinding(findings, "error", "mc-options", "Multiple-choice rows must have exactly one correct option.", rowId);
      }
      const uniqueOptions = new Set(question.options.map((option) => option.en));
      if (uniqueOptions.size !== question.options.length) {
        pushFinding(findings, "error", "mc-options", "Multiple-choice options must be unique.", rowId);
      }
    }
  }

  const visibleText = [
    localizedText(question.prompt),
    localizedText(question.explanation),
    ...(question.options ?? []).map(localizedText)
  ].join("\n");
  blockedStudentPatterns.forEach((pattern) => {
    if (pattern.test(visibleText)) {
      pushFinding(findings, "error", "student-visible-source-label", `Student text matched blocked pattern ${pattern}.`, rowId);
    }
  });

  if (question.sourceDistanceStatus !== "passed-source-distance-scan") {
    pushFinding(findings, "error", "source-distance", "sourceDistanceStatus must pass.", rowId);
  }
  if (question.mathQaStatus !== "passed-deterministic-solvability") {
    pushFinding(findings, "error", "math-qa", "mathQaStatus must pass deterministic solvability.", rowId);
  }
  if (question.manualQaStatus !== "accepted-two-round-internal-qa") {
    pushFinding(findings, "error", "manual-qa", "manualQaStatus must record two-round internal QA acceptance.", rowId);
  }
  if (question.integrationStatus !== "candidate-only-not-live") {
    pushFinding(findings, "error", "integration-status", "Question must remain candidate-only and not live.", rowId);
  }
}

function validatePackage() {
  const findings = [];
  const { targets, byId: targetById } = loadTargets();

  if (!fs.existsSync(questionPackPath)) {
    pushFinding(findings, "error", "package-exists", `Missing ${path.relative(repoRoot, questionPackPath)}.`);
    return { status: "fail", findings, summary: { expectedTopics: targets.length, expectedQuestions: targets.length * questionsPerKnowledgePoint } };
  }

  const pack = readJson(questionPackPath);
  const questions = pack.questions ?? [];
  if (pack.packageId !== packageId) pushFinding(findings, "error", "package-id", `Expected packageId ${packageId}.`);
  if (pack.packageStatus !== "candidate-only" || pack.integrationStatus !== "candidate-only-not-live") {
    pushFinding(findings, "error", "candidate-only", "Package must be candidate-only and not live-integrated.");
  }
  if (pack.scope?.intendedReleaseSurface !== "Candidate practice bank only; no live integration in this dialogue") {
    pushFinding(findings, "error", "scope", "Package intendedReleaseSurface must explicitly prohibit live integration.");
  }
  if (questions.length !== targets.length * questionsPerKnowledgePoint) {
    pushFinding(findings, "error", "question-count", `Expected ${targets.length * questionsPerKnowledgePoint} questions, found ${questions.length}.`);
  }
  if (pack.counts?.questionsPerKnowledgePoint !== questionsPerKnowledgePoint) {
    pushFinding(findings, "error", "package-counts", `Package counts must record ${questionsPerKnowledgePoint} questions per knowledge point.`);
  }

  const ids = new Set();
  const prompts = new Set();
  const byTopic = new Map(targets.map((target) => [target.topicId, []]));
  questions.forEach((question) => {
    if (ids.has(question.id)) pushFinding(findings, "error", "duplicate-id", `Duplicate question id ${question.id}.`, question.id);
    ids.add(question.id);
    const normalizedPrompt = question.prompt?.en?.toLowerCase().replace(/\s+/g, " ").trim();
    if (normalizedPrompt) {
      if (prompts.has(normalizedPrompt)) pushFinding(findings, "error", "duplicate-prompt", "Duplicate English prompt.", question.id);
      prompts.add(normalizedPrompt);
    }
    if (byTopic.has(question.topicId)) byTopic.get(question.topicId).push(question);
    validateQuestion(question, targetById, findings);
  });

  for (const target of targets) {
    const topicQuestions = byTopic.get(target.topicId) ?? [];
    if (topicQuestions.length !== questionsPerKnowledgePoint) {
      pushFinding(findings, "error", "topic-coverage", `${target.topicId} expected ${questionsPerKnowledgePoint} questions, found ${topicQuestions.length}.`);
      continue;
    }
    const coverage = pack.topicCoverage?.find((row) => row.topicId === target.topicId);
    if (!coverage || coverage.questionIds?.length !== questionsPerKnowledgePoint) {
      pushFinding(findings, "error", "topic-coverage-record", `${target.topicId} topicCoverage must list ${questionsPerKnowledgePoint} question IDs.`);
    }
    const difficulties = new Set(topicQuestions.map((question) => question.difficulty));
    if (!["Low", "Medium", "High"].every((difficulty) => difficulties.has(difficulty))) {
      pushFinding(findings, "error", "topic-difficulty", `${target.topicId} must include Low, Medium, and High rows.`);
    }
    const types = new Set(topicQuestions.map((question) => question.type));
    if (types.size < 2) {
      pushFinding(findings, "error", "topic-variety", `${target.topicId} must include at least two question types.`);
    }
  }

  for (const filePath of [round1Path, round2Path, reportPath, docxPath]) {
    if (!fs.existsSync(filePath)) {
      pushFinding(findings, "error", "required-artifact", `Missing required artifact ${path.relative(repoRoot, filePath)}.`);
    }
  }

  for (const [filePath, expectedRound] of [[round1Path, 1], [round2Path, 2]]) {
    if (!fs.existsSync(filePath)) continue;
    const qa = readJson(filePath);
    if (qa.packageId !== packageId || qa.round !== expectedRound || qa.status !== "pass") {
      pushFinding(findings, "error", `qa-round-${expectedRound}`, `QA round ${expectedRound} must pass for ${packageId}.`);
    }
    if (qa.counts?.totalQuestions !== targets.length * questionsPerKnowledgePoint || qa.counts?.acceptedRows !== targets.length * questionsPerKnowledgePoint) {
      pushFinding(findings, "error", `qa-round-${expectedRound}-counts`, `QA round ${expectedRound} counts must accept every row.`);
    }
  }

  return {
    status: findings.some((finding) => finding.severity === "error") ? "fail" : "pass",
    findings,
    summary: {
      expectedTopics: targets.length,
      expectedQuestions: targets.length * questionsPerKnowledgePoint,
      actualQuestions: questions.length,
      targetTopicIds: targets.map((target) => target.topicId)
    }
  };
}

const result = validatePackage();
console.log(JSON.stringify(result, null, 2));
if (result.status !== "pass") process.exit(1);
