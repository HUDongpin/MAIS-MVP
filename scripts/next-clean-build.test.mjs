import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import {
  buildCleanBuildConfig,
  parseActiveNextProcesses
} from "./next-clean-build.mjs";

const repoRoot = path.resolve(new URL("..", import.meta.url).pathname);

test("next clean build detects active Next processes in the same repository", () => {
  const output = [
    `123 1 node ${repoRoot}/node_modules/.bin/next dev --port 3008`,
    `124 1 node ${repoRoot}/node_modules/next/dist/bin/next build`,
    "125 1 node /Users/example/other/node_modules/.bin/next dev --port 3010",
    `126 1 node ${repoRoot}/scripts/next-clean-build.mjs`
  ].join("\n");

  const processes = parseActiveNextProcesses(output, { currentPid: 999, repoRoot });

  assert.equal(processes.length, 2);
  assert.deepEqual(processes.map((processInfo) => processInfo.pid), [123, 124]);
});

test("next clean build ignores the current process while checking active Next processes", () => {
  const output = `123 1 node ${repoRoot}/node_modules/.bin/next dev --port 3008`;
  const processes = parseActiveNextProcesses(output, { currentPid: 123, repoRoot });
  assert.deepEqual(processes, []);
});

test("next clean build treats default builds as shared .next builds", () => {
  const config = buildCleanBuildConfig({});
  assert.equal(config.distDir, ".next");
  assert.equal(config.usesSharedNextDir, true);
  assert.equal(config.nextBuildDir, path.join(repoRoot, ".next"));
});

test("next clean build allows isolated generated dist directories", () => {
  const config = buildCleanBuildConfig({
    NEXT_DIST_DIR: ".tmp/dashboard-runtime-next-test"
  });

  assert.equal(config.usesSharedNextDir, false);
  assert.equal(config.nextBuildDir, path.join(repoRoot, ".tmp", "dashboard-runtime-next-test"));
});

test("next clean build refuses non-generated clean targets", () => {
  assert.throws(
    () => buildCleanBuildConfig({ NEXT_DIST_DIR: "app" }),
    /Refusing to clean non-generated Next build directory/
  );
});
