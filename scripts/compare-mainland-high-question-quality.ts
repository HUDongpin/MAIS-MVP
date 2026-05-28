import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  mainlandPepHighQuestionGenerationMetadata,
  mainlandPepHighRagV4QuestionGenerationMetadata,
  mainlandPepHighRagV4Questions,
  mainlandPepHighRagV3Questions,
  mainlandPepHighRagV2Questions,
  mainlandPepHighSeedV1Questions
} from "../data/mainlandPepHighQuestions";
import { mainlandPepHighTopics } from "../data/mainlandPepHighTopics";
import { mainlandPepHighRagCards } from "../data/rag/mainlandPepHigh";
import { mainlandPepHighExamPatternCards } from "../data/rag/mainlandPepHighExamPatterns";
import type { Difficulty, GradeId, Question, QuestionType } from "../types";

type BatchId = "seed-v1" | "rag-v2" | "rag-v3" | "rag-v4";
type ReviewRecommendation = "pass" | "sample-review" | "manual-review" | "blocker-review";
type SeniorGrade = Extract<GradeId, "S4" | "S5" | "S6">;
type GeneratedQuestionType = Exclude<QuestionType, "graph">;

export type MainlandHighQuestionQaRow = {
  batch: BatchId;
  questionId: string;
  grade: GradeId;
  topicId: string;
  type: QuestionType;
  difficulty: Difficulty;
  qualityScore: number;
  knowledgeMatchScore: number;
  solvabilityScore: number;
  overallScore: number;
  evidenceCardIds: string[];
  examPatternCardIds: string[];
  riskFlags: string[];
  reviewRecommendation: ReviewRecommendation;
};

type ScoreSummary = {
  count: number;
  qualityScore: number;
  knowledgeMatchScore: number;
  solvabilityScore: number;
  overallScore: number;
};

export type MainlandHighQuestionQualityComparisonReport = {
  reportDate: string;
  generatedAt: string;
  comparison: {
    baselineBatch: "seed-v1";
    ragBatches: ["rag-v2", "rag-v3", "rag-v4"];
    noRawSourceAccess: true;
  };
  summary: {
    rows: number;
    batchSummaries: Record<BatchId, ScoreSummary>;
    deltas: Record<"rag-v2" | "rag-v3" | "rag-v4", ScoreSummary>;
    recommendationCounts: Record<BatchId, Record<ReviewRecommendation, number>>;
    riskFlagCounts: Record<BatchId, Record<string, number>>;
  };
  groups: {
    byGrade: Record<BatchId, Partial<Record<SeniorGrade, ScoreSummary>>>;
    byType: Record<BatchId, Partial<Record<GeneratedQuestionType, ScoreSummary>>>;
    byDifficulty: Record<BatchId, Partial<Record<Difficulty, ScoreSummary>>>;
    byTopic: Record<BatchId, Record<string, ScoreSummary>>;
  };
  rows: MainlandHighQuestionQaRow[];
  sampleReviewQueue: MainlandHighQuestionQaRow[];
  topIssueRows: MainlandHighQuestionQaRow[];
  assumptions: string[];
};

const seniorGrades: SeniorGrade[] = ["S4", "S5", "S6"];
const generatedTypes: GeneratedQuestionType[] = ["multiple-choice", "fill-in", "short-answer"];
const batchOrder: BatchId[] = ["seed-v1", "rag-v2", "rag-v3", "rag-v4"];
const recommendations: ReviewRecommendation[] = ["pass", "sample-review", "manual-review", "blocker-review"];

const topicById = new Map(mainlandPepHighTopics.map((topic) => [topic.id, topic]));
const ragCardById = new Map(mainlandPepHighRagCards.map((card) => [card.id, card]));
const examPatternCardById = new Map(mainlandPepHighExamPatternCards.map((card) => [card.id, card]));
const generationMetadataByQuestionId = {
  ...mainlandPepHighQuestionGenerationMetadata,
  ...mainlandPepHighRagV4QuestionGenerationMetadata
};

const focusTopicIds = [
  "pep-high-s4-trigonometry",
  "pep-high-s5-sequences",
  "pep-high-s5-derivatives",
  "pep-high-s5-space-vectors",
  "pep-high-s6-probability-statistics-synthesis",
  "pep-high-s6-analytic-geometry-synthesis"
];

const topicConceptHints: Record<string, string[]> = {
  "pep-high-s4-sets-logic": ["sets", "logic", "conditions", "quantifiers", "集合", "逻辑"],
  "pep-high-s4-quadratic-inequalities": ["quadratic", "inequality", "basic-inequality", "二次", "不等式"],
  "pep-high-s4-function-properties": ["function", "domain", "range", "monotonicity", "parity", "函数"],
  "pep-high-s4-exp-log": ["exponential", "logarithmic", "inverse", "指数", "对数"],
  "pep-high-s4-trigonometry": ["trigonometric", "unit-circle", "period", "三角"],
  "pep-high-s4-plane-vectors": ["plane-vectors", "dot-product", "vector", "向量"],
  "pep-high-s4-complex-numbers": ["complex", "complex-plane", "复数"],
  "pep-high-s4-solid-geometry-intro": ["solid-geometry", "parallel", "perpendicular", "立体几何"],
  "pep-high-s4-statistics": ["statistics", "sampling", "variance", "统计"],
  "pep-high-s4-probability": ["probability", "random-events", "概率"],
  "pep-high-s5-space-vectors": ["space-vectors", "solid-geometry", "line-plane-angle", "空间向量"],
  "pep-high-s5-lines-circles": ["line", "circle", "analytic-geometry", "直线", "圆"],
  "pep-high-s5-conics": ["ellipse", "hyperbola", "parabola", "conic", "圆锥曲线"],
  "pep-high-s5-sequences": ["sequences", "recursion", "summation", "数列"],
  "pep-high-s5-derivatives": ["derivatives", "monotonicity", "optimization", "导数"],
  "pep-high-s6-counting": ["counting", "permutations", "combinations", "计数"],
  "pep-high-s6-random-variables": ["random-variables", "distribution", "expectation", "随机变量"],
  "pep-high-s6-bivariate-data": ["bivariate", "correlation", "regression", "成对数据"],
  "pep-high-s6-derivative-synthesis": ["derivatives", "function-inequalities", "导数"],
  "pep-high-s6-analytic-geometry-synthesis": ["conic", "analytic-geometry", "line-conic", "圆锥曲线"],
  "pep-high-s6-probability-statistics-synthesis": ["probability", "statistics", "random-events", "概率", "统计"],
  "pep-high-s6-exam-practice": ["derivatives", "analytic-geometry", "probability", "sequences", "综合"]
};

const sourceCopyPatterns = [
  "高考真题",
  "官方解析",
  "教材原文",
  "答案原句",
  "解析卷",
  "空白卷",
  /第[0-9０-９]+页/,
  /page [0-9]+/i,
  /p\.[0-9]+/i
];

function round(value: number) {
  return Math.round(value * 10) / 10;
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, round(value)));
}

function textOf(question: Question) {
  return [
    question.prompt.en,
    question.prompt.zh,
    question.explanation.en,
    question.explanation.zh,
    ...(question.options ?? []).flatMap((option) => [option.en, option.zh]),
    question.answer,
    ...(question.acceptedAnswers ?? [])
  ].join(" ");
}

function normalizeAnswer(value: string) {
  return value.toLowerCase().replace(/\s+/g, "").replace(/\\\(|\\\)/g, "");
}

function canonicalPrompt(question: Question) {
  return question.prompt.zh
    .toLowerCase()
    .replace(/原创(诊断|计算|建模|推理|复习)练习\s*[0-9]+：/g, "")
    .replace(/original\s+(diagnostic|calculation|modeling|reasoning|review)\s+item\s+[0-9]+:/g, "")
    .replace(/rag-v3\s+(概念辨析|参数讨论|反例判断|图像信息|建模情境|误区诊断|综合拆步)\s+[0-9]+（[^）]+）：/g, "")
    .replace(/rag-v3\s+(concept-check|parameter discussion|counterexample check|graph-information|modeling context|misconception diagnosis|synthesis step)\s+[0-9]+\s+for\s+[^:]+:/g, "")
    .replace(/rag-v4\s+候选题\s+[0-9]+（[^）]+）：(安全抽象|题型结构|误区修正|多步推理|表征转换|建模迁移|运算复核)(选择题|填空题|解答题)任务。/g, "")
    .replace(/rag-v4\s+candidate\s+[0-9]+\s+for\s+[^:]+:\s+(safe abstraction|exam-structure|misconception repair|multi-step reasoning|representation switch|modeling transfer|calculation audit)\s+(multiple-choice|fill-in|short-answer)\s+task\./g, "")
    .replace(/\\\([^)]*\\\)/g, "\\(math\\)")
    .replace(/[0-9]+(?:\.[0-9]+)?/g, "#")
    .replace(/[a-z]\^\{?[0-9]+\}?/g, "x^#")
    .replace(/\s+/g, "");
}

function promptStatsFor(questions: Question[]) {
  const exactCounts = new Map<string, number>();
  const canonicalCounts = new Map<string, number>();

  questions.forEach((question) => {
    const exact = question.prompt.zh.replace(/\s+/g, "");
    const canonical = canonicalPrompt(question);
    exactCounts.set(exact, (exactCounts.get(exact) ?? 0) + 1);
    canonicalCounts.set(canonical, (canonicalCounts.get(canonical) ?? 0) + 1);
  });

  return { exactCounts, canonicalCounts };
}

function riskHasSourceCopy(text: string) {
  return sourceCopyPatterns.some((pattern) => typeof pattern === "string" ? text.includes(pattern) : pattern.test(text));
}

function uniqueOptionCount(question: Question) {
  return new Set((question.options ?? []).map((option) => normalizeAnswer(option.en))).size;
}

function answerOptionHits(question: Question) {
  const answer = normalizeAnswer(question.answer);
  return (question.options ?? []).filter((option) => normalizeAnswer(option.en) === answer || normalizeAnswer(option.zh) === answer).length;
}

function flagPush(flags: string[], condition: boolean, flag: string) {
  if (condition) flags.push(flag);
}

function qualityAssessment(question: Question, stats: ReturnType<typeof promptStatsFor>) {
  const flags: string[] = [];
  const promptZh = question.prompt.zh.trim();
  const promptEn = question.prompt.en.trim();
  const explanationZh = question.explanation.zh.trim();
  const explanationEn = question.explanation.en.trim();
  const exactPrompt = promptZh.replace(/\s+/g, "");
  const canonical = canonicalPrompt(question);

  flagPush(flags, !promptZh || !promptEn, "missing-bilingual-prompt");
  flagPush(flags, !explanationZh || !explanationEn, "missing-bilingual-explanation");
  flagPush(flags, promptZh.length < 12, "prompt-too-short");
  flagPush(flags, explanationZh.length < 10, "explanation-too-short");
  flagPush(flags, riskHasSourceCopy(textOf(question)), "source-copying-artifact");
  flagPush(flags, (stats.exactCounts.get(exactPrompt) ?? 0) > 1, "exact-prompt-duplicate");
  flagPush(flags, (stats.canonicalCounts.get(canonical) ?? 0) > 8, "near-duplicate-template-cluster");

  if (question.type === "multiple-choice") {
    flagPush(flags, (question.options ?? []).length !== 4, "multiple-choice-option-count");
    flagPush(flags, uniqueOptionCount(question) !== (question.options ?? []).length, "duplicate-options");
    flagPush(flags, answerOptionHits(question) !== 1, "multiple-choice-answer-not-unique");
  } else {
    flagPush(flags, Boolean(question.options?.length), "non-choice-has-options");
  }

  const penaltyByFlag: Record<string, number> = {
    "missing-bilingual-prompt": 40,
    "missing-bilingual-explanation": 35,
    "prompt-too-short": 10,
    "explanation-too-short": 10,
    "source-copying-artifact": 60,
    "exact-prompt-duplicate": 18,
    "near-duplicate-template-cluster": 8,
    "multiple-choice-option-count": 35,
    "duplicate-options": 15,
    "multiple-choice-answer-not-unique": 35,
    "non-choice-has-options": 10
  };

  const score = 100 - flags.reduce((total, flag) => total + (penaltyByFlag[flag] ?? 0), 0);
  return { score: clampScore(score), flags };
}

function knowledgeAssessment(question: Question) {
  const flags: string[] = [];
  const topic = topicById.get(question.topicId);
  const metadata = generationMetadataByQuestionId[question.id];
  const evidenceCards = metadata?.evidenceCardIds
    .map((cardId) => ragCardById.get(cardId))
    .filter((card): card is NonNullable<typeof card> => Boolean(card)) ?? [];
  const invalidEvidenceCardIds = metadata?.evidenceCardIds.filter((cardId) => !ragCardById.has(cardId)) ?? [];
  const invalidExamPatternIds = metadata?.examPatternCardIds.filter((cardId) => !examPatternCardById.has(cardId)) ?? [];
  const evidenceText = evidenceCards
    .map((card) => [card.chapter, ...card.conceptIds, ...card.competencyTags, ...card.itemTypeTags, card.safeSummary].join(" "))
    .join(" ")
    .toLowerCase();
  const hints = topicConceptHints[question.topicId] ?? [];
  const conceptSupported = hints.length === 0 || hints.some((hint) => evidenceText.includes(hint.toLowerCase()));

  let score = 0;
  if (topic && topic.grade === question.grade) score += 40;
  else flags.push("topic-grade-mismatch");

  if (metadata) score += 20;
  else flags.push("missing-generation-metadata");

  if (metadata?.evidenceCardIds.length) score += 15;
  else flags.push("missing-evidence-card");

  if (invalidEvidenceCardIds.length === 0 && invalidExamPatternIds.length === 0) score += 10;
  else flags.push("invalid-evidence-card-id");

  if (conceptSupported) score += 10;
  else flags.push("weak-concept-evidence-match");

  if (question.difficulty && topic) score += 5;
  else flags.push("missing-difficulty");

  return { score: clampScore(score), flags };
}

function solvabilityAssessment(question: Question) {
  const flags: string[] = [];
  const answer = question.answer.trim();
  const explanation = `${question.explanation.en} ${question.explanation.zh}`;
  const prompt = `${question.prompt.en} ${question.prompt.zh}`;
  const normalizedAnswer = normalizeAnswer(answer);
  const normalizedExplanation = normalizeAnswer(explanation);

  let score = 0;
  if (answer) score += 20;
  else flags.push("missing-answer");

  if (explanation.trim()) score += 20;
  else flags.push("missing-explanation");

  if (prompt.length > 20 && /\\\(|[0-9]|x|y|函数|概率|向量|数列|导数|集合/.test(prompt)) score += 15;
  else flags.push("weak-prompt-solvability-context");

  if (question.type === "multiple-choice") {
    const options = question.options ?? [];
    const hits = answerOptionHits(question);
    if (options.length === 4) score += 15;
    else flags.push("multiple-choice-option-count");
    if (uniqueOptionCount(question) === options.length) score += 10;
    else flags.push("duplicate-options");
    if (hits === 1) score += 20;
    else flags.push("answer-not-uniquely-in-options");
  } else {
    if (normalizedAnswer && normalizedExplanation.includes(normalizedAnswer)) score += 20;
    else flags.push("answer-not-shown-in-explanation");
    if (/^-?[0-9]+(?:\.[0-9]+)?$|^[0-9]+\/[0-9]+$|[a-z]|sqrt|\\/.test(answer)) score += 10;
    else flags.push("answer-format-needs-review");
    if (!question.options?.length) score += 15;
    else flags.push("non-choice-has-options");
  }

  return { score: clampScore(score), flags };
}

function recommendationFor(row: Omit<MainlandHighQuestionQaRow, "reviewRecommendation">): ReviewRecommendation {
  const blockerFlags = new Set([
    "source-copying-artifact",
    "topic-grade-mismatch",
    "missing-answer",
    "answer-not-uniquely-in-options",
    "multiple-choice-answer-not-unique",
    "invalid-evidence-card-id"
  ]);
  if (row.riskFlags.some((flag) => blockerFlags.has(flag))) return "blocker-review";
  if (Math.min(row.qualityScore, row.knowledgeMatchScore, row.solvabilityScore) < 70) return "manual-review";
  if (row.overallScore < 85 || row.riskFlags.length > 0) return "sample-review";
  return "pass";
}

function assessBatch(batch: BatchId, questions: Question[]) {
  const stats = promptStatsFor(questions);
  return questions.map((question): MainlandHighQuestionQaRow => {
    const quality = qualityAssessment(question, stats);
    const knowledge = knowledgeAssessment(question);
    const solvability = solvabilityAssessment(question);
    const metadata = generationMetadataByQuestionId[question.id];
    const partialRow = {
      batch,
      questionId: question.id,
      grade: question.grade,
      topicId: question.topicId,
      type: question.type,
      difficulty: question.difficulty,
      qualityScore: quality.score,
      knowledgeMatchScore: knowledge.score,
      solvabilityScore: solvability.score,
      overallScore: clampScore((quality.score + knowledge.score + solvability.score) / 3),
      evidenceCardIds: metadata?.evidenceCardIds ?? [],
      examPatternCardIds: metadata?.examPatternCardIds ?? [],
      riskFlags: Array.from(new Set([...quality.flags, ...knowledge.flags, ...solvability.flags]))
    };

    return {
      ...partialRow,
      reviewRecommendation: recommendationFor(partialRow)
    };
  });
}

function average(rows: MainlandHighQuestionQaRow[], key: keyof Pick<MainlandHighQuestionQaRow, "qualityScore" | "knowledgeMatchScore" | "solvabilityScore" | "overallScore">) {
  if (!rows.length) return 0;
  return round(rows.reduce((total, row) => total + row[key], 0) / rows.length);
}

function summarizeRows(rows: MainlandHighQuestionQaRow[]): ScoreSummary {
  return {
    count: rows.length,
    qualityScore: average(rows, "qualityScore"),
    knowledgeMatchScore: average(rows, "knowledgeMatchScore"),
    solvabilityScore: average(rows, "solvabilityScore"),
    overallScore: average(rows, "overallScore")
  };
}

function recommendationCounts(rows: MainlandHighQuestionQaRow[]) {
  const counts = Object.fromEntries(recommendations.map((recommendation) => [recommendation, 0])) as Record<ReviewRecommendation, number>;
  rows.forEach((row) => {
    counts[row.reviewRecommendation] += 1;
  });
  return counts;
}

function riskFlagCounts(rows: MainlandHighQuestionQaRow[]) {
  const counts: Record<string, number> = {};
  rows.forEach((row) => {
    row.riskFlags.forEach((flag) => {
      counts[flag] = (counts[flag] ?? 0) + 1;
    });
  });
  return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1]));
}

function groupBySummary<K extends string>(rows: MainlandHighQuestionQaRow[], keys: readonly K[], keyForRow: (row: MainlandHighQuestionQaRow) => K) {
  return Object.fromEntries(
    keys.map((key) => [key, summarizeRows(rows.filter((row) => keyForRow(row) === key))]).filter(([, summary]) => (summary as ScoreSummary).count > 0)
  ) as Partial<Record<K, ScoreSummary>>;
}

function topicGroupSummary(rows: MainlandHighQuestionQaRow[]) {
  const topicIds = Array.from(new Set(rows.map((row) => row.topicId))).sort();
  return Object.fromEntries(topicIds.map((topicId) => [topicId, summarizeRows(rows.filter((row) => row.topicId === topicId))]));
}

function buildSampleReviewQueue(rows: MainlandHighQuestionQaRow[]) {
  const queue: MainlandHighQuestionQaRow[] = [];

  batchOrder.forEach((batch) => {
    seniorGrades.forEach((grade) => {
      const targetSampleSize = batch === "rag-v3" || batch === "rag-v4" ? 50 : 30;
      const gradeRows = rows.filter((row) => row.batch === batch && row.grade === grade);
      const selected = new Map<string, MainlandHighQuestionQaRow>();
      const add = (row: MainlandHighQuestionQaRow | undefined) => {
        if (row) selected.set(row.questionId, row);
      };

      gradeRows
        .slice()
        .sort((a, b) => a.overallScore - b.overallScore || a.questionId.localeCompare(b.questionId))
        .slice(0, batch === "rag-v3" || batch === "rag-v4" ? 30 : 18)
        .forEach(add);

      focusTopicIds.forEach((topicId) => {
        add(
          gradeRows
            .filter((row) => row.topicId === topicId)
            .sort((a, b) => a.overallScore - b.overallScore || a.questionId.localeCompare(b.questionId))[0]
        );
      });

      const sorted = gradeRows.slice().sort((a, b) => a.questionId.localeCompare(b.questionId));
      let cursor = 0;
      while (selected.size < targetSampleSize && cursor < sorted.length * 2) {
        const index = Math.floor((cursor * sorted.length) / targetSampleSize) % sorted.length;
        add(sorted[index]);
        cursor += 1;
      }

      queue.push(
        ...Array.from(selected.values())
          .sort((a, b) => a.overallScore - b.overallScore || a.questionId.localeCompare(b.questionId))
          .slice(0, targetSampleSize)
      );
    });
  });

  return queue;
}

function deltaSummary(ragV2: ScoreSummary, seedV1: ScoreSummary): ScoreSummary {
  return {
    count: ragV2.count - seedV1.count,
    qualityScore: round(ragV2.qualityScore - seedV1.qualityScore),
    knowledgeMatchScore: round(ragV2.knowledgeMatchScore - seedV1.knowledgeMatchScore),
    solvabilityScore: round(ragV2.solvabilityScore - seedV1.solvabilityScore),
    overallScore: round(ragV2.overallScore - seedV1.overallScore)
  };
}

export function buildMainlandHighQuestionQualityComparison(reportDate = new Date().toISOString().slice(0, 10)): MainlandHighQuestionQualityComparisonReport {
  const seedRows = assessBatch("seed-v1", mainlandPepHighSeedV1Questions);
  const ragV2Rows = assessBatch("rag-v2", mainlandPepHighRagV2Questions);
  const ragV3Rows = assessBatch("rag-v3", mainlandPepHighRagV3Questions);
  const ragV4Rows = assessBatch("rag-v4", mainlandPepHighRagV4Questions);
  const rows = [...seedRows, ...ragV2Rows, ...ragV3Rows, ...ragV4Rows];
  const seedSummary = summarizeRows(seedRows);
  const ragV2Summary = summarizeRows(ragV2Rows);
  const ragV3Summary = summarizeRows(ragV3Rows);
  const ragV4Summary = summarizeRows(ragV4Rows);

  return {
    reportDate,
    generatedAt: new Date().toISOString(),
    comparison: {
      baselineBatch: "seed-v1",
      ragBatches: ["rag-v2", "rag-v3", "rag-v4"],
      noRawSourceAccess: true
    },
    summary: {
      rows: rows.length,
      batchSummaries: {
        "seed-v1": seedSummary,
        "rag-v2": ragV2Summary,
        "rag-v3": ragV3Summary,
        "rag-v4": ragV4Summary
      },
      deltas: {
        "rag-v2": deltaSummary(ragV2Summary, seedSummary),
        "rag-v3": deltaSummary(ragV3Summary, seedSummary),
        "rag-v4": deltaSummary(ragV4Summary, seedSummary)
      },
      recommendationCounts: {
        "seed-v1": recommendationCounts(seedRows),
        "rag-v2": recommendationCounts(ragV2Rows),
        "rag-v3": recommendationCounts(ragV3Rows),
        "rag-v4": recommendationCounts(ragV4Rows)
      },
      riskFlagCounts: {
        "seed-v1": riskFlagCounts(seedRows),
        "rag-v2": riskFlagCounts(ragV2Rows),
        "rag-v3": riskFlagCounts(ragV3Rows),
        "rag-v4": riskFlagCounts(ragV4Rows)
      }
    },
    groups: {
      byGrade: {
        "seed-v1": groupBySummary(seedRows, seniorGrades, (row) => row.grade as SeniorGrade),
        "rag-v2": groupBySummary(ragV2Rows, seniorGrades, (row) => row.grade as SeniorGrade),
        "rag-v3": groupBySummary(ragV3Rows, seniorGrades, (row) => row.grade as SeniorGrade),
        "rag-v4": groupBySummary(ragV4Rows, seniorGrades, (row) => row.grade as SeniorGrade)
      },
      byType: {
        "seed-v1": groupBySummary(seedRows, generatedTypes, (row) => row.type as GeneratedQuestionType),
        "rag-v2": groupBySummary(ragV2Rows, generatedTypes, (row) => row.type as GeneratedQuestionType),
        "rag-v3": groupBySummary(ragV3Rows, generatedTypes, (row) => row.type as GeneratedQuestionType),
        "rag-v4": groupBySummary(ragV4Rows, generatedTypes, (row) => row.type as GeneratedQuestionType)
      },
      byDifficulty: {
        "seed-v1": groupBySummary(seedRows, ["Foundation", "Core", "Challenge", "Exam"] as const, (row) => row.difficulty),
        "rag-v2": groupBySummary(ragV2Rows, ["Foundation", "Core", "Challenge", "Exam"] as const, (row) => row.difficulty),
        "rag-v3": groupBySummary(ragV3Rows, ["Foundation", "Core", "Challenge", "Exam"] as const, (row) => row.difficulty),
        "rag-v4": groupBySummary(ragV4Rows, ["Foundation", "Core", "Challenge", "Exam"] as const, (row) => row.difficulty)
      },
      byTopic: {
        "seed-v1": topicGroupSummary(seedRows),
        "rag-v2": topicGroupSummary(ragV2Rows),
        "rag-v3": topicGroupSummary(ragV3Rows),
        "rag-v4": topicGroupSummary(ragV4Rows)
      }
    },
    rows,
    sampleReviewQueue: buildSampleReviewQueue(rows),
    topIssueRows: rows
      .slice()
      .sort((a, b) => a.overallScore - b.overallScore || b.riskFlags.length - a.riskFlags.length || a.questionId.localeCompare(b.questionId))
      .slice(0, 60),
    assumptions: [
      "The baseline batch is the current repository's seed-v1 900-question Mainland high-school bank.",
      "RAG-v2 is the first safe-RAG expansion batch, RAG-v3 is the first public safe-RAG expansion batch, and RAG-v4 is the S18-approved 1500-question public expansion batch.",
      "The comparison uses only MAIS-owned generated questions and safe RAG metadata; it does not read original exam papers or textbook source text.",
      "Automated scores are triage signals. S18 human sampling remains the release-quality authority.",
      "RAG-v4 rows have S18 approval and are included in the public Mainland PEP high-school question aggregation after S04/S08 integration."
    ]
  };
}

export function validateMainlandHighQuestionQualityComparison(report: MainlandHighQuestionQualityComparisonReport) {
  const errors: string[] = [];
  if (report.summary.batchSummaries["seed-v1"].count !== 900) errors.push("seed-v1 count must be 900");
  if (report.summary.batchSummaries["rag-v2"].count !== 900) errors.push("rag-v2 count must be 900");
  if (report.summary.batchSummaries["rag-v3"].count !== 1500) errors.push("rag-v3 count must be 1500");
  if (report.summary.batchSummaries["rag-v4"].count !== 1500) errors.push("rag-v4 public count must be 1500");
  if (report.rows.length !== 4800) errors.push("report must contain 4800 machine-scored rows");
  if (report.sampleReviewQueue.length !== 480) errors.push("sample review queue must contain 480 rows");

  report.rows.forEach((row) => {
    ["qualityScore", "knowledgeMatchScore", "solvabilityScore", "overallScore"].forEach((key) => {
      const score = row[key as keyof Pick<MainlandHighQuestionQaRow, "qualityScore" | "knowledgeMatchScore" | "solvabilityScore" | "overallScore">];
      if (typeof score !== "number" || score < 0 || score > 100) errors.push(`${row.questionId} has invalid ${key}`);
    });
    if (row.batch !== "seed-v1" && row.evidenceCardIds.length === 0) errors.push(`${row.questionId} is missing RAG evidence`);
  });

  if (errors.length) throw new Error(`Mainland high question QA comparison failed validation:\n${errors.join("\n")}`);
}

function markdownTable(headers: string[], rows: Array<Array<string | number>>) {
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.join(" | ")} |`)
  ].join("\n");
}

function scoreSummaryRows(report: MainlandHighQuestionQualityComparisonReport) {
  return [
    ...batchOrder.map((batch) => {
      const summary = report.summary.batchSummaries[batch];
      return [batch, summary.count, summary.qualityScore, summary.knowledgeMatchScore, summary.solvabilityScore, summary.overallScore];
    }),
    ...(["rag-v2", "rag-v3", "rag-v4"] as const).map((batch) => {
      const delta = report.summary.deltas[batch];
      return [`${batch} minus seed-v1`, delta.count, delta.qualityScore, delta.knowledgeMatchScore, delta.solvabilityScore, delta.overallScore];
    })
  ];
}

function recommendationRows(report: MainlandHighQuestionQualityComparisonReport) {
  return batchOrder.map((batch) => [
    batch,
    report.summary.recommendationCounts[batch].pass,
    report.summary.recommendationCounts[batch]["sample-review"],
    report.summary.recommendationCounts[batch]["manual-review"],
    report.summary.recommendationCounts[batch]["blocker-review"]
  ]);
}

function gradeRows(report: MainlandHighQuestionQualityComparisonReport) {
  return batchOrder.flatMap((batch) =>
    seniorGrades.map((grade) => {
      const summary = report.groups.byGrade[batch][grade];
      return [batch, grade, summary?.count ?? 0, summary?.qualityScore ?? 0, summary?.knowledgeMatchScore ?? 0, summary?.solvabilityScore ?? 0, summary?.overallScore ?? 0];
    })
  );
}

function topFlagRows(report: MainlandHighQuestionQualityComparisonReport) {
  return batchOrder.flatMap((batch) =>
    Object.entries(report.summary.riskFlagCounts[batch])
      .slice(0, 10)
      .map(([flag, count]) => [batch, flag, count])
  );
}

function sampleRows(report: MainlandHighQuestionQualityComparisonReport) {
  return report.sampleReviewQueue.map((row) => [
    row.batch,
    row.grade,
    row.questionId,
    row.topicId,
    row.type,
    row.overallScore,
    row.reviewRecommendation
  ]);
}

function topIssueRows(report: MainlandHighQuestionQualityComparisonReport) {
  return report.topIssueRows.slice(0, 30).map((row) => [
    row.batch,
    row.questionId,
    row.grade,
    row.topicId,
    row.type,
    row.overallScore,
    row.riskFlags.slice(0, 4).join(", ")
  ]);
}

function buildMarkdownReport(report: MainlandHighQuestionQualityComparisonReport) {
  const seed = report.summary.batchSummaries["seed-v1"];
  const ragV2 = report.summary.batchSummaries["rag-v2"];
  const ragV3 = report.summary.batchSummaries["rag-v3"];
  const ragV4 = report.summary.batchSummaries["rag-v4"];
  const ragV3VsSeed = round(ragV3.overallScore - seed.overallScore);
  const ragV3VsRagV2 = round(ragV3.overallScore - ragV2.overallScore);
  const ragV4VsRagV3 = round(ragV4.overallScore - ragV3.overallScore);
  const overallComparison = `RAG-v3 scores ${ragV3VsSeed >= 0 ? "+" : ""}${ragV3VsSeed} versus seed-v1 and ${ragV3VsRagV2 >= 0 ? "+" : ""}${ragV3VsRagV2} versus rag-v2 in the automated triage score.`;

  return `# S18 Mainland High Question QA: Seed-v1 vs RAG-v2 vs RAG-v3 vs RAG-v4 Public

- Date: ${report.reportDate}
- Session ID: S18
- Workstream: Curriculum QA and content quality
- Scope: Compare MAIS-owned Mainland high-school generated question batches only
- Source-safety note: No original exam-paper, textbook, answer, solution, scan, OCR, image, or raw source text was read or stored.

## Executive Summary

This report compares \`seed-v1\` (${seed.count} questions), \`rag-v2\` (${ragV2.count} questions), \`rag-v3\` (${ragV3.count} questions), and public-integrated \`rag-v4\` (${ragV4.count} questions). ${overallComparison} RAG-v4 scores ${ragV4VsRagV3 >= 0 ? "+" : ""}${ragV4VsRagV3} versus rag-v3.

The automated scorer is a triage tool, not a final pedagogical verdict. It highlights questions for S18 manual review by checking structural quality, RAG/topic fit, answerability, duplication risk, and source-copying artifacts.

## Score Summary

${markdownTable(["Batch", "Count", "Quality", "Knowledge match", "Solvability", "Overall"], scoreSummaryRows(report))}

## Review Recommendation Counts

${markdownTable(["Batch", "Pass", "Sample review", "Manual review", "Blocker review"], recommendationRows(report))}

## Grade-Level Summary

${markdownTable(["Batch", "Grade", "Count", "Quality", "Knowledge match", "Solvability", "Overall"], gradeRows(report))}

## Top Risk Flags

${markdownTable(["Batch", "Risk flag", "Count"], topFlagRows(report))}

## Lowest-Scoring Rows For S18 Triage

${markdownTable(["Batch", "Question ID", "Grade", "Topic", "Type", "Overall", "Risk flags"], topIssueRows(report))}

## 480-Question Manual Sample Queue

Sampling rule: seed-v1 and rag-v2 contribute 30 questions per grade; rag-v3 and rag-v4 contribute 50 questions per grade. The queue prioritizes low scores while forcing coverage of derivatives, trigonometry, sequences, space vectors, probability/statistics, and conics where present.

${markdownTable(["Batch", "Grade", "Question ID", "Topic", "Type", "Overall", "Recommendation"], sampleRows(report))}

## Scoring Rubric

- **Quality score:** bilingual prompt/explanation presence, prompt clarity, duplicate/near-duplicate pressure, multiple-choice option quality, and source-copying artifact scan.
- **Knowledge match score:** grade/topic validity, safe RAG evidence availability, evidence-card ID validity, concept overlap with the topic, and difficulty presence.
- **Solvability score:** answer presence, explanation presence, prompt context, multiple-choice answer uniqueness, and whether non-choice explanations visibly reach the answer.

## S18 Manual Review Template

- Final gate decision: Pending S18 manual sample review.
- Manual-review pass criteria: no mathematical answer-key defects, topic match is plausible, Chinese terminology is suitable for Mainland learners, and no question resembles source material.
- Required action for blocker rows: inspect by question ID, fix the generator if a pattern-level issue exists, regenerate, rerun this comparison, then rerun \`npm run test:question-bank\`.

## Assumptions

${report.assumptions.map((assumption) => `- ${assumption}`).join("\n")}
`;
}

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function buildCsv(report: MainlandHighQuestionQualityComparisonReport) {
  const headers = [
    "batch",
    "questionId",
    "grade",
    "topicId",
    "type",
    "difficulty",
    "qualityScore",
    "knowledgeMatchScore",
    "solvabilityScore",
    "overallScore",
    "evidenceCardIds",
    "examPatternCardIds",
    "riskFlags",
    "reviewRecommendation"
  ];
  return [
    headers.join(","),
    ...report.rows.map((row) =>
      [
        row.batch,
        row.questionId,
        row.grade,
        row.topicId,
        row.type,
        row.difficulty,
        row.qualityScore,
        row.knowledgeMatchScore,
        row.solvabilityScore,
        row.overallScore,
        row.evidenceCardIds.join("|"),
        row.examPatternCardIds.join("|"),
        row.riskFlags.join("|"),
        row.reviewRecommendation
      ].map(csvEscape).join(",")
    )
  ].join("\n");
}

export function writeMainlandHighQuestionQualityComparison(report: MainlandHighQuestionQualityComparisonReport, outputDir = "coordination/content-qa") {
  mkdirSync(outputDir, { recursive: true });
  const baseName = `${report.reportDate}-S18-mainland-high-seed-v1-vs-rag-v2-vs-rag-v3-vs-rag-v4-public-quality-report`;
  const jsonPath = join(outputDir, `${baseName}.json`);
  const markdownPath = join(outputDir, `${baseName}.md`);
  const csvPath = join(outputDir, `${baseName}.csv`);

  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(markdownPath, buildMarkdownReport(report));
  writeFileSync(csvPath, buildCsv(report));

  return { jsonPath, markdownPath, csvPath };
}

function dateFromArgs(args: string[]) {
  const index = args.indexOf("--date");
  const value = index >= 0 ? args[index + 1] : undefined;
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return new Date().toISOString().slice(0, 10);
}

function runCli() {
  const report = buildMainlandHighQuestionQualityComparison(dateFromArgs(process.argv.slice(2)));
  validateMainlandHighQuestionQualityComparison(report);

  if (process.argv.includes("--self-test")) {
    console.log(`Self-test passed: ${report.rows.length} rows, ${report.sampleReviewQueue.length} sample-review rows.`);
    return;
  }

  const paths = writeMainlandHighQuestionQualityComparison(report);
  console.log(`Wrote Mainland high question QA comparison:`);
  console.log(`- ${paths.markdownPath}`);
  console.log(`- ${paths.jsonPath}`);
  console.log(`- ${paths.csvPath}`);
}

if (require.main === module) {
  runCli();
}
