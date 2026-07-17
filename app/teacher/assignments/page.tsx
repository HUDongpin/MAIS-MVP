import { redirect } from "next/navigation";
import { TeacherAssignmentsManager, type TeacherAssignmentQueueFilter } from "@/components/teacher/TeacherManagementViews";
import { getTeacherAssignmentDetailData, getTeacherAssignments } from "@/lib/server/userStore";
import { emptyTeacherAssignments } from "../emptyTeacherData";
import { getTeacherFoundationForPage, getTeacherShellForLayout } from "../getTeacherFoundation";

const assignmentQueueFilters = new Set<TeacherAssignmentQueueFilter>(["all", "grading", "correction-required", "correction-review"]);
const emptyAssignmentQueueCounts: Record<TeacherAssignmentQueueFilter, number> = {
  all: 0,
  grading: 0,
  "correction-required": 0,
  "correction-review": 0
};

function normalizeAssignmentQueueFilter(value?: string): TeacherAssignmentQueueFilter {
  if (value === "returned") return "correction-required";
  return assignmentQueueFilters.has(value as TeacherAssignmentQueueFilter) ? (value as TeacherAssignmentQueueFilter) : "all";
}

export default async function TeacherAssignmentsPage({ searchParams }: { searchParams: Promise<{ assignment?: string; classId?: string; filter?: string; q?: string; submission?: string }> }) {
  const shell = await getTeacherShellForLayout();
  const params = await searchParams;
  const activeFilter = normalizeAssignmentQueueFilter(params.filter);

  if (!shell.classes.length) {
    return (
      <TeacherAssignmentsManager
        assignments={emptyTeacherAssignments}
        classes={shell.classes}
        activeFilter={activeFilter}
        activeClassId={params.classId ?? ""}
        query={params.q?.trim() ?? ""}
        queueCounts={emptyAssignmentQueueCounts}
        totalCount={0}
      />
    );
  }

  const foundation = await getTeacherFoundationForPage();
  if (params.assignment) {
    const assignmentId = encodeURIComponent(params.assignment);
    redirect(params.submission
      ? `/teacher/assignments/${assignmentId}/submissions/${encodeURIComponent(params.submission)}`
      : `/teacher/assignments/${assignmentId}`);
  }

  const assignments = await getTeacherAssignments(foundation.teacher.id);
  const assignmentDetails = await Promise.all((assignments ?? []).map((assignment) => getTeacherAssignmentDetailData(foundation.teacher.id, assignment.id)));
  const detailByAssignmentId = new Map(assignmentDetails.filter((detail) => detail !== null).map((detail) => [detail.assignment.id, detail]));
  const q = params.q?.trim().toLowerCase() ?? "";
  const baseFiltered = (assignments ?? []).filter((assignment) => {
    if (params.classId && assignment.classId !== params.classId) return false;
    if (q && !`${assignment.title.en} ${assignment.title.zh} ${assignment.description.en} ${assignment.description.zh} ${assignment.contentType}`.toLowerCase().includes(q)) return false;
    return true;
  });
  const queueCounts: Record<TeacherAssignmentQueueFilter, number> = {
    all: baseFiltered.length,
    grading: baseFiltered.filter((assignment) => (detailByAssignmentId.get(assignment.id)?.gradingSummary.pendingGrading ?? 0) > 0).length,
    "correction-required": baseFiltered.filter((assignment) => (detailByAssignmentId.get(assignment.id)?.gradingSummary.correctionRequired ?? 0) > 0).length,
    "correction-review": baseFiltered.filter((assignment) => (detailByAssignmentId.get(assignment.id)?.gradingSummary.correctionSubmitted ?? 0) > 0).length
  };
  const filtered = baseFiltered.filter((assignment) => {
    const detail = detailByAssignmentId.get(assignment.id);
    if (activeFilter === "grading" && (detail?.gradingSummary.pendingGrading ?? 0) <= 0) return false;
    if (activeFilter === "correction-review" && (detail?.gradingSummary.correctionSubmitted ?? 0) <= 0) return false;
    if (activeFilter === "correction-required" && (detail?.gradingSummary.correctionRequired ?? 0) <= 0) return false;
    return true;
  });

  return (
    <TeacherAssignmentsManager
      assignments={filtered}
      classes={foundation.classes}
      activeFilter={activeFilter}
      activeClassId={params.classId ?? ""}
      query={params.q?.trim() ?? ""}
      queueCounts={queueCounts}
      totalCount={(assignments ?? []).length}
    />
  );
}
