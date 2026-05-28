"use client";

import Link from "next/link";
import { useSettings } from "@/components/providers/AppProviders";

export function GamePracticeBackLink() {
  const { t } = useSettings();

  return (
    <Link
      href="/practice"
      className="focus-ring inline-flex rounded-full border border-cyan-300/45 bg-white/85 px-4 py-2 text-sm font-black text-cyan-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-cyan-50 dark:border-cyan-200/20 dark:bg-white/[0.07] dark:text-cyan-100 dark:hover:bg-white/[0.12]"
    >
      {t({ en: "Back to Practice", zh: "返回練習場", zhHans: "返回练习场" })}
    </Link>
  );
}
