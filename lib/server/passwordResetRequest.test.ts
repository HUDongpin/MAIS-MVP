import assert from "node:assert/strict";
import test from "node:test";
import { handlePasswordResetRequest } from "./passwordResetRequest";

const resetRecord = {
  token: "test-token",
  expiresAt: "2026-06-06T12:00:00.000Z",
  email: "learner@example.test"
};

test("password reset request rejects non-object bodies", async () => {
  const result = await handlePasswordResetRequest({
    body: null,
    deliveryConfigured: true,
    exposeLocalResetLinks: false,
    requestUrl: "https://learn.mais.example/api/auth/password-reset/request",
    createResetRequest: async () => resetRecord,
    sendResetLink: async () => ({ status: "sent", channel: "webhook" })
  });

  assert.deepEqual(result, {
    status: 400,
    body: { error: "Request body must be an object." }
  });
});

test("password reset request rejects blank identifiers", async () => {
  const result = await handlePasswordResetRequest({
    body: { identifier: "   " },
    deliveryConfigured: true,
    exposeLocalResetLinks: false,
    requestUrl: "https://learn.mais.example/api/auth/password-reset/request",
    createResetRequest: async () => resetRecord,
    sendResetLink: async () => ({ status: "sent", channel: "webhook" })
  });

  assert.deepEqual(result, {
    status: 400,
    body: { error: "Email or username is required." }
  });
});

test("password reset request returns 503 in production mode when no delivery is configured", async () => {
  let created = false;
  const result = await handlePasswordResetRequest({
    body: { identifier: "learner@example.test" },
    deliveryConfigured: false,
    exposeLocalResetLinks: false,
    requestUrl: "https://learn.mais.example/api/auth/password-reset/request",
    createResetRequest: async () => {
      created = true;
      return resetRecord;
    },
    sendResetLink: async () => ({ status: "sent", channel: "webhook" })
  });

  assert.equal(created, false);
  assert.deepEqual(result, {
    status: 503,
    body: { error: "Password reset delivery is not configured." }
  });
});

test("password reset request sends configured delivery without exposing token in response", async () => {
  const deliveries: Array<{ to: string; resetUrl: string; expiresAt: string }> = [];
  const result = await handlePasswordResetRequest({
    body: { identifier: " learner@example.test " },
    deliveryConfigured: true,
    env: { PASSWORD_RESET_BASE_URL: "https://app.mais.example" },
    exposeLocalResetLinks: false,
    requestUrl: "http://127.0.0.1:3000/api/auth/password-reset/request",
    createResetRequest: async (identifier) => {
      assert.equal(identifier, "learner@example.test");
      return resetRecord;
    },
    sendResetLink: async (input) => {
      deliveries.push(input);
      return { status: "sent", channel: "webhook" };
    }
  });

  assert.equal(deliveries.length, 1);
  assert.deepEqual(deliveries[0], {
    to: "learner@example.test",
    resetUrl: "https://app.mais.example/reset-password?token=test-token",
    expiresAt: "2026-06-06T12:00:00.000Z"
  });
  assert.deepEqual(result, {
    status: 200,
    body: {
      ok: true,
      message: "If an account exists, password reset instructions will be available.",
      delivery: "sent",
      deliveryChannel: "webhook"
    }
  });
});

test("password reset request keeps local reset links available for development", async () => {
  const result = await handlePasswordResetRequest({
    body: { identifier: "learner@example.test" },
    deliveryConfigured: false,
    exposeLocalResetLinks: true,
    requestUrl: "http://127.0.0.1:3000/api/auth/password-reset/request",
    createResetRequest: async () => resetRecord,
    sendResetLink: async () => ({ status: "not-configured", channel: "none" })
  });

  assert.deepEqual(result, {
    status: 200,
    body: {
      ok: true,
      message: "If an account exists, password reset instructions will be available.",
      delivery: "not-configured",
      deliveryChannel: "none",
      resetUrl: "http://127.0.0.1:3000/reset-password?token=test-token",
      expiresAt: "2026-06-06T12:00:00.000Z"
    }
  });
});

test("password reset request does not enumerate unknown accounts", async () => {
  const result = await handlePasswordResetRequest({
    body: { identifier: "missing@example.test" },
    deliveryConfigured: true,
    exposeLocalResetLinks: false,
    requestUrl: "https://learn.mais.example/api/auth/password-reset/request",
    createResetRequest: async () => null,
    sendResetLink: async () => {
      throw new Error("send should not be called for unknown accounts");
    }
  });

  assert.deepEqual(result, {
    status: 200,
    body: {
      ok: true,
      message: "If an account exists, password reset instructions will be available."
    }
  });
});
