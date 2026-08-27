import { randomUUID } from "node:crypto";
import type {
  LearnerNote,
  LearnerNoteAnchor,
  LearnerNoteMutationSource,
  LearnerNoteRevision,
  LearnerNoteSearchResult,
  LearnerNotesListResponse
} from "@/types/learnerNotes";

export type LearnerNoteAnchorRecord = {
  type: "lesson" | "lesson-block" | "text-quote";
  lesson_slug: string;
  topic_id: string;
  block_id?: string;
  block_type?: string;
  selected_text?: string;
  surrounding_text?: string;
  source_revision?: string;
};

export type LearnerNoteRevisionRecord = {
  version: number;
  title: string;
  body: string;
  tags: string[];
  anchor: LearnerNoteAnchorRecord;
  source: LearnerNoteMutationSource;
  created_at: string;
};

export type LearnerNoteRecord = {
  id: string;
  owner_id: string;
  title: string;
  body: string;
  tags: string[];
  anchor: LearnerNoteAnchorRecord;
  visibility: "private";
  version: number;
  revisions: LearnerNoteRevisionRecord[];
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type LearnerNotesPersistenceDatabase = {
  users: Array<{ id: string; role: string }>;
  lessons: Array<{ slug: string; topic_id: string }>;
  lesson_blocks: Array<{ id: string; lesson_slug: string; type?: string }>;
  learner_notes: LearnerNoteRecord[];
};

type LearnerNoteCreateInput = {
  ownerId: string;
  title?: unknown;
  body: unknown;
  tags?: unknown;
  anchor: unknown;
};

type LearnerNoteUpdateInput = {
  ownerId: string;
  noteId: string;
  expectedVersion: number;
  title?: unknown;
  body?: unknown;
  tags?: unknown;
  anchor?: unknown;
  source?: LearnerNoteMutationSource;
};

type LearnerNotesListInput = {
  ownerId: string;
  query?: string;
  lessonSlug?: string;
  limit?: number;
};

type LearnerNoteMutationResult =
  | { status: "created" | "updated" | "deleted"; note: LearnerNote }
  | { status: "erased" }
  | { status: "conflict"; currentVersion: number }
  | { status: "forbidden" | "invalid" | "not-found" };

type LearnerNotesPersistenceDependencies = {
  readDatabase: () => Promise<LearnerNotesPersistenceDatabase>;
  mutateDatabase: <T>(mutator: (database: LearnerNotesPersistenceDatabase) => T | Promise<T>) => Promise<T>;
  createId?: () => string;
  now?: () => Date;
};

const maxTitleLength = 160;
const maxBodyLength = 20_000;
const maxTagLength = 48;
const maxTags = 12;
const maxLessonSlugLength = 180;
const maxTopicIdLength = 180;
const maxBlockIdLength = 180;
const maxBlockTypeLength = 80;
const maxSelectedTextLength = 500;
const maxSurroundingTextLength = 900;
const maxSourceRevisionLength = 160;
const validAnchorTypes = new Set<LearnerNoteAnchorRecord["type"]>(["lesson", "lesson-block", "text-quote"]);
const validMutationSources = new Set<LearnerNoteMutationSource>(["learner", "ai-accepted", "delete"]);

function cleanString(value: unknown, maxLength: number, { trim = true }: { trim?: boolean } = {}) {
  if (typeof value !== "string") return "";
  const withoutNulls = value.replace(/\u0000/g, "");
  const bounded = withoutNulls.slice(0, maxLength);
  return trim ? bounded.trim() : bounded;
}

function normalizeTags(value: unknown) {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const candidate of value) {
    const tag = cleanString(candidate, maxTagLength).replace(/\s+/g, " ");
    const key = tag.toLocaleLowerCase();
    if (!tag || seen.has(key)) continue;
    seen.add(key);
    tags.push(tag);
    if (tags.length >= maxTags) break;
  }
  return tags;
}

function normalizeAnchorRecord(value: unknown): LearnerNoteAnchorRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  const type = cleanString(candidate.type, 24) as LearnerNoteAnchorRecord["type"];
  const lessonSlug = cleanString(candidate.lessonSlug ?? candidate.lesson_slug, maxLessonSlugLength);
  const topicId = cleanString(candidate.topicId ?? candidate.topic_id, maxTopicIdLength);
  if (!validAnchorTypes.has(type) || !lessonSlug || !topicId) return null;

  const blockId = cleanString(candidate.blockId ?? candidate.block_id, maxBlockIdLength);
  const blockType = cleanString(candidate.blockType ?? candidate.block_type, maxBlockTypeLength);
  const selectedText = cleanString(candidate.selectedText ?? candidate.selected_text, maxSelectedTextLength);
  const surroundingText = cleanString(candidate.surroundingText ?? candidate.surrounding_text, maxSurroundingTextLength);
  const sourceRevision = cleanString(candidate.sourceRevision ?? candidate.source_revision, maxSourceRevisionLength);
  if ((type === "lesson-block" || type === "text-quote") && !blockId) return null;
  if (type === "text-quote" && !selectedText) return null;

  return {
    type,
    lesson_slug: lessonSlug,
    topic_id: topicId,
    ...(blockId ? { block_id: blockId } : {}),
    ...(blockType ? { block_type: blockType } : {}),
    ...(selectedText ? { selected_text: selectedText } : {}),
    ...(surroundingText ? { surrounding_text: surroundingText } : {}),
    ...(sourceRevision ? { source_revision: sourceRevision } : {})
  };
}

function isoString(value: unknown, fallback: string) {
  if (typeof value !== "string" || !value.trim() || Number.isNaN(Date.parse(value))) return fallback;
  return new Date(value).toISOString();
}

function positiveVersion(value: unknown, fallback = 1) {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : fallback;
}

function normalizeRevisionRecord(value: unknown, fallback: {
  anchor: LearnerNoteAnchorRecord;
  body: string;
  createdAt: string;
  tags: string[];
  title: string;
  version: number;
}): LearnerNoteRevisionRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  const anchor = normalizeAnchorRecord(candidate.anchor) ?? fallback.anchor;
  const version = positiveVersion(candidate.version, fallback.version);
  const source = validMutationSources.has(candidate.source as LearnerNoteMutationSource)
    ? candidate.source as LearnerNoteMutationSource
    : "learner";
  return {
    version,
    title: cleanString(candidate.title, maxTitleLength),
    body: cleanString(candidate.body, maxBodyLength, { trim: false }),
    tags: normalizeTags(candidate.tags),
    anchor,
    source,
    created_at: isoString(candidate.created_at ?? candidate.createdAt, fallback.createdAt)
  };
}

export function normalizeLearnerNoteRecords(value: unknown, nowIso: string) {
  if (!Array.isArray(value)) return [];
  const byId = new Map<string, LearnerNoteRecord>();
  for (const candidateValue of value) {
    if (!candidateValue || typeof candidateValue !== "object" || Array.isArray(candidateValue)) continue;
    const candidate = candidateValue as Record<string, unknown>;
    const id = cleanString(candidate.id, 200);
    const ownerId = cleanString(candidate.owner_id ?? candidate.ownerId, 200);
    const body = cleanString(candidate.body, maxBodyLength, { trim: false });
    const anchor = normalizeAnchorRecord(candidate.anchor);
    if (!id || !ownerId || !body.trim() || !anchor) continue;
    const version = positiveVersion(candidate.version);
    const createdAt = isoString(candidate.created_at ?? candidate.createdAt, nowIso);
    const updatedAt = isoString(candidate.updated_at ?? candidate.updatedAt, createdAt);
    const title = cleanString(candidate.title, maxTitleLength);
    const tags = normalizeTags(candidate.tags);
    const revisions = Array.isArray(candidate.revisions)
      ? candidate.revisions
          .map((revision) => normalizeRevisionRecord(revision, { anchor, body, createdAt, tags, title, version }))
          .filter((revision): revision is LearnerNoteRevisionRecord => Boolean(revision))
          .sort((left, right) => left.version - right.version || left.created_at.localeCompare(right.created_at))
      : [];
    const latestRevisions = Array.from(new Map(revisions.map((revision) => [revision.version, revision])).values());
    if (!latestRevisions.some((revision) => revision.version === version)) {
      latestRevisions.push({ version, title, body, tags, anchor, source: "learner", created_at: updatedAt });
    }
    byId.set(id, {
      id,
      owner_id: ownerId,
      title,
      body,
      tags,
      anchor,
      visibility: "private",
      version,
      revisions: latestRevisions.sort((left, right) => left.version - right.version),
      created_at: createdAt,
      updated_at: updatedAt,
      deleted_at: candidate.deleted_at || candidate.deletedAt
        ? isoString(candidate.deleted_at ?? candidate.deletedAt, updatedAt)
        : null
    });
  }
  return Array.from(byId.values()).sort((left, right) => left.created_at.localeCompare(right.created_at) || left.id.localeCompare(right.id));
}

function canOwnNotes(database: LearnerNotesPersistenceDatabase, ownerId: string) {
  return database.users.some((user) => user.id === ownerId && user.role === "student");
}

function anchorStatus(database: LearnerNotesPersistenceDatabase, anchor: LearnerNoteAnchorRecord) {
  const lesson = database.lessons.find((candidate) => candidate.slug === anchor.lesson_slug && candidate.topic_id === anchor.topic_id);
  if (!lesson) return "orphaned" as const;
  if (!anchor.block_id) return "active" as const;
  return database.lesson_blocks.some((block) => block.id === anchor.block_id && block.lesson_slug === lesson.slug)
    ? "active" as const
    : "orphaned" as const;
}

function anchorProjection(database: LearnerNotesPersistenceDatabase, anchor: LearnerNoteAnchorRecord): LearnerNoteAnchor {
  return {
    type: anchor.type,
    lessonSlug: anchor.lesson_slug,
    topicId: anchor.topic_id,
    ...(anchor.block_id ? { blockId: anchor.block_id } : {}),
    ...(anchor.block_type ? { blockType: anchor.block_type } : {}),
    ...(anchor.selected_text ? { selectedText: anchor.selected_text } : {}),
    ...(anchor.surrounding_text ? { surroundingText: anchor.surrounding_text } : {}),
    ...(anchor.source_revision ? { sourceRevision: anchor.source_revision } : {}),
    status: anchorStatus(database, anchor)
  };
}

function noteProjection(database: LearnerNotesPersistenceDatabase, record: LearnerNoteRecord): LearnerNote {
  return {
    id: record.id,
    title: record.title,
    body: record.body,
    tags: [...record.tags],
    anchor: anchorProjection(database, record.anchor),
    visibility: "private",
    version: record.version,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    deletedAt: record.deleted_at
  };
}

function revisionProjection(database: LearnerNotesPersistenceDatabase, record: LearnerNoteRevisionRecord): LearnerNoteRevision {
  return {
    version: record.version,
    title: record.title,
    body: record.body,
    tags: [...record.tags],
    anchor: anchorProjection(database, record.anchor),
    source: record.source,
    createdAt: record.created_at
  };
}

function excerptFor(body: string, query: string) {
  const compacted = body.replace(/\s+/g, " ").trim();
  if (!query) return compacted.slice(0, 180);
  const index = compacted.toLocaleLowerCase().indexOf(query.toLocaleLowerCase());
  if (index < 0) return compacted.slice(0, 180);
  const start = Math.max(0, index - 70);
  const end = Math.min(compacted.length, index + query.length + 100);
  return `${start ? "…" : ""}${compacted.slice(start, end)}${end < compacted.length ? "…" : ""}`;
}

function searchResult(database: LearnerNotesPersistenceDatabase, record: LearnerNoteRecord, query: string): LearnerNoteSearchResult | null {
  const normalizedQuery = query.toLocaleLowerCase();
  const matchedFields: LearnerNoteSearchResult["matchedFields"] = [];
  let score = 0;
  if (record.title.toLocaleLowerCase().includes(normalizedQuery)) {
    matchedFields.push("title");
    score += 30;
  }
  if (record.tags.some((tag) => tag.toLocaleLowerCase().includes(normalizedQuery))) {
    matchedFields.push("tags");
    score += 20;
  }
  if (record.body.toLocaleLowerCase().includes(normalizedQuery)) {
    matchedFields.push("body");
    score += 10;
  }
  if (!matchedFields.length) return null;
  return { note: noteProjection(database, record), excerpt: excerptFor(record.body, query), matchedFields, score };
}

export function learnerNoteEtag(noteId: string, version: number) {
  return `"learner-note:${noteId}:v${version}"`;
}

export function learnerNoteVersionFromIfMatch(value: string | null, noteId: string) {
  if (!value) return null;
  const match = /^"learner-note:([^"\r\n]+):v([1-9]\d*)"$/u.exec(value.trim());
  if (!match || match[1] !== noteId) return null;
  const version = Number(match[2]);
  return Number.isSafeInteger(version) ? version : null;
}

export function createLearnerNotesPersistenceStore({
  createId = randomUUID,
  mutateDatabase,
  now = () => new Date(),
  readDatabase
}: LearnerNotesPersistenceDependencies) {
  async function listLearnerNotes({ ownerId, query = "", lessonSlug = "", limit = 50 }: LearnerNotesListInput): Promise<LearnerNotesListResponse | null> {
    const database = await readDatabase();
    if (!canOwnNotes(database, ownerId)) return null;
    const normalizedQuery = cleanString(query, 200);
    const normalizedLessonSlug = cleanString(lessonSlug, maxLessonSlugLength);
    const safeLimit = Math.max(1, Math.min(50, Math.round(limit) || 50));
    const authorized = database.learner_notes
      .filter((record) => record.owner_id === ownerId && !record.deleted_at)
      .filter((record) => !normalizedLessonSlug || record.anchor.lesson_slug === normalizedLessonSlug);
    if (normalizedQuery) {
      const results = authorized
        .map((record) => searchResult(database, record, normalizedQuery))
        .filter((result): result is LearnerNoteSearchResult => Boolean(result))
        .sort((left, right) => right.score - left.score || right.note.updatedAt.localeCompare(left.note.updatedAt) || left.note.id.localeCompare(right.note.id));
      return { notes: results.slice(0, safeLimit).map((result) => result.note), results: results.slice(0, safeLimit), total: results.length };
    }
    const notes = authorized
      .map((record) => noteProjection(database, record))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt) || left.id.localeCompare(right.id));
    return { notes: notes.slice(0, safeLimit), total: notes.length };
  }

  async function getLearnerNote(ownerId: string, noteId: string, { includeDeleted = false } = {}) {
    const database = await readDatabase();
    if (!canOwnNotes(database, ownerId)) return null;
    const record = database.learner_notes.find((candidate) => candidate.id === noteId && candidate.owner_id === ownerId);
    if (!record || (!includeDeleted && record.deleted_at)) return null;
    return noteProjection(database, record);
  }

  async function listLearnerNoteRevisions(ownerId: string, noteId: string) {
    const database = await readDatabase();
    if (!canOwnNotes(database, ownerId)) return null;
    const record = database.learner_notes.find((candidate) => candidate.id === noteId && candidate.owner_id === ownerId);
    if (!record) return null;
    return record.revisions.map((revision) => revisionProjection(database, revision));
  }

  async function createLearnerNote({ ownerId, title, body, tags, anchor }: LearnerNoteCreateInput): Promise<LearnerNoteMutationResult> {
    const normalizedBody = cleanString(body, maxBodyLength, { trim: false });
    const normalizedAnchor = normalizeAnchorRecord(anchor);
    if (!normalizedBody.trim() || !normalizedAnchor) return { status: "invalid" };
    return mutateDatabase((database) => {
      if (!canOwnNotes(database, ownerId)) return { status: "forbidden" };
      const timestamp = now().toISOString();
      const record: LearnerNoteRecord = {
        id: `learner-note-${createId()}`,
        owner_id: ownerId,
        title: cleanString(title, maxTitleLength),
        body: normalizedBody,
        tags: normalizeTags(tags),
        anchor: normalizedAnchor,
        visibility: "private",
        version: 1,
        revisions: [],
        created_at: timestamp,
        updated_at: timestamp,
        deleted_at: null
      };
      record.revisions.push({ version: 1, title: record.title, body: record.body, tags: [...record.tags], anchor: { ...record.anchor }, source: "learner", created_at: timestamp });
      database.learner_notes.push(record);
      return { status: "created", note: noteProjection(database, record) };
    });
  }

  async function updateLearnerNote({ ownerId, noteId, expectedVersion, title, body, tags, anchor, source = "learner" }: LearnerNoteUpdateInput): Promise<LearnerNoteMutationResult> {
    if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1 || !validMutationSources.has(source) || source === "delete") return { status: "invalid" };
    return mutateDatabase((database) => {
      if (!canOwnNotes(database, ownerId)) return { status: "forbidden" };
      const record = database.learner_notes.find((candidate) => candidate.id === noteId && candidate.owner_id === ownerId);
      if (!record || record.deleted_at) return { status: "not-found" };
      if (record.version !== expectedVersion) return { status: "conflict", currentVersion: record.version };
      const nextBody = body === undefined ? record.body : cleanString(body, maxBodyLength, { trim: false });
      const nextAnchor = anchor === undefined ? record.anchor : normalizeAnchorRecord(anchor);
      if (!nextBody.trim() || !nextAnchor) return { status: "invalid" };
      record.title = title === undefined ? record.title : cleanString(title, maxTitleLength);
      record.body = nextBody;
      record.tags = tags === undefined ? record.tags : normalizeTags(tags);
      record.anchor = nextAnchor;
      record.version += 1;
      record.updated_at = now().toISOString();
      record.revisions.push({ version: record.version, title: record.title, body: record.body, tags: [...record.tags], anchor: { ...record.anchor }, source, created_at: record.updated_at });
      return { status: "updated", note: noteProjection(database, record) };
    });
  }

  async function deleteLearnerNote({ ownerId, noteId, expectedVersion, erase = false }: { ownerId: string; noteId: string; expectedVersion: number; erase?: boolean }): Promise<LearnerNoteMutationResult> {
    if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1) return { status: "invalid" };
    return mutateDatabase((database) => {
      if (!canOwnNotes(database, ownerId)) return { status: "forbidden" };
      const index = database.learner_notes.findIndex((candidate) => candidate.id === noteId && candidate.owner_id === ownerId);
      if (index < 0) return { status: "not-found" };
      const record = database.learner_notes[index];
      if (record.version !== expectedVersion) return { status: "conflict", currentVersion: record.version };
      if (erase) {
        database.learner_notes.splice(index, 1);
        return { status: "erased" };
      }
      if (record.deleted_at) return { status: "not-found" };
      record.version += 1;
      record.updated_at = now().toISOString();
      record.deleted_at = record.updated_at;
      record.revisions.push({ version: record.version, title: record.title, body: record.body, tags: [...record.tags], anchor: { ...record.anchor }, source: "delete", created_at: record.updated_at });
      return { status: "deleted", note: noteProjection(database, record) };
    });
  }

  return {
    createLearnerNote,
    deleteLearnerNote,
    getLearnerNote,
    listLearnerNoteRevisions,
    listLearnerNotes,
    updateLearnerNote
  };
}
