import assert from "node:assert/strict";
import test from "node:test";
import { handleGoogleOAuthCallback, type GoogleCallbackDependencies } from "./handler";

function dependencies(onCookie: (value: string) => void) {
  let providerCalls = 0;
  const mocks: GoogleCallbackDependencies = {
    verifyGoogleOAuthState: async ({ cookieValue }) => { onCookie(cookieValue); return { status: "invalid" }; },
    getGoogleOAuthConfig: () => { providerCalls += 1; return null; },
    exchangeGoogleAuthorizationCode: async () => { providerCalls += 1; return { status: "invalid" }; },
    fetchGoogleJwks: async () => { providerCalls += 1; return null; },
    verifyGoogleIdToken: async () => { providerCalls += 1; return { status: "invalid" }; },
    authenticateGoogleIdentityForLogin: async () => { providerCalls += 1; return { status: "invalid" }; },
    setSessionCookie: async () => { providerCalls += 1; }
  };
  return { mocks, get providerCalls() { return providerCalls; } };
}

test("R33 malformed OAuth state cookie encoding fails as invalid state before provider work", async () => {
  for (const cookieValue of ["%", "%ZZ", "%E0%A4%A"]) {
    const seen: string[] = [];
    const mocks = dependencies((value) => seen.push(value));
    const response = await handleGoogleOAuthCallback(new Request("https://mais.test/api/auth/google/callback?state=synthetic-state&code=synthetic-code", { headers: { cookie: "mais_google_oauth_state=" + cookieValue } }), mocks.mocks);
    const location = new URL(response.headers.get("location")!);
    assert.equal(response.status, 307); assert.equal(location.pathname, "/login");
    assert.equal(location.searchParams.get("googleError"), "state_invalid");
    assert.deepEqual(seen, [""]); assert.equal(mocks.providerCalls, 0);
  }
});

test("R33 malformed unrelated cookies do not affect the following OAuth cookie", async () => {
  for (const prefix of ["unrelated=%", "unrelated=%E0%A4%A", "mais_google_oauth_state_other=%"] ) {
    const seen: string[] = [];
    const mocks = dependencies((value) => seen.push(value));
    const response = await handleGoogleOAuthCallback(new Request("https://mais.test/api/auth/google/callback?state=synthetic-state&code=synthetic-code", { headers: { cookie: prefix + "; mais_google_oauth_state=synthetic%2Ecookie" } }), mocks.mocks);
    assert.deepEqual(seen, ["synthetic.cookie"]);
    assert.equal(response.status, 307); assert.equal(new URL(response.headers.get("location")!).searchParams.get("googleError"), "state_invalid");
    assert.equal(mocks.providerCalls, 0);
  }
});
