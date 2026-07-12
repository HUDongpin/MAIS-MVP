"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useSettings } from "@/components/providers/AppProviders";
import { isChineseLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const languageOptions = [
  { value: "en", triggerLabel: "English", menuLabel: "English", ariaLabel: { en: "Use English", zh: "使用英文", zhHans: "使用英文" } },
  { value: "zh-Hans", triggerLabel: "简体中文", menuLabel: "简体中文", ariaLabel: { en: "Use Simplified Chinese", zh: "使用簡體中文", zhHans: "使用简体中文" } },
  { value: "zh", triggerLabel: "繁體中文", menuLabel: "繁體中文", ariaLabel: { en: "Use Traditional Chinese", zh: "使用繁體中文", zhHans: "使用繁体中文" } }
] as const;

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
  const { language, setLanguage, t } = useSettings();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  // Every account keeps access to the full language menu. Restricting US-curriculum
  // users to English made the header selector a silent no-op even though the product
  // UI is fully bilingual (and Reports already offers all three languages).
  const visibleLanguageOptions = languageOptions;

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const activeLanguage = visibleLanguageOptions.find((option) => option.value === language) ?? visibleLanguageOptions[0] ?? languageOptions[0];
  const canChangeLanguage = visibleLanguageOptions.length > 1;

  useEffect(() => {
    if (!canChangeLanguage) {
      setOpen(false);
    }
  }, [canChangeLanguage]);

  return (
    <div ref={containerRef} className="relative inline-flex shrink-0">
      <button
        type="button"
        aria-label={isChineseLanguage(language) ? "語言選擇" : "Language selector"}
        aria-haspopup={canChangeLanguage ? "menu" : undefined}
        aria-expanded={canChangeLanguage ? open : undefined}
        aria-controls={canChangeLanguage && open ? menuId : undefined}
        onClick={() => {
          if (canChangeLanguage) {
            setOpen((current) => !current);
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
          aria-label={isChineseLanguage(language) ? "語言選單" : "Language menu"}
          className="absolute right-0 top-[calc(100%+0.65rem)] z-[60] w-[13.5rem] rounded-[1.75rem] border border-slate-200/75 bg-white/[0.96] p-2 shadow-2xl shadow-slate-900/15 ring-1 ring-white/80 backdrop-blur-2xl dark:border-cyan-300/20 dark:bg-slate-950/95 dark:ring-white/10"
        >
          {visibleLanguageOptions.map((option) => {
            const active = language === option.value;

            return (
              <button
                key={option.value}
                type="button"
                role="menuitemradio"
                aria-label={t(option.ariaLabel)}
                aria-checked={active}
                onClick={() => {
                  setLanguage(option.value);
                  setOpen(false);
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
