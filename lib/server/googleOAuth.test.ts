import assert from "node:assert/strict";
import { test } from "node:test";
import {
  GOOGLE_OAUTH_STATE_COOKIE,
  buildGoogleOAuthAuthorization,
  verifyGoogleIdToken,
  verifyGoogleOAuthState
} from "./googleOAuth";
import { curriculumProfileForTrack } from "@/lib/curriculumProfile";

const encoder = new TextEncoder();

function base64UrlEncode(value: Uint8Array | string) {
  const bytes = typeof value === "string" ? encoder.encode(value) : value;
  return Buffer.from(bytes).toString("base64url");
}

async function createSignedGoogleIdToken({
  clientId = "mais-client-id",
  emailVerified = true,
  nonce = "nonce-for-test",
  now = Date.now()
}: {
  clientId?: string;
  emailVerified?: boolean;
  nonce?: string;
  now?: number;
} = {}) {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256"
    },
    true,
    ["sign", "verify"]
  );
  const publicJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
  const kid = crypto.randomUUID();
  const header = { alg: "RS256", kid, typ: "JWT" };
  const payload = {
    iss: "https://accounts.google.com",
    aud: clientId,
    sub: "google-subject-123",
    email: "learner@example.com",
    email_verified: emailVerified,
    name: "Learner Example",
    picture: "https://example.test/avatar.png",
    nonce,
    iat: Math.floor(now / 1000) - 10,
    exp: Math.floor(now / 1000) + 300
  };
  const signingInput = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(payload))}`;
  const signature = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", keyPair.privateKey, encoder.encode(signingInput)));

  return {
    idToken: `${signingInput}.${base64UrlEncode(signature)}`,
    jwks: {
      keys: [{ ...publicJwk, kid, alg: "RS256", use: "sig" }]
    }
  };
}

test("buildGoogleOAuthAuthorization stores a signed state cookie and a Google OIDC authorization URL", async () => {
  const result = await buildGoogleOAuthAuthorization({
    env: {
      GOOGLE_OAUTH_ENABLED: "true",
      AUTH_SESSION_SECRET: "state-cookie-secret",
      GOOGLE_OAUTH_CLIENT_ID: "mais-client-id",
      GOOGLE_OAUTH_CLIENT_SECRET: "client-secret",
      GOOGLE_OAUTH_REDIRECT_URI: "https://mais.test/api/auth/google/callback"
    },
    requestUrl: "https://mais.test/login?next=%2Fdashboard",
    input: {
      next: "/teacher",
      role: "student",
      grade: "S4",
      curriculumProfile: curriculumProfileForTrack("HK"),
      language: "en",
      theme: "dark"
    },
    now: 1_800_000_000_000,
    randomBytes: (size: number) => new Uint8Array(size).fill(7)
  });

  assert.equal(result.status, "redirect");
  assert.equal(result.cookie.name, GOOGLE_OAUTH_STATE_COOKIE);
  assert.equal(result.cookie.options.httpOnly, true);
  assert.equal(result.cookie.options.sameSite, "lax");
  assert.equal(result.cookie.options.secure, true);
  assert.equal(result.cookie.options.path, "/");
  assert.equal(result.cookie.options.maxAge, 600);

  const authorizationUrl = new URL(result.authorizationUrl);
  assert.equal(authorizationUrl.origin, "https://accounts.google.com");
  assert.equal(authorizationUrl.pathname, "/o/oauth2/v2/auth");
  assert.equal(authorizationUrl.searchParams.get("client_id"), "mais-client-id");
  assert.equal(authorizationUrl.searchParams.get("redirect_uri"), "https://mais.test/api/auth/google/callback");
  assert.equal(authorizationUrl.searchParams.get("response_type"), "code");
  assert.equal(authorizationUrl.searchParams.get("scope"), "openid email profile");
  assert.equal(authorizationUrl.searchParams.get("prompt"), "select_account");
  assert.ok(authorizationUrl.searchParams.get("state"));
  assert.ok(authorizationUrl.searchParams.get("nonce"));

  const verified = await verifyGoogleOAuthState({
    env: { AUTH_SESSION_SECRET: "state-cookie-secret" },
    state: authorizationUrl.searchParams.get("state") ?? "",
    cookieValue: result.cookie.value,
    now: 1_800_000_001_000
  });
  assert.equal(verified.status, "valid");
  assert.equal(verified.payload.next, "/teacher");
  assert.equal(verified.payload.role, "student");
  assert.equal(verified.payload.grade, "S4");
});

test("buildGoogleOAuthAuthorization fails closed when Google OAuth env is incomplete", async () => {
  assert.equal(
    (await buildGoogleOAuthAuthorization({
      env: {
        AUTH_SESSION_SECRET: "state-cookie-secret",
        GOOGLE_OAUTH_ENABLED: "true",
        GOOGLE_OAUTH_CLIENT_ID: "mais-client-id"
      },
      requestUrl: "https://mais.test/login",
      input: { next: "/dashboard", role: "student" }
    })).status,
    "setup-missing"
  );

  assert.equal(
    (await buildGoogleOAuthAuthorization({
      env: {
        GOOGLE_OAUTH_ENABLED: "true",
        GOOGLE_OAUTH_CLIENT_ID: "mais-client-id",
        GOOGLE_OAUTH_CLIENT_SECRET: "client-secret",
        GOOGLE_OAUTH_REDIRECT_URI: "https://mais.test/api/auth/google/callback"
      },
      requestUrl: "https://mais.test/login",
      input: { next: "/dashboard", role: "student" }
    })).status,
    "setup-missing"
  );
});

test("buildGoogleOAuthAuthorization requires explicit enablement", async () => {
  assert.equal((await buildGoogleOAuthAuthorization({
    env: {
      GOOGLE_OAUTH_ENABLED: "false",
      AUTH_SESSION_SECRET: "state-cookie-secret",
      GOOGLE_OAUTH_CLIENT_ID: "mais-client-id",
      GOOGLE_OAUTH_CLIENT_SECRET: "client-secret",
      GOOGLE_OAUTH_REDIRECT_URI: "https://mais.test/api/auth/google/callback"
    },
    requestUrl: "https://mais.test/login",
    input: { next: "/dashboard", role: "student" }
  })).status, "setup-missing");

  assert.equal((await buildGoogleOAuthAuthorization({
    env: {
      AUTH_SESSION_SECRET: "state-cookie-secret",
      GOOGLE_OAUTH_CLIENT_ID: "mais-client-id",
      GOOGLE_OAUTH_CLIENT_SECRET: "client-secret",
      GOOGLE_OAUTH_REDIRECT_URI: "https://mais.test/api/auth/google/callback"
    },
    requestUrl: "https://mais.test/login",
    input: { next: "/dashboard", role: "student" }
  })).status, "setup-missing");
});

test("verifyGoogleOAuthState rejects mismatched state and tampered cookie payloads", async () => {
  const result = await buildGoogleOAuthAuthorization({
    env: {
      GOOGLE_OAUTH_ENABLED: "true",
      AUTH_SESSION_SECRET: "state-cookie-secret",
      GOOGLE_OAUTH_CLIENT_ID: "mais-client-id",
      GOOGLE_OAUTH_CLIENT_SECRET: "client-secret",
      GOOGLE_OAUTH_REDIRECT_URI: "https://mais.test/api/auth/google/callback"
    },
    requestUrl: "https://mais.test/login",
    input: { next: "https://evil.example/phish", role: "parent", language: "en", theme: "dark" },
    now: 1_800_000_000_000,
    randomBytes: (size: number) => new Uint8Array(size).fill(8)
  });

  assert.equal(result.status, "redirect");
  if (result.status !== "redirect") throw new Error("Expected Google OAuth redirect setup.");

  assert.equal(
    (await verifyGoogleOAuthState({
      env: { AUTH_SESSION_SECRET: "state-cookie-secret" },
      state: "wrong-state",
      cookieValue: result.cookie.value,
      now: 1_800_000_001_000
    })).status,
    "invalid"
  );

  const tamperedCookie = result.cookie.value.replace(/.$/, result.cookie.value.endsWith("a") ? "b" : "a");
  assert.equal(
    (await verifyGoogleOAuthState({
      env: { AUTH_SESSION_SECRET: "state-cookie-secret" },
      state: new URL(result.authorizationUrl).searchParams.get("state") ?? "",
      cookieValue: tamperedCookie,
      now: 1_800_000_001_000
    })).status,
    "invalid"
  );
});

test("verifyGoogleIdToken accepts signed Google ID tokens only for the configured audience and nonce", async () => {
  const now = 1_800_000_000_000;
  const signed = await createSignedGoogleIdToken({ now });

  const profile = await verifyGoogleIdToken({
    idToken: signed.idToken,
    clientId: "mais-client-id",
    expectedNonce: "nonce-for-test",
    jwks: signed.jwks,
    now
  });

  assert.equal(profile.status, "valid");
  assert.equal(profile.profile.subject, "google-subject-123");
  assert.equal(profile.profile.email, "learner@example.com");
  assert.equal(profile.profile.emailVerified, true);

  assert.equal(
    (await verifyGoogleIdToken({
      idToken: signed.idToken,
      clientId: "other-client-id",
      expectedNonce: "nonce-for-test",
      jwks: signed.jwks,
      now
    })).status,
    "invalid"
  );

  assert.equal(
    (await verifyGoogleIdToken({
      idToken: signed.idToken,
      clientId: "mais-client-id",
      expectedNonce: "wrong-nonce",
      jwks: signed.jwks,
      now
    })).status,
    "invalid"
  );
});

test("verifyGoogleIdToken rejects unverified Google email addresses", async () => {
  const now = 1_800_000_000_000;
  const signed = await createSignedGoogleIdToken({ emailVerified: false, now });

  const profile = await verifyGoogleIdToken({
    idToken: signed.idToken,
    clientId: "mais-client-id",
    expectedNonce: "nonce-for-test",
    jwks: signed.jwks,
    now
  });

  assert.equal(profile.status, "invalid");
});
