import assert from "node:assert/strict";
import test from "node:test";

import { productionLessonByTopicId } from "../data/lessons";
import { activeHongKongQuestionIdByHistoricalId, questions } from "../data/questions";
import { topics } from "../data/topics";
import { selectLessonPracticeQuestions } from "./practiceQuestionDeduping";

const FINAL_HK_TOPIC_GRADES = {
  "p1-counting-number-bonds": "P1",
  "p1-addition-subtraction": "P1",
  "p1-shapes-patterns": "P1",
  "p1-measurement-time": "P1",
  "p2-place-value": "P2",
  "p2-multiplication-foundations": "P2",
  "p2-money-time": "P2",
  "p2-length-data": "P2",
  "p3-multiplication-division": "P3",
  "p3-fractions-intro": "P3",
  "p3-measurement": "P3",
  "p3-geometry-patterns": "P3",
  "p4-large-numbers": "P4",
  "p4-decimals": "P4",
  "p4-angles": "P4",
  "p4-perimeter-area": "P4",
  "p5-fractions-operations": "P5",
  "p5-volume": "P5",
  "p5-rates": "P5",
  "p5-charts-averages": "P5",
  "p6-percentages": "P6",
  "p6-ratio-proportion": "P6",
  "p6-speed": "P6",
  "p6-pre-secondary-problem-solving": "P6",
  integers: "S1",
  "algebra-basics": "S1",
  angles: "S1",
  ratios: "S1",
  "statistics-s1": "S1",
  "linear-equations": "S2",
  coordinates: "S2",
  transformations: "S2",
  "probability-s2": "S2",
  polynomials: "S3",
  "identities-square-patterns": "S3",
  "trigonometry-basics": "S3",
  "arc-length-sector-area": "S3",
  functions: "S4",
  "quadratic-patterns": "S4",
  "coordinate-geometry": "S4",
  circles: "S4",
  "more-algebra": "S4",
  "data-handling": "S4",
  "advanced-functions": "S5",
  "trigonometry-s5": "S5",
  "probability-s5": "S5",
  "differentiation-intro": "S5",
  calculus: "S6",
  "statistics-s6": "S6",
  "exam-revision": "S6",
  "mixed-problem-solving": "S6"
} as const;

type FinalHkTopicId = keyof typeof FINAL_HK_TOPIC_GRADES;

const FORBIDDEN_TEMPLATE_DISTRACTORS = [
  "Guess from appearance only",
  "Use the longest formula first",
  "Ignore labels and units",
  "Skip the diagram or table",
  "Round before every step",
  "Change notation without checking meaning",
  "只憑外觀猜測",
  "先使用最長公式",
  "忽略標籤和單位",
  "跳過圖形或表格",
  "每一步都先四捨五入",
  "未檢查意思就改變記號"
] as const;

function lessonText(topicId: FinalHkTopicId) {
  const lesson = productionLessonByTopicId.get(topicId);
  assert.ok(lesson, `${topicId}: missing production lesson`);

  return [
    lesson.title.en,
    lesson.title.zh,
    lesson.description.en,
    lesson.description.zh,
    ...lesson.blocks.flatMap((block) => [
      block.title.en,
      block.title.zh,
      block.content?.en ?? "",
      block.content?.zh ?? "",
      ...(block.items?.flatMap((item) => [item.en, item.zh]) ?? [])
    ])
  ].join(" ");
}

function visualizationText(topicId: FinalHkTopicId) {
  const lesson = productionLessonByTopicId.get(topicId);
  assert.ok(lesson, `${topicId}: missing production lesson`);
  const visualization = lesson.blocks.find((block) => block.type === "visualization");
  assert.ok(visualization, `${topicId}: missing visualization block`);

  return [
    visualization.title.en,
    visualization.title.zh,
    visualization.content?.en ?? "",
    visualization.content?.zh ?? "",
    ...(visualization.items?.flatMap((item) => [item.en, item.zh]) ?? [])
  ].join(" ");
}

function lessonBlock(
  topicId: FinalHkTopicId,
  blockType: "concept" | "worked-example" | "visualization" | "extension" | "checklist"
) {
  const lesson = productionLessonByTopicId.get(topicId);
  assert.ok(lesson, `${topicId}: missing production lesson`);
  const block = lesson.blocks.find((candidate) => candidate.type === blockType);
  assert.ok(block, `${topicId}: missing ${blockType} block`);
  return block;
}

function selectedLessonQuestions(topicId: FinalHkTopicId) {
  const lesson = productionLessonByTopicId.get(topicId);
  assert.ok(lesson, `${topicId}: missing production lesson`);
  const topicQuestions = questions.filter(
    (question) => question.curriculumTrack === "HK" && question.topicId === topicId
  );

  const lessonQuestions = !lesson.practiceQuestionIds?.length ? topicQuestions : lesson.practiceQuestionIds.map((questionId) => {
    const question = questions.find((candidate) => candidate.id === questionId);
    assert.ok(question, `${topicId}: missing linked question ${questionId}`);
    return question;
  });

  return selectLessonPracticeQuestions(lessonQuestions);
}

function displayedQuestionText(topicId: FinalHkTopicId) {
  return selectedLessonQuestions(topicId).map((question) => [
    question.prompt.en,
    question.prompt.zh,
    question.answer,
    question.explanation.en,
    question.explanation.zh,
    ...(question.options?.flatMap((option) => [option.en, option.zh]) ?? [])
  ].join(" ")).join(" ");
}

function activeQuestion(historicalOrCurrentId: string) {
  const activeId = activeHongKongQuestionIdByHistoricalId.get(historicalOrCurrentId) ?? historicalOrCurrentId;
  const question = questions.find((candidate) => candidate.id === activeId);
  assert.ok(question, `${historicalOrCurrentId}: missing active question ${activeId}`);
  return question;
}

test("HK final curriculum exposes the exact 51-topic grade routing", () => {
  const actual = topics
    .filter((topic) => topic.curriculumTrack === "HK")
    .map((topic) => [topic.id, topic.grade] as const);

  assert.equal(actual.length, 51);
  assert.deepEqual(Object.fromEntries(actual), FINAL_HK_TOPIC_GRADES);
  assert.deepEqual(
    Object.fromEntries(
      Object.values(FINAL_HK_TOPIC_GRADES).reduce((counts, grade) => {
        counts.set(grade, (counts.get(grade) ?? 0) + 1);
        return counts;
      }, new Map<string, number>())
    ),
    { P1: 4, P2: 4, P3: 4, P4: 4, P5: 4, P6: 4, S1: 5, S2: 4, S3: 4, S4: 6, S5: 4, S6: 4 }
  );
});

test("all 51 HK lessons expose one complete bilingual lesson and their exact lab route", () => {
  for (const topicId of Object.keys(FINAL_HK_TOPIC_GRADES) as FinalHkTopicId[]) {
    const lesson = productionLessonByTopicId.get(topicId);
    assert.ok(lesson, `${topicId}: missing production lesson`);
    assert.equal(lesson.productionReady, true, `${topicId}: lesson is not production ready`);

    const blockTypes = lesson.blocks.map((block) => block.type);
    for (const requiredType of ["concept", "worked-example", "visualization", "extension", "checklist"] as const) {
      assert.equal(blockTypes.filter((type) => type === requiredType).length, 1, `${topicId}: expected one ${requiredType} block`);
    }

    const visualization = lesson.blocks.find((block) => block.type === "visualization");
    assert.equal(visualization?.visualizationConfig?.moduleId, "configured-visualization-lab", `${topicId}: wrong module`);
    assert.equal(visualization?.visualizationConfig?.topicId, topicId, `${topicId}: wrong lab topic route`);

    for (const block of lesson.blocks) {
      assert.ok(block.title.en.trim(), `${topicId}/${block.idSuffix}: missing English title`);
      assert.ok(block.title.zh.trim(), `${topicId}/${block.idSuffix}: missing Chinese title`);
      if (block.content) {
        assert.ok(block.content.en.trim(), `${topicId}/${block.idSuffix}: missing English content`);
        assert.ok(block.content.zh.trim(), `${topicId}/${block.idSuffix}: missing Chinese content`);
      }
    }
  }
});

test("each HK lesson displays exactly five fully bound, bilingual, grade-correct questions", () => {
  const displayedIds: string[] = [];

  for (const [topicId, grade] of Object.entries(FINAL_HK_TOPIC_GRADES) as Array<[FinalHkTopicId, string]>) {
    const displayed = selectedLessonQuestions(topicId);
    assert.equal(displayed.length, 5, `${topicId}: expected five displayed questions`);
    assert.equal(new Set(displayed.map((question) => question.id)).size, 5, `${topicId}: duplicate displayed question`);

    for (const question of displayed) {
      displayedIds.push(question.id);
      assert.equal(question.curriculumTrack, "HK", `${question.id}: wrong curriculum track`);
      assert.equal(question.topicId, topicId, `${question.id}: wrong topic binding`);
      assert.equal(question.grade, grade, `${question.id}: wrong grade after routing`);
      assert.ok(question.prompt.en.trim() && question.prompt.zh.trim(), `${question.id}: missing bilingual prompt`);
      assert.ok(question.explanation.en.trim() && question.explanation.zh.trim(), `${question.id}: missing bilingual explanation`);
      assert.ok(question.answer.trim(), `${question.id}: missing answer`);
    }
  }

  assert.equal(displayedIds.length, 255);
  assert.equal(new Set(displayedIds).size, 255, "displayed HK question IDs must be globally unique");
});

test("displayed HK questions contain no generic low-discrimination distractor template", () => {
  for (const topicId of Object.keys(FINAL_HK_TOPIC_GRADES) as FinalHkTopicId[]) {
    const displayed = selectedLessonQuestions(topicId);
    for (const question of displayed) {
      const content = [
        question.prompt.en,
        question.prompt.zh,
        question.explanation.en,
        question.explanation.zh,
        ...(question.options?.flatMap((option) => [option.en, option.zh]) ?? [])
      ].join(" ");
      for (const forbidden of FORBIDDEN_TEMPLATE_DISTRACTORS) {
        assert.equal(content.includes(forbidden), false, `${question.id}: contains generic distractor '${forbidden}'`);
      }
    }
  }
});

test("every displayed question that claims a bar chart carries the matching chart data", () => {
  for (const topicId of Object.keys(FINAL_HK_TOPIC_GRADES) as FinalHkTopicId[]) {
    for (const question of selectedLessonQuestions(topicId)) {
      const prompt = `${question.prompt.en} ${question.prompt.zh}`;
      const claimsDisplayedChart =
        /\b(?:the|a|this|in a)\s+(?:single-series |compound |composite |grouped )?bar chart\b/i.test(question.prompt.en) ||
        /棒形圖(?:中|顯示|比較)/.test(prompt);
      if (!claimsDisplayedChart) continue;
      assert.equal(question.diagram?.kind, "bar-chart", `${question.id}: claims a bar chart but renders none`);
    }
  }
});

test("the seventeen manual HK content repairs remain locked in learner-facing lesson and question copy", () => {
  const exactLessonRepairContract = {
    p2PlaceValueFirstChecklistItem: lessonBlock("p2-place-value", "checklist").items?.[0],
    p2MoneyTimeConcept: lessonBlock("p2-money-time", "concept").content,
    p2MoneyTimeFirstChecklistItem: lessonBlock("p2-money-time", "checklist").items?.[0],
    p3MeasurementExtension: lessonBlock("p3-measurement", "extension").items,
    p3GeometryWorkedExample: lessonBlock("p3-geometry-patterns", "worked-example").content,
    p3GeometrySecondExtensionItem: lessonBlock("p3-geometry-patterns", "extension").items?.[1],
    p6RatioSecondExtensionItem: lessonBlock("p6-ratio-proportion", "extension").items?.[1],
    linearEquationsFallbackTitle: lessonBlock("linear-equations", "visualization").title,
    linearEquationsFallbackContent: lessonBlock("linear-equations", "visualization").content
  };
  assert.deepEqual(exactLessonRepairContract, {
    p2PlaceValueFirstChecklistItem: {
      en: "Read from the highest displayed place to the ones place; in 1000, the highest place is the thousands place.",
      zh: "由顯示中的最高位讀到個位；在 1000 中，最高位是千位。"
    },
    p2MoneyTimeConcept: {
      en: "Money answers need HK$ or cents. Half past means the minute hand points to 6, which is 30 minutes after the hour.",
      zh: "金錢答案要寫港元或仙。半小時表示分針指向 6，即整點後 30 分鐘。"
    },
    p2MoneyTimeFirstChecklistItem: {
      en: "Write HK$ or cents with money answers.",
      zh: "金錢答案要寫港元或仙。"
    },
    p3MeasurementExtension: [
      {
        en: "Choose one measurement type (for example, length), four comparable objects, and one common unit for all four measurements.",
        zh: "選擇一種度量類型（例如長度）、四件可比較的物件，並以同一單位量度全部四件物件。"
      },
      {
        en: "Measure that same property for all four objects, then draw a single-series bar chart with complete axis labels, a stated scale, and the common unit.",
        zh: "量度四件物件的同一性質，再繪畫一幅有完整坐標軸標籤、清楚標明刻度和共用單位的單系列棒形圖。"
      }
    ],
    p3GeometryWorkedExample: {
      en: "A closed figure has four straight sides. Its opposite sides carry two matching pairs of arrow marks, so both pairs of opposite sides are parallel. Therefore it is a parallelogram, which is also a quadrilateral. A triangle with three matching side marks is an equilateral triangle.",
      zh: "一個封閉圖形有四條直邊，而兩組對邊分別有相同箭嘴記號，所以兩組對邊都互相平行；因此它是平行四邊形，也屬於四邊形。若三角形的三條邊都有相同短線記號，便是等邊三角形。"
    },
    p3GeometrySecondExtensionItem: {
      en: "Measure or directly compare the side lengths of three triangular objects, then classify each triangle from those measured side-length relationships.",
      zh: "量度或直接比較三件三角形物件的邊長，再按量得的邊長關係為每個三角形分類。"
    },
    p6RatioSecondExtensionItem: {
      en: "Measure the same quantity at five consecutive time points and draw a broken-line graph with complete axis labels, a stated scale, and units.",
      zh: "在連續五個時間點量度同一個量，並繪畫一幅有完整坐標軸標籤、清楚標明刻度和單位的折線圖。"
    },
    linearEquationsFallbackTitle: {
      en: "Solve ax + b = c (a ≠ 0) by equal operations",
      zh: "以等量運算解 ax + b = c（a ≠ 0）"
    },
    linearEquationsFallbackContent: {
      en: "For a ≠ 0, undo addition and multiplication with equal operations on both sides, isolate x, and check the original equation.",
      zh: "在 a ≠ 0 的條件下，在方程兩邊作相同運算以消去加法和乘法，分離 x，再檢查原方程。"
    }
  });

  const ratesLesson = lessonText("p5-rates");
  assert.match(ratesLesson, /exact fractional answer has a non-terminating decimal expansion/i);
  assert.match(ratesLesson, /精確答案為分數，而化成小數時不能除盡/);
  assert.doesNotMatch(ratesLesson, /non-terminating fraction|不盡分數/i);

  const quadraticLesson = lessonText("quadratic-patterns");
  assert.match(quadraticLesson, /a\s*\\ne\s*0/);

  const statisticsQuestions = displayedQuestionText("statistics-s1");
  assert.match(statisticsQuestions, /全距/);
  assert.doesNotMatch(statisticsQuestions, /極差/);

  const p4Lesson = lessonText("p4-angles");
  const p4Questions = displayedQuestionText("p4-angles");
  assert.match(p4Lesson, /equal sides.*parallel opposite sides.*right angles/i);
  assert.match(p4Lesson, /等邊.*平行.*直角/);
  assert.match(p4Questions, /four right angles and four equal sides/i);
  assert.match(p4Questions, /四個直角和四條等邊/);

  const trigonometryQuestions = displayedQuestionText("trigonometry-s5");
  assert.match(trigonometryQuestions, /without checking whether either stated interval endpoint is also a solution/i);
  assert.match(trigonometryQuestions, /未檢查指定區間的端點是否也是解/);

  const calculusQuestions = displayedQuestionText("calculus");
  assert.match(calculusQuestions, /f'\(x\).*decreas|f'\(x\).*遞減/i);
  assert.doesNotMatch(
    calculusQuestions,
    /constant of integration|indefinite integral|antiderivative|area under|積分常數|不定積分|原函數/i
  );

  const localExtrema = activeQuestion("q11");
  const localExtremaOptions = localExtrema.options?.map((option) => option.zh).join(" ") ?? "";
  assert.match(localExtremaOptions, /局部極大值/);
  assert.match(localExtremaOptions, /局部極小值/);
  assert.doesNotMatch(localExtremaOptions, /局部最大值|局部最小值/);

  const p5ChartLearnerText = `${lessonText("p5-charts-averages")} ${displayedQuestionText("p5-charts-averages")}`;
  assert.match(p5ChartLearnerText, /Compound Bar Chart/i);
  assert.match(p5ChartLearnerText, /複合棒形圖/);
  assert.doesNotMatch(p5ChartLearnerText, /Composite Bar|grouped bar|分組棒形圖|組合棒形圖/i);

  const p3FractionsLesson = lessonText("p3-fractions-intro");
  assert.match(p3FractionsLesson, /等值分數把同一整體分成不同數目的等份，所表示的數量相同/);
  assert.doesNotMatch(p3FractionsLesson, /不同大小的份數/);

  const coordinatesQuestions = selectedLessonQuestions("coordinates");
  assert.equal(coordinatesQuestions.some((question) => /gradient|斜率/i.test(`${question.prompt.en} ${question.prompt.zh}`)), false);
  assert.ok(coordinatesQuestions.some((question) => question.id === "supp-coordinates-first-step-v2"));
  assert.ok(selectedLessonQuestions("coordinate-geometry").some((question) => /gradient|斜率/i.test(`${question.prompt.en} ${question.prompt.zh}`)));
});

test("displayed supplemental strategy questions are grammatical, explanatory, and topic-specific", () => {
  const displayed = (Object.keys(FINAL_HK_TOPIC_GRADES) as FinalHkTopicId[]).flatMap(selectedLessonQuestions);
  const firstSteps = displayed.filter((question) => /-first-step(?:-v\d+)?$/.test(question.id));
  const commonChecks = displayed.filter((question) => /-common-check(?:-v\d+)?$/.test(question.id));

  assert.equal(firstSteps.length, 49);
  assert.equal(commonChecks.length, 20);
  for (const question of firstSteps) {
    assert.match(question.prompt.en, /^When starting a question about /, `${question.id}: awkward English article`);
    assert.doesNotMatch(question.explanation.en, /^A strong first step for this topic is:/, `${question.id}: generator explanation leaked`);
  }
  for (const question of commonChecks) {
    assert.match(question.prompt.en, /^Which check best prevents a typical mistake in /, `${question.id}: awkward English topic grammar`);
    assert.notEqual(question.explanation.en.trim(), question.answer.trim(), `${question.id}: answer is repeated without explanation`);
  }

  for (const [kind, collection] of [["first-step", firstSteps], ["common-check", commonChecks]] as const) {
    const signatures = collection.map((question) =>
      question.options?.map((option) => `${option.en}|${option.zh}`).join("||") ?? ""
    );
    assert.equal(new Set(signatures).size, signatures.length, `${kind}: identical option sets remain across topics`);
  }
});

test("displayed algebraic division and multiplication explanations preserve their mathematical conditions", () => {
  const p2Multiplication = activeQuestion("pq-p2-multiplication-foundations-2");
  assert.match(p2Multiplication.explanation.en, /five groups of two/i);
  assert.match(p2Multiplication.explanation.zh, /5 組.*每組 2 個/i);

  for (const questionId of ["q20", "supp-more-algebra-guided-example"] as const) {
    const question = activeQuestion(questionId);
    const content = `${question.prompt.en} ${question.prompt.zh} ${question.explanation.en} ${question.explanation.zh}`;
    assert.match(content, /[xb]\s*(?:\\ne|≠)\s*0/i, `${questionId}: division restriction is missing`);
  }
});

test("displayed HK question metadata and answer-format wording match the canonical lesson contract", () => {
  const topicById = new Map(
    topics.filter((topic) => topic.curriculumTrack === "HK").map((topic) => [topic.id, topic] as const)
  );
  for (const topicId of Object.keys(FINAL_HK_TOPIC_GRADES) as FinalHkTopicId[]) {
    const canonicalTopic = topicById.get(topicId);
    assert.ok(canonicalTopic, `${topicId}: missing canonical topic`);
    for (const question of selectedLessonQuestions(topicId)) {
      assert.deepEqual(question.topic, canonicalTopic.title, `${question.id}: stale duplicated topic label`);
    }
  }

  for (const questionId of ["pq-p5-fractions-operations-2", "supp-p5-fractions-operations-guided-example"] as const) {
    const question = activeQuestion(questionId);
    assert.match(`${question.prompt.en} ${question.prompt.zh}`, /simplest fractional form|化至最簡分數/i);
    assert.equal(question.acceptedAnswers?.includes("0.5833") ?? false, false, `${questionId}: decimal alias conflicts with simplest-form request`);
  }

  const yIntercept = activeQuestion("graph-quadratic-patterns-y-intercept");
  assert.match(`${yIntercept.prompt.en} ${yIntercept.prompt.zh}`, /ordered pair|坐標/i);
  assert.equal(yIntercept.acceptedAnswers?.includes("-4") ?? false, false, "y-intercept point must not accept a bare ordinate");
  assert.equal(
    yIntercept.acceptedAnswers?.some((answer) => /^\s*-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?\s*$/.test(answer)) ?? false,
    false,
    "y-intercept point must retain ordered-pair parentheses"
  );
});

test("HK exam-revision questions state units, precision, and natural Chinese wording", () => {
  const q24 = activeQuestion("q24");
  assert.match(q24.answer, /minutes per mark/i);
  assert.ok(q24.options?.every((option) => /minutes per mark/i.test(option.en)), "q24: every option needs the requested unit");

  const keyFact = activeQuestion("supp-exam-revision-key-fact");
  assert.match(`${keyFact.prompt.en} ${keyFact.prompt.zh}`, /2 decimal places|小數點後兩位/i);
  assert.match(keyFact.answer, /minutes per mark/i);

  const guided = activeQuestion("supp-exam-revision-guided-example");
  assert.match(guided.answer, /minutes per mark/i);
  assert.doesNotMatch(guided.prompt.zh, /分分題/);
  assert.match(guided.prompt.zh, /6 分的分題|平均每分所用時間/);
  assert.equal(guided.acceptedAnswers?.some((answer) => /^1\.5(?:\s|$)/.test(answer)) ?? false, false);
});

test("HK question language uses natural rounding and official senior-statistics terminology", () => {
  for (const topicId of Object.keys(FINAL_HK_TOPIC_GRADES) as FinalHkTopicId[]) {
    for (const question of selectedLessonQuestions(topicId)) {
      assert.doesNotMatch(
        `${question.prompt.zh} ${question.explanation.zh}`,
        /進上成|捨去成/,
        `${question.id}: unnatural Chinese rounding wording`
      );
    }
  }

  const differentiationCheck = activeQuestion("supp-differentiation-intro-common-check");
  assert.match(`${differentiationCheck.answer} ${differentiationCheck.explanation.zh}`, /先乘以原來的指數，再把指數減 1/);

  for (const questionId of ["q12", "supp-statistics-s6-first-step", "supp-statistics-s6-key-fact"] as const) {
    const question = activeQuestion(questionId);
    const content = `${question.prompt.en} ${question.prompt.zh} ${question.explanation.en} ${question.explanation.zh}`;
    assert.match(content, /standard score.*z-score|標準分.*z 分數/i, `${questionId}: missing HK standard-score terminology`);
  }
  const q12 = activeQuestion("q12");
  assert.match(`${q12.prompt.zh} ${q12.explanation.zh}`, /正態分佈/);
});

test("circle-theorem and z-score strategy questions use complete official bilingual relations", () => {
  const q19 = activeQuestion("q19");
  assert.match(q19.prompt.zh, /一弧所對的圓心角.*該弧所對的圓周角/);
  assert.match(q19.explanation.zh, /同一弧所對的圓心角.*圓周角.*兩倍/);
  assert.doesNotMatch(`${q19.prompt.zh} ${q19.explanation.zh}`, /同弧上的圓周角|同弧圓周角/);

  const circlesFirstStep = activeQuestion("supp-circles-first-step");
  const circlesGuided = activeQuestion("supp-circles-guided-example");
  const circlesCheck = activeQuestion("supp-circles-common-check");
  assert.match(circlesFirstStep.answer, /angle at the centre/i);
  assert.match(circlesGuided.prompt.en, /angle at the circumference standing on an arc.*angle at the centre standing on the same arc/i);
  assert.match(circlesGuided.prompt.zh, /一弧所對的圓周角.*該弧所對的圓心角/);
  assert.match(circlesGuided.explanation.en, /angle at the centre.*twice.*angle at the circumference standing on the same arc/i);
  assert.match(circlesGuided.explanation.zh, /同一弧所對的圓心角.*圓周角.*兩倍/);
  for (const question of [circlesFirstStep, circlesGuided, circlesCheck]) {
    const content = [
      question.prompt.en,
      question.prompt.zh,
      question.answer,
      question.explanation.en,
      question.explanation.zh,
      ...(question.options?.flatMap((option) => [option.en, option.zh]) ?? [])
    ].join(" ");
    assert.doesNotMatch(content, /centre angle|circumference angle|同弧上的圓周角|同弧圓周角/i, `${question.id}: ambiguous circle-theorem wording`);
  }

  const statisticsFirstStep = activeQuestion("supp-statistics-s6-first-step");
  const exactEn = "Confirm that the standard deviation is greater than 0, then convert the observed value to a standard score (z-score) for the stated normal distribution";
  const exactZh = "先確認標準差大於 0，再把觀察值轉換成該正態分佈的標準分（z 分數）";
  assert.equal(statisticsFirstStep.answer, exactEn);
  assert.equal(statisticsFirstStep.options?.[0]?.en, exactEn);
  assert.equal(statisticsFirstStep.options?.[0]?.zh, exactZh);
  assert.match(statisticsFirstStep.explanation.en, new RegExp(exactEn.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(statisticsFirstStep.explanation.zh, new RegExp(exactZh.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

  const statisticsCheck = activeQuestion("supp-statistics-s6-common-check");
  const exactCheckEn = "Check that the standard deviation is greater than 0, then subtract the mean from the observed value and divide by the standard deviation";
  const exactCheckZh = "先檢查標準差大於 0，再以觀察值減平均數，然後除以標準差";
  assert.equal(statisticsCheck.answer, exactCheckEn);
  assert.equal(statisticsCheck.options?.[0]?.en, exactCheckEn);
  assert.equal(statisticsCheck.options?.[0]?.zh, exactCheckZh);
  assert.match(statisticsCheck.explanation.en, new RegExp(exactCheckEn.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(statisticsCheck.explanation.zh, new RegExp(exactCheckZh.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("displayed S3 sector questions use the EDB angle-at-the-centre term", () => {
  const sectorQuestions = selectedLessonQuestions("arc-length-sector-area");
  assert.equal(sectorQuestions.length, 5);

  const sectorLesson = lessonText("arc-length-sector-area");
  const sectorTopic = topics.find((topic) => topic.id === "arc-length-sector-area");
  assert.ok(sectorTopic);
  const sourceCopy = `${sectorTopic.description.en} ${sectorLesson}`;
  assert.match(sourceCopy, /angle at the centre/i);
  assert.doesNotMatch(sourceCopy, /central angle|centre angle/i);

  for (const question of sectorQuestions) {
    const content = [
      question.prompt.en,
      question.answer,
      question.explanation.en,
      ...(question.options?.map((option) => option.en) ?? [])
    ].join(" ");
    assert.doesNotMatch(content, /centre angle/i, `${question.id}: use EDB's angle at the centre terminology`);
  }

  for (const questionId of [
    "hk-s3-arc-length-sector-area-1",
    "supp-arc-length-sector-area-first-step",
    "supp-arc-length-sector-area-key-fact",
    "supp-arc-length-sector-area-guided-example"
  ] as const) {
    const question = activeQuestion(questionId);
    const content = [question.prompt.en, question.answer, question.explanation.en].join(" ");
    assert.match(content, /angle at the centre/i, `${questionId}: missing EDB angle-at-the-centre terminology`);
  }
});

test("the S2 die probability question states its fair six-outcome sample space", () => {
  const dieQuestion = activeQuestion("supp-probability-s2-guided-example");
  assert.match(dieQuestion.prompt.en, /fair six-sided die/i);
  assert.match(dieQuestion.prompt.zh, /公平六面骰子/);
  assert.equal(dieQuestion.answer, "1/3");
  assert.match(dieQuestion.explanation.en, /5 and 6.*2 of (?:the )?6 equally likely outcomes.*1\/3/i);
  assert.match(dieQuestion.explanation.zh, /5 和 6.*6 個等可能結果.*2 個.*1\/3/);
});

test("displayed senior HK practice has calibrated difficulty and substantive core coverage", () => {
  const displayed = (Object.keys(FINAL_HK_TOPIC_GRADES) as FinalHkTopicId[]).flatMap(selectedLessonQuestions);
  assert.deepEqual(
    displayed.filter((question) => question.difficulty === "High").map((question) => question.id),
    [],
    "no displayed HK question has sufficient cognitive demand for High"
  );

  const advanced = displayedQuestionText("advanced-functions");
  assert.match(advanced, /logarithm|logarithmic|對數/i);
  assert.match(advanced, /domain|base.*(?:greater|positive)|定義域|底.*(?:大於|正)/i);

  const probability = displayedQuestionText("probability-s5");
  assert.match(probability, /conditional|given that|without replacement|條件概率|已知|不放回/i);

  const mixed = displayedQuestionText("mixed-problem-solving");
  assert.match(mixed, /distance.*speed.*time|d\s*=\s*vt|距離.*速率.*時間/i);
  assert.match(mixed, /table|graph|equation|表|圖|方程/i);

  const moreAlgebra = displayedQuestionText("more-algebra");
  assert.match(moreAlgebra, /rational expression|有理式/i);
  assert.match(moreAlgebra, /[xb]\s*(?:\\ne|≠)\s*0/i);
});

test("strategy multiple-choice questions use credible mathematical alternatives", () => {
  const forbidden = /Guess quickly|Skip all units|Use any formula|Guess the answer|Skip the graph|Use the longest formula/i;
  for (const questionId of ["pq-p6-pre-secondary-problem-solving-1", "q25"] as const) {
    const question = activeQuestion(questionId);
    const content = question.options?.map((option) => `${option.en} ${option.zh}`).join(" ") ?? "";
    assert.doesNotMatch(content, forbidden, `${questionId}: non-discriminating strategy distractor`);
  }
});

test("HK primary lesson scope follows the final age-appropriate sequencing contract", () => {
  const p1Measurement = `${lessonText("p1-measurement-time")} ${displayedQuestionText("p1-measurement-time")}`;
  assert.match(p1Measurement, /half.hour|半小時/i);
  assert.doesNotMatch(p1Measurement, /mass|capacity|重量|容量/i);

  const p2Multiplication = `${lessonText("p2-multiplication-foundations")} ${displayedQuestionText("p2-multiplication-foundations")}`;
  assert.doesNotMatch(p2Multiplication, /\d\s*x\s*\d/i);
  assert.match(p2Multiplication, /×|\\times/);

  const p3Geometry = `${lessonText("p3-geometry-patterns")} ${displayedQuestionText("p3-geometry-patterns")}`;
  assert.match(p3Geometry, /quadrilateral|四邊形/i);
  assert.match(p3Geometry, /triangle|三角形/i);
  assert.match(p3Geometry, /side|vertex|邊|頂點/i);
  assert.doesNotMatch(
    p3Geometry,
    /stage\s*n|2n\s*\+\s*1|growing pattern|line symmetry|angle classification|階段|增長規律|線對稱|角(?:度)?分類|把角分類/i,
    "P3 geometry must not retain the superseded pattern, symmetry, or angle-classification scope"
  );

  const p4Factors = `${lessonText("p4-large-numbers")} ${displayedQuestionText("p4-large-numbers")}`;
  assert.match(p4Factors, /multiple|倍數/i);
  assert.match(p4Factors, /factor|因數/i);
  assert.match(p4Factors, /H\.?(?:C|G)\.?(?:F|D)\.?|highest common factor|greatest common divisor|最大公因數/i);
  assert.match(p4Factors, /L\.?(?:C)\.?(?:M)\.?|least common multiple|最小公倍數/i);
  assert.doesNotMatch(p4Factors, /six-digit|nearest hundred|nearest thousand|六位數|最接近的百位|最接近的千位/i);

  const p4Shapes = `${lessonText("p4-angles")} ${displayedQuestionText("p4-angles")}`;
  assert.match(p4Shapes, /quadrilateral|四邊形/i);
  assert.match(p4Shapes, /square.*rectangle.*rhombus.*parallelogram|正方形.*長方形.*菱形.*平行四邊形/i);
  assert.match(p4Shapes, /dissect|form|compose|cut|拼砌|分割/i);
  assert.doesNotMatch(p4Shapes, /measure.*angle|square.corner|量角|方角/i);

  const p6Data = `${lessonText("p6-ratio-proportion")} ${displayedQuestionText("p6-ratio-proportion")}`;
  assert.match(p6Data, /mean|average|平均數/i);
  assert.match(p6Data, /total.*count|總和.*數據個數|總數.*項數/i);
  assert.match(p6Data, /broken.line graph|line graph|折線圖/i);
  assert.doesNotMatch(p6Data, /equivalent ratio|ratio\s*\d+\s*:\s*\d+|等值比|\d+\s*：\s*\d+/i);

  const p5Fractions = `${lessonText("p5-fractions-operations")} ${displayedQuestionText("p5-fractions-operations")}`;
  assert.match(p5Fractions, /unlike denominator|異分母/i);
  assert.match(p5Fractions, /three|3|三項/i);

  const p5Rates = `${lessonText("p5-rates")} ${displayedQuestionText("p5-rates")}`;
  assert.match(p5Rates, /unitary method|歸一法/i);
  assert.match(p5Rates, /unit price|每.*(?:件|本|支).*價|單價/i);
  assert.doesNotMatch(p5Rates, /speed|km\/h|公里每小時|速率/i);

  const p6Percentages = lessonText("p6-percentages");
  assert.match(p6Percentages, /increase.*by.*%|decrease.*by.*%|增加.*百分|減少.*百分/i);
  assert.doesNotMatch(p6Percentages, /percentage increase from|由.*增加至.*百分率|增幅百分率/i);
});

test("dedicated HK visualization promises preserve the repaired mathematical invariants", () => {
  const contracts: Array<{
    topicId: FinalHkTopicId;
    required: RegExp[];
    forbidden?: RegExp[];
  }> = [
    {
      topicId: "p1-addition-subtraction",
      required: [/0-to-20|0 至 20/i, /zero step|零步/i]
    },
    {
      topicId: "p1-shapes-patterns",
      required: [/AB.*ABC.*AAB/i, /shortest repeating unit|最短重複單位/i]
    },
    {
      topicId: "p2-place-value",
      required: [/ten hundreds|10 個百/i, /one thousand|1 個千/i]
    },
    {
      topicId: "p2-length-data",
      required: [/1\s*m\s*=\s*100\s*cm|1 米.*100 厘米/i, /one icon represents one object|每個圖示代表一件物件/i],
      forbidden: [/bar height|bar chart|棒形高度|棒形圖/i]
    },
    {
      topicId: "p4-decimals",
      required: [/0\.00.*2\.00/i, /0\.01/]
    },
    {
      topicId: "p4-perimeter-area",
      required: [/rectangle|長方形/i, /boundary length.*square units|邊界總長度.*平方單位/i]
    },
    {
      topicId: "p6-percentages",
      required: [/fixed 100-cell grid|固定百格圖/i, /exactly p shaded cells|正好 p 個已塗色方格/i]
    },
    {
      topicId: "p6-ratio-proportion",
      required: [
        /total.*count.*mean.*value table.*plotted points.*axes.*scale.*units|總和.*數據個數.*平均數.*數值表.*標繪點.*坐標軸.*刻度.*單位/i,
        /only consecutive time or continuous-data points|只連接相鄰的時間或連續數據點/i,
        /do not treat extrapolation as observed fact|不把延伸線段當作已觀察事實/i
      ],
      forbidden: [/equivalent ratio|inverse proportion|等值比|反比/i]
    },
    {
      topicId: "p6-speed",
      required: [/distance.*speed.*time/i, /distance.time journey line|距離.時間路程線/i, /gradient as speed|斜率解讀為速率/i]
    },
    {
      topicId: "p6-pre-secondary-problem-solving",
      required: [
        /non-negative amount remaining.*including exactly zero.*positive overspend/i,
        /非負餘款.*包括恰好為零.*正數超支/
      ]
    },
    {
      topicId: "integers",
      required: [/signed operand|帶符號運算數/i, /3.*−.*\(−5\)|3.*−.*（−5）/i]
    },
    {
      topicId: "coordinates",
      required: [/at least three signed points|至少三個帶正負號的點/i, /pure translation.*pure reflection|純平移.*純反射/i]
    },
    {
      topicId: "transformations",
      required: [/x\s*[=＝]\s*k/i, /90°.*180°.*270°/i, /Enrichment|延伸學習/i]
    },
    {
      topicId: "probability-s2",
      required: [/seeded six-sided die|帶種子的六面骰/i, /once or 20 times|1 次或 20 次/i, /all six faces|六個面/i, /P\(even\)|偶數/i]
    },
    {
      topicId: "identities-square-patterns",
      required: [/a\s*[>＞]|a>b/i, /≡|\\equiv/, /exact (?:identity )?pieces|精確.*面積塊/i],
      forbidden: [/麵積/]
    },
    {
      topicId: "quadratic-patterns",
      required: [/a\\ne0/i, /discriminant|判別式/i, /no.real.root|沒有實根/i]
    },
    {
      topicId: "circles",
      required: [/tangent.*perpendicular.*radius|切線.*半徑.*垂直/i, /centre.*twice.*circumference.*same arc|一弧.*圓心角.*該弧.*圓周角.*兩倍/i]
    },
    {
      topicId: "functions",
      required: [/same allowed input|同一個容許輸入/i, /input-output machine.*value table.*highlighted point.*graph|輸入輸出機.*數值表.*已標示點.*圖像/i]
    },
    {
      topicId: "coordinate-geometry",
      required: [/gradient.*distance.*midpoint|斜率.*距離.*中點/i, /undefined|未定義/i]
    },
    {
      topicId: "trigonometry-s5",
      required: [/sine or cosine|正弦或餘弦/i, /amplitude.*period.*signed phase shift|振幅.*週期.*帶正負號的相位移/i]
    },
    {
      topicId: "statistics-s6",
      required: [/z=.*mean.*sd|z＝.*平均數.*標準差/i, /locate x|定位 x/i, /off-scale|超出刻度/i]
    },
    {
      topicId: "polynomials",
      required: [/factorisation|因式分解/i],
      forbidden: [/factoring/i]
    },
    {
      topicId: "more-algebra",
      required: [/excluded value|不容許值/i]
    }
  ];

  for (const { topicId, required, forbidden = [] } of contracts) {
    const content = visualizationText(topicId);
    for (const pattern of required) {
      assert.match(content, pattern, `${topicId}: missing visualization invariant ${pattern}`);
    }
    for (const pattern of forbidden) {
      assert.doesNotMatch(content, pattern, `${topicId}: contains forbidden visualization promise ${pattern}`);
    }
  }
});

test("pass-through visualization copy stays inside the seven independently audited runtime boundaries", () => {
  const multiplication = visualizationText("p2-multiplication-foundations");
  assert.match(multiplication, /rows multiplied by columns.*total number of objects|行數乘列數.*物件總數/i);
  assert.doesNotMatch(multiplication, /repeated addition|formal area|square units|重複加法|正式面積|平方單位/i);

  const fractions = visualizationText("p3-fractions-intro");
  assert.match(fractions, /exact ×2 equivalent|同乘 2 的等值/i);
  assert.match(fractions, /does not compare arbitrary non-equivalent fractions|不比較任意非等值分數/i);

  const statistics = visualizationText("statistics-s1");
  assert.match(statistics, /symmetric distribution|對稱分佈/i);
  assert.match(statistics, /does not expose raw observations|沒有提供.*原始觀察值/i);

  const dataHandling = visualizationText("data-handling");
  assert.match(dataHandling, /symmetric distribution|對稱分佈/i);
  assert.match(dataHandling, /does not supply raw data.*median.*skew.*clusters.*outliers.*claim validation|沒有提供.*中位數.*偏態.*聚集.*離群值.*主張驗證/i);

  const advancedFunctions = visualizationText("advanced-functions");
  assert.match(advancedFunctions, /interpret only the selected curve|只調整並解讀所選曲線/i);
  assert.match(advancedFunctions, /does not currently provide a controlled cross-family comparison|目前不提供受控的跨函數類型比較/i);

  const differentiation = visualizationText("differentiation-intro");
  assert.match(differentiation, /tangent point.*local linear model|切線點.*局部線性模型/i);
  assert.doesNotMatch(differentiation, /secant|割線/i);

  const calculus = visualizationText("calculus");
  assert.match(calculus, /tangent gradients change|切線斜率.*改變/i);
  assert.doesNotMatch(calculus, /exact integral|accumulated area|lower bound|midpoint approximation|定積分|累積面積|下限|中點近似/i);
});

test("second-sweep lesson practice stays inside the taught P2 time and S1 statistics scope", () => {
  const p2Guided = selectedLessonQuestions("p2-money-time")
    .find((question) => question.id.startsWith("supp-p2-money-time-guided-example"));
  assert.ok(p2Guided, "P2 money-and-time lesson needs its displayed guided example");
  assert.match(`${p2Guided.prompt.en} ${p2Guided.prompt.zh}`, /half an hour after.*2:30|2:30.*半小時/i);
  assert.equal(p2Guided.answer, "3:00");
  assert.match(`${p2Guided.explanation.en} ${p2Guided.explanation.zh}`, /30.*2:30.*3:00|2:30.*30.*3:00/i);
  assert.doesNotMatch(
    `${p2Guided.prompt.en} ${p2Guided.prompt.zh} ${p2Guided.explanation.en} ${p2Guided.explanation.zh}`,
    /fifteen minutes|十五分鐘|2:45/i
  );

  const statisticsLesson = productionLessonByTopicId.get("statistics-s1");
  assert.ok(statisticsLesson, "S1 statistics lesson must exist");
  const statisticsConcept = statisticsLesson.blocks.find((block) => block.type === "concept");
  const statisticsWorkedExample = statisticsLesson.blocks.find((block) => block.type === "worked-example");
  const statisticsChecklist = statisticsLesson.blocks.find((block) => block.type === "checklist");
  assert.match(
    `${statisticsConcept?.content?.en ?? ""} ${statisticsConcept?.content?.zh ?? ""}`,
    /median.*middle value.*ordered.*even.*mean of the two middle values|中位數.*排序.*中間值.*偶數.*中間兩數的平均數/i
  );
  assert.match(
    `${statisticsWorkedExample?.content?.en ?? ""} ${statisticsWorkedExample?.content?.zh ?? ""}`,
    /2, 5, 9.*median.*5|2, 5, 9.*中位數.*5/i
  );
  assert.match(statisticsWorkedExample?.content?.zh ?? "", /集中趨勢的量度/);
  assert.doesNotMatch(statisticsWorkedExample?.content?.zh ?? "", /集中趨勢量數/);
  assert.match(
    (statisticsChecklist?.items ?? []).flatMap((item) => [item.en, item.zh]).join(" "),
    /sort.*before finding the median|求中位數前.*排序/i
  );
});

test("displayed trigonometry strategy explanations separate the key fact from the alternatives", () => {
  const firstStep = selectedLessonQuestions("trigonometry-basics")
    .find((question) => question.id.startsWith("supp-trigonometry-basics-first-step"));
  assert.ok(firstStep, "trigonometry lesson needs its displayed first-step question");
  assert.match(firstStep.explanation.en, /\\\)\.\s+The alternatives/);
});

test("P2 pictograms, P3 single bars, and P5 compound bar charts follow the official primary sequence", () => {
  const p2Topic = topics.find((topic) => topic.id === "p2-length-data");
  const p2Questions = selectedLessonQuestions("p2-length-data");
  const p2Charts = p2Questions.filter((question) => question.diagram?.kind === "bar-chart");
  const p3Charts = selectedLessonQuestions("p3-measurement").filter((question) => question.diagram?.kind === "bar-chart");
  const p5Charts = selectedLessonQuestions("p5-charts-averages").filter((question) => question.diagram?.kind === "bar-chart");

  assert.ok(p2Topic, "P2 metres-and-pictograms topic must exist");
  assert.match(p2Topic.description.en, /one-to-one pictograms/i);
  assert.doesNotMatch(p2Topic.description.en, /pictographs/i);
  assert.equal(p2Charts.length, 0, "P2 must not display bar charts before the P3 data-handling sequence");
  assert.match(
    p2Questions.map((question) => `${question.prompt.en} ${question.prompt.zh}`).join(" "),
    /(?:key|each|one).*(?:icon|picture).*(?:one (?:object|fruit)|1 (?:object|fruit))|(?:圖例|每個|一個).*圖示.*(?:一件|一個|1 件|1 個)(?:物件|水果)/i,
    "P2 needs a visible one-to-one pictogram key"
  );
  assert.ok(p3Charts.length >= 1, "P3 measurement lesson needs a displayed single-series bar chart");
  assert.ok(p5Charts.length >= 1, "P5 lesson needs a displayed compound bar chart");
  assert.ok(p3Charts.every((question) => (question.diagram as { mode?: string }).mode === "single"));
  assert.ok(p5Charts.every((question) => (question.diagram as { mode?: string }).mode === "grouped"));
});

test("all displayed coordinate grids carry bilingual axes and stable semantic IDs", () => {
  const coordinateGrids = (Object.keys(FINAL_HK_TOPIC_GRADES) as FinalHkTopicId[])
    .flatMap(selectedLessonQuestions)
    .filter((question) => question.diagram?.kind === "coordinate-grid");

  assert.equal(coordinateGrids.length, 13);
  for (const question of coordinateGrids) {
    const diagram = question.diagram as unknown as {
      xAxisLabel?: { en?: string; zh?: string };
      yAxisLabel?: { en?: string; zh?: string };
      points?: Array<{ id?: string }>;
      lines?: Array<{ id?: string; label?: { en?: string; zh?: string } }>;
    };
    assert.ok(diagram.xAxisLabel?.en?.trim() && diagram.xAxisLabel.zh?.trim(), `${question.id}: missing bilingual x-axis`);
    assert.ok(diagram.yAxisLabel?.en?.trim() && diagram.yAxisLabel.zh?.trim(), `${question.id}: missing bilingual y-axis`);
    assert.ok((diagram.points ?? []).every((point) => point.id?.trim()), `${question.id}: missing stable point id`);
    assert.ok((diagram.lines ?? []).every((line) => line.id?.trim() && line.label?.en?.trim() && line.label.zh?.trim()), `${question.id}: missing semantic line metadata`);
  }
});

test("S3 and S4 preserve the four final mathematical identities", () => {
  const identities = lessonText("identities-square-patterns");
  assert.match(identities, /\(a \+ b\)\^?2|\(a\+b\).*2|平方和/i);
  assert.match(identities, /a\^?2\s*[-−]\s*b\^?2|平方差/i);
  assert.match(identities, /≡|identity|恆等/i);
  assert.doesNotMatch(identities, /parabola|vertex|root|拋物線|頂點|根/i);
  assert.match(identities, /middle term.*\+2ab.*−2ab|中間項.*\+2ab.*−2ab/i);

  const trigonometry = lessonText("trigonometry-basics");
  assert.match(
    trigonometry,
    /adjacent side.*non-hypotenuse.*next to|鄰邊.*不是斜邊.*相鄰/i,
    "adjacent-side definition must distinguish it from the hypotenuse"
  );

  const sector = lessonText("arc-length-sector-area");
  assert.match(sector, /arc length|弧長/i);
  assert.match(sector, /sector area|扇形面積/i);
  assert.match(sector, /360/);
  assert.match(sector, /π|\\pi/);
  assert.doesNotMatch(sector, /inscribed angle|tangent theorem|圓周角定理|切線定理/i);

  const quadratic = lessonText("quadratic-patterns");
  assert.match(quadratic, /parabola|拋物線/i);
  assert.match(quadratic, /vertex|頂點/i);
  assert.match(quadratic, /axis of symmetry|對稱軸/i);

  const circles = lessonText("circles");
  assert.match(circles, /chord|弦/i);
  assert.match(circles, /tangent|切線/i);
  assert.match(circles, /centre|圓心/i);

  const circlesTopic = topics.find((topic) => topic.id === "circles");
  assert.ok(circlesTopic, "S4 circle-geometry topic must exist");
  assert.match(circlesTopic.description.en, /corresponding arcs.*senior-secondary circle angle theorems/i);
  assert.match(circlesTopic.description.zh, /所對的弧.*高中圓幾何中的角度定理/);
  assert.doesNotMatch(circlesTopic.description.zh, /圓角性質/);
});

test("M1 and M2 lessons are labelled as optional HKDSE Extended Part content", () => {
  const differentiation = lessonText("differentiation-intro");
  const calculus = lessonText("calculus");
  const statistics = lessonText("statistics-s6");

  for (const [topicId, content] of [["differentiation-intro", differentiation], ["calculus", calculus]] as const) {
    assert.match(content, /HKDSE Extended Part/i, `${topicId}: missing English optional qualification`);
    assert.match(content, /M1/);
    assert.match(content, /M2/);
    assert.match(content, /香港中學文憑.*延伸部分|HKDSE.*延伸部分/i, `${topicId}: missing Chinese qualification`);
  }

  assert.match(statistics, /HKDSE Extended Part/i);
  assert.match(statistics, /M1/);
  assert.doesNotMatch(statistics, /M2/);
  assert.match(statistics, /香港中學文憑.*延伸部分|HKDSE.*延伸部分/i);
});
