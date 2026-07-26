import { usCaliforniaQuestions } from "../data/usCaliforniaQuestions";
import {
  usCaliforniaPracticeFigureSpecVersion,
  usCaliforniaPracticeFigureSpecs,
  type UsCaliforniaPracticeFigureSpec
} from "../data/usCaliforniaPracticeFigures";
import { isExpectedAnswerRepresented } from "./questionBankSolvability";
import {
  normalizeQuestionDiagram,
  tenFrameRenderedCounts,
  tenFrameToneNames,
  validateQuestionDiagram
} from "./questionFigure";
import type { GradeId, Question, TenFrameCounterTone } from "../types";

/**
 * Conceptual-correctness gate for practice-question figures.
 *
 * A deterministic renderer guarantees the figure draws exactly what the spec
 * says. It cannot guarantee the spec says the right thing — a ten frame with
 * seven counters is a perfectly valid ten frame and a wrong answer to "5 red
 * and 1 blue". That is what this module checks, by reconciling the figure
 * against three independent facts already in the question: the numbers in the
 * stem, the colours in the stem, and the accepted answer.
 *
 * The counts are read back off the rendered cell assignment (see
 * `tenFrameRenderedCounts`), not off the authored `count` fields, so a figure
 * that silently clipped a counter fails here rather than shipping.
 */

export type PracticeFigureAuditCode =
  | "question-missing"
  | "diagram-not-attached"
  | "spec-invalid"
  | "render-issue"
  | "archetype-out-of-band"
  | "stem-count-mismatch"
  | "stem-colour-mismatch"
  | "answer-mismatch"
  | "answer-leak";

export type PracticeFigureAuditIssue = {
  code: PracticeFigureAuditCode;
  detail: string;
};

export type PracticeFigureAuditRow = {
  questionId: string;
  archetype: UsCaliforniaPracticeFigureSpec["archetype"];
  grade: GradeId | "unknown";
  standardIds: string[];
  issues: PracticeFigureAuditIssue[];
};

export type PracticeFigureAuditReport = {
  specVersion: string;
  checked: number;
  passed: number;
  failed: number;
  rows: PracticeFigureAuditRow[];
};

/** Ten frames model quantities to 20; past Grade 2 they stop being the right picture. */
const tenFrameGradeBand: GradeId[] = ["K", "P1", "P2"];
const tenFrameStandardPrefixes = ["K.", "1.", "2."];

/**
 * The California knowledge-point pack prefixes every stem with a label
 * ("1-H.1 Picture Join Stories to Ten checkpoint: ..."), and that label carries
 * digits of its own. Everything after `checkpoint:` is the part a learner is
 * actually reading, and the only part whose numbers describe the situation.
 */
export function practiceFigureStemText(question: Question) {
  const prompt = question.prompt.en;
  const marker = prompt.indexOf("checkpoint:");
  return (marker >= 0 ? prompt.slice(marker + "checkpoint:".length) : prompt).trim();
}

export function practiceFigureStemNumbers(question: Question) {
  return [...practiceFigureStemText(question).matchAll(/\d+(?:\.\d+)?/g)]
    .map((match) => Number(match[0]))
    .filter((value) => Number.isFinite(value));
}

/** Colour words the stem names, in the order it names them. */
export function practiceFigureStemTones(question: Question) {
  const stem = practiceFigureStemText(question).toLowerCase();
  const found: { tone: TenFrameCounterTone; index: number }[] = [];

  (Object.keys(tenFrameToneNames) as TenFrameCounterTone[]).forEach((tone) => {
    const match = new RegExp(`\\b${tenFrameToneNames[tone].en}\\b`).exec(stem);
    if (match) found.push({ tone, index: match.index });
  });

  return found.sort((first, second) => first.index - second.index).map((entry) => entry.tone);
}

function auditTenFrame(spec: UsCaliforniaPracticeFigureSpec, question: Question): PracticeFigureAuditIssue[] {
  const issues: PracticeFigureAuditIssue[] = [];
  const diagram = spec.diagram;
  const rendered = tenFrameRenderedCounts(diagram);

  if (!tenFrameGradeBand.includes(question.grade)) {
    issues.push({ code: "archetype-out-of-band", detail: `ten-frame attached to a ${question.grade} question` });
  }
  const outOfBandStandards = spec.standardIds.filter(
    (standardId) => !tenFrameStandardPrefixes.some((prefix) => standardId.startsWith(prefix))
  );
  if (outOfBandStandards.length) {
    issues.push({
      code: "archetype-out-of-band",
      detail: `ten-frame is a K-2 model, but the spec claims ${outOfBandStandards.join(", ")}`
    });
  }

  const stemNumbers = practiceFigureStemNumbers(question);
  const leadingNumbers = stemNumbers.slice(0, rendered.perGroup.length);
  const countsMatch =
    leadingNumbers.length === rendered.perGroup.length &&
    leadingNumbers.every((value, index) => value === rendered.perGroup[index]);
  if (!countsMatch) {
    issues.push({
      code: "stem-count-mismatch",
      detail: `figure draws [${rendered.perGroup.join(", ")}] but the stem says [${leadingNumbers.join(", ")}]`
    });
  }

  const stemTones = practiceFigureStemTones(question);
  if (stemTones.length) {
    const figureTones = diagram.groups.map((group) => group.tone);
    const tonesMatch =
      stemTones.length === figureTones.length && stemTones.every((tone, index) => tone === figureTones[index]);
    if (!tonesMatch) {
      issues.push({
        code: "stem-colour-mismatch",
        detail: `figure uses [${figureTones.join(", ")}] but the stem names [${stemTones.join(", ")}]`
      });
    }
  }

  if (spec.represents === "total-of-counters" && !isExpectedAnswerRepresented(question, String(rendered.total))) {
    issues.push({
      code: "answer-mismatch",
      detail: `figure totals ${rendered.total}, which is not an accepted answer (${question.answer})`
    });
  }

  // A figure that prints the total is not a manipulative, it is the answer key.
  const answerNumeral = question.answer.trim();
  diagram.groups.forEach((group, groupIndex) => {
    if (!group.label) return;
    const labelTexts = [group.label.en, group.label.zh, group.label.zhHans ?? group.label.zh];
    if (labelTexts.some((text) => new RegExp(`(?:^|\\D)${answerNumeral}(?:\\D|$)`).test(text))) {
      issues.push({ code: "answer-leak", detail: `group-${groupIndex} label states the answer ${answerNumeral}` });
    }
  });

  return issues;
}

export function auditPracticeFigureSpec(
  spec: UsCaliforniaPracticeFigureSpec,
  question: Question | undefined
): PracticeFigureAuditIssue[] {
  if (!question) {
    return [{ code: "question-missing", detail: `${spec.questionId} is not in the live California bank` }];
  }

  const issues: PracticeFigureAuditIssue[] = [];

  if (question.diagram !== spec.diagram) {
    issues.push({ code: "diagram-not-attached", detail: "spec is not reaching the question the app serves" });
  }

  const normalized = normalizeQuestionDiagram(spec.diagram);
  if (!normalized) {
    issues.push({ code: "spec-invalid", detail: "diagram does not conform to the figure spec" });
    return issues;
  }

  validateQuestionDiagram(normalized).forEach((issue) => issues.push({ code: "render-issue", detail: issue }));
  issues.push(...auditTenFrame(spec, question));
  return issues;
}

export function buildPracticeFigureAuditReport(
  specs: UsCaliforniaPracticeFigureSpec[] = usCaliforniaPracticeFigureSpecs
): PracticeFigureAuditReport {
  const questionById = new Map(usCaliforniaQuestions.map((question) => [question.id, question]));

  const rows: PracticeFigureAuditRow[] = specs.map((spec) => {
    const question = questionById.get(spec.questionId);
    return {
      questionId: spec.questionId,
      archetype: spec.archetype,
      grade: question?.grade ?? "unknown",
      standardIds: spec.standardIds,
      issues: auditPracticeFigureSpec(spec, question)
    };
  });

  const failed = rows.filter((row) => row.issues.length).length;
  return {
    specVersion: usCaliforniaPracticeFigureSpecVersion,
    checked: rows.length,
    passed: rows.length - failed,
    failed,
    rows
  };
}

export function practiceFigureAuditMarkdown(report: PracticeFigureAuditReport) {
  const lines = [
    `# Practice figure audit — ${report.specVersion}`,
    "",
    `- Checked: ${report.checked}`,
    `- Passed: ${report.passed}`,
    `- Failed: ${report.failed}`,
    "",
    "| Question | Archetype | Grade | Standards | Issues |",
    "| --- | --- | --- | --- | --- |"
  ];

  report.rows.forEach((row) => {
    const issues = row.issues.length ? row.issues.map((issue) => `${issue.code}: ${issue.detail}`).join("; ") : "pass";
    lines.push(`| ${row.questionId} | ${row.archetype} | ${row.grade} | ${row.standardIds.join(", ")} | ${issues} |`);
  });

  return `${lines.join("\n")}\n`;
}
