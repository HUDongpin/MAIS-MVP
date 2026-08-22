import assert from "node:assert/strict";
import { test } from "node:test";
import {
  GOOGLE_OAUTH_LINK_REAUTH_COOKIE,
  GOOGLE_OAUTH_STATE_COOKIE,
  buildGoogleOAuthAuthorization,
  createGoogleOAuthLinkReauth,
  exchangeGoogleAuthorizationCode,
  fetchGoogleJwks,
  isGoogleOAuthStudentSetupAllowed,
  verifyGoogleOAuthLinkReauth,
  verifyGoogleIdToken,
  verifyGoogleOAuthState
} from "./googleOAuth";

const STATE_SECRET = "google-oauth-test-state-secret-32-chars";
import { curriculumProfileForPublisher, curriculumProfileForTrack } from "@/lib/curriculumProfile";

const encoder = new TextEncoder();

test("Google OAuth student policy requires a 13-plus attestation and a conservatively eligible grade", () => {
  assert.equal(
    isGoogleOAuthStudentSetupAllowed("S4", curriculumProfileForPublisher("HK_UNITED_PRIME_MIA"), true),
    true
  );
  assert.equal(
    isGoogleOAuthStudentSetupAllowed("S4", curriculumProfileForPublisher("HK_UNITED_PRIME_MIA"), false),
    false
  );
  assert.equal(
    isGoogleOAuthStudentSetupAllowed("S1", curriculumProfileForPublisher("HK_UNITED_PRIME_MIA"), true),
    false
  );
  assert.equal(
    isGoogleOAuthStudentSetupAllowed("K", curriculumProfileForPublisher("US_CA_MATH"), true),
    false
  );
  assert.equal(
    isGoogleOAuthStudentSetupAllowed("P5", curriculumProfileForPublisher("US_NC_MATH"), true),
    false
  );
});

test("Google account linking requires a short-lived purpose-bound reauthentication marker", async () => {
  const env = { GOOGLE_OAUTH_STATE_SECRET: STATE_SECRET };
  const issued = createGoogleOAuthLinkReauth({
    env,
    requestUrl: "https://mais.test/login",
    userId: "teacher-reauth-user",
    now: 1_800_000_000_000,
    randomBytes: (size: number) => new Uint8Array(size).fill(9)
  });

  assert.equal(issued.status, "ready");
  if (issued.status !== "ready") throw new Error("Expected a Google-link reauthentication marker.");
  assert.equal(issued.cookie.name, GOOGLE_OAUTH_LINK_REAUTH_COOKIE);
  assert.equal(issued.cookie.options.httpOnly, true);
  assert.equal(issued.cookie.options.sameSite, "lax");
  assert.equal(issued.cookie.options.secure, true);
  assert.equal(issued.cookie.options.path, "/");
  assert.equal(issued.cookie.options.maxAge, 300);
  assert.doesNotMatch(issued.cookie.value, /teacher-reauth-user/);

  assert.equal((await verifyGoogleOAuthLinkReauth({
    env,
    cookieValue: issued.cookie.value,
    userId: "teacher-reauth-user",
    now: 1_800_000_001_000
  })).status, "valid");
  assert.equal((await verifyGoogleOAuthLinkReauth({
    env,
    cookieValue: issued.cookie.value,
    userId: "different-user",
    now: 1_800_000_001_000
  })).status, "invalid");
  assert.equal((await verifyGoogleOAuthLinkReauth({
    env,
    cookieValue: issued.cookie.value,
    userId: "teacher-reauth-user",
    now: 1_800_000_301_000
  })).status, "invalid");
  assert.equal((await verifyGoogleOAuthLinkReauth({
    env,
    cookieValue: `${issued.cookie.value.slice(0, -1)}x`,
    userId: "teacher-reauth-user",
    now: 1_800_000_001_000
  })).status, "invalid");
});

function base64UrlEncode(value: Uint8Array | string) {
  const bytes = typeof value === "string" ? encoder.encode(value) : value;
  return Buffer.from(bytes).toString("base64url");
}

async function createSignedGoogleIdToken({
  authorizedParty,
  clientId = "mais-client-id",
  email = "learner@example.com",
  emailVerified = true,
  expiresInSeconds = 300,
  hostedDomain,
  issuer = "https://accounts.google.com",
  issuedAtOffsetSeconds = -10,
  nonce = "nonce-for-test",
  subject = "google-subject-123",
  now = Date.now()
}: {
  authorizedParty?: string;
  clientId?: string;
  email?: string;
  emailVerified?: boolean;
  expiresInSeconds?: number;
  hostedDomain?: string;
  issuer?: string;
  issuedAtOffsetSeconds?: number;
  nonce?: string;
  subject?: string;
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
    iss: issuer,
    aud: clientId,
    ...(authorizedParty ? { azp: authorizedParty } : {}),
    sub: subject,
    email,
    email_verified: emailVerified,
    ...(hostedDomain ? { hd: hostedDomain } : {}),
    name: "Learner Example",
    picture: "https://example.test/avatar.png",
    nonce,
    iat: Math.floor(now / 1000) + issuedAtOffsetSeconds,
    exp: Math.floor(now / 1000) + expiresInSeconds
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

test("buildGoogleOAuthAuthorization stores an authenticated-encrypted state cookie and a Google OIDC authorization URL", async () => {
  const result = await buildGoogleOAuthAuthorization({
    env: {
      GOOGLE_OAUTH_ENABLED: "true",
      AUTH_SESSION_SECRET: STATE_SECRET,
      GOOGLE_OAUTH_CLIENT_ID: "mais-client-id",
      GOOGLE_OAUTH_CLIENT_SECRET: "client-secret",
      GOOGLE_OAUTH_REDIRECT_URI: "https://mais.test/api/auth/google/callback"
    },
    requestUrl: "https://mais.test/login?next=%2Fdashboard",
    input: {
      next: "/teacher",
      linkUserId: "teacher-user-from-start-session",
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
  assert.ok(authorizationUrl.searchParams.get("code_challenge"));
  assert.equal(authorizationUrl.searchParams.get("code_challenge_method"), "S256");

  const verified = await verifyGoogleOAuthState({
    env: { AUTH_SESSION_SECRET: STATE_SECRET },
    state: authorizationUrl.searchParams.get("state") ?? "",
    cookieValue: result.cookie.value,
    now: 1_800_000_001_000
  });
  assert.equal(verified.status, "valid");
  assert.equal(verified.payload.next, "/teacher");
  assert.equal(verified.payload.linkUserId, "teacher-user-from-start-session");
  assert.equal(verified.payload.role, "student");
  assert.equal(verified.payload.grade, "S4");
  assert.match(verified.payload.codeVerifier, /^[A-Za-z0-9_-]{43}$/);
  const expectedChallenge = Buffer.from(
    await crypto.subtle.digest("SHA-256", encoder.encode(verified.payload.codeVerifier))
  ).toString("base64url");
  assert.equal(authorizationUrl.searchParams.get("code_challenge"), expectedChallenge);
  const readableCookiePrefix = Buffer.from(result.cookie.value.split(".")[0] ?? "", "base64url").toString("utf8");
  assert.doesNotMatch(readableCookiePrefix, /codeVerifier|nonce|state/);
  assert.doesNotMatch(result.cookie.value, /teacher-user-from-start-session/);
});

test("Google OAuth state omits linkUserId when start has no authenticated MAIS session", async () => {
  const result = await buildGoogleOAuthAuthorization({
    env: {
      GOOGLE_OAUTH_ENABLED: "true",
      AUTH_SESSION_SECRET: STATE_SECRET,
      GOOGLE_OAUTH_CLIENT_ID: "mais-client-id",
      GOOGLE_OAUTH_CLIENT_SECRET: "client-secret",
      GOOGLE_OAUTH_REDIRECT_URI: "https://mais.test/api/auth/google/callback"
    },
    requestUrl: "https://mais.test/login",
    input: { next: "/dashboard", role: "student" },
    randomBytes: (size: number) => new Uint8Array(size).fill(6)
  });

  assert.equal(result.status, "redirect");
  if (result.status !== "redirect") throw new Error("Expected Google OAuth redirect setup.");
  const state = new URL(result.authorizationUrl).searchParams.get("state");
  assert.ok(state);
  const verified = await verifyGoogleOAuthState({
    env: { AUTH_SESSION_SECRET: STATE_SECRET },
    state,
    cookieValue: result.cookie.value
  });
  assert.equal(verified.status, "valid");
  if (verified.status !== "valid") throw new Error("Expected valid Google OAuth state.");
  assert.equal(verified.payload.linkUserId, undefined);
});

test("buildGoogleOAuthAuthorization fails closed when Google OAuth env is incomplete", async () => {
  assert.equal(
    (await buildGoogleOAuthAuthorization({
      env: {
        AUTH_SESSION_SECRET: STATE_SECRET,
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
      AUTH_SESSION_SECRET: STATE_SECRET,
      GOOGLE_OAUTH_CLIENT_ID: "mais-client-id",
      GOOGLE_OAUTH_CLIENT_SECRET: "client-secret",
      GOOGLE_OAUTH_REDIRECT_URI: "https://mais.test/api/auth/google/callback"
    },
    requestUrl: "https://mais.test/login",
    input: { next: "/dashboard", role: "student" }
  })).status, "setup-missing");

  assert.equal((await buildGoogleOAuthAuthorization({
    env: {
      AUTH_SESSION_SECRET: STATE_SECRET,
      GOOGLE_OAUTH_CLIENT_ID: "mais-client-id",
      GOOGLE_OAUTH_CLIENT_SECRET: "client-secret",
      GOOGLE_OAUTH_REDIRECT_URI: "https://mais.test/api/auth/google/callback"
    },
    requestUrl: "https://mais.test/login",
    input: { next: "/dashboard", role: "student" }
  })).status, "setup-missing");
});

test("buildGoogleOAuthAuthorization rejects weak state secrets and insecure non-local callbacks", async () => {
  const common = {
    GOOGLE_OAUTH_ENABLED: "true",
    GOOGLE_OAUTH_CLIENT_ID: "mais-client-id",
    GOOGLE_OAUTH_CLIENT_SECRET: "client-secret"
  };

  assert.equal((await buildGoogleOAuthAuthorization({
    env: {
      ...common,
      AUTH_SESSION_SECRET: "too-short",
      GOOGLE_OAUTH_REDIRECT_URI: "https://mais.test/api/auth/google/callback"
    },
    requestUrl: "https://mais.test/login",
    input: { role: "student" }
  })).status, "setup-missing");

  assert.equal((await buildGoogleOAuthAuthorization({
    env: {
      ...common,
      AUTH_SESSION_SECRET: STATE_SECRET,
      GOOGLE_OAUTH_REDIRECT_URI: "http://mais.test/api/auth/google/callback"
    },
    requestUrl: "http://mais.test/login",
    input: { role: "student" }
  })).status, "setup-missing");

  assert.equal((await buildGoogleOAuthAuthorization({
    env: {
      ...common,
      AUTH_SESSION_SECRET: STATE_SECRET,
      GOOGLE_OAUTH_REDIRECT_URI: "http://127.0.0.1:3057/api/auth/google/callback"
    },
    requestUrl: "http://127.0.0.1:3057/login",
    input: { role: "student" }
  })).status, "redirect");
});

test("buildGoogleOAuthAuthorization rejects a stale production callback host at runtime", async () => {
  const result = await buildGoogleOAuthAuthorization({
    env: {
      VERCEL_ENV: "production",
      GOOGLE_OAUTH_ENABLED: "true",
      AUTH_SESSION_SECRET: STATE_SECRET,
      GOOGLE_OAUTH_CLIENT_ID: "mais-client-id",
      GOOGLE_OAUTH_CLIENT_SECRET: "client-secret",
      GOOGLE_OAUTH_REDIRECT_URI: "https://www.mais.hk/api/auth/google/callback"
    },
    requestUrl: "https://www.mais.hk/api/auth/google/start?role=parent",
    input: { role: "parent" }
  });

  assert.equal(result.status, "setup-missing");
});

test("production Google OAuth refuses to reuse the login-session secret for state protection", async () => {
  const commonProductionEnv = {
    VERCEL_ENV: "production",
    GOOGLE_OAUTH_ENABLED: "true",
    GOOGLE_OAUTH_CLIENT_ID: "mais-client-id",
    GOOGLE_OAUTH_CLIENT_SECRET: "client-secret",
    GOOGLE_OAUTH_REDIRECT_URI: "https://www.mais.ac/api/auth/google/callback"
  };
  const request = {
    requestUrl: "https://www.mais.ac/api/auth/google/start?role=parent",
    input: { role: "parent" as const }
  };

  for (const unsafeSecrets of [
    { AUTH_SESSION_SECRET: STATE_SECRET },
    { AUTH_SESSION_SECRET: STATE_SECRET, GOOGLE_OAUTH_STATE_SECRET: STATE_SECRET },
    { GOOGLE_OAUTH_STATE_SECRET: STATE_SECRET }
  ]) {
    const result = await buildGoogleOAuthAuthorization({
      env: { ...commonProductionEnv, ...unsafeSecrets },
      ...request
    });
    assert.equal(result.status, "setup-missing");
  }

  const ready = await buildGoogleOAuthAuthorization({
    env: {
      ...commonProductionEnv,
      AUTH_SESSION_SECRET: "independent-production-session-secret",
      GOOGLE_OAUTH_STATE_SECRET: STATE_SECRET
    },
    ...request
  });
  assert.equal(ready.status, "redirect");
});

test("buildGoogleOAuthAuthorization canonicalizes the start request to the configured callback origin", async () => {
  const result = await buildGoogleOAuthAuthorization({
    env: {
      GOOGLE_OAUTH_ENABLED: "true",
      AUTH_SESSION_SECRET: STATE_SECRET,
      GOOGLE_OAUTH_CLIENT_ID: "mais-client-id",
      GOOGLE_OAUTH_CLIENT_SECRET: "client-secret",
      GOOGLE_OAUTH_REDIRECT_URI: "https://www.mais.ac/api/auth/google/callback"
    },
    requestUrl: "https://www.mais.hk/api/auth/google/start?role=parent&next=%2Fparent",
    input: { next: "/parent", role: "parent" }
  });

  assert.equal(result.status, "canonical-redirect");
  if (result.status !== "canonical-redirect") throw new Error("Expected a canonical-origin redirect.");
  const canonicalUrl = new URL(result.canonicalUrl);
  assert.equal(canonicalUrl.origin, "https://www.mais.ac");
  assert.equal(canonicalUrl.pathname, "/api/auth/google/start");
  assert.equal(canonicalUrl.searchParams.get("role"), "parent");
  assert.equal(canonicalUrl.searchParams.get("next"), "/parent");
});

test("verifyGoogleOAuthState rejects mismatched, tampered, and expired transactions", async () => {
  const result = await buildGoogleOAuthAuthorization({
    env: {
      GOOGLE_OAUTH_ENABLED: "true",
      AUTH_SESSION_SECRET: STATE_SECRET,
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
      env: { AUTH_SESSION_SECRET: STATE_SECRET },
      state: "wrong-state",
      cookieValue: result.cookie.value,
      now: 1_800_000_001_000
    })).status,
    "invalid"
  );

  const tamperedCookie = result.cookie.value.replace(/.$/, result.cookie.value.endsWith("a") ? "b" : "a");
  assert.equal(
    (await verifyGoogleOAuthState({
      env: { AUTH_SESSION_SECRET: STATE_SECRET },
      state: new URL(result.authorizationUrl).searchParams.get("state") ?? "",
      cookieValue: tamperedCookie,
      now: 1_800_000_001_000
    })).status,
    "invalid"
  );

  assert.equal(
    (await verifyGoogleOAuthState({
      env: { AUTH_SESSION_SECRET: STATE_SECRET },
      state: new URL(result.authorizationUrl).searchParams.get("state") ?? "",
      cookieValue: result.cookie.value,
      now: 1_800_000_601_000
    })).status,
    "invalid"
  );
});

test("Google OAuth state replaces unsafe post-login paths with the dashboard", async () => {
  const unsafeNextPaths = [
    "/\\evil.example/post-auth",
    "/%5C%5Cevil.example/post-auth",
    "/%2F%2Fevil.example/post-auth",
    "/%2525252F%2525252Fevil.example/post-auth",
    "/%2e%2e//evil.example/post-auth",
    "///evil.example/post-auth",
    "https://evil.example/post-auth",
    "/dashboard\u0000/hidden"
  ];

  for (const [index, next] of unsafeNextPaths.entries()) {
    const result = await buildGoogleOAuthAuthorization({
      env: {
        GOOGLE_OAUTH_ENABLED: "true",
        AUTH_SESSION_SECRET: STATE_SECRET,
        GOOGLE_OAUTH_CLIENT_ID: "mais-client-id",
        GOOGLE_OAUTH_CLIENT_SECRET: "client-secret",
        GOOGLE_OAUTH_REDIRECT_URI: "https://mais.test/api/auth/google/callback"
      },
      requestUrl: "https://mais.test/login",
      input: { next, role: "student" },
      randomBytes: (size: number) => new Uint8Array(size).fill(index + 1)
    });

    assert.equal(result.status, "redirect");
    if (result.status !== "redirect") throw new Error("Expected Google OAuth redirect setup.");

    const authorizationUrl = new URL(result.authorizationUrl);
    const verified = await verifyGoogleOAuthState({
      env: { AUTH_SESSION_SECRET: STATE_SECRET },
      state: authorizationUrl.searchParams.get("state") ?? "",
      cookieValue: result.cookie.value
    });
    assert.equal(verified.status, "valid");
    if (verified.status !== "valid") throw new Error("Expected valid signed OAuth state.");
    assert.equal(verified.payload.next, "/dashboard", `unsafe next path should be rejected: ${JSON.stringify(next)}`);
  }
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
  assert.equal(profile.profile.emailAuthoritative, false);

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

test("verifyGoogleIdToken rejects expired, foreign-issuer, future-issued, wrong-azp, malformed, and tampered tokens", async () => {
  const now = 1_800_000_000_000;
  const invalidFixtures = await Promise.all([
    createSignedGoogleIdToken({ expiresInSeconds: -1, now }),
    createSignedGoogleIdToken({ issuer: "https://accounts.example.test", now }),
    createSignedGoogleIdToken({ subject: "", now }),
    createSignedGoogleIdToken({ issuedAtOffsetSeconds: 10 * 60, now }),
    createSignedGoogleIdToken({ authorizedParty: "different-client-id", now })
  ]);

  for (const fixture of invalidFixtures) {
    assert.equal((await verifyGoogleIdToken({
      idToken: fixture.idToken,
      clientId: "mais-client-id",
      expectedNonce: "nonce-for-test",
      jwks: fixture.jwks,
      now
    })).status, "invalid");
  }

  const signed = await createSignedGoogleIdToken({ now });
  const [header, payload, signature] = signed.idToken.split(".");
  assert.ok(header && payload && signature);
  const tamperedPayload = base64UrlEncode(JSON.stringify({
    ...JSON.parse(Buffer.from(payload, "base64url").toString("utf8")),
    email: "attacker@example.test"
  }));
  assert.equal((await verifyGoogleIdToken({
    idToken: `${header}.${tamperedPayload}.${signature}`,
    clientId: "mais-client-id",
    expectedNonce: "nonce-for-test",
    jwks: signed.jwks,
    now
  })).status, "invalid");
  assert.equal((await verifyGoogleIdToken({
    idToken: `${signed.idToken}.unexpected-fourth-segment`,
    clientId: "mais-client-id",
    expectedNonce: "nonce-for-test",
    jwks: signed.jwks,
    now
  })).status, "invalid");
});

test("verifyGoogleIdToken marks only Gmail or matching Workspace identities as email-authoritative", async () => {
  const now = 1_800_000_000_000;
  const gmail = await createSignedGoogleIdToken({ email: "learner@gmail.com", now });
  const workspace = await createSignedGoogleIdToken({
    email: "teacher@school.example",
    hostedDomain: "school.example",
    now
  });
  const mismatchedWorkspace = await createSignedGoogleIdToken({
    email: "learner@external.example",
    hostedDomain: "school.example",
    now
  });

  for (const [signed, expected] of [
    [gmail, true],
    [workspace, true],
    [mismatchedWorkspace, false]
  ] as const) {
    const verified = await verifyGoogleIdToken({
      idToken: signed.idToken,
      clientId: "mais-client-id",
      expectedNonce: "nonce-for-test",
      jwks: signed.jwks,
      now
    });
    assert.equal(verified.status, "valid");
    if (verified.status !== "valid") throw new Error("Expected a valid Google identity fixture.");
    assert.equal(verified.profile.emailAuthoritative, expected);
  }
});

test("Google provider requests send the PKCE verifier and always use a bounded abort signal", async () => {
  let tokenRequest: RequestInit | undefined;
  const token = await exchangeGoogleAuthorizationCode({
    code: "authorization-code",
    codeVerifier: "pkce-verifier",
    config: {
      clientId: "mais-client-id",
      clientSecret: "client-secret",
      redirectUri: "https://mais.test/api/auth/google/callback"
    },
    fetcher: async (_input, init) => {
      tokenRequest = init;
      return new Response(JSON.stringify({ id_token: "google-id-token" }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    }
  });

  assert.equal(token.status, "ok");
  assert.ok(tokenRequest?.signal);
  assert.equal(tokenRequest?.redirect, "error");
  const tokenBody = new URLSearchParams(String(tokenRequest?.body ?? ""));
  assert.equal(tokenBody.get("code_verifier"), "pkce-verifier");

  let jwksRequest: RequestInit | undefined;
  const jwks = await fetchGoogleJwks({
    fetcher: async (_input, init) => {
      jwksRequest = init;
      return new Response(JSON.stringify({ keys: [] }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    }
  });
  assert.deepEqual(jwks, { keys: [] });
  assert.ok(jwksRequest?.signal);
  assert.equal(jwksRequest?.redirect, "error");
});
