import assert from "node:assert/strict";
import { test } from "node:test";
import { SESSION_COOKIE_NAME } from "@/lib/session";
import {
  buildGoogleOAuthAuthorization,
  GOOGLE_OAUTH_STATE_COOKIE,
  verifyGoogleOAuthState
} from "@/lib/server/googleOAuth";
import { setSessionCookie } from "@/lib/server/sessionCookie";
import { handleGoogleOAuthCallback, type GoogleCallbackDependencies } from "./route";

const authSessionSecretFixture = crypto.randomUUID().replaceAll("-", "");
const googleClientSecretFixture = crypto.randomUUID().replaceAll("-", "");
process.env.AUTH_SESSION_SECRET = authSessionSecretFixture;
process.env.GOOGLE_OAUTH_ENABLED = "true";
process.env.GOOGLE_OAUTH_CLIENT_ID = "callback-client-id";
process.env.GOOGLE_OAUTH_CLIENT_SECRET = googleClientSecretFixture;
process.env.GOOGLE_OAUTH_REDIRECT_URI = "https://mais.test/api/auth/google/callback";

test("Google OAuth callback route fails closed when state is missing", async () => {
  const { GET } = await import("./route");
  const response = await GET(new Request("https://mais.test/api/auth/google/callback?code=abc"));

  assert.equal(response.status, 307);
  const location = response.headers.get("location");
  assert.ok(location);
  assert.equal(new URL(location).pathname, "/login");
  assert.match(new URL(location).searchParams.get("googleError") ?? "", /state/);
});

test("Google OAuth callback sets MAIS session cookie after verified Google identity", async () => {
  const pending = await buildGoogleOAuthAuthorization({
    requestUrl: "https://mais.test/login",
    input: { next: "/teacher", role: "student", grade: "S4", language: "en", theme: "dark" },
    randomBytes: (size: number) => new Uint8Array(size).fill(9)
  });
  assert.equal(pending.status, "redirect");
  if (pending.status !== "redirect") throw new Error("Expected pending Google OAuth state.");

  const state = new URL(pending.authorizationUrl).searchParams.get("state");
  assert.ok(state);

  const calls = {
    exchangedCode: "",
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
    exchangeGoogleAuthorizationCode: async ({ code }) => {
      calls.exchangedCode = code;
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
          name: "Verified Student"
        }
      };
    },
    authenticateGoogleIdentityForLogin: async (input) => {
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
});
