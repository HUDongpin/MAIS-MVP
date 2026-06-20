"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { primaryGrades, secondaryGrades } from "@/data/grades";
import { formatGradeLabel } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { Grade, GradeId, Language, LocalizedText } from "@/types";

type GradeFilter = GradeId | "all";

type PracticeGradeRadarSelectProps = {
  value: GradeFilter;
  onChange: (value: GradeFilter) => void;
  language: Language;
  text: (localized: LocalizedText) => string;
  t: (localized: LocalizedText) => string;
};

type GradeRadarOption = {
  value: GradeFilter;
  label: string;
  shortLabel: string;
  focus: string;
  stage: "all" | "primary" | "secondary";
  grade?: Grade;
};

const allGradeOptionCopy = {
  label: { en: "All", zh: "全部", zhHans: "全部" },
  shortLabel: { en: "All", zh: "全部", zhHans: "全部" },
  focus: {
    en: "Balanced practice from every available grade",
    zh: "從所有可用年級抽取均衡練習",
    zhHans: "从所有可用年级抽取均衡练习"
  }
} satisfies Record<string, LocalizedText>;

const selectorCopy = {
  buttonLabel: { en: "Grade", zh: "年級", zhHans: "年级" },
  title: { en: "Find the right challenge", zh: "選擇合適挑戰", zhHans: "选择合适挑战" },
  description: {
    en: "Pick a grade with a quick skill preview. Practice starts now, even in guest mode.",
    zh: "用能力預覽快速選年級。訪客模式也可立即開始練習。",
    zhHans: "用能力预览快速选年级。访客模式也可立即开始练习。"
  },
  primary: { en: "Primary", zh: "小學", zhHans: "小学" },
  secondary: { en: "Secondary", zh: "中學", zhHans: "中学" },
  recommended: { en: "Recommended next", zh: "建議下一步", zhHans: "建议下一步" },
  bestFit: { en: "Best fit", zh: "最合適", zhHans: "最合适" },
  fast: { en: "Fast", zh: "快速", zhHans: "快速" },
  guestNote: {
    en: "Guest mode: selections reset after this visit unless the student logs in.",
    zh: "訪客模式：未登入前，本次選擇不會保存到學習紀錄。",
    zhHans: "访客模式：未登录前，本次选择不会保存到学习记录。"
  },
  mixedReviewTitle: { en: "Mixed review", zh: "混合重溫", zhHans: "混合复习" },
  mixedReviewDescription: {
    en: "Start here for a balanced set from this grade.",
    zh: "從這裡開始本年級的均衡練習。",
    zhHans: "从这里开始本年级的均衡练习。"
  },
  warmupTitle: { en: "Speed warmup", zh: "速度熱身", zhHans: "速度热身" },
  warmupDescription: {
    en: "Short mental arithmetic before topic practice.",
    zh: "進入課題前先做短熱身。",
    zhHans: "进入课题前先做短热身。"
  },
  allPreviewTitle: { en: "All-grade practice", zh: "全年級練習", zhHans: "全年级练习" },
  allPreviewDescription: {
    en: "Let the arena choose a broad practice mix.",
    zh: "由練習場安排較廣的題目組合。",
    zhHans: "由练习场安排较广的题目组合。"
  }
} satisfies Record<string, LocalizedText>;

function ageRangeLabel(ageRange: string, language: Language) {
  const normalized = ageRange.replace("–", "-");
  if (language === "en") return `Age ${normalized}`;
  if (language === "zh-Hans") return `${normalized} 岁`;
  return `${normalized} 歲`;
}

function gradeShortLabel(grade: Grade, language: Language) {
  if (language === "en") return grade.id;
  return formatGradeLabel(grade.id, language, true);
}

function optionId(listboxId: string, value: GradeFilter) {
  return `${listboxId}-option-${value}`;
}

export function PracticeGradeRadarSelect({ value, onChange, language, text, t }: PracticeGradeRadarSelectProps) {
  const [open, setOpen] = useState(false);
  const [activeStage, setActiveStage] = useState<"primary" | "secondary">(() => (typeof value === "string" && value.startsWith("S") ? "secondary" : "primary"));
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listboxId = useId();

  const options = useMemo<GradeRadarOption[]>(() => {
    const gradeOptions = [...primaryGrades, ...secondaryGrades].map((grade) => ({
      value: grade.id,
      label: text(grade.name),
      shortLabel: gradeShortLabel(grade, language),
      focus: text(grade.focus),
      stage: grade.id.startsWith("P") ? "primary" : "secondary",
      grade
    })) satisfies GradeRadarOption[];

    return [
      {
        value: "all",
        label: t(allGradeOptionCopy.label),
        shortLabel: t(allGradeOptionCopy.shortLabel),
        focus: t(allGradeOptionCopy.focus),
        stage: "all"
      },
      ...gradeOptions
    ];
  }, [language, t, text]);

  const selectedOption = options.find((option) => option.value === value) ?? options[0];
  const stagedOptions = options.filter((option) => option.stage === activeStage);
  const activeOption = options[activeIndex] ?? selectedOption;
  const previewOption = selectedOption.value === "all" ? null : selectedOption;

  useEffect(() => {
    const nextIndex = Math.max(0, options.findIndex((option) => option.value === value));
    setActiveIndex(nextIndex);
    if (value !== "all") setActiveStage(value.startsWith("S") ? "secondary" : "primary");
  }, [options, value]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  function selectOption(nextValue: GradeFilter) {
    onChange(nextValue);
    setOpen(false);
    requestAnimationFrame(() => buttonRef.current?.focus());
  }

  function moveActive(delta: number) {
    const nextIndex = (activeIndex + delta + options.length) % options.length;
    const nextOption = options[nextIndex];
    setActiveIndex(nextIndex);
    if (nextOption?.stage === "primary" || nextOption?.stage === "secondary") setActiveStage(nextOption.stage);
  }

  function handleButtonKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      moveActive(event.key === "ArrowDown" ? 1 : -1);
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setOpen((current) => !current);
    }
  }

  function handleListKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      moveActive(event.key === "ArrowDown" ? 1 : -1);
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectOption(activeOption.value);
    }
  }

  return (
    <div ref={rootRef} className="min-w-0 text-sm font-bold text-slate-600 dark:text-slate-300">
      <div className="relative">
        <span id={`${listboxId}-label`}>{t(selectorCopy.buttonLabel)}</span>
        <button
          ref={buttonRef}
          type="button"
          aria-labelledby={`${listboxId}-label`}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listboxId : undefined}
          onClick={() => setOpen((current) => !current)}
          onKeyDown={handleButtonKeyDown}
          className={cn(
            "focus-ring mt-2 flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl border bg-white px-4 py-3 text-left text-base font-black text-slate-700 shadow-sm transition dark:bg-slate-950 dark:text-white",
            open
              ? "border-cyan-300/70 shadow-[0_0_0_4px_rgba(6,182,212,0.12)] dark:border-cyan-200/45"
              : "border-slate-200 hover:border-cyan-300/60 dark:border-white/10 dark:hover:border-cyan-200/35"
          )}
        >
          <span className="min-w-0 truncate">{selectedOption.label}</span>
          <span
            aria-hidden="true"
            className={cn(
              "grid h-7 w-7 shrink-0 place-items-center rounded-full bg-cyan-50 text-xs font-black text-cyan-700 transition dark:bg-cyan-300/10 dark:text-cyan-100",
              open && "rotate-180"
            )}
          >
            ^
          </span>
        </button>

        {open ? (
        <div
          id={listboxId}
          role="listbox"
          aria-labelledby={`${listboxId}-label`}
          aria-activedescendant={optionId(listboxId, activeOption.value)}
          tabIndex={-1}
          onKeyDown={handleListKeyDown}
          className="absolute left-0 top-[calc(100%+0.75rem)] z-30 max-h-[min(43rem,calc(100vh-8rem))] w-[min(39rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-[1.35rem] border border-slate-200/80 bg-white text-slate-950 shadow-[0_26px_80px_rgba(15,23,42,0.16)] dark:border-white/10 dark:bg-slate-950 dark:text-white sm:w-[39rem]"
        >
          <div className="border-b border-slate-200/80 bg-cyan-50/80 px-5 py-4 dark:border-white/10 dark:bg-cyan-950/35">
            <p className="text-lg font-black leading-tight text-slate-950 dark:text-white">{t(selectorCopy.title)}</p>
            <p className="mt-1.5 text-xs font-bold leading-5 text-slate-600 dark:text-slate-300">{t(selectorCopy.description)}</p>
          </div>

          <div className="grid gap-4 p-3 sm:p-4">
            <button
              type="button"
              id={optionId(listboxId, "all")}
              role="option"
              aria-selected={value === "all"}
              onClick={() => selectOption("all")}
              onMouseEnter={() => setActiveIndex(0)}
              className={cn(
                "focus-ring grid min-h-[3.75rem] grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border px-3 py-2 text-left transition",
                value === "all"
                  ? "border-cyan-300/70 bg-cyan-50 text-cyan-800 dark:border-cyan-200/35 dark:bg-cyan-300/10 dark:text-cyan-100"
                  : "border-slate-200/80 bg-slate-50/70 hover:bg-cyan-50/60 dark:border-white/10 dark:bg-white/[0.045] dark:hover:bg-cyan-300/10"
              )}
            >
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-cyan-100 text-sm font-black text-cyan-700 dark:bg-cyan-300/15 dark:text-cyan-100">
                {value === "all" ? "✓" : "*"}
              </span>
              <span className="min-w-0">
                <span className="block text-base font-black leading-tight">{t(allGradeOptionCopy.label)}</span>
                <span className="mt-1 block truncate text-xs font-bold text-slate-500 dark:text-slate-400">{t(allGradeOptionCopy.focus)}</span>
              </span>
              <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-[0.7rem] font-black text-cyan-700 dark:border-cyan-200/25 dark:bg-cyan-300/10 dark:text-cyan-100">
                {value === "all" ? t(selectorCopy.bestFit) : t(allGradeOptionCopy.shortLabel)}
              </span>
            </button>

            <div className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-200/80 bg-slate-100/70 p-1 dark:border-white/10 dark:bg-white/[0.055]">
              {(["primary", "secondary"] as const).map((stage) => (
                <button
                  key={stage}
                  type="button"
                  onClick={() => setActiveStage(stage)}
                  className={cn(
                    "focus-ring rounded-xl px-3 py-2 text-sm font-black transition",
                    activeStage === stage
                      ? "bg-white text-cyan-700 shadow-sm dark:bg-white dark:text-slate-950"
                      : "text-slate-600 hover:text-cyan-700 dark:text-slate-300 dark:hover:text-cyan-100"
                  )}
                >
                  {stage === "primary" ? t(selectorCopy.primary) : t(selectorCopy.secondary)}
                </button>
              ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-[9rem_minmax(0,1fr)] sm:items-center">
              <div className="relative mx-auto h-32 w-32 shrink-0 rounded-full border border-cyan-200/80 bg-[conic-gradient(from_24deg,rgba(6,182,212,0.24),rgba(16,185,129,0.16),rgba(245,158,11,0.20),rgba(6,182,212,0.24))] dark:border-cyan-200/25">
                <div className="absolute inset-4 rounded-full border border-cyan-200/70 dark:border-cyan-200/20" />
                <div className="absolute inset-9 grid place-items-center rounded-full bg-white text-2xl font-black text-cyan-800 shadow-lg dark:bg-slate-900 dark:text-cyan-100">
                  {previewOption ? previewOption.shortLabel : t(allGradeOptionCopy.shortLabel)}
                </div>
              </div>
              <div className="min-w-0 text-center sm:text-left">
                <p className="text-lg font-black leading-tight text-slate-950 dark:text-white">
                  {previewOption ? previewOption.label : t(selectorCopy.allPreviewTitle)}
                </p>
                <p className="mt-2 text-sm font-bold leading-6 text-slate-600 dark:text-slate-300">
                  {previewOption ? previewOption.focus : t(selectorCopy.allPreviewDescription)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {stagedOptions.map((option) => {
                const optionIndex = options.findIndex((candidate) => candidate.value === option.value);
                const selected = value === option.value;
                return (
                  <button
                    key={option.value}
                    id={optionId(listboxId, option.value)}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => selectOption(option.value)}
                    onMouseEnter={() => setActiveIndex(optionIndex)}
                    className={cn(
                      "focus-ring min-h-[3.25rem] rounded-2xl border px-3 py-2 text-center text-sm font-black transition",
                      selected
                        ? "border-slate-950 bg-slate-950 text-white shadow-lg dark:border-white dark:bg-white dark:text-slate-950"
                        : "border-slate-200/80 bg-slate-50 text-slate-700 hover:border-cyan-300/60 hover:bg-cyan-50 dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-200 dark:hover:bg-cyan-300/10"
                    )}
                  >
                    <span className="block truncate">{option.shortLabel}</span>
                    <span className="mt-0.5 block truncate text-[0.68rem] font-bold opacity-70">{option.grade ? ageRangeLabel(option.grade.ageRange, language) : ""}</span>
                  </button>
                );
              })}
            </div>

            <div>
              <div className="mb-2 flex items-center gap-3">
                <p className="shrink-0 text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{t(selectorCopy.recommended)}</p>
                <span className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
              </div>
              <div className="grid gap-2">
                <div className="grid min-h-[3.25rem] grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl bg-cyan-50/75 px-3 py-2 dark:bg-cyan-300/10">
                  <span className="grid h-8 w-8 place-items-center rounded-xl bg-cyan-100 text-sm font-black text-cyan-700 dark:bg-cyan-300/15 dark:text-cyan-100">1</span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black text-slate-950 dark:text-white">{t(selectorCopy.mixedReviewTitle)}</span>
                    <span className="mt-0.5 block truncate text-xs font-bold text-slate-500 dark:text-slate-400">{t(selectorCopy.mixedReviewDescription)}</span>
                  </span>
                  <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-[0.68rem] font-black text-cyan-700 dark:border-cyan-200/25 dark:bg-cyan-300/10 dark:text-cyan-100">{t(selectorCopy.bestFit)}</span>
                </div>
                <div className="grid min-h-[3.25rem] grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl px-3 py-2 hover:bg-slate-50 dark:hover:bg-white/[0.055]">
                  <span className="grid h-8 w-8 place-items-center rounded-xl bg-slate-100 text-sm font-black text-slate-600 dark:bg-white/[0.08] dark:text-slate-200">2</span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black text-slate-950 dark:text-white">{t(selectorCopy.warmupTitle)}</span>
                    <span className="mt-0.5 block truncate text-xs font-bold text-slate-500 dark:text-slate-400">{t(selectorCopy.warmupDescription)}</span>
                  </span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[0.68rem] font-black text-slate-600 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200">{t(selectorCopy.fast)}</span>
                </div>
              </div>
            </div>

            <p className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-black leading-5 text-amber-800 dark:border-amber-200/25 dark:bg-amber-300/10 dark:text-amber-100">
              {t(selectorCopy.guestNote)}
            </p>
          </div>
        </div>
        ) : null}
      </div>
      {open ? <div aria-hidden="true" className="h-[47rem] sm:h-[43rem]" /> : null}
    </div>
  );
}
