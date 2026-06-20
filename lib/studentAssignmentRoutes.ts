export const studentAssignmentsPath = "/student/assignments" as const;

export function studentAssignmentHref(assignmentId: string) {
  return `${studentAssignmentsPath}/${encodeURIComponent(assignmentId)}`;
}
