import { createHash, timingSafeEqual } from "node:crypto";

type TeacherNoticeEmailAuthenticated = {
  user: {
    id: string;
    role: "student" | "teacher" | "parent" | "admin";
  };
};

type TeacherNoticeEmailQueueResult =
  | {
      status: "sent";
      notice: unknown;
      attempt: unknown;
      email:
        | { status: "queued"; queued: number; reused: number; recovered: number; skipped: number }
        | { status: "no-eligible"; skipped: number };
    }
  | { status: "queued"; queued: number; reused: number; recovered: number; skipped: number }
  | { status: "no-eligible"; skipped: number }
  | { status: "invalid" }
  | { status: "conflict" }
  | { status: "not-found" };

type TeacherNoticeEmailWorkerAggregate = {
  claimed: number;
  accepted: number;
  deferred: number;
  blocked: number;
  deadLetter: number;
  staleCompletions: number;
  releasedWithoutProviderContact: number;
  releaseFailures: number;
};

type TeacherMissingWorkReminderRunResult =
  | { status: "ran"; runs: unknown[]; nextCursor?: string | null }
  | { status: "conflict" | "forbidden" | "invalid" | "no-eligible" | "not-found" };

const privateNoStoreHeaders = {
  "Cache-Control": "private, no-store",
  "Content-Type": "application/json; charset=utf-8"
};

function privateJson(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: privateNoStoreHeaders
  });
}

export function constantTimeTeacherNoticeCronBearerMatches(
  authorization: string | null,
  secret: string | undefined
) {
  if (!secret || !authorization || authorization !== authorization.trim()) return false;
  const expected = `Bearer ${secret}`;
  const actualDigest = createHash("sha256").update(authorization, "utf8").digest();
  const expectedDigest = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(actualDigest, expectedDigest);
}

export function createTeacherNoticeEmailSendHandler({
  authenticate,
  queueNoticeEmail
}: {
  authenticate: (request: Request) => Promise<TeacherNoticeEmailAuthenticated | null>;
  queueNoticeEmail: (input: { teacherId: string; noticeId: string; idempotencyKey: string }) => Promise<TeacherNoticeEmailQueueResult>;
}) {
  return async function teacherNoticeEmailSendHandler(
    request: Request,
    { params }: { params: Promise<{ noticeId: string }> }
  ) {
    let authenticated: TeacherNoticeEmailAuthenticated | null;
    try {
      authenticated = await authenticate(request);
    } catch {
      return privateJson({ error: "Service temporarily unavailable." }, 503);
    }
    if (!authenticated) return privateJson({ error: "Not authenticated." }, 401);
    if (authenticated.user.role !== "teacher") {
      return privateJson({ error: "Teacher access required." }, 403);
    }

    let noticeId: string;
    try {
      noticeId = decodeURIComponent((await params).noticeId);
    } catch {
      return privateJson({ error: "Not found." }, 404);
    }
    if (!noticeId || noticeId.length > 256) return privateJson({ error: "Not found." }, 404);

    const body = await request.json().catch(() => null);
    const bodyRecord = body && typeof body === "object" && !Array.isArray(body)
      ? body as Record<string, unknown>
      : null;
    const hasBodyKey = Boolean(bodyRecord && Object.prototype.hasOwnProperty.call(bodyRecord, "idempotencyKey"));
    const bodyKey = hasBodyKey ? bodyRecord?.idempotencyKey : undefined;
    const headerKey = request.headers.get("idempotency-key")?.trim();
    const idempotencyKey = hasBodyKey
      ? (typeof bodyKey === "string" ? bodyKey.trim() : "")
      : (headerKey || `legacy-notice-send/${noticeId}`);
    if (!/^[A-Za-z0-9][A-Za-z0-9._:/-]{15,127}$/u.test(idempotencyKey)) {
      return privateJson({ error: "A valid idempotency key is required." }, 400);
    }

    try {
      const result = await queueNoticeEmail({ teacherId: authenticated.user.id, noticeId, idempotencyKey });
      if (result.status === "not-found") return privateJson({ error: "Not found." }, 404);
      if (result.status === "invalid") return privateJson({ error: "Invalid request." }, 400);
      if (result.status === "conflict") {
        return privateJson({
          error: "Idempotency key conflict.",
          code: "IDEMPOTENCY_CONFLICT"
        }, 409);
      }
      if (result.status === "no-eligible") {
        return privateJson({
          error: "No eligible family email recipients are currently available.",
          code: "NO_ELIGIBLE_RECIPIENTS"
        }, 409);
      }
      if (result.status === "sent") {
        return privateJson({
          notice: result.notice,
          attempt: result.attempt,
          email: result.email
        }, 202);
      }
      return privateJson({
        status: "queued",
        queued: result.queued,
        reused: result.reused,
        recovered: result.recovered,
        skipped: result.skipped
      }, 202);
    } catch {
      return privateJson({ error: "Service temporarily unavailable." }, 503);
    }
  };
}

export function createTeacherNoticeEmailCronHandler({
  readCronSecret,
  runWorker
}: {
  readCronSecret: () => string | undefined;
  runWorker: () => Promise<TeacherNoticeEmailWorkerAggregate>;
}) {
  return async function teacherNoticeEmailCronHandler(request: Request) {
    const cronSecret = readCronSecret();
    if (!cronSecret) return privateJson({ error: "Service temporarily unavailable." }, 503);
    if (!constantTimeTeacherNoticeCronBearerMatches(request.headers.get("authorization"), cronSecret)) {
      return privateJson({ error: "Not authorized." }, 401);
    }
    try {
      const aggregate = await runWorker();
      return privateJson({
        claimed: aggregate.claimed,
        accepted: aggregate.accepted,
        deferred: aggregate.deferred,
        blocked: aggregate.blocked,
        deadLetter: aggregate.deadLetter,
        staleCompletions: aggregate.staleCompletions,
        releasedWithoutProviderContact: aggregate.releasedWithoutProviderContact,
        releaseFailures: aggregate.releaseFailures
      }, 200);
    } catch {
      return privateJson({ error: "Service temporarily unavailable." }, 503);
    }
  };
}

export function createTeacherMissingWorkReminderRunHandler({
  authenticate,
  authorize,
  runReminders
}: {
  authenticate: (request: Request) => Promise<TeacherNoticeEmailAuthenticated | null>;
  authorize: (user: TeacherNoticeEmailAuthenticated["user"]) => boolean;
  runReminders: (input: {
    teacherId: string;
    classId: string | null;
    assignmentId: string | null;
    manual: boolean;
    cursor: string | null;
    idempotencyKey: string;
  }) => Promise<TeacherMissingWorkReminderRunResult>;
}) {
  return async function teacherMissingWorkReminderRunHandler(request: Request) {
    let authenticated: TeacherNoticeEmailAuthenticated | null;
    try {
      authenticated = await authenticate(request);
    } catch {
      return privateJson({ error: "Service temporarily unavailable." }, 503);
    }
    if (!authenticated) return privateJson({ error: "Not authenticated." }, 401);
    try {
      if (!authorize(authenticated.user)) {
        return privateJson({ error: "Teacher access required." }, 403);
      }
    } catch {
      return privateJson({ error: "Service temporarily unavailable." }, 503);
    }

    let body: Record<string, unknown>;
    try {
      const rawBody = await request.text();
      if (!rawBody.trim()) {
        body = {};
      } else {
        const parsed: unknown = JSON.parse(rawBody);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          return privateJson({ error: "Invalid request." }, 400);
        }
        body = parsed as Record<string, unknown>;
      }
    } catch {
      return privateJson({ error: "Invalid request." }, 400);
    }

    const has = (key: string) => Object.prototype.hasOwnProperty.call(body, key);
    const isValidBoundedString = (value: unknown, maxLength: number) =>
      typeof value === "string" && value.length > 0 && value.length <= maxLength;
    if (
      (has("classId") && !isValidBoundedString(body.classId, 256)) ||
      (has("assignmentId") && !isValidBoundedString(body.assignmentId, 256)) ||
      (has("manual") && typeof body.manual !== "boolean") ||
      (has("cursor") && !isValidBoundedString(body.cursor, 500))
    ) {
      return privateJson({ error: "Invalid request." }, 400);
    }

    const classId = has("classId") ? body.classId as string : null;
    const assignmentId = has("assignmentId") ? body.assignmentId as string : null;
    const manual = has("manual") ? body.manual as boolean : false;
    const cursor = has("cursor") ? body.cursor as string : null;
    const hasBodyKey = has("idempotencyKey");
    const bodyKey = hasBodyKey ? body.idempotencyKey : undefined;
    const headerKey = request.headers.get("idempotency-key")?.trim();
    const fallbackDigest = createHash("sha256")
      .update(JSON.stringify({ assignmentId, classId, cursor, manual }), "utf8")
      .digest("hex");
    const idempotencyKey = hasBodyKey
      ? (typeof bodyKey === "string" ? bodyKey.trim() : "")
      : (headerKey || `legacy-reminder-run/${fallbackDigest}`);
    if (!/^[A-Za-z0-9][A-Za-z0-9._:/-]{15,127}$/u.test(idempotencyKey)) {
      return privateJson({ error: "A valid idempotency key is required." }, 400);
    }

    let result: TeacherMissingWorkReminderRunResult;
    try {
      result = await runReminders({
        teacherId: authenticated.user.id,
        classId,
        assignmentId,
        manual,
        cursor,
        idempotencyKey
      });
    } catch {
      return privateJson({ error: "Service temporarily unavailable." }, 503);
    }

    if (result.status !== "ran") {
      const status = result.status === "forbidden"
        ? 403
        : result.status === "not-found"
          ? 404
          : result.status === "conflict"
            ? 409
            : 400;
      return result.status === "conflict"
        ? privateJson({ error: result.status, code: "IDEMPOTENCY_CONFLICT" }, status)
        : privateJson({ error: result.status }, status);
    }
    return privateJson({ runs: result.runs, nextCursor: result.nextCursor ?? null }, 200);
  };
}
