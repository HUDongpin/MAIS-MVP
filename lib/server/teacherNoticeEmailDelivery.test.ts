import assert from "node:assert/strict";
import test from "node:test";

import { deliverTeacherNoticeEmails } from "./teacherNoticeEmailDelivery";

const baseInput = {
  noticeId: "notice-test-1",
  classId: "class-test-1",
  className: "Synthetic S3A",
  subject: "Test family notice",
  body: "Please confirm this synthetic notice.",
  dueAt: "2026-08-24T12:00:00.000Z",
  idempotencyKey: "delivery-test-1",
  recipients: [
    {
      recipientId: "notice-recipient-test-1",
      email: "guardian-one@example.test",
      acknowledgementUrl: "https://candidate.example.test/parent/notices?recipientId=notice-recipient-test-1"
    }
  ]
};

const configuredEnv = {
  TEACHER_NOTICE_EMAIL_ENABLED: "true",
  TEACHER_NOTICE_EMAIL_ALLOWED_CLASS_IDS: "class-test-1,class-test-2",
  TEACHER_NOTICE_FROM: "MAIS Test Notices <notices@example.test>",
  RESEND_API_KEY: "test-resend-secret"
};

test("teacher notice email stays disabled when the feature flag is missing or false", async () => {
  let fetchCalls = 0;
  const fetchImpl: typeof fetch = async () => {
    fetchCalls += 1;
    return new Response(JSON.stringify({ id: "unexpected" }), { status: 200 });
  };

  for (const env of [{}, { TEACHER_NOTICE_EMAIL_ENABLED: "false" }]) {
    const result = await deliverTeacherNoticeEmails(baseInput, { env, fetchImpl });
    assert.deepEqual(result, {
      channel: "email",
      provider: "resend",
      status: "disabled",
      results: []
    });
  }

  assert.equal(fetchCalls, 0);
});

test("enabled teacher notice email reports only missing variable names and does not call the provider", async () => {
  let fetchCalls = 0;
  const result = await deliverTeacherNoticeEmails(baseInput, {
    env: { TEACHER_NOTICE_EMAIL_ENABLED: "true" },
    fetchImpl: async () => {
      fetchCalls += 1;
      return new Response(JSON.stringify({ id: "unexpected" }), { status: 200 });
    }
  });

  assert.deepEqual(result, {
    channel: "email",
    provider: "resend",
    status: "not-configured",
    missingVariables: [
      "RESEND_API_KEY",
      "TEACHER_NOTICE_EMAIL_ALLOWED_CLASS_IDS",
      "TEACHER_NOTICE_FROM"
    ],
    results: []
  });
  assert.equal(fetchCalls, 0);
});

test("teacher notice email fails closed when the class is outside the configured allowlist", async () => {
  let fetchCalls = 0;
  const result = await deliverTeacherNoticeEmails(
    { ...baseInput, classId: "class-not-authorized" },
    {
      env: configuredEnv,
      fetchImpl: async () => {
        fetchCalls += 1;
        return new Response(JSON.stringify({ id: "unexpected" }), { status: 200 });
      }
    }
  );

  assert.deepEqual(result, {
    channel: "email",
    provider: "resend",
    status: "class-not-allowed",
    results: []
  });
  assert.equal(fetchCalls, 0);
});

test("teacher notice email sends one private Resend request per recipient with scoped idempotency keys", async () => {
  const calls: Array<{
    url: string;
    method?: string;
    headers: Headers;
    body: Record<string, unknown>;
  }> = [];
  const recipients = [
    baseInput.recipients[0],
    {
      recipientId: "notice-recipient-test-2",
      email: "guardian-two@example.test",
      acknowledgementUrl: "https://candidate.example.test/parent/notices?recipientId=notice-recipient-test-2"
    }
  ];

  const result = await deliverTeacherNoticeEmails(
    {
      ...baseInput,
      className: "Synthetic <S3A & guardians>",
      body: "Please confirm <script>not executable</script> & keep this private.",
      recipients
    },
    {
      env: configuredEnv,
      fetchImpl: async (url, init) => {
        const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
        calls.push({
          url: String(url),
          method: init?.method,
          headers: new Headers(init?.headers),
          body
        });
        return new Response(JSON.stringify({ id: `resend-message-${calls.length}` }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
  );

  assert.deepEqual(result, {
    channel: "email",
    provider: "resend",
    status: "sent",
    results: [
      {
        recipientId: "notice-recipient-test-1",
        status: "sent",
        providerMessageId: "resend-message-1"
      },
      {
        recipientId: "notice-recipient-test-2",
        status: "sent",
        providerMessageId: "resend-message-2"
      }
    ]
  });
  assert.equal(calls.length, 2);

  const idempotencyKeys = new Set<string>();
  for (let index = 0; index < calls.length; index += 1) {
    const call = calls[index];
    const recipient = recipients[index];
    assert.equal(call.url, "https://api.resend.com/emails");
    assert.equal(call.method, "POST");
    assert.equal(call.headers.get("authorization"), "Bearer test-resend-secret");
    assert.equal(call.headers.get("content-type"), "application/json");
    assert.equal(call.headers.get("user-agent"), "MAIS-MVP/teacher-notice");

    const idempotencyKey = call.headers.get("idempotency-key");
    assert.match(idempotencyKey ?? "", /^teacher-notice\/[a-f0-9]{64}$/u);
    assert.ok((idempotencyKey?.length ?? 0) <= 256);
    assert.doesNotMatch(idempotencyKey ?? "", /guardian|recipient|delivery-test/u);
    idempotencyKeys.add(idempotencyKey ?? "");

    assert.deepEqual(Object.keys(call.body).sort(), ["from", "html", "subject", "text", "to"]);
    assert.deepEqual(call.body.to, [recipient.email]);
    assert.equal(call.body.from, configuredEnv.TEACHER_NOTICE_FROM);
    assert.equal(call.body.subject, baseInput.subject);

    const html = String(call.body.html);
    const text = String(call.body.text);
    assert.match(html, new RegExp(recipient.acknowledgementUrl.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"));
    assert.match(text, new RegExp(recipient.acknowledgementUrl.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"));
    assert.doesNotMatch(html, /<script>/u);
    assert.match(html, /&lt;script&gt;not executable&lt;\/script&gt;/u);
    assert.match(html, /Synthetic &lt;S3A &amp; guardians&gt;/u);
    assert.doesNotMatch(html, /guardian-(?:one|two)@example\.test/u);
  }
  assert.equal(idempotencyKeys.size, 2);
});

test("teacher notice email converts provider HTTP failures into stable safe outcomes", async () => {
  const scenarios = [
    {
      httpStatus: 409,
      errorCode: "idempotency-conflict",
      responseHeaders: {},
      retryAfterSeconds: undefined
    },
    {
      httpStatus: 422,
      errorCode: "invalid-request",
      responseHeaders: {},
      retryAfterSeconds: undefined
    },
    {
      httpStatus: 429,
      errorCode: "rate-limited",
      responseHeaders: { "Retry-After": "37" },
      retryAfterSeconds: 37
    },
    {
      httpStatus: 500,
      errorCode: "provider-unavailable",
      responseHeaders: {},
      retryAfterSeconds: undefined
    },
    {
      httpStatus: 503,
      errorCode: "provider-unavailable",
      responseHeaders: {},
      retryAfterSeconds: undefined
    }
  ] as const;

  for (const scenario of scenarios) {
    const result = await deliverTeacherNoticeEmails(baseInput, {
      env: configuredEnv,
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            message: `provider diagnostic must stay private: ${configuredEnv.RESEND_API_KEY}`,
            recipient: baseInput.recipients[0].email
          }),
          {
            status: scenario.httpStatus,
            headers: {
              "Content-Type": "application/json",
              ...scenario.responseHeaders
            }
          }
        )
    });

    assert.deepEqual(result, {
      channel: "email",
      provider: "resend",
      status: "failed",
      results: [
        {
          recipientId: baseInput.recipients[0].recipientId,
          status: "failed",
          errorCode: scenario.errorCode,
          httpStatus: scenario.httpStatus,
          ...(scenario.retryAfterSeconds === undefined
            ? {}
            : { retryAfterSeconds: scenario.retryAfterSeconds })
        }
      ]
    });

    const serialized = JSON.stringify(result);
    assert.doesNotMatch(serialized, /provider diagnostic|test-resend-secret|guardian-one@/u);
  }
});

test("teacher notice email defers later recipients after a rate-limited response", async () => {
  let fetchCalls = 0;
  const recipients = [
    baseInput.recipients[0],
    {
      recipientId: "notice-recipient-test-2",
      email: "guardian-two@example.test",
      acknowledgementUrl: "https://candidate.example.test/parent/notices?recipientId=notice-recipient-test-2"
    }
  ];

  const result = await deliverTeacherNoticeEmails(
    { ...baseInput, recipients },
    {
      env: configuredEnv,
      fetchImpl: async () => {
        fetchCalls += 1;
        return new Response(JSON.stringify({ message: "synthetic rate limit" }), {
          status: 429,
          headers: { "Retry-After": "37" }
        });
      }
    }
  );

  assert.equal(fetchCalls, 1);
  assert.deepEqual(result, {
    channel: "email",
    provider: "resend",
    status: "failed",
    results: [
      {
        recipientId: "notice-recipient-test-1",
        status: "failed",
        errorCode: "rate-limited",
        httpStatus: 429,
        retryAfterSeconds: 37
      },
      {
        recipientId: "notice-recipient-test-2",
        status: "deferred",
        errorCode: "rate-limited",
        retryAfterSeconds: 37
      }
    ]
  });
});

test("teacher notice email contains transport errors without logging or returning sensitive diagnostics", async () => {
  const capturedLogs: unknown[][] = [];
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;
  console.log = (...args: unknown[]) => capturedLogs.push(args);
  console.warn = (...args: unknown[]) => capturedLogs.push(args);
  console.error = (...args: unknown[]) => capturedLogs.push(args);

  try {
    const result = await deliverTeacherNoticeEmails(baseInput, {
      env: configuredEnv,
      fetchImpl: async () => {
        throw new Error(
          `private transport detail ${configuredEnv.RESEND_API_KEY} ${baseInput.recipients[0].email}`
        );
      }
    });

    assert.deepEqual(result, {
      channel: "email",
      provider: "resend",
      status: "failed",
      results: [
        {
          recipientId: baseInput.recipients[0].recipientId,
          status: "failed",
          errorCode: "transport-error"
        }
      ]
    });
    assert.equal(capturedLogs.length, 0);

    const serialized = JSON.stringify(result);
    assert.doesNotMatch(serialized, /private transport detail|test-resend-secret|guardian-one@/u);
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;
  }
});

test("teacher notice email aborts a stalled provider request at the configured timeout", async () => {
  let providerSignalWasAborted = false;
  const startedAt = Date.now();

  const result = await deliverTeacherNoticeEmails(baseInput, {
    env: {
      ...configuredEnv,
      TEACHER_NOTICE_DELIVERY_TIMEOUT_MS: "1000"
    },
    fetchImpl: async (_url, init) =>
      new Promise<Response>((_resolve, reject) => {
        const signal = init?.signal;
        const fallback = setTimeout(
          () => reject(new Error("provider request was not aborted")),
          1_500
        );
        signal?.addEventListener(
          "abort",
          () => {
            clearTimeout(fallback);
            providerSignalWasAborted = true;
            reject(new DOMException("synthetic timeout detail", "AbortError"));
          },
          { once: true }
        );
      })
  });

  assert.deepEqual(result, {
    channel: "email",
    provider: "resend",
    status: "failed",
    results: [
      {
        recipientId: baseInput.recipients[0].recipientId,
        status: "failed",
        errorCode: "timeout"
      }
    ]
  });
  assert.equal(providerSignalWasAborted, true);
  assert.ok(Date.now() - startedAt < 2_500);
});

test("teacher notice email keeps the timeout active while reading a successful response body", async () => {
  let providerSignalWasAborted = false;
  const startedAt = Date.now();

  const result = await deliverTeacherNoticeEmails(baseInput, {
    env: {
      ...configuredEnv,
      TEACHER_NOTICE_DELIVERY_TIMEOUT_MS: "1000"
    },
    fetchImpl: async (_url, init) => {
      const signal = init?.signal;
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          const fallback = setTimeout(
            () => controller.error(new Error("provider response body was not aborted")),
            1_500
          );
          signal?.addEventListener(
            "abort",
            () => {
              clearTimeout(fallback);
              providerSignalWasAborted = true;
              controller.error(new DOMException("synthetic body timeout detail", "AbortError"));
            },
            { once: true }
          );
        }
      });
      return new Response(stream, {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
  });

  assert.deepEqual(result, {
    channel: "email",
    provider: "resend",
    status: "failed",
    results: [
      {
        recipientId: baseInput.recipients[0].recipientId,
        status: "failed",
        errorCode: "timeout"
      }
    ]
  });
  assert.equal(providerSignalWasAborted, true);
  assert.ok(Date.now() - startedAt < 2_500);
});

test("teacher notice email rejects invalid delivery input before contacting the provider", async () => {
  const invalidInputs = [
    { ...baseInput, recipients: [] },
    {
      ...baseInput,
      idempotencyKey: "   "
    },
    {
      ...baseInput,
      recipients: [{ ...baseInput.recipients[0], email: "not-an-email" }]
    },
    {
      ...baseInput,
      recipients: [
        {
          ...baseInput.recipients[0],
          acknowledgementUrl: "http://candidate.example.test/parent/notices"
        }
      ]
    },
    {
      ...baseInput,
      recipients: [baseInput.recipients[0], { ...baseInput.recipients[0] }]
    }
  ];

  for (const input of invalidInputs) {
    let fetchCalls = 0;
    const result = await deliverTeacherNoticeEmails(input, {
      env: configuredEnv,
      fetchImpl: async () => {
        fetchCalls += 1;
        return new Response(JSON.stringify({ id: "unexpected" }), { status: 200 });
      }
    });

    assert.deepEqual(result, {
      channel: "email",
      provider: "resend",
      status: "invalid",
      errorCode: "invalid-input",
      results: []
    });
    assert.equal(fetchCalls, 0);
  }
});

test("teacher notice email contains malformed successful provider responses", async () => {
  const responses = [
    new Response("not-json-private-provider-detail", {
      status: 200,
      headers: { "Content-Type": "application/json" }
    }),
    new Response(JSON.stringify({ diagnostic: "private-provider-detail" }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    })
  ];

  for (const response of responses) {
    const result = await deliverTeacherNoticeEmails(baseInput, {
      env: configuredEnv,
      fetchImpl: async () => response
    });

    assert.deepEqual(result, {
      channel: "email",
      provider: "resend",
      status: "failed",
      results: [
        {
          recipientId: baseInput.recipients[0].recipientId,
          status: "failed",
          errorCode: "invalid-response",
          httpStatus: 200
        }
      ]
    });
    assert.doesNotMatch(JSON.stringify(result), /private-provider-detail|not-json/u);
  }
});

test("teacher notice email reuses the same recipient-scoped idempotency keys on retry", async () => {
  const recipients = [
    baseInput.recipients[0],
    {
      recipientId: "notice-recipient-test-2",
      email: "guardian-two@example.test",
      acknowledgementUrl: "https://candidate.example.test/parent/notices?recipientId=notice-recipient-test-2"
    }
  ];
  const attempts: string[][] = [];

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const keys: string[] = [];
    await deliverTeacherNoticeEmails(
      { ...baseInput, recipients },
      {
        env: configuredEnv,
        fetchImpl: async (_url, init) => {
          keys.push(new Headers(init?.headers).get("Idempotency-Key") ?? "");
          return new Response(JSON.stringify({ id: `resend-retry-${attempt}-${keys.length}` }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          });
        }
      }
    );
    attempts.push(keys);
  }

  assert.equal(attempts[0].length, 2);
  assert.notEqual(attempts[0][0], attempts[0][1]);
  assert.deepEqual(attempts[1], attempts[0]);
});
