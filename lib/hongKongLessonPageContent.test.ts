import assert from "node:assert/strict";
import test from "node:test";
import { questions } from "../data/questions";
import { buildFullQuestionBankSolvabilityAudit } from "./questionBankSolvability";
import { questionAnswerMatches } from "./server/answerMatching";
import { reviewPages, type ReviewPage, type ReviewLanguage } from "../scripts/review-china-lesson-page-content";

const expectedDisplayedQuestionLedger: Record<string, readonly string[]> = {
  "p1-counting-number-bonds": ["pq-p1-counting-number-bonds-1", "pq-p1-counting-number-bonds-2", "supp-p1-counting-number-bonds-first-step", "supp-p1-counting-number-bonds-key-fact", "supp-p1-counting-number-bonds-guided-example"],
  "p1-addition-subtraction": ["pq-p1-addition-subtraction-1", "pq-p1-addition-subtraction-2", "supp-p1-addition-subtraction-first-step", "supp-p1-addition-subtraction-key-fact", "supp-p1-addition-subtraction-guided-example"],
  "p1-shapes-patterns": ["pq-p1-shapes-patterns-1", "pq-p1-shapes-patterns-2", "supp-p1-shapes-patterns-first-step", "supp-p1-shapes-patterns-key-fact", "supp-p1-shapes-patterns-guided-example"],
  "p1-measurement-time": ["pq-p1-measurement-time-1", "pq-p1-measurement-time-2", "supp-p1-measurement-time-first-step", "supp-p1-measurement-time-key-fact", "supp-p1-measurement-time-guided-example"],
  "p2-place-value": ["pq-p2-place-value-1", "pq-p2-place-value-2", "supp-p2-place-value-first-step", "supp-p2-place-value-key-fact", "supp-p2-place-value-guided-example"],
  "p2-multiplication-foundations": ["pq-p2-multiplication-foundations-1", "pq-p2-multiplication-foundations-2", "supp-p2-multiplication-foundations-first-step", "supp-p2-multiplication-foundations-key-fact", "supp-p2-multiplication-foundations-guided-example"],
  "p2-money-time": ["pq-p2-money-time-1", "pq-p2-money-time-2", "supp-p2-money-time-first-step", "supp-p2-money-time-key-fact", "supp-p2-money-time-guided-example"],
  "p2-length-data": ["pq-p2-length-data-1", "pq-p2-length-data-2", "supp-p2-length-data-first-step", "supp-p2-length-data-key-fact", "supp-p2-length-data-guided-example"],
  "p3-multiplication-division": ["pq-p3-multiplication-division-1", "pq-p3-multiplication-division-2", "supp-p3-multiplication-division-first-step", "supp-p3-multiplication-division-key-fact", "supp-p3-multiplication-division-guided-example"],
  "p3-fractions-intro": ["pq-p3-fractions-intro-1", "pq-p3-fractions-intro-2", "supp-p3-fractions-intro-first-step", "supp-p3-fractions-intro-key-fact", "supp-p3-fractions-intro-guided-example"],
  "p3-measurement": ["pq-p3-measurement-1", "pq-p3-measurement-2", "supp-p3-measurement-first-step", "supp-p3-measurement-key-fact", "supp-p3-measurement-guided-example"],
  "p3-geometry-patterns": ["pq-p3-geometry-patterns-1", "pq-p3-geometry-patterns-2", "supp-p3-geometry-patterns-first-step", "supp-p3-geometry-patterns-key-fact", "supp-p3-geometry-patterns-guided-example"],
  "p4-large-numbers": ["pq-p4-large-numbers-1", "pq-p4-large-numbers-2", "supp-p4-large-numbers-first-step", "supp-p4-large-numbers-key-fact", "supp-p4-large-numbers-guided-example"],
  "p4-decimals": ["pq-p4-decimals-1", "pq-p4-decimals-2", "graph-p4-decimals-number-line", "supp-p4-decimals-first-step", "supp-p4-decimals-key-fact"],
  "p4-angles": ["pq-p4-angles-1", "pq-p4-angles-2", "graph-p4-angles-straight-line", "supp-p4-angles-first-step", "supp-p4-angles-key-fact"],
  "p4-perimeter-area": ["pq-p4-perimeter-area-1", "pq-p4-perimeter-area-2", "supp-p4-perimeter-area-first-step", "supp-p4-perimeter-area-key-fact", "supp-p4-perimeter-area-guided-example"],
  "p5-fractions-operations": ["pq-p5-fractions-operations-1", "pq-p5-fractions-operations-2", "supp-p5-fractions-operations-first-step", "supp-p5-fractions-operations-key-fact", "supp-p5-fractions-operations-guided-example"],
  "p5-volume": ["pq-p5-volume-1", "pq-p5-volume-2", "graph-p5-volume-cube", "supp-p5-volume-first-step", "supp-p5-volume-guided-example"],
  "p5-rates": ["pq-p5-rates-1", "pq-p5-rates-2", "supp-p5-rates-first-step", "supp-p5-rates-key-fact", "supp-p5-rates-guided-example"],
  "p5-charts-averages": ["pq-p5-charts-averages-1", "pq-p5-charts-averages-2", "supp-p5-charts-averages-first-step", "supp-p5-charts-averages-key-fact", "supp-p5-charts-averages-guided-example"],
  "p6-percentages": ["pq-p6-percentages-1", "pq-p6-percentages-2", "supp-p6-percentages-first-step", "supp-p6-percentages-key-fact", "supp-p6-percentages-guided-example"],
  "p6-ratio-proportion": ["pq-p6-ratio-proportion-1", "pq-p6-ratio-proportion-2", "supp-p6-ratio-proportion-first-step", "supp-p6-ratio-proportion-key-fact", "supp-p6-ratio-proportion-guided-example"],
  "p6-speed": ["pq-p6-speed-1", "pq-p6-speed-2", "graph-p6-speed-distance", "supp-p6-speed-first-step", "supp-p6-speed-key-fact"],
  "p6-pre-secondary-problem-solving": ["pq-p6-pre-secondary-problem-solving-1", "pq-p6-pre-secondary-problem-solving-2", "supp-p6-pre-secondary-problem-solving-first-step", "supp-p6-pre-secondary-problem-solving-key-fact", "supp-p6-pre-secondary-problem-solving-guided-example"],
  integers: ["q1", "supp-integers-first-step", "supp-integers-key-fact", "supp-integers-guided-example", "supp-integers-common-check"],
  "algebra-basics": ["q2", "supp-algebra-basics-first-step", "supp-algebra-basics-key-fact", "supp-algebra-basics-guided-example", "supp-algebra-basics-common-check"],
  angles: ["q13", "supp-angles-first-step", "supp-angles-key-fact", "supp-angles-guided-example", "supp-angles-common-check"],
  ratios: ["q14", "supp-ratios-first-step", "supp-ratios-key-fact", "supp-ratios-guided-example", "supp-ratios-common-check"],
  "statistics-s1": ["q15", "supp-statistics-s1-first-step", "supp-statistics-s1-key-fact", "supp-statistics-s1-guided-example", "supp-statistics-s1-common-check"],
  "linear-equations": ["q4", "supp-linear-equations-first-step", "supp-linear-equations-key-fact", "supp-linear-equations-guided-example", "supp-linear-equations-common-check"],
  coordinates: ["q3", "q26", "q28", "graph-coordinates-read-point", "graph-coordinates-quadrant"],
  transformations: ["q16", "q27", "supp-transformations-first-step", "supp-transformations-key-fact", "supp-transformations-guided-example"],
  "probability-s2": ["q17", "supp-probability-s2-first-step", "supp-probability-s2-key-fact", "supp-probability-s2-guided-example", "supp-probability-s2-common-check"],
  polynomials: ["q18", "supp-polynomials-first-step", "supp-polynomials-key-fact", "supp-polynomials-guided-example", "supp-polynomials-common-check"],
  "quadratic-patterns": ["q5", "graph-quadratic-patterns-vertex", "graph-quadratic-patterns-axis", "graph-quadratic-patterns-y-intercept", "graph-quadratic-patterns-roots"],
  "trigonometry-basics": ["q6", "supp-trigonometry-basics-first-step", "supp-trigonometry-basics-key-fact", "supp-trigonometry-basics-guided-example", "supp-trigonometry-basics-common-check"],
  circles: ["q19", "supp-circles-first-step", "supp-circles-key-fact", "supp-circles-guided-example", "supp-circles-common-check"],
  functions: ["q7", "graph-functions-read-output", "graph-functions-zero", "supp-functions-first-step", "supp-functions-key-fact"],
  "coordinate-geometry": ["q8", "graph-coordinate-geometry-gradient", "graph-coordinate-geometry-midpoint", "supp-coordinate-geometry-first-step", "supp-coordinate-geometry-key-fact"],
  "more-algebra": ["q20", "supp-more-algebra-first-step", "supp-more-algebra-key-fact", "supp-more-algebra-guided-example", "supp-more-algebra-common-check"],
  "data-handling": ["q21", "graph-data-handling-highest-value", "supp-data-handling-first-step", "supp-data-handling-key-fact", "supp-data-handling-guided-example"],
  "advanced-functions": ["q22", "supp-advanced-functions-first-step", "supp-advanced-functions-key-fact", "supp-advanced-functions-guided-example", "supp-advanced-functions-common-check"],
  "trigonometry-s5": ["q23", "supp-trigonometry-s5-first-step", "supp-trigonometry-s5-key-fact", "supp-trigonometry-s5-guided-example", "supp-trigonometry-s5-common-check"],
  "probability-s5": ["q9", "supp-probability-s5-first-step", "supp-probability-s5-key-fact", "supp-probability-s5-guided-example", "supp-probability-s5-common-check"],
  "differentiation-intro": ["q10", "supp-differentiation-intro-first-step", "supp-differentiation-intro-key-fact", "supp-differentiation-intro-guided-example", "supp-differentiation-intro-common-check"],
  calculus: ["q11", "supp-calculus-first-step", "supp-calculus-key-fact", "supp-calculus-guided-example", "supp-calculus-common-check"],
  "statistics-s6": ["q12", "supp-statistics-s6-first-step", "supp-statistics-s6-key-fact", "supp-statistics-s6-guided-example", "supp-statistics-s6-common-check"],
  "exam-revision": ["q24", "supp-exam-revision-first-step", "supp-exam-revision-key-fact", "supp-exam-revision-guided-example", "supp-exam-revision-common-check"],
  "mixed-problem-solving": ["q25", "supp-mixed-problem-solving-first-step", "supp-mixed-problem-solving-key-fact", "supp-mixed-problem-solving-guided-example", "supp-mixed-problem-solving-common-check"]
};

const pagesByLanguage = Object.fromEntries(
  (["en", "zh", "zhHans"] as const).map((language) => [language, reviewPages(language, "hong-kong")])
) as Record<ReviewLanguage, ReviewPage[]>;

function page(language: ReviewLanguage, topicId: string) {
  const result = pagesByLanguage[language].find((candidate) => candidate.topic.id === topicId);
  assert.ok(result, `Missing Hong Kong page ${topicId} in ${language}`);
  return result;
}

function visiblePageText(reviewPage: ReviewPage) {
  const payload = reviewPage.payload as {
    topic: { title: string; description: string };
    lessonPage: {
      title: string;
      description: string;
      blocks: Array<{ title: string; content: string; items: string[] }>;
    };
    displayedPractice: Array<{
      topic: string;
      prompt: string;
      options: string[];
      acceptedAnswers: string[];
      explanationShownAfterAttempt: string;
      correctAnswerShownAfterWrongAttempt: string | null;
      assets: Array<{ alt: string; caption: string }>;
    }>;
  };
  return [
    payload.topic.title,
    payload.topic.description,
    payload.lessonPage.title,
    payload.lessonPage.description,
    ...payload.lessonPage.blocks.flatMap((block) => [block.title, block.content, ...block.items]),
    ...payload.displayedPractice.flatMap((question) => [
      question.topic,
      question.prompt,
      ...question.options,
      question.explanationShownAfterAttempt,
      question.correctAnswerShownAfterWrongAttempt ?? "",
      ...question.assets.flatMap((asset) => [asset.alt, asset.caption])
    ])
  ].join("\n");
}

function displayedPracticePayload(reviewPage: ReviewPage) {
  return (reviewPage.payload as {
    displayedPractice: Array<{
      id: string;
      type: string;
      prompt: string;
      options: string[];
      acceptedAnswers: string[];
      explanationShownAfterAttempt: string;
      correctAnswerShownAfterWrongAttempt: string | null;
      gradingSemantics: {
        acceptedDisplayedOptionCount: number;
        runtimeSelectionChecks: Array<{ acceptedByProductionGrader: boolean }>;
      };
    }>;
  }).displayedPractice;
}

test("the transformations reflection rule accepts a complete parenthesized explanation through production grading", () => {
  const question = questions.find(({ id }) => id === "q27");
  assert.ok(question, "Hong Kong transformations q27");
  const gradingQuestion = {
    id: question.id,
    answer: question.answer,
    accepted_answers: question.acceptedAnswers ?? null,
    options: question.options ?? null
  };
  assert.equal(
    questionAnswerMatches(gradingQuestion, "The x-coordinate changes sign (y stays the same)"),
    true
  );
  assert.equal(
    questionAnswerMatches(gradingQuestion, "The y-coordinate changes sign (x stays the same)"),
    false
  );
});

test("Hong Kong lesson runtime inventory is exactly 49 pages and 245 selected questions", () => {
  const pages = pagesByLanguage.en;
  assert.equal(pages.length, 49);
  assert.deepEqual(
    Object.fromEntries(pages.map((reviewPage) => [reviewPage.topic.id, reviewPage.practice.map((question) => question.id)])),
    expectedDisplayedQuestionLedger
  );
  const selectedIds = pages.flatMap((reviewPage) => reviewPage.practice.map((question) => question.id));
  assert.equal(selectedIds.length, 245);
  assert.equal(new Set(selectedIds).size, 245);
  assert.ok(pages.every((reviewPage) => reviewPage.practice.length === 5));
});

test("all 245 displayed Hong Kong questions pass the independent solvability and answer-key audit", () => {
  const selectedIds = new Set(pagesByLanguage.en.flatMap((reviewPage) => reviewPage.practice.map((question) => question.id)));
  const rows = buildFullQuestionBankSolvabilityAudit("2026-08-09").rows.filter((row) => selectedIds.has(row.questionId));
  assert.equal(rows.length, 245);
  assert.deepEqual(rows.filter((row) => row.status !== "pass"), []);
});

test("all three displayed languages preserve complete feedback and exactly one accepted option per multiple choice", () => {
  for (const language of ["en", "zh", "zhHans"] as const) {
    assert.equal(pagesByLanguage[language].length, 49);
    for (const reviewPage of pagesByLanguage[language]) {
      const displayed = displayedPracticePayload(reviewPage);
      assert.equal(displayed.length, 5, `${language}/${reviewPage.topic.id}: expected five displayed questions`);
      for (const question of displayed) {
        assert.ok(question.prompt.trim(), `${language}/${question.id}: blank prompt`);
        assert.ok(question.explanationShownAfterAttempt.trim(), `${language}/${question.id}: blank feedback explanation`);
        assert.ok(question.correctAnswerShownAfterWrongAttempt?.trim(), `${language}/${question.id}: blank correct-answer feedback`);
        if (question.type !== "multiple-choice") continue;
        assert.equal(question.options.length, 4, `${language}/${question.id}: expected four options`);
        assert.equal(question.gradingSemantics.acceptedDisplayedOptionCount, 1, `${language}/${question.id}: production grader must accept exactly one displayed option`);
        assert.equal(
          question.gradingSemantics.runtimeSelectionChecks.filter((check) => check.acceptedByProductionGrader).length,
          1,
          `${language}/${question.id}: runtime option checks must accept exactly one option`
        );
      }
    }
  }
});

test("Hong Kong symbolic free-response corrections use the learner's displayed language", () => {
  const roots = displayedPracticePayload(page("zhHans", "quadratic-patterns"))
    .find((question) => question.id === "graph-quadratic-patterns-roots");
  assert.ok(roots);
  assert.equal(roots.correctAnswerShownAfterWrongAttempt, "x = 1 和 x = 3");

  const englishRoots = displayedPracticePayload(page("en", "quadratic-patterns"))
    .find((question) => question.id === "graph-quadratic-patterns-roots");
  assert.ok(englishRoots);
  assert.equal(englishRoots.correctAnswerShownAfterWrongAttempt, "x = 1 and x = 3");
});

test("Hong Kong page-specific curriculum, language, and condition regressions stay fixed", () => {
  const allEnglish = pagesByLanguage.en.map(visiblePageText).join("\n");
  assert.doesNotMatch(allEnglish, /When starting a [AEIOU]/u);

  assert.match(visiblePageText(page("en", "p1-measurement-time")), /length, mass, capacity, or time/u);
  assert.doesNotMatch(visiblePageText(page("en", "p1-measurement-time")), /length, time, or order/u);
  assert.match(
    visiblePageText(page("en", "p1-measurement-time")),
    /the door is longer and the pencil is shorter/u
  );
  assert.match(
    visiblePageText(page("zhHans", "p1-measurement-time")),
    /教室门较长、铅笔较短/u
  );
  const countingFirstStep = displayedPracticePayload(page("en", "p1-counting-number-bonds")).find(
    (question) => question.id === "supp-p1-counting-number-bonds-first-step"
  );
  assert.equal(
    countingFirstStep?.prompt,
    "When a counting or number-bond question has a missing number, what should you do first?"
  );
  assert.deepEqual(countingFirstStep?.options, [
    "Work out what the blank represents, then use forward counting, backward counting, or a number bond",
    "Always start counting from 1, even when a number is given",
    "Choose the larger number without counting",
    "Ignore whether the missing number comes before or after"
  ]);
  assert.equal(
    countingFirstStep?.explanationShownAfterAttempt,
    "In a counting sequence, count forward for a later number and backward for an earlier one. In a number bond, identify the whole and known part, then count on or subtract."
  );
  assert.match(countingFirstStep?.prompt ?? "", /do first/iu);
  assert.match(countingFirstStep?.explanationShownAfterAttempt ?? "", /whole and known part/iu);
  assert.doesNotMatch(visiblePageText(page("zh", "p1-counting-number-bonds")), /最長公式/u);

  const addition = visiblePageText(page("en", "p1-addition-subtraction"));
  assert.ok(
    addition.includes(
      String.raw`split \(8\) into \(4\) and \(4\). Use one \(4\) with \(6\) to make \(10\): \(6 + 4 = 10\). Then add the remaining \(4\): \(10 + 4 = 14\).`
    )
  );
  const additionTraditional = visiblePageText(page("zh", "p1-addition-subtraction"));
  assert.ok(
    additionTraditional.includes(
      String.raw`把 \(8\) 分成 \(4\) 和 \(4\)。先用一個 \(4\) 與 \(6\) 湊成 \(10\)：\(6 + 4 = 10\)。再加剩下的 \(4\)：\(10 + 4 = 14\)。`
    )
  );
  const additionSimplified = visiblePageText(page("zhHans", "p1-addition-subtraction"));
  assert.ok(
    additionSimplified.includes(
      String.raw`把 \(8\) 分成 \(4\) 和 \(4\)。先用一个 \(4\) 与 \(6\) 凑成 \(10\)：\(6 + 4 = 10\)。再加剩下的 \(4\)：\(10 + 4 = 14\)。`
    )
  );
  assert.match(visiblePageText(page("en", "p2-multiplication-foundations")), /five groups of two/u);
  assert.match(visiblePageText(page("zh", "p1-shapes-patterns")), /恰好有 3 條邊/u);

  const moneyTime = visiblePageText(page("en", "p2-money-time"));
  assert.match(moneyTime, /o'clock and half-past times/u);
  assert.match(moneyTime, /2:30/u);
  assert.doesNotMatch(moneyTime, /2:45|Fifteen minutes after|dollars or cents/u);

  const measurementTime = displayedPracticePayload(page("en", "p1-measurement-time"));
  const measurementTimeKeyFact = measurementTime.find(
    (question) => question.id === "supp-p1-measurement-time-key-fact"
  );
  assert.equal(measurementTimeKeyFact?.prompt, "At an o'clock time, which number does the minute hand point to?");
  assert.equal(measurementTimeKeyFact?.correctAnswerShownAfterWrongAttempt, "12");
  assert.doesNotMatch(visiblePageText(page("en", "p1-measurement-time")), /How many minutes are in/u);

  assert.match(
    visiblePageText(page("zhHans", "p3-measurement")),
    /计算前先选择正确测量单位/u
  );
  const measurementFirstStep = displayedPracticePayload(page("zhHans", "p3-measurement")).find(
    (question) => question.id === "supp-p3-measurement-first-step"
  );
  assert.equal(measurementFirstStep?.prompt, "开始处理测量题目时，哪一步最有用？");
  assert.equal(measurementFirstStep?.explanationShownAfterAttempt, "计算前先选择正确测量单位。");

  const lengthDataAnswers = displayedPracticePayload(page("en", "p2-length-data"))
    .filter((question) => question.id !== "supp-p2-length-data-first-step")
    .map((question) => question.correctAnswerShownAfterWrongAttempt);
  assert.deepEqual(lengthDataAnswers, ["13 cm", "10", "14 cm", "15"]);
  assert.equal(new Set(lengthDataAnswers).size, 4, "numeric practice answers should remain diagnostically distinct");

  const denominatorQuestion = displayedPracticePayload(page("en", "p3-fractions-intro")).find(
    (question) => question.id === "pq-p3-fractions-intro-2"
  );
  assert.ok(denominatorQuestion);
  assert.deepEqual(denominatorQuestion.acceptedAnswers, ["2 / 4"]);
  assert.doesNotMatch(denominatorQuestion.acceptedAnswers.join(" "), /0\.5/u);
  const multiplicationDivision = visiblePageText(page("en", "p3-multiplication-division"));
  assert.match(multiplicationDivision, /the total, the number of groups, or the amount in each group/u);
  const multiplicationWorkedExample = (page("en", "p3-multiplication-division").payload as {
    lessonPage: { blocks: Array<{ location: string; content: string }> };
  }).lessonPage.blocks.find((block) => block.location.includes("(worked-example)"))?.content ?? "";
  assert.match(multiplicationWorkedExample, /6 \\times 8 = 48/u);
  assert.doesNotMatch(multiplicationWorkedExample, /7 \\times 6 = 42/u);

  for (const topicId of ["p3-geometry-patterns", "p4-angles"]) {
    const text = visiblePageText(page("en", topicId));
    assert.doesNotMatch(text, /(?:90|180|360)\s*(?:°|degrees?)|\\circ/u, `${topicId}: degree measurement is deferred to P6`);
  }
  assert.match(
    visiblePageText(page("zhHans", "p3-geometry-patterns")),
    /钝角的开口比正方形角大/u
  );

  const largeNumbersWorkedExample = (page("en", "p4-large-numbers").payload as {
    lessonPage: { blocks: Array<{ location: string; content: string }> };
  }).lessonPage.blocks.find((block) => block.location.includes("(worked-example)"))?.content ?? "";
  assert.match(largeNumbersWorkedExample, /4,572/u);
  assert.match(largeNumbersWorkedExample, /4,600/u);
  assert.doesNotMatch(largeNumbersWorkedExample, /3,684|3,700/u);

  const volume = visiblePageText(page("en", "p5-volume"));
  assert.doesNotMatch(volume, /What is its height|find (?:the|its) height/iu);
  const volumeWorkedExample = (page("en", "p5-volume").payload as {
    lessonPage: { blocks: Array<{ location: string; content: string; items: string[] }> };
  }).lessonPage.blocks.find((block) => block.location.includes("(worked-example)"))?.content ?? "";
  assert.match(volumeWorkedExample, /5 \\times 4 \\times 2 = 40/u);
  assert.doesNotMatch(volumeWorkedExample, /4 \\times 3 \\times 2 = 24/u);
  assert.match(volume, /cubic units, not square units/u);
  assert.doesNotMatch(volume, /surface squares/u);
  assert.match(
    visiblePageText(page("zhHans", "p5-volume")),
    /长方体/u,
    "P5 Simplified Chinese worked example must use the standard Simplified cuboid term"
  );
  const volumeGraph = displayedPracticePayload(page("zhHans", "p5-volume")).find(
    (question) => question.id === "graph-p5-volume-cube"
  );
  assert.match(
    volumeGraph?.prompt ?? "",
    /一条棱长如图所示/u,
    "P5 cube prompt must accurately describe the single displayed edge-length label"
  );

  const chartsWorkedExample = (page("en", "p5-charts-averages").payload as {
    lessonPage: { blocks: Array<{ location: string; content: string }> };
  }).lessonPage.blocks.find((block) => block.location.includes("(worked-example)"))?.content ?? "";
  assert.match(chartsWorkedExample, /4, 7, 10/u);
  assert.match(chartsWorkedExample, /11.*sunny days.*8.*rainy days/u);
  assert.doesNotMatch(chartsWorkedExample, /6, 8, 10|12.*sunny days.*8.*rainy days/u);

  const percentageAnswers = displayedPracticePayload(page("zhHans", "p6-percentages"))
    .filter((question) => ["pq-p6-percentages-2", "supp-p6-percentages-guided-example"].includes(question.id))
    .map((question) => question.correctAnswerShownAfterWrongAttempt);
  assert.deepEqual(percentageAnswers, ["25%", "60%"]);
  assert.doesNotMatch(percentageAnswers.join(" "), /百分比/u);

  const speedGraph = displayedPracticePayload(page("zhHans", "p6-speed")).find(
    (question) => question.id === "graph-p6-speed-distance"
  );
  assert.match(speedGraph?.prompt ?? "", /点 D 表示学生在 2 小时后的位置/u);
  const p5Unitary = visiblePageText(page("en", "p5-rates"));
  assert.doesNotMatch(p5Unitary, /speed|km\/h/iu);
  assert.match(p5Unitary, /Unitary Method/u);

  const p6Unitary = visiblePageText(page("en", "p6-ratio-proportion"));
  assert.doesNotMatch(p6Unitary, /ratio|proportion|inverse|direct proportion|\d+\s*:\s*\d+/iu);
  assert.match(p6Unitary, /Scaling with the Unitary Method/u);

  const advancedFunctions = page("en", "advanced-functions").practice;
  assert.equal(advancedFunctions.length, 5);
  assert.match(advancedFunctions.find((question) => question.id === "q22")?.prompt.en ?? "", /constant output ratio/u);
  assert.equal(advancedFunctions.find((question) => question.id === "q22")?.answer, "Exponential");
  assert.match(
    advancedFunctions.find((question) => question.id === "supp-advanced-functions-key-fact")?.prompt.en ?? "",
    /f\(5\)-g\(5\)/u
  );
  assert.equal(
    advancedFunctions.find((question) => question.id === "supp-advanced-functions-key-fact")?.answer,
    "7"
  );
  assert.match(
    advancedFunctions.find((question) => question.id === "supp-advanced-functions-guided-example")?.prompt.en ?? "",
    /eventually grows faster/u
  );
  assert.equal(
    advancedFunctions.find((question) => question.id === "supp-advanced-functions-guided-example")?.answer,
    "2^x"
  );

  const seniorProbability = page("en", "probability-s5");
  const conditionalDie = seniorProbability.practice.find((question) => question.id === "q9");
  assert.match(conditionalDie?.prompt.en ?? "", /X>1/u);
  assert.equal(conditionalDie?.answer, "3/5");
  assert.doesNotMatch(
    (seniorProbability.payload as { lessonPage: { blocks: Array<{ content?: string }> } }).lessonPage.blocks
      .map((block) => block.content ?? "")
      .join("\n"),
    /X>1/u,
    "the worked example must not pre-answer the conditional-die practice condition"
  );

  const examRevision = page("zhHans", "exam-revision");
  const examRevisionText = visiblePageText(examRevision);
  assert.match(examRevisionText, /每分用时.*15 \\div 10 = 1\.5.*分钟/u);
  assert.match(examRevisionText, /4 \\times 1\.5 = 6/u);
  const examPacing = examRevision.practice.find(
    (question) => question.id === "supp-exam-revision-key-fact"
  );
  assert.match(examPacing?.prompt.zhHans ?? examPacing?.prompt.zh ?? "", /小数点后两位/u);
  assert.equal(examPacing?.answer, "1.33");

  const moreAlgebra = page("en", "more-algebra").practice;
  assert.match(moreAlgebra.find((question) => question.id === "q20")?.prompt.en ?? "", /x \\ne 0/u);
  assert.match(moreAlgebra.find((question) => question.id === "supp-more-algebra-guided-example")?.prompt.en ?? "", /b \\ne 0/u);

  const calculus = visiblePageText(page("en", "calculus"));
  assert.match(calculus, /derivative signs/u);
  assert.doesNotMatch(calculus, /integral|antiderivative/iu);

  const simplified = pagesByLanguage.zhHans.map(visiblePageText).join("\n");
  assert.doesNotMatch(simplified, /[亂併們傾冪剛園壺帶張彎憑捨樹欄眾磚種約紅細終給絲綜繞繩繪義膠蓋藍蘋觀討詮譜貓貨買貼購車軸鄰鈍銳鏡闊陣際隻響飲駐]/u);
  assert.doesNotMatch(simplified, /其初一/u);
});
