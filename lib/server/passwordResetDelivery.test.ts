import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPasswordResetUrl,
  isPasswordResetDeliveryConfigured,
  readPasswordResetDeliveryConfig,
  sendPasswordResetLink
} from "./passwordResetDelivery";

test("password reset delivery reports not-configured without Resend or webhook env", async () => {
  const env = {};

  assert.equal(isPasswordResetDeliveryConfigured(env), false);
  assert.deepEqual(readPasswordResetDeliveryConfig(env), {
    channel: "none",
    timeoutMs: 12000
  });

  const result = await sendPasswordResetLink({
    to: "learner@example.test",
    resetUrl: "https://mais.example/reset-password?token=test",
    expiresAt: "2026-06-06T12:00:00.000Z",
    env
  });

  assert.deepEqual(result, { status: "not-configured", channel: "none" });
});

test("password reset URL uses server-only base URL when configured", () => {
  const resetUrl = buildPasswordResetUrl({
    requestUrl: "http://127.0.0.1:3000/api/auth/password-reset/request",
    token: "abc 123",
    env: { PASSWORD_RESET_BASE_URL: "https://learn.mais.example/app" }
  });

  assert.equal(resetUrl, "https://learn.mais.example/reset-password?token=abc+123");
});

test("password reset delivery posts webhook payloads", async () => {
  const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
  const result = await sendPasswordResetLink({
    to: "learner@example.test",
    resetUrl: "https://learn.mais.example/reset-password?token=token",
    expiresAt: "2026-06-06T12:00:00.000Z",
    env: {
      PASSWORD_RESET_WEBHOOK_URL: "https://hooks.example.test/password-reset",
      PASSWORD_RESET_DELIVERY_TIMEOUT_MS: "2500"
    },
    fetchImpl: async (url, init) => {
      calls.push({
        url: String(url),
        body: JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>
      });
      return new Response("{}", { status: 200 });
    }
  });

  assert.deepEqual(result, { status: "sent", channel: "webhook" });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://hooks.example.test/password-reset");
  assert.equal(calls[0].body.event, "password_reset.requested");
  assert.equal(calls[0].body.to, "learner@example.test");
  assert.equal(calls[0].body.resetUrl, "https://learn.mais.example/reset-password?token=token");
});

test("password reset delivery prefers complete Resend config over webhook fallback", async () => {
  const calls: Array<{ url: string; body: Record<string, unknown>; authorization?: string }> = [];
  const result = await sendPasswordResetLink({
    to: "learner@example.test",
    resetUrl: "https://learn.mais.example/reset-password?token=token",
    expiresAt: "2026-06-06T12:00:00.000Z",
    env: {
      RESEND_API_KEY: "test-resend-key",
      PASSWORD_RESET_FROM: "MAIS <noreply@example.test>",
      PASSWORD_RESET_WEBHOOK_URL: "https://hooks.example.test/password-reset"
    },
    fetchImpl: async (url, init) => {
      const headers = new Headers(init?.headers);
      calls.push({
        url: String(url),
        authorization: headers.get("authorization") ?? undefined,
        body: JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>
      });
      return new Response("{}", { status: 200 });
    }
  });

  assert.deepEqual(result, { status: "sent", channel: "resend" });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://api.resend.com/emails");
  assert.equal(calls[0].authorization, "Bearer test-resend-key");
  assert.equal(calls[0].body.from, "MAIS <noreply@example.test>");
  assert.equal(calls[0].body.to, "learner@example.test");
  assert.equal(calls[0].body.subject, "MAIS Math Lab password reset");
});

test("password reset delivery uses webhook when Resend config is incomplete", async () => {
  const result = await sendPasswordResetLink({
    to: "learner@example.test",
    resetUrl: "https://learn.mais.example/reset-password?token=token",
    expiresAt: "2026-06-06T12:00:00.000Z",
    env: {
      RESEND_API_KEY: "test-resend-key",
      PASSWORD_RESET_WEBHOOK_URL: "https://hooks.example.test/password-reset"
    },
    fetchImpl: async (url) => {
      assert.equal(String(url), "https://hooks.example.test/password-reset");
      return new Response("{}", { status: 200 });
    }
  });

  assert.deepEqual(result, { status: "sent", channel: "webhook" });
});

test("password reset delivery returns failed for provider HTTP errors", async () => {
  const result = await sendPasswordResetLink({
    to: "learner@example.test",
    resetUrl: "https://learn.mais.example/reset-password?token=token",
    expiresAt: "2026-06-06T12:00:00.000Z",
    env: {
      PASSWORD_RESET_WEBHOOK_URL: "https://hooks.example.test/password-reset"
    },
    fetchImpl: async () => new Response("bad", { status: 500 })
  });

  assert.deepEqual(result, {
    status: "failed",
    channel: "webhook",
    errorCode: "http-error",
    httpStatus: 500
  });
});
