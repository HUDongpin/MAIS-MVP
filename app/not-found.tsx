"use client";

import Link from "next/link";
import { dictionary, useSettings } from "@/components/providers/AppProviders";
import { studentRoadmapPath } from "@/lib/roadmapRoutes";

export default function NotFound() {
  const { t } = useSettings();

  return (
    <div className="page-container py-16 sm:py-24">
      <section className="glass-panel mx-auto max-w-2xl p-8 text-center sm:p-10">
        <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-500 dark:text-cyan-300">
          {t({ en: "Page not found", zh: "找不到頁面" })}
        </p>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl">
          {t({ en: "This page is not available.", zh: "這個頁面暫時無法開啟。" })}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">
          {t({
            en: "Return to the learning path or choose another section from the navigation.",
            zh: "請返回學習路徑，或從導覽列選擇其他部分。"
          })}
        </p>
        <Link
          href={studentRoadmapPath}
          className="focus-ring mt-8 inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 dark:bg-white dark:text-slate-950"
        >
          {t(dictionary.nav.learningPath)}
        </Link>
      </section>
    </div>
  );
}
