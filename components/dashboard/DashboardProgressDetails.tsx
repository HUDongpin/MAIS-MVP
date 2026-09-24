"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "@/components/ui/Motion";
import { dictionary, useSettings } from "@/components/providers/AppProviders";
import { formatDayLabel, formatDifficultyLabel, formatGradeLabel, localeForLanguage } from "@/lib/i18n";
import { lessonHrefForTopicId } from "@/lib/lessonLinks";
import type { Language, ProgressData } from "@/types";

type ProgressResponse = {
  progress?: ProgressData;
};

function formatActivityTime(value: string, language: Language) {
  return new Intl.DateTimeFormat(localeForLanguage(language), {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function activityBarHeight(minutes: number, maxMinutes: number) {
  if (minutes <= 0) return 16;
  return Math.max((minutes / maxMinutes) * 100, 18);
}

export function DashboardProgressDetails() {
  const { currentUser, language, selectedGrade, settingsReady, t, text } = useSettings();
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const weeklyActivity = progress?.weeklyActivity ?? [];
  const masteryAreas = progress?.masteryAreas ?? [];
  const weakTopics = progress?.weakTopics ?? [];
  const recentActivity = progress?.recentActivity ?? [];
  const maxMinutes = Math.max(...weeklyActivity.map((day) => day.minutes), 1);
  const totalMinutes = progress?.totalMinutes ?? 0;
  const copy = {
    weeklyTitle: { en: "Weekly learning activity", zh: "每週學習活動", zhHans: "每周学习活动" },
    minutesStudied: { en: "Minutes studied", zh: "學習分鐘", zhHans: "学习分钟" },
    masteryMap: { en: "Mastery map", zh: "掌握度地圖", zhHans: "掌握度地图" },
    skillAreas: { en: "Skill areas", zh: "技能範圍", zhHans: "技能范围" },
    weakTitle: { en: "Weak topics", zh: "薄弱主題", zhHans: "薄弱主题" },
    weakDesc: { en: "Topics with low mastery or active mistakes.", zh: "掌握度較低或仍有錯題的主題。", zhHans: "掌握度较低或仍有错题的主题。" },
    recentTitle: { en: "Recent activity", zh: "最近活動", zhHans: "最近活动" },
    recentDesc: { en: "Attempts, lesson progress, and learning events for this grade.", zh: "此年級的作答、課節進度和學習事件。", zhHans: "此年级的作答、课时进度和学习事件。" },
    noWeak: { en: "No weak topics flagged for this grade yet.", zh: "此年級暫未標記薄弱主題。", zhHans: "此年级暂未标记薄弱主题。" },
    noRecent: { en: "Recent activity will appear after lessons, practice, or visualizations.", zh: "完成課節、練習或視覺化後會顯示最近活動。", zhHans: "完成课时、练习或可视化后会显示最近活动。" },
    dataSource: {
      en: "Aggregated from attempts, lesson progress, visualization sessions, and learning events.",
      zh: "由作答紀錄、課節進度、視覺化使用和學習事件聚合而成。", zhHans: "由作答纪录、课时进度、可视化使用和学习事件聚合而成。"
    },
    loading: { en: "Loading progress data...", zh: "正在載入學習進度...", zhHans: "正在载入学习进度..." },
    unavailable: { en: "Progress data is unavailable right now.", zh: "暫時無法載入學習進度。", zhHans: "暂时无法载入学习进度。" }
  };

  useEffect(() => {
    let cancelled = false;

    async function loadProgress() {
      if (!settingsReady) return;

      if (!currentUser) {
        setProgress(null);
        setHasError(false);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setHasError(false);

      try {
        const response = await fetch(`/api/progress?grade=${selectedGrade}&window=7d`, { cache: "no-store" });
        if (!response.ok) throw new Error("Could not load progress data.");
        const body = (await response.json()) as ProgressResponse;
        if (!cancelled) setProgress(body.progress ?? null);
      } catch {
        if (!cancelled) setHasError(true);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadProgress();

    return () => {
      cancelled = true;
    };
  }, [currentUser, selectedGrade, settingsReady]);

  useEffect(() => {
    let timeoutId: number | undefined;

    const scrollToProgressInsights = () => {
      if (window.location.hash !== "#progress-insights") return;
      const scroll = () => document.getElementById("progress-insights")?.scrollIntoView({ block: "start" });
      window.requestAnimationFrame(scroll);
      timeoutId = window.setTimeout(scroll, 150);
    };

    scrollToProgressInsights();
    window.addEventListener("hashchange", scrollToProgressInsights);

    return () => {
      window.removeEventListener("hashchange", scrollToProgressInsights);
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, []);

  return (
    <section id="progress-insights" className="mt-10 scroll-mt-24">
      {hasError ? (
        <div className="mb-6 rounded-2xl border border-amber-300/60 bg-amber-400/10 px-4 py-3 text-sm font-semibold text-amber-700 dark:text-amber-100">
          {t(copy.unavailable)}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <div className="glass-panel p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-cyan-500 dark:text-cyan-300">{t(copy.weeklyTitle)}</p>
              <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{t(copy.minutesStudied)}</h2>
            </div>
            <span className="rounded-full bg-cyan-500/15 px-3 py-1 text-sm font-bold text-cyan-600 dark:text-cyan-300">{totalMinutes} {t(dictionary.common.minutes)}</span>
          </div>
          <div className="mt-8 grid h-80 grid-cols-7 items-stretch gap-3 rounded-3xl border border-slate-200/70 bg-white/60 p-4 dark:border-white/10 dark:bg-slate-950/50">
            {weeklyActivity.length ? (
              weeklyActivity.map((day) => {
                const minuteLabel = `${day.minutes} ${t(dictionary.common.minutes)}`;
                const dayLabel = formatDayLabel(day.day, language);

                return (
                  <div key={day.day} className="grid h-full min-w-0 grid-rows-[1fr_auto] gap-2 text-center">
                    <div className="flex min-h-0 w-full items-end">
                      <motion.div
                        aria-label={`${dayLabel}: ${minuteLabel}`}
                        title={minuteLabel}
                        className={`flex w-full items-start justify-center overflow-hidden rounded-t-2xl px-1 py-2 ${
                          day.minutes > 0
                            ? "bg-gradient-to-t from-cyan-400 via-violet-400 to-fuchsia-400 shadow-glow"
                            : "border border-slate-200/80 bg-slate-100 shadow-none dark:border-white/10 dark:bg-white/[0.08]"
                        }`}
                        initial={{ height: 0 }}
                        whileInView={{ height: `${activityBarHeight(day.minutes, maxMinutes)}%` }}
                        viewport={{ once: true }}
                        transition={{ type: "spring", stiffness: 120, damping: 18 }}
                      >
                        <span
                          className={`max-w-full text-[10px] font-black leading-tight sm:text-xs ${
                            day.minutes > 0 ? "text-white drop-shadow" : "text-slate-500 dark:text-slate-300"
                          }`}
                        >
                          <span>{day.minutes}</span>
                          <span className="block text-[9px] leading-tight sm:inline sm:text-[10px]"> {t(dictionary.common.minutes)}</span>
                        </span>
                      </motion.div>
                    </div>
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{dayLabel}</span>
                  </div>
                );
              })
            ) : (
              <div className="col-span-7 flex h-full items-center justify-center text-sm font-semibold text-slate-500 dark:text-slate-400">
                {isLoading ? t(copy.loading) : t(copy.unavailable)}
              </div>
            )}
          </div>
        </div>

        <aside className="glass-panel p-5 sm:p-6">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-cyan-500 dark:text-cyan-300">{t(copy.masteryMap)}</p>
          <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{t(copy.skillAreas)}</h2>
          <div className="mt-6 space-y-5">
            {masteryAreas.length ? (
              masteryAreas.map((area) => (
                <div key={text(area.label)}>
                  <div className="mb-2 flex items-center justify-between gap-3 text-sm font-bold">
                    <span className="text-slate-700 dark:text-slate-200">{text(area.label)}</span>
                    <span className="text-slate-500 dark:text-slate-400">{area.value}%</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-500"
                      initial={{ width: 0 }}
                      whileInView={{ width: `${area.value}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.7 }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-slate-200/70 bg-white/55 p-4 text-sm font-semibold text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400">
                {isLoading ? t(copy.loading) : t(copy.unavailable)}
              </div>
            )}
          </div>
          <div className="mt-6 rounded-2xl bg-violet-500/10 p-4 text-sm leading-6 text-violet-700 dark:text-violet-200">
            {t(copy.dataSource)}
          </div>
        </aside>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="glass-panel p-5 sm:p-6">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-cyan-500 dark:text-cyan-300">{t(copy.weakTitle)}</p>
          <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{formatGradeLabel(selectedGrade, language, true)}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{t(copy.weakDesc)}</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {weakTopics.map((topic) => (
              <Link
                key={topic.id}
                href={lessonHrefForTopicId(topic.id)}
                className="focus-ring rounded-2xl border border-slate-200/70 bg-white/65 p-4 transition hover:-translate-y-0.5 dark:border-white/10 dark:bg-white/[0.055]"
              >
                <p className="text-sm font-black text-slate-950 dark:text-white">{text(topic.title)}</p>
                <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">
                  {formatDifficultyLabel(topic.difficulty, language)} · {topic.mastery}% {t(dictionary.common.mastery)}
                </p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                  <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-rose-500" style={{ width: `${topic.mastery}%` }} />
                </div>
              </Link>
            ))}
          </div>
          {!weakTopics.length ? (
            <p className="mt-5 rounded-2xl border border-slate-200/70 bg-white/55 p-4 text-sm font-semibold text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400">
              {isLoading ? t(copy.loading) : t(copy.noWeak)}
            </p>
          ) : null}
        </div>

        <div className="glass-panel p-5 sm:p-6">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-cyan-500 dark:text-cyan-300">{t(copy.recentTitle)}</p>
          <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{t(dictionary.dashboard.recent)}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{t(copy.recentDesc)}</p>
          <div className="mt-5 space-y-3">
            {recentActivity.map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-200/70 bg-white/65 p-4 dark:border-white/10 dark:bg-white/[0.055]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-slate-950 dark:text-white">{text(item.title)}</p>
                    <p className="mt-1 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">{text(item.detail)}</p>
                  </div>
                  <span className="rounded-full bg-cyan-500/15 px-3 py-1 text-xs font-bold text-cyan-700 dark:text-cyan-200">
                    {formatActivityTime(item.timestamp, language)}
                  </span>
                </div>
              </div>
            ))}
          </div>
          {!recentActivity.length ? (
            <p className="mt-5 rounded-2xl border border-slate-200/70 bg-white/55 p-4 text-sm font-semibold text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400">
              {isLoading ? t(copy.loading) : t(copy.noRecent)}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
