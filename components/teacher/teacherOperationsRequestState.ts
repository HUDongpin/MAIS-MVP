import type { TeacherNotice, TeacherNoticeDeliveryAttempt, TeacherReminderRun } from "@/types";

type RandomUuidSource = Pick<Crypto, "randomUUID">;
type TeacherOperationRequest = (input: string, init?: RequestInit) => Promise<Response>;
type TeacherOperationTimeoutSignal = () => AbortSignal;
type TeacherOperationStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
type TeacherOperationDigest = (value: string) => Promise<string>;

const teacherOperationTimeoutSignal: TeacherOperationTimeoutSignal = () => AbortSignal.timeout(15_000);

export type TeacherOperationFailureKind =
  | "bad-request"
  | "not-found"
  | "too-large"
  | "rate-limited"
  | "service-unavailable"
  | "conflict"
  | "idempotency-conflict"
  | "no-eligible-recipients"
  | "invalid-response"
  | "network"
  | "unexpected";

export type TeacherOperationFailure = {
  ok: false;
  kind: TeacherOperationFailureKind;
  httpStatus: number | null;
  acceptance: "accepted" | "not-accepted" | "unknown";
  retainForRetry: boolean;
  retryAfterMs: number | null;
};

export function teacherReminderPartialFailureDisposition(
  failure: TeacherOperationFailure,
  acceptedRunCount: number
) {
  if (acceptedRunCount <= 0) return "none" as const;
  return failure.retainForRetry ? "retryable-partial" as const : "terminal-partial" as const;
}

export function teacherOperationFailureMessage(
  failure: TeacherOperationFailure,
  subject: "notice" | "reminder",
  acceptedReminderRunCount: number,
  t: (value: { en: string; zh: string }) => string
) {
  if (subject === "reminder") {
    const partialFailure = teacherReminderPartialFailureDisposition(failure, acceptedReminderRunCount);
    if (partialFailure === "retryable-partial") {
      return t({
        en: "Some reminder requests were queued, but the next page could not be loaded. Retrying will continue from the same cursor and reuse the same request key.",
        zh: "部分提醒已加入隊列，但未能載入下一頁。重試時會從同一位置繼續，並沿用相同請求識別碼。"
      });
    }
    if (partialFailure === "terminal-partial") {
      return t({
        en: "Some reminder requests were queued, but the next page was rejected. Refresh and review the results before starting a new request; this action cannot continue with the previous request key.",
        zh: "部分提醒已加入隊列，但下一頁請求被拒絕。請先重新整理並查看結果，再開始新的請求；此操作不能沿用上一個請求識別碼。"
      });
    }
  }

  const subjectLabel = subject === "notice"
    ? t({ en: "Notice", zh: "通知" })
    : t({ en: "Reminder request", zh: "提醒請求" });
  switch (failure.kind) {
    case "bad-request":
      return t({ en: `${subjectLabel} was not queued because the request needs correction.`, zh: `${subjectLabel}未加入隊列，請修正請求內容。` });
    case "not-found":
      return t({ en: `${subjectLabel} was not queued because it is no longer available.`, zh: `${subjectLabel}未加入隊列，項目可能已不存在。` });
    case "too-large":
      return t({ en: `${subjectLabel} was not queued because the request is too large.`, zh: `${subjectLabel}未加入隊列，請求內容過大。` });
    case "rate-limited": {
      const retrySeconds = failure.retryAfterMs === null ? null : Math.max(1, Math.ceil(failure.retryAfterMs / 1_000));
      return t({
        en: `${subjectLabel} was not queued because requests are temporarily limited.${retrySeconds ? ` Try again in ${retrySeconds} seconds; retrying will reuse the same request key.` : " Retrying will reuse the same request key."}`,
        zh: `${subjectLabel}未加入隊列，系統暫時限制請求。${retrySeconds ? `請在 ${retrySeconds} 秒後重試，並沿用相同請求識別碼。` : "重試時會沿用相同請求識別碼。"}`
      });
    }
    case "service-unavailable":
      return t({
        en: `${subjectLabel} was not queued because the service is temporarily unavailable; retrying will reuse the same request key.`,
        zh: `${subjectLabel}未加入隊列，服務暫時不可用；重試時會沿用相同請求識別碼。`
      });
    case "network":
      return t({
        en: "Queueing was not confirmed. You may be offline or the request timed out; retrying will reuse the same request key.",
        zh: "未能確認請求是否已加入隊列。裝置可能離線或請求逾時；重試時會沿用相同請求識別碼。"
      });
    case "invalid-response":
      if (failure.acceptance === "accepted") {
        return subject === "notice"
          ? t({
              en: "Notice was accepted, but updated details could not be read. Retry will reuse the same request key, including after a page reload.",
              zh: "通知已獲接受，但未能讀取更新資料。即使重新載入頁面，重試仍會沿用相同請求識別碼。"
            })
          : t({
              en: "Reminder request was accepted, but updated details could not be read. Retrying will reuse the same request key.",
              zh: "提醒請求已獲接受，但未能讀取更新資料。重試時會沿用相同請求識別碼。"
            });
      }
      return t({ en: `${subjectLabel} was not queued because the response was invalid.`, zh: `${subjectLabel}未加入隊列，伺服器回應無效。` });
    case "conflict":
      return t({ en: `${subjectLabel} was not queued because the server reported a conflict.`, zh: `${subjectLabel}未加入隊列，伺服器回報操作衝突。` });
    case "idempotency-conflict":
      return t({ en: `${subjectLabel} was not queued because this request key conflicts with an earlier action.`, zh: `${subjectLabel}未加入隊列，這個請求識別碼與較早操作衝突。` });
    case "no-eligible-recipients":
      return t({ en: `${subjectLabel} was not queued because no eligible family email recipients are available.`, zh: `${subjectLabel}未加入隊列，暫時沒有符合條件的家庭電郵收件人。` });
    case "unexpected":
      return t({ en: `${subjectLabel} was not queued because the request failed.`, zh: `${subjectLabel}未加入隊列，請求失敗。` });
  }
}

type TeacherNoticeEmailAggregate = {
  status: "queued";
  queued: number;
  reused: number;
  recovered: number;
  skipped: number;
};

export type TeacherNoticeQueuedPayload = {
  notice: TeacherNotice;
  attempt: TeacherNoticeDeliveryAttempt;
  email: TeacherNoticeEmailAggregate;
};

export type TeacherNoticeQueueIntent = {
  noticeId: string;
  teacherId: string;
  classId: string;
  channelId: string;
};

export function createTeacherNoticeQueueIntent(
  notice: Pick<TeacherNotice, "id" | "teacherId" | "classId" | "channelId">
): TeacherNoticeQueueIntent {
  return {
    noticeId: notice.id,
    teacherId: notice.teacherId,
    classId: notice.classId,
    channelId: notice.channelId
  };
}

export function reconcileTeacherNoticeOverride(
  serverNotice: TeacherNotice,
  localOverride: TeacherNotice | undefined
) {
  if (!localOverride || localOverride.id !== serverNotice.id) return serverNotice;
  const serverUpdatedAt = Date.parse(serverNotice.updatedAt);
  const localUpdatedAt = Date.parse(localOverride.updatedAt);
  if (!Number.isFinite(localUpdatedAt)) return serverNotice;
  if (!Number.isFinite(serverUpdatedAt)) return localOverride;
  return serverUpdatedAt >= localUpdatedAt ? serverNotice : localOverride;
}

export function reconcileTeacherNoticeCollection(
  serverNotices: TeacherNotice[],
  localOverrides: Readonly<Record<string, TeacherNotice>>
) {
  return serverNotices.map((notice) => reconcileTeacherNoticeOverride(notice, localOverrides[notice.id]));
}

export type TeacherReminderIntent = {
  teacherId: string;
  classId: string | null;
  assignmentId: string | null;
  manual: boolean;
};

export type TeacherReminderRequestState = {
  baseIdempotencyKey: string;
  cursor: string | null;
  pageIndex: number;
  runs: TeacherReminderRun[];
  acceptedRunCount: number;
  seenCursors: string[];
};

const RECOVERY_SCHEMA_VERSION = 2;
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/-]{15,127}$/u;
const SHA256_HEX_PATTERN = /^[a-f0-9]{64}$/u;
const RFC3339_TIMESTAMP_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,9})?(Z|[+-]\d{2}:\d{2})$/u;

type TeacherOperationRecoveryRecord = {
  version: typeof RECOVERY_SCHEMA_VERSION;
  idempotencyKey: string;
};

async function sha256Hex(value: string) {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: readonly string[]) {
  const allowedKeys = new Set(allowed);
  return Object.keys(value).every((key) => allowedKeys.has(key));
}

function isSafeNonnegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isRfc3339Timestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = RFC3339_TIMESTAMP_PATTERN.exec(value);
  if (!match || !Number.isFinite(Date.parse(value))) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  if (month < 1 || month > 12 || hour > 23 || minute > 59 || second > 59) return false;
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1] ?? 0;
  if (day < 1 || day > daysInMonth) return false;
  const zone = match[7];
  if (zone !== "Z") {
    const [zoneHour, zoneMinute] = zone.slice(1).split(":").map(Number);
    if (zoneHour > 23 || zoneMinute > 59) return false;
  }
  return true;
}

function isNullableRfc3339Timestamp(value: unknown): value is string | null {
  return value === null || isRfc3339Timestamp(value);
}

function isStableIntentIdentifier(value: unknown): value is string {
  return typeof value === "string" &&
    value.length > 0 &&
    value.length <= 256 &&
    value === value.trim() &&
    !/[\u0000-\u001f\u007f]/u.test(value);
}

function isRecoveryRecord(value: unknown): value is TeacherOperationRecoveryRecord {
  return isRecord(value) &&
    hasOnlyKeys(value, ["version", "idempotencyKey"]) &&
    value.version === RECOVERY_SCHEMA_VERSION &&
    typeof value.idempotencyKey === "string" &&
    IDEMPOTENCY_KEY_PATTERN.test(value.idempotencyKey);
}

export class TeacherOperationRecoveryStore {
  private readonly storageKeys = new Map<string, Promise<string>>();

  constructor(
    private readonly scope: { teacherId: string; classId: string },
    private readonly storage?: TeacherOperationStorage,
    private readonly digest: TeacherOperationDigest = sha256Hex
  ) {}

  private storageKey(intent: string) {
    const cached = this.storageKeys.get(intent);
    if (cached) return cached;
    const pending = this.digest(JSON.stringify({
      version: RECOVERY_SCHEMA_VERSION,
      teacherId: this.scope.teacherId,
      classId: this.scope.classId,
      intent
    })).then((digest) => {
      if (!SHA256_HEX_PATTERN.test(digest)) throw new Error("Invalid teacher-operation recovery digest.");
      return `mais.teacher-operations.v${RECOVERY_SCHEMA_VERSION}/${digest}`;
    });
    this.storageKeys.set(intent, pending);
    return pending;
  }

  private async read(intent: string): Promise<TeacherOperationRecoveryRecord | null> {
    if (!this.storage) return null;
    let key: string | null = null;
    try {
      key = await this.storageKey(intent);
      const serialized = this.storage.getItem(key);
      if (!serialized) return null;
      const value: unknown = JSON.parse(serialized);
      if (isRecoveryRecord(value)) return value;
      this.storage.removeItem(key);
    } catch {
      if (key) {
        try { this.storage.removeItem(key); } catch { /* storage is best-effort */ }
      }
    }
    return null;
  }

  private async write(intent: string, record: TeacherOperationRecoveryRecord) {
    if (!this.storage) return;
    try { this.storage.setItem(await this.storageKey(intent), JSON.stringify(record)); } catch { /* storage is best-effort */ }
  }

  async loadIdempotencyKey(intent: string) {
    return (await this.read(intent))?.idempotencyKey ?? null;
  }

  async saveIdempotencyKey(intent: string, idempotencyKey: string) {
    if (!IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey)) return;
    await this.write(intent, {
      version: RECOVERY_SCHEMA_VERSION,
      idempotencyKey
    });
  }

  async saveReminderState(intent: string, state: TeacherReminderRequestState) {
    await this.saveIdempotencyKey(intent, state.baseIdempotencyKey);
  }

  async loadReminderState(intent: string): Promise<TeacherReminderRequestState | null> {
    const idempotencyKey = await this.loadIdempotencyKey(intent);
    return idempotencyKey ? createTeacherReminderRequestState(idempotencyKey) : null;
  }

  async clear(intent: string, idempotencyKey: string) {
    if (!this.storage || (await this.read(intent))?.idempotencyKey !== idempotencyKey) return;
    try { this.storage.removeItem(await this.storageKey(intent)); } catch { /* storage is best-effort */ }
  }
}

export function createTeacherOperationIdempotencyKey(
  cryptoSource: RandomUuidSource = globalThis.crypto
) {
  return `teacher-operation/${cryptoSource.randomUUID()}`;
}

export class TeacherOperationIntentRegistry {
  private readonly pendingKeys = new Map<string, string>();
  private readonly inFlightKeys = new Map<string, string>();
  private readonly claimedIntents = new Set<string>();

  constructor(
    private readonly createKey: () => string = () => createTeacherOperationIdempotencyKey(),
    private readonly recovery?: TeacherOperationRecoveryStore
  ) {}

  async begin(intent: string) {
    if (this.claimedIntents.has(intent)) return { status: "busy" as const };
    this.claimedIntents.add(intent);
    try {
      const recoveredKey = this.recovery ? await this.recovery.loadIdempotencyKey(intent) : null;
      const idempotencyKey = this.pendingKeys.get(intent) ?? recoveredKey ?? this.createKey();
      this.pendingKeys.set(intent, idempotencyKey);
      this.inFlightKeys.set(intent, idempotencyKey);
      if (this.recovery) await this.recovery.saveIdempotencyKey(intent, idempotencyKey);
      return { status: "started" as const, idempotencyKey };
    } catch {
      this.claimedIntents.delete(intent);
      throw new Error("Teacher operation recovery is unavailable.");
    }
  }

  async finish(intent: string, idempotencyKey: string, retainForRetry: boolean) {
    if (this.inFlightKeys.get(intent) !== idempotencyKey) return;
    this.inFlightKeys.delete(intent);
    this.claimedIntents.delete(intent);
    if (!retainForRetry && this.pendingKeys.get(intent) === idempotencyKey) {
      this.pendingKeys.delete(intent);
      if (this.recovery) await this.recovery.clear(intent, idempotencyKey);
    }
  }
}

export function reminderPageIdempotencyKey(baseKey: string, pageIndex: number) {
  return `${baseKey}/page/${pageIndex}`;
}

function isLocalizedText(value: unknown) {
  return isRecord(value) && hasOnlyKeys(value, ["en", "zh"]) && typeof value.en === "string" && typeof value.zh === "string";
}

function isTeacherNoticeRecipient(value: unknown): value is TeacherNotice["recipients"][number] {
  if (!(isRecord(value) && hasOnlyKeys(value, [
    "id", "noticeId", "studentId", "studentName", "guardianId", "guardianName",
    "status", "acknowledgedBy", "acknowledgedAt", "createdAt"
  ]) &&
    typeof value.id === "string" &&
    typeof value.noticeId === "string" &&
    typeof value.studentId === "string" &&
    typeof value.studentName === "string" &&
    (value.guardianId === undefined || typeof value.guardianId === "string") &&
    (value.guardianName === undefined || typeof value.guardianName === "string") &&
    (value.status === "pending" || value.status === "acknowledged") &&
    (value.acknowledgedBy === undefined || typeof value.acknowledgedBy === "string") &&
    isNullableRfc3339Timestamp(value.acknowledgedAt) &&
    isRfc3339Timestamp(value.createdAt))) return false;
  if (value.status === "pending") {
    return value.acknowledgedBy === undefined && value.acknowledgedAt === null;
  }
  return typeof value.guardianId === "string" && value.guardianId.length > 0 &&
    value.acknowledgedBy === value.guardianId &&
    typeof value.acknowledgedAt === "string" && value.acknowledgedAt.length > 0;
}

function isTeacherNoticeDeliveryAttempt(value: unknown): value is TeacherNoticeDeliveryAttempt {
  return isRecord(value) && hasOnlyKeys(value, [
    "id", "noticeId", "channelId", "channelName", "status", "providerMessageId",
    "errorCode", "errorMessage", "attemptedAt"
  ]) &&
    typeof value.id === "string" &&
    typeof value.noticeId === "string" &&
    typeof value.channelId === "string" &&
    typeof value.channelName === "string" &&
    (value.status === "queued" || value.status === "sent" || value.status === "failed" || value.status === "disabled") &&
    (value.providerMessageId === undefined || typeof value.providerMessageId === "string") &&
    (value.errorCode === undefined || typeof value.errorCode === "string") &&
    (value.errorMessage === undefined || typeof value.errorMessage === "string") &&
    isRfc3339Timestamp(value.attemptedAt);
}

function isTeacherNoticeSource(value: unknown) {
  return isRecord(value) && hasOnlyKeys(value, ["kind", "id"]) &&
    (value.kind === "manual" || value.kind === "teacher-review-lesson" || value.kind === "assignment-reminder" || value.kind === "system") &&
    (value.id === undefined || typeof value.id === "string");
}

function isTeacherNotice(value: unknown): value is TeacherNotice {
  if (!isRecord(value)) return false;
  if (!hasOnlyKeys(value, [
    "id", "teacherId", "classId", "className", "audience", "channelId", "channelName",
    "subject", "body", "status", "assignmentId", "source", "dueAt", "createdAt", "updatedAt",
    "sentAt", "recipients", "deliveryAttempts", "acknowledgement"
  ])) return false;
  if (!(typeof value.id === "string" &&
    typeof value.teacherId === "string" &&
    typeof value.classId === "string" &&
    typeof value.className === "string" &&
    (value.audience === "parents" || value.audience === "students" || value.audience === "both") &&
    typeof value.channelId === "string" &&
    typeof value.channelName === "string" &&
    isLocalizedText(value.subject) &&
    isLocalizedText(value.body) &&
    (value.status === "draft" || value.status === "queued" || value.status === "sent" || value.status === "failed") &&
    (value.assignmentId === undefined || typeof value.assignmentId === "string") &&
    (value.source === undefined || isTeacherNoticeSource(value.source)) &&
    isNullableRfc3339Timestamp(value.dueAt) &&
    isRfc3339Timestamp(value.createdAt) &&
    isRfc3339Timestamp(value.updatedAt) &&
    isNullableRfc3339Timestamp(value.sentAt) &&
    Array.isArray(value.recipients) && value.recipients.every(isTeacherNoticeRecipient) &&
    Array.isArray(value.deliveryAttempts) && value.deliveryAttempts.every(isTeacherNoticeDeliveryAttempt) &&
    isRecord(value.acknowledgement) &&
    hasOnlyKeys(value.acknowledgement, ["total", "acknowledged", "pending"]) &&
    isSafeNonnegativeInteger(value.acknowledgement.total) &&
    isSafeNonnegativeInteger(value.acknowledgement.acknowledged) &&
    isSafeNonnegativeInteger(value.acknowledgement.pending))) return false;
  if (value.acknowledgement.acknowledged + value.acknowledgement.pending !== value.acknowledgement.total) return false;
  if (value.acknowledgement.total !== value.recipients.length) return false;
  const acknowledgedRecipients = value.recipients.filter((recipient) => recipient.status === "acknowledged").length;
  if (value.acknowledgement.acknowledged !== acknowledgedRecipients) return false;
  if (value.acknowledgement.pending !== value.recipients.length - acknowledgedRecipients) return false;
  if (value.recipients.some((recipient) => recipient.noticeId !== value.id)) return false;
  return !value.deliveryAttempts.some((attempt) => attempt.noticeId !== value.id);
}

function isTeacherReminderRun(value: unknown): value is TeacherReminderRun {
  return isRecord(value) && hasOnlyKeys(value, [
    "id", "teacherId", "classId", "assignmentId", "studentId", "noticeId", "threshold", "status", "reason", "createdAt"
  ]) &&
    typeof value.id === "string" &&
    typeof value.teacherId === "string" &&
    typeof value.classId === "string" &&
    typeof value.assignmentId === "string" &&
    typeof value.studentId === "string" &&
    (value.noticeId === undefined || typeof value.noticeId === "string") &&
    (value.threshold === "due-24h" || value.threshold === "overdue-0h" || value.threshold === "overdue-24h" || value.threshold === "overdue-72h" || value.threshold === "manual") &&
    (value.status === "queued" || value.status === "sent" || value.status === "failed" || value.status === "disabled" || value.status === "skipped") &&
    typeof value.reason === "string" &&
    isRfc3339Timestamp(value.createdAt);
}

function isNoticeQueuedPayload(value: unknown): value is TeacherNoticeQueuedPayload {
  if (!isRecord(value) || !hasOnlyKeys(value, ["notice", "attempt", "email"]) || !isRecord(value.notice) || !isRecord(value.attempt) || !isRecord(value.email)) {
    return false;
  }
  if (!isTeacherNotice(value.notice)) return false;
  if (!isTeacherNoticeDeliveryAttempt(value.attempt) ||
      value.attempt.noticeId !== value.notice.id ||
      value.attempt.channelId !== value.notice.channelId ||
      value.attempt.channelName !== value.notice.channelName) return false;
  const statusesAgree =
    (value.notice.status === "queued" && (value.attempt.status === "queued" || value.attempt.status === "disabled")) ||
    (value.notice.status === "sent" && value.attempt.status === "sent") ||
    (value.notice.status === "failed" && value.attempt.status === "failed");
  if (!statusesAgree) return false;
  return value.email.status === "queued" && hasOnlyKeys(value.email, ["status", "queued", "reused", "recovered", "skipped"]) &&
    isSafeNonnegativeInteger(value.email.queued) &&
    isSafeNonnegativeInteger(value.email.reused) &&
    isSafeNonnegativeInteger(value.email.recovered) &&
    isSafeNonnegativeInteger(value.email.skipped);
}

function isReminderPagePayload(
  value: unknown,
  intent: TeacherReminderIntent
): value is { runs: TeacherReminderRun[]; nextCursor: string | null } {
  if (!isRecord(value) || !hasOnlyKeys(value, ["runs", "nextCursor"]) || !Array.isArray(value.runs)) return false;
  if (!(value.nextCursor === null || (typeof value.nextCursor === "string" && value.nextCursor.length > 0 && value.nextCursor.length <= 500))) {
    return false;
  }
  return value.runs.every((run) => isTeacherReminderRun(run) &&
    run.teacherId === intent.teacherId &&
    intent.classId !== null && run.classId === intent.classId &&
    (intent.assignmentId === null || run.assignmentId === intent.assignmentId) &&
    (intent.manual ? run.threshold === "manual" : run.threshold !== "manual"));
}

export function retryAfterMilliseconds(value: string | null, now = Date.now()) {
  if (!value) return null;
  const normalized = value.trim();
  if (/^\d+$/u.test(normalized)) {
    const milliseconds = Number(normalized) * 1_000;
    return Number.isSafeInteger(milliseconds) ? milliseconds : null;
  }
  const retryAt = Date.parse(normalized);
  if (!Number.isFinite(retryAt)) return null;
  return Math.max(0, retryAt - now);
}

async function httpFailure(response: Response, now: number): Promise<TeacherOperationFailure> {
  const common = {
    ok: false as const,
    httpStatus: response.status,
    acceptance: "not-accepted" as const,
    retryAfterMs: retryAfterMilliseconds(response.headers.get("Retry-After"), now)
  };
  if (response.status === 400) return { ...common, kind: "bad-request", retainForRetry: false };
  if (response.status === 404) return { ...common, kind: "not-found", retainForRetry: false };
  if (response.status === 409) {
    let code: unknown;
    try {
      const payload: unknown = await response.json();
      code = isRecord(payload) ? payload.code : undefined;
    } catch {
      code = undefined;
    }
    if (code === "IDEMPOTENCY_CONFLICT") return { ...common, kind: "idempotency-conflict", retainForRetry: false };
    if (code === "NO_ELIGIBLE_RECIPIENTS") return { ...common, kind: "no-eligible-recipients", retainForRetry: false };
    return { ...common, kind: "conflict", retainForRetry: false };
  }
  if (response.status === 413) return { ...common, kind: "too-large", retainForRetry: false };
  if (response.status === 429) return { ...common, kind: "rate-limited", retainForRetry: true };
  if (response.status === 503 || response.status >= 500) {
    return { ...common, kind: "service-unavailable", retainForRetry: true };
  }
  return { ...common, kind: "unexpected", retainForRetry: false };
}

function requestFailure(
  kind: "invalid-response" | "network",
  options: { httpStatus: number | null; acceptance: "accepted" | "unknown" }
): TeacherOperationFailure {
  return {
    ok: false,
    kind,
    httpStatus: options.httpStatus,
    acceptance: options.acceptance,
    retainForRetry: true,
    retryAfterMs: null
  };
}

function clientBadRequestFailure(): TeacherOperationFailure {
  return {
    ok: false,
    kind: "bad-request",
    httpStatus: null,
    acceptance: "not-accepted",
    retainForRetry: false,
    retryAfterMs: null
  };
}

export async function queueTeacherNoticeRequest({
  intent,
  idempotencyKey,
  request = fetch,
  timeoutSignal = teacherOperationTimeoutSignal,
  now = Date.now()
}: {
  intent: TeacherNoticeQueueIntent;
  idempotencyKey: string;
  request?: TeacherOperationRequest;
  timeoutSignal?: TeacherOperationTimeoutSignal;
  now?: number;
}): Promise<{ ok: true; payload: TeacherNoticeQueuedPayload } | TeacherOperationFailure> {
  if (!isRecord(intent) ||
      !isStableIntentIdentifier(intent.noticeId) ||
      !isStableIntentIdentifier(intent.teacherId) ||
      !isStableIntentIdentifier(intent.classId) ||
      !isStableIntentIdentifier(intent.channelId)) {
    return clientBadRequestFailure();
  }
  let response: Response;
  try {
    response = await request(`/api/teacher/notices/${encodeURIComponent(intent.noticeId)}/deliveries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: timeoutSignal(),
      body: JSON.stringify({ idempotencyKey })
    });
  } catch {
    return requestFailure("network", { httpStatus: null, acceptance: "unknown" });
  }

  if (!response.ok) return await httpFailure(response, now);
  if (response.status !== 202) {
    return requestFailure("invalid-response", { httpStatus: response.status, acceptance: "accepted" });
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return requestFailure("invalid-response", { httpStatus: response.status, acceptance: "accepted" });
  }
  if (!isNoticeQueuedPayload(payload) ||
      payload.notice.id !== intent.noticeId ||
      payload.notice.teacherId !== intent.teacherId ||
      payload.notice.classId !== intent.classId ||
      payload.notice.channelId !== intent.channelId) {
    return requestFailure("invalid-response", { httpStatus: response.status, acceptance: "accepted" });
  }
  return { ok: true, payload };
}

export function createTeacherReminderRequestState(baseIdempotencyKey: string): TeacherReminderRequestState {
  return {
    baseIdempotencyKey,
    cursor: null,
    pageIndex: 0,
    runs: [],
    acceptedRunCount: 0,
    seenCursors: []
  };
}

function mergeReminderRuns(previous: TeacherReminderRun[], next: TeacherReminderRun[]) {
  const byId = new Map(previous.map((run) => [run.id, run]));
  for (const run of next) byId.set(run.id, run);
  return [...byId.values()];
}

export async function runTeacherReminderPages({
  intent,
  state,
  request = fetch,
  timeoutSignal = teacherOperationTimeoutSignal,
  onStateChange,
  now = Date.now()
}: {
  intent: TeacherReminderIntent;
  state: TeacherReminderRequestState;
  request?: TeacherOperationRequest;
  timeoutSignal?: TeacherOperationTimeoutSignal;
  onStateChange?: (state: TeacherReminderRequestState) => void;
  now?: number;
}): Promise<
  | { ok: true; state: TeacherReminderRequestState }
  | { ok: false; state: TeacherReminderRequestState; failure: TeacherOperationFailure }
> {
  if (!isStableIntentIdentifier(intent.teacherId) ||
      !isStableIntentIdentifier(intent.classId) ||
      (intent.assignmentId !== null && !isStableIntentIdentifier(intent.assignmentId)) ||
      typeof intent.manual !== "boolean") {
    return {
      ok: false,
      state,
      failure: clientBadRequestFailure()
    };
  }
  let current = state;
  for (let pageCount = 0; pageCount < 100; pageCount += 1) {
    let response: Response;
    try {
      response = await request("/api/teacher/reminder-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: timeoutSignal(),
        body: JSON.stringify({
          classId: intent.classId,
          ...(intent.assignmentId === null ? {} : { assignmentId: intent.assignmentId }),
          manual: intent.manual,
          ...(current.cursor === null ? {} : { cursor: current.cursor }),
          idempotencyKey: reminderPageIdempotencyKey(current.baseIdempotencyKey, current.pageIndex)
        })
      });
    } catch {
      return {
        ok: false,
        state: current,
        failure: requestFailure("network", { httpStatus: null, acceptance: "unknown" })
      };
    }

    if (!response.ok) return { ok: false, state: current, failure: await httpFailure(response, now) };
    if (response.status !== 200) {
      return {
        ok: false,
        state: current,
        failure: requestFailure("invalid-response", { httpStatus: response.status, acceptance: "accepted" })
      };
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      return {
        ok: false,
        state: current,
        failure: requestFailure("invalid-response", { httpStatus: response.status, acceptance: "accepted" })
      };
    }
    if (!isReminderPagePayload(payload, intent)) {
      return {
        ok: false,
        state: current,
        failure: requestFailure("invalid-response", { httpStatus: response.status, acceptance: "accepted" })
      };
    }

    const runs = mergeReminderRuns(current.runs, payload.runs);
    const acceptedRunCount = current.acceptedRunCount + payload.runs.length;
    if (payload.nextCursor === null) {
      const completedState = { ...current, runs, acceptedRunCount };
      onStateChange?.(completedState);
      return { ok: true, state: completedState };
    }
    if (payload.nextCursor === current.cursor || current.seenCursors.includes(payload.nextCursor)) {
      return {
        ok: false,
        state: { ...current, runs, acceptedRunCount },
        failure: requestFailure("invalid-response", { httpStatus: response.status, acceptance: "accepted" })
      };
    }
    current = {
      ...current,
      cursor: payload.nextCursor,
      pageIndex: current.pageIndex + 1,
      runs,
      acceptedRunCount,
      seenCursors: [...current.seenCursors, payload.nextCursor]
    };
    onStateChange?.(current);
  }

  return {
    ok: false,
    state: current,
    failure: requestFailure("invalid-response", { httpStatus: 200, acceptance: "accepted" })
  };
}
