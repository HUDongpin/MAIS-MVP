"use client";

import { useEffect, useState } from "react";
import {
  curriculumProfileForPublisher,
  publisherForRegion,
  publisherLabels,
  regionLabels as defaultRegionLabels
} from "@/lib/curriculumProfile";
import { cn } from "@/lib/utils";
import type { CurriculumProfile, CurriculumRegion, LocalizedText, TextbookPublisher } from "@/types";

const regionOptions: { value: CurriculumRegion; detail: LocalizedText }[] = [
  {
    value: "MAINLAND",
    detail: {
      en: "PEP, HJB, and BNUP mathematics",
      zh: "人教版、滬教版與北師大版數學",
      zhHans: "人教版、沪教版与北师大版数学"
    }
  },
  {
    value: "HK",
    detail: { en: "HK Modern primary, DSE UP, and DSE EPH mathematics", zh: "香港現代小學、DSE UP 與 DSE EPH 數學", zhHans: "香港现代小学、DSE UP 与 DSE EPH 数学" }
  },
  {
    value: "US",
    detail: {
      en: "Math aligned to Common Core or state-specific standards across priority U.S. states",
      zh: "重點州份的 Common Core 或州標準數學，包括 CA、NC、AR、FL",
      zhHans: "重点州份的 Common Core 或州标准数学，包括 CA、NC、AR、FL"
    }
  }
];

type RegionLabelOverrides = Partial<Record<CurriculumRegion, LocalizedText>>;
type PublisherDetailOverrides = Partial<Record<TextbookPublisher, LocalizedText>>;
type PublisherButtonLabelOverrides = Partial<Record<TextbookPublisher, LocalizedText>>;

const defaultRegionChipLabels: Record<CurriculumRegion, LocalizedText> = {
  MAINLAND: { en: "MAINLAND", zh: "MAINLAND", zhHans: "MAINLAND" },
  US: { en: "U.S.", zh: "美國", zhHans: "美国" },
  HK: { en: "HK", zh: "HK", zhHans: "HK" }
};

const regionFlagLabels: Record<CurriculumRegion, string> = {
  MAINLAND: "🇨🇳",
  US: "🇺🇸",
  HK: "🇭🇰"
};

const regionChipClassNames: Record<CurriculumRegion, string> = {
  MAINLAND: "bg-emerald-100 text-emerald-700 dark:bg-emerald-300/15 dark:text-emerald-200",
  US: "bg-cyan-100 text-cyan-700 dark:bg-cyan-300/15 dark:text-cyan-200",
  HK: "bg-amber-100 text-amber-700 dark:bg-amber-300/15 dark:text-amber-200"
};

const selectedRegionChipClassNames: Record<CurriculumRegion, string> = {
  MAINLAND: "bg-emerald-300 text-emerald-950",
  US: "bg-cyan-300 text-cyan-950",
  HK: "bg-amber-300 text-amber-950"
};

const selectedPublisherButtonClassNames: Record<CurriculumRegion, string> = {
  MAINLAND: "border-emerald-200 bg-emerald-50 shadow-emerald-900/5",
  US: "border-cyan-200 bg-cyan-50 shadow-cyan-900/5",
  HK: "border-amber-200 bg-amber-50 shadow-amber-900/5"
};

const publishersByRegion: Record<CurriculumRegion, TextbookPublisher[]> = {
  MAINLAND: ["MAINLAND_PEP", "MAINLAND_HJB", "MAINLAND_BNU"],
  US: ["US_CA_MATH", "US_NC_MATH", "US_AR_MATH", "US_FL_MATH"],
  HK: ["HK_MODERN_EDUCATIONAL_RESEARCH_SOCIETY", "HK_UNITED_PRIME_MIA", "HK_EPH_MIF"]
};

const publisherDetails: Record<TextbookPublisher, LocalizedText> = {
  HK_MODERN_EDUCATIONAL_RESEARCH_SOCIETY: {
    en: "Hong Kong Modern Education Research Society primary pathway.",
    zh: "香港現代教育研究社小學課程路徑。",
    zhHans: "香港现代教育研究社小学课程路径。"
  },
  HK_UNITED_PRIME_MIA: {
    en: "Hong Kong DSE pathway.",
    zh: "香港 DSE 課程路徑。",
    zhHans: "香港 DSE 课程路径。"
  },
  HK_EPH_MIF: {
    en: "Hong Kong DSE pathway.",
    zh: "香港 DSE 課程路徑。",
    zhHans: "香港 DSE 课程路径。"
  },
  MAINLAND_PEP: {
    en: "Mainland PEP mathematics pathway.",
    zh: "內地人教版數學課程路徑。",
    zhHans: "内地人教版数学课程路径。"
  },
  MAINLAND_BNU: {
    en: "BNUP formal lessons and practice are live from P1 through S6.",
    zh: "北師大版 P1-S6 正式教材課與練習已上線。",
    zhHans: "北师大版 P1-S6 正式教材课与练习已上线。"
  },
  MAINLAND_HJB: {
    en: "HJB mathematic pathway",
    zh: "滬教版數學課程路徑",
    zhHans: "沪教版数学课程路径"
  },
  US_CA_MATH: {
    en: "California textbook/lesson beta with adaptive practice beta.",
    zh: "California textbook/lesson beta，配合適性練習 beta。",
    zhHans: "California textbook/lesson beta，配合适性练习 beta。"
  },
  US_NC_MATH: {
    en: "North Carolina standards-aligned pathway.",
    zh: "北卡標準對齊路徑。",
    zhHans: "北卡标准对齐路径。"
  },
  US_AR_MATH: {
    en: "Arkansas K-G5 standards-aligned practice is live.",
    zh: "阿肯色州 K-G5 標準對齊練習已上線。",
    zhHans: "阿肯色州 K-G5 标准对齐练习已上线。"
  },
  US_FL_MATH: {
    en: "Florida Grade 6-8 B.E.S.T. standards-aligned textbook beta is live.",
    zh: "佛州 6-8 年級 B.E.S.T. 標準對齊教材 Beta 已上線。",
    zhHans: "佛州 6-8 年级 B.E.S.T. 标准对齐教材 Beta 已上线。"
  }
};

const publisherShortCodes: Record<TextbookPublisher, string> = {
  HK_MODERN_EDUCATIONAL_RESEARCH_SOCIETY: "MOD",
  HK_UNITED_PRIME_MIA: "UP",
  HK_EPH_MIF: "EPH",
  MAINLAND_PEP: "PEP",
  MAINLAND_HJB: "HJB",
  MAINLAND_BNU: "BNU",
  US_CA_MATH: "CA",
  US_NC_MATH: "NC",
  US_AR_MATH: "AR",
  US_FL_MATH: "FL"
};

const defaultPublisherButtonLabelOverrides: PublisherButtonLabelOverrides = {
  MAINLAND_BNU: {
    en: "BNUP Mathematics (P1-S6 lessons live)",
    zh: "北師大版數學（P1-S6 教材課已上線）",
    zhHans: "北师大版数学（P1-S6 教材课已上线）"
  }
};

const emptyHiddenPublisherOptions: readonly TextbookPublisher[] = [];

export function CurriculumTrackSelector({
  value,
  onChange,
  onRegionChange,
  text,
  compact = false,
  regionChipLabelOverrides,
  regionLabelOverrides,
  publisherDetailOverrides,
  publisherButtonLabelOverrides,
  showRegionTitles = true,
  courseSelectionMode = "select",
  embedMainlandCoursePicker = true,
  showCourseSelectionControl = true,
  embedButtonCoursePicker = true,
  showPublisherDetailsInButtons = false,
  hiddenPublisherOptions = emptyHiddenPublisherOptions,
  locked = false
}: {
  value: CurriculumProfile;
  onChange: (value: CurriculumProfile) => void;
  onRegionChange?: (value: CurriculumProfile) => void;
  text: (value: LocalizedText) => string;
  compact?: boolean;
  regionChipLabelOverrides?: RegionLabelOverrides;
  regionLabelOverrides?: RegionLabelOverrides;
  publisherDetailOverrides?: PublisherDetailOverrides;
  publisherButtonLabelOverrides?: PublisherButtonLabelOverrides;
  showRegionTitles?: boolean;
  courseSelectionMode?: "select" | "static" | "buttons" | "panel";
  embedMainlandCoursePicker?: boolean;
  showCourseSelectionControl?: boolean;
  embedButtonCoursePicker?: boolean;
  showPublisherDetailsInButtons?: boolean;
  hiddenPublisherOptions?: readonly TextbookPublisher[];
  locked?: boolean;
}) {
  const publisherOptions = publishersByRegion[value.region].filter((publisher) => !hiddenPublisherOptions.includes(publisher));
  const handleRegionChange = onRegionChange ?? onChange;
  const selectedPublisherDetail = publisherDetailOverrides?.[value.publisher] ?? publisherDetails[value.publisher];
  const [isCoursePanelOpen, setIsCoursePanelOpen] = useState(true);
  const embedsSelectedCoursePicker = (embedMainlandCoursePicker && value.region === "MAINLAND") || (embedButtonCoursePicker && courseSelectionMode === "buttons") || courseSelectionMode === "panel";
  const selectedCoursePanelId = `curriculum-${value.region.toLowerCase()}-course-selector-panel`;
  const isSelectedCoursePanelOpen = locked || isCoursePanelOpen;
  const firstVisiblePublisherForRegion = (region: CurriculumRegion) =>
    publishersByRegion[region].find((publisher) => !hiddenPublisherOptions.includes(publisher)) ?? publisherForRegion(region);

  useEffect(() => {
    setIsCoursePanelOpen(true);
  }, [value.region]);

  const renderCourseHeader = (variant: "standalone" | "embedded") => (
    <div className="flex items-center justify-between gap-3">
      <p className={cn(
        "text-xs font-black uppercase tracking-[0.18em]",
        locked
          ? "text-slate-400 dark:text-slate-500"
          : variant === "embedded"
            ? "text-cyan-200"
            : "text-cyan-600 dark:text-cyan-300"
      )}>
        {text({ en: "Version", zh: "版本", zhHans: "版本" })}
      </p>
      <p className={cn(
        "text-[11px] font-bold",
        locked
          ? "text-slate-400 dark:text-slate-500"
          : variant === "embedded"
            ? "text-slate-300"
            : "text-slate-400 dark:text-slate-500"
      )}>
        {text({ en: "Saved to account", zh: "保存到帳戶", zhHans: "保存到账户" })}
      </p>
    </div>
  );

  const renderCoursePicker = (variant: "standalone" | "embedded") => (
    <div className="grid gap-2">
      {showCourseSelectionControl ? (
        courseSelectionMode === "panel" ? (
          <div className={cn("grid gap-3", variant === "embedded" && "rounded-[1.35rem] bg-white/[0.08] p-3")}>
            <div className="flex items-center justify-between gap-3">
              <p className={cn(
                "text-xs font-black uppercase tracking-[0.18em]",
                locked ? "text-slate-400 dark:text-slate-500" : variant === "embedded" ? "text-cyan-100" : "text-cyan-600 dark:text-cyan-300"
              )}>
                {text({ en: "Version", zh: "版本", zhHans: "版本" })}
              </p>
              <p className={cn(
                "text-[11px] font-bold",
                locked ? "text-slate-400 dark:text-slate-500" : variant === "embedded" ? "text-slate-300" : "text-slate-400 dark:text-slate-500"
              )}>
                {text({ en: "Saved to account", zh: "保存到帳戶", zhHans: "保存到账户" })}
              </p>
            </div>

            <div
              aria-label={text({ en: "Selected version", zh: "已選版本", zhHans: "已选版本" })}
              className={cn(
                "relative min-h-[4.25rem] rounded-[1.25rem] px-4 py-3 pr-14 text-left shadow-sm",
                locked
                  ? "border border-slate-200/80 bg-slate-100 text-slate-500 shadow-none dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400"
                  : variant === "embedded"
                    ? "border border-white/15 bg-white text-slate-950"
                    : "border border-emerald-200/80 bg-emerald-50/75 text-slate-950 dark:border-emerald-300/15 dark:bg-emerald-300/10 dark:text-white"
              )}
            >
              <span className={cn("block truncate text-lg font-black leading-tight", locked ? "text-slate-500 dark:text-slate-400" : variant === "embedded" ? "text-slate-950" : "text-slate-950 dark:text-white")}>
                {text(publisherButtonLabelOverrides?.[value.publisher] ?? publisherLabels[value.publisher])}
              </span>
              <span className={cn("mt-1 block truncate text-xs font-bold", locked ? "text-slate-400 dark:text-slate-500" : "text-slate-500 dark:text-slate-300")}>
                {text({ en: "Tap an option below to change version", zh: "在下方選擇其他版本", zhHans: "在下方选择其他版本" })}
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  "pointer-events-none absolute right-4 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-[0.9rem]",
                  locked ? "bg-slate-200 text-slate-400" : "bg-slate-950 text-white"
                )}
              >
                <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none">
                  <path d="M4 6.25 8 10.25l4-4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </div>

            <div
              className={cn(
                "grid gap-2 rounded-[1.35rem] p-2 shadow-sm",
                locked
                  ? "border border-slate-200/80 bg-slate-50/90 shadow-none dark:border-white/10 dark:bg-white/[0.04]"
                  : variant === "embedded"
                    ? "border border-white/80 bg-white text-slate-950 shadow-slate-950/10"
                    : "border border-slate-200/80 bg-white/90 text-slate-950 shadow-slate-900/5 dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
              )}
              role="radiogroup"
              aria-label={text({ en: "Version option", zh: "版本選項", zhHans: "版本选项" })}
            >
              <div className={cn(
                "rounded-[1rem] border px-3 py-2 text-sm font-black",
                locked
                  ? "border-slate-200 bg-slate-100 text-slate-400 dark:border-white/10 dark:bg-white/[0.04]"
                  : "border-slate-200 bg-slate-50 text-slate-500 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300"
              )}>
                {text({ en: "Choose a version", zh: "選擇版本", zhHans: "选择版本" })}
              </div>
              {publisherOptions.map((publisher) => {
                const isSelected = value.publisher === publisher;
                const publisherDetail = publisherDetailOverrides?.[publisher] ?? publisherDetails[publisher];
                const publisherButtonLabel = publisherButtonLabelOverrides?.[publisher] ?? publisherLabels[publisher];
                const shortPublisherCode = publisherShortCodes[publisher];

                return (
                  <button
                    key={publisher}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    aria-disabled={locked}
                    disabled={locked}
                    onClick={() => onChange(curriculumProfileForPublisher(publisher))}
                    className={cn(
                      "focus-ring grid min-h-[4.25rem] grid-cols-[2.5rem_1fr_auto] items-center gap-3 rounded-[1.1rem] px-3 py-2 text-left transition",
                      locked
                        ? isSelected
                          ? "cursor-not-allowed border border-slate-300/80 bg-slate-100 text-slate-500 dark:border-white/10 dark:bg-white/[0.04]"
                          : "cursor-not-allowed text-slate-400 opacity-65 dark:text-slate-500"
                        : isSelected
                          ? "border border-emerald-200 bg-emerald-50 text-slate-950"
                          : "text-slate-950 hover:bg-slate-50 dark:text-white dark:hover:bg-white/[0.08]"
                    )}
                  >
                    <span className={cn(
                      "grid h-10 w-10 place-items-center rounded-[0.85rem] text-xs font-black",
                      locked
                        ? "bg-slate-200 text-slate-400 dark:bg-white/10"
                        : isSelected
                          ? "bg-slate-950 text-white"
                          : "bg-blue-50 text-blue-600 dark:bg-white/10 dark:text-cyan-100"
                    )}>
                      {shortPublisherCode}
                    </span>
                    <span className="min-w-0">
                      <span className={cn("block truncate text-sm font-black", locked ? "text-slate-500 dark:text-slate-400" : "text-slate-950 dark:text-white")}>
                        {text(publisherButtonLabel)}
                      </span>
                      <span className={cn("mt-1 block truncate text-xs font-bold", locked ? "text-slate-400 dark:text-slate-500" : "text-slate-500 dark:text-slate-300")}>
                        {text(publisherDetail)}
                      </span>
                    </span>
                    <span className={cn("grid h-7 w-7 place-items-center rounded-full text-base font-black", isSelected ? "text-emerald-600" : "text-transparent")}>
                      <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4" fill="none">
                        <path d="M3.5 8.2 6.6 11 12.5 4.8" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : courseSelectionMode === "buttons" ? (
          <div className="grid gap-2">
            {publisherOptions.map((publisher) => {
              const isSelected = value.publisher === publisher;
              const publisherDetail = publisherDetailOverrides?.[publisher] ?? publisherDetails[publisher];
              const publisherButtonLabel = publisherButtonLabelOverrides?.[publisher] ?? defaultPublisherButtonLabelOverrides[publisher] ?? publisherLabels[publisher];
              const shouldShowPublisherDetail = showPublisherDetailsInButtons || (publisher === "MAINLAND_BNU" && !defaultPublisherButtonLabelOverrides[publisher]);

              return (
                <button
                  key={publisher}
                  type="button"
                  aria-pressed={isSelected}
                  aria-disabled={locked}
                  disabled={locked}
                  onClick={() => onChange(curriculumProfileForPublisher(publisher))}
                  className={cn(
                    "focus-ring rounded-2xl border px-4 py-3 text-left shadow-sm transition",
                    locked
                      ? isSelected
                        ? "cursor-not-allowed border-slate-300/80 bg-slate-100 text-slate-500 shadow-none dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-400"
                        : "cursor-not-allowed border-slate-200/80 bg-slate-50/70 text-slate-400 opacity-65 shadow-none dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-500"
                      : isSelected
                        ? selectedPublisherButtonClassNames[value.region]
                        : variant === "embedded"
                          ? "border-white/15 bg-white text-slate-950 hover:-translate-y-0.5 hover:bg-slate-50"
                          : "border-slate-200/80 bg-white/80 text-slate-950 hover:-translate-y-0.5 hover:bg-white dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.1]"
                  )}
                >
                  <span className={cn("block text-sm font-black", locked ? "text-slate-500 dark:text-slate-400" : "text-slate-950")}>
                    {text(publisherButtonLabel)}
                  </span>
                  {shouldShowPublisherDetail ? (
                    <span className={cn(
                      "mt-1 block text-xs font-semibold leading-5",
                      locked ? "text-slate-400 dark:text-slate-500" : isSelected ? "text-slate-600" : "text-slate-500"
                    )}>
                      {text(publisherDetail)}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : courseSelectionMode === "select" ? (
          <label className="grid gap-2">
            <span className="sr-only">
              {text({ en: "Version option", zh: "版本選項", zhHans: "版本选项" })}
            </span>
            <span className="relative block">
              <select
                value={value.publisher}
                disabled={locked}
                onChange={(event) => {
                  const nextPublisher = publisherOptions.find((publisher) => publisher === event.currentTarget.value);
                  if (nextPublisher) onChange(curriculumProfileForPublisher(nextPublisher));
                }}
                className={cn(
                  "focus-ring min-h-14 w-full appearance-none rounded-2xl px-4 py-3 pr-12 text-sm font-black shadow-sm outline-none transition",
                  locked
                    ? "cursor-not-allowed border border-slate-200/80 bg-slate-100 text-slate-500 shadow-none dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400"
                    : variant === "embedded"
                      ? "border border-white/15 bg-white text-slate-950 hover:bg-slate-50"
                      : "border border-slate-200/80 bg-white/80 text-slate-950 hover:bg-white dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.1]"
                )}
              >
                {publisherOptions.map((publisher) => (
                  <option key={publisher} value={publisher}>
                    {text(publisherLabels[publisher])}
                  </option>
                ))}
              </select>
              <span
                aria-hidden="true"
                className={cn(
                  "pointer-events-none absolute inset-y-0 right-4 grid place-items-center",
                  locked ? "text-slate-400" : variant === "embedded" ? "text-slate-500" : "text-slate-400 dark:text-slate-300"
                )}
              >
                <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none">
                  <path d="M4 6.25 8 10.25l4-4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </span>
          </label>
        ) : (
          <div
            aria-label={text({ en: "Version option", zh: "版本選項", zhHans: "版本选项" })}
            className={cn(
              "min-h-14 rounded-2xl px-4 py-3 text-sm font-black shadow-sm",
              locked
                ? "border border-slate-200/80 bg-slate-100 text-slate-500 shadow-none dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400"
                : variant === "embedded"
                  ? "border border-white/15 bg-white text-slate-950"
                  : "border border-slate-200/80 bg-white/80 text-slate-950 dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
            )}
          >
            {text(publisherLabels[value.publisher])}
          </div>
        )
      ) : null}

      {courseSelectionMode !== "buttons" && courseSelectionMode !== "panel" ? (
        <div
          className={cn(
            "rounded-2xl border px-4 py-3 text-left shadow-sm shadow-emerald-900/5",
            locked
              ? "border-slate-200/80 bg-slate-100 text-slate-500 shadow-none dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400"
              : variant === "embedded"
                ? "border-emerald-200 bg-emerald-50"
                : "border-emerald-200/80 bg-emerald-50/75 dark:border-emerald-300/15 dark:bg-emerald-300/10"
          )}
        >
          <span className={cn(
            "block text-sm font-black",
            locked ? "text-slate-500 dark:text-slate-400" : variant === "embedded" ? "text-slate-950" : "text-slate-950 dark:text-white"
          )}>{text(publisherLabels[value.publisher])}</span>
          <span className={cn(
            "mt-1 block text-xs font-semibold leading-5",
            locked ? "text-slate-400 dark:text-slate-500" : variant === "embedded" ? "text-slate-600" : "text-slate-600 dark:text-slate-300"
          )}>{text(selectedPublisherDetail)}</span>
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="grid gap-3">
      <div
        className={cn("grid gap-2", compact ? "grid-cols-1" : "sm:grid-cols-3")}
        role="radiogroup"
        aria-label={text({ en: "Curriculum region", zh: "課程地區", zhHans: "课程地区" })}
      >
        {regionOptions.map((option) => {
          const isSelected = value.region === option.value;
          const chipLabel = regionChipLabelOverrides?.[option.value] ?? defaultRegionChipLabels[option.value];
          const regionLabel = regionLabelOverrides?.[option.value] ?? defaultRegionLabels[option.value];

          if (isSelected && embedsSelectedCoursePicker) {
            return (
              <div
                key={option.value}
                className={cn(
                  "overflow-hidden rounded-2xl border shadow-sm",
                  locked
                    ? "border-slate-200/80 bg-slate-50/90 text-slate-500 shadow-none dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400"
                    : "border-cyan-300/70 bg-slate-950 text-white",
                  !compact && "sm:col-span-3"
                )}
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  aria-expanded={isSelectedCoursePanelOpen}
                  aria-controls={selectedCoursePanelId}
                  aria-disabled={locked}
                  disabled={locked}
                  onClick={() => setIsCoursePanelOpen((isOpen) => !isOpen)}
                  className={cn(
                    "focus-ring w-full rounded-2xl px-4 py-3 text-left transition",
                    locked ? "cursor-not-allowed" : "hover:bg-white/[0.04]"
                  )}
                >
                  <span className="flex min-w-0 items-start justify-between gap-2 overflow-hidden">
                    <span
                      className={cn(
                        "inline-flex h-6 min-w-0 max-w-[calc(100%-4.5rem)] items-center gap-1.5 overflow-hidden rounded-full px-2.5 text-[10px] font-black uppercase leading-none tracking-[0.08em]",
                        locked ? "bg-slate-200 text-slate-500 dark:bg-white/10 dark:text-slate-400" : selectedRegionChipClassNames[option.value]
                      )}
                    >
                      <span aria-hidden="true" className="shrink-0 text-[12px] leading-none">
                        {regionFlagLabels[option.value]}
                      </span>
                      <span className="truncate">{text(chipLabel)}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span
                        aria-hidden="true"
                        className={cn(
                          "grid h-7 w-7 place-items-center rounded-full border",
                          locked ? "border-slate-300 bg-slate-100 text-slate-400 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-500" : "border-cyan-200 bg-cyan-300 text-slate-950"
                        )}
                      >
                        <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none">
                          <path d="M3.5 8.2 6.6 11 12.5 4.8" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                      {!locked ? (
                        <span
                          aria-hidden="true"
                          className={cn(
                            "grid h-7 w-7 place-items-center rounded-full border border-white/15 bg-white/10 text-cyan-100 transition",
                            isSelectedCoursePanelOpen && "rotate-180"
                          )}
                        >
                          <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none">
                            <path d="M4 6.25 8 10.25l4-4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                      ) : null}
                    </span>
                  </span>
                  {showRegionTitles ? (
                    <span className="mt-3 block text-sm font-black">{text(regionLabel)}</span>
                  ) : null}
                  <span className="mt-1 block text-xs font-semibold leading-5 opacity-75">{text(option.detail)}</span>
                </button>

                {isSelectedCoursePanelOpen ? (
                  <div
                    id={selectedCoursePanelId}
                    className={cn(
                      "grid gap-3 px-4 pb-4 pt-3",
                      locked ? "border-t border-slate-200/80 dark:border-white/10" : "border-t border-white/10"
                    )}
                  >
                    {courseSelectionMode === "panel" ? null : renderCourseHeader("embedded")}
                    {renderCoursePicker("embedded")}
                  </div>
                ) : null}
              </div>
            );
          }

          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-disabled={locked}
              disabled={locked}
              onClick={() => {
                handleRegionChange({ region: option.value, publisher: firstVisiblePublisherForRegion(option.value) });
                setIsCoursePanelOpen(true);
              }}
              className={cn(
                "focus-ring rounded-2xl border px-4 py-3 text-left transition",
                locked
                  ? isSelected
                    ? "cursor-not-allowed border-slate-300/80 bg-slate-100 text-slate-500 shadow-none dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-400"
                    : "cursor-not-allowed border-slate-200/80 bg-slate-50/70 text-slate-400 opacity-65 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-500"
                  : isSelected
                    ? "border-cyan-300/70 bg-slate-950 text-white shadow-sm dark:bg-white dark:text-slate-950"
                    : "border-slate-200/80 bg-white/70 text-slate-800 hover:-translate-y-0.5 hover:bg-white dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-100 dark:hover:bg-white/[0.1]"
              )}
            >
              <span className="flex min-w-0 items-start justify-between gap-2 overflow-hidden">
                <span
                  className={cn(
                    "inline-flex h-6 min-w-0 max-w-[calc(100%-2.5rem)] items-center gap-1.5 overflow-hidden rounded-full px-2.5 text-[10px] font-black uppercase leading-none tracking-[0.08em]",
                    locked ? "bg-slate-200 text-slate-500 dark:bg-white/10 dark:text-slate-400" : isSelected ? selectedRegionChipClassNames[option.value] : regionChipClassNames[option.value]
                  )}
                >
                  <span aria-hidden="true" className="shrink-0 text-[12px] leading-none">
                    {regionFlagLabels[option.value]}
                  </span>
                  <span className="truncate">{text(chipLabel)}</span>
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    "grid h-7 w-7 shrink-0 place-items-center rounded-full border transition",
                    locked
                      ? isSelected
                        ? "border-slate-300 bg-slate-100 text-slate-400 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-500"
                        : "border-slate-200 bg-slate-50 text-transparent dark:border-white/10 dark:bg-white/[0.03]"
                      : isSelected
                        ? "border-cyan-200 bg-cyan-300 text-slate-950 dark:border-cyan-300 dark:bg-cyan-300"
                        : "border-slate-300 bg-white/60 text-transparent dark:border-white/15 dark:bg-white/[0.06]"
                  )}
                >
                  <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none">
                    <path d="M3.5 8.2 6.6 11 12.5 4.8" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </span>
              {showRegionTitles ? (
                <span className="mt-3 block text-sm font-black">{text(regionLabel)}</span>
              ) : null}
              <span className="mt-1 block text-xs font-semibold leading-5 opacity-75">{text(option.detail)}</span>
            </button>
          );
        })}
      </div>

      {!embedsSelectedCoursePicker ? (
        <>
          {renderCourseHeader("standalone")}
          {renderCoursePicker("standalone")}
        </>
      ) : null}
    </div>
  );
}
