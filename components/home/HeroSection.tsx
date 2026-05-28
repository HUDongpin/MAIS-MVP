"use client";

import Link from "next/link";
import Image from "next/image";
import pedaNovaMark from "@/components/home/brand-assets/pedanova-mark-transparent.png";
import curriculumRoadmapMapIcon from "@/components/home/feature-icons/curriculum-roadmap-map.png";
import { dictionary, useSettings } from "@/components/providers/AppProviders";
import { gradeIds } from "@/data/grades";
import type { Language, LocalizedText } from "@/types";

type MiniStatIcon = "grades" | "labs" | "questions" | "curriculum" | "roadmap" | "gamification" | "games" | "experts";

type HeroSectionProps = {
  practiceQuestionTotal: number;
};

const numberFormatter = new Intl.NumberFormat("en-US");

function formatMiniStatTotal(total: number, language: Language) {
  if (language !== "en" && total >= 10000) {
    const compactWanTotal = Math.floor(total / 1000) / 10;
    const label = Number.isInteger(compactWanTotal) ? String(compactWanTotal) : compactWanTotal.toFixed(1);
    const tenThousandUnit = language === "zh-Hans" ? "万" : "萬";

    return `${label}${tenThousandUnit}`;
  }

  if (total >= 1000) return `${Math.floor(total / 1000)}k`;
  return numberFormatter.format(total);
}

function miniStats(practiceQuestionTotalLabel: string): Array<{
  id: string;
  value: string;
  label: LocalizedText;
  href: string;
  icon: MiniStatIcon;
  accentBarClassName: string;
  badgeClassName: string;
}> {
  return [
    {
      id: "grades",
      value: String(gradeIds.length),
      label: dictionary.home.stats.grades,
      href: "/learning-path",
      icon: "grades",
      accentBarClassName: "bg-cyan-500",
      badgeClassName:
        "border-cyan-200/80 bg-cyan-50/80 text-cyan-700 shadow-cyan-900/5 dark:border-cyan-300/15 dark:bg-cyan-300/[0.08] dark:text-cyan-200"
    },
    {
      id: "labs",
      value: "100",
      label: dictionary.home.stats.labs,
      href: "/visualization-lab",
      icon: "labs",
      accentBarClassName: "bg-violet-500",
      badgeClassName:
        "border-violet-200/80 bg-violet-50/80 text-violet-700 shadow-violet-900/5 dark:border-violet-300/15 dark:bg-violet-300/[0.08] dark:text-violet-200"
    },
    {
      id: "questions",
      value: practiceQuestionTotalLabel,
      label: dictionary.home.stats.questions,
      href: "/practice",
      icon: "questions",
      accentBarClassName: "bg-emerald-500",
      badgeClassName:
        "border-emerald-200/80 bg-emerald-50/80 text-emerald-700 shadow-emerald-900/5 dark:border-emerald-300/15 dark:bg-emerald-300/[0.08] dark:text-emerald-200"
    },
    {
      id: "curriculum",
      value: "7",
      label: { en: "China/HK SAR/US Curriculum", zh: "中國/香港特區/美國課程", zhHans: "中国/香港特区/美国课程" },
      href: "/register",
      icon: "curriculum",
      accentBarClassName: "bg-amber-500",
      badgeClassName:
        "border-amber-200/80 bg-amber-50/80 text-amber-700 shadow-amber-900/5 dark:border-amber-300/15 dark:bg-amber-300/[0.08] dark:text-amber-200"
    },
    {
      id: "gamification",
      value: "1",
      label: { en: "Gamification system with a rewards shop", zh: "遊戲化系統與獎勵商店", zhHans: "游戏化系统与奖励商店" },
      href: "/dashboard",
      icon: "gamification",
      accentBarClassName: "bg-rose-500",
      badgeClassName:
        "border-rose-200/80 bg-rose-50/80 text-rose-700 shadow-rose-900/5 dark:border-rose-300/15 dark:bg-rose-300/[0.08] dark:text-rose-200"
    },
    {
      id: "games",
      value: "2",
      label: { en: "Games (Adventure Island and Fishing Master)", zh: "遊戲（探险岛🏖與捕魚達人🎣）", zhHans: "游戏（探险岛🏖与捕鱼达人🎣）" },
      href: "/practice",
      icon: "games",
      accentBarClassName: "bg-sky-500",
      badgeClassName:
        "border-sky-200/80 bg-sky-50/80 text-sky-700 shadow-sky-900/5 dark:border-sky-300/15 dark:bg-sky-300/[0.08] dark:text-sky-200"
    },
    {
      id: "curriculum-roadmaps",
      value: "14",
      label: { en: "Curriculum Roadmaps", zh: "課程路線圖", zhHans: "课程路线图" },
      href: "/learning-path",
      icon: "roadmap",
      accentBarClassName: "bg-indigo-500",
      badgeClassName:
        "border-indigo-200/80 bg-indigo-50/80 text-indigo-700 shadow-indigo-900/5 dark:border-indigo-300/15 dark:bg-indigo-300/[0.08] dark:text-indigo-200"
    },
    {
      id: "math-education-experts",
      value: "5",
      label: { en: "Experts in Mathematics Education", zh: "數學教育專家", zhHans: "数学教育专家" },
      href: "https://www.pedanova.tech/team/",
      icon: "experts",
      accentBarClassName: "bg-teal-500",
      badgeClassName:
        "border-teal-200/80 bg-teal-50/80 text-teal-700 shadow-teal-900/5 dark:border-teal-300/15 dark:bg-teal-300/[0.08] dark:text-teal-200"
    }
  ];
}

const pedaNovaStatusRows: Array<{
  id: string;
  label: LocalizedText;
  detail: LocalizedText;
}> = [
  {
    id: "trust-mais",
    label: { en: "TRUST-MAIS", zh: "TRUST-MAIS", zhHans: "TRUST-MAIS" },
    detail: {
      en: "adaptive engine under development",
      zh: "適性引擎開發中",
      zhHans: "自适应引擎开发中"
    }
  },
  {
    id: "global",
    label: { en: "Global", zh: "全球", zhHans: "全球" },
    detail: {
      en: "school and district partnerships expanding",
      zh: "學校與區域合作持續拓展",
      zhHans: "学校与区域合作持续拓展"
    }
  }
];

function MiniStatLogo({ icon }: { icon: MiniStatIcon }) {
  const common = "h-8 w-8 overflow-visible";

  if (icon === "roadmap") {
    return (
      <span className="relative block h-12 w-12 shrink-0">
        <Image
          src={curriculumRoadmapMapIcon}
          alt=""
          aria-hidden="true"
          fill
          className="object-contain drop-shadow-[0_10px_18px_rgba(79,70,229,0.18)]"
          sizes="48px"
        />
      </span>
    );
  }

  if (icon === "grades") {
    return (
      <svg className={common} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M7 18.8 24 10.7l17 8.1-17 8.1-17-8.1Z" fill="currentColor" fillOpacity="0.12" strokeWidth="2.15" />
        <path d="M14.2 23.5v7.2c0 3.5 4.4 6.2 9.8 6.2s9.8-2.7 9.8-6.2v-7.2L24 28.2l-9.8-4.7Z" fill="currentColor" fillOpacity="0.09" strokeWidth="2.15" />
        <path d="M14.2 23.5 24 28.2l9.8-4.7" strokeWidth="1.8" opacity="0.56" />
        <path d="M38.8 20.4v9.3" strokeWidth="2" />
        <circle cx="38.8" cy="33" r="2.8" fill="currentColor" fillOpacity="0.13" strokeWidth="1.8" />
        <path d="M17.1 18.6 24 15.4l7 3.2" strokeWidth="1.7" opacity="0.46" />
      </svg>
    );
  }

  if (icon === "labs") {
    return (
      <svg className={common} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="9.5" y="11" width="29" height="25.5" rx="6.6" fill="currentColor" fillOpacity="0.09" strokeWidth="2.15" />
        <path d="M15 17.6h18M15 23.7h18M15 29.8h18M18.5 15.2v17.6M24 15.2v17.6M29.5 15.2v17.6" strokeWidth="1.35" opacity="0.34" />
        <path d="M14.8 32.8h20.8M24 33V15.8" strokeWidth="1.65" opacity="0.5" />
        <path d="M15.4 19.6C17.7 27.4 20.4 31.5 24 31.5s6.3-4.1 8.6-11.9" strokeWidth="2.8" />
      </svg>
    );
  }

  if (icon === "questions") {
    return (
      <svg className={common} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M15 8h14l7 7v22a4 4 0 0 1-4 4H15a4 4 0 0 1-4-4V12a4 4 0 0 1 4-4Z" fill="currentColor" fillOpacity="0.1" strokeWidth="2" />
        <path d="M29 8v6a2 2 0 0 0 2 2h5" strokeWidth="2" />
        <path d="M17 20h10M17 26h12M17 32h7" strokeWidth="2" opacity="0.62" />
        <rect x="29" y="28" width="10" height="9" rx="3" fill="currentColor" fillOpacity="0.14" strokeWidth="2" />
        <path d="m31.8 32.4 2 2 3.4-4.1" strokeWidth="2.25" />
      </svg>
    );
  }

  if (icon === "gamification") {
    return (
      <svg className={common} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="11" y="21" width="26" height="17" rx="3.5" fill="currentColor" fillOpacity="0.1" strokeWidth="2.15" />
        <rect x="8.5" y="16" width="31" height="7.5" rx="2.8" fill="currentColor" fillOpacity="0.13" strokeWidth="2.15" />
        <path d="M24 16v22" strokeWidth="2.15" />
        <path d="M15 23.5v14M33 23.5v14" strokeWidth="1.55" opacity="0.42" />
        <path d="M24 16c-3.8-1.2-8.9-2.6-9.2-5.3-.2-1.9 1.3-3.1 3.3-2.5C20.8 9 22.9 12.2 24 16Z" fill="currentColor" fillOpacity="0.12" strokeWidth="2.05" />
        <path d="M24 16c3.8-1.2 8.9-2.6 9.2-5.3.2-1.9-1.3-3.1-3.3-2.5C27.2 9 25.1 12.2 24 16Z" fill="currentColor" fillOpacity="0.12" strokeWidth="2.05" />
        <path d="M19.4 16c1.1-1.5 2.6-2.6 4.6-2.6s3.5 1.1 4.6 2.6" strokeWidth="1.65" opacity="0.58" />
      </svg>
    );
  }

  if (icon === "games") {
    return (
      <svg className={common} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M15.3 18h17.4c4 0 7 4.4 7.6 10.7.4 3.7-1.1 5.9-3.6 5.9-1.8 0-3.1-.9-4.9-3.6l-1.5-2.1H17.7L16.2 31c-1.8 2.7-3.1 3.6-4.9 3.6-2.5 0-4-2.2-3.6-5.9C8.3 22.4 11.3 18 15.3 18Z" fill="currentColor" fillOpacity="0.1" strokeWidth="2" />
        <path d="M17.2 21.8v7M13.7 25.3h7" strokeWidth="2" />
        <circle cx="31.4" cy="24.8" r="1.9" fill="currentColor" fillOpacity="0.18" strokeWidth="1.7" />
        <circle cx="35.8" cy="29.2" r="1.9" fill="currentColor" fillOpacity="0.18" strokeWidth="1.7" />
        <path d="M21.5 18.1 24 13l2.5 5.1" strokeWidth="1.9" opacity="0.5" />
      </svg>
    );
  }

  if (icon === "experts") {
    return (
      <svg className={common} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="24" cy="17" r="6.2" fill="currentColor" fillOpacity="0.1" strokeWidth="2.05" />
        <path d="M13.4 39c1-7 4.8-11.2 10.6-11.2S33.6 32 34.6 39" fill="currentColor" fillOpacity="0.1" strokeWidth="2.05" />
        <path d="M9.5 33.4c.7-4.2 3-6.8 6.7-7M38.5 33.4c-.7-4.2-3-6.8-6.7-7" strokeWidth="2" opacity="0.5" />
        <path d="m14.5 13.6 9.5-4.5 9.5 4.5-9.5 4.5-9.5-4.5Z" fill="currentColor" fillOpacity="0.13" strokeWidth="1.9" />
        <path d="M18.8 16.1v4.1c0 2.1 2.3 3.9 5.2 3.9s5.2-1.8 5.2-3.9v-4.1" strokeWidth="1.8" />
        <path d="M34 14.4v6.1" strokeWidth="1.8" opacity="0.65" />
        <circle cx="34" cy="22.3" r="1.7" fill="currentColor" fillOpacity="0.15" strokeWidth="1.5" />
      </svg>
    );
  }

  return (
    <svg className={common} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 12h11c2.2 0 3.7.7 5 2.2V39c-1.3-1.5-2.8-2.2-5-2.2H9V12Z" fill="currentColor" fillOpacity="0.1" strokeWidth="2" />
      <path d="M25 14.2c1.3-1.5 2.8-2.2 5-2.2h9v24.8h-9c-2.2 0-3.7.7-5 2.2V14.2Z" fill="currentColor" fillOpacity="0.1" strokeWidth="2" />
      <path d="M25 14v25" strokeWidth="2" opacity="0.62" />
      <path d="M14 19h6M14 25h7M14 31h5M30 19h5M30 25h5M30 31h4" strokeWidth="1.8" opacity="0.62" />
      <path d="M32 12v10l3-2 3 2V12" strokeWidth="2" />
    </svg>
  );
}

function MiniStatBadge({ badgeClassName, icon }: { badgeClassName: string; icon: MiniStatIcon }) {
  return (
    <span className="relative flex h-14 w-14 shrink-0 items-center justify-center justify-self-end" aria-hidden="true">
      <span
        className={`relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border shadow-sm transition duration-300 group-hover:-translate-y-0.5 group-hover:scale-[1.03] group-focus-visible:-translate-y-0.5 group-focus-visible:scale-[1.03] ${badgeClassName}`}
      >
        <span className="absolute inset-px rounded-[0.95rem] border border-white/60 bg-white/35 dark:border-white/10 dark:bg-white/[0.03]" />
        <span className="relative flex h-10 w-10 items-center justify-center opacity-95">
          <MiniStatLogo icon={icon} />
        </span>
      </span>
    </span>
  );
}

function PedaNovaHeroLogo() {
  return (
    <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[1.15rem] bg-white p-1.5 shadow-[0_12px_28px_rgba(15,23,42,0.12)] ring-1 ring-slate-200/70 motion-safe:animate-[pedanova-logo-float_7s_ease-in-out_infinite] dark:bg-white dark:ring-white/20 sm:h-16 sm:w-16 sm:rounded-[1.35rem]">
      <Image
        src={pedaNovaMark}
        alt=""
        aria-hidden="true"
        className="h-full w-full object-contain"
        sizes="64px"
        priority
      />
    </span>
  );
}

function PedaNovaEngineCard({ text }: { text: (localized: LocalizedText) => string }) {
  return (
    <aside
      aria-label="PedaNova TRUST-MAIS adaptive engine status"
      className="pedanova-flow-border relative rounded-[1.6rem] p-[2px] shadow-[0_20px_52px_rgba(15,23,42,0.1)] dark:shadow-none"
    >
      <div className="pedanova-flow-panel relative isolate overflow-hidden rounded-[1.48rem] bg-[linear-gradient(135deg,#ffffff,#f8fafc_52%,#eef2ff)] px-6 py-5 backdrop-blur-xl dark:bg-[linear-gradient(135deg,#0f172a,#1e293b_54%,#312e81)] sm:px-7 sm:py-6 lg:px-8 lg:py-7 xl:px-9">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_88%_10%,rgba(168,85,247,0.18),transparent_34%),radial-gradient(circle_at_8%_90%,rgba(14,165,233,0.16),transparent_30%)] dark:bg-[radial-gradient(circle_at_88%_10%,rgba(168,85,247,0.22),transparent_34%),radial-gradient(circle_at_8%_90%,rgba(34,211,238,0.12),transparent_30%)]" aria-hidden="true" />
        <div className="relative flex min-h-full flex-col">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <PedaNovaHeroLogo />
          <div className="min-w-0">
            <p className="flex flex-wrap gap-x-3 gap-y-1 text-[0.7rem] font-black uppercase leading-4 text-sky-600 dark:text-cyan-200 sm:text-xs">
              <span>P E D A N O V A</span>
              <span>E D - T E C H</span>
            </p>
            <h2 className="mt-1.5 text-xl font-black leading-tight text-slate-950 dark:text-white sm:text-[1.35rem]">
              {text({ en: "TRUST-MAIS adaptive engine", zh: "TRUST-MAIS 適性引擎", zhHans: "TRUST-MAIS 自适应引擎" })}
            </h2>
          </div>
        </div>

        <p className="mt-4 text-base font-semibold leading-7 tracking-normal text-slate-700 dark:text-slate-200 sm:text-[1.05rem]">
          {text({
            en: "From the TRUST-MAIS adaptive engine to school pilots and cross-border collaboration, PedaNova is moving research-informed design into real learning environments.",
            zh: "從 TRUST-MAIS 適性引擎到學校試點與跨境協作，PedaNova 正把研究驅動的設計帶入真實學習環境。",
            zhHans: "从 TRUST-MAIS 自适应引擎到学校试点与跨境协作，PedaNova 正把研究驱动的设计带入真实学习环境。"
          })}
        </p>

        <div className="mt-6 divide-y divide-slate-200/80 border-t border-slate-200/80 dark:divide-white/10 dark:border-white/10">
          {pedaNovaStatusRows.map((row) => (
            <div key={row.id} className="grid gap-2 py-3 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] sm:items-center">
              <p className="text-xl font-black leading-tight text-slate-950 dark:text-white sm:text-[1.35rem]">{text(row.label)}</p>
              <p className="text-left text-sm font-bold leading-snug text-slate-500 dark:text-slate-300 sm:max-w-[13.5rem] sm:justify-self-end sm:text-right">{text(row.detail)}</p>
            </div>
          ))}
        </div>
      </div>
      </div>
    </aside>
  );
}

export function HeroSection({ practiceQuestionTotal }: HeroSectionProps) {
  const { language, t, text } = useSettings();
  const brandText = t(dictionary.home.brand);
  const headlineText = t(dictionary.home.headline);
  const splitHeadlineLines: [string, string] | null =
    language === "en" && headlineText === "Adaptive interactive math learning"
      ? ["Adaptive interactive", "math learning"]
      : language === "zh-Hans" && headlineText === "小学一年级至高三的自适应互动数学学习平台"
        ? ["小学一年级至高三", "自适应互动数学学习平台"]
        : language === "zh" && headlineText === "小一至中六互動數學學習平台"
          ? ["小一至中六互動", "數學學習平台"]
          : null;
  const homeMiniStats = miniStats(formatMiniStatTotal(practiceQuestionTotal, language));

  return (
    <section className="page-container pt-8 sm:pt-10 lg:pt-12">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,0.68fr)] lg:items-start xl:gap-10">
        <div className="max-w-4xl">
          <p
            className="mb-4 inline-flex rounded-full border border-cyan-400/25 bg-cyan-400/[0.08] px-4 py-2 text-sm font-bold text-cyan-700 dark:text-cyan-200"
          >
            {t(dictionary.home.eyebrow)}
          </p>
          <h1
            aria-label={`${brandText} ${headlineText}`}
            className="max-w-3xl text-4xl font-black leading-[1.06] tracking-normal text-slate-950 dark:text-white sm:text-5xl lg:text-6xl"
          >
            <span className="block">
              {language === "en" && brandText === "MAIS" ? (
                <>
                  MAI<span className="ml-[0.04em] inline-block">S</span>
                </>
              ) : (
                brandText
              )}
            </span>
            {splitHeadlineLines ? (
              <span className="block">
                <span className="mais-headline-gradient mais-headline-gradient-primary block leading-[1.12]">
                  {splitHeadlineLines[0]}
                </span>
                <span className="mais-headline-gradient mais-headline-gradient-secondary block leading-[1.12]">
                  {splitHeadlineLines[1]}
                </span>
              </span>
            ) : (
              <span className="mais-headline-gradient mais-headline-gradient-single block leading-[1.12]">
                {headlineText}
              </span>
            )}
          </h1>
          <style>{`
            @property --pedanova-border-rotate {
              syntax: "<angle>";
              initial-value: 132deg;
              inherits: false;
            }

            @keyframes mais-title-shimmer {
              0% {
                background-position: 0% 50%;
              }

              48% {
                background-position: 62% 50%;
              }

              100% {
                background-position: 100% 50%;
              }
            }

            .mais-headline-gradient {
              animation: mais-title-shimmer 6.8s cubic-bezier(0.45, 0, 0.2, 1) infinite alternate;
              background-image: linear-gradient(
                90deg,
                #38bdf8 0%,
                #38bdf8 18%,
                #60a5fa 34%,
                #6366f1 52%,
                #8b5cf6 68%,
                #c084fc 84%,
                #38bdf8 100%
              );
              background-position: 0% 50%;
              background-size: 320% 100%;
              -webkit-background-clip: text;
              background-clip: text;
              -webkit-text-fill-color: transparent;
              color: transparent;
            }

            .mais-headline-gradient-primary {
              animation-duration: 6.4s;
            }

            .mais-headline-gradient-secondary {
              animation-delay: -3.1s;
              animation-direction: alternate-reverse;
              animation-duration: 7.3s;
            }

            .mais-headline-gradient-single {
              animation-duration: 8s;
            }

            @keyframes pedanova-logo-float {
              0%,
              100% {
                transform: translateY(0);
              }

              50% {
                transform: translateY(-6px);
              }
            }

            .pedanova-flow-border {
              isolation: isolate;
            }

            .pedanova-flow-border::before,
            .pedanova-flow-border::after {
              animation: pedanova-border-spin 3.6s linear infinite;
              background-image: linear-gradient(
                var(--pedanova-border-rotate),
                rgba(93, 220, 255, 0.98),
                rgba(60, 103, 227, 0.96) 43%,
                rgba(78, 0, 194, 0.96) 72%,
                rgba(93, 220, 255, 0.98)
              );
              border-radius: inherit;
              content: "";
              pointer-events: none;
              position: absolute;
              z-index: 0;
            }

            .pedanova-flow-border::before {
              inset: 0;
            }

            .pedanova-flow-border::after {
              filter: blur(28px);
              inset: -1.1rem;
              opacity: 0.42;
              transform: scale(0.98);
            }

            .pedanova-flow-panel {
              z-index: 1;
            }

            @keyframes pedanova-border-spin {
              0% {
                --pedanova-border-rotate: 0deg;
              }

              100% {
                --pedanova-border-rotate: 360deg;
              }
            }

            @media (prefers-reduced-motion: reduce) {
              .mais-headline-gradient {
                animation: none;
                background-position: 42% 50%;
              }

              .mais-headline-gradient-secondary {
                background-position: 76% 50%;
              }

              .pedanova-flow-border::before,
              .pedanova-flow-border::after {
                animation: none;
              }
            }
          `}</style>
          <p
            className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300"
          >
            {t(dictionary.home.subhead)}
          </p>
          <div
            className="mt-8 flex flex-col gap-3 sm:flex-row"
          >
            <Link href="/login" className="focus-ring rounded-full bg-slate-950 px-6 py-3 text-center font-bold text-white shadow-sm shadow-slate-950/10 transition hover:-translate-y-1 dark:bg-white dark:text-slate-950">
              {t(dictionary.common.startLearning)}
            </Link>
            <Link href="/visualization-lab" className="focus-ring rounded-full border border-slate-200/80 bg-white/75 px-6 py-3 text-center font-bold text-slate-800 shadow-sm transition hover:-translate-y-1 hover:bg-white dark:border-white/10 dark:bg-white/[0.07] dark:text-white dark:hover:bg-white/[0.12]">
              {t(dictionary.common.exploreVisualizations)}
            </Link>
          </div>
        </div>
        <PedaNovaEngineCard text={text} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 min-[380px]:grid-cols-2 lg:mt-4 lg:grid-cols-4">
        {homeMiniStats.map((stat) => (
          <Link
            key={stat.id}
            href={stat.href}
            aria-label={`${text(stat.label)}: ${stat.value}`}
            className="focus-ring group relative block min-h-[8.25rem] overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.06)] transition duration-300 hover:-translate-y-1 hover:border-slate-300 hover:bg-white hover:shadow-[0_22px_50px_rgba(15,23,42,0.1)] dark:border-white/10 dark:bg-slate-900/70 dark:shadow-none dark:hover:border-white/20 dark:hover:bg-slate-900/90 sm:p-5"
          >
            <span className={`absolute inset-x-0 top-0 h-[3px] ${stat.accentBarClassName}`} aria-hidden="true" />
            <div className="relative grid min-h-[6.75rem] content-between grid-cols-[minmax(0,1fr)_3.5rem] items-start gap-x-4 gap-y-4">
              <p className="min-w-0 text-3xl font-black leading-none tracking-normal text-slate-950 dark:text-white sm:text-[2.15rem]">{stat.value}</p>
              <MiniStatBadge icon={stat.icon} badgeClassName={stat.badgeClassName} />
              <p className="col-span-2 min-h-[2.5rem] break-words pr-7 text-sm font-semibold leading-5 text-slate-500 transition duration-300 group-hover:text-slate-700 dark:text-slate-400 dark:group-hover:text-slate-200">
                {text(stat.label)}
              </p>
              <span className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200/80 bg-white/75 text-slate-400 shadow-sm transition duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:border-slate-300 group-hover:text-slate-700 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-500 dark:group-hover:border-white/20 dark:group-hover:text-slate-200" aria-hidden="true">
                <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 11 11 5" strokeWidth="1.8" />
                  <path d="M6.5 5H11v4.5" strokeWidth="1.8" />
                </svg>
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
