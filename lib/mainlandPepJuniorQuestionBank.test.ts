import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  independentMainlandPepJuniorAnswer,
  mainlandPepJuniorQuestionGenerationMetadata,
  mainlandPepJuniorQuestions,
  mainlandPepJuniorStarterQuestions
} from "../data/mainlandPepJuniorQuestions";
import { mainlandPepJuniorLessonSeeds } from "../data/mainlandPepJuniorLessons";
import { mainlandPepJuniorTopicMetadata, mainlandPepJuniorTopics } from "../data/mainlandPepJuniorTopics";
import { questions } from "../data/questions";
import { mainlandPepJuniorExamPatternCards } from "../data/rag/mainlandPepJuniorExamPatterns";
import { mainlandPepJuniorPaperPatternCards } from "../data/rag/mainlandPepJuniorPaperPatterns";
import { mainlandPepJuniorRagCards } from "../data/rag/mainlandPepJunior";
import { mainlandPepQuestionAssetFor } from "./mainlandPepQuestionAssets";
import { questionAnswerMatches } from "./server/answerMatching";
import type { Question } from "@/types";

const expectedJuniorQuestionCount = 1200;
const expectedLegacyCandidateQuestionCount = 900;
const legacyJuniorCandidateJsonlPath = "coordination/content-qa/mainland-pep-junior-generated-bank-v1/questions.jsonl";
const juniorV2QuestionPackPath = "coordination/content-qa/mainland-pep-junior-generated-bank-v2-1200/question-pack.json";
const juniorV2QuestionJsonlPath = "coordination/content-qa/mainland-pep-junior-generated-bank-v2-1200/questions.jsonl";
const juniorV2QuestionCsvPath = "coordination/content-qa/mainland-pep-junior-generated-bank-v2-1200/questions.csv";
const juniorV2ProductionQuestionPackPath = "data/generated-content/mainland-pep-junior-generated-bank-v2-1200/question-pack.json";
const juniorV2GeneratorPath = "coordination/content-qa/mainland-pep-junior-generated-bank-v2-1200/generate-deterministic.mjs";
const juniorV2ManualReviewPaths = [
  "coordination/content-qa/mainland-pep-junior-generated-bank-v2-1200/manual-review-queue.csv",
  "coordination/content-qa/mainland-pep-junior-generated-bank-v2-1200/manual-review-results.csv"
] as const;
const cjkPattern = /[\u3400-\u9fff]/u;

const reviewedJuniorPracticeSelections = {
  "pep-junior-s1-lower-lines-coordinates": {
    families: ["vertical-angle", "coordinate-translation", "parallel-line-angle", "coordinate-translation", "angle-measure"],
    rows: [
      ["pep-junior-v2-s1-k04-mc-001", "(7,-9)"],
      ["pep-junior-v2-s1-k04-mc-002", "(9,-4)"],
      ["pep-junior-v2-s1-k04-mc-003", "(0,-3)"],
      ["pep-junior-v2-s1-k04-mc-004", "(2,2)"],
      ["pep-junior-v2-s1-k04-fi-001", "89°"]
    ]
  },
  "pep-junior-s1-lower-equations-inequalities-data": {
    families: ["inequality", "linear-system", "mean", "inequality", "linear-system"],
    rows: [
      ["pep-junior-v2-s1-k05-mc-001", "x>34"],
      ["pep-junior-v2-s1-k05-fi-001", "(21,2)"],
      ["pep-junior-v2-s1-k05-sa-001", "44"],
      ["pep-junior-v2-s1-k05-mc-002", "x>35"],
      ["pep-junior-v2-s1-k05-fi-002", "(22,4)"]
    ]
  },
  "pep-junior-s1-upper-expressions-linear-equations": {
    families: ["combine-like-terms", "solve-linear-equation", "model-equation", "combine-like-terms", "solve-linear-equation"],
    rows: [
      ["pep-junior-v2-s1-k02-mc-001", "6x+5"],
      ["pep-junior-v2-s1-k02-fi-001", "5"],
      ["pep-junior-v2-s1-k02-sa-001", "4x+8=24"],
      ["pep-junior-v2-s1-k02-mc-002", "5x+1"],
      ["pep-junior-v2-s1-k02-fi-002", "6"]
    ]
  },
  "pep-junior-s1-upper-geometric-figures": {
    families: ["straight-angle", "midpoint", "complementary-angle", "line-ray-segment-classification", "midpoint"],
    rows: [
      ["pep-junior-v2-s1-k03-mc-001", "138°"],
      ["pep-junior-v2-s1-k03-fi-001", "7 cm"],
      ["pep-junior-v2-s1-k03-sa-001", "11°"],
      ["pep-junior-v2-s1-k03-mc-002", "Segment AB and segment BA represent the same segment."],
      ["pep-junior-v2-s1-k03-fi-002", "8 cm"]
    ]
  },
  "pep-junior-s1-upper-rational-numbers": {
    families: ["signed-temperature", "number-line-distance", "signed-arithmetic", "signed-temperature", "number-line-distance"],
    rows: [
      ["pep-junior-v2-s1-k01-mc-001", "0"],
      ["pep-junior-v2-s1-k01-fi-001", "8"],
      ["pep-junior-v2-s1-k01-sa-001", "-32"],
      ["pep-junior-v2-s1-k01-mc-006", "-5"],
      ["pep-junior-v2-s1-k01-fi-002", "12"]
    ]
  },
  "pep-junior-s2-lower-linear-functions-data": {
    families: ["function-value", "slope", "median", "function-value", "slope"],
    rows: [
      ["pep-junior-v2-s2-k09-mc-001", "2"],
      ["pep-junior-v2-s2-k09-fi-001", "5"],
      ["pep-junior-v2-s2-k09-sa-001", "41"],
      ["pep-junior-v2-s2-k09-mc-002", "11"],
      ["pep-junior-v2-s2-k09-fi-002", "3"]
    ]
  },
  "pep-junior-s2-lower-roots-pythagorean-quadrilaterals": {
    families: ["simplify-radical", "pythagorean-theorem", "parallelogram-opposite-side", "simplify-radical", "pythagorean-theorem"],
    rows: [
      ["pep-junior-v2-s2-k08-mc-001", "3√3"],
      ["pep-junior-v2-s2-k08-fi-001", "13 cm"],
      ["pep-junior-v2-s2-k08-sa-001", "6 cm"],
      ["pep-junior-v2-s2-k08-mc-002", "4√5"],
      ["pep-junior-v2-s2-k08-fi-002", "50 cm"]
    ]
  },
  "pep-junior-s2-upper-polynomials-fractions": {
    families: ["factor-quadratic", "multiply-monomials", "simplify-rational-domain", "multiply-monomials", "multiply-monomials"],
    rows: [
      ["pep-junior-v2-s2-k07-mc-001", "(x+2)(x+7)"],
      ["pep-junior-v2-s2-k07-fi-001", "30x^5"],
      ["pep-junior-v2-s2-k07-sa-001", "3, x≠-4"],
      ["pep-junior-v2-s2-k07-fi-002", "12x^2"],
      ["pep-junior-v2-s2-k07-fi-003", "25x^5"]
    ]
  },
  "pep-junior-s2-upper-triangles-congruence": {
    families: ["triangle-angle-sum", "isosceles-base-angle", "sss-congruence", "triangle-angle-sum", "isosceles-base-angle"],
    rows: [
      ["pep-junior-v2-s2-k06-mc-001", "48°"],
      ["pep-junior-v2-s2-k06-fi-001", "54°"],
      ["pep-junior-v2-s2-k06-sa-001", "SSS"],
      ["pep-junior-v2-s2-k06-mc-002", "36°"],
      ["pep-junior-v2-s2-k06-fi-002", "53°"]
    ]
  },
  "pep-junior-s3-lower-inverse-similarity-trigonometry": {
    families: ["inverse-parameter", "similarity-scale", "trigonometric-height", "inverse-parameter", "similarity-scale"],
    rows: [
      ["pep-junior-v2-s3-k11-mc-001", "225"],
      ["pep-junior-v2-s3-k11-fi-001", "42 cm"],
      ["pep-junior-v2-s3-k11-sa-001", "93 m"],
      ["pep-junior-v2-s3-k11-mc-002", "286"],
      ["pep-junior-v2-s3-k11-fi-002", "76 cm"]
    ]
  },
  "pep-junior-s3-upper-quadratics-circle-probability": {
    families: ["zero-product-quadratic", "axis-of-symmetry", "probability", "circle-inscribed-angle", "axis-of-symmetry"],
    rows: [
      ["pep-junior-v2-s3-k10-mc-001", "x=12 or x=17"],
      ["pep-junior-v2-s3-k10-fi-001", "x=9"],
      ["pep-junior-v2-s3-k10-sa-002", "9/16"],
      ["pep-junior-v2-s3-k10-mc-002", "40°"],
      ["pep-junior-v2-s3-k10-fi-002", "x=10"]
    ]
  }
} as const;

type JuniorCandidateRecord = {
  id: string;
  batch?: string;
  grade: string;
  semester: string;
  knowledgePointId: string;
  type: string;
  difficulty?: string;
  promptZhHans?: string;
  optionsZhHans?: string[];
  answer?: string;
  acceptedAnswers?: string[];
  explanationZhHans?: string;
  paperPatternCardIds?: string[];
};

type JuniorQuestionPack = {
  questions: JuniorCandidateRecord[];
};

function readJsonlRecords(filePath: string) {
  return readFileSync(filePath, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as JuniorCandidateRecord);
}

function readJuniorV2QuestionPack() {
  return JSON.parse(readFileSync(juniorV2QuestionPackPath, "utf8")) as JuniorQuestionPack;
}

function countBy(values: string[]) {
  const counts: Record<string, number> = {};
  values.forEach((value) => {
    counts[value] = (counts[value] ?? 0) + 1;
  });
  return counts;
}

function practiceTemplateFingerprint(value: string) {
  return value
    .toLowerCase()
    .replace(/\\[()[\]]/g, "")
    .replace(/[\s，。,.!?！？：:；;、'"“”‘’()（）\[\]{}]/g, "")
    .replace(/[-+]?\d+(?:\.\d+)?(?:\/\d+(?:\.\d+)?)?/g, "#")
    .replace(/[a-z](?=[=<>+\-*/^]|$)/g, "v");
}

function publicAssetPath(src: string) {
  return path.join(process.cwd(), "public", src.replace(/^\//, ""));
}

function assertQuestionImageAssetIsGated(question: Question) {
  const approvedAsset = mainlandPepQuestionAssetFor(question);
  const imageAssets = question.questionAssets?.filter((asset) => asset.kind === "image") ?? [];

  if (!approvedAsset) {
    assert.equal(imageAssets.length, 0, `${question.id} should remain text-only without an approved exact image asset`);
    return;
  }

  assert.deepEqual(
    imageAssets.map((asset) => asset.src),
    [approvedAsset.src],
    `${question.id} should expose only the approved exact image asset`
  );
  assert.equal(existsSync(publicAssetPath(approvedAsset.src)), true, `${question.id} approved PNG asset should exist at ${approvedAsset.src}`);
}

function englishVisibleTextFields(question: Question): Array<[string, string]> {
  return [
    ["topic", question.topic.en],
    ["prompt", question.prompt.en],
    ["answer", question.answer],
    ["explanation", question.explanation.en],
    ...(question.options ?? []).map((option, index) => [`option ${index + 1}`, option.en] as [string, string])
  ];
}

test("Mainland PEP junior public bank promotes the reviewed v2 1200-question package", () => {
  const publicJuniorQuestions = questions.filter((question) => Boolean(mainlandPepJuniorQuestionGenerationMetadata[question.id]));
  const publicJuniorIds = new Set(publicJuniorQuestions.map((question) => question.id));
  const bankIds = new Set(mainlandPepJuniorQuestions.map((question) => question.id));
  const v2Records = readJuniorV2QuestionPack().questions;
  const v2Ids = new Set(v2Records.map((record) => record.id));
  const legacyCandidateRecords = readJsonlRecords(legacyJuniorCandidateJsonlPath);
  const legacyCandidateIds = new Set(legacyCandidateRecords.map((record) => record.id));

  assert.equal(mainlandPepJuniorQuestions.length, expectedJuniorQuestionCount);
  assert.equal(mainlandPepJuniorStarterQuestions, mainlandPepJuniorQuestions);
  assert.equal(publicJuniorQuestions.length, expectedJuniorQuestionCount);
  assert.equal(v2Records.length, expectedJuniorQuestionCount);
  assert.equal(v2Ids.size, expectedJuniorQuestionCount);
  assert.equal(bankIds.size, expectedJuniorQuestionCount);
  assert.equal(legacyCandidateRecords.length, expectedLegacyCandidateQuestionCount);
  assert.equal(questions.some((question) => legacyCandidateIds.has(question.id)), false);
  publicJuniorQuestions.forEach(assertQuestionImageAssetIsGated);

  v2Ids.forEach((questionId) => {
    assert.ok(bankIds.has(questionId), `${questionId} should be exported by the junior public bank`);
    assert.ok(publicJuniorIds.has(questionId), `${questionId} should be included in the public aggregate`);
  });
});

test("Mainland PEP junior signed-arithmetic family persists one result-only contract across runtime, raw packs, and regeneration", () => {
  const knowledgePointId = "pep-junior-s1-upper-rational-numbers";
  const coordinationPack = readJuniorV2QuestionPack();
  const productionPack = JSON.parse(readFileSync(juniorV2ProductionQuestionPackPath, "utf8")) as JuniorQuestionPack;
  const jsonlPack: JuniorQuestionPack = { questions: readJsonlRecords(juniorV2QuestionJsonlPath) };
  const csvRowsById = new Map(
    readFileSync(juniorV2QuestionCsvPath, "utf8")
      .trim()
      .split("\n")
      .slice(1)
      .map((line) => [line.slice(0, line.indexOf(",")), line])
  );
  const generationOutputDir = mkdtempSync(path.join(tmpdir(), "pep-junior-result-only-"));
  let generatedPack: JuniorQuestionPack | undefined;
  try {
    const generated = spawnSync(process.execPath, [juniorV2GeneratorPath], {
      cwd: process.cwd(),
      encoding: "utf8",
      env: { ...process.env, MAIS_PEP_JUNIOR_GENERATED_OUTPUT_DIR: generationOutputDir }
    });
    assert.equal(
      generated.status,
      0,
      `generator failed: ${generated.error?.message ?? ""}\n${generated.stdout}\n${generated.stderr}`
    );
    generatedPack = JSON.parse(readFileSync(path.join(generationOutputDir, "question-pack.json"), "utf8")) as JuniorQuestionPack;
  } finally {
    rmSync(generationOutputDir, { recursive: true, force: true });
  }
  assert.ok(generatedPack, "generator should emit a question pack");

  const runtimeRows = mainlandPepJuniorQuestions.filter(
    (question) => question.topicId === knowledgePointId && question.type === "short-answer"
  );
  const packRows = [coordinationPack, productionPack, jsonlPack, generatedPack].map((pack) =>
    pack.questions.filter(
      (question) => question.knowledgePointId === knowledgePointId && question.type === "short-answer"
    )
  );
  assert.equal(runtimeRows.length, 22, "the current rational-number short-answer family quota");
  const runtimeIds = runtimeRows.map((question) => question.id).sort();
  packRows.forEach((rows, index) => {
    assert.equal(rows.length, 22, `pack ${index} rational-number short-answer family quota`);
    assert.deepEqual(rows.map((question) => question.id).sort(), runtimeIds, `pack ${index} family IDs`);
  });
  const packMaps = packRows.map((rows) => new Map(rows.map((question) => [question.id, question])));

  for (const question of runtimeRows) {
    const expectedZhHans = question.prompt.zhHans ?? question.prompt.zh;
    const expressionMatch = expectedZhHans.match(/^计算：-(\d+)\+(\d+)-(\d+)。$/u);
    assert.ok(expressionMatch, `${question.id} should request only the signed-arithmetic result`);
    const [, minuend, addend, subtrahend] = expressionMatch;
    const expression = `-${minuend}+${addend}-${subtrahend}`;
    const answer = String(-Number(minuend) + Number(addend) - Number(subtrahend));
    const expectedEnglish = `Calculate ${expression}.`;
    assert.equal(question.prompt.en, expectedEnglish, `${question.id} runtime English`);
    assert.equal(question.answer, answer, `${question.id} runtime canonical recomputed from the prompt`);
    assert.deepEqual(question.options ?? [], [], `${question.id} runtime options`);
    assert.deepEqual(question.acceptedAnswers ?? [], [], `${question.id} runtime aliases`);
    assert.equal(questionAnswerMatches({
      id: question.id,
      answer: question.answer,
      accepted_answers: question.acceptedAnswers ?? null,
      options: question.options ?? null,
      prompt: question.prompt
    }, answer), true, `${question.id} canonical result`);
    for (const staleCompound of [`${answer}，负数`, `${answer}; negative`]) {
      assert.equal(questionAnswerMatches({
        id: question.id,
        answer: question.answer,
        accepted_answers: question.acceptedAnswers ?? null,
        options: question.options ?? null,
        prompt: question.prompt
      }, staleCompound), false, `${question.id} rejects stale compound response ${staleCompound}`);
    }
    for (const wrongValue of [String(Number(answer) - 1), String(Number(answer) + 1)]) {
      assert.equal(questionAnswerMatches({
        id: question.id,
        answer: question.answer,
        accepted_answers: question.acceptedAnswers ?? null,
        options: question.options ?? null,
        prompt: question.prompt
      }, wrongValue), false, `${question.id} rejects wrong result ${wrongValue}`);
    }

    const freshRaw = packMaps[3].get(question.id);
    assert.ok(freshRaw, `${question.id} missing from fresh generator replay`);
    packMaps.forEach((packById, index) => {
      const raw = packById.get(question.id);
      assert.ok(raw, `${question.id} missing from pack ${index}`);
      assert.equal(raw.promptZhHans, expectedZhHans, `${question.id} pack ${index} prompt`);
      assert.deepEqual(raw.optionsZhHans ?? [], [], `${question.id} pack ${index} options`);
      assert.equal(raw.answer, answer, `${question.id} pack ${index} canonical`);
      assert.deepEqual(raw.acceptedAnswers ?? [], [], `${question.id} pack ${index} aliases`);
      assert.equal(raw.explanationZhHans, freshRaw.explanationZhHans, `${question.id} pack ${index} explanation`);
      if (index < 3) {
        assert.deepEqual(raw, freshRaw, `${question.id} pack ${index} full-object generator parity`);
      }
    });

    const csvLine = csvRowsById.get(question.id);
    assert.ok(csvLine, `${question.id} missing from coordination CSV`);
    const csvFields = csvLine.split(",");
    assert.equal(csvFields.length, 19, `${question.id} CSV field count`);
    assert.equal(csvFields[8], expectedZhHans, `${question.id} CSV prompt`);
    assert.equal(csvFields[9], "", `${question.id} CSV options`);
    assert.equal(csvFields[10], answer, `${question.id} CSV canonical`);
    assert.equal(csvFields[11], "", `${question.id} CSV aliases`);
    assert.equal(csvFields[14], freshRaw.paperPatternCardIds?.join(" | "), `${question.id} CSV paper-pattern provenance`);
  }

  const freshById = packMaps[3];
  for (const reviewPath of juniorV2ManualReviewPaths) {
    const resultOnlySampleLines = readFileSync(reviewPath, "utf8")
      .trim()
      .split("\n")
      .slice(1)
      .filter((line) => /,pep-junior-v2-s1-k01-sa-/u.test(line));
    assert.equal(resultOnlySampleLines.length, 4, `${reviewPath} result-only sample count`);
    for (const line of resultOnlySampleLines) {
      const id = line.match(/^\d+,([^,]+),/u)?.[1];
      assert.ok(id, `${reviewPath} sample ID`);
      const currentRaw = freshById.get(id);
      assert.ok(currentRaw, `${reviewPath} current raw sample ${id}`);
      assert.ok(line.includes(`,${currentRaw.promptZhHans},`), `${reviewPath} ${id} current prompt`);
      assert.doesNotMatch(line, /计算并说明符号/u, `${reviewPath} ${id} stale compound prompt`);
    }
  }

  const untouchedFillIn = mainlandPepJuniorQuestions.find(
    (question) => question.id === "pep-junior-v2-s2-k07-fi-003"
  );
  assert.equal(untouchedFillIn?.prompt.en, "Calculate 5x^2·5x^3 = ____.");
});

test("Mainland PEP junior v2 questions keep the approved grade, semester, type, and difficulty quotas", () => {
  const metadataValues = mainlandPepJuniorQuestions.map((question) => mainlandPepJuniorQuestionGenerationMetadata[question.id]);
  const topicTypeCounts = countBy(mainlandPepJuniorQuestions.map((question) => `${question.topicId}:${question.type}`));

  assert.deepEqual(countBy(mainlandPepJuniorQuestions.map((question) => question.grade)), {
    S1: 400,
    S2: 400,
    S3: 400
  });
  assert.deepEqual(countBy(metadataValues.map((metadata) => `${metadata.grade}-${metadata.semester}`)), {
    "S1-upper": 200,
    "S1-lower": 200,
    "S2-upper": 200,
    "S2-lower": 200,
    "S3-upper": 200,
    "S3-lower": 200
  });
  assert.deepEqual(countBy(mainlandPepJuniorQuestions.map((question) => question.type)), {
    "multiple-choice": 400,
    "fill-in": 400,
    "short-answer": 400
  });
  assert.deepEqual(countBy(mainlandPepJuniorQuestions.map((question) => question.difficulty)), {
    Low: 230,
    Medium: 610,
    High: 360
  });
  assert.equal(Object.keys(topicTypeCounts).length, mainlandPepJuniorTopics.length * 3);

  mainlandPepJuniorTopics.forEach((topic) => {
    const metadata = mainlandPepJuniorTopicMetadata[topic.id];
    assert.ok(metadata, `${topic.id} should have topic metadata`);
    ["multiple-choice", "fill-in", "short-answer"].forEach((type) => {
      assert.ok((topicTypeCounts[`${topic.id}:${type}`] ?? 0) > 0, `${topic.id} should have ${type} questions`);
    });
  });
});

test("Mainland PEP junior v2 questions are track-compatible and independently answerable", () => {
  const topicIds = new Set(mainlandPepJuniorTopics.map((topic) => topic.id));
  const ids = new Set<string>();

  mainlandPepJuniorQuestions.forEach((question) => {
    assert.equal(question.curriculumTrack, "MAINLAND_PEP_HIGH");
    assert.equal(question.region, "MAINLAND");
    assert.equal(question.publisher, "MAINLAND_PEP");
    assert.ok(topicIds.has(question.topicId), `${question.id} uses missing topic ${question.topicId}`);
    assert.ok(!ids.has(question.id), `duplicate question id ${question.id}`);
    ids.add(question.id);
    assert.ok(question.prompt.en.trim() && question.prompt.zh.trim(), `${question.id} is missing prompt text`);
    assert.ok(question.explanation.en.trim() && question.explanation.zh.trim(), `${question.id} is missing explanation text`);
    assert.equal(independentMainlandPepJuniorAnswer(question), question.answer, `${question.id} answer should match deterministic audit metadata`);
  });
});

test("Mainland PEP junior English-visible question text does not leak Chinese characters", () => {
  mainlandPepJuniorQuestions.forEach((question) => {
    englishVisibleTextFields(question).forEach(([field, value]) => {
      assert.doesNotMatch(value, cjkPattern, `${question.id} ${field} should be English-mode safe`);
    });
  });
});

test("Mainland PEP junior v2 questions cite safe RAG, paper-pattern, and exam-pattern evidence", () => {
  const ragCardIds = new Set(mainlandPepJuniorRagCards.map((card) => card.id));
  const paperPatternCardIds = new Set(mainlandPepJuniorPaperPatternCards.map((card) => card.id));
  const examPatternCardIds = new Set(mainlandPepJuniorExamPatternCards.map((card) => card.id));

  mainlandPepJuniorQuestions.forEach((question) => {
    const metadata = mainlandPepJuniorQuestionGenerationMetadata[question.id];
    assert.ok(metadata, `${question.id} is missing metadata`);
    assert.equal(metadata.batch, "junior-rag-v2-1200");
    assert.equal(metadata.sourceDistanceStatus, "passed");
    assert.equal(metadata.mathQaStatus, "pass");
    assert.equal(metadata.grade, question.grade);
    assert.equal(metadata.type, question.type);
    assert.equal(metadata.topicId, question.topicId);
    assert.ok(metadata.evidenceCardIds.length > 0, `${question.id} should cite at least one junior safe RAG card`);
    assert.ok(metadata.paperPatternCardIds.length > 0, `${question.id} should cite at least one junior paper-pattern card`);
    assert.ok(metadata.examPatternCardIds.length > 0, `${question.id} should cite at least one junior exam-pattern card`);
    assert.ok(metadata.evidenceCardIds.every((cardId) => ragCardIds.has(cardId)), `${question.id} cites unknown RAG evidence`);
    assert.ok(metadata.paperPatternCardIds.every((cardId) => paperPatternCardIds.has(cardId)), `${question.id} cites unknown paper-pattern evidence`);
    assert.ok(metadata.examPatternCardIds.every((cardId) => examPatternCardIds.has(cardId)), `${question.id} cites unknown exam-pattern evidence`);
  });
});

test("Mainland PEP junior v2 multiple-choice items have four unique options and one correct option", () => {
  mainlandPepJuniorQuestions
    .filter((question) => question.type === "multiple-choice")
    .forEach((question) => {
      const options = question.options ?? [];
      const optionValues = options.map((option) => option.en);
      assert.equal(options.length, 4, `${question.id} should have four options`);
      assert.equal(new Set(optionValues).size, 4, `${question.id} should have unique options`);
      assert.equal(optionValues.filter((option) => option === question.answer).length, 1, `${question.id} should have exactly one correct option`);
    });
});

test("Mainland PEP junior deterministic families preserve reviewed algebra, SSS, and response contracts", () => {
  const rawQuestions = readJuniorV2QuestionPack().questions;
  const rawById = new Map(rawQuestions.map((question) => [question.id, question]));
  const runtimeById = new Map(mainlandPepJuniorQuestions.map((question) => [question.id, question]));

  [
    ["pep-junior-v2-s1-k02-mc-009", "9x", "9x+0"],
    ["pep-junior-v2-s1-k02-mc-018", "6x", "6x+0"]
  ].forEach(([questionId, expected, legacyEquivalent]) => {
    const raw = rawById.get(questionId);
    const runtime = runtimeById.get(questionId);
    assert.ok(raw && runtime);
    assert.equal(raw.answer, expected);
    assert.equal(runtime.answer, expected);
    assert.ok(raw.optionsZhHans?.includes(expected));
    assert.equal(raw.optionsZhHans?.includes(legacyEquivalent), false, `${questionId} should display the standard simplified form`);
    assert.ok(raw.acceptedAnswers?.includes(legacyEquivalent), `${questionId} should retain the equivalent legacy input alias`);
    assert.match(raw.explanationZhHans ?? "", new RegExp(`=${expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}。$`));
  });

  const rawSssRows = rawQuestions.filter((question) => question.id.startsWith("pep-junior-v2-s2-k06-sa-"));
  const runtimeSssRows = mainlandPepJuniorQuestions.filter((question) => question.id.startsWith("pep-junior-v2-s2-k06-sa-"));
  assert.equal(rawSssRows.length, 33);
  assert.equal(runtimeSssRows.length, 33);

  const assertValidSssPrompt = (questionId: string, prompt: string) => {
    const match = prompt.match(/AB=DE=(\d+)(?:厘米| cm).*BC=EF=(\d+)(?:厘米| cm).*AC=DF=(\d+)(?:厘米| cm)/);
    assert.ok(match, `${questionId} should expose all three SSS side lengths`);
    const sides = match.slice(1).map(Number).sort((left, right) => left - right);
    assert.ok(sides[0] > 0 && sides[0] + sides[1] > sides[2], `${questionId} should define nondegenerate triangles`);
  };
  rawSssRows.forEach((question) => assertValidSssPrompt(question.id, question.promptZhHans ?? ""));
  runtimeSssRows.forEach((question) => assertValidSssPrompt(question.id, question.prompt.zhHans ?? question.prompt.zh));

  const preservedValidTriples: Record<string, [number, number, number]> = {
    "pep-junior-v2-s2-k06-sa-029": [15, 22, 9],
    "pep-junior-v2-s2-k06-sa-030": [16, 24, 12],
    "pep-junior-v2-s2-k06-sa-031": [17, 26, 15],
    "pep-junior-v2-s2-k06-sa-032": [18, 28, 18],
    "pep-junior-v2-s2-k06-sa-033": [19, 7, 21]
  };
  Object.entries(preservedValidTriples).forEach(([questionId, sides]) => {
    const prompt = rawById.get(questionId)?.promptZhHans ?? "";
    assert.match(prompt, new RegExp(`AB=DE=${sides[0]}厘米.*BC=EF=${sides[1]}厘米.*AC=DF=${sides[2]}厘米`));
  });

  const rawDomainRows = rawQuestions.filter((question) => question.id.startsWith("pep-junior-v2-s2-k07-sa-"));
  const runtimeDomainRows = mainlandPepJuniorQuestions.filter((question) => question.id.startsWith("pep-junior-v2-s2-k07-sa-"));
  assert.equal(rawDomainRows.length, 33);
  assert.equal(runtimeDomainRows.length, 33);

  rawDomainRows.forEach((raw) => {
    const runtime = runtimeById.get(raw.id);
    const promptMatch = (raw.promptZhHans ?? "").match(/^\u5316\u7b80\u5206\u5f0f\((\d+)x[+]\d+\)\/\(x[+](\d+)\)\uff0c/);
    assert.ok(runtime && promptMatch, `${raw.id} should preserve the generated rational-expression structure`);
    const simplified = promptMatch[1];
    const excluded = promptMatch[2];
    const complete = `${simplified}, x≠-${excluded}`;
    const wrongRestriction = `${simplified}, x≠-${Number(excluded) + 1}`;
    assert.equal(raw.answer, complete, `${raw.id} raw canonical should include the excluded value`);
    assert.equal(runtime.answer, complete, `${raw.id} runtime canonical should include the excluded value`);

    const gradingQuestion = {
      answer: runtime.answer,
      accepted_answers: runtime.acceptedAnswers,
      options: runtime.options
    };
    assert.equal(questionAnswerMatches(gradingQuestion, complete), true, `${raw.id} should accept the complete response`);
    assert.equal(questionAnswerMatches(gradingQuestion, simplified), false, `${raw.id} should reject a bare simplified constant`);
    assert.equal(questionAnswerMatches(gradingQuestion, wrongRestriction), false, `${raw.id} should reject the wrong excluded value`);
  });
});

test("Mainland PEP junior single-input prompts and displayed options contain no unscored or generator-only text", () => {
  const rawQuestions = readJuniorV2QuestionPack().questions;
  const rawComplementRows = rawQuestions.filter((question) => question.id.startsWith("pep-junior-v2-s1-k03-sa-"));
  const rawQuadrantRows = rawQuestions.filter((question) => question.id.startsWith("pep-junior-v2-s1-k04-sa-"));
  assert.equal(rawComplementRows.length, 22);
  assert.equal(rawQuadrantRows.length, 34);
  rawComplementRows.forEach((question) => {
    assert.doesNotMatch(question.promptZhHans ?? "", /理由|说明过程/u);
    assert.match(question.explanationZhHans ?? "", /互余两角和为90°/u);
  });
  rawQuadrantRows.forEach((question) => {
    assert.doesNotMatch(question.promptZhHans ?? "", /说明判断依据|给出理由/u);
    assert.match(question.explanationZhHans ?? "", /横坐标为正、纵坐标为负/u);
  });

  const malformedOptionPattern = /少一步|one step short|符号相反|单位错误|(?:°|℃|厘米|毫米|千米|分钟|秒|cm|mm|km|min(?:ute)?s?|kg|mL)\s*\d+\s*$/iu;
  rawQuestions.forEach((question) => {
    (question.optionsZhHans ?? []).forEach((option) => {
      assert.doesNotMatch(option, malformedOptionPattern, `${question.id} should expose only content-valid options`);
    });
  });
  mainlandPepJuniorQuestions.forEach((question) => {
    (question.options ?? []).forEach((option) => {
      assert.doesNotMatch(JSON.stringify(option), malformedOptionPattern, `${question.id} should expose no translated generator artifact`);
    });
  });
});

test("Mainland PEP junior quadratic solution card requires the complete two-root solution", () => {
  const question = mainlandPepJuniorQuestions.find((candidate) => candidate.id === "pep-junior-v2-s3-k10-mc-001");
  assert.ok(question?.options);
  const gradingQuestion = {
    answer: question.answer,
    accepted_answers: question.acceptedAnswers,
    options: question.options
  };
  const hits = question.options.map((option) => questionAnswerMatches(gradingQuestion, option.zhHans ?? option.zh));
  assert.deepEqual(hits, [false, false, false, true]);
  assert.equal(questionAnswerMatches(gradingQuestion, "x=12或x=17"), true);
  assert.equal(questionAnswerMatches(gradingQuestion, "x=12"), false);
  assert.equal(questionAnswerMatches(gradingQuestion, "x=17"), false);
});

test("Mainland PEP junior v2 questions avoid source-copying artifacts and exact prompt duplication", () => {
  const joined = (...parts: string[]) => parts.join("");
  const forbiddenPatterns = [
    joined("教", "材", "原", "文"),
    joined("原", "题"),
    joined("原", "卷"),
    joined("答", "案", "原", "句"),
    "OCR",
    "source locator",
    "archive path",
    /第[0-9０-９]+页/,
    /page [0-9]+/i,
    /p\.[0-9]+/i,
    /如图|见图|下图|上图|右图|左图|图中|根据图/
  ];
  const serialized = JSON.stringify(mainlandPepJuniorQuestions);
  const prompts = new Set<string>();

  forbiddenPatterns.forEach((pattern) => {
    if (typeof pattern === "string") {
      assert.equal(serialized.includes(pattern), false, `Generated junior questions contain forbidden text: ${pattern}`);
    } else {
      assert.equal(pattern.test(serialized), false, `Generated junior questions match forbidden pattern: ${pattern}`);
    }
  });

  mainlandPepJuniorQuestions.forEach((question: Question) => {
    const normalized = `${question.grade}:${question.type}:${question.prompt.zh}`.replace(/\s+/g, "");
    assert.ok(!prompts.has(normalized), `${question.id} duplicates a junior generated prompt`);
    prompts.add(normalized);
  });
});

test("Mainland PEP junior v2 regression checks cover prior triangle and fraction-limit blockers", () => {
  const invalidRightTriangleRows: string[] = [];
  const missingFractionLimitRows: string[] = [];
  let rightTriangleRows = 0;
  let fractionLimitRows = 0;

  mainlandPepJuniorQuestions.forEach((question) => {
    const rightMatch = question.prompt.zh.match(/直角三角形两条直角边分别为(\d+)厘米和(\d+)厘米/);
    if (rightMatch) {
      rightTriangleRows += 1;
      const [left, right] = rightMatch.slice(1).map(Number);
      const answerNumber = Number(question.answer.match(/\d+/)?.[0]);
      if (!Number.isFinite(answerNumber) || left + right <= answerNumber) {
        invalidRightTriangleRows.push(question.id);
      }
    }

    if (/分式|除式|约分|化简/.test(question.prompt.zh) && /限制|取值|不能|不等于|≠|x/.test(question.prompt.zh)) {
      fractionLimitRows += 1;
      const answerText = `${question.answer} ${question.acceptedAnswers?.join(" ") ?? ""} ${question.explanation.zh}`;
      if (/限制|取值|不能|不等于|≠/.test(question.prompt.zh) && !/[≠]|不等于|不能为|x\s*!=/.test(answerText)) {
        missingFractionLimitRows.push(question.id);
      }
    }
  });

  assert.equal(rightTriangleRows, 34);
  assert.deepEqual(invalidRightTriangleRows, []);
  assert.equal(fractionLimitRows, 55);
  assert.deepEqual(missingFractionLimitRows, []);
});

test("Mainland PEP junior lesson practice pins five reviewed answers across at least three task families", () => {
  const questionById = new Map(mainlandPepJuniorQuestions.map((question) => [question.id, question]));

  Object.entries(reviewedJuniorPracticeSelections).forEach(([topicId, selection]) => {
    const lessonSeed = mainlandPepJuniorLessonSeeds.find((seed) => seed.topicId === topicId);
    const expectedIds = selection.rows.map(([questionId]) => questionId);

    assert.ok(lessonSeed, `${topicId} should have a production lesson seed`);
    assert.deepEqual(lessonSeed.practiceQuestionIds, expectedIds, `${topicId} should preserve the reviewed runtime selection`);
    assert.equal(expectedIds.length, 5, `${topicId} should select exactly five questions`);
    assert.equal(new Set(expectedIds).size, 5, `${topicId} should select five unique question IDs`);
    assert.ok(new Set(selection.families).size >= 3, `${topicId} should cover at least three manually reviewed task families`);

    const selectedQuestions = selection.rows.map(([questionId, expectedAnswer]) => {
      const question = questionById.get(questionId);
      assert.ok(question, `${questionId} should exist in the public PEP junior question bank`);
      assert.equal(question.topicId, topicId, `${questionId} should remain in its reviewed topic`);
      assert.equal(question.answer, expectedAnswer, `${questionId} should retain the independently checked answer`);
      assert.equal(independentMainlandPepJuniorAnswer(question), expectedAnswer, `${questionId} should retain answer-oracle parity`);
      assert.ok(question.prompt.en.trim() && (question.prompt.zhHans ?? question.prompt.zh).trim(), `${questionId} should have bilingual prompt text`);
      assert.ok(
        question.explanation.en.trim() && (question.explanation.zhHans ?? question.explanation.zh).trim(),
        `${questionId} should have bilingual explanation text`
      );
      assert.doesNotMatch(question.prompt.en, cjkPattern, `${questionId} should have an English-visible prompt`);
      assert.doesNotMatch(question.explanation.en, cjkPattern, `${questionId} should have an English-visible explanation`);
      assert.doesNotMatch(question.prompt.en, /^Solve this .+ practice item\./, `${questionId} should not expose fallback prompt copy`);
      assert.doesNotMatch(
        question.explanation.en,
        /^Use the given conditions step by step\./,
        `${questionId} should not expose fallback explanation copy`
      );

      if (question.type === "multiple-choice") {
        const optionValues = (question.options ?? []).map((option) => option.en);
        assert.equal(optionValues.length, 4, `${questionId} should have four choices`);
        assert.equal(new Set(optionValues).size, 4, `${questionId} should have four unique choices`);
        assert.equal(optionValues.filter((option) => option === question.answer).length, 1, `${questionId} should have one answer key`);
      }

      return question;
    });

    assert.equal(new Set(selectedQuestions.map((question) => question.answer)).size, 5, `${topicId} should display five distinct answers`);
    assert.ok(
      new Set(selectedQuestions.map((question) => practiceTemplateFingerprint(question.prompt.zhHans ?? question.prompt.zh))).size >= 3,
      `${topicId} should survive the runtime template-variety gate`
    );
  });
});

test("Mainland PEP junior displayed QA overrides align response prompts, notation, and stated conditions", () => {
  const signedArithmetic = mainlandPepJuniorQuestions.find((question) => question.id === "pep-junior-v2-s1-k01-sa-001");
  const complementaryAngle = mainlandPepJuniorQuestions.find((question) => question.id === "pep-junior-v2-s1-k03-sa-001");
  const geometryClassification = mainlandPepJuniorQuestions.find((question) => question.id === "pep-junior-v2-s1-k03-mc-002");
  const translatedPoint = mainlandPepJuniorQuestions.find((question) => question.id === "pep-junior-v2-s1-k04-mc-004");
  const monomialProduct = mainlandPepJuniorQuestions.find((question) => question.id === "pep-junior-v2-s2-k07-fi-002");
  const circle = mainlandPepJuniorQuestions.find((question) => question.id === "pep-junior-v2-s3-k10-mc-002");
  const similarity = mainlandPepJuniorQuestions.find((question) => question.id === "pep-junior-v2-s3-k11-fi-002");
  const flagpole = mainlandPepJuniorQuestions.find((question) => question.id === "pep-junior-v2-s3-k11-sa-001");

  assert.ok(signedArithmetic && complementaryAngle && geometryClassification && translatedPoint && monomialProduct && circle && similarity && flagpole);
  assert.doesNotMatch(signedArithmetic.prompt.en, /state the sign/i);
  assert.doesNotMatch(signedArithmetic.prompt.zhHans ?? "", /说明符号/u);
  assert.doesNotMatch(complementaryAngle.prompt.en, /give a reason/i);
  assert.doesNotMatch(complementaryAngle.prompt.zhHans ?? "", /写出理由/u);
  assert.equal(geometryClassification.answer, "Segment AB and segment BA represent the same segment.");
  assert.deepEqual(geometryClassification.options?.map((option) => option.en), [
    "Segment AB and segment BA represent the same segment.",
    "Ray AB and ray BA represent the same ray.",
    "Line AB has two endpoints.",
    "Ray AB extends infinitely in both directions."
  ]);
  assert.deepEqual(geometryClassification.options?.map((option) => option.zhHans), [
    "线段AB与线段BA表示同一条线段。",
    "射线AB与射线BA表示同一条射线。",
    "直线AB有两个端点。",
    "射线AB向两个方向无限延伸。"
  ]);
  assert.deepEqual(
    geometryClassification.options?.map((option) => questionAnswerMatches(
      {
        answer: geometryClassification.answer,
        accepted_answers: geometryClassification.acceptedAnswers,
        options: geometryClassification.options
      },
      option.zhHans ?? option.zh
    )),
    [true, false, false, false],
    "the line/ray/segment classification card should expose one uniquely accepted displayed option"
  );
  assert.deepEqual(translatedPoint.options?.map((option) => option.zhHans), ["(2,2)", "(-10,2)", "(2,4)", "(2,3)"]);
  assert.doesNotMatch(JSON.stringify(translatedPoint.options), /少一步|one step short/i);
  assert.match(monomialProduct.prompt.en, /4x·3x/);
  assert.doesNotMatch(monomialProduct.prompt.en, /x\^1/);
  assert.match(circle.prompt.zhHans ?? "", /同一个圆.*O是圆心.*弧AB/u);
  assert.equal(circle.answer, "40°");
  assert.deepEqual(circle.options?.map((option) => option.en), ["20°", "40°", "80°", "160°"]);
  assert.match(similarity.prompt.en, /larger-to-smaller corresponding-side ratio is 4:1/i);
  assert.match(similarity.prompt.zhHans ?? "", /大三角形与小三角形对应边的比是4:1/);
  assert.match(flagpole.prompt.en, /observer's eye height above the ground/i);
  assert.match(flagpole.prompt.zhHans ?? "", /测量者眼睛离地的高度/);
});

test("Mainland PEP junior geometry practice directly assesses the line-ray-segment objective", () => {
  const geometrySeed = mainlandPepJuniorLessonSeeds.find(
    (seed) => seed.topicId === "pep-junior-s1-upper-geometric-figures"
  );
  assert.ok(geometrySeed?.practiceQuestionIds);
  const questionById = new Map(mainlandPepJuniorQuestions.map((question) => [question.id, question]));
  const displayedPrompts = geometrySeed.practiceQuestionIds.map((questionId) => {
    const prompt = questionById.get(questionId)?.prompt.zhHans;
    assert.ok(prompt, `${questionId} should have a Simplified-Chinese prompt`);
    return prompt;
  });

  assert.ok(
    displayedPrompts.some((prompt) => /直线/u.test(prompt) && /射线/u.test(prompt) && /线段/u.test(prompt)),
    "one displayed practice card should distinguish a line, ray, and segment together"
  );
});

test("Mainland PEP junior student extensions use learner voice and glossaries use clean Chinese punctuation", () => {
  assert.equal(mainlandPepJuniorLessonSeeds.length, 11);

  mainlandPepJuniorLessonSeeds.forEach((seed) => {
    const extension = seed.blocks.find((block) => block.type === "extension");
    const strategy = extension?.items?.[0]?.zhHans;
    assert.ok(strategy, `${seed.topicId} should expose a Simplified-Chinese learner strategy`);
    assert.match(strategy, /^解题策略：/u, `${seed.topicId} should address the learner directly`);
    assert.doesNotMatch(strategy, /若学生|请让他|请追问|请给出/u, `${seed.topicId} should not expose teacher directions`);

    const concept = seed.blocks.find((block) => block.type === "concept")?.content?.zhHans;
    assert.ok(concept, `${seed.topicId} should expose Simplified-Chinese concept content`);
    assert.doesNotMatch(concept, /。；/u, `${seed.topicId} glossary should not place a semicolon after a full stop`);
    assert.doesNotMatch(concept, /:\s/u, `${seed.topicId} Simplified-Chinese glossary should not use an ASCII colon`);
  });
});

test("Mainland PEP junior exponent grading accepts true notation but rejects a caretless exponent", () => {
  const question = questions.find((candidate) => candidate.id === "pep-junior-v2-s2-k07-fi-001");
  assert.ok(question);
  const gradingQuestion = {
    answer: question.answer,
    accepted_answers: question.acceptedAnswers ?? null,
    options: question.options ?? null
  };

  assert.equal(questionAnswerMatches(gradingQuestion, "30x^5"), true);
  assert.equal(questionAnswerMatches(gradingQuestion, "30*x^5"), true);
  assert.equal(questionAnswerMatches(gradingQuestion, "30x⁵"), true);
  assert.equal(questionAnswerMatches(gradingQuestion, "30x5"), false);
});

test("Mainland PEP junior lesson definitions state required mathematical conditions", () => {
  const seedById = new Map(mainlandPepJuniorLessonSeeds.map((seed) => [seed.topicId, seed]));
  const rational = JSON.stringify(seedById.get("pep-junior-s1-upper-rational-numbers"));
  const expressions = JSON.stringify(seedById.get("pep-junior-s1-upper-expressions-linear-equations"));
  const geometry = JSON.stringify(seedById.get("pep-junior-s1-upper-geometric-figures"));
  const roots = JSON.stringify(seedById.get("pep-junior-s2-lower-roots-pythagorean-quadrilaterals"));
  const linear = JSON.stringify(seedById.get("pep-junior-s2-lower-linear-functions-data"));
  const quadratics = JSON.stringify(seedById.get("pep-junior-s3-upper-quadratics-circle-probability"));
  const inverse = JSON.stringify(seedById.get("pep-junior-s3-lower-inverse-similarity-trigonometry"));

  assert.match(rational, /q≠0/);
  assert.match(expressions, /variables are not divisors|字母不作除数/);
  assert.match(geometry, /extends without end in one direction|向一个方向无限延伸/);
  assert.match(roots, /a\\\\ge0|a\\ge0/);
  assert.match(linear, /k\\\\neq0|k\\neq0/);
  assert.match(quadratics, /a\\\\neq0|a\\neq0/);
  assert.match(quadratics, /points in a plane|平面内/);
  assert.match(inverse, /k\\\\neq0|k\\neq0/);
  assert.match(inverse, /x\\\\neq0|x\\neq0/);
  assert.match(inverse, /smaller-to-larger corresponding-side ratio|较小三角形与较大三角形对应边的比/);
  assert.match(inverse, /opposite.*hypotenuse.*adjacent.*hypotenuse.*opposite.*adjacent|对边.*斜边.*邻边.*斜边.*对边.*邻边/);
  assert.doesNotMatch(JSON.stringify(mainlandPepJuniorLessonSeeds), /Misconception clinic|诊断：/);
});
