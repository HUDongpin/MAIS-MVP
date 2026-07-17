import assert from "node:assert/strict";
import test from "node:test";
import {
  adaptiveMasteryPrior,
  buildKnowledgeComponents,
  classifyAdaptiveLLMError,
  composeAdaptiveDecisionFromCandidate,
  createInitialAdaptiveSkillState,
  generateAdaptiveCandidates,
  selectNextAdaptiveAction,
  updateAdaptiveState,
  validateLLMAdaptiveRecommendation
} from "./adaptiveLearning";
import { buildLLMProviderRequestBody } from "./server/llmProvider";
import type { AdaptiveLearningCandidate, AdaptiveLLMRecommendation, AdaptiveSkillState, PublicQuestion, Topic } from "@/types";

const now = "2026-05-13T00:00:00.000Z";
const topics: Topic[] = [
  {
    id: "fractions",
    curriculumTrack: "HK",
    grade: "S1",
    title: { en: "Fractions", zh: "分數" },
    description: { en: "Operate with fractions.", zh: "分數運算。" },
    status: "in-progress",
    difficulty: "Medium",
    minutes: 20,
    mastery: 45
  }
];
const questions: PublicQuestion[] = [
  {
    id: "fractions-foundation-1",
    curriculumTrack: "HK",
    grade: "S1",
    topicId: "fractions",
    topic: topics[0].title,
    difficulty: "Low",
    type: "multiple-choice",
    prompt: { en: "Foundation fraction item", zh: "分數基礎題" }
  },
  {
    id: "fractions-core-1",
    curriculumTrack: "HK",
    grade: "S1",
    topicId: "fractions",
    topic: topics[0].title,
    difficulty: "Medium",
    type: "fill-in",
    prompt: { en: "Core fraction item", zh: "分數核心題" }
  },
  {
    id: "fractions-challenge-1",
    curriculumTrack: "HK",
    grade: "S1",
    topicId: "fractions",
    topic: topics[0].title,
    difficulty: "High",
    type: "short-answer",
    prompt: { en: "Challenge fraction item", zh: "分數挑戰題" }
  },
  {
    id: "fractions-exam-1",
    curriculumTrack: "HK",
    grade: "S1",
    topicId: "fractions",
    topic: topics[0].title,
    difficulty: "High",
    type: "graph",
    prompt: { en: "Exam fraction item", zh: "分數考試題" }
  }
];
const components = buildKnowledgeComponents({ topics, questions });

function state(overrides: Partial<AdaptiveSkillState> & { skillId: string }): AdaptiveSkillState {
  return {
    ...createInitialAdaptiveSkillState(overrides.skillId, now),
    ...overrides
  };
}

function zeroEvidenceScenario(status: Topic["status"], grade: Topic["grade"] = "P1") {
  const scenarioTopics: Topic[] = [
    {
      id: `${grade.toLowerCase()}-zero-evidence`,
      curriculumTrack: "HK",
      grade,
      title: { en: `${grade} zero evidence`, zh: `${grade} 零證據` },
      description: { en: "Synthetic zero-evidence topic.", zh: "合成零證據課題。" },
      status,
      difficulty: "Medium",
      minutes: 20,
      mastery: 0
    }
  ];
  const scenarioQuestions: PublicQuestion[] = [
    {
      id: `${scenarioTopics[0].id}-foundation`,
      curriculumTrack: "HK",
      grade,
      topicId: scenarioTopics[0].id,
      topic: scenarioTopics[0].title,
      difficulty: "Low",
      type: "multiple-choice",
      prompt: { en: "Foundation diagnostic", zh: "基礎診斷" }
    },
    {
      id: `${scenarioTopics[0].id}-core`,
      curriculumTrack: "HK",
      grade,
      topicId: scenarioTopics[0].id,
      topic: scenarioTopics[0].title,
      difficulty: "Medium",
      type: "short-answer",
      prompt: { en: "Core diagnostic", zh: "核心診斷" }
    }
  ];

  return {
    scenarioTopics,
    scenarioQuestions,
    scenarioComponents: buildKnowledgeComponents({ topics: scenarioTopics, questions: scenarioQuestions })
  };
}

function recommendationFor(candidate: AdaptiveLearningCandidate): AdaptiveLLMRecommendation {
  return {
    selectedCandidateId: candidate.candidateId,
    questionIds: candidate.questionIds.slice(0, 2),
    learnerReason: { en: "This candidate is the best guarded next step.", zh: "這個候選方案是最合適的受防護下一步。" },
    teacherAuditNote: { en: "Selected from the provided candidates only.", zh: "只從已提供的候選方案中選取。" },
    signalsUsed: ["mastery probability", "guardrail agreement", "question ids"],
    confidenceExplanation: { en: "The recommendation preserves the BKT guardrails.", zh: "此建議保留 BKT 防護規則。" }
  };
}

test("adaptive state increases after correct evidence and drops after wrong evidence", () => {
  const initial = createInitialAdaptiveSkillState("fractions:foundation", now);
  const correct = updateAdaptiveState({ state: initial, correct: true, now });
  const wrong = updateAdaptiveState({ state: initial, correct: false, now });

  assert.ok(correct.pMastery > adaptiveMasteryPrior);
  assert.ok(wrong.pMastery < adaptiveMasteryPrior);
  assert.equal(correct.correctStreak, 1);
  assert.equal(wrong.wrongStreak, 1);
});

test("prerequisite gaps choose repair before harder material", () => {
  const decision = selectNextAdaptiveAction({
    components,
    states: [
      state({ skillId: "fractions:foundation", pMastery: 0.42, attemptCount: 3, wrongStreak: 2 }),
      state({ skillId: "fractions:fluency", pMastery: 0.72, attemptCount: 2 })
    ],
    topics,
    questions,
    topicId: "fractions",
    now
  });

  assert.equal(decision?.action, "repair");
  assert.equal(decision?.skill.id, "fractions:foundation");
});

test("zero-history HK students do not get repair-required as the first step", () => {
  const p1LessonScenario = zeroEvidenceScenario("not-started", "P1");
  const p1LessonDecision = selectNextAdaptiveAction({
    components: p1LessonScenario.scenarioComponents,
    states: [],
    topics: p1LessonScenario.scenarioTopics,
    questions: p1LessonScenario.scenarioQuestions,
    now
  });

  assert.equal(p1LessonDecision?.action, "lesson");
  assert.ok(!p1LessonDecision?.guardFlags.includes("repair-required"));

  const s3PracticeScenario = zeroEvidenceScenario("in-progress", "S3");
  const s3PracticeDecision = selectNextAdaptiveAction({
    components: s3PracticeScenario.scenarioComponents,
    states: [],
    topics: s3PracticeScenario.scenarioTopics,
    questions: s3PracticeScenario.scenarioQuestions,
    now
  });

  assert.equal(s3PracticeDecision?.action, "practice");
  assert.ok(!s3PracticeDecision?.guardFlags.includes("repair-required"));
});

test("due reviews outrank new content", () => {
  const decision = selectNextAdaptiveAction({
    components,
    states: [
      state({ skillId: "fractions:foundation", pMastery: 0.9, attemptCount: 4, correctStreak: 3, nextReviewAt: "2026-05-12T00:00:00.000Z" }),
      state({ skillId: "fractions:fluency", pMastery: 0.35, attemptCount: 0 })
    ],
    topics,
    questions,
    now
  });

  assert.equal(decision?.action, "review");
  assert.equal(decision?.skill.id, "fractions:foundation");
});

test("strong mastery unlocks challenge", () => {
  const decision = selectNextAdaptiveAction({
    components,
    states: components.map((component) =>
      state({
        skillId: component.id,
        pMastery: 0.92,
        attemptCount: 6,
        correctStreak: 3,
        nextReviewAt: "2026-05-20T00:00:00.000Z"
      })
    ),
    topics,
    questions,
    now
  });

  assert.equal(decision?.action, "challenge");
  assert.equal(decision?.skill.id, "fractions:transfer");
  assert.ok(decision?.questions.every((question) => question.topicId === "fractions"));
  assert.ok(decision?.questions.length);
  assert.ok(decision?.questions.every((question) => question.difficulty === "High"));
});

test("strong mastery does not emit challenge when no challenge or exam items exist", () => {
  const easyQuestions = questions.filter((question) => question.difficulty === "Low" || question.difficulty === "Medium");
  const easyComponents = buildKnowledgeComponents({ topics, questions: easyQuestions });
  const generated = generateAdaptiveCandidates({
    components: easyComponents,
    states: easyComponents.map((component) =>
      state({
        skillId: component.id,
        pMastery: 0.92,
        attemptCount: 6,
        correctStreak: 3
      })
    ),
    topics,
    questions: easyQuestions,
    now
  });
  const decision = selectNextAdaptiveAction({
    components: easyComponents,
    states: easyComponents.map((component) =>
      state({
        skillId: component.id,
        pMastery: 0.92,
        attemptCount: 6,
        correctStreak: 3
      })
    ),
    topics,
    questions: easyQuestions,
    now
  });

  assert.ok(!generated.candidates.some((candidate) => candidate.action === "challenge"));
  assert.notEqual(decision?.action, "challenge");
  assert.equal(decision?.action, "practice");
  assert.ok((decision?.questions.length ?? 0) > 0);
  assert.ok(decision?.questions.every((question) => question.difficulty === "Low" || question.difficulty === "Medium"));
});

test("explanations match the selected adaptive action", () => {
  const decision = selectNextAdaptiveAction({
    components,
    states: [
      state({ skillId: "fractions:foundation", pMastery: 0.9, attemptCount: 4, correctStreak: 3, nextReviewAt: "2026-05-12T00:00:00.000Z" })
    ],
    topics,
    questions,
    now
  });

  assert.equal(decision?.action, "review");
  assert.match(decision?.explanation.en ?? "", /spaced retrieval/i);
  assert.equal(decision?.evidence[0]?.label.en, "Mastery probability");
});

test("candidate generation preserves review and repair guard priority", () => {
  const generated = generateAdaptiveCandidates({
    components,
    states: [
      state({ skillId: "fractions:foundation", pMastery: 0.9, attemptCount: 4, correctStreak: 3, nextReviewAt: "2026-05-12T00:00:00.000Z" }),
      state({ skillId: "fractions:fluency", pMastery: 0.4, attemptCount: 3, wrongStreak: 2 })
    ],
    topics,
    questions,
    now
  });

  assert.equal(generated.candidates[0]?.action, "review");
  assert.ok(generated.candidates.some((candidate) => candidate.hardGuardFlags.includes("repair-required")));
  assert.equal(generated.deterministicCandidateId, generated.candidates[0]?.candidateId);

  const deterministicReview = generated.candidates[0];
  assert.ok(deterministicReview);
  const validated = validateLLMAdaptiveRecommendation({
    recommendation: recommendationFor(deterministicReview),
    candidates: generated.candidates
  });

  assert.equal(validated.valid, true);
});

test("valid LLM rerank is accepted and may reorder candidate question ids", () => {
  const generated = generateAdaptiveCandidates({
    components,
    states: components.map((component) =>
      state({
        skillId: component.id,
        pMastery: 0.92,
        attemptCount: 6,
        correctStreak: 3,
        nextReviewAt: "2026-05-20T00:00:00.000Z"
      })
    ),
    topics,
    questions,
    now
  });
  const candidate = generated.candidates.find((item) => item.action === "challenge") ?? generated.candidates[0];
  assert.ok(candidate);
  const reorderedQuestionIds = [...candidate.questionIds].reverse().slice(0, 2);
  const recommendation: AdaptiveLLMRecommendation = {
    selectedCandidateId: candidate.candidateId,
    questionIds: reorderedQuestionIds,
    learnerReason: { en: "You are ready for a guarded challenge.", zh: "你已準備好接受受防護的挑戰。" },
    teacherAuditNote: { en: "Selected from generated challenge candidate.", zh: "從已生成的挑戰候選方案中選取。" },
    signalsUsed: ["mastery probability", "correct streak"],
    confidenceExplanation: { en: "BKT mastery and streak are both strong.", zh: "BKT 掌握度和連續答對證據均強。" }
  };

  const validated = validateLLMAdaptiveRecommendation({
    recommendation,
    candidates: generated.candidates
  });

  assert.equal(validated.valid, true);
  assert.ok(validated.recommendation?.questionIds);
  assert.deepEqual(validated.recommendation.questionIds.slice(0, reorderedQuestionIds.length), reorderedQuestionIds);
});

test("LLM-assisted decisions include bounded local AI confidence metadata", () => {
  const generated = generateAdaptiveCandidates({
    components,
    states: components.map((component) =>
      state({
        skillId: component.id,
        pMastery: 0.92,
        attemptCount: 8,
        correctStreak: 4,
        nextReviewAt: "2026-05-20T00:00:00.000Z"
      })
    ),
    topics,
    questions,
    now
  });
  const candidate = generated.candidates.find((item) => item.candidateId === generated.deterministicCandidateId) ?? generated.candidates[0];
  assert.ok(candidate);

  const decision = composeAdaptiveDecisionFromCandidate({
    candidate,
    deterministicCandidateId: generated.deterministicCandidateId,
    skillMap: generated.skillMap,
    dueReviews: generated.dueReviews,
    candidateSignature: generated.candidateSignature,
    now,
    llmStatus: "ready",
    llmRecommendation: recommendationFor(candidate)
  });

  assert.equal(decision.engine.mode, "llm-assisted");
  assert.ok(decision.engine.aiConfidence);
  assert.ok(decision.engine.aiConfidence.score >= 0);
  assert.ok(decision.engine.aiConfidence.score <= 1);
  assert.equal(decision.engine.aiConfidence.label.en, "High confidence");
  assert.match(decision.engine.aiConfidence.criteria.en, /Calculated locally/);
});

test("thin evidence caps AI confidence below high confidence", () => {
  const generated = generateAdaptiveCandidates({
    components,
    states: [state({ skillId: "fractions:foundation", pMastery: 0.35, attemptCount: 0 })],
    topics,
    questions,
    now
  });
  const candidate = generated.candidates.find((item) => item.candidateId === generated.deterministicCandidateId) ?? generated.candidates[0];
  assert.ok(candidate);

  const decision = composeAdaptiveDecisionFromCandidate({
    candidate,
    deterministicCandidateId: generated.deterministicCandidateId,
    skillMap: generated.skillMap,
    dueReviews: generated.dueReviews,
    candidateSignature: generated.candidateSignature,
    now,
    llmStatus: "ready",
    llmRecommendation: recommendationFor(candidate)
  });

  assert.equal(decision.confidence, "thin");
  assert.ok(decision.engine.aiConfidence);
  assert.ok(decision.engine.aiConfidence.score <= 0.69);
  assert.equal(decision.engine.aiConfidence.label.en, "Cautious confidence");
});

test("invalid LLM candidate id is rejected so deterministic fallback remains available", () => {
  const generated = generateAdaptiveCandidates({
    components,
    states: [state({ skillId: "fractions:foundation", pMastery: 0.35, attemptCount: 0 })],
    topics,
    questions,
    now
  });
  const validated = validateLLMAdaptiveRecommendation({
    recommendation: {
      selectedCandidateId: "lesson:unknown-skill",
      learnerReason: { en: "Try this.", zh: "試試這個。" },
      teacherAuditNote: { en: "Invalid.", zh: "無效。" },
      signalsUsed: ["candidate"],
      confidenceExplanation: { en: "Invalid.", zh: "無效。" }
    },
    candidates: generated.candidates
  });
  const deterministic = selectNextAdaptiveAction({
    components,
    states: [state({ skillId: "fractions:foundation", pMastery: 0.35, attemptCount: 0 })],
    topics,
    questions,
    now
  });

  assert.equal(validated.valid, false);
  assert.equal(validated.reason, "candidate-not-generated");
  assert.equal(deterministic?.engine.mode, "deterministic");
  assert.equal(deterministic?.deterministic, true);
});

test("LLM cannot introduce generated or unknown question ids", () => {
  const generated = generateAdaptiveCandidates({
    components,
    states: [state({ skillId: "fractions:foundation", pMastery: 0.35, attemptCount: 0 })],
    topics,
    questions,
    now
  });
  const candidate = generated.candidates[0];
  assert.ok(candidate);

  const validated = validateLLMAdaptiveRecommendation({
    recommendation: {
      selectedCandidateId: candidate.candidateId,
      questionIds: [candidate.questionIds[0] ?? "", "llm-generated-question"],
      learnerReason: { en: "Try this.", zh: "試試這個。" },
      teacherAuditNote: { en: "Includes a generated question.", zh: "包含生成題目。" },
      signalsUsed: ["question ids"],
      confidenceExplanation: { en: "Unsafe.", zh: "不安全。" }
    },
    candidates: generated.candidates
  });

  assert.equal(validated.valid, false);
  assert.equal(validated.reason, "question-not-in-candidate");
});

test("challenge rerank is rejected when repair guard is active", () => {
  const generated = generateAdaptiveCandidates({
    components,
    states: [
      state({ skillId: "fractions:foundation", pMastery: 0.42, attemptCount: 3, wrongStreak: 2 }),
      state({ skillId: "fractions:fluency", pMastery: 0.92, attemptCount: 6, correctStreak: 3 }),
      state({ skillId: "fractions:transfer", pMastery: 0.92, attemptCount: 6, correctStreak: 3 })
    ],
    topics,
    questions,
    now
  });
  const challenge = generated.candidates.find((candidate) => candidate.action === "challenge");
  assert.ok(challenge);

  const validated = validateLLMAdaptiveRecommendation({
    recommendation: {
      selectedCandidateId: challenge.candidateId,
      questionIds: challenge.questionIds,
      learnerReason: { en: "Try a challenge.", zh: "試試挑戰題。" },
      teacherAuditNote: { en: "Repair guard should block this.", zh: "修補防護應阻止此選項。" },
      signalsUsed: ["mastery probability"],
      confidenceExplanation: { en: "Blocked by repair guard.", zh: "被修補防護阻止。" }
    },
    candidates: generated.candidates
  });

  assert.equal(validated.valid, false);
  assert.equal(validated.reason, "repair-required");
});

test("new attempt evidence changes the candidate signature used for cache freshness", () => {
  const initialState = state({ skillId: "fractions:foundation", pMastery: 0.35, attemptCount: 0 });
  const before = generateAdaptiveCandidates({
    components,
    states: [initialState],
    topics,
    questions,
    now
  });
  const after = generateAdaptiveCandidates({
    components,
    states: [updateAdaptiveState({ state: initialState, correct: false, now })],
    topics,
    questions,
    now
  });

  assert.notEqual(before.candidateSignature, after.candidateSignature);
  assert.match(before.candidateSignature, /^hybrid-v3\|/);
  assert.match(after.candidateSignature, /^hybrid-v3\|/);
});

test("adaptive LLM error classification separates format failures from guardrail rejections", () => {
  assert.equal(classifyAdaptiveLLMError("rejected", "missing-selected-candidate"), "format");
  assert.equal(classifyAdaptiveLLMError("rejected", "invalid-json"), "format");
  assert.equal(classifyAdaptiveLLMError("rejected", "candidate-not-generated"), "guardrail");
  assert.equal(classifyAdaptiveLLMError("rejected", "question-not-in-candidate"), "guardrail");
  assert.equal(classifyAdaptiveLLMError("failed", "Adaptive LLM refresh rate limit exceeded."), "rate-limit");
});

test("adaptive LLM request body uses JSON mode without changing default DeepSeek thinking", () => {
  const messages = [{ role: "user" as const, content: "Return JSON." }];
  const adaptiveDeepSeekBody = buildLLMProviderRequestBody({
    model: "deepseek-v4-pro",
    messages,
    maxTokens: 1200,
    provider: "deepseek",
    responseFormat: "json_object",
    deepSeekThinking: "disabled"
  }) as Record<string, unknown>;
  const defaultDeepSeekBody = buildLLMProviderRequestBody({
    model: "deepseek-v4-pro",
    messages,
    maxTokens: 500,
    provider: "deepseek"
  }) as Record<string, unknown>;
  const adaptiveQwenBody = buildLLMProviderRequestBody({
    model: "qwen3.7-max",
    messages,
    maxTokens: 1200,
    provider: "qwen",
    responseFormat: "json_object"
  }) as Record<string, unknown>;

  assert.deepEqual(adaptiveDeepSeekBody.response_format, { type: "json_object" });
  assert.deepEqual(adaptiveDeepSeekBody.thinking, { type: "disabled" });
  assert.equal("reasoning_effort" in adaptiveDeepSeekBody, false);
  assert.equal(adaptiveDeepSeekBody.max_tokens, 1200);
  assert.deepEqual(defaultDeepSeekBody.thinking, { type: "enabled" });
  assert.equal(defaultDeepSeekBody.reasoning_effort, "high");
  assert.deepEqual(adaptiveQwenBody.response_format, { type: "json_object" });
  assert.equal(adaptiveQwenBody.max_tokens, 1200);
});

test("disabled LLM status keeps the composed decision deterministic", () => {
  const generated = generateAdaptiveCandidates({
    components,
    states: [state({ skillId: "fractions:foundation", pMastery: 0.35, attemptCount: 0 })],
    topics,
    questions,
    now
  });
  const candidate = generated.candidates[0];
  assert.ok(candidate);

  const decision = composeAdaptiveDecisionFromCandidate({
    candidate,
    deterministicCandidateId: generated.deterministicCandidateId,
    skillMap: generated.skillMap,
    dueReviews: generated.dueReviews,
    candidateSignature: generated.candidateSignature,
    now,
    llmStatus: "disabled"
  });

  assert.equal(decision.deterministic, true);
  assert.equal(decision.engine.mode, "deterministic");
  assert.equal(decision.engine.llmStatus, "disabled");
  assert.equal(decision.engine.aiConfidence, undefined);
});
