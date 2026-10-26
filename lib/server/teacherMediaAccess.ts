import { canTeacherAccessClass, type TeacherClassAccessDatabase } from "./teacherClassAccess";
import { mediaObjectOwnerHash, type StoredMediaObjectMetadata } from "./mediaObjectStore";

type TeacherMediaDatabase = TeacherClassAccessDatabase & {
  users: readonly { id: string; role: string }[];
  teacher_classes: readonly { id: string; teacher_id: string }[];
  class_enrollments: readonly { class_id: string; student_id: string }[];
  classroom_work_samples?: readonly { image_object_key?: string; session_id: string; student_id: string }[];
  teacher_live_sessions?: readonly { id: string; class_id: string }[];
};

export function canTeacherReadMediaObject(database: TeacherMediaDatabase, teacherId: string, metadata: Pick<StoredMediaObjectMetadata, "ownerHash" | "objectKey" | "capability">) {
  const teacher = database.users.find((user) => user.id === teacherId && user.role === "teacher");
  if (!teacher || !["assignment-image", "classroom-work-sample", "practice-work-photo"].includes(metadata.capability)) return false;
  const classIds = new Set(database.teacher_classes.filter((record) => canTeacherAccessClass(database, teacher, record, "read")).map((record) => record.id));
  const owner = database.users.find((user) => mediaObjectOwnerHash(user.id) === metadata.ownerHash);
  if (!owner) return false;
  if (owner.role === "student") {
    return database.class_enrollments.some((row) => row.student_id === owner.id && classIds.has(row.class_id));
  }
  // Teachers may upload a sample on behalf of a student. Sharing needs its exact
  // persisted classroom context as well as a class-authorized uploader.
  if (metadata.capability !== "classroom-work-sample" || !["teacher", "admin"].includes(owner.role)) return false;
  return (database.classroom_work_samples ?? []).some((sample) => {
    if (sample.image_object_key !== metadata.objectKey) return false;
    const session = database.teacher_live_sessions?.find((row) => row.id === sample.session_id);
    const teacherClass = session && database.teacher_classes.find((row) => row.id === session.class_id);
    return Boolean(teacherClass && classIds.has(teacherClass.id)
      && canTeacherAccessClass(database, owner, teacherClass, "read")
      && database.class_enrollments.some((row) => row.student_id === sample.student_id && row.class_id === teacherClass.id));
  });
}
