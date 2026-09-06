"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useSettings } from "@/components/providers/AppProviders";
import { cn } from "@/lib/utils";
import type { CurriculumTrack, Language } from "@/types";

const languageOptions = [
  { value: "en", triggerLabel: "English", menuLabel: "English", ariaLabel: { en: "Use English", zh: "使用英文", zhHans: "使用英文" } },
  { value: "zh-Hans", triggerLabel: "简体中文", menuLabel: "简体中文", ariaLabel: { en: "Use Simplified Chinese", zh: "使用簡體中文", zhHans: "使用简体中文" } },
  { value: "zh", triggerLabel: "繁體中文", menuLabel: "繁體中文", ariaLabel: { en: "Use Traditional Chinese", zh: "使用繁體中文", zhHans: "使用繁体中文" } }
] as const;

const languageToggleLabelMap: Record<Language, { selector: string; menu: string }> = {
  en: { selector: "Language selector", menu: "Language menu" },
  zh: { selector: "語言選擇", menu: "語言選單" },
  "zh-Hans": { selector: "语言选择", menu: "语言菜单" }
};

export function languageToggleLabels(language: Language) {
  return languageToggleLabelMap[language];
}

type LanguageMenuMoveKey = "ArrowDown" | "ArrowUp" | "Home" | "End";

export function nextLanguageMenuIndex(
  currentIndex: number,
  key: LanguageMenuMoveKey,
  optionCount: number
) {
  if (optionCount <= 0) return -1;
  if (key === "Home") return 0;
  if (key === "End") return optionCount - 1;
  const direction = key === "ArrowDown" ? 1 : -1;
  return (currentIndex + direction + optionCount) % optionCount;
}

export function isUnitedStatesLanguageRestricted(curriculumTrack: CurriculumTrack) {
  return curriculumTrack === "US_CA_MATH"
    || curriculumTrack === "US_NC_MATH"
    || curriculumTrack === "US_AR_MATH"
    || curriculumTrack === "US_FL_MATH";
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={cn("h-4 w-4 shrink-0 text-slate-500 transition dark:text-slate-300", open ? "rotate-180" : "")}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.5"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="3"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function LanguageToggle() {
  const { currentUser, language, setLanguage, t } = useSettings();
  const labels = languageToggleLabels(language);
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const menuId = useId();
  // American curriculum ships English only (owner policy, 2026-08-27), so US accounts
  // get an English-only menu. BUG-008 previously removed this lock because it made the
  // selector a silent no-op — that was an agent's P2 call, and the policy supersedes it.
  //
  // Hiding the options is not enough on its own: an account that already holds a Chinese
  // preference would otherwise sit in a Chinese shell with no visible way back. Snap such
  // accounts to English instead of stranding them.
  const isUnitedStatesAccount = currentUser
    ? isUnitedStatesLanguageRestricted(currentUser.curriculumTrack)
    : false;
  const visibleLanguageOptions = isUnitedStatesAccount
    ? languageOptions.filter((option) => option.value === "en")
    : languageOptions;

  useEffect(() => {
    if (isUnitedStatesAccount && language !== "en") setLanguage("en");
  }, [isUnitedStatesAccount, language, setLanguage]);
  const activeIndex = Math.max(
    0,
    visibleLanguageOptions.findIndex((option) => option.value === language)
  );
  const activeLanguage = visibleLanguageOptions[activeIndex] ?? languageOptions[0];
  const canChangeLanguage = visibleLanguageOptions.length > 1;

  const openMenuAndFocus = () => {
    setFocusedIndex(activeIndex);
    setOpen(true);
  };

  const closeMenuAndRestoreFocus = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const moveMenuFocus = (key: LanguageMenuMoveKey) => {
    const nextIndex = nextLanguageMenuIndex(
      focusedIndex,
      key,
      visibleLanguageOptions.length
    );
    setFocusedIndex(nextIndex);
    optionRefs.current[nextIndex]?.focus();
  };

  useEffect(() => {
    if (open) {
      optionRefs.current[focusedIndex]?.focus();
    }
  }, [focusedIndex, open]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenuAndRestoreFocus();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!canChangeLanguage) {
      setOpen(false);
    }
  }, [canChangeLanguage]);

  return (
    <div ref={containerRef} className="relative inline-flex shrink-0">
      <button
        ref={triggerRef}
        type="button"
        aria-label={labels.selector}
        aria-haspopup={canChangeLanguage ? "menu" : undefined}
        aria-expanded={canChangeLanguage ? open : undefined}
        aria-controls={canChangeLanguage && open ? menuId : undefined}
        onClick={() => {
          if (canChangeLanguage) {
            if (open) {
              setOpen(false);
            } else {
              openMenuAndFocus();
            }
          }
        }}
        onKeyDown={(event) => {
          if (
            canChangeLanguage &&
            (event.key === "Enter" || event.key === " " || event.key === "ArrowDown")
          ) {
            event.preventDefault();
            openMenuAndFocus();
          }
        }}
        className={cn(
          "focus-ring inline-flex h-11 w-fit max-w-[calc(100vw-2rem)] items-center justify-center gap-2 rounded-full border bg-white/[0.82] px-4 text-base font-black text-slate-950 shadow-sm backdrop-blur transition dark:bg-white/[0.08] dark:text-white",
          open
            ? "border-cyan-300 shadow-xl shadow-cyan-500/20 ring-4 ring-cyan-300/25 dark:border-cyan-300/40"
            : "border-slate-200/75 hover:border-cyan-300/60 hover:bg-white dark:border-cyan-300/20 dark:hover:bg-white/[0.12]",
          canChangeLanguage ? "cursor-pointer" : "cursor-default"
        )}
      >
        <span className="whitespace-nowrap text-left">{activeLanguage.triggerLabel}</span>
        {canChangeLanguage ? <ChevronIcon open={open} /> : null}
      </button>

      {canChangeLanguage && open ? (
        <div
          id={menuId}
          role="menu"
          aria-label={labels.menu}
          className="absolute right-0 top-[calc(100%+0.65rem)] z-[60] w-[13.5rem] rounded-[1.75rem] border border-slate-200/75 bg-white/[0.96] p-2 shadow-2xl shadow-slate-900/15 ring-1 ring-white/80 backdrop-blur-2xl dark:border-cyan-300/20 dark:bg-slate-950/95 dark:ring-white/10"
        >
          {visibleLanguageOptions.map((option, index) => {
            const active = language === option.value;

            return (
              <button
                key={option.value}
                ref={(element) => {
                  optionRefs.current[index] = element;
                }}
                type="button"
                role="menuitemradio"
                aria-label={t(option.ariaLabel)}
                aria-checked={active}
                tabIndex={focusedIndex === index ? 0 : -1}
                onFocus={() => setFocusedIndex(index)}
                onClick={() => {
                  setLanguage(option.value);
                  closeMenuAndRestoreFocus();
                }}
                onKeyDown={(event) => {
                  if (
                    event.key === "ArrowDown" ||
                    event.key === "ArrowUp" ||
                    event.key === "Home" ||
                    event.key === "End"
                  ) {
                    event.preventDefault();
                    moveMenuFocus(event.key);
                  } else if (event.key === "Escape") {
                    event.preventDefault();
                    event.stopPropagation();
                    closeMenuAndRestoreFocus();
                  } else if (event.key === "Tab") {
                    // Keep the browser's normal forward/backward focus movement,
                    // but do not leave an orphaned menu open after focus departs.
                    setOpen(false);
                  }
                }}
                className={cn(
                  "focus-ring flex h-12 w-full items-center justify-between gap-3 rounded-[1.15rem] px-4 text-left text-[15px] font-black transition",
                  active
                    ? "bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/20"
                    : "text-slate-600 hover:bg-slate-900/5 hover:text-slate-950 dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-white"
                )}
              >
                <span>{option.menuLabel}</span>
                {active ? <CheckIcon /> : <span aria-hidden="true" className="h-5 w-5 shrink-0" />}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
