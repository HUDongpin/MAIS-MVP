import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import type { ProductionLessonSeed } from "@/data/lessons";
import type { Question } from "@/types";
import * as reviewerModule from "./review-china-lesson-page-content";
import {
  allowedIssueLocations,
  contentHashForReview,
  displayedPracticeQuestions,
  localizedValue,
  parseJsonObject,
  reviewContractVersion,
  reviewPages,
  summaryFor,
  validateReviewResult,
  type ProviderReviewResult,
  type ReviewLanguage,
  type ReviewPage
} from "./review-china-lesson-page-content";

const expectedScopeCounts = {
  "hong-kong": 49,
  "pep-primary": 24,
  "pep-junior": 11,
  "pep-high": 22,
  "bnu-primary": 97,
  "bnu-junior": 35,
  "bnu-high": 24,
  "hjb-primary": 70,
  "hjb-junior": 22,
  "hjb-high": 30
} as const;

function question(id: string, prompt: string, type: Question["type"] = "multiple-choice"): Question {
  return {
    id,
    curriculumTrack: "HK",
    grade: "S1",
    topicId: "selection-parity",
    topic: { en: "Selection parity", zh: "選題一致性" },
    difficulty: "Low",
    type,
    prompt: { en: prompt, zh: prompt },
    options: type === "multiple-choice"
      ? [{ en: "1", zh: "1" }, { en: "2", zh: "2" }, { en: "3", zh: "3" }]
      : undefined,
    answer: "1",
    explanation: { en: "The answer is 1.", zh: "答案是 1。" }
  };
}

function seed(ids: string[]): ProductionLessonSeed {
  return {
    topicId: "selection-parity",
    productionReady: true,
    title: { en: "Selection parity", zh: "選題一致性" },
    description: { en: "Selection parity", zh: "選題一致性" },
    estimatedMinutes: 20,
    practiceQuestionIds: ids,
    blocks: []
  };
}

function passingResult(page: ReviewPage): ProviderReviewResult {
  return {
    topicId: page.topic.id,
    status: "pass",
    languageQuality: "pass",
    mathematicalContent: "pass",
    interactionContent: "pass",
    issues: [],
    independentQuestionChecks: page.practice.map((practiceQuestion) => ({
      questionId: practiceQuestion.id,
      independentAnswer: practiceQuestion.answer,
      answerMatch: "pass",
      rationale: "Independently recomputed for schema validation."
    })),
    summary: "No learner-facing content issue was found."
  };
}

test("HJB learner-visible English never exposes machine-translation placeholder tokens", () => {
  const placeholder = /term-[0-9a-f]+/iu;
  const failures: string[] = [];
  const inspect = (value: unknown, location: string) => {
    if (typeof value === "string" && placeholder.test(value)) failures.push(location);
  };

  for (const page of reviewPages("en").filter((candidate) => candidate.scope.startsWith("hjb-"))) {
    const lessonPage = page.payload.lessonPage as {
      title?: string;
      description?: string;
      blocks?: Array<{
        title?: string;
        content?: string;
        items?: string[];
        illustrations?: Array<{ alt?: string; caption?: string }>;
      }>;
    };
    inspect(lessonPage.title, `${page.scope}/${page.topic.id}.lesson.title`);
    inspect(lessonPage.description, `${page.scope}/${page.topic.id}.lesson.description`);
    lessonPage.blocks?.forEach((block, blockIndex) => {
      inspect(block.title, `${page.scope}/${page.topic.id}.blocks[${blockIndex}].title`);
      inspect(block.content, `${page.scope}/${page.topic.id}.blocks[${blockIndex}].content`);
      block.items?.forEach((item, itemIndex) =>
        inspect(item, `${page.scope}/${page.topic.id}.blocks[${blockIndex}].items[${itemIndex}]`)
      );
      block.illustrations?.forEach((illustration, illustrationIndex) => {
        inspect(illustration.alt, `${page.scope}/${page.topic.id}.blocks[${blockIndex}].illustrations[${illustrationIndex}].alt`);
        inspect(illustration.caption, `${page.scope}/${page.topic.id}.blocks[${blockIndex}].illustrations[${illustrationIndex}].caption`);
      });
    });

    const displayedPractice = page.payload.displayedPractice as Array<{
      id: string;
      topic?: string;
      prompt?: string;
      options?: string[];
      explanationShownAfterAttempt?: string;
      correctAnswerShownAfterWrongAttempt?: string;
    }>;
    displayedPractice.forEach((question, questionIndex) => {
      const prefix = `${page.scope}/${page.topic.id}.practice[${questionIndex}](${question.id})`;
      inspect(question.topic, `${prefix}.topic`);
      inspect(question.prompt, `${prefix}.prompt`);
      question.options?.forEach((option, optionIndex) => inspect(option, `${prefix}.options[${optionIndex}]`));
      inspect(question.explanationShownAfterAttempt, `${prefix}.explanation`);
      inspect(question.correctAnswerShownAfterWrongAttempt, `${prefix}.correctAnswer`);
    });
  }

  assert.deepEqual(failures, []);
});

test("v18 reviewer contract carries complete-answer, unit, and structural-token semantics and expires v17 cache", () => {
  const language = "zhHans" as const;
  const model = "deepseek-v4-pro";
  const page = reviewPages(language, "hong-kong")[0];
  const messagesForPage = (reviewerModule as unknown as {
    messagesForPage?: (
      page: ReviewPage,
      language: ReviewLanguage
    ) => Array<{ role: string; content: string }>;
  }).messagesForPage;

  assert.equal(
    reviewContractVersion,
    "china-all-math-whole-page-review-v18-2026-08-19-complete-answer-and-grading-semantics"
  );
  assert.equal(typeof messagesForPage, "function", "the exact provider messages must be inspectable by deterministic tests");
  assert.ok(messagesForPage);

  const messages = messagesForPage(page, language);
  const systemMessage = messages.find((message) => message.role === "system")?.content ?? "";
  const userMessage = JSON.parse(messages.find((message) => message.role === "user")?.content ?? "{}") as {
    reviewContractVersion?: string;
    lessonPage?: Record<string, unknown>;
  };
  const payloadInstruction = String(
    (page.payload.interactionContract as { reviewerInstruction?: string }).reviewerInstruction ?? ""
  );

  for (const instruction of [systemMessage, payloadInstruction]) {
    assert.match(
      instruction,
      /multi-part or process prompt[\s\S]*every requested response slot[\s\S]*independentAnswer[\s\S]*not a final-only partial/iu
    );
    assert.match(
      instruction,
      /explicit incompatible unit or dimension[\s\S]*same scalar[\s\S]*bare number[\s\S]*prompt uniquely fixes the unit[\s\S]*equivalent unit conversions remain valid/iu
    );
    assert.match(
      instruction,
      /circled[\s\S]*Roman[\s\S]*structural selection labels[\s\S]*tokens[\s\S]*not concatenated numeric scalars/iu
    );
  }
  assert.equal(userMessage.reviewContractVersion, reviewContractVersion);
  assert.deepEqual(userMessage.lessonPage, page.payload);

  const legacyContractVersion = "china-all-math-whole-page-review-v17-2026-08-10-learner-visible-illustrations";
  const legacyContentHash = createHash("sha256").update(JSON.stringify({
    reviewContractVersion: legacyContractVersion,
    language,
    scope: page.scope,
    payload: page.payload
  })).digest("hex");
  assert.notEqual(page.contentHash, legacyContentHash, "the semantic contract bump must change the content hash");

  const legacyRecord = {
    topicId: page.topic.id,
    scope: page.scope,
    language,
    contentHash: legacyContentHash,
    reviewedAt: "2026-08-10T00:00:00.000Z",
    provider: "DeepSeek" as const,
    model,
    reviewContractVersion: legacyContractVersion,
    result: passingResult(page)
  };
  const legacyStore = {
    schemaVersion: 2 as const,
    language,
    generatedAt: "2026-08-10T00:00:00.000Z",
    records: { [page.topic.id]: legacyRecord }
  } as Parameters<typeof summaryFor>[1];
  const summary = summaryFor([page], legacyStore, language, model);
  assert.equal(summary.currentReviewedPageCount, 0);
  assert.equal(summary.missingPageCount, 1);
  assert.equal(summary.staleRecordCount, 1);
  assert.equal(summary.gatePassed, false);
});

test("review inventory is exactly 384 pages in every language and every page displays five questions", () => {
  for (const language of ["en", "zh", "zhHans"] as const) {
    const pages = reviewPages(language);
    assert.equal(pages.length, 384, `${language} inventory`);
    assert.equal(new Set(pages.map((page) => page.topic.id)).size, 384, `${language} unique topic ids`);
    assert.ok(pages.every((page) => page.practice.length === 5), `${language} five-question completeness`);
    for (const [scope, count] of Object.entries(expectedScopeCounts)) {
      assert.equal(pages.filter((page) => page.scope === scope).length, count, `${language}/${scope}`);
    }
  }
});

test("display selection mirrors LessonView dedupe and handwriting replacement boundaries", () => {
  const atMostFive = [
    question("q1", "Prompt 1"),
    question("q2", "Prompt 2"),
    question("q3", "Prompt 3"),
    question("q4", "Prompt 4"),
    question("q5", "Prompt 4")
  ];
  assert.deepEqual(
    displayedPracticeQuestions(seed(atMostFive.map((item) => item.id)), atMostFive).map((item) => item.id),
    ["q1", "q2", "q3", "q4"],
    "LessonView deduplicates an at-most-five set without reaching outside that set for handwriting"
  );

  const overFive = [
    question("q1", "Prompt 1"),
    question("q2", "Prompt 2"),
    question("q3", "Prompt 3"),
    question("q4", "Prompt 4"),
    question("q5", "Prompt 5"),
    question("q6", "Prompt 6"),
    question("q7", "Prompt 7", "fill-in")
  ];
  assert.deepEqual(
    displayedPracticeQuestions(seed(overFive.map((item) => item.id)), overFive).map((item) => item.id),
    ["q1", "q2", "q3", "q4", "q7"],
    "an outside handwriting-capable item replaces only the fifth item"
  );
});

test("localized extraction uses the actual runtime Simplified fallback and includes a fidelity reference", () => {
  assert.equal(localizedValue({ en: "Learning", zh: "學習" }, "zhHans"), "学习");
  const englishPage = reviewPages("en", "hong-kong")[0];
  const simplifiedPage = reviewPages("zhHans", "hong-kong")[0];
  assert.ok("referenceSimplifiedChinese" in englishPage.payload);
  assert.ok(!("referenceSimplifiedChinese" in simplifiedPage.payload));
  const traditionalPage = reviewPages("zh", "hong-kong")[0];
  assert.match(
    String(traditionalPage.payload.fidelityInstruction),
    /intentionally Hong Kong Traditional Chinese/u
  );
  assert.match(JSON.stringify(englishPage.payload), /correctAnswerShownAfterWrongAttempt/u);
  assert.match(JSON.stringify(englishPage.payload), /"diagram"/u);

  const simplifiedPractice = simplifiedPage.payload.displayedPractice as Array<{
    id: string;
    options: string[];
    gradingSemantics: {
      localizedOptionVariants: Array<{ en: string; zh: string; zhHans: string }>;
      runtimeSelectionChecks: Array<{
        optionIndex: number;
        displayedOption: string;
        submittedOptionValue: string;
        acceptedByProductionGrader: boolean;
      }>;
      acceptedDisplayedOptionIndexes: number[];
      acceptedDisplayedOptionCount: number;
    };
  }>;
  const multilingualMultipleChoice = simplifiedPractice.find((item) => item.id === "supp-p1-counting-number-bonds-first-step");
  assert.ok(multilingualMultipleChoice);
  assert.equal(multilingualMultipleChoice.options[0], "先判断空格表示什么，再用顺数、倒数或数的组合找答案");
  assert.equal(multilingualMultipleChoice.gradingSemantics.localizedOptionVariants[0].zhHans, "先判断空格表示什么，再用顺数、倒数或数的组合找答案");
  assert.deepEqual(multilingualMultipleChoice.gradingSemantics.acceptedDisplayedOptionIndexes, [0]);
  assert.equal(multilingualMultipleChoice.gradingSemantics.acceptedDisplayedOptionCount, 1);
  assert.equal(multilingualMultipleChoice.gradingSemantics.runtimeSelectionChecks[0].submittedOptionValue, "先判断空格表示什么，再用顺数、倒数或数的组合找答案");
  assert.equal(multilingualMultipleChoice.gradingSemantics.runtimeSelectionChecks[0].acceptedByProductionGrader, true);
  assert.match(
    JSON.stringify(simplifiedPage.payload),
    /Incorrect options may intentionally diagnose common misconceptions/u,
    "the review payload should distinguish diagnostic distractors from genuine content defects"
  );
  assert.match(
    JSON.stringify(simplifiedPage.payload),
    /same-set identity edge case/u,
    "the review payload should distinguish a valid identity-law edge case from a suspected authoring error"
  );

  const changedPayload = structuredClone(englishPage.payload);
  (changedPayload.referenceSimplifiedChinese as Record<string, unknown>).testMutation = "changed";
  assert.notEqual(
    contentHashForReview(englishPage.payload, "en", englishPage.scope),
    contentHashForReview(changedPayload, "en", englishPage.scope),
    "a Simplified-reference change must invalidate an English cache record"
  );
});

test("review payload mirrors rendered PEP Junior illustrations and excludes hidden difficulty", () => {
  const geometryPage = reviewPages("zhHans", "pep-junior").find(
    (candidate) => candidate.topic.id === "pep-junior-s1-upper-geometric-figures"
  );
  assert.ok(geometryPage);

  const lessonPage = geometryPage.payload.lessonPage as {
    blocks: Array<{
      location: string;
      illustrations: Array<{
        location: string;
        id: string;
        slot: string;
        src: string;
        alt: string;
        caption: string;
        assetEvidence: {
          publicAssetExists: boolean;
          byteLength: number;
          sha256: string | null;
          evidenceSource: string;
        };
      }>;
    }>;
  };
  const illustrations = lessonPage.blocks.flatMap((block) => block.illustrations ?? []);
  assert.deepEqual(illustrations.map((illustration) => illustration.id), [
    "pep-junior-s1-upper-geometric-figures-concept",
    "pep-junior-s1-upper-geometric-figures-worked-example"
  ]);
  assert.equal(illustrations[0].location, "blocks[0](concept).illustrations[0]");
  assert.equal(illustrations[0].slot, "concept");
  assert.match(illustrations[0].src, /\/concept\.png$/u);
  assert.match(illustrations[0].alt, /点、线、射线、线段、角/u);
  assert.match(illustrations[0].caption, /准确识别对象和定义/u);
  assert.equal(illustrations[0].assetEvidence.publicAssetExists, true);
  assert.ok(illustrations[0].assetEvidence.byteLength > 0);
  assert.match(illustrations[0].assetEvidence.sha256 ?? "", /^[a-f0-9]{64}$/u);
  assert.match(illustrations[0].assetEvidence.evidenceSource, /LessonView/u);
  assert.ok(
    allowedIssueLocations(geometryPage).includes("blocks[0](concept).illustrations[0].alt"),
    "reviewers should be able to locate learner-visible illustration alternative text"
  );
  assert.ok(
    allowedIssueLocations(geometryPage).includes("blocks[1](worked-example).illustrations[0].caption"),
    "reviewers should be able to locate learner-visible illustration captions"
  );

  const displayedPractice = geometryPage.payload.displayedPractice as Array<Record<string, unknown>>;
  assert.ok(displayedPractice.every((question) => !("difficulty" in question)));
  assert.match(String(geometryPage.payload.visualReviewContract), /exact rendered illustration metadata/u);
});

test("reviewer rejects a self-withdrawing instruction to recompute all five items", () => {
  const page = reviewPages("zhHans", "pep-high")[0];
  const valid = passingResult(page);
  const issue = {
    severity: "major",
    category: "mathematical-correctness",
    location: `practice[0](${page.practice[0].id}).prompt`,
    evidence: "The reported arithmetic mismatch could not be confirmed from the displayed values.",
    reason: "The initial allegation needs another pass rather than a correction at this location.",
    suggestedCorrection: "Recompute all five items."
  } as const;

  assert.throws(() => validateReviewResult(page, {
    ...valid,
    status: "fail",
    mathematicalContent: "fail",
    issues: [issue]
  }), /suggests no change/u);
});

test("reviewer protects a correct same-set identity edge case from speculative pedagogy complaints", () => {
  const page = reviewPages("zhHans", "pep-high").find(
    (candidate) => candidate.topic.id === "pep-high-s4-sets-logic"
  );
  assert.ok(page);
  const issue = {
    severity: "major",
    category: "grade-or-curriculum-fit",
    location: "practice[4](pep-high-s4-mc-011).prompt",
    evidence: "The prompt explicitly sets B=A and asks for |A∩B|, so A∩A=A and the keyed answer 7 is mathematically correct. However, using the same set makes the calculation trivial and appears copy-pasted.",
    reason: "This degenerate same-set case loses pedagogical value and probably was intended to use two different sets.",
    suggestedCorrection: "Change B to the multiples of 4 so the intersection is less trivial."
  } as const;

  assert.throws(() => validateReviewResult(page, {
    ...passingResult(page),
    status: "fail",
    mathematicalContent: "fail",
    issues: [issue]
  }), /intentional same-set identity edge case/u);
});

test("reviewer JSON validation rejects wrappers, extra keys, invented locations, and incoherent verdicts", () => {
  const page = reviewPages("zhHans", "hong-kong")[0];
  const valid = passingResult(page);
  assert.deepEqual(validateReviewResult(page, valid), valid);
  assert.throws(() => parseJsonObject(`\`\`\`json\n${JSON.stringify(valid)}\n\`\`\``), /raw JSON object/u);
  assert.throws(() => validateReviewResult(page, { outputSchema: valid }), /expected exactly keys/u);
  assert.throws(() => validateReviewResult(page, { ...valid, extra: true }), /expected exactly keys/u);

  const minorIssue = {
    severity: "minor",
    category: "language-quality",
    location: "not-a-supplied-location",
    evidence: "A concrete fragment.",
    reason: "A concrete reason.",
    suggestedCorrection: "A concrete correction."
  } as const;
  assert.throws(() => validateReviewResult(page, {
    ...valid,
    status: "review",
    languageQuality: "review",
    issues: [minorIssue]
  }), /unsupplied location/u);
  assert.throws(() => validateReviewResult(page, {
    ...valid,
    status: "pass",
    languageQuality: "review"
  }), /no supporting language issue/u);

  const supportedMinorIssue = {
    ...minorIssue,
    location: `practice[0](${page.practice[0].id}).prompt`
  };
  assert.deepEqual(validateReviewResult(page, {
    ...valid,
    status: "pass",
    languageQuality: "pass",
    issues: [supportedMinorIssue]
  }), {
    ...valid,
    status: "review",
    languageQuality: "review",
    issues: [supportedMinorIssue]
  });

  const fabricatedIssue = {
    severity: "major",
    category: "mathematical-correctness",
    location: `practice[0](${page.practice[0].id}).prompt`,
    evidence: "Recalculation confirms that the displayed answer is correct.",
    reason: "The item is mathematically correct.",
    suggestedCorrection: "No correction needed for this item."
  } as const;
  assert.throws(() => validateReviewResult(page, {
    ...valid,
    status: "fail",
    mathematicalContent: "fail",
    issues: [fabricatedIssue]
  }), /no correction is needed/u);

  const optionalOnlyIssue = {
    ...fabricatedIssue,
    evidence: "The calculation is correct, but the prose could be expanded.",
    reason: "The current wording remains understandable.",
    suggestedCorrection: "No correction is needed; optionally add one intermediate sentence."
  };
  assert.throws(() => validateReviewResult(page, {
    ...valid,
    status: "fail",
    mathematicalContent: "fail",
    issues: [optionalOnlyIssue]
  }), /suggests no change/u);

  const selfRefutingMathematicalIssue = {
    ...fabricatedIssue,
    evidence: "The worked example is mathematically correct and has no mathematical error.",
    reason: "The phrasing is slightly awkward but not mathematically wrong.",
    suggestedCorrection: "No mathematical correction needed. The worked example is correct."
  };
  assert.throws(() => validateReviewResult(page, {
    ...valid,
    status: "fail",
    mathematicalContent: "fail",
    issues: [selfRefutingMathematicalIssue]
  }), /suggests no change/u);

  const hiddenKeyLanguageIssue = {
    severity: "major",
    category: "mathematical-correctness",
    location: `practice[2](${page.practice[2].id}).storedAnswer`,
    evidence: "The hidden storedAnswer is English while the displayed page is Simplified Chinese.",
    reason: "The canonical answer should use the learner's language.",
    suggestedCorrection: "Translate the storedAnswer into Simplified Chinese."
  } as const;
  assert.throws(() => validateReviewResult(page, {
    ...valid,
    status: "fail",
    mathematicalContent: "fail",
    issues: [hiddenKeyLanguageIssue]
  }), /hidden canonical key's language/u);

  const measurementPage = reviewPages("zhHans", "hong-kong").find(
    (candidate) => candidate.topic.id === "p1-measurement-time"
  );
  assert.ok(measurementPage);
  const crossScriptAliasIssue = {
    severity: "major",
    category: "mathematical-correctness",
    location: `practice[1](pq-p1-measurement-time-2).acceptedAnswers`,
    evidence: "The hidden acceptedAnswers include the Traditional variant 3時 on a Simplified Chinese page.",
    reason: "The accepted answer alias uses a different character variant.",
    suggestedCorrection: "Remove the cross-script accepted answer alias."
  } as const;
  assert.throws(() => validateReviewResult(measurementPage, {
    ...passingResult(measurementPage),
    status: "fail",
    mathematicalContent: "fail",
    issues: [crossScriptAliasIssue]
  }), /semantically equivalent hidden accepted-answer alias/u);

  const moneyPage = reviewPages("zhHans", "hong-kong").find(
    (candidate) => candidate.topic.id === "p2-money-time"
  );
  assert.ok(moneyPage);
  const lenientCurrencyAliasIssue = {
    severity: "major",
    category: "mathematical-correctness",
    location: `practice[3](supp-p2-money-time-key-fact).acceptedAnswers`,
    evidence: "The hidden acceptedAnswers include the bare number 4 and 4元 without the HK$ currency label.",
    reason: "The aliases omit the currency unit even though the prompt already fixes Hong Kong dollars.",
    suggestedCorrection: "Remove the bare numeric and unit-only accepted aliases."
  } as const;
  assert.throws(() => validateReviewResult(moneyPage, {
    ...passingResult(moneyPage),
    status: "fail",
    mathematicalContent: "fail",
    issues: [lenientCurrencyAliasIssue]
  }), /semantically equivalent hidden accepted-answer alias/u);

  const falseHalfPastClockIssue = {
    severity: "major",
    category: "mathematical-correctness",
    location: "practice[4](supp-p2-money-time-guided-example).prompt",
    evidence: "At 2:30 the hour hand is not exactly in the middle between 2 and 3; it is closer to 3.",
    reason: "The word halfway is inaccurate for 2:30.",
    suggestedCorrection: "Say that the hour hand is between 2 and 3 instead."
  } as const;
  assert.throws(() => validateReviewResult(moneyPage, {
    ...passingResult(moneyPage),
    status: "fail",
    mathematicalContent: "fail",
    issues: [falseHalfPastClockIssue]
  }), /contradicts exact half-past clock geometry/u);

  const selfWithdrawingIssue = {
    ...fabricatedIssue,
    evidence: "The worked example appears mathematically correct on closer inspection.",
    reason: "All five questions also appear correct.",
    suggestedCorrection: "Re-examine all content before final submission."
  };
  assert.throws(() => validateReviewResult(page, {
    ...valid,
    status: "fail",
    mathematicalContent: "fail",
    issues: [selfWithdrawingIssue]
  }), /suggests no change|refutes a defect/u);

  const lengthUnitPage = reviewPages("zhHans", "hong-kong").find(
    (candidate) => candidate.topic.id === "p3-measurement"
  );
  assert.ok(lengthUnitPage);
  const lenientLengthAliasIssueAtQuestionLocation = {
    severity: "major",
    category: "interaction-or-feedback",
    location: "practice[1](pq-p3-measurement-2)",
    evidence: "The acceptedAnswers list includes the bare numeric 1000 without the millilitre unit.",
    reason: "Accepting a bare number without the unit rewards an incomplete answer.",
    suggestedCorrection: "Remove 1000 from acceptedAnswers so only values with the unit are accepted."
  } as const;
  assert.throws(() => validateReviewResult(lengthUnitPage, {
    ...passingResult(lengthUnitPage),
    status: "fail",
    interactionContent: "fail",
    issues: [lenientLengthAliasIssueAtQuestionLocation]
  }), /semantically equivalent hidden accepted-answer alias/u);

  const scaffoldRepetitionIssue = {
    severity: "major",
    category: "mathematical-correctness",
    location: "practice[3](supp-p3-measurement-key-fact).prompt",
    evidence: "This question repeats the same litre-to-millilitre skill as practice[1] and only changes the value from 1 to 2.",
    reason: "The two questions lack differentiation and waste a practice opportunity.",
    suggestedCorrection: "Replace it with a different conversion direction."
  } as const;
  assert.throws(() => validateReviewResult(lengthUnitPage, {
    ...passingResult(lengthUnitPage),
    status: "fail",
    mathematicalContent: "fail",
    issues: [scaffoldRepetitionIssue]
  }), /intentional retrieval or near-transfer scaffold/u);

  const subjectiveStrategyIssue = {
    severity: "major",
    category: "mathematical-correctness",
    location: "practice[2](supp-p3-measurement-first-step).prompt",
    evidence: "This is a subjective metacognitive item rather than a numerical calculation.",
    reason: "It is not a mathematics question and has no uniquely correct answer.",
    suggestedCorrection: "Replace the strategy question with a numerical unit-conversion calculation."
  } as const;
  assert.throws(() => validateReviewResult(lengthUnitPage, {
    ...passingResult(lengthUnitPage),
    status: "fail",
    mathematicalContent: "fail",
    issues: [subjectiveStrategyIssue]
  }), /first-step strategy item/u);

  const concreteStrategyAmbiguity = {
    ...subjectiveStrategyIssue,
    evidence: "Displayed option 2 is also reasonably correct because it states the same valid first step in equivalent words.",
    reason: "Two displayed options are reasonably correct, so the item has no uniquely correct option.",
    suggestedCorrection: "Rewrite displayed option 2 so that only one strategy is valid."
  };
  assert.doesNotThrow(() => validateReviewResult(lengthUnitPage, {
    ...passingResult(lengthUnitPage),
    status: "fail",
    mathematicalContent: "fail",
    issues: [concreteStrategyAmbiguity]
  }));

  const geometryPage = reviewPages("zhHans", "hong-kong").find(
    (candidate) => candidate.topic.id === "p3-geometry-patterns"
  );
  assert.ok(geometryPage);
  const workedExampleHeadingPreference = {
    severity: "minor",
    category: "language-quality",
    location: "blocks[1](worked-example).content",
    evidence: "The example explains the reasoning in prose but has no literal headings.",
    reason: "A worked example should include a complete Problem/Solution/Answer structure.",
    suggestedCorrection: "Add explicit Problem, Solution, and Answer headings."
  } as const;
  assert.throws(() => validateReviewResult(geometryPage, {
    ...passingResult(geometryPage),
    status: "review",
    languageQuality: "review",
    issues: [workedExampleHeadingPreference]
  }), /optional worked-example headings/u);

  const decimalPage = reviewPages("zhHans", "hong-kong").find(
    (candidate) => candidate.topic.id === "p4-decimals"
  );
  assert.ok(decimalPage);
  const internalDiagramConfigurationIssue = {
    severity: "major",
    category: "interaction-or-feedback",
    location: "practice[2](graph-p4-decimals-number-line).diagram",
    evidence: "The raw diagram coordinate configuration contains pointValue 3.7 and therefore reveals the answer.",
    reason: "Internal diagram data make the graph self-answering.",
    suggestedCorrection: "Remove pointValue from the diagram configuration."
  } as const;
  assert.throws(() => validateReviewResult(decimalPage, {
    ...passingResult(decimalPage),
    status: "fail",
    interactionContent: "fail",
    issues: [internalDiagramConfigurationIssue]
  }), /internal diagram configuration/u);

  const coordinatesPage = reviewPages("zhHans", "hong-kong").find(
    (candidate) => candidate.topic.id === "coordinates"
  );
  assert.ok(coordinatesPage);
  const speculativeMissingRenderIssue = {
    severity: "major",
    category: "visual-or-representation",
    location: "practice[2](q28).diagram",
    evidence: "Only raw coordinate configuration is supplied, so the diagram may not produce a visible grid or line.",
    reason: "There is no assurance that the production renderer displays the graph; if the graph is indeed rendered, this issue is void.",
    suggestedCorrection: "Verify the production rendering pipeline or add hypothetical showGrid and showAxes flags."
  } as const;
  assert.throws(() => validateReviewResult(coordinatesPage, {
    ...passingResult(coordinatesPage),
    status: "fail",
    mathematicalContent: "fail",
    issues: [speculativeMissingRenderIssue]
  }), /speculates that valid runtime diagram configuration/u);

  const fractionPage = reviewPages("zhHans", "hong-kong").find(
    (candidate) => candidate.topic.id === "p5-fractions-operations"
  );
  assert.ok(fractionPage);
  const fractionNotationPreference = {
    severity: "minor",
    category: "language-quality",
    location: "practice[0](pq-p5-fractions-operations-1).prompt",
    evidence: "The fraction uses forward-slash notation such as 1 / 2.",
    reason: "Fractions should use stacked LaTeX notation instead of a slash.",
    suggestedCorrection: "Replace 1 / 2 with \\frac{1}{2}."
  } as const;
  assert.throws(() => validateReviewResult(fractionPage, {
    ...passingResult(fractionPage),
    status: "review",
    languageQuality: "review",
    issues: [fractionNotationPreference]
  }), /equivalent unambiguous fraction notation/u);

  const volumePage = reviewPages("zhHans", "hong-kong").find(
    (candidate) => candidate.topic.id === "p5-volume"
  );
  assert.ok(volumePage);
  const crossLocationCorrection = {
    severity: "major",
    category: "mathematical-correctness",
    location: "practice[2](graph-p5-volume-cube).prompt",
    evidence: "The formula wording elsewhere is allegedly unclear.",
    reason: "A different question should be rewritten.",
    suggestedCorrection: "Change practice[0] to ask for a different rectangular prism."
  } as const;
  assert.throws(() => validateReviewResult(volumePage, {
    ...passingResult(volumePage),
    status: "fail",
    mathematicalContent: "fail",
    issues: [crossLocationCorrection]
  }), /different practice location/u);

  const averagesPage = reviewPages("zhHans", "hong-kong").find(
    (candidate) => candidate.topic.id === "p5-charts-averages"
  );
  assert.ok(averagesPage);
  const hyphenatedNearTransferPreference = {
    severity: "major",
    category: "mathematical-correctness",
    location: "practice[4](supp-p5-charts-averages-guided-example).prompt",
    evidence: "This item is near-identical to practice[0] and uses the same operation.",
    reason: "It differs only in the numbers and has low assessment value.",
    suggestedCorrection: "Replace it with a different question type."
  } as const;
  assert.throws(() => validateReviewResult(averagesPage, {
    ...passingResult(averagesPage),
    status: "fail",
    mathematicalContent: "fail",
    issues: [hyphenatedNearTransferPreference]
  }), /intentional retrieval or near-transfer scaffold/u);

  const acceptedIndependentAnswerMarkedFail = structuredClone(valid);
  acceptedIndependentAnswerMarkedFail.status = "fail";
  acceptedIndependentAnswerMarkedFail.mathematicalContent = "fail";
  acceptedIndependentAnswerMarkedFail.independentQuestionChecks[0].answerMatch = "fail";
  assert.throws(
    () => validateReviewResult(page, acceptedIndependentAnswerMarkedFail),
    /production grader accepts the independently derived answer/u
  );

  const rejectedIndependentAnswerMarkedPass = structuredClone(valid);
  rejectedIndependentAnswerMarkedPass.independentQuestionChecks[0].independentAnswer = "__definitely_wrong_answer__";
  assert.throws(
    () => validateReviewResult(page, rejectedIndependentAnswerMarkedPass),
    /production grader rejects the independently derived answer/u
  );

  const speculativeRuntimeIssue = {
    severity: "major",
    category: "interaction-or-feedback",
    location: `practice[2](${page.practice[2].id}).correctAnswerShownAfterWrongAttempt`,
    evidence: "runtimeSelectionChecks show acceptedByProductionGrader, but submittedOptionValue may use another script variant.",
    reason: "The production grader may reject the learner's displayed selection.",
    suggestedCorrection: "Change the grader despite its observed exact-one accepted option."
  } as const;
  assert.throws(() => validateReviewResult(page, {
    ...valid,
    status: "fail",
    interactionContent: "fail",
    issues: [speculativeRuntimeIssue]
  }), /contradicts the observed production grader/u);

  const subjectiveDistractorIssue = {
    severity: "major",
    category: "mathematical-correctness",
    location: `practice[0](${page.practice[0].id}).options[1]`,
    evidence: "The wrong option is an off-by-one distractor and is not a plausible standard misconception.",
    reason: "It has no clear pedagogical rationale and weakens diagnostic quality.",
    suggestedCorrection: "Replace it with my preferred wrong option."
  } as const;
  assert.throws(() => validateReviewResult(page, {
    ...valid,
    status: "fail",
    mathematicalContent: "fail",
    issues: [subjectiveDistractorIssue]
  }), /diagnostic distractor preference/u);

  const traditionalNoChangeIssue = {
    ...fabricatedIssue,
    evidence: "經獨立驗算，此題的答案和講解均正確無誤。",
    reason: "此題無缺陷。",
    suggestedCorrection: "無需修正。"
  };
  assert.throws(() => validateReviewResult(page, {
    ...valid,
    status: "fail",
    mathematicalContent: "fail",
    issues: [traditionalNoChangeIssue]
  }), /no correction is needed/u);

  const traditionalPage = reviewPages("zh", "pep-primary")[0];
  const traditionalPassingResult = passingResult(traditionalPage);
  const reversedTargetScriptIssue = {
    severity: "major",
    category: "translation-fidelity",
    location: "whole-page",
    evidence: "The page is rendered in Traditional Chinese when the reference requires Simplified Chinese.",
    reason: "Traditional Chinese is used instead of Simplified Chinese throughout the page.",
    suggestedCorrection: "Convert all learner-facing text from Traditional Chinese to Simplified Chinese."
  } as const;
  assert.throws(() => validateReviewResult(traditionalPage, {
    ...traditionalPassingResult,
    status: "fail",
    languageQuality: "fail",
    issues: [reversedTargetScriptIssue]
  }), /reverses the declared Traditional-Chinese target script/u);

  const blockContentLocation = allowedIssueLocations(page)
    .find((location) => /^blocks\[\d+\].*\.content$/u.test(location));
  assert.ok(blockContentLocation);
  const wrongLocationIssue = {
    ...fabricatedIssue,
    location: blockContentLocation,
    evidence: "The current worked example actually uses the correct multiplication sign. The defect is only in the practice explanations.",
    reason: "The issue is only in another supplied location.",
    suggestedCorrection: "Replace x in all five practice explanations."
  };
  assert.throws(() => validateReviewResult(page, {
    ...valid,
    status: "fail",
    mathematicalContent: "fail",
    issues: [wrongLocationIssue]
  }), /refutes a defect at its own location/u);

  assert.ok(allowedIssueLocations(page).includes(`practice[0](${page.practice[0].id}).prompt`));
});

test("review summaries reject structurally or semantically tampered cache records", () => {
  const language = "zhHans" as const;
  const model = "deepseek-v4-pro";
  const page = reviewPages(language, "hong-kong")[0];
  const result = passingResult(page);
  const record = {
    topicId: page.topic.id,
    scope: page.scope,
    language,
    contentHash: page.contentHash,
    reviewedAt: "2026-08-09T00:00:00.000Z",
    provider: "DeepSeek" as const,
    model,
    reviewContractVersion,
    result
  };
  const validStore = {
    schemaVersion: 2 as const,
    language,
    generatedAt: "2026-08-09T00:00:00.000Z",
    records: { [page.topic.id]: record }
  } as Parameters<typeof summaryFor>[1];
  assert.deepEqual(summaryFor([page], validStore, language, model), {
    expectedPageCount: 1,
    currentReviewedPageCount: 1,
    missingPageCount: 0,
    staleRecordCount: 0,
    passCount: 1,
    reviewCount: 0,
    failCount: 0,
    issueCount: 0,
    answerMismatchCount: 0,
    dimensionNonpassCount: 0,
    gateStatus: "passed",
    gatePassed: true
  });

  const tamperedStore = structuredClone(validStore);
  tamperedStore.records[page.topic.id].result.independentQuestionChecks = [];
  const tamperedSummary = summaryFor([page], tamperedStore, language, model);
  assert.equal(tamperedSummary.currentReviewedPageCount, 0);
  assert.equal(tamperedSummary.missingPageCount, 1);
  assert.equal(tamperedSummary.staleRecordCount, 1);
  assert.equal(tamperedSummary.gatePassed, false);
});
