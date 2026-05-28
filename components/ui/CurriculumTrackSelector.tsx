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
    detail: { en: "DSE UP and DSE EPH mathematics", zh: "DSE UP 與 DSE EPH 數學", zhHans: "DSE UP 与 DSE EPH 数学" }
  },
  {
    value: "US",
    detail: {
      en: "Math aligned to Common Core or state-specific standards across 10 U.S. states",
      zh: "十個州的 Common Core 數學，包括 CA、TX、FL、NY、PA、IL、OH、GA、NC、MI",
      zhHans: "十个州的 Common Core 数学，包括 CA、TX、FL、NY、PA、IL、OH、GA、NC、MI"
    }
  }
];

type RegionLabelOverrides = Partial<Record<CurriculumRegion, LocalizedText>>;
type PublisherDetailOverrides = Partial<Record<TextbookPublisher, LocalizedText>>;

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
  US: ["US_CA_MATH", "US_NC_MATH"],
  HK: ["HK_UNITED_PRIME_MIA", "HK_EPH_MIF"]
};

const publisherDetails: Record<TextbookPublisher, LocalizedText> = {
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
    en: "BNUP P1-S6 AI-generated mathematics content is live.",
    zh: "北師大版 P1-S6 AI 生成數學內容已上線。",
    zhHans: "北师大版 P1-S6 AI 生成数学内容已上线。"
  },
  MAINLAND_HJB: {
    en: "HJB mathematic pathway",
    zh: "滬教版數學課程路徑",
    zhHans: "沪教版数学课程路径"
  },
  US_CA_MATH: {
    en: "California standards-aligned pathway.",
    zh: "加州標準對齊路徑。",
    zhHans: "加州标准对齐路径。"
  },
  US_NC_MATH: {
    en: "North Carolina standards-aligned pathway.",
    zh: "北卡標準對齊路徑。",
    zhHans: "北卡标准对齐路径。"
  }
};

const publisherButtonLabelOverrides: Partial<Record<TextbookPublisher, LocalizedText>> = {
  MAINLAND_BNU: {
    en: "BNUP Mathematics (P1-S6 live)",
    zh: "北師大版數學（P1-S6 已上線）",
    zhHans: "北师大版数学（P1-S6 已上线）"
  }
};

export function CurriculumTrackSelector({
  value,
  onChange,
  onRegionChange,
  text,
  compact = false,
  regionChipLabelOverrides,
  regionLabelOverrides,
  publisherDetailOverrides,
  showRegionTitles = true,
  courseSelectionMode = "select",
  embedMainlandCoursePicker = true,
  showCourseSelectionControl = true,
  embedButtonCoursePicker = true,
  showPublisherDetailsInButtons = false,
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
  showRegionTitles?: boolean;
  courseSelectionMode?: "select" | "static" | "buttons";
  embedMainlandCoursePicker?: boolean;
  showCourseSelectionControl?: boolean;
  embedButtonCoursePicker?: boolean;
  showPublisherDetailsInButtons?: boolean;
  locked?: boolean;
}) {
  const publisherOptions = publishersByRegion[value.region];
  const handleRegionChange = onRegionChange ?? onChange;
  const selectedPublisherDetail = publisherDetailOverrides?.[value.publisher] ?? publisherDetails[value.publisher];
  const [isCoursePanelOpen, setIsCoursePanelOpen] = useState(true);
  const embedsSelectedCoursePicker = (embedMainlandCoursePicker && value.region === "MAINLAND") || (embedButtonCoursePicker && courseSelectionMode === "buttons");
  const selectedCoursePanelId = `curriculum-${value.region.toLowerCase()}-course-selector-panel`;
  const isSelectedCoursePanelOpen = locked || isCoursePanelOpen;

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
        courseSelectionMode === "buttons" ? (
          <div className="grid gap-2">
            {publisherOptions.map((publisher) => {
              const isSelected = value.publisher === publisher;
              const publisherDetail = publisherDetailOverrides?.[publisher] ?? publisherDetails[publisher];
              const publisherButtonLabel = publisherButtonLabelOverrides[publisher] ?? publisherLabels[publisher];
              const shouldShowPublisherDetail = showPublisherDetailsInButtons || (publisher === "MAINLAND_BNU" && !publisherButtonLabelOverrides[publisher]);

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

      {courseSelectionMode !== "buttons" ? (
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
                  <span className="flex items-start justify-between gap-3">
                    <span
                      className={cn(
                        "inline-flex h-6 min-w-fit shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[10px] font-black uppercase leading-none tracking-[0.08em]",
                        locked ? "bg-slate-200 text-slate-500 dark:bg-white/10 dark:text-slate-400" : selectedRegionChipClassNames[option.value]
                      )}
                    >
                      <span aria-hidden="true" className="text-[12px] leading-none">
                        {regionFlagLabels[option.value]}
                      </span>
                      <span>{text(chipLabel)}</span>
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
                    {renderCourseHeader("embedded")}
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
                handleRegionChange({ region: option.value, publisher: publisherForRegion(option.value) });
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
              <span className="flex items-start justify-between gap-3">
                <span
                  className={cn(
                    "inline-flex h-6 min-w-fit shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[10px] font-black uppercase leading-none tracking-[0.08em]",
                    locked ? "bg-slate-200 text-slate-500 dark:bg-white/10 dark:text-slate-400" : isSelected ? selectedRegionChipClassNames[option.value] : regionChipClassNames[option.value]
                  )}
                >
                  <span aria-hidden="true" className="text-[12px] leading-none">
                    {regionFlagLabels[option.value]}
                  </span>
                  <span>{text(chipLabel)}</span>
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
