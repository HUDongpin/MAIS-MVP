import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

import { normalizeMathTextForDisplay } from "../components/math/mathTextFormatting";
import { chinaLessonEnglishTranslation } from "../data/chinaLessonEnglishTranslations";
import { chinaLessonTraditionalTranslation } from "../data/chinaLessonTraditionalTranslations";
import { productionLessonSeeds } from "../data/lessons";
import { questions } from "../data/questions";
import { validateRestoredTranslation } from "../scripts/china-lesson-english-translation-validation";
import { gradeSeedQuestionAttempt, questionAnswerMatches } from "./server/answerGrading";

type ArtifactQuestion = {
  id: string;
  topicId: string;
  type: string;
  difficulty: string;
  promptZhHans: string;
  optionsZhHans: string[];
  answer: string;
  acceptedAnswers: string[];
  explanationZhHans: string;
};

type DurableContract = {
  id: string;
  topicId: string;
  type: "fill-in" | "short-answer";
  difficulty: "Foundation" | "Core";
  taskFamily: string;
  prompt: string;
  promptZh: string;
  promptEn: string;
  answer: string;
  accepted: string[];
  explanation: string;
  explanationZh: string;
  explanationEn: string;
};

const durableContracts: DurableContract[] = [
  {
    id: "bnu-high-ds-v1-s4-146",
    topicId: "bnu-high-s4-函数应用",
    type: "short-answer",
    difficulty: "Foundation",
    taskFamily: "piecewise-fare-model",
    prompt: "某市出租车前3千米的起步价为12元，超过3千米的部分每千米收费2.5元。一次行程恰为7千米且不计其他费用，车费是多少元？",
    promptZh: "某市出租車前3千米的起步價為12元，超過3千米的部分每千米收費2.5元。一次行程恰為7千米且不計其他費用，車費是多少元？",
    promptEn: "In a certain city, the taxi starting fare for the first 3 kilometers is 12 yuan, and for each kilometer beyond 3 kilometers, the charge is 2.5 yuan per kilometer. For a trip of exactly 7 kilometers, ignoring other fees, how much is the fare in yuan?",
    answer: "22",
    accepted: ["22", "22元", "22 yuan"],
    explanation: "前3千米收费12元，超出的路程为7-3=4千米，超出部分收费4×2.5=10元。因此总车费为12+10=22元。",
    explanationZh: "前3千米收費12元，超出的路程為7-3=4千米，超出部分收費4×2.5=10元。因此總車費為12+10=22元。",
    explanationEn: "The first 3 kilometers cost 12 yuan. The distance exceeded is 7 -3 = 4 kilometers, and the charge for the exceeded part is 4 × 2.5 = 10 yuan. Therefore, the total fare is 12 +10 = 22 yuan."
  },
  {
    id: "bnu-high-ds-v1-s4-254",
    topicId: "bnu-high-s4-数学建模活动-一",
    type: "short-answer",
    difficulty: "Foundation",
    taskFamily: "build-and-check-drain-model",
    prompt: "某水池在t=0时有水120立方米，匀速排水4小时后剩余96立方米。建立剩余水量V（立方米）关于时间t（小时）的线性模型，并求排水10小时后的剩余水量。",
    promptZh: "某水池在t=0時有水120立方米，勻速排水4小時後剩餘96立方米。建立剩餘水量V（立方米）關於時間t（小時）的線性模型，並求排水10小時後的剩餘水量。",
    promptEn: "A water tank contains 120 cubic meters of water at t = 0. After draining at a constant rate for 4 hours, 96 cubic meters remain. Set up a linear model of the remaining volume V (cubic meters) with respect to time t (hours), and determine the remaining volume after draining for 10 hours.",
    answer: "V(t)=120-6t，V(10)=60",
    accepted: [
      "V(t)=120-6t，V(10)=60",
      "V(t)=120-6t, V(10)=60",
      "V=120-6t，60",
      "V(t)=120-6t; V(10)=60 cubic meters",
      "V(t)=120-6t; V(10)=60 cubic metres"
    ],
    explanation: "4小时内水量减少120-96=24立方米，匀速排水速率为24÷4=6立方米/小时。因此在水排空前，V(t)=120-6t。代入t=10，得V(10)=120-60=60立方米。",
    explanationZh: "4小時內水量減少120-96=24立方米，勻速排水速率為24÷4=6立方米/小時。因此在水排空前，V(t)=120-6t。代入t=10，得V(10)=120-60=60立方米。",
    explanationEn: "In 4 hours, the water volume decreased by 120-96 = 24 cubic meters. The constant drainage rate is 24 ÷ 4 = 6 cubic meters per hour. Therefore, before the water is drained, V(t) = 120-6t. Substituting t = 10, we get V(10) = 120-60 = 60 cubic meters."
  },
  {
    id: "bnu-high-ds-v1-s5-003",
    topicId: "bnu-high-s5-直线与圆",
    type: "fill-in",
    difficulty: "Foundation",
    taskFamily: "vertical-line-equation",
    prompt: "直线 l 经过点 A(3, -2) 和 B(3, 5)。判断其斜率是否存在，并写出直线 l 的方程。请按“斜率；方程”的格式作答：____。",
    promptZh: "直線 l 經過點 A(3, -2) 和 B(3, 5)。判斷其斜率是否存在，並寫出直線 l 的方程。請按“斜率；方程”的格式作答：____。",
    promptEn: "Line l passes through A(3, -2) and B(3, 5). State whether its slope is defined and write its equation. Answer in the form “slope status; equation”: ____.",
    answer: "斜率不存在；x=3",
    accepted: [
      "斜率不存在；x=3",
      "斜率不存在，直线方程为x=3",
      "斜率不存在，直線方程為x=3",
      "The slope is undefined; x=3",
      "undefined; x=3",
      "slope undefined; x=3"
    ],
    explanation: "两点的横坐标相同，所以 l 是竖直直线，斜率不存在；直线上每一点都满足 x=3。",
    explanationZh: "兩點的橫座標相同，所以 l 是豎直直線，斜率不存在；直線上每一點都滿足 x=3。",
    explanationEn: "The two points have the same x-coordinate, so l is vertical and its slope is undefined; every point on l satisfies x=3."
  },
  {
    id: "bnu-high-ds-v1-s5-005",
    topicId: "bnu-high-s5-直线与圆",
    type: "short-answer",
    difficulty: "Core",
    taskFamily: "line-circle-position",
    prompt: "判断直线 l: 3x+4y-12=0 与圆 C: x²+y²=4 的位置关系。",
    promptZh: "判斷直線 l: 3x+4y-12=0 與圓 C: x²+y²=4 的位置關係。",
    promptEn: "Determine the positional relationship between the line l: 3x+4y-12=0 and the circle C: x²+y²=4.",
    answer: "相离",
    accepted: [
      "相离",
      "直线l与圆C相离",
      "直线 l 与圆 C 相离",
      "直線 l 與圓 C 相離",
      "disjoint",
      "the line and the circle are disjoint",
      "disjoint (相离)"
    ],
    explanation: "圆 C 的圆心为 O(0,0)，半径为 2。圆心到直线 l 的距离 d=|-12|/√(3²+4²)=12/5>2，所以直线与圆没有公共点，二者相离。",
    explanationZh: "圓 C 的圓心為 O(0,0)，半徑為 2。圓心到直線 l 的距離 d=|-12|/√(3²+4²)=12/5>2，所以直線與圓沒有公共點，兩者相離。",
    explanationEn: "Circle C has center O(0,0) and radius 2. The distance from the center to l is d=|-12|/√(3²+4²)=12/5>2, so the line and circle have no common point and are disjoint."
  },
  {
    id: "bnu-high-ds-v1-s4-110",
    topicId: "bnu-high-s4-对数运算与对数函数",
    type: "short-answer",
    difficulty: "Foundation",
    taskFamily: "log-operation",
    prompt: "已知a>0且a≠1，log_a(2)=m，log_a(3)=n，用m、n表示log_a(18)。",
    promptZh: "已知a>0且a≠1，log_a(2)=m，log_a(3)=n，用m、n表示log_a(18)。",
    promptEn: "Given a>0 and a≠1, log_a(2)=m and log_a(3)=n. Express log_a(18) in terms of m and n.",
    answer: "m+2n",
    accepted: ["m+2n", "2n+m"],
    explanation: "因为 \\(18=2×3²\\)，所以 \\(\\log_a(18)=\\log_a(2)+\\log_a(3²)=\\log_a(2)+2\\log_a(3)=m+2n\\)。",
    explanationZh: "因為 \\(18=2×3²\\)，所以 \\(\\log_a(18)=\\log_a(2)+\\log_a(3²)=\\log_a(2)+2\\log_a(3)=m+2n\\)。",
    explanationEn: "Since \\(18=2×3²\\), \\(\\log_a(18)=\\log_a(2)+\\log_a(3²)=\\log_a(2)+2\\log_a(3)=m+2n\\)."
  },
  {
    id: "bnu-high-ds-v1-s4-290",
    topicId: "bnu-high-s4-三角函数",
    type: "short-answer",
    difficulty: "Foundation",
    taskFamily: "amplitude-identification",
    prompt: "函数 y=3sin x 的振幅是多少？",
    promptZh: "函數 y=3sin x 的振幅是多少？",
    promptEn: "What is the amplitude of y=3sin x?",
    answer: "3",
    accepted: ["3"],
    explanation: "对 y=A sin(ωx)，振幅为|A|。本题A=3，所以振幅为|3|=3。",
    explanationZh: "對 y=A sin(ωx)，振幅為|A|。本題A=3，所以振幅為|3|=3。",
    explanationEn: "For y=A sin(ωx), the amplitude is |A|. Here A=3, so the amplitude is |3|=3."
  },
  {
    id: "bnu-high-ds-v1-s5-077",
    topicId: "bnu-high-s5-圆锥曲线",
    type: "short-answer",
    difficulty: "Core",
    taskFamily: "line-conic-discriminant",
    prompt: "判断直线y=2x+3与抛物线y=x²的公共点个数，并写出消元后方程的判别式。请按“公共点个数；判别式”作答。",
    promptZh: "判斷直線y=2x+3與拋物線y=x²的公共點個數，並寫出消元後方程的判別式。請按「公共點個數；判別式」作答。",
    promptEn: "Determine the number of intersection points between the line y=2x+3 and the parabola y=x², and state the discriminant of the equation obtained after elimination. Answer in the form “number of intersections; discriminant.”",
    answer: "2个；Δ=16",
    accepted: ["2个；Δ=16", "两个公共点；Δ=16", "兩個公共點；Δ=16", "Two intersection points; Δ=16", "2 intersection points; Δ=16"],
    explanation: "联立得x²=2x+3，即x²-2x-3=0。判别式Δ=(-2)²-4×1×(-3)=16>0，所以有两个公共点。",
    explanationZh: "聯立得x²=2x+3，即x²-2x-3=0。判別式Δ=(-2)²-4×1×(-3)=16>0，所以有兩個公共點。",
    explanationEn: "Combining the equations gives x²=2x+3, or x²-2x-3=0. Its discriminant is Δ=(-2)²-4×1×(-3)=16>0, so there are two intersection points."
  },
  {
    id: "bnu-high-ds-v1-s5-431",
    topicId: "bnu-high-s5-统计案例",
    type: "short-answer",
    difficulty: "Core",
    taskFamily: "independence-test",
    prompt: "在200名学生中，80人参加活动A，100人参加活动B，40人同时参加A和B。判断事件“参加A”和“参加B”是否独立，并写出概率依据。",
    promptZh: "在200名學生中，80人參加活動A，100人參加活動B，40人同時參加A和B。判斷事件“參加A”和“參加B”是否獨立，並寫出概率依據。",
    promptEn: "Among 200 students, 80 join Activity A, 100 join Activity B, and 40 join both. Determine whether the events “joins A” and “joins B” are independent, and justify your answer with probabilities.",
    answer: "独立；P(A∩B)=40/200=0.2=P(A)P(B)=(80/200)(100/200)",
    accepted: [
      "独立；P(A∩B)=40/200=0.2=P(A)P(B)=(80/200)(100/200)",
      "独立；P(A∩B)=0.2，P(A)P(B)=0.4×0.5=0.2",
      "Independent; P(A∩B)=0.2=P(A)P(B)=0.4×0.5",
      "Independent; P(A∩B)=40/200=0.2=P(A)P(B)=(80/200)(100/200)",
      "Independent; P(A∩B)=40/200=0.2=P(A)P(B)=(80/200)(100/200)=0.4×0.5=0.2"
    ],
    explanation: "P(A)=80/200=0.4，P(B)=100/200=0.5，P(A∩B)=40/200=0.2。因为P(A∩B)=P(A)P(B)=0.4×0.5=0.2，所以A与B独立。",
    explanationZh: "P(A)=80/200=0.4，P(B)=100/200=0.5，P(A∩B)=40/200=0.2。因為P(A∩B)=P(A)P(B)=0.4×0.5=0.2，所以A與B獨立。",
    explanationEn: "P(A)=80/200=0.4, P(B)=100/200=0.5, and P(A∩B)=40/200=0.2. Since P(A∩B)=P(A)P(B)=0.4×0.5=0.2, A and B are independent."
  }
];

const englishOnlyPrompts = [
  {
    id: "bnu-high-ds-v1-s4-432",
    source: "复数 z = (3+5i)+(2+4i)，求 z 的实部 = ____。",
    target: "For the complex number z = (3+5i)+(2+4i), complete: the real part of z = ____."
  },
  {
    id: "bnu-high-ds-v1-s4-468",
    source: "长方体的长、宽、高分别为 4，6，4，求体积 =",
    target: "A rectangular prism has length 4, width 6, and height 4. Complete: volume = ____."
  },
  {
    id: "bnu-high-ds-v1-s4-182",
    source: "一组数据为 7，10，13，求这组数据的极差 =",
    target: "For the data set 7, 10, 13, complete: range = ____."
  },
  {
    id: "bnu-high-ds-v1-s6-454",
    source: "函数 f(x) = 1x² + 3x + 2，求 f'(6) =",
    target: "For f(x) = 1x² + 3x + 2, complete: f'(6) = ____."
  }
] as const;

const packageRoot = new URL("../coordination/content-qa/mainland-bnu-high-generated-bank-v1-1500/", import.meta.url);
const manifest = JSON.parse(readFileSync(new URL("reviewed-approved-row-overrides.json", packageRoot), "utf8")) as {
  expectedOverrideCount: number;
  overrides: Array<{
    id: string;
    expectedTopicId: string;
    expectedType: string;
    expectedDifficulty: string;
    taskFamily: string;
    promptZhHans: string;
    optionsZhHans: string[];
    answer: string;
    acceptedAnswers: string[];
    explanationZhHans: string;
  }>;
};
const coordinationRows = (JSON.parse(readFileSync(new URL("question-pack.approved.json", packageRoot), "utf8")) as { questions: ArtifactQuestion[] }).questions;
const productionRows = (JSON.parse(readFileSync(new URL("../data/generated-content/mainland-bnu-high-generated-bank-v1-1500/question-pack.approved.json", import.meta.url), "utf8")) as { questions: ArtifactQuestion[] }).questions;
const jsonlRows = readFileSync(new URL("approved-questions.jsonl", packageRoot), "utf8").trim().split(/\n/u).map((line) => JSON.parse(line) as ArtifactQuestion);
const runtimeById = new Map(questions.map((question) => [question.id, question]));
const durableIds = new Set(durableContracts.map(({ id }) => id));

function sha256(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function gradingPayload(question: NonNullable<ReturnType<typeof runtimeById.get>>) {
  return {
    id: question.id,
    answer: question.answer,
    accepted_answers: question.acceptedAnswers ?? null,
    options: question.options ?? null,
    prompt: question.prompt
  };
}

test("BNU high English-review durable rows are generator-owned and preserve every non-target row", () => {
  assert.equal(manifest.expectedOverrideCount, 98);
  assert.equal(manifest.overrides.length, 98);
  assert.equal(new Set(manifest.overrides.map(({ id }) => id)).size, 98);
  assert.equal(
    sha256(manifest.overrides.filter(({ id }) => !durableIds.has(id))),
    "4ba3c615438d417576862a42ed2d84b9c32a5257c58408368743b633c3fef3c6"
  );

  const artifactCollections = [coordinationRows, productionRows, jsonlRows];
  artifactCollections.forEach((rows) => {
    assert.equal(rows.length, 1_500);
    assert.equal(new Set(rows.map(({ id }) => id)).size, 1_500);
    assert.equal(
      sha256(rows.filter(({ id }) => !durableIds.has(id))),
      "47d4647a7add29678c33c484282d3ae0c144d6a25dbd12044aa29478ab5f56ec"
    );
  });
  assert.deepEqual(productionRows, coordinationRows);
  assert.deepEqual(jsonlRows, coordinationRows);

  for (const contract of durableContracts) {
    const reviewed = manifest.overrides.find(({ id }) => id === contract.id);
    assert.ok(reviewed, `${contract.id} reviewed override`);
    assert.deepEqual(reviewed, {
      id: contract.id,
      expectedTopicId: contract.topicId,
      expectedType: contract.type,
      expectedDifficulty: contract.difficulty,
      taskFamily: contract.taskFamily,
      promptZhHans: contract.prompt,
      optionsZhHans: [],
      answer: contract.answer,
      acceptedAnswers: contract.accepted,
      explanationZhHans: contract.explanation
    });

    for (const rows of artifactCollections) {
      const artifact = rows.find(({ id }) => id === contract.id);
      assert.ok(artifact, `${contract.id} approved artifact row`);
      assert.equal(artifact.promptZhHans, `题组${contract.id.match(/s\d-(\d+)$/u)?.[1] ? contract.id.match(/(s\d-\d+)$/u)?.[1] : ""}：${contract.prompt}`);
      assert.equal(artifact.answer, contract.answer);
      assert.deepEqual(artifact.acceptedAnswers, contract.accepted);
      assert.equal(artifact.explanationZhHans, contract.explanation);
    }
  }
});

test("BNU high reviewed prompts and explanations are exact, validator-clean, and display-safe in three languages", () => {
  for (const contract of durableContracts) {
    assert.equal(chinaLessonEnglishTranslation(contract.prompt), contract.promptEn);
    assert.equal(chinaLessonTraditionalTranslation(contract.prompt), contract.promptZh);
    assert.equal(chinaLessonEnglishTranslation(contract.explanation), contract.explanationEn);
    assert.equal(chinaLessonTraditionalTranslation(contract.explanation), contract.explanationZh);
    validateRestoredTranslation({ id: `${contract.id}:prompt`, source: contract.prompt, contexts: ["prompt"] }, contract.promptEn);
    validateRestoredTranslation({ id: `${contract.id}:explanation`, source: contract.explanation, contexts: ["explanation"] }, contract.explanationEn);

    const runtime = runtimeById.get(contract.id);
    assert.ok(runtime, `${contract.id} runtime row`);
    assert.deepEqual(runtime.prompt, { en: contract.promptEn, zh: contract.promptZh, zhHans: contract.prompt });
    assert.deepEqual(runtime.explanation, { en: contract.explanationEn, zh: contract.explanationZh, zhHans: contract.explanation });
  }

  const logContract = durableContracts.find(({ id }) => id === "bnu-high-ds-v1-s4-110");
  assert.ok(logContract);
  assert.equal(normalizeMathTextForDisplay(logContract.promptEn), "Given a>0 and a≠1, \\(\\log_{a} (2)=m\\) and \\(\\log_{a} (3)=n\\). Express \\(\\log_{a} (18)\\) in terms of m and n.");
  assert.equal(normalizeMathTextForDisplay(logContract.explanationEn), logContract.explanationEn);

  for (const contract of englishOnlyPrompts) {
    assert.equal(chinaLessonEnglishTranslation(contract.source), contract.target);
    validateRestoredTranslation({ id: contract.id, source: contract.source, contexts: ["prompt"] }, contract.target);
    const runtime = runtimeById.get(contract.id);
    assert.ok(runtime, `${contract.id} runtime row`);
    assert.equal(runtime.prompt.en, contract.target);
  }
});

test("BNU high learner feedback is localized and grades its own complete answer without malformed aliases", () => {
  const contracts = [
    {
      id: "bnu-high-ds-v1-s4-146",
      expected: {
        en: "22",
        zh: "22元",
        zhHans: "22元"
      },
      accepted: ["22", "22元", "22 yuan"],
      rejected: ["21 yuan", "22 km"]
    },
    {
      id: "bnu-high-ds-v1-s4-254",
      expected: {
        en: "V(t)=120-6t，V(10)=60",
        zh: "V=120-6t；10小時後剩餘60立方米",
        zhHans: "V=120-6t；10小时后剩余60立方米"
      },
      accepted: [
        "V(t)=120-6t; V(10)=60 cubic meters",
        "V(t)=120-6t; V(10)=60 cubic metres"
      ],
      rejected: ["V(t)=120-6t", "V(10)=60 cubic meters", "V(t)=120-6t; V(10)=61 cubic meters"]
    },
    {
      id: "bnu-high-ds-v1-s5-149",
      expected: {
        en: "The vectors are linearly dependent; c=a+b",
        zh: "線性相關；c=a+b",
        zhHans: "线性相关；c=a+b"
      },
      accepted: ["The vectors are linearly dependent; c=a+b"],
      rejected: ["线性相关", "c=a+b"]
    },
    {
      id: "bnu-high-ds-v1-s5-077",
      expected: {
        en: "2 intersection points; Δ=16",
        zh: "2個；Δ=16",
        zhHans: "2个；Δ=16"
      },
      accepted: ["2 intersection points; Δ=16", "Two intersection points; Δ=16"],
      rejected: ["2items; Δ = 16", "2 intersection points", "Δ=16"]
    },
    {
      id: "bnu-high-ds-v1-s5-431",
      expected: {
        en: "Independent; P(A∩B)=40/200=0.2=P(A)P(B)=(80/200)(100/200)",
        zh: "獨立；P(A∩B)=40/200=0.2=P(A)P(B)=(80/200)(100/200)",
        zhHans: "独立；P(A∩B)=40/200=0.2=P(A)P(B)=(80/200)(100/200)"
      },
      accepted: [
        "Independent; P(A∩B)=40/200=0.2=P(A)P(B)=(80/200)(100/200)",
        "Independent; P(A∩B)=40/200=0.2=P(A)P(B)=(80/200)(100/200)=0.4×0.5=0.2"
      ],
      rejected: ["Independent", "P(A∩B)=0.2"]
    }
  ] as const;

  for (const contract of contracts) {
    const runtime = runtimeById.get(contract.id);
    assert.ok(runtime, `${contract.id} runtime row`);
    const feedback = gradeSeedQuestionAttempt(contract.id, "definitely wrong");
    assert.equal(feedback?.correct, false);
    assert.deepEqual(feedback?.correctAnswer, contract.expected);

    const payload = gradingPayload(runtime);
    for (const answer of Object.values(contract.expected)) {
      assert.equal(questionAnswerMatches(payload, answer), true, `${contract.id} feedback self-matches: ${answer}`);
    }
    for (const answer of contract.accepted) {
      assert.equal(questionAnswerMatches(payload, answer), true, `${contract.id} accepts ${answer}`);
    }
    for (const answer of contract.rejected) {
      assert.equal(questionAnswerMatches(payload, answer), false, `${contract.id} rejects ${answer}`);
    }
  }
});

test("BNU junior linear-systems worked example has one natural first-step question", () => {
  const lesson = productionLessonSeeds.find(({ topicId }) => topicId === "bnu-junior-s2-upper-linear-systems");
  assert.ok(lesson, "BNU junior linear-systems lesson");
  const worked = lesson.blocks.find(({ idSuffix }) => idSuffix === "lesson-1-worked-example");
  assert.ok(worked?.content, "BNU junior linear-systems worked-example content");
  assert.ok(worked.content.zhHans, "BNU junior linear-systems worked-example simplified Chinese content");
  const english = worked.content.en;
  assert.doesNotMatch(english, /\bthe the first step\b/iu);
  assert.equal(english.match(/What is the first step/gu)?.length, 1);
  validateRestoredTranslation({
    id: "bnu-junior-s2-upper-linear-systems:worked-example",
    source: worked.content.zhHans,
    contexts: ["lesson.blocks[1].content"]
  }, english);
});
