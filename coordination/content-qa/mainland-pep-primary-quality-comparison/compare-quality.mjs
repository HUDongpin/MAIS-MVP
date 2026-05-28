import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  readdirSync,
  symlinkSync,
  writeFileSync
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");
const reportDate = process.argv[2] ?? hongKongDateString(new Date());
const outputDir = path.join(rootDir, "coordination", "content-qa");
const baseName = `${reportDate}-S18-mainland-pep-primary-deepseek-vs-local-quality-report`;
const compiledDir = path.join(rootDir, ".tmp", "mainland-pep-primary-quality-comparison");
const deepseekBatchDir = path.join(
  rootDir,
  "coordination",
  "content-qa",
  "mainland-pep-primary-generated-bank-v1",
  "batches"
);

const grades = ["P1", "P2", "P3", "P4", "P5", "P6"];
const semesters = ["upper", "lower"];
const questionTypes = ["multiple-choice", "fill-in", "short-answer"];
const difficulties = ["Foundation", "Core", "Challenge", "Exam"];
const sourceBatches = ["deepseek-600", "local-1200"];
const expectedDeepseekQuestions = 600;
const expectedLocalQuestions = 1200;
const manualSampleTargetPerSource = 240;
const manualSampleTargetPerGrade = 40;

const forbiddenSourcePatterns = [
  "教材原文",
  "原题",
  "答案原句",
  "官方解析",
  "OCR",
  "source locator",
  "archive path",
  "PDF",
  "DOCX",
  /第[0-9０-９]+页/,
  /page [0-9]+/i,
  /p\.[0-9]+/i
];

const generatorArtifactPatterns = [
  "已修改",
  "修改选项",
  "原题可能",
  "题目数字有误",
  "可能题目",
  "为避免歧义",
  "答案唯一，需确认",
  "不符合实际",
  "保留原选项",
  "按输入输出",
  "本题要求生成原创题",
  "safeSummary",
  /选\s*[A-D]\s*或\s*[A-D]\s*均可/,
  /答案(不唯一|有歧义)/,
  /(两个|多个)答案/
];

const traditionalRiskCharacters = [
  "數",
  "學",
  "題",
  "時",
  "圖",
  "個",
  "這",
  "與",
  "體",
  "單",
  "選",
  "練",
  "顯",
  "則",
  "變",
  "總"
];

function hongKongDateString(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${byType.year}-${byType.month}-${byType.day}`;
}

function compileProject() {
  rmSync(compiledDir, { recursive: true, force: true });
  execFileSync(
    path.join(rootDir, "node_modules", ".bin", "tsc"),
    [
      "-p",
      "tsconfig.json",
      "--outDir",
      compiledDir,
      "--noEmit",
      "false",
      "--incremental",
      "false",
      "--module",
      "commonjs",
      "--moduleResolution",
      "node"
    ],
    { cwd: rootDir, stdio: "inherit" }
  );

  const aliasDir = path.join(compiledDir, "node_modules", "@");
  mkdirSync(aliasDir, { recursive: true });
  for (const name of ["data", "lib", "types.js"]) {
    const target = path.join(compiledDir, name);
    const link = path.join(aliasDir, name);
    if (existsSync(target) && !existsSync(link)) symlinkSync(path.relative(aliasDir, target), link);
  }
}

function loadLocalQuestions() {
  compileProject();
  const require = createRequire(import.meta.url);
  const localModule = require(path.join(compiledDir, "data", "mainlandPepPrimaryQuestions.js"));
  return {
    questions: localModule.mainlandPepPrimaryRagV1Questions,
    metadata: localModule.mainlandPepPrimaryQuestionGenerationMetadata,
    independentAnswer: localModule.independentMainlandPepPrimaryAnswer
  };
}

function readDeepseekBatches() {
  if (!existsSync(deepseekBatchDir)) return { rows: [], files: [], readErrors: [`Missing batch dir: ${deepseekBatchDir}`] };

  const files = readdirSync(deepseekBatchDir).filter((file) => file.endsWith(".json")).sort();
  const rows = [];
  const readErrors = [];

  for (const file of files) {
    const filePath = path.join(deepseekBatchDir, file);
    try {
      const parsed = JSON.parse(readFileSync(filePath, "utf8"));
      const questions = Array.isArray(parsed.questions) ? parsed.questions : [];
      if (!questions.length) readErrors.push(`${file}: no questions array`);
      for (const question of questions) {
        rows.push(normalizeDeepseekQuestion(question, file, parsed.batchId ?? file.replace(/\.json$/, "")));
      }
    } catch (error) {
      readErrors.push(`${file}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return { rows, files, readErrors };
}

function textValue(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value.zhHans ?? value["zh-Hans"] ?? value.zh ?? value.en ?? "";
}

function normalizeDeepseekQuestion(question, sourceFile, sourceBatchFileId) {
  return {
    sourceBatch: "deepseek-600",
    sourceFile,
    sourceBatchFileId,
    questionId: String(question.id ?? ""),
    grade: String(question.grade ?? ""),
    semester: String(question.semester ?? ""),
    unitTitle: String(question.unitTitle ?? ""),
    topicId: String(question.topicId ?? ""),
    conceptIds: Array.isArray(question.conceptIds) ? question.conceptIds.map(String) : [],
    difficulty: String(question.difficulty ?? ""),
    type: String(question.type ?? ""),
    promptZhHans: String(question.promptZhHans ?? ""),
    optionsZhHans: Array.isArray(question.optionsZhHans) ? question.optionsZhHans.map(String) : [],
    answer: String(question.answer ?? ""),
    acceptedAnswers: canonicalAcceptedAnswers(question.answer, question.acceptedAnswers),
    explanationZhHans: String(question.explanationZhHans ?? ""),
    evidenceCardIds: Array.isArray(question.evidenceCardIds) ? question.evidenceCardIds.map(String) : [],
    examPatternCardIds: Array.isArray(question.examPatternCardIds) ? question.examPatternCardIds.map(String) : [],
    independentAnswer: "",
    deterministicMathStatus: "manual-required"
  };
}

function normalizeLocalQuestion(question, metadata, independentAnswer) {
  const questionMetadata = metadata[question.id] ?? {};
  const independent = independentAnswer(question) ?? "";
  return {
    sourceBatch: "local-1200",
    sourceFile: "data/mainlandPepPrimaryQuestions.ts",
    sourceBatchFileId: questionMetadata.batch ?? "primary-rag-v1",
    questionId: String(question.id ?? ""),
    grade: String(question.grade ?? ""),
    semester: String(questionMetadata.semester ?? ""),
    unitTitle: textValue(question.topic),
    topicId: String(question.topicId ?? ""),
    conceptIds: [],
    difficulty: String(question.difficulty ?? ""),
    type: String(question.type ?? ""),
    promptZhHans: textValue(question.prompt),
    optionsZhHans: Array.isArray(question.options) ? question.options.map(textValue) : [],
    answer: String(question.answer ?? ""),
    acceptedAnswers: canonicalAcceptedAnswers(question.answer, question.acceptedAnswers),
    explanationZhHans: textValue(question.explanation),
    evidenceCardIds: Array.isArray(questionMetadata.evidenceCardIds) ? questionMetadata.evidenceCardIds.map(String) : [],
    examPatternCardIds: Array.isArray(questionMetadata.examPatternCardIds)
      ? questionMetadata.examPatternCardIds.map(String)
      : [],
    independentAnswer: String(independent),
    deterministicMathStatus: independent ? "checked" : "solver-gap"
  };
}

function canonicalAcceptedAnswers(answer, acceptedAnswers) {
  const values = [answer, ...(Array.isArray(acceptedAnswers) ? acceptedAnswers : [])]
    .filter((value) => value !== null && value !== undefined)
    .map(String);
  const seen = new Set();
  return values.filter((value) => {
    const normalized = normalizeAnswer(value);
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

function normalizeAnswer(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[，,。．.\s]/g, "")
    .replace(/[（）]/g, (char) => (char === "（" ? "(" : ")"))
    .replace(/\\\(|\\\)/g, "")
    .trim();
}

function acceptedAnswerSet(row) {
  return new Set([row.answer, ...row.acceptedAnswers].filter(Boolean).map(normalizeAnswer));
}

function optionAnswerHits(row) {
  const answers = acceptedAnswerSet(row);
  return row.optionsZhHans.filter((option) => answers.has(normalizeAnswer(option))).length;
}

function containsAcceptedAnswer(text, row) {
  const normalizedText = normalizeAnswer(text);
  return [...acceptedAnswerSet(row)].some((answer) => answer && normalizedText.includes(answer));
}

function exactPrompt(row) {
  return row.promptZhHans.replace(/\s+/g, "");
}

function canonicalPrompt(row) {
  return exactPrompt(row)
    .toLowerCase()
    .replace(/第[0-9０-９一二三四五六七八九十百千万]+小组[:：]?/g, "")
    .replace(/[0-9０-９]+(?:\.[0-9０-９]+)?/g, "#")
    .replace(/[一二三四五六七八九十百千万]+/g, "#")
    .replace(/[a-z]/g, "x")
    .replace(/[＋+－−-]/g, "+")
    .slice(0, 320);
}

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row) || "missing";
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function buildPromptStats(rows) {
  const exactCounts = new Map();
  const canonicalCounts = new Map();
  for (const row of rows) {
    const exact = exactPrompt(row);
    const canonical = canonicalPrompt(row);
    exactCounts.set(exact, (exactCounts.get(exact) ?? 0) + 1);
    canonicalCounts.set(canonical, (canonicalCounts.get(canonical) ?? 0) + 1);
  }
  return { exactCounts, canonicalCounts };
}

function hasSourceArtifact(text) {
  return forbiddenSourcePatterns.some((pattern) => {
    if (typeof pattern === "string") return text.includes(pattern);
    return pattern.test(text);
  });
}

function hasGeneratorArtifact(text) {
  return generatorArtifactPatterns.some((pattern) => {
    if (typeof pattern === "string") return text.includes(pattern);
    return pattern.test(text);
  });
}

function hasTraditionalRisk(text) {
  return traditionalRiskCharacters.some((char) => text.includes(char));
}

function clamp(value) {
  return Math.max(0, Math.min(100, Math.round(value * 10) / 10));
}

function weightedScore(scores) {
  return clamp(
    scores.mathCorrectnessScore * 0.25 +
      scores.curriculumFitScore * 0.2 +
      scores.schemaScore * 0.15 +
      scores.explanationScore * 0.15 +
      scores.languageScore * 0.1 +
      scores.diversityScore * 0.1 +
      scores.sourceSafetyScore * 0.05
  );
}

function analyzeRow(row, statsBySource) {
  const flags = [];
  const blockerFlags = [];
  const combinedText = [
    row.promptZhHans,
    row.explanationZhHans,
    row.answer,
    ...row.optionsZhHans,
    ...row.acceptedAnswers
  ].join(" ");
  const stats = statsBySource[row.sourceBatch];
  const exactCount = stats.exactCounts.get(exactPrompt(row)) ?? 0;
  const canonicalCount = stats.canonicalCounts.get(canonicalPrompt(row)) ?? 0;

  pushFlag(flags, !row.questionId, "missing-id");
  pushFlag(flags, !grades.includes(row.grade), "invalid-grade");
  pushFlag(flags, !semesters.includes(row.semester), "invalid-semester");
  pushFlag(flags, !row.unitTitle && !row.topicId, "missing-unit-or-topic");
  pushFlag(flags, !difficulties.includes(row.difficulty), "invalid-difficulty");
  pushFlag(flags, !questionTypes.includes(row.type), "unsupported-type");
  pushFlag(flags, !row.promptZhHans.trim(), "missing-prompt");
  pushFlag(flags, !row.answer.trim(), "missing-answer");
  pushFlag(flags, !row.explanationZhHans.trim(), "missing-explanation");
  pushFlag(flags, !row.acceptedAnswers.map(normalizeAnswer).includes(normalizeAnswer(row.answer)), "accepted-answer-missing-canonical");
  pushFlag(flags, hasSourceArtifact(combinedText), "source-copying-artifact");
  pushFlag(flags, hasGeneratorArtifact(combinedText), "generator-self-talk-artifact");
  pushFlag(flags, /如图|见图|上图|下图/.test(row.promptZhHans), "diagram-reference-without-figure");
  pushFlag(flags, hasTraditionalRisk(combinedText), "traditional-character-risk");
  pushFlag(flags, exactCount > 1, "exact-prompt-duplicate");
  pushFlag(flags, canonicalCount > 12, "near-duplicate-template-cluster");

  if (row.type === "multiple-choice") {
    const uniqueOptionCount = new Set(row.optionsZhHans.map(normalizeAnswer)).size;
    pushFlag(flags, row.optionsZhHans.length !== 4, "multiple-choice-option-count");
    pushFlag(flags, uniqueOptionCount !== row.optionsZhHans.length, "duplicate-options");
    pushFlag(flags, optionAnswerHits(row) !== 1, "multiple-choice-answer-not-unique");
  } else {
    pushFlag(flags, row.optionsZhHans.length > 0, "non-choice-has-options");
  }

  const localMathMismatch =
    row.sourceBatch === "local-1200" &&
    row.independentAnswer &&
    !acceptedAnswerSet(row).has(normalizeAnswer(row.independentAnswer));
  pushFlag(flags, localMathMismatch, "local-independent-answer-mismatch");
  pushFlag(flags, row.sourceBatch === "deepseek-600", "manual-math-review-required");

  const blockerNames = new Set([
    "missing-id",
    "unsupported-type",
    "missing-prompt",
    "missing-answer",
    "missing-explanation",
    "multiple-choice-option-count",
    "multiple-choice-answer-not-unique",
    "non-choice-has-options",
    "source-copying-artifact",
    "generator-self-talk-artifact",
    "local-independent-answer-mismatch"
  ]);
  for (const flag of flags) {
    if (blockerNames.has(flag)) blockerFlags.push(flag);
  }

  const mathCorrectnessScore = scoreMathCorrectness(row, flags);
  const curriculumFitScore = clamp(
    100 -
      (flags.includes("invalid-grade") ? 40 : 0) -
      (flags.includes("invalid-semester") ? 30 : 0) -
      (flags.includes("invalid-difficulty") ? 15 : 0) -
      (flags.includes("missing-unit-or-topic") ? 15 : 0) -
      (!row.evidenceCardIds.length ? 8 : 0) -
      (!row.examPatternCardIds.length ? 8 : 0)
  );
  const schemaScore = clamp(
    100 -
      (flags.includes("missing-id") ? 25 : 0) -
      (flags.includes("unsupported-type") ? 40 : 0) -
      (flags.includes("multiple-choice-option-count") ? 35 : 0) -
      (flags.includes("duplicate-options") ? 15 : 0) -
      (flags.includes("multiple-choice-answer-not-unique") ? 35 : 0) -
      (flags.includes("non-choice-has-options") ? 15 : 0) -
      (flags.includes("accepted-answer-missing-canonical") ? 8 : 0)
  );
  const explanationScore = clamp(
    100 -
      (row.explanationZhHans.length < 10 ? 25 : 0) -
      (row.explanationZhHans.length < 18 ? 10 : 0) -
      (!containsAcceptedAnswer(row.explanationZhHans, row) ? 15 : 0) -
      (flags.includes("generator-self-talk-artifact") ? 25 : 0) -
      (row.promptZhHans.length < 8 ? 15 : 0)
  );
  const languageScore = clamp(
    100 -
      (chineseRatio(row.promptZhHans) < 0.45 ? 20 : 0) -
      (chineseRatio(row.explanationZhHans) < 0.35 ? 20 : 0) -
      (flags.includes("traditional-character-risk") ? 20 : 0)
  );
  const diversityScore = clamp(
    100 -
      (flags.includes("exact-prompt-duplicate") ? 35 : 0) -
      (canonicalCount > 40 ? 30 : canonicalCount > 24 ? 22 : canonicalCount > 12 ? 14 : 0)
  );
  const sourceSafetyScore = clamp(
    100 -
      (flags.includes("source-copying-artifact") ? 100 : 0) -
      (flags.includes("generator-self-talk-artifact") ? 35 : 0) -
      (flags.includes("diagram-reference-without-figure") ? 20 : 0)
  );
  const overallScore = weightedScore({
    mathCorrectnessScore,
    curriculumFitScore,
    schemaScore,
    explanationScore,
    languageScore,
    diversityScore,
    sourceSafetyScore
  });
  const directLaunchCandidate =
    blockerFlags.length === 0 && !flags.includes("manual-math-review-required") && overallScore >= 90;
  const rewriteRecommended = blockerFlags.length > 0 || overallScore < 75;
  const reviewRecommendation =
    blockerFlags.length > 0
      ? "blocker-review"
      : rewriteRecommended
        ? "manual-review"
        : flags.includes("manual-math-review-required") || overallScore < 90
          ? "sample-review"
          : "pass";

  return {
    ...row,
    exactPromptCount: exactCount,
    canonicalPromptCount: canonicalCount,
    mathCorrectnessScore,
    curriculumFitScore,
    schemaScore,
    explanationScore,
    languageScore,
    diversityScore,
    sourceSafetyScore,
    overallScore,
    directLaunchCandidate,
    rewriteRecommended,
    reviewRecommendation,
    blockerFlags,
    riskFlags: flags
  };
}

function pushFlag(flags, condition, flag) {
  if (condition) flags.push(flag);
}

function scoreMathCorrectness(row, flags) {
  if (flags.includes("missing-prompt") || flags.includes("missing-answer") || flags.includes("missing-explanation")) return 0;
  if (row.sourceBatch === "local-1200") {
    if (!row.independentAnswer) return 65;
    return flags.includes("local-independent-answer-mismatch") ? 0 : 100;
  }

  const structureOk =
    row.type === "multiple-choice"
      ? row.optionsZhHans.length === 4 && optionAnswerHits(row) === 1
      : row.optionsZhHans.length === 0;
  return clamp(70 + (containsAcceptedAnswer(row.explanationZhHans, row) ? 10 : 0) + (structureOk ? 5 : 0));
}

function chineseRatio(text) {
  if (!text) return 0;
  const chars = Array.from(text.replace(/\s+/g, ""));
  if (!chars.length) return 0;
  const chinese = chars.filter((char) => /[\u3400-\u9fff]/.test(char)).length;
  return chinese / chars.length;
}

function expectedDeepseekFiles() {
  const files = [];
  for (const grade of grades) {
    for (const semester of semesters) {
      for (let batch = 1; batch <= 5; batch += 1) {
        files.push(`${grade}-${semester}-${String(batch).padStart(2, "0")}.json`);
      }
    }
  }
  return files;
}

function buildInventory(deepseekRows, deepseekFiles, localRows, readErrors) {
  const expectedFiles = expectedDeepseekFiles();
  const existingFiles = new Set(deepseekFiles);
  const missingFiles = expectedFiles.filter((file) => !existingFiles.has(file));
  const unexpectedFiles = deepseekFiles.filter((file) => !expectedFiles.includes(file));
  const deepseekGradeSemesterCounts = countBy(deepseekRows, (row) => `${row.grade}:${row.semester}`);
  const localGradeSemesterCounts = countBy(localRows, (row) => `${row.grade}:${row.semester}`);

  return {
    deepseek: {
      expectedQuestions: expectedDeepseekQuestions,
      actualQuestions: deepseekRows.length,
      expectedFiles: expectedFiles.length,
      actualFiles: deepseekFiles.length,
      complete: deepseekRows.length === expectedDeepseekQuestions && missingFiles.length === 0 && readErrors.length === 0,
      missingQuestionCount: Math.max(0, expectedDeepseekQuestions - deepseekRows.length),
      missingFiles,
      unexpectedFiles,
      readErrors,
      gradeSemesterCounts: deepseekGradeSemesterCounts
    },
    local: {
      expectedQuestions: expectedLocalQuestions,
      actualQuestions: localRows.length,
      complete: localRows.length === expectedLocalQuestions,
      missingQuestionCount: Math.max(0, expectedLocalQuestions - localRows.length),
      gradeSemesterCounts: localGradeSemesterCounts
    }
  };
}

function average(rows, key) {
  if (!rows.length) return 0;
  return Math.round((rows.reduce((total, row) => total + row[key], 0) / rows.length) * 10) / 10;
}

function summarizeRows(rows) {
  const summary = {};
  for (const sourceBatch of sourceBatches) {
    const sourceRows = rows.filter((row) => row.sourceBatch === sourceBatch);
    summary[sourceBatch] = summarizeGroup(sourceRows);
  }
  return summary;
}

function summarizeGroup(rows) {
  const blockerRows = rows.filter((row) => row.blockerFlags.length > 0);
  const directLaunchRows = rows.filter((row) => row.directLaunchCandidate);
  const rewriteRows = rows.filter((row) => row.rewriteRecommended);
  const mathMismatchRows = rows.filter((row) => row.riskFlags.includes("local-independent-answer-mismatch"));
  const manualMathRows = rows.filter((row) => row.riskFlags.includes("manual-math-review-required"));

  return {
    count: rows.length,
    overallScore: average(rows, "overallScore"),
    mathCorrectnessScore: average(rows, "mathCorrectnessScore"),
    curriculumFitScore: average(rows, "curriculumFitScore"),
    schemaScore: average(rows, "schemaScore"),
    explanationScore: average(rows, "explanationScore"),
    languageScore: average(rows, "languageScore"),
    diversityScore: average(rows, "diversityScore"),
    sourceSafetyScore: average(rows, "sourceSafetyScore"),
    directLaunchCount: directLaunchRows.length,
    directLaunchRate: percent(directLaunchRows.length, rows.length),
    rewriteCount: rewriteRows.length,
    rewriteRate: percent(rewriteRows.length, rows.length),
    blockerCount: blockerRows.length,
    blockerRate: percent(blockerRows.length, rows.length),
    verifiedMathMismatchCount: mathMismatchRows.length,
    verifiedMathMismatchRate: percent(mathMismatchRows.length, rows.length),
    manualMathReviewRequiredCount: manualMathRows.length,
    reviewRecommendationCounts: countBy(rows, (row) => row.reviewRecommendation),
    riskFlagCounts: countFlags(rows, "riskFlags"),
    blockerFlagCounts: countFlags(rows, "blockerFlags")
  };
}

function groupedSummaries(rows, groupKey) {
  const result = {};
  for (const sourceBatch of sourceBatches) {
    result[sourceBatch] = {};
    const sourceRows = rows.filter((row) => row.sourceBatch === sourceBatch);
    const keys = [...new Set(sourceRows.map((row) => row[groupKey] || "missing"))].sort();
    for (const key of keys) {
      result[sourceBatch][key] = summarizeGroup(sourceRows.filter((row) => (row[groupKey] || "missing") === key));
    }
  }
  return result;
}

function countFlags(rows, key) {
  const counts = {};
  for (const row of rows) {
    for (const flag of row[key]) counts[flag] = (counts[flag] ?? 0) + 1;
  }
  return counts;
}

function percent(numerator, denominator) {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

function manualPriority(row) {
  return (
    row.blockerFlags.length * 1000 +
    (row.rewriteRecommended ? 500 : 0) +
    (100 - row.overallScore) * 5 +
    (row.riskFlags.includes("near-duplicate-template-cluster") ? 60 : 0) +
    (row.riskFlags.includes("manual-math-review-required") ? 40 : 0)
  );
}

function buildManualQueue(rows) {
  const selected = [];
  const selectedKeys = new Set();
  for (const sourceBatch of sourceBatches) {
    const sourceRows = rows.filter((row) => row.sourceBatch === sourceBatch);
    const sourceSelected = [];

    for (const grade of grades) {
      const candidates = sourceRows
        .filter((row) => row.grade === grade)
        .sort((left, right) => manualPriority(right) - manualPriority(left) || left.questionId.localeCompare(right.questionId));
      for (const row of balancedTake(candidates, manualSampleTargetPerGrade)) {
        sourceSelected.push(row);
        selectedKeys.add(`${row.sourceBatch}:${row.questionId}`);
      }
    }

    const fill = sourceRows
      .filter((row) => !selectedKeys.has(`${row.sourceBatch}:${row.questionId}`))
      .sort((left, right) => manualPriority(right) - manualPriority(left) || left.questionId.localeCompare(right.questionId));
    for (const row of fill) {
      if (sourceSelected.length >= manualSampleTargetPerSource) break;
      sourceSelected.push(row);
      selectedKeys.add(`${row.sourceBatch}:${row.questionId}`);
    }

    selected.push(...sourceSelected.slice(0, manualSampleTargetPerSource));
  }

  return interleaveBySource(selected).map((row, index) => ({
    blindId: `MPPQ-${String(index + 1).padStart(3, "0")}`,
    grade: row.grade,
    semester: row.semester,
    type: row.type,
    difficulty: row.difficulty,
    promptZhHans: row.promptZhHans,
    optionsZhHans: row.optionsZhHans.join(" | "),
    answer: row.answer,
    acceptedAnswers: row.acceptedAnswers.join(" | "),
    explanationZhHans: row.explanationZhHans,
    reviewerMathCorrectness: "",
    reviewerGradeFit: "",
    reviewerLanguageQuality: "",
    reviewerExplanationQuality: "",
    reviewerClassroomUsability: "",
    reviewerTemplateFeel: "",
    reviewerNotes: ""
  }));
}

function balancedTake(rows, limit) {
  const buckets = new Map();
  for (const row of rows) {
    const key = `${row.semester}:${row.type}:${row.difficulty}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(row);
  }

  const selected = [];
  while (selected.length < limit && [...buckets.values()].some((bucket) => bucket.length)) {
    const bucketKeys = [...buckets.keys()].sort();
    for (const key of bucketKeys) {
      const bucket = buckets.get(key);
      if (bucket?.length) selected.push(bucket.shift());
      if (selected.length >= limit) break;
    }
  }
  return selected;
}

function interleaveBySource(rows) {
  const bySource = new Map(sourceBatches.map((source) => [source, rows.filter((row) => row.sourceBatch === source)]));
  const result = [];
  while ([...bySource.values()].some((bucket) => bucket.length)) {
    for (const source of sourceBatches) {
      const row = bySource.get(source)?.shift();
      if (row) result.push(row);
    }
  }
  return result;
}

function csv(rows, columns) {
  return [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(","))
  ].join("\n");
}

function csvEscape(value) {
  if (Array.isArray(value)) return csvEscape(value.join(" | "));
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function markdownTable(headers, rows) {
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map((cell) => String(cell)).join(" | ")} |`)
  ].join("\n");
}

function topRows(rows, sourceBatch, limit = 20) {
  return rows
    .filter((row) => row.sourceBatch === sourceBatch)
    .sort((left, right) => left.overallScore - right.overallScore || left.questionId.localeCompare(right.questionId))
    .slice(0, limit);
}

function buildMarkdown(report) {
  const summaryRows = sourceBatches.map((sourceBatch) => {
    const summary = report.summary.bySource[sourceBatch];
    return [
      sourceBatch,
      summary.count,
      summary.overallScore,
      summary.mathCorrectnessScore,
      summary.curriculumFitScore,
      summary.schemaScore,
      summary.explanationScore,
      summary.languageScore,
      summary.diversityScore,
      summary.sourceSafetyScore,
      `${summary.directLaunchCount} (${summary.directLaunchRate}%)`,
      `${summary.rewriteCount} (${summary.rewriteRate}%)`,
      summary.blockerCount
    ];
  });

  const inventoryRows = [
    [
      "DeepSeek",
      report.inventory.deepseek.actualQuestions,
      report.inventory.deepseek.expectedQuestions,
      report.inventory.deepseek.actualFiles,
      report.inventory.deepseek.expectedFiles,
      report.inventory.deepseek.complete ? "Complete" : "Incomplete"
    ],
    [
      "Local",
      report.inventory.local.actualQuestions,
      report.inventory.local.expectedQuestions,
      "n/a",
      "n/a",
      report.inventory.local.complete ? "Complete" : "Incomplete"
    ]
  ];

  const missingDeepseekSlots = report.inventory.deepseek.missingFiles.length
    ? report.inventory.deepseek.missingFiles.join(", ")
    : "None";

  const lowestRows = sourceBatches.flatMap((sourceBatch) =>
    topRows(report.rows, sourceBatch, 10).map((row) => [
      sourceBatch,
      row.questionId,
      row.grade,
      row.semester,
      row.type,
      row.difficulty,
      row.overallScore,
      row.reviewRecommendation,
      row.riskFlags.slice(0, 4).join("; ")
    ])
  );

  return `# S18 Mainland PEP Primary Question QA: DeepSeek 600 vs Local 1200

- Date: ${report.reportDate}
- Session ID: S18
- Workstream: Curriculum QA and content quality
- Scope: Compare Mainland PEP primary generated question banks using committed/generated question content only.
- Verdict: ${report.verdict}

## Executive Summary

- DeepSeek input is ${report.inventory.deepseek.complete ? "complete" : "incomplete"}: ${report.inventory.deepseek.actualQuestions}/${report.inventory.deepseek.expectedQuestions} questions and ${report.inventory.deepseek.actualFiles}/${report.inventory.deepseek.expectedFiles} batch files are present.
- Local input is ${report.inventory.local.complete ? "complete" : "incomplete"}: ${report.inventory.local.actualQuestions}/${report.inventory.local.expectedQuestions} deterministic questions are present.
- Because the DeepSeek bank is not frozen at 600 questions, this report is a staged quality audit, not a final supplier-quality verdict.
- Current main-bank recommendation: use the local 1200-question bank as the complete baseline after same-ID local RAG replacement of the 166 manually rejected sample rows. Treat DeepSeek rows as supplemental candidates after manual blind review, limited to covered grades/semesters.
- Manual blind-review queue generated: ${report.manualReviewQueue.length} rows. The CSV intentionally omits source labels.

## Inventory Gate

${markdownTable(["Bank", "Actual questions", "Expected questions", "Actual files", "Expected files", "Gate"], inventoryRows)}

Missing DeepSeek batch files: ${missingDeepseekSlots}

## Automated Score Summary

${markdownTable(
  [
    "Batch",
    "Count",
    "Overall",
    "Math",
    "Curriculum",
    "Schema",
    "Explanation",
    "Language",
    "Diversity",
    "Source safety",
    "Direct launch",
    "Rewrite",
    "Blockers"
  ],
  summaryRows
)}

## Key Risks

- DeepSeek: ${formatRiskLine(report.summary.bySource["deepseek-600"])}
- Local: ${formatRiskLine(report.summary.bySource["local-1200"])}

## Lowest-Scoring Rows For Triage

${markdownTable(
  ["Batch", "Question ID", "Grade", "Semester", "Type", "Difficulty", "Overall", "Recommendation", "Top flags"],
  lowestRows
)}

## Decision

- Main production baseline: local-1200, because it is complete and has deterministic answer-key verification.
- Supplemental candidate pool: DeepSeek covered rows only, pending manual blind review and completion of the missing ${report.inventory.deepseek.missingQuestionCount} questions.
- Must remove or rewrite: any row marked blocker-review in the row-level CSV/JSON.
- Do not claim a complete DeepSeek-vs-local outcome until the missing DeepSeek files are present and the manual blind-review queue is scored.

## Generated Artifacts

- Row-level CSV: \`coordination/content-qa/${baseName}.csv\`
- Machine JSON: \`coordination/content-qa/${baseName}.json\`
- Blind manual-review queue: \`coordination/content-qa/${baseName}.manual-review-queue.csv\`

## Assumptions

- No live LLM, OCR, textbook corpus, exam-paper source text, source images, or external solver was used.
- Local deterministic math status uses the existing independent Mainland PEP primary answer function.
- DeepSeek math correctness is structurally triaged but still requires manual review because no dedicated deterministic solver exists for its free-form stems.
- Scores are triage scores for prioritizing review, not a substitute for S18 human sign-off.
`;
}

function formatRiskLine(summary) {
  const entries = Object.entries(summary.riskFlagCounts)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)
    .map(([flag, count]) => `${flag} ${count}`);
  return entries.length ? entries.join(", ") : "no major automated risk flags";
}

function main() {
  const { questions: localQuestions, metadata, independentAnswer } = loadLocalQuestions();
  const localRows = localQuestions.map((question) => normalizeLocalQuestion(question, metadata, independentAnswer));
  const { rows: deepseekRows, files: deepseekFiles, readErrors } = readDeepseekBatches();
  const normalizedRows = [...deepseekRows, ...localRows];
  const statsBySource = Object.fromEntries(
    sourceBatches.map((sourceBatch) => [sourceBatch, buildPromptStats(normalizedRows.filter((row) => row.sourceBatch === sourceBatch))])
  );
  const rows = normalizedRows.map((row) => analyzeRow(row, statsBySource));
  const inventory = buildInventory(deepseekRows, deepseekFiles, localRows, readErrors);
  const manualReviewQueue = buildManualQueue(rows);
  const report = {
    reportDate,
    generatedAt: new Date().toISOString(),
    verdict: inventory.deepseek.complete
      ? "Complete input audit generated; use manual review before final rollout."
      : "Staged audit only: DeepSeek input is incomplete, so no final supplier-quality conclusion is valid.",
    inventory,
    summary: {
      bySource: summarizeRows(rows),
      byGrade: groupedSummaries(rows, "grade"),
      bySemester: groupedSummaries(rows, "semester"),
      byType: groupedSummaries(rows, "type"),
      byDifficulty: groupedSummaries(rows, "difficulty")
    },
    rows,
    manualReviewQueue,
    assumptions: [
      "Local 1200 means mainlandPepPrimaryRagV1Questions after same-ID local RAG replacement of 166 S18 manual-review rewrite rows.",
      "DeepSeek 600 means JSON batches under coordination/content-qa/mainland-pep-primary-generated-bank-v1/batches.",
      "No live provider, source corpus, OCR, or external solver is used.",
      "DeepSeek free-form stems require manual blind review for final math correctness certification."
    ]
  };

  mkdirSync(outputDir, { recursive: true });
  writeFileSync(path.join(outputDir, `${baseName}.md`), buildMarkdown(report));
  writeFileSync(path.join(outputDir, `${baseName}.json`), `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(
    path.join(outputDir, `${baseName}.csv`),
    `${csv(rows, [
      "sourceBatch",
      "sourceFile",
      "sourceBatchFileId",
      "questionId",
      "grade",
      "semester",
      "unitTitle",
      "topicId",
      "conceptIds",
      "difficulty",
      "type",
      "promptZhHans",
      "optionsZhHans",
      "answer",
      "acceptedAnswers",
      "explanationZhHans",
      "evidenceCardIds",
      "examPatternCardIds",
      "independentAnswer",
      "deterministicMathStatus",
      "mathCorrectnessScore",
      "curriculumFitScore",
      "schemaScore",
      "explanationScore",
      "languageScore",
      "diversityScore",
      "sourceSafetyScore",
      "overallScore",
      "directLaunchCandidate",
      "rewriteRecommended",
      "reviewRecommendation",
      "blockerFlags",
      "riskFlags"
    ])}\n`
  );
  writeFileSync(
    path.join(outputDir, `${baseName}.manual-review-queue.csv`),
    `${csv(manualReviewQueue, [
      "blindId",
      "grade",
      "semester",
      "type",
      "difficulty",
      "promptZhHans",
      "optionsZhHans",
      "answer",
      "acceptedAnswers",
      "explanationZhHans",
      "reviewerMathCorrectness",
      "reviewerGradeFit",
      "reviewerLanguageQuality",
      "reviewerExplanationQuality",
      "reviewerClassroomUsability",
      "reviewerTemplateFeel",
      "reviewerNotes"
    ])}\n`
  );

  const consoleSummary = {
    verdict: report.verdict,
    deepseekQuestions: inventory.deepseek.actualQuestions,
    deepseekExpected: inventory.deepseek.expectedQuestions,
    deepseekMissingFiles: inventory.deepseek.missingFiles.length,
    localQuestions: inventory.local.actualQuestions,
    manualReviewQueueRows: manualReviewQueue.length,
    outputs: [
      path.join(outputDir, `${baseName}.md`),
      path.join(outputDir, `${baseName}.json`),
      path.join(outputDir, `${baseName}.csv`),
      path.join(outputDir, `${baseName}.manual-review-queue.csv`)
    ]
  };
  console.log(JSON.stringify(consoleSummary, null, 2));
}

try {
  main();
} finally {
  rmSync(compiledDir, { recursive: true, force: true });
}
