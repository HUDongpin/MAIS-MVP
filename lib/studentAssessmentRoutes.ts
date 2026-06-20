export const studentAssessmentsPath = "/student/assessments" as const;

export function studentAssessmentHref(assessmentId: string) {
  return `${studentAssessmentsPath}/${encodeURIComponent(assessmentId)}`;
}
