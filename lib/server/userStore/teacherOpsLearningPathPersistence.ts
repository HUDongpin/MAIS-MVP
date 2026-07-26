import { randomUUID } from "crypto";
import type {
  GradeId,
  LearningPathStep,
  LearningPathStepKind,
  StudentLearningPath,
  StudentLearningPathStep,
  TeacherLearningPath
} from "@/types";

type TeacherOpsLearningPathUserRole = "student" | "teacher" | "parent" | "admin";

type TeacherOpsLearningPathUserRecord = {
  id: string;
  role: TeacherOpsLearningPathUserRole;
  username?: string;
};

type TeacherOpsLearningPathClassRecord = {
  id: string;
  teacher_id: string;
  name: string;
  grade: GradeId;
};

type TeacherOpsLearningPathSchoolMembershipRecord = {
  user_id: string;
  role: TeacherOpsLearningPathUserRole;
  class_id?: string;
};

type TeacherOpsLearningPathEnrollmentRecord = {
  id: string;
  class_id: string;
  student_id: string;
  joined_at: string;
};

type TeacherOpsLearningPathGroupRecord = {
  id: string;
  class_id: string;
  name: string;
  member_student_ids: string[];
};

export type TeacherOpsLearningPathStepRecord = {
  id: string;
  order: number;
  kind: LearningPathStepKind;
  target_id: string;
  title: string;
  description: string;
};

export type TeacherOpsLearningPathRecord = {
  id: string;
  class_id: string;
  teacher_id: string;
  group_id?: string;
  title: string;
  description: string;
  status: "active" | "archived";
  steps: TeacherOpsLearningPathStepRecord[];
  assigned_student_ids: string[];
  created_at: string;
  updated_at: string;
};

export type TeacherOpsLearningPathProgressRecord = {
  id: string;
  path_id: string;
  step_id: string;
  student_id: string;
  completed_at: string;
};

export type TeacherOpsLearningPathPersistenceDatabase = {
  class_enrollments: TeacherOpsLearningPathEnrollmentRecord[];
  school_memberships?: TeacherOpsLearningPathSchoolMembershipRecord[];
  teacher_classes: TeacherOpsLearningPathClassRecord[];
  teacher_student_groups: TeacherOpsLearningPathGroupRecord[];
  teacher_learning_paths: TeacherOpsLearningPathRecord[];
  learning_path_step_progress: TeacherOpsLearningPathProgressRecord[];
  users: TeacherOpsLearningPathUserRecord[];
};

export type TeacherOpsLearningPathPersistenceStoreDependencies = {
  createId?: () => string;
  now?: () => Date;
  readDatabase: () => Promise<TeacherOpsLearningPathPersistenceDatabase>;
  mutateDatabase: <T>(
    mutator: (database: TeacherOpsLearningPathPersistenceDatabase) => T | Promise<T>
  ) => Promise<T>;
  stepHref?: (kind: LearningPathStepKind, targetId: string) => string | null;
};

export type TeacherOpsLearningPathPersistenceStore = ReturnType<typeof createTeacherOpsLearningPathPersistenceStore>;

export const learningPathStepKinds = ["lesson", "practice", "assessment", "visualization", "resource"] as const;

const PATH_TITLE_MAX = 120;
const PATH_DESC_MAX = 600;
const STEP_TITLE_MAX = 120;
const STEP_DESC_MAX = 400;
const STEP_TARGET_MAX = 200;
const MAX_STEPS = 30;

export type LearningPathStepInput = {
  id?: unknown;
  kind?: unknown;
  targetId?: unknown;
  title?: unknown;
  description?: unknown;
};

function canUseTeacherArea(
  user?: TeacherOpsLearningPathUserRecord | null
): user is TeacherOpsLearningPathUserRecord {
  return user?.role === "teacher" || user?.role === "admin";
}

function normalizeStepKind(value: unknown): LearningPathStepKind {
  return learningPathStepKinds.includes(value as LearningPathStepKind)
    ? (value as LearningPathStepKind)
    : "lesson";
}

function defaultStepHref(kind: LearningPathStepKind, targetId: string): string | null {
  const trimmed = targetId.trim();
  switch (kind) {
    case "lesson":
      return trimmed ? `/student/lessons/${encodeURIComponent(trimmed)}` : "/student/lessons";
    case "assessment":
      return trimmed ? `/student/assessments/${encodeURIComponent(trimmed)}` : null;
    case "practice":
      return trimmed ? `/practice?topic=${encodeURIComponent(trimmed)}` : "/practice";
    case "visualization":
      return "/student/tools/visualizations";
    case "resource":
      return trimmed ? `/student/resources/${encodeURIComponent(trimmed)}` : null;
    default:
      return null;
  }
}

function teacherCanAccessClass(
  database: TeacherOpsLearningPathPersistenceDatabase,
  user: TeacherOpsLearningPathUserRecord,
  classId: string
) {
  const teacherClass = database.teacher_classes.find((candidate) => candidate.id === classId);
  if (!teacherClass) return null;
  if (
    user.role !== "admin" &&
    teacherClass.teacher_id !== user.id &&
    !(database.school_memberships ?? []).some(
      (membership) =>
        membership.user_id === user.id &&
        membership.class_id === classId &&
        (membership.role === "teacher" || membership.role === "admin")
    )
  ) {
    return null;
  }
  return teacherClass;
}

function enrolledStudentIdsForClass(database: TeacherOpsLearningPathPersistenceDatabase, classId: string) {
  return database.class_enrollments
    .filter((enrollment) => enrollment.class_id === classId)
    .map((enrollment) => enrollment.student_id);
}

function resolveAssignedStudentIds(
  database: TeacherOpsLearningPathPersistenceDatabase,
  classId: string,
  groupId: string | undefined
) {
  const enrolled = enrolledStudentIdsForClass(database, classId);
  if (!groupId) return enrolled;
  const group = (database.teacher_student_groups ?? []).find(
    (candidate) => candidate.id === groupId && candidate.class_id === classId
  );
  if (!group) return null;
  const enrolledSet = new Set(enrolled);
  return group.member_student_ids.filter((studentId) => enrolledSet.has(studentId));
}

function normalizeStepInputs(
  steps: LearningPathStepInput[] | undefined,
  createId: () => string,
  preservableStepIds?: ReadonlySet<string>
) {
  // Step progress rows key on step ids, so an edit must keep the ids of steps
  // that survive it — regenerating them would silently reset every student's
  // progress. Only ids already on this path may be kept (never client-minted).
  const usedIds = new Set<string>();
  return (steps ?? [])
    .slice(0, MAX_STEPS)
    .map((step, index) => {
      const requestedId = typeof step.id === "string" ? step.id : "";
      const id =
        requestedId && preservableStepIds?.has(requestedId) && !usedIds.has(requestedId)
          ? requestedId
          : `path-step-${createId()}`;
      usedIds.add(id);
      return {
        id,
        order: index,
        kind: normalizeStepKind(step.kind),
        target_id: typeof step.targetId === "string" ? step.targetId.trim().slice(0, STEP_TARGET_MAX) : "",
        title:
          typeof step.title === "string" && step.title.trim()
            ? step.title.trim().slice(0, STEP_TITLE_MAX)
            : `Step ${index + 1}`,
        description: typeof step.description === "string" ? step.description.trim().slice(0, STEP_DESC_MAX) : ""
      };
    });
}

function toLearningPathStep(step: TeacherOpsLearningPathStepRecord): LearningPathStep {
  return {
    id: step.id,
    order: step.order,
    kind: normalizeStepKind(step.kind),
    targetId: step.target_id,
    title: step.title,
    description: step.description
  };
}

function orderedSteps(record: TeacherOpsLearningPathRecord): TeacherOpsLearningPathStepRecord[] {
  return [...(record.steps ?? [])].sort((a, b) => a.order - b.order);
}

export function toTeacherLearningPath({
  database,
  record
}: {
  database: TeacherOpsLearningPathPersistenceDatabase;
  record: TeacherOpsLearningPathRecord;
}): TeacherLearningPath {
  const steps = orderedSteps(record);
  const stepIds = new Set(steps.map((step) => step.id));
  const assigned = record.assigned_student_ids ?? [];
  const completedByStudent = new Map<string, number>();
  for (const progress of database.learning_path_step_progress ?? []) {
    if (progress.path_id !== record.id || !stepIds.has(progress.step_id)) continue;
    if (!assigned.includes(progress.student_id)) continue;
    completedByStudent.set(progress.student_id, (completedByStudent.get(progress.student_id) ?? 0) + 1);
  }
  const totalSteps = steps.length;
  const completedCount = totalSteps
    ? assigned.filter((studentId) => (completedByStudent.get(studentId) ?? 0) >= totalSteps).length
    : 0;
  const totalCompletedSteps = Array.from(completedByStudent.values()).reduce((sum, value) => sum + value, 0);
  const group = record.group_id
    ? (database.teacher_student_groups ?? []).find((candidate) => candidate.id === record.group_id)
    : undefined;

  return {
    id: record.id,
    classId: record.class_id,
    groupId: record.group_id ?? null,
    groupName: group?.name ?? null,
    title: record.title,
    description: record.description,
    status: record.status,
    steps: steps.map(toLearningPathStep),
    assignedStudentIds: assigned,
    assignedCount: assigned.length,
    completedCount,
    averageStepsCompleted: assigned.length ? Math.round((totalCompletedSteps / assigned.length) * 10) / 10 : 0,
    createdAt: record.created_at,
    updatedAt: record.updated_at
  };
}

export function listTeacherLearningPathsForClass({
  database,
  classId
}: {
  database: TeacherOpsLearningPathPersistenceDatabase;
  classId: string;
}): TeacherLearningPath[] {
  return (database.teacher_learning_paths ?? [])
    .filter((record) => record.class_id === classId)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .map((record) => toTeacherLearningPath({ database, record }));
}

export function toStudentLearningPath({
  database,
  record,
  studentId,
  stepHref
}: {
  database: TeacherOpsLearningPathPersistenceDatabase;
  record: TeacherOpsLearningPathRecord;
  studentId: string;
  stepHref: (kind: LearningPathStepKind, targetId: string) => string | null;
}): StudentLearningPath {
  const steps = orderedSteps(record);
  const completedStepIds = new Set(
    (database.learning_path_step_progress ?? [])
      .filter((progress) => progress.path_id === record.id && progress.student_id === studentId)
      .map((progress) => progress.step_id)
  );

  let unlockedReached = false;
  let currentStepId: string | null = null;
  const projectedSteps: StudentLearningPathStep[] = steps.map((step) => {
    const completed = completedStepIds.has(step.id);
    let status: StudentLearningPathStep["status"];
    if (completed) {
      status = "completed";
    } else if (!unlockedReached) {
      status = "available";
      unlockedReached = true;
      currentStepId = step.id;
    } else {
      status = "locked";
    }
    return {
      ...toLearningPathStep(step),
      status,
      href: stepHref(step.kind, step.target_id)
    };
  });

  const completedStepCount = projectedSteps.filter((step) => step.status === "completed").length;
  return {
    id: record.id,
    classId: record.class_id,
    title: record.title,
    description: record.description,
    steps: projectedSteps,
    completedStepCount,
    totalStepCount: steps.length,
    currentStepId,
    completed: steps.length > 0 && completedStepCount === steps.length
  };
}

export function normalizeTeacherLearningPathRecords(
  existingRecords: TeacherOpsLearningPathRecord[] | undefined,
  now: string,
  createId: () => string = () => randomUUID()
): TeacherOpsLearningPathRecord[] {
  return (existingRecords ?? [])
    .filter(
      (record) =>
        typeof record?.class_id === "string" &&
        typeof record?.teacher_id === "string" &&
        typeof record?.title === "string"
    )
    .map((record) => {
      const stepSeen = new Set<string>();
      const steps = (Array.isArray(record.steps) ? record.steps : [])
        .slice(0, MAX_STEPS)
        .map((step, index) => {
          const id =
            typeof step?.id === "string" && step.id.trim() && !stepSeen.has(step.id)
              ? step.id
              : `path-step-${createId()}`;
          stepSeen.add(id);
          return {
            id,
            order: typeof step?.order === "number" && Number.isFinite(step.order) ? step.order : index,
            kind: normalizeStepKind(step?.kind),
            target_id: typeof step?.target_id === "string" ? step.target_id.slice(0, STEP_TARGET_MAX) : "",
            title: typeof step?.title === "string" && step.title.trim() ? step.title.slice(0, STEP_TITLE_MAX) : `Step ${index + 1}`,
            description: typeof step?.description === "string" ? step.description.slice(0, STEP_DESC_MAX) : ""
          };
        });
      const memberSeen = new Set<string>();
      const assigned_student_ids = (Array.isArray(record.assigned_student_ids) ? record.assigned_student_ids : [])
        .filter((studentId): studentId is string => {
          if (typeof studentId !== "string" || memberSeen.has(studentId)) return false;
          memberSeen.add(studentId);
          return true;
        });
      return {
        id: typeof record.id === "string" && record.id.trim() ? record.id : `learning-path-${createId()}`,
        class_id: record.class_id,
        teacher_id: record.teacher_id,
        group_id: typeof record.group_id === "string" && record.group_id ? record.group_id : undefined,
        title: record.title.trim().slice(0, PATH_TITLE_MAX) || "Learning path",
        description: typeof record.description === "string" ? record.description.slice(0, PATH_DESC_MAX) : "",
        status: record.status === "archived" ? "archived" : "active",
        steps,
        assigned_student_ids,
        created_at: typeof record.created_at === "string" ? record.created_at : now,
        updated_at: typeof record.updated_at === "string" ? record.updated_at : now
      };
    });
}

export function normalizeLearningPathProgressRecords(
  existingRecords: TeacherOpsLearningPathProgressRecord[] | undefined,
  now: string,
  createId: () => string = () => randomUUID()
): TeacherOpsLearningPathProgressRecord[] {
  const seen = new Set<string>();
  return (existingRecords ?? [])
    .filter(
      (record) =>
        typeof record?.path_id === "string" &&
        typeof record?.step_id === "string" &&
        typeof record?.student_id === "string"
    )
    .map((record) => ({
      id: typeof record.id === "string" && record.id.trim() ? record.id : `path-progress-${createId()}`,
      path_id: record.path_id,
      step_id: record.step_id,
      student_id: record.student_id,
      completed_at: typeof record.completed_at === "string" ? record.completed_at : now
    }))
    .filter((record) => {
      const key = `${record.path_id}:${record.step_id}:${record.student_id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function createTeacherOpsLearningPathPersistenceStore({
  createId = () => randomUUID(),
  now = () => new Date(),
  readDatabase,
  mutateDatabase,
  stepHref = defaultStepHref
}: TeacherOpsLearningPathPersistenceStoreDependencies) {
  return {
    async createTeacherLearningPath({
      teacherId,
      classId,
      title,
      description,
      groupId,
      steps
    }: {
      teacherId: string;
      classId: string;
      title: string;
      description?: string;
      groupId?: string;
      steps?: LearningPathStepInput[];
    }) {
      const trimmedTitle = title.trim().slice(0, PATH_TITLE_MAX);
      if (!trimmedTitle) return { status: "invalid" as const };
      const normalizedSteps = normalizeStepInputs(steps, createId);
      if (!normalizedSteps.length) return { status: "no-steps" as const };

      return mutateDatabase((database) => {
        const user = database.users.find((candidate) => candidate.id === teacherId);
        if (!canUseTeacherArea(user)) return { status: "forbidden" as const };
        if (!teacherCanAccessClass(database, user, classId)) return { status: "not-found" as const };
        const assigned = resolveAssignedStudentIds(database, classId, groupId?.trim() || undefined);
        if (assigned === null) return { status: "group-not-found" as const };

        const createdAt = now().toISOString();
        const record: TeacherOpsLearningPathRecord = {
          id: `learning-path-${createId()}`,
          class_id: classId,
          teacher_id: user.id,
          group_id: groupId?.trim() || undefined,
          title: trimmedTitle,
          description: (description ?? "").trim().slice(0, PATH_DESC_MAX),
          status: "active",
          steps: normalizedSteps,
          assigned_student_ids: assigned,
          created_at: createdAt,
          updated_at: createdAt
        };
        database.teacher_learning_paths ??= [];
        database.teacher_learning_paths.unshift(record);

        return { status: "created" as const, path: toTeacherLearningPath({ database, record }) };
      });
    },

    async updateTeacherLearningPath({
      teacherId,
      classId,
      pathId,
      title,
      description,
      status,
      groupId,
      steps
    }: {
      teacherId: string;
      classId: string;
      pathId: string;
      title?: string;
      description?: string;
      status?: "active" | "archived";
      groupId?: string | null;
      steps?: LearningPathStepInput[];
    }) {
      return mutateDatabase((database) => {
        const user = database.users.find((candidate) => candidate.id === teacherId);
        if (!canUseTeacherArea(user)) return { status: "forbidden" as const };
        if (!teacherCanAccessClass(database, user, classId)) return { status: "not-found" as const };
        const record = (database.teacher_learning_paths ?? []).find(
          (candidate) => candidate.id === pathId && candidate.class_id === classId
        );
        if (!record) return { status: "not-found" as const };

        if (typeof title === "string") {
          const trimmed = title.trim().slice(0, PATH_TITLE_MAX);
          if (!trimmed) return { status: "invalid" as const };
          record.title = trimmed;
        }
        if (typeof description === "string") record.description = description.trim().slice(0, PATH_DESC_MAX);
        if (status === "active" || status === "archived") record.status = status;
        if (Array.isArray(steps)) {
          const existingStepIds = new Set((record.steps ?? []).map((step) => step.id));
          const normalizedSteps = normalizeStepInputs(steps, createId, existingStepIds);
          if (!normalizedSteps.length) return { status: "no-steps" as const };
          record.steps = normalizedSteps;
          const retainedStepIds = new Set(normalizedSteps.map((step) => step.id));
          database.learning_path_step_progress = (database.learning_path_step_progress ?? []).filter(
            (progress) => progress.path_id !== record.id || retainedStepIds.has(progress.step_id)
          );
        }
        if (groupId !== undefined) {
          const resolvedGroupId = groupId ? groupId.trim() : undefined;
          const assigned = resolveAssignedStudentIds(database, classId, resolvedGroupId || undefined);
          if (assigned === null) return { status: "group-not-found" as const };
          record.group_id = resolvedGroupId || undefined;
          record.assigned_student_ids = assigned;
        }
        record.updated_at = now().toISOString();

        return { status: "saved" as const, path: toTeacherLearningPath({ database, record }) };
      });
    },

    async deleteTeacherLearningPath({
      teacherId,
      classId,
      pathId
    }: {
      teacherId: string;
      classId: string;
      pathId: string;
    }) {
      return mutateDatabase((database) => {
        const user = database.users.find((candidate) => candidate.id === teacherId);
        if (!canUseTeacherArea(user)) return { status: "forbidden" as const };
        if (!teacherCanAccessClass(database, user, classId)) return { status: "not-found" as const };
        const exists = (database.teacher_learning_paths ?? []).some(
          (candidate) => candidate.id === pathId && candidate.class_id === classId
        );
        if (!exists) return { status: "not-found" as const };

        database.teacher_learning_paths = (database.teacher_learning_paths ?? []).filter(
          (candidate) => !(candidate.id === pathId && candidate.class_id === classId)
        );
        database.learning_path_step_progress = (database.learning_path_step_progress ?? []).filter(
          (progress) => progress.path_id !== pathId
        );
        return { status: "deleted" as const, pathId };
      });
    },

    async getStudentLearningPaths(studentId: string): Promise<StudentLearningPath[] | null> {
      const database = await readDatabase();
      const user = database.users.find((candidate) => candidate.id === studentId);
      if (!user || user.role !== "student") return null;
      return (database.teacher_learning_paths ?? [])
        .filter(
          (record) => record.status === "active" && (record.assigned_student_ids ?? []).includes(studentId)
        )
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
        .map((record) => toStudentLearningPath({ database, record, studentId, stepHref }));
    },

    async markStudentLearningPathStepComplete({
      studentId,
      pathId,
      stepId
    }: {
      studentId: string;
      pathId: string;
      stepId: string;
    }) {
      return mutateDatabase((database) => {
        const user = database.users.find((candidate) => candidate.id === studentId);
        if (!user || user.role !== "student") return { status: "forbidden" as const };
        const record = (database.teacher_learning_paths ?? []).find((candidate) => candidate.id === pathId);
        if (!record || record.status !== "active" || !(record.assigned_student_ids ?? []).includes(studentId)) {
          return { status: "not-found" as const };
        }
        const steps = orderedSteps(record);
        const stepIndex = steps.findIndex((step) => step.id === stepId);
        if (stepIndex === -1) return { status: "step-not-found" as const };

        const completedStepIds = new Set(
          (database.learning_path_step_progress ?? [])
            .filter((progress) => progress.path_id === pathId && progress.student_id === studentId)
            .map((progress) => progress.step_id)
        );
        const priorComplete = steps.slice(0, stepIndex).every((step) => completedStepIds.has(step.id));
        if (!priorComplete) return { status: "locked" as const };

        database.learning_path_step_progress ??= [];
        if (!completedStepIds.has(stepId)) {
          database.learning_path_step_progress.push({
            id: `path-progress-${createId()}`,
            path_id: pathId,
            step_id: stepId,
            student_id: studentId,
            completed_at: now().toISOString()
          });
        }

        return {
          status: "completed" as const,
          path: toStudentLearningPath({ database, record, studentId, stepHref })
        };
      });
    }
  };
}
