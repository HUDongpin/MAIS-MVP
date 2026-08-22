import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { mainlandBnuHighQuestions } from "../data/mainlandBnuHighQuestions";
import { questionAnswerMatches } from "./server/answerGrading";

const questionById = new Map(mainlandBnuHighQuestions.map((question) => [question.id, question]));

function reviewedQuestion(questionId: string) {
  const question = questionById.get(questionId);
  assert.ok(question, `${questionId} should exist in the BNU high runtime bank`);
  return question;
}

function gradingPayload(question: (typeof mainlandBnuHighQuestions)[number]) {
  return {
    answer: question.answer,
    accepted_answers: question.acceptedAnswers ?? null,
    options: question.options ?? null,
    prompt: question.prompt
  };
}

test("BNU high generator preserves every reviewed approved-row override and reproduces all live artifacts", () => {
  const packageRoot = "coordination/content-qa/mainland-bnu-high-generated-bank-v1-1500";
  const manifestPath = `${packageRoot}/reviewed-approved-row-overrides.json`;
  assert.ok(existsSync(manifestPath), "reviewed approved-row overrides must be a durable generator input");

  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
    version: number;
    expectedOverrideCount: number;
    overrides: Array<{ id: string }>;
  };
  const expectedIds = [
    "bnu-high-ds-v1-s4-001", "bnu-high-ds-v1-s4-002",
    "bnu-high-ds-v1-s4-005", "bnu-high-ds-v1-s4-006",
    "bnu-high-ds-v1-s4-037", "bnu-high-ds-v1-s4-038",
    "bnu-high-ds-v1-s4-041", "bnu-high-ds-v1-s4-042",
    "bnu-high-ds-v1-s4-073", "bnu-high-ds-v1-s4-074",
    "bnu-high-ds-v1-s4-077", "bnu-high-ds-v1-s4-078",
    "bnu-high-ds-v1-s4-109", "bnu-high-ds-v1-s4-110",
    "bnu-high-ds-v1-s4-113", "bnu-high-ds-v1-s4-114",
    "bnu-high-ds-v1-s4-145", "bnu-high-ds-v1-s4-146", "bnu-high-ds-v1-s4-148", "bnu-high-ds-v1-s4-149",
    "bnu-high-ds-v1-s4-181", "bnu-high-ds-v1-s4-187",
    "bnu-high-ds-v1-s4-184", "bnu-high-ds-v1-s4-185",
    "bnu-high-ds-v1-s4-217", "bnu-high-ds-v1-s4-218",
    "bnu-high-ds-v1-s4-220", "bnu-high-ds-v1-s4-221",
    "bnu-high-ds-v1-s4-253", "bnu-high-ds-v1-s4-254", "bnu-high-ds-v1-s4-256", "bnu-high-ds-v1-s4-257",
    "bnu-high-ds-v1-s4-292", "bnu-high-ds-v1-s4-293",
    "bnu-high-ds-v1-s4-361", "bnu-high-ds-v1-s4-362", "bnu-high-ds-v1-s4-363", "bnu-high-ds-v1-s4-364",
    "bnu-high-ds-v1-s4-399", "bnu-high-ds-v1-s4-401",
    "bnu-high-ds-v1-s4-431", "bnu-high-ds-v1-s4-433",
    "bnu-high-ds-v1-s4-434", "bnu-high-ds-v1-s4-435",
    "bnu-high-ds-v1-s4-466", "bnu-high-ds-v1-s4-467",
    "bnu-high-ds-v1-s4-469", "bnu-high-ds-v1-s4-470",
    "bnu-high-ds-v1-s4-326", "bnu-high-ds-v1-s4-328",
    "bnu-high-ds-v1-s4-327", "bnu-high-ds-v1-s4-329",
    "bnu-high-ds-v1-s4-289", "bnu-high-ds-v1-s4-290", "bnu-high-ds-v1-s4-295",
    "bnu-high-ds-v1-s4-397", "bnu-high-ds-v1-s4-398",
    "bnu-high-ds-v1-s5-003", "bnu-high-ds-v1-s5-005", "bnu-high-ds-v1-s5-007",
    "bnu-high-ds-v1-s5-009", "bnu-high-ds-v1-s5-145", "bnu-high-ds-v1-s5-147", "bnu-high-ds-v1-s5-149", "bnu-high-ds-v1-s5-151",
    "bnu-high-ds-v1-s5-073", "bnu-high-ds-v1-s5-075", "bnu-high-ds-v1-s5-077", "bnu-high-ds-v1-s5-079",
    "bnu-high-ds-v1-s5-218", "bnu-high-ds-v1-s5-219", "bnu-high-ds-v1-s5-221", "bnu-high-ds-v1-s5-222",
    "bnu-high-ds-v1-s5-288", "bnu-high-ds-v1-s5-291", "bnu-high-ds-v1-s5-293", "bnu-high-ds-v1-s5-294",
    "bnu-high-ds-v1-s5-359", "bnu-high-ds-v1-s5-361",
    "bnu-high-ds-v1-s5-362", "bnu-high-ds-v1-s5-363",
    "bnu-high-ds-v1-s5-433", "bnu-high-ds-v1-s5-434",
    "bnu-high-ds-v1-s5-430", "bnu-high-ds-v1-s5-431",
    "bnu-high-ds-v1-s6-002", "bnu-high-ds-v1-s6-004", "bnu-high-ds-v1-s6-006", "bnu-high-ds-v1-s6-008",
    "bnu-high-ds-v1-s6-226", "bnu-high-ds-v1-s6-227", "bnu-high-ds-v1-s6-228", "bnu-high-ds-v1-s6-229",
    "bnu-high-ds-v1-s6-451", "bnu-high-ds-v1-s6-452"
    , "bnu-high-ds-v1-s6-453", "bnu-high-ds-v1-s6-455", "bnu-high-ds-v1-s6-456"
  ].sort();
  assert.equal(manifest.version, 1);
  assert.equal(manifest.expectedOverrideCount, 98);
  assert.deepEqual(manifest.overrides.map(({ id }) => id).sort(), expectedIds);

  const result = spawnSync(process.execPath, [`${packageRoot}/build-approved-pack.mjs`, "--check-approved-parity"], {
    cwd: process.cwd(),
    encoding: "utf8",
    timeout: 30_000,
    env: {
      ...process.env,
      TMPDIR: "/Volumes/Starship/MAIS-MVP/.tmp/china-math-narrow-20260819/runtime/tmp"
    }
  });
  assert.equal(
    result.status,
    0,
    `generator parity failed\nerror=${result.error?.message ?? ""}\nstdout=${result.stdout}\nstderr=${result.stderr}`
  );
  const report = JSON.parse(result.stdout) as {
    artifactRows: number;
    familyRows: number;
    generatedRows: number;
    reviewedOverrideRows: number;
  };
  assert.deepEqual(report, { artifactRows: 1_500, familyRows: 1_500, generatedRows: 1_500, reviewedOverrideRows: 98 });
});

test("Mainland BNU high reviewed seven-row comparison matrix and all 1500 stored answers grade", () => {
  const reviewedRows = [
    ["bnu-high-ds-v1-s4-074", "4", "x=4"],
    ["bnu-high-ds-v1-s4-254", "V(t)=120-6t，V(10)=60", "V=120-6t；10小时后剩余60立方米"],
    ["bnu-high-ds-v1-s5-434", "25", "25个百分点"],
    ["bnu-high-ds-v1-s6-227", "(-∞,-1)∪(1,+∞)；(-1,1)", "(-∞,-1)和(1,+∞)；(-1,1)"],
    ["bnu-high-ds-v1-s4-217", "2/3", "2/3"],
    ["bnu-high-ds-v1-s5-161", "11", "11"],
    ["bnu-high-ds-v1-s5-218", "y=2x，y(7)=14", "y=2x, y(7)=14"]
  ] as const;

  assert.equal(mainlandBnuHighQuestions.length, 1500);
  assert.equal(new Set(mainlandBnuHighQuestions.map((question) => question.id)).size, 1500);
  assert.equal(reviewedRows.length, 7);

  reviewedRows.forEach(([questionId, expectedCanonical, reviewedSubmission]) => {
    const question = reviewedQuestion(questionId);
    assert.equal(question.answer, expectedCanonical, `${questionId} should retain its reviewed canonical answer`);
    assert.equal(
      questionAnswerMatches(gradingPayload(question), reviewedSubmission),
      true,
      `${questionId} should accept its reviewed comparison submission`
    );
  });

  let acceptedAliasChecks = 0;
  mainlandBnuHighQuestions.forEach((question) => {
    const payload = gradingPayload(question);
    assert.equal(questionAnswerMatches(payload, question.answer), true, `${question.id} canonical answer should grade itself`);
    question.acceptedAnswers?.forEach((acceptedAnswer) => {
      acceptedAliasChecks += 1;
      assert.equal(
        questionAnswerMatches(payload, acceptedAnswer),
        true,
        `${question.id} should grade stored alias ${acceptedAnswer}`
      );
    });
  });
  assert.ok(acceptedAliasChecks >= 1500, "the full runtime bank should exercise every stored alias contract");
});

test("BNU high s4-074 accepts the exact x binding without accepting another variable", () => {
  const question = reviewedQuestion("bnu-high-ds-v1-s4-074");
  const payload = gradingPayload(question);

  assert.equal(question.answer, "4");
  assert.ok(question.acceptedAnswers?.includes("x=4"));
  assert.equal(questionAnswerMatches(payload, "4"), true);
  assert.equal(questionAnswerMatches(payload, "x=4"), true);
  assert.equal(questionAnswerMatches(payload, "y=4"), false);
  assert.equal(questionAnswerMatches(payload, "wrong=4"), false);
  assert.equal(questionAnswerMatches(payload, "x=5"), false);
});

test("BNU high s4-254 accepts complete natural model-and-prediction answers but rejects partial results", () => {
  const question = reviewedQuestion("bnu-high-ds-v1-s4-254");
  const payload = gradingPayload(question);
  const completeAnswers = [
    "V(t)=120-6t，V(10)=60",
    "V=120-6t；10小时后剩余60立方米",
    "V(t)=120-6t；排水10小时后剩余60立方米",
    "V=120-6t；10小時後剩餘60立方米",
    "V=120-6t; after 10 hours, 60 m³ remains",
    "V(t)=120-6t; after 10 hours, V(10)=60 m³"
  ];

  completeAnswers.forEach((answer) => {
    assert.ok(question.acceptedAnswers?.includes(answer));
    assert.equal(questionAnswerMatches(payload, answer), true, `complete model answer should grade: ${answer}`);
  });
  ["60", "60立方米", "V=120-6t", "V(10)=60"].forEach((partialAnswer) => {
    assert.equal(questionAnswerMatches(payload, partialAnswer), false, `partial answer must be rejected: ${partialAnswer}`);
  });
});

test("BNU high s5-434 distinguishes percentage points from percentages", () => {
  const question = reviewedQuestion("bnu-high-ds-v1-s5-434");
  const payload = gradingPayload(question);

  assert.equal(question.answer, "25");
  ["25", "25个百分点", "25個百分點", "25 percentage points"].forEach((answer) => {
    assert.equal(questionAnswerMatches(payload, answer), true, `${answer} should express the reviewed 25-point gap`);
  });
  ["25%", "0.25", "25 percent", "25个"].forEach((wrongUnitAnswer) => {
    assert.equal(questionAnswerMatches(payload, wrongUnitAnswer), false, `${wrongUnitAnswer} is not 25 percentage points`);
  });
});

test("BNU high s6-227 accepts equivalent complete interval notation and rejects either slot alone", () => {
  const question = reviewedQuestion("bnu-high-ds-v1-s6-227");
  const payload = gradingPayload(question);

  [
    "(-∞,-1)∪(1,+∞)；(-1,1)",
    "(-∞,-1)和(1,+∞)；(-1,1)",
    "(-∞,-1) and (1,+∞); (-1,1)"
  ].forEach((answer) => {
    assert.equal(questionAnswerMatches(payload, answer), true, `complete interval answer should grade: ${answer}`);
  });
  ["(-∞,-1)∪(1,+∞)", "(-∞,-1)和(1,+∞)", "(-1,1)"].forEach((partialAnswer) => {
    assert.equal(questionAnswerMatches(payload, partialAnswer), false, `one interval slot must not grade: ${partialAnswer}`);
  });
});

test("BNU high protected answers remain mathematically and structurally unchanged", () => {
  const probability = reviewedQuestion("bnu-high-ds-v1-s4-217");
  assert.equal(probability.answer, "2/3");
  const optionHits = (probability.options ?? []).filter((option) =>
    questionAnswerMatches(gradingPayload(probability), option.zhHans ?? option.zh)
  );
  assert.equal(optionHits.length, 1);
  assert.equal(optionHits[0]?.zhHans ?? optionHits[0]?.zh, "2/3");

  const dotProduct = reviewedQuestion("bnu-high-ds-v1-s5-161");
  assert.equal(dotProduct.answer, "11");
  assert.match(dotProduct.explanation.zhHans ?? dotProduct.explanation.zh, /a·b=11/);
  assert.equal(questionAnswerMatches(gradingPayload(dotProduct), "14"), false);

  const linearModel = reviewedQuestion("bnu-high-ds-v1-s5-218");
  assert.equal(linearModel.answer, "y=2x，y(7)=14");
  assert.equal(questionAnswerMatches(gradingPayload(linearModel), "14"), false);
  assert.equal(questionAnswerMatches(gradingPayload(linearModel), "y=2x"), false);
});

test("BNU high s4-110 already has one coherent logarithm target and derivation", () => {
  const question = reviewedQuestion("bnu-high-ds-v1-s4-110");
  const visiblePrompt = `${question.prompt.en}\n${question.prompt.zh}\n${question.prompt.zhHans ?? ""}`;
  const visibleExplanation = `${question.explanation.en}\n${question.explanation.zh}\n${question.explanation.zhHans ?? ""}`;

  assert.match(visiblePrompt, /log_a\(18\)/);
  assert.doesNotMatch(visiblePrompt, /log_\{a1\}8|log_a1\s+8/);
  assert.equal(question.answer, "m+2n");
  assert.equal(questionAnswerMatches(gradingPayload(question), "m+2n"), true);
  assert.equal(questionAnswerMatches(gradingPayload(question), "2n+m"), true);
  assert.match(visibleExplanation, /18=2×3²/);
  assert.match(visibleExplanation, /log_a\(18\)=.*m\+2n/);
});

test("BNU high line-and-circle checkpoint covers a vertical line, a circle equation, and line-circle position", () => {
  const contracts = [
    {
      id: "bnu-high-ds-v1-s5-003",
      type: "fill-in",
      artifactPrompt: "题组s5-003：直线 l 经过点 A(3, -2) 和 B(3, 5)。判断其斜率是否存在，并写出直线 l 的方程。请按“斜率；方程”的格式作答：____。",
      runtimePrompt: "直线 l 经过点 A(3, -2) 和 B(3, 5)。判断其斜率是否存在，并写出直线 l 的方程。请按“斜率；方程”的格式作答：____。",
      options: [],
      answer: "斜率不存在；x=3",
      accepted: [
        "斜率不存在；x=3",
        "斜率不存在，直线方程为x=3",
        "斜率不存在，直線方程為x=3",
        "The slope is undefined; x=3",
        "undefined; x=3",
        "slope undefined; x=3"
      ],
      rejected: ["斜率不存在", "x=3", "3", "y=3", "斜率为0；x=3"],
      explanation: "两点的横坐标相同，所以 l 是竖直直线，斜率不存在；直线上每一点都满足 x=3。"
    },
    {
      id: "bnu-high-ds-v1-s5-005",
      type: "short-answer",
      artifactPrompt: "题组s5-005：判断直线 l: 3x+4y-12=0 与圆 C: x²+y²=4 的位置关系。",
      runtimePrompt: "判断直线 l: 3x+4y-12=0 与圆 C: x²+y²=4 的位置关系。",
      options: [],
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
      rejected: ["相交", "相切", "12/5", "2.4", "same distance"],
      explanation: "圆 C 的圆心为 O(0,0)，半径为 2。圆心到直线 l 的距离 d=|-12|/√(3²+4²)=12/5>2，所以直线与圆没有公共点，二者相离。"
    },
    {
      id: "bnu-high-ds-v1-s5-007",
      type: "multiple-choice",
      artifactPrompt: "题组s5-007：圆 C 的圆心为 (2, -1)，半径为 3。圆 C 的标准方程是（ ）。",
      runtimePrompt: "圆 C 的圆心为 (2, -1)，半径为 3。圆 C 的标准方程是（ ）。",
      options: [
        "(x+2)²+(y-1)²=9",
        "(x-2)²+(y+1)²=9",
        "(x-2)²+(y+1)²=3",
        "(x+2)²+(y-1)²=3"
      ],
      answer: "(x-2)²+(y+1)²=9",
      accepted: [
        "(x-2)²+(y+1)²=9",
        "(x-2)^2+(y+1)^2=9",
        "B",
        "B. (x-2)²+(y+1)²=9"
      ],
      rejected: ["(x+2)²+(y-1)²=9", "(x-2)²+(y+1)²=3", "(x+2)²+(y-1)²=3", "9"],
      explanation: "圆的标准方程为 (x-a)²+(y-b)²=r²。代入圆心 (2,-1) 和半径 3，得 (x-2)²+(y+1)²=9，所以选 B。"
    }
  ] as const;

  const coordinationPack = JSON.parse(readFileSync(
    "coordination/content-qa/mainland-bnu-high-generated-bank-v1-1500/question-pack.approved.json",
    "utf8"
  )) as { questions: Array<{ id: string; type: string; promptZhHans: string; optionsZhHans: string[]; answer: string; acceptedAnswers: string[]; explanationZhHans: string }> };
  const productionPack = JSON.parse(readFileSync(
    "data/generated-content/mainland-bnu-high-generated-bank-v1-1500/question-pack.approved.json",
    "utf8"
  )) as typeof coordinationPack;
  const coordinationById = new Map(coordinationPack.questions.map((question) => [question.id, question]));
  const productionById = new Map(productionPack.questions.map((question) => [question.id, question]));

  for (const contract of contracts) {
    const runtime = reviewedQuestion(contract.id);
    assert.equal(runtime.type, contract.type);
    assert.equal(runtime.prompt.zhHans, contract.runtimePrompt);
    assert.deepEqual((runtime.options ?? []).map((option) => option.zhHans), contract.options);
    assert.equal(runtime.answer, contract.answer);
    assert.equal(runtime.explanation.zhHans, contract.explanation);
    for (const accepted of contract.accepted) {
      assert.equal(questionAnswerMatches(gradingPayload(runtime), accepted), true, `${contract.id} accepts ${accepted}`);
    }
    for (const rejected of contract.rejected) {
      assert.equal(questionAnswerMatches(gradingPayload(runtime), rejected), false, `${contract.id} rejects ${rejected}`);
    }
    for (const artifact of [coordinationById.get(contract.id), productionById.get(contract.id)]) {
      assert.ok(artifact, `${contract.id} approved artifact exists`);
      assert.equal(artifact.type, contract.type);
      assert.equal(artifact.promptZhHans, contract.artifactPrompt);
      assert.deepEqual(artifact.optionsZhHans, contract.options);
      assert.equal(artifact.answer, contract.answer);
      assert.deepEqual(artifact.acceptedAnswers, contract.accepted);
      assert.equal(artifact.explanationZhHans, contract.explanation);
    }
  }

  const vertical = reviewedQuestion("bnu-high-ds-v1-s5-003");
  const verticalCoordinates = (vertical.prompt.zhHans ?? vertical.prompt.zh)
    .match(/A\((-?\d+),\s*(-?\d+)\).*B\((-?\d+),\s*(-?\d+)\)/u);
  assert.ok(verticalCoordinates, "the vertical-line prompt exposes both points");
  assert.equal(verticalCoordinates[1], verticalCoordinates[3], "equal x-coordinates make the line vertical");
  assert.notEqual(verticalCoordinates[2], verticalCoordinates[4], "the two points remain distinct");
  const disjoint = reviewedQuestion("bnu-high-ds-v1-s5-005");
  assert.ok(12 / Math.hypot(3, 4) > Math.sqrt(4), "center-line distance exceeds the radius");
  assert.equal(questionAnswerMatches(gradingPayload(disjoint), "相离"), true);
  const circle = reviewedQuestion("bnu-high-ds-v1-s5-007");
  assert.deepEqual((circle.options ?? []).map((option) =>
    questionAnswerMatches(gradingPayload(circle), option.zhHans ?? option.zh)
  ), [false, true, false, false]);

  const generator = readFileSync(
    "coordination/content-qa/mainland-bnu-high-generated-bank-v1-1500/build-approved-pack.mjs",
    "utf8"
  );
  assert.match(generator, /reviewedApprovedRowOverridesById/u);
  const reviewedManifest = JSON.parse(readFileSync(
    "coordination/content-qa/mainland-bnu-high-generated-bank-v1-1500/reviewed-approved-row-overrides.json",
    "utf8"
  )) as { overrides: Array<{ id: string }> };
  const reviewedIds = new Set(reviewedManifest.overrides.map(({ id }) => id));
  for (const contract of contracts) assert.ok(reviewedIds.has(contract.id));
});

test("BNU high line slopes use parenthesized negative subtrahends across generator, approved artifacts, and runtime", () => {
  const lineQuestions = mainlandBnuHighQuestions.filter((question) =>
    /^直线经过点 A\(/u.test(question.prompt.zhHans ?? question.prompt.zh)
  );
  assert.equal(lineQuestions.length, 68);

  const expectedNegativeSubtrahendIds = [
    "bnu-high-ds-v1-s5-001", "bnu-high-ds-v1-s5-002",
    "bnu-high-ds-v1-s5-008", "bnu-high-ds-v1-s5-014",
    "bnu-high-ds-v1-s5-015", "bnu-high-ds-v1-s5-016", "bnu-high-ds-v1-s5-021",
    "bnu-high-ds-v1-s5-022", "bnu-high-ds-v1-s5-023", "bnu-high-ds-v1-s5-028",
    "bnu-high-ds-v1-s5-029", "bnu-high-ds-v1-s5-030", "bnu-high-ds-v1-s5-035",
    "bnu-high-ds-v1-s5-036", "bnu-high-ds-v1-s5-037", "bnu-high-ds-v1-s5-042",
    "bnu-high-ds-v1-s5-043", "bnu-high-ds-v1-s5-044", "bnu-high-ds-v1-s5-049",
    "bnu-high-ds-v1-s5-050", "bnu-high-ds-v1-s5-051", "bnu-high-ds-v1-s5-056",
    "bnu-high-ds-v1-s5-057", "bnu-high-ds-v1-s5-058", "bnu-high-ds-v1-s5-063",
    "bnu-high-ds-v1-s5-064", "bnu-high-ds-v1-s5-065", "bnu-high-ds-v1-s5-070",
    "bnu-high-ds-v1-s5-071", "bnu-high-ds-v1-s5-072"
  ];
  const actualNegativeSubtrahendIds: string[] = [];

  lineQuestions.forEach((question) => {
    const promptZhHans = question.prompt.zhHans ?? question.prompt.zh;
    const coordinates = promptZhHans.match(/A\((-?\d+),\s*(-?\d+)\).*B\((-?\d+),\s*(-?\d+)\)/u);
    assert.ok(coordinates, `${question.id} should expose both ordered pairs`);
    const [, rawX1, rawY1, rawX2, rawY2] = coordinates;
    const [x1, y1, x2, y2] = [rawX1, rawY1, rawX2, rawY2].map(Number);
    const expectedSlope = (y2 - y1) / (x2 - x1);
    assert.equal(Number(question.answer), expectedSlope, `${question.id} slope should be independently recomputable`);

    const rise = `${y2}-${y1 < 0 ? `(${y1})` : y1}`;
    const run = `${x2}-${x1 < 0 ? `(${x1})` : x1}`;
    const expectedExplanation = `斜率 k=(${rise})÷(${run})=${expectedSlope}。`;
    const explanationZhHans = question.explanation.zhHans ?? question.explanation.zh;
    assert.equal(explanationZhHans, expectedExplanation, `${question.id} should display an unambiguous slope quotient`);
    assert.doesNotMatch(explanationZhHans, /\d--\d/u, `${question.id} must not display a double minus`);
    if (y1 < 0) actualNegativeSubtrahendIds.push(question.id);
  });
  assert.deepEqual(actualNegativeSubtrahendIds, expectedNegativeSubtrahendIds);

  const coordinationPack = JSON.parse(readFileSync(
    "coordination/content-qa/mainland-bnu-high-generated-bank-v1-1500/question-pack.approved.json",
    "utf8"
  )) as { questions: Array<{ id: string; explanationZhHans: string }> };
  const productionPack = JSON.parse(readFileSync(
    "data/generated-content/mainland-bnu-high-generated-bank-v1-1500/question-pack.approved.json",
    "utf8"
  )) as { questions: Array<{ id: string; explanationZhHans: string }> };
  const coordinationById = new Map(coordinationPack.questions.map((question) => [question.id, question]));
  const productionById = new Map(productionPack.questions.map((question) => [question.id, question]));
  lineQuestions.forEach((question) => {
    const expected = question.explanation.zhHans ?? question.explanation.zh;
    assert.equal(coordinationById.get(question.id)?.explanationZhHans, expected);
    assert.equal(productionById.get(question.id)?.explanationZhHans, expected);
  });

  const generator = readFileSync(
    "coordination/content-qa/mainland-bnu-high-generated-bank-v1-1500/build-approved-pack.mjs",
    "utf8"
  );
  assert.match(generator, /y1 < 0 \? `\(\$\{y1\}\)` : y1/u);
  assert.match(generator, /x1 < 0 \? `\(\$\{x1\}\)` : x1/u);
});
