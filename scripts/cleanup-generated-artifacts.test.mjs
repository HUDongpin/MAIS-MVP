import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import * as cleanupModule from "./cleanup-generated-artifacts.mjs";

const {
  captureGeneratedTarget,
  removeCapturedGeneratedTarget,
  runGeneratedArtifactCleanup,
  withGeneratedCleanupLock
} = cleanupModule;

const repoRoot = path.resolve(new URL("..", import.meta.url).pathname);

test("cleanup dry run can target Vercel staging without Playwright evidence", () => {
  const result = spawnSync(
    process.execPath,
    ["scripts/cleanup-generated-artifacts.mjs", "--scope", "vercel-staging", "--dry-run", "--json"],
    {
      cwd: repoRoot,
      encoding: "utf8"
    }
  );

  assert.equal(result.status, 0, result.stderr);
  const summary = JSON.parse(result.stdout);

  assert.equal(summary.dryRun, true);
  assert.equal(summary.apply, false);
  assert.equal(summary.scope, "vercel-staging");
  assert.ok(Array.isArray(summary.targets));
  assert.ok(summary.targets.every((target) => target.path === ".tmp/vercel-staging"));
  assert.ok(summary.targets.every((target) => !target.path.includes("playwright-report")));
  assert.ok(summary.targets.every((target) => !target.path.includes("test-results")));
  assert.ok(summary.targets.every((target) => !target.path.startsWith(".tmp/e2e-run-")));
});

test("cleanup dry run can target Next build artifacts without Playwright evidence", () => {
  const result = spawnSync(
    process.execPath,
    ["scripts/cleanup-generated-artifacts.mjs", "--scope", "next-builds", "--dry-run", "--json"],
    {
      cwd: repoRoot,
      encoding: "utf8"
    }
  );

  assert.equal(result.status, 0, result.stderr);
  const summary = JSON.parse(result.stdout);

  assert.equal(summary.dryRun, true);
  assert.equal(summary.apply, false);
  assert.equal(summary.scope, "next-builds");
  assert.ok(Array.isArray(summary.targets));
  assert.ok(summary.targets.every((target) => !target.path.includes("playwright-report")));
  assert.ok(summary.targets.every((target) => !target.path.includes("test-results")));
  assert.ok(summary.targets.every((target) => !target.path.endsWith("trace.zip")));
  assert.ok(
    summary.targets.every((target) =>
      target.path === ".next" ||
      target.path.includes("/next-") ||
      target.path.includes("next-build-cache") ||
      target.path.includes("-next") ||
      target.path.includes("/next-dist") ||
      target.path.includes("current-version-build")
    )
  );
});

test("cleanup dry run can target release build gate artifacts without active ad hoc Next dirs", () => {
  const result = spawnSync(
    process.execPath,
    ["scripts/cleanup-generated-artifacts.mjs", "--scope", "release-build-gates", "--dry-run", "--json"],
    {
      cwd: repoRoot,
      encoding: "utf8"
    }
  );

  assert.equal(result.status, 0, result.stderr);
  const summary = JSON.parse(result.stdout);

  assert.equal(summary.dryRun, true);
  assert.equal(summary.apply, false);
  assert.equal(summary.scope, "release-build-gates");
  assert.ok(Array.isArray(summary.targets));
  assert.ok(summary.targets.every((target) => target.path.startsWith(".tmp/release-build-gate-next-")));
  assert.ok(summary.targets.every((target) => !target.path.includes("playwright-report")));
  assert.ok(summary.targets.every((target) => !target.path.includes("test-results")));
  assert.ok(summary.targets.every((target) => !target.path.includes("bug-verify-next")));
});

test("cleanup non-JSON dry run prints its release build gate summary", () => {
  const result = spawnSync(
    process.execPath,
    ["scripts/cleanup-generated-artifacts.mjs", "--scope", "release-build-gates", "--dry-run"],
    {
      cwd: repoRoot,
      encoding: "utf8"
    }
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Generated artifact cleanup dry run/);
  assert.match(result.stdout, /Scope: release-build-gates/);
});

test("cleanup dry run can target tmp scratch without deleting active Next build output", () => {
  const result = spawnSync(
    process.execPath,
    ["scripts/cleanup-generated-artifacts.mjs", "--scope", "tmp-scratch", "--dry-run", "--json"],
    {
      cwd: repoRoot,
      encoding: "utf8"
    }
  );

  assert.equal(result.status, 0, result.stderr);
  const summary = JSON.parse(result.stdout);

  assert.equal(summary.dryRun, true);
  assert.equal(summary.apply, false);
  assert.equal(summary.scope, "tmp-scratch");
  assert.ok(Array.isArray(summary.targets));
  assert.ok(summary.targets.every((target) => target.path === ".tmp"));
  assert.ok(summary.targets.every((target) => target.path !== ".next"));
});

test("cleanup refuses a generated target that is a symbolic link", async (t) => {
  const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mais-cleanup-repo-"));
  const outsideRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mais-cleanup-outside-"));
  t.after(async () => {
    await Promise.all([
      fs.rm(repoRoot, { recursive: true, force: true }),
      fs.rm(outsideRoot, { recursive: true, force: true })
    ]);
  });

  await fs.mkdir(path.join(repoRoot, ".tmp"));
  await fs.symlink(outsideRoot, path.join(repoRoot, ".tmp", "next-build"), "dir");

  await assert.rejects(
    captureGeneratedTarget({
      repoRoot,
      relativePath: ".tmp/next-build",
      expectedType: "directory"
    }),
    /symbolic link/
  );
});

test("cleanup refuses a generated target below a symbolic link ancestor", async (t) => {
  const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mais-cleanup-repo-"));
  const outsideRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mais-cleanup-outside-"));
  t.after(async () => {
    await Promise.all([
      fs.rm(repoRoot, { recursive: true, force: true }),
      fs.rm(outsideRoot, { recursive: true, force: true })
    ]);
  });

  await fs.mkdir(path.join(outsideRoot, "next-build"));
  await fs.symlink(outsideRoot, path.join(repoRoot, ".tmp"), "dir");

  await assert.rejects(
    captureGeneratedTarget({
      repoRoot,
      relativePath: ".tmp/next-build",
      expectedType: "directory"
    }),
    /symbolic link/
  );
});

test("cleanup refuses to remove a target replaced after capture", async (t) => {
  const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mais-cleanup-repo-"));
  t.after(async () => {
    await fs.rm(repoRoot, { recursive: true, force: true });
  });

  const tmpRoot = path.join(repoRoot, ".tmp");
  const targetPath = path.join(tmpRoot, "next-build");
  await fs.mkdir(targetPath, { recursive: true });
  await fs.writeFile(path.join(targetPath, "original.txt"), "original\n");
  const captured = await captureGeneratedTarget({
    repoRoot,
    relativePath: ".tmp/next-build",
    expectedType: "directory"
  });

  await fs.rename(targetPath, path.join(tmpRoot, "original-moved"));
  await fs.mkdir(targetPath);
  await fs.writeFile(path.join(targetPath, "keep.txt"), "keep\n");

  await assert.rejects(
    removeCapturedGeneratedTarget(captured),
    /changed since capture/
  );
  assert.equal(await fs.readFile(path.join(targetPath, "keep.txt"), "utf8"), "keep\n");
});

test("cleanup lock fails within a bounded timeout when another cleanup holds it", async (t) => {
  const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mais-cleanup-repo-"));
  t.after(async () => {
    await fs.rm(repoRoot, { recursive: true, force: true });
  });

  let releaseFirstLock;
  const firstLockHeld = new Promise((resolve) => {
    releaseFirstLock = resolve;
  });
  let markFirstLockAcquired;
  const firstLockAcquired = new Promise((resolve) => {
    markFirstLockAcquired = resolve;
  });
  const firstCleanup = withGeneratedCleanupLock(
    { repoRoot, timeoutMs: 250, retryDelayMs: 5 },
    async () => {
      markFirstLockAcquired();
      await firstLockHeld;
    }
  );

  await firstLockAcquired;
  await assert.rejects(
    withGeneratedCleanupLock(
      { repoRoot, timeoutMs: 25, retryDelayMs: 5 },
      async () => {}
    ),
    /cleanup lock/
  );
  releaseFirstLock();
  await firstCleanup;
});

test("cleanup apply removes only a captured generated directory", async (t) => {
  const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mais-cleanup-repo-"));
  t.after(async () => {
    await fs.rm(repoRoot, { recursive: true, force: true });
  });

  await fs.mkdir(path.join(repoRoot, ".next"));
  await fs.writeFile(path.join(repoRoot, ".next", "build.txt"), "generated\n");
  await fs.mkdir(path.join(repoRoot, "app"));
  await fs.writeFile(path.join(repoRoot, "app", "keep.txt"), "keep\n");

  const summary = await runGeneratedArtifactCleanup({
    repoRoot,
    scope: "next-builds",
    apply: true,
    lockTimeoutMs: 250
  });

  assert.equal(summary.targetCount, 1);
  await assert.rejects(fs.lstat(path.join(repoRoot, ".next")), { code: "ENOENT" });
  assert.equal(await fs.readFile(path.join(repoRoot, "app", "keep.txt"), "utf8"), "keep\n");
});

test("cleanup allowlist accepts only .next, top-level .next-*, .tmp, and their descendants", () => {
  const isolatedRepoRoot = path.join(os.tmpdir(), "mais-cleanup-allowlist-repo");

  for (const relativePath of [
    ".next",
    ".next/cache",
    ".next-release",
    ".next-release/cache",
    ".tmp",
    ".tmp/build/output"
  ]) {
    const target = cleanupModule.validateGeneratedTargetPath({
      repoRoot: isolatedRepoRoot,
      relativePath
    });
    assert.equal(target.relativePath, relativePath, relativePath);
  }

  for (const relativePath of [
    ".s11",
    ".s11-parent-audit-next1",
    "tsconfig.playwright-a.tmp.json",
    "tsconfig.build.tmp.json",
    "app",
    "app/next-dist",
    ".nextish",
    "../outside",
    ".tmp/../app",
    path.join(os.tmpdir(), "mais-cleanup-outside")
  ]) {
    assert.throws(
      () => cleanupModule.validateGeneratedTargetPath({
        repoRoot: isolatedRepoRoot,
        relativePath
      }),
      /Refusing generated cleanup/,
      relativePath
    );
  }
});

test("cleanup capture rejects disallowed in-repository targets before filesystem inspection", async (t) => {
  const isolatedRepoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mais-cleanup-repo-"));
  t.after(async () => {
    await fs.rm(isolatedRepoRoot, { recursive: true, force: true });
  });

  await fs.mkdir(path.join(isolatedRepoRoot, "app", "next-dist"), { recursive: true });
  await fs.mkdir(path.join(isolatedRepoRoot, ".s11-parent-audit-next1"));
  await fs.writeFile(path.join(isolatedRepoRoot, "tsconfig.build.tmp.json"), "{}\n");

  for (const [relativePath, expectedType] of [
    ["app", "directory"],
    ["app/next-dist", "directory"],
    [".s11-parent-audit-next1", "directory"],
    ["tsconfig.build.tmp.json", "file"]
  ]) {
    await assert.rejects(
      captureGeneratedTarget({
        repoRoot: isolatedRepoRoot,
        relativePath,
        expectedType
      }),
      /Refusing generated cleanup/,
      relativePath
    );
  }
});

test("cleanup default discovery ignores legacy .s11 and top-level temporary JSON targets", async (t) => {
  const isolatedRepoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mais-cleanup-repo-"));
  t.after(async () => {
    await fs.rm(isolatedRepoRoot, { recursive: true, force: true });
  });

  await fs.mkdir(path.join(isolatedRepoRoot, ".next"));
  await fs.mkdir(path.join(isolatedRepoRoot, ".s11-parent-audit-next1"));
  await fs.writeFile(path.join(isolatedRepoRoot, "tsconfig.playwright-a.tmp.json"), "{}\n");
  await fs.writeFile(path.join(isolatedRepoRoot, "tsconfig.build.tmp.json"), "{}\n");

  const summary = await runGeneratedArtifactCleanup({
    repoRoot: isolatedRepoRoot,
    scope: "all"
  });

  assert.deepEqual(summary.targets.map((target) => target.path), [".next"]);
});

test("cleanup Next discovery does not recursively auto-discover nested next-dist directories", async (t) => {
  const isolatedRepoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mais-cleanup-repo-"));
  t.after(async () => {
    await fs.rm(isolatedRepoRoot, { recursive: true, force: true });
  });

  await fs.mkdir(
    path.join(isolatedRepoRoot, ".tmp", "e2e-isolated", "run-1", "nested", "next-dist"),
    { recursive: true }
  );
  await fs.mkdir(path.join(isolatedRepoRoot, ".tmp", "next-dist"));

  const summary = await runGeneratedArtifactCleanup({
    repoRoot: isolatedRepoRoot,
    scope: "next-builds"
  });

  assert.ok(summary.targets.every((target) => !target.path.endsWith("/next-dist")));
});

test("cleanup default discovery fails closed when an allowed target is a regular file", async (t) => {
  const roots = [];
  t.after(async () => {
    await Promise.all(roots.map((root) => fs.rm(root, { recursive: true, force: true })));
  });

  for (const relativePath of [".next", ".next-release", ".tmp"]) {
    const isolatedRepoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mais-cleanup-repo-"));
    roots.push(isolatedRepoRoot);
    await fs.writeFile(path.join(isolatedRepoRoot, relativePath), "keep\n");

    await assert.rejects(
      runGeneratedArtifactCleanup({ repoRoot: isolatedRepoRoot, scope: "all" }),
      /target is not a directory/,
      relativePath
    );
    assert.equal(await fs.readFile(path.join(isolatedRepoRoot, relativePath), "utf8"), "keep\n");
  }
});

test("cleanup default discovery fails closed when an allowed target is a symbolic link", async (t) => {
  const roots = [];
  t.after(async () => {
    await Promise.all(roots.map((root) => fs.rm(root, { recursive: true, force: true })));
  });

  for (const relativePath of [".next", ".next-release", ".tmp"]) {
    const isolatedRepoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mais-cleanup-repo-"));
    const outsideRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mais-cleanup-outside-"));
    roots.push(isolatedRepoRoot, outsideRoot);
    await fs.symlink(outsideRoot, path.join(isolatedRepoRoot, relativePath), "dir");

    await assert.rejects(
      runGeneratedArtifactCleanup({ repoRoot: isolatedRepoRoot, scope: "all" }),
      /symbolic link/,
      relativePath
    );
    assert.equal(
      await fs.realpath(path.join(isolatedRepoRoot, relativePath)),
      await fs.realpath(outsideRoot)
    );
  }
});

test("cleanup apply revalidates allowlist metadata and preserves the actual generated target", async (t) => {
  const isolatedRepoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mais-cleanup-repo-"));
  t.after(async () => {
    await fs.rm(isolatedRepoRoot, { recursive: true, force: true });
  });

  const targetPath = path.join(isolatedRepoRoot, ".tmp", "build");
  await fs.mkdir(targetPath, { recursive: true });
  await fs.writeFile(path.join(targetPath, "keep.txt"), "keep\n");
  const captured = await captureGeneratedTarget({
    repoRoot: isolatedRepoRoot,
    relativePath: ".tmp/build",
    expectedType: "directory"
  });
  captured.relativePath = "app";

  await assert.rejects(removeCapturedGeneratedTarget(captured), /Refusing generated cleanup/);
  assert.equal(await fs.readFile(path.join(targetPath, "keep.txt"), "utf8"), "keep\n");
});

test("cleanup rechecks captured dev identity before rename", async (t) => {
  const isolatedRepoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mais-cleanup-repo-"));
  t.after(async () => {
    await fs.rm(isolatedRepoRoot, { recursive: true, force: true });
  });
  const targetPath = path.join(isolatedRepoRoot, ".tmp", "build");
  await fs.mkdir(targetPath, { recursive: true });
  const captured = await captureGeneratedTarget({
    repoRoot: isolatedRepoRoot,
    relativePath: ".tmp/build",
    expectedType: "directory"
  });
  captured.identities.at(-1).identity.dev += 1n;

  await assert.rejects(removeCapturedGeneratedTarget(captured), /changed since capture/);
  assert.equal((await fs.lstat(targetPath)).isDirectory(), true);
});

test("cleanup rechecks captured inode identity before rename", async (t) => {
  const isolatedRepoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mais-cleanup-repo-"));
  t.after(async () => {
    await fs.rm(isolatedRepoRoot, { recursive: true, force: true });
  });
  const tmpRoot = path.join(isolatedRepoRoot, ".tmp");
  const targetPath = path.join(tmpRoot, "build");
  await fs.mkdir(targetPath, { recursive: true });
  const captured = await captureGeneratedTarget({
    repoRoot: isolatedRepoRoot,
    relativePath: ".tmp/build",
    expectedType: "directory"
  });
  await fs.rename(targetPath, path.join(tmpRoot, "old-build"));
  await fs.mkdir(targetPath);

  await assert.rejects(removeCapturedGeneratedTarget(captured), /changed since capture/);
  assert.equal((await fs.lstat(targetPath)).isDirectory(), true);
});

test("cleanup rechecks captured mode identity before rename", async (t) => {
  const isolatedRepoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mais-cleanup-repo-"));
  t.after(async () => {
    await fs.rm(isolatedRepoRoot, { recursive: true, force: true });
  });
  const targetPath = path.join(isolatedRepoRoot, ".tmp", "build");
  await fs.mkdir(targetPath, { recursive: true, mode: 0o700 });
  const captured = await captureGeneratedTarget({
    repoRoot: isolatedRepoRoot,
    relativePath: ".tmp/build",
    expectedType: "directory"
  });
  await fs.chmod(targetPath, 0o755);

  await assert.rejects(removeCapturedGeneratedTarget(captured), /changed since capture/);
  assert.equal((await fs.lstat(targetPath)).isDirectory(), true);
});

test("cleanup rechecks captured type identity before rename", async (t) => {
  const isolatedRepoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mais-cleanup-repo-"));
  t.after(async () => {
    await fs.rm(isolatedRepoRoot, { recursive: true, force: true });
  });
  const targetPath = path.join(isolatedRepoRoot, ".tmp", "build");
  await fs.mkdir(targetPath, { recursive: true });
  const captured = await captureGeneratedTarget({
    repoRoot: isolatedRepoRoot,
    relativePath: ".tmp/build",
    expectedType: "directory"
  });
  await fs.rename(targetPath, path.join(isolatedRepoRoot, ".tmp", "old-build"));
  await fs.writeFile(targetPath, "keep\n");

  await assert.rejects(removeCapturedGeneratedTarget(captured), /changed since capture/);
  assert.equal(await fs.readFile(targetPath, "utf8"), "keep\n");
});

test("cleanup quarantine rename is random, atomic, and stays in the target parent", async (t) => {
  const isolatedRepoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mais-cleanup-repo-"));
  t.after(async () => {
    await fs.rm(isolatedRepoRoot, { recursive: true, force: true });
  });
  const renames = [];
  const fsApi = {
    ...fs,
    rename: async (source, destination) => {
      renames.push([source, destination]);
      return await fs.rename(source, destination);
    }
  };

  for (const name of ["build-1", "build-2"]) {
    const targetPath = path.join(isolatedRepoRoot, ".tmp", name);
    await fs.mkdir(targetPath, { recursive: true });
    const captured = await captureGeneratedTarget({
      repoRoot: isolatedRepoRoot,
      relativePath: `.tmp/${name}`,
      expectedType: "directory"
    });
    await removeCapturedGeneratedTarget(captured, { fsApi });
  }

  assert.equal(renames.length, 2);
  for (const [index, name] of ["build-1", "build-2"].entries()) {
    const targetPath = path.join(isolatedRepoRoot, ".tmp", name);
    assert.equal(renames[index][0], targetPath);
    assert.equal(path.dirname(renames[index][1]), path.dirname(targetPath));
    assert.match(
      path.basename(renames[index][1]),
      new RegExp(`^\\.mais-cleanup-quarantine-${name}-\\d+-[0-9a-f-]{36}$`)
    );
  }
  assert.notEqual(renames[0][1], renames[1][1]);
});

test("cleanup rejects a quarantine whose canonical path escapes containment and restores it", async (t) => {
  const isolatedRepoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mais-cleanup-repo-"));
  const outsideRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mais-cleanup-outside-"));
  t.after(async () => {
    await Promise.all([
      fs.rm(isolatedRepoRoot, { recursive: true, force: true }),
      fs.rm(outsideRoot, { recursive: true, force: true })
    ]);
  });
  const targetPath = path.join(isolatedRepoRoot, ".tmp", "build");
  await fs.mkdir(targetPath, { recursive: true });
  await fs.writeFile(path.join(targetPath, "keep.txt"), "keep\n");
  const captured = await captureGeneratedTarget({
    repoRoot: isolatedRepoRoot,
    relativePath: ".tmp/build",
    expectedType: "directory"
  });
  const fsApi = {
    ...fs,
    realpath: async (candidatePath) => {
      if (path.basename(candidatePath).startsWith(".mais-cleanup-quarantine-")) {
        return path.join(outsideRoot, "escaped-quarantine");
      }
      return await fs.realpath(candidatePath);
    }
  };

  await assert.rejects(
    removeCapturedGeneratedTarget(captured, { fsApi }),
    /quarantine escaped the repository/
  );
  assert.equal(await fs.readFile(path.join(targetPath, "keep.txt"), "utf8"), "keep\n");
});

test("cleanup rejects a quarantine identity mutation and restores it", async (t) => {
  const isolatedRepoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mais-cleanup-repo-"));
  t.after(async () => {
    await fs.rm(isolatedRepoRoot, { recursive: true, force: true });
  });
  const targetPath = path.join(isolatedRepoRoot, ".tmp", "build");
  await fs.mkdir(targetPath, { recursive: true });
  await fs.writeFile(path.join(targetPath, "keep.txt"), "keep\n");
  const captured = await captureGeneratedTarget({
    repoRoot: isolatedRepoRoot,
    relativePath: ".tmp/build",
    expectedType: "directory"
  });
  const fsApi = {
    ...fs,
    lstat: async (candidatePath, options) => {
      const stat = await fs.lstat(candidatePath, options);
      if (path.basename(candidatePath).startsWith(".mais-cleanup-quarantine-")) {
        return new Proxy(stat, {
          get(target, property, receiver) {
            if (property === "ino") return target.ino + 1n;
            return Reflect.get(target, property, receiver);
          }
        });
      }
      return stat;
    }
  };

  await assert.rejects(
    removeCapturedGeneratedTarget(captured, { fsApi }),
    /changed during quarantine rename/
  );
  assert.equal(await fs.readFile(path.join(targetPath, "keep.txt"), "utf8"), "keep\n");
});
