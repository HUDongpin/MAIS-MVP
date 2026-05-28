"use client";

import { useId, useState } from "react";
import { AnimatePresence, motion } from "@/components/ui/Motion";
import { primaryGrades, secondaryGrades, grades } from "@/data/grades";
import { useSettings } from "@/components/providers/AppProviders";
import { formatGradeLabel, formatGradeLabelForCurriculum, isChineseLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { CurriculumTrack, Grade, GradeId, Language, LocalizedText } from "@/types";

type GradeBand = "primary" | "secondary";

function formatCompactSelectorGradeLabel(grade: Grade, language: Language, curriculumTrack: CurriculumTrack) {
  if (curriculumTrack === "MAINLAND_PEP_HIGH") return formatGradeLabelForCurriculum(grade.id, language, curriculumTrack, true);
  // Compact tiles need stable short labels; long curriculum names overflow the 64px buttons.
  if (isChineseLanguage(language) && grade.id.startsWith("P")) return grade.name.zh;
  return formatGradeLabel(grade.id, language, true);
}

function GradeButton({
  active,
  compact,
  displayName,
  grade,
  label,
  language,
  locked,
  onSelect
}: {
  active: boolean;
  compact: boolean;
  displayName: string;
  grade: Grade;
  label: string;
  language: Language;
  locked: boolean;
  onSelect: (grade: GradeId) => void;
}) {
  const showDisplayName = !compact && displayName !== label;
  const hasLongCompactChineseLabel = compact && isChineseLanguage(language) && label.length > 2;

  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      aria-disabled={locked}
      aria-label={[label, displayName !== label ? displayName : "", grade.ageRange].filter(Boolean).join(" ")}
      disabled={locked}
      onClick={() => onSelect(grade.id)}
      className={cn(
        "focus-ring relative overflow-hidden rounded-2xl border transition",
        locked ? (active ? "cursor-default opacity-75" : "cursor-not-allowed opacity-45") : "hover:-translate-y-1",
        compact
          ? "grid h-16 w-16 shrink-0 place-items-center px-2 py-3 text-center"
          : "min-h-[5.75rem] px-3.5 py-3 text-left sm:min-h-[6.5rem] sm:px-4 sm:py-3.5",
        locked
          ? active
            ? "border-slate-300/80 bg-slate-100 text-slate-500 shadow-none dark:border-white/10 dark:bg-white/[0.08] dark:text-slate-400"
            : "border-slate-200/70 bg-slate-50/80 text-slate-400 dark:border-white/10 dark:bg-white/[0.035] dark:text-slate-500"
          : active
            ? "border-cyan-300/70 bg-slate-950 text-white shadow-sm dark:bg-white dark:text-slate-950"
            : "border-slate-200/80 bg-white/70 text-slate-800 hover:bg-white dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-100 dark:hover:bg-white/[0.1]"
      )}
    >
      <span className={cn("absolute inset-x-0 top-0 h-1 bg-gradient-to-r", grade.color)} />
      {active ? <motion.span layoutId="grade-selected" className="absolute inset-0 -z-10 bg-gradient-to-br from-cyan-500/10 to-violet-500/10" /> : null}
      <span className={cn("block font-black leading-none", hasLongCompactChineseLabel ? "text-base" : "text-2xl")}>{label}</span>
      {showDisplayName ? <span className="mt-1.5 block whitespace-nowrap text-sm font-bold leading-5 opacity-85 sm:mt-2.5">{displayName}</span> : null}
      {!compact ? <span className={cn("hidden text-[11px] font-medium opacity-60 sm:block", showDisplayName ? "mt-0.5 sm:mt-1" : "mt-2")}>{grade.ageRange}</span> : null}
    </button>
  );
}

function GradeGroup({
  grades,
  heading,
  expanded,
  onToggle,
  selectedGrade,
  onSelect,
  curriculumTrack: requestedCurriculumTrack,
  locked,
  respectCurrentStudentProfile
}: {
  grades: Grade[];
  heading: LocalizedText;
  expanded: boolean;
  onToggle: () => void;
  selectedGrade: GradeId;
  onSelect: (grade: GradeId) => void;
  curriculumTrack?: CurriculumTrack;
  locked: boolean;
  respectCurrentStudentProfile: boolean;
}) {
  const { currentUser, language, text } = useSettings();
  const useCurrentStudentProfile = respectCurrentStudentProfile && currentUser?.role === "student";
  const curriculumTrack = useCurrentStudentProfile ? currentUser.curriculumTrack : requestedCurriculumTrack ?? "HK";
  const contentId = useId();
  const selectedInGroup = grades.find((grade) => grade.id === selectedGrade);
  const gradeLocked = locked || useCurrentStudentProfile;

  return (
    <section className="space-y-2.5" aria-label={text(heading)}>
      <button
        type="button"
        aria-controls={contentId}
        aria-expanded={expanded}
        onClick={onToggle}
        className="focus-ring group flex w-full items-center gap-3 rounded-xl px-1 py-1.5 text-left transition hover:text-cyan-600 dark:hover:text-cyan-200"
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="text-xs font-black uppercase tracking-[0.2em] text-cyan-500 dark:text-cyan-300">{text(heading)}</span>
          {selectedInGroup ? (
            <span className="rounded-full border border-cyan-300/35 bg-cyan-400/[0.10] px-2 py-0.5 text-[11px] font-black uppercase tracking-normal text-cyan-700 dark:text-cyan-100">
              {formatGradeLabelForCurriculum(selectedInGroup.id, language, curriculumTrack, true)}
            </span>
          ) : null}
        </span>
        <span className="h-px flex-1 bg-slate-200/70 transition group-hover:bg-cyan-300/60 dark:bg-white/10 dark:group-hover:bg-cyan-200/30" />
        <span
          aria-hidden="true"
          className={cn(
            "grid h-6 w-6 shrink-0 place-items-center rounded-full border border-slate-200/80 bg-white/70 text-xs font-black text-slate-500 transition dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300",
            expanded && "rotate-180 border-cyan-300/60 text-cyan-600 dark:text-cyan-200"
          )}
        >
          ⌄
        </span>
      </button>
      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            id={contentId}
            className="overflow-hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <div className="grid grid-cols-2 gap-3 pb-1 sm:grid-cols-3">
              {grades.map((grade) => (
                <GradeButton
                  key={grade.id}
                  active={selectedGrade === grade.id}
                  compact={false}
                  displayName={text(grade.name)}
                  grade={grade}
                  label={formatGradeLabelForCurriculum(grade.id, language, curriculumTrack, true)}
                  language={language}
                  locked={gradeLocked}
                  onSelect={onSelect}
                />
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}

export function GradeSelector({
  compact = false,
  curriculumTrack: requestedCurriculumTrack,
  locked = false,
  value,
  onChange,
  respectCurrentStudentProfile = true
}: {
  compact?: boolean;
  curriculumTrack?: CurriculumTrack;
  locked?: boolean;
  value?: GradeId;
  onChange?: (grade: GradeId) => void;
  respectCurrentStudentProfile?: boolean;
}) {
  const { currentUser, language, selectedGrade, setSelectedGrade, text, t } = useSettings();
  const [openBand, setOpenBand] = useState<GradeBand | null>(null);
  const useCurrentStudentProfile = respectCurrentStudentProfile && currentUser?.role === "student";
  const gradeLocked = locked || useCurrentStudentProfile;
  const curriculumTrack = useCurrentStudentProfile ? currentUser.curriculumTrack : requestedCurriculumTrack ?? "HK";
  const selectedGradeValue = value ?? selectedGrade;
  const selectGrade = onChange ?? setSelectedGrade;

  const toggleBand = (band: GradeBand) => {
    setOpenBand((currentBand) => (currentBand === band ? null : band));
  };

  if (compact) {
    return (
      <div
        className="flex flex-wrap gap-3"
        role="radiogroup"
        aria-label={t(gradeLocked ? { en: "Fixed grade", zh: "固定年級" } : { en: "Select grade", zh: "選擇年級" })}
      >
        {grades.map((grade) => (
          <GradeButton
            key={grade.id}
            active={selectedGradeValue === grade.id}
            compact
            displayName={text(grade.name)}
            grade={grade}
            label={formatCompactSelectorGradeLabel(grade, language, curriculumTrack)}
            language={language}
            locked={gradeLocked}
            onSelect={selectGrade}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className="space-y-3"
      role="radiogroup"
      aria-label={t(gradeLocked ? { en: "Fixed grade", zh: "固定年級" } : { en: "Select grade", zh: "選擇年級" })}
    >
      <GradeGroup
        grades={primaryGrades}
        heading={{ en: "Primary", zh: "小學" }}
        expanded={openBand === "primary"}
        onToggle={() => toggleBand("primary")}
        selectedGrade={selectedGradeValue}
        onSelect={selectGrade}
        curriculumTrack={curriculumTrack}
        locked={locked}
        respectCurrentStudentProfile={respectCurrentStudentProfile}
      />
      <GradeGroup
        grades={secondaryGrades}
        heading={{ en: "Secondary", zh: "中學" }}
        expanded={openBand === "secondary"}
        onToggle={() => toggleBand("secondary")}
        selectedGrade={selectedGradeValue}
        onSelect={selectGrade}
        curriculumTrack={curriculumTrack}
        locked={locked}
        respectCurrentStudentProfile={respectCurrentStudentProfile}
      />
    </div>
  );
}
