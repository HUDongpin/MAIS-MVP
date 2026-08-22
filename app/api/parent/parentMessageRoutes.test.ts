import assert from "node:assert/strict";
import test from "node:test";

import {
  createParentMessagePostHandler,
  createParentMessageReplyPostHandler,
  createParentMessagesGetHandler
} from "@/app/api/parent/messageHandlers";
import type { ParentMessageThreadSafe } from "@/types";

const thread: ParentMessageThreadSafe = {
  id: "thread-safe",
  classId: "class-a",
  className: "S3 Algebra",
  studentId: "student-a",
  studentName: "Ada",
  teacherName: "Teacher Lee",
  subject: { en: "Question", zh: "問題" },
  latestMessage: "Please help.",
  status: "unread",
  priority: "normal",
  lastMessageAt: "2026-08-23T00:00:00.000Z",
  createdAt: "2026-08-23T00:00:00.000Z",
  messages: []
};

const authenticateParent = async () => ({ user: { id: "parent-a" } });

function postRequest(body: unknown) {
  return new Request("http://localhost/api/parent/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

test("settled create idempotency replay bypasses rate limiting and returns the same safe thread", async () => {
  let rateLimitCalls = 0;
  let createCalls = 0;
  const handler = createParentMessagePostHandler({
    authenticateParent,
    findReplay: async () => ({ status: "replayed", thread }),
    createThread: async () => {
      createCalls += 1;
      return { status: "created", thread };
    },
    rateLimit: () => {
      rateLimitCalls += 1;
      return { allowed: false, retryAfterSeconds: 60 };
    }
  });

  const response = await handler(postRequest({
    studentId: "student-a",
    classId: "class-a",
    idempotencyKey: "stable-create-key-0001",
    category: "homework",
    subject: "Question",
    body: "Please help."
  }));
  const payload = await response.json() as { replayed: boolean; thread: ParentMessageThreadSafe };

  assert.equal(response.status, 200);
  assert.equal(payload.replayed, true);
  assert.equal(payload.thread.id, thread.id);
  assert.equal(rateLimitCalls, 0);
  assert.equal(createCalls, 0);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
});

test("new create forwards stable class and idempotency IDs, returns 201, and preserves Retry-After", async () => {
  let capturedClassId = "";
  let capturedIdempotencyKey = "";
  const success = createParentMessagePostHandler({
    authenticateParent,
    findReplay: async () => ({ status: "missing" }),
    createThread: async (input) => {
      capturedClassId = input.classId;
      capturedIdempotencyKey = input.idempotencyKey;
      return { status: "created", thread };
    },
    rateLimit: () => ({ allowed: true, retryAfterSeconds: 0 })
  });
  const body = {
    studentId: "student-a",
    classId: "class-a",
    idempotencyKey: "stable-create-key-0002",
    category: "homework",
    subject: "Question",
    body: "Please help.",
    reportId: "report-a"
  };
  const created = await success(postRequest(body));
  assert.equal(created.status, 201);
  assert.equal((await created.json() as { replayed: boolean }).replayed, false);
  assert.equal(capturedClassId, "class-a");
  assert.equal(capturedIdempotencyKey, "stable-create-key-0002");

  const limited = createParentMessagePostHandler({
    authenticateParent,
    findReplay: async () => ({ status: "missing" }),
    createThread: async () => ({ status: "created", thread }),
    rateLimit: () => ({ allowed: false, retryAfterSeconds: 37 })
  });
  const rateLimited = await limited(postRequest(body));
  assert.equal(rateLimited.status, 429);
  assert.equal(rateLimited.headers.get("Retry-After"), "37");
  assert.equal(rateLimited.headers.get("Cache-Control"), "private, no-store");
});

test("reply idempotency replay bypasses rate limiting and new replies return 201", async () => {
  let rateLimitCalls = 0;
  const replayHandler = createParentMessageReplyPostHandler({
    authenticateParent,
    findReplay: async () => ({ status: "replayed", thread, entryId: "entry-a" }),
    replyToThread: async () => ({ status: "sent", thread, entryId: "unexpected" }),
    rateLimit: () => {
      rateLimitCalls += 1;
      return { allowed: false, retryAfterSeconds: 60 };
    }
  });
  const replayResponse = await replayHandler(
    postRequest({ body: "Reply", idempotencyKey: "stable-reply-key-0001" }),
    { params: Promise.resolve({ threadId: "thread-safe" }) }
  );
  assert.equal(replayResponse.status, 200);
  assert.equal((await replayResponse.json() as { entryId: string }).entryId, "entry-a");
  assert.equal(rateLimitCalls, 0);

  const createHandler = createParentMessageReplyPostHandler({
    authenticateParent,
    findReplay: async () => ({ status: "missing" }),
    replyToThread: async () => ({ status: "sent", thread, entryId: "entry-new" }),
    rateLimit: () => ({ allowed: true, retryAfterSeconds: 0 })
  });
  const created = await createHandler(
    postRequest({ body: "Reply", idempotencyKey: "stable-reply-key-0002" }),
    { params: Promise.resolve({ threadId: "thread-safe" }) }
  );
  assert.equal(created.status, 201);
  assert.equal((await created.json() as { entryId: string; replayed: boolean }).replayed, false);

  const malformed = await createHandler(
    postRequest({ body: "Reply", idempotencyKey: "stable-reply-key-0003" }),
    { params: Promise.resolve({ threadId: "%E0%A4%A" }) }
  );
  assert.equal(malformed.status, 400);
  assert.equal(malformed.headers.get("Cache-Control"), "private, no-store");
});

test("explicit invalid GET filters fail closed and persistence failures become stable private 503", async () => {
  const missing = createParentMessagesGetHandler({
    authenticateParent,
    loadMessages: async () => null
  });
  const missingResponse = await missing(new Request(
    "http://localhost/api/parent/messages?studentId=student-missing&thread=thread-other-family"
  ));
  assert.equal(missingResponse.status, 404);
  assert.equal(missingResponse.headers.get("Cache-Control"), "private, no-store");

  const unavailable = createParentMessagesGetHandler({
    authenticateParent,
    loadMessages: async () => {
      throw new Error("postgres://secret-user:secret-password@private-host/database");
    }
  });
  const unavailableResponse = await unavailable(new Request("http://localhost/api/parent/messages"));
  const payload = JSON.stringify(await unavailableResponse.json());
  assert.equal(unavailableResponse.status, 503);
  assert.equal(payload, JSON.stringify({ error: "Parent data temporarily unavailable." }));
  assert.doesNotMatch(payload, /secret|postgres|private-host/);
  assert.equal(unavailableResponse.headers.get("Cache-Control"), "private, no-store");
});
