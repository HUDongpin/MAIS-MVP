/**
 * Which class the reports form should start on.
 *
 * `TeacherShell` renders a "Class focus" selector on every teacher route and
 * publishes the choice as `?classId=`. `/teacher/analytics` and
 * `/teacher/gradebook` both scope on that param, but the reports form used to
 * ignore it and always pick its own default — so "Class focus: S1 Foundation"
 * could sit above a form still set to S3A, and the report the teacher then
 * saved was for the class they had not chosen.
 *
 * `all` is the shell's "no particular class" value, so it falls through to the
 * default rather than selecting a class literally named "all".
 */
export function initialReportClassId(
  classes: readonly { id: string; studentCount: number }[],
  requestedClassId: string | null | undefined
): string {
  const requested = typeof requestedClassId === "string" ? requestedClassId.trim() : "";
  if (requested && requested !== "all" && classes.some((teacherClass) => teacherClass.id === requested)) {
    return requested;
  }
  // Default to a class that actually has students, so the form is not empty on load.
  return classes.find((teacherClass) => teacherClass.studentCount > 0)?.id ?? classes[0]?.id ?? "";
}
