"use client";

import { primaryGrades, secondaryGrades } from "@/data/grades";
import { useSettings } from "@/components/providers/AppProviders";
import { formatGradeLabelForCurriculum } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { Grade, GradeId } from "@/types";

function DashboardGradeButton({
  active,
  grade,
  label,
  locked,
  onSelect
}: {
  active: boolean;
  grade: Grade;
  label: string;
  locked: boolean;
  onSelect: (grade: GradeId) => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      aria-disabled={locked}
      aria-label={`${label} ${grade.ageRange}`}
      data-testid={`dashboard-grade-${grade.id}`}
      disabled={locked}
      onClick={() => onSelect(grade.id)}
      className={cn(
        "focus-ring relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl border px-2 py-3 text-center transition",
        locked ? (active ? "cursor-default" : "cursor-not-allowed opacity-45") : "hover:-translate-y-1",
        active
          ? "border-cyan-300/70 bg-slate-950 text-white shadow-sm dark:bg-white dark:text-slate-950"
          : "border-slate-200/80 bg-white/70 text-slate-800 hover:bg-white dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-100 dark:hover:bg-white/[0.1]"
      )}
    >
      <span className={cn("absolute inset-x-0 top-0 h-1 bg-gradient-to-r", grade.color)} />
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-0 -z-10 opacity-0 transition",
          active && "bg-gradient-to-br from-cyan-500/10 to-violet-500/10 opacity-100"
        )}
      />
      <span className="block text-2xl font-black leading-none">{label}</span>
    </button>
  );
}

export function DashboardGradeSelectorGrid() {
  const { currentUser, language, selectedGrade, setSelectedGrade, t } = useSettings();
  const gradeLocked = currentUser?.role === "student";
  const curriculumTrack = currentUser?.curriculumTrack ?? "HK";

  const renderGrade = (grade: Grade) => (
    <DashboardGradeButton
      key={grade.id}
      active={selectedGrade === grade.id}
      grade={grade}
      label={formatGradeLabelForCurriculum(grade.id, language, curriculumTrack, true)}
      locked={gradeLocked}
      onSelect={setSelectedGrade}
    />
  );

  return (
    <div
      className="grid gap-3"
      role="radiogroup"
      aria-label={t(gradeLocked ? { en: "Fixed grade", zh: "固定年級" } : { en: "Select grade", zh: "選擇年級" })}
    >
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6" data-testid="dashboard-primary-grade-row">
        {primaryGrades.map(renderGrade)}
      </div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6" data-testid="dashboard-secondary-grade-row">
        {secondaryGrades.map(renderGrade)}
      </div>
    </div>
  );
}
