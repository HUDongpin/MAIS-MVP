import assert from "node:assert/strict";
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const repoRoot = path.resolve(new URL("..", import.meta.url).pathname);

async function makeRepoLocalTempDir(prefix) {
  const repoTempRoot = path.join(repoRoot, ".tmp");
  await mkdir(repoTempRoot, { recursive: true });
  return mkdtemp(path.join(repoTempRoot, prefix));
}

async function writePassingReleaseGateStubs(tempDir, markerPath) {
  const canonicalRoot = path.join(tempDir, "canonical-root");
  const releaseSourceRoot = path.join(tempDir, "release-source");
  const releaseSourceGate = path.join(tempDir, "release-source-clean-gate.mjs");
  const worktreeLifecycleGate = path.join(tempDir, "worktree-lifecycle-gate.mjs");
  await mkdir(canonicalRoot, { recursive: true });
  await mkdir(releaseSourceRoot, { recursive: true });
  const init = spawnSync("git", ["init", "--quiet"], {
    cwd: releaseSourceRoot,
    encoding: "utf8"
  });
  assert.equal(init.status, 0, `${init.stdout}\n${init.stderr}`);
  await writeFile(releaseSourceGate, `import { appendFileSync } from "node:fs";
appendFileSync(${JSON.stringify(markerPath)}, "release-source\\n");
`);
  await writeFile(worktreeLifecycleGate, `import { appendFileSync } from "node:fs";
appendFileSync(${JSON.stringify(markerPath)}, \`worktree \${process.argv.slice(2).join(" ")}\\n\`);
`);

  return {
    MAIS_RELEASE_GUARD_ALLOW_TEST_STUBS: "1",
    MAIS_CANONICAL_RELEASE_ROOT: canonicalRoot,
    MAIS_RELEASE_SOURCE_ROOT: releaseSourceRoot,
    MAIS_RELEASE_SOURCE_CLEAN_GATE: releaseSourceGate,
    MAIS_WORKTREE_LIFECYCLE_GATE: worktreeLifecycleGate,
    NODE_ENV: "test"
  };
}

async function writeCleanCommittedRepo(tempDir) {
  const releaseSourceRoot = path.join(tempDir, "release-source");
  await mkdir(releaseSourceRoot, { recursive: true });
  const init = spawnSync("git", ["init", "--quiet"], {
    cwd: releaseSourceRoot,
    encoding: "utf8"
  });
  assert.equal(init.status, 0, `${init.stdout}\n${init.stderr}`);
  await writeFile(path.join(releaseSourceRoot, "candidate.txt"), "exact candidate\n");
  const add = spawnSync("git", ["add", "candidate.txt"], {
    cwd: releaseSourceRoot,
    encoding: "utf8"
  });
  assert.equal(add.status, 0, `${add.stdout}\n${add.stderr}`);
  const commit = spawnSync(
    "git",
    [
      "-c",
      "user.name=MAIS Release Guard Test",
      "-c",
      "user.email=release-guard@example.invalid",
      "commit",
      "--quiet",
      "-m",
      "test candidate"
    ],
    {
      cwd: releaseSourceRoot,
      encoding: "utf8"
    }
  );
  assert.equal(commit.status, 0, `${commit.stdout}\n${commit.stderr}`);
  const head = spawnSync("git", ["rev-parse", "--verify", "HEAD"], {
    cwd: releaseSourceRoot,
    encoding: "utf8"
  });
  assert.equal(head.status, 0, `${head.stdout}\n${head.stderr}`);
  return {
    head: head.stdout.trim(),
    releaseSourceRoot
  };
}

async function writeCompleteProductionVercelStub(binDir) {
  const required = [
    "AUTH_SESSION_SECRET",
    "POSTGRES_URL",
    "HK_MATH_STORAGE_PROVIDER",
    "HK_MATH_POSTGRES_HOT_AUTH_TABLES",
    "RESEND_API_KEY",
    "PASSWORD_RESET_FROM",
    "PASSWORD_RESET_BASE_URL",
    "HK_MATH_EXPOSE_LOCAL_RESET_LINKS",
    "CRON_SECRET",
    "TEACHER_NOTICE_HEALTH_SECRET",
    "TEACHER_NOTICE_EMAIL_ENABLED",
    "TEACHER_NOTICE_RESEND_API_KEY",
    "TEACHER_NOTICE_FROM",
    "TEACHER_NOTICE_BASE_URL",
    "TEACHER_NOTICE_ALLOWED_ORIGIN",
    "TEACHER_NOTICE_DELIVERY_TIMEOUT_MS",
    "RESEND_WEBHOOK_SECRET",
    "QWEN_API_KEY",
    "QWEN_API_URL",
    "QWEN_TEXT_MODEL",
    "AI_TUTOR_TOTAL_DEADLINE_MS",
    "AI_TUTOR_EDGE_RESPONSE_RESERVE_MS",
    "AI_TUTOR_PROVIDER_TIMEOUT_MS",
    "AI_TUTOR_LATENCY_ALERT_P95_MS",
    "AI_TUTOR_LATENCY_ALERT_TIMEOUT_RATE"
  ];
  const vercelBin = path.join(binDir, "vercel");
  await writeFile(vercelBin, `#!/usr/bin/env node
console.log(${JSON.stringify(JSON.stringify({
    envs: required.map((key) => ({ key, target: ["production"] }))
  }))});
`);
  await chmod(vercelBin, 0o755);
}

function productionWorkflowEnv({ binDir, candidateSha, releaseSourceRoot }) {
  return {
    ...process.env,
    PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ""}`,
    CI: "true",
    GITHUB_ACTIONS: "true",
    GITHUB_EVENT_NAME: "workflow_dispatch",
    GITHUB_REF: "refs/heads/main",
    GITHUB_REF_PROTECTED: "true",
    GITHUB_REPOSITORY: "HUDongpin/MAIS-MVP",
    GITHUB_RUN_ATTEMPT: "1",
    GITHUB_RUN_ID: "123456789",
    GITHUB_SHA: candidateSha,
    GITHUB_WORKFLOW_REF:
      "HUDongpin/MAIS-MVP/.github/workflows/production-deploy.yml@refs/heads/main",
    MAIS_PRODUCTION_DEPLOY_EXECUTION_CONTEXT: "github-actions-serialized-v1",
    MAIS_RELEASE_ENV_TARGET: "production",
    MAIS_RELEASE_GUARD_ALLOW_TEST_STUBS: "1",
    MAIS_RELEASE_MIN_FREE_GB: "1",
    MAIS_RELEASE_SOURCE_ROOT: releaseSourceRoot,
    NODE_ENV: "test",
    VERCEL_SCOPE: "test-scope",
    VERCEL_TOKEN: "fixture-vercel-token-not-real",
    POSTGRES_URL: "postgres://fixture:not-real@example.invalid/db",
    RESEND_API_KEY: "fixture-resend-key-not-real"
  };
}

test("runtime release guard requires a current S25 dirty-tree map", async () => {
  const tempDir = await makeRepoLocalTempDir("mais-dirty-tree-map-");
  const latestJson = path.join(tempDir, "latest-S25-dirty-tree-map.json");
  const releaseGateMarker = path.join(tempDir, "release-gates.log");
  const releaseGateEnv = await writePassingReleaseGateStubs(tempDir, releaseGateMarker);

  try {
    const refresh = spawnSync(
      process.execPath,
      [
        "scripts/refresh-dirty-tree-map.mjs",
        "--latest-json",
        latestJson,
        "--no-report",
        "--json",
        "--reason",
        "test runtime release preflight"
      ],
      {
        cwd: repoRoot,
        encoding: "utf8",
        env: {
          ...process.env,
          MAIS_RELEASE_MIN_FREE_GB: "1"
        }
      }
    );

    assert.equal(refresh.status, 0, `${refresh.stdout}\n${refresh.stderr}`);

    const pass = spawnSync(process.execPath, ["scripts/release-env-guard.mjs", "runtime-release", "--json"], {
      cwd: repoRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        ...releaseGateEnv,
        MAIS_DIRTY_TREE_MAP_JSON: latestJson,
        MAIS_DIRTY_TREE_MAP_MAX_AGE_MINUTES: "120",
        MAIS_RELEASE_MIN_FREE_GB: "1"
      }
    });

    assert.equal(pass.status, 0, `${pass.stdout}\n${pass.stderr}`);
    assert.match(pass.stdout, /dirtyTreeMap/);

    const staleMap = JSON.parse(await readFile(latestJson, "utf8"));
    staleMap.statusSignature = "stale";
    await writeFile(latestJson, `${JSON.stringify(staleMap, null, 2)}\n`);

    const fail = spawnSync(process.execPath, ["scripts/release-env-guard.mjs", "runtime-release", "--json"], {
      cwd: repoRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        ...releaseGateEnv,
        MAIS_DIRTY_TREE_MAP_JSON: latestJson,
        MAIS_DIRTY_TREE_MAP_MAX_AGE_MINUTES: "120",
        MAIS_RELEASE_MIN_FREE_GB: "1"
      }
    });

    assert.notEqual(fail.status, 0);
    assert.match(`${fail.stdout}\n${fail.stderr}`, /dirty-tree map/i);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("production env guard requires POSTGRES_URL, not just DATABASE_URL", async () => {
  const binDir = await mkdtemp(path.join(tmpdir(), "mais-release-env-guard-"));
  const vercelBin = path.join(binDir, "vercel");

  try {
    await writeFile(vercelBin, `#!/usr/bin/env node
console.log(JSON.stringify({
  envs: [
    { key: "AUTH_SESSION_SECRET", target: ["production"] },
    { key: "DATABASE_URL", target: ["production"] },
    { key: "HK_MATH_STORAGE_PROVIDER", target: ["production"] },
    { key: "RESEND_API_KEY", target: ["production"] },
    { key: "PASSWORD_RESET_FROM", target: ["production"] },
    { key: "PASSWORD_RESET_BASE_URL", target: ["production"] },
    { key: "HK_MATH_EXPOSE_LOCAL_RESET_LINKS", target: ["production"] },
    { key: "QWEN_API_KEY", target: ["production"] },
    { key: "QWEN_API_URL", target: ["production"] },
    { key: "QWEN_TEXT_MODEL", target: ["production"] },
    { key: "AI_TUTOR_TOTAL_DEADLINE_MS", target: ["production"] },
    { key: "AI_TUTOR_EDGE_RESPONSE_RESERVE_MS", target: ["production"] },
    { key: "AI_TUTOR_PROVIDER_TIMEOUT_MS", target: ["production"] },
    { key: "AI_TUTOR_LATENCY_ALERT_P95_MS", target: ["production"] },
    { key: "AI_TUTOR_LATENCY_ALERT_TIMEOUT_RATE", target: ["production"] }
  ]
}));
`);
    await chmod(vercelBin, 0o755);

    const result = spawnSync(process.execPath, ["scripts/release-env-guard.mjs", "env", "--json"], {
      cwd: repoRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ""}`,
        MAIS_RELEASE_ENV_TARGET: "production",
        MAIS_RELEASE_MIN_FREE_GB: "1",
        VERCEL_SCOPE: "test-scope"
      }
    });

    assert.notEqual(result.status, 0);
    assert.match(`${result.stdout}\n${result.stderr}`, /POSTGRES_URL/);
  } finally {
    await rm(binDir, { recursive: true, force: true });
  }
});

test("production env guard requires parent persistence, notice delivery, cron, and webhook variables", async () => {
  const binDir = await mkdtemp(path.join(tmpdir(), "mais-parent-release-env-guard-"));
  const vercelBin = path.join(binDir, "vercel");
  const parentProductionVariables = [
    "HK_MATH_POSTGRES_HOT_AUTH_TABLES",
    "CRON_SECRET",
    "TEACHER_NOTICE_HEALTH_SECRET",
    "TEACHER_NOTICE_EMAIL_ENABLED",
    "TEACHER_NOTICE_RESEND_API_KEY",
    "TEACHER_NOTICE_FROM",
    "TEACHER_NOTICE_BASE_URL",
    "TEACHER_NOTICE_ALLOWED_ORIGIN",
    "TEACHER_NOTICE_DELIVERY_TIMEOUT_MS",
    "RESEND_WEBHOOK_SECRET"
  ];

  try {
    await writeFile(vercelBin, `#!/usr/bin/env node
console.log(JSON.stringify({
  envs: [
    { key: "AUTH_SESSION_SECRET", target: ["production"] },
    { key: "POSTGRES_URL", target: ["production"] },
    { key: "HK_MATH_STORAGE_PROVIDER", target: ["production"] },
    { key: "RESEND_API_KEY", target: ["production"] },
    { key: "PASSWORD_RESET_FROM", target: ["production"] },
    { key: "PASSWORD_RESET_BASE_URL", target: ["production"] },
    { key: "HK_MATH_EXPOSE_LOCAL_RESET_LINKS", target: ["production"] },
    { key: "QWEN_API_KEY", target: ["production"] },
    { key: "QWEN_API_URL", target: ["production"] },
    { key: "QWEN_TEXT_MODEL", target: ["production"] },
    { key: "AI_TUTOR_TOTAL_DEADLINE_MS", target: ["production"] },
    { key: "AI_TUTOR_EDGE_RESPONSE_RESERVE_MS", target: ["production"] },
    { key: "AI_TUTOR_PROVIDER_TIMEOUT_MS", target: ["production"] },
    { key: "AI_TUTOR_LATENCY_ALERT_P95_MS", target: ["production"] },
    { key: "AI_TUTOR_LATENCY_ALERT_TIMEOUT_RATE", target: ["production"] },
    ...${JSON.stringify(parentProductionVariables)}.map((key) => ({ key, target: ["preview"] }))
  ]
}));
`);
    await chmod(vercelBin, 0o755);

    const result = spawnSync(process.execPath, ["scripts/release-env-guard.mjs", "env", "--json"], {
      cwd: repoRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ""}`,
        MAIS_RELEASE_ENV_TARGET: "production",
        MAIS_RELEASE_MIN_FREE_GB: "1",
        VERCEL_SCOPE: "test-scope"
      }
    });

    assert.notEqual(result.status, 0);
    const output = `${result.stdout}\n${result.stderr}`;
    for (const variable of parentProductionVariables) {
      assert.match(output, new RegExp(variable));
    }
    assert.match(output, /only inspects variable names and target environments/i);
  } finally {
    await rm(binDir, { recursive: true, force: true });
  }
});

test("tracked env example exposes only the canonical server-only parent production names", async () => {
  const example = await readFile(path.join(repoRoot, ".env.local.example"), "utf8");
  const requiredNames = [
    "HK_MATH_POSTGRES_HOT_AUTH_TABLES",
    "CRON_SECRET",
    "TEACHER_NOTICE_HEALTH_SECRET",
    "TEACHER_NOTICE_EMAIL_ENABLED",
    "TEACHER_NOTICE_RESEND_API_KEY",
    "TEACHER_NOTICE_FROM",
    "TEACHER_NOTICE_BASE_URL",
    "TEACHER_NOTICE_ALLOWED_ORIGIN",
    "TEACHER_NOTICE_DELIVERY_TIMEOUT_MS",
    "RESEND_WEBHOOK_SECRET"
  ];

  for (const name of requiredNames) {
    assert.match(example, new RegExp(`^${name}=`, "m"), `${name} must be documented`);
    assert.doesNotMatch(example, new RegExp(`^NEXT_PUBLIC_${name}=`, "m"));
  }
  assert.doesNotMatch(example, /^TEACHER_REMINDER_CRON_SECRET=/m);
});

test("staged production publish guard allows pruned staging without direct root deploy gate", async () => {
  const tempDir = await makeRepoLocalTempDir("mais-staged-publish-");
  const latestJson = path.join(tempDir, "latest-A25-dirty-tree-map.json");
  const vercelBin = path.join(tempDir, "vercel");
  const releaseGateMarker = path.join(tempDir, "release-gates.log");
  const releaseGateEnv = await writePassingReleaseGateStubs(tempDir, releaseGateMarker);

  try {
    await writeFile(vercelBin, `#!/usr/bin/env node
console.log(JSON.stringify({
  envs: [
    { key: "AUTH_SESSION_SECRET", target: ["production"] },
    { key: "POSTGRES_URL", target: ["production"] },
    { key: "HK_MATH_STORAGE_PROVIDER", target: ["production"] },
    { key: "HK_MATH_POSTGRES_HOT_AUTH_TABLES", target: ["production"] },
    { key: "RESEND_API_KEY", target: ["production"] },
    { key: "PASSWORD_RESET_FROM", target: ["production"] },
    { key: "PASSWORD_RESET_BASE_URL", target: ["production"] },
    { key: "HK_MATH_EXPOSE_LOCAL_RESET_LINKS", target: ["production"] },
    { key: "CRON_SECRET", target: ["production"] },
    { key: "TEACHER_NOTICE_HEALTH_SECRET", target: ["production"] },
    { key: "TEACHER_NOTICE_EMAIL_ENABLED", target: ["production"] },
    { key: "TEACHER_NOTICE_RESEND_API_KEY", target: ["production"] },
    { key: "TEACHER_NOTICE_FROM", target: ["production"] },
    { key: "TEACHER_NOTICE_BASE_URL", target: ["production"] },
    { key: "TEACHER_NOTICE_ALLOWED_ORIGIN", target: ["production"] },
    { key: "TEACHER_NOTICE_DELIVERY_TIMEOUT_MS", target: ["production"] },
    { key: "RESEND_WEBHOOK_SECRET", target: ["production"] },
    { key: "QWEN_API_KEY", target: ["production"] },
    { key: "QWEN_API_URL", target: ["production"] },
    { key: "QWEN_TEXT_MODEL", target: ["production"] },
    { key: "AI_TUTOR_TOTAL_DEADLINE_MS", target: ["production"] },
    { key: "AI_TUTOR_EDGE_RESPONSE_RESERVE_MS", target: ["production"] },
    { key: "AI_TUTOR_PROVIDER_TIMEOUT_MS", target: ["production"] },
    { key: "AI_TUTOR_LATENCY_ALERT_P95_MS", target: ["production"] },
    { key: "AI_TUTOR_LATENCY_ALERT_TIMEOUT_RATE", target: ["production"] }
  ]
}));
`);
    await chmod(vercelBin, 0o755);

    const refresh = spawnSync(
      process.execPath,
      [
        "scripts/refresh-dirty-tree-map.mjs",
        "--latest-json",
        latestJson,
        "--no-report",
        "--json",
        "--reason",
        "test staged production publish"
      ],
      {
        cwd: repoRoot,
        encoding: "utf8",
        env: {
          ...process.env,
          MAIS_RELEASE_MIN_FREE_GB: "1"
        }
      }
    );

    assert.equal(refresh.status, 0, `${refresh.stdout}\n${refresh.stderr}`);

    const result = spawnSync(process.execPath, ["scripts/release-env-guard.mjs", "staged-publish", "--json"], {
      cwd: repoRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        ...releaseGateEnv,
        PATH: `${tempDir}${path.delimiter}${process.env.PATH ?? ""}`,
        MAIS_DIRTY_TREE_MAP_JSON: latestJson,
        MAIS_DIRTY_TREE_MAP_MAX_AGE_MINUTES: "120",
        MAIS_RELEASE_ENV_TARGET: "production",
        MAIS_RELEASE_MIN_FREE_GB: "1",
        VERCEL_SCOPE: "test-scope"
      }
    });

    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    const parsed = JSON.parse(result.stdout);
    const releaseGateLog = await readFile(releaseGateMarker, "utf8");
    assert.equal(parsed.rootDeploy, undefined);
    assert.equal(parsed.releaseSource.releaseSourceClean.passed, true);
    assert.equal(parsed.releaseSource.strictWorktreeLifecycle.passed, true);
    assert.equal(parsed.stagedPublish.vercelEnv.present.length, 25);
    assert.match(parsed.stagedPublish.stagingRoot, /\.tmp[/\\]vercel-staging$/);
    assert.match(releaseGateLog, /release-source/);
    assert.match(releaseGateLog, /worktree --strict/);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("production workflow staged publish accepts only an exact clean serialized protected-main checkout", async () => {
  const tempDir = await makeRepoLocalTempDir("mais-production-workflow-publish-");
  const releaseGateMarker = path.join(tempDir, "release-gates.log");
  const releaseSourceGate = path.join(tempDir, "release-source-clean-gate.mjs");
  const fsmonitorMarker = path.join(tempDir, "hostile-fsmonitor-ran");
  const fsmonitorHelper = path.join(tempDir, "hostile-fsmonitor.sh");

  try {
    const { head, releaseSourceRoot } = await writeCleanCommittedRepo(tempDir);
    await writeCompleteProductionVercelStub(tempDir);
    await writeFile(releaseSourceGate, `import { appendFileSync } from "node:fs";
for (const key of ["VERCEL_TOKEN", "POSTGRES_URL", "RESEND_API_KEY"]) {
  if (process.env[key] !== undefined) throw new Error(\`secret reached source gate: \${key}\`);
}
appendFileSync(${JSON.stringify(releaseGateMarker)}, "release-source-clean\\n");
`);
    await writeFile(
      fsmonitorHelper,
      `#!/bin/sh\ntouch ${JSON.stringify(fsmonitorMarker)}\nexit 0\n`
    );
    await chmod(fsmonitorHelper, 0o755);
    const configureFsmonitor = spawnSync(
      "git",
      ["config", "core.fsmonitor", fsmonitorHelper],
      { cwd: releaseSourceRoot, encoding: "utf8" }
    );
    assert.equal(
      configureFsmonitor.status,
      0,
      `${configureFsmonitor.stdout}\n${configureFsmonitor.stderr}`
    );
    const result = spawnSync(
      process.execPath,
      ["scripts/release-env-guard.mjs", "production-workflow-staged-publish", "--json"],
      {
        cwd: repoRoot,
        encoding: "utf8",
        env: {
          ...productionWorkflowEnv({ binDir: tempDir, candidateSha: head, releaseSourceRoot }),
          MAIS_RELEASE_SOURCE_CLEAN_GATE: releaseSourceGate,
          MAIS_WORKTREE_LIFECYCLE_GATE: path.join(tempDir, "missing-worktree-gate.mjs"),
          MAIS_DIRTY_TREE_MAP_GATE: path.join(tempDir, "missing-dirty-tree-map-gate.mjs"),
          MAIS_RELEASE_GATE_MARKER: releaseGateMarker
        }
      }
    );

    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    const parsed = JSON.parse(result.stdout);
    assert.equal(parsed.source, undefined);
    assert.equal(parsed.releaseSource, undefined);
    assert.equal(parsed.dirtyTreeMap, undefined);
    assert.equal(parsed.productionWorkflowStagedPublish.executionContext.serialized, true);
    assert.equal(parsed.productionWorkflowStagedPublish.executionContext.candidateSha, head);
    assert.equal(parsed.productionWorkflowStagedPublish.source.clean, true);
    assert.equal(parsed.productionWorkflowStagedPublish.source.head, head);
    assert.equal(parsed.productionWorkflowStagedPublish.releaseSourceClean.passed, true);
    assert.equal(parsed.productionWorkflowStagedPublish.vercelEnv.present.length, 25);
    assert.match(parsed.productionWorkflowStagedPublish.e2e.e2eRoot, /\.tmp[/\\]e2e-run-/);
    assert.match(
      parsed.productionWorkflowStagedPublish.stagingRoot,
      /\.tmp[/\\]vercel-staging$/
    );
    const releaseGateLog = await readFile(releaseGateMarker, "utf8");
    assert.equal(releaseGateLog, "release-source-clean\n");
    await assert.rejects(readFile(fsmonitorMarker), /ENOENT/u);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("production workflow staged publish fails closed for every serialized context boundary", async () => {
  const tempDir = await makeRepoLocalTempDir("mais-production-workflow-context-");

  try {
    const { head, releaseSourceRoot } = await writeCleanCommittedRepo(tempDir);
    await writeCompleteProductionVercelStub(tempDir);
    const baseEnv = productionWorkflowEnv({
      binDir: tempDir,
      candidateSha: head,
      releaseSourceRoot
    });
    const invalidContexts = [
      { CI: "false" },
      { GITHUB_ACTIONS: "false" },
      { GITHUB_EVENT_NAME: "push" },
      { GITHUB_REF: "refs/heads/feature" },
      { GITHUB_REF_PROTECTED: "false" },
      { GITHUB_REPOSITORY: "attacker/fork" },
      { GITHUB_RUN_ATTEMPT: "0" },
      { GITHUB_RUN_ID: "not-numeric" },
      { GITHUB_SHA: "b".repeat(40) },
      {
        GITHUB_WORKFLOW_REF:
          "HUDongpin/MAIS-MVP/.github/workflows/other.yml@refs/heads/main"
      },
      { MAIS_PRODUCTION_DEPLOY_EXECUTION_CONTEXT: "local" },
      { MAIS_RELEASE_GUARD_ALLOW_TEST_STUBS: "0", NODE_ENV: "production" }
    ];

    for (const changed of invalidContexts) {
      const result = spawnSync(
        process.execPath,
        ["scripts/release-env-guard.mjs", "production-workflow-staged-publish", "--json"],
        {
          cwd: repoRoot,
          encoding: "utf8",
          env: { ...baseEnv, ...changed }
        }
      );
      assert.notEqual(result.status, 0, JSON.stringify(changed));
      assert.match(
        `${result.stdout}\n${result.stderr}`,
        /serialized protected-main GitHub workflow/i,
        JSON.stringify(changed)
      );
    }
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("production workflow staged publish rejects a dirty candidate checkout", async () => {
  const tempDir = await makeRepoLocalTempDir("mais-production-workflow-dirty-");

  try {
    const { head, releaseSourceRoot } = await writeCleanCommittedRepo(tempDir);
    await writeCompleteProductionVercelStub(tempDir);
    await writeFile(path.join(releaseSourceRoot, "untracked.txt"), "dirty\n");
    const result = spawnSync(
      process.execPath,
      ["scripts/release-env-guard.mjs", "production-workflow-staged-publish", "--json"],
      {
        cwd: repoRoot,
        encoding: "utf8",
        env: productionWorkflowEnv({ binDir: tempDir, candidateSha: head, releaseSourceRoot })
      }
    );

    assert.notEqual(result.status, 0);
    assert.match(`${result.stdout}\n${result.stderr}`, /clean candidate checkout/i);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});
