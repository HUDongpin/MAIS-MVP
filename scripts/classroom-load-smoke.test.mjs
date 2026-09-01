import assert from "node:assert/strict";
import { createServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { link, mkdtemp, readFile, rm, symlink, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptsDir, "..");
const smokePath = path.join(scriptsDir, "classroom-load-smoke.mjs");
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

test("classroom smoke artifacts stay in ignored local-only storage", () => {
  assert.match(source(".gitignore"), /^\.tmp\/?$/mu);
  assert.doesNotMatch(source("package.json"), /classroom-load-smoke[^\n]*(certify:production|vercel:production)/u);
});
