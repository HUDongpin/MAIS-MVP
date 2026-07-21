import type {
  AssessmentStatus,
  AssessmentSubmissionStatus,
  AssessmentType,
  AssignmentStatus,
  GradeId,
  LocalizedText,
  SubmissionStatus,
  TeacherGradebookCell,
  TeacherGradebookColumn,
  TeacherGradebookData,
  TeacherGradebookStudentRow
} from "@/types";

/**
 * Pure aggregation for the teacher gradebook grid (the consolidated "markbook").
 *
 * Framework- and storage-agnostic: the server maps database records into the
 * input shapes below, this module normalizes assignments and assessments into a
 * single students-×-columns grid, and `gradebookToCsv` renders it for download.
 */

export type GradebookRosterInput = {
  studentId: string;
  studentName: string;
};

export type GradebookAssignmentSubmissionInput = {
  studentId: string;
  status: SubmissionStatus;
  /** 0–100 percentage scale (assignment scores are clamped to this range). */
  score: number | null;
};

export type GradebookAssignmentColumnInput = {
  id: string;
  title: LocalizedText;
  status: AssignmentStatus;
  dueAt: string | null;
  countsTowardsGrade: boolean;
  createdAt: string;
  submissions: GradebookAssignmentSubmissionInput[];
};

export type GradebookAssessmentSubmissionInput = {
  studentId: string;
  status: AssessmentSubmissionStatus;
  attemptNumber: number;
  score: number | null;
  maxScore: number;
};

export type GradebookAssessmentColumnInput = {
  id: string;
  title: LocalizedText;
  type: AssessmentType;
  status: AssessmentStatus;
  closesAt: string | null;
  /** Assessment grade weight. */
  weight: number;
  createdAt: string;
  submissions: GradebookAssessmentSubmissionInput[];
};

export type BuildTeacherGradebookInput = {
  class: { id: string; name: string; grade: GradeId };
  students: GradebookRosterInput[];
  assignments: GradebookAssignmentColumnInput[];
  assessments: GradebookAssessmentColumnInput[];
  now?: string;
};

const ASSIGNMENT_MAX_SCORE = 100;

/** Submission states that mean "the student has engaged" — a blank here is pending, not missing. */
const startedAssignmentStatuses = new Set<SubmissionStatus>([
  "in-progress",
  "submitted",
  "late",
  "correction-required",
  "correction-submitted",
  "graded",
  "resolved"
]);
const startedAssessmentStatuses = new Set<AssessmentSubmissionStatus>(["in-progress", "submitted", "graded", "late"]);

function roundOrNull(value: number | null): number | null {
  return value === null ? null : Math.round(value);
}

function averageOf(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

/** Effective ordering date so the grid reads left→right chronologically like a paper markbook. */
function columnSortKey(dueAt: string | null, createdAt: string): string {
  return dueAt ?? createdAt;
}

type NormalizedColumn = {
  column: Omit<TeacherGradebookColumn, "average" | "gradedCount" | "studentCount">;
  /** Resolves a student's cell for this column (state + raw/percentage scores). */
  cellFor: (studentId: string) => TeacherGradebookCell;
  sortKey: string;
  createdAt: string;
};

function normalizeAssignmentColumn(input: GradebookAssignmentColumnInput): NormalizedColumn {
  const byStudent = new Map<string, GradebookAssignmentSubmissionInput>();
  for (const submission of input.submissions) {
    byStudent.set(submission.studentId, submission);
  }

  return {
    column: {
      id: input.id,
      kind: "assignment",
      title: input.title,
      maxScore: ASSIGNMENT_MAX_SCORE,
      weight: null,
      countsTowardsGrade: input.countsTowardsGrade,
      dueAt: input.dueAt,
      status: input.status
    },
    createdAt: input.createdAt,
    sortKey: columnSortKey(input.dueAt, input.createdAt),
    cellFor: (studentId) => {
      const submission = byStudent.get(studentId);
      if (submission && submission.score !== null) {
        const percentage = Math.round(Math.max(0, Math.min(ASSIGNMENT_MAX_SCORE, submission.score)));
        return {
          columnId: input.id,
          state: "graded",
          score: percentage,
          maxScore: ASSIGNMENT_MAX_SCORE,
          percentage
        };
      }
      const started = submission ? startedAssignmentStatuses.has(submission.status) : false;
      return {
        columnId: input.id,
        state: started ? "pending" : "missing",
        score: null,
        maxScore: null,
        percentage: null
      };
    }
  };
}

/** Pick the attempt that best represents a student's assessment result. */
function bestAssessmentSubmission(
  submissions: GradebookAssessmentSubmissionInput[]
): GradebookAssessmentSubmissionInput | null {
  if (submissions.length === 0) return null;
  const scored = submissions.filter((submission) => submission.score !== null);
  if (scored.length > 0) {
    return scored.reduce((best, candidate) => {
      const bestPct = percentageFor(best.score, best.maxScore) ?? -1;
      const candidatePct = percentageFor(candidate.score, candidate.maxScore) ?? -1;
      if (candidatePct > bestPct) return candidate;
      if (candidatePct === bestPct && candidate.attemptNumber > best.attemptNumber) return candidate;
      return best;
    });
  }
  // No graded attempt yet — surface the latest attempt so its status drives pending/missing.
  return submissions.reduce((latest, candidate) => (candidate.attemptNumber > latest.attemptNumber ? candidate : latest));
}

function percentageFor(score: number | null, maxScore: number): number | null {
  if (score === null || maxScore <= 0) return null;
  return Math.round(Math.max(0, Math.min(100, (score / maxScore) * 100)));
}

function normalizeAssessmentColumn(input: GradebookAssessmentColumnInput): NormalizedColumn {
  const byStudent = new Map<string, GradebookAssessmentSubmissionInput[]>();
  for (const submission of input.submissions) {
    const list = byStudent.get(submission.studentId);
    if (list) list.push(submission);
    else byStudent.set(submission.studentId, [submission]);
  }
  const representativeMax = input.submissions.find((submission) => submission.maxScore > 0)?.maxScore ?? 100;

  return {
    column: {
      id: input.id,
      kind: "assessment",
      title: input.title,
      maxScore: representativeMax,
      weight: input.weight,
      countsTowardsGrade: input.weight > 0,
      dueAt: input.closesAt,
      status: input.status
    },
    createdAt: input.createdAt,
    sortKey: columnSortKey(input.closesAt, input.createdAt),
    cellFor: (studentId) => {
      const submission = bestAssessmentSubmission(byStudent.get(studentId) ?? []);
      const percentage = submission ? percentageFor(submission.score, submission.maxScore) : null;
      if (submission && submission.score !== null && percentage !== null) {
        return {
          columnId: input.id,
          state: "graded",
          score: submission.score,
          maxScore: submission.maxScore,
          percentage
        };
      }
      const started = submission ? startedAssessmentStatuses.has(submission.status) : false;
      return {
        columnId: input.id,
        state: started ? "pending" : "missing",
        score: null,
        maxScore: null,
        percentage: null
      };
    }
  };
}

export function buildTeacherGradebook(input: BuildTeacherGradebookInput): TeacherGradebookData {
  const normalized: NormalizedColumn[] = [
    ...input.assignments.map(normalizeAssignmentColumn),
    ...input.assessments.map(normalizeAssessmentColumn)
  ].sort((a, b) => {
    if (a.sortKey !== b.sortKey) return a.sortKey < b.sortKey ? -1 : 1;
    if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1;
    return a.column.id < b.column.id ? -1 : a.column.id > b.column.id ? 1 : 0;
  });

  const students: TeacherGradebookStudentRow[] = input.students.map((student) => {
    const cells = normalized.map((entry) => entry.cellFor(student.studentId));
    const counting = normalized
      .map((entry, index) => ({ counts: entry.column.countsTowardsGrade, cell: cells[index] }))
      .filter((pair) => pair.counts);
    const gradedPercentages = counting
      .filter((pair) => pair.cell.state === "graded" && pair.cell.percentage !== null)
      .map((pair) => pair.cell.percentage as number);
    return {
      studentId: student.studentId,
      studentName: student.studentName,
      cells,
      average: averageOf(gradedPercentages),
      gradedCount: gradedPercentages.length,
      totalCount: counting.length
    };
  });

  const columns: TeacherGradebookColumn[] = normalized.map((entry) => {
    const percentages = students
      .map((student) => student.cells.find((cell) => cell.columnId === entry.column.id))
      .filter((cell): cell is TeacherGradebookCell => Boolean(cell) && cell!.state === "graded" && cell!.percentage !== null)
      .map((cell) => cell.percentage as number);
    return {
      ...entry.column,
      average: entry.column.countsTowardsGrade ? averageOf(percentages) : null,
      gradedCount: percentages.length,
      studentCount: students.length
    };
  });

  const studentAverages = students
    .map((student) => student.average)
    .filter((value): value is number => value !== null);

  return {
    generatedAt: input.now ?? new Date().toISOString(),
    class: input.class,
    columns,
    students,
    classAverage: averageOf(studentAverages)
  };
}

function csvCell(value: string | number | null | undefined): string {
  const text = value === null || typeof value === "undefined" ? "" : String(value);
  return `"${text.replace(/"/g, "\"\"")}"`;
}

/** Render the gradebook grid as CSV: student rows, one column per graded item, plus a class-average footer. */
export function gradebookToCsv(data: TeacherGradebookData): string {
  const columnHeaders = data.columns.map((column) => `${column.title.en} (/${roundOrNull(column.maxScore)})`);
  const header = ["Student", ...columnHeaders, "Average %"];

  const studentRows = data.students.map((student) => [
    student.studentName,
    ...student.cells.map((cell) => {
      if (cell.state === "graded") return cell.score ?? "";
      if (cell.state === "pending") return "pending";
      return "";
    }),
    student.average ?? ""
  ]);

  const footer = ["Class average %", ...data.columns.map((column) => column.average ?? ""), data.classAverage ?? ""];

  return [header, ...studentRows, footer].map((row) => row.map(csvCell).join(",")).join("\n");
}
