import { randomUUID } from "crypto";
import type {
  GradeId,
  PrepTeam,
  PrepTeamShare,
  PrepTeamShareKind
} from "@/types";

type TeacherOpsPrepTeamUserRole = "student" | "teacher" | "parent" | "admin";
type TeacherOpsPrepTeamIdKind = "team" | "share";

type TeacherOpsPrepTeamUserRecord = {
  id: string;
  role: TeacherOpsPrepTeamUserRole;
  username?: string;
  school_id?: string;
};

type TeacherOpsPrepTeamRecord = {
  id: string;
  school_id?: string;
  name_en: string;
  name_zh: string;
  description_en: string;
  description_zh: string;
  grade?: GradeId;
  teacher_ids: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
};

type TeacherOpsPrepTeamShareRecord = {
  id: string;
  prep_team_id: string;
  kind: PrepTeamShareKind;
  title_en: string;
  title_zh: string;
  target_id?: string;
  created_by: string;
  created_at: string;
};

export type TeacherOpsPrepTeamPersistenceDatabase = {
  prep_teams: TeacherOpsPrepTeamRecord[];
  prep_team_shares: TeacherOpsPrepTeamShareRecord[];
  users: TeacherOpsPrepTeamUserRecord[];
};

export type TeacherOpsPrepTeamPersistenceStoreDependencies = {
  createId?: (kind: TeacherOpsPrepTeamIdKind) => string;
  now?: () => Date;
  mutateDatabase: <T>(
    mutator: (database: TeacherOpsPrepTeamPersistenceDatabase) => T | Promise<T>
  ) => Promise<T>;
  gradeIsValid: (grade: GradeId) => boolean;
  teacherDisplayName: (
    database: TeacherOpsPrepTeamPersistenceDatabase,
    teacherId: string
  ) => string;
};

export type TeacherOpsPrepTeamPersistenceStore = ReturnType<typeof createTeacherOpsPrepTeamPersistenceStore>;

const validShareKinds = new Set<PrepTeamShareKind>(["resource", "assessment", "lesson-kit", "note"]);

function canUseTeacherArea(user?: TeacherOpsPrepTeamUserRecord | null): user is TeacherOpsPrepTeamUserRecord {
  return user?.role === "teacher" || user?.role === "admin";
}

export function toTeacherOpsPrepTeamShare({
  database,
  record,
  teacherDisplayName
}: {
  database: TeacherOpsPrepTeamPersistenceDatabase;
  record: TeacherOpsPrepTeamShareRecord;
  teacherDisplayName: TeacherOpsPrepTeamPersistenceStoreDependencies["teacherDisplayName"];
}): PrepTeamShare {
  return {
    id: record.id,
    prepTeamId: record.prep_team_id,
    kind: record.kind,
    title: {
      en: record.title_en,
      zh: record.title_zh
    },
    targetId: record.target_id,
    createdBy: record.created_by,
    createdByName: teacherDisplayName(database, record.created_by),
    createdAt: record.created_at
  };
}

export function toTeacherOpsPrepTeam({
  database,
  record,
  teacherDisplayName
}: {
  database: TeacherOpsPrepTeamPersistenceDatabase;
  record: TeacherOpsPrepTeamRecord;
  teacherDisplayName: TeacherOpsPrepTeamPersistenceStoreDependencies["teacherDisplayName"];
}): PrepTeam {
  const shares = database.prep_team_shares
    .filter((share) => share.prep_team_id === record.id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((share) => toTeacherOpsPrepTeamShare({ database, record: share, teacherDisplayName }));

  return {
    id: record.id,
    schoolId: record.school_id,
    name: {
      en: record.name_en,
      zh: record.name_zh
    },
    description: {
      en: record.description_en,
      zh: record.description_zh
    },
    grade: record.grade,
    teacherIds: record.teacher_ids,
    members: record.teacher_ids.map((teacherId) => ({
      teacherId,
      teacherName: teacherDisplayName(database, teacherId)
    })),
    shares,
    createdBy: record.created_by,
    createdAt: record.created_at,
    updatedAt: record.updated_at
  };
}

export function createTeacherOpsPrepTeamPersistenceStore({
  createId = () => randomUUID(),
  now = () => new Date(),
  mutateDatabase,
  gradeIsValid,
  teacherDisplayName
}: TeacherOpsPrepTeamPersistenceStoreDependencies) {
  return {
    async createPrepTeam({
      teacherId,
      name,
      description,
      grade,
      teacherIds
    }: {
      teacherId: string;
      name: string;
      description?: string;
      grade?: GradeId;
      teacherIds?: string[];
    }) {
      const trimmedName = name.trim();
      if (!trimmedName || (grade && !gradeIsValid(grade))) return { status: "invalid" as const };

      return mutateDatabase((database) => {
        const user = database.users.find((candidate) => candidate.id === teacherId);
        if (!canUseTeacherArea(user)) return { status: "forbidden" as const };

        const createdAt = now().toISOString();
        const schoolTeacherIds = new Set(
          database.users
            .filter((candidate) => canUseTeacherArea(candidate) && (!user.school_id || candidate.school_id === user.school_id))
            .map((candidate) => candidate.id)
        );
        const memberIds = Array.from(new Set([teacherId, ...(teacherIds ?? [])])).filter((id) => schoolTeacherIds.has(id));
        const team: TeacherOpsPrepTeamRecord = {
          id: `prep-team-${createId("team")}`,
          school_id: user.school_id,
          name_en: trimmedName,
          name_zh: trimmedName,
          description_en: description?.trim() || "Shared lesson preparation group.",
          description_zh: description?.trim() || "備課組共享空間。",
          grade,
          teacher_ids: memberIds,
          created_by: user.id,
          created_at: createdAt,
          updated_at: createdAt
        };
        database.prep_teams.unshift(team);
        return {
          status: "created" as const,
          team: toTeacherOpsPrepTeam({ database, record: team, teacherDisplayName })
        };
      });
    },

    async createPrepTeamShare({
      teacherId,
      prepTeamId,
      kind,
      title,
      targetId
    }: {
      teacherId: string;
      prepTeamId: string;
      kind: PrepTeamShareKind;
      title: string;
      targetId?: string | null;
    }) {
      const trimmedTitle = title.trim();
      if (!trimmedTitle || !validShareKinds.has(kind)) return { status: "invalid" as const };

      return mutateDatabase((database) => {
        const user = database.users.find((candidate) => candidate.id === teacherId);
        if (!canUseTeacherArea(user)) return { status: "forbidden" as const };
        const team = database.prep_teams.find((candidate) => (
          candidate.id === prepTeamId &&
          (candidate.teacher_ids.includes(user.id) || user.role === "admin")
        ));
        if (!team) return { status: "not-found" as const };

        const createdAt = now().toISOString();
        const share: TeacherOpsPrepTeamShareRecord = {
          id: `prep-team-share-${createId("share")}`,
          prep_team_id: team.id,
          kind,
          title_en: trimmedTitle,
          title_zh: trimmedTitle,
          target_id: targetId ?? undefined,
          created_by: user.id,
          created_at: createdAt
        };
        database.prep_team_shares.unshift(share);
        team.updated_at = createdAt;
        return {
          status: "created" as const,
          share: toTeacherOpsPrepTeamShare({ database, record: share, teacherDisplayName }),
          team: toTeacherOpsPrepTeam({ database, record: team, teacherDisplayName })
        };
      });
    }
  };
}
