import assert from "node:assert/strict";
import { test } from "node:test";
import { GOOGLE_OAUTH_STATE_COOKIE } from "@/lib/server/googleOAuth";

process.env.AUTH_SESSION_SECRET = crypto.randomUUID().replaceAll("-", "");
process.env.GOOGLE_OAUTH_ENABLED = "true";
process.env.GOOGLE_OAUTH_CLIENT_ID = "route-client-id";
process.env.GOOGLE_OAUTH_CLIENT_SECRET = "route-client-secret";
process.env.GOOGLE_OAUTH_REDIRECT_URI = "https://mais.test/api/auth/google/callback";

test("Google OAuth start route redirects to Google and sets the pending state cookie", async () => {
  const { GET } = await import("./route");
  const response = await GET(new Request("https://mais.test/api/auth/google/start?next=%2Fdashboard&role=student&grade=S4&curriculumTrack=HK&language=en&theme=dark"));

  assert.equal(response.status, 307);
  const location = response.headers.get("location");
  assert.ok(location);
  const redirectUrl = new URL(location);
  assert.equal(redirectUrl.origin, "https://accounts.google.com");
  assert.equal(redirectUrl.searchParams.get("client_id"), "route-client-id");
  assert.equal(redirectUrl.searchParams.get("redirect_uri"), "https://mais.test/api/auth/google/callback");
  assert.equal(redirectUrl.searchParams.get("scope"), "openid email profile");
  assert.match(response.headers.get("set-cookie") ?? "", new RegExp(`${GOOGLE_OAUTH_STATE_COOKIE}=`));
});
