import assert from "node:assert/strict";
import { test } from "node:test";
import { curriculumProfileForTrack } from "@/lib/curriculumProfile";
import {
  GOOGLE_OAUTH_LINK_REAUTH_COOKIE,
  GOOGLE_OAUTH_STATE_COOKIE,
  verifyGoogleOAuthState
} from "@/lib/server/googleOAuth";

process.env.AUTH_SESSION_SECRET = crypto.randomUUID().replaceAll("-", "");
process.env.GOOGLE_OAUTH_ENABLED = "true";
process.env.GOOGLE_OAUTH_CLIENT_ID = "route-client-id";
process.env.GOOGLE_OAUTH_CLIENT_SECRET = "route-client-secret";
process.env.GOOGLE_OAUTH_REDIRECT_URI = "https://mais.test/api/auth/google/callback";

function confirmedStudentPost(query: string, origin = "https://mais.test") {
  const body = new URLSearchParams(query);
  body.set("setupConfirmed", "true");
  body.set("studentAge13OrOlder", "true");
  return new Request(`${origin}/api/auth/google/start`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      origin
    },
    body
  });
}

function authenticatedSession(
  id: string,
  role: "student" | "teacher" | "parent" | "admin",
  grade: "P1" | "S4" = "S4"
) {
  return {
    user: {
      id,
      role,
      grade,
      curriculumProfile: curriculumProfileForTrack("HK")
    }
  };
}

test("Google OAuth start accepts a same-origin confirmed student POST and sets pending state", async () => {
  const { POST } = await import("./route");
  const response = await POST(confirmedStudentPost(
    "next=%2Fdashboard&role=student&grade=S4&curriculumTrack=HK&publisher=HK_UNITED_PRIME_MIA&language=en&theme=dark"
  ));

  assert.equal(response.status, 303);
  const location = response.headers.get("location");
  assert.ok(location);
  const redirectUrl = new URL(location);
  assert.equal(redirectUrl.origin, "https://accounts.google.com");
  assert.equal(redirectUrl.searchParams.get("client_id"), "route-client-id");
  assert.equal(redirectUrl.searchParams.get("redirect_uri"), "https://mais.test/api/auth/google/callback");
  assert.equal(redirectUrl.searchParams.get("scope"), "openid email profile");
  assert.match(response.headers.get("set-cookie") ?? "", new RegExp(`${GOOGLE_OAUTH_STATE_COOKIE}=`));
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
});

test("Google OAuth start rejects direct GET bypass of first-time student confirmation", async () => {
  const { GET } = await import("./route");
  const response = await GET(new Request(
    "https://mais.test/api/auth/google/start?role=student&grade=S4&publisher=HK_UNITED_PRIME_MIA"
  ));

  assert.equal(response.status, 307);
  const location = new URL(response.headers.get("location") ?? "");
  assert.equal(location.pathname, "/login");
  assert.equal(location.searchParams.get("googleError"), "student_setup_required");
  assert.doesNotMatch(response.headers.get("set-cookie") ?? "", new RegExp(`${GOOGLE_OAUTH_STATE_COOKIE}=`));
});

test("Google OAuth start rejects a same-origin student POST without explicit confirmation", async () => {
  const { POST } = await import("./route");
  const body = new URLSearchParams({
    role: "student",
    grade: "S4",
    publisher: "HK_UNITED_PRIME_MIA",
    setupConfirmed: "false"
  });
  const response = await POST(new Request("https://mais.test/api/auth/google/start", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      origin: "https://mais.test"
    },
    body
  }));

  assert.equal(response.status, 303);
  const location = new URL(response.headers.get("location") ?? "");
  assert.equal(location.pathname, "/login");
  assert.equal(location.searchParams.get("googleError"), "student_setup_required");
  assert.doesNotMatch(response.headers.get("set-cookie") ?? "", new RegExp(`${GOOGLE_OAUTH_STATE_COOKIE}=`));
});

test("Google OAuth start rejects a student POST without a 13-plus authorization attestation", async () => {
  const { POST } = await import("./route");
  const body = new URLSearchParams({
    role: "student",
    grade: "S4",
    publisher: "HK_UNITED_PRIME_MIA",
    setupConfirmed: "true",
    studentAge13OrOlder: "false"
  });
  const response = await POST(new Request("https://mais.test/api/auth/google/start", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      origin: "https://mais.test"
    },
    body
  }));

  assert.equal(response.status, 303);
  const location = new URL(response.headers.get("location") ?? "");
  assert.equal(location.pathname, "/login");
  assert.equal(location.searchParams.get("googleError"), "student_age_authorization_required");
  assert.doesNotMatch(response.headers.get("set-cookie") ?? "", new RegExp(`${GOOGLE_OAUTH_STATE_COOKIE}=`));
});

test("Google OAuth start rejects cross-origin student confirmation posts", async () => {
  const { POST } = await import("./route");
  const body = new URLSearchParams({
    role: "student",
    grade: "S4",
    publisher: "HK_UNITED_PRIME_MIA",
    setupConfirmed: "true"
  });
  const response = await POST(new Request("https://mais.test/api/auth/google/start", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      origin: "https://attacker.test"
    },
    body
  }));

  assert.equal(response.status, 403);
  assert.equal(response.headers.get("location"), null);
  assert.doesNotMatch(response.headers.get("set-cookie") ?? "", new RegExp(`${GOOGLE_OAUTH_STATE_COOKIE}=`));
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("Google OAuth start route moves alias-host requests to the configured callback origin before setting state", async () => {
  const previousRedirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;
  process.env.GOOGLE_OAUTH_REDIRECT_URI = "https://www.mais.ac/api/auth/google/callback";

  try {
    const { GET } = await import("./route");
    const response = await GET(new Request(
      "https://www.mais.hk/api/auth/google/start?next=%2Fparent&role=parent&language=en&theme=dark"
    ));

    assert.equal(response.status, 307);
    const location = response.headers.get("location");
    assert.ok(location);
    const redirectUrl = new URL(location);
    assert.equal(redirectUrl.origin, "https://www.mais.ac");
    assert.equal(redirectUrl.pathname, "/api/auth/google/start");
    assert.equal(redirectUrl.searchParams.get("next"), "/parent");
    assert.equal(response.headers.get("set-cookie"), null);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(response.headers.get("referrer-policy"), "no-referrer");
  } finally {
    if (previousRedirectUri === undefined) delete process.env.GOOGLE_OAUTH_REDIRECT_URI;
    else process.env.GOOGLE_OAUTH_REDIRECT_URI = previousRedirectUri;
  }
});

test("confirmed new-student setup on an alias must be repeated on the canonical host", async () => {
  const previousRedirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;
  process.env.GOOGLE_OAUTH_REDIRECT_URI = "https://www.mais.ac/api/auth/google/callback";

  try {
    const { POST } = await import("./route");
    const response = await POST(confirmedStudentPost(
      "role=student&grade=S4&publisher=HK_UNITED_PRIME_MIA",
      "https://www.mais.hk"
    ));

    assert.equal(response.status, 303);
    const location = new URL(response.headers.get("location") ?? "");
    assert.equal(location.origin, "https://www.mais.ac");
    assert.equal(location.pathname, "/login");
    assert.equal(location.searchParams.get("googleError"), "student_setup_required");
    assert.doesNotMatch(response.headers.get("set-cookie") ?? "", new RegExp(`${GOOGLE_OAUTH_STATE_COOKIE}=`));
  } finally {
    if (previousRedirectUri === undefined) delete process.env.GOOGLE_OAUTH_REDIRECT_URI;
    else process.env.GOOGLE_OAUTH_REDIRECT_URI = previousRedirectUri;
  }
});

test("Google OAuth start route preserves the exact selected textbook publisher in signed state", async () => {
  const { POST } = await import("./route");
  const response = await POST(confirmedStudentPost(
    "role=student&grade=S2&curriculumTrack=MAINLAND_PEP_HIGH&publisher=MAINLAND_BNU&language=zh-Hans&theme=light"
  ));

  assert.equal(response.status, 303);
  const location = response.headers.get("location");
  assert.ok(location);
  const state = new URL(location).searchParams.get("state");
  assert.ok(state);
  const stateCookie = (response.headers.get("set-cookie") ?? "")
    .split(";")[0]
    ?.slice(`${GOOGLE_OAUTH_STATE_COOKIE}=`.length);
  assert.ok(stateCookie);

  const verified = await verifyGoogleOAuthState({
    state,
    cookieValue: decodeURIComponent(stateCookie)
  });
  assert.equal(verified.status, "valid");
  if (verified.status !== "valid") throw new Error("Expected valid Google OAuth state.");
  assert.equal(verified.payload.curriculumProfile?.publisher, "MAINLAND_BNU");
  assert.equal(verified.payload.grade, "S2");
});

test("Google OAuth start route rejects an incomplete student setup before contacting Google", async () => {
  const { GET } = await import("./route");
  const response = await GET(new Request(
    "https://mais.test/api/auth/google/start?role=student&grade=S4&language=en&theme=dark"
  ));

  assert.equal(response.status, 307);
  const location = new URL(response.headers.get("location") ?? "");
  assert.equal(location.origin, "https://mais.test");
  assert.equal(location.pathname, "/login");
  assert.equal(location.searchParams.get("googleError"), "student_setup_required");
  assert.equal(response.headers.get("set-cookie"), null);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
});

test("Google OAuth start rejects crafted hidden curricula and age-ineligible grades for new students", async () => {
  const { POST } = await import("./route");
  for (const [query, expectedError] of [
    ["role=student&grade=K&curriculumTrack=US_CA_MATH&publisher=US_CA_MATH", "student_age_authorization_required"],
    ["role=student&grade=S4&curriculumTrack=US_NC_MATH", "student_setup_required"],
    ["role=student&grade=S4&curriculumTrack=US_CA_MATH&publisher=US_NC_MATH", "student_setup_required"]
  ] as const) {
    const response = await POST(confirmedStudentPost(query));
    const location = new URL(response.headers.get("location") ?? "");
    assert.equal(location.pathname, "/login", query);
    assert.equal(location.searchParams.get("googleError"), expectedError, query);
    assert.equal(response.headers.get("set-cookie"), null, query);
  }
});

test("Google OAuth start uses the saved Student role and grade before contacting Google", async () => {
  const { handleGoogleOAuthStart } = await import("./handler");
  for (const forgedQuery of [
    "role=teacher&grade=S4&publisher=HK_UNITED_PRIME_MIA",
    "role=student&grade=S4&publisher=HK_UNITED_PRIME_MIA"
  ]) {
    let reauthChecks = 0;
    const response = await handleGoogleOAuthStart(
      new Request(`https://mais.test/api/auth/google/start?${forgedQuery}`, {
        headers: { cookie: `${GOOGLE_OAUTH_LINK_REAUTH_COOKIE}=valid-reauth-marker` }
      }),
      {
        requireAuthenticatedUser: async () => authenticatedSession("saved-p1-student", "student", "P1"),
        verifyGoogleOAuthLinkReauth: async () => {
          reauthChecks += 1;
          return { status: "valid" };
        }
      },
      { studentAge13OrOlder: true }
    );

    assert.equal(reauthChecks, 0, forgedQuery);
    const location = new URL(response.headers.get("location") ?? "");
    assert.equal(location.origin, "https://mais.test", forgedQuery);
    assert.equal(location.pathname, "/login", forgedQuery);
    assert.equal(location.searchParams.get("googleError"), "student_age_authorization_required", forgedQuery);
    assert.doesNotMatch(response.headers.get("set-cookie") ?? "", new RegExp(`${GOOGLE_OAUTH_STATE_COOKIE}=`));
  }
});

test("Google OAuth start locks an eligible signed-in Student transaction to the saved role and learning setup", async () => {
  const { handleGoogleOAuthStart } = await import("./handler");
  const response = await handleGoogleOAuthStart(
    new Request(
      "https://mais.test/api/auth/google/start?role=parent&grade=P1&publisher=US_CA_MATH&next=%2Fdashboard",
      { headers: { cookie: `${GOOGLE_OAUTH_LINK_REAUTH_COOKIE}=valid-reauth-marker` } }
    ),
    {
      requireAuthenticatedUser: async () => authenticatedSession("saved-s4-student", "student", "S4"),
      verifyGoogleOAuthLinkReauth: async () => ({ status: "valid" })
    },
    { studentAge13OrOlder: true }
  );

  assert.equal(response.status, 307);
  const location = new URL(response.headers.get("location") ?? "");
  assert.equal(location.origin, "https://accounts.google.com");
  const state = location.searchParams.get("state");
  assert.ok(state);
  const stateCookie = (response.headers.get("set-cookie") ?? "")
    .split(";")[0]
    ?.slice(`${GOOGLE_OAUTH_STATE_COOKIE}=`.length);
  assert.ok(stateCookie);
  const verified = await verifyGoogleOAuthState({ state, cookieValue: decodeURIComponent(stateCookie) });
  assert.equal(verified.status, "valid");
  if (verified.status !== "valid") throw new Error("Expected a valid saved-student state.");
  assert.equal(verified.payload.role, "student");
  assert.equal(verified.payload.grade, "S4");
  assert.equal(verified.payload.curriculumProfile?.publisher, "HK_MODERN_EDUCATIONAL_RESEARCH_SOCIETY");
});

test("Google OAuth start binds an authenticated MAIS user into encrypted state", async () => {
  const { handleGoogleOAuthStart } = await import("./handler");
  const response = await handleGoogleOAuthStart(
    new Request("https://mais.test/api/auth/google/start?role=teacher&next=%2Fteacher%2Fdashboard", {
      headers: { cookie: `${GOOGLE_OAUTH_LINK_REAUTH_COOKIE}=valid-reauth-marker` }
    }),
    {
      requireAuthenticatedUser: async () => authenticatedSession("teacher-user-at-oauth-start", "teacher"),
      verifyGoogleOAuthLinkReauth: async ({ cookieValue, userId }) => {
        assert.equal(cookieValue, "valid-reauth-marker");
        assert.equal(userId, "teacher-user-at-oauth-start");
        return { status: "valid" };
      }
    }
  );

  assert.equal(response.status, 307);
  const location = response.headers.get("location");
  assert.ok(location);
  const state = new URL(location).searchParams.get("state");
  assert.ok(state);
  const stateCookie = (response.headers.get("set-cookie") ?? "")
    .split(";")[0]
    ?.slice(`${GOOGLE_OAUTH_STATE_COOKIE}=`.length);
  assert.ok(stateCookie);
  const verified = await verifyGoogleOAuthState({
    state,
    cookieValue: decodeURIComponent(stateCookie)
  });
  assert.equal(verified.status, "valid");
  if (verified.status !== "valid") throw new Error("Expected valid Google OAuth state.");
  assert.equal(verified.payload.linkUserId, "teacher-user-at-oauth-start");
  assert.equal(verified.payload.role, "teacher");
  assert.equal(verified.payload.grade, undefined);
  assert.equal(verified.payload.curriculumProfile, undefined);
  assert.equal(verified.payload.studentAge13OrOlder, undefined);
});

test("Google OAuth start requires a fresh password marker before binding an active session", async () => {
  const { handleGoogleOAuthStart } = await import("./handler");
  const response = await handleGoogleOAuthStart(
    new Request("https://mais.test/api/auth/google/start?role=teacher&next=%2Fteacher%2Fdashboard"),
    {
      requireAuthenticatedUser: async () => authenticatedSession("teacher-needs-step-up", "teacher"),
      verifyGoogleOAuthLinkReauth: async () => ({ status: "invalid" })
    }
  );

  assert.equal(response.status, 307);
  const location = new URL(response.headers.get("location") ?? "");
  assert.equal(location.origin, "https://mais.test");
  assert.equal(location.pathname, "/login");
  assert.equal(location.searchParams.get("googleError"), "reauth_required");
  assert.equal(location.searchParams.get("next"), "/login?googleLink=1");
  assert.doesNotMatch(response.headers.get("set-cookie") ?? "", new RegExp(`${GOOGLE_OAUTH_STATE_COOKIE}=`));
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
});

test("Google OAuth linking reauthenticates on the canonical host instead of transferring an alias session", async () => {
  const previousRedirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;
  process.env.GOOGLE_OAUTH_REDIRECT_URI = "https://www.mais.ac/api/auth/google/callback";

  try {
    const { handleGoogleOAuthStart } = await import("./handler");
    const response = await handleGoogleOAuthStart(
      new Request("https://www.mais.hk/api/auth/google/start?role=parent&next=%2Fparent", {
        headers: { cookie: `${GOOGLE_OAUTH_LINK_REAUTH_COOKIE}=alias-only-marker` }
      }),
      {
        requireAuthenticatedUser: async () => authenticatedSession("parent-on-alias", "parent"),
        verifyGoogleOAuthLinkReauth: async () => ({ status: "valid" })
      }
    );

    assert.equal(response.status, 307);
    const location = new URL(response.headers.get("location") ?? "");
    assert.equal(location.origin, "https://www.mais.ac");
    assert.equal(location.pathname, "/login");
    assert.equal(location.searchParams.get("googleError"), "canonical_reauth_required");
    assert.equal(location.searchParams.get("next"), "/login?googleLink=1");
    assert.doesNotMatch(response.headers.get("set-cookie") ?? "", new RegExp(`${GOOGLE_OAUTH_STATE_COOKIE}=`));
  } finally {
    if (previousRedirectUri === undefined) delete process.env.GOOGLE_OAUTH_REDIRECT_URI;
    else process.env.GOOGLE_OAUTH_REDIRECT_URI = previousRedirectUri;
  }
});

test("Google OAuth start omits linkUserId without a session and ignores query-string injection", async () => {
  const { handleGoogleOAuthStart } = await import("./handler");
  const response = await handleGoogleOAuthStart(
    new Request(
      "https://mais.test/api/auth/google/start?role=parent&next=%2Fparent&linkUserId=attacker-selected-user"
    ),
    { requireAuthenticatedUser: async () => null }
  );

  assert.equal(response.status, 307);
  const location = response.headers.get("location");
  assert.ok(location);
  const state = new URL(location).searchParams.get("state");
  assert.ok(state);
  const stateCookie = (response.headers.get("set-cookie") ?? "")
    .split(";")[0]
    ?.slice(`${GOOGLE_OAUTH_STATE_COOKIE}=`.length);
  assert.ok(stateCookie);
  const verified = await verifyGoogleOAuthState({
    state,
    cookieValue: decodeURIComponent(stateCookie)
  });
  assert.equal(verified.status, "valid");
  if (verified.status !== "valid") throw new Error("Expected valid Google OAuth state.");
  assert.equal(verified.payload.linkUserId, undefined);
});

test("Google OAuth start fails closed when the current MAIS session cannot be read", async () => {
  const { handleGoogleOAuthStart } = await import("./handler");
  const response = await handleGoogleOAuthStart(
    new Request("https://mais.test/api/auth/google/start?role=parent&next=%2Fparent"),
    {
      requireAuthenticatedUser: async () => {
        throw new Error("simulated session store outage");
      }
    }
  );

  assert.equal(response.status, 307);
  const location = new URL(response.headers.get("location") ?? "");
  assert.equal(location.pathname, "/login");
  assert.equal(location.searchParams.get("googleError"), "account_unavailable");
  assert.equal(response.headers.get("set-cookie"), null);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
});
