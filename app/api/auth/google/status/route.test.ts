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

test("Google OAuth status stays unavailable when enablement is missing", async () => {
  const response = googleOAuthStatusResponse({
    AUTH_SESSION_SECRET: "status-session-secret",
    GOOGLE_OAUTH_CLIENT_ID: "status-client-id",
    GOOGLE_OAUTH_CLIENT_SECRET: "status-client-secret",
    GOOGLE_OAUTH_REDIRECT_URI: "https://mais.test/api/auth/google/callback"
  });

  assert.deepEqual(await response.json(), { available: false });
});
