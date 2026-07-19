"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "@/components/ui/Motion";
import { PracticeArenaBackToTopButton } from "@/app/practice/PracticeArenaBackToTopButton";
import { PracticeAdventureArenaShell } from "@/components/practice/PracticeAdventureArenaShell";
import {
  resolvePracticeAdventureGradeLock,
  type PracticeAdventureGradeFilter
} from "@/components/practice/practiceAdventureGrades";
import { practiceTextForLanguage } from "@/components/practice/hjbPracticeEnglish";
import { dictionary, useSettings } from "@/components/providers/AppProviders";
import { grades } from "@/data/grades";
import {
  classifyPracticeIslandTopic,
  mastersKeepUnlockStarTotal,
  practiceIslandRegions,
  practiceIslandStarTotalMax,
  type PracticeIslandRegionId
} from "@/data/practiceIslandRegions";
import {
  awardPracticeIslandStars,
  mergePracticeIslandStarRecords,
  practiceIslandStarStorageKey,
  practiceIslandStarTotal,
  practiceIslandStarsForAccuracy,
  readPracticeIslandStarRecord,
  type PracticeIslandStarRecord
} from "@/lib/practiceIslandProgress";
import { curriculumProfileForTrack, curriculumTrackForProfile } from "@/lib/curriculumProfile";
import { visibleDifficultiesForSelection } from "@/lib/difficulty";
import { formatDifficultyLabel, formatGradeLabelForCurriculum } from "@/lib/i18n";
import { lessonHrefForSlug } from "@/lib/lessonLinks";
import {
  completedPracticeRoundStorageKey,
  practiceAdventureRoundStorageKey,
  studentPracticeGameHrefs
} from "@/lib/gameBasedLearning";
import { dedupePracticeQuestions } from "@/lib/practiceQuestionDeduping";
import {
  playPracticeSound,
  practiceSoundStorageKey,
  readPracticeSoundEnabled
} from "@/lib/practiceSound";
import {
  isYoungLearnerPracticeRound,
  youngPracticePraise,
  youngPracticeStarLine,
  youngPracticeTip
} from "@/lib/youngLearnerPractice";
import { cn } from "@/lib/utils";
import type {
  AdaptiveActionType,
  AdaptiveLearningDecision,
  AttemptFeedback,
  Difficulty,
  Language,
  LessonDetail,
  LocalizedText,
  PublicQuestion,
  QuestionType
} from "@/types";

type GradeFilter = PracticeAdventureGradeFilter;
type DifficultyFilter = Difficulty | "all";
type QuestionTypeFilter = QuestionType | "all";
const practiceQuestionTypeOptions: QuestionType[] = ["multiple-choice", "fill-in", "short-answer", "graph"];
const practiceQuestionTypeLabels: Record<QuestionType, LocalizedText> = {
  "multiple-choice": { en: "Multiple choice", zh: "選擇題", zhHans: "选择题" },
  "fill-in": { en: "Fill in", zh: "填空題", zhHans: "填空题" },
  "short-answer": { en: "Short answer", zh: "短答題", zhHans: "短答题" },
  graph: { en: "Graph", zh: "圖像題", zhHans: "图像题" }
};
type TopicOption = Pick<PublicQuestion, "grade" | "topic">;
type QuestionCatalogTopic = TopicOption & {
  topicId: string;
  questionCount: number;
};
type RoutePracticeContext = {
  lessonSlug: string | null;
  topicId: string | null;
};
type LessonPracticeContext = {
  topicId: string;
  lessonTitle?: LocalizedText;
};
type PracticeAnswerResult = {
  correct: boolean;
  correctAnswer?: string;
  durationSeconds: number;
  answeredAt: number;
};
type PracticeAnswerSummaryItem = PracticeAnswerResult & {
  question: PublicQuestion;
  questionNumber: number;
};
type PracticeSummaryMode = "adaptive" | "free-selection";
type PracticeRoundSummary = {
  answeredCount: number;
  averageSeconds: number;
  accuracyPercent: number;
  correctCount: number;
  correctQuestionIds: string[];
  isComplete: boolean;
  isSingleTopicRound: boolean;
  results: PracticeAnswerSummaryItem[];
  roundKey: string;
  roundQuestionIds: string[];
  topic: LocalizedText | null;
  topicId: string | null;
  totalQuestions: number;
  totalSeconds: number;
  wrongResults: PracticeAnswerSummaryItem[];
};
type PracticeGameRoundPayload = {
  topicId: string;
  roundQuestionIds: string[];
  correctRoundQuestionIds: string[];
  roundQuestions?: PublicQuestion[];
  accuracyPercent: number;
  roundKey: string;
};
type PracticeGameUnlockStatus = {
  roundKey: string;
  loading: boolean;
  canStartAdventure: boolean;
  canStartFishing: boolean;
  reason: string;
};
type AdventureIslandEligibility = {
  eligible: boolean;
  reason: "ready" | "need-round-context" | "need-attempts" | "need-accuracy" | "mixed-topic" | "already-completed" | "invalid-round";
  alreadyCompleted: boolean;
  postAdventurePracticeEligible: boolean;
  topicId: string | null;
  roundKey: string;
  attemptCount: number;
  correctCount: number;
  accuracyPercent: number;
};
type PracticePagerAnswerResult = {
  question: PublicQuestion;
  feedback: AttemptFeedback;
  durationSeconds: number;
  questionNumber: number;
};
type LazyPracticeQuestionCardProps = {
  question: PublicQuestion;
  onAnswered?: (question: PublicQuestion, feedback: AttemptFeedback) => void;
};

const PracticeQuestionCard = dynamic<LazyPracticeQuestionCardProps>(
  () => import("@/components/practice/PracticeQuestionCard").then((module) => module.PracticeQuestionCard),
  {
    loading: () => (
      <div className="glass-panel min-h-72 animate-pulse p-5" aria-hidden="true">
        <div className="h-6 w-44 rounded-full bg-slate-200/80 dark:bg-white/10" />
        <div className="mt-5 h-8 w-3/4 rounded-full bg-slate-200/80 dark:bg-white/10" />
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="h-14 rounded-2xl bg-slate-200/70 dark:bg-white/10" />
          <div className="h-14 rounded-2xl bg-slate-200/70 dark:bg-white/10" />
          <div className="h-14 rounded-2xl bg-slate-200/70 dark:bg-white/10" />
          <div className="h-14 rounded-2xl bg-slate-200/70 dark:bg-white/10" />
        </div>
      </div>
    )
  }
);

const requiredAdaptiveQuestionCount = 5;
const freeSelectionRoundQuestionCount = 5;
const autoAdvanceDelayMs = 1200;
const adaptiveUnlockStoragePrefix = "hk-math-practice-free-selection-unlocked";
const adaptiveStrongResultStoragePrefix = "hk-math-practice-strong-result";
const lastLessonStoragePrefix = "hk-math-practice-last-lesson";
const adventureRoundStorageKey = practiceAdventureRoundStorageKey;
const fishingRoundStorageKey = "hk-math-practice-fishing-round";
const practiceCelebrationColors = ["#06b6d4", "#8b5cf6", "#22c55e", "#f59e0b", "#ec4899", "#38bdf8"];
const practiceCelebrationPieces = Array.from({ length: 36 }, (_, index) => {
  const angle = ((index * 137.5) % 360) * (Math.PI / 180);
  const distance = 130 + (index % 6) * 22;

  return {
    id: index,
    x: Math.round(Math.cos(angle) * distance),
    y: Math.round(Math.sin(angle) * distance - 72 - (index % 4) * 12),
    rotate: (index % 2 === 0 ? 1 : -1) * (160 + index * 17),
    delay: (index % 9) * 0.035,
    size: 7 + (index % 4) * 3,
    color: practiceCelebrationColors[index % practiceCelebrationColors.length],
    rounded: index % 3 === 0
  };
});
const practiceSimplifiedTextReplacements = [
  ["闖", "闯"],
  ["輪", "轮"],
  ["綜", "综"],
  ["魚", "鱼"],
  ["錘", "锤"],
  ["隻", "只"],
  ["盃", "杯"]
] as const;
const adaptiveActionLabels: Record<AdaptiveActionType, LocalizedText> = {
  review: { en: "Spaced review", zh: "間隔重溫" },
  repair: { en: "Repair foundation", zh: "修補基礎" },
  practice: { en: "Targeted practice", zh: "針對練習" },
  lesson: { en: "Guided lesson", zh: "導學課節" },
  challenge: { en: "Challenge extension", zh: "挑戰延伸" }
};

function formatPracticeDuration(seconds: number, language: Language) {
  if (seconds < 60) return language === "en" ? `${seconds}s` : `${seconds} 秒`;

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (language === "en") return remainingSeconds ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  if (language === "zh-Hans") return remainingSeconds ? `${minutes} 分 ${remainingSeconds} 秒` : `${minutes} 分钟`;
  return remainingSeconds ? `${minutes} 分 ${remainingSeconds} 秒` : `${minutes} 分鐘`;
}

function normalizePracticeSimplifiedText(value: string, language: Language) {
  if (language !== "zh-Hans") return value;

  return practiceSimplifiedTextReplacements.reduce(
    (current, [source, replacement]) => current.split(source).join(replacement),
    value
  );
}

function practiceSummaryEncouragement(accuracyPercent: number) {
  if (accuracyPercent >= 80) {
    return {
      en: "Strong personalized round. The engine now has cleaner evidence for your next learning step.",
      zh: "這輪適性練習表現穩健。引擎已取得更清晰的證據，能安排下一步學習。"
    };
  }

  if (accuracyPercent >= 50) {
    return {
      en: "Useful practice data. A short review now will make the next personalized step more effective.",
      zh: "這些練習數據很有用。現在做一段短重溫，下一個適性步驟會更有效。"
    };
  }

  return {
    en: "This round found what to rebuild. Treat the misses as a map, not a judgement.",
    zh: "這輪找到了需要重建的地方。錯題是地圖，不是評價。"
  };
}

function learningMethodSuggestion(accuracyPercent: number, averageSeconds: number) {
  if (accuracyPercent < 50) {
    return {
      en: "Use example-first repair: reread one worked example, write the rule in your own words, then retry 2 similar questions without rushing.",
      zh: "用「例題先行」修補：重看一道例題，用自己的話寫出規則，再不趕時間重做 2 道相似題。"
    };
  }

  if (averageSeconds > 90) {
    return {
      en: "Keep accuracy first, then reduce load: mark the givens, choose one formula, and only then calculate.",
      zh: "先保準確，再減少負荷：標出已知條件，選定一條公式，然後才計算。"
    };
  }

  if (accuracyPercent >= 80) {
    return {
      en: "Switch to retrieval practice: close notes, solve one mixed question, then explain the shortcut you used.",
      zh: "轉用提取練習：合上筆記做一道混合題，再說明你用了哪個快捷方法。"
    };
  }

  return {
    en: "Alternate 2 review questions with 1 new question so the method stays active while difficulty grows.",
    zh: "用 2 道重溫題配 1 道新題，讓方法保持活躍，同時逐步提高難度。"
  };
}

function metacognitionSuggestion(accuracyPercent: number) {
  if (accuracyPercent < 50) {
    return {
      en: "Before checking, name the question type and the first operation. After checking, label the error: sign, formula, graph reading, or notation.",
      zh: "檢查前先說出題型和第一步。檢查後把錯因分類：符號、公式、讀圖或記號。"
    };
  }

  return {
    en: "Before each answer, predict your confidence from 1-5. Compare it with the result to calibrate judgement.",
    zh: "每題提交前先預測 1-5 分信心，再和結果比較，校準自己的判斷。"
  };
}

function emotionalSupportSuggestion(accuracyPercent: number) {
  if (accuracyPercent < 50) {
    return {
      en: "Take a short reset. One repaired misconception is a real win, even before the score rises.",
      zh: "先短暫重整。修好一個迷思概念已經是真正進步，不必等分數上升才算成功。"
    };
  }

  if (accuracyPercent >= 80) {
    return {
      en: "You have momentum. Keep it light: one challenge now, then stop before fatigue blurs the method.",
      zh: "你已有學習勢頭。保持輕量：現在做一題挑戰題，然後在疲勞影響方法前停下。"
    };
  }

  return {
    en: "You are in the productive middle. The next gain comes from noticing patterns in the mistakes.",
    zh: "你正處於有效練習區。下一步進步來自看見錯題中的模式。"
  };
}

function practiceSummaryToneClassNameFor(accuracyPercent: number) {
  if (accuracyPercent >= 80) return "text-emerald-600 dark:text-emerald-200";
  if (accuracyPercent >= 50) return "text-cyan-600 dark:text-cyan-200";
  return "text-amber-600 dark:text-amber-200";
}

function resolveRoundTopic(questions: PublicQuestion[]) {
  const [firstQuestion] = questions;
  if (!firstQuestion) return null;

  const counts = new Map<string, number>();
  let bestTopic = { topicId: firstQuestion.topicId, topic: firstQuestion.topic };
  let bestCount = 0;

  questions.forEach((question) => {
    const nextCount = (counts.get(question.topicId) ?? 0) + 1;
    counts.set(question.topicId, nextCount);
    if (nextCount > bestCount) {
      bestTopic = { topicId: question.topicId, topic: question.topic };
      bestCount = nextCount;
    }
  });

  return bestTopic;
}

function resolveSingleRoundTopic(questions: PublicQuestion[]) {
  const [firstQuestion] = questions;
  if (!firstQuestion) return null;
  if (questions.some((question) => question.topicId !== firstQuestion.topicId)) return null;
  return { topicId: firstQuestion.topicId, topic: firstQuestion.topic };
}

function gamePayloadFromPracticeSummary(summary: PracticeRoundSummary | null): PracticeGameRoundPayload | null {
  if (
    !summary?.isComplete ||
    !summary.topicId ||
    !summary.isSingleTopicRound ||
    summary.totalQuestions !== 5 ||
    summary.roundQuestionIds.length !== 5 ||
    summary.correctCount < 4 ||
    summary.accuracyPercent < 80
  ) {
    return null;
  }

  return {
    topicId: summary.topicId,
    roundQuestionIds: summary.roundQuestionIds,
    correctRoundQuestionIds: summary.correctQuestionIds,
    roundQuestions: summary.results.map((result) => result.question),
    accuracyPercent: summary.accuracyPercent,
    roundKey: summary.roundKey
  };
}

function sameStringArray(left: string[], right: string[]) {
  return left.length === right.length && left.every((item, index) => item === right[index]);
}

function samePracticeGameRoundPayload(left: PracticeGameRoundPayload | null, right: PracticeGameRoundPayload | null) {
  if (left === right) return true;
  if (!left || !right) return false;

  return (
    left.topicId === right.topicId &&
    left.roundKey === right.roundKey &&
    left.accuracyPercent === right.accuracyPercent &&
    sameStringArray(left.roundQuestionIds, right.roundQuestionIds) &&
    sameStringArray(left.correctRoundQuestionIds, right.correctRoundQuestionIds)
  );
}

function readPracticeGameRoundPayload(value: string | null): PracticeGameRoundPayload | null {
  if (!value) return null;

  try {
    const payload = JSON.parse(value) as Partial<PracticeGameRoundPayload> | null;
    if (
      typeof payload?.topicId !== "string" ||
      typeof payload.roundKey !== "string" ||
      typeof payload.accuracyPercent !== "number" ||
      !Array.isArray(payload.roundQuestionIds) ||
      !Array.isArray(payload.correctRoundQuestionIds)
    ) {
      return null;
    }

    const roundQuestionIds = payload.roundQuestionIds.filter((item): item is string => typeof item === "string");
    const correctRoundQuestionIds = payload.correctRoundQuestionIds.filter((item): item is string => typeof item === "string");
    const roundQuestions = Array.isArray(payload.roundQuestions)
      ? payload.roundQuestions.filter((item): item is PublicQuestion => {
          const question = item as Partial<PublicQuestion> | null;
          return typeof question?.id === "string" && typeof question.topicId === "string";
        })
      : [];
    if (payload.accuracyPercent < 80 || roundQuestionIds.length !== 5 || correctRoundQuestionIds.length < 4) return null;

    return {
      topicId: payload.topicId,
      roundQuestionIds,
      correctRoundQuestionIds,
      ...(roundQuestions.length ? { roundQuestions } : {}),
      accuracyPercent: payload.accuracyPercent,
      roundKey: payload.roundKey
    };
  } catch {
    return null;
  }
}

function practiceGameRoundSearchParams(payload: PracticeGameRoundPayload) {
  const params = new URLSearchParams({
    topicId: payload.topicId,
    roundKey: payload.roundKey
  });
  payload.roundQuestionIds.forEach((questionId) => params.append("roundQuestionIds", questionId));
  payload.correctRoundQuestionIds.forEach((questionId) => params.append("correctRoundQuestionIds", questionId));
  return params;
}

function readAdventureEligibility(value: unknown): AdventureIslandEligibility | null {
  const payload = value as Partial<AdventureIslandEligibility> | null;
  if (
    typeof payload?.eligible !== "boolean" ||
    typeof payload.reason !== "string" ||
    typeof payload.alreadyCompleted !== "boolean" ||
    typeof payload.postAdventurePracticeEligible !== "boolean" ||
    typeof payload.attemptCount !== "number" ||
    typeof payload.correctCount !== "number" ||
    typeof payload.accuracyPercent !== "number"
  ) {
    return null;
  }
  return payload as AdventureIslandEligibility;
}

function practiceRoundKeyFor({
  kind,
  userId,
  questionIds
}: {
  kind: PracticeSummaryMode;
  userId: string | undefined;
  questionIds: string[];
}) {
  return `${kind}:${userId ?? "guest"}:${questionIds.join(".")}`.replace(/\s+/g, "-");
}

function readQuestions(value: unknown) {
  const response = value as { questions?: unknown } | null;
  if (!Array.isArray(response?.questions)) return [];
  return response.questions as PublicQuestion[];
}

function readQuestionCatalog(value: unknown) {
  const response = value as { topics?: unknown; totalQuestions?: unknown } | null;
  const topics = Array.isArray(response?.topics)
    ? response.topics.filter((topic): topic is QuestionCatalogTopic => {
        const candidate = topic as Partial<QuestionCatalogTopic> | null;
        const localizedTopic = candidate?.topic as Partial<LocalizedText> | undefined;
        return (
          typeof candidate?.topicId === "string" &&
          typeof candidate.grade === "string" &&
          typeof localizedTopic?.en === "string" &&
          typeof localizedTopic.zh === "string" &&
          typeof candidate.questionCount === "number"
        );
      })
    : [];
  const totalQuestions = typeof response?.totalQuestions === "number"
    ? response.totalQuestions
    : topics.reduce((sum, topic) => sum + topic.questionCount, 0);

  return { topics, totalQuestions };
}

function practiceCatalogLoadErrorMessage(language: Language) {
  if (language === "en") return "Could not load the Practice Arena question catalog.";
  if (language === "zh-Hans") return "暂时无法载入练习场题库。";
  return "暫時無法載入練習場題庫。";
}

function practiceQuestionsLoadErrorMessage(language: Language) {
  if (language === "en") return "Could not load questions.";
  if (language === "zh-Hans") return "暂时无法载入题目。";
  return "暫時無法載入題目。";
}

function readLesson(value: unknown) {
  const response = value as { lesson?: unknown } | null;
  const lesson = response?.lesson as Partial<LessonDetail> | undefined;
  if (typeof lesson?.topicId !== "string") return null;
  return lesson as LessonDetail;
}

function readAdaptiveDecision(value: unknown) {
  const response = value as { decision?: unknown } | null;
  const decision = response?.decision as Partial<AdaptiveLearningDecision> | undefined;
  if (
    typeof decision?.action !== "string" ||
    typeof decision.skill?.id !== "string" ||
    typeof decision.topic?.id !== "string" ||
    typeof decision.engine?.llmStatus !== "string" ||
    !Array.isArray(decision.questions)
  ) {
    return null;
  }

  return decision as AdaptiveLearningDecision;
}

function adaptiveIntroCopy(decision: AdaptiveLearningDecision, requiredQuestionCount: number): LocalizedText {
  const checksEn = `${requiredQuestionCount} check${requiredQuestionCount === 1 ? "" : "s"}`;
  const checksZh = `${requiredQuestionCount} 題`;

  if (decision.engine.mode === "llm-assisted") {
    return {
      en: "This AI-assisted set was selected from validated BKT candidates. The mathematical mastery model still supplies the guardrails, prerequisites, and spaced review priority.",
      zh: "這組 AI 輔助練習是從已驗證的 BKT 候選方案中選出；數學掌握模型仍然負責防護規則、先備關係和間隔複習優先級。"
    };
  }

  if (decision.engine.llmStatus === "pending") {
    return {
      en: `This deterministic set is ready now while the guarded LLM reranker refreshes in the background. Free selection unlocks after these ${checksEn} are submitted.`,
      zh: `這組確定性練習可立即開始；受防護的 LLM 重排器會在背景更新。提交這 ${checksZh} 後，才會開放自由選題模式。`
    };
  }

  return {
    en: `This deterministic set comes from the skill model, mastery evidence, prerequisites, and spaced review timing. Free selection unlocks after these ${checksEn} are submitted.`,
    zh: `這組練習由技能模型、掌握證據、先備關係和間隔複習時間決定。提交這 ${checksZh} 後，才會開放自由選題模式。`
  };
}

function routeContextFromWindow(): RoutePracticeContext {
  if (typeof window === "undefined") return { lessonSlug: null, topicId: null };

  const url = new URL(window.location.href);
  const explicitTopicId = url.searchParams.get("topicId");
  const explicitLessonSlug = url.searchParams.get("lesson");
  let referrerLessonSlug: string | null = null;

  if (typeof document !== "undefined" && document.referrer) {
    try {
      const referrer = new URL(document.referrer);
      const lessonMatch = referrer.origin === url.origin
        ? referrer.pathname.match(/^\/student\/lessons\/([^/]+)/) ?? referrer.pathname.match(/^\/lesson\/([^/]+)/)
        : null;
      referrerLessonSlug = lessonMatch ? decodeURIComponent(lessonMatch[1]) : null;
    } catch {
      referrerLessonSlug = null;
    }
  }

  return {
    lessonSlug: explicitLessonSlug || referrerLessonSlug,
    topicId: explicitTopicId
  };
}

function lessonContextStorageKey(userId: string | undefined, grade: GradeFilter) {
  return `${lastLessonStoragePrefix}:${userId ?? "guest"}:${grade}`;
}

function unlockStorageKey(userId: string | undefined, topicId: string) {
  return `${adaptiveUnlockStoragePrefix}:${userId ?? "guest"}:${topicId}`;
}

function strongResultStorageKey(userId: string | undefined, topicId: string) {
  return `${adaptiveStrongResultStoragePrefix}:${userId ?? "guest"}:${topicId}`;
}

function hasStoredPracticeFlag(key: string) {
  return window.localStorage.getItem(key) === "true";
}

function hasAnyStoredUserPracticeFlag(prefix: string, userId: string | undefined) {
  const userKeyPrefix = `${prefix}:${userId ?? "guest"}:`;

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (key?.startsWith(userKeyPrefix) && window.localStorage.getItem(key) === "true") return true;
  }

  return false;
}

function readStoredLessonContext(key: string): LessonPracticeContext | null {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? "null") as Partial<LessonPracticeContext> | null;
    if (!parsed || typeof parsed.topicId !== "string") return null;
    const lessonTitle = parsed.lessonTitle as Partial<LocalizedText> | undefined;
    return {
      topicId: parsed.topicId,
      lessonTitle:
        typeof lessonTitle?.en === "string" && typeof lessonTitle.zh === "string"
          ? { en: lessonTitle.en, zh: lessonTitle.zh }
          : undefined
    };
  } catch {
    return null;
  }
}

function isEditableElement(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  return target.isContentEditable || tagName === "input" || tagName === "textarea" || tagName === "select";
}

function clampQuestionIndex(index: number, questionCount: number) {
  if (questionCount <= 0) return 0;
  return Math.min(questionCount - 1, Math.max(0, index));
}

function PagerStarIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none">
      <path d="m12 3 2.6 5.5 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6-4.4-4.2 6-.8L12 3Z" fill="currentColor" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.4" />
    </svg>
  );
}

function PagerRetryIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none">
      <path d="M20 12a8 8 0 1 1-2.35-5.65M20 4v4h-4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" />
    </svg>
  );
}

function SoundOnIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none">
      <path d="M4 9v6h4l5 4V5L8 9H4Z" fill="currentColor" />
      <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

function SoundOffIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none">
      <path d="M4 9v6h4l5 4V5L8 9H4Z" fill="currentColor" />
      <path d="m16 9 6 6M22 9l-6 6" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

type QuestionPagerProps = {
  questions: PublicQuestion[];
  onAnswered?: (result: PracticePagerAnswerResult) => void;
  onQuestionStarted?: (question: PublicQuestion) => void;
};

function QuestionPager({ questions, onAnswered, onQuestionStarted }: QuestionPagerProps) {
  const { currentUser, language, t: settingsT } = useSettings();
  const prefersReducedMotion = useReducedMotion();
  const t = useCallback(
    (localized: LocalizedText) => normalizePracticeSimplifiedText(settingsT(localized), language),
    [language, settingsT]
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [jumpValue, setJumpValue] = useState("1");
  const [answerResults, setAnswerResults] = useState<Record<string, boolean>>({});
  const [soundEnabled, setSoundEnabled] = useState(false);
  const autoAdvanceTimerRef = useRef<number | null>(null);
  const questionStartedAtRef = useRef<Record<string, number>>({});
  const questionSignature = useMemo(() => questions.map((question) => question.id).join("|"), [questions]);
  const questionCount = questions.length;
  const currentQuestionNumber = questionCount ? currentIndex + 1 : 0;

  const clearAutoAdvance = useCallback(() => {
    if (autoAdvanceTimerRef.current === null) return;
    window.clearTimeout(autoAdvanceTimerRef.current);
    autoAdvanceTimerRef.current = null;
  }, []);

  const goToIndex = useCallback((index: number) => {
    if (!questionCount) return;
    clearAutoAdvance();
    setCurrentIndex(clampQuestionIndex(index, questionCount));
  }, [clearAutoAdvance, questionCount]);

  const goToPrevious = useCallback(() => {
    goToIndex(currentIndex - 1);
  }, [currentIndex, goToIndex]);

  const goToNext = useCallback(() => {
    goToIndex(currentIndex + 1);
  }, [currentIndex, goToIndex]);

  useEffect(() => {
    clearAutoAdvance();
    questionStartedAtRef.current = {};
    setCurrentIndex(0);
    setAnswerResults({});
    setJumpValue(questionCount ? "1" : "");
  }, [clearAutoAdvance, questionCount, questionSignature]);

  useEffect(() => {
    setSoundEnabled(readPracticeSoundEnabled(window.localStorage.getItem(practiceSoundStorageKey(currentUser?.id))));
  }, [currentUser?.id]);

  const handleSoundToggle = useCallback(() => {
    setSoundEnabled((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(practiceSoundStorageKey(currentUser?.id), String(next));
      } catch {
        // The preference stays session-only when storage is unavailable.
      }
      return next;
    });
  }, [currentUser?.id]);

  useEffect(() => {
    setJumpValue(questionCount ? String(currentIndex + 1) : "");
  }, [currentIndex, questionCount]);

  useEffect(() => () => clearAutoAdvance(), [clearAutoAdvance]);

  useEffect(() => {
    if (questionCount < 2) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (isEditableElement(event.target)) return;

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goToPrevious();
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        goToNext();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToNext, goToPrevious, questionCount]);

  const handleJump = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextQuestionNumber = Number.parseInt(jumpValue, 10);
    if (Number.isNaN(nextQuestionNumber)) {
      setJumpValue(questionCount ? String(currentIndex + 1) : "");
      return;
    }
    goToIndex(nextQuestionNumber - 1);
  }, [currentIndex, goToIndex, jumpValue, questionCount]);

  const startQuestionTimer = useCallback((question: PublicQuestion) => {
    questionStartedAtRef.current[question.id] = questionStartedAtRef.current[question.id] ?? Date.now();
    onQuestionStarted?.(question);
  }, [onQuestionStarted]);

  const handleAnswered = useCallback((question: PublicQuestion, feedback: AttemptFeedback) => {
    const startedAt = questionStartedAtRef.current[question.id] ?? Date.now();
    const durationSeconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    const answeredIndex = questions.findIndex((item) => item.id === question.id);

    delete questionStartedAtRef.current[question.id];
    const isRoundNowComplete = questions.every((item) => item.id === question.id || answerResults[item.id] !== undefined);
    setAnswerResults((current) => ({ ...current, [question.id]: feedback.correct }));
    if (soundEnabled) {
      playPracticeSound(isRoundNowComplete ? "complete" : feedback.correct ? "correct" : "wrong");
    }
    onAnswered?.({
      question,
      feedback,
      durationSeconds,
      questionNumber: answeredIndex + 1
    });
    if (answeredIndex < 0 || answeredIndex !== currentIndex || answeredIndex >= questionCount - 1) return;

    clearAutoAdvance();
    autoAdvanceTimerRef.current = window.setTimeout(() => {
      autoAdvanceTimerRef.current = null;
      setCurrentIndex((latestIndex) => (
        latestIndex === answeredIndex ? clampQuestionIndex(answeredIndex + 1, questionCount) : latestIndex
      ));
    }, autoAdvanceDelayMs);
  }, [answerResults, clearAutoAdvance, currentIndex, onAnswered, questionCount, questions, soundEnabled]);

  const isYoungLearnerRound = isYoungLearnerPracticeRound(questions);

  if (!questionCount) return null;

  return (
    <section className="mt-8 grid gap-5 rounded-[28px] border border-white/80 bg-white/95 p-4 shadow-[0_22px_46px_rgba(15,23,42,0.12)] sm:p-5" aria-label={t({ en: "Practice questions", zh: "練習題目" })}>
      <div className="grid gap-4 rounded-3xl border border-sky-100 bg-sky-50/80 p-4 shadow-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-5">
        <div>
          <p aria-live="polite" className="text-sm font-black uppercase tracking-[0.18em] text-blue-600">
            {t({ en: `Question ${currentQuestionNumber} of ${questionCount}`, zh: `第 ${currentQuestionNumber} 題，共 ${questionCount} 題` })}
          </p>
          <div data-testid="mission-trail" className="mt-3 flex flex-wrap items-center gap-1 sm:gap-1.5">
            {questions.map((question, index) => {
              const result = answerResults[question.id];
              const isCurrentStone = index === currentIndex;
              const stoneNumber = index + 1;
              const stoneLabel = result === true
                ? t({ en: `Question ${stoneNumber}: correct`, zh: `第 ${stoneNumber} 題：正確`, zhHans: `第 ${stoneNumber} 题：正确` })
                : result === false
                  ? t({ en: `Question ${stoneNumber}: to review`, zh: `第 ${stoneNumber} 題：需重溫`, zhHans: `第 ${stoneNumber} 题：需重温` })
                  : t({ en: `Go to question ${stoneNumber}`, zh: `跳到第 ${stoneNumber} 題`, zhHans: `跳到第 ${stoneNumber} 题` });

              return (
                <div key={question.id} className="flex items-center gap-1 sm:gap-1.5">
                  {index > 0 ? <span aria-hidden="true" className="w-4 border-t-2 border-dashed border-sky-300 sm:w-6" /> : null}
                  <button
                    type="button"
                    onClick={() => goToIndex(index)}
                    aria-label={stoneLabel}
                    aria-current={isCurrentStone ? "step" : undefined}
                    className={cn(
                      "focus-ring grid size-11 place-items-center rounded-full border-2 text-base font-black shadow-sm transition hover:-translate-y-0.5 sm:size-12",
                      result === true
                        ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                        : result === false
                          ? "border-amber-300 bg-amber-50 text-amber-600"
                          : isCurrentStone
                            ? "border-blue-500 bg-white text-blue-700 ring-4 ring-blue-200"
                            : "border-sky-100 bg-white text-slate-400"
                    )}
                  >
                    <motion.span
                      key={`${question.id}:${String(result)}`}
                      className="grid place-items-center"
                      initial={prefersReducedMotion || result === undefined ? false : result ? { scale: 0 } : { x: 0 }}
                      animate={
                        prefersReducedMotion || result === undefined
                          ? undefined
                          : result
                            ? { scale: [0, 1.35, 1], rotate: [0, 14, 0] }
                            : { x: [0, -4, 4, -2, 0] }
                      }
                      transition={{ duration: 0.45, ease: "easeOut" }}
                    >
                      {result === true
                        ? <PagerStarIcon className="size-6 text-amber-400" />
                        : result === false
                          ? <PagerRetryIcon className="size-5" />
                          : stoneNumber}
                    </motion.span>
                  </button>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              aria-label={t({ en: "Previous question", zh: "上一題" })}
              onClick={goToPrevious}
              disabled={currentIndex === 0}
              className="focus-ring min-h-11 rounded-full border border-blue-200 bg-white px-5 py-2 text-sm font-black text-blue-700 shadow-sm transition enabled:hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {t({ en: "< Previous", zh: "< 上一題" })}
            </button>
            <button
              type="button"
              aria-label={t({ en: "Next question", zh: "下一題" })}
              onClick={goToNext}
              disabled={currentIndex >= questionCount - 1}
              className="focus-ring min-h-11 rounded-full bg-blue-600 px-5 py-2 text-sm font-black text-white shadow-[0_6px_0_#1d4ed8] transition enabled:hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {t({ en: "Next >", zh: "下一題 >" })}
            </button>
            <button
              type="button"
              onClick={handleSoundToggle}
              aria-pressed={soundEnabled}
              aria-label={soundEnabled
                ? t({ en: "Turn sound off", zh: "關閉音效", zhHans: "关闭音效" })
                : t({ en: "Turn sound on", zh: "開啟音效", zhHans: "开启音效" })}
              className="focus-ring grid min-h-11 min-w-11 place-items-center rounded-full border border-blue-200 bg-white px-3 text-blue-700 shadow-sm transition hover:-translate-y-0.5"
            >
              {soundEnabled ? <SoundOnIcon /> : <SoundOffIcon />}
            </button>
          </div>
        </div>

        {isYoungLearnerRound ? null : (
        <form onSubmit={handleJump} noValidate className="grid gap-2 sm:w-64">
          <label htmlFor="practice-question-jump" className="text-xs font-black uppercase tracking-[0.18em] text-blue-950">
            {t({ en: "Jump to", zh: "跳到題號" })}
          </label>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
            <input
              id="practice-question-jump"
              type="number"
              min={1}
              max={questionCount}
              value={jumpValue}
              onChange={(event) => setJumpValue(event.target.value)}
              className="focus-ring min-h-14 w-full rounded-full border border-blue-100 bg-white px-5 py-3 text-lg font-black text-blue-950 shadow-sm [appearance:textfield] placeholder:text-slate-400 focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <button
              type="submit"
              className="focus-ring rounded-full bg-blue-950 px-5 py-3 text-sm font-black text-white shadow-[0_6px_0_#1e3a8a] transition hover:-translate-y-0.5"
            >
              {t({ en: "Jump", zh: "跳轉" })}
            </button>
          </div>
        </form>
        )}
      </div>

      <div className="grid gap-5">
        {questions.map((question, index) => (
          <div
            key={question.id}
            className="rounded-3xl border border-sky-100 bg-white/95 p-4 shadow-sm sm:p-5"
            hidden={index !== currentIndex}
            aria-hidden={index !== currentIndex}
            onFocusCapture={() => startQuestionTimer(question)}
            onPointerDownCapture={() => startQuestionTimer(question)}
          >
            <PracticeQuestionCard question={question} onAnswered={handleAnswered} />
          </div>
        ))}
      </div>
    </section>
  );
}

export default function PracticePage() {
  const { currentUser, language, selectedGrade, t: settingsT, text: settingsText } = useSettings();
  const prefersReducedMotion = useReducedMotion();
  const t = useCallback(
    (localized: LocalizedText) => normalizePracticeSimplifiedText(settingsT(localized), language),
    [language, settingsT]
  );
  const text = useCallback(
    (localized: LocalizedText) => normalizePracticeSimplifiedText(settingsText(localized), language),
    [language, settingsText]
  );
  const practiceSummaryCloseButtonRef = useRef<HTMLButtonElement | null>(null);
  const adaptiveRoundStateKeyRef = useRef<string | null>(null);
  const adaptiveProgressQuestionIdsRef = useRef<Set<string>>(new Set());
  const adaptiveAnswerRefreshInFlightRef = useRef(false);
  const adaptiveAnswerRefreshQueuedRef = useRef(false);
  const [gradeFilter, setGradeFilter] = useState<GradeFilter>(selectedGrade);
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>("all");
  const [questionTypeFilter, setQuestionTypeFilter] = useState<QuestionTypeFilter>("all");
  const [topicFilter, setTopicFilter] = useState("all");
  const [questionCatalogTopics, setQuestionCatalogTopics] = useState<QuestionCatalogTopic[]>([]);
  const [questionCatalogCount, setQuestionCatalogCount] = useState(0);
  const [visibleQuestions, setVisibleQuestions] = useState<PublicQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [questionCatalogError, setQuestionCatalogError] = useState("");
  const [questionCatalogLoaded, setQuestionCatalogLoaded] = useState(false);
  const [routeContext, setRouteContext] = useState<RoutePracticeContext>(() => routeContextFromWindow());
  const [lessonContext, setLessonContext] = useState<LessonPracticeContext | null>(null);
  const [lessonContextReady, setLessonContextReady] = useState(false);
  const [adaptivePlan, setAdaptivePlan] = useState<AdaptiveLearningDecision | null>(null);
  const [adaptiveLoadError, setAdaptiveLoadError] = useState("");
  const [completedAdaptiveQuestionIds, setCompletedAdaptiveQuestionIds] = useState<Set<string>>(() => new Set());
  const [adaptiveAnswerResults, setAdaptiveAnswerResults] = useState<Record<string, boolean>>({});
  const [adaptiveQuestionResults, setAdaptiveQuestionResults] = useState<Record<string, PracticeAnswerResult>>({});
  const [freeSelectionUnlockedTopicId, setFreeSelectionUnlockedTopicId] = useState<string | null>(null);
  const [strongAdaptiveResultTopicId, setStrongAdaptiveResultTopicId] = useState<string | null>(null);
  const [freeSelectionQuestionResults, setFreeSelectionQuestionResults] = useState<Record<string, PracticeAnswerResult>>({});
  const [practiceSummaryOpen, setPracticeSummaryOpen] = useState(false);
  const [practiceSummaryMode, setPracticeSummaryMode] = useState<PracticeSummaryMode>("adaptive");
  const [practiceSummaryAutoOpenedRoundKey, setPracticeSummaryAutoOpenedRoundKey] = useState<string | null>(null);
  const [freeSelectionSummaryAutoOpenedRoundKey, setFreeSelectionSummaryAutoOpenedRoundKey] = useState<string | null>(null);
  const [practiceSummaryAdaptiveDecision, setPracticeSummaryAdaptiveDecision] = useState<AdaptiveLearningDecision | null>(null);
  const [practiceSummaryRefreshing, setPracticeSummaryRefreshing] = useState(false);
  const [practiceGameUnlockStatus, setPracticeGameUnlockStatus] = useState<PracticeGameUnlockStatus | null>(null);
  const [rememberedGameRoundPayload, setRememberedGameRoundPayload] = useState<PracticeGameRoundPayload | null>(null);
  const [showPracticeCelebration, setShowPracticeCelebration] = useState(false);
  const [islandStars, setIslandStars] = useState<PracticeIslandStarRecord>({});
  const [islandRegionNotice, setIslandRegionNotice] = useState<LocalizedText | null>(null);
  const awardedIslandRoundKeysRef = useRef<Set<string>>(new Set());
  const pendingStarFlightRef = useRef<{ regionId: PracticeIslandRegionId; starCount: number } | null>(null);
  const [islandStarFlight, setIslandStarFlight] = useState<{
    token: number;
    regionId: PracticeIslandRegionId;
    starCount: number;
    from: { x: number; y: number };
    to: { x: number; y: number };
  } | null>(null);
  const [pulseRegionId, setPulseRegionId] = useState<PracticeIslandRegionId | null>(null);
  const isStudentAccount = currentUser?.role === "student";
  const studentProfileGrade = currentUser?.role === "student" ? currentUser.grade : null;
  const studentJonCanBrowseCaliforniaK12 =
    currentUser?.role === "student" &&
    currentUser.id === "student-jon-us-ca-super" &&
    currentUser.curriculumTrack === "US_CA_MATH";
  const adventureGradeLock = useMemo(
    () => resolvePracticeAdventureGradeLock({
      gradeFilter,
      selectedGrade,
      studentGrade: studentProfileGrade,
      allowStudentGradeSelection: studentJonCanBrowseCaliforniaK12
    }),
    [gradeFilter, selectedGrade, studentJonCanBrowseCaliforniaK12, studentProfileGrade]
  );
  const studentFixedGrade = adventureGradeLock.gradeSelectionDisabled ? studentProfileGrade : null;
  const activeGradeFilter: GradeFilter = adventureGradeLock.activeGradeFilter;
  const roadmapGrade = activeGradeFilter === "all" ? selectedGrade : activeGradeFilter;
  const curriculumProfile = currentUser?.curriculumProfile ?? curriculumProfileForTrack("HK");
  const curriculumTrack = currentUser?.curriculumTrack ?? curriculumTrackForProfile(curriculumProfile);
  const textbookPublisher = curriculumProfile.publisher;
  const isCaliforniaPracticeBeta = textbookPublisher === "US_CA_MATH";
  const practiceText = useCallback(
    (localized: LocalizedText) => normalizePracticeSimplifiedText(
      practiceTextForLanguage(localized, language, textbookPublisher),
      language
    ),
    [language, textbookPublisher]
  );

  useEffect(() => {
    setGradeFilter(studentFixedGrade ?? selectedGrade);
  }, [currentUser?.id, selectedGrade, studentFixedGrade, textbookPublisher]);

  useEffect(() => {
    if (!currentUser) {
      setRememberedGameRoundPayload(null);
      return;
    }

    setRememberedGameRoundPayload(
      readPracticeGameRoundPayload(window.localStorage.getItem(completedPracticeRoundStorageKey(currentUser?.id)))
    );
  }, [currentUser?.id]);

  useEffect(() => {
    awardedIslandRoundKeysRef.current = new Set();
    setIslandRegionNotice(null);
    const localRecord = readPracticeIslandStarRecord(window.localStorage.getItem(practiceIslandStarStorageKey(currentUser?.id)));

    if (currentUser?.role !== "student") {
      setIslandStars(localRecord);
      return;
    }

    const guestRecord = readPracticeIslandStarRecord(window.localStorage.getItem(practiceIslandStarStorageKey(null)));
    const claimedRecord = mergePracticeIslandStarRecords(localRecord, guestRecord);
    setIslandStars(claimedRecord);
    if (claimedRecord !== localRecord) {
      try {
        window.localStorage.setItem(practiceIslandStarStorageKey(currentUser.id), JSON.stringify(claimedRecord));
      } catch {
        // Claimed guest stars still apply in memory when storage is unavailable.
      }
    }
    if (Object.keys(guestRecord).length) {
      try {
        window.localStorage.removeItem(practiceIslandStarStorageKey(null));
      } catch {
        // A stale guest record only risks re-claiming the same stars, which the server dedupes.
      }
    }

    const abortController = new AbortController();
    (async () => {
      try {
        const response = await fetch("/api/gamification/practice-island", { signal: abortController.signal });
        if (!response.ok) return;
        const payload = await response.json() as { stars?: unknown };
        const serverRecord = readPracticeIslandStarRecord(JSON.stringify(payload?.stars ?? null));

        setIslandStars((current) => {
          const merged = mergePracticeIslandStarRecords(current, serverRecord);
          if (merged !== current) {
            try {
              window.localStorage.setItem(practiceIslandStarStorageKey(currentUser?.id), JSON.stringify(merged));
            } catch {
              // Server stars still merge in memory when storage is unavailable.
            }
          }
          return merged;
        });

        for (const [regionId, stars] of Object.entries(claimedRecord)) {
          if (stars > (serverRecord[regionId as PracticeIslandRegionId] ?? 0)) {
            void fetch("/api/gamification/practice-island", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ regionId, stars })
            }).catch(() => undefined);
          }
        }
      } catch {
        // Offline or aborted: local stars remain the source of truth for this session.
      }
    })();

    return () => abortController.abort();
  }, [currentUser?.id, currentUser?.role]);

  const awardIslandStars = useCallback((
    regionId: PracticeIslandRegionId,
    stars: number,
    { celebrate = false }: { celebrate?: boolean } = {}
  ) => {
    setIslandStars((current) => {
      const next = awardPracticeIslandStars(current, regionId, stars);
      if (next !== current) {
        try {
          window.localStorage.setItem(practiceIslandStarStorageKey(currentUser?.id), JSON.stringify(next));
        } catch {
          // Star totals still update in memory when storage is unavailable.
        }
        if (isStudentAccount) {
          void fetch("/api/gamification/practice-island", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ regionId, stars: next[regionId] ?? stars })
          }).catch(() => undefined);
        }
        if (celebrate) {
          const gainedStars = (next[regionId] ?? 0) - (current[regionId] ?? 0);
          if (gainedStars > 0) pendingStarFlightRef.current = { regionId, starCount: Math.min(3, gainedStars) };
        }
      }
      return next;
    });
  }, [currentUser?.id, isStudentAccount]);

  const launchIslandStarFlight = useCallback(() => {
    const pending = pendingStarFlightRef.current;
    if (!pending) return;
    pendingStarFlightRef.current = null;

    const summaryRect = practiceSummaryCloseButtonRef.current?.getBoundingClientRect() ?? null;
    const from = summaryRect
      ? { x: summaryRect.left + summaryRect.width / 2, y: summaryRect.top + summaryRect.height / 2 }
      : { x: window.innerWidth / 2, y: window.innerHeight / 3 };

    document.getElementById("practice-adventure-hero")?.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "start"
    });

    window.setTimeout(() => {
      const pinTarget = document.querySelector(`[data-island-region-pin="${pending.regionId}"]`);
      const chipTarget = document.querySelector(`[data-island-region-chip="${pending.regionId}"]`);
      const targetElement =
        pinTarget instanceof HTMLElement && pinTarget.offsetParent !== null
          ? pinTarget
          : chipTarget instanceof HTMLElement
            ? chipTarget
            : null;

      if (!targetElement || prefersReducedMotion) {
        setPulseRegionId(pending.regionId);
        return;
      }

      const targetRect = targetElement.getBoundingClientRect();
      setIslandStarFlight({
        token: Date.now(),
        regionId: pending.regionId,
        starCount: pending.starCount,
        from,
        to: { x: targetRect.left + targetRect.width / 2, y: targetRect.top + targetRect.height / 2 }
      });
    }, prefersReducedMotion ? 60 : 640);
  }, [prefersReducedMotion]);

  const closePracticeSummary = useCallback(() => {
    setPracticeSummaryOpen(false);
    launchIslandStarFlight();
  }, [launchIslandStarFlight]);

  useEffect(() => {
    if (!islandStarFlight) return;
    const flightTimer = window.setTimeout(() => {
      setIslandStarFlight(null);
      setPulseRegionId(islandStarFlight.regionId);
    }, 950 + (islandStarFlight.starCount - 1) * 140);
    return () => window.clearTimeout(flightTimer);
  }, [islandStarFlight]);

  useEffect(() => {
    if (!pulseRegionId) return;
    const pulseTimer = window.setTimeout(() => setPulseRegionId(null), 1600);
    return () => window.clearTimeout(pulseTimer);
  }, [pulseRegionId]);

  const topicOptions = useMemo(() => {
    return questionCatalogTopics.map((topic): [string, TopicOption] => [
      topic.topicId,
      { grade: topic.grade, topic: topic.topic }
    ]);
  }, [questionCatalogTopics]);
  const firstQuestionCatalogTopicId = questionCatalogTopics[0]?.topicId ?? null;

  const adaptiveRoundQuestions = useMemo(
    () => dedupePracticeQuestions(adaptivePlan?.questions ?? []),
    [adaptivePlan]
  );
  const adaptiveRoundKey = adaptivePlan?.skill.id ?? null;
  const adaptiveRoundStateKey = adaptivePlan
    ? `${currentUser?.id ?? "guest"}:${adaptivePlan.skill.id}:${adaptiveRoundQuestions.map((question) => question.id).join("|")}`
    : `${currentUser?.id ?? "guest"}:no-adaptive-plan`;
  const isFreeSelectionUnlocked = Boolean(adaptiveRoundKey && freeSelectionUnlockedTopicId === adaptiveRoundKey);
  const canFallbackToFreeSelection = questionCatalogLoaded && !questionCatalogError && !adaptivePlan;
  const hasManualTopicSelection = topicFilter !== "all";
  const shouldShowFreeSelection = isFreeSelectionUnlocked || canFallbackToFreeSelection || hasManualTopicSelection;
  const hasSelectedPracticeFilter =
    shouldShowFreeSelection &&
    (
      difficultyFilter !== "all" ||
      topicFilter !== "all" ||
      questionTypeFilter !== "all" ||
      activeGradeFilter !== "all"
    );
  const adaptiveCompletedCount = adaptivePlan
    ? adaptiveRoundQuestions.filter((question) => completedAdaptiveQuestionIds.has(question.id)).length
    : 0;
  const adaptiveCorrectCount = adaptivePlan
    ? adaptiveRoundQuestions.filter((question) => adaptiveAnswerResults[question.id]).length
    : 0;
  const adaptiveRequiredQuestionCount = adaptivePlan
    ? Math.max(1, Math.min(requiredAdaptiveQuestionCount, adaptiveRoundQuestions.length))
    : requiredAdaptiveQuestionCount;
  const hasStrongAdaptiveResult =
    adaptiveCompletedCount >= adaptiveRequiredQuestionCount && adaptiveCorrectCount >= Math.max(0, adaptiveRequiredQuestionCount - 1);
  const hasRememberedStrongAdaptiveResult = Boolean(adaptiveRoundKey && strongAdaptiveResultTopicId === adaptiveRoundKey);
  const recommendedNextLesson = adaptivePlan?.lesson ?? null;
  const shouldShowRecommendedNextLesson = Boolean((hasStrongAdaptiveResult || hasRememberedStrongAdaptiveResult) && recommendedNextLesson);
  const adaptivePracticeSummary = useMemo(() => {
    if (!adaptivePlan) return null;

    const results = adaptiveRoundQuestions
      .map((question, index): PracticeAnswerSummaryItem | null => {
        const result = adaptiveQuestionResults[question.id];
        if (!result) return null;

        return {
          ...result,
          question,
          questionNumber: index + 1
        };
      })
      .filter((result): result is PracticeAnswerSummaryItem => Boolean(result));
    const totalQuestions = Math.max(adaptiveRequiredQuestionCount, results.length);
    const correctCount = results.filter((result) => result.correct).length;
    const totalSeconds = results.reduce((sum, result) => sum + result.durationSeconds, 0);
    const accuracyPercent = totalQuestions ? Math.round((correctCount / totalQuestions) * 100) : 0;
    const singleRoundTopic = resolveSingleRoundTopic(adaptiveRoundQuestions);

    return {
      answeredCount: results.length,
      averageSeconds: results.length ? Math.round(totalSeconds / results.length) : 0,
      accuracyPercent,
      correctCount,
      correctQuestionIds: results.filter((result) => result.correct).map((result) => result.question.id),
      isComplete: results.length >= adaptiveRequiredQuestionCount,
      isSingleTopicRound: singleRoundTopic?.topicId === adaptivePlan.topic.id,
      results,
      roundKey: practiceRoundKeyFor({
        kind: "adaptive",
        userId: currentUser?.id,
        questionIds: adaptiveRoundQuestions.map((question) => question.id)
      }),
      roundQuestionIds: adaptiveRoundQuestions.map((question) => question.id),
      topic: adaptivePlan.topic.title,
      topicId: adaptivePlan.topic.id,
      totalQuestions,
      totalSeconds,
      wrongResults: results.filter((result) => !result.correct)
    };
  }, [adaptivePlan, adaptiveQuestionResults, adaptiveRequiredQuestionCount, adaptiveRoundQuestions, currentUser?.id]);
  const summaryNextDecision = practiceSummaryAdaptiveDecision ?? adaptivePlan;
  const summaryNextLesson = summaryNextDecision?.lesson ?? adaptivePlan?.lesson ?? null;
  const summaryKnowledgeTitle = summaryNextDecision?.skill.title ?? adaptivePlan?.skill.title ?? null;
  const summaryTopicTitle = summaryNextDecision?.topic.title ?? adaptivePlan?.topic.title ?? null;
  const summaryDueReviews = summaryNextDecision?.dueReviews ?? adaptivePlan?.dueReviews ?? [];
  const adaptiveGameRoundPayload = useMemo(
    () => gamePayloadFromPracticeSummary(adaptivePracticeSummary),
    [adaptivePracticeSummary]
  );

  const displayedQuestions = useMemo(
    () => {
      if (!hasSelectedPracticeFilter) return [];
      return dedupePracticeQuestions(visibleQuestions.filter((question) => questionTypeFilter === "all" || question.type === questionTypeFilter));
    },
    [hasSelectedPracticeFilter, questionTypeFilter, visibleQuestions]
  );
  const freeSelectionRoundQuestions = useMemo(
    () => displayedQuestions.slice(0, freeSelectionRoundQuestionCount),
    [displayedQuestions]
  );
  const freeSelectionRoundStateKey = freeSelectionRoundQuestions.map((question) => question.id).join("|");
  const freeSelectionRoundTopic = useMemo(
    () => resolveRoundTopic(freeSelectionRoundQuestions),
    [freeSelectionRoundQuestions]
  );
  const freeSelectionSingleRoundTopic = useMemo(
    () => resolveSingleRoundTopic(freeSelectionRoundQuestions),
    [freeSelectionRoundQuestions]
  );
  const freeSelectionPracticeSummary = useMemo((): PracticeRoundSummary | null => {
    if (!hasSelectedPracticeFilter || freeSelectionRoundQuestions.length < freeSelectionRoundQuestionCount) return null;

    const results = freeSelectionRoundQuestions
      .map((question, index): PracticeAnswerSummaryItem | null => {
        const result = freeSelectionQuestionResults[question.id];
        if (!result) return null;

        return {
          ...result,
          question,
          questionNumber: index + 1
        };
      })
      .filter((result): result is PracticeAnswerSummaryItem => Boolean(result));
    const correctCount = results.filter((result) => result.correct).length;
    const totalSeconds = results.reduce((sum, result) => sum + result.durationSeconds, 0);
    const roundQuestionIds = freeSelectionRoundQuestions.map((question) => question.id);
    const roundKey = practiceRoundKeyFor({
      kind: "free-selection",
      userId: currentUser?.id,
      questionIds: roundQuestionIds
    });

    return {
      answeredCount: results.length,
      averageSeconds: results.length ? Math.round(totalSeconds / results.length) : 0,
      accuracyPercent: Math.round((correctCount / freeSelectionRoundQuestionCount) * 100),
      correctCount,
      correctQuestionIds: results.filter((result) => result.correct).map((result) => result.question.id),
      isComplete: results.length >= freeSelectionRoundQuestionCount,
      isSingleTopicRound: Boolean(freeSelectionSingleRoundTopic),
      results,
      roundKey,
      roundQuestionIds,
      topic: freeSelectionSingleRoundTopic?.topic ?? freeSelectionRoundTopic?.topic ?? null,
      topicId: freeSelectionSingleRoundTopic?.topicId ?? null,
      totalQuestions: freeSelectionRoundQuestionCount,
      totalSeconds,
      wrongResults: results.filter((result) => !result.correct)
    };
  }, [currentUser?.id, freeSelectionQuestionResults, freeSelectionRoundQuestions, freeSelectionRoundTopic, freeSelectionSingleRoundTopic, hasSelectedPracticeFilter]);
  const activePracticeSummary = practiceSummaryMode === "free-selection" ? freeSelectionPracticeSummary : adaptivePracticeSummary;
  const activeSummaryGameRoundPayload = useMemo(
    () => gamePayloadFromPracticeSummary(activePracticeSummary),
    [activePracticeSummary]
  );
  const activeGameRoundPayload = useMemo(
    () => activeSummaryGameRoundPayload ?? (!activePracticeSummary?.isComplete ? rememberedGameRoundPayload : null),
    [activePracticeSummary?.isComplete, activeSummaryGameRoundPayload, rememberedGameRoundPayload]
  );
  const isYoungLearnerSummary = activePracticeSummary
    ? isYoungLearnerPracticeRound(activePracticeSummary.results.map((result) => result.question))
    : false;
  const activePracticeSummaryToneClassName = activePracticeSummary
    ? practiceSummaryToneClassNameFor(activePracticeSummary.accuracyPercent)
    : "text-amber-600 dark:text-amber-200";
  const activeUnlockStatusMatchesRound = Boolean(
    activeGameRoundPayload &&
    practiceGameUnlockStatus?.roundKey === activeGameRoundPayload.roundKey
  );
  const hasAdventureIslandUnlock = Boolean(activeUnlockStatusMatchesRound && practiceGameUnlockStatus?.canStartAdventure);
  const hasFishingGameUnlock = Boolean(activeUnlockStatusMatchesRound && practiceGameUnlockStatus?.canStartFishing);
  const adaptiveHasAdventureIslandUnlock = Boolean(
    adaptiveGameRoundPayload &&
    practiceGameUnlockStatus?.roundKey === adaptiveGameRoundPayload.roundKey &&
    practiceGameUnlockStatus.canStartAdventure
  );

  const refreshAdaptiveRecommendation = useCallback(async ({
    apply = true,
    signal
  }: {
    apply?: boolean;
    signal?: AbortSignal;
  } = {}) => {
    if (!currentUser || !isStudentAccount) return null;

    try {
      const response = await fetch("/api/adaptive-learning/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grade: roadmapGrade,
          topicId: lessonContext?.topicId
        }),
        signal
      });
      const decision = readAdaptiveDecision(await response.json());
      if (!response.ok || !decision) return null;
      if (apply) setAdaptivePlan(decision);
      return decision;
    } catch {
      return null;
    }
  }, [currentUser, isStudentAccount, lessonContext?.topicId, roadmapGrade]);

  const scheduleAdaptiveAnswerRefresh = useCallback(() => {
    if (adaptiveAnswerRefreshInFlightRef.current) {
      adaptiveAnswerRefreshQueuedRef.current = true;
      return;
    }

    function runRefresh() {
      adaptiveAnswerRefreshInFlightRef.current = true;
      void refreshAdaptiveRecommendation({ apply: false }).finally(() => {
        adaptiveAnswerRefreshInFlightRef.current = false;
        if (!adaptiveAnswerRefreshQueuedRef.current) return;
        adaptiveAnswerRefreshQueuedRef.current = false;
        window.setTimeout(runRefresh, 750);
      });
    }

    runRefresh();
  }, [refreshAdaptiveRecommendation]);

  const handleAdaptiveAnswered = useCallback(({ question, feedback, durationSeconds }: PracticePagerAnswerResult) => {
    adaptiveProgressQuestionIdsRef.current.add(question.id);

    setCompletedAdaptiveQuestionIds((current) => {
      if (current.has(question.id)) return current;
      return new Set([...current, question.id]);
    });
    setAdaptiveAnswerResults((current) => {
      if (current[question.id] === feedback.correct) return current;
      return { ...current, [question.id]: feedback.correct };
    });
    setAdaptiveQuestionResults((current) => ({
      ...current,
      [question.id]: {
        correct: feedback.correct,
        correctAnswer: feedback.correctAnswer,
        durationSeconds,
        answeredAt: Date.now()
      }
    }));

    scheduleAdaptiveAnswerRefresh();
  }, [scheduleAdaptiveAnswerRefresh]);

  const handleAdaptiveQuestionStarted = useCallback((question: PublicQuestion) => {
    adaptiveProgressQuestionIdsRef.current.add(question.id);
  }, []);

  const handleFreeSelectionAnswered = useCallback(({ question, feedback, durationSeconds }: PracticePagerAnswerResult) => {
    setFreeSelectionQuestionResults((current) => ({
      ...current,
      [question.id]: {
        correct: feedback.correct,
        correctAnswer: feedback.correctAnswer,
        durationSeconds,
        answeredAt: Date.now()
      }
    }));
  }, []);

  useEffect(() => {
    if (!practiceSummaryOpen) return;

    const previousOverflow = document.body.style.overflow;
    const focusTimer = window.setTimeout(() => practiceSummaryCloseButtonRef.current?.focus(), 40);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closePracticeSummary();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [practiceSummaryOpen]);

  useEffect(() => {
    if (!adaptivePlan || !adaptivePracticeSummary?.isComplete) return;

    const roundKey = adaptivePlan.skill.id;
    if (practiceSummaryAutoOpenedRoundKey === roundKey) return;

    setPracticeSummaryMode("adaptive");
    setPracticeSummaryOpen(true);
    setPracticeSummaryAutoOpenedRoundKey(roundKey);
    if (!prefersReducedMotion) {
      setShowPracticeCelebration(true);
      const celebrationTimer = window.setTimeout(() => setShowPracticeCelebration(false), 2300);
      return () => window.clearTimeout(celebrationTimer);
    }
  }, [adaptivePlan, adaptivePracticeSummary?.isComplete, practiceSummaryAutoOpenedRoundKey, prefersReducedMotion]);

  useEffect(() => {
    if (!adaptivePlan || !adaptivePracticeSummary?.isComplete) return;

    let cancelled = false;
    setPracticeSummaryRefreshing(true);
    void refreshAdaptiveRecommendation({ apply: false }).then((decision) => {
      if (!cancelled && decision) setPracticeSummaryAdaptiveDecision(decision);
    }).finally(() => {
      if (!cancelled) setPracticeSummaryRefreshing(false);
    });

    return () => {
      cancelled = true;
    };
  }, [adaptivePlan, adaptivePracticeSummary?.isComplete, refreshAdaptiveRecommendation]);

  useEffect(() => {
    setFreeSelectionQuestionResults({});
    setFreeSelectionSummaryAutoOpenedRoundKey(null);
  }, [freeSelectionRoundStateKey]);

  useEffect(() => {
    if (!freeSelectionPracticeSummary?.isComplete) return;
    if (freeSelectionSummaryAutoOpenedRoundKey === freeSelectionPracticeSummary.roundKey) return;

    setPracticeSummaryMode("free-selection");
    setPracticeSummaryOpen(true);
    setFreeSelectionSummaryAutoOpenedRoundKey(freeSelectionPracticeSummary.roundKey);
    if (!prefersReducedMotion) {
      setShowPracticeCelebration(true);
      const celebrationTimer = window.setTimeout(() => setShowPracticeCelebration(false), 2300);
      return () => window.clearTimeout(celebrationTimer);
    }
  }, [
    freeSelectionPracticeSummary?.isComplete,
    freeSelectionPracticeSummary?.roundKey,
    freeSelectionSummaryAutoOpenedRoundKey,
    prefersReducedMotion
  ]);

  useEffect(() => {
    if (!adaptivePracticeSummary?.isComplete) return;
    if (awardedIslandRoundKeysRef.current.has(adaptivePracticeSummary.roundKey)) return;

    awardedIslandRoundKeysRef.current.add(adaptivePracticeSummary.roundKey);
    awardIslandStars("question-cavern", practiceIslandStarsForAccuracy(adaptivePracticeSummary.accuracyPercent), { celebrate: true });
  }, [adaptivePracticeSummary, awardIslandStars]);

  useEffect(() => {
    if (!freeSelectionPracticeSummary?.isComplete) return;
    if (awardedIslandRoundKeysRef.current.has(freeSelectionPracticeSummary.roundKey)) return;

    awardedIslandRoundKeysRef.current.add(freeSelectionPracticeSummary.roundKey);
    const regionId = freeSelectionPracticeSummary.isSingleTopicRound && freeSelectionPracticeSummary.topicId
      ? classifyPracticeIslandTopic({
          topicId: freeSelectionPracticeSummary.topicId,
          topic: freeSelectionPracticeSummary.topic ?? undefined
        })
      : "challenge-shore";
    awardIslandStars(regionId, practiceIslandStarsForAccuracy(freeSelectionPracticeSummary.accuracyPercent), { celebrate: true });
  }, [awardIslandStars, freeSelectionPracticeSummary]);

  useEffect(() => {
    const rememberedCorrectCount = rememberedGameRoundPayload?.correctRoundQuestionIds.length ?? 0;
    if (!rememberedGameRoundPayload || rememberedCorrectCount < 4) return;

    awardIslandStars(
      classifyPracticeIslandTopic({ topicId: rememberedGameRoundPayload.topicId }),
      rememberedCorrectCount >= 5 ? 3 : 2
    );
  }, [awardIslandStars, rememberedGameRoundPayload]);

  useEffect(() => {
    if (!activePracticeSummary?.isComplete && !activeGameRoundPayload) {
      setPracticeGameUnlockStatus(null);
      return;
    }

    const localLockedStatus = (reason: string) => {
      setPracticeGameUnlockStatus({
        roundKey: activePracticeSummary?.roundKey ?? activeGameRoundPayload?.roundKey ?? "practice-game-round",
        loading: false,
        canStartAdventure: false,
        canStartFishing: false,
        reason
      });
      window.sessionStorage.removeItem(adventureRoundStorageKey);
      window.sessionStorage.removeItem(fishingRoundStorageKey);
    };

    if (!currentUser) {
      localLockedStatus(t({ en: "Log in before starting the game unlock chain.", zh: "請先登入，才可開始遊戲解鎖鏈。", zhHans: "请先登录，才可开始游戏解锁链。" }));
      return;
    }

    if (activePracticeSummary?.isComplete && (!activePracticeSummary.isSingleTopicRound || !activePracticeSummary.topicId)) {
      localLockedStatus(t({
        en: "This round mixes topics. Choose one topic and complete a full 5-question round to unlock games.",
        zh: "本回合混合了不同課題。請選定同一課題並完成完整 5 題回合，才可解鎖遊戲。",
        zhHans: "本回合混合了不同课题。请选择同一课题并完成完整 5 题回合，才可解锁游戏。"
      }));
      return;
    }

    if (!activeGameRoundPayload) {
      localLockedStatus((activePracticeSummary?.accuracyPercent ?? 0) < 80
        ? t({ en: "Game unlock requires at least 4 correct answers in a complete 5-question topic round.", zh: "遊戲解鎖需要同一課題完整 5 題中至少答對 4 題。", zhHans: "游戏解锁需要同一课题完整 5 题中至少答对 4 题。" })
        : t({ en: "Game unlock requires exactly one complete 5-question topic round.", zh: "遊戲解鎖需要同一課題的完整 5 題回合。", zhHans: "游戏解锁需要同一课题的完整 5 题回合。" }));
      return;
    }

    const gameRoundPayload = activeGameRoundPayload;
    let cancelled = false;
    window.sessionStorage.setItem(adventureRoundStorageKey, JSON.stringify(gameRoundPayload));
    try {
      window.localStorage.setItem(completedPracticeRoundStorageKey(currentUser?.id), JSON.stringify(gameRoundPayload));
      setRememberedGameRoundPayload((currentPayload) =>
        samePracticeGameRoundPayload(currentPayload, gameRoundPayload) ? currentPayload : gameRoundPayload
      );
    } catch {
      setRememberedGameRoundPayload((currentPayload) =>
        samePracticeGameRoundPayload(currentPayload, gameRoundPayload) ? currentPayload : gameRoundPayload
      );
    }
    window.sessionStorage.removeItem(fishingRoundStorageKey);
    setPracticeGameUnlockStatus({
      roundKey: gameRoundPayload.roundKey,
      loading: true,
      canStartAdventure: true,
      canStartFishing: false,
      reason: t({
        en: "This round qualifies for Adventure Island. MAIS is checking the next game step in the background.",
        zh: "本回合已符合探险岛資格。MAIS 正在背景檢查下一個遊戲步驟。",
        zhHans: "本回合已符合探险岛资格。MAIS 正在后台检查下一个游戏步骤。"
      })
    });

    async function refreshGameUnlockStatus() {
      try {
        const params = practiceGameRoundSearchParams(gameRoundPayload);
        const response = await fetch(`/api/gamification/adventure-island?${params.toString()}`, { cache: "no-store" });
        const eligibility = readAdventureEligibility(await response.json().catch(() => null));
        if (!response.ok || !eligibility) throw new Error("Could not verify game unlock.");
        if (cancelled) return;

        const canStartFishing = eligibility.alreadyCompleted && eligibility.postAdventurePracticeEligible;
        const canStartAdventure =
          !canStartFishing &&
          !eligibility.alreadyCompleted &&
          (eligibility.eligible || ["need-attempts", "need-round-context", "need-accuracy"].includes(eligibility.reason));
        const reason = canStartFishing
          ? t({ en: "Adventure Island is complete for this topic and this post-adventure round qualifies for Fishing Master.", zh: "本課題已通關探险岛，且本次通關後練習達標，可開始捕魚達人。", zhHans: "本课题已通关探险岛，且本次通关后练习达标，可开始捕鱼达人。" })
          : canStartAdventure
            ? t({ en: "This 5-question topic round qualifies for Adventure Island.", zh: "這個同課題 5 題回合已符合探险岛資格。", zhHans: "这个同课题 5 题回合已符合探险岛资格。" })
            : eligibility.alreadyCompleted
              ? t({ en: "Adventure Island is complete for this topic. Finish another same-topic 5-question round at 80%+ to unlock Fishing Master.", zh: "本課題已通關探险岛。請再完成一次同課題 5 題 80%+ 回合以解鎖捕魚達人。", zhHans: "本课题已通关探险岛。请再完成一次同课题 5 题 80%+ 回合以解锁捕鱼达人。" })
              : eligibility.reason === "need-accuracy"
                ? t({ en: "Game unlock requires at least 4 correct answers out of 5.", zh: "遊戲解鎖需要 5 題中至少答對 4 題。", zhHans: "游戏解锁需要 5 题中至少答对 4 题。" })
                : eligibility.reason === "mixed-topic"
                  ? t({ en: "All 5 questions must belong to the same Practice Arena topic.", zh: "5 題必須全部屬於同一個練習場課題。", zhHans: "5 题必须全部属于同一个练习场课题。" })
                  : t({ en: "Complete a full 5-question same-topic Practice Arena round first.", zh: "請先完成同一課題的完整 5 題練習場回合。", zhHans: "请先完成同一课题的完整 5 题练习场回合。" });

        setPracticeGameUnlockStatus({
          roundKey: gameRoundPayload.roundKey,
          loading: false,
          canStartAdventure,
          canStartFishing,
          reason
        });

        if (canStartAdventure) {
          window.sessionStorage.setItem(adventureRoundStorageKey, JSON.stringify(gameRoundPayload));
          window.sessionStorage.removeItem(fishingRoundStorageKey);
        } else if (canStartFishing) {
          window.sessionStorage.setItem(fishingRoundStorageKey, JSON.stringify(gameRoundPayload));
          window.sessionStorage.removeItem(adventureRoundStorageKey);
        } else {
          window.sessionStorage.removeItem(adventureRoundStorageKey);
          window.sessionStorage.removeItem(fishingRoundStorageKey);
        }
      } catch {
        if (cancelled) return;
        setPracticeGameUnlockStatus({
          roundKey: gameRoundPayload.roundKey,
          loading: false,
          canStartAdventure: true,
          canStartFishing: false,
          reason: t({
            en: "This round qualifies locally. Adventure Island will verify the same topic evidence again before play.",
            zh: "本回合在本機已符合資格。探险岛開始前會再次驗證同課題證據。",
            zhHans: "本回合在本机已符合资格。探险岛开始前会再次验证同课题证据。"
          })
        });
        window.sessionStorage.setItem(adventureRoundStorageKey, JSON.stringify(gameRoundPayload));
        window.sessionStorage.removeItem(fishingRoundStorageKey);
      }
    }

    void refreshGameUnlockStatus();

    return () => {
      cancelled = true;
    };
  }, [activeGameRoundPayload, activePracticeSummary, currentUser, t]);

  useEffect(() => {
    const nextContext = routeContextFromWindow();
    setRouteContext((currentContext) => (
      currentContext.lessonSlug === nextContext.lessonSlug && currentContext.topicId === nextContext.topicId
        ? currentContext
        : nextContext
    ));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const storageKey = lessonContextStorageKey(currentUser?.id, roadmapGrade);
    setAdaptivePlan(null);
    setAdaptiveLoadError("");
    setLessonContextReady(false);

    function applyResolvedContext(nextContext: LessonPracticeContext | null) {
      if (cancelled) return;
      setLessonContext(nextContext);
      setLessonContextReady(true);
    }

    async function resolveLessonContext() {
      if (routeContext.topicId) {
        const nextContext = { topicId: routeContext.topicId };
        window.localStorage.setItem(storageKey, JSON.stringify(nextContext));
        applyResolvedContext(nextContext);
        return;
      }

      if (!routeContext.lessonSlug) {
        applyResolvedContext(readStoredLessonContext(storageKey));
        return;
      }

      try {
        const response = await fetch(`/api/lessons/${encodeURIComponent(routeContext.lessonSlug)}`, { cache: "no-store" });
        const lesson = readLesson(await response.json());
        if (!response.ok || !lesson) throw new Error("Lesson not found.");
        const nextContext = { topicId: lesson.topicId, lessonTitle: lesson.title };
        window.localStorage.setItem(storageKey, JSON.stringify(nextContext));
        applyResolvedContext(nextContext);
      } catch {
        applyResolvedContext(readStoredLessonContext(storageKey));
      }
    }

    void resolveLessonContext();

    return () => {
      cancelled = true;
    };
  }, [currentUser?.id, roadmapGrade, routeContext]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadAdaptivePlan() {
      if (!currentUser) {
        setAdaptivePlan(null);
        setAdaptiveLoadError("");
        return;
      }

      if (!isStudentAccount) {
        setAdaptivePlan(null);
        setAdaptiveLoadError("");
        return;
      }

      if (!lessonContextReady) return;

      try {
        const params = new URLSearchParams();
        params.set("grade", roadmapGrade);
        if (lessonContext?.topicId) params.set("topicId", lessonContext.topicId);
        const response = await fetch(`/api/adaptive-learning/next?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal
        });
        const decision = readAdaptiveDecision(await response.json());
        if (!response.ok || !decision) throw new Error("Could not load adaptive plan.");
        setAdaptivePlan(decision);
        setAdaptiveLoadError("");
        if (decision.engine.llmStatus === "pending") {
          void refreshAdaptiveRecommendation({ apply: false, signal: controller.signal }).then((refreshed) => {
            if (!controller.signal.aborted && refreshed && adaptiveProgressQuestionIdsRef.current.size === 0) {
              setAdaptivePlan(refreshed);
            }
          });
        }
      } catch {
        if (!controller.signal.aborted) {
          setAdaptivePlan(null);
          setAdaptiveLoadError(language === "en" ? "Could not load the personalized practice set." : "暫時無法載入適性練習。");
        }
      }
    }

    void loadAdaptivePlan();

    return () => controller.abort();
  }, [currentUser?.id, isStudentAccount, language, lessonContext?.topicId, lessonContextReady, refreshAdaptiveRecommendation, roadmapGrade]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const loadErrorMessage = practiceCatalogLoadErrorMessage(language);

    async function loadTopics() {
      setQuestionCatalogError("");
      setQuestionCatalogLoaded(false);
      try {
        const params = new URLSearchParams();
        if (activeGradeFilter !== "all") params.set("grade", activeGradeFilter);
        params.set("curriculumTrack", curriculumTrack);
        params.set("publisher", textbookPublisher);
        params.set("summary", "topic-catalog");
        const query = params.toString();
        const response = await fetch(`/api/questions${query ? `?${query}` : ""}`, {
          cache: "no-store",
          signal: controller.signal
        });
        const nextCatalog = readQuestionCatalog(await response.json());
        if (!response.ok) {
          throw new Error(loadErrorMessage);
        }
        if (!cancelled) {
          setQuestionCatalogTopics(nextCatalog.topics);
          setQuestionCatalogCount(nextCatalog.totalQuestions);
          setQuestionCatalogError("");
          setQuestionCatalogLoaded(true);
        }
      } catch (error) {
        if (!cancelled) {
          setQuestionCatalogTopics([]);
          setQuestionCatalogCount(0);
          setQuestionCatalogError(error instanceof Error ? error.message : loadErrorMessage);
          setQuestionCatalogLoaded(true);
        }
      }
    }

    void loadTopics();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [activeGradeFilter, curriculumTrack, language, textbookPublisher]);

  useEffect(() => {
    setTopicFilter("all");
  }, [activeGradeFilter]);

  useEffect(() => {
    if (topicFilter === "all") return;
    const hasSelectedTopic = topicOptions.some(([topicId]) => topicId === topicFilter);
    if (!hasSelectedTopic) setTopicFilter("all");
  }, [topicFilter, topicOptions]);

  useEffect(() => {
    if (adaptiveRoundStateKeyRef.current === adaptiveRoundStateKey) return;
    adaptiveRoundStateKeyRef.current = adaptiveRoundStateKey;

    setCompletedAdaptiveQuestionIds(new Set());
    setAdaptiveAnswerResults({});
    setAdaptiveQuestionResults({});
    adaptiveProgressQuestionIdsRef.current = new Set();
    pendingStarFlightRef.current = null;
    setPracticeSummaryOpen(false);
    setPracticeSummaryAutoOpenedRoundKey(null);
    setPracticeSummaryAdaptiveDecision(null);
    setPracticeSummaryRefreshing(false);
    setShowPracticeCelebration(false);

    if (!adaptivePlan) {
      setFreeSelectionUnlockedTopicId(null);
      setStrongAdaptiveResultTopicId(null);
      return;
    }

    const roundKey = adaptivePlan.skill.id;
    const isUnlocked =
      hasStoredPracticeFlag(unlockStorageKey(currentUser?.id, roundKey)) ||
      hasAnyStoredUserPracticeFlag(adaptiveUnlockStoragePrefix, currentUser?.id);
    const hasStrongResult =
      hasStoredPracticeFlag(strongResultStorageKey(currentUser?.id, roundKey)) ||
      hasAnyStoredUserPracticeFlag(adaptiveStrongResultStoragePrefix, currentUser?.id);
    setFreeSelectionUnlockedTopicId(isUnlocked ? roundKey : null);
    setStrongAdaptiveResultTopicId(hasStrongResult ? roundKey : null);
  }, [adaptivePlan, adaptiveRoundStateKey, currentUser?.id]);

  useEffect(() => {
    if (!adaptivePlan || !hasStrongAdaptiveResult) return;

    const roundKey = adaptivePlan.skill.id;
    window.localStorage.setItem(strongResultStorageKey(currentUser?.id, roundKey), "true");
    setStrongAdaptiveResultTopicId(roundKey);
  }, [adaptivePlan, currentUser?.id, hasStrongAdaptiveResult]);

  useEffect(() => {
    if (!adaptivePlan || isFreeSelectionUnlocked) return;
    if (adaptiveCompletedCount < adaptiveRequiredQuestionCount) return;

    const roundKey = adaptivePlan.skill.id;
    window.localStorage.setItem(unlockStorageKey(currentUser?.id, roundKey), "true");
    setFreeSelectionUnlockedTopicId(roundKey);
  }, [adaptiveCompletedCount, adaptivePlan, adaptiveRequiredQuestionCount, currentUser?.id, isFreeSelectionUnlocked]);

  useEffect(() => {
    const controller = new AbortController();
    const loadErrorMessage = practiceQuestionsLoadErrorMessage(language);

    async function loadQuestions() {
      const params = new URLSearchParams();
      if (activeGradeFilter !== "all") params.set("grade", activeGradeFilter);
      if (difficultyFilter !== "all") params.set("difficulty", difficultyFilter);
      if (topicFilter !== "all") params.set("topicId", topicFilter);
      params.set("curriculumTrack", curriculumTrack);
      params.set("publisher", textbookPublisher);

      setIsLoading(true);
      setLoadError("");

      try {
        const query = params.toString();
        const response = await fetch(`/api/questions${query ? `?${query}` : ""}`, {
          cache: "no-store",
          signal: controller.signal
        });
        const nextQuestions = readQuestions(await response.json());
        if (!response.ok) throw new Error(loadErrorMessage);
        setVisibleQuestions(nextQuestions);
      } catch (error) {
        if (!controller.signal.aborted) {
          setVisibleQuestions([]);
          setLoadError(error instanceof Error ? error.message : loadErrorMessage);
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    if (!hasSelectedPracticeFilter) {
      setVisibleQuestions([]);
      setLoadError("");
      setIsLoading(false);
      return () => controller.abort();
    }

    void loadQuestions();

    return () => controller.abort();
  }, [activeGradeFilter, curriculumTrack, difficultyFilter, hasSelectedPracticeFilter, language, textbookPublisher, topicFilter]);

  const scrollToPracticeSection = useCallback((...targetIds: string[]) => {
    window.requestAnimationFrame(() => {
      for (const targetId of targetIds) {
        const element = document.getElementById(targetId);
        if (!element) continue;
        element.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
    });
  }, []);

  const handleAdventureStartMission = useCallback(() => {
    if (shouldShowFreeSelection) {
      if (topicFilter === "all" && firstQuestionCatalogTopicId) setTopicFilter(firstQuestionCatalogTopicId);
      scrollToPracticeSection("free-selection");
      return;
    }

    scrollToPracticeSection(adaptivePlan ? "adaptive-practice-round" : "free-selection");
  }, [adaptivePlan, firstQuestionCatalogTopicId, scrollToPracticeSection, shouldShowFreeSelection, topicFilter]);

  const islandStarTotal = practiceIslandStarTotal(islandStars);
  const mastersKeepLocked = islandStarTotal < mastersKeepUnlockStarTotal;

  const islandRegionTopicBuckets = useMemo(() => {
    const buckets = new Map<PracticeIslandRegionId, QuestionCatalogTopic[]>();
    questionCatalogTopics.forEach((topic) => {
      const regionId = classifyPracticeIslandTopic({ topicId: topic.topicId, topic: topic.topic });
      const bucket = buckets.get(regionId) ?? [];
      bucket.push(topic);
      buckets.set(regionId, bucket);
    });
    return buckets;
  }, [questionCatalogTopics]);

  const islandRegionStatuses = useMemo(
    () => practiceIslandRegions.map((region) => ({
      region,
      stars: islandStars[region.id] ?? 0,
      locked: region.kind === "review" && mastersKeepLocked
    })),
    [islandStars, mastersKeepLocked]
  );

  const handleIslandRegionSelect = useCallback((regionId: PracticeIslandRegionId) => {
    const region = practiceIslandRegions.find((entry) => entry.id === regionId);
    if (!region) return;

    if (region.kind === "review" && mastersKeepLocked) {
      const missingStars = Math.max(1, mastersKeepUnlockStarTotal - islandStarTotal);
      setIslandRegionNotice({
        en: `Master's Keep opens at ${mastersKeepUnlockStarTotal} stars. Collect ${missingStars} more around the island first.`,
        zh: `大師城堡需要 ${mastersKeepUnlockStarTotal} 顆星才會開放，先在島上再收集 ${missingStars} 顆星吧。`,
        zhHans: `大师城堡需要 ${mastersKeepUnlockStarTotal} 颗星才会开放，先在岛上再收集 ${missingStars} 颗星吧。`
      });
      return;
    }

    if (region.kind === "adaptive" || region.kind === "review") {
      setIslandRegionNotice(null);
      scrollToPracticeSection(adaptivePlan ? "adaptive-practice-round" : "free-selection", "mission-setup-filters");
      return;
    }

    if (region.kind === "challenge") {
      setIslandRegionNotice(null);
      setTopicFilter("all");
      if (activeGradeFilter === "all" && !adventureGradeLock.gradeSelectionDisabled) {
        setGradeFilter(selectedGrade);
      }
      scrollToPracticeSection("free-selection", "mission-setup-filters");
      return;
    }

    const regionTopics = islandRegionTopicBuckets.get(region.id) ?? [];
    if (!regionTopics.length) {
      setIslandRegionNotice({
        en: "No missions in this region for the current grade yet. Try another region.",
        zh: "這個區域在目前年級還沒有任務，試試其他區域吧。",
        zhHans: "这个区域在当前年级还没有任务，试试其他区域吧。"
      });
      return;
    }

    const currentTopicIndex = regionTopics.findIndex((topic) => topic.topicId === topicFilter);
    const nextTopic = regionTopics[currentTopicIndex >= 0 ? (currentTopicIndex + 1) % regionTopics.length : 0];
    setIslandRegionNotice(null);
    setTopicFilter(nextTopic.topicId);
    scrollToPracticeSection("free-selection", "mission-setup-filters");
  }, [
    activeGradeFilter,
    adaptivePlan,
    adventureGradeLock.gradeSelectionDisabled,
    islandRegionTopicBuckets,
    islandStarTotal,
    mastersKeepLocked,
    scrollToPracticeSection,
    selectedGrade,
    topicFilter
  ]);

  const adventureProgressTotal = practiceIslandStarTotalMax;
  const adventureProgressValue = Math.min(adventureProgressTotal, islandStarTotal);
  const shouldRenderFreeSelectionRound = shouldShowFreeSelection && hasSelectedPracticeFilter && displayedQuestions.length > 0;

  return (
    <div data-practice-adventure-arena className="relative isolate min-h-screen overflow-hidden bg-[#55cfff] px-3 py-2 text-slate-900 sm:px-5 lg:px-8">
      <style>{`
        body:has([data-practice-adventure-arena]) footer,
        body:has([data-practice-adventure-arena]) nextjs-portal,
        body:has([data-practice-adventure-arena]) .bg-radial-glow,
        body:has([data-practice-adventure-arena]) button[aria-label*="AI Tutor"] {
          display: none !important;
        }

        body:has([data-practice-adventure-arena]) main.flex-1 {
          padding-bottom: 0 !important;
        }
      `}</style>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_8%,rgba(255,255,255,0.34),transparent_15%),radial-gradient(circle_at_86%_12%,rgba(255,255,255,0.28),transparent_18%),linear-gradient(180deg,#44c5f2_0%,#58d0f7_52%,#74ddfb_100%)]"
      />
      <div className="relative mx-auto max-w-[1500px]">
      {islandStarFlight ? (
        <div aria-hidden="true" data-testid="island-star-flight" className="pointer-events-none fixed inset-0 z-[140]">
          {Array.from({ length: islandStarFlight.starCount }, (_, starIndex) => (
            <motion.span
              key={`${islandStarFlight.token}-${starIndex}`}
              className="absolute left-0 top-0 text-amber-400 drop-shadow-[0_2px_8px_rgba(245,158,11,0.6)]"
              initial={{
                x: islandStarFlight.from.x - 14,
                y: islandStarFlight.from.y - 14,
                scale: 0.5,
                opacity: 0
              }}
              animate={{
                x: [
                  islandStarFlight.from.x - 14,
                  (islandStarFlight.from.x + islandStarFlight.to.x) / 2 - 14,
                  islandStarFlight.to.x - 14
                ],
                y: [
                  islandStarFlight.from.y - 14,
                  Math.min(islandStarFlight.from.y, islandStarFlight.to.y) - 130,
                  islandStarFlight.to.y - 14
                ],
                scale: [0.5, 1.45, 0.85],
                opacity: [0, 1, 0.95],
                rotate: [0, 24, -8]
              }}
              transition={{ duration: 0.82, delay: starIndex * 0.14, ease: "easeInOut" }}
            >
              <PagerStarIcon className="size-7" />
            </motion.span>
          ))}
        </div>
      ) : null}
      <AnimatePresence>
        {showPracticeCelebration ? (
          <motion.div
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 z-[130] overflow-hidden"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {[0, 1, 2].map((ring) => (
              <motion.span
                key={`practice-ring-${ring}`}
                className="absolute left-1/2 top-[36%] h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-cyan-300/80 shadow-[0_0_36px_rgba(34,211,238,0.45)]"
                initial={{ opacity: 0.85, scale: 0.12 }}
                animate={{ opacity: [0.85, 0.45, 0], scale: [0.12, 1.8 + ring * 0.45, 2.5 + ring * 0.55] }}
                transition={{ duration: 1.25, delay: ring * 0.16, ease: "easeOut" }}
              />
            ))}
            {practiceCelebrationPieces.map((piece) => (
              <motion.span
                key={piece.id}
                className="absolute left-1/2 top-[38%] shadow-lg shadow-slate-950/10"
                style={{
                  width: piece.size,
                  height: piece.rounded ? piece.size : piece.size * 1.7,
                  borderRadius: piece.rounded ? 9999 : 3,
                  backgroundColor: piece.color
                }}
                initial={{ opacity: 0, x: 0, y: 0, rotate: 0, scale: 0.35 }}
                animate={{
                  opacity: [0, 1, 0.9, 0],
                  x: piece.x,
                  y: piece.y,
                  rotate: piece.rotate,
                  scale: [0.35, 1, 0.85]
                }}
                transition={{ duration: 1.75, delay: piece.delay, ease: "easeOut" }}
              />
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <PracticeAdventureArenaShell
        t={t}
        progressValue={adventureProgressValue}
        progressTotal={adventureProgressTotal}
        regions={islandRegionStatuses}
        games={{ adventureIslandUnlocked: hasAdventureIslandUnlock, fishingMasterUnlocked: hasFishingGameUnlock }}
        pulseRegionId={pulseRegionId}
        regionNotice={islandRegionNotice ? t(islandRegionNotice) : null}
        onStartMission={handleAdventureStartMission}
        onRegionSelect={handleIslandRegionSelect}
      />

      {adaptiveLoadError ? (
        <div className="glass-panel mt-8 border-amber-300/40 bg-amber-400/10 p-5 text-sm font-semibold text-amber-800 dark:text-amber-100">
          {adaptiveLoadError}
        </div>
      ) : null}

      {adaptivePlan && !isFreeSelectionUnlocked && !hasManualTopicSelection ? (
        <div id="adaptive-practice-round" className="scroll-mt-28">
          <QuestionPager questions={adaptiveRoundQuestions} onAnswered={handleAdaptiveAnswered} onQuestionStarted={handleAdaptiveQuestionStarted} />
        </div>
      ) : null}

      {adaptivePlan && isFreeSelectionUnlocked ? (
        <div className="glass-panel mt-8 border-emerald-300/35 bg-emerald-400/10 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-lg font-black text-emerald-800 dark:text-emerald-100">
                {t({ en: "Personalized set complete. Free selection is now unlocked.", zh: "適性練習已完成，現在可使用自由選題模式。" })}
              </p>
              {adaptivePracticeSummary?.isComplete ? (
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
                  {t({
                    en: `Accuracy ${adaptivePracticeSummary.correctCount}/${adaptivePracticeSummary.totalQuestions}. Open the summary for timing and personalized next steps.`,
                    zh: `準確率 ${adaptivePracticeSummary.correctCount}/${adaptivePracticeSummary.totalQuestions}。可打開摘要查看時間和適性下一步。`
                  })}
                </p>
              ) : null}
            </div>
            {adaptivePracticeSummary?.isComplete ? (
              <div className="flex flex-col gap-2 sm:flex-row">
                {adaptiveHasAdventureIslandUnlock ? (
                  <a
                    href={studentPracticeGameHrefs.adventureIsland}
                    className="focus-ring inline-flex justify-center rounded-full bg-emerald-600 px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 dark:bg-emerald-300 dark:text-emerald-950"
                  >
                    {t({ en: "Start Adventure Island", zh: "開始探险岛", zhHans: "开始探险岛" })}
                  </a>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    setPracticeSummaryMode("adaptive");
                    setPracticeSummaryOpen(true);
                  }}
                  className="focus-ring inline-flex justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 dark:bg-white dark:text-slate-950"
                >
                  {t({ en: "View summary", zh: "查看摘要" })}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

	      {shouldShowRecommendedNextLesson && recommendedNextLesson ? (
	        <section className="glass-panel mt-6 overflow-hidden border-emerald-300/35 bg-emerald-50/70 p-6 shadow-[0_24px_80px_rgba(16,185,129,0.14)] dark:bg-emerald-950/30 sm:p-8">
          <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.34em] text-emerald-600 dark:text-emerald-300">
                {t({ en: "Recommended next lesson", zh: "建議下一課" })}
              </p>
              <h2 className="mt-4 max-w-5xl text-3xl font-black leading-tight text-slate-950 dark:text-white sm:text-4xl">
                {practiceText(recommendedNextLesson.title)}
              </h2>
              <p className="mt-4 max-w-4xl text-base leading-7 text-slate-600 dark:text-slate-300">
                {practiceText(recommendedNextLesson.description)}
              </p>
            </div>
            <Link
              href={lessonHrefForSlug(recommendedNextLesson.slug)}
              className="focus-ring inline-flex w-full items-center justify-center rounded-full border border-slate-200 bg-white px-7 py-4 text-sm font-black text-slate-950 shadow-xl transition hover:-translate-y-1 hover:shadow-2xl dark:border-white/10 sm:w-auto"
            >
              {t({ en: "Open lesson", zh: "開啟課節" })}
            </Link>
          </div>
	        </section>
	      ) : null}

	      {!adaptivePlan && !shouldShowFreeSelection && questionCatalogError ? (
	        <div role="alert" className="glass-panel mt-8 border-rose-300/45 bg-rose-500/10 p-6 text-center">
	          <p className="text-xl font-black text-rose-700 dark:text-rose-200">{questionCatalogError}</p>
	          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
	            {t({ en: "Try again after the question service is available.", zh: "題庫服務恢復後請再試一次。", zhHans: "题库服务恢复后请再试一次。" })}
	          </p>
	        </div>
	      ) : null}

      {shouldShowFreeSelection ? (
        <section
          id="mission-setup-filters"
          aria-label={t({ en: "Mission setup filters", zh: "任務設定篩選", zhHans: "任务设置筛选" })}
          className={cn(
            "mt-8 grid scroll-mt-28 gap-4 rounded-[28px] border border-cyan-100 bg-cyan-50/90 p-5 shadow-[0_18px_38px_rgba(8,145,178,0.14)]",
            studentFixedGrade ? "md:grid-cols-3" : "md:grid-cols-4"
          )}
        >
          {!studentFixedGrade ? (
            <label className="text-sm font-black text-blue-950">
              {t(dictionary.common.grade)}
              <select
                value={gradeFilter}
                onChange={(event) => setGradeFilter(event.target.value as GradeFilter)}
                className="focus-ring mt-2 w-full rounded-2xl border border-cyan-100 bg-white px-4 py-3 text-sm font-bold text-slate-700"
              >
                <option value="all">{t(dictionary.common.all)}</option>
                {grades.map((grade) => (
                  <option key={grade.id} value={grade.id}>
                    {formatGradeLabelForCurriculum(grade.id, language, curriculumTrack)}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="text-sm font-black text-blue-950">
            {t(dictionary.common.difficulty)}
            <select
              value={difficultyFilter}
              onChange={(event) => setDifficultyFilter(event.target.value as DifficultyFilter)}
              className="focus-ring mt-2 w-full rounded-2xl border border-cyan-100 bg-white px-4 py-3 text-sm font-bold text-slate-700"
            >
              <option value="all">{t(dictionary.common.all)}</option>
              {visibleDifficultiesForSelection.map((difficulty) => (
                <option key={difficulty} value={difficulty}>
                  {formatDifficultyLabel(difficulty, language)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-black text-blue-950">
            {t(dictionary.common.topic)}
            <select
              value={topicFilter}
              onChange={(event) => setTopicFilter(event.target.value)}
              className="focus-ring mt-2 w-full rounded-2xl border border-cyan-100 bg-white px-4 py-3 text-sm font-bold text-slate-700"
            >
              <option value="all">{t(dictionary.common.all)}</option>
              {topicOptions.map(([topicId, topic]) => (
                <option key={topicId} value={topicId}>
                  {studentFixedGrade
                    ? practiceText(topic.topic)
                    : `${formatGradeLabelForCurriculum(topic.grade, language, curriculumTrack, true)} · ${practiceText(topic.topic)}`}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-black text-blue-950">
            {t({ en: "Question type", zh: "題型", zhHans: "题型" })}
            <select
              value={questionTypeFilter}
              onChange={(event) => setQuestionTypeFilter(event.target.value as QuestionTypeFilter)}
              className="focus-ring mt-2 w-full rounded-2xl border border-cyan-100 bg-white px-4 py-3 text-sm font-bold text-slate-700"
            >
              <option value="all">{t(dictionary.common.all)}</option>
              {practiceQuestionTypeOptions.map((questionType) => (
                <option key={questionType} value={questionType}>
                  {t(practiceQuestionTypeLabels[questionType])}
                </option>
              ))}
            </select>
          </label>
        </section>
      ) : null}

      {shouldRenderFreeSelectionRound ? (
        <div id="free-selection" className="scroll-mt-28">
          <div className="mt-8 rounded-[28px] border border-cyan-100 bg-cyan-50/90 p-5 shadow-[0_18px_38px_rgba(8,145,178,0.14)]">
            <div className="grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
              <span className="grid size-14 place-items-center rounded-2xl bg-blue-600 text-xl font-black text-white shadow-[0_8px_0_#1d4ed8]">
                {freeSelectionRoundQuestions.length}
              </span>
              <div>
                <p className="text-lg font-black text-blue-950">
                  {freeSelectionRoundQuestions.length >= freeSelectionRoundQuestionCount
                    ? t({ en: "Mission round: 5 system-assigned questions", zh: "任務回合：系統分配 5 題", zhHans: "任务回合：系统分配 5 题" })
                    : t({ en: "Mission practice: available matching questions", zh: "任務練習：可用符合題目", zhHans: "任务练习：可用符合题目" })}
                </p>
                <p className="mt-2 text-base font-semibold leading-7 text-slate-600 sm:text-lg sm:leading-8">
                  {t({
                    en: "Complete all 5 questions from one topic to open the summary. The next game step depends on Adventure Island status.",
                    zh: "完成同一課題全部 5 題後會顯示摘要；下一個遊戲步驟取決於探险岛通關狀態。",
                    zhHans: "完成同一课题全部 5 题后会显示摘要；下一个游戏步骤取决于探险岛通关状态。"
                  })}
                </p>
              </div>
              <span className="rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-black text-emerald-700">
                {t({ en: "Ready", zh: "已就緒", zhHans: "已就绪" })}
              </span>
            </div>
          </div>
          <QuestionPager
            questions={freeSelectionRoundQuestions}
            onAnswered={handleFreeSelectionAnswered}
          />
        </div>
      ) : null}

      {hasSelectedPracticeFilter && isLoading ? (
        <div className="glass-panel mt-8 p-8 text-center">
          <p className="text-xl font-black text-slate-950 dark:text-white">{t(dictionary.practice.loading)}</p>
        </div>
      ) : null}

      {hasSelectedPracticeFilter && loadError ? (
        <div className="glass-panel mt-8 p-8 text-center">
          <p className="text-xl font-black text-rose-700 dark:text-rose-200">{loadError}</p>
        </div>
      ) : null}

      {hasSelectedPracticeFilter && !isLoading && !loadError && displayedQuestions.length === 0 ? (
        <div className="glass-panel mt-8 p-8 text-center">
          <p className="text-xl font-black text-slate-950 dark:text-white">
            {isCaliforniaPracticeBeta
              ? "No California beta questions match these filters yet."
              : t(dictionary.practice.noMatchTitle)}
          </p>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            {isCaliforniaPracticeBeta
              ? "Broaden the grade, topic, difficulty, or question type. This beta is focused on adaptive practice and diagnostics while the California K-5 textbook/lesson beta remains text-only."
              : t(dictionary.practice.noMatchDesc)}
          </p>
        </div>
      ) : null}

      {hasSelectedPracticeFilter && !isLoading && !loadError && displayedQuestions.length > 0 && displayedQuestions.length < freeSelectionRoundQuestionCount ? (
        <div className="glass-panel mt-8 p-8 text-center">
          <p className="text-xl font-black text-slate-950 dark:text-white">
            {t({ en: "Broaden the filters to start a 5-question round.", zh: "請放寬篩選條件以開始 5 題回合。" })}
          </p>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            {t({
              en: `Only ${displayedQuestions.length} matching question${displayedQuestions.length === 1 ? "" : "s"} found. Game unlocks require a full 5-question same-topic summary.`,
              zh: `目前只有 ${displayedQuestions.length} 道符合條件的題目。遊戲解鎖需要同一課題完整 5 題摘要。`,
              zhHans: `目前只有 ${displayedQuestions.length} 道符合条件的题目。游戏解锁需要同一课题完整 5 题摘要。`
            })}
          </p>
        </div>
      ) : null}

      <AnimatePresence>
        {practiceSummaryOpen && activePracticeSummary ? (
          <motion.div
            className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closePracticeSummary();
            }}
          >
            <motion.section
              role="dialog"
              aria-modal="true"
              aria-labelledby="practice-summary-title"
              aria-describedby="practice-summary-description"
              className="max-h-[calc(100dvh-2rem)] w-full max-w-5xl overflow-y-auto rounded-[1.75rem] border border-slate-200/80 bg-white p-5 shadow-2xl shadow-slate-950/25 dark:border-white/10 dark:bg-slate-950 sm:p-6"
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-500 dark:text-cyan-300">
                    {t({ en: "Practice Arena summary", zh: "練習場摘要" })}
                  </p>
                  <h2 id="practice-summary-title" className="mt-2 text-3xl font-black text-slate-950 dark:text-white">
                    {practiceSummaryMode === "free-selection"
                      ? t({ en: "Free selection round complete", zh: "自由選題回合完成" })
                      : t({ en: "Personalized practice round complete", zh: "適性練習回合完成" })}
                  </h2>
                  <p id="practice-summary-description" className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
                    {t(isYoungLearnerSummary
                      ? youngPracticePraise(activePracticeSummary.accuracyPercent)
                      : practiceSummaryEncouragement(activePracticeSummary.accuracyPercent))}
                  </p>
                </div>
                <button
                  ref={practiceSummaryCloseButtonRef}
                  type="button"
                  onClick={closePracticeSummary}
                  aria-label={t({ en: "Close Practice Arena summary", zh: "關閉練習場摘要" })}
                  className="focus-ring self-start rounded-full border border-slate-200/80 bg-white px-4 py-2 text-lg font-black text-slate-600 transition hover:-translate-y-0.5 hover:text-slate-950 dark:border-white/10 dark:bg-white/[0.07] dark:text-slate-200 dark:hover:text-white"
                >
                  ×
                </button>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.055]">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{t({ en: "Accuracy", zh: "準確率" })}</p>
                  <p className={`mt-2 text-4xl font-black ${activePracticeSummaryToneClassName}`}>{activePracticeSummary.accuracyPercent}%</p>
                  <p className="mt-1 text-sm font-bold text-slate-600 dark:text-slate-300">
                    {activePracticeSummary.correctCount}/{activePracticeSummary.totalQuestions} {t({ en: "correct", zh: "題正確" })}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.055]">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{t({ en: "Total time", zh: "總用時" })}</p>
                  <p className="mt-2 text-4xl font-black gradient-text">{formatPracticeDuration(activePracticeSummary.totalSeconds, language)}</p>
                  <p className="mt-1 text-sm font-bold text-slate-600 dark:text-slate-300">
                    {activePracticeSummary.answeredCount} {practiceSummaryMode === "free-selection"
                      ? t({ en: "free-selection answers checked", zh: "題自由選題已檢查" })
                      : t({ en: "personalized answers checked", zh: "題適性練習已檢查" })}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.055]">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{t({ en: "Average pace", zh: "平均速度" })}</p>
                  <p className="mt-2 text-4xl font-black gradient-text">{formatPracticeDuration(activePracticeSummary.averageSeconds, language)}</p>
                  <p className="mt-1 text-sm font-bold text-slate-600 dark:text-slate-300">
                    {t({ en: "per question", zh: "每題" })}
                  </p>
                </div>
              </div>

              <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200/80 dark:border-white/10">
                <div className="grid grid-cols-[0.8fr_1fr_1fr] bg-slate-100 px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-slate-500 dark:bg-white/[0.06] dark:text-slate-400">
                  <span>{t({ en: "Question", zh: "題目" })}</span>
                  <span>{t({ en: "Result", zh: "結果" })}</span>
                  <span>{t({ en: "Time", zh: "時間" })}</span>
                </div>
                {activePracticeSummary.results.map((result) => (
                  <div key={result.question.id} className="grid grid-cols-[0.8fr_1fr_1fr] border-t border-slate-200/80 px-4 py-3 text-sm font-bold text-slate-700 dark:border-white/10 dark:text-slate-200">
                    <span>{result.questionNumber}</span>
                    <span className={result.correct ? "text-emerald-600 dark:text-emerald-200" : "text-amber-600 dark:text-amber-200"}>
                      {result.correct ? t({ en: "Correct", zh: "正確" }) : t({ en: "Review", zh: "需重溫" })}
                    </span>
                    <span>{formatPracticeDuration(result.durationSeconds, language)}</span>
                  </div>
                ))}
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
                <section className="rounded-2xl border border-amber-300/45 bg-amber-50/80 p-4 dark:border-amber-300/25 dark:bg-amber-950/20">
                  <h3 className="text-base font-black text-slate-950 dark:text-white">
                    {activePracticeSummary.wrongResults.length
                      ? t({ en: "Review focus", zh: "重溫重點" })
                      : t({ en: "No missed items", zh: "沒有錯題" })}
                  </h3>
                  {activePracticeSummary.wrongResults.length ? (
                    <div className="mt-3 space-y-3">
                      {activePracticeSummary.wrongResults.map((result) => (
                        <div key={result.question.id} className="rounded-2xl bg-white/70 p-3 text-sm font-semibold leading-6 text-slate-700 dark:bg-white/[0.06] dark:text-slate-200">
                          <p className="font-black">
                            {t({ en: `Question ${result.questionNumber}`, zh: `第 ${result.questionNumber} 題` })}
                          </p>
                          {result.correctAnswer ? (
                            <p className="mt-1">
                              {t({ en: "Correct answer:", zh: "正確答案：" })} {result.correctAnswer}
                            </p>
                          ) : (
                            <p className="mt-1">{t({ en: "Open the card feedback above for the worked explanation.", zh: "可回到上方題卡查看詳細解釋。" })}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
                      {practiceSummaryMode === "free-selection"
                        ? t({ en: "Everything checked in this free-selection round was correct. Follow the topic game path for the next challenge.", zh: "本輪自由選題全部答對。可按本課題遊戲路線進入下一個挑戰。" })
                        : t({ en: "Everything checked in this personalized round was correct. Use the next path for stretch and spaced retrieval.", zh: "本輪適性練習全部答對。可按下一步路徑進行延伸和間隔提取。" })}
                    </p>
                  )}
                </section>

                <section className="rounded-2xl border border-cyan-300/45 bg-cyan-50/80 p-4 dark:border-cyan-300/25 dark:bg-cyan-950/20">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-black text-slate-950 dark:text-white">{t({ en: "Personalized next path", zh: "個人化下一步路徑" })}</h3>
                      <p className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-200">
                        {activeGameRoundPayload
                          ? t({ en: "Game unlock chain", zh: "遊戲解鎖鏈", zhHans: "游戏解锁链" })
                          : practiceSummaryMode === "free-selection"
                            ? t({ en: "Game eligibility", zh: "遊戲資格", zhHans: "游戏资格" })
                            : summaryNextDecision
                            ? text(adaptiveActionLabels[summaryNextDecision.action])
                            : t({ en: "Personalized recommendation", zh: "適性推薦" })}
                      </p>
                    </div>
                    {practiceSummaryMode === "adaptive" && practiceSummaryRefreshing ? (
                      <span className="rounded-full bg-cyan-400/15 px-3 py-1 text-xs font-black text-cyan-700 dark:text-cyan-100">
                        {t({ en: "Refreshing", zh: "正在更新" })}
                      </span>
                    ) : null}
                  </div>

                  {activePracticeSummary ? (
                    <p className="mt-3 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
                      {practiceGameUnlockStatus?.roundKey === activePracticeSummary.roundKey
                        ? practiceGameUnlockStatus.reason
                        : t({ en: "Complete a same-topic 5-question round at 80%+ to unlock the topic game path.", zh: "完成同一課題 5 題 80%+ 回合，即可解鎖本課題遊戲路線。", zhHans: "完成同一课题 5 题 80%+ 回合，即可解锁本课题游戏路线。" })}
                    </p>
                  ) : summaryNextDecision ? (
                    <p className="mt-3 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
                      {practiceText(summaryNextDecision.explanation)}
                    </p>
                  ) : (
                    <p className="mt-3 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
                      {t({ en: "The personalized engine will use this round to choose your next practice target.", zh: "適性引擎會使用這一輪結果選擇下一個練習目標。" })}
                    </p>
                  )}

                  <div className="mt-4 grid gap-3">
                    <div className="rounded-2xl bg-white/75 p-3 dark:bg-white/[0.06]">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-200">{t({ en: "Knowledge point", zh: "知識點" })}</p>
                      <p className="mt-2 text-sm font-bold leading-6 text-slate-700 dark:text-slate-200">
                        {practiceSummaryMode === "free-selection"
                          ? activePracticeSummary.topic
                            ? practiceText(activePracticeSummary.topic)
                            : t({ en: "This free-selection round", zh: "本輪自由選題" })
                          : summaryKnowledgeTitle
                          ? `${summaryTopicTitle ? `${practiceText(summaryTopicTitle)} · ` : ""}${practiceText(summaryKnowledgeTitle)}`
                          : t({ en: "Continue with the current personalized skill target.", zh: "繼續目前的適性技能目標。" })}
                      </p>
                    </div>
                    {isYoungLearnerSummary ? (
                      <>
                        <div className="rounded-2xl bg-white/75 p-3 dark:bg-white/[0.06]" data-testid="young-summary-stars">
                          <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-200">{t({ en: "Your stars", zh: "你的星星" })}</p>
                          <p className="mt-2 text-sm font-bold leading-6 text-slate-700 dark:text-slate-200">
                            {t(youngPracticeStarLine(activePracticeSummary.correctCount, activePracticeSummary.totalQuestions))}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-white/75 p-3 dark:bg-white/[0.06]" data-testid="young-summary-tip">
                          <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-200">{t({ en: "Try this", zh: "試試看", zhHans: "试试看" })}</p>
                          <p className="mt-2 text-sm font-bold leading-6 text-slate-700 dark:text-slate-200">
                            {t(youngPracticeTip(activePracticeSummary.accuracyPercent))}
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="rounded-2xl bg-white/75 p-3 dark:bg-white/[0.06]">
                          <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-200">{t({ en: "Learning method", zh: "學習方法" })}</p>
                          <p className="mt-2 text-sm font-bold leading-6 text-slate-700 dark:text-slate-200">
                            {t(learningMethodSuggestion(activePracticeSummary.accuracyPercent, activePracticeSummary.averageSeconds))}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-white/75 p-3 dark:bg-white/[0.06]">
                          <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-200">{t({ en: "Metacognition", zh: "元認知" })}</p>
                          <p className="mt-2 text-sm font-bold leading-6 text-slate-700 dark:text-slate-200">
                            {t(metacognitionSuggestion(activePracticeSummary.accuracyPercent))}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-white/75 p-3 dark:bg-white/[0.06]">
                          <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-200">{t({ en: "Emotional support", zh: "情感支持" })}</p>
                          <p className="mt-2 text-sm font-bold leading-6 text-slate-700 dark:text-slate-200">
                            {t(emotionalSupportSuggestion(activePracticeSummary.accuracyPercent))}
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  {practiceSummaryMode === "adaptive" && summaryDueReviews.length ? (
                    <div className="mt-4 rounded-2xl border border-cyan-300/35 bg-cyan-400/10 p-3">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-100">{t({ en: "Due review queue", zh: "到期重溫隊列" })}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {summaryDueReviews.slice(0, 3).map((item) => (
                          <span key={item.skill.id} className="rounded-full bg-white/80 px-3 py-1 text-xs font-black text-cyan-800 dark:bg-white/[0.08] dark:text-cyan-100">
                            {practiceText(item.skill.title)}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-4 flex flex-col gap-3 sm:flex-row lg:flex-col">
                    {hasFishingGameUnlock ? (
                      <a
                        href={studentPracticeGameHrefs.fishingMaster}
                        className="focus-ring inline-flex justify-center rounded-full bg-emerald-600 px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 dark:bg-emerald-300 dark:text-emerald-950"
                      >
                        {t({ en: "Start Fishing Master", zh: "開始捕魚達人", zhHans: "开始捕鱼达人" })}
                      </a>
                    ) : null}
                    {hasAdventureIslandUnlock ? (
                      <a
                        href={studentPracticeGameHrefs.adventureIsland}
                        className="focus-ring inline-flex justify-center rounded-full bg-emerald-600 px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 dark:bg-emerald-300 dark:text-emerald-950"
                      >
                        {t({ en: "Start Adventure Island", zh: "開始探险岛", zhHans: "开始探险岛" })}
                      </a>
                    ) : null}
                    {practiceSummaryMode === "adaptive" && summaryNextLesson ? (
                      <Link
                        href={lessonHrefForSlug(summaryNextLesson.slug)}
                        className="focus-ring inline-flex justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 dark:bg-white dark:text-slate-950"
                      >
                        {t({ en: "Open recommended lesson", zh: "開啟建議課節" })}
                      </Link>
                    ) : null}
                    <Link
                      href="/mistake-book"
                      className="focus-ring inline-flex justify-center rounded-full border border-slate-200/80 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:-translate-y-0.5 dark:border-white/10 dark:bg-white/[0.07] dark:text-white"
                    >
                      {t(dictionary.nav.mistakes)}
                    </Link>
                    <button
                      type="button"
                      onClick={closePracticeSummary}
                      className="focus-ring inline-flex justify-center rounded-full border border-cyan-300/55 bg-cyan-400/15 px-5 py-3 text-sm font-black text-cyan-700 transition hover:-translate-y-0.5 dark:text-cyan-100"
                    >
                      {t({ en: "Back to Practice Arena", zh: "返回練習場" })}
                    </button>
                  </div>
                </section>
              </div>
            </motion.section>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <PracticeArenaBackToTopButton />
      </div>
    </div>
  );
}
