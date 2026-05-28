"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DashboardGradeSelectorGrid } from "@/components/dashboard/DashboardGradeSelectorGrid";
import { StudentProfilePanel } from "@/components/dashboard/StudentProfilePanel";
import { StudentRewardsPanel } from "@/components/dashboard/StudentRewardsPanel";
import { StudentMotivationHub } from "@/components/gamification/StudentMotivationHub";
import { dictionary, useSettings } from "@/components/providers/AppProviders";
import { curriculumProfileLabel } from "@/lib/curriculumProfile";
import { formatGradeLabelForCurriculum, formatLearnerName, isChineseLanguage, simplifyChineseText } from "@/lib/i18n";
import type { DashboardData } from "@/types";

function readDashboard(value: unknown) {
  const response = value as { dashboard?: unknown } | null;
  return (response?.dashboard ?? null) as DashboardData | null;
}

export default function DashboardPage() {
  const { currentUser, language, selectedGrade, t } = useSettings();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const selectedGradeLabel = formatGradeLabelForCurriculum(selectedGrade, language, currentUser?.curriculumTrack ?? "HK", true);
  const courseName = currentUser ? t(curriculumProfileLabel(currentUser.curriculumProfile)) : "";
  const welcome = currentUser
    ? isChineseLanguage(language)
      ? simplifyChineseText(`歡迎回來，${formatLearnerName(currentUser.name, language)}`, language)
      : `Welcome back, ${formatLearnerName(currentUser.name, language)}`
    : t(dictionary.dashboard.welcome);
  const loadErrorCopy = t({ en: "Could not load dashboard data.", zh: "暫時無法載入學生儀表板資料。" });

  useEffect(() => {
    const controller = new AbortController();

    async function loadDashboard() {
      setIsLoading(true);
      setLoadError("");

      try {
        const response = await fetch(`/api/dashboard?grade=${selectedGrade}`, {
          cache: "no-store",
          signal: controller.signal
        });
        const nextDashboard = readDashboard(await response.json());
        if (!response.ok || !nextDashboard) throw new Error(loadErrorCopy);
        setDashboard(nextDashboard);
      } catch (error) {
        if (!controller.signal.aborted) {
          setDashboard(null);
          setLoadError(error instanceof Error ? error.message : loadErrorCopy);
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    loadDashboard();

    return () => controller.abort();
  }, [loadErrorCopy, selectedGrade]);

  return (
    <div className="page-container py-10 sm:py-12">
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="glass-panel flex h-full flex-col justify-between gap-8 overflow-hidden p-6 sm:p-8">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.24em] text-cyan-500 dark:text-cyan-300">
                {isChineseLanguage(language)
                  ? `${selectedGradeLabel} · ${t(dictionary.dashboard.streak)} ${dashboard?.streakDays ?? 0}${t(dictionary.common.days)}`
                  : `${selectedGradeLabel} · ${t(dictionary.dashboard.streak)} ${dashboard?.streakDays ?? 0} ${t(dictionary.common.days)}`}
              </p>
              <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl">{welcome}</h1>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">{t(dictionary.dashboard.summary)}</p>
              {currentUser ? (
                <div className="mt-8 max-w-2xl rounded-3xl border border-cyan-200/70 bg-cyan-50/70 px-5 py-4 shadow-sm dark:border-cyan-300/15 dark:bg-cyan-300/[0.08]">
                  <p className="text-sm font-bold uppercase tracking-[0.22em] text-cyan-600 dark:text-cyan-300">
                    {t({ en: "Learning course", zh: "學習課程", zhHans: "学习课程" })}
                  </p>
                  <p className="mt-2 break-words text-2xl font-black text-slate-950 [overflow-wrap:anywhere] dark:text-white">
                    {courseName}
                  </p>
                </div>
              ) : null}
              {isLoading ? <p className="mt-3 text-sm font-bold text-cyan-600 dark:text-cyan-300">{t(dictionary.dashboard.loading)}</p> : null}
              {loadError ? <p className="mt-3 text-sm font-bold text-rose-700 dark:text-rose-200">{loadError}</p> : null}
              {dashboard?.contentUnavailable ? (
                <p className="mt-4 rounded-2xl border border-amber-300/55 bg-amber-400/10 px-4 py-3 text-sm font-bold text-amber-800 dark:text-amber-100">
                  {t(dashboard.contentUnavailable)}
                </p>
              ) : null}
            </div>
            <div className="grid h-36 w-36 place-items-center rounded-full border border-cyan-400/30 bg-cyan-400/10 shadow-glow">
              <div className="text-center">
                <p className="text-4xl font-black gradient-text">{dashboard?.overallMastery ?? 0}%</p>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{t(dictionary.common.overall)}</p>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200/70 pt-6 dark:border-white/10">
            <div className="grid gap-5 xl:grid-cols-[minmax(16rem,0.32fr)_1fr] xl:items-start">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.22em] text-cyan-500 dark:text-cyan-300">
                  {t(currentUser?.role === "student" ? { en: "Learning grade", zh: "學習年級" } : { en: "Choose learning grade", zh: "選擇學習年級" })}
                </p>
                <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{selectedGradeLabel}</p>
              </div>
              <DashboardGradeSelectorGrid />
            </div>
          </div>
        </section>

        <aside className="glass-panel p-5">
          <StudentProfilePanel />
          <div className="mt-5 grid gap-2">
            <Link href="/messages" className="focus-ring rounded-full border border-slate-200/80 bg-white/75 px-4 py-2 text-center text-sm font-black text-slate-700 transition hover:-translate-y-0.5 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200">
              {t({ en: "Messages", zh: "私信" })}
            </Link>
            <Link href="/classroom/join" className="focus-ring rounded-full border border-slate-200/80 bg-white/75 px-4 py-2 text-center text-sm font-black text-slate-700 transition hover:-translate-y-0.5 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200">
              {t({ en: "Join class", zh: "加入班級" })}
            </Link>
          </div>
        </aside>
      </div>

      <StudentMotivationHub />
      <StudentRewardsPanel />
    </div>
  );
}
