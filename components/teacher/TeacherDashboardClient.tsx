"use client";

import { useEffect, useState } from "react";
import { useSettings } from "@/components/providers/AppProviders";
import type { TeacherDashboardData } from "@/types";
import { TeacherDashboardView } from "./TeacherDashboardView";

function readDashboard(value: unknown) {
  const response = value as { dashboard?: unknown } | null;
  return (response?.dashboard ?? null) as TeacherDashboardData | null;
}

function TeacherDashboardSkeleton() {
  return (
    <div className="grid gap-7" aria-busy="true">
      <section className="glass-panel p-6 sm:p-8">
        <div className="h-4 w-40 rounded-full bg-cyan-300/30 dark:bg-cyan-200/15" />
        <div className="mt-5 h-12 max-w-2xl rounded-2xl bg-slate-200/80 dark:bg-white/10" />
        <div className="mt-4 h-5 max-w-3xl rounded-full bg-slate-200/70 dark:bg-white/10" />
      </section>
      <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="glass-panel min-h-[196px] p-5">
            <div className="h-4 w-28 rounded-full bg-slate-200/80 dark:bg-white/10" />
            <div className="mt-5 h-7 rounded-xl bg-slate-200/80 dark:bg-white/10" />
            <div className="mt-3 h-16 rounded-xl bg-slate-200/70 dark:bg-white/10" />
          </div>
        ))}
      </section>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="glass-panel p-5">
            <div className="h-4 w-24 rounded-full bg-slate-200/80 dark:bg-white/10" />
            <div className="mt-4 h-10 w-20 rounded-xl bg-cyan-300/25 dark:bg-cyan-200/15" />
            <div className="mt-3 h-12 rounded-xl bg-slate-200/70 dark:bg-white/10" />
          </div>
        ))}
      </section>
    </div>
  );
}

export function TeacherDashboardClient() {
  const { t } = useSettings();
  const [dashboard, setDashboard] = useState<TeacherDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const errorCopy = t({ en: "Could not load teacher dashboard data.", zh: "暫時無法載入教師儀表板資料。" });

  useEffect(() => {
    const controller = new AbortController();

    async function loadDashboard() {
      setIsLoading(true);
      setLoadError("");

      try {
        const response = await fetch("/api/teacher/dashboard", {
          cache: "no-store",
          signal: controller.signal
        });
        const nextDashboard = readDashboard(await response.json());
        if (!response.ok || !nextDashboard) throw new Error(errorCopy);
        setDashboard(nextDashboard);
      } catch (error) {
        if (!controller.signal.aborted) {
          setDashboard(null);
          setLoadError(error instanceof Error ? error.message : errorCopy);
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    loadDashboard();

    return () => controller.abort();
  }, [errorCopy, reloadKey]);

  if (dashboard) return <TeacherDashboardView dashboard={dashboard} />;

  if (isLoading) return <TeacherDashboardSkeleton />;

  return (
    <section className="glass-panel p-6 sm:p-8">
      <p role="alert" className="rounded-2xl border border-rose-300/60 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-700 dark:text-rose-200">
        {loadError || errorCopy}
      </p>
      <button
        type="button"
        onClick={() => {
          setIsLoading(true);
          setLoadError("");
          setDashboard(null);
          setReloadKey((value) => value + 1);
        }}
        className="focus-ring mt-5 rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 dark:bg-white dark:text-slate-950"
      >
        {t({ en: "Retry", zh: "重試" })}
      </button>
    </section>
  );
}
