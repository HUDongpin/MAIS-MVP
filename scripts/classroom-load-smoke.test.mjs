import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { link, mkdir, mkdtemp, readFile, rename, rm, symlink, unlink, writeFile } from "node:fs/promises";
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

  assert.match(source("RELEASE.md"), /Manual classroom-concurrency smoke \(staging\/preview only\)/u);
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
