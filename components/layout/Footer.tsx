"use client";

import { usePathname } from "next/navigation";
import { dictionary, useSettings } from "@/components/providers/AppProviders";
import { isChineseLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const immersiveGameRoutes = ["/practice/fishing-game", "/practice/adventure-island"];

function PeterHuLogo({ mark = "PH", compact = false }: { mark?: string; compact?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`${compact ? "size-9" : "size-11"} relative flex shrink-0 items-center justify-center rounded-full bg-slate-950 text-white shadow-sm ring-1 ring-slate-200/70 dark:bg-white dark:text-slate-950 dark:ring-white/10`}
    >
      <span className="absolute inset-1 rounded-full border border-cyan-300/70 dark:border-cyan-500/60" />
      <svg className="absolute inset-0 size-full" viewBox="0 0 44 44" fill="none">
        <path
          className="stroke-cyan-300 dark:stroke-cyan-600"
          d="M11 29C16.5 18.5 23.5 27.5 31.5 14.5"
          strokeLinecap="round"
          strokeWidth="2.4"
        />
        <circle className="fill-amber-300 dark:fill-amber-500" cx="31.5" cy="14.5" r="2.4" />
      </svg>
      <span className={`relative font-black ${compact ? "text-[0.58rem]" : "text-[0.68rem]"}`}>{mark}</span>
    </span>
  );
}

function EmailLogo() {
  return (
    <span
      aria-hidden="true"
      className="relative flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-slate-950 shadow-sm ring-1 ring-slate-200/80 dark:bg-white dark:text-slate-950 dark:ring-white/20"
    >
      <svg className="size-5" viewBox="0 0 32 32" fill="none">
        <rect x="5" y="8" width="22" height="16" rx="2" stroke="currentColor" strokeWidth="2.2" />
        <path d="M7 10.5L16 17.5L25 10.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
      </svg>
    </span>
  );
}

function PedaNovaLogo() {
  return (
    <span
      aria-hidden="true"
      className="relative flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-slate-950 shadow-sm ring-1 ring-slate-200/80 dark:bg-white dark:text-slate-950 dark:ring-white/20"
    >
      <svg className="size-7" viewBox="0 0 36 36" fill="none">
        <path
          className="stroke-sky-500 dark:stroke-sky-300"
          d="M8 23.5C11.7 20.6 15.3 20.3 18 22.6C20.7 20.3 24.3 20.6 28 23.5V12.4C24.2 10.4 20.8 10.8 18 13.7C15.2 10.8 11.8 10.4 8 12.4V23.5Z"
          strokeLinejoin="round"
          strokeWidth="2"
        />
        <path
          className="stroke-amber-400 dark:stroke-amber-300"
          d="M24.5 6.7L25.7 9.4L28.6 10.6L25.7 11.8L24.5 14.5L23.3 11.8L20.4 10.6L23.3 9.4L24.5 6.7Z"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
        <path
          className="stroke-violet-500 dark:stroke-violet-300"
          d="M18 14V27"
          strokeLinecap="round"
          strokeWidth="1.8"
        />
      </svg>
    </span>
  );
}

export function Footer() {
  const pathname = usePathname();
  const { language, t } = useSettings();
  const isImmersiveGameRoute = immersiveGameRoutes.some((route) => pathname.startsWith(route));
  return (
    <footer className={cn(
      "relative z-10 border-t border-slate-200/70 bg-white/70 py-6 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/55",
      isImmersiveGameRoute ? "hidden sm:block" : ""
    )}>
      <div className="page-container grid gap-6 text-sm text-slate-600 xl:grid-cols-[minmax(280px,0.8fr)_minmax(520px,1fr)] xl:items-center dark:text-slate-400">
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className="text-base font-bold tracking-normal text-slate-950 dark:text-white">{t(dictionary.common.siteName)}</p>
            <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">{t(dictionary.footer.description)}</p>
          </div>
          <div className="flex max-w-2xl items-center gap-2.5 text-sm leading-6 text-slate-500 dark:text-slate-400">
            <PeterHuLogo compact mark={isChineseLanguage(language) ? "胡" : "PH"} />
            <p>
              {t(dictionary.footer.developerCredit)}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-3 text-sm font-semibold text-slate-600 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5 xl:justify-end xl:pr-28 dark:text-slate-300">
          <a
            className="focus-ring flex items-center gap-2.5 rounded-md py-1 transition-colors hover:text-cyan-600 dark:hover:text-cyan-300"
            href="mailto:hudongpin@126.com"
          >
            <EmailLogo />
            <span>{t(dictionary.footer.email)}</span>
          </a>
          <span className="hidden h-7 w-px bg-slate-200 sm:block dark:bg-white/10" aria-hidden="true" />
          <a
            className="focus-ring flex items-center gap-2.5 rounded-md py-1 transition-colors hover:text-cyan-600 dark:hover:text-cyan-300"
            href="https://hudongpin.com"
            rel="noreferrer"
            target="_blank"
          >
            <PeterHuLogo compact />
            <span>{t(dictionary.footer.personalWebsite)}</span>
          </a>
          <span className="hidden h-7 w-px bg-slate-200 sm:block dark:bg-white/10" aria-hidden="true" />
          <span className="flex items-center gap-2.5 py-1">
            <PedaNovaLogo />
            <span>{t(dictionary.footer.pedaNova)}</span>
          </span>
        </div>
      </div>
    </footer>
  );
}
