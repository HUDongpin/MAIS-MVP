import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../../..");
const inputJson = path.join(__dirname, "lessons.json");
const outputDir = path.join(__dirname, "deepseek-v4-pro-lesson-qa");
const batchDir = path.join(outputDir, "batches");

const defaultBatchSize = 4;
const defaultMode = "preflight";
const maxTokens = Number(process.env.BNU_JUNIOR_LESSON_QA_MAX_TOKENS ?? 8000);
const maxAttempts = Number(process.env.BNU_JUNIOR_LESSON_QA_MAX_ATTEMPTS ?? 3);
const requestTimeoutMs = Number(process.env.BNU_JUNIOR_LESSON_QA_TIMEOUT_MS ?? 120000);
const maxSectionChars = Number(process.env.BNU_JUNIOR_LESSON_QA_MAX_SECTION_CHARS ?? 12000);

const validStatuses = ["pass", "warn", "fail"];
const validSeverities = ["none", "P0", "P1", "P2", "P3"];
const remediationSeverities = new Set(["P0", "P1"]);
const manualReviewSeverities = new Set(["P0", "P1", "P2"]);
const validIssueTags = [
  "math_error",
  "definition_error",
  "theorem_mismatch",
  "worked_example_error",
  "exercise_answer_mismatch",
  "missing_condition",
  "grade_mismatch",
  "topic_mismatch",
  "sequence_mismatch",
  "terminology_issue",
  "pedagogy_gap",
  "misconception_gap",
  "source_artifact",
  "copy_risk",
  "missing_visual",
  "undefined_symbol",
  "language_issue",
  "public_readiness"
];

const forbiddenSourcePatterns = [
  { code: "source-ocr", severity: "P0", regex: /\bOCR\b|光学字符识别|识别文本/i },
  { code: "source-screenshot", severity: "P0", regex: /截图|截屏|扫描图|扫描件|教材图片|图片来源/ },
  { code: "source-page", severity: "P0", regex: /第\s*\d+\s*页|页码|页\s*\d+|P\.\s*\d+/i },
  { code: "source-original", severity: "P0", regex: /原题|原卷|原教材|教材原文|课本原文|照抄|改编自|来源于|摘自/ },
  { code: "source-file", severity: "P0", regex: /\.pdf\b|\.docx\b|\.zip\b|\.jpg\b|\.png\b|文件名|路径|\/Users\//iu }
];

const missingVisualPatterns = [
  /如图(?:所示)?/,
  /见图/,
  /下图/,
  /上图/,
  /右图/,
  /左图/,
  /根据图(?:形|表|像)?/,
  /观察下面的图/
];

class MissingLessonPackError extends Error {
  constructor(filePath) {
    super(`Missing BNU junior lesson pack: ${filePath}`);
    this.name = "MissingLessonPackError";
    this.filePath = filePath;
  }
}

function localDateString(date = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Hong_Kong",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value])
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function readLocalEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const env = {};
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[match[1]] = value;
  }
  return env;
}

function loadTsExport(filePath, exportName) {
  const source = fs
    .readFileSync(filePath, "utf8")
    .replace(/^import\s+.*;\s*$/gm, "")
    .replace(/\b(const|let|var)\s+([A-Za-z_$][\w$]*)\s*:\s*[^=;]+=/g, "$1 $2 =")
    .replace(new RegExp(`export const ${exportName}(?:: [^=]+)? =`), `exports.${exportName} =`);
  const context = { exports: {} };
  vm.runInNewContext(source, context, { filename: filePath });
  return context.exports[exportName];
}

function parseArgs(argv) {
  const args = {
    mode: defaultMode,
    batchSize: defaultBatchSize,
    limit: null,
    offset: 0,
    force: false,
    writeBlocker: true
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--preflight") {
      args.mode = "preflight";
    } else if (arg === "--smoke") {
      args.mode = "smoke";
    } else if (arg === "--full") {
      args.mode = "full";
    } else if (arg === "--force") {
      args.force = true;
    } else if (arg === "--no-blocker") {
      args.writeBlocker = false;
    } else if (arg === "--batch-size") {
      args.batchSize = Number(argv[++index]);
    } else if (arg === "--limit") {
      args.limit = Number(argv[++index]);
    } else if (arg === "--offset") {
      args.offset = Number(argv[++index]);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!Number.isInteger(args.batchSize) || args.batchSize < 1 || args.batchSize > 8) {
    throw new Error("--batch-size must be an integer from 1 to 8.");
  }
  if (args.limit !== null && (!Number.isInteger(args.limit) || args.limit < 1)) {
    throw new Error("--limit must be a positive integer.");
  }
  if (!Number.isInteger(args.offset) || args.offset < 0) {
    throw new Error("--offset must be a non-negative integer.");
  }

  return args;
}

function readLessonsPayload(filePath) {
  if (!fs.existsSync(filePath)) throw new MissingLessonPackError(filePath);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function normalize(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[！-～]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
    .replace(/　/g, " ")
    .replace(/[\s\-_/，、。,.()[\]（）:：;；"'“”‘’]+/g, "");
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return [];
  return [value];
}

function localizedText(value) {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return "";
  return value.zhHans ?? value.zh ?? value.en ?? value.titleZhHans ?? value.nameZhHans ?? "";
}

function normalizeGrade(value) {
  const text = String(value ?? "").trim().toUpperCase();
  if (["S1", "G7", "GRADE7", "7", "七年级", "初一"].includes(text)) return "S1";
  if (["S2", "G8", "GRADE8", "8", "八年级", "初二"].includes(text)) return "S2";
  if (["S3", "G9", "GRADE9", "9", "九年级", "初三"].includes(text)) return "S3";
  return text;
}

function normalizeSemester(value, volume) {
  const text = `${String(value ?? "")} ${String(volume ?? "")}`.toLowerCase();
  if (/upper|上册|上学期|七上|八上|九上/.test(text)) return "upper";
  if (/lower|下册|下学期|七下|八下|九下/.test(text)) return "lower";
  if (/full/.test(text)) return "full-year";
  return String(value ?? "").trim();
}

function firstString(...values) {
  for (const value of values) {
    const text = localizedText(value).trim();
    if (text) return text;
  }
  return "";
}

function toStringList(value) {
  return asArray(value)
    .flatMap((entry) => {
      if (typeof entry === "string") return entry;
      if (typeof entry === "number") return String(entry);
      if (entry && typeof entry === "object") return localizedText(entry);
      return "";
    })
    .map((entry) => String(entry).trim())
    .filter(Boolean);
}

function stableFallbackId(prefix, index) {
  return `${prefix}-${String(index + 1).padStart(3, "0")}`;
}

function flattenContent(value, pathParts = [], depth = 0) {
  if (value === null || value === undefined || depth > 6) return [];
  if (typeof value === "string") {
    const text = value.trim();
    return text ? [`${pathParts.join(".") || "text"}: ${text}`] : [];
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return [`${pathParts.join(".") || "value"}: ${String(value)}`];
  }
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) => flattenContent(entry, [...pathParts, String(index + 1)], depth + 1));
  }
  if (typeof value === "object") {
    return Object.entries(value)
      .filter(([key]) => !["id", "lessonId", "sectionId", "topicId", "evidenceCardIds", "assessmentPatternCardIds", "zhongkaoPatternCardIds"].includes(key))
      .flatMap(([key, entry]) => flattenContent(entry, [...pathParts, key], depth + 1));
  }
  return [];
}

function compactTextForQa(value) {
  const text = flattenContent(value).join("\n").trim();
  if (text.length <= maxSectionChars) return { text, truncated: false };
  return { text: `${text.slice(0, maxSectionChars)}\n[TRUNCATED_FOR_QA_INPUT]`, truncated: true };
}

function extractLessonArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.lessons)) return payload.lessons;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data?.lessons)) return payload.data.lessons;
  throw new Error("lessons.json must be an array or an object with a lessons/items/data.lessons array.");
}

function normalizeSections(lesson, lessonId) {
  const rawSections =
    lesson.sections ??
    lesson.lessonSections ??
    lesson.blocks ??
    lesson.contentBlocks ??
    lesson.modules ??
    lesson.pages ??
    [];

  const sectionArray = Array.isArray(rawSections) ? rawSections : [];
  if (!sectionArray.length) {
    const { text, truncated } = compactTextForQa(lesson);
    return [{
      sectionId: "lesson-body",
      sectionTitle: firstString(lesson.title, lesson.titleZhHans, lesson.unitTitle, lesson.name) || lessonId,
      sectionType: "lesson-body",
      contentText: text,
      truncated
    }];
  }

  return sectionArray.map((section, index) => {
    const { text, truncated } = compactTextForQa(section);
    return {
      sectionId: String(section?.sectionId ?? section?.id ?? section?.slug ?? stableFallbackId("section", index)),
      sectionTitle: firstString(section?.title, section?.titleZhHans, section?.heading, section?.name) || stableFallbackId("section", index),
      sectionType: String(section?.type ?? section?.kind ?? section?.blockType ?? "section"),
      contentText: text,
      truncated
    };
  });
}

function normalizeLessons(payload) {
  const lessons = extractLessonArray(payload);
  return lessons.map((lesson, lessonIndex) => {
    const lessonId = String(lesson.id ?? lesson.lessonId ?? lesson.slug ?? stableFallbackId("lesson", lessonIndex));
    const unitTitle = firstString(lesson.unitTitle, lesson.unitTitleZhHans, lesson.topicTitle, lesson.title, lesson.name);
    const title = firstString(lesson.title, lesson.titleZhHans, lesson.name, unitTitle);
    const volume = firstString(lesson.volume, lesson.book, lesson.textbookVolume);
    const grade = normalizeGrade(lesson.grade ?? lesson.gradeId ?? lesson.stageGrade);
    const semester = normalizeSemester(lesson.semester ?? lesson.term ?? lesson.semesterId, volume);
    const conceptIds = [
      ...toStringList(lesson.conceptIds),
      ...toStringList(lesson.concepts),
      ...toStringList(lesson.skillTags)
    ];
    const evidenceCardIds = toStringList(lesson.evidenceCardIds ?? lesson.curriculumCardIds ?? lesson.ragCardIds);
    const assessmentPatternCardIds = toStringList(lesson.assessmentPatternCardIds);
    const zhongkaoPatternCardIds = toStringList(lesson.zhongkaoPatternCardIds);
    const topLevelContext = compactTextForQa({
      title,
      learningObjectives: lesson.learningObjectives ?? lesson.objectives ?? lesson.goals,
      summary: lesson.summary ?? lesson.overview ?? lesson.description,
      keyConcepts: lesson.keyConcepts ?? lesson.conceptIds ?? lesson.concepts,
      misconceptions: lesson.misconceptions ?? lesson.commonMistakes
    });

    return {
      lessonId,
      title,
      grade,
      semester,
      topicId: String(lesson.topicId ?? lesson.unitId ?? lesson.canonicalTopicId ?? ""),
      unitTitle,
      volume,
      conceptIds: Array.from(new Set(conceptIds)),
      evidenceCardIds,
      assessmentPatternCardIds,
      zhongkaoPatternCardIds,
      lessonContext: topLevelContext.text,
      contextTruncated: topLevelContext.truncated,
      sections: normalizeSections(lesson, lessonId)
    };
  });
}

function loadRagCards() {
  return {
    curriculumCards: loadTsExport(
      path.join(projectRoot, "data/rag/mainlandBnuJunior.ts"),
      "mainlandBnuJuniorRagCards"
    ),
    assessmentCards: loadTsExport(
      path.join(projectRoot, "data/rag/mainlandBnuJuniorAssessmentPatterns.ts"),
      "mainlandBnuJuniorAssessmentPatternCards"
    ),
    zhongkaoCards: loadTsExport(
      path.join(projectRoot, "data/rag/mainlandJuniorZhongkaoExamPatterns.ts"),
      "mainlandJuniorZhongkaoExamPatternCards"
    )
  };
}

function cardGradeMatches(card, lesson) {
  if (card.grade) return card.grade === lesson.grade;
  if (Array.isArray(card.grades)) return card.grades.includes(lesson.grade);
  return true;
}

function cardSemesterMatches(card, lesson) {
  if (!lesson.semester || lesson.semester === "full-year") return true;
  if (card.semester) return card.semester === lesson.semester || card.semester === "full-year";
  if (Array.isArray(card.semesters)) return card.semesters.includes(lesson.semester) || card.semesters.includes("full-year");
  return true;
}

function cardUnitTitles(card) {
  return [card.unitTitle, ...(card.unitTitles ?? [])].filter(Boolean).map(String);
}

function scoreCard(card, lesson) {
  const conceptQueries = lesson.conceptIds.map(normalize).filter(Boolean);
  const unitQuery = normalize(lesson.unitTitle);
  const titleQueries = cardUnitTitles(card).map(normalize);
  const cardConcepts = (card.conceptIds ?? []).map(normalize);
  const directId = lesson.topicId && card.id === lesson.topicId ? 1 : 0;
  const explicitEvidence =
    lesson.evidenceCardIds.includes(card.id) ||
    lesson.assessmentPatternCardIds.includes(card.id) ||
    lesson.zhongkaoPatternCardIds.includes(card.id)
      ? 1
      : 0;
  const gradeMatch = cardGradeMatches(card, lesson) ? 1 : 0;
  const semesterMatch = cardSemesterMatches(card, lesson) ? 1 : 0;
  const titleMatch = unitQuery && titleQueries.some((title) => title === unitQuery || title.includes(unitQuery) || unitQuery.includes(title)) ? 1 : 0;
  const conceptMatches = conceptQueries.filter((query) =>
    cardConcepts.some((concept) => concept === query || concept.includes(query) || query.includes(concept))
  ).length;

  return directId * 100 + explicitEvidence * 90 + gradeMatch * 20 + semesterMatch * 8 + titleMatch * 18 + conceptMatches * 10;
}

function selectCards(cards, lesson, limit) {
  return cards
    .map((card, index) => ({ card, index, score: scoreCard(card, lesson) }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .slice(0, limit)
    .map((entry) => entry.card);
}

function compactCurriculumCard(card) {
  return {
    id: card.id,
    grade: card.grade,
    semester: card.semester,
    volume: card.volume,
    unitTitle: card.unitTitle,
    conceptIds: card.conceptIds,
    competencyTags: card.competencyTags,
    skillTags: card.skillTags,
    difficultyBand: card.difficultyBand,
    safeSummary: card.safeSummary,
    generationGuidance: card.generationGuidance,
    misconceptionTags: card.misconceptionTags,
    prohibitedReuseNotes: card.prohibitedReuseNotes
  };
}

function compactPatternCard(card) {
  return {
    id: card.id,
    grade: card.grade ?? card.grades,
    semester: card.semester ?? card.semesters,
    unitTitles: card.unitTitles,
    conceptIds: card.conceptIds,
    competencyTags: card.competencyTags,
    skillTags: card.skillTags ?? [],
    itemTypeTags: card.itemTypeTags,
    difficultyBand: card.difficultyBand,
    patternSummary: card.patternSummary,
    solutionStrategyTags: card.solutionStrategyTags ?? [],
    misconceptionTags: card.misconceptionTags,
    generationGuidance: card.generationGuidance,
    prohibitedReuseNotes: card.prohibitedReuseNotes
  };
}

function lessonEvidence(lesson, ragCards) {
  return {
    curriculumSafeCards: selectCards(ragCards.curriculumCards, lesson, 6).map(compactCurriculumCard),
    bnuAssessmentPatternCards: selectCards(ragCards.assessmentCards, lesson, 5).map(compactPatternCard),
    sharedZhongkaoPatternCards: selectCards(ragCards.zhongkaoCards, lesson, 4).map(compactPatternCard)
  };
}

function reviewItemsFromLessons(lessons, ragCards) {
  return lessons.flatMap((lesson) => {
    const evidence = lessonEvidence(lesson, ragCards);
    return lesson.sections.map((section) => ({
      lessonId: lesson.lessonId,
      sectionId: section.sectionId,
      grade: lesson.grade,
      semester: lesson.semester,
      topicId: lesson.topicId,
      unitTitle: lesson.unitTitle,
      title: lesson.title,
      conceptIds: lesson.conceptIds,
      sectionTitle: section.sectionTitle,
      sectionType: section.sectionType,
      lessonContext: lesson.lessonContext,
      contentText: section.contentText,
      truncated: lesson.contextTruncated || section.truncated,
      safeRagEvidence: evidence
    }));
  });
}

function reviewKey(item) {
  return `${item.lessonId}::${item.sectionId}`;
}

function chunkRows(rows, batchSize) {
  const batches = [];
  for (let index = 0; index < rows.length; index += batchSize) {
    batches.push(rows.slice(index, index + batchSize));
  }
  return batches;
}

function sourceIssuesForText(text, owner) {
  const issues = [];
  for (const { code, severity, regex } of forbiddenSourcePatterns) {
    if (regex.test(text)) issues.push({ ...owner, code, severity, detail: "source-artifact wording detected" });
  }
  for (const regex of missingVisualPatterns) {
    if (regex.test(text)) issues.push({ ...owner, code: "missing-visual-reference", severity: "P1", detail: "visual reference needs explicit diagram asset/spec review" });
  }
  return issues;
}

function preflightReview(lessons, items) {
  const issues = [];
  const validGrades = new Set(["S1", "S2", "S3"]);
  const validSemesters = new Set(["upper", "lower", "full-year"]);

  for (const lesson of lessons) {
    const owner = { lessonId: lesson.lessonId, sectionId: "", unitTitle: lesson.unitTitle };
    if (!lesson.lessonId) issues.push({ ...owner, code: "missing-lesson-id", severity: "P1", detail: "lessonId/id/slug is required" });
    if (!validGrades.has(lesson.grade)) issues.push({ ...owner, code: "invalid-grade", severity: "P1", detail: lesson.grade || "missing" });
    if (!validSemesters.has(lesson.semester)) issues.push({ ...owner, code: "invalid-semester", severity: "P1", detail: lesson.semester || "missing" });
    if (!lesson.topicId && !lesson.unitTitle) issues.push({ ...owner, code: "missing-topic", severity: "P1", detail: "topicId or unitTitle is required for RAG matching" });
    if (!lesson.sections.length) issues.push({ ...owner, code: "missing-sections", severity: "P1", detail: "no sections or fallback lesson body" });
  }

  for (const item of items) {
    const owner = { lessonId: item.lessonId, sectionId: item.sectionId, unitTitle: item.unitTitle };
    if (!item.contentText.trim()) issues.push({ ...owner, code: "empty-section-content", severity: "P1", detail: "section has no reviewable content" });
    if (!item.safeRagEvidence.curriculumSafeCards.length) issues.push({ ...owner, code: "no-curriculum-rag-hit", severity: "P1", detail: "no BNU junior curriculum safe RAG card matched" });
    if (!item.safeRagEvidence.bnuAssessmentPatternCards.length) issues.push({ ...owner, code: "no-assessment-rag-hit", severity: "P2", detail: "no BNU junior assessment-pattern card matched" });
    issues.push(...sourceIssuesForText(`${item.lessonContext}\n${item.contentText}`, owner));
    if (item.truncated) issues.push({ ...owner, code: "qa-input-truncated", severity: "P2", detail: `section/context exceeded ${maxSectionChars} chars` });
  }

  const gradeCounts = countBy(lessons, (lesson) => lesson.grade || "missing");
  for (const grade of ["S1", "S2", "S3"]) {
    if (!gradeCounts[grade]) {
      issues.push({ lessonId: "", sectionId: "", unitTitle: "", code: "missing-grade-coverage", severity: "P2", detail: `No ${grade} lessons found in package` });
    }
  }

  return issues;
}

function countBy(items, keyFn) {
  return items.reduce((counts, item) => {
    const key = keyFn(item);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function estimateTokens(items) {
  const charCount = items.reduce((sum, item) => {
    const evidenceText = JSON.stringify(item.safeRagEvidence);
    return sum + item.lessonContext.length + item.contentText.length + evidenceText.length;
  }, 0);
  return Math.ceil(charCount / 3.2);
}

function csvEscape(value) {
  const text = Array.isArray(value) ? value.join("|") : String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""').replace(/\r?\n/g, "\\n")}"` : text;
}

function writeCsv(filePath, rows, columns) {
  const lines = [columns.join(","), ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(","))];
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

function writeMissingLessonBlocker() {
  const date = localDateString();
  const blockerPath = path.join(projectRoot, "coordination/blockers", `${date}-S18-bnu-junior-lessons-missing.md`);
  const body = `# Blocker Report

- Date: ${date}
- Session ID: S18
- Task: Mainland BNU junior generated lesson-textbook DeepSeek V4 Pro QA
- Blocker type: Missing requirement
- What happened: The QA runner preflight could not find \`coordination/content-qa/mainland-bnu-junior-lessons-v1/lessons.json\`.
- Files involved:
  - Expected but missing: \`coordination/content-qa/mainland-bnu-junior-lessons-v1/lessons.json\`
  - QA runner: \`coordination/content-qa/mainland-bnu-junior-lessons-v1/deepseek-v4-pro-lesson-qa.mjs\`
  - Available RAG context: \`data/rag/mainlandBnuJunior.ts\`
  - Available RAG context: \`data/rag/mainlandBnuJuniorAssessmentPatterns.ts\`
  - Available shared pattern context: \`data/rag/mainlandJuniorZhongkaoExamPatterns.ts\`
- Why the session stopped: The approved plan says to stop and write a blocker if the lesson/textbook package is absent. Existing BNU junior question-bank artifacts must not be used as a substitute for lesson/course-body QA.
- Decision needed from owner: Provide or authorize generation of the Mainland BNU junior lesson/textbook package at the expected path.
- Safe next step: After \`lessons.json\` exists, run \`node coordination/content-qa/mainland-bnu-junior-lessons-v1/deepseek-v4-pro-lesson-qa.mjs --preflight\`, then \`--smoke\`, then \`--full\` only after preflight passes.
`;
  fs.mkdirSync(path.dirname(blockerPath), { recursive: true });
  fs.writeFileSync(blockerPath, body);
  return blockerPath;
}

function writeBlockedPreflight(error, blockerPath) {
  fs.mkdirSync(outputDir, { recursive: true });
  const result = {
    generatedAt: new Date().toISOString(),
    status: "blocked",
    reason: "missing-lessons-json",
    input: inputJson,
    blockerPath,
    error: error.message
  };
  fs.writeFileSync(path.join(outputDir, "preflight-summary.json"), `${JSON.stringify(result, null, 2)}\n`);
  const markdown = `# BNU Junior Lesson DeepSeek QA Preflight

- Date: ${localDateString()}
- Session ID: S18
- Status: blocked
- Input: \`${inputJson}\`
- Blocker: \`${path.relative(projectRoot, blockerPath)}\`

## Result

The lesson/textbook package is missing, so the runner stopped before schema validation, RAG matching, or any DeepSeek call.

No API key was read, no provider request was made, and the existing BNU junior question bank was not used as a substitute target.
`;
  fs.writeFileSync(path.join(outputDir, "preflight-summary.md"), markdown);
  return result;
}

function writePreflightOutputs({ lessons, items, issues, args }) {
  fs.mkdirSync(outputDir, { recursive: true });
  const gradeCounts = countBy(lessons, (lesson) => lesson.grade || "missing");
  const sectionCountsByGrade = countBy(items, (item) => item.grade || "missing");
  const unitCounts = countBy(lessons, (lesson) => `${lesson.grade || "missing"} ${lesson.semester || "missing"} ${lesson.unitTitle || lesson.topicId || "missing"}`);
  const severityCounts = countBy(issues, (issue) => issue.severity);
  const ragCoverage = {
    sections: items.length,
    withCurriculumRag: items.filter((item) => item.safeRagEvidence.curriculumSafeCards.length).length,
    withAssessmentRag: items.filter((item) => item.safeRagEvidence.bnuAssessmentPatternCards.length).length,
    withZhongkaoRag: items.filter((item) => item.safeRagEvidence.sharedZhongkaoPatternCards.length).length
  };
  const estimatedInputTokens = estimateTokens(items);
  const estimatedCalls =
    args.mode === "preflight"
      ? 0
      : Math.ceil((args.mode === "smoke" ? smokeItems(items).length : scopedItems(items, args).length) / args.batchSize);
  const result = {
    generatedAt: new Date().toISOString(),
    status: issues.some((issue) => ["P0", "P1"].includes(issue.severity)) ? "blocked" : "pass",
    input: inputJson,
    mode: args.mode,
    lessonCount: lessons.length,
    sectionCount: items.length,
    gradeCounts,
    sectionCountsByGrade,
    unitCounts,
    severityCounts,
    ragCoverage,
    estimatedInputTokens,
    estimatedCalls,
    issues
  };

  fs.writeFileSync(path.join(outputDir, "preflight-summary.json"), `${JSON.stringify(result, null, 2)}\n`);
  writeCsv(path.join(outputDir, "preflight-issues.csv"), issues, ["lessonId", "sectionId", "unitTitle", "code", "severity", "detail"]);
  writeCsv(
    path.join(outputDir, "coverage-matrix.csv"),
    Object.entries(unitCounts).map(([unit, count]) => ({ unit, lessonCount: count })),
    ["unit", "lessonCount"]
  );

  const issuePreview = issues.length
    ? issues
        .slice(0, 80)
        .map((issue) => `| \`${issue.lessonId || "-"}\` | \`${issue.sectionId || "-"}\` | ${issue.severity} | ${issue.code} | ${issue.detail} |`)
        .join("\n")
    : "| None | - | - | - | - |";
  const markdown = `# BNU Junior Lesson DeepSeek QA Preflight

- Date: ${localDateString()}
- Session ID: S18
- Status: ${result.status}
- Mode: ${args.mode}
- Input: \`${path.relative(projectRoot, inputJson)}\`
- Lessons: ${lessons.length}
- Sections: ${items.length}
- Grade counts: ${Object.entries(gradeCounts).map(([key, value]) => `${key} ${value}`).join(", ") || "none"}
- Section counts by grade: ${Object.entries(sectionCountsByGrade).map(([key, value]) => `${key} ${value}`).join(", ") || "none"}
- RAG coverage: curriculum ${ragCoverage.withCurriculumRag}/${ragCoverage.sections}, assessment ${ragCoverage.withAssessmentRag}/${ragCoverage.sections}, zhongkao ${ragCoverage.withZhongkaoRag}/${ragCoverage.sections}
- Estimated input tokens: ${estimatedInputTokens}
- Estimated provider calls for selected mode: ${estimatedCalls}
- Severity counts: ${Object.entries(severityCounts).map(([key, value]) => `${key} ${value}`).join(", ") || "none"}

## Gate Result

${result.status === "pass" ? "Preflight found no P0/P1 blockers. Smoke QA can run next with explicit `--smoke`." : "Preflight found P0/P1 blockers. Do not run DeepSeek full QA until they are fixed."}

## Issue Preview

| Lesson | Section | Severity | Code | Detail |
| --- | --- | --- | --- | --- |
${issuePreview}

## Secret Hygiene

Preflight does not read provider keys and does not make live DeepSeek calls.
`;
  fs.writeFileSync(path.join(outputDir, "preflight-summary.md"), markdown);
  return result;
}

function smokeItems(items) {
  const targetPatterns = [
    { key: "algebra", regex: /代数|方程|整式|函数|不等式|分式|二次|一次|algebra|equation|function/i },
    { key: "geometry", regex: /几何|图形|三角形|圆|平行|相似|坐标|geometry|triangle|circle/i },
    { key: "statistics", regex: /统计|概率|数据|statistics|probability|data/i }
  ];
  const selected = [];
  const seen = new Set();
  for (const grade of ["S1", "S2", "S3"]) {
    const gradeItems = items.filter((item) => item.grade === grade);
    for (const pattern of targetPatterns) {
      const match = gradeItems.find((item) => pattern.regex.test(`${item.unitTitle} ${item.topicId} ${item.conceptIds.join(" ")} ${item.sectionTitle}`));
      if (match && !seen.has(reviewKey(match))) {
        selected.push(match);
        seen.add(reviewKey(match));
      }
    }
    if (!gradeItems.some((item) => seen.has(reviewKey(item))) && gradeItems[0]) {
      selected.push(gradeItems[0]);
      seen.add(reviewKey(gradeItems[0]));
    }
  }
  return selected.length ? selected : items.slice(0, Math.min(9, items.length));
}

function scopedItems(items, args) {
  const sliced = items.slice(args.offset, args.limit === null ? undefined : args.offset + args.limit);
  return sliced;
}

function buildMessages(batch) {
  return [
    {
      role: "system",
      content: [
        "You are S18, a strict Mainland China junior math lesson QA reviewer.",
        "Review Codex-generated lesson/textbook content for Mainland Beijing Normal University Press junior-secondary mathematics.",
        "Use the supplied safe RAG cards only for grade, unit sequencing, terminology, concept coverage, assessment style, and zhongkao-style appropriateness.",
        "Do not request, cite, reproduce, translate, or reconstruct textbook source text, original exercises, page references, scans, OCR, answer keys, figures, tables, or recognizable source layouts.",
        "Check every lesson section independently for mathematical correctness, definition/theorem accuracy, worked-example validity, exercise answer consistency, sufficient conditions, BNU grade/topic fit, lesson progression, pedagogy, misconception support, source-distance safety, missing visuals, undefined symbols, Simplified Chinese quality, and public-readiness.",
        "Return JSON only. Do not include markdown.",
        "Use this exact schema:",
        '{"items":[{"lessonId":"string","sectionId":"string","status":"pass|warn|fail","severity":"none|P0|P1|P2|P3","issueTags":["math_error|definition_error|theorem_mismatch|worked_example_error|exercise_answer_mismatch|missing_condition|grade_mismatch|topic_mismatch|sequence_mismatch|terminology_issue|pedagogy_gap|misconception_gap|source_artifact|copy_risk|missing_visual|undefined_symbol|language_issue|public_readiness"],"rationaleZhHans":"short Chinese reason","suggestedFixSummary":null,"confidence":"high|medium|low"}],"batchSummary":{"pass":0,"warn":0,"fail":0,"notes":"short Chinese summary"}}',
        "Use pass only when the section is mathematically correct, grade/topic appropriate, source-distant, and public-ready.",
        "Use warn for non-blocking P2/P3 issues where the section remains usable after human review.",
        "Use fail for P0/P1 blockers such as mathematical errors, wrong answers, source artifacts, unsafe copy risk, missing required conditions, severe grade/topic mismatch, missing referenced visuals, or public-readiness blockers."
      ].join("\n")
    },
    {
      role: "user",
      content: JSON.stringify({
        task: `审核以下 ${batch.length} 个北师大版初中教材 section。`,
        sections: batch.map((item) => ({
          lessonId: item.lessonId,
          sectionId: item.sectionId,
          grade: item.grade,
          semester: item.semester,
          topicId: item.topicId,
          unitTitle: item.unitTitle,
          title: item.title,
          conceptIds: item.conceptIds,
          sectionTitle: item.sectionTitle,
          sectionType: item.sectionType,
          lessonContext: item.lessonContext,
          contentText: item.contentText
        })),
        safeRagEvidenceByLessonSection: Object.fromEntries(batch.map((item) => [reviewKey(item), item.safeRagEvidence]))
      })
    }
  ];
}

function parseJsonObject(text) {
  const trimmed = String(text ?? "").trim();
  if (!trimmed) throw new Error("empty model response");
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced) return JSON.parse(fenced[1]);
    const firstBrace = trimmed.indexOf("{");
    const lastBrace = trimmed.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
    throw new Error("response is not parseable JSON");
  }
}

function validateBatchResult(result, batch) {
  if (!result || !Array.isArray(result.items)) throw new Error("result.items is missing");
  const expectedKeys = new Set(batch.map(reviewKey));
  const seenKeys = new Set();
  for (const item of result.items) {
    const key = `${item.lessonId}::${item.sectionId}`;
    if (!expectedKeys.has(key)) throw new Error(`unexpected result id ${key}`);
    if (seenKeys.has(key)) throw new Error(`duplicate result id ${key}`);
    seenKeys.add(key);
    if (!validStatuses.includes(item.status)) throw new Error(`invalid status for ${key}`);
    if (!validSeverities.includes(item.severity)) throw new Error(`invalid severity for ${key}`);
    if (!Array.isArray(item.issueTags)) throw new Error(`issueTags must be an array for ${key}`);
    for (const tag of item.issueTags) {
      if (!validIssueTags.includes(tag)) throw new Error(`invalid issue tag ${tag} for ${key}`);
    }
    if (typeof item.rationaleZhHans !== "string") throw new Error(`rationaleZhHans must be a string for ${key}`);
    if (!(item.suggestedFixSummary === null || typeof item.suggestedFixSummary === "string")) {
      throw new Error(`suggestedFixSummary must be null or string for ${key}`);
    }
    if (!["high", "medium", "low"].includes(item.confidence)) throw new Error(`invalid confidence for ${key}`);
    if (item.status === "pass" && (item.severity !== "none" || item.issueTags.length || item.suggestedFixSummary !== null)) {
      throw new Error(`pass item has inconsistent gate fields for ${key}`);
    }
  }
  for (const key of expectedKeys) {
    if (!seenKeys.has(key)) throw new Error(`missing result id ${key}`);
  }
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function callDeepSeek({ apiKey, apiUrl, model, messages }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages,
        response_format: { type: "json_object" },
        thinking: { type: "disabled" },
        stream: false,
        temperature: 0.1,
        max_tokens: maxTokens
      }),
      signal: controller.signal
    });

    const text = await response.text();
    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }

    if (!response.ok) {
      const message = payload?.error?.message ?? text.slice(0, 300);
      throw new Error(`DeepSeek HTTP ${response.status}: ${message}`);
    }

    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      throw new Error("DeepSeek response did not include message content");
    }

    return {
      content,
      usage: payload?.usage ?? null,
      finishReason: payload?.choices?.[0]?.finish_reason ?? null
    };
  } finally {
    clearTimeout(timeout);
  }
}

function resolveProviderConfig() {
  const localEnv = readLocalEnv(path.join(projectRoot, ".env.local"));
  const apiKey = process.env.LLM_API_KEY || localEnv.LLM_API_KEY || process.env.OPENAI_API_KEY || localEnv.OPENAI_API_KEY;
  const apiUrl = process.env.LLM_API_URL || localEnv.LLM_API_URL || "https://api.deepseek.com/chat/completions";
  const model = process.env.LLM_MODEL || localEnv.LLM_MODEL || "deepseek-v4-pro";

  if (!apiKey) throw new Error("Missing LLM_API_KEY or OPENAI_API_KEY in process env or .env.local.");
  if (!new URL(apiUrl).hostname.includes("api.deepseek.com")) throw new Error(`Refusing non-DeepSeek endpoint: ${new URL(apiUrl).hostname}`);
  if (model !== "deepseek-v4-pro") throw new Error(`Refusing non-DeepSeek V4 Pro model: ${model}`);
  return { apiKey, apiUrl, model };
}

function batchFileName(batchNumber) {
  return path.join(batchDir, `batch-${String(batchNumber).padStart(3, "0")}.json`);
}

async function reviewBatch({ batch, batchNumber, config, force }) {
  const filePath = batchFileName(batchNumber);
  if (!force && fs.existsSync(filePath)) {
    const cached = JSON.parse(fs.readFileSync(filePath, "utf8"));
    validateBatchResult(cached.result, batch);
    return { ...cached, cached: true };
  }

  const messages = buildMessages(batch);
  let lastError = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const startedAt = new Date().toISOString();
      const response = await callDeepSeek({ ...config, messages });
      const result = parseJsonObject(response.content);
      validateBatchResult(result, batch);
      const record = {
        batchNumber,
        startedAt,
        completedAt: new Date().toISOString(),
        model: config.model,
        itemKeys: batch.map(reviewKey),
        usage: response.usage,
        finishReason: response.finishReason,
        result
      };
      fs.writeFileSync(filePath, `${JSON.stringify(record, null, 2)}\n`);
      return { ...record, cached: false };
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) await sleep(2500 * attempt);
    }
  }
  throw lastError;
}

function summarizeResults(records, reviewedItems) {
  const byKey = new Map(reviewedItems.map((item) => [reviewKey(item), item]));
  const itemResults = records.flatMap((record) =>
    record.result.items.map((result) => {
      const item = byKey.get(`${result.lessonId}::${result.sectionId}`);
      return {
        ...result,
        grade: item?.grade,
        semester: item?.semester,
        topicId: item?.topicId,
        unitTitle: item?.unitTitle,
        title: item?.title,
        sectionTitle: item?.sectionTitle,
        sectionType: item?.sectionType
      };
    })
  );
  const statusCounts = countBy(itemResults, (item) => item.status);
  const severityCounts = countBy(itemResults, (item) => item.severity);
  const issueTagCounts = countBy(itemResults.flatMap((item) => item.issueTags), (tag) => tag);
  const usage = records.reduce(
    (total, record) => {
      total.promptTokens += record.usage?.prompt_tokens ?? 0;
      total.completionTokens += record.usage?.completion_tokens ?? 0;
      total.totalTokens += record.usage?.total_tokens ?? 0;
      return total;
    },
    { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
  );
  const issues = itemResults.filter((item) => item.status !== "pass" || item.severity !== "none");
  const remediationQueue = itemResults.filter((item) => remediationSeverities.has(item.severity));
  const manualIssueRows = itemResults
    .filter((item) => item.status !== "pass" || manualReviewSeverities.has(item.severity))
    .map((item) => ({ ...item, reviewReason: item.severity === "none" ? "warn-review" : `${item.severity}-issue` }));
  const passSamplesByUnit = new Map();
  for (const item of itemResults.filter((row) => row.status === "pass")) {
    const unitKey = `${item.grade} ${item.semester} ${item.unitTitle || item.topicId}`;
    if (!passSamplesByUnit.has(unitKey)) passSamplesByUnit.set(unitKey, { ...item, reviewReason: "unit-pass-sample" });
  }
  const manualReviewQueue = [...manualIssueRows, ...passSamplesByUnit.values()];

  return {
    itemResults,
    statusCounts,
    severityCounts,
    issueTagCounts,
    usage,
    issues,
    remediationQueue,
    manualReviewQueue
  };
}

function writeQaOutputs({ records, reviewedItems, config, args }) {
  const summary = summarizeResults(records, reviewedItems);
  const generatedAt = new Date().toISOString();
  const resultJson = {
    generatedAt,
    model: config.model,
    apiHost: new URL(config.apiUrl).hostname,
    mode: args.mode,
    batchSize: args.batchSize,
    reviewedCount: summary.itemResults.length,
    statusCounts: summary.statusCounts,
    severityCounts: summary.severityCounts,
    issueTagCounts: summary.issueTagCounts,
    usage: summary.usage,
    issues: summary.issues,
    remediationQueue: summary.remediationQueue,
    manualReviewQueue: summary.manualReviewQueue,
    results: summary.itemResults
  };

  fs.writeFileSync(path.join(outputDir, "deepseek-lesson-qa-results.json"), `${JSON.stringify(resultJson, null, 2)}\n`);
  fs.writeFileSync(path.join(outputDir, "deepseek-lesson-qa-results.jsonl"), `${summary.itemResults.map((row) => JSON.stringify(row)).join("\n")}\n`);

  const columns = [
    "lessonId",
    "sectionId",
    "grade",
    "semester",
    "topicId",
    "unitTitle",
    "sectionTitle",
    "sectionType",
    "status",
    "severity",
    "issueTags",
    "confidence",
    "rationaleZhHans",
    "suggestedFixSummary"
  ];
  writeCsv(path.join(outputDir, "deepseek-lesson-qa-results.csv"), summary.itemResults, columns);
  writeCsv(path.join(outputDir, "deepseek-lesson-qa-issues.csv"), summary.issues, columns);
  writeCsv(path.join(outputDir, "deepseek-lesson-qa-remediation-queue.csv"), summary.remediationQueue, columns);
  writeCsv(path.join(outputDir, "deepseek-lesson-qa-manual-review-queue.csv"), summary.manualReviewQueue, [...columns, "reviewReason"]);

  const issuePreview = summary.issues.length
    ? summary.issues
        .slice(0, 80)
        .map(
          (item) =>
            `| \`${item.lessonId}\` | \`${item.sectionId}\` | ${item.grade} | ${item.status} | ${item.severity} | ${item.issueTags.join(", ") || "-"} | ${item.rationaleZhHans} |`
        )
        .join("\n")
    : "| None | - | - | - | - | - | - |";

  const markdown = `# DeepSeek V4 Pro Lesson QA - Mainland BNU Junior

- Date: ${localDateString()}
- Session ID: S18
- Scope: \`${path.relative(projectRoot, inputJson)}\`
- Mode: ${args.mode}
- Model: \`${config.model}\`
- API host: \`${new URL(config.apiUrl).hostname}\`
- Reviewed sections: ${summary.itemResults.length}
- Status counts: ${Object.entries(summary.statusCounts).map(([key, value]) => `${key} ${value}`).join(", ") || "none"}
- Severity counts: ${Object.entries(summary.severityCounts).map(([key, value]) => `${key} ${value}`).join(", ") || "none"}
- Issue tag counts: ${Object.entries(summary.issueTagCounts).map(([key, value]) => `${key} ${value}`).join(", ") || "none"}
- Manual review queue rows: ${summary.manualReviewQueue.length}
- Token usage: prompt ${summary.usage.promptTokens}, completion ${summary.usage.completionTokens}, total ${summary.usage.totalTokens}

## QA Gate Result

${summary.remediationQueue.length === 0
    ? "No P0/P1 remediation rows were found by DeepSeek in this run. S18 manual review is still required before public integration."
    : `DeepSeek flagged ${summary.remediationQueue.length} P0/P1 remediation row(s). Do not publish or integrate the lesson pack until fixes are made and QA is rerun.`}

## Issue Preview

| Lesson | Section | Grade | Status | Severity | Tags | Rationale |
| --- | --- | --- | --- | --- | --- | --- |
${issuePreview}

## Secret Hygiene

- The script read provider configuration locally only for \`--smoke\` or \`--full\`.
- No API key, request header, raw provider transcript, textbook source file path, OCR text, page image, page locator, or source text is recorded in this artifact.
- Safe BNU junior curriculum RAG, BNU assessment-pattern RAG, and shared zhongkao pattern cards were supplied only as metadata-safe review context.
`;
  fs.writeFileSync(path.join(outputDir, "deepseek-lesson-qa-summary.md"), markdown);

  const decision = `# S18 DeepSeek V4 Pro Lesson QA Decision - Mainland BNU Junior

- Date: ${localDateString()}
- Session ID: S18
- Decision: ${summary.remediationQueue.length === 0 ? "deepseek-lesson-qa-gate-passed-pending-manual-review" : "deepseek-lesson-qa-gate-blocked-pending-remediation"}
- Reviewed sections: ${summary.itemResults.length}
- P0/P1 remediation rows: ${summary.remediationQueue.length}
- Warn/fail issue rows: ${summary.issues.length}
- Manual review queue rows: ${summary.manualReviewQueue.length}
- App integration status: Blocked by design until S18 manual review signs off and S05/S18 separately approve lesson-data integration.
`;
  fs.writeFileSync(path.join(outputDir, "s18-lesson-qa-decision.md"), decision);
  return resultJson;
}

async function main() {
  const args = parseArgs(process.argv);
  fs.mkdirSync(outputDir, { recursive: true });

  let payload;
  try {
    payload = readLessonsPayload(inputJson);
  } catch (error) {
    if (error instanceof MissingLessonPackError) {
      const blockerPath = args.writeBlocker ? writeMissingLessonBlocker() : "";
      writeBlockedPreflight(error, blockerPath);
      console.error(`Blocked: ${error.message}`);
      process.exitCode = 2;
      return;
    }
    throw error;
  }

  const ragCards = loadRagCards();
  const lessons = normalizeLessons(payload);
  const items = reviewItemsFromLessons(lessons, ragCards);
  const preflightIssues = preflightReview(lessons, items);
  const preflightResult = writePreflightOutputs({ lessons, items, issues: preflightIssues, args });

  if (args.mode === "preflight") {
    console.log(`Preflight ${preflightResult.status}: ${lessons.length} lessons, ${items.length} sections, ${preflightIssues.length} issue(s).`);
    return;
  }

  if (preflightIssues.some((issue) => ["P0", "P1"].includes(issue.severity))) {
    console.error("Blocked: preflight has P0/P1 issues; fix them before live DeepSeek QA.");
    process.exitCode = 2;
    return;
  }

  const reviewedItems = args.mode === "smoke" ? smokeItems(items) : scopedItems(items, args);
  if (!reviewedItems.length) throw new Error("No lesson sections selected for DeepSeek QA.");

  const config = resolveProviderConfig();
  fs.mkdirSync(batchDir, { recursive: true });
  const batches = chunkRows(reviewedItems, args.batchSize);
  const records = [];
  for (let index = 0; index < batches.length; index += 1) {
    const record = await reviewBatch({
      batch: batches[index],
      batchNumber: index + 1,
      config,
      force: args.force
    });
    records.push(record);
    console.log(`Reviewed batch ${index + 1}/${batches.length}: ${record.itemKeys.length} section(s).${record.cached ? " cached" : ""}`);
  }

  const result = writeQaOutputs({ records, reviewedItems, config, args });
  console.log(`DeepSeek lesson QA complete: ${result.reviewedCount} section(s), ${result.remediationQueue.length} P0/P1 remediation row(s).`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
