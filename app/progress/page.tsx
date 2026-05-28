"use client";

import { useEffect, useState } from "react";
import { motion } from "@/components/ui/Motion";
import { ProgressCard } from "@/components/cards/ProgressCard";
import { dictionary, useSettings } from "@/components/providers/AppProviders";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { formatDayLabel } from "@/lib/i18n";
import type { ProgressData } from "@/types";

type ProgressResponse = {
  progress?: ProgressData;
};

export default function ProgressPage() {
  const { language, selectedGrade, t, text } = useSettings();
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const progressMetrics = progress?.progressMetrics ?? [];
  const weeklyActivity = progress?.weeklyActivity ?? [];
  const masteryAreas = progress?.masteryAreas ?? [];
  const maxMinutes = Math.max(...weeklyActivity.map((day) => day.minutes), 1);
  const totalMinutes = progress?.totalMinutes ?? 0;
  const copy = {
    eyebrow: { en: "Live analytics", zh: "即時學習分析" },
    weeklyTitle: { en: "Weekly learning activity", zh: "每週學習活動" },
    minutesStudied: { en: "Minutes studied", zh: "學習分鐘" },
    masteryMap: { en: "Mastery map", zh: "掌握度地圖" },
    skillAreas: { en: "Skill areas", zh: "技能範圍" },
    dataSource: {
      en: "Aggregated from attempts, lesson progress, visualization sessions, and learning events.",
      zh: "由作答紀錄、課節進度、視覺化使用和學習事件聚合而成。"
    },
    loading: { en: "Loading progress data...", zh: "正在載入學習進度..." },
    unavailable: { en: "Progress data is unavailable right now.", zh: "暫時無法載入學習進度。" }
  };

  useEffect(() => {
    let cancelled = false;

    async function loadProgress() {
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
  }, [selectedGrade]);

  return (
    <div className="page-container py-10 sm:py-12">
      <SectionHeader title={t(dictionary.pages.progressTitle)} description={t(dictionary.pages.progressDesc)} eyebrow={t(copy.eyebrow)} />

      {hasError ? (
        <div className="mt-6 rounded-2xl border border-amber-300/60 bg-amber-400/10 px-4 py-3 text-sm font-semibold text-amber-700 dark:text-amber-100">
          {t(copy.unavailable)}
        </div>
      ) : null}
      {progress?.contentUnavailable ? (
        <div className="mt-6 rounded-2xl border border-amber-300/60 bg-amber-400/10 px-4 py-3 text-sm font-semibold text-amber-700 dark:text-amber-100">
          {t(progress.contentUnavailable)}
        </div>
      ) : null}

      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {progressMetrics.length
          ? progressMetrics.map((metric, index) => <ProgressCard key={text(metric.label)} metric={metric} index={index} />)
          : Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="glass-panel min-h-40 animate-pulse p-5">
                <div className="h-4 w-32 rounded-full bg-slate-200 dark:bg-white/10" />
                <div className="mt-5 h-10 w-20 rounded-full bg-slate-200 dark:bg-white/10" />
                <div className="mt-4 h-3 w-full rounded-full bg-slate-200 dark:bg-white/10" />
              </div>
            ))}
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_420px]">
        <div className="glass-panel p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-cyan-500 dark:text-cyan-300">{t(copy.weeklyTitle)}</p>
              <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{t(copy.minutesStudied)}</h2>
            </div>
            <span className="rounded-full bg-cyan-500/15 px-3 py-1 text-sm font-bold text-cyan-600 dark:text-cyan-300">{totalMinutes} {t(dictionary.common.minutes)}</span>
          </div>
          <div className="mt-8 grid h-80 grid-cols-7 items-end gap-3 rounded-3xl border border-slate-200/70 bg-white/60 p-4 dark:border-white/10 dark:bg-slate-950/50">
            {weeklyActivity.length ? (
              weeklyActivity.map((day) => (
                <div key={day.day} className="flex h-full flex-col justify-end gap-2 text-center">
                  <motion.div
                    className="rounded-t-2xl bg-gradient-to-t from-cyan-400 via-violet-400 to-fuchsia-400 shadow-glow"
                    initial={{ height: 0 }}
                    whileInView={{ height: `${(day.minutes / maxMinutes) * 100}%` }}
                    viewport={{ once: true }}
                    transition={{ type: "spring", stiffness: 120, damping: 18 }}
                  />
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{formatDayLabel(day.day, language)}</span>
                  <span className="text-[11px] font-semibold text-slate-400">{day.minutes}</span>
                </div>
              ))
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
      </section>
    </div>
  );
}
