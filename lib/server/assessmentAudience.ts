/** Omission retains legacy class-wide access; an explicit empty list grants nobody. */
export type AssessmentAudienceRecord = { assigned_student_ids?: readonly string[] };

export function normalizeAssessmentAudience(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((id): id is string => typeof id === "string" && Boolean(id.trim())).map((id) => id.trim()))];
}

export function assessmentAllowsStudent(assessment: AssessmentAudienceRecord, studentId: string) {
  return assessment.assigned_student_ids === undefined || assessment.assigned_student_ids.includes(studentId);
}

export function assessmentAudienceForClass(assessment: AssessmentAudienceRecord, enrolledStudentIds: readonly string[]) {
  return [...new Set(enrolledStudentIds.filter((studentId) => assessmentAllowsStudent(assessment, studentId)))];
}
