import test from "node:test";
import assert from "node:assert/strict";
import {
  aggregateVerdict,
  classifySmokeFailure,
  daysUntil,
  evaluateGooglePublicPageContract,
  evaluateGoogleOAuthCanonicalHandoff,
  evaluateGoogleOAuthStartProbe,
  evaluateStorageReadinessProbe,
  evaluateBudget,
  extractNextAssets,
  formatReportMarkdown,
  GOOGLE_OAUTH_READINESS_PROBE_PARAMETERS,
  parseArgs,
  probeGooglePublicPageContracts
} from "./prod-certification.mjs";

test("production certification requires an explicit durable-storage-ready response", () => {
  assert.deepEqual(
    evaluateStorageReadinessProbe({
      status: 200,
      body: JSON.stringify({ warm: true, storageReady: true, warmedInMs: 17 })
    }),
    { ok: true, detail: "durable shared storage is ready" }
  );

  const unavailable = evaluateStorageReadinessProbe({
    status: 200,
    body: JSON.stringify({ warm: true, storageReady: false, internal: "must-not-leak" })
  });
  assert.equal(unavailable.ok, false);
  assert.match(unavailable.detail, /not ready/i);
  assert.doesNotMatch(unavailable.detail, /must-not-leak/i);

  assert.equal(evaluateStorageReadinessProbe({ status: 401, body: "Unauthorized" }).ok, false);
  assert.equal(evaluateStorageReadinessProbe({ status: 200, body: "not-json" }).ok, false);
});

test("Google public URL contract requires a direct published canonical page", () => {
  const expectedUrl = "https://www.mais.ac/privacy";
  const published = evaluateGooglePublicPageContract({
    expectedUrl,
    kind: "privacy",
    response: {
      status: 200,
      url: expectedUrl,
      headers: new Headers()
    },
    html: [
      '<link rel="canonical" href="https://www.mais.ac/privacy">',
      "Privacy Policy",
      "Google Sign-In data",
      "Google account identifier",
      "openid email profile",
      '<aside data-document-status="published">Published</aside>'
    ].join(" ")
  });
  assert.equal(published.ok, true);

  const redirectedDraft = evaluateGooglePublicPageContract({
    expectedUrl,
    kind: "privacy",
    response: {
      status: 307,
      url: expectedUrl,
      headers: new Headers({ location: "https://www.mais.hk/privacy" })
    },
    html: [
      '<link rel="canonical" href="https://www.mais.hk/privacy">',
      "Privacy Policy",
      "Google Sign-In data",
      "pending legal review"
    ].join(" ")
  });
  assert.equal(redirectedDraft.ok, false);
  assert.match(redirectedDraft.detail, /HTTP status is not 200/i);
  assert.match(redirectedDraft.detail, /redirect Location is present/i);
  assert.match(redirectedDraft.detail, /canonical URL does not match/i);
  assert.match(redirectedDraft.detail, /draft legal marker is still present/i);
});

test("Google public URL probe records direct contract evidence without response headers", async () => {
  const secretCookie = "private-oauth-cookie-value";
  const calls = [];
  const htmlByUrl = new Map([
    [
      "https://www.mais.ac/",
      [
        '<link rel="canonical" href="https://www.mais.ac/">',
        "Mathematics Adaptive Interactive System",
        "Optional Google Sign-In uses",
        '<a href="/privacy">Privacy</a>',
        '<a href="/terms">Terms</a>'
      ].join(" ")
    ],
    [
      "https://www.mais.ac/privacy",
      [
        '<link rel="canonical" href="https://www.mais.ac/privacy">',
        "Privacy Policy",
        "Google Sign-In data",
        "openid email profile",
        '<aside data-document-status="published">Published</aside>'
      ].join(" ")
    ],
    [
      "https://www.mais.ac/terms",
      [
        '<link rel="canonical" href="https://www.mais.ac/terms">',
        "Terms of Service",
        "Optional Google Sign-In",
        '<aside data-document-status="published">Published</aside>'
      ].join(" ")
    ]
  ]);
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), redirect: options?.redirect });
    const body = new TextEncoder().encode(htmlByUrl.get(String(url)) ?? "");
    return {
      status: 200,
      url: String(url),
      headers: new Headers({ "set-cookie": `oauth_state=${secretCookie}` }),
      arrayBuffer: async () => body.buffer
    };
  };

  try {
    const result = await probeGooglePublicPageContracts();
    assert.equal(result.ok, true);
    assert.deepEqual(calls, [
      { url: "https://www.mais.ac/", redirect: "manual" },
      { url: "https://www.mais.ac/privacy", redirect: "manual" },
      { url: "https://www.mais.ac/terms", redirect: "manual" }
    ]);
    assert.deepEqual(
      result.pages.map(({ kind, httpStatus, responseUrl, ok }) => ({ kind, httpStatus, responseUrl, ok })),
      [
        { kind: "homepage", httpStatus: 200, responseUrl: "https://www.mais.ac/", ok: true },
        { kind: "privacy", httpStatus: 200, responseUrl: "https://www.mais.ac/privacy", ok: true },
        { kind: "terms", httpStatus: 200, responseUrl: "https://www.mais.ac/terms", ok: true }
      ]
    );
    assert.equal(JSON.stringify(result).includes(secretCookie), false);
    assert.equal("headers" in result.pages[0], false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Google OAuth start probe verifies the OIDC/PKCE/cookie contract without leaking values", () => {
  const secrets = {
    clientId: "sensitive-client-id",
    cookie: "sensitive-cookie-value",
    nonce: "sensitive-nonce-value",
    state: "sensitive-state-value"
  };
  const location = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  location.search = new URLSearchParams({
    client_id: secrets.clientId,
    code_challenge: "A".repeat(43),
    code_challenge_method: "S256",
    nonce: secrets.nonce,
    redirect_uri: "https://www.mais.ac/api/auth/google/callback",
    response_type: "code",
    scope: "openid email profile",
    state: secrets.state
  }).toString();
  const result = evaluateGoogleOAuthStartProbe({
    status: 307,
    headers: new Headers({
      "cache-control": "no-store",
      location: location.toString(),
      "referrer-policy": "no-referrer",
      "set-cookie": `mais_google_oauth_state=${secrets.cookie}; Path=/; Max-Age=600; HttpOnly; Secure; SameSite=Lax`
    })
  });

  assert.equal(result.ok, true);
  const serialized = JSON.stringify(result);
  for (const secret of Object.values(secrets)) assert.equal(serialized.includes(secret), false);
});

test("deployment URL probe accepts only a hardened canonical handoff without a state cookie", () => {
  const location = new URL("https://www.mais.ac/api/auth/google/start");
  location.search = new URLSearchParams(GOOGLE_OAUTH_READINESS_PROBE_PARAMETERS).toString();
  const result = evaluateGoogleOAuthCanonicalHandoff({
    status: 307,
    headers: new Headers({
      "cache-control": "no-store",
      location: location.toString(),
      "referrer-policy": "no-referrer"
    })
  });

  assert.equal(result.ok, true);
  assert.equal(GOOGLE_OAUTH_READINESS_PROBE_PARAMETERS.role, "parent");
  assert.equal("grade" in GOOGLE_OAUTH_READINESS_PROBE_PARAMETERS, false);
  assert.equal("publisher" in GOOGLE_OAUTH_READINESS_PROBE_PARAMETERS, false);
});

test("Google OAuth start probe failures stay redacted", () => {
  const leakedStateFixture = "must-not-appear-in-report";
  const result = evaluateGoogleOAuthStartProbe({
    status: 307,
    headers: new Headers({
      location: `https://example.invalid/callback?state=${leakedStateFixture}`,
      "set-cookie": `mais_google_oauth_state=${leakedStateFixture}`
    })
  });

  assert.equal(result.ok, false);
  assert.equal(result.detail.includes(leakedStateFixture), false);
  assert.match(result.detail, /authorization endpoint is not Google OIDC/i);
  assert.match(result.detail, /PKCE method is not S256/i);
  assert.match(result.detail, /state cookie is not HttpOnly/i);
});

test("extractNextAssets pulls src and href, dedupes, strips queries, sorts", () => {
  const html = [
    '<script src="/_next/static/chunks/main-app-abc123.js?v=1"></script>',
    '<link href="/_next/static/css/app-def456.css" rel="stylesheet">',
    '<script src="/_next/static/chunks/main-app-abc123.js"></script>',
    '<img src="/images/logo.png">'
  ].join("\n");
  assert.deepEqual(extractNextAssets(html), [
    "/_next/static/chunks/main-app-abc123.js",
    "/_next/static/css/app-def456.css"
  ]);
});

test("evaluateBudget boundaries", () => {
  assert.equal(evaluateBudget(100, 200, 300), "pass");
  assert.equal(evaluateBudget(200, 200, 300), "pass");
  assert.equal(evaluateBudget(201, 200, 300), "warn");
  assert.equal(evaluateBudget(301, 200, 300), "fail");
});

test("aggregateVerdict: P0 fail always fails certification", () => {
  assert.equal(
    aggregateVerdict([
      { severity: "P1", status: "pass" },
      { severity: "P0", status: "fail" }
    ]),
    "FAILED"
  );
});

test("aggregateVerdict: warnings and P1 failures downgrade to findings", () => {
  assert.equal(aggregateVerdict([{ severity: "P0", status: "pass" }]), "CERTIFIED");
  assert.equal(
    aggregateVerdict([
      { severity: "P0", status: "pass" },
      { severity: "P1", status: "warn" }
    ]),
    "CERTIFIED_WITH_FINDINGS"
  );
  assert.equal(
    aggregateVerdict([
      { severity: "P0", status: "pass" },
      { severity: "P1", status: "fail" }
    ]),
    "CERTIFIED_WITH_FINDINGS"
  );
});

test("aggregateVerdict: a skipped P0 check cannot certify cleanly", () => {
  assert.equal(
    aggregateVerdict([
      { severity: "P0", status: "pass" },
      { severity: "P0", status: "skip" }
    ]),
    "CERTIFIED_WITH_FINDINGS"
  );
});

test("classifySmokeFailure separates network-layer failures from real ones", () => {
  assert.equal(classifySmokeFailure("Error: request-timeout after 30000ms"), "environmental");
  assert.equal(classifySmokeFailure("TypeError: fetch failed\n  cause: ECONNRESET"), "environmental");
  assert.equal(classifySmokeFailure("FAIL dashboard: p95=9000ms threshold=6000ms status=200"), "real");
});

test("daysUntil is positive for future dates and negative for past ones", () => {
  assert.ok(daysUntil(new Date(Date.now() + 30 * 86_400_000).toISOString()) > 29);
  assert.ok(daysUntil(new Date(Date.now() - 86_400_000).toISOString()) < 0);
});

test("formatReportMarkdown includes verdict, counts, and escapes pipes", () => {
  const markdown = formatReportMarkdown({
    verdict: "CERTIFIED_WITH_FINDINGS",
    generatedAt: "2026-07-26T00:00:00.000Z",
    domains: ["https://www.mais.ac"],
    writeFootprint: "none (read-only run)",
    results: [
      { id: "home-availability", severity: "P0", status: "pass", domain: "https://www.mais.ac", detail: "HTTP 200 | fast" }
    ]
  });
  assert.match(markdown, /Production certification — CERTIFIED_WITH_FINDINGS/);
  assert.match(markdown, /pass 1, warn 0, fail 0, skip 0/);
  assert.match(markdown, /HTTP 200 \\\| fast/);
});

test("parseArgs handles flags and rejects unknown arguments", () => {
  assert.deepEqual(parseArgs(["--json", "--skip-smokes", "--out", "/tmp/x"]), {
    json: true,
    strict: false,
    skipSmokes: true,
    skipBrowser: false,
    out: "/tmp/x"
  });
  assert.throws(() => parseArgs(["--nope"]), /Unknown argument/);
});
