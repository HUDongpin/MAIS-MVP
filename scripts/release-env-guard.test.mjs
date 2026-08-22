import assert from "node:assert/strict";
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const repoRoot = path.resolve(new URL("..", import.meta.url).pathname);

async function makeCanonicalRepoTempDir(prefix) {
  const repoTempRoot = path.join(repoRoot, ".tmp");
  await mkdir(repoTempRoot, { recursive: true, mode: 0o700 });
  return await mkdtemp(path.join(repoTempRoot, prefix));
}

async function writePassingReleaseGateStubs(tempDir, markerPath) {
  const releaseSourceGate = path.join(tempDir, "release-source-clean-gate.mjs");
  const worktreeLifecycleGate = path.join(tempDir, "worktree-lifecycle-gate.mjs");
  const releaseSourceRoot = path.join(tempDir, "clean-release-source");
  const canonicalRoot = path.join(tempDir, "canonical-root");
  await mkdir(releaseSourceRoot, { recursive: true, mode: 0o700 });
  await mkdir(canonicalRoot, { recursive: true, mode: 0o700 });
  await writeFile(path.join(releaseSourceRoot, "README.md"), "clean release source fixture\n");
  const init = spawnSync("git", ["init", "--quiet", "--initial-branch=main"], {
    cwd: releaseSourceRoot,
    encoding: "utf8"
  });
  assert.equal(init.status, 0, `${init.stdout}\n${init.stderr}`);
  const add = spawnSync("git", ["add", "--", "README.md"], {
    cwd: releaseSourceRoot,
    encoding: "utf8"
  });
  assert.equal(add.status, 0, `${add.stdout}\n${add.stderr}`);
  const commit = spawnSync(
    "git",
    [
      "-c", "user.name=Release Guard Test",
      "-c", "user.email=release-guard@example.invalid",
      "commit", "--quiet", "-m", "fixture"
    ],
    { cwd: releaseSourceRoot, encoding: "utf8" }
  );
  assert.equal(commit.status, 0, `${commit.stdout}\n${commit.stderr}`);
  await writeFile(releaseSourceGate, `import { appendFileSync } from "node:fs";
appendFileSync(${JSON.stringify(markerPath)}, "release-source\\n");
`);
  await writeFile(worktreeLifecycleGate, `import { appendFileSync } from "node:fs";
appendFileSync(${JSON.stringify(markerPath)}, \`worktree \${process.argv.slice(2).join(" ")}\\n\`);
`);

  return {
    MAIS_RELEASE_GUARD_ALLOW_TEST_STUBS: "1",
    MAIS_CANONICAL_RELEASE_ROOT: canonicalRoot,
    MAIS_RELEASE_SOURCE_KIND: "clean-worktree",
    MAIS_RELEASE_SOURCE_ROOT: releaseSourceRoot,
    MAIS_RELEASE_SOURCE_CLEAN_GATE: releaseSourceGate,
    MAIS_WORKTREE_LIFECYCLE_GATE: worktreeLifecycleGate,
    NODE_ENV: "test"
  };
}

test("runtime release guard requires a current S25 dirty-tree map", async () => {
  const tempDir = await makeCanonicalRepoTempDir("mais-dirty-tree-map-");
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

test("staged production publish guard allows pruned staging without direct root deploy gate", async () => {
  const tempDir = await makeCanonicalRepoTempDir("mais-staged-publish-");
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
    assert.equal(parsed.stagedPublish.vercelEnv.present.length, 15);
    assert.match(parsed.stagedPublish.stagingRoot, /\.tmp[/\\]vercel-staging$/);
    assert.match(releaseGateLog, /release-source/);
    assert.match(releaseGateLog, /worktree --strict/);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});
