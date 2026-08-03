"use client";

import { useEffect } from "react";
import { primaryGrades, secondaryGrades } from "@/data/grades";
import { useSettings } from "@/components/providers/AppProviders";
import { dashboardGradeSelectorGroupLabel } from "@/components/dashboard/dashboardGradeSelectorLabel";
import { formatGradeLabelForCurriculum } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { CurriculumTrack, Grade, GradeId } from "@/types";

const unitedStatesCurriculumTracks = new Set<CurriculumTrack>(["US_CA_MATH", "US_NC_MATH", "US_AR_MATH", "US_FL_MATH"]);

function primaryGradesForCurriculumTrack(curriculumTrack: CurriculumTrack) {
  return unitedStatesCurriculumTracks.has(curriculumTrack) ? primaryGrades : primaryGrades.filter((grade) => grade.id !== "K");
}

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
  const curriculumTrack = currentUser?.curriculumTrack ?? "HK";
  const visiblePrimaryGrades = primaryGradesForCurriculumTrack(curriculumTrack);
  const visibleGrades = [...visiblePrimaryGrades, ...secondaryGrades];
  const studentJonCanBrowseCaliforniaK12 =
    currentUser?.role === "student" &&
    currentUser.id === "student-jon-us-ca-super" &&
    currentUser.curriculumTrack === "US_CA_MATH";
  const fixedStudentGrade = currentUser?.role === "student" && !studentJonCanBrowseCaliforniaK12
    ? currentUser.grade
    : null;
  const selectedGradeIsVisible = visibleGrades.some((grade) => grade.id === selectedGrade);
  const fixedStudentGradeIsVisible = fixedStudentGrade
    ? visibleGrades.some((grade) => grade.id === fixedStudentGrade)
    : false;
  const studentJonFallbackGrade = studentJonCanBrowseCaliforniaK12 && visibleGrades.some((grade) => grade.id === currentUser.grade)
    ? currentUser.grade
    : "P1";
  const displayedSelectedGrade = fixedStudentGrade && fixedStudentGradeIsVisible
    ? fixedStudentGrade
    : selectedGradeIsVisible
      ? selectedGrade
      : studentJonCanBrowseCaliforniaK12
        ? studentJonFallbackGrade
        : visibleGrades[0]?.id ?? "P1";
  const gradeRowGridClassName = visiblePrimaryGrades.length > 6 ? "grid-cols-4 sm:grid-cols-7" : "grid-cols-3 sm:grid-cols-6";

  useEffect(() => {
    if (fixedStudentGrade && fixedStudentGradeIsVisible) {
      if (selectedGrade !== fixedStudentGrade) {
        setSelectedGrade(fixedStudentGrade);
      }
      return;
    }

    if (!selectedGradeIsVisible) {
      setSelectedGrade(displayedSelectedGrade);
    }
  }, [
    displayedSelectedGrade,
    fixedStudentGrade,
    fixedStudentGradeIsVisible,
    selectedGrade,
    selectedGradeIsVisible,
    setSelectedGrade,
  ]);

  const renderGrade = (grade: Grade) => (
    <DashboardGradeButton
      key={grade.id}
      active={displayedSelectedGrade === grade.id}
      grade={grade}
      label={formatGradeLabelForCurriculum(grade.id, language, curriculumTrack, true)}
      locked={Boolean(fixedStudentGrade)}
      onSelect={setSelectedGrade}
    />
  );

  return (
    <div
      className="grid gap-3"
      role="radiogroup"
      aria-label={t(dashboardGradeSelectorGroupLabel(Boolean(fixedStudentGrade)))}
    >
      <div className={cn("grid gap-3", gradeRowGridClassName)} data-testid="dashboard-primary-grade-row">
        {visiblePrimaryGrades.map(renderGrade)}
      </div>
      <div className={cn("grid gap-3", gradeRowGridClassName)} data-testid="dashboard-secondary-grade-row">
        {secondaryGrades.map(renderGrade)}
      </div>
    </div>
  );
}
