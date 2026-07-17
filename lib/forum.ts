import type { GradeId, Language, LocalizedText, StudentSession } from "@/types";

export type ForumParticipantRole = "student" | "teacher";
export type ForumThreadMode = "async" | "live";
export type ForumThreadKind = "question" | "strategy" | "teacher-note";
export type ForumFilter = "all" | "questions" | "live" | "resolved" | "pinned";
export type ForumModerationStatus = "visible" | "needs-review" | "hidden" | "deleted";
export type ForumReportReason = "unsafe-content" | "harassment" | "off-topic" | "privacy" | "other";
export type ForumAttachmentKind = "image" | "math-snapshot" | "file-link";
export type ForumNotificationType = "thread" | "reply" | "mention" | "report" | "moderation";
export type ForumAuditAction =
  | "thread-created"
  | "thread-edited"
  | "thread-deleted"
  | "reply-created"
  | "live-pulse-created"
  | "me-too-added"
  | "resolved-updated"
  | "pinned-updated"
  | "locked-updated"
  | "content-reported"
  | "moderation-updated";

export type ForumClassSpace = {
  classId: string;
  name: LocalizedText;
  grade: GradeId;
  teacherName: string;
  memberCount: number;
};

export type ForumAuthor = {
  id: string;
  name: string;
  role: ForumParticipantRole;
  accent: "cyan" | "indigo" | "emerald" | "amber" | "rose";
};

export type ForumAttachment = {
  attachmentId: string;
  kind: ForumAttachmentKind;
  name: string;
  url: string;
  mimeType?: string;
  description?: string;
  createdAt: string;
};

export type ForumModerationState = {
  status: ForumModerationStatus;
  reportCount: number;
  reason?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  updatedAt: string;
};

export type ForumReply = {
  replyId: string;
  body: LocalizedText;
  author: ForumAuthor;
  role: ForumParticipantRole;
  createdAt: string;
  helpfulCount: number;
  isTeacherAnswer: boolean;
  attachments?: ForumAttachment[];
  moderation?: ForumModerationState;
};

export type ForumLivePulse = {
  pulseId: string;
  body: LocalizedText;
  author: ForumAuthor;
  role: ForumParticipantRole;
  createdAt: string;
  attachments?: ForumAttachment[];
  moderation?: ForumModerationState;
};

export type ForumThread = {
  classId: string;
  threadId: string;
  title: LocalizedText;
  body: LocalizedText;
  author: ForumAuthor;
  role: ForumParticipantRole;
  mode: ForumThreadMode;
  kind: ForumThreadKind;
  subject: LocalizedText;
  tags: LocalizedText[];
  replies: ForumReply[];
  pinned: boolean;
  locked: boolean;
  resolved: boolean;
  meTooCount: number;
  meTooUserIds?: string[];
  attachments?: ForumAttachment[];
  createdAt: string;
  updatedAt: string;
  moderation?: ForumModerationState;
  live?: {
    sessionId: string;
    active: boolean;
    prompt: LocalizedText;
    pulses: ForumLivePulse[];
  };
};

export type ForumReport = {
  reportId: string;
  classId: string;
  threadId: string;
  targetType: "thread" | "reply" | "pulse";
  targetId: string;
  reason: ForumReportReason;
  note: string;
  reporterId: string;
  reporterName: string;
  createdAt: string;
};

export type ForumAuditEvent = {
  auditId: string;
  classId: string;
  threadId?: string;
  action: ForumAuditAction;
  actorId: string;
  actorName: string;
  actorRole: ForumParticipantRole | "admin";
  targetType?: "thread" | "reply" | "pulse" | "report";
  targetId?: string;
  createdAt: string;
  details?: Record<string, string | number | boolean | null>;
};

export type ForumNotification = {
  notificationId: string;
  classId: string;
  threadId: string;
  recipientId: string;
  actorId: string;
  actorName: string;
  type: ForumNotificationType;
  title: LocalizedText;
  body: LocalizedText;
  targetType: "thread" | "reply" | "pulse" | "report";
  targetId: string;
  createdAt: string;
  readAt?: string;
};

export type ForumSummary = {
  totalThreads: number;
  activeLiveThreads: number;
  unresolvedQuestions: number;
  teacherReplies: number;
  pendingModeration: number;
  hiddenItems: number;
};

export type ForumPageInfo = {
  page: number;
  pageSize: number;
  totalThreads: number;
  totalPages: number;
  query: string;
};

export type ForumWorkspaceData = {
  classes: ForumClassSpace[];
  activeClassId: string | null;
  threads: ForumThread[];
  pageInfo: ForumPageInfo;
  summary: ForumSummary;
  permissions: {
    canPost: boolean;
    canModerate: boolean;
    canSeeAudit: boolean;
  };
  reports?: ForumReport[];
  auditEvents?: ForumAuditEvent[];
  notifications?: ForumNotification[];
};

export const forumTitleMaxLength = 140;
export const forumBodyMaxLength = 2000;
export const forumSubjectMaxLength = 120;
export const forumTagMaxLength = 36;
export const forumReportNoteMaxLength = 500;
export const forumAttachmentNameMaxLength = 90;
export const forumAttachmentDescriptionMaxLength = 180;
export const forumAttachmentUrlMaxLength = 500;
export const forumMaxAttachmentsPerItem = 3;
export const forumDefaultPageSize = 8;
export const forumMaxPageSize = 20;

const unsafeForumPatterns = [
  /\b(?:kill yourself|kys|self[-\s]?harm|suicide)\b/i,
  /\b(?:terrorist|bomb threat|school shooting)\b/i,
  /\b(?:porn|nude|sexually explicit)\b/i,
  /\b(?:idiot|stupid|shut up|hate you)\b/i,
  /自殺|自杀|色情|裸照|炸彈|炸弹|仇恨|白痴|閉嘴|闭嘴/
];

const accentCycle: ForumAuthor["accent"][] = ["cyan", "indigo", "emerald", "amber", "rose"];

function nowIso() {
  return new Date().toISOString();
}

function localizedFromText(value: string): LocalizedText {
  return {
    en: value,
    zh: value,
    zhHans: value
  };
}

export function forumModerationVisible(moderation?: ForumModerationState) {
  return !moderation || moderation.status === "visible" || moderation.status === "needs-review";
}

export function defaultForumModerationState(status: ForumModerationStatus = "visible", now = nowIso()): ForumModerationState {
  return {
    status,
    reportCount: 0,
    updatedAt: now
  };
}

export function cleanForumText(value: unknown, maxLength: number) {
  return typeof value === "string"
    ? value.replace(/\s+/g, " ").trim().slice(0, maxLength)
    : "";
}

export function cleanForumMultilineText(value: unknown, maxLength: number) {
  return typeof value === "string"
    ? value.replace(/\r\n?/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/\n{4,}/g, "\n\n\n").trim().slice(0, maxLength)
    : "";
}

export function forumTextNeedsReview(...values: string[]) {
  const combined = values.join("\n");
  return unsafeForumPatterns.some((pattern) => pattern.test(combined));
}

export function moderationStatusForForumText(...values: string[]): ForumModerationStatus {
  return forumTextNeedsReview(...values) ? "needs-review" : "visible";
}

function cleanForumAttachmentUrl(value: unknown) {
  const url = cleanForumText(value, forumAttachmentUrlMaxLength);
  if (!url) return "";
  if (url.startsWith("/") && !url.startsWith("//")) return url;

  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : "";
  } catch {
    return "";
  }
}

function inferForumAttachmentKind(url: string, kind: unknown): ForumAttachmentKind {
  if (kind === "image" || kind === "math-snapshot" || kind === "file-link") return kind;
  return /\.(?:png|jpe?g|webp|gif|svg)(?:[?#].*)?$/i.test(url) ? "image" : "file-link";
}

export function cleanForumAttachments(value: unknown, now = nowIso()) {
  const rawItems = Array.isArray(value) ? value : isRecord(value) ? [value] : [];
  const attachments: ForumAttachment[] = [];

  for (const rawItem of rawItems) {
    if (!isRecord(rawItem)) continue;
    const url = cleanForumAttachmentUrl(rawItem.url);
    if (!url) continue;
    const name = cleanForumText(rawItem.name, forumAttachmentNameMaxLength) || "Shared reference";
    const description = cleanForumText(rawItem.description, forumAttachmentDescriptionMaxLength);
    attachments.push({
      attachmentId: typeof rawItem.attachmentId === "string" && rawItem.attachmentId.trim()
        ? rawItem.attachmentId.trim()
        : uid("attachment"),
      kind: inferForumAttachmentKind(url, rawItem.kind),
      name,
      url,
      mimeType: typeof rawItem.mimeType === "string" && rawItem.mimeType.trim() ? cleanForumText(rawItem.mimeType, 80) : undefined,
      description: description || undefined,
      createdAt: typeof rawItem.createdAt === "string" && rawItem.createdAt.trim() ? rawItem.createdAt.trim() : now
    });
    if (attachments.length >= forumMaxAttachmentsPerItem) break;
  }

  return attachments;
}

export function forumMentionNames(...values: string[]) {
  const names = new Set<string>();
  const pattern = /@([A-Za-z0-9][A-Za-z0-9 ._-]{1,48})/g;

  for (const value of values) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(value))) {
      const name = match[1]?.replace(/[.,!?;:，。！？；：]+$/g, "").replace(/\s+/g, " ").trim();
      if (name) names.add(name);
    }
  }

  return Array.from(names);
}

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isLocalizedText(value: unknown): value is LocalizedText {
  if (!isRecord(value)) return false;
  return typeof value.en === "string" && typeof value.zh === "string";
}

function isModerationState(value: unknown): value is ForumModerationState {
  if (!isRecord(value)) return false;
  return (
    (value.status === "visible" || value.status === "needs-review" || value.status === "hidden" || value.status === "deleted") &&
    typeof value.reportCount === "number" &&
    typeof value.updatedAt === "string"
  );
}

function isAuthor(value: unknown): value is ForumAuthor {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    (value.role === "student" || value.role === "teacher") &&
    (value.accent === "cyan" || value.accent === "indigo" || value.accent === "emerald" || value.accent === "amber" || value.accent === "rose")
  );
}

function isAttachment(value: unknown): value is ForumAttachment {
  if (!isRecord(value)) return false;
  const kindIsValid = value.kind === "image" || value.kind === "math-snapshot" || value.kind === "file-link";
  return (
    typeof value.attachmentId === "string" &&
    kindIsValid &&
    typeof value.name === "string" &&
    typeof value.url === "string" &&
    typeof value.createdAt === "string"
  );
}

function isReply(value: unknown): value is ForumReply {
  if (!isRecord(value)) return false;
  const moderationIsValid = value.moderation === undefined || isModerationState(value.moderation);
  const attachmentsAreValid = value.attachments === undefined || (Array.isArray(value.attachments) && value.attachments.every(isAttachment));
  return (
    typeof value.replyId === "string" &&
    isLocalizedText(value.body) &&
    isAuthor(value.author) &&
    (value.role === "student" || value.role === "teacher") &&
    typeof value.createdAt === "string" &&
    typeof value.helpfulCount === "number" &&
    typeof value.isTeacherAnswer === "boolean" &&
    attachmentsAreValid &&
    moderationIsValid
  );
}

function isPulse(value: unknown): value is ForumLivePulse {
  if (!isRecord(value)) return false;
  const moderationIsValid = value.moderation === undefined || isModerationState(value.moderation);
  const attachmentsAreValid = value.attachments === undefined || (Array.isArray(value.attachments) && value.attachments.every(isAttachment));
  return (
    typeof value.pulseId === "string" &&
    isLocalizedText(value.body) &&
    isAuthor(value.author) &&
    (value.role === "student" || value.role === "teacher") &&
    typeof value.createdAt === "string" &&
    attachmentsAreValid &&
    moderationIsValid
  );
}

export function isForumThread(value: unknown): value is ForumThread {
  if (!isRecord(value)) return false;
  const moderationIsValid = value.moderation === undefined || isModerationState(value.moderation);
  const meTooUserIdsAreValid = value.meTooUserIds === undefined || (Array.isArray(value.meTooUserIds) && value.meTooUserIds.every((item) => typeof item === "string"));
  const attachmentsAreValid = value.attachments === undefined || (Array.isArray(value.attachments) && value.attachments.every(isAttachment));
  const live = value.live;
  const liveIsValid = live === undefined || (
    isRecord(live) &&
    typeof live.sessionId === "string" &&
    typeof live.active === "boolean" &&
    isLocalizedText(live.prompt) &&
    Array.isArray(live.pulses) &&
    live.pulses.every(isPulse)
  );

  return (
    typeof value.classId === "string" &&
    typeof value.threadId === "string" &&
    isLocalizedText(value.title) &&
    isLocalizedText(value.body) &&
    isAuthor(value.author) &&
    (value.role === "student" || value.role === "teacher") &&
    (value.mode === "async" || value.mode === "live") &&
    (value.kind === "question" || value.kind === "strategy" || value.kind === "teacher-note") &&
    isLocalizedText(value.subject) &&
    Array.isArray(value.tags) &&
    value.tags.every(isLocalizedText) &&
    Array.isArray(value.replies) &&
    value.replies.every(isReply) &&
    typeof value.pinned === "boolean" &&
    typeof value.locked === "boolean" &&
    typeof value.resolved === "boolean" &&
    typeof value.meTooCount === "number" &&
    meTooUserIdsAreValid &&
    attachmentsAreValid &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string" &&
    moderationIsValid &&
    liveIsValid
  );
}

export function isForumReport(value: unknown): value is ForumReport {
  if (!isRecord(value)) return false;
  return (
    typeof value.reportId === "string" &&
    typeof value.classId === "string" &&
    typeof value.threadId === "string" &&
    (value.targetType === "thread" || value.targetType === "reply" || value.targetType === "pulse") &&
    typeof value.targetId === "string" &&
    (value.reason === "unsafe-content" || value.reason === "harassment" || value.reason === "off-topic" || value.reason === "privacy" || value.reason === "other") &&
    typeof value.note === "string" &&
    typeof value.reporterId === "string" &&
    typeof value.reporterName === "string" &&
    typeof value.createdAt === "string"
  );
}

export function isForumAuditEvent(value: unknown): value is ForumAuditEvent {
  if (!isRecord(value)) return false;
  return (
    typeof value.auditId === "string" &&
    typeof value.classId === "string" &&
    typeof value.action === "string" &&
    typeof value.actorId === "string" &&
    typeof value.actorName === "string" &&
    typeof value.createdAt === "string"
  );
}

export function isForumNotification(value: unknown): value is ForumNotification {
  if (!isRecord(value)) return false;
  return (
    typeof value.notificationId === "string" &&
    typeof value.classId === "string" &&
    typeof value.threadId === "string" &&
    typeof value.recipientId === "string" &&
    typeof value.actorId === "string" &&
    typeof value.actorName === "string" &&
    (value.type === "thread" || value.type === "reply" || value.type === "mention" || value.type === "report" || value.type === "moderation") &&
    isLocalizedText(value.title) &&
    isLocalizedText(value.body) &&
    (value.targetType === "thread" || value.targetType === "reply" || value.targetType === "pulse" || value.targetType === "report") &&
    typeof value.targetId === "string" &&
    typeof value.createdAt === "string"
  );
}

export function cloneForumThreads(threads: ForumThread[]) {
  return threads.map((thread) => ({
    ...thread,
    title: { ...thread.title },
    body: { ...thread.body },
    author: { ...thread.author },
    subject: { ...thread.subject },
    tags: thread.tags.map((tag) => ({ ...tag })),
    meTooUserIds: thread.meTooUserIds ? [...thread.meTooUserIds] : undefined,
    attachments: thread.attachments?.map((attachment) => ({ ...attachment })),
    moderation: thread.moderation ? { ...thread.moderation } : undefined,
    replies: thread.replies.map((reply) => ({
      ...reply,
      body: { ...reply.body },
      author: { ...reply.author },
      attachments: reply.attachments?.map((attachment) => ({ ...attachment })),
      moderation: reply.moderation ? { ...reply.moderation } : undefined
    })),
    live: thread.live
      ? {
          ...thread.live,
          prompt: { ...thread.live.prompt },
          pulses: thread.live.pulses.map((pulse) => ({
            ...pulse,
            body: { ...pulse.body },
            author: { ...pulse.author },
            attachments: pulse.attachments?.map((attachment) => ({ ...attachment })),
            moderation: pulse.moderation ? { ...pulse.moderation } : undefined
          }))
        }
      : undefined
  }));
}

export function sortForumThreads(threads: ForumThread[]) {
  return threads.filter((thread) => forumModerationVisible(thread.moderation)).sort((first, second) => {
    if (first.pinned !== second.pinned) return first.pinned ? -1 : 1;
    if (first.mode !== second.mode) return first.mode === "live" ? -1 : 1;
    return new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime();
  });
}

export function filterForumThreads(threads: ForumThread[], filter: ForumFilter, classId: string) {
  const classThreads = threads.filter((thread) => thread.classId === classId);

  if (filter === "questions") return sortForumThreads(classThreads.filter((thread) => thread.kind === "question"));
  if (filter === "live") return sortForumThreads(classThreads.filter((thread) => thread.mode === "live"));
  if (filter === "resolved") return sortForumThreads(classThreads.filter((thread) => thread.resolved));
  if (filter === "pinned") return sortForumThreads(classThreads.filter((thread) => thread.pinned));
  return sortForumThreads(classThreads);
}

function localizedSearchText(value: LocalizedText) {
  return `${value.en} ${value.zh} ${value.zhHans ?? ""}`;
}

export function searchForumThreads(threads: ForumThread[], query: unknown) {
  const cleanQuery = cleanForumText(query, 80).toLowerCase();
  if (!cleanQuery) return { query: "", threads };
  const terms = cleanQuery.split(/\s+/).filter(Boolean);

  return {
    query: cleanQuery,
    threads: threads.filter((thread) => {
      const searchable = [
        localizedSearchText(thread.title),
        localizedSearchText(thread.body),
        localizedSearchText(thread.subject),
        thread.author.name,
        thread.tags.map(localizedSearchText).join(" "),
        thread.replies.map((reply) => `${reply.author.name} ${localizedSearchText(reply.body)}`).join(" "),
        thread.live?.pulses.map((pulse) => `${pulse.author.name} ${localizedSearchText(pulse.body)}`).join(" ") ?? "",
        thread.attachments?.map((attachment) => `${attachment.name} ${attachment.description ?? ""} ${attachment.url}`).join(" ") ?? "",
        thread.replies.flatMap((reply) => reply.attachments ?? []).map((attachment) => `${attachment.name} ${attachment.description ?? ""} ${attachment.url}`).join(" ")
      ].join(" ").toLowerCase();
      return terms.every((term) => searchable.includes(term));
    })
  };
}

export function pageForumThreads(threads: ForumThread[], page: unknown, pageSize: unknown, query: string): { threads: ForumThread[]; pageInfo: ForumPageInfo } {
  const normalizedPageSize = Math.max(1, Math.min(forumMaxPageSize, Math.round(Number(pageSize) || forumDefaultPageSize)));
  const totalPages = Math.max(1, Math.ceil(threads.length / normalizedPageSize));
  const normalizedPage = Math.max(1, Math.min(totalPages, Math.round(Number(page) || 1)));
  const startIndex = (normalizedPage - 1) * normalizedPageSize;

  return {
    threads: threads.slice(startIndex, startIndex + normalizedPageSize),
    pageInfo: {
      page: normalizedPage,
      pageSize: normalizedPageSize,
      totalThreads: threads.length,
      totalPages,
      query
    }
  };
}

export function summarizeForum(threads: ForumThread[], classId: string): ForumSummary {
  const classThreads = threads.filter((thread) => thread.classId === classId);
  const visibleThreads = classThreads.filter((thread) => forumModerationVisible(thread.moderation));
  const threadItems = classThreads.flatMap((thread) => [
    thread.moderation,
    ...thread.replies.map((reply) => reply.moderation),
    ...(thread.live?.pulses.map((pulse) => pulse.moderation) ?? [])
  ]).filter((item): item is ForumModerationState => Boolean(item));
  return {
    totalThreads: visibleThreads.length,
    activeLiveThreads: visibleThreads.filter((thread) => thread.mode === "live" && thread.live?.active && !thread.locked).length,
    unresolvedQuestions: visibleThreads.filter((thread) => thread.kind === "question" && !thread.resolved).length,
    teacherReplies: visibleThreads.reduce((count, thread) => count + thread.replies.filter((reply) => forumModerationVisible(reply.moderation) && reply.role === "teacher").length, 0),
    pendingModeration: threadItems.filter((item) => item.status === "needs-review").length,
    hiddenItems: threadItems.filter((item) => item.status === "hidden" || item.status === "deleted").length
  };
}

export function forumAuthorFromSession(currentUser: StudentSession | null | undefined, roleOverride?: ForumParticipantRole): ForumAuthor {
  const role: ForumParticipantRole = roleOverride ?? (currentUser?.role === "teacher" || currentUser?.role === "admin" ? "teacher" : "student");
  const name = currentUser?.name || (role === "teacher" ? "Demo Teacher" : "Demo Student");
  const seed = Array.from(name).reduce((sum, char) => sum + char.charCodeAt(0), 0);

  return {
    id: currentUser?.id ?? `demo-${role}`,
    name,
    role,
    accent: accentCycle[seed % accentCycle.length]
  };
}

export function createForumThread(input: {
  classId: string;
  title: string;
  body: string;
  subject: string;
  tags: string[];
  attachments?: unknown;
  mode: ForumThreadMode;
  kind: ForumThreadKind;
  author: ForumAuthor;
}) {
  const timestamp = nowIso();
  const title = cleanForumText(input.title, forumTitleMaxLength);
  const body = cleanForumMultilineText(input.body, forumBodyMaxLength);
  const subject = cleanForumText(input.subject, forumSubjectMaxLength);
  const tags = input.tags.map((tag) => cleanForumText(tag, forumTagMaxLength)).filter(Boolean).slice(0, 4);
  const attachments = cleanForumAttachments(input.attachments, timestamp);
  const moderationStatus = moderationStatusForForumText(title, body, subject, tags.join(" "));

  return {
    classId: input.classId,
    threadId: uid("thread"),
    title: localizedFromText(title),
    body: localizedFromText(body),
    author: input.author,
    role: input.author.role,
    mode: input.mode,
    kind: input.kind,
    subject: localizedFromText(subject || "Mathematics"),
    tags: tags.length ? tags.map(localizedFromText) : [localizedFromText(input.mode === "live" ? "Live discussion" : "Question")],
    replies: [],
    pinned: input.author.role === "teacher" && input.kind === "teacher-note",
    locked: false,
    resolved: false,
    meTooCount: 0,
    meTooUserIds: [],
    attachments,
    createdAt: timestamp,
    updatedAt: timestamp,
    moderation: defaultForumModerationState(moderationStatus, timestamp),
    live: input.mode === "live"
      ? {
          sessionId: uid("live"),
          active: true,
          prompt: localizedFromText(title),
          pulses: []
        }
      : undefined
  } satisfies ForumThread;
}

export function addForumReply(thread: ForumThread, input: { body: string; author: ForumAuthor; attachments?: unknown }) {
  const timestamp = nowIso();
  const body = cleanForumMultilineText(input.body, forumBodyMaxLength);
  const attachments = cleanForumAttachments(input.attachments, timestamp);
  const reply: ForumReply = {
    replyId: uid("reply"),
    body: localizedFromText(body),
    author: input.author,
    role: input.author.role,
    createdAt: timestamp,
    helpfulCount: 0,
    isTeacherAnswer: input.author.role === "teacher",
    attachments,
    moderation: defaultForumModerationState(moderationStatusForForumText(body), timestamp)
  };

  return {
    ...thread,
    replies: [...thread.replies, reply],
    updatedAt: timestamp
  };
}

export function addForumLivePulse(thread: ForumThread, input: { body: string; author: ForumAuthor; attachments?: unknown }) {
  if (!thread.live) return thread;

  const timestamp = nowIso();
  const body = cleanForumMultilineText(input.body, 600);
  const attachments = cleanForumAttachments(input.attachments, timestamp);
  const pulse: ForumLivePulse = {
    pulseId: uid("pulse"),
    body: localizedFromText(body),
    author: input.author,
    role: input.author.role,
    createdAt: timestamp,
    attachments,
    moderation: defaultForumModerationState(moderationStatusForForumText(body), timestamp)
  };

  return {
    ...thread,
    updatedAt: timestamp,
    live: {
      ...thread.live,
      pulses: [...thread.live.pulses, pulse].slice(-12)
    }
  };
}

export function updateForumThread(threads: ForumThread[], threadId: string, updater: (thread: ForumThread) => ForumThread) {
  return threads.map((thread) => (thread.threadId === threadId ? updater(thread) : thread));
}

export function localizedForumDate(value: string, language: Language) {
  return new Intl.DateTimeFormat(language === "en" ? "en-HK" : language === "zh-Hans" ? "zh-CN" : "zh-HK", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}
