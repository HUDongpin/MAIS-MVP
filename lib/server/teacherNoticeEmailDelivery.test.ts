import assert from "node:assert/strict";
import test from "node:test";

import {
  deliverTeacherNoticeEmail,
  type TeacherNoticeEmailInput
} from "./teacherNoticeEmailDelivery";

const providerMessageId = "550e8400-e29b-41d4-a716-446655440000";

const baseInput = {
  recipientId: "notice-recipient-test-1",
  email: "guardian-one@example.test",
  locale: "en",
  durableDeliveryKey: "delivery-test-1",
  contentRevision: "revision-1"
} satisfies TeacherNoticeEmailInput;

const dedicatedEnv = {
  TEACHER_NOTICE_EMAIL_ENABLED: "true",
  TEACHER_NOTICE_RESEND_API_KEY: "test-dedicated-resend-secret",
  TEACHER_NOTICE_FROM: "MAIS Family Notices <notices@example.test>",
  TEACHER_NOTICE_BASE_URL: "https://candidate.example.test",
  TEACHER_NOTICE_ALLOWED_ORIGIN: "https://candidate.example.test",
  TEACHER_NOTICE_DELIVERY_TIMEOUT_MS: "1000"
};

const sharedEnv = {
  TEACHER_NOTICE_EMAIL_ENABLED: "true",
  TEACHER_NOTICE_ALLOW_SHARED_RESEND_KEY: "true",
  TEACHER_NOTICE_EMAIL_ALLOWED_CLASS_IDS: "class-test-1,class-test-2",
  TEACHER_NOTICE_FROM: "MAIS Family Notices <notices@example.test>",
  TEACHER_NOTICE_BASE_URL: "https://candidate.example.test",
  TEACHER_NOTICE_ALLOWED_ORIGIN: "https://candidate.example.test",
  RESEND_API_KEY: "test-shared-resend-secret"
};

function acceptedResponse(
  id: string = providerMessageId,
  init: ResponseInit = {}
): Response {
  return new Response(JSON.stringify({ id }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init
  });
}

async function captureRequest(
  input: TeacherNoticeEmailInput = baseInput,
  env: Record<string, string | undefined> = dedicatedEnv
) {
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  const result = await deliverTeacherNoticeEmail(input, {
    env,
    fetchImpl: async (url, init) => {
      requests.push({ url: String(url), init });
      return acceptedResponse();
    }
  });
  return { requests, result };
}

test("teacher notice email is disabled unless the feature flag is exactly true", async () => {
  let fetchCalls = 0;
  const fetchImpl: typeof fetch = async () => {
    fetchCalls += 1;
    return acceptedResponse();
  };

  for (const enabled of [undefined, "", "false", "TRUE", " true "]) {
    const result = await deliverTeacherNoticeEmail(baseInput, {
      env: {
        ...dedicatedEnv,
        TEACHER_NOTICE_EMAIL_ENABLED: enabled
      },
      fetchImpl
    });
    assert.deepEqual(result, {
      channel: "email",
      provider: "resend",
      status: "disabled"
    });
  }

  assert.equal(fetchCalls, 0);
});

test("enabled delivery fails closed with safe configuration variable names", async () => {
  let fetchCalls = 0;
  const result = await deliverTeacherNoticeEmail(baseInput, {
    env: { TEACHER_NOTICE_EMAIL_ENABLED: "true" },
    fetchImpl: async () => {
      fetchCalls += 1;
      return acceptedResponse();
    }
  });

  assert.deepEqual(result, {
    channel: "email",
    provider: "resend",
    status: "configuration-blocked",
    errorCode: "missing-configuration",
    missingVariables: [
      "TEACHER_NOTICE_RESEND_API_KEY",
      "TEACHER_NOTICE_FROM",
      "TEACHER_NOTICE_BASE_URL",
      "TEACHER_NOTICE_ALLOWED_ORIGIN"
    ]
  });
  assert.equal(fetchCalls, 0);
});

test("the dedicated key is preferred and shared-key configuration is ignored", async () => {
  const { requests, result } = await captureRequest(baseInput, {
    ...dedicatedEnv,
    TEACHER_NOTICE_ALLOW_SHARED_RESEND_KEY: "false",
    TEACHER_NOTICE_EMAIL_ALLOWED_CLASS_IDS: "invalid class id",
    RESEND_API_KEY: "test-shared-resend-secret"
  });

  assert.deepEqual(result, {
    channel: "email",
    provider: "resend",
    status: "accepted",
    providerMessageId
  });
  assert.equal(requests.length, 1);
  assert.equal(
    new Headers(requests[0].init?.headers).get("Authorization"),
    "Bearer test-dedicated-resend-secret"
  );
});

test("shared RESEND_API_KEY configuration never grants this adapter delivery capability", async () => {
  let fetchCalls = 0;
  const result = await deliverTeacherNoticeEmail(baseInput, {
    env: sharedEnv,
    fetchImpl: async () => {
      fetchCalls += 1;
      return acceptedResponse();
    }
  });

  assert.deepEqual(result, {
    channel: "email",
    provider: "resend",
    status: "configuration-blocked",
    errorCode: "missing-configuration",
    missingVariables: ["TEACHER_NOTICE_RESEND_API_KEY"]
  });
  assert.equal(fetchCalls, 0);
  assert.doesNotMatch(JSON.stringify(result), /test-shared-resend-secret|class-test/u);
});

test("each supported locale sends only a fixed minimal reminder and server-built acknowledgement URL", async () => {
  const expected = {
    en: {
      subject: "New MAIS family notice",
      lead: "A new family notice is available in MAIS.",
      action: "Sign in to review and acknowledge it",
      safety: "If you were not expecting this notice, contact your school."
    },
    "zh-Hant": {
      subject: "MAIS 新家校通知",
      lead: "MAIS 有一則新的家校通知。",
      action: "請登入後查看並確認",
      safety: "如你未預期收到此通知，請聯絡學校。"
    },
    "zh-Hans": {
      subject: "MAIS 新家校通知",
      lead: "MAIS 有一则新的家校通知。",
      action: "请登录后查看并确认",
      safety: "如你未预期收到此通知，请联系学校。"
    }
  } as const;

  for (const locale of ["en", "zh-Hant", "zh-Hans"] as const) {
    const { requests, result } = await captureRequest({ ...baseInput, locale });
    assert.equal(result.status, "accepted");
    assert.equal(requests.length, 1);
    assert.equal(requests[0].url, "https://api.resend.com/emails");
    assert.equal(requests[0].init?.method, "POST");

    const payload = JSON.parse(String(requests[0].init?.body)) as Record<string, unknown>;
    assert.deepEqual(Object.keys(payload).sort(), ["from", "html", "subject", "text", "to"]);
    assert.equal(payload.from, dedicatedEnv.TEACHER_NOTICE_FROM);
    assert.deepEqual(payload.to, [baseInput.email]);
    assert.equal(payload.subject, expected[locale].subject);

    const acknowledgementUrl = new URL(
      `https://candidate.example.test/parent/notices?recipientId=${baseInput.recipientId}`
    );
    assert.equal(acknowledgementUrl.origin, dedicatedEnv.TEACHER_NOTICE_ALLOWED_ORIGIN);
    assert.equal(acknowledgementUrl.pathname, "/parent/notices");
    assert.deepEqual([...acknowledgementUrl.searchParams.keys()], ["recipientId"]);
    assert.equal(acknowledgementUrl.searchParams.get("recipientId"), baseInput.recipientId);
    assert.equal(acknowledgementUrl.hash, "");

    for (const field of [String(payload.text), String(payload.html)]) {
      assert.match(field, new RegExp(expected[locale].lead, "u"));
      assert.match(field, new RegExp(expected[locale].action, "u"));
      assert.match(field, new RegExp(expected[locale].safety, "u"));
      assert.match(field, /https:\/\/candidate\.example\.test\/parent\/notices\?recipientId=notice-recipient-test-1/u);
      assert.doesNotMatch(field, /Synthetic S3A|private teacher body|student-test|teacher-test/u);
    }
  }
});

test("the adapter rejects extra notice, class, teacher, or student fields before provider contact", async () => {
  let fetchCalls = 0;
  const result = await deliverTeacherNoticeEmail(
    {
      ...baseInput,
      className: "Synthetic S3A",
      body: "private teacher body",
      studentId: "student-test",
      teacherId: "teacher-test",
      recipients: [{ recipientId: "second-recipient", email: "other@example.test" }]
    } as TeacherNoticeEmailInput,
    {
      env: dedicatedEnv,
      fetchImpl: async () => {
        fetchCalls += 1;
        return acceptedResponse();
      }
    }
  );

  assert.deepEqual(result, {
    channel: "email",
    provider: "resend",
    status: "terminal-failure",
    errorCode: "invalid-input"
  });
  assert.equal(fetchCalls, 0);
  assert.doesNotMatch(JSON.stringify(result), /Synthetic S3A|private teacher body|student-test/u);
});

test("base URL and allowed origin must be the same canonical HTTPS origin", async () => {
  const invalidConfigs = [
    { TEACHER_NOTICE_BASE_URL: "http://candidate.example.test" },
    { TEACHER_NOTICE_BASE_URL: "https://candidate.example.test/" },
    { TEACHER_NOTICE_BASE_URL: "https://candidate.example.test/parent" },
    { TEACHER_NOTICE_BASE_URL: "https://candidate.example.test?x=1" },
    { TEACHER_NOTICE_BASE_URL: "https://candidate.example.test#fragment" },
    { TEACHER_NOTICE_BASE_URL: "https://user@candidate.example.test" },
    { TEACHER_NOTICE_ALLOWED_ORIGIN: "https://other.example.test" },
    { TEACHER_NOTICE_ALLOWED_ORIGIN: "https://candidate.example.test/" }
  ];

  for (const override of invalidConfigs) {
    let fetchCalls = 0;
    const result = await deliverTeacherNoticeEmail(baseInput, {
      env: { ...dedicatedEnv, ...override },
      fetchImpl: async () => {
        fetchCalls += 1;
        return acceptedResponse();
      }
    });
    assert.equal(result.status, "configuration-blocked");
    assert.equal(fetchCalls, 0);
    assert.doesNotMatch(JSON.stringify(result), /candidate\.example\.test|other\.example\.test/u);
  }
});

test("sender, recipient address, locale, and durable identifiers are strictly validated", async () => {
  const invalidInputs = [
    { ...baseInput, email: "Guardian <guardian@example.test>" },
    { ...baseInput, email: "guardian@example.test,other@example.test" },
    { ...baseInput, email: "guardian@example.test\r\nBcc: other@example.test" },
    { ...baseInput, email: " guardian@example.test" },
    { ...baseInput, email: "guardian..one@example.test" },
    { ...baseInput, email: ".guardian@example.test" },
    { ...baseInput, email: "guardian@example..test" },
    { ...baseInput, recipientId: "recipient with spaces" },
    { ...baseInput, recipientId: "通知收件人" },
    { ...baseInput, durableDeliveryKey: "delivery\r\nkey" },
    { ...baseInput, contentRevision: "" },
    { ...baseInput, locale: "zh" as "en" }
  ];

  for (const input of invalidInputs) {
    let fetchCalls = 0;
    const result = await deliverTeacherNoticeEmail(input, {
      env: dedicatedEnv,
      fetchImpl: async () => {
        fetchCalls += 1;
        return acceptedResponse();
      }
    });
    assert.equal(result.status, "terminal-failure");
    assert.equal(result.errorCode, "invalid-input");
    assert.equal(fetchCalls, 0);
  }

  for (const sender of [
    "not-an-email",
    "First <one@example.test>, Second <two@example.test>",
    "MAIS <notices@example.test>\r\nBcc: other@example.test",
    "MAIS <notices@example..test>"
  ]) {
    let fetchCalls = 0;
    const result = await deliverTeacherNoticeEmail(baseInput, {
      env: { ...dedicatedEnv, TEACHER_NOTICE_FROM: sender },
      fetchImpl: async () => {
        fetchCalls += 1;
        return acceptedResponse();
      }
    });
    assert.equal(result.status, "configuration-blocked");
    assert.equal(fetchCalls, 0);
  }
});

test("idempotency keys are stable across deployment payload drift and scoped by durable identity", async () => {
  async function getKey(
    input: TeacherNoticeEmailInput,
    env: Record<string, string | undefined> = dedicatedEnv
  ): Promise<string> {
    const { requests, result } = await captureRequest(input, env);
    assert.equal(result.status, "accepted");
    const key = new Headers(requests[0].init?.headers).get("Idempotency-Key") ?? "";
    assert.match(key, /^teacher-notice\/[a-f0-9]{64}$/u);
    assert.ok(key.length <= 256);
    return key;
  }

  const first = await getKey(baseInput);
  const retry = await getKey({ ...baseInput });
  assert.equal(retry, first);
  assert.doesNotMatch(first, /notice-recipient|delivery-test|revision/u);

  const payloadDriftVariants: Array<[
    TeacherNoticeEmailInput,
    Record<string, string | undefined>?
  ]> = [
    [{ ...baseInput, email: "guardian-two@example.test" }],
    [{ ...baseInput, locale: "zh-Hant" }],
    [baseInput, { ...dedicatedEnv, TEACHER_NOTICE_FROM: "MAIS <family@example.test>" }],
    [
      baseInput,
      {
        ...dedicatedEnv,
        TEACHER_NOTICE_BASE_URL: "https://family.example.test",
        TEACHER_NOTICE_ALLOWED_ORIGIN: "https://family.example.test"
      }
    ]
  ];

  for (const [input, env] of payloadDriftVariants) {
    assert.equal(await getKey(input, env), first);
  }

  for (const input of [
    { ...baseInput, recipientId: "notice-recipient-test-2" },
    { ...baseInput, durableDeliveryKey: "delivery-test-2" },
    { ...baseInput, contentRevision: "revision-2" }
  ]) {
    assert.notEqual(await getKey(input), first);
  }
});

test("accepted delivery requires a strict provider UUID and performs exactly one request", async () => {
  const validUppercaseId = providerMessageId.toUpperCase();
  let fetchCalls = 0;
  const result = await deliverTeacherNoticeEmail(baseInput, {
    env: dedicatedEnv,
    fetchImpl: async () => {
      fetchCalls += 1;
      return acceptedResponse(validUppercaseId);
    }
  });

  assert.deepEqual(result, {
    channel: "email",
    provider: "resend",
    status: "accepted",
    providerMessageId
  });
  assert.equal(fetchCalls, 1);

  for (const body of [
    JSON.stringify({ id: "resend-not-a-uuid" }),
    JSON.stringify({ id: `${providerMessageId}-extra` }),
    JSON.stringify({}),
    "not-json"
  ]) {
    const malformed = await deliverTeacherNoticeEmail(baseInput, {
      env: dedicatedEnv,
      fetchImpl: async () =>
        new Response(body, {
          status: 200,
          headers: { "Content-Type": "application/json" }
        })
    });
    assert.deepEqual(malformed, {
      channel: "email",
      provider: "resend",
      status: "ambiguous",
      errorCode: "invalid-response",
      httpStatus: 200
    });
  }
});

test("409 distinguishes concurrent, locked, invalid-idempotency, and unknown conflicts", async () => {
  const cases = [
    [
      "concurrent_idempotent_requests",
      {
        status: "deferred",
        errorCode: "concurrent-request"
      }
    ],
    [
      "resource_locked",
      {
        status: "deferred",
        errorCode: "resource-locked"
      }
    ],
    [
      "invalid_idempotent_request",
      {
        status: "terminal-failure",
        errorCode: "idempotency-conflict"
      }
    ],
    [
      "not_allowlisted",
      {
        status: "ambiguous",
        errorCode: "provider-conflict"
      }
    ]
  ] as const;

  for (const [name, expected] of cases) {
    const result = await deliverTeacherNoticeEmail(baseInput, {
      env: dedicatedEnv,
      fetchImpl: async () =>
        new Response(JSON.stringify({ name, message: "private-provider-detail" }), {
          status: 409,
          headers: { "Content-Type": "application/json" }
        })
    });
    assert.deepEqual(result, {
      channel: "email",
      provider: "resend",
      ...expected,
      httpStatus: 409
    });
    assert.doesNotMatch(JSON.stringify(result), /private-provider-detail|not_allowlisted/u);
  }
});

test("429 distinguishes transient rate limiting from daily and monthly quota blocks", async () => {
  const cases = [
    [
      "rate_limit_exceeded",
      {
        status: "deferred",
        errorCode: "rate-limited",
        retryAfterSeconds: 86400
      }
    ],
    [
      "daily_quota_exceeded",
      {
        status: "configuration-blocked",
        errorCode: "provider-quota-exceeded"
      }
    ],
    [
      "monthly_quota_exceeded",
      {
        status: "configuration-blocked",
        errorCode: "provider-quota-exceeded"
      }
    ]
  ] as const;

  for (const [name, expected] of cases) {
    const result = await deliverTeacherNoticeEmail(baseInput, {
      env: dedicatedEnv,
      fetchImpl: async () =>
        new Response(JSON.stringify({ name, message: "do not expose" }), {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": "999999"
          }
        })
    });
    assert.deepEqual(result, {
      channel: "email",
      provider: "resend",
      ...expected,
      httpStatus: 429
    });
  }
});

test("authentication, security, sender, and invalid-request responses are classified safely", async () => {
  const cases = [
    [401, "restricted_api_key", "configuration-blocked", "provider-authentication-failed"],
    [403, "restricted_api_key", "configuration-blocked", "provider-authentication-failed"],
    [403, "suspended_api_key", "configuration-blocked", "provider-authentication-failed"],
    [403, "invalid_permission", "configuration-blocked", "provider-permission-denied"],
    [
      403,
      "suspended_api_key_but_not_exact",
      "configuration-blocked",
      "provider-permission-denied"
    ],
    [403, "validation_error", "configuration-blocked", "sender-configuration-invalid"],
    [403, "security_error", "configuration-blocked", "provider-security-block"],
    [451, "security_error", "configuration-blocked", "provider-security-block"],
    [422, "invalid_from_address", "configuration-blocked", "sender-configuration-invalid"],
    [400, "validation_error", "terminal-failure", "invalid-request"],
    [404, "not_found", "terminal-failure", "provider-rejected"],
    [413, "validation_error", "terminal-failure", "provider-rejected"]
  ] as const;

  for (const [httpStatus, name, status, errorCode] of cases) {
    const result = await deliverTeacherNoticeEmail(baseInput, {
      env: dedicatedEnv,
      fetchImpl: async () =>
        new Response(JSON.stringify({ name, message: "secret provider explanation" }), {
          status: httpStatus,
          headers: { "Content-Type": "application/json" }
        })
    });
    assert.deepEqual(result, {
      channel: "email",
      provider: "resend",
      status,
      errorCode,
      httpStatus
    });
    assert.doesNotMatch(
      JSON.stringify(result),
      /secret provider explanation|restricted_api_key|suspended_api_key|invalid_permission/u
    );
  }
});

test("408, 425, and 5xx responses are ambiguous because the provider may have committed", async () => {
  for (const httpStatus of [408, 425, 500, 502, 503, 504]) {
    const result = await deliverTeacherNoticeEmail(baseInput, {
      env: dedicatedEnv,
      fetchImpl: async () =>
        new Response(JSON.stringify({ name: "internal_server_error" }), {
          status: httpStatus,
          headers: { "Content-Type": "application/json" }
        })
    });
    assert.deepEqual(result, {
      channel: "email",
      provider: "resend",
      status: "ambiguous",
      errorCode: "provider-unavailable",
      httpStatus
    });
  }
});

test("request timeout is ambiguous, aborts the request, and exposes no diagnostics", async () => {
  let sawAbort = false;
  const result = await deliverTeacherNoticeEmail(baseInput, {
    env: { ...dedicatedEnv, TEACHER_NOTICE_DELIVERY_TIMEOUT_MS: "25" },
    fetchImpl: async (_url, init) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          sawAbort = true;
          reject(new Error("private timeout transport detail"));
        });
      })
  });

  assert.deepEqual(result, {
    channel: "email",
    provider: "resend",
    status: "ambiguous",
    errorCode: "timeout"
  });
  assert.equal(sawAbort, true);
  assert.doesNotMatch(JSON.stringify(result), /private timeout transport detail/u);
});

test("timeout remains active during bounded response reading", async () => {
  let streamCancelled = false;
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('{"id":"'));
    },
    cancel() {
      streamCancelled = true;
    }
  });

  const result = await deliverTeacherNoticeEmail(baseInput, {
    env: { ...dedicatedEnv, TEACHER_NOTICE_DELIVERY_TIMEOUT_MS: "25" },
    fetchImpl: async () =>
      new Response(body, {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })
  });

  assert.deepEqual(result, {
    channel: "email",
    provider: "resend",
    status: "ambiguous",
    errorCode: "timeout"
  });
  assert.equal(streamCancelled, true);
});

test("response-body cancellation rejection is consumed without an unhandled rejection", async () => {
  const unhandledRejections: unknown[] = [];
  const onUnhandledRejection = (reason: unknown) => {
    unhandledRejections.push(reason);
  };
  process.on("unhandledRejection", onUnhandledRejection);

  try {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('{"id":"'));
      },
      cancel() {
        return Promise.reject(new Error("private cancellation detail"));
      }
    });

    const result = await deliverTeacherNoticeEmail(baseInput, {
      env: { ...dedicatedEnv, TEACHER_NOTICE_DELIVERY_TIMEOUT_MS: "25" },
      fetchImpl: async () =>
        new Response(body, {
          status: 200,
          headers: { "Content-Type": "application/json" }
        })
    });
    await new Promise<void>((resolve) => setImmediate(resolve));

    assert.deepEqual(result, {
      channel: "email",
      provider: "resend",
      status: "ambiguous",
      errorCode: "timeout"
    });
    assert.deepEqual(unhandledRejections, []);
    assert.doesNotMatch(JSON.stringify(result), /private cancellation detail/u);
  } finally {
    process.off("unhandledRejection", onUnhandledRejection);
  }
});

test("transport failures are ambiguous and never leak error messages or secrets", async () => {
  const originalConsoleError = console.error;
  const consoleCalls: unknown[][] = [];
  console.error = (...args: unknown[]) => {
    consoleCalls.push(args);
  };

  try {
    const result = await deliverTeacherNoticeEmail(baseInput, {
      env: dedicatedEnv,
      fetchImpl: async () => {
        throw new Error(
          `private transport detail ${dedicatedEnv.TEACHER_NOTICE_RESEND_API_KEY} ${baseInput.email}`
        );
      }
    });
    assert.deepEqual(result, {
      channel: "email",
      provider: "resend",
      status: "ambiguous",
      errorCode: "transport-error"
    });
    assert.doesNotMatch(
      JSON.stringify(result),
      /private transport detail|test-dedicated-resend-secret|guardian-one/u
    );
    assert.deepEqual(consoleCalls, []);
  } finally {
    console.error = originalConsoleError;
  }
});

test("provider response reading is bounded and cancels oversized streams", async () => {
  let streamCancelled = false;
  const oversizedBody = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(JSON.stringify({ id: "x".repeat(9000) })));
    },
    cancel() {
      streamCancelled = true;
    }
  });

  const result = await deliverTeacherNoticeEmail(baseInput, {
    env: dedicatedEnv,
    fetchImpl: async () =>
      new Response(oversizedBody, {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })
  });

  assert.deepEqual(result, {
    channel: "email",
    provider: "resend",
    status: "ambiguous",
    errorCode: "invalid-response",
    httpStatus: 200
  });
  assert.equal(streamCancelled, true);

  const contentLengthResult = await deliverTeacherNoticeEmail(baseInput, {
    env: dedicatedEnv,
    fetchImpl: async () =>
      new Response(JSON.stringify({ id: providerMessageId }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": "9000"
        }
      })
  });
  assert.equal(contentLengthResult.status, "ambiguous");
  assert.equal(contentLengthResult.errorCode, "invalid-response");
});

test("only allowlisted provider error names affect classification", async () => {
  const result = await deliverTeacherNoticeEmail(baseInput, {
    env: dedicatedEnv,
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          name: "daily_quota_exceeded_but_not_exact",
          message: `private ${dedicatedEnv.TEACHER_NOTICE_RESEND_API_KEY}`,
          email: baseInput.email
        }),
        {
          status: 429,
          headers: { "Content-Type": "application/json", "Retry-After": "3.2" }
        }
      )
  });

  assert.deepEqual(result, {
    channel: "email",
    provider: "resend",
    status: "deferred",
    errorCode: "rate-limited",
    httpStatus: 429,
    retryAfterSeconds: 4
  });
  assert.doesNotMatch(
    JSON.stringify(result),
    /daily_quota_exceeded_but_not_exact|test-dedicated-resend-secret|guardian-one/u
  );
});
