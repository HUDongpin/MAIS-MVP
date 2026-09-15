import assert from "node:assert/strict";
import { test } from "node:test";
import { googleOAuthStatusResponse } from "./handler";

test("Google OAuth status reports unavailable when env is unset", async () => {
  const response = googleOAuthStatusResponse({
    AUTH_SESSION_SECRET: "status-session-secret"
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), { available: false });
});

test("Google OAuth status reports available only when OAuth env is complete", async () => {
  const response = googleOAuthStatusResponse({
    AUTH_SESSION_SECRET: "status-session-secret",
    GOOGLE_OAUTH_ENABLED: "true",
    GOOGLE_OAUTH_CLIENT_ID: "status-client-id",
    GOOGLE_OAUTH_CLIENT_SECRET: "status-client-secret",
    GOOGLE_OAUTH_REDIRECT_URI: "https://mais.test/api/auth/google/callback"
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { available: true });
});

test("Google OAuth status treats a blank GOOGLE_OAUTH_STATE_SECRET as absent", async () => {
  const response = googleOAuthStatusResponse({
    AUTH_SESSION_SECRET: "status-session-secret",
    GOOGLE_OAUTH_ENABLED: "true",
    GOOGLE_OAUTH_CLIENT_ID: "status-client-id",
    GOOGLE_OAUTH_CLIENT_SECRET: "status-client-secret",
    GOOGLE_OAUTH_REDIRECT_URI: "https://mais.test/api/auth/google/callback",
    GOOGLE_OAUTH_STATE_SECRET: ""
  });

  assert.deepEqual(await response.json(), { available: true });
});

test("Google OAuth status stays unavailable without a session-signing secret", async () => {
  const response = googleOAuthStatusResponse({
    GOOGLE_OAUTH_ENABLED: "true",
    GOOGLE_OAUTH_CLIENT_ID: "status-client-id",
    GOOGLE_OAUTH_CLIENT_SECRET: "status-client-secret",
    GOOGLE_OAUTH_REDIRECT_URI: "https://mais.test/api/auth/google/callback",
    GOOGLE_OAUTH_STATE_SECRET: "oauth-state-secret-only"
  });

  assert.deepEqual(await response.json(), { available: false });
});
