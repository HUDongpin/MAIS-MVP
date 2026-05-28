"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import type { ComponentType } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "@/components/ui/Motion";
import { LessonBackToTopButton } from "@/components/lesson/LessonBackToTopButton";
import { MathText } from "@/components/math/MathText";
import { dictionary, useSettings } from "@/components/providers/AppProviders";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { getMainlandHjbHighLessonIllustration } from "@/data/mainlandHjbHighLessonIllustrations";
import { getMainlandHjbJuniorLessonIllustration } from "@/data/mainlandHjbJuniorLessonIllustrations";
import { getMainlandHjbPrimaryLessonIllustration } from "@/data/mainlandHjbPrimaryLessonIllustrations";
import { getMainlandPepHighLessonIllustration } from "@/data/mainlandPepHighLessonIllustrations";
import { getMainlandPepJuniorLessonIllustration } from "@/data/mainlandPepJuniorLessonIllustrations";
import { getMainlandPepPrimaryLessonIllustration } from "@/data/mainlandPepPrimaryLessonIllustrations";
import type { VisualizationModuleId } from "@/data/visualizationLabs";
import { formatDifficultyLabel, formatGradeLabel } from "@/lib/i18n";
import { lessonHrefForSlug } from "@/lib/lessonLinks";
import { dedupePracticeQuestions } from "@/lib/practiceQuestionDeduping";
import type { AttemptFeedback, Language, LessonBlock, LessonDetail, LessonEntryTarget, PublicQuestion } from "@/types";

type LessonResponse = {
  lesson?: LessonDetail;
};

type LessonEntryResponse = {
  lessonEntryTarget?: LessonEntryTarget | null;
};

type LessonViewProps = {
  slug: string;
  initialLesson: LessonDetail | null;
};

type LessonQuestionResult = {
  correct: boolean;
  correctAnswer?: string;
  durationSeconds: number;
  answeredAt: number;
};

type LessonLoadState = "idle" | "loading" | "ready" | "error";

type LessonQuestionSummaryItem = LessonQuestionResult & {
  question: PublicQuestion;
  questionNumber: number;
};

type LessonPracticeCardProps = {
  question: PublicQuestion;
  onAnswered?: (question: PublicQuestion, feedback: AttemptFeedback) => void;
};

type LessonVisualizationProps = {
  topicId: string;
  showAxisLabels?: boolean;
};

type LessonContentSegment =
  | {
      id: string;
      kind: "text";
      text: string;
    }
  | {
      answerText: string;
      id: string;
      kind: "answer";
      promptText: string;
    };

const celebrationColors = ["#06b6d4", "#8b5cf6", "#22c55e", "#f59e0b", "#ec4899", "#38bdf8"];
const lessonPracticeQuestionLimit = 5;
const hiddenLessonIllustrationIds = new Set(["pep-high-s4-function-properties-worked-example"]);
const lessonCelebrationPieces = Array.from({ length: 36 }, (_, index) => {
  const angle = ((index * 137.5) % 360) * (Math.PI / 180);
  const distance = 128 + (index % 6) * 22;

  return {
    id: index,
    x: Math.round(Math.cos(angle) * distance),
    y: Math.round(Math.sin(angle) * distance - 72 - (index % 4) * 12),
    rotate: (index % 2 === 0 ? 1 : -1) * (160 + index * 17),
    delay: (index % 9) * 0.035,
    size: 7 + (index % 4) * 3,
    color: celebrationColors[index % celebrationColors.length],
    rounded: index % 3 === 0
  };
});

function DeferredLessonPanel() {
  return (
    <div
      aria-hidden="true"
      className="min-h-40 animate-pulse rounded-2xl border border-slate-200/70 bg-white/60 shadow-sm shadow-slate-950/5 dark:border-white/10 dark:bg-white/[0.055]"
    />
  );
}

const PracticeQuestionCard = dynamic<LessonPracticeCardProps>(
  () => import("@/components/practice/PracticeQuestionCard").then((module) => module.PracticeQuestionCard),
  { loading: () => <DeferredLessonPanel />, ssr: false }
);

const CalculusStatsLab = dynamic<LessonVisualizationProps>(
  () => import("@/components/visualizations/CalculusStatsLab").then((module) => module.CalculusStatsLab as ComponentType<LessonVisualizationProps>),
  { loading: () => <DeferredLessonPanel />, ssr: false }
);

const ConfiguredVisualizationLab = dynamic<LessonVisualizationProps>(
  () => import("@/components/visualizations/ConfiguredVisualizationLab").then((module) => module.ConfiguredVisualizationLab as ComponentType<LessonVisualizationProps>),
  { loading: () => <DeferredLessonPanel />, ssr: false }
);

const CoordinatePlaneDemo = dynamic<LessonVisualizationProps>(
  () => import("@/components/visualizations/CoordinatePlaneDemo").then((module) => module.CoordinatePlaneDemo as ComponentType<LessonVisualizationProps>),
  { loading: () => <DeferredLessonPanel />, ssr: false }
);

const FunctionModelComparer = dynamic<LessonVisualizationProps>(
  () => import("@/components/visualizations/FunctionModelComparer").then((module) => module.FunctionModelComparer as ComponentType<LessonVisualizationProps>),
  { loading: () => <DeferredLessonPanel />, ssr: false }
);

const FunctionGraphExplorer = dynamic<LessonVisualizationProps>(
  () => import("@/components/visualizations/FunctionGraphExplorer").then((module) => module.FunctionGraphExplorer as ComponentType<LessonVisualizationProps>),
  { loading: () => <DeferredLessonPanel />, ssr: false }
);

const GeometryExplorer = dynamic<LessonVisualizationProps>(
  () => import("@/components/visualizations/GeometryExplorer").then((module) => module.GeometryExplorer as ComponentType<LessonVisualizationProps>),
  { loading: () => <DeferredLessonPanel />, ssr: false }
);

const ProbabilitySimulator = dynamic<LessonVisualizationProps>(
  () => import("@/components/visualizations/ProbabilitySimulator").then((module) => module.ProbabilitySimulator as ComponentType<LessonVisualizationProps>),
  { loading: () => <DeferredLessonPanel />, ssr: false }
);

const TrigWaveExplorer = dynamic<LessonVisualizationProps>(
  () => import("@/components/visualizations/TrigWaveExplorer").then((module) => module.TrigWaveExplorer as ComponentType<LessonVisualizationProps>),
  { loading: () => <DeferredLessonPanel />, ssr: false }
);

function formatLessonDuration(seconds: number, language: Language) {
  if (seconds < 60) return language === "en" ? `${seconds}s` : `${seconds} 秒`;

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (language === "en") return remainingSeconds ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  return remainingSeconds ? `${minutes} 分 ${remainingSeconds} 秒` : `${minutes} 分鐘`;
}

function lessonSummaryEncouragement(accuracyPercent: number) {
  if (accuracyPercent >= 80) {
    return {
      en: "Strong finish. Keep this rhythm and use Practice Arena later to stretch the topic.",
      zh: "完成得很好。保持這個節奏，稍後到練習場挑戰更多同課題題目。"
    };
  }

  if (accuracyPercent >= 50) {
    return {
      en: "Good effort. Review the missed items, then visit Practice Arena later to make the method steadier.",
      zh: "做得有進展。先重溫錯題，稍後到練習場把方法練得更穩。"
    };
  }

  return {
    en: "This is useful learning data. Revisit the examples, then use Practice Arena later for a gentler rebuild.",
    zh: "這些作答很有參考價值。先回看例題，稍後到練習場用較溫和的題目重新建立信心。"
  };
}

function blocksByType(lesson: LessonDetail | null, type: LessonBlock["type"]) {
  return lesson?.blocks.filter((block) => block.type === type) ?? [];
}

function limitLessonPracticeQuestions(lesson: LessonDetail | null) {
  if (!lesson || lesson.practiceQuestions.length <= lessonPracticeQuestionLimit) return lesson;

  const practiceQuestions = dedupePracticeQuestions(lesson.practiceQuestions).slice(0, lessonPracticeQuestionLimit);
  const practiceQuestionIds = new Set(practiceQuestions.map((question) => question.id));

  return {
    ...lesson,
    practiceQuestions,
    blocks: lesson.blocks.map((block) => {
      if (block.type !== "practice") return block;

      return {
        ...block,
        practiceQuestionIds: block.practiceQuestionIds?.filter((questionId) => practiceQuestionIds.has(questionId))
      };
    })
  };
}

const lessonVisualizationRegistry: Record<VisualizationModuleId, ComponentType<LessonVisualizationProps>> = {
  "function-graph-explorer": FunctionGraphExplorer,
  "coordinate-plane-demo": CoordinatePlaneDemo,
  "geometry-explorer": GeometryExplorer,
  "probability-simulator": ProbabilitySimulator,
  "function-model-comparer": FunctionModelComparer,
  "trig-wave-explorer": TrigWaveExplorer,
  "calculus-stats-lab": CalculusStatsLab,
  "configured-visualization-lab": ConfiguredVisualizationLab
};

function getLessonVisualization(moduleId: string | undefined) {
  if (!moduleId) return null;
  return moduleId in lessonVisualizationRegistry
    ? lessonVisualizationRegistry[moduleId as VisualizationModuleId]
    : null;
}

const revealableAnswerPattern = /(答案\s*[:：]\s*|Answer\s*:\s*)/;

function splitLessonContentForAnswerReveal(content: string): LessonContentSegment[] {
  return content
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const answerMatch = line.match(revealableAnswerPattern);
      const answerStartIndex = answerMatch?.index ?? -1;

      if (answerStartIndex <= 0) {
        return {
          id: `line-${index}`,
          kind: "text",
          text: line
        } satisfies LessonContentSegment;
      }

      return {
        answerText: line.slice(answerStartIndex).trim(),
        id: `line-${index}`,
        kind: "answer",
        promptText: line.slice(0, answerStartIndex).trim()
      } satisfies LessonContentSegment;
    });
}

function lessonContentPanelId(blockId: string, segmentId: string) {
  return `${blockId}-${segmentId}-answer`.replace(/[^A-Za-z0-9_-]/g, "-");
}

function LessonContentWithAnswerReveal({ blockId, content }: { blockId: string; content: string }) {
  const { t } = useSettings();
  const prefersReducedMotion = useReducedMotion();
  const [revealedAnswers, setRevealedAnswers] = useState<Record<string, boolean>>({});
  const segments = useMemo(() => splitLessonContentForAnswerReveal(content), [content]);
  const hasRevealableAnswers = segments.some((segment) => segment.kind === "answer");

  useEffect(() => {
    setRevealedAnswers({});
  }, [blockId, content]);

  if (!hasRevealableAnswers) {
    return <MathText as="p" text={content} className="mt-3 text-base leading-8 text-slate-600 dark:text-slate-300" />;
  }

  return (
    <div className="mt-3 space-y-3">
      {segments.map((segment) => {
        if (segment.kind === "text") {
          return (
            <MathText
              key={segment.id}
              as="p"
              text={segment.text}
              className="text-base leading-8 text-slate-600 dark:text-slate-300"
            />
          );
        }

        const isRevealed = Boolean(revealedAnswers[segment.id]);
        const panelId = lessonContentPanelId(blockId, segment.id);

        return (
          <div
            key={segment.id}
            className="rounded-2xl border border-cyan-200/75 bg-cyan-50/55 p-4 shadow-sm shadow-cyan-500/10 dark:border-cyan-300/15 dark:bg-cyan-950/20"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <MathText
                as="p"
                text={segment.promptText}
                className="min-w-0 flex-1 text-base font-semibold leading-8 text-slate-700 dark:text-slate-200"
              />
              <button
                type="button"
                aria-controls={panelId}
                aria-expanded={isRevealed}
                onClick={() =>
                  setRevealedAnswers((current) => ({
                    ...current,
                    [segment.id]: !current[segment.id]
                  }))
                }
                className="focus-ring inline-flex shrink-0 justify-center rounded-full border border-cyan-300/70 bg-white/85 px-4 py-2 text-sm font-black text-cyan-700 shadow-sm shadow-cyan-500/10 transition hover:-translate-y-0.5 hover:bg-cyan-50 dark:border-cyan-300/25 dark:bg-white/[0.08] dark:text-cyan-100 dark:hover:bg-white/[0.12]"
              >
                {isRevealed
                  ? t({ en: "Hide answer", zh: "收起答案", zhHans: "收起答案" })
                  : t({ en: "Show answer", zh: "顯示答案", zhHans: "显示答案" })}
              </button>
            </div>
            <AnimatePresence initial={false}>
              {isRevealed ? (
                <motion.div
                  id={panelId}
                  className="mt-3 overflow-hidden rounded-2xl border border-emerald-200/80 bg-emerald-50/80 px-4 py-3 dark:border-emerald-300/20 dark:bg-emerald-950/25"
                  initial={prefersReducedMotion ? false : { opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                >
                  <MathText
                    as="p"
                    text={segment.answerText}
                    className="text-base font-semibold leading-8 text-emerald-900 dark:text-emerald-100"
                  />
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

function lessonIllustrationSlotForBlock(block: LessonBlock) {
  if (block.type === "concept" || block.type === "worked-example") return block.type;
  return null;
}

function getLessonIllustration(lesson: LessonDetail, block: LessonBlock) {
  const slot = lessonIllustrationSlotForBlock(block);
  if (!slot) return null;

  if (lesson.publisher === "MAINLAND_HJB" && lesson.topicId.startsWith("hjb-high-")) {
    return getMainlandHjbHighLessonIllustration(lesson.topicId, slot);
  }

  if (lesson.publisher === "MAINLAND_HJB" && lesson.topicId.startsWith("hjb-primary-")) {
    return getMainlandHjbPrimaryLessonIllustration(lesson.topicId, slot);
  }

  if (lesson.publisher === "MAINLAND_HJB" && lesson.topicId.startsWith("hjb-junior-")) {
    return getMainlandHjbJuniorLessonIllustration(lesson.topicId, slot);
  }

  if (lesson.publisher !== "MAINLAND_PEP") return null;

  if (lesson.topicId.startsWith("pep-primary-")) {
    return getMainlandPepPrimaryLessonIllustration(lesson.topicId, slot);
  }

  if (lesson.topicId.startsWith("pep-high-")) {
    return getMainlandPepHighLessonIllustration(lesson.topicId, slot);
  }

  if (lesson.topicId.startsWith("pep-junior-")) {
    return getMainlandPepJuniorLessonIllustration(lesson.topicId, slot);
  }

  return null;
}

function normalizeLessonSummaryAnswer(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/([0-9)\]])\s*(and|or)\s*([A-Za-z(])/gi, "$1 $2 $3")
    .replace(/\s*(<=|>=|=|≈|≤|≥|<|>)\s*/g, " $1 ")
    .replace(/\s*,\s*/g, ", ")
    .replace(/\s+/g, " ");
}

function shouldRenderLessonSummaryAnswerAsBareMath(value: string) {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 80) return false;

  const allowedMathWords = new Set(["sin", "cos", "tan", "log", "ln", "sqrt", "frac", "theta", "pi"]);
  const words = trimmed.match(/[A-Za-z]+/g) ?? [];
  if (words.some((word) => word.length > 1 && !allowedMathWords.has(word.toLowerCase()))) return false;

  if (/^[+-]?\d+(?:\.\d+)?%?$/.test(trimmed)) return true;
  if (/^\(\s*[+-]?\d+(?:\.\d+)?\s*,\s*[+-]?\d+(?:\.\d+)?\s*\)$/.test(trimmed)) return true;
  if (/^[A-Za-zθπ](?:_\{?\d+\}?|\d)?\s*(?:=|≈|<|>|≤|≥)\s*.+$/.test(trimmed)) return true;

  return /^[\\A-Za-zθπ0-9{}_^()+\-/*=<>≤≥≈.,:°\s]+$/.test(trimmed) && /[=^/\\]|[θπ]|°/.test(trimmed);
}

function formatLessonSummaryAnswerForMathText(value: string) {
  const answer = normalizeLessonSummaryAnswer(value);
  const conjunctionParts = answer.split(/\s+(and|or)\s+/i);

  if (
    conjunctionParts.length === 3 &&
    shouldRenderLessonSummaryAnswerAsBareMath(conjunctionParts[0]) &&
    shouldRenderLessonSummaryAnswerAsBareMath(conjunctionParts[2])
  ) {
    return `\\(${conjunctionParts[0]}\\) ${conjunctionParts[1].toLowerCase()} \\(${conjunctionParts[2]}\\)`;
  }

  return answer;
}

export function LessonView({ slug, initialLesson }: LessonViewProps) {
  const { currentUser, language, refreshLessonEntryTarget, settingsReady, t, text } = useSettings();
  const prefersReducedMotion = useReducedMotion();
  const questionStartedAtRef = useRef<Record<string, number>>({});
  const summaryCloseButtonRef = useRef<HTMLButtonElement | null>(null);
  const normalizedInitialLesson = useMemo(() => limitLessonPracticeQuestions(initialLesson), [initialLesson]);
  const [lesson, setLesson] = useState<LessonDetail | null>(normalizedInitialLesson);
  const [lessonLoadState, setLessonLoadState] = useState<LessonLoadState>(normalizedInitialLesson ? "ready" : "idle");
  const [checklistState, setChecklistState] = useState<Record<string, boolean>>(normalizedInitialLesson?.checklistState ?? {});
  const [questionResults, setQuestionResults] = useState<Record<string, LessonQuestionResult>>({});
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [summaryAutoOpened, setSummaryAutoOpened] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [gradeRedirectError, setGradeRedirectError] = useState(false);
  const canSaveProgress = settingsReady && currentUser?.role === "student";
  const canViewTeacherGuide = currentUser?.role === "teacher" || currentUser?.role === "admin";
  const hasStudentGradeMismatch = Boolean(settingsReady && currentUser?.role === "student" && lesson && lesson.grade !== currentUser.grade);
  const conceptBlocks = useMemo(() => [
    ...blocksByType(lesson, "concept"),
    ...blocksByType(lesson, "worked-example")
  ], [lesson]);
  const lessonPracticeQuestions = useMemo(
    () => dedupePracticeQuestions(lesson?.practiceQuestions ?? []),
    [lesson]
  );
  const checklistBlock = blocksByType(lesson, "checklist")[0];
  const extensionBlocks = blocksByType(lesson, "extension");
  const teacherGuideBlocks = blocksByType(lesson, "teacher-guide");
  const visualizationBlock = blocksByType(lesson, "visualization")[0];
  const VisualizationModule = getLessonVisualization(visualizationBlock?.visualizationConfig?.moduleId);
  const showVisualizationAxisLabels = visualizationBlock?.visualizationConfig?.moduleId === "function-graph-explorer";
  const lessonPracticeSummary = useMemo(() => {
    if (!lessonPracticeQuestions.length) return null;

    const results = lessonPracticeQuestions
      .map((question, index): LessonQuestionSummaryItem | null => {
        const result = questionResults[question.id];
        if (!result) return null;

        return {
          ...result,
          question,
          questionNumber: index + 1
        };
      })
      .filter((result): result is LessonQuestionSummaryItem => Boolean(result));
    const totalQuestions = lessonPracticeQuestions.length;
    const correctCount = results.filter((result) => result.correct).length;
    const totalSeconds = results.reduce((sum, result) => sum + result.durationSeconds, 0);
    const accuracyPercent = totalQuestions ? Math.round((correctCount / totalQuestions) * 100) : 0;

    return {
      answeredCount: results.length,
      averageSeconds: results.length ? Math.round(totalSeconds / results.length) : 0,
      accuracyPercent,
      correctCount,
      isComplete: results.length === totalQuestions,
      results,
      totalQuestions,
      totalSeconds,
      wrongResults: results.filter((result) => !result.correct)
    };
  }, [lessonPracticeQuestions, questionResults]);

  useEffect(() => {
    setLesson(normalizedInitialLesson);
    setLessonLoadState(normalizedInitialLesson ? "ready" : "idle");
    setChecklistState(normalizedInitialLesson?.checklistState ?? {});
    questionStartedAtRef.current = {};
    setQuestionResults({});
    setIsSummaryOpen(false);
    setSummaryAutoOpened(false);
    setShowCelebration(false);
    setGradeRedirectError(false);
  }, [normalizedInitialLesson, slug]);

  useEffect(() => {
    if (lesson || normalizedInitialLesson || !settingsReady) return;

    const canFetchAuthenticatedLesson =
      currentUser?.role === "student" ||
      currentUser?.role === "teacher" ||
      currentUser?.role === "admin";

    if (!canFetchAuthenticatedLesson) {
      setLessonLoadState("error");
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    async function loadAuthenticatedLesson() {
      setLessonLoadState("loading");

      try {
        const response = await fetch(`/api/lessons/${encodeURIComponent(slug)}`, {
          cache: "no-store",
          signal: controller.signal
        });
        const body = (await response.json()) as LessonResponse;
        const nextLesson = limitLessonPracticeQuestions(body.lesson ?? null);

        if (!response.ok || !nextLesson) {
          throw new Error("Lesson not found.");
        }

        if (!cancelled) {
          setLesson(nextLesson);
          setChecklistState(nextLesson.checklistState ?? {});
          setLessonLoadState("ready");
        }
      } catch {
        if (!cancelled && !controller.signal.aborted) {
          setLessonLoadState("error");
        }
      }
    }

    void loadAuthenticatedLesson();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [currentUser?.role, lesson, normalizedInitialLesson, settingsReady, slug]);

  useEffect(() => {
    if (!hasStudentGradeMismatch || !currentUser || !lesson) return;

    let cancelled = false;
    const controller = new AbortController();
    const studentGrade = currentUser.grade;

    async function redirectToStudentGradeLesson() {
      setGradeRedirectError(false);

      try {
        const response = await fetch(`/api/lesson-entry?grade=${encodeURIComponent(studentGrade)}`, {
          cache: "no-store",
          signal: controller.signal
        });
        const body = (await response.json()) as LessonEntryResponse;
        const targetHref = body.lessonEntryTarget?.href ?? null;
        if (!response.ok || !targetHref) throw new Error("Could not find a lesson for this grade.");
        if (targetHref === lessonHrefForSlug(slug)) throw new Error("Lesson entry returned the current mismatched lesson.");
        if (!cancelled) window.location.replace(targetHref);
      } catch {
        if (!cancelled && !controller.signal.aborted) setGradeRedirectError(true);
      }
    }

    void redirectToStudentGradeLesson();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [currentUser, hasStudentGradeMismatch, lesson, slug]);

  useEffect(() => {
    if (!lessonPracticeSummary?.isComplete || summaryAutoOpened) return;

    setIsSummaryOpen(true);
    setSummaryAutoOpened(true);
    if (prefersReducedMotion) return;

    setShowCelebration(true);
    const celebrationTimer = window.setTimeout(() => setShowCelebration(false), 2300);
    return () => window.clearTimeout(celebrationTimer);
  }, [lessonPracticeSummary?.isComplete, prefersReducedMotion, summaryAutoOpened]);

  useEffect(() => {
    if (!isSummaryOpen) return;

    const previousOverflow = document.body.style.overflow;
    const focusTimer = window.setTimeout(() => summaryCloseButtonRef.current?.focus(), 40);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsSummaryOpen(false);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isSummaryOpen]);

  useEffect(() => {
    if (!canSaveProgress || !lesson) return;

    const controller = new AbortController();
    let idleHandle: number | null = null;
    let timeoutHandle: number | null = null;

    const saveLessonStart = () => {
      void fetch("/api/lesson-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, action: "start" }),
        signal: controller.signal
      }).catch(() => {
        // Progress is best-effort; the lesson should remain readable if saving fails.
      });
    };

    if (typeof window.requestIdleCallback === "function") {
      idleHandle = window.requestIdleCallback(saveLessonStart, { timeout: 1600 });
    } else {
      timeoutHandle = window.setTimeout(saveLessonStart, 450);
    }

    return () => {
      if (idleHandle !== null && typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idleHandle);
      }
      if (timeoutHandle !== null) {
        window.clearTimeout(timeoutHandle);
      }
      controller.abort();
    };
  }, [canSaveProgress, lesson, slug]);

  function updateChecklist(itemKey: string, checked: boolean) {
    const nextState = { ...checklistState, [itemKey]: checked };
    setChecklistState(nextState);
    if (!canSaveProgress) return;

    void fetch("/api/lesson-progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, action: "update", checklistState: nextState })
    });
  }

  function completeLesson() {
    if (!canSaveProgress) return;

    void fetch("/api/lesson-progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, action: "complete", checklistState })
    }).then(async (response) => {
      if (!response.ok) return;
      const body = (await response.json()) as LessonResponse;
      if (body.lesson && lesson) {
        setLesson({ ...lesson, ...body.lesson });
        void fetch("/api/adaptive-learning/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            grade: body.lesson.grade,
            topicId: body.lesson.topicId
          })
        }).catch(() => {
          // The lesson completion is already saved; adaptive rerank refresh is best-effort.
        });
        void refreshLessonEntryTarget(body.lesson.grade);
      }
    });
  }

  function startQuestionTimer(questionId: string) {
    questionStartedAtRef.current[questionId] = questionStartedAtRef.current[questionId] ?? Date.now();
  }

  function handleLessonQuestionAnswered(question: PublicQuestion, feedback: AttemptFeedback) {
    const startedAt = questionStartedAtRef.current[question.id] ?? Date.now();
    const durationSeconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));

    delete questionStartedAtRef.current[question.id];
    setQuestionResults((current) => ({
      ...current,
      [question.id]: {
        correct: feedback.correct,
        correctAnswer: feedback.correctAnswer,
        durationSeconds,
        answeredAt: Date.now()
      }
    }));
  }

  if (!lesson && lessonLoadState !== "error") {
    return (
      <div className="page-container py-10 sm:py-12">
        <SectionHeader
          eyebrow={t(dictionary.lesson.label)}
          title={t({ en: "Opening your lesson", zh: "正在開啟課節", zhHans: "正在开启课时" })}
          description={t({
            en: "MAIS is checking your sign-in and curriculum profile before loading this lesson.",
            zh: "MAIS 正在檢查你的登入狀態與課程設定，然後載入此課節。",
            zhHans: "MAIS 正在检查你的登录状态与课程设置，然后载入此课时。"
          })}
        />
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="page-container py-10 sm:py-12">
        <SectionHeader
          eyebrow={t(dictionary.lesson.label)}
          title={t(dictionary.lesson.notFoundTitle)}
          description={t(dictionary.lesson.notFoundDesc)}
          action={<Link href="/learning-path" className="focus-ring rounded-full bg-slate-950 px-5 py-3 font-bold text-white dark:bg-white dark:text-slate-950">{t(dictionary.lesson.backToRoadmap)}</Link>}
        />
      </div>
    );
  }

  if (hasStudentGradeMismatch) {
    return (
      <div className="page-container py-10 sm:py-12">
        <SectionHeader
          eyebrow={formatGradeLabel(currentUser?.grade ?? lesson.grade, language, true)}
          title={t({ en: "Opening your grade lesson", zh: "正在開啟你的年級課節" })}
          description={
            gradeRedirectError
              ? t({ en: "We could not switch lessons automatically. Open Learning Path to choose a lesson for your grade.", zh: "暫時未能自動切換課節。請到學習路徑選擇你年級的課節。" })
              : t({ en: "This lesson belongs to another grade, so MAIS is taking you to the right lesson for your profile.", zh: "這個課節屬於另一個年級，MAIS 正在帶你前往符合個人檔案的課節。" })
          }
          action={gradeRedirectError ? <Link href="/learning-path" className="focus-ring rounded-full bg-slate-950 px-5 py-3 font-bold text-white dark:bg-white dark:text-slate-950">{t(dictionary.lesson.backToRoadmap)}</Link> : null}
        />
      </div>
    );
  }

  const visualizationTopicId = visualizationBlock?.visualizationConfig?.topicId ?? lesson.topicId;
  const practiceArenaHref = `/practice?lesson=${encodeURIComponent(slug)}&topicId=${encodeURIComponent(lesson.topicId)}`;
  const summaryToneClassName = lessonPracticeSummary && lessonPracticeSummary.accuracyPercent >= 80
    ? "text-emerald-600 dark:text-emerald-200"
    : lessonPracticeSummary && lessonPracticeSummary.accuracyPercent >= 50
      ? "text-cyan-600 dark:text-cyan-200"
      : "text-amber-600 dark:text-amber-200";

  return (
    <div className="page-container py-10 sm:py-12">
      <AnimatePresence>
        {showCelebration ? (
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
                key={`ring-${ring}`}
                className="absolute left-1/2 top-[36%] h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-cyan-300/80 shadow-[0_0_36px_rgba(34,211,238,0.45)]"
                initial={{ opacity: 0.85, scale: 0.12 }}
                animate={{ opacity: [0.85, 0.45, 0], scale: [0.12, 1.8 + ring * 0.45, 2.5 + ring * 0.55] }}
                transition={{ duration: 1.25, delay: ring * 0.16, ease: "easeOut" }}
              />
            ))}
            {lessonCelebrationPieces.map((piece) => (
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

      <SectionHeader
        eyebrow={`${formatGradeLabel(lesson.grade, language, true)} · ${formatDifficultyLabel(lesson.difficulty, language)}`}
        title={text(lesson.title)}
        description={text(lesson.description)}
        action={
          <div className="flex flex-wrap items-center gap-3 md:justify-end">
            <Link href="/visualization-lab" className="focus-ring inline-flex rounded-full bg-slate-950 px-5 py-3 font-bold text-white transition hover:-translate-y-0.5 dark:bg-white dark:text-slate-950">{t(dictionary.nav.visualizationLab)}</Link>
            <Link
              href="/learning-path"
              className="focus-ring inline-flex rounded-full border border-cyan-300/45 bg-cyan-400/15 px-5 py-3 font-bold text-cyan-700 shadow-lg shadow-cyan-500/10 transition hover:-translate-y-0.5 hover:bg-cyan-400/25 dark:text-cyan-100"
            >
              {t(dictionary.nav.learningPath)}
            </Link>
          </div>
        }
      />

      <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
        <article className="glass-panel p-6 sm:p-8">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-violet-500/15 px-3 py-1 text-xs font-bold text-violet-600 dark:text-violet-300">{t(dictionary.lesson.difficultyLabel)}: {formatDifficultyLabel(lesson.difficulty, language)}</span>
            <span className="rounded-full bg-cyan-500/15 px-3 py-1 text-xs font-bold text-cyan-600 dark:text-cyan-300">{t(dictionary.lesson.estimatedTime)}: {lesson.estimatedMinutes} {t(dictionary.common.minutes)}</span>
            <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-300">{t(dictionary.lesson.mastery)}: {lesson.mastery}%</span>
          </div>

          {conceptBlocks.map((block) => {
            const illustration = getLessonIllustration(lesson, block);
            const visibleIllustration = illustration && !hiddenLessonIllustrationIds.has(illustration.id) ? illustration : null;

            return (
              <div key={block.id} className="mt-6">
                <MathText as="h2" text={text(block.title)} className="text-2xl font-black text-slate-950 dark:text-white" />
                {block.content ? (
                  <LessonContentWithAnswerReveal blockId={block.id} content={text(block.content)} />
                ) : null}
                {visibleIllustration ? (
                  <figure className="mt-5 overflow-hidden rounded-2xl border border-cyan-200/70 bg-white/75 shadow-lg shadow-cyan-500/10 dark:border-cyan-300/15 dark:bg-white/[0.055]">
                    <Image
                      src={visibleIllustration.src}
                      alt={text(visibleIllustration.alt)}
                      width={visibleIllustration.width}
                      height={visibleIllustration.height}
                      sizes="(min-width: 1024px) 760px, calc(100vw - 3rem)"
                      className="h-auto w-full object-cover"
                    />
                    <figcaption className="border-t border-cyan-200/60 px-4 py-3 text-sm font-semibold leading-6 text-slate-600 dark:border-cyan-300/15 dark:text-slate-300">
                      {text(visibleIllustration.caption)}
                    </figcaption>
                  </figure>
                ) : null}
              </div>
            );
          })}
        </article>

        <aside className="glass-panel p-6">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-cyan-500 dark:text-cyan-300">
            {checklistBlock ? text(checklistBlock.title) : t(dictionary.lesson.checklist)}
          </p>
          <div className="mt-5 space-y-3 text-sm font-semibold text-slate-600 dark:text-slate-300">
            {(checklistBlock?.items ?? []).map((item, index) => {
              const itemKey = `${checklistBlock.id}-${index}`;
              return (
                <label key={itemKey} className="flex cursor-pointer items-center gap-3 rounded-2xl bg-white/65 p-3 dark:bg-white/[0.055]">
                  <input
                    type="checkbox"
                    checked={Boolean(checklistState[itemKey])}
                    onChange={(event) => updateChecklist(itemKey, event.target.checked)}
                    className="h-4 w-4 accent-cyan-500"
                  />
                  <MathText text={text(item)} />
                </label>
              );
            })}
          </div>
          <button
            type="button"
            onClick={completeLesson}
            disabled={!canSaveProgress}
            className="focus-ring mt-5 w-full rounded-full bg-emerald-500 px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-55"
          >
            {t(dictionary.lesson.markComplete)}
          </button>
          {!canSaveProgress ? (
            <p className="mt-3 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">
              {settingsReady
                ? t({ en: "Log in as a student to save checklist progress.", zh: "以學生身份登入即可儲存清單進度。" })
                : t({ en: "Checking sign-in status...", zh: "正在檢查登入狀態..." })}{" "}
              {settingsReady ? <Link href="/login" className="text-cyan-600 underline underline-offset-4 dark:text-cyan-300">{t(dictionary.nav.login)}</Link> : null}
            </p>
          ) : null}
        </aside>
      </section>

      {visualizationBlock ? (
        <section id="visualization" className="mt-8 scroll-mt-28 glass-panel p-5 sm:p-6">
          <div className="mb-5">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-cyan-500 dark:text-cyan-300">{t(dictionary.lesson.visualizationPanel)}</p>
            <MathText as="h2" text={text(visualizationBlock.title)} className="mt-2 text-2xl font-black text-slate-950 dark:text-white" />
            {visualizationBlock.content ? (
              <MathText as="p" text={text(visualizationBlock.content)} className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300" />
            ) : null}
          </div>
          {VisualizationModule ? (
            <VisualizationModule topicId={visualizationTopicId} showAxisLabels={showVisualizationAxisLabels} />
          ) : (
            <div className="rounded-2xl border border-amber-300/40 bg-amber-400/10 p-4 text-sm font-semibold text-amber-800 dark:text-amber-100">
              {t({
                en: `No interactive module is registered for ${visualizationBlock.visualizationConfig?.moduleId ?? "this lesson"}.`,
                zh: "此課節暫未登記互動模組。"
              })}
            </div>
          )}
        </section>
      ) : null}

      <section className="mt-8">
        {lessonPracticeQuestions.length ? (
          <div className="space-y-4">
            {lessonPracticeQuestions.map((question, index) => (
              <div
                key={question.id}
                onFocusCapture={() => startQuestionTimer(question.id)}
                onPointerDownCapture={() => startQuestionTimer(question.id)}
                className="space-y-2 [&_svg[role=img]]:mx-auto [&_svg[role=img]]:max-w-md"
              >
                <p className="text-sm font-black uppercase tracking-[0.18em] text-cyan-500 dark:text-cyan-300">
                  {t({ en: `Question ${index + 1} of ${lessonPracticeQuestions.length}`, zh: `第 ${index + 1} 題，共 ${lessonPracticeQuestions.length} 題` })}
                </p>
                <PracticeQuestionCard question={question} onAnswered={handleLessonQuestionAnswered} />
              </div>
            ))}
            {lessonPracticeSummary?.isComplete ? (
              <div className="glass-panel border-emerald-300/45 bg-emerald-50/80 p-5 dark:bg-emerald-950/20">
                <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-200">
                  {t({ en: "Lesson practice complete", zh: "課節練習已完成" })}
                </p>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
                    {t({
                      en: `Accuracy ${lessonPracticeSummary.correctCount}/${lessonPracticeSummary.totalQuestions}. Open the summary again to review timing and next steps.`,
                      zh: `準確率 ${lessonPracticeSummary.correctCount}/${lessonPracticeSummary.totalQuestions}。可再次打開摘要重溫時間和下一步。`
                    })}
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsSummaryOpen(true)}
                    className="focus-ring inline-flex justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 dark:bg-white dark:text-slate-950"
                  >
                    {t({ en: "View summary", zh: "查看摘要" })}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="glass-panel p-6">
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{t(dictionary.lesson.noPractice)}</p>
          </div>
        )}
      </section>

      {extensionBlocks.length ? (
        <section className="mt-8 grid gap-4">
          {extensionBlocks.map((block) => (
            <article key={block.id} className="glass-panel p-6 sm:p-8">
              <MathText as="h2" text={text(block.title)} className="text-2xl font-black text-slate-950 dark:text-white" />
              {block.content ? (
                <MathText as="p" text={text(block.content)} className="mt-3 text-base leading-8 text-slate-600 dark:text-slate-300" />
              ) : null}
              {block.items?.length ? (
                <ul className="mt-4 space-y-3 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
                  {block.items.map((item, index) => (
                    <li key={`${block.id}-${index}`} className="flex gap-3">
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-cyan-400" aria-hidden="true" />
                      <MathText as="span" text={text(item)} />
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>
          ))}
        </section>
      ) : null}

      {canViewTeacherGuide && teacherGuideBlocks.length ? (
        <section className="mt-8 grid gap-4" aria-label={t({ en: "Teacher guide", zh: "教師使用建議", zhHans: "教师使用建议" })}>
          {teacherGuideBlocks.map((block) => (
            <article key={block.id} className="glass-panel border-emerald-300/40 bg-emerald-50/70 p-6 dark:bg-emerald-950/20 sm:p-8">
              <p className="text-sm font-black uppercase tracking-[0.22em] text-emerald-600 dark:text-emerald-200">
                {t({ en: "Teacher guide", zh: "教師使用建議", zhHans: "教师使用建议" })}
              </p>
              <MathText as="h2" text={text(block.title)} className="mt-2 text-2xl font-black text-slate-950 dark:text-white" />
              {block.content ? (
                <MathText as="p" text={text(block.content)} className="mt-3 text-sm font-semibold leading-7 text-slate-600 dark:text-slate-300" />
              ) : null}
              {block.items?.length ? (
                <ul className="mt-5 space-y-3 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
                  {block.items.map((item, index) => (
                    <li key={`${block.id}-${index}`} className="flex gap-3">
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-emerald-400" aria-hidden="true" />
                      <MathText as="span" text={text(item)} />
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>
          ))}
        </section>
      ) : null}

      <AnimatePresence>
        {isSummaryOpen && lessonPracticeSummary ? (
          <motion.div
            className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setIsSummaryOpen(false);
            }}
          >
            <motion.section
              role="dialog"
              aria-modal="true"
              aria-labelledby="lesson-summary-title"
              aria-describedby="lesson-summary-description"
              className="max-h-[calc(100dvh-2rem)] w-full max-w-4xl overflow-y-auto rounded-[1.75rem] border border-slate-200/80 bg-white p-5 shadow-2xl shadow-slate-950/25 dark:border-white/10 dark:bg-slate-950 sm:p-6"
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-500 dark:text-cyan-300">
                    {t({ en: "Lesson summary", zh: "課節摘要" })}
                  </p>
                  <h2 id="lesson-summary-title" className="mt-2 text-3xl font-black text-slate-950 dark:text-white">
                    {t({ en: "Practice round complete", zh: "本輪練習完成" })}
                  </h2>
                  <p id="lesson-summary-description" className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
                    {t(lessonSummaryEncouragement(lessonPracticeSummary.accuracyPercent))}
                  </p>
                </div>
                <button
                  ref={summaryCloseButtonRef}
                  type="button"
                  onClick={() => setIsSummaryOpen(false)}
                  aria-label={t({ en: "Close lesson summary", zh: "關閉課節摘要" })}
                  className="focus-ring self-start rounded-full border border-slate-200/80 bg-white px-4 py-2 text-lg font-black text-slate-600 transition hover:-translate-y-0.5 hover:text-slate-950 dark:border-white/10 dark:bg-white/[0.07] dark:text-slate-200 dark:hover:text-white"
                >
                  ×
                </button>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.055]">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{t({ en: "Accuracy", zh: "準確率" })}</p>
                  <p className={`mt-2 text-4xl font-black ${summaryToneClassName}`}>{lessonPracticeSummary.accuracyPercent}%</p>
                  <p className="mt-1 text-sm font-bold text-slate-600 dark:text-slate-300">
                    {lessonPracticeSummary.correctCount}/{lessonPracticeSummary.totalQuestions} {t({ en: "correct", zh: "題正確" })}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.055]">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{t({ en: "Total time", zh: "總用時" })}</p>
                  <p className="mt-2 text-4xl font-black gradient-text">{formatLessonDuration(lessonPracticeSummary.totalSeconds, language)}</p>
                  <p className="mt-1 text-sm font-bold text-slate-600 dark:text-slate-300">
                    {lessonPracticeSummary.answeredCount} {t({ en: "answers checked", zh: "題已檢查" })}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.055]">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{t({ en: "Average pace", zh: "平均速度" })}</p>
                  <p className="mt-2 text-4xl font-black gradient-text">{formatLessonDuration(lessonPracticeSummary.averageSeconds, language)}</p>
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
                {lessonPracticeSummary.results.map((result) => (
                  <div key={result.question.id} className="grid grid-cols-[0.8fr_1fr_1fr] border-t border-slate-200/80 px-4 py-3 text-sm font-bold text-slate-700 dark:border-white/10 dark:text-slate-200">
                    <span>{result.questionNumber}</span>
                    <span className={result.correct ? "text-emerald-600 dark:text-emerald-200" : "text-amber-600 dark:text-amber-200"}>
                      {result.correct ? t({ en: "Correct", zh: "正確" }) : t({ en: "Review", zh: "需重溫" })}
                    </span>
                    <span>{formatLessonDuration(result.durationSeconds, language)}</span>
                  </div>
                ))}
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_0.9fr]">
                <section className="rounded-2xl border border-amber-300/45 bg-amber-50/80 p-4 dark:border-amber-300/25 dark:bg-amber-950/20">
                  <h3 className="text-base font-black text-slate-950 dark:text-white">
                    {lessonPracticeSummary.wrongResults.length
                      ? t({ en: "Review focus", zh: "重溫重點" })
                      : t({ en: "No missed items", zh: "沒有錯題" })}
                  </h3>
                  {lessonPracticeSummary.wrongResults.length ? (
                    <div className="mt-3 space-y-3">
                      {lessonPracticeSummary.wrongResults.map((result) => {
                        const normalizedAnswer = result.correctAnswer ? normalizeLessonSummaryAnswer(result.correctAnswer) : "";
                        const answerDisplayText = result.correctAnswer ? formatLessonSummaryAnswerForMathText(result.correctAnswer) : "";

                        return (
                          <div key={result.question.id} className="rounded-2xl bg-white/70 p-3 text-sm font-semibold leading-6 text-slate-700 dark:bg-white/[0.06] dark:text-slate-200">
                            <p className="font-black">
                              {t({ en: `Question ${result.questionNumber}`, zh: `第 ${result.questionNumber} 題` })}
                            </p>
                            {result.correctAnswer ? (
                              <div className="mt-1 flex flex-col gap-1 sm:flex-row sm:items-baseline">
                                <span className="shrink-0 font-black">
                                  {t({ en: "Correct answer:", zh: "正確答案：" })}
                                </span>
                                <MathText
                                  as="span"
                                  text={answerDisplayText}
                                  renderBareMath={shouldRenderLessonSummaryAnswerAsBareMath(normalizedAnswer)}
                                  className="min-w-0 flex-1 whitespace-normal break-words leading-7"
                                />
                              </div>
                            ) : (
                              <p className="mt-1">{t({ en: "Open the card feedback above for the worked explanation.", zh: "可回到上方題卡查看詳細解釋。" })}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
                      {t({ en: "Everything checked in this lesson round was correct. Use Practice Arena later for spaced practice and challenge items.", zh: "本輪課節練習全部答對。稍後可到練習場做間隔重溫和挑戰題。" })}
                    </p>
                  )}
                </section>

                <section className="rounded-2xl border border-cyan-300/45 bg-cyan-50/80 p-4 dark:border-cyan-300/25 dark:bg-cyan-950/20">
                  <h3 className="text-base font-black text-slate-950 dark:text-white">{t({ en: "Next step", zh: "下一步" })}</h3>
                  <p className="mt-3 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
                    {t({
                      en: "When you are ready, visit Practice Arena later to strengthen this topic with adaptive questions. Missed items are also ready for Mistake Book review.",
                      zh: "準備好時，可以稍後到練習場用適性題目鞏固這個課題。答錯的題目亦可到錯題集重溫。"
                    })}
                  </p>
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row lg:flex-col">
                    <Link
                      href={practiceArenaHref}
                      className="focus-ring inline-flex justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 dark:bg-white dark:text-slate-950"
                    >
                      {t({ en: "Practice Arena later", zh: "稍後到練習場" })}
                    </Link>
                    <Link
                      href="/mistake-book"
                      className="focus-ring inline-flex justify-center rounded-full border border-slate-200/80 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:-translate-y-0.5 dark:border-white/10 dark:bg-white/[0.07] dark:text-white"
                    >
                      {t(dictionary.nav.mistakes)}
                    </Link>
                    <button
                      type="button"
                      onClick={() => setIsSummaryOpen(false)}
                      className="focus-ring inline-flex justify-center rounded-full border border-cyan-300/55 bg-cyan-400/15 px-5 py-3 text-sm font-black text-cyan-700 transition hover:-translate-y-0.5 dark:text-cyan-100"
                    >
                      {t({ en: "Back to lesson", zh: "返回課節" })}
                    </button>
                  </div>
                </section>
              </div>
            </motion.section>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <LessonBackToTopButton />
    </div>
  );
}
