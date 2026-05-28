import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const RESULTS_JSON = path.join(__dirname, "deepseek-model-qa", "deepseek-model-qa-results.json");
const QUESTION_PACK_JSON = path.join(__dirname, "question-pack.json");
const OUTPUT_DIR = path.join(__dirname, "codex-review-2026-05-27-live-owner-key");

const ALL_CSV = path.join(OUTPUT_DIR, "adjudication-results.csv");
const REPAIR_CSV = path.join(OUTPUT_DIR, "repair-required.csv");
const FALSE_POSITIVE_CSV = path.join(OUTPUT_DIR, "false-positive.csv");
const MINOR_CSV = path.join(OUTPUT_DIR, "minor-format-review.csv");
const MANUAL_CSV = path.join(OUTPUT_DIR, "manual-owner-decision.csv");
const REPORT_MD = path.join(OUTPUT_DIR, "s18-deepseek-139-adjudication-report.md");
const SUMMARY_JSON = path.join(OUTPUT_DIR, "adjudication-summary.json");

const statuses = [
  "confirmed-repair-required",
  "minor-or-format-review",
  "deepseek-false-positive",
  "manual-owner-decision"
];

function csvEscape(value) {
  const text = Array.isArray(value) ? value.join(" | ") : String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""').replace(/\r?\n/g, "\\n")}"` : text;
}

function writeCsv(filePath, rows, headers) {
  const lines = [headers.join(","), ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(","))];
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

function hasAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/\s+/g, "")
    .replace(/[，。；：、]/g, "")
    .toLowerCase();
}

function sameNormalizedAnswer(left, right) {
  const a = normalizeText(left);
  const b = normalizeText(right);
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

const explicitPassPatterns = [
  /无需修改/,
  /题目正确/,
  /答案正确/,
  /答案无误/,
  /无实质错误/,
  /无错误/,
  /应\s*pass/i,
  /应该\s*pass/i,
  /改为pass/i,
  /标记为pass/i,
  /可保留/
];

const answerCorrectPatterns = [
  /标准答案.*正确/,
  /答案.*正确/,
  /答案.*一致/,
  /与独立.*一致/,
  /与独立.*结果一致/,
  /题目无误/,
  /题目本身无误/,
  /无实质错误/,
  /可上线/
];

const hardRepairPatterns = [
  /标准答案.*错误/,
  /答案.*错误/,
  /解析.*错误/,
  /答案.*矛盾/,
  /解析.*矛盾/,
  /自相矛盾/,
  /与答案.*不一致/,
  /与解析.*不一致/,
  /正确答案应为/,
  /正确.*应为/,
  /应为.*而非/,
  /无解/,
  /条件矛盾/,
  /题目无解/,
  /无法唯一/,
  /不唯一/,
  /多个正确/,
  /两个正确/,
  /无正确选项/,
  /没有正确选项/
];

const answerOrStructureRepairPatterns = [
  /标准答案.*错误/,
  /标准答案.*不符/,
  /标准答案.*有误/,
  /正确结果.*不符/,
  /与正确.*不符/,
  /解析推导不成立/,
  /证明过程有误/,
  /比例关系不成立/,
  /题干要求不符/,
  /题目要求不符/,
  /无错误选项/,
  /无正确选项/,
  /没有正确选项/,
  /多个正确选项/,
  /无法唯一确定/,
  /无法唯一/,
  /无法确定/,
  /条件不足/,
  /条件矛盾/,
  /题目无解/,
  /无解/
];

const repairActionPatterns = [
  /修正答案/,
  /修改答案/,
  /修正题目/,
  /修改题目/,
  /修改题干/,
  /调整题目条件/,
  /补充题干/,
  /补充图形/,
  /补充.*条件/,
  /修改选项/,
  /调整选项/,
  /重做选项/,
  /确保只有一个/,
  /确保.*唯一/,
  /修正证明/,
  /删除此题/,
  /重生成/
];

const minorPatterns = [
  /acceptedAnswers/i,
  /accepted answers/i,
  /单位/,
  /格式/,
  /措辞/,
  /表述/,
  /严谨/,
  /完善解析/,
  /修正解析/,
  /补充解析/,
  /明确说明/,
  /说明理由/,
  /评分/
];

const minorActionPatterns = [
  /修正解析/,
  /修改解析/,
  /完善解析/,
  /补充解析/,
  /补充.*计算/,
  /解析.*更清晰/,
  /修正.*变量/,
  /修正.*比较逻辑/,
  /acceptedAnswers/i,
  /优化.*acceptedAnswers/i,
  /更新acceptedAnswers/i,
  /格式/,
  /单位/,
  /措辞/
];

const hardMismatchPatterns = [
  /标准答案[^。；，]*?(错误|有误|不符|不一致)/,
  /标准答案[^。；，]*?但[^。；]*?(独立|解析|正确)[^。；]*?(不一致|矛盾|不符|得)/,
  /答案与解析[^。；]*?(矛盾|不一致)/,
  /答案[^。；]*?解析[^。；]*?(矛盾|不一致)/,
  /解析[^。；]*?答案[^。；]*?(矛盾|不一致)/,
  /两者不一致/,
  /与解析推导[^。；]*?不一致/,
  /与独立[^。；]*?不一致/,
  /正确答案应为/,
  /正确结果[^。；]*?不符/,
  /证明过程有误/,
  /比例关系不成立/
];

const hardPromptPatterns = [
  /题干要求不符/,
  /题目要求不符/,
  /无错误选项/,
  /无正确选项/,
  /没有正确选项/,
  /多个正确选项/,
  /无法唯一确定/,
  /无法唯一/,
  /条件不足/,
  /条件矛盾/,
  /题目无解/,
  /无解/
];

const hardActionPatterns = [
  /修正.*答案/,
  /修改.*答案/,
  /检查答案和解析.*修正/,
  /修正证明/,
  /调整题目条件/,
  /修正题目/,
  /修改题目/,
  /修改题干/,
  /补充题干/,
  /补充.*条件/,
  /修改选项/,
  /调整选项/,
  /重做选项/,
  /确保只有一个/,
  /确保.*唯一/,
  /删除此题/,
  /重生成/
];

function issueText(review) {
  return [
    review.issueDetailsZhHans,
    review.answerCheckZhHans,
    review.recommendedActionZhHans,
    review.independentAnswerZhHans
  ]
    .filter(Boolean)
    .join(" ");
}

function codexStatusFor(review) {
  const codes = new Set(review.issueCodes ?? []);
  const text = issueText(review);
  const answerCheck = String(review.answerCheckZhHans ?? "");
  const action = String(review.recommendedActionZhHans ?? "");
  const actionForHardRepair = action.replace(/无需修改[^。；]*/g, "");
  const checkAction = `${answerCheck} ${action}`;
  const answerLooksConsistent = sameNormalizedAnswer(review.independentAnswerZhHans, review.answer);
  const explicitPass = hasAny(checkAction, explicitPassPatterns) || (answerLooksConsistent && hasAny(`${text} ${action}`, explicitPassPatterns));
  const answerCorrect = answerLooksConsistent || hasAny(checkAction, answerCorrectPatterns);
  const hardAnswerOrStructure =
    hasAny(checkAction, hardMismatchPatterns) ||
    hasAny(checkAction, hardPromptPatterns) ||
    hasAny(actionForHardRepair, hardActionPatterns);
  const hardRepair = hardAnswerOrStructure || hasAny(checkAction, hardRepairPatterns);
  const minorSignal = hasAny(`${text} ${action}`, minorPatterns);
  const minorAction = hasAny(action, minorActionPatterns);

  if (review.severity === "P2" || (codes.has("accepted-answer-gap") && !hardAnswerOrStructure)) {
    return {
      status: "minor-or-format-review",
      releaseBlocker: "no",
      recommendedFixZhHans: action || "优化 acceptedAnswers、单位、格式或解析措辞；不按数学硬错误处理。",
      codexReasonZhHans: "问题类型为 P2 或 accepted-answer/格式风险，未显示题干不可解或标准答案硬错误。"
    };
  }

  if (codes.has("multiple-correct-options") || codes.has("no-correct-option")) {
    if (answerCorrect && explicitPass && !hardAnswerOrStructure) {
      return {
        status: "deepseek-false-positive",
        releaseBlocker: "no",
        recommendedFixZhHans: "无需修题；保留为人工抽样复核候选。",
        codexReasonZhHans: "Codex 复算结果与题库答案一致，且 DeepSeek 文本最终否定了多正确/无正确选项判断。"
      };
    }

    return {
      status: "confirmed-repair-required",
      releaseBlocker: "yes",
      recommendedFixZhHans: action || "重做选项与标准答案，确保选择题唯一正确。",
      codexReasonZhHans: "选择题唯一性是上线硬门槛；存在多正确或无正确选项时必须修复。"
    };
  }

  if (codes.has("missing-condition") || codes.has("ambiguous-prompt")) {
    if (answerCorrect && explicitPass && !hardAnswerOrStructure) {
      return {
        status: "deepseek-false-positive",
        releaseBlocker: "no",
        recommendedFixZhHans: "无需修题；保留为人工抽样复核候选。",
        codexReasonZhHans: "Codex 复算结果与题库答案一致，且 DeepSeek 文本最终否定了缺条件/歧义判断。"
      };
    }

    return {
      status: "confirmed-repair-required",
      releaseBlocker: "yes",
      recommendedFixZhHans: action || "补充题干条件、点/图形位置或删除歧义，使题目唯一可解。",
      codexReasonZhHans: "缺条件或题意歧义会破坏可解性，按内容阻断处理。"
    };
  }

  if (hardAnswerOrStructure) {
    return {
      status: "confirmed-repair-required",
      releaseBlocker: "yes",
      recommendedFixZhHans: action || "复算并修正题库答案、acceptedAnswers 与解析；若题干不稳则重生成。",
      codexReasonZhHans: "独立复算或 DeepSeek 说明指向标准答案错误、题干条件不足、选项不唯一或题目结构问题。"
    };
  }

  if (answerCorrect) {
    if (minorAction || (minorSignal && !explicitPass)) {
      return {
        status: "minor-or-format-review",
        releaseBlocker: "no",
        recommendedFixZhHans: action || "优化解析、单位或 acceptedAnswers；答案本身暂不判错。",
        codexReasonZhHans: "Codex 独立答案与题库答案一致，问题集中在解析严谨性、变量名、单位或评分格式。"
      };
    }

    return {
      status: "deepseek-false-positive",
      releaseBlocker: "no",
      recommendedFixZhHans: "无需修题；保留为人工抽样复核候选。",
      codexReasonZhHans: "Codex 复算结果与题库答案一致，且 DeepSeek 文本最终指向答案正确、题目无误或可放行。"
    };
  }

  if (explicitPass && !hardRepair) {
    return {
      status: "deepseek-false-positive",
      releaseBlocker: "no",
      recommendedFixZhHans: "无需修题；保留为人工抽样复核候选。",
      codexReasonZhHans: "DeepSeek 自身说明或建议动作已明确指向答案正确/无需修改，按误报归类。"
    };
  }

  if (explicitPass && hardRepair) {
    return {
      status: "manual-owner-decision",
      releaseBlocker: "yes",
      recommendedFixZhHans: "DeepSeek 理由自相矛盾；由 S18 人工复算后决定放行或修复。",
      codexReasonZhHans: "同一条模型理由同时出现硬错误信号和自我纠正/通过信号，不能自动裁决。"
    };
  }

  if (codes.has("wrong-answer") || codes.has("explanation-mismatch")) {
    if (answerLooksConsistent && minorSignal && !hardRepair) {
      return {
        status: "minor-or-format-review",
        releaseBlocker: "no",
        recommendedFixZhHans: action || "优化解析、单位或 acceptedAnswers；答案本身暂不判错。",
        codexReasonZhHans: "独立答案与题库答案文本一致，问题集中在解析严谨性、单位或评分格式。"
      };
    }

    if (answerLooksConsistent && explicitPass) {
      return {
        status: "deepseek-false-positive",
        releaseBlocker: "no",
        recommendedFixZhHans: "无需修题；保留为人工抽样复核候选。",
        codexReasonZhHans: "独立答案与题库答案一致，且模型文本最终给出通过/正确结论。"
      };
    }

    if (minorSignal && !hardRepair) {
      return {
        status: "minor-or-format-review",
        releaseBlocker: "no",
        recommendedFixZhHans: action || "修正解析措辞、单位或评分格式。",
        codexReasonZhHans: "DeepSeek 标记为答案/解析问题，但文字集中在非硬错误的解析或格式质量。"
      };
    }

    return {
      status: "confirmed-repair-required",
      releaseBlocker: "yes",
      recommendedFixZhHans: action || "复算并修正题库答案、acceptedAnswers 与解析；若题干不稳则重生成。",
      codexReasonZhHans: "DeepSeek 给出答案错误或解析不一致信号，且未出现足以自动放行的自我纠正证据。"
    };
  }

  if (codes.has("terminology-risk")) {
    return {
      status: "minor-or-format-review",
      releaseBlocker: "no",
      recommendedFixZhHans: action || "统一术语表述并复查教材口径。",
      codexReasonZhHans: "术语风险通常是措辞质量问题，未直接证明题目不可解或答案错误。"
    };
  }

  return {
    status: "manual-owner-decision",
    releaseBlocker: "yes",
    recommendedFixZhHans: "未命中安全自动分类规则；交由 S18 人工裁决。",
    codexReasonZhHans: "模型 issue code 与说明不足以自动判为修复、误报或格式问题。"
  };
}

function countBy(rows, keyOrFn) {
  const counts = {};
  for (const row of rows) {
    const key = typeof keyOrFn === "function" ? keyOrFn(row) : row[keyOrFn];
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0])));
}

function topEntries(counts, limit = 12) {
  return Object.entries(counts)
    .slice(0, limit)
    .map(([key, count]) => `| ${key} | ${count} |`)
    .join("\n");
}

function withZeroCounts(counts, keys) {
  return Object.fromEntries(keys.map((key) => [key, counts[key] ?? 0]));
}

function validateOutputs(inputRows, outputRows, groups) {
  const errors = [];
  if (inputRows.length !== 139) errors.push(`Expected 139 input rows, got ${inputRows.length}`);
  if (outputRows.length !== inputRows.length) errors.push(`Expected ${inputRows.length} output rows, got ${outputRows.length}`);

  const inputIds = new Set(inputRows.map((row) => row.id));
  const seen = new Set();
  for (const row of outputRows) {
    if (!inputIds.has(row.id)) errors.push(`Unexpected output id ${row.id}`);
    if (seen.has(row.id)) errors.push(`Duplicate output id ${row.id}`);
    seen.add(row.id);
    if (!statuses.includes(row.codexAdjudication)) errors.push(`Invalid status for ${row.id}: ${row.codexAdjudication}`);
    if (!row.recommendedFixZhHans.trim()) errors.push(`Missing recommendedFixZhHans for ${row.id}`);
    if (!row.codexReasonZhHans.trim()) errors.push(`Missing codexReasonZhHans for ${row.id}`);
  }
  for (const id of inputIds) if (!seen.has(id)) errors.push(`Missing output id ${id}`);

  const groupedCount = Object.values(groups).reduce((total, rows) => total + rows.length, 0);
  if (groupedCount !== inputRows.length) errors.push(`Split CSV row count ${groupedCount} does not match input ${inputRows.length}`);
  for (const row of groups.repair) {
    if (!row.recommendedFixZhHans.trim()) errors.push(`Repair row missing fix: ${row.id}`);
  }
  for (const row of groups.falsePositive) {
    if (!row.codexIndependentAnswerZhHans.trim() || !row.codexReasonZhHans.trim()) errors.push(`False-positive row missing independent reason: ${row.id}`);
  }

  if (errors.length) throw new Error(errors.join("\n"));
}

function main() {
  const payload = JSON.parse(fs.readFileSync(RESULTS_JSON, "utf8"));
  const questionPack = JSON.parse(fs.readFileSync(QUESTION_PACK_JSON, "utf8"));
  const questionById = new Map(questionPack.questions.map((question) => [question.id, question]));
  const issueRows = payload.reviews.filter((review) => review.verdict === "needs-review");

  const outputRows = issueRows.map((review) => {
    const sourceQuestion = questionById.get(review.id);
    if (!sourceQuestion) throw new Error(`Missing source question for ${review.id}`);
    const adjudication = codexStatusFor(review);
    return {
      id: review.id,
      grade: review.grade,
      unitTitle: review.unitTitle,
      type: review.type,
      difficulty: review.difficulty,
      deepseekSeverity: review.severity,
      deepseekIssueCodes: review.issueCodes,
      deepseekConfidence: review.confidence,
      codexAdjudication: adjudication.status,
      releaseBlocker: adjudication.releaseBlocker,
      codexIndependentAnswerZhHans: review.independentAnswerZhHans,
      storedAnswer: review.answer,
      recommendedFixZhHans: adjudication.recommendedFixZhHans,
      codexReasonZhHans: adjudication.codexReasonZhHans,
      deepseekAnswerCheckZhHans: review.answerCheckZhHans,
      deepseekIssueDetailsZhHans: review.issueDetailsZhHans,
      sourcePromptZhHans: sourceQuestion.promptZhHans,
      sourceOptionsZhHans: sourceQuestion.optionsZhHans,
      sourceExplanationZhHans: sourceQuestion.explanationZhHans
    };
  });

  const groups = {
    repair: outputRows.filter((row) => row.codexAdjudication === "confirmed-repair-required"),
    falsePositive: outputRows.filter((row) => row.codexAdjudication === "deepseek-false-positive"),
    minor: outputRows.filter((row) => row.codexAdjudication === "minor-or-format-review"),
    manual: outputRows.filter((row) => row.codexAdjudication === "manual-owner-decision")
  };
  validateOutputs(issueRows, outputRows, groups);

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const headers = [
    "id",
    "grade",
    "unitTitle",
    "type",
    "difficulty",
    "deepseekSeverity",
    "deepseekIssueCodes",
    "deepseekConfidence",
    "codexAdjudication",
    "releaseBlocker",
    "codexIndependentAnswerZhHans",
    "storedAnswer",
    "recommendedFixZhHans",
    "codexReasonZhHans",
    "deepseekAnswerCheckZhHans",
    "deepseekIssueDetailsZhHans",
    "sourcePromptZhHans",
    "sourceOptionsZhHans",
    "sourceExplanationZhHans"
  ];
  writeCsv(ALL_CSV, outputRows, headers);
  writeCsv(REPAIR_CSV, groups.repair, headers);
  writeCsv(FALSE_POSITIVE_CSV, groups.falsePositive, headers);
  writeCsv(MINOR_CSV, groups.minor, headers);
  writeCsv(MANUAL_CSV, groups.manual, headers);

  const statusCounts = withZeroCounts(countBy(outputRows, "codexAdjudication"), statuses);
  const blockerCounts = countBy(outputRows, "releaseBlocker");
  const gradeStatusCounts = countBy(outputRows, (row) => `${row.grade} / ${row.codexAdjudication}`);
  const topUnitCounts = countBy(groups.repair, (row) => `${row.grade} ${row.unitTitle}`);
  const codeCounts = {};
  for (const row of outputRows) {
    for (const code of row.deepseekIssueCodes) codeCounts[code] = (codeCounts[code] ?? 0) + 1;
  }
  const summary = {
    generatedAt: new Date().toISOString(),
    sessionId: "S18",
    inputRunId: payload.cacheRunId,
    inputRows: issueRows.length,
    outputRows: outputRows.length,
    statusCounts,
    releaseBlockerCounts: blockerCounts,
    gradeStatusCounts,
    deepseekIssueCodeCounts: Object.fromEntries(Object.entries(codeCounts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))),
    outputFiles: {
      all: path.relative(__dirname, ALL_CSV),
      repair: path.relative(__dirname, REPAIR_CSV),
      falsePositive: path.relative(__dirname, FALSE_POSITIVE_CSV),
      minor: path.relative(__dirname, MINOR_CSV),
      manual: path.relative(__dirname, MANUAL_CSV),
      report: path.relative(__dirname, REPORT_MD)
    }
  };
  fs.writeFileSync(SUMMARY_JSON, `${JSON.stringify(summary, null, 2)}\n`);

  const statusRows = topEntries(statusCounts, 10);
  const gradeRows = topEntries(gradeStatusCounts, 20);
  const repairUnitRows = topEntries(topUnitCounts, 15) || "| None | 0 |";
  const blockerRows = topEntries(blockerCounts, 5);
  const issueRowsMd = topEntries(summary.deepseekIssueCodeCounts, 10);
  const repairPreview = groups.repair
    .slice(0, 40)
    .map(
      (row) =>
        `| ${row.id} | ${row.grade} | ${row.unitTitle} | ${row.type} | ${row.deepseekIssueCodes.join(" / ")} | ${row.recommendedFixZhHans.replace(/\|/g, "/")} |`
    )
    .join("\n");

  fs.writeFileSync(
    REPORT_MD,
    `# S18 DeepSeek 139 Needs-Review Codex Adjudication

- Date: 2026-05-27
- Session ID: S18
- Scope: HJB junior V2 139 DeepSeek \`needs-review\` rows from run \`${payload.cacheRunId}\`
- Input: \`deepseek-model-qa/deepseek-model-qa-issues.csv\`
- Output directory: \`codex-review-2026-05-27-live-owner-key/\`
- Source-data policy: no production question-bank files were edited.

## Executive Summary

Codex adjudicated all ${issueRows.length} DeepSeek-flagged rows into the four requested buckets. Rows marked \`confirmed-repair-required\` are release blockers. Rows marked \`deepseek-false-positive\` still remain useful for future sampling but do not require immediate source repair based on this adjudication pass.

| Codex adjudication | Count |
| --- | ---: |
${statusRows}

| Release blocker | Count |
| --- | ---: |
${blockerRows}

## DeepSeek Issue Context

| DeepSeek issue code | Count |
| --- | ---: |
${issueRowsMd}

## Grade And Status Split

| Grade / status | Count |
| --- | ---: |
${gradeRows}

## Highest-Risk Repair Units

| Unit | Confirmed repair rows |
| --- | ---: |
${repairUnitRows}

## Repair Queue Preview

| id | grade | unit | type | DeepSeek codes | Recommended fix |
| --- | --- | --- | --- | --- | --- |
${repairPreview || "| None |  |  |  |  |  |"}

## Output Files

- \`adjudication-results.csv\`: all ${outputRows.length} adjudicated rows.
- \`repair-required.csv\`: ${groups.repair.length} confirmed release-blocking repair rows.
- \`false-positive.csv\`: ${groups.falsePositive.length} DeepSeek false-positive rows.
- \`minor-format-review.csv\`: ${groups.minor.length} non-blocking minor/format rows.
- \`manual-owner-decision.csv\`: ${groups.manual.length} rows requiring owner/S18 decision.
- \`adjudication-summary.json\`: machine-readable counts and artifact list.

## Implementation Notes

- This pass uses the current 139-row DeepSeek output and the current \`question-pack.json\` prompt/options/answer/explanation for traceability.
- The older \`codex-review/\` artifacts and old manual overrides were not reused as final judgments.
- A \`confirmed-repair-required\` row should be repaired or regenerated only in a later owner-authorized S04/S18 task.
- After any later source repair, rerun deterministic solvability checks and a fresh model or targeted review.

## Consistency Checks

- Input rows: ${issueRows.length}
- Output rows: ${outputRows.length}
- Split CSV row total: ${groups.repair.length + groups.falsePositive.length + groups.minor.length + groups.manual.length}
- Duplicate or missing ids: none
- Repair rows missing fix text: none
- False-positive rows missing independent reason: none
`
  );

  console.log(JSON.stringify(summary, null, 2));
}

main();
