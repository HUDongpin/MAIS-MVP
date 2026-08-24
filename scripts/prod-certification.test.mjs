import test from "node:test";
import assert from "node:assert/strict";
import { access, chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import {
  BUILD_ATTESTATION_ARTIFACTS,
  MAX_BUILD_ATTESTATION_AGE_MS,
  aggregateVerdict,
  appendBrowserSkipResults,
  browserReadOnlyInitScript,
  buildProductionCertificationChildEnvironment,
  buildVercelDeploymentFetchOptions,
  classifyWarmProbeStatus,
  daysUntil,
  evaluateBudget,
  extractNextAssets,
  fetchTimed,
  formatReportMarkdown,
  installReadOnlyBrowserGuards,
  inspectCacheCookieContract,
  isReadOnlyBrowserRequestAllowed,
  parseArgs,
  validateVercelAliasEvidence,
  validateLocalReleaseBindingEvidence,
  validateVercelDeploymentEvidence
} from "./prod-certification.mjs";
import { BUILD_ARTIFACT_TREE_EXCLUSIONS } from "./next-clean-build.mjs";

const bindingArgs = [
  "--candidate-sha",
  "a".repeat(40),
  "--deployment-id",
  "dpl_Abcdefghijklmnop",
  "--deployment-url",
  "https://mais-parent-cert-abc.vercel.app",
  "--vercel-scope",
  "peter-dongpin-hu-s-projects",
  "--build-id",
  "build_Abcdefghijklmnop"
];

const localArtifactTree = Object.freeze({
  algorithm: "sha256",
  exclusions: [...BUILD_ARTIFACT_TREE_EXCLUSIONS],
  fileCount: 17,
  totalBytes: 4096,
  root: "d".repeat(64)
});

test("production certification scopes provider credentials and disables hostile Git helpers", async (t) => {
  const fixture = {
    PATH: process.env.PATH ?? "/usr/bin:/bin",
    TMPDIR: os.tmpdir(),
    GITHUB_TOKEN: "fixture-github-token-not-real",
    GH_TOKEN: "fixture-gh-token-not-real",
    VERCEL_TOKEN: "fixture-vercel-token-not-real",
    POSTGRES_URL: "postgres://fixture:not-real@example.invalid/db",
    RESEND_API_KEY: "fixture-resend-key-not-real",
    MAIS_TEACHER_NOTICE_PRODUCTION_SCHEMA_CONFIRM: "fixture-confirmation-not-real"
  };
  const gitEnv = buildProductionCertificationChildEnvironment("git", fixture);
  assert.equal(gitEnv.PATH, fixture.PATH);
  assert.equal(gitEnv.GIT_CONFIG_NOSYSTEM, "1");
  assert.equal(gitEnv.GIT_CONFIG_GLOBAL, "/dev/null");
  assert.equal(gitEnv.GIT_CONFIG_KEY_0, "core.fsmonitor");
  assert.equal(gitEnv.GIT_CONFIG_VALUE_0, "false");
  assert.equal(gitEnv.GIT_CONFIG_KEY_1, "core.hooksPath");
  assert.equal(gitEnv.GIT_CONFIG_VALUE_1, "/dev/null");
  assert.equal(gitEnv.GIT_OPTIONAL_LOCKS, "0");

  const githubEnv = buildProductionCertificationChildEnvironment("github", fixture);
  assert.equal(githubEnv.GITHUB_TOKEN, fixture.GITHUB_TOKEN);
  assert.equal(githubEnv.GH_TOKEN, undefined);
  const vercelEnv = buildProductionCertificationChildEnvironment("vercel", fixture);
  assert.equal(vercelEnv.VERCEL_TOKEN, fixture.VERCEL_TOKEN);
  for (const scoped of [gitEnv, githubEnv, vercelEnv]) {
    assert.equal(scoped.POSTGRES_URL, undefined);
    assert.equal(scoped.RESEND_API_KEY, undefined);
    assert.equal(scoped.MAIS_TEACHER_NOTICE_PRODUCTION_SCHEMA_CONFIRM, undefined);
  }

  const repo = await mkdtemp(path.join(os.tmpdir(), "mais-prod-cert-git-"));
  t.after(() => rm(repo, { recursive: true, force: true }));
  execFileSync("git", ["init", "--quiet"], { cwd: repo });
  const marker = path.join(repo, "fsmonitor-ran");
  const helper = path.join(repo, "hostile-fsmonitor.sh");
  await writeFile(helper, `#!/bin/sh\ntouch ${JSON.stringify(marker)}\nexit 0\n`);
  await chmod(helper, 0o755);
  execFileSync("git", ["config", "core.fsmonitor", helper], { cwd: repo });
  execFileSync("git", ["status", "--porcelain"], { cwd: repo, env: gitEnv });
  await assert.rejects(access(marker), /ENOENT/u);
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

test("read-only HTTP probes follow only bounded same-origin HTTPS redirects", async () => {
  const calls = [];
  const sameOriginFetch = async (url, options) => {
    calls.push({ url, method: options.method, redirect: options.redirect });
    return calls.length === 1
      ? new Response(null, { status: 302, headers: { location: "/final" } })
      : new Response("ok", { status: 200, headers: { "content-type": "text/plain" } });
  };
  const result = await fetchTimed("https://www.mais.ac/start", {
    fetchImpl: sameOriginFetch,
    timeoutMs: 1_000
  });
  assert.equal(result.finalUrl, "https://www.mais.ac/final");
  assert.equal(result.text(), "ok");
  assert.deepEqual(calls, [
    { url: "https://www.mais.ac/start", method: "GET", redirect: "manual" },
    { url: "https://www.mais.ac/final", method: "GET", redirect: "manual" }
  ]);

  let crossOriginCalls = 0;
  await assert.rejects(
    fetchTimed("https://www.mais.ac/start", {
      fetchImpl: async () => {
        crossOriginCalls += 1;
        return new Response(null, {
          status: 302,
          headers: { location: "https://169.254.169.254/latest/meta-data" }
        });
      }
    }),
    /approved origin|public HTTPS boundary/i
  );
  assert.equal(crossOriginCalls, 1);
  await assert.rejects(
    fetchTimed("https://www.mais.ac/write", { method: "POST", fetchImpl: sameOriginFetch }),
    /mutating method/i
  );
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

test("aggregateVerdict: any skipped check prevents a clean certification", () => {
  assert.equal(
    aggregateVerdict([
      { severity: "P0", status: "pass" },
      { severity: "P1", status: "skip" }
    ]),
    "CERTIFIED_WITH_FINDINGS"
  );
});

test("warm probe accepts only an unauthenticated 401 in configured production", () => {
  assert.equal(classifyWarmProbeStatus(401), "pass");
  assert.equal(classifyWarmProbeStatus(200), "fail");
  assert.equal(classifyWarmProbeStatus(503), "fail");
});

test("cache/cookie contract requires no-store, optional private, and no Set-Cookie", () => {
  assert.deepEqual(
    inspectCacheCookieContract(
      new Headers({ "cache-control": "private, no-store, max-age=0" }),
      { requirePrivate: true }
    ),
    { ok: true, missing: [] }
  );
  assert.deepEqual(
    inspectCacheCookieContract(
      new Headers({ "cache-control": "no-store", "set-cookie": "session=unexpected" }),
      { requirePrivate: true }
    ),
    { ok: false, missing: ["private", "no-set-cookie"] }
  );
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
    releaseBinding: {
      candidateSha: "a".repeat(40),
      deploymentId: "dpl_Abcdefghijklmnop",
      deploymentUrl: "https://mais-parent-cert-abc.vercel.app",
      buildId: "build_Abcdefghijklmnop"
    },
    writeFootprint: "none (read-only run)",
    results: [
      { id: "home-availability", severity: "P0", status: "pass", domain: "https://www.mais.ac", detail: "HTTP 200 | fast" }
    ]
  });
  assert.match(markdown, /Production certification — CERTIFIED_WITH_FINDINGS/);
  assert.match(markdown, new RegExp(`Candidate SHA: ${"a".repeat(40)}`));
  assert.match(markdown, /Local Next BUILD_ID: build_Abcdefghijklmnop/);
  assert.match(markdown, /pass 1, warn 0, fail 0, skip 0/);
  assert.match(markdown, /HTTP 200 \\\| fast/);
});

test("parseArgs is strict and read-only by default and requires release binding inputs", () => {
  const parsed = parseArgs(["--json", "--out", "/tmp/x", ...bindingArgs]);
  assert.equal(parsed.json, true);
  assert.equal(parsed.strict, true);
  assert.equal(parsed.skipBrowser, false);
  assert.equal(parsed.out, "/tmp/x");
  assert.equal(parsed.readOnly, true);
  assert.equal(parsed.writeAuthorization.authorized, false);
  assert.deepEqual(parsed.releaseBinding, {
    candidateSha: "a".repeat(40),
    deploymentId: "dpl_Abcdefghijklmnop",
    deploymentUrl: "https://mais-parent-cert-abc.vercel.app",
    vercelScope: "peter-dongpin-hu-s-projects",
    buildId: "build_Abcdefghijklmnop"
  });

  assert.throws(() => parseArgs([]), /candidate-sha/i);
  assert.throws(() => parseArgs(["--candidate-sha", "not-a-sha", ...bindingArgs.slice(2)]), /candidate-sha/i);
  assert.throws(
    () => parseArgs([...bindingArgs.slice(0, 5), "https://www.mais.hk/path", ...bindingArgs.slice(6)]),
    /deployment-url/i
  );
  assert.throws(() => parseArgs(["--nope"]), /Unknown argument/);
});

test("local release binding rejects an old, dirty, unstable, or differently scoped build attestation", () => {
  const releaseBinding = {
    candidateSha: "a".repeat(40),
    deploymentId: "dpl_Abcdefghijklmnop",
    deploymentUrl: "https://mais-parent-cert-abc.vercel.app",
    vercelScope: "peter-dongpin-hu-s-projects",
    buildId: "build_Abcdefghijklmnop"
  };
  const artifactDigests = Object.fromEntries(
    BUILD_ATTESTATION_ARTIFACTS.map((relativePath, index) => [
      relativePath,
      String(index + 1).repeat(64)
    ])
  );
  const attestation = {
    schemaVersion: 3,
    candidateSha: releaseBinding.candidateSha,
    buildId: releaseBinding.buildId,
    distDir: ".next",
    sourceTreeClean: true,
    sourceTreeStable: true,
    buildStartedAt: "2026-08-24T08:00:00.000Z",
    completedAt: "2026-08-24T08:10:00.000Z",
    artifactDigests,
    artifactTree: localArtifactTree
  };
  const nowMs = Date.parse("2026-08-24T08:20:00.000Z");

  assert.deepEqual(
    validateLocalReleaseBindingEvidence(releaseBinding, {
      localSha: releaseBinding.candidateSha,
      localBuildId: releaseBinding.buildId,
      attestation,
      currentSourceClean: true,
      currentArtifactDigests: artifactDigests,
      currentArtifactTree: localArtifactTree,
      nowMs
    }),
    {
      ...releaseBinding,
      localHeadMatched: true,
      localBuildIdMatched: true,
      localBuildAttestationMatched: true,
      buildStartedAt: attestation.buildStartedAt,
      completedAt: attestation.completedAt,
      artifactDigestsMatched: true,
      localArtifactTreeMatched: true
    }
  );

  for (const [label, override] of [
    ["old SHA", { candidateSha: "b".repeat(40) }],
    ["old build", { buildId: "build_OldCandidate000000" }],
    ["dirty source", { sourceTreeClean: false }],
    ["changing source", { sourceTreeStable: false }],
    ["isolated dist", { distDir: ".tmp/other-next" }]
  ]) {
    assert.throws(
      () => validateLocalReleaseBindingEvidence(releaseBinding, {
        localSha: releaseBinding.candidateSha,
        localBuildId: releaseBinding.buildId,
        attestation: { ...attestation, ...override },
        currentSourceClean: true,
        currentArtifactDigests: artifactDigests,
        currentArtifactTree: localArtifactTree,
        nowMs
      }),
      /Build binding failed/u,
      label
    );
  }
});

test("local release binding rejects stale/future attestations, current dirt, and mutated artifacts", () => {
  const releaseBinding = {
    candidateSha: "a".repeat(40),
    deploymentId: "dpl_Abcdefghijklmnop",
    deploymentUrl: "https://mais-parent-cert-abc.vercel.app",
    vercelScope: "peter-dongpin-hu-s-projects",
    buildId: "build_Abcdefghijklmnop"
  };
  const artifactDigests = Object.fromEntries(
    BUILD_ATTESTATION_ARTIFACTS.map((relativePath, index) => [relativePath, String(index + 1).repeat(64)])
  );
  const nowMs = Date.parse("2026-08-24T12:00:00.000Z");
  const attestation = {
    schemaVersion: 3,
    candidateSha: releaseBinding.candidateSha,
    buildId: releaseBinding.buildId,
    distDir: ".next",
    sourceTreeClean: true,
    sourceTreeStable: true,
    buildStartedAt: "2026-08-24T11:40:00.000Z",
    completedAt: "2026-08-24T11:50:00.000Z",
    artifactDigests,
    artifactTree: localArtifactTree
  };
  const validate = (overrides = {}) => validateLocalReleaseBindingEvidence(releaseBinding, {
    localSha: releaseBinding.candidateSha,
    localBuildId: releaseBinding.buildId,
    attestation,
    currentSourceClean: true,
    currentArtifactDigests: artifactDigests,
    currentArtifactTree: localArtifactTree,
    nowMs,
    ...overrides
  });

  assert.throws(() => validate({ currentSourceClean: false }), /current worktree is not clean/i);
  assert.throws(
    () => validate({
      nowMs: Date.parse(attestation.completedAt) + MAX_BUILD_ATTESTATION_AGE_MS + 1
    }),
    /fresh/i
  );
  assert.throws(
    () => validate({
      attestation: {
        ...attestation,
        buildStartedAt: "2026-08-24T12:10:00.000Z",
        completedAt: "2026-08-24T12:11:00.000Z"
      }
    }),
    /future/i
  );
  assert.throws(
    () => validate({
      currentArtifactDigests: {
        ...artifactDigests,
        "required-server-files.json": "f".repeat(64)
      }
    }),
    /artifact digest/i
  );
  assert.throws(
    () => validate({
      currentArtifactTree: { ...localArtifactTree, root: "f".repeat(64) }
    }),
    /complete local artifact tree/i
  );
  assert.throws(
    () => validate({
      attestation: {
        ...attestation,
        artifactTree: {
          ...localArtifactTree,
          exclusions: [...localArtifactTree.exclusions, "server/**"]
        }
      }
    }),
    /complete local artifact tree/i
  );
  assert.throws(
    () => validate({
      attestation: {
        ...attestation,
        artifactDigests: {
          ...artifactDigests,
          "unexpected/private-path.json": "e".repeat(64)
        }
      }
    }),
    /artifact digest/i
  );
});

test("Vercel provider evidence binds one immutable deployment, candidate SHA, and every production alias", () => {
  const releaseBinding = {
    candidateSha: "a".repeat(40),
    deploymentId: "dpl_Abcdefghijklmnop",
    deploymentUrl: "https://mais-parent-cert-abc.vercel.app",
    vercelScope: "peter-dongpin-hu-s-projects",
    buildId: "build_Abcdefghijklmnop"
  };
  const payload = {
    id: releaseBinding.deploymentId,
    url: "mais-parent-cert-abc.vercel.app",
    readyState: "READY",
    target: "production",
    projectId: "prj_rjuY7fXculXzklpoG1L8xg7Tfdr1",
    project: { id: "prj_rjuY7fXculXzklpoG1L8xg7Tfdr1", name: "mais-mvp" },
    ownerId: "team_i9xhhYXUeYBOCLcfWBjTqlYG",
    team: {
      id: "team_i9xhhYXUeYBOCLcfWBjTqlYG",
      slug: "peter-dongpin-hu-s-projects"
    },
    source: "cli",
    meta: {
      maisCandidateSha: releaseBinding.candidateSha,
      githubCommitSha: "b".repeat(40)
    },
    gitSource: null
  };
  const aliasesPayload = {
    aliases: [
      { alias: "www.mais.ac" },
      { alias: "www.mais.hk" }
    ]
  };
  const sourcePackageEvidence = {
    verified: true,
    candidateSha: releaseBinding.candidateSha,
    sourceManifestRoot: "e".repeat(64),
    contentSha256Verified: true,
    fileModesVerified: true
  };

  assert.deepEqual(validateVercelDeploymentEvidence(releaseBinding, payload, {
    aliasesPayload,
    sourcePackageEvidence
  }), {
    deploymentId: releaseBinding.deploymentId,
    deploymentUrl: releaseBinding.deploymentUrl,
    candidateSha: releaseBinding.candidateSha,
    productionAliases: ["www.mais.ac", "www.mais.hk"],
    readyState: "READY",
    source: "cli",
    sourceManifestRoot: "e".repeat(64),
    target: "production"
  });

  for (const [label, changed] of [
    ["wrong deployment", { id: "dpl_OldDeployment000" }],
    ["wrong deployment URL", { url: "old-candidate.vercel.app" }],
    ["not ready", { readyState: "BUILDING" }],
    ["not production", { target: "preview" }],
    ["custom candidate metadata missing", {
      meta: { githubCommitSha: releaseBinding.candidateSha }
    }],
    ["wrong project", { projectId: "prj_wrong" }],
    ["wrong team", { ownerId: "team_wrong" }],
    ["wrong source", { source: "git" }]
  ]) {
    assert.throws(
      () => validateVercelDeploymentEvidence(releaseBinding, { ...payload, ...changed }, {
        aliasesPayload,
        sourcePackageEvidence
      }),
      /Vercel deployment binding failed/i,
      label
    );
  }

  assert.throws(
    () => validateVercelDeploymentEvidence(releaseBinding, {
      ...payload,
      meta: {
        maisCandidateSha: releaseBinding.candidateSha,
        githubCommitSha: releaseBinding.candidateSha
      },
      gitSource: { sha: releaseBinding.candidateSha }
    }),
    /source bytes/i,
    "self-supplied Git metadata must never substitute for provider source-byte evidence"
  );
});

test("Vercel aliases come from the immutable deployment alias endpoint", () => {
  assert.deepEqual(validateVercelAliasEvidence({
    aliases: [
      { alias: "www.mais.hk" },
      { alias: "mais.ac" },
      { alias: "www.mais.ac" }
    ]
  }), ["www.mais.ac", "www.mais.hk"]);
  assert.throws(
    () => validateVercelAliasEvidence({ aliases: [{ alias: "www.mais.ac" }] }),
    /aliases are not assigned/i
  );
  assert.throws(
    () => validateVercelAliasEvidence({
      aliases: [
        { alias: "https://owner:password@www.mais.ac:444/" },
        { alias: "https://www.mais.hk:8443/" }
      ]
    }),
    /exact production aliases/i
  );
});

test("Vercel provider evidence uses non-following authenticated GET options", () => {
  const token = "fixture-vercel-token-with-sufficient-length";
  const options = buildVercelDeploymentFetchOptions(token);
  assert.equal(options.redirect, "error");
  assert.equal(options.timeoutMs, 30_000);
  assert.deepEqual(options.headers, {
    authorization: `Bearer ${token}`,
    accept: "application/json"
  });
  assert.equal(Object.hasOwn(options, "method"), false, "fetch defaults to GET and must not expose a mutating method option");
});

test("browser read-only guard permits only same-origin GET/HEAD and aborts synthetic writes", async () => {
  const origin = "https://www.mais.ac";
  assert.equal(isReadOnlyBrowserRequestAllowed({ method: "GET", url: `${origin}/login` }, origin), true);
  assert.equal(isReadOnlyBrowserRequestAllowed({ method: "HEAD", url: `${origin}/asset.js` }, origin), true);
  assert.equal(isReadOnlyBrowserRequestAllowed({ method: "POST", url: `${origin}/analytics` }, origin), false);
  assert.equal(isReadOnlyBrowserRequestAllowed({ method: "GET", url: "https://analytics.example/collect" }, origin), false);

  let routeHandler;
  let webSocketHandler;
  let initScript;
  let exposedBinding;
  const context = {
    async exposeBinding(name, callback) {
      exposedBinding = { name, callback };
    },
    async addInitScript(script) {
      initScript = script;
    },
    async route(pattern, handler) {
      assert.equal(pattern, "**/*");
      routeHandler = handler;
    },
    async routeWebSocket(pattern, handler) {
      assert.ok(pattern instanceof RegExp);
      webSocketHandler = handler;
    }
  };
  const blocked = [];
  await installReadOnlyBrowserGuards(context, origin, blocked);
  assert.equal(exposedBinding.name, "__maisRecordBlockedBrowserMutation");
  assert.equal(initScript, browserReadOnlyInitScript);
  assert.equal(typeof webSocketHandler, "function");

  const routeEvents = [];
  const syntheticPost = {
    request: () => ({ method: () => "POST", url: () => `${origin}/analytics?token=redacted` }),
    abort: async () => routeEvents.push("abort"),
    continue: async () => routeEvents.push("continue")
  };
  await routeHandler(syntheticPost);
  assert.deepEqual(routeEvents, ["abort"]);
  assert.equal(blocked.length, 1);
  assert.doesNotMatch(JSON.stringify(blocked), /token=redacted/);

  routeEvents.length = 0;
  await routeHandler({
    request: () => ({ method: () => "GET", url: () => `${origin}/login` }),
    abort: async () => routeEvents.push("abort"),
    continue: async () => routeEvents.push("continue")
  });
  assert.deepEqual(routeEvents, ["continue"]);

  const webSocketEvents = [];
  await webSocketHandler({
    url: () => "wss://www.mais.ac/socket?secret=redacted",
    close: async (options) => webSocketEvents.push(options)
  });
  assert.deepEqual(webSocketEvents, [{ code: 1008, reason: "read-only certification" }]);
  assert.equal(blocked.at(-1).kind, "websocket-route");
  assert.doesNotMatch(JSON.stringify(blocked), /secret=redacted/);
});

test("browser init script blocks and records synthetic browser network-channel attempts", () => {
  const attempts = [];
  const sandbox = {
    navigator: { sendBeacon: () => true },
    WebSocket: class ExistingWebSocket {},
    EventSource: class ExistingEventSource {},
    Worker: class ExistingWorker {},
    SharedWorker: class ExistingSharedWorker {},
    WebTransport: class ExistingWebTransport {},
    RTCPeerConnection: class ExistingRTCPeerConnection {},
    webkitRTCPeerConnection: class ExistingWebkitRTCPeerConnection {},
    __maisRecordBlockedBrowserMutation: (entry) => attempts.push(entry),
    Error
  };
  vm.runInNewContext(`(${browserReadOnlyInitScript.toString()})()`, sandbox);

  assert.equal(sandbox.navigator.sendBeacon("https://www.mais.ac/beacon", "payload"), false);
  assert.throws(() => new sandbox.WebSocket("wss://example.test/socket"), /blocked/i);
  assert.throws(() => new sandbox.EventSource("https://example.test/events"), /blocked/i);
  assert.throws(() => new sandbox.Worker("/worker.js"), /blocked/i);
  assert.throws(() => new sandbox.SharedWorker("/shared-worker.js"), /blocked/i);
  assert.throws(() => new sandbox.WebTransport("https://example.test/transport"), /blocked/i);
  assert.throws(() => new sandbox.RTCPeerConnection(), /blocked/i);
  assert.throws(() => new sandbox.webkitRTCPeerConnection(), /blocked/i);
  assert.deepEqual(attempts.map((entry) => entry.kind), [
    "sendBeacon",
    "WebSocket",
    "EventSource",
    "Worker",
    "SharedWorker",
    "WebTransport",
    "RTCPeerConnection",
    "RTCPeerConnection"
  ]);
  assert.deepEqual(JSON.parse(JSON.stringify(sandbox.__maisReadOnlyBrowserGuard)), {
    version: 2,
    sendBeacon: true,
    webSocket: true,
    eventSource: true,
    worker: true,
    sharedWorker: true,
    webTransport: true,
    rtcPeerConnection: true,
    webkitRtcPeerConnection: true
  });
});

test("unknown CLI flags do not echo an attached value", () => {
  const secret = "fixture-secret-that-must-not-be-logged";
  assert.throws(
    () => parseArgs([`--token=${secret}`]),
    (error) => {
      assert.match(error.message, /Unknown argument flag: --token/u);
      assert.doesNotMatch(error.message, new RegExp(secret, "u"));
      return true;
    }
  );
});

test("explicit browser skipping always records findings and cannot certify cleanly", () => {
  const results = [];
  appendBrowserSkipResults(["https://www.mais.ac", "https://www.mais.hk"], (result) => results.push(result));
  assert.equal(results.length, 2);
  assert.ok(results.every((result) => result.status === "skip" && result.severity === "P1"));
  assert.equal(aggregateVerdict(results), "CERTIFIED_WITH_FINDINGS");
});

test("production write authorization requires an exact synthetic family confirmation and target", () => {
  assert.throws(
    () => parseArgs([...bindingArgs, "--allow-production-writes"]),
    /synthetic-test-family/i
  );
  assert.throws(
    () => parseArgs([
      ...bindingArgs,
      "--allow-production-writes",
      "--synthetic-test-family-id",
      "mais-synthetic-family-parent-01",
      "--write-target",
      "https://www.mais.hk",
      "--synthetic-test-family-confirmation",
      "wrong"
    ]),
    /exact synthetic/i
  );

  const parsed = parseArgs([
    ...bindingArgs,
    "--allow-production-writes",
    "--synthetic-test-family-id",
    "mais-synthetic-family-parent-01",
    "--write-target",
    "https://www.mais.hk",
    "--synthetic-test-family-confirmation",
    "ALLOW_SYNTHETIC_TEST_FAMILY_WRITES:mais-synthetic-family-parent-01@https://www.mais.hk"
  ]);
  assert.deepEqual(parsed.writeAuthorization, {
    authorized: true,
    target: "https://www.mais.hk",
    syntheticFamilyConfirmed: true
  });
  assert.equal(parsed.readOnly, true, "this phase must execute no write probes even when authorization is supplied");
  assert.doesNotMatch(JSON.stringify(parsed), /ALLOW_SYNTHETIC_TEST_FAMILY_WRITES|mais-synthetic-family-parent-01/);
});

test("production certification source contains no legacy demo-login or mutating smoke execution", async () => {
  const source = await readFile(new URL("./prod-certification.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(source, /DASHBOARD_SMOKE_USE_DEMO_LOGIN|AI_TUTOR_LIVE_USE_DEMO_LOGIN/);
  assert.doesNotMatch(source, /dashboard-(?:latency|ui-loading)-smoke|ai-tutor-live-latency-smoke/);
  assert.doesNotMatch(source, /method:\s*["']POST["']/);
  assert.match(source, /--allow-production-writes/);
  assert.match(source, /--synthetic-test-family-confirmation/);
  const browserScan = source.slice(
    source.indexOf("async function runBrowserConsoleScan"),
    source.indexOf("function readRequiredArgument")
  );
  assert.doesNotMatch(browserScan, /message\.text\(\)|String\(firstIssue\)|String\(error\)/u);
  assert.match(browserScan, /details redacted/u);
  const githubBinding = source.slice(
    source.indexOf("async function runGithubCandidateBinding"),
    source.indexOf("async function runVercelDeploymentBinding")
  );
  assert.match(githubBinding, /verifyGithubCandidateChecks\(\{/u);
  assert.doesNotMatch(
    githubBinding,
    /fetchGithubJson|readGithubToken|validateGithubCandidateEvidence/u
  );
  assert.equal(
    source.match(/await runGithubCandidateBinding\(/gu)?.length,
    2,
    "Certification must repeat the unified current-main exact-SHA gate at start and finish."
  );
});
