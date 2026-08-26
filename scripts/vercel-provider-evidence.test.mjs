import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import {
  APPROVED_PRODUCTION_ORIGINS,
  APPROVED_VERCEL_PROJECT_ID,
  APPROVED_VERCEL_PROJECT_NAME,
  APPROVED_VERCEL_TEAM_ID,
  APPROVED_VERCEL_TEAM_SLUG,
  canonicalVercelDeploymentOrigin,
  fetchVercelApiJson,
  providerRetryDelayMs,
  readCurrentVercelProductionDeployment,
  readVercelProductionAliasBindings,
  readVercelToken,
  validateCurrentVercelProductionDeployments,
  validateVercelProductionAliasBindings,
  validateVercelDeploymentIdentity,
  validateVercelProductionAliases,
  verifyVercelProviderDeployment
} from "./vercel-provider-evidence.mjs";

const candidateSha = "a".repeat(40);
const sourceTreeObject = "b".repeat(40);
const deploymentId = "dpl_ProviderEvidenceFixture123";
const deploymentUrl = "https://mais-fixture.vercel.app";
const token = "fixture-vercel-token-not-real-123456789";

function digest(algorithm, bytes) {
  return createHash(algorithm).update(bytes).digest("hex");
}

function providerFixture({ sourceContents = "export default 1;\n" } = {}) {
  const sourceBytes = Buffer.from(sourceContents);
  const file = {
    path: "app/page.tsx",
    mode: "100644",
    size: sourceBytes.length,
    rawSha1: digest("sha1", sourceBytes),
    sha256: digest("sha256", sourceBytes),
    gitBlobOid: createHash("sha1")
      .update(Buffer.from(`blob ${sourceBytes.length}\0`))
      .update(sourceBytes)
      .digest("hex")
  };
  const canonical = `${JSON.stringify([
    file.path,
    file.mode,
    file.size,
    file.rawSha1,
    file.sha256,
    file.gitBlobOid
  ])}\n`;
  const manifest = {
    schemaVersion: 2,
    candidateSha,
    sourceTreeObject,
    objectFormat: "sha1",
    sourceManifestAlgorithm: "sha256-canonical-json-lines-v2",
    sourceManifestRoot: digest("sha256", Buffer.from(canonical)),
    trackedEntryCount: 1,
    fileCount: 1,
    totalBytes: sourceBytes.length,
    files: [file]
  };
  const manifestBytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`);
  const manifestRawSha1 = digest("sha1", manifestBytes);
  const filesPayload = [{
    name: "src",
    type: "directory",
    children: [
      { name: "app", type: "directory", children: [
        { name: "page.tsx", type: "file", mode: 33188, uid: file.rawSha1 }
      ] },
      { name: "vercel-staging-manifest.json", type: "file", mode: 33188, uid: manifestRawSha1 }
    ]
  }, { name: "out", type: "directory", children: [] }];
  const payload = {
    id: deploymentId,
    url: "mais-fixture.vercel.app",
    readyState: "READY",
    target: "production",
    projectId: APPROVED_VERCEL_PROJECT_ID,
    project: { id: APPROVED_VERCEL_PROJECT_ID, name: APPROVED_VERCEL_PROJECT_NAME },
    ownerId: APPROVED_VERCEL_TEAM_ID,
    team: { id: APPROVED_VERCEL_TEAM_ID, slug: APPROVED_VERCEL_TEAM_SLUG },
    source: "cli",
    meta: { maisCandidateSha: candidateSha }
  };
  return {
    file,
    filesPayload,
    manifestBytes,
    manifestRawSha1,
    payload,
    sourceBytes,
    expectedStaging: {
      candidateSha,
      sourceTreeObject,
      objectFormat: "sha1",
      sourceManifestRoot: manifest.sourceManifestRoot,
      trackedEntryCount: 1,
      fileCount: 1,
      totalBytes: sourceBytes.length,
      manifestRawSha1,
      manifestSha256: digest("sha256", manifestBytes)
    }
  };
}

function jsonResponse(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" }
  });
}

test("deployment and alias canonicalizers reject credentials, ports, and non-Vercel hosts", () => {
  assert.equal(canonicalVercelDeploymentOrigin(deploymentUrl), deploymentUrl);
  assert.equal(canonicalVercelDeploymentOrigin("https://user:pass@mais-fixture.vercel.app"), null);
  assert.equal(canonicalVercelDeploymentOrigin("https://mais-fixture.vercel.app:444"), null);
  assert.equal(canonicalVercelDeploymentOrigin("https://www.mais.ac"), null);

  assert.deepEqual(validateVercelProductionAliases({ aliases: ["www.mais.ac", "www.mais.hk"] }), [
    ...APPROVED_PRODUCTION_ORIGINS
  ]);
  assert.throws(
    () => validateVercelProductionAliases({
      aliases: ["https://owner:password@www.mais.ac:444/", "https://www.mais.hk:8443/"]
    }),
    /exact production aliases/i
  );
});

test("deployment identity is bound to exact team, project, source, target, and SHA-256 evidence", () => {
  const fixture = providerFixture();
  const sourcePackageEvidence = {
    verified: true,
    candidateSha,
    sourceManifestRoot: fixture.expectedStaging.sourceManifestRoot,
    contentSha256Verified: true,
    fileModesVerified: true
  };
  assert.equal(validateVercelDeploymentIdentity({
    candidateSha,
    deploymentId,
    deploymentUrl,
    payload: fixture.payload,
    sourcePackageEvidence,
    target: "production"
  }).projectId, APPROVED_VERCEL_PROJECT_ID);

  for (const changed of [
    { projectId: "prj_wrong" },
    { ownerId: "team_wrong" },
    { source: "git" },
    { meta: { maisCandidateSha: "c".repeat(40) } }
  ]) {
    assert.throws(() => validateVercelDeploymentIdentity({
      candidateSha,
      deploymentId,
      deploymentUrl,
      payload: { ...fixture.payload, ...changed },
      sourcePackageEvidence,
      target: "production"
    }), /identity/i);
  }
});

test("current production aliases must resolve to one exact approved deployment", async () => {
  const fixture = providerFixture();
  const aliasPayload = {
    ...fixture.payload,
    id: "dpl_CurrentProductionFixture123",
    url: "current-production-fixture.vercel.app"
  };
  assert.equal(
    validateCurrentVercelProductionDeployments([aliasPayload, aliasPayload]).deploymentId,
    aliasPayload.id
  );
  assert.throws(
    () => validateCurrentVercelProductionDeployments([
      aliasPayload,
      { ...aliasPayload, id: "dpl_DifferentProductionFixture123" }
    ]),
    /did not share one deployment/i
  );

  const requests = [];
  const evidence = await readCurrentVercelProductionDeployment({
    token,
    fetchImpl: async (url, options) => {
      requests.push({ url, options });
      return jsonResponse(aliasPayload);
    }
  });
  assert.equal(evidence.deploymentId, aliasPayload.id);
  assert.deepEqual(
    requests.map(({ url }) => new URL(url).pathname),
    [
      "/v13/deployments/www.mais.ac",
      "/v13/deployments/www.mais.hk"
    ]
  );
  for (const request of requests) {
    assert.equal(request.options.method, "GET");
    assert.equal(request.options.redirect, "error");
    assert.equal(new URL(request.url).searchParams.get("teamId"), APPROVED_VERCEL_TEAM_ID);
  }
});

test("production alias bindings preserve each exact alias during a split promotion", async () => {
  const fixture = providerFixture();
  const previousPayload = {
    ...fixture.payload,
    id: "dpl_PreviousProductionFixture123",
    url: "previous-production-fixture.vercel.app"
  };
  const candidatePayload = {
    ...fixture.payload,
    id: "dpl_CandidateProductionFixture123",
    url: "candidate-production-fixture.vercel.app"
  };
  const expected = validateVercelProductionAliasBindings([
    previousPayload,
    candidatePayload
  ]);
  assert.deepEqual(expected.map(({ origin, deploymentId }) => ({ origin, deploymentId })), [
    { origin: "https://www.mais.ac", deploymentId: previousPayload.id },
    { origin: "https://www.mais.hk", deploymentId: candidatePayload.id }
  ]);

  let requestCount = 0;
  const bindings = await readVercelProductionAliasBindings({
    token,
    fetchImpl: async () => {
      requestCount += 1;
      return jsonResponse(requestCount === 1 ? previousPayload : candidatePayload);
    }
  });
  assert.deepEqual(bindings, expected);
});

test("provider verifier reads every source file, validates SHA-256, and binds exact aliases", async () => {
  const fixture = providerFixture();
  const requests = [];
  const fetchImpl = async (url, options) => {
    requests.push({ url, options });
    const pathname = new URL(url).pathname;
    if (pathname === `/v13/deployments/${deploymentId}`) return jsonResponse(fixture.payload);
    if (pathname === `/v6/deployments/${deploymentId}/files`) return jsonResponse(fixture.filesPayload);
    if (pathname === `/v2/deployments/${deploymentId}/aliases`) {
      return jsonResponse({ aliases: ["www.mais.ac", "www.mais.hk"] });
    }
    if (pathname.endsWith(`/files/${fixture.manifestRawSha1}`)) {
      return jsonResponse({ data: fixture.manifestBytes.toString("base64") });
    }
    if (pathname.endsWith(`/files/${fixture.file.rawSha1}`)) {
      return jsonResponse({ data: fixture.sourceBytes.toString("base64") });
    }
    return jsonResponse({}, 404);
  };

  const evidence = await verifyVercelProviderDeployment({
    candidateSha,
    deploymentId,
    deploymentUrl,
    expectedStaging: fixture.expectedStaging,
    fetchImpl,
    requireProductionAliases: true,
    target: "production",
    token
  });
  assert.equal(evidence.sourcePackageEvidence.contentSha256Verified, true);
  assert.deepEqual(evidence.productionAliases, [...APPROVED_PRODUCTION_ORIGINS]);
  assert.equal(requests.filter(({ url }) => new URL(url).pathname.startsWith("/v8/")).length, 2);
  for (const request of requests) {
    assert.equal(new URL(request.url).origin, "https://api.vercel.com");
    assert.equal(new URL(request.url).searchParams.get("teamId"), APPROVED_VERCEL_TEAM_ID);
    assert.equal(request.options.method, "GET");
    assert.equal(request.options.redirect, "error");
    assert.equal(request.options.headers.authorization, `Bearer ${token}`);
  }
});

test("provider verifier fails when read-back source content changes", async () => {
  const fixture = providerFixture();
  const fetchImpl = async (url) => {
    const pathname = new URL(url).pathname;
    if (pathname === `/v13/deployments/${deploymentId}`) return jsonResponse(fixture.payload);
    if (pathname === `/v6/deployments/${deploymentId}/files`) return jsonResponse(fixture.filesPayload);
    if (pathname.endsWith(`/files/${fixture.manifestRawSha1}`)) {
      return jsonResponse({ data: fixture.manifestBytes.toString("base64") });
    }
    if (pathname.endsWith(`/files/${fixture.file.rawSha1}`)) {
      return jsonResponse({ data: Buffer.from("different bytes\n").toString("base64") });
    }
    return jsonResponse({ aliases: [] });
  };
  await assert.rejects(
    verifyVercelProviderDeployment({
      candidateSha,
      deploymentId,
      deploymentUrl,
      expectedStaging: fixture.expectedStaging,
      fetchImpl,
      target: "production",
      token
    }),
    /content|encoding/i
  );
});

test("Vercel credential loader uses only a valid environment token or fixed CLI auth payload", async () => {
  assert.equal(await readVercelToken({ env: { VERCEL_TOKEN: token } }), token);
  const calls = [];
  const loaded = await readVercelToken({
    env: {},
    homeDirectory: "/fixed-home",
    readFile: async (candidate) => {
      calls.push(candidate);
      if (candidate.endsWith("auth.json")) return JSON.stringify({ token });
      throw new Error("missing");
    }
  });
  assert.equal(loaded, token);
  assert.ok(calls[0].startsWith("/fixed-home/"));
});

test("provider GET respects bounded Retry-After for 429 without leaking response details", async () => {
  let attempts = 0;
  const delays = [];
  const value = await fetchVercelApiJson(
    "https://api.vercel.com/v13/deployments/dpl_RetryFixture123?teamId=team_fixture",
    token,
    {
      fetchImpl: async () => {
        attempts += 1;
        return attempts === 1
          ? new Response("private-provider-diagnostic", {
              status: 429,
              headers: { "retry-after": "2" }
            })
          : jsonResponse({ ready: true });
      },
      sleep: async (milliseconds) => { delays.push(milliseconds); }
    }
  );
  assert.deepEqual(value, { ready: true });
  assert.deepEqual(delays, [2_000]);
  assert.equal(providerRetryDelayMs("99999", 0), 30_000);
  assert.equal(
    providerRetryDelayMs(null, 0, 1_700_000_000_000, "1700000060"),
    61_000,
    "Vercel's real 1,000-request/60-second window must wait for x-ratelimit-reset."
  );
});

test("provider GET waits for Vercel x-ratelimit-reset when Retry-After is absent", async () => {
  let attempts = 0;
  const delays = [];
  const value = await fetchVercelApiJson(
    "https://api.vercel.com/v13/deployments/dpl_RateWindowFixture123?teamId=team_fixture",
    token,
    {
      fetchImpl: async () => {
        attempts += 1;
        return attempts === 1
          ? new Response("private-provider-diagnostic", {
              status: 429,
              headers: { "x-ratelimit-reset": "1700000060" }
            })
          : jsonResponse({ ready: true });
      },
      now: () => 1_700_000_000_000,
      sleep: async (milliseconds) => { delays.push(milliseconds); }
    }
  );
  assert.deepEqual(value, { ready: true });
  assert.deepEqual(delays, [61_000]);
});

test("provider GET retries bounded transport, 502, and 504 failures before succeeding", async () => {
  let attempts = 0;
  const delays = [];
  const value = await fetchVercelApiJson(
    "https://api.vercel.com/v13/deployments/dpl_TransientFixture123?teamId=team_fixture",
    token,
    {
      fetchImpl: async () => {
        attempts += 1;
        if (attempts === 1) throw new Error("private transport diagnostic");
        if (attempts === 2) return new Response("private bad gateway", { status: 502 });
        if (attempts === 3) return new Response("private gateway timeout", { status: 504 });
        return jsonResponse({ ready: true });
      },
      sleep: async (milliseconds) => { delays.push(milliseconds); }
    }
  );
  assert.deepEqual(value, { ready: true });
  assert.equal(attempts, 4);
  assert.deepEqual(delays, [500, 1_000, 2_000]);
});

test("provider GET exhausts a fixed transport retry budget and keeps errors redacted", async () => {
  let attempts = 0;
  const delays = [];
  await assert.rejects(
    fetchVercelApiJson(
      "https://api.vercel.com/v13/deployments/dpl_TransportFailure123?teamId=team_fixture",
      token,
      {
        fetchImpl: async () => {
          attempts += 1;
          throw new Error("private transport diagnostic");
        },
        sleep: async (milliseconds) => { delays.push(milliseconds); }
      }
    ),
    (error) => {
      assert.match(String(error), /details redacted/u);
      assert.doesNotMatch(String(error), /private transport diagnostic/u);
      return true;
    }
  );
  assert.equal(attempts, 5);
  assert.deepEqual(delays, [500, 1_000, 2_000, 4_000]);
});

test("provider GET cancels every transient HTTP body including the exhausted attempt", async () => {
  let attempts = 0;
  let cancels = 0;
  const delays = [];
  await assert.rejects(
    fetchVercelApiJson(
      "https://api.vercel.com/v13/deployments/dpl_HttpFailure123?teamId=team_fixture",
      token,
      {
        fetchImpl: async () => {
          attempts += 1;
          return new Response(new ReadableStream({
            cancel() { cancels += 1; }
          }), { status: 503 });
        },
        sleep: async (milliseconds) => { delays.push(milliseconds); }
      }
    ),
    (error) => {
      assert.match(String(error), /details redacted/u);
      assert.doesNotMatch(String(error), /HttpFailure123|503/u);
      return true;
    }
  );
  assert.equal(attempts, 5);
  assert.equal(cancels, 5);
  assert.deepEqual(delays, [500, 1_000, 2_000, 4_000]);
});
