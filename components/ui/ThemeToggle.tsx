"use client";

import { useSettings } from "@/components/providers/AppProviders";

export function ThemeToggle() {
  const { t, theme, toggleTheme } = useSettings();
  const label = theme === "dark"
    ? { en: "Switch to light mode", zh: "切換至淺色模式" }
    : { en: "Switch to dark mode", zh: "切換至深色模式" };

  return (
    <button
      type="button"
      aria-label={t(label)}
      onClick={toggleTheme}
      className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/70 bg-white/75 text-lg shadow-sm transition hover:-translate-y-0.5 hover:bg-white dark:border-white/10 dark:bg-white/[0.07] dark:hover:bg-white/[0.12]"
    >
      <span aria-hidden="true">{theme === "dark" ? "☀️" : "🌙"}</span>
    </button>
  );
}
