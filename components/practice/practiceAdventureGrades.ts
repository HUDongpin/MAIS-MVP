import type { GradeId } from "@/types";

export type PracticeAdventureGradeFilter = GradeId | "all";

export type PracticeAdventureGradeChipLike = Readonly<{
  id: GradeId;
  label: string;
}>;

export type PracticeAdventureGradeLockInput = Readonly<{
  gradeFilter: PracticeAdventureGradeFilter;
  selectedGrade: GradeId;
  studentGrade?: GradeId | null;
  allowStudentGradeSelection?: boolean;
}>;

export type PracticeAdventureGradeLock = Readonly<{
  activeGradeFilter: PracticeAdventureGradeFilter;
  activeGradeId: GradeId;
  gradeSelectionDisabled: boolean;
}>;

export function partitionPracticeAdventureGradeChips<TGradeChip extends PracticeAdventureGradeChipLike>(gradeChips: readonly TGradeChip[]) {
  const primary: TGradeChip[] = [];
  const secondary: TGradeChip[] = [];

  gradeChips.forEach((grade) => {
    if (grade.id === "K" || grade.id.startsWith("P")) {
      primary.push(grade);
      return;
    }

    secondary.push(grade);
  });

  return { primary, secondary };
}

export function resolvePracticeAdventureGradeLock({
  gradeFilter,
  selectedGrade,
  studentGrade,
  allowStudentGradeSelection = false
}: PracticeAdventureGradeLockInput): PracticeAdventureGradeLock {
  if (studentGrade && !allowStudentGradeSelection) {
    return {
      activeGradeFilter: studentGrade,
      activeGradeId: studentGrade,
      gradeSelectionDisabled: true
    };
  }

  return {
    activeGradeFilter: gradeFilter,
    activeGradeId: gradeFilter === "all" ? selectedGrade : gradeFilter,
    gradeSelectionDisabled: false
  };
}
