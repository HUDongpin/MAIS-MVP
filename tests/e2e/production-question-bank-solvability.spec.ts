import { expect, test, type APIRequestContext, type APIResponse, type TestInfo } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { questions } from "../../data/questions";
import {
  numberLinePointValue,
  planeFigureAngleDegrees,
  solidFigureCuboidVolume,
  solidFigureUnitText
} from "../../lib/questionFigure";
import type { LocalizedText, Question, QuestionDiagram } from "../../types";
import { uniqueSuffix } from "./helpers";

type AttemptFeedback = {
  correct: boolean;
  correctAnswer?: string;
  explanation?: unknown;
};

type LiveQuestion = {
  id: string;
  grade: string;
  topicId: string;
  type: Question["type"];
  prompt: LocalizedText;
  options?: LocalizedText[];
  diagram?: QuestionDiagram;
  answer?: unknown;
  acceptedAnswers?: unknown;
  explanation?: unknown;
};

type PublicQuestionsResponse = {
  questions?: LiveQuestion[];
};

type AuditStatus = "pass" | "ambiguous" | "grader-gap" | "content-error" | "diagram-error" | "live-deploy-mismatch";

type ProductionAuditRow = {
  id: string;
  grade: string;
  topicId: string;
  type: Question["type"];
  prompt: string;
  independentAnswer: string;
  status: AuditStatus;
  productionStatus: string;
  solutionNote: string;
  notes: string[];
};

type ReportContext = {
  generatedAt: string;
  target: string;
  qaUsername: string;
  rows: ProductionAuditRow[];
  liveQuestionCount: number;
  publicAnswerLeakCount: number;
  liveDistributionByGrade: Record<string, number>;
  liveDistributionByType: Record<string, number>;
  liveTopicCount: number;
  runError?: string;
};

const productionAuditEnabled = process.env.PRODUCTION_QUESTION_BANK_AUDIT === "1";
const productionOrigin = "https://www.mais.hk";
const expectedQuestionCount = 285;
const expectedTypeCounts: Record<Question["type"], number> = {
  "multiple-choice": 136,
  "fill-in": 4,
  "short-answer": 131,
  graph: 14
};
const reportPath = path.join(process.cwd(), "coordination", "reports", "2026-05-21-production-question-bank-solvability.md");

test.describe.configure({ mode: "serial", retries: 0 });
test.setTimeout(1_500_000);
test.use({ trace: "off", video: "off", screenshot: "off" });

function readIndependentAnswersById() {
  const localAuditPath = path.join(process.cwd(), "tests", "e2e", "practice-bank-solvability.spec.ts");
  const localAuditSource = fs.readFileSync(localAuditPath, "utf8");
  const match = /const independentAnswerSource = `\n([\s\S]*?)`;/m.exec(localAuditSource);
  if (!match) throw new Error("Could not read independentAnswerSource from the local solvability audit spec.");

  return new Map(
    match[1]
      .trim()
      .split("\n")
      .map((line) => {
        const tabIndex = line.indexOf("\t");
        return [line.slice(0, tabIndex), line.slice(tabIndex + 1)] as const;
      })
  );
}

function normalizeAnswer(value: string) {
  return value
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[−–—]/g, "-")
    .replace(/\\[()]/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([=,+\-*/:^()])\s*/g, "$1")
    .replace(/\s*,\s*/g, ",")
    .replace(/\s*:\s*/g, ":")
    .replace(/\s*°\s*/g, "°")
    .replace(/\bhk\s*\$\s*/g, "hk$")
    .replace(/\$\s*/g, "$")
    .trim();
}

function normalizedAnswerVariants(value: string) {
  const normalized = normalizeAnswer(value);
  const variants = new Set([normalized, normalized.replace(/\s+/g, "")]);

  if (normalized.startsWith("hk$")) variants.add(normalized.replace(/^hk\$/, "$"));
  if (normalized.startsWith("$")) variants.add(normalized.replace(/^\$/, "hk$"));

  const percent = normalized.match(/^(-?\d+(?:\.\d+)?)%$/);
  if (percent) {
    variants.add(percent[1]);
    variants.add(`${percent[1]}percent`);
  }

  const degree = normalized.match(/^(-?\d+(?:\.\d+)?)°$/);
  if (degree) {
    variants.add(degree[1]);
    variants.add(`${degree[1]}degree`);
    variants.add(`${degree[1]}degrees`);
  }

  return variants;
}

function parseScalarAnswer(value: string) {
  let normalized = normalizeAnswer(value).replace(/\s+/g, "");
  normalized = normalized
    .replace(/^hk\$/, "")
    .replace(/^\$/, "")
    .replace(/(?:cm\^2|cm2|cm\^3|cm3|cm|ml|l|km\/h|kmh|km|°|%)$/i, "");

  const fraction = normalized.match(/^(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/);
  if (fraction) {
    const denominator = Number(fraction[2]);
    if (denominator === 0) return null;
    return Number(fraction[1]) / denominator;
  }

  if (/^-?\d+(?:\.\d+)?$/.test(normalized)) return Number(normalized);
  return null;
}

function answerMatches(selectedAnswer: string, acceptedAnswer: string) {
  const selectedVariants = normalizedAnswerVariants(selectedAnswer);
  const acceptedVariants = normalizedAnswerVariants(acceptedAnswer);

  for (const variant of selectedVariants) {
    if (acceptedVariants.has(variant)) return true;
  }

  const selectedNumber = parseScalarAnswer(selectedAnswer);
  const acceptedNumber = parseScalarAnswer(acceptedAnswer);
  return selectedNumber !== null && acceptedNumber !== null && Math.abs(selectedNumber - acceptedNumber) < 0.000001;
}

function acceptedAnswersFor(question: Question) {
  return Array.from(new Set([question.answer, ...(question.acceptedAnswers ?? [])]));
}

function isExpectedAnswerRepresented(question: Question, independentAnswer: string) {
  return acceptedAnswersFor(question).some((acceptedAnswer) => answerMatches(independentAnswer, acceptedAnswer));
}

function gcd(first: number, second: number): number {
  const a = Math.abs(first);
  const b = Math.abs(second);
  if (b === 0) return a || 1;
  return gcd(b, a % b);
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(6)));
}

function formatFraction(numerator: number, denominator: number) {
  const divisor = gcd(numerator, denominator);
  const sign = denominator < 0 ? -1 : 1;
  const normalizedNumerator = (numerator / divisor) * sign;
  const normalizedDenominator = Math.abs(denominator / divisor);
  return normalizedDenominator === 1 ? String(normalizedNumerator) : `${normalizedNumerator}/${normalizedDenominator}`;
}

function formatPoint(x: number, y: number) {
  return `(${formatNumber(x)}, ${formatNumber(y)})`;
}

function coordinateGridDiagramFor(question: Pick<LiveQuestion, "diagram">) {
  return question.diagram?.kind === "coordinate-grid" ? question.diagram : null;
}

function pointByLabel(question: Pick<LiveQuestion, "diagram">, label: string) {
  return coordinateGridDiagramFor(question)?.points?.find((point) => point.label === label) ?? null;
}

function firstLine(question: Pick<LiveQuestion, "diagram">) {
  return coordinateGridDiagramFor(question)?.lines?.[0] ?? null;
}

function quadrantFor(x: number, y: number) {
  if (x > 0 && y > 0) return "I";
  if (x < 0 && y > 0) return "II";
  if (x < 0 && y < 0) return "III";
  if (x > 0 && y < 0) return "IV";
  return null;
}

function deriveGraphAnswer(question: Pick<LiveQuestion, "id" | "type" | "diagram">) {
  if (question.type !== "graph" || !question.diagram) return null;

  if (question.id === "q28" || question.id === "graph-coordinate-geometry-gradient") {
    const line = firstLine(question);
    const [start, end] = line?.points ?? [];
    if (!start || !end) return null;
    return formatFraction(end.y - start.y, end.x - start.x);
  }

  if (question.id === "graph-p6-speed-distance") {
    const point = pointByLabel(question, "D");
    return point ? `${formatNumber(point.y)} km` : null;
  }

  if (question.id === "graph-coordinates-read-point") {
    const point = pointByLabel(question, "C");
    return point ? formatPoint(point.x, point.y) : null;
  }

  if (question.id === "graph-coordinates-quadrant") {
    const point = pointByLabel(question, "P");
    return point ? quadrantFor(point.x, point.y) : null;
  }

  if (question.id === "graph-quadratic-patterns-vertex") {
    const point = pointByLabel(question, "V");
    return point ? formatPoint(point.x, point.y) : null;
  }

  if (question.id === "graph-quadratic-patterns-axis") {
    const point = pointByLabel(question, "V");
    return point ? `x = ${formatNumber(point.x)}` : null;
  }

  if (question.id === "graph-quadratic-patterns-y-intercept") {
    const point = pointByLabel(question, "Y") ?? firstLine(question)?.points.find((candidate) => candidate.x === 0) ?? null;
    return point ? formatPoint(point.x, point.y) : null;
  }

  if (question.id === "graph-quadratic-patterns-roots") {
    const roots = (firstLine(question)?.points ?? [])
      .filter((point) => point.y === 0)
      .map((point) => point.x)
      .sort((a, b) => a - b);
    return roots.length === 2 ? `x = ${formatNumber(roots[0])} and x = ${formatNumber(roots[1])}` : null;
  }

  if (question.id === "graph-quadratic-patterns-opening") {
    const vertex = pointByLabel(question, "V");
    const linePoints = firstLine(question)?.points ?? [];
    if (!vertex || linePoints.length < 3) return null;
    const otherYValues = linePoints.filter((point) => point.x !== vertex.x).map((point) => point.y);
    if (otherYValues.every((y) => y < vertex.y)) return "downward";
    if (otherYValues.every((y) => y > vertex.y)) return "upward";
    return null;
  }

  if (question.id === "graph-functions-read-output") {
    const point = pointByLabel(question, "A");
    return point ? formatNumber(point.y) : null;
  }

  if (question.id === "graph-functions-zero") {
    const point = pointByLabel(question, "Z") ?? firstLine(question)?.points.find((candidate) => candidate.y === 0) ?? null;
    return point ? formatNumber(point.x) : null;
  }

  if (question.id === "graph-coordinate-geometry-midpoint") {
    const first = pointByLabel(question, "A");
    const second = pointByLabel(question, "B");
    return first && second ? formatPoint((first.x + second.x) / 2, (first.y + second.y) / 2) : null;
  }

  if (question.id === "graph-data-handling-highest-value") {
    const values = firstLine(question)?.points.map((point) => point.y) ?? [];
    return values.length ? formatNumber(Math.max(...values)) : null;
  }

  if (question.id === "graph-p4-angles-straight-line" && question.diagram.kind === "plane-figure") {
    const angle = planeFigureAngleDegrees(question.diagram, "O", "C", "B");
    return angle === null ? null : `${Math.round(angle)}°`;
  }

  if (question.id === "graph-p4-decimals-number-line" && question.diagram.kind === "number-line") {
    const value = numberLinePointValue(question.diagram, "P");
    return value === null ? null : formatNumber(value);
  }

  if (question.id === "graph-p5-volume-cube" && question.diagram.kind === "solid-figure") {
    const volume = solidFigureCuboidVolume(question.diagram);
    if (volume === null) return null;
    const unit = solidFigureUnitText(question.diagram);
    return unit ? `${formatNumber(volume)} ${unit}^3` : formatNumber(volume);
  }

  return null;
}

function incrementCount(counts: Record<string, number>, key: string) {
  counts[key] = (counts[key] ?? 0) + 1;
}

function distributionFor<T extends { grade: string; type: string; topicId: string }>(items: T[]) {
  const byGrade: Record<string, number> = {};
  const byType: Record<string, number> = {};
  const topics = new Set<string>();

  items.forEach((item) => {
    incrementCount(byGrade, item.grade);
    incrementCount(byType, item.type);
    topics.add(item.topicId);
  });

  return { byGrade, byType, topicCount: topics.size };
}

function sortedRecordEntries(record: Record<string, number>) {
  return Object.entries(record).sort(([first], [second]) => first.localeCompare(second));
}

function escapeMarkdownCell(value: string) {
  return value.replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();
}

function setRowStatus(row: ProductionAuditRow, status: AuditStatus) {
  if (row.status === "pass") row.status = status;
}

function solutionNoteFor(question: LiveQuestion, independentAnswer: string, derivedGraphAnswer: string | null) {
  if (question.type === "graph") {
    return derivedGraphAnswer
      ? `Derived from live diagram data as ${derivedGraphAnswer}.`
      : "Attempted to derive from live diagram data.";
  }

  if (question.id.includes("-first-step")) return "Strategy item: independent audit chose the first defensible solving step.";
  if (question.id.includes("-common-check")) return "Metacognition item: independent audit chose the most relevant checking action.";
  if (question.id.includes("-key-fact")) return `Key fact item: independent audit result is ${independentAnswer}.`;
  if (question.id.includes("-guided-example")) return `Worked example item: independent audit result is ${independentAnswer}.`;
  if (question.type === "multiple-choice") return "Independent audit answer maps to exactly one live multiple-choice option.";
  if (question.type === "fill-in") return `Independent fill-in value is ${independentAnswer}.`;
  return `Independent short-answer result is ${independentAnswer}.`;
}

async function readJson<T>(response: APIResponse) {
  const text = await response.text();
  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`Expected JSON response from ${response.url()}, got HTTP ${response.status()}: ${text.slice(0, 300)}`);
  }
  return parsed as T;
}

function productionUsername(testInfo: TestInfo) {
  const suffix = uniqueSuffix(testInfo).replace(/[^a-z0-9-]+/gi, "-").toLowerCase().slice(0, 50);
  return `qa-solvability-${suffix}@mais-test.invalid`;
}

function productionPassword() {
  return `qa-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function sessionCookieFrom(response: APIResponse) {
  const setCookie = response.headers()["set-cookie"];
  const match = /(?:^|,\s*)(hk_math_session=[^;,\s]+)/.exec(setCookie ?? "");
  return match?.[1] ?? null;
}

async function registerQaStudent(request: APIRequestContext, testInfo: TestInfo) {
  const username = productionUsername(testInfo);
  const response = await request.post(`${productionOrigin}/api/auth/register`, {
    data: {
      name: "MAIS Production Question QA",
      username,
      email: username,
      password: productionPassword(),
      grade: "S6",
      curriculumTrack: "HK",
      language: "en",
      theme: "dark"
    },
    timeout: 30_000
  });

  const bodyText = await response.text();
  const storageState = await request.storageState();
  const hasSessionCookie = Boolean(sessionCookieFrom(response)) || storageState.cookies.some((cookie) => cookie.name === "hk_math_session");
  if (response.status() !== 200 || !hasSessionCookie) {
    throw new Error(`Could not create disposable QA student. HTTP ${response.status()}: ${bodyText.slice(0, 300)}`);
  }

  return { username };
}

async function submitProductionAttempt(
  request: APIRequestContext,
  questionId: string,
  selectedAnswer: string
) {
  const response = await request.post(`${productionOrigin}/api/attempts`, {
    data: {
      questionId,
      selectedAnswer,
      durationSeconds: 1
    },
    timeout: 30_000
  });
  const body = await readJson<AttemptFeedback | { error?: string }>(response);

  return {
    ok: response.ok(),
    status: response.status(),
    body,
    correct: response.ok() && Boolean((body as AttemptFeedback).correct)
  };
}

function buildReport(context: ReportContext) {
  const grouped = context.rows.reduce<Record<AuditStatus, number>>(
    (counts, row) => {
      counts[row.status] += 1;
      return counts;
    },
    {
      pass: 0,
      ambiguous: 0,
      "grader-gap": 0,
      "content-error": 0,
      "diagram-error": 0,
      "live-deploy-mismatch": 0
    }
  );

  const lines = [
    "# Production Question-Bank Solvability Audit",
    "",
    `- Generated at: ${context.generatedAt}`,
    `- Target: ${context.target}`,
    `- Reporting session: S11`,
    `- Disposable QA username: ${context.qaUsername || "not created"}`,
    `- Live questions fetched: ${context.liveQuestionCount}`,
    `- Public answer-key leaks: ${context.publicAnswerLeakCount}`,
    `- Passing rows: ${grouped.pass}/${context.rows.length}`,
    `- Failure groups: content-error=${grouped["content-error"]}, ambiguous=${grouped.ambiguous}, grader-gap=${grouped["grader-gap"]}, diagram-error=${grouped["diagram-error"]}, live-deploy-mismatch=${grouped["live-deploy-mismatch"]}`,
    context.runError ? `- Run error: ${context.runError}` : "- Run error: none",
    "",
    "## Live Distribution",
    "",
    `- By grade: ${sortedRecordEntries(context.liveDistributionByGrade).map(([key, count]) => `${key}=${count}`).join(", ") || "none"}`,
    `- By type: ${sortedRecordEntries(context.liveDistributionByType).map(([key, count]) => `${key}=${count}`).join(", ") || "none"}`,
    `- Topic count: ${context.liveTopicCount}`,
    "",
    "## Audit Rows",
    "",
    "| id | grade | topicId | type | independent answer | status | production status | solution note | notes |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- |"
  ];

  const table = context.rows.map((row) => [
    row.id,
    row.grade,
    row.topicId,
    row.type,
    row.independentAnswer,
    row.status,
    row.productionStatus,
    row.solutionNote,
    row.notes.join("; ") || "OK"
  ].map(escapeMarkdownCell).join(" | "));

  return [...lines, ...table.map((line) => `| ${line} |`), ""].join("\n");
}

function writeReport(context: ReportContext) {
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, buildReport(context), "utf8");
}

test.describe("Production question-bank solvability audit", () => {
  test.skip(!productionAuditEnabled, "Set PRODUCTION_QUESTION_BANK_AUDIT=1 to create a disposable production QA account and submit all 285 answers.");

  test("every live HK Practice Arena question is solvable and accepted by www.mais.hk", async ({ request }, testInfo) => {
    const localHkQuestions = questions.filter((question) => question.curriculumTrack === "HK");
    const localQuestionById = new Map(localHkQuestions.map((question) => [question.id, question]));
    const independentAnswers = readIndependentAnswersById();
    const report: ReportContext = {
      generatedAt: new Date().toISOString(),
      target: productionOrigin,
      qaUsername: "",
      rows: [],
      liveQuestionCount: 0,
      publicAnswerLeakCount: 0,
      liveDistributionByGrade: {},
      liveDistributionByType: {},
      liveTopicCount: 0
    };

    try {
      expect(localHkQuestions).toHaveLength(expectedQuestionCount);
      expect(independentAnswers.size).toBe(expectedQuestionCount);
      expect([...independentAnswers.keys()].sort()).toEqual(localHkQuestions.map((question) => question.id).sort());

      const publicResponse = await request.get(`${productionOrigin}/api/questions`, { timeout: 30_000 });
      expect(publicResponse.status()).toBe(200);
      const publicQuestions = await readJson<PublicQuestionsResponse>(publicResponse);
      const liveQuestions = publicQuestions.questions ?? [];
      const liveDistribution = distributionFor(liveQuestions);
      report.liveQuestionCount = liveQuestions.length;
      report.liveDistributionByGrade = liveDistribution.byGrade;
      report.liveDistributionByType = liveDistribution.byType;
      report.liveTopicCount = liveDistribution.topicCount;
      report.publicAnswerLeakCount = liveQuestions.filter((question) =>
        "answer" in question || "acceptedAnswers" in question || "explanation" in question
      ).length;

      const liveQuestionById = new Map(liveQuestions.map((question) => [question.id, question]));
      const liveIds = liveQuestions.map((question) => question.id).sort();
      const localIds = localHkQuestions.map((question) => question.id).sort();

      if (
        liveQuestions.length !== expectedQuestionCount ||
        report.publicAnswerLeakCount > 0 ||
        JSON.stringify(liveIds) !== JSON.stringify(localIds)
      ) {
        const mismatchedIds = new Set([...liveIds, ...localIds].filter((id) => !liveQuestionById.has(id) || !localQuestionById.has(id)));
        report.rows = Array.from(mismatchedIds).sort().map((id) => ({
          id,
          grade: liveQuestionById.get(id)?.grade ?? localQuestionById.get(id)?.grade ?? "unknown",
          topicId: liveQuestionById.get(id)?.topicId ?? localQuestionById.get(id)?.topicId ?? "unknown",
          type: liveQuestionById.get(id)?.type ?? localQuestionById.get(id)?.type ?? "short-answer",
          prompt: liveQuestionById.get(id)?.prompt?.en ?? localQuestionById.get(id)?.prompt.en ?? "",
          independentAnswer: independentAnswers.get(id) ?? "",
          status: "live-deploy-mismatch",
          productionStatus: "not submitted",
          solutionNote: "Stopped before production submissions because live IDs/count/leak checks did not match the audited manifest.",
          notes: [
            liveQuestionById.has(id) ? "Present in live response." : "Missing from live response.",
            localQuestionById.has(id) ? "Present in local audited manifest." : "Missing from local audited manifest."
          ]
        }));
        writeReport(report);
      }

      expect(liveQuestions).toHaveLength(expectedQuestionCount);
      expect(report.publicAnswerLeakCount).toBe(0);
      expect(liveIds).toEqual(localIds);
      Object.entries(expectedTypeCounts).forEach(([type, expectedCount]) => {
        expect(report.liveDistributionByType[type] ?? 0, `Expected ${expectedCount} live ${type} questions.`).toBe(expectedCount);
      });

      const qaStudent = await registerQaStudent(request, testInfo);
      report.qaUsername = qaStudent.username;

      for (const liveQuestion of liveQuestions) {
        const localQuestion = localQuestionById.get(liveQuestion.id);
        const independentAnswer = independentAnswers.get(liveQuestion.id) ?? "";
        const derivedGraphAnswer = deriveGraphAnswer(liveQuestion);
        const row: ProductionAuditRow = {
          id: liveQuestion.id,
          grade: liveQuestion.grade,
          topicId: liveQuestion.topicId,
          type: liveQuestion.type,
          prompt: liveQuestion.prompt.en,
          independentAnswer,
          status: "pass",
          productionStatus: "not submitted",
          solutionNote: solutionNoteFor(liveQuestion, independentAnswer, derivedGraphAnswer),
          notes: []
        };

        if (!localQuestion) {
          setRowStatus(row, "live-deploy-mismatch");
          row.notes.push("Live question is missing from the local audited manifest.");
        } else if (!independentAnswer) {
          setRowStatus(row, "content-error");
          row.notes.push("Missing independent audit answer.");
        } else if (!isExpectedAnswerRepresented(localQuestion, independentAnswer)) {
          setRowStatus(row, "content-error");
          row.notes.push("Independent answer is not represented by the local stored answer or accepted aliases.");
        }

        if (liveQuestion.type === "graph") {
          if (!liveQuestion.diagram) {
            setRowStatus(row, "diagram-error");
            row.notes.push("Live graph question has no diagram payload.");
          } else if (!derivedGraphAnswer) {
            setRowStatus(row, "diagram-error");
            row.notes.push("Could not derive an answer from the live graph payload.");
          } else if (!answerMatches(derivedGraphAnswer, independentAnswer)) {
            setRowStatus(row, "diagram-error");
            row.notes.push(`Live graph-derived answer "${derivedGraphAnswer}" does not match independent answer.`);
          }
        }

        if (liveQuestion.type === "multiple-choice") {
          const matchingLiveOptions = (liveQuestion.options ?? []).filter((option) =>
            answerMatches(independentAnswer, option.en) || answerMatches(independentAnswer, option.zh)
          );

          if (!liveQuestion.options?.length) {
            setRowStatus(row, "content-error");
            row.notes.push("Live multiple-choice question has no options.");
          } else if (matchingLiveOptions.length !== 1) {
            setRowStatus(row, "ambiguous");
            row.notes.push(`Expected exactly one live option matching the independent answer; found ${matchingLiveOptions.length}.`);
          }
        }

        if (independentAnswer) {
          const productionAttempt = await submitProductionAttempt(
            request,
            liveQuestion.id,
            independentAnswer
          );
          row.productionStatus = `HTTP ${productionAttempt.status}, correct=${productionAttempt.correct}`;
          if (!productionAttempt.ok || !productionAttempt.correct) {
            setRowStatus(row, "grader-gap");
            const correctAnswer = (productionAttempt.body as AttemptFeedback).correctAnswer;
            row.notes.push(`Production grader rejected the independent answer${correctAnswer ? `; returned correct answer "${correctAnswer}"` : ""}.`);
          }
        }

        report.rows.push(row);
        writeReport(report);
      }

      writeReport(report);
      await testInfo.attach("production-question-bank-solvability.md", {
        body: buildReport(report),
        contentType: "text/markdown"
      });

      expect(report.rows).toHaveLength(expectedQuestionCount);
      expect(report.rows.filter((row) => row.type === "multiple-choice")).toHaveLength(expectedTypeCounts["multiple-choice"]);
      expect(report.rows.filter((row) => row.type === "graph")).toHaveLength(expectedTypeCounts.graph);
      expect(report.rows.filter((row) => row.status !== "pass"), JSON.stringify(report.rows.filter((row) => row.status !== "pass").slice(0, 20), null, 2)).toEqual([]);
    } catch (error) {
      report.runError = error instanceof Error ? error.message.split("\n")[0] : String(error);
      writeReport(report);
      throw error;
    }
  });
});
