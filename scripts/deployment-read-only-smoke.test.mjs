import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import test from "node:test";

import {
  assertCleanCandidateSha,
  readCleanCandidateSha,
  runDeploymentReadOnlySmoke
} from "./deployment-read-only-smoke.mjs";

const execFileAsync = promisify(execFile);

const candidateOrigin = "https://candidate-preview-abc.vercel.app";
const candidateHostname = "candidate-preview-abc.vercel.app";

function runCandidateSmoke(options = {}) {
  return runDeploymentReadOnlySmoke(candidateOrigin, {
    ...options,
    approvedVercelDeploymentHost: candidateHostname
  });
}

test("the deployment smoke probes public pages with HEAD and never reads response bodies", async () => {
  const requests = [];
  const fetchImpl = async (url, init) => {
    requests.push({ url, init });
    return {
      status: 200,
      headers: new Headers({ "cache-control": "public, max-age=0, must-revalidate" }),
      text() {
        throw new Error("the read-only smoke must not read response bodies");
      }
    };
  };

  const result = await runCandidateSmoke({
    fetchImpl,
    routes: [
      { id: "landing", method: "HEAD", path: "/", contract: "public-page" },
      { id: "about", method: "HEAD", path: "/about", contract: "public-page" },
      { id: "login", method: "HEAD", path: "/login", contract: "public-page" }
    ]
  });

  assert.deepEqual(
    requests.map(({ url, init }) => ({ url, method: init.method, redirect: init.redirect })),
    [
      { url: "https://candidate-preview-abc.vercel.app/", method: "HEAD", redirect: "manual" },
      { url: "https://candidate-preview-abc.vercel.app/about", method: "HEAD", redirect: "manual" },
      { url: "https://candidate-preview-abc.vercel.app/login", method: "HEAD", redirect: "manual" }
    ]
  );
  assert.equal(result.readOnly, true);
  assert.equal(result.requestCount, 3);
  assert.deepEqual(result.checks.map(({ id, status }) => ({ id, status })), [
    { id: "landing", status: 200 },
    { id: "about", status: 200 },
    { id: "login", status: 200 }
  ]);
  assert.equal(JSON.stringify(result).includes("body"), false);
});

test("the deployment smoke enforces unauthenticated private no-store contracts without cookies", async () => {
  const requests = [];
  const responseForPath = new Map([
    [
      "/parent",
      {
        status: 307,
        headers: new Headers({
          "cache-control": "no-store",
          location: "https://candidate-preview-abc.vercel.app/login?next=%2Fparent",
          "x-vercel-cache": "MISS"
        })
      }
    ],
    [
      "/api/parent/foundation",
      {
        status: 403,
        headers: new Headers({
          "cache-control": "private, no-store",
          "x-vercel-cache": "MISS"
        })
      }
    ],
    [
      "/api/me",
      { status: 401, headers: new Headers({ "cache-control": "private, no-store", "x-vercel-cache": "MISS" }) }
    ],
    [
      "/api/warm",
      { status: 401, headers: new Headers({ "cache-control": "private, no-store, max-age=0", "x-vercel-cache": "MISS" }) }
    ]
  ]);
  const fetchImpl = async (url, init) => {
    const path = new URL(url).pathname;
    requests.push({ path, method: init.method, redirect: init.redirect });
    const response = responseForPath.get(path);
    assert.ok(response, `unexpected route ${path}`);
    return response;
  };

  const result = await runCandidateSmoke({
    fetchImpl,
    routes: [
      { id: "parent-entry", method: "GET", path: "/parent", contract: "parent-redirect" },
      { id: "parent-foundation", method: "GET", path: "/api/parent/foundation", contract: "parent-api" },
      { id: "session", method: "GET", path: "/api/me", contract: "unauth-api" },
      { id: "warm", method: "GET", path: "/api/warm", contract: "warm-api" }
    ]
  });

  assert.deepEqual(requests, [
    { path: "/parent", method: "GET", redirect: "manual" },
    { path: "/api/parent/foundation", method: "GET", redirect: "manual" },
    { path: "/api/me", method: "GET", redirect: "manual" },
    { path: "/api/warm", method: "GET", redirect: "manual" }
  ]);
  assert.equal(result.readOnly, true);
  assert.equal(result.requestCount, 4);

  for (const headers of [
    { "cache-control": "private, no-store" },
    { "cache-control": "private, no-store", "x-vercel-cache": "HIT" },
    {
      "cache-control": "private, no-store",
      "x-vercel-cache": "MISS",
      "cdn-cache-control": "public, max-age=600"
    },
    {
      "cache-control": "private, no-store",
      "x-vercel-cache": "MISS",
      "vercel-cdn-cache-control": "public, max-age=600"
    }
  ]) {
    await assert.rejects(
      () => runCandidateSmoke({
        fetchImpl: async () => ({ status: 403, headers: new Headers(headers) }),
        routes: [
          { id: "parent-foundation", method: "GET", path: "/api/parent/foundation", contract: "parent-api" }
        ]
      }),
      /parent-foundation: unsafe (?:Vercel cache status|visible CDN cache directive)/u
    );
  }
});

test("every sensitive route rejects HIT or STALE cache evidence and APIs require private no-store", async () => {
  const cases = [
    {
      route: { id: "parent-entry", method: "GET", path: "/parent", contract: "parent-redirect" },
      status: 307,
      extraHeaders: { location: "https://candidate-preview-abc.vercel.app/login?next=/parent" }
    },
    {
      route: { id: "parent-foundation", method: "GET", path: "/api/parent/foundation", contract: "parent-api" },
      status: 403,
      extraHeaders: {}
    },
    {
      route: { id: "session", method: "GET", path: "/api/me", contract: "unauth-api" },
      status: 401,
      extraHeaders: {}
    },
    {
      route: { id: "warm", method: "GET", path: "/api/warm", contract: "warm-api" },
      status: 401,
      extraHeaders: {}
    }
  ];

  for (const cacheStatus of ["HIT", "STALE"]) {
    for (const scenario of cases) {
      await assert.rejects(
        () => runCandidateSmoke({
          fetchImpl: async () => ({
            status: scenario.status,
            headers: new Headers({
              "cache-control": "private, no-store",
              "x-vercel-cache": cacheStatus,
              ...scenario.extraHeaders
            })
          }),
          routes: [scenario.route]
        }),
        new RegExp(`${scenario.route.id}: unsafe Vercel cache status`, "u")
      );
    }
  }

  for (const route of [
    { id: "session", method: "GET", path: "/api/me", contract: "unauth-api" },
    { id: "warm", method: "GET", path: "/api/warm", contract: "warm-api" }
  ]) {
    await assert.rejects(
      () => runCandidateSmoke({
        fetchImpl: async () => ({
          status: 401,
          headers: new Headers({ "cache-control": "no-store", "x-vercel-cache": "MISS" })
        }),
        routes: [route]
      }),
      new RegExp(`${route.id}: missing private Cache-Control`, "u")
    );
  }

  for (const route of [
    { id: "session", method: "GET", path: "/api/me", contract: "unauth-api" },
    { id: "warm", method: "GET", path: "/api/warm", contract: "warm-api" }
  ]) {
    await assert.rejects(
      () => runCandidateSmoke({
        fetchImpl: async () => ({
          status: 401,
          headers: new Headers({
            "cache-control": "private, no-store",
            "cdn-cache-control": "public, max-age=600",
            "x-vercel-cache": "MISS"
          })
        }),
        routes: [route]
      }),
      new RegExp(`${route.id}: unsafe visible CDN cache directive`, "u")
    );
  }
});

test("the default smoke covers the seven release routes with GET or HEAD and redacts bypass credentials", async () => {
  const calls = [];
  const bypassSecret = "fixture-vercel-bypass-secret-never-output";
  const fetchImpl = async (url, init) => {
    const path = new URL(url).pathname;
    calls.push({ path, init });
    if (path === "/parent") {
      return {
        status: 307,
        headers: new Headers({
          "cache-control": "private, no-store",
          location: "https://candidate-preview-abc.vercel.app/login?next=/parent",
          "x-vercel-cache": "MISS"
        })
      };
    }
    if (path === "/api/parent/foundation") {
      return {
        status: 403,
        headers: new Headers({
          "cache-control": "private, no-store",
          "x-vercel-cache": "MISS"
        })
      };
    }
    if (path === "/api/me") {
      return {
        status: 401,
        headers: new Headers({ "cache-control": "private, no-store", "x-vercel-cache": "MISS" })
      };
    }
    if (path === "/api/warm") {
      return {
        status: 401,
        headers: new Headers({ "cache-control": "private, no-store, max-age=0", "x-vercel-cache": "MISS" })
      };
    }
    return {
      status: 200,
      headers: new Headers({ "cache-control": "public, max-age=0, must-revalidate" })
    };
  };

  const result = await runCandidateSmoke({
    fetchImpl,
    env: { VERCEL_AUTOMATION_BYPASS_SECRET: bypassSecret }
  });

  assert.deepEqual(
    calls.map(({ path, init }) => ({ path, method: init.method })),
    [
      { path: "/", method: "HEAD" },
      { path: "/about", method: "HEAD" },
      { path: "/login", method: "HEAD" },
      { path: "/parent", method: "GET" },
      { path: "/api/parent/foundation", method: "GET" },
      { path: "/api/me", method: "GET" },
      { path: "/api/warm", method: "GET" }
    ]
  );
  assert.ok(calls.every(({ init }) => ["GET", "HEAD"].includes(init.method)));
  assert.ok(calls.every(({ init }) => init.headers["x-vercel-protection-bypass"] === bypassSecret));
  assert.equal(result.requestCount, 7);
  assert.equal(JSON.stringify(result).includes(bypassSecret), false);
});

test("candidate provenance refuses a dirty source without disclosing dirty paths", async () => {
  const calls = [];
  const runCommand = async (command, args, options) => {
    calls.push({ command, args, options });
    if (args[0] === "rev-parse") {
      return { exitCode: 0, stdout: `${"a".repeat(40)}\n`, stderr: "" };
    }
    return {
      exitCode: 0,
      stdout: " M private-owner-path.txt\n?? untracked-owner-path.txt\n",
      stderr: ""
    };
  };

  await assert.rejects(
    () => readCleanCandidateSha({ cwd: "/repo", runCommand }),
    (error) => {
      assert.match(error.message, /clean Git source/u);
      assert.doesNotMatch(error.message, /private-owner-path|untracked-owner-path/u);
      return true;
    }
  );
  assert.deepEqual(calls.map(({ command, args, options }) => ({ command, args, quiet: options.quiet })), [
    { command: "git", args: ["rev-parse", "--verify", "HEAD"], quiet: true },
    { command: "git", args: ["status", "--porcelain", "--untracked-files=all"], quiet: true }
  ]);
});

test("candidate provenance returns only a validated clean HEAD and detects source drift", async () => {
  const initialSha = "a".repeat(40);
  const laterSha = "b".repeat(40);
  let currentSha = initialSha;
  const runCommand = async (_command, args) => {
    if (args[0] === "rev-parse") {
      return { exitCode: 0, stdout: `${currentSha}\n`, stderr: "" };
    }
    return { exitCode: 0, stdout: "", stderr: "" };
  };

  assert.equal(await readCleanCandidateSha({ cwd: "/repo", runCommand }), initialSha);
  assert.equal(
    await assertCleanCandidateSha(initialSha, { cwd: "/repo", runCommand }),
    initialSha
  );

  currentSha = laterSha;
  await assert.rejects(
    () => assertCleanCandidateSha(initialSha, { cwd: "/repo", runCommand }),
    (error) => {
      assert.match(error.message, /candidate source changed/u);
      assert.doesNotMatch(error.message, new RegExp(`${initialSha}|${laterSha}`, "u"));
      return true;
    }
  );
});

test("candidate provenance rejects invalid or failed Git results without raw command output", async () => {
  const privateOutput = "private owner path and credential-like diagnostic";
  await assert.rejects(
    () => readCleanCandidateSha({
      cwd: "/repo",
      runCommand: async () => ({ exitCode: 128, stdout: "", stderr: privateOutput })
    }),
    (error) => {
      assert.match(error.message, /candidate Git HEAD/u);
      assert.doesNotMatch(error.message, new RegExp(privateOutput, "u"));
      return true;
    }
  );

  await assert.rejects(
    () => readCleanCandidateSha({
      cwd: "/repo",
      runCommand: async (_command, args) => args[0] === "rev-parse"
        ? { exitCode: 0, stdout: "not-a-sha\n", stderr: "" }
        : { exitCode: 0, stdout: "", stderr: "" }
    }),
    /valid 40-character Git SHA/u
  );
});

test("candidate HEAD/status Git subprocesses disable lazy fetch and terminal prompts", async (t) => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mais-readonly-git-env-"));
  t.after(() => fs.rm(tempRoot, { recursive: true, force: true }));
  const repoRoot = path.join(tempRoot, "repo");
  await fs.mkdir(repoRoot);
  const actualGit = (await execFileAsync("which", ["git"], { encoding: "utf8" })).stdout.trim();
  await execFileAsync(actualGit, ["init", "--quiet"], { cwd: repoRoot });
  await execFileAsync(actualGit, ["config", "user.email", "fixture@example.test"], { cwd: repoRoot });
  await execFileAsync(actualGit, ["config", "user.name", "Fixture User"], { cwd: repoRoot });
  await fs.writeFile(path.join(repoRoot, "tracked.txt"), "tracked\n");
  await execFileAsync(actualGit, ["add", "tracked.txt"], { cwd: repoRoot });
  await execFileAsync(actualGit, ["commit", "--quiet", "-m", "fixture"], { cwd: repoRoot });

  const proxyRoot = path.join(tempRoot, "git-proxy");
  const proxyPath = path.join(proxyRoot, "git");
  await fs.mkdir(proxyRoot);
  await fs.writeFile(proxyPath, [
    "#!/bin/sh",
    "if [ \"$GIT_NO_LAZY_FETCH\" != \"1\" ] || [ \"$GIT_TERMINAL_PROMPT\" != \"0\" ]; then",
    "  exit 97",
    "fi",
    `exec ${JSON.stringify(actualGit)} \"$@\"`,
    ""
  ].join("\n"));
  await fs.chmod(proxyPath, 0o755);

  const originalPath = process.env.PATH;
  process.env.PATH = `${proxyRoot}${path.delimiter}${originalPath ?? ""}`;
  try {
    assert.match(await readCleanCandidateSha({ cwd: repoRoot }), /^[0-9a-f]{40}$/u);
  } finally {
    if (originalPath === undefined) delete process.env.PATH;
    else process.env.PATH = originalPath;
  }
});

test("read-only smoke aborts timed-out requests and never relays raw errors or bypass secrets", async () => {
  const bypassSecret = "fixture-bypass-secret-must-stay-private";
  let observedSignal;
  const fetchImpl = async (_url, init) => {
    observedSignal = init.signal;
    return await new Promise((_resolve, reject) => {
      init.signal.addEventListener("abort", () => {
        reject(new Error(`network failure ${bypassSecret}`));
      }, { once: true });
    });
  };

  await assert.rejects(
    () => runCandidateSmoke({
      env: { VERCEL_AUTOMATION_BYPASS_SECRET: bypassSecret },
      fetchImpl,
      requestTimeoutMs: 5,
      routes: [{ id: "landing", method: "HEAD", path: "/", contract: "public-page" }]
    }),
    (error) => {
      assert.match(error.message, /request failed or timed out/u);
      assert.match(error.message, /details redacted/u);
      assert.doesNotMatch(error.message, new RegExp(bypassSecret, "u"));
      assert.doesNotMatch(error.message, /network failure/u);
      return true;
    }
  );
  assert.equal(observedSignal.aborted, true);
});

test("read-only smoke rejects unsafe routes before fetch", async () => {
  let fetchCalls = 0;
  const fetchImpl = async () => {
    fetchCalls += 1;
    throw new Error("must not run");
  };

  for (const route of [
    { id: "write", method: "POST", path: "/api/parent/messages", contract: "parent-api" },
    { id: "absolute", method: "GET", path: "https://evil.example.test/", contract: "public-page" },
    { id: "query", method: "GET", path: "/parent?write=true", contract: "parent-redirect" }
  ]) {
    await assert.rejects(
      () => runCandidateSmoke({ fetchImpl, routes: [route] }),
      /safe GET or HEAD route/u
    );
  }
  assert.equal(fetchCalls, 0);
});

test("read-only smoke rejects malformed or credential-bearing origins without echoing them", async () => {
  const secretOrigin = "https://owner:fixture-secret@example.test/path?token=fixture-secret";
  await assert.rejects(
    () => runDeploymentReadOnlySmoke(secretOrigin, { fetchImpl: async () => undefined }),
    (error) => {
      assert.match(error.message, /canonical HTTPS origin/u);
      assert.doesNotMatch(error.message, /owner|fixture-secret|token=/u);
      return true;
    }
  );
});

test("read-only smoke rejects IP, private, reserved, ported, and non-approved origins before sending bypass secrets", async () => {
  const bypassSecret = "reviewer-repro-bypass-secret-never-send";
  let fetchCalls = 0;
  const fetchImpl = async () => {
    fetchCalls += 1;
    throw new Error("must not fetch an unapproved origin");
  };
  const invalidOrigins = [
    "https://127.0.0.1:444",
    "https://127.0.0.1",
    "https://[::1]",
    "https://10.0.0.1",
    "https://localhost",
    "https://metadata.google.internal",
    "https://candidate-preview-abc.vercel.app:443",
    "https://vercel.app",
    "https://nested.candidate.vercel.app",
    "https://candidate-preview-abc.vercel.app.evil.example",
    "https://www.mais.ac.evil.example"
  ];

  for (const origin of invalidOrigins) {
    await assert.rejects(
      () => runDeploymentReadOnlySmoke(origin, {
        env: { VERCEL_AUTOMATION_BYPASS_SECRET: bypassSecret },
        fetchImpl,
        routes: [{ id: "landing", method: "HEAD", path: "/", contract: "public-page" }]
      }),
      (error) => {
        assert.match(error.message, /approved HTTPS deployment origin/u);
        assert.doesNotMatch(error.message, /reviewer-repro|127\.0\.0\.1|metadata|candidate-preview/u);
        return true;
      }
    );
  }
  assert.equal(fetchCalls, 0);
});

test("a Vercel deployment host requires an exact provider-approved host before fetch or bypass", async () => {
  const bypassSecret = "exact-host-bypass-secret-never-send";
  let fetchCalls = 0;
  for (const approvedVercelDeploymentHost of [
    undefined,
    "other-preview.vercel.app",
    "candidate-preview-abc.vercel.app.evil.example"
  ]) {
    await assert.rejects(
      () => runDeploymentReadOnlySmoke(candidateOrigin, {
        approvedVercelDeploymentHost,
        env: { VERCEL_AUTOMATION_BYPASS_SECRET: bypassSecret },
        fetchImpl: async () => {
          fetchCalls += 1;
          throw new Error("must not fetch before exact host approval");
        },
        routes: [{ id: "landing", method: "HEAD", path: "/", contract: "public-page" }]
      }),
      /exact provider-approved Vercel deployment host/u
    );
  }
  assert.equal(fetchCalls, 0);
});

test("fixed production origins never receive a Vercel protection bypass secret", async () => {
  const bypassSecret = "production-domain-bypass-secret-never-send";
  for (const origin of ["https://www.mais.ac", "https://www.mais.hk"]) {
    let observedHeaders;
    const result = await runDeploymentReadOnlySmoke(origin, {
      env: { VERCEL_AUTOMATION_BYPASS_SECRET: bypassSecret },
      fetchImpl: async (_url, init) => {
        observedHeaders = init.headers;
        return {
          status: 200,
          headers: new Headers({ "cache-control": "public, max-age=0, must-revalidate" })
        };
      },
      routes: [{ id: "landing", method: "HEAD", path: "/", contract: "public-page" }]
    });
    assert.deepEqual(observedHeaders, {});
    assert.equal(result.baseUrl, origin);
    assert.equal(JSON.stringify(result).includes(bypassSecret), false);
  }
});

test("read-only smoke reports malformed fetch responses without relaying implementation errors", async () => {
  await assert.rejects(
    () => runCandidateSmoke({
      fetchImpl: async () => undefined,
      routes: [{ id: "landing", method: "HEAD", path: "/", contract: "public-page" }]
    }),
    (error) => {
      assert.match(error.message, /invalid response; details redacted/u);
      assert.doesNotMatch(error.message, /Cannot read|undefined/u);
      return true;
    }
  );
});

test("read-only smoke redacts response header implementation errors and secrets", async () => {
  const privateDiagnostic = "fixture-response-header-secret-never-output";
  await assert.rejects(
    () => runCandidateSmoke({
      fetchImpl: async () => ({
        status: 200,
        headers: {
          get() {
            throw new Error(privateDiagnostic);
          },
          has() {
            throw new Error(privateDiagnostic);
          }
        }
      }),
      routes: [{ id: "landing", method: "HEAD", path: "/", contract: "public-page" }]
    }),
    (error) => {
      assert.match(error.message, /invalid response; details redacted/u);
      assert.doesNotMatch(error.message, new RegExp(privateDiagnostic, "u"));
      return true;
    }
  );
});
