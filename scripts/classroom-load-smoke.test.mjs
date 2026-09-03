import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createServer } from "node:http";
import { constants as fsConstants, existsSync, readFileSync } from "node:fs";
import fsPromises from "node:fs/promises";
import { link, mkdir, mkdtemp, readFile, rename, rm, symlink, unlink, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

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

test("classroom load smoke remains a standalone staging command", () => {
  assert.equal(existsSync(smokePath), true, "classroom load smoke script must exist");

  const packageJson = JSON.parse(source("package.json"));
  assert.equal(packageJson.scripts?.["smoke:classroom-load"], "node scripts/classroom-load-smoke.mjs");
  assert.match(packageJson.scripts?.["test:release-governance"] ?? "", /classroom-load-smoke\.test\.mjs/u);

  const releaseNotes = source("RELEASE.md");
  assert.match(releaseNotes, /Manual classroom-concurrency smoke \(staging\/preview only\)/u);
  assert.match(releaseNotes, /never follows redirects/i);
  assert.match(releaseNotes, /original origin may already have accepted earlier writes/i);
  assert.match(releaseNotes, /CLASSROOM_LOAD_USE_DEMO_LOGIN=1/u);
  assert.match(releaseNotes, /CLASSROOM_LOAD_DEMO_PASSWORD=/u);
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
    openedPath ??= args[0];
    openedFlags ??= args[1];
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
