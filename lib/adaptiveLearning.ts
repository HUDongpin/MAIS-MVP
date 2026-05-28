import type {
  AdaptiveActionType,
  AdaptiveAIConfidence,
  AdaptiveConfidence,
  AdaptiveEvidence,
  AdaptiveEngineMetadata,
  AdaptiveLearningCandidate,
  AdaptiveLearningDecision,
  AdaptiveLLMRecommendation,
  AdaptiveSkillState,
  AdaptiveSkillSummary,
  Difficulty,
  KnowledgeComponent,
  LessonSummary,
  PublicQuestion,
  Topic
} from "@/types";

export const adaptiveMasteryPrior = 0.35;
export const adaptiveLearnProbability = 0.12;
export const adaptiveSlipProbability = 0.1;
export const adaptiveGuessProbability = 0.2;
export const adaptiveMasteryThreshold = 0.85;
export const adaptiveRepairThreshold = 0.55;
export const adaptivePrerequisiteThreshold = 0.65;
export const adaptiveQuestionSetSize = 5;

const reviewIntervalsDays = [1, 3, 7, 14] as const;
const difficultyRanks: Record<Difficulty, number> = {
  Foundation: 0,
  Core: 1,
  Challenge: 2,
  Exam: 3
};
const skillStages = ["foundation", "fluency", "transfer"] as const;

type SkillStage = (typeof skillStages)[number];
type AdaptiveSelection = {
  action: AdaptiveActionType;
  summary: AdaptiveSkillSummary;
  baseScore: number;
  hardGuardFlags: AdaptiveLearningCandidate["hardGuardFlags"];
};

type KnowledgeComponentTopic = Pick<Topic, "id" | "grade" | "title" | "description" | "difficulty">;
type KnowledgeComponentQuestion = Pick<PublicQuestion, "id" | "topicId" | "difficulty" | "type">;

function clampProbability(value: number) {
  if (!Number.isFinite(value)) return adaptiveMasteryPrior;
  return Math.max(0.01, Math.min(0.99, Number(value.toFixed(3))));
}

function addDays(now: Date, days: number) {
  const next = new Date(now);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString();
}

function skillId(topicId: string, stage: SkillStage) {
  return `${topicId}:${stage}`;
}

function stageTitle(topic: KnowledgeComponentTopic, stage: SkillStage) {
  if (stage === "foundation") {
    return {
      en: `${topic.title.en} foundation`,
      zh: `${topic.title.zh}基礎`
    };
  }

  if (stage === "fluency") {
    return {
      en: `${topic.title.en} fluency`,
      zh: `${topic.title.zh}熟練`
    };
  }

  return {
    en: `${topic.title.en} transfer`,
    zh: `${topic.title.zh}遷移應用`
  };
}

function stageDescription(topic: KnowledgeComponentTopic, stage: SkillStage) {
  if (stage === "foundation") {
    return {
      en: `Build the core concepts needed for ${topic.title.en}.`,
      zh: `建立${topic.title.zh}所需的核心概念。`
    };
  }

  if (stage === "fluency") {
    return {
      en: `Practise accurate, steady work on ${topic.title.en}.`,
      zh: `練習準確而穩定地處理${topic.title.zh}。`
    };
  }

  return {
    en: `Apply ${topic.title.en} in unfamiliar or exam-style situations.`,
    zh: `把${topic.title.zh}應用於陌生或考試情境。`
  };
}

function stageDifficulty(topic: KnowledgeComponentTopic, stage: SkillStage): Difficulty {
  if (stage === "foundation") return "Foundation";
  if (stage === "fluency") return topic.difficulty === "Foundation" ? "Core" : topic.difficulty;
  return topic.difficulty === "Exam" ? "Exam" : "Challenge";
}

function questionIdsForStage(questions: KnowledgeComponentQuestion[], stage: SkillStage) {
  const stageQuestions = questions.filter((question) => {
    if (stage === "foundation") return question.difficulty === "Foundation" || question.difficulty === "Core";
    if (stage === "fluency") return question.difficulty === "Core" || question.difficulty === "Challenge";
    return question.difficulty === "Challenge" || question.difficulty === "Exam" || question.type === "graph";
  });

  return (stageQuestions.length ? stageQuestions : questions).map((question) => question.id);
}

function misconceptionTagsForStage(topicId: string, questions: KnowledgeComponentQuestion[], stage: SkillStage) {
  const typeTags = Array.from(new Set(questions.map((question) => `${question.type}-error`))).sort();
  const stageTag = stage === "foundation" ? "concept-gap" : stage === "fluency" ? "procedure-slip" : "transfer-gap";
  return [`${topicId}-${stageTag}`, ...typeTags].slice(0, 5);
}

export function buildKnowledgeComponents({
  topics,
  questions
}: {
  topics: KnowledgeComponentTopic[];
  questions: KnowledgeComponentQuestion[];
}): KnowledgeComponent[] {
  return topics.flatMap((topic) => {
    const topicQuestions = questions.filter((question) => question.topicId === topic.id);
    return skillStages.map((stage, index): KnowledgeComponent => ({
      id: skillId(topic.id, stage),
      topicId: topic.id,
      grade: topic.grade,
      title: stageTitle(topic, stage),
      description: stageDescription(topic, stage),
      prerequisites: index === 0 ? [] : [skillId(topic.id, skillStages[index - 1])],
      difficulty: stageDifficulty(topic, stage),
      misconceptionTags: misconceptionTagsForStage(topic.id, topicQuestions, stage),
      questionIds: questionIdsForStage(topicQuestions, stage)
    }));
  });
}

export function createInitialAdaptiveSkillState(skillIdValue: string, now: Date | string = new Date()): AdaptiveSkillState {
  const timestamp = new Date(now).toISOString();
  return {
    skillId: skillIdValue,
    pMastery: adaptiveMasteryPrior,
    attemptCount: 0,
    correctStreak: 0,
    wrongStreak: 0,
    lastPracticedAt: null,
    nextReviewAt: null,
    hintCount: 0,
    misconceptionTags: [],
    updatedAt: timestamp
  };
}

export function scheduleReview(state: Pick<AdaptiveSkillState, "pMastery" | "correctStreak">, now: Date | string = new Date()) {
  if (state.pMastery < adaptiveMasteryThreshold || state.correctStreak <= 0) return null;
  const intervalIndex = Math.min(reviewIntervalsDays.length - 1, Math.max(0, state.correctStreak - 1));
  return addDays(new Date(now), reviewIntervalsDays[intervalIndex]);
}

export function updateAdaptiveState({
  state,
  correct,
  now = new Date(),
  hintUsed = false,
  misconceptionTags = []
}: {
  state: AdaptiveSkillState;
  correct: boolean;
  now?: Date | string;
  hintUsed?: boolean;
  misconceptionTags?: string[];
}): AdaptiveSkillState {
  const pKnown = clampProbability(state.pMastery);
  const evidenceProbability = correct
    ? (pKnown * (1 - adaptiveSlipProbability)) /
      (pKnown * (1 - adaptiveSlipProbability) + (1 - pKnown) * adaptiveGuessProbability)
    : (pKnown * adaptiveSlipProbability) /
      (pKnown * adaptiveSlipProbability + (1 - pKnown) * (1 - adaptiveGuessProbability));
  const nextMastery = clampProbability(evidenceProbability + (1 - evidenceProbability) * adaptiveLearnProbability);
  const nextCorrectStreak = correct ? state.correctStreak + 1 : 0;
  const nextWrongStreak = correct ? 0 : state.wrongStreak + 1;
  const timestamp = new Date(now).toISOString();
  const mergedMisconceptionTags = Array.from(new Set([
    ...state.misconceptionTags,
    ...(correct ? [] : misconceptionTags)
  ])).slice(0, 8);
  const nextState: AdaptiveSkillState = {
    ...state,
    pMastery: nextMastery,
    attemptCount: state.attemptCount + 1,
    correctStreak: nextCorrectStreak,
    wrongStreak: nextWrongStreak,
    lastPracticedAt: timestamp,
    nextReviewAt: null,
    hintCount: state.hintCount + (hintUsed ? 1 : 0),
    misconceptionTags: mergedMisconceptionTags,
    updatedAt: timestamp
  };

  return {
    ...nextState,
    nextReviewAt: scheduleReview(nextState, now)
  };
}

function stateForSkill(states: AdaptiveSkillState[], skill: KnowledgeComponent, now: Date | string) {
  return states.find((state) => state.skillId === skill.id) ?? createInitialAdaptiveSkillState(skill.id, now);
}

function confidenceFor(state: AdaptiveSkillState): AdaptiveConfidence {
  if (state.attemptCount < 2) return "thin";
  if (state.attemptCount < 5) return "developing";
  return "strong";
}

function confidenceTierLabel(confidence: AdaptiveConfidence) {
  const labels: Record<AdaptiveConfidence, { en: string; zh: string }> = {
    thin: { en: "thin", zh: "薄弱" },
    developing: { en: "developing", zh: "累積中" },
    strong: { en: "strong", zh: "充足" }
  };
  return labels[confidence];
}

function masteryPercent(state: AdaptiveSkillState) {
  return `${Math.round(state.pMastery * 100)}%`;
}

function topicSortIndex(topics: Topic[]) {
  return new Map(topics.map((topic, index) => [topic.id, index]));
}

function sortSkillSummaries(summaries: AdaptiveSkillSummary[], topics: Topic[], focusTopicId?: string | null) {
  const topicIndex = topicSortIndex(topics);
  return [...summaries].sort((left, right) => {
    const leftFocus = focusTopicId && left.skill.topicId === focusTopicId ? 0 : 1;
    const rightFocus = focusTopicId && right.skill.topicId === focusTopicId ? 0 : 1;
    return (
      leftFocus - rightFocus ||
      (topicIndex.get(left.skill.topicId) ?? 999) - (topicIndex.get(right.skill.topicId) ?? 999) ||
      difficultyRanks[left.skill.difficulty] - difficultyRanks[right.skill.difficulty] ||
      left.skill.id.localeCompare(right.skill.id)
    );
  });
}

function questionDifficultyOrder(action: AdaptiveActionType, difficulty: Difficulty) {
  if (action === "challenge") return ["Exam", "Challenge", "Core", "Foundation"] satisfies Difficulty[];
  if (action === "repair" || action === "lesson") return ["Foundation", "Core", "Challenge", "Exam"] satisfies Difficulty[];

  return (["Foundation", "Core", "Challenge", "Exam"] as Difficulty[]).sort((left, right) => {
    const leftDistance = Math.abs(difficultyRanks[left] - difficultyRanks[difficulty]);
    const rightDistance = Math.abs(difficultyRanks[right] - difficultyRanks[difficulty]);
    return leftDistance - rightDistance || difficultyRanks[left] - difficultyRanks[right];
  });
}

export function selectAdaptiveQuestions({
  questions,
  skill,
  action,
  limit = adaptiveQuestionSetSize
}: {
  questions: PublicQuestion[];
  skill: KnowledgeComponent;
  action: AdaptiveActionType;
  limit?: number;
}) {
  const linkedIds = new Set(skill.questionIds);
  const linkedQuestions = questions.filter((question) => linkedIds.has(question.id));
  const topicQuestions = questions.filter((question) => question.topicId === skill.topicId);
  const candidates = linkedQuestions.length ? linkedQuestions : topicQuestions;
  const difficultyOrder = questionDifficultyOrder(action, skill.difficulty);

  return [...candidates]
    .sort((left, right) => {
      return (
        difficultyOrder.indexOf(left.difficulty) - difficultyOrder.indexOf(right.difficulty) ||
        left.type.localeCompare(right.type) ||
        left.id.localeCompare(right.id)
      );
    })
    .slice(0, limit);
}

function dueReviewSummaries(summaries: AdaptiveSkillSummary[], now: Date) {
  return summaries
    .filter((summary) => {
      if (!summary.state.nextReviewAt || summary.state.pMastery < adaptiveMasteryThreshold) return false;
      return new Date(summary.state.nextReviewAt).getTime() <= now.getTime();
    })
    .sort((left, right) => {
      const leftDue = left.state.nextReviewAt ? new Date(left.state.nextReviewAt).getTime() : Number.MAX_SAFE_INTEGER;
      const rightDue = right.state.nextReviewAt ? new Date(right.state.nextReviewAt).getTime() : Number.MAX_SAFE_INTEGER;
      return leftDue - rightDue || left.state.pMastery - right.state.pMastery || left.skill.id.localeCompare(right.skill.id);
    });
}

function prerequisiteRepairSummary(summaries: AdaptiveSkillSummary[], ordered: AdaptiveSkillSummary[]) {
  const byId = new Map(summaries.map((summary) => [summary.skill.id, summary]));

  for (const summary of ordered) {
    if (summary.state.pMastery >= adaptiveMasteryThreshold) continue;
    const weakPrerequisite = summary.skill.prerequisites
      .map((id) => byId.get(id))
      .find((candidate): candidate is AdaptiveSkillSummary =>
        Boolean(candidate && candidate.state.pMastery < adaptivePrerequisiteThreshold)
      );
    if (weakPrerequisite) return weakPrerequisite;
  }

  return null;
}

function attemptedRepairSummary(ordered: AdaptiveSkillSummary[]) {
  return ordered
    .filter((summary) =>
      summary.state.attemptCount > 0 &&
      (summary.state.pMastery < adaptiveRepairThreshold || summary.state.wrongStreak >= 2)
    )
    .sort((left, right) => left.state.pMastery - right.state.pMastery || right.state.wrongStreak - left.state.wrongStreak)[0] ?? null;
}

function lessonSummary(ordered: AdaptiveSkillSummary[]) {
  return ordered.find((summary) => summary.state.attemptCount === 0 && summary.topic.status === "not-started") ?? null;
}

function practiceSummary(ordered: AdaptiveSkillSummary[]) {
  return ordered.find((summary) => summary.state.pMastery < adaptiveMasteryThreshold) ?? null;
}

function challengeSummary(ordered: AdaptiveSkillSummary[]) {
  return ordered.find((summary) => summary.state.pMastery >= adaptiveMasteryThreshold && summary.state.correctStreak >= 2) ?? null;
}

function candidateIdFor(action: AdaptiveActionType, summary: AdaptiveSkillSummary) {
  return `${action}:${summary.skill.id}`;
}

function uniqueSelections(selections: Array<AdaptiveSelection | null>) {
  const seen = new Set<string>();
  return selections.filter((selection): selection is AdaptiveSelection => {
    if (!selection) return false;
    const key = candidateIdFor(selection.action, selection.summary);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function candidateSignatureFor({
  candidates,
  grade,
  topicId
}: {
  candidates: AdaptiveLearningCandidate[];
  grade?: Topic["grade"];
  topicId?: string | null;
}) {
  const candidateParts = candidates.map((candidate) => {
    const state = candidate.summary.state;
    return [
      candidate.candidateId,
      candidate.questionIds.join(","),
      state.pMastery,
      state.attemptCount,
      state.correctStreak,
      state.wrongStreak,
      state.nextReviewAt ?? "none",
      candidate.hardGuardFlags.join(",")
    ].join(":");
  });
  return ["hybrid-v3", grade ?? "all", topicId ?? "none", ...candidateParts].join("|");
}

export function explainAdaptiveDecision({
  action,
  summary,
  confidence,
  dueReviews
}: {
  action: AdaptiveActionType;
  summary: AdaptiveSkillSummary;
  confidence: AdaptiveConfidence;
  dueReviews: AdaptiveSkillSummary[];
}): { explanation: AdaptiveLearningDecision["explanation"]; evidence: AdaptiveEvidence[] } {
  const mastery = masteryPercent(summary.state);
  const confidenceDetail =
    confidence === "thin"
      ? {
          en: "Evidence is still thin, so the engine is choosing a safe diagnostic step.",
          zh: "目前證據仍少，因此引擎選擇較穩妥的診斷步驟。"
        }
      : confidence === "developing"
        ? {
            en: "Evidence is developing across several attempts.",
            zh: "已有數次作答，證據正在累積。"
          }
        : {
            en: "Evidence is strong enough for a confident next step.",
            zh: "證據已足夠支持較有信心的下一步。"
          };
  const actionCopy: Record<AdaptiveActionType, AdaptiveLearningDecision["explanation"]> = {
    review: {
      en: `${summary.skill.title.en} is due for spaced retrieval before new work.`,
      zh: `${summary.skill.title.zh}已到間隔提取複習時間，應先複習再學新內容。`
    },
    repair: {
      en: `${summary.skill.title.en} needs a repair step before moving to harder material.`,
      zh: `${summary.skill.title.zh}需要先修補，再進入較難內容。`
    },
    practice: {
      en: `${summary.skill.title.en} is the best next practice target.`,
      zh: `${summary.skill.title.zh}是目前最合適的下一個練習目標。`
    },
    lesson: {
      en: `${summary.skill.title.en} has limited evidence, so start with a guided lesson and diagnostic practice.`,
      zh: `${summary.skill.title.zh}證據有限，先由導學課節和診斷練習開始。`
    },
    challenge: {
      en: `${summary.skill.title.en} shows mastery evidence, so challenge work is appropriate.`,
      zh: `${summary.skill.title.zh}已有掌握證據，可以進入挑戰題。`
    }
  };

  return {
    explanation: {
      en: `${actionCopy[action].en} ${confidenceDetail.en}`,
      zh: `${actionCopy[action].zh}${confidenceDetail.zh}`
    },
    evidence: [
      {
        label: { en: "Mastery probability", zh: "掌握概率" },
        value: mastery,
        detail: { en: "Bayesian knowledge tracing estimate", zh: "貝葉斯知識追蹤估算" }
      },
      {
        label: { en: "Attempts", zh: "作答次數" },
        value: String(summary.state.attemptCount),
        detail: { en: `${summary.state.correctStreak} correct streak, ${summary.state.wrongStreak} wrong streak`, zh: `${summary.state.correctStreak} 次連續答對，${summary.state.wrongStreak} 次連續答錯` }
      },
      {
        label: { en: "Review queue", zh: "複習隊列" },
        value: String(dueReviews.length),
        detail: { en: "Skills currently due for spaced retrieval", zh: "目前到期需間隔提取的技能" }
      }
    ]
  };
}

export function generateAdaptiveCandidates({
  components,
  states,
  topics,
  lessons = [],
  questions = [],
  grade,
  topicId,
  now = new Date()
}: {
  components: KnowledgeComponent[];
  states: AdaptiveSkillState[];
  topics: Topic[];
  lessons?: LessonSummary[];
  questions?: PublicQuestion[];
  grade?: Topic["grade"];
  topicId?: string | null;
  now?: Date | string;
}): {
  candidates: AdaptiveLearningCandidate[];
  deterministicCandidateId: string;
  skillMap: AdaptiveSkillSummary[];
  dueReviews: AdaptiveSkillSummary[];
  candidateSignature: string;
} {
  const nowDate = new Date(now);
  const topicById = new Map(topics.map((topic) => [topic.id, topic]));
  const eligibleComponents = components.filter((component) => {
    const topic = topicById.get(component.topicId);
    if (!topic) return false;
    if (grade && component.grade !== grade) return false;
    return true;
  });
  const summaries = eligibleComponents
    .map((skill): AdaptiveSkillSummary | null => {
      const topic = topicById.get(skill.topicId);
      if (!topic) return null;
      return {
        skill,
        state: stateForSkill(states, skill, nowDate),
        topic
      };
    })
    .filter((summary): summary is AdaptiveSkillSummary => Boolean(summary));

  if (!summaries.length) {
    return {
      candidates: [],
      deterministicCandidateId: "",
      skillMap: [],
      dueReviews: [],
      candidateSignature: candidateSignatureFor({ candidates: [], grade, topicId })
    };
  }

  const ordered = sortSkillSummaries(summaries, topics, topicId);
  const dueReviews = dueReviewSummaries(summaries, nowDate);
  const dueReview = dueReviews[0] ?? null;
  const prerequisiteRepair = prerequisiteRepairSummary(summaries, ordered);
  const attemptedRepair = attemptedRepairSummary(ordered);
  const lesson = lessonSummary(ordered);
  const practice = practiceSummary(ordered);
  const challenge = challengeSummary(ordered);
  const fallback = ordered[0];
  const selections = uniqueSelections([
    dueReview
      ? {
          action: "review",
          summary: dueReview,
          baseScore: 100,
          hardGuardFlags: ["due-review"]
        }
      : null,
    prerequisiteRepair
      ? {
          action: "repair",
          summary: prerequisiteRepair,
          baseScore: 95,
          hardGuardFlags: ["weak-prerequisite", "repair-required"]
        }
      : null,
    attemptedRepair
      ? {
          action: "repair",
          summary: attemptedRepair,
          baseScore: 90,
          hardGuardFlags: ["repair-required"]
        }
      : null,
    lesson
      ? {
          action: "lesson",
          summary: lesson,
          baseScore: 72,
          hardGuardFlags: ["new-lesson"]
        }
      : null,
    practice
      ? {
          action: "practice",
          summary: practice,
          baseScore: 60,
          hardGuardFlags: ["mastery-practice"]
        }
      : null,
    challenge
      ? {
          action: "challenge",
          summary: challenge,
          baseScore: 48,
          hardGuardFlags: ["challenge-ready"]
        }
      : null,
    fallback
      ? {
          action: "practice",
          summary: fallback,
          baseScore: 10,
          hardGuardFlags: ["fallback"]
        }
      : null
  ]);
  const candidates = selections.map((selection): AdaptiveLearningCandidate => {
    const lessonForTopic = lessons.find((candidate) => candidate.topicId === selection.summary.skill.topicId) ?? null;
    const explanation = explainAdaptiveDecision({
      action: selection.action,
      summary: selection.summary,
      confidence: confidenceFor(selection.summary.state),
      dueReviews
    });
    const candidateQuestions = selectAdaptiveQuestions({
      questions,
      skill: selection.summary.skill,
      action: selection.action
    });

    return {
      candidateId: candidateIdFor(selection.action, selection.summary),
      action: selection.action,
      baseScore: selection.baseScore,
      hardGuardFlags: selection.hardGuardFlags,
      skill: selection.summary.skill,
      topic: selection.summary.topic,
      lesson: lessonForTopic,
      questions: candidateQuestions,
      questionIds: candidateQuestions.map((question) => question.id),
      summary: selection.summary,
      evidence: explanation.evidence
    };
  });
  const deterministicCandidateId = candidates[0]?.candidateId ?? "";

  return {
    candidates,
    deterministicCandidateId,
    skillMap: ordered,
    dueReviews,
    candidateSignature: candidateSignatureFor({ candidates, grade, topicId })
  };
}

function questionsOrderedByIds(candidate: AdaptiveLearningCandidate, orderedQuestionIds?: string[]) {
  if (!orderedQuestionIds?.length) return candidate.questions;
  const byId = new Map(candidate.questions.map((question) => [question.id, question]));
  const selectedQuestions = orderedQuestionIds
    .map((questionId) => byId.get(questionId))
    .filter((question): question is PublicQuestion => Boolean(question));
  const selectedIds = new Set(selectedQuestions.map((question) => question.id));
  return [
    ...selectedQuestions,
    ...candidate.questions.filter((question) => !selectedIds.has(question.id))
  ].slice(0, candidate.questions.length);
}

function parseCandidateId(candidateId: string) {
  const separatorIndex = candidateId.indexOf(":");
  if (separatorIndex < 0) return null;
  const action = candidateId.slice(0, separatorIndex) as AdaptiveActionType;
  const skillIdValue = candidateId.slice(separatorIndex + 1);
  const topicId = skillIdValue.split(":")[0] ?? "";
  return { action, skillId: skillIdValue, topicId };
}

function evidenceDepthScore(confidence: AdaptiveConfidence, attemptCount: number) {
  const tierBase: Record<AdaptiveConfidence, number> = {
    thin: 0.44,
    developing: 0.66,
    strong: 0.84
  };
  return Math.min(0.96, tierBase[confidence] + Math.min(Math.max(attemptCount, 0), 8) * 0.012);
}

function guardrailAgreementScore(candidate: AdaptiveLearningCandidate, deterministicCandidateId: string) {
  if (candidate.candidateId === deterministicCandidateId) {
    return {
      score: 1,
      label: {
        en: "exact BKT candidate agreement",
        zh: "與 BKT 確定候選完全一致"
      }
    };
  }

  const deterministic = parseCandidateId(deterministicCandidateId);
  if (deterministic?.action === candidate.action) {
    return {
      score: 0.86,
      label: {
        en: "same-action guardrail alignment",
        zh: "與同一行動類型的防護規則一致"
      }
    };
  }

  if (deterministic?.skillId === candidate.skill.id) {
    return {
      score: 0.82,
      label: {
        en: "same-skill guardrail alignment",
        zh: "與同一技能的防護規則一致"
      }
    };
  }

  if (deterministic?.topicId === candidate.skill.topicId) {
    return {
      score: 0.74,
      label: {
        en: "same-topic guardrail alignment",
        zh: "與同一課題的防護規則一致"
      }
    };
  }

  return {
    score: 0.64,
    label: {
      en: "validated generated-candidate guardrails",
      zh: "通過已生成候選方案的防護驗證"
    }
  };
}

function masteryClarityScore(state: AdaptiveSkillState) {
  const nearestThresholdDistance = Math.min(
    Math.abs(state.pMastery - adaptiveRepairThreshold),
    Math.abs(state.pMastery - adaptivePrerequisiteThreshold),
    Math.abs(state.pMastery - adaptiveMasteryThreshold)
  );
  return Math.min(0.95, 0.5 + Math.min(nearestThresholdDistance / 0.2, 1) * 0.45);
}

function questionIntegrityScore(candidate: AdaptiveLearningCandidate, recommendation: AdaptiveLLMRecommendation) {
  if (!recommendation.questionIds?.length) return 1;
  const allowedIds = new Set(candidate.questionIds);
  const validCount = recommendation.questionIds.filter((questionId) => allowedIds.has(questionId)).length;
  return recommendation.questionIds.length ? validCount / recommendation.questionIds.length : 1;
}

function clampAIConfidenceScore(value: number, confidence: AdaptiveConfidence) {
  const confidenceCap: Record<AdaptiveConfidence, number> = {
    thin: 0.69,
    developing: 0.86,
    strong: 0.96
  };
  const capped = Math.min(confidenceCap[confidence], value);
  return Math.max(0, Math.min(1, Number(capped.toFixed(2))));
}

function aiConfidenceLabel(score: number) {
  if (score >= 0.85) return { en: "High confidence", zh: "高信心" };
  if (score >= 0.7) return { en: "Medium confidence", zh: "中等信心" };
  return { en: "Cautious confidence", zh: "謹慎信心" };
}

function calculateAIConfidence({
  candidate,
  deterministicCandidateId,
  recommendation,
  confidence
}: {
  candidate: AdaptiveLearningCandidate;
  deterministicCandidateId: string;
  recommendation: AdaptiveLLMRecommendation;
  confidence: AdaptiveConfidence;
}): AdaptiveAIConfidence {
  const attempts = candidate.summary.state.attemptCount;
  const evidenceScore = evidenceDepthScore(confidence, attempts);
  const guardrailAgreement = guardrailAgreementScore(candidate, deterministicCandidateId);
  const masteryScore = masteryClarityScore(candidate.summary.state);
  const integrityScore = questionIntegrityScore(candidate, recommendation);
  const rawScore = evidenceScore * 0.36 + guardrailAgreement.score * 0.3 + masteryScore * 0.22 + integrityScore * 0.12;
  const score = clampAIConfidenceScore(rawScore, confidence);
  const tierLabel = confidenceTierLabel(confidence);

  return {
    score,
    label: aiConfidenceLabel(score),
    criteria: {
      en: `Calculated locally from ${attempts} attempts (${tierLabel.en} evidence), ${guardrailAgreement.label.en}, mastery distance from repair/prerequisite/mastery thresholds, and validated question-ID integrity.`,
      zh: `本地根據 ${attempts} 次作答（${tierLabel.zh}證據）、${guardrailAgreement.label.zh}、掌握度與修補／先備／掌握門檻的距離，以及已驗證的題目 ID 完整性計算。`
    }
  };
}

export function composeAdaptiveDecisionFromCandidate({
  candidate,
  deterministicCandidateId,
  skillMap,
  dueReviews,
  candidateSignature,
  now = new Date(),
  llmStatus = "pending",
  llmRecommendation,
  provider,
  model,
  error,
  errorKind,
  finishReason
}: {
  candidate: AdaptiveLearningCandidate;
  deterministicCandidateId: string;
  skillMap: AdaptiveSkillSummary[];
  dueReviews: AdaptiveSkillSummary[];
  candidateSignature: string;
  now?: Date | string;
  llmStatus?: AdaptiveEngineMetadata["llmStatus"];
  llmRecommendation?: AdaptiveLLMRecommendation | null;
  provider?: string;
  model?: string;
  error?: string;
  errorKind?: AdaptiveEngineMetadata["errorKind"];
  finishReason?: string | null;
}): AdaptiveLearningDecision {
  const confidence = confidenceFor(candidate.summary.state);
  const explanation = explainAdaptiveDecision({
    action: candidate.action,
    summary: candidate.summary,
    confidence,
    dueReviews
  });
  const isLLMAssisted = Boolean(llmRecommendation && llmStatus === "ready");
  const aiConfidence = isLLMAssisted && llmRecommendation
    ? calculateAIConfidence({
        candidate,
        deterministicCandidateId,
        recommendation: llmRecommendation,
        confidence
      })
    : undefined;
  const engine: AdaptiveEngineMetadata = {
    version: "hybrid-v3",
    mode: isLLMAssisted ? "llm-assisted" : "deterministic",
    llmStatus,
    selectedCandidateId: candidate.candidateId,
    deterministicCandidateId,
    candidateSignature,
    ...(provider ? { provider } : {}),
    ...(model ? { model } : {}),
    ...(llmRecommendation?.teacherAuditNote ? { teacherAuditNote: llmRecommendation.teacherAuditNote } : {}),
    ...(llmRecommendation?.signalsUsed ? { signalsUsed: llmRecommendation.signalsUsed } : {}),
    ...(llmRecommendation?.confidenceExplanation ? { confidenceExplanation: llmRecommendation.confidenceExplanation } : {}),
    ...(aiConfidence ? { aiConfidence } : {}),
    ...(error ? { error } : {}),
    ...(errorKind ? { errorKind } : {}),
    ...(finishReason ? { finishReason } : {})
  };

  return {
    action: candidate.action,
    confidence,
    deterministic: !isLLMAssisted,
    evidenceCount: explanation.evidence.length,
    guardFlags: candidate.hardGuardFlags,
    nextReviewAt: candidate.summary.state.nextReviewAt,
    generatedAt: new Date(now).toISOString(),
    engine,
    skill: candidate.skill,
    topic: candidate.topic,
    lesson: candidate.lesson,
    questions: questionsOrderedByIds(candidate, llmRecommendation?.questionIds),
    skillMap,
    dueReviews,
    explanation: llmRecommendation?.learnerReason ?? explanation.explanation,
    evidence: explanation.evidence
  };
}

export function selectDeterministicAdaptiveDecision(options: Parameters<typeof generateAdaptiveCandidates>[0]): AdaptiveLearningDecision | null {
  const generated = generateAdaptiveCandidates(options);
  const candidate = generated.candidates.find((item) => item.candidateId === generated.deterministicCandidateId) ?? generated.candidates[0] ?? null;
  if (!candidate) return null;

  return composeAdaptiveDecisionFromCandidate({
    candidate,
    deterministicCandidateId: generated.deterministicCandidateId,
    skillMap: generated.skillMap,
    dueReviews: generated.dueReviews,
    candidateSignature: generated.candidateSignature,
    now: options.now,
    llmStatus: "pending"
  });
}

function isLocalizedText(value: unknown): value is { en: string; zh: string } {
  const text = value as Partial<{ en: unknown; zh: unknown }> | null;
  return typeof text?.en === "string" && text.en.trim().length > 0 && typeof text.zh === "string" && text.zh.trim().length > 0;
}

function cleanSignalList(value: unknown) {
  if (!Array.isArray(value)) return null;
  const signals = value
    .filter((signal): signal is string => typeof signal === "string" && signal.trim().length > 0)
    .map((signal) => signal.trim().slice(0, 120))
    .slice(0, 8);
  return signals.length ? signals : null;
}

export function validateLLMAdaptiveRecommendation({
  recommendation,
  candidates
}: {
  recommendation: unknown;
  candidates: AdaptiveLearningCandidate[];
}): {
  valid: boolean;
  reason?: string;
  candidate?: AdaptiveLearningCandidate;
  recommendation?: AdaptiveLLMRecommendation;
} {
  const record = recommendation as Partial<AdaptiveLLMRecommendation> | null;
  if (!record || typeof record.selectedCandidateId !== "string") {
    return { valid: false, reason: "missing-selected-candidate" };
  }

  const candidate = candidates.find((item) => item.candidateId === record.selectedCandidateId);
  if (!candidate) return { valid: false, reason: "candidate-not-generated" };

  if (candidates.some((item) => item.hardGuardFlags.includes("due-review")) && candidate.action !== "review") {
    return { valid: false, reason: "due-review-required" };
  }

  if (candidates.some((item) => item.hardGuardFlags.includes("repair-required")) && candidate.action !== "repair") {
    return { valid: false, reason: "repair-required" };
  }

  if (candidate.action === "challenge" && !candidate.hardGuardFlags.includes("challenge-ready")) {
    return { valid: false, reason: "challenge-not-guarded" };
  }

  const candidateQuestionIds = new Set(candidate.questionIds);
  const requestedQuestionIds = Array.isArray(record.questionIds)
    ? record.questionIds.filter((questionId): questionId is string => typeof questionId === "string")
    : [];
  if (requestedQuestionIds.some((questionId) => !candidateQuestionIds.has(questionId))) {
    return { valid: false, reason: "question-not-in-candidate" };
  }

  if (!isLocalizedText(record.learnerReason)) return { valid: false, reason: "missing-learner-reason" };
  if (!isLocalizedText(record.teacherAuditNote)) return { valid: false, reason: "missing-teacher-audit-note" };
  if (!isLocalizedText(record.confidenceExplanation)) return { valid: false, reason: "missing-confidence-explanation" };
  const signalsUsed = cleanSignalList(record.signalsUsed);
  if (!signalsUsed) return { valid: false, reason: "missing-signals-used" };

  return {
    valid: true,
    candidate,
    recommendation: {
      selectedCandidateId: candidate.candidateId,
      questionIds: requestedQuestionIds.length
        ? [
            ...requestedQuestionIds,
            ...candidate.questionIds.filter((questionId) => !requestedQuestionIds.includes(questionId))
          ]
        : candidate.questionIds,
      learnerReason: record.learnerReason,
      teacherAuditNote: record.teacherAuditNote,
      signalsUsed,
      confidenceExplanation: record.confidenceExplanation
    }
  };
}

const adaptiveFormatFailureReasons = new Set([
  "empty-reply",
  "invalid-json",
  "missing-selected-candidate",
  "missing-learner-reason",
  "missing-teacher-audit-note",
  "missing-confidence-explanation",
  "missing-signals-used"
]);
const adaptiveGuardrailFailureReasons = new Set([
  "candidate-not-generated",
  "due-review-required",
  "repair-required",
  "challenge-not-guarded",
  "question-not-in-candidate"
]);

export function classifyAdaptiveLLMError(
  status: AdaptiveEngineMetadata["llmStatus"],
  error?: string | null
): AdaptiveEngineMetadata["errorKind"] | undefined {
  if (!error) return undefined;
  if (adaptiveFormatFailureReasons.has(error)) return "format";
  if (adaptiveGuardrailFailureReasons.has(error)) return "guardrail";
  if (status === "disabled" || error.includes("Missing LLM_API_KEY") || error.includes("OPENAI_API_KEY")) return "configuration";
  if (error.toLowerCase().includes("rate limit")) return "rate-limit";
  return "provider";
}

export function selectNextAdaptiveAction(options: Parameters<typeof generateAdaptiveCandidates>[0]): AdaptiveLearningDecision | null {
  return selectDeterministicAdaptiveDecision(options);
}
