import type { GradeId } from "@/types";

/**
 * MAIS is a mixed-audience service and Google Sign-In is optional. Until a
 * verified parent/school authorization workflow exists, self-service Student
 * Google OAuth is restricted to learners who attest that they are at least 13
 * and select a conservatively age-compatible secondary grade.
 *
 * Grade is only a product safeguard, not legal proof of age or consent.
 */
const selfServiceGoogleStudentGrades = new Set<GradeId>(["S2", "S3", "S4", "S5", "S6"]);

export function isGoogleStudentSelfServiceGradeAllowed(grade: GradeId | undefined) {
  return Boolean(grade && selfServiceGoogleStudentGrades.has(grade));
}
