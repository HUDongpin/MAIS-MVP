import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const RESULTS_JSON = path.join(__dirname, "deepseek-model-qa", "deepseek-model-qa-results.json");
const OUTPUT_DIR = path.join(__dirname, "codex-review");
const REVIEW_CSV = path.join(OUTPUT_DIR, "codex-review-results.csv");
const REPAIR_CSV = path.join(OUTPUT_DIR, "codex-review-repair-required.csv");
const FALSE_POSITIVE_CSV = path.join(OUTPUT_DIR, "codex-review-model-false-positive-candidates.csv");
const MANUAL_CSV = path.join(OUTPUT_DIR, "codex-review-manual-adjudication.csv");
const REPORT_MD = path.join(OUTPUT_DIR, "s18-codex-review-adjudication.md");
const DECISION_MD = path.join(__dirname, "s18-promotability-decision.md");

function csvEscape(value) {
  const text = Array.isArray(value) ? value.join(" | ") : String(value ?? "");
  return `"${text.replace(/"/g, '""').replace(/\r?\n/g, "\\n")}"`;
}

function writeCsv(filePath, rows, headers) {
  const lines = [headers.map(csvEscape).join(","), ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(","))];
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

function hasAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

const passSignals = [
  /答案正确/,
  /答案无误/,
  /无错误/,
  /无问题/,
  /无误/,
  /应\s*pass/i,
  /应该\s*pass/i,
  /本题.*pass/i,
  /误判/,
  /现纠正/,
  /重新检查.*正确/,
  /独立计算.*一致/
];

const hardErrorSignals = [
  /标准答案.*错误/,
  /答案.*错误/,
  /正确值应为/,
  /正确结果应为/,
  /应为.*而非/,
  /与答案.*矛盾/,
  /与标准答案.*矛盾/,
  /与解析.*矛盾/,
  /解析.*错误/,
  /不一致/,
  /存在两个正确/,
  /多个正确/,
  /无正确选项/,
  /没有正确选项/,
  /不唯一/,
  /无法唯一/,
  /缺少条件/,
  /条件.*矛盾/,
  /题目.*矛盾/,
  /自相矛盾/,
  /不能判定/,
  /无法确定/
];

const finalErrorSignals = [
  /因此.*错误/,
  /故.*错误/,
  /所以.*错误/,
  /答案错误/,
  /标准答案错误/,
  /答案.*矛盾/,
  /需要.*修改/,
  /需.*复核/
];

const finalPassSignals = [
  /因此.*正确/,
  /所以.*正确/,
  /答案正确/,
  /答案无误/,
  /题目无问题/,
  /无问题/,
  /应\s*pass/i,
  /应该\s*pass/i
];

const codexManualOverrides = new Map([
  [
    "hjb-junior-ds-v2-s1-009",
    {
      status: "likely-model-false-positive",
      action: "降级为抽样复核；化简为 -x² - 4x + 9，x=-1 时为12，答案和解析一致。",
      reason: "Codex algebra recomputation confirms the answer."
    }
  ],
  [
    "hjb-junior-ds-v2-s1-137",
    {
      status: "likely-model-false-positive",
      action: "降级为抽样复核；提取 -5x²y 后得 -5x²y(x - 3y + 2)，展开与原式一致。",
      reason: "Codex factorization check confirms the answer."
    }
  ],
  [
    "hjb-junior-ds-v2-s1-361",
    {
      status: "likely-model-false-positive",
      action: "降级为抽样复核；∠AOD=120°唯一正确，∠BOD为60°、∠BOC为120°。",
      reason: "Codex intersecting-lines option check confirms single correct choice."
    }
  ],
  [
    "hjb-junior-ds-v2-s1-354",
    {
      status: "repair-required",
      action: "修正答案与解析；AB⊥l2 且 B、C 在 l2 上时，∠ABC 应为 90°，不是 60°。",
      reason: "Codex geometry recomputation overrides model-contradictory status."
    }
  ],
  [
    "hjb-junior-ds-v2-s1-484",
    {
      status: "repair-required",
      action: "重做选项；BD = AD 与 AB = BD 都能判定△ABD是等腰三角形，单选不唯一。",
      reason: "Codex option check found a true multiple-correct single-choice blocker."
    }
  ],
  [
    "hjb-junior-ds-v2-s2-312",
    {
      status: "repair-required",
      action: "修正答案与解析；D、E为AB、AC中点时，DE与任意中线AF交于AF中点，AG:GF应为1:1。",
      reason: "Codex affine geometry check found the answer 2:1 is wrong."
    }
  ],
  [
    "hjb-junior-ds-v2-s2-012",
    {
      status: "minor-or-format-review",
      action: "修正解析措辞；答案3∛3 cm且介于4和5之间正确，但解析的连续整数说明不够严谨。",
      reason: "Codex cube-root check found answer correct with explanation polish needed."
    }
  ],
  [
    "hjb-junior-ds-v2-s2-030",
    {
      status: "likely-model-false-positive",
      action: "降级为抽样复核；³√50≈3.684，精确到0.1 cm为3.7 cm，解析比较成立。",
      reason: "Codex cube-root rounding check confirms the answer."
    }
  ],
  [
    "hjb-junior-ds-v2-s2-038",
    {
      status: "likely-model-false-positive",
      action: "降级为抽样复核；a²=2、b=2、b³=8，因此a²+b³=10。",
      reason: "Codex radical/cube-root recomputation confirms the answer."
    }
  ],
  [
    "hjb-junior-ds-v2-s2-171",
    {
      status: "likely-model-false-positive",
      action: "降级为抽样复核；k>-1/8且k≠1时整数解确为0,2,3,4,...。",
      reason: "Codex discriminant check confirms the answer."
    }
  ],
  [
    "hjb-junior-ds-v2-s2-198",
    {
      status: "likely-model-false-positive",
      action: "降级为抽样复核；海伦公式得面积126，面积法给出DE=84/11，答案与解析一致。",
      reason: "Codex triangle-area check confirms the answer."
    }
  ],
  [
    "hjb-junior-ds-v2-s2-371",
    {
      status: "likely-model-false-positive",
      action: "降级为抽样复核；A(-3,4)平移得B(2,2)，关于x轴对称得C(2,-2)。",
      reason: "Codex coordinate transformation check confirms the answer."
    }
  ],
  [
    "hjb-junior-ds-v2-s2-493",
    {
      status: "likely-model-false-positive",
      action: "降级为抽样复核；k=-6，B(-1,m)给出m=6，答案唯一。",
      reason: "Codex inverse-function substitution check confirms the answer."
    }
  ],
  [
    "hjb-junior-ds-v2-s3-099",
    {
      status: "likely-model-false-positive",
      action: "降级为抽样复核；15cos22°≈13.91，答案正确。",
      reason: "Codex trigonometric rounding check confirms the answer."
    }
  ],
  [
    "hjb-junior-ds-v2-s3-101",
    {
      status: "likely-model-false-positive",
      action: "降级为抽样复核；12tan35°+1.6≈10.0米，答案正确。",
      reason: "Codex trigonometric height check confirms the answer."
    }
  ],
  [
    "hjb-junior-ds-v2-s3-090",
    {
      status: "repair-required",
      action: "重生成或改条件；A点数据给出高度约16.8米，B点数据给出高度约15.0米，两次观测互相冲突。",
      reason: "Codex trigonometry recomputation found inconsistent measurement data."
    }
  ],
  [
    "hjb-junior-ds-v2-s3-034",
    {
      status: "likely-model-false-positive",
      action: "降级为抽样复核；A/B/C均可判定相似，D不能判定，答案正确。",
      reason: "Codex similar-triangles criterion check confirms the answer."
    }
  ],
  [
    "hjb-junior-ds-v2-s3-220",
    {
      status: "likely-model-false-positive",
      action: "降级为抽样复核；表格对称轴为x=2且开口向上，x>2时递增。",
      reason: "Codex quadratic table check confirms the answer."
    }
  ],
  [
    "hjb-junior-ds-v2-s3-445",
    {
      status: "likely-model-false-positive",
      action: "降级为抽样复核；方差复算支持丙厂最稳定。",
      reason: "Codex variance recomputation confirms the answer."
    }
  ],
  [
    "hjb-junior-ds-v2-s3-387",
    {
      status: "likely-model-false-positive",
      action: "降级为抽样复核；弦心距分别为3和4，异侧距离为7，O到AB可为3或4。",
      reason: "Codex circle chord-distance check confirms the answer."
    }
  ],
  [
    "hjb-junior-ds-v2-s3-404",
    {
      status: "likely-model-false-positive",
      action: "降级为抽样复核；两组平均数相同，甲方差更小，应选甲。",
      reason: "Codex variance check confirms the answer."
    }
  ],
  [
    "hjb-junior-ds-v2-s3-447",
    {
      status: "repair-required",
      action: "修正答案与解析；加权方差为200/121≈1.65，不是1.77。",
      reason: "Codex weighted-variance recomputation found a numeric answer error."
    }
  ]
]);

function tail(text, length = 260) {
  return text.slice(Math.max(0, text.length - length));
}

function codexStatus(review) {
  const override = codexManualOverrides.get(review.id);
  if (override) return override;

  const text = `${review.issueDetailsZhHans ?? ""} ${review.answerCheckZhHans ?? ""}`;
  const textTail = tail(text);
  const hasPass = hasAny(text, passSignals);
  const hasHardError = hasAny(text, hardErrorSignals);
  const tailSaysError = hasAny(textTail, finalErrorSignals);
  const tailSaysPass = hasAny(textTail, finalPassSignals);
  const codes = new Set(review.issueCodes ?? []);

  if (review.severity === "P2" || codes.has("accepted-answer-gap")) {
    return {
      status: "minor-or-format-review",
      action: "人工确认 acceptedAnswers/表述；通常不应作为整题淘汰依据。",
      reason: "DeepSeek severity/code indicates minor accepted-answer or wording risk."
    };
  }

  if (hasPass && tailSaysPass && !tailSaysError) {
    return {
      status: "likely-model-false-positive",
      action: "降级为抽样复核；除非人工复算发现新问题，否则不按 blocker 处理。",
      reason: "DeepSeek rationale contains self-correction/pass language and ends with a pass/correct conclusion."
    };
  }

  if (hasPass && hasHardError && !tailSaysError) {
    return {
      status: "manual-adjudication-required",
      action: "Codex 标记为模型自相矛盾；人工复算后再决定修复或放行。",
      reason: "DeepSeek rationale contains both pass/correct and hard-error signals."
    };
  }

  if (hasPass && !hasHardError) {
    return {
      status: "likely-model-false-positive",
      action: "降级为抽样复核；优先检查 acceptedAnswers 和格式。",
      reason: "DeepSeek flagged the row but its rationale says the answer is correct."
    };
  }

  if (codes.has("missing-condition") || codes.has("ambiguous-prompt")) {
    return {
      status: "repair-required",
      action: "修复题干条件/图形依赖/唯一性；无法修复则剔除或重生成。",
      reason: "Missing-condition or ambiguous-prompt issues are content blockers for a generated bank."
    };
  }

  if (codes.has("multiple-correct-options") || codes.has("no-correct-option")) {
    return {
      status: "repair-required",
      action: "重做选项和标准答案，确保单选题只有一个正确选项。",
      reason: "Single-choice validity failure."
    };
  }

  if (codes.has("wrong-answer") || codes.has("explanation-mismatch") || hasHardError || tailSaysError) {
    return {
      status: "repair-required",
      action: "复算并修正标准答案、acceptedAnswers、解析；若题干不稳则重生成。",
      reason: "Answer or explanation consistency blocker."
    };
  }

  return {
    status: "manual-adjudication-required",
    action: "人工复核该模型判断；暂不放行。",
    reason: "No safe automated adjudication path matched."
  };
}

function countBy(rows, key) {
  const counts = {};
  for (const row of rows) counts[row[key]] = (counts[row[key]] ?? 0) + 1;
  return counts;
}

function countByNested(rows, keyA, keyB) {
  const counts = {};
  for (const row of rows) {
    const key = `${row[keyA]} / ${row[keyB]}`;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function tableFromCounts(counts) {
  return Object.entries(counts)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([key, count]) => `| ${key} | ${count} |`)
    .join("\n");
}

function writePromotabilityDecision({ payload, issueRows, repairRows, falsePositiveRows, manualRows }) {
  const date = new Date().toISOString().slice(0, 10);
  const unresolvedMinor = manualRows.filter((row) => row.codexStatus === "minor-or-format-review").length;
  const decision = repairRows.length
    ? "candidate-model-qa-needs-repair-not-approved-for-public-integration"
    : unresolvedMinor
      ? "candidate-model-qa-minor-review-not-approved-for-public-integration"
      : "candidate-repaired-qa-green-not-approved-for-public-integration";
  const reason = repairRows.length
    ? `S18 Codex adjudication still finds ${repairRows.length} repair-required rows after the latest DeepSeek-v4-pro QA pass.`
    : unresolvedMinor
      ? `S18 Codex adjudication finds 0 repair-required rows, with ${unresolvedMinor} minor/format-review rows still needing final S18 manual confirmation.`
      : "S18 Codex adjudication finds 0 repair-required rows and no minor/manual blockers after the latest DeepSeek-v4-pro QA pass.";
  fs.writeFileSync(
    DECISION_MD,
    `# S18 Promotability Decision - Mainland HJB Junior Generated Bank V2 Candidate

- Date: ${date}
- Session ID: S18
- Decision: ${decision}
- Generated rows: 1500
- DeepSeek-v4-pro QA scope: ${payload.scope ?? "unknown"}
- DeepSeek-v4-pro QA result: ${payload.counts?.needsReview ? "Needs review" : "Model QA green"}
- DeepSeek flagged rows: ${issueRows.length}
- Codex repair-required rows: ${repairRows.length}
- Codex likely DeepSeek false-positive rows retained unchanged: ${falsePositiveRows.length}
- Codex minor/manual rows: ${manualRows.length}
- Reason: ${reason}
- Artifacts: \`deepseek-model-qa/deepseek-model-qa-results.json\`, \`codex-review/s18-codex-review-adjudication.md\`, and \`codex-review/codex-review-results.csv\`.
- App integration status: Not approved. Do not connect this package to \`data/questions.ts\`, App UI, API, lesson practice, or production data until a later owner-authorized integration task approves it.
`
  );
}

function main() {
  const payload = JSON.parse(fs.readFileSync(RESULTS_JSON, "utf8"));
  const issueRows = payload.reviews.filter((review) => review.verdict === "needs-review");
  const rows = issueRows.map((review) => {
    const adjudication = codexStatus(review);
    return {
      id: review.id,
      grade: review.grade,
      unitTitle: review.unitTitle,
      type: review.type,
      difficulty: review.difficulty,
      deepseekSeverity: review.severity,
      deepseekIssueCodes: review.issueCodes,
      deepseekConfidence: review.confidence,
      codexStatus: adjudication.status,
      codexAction: adjudication.action,
      codexReason: adjudication.reason,
      deepseekIssueDetailsZhHans: review.issueDetailsZhHans,
      promptZhHans: review.promptZhHans,
      answer: review.answer
    };
  });

  const repairRows = rows.filter((row) => row.codexStatus === "repair-required");
  const falsePositiveRows = rows.filter((row) => row.codexStatus === "likely-model-false-positive");
  const manualRows = rows.filter((row) => row.codexStatus === "manual-adjudication-required" || row.codexStatus === "minor-or-format-review");

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
    "codexStatus",
    "codexAction",
    "codexReason",
    "answer",
    "deepseekIssueDetailsZhHans",
    "promptZhHans"
  ];
  writeCsv(REVIEW_CSV, rows, headers);
  writeCsv(REPAIR_CSV, repairRows, headers);
  writeCsv(FALSE_POSITIVE_CSV, falsePositiveRows, headers);
  writeCsv(MANUAL_CSV, manualRows, headers);

  const statusCounts = countBy(rows, "codexStatus");
  const gradeStatusCounts = countByNested(rows, "grade", "codexStatus");
  const unitStatusCounts = countByNested(rows, "unitTitle", "codexStatus");
  const typeStatusCounts = countByNested(rows, "type", "codexStatus");
  const repairByUnit = countBy(repairRows, "unitTitle");

  const highPriorityRepair = repairRows
    .filter((row) => row.deepseekSeverity === "P1")
    .slice(0, 40)
    .map((row) => `| ${row.id} | ${row.grade} | ${row.unitTitle} | ${row.type} | ${row.deepseekIssueCodes.join(" | ")} | ${row.codexAction} |`)
    .join("\n");

  fs.writeFileSync(
    REPORT_MD,
    `# S18 Codex Review Adjudication - Mainland HJB Junior V2 DeepSeek Flags

- Date: 2026-05-25
- Session ID: S18
- Candidate package: \`mainland-hjb-junior-generated-bank-v2-1500\`
- Input: DeepSeek-v4-pro QA results, ${issueRows.length} \`needs-review\` rows.
- Scope: Codex triage/adjudication of model flags only; no production integration and no question rewriting in this pass.

## Executive Result

| Codex status | Count |
| --- | ---: |
${tableFromCounts(statusCounts)}

## Grade Split

| Grade / Codex status | Count |
| --- | ---: |
${tableFromCounts(gradeStatusCounts)}

## Type Split

| Type / Codex status | Count |
| --- | ---: |
${tableFromCounts(typeStatusCounts)}

## Repair-Required By Unit

| Unit | Count |
| --- | ---: |
${tableFromCounts(repairByUnit)}

## High-Priority Repair Queue Preview

| id | grade | unit | type | DeepSeek issue codes | Codex action |
| --- | --- | --- | --- | --- | --- |
${highPriorityRepair || "| None |  |  |  |  |  |"}

## Output Files

- \`codex-review-results.csv\`: all 236 DeepSeek-flagged rows with Codex adjudication status.
- \`codex-review-repair-required.csv\`: rows Codex triage treats as repair/regeneration blockers.
- \`codex-review-model-false-positive-candidates.csv\`: rows where the model rationale likely self-corrected to pass/correct.
- \`codex-review-manual-adjudication.csv\`: model-contradictory, accepted-answer, or wording rows requiring human math review before release.

## Interpretation

- \`repair-required\`: do not integrate as-is. Recalculate, fix answer/options/explanation, add missing conditions, or regenerate.
- \`likely-model-false-positive\`: DeepSeek's own rationale indicates the row is probably correct; keep only in human sampling unless a fresh recomputation finds an issue.
- \`manual-adjudication-required\`: model rationale is contradictory or too under-specified for safe automated adjudication.
- \`minor-or-format-review\`: likely accepted-answer or wording issue; not necessarily a math blocker.

## Release Decision

This package remains not approved for public integration. ${
      repairRows.length
        ? "The current safe next step is to remediate/regenerate the repair-required rows, manually adjudicate the smaller uncertain set, and rerun deterministic plus DeepSeek QA."
        : "The latest Codex adjudication has no repair-required rows; keep the package candidate-only until owner-authorized production integration review."
    }
`
  );

  writePromotabilityDecision({ payload, issueRows, repairRows, falsePositiveRows, manualRows });

  console.log(
    JSON.stringify(
      {
        inputIssues: issueRows.length,
        statusCounts,
        outputs: {
          report: REPORT_MD,
          reviewCsv: REVIEW_CSV,
          repairCsv: REPAIR_CSV,
          falsePositiveCsv: FALSE_POSITIVE_CSV,
          manualCsv: MANUAL_CSV
        }
      },
      null,
      2
    )
  );
}

main();
