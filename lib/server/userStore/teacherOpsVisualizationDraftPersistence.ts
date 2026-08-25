import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";

import {
  MATH_SCENE_PACKAGE_V3_SCHEMA_VERSION,
  validateMathScenePackageV3,
  type MathScenePackageV3
} from "@/components/visualizations/three/manim/mathScenePackageV3";
import { emptyMathSceneV3ReviewLedger } from "@/components/visualizations/three/manim/mathSceneV3GateLedger";
import type {
  TeacherVisualizationDraftRecord,
  TeacherVisualizationDraftStatus
} from "@/types";

export type { TeacherVisualizationDraftRecord, TeacherVisualizationDraftStatus } from "@/types";

export const teacherVisualizationDraftStatuses = [
  "editing",
  "ready-for-review",
  "archived"
] as const satisfies readonly TeacherVisualizationDraftStatus[];

export type TeacherOpsVisualizationDraftPersistenceDatabase = {
  teacher_visualization_drafts: TeacherVisualizationDraftRecord[];
};

export type TeacherOpsVisualizationDraftPersistenceStoreDependencies = {
  createId?: () => string;
  now?: () => Date;
  readDatabase: () => Promise<TeacherOpsVisualizationDraftPersistenceDatabase>;
  mutateDatabase: <T>(
    mutator: (database: TeacherOpsVisualizationDraftPersistenceDatabase) => T | Promise<T>
  ) => Promise<T>;
};

export type TeacherOpsVisualizationDraftPersistenceStore = ReturnType<
  typeof createTeacherOpsVisualizationDraftPersistenceStore
>;

export const TEACHER_VISUALIZATION_DRAFT_TITLE_MAX_LENGTH = 160;

const recordIdPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,191}$/;

class TeacherVisualizationDraftRevisionConflictError extends Error {
  constructor(
    readonly currentRevision: number,
    readonly serverVersion: TeacherVisualizationDraftRecord
  ) {
    super("Teacher visualization draft revision conflict.");
    this.name = "TeacherVisualizationDraftRevisionConflictError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isValidIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 40) return false;
  try {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) && date.toISOString() === value;
  } catch {
    return false;
  }
}

function canonicalTimestamp(value: Date): string {
  return value.toISOString();
}

function monotonicTimestamp(value: Date, previousTimestamp: string): string {
  const currentTime = value.getTime();
  const previousTime = new Date(previousTimestamp).getTime();
  if (!Number.isFinite(currentTime) || !Number.isFinite(previousTime)) {
    throw new RangeError("Teacher visualization draft timestamps must be valid dates.");
  }
  return new Date(Math.max(currentTime, previousTime + 1)).toISOString();
}

function isDraftStatus(value: unknown): value is TeacherVisualizationDraftStatus {
  return teacherVisualizationDraftStatuses.includes(value as TeacherVisualizationDraftStatus);
}

export function normalizeTeacherVisualizationDraftTitle(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const title = value.trim();
  if (!title || title.length > TEACHER_VISUALIZATION_DRAFT_TITLE_MAX_LENGTH) return null;
  if (/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/.test(title)) return null;
  return title;
}

function detachedValidatedPackage(value: unknown): MathScenePackageV3 | null {
  const result = validateMathScenePackageV3(value);
  return result.ok ? result.value : null;
}

/**
 * Teacher/admin draft routes edit authoring content, not release evidence.
 * Validation alone is insufficient because `reviewLedger` and
 * `brief.evidenceLevel` are valid package fields that belong to independent
 * gate owners. Any full-package authoring write therefore starts a new,
 * unreviewed content revision. A future gate-owner endpoint must be separately
 * authorized and must not reuse this write path.
 */
function detachedTeacherEditablePackage(value: unknown): MathScenePackageV3 | null {
  const packageJson = detachedValidatedPackage(value);
  if (!packageJson) return null;
  packageJson.brief.evidenceLevel = "spec-only";
  packageJson.reviewLedger = emptyMathSceneV3ReviewLedger();
  return packageJson;
}

function cloneDraft(record: TeacherVisualizationDraftRecord): TeacherVisualizationDraftRecord {
  return structuredClone(record);
}

function projectStoredDraft(value: unknown): TeacherVisualizationDraftRecord | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== "string" || !recordIdPattern.test(value.id)) return null;
  if (typeof value.ownerId !== "string" || !recordIdPattern.test(value.ownerId)) return null;
  const title = normalizeTeacherVisualizationDraftTitle(value.title);
  if (!title) return null;
  if (value.schemaVersion !== MATH_SCENE_PACKAGE_V3_SCHEMA_VERSION) return null;
  if (!isDraftStatus(value.status)) return null;
  if (!Number.isSafeInteger(value.revision) || (value.revision as number) < 1) return null;
  if (!isValidIsoDate(value.createdAt) || !isValidIsoDate(value.updatedAt)) return null;
  if (new Date(value.updatedAt).getTime() < new Date(value.createdAt).getTime()) return null;
  if (value.status === "archived") {
    if (!isValidIsoDate(value.archivedAt)) return null;
    if (value.archivedAt !== value.updatedAt) return null;
  } else if (value.archivedAt !== null) {
    return null;
  }
  const packageJson = detachedValidatedPackage(value.packageJson);
  if (!packageJson || packageJson.schemaVersion !== value.schemaVersion) return null;
  return {
    id: value.id,
    ownerId: value.ownerId,
    title,
    schemaVersion: MATH_SCENE_PACKAGE_V3_SCHEMA_VERSION,
    status: value.status,
    revision: value.revision as number,
    packageJson,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    archivedAt: value.archivedAt as string | null
  };
}

export function normalizeTeacherVisualizationDraftRecords(value: unknown): TeacherVisualizationDraftRecord[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const records: TeacherVisualizationDraftRecord[] = [];
  for (const candidate of value) {
    const record = projectStoredDraft(candidate);
    if (!record || seen.has(record.id)) continue;
    seen.add(record.id);
    records.push(record);
  }
  return records;
}

function orderedOwnerDrafts(
  database: TeacherOpsVisualizationDraftPersistenceDatabase,
  ownerId: string
): TeacherVisualizationDraftRecord[] {
  return (database.teacher_visualization_drafts ?? [])
    .filter((record) => record.ownerId === ownerId && record.status !== "archived")
    .sort((left, right) =>
      right.updatedAt.localeCompare(left.updatedAt)
      || right.createdAt.localeCompare(left.createdAt)
      || left.id.localeCompare(right.id)
    );
}

export function createTeacherOpsVisualizationDraftPersistenceStore({
  createId = () => randomUUID(),
  now = () => new Date(),
  readDatabase,
  mutateDatabase
}: TeacherOpsVisualizationDraftPersistenceStoreDependencies) {
  return {
    async listTeacherVisualizationDrafts(ownerId: string) {
      if (!recordIdPattern.test(ownerId)) return [];
      const database = await readDatabase();
      return orderedOwnerDrafts(database, ownerId).map(cloneDraft);
    },

    async getTeacherVisualizationDraft({ ownerId, draftId }: { ownerId: string; draftId: string }) {
      if (!recordIdPattern.test(ownerId) || !recordIdPattern.test(draftId)) {
        return { status: "not-found" as const };
      }
      const database = await readDatabase();
      const draft = (database.teacher_visualization_drafts ?? []).find(
        (candidate) => candidate.id === draftId && candidate.ownerId === ownerId && candidate.status !== "archived"
      );
      return draft
        ? { status: "found" as const, draft: cloneDraft(draft) }
        : { status: "not-found" as const };
    },

    async createTeacherVisualizationDraft({
      ownerId,
      title,
      packageJson,
      status = "editing"
    }: {
      ownerId: string;
      title: string;
      packageJson: MathScenePackageV3;
      status?: "editing" | "ready-for-review";
    }) {
      const normalizedTitle = normalizeTeacherVisualizationDraftTitle(title);
      if (!recordIdPattern.test(ownerId) || !normalizedTitle || !["editing", "ready-for-review"].includes(status)) {
        return { status: "invalid" as const };
      }
      const detachedPackage = detachedTeacherEditablePackage(packageJson);
      if (!detachedPackage) return { status: "invalid-package" as const };

      return mutateDatabase((database) => {
        database.teacher_visualization_drafts ??= [];
        let id = `visualization-draft-${createId()}`;
        let attempts = 0;
        while (database.teacher_visualization_drafts.some((candidate) => candidate.id === id) && attempts < 8) {
          id = `visualization-draft-${createId()}`;
          attempts += 1;
        }
        if (database.teacher_visualization_drafts.some((candidate) => candidate.id === id)) {
          return { status: "id-conflict" as const };
        }
        const timestamp = canonicalTimestamp(now());
        const draft: TeacherVisualizationDraftRecord = {
          id,
          ownerId,
          title: normalizedTitle,
          schemaVersion: MATH_SCENE_PACKAGE_V3_SCHEMA_VERSION,
          status,
          revision: 1,
          packageJson: detachedPackage,
          createdAt: timestamp,
          updatedAt: timestamp,
          archivedAt: null
        };
        database.teacher_visualization_drafts.push(draft);
        return { status: "created" as const, draft: cloneDraft(draft) };
      });
    },

    async updateTeacherVisualizationDraft(input: {
      ownerId: string;
      draftId: string;
      baseRevision: number;
      title?: string;
      packageJson?: MathScenePackageV3;
      status?: "editing" | "ready-for-review";
    }) {
      if (
        !recordIdPattern.test(input.ownerId)
        || !recordIdPattern.test(input.draftId)
        || !Number.isSafeInteger(input.baseRevision)
        || input.baseRevision < 1
      ) {
        return { status: "invalid" as const };
      }
      const hasTitle = input.title !== undefined;
      const hasPackage = input.packageJson !== undefined;
      const hasStatus = input.status !== undefined;
      if (!hasTitle && !hasPackage && !hasStatus) return { status: "invalid" as const };
      const normalizedTitle = hasTitle ? normalizeTeacherVisualizationDraftTitle(input.title) : undefined;
      if (hasTitle && !normalizedTitle) return { status: "invalid" as const };
      if (hasStatus && input.status !== "editing" && input.status !== "ready-for-review") {
        return { status: "invalid" as const };
      }
      const detachedPackage = hasPackage ? detachedTeacherEditablePackage(input.packageJson) : undefined;
      if (hasPackage && !detachedPackage) return { status: "invalid-package" as const };
      const validTitlePatch: string | undefined = hasTitle ? normalizedTitle! : undefined;
      const validPackagePatch: MathScenePackageV3 | undefined = hasPackage ? detachedPackage! : undefined;

      try {
        return await mutateDatabase((database) => {
          const draft = (database.teacher_visualization_drafts ?? []).find(
            (candidate) => candidate.id === input.draftId && candidate.ownerId === input.ownerId
          );
          if (!draft || draft.status === "archived") return { status: "not-found" as const };
          if (draft.revision !== input.baseRevision) {
            // Throwing aborts the shared app_state transaction/SQLite write. A
            // stale PATCH therefore cannot even advance the enclosing storage
            // revision, let alone partially modify the draft.
            throw new TeacherVisualizationDraftRevisionConflictError(
              draft.revision,
              cloneDraft(draft)
            );
          }

          if (validTitlePatch !== undefined) draft.title = validTitlePatch;
          if (validPackagePatch !== undefined) {
            const currentTeacherEditablePackage = detachedTeacherEditablePackage(draft.packageJson);
            // Some clients echo the full package while changing only title or
            // draft status. Compare only teacher-editable content: an unchanged
            // echo keeps the server-owned ledger, while any real content delta
            // becomes a fresh spec-only/pending review revision. Incoming gate
            // values are never copied in either branch.
            draft.packageJson = currentTeacherEditablePackage
              && isDeepStrictEqual(currentTeacherEditablePackage, validPackagePatch)
              ? draft.packageJson
              : validPackagePatch;
          }
          if (input.status !== undefined) draft.status = input.status;
          else if (hasTitle || hasPackage) draft.status = "editing";
          draft.revision += 1;
          draft.updatedAt = monotonicTimestamp(now(), draft.updatedAt);
          return { status: "saved" as const, draft: cloneDraft(draft) };
        });
      } catch (error) {
        if (error instanceof TeacherVisualizationDraftRevisionConflictError) {
          return {
            status: "conflict" as const,
            currentRevision: error.currentRevision,
            serverVersion: error.serverVersion
          };
        }
        throw error;
      }
    },

    async archiveTeacherVisualizationDraft({
      ownerId,
      draftId,
      baseRevision
    }: {
      ownerId: string;
      draftId: string;
      baseRevision: number;
    }) {
      if (
        !recordIdPattern.test(ownerId)
        || !recordIdPattern.test(draftId)
        || !Number.isSafeInteger(baseRevision)
        || baseRevision < 1
      ) {
        return { status: "not-found" as const };
      }
      try {
        return await mutateDatabase((database) => {
          const draft = (database.teacher_visualization_drafts ?? []).find(
            (candidate) => candidate.id === draftId && candidate.ownerId === ownerId
          );
          if (!draft) return { status: "not-found" as const };
          if (draft.revision !== baseRevision) {
            throw new TeacherVisualizationDraftRevisionConflictError(
              draft.revision,
              cloneDraft(draft)
            );
          }
          if (draft.status === "archived") {
            return { status: "archived" as const, draft: cloneDraft(draft) };
          }
          const timestamp = monotonicTimestamp(now(), draft.updatedAt);
          draft.status = "archived";
          draft.revision += 1;
          draft.updatedAt = timestamp;
          draft.archivedAt = timestamp;
          return { status: "archived" as const, draft: cloneDraft(draft) };
        });
      } catch (error) {
        if (error instanceof TeacherVisualizationDraftRevisionConflictError) {
          return {
            status: "conflict" as const,
            currentRevision: error.currentRevision,
            serverVersion: error.serverVersion
          };
        }
        throw error;
      }
    }
  };
}
