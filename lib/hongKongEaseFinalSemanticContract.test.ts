import assert from "node:assert/strict";
import test from "node:test";

import questionPackJson from "../data/generated-content/hk-ease-practice-bank-v2/question-pack.json";

type CandidateQuestion = {
  id: string;
  topicTitleZh: string;
  promptEn: string;
  promptZh: string;
  explanationEn: string;
  explanationZh: string;
  answer: string;
  acceptedAnswers: string[];
  optionsEn: string[];
  optionsZh: string[];
};

const questionPack = questionPackJson as { questions: CandidateQuestion[] };
const questionById = new Map(questionPack.questions.map((question) => [question.id, question]));

function question(id: string) {
  const value = questionById.get(id);
  assert.ok(value, `${id}: missing EASE candidate question`);
  return value;
}

test("all 701 EASE rows are free of the reviewed title, control-character, and internal-QA defects", () => {
  assert.equal(questionPack.questions.length, 701);
  assert.equal(questionById.size, 701);

  const forbiddenLearnerQa = /(?:\bS18\b|internal QA|answer-key verification|source erratum|來源勘誤|来源勘误|\boracle\b|\bgrader\b|pending[^.]{0,40}review)/i;
  for (const candidate of questionPack.questions) {
    assert.doesNotMatch(candidate.topicTitleZh, /\([一二三四五六七八九十]+\s+\)/u, `${candidate.id}: stray title space`);
    for (const [field, value] of [
      ["promptEn", candidate.promptEn],
      ["promptZh", candidate.promptZh],
      ["explanationEn", candidate.explanationEn],
      ["explanationZh", candidate.explanationZh]
    ] as const) {
      assert.doesNotMatch(value, /[\t\r]/, `${candidate.id}.${field}: raw control whitespace`);
      assert.doesNotMatch(value, forbiddenLearnerQa, `${candidate.id}.${field}: internal QA prose`);
    }
  }

  const expectedTitleCounts = new Map([
    ["四則運算 (一)", 12],
    ["四則運算 (二)", 11],
    ["四邊形 (三)", 7]
  ]);
  for (const [title, expectedCount] of expectedTitleCounts) {
    assert.equal(
      questionPack.questions.filter((candidate) => candidate.topicTitleZh === title).length,
      expectedCount,
      `${title}: normalized title count drifted`
    );
  }
});

test("the reviewed bilingual people and neutral teacher title correspond exactly across locales", () => {
  assert.equal(
    question("hk-ease-10551").promptEn,
    "A bottle of juice originally contains \\(1.25\\) L. Siu-keung drank \\(0.3\\) L, and Siu-lai drank \\(0.45\\) L. How many litres of juice are left?"
  );
  assert.equal(question("hk-ease-10551").answer, "0.5");

  assert.equal(
    question("hk-ease-10561").promptEn,
    "A water pitcher originally contains \\(2.5\\) L of water. Siu-lai drank \\(0.35\\) L, and Ming poured out \\(1.2\\) L to water the plants. How many litres of water are left in the pitcher now?"
  );
  assert.equal(question("hk-ease-10561").answer, "0.95");

  assert.equal(
    question("hk-ease-10477").promptEn,
    "A box of cookies contains \\(24\\) pieces. Teacher Chan bought \\(6\\) boxes and divided them equally among \\(18\\) students. How many cookies did each student get?"
  );
  assert.equal(question("hk-ease-10477").answer, "8");
});

test("the six reviewed Traditional Chinese list prompts are normalized without changing their correct answers", () => {
  const expected = {
    "hk-ease-567": {
      promptZh: "下列何者能同時被 4 和 6 整除？\nI. 276\nII. 578\nIII. 840",
      answer: "只有I及III"
    },
    "hk-ease-568": {
      promptZh: "已知某兩個整數的 H.C.F. 和 L.C.M. 分別是 30 和 120。下列何者必為正確？\nI. 480 是該兩個整數的公倍數。\nII. 該兩個整數都能被 2 整除。\nIII. 該兩個整數都能被 4 整除。",
      answer: "只有I及II"
    },
    "hk-ease-663": {
      promptZh: "10638 能被以下哪些整數整除？\nI. 4\nII. 6\nIII. 9",
      answer: "只有II及III"
    },
    "hk-ease-664": {
      promptZh: "若某整數能同時被 4 和 6 整除，則下列何者必為正確？\nI. 該整數的各個位上的數字之和能被 2 整除。\nII. 該整數的各個位上的數字之和能被 3 整除。\nIII. 該整數的各個位上的數字之和能被 6 整除。",
      answer: "只有II"
    },
    "hk-ease-782": {
      promptZh: "以下哪個不是 78 的因數？",
      answer: "29"
    },
    "hk-ease-815": {
      promptZh: "下列何者是正確的？\nI. 2 000 可以被 2、5 和 10 整除。\nII. 108 可以被 2、3 和 4 整除。\nIII. 260 可以被 2、3 和 5 整除。",
      answer: "只有I及II"
    }
  } as const;

  for (const [id, contract] of Object.entries(expected)) {
    const candidate = question(id);
    assert.equal(candidate.promptZh, contract.promptZh, `${id}: repaired prompt drifted`);
    assert.equal(candidate.answer, contract.answer, `${id}: canonical answer drifted`);
    assert.ok(candidate.acceptedAnswers.includes(candidate.answer), `${id}: canonical answer is not accepted`);
    assert.equal(candidate.optionsEn.length, candidate.optionsZh.length, `${id}: bilingual options drifted`);
  }
});
