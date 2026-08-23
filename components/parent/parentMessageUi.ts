import { textForLanguage } from "@/lib/i18n";
import type {
  Language,
  LocalizedText,
  ParentMessageCategory,
  ParentMessageComposeTargetSafe
} from "@/types";

export type ParentIdempotencyAttempt = {
  fingerprint: string;
  key: string;
};

function createParentIdempotencyKey() {
  const randomPart = typeof globalThis.crypto?.randomUUID === "function"
    ? globalThis.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `parent-${randomPart}`;
}

export function parentIdempotencyAttempt(
  current: ParentIdempotencyAttempt | null,
  fingerprint: string,
  createKey: () => string = createParentIdempotencyKey
) {
  if (current?.fingerprint === fingerprint) return current;
  return { fingerprint, key: createKey() };
}

export async function parentFetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 15_000
) {
  const controller = new AbortController();
  const callerSignal = init.signal;
  const relayCallerAbort = () => controller.abort(callerSignal?.reason);
  if (callerSignal?.aborted) relayCallerAbort();
  else callerSignal?.addEventListener("abort", relayCallerAbort, { once: true });
  const timer = globalThis.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    globalThis.clearTimeout(timer);
    callerSignal?.removeEventListener("abort", relayCallerAbort);
  }
}

export function parentLatestRequestIsCurrent({
  latestGeneration,
  requestGeneration,
  aborted
}: {
  latestGeneration: number;
  requestGeneration: number;
  aborted: boolean;
}) {
  return !aborted && latestGeneration === requestGeneration;
}

export function parentMessageContextKey({
  studentId,
  threadId,
  reportId,
  category,
  subject
}: {
  studentId?: string | null;
  threadId?: string | null;
  reportId?: string | null;
  category?: string | null;
  subject?: string | null;
}) {
  return JSON.stringify([
    studentId ?? "",
    threadId ?? "",
    reportId ?? "",
    category ?? "",
    subject ?? ""
  ]);
}

export function parentMessageHref({
  studentId,
  threadId,
  category,
  reportId,
  subject
}: {
  studentId?: string | null;
  threadId?: string | null;
  category?: ParentMessageCategory | null;
  reportId?: string | null;
  subject?: string | null;
}) {
  const params = new URLSearchParams();
  if (studentId) params.set("studentId", studentId);
  if (threadId) params.set("thread", threadId);
  if (category) params.set("category", category);
  if (reportId) params.set("reportId", reportId);
  if (subject) params.set("subject", subject);
  return params.size ? `/parent/messages?${params.toString()}` : "/parent/messages";
}

export function resolveComposeClassId({
  reportClassId,
  selectedClassId,
  availableClassIds
}: {
  reportClassId?: string | null;
  selectedClassId?: string | null;
  availableClassIds: string[];
}) {
  if (reportClassId) return availableClassIds.includes(reportClassId) ? reportClassId : "";
  if (selectedClassId && availableClassIds.includes(selectedClassId)) return selectedClassId;
  return availableClassIds.length === 1 ? availableClassIds[0] : "";
}

export function resolveParentComposeTarget({
  reportId,
  selectedClassId,
  targets
}: {
  reportId?: string | null;
  selectedClassId?: string | null;
  targets: ParentMessageComposeTargetSafe[];
}): ParentMessageComposeTargetSafe | null {
  if (reportId) {
    return targets.find((target) => target.reportId === reportId) ?? null;
  }

  const generalTargets = targets.filter((target) => !target.reportId);
  if (selectedClassId) {
    return generalTargets.find((target) => target.classId === selectedClassId) ?? null;
  }
  return generalTargets.length === 1 ? generalTargets[0] : null;
}

export type ParentMessageOutcomeCode =
  | "sent"
  | "sent-refresh-failed"
  | "invalid"
  | "not-found"
  | "too-long"
  | "rate-limited"
  | "unavailable"
  | "network-ambiguous"
  | "failed";

export function parentMessageOutcome({
  status,
  retryAfter,
  networkError = false,
  committed = false,
  refreshFailed = false,
  now = Date.now()
}: {
  status?: number;
  retryAfter?: string | null;
  networkError?: boolean;
  committed?: boolean;
  refreshFailed?: boolean;
  now?: number;
}): { code: ParentMessageOutcomeCode; retryAfterSeconds?: number } {
  if (committed) return { code: refreshFailed ? "sent-refresh-failed" : "sent" };
  if (networkError) return { code: "network-ambiguous" };
  if (status === 400 || status === 409) return { code: "invalid" };
  if (status === 404) return { code: "not-found" };
  if (status === 413) return { code: "too-long" };
  if (status === 429) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return { code: "rate-limited", retryAfterSeconds: Math.ceil(seconds) };
    }
    const retryAt = retryAfter ? Date.parse(retryAfter) : Number.NaN;
    return Number.isFinite(retryAt)
      ? { code: "rate-limited", retryAfterSeconds: Math.max(0, Math.ceil((retryAt - now) / 1000)) }
      : { code: "rate-limited" };
  }
  if (status === 503) return { code: "unavailable" };
  return { code: "failed" };
}

const weekdayIndex = new Map<string, number>([
  ["sun", 0],
  ["sunday", 0],
  ["mon", 1],
  ["monday", 1],
  ["tue", 2],
  ["tues", 2],
  ["tuesday", 2],
  ["wed", 3],
  ["wednesday", 3],
  ["thu", 4],
  ["thur", 4],
  ["thurs", 4],
  ["thursday", 4],
  ["fri", 5],
  ["friday", 5],
  ["sat", 6],
  ["saturday", 6]
]);
const englishWeekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const englishWeekdaysShort = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const chineseWeekdaysShort = ["日", "一", "二", "三", "四", "五", "六"];

export function parentWeekdayLabel(day: string, language: Language) {
  const index = weekdayIndex.get(day.trim().toLowerCase());
  if (index === undefined) return { short: day, long: day };
  if (language === "en") return { short: englishWeekdaysShort[index], long: englishWeekdays[index] };
  return { short: chineseWeekdaysShort[index], long: `星期${chineseWeekdaysShort[index]}` };
}

export function parentReportPrefillSubject(title: LocalizedText, language: Language) {
  const localizedTitle = textForLanguage(title, language);
  if (language === "zh-Hans") return `关于${localizedTitle}的问题`;
  if (language === "zh") return `關於${localizedTitle}的問題`;
  return `Question about ${localizedTitle}`;
}
