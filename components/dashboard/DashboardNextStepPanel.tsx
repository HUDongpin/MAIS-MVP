"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSettings } from "@/components/providers/AppProviders";
import { lessonHrefForSlug, lessonHrefForTopicId } from "@/lib/lessonLinks";
import { studentRoadmapPath } from "@/lib/roadmapRoutes";
import type { AdaptiveActionType, AdaptiveLearningDecision, LocalizedText } from "@/types";

function readDecision(value: unknown) {
  const response = value as { decision?: unknown } | null;
  const decision = response?.decision as Partial<AdaptiveLearningDecision> | undefined;
  if (
    typeof decision?.action !== "string" ||
    typeof decision.skill?.id !== "string" ||
    typeof decision.topic?.id !== "string" ||
    !Array.isArray(decision.dueReviews)
  ) {
    return null;
  }

  return decision as AdaptiveLearningDecision;
}

function isLocalizedText(value: unknown): value is LocalizedText {
  const record = value as Partial<LocalizedText> | null;
  return typeof record?.en === "string" && typeof record.zh === "string";
}

function readContentUnavailable(value: unknown) {
  const response = value as { reason?: unknown; contentUnavailable?: unknown } | null;
  if (response?.reason !== "content-unavailable" || !isLocalizedText(response.contentUnavailable)) return null;
  return response.contentUnavailable;
}

const adaptiveActionLabels: Record<AdaptiveActionType, LocalizedText> = {
  review: { en: "Review", zh: "複習", zhHans: "复习" },
  repair: { en: "Repair a gap", zh: "修補弱項", zhHans: "修补弱项" },
  practice: { en: "Practice", zh: "練習", zhHans: "练习" },
  lesson: { en: "New lesson", zh: "新課時", zhHans: "新课时" },
  challenge: { en: "Challenge", zh: "挑戰", zhHans: "挑战" }
};

const adaptiveActionReasons: Record<AdaptiveActionType, LocalizedText> = {
  review: {
    en: "This skill is due for spaced review, so a short revisit keeps it secure.",
    zh: "這項技能已到間隔複習時間，短暫重溫可以保持穩固。",
    zhHans: "这项技能已到间隔复习时间，短暂重温可以保持稳固。"
  },
  repair: {
    en: "Recent attempts show a gap here, so this step rebuilds the idea first.",
    zh: "最近的作答顯示這裡有落差，這一步會先重建概念。",
    zhHans: "最近的作答显示这里有落差，这一步会先重建概念。"
  },
  practice: {
    en: "You are close to mastery here, so focused practice locks it in.",
    zh: "你在這裡接近掌握，集中練習可以鞏固成果。",
    zhHans: "你在这里接近掌握，集中练习可以巩固成果。"
  },
  lesson: {
    en: "Your prerequisites are ready, so this new lesson is the next step.",
    zh: "你的先備知識已準備好，這節新課時就是下一步。",
    zhHans: "你的先备知识已准备好，这节新课时就是下一步。"
  },
  challenge: {
    en: "This skill is secure, so a harder challenge extends it.",
    zh: "這項技能已穩固，更高難度的挑戰可以再進一步。",
    zhHans: "这项技能已稳固，更高难度的挑战可以再进一步。"
  }
};

const panelHeadingId = "dashboard-next-step-heading";
const primaryActionClassName = "focus-ring inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 dark:bg-white dark:text-slate-950";
const secondaryActionClassName = "focus-ring inline-flex items-center justify-center rounded-full border border-cyan-200/80 bg-cyan-50 px-5 py-3 text-sm font-black text-cyan-800 transition hover:-translate-y-0.5 dark:border-cyan-200/25 dark:bg-cyan-300/[0.12] dark:text-cyan-100";

export function DashboardNextStepPanel() {
  const { currentUser, selectedGrade, settingsReady, t, text } = useSettings();
  const [decision, setDecision] = useState<AdaptiveLearningDecision | null>(null);
  const [contentUnavailable, setContentUnavailable] = useState<LocalizedText | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const currentUserRequestKey = currentUser ? `${currentUser.id}:${currentUser.role}` : "";

  useEffect(() => {
    if (!settingsReady) return;

    const controller = new AbortController();

    async function loadDecision() {
      if (!currentUser || currentUser.role !== "student") {
        setDecision(null);
        setContentUnavailable(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const response = await fetch(`/api/adaptive-learning/next?grade=${selectedGrade}`, {
          cache: "no-store",
          signal: controller.signal
        });
        const payload = await response.json().catch(() => null) as unknown;
        const unavailable = readContentUnavailable(payload);
        setContentUnavailable(unavailable);
        setDecision(unavailable ? null : readDecision(payload));
      } catch {
        if (!controller.signal.aborted) {
          setDecision(null);
          setContentUnavailable(null);
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    loadDecision();

    return () => controller.abort();
  }, [currentUserRequestKey, selectedGrade, settingsReady]);

  if (!currentUser || currentUser.role !== "student") return null;

  const lessonHref = decision
    ? decision.lesson
      ? lessonHrefForSlug(decision.lesson.slug)
      : lessonHrefForTopicId(decision.topic.id)
    : "";
  const dueReviewCount = decision?.dueReviews.length ?? 0;

  return (
    <section className="glass-panel mt-6 p-5 sm:p-6" aria-labelledby={panelHeadingId}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-300">
            {t({ en: "Made for you", zh: "為你而設", zhHans: "为你而设" })}
          </p>
          <h2 id={panelHeadingId} className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
            {t({ en: "Recommended next step", zh: "建議下一步", zhHans: "建议下一步" })}
          </h2>
        </div>
        <Link href="/personalized-learning" className={secondaryActionClassName}>
          {t({ en: "Open personalized learning", zh: "開啟個人化學習", zhHans: "打开个性化学习" })}
        </Link>
      </div>

      {isLoading ? (
        <p className="mt-5 rounded-3xl border border-slate-200/70 bg-white/70 px-5 py-4 text-sm font-bold text-slate-600 dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-300">
          {t({ en: "Reading your recent work to pick the next step.", zh: "正在讀取你的近期作答以挑選下一步。", zhHans: "正在读取你的近期作答以挑选下一步。" })}
        </p>
      ) : contentUnavailable ? (
        <p className="mt-5 rounded-3xl border border-amber-300/55 bg-amber-400/10 px-5 py-4 text-sm font-bold text-amber-800 dark:text-amber-100">
          {text(contentUnavailable)}
        </p>
      ) : decision ? (
        <div className="mt-5 grid gap-4 rounded-3xl border border-cyan-200/70 bg-cyan-50/60 p-5 dark:border-cyan-200/20 dark:bg-cyan-300/[0.08] lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-cyan-200/80 bg-white/85 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-cyan-800 dark:border-cyan-200/30 dark:bg-white/10 dark:text-cyan-100">
                {t(adaptiveActionLabels[decision.action])}
              </span>
              <span className="text-xs font-black text-slate-600 dark:text-slate-300">{text(decision.topic.title)}</span>
            </div>
            <p className="mt-3 break-words text-xl font-black text-slate-950 [overflow-wrap:anywhere] dark:text-white">
              {text(decision.skill.title)}
            </p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              {decision.explanation ? text(decision.explanation) : t(adaptiveActionReasons[decision.action])}
            </p>
            {dueReviewCount ? (
              <p className="mt-3 text-xs font-black uppercase tracking-[0.12em] text-cyan-700 dark:text-cyan-200">
                {t({
                  en: `${dueReviewCount} skill${dueReviewCount === 1 ? "" : "s"} ready for review`,
                  zh: `${dueReviewCount} 項技能可以複習`,
                  zhHans: `${dueReviewCount} 项技能可以复习`
                })}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <Link href={lessonHref} className={primaryActionClassName}>
              {t({ en: "Start this step", zh: "開始這一步", zhHans: "开始这一步" })}
            </Link>
            <Link href="/practice" data-tour="student-practice" className={secondaryActionClassName}>
              {t({ en: "Practice instead", zh: "改為練習", zhHans: "改为练习" })}
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-5 grid gap-3 rounded-3xl border border-dashed border-cyan-300/70 bg-cyan-50/60 px-5 py-6 dark:border-cyan-200/25 dark:bg-cyan-300/[0.08]">
          <p className="text-base font-black text-slate-950 dark:text-white">
            {t({ en: "No recommendation yet", zh: "暫時未有建議", zhHans: "暂时未有建议" })}
          </p>
          <p className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            {t({
              en: "Finish a lesson or a few practice questions and your personalized next step appears here.",
              zh: "完成一節課時或幾道練習題後，這裡就會顯示你的個人化下一步。",
              zhHans: "完成一节课时或几道练习题后，这里就会显示你的个性化下一步。"
            })}
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href="/practice" data-tour="student-practice" className={primaryActionClassName}>
              {t({ en: "Open practice", zh: "開啟練習場", zhHans: "打开练习场" })}
            </Link>
            <Link href={studentRoadmapPath} className={secondaryActionClassName}>
              {t({ en: "See learning roadmap", zh: "查看學習路線圖", zhHans: "查看学习路线图" })}
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
