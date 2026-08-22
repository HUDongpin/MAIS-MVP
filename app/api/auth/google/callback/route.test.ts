import assert from "node:assert/strict";
import { test } from "node:test";
import { curriculumProfileForTrack } from "@/lib/curriculumProfile";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/session";
import {
  buildGoogleOAuthAuthorization,
  GOOGLE_OAUTH_STATE_COOKIE,
  verifyGoogleOAuthState
} from "@/lib/server/googleOAuth";
import { setSessionCookie } from "@/lib/server/sessionCookie";
import { authenticateGoogleIdentityForLogin } from "@/lib/server/userStore";
import { handleGoogleOAuthCallback, type GoogleCallbackDependencies } from "./handler";

const authSessionSecretFixture = crypto.randomUUID().replaceAll("-", "");
const googleClientSecretFixture = crypto.randomUUID().replaceAll("-", "");
process.env.AUTH_SESSION_SECRET = authSessionSecretFixture;
process.env.GOOGLE_OAUTH_ENABLED = "true";
process.env.GOOGLE_OAUTH_CLIENT_ID = "callback-client-id";
process.env.GOOGLE_OAUTH_CLIENT_SECRET = googleClientSecretFixture;
process.env.GOOGLE_OAUTH_REDIRECT_URI = "https://mais.test/api/auth/google/callback";

function assertHardenedCallbackResponse(response: Response) {
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
  const setCookie = response.headers.get("set-cookie") ?? "";
  assert.match(setCookie, new RegExp(`${GOOGLE_OAUTH_STATE_COOKIE}=`));
  assert.match(setCookie, /Max-Age=0/);
}

function validDependencies(
  overrides: Partial<GoogleCallbackDependencies> = {}
): GoogleCallbackDependencies {
  return {
    verifyGoogleOAuthState: async () => ({
      status: "valid",
      payload: {
        nonce: "expected-nonce",
        codeVerifier: "test-code-verifier",
        next: "/dashboard",
        role: "student",
        studentAge13OrOlder: true,
        grade: "S4"
      }
    }),
    getGoogleOAuthConfig: () => ({
      clientId: "callback-client-id",
      clientSecret: googleClientSecretFixture,
      redirectUri: "https://mais.test/api/auth/google/callback"
    }),
    exchangeGoogleAuthorizationCode: async () => ({ status: "ok", idToken: "verified-id-token" }),
    fetchGoogleJwks: async () => ({ keys: [] }),
    verifyGoogleIdToken: async () => ({
      status: "valid",
      profile: {
        subject: "google-subject",
        email: "verified.student@example.test",
        emailVerified: true,
        emailAuthoritative: true
      }
    }),
    authenticateGoogleIdentityForLogin: async () => ({
      status: "authenticated",
      session: { user: { id: "student-user-id", role: "student" } }
    }),
    setSessionCookie: async () => {},
    ...overrides
  };
}

test("Google OAuth callback route fails closed when state is missing", async () => {
  const { GET } = await import("./route");
  const response = await GET(new Request("https://mais.test/api/auth/google/callback?code=abc"));

  assert.equal(response.status, 307);
  const location = response.headers.get("location");
  assert.ok(location);
  assert.equal(new URL(location).pathname, "/login");
  assert.match(new URL(location).searchParams.get("googleError") ?? "", /state/);
  assertHardenedCallbackResponse(response);
});

test("Google OAuth callback controls a malformed encoded state cookie", async () => {
  let stateVerifierCalled = false;
  const response = await handleGoogleOAuthCallback(
    new Request("https://mais.test/api/auth/google/callback?state=present&code=abc", {
      headers: { cookie: `${GOOGLE_OAUTH_STATE_COOKIE}=%E0%A4%A` }
    }),
    validDependencies({
      verifyGoogleOAuthState: async () => {
        stateVerifierCalled = true;
        return { status: "invalid" };
      }
    })
  );

  assert.equal(stateVerifierCalled, false);
  assert.equal(response.status, 307);
  assert.equal(new URL(response.headers.get("location") ?? "").searchParams.get("googleError"), "state_invalid");
  assertHardenedCallbackResponse(response);
});

test("Google OAuth callback sets MAIS session cookie after verified Google identity", async () => {
  const pending = await buildGoogleOAuthAuthorization({
    requestUrl: "https://mais.test/login",
    input: { next: "/teacher", role: "student", studentAge13OrOlder: true, grade: "S4", language: "en", theme: "dark" },
    randomBytes: (size: number) => new Uint8Array(size).fill(9)
  });
  assert.equal(pending.status, "redirect");
  if (pending.status !== "redirect") throw new Error("Expected pending Google OAuth state.");

  const state = new URL(pending.authorizationUrl).searchParams.get("state");
  assert.ok(state);

  const calls = {
    exchangedCode: "",
    codeVerifier: "",
    emailAuthoritative: false,
    studentAge13OrOlder: false,
    requestedRole: "",
    grade: ""
  };
  const dependencies: GoogleCallbackDependencies = {
    verifyGoogleOAuthState: (input) => verifyGoogleOAuthState(input),
    getGoogleOAuthConfig: () => ({
      clientId: "callback-client-id",
      clientSecret: googleClientSecretFixture,
      redirectUri: "https://mais.test/api/auth/google/callback"
    }),
    exchangeGoogleAuthorizationCode: async ({ code, codeVerifier }) => {
      calls.exchangedCode = code;
      calls.codeVerifier = codeVerifier;
      return { status: "ok", idToken: "verified-id-token" };
    },
    fetchGoogleJwks: async () => ({ keys: [] }),
    verifyGoogleIdToken: async ({ idToken, clientId, expectedNonce }) => {
      assert.equal(idToken, "verified-id-token");
      assert.equal(clientId, "callback-client-id");
      assert.ok(expectedNonce);
      return {
        status: "valid",
        profile: {
          subject: crypto.randomUUID(),
          email: "verified.student@example.test",
          emailVerified: true,
          emailAuthoritative: true,
          name: "Verified Student"
        }
      };
    },
    authenticateGoogleIdentityForLogin: async (input) => {
      calls.emailAuthoritative = input.emailAuthoritative;
      calls.studentAge13OrOlder = input.studentAge13OrOlder === true;
      calls.requestedRole = input.requestedRole;
      calls.grade = input.grade ?? "";
      return {
        status: "created",
        session: {
          user: {
            id: "student-user-id",
            role: "student"
          }
        }
      };
    },
    setSessionCookie
  };

  const response = await handleGoogleOAuthCallback(
    new Request(`https://mais.test/api/auth/google/callback?state=${state}&code=auth-code`, {
      headers: {
        cookie: `${GOOGLE_OAUTH_STATE_COOKIE}=${encodeURIComponent(pending.cookie.value)}`
      }
    }),
    dependencies
  );

  assert.equal(calls.exchangedCode, "auth-code");
  assert.match(calls.codeVerifier, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(calls.emailAuthoritative, true);
  assert.equal(calls.studentAge13OrOlder, true);
  assert.equal(calls.requestedRole, "student");
  assert.equal(calls.grade, "S4");
  assert.equal(response.status, 307);
  const location = response.headers.get("location");
  assert.ok(location);
  assert.equal(new URL(location).pathname, "/dashboard");
  const setCookie = response.headers.get("set-cookie") ?? "";
  assert.match(setCookie, new RegExp(`${SESSION_COOKIE_NAME}=`));
  assert.match(setCookie, new RegExp(`${GOOGLE_OAUTH_STATE_COOKIE}=`));
  assert.match(setCookie, /Max-Age=0/);
  const sessionTokenMatch = setCookie.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;,]+)`));
  assert.ok(sessionTokenMatch?.[1]);
  const verifiedSession = await verifySessionToken(decodeURIComponent(sessionTokenMatch[1]));
  assert.equal(verifiedSession?.sub, "student-user-id");
  assertHardenedCallbackResponse(response);
});

test("Google OAuth login survives session reload, logs out, and reuses the same Google identity", async () => {
  const providerSubject = `google-session-flow-${crypto.randomUUID()}`;
  const email = `${providerSubject}@example.test`;
  const curriculumProfile = curriculumProfileForTrack("HK");

  const completeGoogleCallback = async () => {
    const pending = await buildGoogleOAuthAuthorization({
      requestUrl: "https://mais.test/login",
      input: {
        next: "/dashboard",
        role: "student",
        studentAge13OrOlder: true,
        grade: "S4",
        curriculumProfile,
        language: "en",
        theme: "dark"
      }
    });
    assert.equal(pending.status, "redirect");
    if (pending.status !== "redirect") throw new Error("Expected pending Google OAuth state.");

    const state = new URL(pending.authorizationUrl).searchParams.get("state");
    assert.ok(state);

    const response = await handleGoogleOAuthCallback(
      new Request(`https://mais.test/api/auth/google/callback?state=${state}&code=auth-code`, {
        headers: {
          cookie: `${GOOGLE_OAUTH_STATE_COOKIE}=${encodeURIComponent(pending.cookie.value)}`
        }
      }),
      {
        verifyGoogleOAuthState,
        getGoogleOAuthConfig: () => ({
          clientId: "callback-client-id",
          clientSecret: googleClientSecretFixture,
          redirectUri: "https://mais.test/api/auth/google/callback"
        }),
        exchangeGoogleAuthorizationCode: async () => ({ status: "ok", idToken: "verified-id-token" }),
        fetchGoogleJwks: async () => ({ keys: [] }),
        verifyGoogleIdToken: async () => ({
          status: "valid",
          profile: {
            subject: providerSubject,
            email,
            emailVerified: true,
            emailAuthoritative: true,
            name: "Session Flow Student"
          }
        }),
        authenticateGoogleIdentityForLogin,
        setSessionCookie
      }
    );

    assert.equal(response.status, 307);
    assert.equal(new URL(response.headers.get("location") ?? "").pathname, "/dashboard");
    const sessionToken = (response.headers.get("set-cookie") ?? "")
      .match(new RegExp(`${SESSION_COOKIE_NAME}=([^;,]+)`))?.[1];
    assert.ok(sessionToken);
    return decodeURIComponent(sessionToken);
  };

  const { GET: getSessionState } = await import("../../session-state/route");
  const { POST: logout } = await import("../../logout/route");
  const firstSessionToken = await completeGoogleCallback();
  const firstSessionPayload = await verifySessionToken(firstSessionToken);
  assert.ok(firstSessionPayload?.sub);

  for (const phase of ["initial navigation", "browser reload"] as const) {
    const sessionResponse = await getSessionState(
      new Request("https://mais.test/api/auth/session-state?includeLessonEntry=false", {
        headers: { cookie: `${SESSION_COOKIE_NAME}=${firstSessionToken}` }
      })
    );
    assert.equal(sessionResponse.status, 200, phase);
    assert.equal(sessionResponse.headers.get("cache-control"), "no-store", phase);
    const session = await sessionResponse.json();
    assert.equal(session.user.id, firstSessionPayload.sub, phase);
    assert.equal(session.user.email, email, phase);
    assert.equal(session.user.role, "student", phase);
  }

  const logoutResponse = await logout(
    new Request("https://mais.test/api/auth/logout", {
      method: "POST",
      headers: { cookie: `${SESSION_COOKIE_NAME}=${firstSessionToken}` }
    })
  );
  assert.equal(logoutResponse.status, 200);
  assert.equal(logoutResponse.headers.get("cache-control"), "no-store");
  assert.match(logoutResponse.headers.get("set-cookie") ?? "", new RegExp(`${SESSION_COOKIE_NAME}=`));
  assert.match(logoutResponse.headers.get("set-cookie") ?? "", /Max-Age=0/);

  const loggedOutSessionResponse = await getSessionState(
    new Request("https://mais.test/api/auth/session-state?includeLessonEntry=false")
  );
  assert.equal(loggedOutSessionResponse.headers.get("cache-control"), "no-store");
  assert.deepEqual(await loggedOutSessionResponse.json(), { user: null });

  const secondSessionToken = await completeGoogleCallback();
  const secondSessionPayload = await verifySessionToken(secondSessionToken);
  assert.equal(secondSessionPayload?.sub, firstSessionPayload.sub);
});

test("Google OAuth callback never redirects a signed-in user to a backslash network path", async () => {
  const dependencies: GoogleCallbackDependencies = {
    verifyGoogleOAuthState: async () => ({
      status: "valid",
      payload: {
        nonce: "expected-nonce",
        codeVerifier: "test-code-verifier",
        next: "/\\evil.example/post-auth",
        role: "student",
        grade: "S4"
      }
    }),
    getGoogleOAuthConfig: () => ({
      clientId: "callback-client-id",
      clientSecret: googleClientSecretFixture,
      redirectUri: "https://mais.test/api/auth/google/callback"
    }),
    exchangeGoogleAuthorizationCode: async () => ({ status: "ok", idToken: "verified-id-token" }),
    fetchGoogleJwks: async () => ({ keys: [] }),
    verifyGoogleIdToken: async () => ({
      status: "valid",
      profile: {
        subject: "google-subject",
        email: "verified.student@example.test",
        emailVerified: true,
        emailAuthoritative: false
      }
    }),
    authenticateGoogleIdentityForLogin: async () => ({
      status: "authenticated",
      session: { user: { id: "student-user-id", role: "student" } }
    }),
    setSessionCookie: async () => {}
  };

  const response = await handleGoogleOAuthCallback(
    new Request("https://mais.test/api/auth/google/callback?state=valid-state&code=auth-code", {
      headers: { cookie: `${GOOGLE_OAUTH_STATE_COOKIE}=signed-state` }
    }),
    dependencies
  );

  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), "https://mais.test/dashboard");
});

test("Google OAuth callback requires explicit account linking for a non-authoritative email collision", async () => {
  const dependencies: GoogleCallbackDependencies = {
    verifyGoogleOAuthState: async () => ({
      status: "valid",
      payload: {
        nonce: "expected-nonce",
        codeVerifier: "test-code-verifier",
        next: "/dashboard",
        role: "student",
        grade: "S4"
      }
    }),
    getGoogleOAuthConfig: () => ({
      clientId: "callback-client-id",
      clientSecret: googleClientSecretFixture,
      redirectUri: "https://mais.test/api/auth/google/callback"
    }),
    exchangeGoogleAuthorizationCode: async () => ({ status: "ok", idToken: "verified-id-token" }),
    fetchGoogleJwks: async () => ({ keys: [] }),
    verifyGoogleIdToken: async () => ({
      status: "valid",
      profile: {
        subject: "google-subject",
        email: "existing.user@example.test",
        emailVerified: true,
        emailAuthoritative: false
      }
    }),
    authenticateGoogleIdentityForLogin: async () => ({ status: "account-link-required" }),
    setSessionCookie: async () => {
      throw new Error("A blocked account link must not create a session.");
    }
  };

  const response = await handleGoogleOAuthCallback(
    new Request("https://mais.test/api/auth/google/callback?state=valid-state&code=auth-code", {
      headers: { cookie: `${GOOGLE_OAUTH_STATE_COOKIE}=signed-state` }
    }),
    dependencies
  );

  assert.equal(response.status, 307);
  const location = new URL(response.headers.get("location") ?? "");
  assert.equal(location.origin, "https://mais.test");
  assert.equal(location.pathname, "/login");
  assert.equal(location.searchParams.get("googleError"), "account_link_required");
  assert.equal(location.searchParams.get("next"), "/login?googleLink=1");
  assert.match(response.headers.get("set-cookie") ?? "", /Max-Age=0/);
});

test("Google OAuth callback converts provider network failures into a safe terminal login error", async () => {
  const dependencies: GoogleCallbackDependencies = {
    verifyGoogleOAuthState: async () => ({
      status: "valid",
      payload: {
        nonce: "expected-nonce",
        codeVerifier: "test-code-verifier",
        next: "/dashboard",
        role: "student",
        grade: "S4"
      }
    }),
    getGoogleOAuthConfig: () => ({
      clientId: "callback-client-id",
      clientSecret: googleClientSecretFixture,
      redirectUri: "https://mais.test/api/auth/google/callback"
    }),
    exchangeGoogleAuthorizationCode: async () => {
      throw new Error("simulated provider timeout");
    },
    fetchGoogleJwks: async () => ({ keys: [] }),
    verifyGoogleIdToken: async () => ({ status: "invalid" }),
    authenticateGoogleIdentityForLogin: async () => ({ status: "invalid" }),
    setSessionCookie: async () => {
      throw new Error("A provider failure must not create a session.");
    }
  };

  const response = await handleGoogleOAuthCallback(
    new Request("https://mais.test/api/auth/google/callback?state=valid-state&code=auth-code", {
      headers: { cookie: `${GOOGLE_OAUTH_STATE_COOKIE}=signed-state` }
    }),
    dependencies
  );

  assert.equal(response.status, 307);
  const location = new URL(response.headers.get("location") ?? "");
  assert.equal(location.origin, "https://mais.test");
  assert.equal(location.pathname, "/login");
  assert.equal(location.searchParams.get("googleError"), "provider_unavailable");
  assert.match(response.headers.get("set-cookie") ?? "", /Max-Age=0/);
  assert.doesNotMatch(response.headers.get("set-cookie") ?? "", new RegExp(`${SESSION_COOKIE_NAME}=[^;]+`));
});

test("Google OAuth callback validates state before accepting a provider denial", async () => {
  let stateChecks = 0;
  const invalidStateResponse = await handleGoogleOAuthCallback(
    new Request("https://mais.test/api/auth/google/callback?state=attacker-state&error=access_denied", {
      headers: { cookie: `${GOOGLE_OAUTH_STATE_COOKIE}=signed-state` }
    }),
    validDependencies({
      verifyGoogleOAuthState: async () => {
        stateChecks += 1;
        return { status: "invalid" };
      },
      getGoogleOAuthConfig: () => {
        throw new Error("An invalid state must stop before configuration is read.");
      }
    })
  );

  assert.equal(stateChecks, 1);
  assert.equal(new URL(invalidStateResponse.headers.get("location") ?? "").searchParams.get("googleError"), "state_invalid");
  assertHardenedCallbackResponse(invalidStateResponse);

  const validStateResponse = await handleGoogleOAuthCallback(
    new Request("https://mais.test/api/auth/google/callback?state=valid-state&error=access_denied", {
      headers: { cookie: `${GOOGLE_OAUTH_STATE_COOKIE}=signed-state` }
    }),
    validDependencies({
      verifyGoogleOAuthState: async () => {
        stateChecks += 1;
        return {
          status: "valid",
          payload: {
            nonce: "expected-nonce",
            codeVerifier: "test-code-verifier",
            next: "/dashboard",
            role: "student"
          }
        };
      },
      getGoogleOAuthConfig: () => {
        throw new Error("A provider denial must stop before configuration is read.");
      }
    })
  );

  assert.equal(stateChecks, 2);
  assert.equal(new URL(validStateResponse.headers.get("location") ?? "").searchParams.get("googleError"), "provider_denied");
  assertHardenedCallbackResponse(validStateResponse);
});

test("Google OAuth callback converts a state verifier exception into state_invalid", async () => {
  const response = await handleGoogleOAuthCallback(
    new Request("https://mais.test/api/auth/google/callback?state=malformed-state&code=auth-code", {
      headers: { cookie: `${GOOGLE_OAUTH_STATE_COOKIE}=signed-state` }
    }),
    validDependencies({
      verifyGoogleOAuthState: async () => {
        throw new Error("simulated malformed encrypted state");
      }
    })
  );

  assert.equal(response.status, 307);
  assert.equal(new URL(response.headers.get("location") ?? "").searchParams.get("googleError"), "state_invalid");
  assertHardenedCallbackResponse(response);
});

test("Google OAuth callback converts an account-store exception into account_unavailable", async () => {
  const response = await handleGoogleOAuthCallback(
    new Request("https://mais.test/api/auth/google/callback?state=valid-state&code=auth-code", {
      headers: { cookie: `${GOOGLE_OAUTH_STATE_COOKIE}=signed-state` }
    }),
    validDependencies({
      authenticateGoogleIdentityForLogin: async () => {
        throw new Error("simulated account database outage");
      },
      setSessionCookie: async () => {
        throw new Error("An unavailable account must not create a session.");
      }
    })
  );

  assert.equal(response.status, 307);
  assert.equal(new URL(response.headers.get("location") ?? "").searchParams.get("googleError"), "account_unavailable");
  assertHardenedCallbackResponse(response);
  assert.doesNotMatch(response.headers.get("set-cookie") ?? "", new RegExp(`${SESSION_COOKIE_NAME}=[^;]+`));
});

test("Google OAuth callback hardens and clears state on a session-cookie failure", async () => {
  const response = await handleGoogleOAuthCallback(
    new Request("https://mais.test/api/auth/google/callback?state=valid-state&code=auth-code", {
      headers: { cookie: `${GOOGLE_OAUTH_STATE_COOKIE}=signed-state` }
    }),
    validDependencies({
      setSessionCookie: async () => {
        throw new Error("simulated missing session secret");
      }
    })
  );

  assert.equal(response.status, 503);
  assert.equal((await response.json()).code, "session-secret-missing");
  assertHardenedCallbackResponse(response);
  assert.doesNotMatch(response.headers.get("set-cookie") ?? "", new RegExp(`${SESSION_COOKIE_NAME}=[^;]+`));
});

test("Google OAuth callback uses the credential-login default workspace for every role", async () => {
  const cases = [
    { requestedRole: "student" as const, authenticatedRole: "student" as const, next: "/teacher", expected: "/dashboard" },
    { requestedRole: "teacher" as const, authenticatedRole: "teacher" as const, next: "/dashboard", expected: "/teacher/dashboard" },
    { requestedRole: "parent" as const, authenticatedRole: "parent" as const, next: "/dashboard", expected: "/parent" }
  ];

  for (const item of cases) {
    const response = await handleGoogleOAuthCallback(
      new Request("https://mais.test/api/auth/google/callback?state=valid-state&code=auth-code", {
        headers: { cookie: `${GOOGLE_OAUTH_STATE_COOKIE}=signed-state` }
      }),
      validDependencies({
        verifyGoogleOAuthState: async () => ({
          status: "valid",
          payload: {
            nonce: "expected-nonce",
            codeVerifier: "test-code-verifier",
            next: item.next,
            role: item.requestedRole
          }
        }),
        authenticateGoogleIdentityForLogin: async () => ({
          status: "authenticated",
          session: { user: { id: `${item.requestedRole}-user-id`, role: item.authenticatedRole } }
        })
      })
    );

    assert.equal(new URL(response.headers.get("location") ?? "").pathname, item.expected);
    assertHardenedCallbackResponse(response);
  }
});

test("Google OAuth callback passes the start-bound current MAIS user ID to explicit linking", async () => {
  const callOrder: string[] = [];
  let linkedUserId: string | undefined;
  const response = await handleGoogleOAuthCallback(
    new Request("https://mais.test/api/auth/google/callback?state=valid-state&code=auth-code", {
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=existing-session; ${GOOGLE_OAUTH_STATE_COOKIE}=signed-state`
      }
    }),
    validDependencies({
      verifyGoogleOAuthState: async () => ({
        status: "valid",
        payload: {
          nonce: "expected-nonce",
          codeVerifier: "test-code-verifier",
          linkUserId: "teacher-user-at-oauth-start",
          next: "/teacher/dashboard",
          role: "teacher"
        }
      }),
      verifyGoogleIdToken: async () => {
        callOrder.push("verified-google-id");
        return {
          status: "valid",
          profile: {
            subject: "google-teacher-subject",
            email: "teacher@example.test",
            emailVerified: true,
            emailAuthoritative: false
          }
        };
      },
      requireAuthenticatedUser: async (request) => {
        callOrder.push("read-current-session");
        assert.match(request.headers.get("cookie") ?? "", new RegExp(`${SESSION_COOKIE_NAME}=`));
        return { user: { id: "teacher-user-at-oauth-start" } };
      },
      authenticateGoogleIdentityForLogin: async (input) => {
        callOrder.push("link-google-identity");
        linkedUserId = input.authenticatedUserId;
        return {
          status: "linked",
          session: { user: { id: "teacher-user-at-oauth-start", role: "teacher" } }
        };
      }
    })
  );

  assert.deepEqual(callOrder, ["verified-google-id", "read-current-session", "link-google-identity"]);
  assert.equal(linkedUserId, "teacher-user-at-oauth-start");
  assert.equal(new URL(response.headers.get("location") ?? "").pathname, "/teacher/dashboard");
  assertHardenedCallbackResponse(response);
});

test("Google OAuth callback fails closed when the start-bound session is missing or changed", async () => {
  for (const currentUserId of [null, "different-user-at-callback"] as const) {
    let accountStoreCalled = false;
    const response = await handleGoogleOAuthCallback(
      new Request("https://mais.test/api/auth/google/callback?state=valid-state&code=auth-code", {
        headers: { cookie: `${GOOGLE_OAUTH_STATE_COOKIE}=signed-state` }
      }),
      validDependencies({
        verifyGoogleOAuthState: async () => ({
          status: "valid",
          payload: {
            nonce: "expected-nonce",
            codeVerifier: "test-code-verifier",
            linkUserId: "user-at-oauth-start",
            next: "/dashboard",
            role: "student"
          }
        }),
        requireAuthenticatedUser: async () => currentUserId ? { user: { id: currentUserId } } : null,
        authenticateGoogleIdentityForLogin: async () => {
          accountStoreCalled = true;
          return { status: "invalid" };
        }
      })
    );

    assert.equal(accountStoreCalled, false);
    assert.equal(
      new URL(response.headers.get("location") ?? "").searchParams.get("googleError"),
      "account_link_session_changed"
    );
    assertHardenedCallbackResponse(response);
  }
});

test("Google OAuth callback does not treat a callback-only session as an explicit link", async () => {
  let linkedUserId: string | undefined = "not-called";
  const response = await handleGoogleOAuthCallback(
    new Request("https://mais.test/api/auth/google/callback?state=valid-state&code=auth-code", {
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=callback-only-session; ${GOOGLE_OAUTH_STATE_COOKIE}=signed-state`
      }
    }),
    validDependencies({
      requireAuthenticatedUser: async () => ({ user: { id: "callback-only-user" } }),
      authenticateGoogleIdentityForLogin: async (input) => {
        linkedUserId = input.authenticatedUserId;
        return { status: "account-link-required" };
      }
    })
  );

  assert.equal(linkedUserId, undefined);
  const location = new URL(response.headers.get("location") ?? "");
  assert.equal(location.searchParams.get("googleError"), "account_link_required");
  assert.equal(location.searchParams.get("next"), "/login?googleLink=1");
  assertHardenedCallbackResponse(response);
});

test("Google OAuth callback controls current-session lookup failures after Google verification", async () => {
  let accountStoreCalled = false;
  const response = await handleGoogleOAuthCallback(
    new Request("https://mais.test/api/auth/google/callback?state=valid-state&code=auth-code", {
      headers: { cookie: `${GOOGLE_OAUTH_STATE_COOKIE}=signed-state` }
    }),
    validDependencies({
      requireAuthenticatedUser: async () => {
        throw new Error("simulated MAIS session lookup outage");
      },
      authenticateGoogleIdentityForLogin: async () => {
        accountStoreCalled = true;
        return { status: "invalid" };
      }
    })
  );

  assert.equal(accountStoreCalled, false);
  assert.equal(new URL(response.headers.get("location") ?? "").searchParams.get("googleError"), "account_unavailable");
  assertHardenedCallbackResponse(response);
});
