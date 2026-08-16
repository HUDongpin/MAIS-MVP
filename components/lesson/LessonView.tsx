"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import type { ComponentType, FormEvent, ReactNode } from "react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useStudentAccommodations } from "@/components/accommodations/useStudentAccommodations";
import { useAITutor, type TutorContext, type TutorSelectionHelpType } from "@/components/ai/AITutorProvider";
import { AnimatePresence, motion, useReducedMotion } from "@/components/ui/Motion";
import { LessonBackToTopButton } from "@/components/lesson/LessonBackToTopButton";
import {
  buildLessonCompletionChecklistItems,
  lessonCompletionMasteryCardText,
  lessonCompletionProgressText,
  lessonCompletionTitleForGrade
} from "@/components/lesson/lessonCompletionChecklist";
import { type LessonGalaxyItem } from "@/components/lesson/LessonGalaxyDirectory";
import { formatLessonPartDisplay, type LessonPartDisplay } from "@/components/lesson/lessonPartDisplay";
import {
  lessonModuleProgressOwnerScopeKey,
  lessonModuleProgressRequestScopeKey,
  mergeCompletedLessonModuleOverrides,
  readLessonModulesFromRoadmapResponse,
  upsertCompletedLessonModuleOverride,
  type CompletedLessonModuleOverride
} from "@/components/lesson/lessonModuleProgress";
import {
  createLessonContentPaneScrollRequest,
  createLessonTargetViewportRealignment
} from "@/components/lesson/lessonPaneNavigation";
import {
  createLessonPracticeAutoAdvanceRequest,
  lessonPracticeAutoAdvanceRequestIsActive,
  resolveLessonPracticeAutoAdvanceIndex,
  scheduleLessonPracticeAutoAdvance,
  type LessonPracticeAutoAdvanceState
} from "@/components/lesson/lessonPracticeAutoAdvance";
import { getCcssLessonComponent } from "@/components/lesson/ccss/registry";
import { LessonMenuRail, LessonMenuRevealPill } from "@/components/lesson/worlds/LessonMenuRail";
import {
  lessonMenuColumnDurationMs,
  lessonMenuPanelId,
  useLessonMenuVisibility
} from "@/components/lesson/worlds/lessonMenuVisibility";
import { WorldMenu } from "@/components/lesson/worlds/WorldMenu";
import { lessonWorldThemeForCourse } from "@/components/lesson/worlds/worldThemes";
import { lessonUsesStaticAudioOnly, staticLessonAudioUrlForBlock } from "@/components/lesson/staticLessonAudio";
import { WorkedExampleIllustration } from "@/components/lesson/WorkedExampleIllustration";
import {
  buildLessonAudioChunks,
  estimateLessonAudioChunksDurationSeconds,
  lessonAudioChunkOffsetSeconds,
  type LessonAudioChunk
} from "@/components/lesson/lessonAudioQueue";
import {
  cleanLessonConceptContent,
  cleanLessonDisplayTitle,
  cleanLessonVisualizationContent,
  splitLessonContentForAnswerReveal,
  splitLessonVisualizationTitle
} from "@/components/lesson/lessonContentText";
import { MathText } from "@/components/math/MathText";
import { normalizeMathTextForDisplay } from "@/components/math/mathTextFormatting";
import {
  PracticeMissionTrail,
  PracticeStarReward,
  ReadAloudIcon,
  SoundOffIcon,
  SoundOnIcon
} from "@/components/practice/PracticeQuestPager";
import { useReadAloud } from "@/components/practice/useReadAloud";
import { dictionary, useSettings } from "@/components/providers/AppProviders";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { getMainlandHjbHighLessonIllustration } from "@/data/mainlandHjbHighLessonIllustrations";
import { getMainlandHjbJuniorLessonIllustration } from "@/data/mainlandHjbJuniorLessonIllustrations";
import { getMainlandHjbPrimaryLessonIllustration } from "@/data/mainlandHjbPrimaryLessonIllustrations";
import { getMainlandPepHighLessonIllustration } from "@/data/mainlandPepHighLessonIllustrations";
import { getMainlandPepJuniorLessonIllustration } from "@/data/mainlandPepJuniorLessonIllustrations";
import { getMainlandPepPrimaryLessonIllustration } from "@/data/mainlandPepPrimaryLessonIllustrations";
import { getUsArkansasMiddleSchoolLessonIllustration } from "@/data/usArkansasMiddleSchoolLessonIllustrations";
import { getCcssTextbookLesson } from "@/data/ccssTextbookRegistry";
import { getUsCaliforniaLessonIllustration } from "@/data/usCaliforniaLessonIllustrations";
import { classifyPracticeIslandTopic } from "@/data/practiceIslandRegions";
import type { FeaturedLabDefinition, VisualizationModuleId } from "@/data/visualizationLabs";
import { lessonHrefForSlug } from "@/lib/lessonLinks";
import {
  awardPracticeIslandStars,
  practiceIslandStarStorageKey,
  practiceIslandStarsForAccuracy,
  readPracticeIslandStarRecord
} from "@/lib/practiceIslandProgress";
import { dedupePracticeQuestions } from "@/lib/practiceQuestionDeduping";
import {
  playPracticeSound,
  practiceSoundStorageKey,
  readPracticeSoundEnabled
} from "@/lib/practiceSound";
import { studentRoadmapPath } from "@/lib/roadmapRoutes";
import { cn } from "@/lib/utils";
import { isYoungLearnerPracticeRound } from "@/lib/youngLearnerPractice";
import type { AttemptFeedback, Language, LessonBlock, LessonDetail, LessonSummary, LocalizedText, PublicQuestion } from "@/types";

type LessonResponse = {
  lesson?: LessonDetail;
};

type LessonProgressResponse = {
  lesson?: LessonSummary;
};

type LessonViewProps = {
  gradeLessons?: LessonSummary[];
  slug: string;
  initialLesson: LessonDetail | null;
  // Resolved on the server for the lesson's visualization block so the client never
  // has to import the visualization-labs/topics/question-bank graph.
  visualizationLab?: FeaturedLabDefinition | null;
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
  // Server-resolved lab definition. When provided, ConfiguredVisualizationLab uses it
  // directly instead of dynamically importing @/data/visualizationLabs on the client —
  // which would drag the whole topics + multi-region question-bank graph (tens of MB)
  // into the lesson bundle. Other lesson visualizations ignore this prop.
  lab?: FeaturedLabDefinition | null;
};

type LessonSelectionContext = {
  blockId?: string;
  blockTitle?: string;
  blockType?: string;
  lessonSlug: string;
  questionId?: string;
  selectedText: string;
  surroundingText?: string;
  topicId: string;
};

type LessonSelectionPopoverState = LessonSelectionContext & {
  left: number;
  placement: "above" | "below";
  top: number;
};

type LessonGalaxyPlanetEntryDecision = {
  pathname: string;
  shouldClearSearch: boolean;
  shouldEnterLessonContent: boolean;
};

type LessonIllustrationSlot = "concept" | "worked-example";
type LessonIllustration = {
  id: string;
  topicId: string;
  slot: LessonIllustrationSlot;
  src: string;
  width: number;
  height: number;
  preserveRasterFidelity?: boolean;
  alt: LocalizedText;
  caption: LocalizedText;
  ragCardIds: string[];
};

const celebrationColors = ["#06b6d4", "#8b5cf6", "#22c55e", "#f59e0b", "#ec4899", "#38bdf8"];
const lessonGalaxyCollapseDurationMs = 520;
const lessonPracticeQuestionLimit = 5;
const handwritingCapableQuestionTypes = new Set<PublicQuestion["type"]>(["fill-in", "short-answer", "graph"]);
const lessonGalaxySectionId = "lesson-galaxy-directory";
const lessonOverviewSectionId = "lesson-overview";
const lessonPracticeSectionId = "lesson-practice";
const lessonDesktopMinWidthQuery = "(min-width: 1024px)";
const lessonDesktopPaneLayoutClassName = "lg:h-[calc(100dvh-8rem)] lg:min-h-0 lg:overflow-hidden";
const lessonDesktopScrollablePaneClassName = "lg:h-full lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain";
const lessonContentPaneTopPaddingPx = 24;
const mobileLessonTargetSafeTopPx = 96;
const mobileLessonTargetStabilizationMaxMs = 8000;
const lessonSelectionMaxLength = 500;
const lessonSelectionSurroundingMaxLength = 900;
const lessonSelectionPopoverWidth = 320;
const lessonGalaxyEnteredPlanetStoragePrefix = "mais-lesson-galaxy-entered-planet-v1:";
const lessonGalaxyEnterPlanetSearchParam = "fromGalaxy";
const lessonGalaxyEnterPlanetSearchValue = "planet";
const novaLensLabel: LocalizedText = { en: "AI Tutor", zh: "AI Tutor", zhHans: "AI Tutor" };
const askNovaBySelectingLabel: LocalizedText = { en: "Ask AI Tutor by Selecting", zh: "劃詞問 AI Tutor", zhHans: "划词问 AI Tutor" };
const singularWorkedExampleTitle: LocalizedText = { en: "Worked example", zh: "例題", zhHans: "例题" };
const thinkAndCheckAnswerLabel: LocalizedText = {
  en: "Think and Check the Answer",
  zh: "先思考，再查看答案",
  zhHans: "先思考，再查看答案"
};
const hiddenLessonIllustrationIds = new Set([
  "pep-high-s4-function-properties-worked-example",
  "pep-high-s4-sets-logic-worked-example"
]);
const lessonAudioRates = [0.85, 1, 1.25] as const;
const defaultLessonAudioRate: (typeof lessonAudioRates)[number] = 0.85;
const lessonAudioQuickFallbackDelayMs = 2200;
const lessonBodyTextClassName = "text-xl font-bold leading-9 text-slate-700 dark:text-slate-200 sm:text-2xl sm:leading-10 [&_.katex]:font-bold";
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

function compactSelectedLessonText(value: string, maxLength = lessonSelectionMaxLength) {
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function clampLessonSelectionCoordinate(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function elementFromSelectionNode(node: Node | null) {
  if (!node) return null;
  return node.nodeType === Node.ELEMENT_NODE
    ? (node as Element)
    : node.parentElement;
}

function isSelectionInsideInteractiveElement(node: Node | null) {
  const element = elementFromSelectionNode(node);
  return Boolean(element?.closest("button, input, textarea, select, option, [contenteditable='true'], [role='button']"));
}

function selectableLessonElementFor(node: Node | null, root: HTMLElement) {
  const element = elementFromSelectionNode(node);
  const selectable = element?.closest<HTMLElement>("[data-ai-selectable]");
  return selectable && root.contains(selectable) ? selectable : null;
}

function readLessonSelectionContext(selectable: HTMLElement, selectedText: string): LessonSelectionContext {
  const surroundingText = compactSelectedLessonText(selectable.textContent ?? "", lessonSelectionSurroundingMaxLength);

  return {
    blockId: selectable.dataset.aiBlockId,
    blockTitle: selectable.dataset.aiTitle,
    blockType: selectable.dataset.aiBlockType,
    lessonSlug: selectable.dataset.aiLessonSlug ?? "",
    questionId: selectable.dataset.aiQuestionId,
    selectedText,
    surroundingText,
    topicId: selectable.dataset.aiTopicId ?? ""
  };
}

function lessonPathnameFromHref(href: string) {
  if (typeof window === "undefined") return href.split(/[?#]/)[0] || href;

  try {
    return new URL(href, window.location.origin).pathname;
  } catch {
    return href.split(/[?#]/)[0] || href;
  }
}

function lessonGalaxyEnteredPlanetStorageKey(href: string) {
  return `${lessonGalaxyEnteredPlanetStoragePrefix}${lessonPathnameFromHref(href)}`;
}

function rememberLessonGalaxyPlanetEntry(href: string) {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(lessonGalaxyEnteredPlanetStorageKey(href), "true");
  } catch {
    // Session storage is best-effort; same-route clicks still collapse immediately.
  }
}

function consumeLessonGalaxyPlanetEntry(href: string) {
  if (typeof window === "undefined") return false;

  try {
    const storageKey = lessonGalaxyEnteredPlanetStorageKey(href);
    const shouldEnterPlanet = window.sessionStorage.getItem(storageKey) === "true";
    if (shouldEnterPlanet) {
      window.sessionStorage.removeItem(storageKey);
    }
    return shouldEnterPlanet;
  } catch {
    return false;
  }
}

function shouldEnterLessonPlanetFromLocation() {
  if (typeof window === "undefined") return false;

  return new URLSearchParams(window.location.search).get(lessonGalaxyEnterPlanetSearchParam) === lessonGalaxyEnterPlanetSearchValue;
}

function clearLessonGalaxyEnterPlanetSearch(href: string) {
  if (typeof window === "undefined") return;

  window.history.replaceState(window.history.state, "", href);
}

function lessonGalaxyPlanetEntryDecision(
  href: string,
  cachedDecision: LessonGalaxyPlanetEntryDecision | null
): LessonGalaxyPlanetEntryDecision {
  const pathname = lessonPathnameFromHref(href);

  if (cachedDecision?.pathname === pathname) {
    return cachedDecision;
  }

  const shouldEnterPlanetFromUrl = shouldEnterLessonPlanetFromLocation();
  const shouldEnterPlanetFromStorage = consumeLessonGalaxyPlanetEntry(href);

  return {
    pathname,
    shouldClearSearch: shouldEnterPlanetFromUrl,
    shouldEnterLessonContent: shouldEnterPlanetFromUrl || shouldEnterPlanetFromStorage
  };
}

function formatLessonMathText(value: string) {
  return normalizeMathTextForDisplay(value);
}

function formatLocalizedLessonMathText(value: LocalizedText) {
  const en = formatLessonMathText(value.en);
  const zh = formatLessonMathText(value.zh);
  const zhHans = value.zhHans ? formatLessonMathText(value.zhHans) : undefined;

  if (en === value.en && zh === value.zh && zhHans === value.zhHans) return value;
  return zhHans ? { en, zh, zhHans } : { en, zh };
}

function formatLessonPracticeQuestionTopicText(value: LocalizedText) {
  const formatted = formatLocalizedLessonMathText(value);
  const en = cleanLessonDisplayTitle(formatted.en);
  const zh = cleanLessonDisplayTitle(formatted.zh);
  const zhHans = formatted.zhHans ? cleanLessonDisplayTitle(formatted.zhHans) : undefined;

  if (en === value.en && zh === value.zh && zhHans === value.zhHans) return value;
  return zhHans ? { en, zh, zhHans } : { en, zh };
}

function countWorkedExampleMarkers(value: string) {
  const englishMatches = value.match(/(?:^|\n)\s*Example(?:\s*\d+)?\s*:/gi)?.length ?? 0;
  const chineseMatches = value.match(/(?:^|\n)\s*(?:例題|例题|例)\s*\d*\s*[：:]/g)?.length ?? 0;

  return Math.max(englishMatches, chineseMatches);
}

function shouldUseSingularWorkedExampleTitle(block: LessonBlock) {
  if (block.type !== "worked-example" || !block.content) return false;

  const markerCount = Math.max(
    countWorkedExampleMarkers(block.content.en),
    countWorkedExampleMarkers(block.content.zh),
    block.content.zhHans ? countWorkedExampleMarkers(block.content.zhHans) : 0
  );

  return markerCount === 1;
}

function formatLessonPracticeQuestionMathText(question: PublicQuestion) {
  const topic = formatLessonPracticeQuestionTopicText(question.topic);
  const prompt = formatLocalizedLessonMathText(question.prompt);
  const options = question.options?.map(formatLocalizedLessonMathText);
  const topicChanged = topic !== question.topic;
  const promptChanged = prompt !== question.prompt;
  const optionsChanged = Boolean(options?.some((option, index) => option !== question.options?.[index]));

  if (!topicChanged && !promptChanged && !optionsChanged) return question;

  return {
    ...question,
    topic,
    prompt,
    options: options ?? question.options
  };
}

function DeferredLessonPanel() {
  return (
    <div
      aria-hidden="true"
      className="min-h-40 animate-pulse rounded-2xl border border-slate-200/70 bg-white/60 shadow-sm shadow-slate-950/5 dark:border-white/10 dark:bg-white/[0.055]"
    />
  );
}

// Defers mounting an expensive, below-the-fold panel (e.g. the interactive
// visualization, whose chunk carries the 3D/manim runtime) until the student
// scrolls it near the viewport. Keeping it off the initial render path stops
// the heavy chunk from downloading/parsing on every lesson load — the lesson
// content becomes interactive immediately and the panel loads just before the
// student reaches it. `rootMargin` gives a head-start so the panel is usually
// ready by the time it is scrolled into view.
function useMountWhenNear(rootMargin = "600px") {
  const ref = useRef<HTMLElement | null>(null);
  const [shouldMount, setShouldMount] = useState(false);

  useEffect(() => {
    if (shouldMount) return;
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      setShouldMount(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldMount(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [shouldMount, rootMargin]);

  return { ref, shouldMount };
}

function NovaLensButtonIcon({ compact = false }: { compact?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`relative isolate grid shrink-0 place-items-center rounded-full border border-cyan-100/80 bg-slate-950 shadow-[0_0_18px_rgba(34,211,238,0.35)] ${
        compact ? "h-5 w-5" : "h-7 w-7"
      }`}
    >
      <span className="absolute inset-0 -z-10 rounded-full bg-[conic-gradient(from_140deg,rgba(34,211,238,0.95),rgba(99,102,241,0.65),rgba(232,121,249,0.85),rgba(34,211,238,0.95))] opacity-95" />
      <span className="absolute inset-[3px] rounded-full bg-[radial-gradient(circle_at_30%_26%,rgba(255,255,255,0.95),transparent_18%),linear-gradient(145deg,rgba(8,47,73,0.98),rgba(30,27,75,0.96),rgba(83,19,97,0.9))]" />
      <span className="absolute bottom-[18%] right-[18%] h-[18%] w-[18%] rounded-full bg-cyan-100/90 shadow-[0_0_10px_rgba(165,243,252,0.95)]" />
      <span className="absolute left-[20%] top-[22%] h-[18%] w-[18%] rounded-full bg-white/75" />
    </span>
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

function lessonBlockSectionId(blockId: string) {
  return `lesson-section-${blockId}`.replace(/[^A-Za-z0-9_-]/g, "-");
}

function compactLessonGalaxyDescription(value: string, fallback: string) {
  const compacted = value
    .replace(/\\\(|\\\)|\\\[|\\\]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!compacted) return fallback;
  return compacted.length > 170 ? `${compacted.slice(0, 167).trim()}...` : compacted;
}

function limitLessonPracticeQuestions(lesson: LessonDetail | null) {
  if (!lesson || lesson.practiceQuestions.length <= lessonPracticeQuestionLimit) return lesson;

  const dedupedQuestions = dedupePracticeQuestions(lesson.practiceQuestions);
  const selectedQuestions = dedupedQuestions.slice(0, lessonPracticeQuestionLimit);
  const handwritingQuestion = dedupedQuestions.find((question) => handwritingCapableQuestionTypes.has(question.type));
  const practiceQuestions = selectedQuestions.some((question) => handwritingCapableQuestionTypes.has(question.type))
    ? selectedQuestions
    : handwritingQuestion
      ? [
        ...selectedQuestions.slice(0, Math.max(0, lessonPracticeQuestionLimit - 1)),
        handwritingQuestion
      ]
      : selectedQuestions;
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
  "configured-visualization-lab": ConfiguredVisualizationLab,
  // Scope boundary (Phase 0): signature benches render on the Visualization Lab
  // page only. In-lesson embeds keep the template renderer, so a signature topic
  // shows its bench in the lab and the template inside the lesson. Deliberate —
  // wiring the lesson embed is Phase 1 and needs its own regression evidence.
  "signature-lab": ConfiguredVisualizationLab
};

function getLessonVisualization(moduleId: string | undefined) {
  if (!moduleId) return null;
  return moduleId in lessonVisualizationRegistry
    ? lessonVisualizationRegistry[moduleId as VisualizationModuleId]
    : null;
}

function lessonQuestionPagerTargetIsEditable(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  return target.isContentEditable || tagName === "input" || tagName === "textarea" || tagName === "select";
}

function clampLessonQuestionIndex(index: number, questionCount: number) {
  if (questionCount <= 0) return 0;
  return Math.min(questionCount - 1, Math.max(0, index));
}

type LessonQuestionPagerProps = {
  allAnswersChecked: boolean;
  answerResults: Record<string, boolean>;
  displayTitle?: string;
  lesson: LessonDetail;
  onAnswered: (question: PublicQuestion, feedback: AttemptFeedback) => void;
  onCheckAllAnswers: () => void;
  onQuestionStarted: (questionId: string) => void;
  questions: PublicQuestion[];
};

function LessonQuestionPager({
  allAnswersChecked,
  answerResults,
  displayTitle,
  lesson,
  onAnswered,
  onCheckAllAnswers,
  onQuestionStarted,
  questions
}: LessonQuestionPagerProps) {
  const { currentUser, language, t, text } = useSettings();
  const prefersReducedMotion = useReducedMotion();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [jumpValue, setJumpValue] = useState("1");
  const [soundEnabled, setSoundEnabled] = useState(false);
  const { accommodations } = useStudentAccommodations();
  const readAloud = useReadAloud(language);
  const questionSignature = useMemo(() => questions.map((question) => question.id).join("|"), [questions]);
  const questionCount = questions.length;
  const currentQuestionId = questions[currentIndex]?.id ?? null;
  const autoAdvanceTimerRef = useRef<ReturnType<typeof scheduleLessonPracticeAutoAdvance> | null>(null);
  const autoAdvanceStateRef = useRef<LessonPracticeAutoAdvanceState | null>(null);
  const currentQuestionNumber = questionCount ? currentIndex + 1 : 0;

  const clearAutoAdvance = useCallback(() => {
    if (autoAdvanceTimerRef.current === null) return;
    globalThis.clearTimeout(autoAdvanceTimerRef.current);
    autoAdvanceTimerRef.current = null;
  }, []);

  useLayoutEffect(() => {
    const committedAutoAdvanceState: LessonPracticeAutoAdvanceState = {
      currentIndex,
      currentQuestionId,
      isActive: true,
      lessonSlug: lesson.slug,
      questionCount,
      questionSignature
    };
    autoAdvanceStateRef.current = committedAutoAdvanceState;
    return () => {
      if (autoAdvanceStateRef.current !== committedAutoAdvanceState) return;
      autoAdvanceStateRef.current = { ...committedAutoAdvanceState, isActive: false };
      clearAutoAdvance();
    };
  }, [clearAutoAdvance, currentIndex, currentQuestionId, lesson.slug, questionCount, questionSignature]);

  const goToIndex = useCallback((index: number) => {
    if (!questionCount) return;
    clearAutoAdvance();
    setCurrentIndex(clampLessonQuestionIndex(index, questionCount));
  }, [clearAutoAdvance, questionCount]);

  const goToPrevious = useCallback(() => {
    goToIndex(currentIndex - 1);
  }, [currentIndex, goToIndex]);

  const goToNext = useCallback(() => {
    goToIndex(currentIndex + 1);
  }, [currentIndex, goToIndex]);

  useEffect(() => {
    clearAutoAdvance();
    setCurrentIndex(0);
    setJumpValue(questionCount ? "1" : "");
  }, [clearAutoAdvance, questionCount, questionSignature]);

  useEffect(() => {
    setJumpValue(questionCount ? String(currentIndex + 1) : "");
  }, [currentIndex, questionCount]);

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

  // Stop any read-aloud playback when the learner moves to a different question.
  const stopReadAloud = readAloud.stop;
  useEffect(() => {
    stopReadAloud();
  }, [currentIndex, questionSignature, stopReadAloud]);

  useEffect(() => {
    if (questionCount < 2) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (lessonQuestionPagerTargetIsEditable(event.target)) return;

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

  const handleAnswered = useCallback((question: PublicQuestion, feedback: AttemptFeedback) => {
    const answeredIndex = questions.findIndex((item) => item.id === question.id);
    const isRoundNowComplete = questions.every((item) => item.id === question.id || answerResults[item.id] !== undefined);

    onAnswered(question, feedback);
    if (soundEnabled) {
      playPracticeSound(isRoundNowComplete ? "complete" : feedback.correct ? "correct" : "wrong");
    }
    const autoAdvanceRequest = createLessonPracticeAutoAdvanceRequest({
      answeredIndex,
      answeredQuestionId: question.id,
      currentIndex,
      lessonSlug: lesson.slug,
      questionCount,
      questionSignature
    });
    const committedAutoAdvanceState = autoAdvanceStateRef.current;
    if (!autoAdvanceRequest || !committedAutoAdvanceState
      || !lessonPracticeAutoAdvanceRequestIsActive(autoAdvanceRequest, committedAutoAdvanceState)) {
      return;
    }

    clearAutoAdvance();
    autoAdvanceTimerRef.current = scheduleLessonPracticeAutoAdvance(() => {
      autoAdvanceTimerRef.current = null;
      const latestAutoAdvanceState = autoAdvanceStateRef.current;
      if (!latestAutoAdvanceState
        || !lessonPracticeAutoAdvanceRequestIsActive(autoAdvanceRequest, latestAutoAdvanceState)) return;
      setCurrentIndex((latestIndex) => resolveLessonPracticeAutoAdvanceIndex(autoAdvanceRequest, {
        ...latestAutoAdvanceState,
        currentIndex: latestIndex,
        currentQuestionId: questions[latestIndex]?.id ?? null
      }));
    });
  }, [answerResults, clearAutoAdvance, currentIndex, lesson.slug, onAnswered, questionCount, questionSignature, questions, soundEnabled]);

  const isYoungLearnerRound = isYoungLearnerPracticeRound(questions);
  // Pager header shows the round's live star haul on the right of the heading.
  const correctCount = questions.reduce((sum, question) => sum + (answerResults[question.id] === true ? 1 : 0), 0);
  const answeredCount = questions.reduce((sum, question) => sum + (answerResults[question.id] !== undefined ? 1 : 0), 0);

  if (!questionCount) return null;

  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5 rounded-[28px] border border-white/80 bg-white/95 p-4 shadow-[0_22px_46px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-slate-950/75 sm:p-5">
      <div className="min-w-0 flex flex-col gap-4 rounded-3xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-cyan-50/70 p-4 shadow-sm dark:border-cyan-300/15 dark:from-cyan-950/35 dark:via-slate-950/55 dark:to-slate-950/40 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-950 dark:text-white">
              {displayTitle ?? t({ en: "Lesson practice", zh: "課節練習", zhHans: "课时练习" })}
            </h2>
            <p aria-live="polite" className="mt-1 text-sm font-black uppercase tracking-[0.18em] text-blue-600 dark:text-cyan-200">
              {t({
                en: `Question ${currentQuestionNumber} of ${questionCount}`,
                zh: `第 ${currentQuestionNumber} 題，共 ${questionCount} 題`,
                zhHans: `第 ${currentQuestionNumber} 题，共 ${questionCount} 题`
              })}
            </p>
          </div>
          <PracticeStarReward
            correctCount={correctCount}
            answeredCount={answeredCount}
            total={questionCount}
            t={t}
            prefersReducedMotion={prefersReducedMotion}
            themed
          />
        </div>

        <PracticeMissionTrail
          answerResults={answerResults}
          currentIndex={currentIndex}
          onSelect={goToIndex}
          prefersReducedMotion={prefersReducedMotion}
          questionIds={questions.map((question) => question.id)}
          t={t}
          testId="lesson-mission-trail"
          themed
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              aria-label={t({ en: "Previous question", zh: "上一題", zhHans: "上一题" })}
              onClick={goToPrevious}
              disabled={currentIndex === 0}
              className="focus-ring min-h-11 rounded-full border border-blue-200 bg-white px-5 py-2 text-sm font-black text-blue-700 shadow-sm transition enabled:hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45 dark:border-cyan-300/25 dark:bg-white/[0.08] dark:text-cyan-100"
            >
              {t({ en: "< Previous", zh: "< 上一題", zhHans: "< 上一题" })}
            </button>
            <button
              type="button"
              aria-label={t({ en: "Next question", zh: "下一題", zhHans: "下一题" })}
              onClick={goToNext}
              disabled={currentIndex >= questionCount - 1}
              className="focus-ring min-h-11 rounded-full bg-blue-600 px-6 py-2 text-sm font-black text-white shadow-[0_6px_0_#1d4ed8] transition enabled:hover:-translate-y-0.5 enabled:active:translate-y-0.5 enabled:active:shadow-[0_2px_0_#1d4ed8] disabled:cursor-not-allowed disabled:opacity-45 dark:bg-cyan-300 dark:text-slate-950 dark:shadow-[0_6px_0_rgba(8,145,178,0.55)]"
            >
              {t({ en: "Next >", zh: "下一題 >", zhHans: "下一题 >" })}
            </button>
            <button
              type="button"
              onClick={handleSoundToggle}
              aria-pressed={soundEnabled}
              aria-label={soundEnabled
                ? t({ en: "Turn sound off", zh: "關閉音效", zhHans: "关闭音效" })
                : t({ en: "Turn sound on", zh: "開啟音效", zhHans: "开启音效" })}
              className="focus-ring grid min-h-11 min-w-11 place-items-center rounded-full border border-blue-200 bg-white px-3 text-blue-700 shadow-sm transition hover:-translate-y-0.5 dark:border-cyan-300/25 dark:bg-white/[0.08] dark:text-cyan-100"
            >
              {soundEnabled ? <SoundOnIcon /> : <SoundOffIcon />}
            </button>
            {accommodations.readAloud && readAloud.supported ? (
              <button
                type="button"
                onClick={() => {
                  if (readAloud.speaking) {
                    readAloud.stop();
                    return;
                  }
                  const question = questions[currentIndex];
                  if (!question) return;
                  const parts = [t(question.prompt), ...(question.options ?? []).map((option) => t(option))];
                  readAloud.speak(parts.join(". "));
                }}
                aria-pressed={readAloud.speaking}
                aria-label={readAloud.speaking
                  ? t({ en: "Stop reading", zh: "停止朗讀", zhHans: "停止朗读" })
                  : t({ en: "Read question aloud", zh: "朗讀題目", zhHans: "朗读题目" })}
                className={cn(
                  "focus-ring flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-black shadow-sm transition hover:-translate-y-0.5",
                  readAloud.speaking
                    ? "border-violet-500 bg-violet-600 text-white"
                    : "border-violet-200 bg-white text-violet-700 dark:border-violet-300/30 dark:bg-white/[0.08] dark:text-violet-200"
                )}
              >
                <ReadAloudIcon />
                {readAloud.speaking
                  ? t({ en: "Stop", zh: "停止", zhHans: "停止" })
                  : t({ en: "Read aloud", zh: "朗讀", zhHans: "朗读" })}
              </button>
            ) : null}
          </div>

          <div className="grid gap-3 sm:w-64">
            {isYoungLearnerRound ? null : (
              <form onSubmit={handleJump} noValidate className="grid gap-2">
                <label htmlFor="lesson-question-jump" className="text-xs font-black uppercase tracking-[0.18em] text-blue-950 dark:text-cyan-100">
                  {t({ en: "Jump to", zh: "跳到題號", zhHans: "跳到题号" })}
                </label>
                <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                  <input
                    id="lesson-question-jump"
                    type="number"
                    min={1}
                    max={questionCount}
                    value={jumpValue}
                    onChange={(event) => setJumpValue(event.target.value)}
                    className="focus-ring min-h-14 w-full rounded-full border border-blue-100 bg-white px-5 py-3 text-lg font-black text-blue-950 shadow-sm [appearance:textfield] placeholder:text-slate-400 focus:outline-none dark:border-cyan-300/20 dark:bg-slate-950/75 dark:text-white [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  <button
                    type="submit"
                    className="focus-ring rounded-full bg-blue-950 px-5 py-3 text-sm font-black text-white shadow-[0_6px_0_#1e3a8a] transition hover:-translate-y-0.5 dark:bg-white dark:text-slate-950 dark:shadow-none dark:hover:bg-slate-100"
                  >
                    {t({ en: "Jump", zh: "跳轉", zhHans: "跳转" })}
                  </button>
                </div>
              </form>
            )}
            <button
              type="button"
              onClick={onCheckAllAnswers}
              disabled={allAnswersChecked}
              className="focus-ring inline-flex min-h-12 justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/10 transition enabled:hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-55 dark:bg-white dark:text-slate-950"
            >
              {allAnswersChecked
                ? t({ en: "All answers checked", zh: "全部答案已檢查", zhHans: "全部答案已检查" })
                : t({ en: "Check all answers", zh: "檢查全部答案", zhHans: "检查全部答案" })}
            </button>
          </div>
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5">
        {questions.map((question, index) => (
          <div
            key={question.id}
            hidden={index !== currentIndex}
            aria-hidden={index !== currentIndex}
            onFocusCapture={() => onQuestionStarted(question.id)}
            onPointerDownCapture={() => onQuestionStarted(question.id)}
            data-ai-selectable="practice-question"
            data-ai-lesson-slug={lesson.slug}
            data-ai-topic-id={question.topicId ?? lesson.topicId}
            data-ai-question-id={question.id}
            data-ai-block-id={lessonPracticeSectionId}
            data-ai-block-type="practice-question"
            data-ai-title={text(question.topic)}
            className="min-w-0 rounded-3xl border border-sky-100 bg-white/95 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.055] sm:p-5 [&_svg[role=img]]:mx-auto [&_svg[role=img]]:max-w-md"
          >
            <PracticeQuestionCard question={question} onAnswered={handleAnswered} />
          </div>
        ))}
      </div>
    </div>
  );
}

function lessonContentPanelId(blockId: string, segmentId: string) {
  return `${blockId}-${segmentId}-answer`.replace(/[^A-Za-z0-9_-]/g, "-");
}

function LessonContentWithAnswerReveal({
  blockId,
  content,
  revealStandaloneAnswerLines = true
}: {
  blockId: string;
  content: string;
  revealStandaloneAnswerLines?: boolean;
}) {
  const { t } = useSettings();
  const prefersReducedMotion = useReducedMotion();
  const [revealedAnswers, setRevealedAnswers] = useState<Record<string, boolean>>({});
  const segments = useMemo(
    () => splitLessonContentForAnswerReveal(content, { revealStandaloneAnswerLines }),
    [content, revealStandaloneAnswerLines]
  );
  const hasRevealableAnswers = segments.some((segment) => segment.kind === "answer");

  useEffect(() => {
    setRevealedAnswers({});
  }, [blockId, content]);

  if (!hasRevealableAnswers) {
    return <MathText as="p" text={formatLessonMathText(content)} className={`mt-4 ${lessonBodyTextClassName}`} />;
  }

  return (
    <div className="mt-3 space-y-3">
      {segments.map((segment) => {
        if (segment.kind === "text") {
          return (
            <MathText
              key={segment.id}
              as="p"
              text={formatLessonMathText(segment.text)}
              className={lessonBodyTextClassName}
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
                text={formatLessonMathText(segment.promptText)}
                className="min-w-0 flex-1 text-xl font-bold leading-9 text-slate-800 dark:text-slate-100 sm:text-2xl sm:leading-10 [&_.katex]:font-bold"
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
                  : t(thinkAndCheckAnswerLabel)}
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
                    text={formatLessonMathText(segment.answerText)}
                    className="whitespace-pre-line text-xl font-bold leading-9 text-emerald-900 dark:text-emerald-100 sm:text-2xl sm:leading-10 [&_.katex]:font-bold"
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

type LessonAudioPlaybackState = "idle" | "loading" | "ready" | "playing" | "paused" | "ended" | "error" | "auth-required";

function LessonAudioPauseIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
      <path d="M6 4.5c0-.55.45-1 1-1h1.25c.55 0 1 .45 1 1v11c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1v-11Zm4.75 0c0-.55.45-1 1-1H13c.55 0 1 .45 1 1v11c0 .55-.45 1-1 1h-1.25c-.55 0-1-.45-1-1v-11Z" />
    </svg>
  );
}

function LessonAudioLoadingIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5 animate-spin motion-reduce:animate-none" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-90" d="M4 12a8 8 0 0 1 8-8" stroke="currentColor" strokeLinecap="round" strokeWidth="4" />
    </svg>
  );
}

function formatLessonAudioTime(totalSeconds: number) {
  const boundedSeconds = Number.isFinite(totalSeconds) ? Math.max(0, Math.round(totalSeconds)) : 0;
  const minutes = Math.floor(boundedSeconds / 60);
  const seconds = String(boundedSeconds % 60).padStart(2, "0");

  return `${minutes}:${seconds}`;
}

function formatLessonAudioRate(rate: number) {
  return `${rate}x`;
}

function lessonAudioLanguageCode(language: Language) {
  if (language === "zh-Hans") return "zh-Hans";
  if (language === "zh") return "zh";
  return "en";
}

function lessonSpeechFallbackLanguageCode(language: Language) {
  if (language === "zh-Hans") return "zh-CN";
  if (language === "zh") return "zh-HK";
  return "en-US";
}

function canUseLessonSpeechFallback() {
  return typeof window !== "undefined"
    && "speechSynthesis" in window
    && typeof SpeechSynthesisUtterance !== "undefined";
}

function prepareLessonAudioText(value: string) {
  return value
    .replace(/\$\$?/g, " ")
    .replace(/\\\((.*?)\\\)/g, "$1")
    .replace(/\\\[(.*?)\\\]/g, "$1")
    .replace(/\\([A-Za-z]+)/g, "$1")
    .replace(/[{}_[\]^]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function canUseStreamingLessonAudio() {
  if (typeof window === "undefined" || typeof window.MediaSource === "undefined") return false;
  return window.MediaSource.isTypeSupported("audio/mpeg");
}

function waitForLessonAudioMediaSourceOpen(mediaSource: MediaSource) {
  if (mediaSource.readyState === "open") return Promise.resolve();

  return new Promise<void>((resolve, reject) => {
    function cleanup() {
      mediaSource.removeEventListener("sourceopen", handleOpen);
      mediaSource.removeEventListener("sourceended", handleEnded);
    }

    function handleOpen() {
      cleanup();
      resolve();
    }

    function handleEnded() {
      cleanup();
      reject(new Error("lesson-audio-media-source-ended"));
    }

    mediaSource.addEventListener("sourceopen", handleOpen, { once: true });
    mediaSource.addEventListener("sourceended", handleEnded, { once: true });
  });
}

function waitForLessonAudioSourceBufferIdle(sourceBuffer: SourceBuffer) {
  if (!sourceBuffer.updating) return Promise.resolve();

  return new Promise<void>((resolve, reject) => {
    function cleanup() {
      sourceBuffer.removeEventListener("updateend", handleUpdateEnd);
      sourceBuffer.removeEventListener("error", handleError);
    }

    function handleUpdateEnd() {
      cleanup();
      resolve();
    }

    function handleError() {
      cleanup();
      reject(new Error("lesson-audio-source-buffer-error"));
    }

    sourceBuffer.addEventListener("updateend", handleUpdateEnd, { once: true });
    sourceBuffer.addEventListener("error", handleError, { once: true });
  });
}

async function appendLessonAudioSourceBuffer(sourceBuffer: SourceBuffer, chunk: Uint8Array) {
  await waitForLessonAudioSourceBufferIdle(sourceBuffer);
  sourceBuffer.appendBuffer(chunk);
  await waitForLessonAudioSourceBufferIdle(sourceBuffer);
}

function endLessonAudioMediaSource(mediaSource: MediaSource) {
  if (mediaSource.readyState !== "open") return;

  try {
    mediaSource.endOfStream();
  } catch {
    // The browser may close the source while the user navigates away.
  }
}

function revokeLessonAudioUrl(url: string | null, isObjectUrl: boolean) {
  if (url && isObjectUrl) URL.revokeObjectURL(url);
}

function ConceptAudioPlayer({
  content,
  staticAudioOnly = false,
  staticAudioUrl,
  title
}: {
  content: string;
  staticAudioOnly?: boolean;
  staticAudioUrl?: string | null;
  title: string;
}) {
  const { currentUser, language, settingsReady, t } = useSettings();
  const audioText = useMemo(() => prepareLessonAudioText(content), [content]);
  const audioChunks = useMemo(() => buildLessonAudioChunks(audioText), [audioText]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const audioUrlIsObjectUrlRef = useRef(false);
  const audioChunksRef = useRef<LessonAudioChunk[]>(audioChunks);
  const chunkAudioUrlsRef = useRef<Map<number, string>>(new Map());
  const chunkLoadPromisesRef = useRef<Map<number, Promise<string | null>>>(new Map());
  const currentChunkIndexRef = useRef(0);
  const audioLoadPromiseRef = useRef<Promise<boolean> | null>(null);
  const streamingPumpRef = useRef<Promise<void> | null>(null);
  const usingChunkQueueRef = useRef(false);
  const speechFallbackUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const speechFallbackActiveRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [playbackState, setPlaybackState] = useState<LessonAudioPlaybackState>("idle");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(() => estimateLessonAudioChunksDurationSeconds(audioChunks));
  const [rate, setRate] = useState<(typeof lessonAudioRates)[number]>(defaultLessonAudioRate);
  const isLoading = playbackState === "loading";
  const canRequestAudio = settingsReady && Boolean(currentUser) && Boolean(audioText);
  const playButtonLabel = playbackState === "playing"
    ? t({ en: "Pause audio", zh: "暫停語音", zhHans: "暂停语音" })
    : playbackState === "paused"
      ? t({ en: "Resume audio", zh: "繼續語音", zhHans: "继续语音" })
      : t({ en: "Play audio", zh: "播放語音", zhHans: "播放语音" });
  const statusText = !settingsReady
    ? t({ en: "Checking voice access...", zh: "正在檢查語音權限...", zhHans: "正在检查语音权限..." })
    : !currentUser
      ? t({ en: "Sign in to use AI audio", zh: "登入後即可使用 AI 語音", zhHans: "登录后即可使用 AI 语音" })
      : playbackState === "loading"
        ? t({ en: "Preparing the first audio segment...", zh: "正在準備第一段語音...", zhHans: "正在准备第一段语音..." })
        : playbackState === "playing"
          ? t({ en: "Reading aloud now", zh: "正在朗讀", zhHans: "正在朗读" })
          : playbackState === "paused"
            ? t({ en: "Audio paused", zh: "語音已暫停", zhHans: "语音已暂停" })
            : playbackState === "ended"
              ? t({ en: "Audio finished", zh: "語音已完成", zhHans: "语音已完成" })
              : playbackState === "error"
                ? t({ en: "AI audio is temporarily unavailable", zh: "AI 語音暫時不可用", zhHans: "AI 语音暂时不可用" })
                : t({ en: "Ready to read aloud", zh: "已準備朗讀", zhHans: "已准备朗读" });

  function cancelLessonSpeechFallback() {
    speechFallbackActiveRef.current = false;
    speechFallbackUtteranceRef.current = null;
    if (canUseLessonSpeechFallback()) {
      window.speechSynthesis.cancel();
    }
  }

  function startLessonSpeechFallback(abortController: AbortController) {
    if (!canUseLessonSpeechFallback() || !audioText) return false;

    abortController.abort();
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(audioText);
    utterance.lang = lessonSpeechFallbackLanguageCode(language);
    utterance.rate = rate;
    speechFallbackUtteranceRef.current = utterance;
    speechFallbackActiveRef.current = true;
    setElapsedSeconds(0);
    setPlaybackState("playing");

    utterance.onend = () => {
      if (speechFallbackUtteranceRef.current !== utterance) return;
      speechFallbackActiveRef.current = false;
      speechFallbackUtteranceRef.current = null;
      setElapsedSeconds(durationSeconds);
      setPlaybackState("ended");
    };
    utterance.onerror = () => {
      if (speechFallbackUtteranceRef.current !== utterance) return;
      speechFallbackActiveRef.current = false;
      speechFallbackUtteranceRef.current = null;
      setPlaybackState("error");
    };
    window.speechSynthesis.speak(utterance);
    return true;
  }

  useEffect(() => {
    audioChunksRef.current = audioChunks;
  }, [audioChunks]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const audioElement = audio;

    function syncAudioProgress() {
      const chunkOffset = usingChunkQueueRef.current
        ? lessonAudioChunkOffsetSeconds(audioChunksRef.current, currentChunkIndexRef.current)
        : 0;
      setElapsedSeconds(chunkOffset + audioElement.currentTime);
      if (!usingChunkQueueRef.current && Number.isFinite(audioElement.duration) && audioElement.duration > 0) {
        setDurationSeconds(audioElement.duration);
      }
    }

    function handleLoadedMetadata() {
      syncAudioProgress();
      setPlaybackState((current) => (current === "loading" ? "ready" : current));
    }

    function handlePlay() {
      setPlaybackState("playing");
    }

    function handlePause() {
      setPlaybackState((current) => {
        if (audioElement.ended || current === "ended" || current === "idle") return current;
        return "paused";
      });
    }

    function handleEnded() {
      if (usingChunkQueueRef.current) {
        const nextIndex = currentChunkIndexRef.current + 1;
        if (nextIndex < audioChunksRef.current.length) {
          void playQueuedLessonAudioChunk(nextIndex, true);
          return;
        }
      }

      setElapsedSeconds(durationSeconds);
      setPlaybackState("ended");
    }

    function handleError() {
      setPlaybackState("error");
    }

    audioElement.addEventListener("loadedmetadata", handleLoadedMetadata);
    audioElement.addEventListener("timeupdate", syncAudioProgress);
    audioElement.addEventListener("play", handlePlay);
    audioElement.addEventListener("pause", handlePause);
    audioElement.addEventListener("ended", handleEnded);
    audioElement.addEventListener("error", handleError);

    return () => {
      audioElement.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audioElement.removeEventListener("timeupdate", syncAudioProgress);
      audioElement.removeEventListener("play", handlePlay);
      audioElement.removeEventListener("pause", handlePause);
      audioElement.removeEventListener("ended", handleEnded);
      audioElement.removeEventListener("error", handleError);
    };
  }, [durationSeconds]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  }, [rate]);

  useEffect(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    audioLoadPromiseRef.current = null;
    streamingPumpRef.current = null;
    cancelLessonSpeechFallback();
    revokeLessonAudioUrl(audioUrlRef.current, audioUrlIsObjectUrlRef.current);
    audioUrlRef.current = null;
    audioUrlIsObjectUrlRef.current = false;
    for (const audioUrl of chunkAudioUrlsRef.current.values()) {
      URL.revokeObjectURL(audioUrl);
    }
    chunkAudioUrlsRef.current.clear();
    chunkLoadPromisesRef.current.clear();
    currentChunkIndexRef.current = 0;
    usingChunkQueueRef.current = false;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute("src");
      audioRef.current.load();
    }
    setElapsedSeconds(0);
    setDurationSeconds(estimateLessonAudioChunksDurationSeconds(audioChunks));
    setPlaybackState(settingsReady && !currentUser ? "auth-required" : "idle");
  }, [audioChunks, audioText, currentUser, settingsReady, staticAudioUrl]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      cancelLessonSpeechFallback();
      revokeLessonAudioUrl(audioUrlRef.current, audioUrlIsObjectUrlRef.current);
      for (const audioUrl of chunkAudioUrlsRef.current.values()) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, []);

  async function fetchQueuedLessonAudioChunk(index: number, abortController: AbortController) {
    const existingUrl = chunkAudioUrlsRef.current.get(index);
    if (existingUrl) return existingUrl;

    const existingPromise = chunkLoadPromisesRef.current.get(index);
    if (existingPromise) return existingPromise;

    const chunk = audioChunksRef.current[index];
    if (!chunk) return null;

    const promise = (async () => {
      const response = await fetch("/api/lesson-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chunkCount: audioChunksRef.current.length,
          chunkIndex: index,
          language: lessonAudioLanguageCode(language),
          streamingStrategy: "chunked-client",
          text: chunk.text,
          title
        }),
        signal: abortController.signal
      });

      if (response.status === 401) {
        setPlaybackState("auth-required");
        return null;
      }

      if (!response.ok) {
        setPlaybackState("error");
        return null;
      }

      const blob = await response.blob();
      if (!blob.size) {
        setPlaybackState("error");
        return null;
      }

      const audioUrl = URL.createObjectURL(blob);
      chunkAudioUrlsRef.current.set(index, audioUrl);
      return audioUrl;
    })().finally(() => {
      chunkLoadPromisesRef.current.delete(index);
    });

    chunkLoadPromisesRef.current.set(index, promise);
    return promise;
  }

  function prefetchQueuedLessonAudioChunks(startIndex: number, abortController: AbortController) {
    for (let index = startIndex; index < Math.min(audioChunksRef.current.length, startIndex + 2); index += 1) {
      void fetchQueuedLessonAudioChunk(index, abortController);
    }
  }

  async function playQueuedLessonAudioChunk(index: number, shouldAutoPlay: boolean) {
    const audio = audioRef.current;
    const abortController = abortControllerRef.current;
    if (!audio || !abortController) return false;

    setPlaybackState("loading");
    const audioUrl = await fetchQueuedLessonAudioChunk(index, abortController);
    if (!audioUrl || abortController.signal.aborted) return false;

    usingChunkQueueRef.current = true;
    currentChunkIndexRef.current = index;
    audio.src = audioUrl;
    audio.playbackRate = rate;
    audio.load();
    setElapsedSeconds(lessonAudioChunkOffsetSeconds(audioChunksRef.current, index));
    setPlaybackState("ready");
    prefetchQueuedLessonAudioChunks(index + 1, abortController);

    if (shouldAutoPlay) {
      await audio.play().catch(() => setPlaybackState("ready"));
    }

    return true;
  }

  async function loadQueuedLessonAudio(abortController: AbortController) {
    return playQueuedLessonAudioChunk(0, false);
  }

  async function pumpStreamingLessonAudio({
    mediaSource,
    reader,
    sourceBuffer
  }: {
    mediaSource: MediaSource;
    reader: ReadableStreamDefaultReader<Uint8Array>;
    sourceBuffer: SourceBuffer;
  }) {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value?.byteLength) {
          await appendLessonAudioSourceBuffer(sourceBuffer, value);
        }
      }
      await waitForLessonAudioSourceBufferIdle(sourceBuffer);
      endLessonAudioMediaSource(mediaSource);
    } catch (error) {
      if (!abortControllerRef.current?.signal.aborted) {
        setPlaybackState("error");
      }
      try {
        await reader.cancel();
      } catch {
        // The stream may already be closed.
      }
    }
  }

  async function loadStreamingLessonAudio(abortController: AbortController): Promise<"loaded" | "fallback" | "stop"> {
    if (!canUseStreamingLessonAudio() || !audioRef.current) return "fallback";

    const audio = audioRef.current;
    const mediaSource = new MediaSource();
    const audioUrl = URL.createObjectURL(mediaSource);
    audioUrlRef.current = audioUrl;
    audioUrlIsObjectUrlRef.current = true;
    audio.src = audioUrl;
    audio.playbackRate = rate;
    audio.load();

    function cleanupStreamingCandidate() {
      if (audioUrlRef.current === audioUrl) {
        revokeLessonAudioUrl(audioUrl, true);
        audioUrlRef.current = null;
        audioUrlIsObjectUrlRef.current = false;
        audio.removeAttribute("src");
        audio.load();
      }
    }

    try {
      const sourceOpenPromise = waitForLessonAudioMediaSourceOpen(mediaSource);
      await sourceOpenPromise;
      const response = await fetch("/api/lesson-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: lessonAudioLanguageCode(language),
          responseFormat: "stream",
          stream: true,
          text: audioText,
          title
        }),
        signal: abortController.signal
      });

      if (response.status === 401) {
        cleanupStreamingCandidate();
        setPlaybackState("auth-required");
        return "stop";
      }

      if (!response.ok || !response.body) {
        cleanupStreamingCandidate();
        return "fallback";
      }

      const sourceBuffer = mediaSource.addSourceBuffer("audio/mpeg");
      const reader = response.body.getReader();
      const firstRead = await reader.read();
      if (firstRead.done || !firstRead.value?.byteLength) {
        await reader.cancel();
        cleanupStreamingCandidate();
        return "fallback";
      }

      usingChunkQueueRef.current = false;
      await appendLessonAudioSourceBuffer(sourceBuffer, firstRead.value);
      setPlaybackState("ready");
      streamingPumpRef.current = pumpStreamingLessonAudio({ mediaSource, reader, sourceBuffer });
      return "loaded";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return "stop";
      cleanupStreamingCandidate();
      return "fallback";
    }
  }

  async function loadLessonAudio() {
    if (audioLoadPromiseRef.current) return audioLoadPromiseRef.current;

    const loadPromise = loadLessonAudioInternal();
    audioLoadPromiseRef.current = loadPromise;
    try {
      return await loadPromise;
    } finally {
      if (audioLoadPromiseRef.current === loadPromise) {
        audioLoadPromiseRef.current = null;
      }
    }
  }

  async function loadLessonAudioInternal() {
    if (!canRequestAudio || !audioRef.current) return false;
    if (audioRef.current.src && (audioUrlRef.current || chunkAudioUrlsRef.current.size > 0)) return true;

    abortControllerRef.current?.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    setPlaybackState("loading");

    try {
      if (staticAudioUrl) {
        cancelLessonSpeechFallback();
        audioUrlRef.current = staticAudioUrl;
        audioUrlIsObjectUrlRef.current = false;
        usingChunkQueueRef.current = false;
        currentChunkIndexRef.current = 0;
        audioRef.current.src = staticAudioUrl;
        audioRef.current.playbackRate = rate;
        audioRef.current.load();
        setElapsedSeconds(0);
        setPlaybackState("ready");
        return true;
      }

      if (staticAudioOnly) {
        setPlaybackState("error");
        return false;
      }

      const remoteAudioPromise = (async () => {
        const streamingResult = await loadStreamingLessonAudio(abortController);
        if (streamingResult === "loaded") return true;
        if (streamingResult === "stop") return false;

        const queued = await loadQueuedLessonAudio(abortController);
        if (!queued && !abortController.signal.aborted) {
          setPlaybackState((current) => (current === "auth-required" ? current : "error"));
        }
        return queued;
      })();
      const speechFallbackPromise = new Promise<boolean>((resolve) => {
        if (!canUseLessonSpeechFallback()) return;

        const fallbackTimer = window.setTimeout(() => {
          resolve(startLessonSpeechFallback(abortController));
        }, lessonAudioQuickFallbackDelayMs);
        void remoteAudioPromise.finally(() => window.clearTimeout(fallbackTimer));
      });

      return await Promise.race([remoteAudioPromise, speechFallbackPromise]);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return false;
      setPlaybackState("error");
      return false;
    } finally {
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
    }
  }

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) return;

    if (playbackState === "playing") {
      if (speechFallbackActiveRef.current && canUseLessonSpeechFallback()) {
        window.speechSynthesis.pause();
        setPlaybackState("paused");
        return;
      }
      audio.pause();
      return;
    }

    if (playbackState === "paused" || playbackState === "ready") {
      if (speechFallbackActiveRef.current && canUseLessonSpeechFallback()) {
        window.speechSynthesis.resume();
        setPlaybackState("playing");
        return;
      }
      await audio.play().catch(() => setPlaybackState(audioUrlRef.current ? "ready" : "error"));
      return;
    }

    if (playbackState === "ended") {
      audio.currentTime = 0;
      await audio.play().catch(() => setPlaybackState(audioUrlRef.current ? "ready" : "error"));
      return;
    }

    const loaded = await loadLessonAudio();
    if (loaded && speechFallbackActiveRef.current) return;
    if (loaded && audioRef.current) {
      await audioRef.current.play().catch(() => setPlaybackState(audioUrlRef.current ? "ready" : "error"));
    }
  }

  return (
    <div
      aria-label={t({ en: `Audio guide for ${title}`, zh: `${title} 語音導讀`, zhHans: `${title} 语音导读` })}
      className="flex max-w-full flex-wrap items-center justify-end gap-2 self-end sm:shrink-0 sm:self-auto"
      role="group"
    >
      <audio ref={audioRef} preload="metadata" />
      <button
        type="button"
        onClick={togglePlayback}
        disabled={isLoading || !canRequestAudio}
        aria-label={`${playButtonLabel}: ${title}`}
        aria-busy={isLoading}
        aria-pressed={playbackState === "playing"}
        className={cn(
          "focus-ring inline-grid size-11 shrink-0 place-items-center rounded-full border border-blue-500 bg-white text-blue-700 shadow-sm shadow-blue-500/10 transition-colors enabled:hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-blue-300 dark:bg-slate-950/75 dark:text-blue-200 dark:shadow-none dark:enabled:hover:bg-blue-400/10",
          playbackState === "playing" && "border-blue-500 bg-blue-50 ring-4 ring-blue-100 dark:border-blue-300 dark:bg-blue-400/10 dark:ring-blue-400/15",
          playbackState === "error" && "border-rose-300 text-rose-600 dark:border-rose-300/40 dark:text-rose-200"
        )}
        title={`${playButtonLabel} · ${statusText}`}
      >
        {isLoading
          ? <LessonAudioLoadingIcon />
          : playbackState === "playing"
            ? <LessonAudioPauseIcon />
            : playbackState === "error"
              ? <SoundOffIcon className="size-5" />
              : <ReadAloudIcon className="size-6" />}
      </button>

      <div
        aria-label={t({ en: `Playback speed for ${title}`, zh: `${title} 播放語速`, zhHans: `${title} 播放语速` })}
        className="inline-flex rounded-full border border-slate-200/90 bg-slate-50/90 p-0.5 shadow-sm dark:border-white/10 dark:bg-white/[0.06] dark:shadow-none"
        role="group"
      >
        {lessonAudioRates.map((audioRate) => {
          const isActive = rate === audioRate;

          return (
            <button
              key={audioRate}
              type="button"
              onClick={() => setRate(audioRate)}
              aria-label={t({
                en: `${formatLessonAudioRate(audioRate)} playback speed for ${title}`,
                zh: `${title} 使用 ${formatLessonAudioRate(audioRate)} 播放語速`,
                zhHans: `${title} 使用 ${formatLessonAudioRate(audioRate)} 播放语速`
              })}
              aria-pressed={isActive}
              className={cn(
                "focus-ring inline-flex min-h-11 min-w-11 items-center justify-center rounded-full px-2 text-xs font-black tabular-nums transition sm:text-sm",
                isActive
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-600/20 dark:bg-blue-300 dark:text-slate-950"
                  : "text-slate-500 hover:bg-white hover:text-blue-700 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-blue-100"
              )}
            >
              {formatLessonAudioRate(audioRate)}
            </button>
          );
        })}
      </div>

      {playbackState === "error" || playbackState === "auth-required" ? (
        <p className={cn(
          "w-full text-right text-xs font-bold",
          playbackState === "error"
            ? "text-rose-600 dark:text-rose-200"
            : "text-amber-700 dark:text-amber-200"
        )}>
          {statusText}
        </p>
      ) : null}
      <p className="sr-only" aria-atomic="true" aria-live="polite">
        {statusText}
      </p>
      <span className="sr-only">
        {formatLessonAudioTime(elapsedSeconds)} / {formatLessonAudioTime(durationSeconds)}. {t({
          en: "The reading voice is selected automatically from the lesson language.",
          zh: "朗讀音色會根據課節語言自動選擇。",
          zhHans: "朗读音色会根据课时语言自动选择。"
        })}
      </span>
    </div>
  );
}

function lessonIllustrationSlotForBlock(block: LessonBlock): LessonIllustrationSlot | null {
  if (block.type === "concept" || block.type === "worked-example") return block.type;
  return null;
}

function getLessonIllustrationBySlot(lesson: LessonDetail, slot: LessonIllustrationSlot): LessonIllustration | null {
  if (lesson.publisher === "US_AR_MATH") {
    return getUsArkansasMiddleSchoolLessonIllustration(lesson.topicId, slot);
  }

  if (lesson.publisher === "US_CA_MATH") {
    return getUsCaliforniaLessonIllustration(lesson.topicId, slot);
  }

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

function compactLessonIllustrations(illustrations: (LessonIllustration | null)[]) {
  return illustrations.filter(
    (illustration): illustration is LessonIllustration =>
      illustration !== null && !hiddenLessonIllustrationIds.has(illustration.id)
  );
}

function getLessonIllustrationsForBlock(
  lesson: LessonDetail,
  block: LessonBlock,
  _primaryConceptBlockId: string | null
) {
  const slot = lessonIllustrationSlotForBlock(block);
  if (!slot) return [];

  return compactLessonIllustrations([getLessonIllustrationBySlot(lesson, slot)]);
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

function lessonSelectionHelpLabel(helpType: TutorSelectionHelpType) {
  const labels: Record<TutorSelectionHelpType, { en: string; zh: string; zhHans: string }> = {
    explain: { en: "Explain", zh: "解釋這段", zhHans: "解释这段" },
    "simple-example": { en: "Simple example", zh: "給簡單例子", zhHans: "给简单例子" },
    "why-step": { en: "Why this step?", zh: "為何成立", zhHans: "为何成立" },
    "prerequisite-gap": { en: "Find the gap", zh: "找前置缺口", zhHans: "找前置缺口" },
    custom: { en: "Custom", zh: "自訂", zhHans: "自定义" }
  };

  return labels[helpType];
}

function LessonSelectionAskPopover({
  onClose,
  onSubmit,
  selection
}: {
  onClose: () => void;
  onSubmit: (helpType: TutorSelectionHelpType, customInput?: string) => void;
  selection: LessonSelectionPopoverState;
}) {
  const { t } = useSettings();
  const [customInput, setCustomInput] = useState("");
  const quickActions: TutorSelectionHelpType[] = ["explain", "simple-example", "why-step", "prerequisite-gap"];

  return (
    <div
      data-testid="lesson-ai-selection-popover"
      role="dialog"
      aria-label={t({ en: "Ask AI about selected lesson text", zh: "向 AI 詢問選取的課節文字", zhHans: "向 AI 询问选取的课时文字" })}
      className="fixed z-[95] w-[min(20rem,calc(100vw-1.5rem))] rounded-[1.35rem] border border-cyan-200/80 bg-white p-3 shadow-2xl shadow-slate-950/20 dark:border-cyan-300/20 dark:bg-slate-950"
      data-lesson-selection-popover="true"
      onPointerDown={(event) => {
        if (event.target instanceof HTMLTextAreaElement) return;
        event.preventDefault();
      }}
      style={{
        left: selection.left,
        top: selection.top,
        transform: selection.placement === "above" ? "translateY(-100%)" : undefined
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-600 dark:text-cyan-200">
            {t(askNovaBySelectingLabel)}
          </p>
          <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">
            “{selection.selectedText}”
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t({ en: "Close selected text help", zh: "關閉選取文字協助", zhHans: "关闭选取文字协助" })}
          className="focus-ring shrink-0 rounded-full px-2 py-1 text-sm font-black text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
        >
          ×
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {quickActions.map((helpType) => (
          <button
            key={helpType}
            type="button"
            data-testid={`lesson-ai-help-${helpType}`}
            onClick={() => onSubmit(helpType)}
            className="focus-ring min-h-10 rounded-2xl border border-cyan-200/75 bg-cyan-50 px-3 py-2 text-left text-xs font-black text-cyan-800 transition hover:-translate-y-0.5 hover:border-fuchsia-200 hover:bg-fuchsia-50 dark:border-cyan-300/20 dark:bg-cyan-400/10 dark:text-cyan-50 dark:hover:border-fuchsia-200/35 dark:hover:bg-fuchsia-400/10"
          >
            {t(lessonSelectionHelpLabel(helpType))}
          </button>
        ))}
      </div>

      <form
        className="mt-3"
        onSubmit={(event) => {
          event.preventDefault();
          const trimmed = customInput.trim();
          if (trimmed) onSubmit("custom", trimmed);
        }}
      >
        <label htmlFor="lesson-ai-selection-custom-input" className="sr-only">
          {t({ en: "Ask a custom question about selected text", zh: "針對選取文字自訂問題", zhHans: "针对选取文字自定义问题" })}
        </label>
        <textarea
          id="lesson-ai-selection-custom-input"
          value={customInput}
          rows={2}
          onChange={(event) => setCustomInput(event.target.value)}
          placeholder={t({ en: "Tell Nova what you do not understand...", zh: "告訴 Nova 你不明白哪一步...", zhHans: "告诉 Nova 你不明白哪一步..." })}
          className="focus-ring w-full resize-none rounded-2xl border border-slate-200/80 bg-white px-3 py-2 text-xs font-semibold text-slate-900 placeholder:text-slate-400 dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
        />
        <button
          type="submit"
          disabled={!customInput.trim()}
          className="focus-ring mt-2 w-full rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white transition enabled:hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-950"
        >
          {t({ en: "Ask with my question", zh: "用我的問題提問", zhHans: "用我的问题提问" })}
        </button>
      </form>
    </div>
  );
}

function lessonTitleLengthScore(value: string) {
  const compacted = value.replace(/\s+/g, " ").trim();
  const cjkCharacters = compacted.match(/[\u3400-\u9fff]/g)?.length ?? 0;
  const remainingCharacters = compacted.replace(/[\u3400-\u9fff]/g, "").length;

  return remainingCharacters + cjkCharacters * 1.8;
}

function lessonTitleSizeLimits(title: string) {
  const score = lessonTitleLengthScore(title);

  if (score <= 30) return { max: 64, min: 34, preferredLines: 1 };
  if (score <= 50) return { max: 54, min: 30, preferredLines: 1 };
  if (score <= 72) return { max: 68, min: 34, preferredLines: 3 };
  return { max: 58, min: 28, preferredLines: 3 };
}

function LessonResponsiveTitle({ title }: { title: string }) {
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const sizeLimits = useMemo(() => lessonTitleSizeLimits(title), [title]);

  useLayoutEffect(() => {
    const heading = titleRef.current;
    if (!heading) return;

    let animationFrame = 0;

    function fitTitleToTwoLines() {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => {
        const currentHeading = titleRef.current;
        if (!currentHeading) return;

        let low = sizeLimits.min;
        let high = sizeLimits.max;
        let best = sizeLimits.min;
        const previousTransition = currentHeading.style.transition;
        currentHeading.style.transition = "none";

        for (let attempt = 0; attempt < 8; attempt += 1) {
          const candidate = (low + high) / 2;
          currentHeading.style.fontSize = `${candidate}px`;
          const computedStyle = window.getComputedStyle(currentHeading);
          const lineHeight = Number.parseFloat(computedStyle.lineHeight) || candidate * 1.04;
          const renderedHeight = currentHeading.getBoundingClientRect().height;
          const fitsPreferredLines = renderedHeight <= lineHeight * sizeLimits.preferredLines + 2;
          const fitsWidth = currentHeading.scrollWidth <= currentHeading.clientWidth + 2;

          if (fitsPreferredLines && fitsWidth) {
            best = candidate;
            low = candidate + 0.4;
          } else {
            high = candidate - 0.4;
          }
        }

        currentHeading.style.fontSize = `${Math.floor(best)}px`;
        currentHeading.style.transition = previousTransition;
      });
    }

    fitTitleToTwoLines();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", fitTitleToTwoLines);
      return () => {
        window.cancelAnimationFrame(animationFrame);
        window.removeEventListener("resize", fitTitleToTwoLines);
      };
    }

    const observer = new ResizeObserver(fitTitleToTwoLines);
    observer.observe(heading.parentElement ?? heading);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      observer.disconnect();
    };
  }, [sizeLimits.max, sizeLimits.min, sizeLimits.preferredLines, title]);

  return (
    <h1
      ref={titleRef}
      className="max-w-full break-words text-center font-black leading-[1.04] tracking-normal text-slate-950 [text-wrap:balance] dark:text-white"
      style={{ fontSize: `${sizeLimits.max}px` }}
    >
      {title}
    </h1>
  );
}

function LessonHeroHeader({ title, action }: { title?: string; action?: ReactNode }) {
  return (
    <div className={`flex flex-col gap-5 ${title ? "xl:flex-row xl:items-end xl:justify-between" : "items-start sm:items-end"}`}>
      {title ? (
        <div className="min-w-0 flex-1">
          <LessonResponsiveTitle title={title} />
        </div>
      ) : null}
      {action ? <div className={`shrink-0 ${title ? "xl:pb-1" : "w-full sm:w-auto"}`}>{action}</div> : null}
    </div>
  );
}

export function LessonView({ gradeLessons = [], slug, initialLesson, visualizationLab = null }: LessonViewProps) {
  const { currentUser, language, settingsReady, t, text } = useSettings();
  const { openTutor } = useAITutor();
  const prefersReducedMotion = useReducedMotion();
  const lessonSelectionRootRef = useRef<HTMLDivElement | null>(null);
  const lessonDirectoryPaneRef = useRef<HTMLDivElement | null>(null);
  const lessonContentPaneRef = useRef<HTMLDivElement | null>(null);
  const mobileLessonTargetStabilizationCleanupRef = useRef<(() => void) | null>(null);
  const questionStartedAtRef = useRef<Record<string, number>>({});
  const lessonPracticeSectionRef = useRef<HTMLElement | null>(null);
  const summaryCloseButtonRef = useRef<HTMLButtonElement | null>(null);
  const enteredPlanetSlugRef = useRef<string | null>(null);
  const lessonIntroTargetRef = useRef<"galaxy" | "lesson">("galaxy");
  const lessonGalaxyPlanetEntryDecisionRef = useRef<LessonGalaxyPlanetEntryDecision | null>(null);
  const galaxyDirectoryCloseTimerRef = useRef<number | null>(null);
  const normalizedInitialLesson = useMemo(() => limitLessonPracticeQuestions(initialLesson), [initialLesson]);
  const [lesson, setLesson] = useState<LessonDetail | null>(normalizedInitialLesson);
  const [lessonModules, setLessonModules] = useState<LessonSummary[]>(gradeLessons);
  const lessonModulesRequestGenerationRef = useRef(0);
  const lessonModulesRequestRef = useRef<{ generation: number; scopeKey: string } | null>(null);
  const lessonModulesRoadmapAbortRef = useRef<AbortController | null>(null);
  const lessonModulesActiveOwnerScopeKeyRef = useRef("");
  const completedLessonModuleOverridesRef = useRef<{
    ownerScopeKey: string;
    overrides: CompletedLessonModuleOverride[];
  }>({ ownerScopeKey: "", overrides: [] });
  const [lessonLoadState, setLessonLoadState] = useState<LessonLoadState>(normalizedInitialLesson ? "ready" : "idle");
  const [questionResults, setQuestionResults] = useState<Record<string, LessonQuestionResult>>({});
  const [checklistState, setChecklistState] = useState<Record<string, boolean>>(normalizedInitialLesson?.checklistState ?? {});
  const [isSavingLessonProgress, setIsSavingLessonProgress] = useState(false);
  const [lessonProgressError, setLessonProgressError] = useState("");
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isGalaxyDirectoryOpen, setIsGalaxyDirectoryOpen] = useState(true);
  const [isGalaxyDirectoryClosing, setIsGalaxyDirectoryClosing] = useState(false);
  const [summaryAutoOpened, setSummaryAutoOpened] = useState(false);
  const [perfectCelebrationShown, setPerfectCelebrationShown] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [hasEnteredGalaxyPlanet, setHasEnteredGalaxyPlanet] = useState(true);
  const [lessonSelection, setLessonSelection] = useState<LessonSelectionPopoverState | null>(null);
  // The unit directory is a persistent lesson navigator, even for old links with planet-entry state.
  const shouldRenderGalaxyDirectory = true;
  const lessonMenu = useLessonMenuVisibility({
    enabled: shouldRenderGalaxyDirectory,
    grade: lesson?.grade ?? null,
    prefersReducedMotion: Boolean(prefersReducedMotion)
  });
  const lessonWorldTheme = lessonWorldThemeForCourse(lesson);
  const canSaveProgress = settingsReady && currentUser?.role === "student";
  const canViewTeacherGuide = currentUser?.role === "teacher" || currentUser?.role === "admin";
  const conceptBlocks = useMemo(() => [
    ...blocksByType(lesson, "interactive-lesson"),
    ...blocksByType(lesson, "concept"),
    ...blocksByType(lesson, "worked-example")
  ], [lesson]);
  const checklistBlocks = useMemo(() => blocksByType(lesson, "checklist"), [lesson]);
  const checklistItems = useMemo(() => lesson
    ? buildLessonCompletionChecklistItems({
      checklistBlocks,
      grade: lesson.grade,
      publisher: lesson.publisher
    })
    : [], [checklistBlocks, lesson]);
  const primaryConceptBlockId = useMemo(
    () => conceptBlocks.find((block) => block.type === "concept")?.id ?? null,
    [conceptBlocks]
  );
  const lessonPracticeQuestions = useMemo(
    () => dedupePracticeQuestions(lesson?.practiceQuestions ?? []).map(formatLessonPracticeQuestionMathText),
    [lesson]
  );
  const teacherGuideBlocks = useMemo(() => blocksByType(lesson, "teacher-guide"), [lesson]);
  const visualizationBlock = useMemo(() => blocksByType(lesson, "visualization")[0], [lesson]);
  const visualizationContent = useMemo(() => {
    if (!visualizationBlock?.content) return "";

    return cleanLessonVisualizationContent(text(visualizationBlock.content));
  }, [text, visualizationBlock]);
  const visualizationTitleLines = useMemo(() => {
    if (!visualizationBlock?.title) return [];

    return splitLessonVisualizationTitle(text(visualizationBlock.title));
  }, [text, visualizationBlock]);
  const VisualizationModule = getLessonVisualization(visualizationBlock?.visualizationConfig?.moduleId);
  const showVisualizationAxisLabels = visualizationBlock?.visualizationConfig?.moduleId === "function-graph-explorer";
  const { ref: visualizationMountRef, shouldMount: shouldMountVisualization } = useMountWhenNear();
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
  // Flattened per-question correctness for the pager's quest trail and star chip.
  const lessonAnswerResults = useMemo(() => {
    const results: Record<string, boolean> = {};
    lessonPracticeQuestions.forEach((question) => {
      const result = questionResults[question.id];
      if (result) results[question.id] = result.correct;
    });
    return results;
  }, [lessonPracticeQuestions, questionResults]);
  const hasPerfectLessonPracticeFinish = Boolean(
    lessonPracticeSummary?.isComplete &&
    lessonPracticeSummary.totalQuestions === lessonPracticeQuestionLimit &&
    lessonPracticeSummary.correctCount === lessonPracticeQuestionLimit
  );
  // Lesson practice pays into the same Practice Island star economy as the
  // arena: one best-wins award per completed round, credited to the lesson
  // topic's island region so the pager's star chip "counts" for real.
  const awardedLessonPracticeStarsSlugRef = useRef<string | null>(null);
  useEffect(() => {
    if (!lesson || !lessonPracticeSummary?.isComplete) return;
    if (awardedLessonPracticeStarsSlugRef.current === lesson.slug) return;

    awardedLessonPracticeStarsSlugRef.current = lesson.slug;
    const regionId = classifyPracticeIslandTopic({ topicId: lesson.topicId, topic: lesson.topic?.title });
    const stars = practiceIslandStarsForAccuracy(lessonPracticeSummary.accuracyPercent);
    try {
      const storageKey = practiceIslandStarStorageKey(currentUser?.id);
      const currentRecord = readPracticeIslandStarRecord(window.localStorage.getItem(storageKey));
      const nextRecord = awardPracticeIslandStars(currentRecord, regionId, stars);
      if (nextRecord !== currentRecord) window.localStorage.setItem(storageKey, JSON.stringify(nextRecord));
    } catch {
      // Storage unavailable: the server-side record below still counts the stars.
    }
    if (currentUser?.role === "student") {
      void fetch("/api/gamification/practice-island", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regionId, stars })
      }).catch(() => undefined);
    }
  }, [currentUser?.id, currentUser?.role, lesson, lessonPracticeSummary]);
  const lessonDisplayTitle = lesson ? cleanLessonDisplayTitle(text(lesson.title)) : "";
  const lessonGalaxyItems = useMemo<LessonGalaxyItem[]>(() => {
    if (!lesson) return [];

    const itemFallback = t({
      en: "Open this learning item in the lesson below.",
      zh: "在下方課節中開啟此學習內容。",
      zhHans: "在下方课时中开启此学习内容。"
    });
    const blockDescription = (block: LessonBlock) =>
      compactLessonGalaxyDescription(
        block.content
          ? text(block.content)
          : block.items?.map((item) => text(item)).join(" ") ?? "",
        itemFallback
      );
    const items: LessonGalaxyItem[] = [
      ...conceptBlocks.map((block): LessonGalaxyItem => ({
        description: blockDescription(block),
        id: `block-${block.id}`,
        kind: block.type === "worked-example" ? "worked-example" : "concept",
        subtitle: t(
          block.type === "interactive-lesson"
            ? { en: "Interactive lesson", zh: "互動課文", zhHans: "互动课文" }
            : block.type === "worked-example"
              ? { en: "Guided example", zh: "引導例題", zhHans: "引导例题" }
              : { en: "Concept reading", zh: "概念閱讀", zhHans: "概念阅读" }
        ),
        targetId: lessonBlockSectionId(block.id),
        title: block.type === "interactive-lesson"
          ? text(block.title)
          : block.type === "worked-example"
            ? t(singularWorkedExampleTitle)
            : t({ en: "Concept explanation", zh: "概念說明", zhHans: "概念说明" })
      }))
    ];

    if (visualizationBlock) {
      items.push({
        description: visualizationContent ? compactLessonGalaxyDescription(visualizationContent, itemFallback) : itemFallback,
        id: `block-${visualizationBlock.id}`,
        kind: "visualization",
        subtitle: t({ en: "Interactive lab", zh: "互動實驗室", zhHans: "互动实验室" }),
        targetId: "visualization",
        title: t({ en: "Interactive lab", zh: "互動實驗室", zhHans: "互动实验室" })
      });
    }

    if (lessonPracticeQuestions.length) {
      items.push({
        description: t({
          en: "Answer the linked lesson questions, review feedback, and unlock the next Practice Arena step when ready.",
          zh: "完成本課節連結題目、查看回饋，準備好後前往練習場延伸。",
          zhHans: "完成本课时链接题目、查看反馈，准备好后前往练习场延伸。"
        }),
        id: "practice",
        kind: "practice",
        subtitle: t({
          en: `${lessonPracticeQuestions.length} questions`,
          zh: `${lessonPracticeQuestions.length} 題`,
          zhHans: `${lessonPracticeQuestions.length} 题`
        }),
        targetId: lessonPracticeSectionId,
        title: t({ en: "Practice check", zh: "練習檢查", zhHans: "练习检查" })
      });
    }

    if (canViewTeacherGuide) {
      teacherGuideBlocks.forEach((block) => {
        items.push({
          description: blockDescription(block),
          id: `block-${block.id}`,
          kind: "teacher-guide",
          subtitle: t({ en: "Teacher guide", zh: "教師使用建議", zhHans: "教师使用建议" }),
          targetId: lessonBlockSectionId(block.id),
          title: text(block.title)
        });
      });
    }

    return items;
  }, [
    canViewTeacherGuide,
    conceptBlocks,
    lesson,
    lessonPracticeQuestions.length,
    t,
    teacherGuideBlocks,
    text,
    visualizationBlock,
    visualizationContent
  ]);
  const activeLessonUnitIndex = Math.max(
    0,
    gradeLessons.findIndex((module) => module.slug === slug || module.slug === lesson?.slug)
  );
  const lessonPartDisplayByTargetId = useMemo(() => new Map<string, LessonPartDisplay>(
    lessonGalaxyItems.map((item, itemIndex) => [
      item.targetId,
      formatLessonPartDisplay({
        itemIndex,
        title: item.title,
        unitIndex: activeLessonUnitIndex
      })
    ])
  ), [activeLessonUnitIndex, lessonGalaxyItems]);
  const visualizationDisplayTitle = lessonPartDisplayByTargetId.get("visualization")?.contentTitle;
  const practiceDisplayTitle = lessonPartDisplayByTargetId.get(lessonPracticeSectionId)?.contentTitle;

  useLayoutEffect(() => {
    const currentLessonHref = lessonHrefForSlug(slug);
    cancelMobileLessonTargetStabilization();
    lessonContentPaneRef.current?.scrollTo({
      behavior: "auto",
      top: 0
    });
    const entryDecision = lessonGalaxyPlanetEntryDecision(
      currentLessonHref,
      lessonGalaxyPlanetEntryDecisionRef.current
    );
    lessonGalaxyPlanetEntryDecisionRef.current = entryDecision;

    if (galaxyDirectoryCloseTimerRef.current !== null) {
      window.clearTimeout(galaxyDirectoryCloseTimerRef.current);
      galaxyDirectoryCloseTimerRef.current = null;
    }
    lessonIntroTargetRef.current = entryDecision.shouldEnterLessonContent ? "lesson" : "galaxy";
    enteredPlanetSlugRef.current = slug;
    setHasEnteredGalaxyPlanet(true);
    setIsGalaxyDirectoryOpen(!entryDecision.shouldEnterLessonContent);
    setIsGalaxyDirectoryClosing(false);
    if (entryDecision.shouldEnterLessonContent) {
      window.requestAnimationFrame(() => {
        document.getElementById(lessonOverviewSectionId)?.scrollIntoView({
          behavior: "auto",
          block: "start"
        });
      });
    }
    if (entryDecision.shouldClearSearch) {
      clearLessonGalaxyEnterPlanetSearch(currentLessonHref);
    }
    window.setTimeout(() => {
      if (lessonGalaxyPlanetEntryDecisionRef.current === entryDecision) {
        lessonGalaxyPlanetEntryDecisionRef.current = null;
      }
    }, 1200);
  }, [slug]);

  useEffect(() => () => cancelMobileLessonTargetStabilization(), []);

  useEffect(() => {
    setLesson(normalizedInitialLesson);
    setChecklistState(normalizedInitialLesson?.checklistState ?? {});
    setLessonLoadState(normalizedInitialLesson ? "ready" : "idle");
  }, [normalizedInitialLesson]);

  useEffect(() => {
    lessonModulesRoadmapAbortRef.current?.abort();
    lessonModulesRoadmapAbortRef.current = null;
    lessonModulesRequestRef.current = null;
    const generation = lessonModulesRequestGenerationRef.current + 1;
    lessonModulesRequestGenerationRef.current = generation;

    if (!settingsReady || currentUser?.role !== "student" || !lesson) {
      lessonModulesActiveOwnerScopeKeyRef.current = "";
      completedLessonModuleOverridesRef.current = { ownerScopeKey: "", overrides: [] };
      setLessonModules(gradeLessons);
      return;
    }

    const curriculumProfile = currentUser.curriculumProfile;
    const curriculumTrack = currentUser.curriculumTrack;
    const lessonGrade = lesson.grade;
    const ownerScopeKey = lessonModuleProgressOwnerScopeKey({
      curriculumProfile,
      curriculumTrack,
      grade: lessonGrade,
      userId: currentUser.id
    });
    lessonModulesActiveOwnerScopeKeyRef.current = ownerScopeKey;
    if (completedLessonModuleOverridesRef.current.ownerScopeKey !== ownerScopeKey) {
      completedLessonModuleOverridesRef.current = { ownerScopeKey, overrides: [] };
    }
    setLessonModules(mergeCompletedLessonModuleOverrides(
      gradeLessons,
      completedLessonModuleOverridesRef.current.overrides
    ));

    const controller = new AbortController();
    const requestScopeKey = lessonModuleProgressRequestScopeKey({
      curriculumProfile,
      curriculumTrack,
      grade: lessonGrade,
      slug,
      userId: currentUser.id
    });
    lessonModulesRoadmapAbortRef.current = controller;
    lessonModulesRequestRef.current = { generation, scopeKey: requestScopeKey };

    async function loadPersonalizedLessonModules() {
      try {
        const response = await fetch(`/api/roadmap?grade=${encodeURIComponent(lessonGrade)}`, {
          cache: "no-store",
          signal: controller.signal
        });
        if (!response.ok) return;
        const body: unknown = await response.json();
        const personalizedModules = readLessonModulesFromRoadmapResponse(body, {
          curriculumProfile,
          curriculumTrack,
          grade: lessonGrade,
          slug
        });
        if (!personalizedModules) return;

        const request = lessonModulesRequestRef.current;
        if (
          !request ||
          request.generation !== generation ||
          request.scopeKey !== requestScopeKey ||
          controller.signal.aborted
        ) return;
        const completedOverrides = completedLessonModuleOverridesRef.current.ownerScopeKey === ownerScopeKey
          ? completedLessonModuleOverridesRef.current.overrides
          : [];
        setLessonModules(mergeCompletedLessonModuleOverrides(personalizedModules, completedOverrides));
      } catch {
        // The public SSR modules remain usable when personalized progress is unavailable.
      } finally {
        if (lessonModulesRoadmapAbortRef.current === controller) {
          lessonModulesRoadmapAbortRef.current = null;
        }
      }
    }

    void loadPersonalizedLessonModules();

    return () => {
      controller.abort();
      if (lessonModulesRoadmapAbortRef.current === controller) {
        lessonModulesRoadmapAbortRef.current = null;
      }
      const request = lessonModulesRequestRef.current;
      if (request?.generation === generation && request.scopeKey === requestScopeKey) {
        lessonModulesRequestRef.current = null;
      }
    };
  }, [
    currentUser?.curriculumProfile.publisher,
    currentUser?.curriculumProfile.region,
    currentUser?.curriculumTrack,
    currentUser?.id,
    currentUser?.role,
    gradeLessons,
    lesson?.grade,
    settingsReady,
    slug
  ]);

  // Keyed on the slug, NOT on initialLesson identity: a server re-render
  // (router.refresh, dev RSC refresh) delivers a fresh initialLesson object for
  // the SAME lesson, and resetting here wiped the learner's in-round practice
  // answers, summary, and celebration state mid-session.
  useEffect(() => {
    if (galaxyDirectoryCloseTimerRef.current !== null) {
      window.clearTimeout(galaxyDirectoryCloseTimerRef.current);
      galaxyDirectoryCloseTimerRef.current = null;
    }
    questionStartedAtRef.current = {};
    setQuestionResults({});
    setIsSavingLessonProgress(false);
    setLessonProgressError("");
    setIsSummaryOpen(false);
    setIsGalaxyDirectoryOpen(lessonIntroTargetRef.current === "galaxy");
    setIsGalaxyDirectoryClosing(false);
    setSummaryAutoOpened(false);
    setPerfectCelebrationShown(false);
    setShowCelebration(false);
    setLessonSelection(null);
  }, [slug]);

  useEffect(() => {
    return () => {
      if (galaxyDirectoryCloseTimerRef.current !== null) {
        window.clearTimeout(galaxyDirectoryCloseTimerRef.current);
      }
    };
  }, []);

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
    if (!lesson) return;

    let selectionTimer: number | null = null;

    function activeElementIsSelectionPopover() {
      return Boolean(document.activeElement?.closest("[data-lesson-selection-popover='true']"));
    }

    function closeSelectionPopover() {
      if (activeElementIsSelectionPopover()) return;
      setLessonSelection(null);
    }

    function updateSelectionPopover() {
      const root = lessonSelectionRootRef.current;
      const selection = window.getSelection();
      if (!root || !selection || selection.rangeCount === 0) {
        closeSelectionPopover();
        return;
      }

      if (activeElementIsSelectionPopover()) return;

      const selectedText = compactSelectedLessonText(selection.toString());
      if (!selectedText) {
        setLessonSelection(null);
        return;
      }

      const range = selection.getRangeAt(0);
      if (
        !root.contains(range.commonAncestorContainer) ||
        isSelectionInsideInteractiveElement(selection.anchorNode) ||
        isSelectionInsideInteractiveElement(selection.focusNode)
      ) {
        setLessonSelection(null);
        return;
      }

      const startSelectable = selectableLessonElementFor(selection.anchorNode, root);
      const endSelectable = selectableLessonElementFor(selection.focusNode, root);
      if (!startSelectable || !endSelectable || startSelectable !== endSelectable) {
        setLessonSelection(null);
        return;
      }

      const rect = range.getBoundingClientRect();
      if ((!rect.width && !rect.height) || rect.bottom < 0 || rect.top > window.innerHeight) {
        setLessonSelection(null);
        return;
      }

      const context = readLessonSelectionContext(startSelectable, selectedText);
      if (!context.lessonSlug || !context.topicId) {
        setLessonSelection(null);
        return;
      }

      const availableWidth = Math.max(12, window.innerWidth - lessonSelectionPopoverWidth - 12);
      const left = clampLessonSelectionCoordinate(
        rect.left + rect.width / 2 - lessonSelectionPopoverWidth / 2,
        12,
        availableWidth
      );
      const placement: LessonSelectionPopoverState["placement"] = rect.top > 300 ? "above" : "below";
      const top = placement === "above"
        ? Math.max(12, rect.top - 12)
        : Math.min(window.innerHeight - 24, rect.bottom + 12);

      setLessonSelection({
        ...context,
        left,
        placement,
        top
      });
    }

    function scheduleSelectionUpdate() {
      if (selectionTimer !== null) window.clearTimeout(selectionTimer);
      selectionTimer = window.setTimeout(updateSelectionPopover, 0);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        window.getSelection()?.removeAllRanges();
        setLessonSelection(null);
      }
    }

    document.addEventListener("selectionchange", scheduleSelectionUpdate);
    window.addEventListener("pointerup", scheduleSelectionUpdate);
    window.addEventListener("keyup", scheduleSelectionUpdate);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", closeSelectionPopover);
    window.addEventListener("scroll", closeSelectionPopover, true);

    return () => {
      if (selectionTimer !== null) window.clearTimeout(selectionTimer);
      document.removeEventListener("selectionchange", scheduleSelectionUpdate);
      window.removeEventListener("pointerup", scheduleSelectionUpdate);
      window.removeEventListener("keyup", scheduleSelectionUpdate);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", closeSelectionPopover);
      window.removeEventListener("scroll", closeSelectionPopover, true);
    };
  }, [lesson]);

  useEffect(() => {
    if (!lessonPracticeSummary?.isComplete || summaryAutoOpened || hasPerfectLessonPracticeFinish) return;

    setIsSummaryOpen(true);
    setSummaryAutoOpened(true);
  }, [hasPerfectLessonPracticeFinish, lessonPracticeSummary?.isComplete, summaryAutoOpened]);

  useEffect(() => {
    if (!hasPerfectLessonPracticeFinish || perfectCelebrationShown) return;

    if (prefersReducedMotion) {
      setPerfectCelebrationShown(true);
      setSummaryAutoOpened(true);
      setIsSummaryOpen(true);
      return;
    }

    setShowCelebration(true);
    const celebrationTimer = window.setTimeout(() => setShowCelebration(false), 2100);
    const summaryTimer = window.setTimeout(() => {
      setPerfectCelebrationShown(true);
      setSummaryAutoOpened(true);
      setIsSummaryOpen(true);
    }, 2250);

    return () => {
      window.clearTimeout(celebrationTimer);
      window.clearTimeout(summaryTimer);
    };
  }, [hasPerfectLessonPracticeFinish, perfectCelebrationShown, prefersReducedMotion]);

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

  function handleChecklistChange(key: string, checked: boolean) {
    const nextChecklistState = {
      ...checklistState,
      [key]: checked
    };

    setChecklistState(nextChecklistState);
    setLesson((currentLesson) =>
      currentLesson ? { ...currentLesson, checklistState: nextChecklistState } : currentLesson
    );
    setLessonProgressError("");
  }

  async function completeLesson() {
    if (!canSaveProgress) {
      setLessonProgressError(t({
        en: "Log in as a student to save lesson progress.",
        zh: "請以學生身份登入以儲存課節進度。",
        zhHans: "请以学生身份登录以保存课时进度。"
      }));
      return;
    }

    setIsSavingLessonProgress(true);
    setLessonProgressError("");

    try {
      const response = await fetch("/api/lesson-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          action: "complete",
          checklistState
        })
      });
      const body = (await response.json().catch(() => null)) as LessonProgressResponse | null;

      if (!response.ok || !body?.lesson) {
        throw new Error("Could not mark this lesson complete yet.");
      }

      const completedLesson = body.lesson;

      setLesson((currentLesson) =>
        currentLesson
          ? {
            ...currentLesson,
            checklistState,
            mastery: completedLesson.mastery,
            status: completedLesson.status
          }
          : currentLesson
      );
      if (
        currentUser?.role === "student" &&
        lesson &&
        completedLesson.slug === slug &&
        completedLesson.grade === lesson.grade
      ) {
        const ownerScopeKey = lessonModuleProgressOwnerScopeKey({
          curriculumProfile: currentUser.curriculumProfile,
          curriculumTrack: currentUser.curriculumTrack,
          grade: lesson.grade,
          userId: currentUser.id
        });
        if (lessonModulesActiveOwnerScopeKeyRef.current !== ownerScopeKey) return;
        const existingOverrides = completedLessonModuleOverridesRef.current.ownerScopeKey === ownerScopeKey
          ? completedLessonModuleOverridesRef.current.overrides
          : [];
        const completedOverrides = upsertCompletedLessonModuleOverride(existingOverrides, completedLesson);
        completedLessonModuleOverridesRef.current = { ownerScopeKey, overrides: completedOverrides };
        lessonModulesRequestGenerationRef.current += 1;
        lessonModulesRoadmapAbortRef.current?.abort();
        lessonModulesRoadmapAbortRef.current = null;
        lessonModulesRequestRef.current = null;
        setLessonModules((currentModules) =>
          mergeCompletedLessonModuleOverrides(currentModules, completedOverrides)
        );
      }
    } catch {
      setLessonProgressError(t({
        en: "Could not mark this lesson complete yet.",
        zh: "暫時未能標記課節完成。",
        zhHans: "暂时未能标记课时完成。"
      }));
    } finally {
      setIsSavingLessonProgress(false);
    }
  }

  function clearGalaxyDirectoryCloseTimer() {
    if (galaxyDirectoryCloseTimerRef.current === null) return;
    window.clearTimeout(galaxyDirectoryCloseTimerRef.current);
    galaxyDirectoryCloseTimerRef.current = null;
  }

  function scrollToLessonOverview(behavior: ScrollBehavior = prefersReducedMotion ? "auto" : "smooth") {
    document.getElementById(lessonOverviewSectionId)?.scrollIntoView({
      behavior,
      block: "start"
    });
  }

  function cancelMobileLessonTargetStabilization() {
    mobileLessonTargetStabilizationCleanupRef.current?.();
    mobileLessonTargetStabilizationCleanupRef.current = null;
  }

  function handleLessonItemSelect(targetId: string) {
    cancelMobileLessonTargetStabilization();
    const contentPane = lessonContentPaneRef.current;
    if (!contentPane) return;

    const target = Array.from(contentPane.querySelectorAll<HTMLElement>("[id]"))
      .find((candidate) => candidate.id === targetId);
    if (!target) return;

    const behavior: ScrollBehavior = prefersReducedMotion ? "auto" : "smooth";
    const desktopMediaQuery = typeof window.matchMedia === "function"
      ? window.matchMedia(lessonDesktopMinWidthQuery)
      : null;
    const isDesktop = desktopMediaQuery?.matches ?? false;
    if (!isDesktop) {
      target.scrollIntoView({ behavior, block: "start" });
      if (typeof ResizeObserver === "undefined") return;

      let animationFrameId: number | null = null;
      let hardLimitTimerId: number | null = null;
      let isCleanedUp = false;
      let observedHeight = contentPane.getBoundingClientRect().height;
      let observer: ResizeObserver | null = null;

      function cancelOnUserInput() {
        cleanup();
      }

      function cancelOnDesktopBreakpoint(event: MediaQueryListEvent) {
        if (event.matches) cleanup();
      }

      function cleanup() {
        if (isCleanedUp) return;
        isCleanedUp = true;
        observer?.disconnect();
        if (animationFrameId !== null) window.cancelAnimationFrame(animationFrameId);
        if (hardLimitTimerId !== null) window.clearTimeout(hardLimitTimerId);
        desktopMediaQuery?.removeEventListener("change", cancelOnDesktopBreakpoint);
        window.removeEventListener("pointerdown", cancelOnUserInput);
        window.removeEventListener("touchstart", cancelOnUserInput);
        window.removeEventListener("wheel", cancelOnUserInput);
        window.removeEventListener("keydown", cancelOnUserInput);
        if (mobileLessonTargetStabilizationCleanupRef.current === cleanup) {
          mobileLessonTargetStabilizationCleanupRef.current = null;
        }
      }

      observer = new ResizeObserver(() => {
        if (isCleanedUp) return;
        const nextHeight = contentPane.getBoundingClientRect().height;
        if (nextHeight === observedHeight) return;
        observedHeight = nextHeight;

        if (animationFrameId !== null) window.cancelAnimationFrame(animationFrameId);
        animationFrameId = window.requestAnimationFrame(() => {
          animationFrameId = null;
          if (isCleanedUp) return;
          if (!target.isConnected || !contentPane.contains(target)) {
            cleanup();
            return;
          }

          const request = createLessonTargetViewportRealignment({
            safeTop: mobileLessonTargetSafeTopPx,
            targetTop: target.getBoundingClientRect().top,
            viewportHeight: window.innerHeight
          });
          if (request) target.scrollIntoView(request);
        });
      });
      observer.observe(contentPane);
      if (desktopMediaQuery) {
        desktopMediaQuery.addEventListener("change", cancelOnDesktopBreakpoint);
      }
      window.addEventListener("pointerdown", cancelOnUserInput, { passive: true });
      window.addEventListener("touchstart", cancelOnUserInput, { passive: true });
      window.addEventListener("wheel", cancelOnUserInput, { passive: true });
      window.addEventListener("keydown", cancelOnUserInput);
      hardLimitTimerId = window.setTimeout(cleanup, mobileLessonTargetStabilizationMaxMs);
      mobileLessonTargetStabilizationCleanupRef.current = cleanup;
      return;
    }

    const request = createLessonContentPaneScrollRequest({
      currentScrollTop: contentPane.scrollTop,
      paneTop: contentPane.getBoundingClientRect().top,
      prefersReducedMotion: Boolean(prefersReducedMotion),
      targetTop: target.getBoundingClientRect().top,
      topPadding: lessonContentPaneTopPaddingPx
    });
    if (request) contentPane.scrollTo(request);
  }

  function scheduleLessonOverviewScroll(behavior: ScrollBehavior = prefersReducedMotion ? "auto" : "smooth") {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => scrollToLessonOverview(behavior));
    });
  }

  function closeGalaxyDirectory({ scrollToLesson = false }: { scrollToLesson?: boolean } = {}) {
    clearGalaxyDirectoryCloseTimer();
    setIsGalaxyDirectoryOpen(false);

    if (prefersReducedMotion) {
      setIsGalaxyDirectoryClosing(false);
      if (scrollToLesson) scheduleLessonOverviewScroll("auto");
      return;
    }

    setIsGalaxyDirectoryClosing(true);
    galaxyDirectoryCloseTimerRef.current = window.setTimeout(() => {
      setIsGalaxyDirectoryClosing(false);
      galaxyDirectoryCloseTimerRef.current = null;
      if (scrollToLesson) scheduleLessonOverviewScroll();
    }, lessonGalaxyCollapseDurationMs);
  }

  function enterGalaxyPlanet(targetHref: string) {
    const targetPathname = lessonPathnameFromHref(targetHref);
    const currentPathname = lessonPathnameFromHref(lessonHrefForSlug(slug));
    const isSameLessonPlanet = targetPathname === currentPathname;

    setLessonSelection(null);

    if (isSameLessonPlanet) {
      lessonIntroTargetRef.current = "lesson";
      enteredPlanetSlugRef.current = slug;
      closeGalaxyDirectory({ scrollToLesson: true });
      return;
    }

    rememberLessonGalaxyPlanetEntry(targetHref);
    lessonIntroTargetRef.current = "lesson";
  }

  function checkAllLessonAnswers() {
    const practiceSection = lessonPracticeSectionRef.current;
    if (!practiceSection) return;

    const checkAnswerLabel = t(dictionary.common.checkAnswer).trim();
    const loginActionLabel = t(dictionary.practice.loginAction).trim();
    const answerButtons = Array.from(
      practiceSection.querySelectorAll<HTMLButtonElement>("article[data-question-id] button")
    ).filter((button) => {
      const buttonText = button.textContent?.replace(/\s+/g, " ").trim();
      return !button.disabled && (buttonText === checkAnswerLabel || buttonText === loginActionLabel);
    });

    answerButtons.forEach((button) => button.click());
  }

  function lessonSelectionPrompt(helpType: TutorSelectionHelpType, selection: LessonSelectionPopoverState, customInput?: string) {
    const selected = `「${selection.selectedText}」`;
    const instruction = t({
      en: "Use my learning dashboard and adaptive signals if available. Explain what this selected part means, point out the likely prerequisite gap, walk through it step by step, and end with one quick check question. Do not give away a final answer immediately.",
      zh: "請在可用時結合我的學習儀表板和適性學習訊號。先解釋這段的意思，再指出我可能缺的前置知識，逐步說明，最後問我一個小檢查問題。不要一開始就直接給最終答案。",
      zhHans: "请在可用时结合我的学习仪表板和适性学习信号。先解释这段的意思，再指出我可能缺的前置知识，逐步说明，最后问我一个小检查问题。不要一开始就直接给最终答案。"
    });

    if (customInput?.trim()) {
      return t({
        en: `${customInput.trim()}\n\nSelected lesson text: ${selection.selectedText}\n${instruction}`,
        zh: `${customInput.trim()}\n\n我選中的課節文字：${selected}\n${instruction}`,
        zhHans: `${customInput.trim()}\n\n我选中的课时文字：${selected}\n${instruction}`
      });
    }

    const actionPrompts: Record<TutorSelectionHelpType, { en: string; zh: string; zhHans: string }> = {
      explain: {
        en: `I selected this lesson text: ${selection.selectedText}. Please explain it in a simpler way.`,
        zh: `我選中了這段課節文字：${selected}。請用更簡單的方法解釋。`,
        zhHans: `我选中了这段课时文字：${selected}。请用更简单的方法解释。`
      },
      "simple-example": {
        en: `I selected this lesson text: ${selection.selectedText}. Please give me a simpler example that matches my level.`,
        zh: `我選中了這段課節文字：${selected}。請給我一個符合我程度的簡單例子。`,
        zhHans: `我选中了这段课时文字：${selected}。请给我一个符合我程度的简单例子。`
      },
      "why-step": {
        en: `I selected this step: ${selection.selectedText}. Please explain why this step is valid.`,
        zh: `我選中了這一步：${selected}。請解釋為甚麼這一步成立。`,
        zhHans: `我选中了这一步：${selected}。请解释为什么这一步成立。`
      },
      "prerequisite-gap": {
        en: `I selected this lesson text: ${selection.selectedText}. Please help me find which prerequisite knowledge I may be missing.`,
        zh: `我選中了這段課節文字：${selected}。請幫我找出可能缺少的前置知識。`,
        zhHans: `我选中了这段课时文字：${selected}。请帮我找出可能缺少的前置知识。`
      },
      custom: {
        en: `I selected this lesson text: ${selection.selectedText}. Please help me understand it.`,
        zh: `我選中了這段課節文字：${selected}。請幫我理解。`,
        zhHans: `我选中了这段课时文字：${selected}。请帮我理解。`
      }
    };

    return `${t(actionPrompts[helpType])}\n\n${instruction}`;
  }

  function askAboutLessonSelection(helpType: TutorSelectionHelpType, customInput?: string) {
    if (!lessonSelection || !lesson) return;

    const prompt = lessonSelectionPrompt(helpType, lessonSelection, customInput);
    const context: TutorContext = {
      mode: lessonSelection.questionId ? "question" : "concept",
      title: lessonSelection.blockTitle || lessonDisplayTitle || text(lesson.title),
      details: `Selected lesson text: ${lessonSelection.selectedText}. Nearby lesson context: ${lessonSelection.surroundingText ?? ""}`,
      topicId: lessonSelection.topicId,
      questionId: lessonSelection.questionId,
      lessonSlug: lessonSelection.lessonSlug,
      dataScopes: ["student-dashboard", "adaptive-engine"],
      selection: {
        selectedText: lessonSelection.selectedText,
        helpType,
        lessonSlug: lessonSelection.lessonSlug,
        topicId: lessonSelection.topicId,
        ...(lessonSelection.questionId ? { questionId: lessonSelection.questionId } : {}),
        ...(lessonSelection.blockId ? { blockId: lessonSelection.blockId } : {}),
        ...(lessonSelection.blockType ? { blockType: lessonSelection.blockType } : {}),
        ...(lessonSelection.surroundingText ? { surroundingText: lessonSelection.surroundingText } : {})
      }
    };

    openTutor(context, { initialInput: prompt, autoSend: true });
    window.getSelection()?.removeAllRanges();
    setLessonSelection(null);
  }

  function askAboutLessonFigure(block: LessonBlock, illustration: LessonIllustration) {
    if (!lesson) return;

    const blockTitle = text(block.title);
    const caption = text(illustration.caption);
    const alt = text(illustration.alt);
    const prompt = t({
      en: `I selected this lesson image from "${blockTitle}". Please explain what the image is showing, connect it to the lesson text, and end with one quick check question.\n\nImage caption: ${caption}\nImage alt text: ${alt}`,
      zh: `我選中了「${blockTitle}」中的這張課節圖片。請解釋圖片在表達甚麼，連繫本課節文字，最後問我一個小檢查問題。\n\n圖片說明：${caption}\n替代文字：${alt}`,
      zhHans: `我选中了“${blockTitle}”中的这张课时图片。请解释图片在表达什么，联系本课时文字，最后问我一个小检查问题。\n\n图片说明：${caption}\n替代文字：${alt}`
    });
    const context: TutorContext = {
      mode: "figure",
      title: `${blockTitle} · ${t(novaLensLabel)}`,
      details: `Selected lesson image. Caption: ${caption}. Alt text: ${alt}. Lesson block: ${blockTitle}.`,
      topicId: lesson.topicId,
      lessonSlug: lesson.slug,
      dataScopes: ["student-dashboard", "adaptive-engine"]
    };

    openTutor(context, { initialInput: prompt, autoSend: true });
  }

  if (!lesson && lessonLoadState !== "error") {
    return (
      <div className="page-container py-10 sm:py-12">
        <SectionHeader
          eyebrow={t(dictionary.lesson.label)}
          title={t({ en: "Opening lesson", zh: "正在開啟課節", zhHans: "正在开启课时" })}
          description={t({
            en: "Checking your profile and loading the lesson content.",
            zh: "正在檢查你的檔案並載入課節內容。",
            zhHans: "正在检查你的档案并载入课时内容。"
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
          action={<Link href={studentRoadmapPath} className="focus-ring rounded-full bg-slate-950 px-5 py-3 font-bold text-white dark:bg-white dark:text-slate-950">{t(dictionary.lesson.backToRoadmap)}</Link>}
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
  const checkedLessonPracticeCount = lessonPracticeSummary?.answeredCount ?? 0;
  const allLessonPracticeAnswersChecked = lessonPracticeQuestions.length > 0 && checkedLessonPracticeCount >= lessonPracticeQuestions.length;
  const checkedLessonChecklistCount = checklistItems.filter(({ key }) => checklistState[key]).length;
  const lessonChecklistPercent = checklistItems.length
    ? Math.round((checkedLessonChecklistCount / checklistItems.length) * 100)
    : lesson.status === "completed"
      ? 100
      : 0;
  const lessonCompletionTitle = lessonCompletionTitleForGrade(lesson.grade);
  const lessonCompletionProgressCopy = lessonCompletionProgressText({
    checkedCount: checkedLessonChecklistCount,
    grade: lesson.grade,
    itemCount: checklistItems.length
  });
  const lessonCompletionMasteryCard = lessonCompletionMasteryCardText({
    checkedCount: checkedLessonChecklistCount,
    grade: lesson.grade,
    itemCount: checklistItems.length,
    mastery: lesson.mastery,
    status: lesson.status
  });
  const lessonContentSections = (
    <>
      <section id={lessonOverviewSectionId} data-tour="student-lesson-body" className="mt-8 scroll-mt-28 min-w-0">
        <article className="glass-panel relative min-w-0 overflow-x-auto p-6 sm:p-8">
          {conceptBlocks.map((block, index) => {
            const illustrations = getLessonIllustrationsForBlock(lesson, block, primaryConceptBlockId);
            const blockTitle = shouldUseSingularWorkedExampleTitle(block)
              ? t(singularWorkedExampleTitle)
              : text(block.title);
            const blockDisplayTitle = lessonPartDisplayByTargetId.get(lessonBlockSectionId(block.id))?.contentTitle ?? blockTitle;
            const blockContent = block.content ? text(block.content) : "";
            const displayContent =
              block.type === "concept"
                ? cleanLessonConceptContent(blockContent, text(lesson.description))
                : blockContent;
            const illustrationFigures = illustrations.map((illustration) => {
              const illustrationCaption = text(illustration.caption).trim();

              return (
                <figure key={illustration.id} className="group relative mx-auto mt-5 w-full max-w-5xl overflow-hidden rounded-2xl border border-cyan-200/70 bg-white/75 shadow-lg shadow-cyan-500/10 dark:border-cyan-300/15 dark:bg-white/[0.055]">
                  <Image
                    src={illustration.src}
                    alt={text(illustration.alt)}
                    width={illustration.width}
                    height={illustration.height}
                    sizes="(min-width: 1024px) 1024px, calc(100vw - 3rem)"
                    unoptimized={illustration.preserveRasterFidelity === true}
                    className="mx-auto h-auto w-full max-w-5xl object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => askAboutLessonFigure(block, illustration)}
                    className="focus-ring absolute right-3 top-3 inline-flex items-center gap-2 rounded-full border border-cyan-200/85 bg-white/90 px-3 py-2 text-xs font-black text-slate-950 opacity-0 shadow-lg shadow-cyan-900/15 backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-cyan-50 focus:opacity-100 group-hover:opacity-100 dark:border-cyan-300/25 dark:bg-slate-950/90 dark:text-white dark:hover:bg-slate-900"
                    aria-label={t({
                      en: "Ask AI Tutor about this image",
                      zh: "向 AI Tutor 詢問這張圖片",
                      zhHans: "向 AI Tutor 询问这张图片"
                    })}
                  >
                    <NovaLensButtonIcon compact />
                    <span>{t(novaLensLabel)}</span>
                  </button>
                  {illustrationCaption ? (
                    <figcaption className="border-t border-cyan-200/60 px-4 py-3 text-sm font-semibold leading-6 text-slate-600 dark:border-cyan-300/15 dark:text-slate-300 sm:text-base sm:leading-7">
                      {illustrationCaption}
                    </figcaption>
                  ) : null}
                </figure>
              );
            });

            return (
              <div
                key={block.id}
                id={lessonBlockSectionId(block.id)}
                data-ai-selectable="lesson-block"
                data-ai-lesson-slug={lesson.slug}
                data-ai-topic-id={lesson.topicId}
                data-ai-block-id={block.id}
                data-ai-block-type={block.type}
                data-ai-title={blockTitle}
                className={`${index === 0 ? "" : "mt-6 "}scroll-mt-28`}
              >
                {block.type === "worked-example" ? (
                  <div aria-hidden="true" className="mb-6 h-px w-full bg-slate-200/90 dark:bg-white/10" />
                ) : null}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <MathText as="h2" text={blockDisplayTitle} className="min-w-0 flex-1 text-2xl font-black text-slate-950 dark:text-white" />
                  {displayContent && (block.type === "concept" || block.type === "interactive-lesson") ? (
                    <ConceptAudioPlayer
                      content={displayContent}
                      staticAudioOnly={lessonUsesStaticAudioOnly(lesson)}
                      staticAudioUrl={staticLessonAudioUrlForBlock(lesson, block)}
                      title={blockTitle}
                    />
                  ) : null}
                </div>
                {block.type === "concept" ? illustrationFigures : null}
                {block.type === "interactive-lesson" ? (
                  // Ported CCSS interactive lesson body. The block's text content is
                  // the read-aloud narration (audio player above), not display prose.
                  (() => {
                    const interactiveConfig = block.interactiveLessonConfig;
                    const ccssMeta = interactiveConfig ? getCcssTextbookLesson(interactiveConfig.ccssLessonSlug) : null;
                    const CcssLessonBody = interactiveConfig ? getCcssLessonComponent(interactiveConfig.ccssLessonSlug) : null;

                    return ccssMeta && CcssLessonBody && interactiveConfig ? (
                      <div className="mt-4">
                        <CcssLessonBody meta={ccssMeta} topicId={interactiveConfig.topicId} />
                      </div>
                    ) : (
                      <div className="mt-4 rounded-2xl border border-amber-300/40 bg-amber-400/10 p-4 text-sm font-semibold text-amber-800 dark:text-amber-100">
                        {t({
                          en: `No interactive lesson is registered for ${interactiveConfig?.ccssLessonSlug ?? "this block"}.`,
                          zh: "此課節暫未登記互動課文。",
                          zhHans: "此课时暂未登记互动课文。"
                        })}
                      </div>
                    );
                  })()
                ) : displayContent ? (
                  <LessonContentWithAnswerReveal
                    blockId={block.id}
                    content={displayContent}
                  />
                ) : null}
                {block.type === "concept" ? null : illustrationFigures}
                {block.type === "worked-example" && illustrations.length === 0 ? (
                  <WorkedExampleIllustration
                    content={displayContent || blockTitle}
                    grade={lesson.grade}
                    publisher={lesson.publisher}
                    title={blockTitle}
                    topicId={lesson.topicId}
                  />
                ) : null}
              </div>
            );
          })}
        </article>
      </section>

      {visualizationBlock ? (
        <section id="visualization" ref={visualizationMountRef} className="mt-8 scroll-mt-28 glass-panel p-5 sm:p-6">
          <div className="mb-5">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-cyan-500 dark:text-cyan-300">{t(dictionary.lesson.visualizationPanel)}</p>
            {visualizationDisplayTitle ? (
              <MathText as="h2" text={visualizationDisplayTitle} className="mt-2 text-2xl font-black leading-tight text-slate-950 dark:text-white" />
            ) : null}
            {visualizationTitleLines.length ? (
              <p className="mt-2 text-base font-bold leading-6 text-slate-600 dark:text-slate-300">
                {visualizationTitleLines.map((line, index) => (
                  <MathText
                    key={`${index}-${line}`}
                    as="span"
                    text={line}
                    className={index === 0 ? "block" : "mt-1 block"}
                  />
                ))}
              </p>
            ) : null}
            {visualizationContent ? (
              <MathText as="p" text={visualizationContent} className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300" />
            ) : null}
          </div>
          {VisualizationModule ? (
            shouldMountVisualization ? (
              <VisualizationModule
                topicId={visualizationTopicId}
                showAxisLabels={showVisualizationAxisLabels}
                lab={visualizationLab}
              />
            ) : (
              <DeferredLessonPanel />
            )
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

      {checklistItems.length ? (
        <aside
          data-tour="student-lesson-checklist"
          className="mt-8 scroll-mt-28 glass-panel border-emerald-300/40 bg-emerald-50/80 p-5 dark:bg-emerald-950/20 sm:p-6"
          aria-label={t({ en: "Lesson completion checklist", zh: "課節完成清單", zhHans: "课时完成清单" })}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-200">
                {t({ en: "Lesson completion", zh: "課節完成", zhHans: "课时完成" })}
              </p>
              <MathText
                as="h2"
                text={t(lessonCompletionTitle)}
                className="mt-2 text-2xl font-black text-slate-950 dark:text-white"
              />
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
                {t(lessonCompletionProgressCopy)}
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-200/80 bg-white/80 px-4 py-3 text-left shadow-sm dark:border-emerald-300/20 dark:bg-white/[0.07] lg:min-w-44">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-200">
                {t(lessonCompletionMasteryCard.eyebrow)}
              </p>
              <p className="mt-1 text-3xl font-black text-slate-950 dark:text-white">
                {t(lessonCompletionMasteryCard.headline)}
              </p>
              <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">
                {t(lessonCompletionMasteryCard.status)}
              </p>
            </div>
          </div>

          <div
            className="mt-5 h-3 overflow-hidden rounded-full bg-white shadow-inner dark:bg-white/10"
            role="progressbar"
            aria-label={t({ en: "Checklist progress", zh: "清單進度", zhHans: "清单进度" })}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={lessonChecklistPercent}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500"
              style={{ width: `${Math.max(6, lessonChecklistPercent)}%` }}
            />
          </div>

          <div className="mt-5 grid gap-3">
            {checklistItems.map(({ block, item, key }) => (
              <label
                key={key}
                className="flex cursor-pointer items-start gap-3 rounded-2xl border border-emerald-200/70 bg-white/85 p-4 text-sm font-semibold leading-6 text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 dark:border-emerald-300/15 dark:bg-white/[0.055] dark:text-slate-200"
              >
                <input
                  type="checkbox"
                  checked={Boolean(checklistState[key])}
                  onChange={(event) => handleChecklistChange(key, event.currentTarget.checked)}
                  className="mt-1 h-5 w-5 shrink-0 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-400"
                  aria-label={text(item)}
                />
                <MathText as="span" text={formatLessonMathText(text(item))} className="min-w-0" />
              </label>
            ))}
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {lessonProgressError ? (
              <p role="alert" className="text-sm font-bold text-rose-600 dark:text-rose-200">
                {lessonProgressError}
              </p>
            ) : (
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                {t({
                  en: "Mark completion when you are ready to move this lesson into your progress record.",
                  zh: "準備好後標記完成，將此課節加入你的學習進度。",
                  zhHans: "准备好后标记完成，将此课时加入你的学习进度。"
                })}
              </p>
            )}
            <button
              type="button"
              onClick={() => void completeLesson()}
              disabled={!canSaveProgress || isSavingLessonProgress}
              className="focus-ring inline-flex min-h-12 justify-center rounded-full bg-emerald-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-emerald-600/20 transition enabled:hover:-translate-y-0.5 enabled:hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-55 dark:bg-emerald-300 dark:text-slate-950 dark:shadow-emerald-950/25"
            >
              {lesson.status === "completed"
                ? t({ en: "Lesson complete", zh: "課節已完成", zhHans: "课时已完成" })
                : isSavingLessonProgress
                  ? t({ en: "Saving", zh: "正在儲存", zhHans: "正在保存" })
                  : t({ en: "Mark lesson complete", zh: "標記課節完成", zhHans: "标记课时完成" })}
            </button>
          </div>
        </aside>
      ) : null}

      <section ref={lessonPracticeSectionRef} id={lessonPracticeSectionId} data-tour="student-lesson-practice" className="mt-8 scroll-mt-28">
        {lessonPracticeQuestions.length ? (
          <div className="space-y-4">
            <LessonQuestionPager
              allAnswersChecked={allLessonPracticeAnswersChecked}
              answerResults={lessonAnswerResults}
              displayTitle={practiceDisplayTitle}
              lesson={lesson}
              onAnswered={handleLessonQuestionAnswered}
              onCheckAllAnswers={checkAllLessonAnswers}
              onQuestionStarted={startQuestionTimer}
              questions={lessonPracticeQuestions}
            />
            {lessonPracticeSummary?.isComplete ? (
              <div className="glass-panel border-emerald-300/45 bg-emerald-50/80 p-5 dark:bg-emerald-950/20">
                <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-200">
                  {hasPerfectLessonPracticeFinish
                    ? t({ en: "5/5 correct", zh: "5/5 全部正確", zhHans: "5/5 全部正确" })
                    : t({ en: "Lesson practice complete", zh: "課節練習已完成", zhHans: "课时练习已完成" })}
                </p>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
                    {hasPerfectLessonPracticeFinish
                      ? t({
                          en: "Fireworks unlocked. Open the next-step prompt again when you are ready to continue in Practice Arena.",
                          zh: "煙花已解鎖。準備好時，可再次打開下一步提示前往練習場。",
                          zhHans: "烟花已解锁。准备好时，可再次打开下一步提示前往练习场。"
                        })
                      : t({
                          en: `Accuracy ${lessonPracticeSummary.correctCount}/${lessonPracticeSummary.totalQuestions}. Open the summary again to review timing and next steps.`,
                          zh: `準確率 ${lessonPracticeSummary.correctCount}/${lessonPracticeSummary.totalQuestions}。可再次打開摘要重溫時間和下一步。`,
                          zhHans: `准确率 ${lessonPracticeSummary.correctCount}/${lessonPracticeSummary.totalQuestions}。可再次打开摘要重温时间和下一步。`
                        })}
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsSummaryOpen(true)}
                    className="focus-ring inline-flex justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 dark:bg-white dark:text-slate-950"
                  >
                    {hasPerfectLessonPracticeFinish
                      ? t({ en: "View next step", zh: "查看下一步", zhHans: "查看下一步" })
                      : t({ en: "View summary", zh: "查看摘要", zhHans: "查看摘要" })}
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
    </>
  );
  const lessonTeacherGuideSections = canViewTeacherGuide && teacherGuideBlocks.length ? (
    <section
      className="mt-8 grid gap-4"
      aria-label={t({ en: "Teacher guide", zh: "教師使用建議", zhHans: "教师使用建议" })}
    >
      {teacherGuideBlocks.map((block) => {
        const teacherGuideDisplayTitle = lessonPartDisplayByTargetId.get(lessonBlockSectionId(block.id))?.contentTitle ?? text(block.title);

        return (
          <article key={block.id} id={lessonBlockSectionId(block.id)} className="scroll-mt-28 glass-panel border-emerald-300/40 bg-emerald-50/70 p-6 dark:bg-emerald-950/20 sm:p-8">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-emerald-600 dark:text-emerald-200">
              {t({ en: "Teacher guide", zh: "教師使用建議", zhHans: "教师使用建议" })}
            </p>
            <MathText as="h2" text={teacherGuideDisplayTitle} className="mt-2 text-2xl font-black text-slate-950 dark:text-white" />
            {block.content ? (
              <MathText as="p" text={formatLessonMathText(text(block.content))} className="mt-3 text-sm font-semibold leading-7 text-slate-600 dark:text-slate-300" />
            ) : null}
            {block.items?.length ? (
              <ul className="mt-5 space-y-3 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
                {block.items.map((item, index) => (
                  <li key={`${block.id}-${index}`} className="flex gap-3">
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-emerald-400" aria-hidden="true" />
                    <MathText as="span" text={formatLessonMathText(text(item))} />
                  </li>
                ))}
              </ul>
            ) : null}
          </article>
        );
      })}
    </section>
  ) : null;
  const lessonContentPanel = (
    <div className="min-w-0">
      <div className="min-w-0">
        <div className="min-w-0 [&>section:first-child]:mt-0">{lessonContentSections}</div>
        {lessonTeacherGuideSections}
      </div>
    </div>
  );

  return (
    <div
      ref={lessonSelectionRootRef}
      data-lesson-ready="true"
      className={shouldRenderGalaxyDirectory ? "relative isolate w-full py-10 sm:py-12" : "page-container relative isolate py-10 sm:py-12"}
    >
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

      {hasEnteredGalaxyPlanet ? (
        <LessonHeroHeader
          title={lessonDisplayTitle}
        />
      ) : null}

      {shouldRenderGalaxyDirectory ? (
        <div
          id={lessonGalaxySectionId}
          data-lesson-pane-layout="true"
          // The single-column track below `lg` is declared, not implicit. An
          // implicit `auto` track is sized by its content and refuses to shrink
          // below it, so on a phone this grid laid out ~562px wide inside a
          // 393px screen and dragged the whole page into horizontal overflow.
          // `minmax(0,1fr)` lets the column shrink to the viewport instead.
          className={`mt-8 grid scroll-mt-28 grid-cols-[minmax(0,1fr)] gap-6 px-4 sm:px-6 lg:items-stretch lg:gap-8 lg:pl-0 lg:pr-8 xl:pr-10 2xl:pr-12 ${lessonDesktopPaneLayoutClassName} ${
            lessonMenu.isHidden
              ? "lg:grid-cols-[3.5rem_minmax(0,1fr)]"
              : "lg:grid-cols-[minmax(20rem,27rem)_minmax(0,1fr)]"
          } ${prefersReducedMotion ? "" : "lg:transition-[grid-template-columns] lg:ease-out"}`}
          style={prefersReducedMotion ? undefined : { transitionDuration: `${lessonMenuColumnDurationMs}ms` }}
        >
          <div
            ref={lessonDirectoryPaneRef}
            data-lesson-directory-pane="true"
            className={`min-w-0 ${lessonDesktopScrollablePaneClassName}`}
          >
            {lessonMenu.isHidden ? (
              <LessonMenuRail
                onDismissCoachMark={lessonMenu.dismissCoachMark}
                onShow={lessonMenu.showMenu}
                showCoachMark={lessonMenu.showCoachMark}
                theme={lessonWorldTheme}
              />
            ) : (
              <AnimatePresence initial={false}>
                <motion.div
                  ref={lessonMenu.menuPanelRef}
                  id={lessonMenuPanelId}
                  data-tour="student-lesson-map"
                  className="origin-top-right"
                  initial={prefersReducedMotion ? false : { opacity: 0, y: -12 }}
                  animate={isGalaxyDirectoryClosing
                    ? { filter: "blur(8px)", opacity: 0, scale: 0.08, y: -42 }
                    : lessonMenu.isCollapsing
                      ? { filter: "blur(2px)", opacity: 0, x: -28 }
                      : { filter: "blur(0px)", opacity: 1, x: 0, y: 0 }}
                  transition={{
                    duration: isGalaxyDirectoryClosing
                      ? lessonGalaxyCollapseDurationMs / 1000
                      : lessonMenu.isCollapsing
                        ? lessonMenu.collapseDurationMs / 1000
                        : 0.24,
                    ease: isGalaxyDirectoryClosing ? [0.22, 1, 0.36, 1] : "easeOut"
                  }}
                  style={{ transformOrigin: "calc(100% - 8rem) -4.25rem" }}
                  {...lessonMenu.menuHoldHandlers}
                >
                  <WorldMenu
                    currentSlug={slug}
                    items={lessonGalaxyItems}
                    lesson={lesson}
                    modules={lessonModules}
                    onHide={lessonMenu.hideMenu}
                    onSelectLessonItem={handleLessonItemSelect}
                  />
                </motion.div>
              </AnimatePresence>
            )}
          </div>
          <div
            ref={lessonContentPaneRef}
            data-lesson-content-pane="true"
            className={`min-w-0 lg:w-full ${lessonDesktopScrollablePaneClassName}`}
          >
            {lessonContentPanel}
          </div>
        </div>
      ) : null}

      {shouldRenderGalaxyDirectory && lessonMenu.isHidden ? (
        <LessonMenuRevealPill onShow={lessonMenu.showMenu} theme={lessonWorldTheme} />
      ) : null}

      {!shouldRenderGalaxyDirectory ? (
        <>
          {lessonContentSections}
          {lessonTeacherGuideSections}
        </>
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
                    {hasPerfectLessonPracticeFinish
                      ? t({ en: "Fireworks unlocked", zh: "煙花已解鎖", zhHans: "烟花已解锁" })
                      : t({ en: "Lesson summary", zh: "課節摘要", zhHans: "课时摘要" })}
                  </p>
                  <h2 id="lesson-summary-title" className="mt-2 text-3xl font-black text-slate-950 dark:text-white">
                    {hasPerfectLessonPracticeFinish
                      ? t({ en: "5/5 correct - keep going in Practice Arena", zh: "5/5 全部正確，前往練習場繼續", zhHans: "5/5 全部正确，前往练习场继续" })
                      : t({ en: "Practice round complete", zh: "本輪練習完成", zhHans: "本轮练习完成" })}
                  </h2>
                  <p id="lesson-summary-description" className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
                    {hasPerfectLessonPracticeFinish
                      ? t({
                          en: "Excellent work. You answered all five Lesson questions correctly. Head to Practice Arena to lock in this method with more adaptive practice.",
                          zh: "做得非常好。你已答對本課節 5 道題目。可以前往練習場，用更多適性題目把方法練穩。",
                          zhHans: "做得非常好。你已答对本课时 5 道题目。可以前往练习场，用更多适性题目把方法练稳。"
                        })
                      : t(lessonSummaryEncouragement(lessonPracticeSummary.accuracyPercent))}
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
                      {hasPerfectLessonPracticeFinish
                        ? t({
                            en: "All five Lesson questions were correct. Practice Arena is ready for the next stretch.",
                            zh: "本課節 5 道題目全部答對。練習場已準備好下一輪延伸練習。",
                            zhHans: "本课时 5 道题目全部答对。练习场已准备好下一轮延伸练习。"
                          })
                        : t({
                            en: "Everything checked in this lesson round was correct. Use Practice Arena for spaced practice and challenge items.",
                            zh: "本輪課節練習全部答對。可到練習場做間隔重溫和挑戰題。",
                            zhHans: "本轮课时练习全部答对。可到练习场做间隔重温和挑战题。"
                          })}
                    </p>
                  )}
                </section>

                <section className="rounded-2xl border border-cyan-300/45 bg-cyan-50/80 p-4 dark:border-cyan-300/25 dark:bg-cyan-950/20">
                  <h3 className="text-base font-black text-slate-950 dark:text-white">
                    {hasPerfectLessonPracticeFinish
                      ? t({ en: "Continue practice", zh: "繼續練習", zhHans: "继续练习" })
                      : t({ en: "Next step", zh: "下一步", zhHans: "下一步" })}
                  </h3>
                  <p className="mt-3 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
                    {hasPerfectLessonPracticeFinish
                      ? t({
                          en: "Practice Arena will keep the same lesson context and give you more questions for fluency, speed, and confidence.",
                          zh: "練習場會保留同一課節脈絡，提供更多題目，幫你提升熟練度、速度和信心。",
                          zhHans: "练习场会保留同一课时脉络，提供更多题目，帮你提升熟练度、速度和信心。"
                        })
                      : t({
                          en: "When you are ready, visit Practice Arena to strengthen this topic with adaptive questions. Missed items are also ready for Mistake Book review.",
                          zh: "準備好時，可以到練習場用適性題目鞏固這個課題。答錯的題目亦可到錯題集重溫。",
                          zhHans: "准备好时，可以到练习场用适性题目巩固这个课题。答错的题目也可到错题集重温。"
                        })}
                  </p>
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row lg:flex-col">
                    <Link
                      href={practiceArenaHref}
                      className="focus-ring inline-flex justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 dark:bg-white dark:text-slate-950"
                    >
                      {t({ en: "Go to Practice Arena", zh: "前往練習場", zhHans: "前往练习场" })}
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
