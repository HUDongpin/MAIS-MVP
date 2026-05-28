import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const QUESTION_PACK = path.join(__dirname, "question-pack.json");
const QUESTIONS_JSONL = path.join(__dirname, "questions.jsonl");
const QUESTIONS_CSV = path.join(__dirname, "questions.csv");
const BATCH_DIR = path.join(__dirname, "batches");
const REMEDIATION_MD = path.join(__dirname, "s18-broad-qa-remediation.md");
const REMEDIATION_CSV = path.join(__dirname, "s18-broad-qa-remediation.csv");

const csvHeaders = [
  "id",
  "batch",
  "grade",
  "semester",
  "topicId",
  "unitTitle",
  "volume",
  "conceptIds",
  "difficulty",
  "type",
  "promptZhHans",
  "optionsZhHans",
  "answer",
  "acceptedAnswers",
  "explanationZhHans",
  "evidenceCardIds",
  "assessmentPatternCardIds",
  "paperPatternCardIds",
  "sourceDistanceStatus",
  "mathQaStatus",
  "terminologyQaStatus",
  "manualQaStatus",
  "reviewNotes"
];

const remediations = {
  "bnu-primary-ds-v2-p1-129": {
    issueTags: "public_readiness",
    action: "Rewrite prompt to state the two class events directly instead of referencing an implicit timetable.",
    fields: {
      promptZhHans: "小红上午10时上数学课，下午2时上美术课。小红说：“上午10时和下午2时我都在学校上课。”她说的对吗？请说明理由。",
      answer: "对，因为上午10时和下午2时都是上课时间，小红分别在上数学课和美术课，所以她在学校。",
      acceptedAnswers: [
        "对，因为上午10时和下午2时都是上课时间，小红分别在上数学课和美术课，所以她在学校。",
        "对，因为上午10时上数学课，下午2时上美术课，这两个时间她都在学校上课。"
      ],
      explanationZhHans: "题目说明小红上午10时上数学课，下午2时上美术课。上课时她在学校，所以这两个时间她都在学校。"
    }
  },
  "bnu-primary-ds-v2-p3-169": {
    issueTags: "ambiguous_mc|bad_options",
    action: "Replace unclear vertical-form choices with one unique correct distributive calculation process.",
    fields: {
      promptZhHans: "下面哪个计算过程正确地算出了 47×35？",
      optionsZhHans: [
        "47×35=47×30+47×5=1410+235=1645",
        "47×35=47×3+47×5=141+235=376",
        "47×35=47×30+47×5=1410+235=1545",
        "47×35=47×30-47×5=1410-235=1175"
      ],
      answer: "47×35=47×30+47×5=1410+235=1645",
      acceptedAnswers: ["47×35=47×30+47×5=1410+235=1645"],
      explanationZhHans: "把35分成30和5，先算47×30=1410，再算47×5=235，最后1410+235=1645，所以正确过程是47×35=47×30+47×5=1410+235=1645。"
    }
  },
  "bnu-primary-ds-v2-p3-233": {
    issueTags: "ambiguous_mc",
    action: "Make all distractors false so the data-reading multiple-choice item has exactly one correct option.",
    fields: {
      optionsZhHans: ["喜欢跳绳的人数最多，比踢毽子多4人。", "喜欢拍皮球的人数比丢沙包多6人。", "喜欢踢毽子的人数和丢沙包一共是15人。", "全班一共有38人。"],
      answer: "喜欢跳绳的人数最多，比踢毽子多4人。",
      acceptedAnswers: ["喜欢跳绳的人数最多，比踢毽子多4人。"],
      explanationZhHans: "跳绳12人最多，比踢毽子8人多4人，所以A正确。拍皮球10人比丢沙包6人多4人，不是6人；踢毽子和丢沙包共8+6=14人，不是15人；总人数是12+8+10+6=36人，不是38人。"
    }
  },
  "bnu-primary-ds-v2-p4-192": {
    issueTags: "language_issue",
    action: "Remove the answer from the stem and ask students to sum the visible layer counts.",
    fields: {
      promptZhHans: "一个立体图形由同样的小正方体搭成。第一层横着排3个小正方体，第二层在最左边的小正方体上面叠1个，第一层中间那个小正方体的后面还放1个。这个立体图形一共有______个小正方体。",
      answer: "5",
      acceptedAnswers: ["5"],
      explanationZhHans: "第一层横着排3个，第二层叠1个，后面还放1个，一共3+1+1=5个小正方体。"
    }
  },
  "bnu-primary-ds-v2-p4-243": {
    issueTags: "ambiguous_mc|accepted_answer_gap",
    action: "Change the shape set and classification standard so only one option is mathematically robust.",
    fields: {
      promptZhHans: "在整理复习时，小丽列出了本学期学过的几种四边形：长方形、正方形、平行四边形、梯形。她想把这些图形分成两类，下面哪种分类标准是正确的？",
      optionsZhHans: ["按两组对边是否分别平行分类", "按边的条数分类", "按是否由线段围成分类", "按图形的大小分类"],
      answer: "按两组对边是否分别平行分类",
      acceptedAnswers: ["按两组对边是否分别平行分类"],
      explanationZhHans: "长方形、正方形、平行四边形都有两组对边分别平行，梯形通常只有一组对边平行，所以可以按两组对边是否分别平行分成两类。其他选项不能稳定地区分这些图形。"
    }
  },
  "bnu-primary-ds-v2-p5-069": {
    issueTags: "accepted_answer_gap",
    action: "Remove the decimal accepted answer because the prompt explicitly asks for a fraction.",
    fields: {
      acceptedAnswers: ["3/4块", "四分之三块"]
    }
  },
  "bnu-primary-ds-v2-p5-241": {
    issueTags: "ambiguous_mc",
    action: "Replace the algebraically equivalent distractor with an actually incorrect expression.",
    fields: {
      optionsZhHans: ["1 - 2/5 + 1/4", "1 - (2/5 + 1/4)", "2/5 + 1/4", "1 - (2/5 - 1/4)"],
      answer: "1 - (2/5 + 1/4)",
      acceptedAnswers: ["1 - (2/5 + 1/4)"],
      explanationZhHans: "把这批书看作单位“1”，历史书占剩下的部分，应从1中减去科普书和文学书的分率和，即1 - (2/5 + 1/4)。其他列式没有同时减去这两部分的和。"
    }
  }
};

function csvEscape(value) {
  const text = Array.isArray(value) ? value.join(" | ") : String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function writeQuestionsCsv(rows) {
  const lines = [csvHeaders.join(","), ...rows.map((row) => csvHeaders.map((header) => csvEscape(row[header])).join(","))];
  fs.writeFileSync(QUESTIONS_CSV, `${lines.join("\n")}\n`);
}

function applyRemediation(question) {
  const patch = remediations[question.id];
  if (!patch) return question;
  return {
    ...question,
    ...patch.fields,
    reviewNotes: `${question.reviewNotes} S18 broad QA remediation applied on 2026-05-27: ${patch.action}`
  };
}

function validatePatchedQuestion(question) {
  if (question.type === "multiple-choice") {
    if (!Array.isArray(question.optionsZhHans) || question.optionsZhHans.length !== 4) throw new Error(`${question.id} must have 4 options.`);
    if (new Set(question.optionsZhHans).size !== question.optionsZhHans.length) throw new Error(`${question.id} has duplicate options.`);
    if (!question.optionsZhHans.includes(question.answer)) throw new Error(`${question.id} answer is not one of its options.`);
  }
  if (!Array.isArray(question.acceptedAnswers) || !question.acceptedAnswers.includes(question.answer)) {
    throw new Error(`${question.id} acceptedAnswers must include answer.`);
  }
  const sourceText = [question.promptZhHans, ...(question.optionsZhHans ?? []), question.answer, ...(question.acceptedAnswers ?? []), question.explanationZhHans].join("\n");
  if (/原题|原卷|教材原文|摘自|来源于|第\s*\d+\s*页|\.pdf|OCR/i.test(sourceText)) {
    throw new Error(`${question.id} has source artifact wording.`);
  }
}

function updateGenerationBatchCaches(updatedById) {
  let updatedFiles = 0;
  for (const entry of fs.readdirSync(BATCH_DIR).sort()) {
    if (!/^batch-\d+\.json$/.test(entry)) continue;
    const filePath = path.join(BATCH_DIR, entry);
    const batch = JSON.parse(fs.readFileSync(filePath, "utf8"));
    let changed = false;
    batch.questions = batch.questions.map((question) => {
      const updated = updatedById.get(question.id);
      if (!updated) return question;
      changed = true;
      return updated;
    });
    if (changed) {
      fs.writeFileSync(filePath, `${JSON.stringify(batch, null, 2)}\n`);
      updatedFiles += 1;
    }
  }
  return updatedFiles;
}

function table(headers, rows) {
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map((value) => String(value ?? "").replace(/\|/g, "\\|")).join(" | ")} |`)
  ].join("\n");
}

function main() {
  const questionPack = JSON.parse(fs.readFileSync(QUESTION_PACK, "utf8"));
  const questions = questionPack.questions.map(applyRemediation);
  const updatedById = new Map(questions.filter((question) => remediations[question.id]).map((question) => [question.id, question]));

  for (const id of Object.keys(remediations)) {
    if (!updatedById.has(id)) throw new Error(`Missing remediated question ${id}.`);
    validatePatchedQuestion(updatedById.get(id));
  }

  fs.writeFileSync(QUESTION_PACK, `${JSON.stringify({ questions }, null, 2)}\n`);
  fs.writeFileSync(QUESTIONS_JSONL, `${questions.map((question) => JSON.stringify(question)).join("\n")}\n`);
  writeQuestionsCsv(questions);
  const updatedBatchFiles = updateGenerationBatchCaches(updatedById);

  const remediationRows = Object.entries(remediations).map(([id, patch]) => ({
    id,
    issueTags: patch.issueTags,
    action: patch.action,
    promptZhHans: updatedById.get(id).promptZhHans,
    answer: updatedById.get(id).answer
  }));
  const remediationHeaders = ["id", "issueTags", "action", "promptZhHans", "answer"];
  const remediationLines = [
    remediationHeaders.map(csvEscape).join(","),
    ...remediationRows.map((row) => remediationHeaders.map((header) => csvEscape(row[header])).join(","))
  ];
  fs.writeFileSync(REMEDIATION_CSV, `${remediationLines.join("\n")}\n`);

  const markdown = [
    "# S18 Broad QA Remediation - Mainland BNU Primary V2",
    "",
    "- Date: 2026-05-27",
    "- Session ID: S18",
    "- Source issue set: refreshed DeepSeek V4 Pro broad QA, 4 warn / 3 fail",
    "- Result: 7 rows remediated in candidate artifacts",
    `- Generation batch cache files updated: ${updatedBatchFiles}`,
    "- Product integration status: none; candidate package only.",
    "",
    table(
      ["ID", "Issue tags", "S18 remediation"],
      remediationRows.map((row) => [row.id, row.issueTags, row.action])
    ),
    "",
    "## Notes",
    "",
    "- Updated `question-pack.json`, `questions.jsonl`, `questions.csv`, and affected generation `batches/batch-*.json` caches.",
    "- No public question-bank, lesson, practice, API, UI, shared type, or production data files were edited.",
    "- Rerun deterministic audit and affected DeepSeek QA/hard-gate batches after this remediation."
  ].join("\n");
  fs.writeFileSync(REMEDIATION_MD, `${markdown}\n`);

  console.log(
    JSON.stringify({
      event: "s18-bnu-primary-v2-broad-qa-remediated",
      remediatedRows: Object.keys(remediations).length,
      updatedBatchFiles
    })
  );
}

main();
