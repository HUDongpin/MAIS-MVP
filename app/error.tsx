"use client";

import { usePathname } from "next/navigation";

type AppErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AppError({ reset }: AppErrorProps) {
  const pathname = usePathname();
  const isParentRoute = pathname === "/parent" || pathname.startsWith("/parent/");

  return (
    <div className="page-container py-7">
      <section
        aria-live="assertive"
        className="glass-panel mx-auto max-w-2xl p-6 text-center sm:p-8"
        role="alert"
      >
        <p className="text-sm font-black uppercase tracking-[0.2em] text-rose-700 dark:text-rose-200">
          {isParentRoute ? "Family space / 家庭空間 / 家庭空间" : "MAIS"}
        </p>
        <h1 className="mt-3 text-3xl font-black text-slate-950 dark:text-white" lang="en">
          {isParentRoute ? "Family space is temporarily unavailable" : "We could not load this page"}
        </h1>
        <p className="mt-3 text-base font-bold text-slate-700 dark:text-slate-200" lang="zh-Hant">
          {isParentRoute ? "家庭空間暫時不可用" : "暫時未能載入此頁面"}
        </p>
        <p className="mt-1 text-base font-bold text-slate-700 dark:text-slate-200" lang="zh-Hans">
          {isParentRoute ? "家庭空间暂时不可用" : "暂时无法加载此页面"}
        </p>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">
          No diagnostic or account details are shown here. / 此處不會顯示診斷或帳戶資料。 / 此处不会显示诊断或账户数据。
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            className="focus-ring rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white dark:bg-white dark:text-slate-950"
            onClick={reset}
            type="button"
          >
            Try again / 再試一次 / 重试
          </button>
          <a
            className="focus-ring rounded-full border border-slate-200/80 bg-white/75 px-5 py-3 text-sm font-black text-slate-700 dark:border-white/10 dark:bg-white/[0.07] dark:text-slate-200"
            href={isParentRoute ? "/parent" : "/"}
          >
            {isParentRoute ? "Family overview / 家庭總覽 / 家庭总览" : "Home / 首頁 / 首页"}
          </a>
        </div>
      </section>
    </div>
  );
}
