import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");
const batchDir = path.join(__dirname, "batches");

const grades = ["P1", "P2", "P3", "P4", "P5", "P6"];
const semesters = ["upper", "lower"];
const types = ["multiple-choice", "fill-in", "short-answer"];
const typePrefixes = {
  "multiple-choice": "mc",
  "fill-in": "fi",
  "short-answer": "sa"
};
const typeQuotasByGradeSemester = {
  P1: {
    upper: { "multiple-choice": 45, "fill-in": 40, "short-answer": 15 },
    lower: { "multiple-choice": 45, "fill-in": 40, "short-answer": 15 }
  },
  P2: {
    upper: { "multiple-choice": 45, "fill-in": 40, "short-answer": 15 },
    lower: { "multiple-choice": 45, "fill-in": 40, "short-answer": 15 }
  },
  P3: {
    upper: { "multiple-choice": 38, "fill-in": 37, "short-answer": 25 },
    lower: { "multiple-choice": 37, "fill-in": 38, "short-answer": 25 }
  },
  P4: {
    upper: { "multiple-choice": 38, "fill-in": 37, "short-answer": 25 },
    lower: { "multiple-choice": 37, "fill-in": 38, "short-answer": 25 }
  },
  P5: {
    upper: { "multiple-choice": 30, "fill-in": 35, "short-answer": 35 },
    lower: { "multiple-choice": 30, "fill-in": 35, "short-answer": 35 }
  },
  P6: {
    upper: { "multiple-choice": 30, "fill-in": 35, "short-answer": 35 },
    lower: { "multiple-choice": 30, "fill-in": 35, "short-answer": 35 }
  }
};
const difficultyQuotas = {
  P1: {
    upper: { Foundation: 60, Core: 35, Challenge: 5 },
    lower: { Foundation: 60, Core: 35, Challenge: 5 }
  },
  P2: {
    upper: { Foundation: 60, Core: 35, Challenge: 5 },
    lower: { Foundation: 60, Core: 35, Challenge: 5 }
  },
  P3: {
    upper: { Foundation: 40, Core: 48, Challenge: 12 },
    lower: { Foundation: 40, Core: 47, Challenge: 13 }
  },
  P4: {
    upper: { Foundation: 40, Core: 48, Challenge: 12 },
    lower: { Foundation: 40, Core: 47, Challenge: 13 }
  },
  P5: {
    upper: { Foundation: 30, Core: 50, Challenge: 15, Exam: 5 },
    lower: { Foundation: 30, Core: 50, Challenge: 15, Exam: 5 }
  },
  P6: {
    upper: { Foundation: 30, Core: 50, Challenge: 15, Exam: 5 },
    lower: { Foundation: 30, Core: 50, Challenge: 15, Exam: 5 }
  }
};

const manualQuestionOverrides = {};

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key]) continue;
    const value = rawValue.replace(/^['"]|['"]$/g, "").trim();
    process.env[key] = value;
  }
}

function loadTsExport(filePath, exportName) {
  const source = fs.readFileSync(filePath, "utf8")
    .replace(/^import\s+.*;\s*$/gm, "")
    .replace(new RegExp(`export const ${exportName}: [^=]+ =`), `exports.${exportName} =`);
  const context = { exports: {} };
  vm.runInNewContext(source, context, { filename: filePath });
  return context.exports[exportName];
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function assessmentFamiliesFor(card) {
  const mapped = card.materialKinds.flatMap((kind) => {
    if (kind === "sync-practice" || kind === "tiered-practice" || kind === "calculation-practice") return ["lesson-practice"];
    if (kind === "unit-test") return ["unit-test"];
    if (kind === "topic-practice" || kind === "error-extension" || kind === "challenge-practice") return ["topic-drill"];
    if (kind === "midterm-final") return ["midterm", "final", "comprehensive"];
    if (kind === "comprehensive-assessment" || kind === "problem-solving") return ["comprehensive"];
    return [];
  });
  return unique([...(card.assessmentFamilies ?? []), ...mapped]);
}

function balancedSequence(counts) {
  const remaining = new Map(Object.entries(counts));
  const result = [];
  while (Array.from(remaining.values()).some((count) => count > 0)) {
    const next = Array.from(remaining.entries())
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    for (const [key, count] of next) {
      result.push(key);
      remaining.set(key, count - 1);
    }
  }
  return result;
}

function compactCurriculumCard(card) {
  return {
    id: card.id,
    grade: card.grade,
    semester: card.semester,
    unitTitle: card.unitTitle,
    conceptIds: card.conceptIds,
    competencyTags: card.competencyTags,
    skillTags: card.skillTags,
    misconceptionTags: card.misconceptionTags,
    safeSummary: card.safeSummary,
    generationGuidance: card.generationGuidance,
    prohibitedReuseNotes: card.prohibitedReuseNotes
  };
}

function compactPatternCard(card) {
  return {
    id: card.id,
    grade: card.grade,
    semester: card.semester,
    unitTitles: card.unitTitles,
    materialKinds: card.materialKinds,
    assessmentFamilies: assessmentFamiliesFor(card),
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

function buildPlan(curriculumCards, patternCards) {
  const rows = [];
  for (const grade of grades) {
    for (const semester of semesters) {
      const typePlan = balancedSequence(typeQuotasByGradeSemester[grade][semester]);
      const difficultyPlan = balancedSequence(difficultyQuotas[grade][semester]);
      if (typePlan.length !== 100 || difficultyPlan.length !== 100) {
        throw new Error(`Invalid quota plan for ${grade} ${semester}: type=${typePlan.length}, difficulty=${difficultyPlan.length}`);
      }
      const curriculumPool = curriculumCards.filter((card) => card.grade === grade && card.semester === semester);
      const fallbackCurriculumPool = curriculumCards.filter((card) => card.grade === grade);
      const patternPool = patternCards.filter((card) => card.grade === grade && card.semester === semester);
      if (!patternPool.length) throw new Error(`Missing pattern cards for ${grade} ${semester}`);

      const typeCounters = Object.fromEntries(types.map((type) => [type, 0]));
      for (let index = 0; index < 100; index += 1) {
        const pattern = patternPool[index % patternPool.length];
        const curriculum = (curriculumPool.length ? curriculumPool : fallbackCurriculumPool)[index % (curriculumPool.length || fallbackCurriculumPool.length)];
        const assessmentFamilies = assessmentFamiliesFor(pattern);
        const type = typePlan[index];
        const typePrefix = typePrefixes[type];
        typeCounters[type] += 1;
        rows.push({
          id: `pep-primary-rag2-${grade.toLowerCase()}-${semester}-${typePrefix}-${String(typeCounters[type]).padStart(3, "0")}`,
          grade,
          semester,
          unitTitle: pattern.unitTitles[index % pattern.unitTitles.length] ?? curriculum.unitTitle,
          conceptIds: unique([...(pattern.conceptIds ?? []), ...(curriculum?.conceptIds ?? [])]).slice(0, 8),
          difficulty: difficultyPlan[index],
          type,
          evidenceCardIds: curriculum ? [curriculum.id] : [],
          examPatternCardIds: [pattern.id],
          materialKind: pattern.materialKinds[index % pattern.materialKinds.length],
          assessmentFamily: assessmentFamilies[index % assessmentFamilies.length] ?? "lesson-practice"
        });
      }
    }
  }
  return rows;
}

function chunk(values, size) {
  const chunks = [];
  for (let index = 0; index < values.length; index += size) chunks.push(values.slice(index, index + size));
  return chunks;
}

function batchIdFor(targets) {
  return targets[0].id.replace(/^pep-primary-rag2-/, "");
}

function systemPrompt() {
  return [
    "你是 MAIS 的小学数学原创题生成与审核专家。",
    "任务是根据安全 RAG 摘要生成内地人教版小学数学原创题。",
    "必须使用简体中文。不得复制、改写、翻译、近似重构教材、练习册、试卷、答案、图表、页面、版式或解法原文。",
    "不得提到来源文件、PDF、DOCX、OCR、页码、截图、试卷原题、教材原题或任何 source locator。",
    "不要写“如图”“见图”“上图”“下图”“图中”，题目必须不依赖外部图片也能完整作答。",
    "每题必须唯一可解，选择题只有一个正确选项；不要输出“设计有误”“选项中没有”“答案不唯一”“重新计算”等自我纠错文字。",
    "解释必须直接支持 answer 字段，不能与 answer 或选项矛盾。",
    "解析控制在120个汉字以内，不要写推测、反复验证、题目修改建议或模型思考过程。",
    "只输出 JSON object，不要 Markdown，不要代码块。"
  ].join("\n");
}

function userPrompt({ targets, curriculumCards, patternCards }) {
  return JSON.stringify({
    task: `Generate exactly ${targets.length} original Mainland PEP primary math questions for the offline RAG v2 candidate bank.`,
    outputContract: {
      root: "questions",
      perQuestionFields: ["id", "promptZhHans", "optionsZhHans", "answer", "acceptedAnswers", "explanationZhHans"],
      rules: [
        `Return exactly one JSON object: {"questions":[...${targets.length} items...]}`,
        "Use the exact target id for each question.",
        "For multiple-choice, optionsZhHans must contain exactly 4 strings and answer must exactly equal one option.",
        "For fill-in and short-answer, optionsZhHans must be an empty array.",
        "acceptedAnswers must include the canonical answer.",
        "Explanation must be concise, age-appropriate, and show enough reasoning to verify the answer.",
        "Explanation must not say the question is wrong, under-specified, missing options, or has multiple possible answers.",
        "Explanation must be under 120 Chinese characters and must not include hidden reasoning, speculation, or prompt-repair notes.",
        "Do not invent unseen diagrams; any shape, table, clock, chart, or pattern must be fully described in text.",
        "Use only the target type, difficulty, grade, semester, unitTitle, and conceptIds.",
        "Create fresh numbers, contexts, diagrams-in-words, distractors, and solution paths."
      ]
    },
    targets,
    safeCurriculumEvidence: curriculumCards.map(compactCurriculumCard),
    safeExamPatternEvidence: patternCards.map(compactPatternCard)
  });
}

function extractJsonObject(text) {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return JSON.parse(trimmed);
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON object found in provider reply");
  return JSON.parse(match[0]);
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function postDeepSeek({ apiUrl, apiKey, model, messages, maxTokens = 8000, attempt = 0, useThinking = false }) {
  const body = {
    model,
    messages,
    response_format: { type: "json_object" },
    thinking: { type: useThinking ? "enabled" : "disabled" },
    ...(useThinking ? { reasoning_effort: "high" } : {}),
    stream: false,
    max_tokens: maxTokens,
    temperature: 0.55
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);
  try {
    let response;
    try {
      response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });
    } catch (error) {
      if (attempt < 5) {
        await sleep(5000 * (attempt + 1));
        return postDeepSeek({ apiUrl, apiKey, model, messages, maxTokens, attempt: attempt + 1, useThinking });
      }
      throw error;
    }
    const text = await response.text();
    if (!response.ok) {
      const safeText = text.replace(apiKey, "[REDACTED_API_KEY]").slice(0, 1200);
      if (response.status === 400 && /thinking|reasoning/i.test(safeText)) {
        const fallbackBodySupported = !useThinking;
        if (!fallbackBodySupported) return postDeepSeek({ apiUrl, apiKey, model, messages, maxTokens, attempt, useThinking: false });
      }
      if ((response.status === 429 || response.status >= 500) && attempt < 5) {
        await sleep(5000 * (attempt + 1));
        return postDeepSeek({ apiUrl, apiKey, model, messages, maxTokens, attempt: attempt + 1, useThinking });
      }
      throw new Error(`DeepSeek request failed with HTTP ${response.status}: ${safeText}`);
    }
    const parsed = JSON.parse(text);
    const content = parsed?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) throw new Error("DeepSeek reply did not include message.content");
    return content;
  } finally {
    clearTimeout(timeout);
  }
}

function sourceRiskText(question) {
  return [
    question.promptZhHans,
    ...(question.optionsZhHans ?? []),
    question.answer,
    ...(question.acceptedAnswers ?? []),
    question.explanationZhHans
  ].join("\n");
}

const forbiddenSourcePattern = /OCR|PDF|DOCX|docx|zip|截图|扫描|页码|第\s*\d+\s*页|教材原题|课本原题|试卷原题|原文|源文件|来源文件|如图|见图|上图|下图|(^|[，。；：、\s])图中/i;
const mathRedFlagPattern = /设计有误|选项中没有|没有最大|实际上没有|重新计算|但选项|但题目|假设图中|如果长是宽的两倍|答案不唯一|可能有误|题目误写|最终题目|重新生成|我将|根据输出要求|不能指出题目错误/i;

function normalizeMcAnswer(answer, options) {
  const text = String(answer ?? "").trim();
  const letter = text.match(/^([A-D])(?:[.．、]\s*)?$/)?.[1];
  if (letter && options.length === 4) {
    const index = "ABCD".indexOf(letter);
    return options.find((option) => option.match(new RegExp(`^\\s*${letter}\\s*[.．、]`))) ?? options[index] ?? text;
  }
  const labeledAnswer = text.match(/^([A-D])\s*[.．、]\s*(.+)$/);
  if (labeledAnswer) {
    const [, letterLabel, answerBody] = labeledAnswer;
    return options.find((option) => option === text || option === answerBody || option.match(new RegExp(`^\\s*${letterLabel}\\s*[.．、]\\s*${escapeRegex(answerBody)}\\s*$`))) ?? text;
  }
  return text;
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeQuestion(target, raw) {
  const promptZhHans = typeof raw.promptZhHans === "string" ? raw.promptZhHans.trim() : "";
  const explanationZhHans = typeof raw.explanationZhHans === "string" ? raw.explanationZhHans.trim() : "";
  const optionsZhHans = Array.isArray(raw.optionsZhHans) ? raw.optionsZhHans.map((value) => String(value).trim()).filter(Boolean) : [];
  const answer = target.type === "multiple-choice"
    ? normalizeMcAnswer(raw.answer, optionsZhHans)
    : typeof raw.answer === "string" ? raw.answer.trim() : "";
  const acceptedAnswers = Array.isArray(raw.acceptedAnswers)
    ? raw.acceptedAnswers.map((value) => String(value).trim()).filter(Boolean)
    : [];
  const errors = [];

  if (raw.id !== target.id) errors.push(`id mismatch: expected ${target.id}, got ${raw.id}`);
  if (!promptZhHans) errors.push("missing promptZhHans");
  if (!answer) errors.push("missing answer");
  if (!explanationZhHans) errors.push("missing explanationZhHans");
  if (target.type === "multiple-choice") {
    if (optionsZhHans.length !== 4) errors.push(`multiple-choice options length ${optionsZhHans.length}`);
    if (new Set(optionsZhHans).size !== 4) errors.push("multiple-choice options are not unique");
    if (optionsZhHans.filter((option) => option === answer).length !== 1) errors.push("multiple-choice answer does not match exactly one unique option");
  } else if (optionsZhHans.length) {
    errors.push(`${target.type} must not include options`);
  }
  const finalAcceptedAnswers = unique([answer, ...acceptedAnswers]);

  const override = manualQuestionOverrides[target.id] ?? {};
  const overriddenPromptZhHans = override.promptZhHans ?? promptZhHans;
  const overriddenOptionsZhHans = override.optionsZhHans ?? optionsZhHans;
  const overriddenAnswer = override.answer ?? answer;
  const overriddenAcceptedAnswers = override.acceptedAnswers ?? finalAcceptedAnswers;
  const overriddenExplanationZhHans = override.explanationZhHans ?? explanationZhHans;
  const mathRedFlag = mathRedFlagPattern.test([
    overriddenPromptZhHans,
    ...overriddenOptionsZhHans,
    overriddenAnswer,
    ...overriddenAcceptedAnswers,
    overriddenExplanationZhHans
  ].join("\n"));

  const normalized = {
    ...target,
    promptZhHans: overriddenPromptZhHans,
    optionsZhHans: target.type === "multiple-choice" ? overriddenOptionsZhHans : [],
    answer: overriddenAnswer,
    acceptedAnswers: unique([overriddenAnswer, ...overriddenAcceptedAnswers]),
    explanationZhHans: overriddenExplanationZhHans,
    sourceDistanceStatus: "passed-auto-source-scan",
    mathQaStatus: mathRedFlag ? "needs-rewrite-auto-red-flag" : "pending-s18-review",
    terminologyQaStatus: "pending-s18-review",
    reviewNotes: mathRedFlag
      ? "Auto red-flag scan found wording that may indicate an under-specified or self-contradictory item; revise before use."
      : override.promptZhHans || override.answer || override.explanationZhHans
        ? "Manual S18 correction applied after auto red-flag review; still pending full manual sampling before app integration."
      : "Generated offline with DeepSeek V4 Pro from MAIS safe-RAG metadata only; pending deterministic audit and S18 blind review before app integration."
  };

  if (forbiddenSourcePattern.test(sourceRiskText(normalized))) {
    normalized.sourceDistanceStatus = "needs-review";
  }

  return { question: normalized, errors };
}

function validateBatch(targets, rawQuestions) {
  if (!Array.isArray(rawQuestions)) throw new Error("Provider JSON missing questions array");
  if (rawQuestions.length !== targets.length) throw new Error(`Expected ${targets.length} questions, got ${rawQuestions.length}`);
  const normalized = [];
  const errors = [];
  for (const target of targets) {
    const raw = rawQuestions.find((question) => question?.id === target.id);
    if (!raw) {
      errors.push(`Missing generated question for ${target.id}`);
      continue;
    }
    const result = normalizeQuestion(target, raw);
    normalized.push(result.question);
    errors.push(...result.errors.map((error) => `${target.id}: ${error}`));
  }
  if (errors.length) throw new Error(errors.join("; "));
  return normalized;
}

async function generateBatch({ targets, curriculumCards, patternCards, apiUrl, apiKey, model }) {
  const batchId = batchIdFor(targets);
  const cachePath = path.join(batchDir, `${batchId}.json`);
  if (fs.existsSync(cachePath)) {
    const cached = JSON.parse(fs.readFileSync(cachePath, "utf8"));
    if (Array.isArray(cached.questions) && cached.questions.length === targets.length) {
      const normalized = validateBatch(targets, cached.questions);
      fs.writeFileSync(cachePath, `${JSON.stringify({ batchId, questions: normalized }, null, 2)}\n`);
      return normalized;
    }
  }

  const evidenceCardIds = unique(targets.flatMap((target) => target.evidenceCardIds));
  const examPatternCardIds = unique(targets.flatMap((target) => target.examPatternCardIds));
  const relevantCurriculumCards = curriculumCards.filter((card) => evidenceCardIds.includes(card.id));
  const relevantPatternCards = patternCards.filter((card) => examPatternCardIds.includes(card.id));

  const messages = [
    { role: "system", content: systemPrompt() },
    {
      role: "user",
      content: userPrompt({
        targets,
        curriculumCards: relevantCurriculumCards,
        patternCards: relevantPatternCards
      })
    }
  ];

  let lastError = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const content = await postDeepSeek({ apiUrl, apiKey, model, messages });
      const parsed = extractJsonObject(content);
      const normalized = validateBatch(targets, parsed.questions);
      fs.writeFileSync(cachePath, `${JSON.stringify({ batchId, questions: normalized }, null, 2)}\n`);
      return normalized;
    } catch (error) {
      lastError = error;
      if (attempt < 3) await sleep(1200 * attempt);
    }
  }
  throw new Error(`Batch ${batchId} failed after retries: ${lastError?.message ?? lastError}`);
}

async function generateTargetsWithFallback({ targets, curriculumCards, patternCards, apiUrl, apiKey, model }) {
  try {
    return await generateBatch({ targets, curriculumCards, patternCards, apiUrl, apiKey, model });
  } catch (error) {
    if (!/fetch failed|network|timeout|AbortError/i.test(String(error?.message ?? error)) || targets.length <= 1) {
      throw error;
    }
    const midpoint = Math.ceil(targets.length / 2);
    const leftTargets = targets.slice(0, midpoint);
    const rightTargets = targets.slice(midpoint);
    console.log(`splitting ${batchIdFor(targets)} after transient provider failure into ${leftTargets.length}+${rightTargets.length}`);
    const left = await generateTargetsWithFallback({ targets: leftTargets, curriculumCards, patternCards, apiUrl, apiKey, model });
    const right = await generateTargetsWithFallback({ targets: rightTargets, curriculumCards, patternCards, apiUrl, apiKey, model });
    return [...left, ...right];
  }
}

function csvEscape(value) {
  const text = (Array.isArray(value) ? value.join(" | ") : String(value ?? "")).replace(/\s*\r?\n\s*/g, " ");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function writeJsonl(filePath, rows) {
  fs.writeFileSync(filePath, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`);
}

function writeCsv(filePath, rows, columns) {
  const lines = [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(","))
  ];
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

function countBy(rows, keyFn) {
  const counts = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function buildCoverageRows(questions) {
  const grouped = countBy(questions, (question) => [
    question.grade,
    question.semester,
    question.unitTitle,
    question.conceptIds[0] ?? "",
    question.type,
    question.difficulty,
    question.evidenceCardIds.join("|"),
    question.examPatternCardIds.join("|")
  ].join("\t"));
  return Array.from(grouped.entries()).map(([key, count]) => {
    const [grade, semester, unitTitle, primaryConceptId, type, difficulty, evidenceCardIds, examPatternCardIds] = key.split("\t");
    return { grade, semester, unitTitle, primaryConceptId, type, difficulty, count, evidenceCardIds, examPatternCardIds };
  }).sort((a, b) => a.grade.localeCompare(b.grade) || a.semester.localeCompare(b.semester) || a.unitTitle.localeCompare(b.unitTitle));
}

function buildQaReport({ questions, plan, model, apiUrl, startedAt, finishedAt, sourceCards, patternCards }) {
  const total = questions.length;
  const gradeCounts = Object.fromEntries(countBy(questions, (question) => question.grade));
  const semesterCounts = Object.fromEntries(countBy(questions, (question) => `${question.grade}-${question.semester}`));
  const typeCounts = Object.fromEntries(countBy(questions, (question) => `${question.grade}-${question.semester}-${question.type}`));
  const difficultyCounts = Object.fromEntries(countBy(questions, (question) => `${question.grade}-${question.difficulty}`));
  const duplicateIds = Array.from(countBy(questions, (question) => question.id).entries()).filter(([, count]) => count > 1).map(([id]) => id);
  const sourceRiskRows = questions.filter((question) => question.sourceDistanceStatus !== "passed-auto-source-scan");
  const missingEvidenceRows = questions.filter((question) => !question.evidenceCardIds.length || !question.examPatternCardIds.length);
  const malformedMcRows = questions.filter((question) => question.type === "multiple-choice" && (
    question.optionsZhHans.length !== 4 ||
    new Set(question.optionsZhHans).size !== 4 ||
    question.optionsZhHans.filter((option) => option === question.answer).length !== 1
  ));
  const missingAcceptedRows = questions.filter((question) => !question.acceptedAnswers.length);
  const missingExplanationRows = questions.filter((question) => !question.explanationZhHans.trim());
  const mathRedFlagRows = questions.filter((question) => question.mathQaStatus === "needs-rewrite-auto-red-flag");
  const allChecksPass = (
    total === 1200 &&
    plan.length === 1200 &&
    grades.every((grade) => gradeCounts[grade] === 200) &&
    grades.every((grade) => semesters.every((semester) => semesterCounts[`${grade}-${semester}`] === 100)) &&
    duplicateIds.length === 0 &&
    missingEvidenceRows.length === 0 &&
    malformedMcRows.length === 0 &&
    missingAcceptedRows.length === 0 &&
    missingExplanationRows.length === 0
  );

  return `# Mainland PEP Primary Generated Bank V2 QA Report

- Date: 2026-05-23
- Session ID: S18
- Generator: DeepSeek API via project server-side \`LLM_API_KEY\` from local \`.env.local\`
- Model: \`${model}\`
- API host: \`${new URL(apiUrl).host}\`
- Started: ${startedAt}
- Finished: ${finishedAt}
- Generation status: ${allChecksPass ? "generation-complete-pending-audit" : "needs-rewrite"}
- Verdict: ${allChecksPass ? "Generation structure/count/schema QA passed for the offline candidate package; independent solvability audit and S18 blind review are still required before app integration." : "Needs structural remediation before use."}

## Scope

- Generated 1200 original Simplified Chinese candidate questions for Mainland PEP primary mathematics.
- Distribution target: 200 questions per P1-P6 grade, 100 per semester.
- Type quota target by grade: P1-P2 90 multiple-choice / 80 fill-in / 30 short-answer; P3-P4 75 / 75 / 50; P5-P6 60 / 70 / 70.
- Difficulty quota target by grade: P1-P2 Foundation/Core/Challenge 120/70/10; P3-P4 80/95/25; P5-P6 Foundation/Core/Challenge/Exam 60/100/30/10.
- This package is offline only. It does not edit \`data/questions.ts\`, \`types/index.ts\`, app UI, API routes, source archives, extracted text, OCR, screenshots, page notes, or embeddings.
- RAG evidence source: ${sourceCards.length} committed primary curriculum safe cards and ${patternCards.length} committed primary exam-pattern safe cards.

## DeepSeek Secret Hygiene

- The script read \`LLM_API_KEY\` locally and sent it only as an Authorization header.
- No API key, request header, raw prompt transcript, source file path, OCR text, page image, page number, or source locator is written into these artifacts.
- Batch cache files contain parsed generated questions only.

## Count Checks

- Total questions: ${total} / 1200.
- Duplicate IDs: ${duplicateIds.length ? duplicateIds.join(", ") : "none"}.
- Missing evidence rows: ${missingEvidenceRows.length}.
- Source-distance risk rows: ${sourceRiskRows.length}.
- Math red-flag rows: ${mathRedFlagRows.length}.
- Malformed multiple-choice rows: ${malformedMcRows.length}.
- Missing accepted-answer rows: ${missingAcceptedRows.length}.
- Missing explanation rows: ${missingExplanationRows.length}.

## Grade Counts

${grades.map((grade) => `- ${grade}: ${gradeCounts[grade] ?? 0} / 200`).join("\n")}

## Semester Counts

${grades.flatMap((grade) => semesters.map((semester) => `- ${grade} ${semester}: ${semesterCounts[`${grade}-${semester}`] ?? 0} / 100`)).join("\n")}

## Type Quota Checks

${grades.flatMap((grade) => semesters.flatMap((semester) => types.map((type) => {
  const expected = typeQuotasByGradeSemester[grade][semester][type];
  const actual = typeCounts[`${grade}-${semester}-${type}`] ?? 0;
  return `- ${grade} ${semester} ${type}: ${actual} / ${expected}`;
}))).join("\n")}

## Difficulty Quota Checks

${grades.flatMap((grade) => Object.entries(difficultyQuotas[grade].upper).map(([difficulty, upperCount]) => {
  const expected = upperCount + difficultyQuotas[grade].lower[difficulty];
  const actual = difficultyCounts[`${grade}-${difficulty}`] ?? 0;
  return `- ${grade} ${difficulty}: ${actual} / ${expected}`;
})).join("\n")}

## Manual QA Status

- \`mathQaStatus\`: kept as \`pending-s18-review\` for generated rows until \`audit-solvability.mjs\` independently proves deterministic rows.
- Rows with obvious self-contradiction, under-specified visual references, answer-design caveats, or model-admitted design issues are marked \`needs-rewrite-auto-red-flag\`.
- \`terminologyQaStatus\`: kept as \`pending-s18-review\`; the generation prompt requires Simplified Chinese Mainland mathematics terminology.
- Required next step before app integration: run the v2 solvability/source-safety audit, then complete the 180-row blind S18 manual review queue. Pending rows are not app-promotable.

## Files

- \`questions.jsonl\`
- \`questions.csv\`
- \`coverage-matrix.csv\`
- \`generation-status.md\`
- \`qa-report.md\`
- \`generate-with-deepseek.mjs\`
- \`batches/*.json\` resumable parsed batch cache
`;
}

function buildGenerationStatus({ questions, model, apiUrl, startedAt, finishedAt }) {
  const gradeCounts = Object.fromEntries(countBy(questions, (question) => question.grade));
  const semesterCounts = Object.fromEntries(countBy(questions, (question) => `${question.grade}-${question.semester}`));
  const duplicateIds = Array.from(countBy(questions, (question) => question.id).entries()).filter(([, count]) => count > 1).map(([id]) => id);
  const structuralPass =
    questions.length === 1200 &&
    grades.every((grade) => gradeCounts[grade] === 200) &&
    grades.every((grade) => semesters.every((semester) => semesterCounts[`${grade}-${semester}`] === 100)) &&
    duplicateIds.length === 0;
  return `# Mainland PEP Primary Generated Bank V2 Generation Status

- Date: 2026-05-23
- Session ID: S18
- Package: \`coordination/content-qa/mainland-pep-primary-generated-bank-v2/\`
- Status: ${structuralPass ? "generation-complete-pending-audit" : "needs-rewrite"}
- Candidate release decision: not app-promotable; pending solvability audit and S18 manual review.
- Model: \`${model}\`
- API host: \`${new URL(apiUrl).host}\`
- Started: ${startedAt}
- Finished: ${finishedAt}
- Total generated rows: ${questions.length}/1200
- Duplicate IDs: ${duplicateIds.length ? duplicateIds.join(", ") : "none"}

## Scope Boundaries

- Candidate-only offline package.
- No production question bank, Practice Arena, UI, API route, shared type, or real env file was modified.
- No API key, raw prompt transcript, source file path, OCR text, page number, source locator, page image, answer-source text, or protected layout is recorded.
- Every row is generated from committed safe curriculum cards plus committed exam-pattern cards and remains pending S18 review unless the audit marks it \`approved-deterministic\`.
`;
}

async function main() {
  loadEnvFile(path.join(rootDir, ".env.local"));
  const apiKey = process.env.LLM_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim();
  const apiUrl = process.env.LLM_API_URL?.trim() || "https://api.deepseek.com/chat/completions";
  const model = process.env.LLM_MODEL?.trim() || "deepseek-v4-pro";
  if (!apiKey) throw new Error("Missing LLM_API_KEY or OPENAI_API_KEY in local environment");
  if (!new URL(apiUrl).host.includes("api.deepseek.com")) {
    throw new Error(`Refusing to run non-DeepSeek endpoint for this task: ${new URL(apiUrl).host}`);
  }
  if (model !== "deepseek-v4-pro") {
    throw new Error(`Refusing to run non-DeepSeek V4 Pro model for this task: ${model}`);
  }

  fs.mkdirSync(batchDir, { recursive: true });
  const startedAt = new Date().toISOString();
  const curriculumCards = loadTsExport(path.join(rootDir, "data/rag/mainlandPepPrimary.ts"), "mainlandPepPrimaryRagCards");
  const patternCards = loadTsExport(path.join(rootDir, "data/rag/mainlandPepPrimaryExamPatterns.ts"), "mainlandPepPrimaryExamPatternCards");
  const plan = buildPlan(curriculumCards, patternCards);
  const batches = chunk(plan, 10);
  const questions = [];

  console.log(`DeepSeek generation starting: ${batches.length} batches, model=${model}, endpoint=${new URL(apiUrl).host}`);
  for (let index = 0; index < batches.length; index += 1) {
    const targets = batches[index];
    const batchId = batchIdFor(targets);
    console.log(`batch ${index + 1}/${batches.length}: ${batchId}`);
    const batchQuestions = await generateTargetsWithFallback({ targets, curriculumCards, patternCards, apiUrl, apiKey, model });
    questions.push(...batchQuestions);
  }

  questions.sort((a, b) => a.id.localeCompare(b.id));
  writeJsonl(path.join(__dirname, "questions.jsonl"), questions);
  writeCsv(path.join(__dirname, "questions.csv"), questions, [
    "id",
    "grade",
    "semester",
    "unitTitle",
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
    "materialKind",
    "assessmentFamily",
    "sourceDistanceStatus",
    "mathQaStatus",
    "terminologyQaStatus",
    "reviewNotes"
  ]);
  writeCsv(path.join(__dirname, "coverage-matrix.csv"), buildCoverageRows(questions), [
    "grade",
    "semester",
    "unitTitle",
    "primaryConceptId",
    "type",
    "difficulty",
    "count",
    "evidenceCardIds",
    "examPatternCardIds"
  ]);
  const finishedAt = new Date().toISOString();
  fs.writeFileSync(path.join(__dirname, "generation-status.md"), buildGenerationStatus({
    questions,
    model,
    apiUrl,
    startedAt,
    finishedAt
  }));
  fs.writeFileSync(path.join(__dirname, "qa-report.md"), buildQaReport({
    questions,
    plan,
    model,
    apiUrl,
    startedAt,
    finishedAt,
    sourceCards: curriculumCards,
    patternCards
  }));
  console.log("DeepSeek generation complete: wrote questions.jsonl, questions.csv, coverage-matrix.csv, generation-status.md, qa-report.md");
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
