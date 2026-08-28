import assert from "node:assert/strict";
import test from "node:test";

import {
  createParentMessagePostHandler,
  createParentMessageReplyPostHandler,
  createParentMessagesGetHandler
} from "@/app/api/parent/messageHandlers";
import {
  PARENT_PRODUCTION_CERTIFICATION_HEADER,
  PARENT_PRODUCTION_CERTIFICATION_INSTANCE_HEADER,
  PARENT_PRODUCTION_CERTIFICATION_MODE,
  resolveParentProductionCertificationInstanceProof
} from "@/lib/server/auth";
import type { ParentMessageEntrySafe, ParentMessageThreadSafe } from "@/types";

const thread: ParentMessageThreadSafe = {
  id: "thread-safe",
  classId: "class-a",
  className: "S3 Algebra",
  studentId: "student-a",
  studentName: "Ada",
  teacherName: "Teacher Lee",
  subject: { en: "Question", zh: "問題", zhHans: "问题" },
  latestMessage: "Please help.",
  status: "unread",
  priority: "normal",
  lastMessageAt: "2026-08-23T00:00:00.000Z",
  createdAt: "2026-08-23T00:00:00.000Z",
  messages: []
};

const authenticateParent = async () => ({ user: { id: "parent-a" } });

const replyEntry: ParentMessageEntrySafe = {
  id: "entry-a",
  senderRole: "parent",
  senderName: "Parent",
  body: "Reply",
  createdAt: "2026-08-23T00:01:00.000Z"
};

function postRequest(body: unknown) {
  return new Request("http://localhost/api/parent/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-MAIS-Expected-User-Id": "parent-a"
    },
    body: JSON.stringify(body)
  });
}

test("stale parent identity is rejected before message reads, JSON parsing, replay, rate limits, or writes", async () => {
  const calls: string[] = [];
  const authenticateParentB = async () => ({ user: { id: "parent-b" } });
  const request = (url: string, init: RequestInit = {}) => new Request(url, {
    ...init,
    headers: {
      ...Object.fromEntries(new Headers(init.headers).entries()),
      "X-MAIS-Expected-User-Id": "parent-a"
    }
  });
  const get = createParentMessagesGetHandler({
    authenticateParent: authenticateParentB,
    loadMessages: async () => {
      calls.push("read");
      throw new Error("must not read parent B messages");
    }
  });
  const create = createParentMessagePostHandler({
    authenticateParent: authenticateParentB,
    findReplay: async () => {
      calls.push("create-replay");
      throw new Error("must not inspect parent B replay state");
    },
    rateLimit: () => {
      calls.push("create-rate-limit");
      return { allowed: true, retryAfterSeconds: 0 };
    },
    createThread: async () => {
      calls.push("create-write");
      throw new Error("must not write as parent B");
    },
    resolveInstanceProof: () => {
      calls.push("create-instance-proof");
      throw new Error("must not prove an instance for parent B");
    }
  });
  const reply = createParentMessageReplyPostHandler({
    authenticateParent: authenticateParentB,
    findReplay: async () => {
      calls.push("reply-replay");
      throw new Error("must not inspect parent B replay state");
    },
    rateLimit: () => {
      calls.push("reply-rate-limit");
      return { allowed: true, retryAfterSeconds: 0 };
    },
    replyToThread: async () => {
      calls.push("reply-write");
      throw new Error("must not write as parent B");
    },
    resolveInstanceProof: () => {
      calls.push("reply-instance-proof");
      throw new Error("must not prove an instance for parent B");
    }
  });

  const responses = await Promise.all([
    get(request("http://localhost/api/parent/messages")),
    create(request("http://localhost/api/parent/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{not valid json"
    })),
    reply(request("http://localhost/api/parent/messages/thread-b/reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{not valid json"
    }), { params: Promise.resolve({ threadId: "thread-b" }) })
  ]);

  for (const response of responses) {
    assert.equal(response.status, 409);
    assert.deepEqual(await response.json(), {
      code: "authenticated-user-changed",
      error: "The authenticated user changed. Reload before retrying."
    });
    assert.equal(response.headers.get("Cache-Control"), "private, no-store");
    assert.equal(response.headers.get("CDN-Cache-Control"), "private, no-store");
    assert.equal(response.headers.get("Vercel-CDN-Cache-Control"), "private, no-store");
  }
  assert.deepEqual(calls, []);
});

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

test("production instance proof is process-stable and limited to explicitly authorized successful parent writes", async () => {
  const healthSecret = "production-health-secret-that-is-long-enough-0001";
  const certifiedRequest = (authorization = `Bearer ${healthSecret}`, mode = PARENT_PRODUCTION_CERTIFICATION_MODE) => {
    const request = postRequest({
      studentId: "student-a",
      classId: "class-a",
      idempotencyKey: "stable-create-key-proof-0001",
      category: "homework",
      subject: "Question",
      body: "Please help."
    });
    request.headers.set(PARENT_PRODUCTION_CERTIFICATION_HEADER, mode);
    request.headers.set("Authorization", authorization);
    return request;
  };

  const proof = resolveParentProductionCertificationInstanceProof(certifiedRequest(), {
    vercelEnvironment: "production",
    healthSecret
  });
  const repeatedProof = resolveParentProductionCertificationInstanceProof(certifiedRequest(), {
    vercelEnvironment: "production",
    healthSecret
  });
  assert.match(proof ?? "", /^v1\.[A-Za-z0-9_-]{22}$/u);
  assert.equal(repeatedProof, proof);
  assert.doesNotMatch(proof ?? "", /production-health-secret/u);

  const handler = createParentMessagePostHandler({
    authenticateParent,
    findReplay: async () => ({ status: "replayed", thread }),
    createThread: async () => ({ status: "created", thread }),
    rateLimit: () => ({ allowed: true, retryAfterSeconds: 0 }),
    resolveInstanceProof: (request) => resolveParentProductionCertificationInstanceProof(request, {
      vercelEnvironment: "production",
      healthSecret
    })
  });
  const certifiedResponse = await handler(certifiedRequest());
  assert.equal(certifiedResponse.status, 200);
  assert.equal(certifiedResponse.headers.get(PARENT_PRODUCTION_CERTIFICATION_INSTANCE_HEADER), proof);

  const replyHandler = createParentMessageReplyPostHandler({
    authenticateParent,
    findReplay: async () => ({ status: "replayed", thread, entry: replyEntry, entryId: "entry-a" }),
    replyToThread: async () => ({ status: "sent", thread, entry: replyEntry, entryId: "entry-a" }),
    rateLimit: () => ({ allowed: true, retryAfterSeconds: 0 }),
    resolveInstanceProof: (request) => resolveParentProductionCertificationInstanceProof(request, {
      vercelEnvironment: "production",
      healthSecret
    })
  });
  const certifiedReply = await replyHandler(certifiedRequest(), {
    params: Promise.resolve({ threadId: "thread-safe" })
  });
  assert.equal(certifiedReply.status, 200);
  assert.equal(certifiedReply.headers.get(PARENT_PRODUCTION_CERTIFICATION_INSTANCE_HEADER), proof);

  for (const request of [
    postRequest({ body: "ordinary request" }),
    certifiedRequest("Bearer wrong-production-health-secret-0001"),
    certifiedRequest(`Bearer ${healthSecret}`, "wrong-mode")
  ]) {
    const response = await handler(request);
    assert.equal(response.headers.get(PARENT_PRODUCTION_CERTIFICATION_INSTANCE_HEADER), null);
  }

  assert.equal(resolveParentProductionCertificationInstanceProof(certifiedRequest(), {
    vercelEnvironment: "preview",
    healthSecret
  }), null);
  assert.equal(resolveParentProductionCertificationInstanceProof(certifiedRequest(), {
    vercelEnvironment: "production",
    healthSecret: undefined
  }), null);

  let proofResolutionCalls = 0;
  const rejected = createParentMessagePostHandler({
    authenticateParent: async () => null,
    findReplay: async () => ({ status: "replayed", thread }),
    createThread: async () => ({ status: "created", thread }),
    rateLimit: () => ({ allowed: true, retryAfterSeconds: 0 }),
    resolveInstanceProof: () => {
      proofResolutionCalls += 1;
      return "v1.must-not-be-emitted";
    }
  });
  const rejectedResponse = await rejected(certifiedRequest());
  assert.equal(rejectedResponse.status, 403);
  assert.equal(rejectedResponse.headers.get(PARENT_PRODUCTION_CERTIFICATION_INSTANCE_HEADER), null);
  assert.equal(proofResolutionCalls, 0);
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
    findReplay: async () => ({ status: "replayed", thread, entry: replyEntry, entryId: "entry-a" }),
    replyToThread: async () => ({ status: "sent", thread, entry: replyEntry, entryId: "unexpected" }),
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
  const replayPayload = await replayResponse.json() as {
    entry: ParentMessageEntrySafe;
    entryId: string;
    replayed: boolean;
  };
  assert.equal(replayPayload.entryId, "entry-a");
  assert.deepEqual(replayPayload.entry, replyEntry);
  assert.equal(replayPayload.replayed, true);
  assert.equal(rateLimitCalls, 0);

  const createHandler = createParentMessageReplyPostHandler({
    authenticateParent,
    findReplay: async () => ({ status: "missing" }),
    replyToThread: async () => ({ status: "sent", thread, entry: replyEntry, entryId: "entry-a" }),
    rateLimit: () => ({ allowed: true, retryAfterSeconds: 0 })
  });
  const created = await createHandler(
    postRequest({ body: "Reply", idempotencyKey: "stable-reply-key-0002" }),
    { params: Promise.resolve({ threadId: "thread-safe" }) }
  );
  assert.equal(created.status, 201);
  const createdPayload = await created.json() as {
    entry: ParentMessageEntrySafe;
    entryId: string;
    replayed: boolean;
  };
  assert.equal(createdPayload.replayed, false);
  assert.equal(createdPayload.entryId, "entry-a");
  assert.deepEqual(createdPayload.entry, replayPayload.entry);

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
    "http://localhost/api/parent/messages?studentId=student-missing&thread=thread-other-family",
    { headers: { "X-MAIS-Expected-User-Id": "parent-a" } }
  ));
  assert.equal(missingResponse.status, 404);
  assert.equal(missingResponse.headers.get("Cache-Control"), "private, no-store");

  const unavailable = createParentMessagesGetHandler({
    authenticateParent,
    loadMessages: async () => {
      throw new Error("postgres://secret-user:secret-password@private-host/database");
    }
  });
  const unavailableResponse = await unavailable(new Request("http://localhost/api/parent/messages", {
    headers: { "X-MAIS-Expected-User-Id": "parent-a" }
  }));
  const payload = JSON.stringify(await unavailableResponse.json());
  assert.equal(unavailableResponse.status, 503);
  assert.equal(payload, JSON.stringify({ error: "Parent data temporarily unavailable." }));
  assert.doesNotMatch(payload, /secret|postgres|private-host/);
  assert.equal(unavailableResponse.headers.get("Cache-Control"), "private, no-store");
});
