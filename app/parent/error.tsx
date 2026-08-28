"use client";

import Link from "next/link";
import { useSettings } from "@/components/providers/AppProviders";

export default function ParentError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useSettings();

  return (
    <div className="page-container py-7">
      <section className="glass-panel p-6 text-center sm:p-8" role="alert">
        <p className="text-sm font-black uppercase tracking-[0.2em] text-rose-700 dark:text-rose-200">
          {t({ en: "Family space unavailable", zh: "家庭空間暫時不可用", zhHans: "家庭空间暂时不可用" })}
        </p>
        <h1 className="mt-3 text-3xl font-black text-slate-950 dark:text-white">
          {t({ en: "We could not load this parent page", zh: "暫時未能載入家長頁面", zhHans: "暂时无法加载家长页面" })}
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
          {t({ en: "No private diagnostic details are shown here. Retry the request, or return to the family overview.", zh: "此處不會顯示私人診斷資料。請重試，或返回家庭總覽。", zhHans: "此处不会显示私人诊断数据。请重试，或返回家庭总览。" })}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={reset} className="focus-ring rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white dark:bg-white dark:text-slate-950">
            {t({ en: "Try again", zh: "再試一次", zhHans: "重试" })}
          </button>
          <Link href="/parent" className="focus-ring rounded-full border border-slate-200/80 bg-white/75 px-5 py-3 text-sm font-black text-slate-700 dark:border-white/10 dark:bg-white/[0.07] dark:text-slate-200">
            {t({ en: "Family overview", zh: "家庭總覽", zhHans: "家庭总览" })}
          </Link>
        </div>
      </section>
    </div>
  );
}
