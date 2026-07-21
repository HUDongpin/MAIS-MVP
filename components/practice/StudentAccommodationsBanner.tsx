"use client";

import { useSettings } from "@/components/providers/AppProviders";
import { useStudentAccommodations } from "@/components/practice/useStudentAccommodations";
import { accommodationSummaryChips } from "@/lib/accommodations";

// A quiet, reassuring surface that shows the learner which accommodations are
// active for them right now (extended time, read-aloud, fewer choices, calculator
// policy). Renders nothing when there is no plan on record, so it never adds noise
// for students without accommodations.
export function StudentAccommodationsBanner() {
  const { t } = useSettings();
  const { accommodations, loaded } = useStudentAccommodations();
  if (!loaded) return null;

  const chips = accommodationSummaryChips(accommodations);
  if (chips.length === 0) return null;

  return (
    <section
      className="rounded-3xl border border-violet-100 bg-violet-50/70 p-4 dark:border-violet-500/20 dark:bg-violet-500/10"
      aria-label={t({ en: "Your learning supports", zh: "你的學習支援", zhHans: "你的学习支持" })}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="text-xs font-black uppercase tracking-[0.16em] text-violet-700 dark:text-violet-200">
          {t({ en: "Your supports", zh: "你的支援", zhHans: "你的支持" })}
        </span>
        <div className="flex flex-wrap gap-2">
          {chips.map((chip) => (
            <span
              key={chip.en}
              className="rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-violet-700 shadow-sm dark:bg-white/10 dark:text-violet-100"
            >
              {t(chip)}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
