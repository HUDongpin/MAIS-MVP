"use client";

import { useSettings } from "@/components/providers/AppProviders";
import { isChineseLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const languageOptions = [
  { value: "en", label: "ENG", ariaLabel: { en: "Use English", zh: "使用英文", zhHans: "使用英文" } },
  { value: "zh", label: "繁", ariaLabel: { en: "Use Traditional Chinese", zh: "使用繁體中文", zhHans: "使用繁体中文" } },
  { value: "zh-Hans", label: "简", ariaLabel: { en: "Use Simplified Chinese", zh: "使用簡體中文", zhHans: "使用简体中文" } }
] as const;

export function LanguageToggle() {
  const { language, setLanguage, t } = useSettings();

  return (
    <div
      className="inline-flex shrink-0 rounded-full border border-slate-200/70 bg-white/70 p-1 shadow-sm backdrop-blur dark:border-cyan-300/20 dark:bg-white/[0.07]"
      aria-label={isChineseLanguage(language) ? "語言選擇" : "Language selector"}
      role="group"
    >
      {languageOptions.map((option) => {
        const active = language === option.value;

        return (
          <button
            key={option.value}
            type="button"
            aria-label={t(option.ariaLabel)}
            aria-pressed={active}
            onClick={() => setLanguage(option.value)}
            className={cn(
              "focus-ring min-w-12 whitespace-nowrap rounded-full px-2.5 py-1.5 text-sm font-black transition xl:px-3",
              active
                ? "bg-cyan-300 text-slate-950 shadow-lg shadow-cyan-400/25 ring-1 ring-cyan-100/70"
                : "text-slate-500 hover:bg-slate-900/5 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
