import assert from "node:assert/strict";
import { chmod, copyFile, link, mkdir, mkdtemp, readFile, readdir, realpath, rm, stat, symlink, truncate, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawn, spawnSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import test from "node:test";

const repoRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const p0BaselineCommit = "ce2ae5258013ca5bd79dd0cc56e7b1681d5cd411";

function runNode(args, options = {}) {
  return spawnSync(process.execPath, args, {
    cwd: repoRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      MAIS_RELEASE_MIN_FREE_GB: "1",
      ...options.env
    }
  });
}

function runNodeAt(cwd, args, options = {}) {
  return spawnSync(process.execPath, args, {
    cwd,
    encoding: "utf8",
    timeout: options.timeout,
    env: {
      ...process.env,
      ...options.env
    }
  });
}

async function createDevIsolatedFixture() {
  const root = await mkdtemp(path.join(tmpdir(), "mais-dev-isolated-"));
  const scriptDir = path.join(root, "scripts");
  const nextBinDir = path.join(root, "node_modules", "next", "dist", "bin");
  const scriptPath = path.join(scriptDir, "dev-isolated.mjs");
  const nextBin = path.join(nextBinDir, "next.js");
  const markerPath = path.join(root, "fake-next.jsonl");
  await mkdir(scriptDir, { recursive: true });
  await mkdir(nextBinDir, { recursive: true });
  await mkdir(path.join(root, ".tmp"), { recursive: true });
  await copyFile(path.join(repoRoot, "scripts", "dev-isolated.mjs"), scriptPath);
  await writeFile(
    path.join(root, "node_modules", "next", "package.json"),
    `${JSON.stringify({ name: "next", version: "0.0.0" }, null, 2)}\n`
  );
  await writeFile(
    nextBin,
    `
const fs = require("node:fs");
const marker = process.env.FAKE_NEXT_MARKER;
const record = (event, extra = {}) => fs.appendFileSync(marker, JSON.stringify({ event, pid: process.pid, ...extra }) + "\\n");
record("start", { argv: process.argv.slice(2), distDir: process.env.NEXT_DIST_DIR });
const behavior = process.env.FAKE_NEXT_BEHAVIOR || "exit-zero";
if (behavior === "ignore-signals" || behavior === "cooperative") {
  for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
    process.on(signal, () => {
      record("signal", { signal });
      if (behavior === "cooperative") process.exit(signal === "SIGINT" ? 130 : 143);
    });
  }
}

if (behavior === "exit-23") process.exit(23);
else if (behavior === "self-sigterm") process.kill(process.pid, "SIGTERM");
else if (behavior === "ignore-signals" || behavior === "cooperative") setInterval(() => {}, 1000);
else process.exit(0);
`
  );
  return { root, scriptPath, markerPath };
}

async function createFakeLsofFixture() {
  const root = await mkdtemp(path.join(tmpdir(), "mais-kill-port-"));
  const binDir = path.join(root, "bin");
  const lsofPath = path.join(binDir, "lsof");
  const argsPath = path.join(root, "lsof-args.txt");
  const countPath = path.join(root, "lsof-count.txt");
  await mkdir(binDir, { recursive: true });
  await writeFile(
    lsofPath,
    `#!/bin/sh
printf '%s\\n' '--call--' >> "$FAKE_LSOF_ARGS"
for arg in "$@"; do printf '%s\\n' "$arg" >> "$FAKE_LSOF_ARGS"; done
count=0
if [ -f "$FAKE_LSOF_COUNT" ]; then count=$(cat "$FAKE_LSOF_COUNT"); fi
count=$((count + 1))
printf '%s\\n' "$count" > "$FAKE_LSOF_COUNT"
if [ "$count" -le "\${FAKE_LSOF_VISIBLE_CALLS:-0}" ] && [ -n "$FAKE_LISTENER_PID" ]; then
  printf '%s\\n' "$FAKE_LISTENER_PID"
  exit 0
fi
exit 1
`
  );
  await chmod(lsofPath, 0o755);
  return { root, binDir, argsPath, countPath };
}

async function waitFor(predicate, timeoutMs = 3000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = await predicate();
    if (value) return value;
    await delay(20);
  }
  throw new Error(`Timed out after ${timeoutMs} ms`);
}

function waitForExit(child, timeoutMs = 3000) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return Promise.resolve({ code: child.exitCode, signal: child.signalCode });
  }
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Child did not exit within ${timeoutMs} ms`)), timeoutMs);
    child.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once("exit", (code, signal) => {
      clearTimeout(timer);
      resolve({ code, signal });
    });
  });
}

function processIsAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error?.code === "ESRCH") return false;
    throw error;
  }
}

function runGit(args, cwd) {
  return spawnSync("git", args, {
    cwd,
    encoding: "utf8"
  });
}

async function createDirtyMapFixtureRepo() {
  const root = await realpath(await mkdtemp(path.join(tmpdir(), "mais-dirty-map-repo-")));
  const scriptsDir = path.join(root, "scripts");
  const releaseIntakeDir = path.join(root, "coordination", "release-intake");
  await mkdir(scriptsDir, { recursive: true });
  await mkdir(releaseIntakeDir, { recursive: true });
  await copyFile(
    path.join(repoRoot, "scripts", "refresh-dirty-tree-map.mjs"),
    path.join(scriptsDir, "refresh-dirty-tree-map.mjs")
  );
  await copyFile(
    path.join(repoRoot, "scripts", "release-package-gate.mjs"),
    path.join(scriptsDir, "release-package-gate.mjs")
  );
  await copyFile(
    path.join(repoRoot, "coordination", "release-intake", "owner-pathspecs.json"),
    path.join(releaseIntakeDir, "owner-pathspecs.json")
  );

  const init = runGit(["init", "--quiet", "--initial-branch=main"], root);
  assert.equal(init.status, 0, combinedOutput(init));
  const add = runGit([
    "add",
    "--",
    "scripts/refresh-dirty-tree-map.mjs",
    "scripts/release-package-gate.mjs",
    "coordination/release-intake/owner-pathspecs.json"
  ], root);
  assert.equal(add.status, 0, combinedOutput(add));
  const commit = runGit([
    "-c",
    "user.name=Release Governance Test",
    "-c",
    "user.email=release-governance@example.invalid",
    "commit",
    "--quiet",
    "-m",
    "fixture"
  ], root);
  assert.equal(commit.status, 0, combinedOutput(commit));

  return {
    root,
    refreshScript: path.join(scriptsDir, "refresh-dirty-tree-map.mjs"),
    releaseIntakeDir,
    latestJson: path.join(releaseIntakeDir, "latest-A25-dirty-tree-map.json"),
    latestMarkdown: path.join(releaseIntakeDir, "latest-A25-dirty-tree-map.md")
  };
}

function runDirtyMapFixture(fixture, args, options = {}) {
  return runNodeAt(fixture.root, [fixture.refreshScript, ...args], options);
}

function readGitObjectJson(objectPath) {
  const result = runGit(["show", objectPath], repoRoot);
  assert.equal(result.status, 0, `Unable to read Git object ${objectPath}\n${combinedOutput(result)}`);
  return JSON.parse(result.stdout);
}

function assertTrackedInIndex(filePath) {
  const tracked = runGit(["ls-files", "--error-unmatch", "--", filePath], repoRoot);
  assert.equal(tracked.status, 0, `${filePath} must be tracked in the Git index\n${combinedOutput(tracked)}`);

  const object = runGit(["show", `:${filePath}`], repoRoot);
  assert.equal(object.status, 0, `${filePath} must resolve to a Git index object\n${combinedOutput(object)}`);
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function combinedOutput(result) {
  return `${result.stdout}\n${result.stderr}`;
}

function packageWithExactPathspec(manifest, pathspec) {
  return manifest.packages.find((pkg) => pkg.pathspecs?.includes(pathspec));
}

function assertOwnerMapping(manifest, pathspec, owner, coordinatesWith) {
  const pkg = packageWithExactPathspec(manifest, pathspec);
  assert.ok(pkg, `Missing exact owner pathspec: ${pathspec}`);
  assert.equal(pkg.owner, owner, `${pathspec} primary owner`);
  assert.deepEqual(
    [...(pkg.coordinatesWith ?? [])].sort(),
    [...coordinatesWith].sort(),
    `${pathspec} coordination owners`
  );
}

test("dirty map preserves NUL-delimited paths with spaces, Unicode, quotes, and newlines", async () => {
  const fixture = await createDirtyMapFixtureRepo();
  const relativeFixture = 'coordination/release-intake/zz governance 路径 "quoted"\nline.tmpx';
  const fixturePath = path.join(fixture.root, relativeFixture);

  try {
    await writeFile(fixturePath, "NUL-safe dirty-map fixture\n");
    const refresh = runDirtyMapFixture(fixture, [
      "--latest-json",
      fixture.latestJson,
      "--no-report",
      "--json",
      "--reason",
      "NUL-safe path regression"
    ]);
    assert.equal(refresh.status, 0, combinedOutput(refresh));

    const map = await readJson(fixture.latestJson);
    const matches = map.entries.filter((entry) => entry.path === relativeFixture);
    assert.equal(matches.length, 1, "entries[].path must contain the decoded real Unicode path exactly once");
    assert.equal(matches[0].status, "??");
    assert.ok(
      map.entries.every((entry) => !entry.path.startsWith('"')),
      "entries[].path must not retain Git C-style quoted paths"
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("content QA is classified before broad coordination evidence", async () => {
  const fixture = await createDirtyMapFixtureRepo();
  const relativeFixture = "coordination/content-qa/zz-release-governance-content.fixture";
  const fixturePath = path.join(fixture.root, relativeFixture);

  try {
    await mkdir(path.dirname(fixturePath), { recursive: true });
    await writeFile(fixturePath, "content QA routing fixture\n");
    const refresh = runDirtyMapFixture(fixture, [
      "--latest-json",
      fixture.latestJson,
      "--no-report",
      "--json",
      "--reason",
      "content QA slice ordering regression"
    ]);
    assert.equal(refresh.status, 0, combinedOutput(refresh));

    const map = await readJson(fixture.latestJson);
    const entry = map.entries.find((candidate) => candidate.path === relativeFixture);
    assert.ok(entry, `Missing dirty-map fixture entry: ${relativeFixture}`);
    assert.equal(entry.slice, "generated/content/RAG backlog");
    assert.match(entry.ownerId, /A18|A21/);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("dirty map assert-current enforces a 60 minute freshness window", async () => {
  const fixture = await createDirtyMapFixtureRepo();

  try {
    const refresh = runDirtyMapFixture(fixture, [
      "--latest-json",
      fixture.latestJson,
      "--no-report",
      "--json",
      "--reason",
      "release governance test"
    ]);
    assert.equal(refresh.status, 0, combinedOutput(refresh));

    const pass = runDirtyMapFixture(fixture, [
      "--assert-current",
      "--latest-json",
      fixture.latestJson,
      "--max-age-minutes",
      "60",
      "--json"
    ]);
    assert.equal(pass.status, 0, combinedOutput(pass));

    const staleMap = await readJson(fixture.latestJson);
    staleMap.generatedAt = new Date(Date.now() - 61 * 60 * 1000).toISOString();
    await writeFile(fixture.latestJson, `${JSON.stringify(staleMap, null, 2)}\n`);

    const fail = runDirtyMapFixture(fixture, [
      "--assert-current",
      "--latest-json",
      fixture.latestJson,
      "--max-age-minutes",
      "60",
      "--json"
    ]);
    assert.notEqual(fail.status, 0);
    assert.match(combinedOutput(fail), /older than 60 minutes/i);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("dirty map report refresh is immediately current with all four recorded outputs", async () => {
  const fixture = await createDirtyMapFixtureRepo();

  try {
    const refresh = runDirtyMapFixture(fixture, [
      "--latest-json",
      fixture.latestJson,
      "--latest-md",
      fixture.latestMarkdown,
      "--report-dir",
      fixture.releaseIntakeDir,
      "--run-id",
      "self-current-regression",
      "--json",
      "--reason",
      "four-output self-current regression"
    ]);
    assert.equal(refresh.status, 0, combinedOutput(refresh));

    const saved = await readJson(fixture.latestJson);
    assert.deepEqual(Object.keys(saved.outputPaths).sort(), [
      "latestJson",
      "latestMarkdown",
      "reportJson",
      "reportMarkdown"
    ]);
    for (const outputPath of Object.values(saved.outputPaths)) {
      assert.ok((await readFile(path.join(fixture.root, outputPath))).length > 0, outputPath);
    }

    const current = runDirtyMapFixture(fixture, [
      "--assert-current",
      "--latest-json",
      fixture.latestJson,
      "--latest-md",
      fixture.latestMarkdown,
      "--report-dir",
      fixture.releaseIntakeDir,
      "--max-age-minutes",
      "60",
      "--json"
    ]);
    assert.equal(current.status, 0, combinedOutput(current));
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("dirty map refresh rejects unsafe output nodes before writing any generated output", async (t) => {
  const cases = [
    ["symlink", (source, destination) => symlink(source, destination)],
    ["hardlink", (source, destination) => link(source, destination)]
  ];

  for (const [nodeType, createUnsafeNode] of cases) {
    await t.test(nodeType, async () => {
      const fixture = await createDirtyMapFixtureRepo();
      const externalRoot = await realpath(
        await mkdtemp(path.join(tmpdir(), "mais-dirty-map-do-not-disclose-writer-target-"))
      );
      const externalTarget = path.join(externalRoot, "sentinel.md");
      const runId = `unsafe-${nodeType}-writer-regression`;
      const reportDateFormatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Hong_Kong",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      });
      const reportDates = [
        ...new Set([-300_000, 0, 300_000].map((offset) =>
          reportDateFormatter.format(new Date(Date.now() + offset))
        ))
      ];
      const reportJsonPaths = reportDates.map((reportDate) => path.join(
        fixture.releaseIntakeDir,
        `${reportDate}-A25-dirty-tree-map-${runId}.json`
      ));
      const reportMarkdownPaths = reportDates.map((reportDate) => path.join(
        fixture.releaseIntakeDir,
        `${reportDate}-A25-dirty-tree-map-${runId}.md`
      ));
      const latestJsonBefore = "latest JSON must remain untouched\n";
      const latestMarkdownBefore = "latest Markdown must remain untouched\n";
      const reportJsonBefore = "report JSON must remain untouched\n";
      const externalBefore = "external sentinel must remain untouched\n";

      try {
        await writeFile(fixture.latestJson, latestJsonBefore);
        await writeFile(fixture.latestMarkdown, latestMarkdownBefore);
        for (const reportJson of reportJsonPaths) {
          await writeFile(reportJson, reportJsonBefore);
        }
        await writeFile(externalTarget, externalBefore);
        for (const reportMarkdown of reportMarkdownPaths) {
          await createUnsafeNode(externalTarget, reportMarkdown);
        }

        const refresh = runDirtyMapFixture(fixture, [
          "--latest-json",
          fixture.latestJson,
          "--latest-md",
          fixture.latestMarkdown,
          "--report-dir",
          fixture.releaseIntakeDir,
          "--run-id",
          runId,
          "--json",
          "--reason",
          `unsafe ${nodeType} writer regression`
        ]);

        assert.notEqual(refresh.status, 0, combinedOutput(refresh));
        assert.match(combinedOutput(refresh), /generated output write target is invalid/i);
        assert.doesNotMatch(combinedOutput(refresh), /do-not-disclose-writer-target/i);
        assert.equal(await readFile(fixture.latestJson, "utf8"), latestJsonBefore);
        assert.equal(await readFile(fixture.latestMarkdown, "utf8"), latestMarkdownBefore);
        for (const reportJson of reportJsonPaths) {
          assert.equal(await readFile(reportJson, "utf8"), reportJsonBefore);
        }
        assert.equal(await readFile(externalTarget, "utf8"), externalBefore);
      } finally {
        await rm(fixture.root, { recursive: true, force: true });
        await rm(externalRoot, { recursive: true, force: true });
      }
    });
  }
});

test("dirty map refresh rejects ancestor symlink output escapes without creating external files", async () => {
  const fixture = await createDirtyMapFixtureRepo();
  const externalRoot = await realpath(
    await mkdtemp(path.join(tmpdir(), "mais-dirty-map-do-not-disclose-ancestor-target-"))
  );
  const linkedOutputDir = path.join(
    fixture.root,
    "coordination",
    "do-not-disclose-ancestor-output"
  );

  try {
    await symlink(externalRoot, linkedOutputDir, "dir");
    const refresh = runDirtyMapFixture(fixture, [
      "--latest-json",
      path.join(linkedOutputDir, "latest.json"),
      "--latest-md",
      path.join(linkedOutputDir, "latest.md"),
      "--report-dir",
      linkedOutputDir,
      "--run-id",
      "ancestor-symlink-writer-regression",
      "--json",
      "--reason",
      "ancestor symlink writer regression"
    ]);

    assert.notEqual(refresh.status, 0, combinedOutput(refresh));
    assert.match(combinedOutput(refresh), /generated output write target is invalid/i);
    assert.doesNotMatch(combinedOutput(refresh), /do-not-disclose-ancestor/i);
    assert.deepEqual(await readdir(externalRoot), []);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
    await rm(externalRoot, { recursive: true, force: true });
  }
});

test("dirty map no-report refresh validates and writes only latestJson", async () => {
  const fixture = await createDirtyMapFixtureRepo();
  const externalRoot = await realpath(
    await mkdtemp(path.join(tmpdir(), "mais-dirty-map-no-report-writer-"))
  );
  const externalTarget = path.join(externalRoot, "latest-markdown-sentinel.md");
  const externalBefore = "no-report must not touch this target\n";

  try {
    await writeFile(externalTarget, externalBefore);
    await symlink(externalTarget, fixture.latestMarkdown);
    const refresh = runDirtyMapFixture(fixture, [
      "--latest-json",
      fixture.latestJson,
      "--latest-md",
      fixture.latestMarkdown,
      "--report-dir",
      path.join(fixture.root, "coordination", "unused-no-report-output"),
      "--run-id",
      "latest-only-safe-writer",
      "--no-report",
      "--json",
      "--reason",
      "latest-only safe writer regression"
    ]);

    assert.equal(refresh.status, 0, combinedOutput(refresh));
    assert.equal(await readFile(externalTarget, "utf8"), externalBefore);
    assert.ok((await readFile(fixture.latestJson)).length > 0);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
    await rm(externalRoot, { recursive: true, force: true });
  }
});

test("dirty map no-report refresh rejects an unsafe latestJson without changing its target", async (t) => {
  const cases = [
    ["symlink", (source, destination) => symlink(source, destination)],
    ["hardlink", (source, destination) => link(source, destination)]
  ];

  for (const [nodeType, createUnsafeNode] of cases) {
    await t.test(nodeType, async () => {
      const fixture = await createDirtyMapFixtureRepo();
      const externalRoot = await realpath(
        await mkdtemp(path.join(tmpdir(), "mais-dirty-map-do-not-disclose-latest-target-"))
      );
      const externalTarget = path.join(externalRoot, "latest-json-sentinel.json");
      const externalBefore = "unsafe latestJson target must remain untouched\n";

      try {
        await writeFile(externalTarget, externalBefore);
        await createUnsafeNode(externalTarget, fixture.latestJson);
        const refresh = runDirtyMapFixture(fixture, [
          "--latest-json",
          fixture.latestJson,
          "--no-report",
          "--json",
          "--reason",
          `unsafe latest-only ${nodeType} writer regression`
        ]);

        assert.notEqual(refresh.status, 0, combinedOutput(refresh));
        assert.match(combinedOutput(refresh), /generated output write target is invalid/i);
        assert.doesNotMatch(combinedOutput(refresh), /do-not-disclose-latest-target/i);
        assert.equal(await readFile(externalTarget, "utf8"), externalBefore);
      } finally {
        await rm(fixture.root, { recursive: true, force: true });
        await rm(externalRoot, { recursive: true, force: true });
      }
    });
  }
});

test("dirty map refresh rejects out-of-repository output paths before writing", async () => {
  const fixture = await createDirtyMapFixtureRepo();
  const externalRoot = await realpath(
    await mkdtemp(path.join(tmpdir(), "mais-dirty-map-do-not-disclose-outside-output-"))
  );
  const latestJsonBefore = "in-repository output must remain untouched\n";

  try {
    await writeFile(fixture.latestJson, latestJsonBefore);
    const refresh = runDirtyMapFixture(fixture, [
      "--latest-json",
      fixture.latestJson,
      "--latest-md",
      fixture.latestMarkdown,
      "--report-dir",
      externalRoot,
      "--run-id",
      "outside-output-writer-regression",
      "--json",
      "--reason",
      "outside output writer regression"
    ]);

    assert.notEqual(refresh.status, 0, combinedOutput(refresh));
    assert.match(combinedOutput(refresh), /generated output write target is invalid/i);
    assert.doesNotMatch(combinedOutput(refresh), /do-not-disclose-outside-output/i);
    assert.equal(await readFile(fixture.latestJson, "utf8"), latestJsonBefore);
    assert.deepEqual(await readdir(externalRoot), []);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
    await rm(externalRoot, { recursive: true, force: true });
  }
});

test("dirty map no-report refresh safely creates missing nested repository parents", async () => {
  const fixture = await createDirtyMapFixtureRepo();
  const nestedLatestJson = path.join(
    fixture.root,
    "coordination",
    "release-intake",
    "nested",
    "deeper",
    "latest.json"
  );

  try {
    const refresh = runDirtyMapFixture(fixture, [
      "--latest-json",
      nestedLatestJson,
      "--no-report",
      "--json",
      "--reason",
      "missing nested parent writer regression"
    ]);
    assert.equal(refresh.status, 0, combinedOutput(refresh));

    const current = runDirtyMapFixture(fixture, [
      "--assert-current",
      "--latest-json",
      nestedLatestJson,
      "--max-age-minutes",
      "60",
      "--json"
    ]);
    assert.equal(current.status, 0, combinedOutput(current));
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("dirty map atomic refresh preserves restrictive existing output permissions", async () => {
  const fixture = await createDirtyMapFixtureRepo();

  try {
    await writeFile(fixture.latestJson, "existing restrictive output\n");
    await chmod(fixture.latestJson, 0o600);
    const before = await stat(fixture.latestJson);
    const refresh = runDirtyMapFixture(fixture, [
      "--latest-json",
      fixture.latestJson,
      "--no-report",
      "--json",
      "--reason",
      "restrictive output mode regression"
    ]);
    assert.equal(refresh.status, 0, combinedOutput(refresh));

    const after = await stat(fixture.latestJson);
    assert.equal(after.mode & 0o777, 0o600);
    assert.notEqual(after.ino, before.ino, "atomic replacement must install the staged inode");
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("dirty map refresh rejects a write-only existing output before changing it", async () => {
  const fixture = await createDirtyMapFixtureRepo();
  const originalBytes = "write-only output must remain unchanged\n";

  try {
    await writeFile(fixture.latestJson, originalBytes);
    await chmod(fixture.latestJson, 0o200);
    const before = await stat(fixture.latestJson);
    const refresh = runDirtyMapFixture(fixture, [
      "--latest-json",
      fixture.latestJson,
      "--no-report",
      "--json",
      "--reason",
      "write-only output regression"
    ]);

    assert.notEqual(refresh.status, 0, combinedOutput(refresh));
    assert.match(combinedOutput(refresh), /generated output write target is invalid/i);
    const after = await stat(fixture.latestJson);
    assert.equal(after.ino, before.ino);
    assert.equal(after.mode & 0o777, 0o200);
    await chmod(fixture.latestJson, 0o600);
    assert.equal(await readFile(fixture.latestJson, "utf8"), originalBytes);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("dirty map creates absent outputs with mode 0600 even under umask 000", async () => {
  const fixture = await createDirtyMapFixtureRepo();
  const wrapperPath = path.join(fixture.root, "scripts", "refresh-with-open-umask.mjs");
  const firstCreatedParent = path.join(fixture.releaseIntakeDir, "umask-open-parent");
  const secondCreatedParent = path.join(firstCreatedParent, "nested");
  const nestedLatestJson = path.join(secondCreatedParent, "latest.json");

  try {
    await writeFile(
      wrapperPath,
      [
        "process.umask(0);",
        "const args = process.argv.slice(2);",
        `process.argv = [process.argv[0], ${JSON.stringify(fixture.refreshScript)}, ...args];`,
        `await import(${JSON.stringify(pathToFileURL(fixture.refreshScript).href)});`,
        ""
      ].join("\n")
    );
    const refresh = runNodeAt(fixture.root, [
      wrapperPath,
      "--latest-json",
      nestedLatestJson,
      "--no-report",
      "--json",
      "--reason",
      "open umask output mode regression"
    ]);
    assert.equal(refresh.status, 0, combinedOutput(refresh));

    const created = await stat(nestedLatestJson);
    assert.equal(created.mode & 0o777, 0o600);
    assert.equal(created.mode & 0o077, 0, "group/other permissions must remain closed");
    for (const createdParent of [firstCreatedParent, secondCreatedParent]) {
      const parentStat = await stat(createdParent);
      assert.equal(parentStat.mode & 0o777, 0o700);
      assert.equal(parentStat.mode & 0o022, 0, "created parents must not be group/other writable");
    }
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("dirty map refresh rejects an existing group-or-other-writable output parent", async () => {
  const fixture = await createDirtyMapFixtureRepo();
  const unsafeParent = path.join(
    fixture.root,
    "coordination",
    "do-not-disclose-world-writable-output-parent"
  );
  const unsafeLatestJson = path.join(unsafeParent, "latest.json");
  const originalBytes = "unsafe-parent output must remain unchanged\n";

  try {
    await mkdir(unsafeParent, { mode: 0o700 });
    await writeFile(unsafeLatestJson, originalBytes, { mode: 0o600 });
    await chmod(unsafeParent, 0o777);
    const before = await stat(unsafeLatestJson);
    const refresh = runDirtyMapFixture(fixture, [
      "--latest-json",
      unsafeLatestJson,
      "--no-report",
      "--json",
      "--reason",
      "unsafe output parent permission regression"
    ]);

    assert.notEqual(refresh.status, 0, combinedOutput(refresh));
    assert.match(combinedOutput(refresh), /generated output write target is invalid/i);
    assert.doesNotMatch(combinedOutput(refresh), /do-not-disclose-world-writable/i);
    const after = await stat(unsafeLatestJson);
    assert.equal(after.ino, before.ino);
    assert.equal(await readFile(unsafeLatestJson, "utf8"), originalBytes);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("dirty map no-report refresh after a full refresh ignores only its latest JSON output", async () => {
  const fixture = await createDirtyMapFixtureRepo();

  try {
    const fullRefresh = runDirtyMapFixture(fixture, [
      "--latest-json",
      fixture.latestJson,
      "--latest-md",
      fixture.latestMarkdown,
      "--report-dir",
      fixture.releaseIntakeDir,
      "--run-id",
      "full-before-no-report",
      "--json",
      "--reason",
      "full refresh before no-report regression"
    ]);
    assert.equal(fullRefresh.status, 0, combinedOutput(fullRefresh));

    const noReportRefresh = runDirtyMapFixture(fixture, [
      "--latest-json",
      fixture.latestJson,
      "--latest-md",
      fixture.latestMarkdown,
      "--report-dir",
      fixture.releaseIntakeDir,
      "--run-id",
      "latest-only-after-full",
      "--no-report",
      "--json",
      "--reason",
      "latest-only output regression"
    ]);
    assert.equal(noReportRefresh.status, 0, combinedOutput(noReportRefresh));

    const saved = await readJson(fixture.latestJson);
    assert.deepEqual(Object.keys(saved.outputPaths), ["latestJson"]);
    const current = runDirtyMapFixture(fixture, [
      "--assert-current",
      "--latest-json",
      fixture.latestJson,
      "--latest-md",
      fixture.latestMarkdown,
      "--report-dir",
      fixture.releaseIntakeDir,
      "--max-age-minutes",
      "60",
      "--json"
    ]);
    assert.equal(current.status, 0, combinedOutput(current));
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("dirty map opens generated outputs nonblocking before descriptor type validation", async () => {
  const source = await readFile(path.join(repoRoot, "scripts", "refresh-dirty-tree-map.mjs"), "utf8");
  const openFlags = source.match(/function directRegularOpenFlags\(\) \{[\s\S]*?\n\}/u)?.[0] ?? "";
  assert.match(source, /fs\.open\(filePath, directRegularOpenFlags\(\)\)/u);
  assert.match(openFlags, /fsConstants\.O_RDONLY/u);
  assert.match(openFlags, /fsConstants\.O_NOFOLLOW/u);
  assert.match(openFlags, /fsConstants\.O_NONBLOCK/u);
  assert.doesNotMatch(openFlags, /\?\?\s*0/u);
  assert.match(source, /Number\.isInteger\(fsConstants\.O_NOFOLLOW\)/u);
  assert.match(source, /Number\.isInteger\(fsConstants\.O_NONBLOCK\)/u);
});

test("dirty map assert-current rejects untrusted saved output-path schemas without disclosing values", async (t) => {
  const redactedMarker = "do-not-disclose-output-path";
  const cases = [
    ["missing outputPaths", (saved) => delete saved.outputPaths],
    ["array outputPaths", (saved) => { saved.outputPaths = []; }],
    ["missing key", (saved) => delete saved.outputPaths.reportMarkdown],
    ["unknown key", (saved) => { saved.outputPaths.unknown = `coordination/release-intake/${redactedMarker}`; }],
    ["absolute path", (saved, fixture) => { saved.outputPaths.reportJson = path.join(fixture.root, redactedMarker); }],
    ["traversal path", (saved) => { saved.outputPaths.reportJson = `../../${redactedMarker}`; }],
    ["non-canonical path", (saved) => { saved.outputPaths.reportJson = saved.outputPaths.reportJson.replace("release-intake/", "release-intake/./"); }],
    ["wrong directory", (saved) => { saved.outputPaths.reportJson = `app/${redactedMarker}.json`; }],
    ["unknown report filename", (saved) => { saved.outputPaths.reportJson = `coordination/release-intake/${redactedMarker}.json`; }],
    ["mismatched report pair", (saved) => { saved.outputPaths.reportMarkdown = `coordination/release-intake/2026-01-01-A25-dirty-tree-map-${redactedMarker}.md`; }],
    ["duplicate output", (saved) => { saved.outputPaths.reportJson = saved.outputPaths.latestJson; }],
    ["unexpected latest path", (saved) => { saved.outputPaths.latestJson = `coordination/release-intake/${redactedMarker}.json`; }]
  ];

  for (const [name, mutate] of cases) {
    await t.test(name, async () => {
      const fixture = await createDirtyMapFixtureRepo();
      try {
        const refresh = runDirtyMapFixture(fixture, [
          "--latest-json",
          fixture.latestJson,
          "--latest-md",
          fixture.latestMarkdown,
          "--report-dir",
          fixture.releaseIntakeDir,
          "--run-id",
          "saved-output-validation",
          "--json",
          "--reason",
          "saved output validation regression"
        ]);
        assert.equal(refresh.status, 0, combinedOutput(refresh));

        const saved = await readJson(fixture.latestJson);
        mutate(saved, fixture);
        await writeFile(fixture.latestJson, `${JSON.stringify(saved, null, 2)}\n`);

        const result = runDirtyMapFixture(fixture, [
          "--assert-current",
          "--latest-json",
          fixture.latestJson,
          "--latest-md",
          fixture.latestMarkdown,
          "--report-dir",
          fixture.releaseIntakeDir,
          "--max-age-minutes",
          "60",
          "--json"
        ]);
        const output = combinedOutput(result);
        assert.notEqual(result.status, 0);
        assert.match(output, /dirty-tree map outputPaths is invalid/i);
        assert.doesNotMatch(output, new RegExp(redactedMarker));
      } finally {
        await rm(fixture.root, { recursive: true, force: true });
      }
    });
  }
});

test("dirty map assert-current redacts invalid saved JSON contents", async () => {
  const fixture = await createDirtyMapFixtureRepo();
  const redactedMarker = "do-not-disclose-invalid-map-content";

  try {
    const refresh = runDirtyMapFixture(fixture, [
      "--latest-json",
      fixture.latestJson,
      "--no-report",
      "--json",
      "--reason",
      "invalid JSON redaction regression"
    ]);
    assert.equal(refresh.status, 0, combinedOutput(refresh));
    await writeFile(fixture.latestJson, `invalid JSON ${redactedMarker}\n`);

    const result = runDirtyMapFixture(fixture, [
      "--assert-current",
      "--latest-json",
      fixture.latestJson,
      "--max-age-minutes",
      "60",
      "--json"
    ]);
    const output = combinedOutput(result);
    assert.notEqual(result.status, 0);
    assert.match(output, /dirty-tree map JSON is invalid/i);
    assert.doesNotMatch(output, new RegExp(redactedMarker));
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("dirty map assert-current validates reflected saved metadata before diagnostics", async (t) => {
  const redactedMarker = "do-not-disclose-saved-metadata";
  const cases = [
    ["signature characters", (saved) => { saved.statusSignature = `${redactedMarker}\n`; }],
    ["uppercase signature", (saved) => { saved.statusSignature = "A".repeat(64); }],
    ["missing expanded count", (saved) => { delete saved.statusCounts.expandedStatusEntries; }],
    ["non-integer expanded count", (saved) => { saved.statusCounts.expandedStatusEntries = `${redactedMarker}\n`; }],
    ["unknown count key", (saved) => { saved.statusCounts.unknown = redactedMarker; }],
    ["other count string", (saved) => { saved.statusCounts.trackedModified = redactedMarker; }],
    ["other count object", (saved) => { saved.statusCounts.trackedDeleted = { value: redactedMarker }; }],
    ["noncanonical generated timestamp", (saved) => { saved.generatedAt = `2026-07-13 ${redactedMarker}`; }]
  ];

  for (const [name, mutate] of cases) {
    await t.test(name, async () => {
      const fixture = await createDirtyMapFixtureRepo();
      try {
        const refresh = runDirtyMapFixture(fixture, [
          "--latest-json",
          fixture.latestJson,
          "--latest-md",
          fixture.latestMarkdown,
          "--report-dir",
          fixture.releaseIntakeDir,
          "--run-id",
          "saved-metadata-validation",
          "--json",
          "--reason",
          "saved metadata validation regression"
        ]);
        assert.equal(refresh.status, 0, combinedOutput(refresh));

        const saved = await readJson(fixture.latestJson);
        mutate(saved);
        await writeFile(fixture.latestJson, `${JSON.stringify(saved, null, 2)}\n`);
        const result = runDirtyMapFixture(fixture, [
          "--assert-current",
          "--latest-json",
          fixture.latestJson,
          "--latest-md",
          fixture.latestMarkdown,
          "--report-dir",
          fixture.releaseIntakeDir,
          "--max-age-minutes",
          "60",
          "--json"
        ]);
        const output = combinedOutput(result);
        assert.notEqual(result.status, 0);
        assert.match(output, /dirty-tree map assertion metadata is invalid/i);
        assert.doesNotMatch(output, new RegExp(redactedMarker));
      } finally {
        await rm(fixture.root, { recursive: true, force: true });
      }
    });
  }
});

test("dirty map saved outputs cannot hide an unrelated dirty entry", async () => {
  const fixture = await createDirtyMapFixtureRepo();
  const redactedMarker = "do-not-disclose-hidden-dirty-entry";

  try {
    const refresh = runDirtyMapFixture(fixture, [
      "--latest-json",
      fixture.latestJson,
      "--latest-md",
      fixture.latestMarkdown,
      "--report-dir",
      fixture.releaseIntakeDir,
      "--run-id",
      "hidden-dirty-entry",
      "--json",
      "--reason",
      "saved output trust-boundary regression"
    ]);
    assert.equal(refresh.status, 0, combinedOutput(refresh));

    const saved = await readJson(fixture.latestJson);
    await rm(path.join(fixture.root, saved.outputPaths.reportJson));
    await rm(path.join(fixture.root, saved.outputPaths.reportMarkdown));
    const unrelatedStem = `2026-01-01-A25-dirty-tree-map-${redactedMarker}`;
    const unrelatedJson = path.join(fixture.releaseIntakeDir, `${unrelatedStem}.json`);
    const unrelatedMarkdown = path.join(fixture.releaseIntakeDir, `${unrelatedStem}.md`);
    await writeFile(unrelatedJson, "unrelated dirty JSON fixture\n");
    await writeFile(unrelatedMarkdown, "unrelated dirty Markdown fixture\n");
    saved.outputPaths.reportJson = path.posix.join(
      "coordination/release-intake",
      `${unrelatedStem}.json`
    );
    saved.outputPaths.reportMarkdown = path.posix.join(
      "coordination/release-intake",
      `${unrelatedStem}.md`
    );
    await writeFile(fixture.latestJson, `${JSON.stringify(saved, null, 2)}\n`);

    const result = runDirtyMapFixture(fixture, [
      "--assert-current",
      "--latest-json",
      fixture.latestJson,
      "--latest-md",
      fixture.latestMarkdown,
      "--report-dir",
      fixture.releaseIntakeDir,
      "--max-age-minutes",
      "60",
      "--json"
    ]);
    const output = combinedOutput(result);
    assert.notEqual(result.status, 0);
    assert.match(output, /generated output artifacts are invalid/i);
    assert.doesNotMatch(output, new RegExp(redactedMarker));
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("dirty map assert-current rejects partial or symlinked generated output sets", async (t) => {
  const cases = [
    ["missing report", async (fixture, saved) => {
      await rm(path.join(fixture.root, saved.outputPaths.reportMarkdown));
    }],
    ["symlinked report", async (fixture, saved) => {
      const reportJson = path.join(fixture.root, saved.outputPaths.reportJson);
      await rm(reportJson);
      await symlink(path.basename(saved.outputPaths.latestJson), reportJson);
    }],
    ["hardlinked report", async (fixture, saved) => {
      const reportJson = path.join(fixture.root, saved.outputPaths.reportJson);
      await rm(reportJson);
      await link(fixture.latestJson, reportJson);
    }]
  ];

  for (const [name, mutate] of cases) {
    await t.test(name, async () => {
      const fixture = await createDirtyMapFixtureRepo();
      try {
        const refresh = runDirtyMapFixture(fixture, [
          "--latest-json",
          fixture.latestJson,
          "--latest-md",
          fixture.latestMarkdown,
          "--report-dir",
          fixture.releaseIntakeDir,
          "--run-id",
          "generated-output-node-validation",
          "--json",
          "--reason",
          "generated output node validation regression"
        ]);
        assert.equal(refresh.status, 0, combinedOutput(refresh));

        const saved = await readJson(fixture.latestJson);
        await mutate(fixture, saved);
        const result = runDirtyMapFixture(fixture, [
          "--assert-current",
          "--latest-json",
          fixture.latestJson,
          "--latest-md",
          fixture.latestMarkdown,
          "--report-dir",
          fixture.releaseIntakeDir,
          "--max-age-minutes",
          "60",
          "--json"
        ]);
        assert.notEqual(result.status, 0);
        assert.match(combinedOutput(result), /generated output artifacts (?:are invalid|changed during assertion)/i);
      } finally {
        await rm(fixture.root, { recursive: true, force: true });
      }
    });
  }
});

test("dirty map assert-current rejects a sparse generated output above the fixed size limit", async () => {
  const fixture = await createDirtyMapFixtureRepo();

  try {
    const refresh = runDirtyMapFixture(fixture, [
      "--latest-json",
      fixture.latestJson,
      "--latest-md",
      fixture.latestMarkdown,
      "--report-dir",
      fixture.releaseIntakeDir,
      "--run-id",
      "generated-output-size-limit",
      "--json",
      "--reason",
      "generated output size limit regression"
    ]);
    assert.equal(refresh.status, 0, combinedOutput(refresh));

    const saved = await readJson(fixture.latestJson);
    await truncate(
      path.join(fixture.root, saved.outputPaths.reportJson),
      128 * 1024 * 1024 + 1
    );
    const result = runDirtyMapFixture(fixture, [
      "--assert-current",
      "--latest-json",
      fixture.latestJson,
      "--latest-md",
      fixture.latestMarkdown,
      "--report-dir",
      fixture.releaseIntakeDir,
      "--max-age-minutes",
      "60",
      "--json"
    ], { timeout: 5000 });
    assert.notEqual(result.status, 0);
    assert.match(combinedOutput(result), /generated output artifact exceeds the 128 MiB safety limit/i);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("dirty map assert-current rejects generated outputs reached through an intermediate directory symlink", async () => {
  const fixture = await createDirtyMapFixtureRepo();
  const redactedMarker = "do-not-disclose-canonical-output-root";
  const externalRoot = await mkdtemp(path.join(tmpdir(), `${redactedMarker}-`));
  const externalReportDir = path.join(externalRoot, "reports");
  const linkedAncestor = path.join(fixture.releaseIntakeDir, "external-ancestor");
  const lexicalReportDir = path.join(linkedAncestor, "reports");
  const repoRelative = (absolutePath) =>
    path.relative(fixture.root, absolutePath).split(path.sep).join("/");

  try {
    await mkdir(externalReportDir, { recursive: true });
    await symlink(externalRoot, linkedAncestor, "dir");
    const refresh = runDirtyMapFixture(fixture, [
      "--latest-json",
      fixture.latestJson,
      "--latest-md",
      fixture.latestMarkdown,
      "--report-dir",
      fixture.releaseIntakeDir,
      "--run-id",
      "canonical-output-source",
      "--json",
      "--reason",
      "intermediate directory symlink regression"
    ]);
    assert.equal(refresh.status, 0, combinedOutput(refresh));

    const saved = await readJson(fixture.latestJson);
    const originalPaths = Object.values(saved.outputPaths).map((outputPath) =>
      path.join(fixture.root, outputPath)
    );
    const latestMarkdownBytes = await readFile(fixture.latestMarkdown);
    const externalLatestJson = path.join(lexicalReportDir, "latest-A25-dirty-tree-map.json");
    const externalLatestMarkdown = path.join(lexicalReportDir, "latest-A25-dirty-tree-map.md");
    const externalReportJson = path.join(
      lexicalReportDir,
      path.basename(saved.outputPaths.reportJson)
    );
    const externalReportMarkdown = path.join(
      lexicalReportDir,
      path.basename(saved.outputPaths.reportMarkdown)
    );
    saved.outputPaths = {
      latestJson: repoRelative(externalLatestJson),
      latestMarkdown: repoRelative(externalLatestMarkdown),
      reportJson: repoRelative(externalReportJson),
      reportMarkdown: repoRelative(externalReportMarkdown)
    };
    const savedBytes = `${JSON.stringify(saved, null, 2)}\n`;
    for (const originalPath of originalPaths) {
      await rm(originalPath);
    }
    await writeFile(externalLatestJson, savedBytes);
    await writeFile(externalLatestMarkdown, latestMarkdownBytes);
    await writeFile(externalReportJson, savedBytes);
    await writeFile(externalReportMarkdown, latestMarkdownBytes);

    const result = runDirtyMapFixture(fixture, [
      "--assert-current",
      "--latest-json",
      externalLatestJson,
      "--latest-md",
      externalLatestMarkdown,
      "--report-dir",
      lexicalReportDir,
      "--max-age-minutes",
      "60",
      "--json"
    ]);
    const output = combinedOutput(result);
    assert.notEqual(result.status, 0);
    assert.match(output, /generated output canonical path is invalid/i);
    assert.doesNotMatch(output, new RegExp(redactedMarker));
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
    await rm(externalRoot, { recursive: true, force: true });
  }
});

test("dirty map assert-current enforces one aggregate buffer limit across four generated outputs", async () => {
  const fixture = await createDirtyMapFixtureRepo();

  try {
    const refresh = runDirtyMapFixture(fixture, [
      "--latest-json",
      fixture.latestJson,
      "--latest-md",
      fixture.latestMarkdown,
      "--report-dir",
      fixture.releaseIntakeDir,
      "--run-id",
      "generated-output-aggregate-limit",
      "--json",
      "--reason",
      "generated output aggregate buffer regression"
    ]);
    assert.equal(refresh.status, 0, combinedOutput(refresh));

    const saved = await readJson(fixture.latestJson);
    for (const key of ["latestMarkdown", "reportJson", "reportMarkdown"]) {
      await truncate(path.join(fixture.root, saved.outputPaths[key]), 48 * 1024 * 1024);
    }
    const result = runDirtyMapFixture(fixture, [
      "--assert-current",
      "--latest-json",
      fixture.latestJson,
      "--latest-md",
      fixture.latestMarkdown,
      "--report-dir",
      fixture.releaseIntakeDir,
      "--max-age-minutes",
      "60",
      "--json"
    ], { timeout: 5000 });
    assert.notEqual(result.status, 0);
    assert.match(combinedOutput(result), /generated outputs exceed the 128 MiB aggregate buffer limit/i);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("dirty map assert-current rejects timestamped report names the producer cannot generate", async (t) => {
  const cases = [
    ["invalid calendar date", "2026-13-40-A25-dirty-tree-map-valid-run"],
    ["leading run-id hyphen", "2026-01-01-A25-dirty-tree-map--invalid-run"],
    ["hyphen-only run id", "2026-01-01-A25-dirty-tree-map--"]
  ];

  for (const [name, reportStem] of cases) {
    await t.test(name, async () => {
      const fixture = await createDirtyMapFixtureRepo();
      try {
        const refresh = runDirtyMapFixture(fixture, [
          "--latest-json",
          fixture.latestJson,
          "--latest-md",
          fixture.latestMarkdown,
          "--report-dir",
          fixture.releaseIntakeDir,
          "--run-id",
          "producer-name-grammar",
          "--json",
          "--reason",
          "generated report name grammar regression"
        ]);
        assert.equal(refresh.status, 0, combinedOutput(refresh));

        const saved = await readJson(fixture.latestJson);
        const oldReportJson = path.join(fixture.root, saved.outputPaths.reportJson);
        const oldReportMarkdown = path.join(fixture.root, saved.outputPaths.reportMarkdown);
        saved.outputPaths.reportJson = path.posix.join(
          "coordination/release-intake",
          `${reportStem}.json`
        );
        saved.outputPaths.reportMarkdown = path.posix.join(
          "coordination/release-intake",
          `${reportStem}.md`
        );
        await writeFile(fixture.latestJson, `${JSON.stringify(saved, null, 2)}\n`);
        await copyFile(fixture.latestJson, path.join(fixture.root, saved.outputPaths.reportJson));
        await copyFile(fixture.latestMarkdown, path.join(fixture.root, saved.outputPaths.reportMarkdown));
        await rm(oldReportJson);
        await rm(oldReportMarkdown);

        const result = runDirtyMapFixture(fixture, [
          "--assert-current",
          "--latest-json",
          fixture.latestJson,
          "--latest-md",
          fixture.latestMarkdown,
          "--report-dir",
          fixture.releaseIntakeDir,
          "--max-age-minutes",
          "60",
          "--json"
        ]);
        assert.notEqual(result.status, 0);
        assert.match(combinedOutput(result), /dirty-tree map outputPaths is invalid/i);
      } finally {
        await rm(fixture.root, { recursive: true, force: true });
      }
    });
  }
});

test("dirty map assert-current detects an ignored report mutation during status capture", async () => {
  const fixture = await createDirtyMapFixtureRepo();
  const raceRoot = await mkdtemp(path.join(tmpdir(), "mais-dirty-map-race-"));

  try {
    const refresh = runDirtyMapFixture(fixture, [
      "--latest-json",
      fixture.latestJson,
      "--latest-md",
      fixture.latestMarkdown,
      "--report-dir",
      fixture.releaseIntakeDir,
      "--run-id",
      "generated-output-race",
      "--json",
      "--reason",
      "generated output race regression"
    ]);
    assert.equal(refresh.status, 0, combinedOutput(refresh));

    const saved = await readJson(fixture.latestJson);
    const lookup = spawnSync("/bin/sh", ["-c", "command -v git"], {
      cwd: fixture.root,
      encoding: "utf8"
    });
    assert.equal(lookup.status, 0, combinedOutput(lookup));
    const fakeBin = path.join(raceRoot, "fake-bin");
    const fakeGit = path.join(fakeBin, "git");
    const raceMarker = path.join(raceRoot, "git-race-fired");
    await mkdir(fakeBin, { recursive: true });
    await writeFile(
      fakeGit,
      `#!/bin/sh
if [ "$1" = "status" ] && [ ! -e "$DIRTY_MAP_RACE_MARKER" ]; then
  printf '%s\\n' 'mutated during status capture' > "$DIRTY_MAP_RACE_TARGET"
  : > "$DIRTY_MAP_RACE_MARKER"
fi
exec "$REAL_GIT_PATH" "$@"
`
    );
    await chmod(fakeGit, 0o755);

    const result = runDirtyMapFixture(fixture, [
      "--assert-current",
      "--latest-json",
      fixture.latestJson,
      "--latest-md",
      fixture.latestMarkdown,
      "--report-dir",
      fixture.releaseIntakeDir,
      "--max-age-minutes",
      "60",
      "--json"
    ], {
      env: {
        PATH: `${fakeBin}:${process.env.PATH}`,
        REAL_GIT_PATH: lookup.stdout.trim(),
        DIRTY_MAP_RACE_MARKER: raceMarker,
        DIRTY_MAP_RACE_TARGET: path.join(fixture.root, saved.outputPaths.reportJson)
      }
    });
    assert.notEqual(result.status, 0);
    assert.match(combinedOutput(result), /generated output artifacts changed during assertion/i);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
    await rm(raceRoot, { recursive: true, force: true });
  }
});

test("dirty map assert-current blocks strict unmapped owner entries", async () => {
  const fixture = await createDirtyMapFixtureRepo();
  const fixturePath = path.join(fixture.root, "zz-release-unmapped-fixture.tmpx");

  try {
    await writeFile(fixturePath, "temporary unmapped owner fixture\n");
    const refresh = runDirtyMapFixture(fixture, [
      "--latest-json",
      fixture.latestJson,
      "--no-report",
      "--json",
      "--reason",
      "strict unmapped owner regression"
    ]);
    assert.equal(refresh.status, 0, combinedOutput(refresh));

    const result = runDirtyMapFixture(fixture, [
      "--assert-current",
      "--latest-json",
      fixture.latestJson,
      "--max-age-minutes",
      "60",
      "--json"
    ]);

    assert.notEqual(result.status, 0);
    assert.match(combinedOutput(result), /unmapped owner/i);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("package gate rejects dot staging and invalid final states", async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), "mais-package-gate-"));
  const manifestPath = path.join(tempDir, "owner-package-manifest.json");

  try {
    await writeFile(
      manifestPath,
      `${JSON.stringify({
        packages: [
          {
            id: "bad-package",
            owner: "A10",
            pathspecs: ["."],
            checks: ["npm run type-check"],
            finalState: "maybe"
          }
        ]
      }, null, 2)}\n`
    );

    const result = runNode([
      "scripts/release-package-gate.mjs",
      "--manifest",
      manifestPath,
      "--json"
    ]);

    assert.notEqual(result.status, 0);
    assert.match(combinedOutput(result), /git add \./i);
    assert.match(combinedOutput(result), /final state/i);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("package gate rejects normalized full-tree staging equivalents", async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), "mais-full-tree-gate-"));
  const manifestPath = path.join(tempDir, "owner-package-manifest.json");
  const forbidden = [
    ".",
    "./",
    ":/",
    "*",
    "**",
    "./*",
    "./**",
    "./**/*",
    "**/*",
    ":(top)*",
    ":(glob)*",
    ":(top,glob)**",
    ":(glob,top)**/*",
    ":(top)**/*"
  ];

  try {
    await writeFile(
      manifestPath,
      `${JSON.stringify({
        packages: [
          {
            id: "full-tree-package",
            owner: "A10",
            pathspecs: forbidden,
            checks: ["npm run type-check"],
            finalState: "reviewed commit"
          }
        ]
      }, null, 2)}\n`
    );

    const result = runNode([
      "scripts/release-package-gate.mjs",
      "--manifest",
      manifestPath,
      "--json"
    ]);
    assert.notEqual(result.status, 0);
    const output = combinedOutput(result);
    for (const pathspec of forbidden) {
      assert.ok(output.includes(`pathspec \\\"${pathspec}\\\" is forbidden`), `must reject ${pathspec}`);
    }
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("default package gate and exact owner mappings are valid", async () => {
  const pathspecManifest = await readJson(
    path.join(repoRoot, "coordination/release-intake/owner-pathspecs.json")
  );
  const packageManifest = await readJson(
    path.join(repoRoot, "coordination/release-intake/owner-package-manifest.json")
  );

  assertOwnerMapping(pathspecManifest, "data/hjbQuestionLocalization.ts", "A04", ["A18", "A09", "A05"]);
  assertOwnerMapping(pathspecManifest, "lib/questionFigure.ts", "A24", ["A04", "A08", "A18", "A11", "A12"]);
  assertOwnerMapping(pathspecManifest, "lib/questionFigure.test.ts", "A24", ["A04", "A08", "A18", "A11"]);
  assertOwnerMapping(pathspecManifest, ".claude/launch.json", "A22", ["A10", "A11"]);
  assertOwnerMapping(pathspecManifest, "scripts/dev-isolated.mjs", "A22", ["A10", "A11"]);
  assertOwnerMapping(pathspecManifest, "scripts/kill-port.mjs", "A22", ["A10", "A11"]);
  assertOwnerMapping(pathspecManifest, "coordination/release-intake/assert-release-source-clean.mjs", "A22", ["A10", "A25"]);
  assertOwnerMapping(pathspecManifest, "coordination/release-intake/assert-worktree-lifecycle.mjs", "A22", ["A10", "A25"]);
  assertOwnerMapping(pathspecManifest, "MAIS_Competitive_Analysis_K12_Math.docx", "A10", ["A16"]);
  assertOwnerMapping(pathspecManifest, ".env.local.example", "A19", ["A07", "A15", "A22"]);
  assertOwnerMapping(pathspecManifest, "package-lock.json", "A10", []);

  const importTargetPackage = packageWithExactPathspec(pathspecManifest, "scripts/check-import-targets*.mjs");
  assert.ok(importTargetPackage, "scripts/check-import-targets*.mjs must have a durable owner mapping");
  assert.equal(importTargetPackage.owner, "A22");
  assert.deepEqual([...(importTargetPackage.coordinatesWith ?? [])].sort(), ["A10"].sort());

  const nextConfigReleasePackage = packageWithExactPathspec(packageManifest, "next.config.ts");
  assert.ok(nextConfigReleasePackage, "next.config.ts must be explicit in the P0 release-hygiene package");
  assert.equal(nextConfigReleasePackage.id, "foundation-release-hygiene-A22-A10");

  const evidencePackage = packageManifest.packages.find((pkg) => pkg.id === "external-worktree-evidence-A25-A22");
  assert.ok(evidencePackage, "external worktree evidence package must remain explicit");
  assert.deepEqual(evidencePackage.pathspecs, [
    "coordination/release-intake/evidence-archive-lib.mjs",
    "coordination/release-intake/refresh-linked-worktree-archive-evidence.mjs",
    "coordination/release-intake/assert-linked-worktree-archive-evidence-current.mjs",
    "coordination/release-intake/refresh-linked-worktree-archive-evidence.test.mjs",
    "scripts/release-governance.test.mjs",
    "package.json",
    "package-lock.json"
  ]);

  assert.deepEqual(packageManifest.policy.allowedFinalStates, [
    "reviewed commit",
    "owner-approved discard",
    "evidence archive",
    "blocker report"
  ]);

  const gate = runNode(["scripts/release-package-gate.mjs", "--json"]);
  assert.equal(gate.status, 0, combinedOutput(gate));
  const result = JSON.parse(gate.stdout);
  assert.equal(result.valid, true);
  assert.ok(result.packageCount > 0);
});

test("shared owner resolver selects one most-specific owner across overlapping pathspecs", async () => {
  const gateModule = await import("./release-package-gate.mjs");
  assert.equal(typeof gateModule.compileOwnerPathspecManifest, "function");
  assert.equal(typeof gateModule.resolveOwnerPath, "function");

  const manifest = await readJson(
    path.join(repoRoot, "coordination/release-intake/owner-pathspecs.json")
  );
  const resolver = gateModule.compileOwnerPathspecManifest(manifest);
  const cases = [
    ["coordination/release-intake/example.json", "A25"],
    ["coordination/content-qa/example.md", "A18"],
    ["coordination/content-qa/example-exact-overlay.svg", "A24"],
    ["coordination/integration/example.md", "A23"],
    ["coordination/reports/example.md", "A10"],
    ["coordination/release-intake/assert-release-source-clean.mjs", "A22"],
    ["coordination/release-intake/assert-worktree-lifecycle.mjs", "A22"],
    ["scripts/release-env-guard.mjs", "A22"],
    ["scripts/bug-triage.js", "A10"],
    ["app/api/ai-tutor/route.ts", "A07"],
    ["app/api/adaptive-learning/route.ts", "A15"],
    ["app/api/users/route.ts", "A12"],
    ["components/gamification/FishingGame.tsx", "A20"],
    ["components/gamification/BadgeShelf.tsx", "A17"],
    ["components/ui/GradeSelector.tsx", "A03"],
    ["components/ui/ThemeToggle.tsx", "A01"],
    [".env.local.example", "A19"],
    [".env.local", "A25"]
  ];

  for (const [filePath, expectedOwner] of cases) {
    const resolution = gateModule.resolveOwnerPath(filePath, resolver);
    assert.equal(resolution.status, "resolved", `${filePath} resolution status`);
    assert.deepEqual(resolution.finalOwners, [expectedOwner], `${filePath} final owner`);
    assert.equal(resolution.ownerId, expectedOwner, `${filePath} selected owner`);
  }
});

test("package gate rejects ambiguous final owner precedence", async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), "mais-owner-overlap-"));
  const ownerPathspecs = path.join(tempDir, "owner-pathspecs.json");

  try {
    await writeFile(
      ownerPathspecs,
      `${JSON.stringify({
        version: 1,
        packages: [
          { id: "owner-a", owner: "A01", role: "first", pathspecs: ["same/path.ts"] },
          { id: "owner-b", owner: "A02", role: "second", pathspecs: ["same/path.ts"] }
        ],
        resolutionChecks: [{ path: "same/path.ts", expectedOwner: "A01" }]
      }, null, 2)}\n`
    );

    const result = runNode([
      "scripts/release-package-gate.mjs",
      "--owner-pathspecs",
      ownerPathspecs,
      "--json"
    ]);
    assert.notEqual(result.status, 0);
    assert.match(combinedOutput(result), /ambiguous|exactly one final owner/i);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("package gate requires every package wildcard to have one exact owner route", async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), "mais-wildcard-routing-"));
  const packageManifest = path.join(tempDir, "owner-package-manifest.json");
  const missingOwnerPathspecs = path.join(tempDir, "missing-owner-pathspecs.json");
  const ambiguousOwnerPathspecs = path.join(tempDir, "ambiguous-owner-pathspecs.json");

  try {
    await writeFile(
      packageManifest,
      `${JSON.stringify({
        packages: [
          {
            id: "wildcard-package",
            owner: "A10",
            pathspecs: ["shared/**"],
            checks: ["npm run type-check"],
            finalState: "reviewed commit"
          }
        ]
      }, null, 2)}\n`
    );
    await writeFile(
      missingOwnerPathspecs,
      `${JSON.stringify({
        packages: [{ id: "other", owner: "A10", role: "other", pathspecs: ["other/**"] }],
        resolutionChecks: [{ path: "other/example.ts", expectedOwner: "A10" }]
      }, null, 2)}\n`
    );
    await writeFile(
      ambiguousOwnerPathspecs,
      `${JSON.stringify({
        packages: [
          { id: "shared-a", owner: "A10", role: "first", pathspecs: ["shared/**"] },
          { id: "shared-b", owner: "A22", role: "second", pathspecs: ["shared/**"] }
        ],
        resolutionChecks: [{ path: "shared/example.ts", expectedOwner: "A10" }]
      }, null, 2)}\n`
    );

    const missing = runNode([
      "scripts/release-package-gate.mjs",
      "--manifest",
      packageManifest,
      "--owner-pathspecs",
      missingOwnerPathspecs,
      "--json"
    ]);
    assert.notEqual(missing.status, 0);
    assert.match(combinedOutput(missing), /wildcard.*shared\/\*\*.*exact owner pathspec/i);

    const ambiguous = runNode([
      "scripts/release-package-gate.mjs",
      "--manifest",
      packageManifest,
      "--owner-pathspecs",
      ambiguousOwnerPathspecs,
      "--json"
    ]);
    assert.notEqual(ambiguous.status, 0);
    assert.match(combinedOutput(ambiguous), /ambiguous|exactly one final owner/i);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("dirty map records exactly one final owner for every resolved capture entry", async () => {
  const fixture = await createDirtyMapFixtureRepo();
  const ownerFixtures = [
    ["coordination/release-intake/example.json", "A25"],
    ["coordination/content-qa/example.md", "A18"],
    ["app/api/users/fixture.ts", "A12"],
    ["components/gamification/BadgeShelf.tsx", "A17"],
    ["public/question-illustrations/fixture.svg", "A24"],
    ["next.config.ts", "A10"]
  ];

  try {
    for (const [relativePath] of ownerFixtures) {
      const filePath = path.join(fixture.root, relativePath);
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, `owner fixture: ${relativePath}\n`);
    }

    const refresh = runDirtyMapFixture(fixture, [
      "--latest-json",
      fixture.latestJson,
      "--no-report",
      "--json",
      "--reason",
      "unique final owner regression"
    ]);
    assert.equal(refresh.status, 0, combinedOutput(refresh));

    const map = await readJson(fixture.latestJson);
    assert.equal(map.statusCounts.unmappedEntries, 0);
    assert.equal(map.statusCounts.ambiguousOwnerEntries, 0);
    assert.equal(map.sliceBuckets["unmapped/manual"] ?? 0, 0);
    for (const [relativePath, expectedOwner] of ownerFixtures) {
      const entry = map.entries.find((candidate) => candidate.path === relativePath);
      assert.ok(entry, `Missing isolated owner fixture: ${relativePath}`);
      assert.equal(entry.ownerId, expectedOwner, relativePath);
    }
    for (const entry of map.entries) {
      assert.equal(entry.ownerResolution.status, "resolved", entry.path);
      assert.equal(entry.ownerResolution.finalOwners.length, 1, entry.path);
      assert.equal(entry.ownerResolution.finalOwners[0], entry.ownerId, entry.path);
    }
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("mais-dev launch uses the isolated dev wrapper and keeps fixture-only env", async () => {
  const launch = await readJson(path.join(repoRoot, ".claude/launch.json"));
  const maisDev = launch.configurations.find((configuration) => configuration.name === "mais-dev");
  assert.ok(maisDev, "mais-dev launch configuration is required");

  const npmIndex = maisDev.runtimeArgs.indexOf("npm");
  assert.notEqual(npmIndex, -1);
  assert.deepEqual(maisDev.runtimeArgs.slice(npmIndex), [
    "npm",
    "run",
    "dev:isolated",
    "--",
    "--port",
    "3000",
    "--dist",
    ".tmp/mais-dev/next-dist"
  ]);
  assert.ok(maisDev.runtimeArgs.includes("AI_TUTOR_PROVIDER_PROFILE=offline-fixture"));
  assert.ok(maisDev.runtimeArgs.includes("OPENAI_API_KEY="));
  assert.ok(maisDev.runtimeArgs.includes("ANTHROPIC_API_KEY="));
});

test("isolated launch helper dependencies are coherent and Git tracked", async () => {
  const packageJson = await readJson(path.join(repoRoot, "package.json"));
  const launch = await readJson(path.join(repoRoot, ".claude/launch.json"));
  const helpers = ["scripts/dev-isolated.mjs", "scripts/kill-port.mjs"];

  assert.equal(packageJson.scripts["dev:isolated"], "node scripts/dev-isolated.mjs");
  assert.equal(packageJson.scripts["kill-port"], "node scripts/kill-port.mjs");
  assert.ok(
    launch.configurations.find((configuration) => configuration.name === "mais-dev")
      .runtimeArgs.includes("dev:isolated")
  );

  for (const helper of helpers) {
    const tracked = runGit(["ls-files", "--error-unmatch", helper], repoRoot);
    assert.equal(tracked.status, 0, `${helper} must be Git-tracked\n${combinedOutput(tracked)}`);
    const syntax = runNode(["--check", helper]);
    assert.equal(syntax.status, 0, combinedOutput(syntax));
  }
});

test("dev-isolated rejects every invalid port before spawning Next", async () => {
  const fixture = await createDevIsolatedFixture();
  const invalidArgs = [
    ["--port", "abc", "--dist", ".tmp/dev"],
    ["--port", "1.5", "--dist", ".tmp/dev"],
    ["--port", "0", "--dist", ".tmp/dev"],
    ["--port", "-1", "--dist", ".tmp/dev"],
    ["--port", "65536", "--dist", ".tmp/dev"],
    ["--port", "--dist", ".tmp/dev"]
  ];

  try {
    for (const args of invalidArgs) {
      await rm(fixture.markerPath, { force: true });
      const result = runNodeAt(fixture.root, [fixture.scriptPath, ...args], {
        timeout: 2000,
        env: { FAKE_NEXT_MARKER: fixture.markerPath }
      });
      assert.notEqual(result.status, 0, `invalid args must fail: ${args.join(" ")}`);
      assert.match(combinedOutput(result), /port.*(?:integer.*1.*65535|requires a value)/i);
      const marker = await readFile(fixture.markerPath, "utf8").catch(() => "");
      assert.equal(marker, "", "invalid port must fail before child spawn");
    }
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("dev-isolated requires a lexical and canonical proper descendant of repo .tmp", async () => {
  const fixture = await createDevIsolatedFixture();
  const outsideDir = path.join(fixture.root, "outside");
  const escapeLink = path.join(fixture.root, ".tmp", "escape-link");
  await mkdir(outsideDir, { recursive: true });
  await symlink(outsideDir, escapeLink, "dir");
  const unsafeDists = [
    ".tmp",
    ".next",
    ".next/subdir",
    ".tmp/../.next/subdir",
    ".tmp-sibling/build",
    "app/build",
    outsideDir,
    ".tmp/escape-link/build"
  ];

  try {
    for (const dist of unsafeDists) {
      await rm(fixture.markerPath, { force: true });
      const result = runNodeAt(
        fixture.root,
        [fixture.scriptPath, "--port", "3200", "--dist", dist],
        { timeout: 2000, env: { FAKE_NEXT_MARKER: fixture.markerPath } }
      );
      assert.notEqual(result.status, 0, `unsafe dist must fail: ${dist}`);
      assert.match(combinedOutput(result), /dist.*proper descendant.*\.tmp|dist.*symlink.*escape/i);
      const marker = await readFile(fixture.markerPath, "utf8").catch(() => "");
      assert.equal(marker, "", `unsafe dist must fail before child spawn: ${dist}`);
    }

    const safe = runNodeAt(
      fixture.root,
      [fixture.scriptPath, "--port", "3200", "--dist", ".tmp/safe/next-dist"],
      { timeout: 2000, env: { FAKE_NEXT_MARKER: fixture.markerPath } }
    );
    assert.equal(safe.status, 0, combinedOutput(safe));
    const start = JSON.parse((await readFile(fixture.markerPath, "utf8")).trim());
    assert.equal(start.distDir, ".tmp/safe/next-dist");

    await rm(path.join(fixture.root, ".tmp"), { recursive: true, force: true });
    await symlink(outsideDir, path.join(fixture.root, ".tmp"), "dir");
    await rm(fixture.markerPath, { force: true });
    const escapedTmpRoot = runNodeAt(
      fixture.root,
      [fixture.scriptPath, "--port", "3200", "--dist", ".tmp/root-escape"],
      { timeout: 2000, env: { FAKE_NEXT_MARKER: fixture.markerPath } }
    );
    assert.notEqual(escapedTmpRoot.status, 0, "repo .tmp itself must not be a symlink escape");
    assert.match(combinedOutput(escapedTmpRoot), /dist.*symlink.*escape/i);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("dev-isolated reports child spawn errors without an unhandled error event", async () => {
  const fixture = await createDevIsolatedFixture();
  try {
    const result = runNodeAt(
      fixture.root,
      [fixture.scriptPath, "--port", "3200", "--dist", ".tmp/dev"],
      {
        timeout: 2000,
        env: {
          NODE_ENV: "test",
          DEV_ISOLATED_ALLOW_TEST_OVERRIDES: "1",
          DEV_ISOLATED_RUNTIME_BIN: path.join(fixture.root, "missing-runtime"),
          FAKE_NEXT_MARKER: fixture.markerPath
        }
      }
    );
    assert.equal(result.status, 1, combinedOutput(result));
    assert.match(combinedOutput(result), /failed to start.*ENOENT/i);
    assert.doesNotMatch(combinedOutput(result), /Unhandled 'error' event/i);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("dev-isolated preserves nonzero child exit and signal semantics", async () => {
  const fixture = await createDevIsolatedFixture();
  const baseArgs = [fixture.scriptPath, "--port", "3200", "--dist", ".tmp/dev"];

  try {
    const nonzero = runNodeAt(fixture.root, baseArgs, {
      timeout: 2000,
      env: { FAKE_NEXT_MARKER: fixture.markerPath, FAKE_NEXT_BEHAVIOR: "exit-23" }
    });
    assert.equal(nonzero.status, 23, combinedOutput(nonzero));

    await rm(fixture.markerPath, { force: true });
    const signaled = runNodeAt(fixture.root, baseArgs, {
      timeout: 2000,
      env: { FAKE_NEXT_MARKER: fixture.markerPath, FAKE_NEXT_BEHAVIOR: "self-sigterm" }
    });
    assert.notEqual(signaled.status, 0, "signaled child must never map to wrapper success");
    assert.ok(signaled.status === 143 || signaled.signal === "SIGTERM", combinedOutput(signaled));
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("dev-isolated forwards SIGTERM and escalates so the child cannot be orphaned", async () => {
  const fixture = await createDevIsolatedFixture();
  let wrapper;
  let fakePid;

  try {
    wrapper = spawn(
      process.execPath,
      [fixture.scriptPath, "--port", "3200", "--dist", ".tmp/dev"],
      {
        cwd: fixture.root,
        stdio: ["ignore", "pipe", "pipe"],
        env: {
          ...process.env,
          FAKE_NEXT_MARKER: fixture.markerPath,
          FAKE_NEXT_BEHAVIOR: "ignore-signals",
          DEV_ISOLATED_SHUTDOWN_GRACE_MS: "100"
        }
      }
    );
    const start = await waitFor(async () => {
      const marker = await readFile(fixture.markerPath, "utf8").catch(() => "");
      const events = marker.trim().split("\n").filter(Boolean).map((line) => JSON.parse(line));
      return events.find((event) => event.event === "start");
    });
    fakePid = start.pid;
    wrapper.kill("SIGTERM");
    await waitForExit(wrapper, 3000);
    const events = (await readFile(fixture.markerPath, "utf8"))
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line));
    assert.ok(events.some((event) => event.event === "signal" && event.signal === "SIGTERM"));
    await waitFor(() => !processIsAlive(fakePid), 1000);
    assert.equal(processIsAlive(fakePid), false, "fake Next child must be gone after wrapper exits");
  } finally {
    if (wrapper?.pid && processIsAlive(wrapper.pid)) process.kill(wrapper.pid, "SIGKILL");
    if (fakePid && processIsAlive(fakePid)) process.kill(fakePid, "SIGKILL");
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("kill-port validates the complete port list before invoking lsof", async () => {
  const fixture = await createFakeLsofFixture();
  try {
    const result = runNode(["scripts/kill-port.mjs", "3200", "not-a-port"], {
      env: {
        PATH: `${fixture.binDir}:${process.env.PATH}`,
        FAKE_LSOF_ARGS: fixture.argsPath,
        FAKE_LSOF_COUNT: fixture.countPath,
        FAKE_LSOF_VISIBLE_CALLS: "0"
      }
    });
    assert.equal(result.status, 1, combinedOutput(result));
    assert.match(combinedOutput(result), /port.*integer.*1.*65535/i);
    const lsofArgs = await readFile(fixture.argsPath, "utf8").catch(() => "");
    assert.equal(lsofArgs, "", "invalid input must prevent every lsof query");
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("kill-port queries only TCP listeners", async () => {
  const fixture = await createFakeLsofFixture();
  try {
    const result = runNode(["scripts/kill-port.mjs", "4567"], {
      env: {
        PATH: `${fixture.binDir}:${process.env.PATH}`,
        FAKE_LSOF_ARGS: fixture.argsPath,
        FAKE_LSOF_COUNT: fixture.countPath,
        FAKE_LSOF_VISIBLE_CALLS: "0"
      }
    });
    assert.equal(result.status, 0, combinedOutput(result));
    assert.deepEqual((await readFile(fixture.argsPath, "utf8")).trim().split("\n"), [
      "--call--",
      "-nP",
      "-t",
      "-iTCP:4567",
      "-sTCP:LISTEN"
    ]);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("kill-port sends SIGTERM and confirms the listener released before returning", async () => {
  const fixture = await createFakeLsofFixture();
  const readyPath = path.join(fixture.root, "listener-ready.txt");
  let listener;

  try {
    listener = spawn(process.execPath, ["-e", `require("node:fs").writeFileSync(${JSON.stringify(readyPath)}, "ready"); setInterval(() => {}, 1000);`], {
      stdio: "ignore"
    });
    await waitFor(() => readFile(readyPath, "utf8").then(() => true).catch(() => false));
    const result = runNode(["scripts/kill-port.mjs", "4567"], {
      env: {
        PATH: `${fixture.binDir}:${process.env.PATH}`,
        FAKE_LSOF_ARGS: fixture.argsPath,
        FAKE_LSOF_COUNT: fixture.countPath,
        FAKE_LSOF_VISIBLE_CALLS: "1",
        FAKE_LISTENER_PID: String(listener.pid),
        KILL_PORT_GRACE_MS: "50"
      }
    });
    assert.equal(result.status, 0, combinedOutput(result));
    const exit = await waitForExit(listener, 1000);
    assert.equal(exit.signal, "SIGTERM", combinedOutput(result));
    assert.match(combinedOutput(result), /terminated pid .*SIGTERM/i);
    assert.doesNotMatch(combinedOutput(result), /SIGKILL|force-killed/i);
  } finally {
    if (listener?.pid && processIsAlive(listener.pid)) process.kill(listener.pid, "SIGKILL");
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("kill-port uses SIGKILL only after a controlled SIGTERM grace fallback", async () => {
  const fixture = await createFakeLsofFixture();
  const readyPath = path.join(fixture.root, "sticky-ready.txt");
  const signalPath = path.join(fixture.root, "sticky-signals.txt");
  let listener;

  try {
    listener = spawn(
      process.execPath,
      [
        "-e",
        `const fs=require("node:fs"); process.on("SIGTERM",()=>fs.appendFileSync(${JSON.stringify(signalPath)},"SIGTERM\\n")); fs.writeFileSync(${JSON.stringify(readyPath)},"ready"); setInterval(()=>{},1000);`
      ],
      { stdio: "ignore" }
    );
    await waitFor(() => readFile(readyPath, "utf8").then(() => true).catch(() => false));
    const result = runNode(["scripts/kill-port.mjs", "4567"], {
      env: {
        PATH: `${fixture.binDir}:${process.env.PATH}`,
        FAKE_LSOF_ARGS: fixture.argsPath,
        FAKE_LSOF_COUNT: fixture.countPath,
        FAKE_LSOF_VISIBLE_CALLS: "2",
        FAKE_LISTENER_PID: String(listener.pid),
        KILL_PORT_GRACE_MS: "50"
      }
    });
    assert.equal(result.status, 0, combinedOutput(result));
    const exit = await waitForExit(listener, 1000);
    assert.equal(exit.signal, "SIGKILL", combinedOutput(result));
    const observedSignals = await readFile(signalPath, "utf8").catch(() => "");
    assert.match(observedSignals, /SIGTERM/);
    assert.match(combinedOutput(result), /force-killed pid .*after SIGTERM grace/i);
  } finally {
    if (listener?.pid && processIsAlive(listener.pid)) process.kill(listener.pid, "SIGKILL");
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("Git-index Next config honors only the P0 NEXT_DIST_DIR hook", async () => {
  const configObject = runGit(["show", ":next.config.ts"], repoRoot);
  assert.equal(configObject.status, 0, combinedOutput(configObject));
  assert.doesNotMatch(configObject.stdout, /redirects\s*\(|transpilePackages|devIndicators|NEXT_TSCONFIG_PATH/);
  const tempDir = await mkdtemp(path.join(tmpdir(), "mais-next-config-object-"));
  const configPath = path.join(tempDir, "next.config.ts");
  const previousDistDir = process.env.NEXT_DIST_DIR;

  try {
    await writeFile(configPath, configObject.stdout);
    process.env.NEXT_DIST_DIR = ".tmp/object-proof/next-dist";
    const imported = await import(`${pathToFileURL(configPath).href}?proof=${Date.now()}`);
    assert.equal(imported.default.distDir, ".tmp/object-proof/next-dist");
  } finally {
    if (previousDistDir === undefined) delete process.env.NEXT_DIST_DIR;
    else process.env.NEXT_DIST_DIR = previousDistDir;
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("P0 package delta and default release gates are self-contained in Git objects", () => {
  const baseline = readGitObjectJson(`${p0BaselineCommit}:package.json`);
  const current = readGitObjectJson(":package.json");
  const packageLock = readGitObjectJson(":package-lock.json");
  const expectedP0Scripts = {
    "check:imports": "node scripts/check-import-targets.mjs",
    "dev:isolated": "node scripts/dev-isolated.mjs",
    "kill-port": "node scripts/kill-port.mjs",
    "release:dirty-map": "node scripts/refresh-dirty-tree-map.mjs",
    "release:package-gate": "node scripts/release-package-gate.mjs",
    "release:preflight": "node scripts/release-env-guard.mjs",
    "release:env-preflight": "node scripts/release-env-guard.mjs env",
    "release:runtime-preflight": "node scripts/release-env-guard.mjs runtime-release",
    "release:publish-preflight": "node scripts/release-env-guard.mjs publish",
    "release:staged-publish-preflight": "node scripts/release-env-guard.mjs staged-publish",
    "release:root-deploy-preflight": "node scripts/release-env-guard.mjs root-deploy",
    "test:release-governance": "node --test --test-concurrency=1 scripts/release-governance.test.mjs",
    "test:release-evidence": "node --test --test-concurrency=1 coordination/release-intake/refresh-linked-worktree-archive-evidence.test.mjs",
    "test:imports": "node --test scripts/check-import-targets.test.mjs"
  };
  const allowedScriptChanges = new Set(Object.keys(expectedP0Scripts));
  const allScriptNames = new Set([
    ...Object.keys(baseline.scripts ?? {}),
    ...Object.keys(current.scripts ?? {})
  ]);
  const changedScriptNames = [...allScriptNames]
    .filter((name) => baseline.scripts?.[name] !== current.scripts?.[name])
    .sort();

  assert.deepEqual(
    changedScriptNames,
    [...allowedScriptChanges].sort(),
    "Only P0/P1-owned commands may differ from the frozen baseline"
  );
  for (const [name, command] of Object.entries(expectedP0Scripts)) {
    assert.equal(current.scripts[name], command, `${name} command`);
    const localTarget = command.split(/\s+/).find((token) => /\.(?:c?js|mjs)$/.test(token));
    assert.ok(localTarget, `${name} must resolve one local Node target`);
    assertTrackedInIndex(localTarget);
  }

  assert.deepEqual(current.dependencies, {
    ...baseline.dependencies,
    next: "15.5.20"
  });
  assert.deepEqual(current.devDependencies, {
    ...baseline.devDependencies,
    postcss: "8.5.16",
    yaml: "2.9.0"
  });
  assert.deepEqual(current.overrides, {
    ...(baseline.overrides ?? {}),
    postcss: "8.5.16"
  });
  assert.deepEqual(packageLock.packages[""].dependencies, current.dependencies);
  assert.deepEqual(packageLock.packages[""].devDependencies, current.devDependencies);
  assert.equal(packageLock.packages["node_modules/next"].version, "15.5.20");
  assert.equal(packageLock.packages["node_modules/postcss"].version, "8.5.16");
  assert.equal(packageLock.packages["node_modules/yaml"].version, "2.9.0");
  assert.equal(packageLock.packages["node_modules/yaml"].dev, true);
  assert.match(packageLock.packages["node_modules/yaml"].integrity, /^sha512-/u);

  const releaseGuard = runGit(["show", ":scripts/release-env-guard.mjs"], repoRoot);
  assert.equal(releaseGuard.status, 0, combinedOutput(releaseGuard));
  const gateConstants = ["RELEASE_SOURCE_CLEAN_GATE", "WORKTREE_LIFECYCLE_GATE"];
  for (const constant of gateConstants) {
    const gatePath = releaseGuard.stdout.match(
      new RegExp(`const\\s+${constant}\\s*=\\s*"([^"]+)"`)
    )?.[1];
    assert.ok(gatePath, `Missing default gate constant ${constant}`);
    assertTrackedInIndex(gatePath);
  }
});

test("default release-source gates accept clean sources, reject dirty sources, and leave no evidence dirt", async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), "mais-default-release-gates-"));
  const cleanGate = path.join(repoRoot, "coordination/release-intake/assert-release-source-clean.mjs");
  const lifecycleGate = path.join(repoRoot, "coordination/release-intake/assert-worktree-lifecycle.mjs");

  try {
    const init = runGit(["init", "--quiet", "--initial-branch=main"], tempDir);
    assert.equal(init.status, 0, combinedOutput(init));
    await mkdir(path.join(tempDir, "coordination", "release-intake"), { recursive: true });
    await writeFile(path.join(tempDir, "README.md"), "clean release source fixture\n");
    const add = runGit(["add", "README.md"], tempDir);
    assert.equal(add.status, 0, combinedOutput(add));
    const commit = runGit([
      "-c",
      "user.name=Release Governance Test",
      "-c",
      "user.email=release-governance@example.invalid",
      "commit",
      "--quiet",
      "-m",
      "fixture"
    ], tempDir);
    assert.equal(commit.status, 0, combinedOutput(commit));

    const clean = runNodeAt(tempDir, [cleanGate]);
    assert.equal(clean.status, 0, combinedOutput(clean));
    const lifecycle = runNodeAt(tempDir, [lifecycleGate, "--strict", "--json"]);
    assert.equal(lifecycle.status, 0, combinedOutput(lifecycle));
    const afterGates = runGit(["status", "--porcelain=v1", "-z", "-uall"], tempDir);
    assert.equal(afterGates.status, 0, combinedOutput(afterGates));
    assert.equal(afterGates.stdout, "", "default gates must not dirty a clean release source");

    await writeFile(path.join(tempDir, "dirty.txt"), "dirty release source fixture\n");
    const dirty = runNodeAt(tempDir, [cleanGate]);
    assert.notEqual(dirty.status, 0);
    assert.match(combinedOutput(dirty), /release source is dirty/i);
    const dirtyLifecycle = runNodeAt(tempDir, [lifecycleGate, "--strict", "--json"]);
    assert.notEqual(dirtyLifecycle.status, 0);
    assert.match(combinedOutput(dirtyLifecycle), /dirty|open lifecycle decision/i);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("worktree lifecycle fails closed when main divergence is indeterminate", async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), "mais-lifecycle-indeterminate-"));
  const lifecycleGate = path.join(repoRoot, "coordination/release-intake/assert-worktree-lifecycle.mjs");

  try {
    const init = runGit(["init", "--quiet", "--initial-branch=trunk"], tempDir);
    assert.equal(init.status, 0, combinedOutput(init));
    await writeFile(path.join(tempDir, "README.md"), "trunk-only lifecycle fixture\n");
    assert.equal(runGit(["add", "README.md"], tempDir).status, 0);
    const commit = runGit([
      "-c",
      "user.name=Release Governance Test",
      "-c",
      "user.email=release-governance@example.invalid",
      "commit",
      "--quiet",
      "-m",
      "fixture"
    ], tempDir);
    assert.equal(commit.status, 0, combinedOutput(commit));

    const result = runNodeAt(tempDir, [lifecycleGate, "--json"]);
    assert.notEqual(result.status, 0, "missing main must fail even without --strict");
    const payload = JSON.parse(result.stdout);
    const worktree = payload.worktrees.find((entry) => entry.branch === "trunk");
    assert.ok(worktree, "trunk fixture worktree must be reported");
    assert.equal(worktree.state, "indeterminate-error");
    assert.ok(worktree.errors.some((error) => error.operation === "rev-list-main-divergence"));
    for (const error of worktree.errors) {
      assert.equal(typeof error.exitCode, "number");
      assert.ok(!JSON.stringify(error).includes(tempDir), "error metadata must not expose absolute worktree paths");
    }
    assert.match(result.stderr, /indeterminate-error|indeterminate lifecycle/i);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("default preflight all invokes dirty-map, release-source, and strict lifecycle gates", async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), "mais-preflight-all-"));
  const sourceRoot = path.join(tempDir, "clean-source");
  const markerPath = path.join(tempDir, "gate-marker.txt");
  const dirtyMapStub = path.join(tempDir, "dirty-map-stub.mjs");
  const releaseSourceStub = path.join(tempDir, "release-source-stub.mjs");
  const lifecycleStub = path.join(tempDir, "lifecycle-stub.mjs");

  const stubSource = (label, jsonOutput = false) => `
import fs from "node:fs";
fs.appendFileSync(process.env.MAIS_GATE_MARKER, ${JSON.stringify(label)} + "\\n");
if (process.env.MAIS_FAIL_GATE === ${JSON.stringify(label)}) {
  console.error(${JSON.stringify(label)} + " stub failure");
  process.exit(37);
}
${jsonOutput ? 'console.log(JSON.stringify({ gate: "dirty-map", result: "pass" }));' : 'console.log("gate passed");'}
`;

  try {
    await mkdir(sourceRoot, { recursive: true });
    const init = runGit(["init", "--quiet", "--initial-branch=main"], sourceRoot);
    assert.equal(init.status, 0, combinedOutput(init));
    await writeFile(path.join(sourceRoot, "README.md"), "clean preflight source\n");
    assert.equal(runGit(["add", "README.md"], sourceRoot).status, 0);
    const commit = runGit([
      "-c",
      "user.name=Release Governance Test",
      "-c",
      "user.email=release-governance@example.invalid",
      "commit",
      "--quiet",
      "-m",
      "fixture"
    ], sourceRoot);
    assert.equal(commit.status, 0, combinedOutput(commit));
    await writeFile(dirtyMapStub, stubSource("dirty-map", true));
    await writeFile(releaseSourceStub, stubSource("release-source"));
    await writeFile(lifecycleStub, stubSource("lifecycle"));

    const baseEnv = {
      NODE_ENV: "test",
      MAIS_RELEASE_GUARD_ALLOW_TEST_STUBS: "1",
      MAIS_RELEASE_SOURCE_ROOT: sourceRoot,
      MAIS_CANONICAL_RELEASE_ROOT: repoRoot,
      MAIS_RELEASE_SOURCE_KIND: "clean-worktree",
      MAIS_GATE_MARKER: markerPath,
      MAIS_DIRTY_TREE_MAP_GATE: dirtyMapStub,
      MAIS_RELEASE_SOURCE_CLEAN_GATE: releaseSourceStub,
      MAIS_WORKTREE_LIFECYCLE_GATE: lifecycleStub
    };

    const pass = runNode(["scripts/release-env-guard.mjs", "--json"], { env: baseEnv });
    assert.equal(pass.status, 0, combinedOutput(pass));
    const markerContents = await readFile(markerPath, "utf8").catch(() => "");
    assert.deepEqual(markerContents.trim().split("\n").filter(Boolean), [
      "dirty-map",
      "release-source",
      "lifecycle"
    ]);
    const payload = JSON.parse(pass.stdout);
    assert.equal(payload.mode, "all");
    assert.ok(payload.dirtyTreeMap, "default all must include dirty-map currentness evidence");
    assert.equal(payload.releaseSource.releaseSourceClean.passed, true);
    assert.equal(payload.releaseSource.strictWorktreeLifecycle.passed, true);

    for (const failingGate of ["dirty-map", "release-source", "lifecycle"]) {
      await rm(markerPath, { force: true });
      const fail = runNode(["scripts/release-env-guard.mjs", "--json"], {
        env: { ...baseEnv, MAIS_FAIL_GATE: failingGate }
      });
      assert.notEqual(fail.status, 0, `${failingGate} failure must fail default preflight`);
      assert.match(combinedOutput(fail), new RegExp(`${failingGate} stub failure`, "i"));
    }
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("package and coordination contracts preserve security versions and closure rules", async () => {
  const packageJson = await readJson(path.join(repoRoot, "package.json"));
  const packageLock = await readJson(path.join(repoRoot, "package-lock.json"));
  const gitignore = await readFile(path.join(repoRoot, ".gitignore"), "utf8");
  const agents = await readFile(path.join(repoRoot, "AGENTS.md"), "utf8");

  assert.equal(packageJson.dependencies.next, "15.5.20");
  assert.equal(packageJson.devDependencies.postcss, "8.5.16");
  assert.equal(packageJson.devDependencies.yaml, "2.9.0");
  assert.equal(packageJson.overrides.postcss, "8.5.16");
  assert.equal(packageLock.packages["node_modules/next"].version, "15.5.20");
  assert.equal(packageLock.packages["node_modules/postcss"].version, "8.5.16");
  assert.equal(packageLock.packages[""].devDependencies.yaml, "2.9.0");
  assert.equal(packageLock.packages["node_modules/yaml"].version, "2.9.0");
  assert.equal(packageLock.packages["node_modules/yaml"].dev, true);
  assert.match(packageLock.packages["node_modules/yaml"].integrity, /^sha512-/u);
  assert.equal(packageJson.scripts["release:package-gate"], "node scripts/release-package-gate.mjs");
  assert.equal(
    packageJson.scripts["test:release-governance"],
    "node --test --test-concurrency=1 scripts/release-governance.test.mjs"
  );
  assert.match(gitignore, /^Users\/$/m);
  assert.match(agents, /git add \./i);
  assert.match(agents, /owner-pathspecs\.json/i);
  assert.match(agents, /reviewed commit/i);
  assert.match(agents, /owner-approved discard/i);
  assert.match(agents, /evidence archive/i);
  assert.match(agents, /blocker report/i);
});

test("release source preflight freezes canonical root for source and root-deploy modes", async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), "mais-release-source-gates-"));
  const passingGate = path.join(tempDir, "passing-gate.mjs");
  await writeFile(passingGate, 'console.log("test gate passed");\n');

  const sharedEnv = {
    NODE_ENV: "test",
    MAIS_RELEASE_GUARD_ALLOW_TEST_STUBS: "1",
    MAIS_RELEASE_SOURCE_CLEAN_GATE: passingGate,
    MAIS_WORKTREE_LIFECYCLE_GATE: passingGate,
    MAIS_RELEASE_SOURCE_ROOT: repoRoot,
    MAIS_CANONICAL_RELEASE_ROOT: repoRoot,
    MAIS_RELEASE_SOURCE_KIND: "root"
  };

  try {
    for (const mode of ["source", "root-deploy"]) {
      const blocked = runNode(["scripts/release-env-guard.mjs", mode, "--json"], { env: sharedEnv });
      assert.notEqual(blocked.status, 0, `${mode} must fail for the canonical root`);
      assert.match(combinedOutput(blocked), /root release is frozen/i);
    }
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("canonical realpath stays frozen for approved pruned staging and symlink aliases", async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), "mais-canonical-realpath-"));
  const aliasRoot = path.join(tempDir, "canonical-alias");
  const passingGate = path.join(tempDir, "passing-gate.mjs");
  await symlink(repoRoot, aliasRoot, "dir");
  await writeFile(passingGate, 'console.log("test gate passed");\n');

  try {
    for (const sourceRoot of [repoRoot, aliasRoot]) {
      for (const mode of ["source", "root-deploy"]) {
        const blocked = runNode(["scripts/release-env-guard.mjs", mode, "--json"], {
          env: {
            NODE_ENV: "test",
            MAIS_RELEASE_GUARD_ALLOW_TEST_STUBS: "1",
            MAIS_RELEASE_SOURCE_CLEAN_GATE: passingGate,
            MAIS_WORKTREE_LIFECYCLE_GATE: passingGate,
            MAIS_RELEASE_SOURCE_ROOT: sourceRoot,
            MAIS_CANONICAL_RELEASE_ROOT: repoRoot,
            MAIS_RELEASE_SOURCE_KIND: "pruned-staging",
            MAIS_OWNER_APPROVED_PRUNED_STAGING: "1"
          }
        });
        assert.notEqual(blocked.status, 0, `${mode} must reject canonical identity ${sourceRoot}`);
        assert.match(combinedOutput(blocked), /root release is frozen/i);
      }
    }
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("release source kinds require clean Git sources or explicitly approved pruned staging", async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), "mais-release-source-kind-"));
  const cleanSource = path.join(tempDir, "clean-source");
  const init = runGit(["init", "--quiet", cleanSource], tempDir);
  assert.equal(init.status, 0, combinedOutput(init));

  try {
    const clean = runNode(["scripts/release-env-guard.mjs", "source", "--json"], {
      env: {
        MAIS_RELEASE_SOURCE_ROOT: cleanSource,
        MAIS_CANONICAL_RELEASE_ROOT: repoRoot,
        MAIS_RELEASE_SOURCE_KIND: "clean-worktree"
      }
    });
    assert.equal(clean.status, 0, combinedOutput(clean));
    assert.equal(JSON.parse(clean.stdout).source.kind, "clean-worktree");

    const unapproved = runNode(["scripts/release-env-guard.mjs", "source", "--json"], {
      env: {
        MAIS_RELEASE_SOURCE_ROOT: tempDir,
        MAIS_CANONICAL_RELEASE_ROOT: repoRoot,
        MAIS_RELEASE_SOURCE_KIND: "pruned-staging",
        MAIS_OWNER_APPROVED_PRUNED_STAGING: "0"
      }
    });
    assert.notEqual(unapproved.status, 0);
    assert.match(combinedOutput(unapproved), /owner-approved pruned staging/i);

    const approved = runNode(["scripts/release-env-guard.mjs", "source", "--json"], {
      env: {
        MAIS_RELEASE_SOURCE_ROOT: tempDir,
        MAIS_CANONICAL_RELEASE_ROOT: repoRoot,
        MAIS_RELEASE_SOURCE_KIND: "pruned-staging",
        MAIS_OWNER_APPROVED_PRUNED_STAGING: "1"
      }
    });
    assert.equal(approved.status, 0, combinedOutput(approved));
    assert.equal(JSON.parse(approved.stdout).source.kind, "owner-approved-pruned-staging");
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});
