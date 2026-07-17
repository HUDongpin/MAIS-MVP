import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";

import type {
  Difficulty,
  GradeId,
  TeachingResource,
  TeachingResourceType,
  TeacherResourceLibraryData,
  TeacherTopicOption
} from "@/types";

type TeacherOpsResourceUserRole = "student" | "teacher" | "parent" | "admin";

type TeacherOpsResourceUserRecord = {
  id: string;
  role: TeacherOpsResourceUserRole;
};

export type TeacherOpsResourceRecord = {
  id: string;
  title_en: string;
  title_zh: string;
  type: TeachingResourceType;
  file_name: string;
  file_type: string;
  mime_type: string;
  file_size_bytes: number;
  storage_path?: string;
  grade: GradeId;
  topic_id?: string;
  difficulty?: Difficulty;
  uploaded_by: string;
  created_at: string;
};

type TeacherOpsResourceAssignmentRecord = {
  content_type?: string;
  target_id?: string;
};

type TeacherOpsResourceAssessmentRecord = {
  source_resource_id?: string;
};

type TeacherOpsResourceTopicRecord = {
  id: string;
  grade: GradeId;
  sort_order: number;
  title_en: string;
  title_zh: string;
};

export type TeacherOpsResourceDownloadData = {
  resource: TeachingResource;
  bytes: Uint8Array;
  mimeType: string;
  fileName: string;
};

export type TeacherOpsResourceCreateInput = {
  teacherId: string;
  title: string;
  grade: GradeId;
  topicId?: string | null;
  difficulty?: Difficulty | null;
  type?: TeachingResourceType | null;
  file: {
    name: string;
    type: string;
    size: number;
    bytes: Uint8Array;
  };
};

export type TeacherOpsResourceCreateResult =
  | { status: "invalid" }
  | { status: "forbidden" }
  | { status: "created"; resource: TeachingResource };

export type TeacherOpsResourcePersistenceDatabase = {
  assignments?: TeacherOpsResourceAssignmentRecord[];
  assessments?: TeacherOpsResourceAssessmentRecord[];
  teaching_resources: TeacherOpsResourceRecord[];
  topics: TeacherOpsResourceTopicRecord[];
  users: TeacherOpsResourceUserRecord[];
};

export type TeacherOpsResourcePersistenceStoreDependencies = {
  now?: () => Date;
  readDatabase: () => Promise<TeacherOpsResourcePersistenceDatabase>;
  mutateDatabase: <Result>(
    mutator: (database: TeacherOpsResourcePersistenceDatabase) => Promise<Result> | Result
  ) => Promise<Result>;
  createId?: () => string;
  gradeIsValid: (grade: GradeId) => boolean;
  difficultyIsActive: (difficulty?: Difficulty | null) => difficulty is Difficulty;
  storeResourceFile: (input: {
    storedFileName: string;
    bytes: Uint8Array;
  }) => Promise<string> | string;
  resourceProjection: (
    database: TeacherOpsResourcePersistenceDatabase,
    resource: TeacherOpsResourceRecord
  ) => TeachingResource;
  topicMatchesUserCurriculum: (
    database: TeacherOpsResourcePersistenceDatabase,
    topic: TeacherOpsResourceTopicRecord,
    user: TeacherOpsResourceUserRecord
  ) => boolean;
  topicOptionProjection: (
    database: TeacherOpsResourcePersistenceDatabase,
    topic: TeacherOpsResourceTopicRecord
  ) => TeacherTopicOption;
};

export type TeacherOpsResourcePersistenceStore = ReturnType<typeof createTeacherOpsResourcePersistenceStore>;

export type TeacherOpsResourceCollectionRecord = Omit<
  TeacherOpsResourceRecord,
  "file_size_bytes" | "mime_type" | "storage_path"
> & {
  file_size_bytes?: number | null;
  mime_type?: string | null;
  storage_path?: string | null;
};

export type TeacherOpsResourceCollectionRecords = {
  teaching_resources?: TeacherOpsResourceCollectionRecord[];
};

export type TeacherOpsResourceCollectionNormalizationOptions = {
  demoTeacherId: string;
};

function mergeTeacherOpsResourceSeedRecordsPreservingExisting<T>(
  existingRecords: T[] | undefined,
  seedRecords: T[],
  keyFor: (record: T) => string
) {
  const existingByKey = new Map((existingRecords ?? []).map((record) => [keyFor(record), record]));
  const seedKeys = new Set(seedRecords.map(keyFor));
  const seedOrExistingRecords = seedRecords.map((record) => existingByKey.get(keyFor(record)) ?? record);
  const extraRecords = (existingRecords ?? []).filter((record) => !seedKeys.has(keyFor(record)));
  return [...seedOrExistingRecords, ...extraRecords];
}

export function normalizeTeacherOpsResourceRecord<Record extends {
  mime_type?: string | null;
  file_size_bytes?: number | null;
  storage_path?: string | null;
}>(
  resource: Record
): Record & {
  mime_type: string;
  file_size_bytes: number;
  storage_path?: string;
} {
  return {
    ...resource,
    mime_type: resource.mime_type ?? "",
    file_size_bytes: resource.file_size_bytes ?? 0,
    storage_path: resource.storage_path ?? undefined
  };
}

export function normalizeTeacherOpsResourceCollections(
  collections: TeacherOpsResourceCollectionRecords,
  now: string,
  options: TeacherOpsResourceCollectionNormalizationOptions
): {
  teaching_resources: Array<TeacherOpsResourceCollectionRecord & {
    file_size_bytes: number;
    mime_type: string;
    storage_path?: string;
  }>;
} {
  return {
    teaching_resources: mergeTeacherOpsResourceSeedRecordsPreservingExisting<
      TeacherOpsResourceCollectionRecord | TeacherOpsResourceRecord
    >(
      collections.teaching_resources,
      teacherOpsSeedTeachingResourceRecords(now, options),
      (resource) => resource.id
    ).map((resource) => normalizeTeacherOpsResourceRecord(resource))
  };
}

export function teacherOpsSeedTeachingResourceRecords(
  now: string,
  {
    demoTeacherId
  }: {
    demoTeacherId: string;
  }
): TeacherOpsResourceRecord[] {
  return [
    {
      id: "resource-s3-quadratics-slides",
      title_en: "S3 Quadratics lesson slides",
      title_zh: "中三二次函數課件",
      type: "slides",
      file_name: "s3-quadratics-intro.pptx",
      file_type: "PPTX",
      mime_type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      file_size_bytes: 2480000,
      storage_path: "seed://s3-quadratics-intro.pptx",
      grade: "S3",
      topic_id: "quadratic-functions",
      difficulty: "Medium",
      uploaded_by: demoTeacherId,
      created_at: now
    }
  ];
}

function canUseTeacherArea(user?: TeacherOpsResourceUserRecord | null): user is TeacherOpsResourceUserRecord {
  return user?.role === "teacher" || user?.role === "admin";
}

export function teacherResourceRecordsFor(
  database: TeacherOpsResourcePersistenceDatabase,
  user: TeacherOpsResourceUserRecord
) {
  return database.teaching_resources.filter((resource) => user.role === "admin" || resource.uploaded_by === user.id);
}

export function teacherOpsResourceReferenceCounts(
  database: Pick<TeacherOpsResourcePersistenceDatabase, "assignments" | "assessments">,
  resourceId: string
): TeachingResource["referenceCounts"] {
  return {
    assignments: (database.assignments ?? []).filter(
      (assignment) => assignment.content_type === "resource" && assignment.target_id === resourceId
    ).length,
    assessments: (database.assessments ?? []).filter((assessment) => assessment.source_resource_id === resourceId).length,
    classroom: 0
  };
}

export function toTeacherOpsTeachingResource(
  database: TeacherOpsResourcePersistenceDatabase,
  record: TeacherOpsResourceRecord
): TeachingResource {
  return {
    id: record.id,
    title: {
      en: record.title_en,
      zh: record.title_zh
    },
    type: record.type,
    fileName: record.file_name,
    fileType: record.file_type,
    mimeType: record.mime_type,
    fileSizeBytes: record.file_size_bytes,
    storagePath: record.storage_path,
    grade: record.grade,
    topicId: record.topic_id,
    difficulty: record.difficulty,
    uploadedBy: record.uploaded_by,
    createdAt: record.created_at,
    referenceCounts: teacherOpsResourceReferenceCounts(database, record.id)
  };
}

const dayMs = 24 * 60 * 60 * 1000;

function timestampOf(value?: string | null) {
  const time = value ? Date.parse(value) : Number.NaN;
  return Number.isFinite(time) ? time : null;
}

function isWithinDays(value: string | null | undefined, nowMs: number, days: number) {
  const time = timestampOf(value);
  return time !== null && time >= nowMs - days * dayMs && time <= nowMs + days * dayMs;
}

export const teacherOpsResourceIsWithinDays = isWithinDays;

const acceptedTeacherResourceExtensions = new Set(["pptx", "docx", "pdf", "png", "jpg", "jpeg", "webp"]);
const validTeachingResourceTypes = new Set<TeachingResourceType>([
  "slides",
  "practice",
  "quiz",
  "worksheet",
  "exam-paper",
  "marking-scheme",
  "image",
  "document",
  "other"
]);

function uploadBaseName(fileName: string) {
  return fileName.split(/[\\/]/).filter(Boolean).pop() ?? "";
}

function fileExtensionFor(fileName: string) {
  const baseName = uploadBaseName(fileName);
  const extension = baseName.includes(".") ? baseName.slice(baseName.lastIndexOf(".") + 1).toLowerCase() : "";
  return extension === "jpeg" ? "jpg" : extension;
}

function inferResourceTypeFromFile(fileName: string): TeachingResourceType {
  const extension = fileExtensionFor(fileName);
  if (extension === "pptx") return "slides";
  if (extension === "pdf") return "exam-paper";
  if (extension === "docx") return "worksheet";
  if (["png", "jpg", "webp"].includes(extension)) return "image";
  return "document";
}

export function safeUploadFileName(fileName: string) {
  const baseName = uploadBaseName(fileName).replace(/[^a-zA-Z0-9._-]/g, "_");
  return baseName || "resource-upload";
}

export async function teacherOpsResourceDownloadPayload(
  database: TeacherOpsResourcePersistenceDatabase,
  record: TeacherOpsResourceRecord,
  resourceProjection: (
    database: TeacherOpsResourcePersistenceDatabase,
    resource: TeacherOpsResourceRecord
  ) => TeachingResource
): Promise<TeacherOpsResourceDownloadData | null> {
  if (record.storage_path?.startsWith("seed://")) {
    const body = [
      `${record.title_en}`,
      "",
      "Seed resource placeholder.",
      `File name: ${record.file_name}`,
      `Grade: ${record.grade}`,
      record.topic_id ? `Topic: ${record.topic_id}` : ""
    ].filter(Boolean).join("\n");
    return {
      resource: resourceProjection(database, record),
      bytes: Buffer.from(body, "utf8"),
      mimeType: "text/plain; charset=utf-8",
      fileName: record.file_name.replace(/\.[^.]+$/, ".txt")
    };
  }

  if (!record.storage_path) return null;

  try {
    return {
      resource: resourceProjection(database, record),
      bytes: await readFile(record.storage_path),
      mimeType: record.mime_type || "application/octet-stream",
      fileName: record.file_name
    };
  } catch {
    return null;
  }
}

export function createTeacherOpsResourcePersistenceStore({
  now = () => new Date(),
  readDatabase,
  mutateDatabase,
  createId = randomUUID,
  gradeIsValid,
  difficultyIsActive,
  storeResourceFile,
  resourceProjection,
  topicMatchesUserCurriculum,
  topicOptionProjection
}: TeacherOpsResourcePersistenceStoreDependencies) {
  return {
    async createTeacherResource({
      teacherId,
      title,
      grade,
      topicId,
      difficulty,
      type,
      file
    }: TeacherOpsResourceCreateInput): Promise<TeacherOpsResourceCreateResult> {
      const trimmedTitle = title.trim();
      const extension = fileExtensionFor(file.name);
      if (!trimmedTitle || !gradeIsValid(grade) || !acceptedTeacherResourceExtensions.has(extension) || file.size <= 0) {
        return { status: "invalid" };
      }
      const resourceType = type && validTeachingResourceTypes.has(type) ? type : inferResourceTypeFromFile(file.name);

      return mutateDatabase(async (database) => {
        const user = database.users.find((candidate) => candidate.id === teacherId);
        if (!canUseTeacherArea(user)) return { status: "forbidden" };

        const cleanTopicId =
          topicId && database.topics.some((topic) =>
            topicMatchesUserCurriculum(database, topic, user) && topic.id === topicId && topic.grade === grade
          )
            ? topicId
            : undefined;
        const cleanDifficulty = difficultyIsActive(difficulty) ? difficulty : undefined;
        const resourceId = `resource-${createId()}`;
        const fileName = safeUploadFileName(file.name);
        const storedFileName = `${resourceId}-${fileName}`;
        const storagePath = await storeResourceFile({ storedFileName, bytes: file.bytes });

        const record: TeacherOpsResourceRecord = {
          id: resourceId,
          title_en: trimmedTitle,
          title_zh: trimmedTitle,
          type: resourceType,
          file_name: fileName,
          file_type: extension.toUpperCase(),
          mime_type: file.type,
          file_size_bytes: file.size,
          storage_path: storagePath,
          grade,
          topic_id: cleanTopicId,
          difficulty: cleanDifficulty,
          uploaded_by: user.id,
          created_at: now().toISOString()
        };
        database.teaching_resources.unshift(record);

        return { status: "created", resource: resourceProjection(database, record) };
      });
    },
    async getTeacherResourceLibraryData(userId: string): Promise<TeacherResourceLibraryData | null> {
      const database = await readDatabase();
      const user = database.users.find((candidate) => candidate.id === userId);
      if (!canUseTeacherArea(user)) return null;

      const nowMs = now().getTime();
      const resources = teacherResourceRecordsFor(database, user)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .map((resource) => resourceProjection(database, resource));
      const topicOptions = database.topics
        .filter((topic) => topicMatchesUserCurriculum(database, topic, user))
        .sort((a, b) => a.grade.localeCompare(b.grade) || a.sort_order - b.sort_order)
        .map((topic) => topicOptionProjection(database, topic));

      return {
        generatedAt: new Date(nowMs).toISOString(),
        resources,
        topicOptions,
        totals: {
          resources: resources.length,
          uploadedThisWeek: resources.filter((resource) => isWithinDays(resource.createdAt, nowMs, 7)).length,
          assignmentReferences: resources.reduce((sum, resource) => sum + resource.referenceCounts.assignments, 0),
          assessmentReferences: resources.reduce((sum, resource) => sum + resource.referenceCounts.assessments, 0)
        }
      };
    },
    async getTeacherResourceDownloadData(userId: string, resourceId: string) {
      const database = await readDatabase();
      const user = database.users.find((candidate) => candidate.id === userId);
      if (!canUseTeacherArea(user)) return null;

      const resource = teacherResourceRecordsFor(database, user).find((candidate) => candidate.id === resourceId);
      return resource ? teacherOpsResourceDownloadPayload(database, resource, resourceProjection) : null;
    }
  };
}
