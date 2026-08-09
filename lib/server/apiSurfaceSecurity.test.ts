import assert from "node:assert/strict";
import test from "node:test";
import { POST as postAITutorRoute } from "../../app/api/ai-tutor/route";
import { GET as getAITutorStatusRoute } from "../../app/api/ai-tutor/status/route";
import { GET as getLessonRoute } from "../../app/api/lessons/[slug]/route";
import { GET as getQuestionsRoute } from "../../app/api/questions/route";
import { createSessionToken, SESSION_COOKIE_NAME } from "../session";

const anonymousQuestionLimit = 20;

async function readJson<T>(response: Response): Promise<T> {
  return await response.json() as T;
}

async function withEnv(env: Record<string, string | undefined>, run: () => Promise<void>) {
  const original = Object.fromEntries(Object.keys(env).map((key) => [key, process.env[key]]));

  Object.entries(env).forEach(([key, value]) => {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  });

  try {
    await run();
  } finally {
    Object.entries(original).forEach(([key, value]) => {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    });
  }
}

async function authenticatedRequest(url: string, userId = "student-peter") {
  const token = await createSessionToken(userId);
  return new Request(url, {
    headers: {
      cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`
    }
  });
}

test("anonymous question API returns only a limited preview payload", async () => {
  const response = await getQuestionsRoute(new Request("http://localhost/api/questions"));
  const body = await readJson<{
    questions?: unknown[];
    limited?: boolean;
    limit?: number;
    requiresSignInForFullAccess?: boolean;
    totalAvailable?: number;
  }>(response);

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(body.questions));
  assert.ok(body.questions.length > 0);
  assert.ok(body.questions.length <= anonymousQuestionLimit);
  assert.equal(body.limited, true);
  assert.equal(body.limit, anonymousQuestionLimit);
  assert.equal(body.requiresSignInForFullAccess, true);
  assert.equal(typeof body.totalAvailable, "number");
  assert.ok((body.totalAvailable ?? 0) > body.questions.length);
});

test("authenticated question API keeps full learning payload access", async () => {
  const response = await getQuestionsRoute(await authenticatedRequest("http://localhost/api/questions?grade=S3"));
  const body = await readJson<{ questions?: unknown[]; limited?: boolean }>(response);

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(body.questions));
  assert.ok(body.questions.length > anonymousQuestionLimit);
  assert.notEqual(body.limited, true);
});

test("anonymous lesson API returns preview metadata without bundled practice questions", async () => {
  const response = await getLessonRoute(new Request("http://localhost/api/lessons/quadratic-functions"), {
    params: Promise.resolve({ slug: "quadratic-functions" })
  });
  const body = await readJson<{
    access?: string;
    requiresSignInForFullAccess?: boolean;
    lesson?: {
      blocks?: Array<{ practiceQuestionIds?: string[] }>;
      practiceQuestions?: unknown[];
    };
  }>(response);

  assert.equal(response.status, 200);
  assert.equal(body.access, "preview");
  assert.equal(body.requiresSignInForFullAccess, true);
  assert.ok(body.lesson);
  assert.ok(Array.isArray(body.lesson?.blocks));
  assert.ok((body.lesson?.blocks ?? []).length <= 2);
  assert.deepEqual(body.lesson?.practiceQuestions, []);
  assert.ok((body.lesson?.blocks ?? []).every((block) => !block.practiceQuestionIds?.length));
});

test("authenticated lesson API keeps complete lesson practice access", async () => {
  const response = await getLessonRoute(await authenticatedRequest("http://localhost/api/lessons/quadratic-functions"), {
    params: Promise.resolve({ slug: "quadratic-functions" })
  });
  const body = await readJson<{
    access?: string;
    lesson?: {
      blocks?: Array<{ practiceQuestionIds?: string[] }>;
      practiceQuestions?: unknown[];
    };
  }>(response);

  assert.equal(response.status, 200);
  assert.notEqual(body.access, "preview");
  assert.ok((body.lesson?.blocks ?? []).length > 2);
  assert.ok((body.lesson?.practiceQuestions ?? []).length > 0);
});

test("AI tutor status reports redacted readiness without exposing secrets", async () => {
  const response = await getAITutorStatusRoute();
  const body = await readJson<Record<string, unknown>>(response);

  assert.equal(response.status, 200);
  assert.equal(typeof body.configured, "boolean");
  assert.equal(typeof body.mode, "string");
  assert.equal(typeof body.provider, "string");
  assert.equal(typeof body.model, "string");
  assert.equal(JSON.stringify(body).includes("API_KEY"), false);
  assert.equal(JSON.stringify(body).includes("Bearer"), false);

  for (const key of ["text", "image", "voice", "speech"]) {
    const capability = body[key] as Record<string, unknown> | undefined;
    assert.ok(capability);
    assert.equal(typeof capability.configured, "boolean");
    assert.equal(typeof capability.provider, "string");
    assert.equal(typeof capability.model, "string");
  }
});

test("AI tutor offline fixture status ignores legacy configured marker and provider keys", async () => {
  await withEnv({
    AI_TUTOR_PROVIDER_PROFILE: "offline-fixture",
    AI_TUTOR_STATUS_ASSUME_QWEN_CONFIGURED: "1",
    QWEN_API_KEY: "fake-test-key"
  }, async () => {
    const response = await getAITutorStatusRoute();
    const body = await readJson<{
      configured: boolean;
      mode: string;
      profile?: string;
      readiness?: string;
      text?: { configured?: boolean; readiness?: string };
    }>(response);
    const serialized = JSON.stringify(body);

    assert.equal(response.status, 200);
    assert.equal(body.configured, false);
    assert.equal(body.mode, "local-helper");
    assert.equal(body.profile, "offline-fixture");
    assert.equal(body.readiness, "disabled-by-test-profile");
    assert.equal(body.text?.configured, false);
    assert.equal(body.text?.readiness, "disabled-by-test-profile");
    assert.equal(serialized.includes("fake-test-key"), false);
    assert.equal(serialized.includes("status-only-configured"), false);
  });
});

test("AI tutor edge wrapper preserves resolver validation errors", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(
    JSON.stringify({ error: "Input is required." }),
    {
      status: 400,
      headers: { "Content-Type": "application/json" }
    }
  );

  try {
    const response = await postAITutorRoute(new Request("http://localhost/api/ai-tutor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}"
    }));
    const body = await readJson<{ error?: string; mode?: string }>(response);

    assert.equal(response.status, 400);
    assert.equal(body.error, "Input is required.");
    assert.equal(body.mode, undefined);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("AI tutor edge wrapper preserves resolver setup errors", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(
    JSON.stringify({ error: "Missing QWEN_API_KEY in .env.local." }),
    {
      status: 503,
      headers: { "Content-Type": "application/json" }
    }
  );

  try {
    const response = await postAITutorRoute(new Request("http://localhost/api/ai-tutor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: "Give one hint." })
    }));
    const body = await readJson<{ error?: string; mode?: string }>(response);

    assert.equal(response.status, 503);
    assert.equal(body.error, "Missing QWEN_API_KEY in .env.local.");
    assert.equal(body.mode, undefined);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("AI tutor edge wrapper preserves multipart attachment bytes", async () => {
  const originalFetch = globalThis.fetch;
  const boundary = "----mais-nova-byte-preservation";
  const encoder = new TextEncoder();
  const prefix = encoder.encode([
    `--${boundary}`,
    'Content-Disposition: form-data; name="payload"',
    "",
    JSON.stringify({ input: "Describe the attached image." }),
    `--${boundary}`,
    'Content-Disposition: form-data; name="attachments"; filename="smoke.png"',
    "Content-Type: image/png",
    "",
    ""
  ].join("\r\n"));
  const imageBytes = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0xff, 0x00, 0x80, 0xc3, 0x28, 0xfe, 0x7f
  ]);
  const suffix = encoder.encode(`\r\n--${boundary}--\r\n`);
  const multipartBytes = new Uint8Array(prefix.byteLength + imageBytes.byteLength + suffix.byteLength);
  multipartBytes.set(prefix, 0);
  multipartBytes.set(imageBytes, prefix.byteLength);
  multipartBytes.set(suffix, prefix.byteLength + imageBytes.byteLength);

  let forwardedBytes: Uint8Array | undefined;
  let forwardedContentType: string | null = null;
  globalThis.fetch = async (_input, init) => {
    forwardedContentType = new Headers(init?.headers).get("content-type");
    const body = init?.body;
    if (typeof body === "string") {
      forwardedBytes = encoder.encode(body);
    } else if (body instanceof ArrayBuffer) {
      forwardedBytes = new Uint8Array(body);
    } else if (ArrayBuffer.isView(body)) {
      forwardedBytes = new Uint8Array(body.buffer, body.byteOffset, body.byteLength);
    }
    return new Response(JSON.stringify({ reply: "Image bytes received." }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  };

  try {
    for (const accept of ["application/json", "text/event-stream"]) {
      forwardedBytes = undefined;
      forwardedContentType = null;
      const response = await postAITutorRoute(new Request("http://localhost/api/ai-tutor", {
        method: "POST",
        headers: {
          Accept: accept,
          "Content-Type": `multipart/form-data; boundary=${boundary}`
        },
        body: multipartBytes
      }));

      assert.equal(response.status, 200);
      if (accept === "text/event-stream") {
        const streamBody = await response.text();
        assert.match(streamBody, /event: final/);
        assert.match(streamBody, /Image bytes received\./);
      } else {
        const body = await readJson<{ reply?: string }>(response);
        assert.equal(body.reply, "Image bytes received.");
      }
      assert.equal(forwardedContentType, `multipart/form-data; boundary=${boundary}`);
      assert.deepEqual(forwardedBytes, multipartBytes);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});
