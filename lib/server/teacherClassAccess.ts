/** Effective class authority, including collaboration grants retained by older snapshots. */
export type TeacherClassAccessDatabase = {
  school_memberships?: readonly { user_id: string; class_id?: string; role: string }[];
  teacher_class_collaborators?: readonly { class_id: string; teacher_id: string; role: string; status: string }[];
};

export function canTeacherAccessClass(
  database: TeacherClassAccessDatabase,
  user: { id: string; role: string },
  teacherClass: { id: string; teacher_id?: string },
  intent: "read" | "write" | "manage" = "write"
) {
  if (user.role !== "teacher" && user.role !== "admin") return false;
  if (user.role === "admin" || teacherClass.teacher_id === user.id) return true;
  const memberships = (database.school_memberships ?? []).filter((row) => row.user_id === user.id && row.class_id === teacherClass.id);
  if (memberships.some((row) => row.role === "admin")) return true;

  // Explicit collaboration controls ordinary teacher grants, including legacy
  // memberships with no provenance. Keep those records for audit/independent grants.
  const collaborators = (database.teacher_class_collaborators ?? []).filter((row) => row.class_id === teacherClass.id && row.teacher_id === user.id);
  if (collaborators.length > 1) return false;
  const collaborator = collaborators[0];
  if (collaborator) {
    return collaborator.status === "active" && intent !== "manage"
      && (collaborator.role === "co-teacher" || (collaborator.role === "viewer" && intent === "read"));
  }
  return intent !== "manage" && memberships.some((row) => row.role === "teacher");
}
