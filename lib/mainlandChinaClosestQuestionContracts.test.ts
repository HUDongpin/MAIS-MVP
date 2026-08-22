import assert from "node:assert/strict";
import test from "node:test";

import { mainlandBnuHighQuestions } from "@/data/mainlandBnuHighQuestions";
import { mainlandBnuJuniorQuestions } from "@/data/mainlandBnuJuniorQuestions";
import { mainlandBnuPrimaryQuestions } from "@/data/mainlandBnuPrimaryQuestions";
import { mainlandHjbHighQuestions } from "@/data/mainlandHjbHighQuestions";
import { mainlandHjbJuniorQuestions } from "@/data/mainlandHjbJuniorQuestions";
import { mainlandHjbPrimaryQuestions } from "@/data/mainlandHjbPrimaryQuestions";
import { mainlandPepHighQuestions } from "@/data/mainlandPepHighQuestions";
import { mainlandPepJuniorQuestions } from "@/data/mainlandPepJuniorQuestions";
import { mainlandPepPrimaryRagV1Questions } from "@/data/mainlandPepPrimaryQuestions";
import { questionAnswerMatches } from "@/lib/server/answerMatching";
import type { LocalizedText, Question } from "@/types";

type NumericOracle = {
  target: number;
  values: readonly number[];
  expectedIndex: number;
  optionMarkers: readonly string[];
  promptMarkers?: readonly string[];
};

type QualitativeOracle = {
  expectedIndex: number;
  expectedOption: string;
  /** Human-reviewed real-world comparison that makes the keyed option unique. */
  semanticAnchor: string;
};

const numericOracles: Record<string, NumericOracle> = {
  "bnu-primary-ds-v1-p1-223": {
    target: 41,
    values: [40, 50, 30, 60],
    expectedIndex: 0,
    optionMarkers: ["大约40张", "大约50张", "大约30张", "大约60张"],
  },
  "bnu-primary-ds-v2-p1-187": {
    target: 70,
    values: [68, 71, 65, 73],
    expectedIndex: 1,
    optionMarkers: ["68", "71", "65", "73"],
  },
  "bnu-primary-ds-v1-p1-136": {
    target: 10,
    values: [8, 12, 9, 7],
    expectedIndex: 2,
    optionMarkers: ["8", "12", "9", "7"],
  },
  "bnu-primary-ds-v1-p2-169": {
    target: 5000,
    values: [4987, 5012, 4899, 5103],
    expectedIndex: 1,
    optionMarkers: ["4987", "5012", "4899", "5103"],
  },
  "bnu-primary-ds-v2-p2-197": {
    target: 500,
    values: [501, 498, 503, 504],
    expectedIndex: 0,
    optionMarkers: ["203+298", "410+88", "702-199", "350+154"],
  },
  "bnu-primary-ds-v2-p2-207": {
    target: 634,
    values: [620, 640, 700, 500],
    expectedIndex: 1,
    optionMarkers: ["350+270=620", "360+280=640", "400+300=700", "300+200=500"],
  },
  "bnu-primary-ds-v2-p3-139": {
    target: 60,
    values: [241 / 4, 302 / 5, 365 / 6, 423 / 7],
    expectedIndex: 0,
    optionMarkers: ["241÷4", "302÷5", "365÷6", "423÷7"],
  },
  "bnu-primary-ds-v2-p3-145": {
    target: 80,
    values: [245 / 3, 322 / 4, 481 / 6, 567 / 7],
    expectedIndex: 2,
    optionMarkers: ["245÷3", "322÷4", "481÷6", "567÷7"],
  },
  "bnu-primary-ds-v1-p3-183": {
    target: 1000,
    values: [250, 100, 1000, 800],
    expectedIndex: 2,
    optionMarkers: ["10袋25千克的大米", "100袋1千克的食盐", "40袋25千克的大米", "200袋4千克的面粉"],
  },
  "bnu-primary-ds-v1-p3-166": {
    target: 1000,
    values: [992, 1015, 950, 990],
    expectedIndex: 0,
    optionMarkers: ["31×32", "29×35", "25×38", "33×30"],
  },
  "bnu-primary-ds-v2-p3-178": {
    target: 19 * 29,
    values: [600, 400, 200, 800],
    expectedIndex: 0,
    optionMarkers: ["600", "400", "200", "800"],
  },
  "bnu-primary-ds-v1-p3-175": {
    target: 1000,
    values: [19 * 49, 21 * 51, 22 * 48, 25 * 42],
    expectedIndex: 3,
    optionMarkers: ["19×49", "21×51", "22×48", "25×42"],
  },
  "bnu-primary-ds-v2-p3-115": {
    target: 1,
    values: [0.09, 0.99, 1.02, 0.9],
    expectedIndex: 1,
    optionMarkers: ["0.09", "0.99", "1.02", "0.9"],
  },
  "bnu-primary-ds-v1-p3-079": {
    target: 1600,
    values: [397 * 4, 502 * 3, 795 * 2, 201 * 8],
    expectedIndex: 3,
    optionMarkers: ["397×4", "502×3", "795×2", "201×8"],
  },
  "bnu-primary-ds-v2-p3-079": {
    target: 1200,
    values: [298 * 4, 402 * 3, 198 * 6, 501 * 2],
    expectedIndex: 1,
    optionMarkers: ["298×4", "402×3", "198×6", "501×2"],
  },
  "bnu-primary-ds-v2-p3-082": {
    target: 2000,
    values: [498 * 4, 602 * 3, 399 * 5, 251 * 8],
    expectedIndex: 2,
    optionMarkers: ["498×4", "602×3", "399×5", "251×8"],
  },
  "bnu-primary-ds-v2-p4-004": {
    target: 800000,
    values: [799000, 800100, 801000, 798000],
    expectedIndex: 1,
    optionMarkers: ["799000", "800100", "801000", "798000"],
  },
  "bnu-primary-ds-v1-p4-016": {
    target: 1_000_000_000,
    values: [999_999_998, 1_000_000_001, 1_000_000_010, 999_999_990],
    expectedIndex: 1,
    optionMarkers: ["999999998", "1000000001", "1000000010", "999999990"],
  },
  "bnu-primary-ds-v1-p4-037": {
    target: 298 * 31,
    values: [300 * 30, 300 * 31, 290 * 30, 298 * 30],
    expectedIndex: 1,
    optionMarkers: ["A", "B", "C", "D"],
    promptMarkers: ["300×30", "300×31", "290×30", "298×30"],
  },
  "bnu-primary-ds-v2-p4-043": {
    target: 10000,
    values: [198 * 52, 205 * 48, 312 * 32, 401 * 25],
    expectedIndex: 2,
    optionMarkers: ["198×52", "205×48", "312×32", "401×25"],
  },
  "bnu-primary-ds-v2-p4-109": {
    target: 0,
    values: [-5, -2, 3, 4],
    expectedIndex: 1,
    optionMarkers: ["-5", "-2", "3", "4"],
  },
  "bnu-primary-ds-v1-p5-070": {
    target: 1,
    values: [4 / 5, 5 / 6, 7 / 8, 8 / 9],
    expectedIndex: 3,
    optionMarkers: ["4/5", "5/6", "7/8", "8/9"],
  },
  "bnu-junior-ds-v1-s3-049": {
    target: Math.atan(3) * 180 / Math.PI,
    values: [30, 45, 60, 75],
    expectedIndex: 3,
    optionMarkers: ["30°", "45°", "60°", "75°"],
  },
  "bnu-junior-ds-v1-s3-485": {
    target: (12 + 8) / 50,
    values: [0.2, 0.3, 0.4, 0.5],
    expectedIndex: 2,
    optionMarkers: ["0.20", "0.30", "0.40", "0.50"],
  },
  "hjb-primary-ds-v1-p1-244": {
    target: 12 * 60,
    values: [11 * 60 + 55, 12 * 60 + 8, 11 * 60 + 45, 12 * 60 + 10],
    expectedIndex: 0,
    optionMarkers: ["11时55分", "12时08分", "11时45分", "12时10分"],
  },
  "hjb-primary-ds-v1-p2-203": {
    target: 7000,
    values: [6987, 7012, 6899, 7100],
    expectedIndex: 1,
    optionMarkers: ["6987", "7012", "6899", "7100"],
  },
  "hjb-primary-ds-v1-p2-211": {
    target: 630,
    values: [523, 613, 623, 723],
    expectedIndex: 2,
    optionMarkers: ["345+278=523", "345+278=613", "345+278=623", "345+278=723"],
  },
  "hjb-primary-ds-v1-p2-217": {
    target: 500,
    values: [245 + 248, 312 + 189, 456 + 55, 198 + 297],
    expectedIndex: 1,
    optionMarkers: ["245+248", "312+189", "456+55", "198+297"],
  },
  "hjb-primary-ds-v1-p3-064": {
    target: 389 * 6,
    values: [400 * 6, 390 * 6, 380 * 6, 300 * 6],
    expectedIndex: 1,
    optionMarkers: ["400×6=2400", "390×6=2340", "380×6=2280", "300×6=1800"],
  },
  "hjb-primary-ds-v1-p3-073": {
    target: 1200,
    values: [298 * 4, 403 * 3, 242 * 5, 601 * 2],
    expectedIndex: 3,
    optionMarkers: ["298×4", "403×3", "242×5", "601×2"],
  },
  "hjb-primary-ds-v1-p4-043": {
    target: 800000,
    values: [799000, 800010, 795000, 805000],
    expectedIndex: 1,
    optionMarkers: ["799000", "800010", "795000", "805000"],
  },
  "hjb-primary-ds-v1-p5-016": {
    target: 50 - (2.5 * 7.8 + 1.6 * 5.4),
    values: [21, 22, 23, 24],
    expectedIndex: 1,
    optionMarkers: ["大约21元", "大约22元", "大约23元", "大约24元"],
  },
  "hjb-junior-ds-v2-s2-049": {
    target: Math.sqrt(8),
    values: [2, 3, 4, 5],
    expectedIndex: 1,
    optionMarkers: ["2", "3", "4", "5"],
  },
  "hjb-junior-ds-v2-s2-361": {
    target: Math.sqrt(98),
    values: [8, 9, 10, 11],
    expectedIndex: 2,
    optionMarkers: ["8", "9", "10", "11"],
  },
  "hjb-junior-ds-v2-s3-109": {
    target: 24 * 0.7,
    values: [13.7, 16.8, 19.7, 29.3],
    expectedIndex: 1,
    optionMarkers: ["13.7米", "16.8米", "19.7米", "29.3米"],
  },
  "hjb-junior-ds-v2-s3-166": {
    target: 40 * 0.466 * 0.7 / (0.7 - 0.466),
    values: [52, 58, 64, 70],
    expectedIndex: 1,
    optionMarkers: ["约52米", "约58米", "约64米", "约70米"],
  },
  "hjb-junior-ds-v2-s3-492": {
    target: 281 / 9,
    values: [32, 36, 40, 44],
    expectedIndex: 0,
    optionMarkers: ["32", "36", "40", "44"],
  },
};

const qualitativeOracles: Record<string, QualitativeOracle> = {
  "bnu-primary-ds-v1-p2-183": {
    expectedIndex: 0,
    expectedOption: "学校操场一圈的长度",
    semanticAnchor: "A playground lap is hundreds of metres; all other choices are only metres, centimetres, or millimetres.",
  },
  "bnu-primary-ds-v2-p2-183": {
    expectedIndex: 0,
    expectedOption: "一支新铅笔的长度",
    semanticAnchor: "A new pencil is about 15–20 cm and is the only option on the 1 dm scale.",
  },
  "bnu-primary-ds-v2-p2-189": {
    expectedIndex: 0,
    expectedOption: "一张银行卡的厚度",
    semanticAnchor: "A bank card is about 0.76 mm thick; the other objects are orders of magnitude longer.",
  },
  "bnu-primary-ds-v1-p2-193": {
    expectedIndex: 1,
    expectedOption: "一枚5角硬币的厚度",
    semanticAnchor: "A coin is about 1–2 mm thick; a book, desk, and classroom are much larger.",
  },
  "bnu-primary-ds-v2-p2-229": {
    expectedIndex: 1,
    expectedOption: "跳100下跳绳",
    semanticAnchor: "One hundred rope jumps is on the one-minute scale; the other activities take several to tens of minutes.",
  },
  "bnu-primary-ds-v2-p2-082": {
    expectedIndex: 2,
    expectedOption: "一张课桌的高度",
    semanticAnchor: "A pupil desk is roughly 0.7–0.8 m high; the alternatives are several metres or well below one metre.",
  },
  "bnu-primary-ds-v2-p3-183": {
    expectedIndex: 1,
    expectedOption: "一本数学书",
    semanticAnchor: "A mathematics textbook is the only listed small object plausibly on the kilogram scale.",
  },
  "bnu-primary-ds-v1-p5-169": {
    expectedIndex: 0,
    expectedOption: "一个粉笔盒",
    semanticAnchor: "A chalk box is on the 1 L = 1 dm³ scale; a refrigerator and classroom are far larger and a table-tennis ball far smaller.",
  },
  "hjb-primary-ds-v1-p1-028": {
    expectedIndex: 1,
    expectedOption: "B. 直筒水杯",
    semanticAnchor: "A straight-sided round cup is cylindrical; the other choices are prisms, a sphere, and a cube.",
  },
  "hjb-primary-ds-v1-p1-227": {
    expectedIndex: 0,
    expectedOption: "一拃",
    semanticAnchor: "A hand span is about 15–20 cm; a step and arm span are longer and a finger width is much shorter.",
  },
};

const specialRuleIds = [
  "bnu-primary-ds-v1-p1-222",
  "bnu-primary-ds-v2-p2-167",
  "bnu-primary-ds-v1-p3-034",
  "bnu-primary-ds-v2-p3-034",
  "bnu-junior-ds-v1-s3-135",
] as const;

const packs = {
  pepPrimary: mainlandPepPrimaryRagV1Questions,
  pepJunior: mainlandPepJuniorQuestions,
  pepHigh: mainlandPepHighQuestions,
  bnuPrimary: mainlandBnuPrimaryQuestions,
  bnuJunior: mainlandBnuJuniorQuestions,
  bnuHigh: mainlandBnuHighQuestions,
  hjbPrimary: mainlandHjbPrimaryQuestions,
  hjbJunior: mainlandHjbJuniorQuestions,
  hjbHigh: mainlandHjbHighQuestions,
} satisfies Record<string, Question[]>;

function localized(value: LocalizedText | string | undefined) {
  if (!value) return "";
  return typeof value === "string" ? value : value.zhHans ?? value.zh ?? value.en;
}

function normalized(value: LocalizedText | string | undefined) {
  return localized(value).normalize("NFKC").trim().replace(/\s+/gu, "").toLowerCase();
}

function gradingQuestion(question: Question) {
  return {
    id: question.id,
    answer: question.answer,
    accepted_answers: question.acceptedAnswers,
    options: question.options,
    prompt: question.prompt,
  };
}

function acceptedOptionIndexes(question: Question) {
  return (question.options ?? [])
    .map((option, index) => questionAnswerMatches(gradingQuestion(question), localized(option)) ? index : -1)
    .filter((index) => index >= 0);
}

const allQuestions = Object.values(packs).flat();
const byId = new Map(allQuestions.map((question) => [question.id, question]));
const closestRows = Object.entries(packs).flatMap(([pack, questions]) => questions
  .filter((question) => /最接近|最靠近|closest/iu.test(localized(question.prompt).normalize("NFKC")))
  .map((question) => ({ pack, question })));

test("current closest-question lexical scope has 52 explicitly adjudicated dispositions", () => {
  const numericIds = Object.keys(numericOracles);
  const qualitativeIds = Object.keys(qualitativeOracles);
  const specialIds = [...specialRuleIds];
  const adjudicated = [...numericIds, ...qualitativeIds, ...specialIds];

  assert.equal(numericIds.length, 37);
  assert.equal(qualitativeIds.length, 10);
  assert.equal(specialIds.length, 5);
  assert.equal(new Set(adjudicated).size, 52, "numeric, qualitative, and special scopes must be disjoint");
  assert.equal(closestRows.length, 52, "closest lexical scope drift must fail closed");
  assert.deepEqual(
    [...new Set(closestRows.map(({ question }) => question.id))].sort(),
    [...adjudicated].sort(),
    "every current closest row must have exactly one explicit disposition",
  );

  const packCounts = Object.fromEntries(Object.keys(packs).map((pack) => [
    pack,
    closestRows.filter((row) => row.pack === pack).length,
  ]));
  assert.deepEqual(packCounts, {
    pepPrimary: 0,
    pepJunior: 0,
    pepHigh: 0,
    bnuPrimary: 34,
    bnuJunior: 3,
    bnuHigh: 0,
    hjbPrimary: 10,
    hjbJunior: 5,
    hjbHigh: 0,
  });
});

test("37 numeric closest questions enumerate all options, have a unique argmin, and key it", () => {
  for (const [id, oracle] of Object.entries(numericOracles)) {
    const question = byId.get(id);
    assert.ok(question, `${id} should exist`);
    if (!question) continue;

    const options = question.options ?? [];
    assert.equal(options.length, oracle.values.length, `${id} option/oracle arity`);
    assert.equal(oracle.optionMarkers.length, options.length, `${id} option marker arity`);
    oracle.optionMarkers.forEach((marker, index) => {
      assert.ok(
        normalized(options[index]).includes(normalized(marker)),
        `${id} option ${index} must still represent oracle value ${oracle.values[index]} (${marker})`,
      );
    });
    for (const marker of oracle.promptMarkers ?? []) {
      assert.ok(normalized(question.prompt).includes(normalized(marker)), `${id} prompt must retain ${marker}`);
    }

    // Numerical noise tolerance must stay far below one whole-unit difference;
    // the former 1e-9*scale rule collapsed adjacent billion-scale integers.
    const epsilon = Math.max(
      1e-12,
      Number.EPSILON * 16 * Math.max(1, Math.abs(oracle.target), ...oracle.values.map(Math.abs)),
    );
    const distances = oracle.values.map((value) => Math.abs(value - oracle.target));
    const minimum = Math.min(...distances);
    const minimumIndexes = distances
      .map((distance, index) => Math.abs(distance - minimum) <= epsilon ? index : -1)
      .filter((index) => index >= 0);
    assert.deepEqual(minimumIndexes, [oracle.expectedIndex], `${id} must have one independent numeric argmin`);
    assert.deepEqual(acceptedOptionIndexes(question), [oracle.expectedIndex], `${id} canonical must key the unique argmin`);
    assert.equal(questionAnswerMatches(gradingQuestion(question), question.answer), true, `${id} canonical self-match`);
  }
});

test("10 qualitative closest questions retain signed semantic anchors and one keyed option", () => {
  for (const [id, oracle] of Object.entries(qualitativeOracles)) {
    const question = byId.get(id);
    assert.ok(question, `${id} should exist`);
    if (!question) continue;
    assert.equal(question.type, "multiple-choice", `${id} qualitative disposition must stay MC`);
    assert.ok(oracle.semanticAnchor.length >= 40, `${id} requires a substantive human-reviewed anchor`);
    assert.equal(normalized(question.options?.[oracle.expectedIndex]), normalized(oracle.expectedOption), `${id} anchored option drift`);
    assert.deepEqual(acceptedOptionIndexes(question), [oracle.expectedIndex], `${id} must key only the anchored choice`);
  }
});

test("five special closest questions satisfy their dedicated mathematical rules", () => {
  const compoundEstimate = byId.get("bnu-primary-ds-v1-p1-222");
  assert.ok(compoundEstimate);
  if (compoundEstimate) {
    assert.match(localized(compoundEstimate.prompt), /34、9、15.*最接近的整十数/u);
    assert.equal(compoundEstimate.answer, "30，10，20，40，40");
    assert.equal(questionAnswerMatches(gradingQuestion(compoundEstimate), "30,10,20,40,40"), true);
    assert.equal(questionAnswerMatches(gradingQuestion(compoundEstimate), "40"), false, "partial exact-only result must reject");
  }

  const digits = byId.get("bnu-primary-ds-v2-p2-167");
  assert.ok(digits);
  if (digits) {
    const permutations = [4, 0, 5, 8].flatMap((a) => [4, 0, 5, 8]
      .filter((b) => b !== a)
      .flatMap((b) => [4, 0, 5, 8]
        .filter((c) => c !== a && c !== b)
        .map((c) => {
          const d = [4, 0, 5, 8].find((value) => value !== a && value !== b && value !== c);
          return d === undefined ? 0 : a * 1000 + b * 100 + c * 10 + d;
        })))
      .filter((value) => value >= 1000);
    assert.equal(Math.max(...permutations), 8540);
    assert.equal(Math.min(...permutations), 4058);
    assert.deepEqual(
      permutations.map((value) => ({ value, distance: Math.abs(value - 5000) }))
        .sort((a, b) => a.distance - b.distance || a.value - b.value)
        .slice(0, 2),
      [{ value: 5048, distance: 48 }, { value: 5084, distance: 84 }],
    );
    assert.equal(digits.answer, "（1）8540 （2）4058 （3）5048");
  }

  const nearestTen = byId.get("bnu-primary-ds-v1-p3-034");
  assert.ok(nearestTen);
  if (nearestTen) {
    assert.match(localized(nearestTen.prompt), /最接近的整十数/u);
    assert.equal(Math.round(426 / 10) * 10 + Math.round(389 / 10) * 10, 820);
    assert.deepEqual(acceptedOptionIndexes(nearestTen), [1]);
  }

  const nearestHundred = byId.get("bnu-primary-ds-v2-p3-034");
  assert.ok(nearestHundred);
  if (nearestHundred) {
    assert.match(localized(nearestHundred.prompt), /最接近的整百数/u);
    assert.equal(Math.round(487 / 100) * 100 + Math.round(356 / 100) * 100, 900);
    assert.deepEqual(acceptedOptionIndexes(nearestHundred), [0]);
  }

  const frequency = byId.get("bnu-junior-ds-v1-s3-135");
  assert.ok(frequency);
  if (frequency) {
    const stableTail = [0.29, 0.30, 0.31, 0.30, 0.30];
    const mean = stableTail.reduce((sum, value) => sum + value, 0) / stableTail.length;
    assert.ok(Math.abs(mean - 0.30) < 1e-12);
    assert.ok(Math.max(...stableTail) - Math.min(...stableTail) <= 0.02 + Number.EPSILON);
    assert.equal(questionAnswerMatches(gradingQuestion(frequency), "0.30"), true);
    assert.equal(questionAnswerMatches(gradingQuestion(frequency), "0.50"), false);
  }
});
