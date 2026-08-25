import { requireParentUser } from "@/lib/server/auth";
import { consumeInMemoryRateLimit } from "@/lib/server/rateLimit";
import {
  createParentMessageThread,
  findParentMessageCreateReplay,
  findParentMessageReplyReplay,
  getParentMessagesData,
  replyToParentMessageThread
} from "@/lib/server/userStore";
import type { ParentMessageCategory } from "@/types";
import {
  guardExpectedParentUser,
  parentPersistenceUnavailable,
  parentPrivateJson
} from "@/app/api/parent/response";

type ParentAuthentication = (request: Request) => Promise<{ user: { id: string } } | null>;
type RateLimitResult = { allowed: boolean; retryAfterSeconds: number };
type RateLimiter = (key: string) => RateLimitResult;

const createMessageRateLimit = { max: 12, windowMs: 60_000 };
const replyRateLimit = { max: 30, windowMs: 60_000 };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function createRateLimiter(key: string) {
  return consumeInMemoryRateLimit(key, createMessageRateLimit);
}

function replyRateLimiter(key: string) {
  return consumeInMemoryRateLimit(key, replyRateLimit);
}

function errorStatus(status: string) {
  if (status === "forbidden") return 403;
  if (status === "not-found") return 404;
  if (status === "conflict") return 409;
  if (status === "too-long") return 413;
  return 400;
}

function messageError(status: string, kind: "create" | "reply") {
  if (status === "too-long") {
    return kind === "create" ? "Parent message is too long." : "Parent reply is too long.";
  }
  if (status === "conflict") return "Idempotency key was already used for a different request.";
  if (status === "not-found") return kind === "create" ? "Message target not found." : "Message thread not found.";
  if (status === "forbidden") return "Parent access required.";
  return kind === "create" ? "Could not create parent message." : "Could not send parent reply.";
}

export function createParentMessagesGetHandler({
  authenticateParent = requireParentUser,
  loadMessages = getParentMessagesData
}: {
  authenticateParent?: ParentAuthentication;
  loadMessages?: typeof getParentMessagesData;
} = {}) {
  return async function parentMessagesGet(request: Request) {
    try {
      const authenticated = await authenticateParent(request);
      if (!authenticated) return parentPrivateJson({ error: "Parent access required." }, { status: 403 });
      const expectedUserConflict = guardExpectedParentUser(authenticated, request);
      if (expectedUserConflict) return expectedUserConflict;

      const url = new URL(request.url);
      const data = await loadMessages(
        authenticated.user.id,
        url.searchParams.get("studentId"),
        url.searchParams.get("thread")
      );
      if (!data) return parentPrivateJson({ error: "Messages unavailable." }, { status: 404 });
      return parentPrivateJson({ data });
    } catch {
      return parentPersistenceUnavailable();
    }
  };
}

export function createParentMessagePostHandler({
  authenticateParent = requireParentUser,
  findReplay = findParentMessageCreateReplay,
  createThread = createParentMessageThread,
  rateLimit = createRateLimiter
}: {
  authenticateParent?: ParentAuthentication;
  findReplay?: typeof findParentMessageCreateReplay;
  createThread?: typeof createParentMessageThread;
  rateLimit?: RateLimiter;
} = {}) {
  return async function parentMessagePost(request: Request) {
    try {
      const authenticated = await authenticateParent(request);
      if (!authenticated) return parentPrivateJson({ error: "Parent access required." }, { status: 403 });
      const expectedUserConflict = guardExpectedParentUser(authenticated, request);
      if (expectedUserConflict) return expectedUserConflict;

      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return parentPrivateJson({ error: "Invalid JSON request body." }, { status: 400 });
      }
      if (!isRecord(body)) return parentPrivateJson({ error: "Request body must be an object." }, { status: 400 });

      const input = {
        parentId: authenticated.user.id,
        studentId: stringValue(body.studentId),
        classId: stringValue(body.classId),
        idempotencyKey: stringValue(body.idempotencyKey),
        category: body.category as ParentMessageCategory,
        subject: stringValue(body.subject),
        body: stringValue(body.body),
        reportId: typeof body.reportId === "string" ? body.reportId : null
      };
      const replay = await findReplay(input);
      if (replay.status === "replayed") {
        return parentPrivateJson({ thread: replay.thread, replayed: true });
      }
      if (replay.status !== "missing") {
        return parentPrivateJson({ error: messageError(replay.status, "create") }, { status: errorStatus(replay.status) });
      }

      const admission = rateLimit(`parent-message:create:${authenticated.user.id}`);
      if (!admission.allowed) {
        return parentPrivateJson(
          { error: "Too many parent messages. Please wait before trying again." },
          { status: 429, headers: { "Retry-After": String(admission.retryAfterSeconds) } }
        );
      }

      const result = await createThread(input);
      if (result.status === "created") return parentPrivateJson({ thread: result.thread, replayed: false }, { status: 201 });
      if (result.status === "replayed") return parentPrivateJson({ thread: result.thread, replayed: true });
      return parentPrivateJson({ error: messageError(result.status, "create") }, { status: errorStatus(result.status) });
    } catch {
      return parentPersistenceUnavailable();
    }
  };
}

type ParentMessageReplyContext = { params: Promise<{ threadId: string }> };

export function createParentMessageReplyPostHandler({
  authenticateParent = requireParentUser,
  findReplay = findParentMessageReplyReplay,
  replyToThread = replyToParentMessageThread,
  rateLimit = replyRateLimiter
}: {
  authenticateParent?: ParentAuthentication;
  findReplay?: typeof findParentMessageReplyReplay;
  replyToThread?: typeof replyToParentMessageThread;
  rateLimit?: RateLimiter;
} = {}) {
  return async function parentMessageReplyPost(request: Request, { params }: ParentMessageReplyContext) {
    try {
      const authenticated = await authenticateParent(request);
      if (!authenticated) return parentPrivateJson({ error: "Parent access required." }, { status: 403 });
      const expectedUserConflict = guardExpectedParentUser(authenticated, request);
      if (expectedUserConflict) return expectedUserConflict;

      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return parentPrivateJson({ error: "Invalid JSON request body." }, { status: 400 });
      }
      if (!isRecord(body)) return parentPrivateJson({ error: "Request body must be an object." }, { status: 400 });

      const { threadId } = await params;
      let decodedThreadId: string;
      try {
        decodedThreadId = decodeURIComponent(threadId);
      } catch {
        return parentPrivateJson({ error: "Invalid message thread identifier." }, { status: 400 });
      }
      const input = {
        parentId: authenticated.user.id,
        threadId: decodedThreadId,
        idempotencyKey: stringValue(body.idempotencyKey),
        body: stringValue(body.body)
      };
      const replay = await findReplay(input);
      if (replay.status === "replayed") {
        return parentPrivateJson({
          thread: replay.thread,
          entry: replay.entry,
          entryId: replay.entryId,
          replayed: true
        });
      }
      if (replay.status !== "missing") {
        return parentPrivateJson({ error: messageError(replay.status, "reply") }, { status: errorStatus(replay.status) });
      }

      const admission = rateLimit(`parent-message:reply:${authenticated.user.id}`);
      if (!admission.allowed) {
        return parentPrivateJson(
          { error: "Too many parent replies. Please wait before trying again." },
          { status: 429, headers: { "Retry-After": String(admission.retryAfterSeconds) } }
        );
      }

      const result = await replyToThread(input);
      if (result.status === "sent") {
        return parentPrivateJson({
          thread: result.thread,
          entry: result.entry,
          entryId: result.entryId,
          replayed: false
        }, { status: 201 });
      }
      if (result.status === "replayed") {
        return parentPrivateJson({
          thread: result.thread,
          entry: result.entry,
          entryId: result.entryId,
          replayed: true
        });
      }
      return parentPrivateJson({ error: messageError(result.status, "reply") }, { status: errorStatus(result.status) });
    } catch {
      return parentPersistenceUnavailable();
    }
  };
}
