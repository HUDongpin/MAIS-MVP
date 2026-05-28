import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  independentMainlandPepJuniorAnswer,
  mainlandPepJuniorQuestionGenerationMetadata,
  mainlandPepJuniorQuestions,
  mainlandPepJuniorStarterQuestions
} from "../data/mainlandPepJuniorQuestions";
import { mainlandPepJuniorTopicMetadata, mainlandPepJuniorTopics } from "../data/mainlandPepJuniorTopics";
import { questions } from "../data/questions";
import { mainlandPepJuniorExamPatternCards } from "../data/rag/mainlandPepJuniorExamPatterns";
import { mainlandPepJuniorPaperPatternCards } from "../data/rag/mainlandPepJuniorPaperPatterns";
import { mainlandPepJuniorRagCards } from "../data/rag/mainlandPepJunior";
import type { Question } from "@/types";

const expectedJuniorQuestionCount = 1200;
const expectedLegacyCandidateQuestionCount = 900;
const legacyJuniorCandidateJsonlPath = "coordination/content-qa/mainland-pep-junior-generated-bank-v1/questions.jsonl";
const juniorV2QuestionPackPath = "coordination/content-qa/mainland-pep-junior-generated-bank-v2-1200/question-pack.json";

type JuniorCandidateRecord = {
  id: string;
  batch?: string;
  grade: string;
  semester: string;
  knowledgePointId: string;
  type: string;
  difficulty?: string;
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

  v2Ids.forEach((questionId) => {
    assert.ok(bankIds.has(questionId), `${questionId} should be exported by the junior public bank`);
    assert.ok(publicJuniorIds.has(questionId), `${questionId} should be included in the public aggregate`);
  });
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
    Foundation: 230,
    Core: 610,
    Exam: 280,
    Challenge: 80
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
