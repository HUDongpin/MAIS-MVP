import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(new URL("..", import.meta.url).pathname);
const scriptPath = path.join(repoRoot, "scripts", "ai-tutor-live-latency-smoke.mjs");
const bypassSecret = "BYPASS_SECRET_SENTINEL_DO_NOT_LOG";
const bypassCookie = "_vercel_jwt=BYPASS_COOKIE_SENTINEL_DO_NOT_LOG==";
const appSessionCookie = "hk_math_session=APP_SESSION_SENTINEL_DO_NOT_LOG==";
const primingPath = "/api/ai-tutor/status";

function runSmoke(baseUrl, artifactDir, { includeBypass = true, includeCredentials = true } = {}) {
  const env = {
    AI_TUTOR_LIVE_FINAL_P95_MS: "60000",
    AI_TUTOR_LIVE_FINAL_P99_MS: "60000",
    AI_TUTOR_LIVE_FIRST_EVENT_MS: "10000",
    AI_TUTOR_LIVE_LATENCY_ARTIFACT_DIR: artifactDir,
    AI_TUTOR_LIVE_TEXT_INTERVAL_MS: "0",
    AI_TUTOR_LIVE_TEXT_SAMPLES: "1",
    AI_TUTOR_LIVE_TOTAL_ABORT_MS: "5000",
    PATH: process.env.PATH ?? ""
  };
  if (includeBypass) {
    env.AI_TUTOR_LIVE_VERCEL_PROTECTION_BYPASS_SECRET = bypassSecret;
  }
  if (includeCredentials) {
    env.AI_TUTOR_LIVE_USE_DEMO_LOGIN = "1";
  }

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath, "--base-url", baseUrl, "--text-only", "--json"], {
      cwd: repoRoot,
      env,
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code, signal) => resolve({ code, signal, stderr, stdout }));
  });
}

async function startProtectedFixture({
  issueAppSessionCookie = true,
  issueBypassCookie,
  requireBypassCookie = true
}) {
  const requests = [];
  const server = http.createServer((request, response) => {
    const cookie = request.headers.cookie ?? "";
    requests.push({
      cookie,
      method: request.method,
      path: request.url,
      protectionBypass: request.headers["x-vercel-protection-bypass"] ?? "",
      setBypassCookie: request.headers["x-vercel-set-bypass-cookie"] ?? ""
    });
    request.resume();

    if (request.method === "GET" && request.url === primingPath && request.headers["x-vercel-set-bypass-cookie"] === "true") {
      const headers = {
        Location: "/must-not-be-followed",
        "Set-Cookie": [
          "fixture_tracking=unrelated; Expires=Wed, 21 Oct 2037 07:28:00 GMT; Path=/"
        ]
      };
      if (issueBypassCookie) {
        headers["Set-Cookie"].push(`${bypassCookie}; Path=/; HttpOnly; Secure; SameSite=Lax`);
      }
      response.writeHead(307, headers);
      response.end(`${bypassSecret} ${bypassCookie} ${appSessionCookie}`);
      return;
    }

    if (request.url === "/must-not-be-followed") {
      response.writeHead(500, { "Content-Type": "text/plain" });
      response.end("redirect-followed");
      return;
    }

    if (request.method === "POST" && request.url === "/api/auth/login") {
      if (requireBypassCookie && !cookie.includes(bypassCookie)) {
        response.writeHead(401, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ error: "protected" }));
        return;
      }
      response.writeHead(200, {
        "Content-Type": "application/json",
        "Set-Cookie": issueAppSessionCookie
          ? `${appSessionCookie}; Path=/; HttpOnly; SameSite=Lax`
          : "fixture_login=unrelated; Path=/; HttpOnly; SameSite=Lax"
      });
      response.end(JSON.stringify({ ok: true }));
      return;
    }

    if (request.url === "/api/ai-tutor") {
      const hasRequiredCookies = cookie.includes(appSessionCookie)
        && (!requireBypassCookie || cookie.includes(bypassCookie));
      if (!hasRequiredCookies) {
        response.writeHead(401, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ error: "missing-cookie-chain" }));
        return;
      }
      if (request.method === "GET") {
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ ok: true }));
        return;
      }
      response.writeHead(200, {
        "Cache-Control": "no-store",
        "Content-Type": "text/event-stream; charset=utf-8"
      });
      response.end([
        "event: status",
        'data: {"phase":"provider-start","provider":"qwen"}',
        "",
        "event: final",
        'data: {"body":{"reply":"Use the difference of squares pattern.","mode":"live"}}',
        "",
        ""
      ].join("\n"));
      return;
    }

    response.writeHead(404, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ error: "not-found" }));
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert.ok(address && typeof address === "object");

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())),
    requests
  };
}

async function readArtifact(artifactDir) {
  return fs.readFile(path.join(artifactDir, "latest.json"), "utf8").catch(() => "");
}

function assertSensitiveValuesAbsent(value) {
  assert.doesNotMatch(value, /BYPASS_SECRET_SENTINEL_DO_NOT_LOG/);
  assert.doesNotMatch(value, /BYPASS_COOKIE_SENTINEL_DO_NOT_LOG/);
  assert.doesNotMatch(value, /APP_SESSION_SENTINEL_DO_NOT_LOG/);
}

test("AI Tutor smoke primes a Vercel bypass cookie and keeps the combined cookie chain memory-only", { timeout: 10_000 }, async (t) => {
  const artifactDir = await fs.mkdtemp(path.join(os.tmpdir(), "mais-ai-smoke-cookie-"));
  const fixture = await startProtectedFixture({ issueBypassCookie: true });
  t.after(async () => {
    await fixture.close();
    await fs.rm(artifactDir, { force: true, recursive: true });
  });

  const result = await runSmoke(fixture.baseUrl, artifactDir);
  assert.equal(result.code, 0, result.stderr);
  assert.equal(result.signal, null);

  const primeRequests = fixture.requests.filter((request) => request.method === "GET" && request.path === primingPath);
  assert.equal(primeRequests.length, 1, "expected exactly one dedicated bypass-cookie priming request");
  const [primeRequest] = primeRequests;
  assert.ok(primeRequest, "expected a dedicated bypass-cookie priming request");
  assert.equal(primeRequest.protectionBypass, bypassSecret);
  assert.equal(primeRequest.setBypassCookie, "true");
  assert.equal(primeRequest.cookie, "");
  assert.equal(fixture.requests.some((request) => request.path === "/must-not-be-followed"), false);

  const loginRequest = fixture.requests.find((request) => request.method === "POST" && request.path === "/api/auth/login");
  assert.ok(loginRequest, "expected the app login request");
  assert.match(loginRequest.cookie, /_vercel_jwt=BYPASS_COOKIE_SENTINEL_DO_NOT_LOG/);
  assert.doesNotMatch(loginRequest.cookie, /fixture_tracking=/);
  assert.doesNotMatch(loginRequest.cookie, /Path|Expires|HttpOnly|Secure|SameSite/);
  assert.equal(loginRequest.protectionBypass, "");

  const aiRequests = fixture.requests.filter((request) => request.path === "/api/ai-tutor");
  assert.ok(aiRequests.length >= 2, "expected warm-up and measured AI Tutor requests");
  for (const request of aiRequests) {
    assert.match(request.cookie, /_vercel_jwt=BYPASS_COOKIE_SENTINEL_DO_NOT_LOG/);
    assert.match(request.cookie, /hk_math_session=APP_SESSION_SENTINEL_DO_NOT_LOG/);
    assert.equal(request.protectionBypass, "");
  }
  for (const request of fixture.requests.filter((request) => request !== primeRequest)) {
    assert.equal(request.setBypassCookie, "", "set-bypass-cookie must be confined to the priming request");
  }

  const artifact = await readArtifact(artifactDir);
  assert.match(artifact, /"success": true/);
  assertSensitiveValuesAbsent(result.stdout);
  assertSensitiveValuesAbsent(result.stderr);
  assertSensitiveValuesAbsent(artifact);
});

test("AI Tutor smoke fails closed when Vercel does not issue a bypass cookie", { timeout: 10_000 }, async (t) => {
  const artifactDir = await fs.mkdtemp(path.join(os.tmpdir(), "mais-ai-smoke-no-cookie-"));
  const fixture = await startProtectedFixture({ issueBypassCookie: false });
  t.after(async () => {
    await fixture.close();
    await fs.rm(artifactDir, { force: true, recursive: true });
  });

  const result = await runSmoke(fixture.baseUrl, artifactDir);
  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /Vercel protection bypass cookie setup failed\./);
  assert.equal(
    fixture.requests.some((request) => request.path === "/api/auth/login"),
    false,
    "login must not run after bypass-cookie priming fails"
  );

  const artifact = await readArtifact(artifactDir);
  assertSensitiveValuesAbsent(result.stdout);
  assertSensitiveValuesAbsent(result.stderr);
  assertSensitiveValuesAbsent(artifact);
});

test("AI Tutor smoke fails closed when login does not issue the app session cookie", { timeout: 10_000 }, async (t) => {
  const artifactDir = await fs.mkdtemp(path.join(os.tmpdir(), "mais-ai-smoke-no-session-"));
  const fixture = await startProtectedFixture({ issueAppSessionCookie: false, issueBypassCookie: true });
  t.after(async () => {
    await fixture.close();
    await fs.rm(artifactDir, { force: true, recursive: true });
  });

  const result = await runSmoke(fixture.baseUrl, artifactDir);
  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /AI Tutor live latency smoke login failed with HTTP 200\./);
  assert.equal(
    fixture.requests.some((request) => request.path === "/api/ai-tutor"),
    false,
    "AI requests must not run without a confirmed app session cookie"
  );

  assertSensitiveValuesAbsent(result.stdout);
  assertSensitiveValuesAbsent(result.stderr);
  assertSensitiveValuesAbsent(await readArtifact(artifactDir));
});

test("AI Tutor smoke validates text-probe authorization before any bypass-cookie request", { timeout: 10_000 }, async (t) => {
  const artifactDir = await fs.mkdtemp(path.join(os.tmpdir(), "mais-ai-smoke-no-auth-"));
  const fixture = await startProtectedFixture({ issueBypassCookie: true });
  t.after(async () => {
    await fixture.close();
    await fs.rm(artifactDir, { force: true, recursive: true });
  });

  const result = await runSmoke(fixture.baseUrl, artifactDir, { includeCredentials: false });
  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /Authenticated AI Tutor live latency smoke is disabled\./);
  assert.deepEqual(fixture.requests, [], "authorization must fail before any live request");
  assertSensitiveValuesAbsent(result.stdout);
  assertSensitiveValuesAbsent(result.stderr);
  assertSensitiveValuesAbsent(await readArtifact(artifactDir));
});

test("AI Tutor smoke skips bypass-cookie priming when no Vercel bypass is configured", { timeout: 10_000 }, async (t) => {
  const artifactDir = await fs.mkdtemp(path.join(os.tmpdir(), "mais-ai-smoke-public-"));
  const fixture = await startProtectedFixture({ issueBypassCookie: false, requireBypassCookie: false });
  t.after(async () => {
    await fixture.close();
    await fs.rm(artifactDir, { force: true, recursive: true });
  });

  const result = await runSmoke(fixture.baseUrl, artifactDir, { includeBypass: false });
  assert.equal(result.code, 0, result.stderr);
  assert.equal(fixture.requests[0]?.path, "/api/auth/login");
  assert.equal(fixture.requests.some((request) => request.path === primingPath), false);
  for (const request of fixture.requests) {
    assert.equal(request.protectionBypass, "");
    assert.equal(request.setBypassCookie, "");
  }

  const aiRequests = fixture.requests.filter((request) => request.path === "/api/ai-tutor");
  assert.ok(aiRequests.length >= 2);
  for (const request of aiRequests) {
    assert.match(request.cookie, /hk_math_session=APP_SESSION_SENTINEL_DO_NOT_LOG/);
    assert.doesNotMatch(request.cookie, /_vercel_jwt=/);
  }

  const artifact = await readArtifact(artifactDir);
  assert.match(artifact, /"success": true/);
  assertSensitiveValuesAbsent(result.stdout);
  assertSensitiveValuesAbsent(result.stderr);
  assertSensitiveValuesAbsent(artifact);
});
