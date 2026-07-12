import { randomUUID } from "crypto";
import type {
  TeacherClassCollaborator,
  TeacherClassCollaboratorRole
} from "@/types";

type TeacherOpsClassCollaboratorUserRole = "student" | "teacher" | "parent" | "admin";
type TeacherOpsClassCollaboratorIdKind = "collaborator" | "membership";

type TeacherOpsClassCollaboratorUserRecord = {
  id: string;
  role: TeacherOpsClassCollaboratorUserRole;
  username?: string;
  normalized_username?: string;
  normalized_email?: string;
  school_id?: string;
};

type TeacherOpsClassCollaboratorClassRecord = {
  id: string;
  teacher_id: string;
  name: string;
  school_id?: string;
  created_at?: string;
  updated_at?: string;
};

type TeacherOpsClassCollaboratorRecord = {
  id: string;
  class_id: string;
  teacher_id: string;
  role: Exclude<TeacherClassCollaboratorRole, "owner">;
  status: "active" | "revoked";
  invited_by: string;
  created_at: string;
  updated_at: string;
};

type TeacherOpsClassCollaboratorSchoolMembershipRecord = {
  id: string;
  school_id: string;
  user_id: string;
  role: TeacherOpsClassCollaboratorUserRole;
  class_id?: string;
  created_at: string;
};

export type TeacherOpsClassCollaboratorPersistenceDatabase = {
  school_memberships: TeacherOpsClassCollaboratorSchoolMembershipRecord[];
  teacher_class_collaborators: TeacherOpsClassCollaboratorRecord[];
  teacher_classes: TeacherOpsClassCollaboratorClassRecord[];
  users: TeacherOpsClassCollaboratorUserRecord[];
};

export type TeacherOpsClassCollaboratorPersistenceStoreDependencies = {
  createId?: (kind: TeacherOpsClassCollaboratorIdKind) => string;
  now?: () => Date;
  mutateDatabase: <T>(
    mutator: (database: TeacherOpsClassCollaboratorPersistenceDatabase) => T | Promise<T>
  ) => Promise<T>;
  teacherDisplayName: (
    database: TeacherOpsClassCollaboratorPersistenceDatabase,
    teacherId: string
  ) => string;
};

export type TeacherOpsClassCollaboratorPersistenceStore = ReturnType<typeof createTeacherOpsClassCollaboratorPersistenceStore>;

function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

function canUseTeacherArea(
  user?: TeacherOpsClassCollaboratorUserRecord | null
): user is TeacherOpsClassCollaboratorUserRecord {
  return user?.role === "teacher" || user?.role === "admin";
}

function teacherCanManageOperationsClass(
  database: TeacherOpsClassCollaboratorPersistenceDatabase,
  user: TeacherOpsClassCollaboratorUserRecord,
  classId: string
) {
  const teacherClass = database.teacher_classes.find((candidate) => candidate.id === classId);
  if (!teacherClass) return null;
  if (user.role === "admin" || teacherClass.teacher_id === user.id) return teacherClass;
  const hasAdminMembership = database.school_memberships.some(
    (membership) => membership.user_id === user.id && membership.class_id === classId && membership.role === "admin"
  );
  return hasAdminMembership ? teacherClass : null;
}

function addSchoolMembership({
  database,
  membership,
  createId
}: {
  database: TeacherOpsClassCollaboratorPersistenceDatabase;
  membership: Omit<TeacherOpsClassCollaboratorSchoolMembershipRecord, "id">;
  createId: TeacherOpsClassCollaboratorPersistenceStoreDependencies["createId"];
}) {
  if (
    database.school_memberships.some((candidate) =>
      candidate.school_id === membership.school_id &&
      candidate.user_id === membership.user_id &&
      candidate.class_id === membership.class_id &&
      candidate.role === membership.role
    )
  ) {
    return;
  }

  database.school_memberships.push({
    id: `school-membership-${createId?.("membership") ?? randomUUID()}`,
    ...membership
  });
}

export function toTeacherOpsClassCollaborator({
  database,
  record,
  teacherDisplayName
}: {
  database: TeacherOpsClassCollaboratorPersistenceDatabase;
  record: TeacherOpsClassCollaboratorRecord;
  teacherDisplayName: TeacherOpsClassCollaboratorPersistenceStoreDependencies["teacherDisplayName"];
}): TeacherClassCollaborator {
  const user = database.users.find((candidate) => candidate.id === record.teacher_id);
  return {
    id: record.id,
    classId: record.class_id,
    teacherId: record.teacher_id,
    teacherName: teacherDisplayName(database, record.teacher_id),
    teacherUsername: user?.username ?? record.teacher_id,
    role: record.role,
    status: record.status,
    invitedBy: record.invited_by,
    createdAt: record.created_at,
    updatedAt: record.updated_at
  };
}

export function ownerTeacherOpsClassCollaboratorForClass({
  database,
  teacherClass,
  teacherDisplayName
}: {
  database: TeacherOpsClassCollaboratorPersistenceDatabase;
  teacherClass: TeacherOpsClassCollaboratorClassRecord;
  teacherDisplayName: TeacherOpsClassCollaboratorPersistenceStoreDependencies["teacherDisplayName"];
}): TeacherClassCollaborator {
  const user = database.users.find((candidate) => candidate.id === teacherClass.teacher_id);
  return {
    id: `owner-${teacherClass.id}`,
    classId: teacherClass.id,
    teacherId: teacherClass.teacher_id,
    teacherName: teacherDisplayName(database, teacherClass.teacher_id),
    teacherUsername: user?.username ?? teacherClass.teacher_id,
    role: "owner",
    status: "active",
    invitedBy: teacherClass.teacher_id,
    createdAt: teacherClass.created_at ?? "",
    updatedAt: teacherClass.updated_at ?? teacherClass.created_at ?? ""
  };
}

export function teacherOpsClassCollaboratorsForClass({
  database,
  teacherClass,
  teacherDisplayName
}: {
  database: TeacherOpsClassCollaboratorPersistenceDatabase;
  teacherClass: TeacherOpsClassCollaboratorClassRecord;
  teacherDisplayName: TeacherOpsClassCollaboratorPersistenceStoreDependencies["teacherDisplayName"];
}) {
  return [
    ownerTeacherOpsClassCollaboratorForClass({ database, teacherClass, teacherDisplayName }),
    ...database.teacher_class_collaborators
      .filter((collaborator) => collaborator.class_id === teacherClass.id)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((collaborator) => toTeacherOpsClassCollaborator({ database, record: collaborator, teacherDisplayName }))
  ];
}

export function createTeacherOpsClassCollaboratorPersistenceStore({
  createId = () => randomUUID(),
  now = () => new Date(),
  mutateDatabase,
  teacherDisplayName
}: TeacherOpsClassCollaboratorPersistenceStoreDependencies) {
  return {
    async upsertTeacherClassCollaborator({
      teacherId,
      classId,
      teacherUsername,
      role
    }: {
      teacherId: string;
      classId: string;
      teacherUsername: string;
      role: Exclude<TeacherClassCollaboratorRole, "owner">;
    }) {
      const normalizedUsername = normalizeUsername(teacherUsername);
      if (!normalizedUsername || !["co-teacher", "viewer"].includes(role)) return { status: "invalid" as const };

      return mutateDatabase((database) => {
        const user = database.users.find((candidate) => candidate.id === teacherId);
        if (!canUseTeacherArea(user)) return { status: "forbidden" as const };
        const teacherClass = teacherCanManageOperationsClass(database, user, classId);
        if (!teacherClass) return { status: "forbidden" as const };
        const collaboratorUser = database.users.find(
          (candidate) =>
            canUseTeacherArea(candidate) &&
            (candidate.normalized_username === normalizedUsername || candidate.normalized_email === normalizedUsername)
        );
        if (!collaboratorUser) return { status: "teacher-not-found" as const };
        if (collaboratorUser.id === teacherClass.teacher_id) return { status: "owner" as const };
        if (teacherClass.school_id && collaboratorUser.school_id && collaboratorUser.school_id !== teacherClass.school_id) {
          return { status: "school-mismatch" as const };
        }

        const updatedAt = now().toISOString();
        let collaborator = database.teacher_class_collaborators.find(
          (candidate) => candidate.class_id === classId && candidate.teacher_id === collaboratorUser.id
        );
        if (!collaborator) {
          collaborator = {
            id: `class-collaborator-${createId("collaborator")}`,
            class_id: classId,
            teacher_id: collaboratorUser.id,
            role,
            status: "active",
            invited_by: user.id,
            created_at: updatedAt,
            updated_at: updatedAt
          };
          database.teacher_class_collaborators.push(collaborator);
        } else {
          collaborator.role = role;
          collaborator.status = "active";
          collaborator.updated_at = updatedAt;
        }

        if (teacherClass.school_id && role === "co-teacher") {
          addSchoolMembership({
            database,
            membership: {
              school_id: teacherClass.school_id,
              user_id: collaboratorUser.id,
              role: "teacher",
              class_id: teacherClass.id,
              created_at: updatedAt
            },
            createId
          });
        }

        return {
          status: "saved" as const,
          collaborator: toTeacherOpsClassCollaborator({ database, record: collaborator, teacherDisplayName })
        };
      });
    }
  };
}
