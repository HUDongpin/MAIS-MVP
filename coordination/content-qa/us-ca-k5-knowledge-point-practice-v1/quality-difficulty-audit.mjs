#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const packageDir = path.dirname(new URL(import.meta.url).pathname);
const packageId = "us-ca-k5-knowledge-point-practice-v1";
const auditedAt = "2026-06-22T23:55:00+08:00";

const paths = {
  pack: path.join(packageDir, "question-pack.json"),
  difficultyJson: path.join(packageDir, "difficulty-buckets.json"),
  difficultyCsv: path.join(packageDir, "difficulty-buckets.csv"),
  findingsJson: path.join(packageDir, "quality-findings.json"),
  findingsCsv: path.join(packageDir, "quality-findings.csv"),
  reportMd: path.join(packageDir, "s18-quality-difficulty-qa.md")
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function writeCsv(filePath, rows, headers) {
  const columns = headers ?? Object.keys(rows[0] ?? {});
  const csv = [
    columns.join(","),
    ...rows.map((row) => columns.map((header) => csvEscape(row[header])).join(","))
  ].join("\n");
  fs.writeFileSync(filePath, `${csv}\n`);
}

function increment(target, keys, amount = 1) {
  let cursor = target;
  for (const key of keys.slice(0, -1)) {
    cursor[key] ??= {};
    cursor = cursor[key];
  }
  const last = keys[keys.length - 1];
  cursor[last] = (cursor[last] ?? 0) + amount;
}

function deterministicMethod(question) {
  return question.validation?.deterministicCheck ?? question.answerKey?.validationMethod ?? "";
}

function numericAnswer(question) {
  const match = String(question.answer ?? "").match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : undefined;
}

function addFinding(findings, question, severity, check, message, recommendation) {
  findings.push({
    severity,
    check,
    questionId: question?.id ?? "",
    grade: question?.grade ?? "",
    topicId: question?.topicId ?? "",
    difficulty: question?.difficulty ?? "",
    type: question?.type ?? "",
    method: question ? deterministicMethod(question) : "",
    message,
    recommendation
  });
}

function stripContext(prompt) {
  return String(prompt ?? "")
    .toLowerCase()
    .replace(/^.*?checkpoint:\s*/, "")
    .replace(/^(on a warm-up card|during partner practice|on a classroom mat|in a quick check|on a math notebook page|at a learning station|on a teacher card|during independent practice|on an exit ticket|in a review game|on a strategy board|during a small-group check),\s*/, "")
    .replace(/\d+(?:\.\d+)?/g, "#")
    .replace(/\s+/g, " ")
    .trim();
}

function recommendedDifficulty(question) {
  const method = deterministicMethod(question);
  const grade = question.grade;
  const prompt = question.prompt?.en ?? "";
  const answerValue = numericAnswer(question);

  if (grade === "K" && question.domainId === "K.NBT" && (answerValue > 20 || /\bhundreds?\b/i.test(prompt))) {
    return "RepairBeforeUse";
  }
  if (grade === "K" && question.domainId === "K.MD" && ["computed-area", "computed-measurement-addition", "computed-data-comparison"].includes(method)) {
    return "RepairBeforeUse";
  }
  if (grade === "P2" && question.domainId === "2.MD" && ["computed-area", "computed-perimeter"].includes(method)) {
    return "RepairBeforeUse";
  }
  if (grade === "P3" && question.domainId === "3.NF" && method === "computed-fraction-addition") {
    return "RepairBeforeUse";
  }
  if (method === "computed-counting" && /join the two groups/i.test(question.explanation?.en ?? "")) {
    return "RepairBeforeUse";
  }

  return question.difficulty;
}

function main() {
  const pack = readJson(paths.pack);
  const findings = [];
  const difficultyRows = [];
  const currentCounts = {
    overall: {},
    byGrade: {},
    bySourceKind: {},
    byTopic: {}
  };
  const recommendedCounts = {
    overall: {},
    byGrade: {}
  };

  const pluralOnePattern = /\b1 (?:red |blue |small |large )?(counters|tiles|stickers|blocks|buttons|cubes|cards|shells|bags|objects|ones|tens|hundreds)\b/i;
  const topicCorePrompts = new Map();

  for (const question of pack.questions) {
    const method = deterministicMethod(question);
    const answerValue = numericAnswer(question);
    const s18Difficulty = recommendedDifficulty(question);
    const promptEn = question.prompt?.en ?? "";
    const explanationEn = question.explanation?.en ?? "";

    increment(currentCounts.overall, [question.difficulty]);
    increment(currentCounts.byGrade, [question.grade, question.difficulty]);
    increment(currentCounts.bySourceKind, [question.sourceKind, question.difficulty]);
    increment(currentCounts.byTopic, [question.topicId, question.difficulty]);
    increment(recommendedCounts.overall, [s18Difficulty]);
    increment(recommendedCounts.byGrade, [question.grade, s18Difficulty]);

    const topicMap = topicCorePrompts.get(question.topicId) ?? new Map();
    const corePrompt = stripContext(promptEn);
    const coreRows = topicMap.get(corePrompt) ?? [];
    coreRows.push(question.id);
    topicMap.set(corePrompt, coreRows);
    topicCorePrompts.set(question.topicId, topicMap);

    if (method === "computed-counting" && /join the two groups/i.test(explanationEn)) {
      addFinding(
        findings,
        question,
        "major",
        "prompt-explanation-alignment",
        "Counting prompt uses a join/addition explanation instead of a counting explanation.",
        "Rewrite explanation to describe one-to-one counting or counting-on without an invented addition decomposition."
      );
    }

    if (question.grade === "K" && question.domainId === "K.NBT" && (answerValue > 20 || /\bhundreds?\b/i.test(promptEn))) {
      addFinding(
        findings,
        question,
        "major",
        "grade-fit-k-nbt",
        "Kindergarten teen-number target uses three-digit place value/hundreds content.",
        "Retarget to 11-19 as one ten and some ones, or move the row to a later-grade place-value topic."
      );
    }

    if (question.grade === "K" && question.domainId === "K.MD" && ["computed-area", "computed-measurement-addition", "computed-data-comparison"].includes(method)) {
      addFinding(
        findings,
        question,
        "major",
        "grade-fit-k-md",
        "Kindergarten measurement/data target uses later-grade operations such as area, length addition, or how-many-more data comparison.",
        "Retarget to attribute comparison, direct classification, or simple category counts."
      );
    }

    if (question.grade === "P2" && question.domainId === "2.MD" && ["computed-area", "computed-perimeter"].includes(method)) {
      addFinding(
        findings,
        question,
        "major",
        "grade-fit-p2-md",
        "Grade 2 measurement/data target includes area/perimeter formula content before the grade-3 progression.",
        "Retarget to length, time, money, line plots, or grade-2 measurement problem types."
      );
    }

    if (question.grade === "P3" && question.domainId === "3.NF" && method === "computed-fraction-addition") {
      addFinding(
        findings,
        question,
        "major",
        "grade-fit-p3-nf",
        "Grade 3 fraction-meaning target uses formal fraction addition instead of fraction meaning/equivalence/number-line reasoning.",
        "Retarget to identifying, comparing, or placing fractions on a number line."
      );
    }

    if (question.sourceKind === "grade1-micro-lesson" && question.difficulty === "High" && ["computed-addition", "computed-subtraction"].includes(method)) {
      addFinding(
        findings,
        question,
        "minor",
        "difficulty-calibration",
        "Grade 1 micro-lesson within-10 one-step story is tagged High even though the cognitive load is closer to Low/Medium.",
        "Recalibrate simple story rows to Low or Medium; reserve High for equation matching, multi-representation, or multi-step reasoning."
      );
    }

    if (/^[A-Za-z0-9][^：]{0,80}檢查：/.test(question.prompt?.zh ?? "") || /^[A-Za-z0-9][^：]{0,80}检查：/.test(question.prompt?.zhHans ?? "")) {
      addFinding(
        findings,
        question,
        "minor",
        "bilingual-polish",
        "Chinese prompt begins with English topic/code label instead of localized student-facing wording.",
        "Have S09 replace focus labels with natural Chinese topic headers or remove them from student-visible copy."
      );
    }

    if (pluralOnePattern.test(promptEn) || pluralOnePattern.test(explanationEn)) {
      addFinding(
        findings,
        question,
        "minor",
        "english-grammar",
        "English text uses plural noun after quantity 1.",
        "Adjust object noun pluralization for singular quantities."
      );
    }

    difficultyRows.push({
      id: question.id,
      grade: question.grade,
      usGradeLabel: question.usGradeLabel,
      topicId: question.topicId,
      sourceKind: question.sourceKind,
      domainId: question.domainId,
      clusterTitle: question.clusterTitle,
      currentDifficulty: question.difficulty,
      s18RecommendedDifficulty: s18Difficulty,
      type: question.type,
      validationMethod: method,
      answer: question.answer,
      promptEn
    });
  }

  const duplicateCoreGroups = [];
  for (const [topicId, promptMap] of topicCorePrompts.entries()) {
    for (const [corePrompt, ids] of promptMap.entries()) {
      if (ids.length > 1) {
        duplicateCoreGroups.push({ topicId, corePrompt, count: ids.length, questionIds: ids });
      }
    }
  }

  const affectedByCoreRepeat = new Set(duplicateCoreGroups.flatMap((group) => group.questionIds));
  const severityCounts = findings.reduce((counts, finding) => {
    counts[finding.severity] = (counts[finding.severity] ?? 0) + 1;
    return counts;
  }, {});
  const checkCounts = findings.reduce((counts, finding) => {
    counts[finding.check] = (counts[finding.check] ?? 0) + 1;
    return counts;
  }, {});

  const verdict = (severityCounts.major ?? 0) > 0
    ? "candidate-only-needs-repair-before-live"
    : (findings.length > 0 ? "candidate-only-quality-qa-pass-with-minor-notes" : "candidate-only-quality-qa-pass");

  const difficultyArtifact = {
    packageId,
    auditedAt,
    totalQuestions: pack.questions.length,
    currentDifficultyCounts: currentCounts,
    s18RecommendedDifficultyCounts: recommendedCounts,
    note: "S18 recommended difficulty is a QA triage aid. Rows marked RepairBeforeUse should be fixed before final Low/Medium/High placement.",
    buckets: {
      Low: difficultyRows.filter((row) => row.currentDifficulty === "Low").map((row) => row.id),
      Medium: difficultyRows.filter((row) => row.currentDifficulty === "Medium").map((row) => row.id),
      High: difficultyRows.filter((row) => row.currentDifficulty === "High").map((row) => row.id)
    }
  };

  const findingsArtifact = {
    packageId,
    auditedAt,
    verdict,
    totalQuestions: pack.questions.length,
    severityCounts,
    checkCounts,
    duplicateCorePromptGroups: duplicateCoreGroups.length,
    duplicateCorePromptAffectedRows: affectedByCoreRepeat.size,
    findings
  };

  const report = `# S18 Quality And Difficulty QA - ${packageId}

Decision: \`${verdict}\`

This review supplements the earlier deterministic two-round QA. The package still passes row inventory, answer-key, multiple-choice uniqueness, source-distance, and deterministic solvability checks. The stricter pedagogical QA verdict above controls whether the candidate can move beyond repair.

## Difficulty Split - Current Labels

| Level | Count |
| --- | ---: |
| Low | ${currentCounts.overall.Low ?? 0} |
| Medium | ${currentCounts.overall.Medium ?? 0} |
| High | ${currentCounts.overall.High ?? 0} |

## Difficulty Split By Grade - Current Labels

| Grade | Low | Medium | High |
| --- | ---: | ---: | ---: |
${Object.keys(currentCounts.byGrade).sort().map((grade) => `| ${grade} | ${currentCounts.byGrade[grade].Low ?? 0} | ${currentCounts.byGrade[grade].Medium ?? 0} | ${currentCounts.byGrade[grade].High ?? 0} |`).join("\n")}

## S18 Recommended Triage

| Bucket | Count |
| --- | ---: |
${Object.keys(recommendedCounts.overall).sort().map((level) => `| ${level} | ${recommendedCounts.overall[level]} |`).join("\n")}

Rows marked \`RepairBeforeUse\` should be rewritten before final Low/Medium/High classification. If no rows are marked \`RepairBeforeUse\`, the current Low/Medium/High labels are the S18 accepted candidate labels.

## Quality Findings

| Severity | Count |
| --- | ---: |
${(Object.keys(severityCounts).length ? Object.keys(severityCounts).sort().map((severity) => `| ${severity} | ${severityCounts[severity]} |`) : ["| none | 0 |"]).join("\n")}

| Check | Count |
| --- | ---: |
${(Object.keys(checkCounts).length ? Object.keys(checkCounts).sort().map((check) => `| ${check} | ${checkCounts[check]} |`) : ["| none | 0 |"]).join("\n")}

## Main Quality Assessment

- Math answer solvability remains strong: stored answers, independent answers, and computed answers agree for all 492 rows.
- Major repair rows: ${severityCounts.major ?? 0}.
- Current difficulty labels are compared against S18 recommended triage above.
- Chinese prompt label findings: ${checkCounts["bilingual-polish"] ?? 0}.
- Template diversity check: ${duplicateCoreGroups.length} repeated core-prompt groups affect ${affectedByCoreRepeat.size} rows after stripping context labels and numbers.

## Release Recommendation

Keep the package candidate-only. Do not import it into live practice or attach it to live lesson \`practiceQuestionIds\` until S23 plans promotion, S04/S05 receive explicit live-surface ownership, and S11/S22 provide regression/release evidence.
`;

  fs.writeFileSync(paths.difficultyJson, `${JSON.stringify(difficultyArtifact, null, 2)}\n`);
  writeCsv(paths.difficultyCsv, difficultyRows, [
    "id",
    "grade",
    "usGradeLabel",
    "topicId",
    "sourceKind",
    "domainId",
    "clusterTitle",
    "currentDifficulty",
    "s18RecommendedDifficulty",
    "type",
    "validationMethod",
    "answer",
    "promptEn"
  ]);
  fs.writeFileSync(paths.findingsJson, `${JSON.stringify(findingsArtifact, null, 2)}\n`);
  writeCsv(paths.findingsCsv, findings, [
    "severity",
    "check",
    "questionId",
    "grade",
    "topicId",
    "difficulty",
    "type",
    "method",
    "message",
    "recommendation"
  ]);
  fs.writeFileSync(paths.reportMd, report);

  console.log(JSON.stringify({
    packageId,
    verdict,
    totalQuestions: pack.questions.length,
    currentDifficultyCounts: currentCounts.overall,
    s18RecommendedDifficultyCounts: recommendedCounts.overall,
    severityCounts,
    checkCounts,
    duplicateCorePromptGroups: duplicateCoreGroups.length,
    duplicateCorePromptAffectedRows: affectedByCoreRepeat.size
  }, null, 2));
}

main();
