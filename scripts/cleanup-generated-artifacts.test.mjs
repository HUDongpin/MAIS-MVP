import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";

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
