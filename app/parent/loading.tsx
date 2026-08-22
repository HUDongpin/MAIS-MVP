"use client";

import { useSettings } from "@/components/providers/AppProviders";

export default function ParentLoading() {
  const { t } = useSettings();

  return (
    <div className="page-container py-5 sm:py-7" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">
        {t({ en: "Loading the family space...", zh: "正在載入家庭空間……", zhHans: "正在加载家庭空间……" })}
      </span>
      <div className="glass-panel animate-pulse p-4 motion-reduce:animate-none sm:p-6">
        <div className="h-4 w-32 rounded-full bg-slate-200/80 dark:bg-white/10" />
        <div className="mt-4 h-9 w-full max-w-lg rounded-2xl bg-slate-200/80 dark:bg-white/10" />
        <div className="mt-6 flex gap-2 overflow-hidden">
          {[0, 1, 2, 3, 4].map((item) => (
            <div key={item} className="h-11 w-32 shrink-0 rounded-2xl bg-slate-200/70 dark:bg-white/[0.08]" />
          ))}
        </div>
      </div>
      <div className="mt-5 grid animate-pulse gap-4 motion-reduce:animate-none sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="glass-panel min-h-56 p-5">
            <div className="h-5 w-2/3 rounded-full bg-slate-200/80 dark:bg-white/10" />
            <div className="mt-5 h-28 rounded-2xl bg-slate-200/60 dark:bg-white/[0.07]" />
            <div className="mt-4 h-4 w-full rounded-full bg-slate-200/70 dark:bg-white/[0.08]" />
            <div className="mt-2 h-4 w-4/5 rounded-full bg-slate-200/70 dark:bg-white/[0.08]" />
          </div>
        ))}
      </div>
    </div>
  );
}
