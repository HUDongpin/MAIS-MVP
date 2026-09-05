import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createServer } from "node:http";
import { constants as fsConstants, existsSync, readFileSync } from "node:fs";
import fsPromises from "node:fs/promises";
import { link, lstat, mkdir, mkdtemp, readFile, readdir, rename, rm, symlink, unlink, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";
import {
  APPROVED_VERCEL_PROJECT_ID,
  APPROVED_VERCEL_PROJECT_NAME,
  APPROVED_VERCEL_TEAM_ID,
  APPROVED_VERCEL_TEAM_SLUG,
} from "./vercel-provider-evidence.mjs";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptsDir, "..");
const smokePath = path.join(scriptsDir, "classroom-load-smoke.mjs");
const execFileAsync = promisify(execFile);
const smokeModule = existsSync(smokePath)
  ? await import(`${pathToFileURL(smokePath).href}?integration-test=${Date.now()}`)
  : {};

function requiredExport(name) {
  assert.equal(typeof smokeModule[name], "function", `Missing classroom smoke export: ${name}`);
  return smokeModule[name];
}

function source(relativePath) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function mockTemporaryReportHandle(t, root, { failPhase, failEveryStat = false, onFailure } = {}) {
  const originalOpen = fsPromises.open;
  const state = { events: [], rawHandle: null, temporaryPath: "" };
  t.mock.method(fsPromises, "open", async (...args) => {
    const handle = await originalOpen(...args);
    const candidate = path.resolve(String(args[0]));
    const temporaryPrefix = `${path.resolve(root)}${path.sep}.last-run.json.`;
    if (!candidate.startsWith(temporaryPrefix) || !candidate.endsWith(".tmp")) return handle;

    state.rawHandle = handle;
    state.temporaryPath = candidate;
    let statCalls = 0;
    return new Proxy(handle, {
      get(target, property) {
        if (!["chmod", "stat", "sync", "writeFile"].includes(property)) {
          const value = Reflect.get(target, property, target);
          return typeof value === "function" ? value.bind(target) : value;
        }
        return async (...methodArgs) => {
          state.events.push(property);
          if (property === "stat") statCalls += 1;
          const fails = property === failPhase && (property !== "stat" || failEveryStat || statCalls === 1);
          if (fails) {
            await onFailure?.(state);
            throw new Error(`fixture temporary ${property} failure`);
          }
          return target[property](...methodArgs);
        };
      },
    });
  });
  return state;
}

async function listen(handler) {
  const server = createServer(handler);
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert.ok(address && typeof address === "object");
  return {
    close: () => new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    }),
    origin: `http://127.0.0.1:${address.port}`
  };
}

function providerPreviewRecord({
  candidateSha = "a".repeat(40),
  deploymentId = "dpl_ClassroomPreviewFixture123",
  deploymentUrl = "https://mais-classroom-preview-fixture.vercel.app",
} = {}) {
  const sourceManifestRoot = "b".repeat(64);
  const sourceTreeObject = "c".repeat(40);
  const manifestRawSha1 = "d".repeat(40);
  const manifestSha256 = "e".repeat(64);
  const sourcePackageEvidence = {
    candidateSha,
    contentSha256Verified: true,
    fileCount: 1,
    fileModesVerified: true,
    manifestRawSha1,
    manifestSha256,
    sourceManifestRoot,
    sourceTreeObject,
    totalBytes: 1,
    verified: true,
  };
  return {
    candidateSha,
    deployedAt: "2026-09-04T00:00:00.000Z",
    deploymentEvidence: {
      candidateSha,
      deploymentId,
      deploymentUrl,
      metadataVerified: false,
      providerGitShaVerified: false,
      readyState: "READY",
      target: "preview",
    },
    deploymentId,
    deploymentUrl,
    dryRun: false,
    inspectVerified: true,
    project: APPROVED_VERCEL_PROJECT_NAME,
    providerEvidence: {
      deploymentId,
      deploymentUrl,
      fileModesVerified: true,
      projectId: APPROVED_VERCEL_PROJECT_ID,
      projectName: APPROVED_VERCEL_PROJECT_NAME,
      source: "cli",
      sourceManifestRoot,
      sourcePackageEvidence,
      sourceSha256Verified: true,
      target: "preview",
      teamId: APPROVED_VERCEL_TEAM_ID,
      teamSlug: APPROVED_VERCEL_TEAM_SLUG,
    },
    providerSourceVerified: true,
    scope: APPROVED_VERCEL_TEAM_SLUG,
    stagingPackage: {
      candidateSha,
      excludedPolicy: {
        dataEase: true,
        localSecretsAndGeneratedOutputs: true,
        publicQuestionIllustrations: true,
      },
      fileCount: 1,
      gitSourceVerified: true,
      manifest: {
        path: "vercel-staging-manifest.json",
        rawSha1: manifestRawSha1,
        schemaVersion: 2,
        sha256: manifestSha256,
      },
      objectFormat: "sha1",
      sourceKind: "clean-head-tracked-regular-blobs",
      sourceManifestAlgorithm: "sha256-canonical-json-lines-v2",
      sourceManifestRoot,
      sourceTreeObject,
      totalBytes: 1,
      trackedEntryCount: 1,
    },
    target: "preview",
  };
}

function providerDeploymentPayload(record) {
  return {
    id: record.deploymentId,
    meta: { maisCandidateSha: record.candidateSha },
    ownerId: APPROVED_VERCEL_TEAM_ID,
    project: { id: APPROVED_VERCEL_PROJECT_ID, name: APPROVED_VERCEL_PROJECT_NAME },
    projectId: APPROVED_VERCEL_PROJECT_ID,
    readyState: "READY",
    source: "cli",
    target: "preview",
    team: { id: APPROVED_VERCEL_TEAM_ID, slug: APPROVED_VERCEL_TEAM_SLUG },
    url: new URL(record.deploymentUrl).hostname,
  };
}

test("classroom load smoke remains an aliased manual command in default release governance", () => {
  assert.equal(existsSync(smokePath), true, "classroom load smoke script must exist");

  const packageJson = JSON.parse(source("package.json"));
  assert.equal(
    packageJson.scripts?.["smoke:classroom-load"],
    "node scripts/classroom-load-smoke.mjs",
  );
  assert.match(
    packageJson.scripts?.["test:release-governance"] ?? "",
    /classroom-load-smoke\.test\.mjs/u,
  );

  const releaseNotes = source("RELEASE.md");
  assert.match(releaseNotes, /Manual classroom-concurrency smoke \(staging\/preview only\)/u);
  assert.match(releaseNotes, /npm run smoke:classroom-load -- --students 15 --rounds 3 --json/u);
  assert.match(releaseNotes, /never follows redirects/i);
  assert.match(releaseNotes, /original origin may already have accepted earlier writes/i);
  assert.match(releaseNotes, /CLASSROOM_LOAD_USE_DEMO_LOGIN=1/u);
  assert.match(releaseNotes, /CLASSROOM_LOAD_DEMO_PASSWORD=/u);

  const ciWorkflow = source(".github/workflows/ci.yml");
  assert.doesNotMatch(ciWorkflow, /^\s+scripts\/classroom-load-smoke\.test\.mjs \\/mu);
  assert.doesNotMatch(ciWorkflow, /node scripts\/classroom-load-smoke\.mjs(?!\.test)/u);
  for (const relativePath of [
    "scripts/prod-certification.mjs",
    "scripts/prod-certification.test.mjs",
    "scripts/deploy-vercel-production.mjs",
    ".github/workflows/production-deploy.yml"
  ]) {
    assert.doesNotMatch(
      source(relativePath),
      /classroom-load-smoke|smoke:classroom-load/u,
      `${relativePath} must not integrate the write-capable classroom smoke`
    );
  }
  const assertTargetIsNotProduction = requiredExport("assertTargetIsNotProduction");
  assert.throws(
    () => assertTargetIsNotProduction(
      "https://www.mais.ac",
      { CLASSROOM_LOAD_ALLOW_PRODUCTION: "1" }
    ),
    /production host/u
  );
});

test("CI separates offline attempt gates from task-scoped real PostgreSQL integration", () => {
  const ciWorkflow = source(".github/workflows/ci.yml");
  assert.match(ciWorkflow, /Run practice attempt persistence unit gates/u);
  assert.match(
    ciWorkflow,
    /node --import tsx --test \\\n\s+lib\/server\/practiceAttemptStore\.test\.ts \\\n\s+app\/api\/attempts\/routeFastPath\.test\.ts/u,
  );
  assert.match(ciWorkflow, /Run durable practice-attempt PostgreSQL 16 integration gates/u);
  assert.match(
    ciWorkflow,
    /MAIS_PRACTICE_ATTEMPT_POSTGRES_INTEGRATION_URL: postgres:\/\/postgres:postgres@127\.0\.0\.1:5432\/mais_nova_ci/u,
  );
  assert.match(ciWorkflow, /--test-name-pattern='real PostgreSQL'/u);
  assert.match(ciWorkflow, /Run unpersisted attempt feedback browser gate/u);
  assert.match(
    ciWorkflow,
    /npx playwright test tests\/e2e\/practice-pager\.spec\.ts --project=desktop-chrome --grep 'unpersisted attempt feedback stays retryable without success side effects'/u,
  );
  assert.doesNotMatch(ciWorkflow, /(?:run:\s*|\n\s+)(?:npm run )?smoke:classroom-load(?:\s|$)/u);
});

test("classroom runbook records Preview identity, durable persistence, and artifact fsync limits", () => {
  const releaseNotes = source("RELEASE.md");
  assert.match(releaseNotes, /CLASSROOM_LOAD_PREVIEW_EVIDENCE_FILE=/u);
  assert.match(releaseNotes, /CLASSROOM_LOAD_EXPECTED_CANDIDATE_SHA=/u);
  assert.equal(
    releaseNotes.match(/CLASSROOM_LOAD_VERCEL_TOKEN=/gu)?.length,
    2,
    "both non-loopback command examples require the task-scoped provider token",
  );
  assert.match(releaseNotes, /provider-verified.*project.*team.*immutable.*candidate SHA/is);
  assert.match(releaseNotes, /receipt.*(?:alone|itself).*not.*provider proof/is);
  assert.match(releaseNotes, /Management API.*before.*login.*session/is);
  assert.match(releaseNotes, /Vercel.*never falls back.*SQLite/is);
  assert.match(releaseNotes, /persisted: false.*retryable.*success side effects/is);
  assert.match(releaseNotes, /directory.*fsync/is);
  assert.match(releaseNotes, /fsync.*fail.*complete.*artifact/is);
  assert.match(releaseNotes, /identity-checked best\s+effort.*TOCTOU/is);
});

test("timed fetch keeps its timeout active while reading the response body", async (t) => {
  const timedFetch = requiredExport("timedFetch");
  const slow = await listen((_request, response) => {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.flushHeaders();
    setTimeout(() => response.end("{\"ok\":true}"), 80);
  });
  t.after(slow.close);

  const result = await timedFetch(`${slow.origin}/slow-body`, { timeoutMs: 10 });
  assert.equal(result.ok, false);
  assert.equal(result.status, 0);
  assert.match(result.error ?? "", /abort|timeout/i);
  assert.equal(result.text, "");
});

test("timed fetch fails closed when a response body exceeds its byte ceiling", async (t) => {
  const timedFetch = requiredExport("timedFetch");
  const oversized = await listen((_request, response) => {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end("x".repeat(4_096));
  });
  t.after(oversized.close);

  const result = await timedFetch(
    `${oversized.origin}/oversized-body`,
    { maxBodyBytes: 128, timeoutMs: 1_000 }
  );
  assert.equal(result.ok, false);
  assert.equal(result.status, 0);
  assert.match(result.error ?? "", /response body|byte|limit|exceed/i);
  assert.equal(result.text, "");
});

test("classroom smoke rejects an HTTP 200 attempt that acknowledges failed persistence", async (t) => {
  const runSeatRound = requiredExport("runSeatRound");
  const fixture = await listen((request, response) => {
    if (request.url === "/api/attempts") {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ correct: true, persisted: false }));
      return;
    }
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end("{}");
  });
  t.after(fixture.close);

  const measurements = await runSeatRound(
    { baseUrl: fixture.origin, cookie: "fixture-cookie", seat: 1, userId: "fixture-user" },
    { lessonSlug: "fixture-lesson", questions: [{ questionId: "fixture-question", selectedAnswer: "1" }] },
    { rounds: 1, timeoutMs: 1_000 },
    0,
    {},
    globalThis.fetch
  );

  const attempt = measurements.find((measurement) => measurement.endpoint === "attempts");
  assert.ok(attempt);
  assert.equal(attempt.status, 200);
  assert.equal(attempt.ok, false, "a grading response is not a successful write without persisted=true");
});

async function runAttemptAcknowledgementFixture(t, attemptBody) {
  const executeClassroomLoad = requiredExport("executeClassroomLoad");
  const fixture = await listen((request, response) => {
    if (request.url?.startsWith("/api/questions")) {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ questions: [{ id: "fixture-question", options: ["1"] }] }));
      return;
    }
    if (request.url?.startsWith("/api/lesson-entry")) {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ lessonEntryTarget: { slug: "fixture-lesson" } }));
      return;
    }
    if (request.url === "/api/attempts") {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(attemptBody);
      return;
    }
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end("{}");
  });
  t.after(fixture.close);

  const { report } = await executeClassroomLoad(
    { baseUrl: fixture.origin, cookie: "fixture-cookie", grade: "P1", rounds: 1, students: 1 },
    {
      env: {},
      resolveCookieSession: async () => ({
        baseUrl: fixture.origin,
        cookie: "fixture-cookie",
        loginMs: 0,
        userId: "fixture-user",
        username: "fixture"
      }),
      writeReport: async () => "fixture-artifact"
    }
  );
  return report;
}

test("classroom report fails an HTTP 200 attempt response with no persistence acknowledgement", async (t) => {
  const report = await runAttemptAcknowledgementFixture(t, JSON.stringify({ correct: true }));
  const attempt = report.results.find((result) => result.name === "attempts");
  assert.ok(attempt);
  assert.equal(attempt.errorCount, 1);
  assert.equal(attempt.ok, false);
  assert.equal(report.ok, false);
});

test("classroom report fails an HTTP 200 attempt response with invalid JSON", async (t) => {
  const report = await runAttemptAcknowledgementFixture(t, "not-json");
  const attempt = report.results.find((result) => result.name === "attempts");
  assert.ok(attempt);
  assert.equal(attempt.errorCount, 1);
  assert.equal(attempt.ok, false);
  assert.equal(report.ok, false);
});

test("a redirect after an acknowledged attempt aborts without writing a classroom artifact", async (t) => {
  const executeClassroomLoad = requiredExport("executeClassroomLoad");
  let attemptWrites = 0;
  let progressWrites = 0;
  let writeReportCalls = 0;
  const fixture = await listen((request, response) => {
    if (request.url?.startsWith("/api/questions")) {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ questions: [{ id: "fixture-question", options: ["1"] }] }));
      return;
    }
    if (request.url?.startsWith("/api/lesson-entry")) {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ lessonEntryTarget: { slug: "fixture-lesson" } }));
      return;
    }
    if (request.url === "/api/attempts") {
      attemptWrites += 1;
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ correct: true, persisted: true }));
      return;
    }
    if (request.url === "/api/lesson-progress") {
      progressWrites += 1;
      response.writeHead(307, { Location: "/login" });
      response.end();
      return;
    }
    response.writeHead(500);
    response.end();
  });
  t.after(fixture.close);

  await assert.rejects(
    () => executeClassroomLoad(
      { baseUrl: fixture.origin, cookie: "fixture-cookie", grade: "P1", rounds: 1, students: 1 },
      {
        env: {},
        resolveCookieSession: async () => ({
          baseUrl: fixture.origin,
          cookie: "fixture-cookie",
          loginMs: 0,
          userId: "fixture-user",
          username: "fixture"
        }),
        writeReport: async () => {
          writeReportCalls += 1;
          return "fixture-artifact";
        }
      }
    ),
    /redirect/u
  );

  assert.equal(attemptWrites, 1, "the original origin may already have accepted the attempt");
  assert.equal(progressWrites, 1);
  assert.equal(writeReportCalls, 0, "an aborted redirect run has no smoke artifact");
  assert.match(source("RELEASE.md"), /aborted redirect.*does not guarantee an artifact/is);
  assert.match(source("scripts/classroom-load-smoke.mjs"), /Writes never follow redirects\. A 3xx fails and throws without following/u);
});

test("authenticated classroom discovery preserves HK, Mainland, and non-California US curriculum scopes", async () => {
  const discoverWorkload = requiredExport("discoverWorkload");
  const fixtures = [
    { label: "Hong Kong", curriculumTrack: "HK" },
    { label: "Mainland PEP", curriculumTrack: "MAINLAND_PEP_HIGH" },
    { label: "North Carolina", curriculumTrack: "US_NC_MATH" }
  ];

  for (const fixture of fixtures) {
    const requestedUrls = [];
    const fetchImpl = async (url) => {
      requestedUrls.push(new URL(String(url)));
      return new Response(
        url.includes("/api/questions")
          ? JSON.stringify({ questions: [{ id: `${fixture.curriculumTrack}-question`, options: ["1"] }] })
          : JSON.stringify({ lessonEntryTarget: { slug: `${fixture.curriculumTrack}-lesson` } }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    };

    const workload = await discoverWorkload(
      { baseUrl: "https://preview.example", cookie: "fixture-cookie", userId: "fixture-user" },
      { grade: "S4", timeoutMs: 1_000 },
      { CLASSROOM_LOAD_CURRICULUM_TRACK: fixture.curriculumTrack },
      fetchImpl
    );
    const questionRequest = requestedUrls.find((url) => url.pathname === "/api/questions");
    assert.ok(questionRequest, `${fixture.label} must discover questions`);
    assert.equal(questionRequest.searchParams.get("curriculumTrack"), fixture.curriculumTrack);
    assert.equal(workload.questions[0]?.questionId, `${fixture.curriculumTrack}-question`);
  }
});

test("authenticated classroom discovery leaves curriculum selection to the signed-in student by default", async () => {
  const discoverWorkload = requiredExport("discoverWorkload");
  const requestedUrls = [];
  const fetchImpl = async (url) => {
    requestedUrls.push(new URL(String(url)));
    return new Response(
      url.includes("/api/questions")
        ? JSON.stringify({ questions: [{ id: "profile-scoped-question", options: ["1"] }] })
        : JSON.stringify({ lessonEntryTarget: { slug: "profile-scoped-lesson" } }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  };

  await discoverWorkload(
    { baseUrl: "https://preview.example", cookie: "fixture-cookie", userId: "fixture-user" },
    { grade: "S4", timeoutMs: 1_000 },
    {},
    fetchImpl
  );
  const questionRequest = requestedUrls.find((url) => url.pathname === "/api/questions");
  assert.ok(questionRequest);
  assert.equal(questionRequest.searchParams.has("curriculumTrack"), false);
});

test("demo login leaves curriculum selection to the authenticated student unless the operator explicitly supplies it", async () => {
  const loginIdentity = requiredExport("loginIdentity");
  let requestBody;

  const session = await loginIdentity(
    { password: "fixture-password", username: "Fixture Student" },
    { baseUrl: "https://preview.example", grade: "S4", timeoutMs: 1_000 },
    {},
    async (_url, options) => {
      requestBody = JSON.parse(String(options.body));
      return new Response(
        JSON.stringify({ user: { id: "fixture-user", role: "student" } }),
        { status: 200, headers: { "set-cookie": "mais_session=fixture; Path=/" } }
      );
    }
  );

  assert.equal(session.userId, "fixture-user");
  assert.equal(Object.hasOwn(requestBody, "curriculumTrack"), false);
});

test("login rejects a redirect before the foreign origin receives credentials", async (t) => {
  const loginIdentity = requiredExport("loginIdentity");
  let foreignRequests = 0;
  const foreign = await listen((_request, response) => {
    foreignRequests += 1;
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end("{\"authenticated\":true}");
  });
  t.after(foreign.close);

  const redirector = await listen((_request, response) => {
    response.writeHead(307, { Location: `${foreign.origin}/receive` });
    response.end();
  });
  t.after(redirector.close);

  await assert.rejects(
    () => loginIdentity(
      { password: "fixture-only", username: "Fixture" },
      { baseUrl: redirector.origin, grade: "6", timeoutMs: 1_000 },
      {},
      globalThis.fetch
    ),
    /redirect/u
  );
  assert.equal(foreignRequests, 0);
});

test("classroom Preview binding consumes provider-verified deployment evidence", async (t) => {
  const loadPreviewBinding = requiredExport("loadPreviewBinding");
  const root = await mkdtemp(path.join(tmpdir(), "mais-classroom-preview-binding-"));
  t.after(() => rm(root, { force: true, recursive: true }));
  const rawEvidencePath = path.join(root, "preview-deployment.json");
  const record = providerPreviewRecord();
  await writeFile(rawEvidencePath, `${JSON.stringify(record)}\n`, { mode: 0o600 });
  const evidencePath = await fsPromises.realpath(rawEvidencePath);

  const token = "fixture-vercel-token-1234567890";
  const requests = [];
  const binding = await loadPreviewBinding(record.deploymentUrl, {
    CLASSROOM_LOAD_EXPECTED_CANDIDATE_SHA: record.candidateSha,
    CLASSROOM_LOAD_PREVIEW_EVIDENCE_FILE: evidencePath,
    CLASSROOM_LOAD_VERCEL_TOKEN: token,
  }, {
    fetchImpl: async (url, options) => {
      requests.push({ options, url: String(url) });
      return new Response(JSON.stringify(providerDeploymentPayload(record)), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    },
  });

  assert.deepEqual(binding, {
    candidateSha: record.candidateSha,
    deploymentId: record.deploymentId,
    environment: "preview",
    immutableUrl: record.deploymentUrl,
    projectId: APPROVED_VERCEL_PROJECT_ID,
    projectName: APPROVED_VERCEL_PROJECT_NAME,
    teamId: APPROVED_VERCEL_TEAM_ID,
    teamSlug: APPROVED_VERCEL_TEAM_SLUG,
  });
  assert.equal(requests.length, 1);
  const request = requests[0];
  const requestUrl = new URL(request.url);
  assert.equal(requestUrl.origin, "https://api.vercel.com");
  assert.equal(requestUrl.pathname, `/v13/deployments/${record.deploymentId}`);
  assert.equal(requestUrl.searchParams.get("teamId"), APPROVED_VERCEL_TEAM_ID);
  assert.equal(request.options.method, "GET");
  assert.equal(request.options.redirect, "error");
  assert.equal(request.options.headers.authorization, `Bearer ${token}`);
  assert.doesNotMatch(JSON.stringify(binding), new RegExp(token, "u"));
});

test("classroom Preview binding rejects operator-shaped JSON and every identity mismatch", async (t) => {
  const loadPreviewBinding = requiredExport("loadPreviewBinding");
  const root = await mkdtemp(path.join(tmpdir(), "mais-classroom-preview-binding-invalid-"));
  t.after(() => rm(root, { force: true, recursive: true }));
  const rawEvidencePath = path.join(root, "preview-deployment.json");
  const record = providerPreviewRecord();
  await writeFile(rawEvidencePath, `${JSON.stringify(record)}\n`, { mode: 0o600 });
  const evidencePath = await fsPromises.realpath(rawEvidencePath);
  const env = {
    CLASSROOM_LOAD_EXPECTED_CANDIDATE_SHA: record.candidateSha,
    CLASSROOM_LOAD_PREVIEW_EVIDENCE_FILE: evidencePath,
    CLASSROOM_LOAD_VERCEL_TOKEN: "fixture-vercel-token-1234567890",
  };

  const invalidRecords = [
    {
      candidateSha: record.candidateSha,
      deploymentId: record.deploymentId,
      deploymentUrl: record.deploymentUrl,
      project: APPROVED_VERCEL_PROJECT_NAME,
      scope: APPROVED_VERCEL_TEAM_SLUG,
      target: "preview",
    },
    { ...record, target: "production" },
    { ...record, project: "wrong-project" },
    { ...record, scope: "wrong-team" },
    { ...record, candidateSha: "c".repeat(40) },
    { ...record, deploymentUrl: "https://preview-alias.example" },
    { ...record, providerEvidence: { ...record.providerEvidence, teamId: "team_wrong" } },
    { ...record, providerEvidence: { ...record.providerEvidence, sourceSha256Verified: false } },
    { ...record, stagingPackage: { ...record.stagingPackage, candidateSha: "f".repeat(40) } },
    {
      ...record,
      providerEvidence: {
        ...record.providerEvidence,
        sourcePackageEvidence: {
          ...record.providerEvidence.sourcePackageEvidence,
          sourceManifestRoot: "f".repeat(64),
        },
      },
    },
  ];

  for (const invalid of invalidRecords) {
    await writeFile(evidencePath, `${JSON.stringify(invalid)}\n`, { mode: 0o600 });
    await assert.rejects(
      () => loadPreviewBinding(record.deploymentUrl, env, {
        fetchImpl: async () => new Response(JSON.stringify(providerDeploymentPayload(record)), { status: 200 }),
      }),
      /Preview evidence|provider-verified|identity|candidate|immutable/i,
    );
  }

  await writeFile(evidencePath, `${JSON.stringify(record)}\n`, { mode: 0o600 });
  await assert.rejects(
    () => loadPreviewBinding(record.deploymentUrl, {
      ...env,
      CLASSROOM_LOAD_EXPECTED_CANDIDATE_SHA: "d".repeat(40),
    }, { fetchImpl: async () => { throw new Error("provider must not be reached"); } }),
    /candidate/i,
  );
  await assert.rejects(
    () => loadPreviewBinding("https://different-preview.vercel.app", env, {
      fetchImpl: async () => { throw new Error("provider must not be reached"); },
    }),
    /immutable|identity/i,
  );
});

test("cloned Preview receipt is rejected when authoritative provider revalidation fails before credentials", async (t) => {
  const executeClassroomLoad = requiredExport("executeClassroomLoad");
  const root = await mkdtemp(path.join(tmpdir(), "mais-classroom-preview-provider-failure-"));
  t.after(() => rm(root, { force: true, recursive: true }));
  const rawEvidencePath = path.join(root, "preview-deployment.json");
  const record = providerPreviewRecord();
  await writeFile(rawEvidencePath, `${JSON.stringify(record)}\n`, { mode: 0o600 });
  const evidencePath = await fsPromises.realpath(rawEvidencePath);
  const providerToken = "PROVIDER-TOKEN-MUST-NOT-LEAK-12345";
  const credentialKeys = new Set([
    "CLASSROOM_LOAD_COOKIE",
    "CLASSROOM_LOAD_DEMO_PASSWORD",
    "CLASSROOM_LOAD_PASSWORD",
    "DASHBOARD_SMOKE_PASSWORD",
  ]);
  let credentialReads = 0;
  const env = new Proxy({
    CLASSROOM_LOAD_APPROVED_ORIGIN: record.deploymentUrl,
    CLASSROOM_LOAD_BASE_URL: record.deploymentUrl,
    CLASSROOM_LOAD_EXPECTED_CANDIDATE_SHA: record.candidateSha,
    CLASSROOM_LOAD_PASSWORD: "LOGIN-CREDENTIAL-MUST-NOT-BE-READ",
    CLASSROOM_LOAD_PREVIEW_EVIDENCE_FILE: evidencePath,
    CLASSROOM_LOAD_USERNAME: "Fixture",
    CLASSROOM_LOAD_VERCEL_TOKEN: providerToken,
  }, {
    get(target, property, receiver) {
      if (credentialKeys.has(property)) credentialReads += 1;
      return Reflect.get(target, property, receiver);
    },
  });
  let argumentCredentialReads = 0;
  const args = {
    artifactDir: "",
    baseUrl: record.deploymentUrl,
    get cookie() {
      argumentCredentialReads += 1;
      return "";
    },
    grade: "P1",
    get password() {
      argumentCredentialReads += 1;
      return "LOGIN-CREDENTIAL-MUST-NOT-BE-READ";
    },
    rounds: 1,
    students: 1,
    username: "Fixture",
  };
  let providerFetchCalls = 0;
  let loginCalls = 0;
  let discoveryCalls = 0;
  let writeCalls = 0;

  await assert.rejects(
    () => executeClassroomLoad(args, {
      env,
      previewProviderFetch: async () => {
        providerFetchCalls += 1;
        return new Response(JSON.stringify({ error: "provider unavailable" }), { status: 503 });
      },
      loginIdentity: async () => {
        loginCalls += 1;
        throw new Error("login must not be reached");
      },
      discoverWorkload: async () => {
        discoveryCalls += 1;
        throw new Error("discovery must not be reached");
      },
      writeReport: async () => {
        writeCalls += 1;
        throw new Error("write must not be reached");
      },
    }),
    (error) => {
      assert.match(error.message, /provider.*revalidation|management API|provider evidence/i);
      assert.doesNotMatch(error.message, new RegExp(providerToken, "u"));
      return true;
    },
  );
  assert.equal(providerFetchCalls, 1);
  assert.equal(credentialReads, 0);
  assert.equal(argumentCredentialReads, 0);
  assert.equal(loginCalls, 0);
  assert.equal(discoveryCalls, 0);
  assert.equal(writeCalls, 0);
});

test("the real CLI entrypoint defers every classroom credential until provider revalidation", async (t) => {
  const runClassroomLoadCli = requiredExport("runClassroomLoadCli");
  const root = await mkdtemp(path.join(tmpdir(), "mais-classroom-cli-provider-first-"));
  t.after(() => rm(root, { force: true, recursive: true }));
  const rawEvidencePath = path.join(root, "preview-deployment.json");
  const record = providerPreviewRecord();
  await writeFile(rawEvidencePath, `${JSON.stringify(record)}\n`, { mode: 0o600 });
  const evidencePath = await fsPromises.realpath(rawEvidencePath);
  const secretValues = {
    CLASSROOM_LOAD_COOKIE: "COOKIE-MUST-NOT-BE-READ",
    CLASSROOM_LOAD_DEMO_PASSWORD: "DEMO-PASSWORD-MUST-NOT-BE-READ",
    CLASSROOM_LOAD_PASSWORD: "PASSWORD-MUST-NOT-BE-READ",
    CLASSROOM_LOAD_USERNAME: "ENV-USERNAME-MUST-NOT-BE-READ",
    CLASSROOM_LOAD_VERCEL_PROTECTION_BYPASS_SECRET: "BYPASS-MUST-NOT-BE-READ",
    DASHBOARD_SMOKE_PASSWORD: "DASHBOARD-PASSWORD-MUST-NOT-BE-READ",
    DASHBOARD_SMOKE_VERCEL_PROTECTION_BYPASS_SECRET: "DASHBOARD-BYPASS-MUST-NOT-BE-READ",
    VERCEL_AUTOMATION_BYPASS_SECRET: "AUTOMATION-BYPASS-MUST-NOT-BE-READ",
  };
  let classroomCredentialReads = 0;
  let providerTokenReads = 0;
  const env = new Proxy({
    ...secretValues,
    CLASSROOM_LOAD_APPROVED_ORIGIN: record.deploymentUrl,
    CLASSROOM_LOAD_BASE_URL: record.deploymentUrl,
    CLASSROOM_LOAD_EXPECTED_CANDIDATE_SHA: record.candidateSha,
    CLASSROOM_LOAD_PREVIEW_EVIDENCE_FILE: evidencePath,
    CLASSROOM_LOAD_VERCEL_TOKEN: "fixture-vercel-token-1234567890",
  }, {
    get(target, property, receiver) {
      if (Object.hasOwn(secretValues, property)) classroomCredentialReads += 1;
      if (property === "CLASSROOM_LOAD_VERCEL_TOKEN") providerTokenReads += 1;
      return Reflect.get(target, property, receiver);
    },
  });
  let argvUsernameReads = 0;
  const argv = new Proxy(["--username", "ARGV-USERNAME-MUST-NOT-BE-READ", "--students", "1"], {
    get(target, property, receiver) {
      if (property === "1") argvUsernameReads += 1;
      return Reflect.get(target, property, receiver);
    },
  });
  const printed = [];
  let assignedExitCode = null;
  let providerFetchCalls = 0;

  const succeeded = await runClassroomLoadCli(argv, env, {
    previewProviderFetch: async () => {
      providerFetchCalls += 1;
      return new Response(JSON.stringify({ error: "provider unavailable" }), { status: 503 });
    },
    printError: (message) => printed.push(message),
    setExitCode: (code) => { assignedExitCode = code; },
  });

  assert.equal(succeeded, false);
  assert.equal(assignedExitCode, 1);
  assert.equal(providerFetchCalls, 1);
  assert.ok(providerTokenReads >= 1, "the task-scoped provider token is allowed before revalidation");
  assert.equal(classroomCredentialReads, 0);
  assert.equal(argvUsernameReads, 0);
  assert.equal(printed.length, 1);
  for (const secret of [...Object.values(secretValues), "ARGV-USERNAME-MUST-NOT-BE-READ"]) {
    assert.doesNotMatch(printed[0], new RegExp(secret, "u"));
  }
  assert.match(printed[0], /provider revalidation|management API/i);
});

test("classroom Preview binding rejects every authoritative provider identity mismatch", async (t) => {
  const loadPreviewBinding = requiredExport("loadPreviewBinding");
  const root = await mkdtemp(path.join(tmpdir(), "mais-classroom-preview-provider-invalid-"));
  t.after(() => rm(root, { force: true, recursive: true }));
  const rawEvidencePath = path.join(root, "preview-deployment.json");
  const record = providerPreviewRecord();
  await writeFile(rawEvidencePath, `${JSON.stringify(record)}\n`, { mode: 0o600 });
  const evidencePath = await fsPromises.realpath(rawEvidencePath);
  const env = {
    CLASSROOM_LOAD_EXPECTED_CANDIDATE_SHA: record.candidateSha,
    CLASSROOM_LOAD_PREVIEW_EVIDENCE_FILE: evidencePath,
    CLASSROOM_LOAD_VERCEL_TOKEN: "fixture-vercel-token-1234567890",
  };
  const payload = providerDeploymentPayload(record);
  const invalidPayloads = [
    { ...payload, id: "dpl_WrongDeployment" },
    { ...payload, url: "wrong-preview.vercel.app" },
    { ...payload, readyState: "BUILDING" },
    { ...payload, target: "production" },
    { ...payload, projectId: "prj_wrong" },
    { ...payload, project: { ...payload.project, name: "wrong-project" } },
    { ...payload, ownerId: "team_wrong" },
    { ...payload, team: { ...payload.team, slug: "wrong-team" } },
    { ...payload, source: "github" },
    { ...payload, meta: { maisCandidateSha: "f".repeat(40) } },
  ];

  for (const invalidPayload of invalidPayloads) {
    await assert.rejects(
      () => loadPreviewBinding(record.deploymentUrl, env, {
        fetchImpl: async () => new Response(JSON.stringify(invalidPayload), { status: 200 }),
      }),
      /provider.*revalidation|provider evidence|identity/i,
    );
  }
});

test("classroom Preview binding rejects a login resolved away from the immutable deployment", async () => {
  const executeClassroomLoad = requiredExport("executeClassroomLoad");
  let discoveryCalls = 0;
  await assert.rejects(
    () => executeClassroomLoad(
      {
        baseUrl: "https://preview.example",
        cookie: "",
        grade: "P1",
        password: "fixture-only",
        rounds: 1,
        students: 1,
        username: "Fixture",
      },
      {
        env: { CLASSROOM_LOAD_APPROVED_ORIGIN: "https://preview.example" },
        loadPreviewBinding: async () => ({ immutableUrl: "https://preview.example" }),
        loginIdentity: async () => ({
          baseUrl: "https://other-preview.example",
          cookie: "fixture-cookie",
          loginMs: 1,
          userId: "fixture-user",
          username: "Fixture",
        }),
        discoverWorkload: async () => {
          discoveryCalls += 1;
          return { lessonSlug: "fixture-lesson", questions: [] };
        },
      },
    ),
    /immutable|Preview binding/i,
  );
  assert.equal(discoveryCalls, 0);
});

test("report writer rejects symlink and hardlink results without modifying their targets", async (t) => {
  const writeReport = requiredExport("writeReport");
  const root = await mkdtemp(path.join(tmpdir(), "mais-classroom-linked-result-"));
  t.after(() => rm(root, { force: true, recursive: true }));

  const outside = path.join(root, "outside.json");
  const result = path.join(root, "last-run.json");
  await writeFile(outside, "outside\n", { mode: 0o600 });
  await symlink(outside, result);
  await assert.rejects(() => writeReport({ unsafe: "symlink" }, root), /symlink|regular file|node type/i);
  assert.equal(await readFile(outside, "utf8"), "outside\n");

  await unlink(result);
  await link(outside, result);
  await assert.rejects(() => writeReport({ unsafe: "hardlink" }, root), /hardlink/i);
  assert.equal(await readFile(outside, "utf8"), "outside\n");
});

test("report writer rejects directory replacement between admission and lock creation", async (t) => {
  const writeReport = requiredExport("writeReport");
  const root = await mkdtemp(path.join(tmpdir(), "mais-classroom-admission-race-"));
  const displaced = `${root}-displaced`;
  t.after(async () => {
    await rm(root, { force: true, recursive: true });
    await rm(displaced, { force: true, recursive: true });
  });

  await assert.rejects(
    () => writeReport(
      { unsafe: "directory-replacement" },
      root,
      {},
      {
        beforeLock: async () => {
          await rename(root, displaced);
          await mkdir(root, { mode: 0o700 });
        }
      }
    ),
    /changed|replacement|race|artifact directory/i
  );
});

test("report writer fails closed when an absent destination appears before commit", async (t) => {
  const writeReport = requiredExport("writeReport");
  const root = await mkdtemp(path.join(tmpdir(), "mais-classroom-absent-present-race-"));
  t.after(() => rm(root, { force: true, recursive: true }));
  const result = path.join(root, "last-run.json");

  await assert.rejects(
    () => writeReport(
      { race: "absent-present" },
      root,
      {},
      {
        beforeCommit: async () => {
          await writeFile(result, "external-writer\n", { mode: 0o600 });
        }
      }
    ),
    /changed|replacement|race|concurrent|artifact result/i
  );
  assert.equal(await readFile(result, "utf8"), "external-writer\n");
});

test("report writer fails closed when an existing destination changes before commit", async (t) => {
  const writeReport = requiredExport("writeReport");
  const root = await mkdtemp(path.join(tmpdir(), "mais-classroom-changed-race-"));
  t.after(() => rm(root, { force: true, recursive: true }));
  const result = path.join(root, "last-run.json");
  await writeFile(result, "original\n", { mode: 0o600 });

  await assert.rejects(
    () => writeReport(
      { race: "changed" },
      root,
      {},
      {
        beforeCommit: async () => {
          await rm(result);
          await writeFile(result, "external-replacement\n", { mode: 0o600 });
        }
      }
    ),
    /changed|replacement|race|concurrent|artifact result/i
  );
  assert.equal(await readFile(result, "utf8"), "external-replacement\n");
});

test("report writer fingerprints an in-place destination mutation before commit", async (t) => {
  const writeReport = requiredExport("writeReport");
  const root = await mkdtemp(path.join(tmpdir(), "mais-classroom-in-place-race-"));
  t.after(() => rm(root, { force: true, recursive: true }));
  const result = path.join(root, "last-run.json");
  await writeFile(result, "original\n", { mode: 0o600 });

  await assert.rejects(
    () => writeReport(
      { race: "in-place" },
      root,
      {},
      {
        beforeCommit: async () => {
          await writeFile(result, "external-in-place\n", { mode: 0o600 });
        }
      }
    ),
    /changed|replacement|race|concurrent|artifact result/i
  );
  assert.equal(await readFile(result, "utf8"), "external-in-place\n");
});

test("report writer fails closed without following an artifact symlink in the fingerprint read window", async (t) => {
  const writeReport = requiredExport("writeReport");
  const root = await mkdtemp(path.join(tmpdir(), "mais-classroom-fingerprint-symlink-race-"));
  t.after(() => rm(root, { force: true, recursive: true }));
  const result = path.join(root, "last-run.json");
  const sentinel = path.join(root, "foreign-sentinel.txt");
  await writeFile(result, "original\n", { mode: 0o600 });
  await writeFile(sentinel, "FOREIGN-SENTINEL-MUST-NOT-BE-READ\n", { mode: 0o600 });
  const canonicalResult = await fsPromises.realpath(result);

  let openedPath;
  let openedFlags;
  const originalOpen = fsPromises.open;
  t.mock.method(fsPromises, "open", (...args) => {
    if (String(args[0]) === canonicalResult) {
      openedPath ??= args[0];
      openedFlags ??= args[1];
    }
    return originalOpen(...args);
  });

  await assert.rejects(
    () => writeReport(
      { race: "fingerprint-symlink" },
      root,
      {},
      {
        beforeFingerprintRead: async () => {
          await rm(result);
          await symlink(sentinel, result);
        }
      }
    ),
    /symlink|changed|replacement|race|artifact result|no-follow|unsafe/i
  );
  assert.equal(openedPath, canonicalResult);
  assert.equal(typeof openedFlags, "number");
  assert.equal(
    openedFlags & fsConstants.O_NOFOLLOW,
    fsConstants.O_NOFOLLOW,
    "fingerprinting must open the artifact with O_NOFOLLOW"
  );
  assert.equal(await readFile(sentinel, "utf8"), "FOREIGN-SENTINEL-MUST-NOT-BE-READ\n");
});

test("report writer refuses an attacker replacement of its temporary artifact before rename", async (t) => {
  const writeReport = requiredExport("writeReport");
  const root = await mkdtemp(path.join(tmpdir(), "mais-classroom-temp-replacement-race-"));
  t.after(() => rm(root, { force: true, recursive: true }));
  const result = path.join(root, "last-run.json");
  await writeFile(result, "original-artifact\n", { mode: 0o600 });

  await assert.rejects(
    () => writeReport(
      { race: "temporary-replacement" },
      root,
      {},
      {
        beforeRename: async ({ temporaryPath }) => {
          await rm(temporaryPath);
          await writeFile(temporaryPath, "ATTACKER-TEMP-CONTENT\n", { mode: 0o600 });
        }
      }
    ),
    /changed|replacement|race|concurrent|artifact result/i
  );
  assert.equal(await readFile(result, "utf8"), "original-artifact\n");
  assert.notEqual(await readFile(result, "utf8"), "ATTACKER-TEMP-CONTENT\n");
});

for (const [phase, label] of [
  ["chmod", "chmod"],
  ["writeFile", "write"],
  ["sync", "file fsync"],
  ["stat", "first stat"],
]) {
  test(`report writer removes its fd-confirmed temporary artifact after ${label} failure`, async (t) => {
    const writeReport = requiredExport("writeReport");
    const root = await mkdtemp(path.join(tmpdir(), `mais-classroom-temp-${phase}-failure-`));
    t.after(() => rm(root, { force: true, recursive: true }));
    const lock = path.join(root, ".last-run.json.lock");
    const canonicalRoot = await fsPromises.realpath(root);
    const state = mockTemporaryReportHandle(t, canonicalRoot, { failPhase: phase });

    await assert.rejects(
      () => writeReport({ failure: phase }, root),
      new RegExp(`fixture temporary ${phase} failure`, "u"),
    );

    assert.equal(state.events[0], "stat", "the O_EXCL-created inode must be fd-bound before mutation");
    assert.ok(state.temporaryPath);
    assert.equal(existsSync(state.temporaryPath), false, "only the fd-confirmed owned temporary may be removed");
    assert.equal(existsSync(lock), false, "the independently owned lock must also be cleaned");
    assert.deepEqual(await readdir(root), []);
    await assert.rejects(() => state.rawHandle.stat(), /closed|EBADF/i);
  });
}

test("report writer preserves a foreign replacement after temporary chmod failure", async (t) => {
  const writeReport = requiredExport("writeReport");
  const root = await mkdtemp(path.join(tmpdir(), "mais-classroom-temp-chmod-replacement-"));
  t.after(() => rm(root, { force: true, recursive: true }));
  const lock = path.join(root, ".last-run.json.lock");
  const foreign = "FOREIGN-TEMP-REPLACEMENT\n";
  const canonicalRoot = await fsPromises.realpath(root);
  const state = mockTemporaryReportHandle(t, canonicalRoot, {
    failPhase: "chmod",
    onFailure: async ({ temporaryPath }) => {
      await unlink(temporaryPath);
      await writeFile(temporaryPath, foreign, { mode: 0o600 });
    },
  });

  await assert.rejects(() => writeReport({ failure: "foreign" }, root), /fixture temporary chmod failure/u);

  assert.equal(state.events[0], "stat", "ownership identity must be retained before chmod");
  assert.equal(await readFile(state.temporaryPath, "utf8"), foreign);
  assert.equal(existsSync(lock), false, "lock cleanup must not require deleting a foreign temporary");
  assert.deepEqual(await readdir(root), [path.basename(state.temporaryPath)]);
  await assert.rejects(() => state.rawHandle.stat(), /closed|EBADF/i);
});

test("report writer fails closed when temporary fd identity cannot be reconfirmed", async (t) => {
  const writeReport = requiredExport("writeReport");
  const root = await mkdtemp(path.join(tmpdir(), "mais-classroom-temp-stat-unconfirmed-"));
  t.after(() => rm(root, { force: true, recursive: true }));
  const lock = path.join(root, ".last-run.json.lock");
  const canonicalRoot = await fsPromises.realpath(root);
  const state = mockTemporaryReportHandle(t, canonicalRoot, { failEveryStat: true, failPhase: "stat" });

  await assert.rejects(() => writeReport({ failure: "unconfirmed" }, root), /fixture temporary stat failure/u);

  assert.ok(
    state.events.filter((event) => event === "stat").length >= 2,
    "cleanup must retry the retained fd identity before deciding whether deletion is safe",
  );
  assert.equal(existsSync(state.temporaryPath), true, "unconfirmed ownership must preserve the pathname");
  assert.equal(existsSync(lock), false, "the separately confirmed lock remains cleanup-safe");
  assert.deepEqual(await readdir(root), [path.basename(state.temporaryPath)]);
  await assert.rejects(() => state.rawHandle.stat(), /closed|EBADF/i);
});

test("report writer fails closed when an existing destination changes only its mtime", async (t) => {
  const writeReport = requiredExport("writeReport");
  const root = await mkdtemp(path.join(tmpdir(), "mais-classroom-mtime-race-"));
  t.after(() => rm(root, { force: true, recursive: true }));
  const result = path.join(root, "last-run.json");
  await writeFile(result, "same-size-content\n", { mode: 0o600 });
  await utimes(result, new Date(1_000), new Date(2_000));

  await assert.rejects(
    () => writeReport(
      { race: "mtime-only" },
      root,
      {},
      {
        beforeCommit: async () => {
          await utimes(result, new Date(1_000), new Date(4_000));
        }
      }
    ),
    /changed|replacement|race|concurrent|artifact result/i
  );
  assert.equal(await readFile(result, "utf8"), "same-size-content\n");
});

test("report writer fails closed when an existing destination is removed before commit", async (t) => {
  const writeReport = requiredExport("writeReport");
  const root = await mkdtemp(path.join(tmpdir(), "mais-classroom-removed-race-"));
  t.after(() => rm(root, { force: true, recursive: true }));
  const result = path.join(root, "last-run.json");
  await writeFile(result, "original\n", { mode: 0o600 });

  await assert.rejects(
    () => writeReport(
      { race: "removed" },
      root,
      {},
      { beforeCommit: async () => rm(result) }
    ),
    /changed|replacement|race|concurrent|artifact result/i
  );
  assert.equal(existsSync(result), false);
});

test("report writer refuses a replacement in the final pre-rename race", async (t) => {
  const writeReport = requiredExport("writeReport");
  const root = await mkdtemp(path.join(tmpdir(), "mais-classroom-pre-rename-race-"));
  t.after(() => rm(root, { force: true, recursive: true }));
  const result = path.join(root, "last-run.json");
  await writeFile(result, "original\n", { mode: 0o600 });

  await assert.rejects(
    () => writeReport(
      { race: "pre-rename" },
      root,
      {},
      {
        beforeRename: async () => {
          await rm(result);
          await writeFile(result, "external-pre-rename\n", { mode: 0o600 });
        }
      }
    ),
    /changed|replacement|race|concurrent|artifact result/i
  );
  assert.equal(await readFile(result, "utf8"), "external-pre-rename\n");
});

test("report writer refuses a final directory replacement and cleans only its own transaction", async (t) => {
  const writeReport = requiredExport("writeReport");
  const root = await mkdtemp(path.join(tmpdir(), "mais-classroom-final-directory-race-"));
  const displaced = `${root}-displaced`;
  t.after(async () => {
    await rm(root, { force: true, recursive: true });
    await rm(displaced, { force: true, recursive: true });
  });

  await assert.rejects(
    () => writeReport(
      { race: "final-directory-replacement" },
      root,
      {},
      {
        beforeCommit: async () => {
          await rename(root, displaced);
          await mkdir(root, { mode: 0o700 });
        }
      }
    ),
    /changed|replacement|race|artifact directory/i
  );
  assert.equal(existsSync(path.join(root, "last-run.json")), false);
  assert.equal(existsSync(path.join(root, ".last-run.json.lock")), false);
  assert.equal(
    existsSync(path.join(displaced, ".last-run.json.lock")),
    true,
    "a replaced directory keeps the owned lock quarantined; cleanup must not follow the replacement path"
  );
});

test("report writer does not clean a replacement directory's lock after lock admission", async (t) => {
  const writeReport = requiredExport("writeReport");
  const root = await mkdtemp(path.join(tmpdir(), "mais-classroom-lock-directory-race-"));
  const displaced = `${root}-displaced`;
  t.after(async () => {
    await rm(root, { force: true, recursive: true });
    await rm(displaced, { force: true, recursive: true });
  });

  await assert.rejects(
    () => writeReport(
      { race: "after-lock-directory-replacement" },
      root,
      {},
      {
        afterLock: async () => {
          await rename(root, displaced);
          await mkdir(root, { mode: 0o700 });
        }
      }
    ),
    /changed|replacement|race|artifact directory/i
  );
  assert.equal(existsSync(path.join(root, ".last-run.json.lock")), false);
  assert.equal(
    existsSync(path.join(displaced, ".last-run.json.lock")),
    true,
    "cleanup must not follow a replacement directory path"
  );
});

test("report writer preserves fd-bound SHA detection for same-inode same-length changes", async (t) => {
  const writeReport = requiredExport("writeReport");
  const root = await mkdtemp(path.join(tmpdir(), "mais-classroom-same-inode-digest-"));
  t.after(() => rm(root, { force: true, recursive: true }));
  const result = path.join(root, "last-run.json");
  await writeFile(result, "original\n", { mode: 0o600 });
  const before = await lstat(result);

  await assert.rejects(
    () => writeReport(
      { race: "same-inode-same-length" },
      root,
      {},
      {
        beforeCommit: async () => {
          await writeFile(result, "mutated!\n", { mode: 0o600 });
          const after = await lstat(result);
          assert.equal(after.dev, before.dev);
          assert.equal(after.ino, before.ino);
          assert.equal(after.size, before.size);
        },
      },
    ),
    /changed|fingerprint|race|artifact result/i,
  );
  assert.equal(await readFile(result, "utf8"), "mutated!\n");
});

test("report writer cleans only its owned temporary file and lock after rejection", async (t) => {
  const writeReport = requiredExport("writeReport");
  const root = await mkdtemp(path.join(tmpdir(), "mais-classroom-owned-cleanup-"));
  t.after(() => rm(root, { force: true, recursive: true }));
  const result = path.join(root, "last-run.json");
  const lock = path.join(root, ".last-run.json.lock");
  let temporaryPath = "";

  await assert.rejects(
    () => writeReport(
      { race: "owned-cleanup" },
      root,
      {},
      {
        beforeCommit: async (paths) => {
          temporaryPath = paths.temporaryPath;
          await writeFile(result, "external-writer\n", { mode: 0o600 });
        },
      },
    ),
    /changed|race|artifact result/i,
  );

  assert.equal(await readFile(result, "utf8"), "external-writer\n");
  assert.equal(existsSync(temporaryPath), false);
  assert.equal(existsSync(lock), false);
  assert.deepEqual(await readdir(root), ["last-run.json"]);
});

test("report writer fails closed when its owned lock entry is replaced", async (t) => {
  const writeReport = requiredExport("writeReport");
  const root = await mkdtemp(path.join(tmpdir(), "mais-classroom-lock-entry-race-"));
  t.after(() => rm(root, { force: true, recursive: true }));
  const result = path.join(root, "last-run.json");
  const lock = path.join(root, ".last-run.json.lock");
  let retainedLockHandle;

  await assert.rejects(
    () => writeReport(
      { race: "lock-entry-replacement" },
      root,
      {},
      {
        afterLock: async ({ lockHandle }) => {
          assert.ok(lockHandle, "writer retains a no-follow lock-directory handle");
          retainedLockHandle = lockHandle;
          const fdBeforeReplacement = await lockHandle.stat();
          await rm(lock, { recursive: true });
          await mkdir(lock, { mode: 0o700 });
          const fdAfterReplacement = await lockHandle.stat();
          const pathnameAfterReplacement = await lstat(lock);
          assert.equal(fdAfterReplacement.dev, fdBeforeReplacement.dev);
          assert.equal(fdAfterReplacement.ino, fdBeforeReplacement.ino);
          assert.notDeepEqual(
            [pathnameAfterReplacement.dev, pathnameAfterReplacement.ino],
            [fdAfterReplacement.dev, fdAfterReplacement.ino],
            "the retained old directory fd makes a pathname replacement deterministic",
          );
        },
      },
    ),
    /lock|changed|replacement|race/i,
  );

  assert.equal(existsSync(result), false);
  assert.equal(existsSync(lock), true, "foreign replacement lock must not be cleaned");
  await assert.rejects(() => retainedLockHandle.stat(), /closed|EBADF/i);
});

test("report writer fsyncs the admitted target directory after atomic rename", async (t) => {
  const writeReport = requiredExport("writeReport");
  const root = await mkdtemp(path.join(tmpdir(), "mais-classroom-directory-fsync-"));
  t.after(() => rm(root, { force: true, recursive: true }));
  const result = path.join(root, "last-run.json");
  const canonicalRoot = await fsPromises.realpath(root);
  const originalOpen = fsPromises.open;
  let directorySyncCalls = 0;
  let resultPresentWhenSynced = false;

  t.mock.method(fsPromises, "open", async (...args) => {
    const handle = await originalOpen(...args);
    if (path.resolve(String(args[0])) !== canonicalRoot) return handle;
    return new Proxy(handle, {
      get(target, property) {
        if (property === "sync") {
          return async () => {
            directorySyncCalls += 1;
            resultPresentWhenSynced = existsSync(result);
            return target.sync();
          };
        }
        const value = Reflect.get(target, property, target);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
  });

  await writeReport({ durable: true }, root);
  assert.equal(directorySyncCalls, 1);
  assert.equal(resultPresentWhenSynced, true, "directory fsync must follow rename publication");
  assert.deepEqual(JSON.parse(await readFile(result, "utf8")), { durable: true });
});

test("directory fsync failure rejects after complete publication and cleans owned entries", async (t) => {
  const writeReport = requiredExport("writeReport");
  const root = await mkdtemp(path.join(tmpdir(), "mais-classroom-directory-fsync-failure-"));
  t.after(() => rm(root, { force: true, recursive: true }));
  const result = path.join(root, "last-run.json");
  const canonicalRoot = await fsPromises.realpath(root);
  const originalOpen = fsPromises.open;

  t.mock.method(fsPromises, "open", async (...args) => {
    const handle = await originalOpen(...args);
    if (path.resolve(String(args[0])) !== canonicalRoot) return handle;
    return new Proxy(handle, {
      get(target, property) {
        if (property === "sync") return async () => { throw new Error("fixture directory fsync failure"); };
        const value = Reflect.get(target, property, target);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
  });

  await assert.rejects(() => writeReport({ durable: false }, root), /fsync failure/u);
  assert.deepEqual(JSON.parse(await readFile(result, "utf8")), { durable: false });
  assert.deepEqual(await readdir(root), ["last-run.json"]);
});

test("reports and printable failures exclude credential and identity sentinels", async () => {
  const executeClassroomLoad = requiredExport("executeClassroomLoad");
  const parseArgs = requiredExport("parseArgs");
  const redactSensitiveText = requiredExport("redactSensitiveText");
  const sentinels = {
    bypass: "BYPASS-SENTINEL-9c28",
    cookie: "COOKIE-SENTINEL-b7a1",
    password: "PASSWORD-SENTINEL-f40e",
    userId: "USER-ID-SENTINEL-551d"
  };
  const env = {
    CLASSROOM_LOAD_APPROVED_ORIGIN: "https://preview.example",
    CLASSROOM_LOAD_BASE_URL: "https://preview.example",
    CLASSROOM_LOAD_PASSWORD: sentinels.password,
    VERCEL_AUTOMATION_BYPASS_SECRET: sentinels.bypass
  };
  let serializedArtifact = "";
  const { report } = await executeClassroomLoad(
    parseArgs(["--username", "Fixture", "--students", "1", "--rounds", "1"], env),
    {
      env,
      loadPreviewBinding: async (baseUrl) => ({ immutableUrl: baseUrl }),
      loginIdentity: async (identity) => ({
        baseUrl: "https://preview.example",
        cookie: sentinels.cookie,
        loginMs: 1,
        userId: sentinels.userId,
        username: identity.username
      }),
      discoverWorkload: async () => ({
        lessonSlug: "fixture-lesson",
        questions: [{ questionId: "fixture-question", selectedAnswer: "1" }]
      }),
      runSeatRound: async (session, _workload, _config, round) => [
        { elapsedMs: 1, endpoint: "attempts", ok: true, round, seat: session.seat, status: 200 },
        { elapsedMs: 1, endpoint: "lesson-progress", ok: true, round, seat: session.seat, status: 200 },
        { elapsedMs: 1, endpoint: "dashboard", ok: true, round, seat: session.seat, status: 200 }
      ],
      writeReport: async (candidate) => {
        serializedArtifact = JSON.stringify(candidate);
        return "fixture-artifact";
      }
    }
  );
  const serializedReport = JSON.stringify(report);
  for (const sentinel of Object.values(sentinels)) {
    assert.doesNotMatch(serializedReport, new RegExp(sentinel, "u"));
    assert.doesNotMatch(serializedArtifact, new RegExp(sentinel, "u"));
  }
  const unsafeFailure = `request failed cookie=${sentinels.cookie} password=${sentinels.password} bypass=${sentinels.bypass} user=${sentinels.userId}`;
  const printableFailure = redactSensitiveText(unsafeFailure, Object.values(sentinels));
  for (const sentinel of Object.values(sentinels)) {
    assert.doesNotMatch(printableFailure, new RegExp(sentinel, "u"));
  }
  assert.match(printableFailure, /\[REDACTED\]/u);
});

test("the CLI redacts every supported credential alias and explicit username", async (t) => {
  const classroomSensitiveValues = requiredExport("classroomSensitiveValues");
  const reflector = await listen(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const bodyText = Buffer.concat(chunks).toString("utf8");
    let body = {};
    try {
      body = JSON.parse(bodyText);
    } catch {}
    const reflected =
      request.headers["x-vercel-protection-bypass"] ||
      request.headers.cookie ||
      body.password ||
      body.username ||
      "missingcredential";
    response.writeHead(307, { Location: `https://${reflected}.example/receive` });
    response.end();
  });
  t.after(reflector.close);

  const scenarios = [
    {
      env: { CLASSROOM_LOAD_COOKIE: "cookiealias19" },
      key: "CLASSROOM_LOAD_COOKIE",
      secret: "cookiealias19"
    },
    {
      env: { CLASSROOM_LOAD_PASSWORD: "passwordalias27", CLASSROOM_LOAD_USERNAME: "fixtureuser" },
      key: "CLASSROOM_LOAD_PASSWORD",
      secret: "passwordalias27"
    },
    {
      env: { CLASSROOM_LOAD_PASSWORD: "fixedpassword", CLASSROOM_LOAD_USERNAME: "usernamealias31" },
      key: "CLASSROOM_LOAD_USERNAME",
      secret: "usernamealias31"
    },
    {
      env: { CLASSROOM_LOAD_DEMO_PASSWORD: "demopassword41", CLASSROOM_LOAD_USE_DEMO_LOGIN: "1" },
      key: "CLASSROOM_LOAD_DEMO_PASSWORD",
      secret: "demopassword41"
    },
    {
      env: { DASHBOARD_SMOKE_PASSWORD: "dashboardpassword43", DASHBOARD_SMOKE_USE_DEMO_LOGIN: "1" },
      key: "DASHBOARD_SMOKE_PASSWORD",
      secret: "dashboardpassword43"
    },
    {
      env: {
        CLASSROOM_LOAD_PASSWORD: "fixedpassword",
        CLASSROOM_LOAD_USERNAME: "fixtureuser",
        CLASSROOM_LOAD_VERCEL_PROTECTION_BYPASS_SECRET: "classroombypass47"
      },
      key: "CLASSROOM_LOAD_VERCEL_PROTECTION_BYPASS_SECRET",
      secret: "classroombypass47"
    },
    {
      env: {
        CLASSROOM_LOAD_PASSWORD: "fixedpassword",
        CLASSROOM_LOAD_USERNAME: "fixtureuser",
        DASHBOARD_SMOKE_VERCEL_PROTECTION_BYPASS_SECRET: "dashboardbypass53"
      },
      key: "DASHBOARD_SMOKE_VERCEL_PROTECTION_BYPASS_SECRET",
      secret: "dashboardbypass53"
    },
    {
      env: {
        CLASSROOM_LOAD_PASSWORD: "fixedpassword",
        CLASSROOM_LOAD_USERNAME: "fixtureuser",
        VERCEL_AUTOMATION_BYPASS_SECRET: "automationbypass59"
      },
      key: "VERCEL_AUTOMATION_BYPASS_SECRET",
      secret: "automationbypass59"
    }
  ];

  for (const scenario of scenarios) {
    const env = {
      CLASSROOM_LOAD_BASE_URL: reflector.origin,
      CLASSROOM_LOAD_ROUNDS: "1",
      CLASSROOM_LOAD_STUDENTS: "1",
      ...scenario.env
    };
    assert.ok(
      classroomSensitiveValues({}, env).includes(scenario.secret),
      `${scenario.key} must be included in the shared redaction source`
    );
    let failure;
    try {
      await execFileAsync(process.execPath, [smokePath], {
        cwd: repoRoot,
        env,
        maxBuffer: 1024 * 1024,
        timeout: 10_000
      });
    } catch (error) {
      failure = error;
    }
    assert.ok(failure, `${scenario.key} probe must fail on the refused redirect`);
    const stderr = String(failure.stderr ?? "");
    assert.doesNotMatch(stderr, new RegExp(scenario.secret, "u"));
    assert.match(stderr, /\[REDACTED\]/u);
  }
});

test("required governance executes the security self-test concurrently without shared fixtures", async () => {
  const options = { cwd: repoRoot, maxBuffer: 1024 * 1024, timeout: 60_000 };
  const [left, right] = await Promise.all([
    execFileAsync(process.execPath, [smokePath, "--self-test"], options),
    execFileAsync(process.execPath, [smokePath, "--self-test"], options)
  ]);
  assert.match(left.stdout, /classroom-load-smoke self-test: PASS/u);
  assert.match(right.stdout, /classroom-load-smoke self-test: PASS/u);
  assert.equal(left.stderr, "");
  assert.equal(right.stderr, "");
});

test("classroom smoke artifacts stay in ignored local-only storage", () => {
  assert.match(source(".gitignore"), /^\.tmp\/?$/mu);
  assert.doesNotMatch(source("package.json"), /classroom-load-smoke[^\n]*(certify:production|vercel:production)/u);
});
