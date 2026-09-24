import { createHash } from "node:crypto";

import { consumeInMemoryRateLimit } from "@/lib/server/rateLimit";

type RateLimitResult = ReturnType<typeof consumeInMemoryRateLimit>;
type RateLimiter = (
  key: string,
  rule: { readonly max: number; readonly windowMs: number }
) => RateLimitResult;

export interface CourseImportAdmissionLimits {
  readonly maxConcurrentPerIp: number;
  readonly maxConcurrentPerUser: number;
  readonly timeoutMs: number;
}

export interface CourseImportAdmissionLease {
  readonly signal: AbortSignal;
  release(): void;
}

const DEFAULT_LIMITS: CourseImportAdmissionLimits = Object.freeze({
  maxConcurrentPerIp: 2,
  maxConcurrentPerUser: 1,
  timeoutMs: 20_000
});
const IP_RATE_LIMIT = Object.freeze({ max: 60, windowMs: 5 * 60_000 });
const USER_RATE_LIMIT = Object.freeze({ max: 20, windowMs: 5 * 60_000 });

function firstForwardedIp(value: string | null) {
  return value?.split(",")[0]?.trim() || "";
}

function clientIp(request: Request) {
  return firstForwardedIp(request.headers.get("x-forwarded-for")) ||
    request.headers.get("x-real-ip")?.trim() ||
    "local";
}

function digest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function admissionResponse(code: string, error: string, retryAfterSeconds: number) {
  return Response.json(
    { code, error },
    {
      status: 429,
      headers: { "Retry-After": String(Math.max(1, retryAfterSeconds)) }
    }
  );
}

function assertLimits(limits: CourseImportAdmissionLimits) {
  for (const [name, value] of Object.entries(limits)) {
    if (!Number.isSafeInteger(value) || value <= 0) {
      throw new TypeError(`${name} must be a positive safe integer.`);
    }
  }
}

export function createCourseImportAdmissionController({
  consumeRateLimit = consumeInMemoryRateLimit,
  limits: overrides = {}
}: {
  readonly consumeRateLimit?: RateLimiter;
  readonly limits?: Partial<CourseImportAdmissionLimits>;
} = {}) {
  const limits = Object.freeze({ ...DEFAULT_LIMITS, ...overrides });
  assertLimits(limits);
  const active = new Map<string, number>();

  const increment = (key: string) => active.set(key, (active.get(key) ?? 0) + 1);
  const decrement = (key: string) => {
    const next = (active.get(key) ?? 1) - 1;
    if (next <= 0) active.delete(key);
    else active.set(key, next);
  };

  return Object.freeze({
    async admit(request: Request, userId: string): Promise<Response | CourseImportAdmissionLease> {
      const ipKey = `course-import-ip:${digest(clientIp(request))}`;
      const userKey = `course-import-user:${digest(userId.trim().toLowerCase())}`;
      const ipRate = consumeRateLimit(ipKey, IP_RATE_LIMIT);
      if (!ipRate.allowed) {
        return admissionResponse(
          "COURSE_IMPORT_RATE_LIMITED",
          "Course import rate limit reached.",
          ipRate.retryAfterSeconds
        );
      }
      const userRate = consumeRateLimit(userKey, USER_RATE_LIMIT);
      if (!userRate.allowed) {
        return admissionResponse(
          "COURSE_IMPORT_RATE_LIMITED",
          "Course import rate limit reached.",
          userRate.retryAfterSeconds
        );
      }
      if (
        (active.get(ipKey) ?? 0) >= limits.maxConcurrentPerIp ||
        (active.get(userKey) ?? 0) >= limits.maxConcurrentPerUser
      ) {
        return admissionResponse(
          "COURSE_IMPORT_CONCURRENCY_LIMITED",
          "Another course import is already in progress.",
          1
        );
      }

      increment(ipKey);
      increment(userKey);
      const controller = new AbortController();
      const onRequestAbort = () => controller.abort(request.signal.reason);
      if (request.signal.aborted) onRequestAbort();
      else {
        request.signal.addEventListener("abort", onRequestAbort, { once: true });
        if (request.signal.aborted) onRequestAbort();
      }
      const timeout = setTimeout(
        () => controller.abort(new Error("Course import deadline exceeded.")),
        limits.timeoutMs
      );
      let released = false;
      return Object.freeze({
        signal: controller.signal,
        release() {
          if (released) return;
          released = true;
          clearTimeout(timeout);
          request.signal.removeEventListener("abort", onRequestAbort);
          decrement(ipKey);
          decrement(userKey);
        }
      });
    }
  });
}

export const courseImportAdmissionController = createCourseImportAdmissionController();
