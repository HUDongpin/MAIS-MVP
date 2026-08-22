import assert from "node:assert/strict";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { after, test } from "node:test";

const starshipWorkspace = "/Volumes/Starship/MAIS-hk-viz-labs-wt";
const fixtureParent = join(
  starshipWorkspace,
  ".tmp",
  `hk-viz-source-freeze-tests-${process.pid}-${Date.now()}`,
);
mkdirSync(fixtureParent, { recursive: true });
after(() => rmSync(fixtureParent, { force: true, recursive: true }));

async function loadSourceFreezeApi() {
  try {
    return await import("./hk-visualization-release-source-freeze.mjs");
  } catch (error) {
    assert.fail(
      `HK Visualization release source-freeze implementation must load; code=${String(error?.code ?? "UNKNOWN")}`,
    );
  }
}

function makeWorkspace(label) {
  return mkdtempSync(join(fixtureParent, `${label}-`));
}

function write(workspace, relativePath, contents, mode = 0o644) {
  const destination = join(workspace, relativePath);
  mkdirSync(join(destination, ".."), { recursive: true });
  writeFileSync(destination, contents, { mode });
  return destination;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

test("captures one exact recursive tracked-and-untracked source receipt without generated payloads", async () => {
  const {
    HK_VISUALIZATION_RELEASE_SOURCE_FREEZE_POLICY,
    HK_VISUALIZATION_RELEASE_SOURCE_FREEZE_SCHEMA,
    captureHkVisualizationReleaseSourceSnapshot,
    validateHkVisualizationReleaseSourceSnapshot,
  } = await loadSourceFreezeApi();
  const workspace = makeWorkspace("positive");
  write(workspace, "package.json", '{"name":"fixture"}\n');
  write(workspace, ".env.example", "SAFE_PLACEHOLDER=replace-me\n");
  write(workspace, "local-extra.ts", "export const untracked = true;\n");
  write(
    workspace,
    "docs/credential-and-secrets-handling.md",
    "# Safe tracked-style documentation\n",
  );
  const sourcePath = write(
    workspace,
    "src/value.ts",
    "export const value = 7;\n",
  );
  write(workspace, "tests/value.test.mjs", "// source test\n");
  const toolPath = write(workspace, "tools/node-fixture", "tool-bytes\n", 0o755);
  symlinkSync("value.ts", join(workspace, "src/value-alias.ts"));
  write(
    workspace,
    ".git",
    "gitdir: /forbidden/raw/worktree-metadata\n",
  );

  for (const generatedDirectory of [
    "node_modules",
    ".tmp",
    ".next",
    "coverage",
    "dist",
    "build",
    "out",
    "playwright-report",
    "test-results",
  ]) {
    write(
      workspace,
      `${generatedDirectory}/ignored.txt`,
      `generated-secret-marker-${generatedDirectory}\n`,
    );
  }

  const snapshot = captureHkVisualizationReleaseSourceSnapshot({
    workspace,
    toolchainInputs: [
      { name: "node-fixture", path: toolPath, version: "v1.2.3-test" },
    ],
  });
  const validation = validateHkVisualizationReleaseSourceSnapshot(snapshot);

  assert.equal(
    snapshot.schemaVersion,
    HK_VISUALIZATION_RELEASE_SOURCE_FREEZE_SCHEMA,
  );
  assert.deepEqual(snapshot.policy, HK_VISUALIZATION_RELEASE_SOURCE_FREEZE_POLICY);
  assert.equal(validation.entryCount, snapshot.entryCount);
  assert.equal(validation.sourceAggregateSha256, snapshot.sourceAggregateSha256);
  assert.match(snapshot.sourceAggregateSha256, /^[a-f0-9]{64}$/);
  assert.match(snapshot.receiptAggregateSha256, /^[a-f0-9]{64}$/);
  assert.deepEqual(Object.keys(snapshot.workspaceIdentity).sort(), [
    "dev",
    "ino",
    "realpath",
  ]);
  assert.match(snapshot.workspaceIdentity.dev, /^[1-9][0-9]*$/);
  assert.match(snapshot.workspaceIdentity.ino, /^[1-9][0-9]*$/);
  assert.equal(snapshot.workspaceIdentity.realpath, workspace);

  const paths = snapshot.entries.map((entry) => entry.path);
  assert.deepEqual(paths, [...paths].sort());
  assert.equal(new Set(paths).size, paths.length);
  for (const expectedPath of [
    ".",
    ".env.example",
    "docs",
    "docs/credential-and-secrets-handling.md",
    "local-extra.ts",
    "package.json",
    "src",
    "src/value-alias.ts",
    "src/value.ts",
    "tests",
    "tests/value.test.mjs",
    "tools",
    "tools/node-fixture",
  ]) {
    assert.ok(paths.includes(expectedPath), expectedPath);
  }
  for (const generatedDirectory of [
    ".git",
    "node_modules",
    ".tmp",
    ".next",
    "coverage",
    "dist",
    "build",
    "out",
    "playwright-report",
    "test-results",
  ]) {
    assert.equal(
      paths.some(
        (relativePath) =>
          relativePath === generatedDirectory ||
          relativePath.startsWith(`${generatedDirectory}/`),
      ),
      false,
      generatedDirectory,
    );
  }
  const sourceEntry = snapshot.entries.find(
    (entry) => entry.path === "src/value.ts",
  );
  assert.deepEqual(Object.keys(sourceEntry).sort(), [
    "mode",
    "path",
    "sha256",
    "size",
    "type",
  ]);
  assert.equal(sourceEntry.type, "file");
  assert.equal(sourceEntry.mode, "0644");
  assert.equal(sourceEntry.size, Buffer.byteLength("export const value = 7;\n"));
  assert.match(sourceEntry.sha256, /^[a-f0-9]{64}$/);
  const symlinkEntry = snapshot.entries.find(
    (entry) => entry.path === "src/value-alias.ts",
  );
  assert.deepEqual(Object.keys(symlinkEntry).sort(), [
    "mode",
    "path",
    "sha256",
    "target",
    "targetMode",
    "targetType",
    "type",
  ]);
  assert.equal(symlinkEntry.type, "symlink");
  assert.equal(symlinkEntry.target, "src/value.ts");
  assert.equal(symlinkEntry.targetMode, "0644");
  assert.equal(symlinkEntry.targetType, "file");
  assert.match(symlinkEntry.sha256, /^[a-f0-9]{64}$/);

  assert.equal(snapshot.toolchain.length, 1);
  assert.deepEqual(Object.keys(snapshot.toolchain[0]).sort(), [
    "dev",
    "ino",
    "mode",
    "name",
    "pathSha256",
    "realpathSha256",
    "sha256",
    "size",
    "type",
    "version",
  ]);
  assert.equal(snapshot.toolchain[0].name, "node-fixture");
  assert.equal(snapshot.toolchain[0].version, "v1.2.3-test");
  assert.equal(snapshot.toolchain[0].type, "file");
  assert.equal(snapshot.toolchain[0].mode, "0755");
  assert.equal("path" in snapshot.toolchain[0], false);
  assert.equal("realpath" in snapshot.toolchain[0], false);
  assert.equal(JSON.stringify(snapshot).includes(sourcePath), false);
  assert.equal(
    JSON.stringify(snapshot).includes("/forbidden/raw/worktree-metadata"),
    false,
  );
  assert.equal(JSON.stringify(snapshot).includes("generated-secret-marker"), false);
});

test("compares pre/post receipts and fails closed on content, mode, and symlink target drift", async () => {
  const {
    assertHkVisualizationReleaseSourceSnapshotUnchanged,
    captureHkVisualizationReleaseSourceSnapshot,
    compareHkVisualizationReleaseSourceSnapshots,
  } = await loadSourceFreezeApi();
  const workspace = makeWorkspace("compare");
  const source = write(workspace, "src/value.ts", "before\n");
  write(workspace, "src/other.ts", "other\n");
  symlinkSync("value.ts", join(workspace, "src/alias.ts"));
  const before = captureHkVisualizationReleaseSourceSnapshot({ workspace });

  writeFileSync(source, "after\n");
  chmodSync(source, 0o755);
  rmSync(join(workspace, "src/alias.ts"));
  symlinkSync("other.ts", join(workspace, "src/alias.ts"));
  const after = captureHkVisualizationReleaseSourceSnapshot({ workspace });
  const comparison = compareHkVisualizationReleaseSourceSnapshots(before, after);

  assert.equal(comparison.equal, false);
  assert.ok(comparison.issues.includes("source-aggregate-drift"));
  assert.throws(
    () => assertHkVisualizationReleaseSourceSnapshotUnchanged(before, after),
    /source-aggregate-drift/,
  );
  assert.equal(JSON.stringify(comparison).includes("before"), false);
  assert.equal(JSON.stringify(comparison).includes("after"), false);
});

test("binds an exact external toolchain file across pre/post receipts without raw paths", async () => {
  const {
    captureHkVisualizationReleaseSourceSnapshot,
    compareHkVisualizationReleaseSourceSnapshots,
  } = await loadSourceFreezeApi();
  const workspace = makeWorkspace("toolchain-binding");
  write(workspace, "source.ts", "stable source\n");
  const externalToolRoot = makeWorkspace("external-tool");
  const externalTool = write(externalToolRoot, "tool", "tool-v1\n", 0o755);
  const toolchainInputs = [
    { name: "next-clean-build", path: externalTool, version: "v1" },
  ];

  const before = captureHkVisualizationReleaseSourceSnapshot({
    toolchainInputs,
    workspace,
  });
  writeFileSync(externalTool, "tool-v2\n", { mode: 0o755 });
  const after = captureHkVisualizationReleaseSourceSnapshot({
    toolchainInputs,
    workspace,
  });
  const comparison = compareHkVisualizationReleaseSourceSnapshots(before, after);

  assert.equal(before.sourceAggregateSha256, after.sourceAggregateSha256);
  assert.equal(comparison.equal, false);
  assert.ok(comparison.issues.includes("toolchain-drift"));
  assert.equal(JSON.stringify(before).includes(externalTool), false);
  assert.equal(JSON.stringify(after).includes(externalTool), false);
});

test("detects a regular file mutation that occurs between byte read and post-read identity", async () => {
  const { captureHkVisualizationReleaseSourceSnapshot } =
    await loadSourceFreezeApi();
  const workspace = makeWorkspace("file-mutation");
  const source = write(workspace, "src/value.ts", "AAAA\n");
  let mutated = false;

  assert.throws(
    () =>
      captureHkVisualizationReleaseSourceSnapshot({
        workspace,
        afterRegularFileRead({ relativePath }) {
          if (!mutated && relativePath === "src/value.ts") {
            mutated = true;
            writeFileSync(source, "BBBBB\n");
          }
        },
      }),
    /source-mutated-during-hash/,
  );
});

test("detects directory membership mutation during recursive enumeration", async () => {
  const { captureHkVisualizationReleaseSourceSnapshot } =
    await loadSourceFreezeApi();
  const workspace = makeWorkspace("directory-mutation");
  write(workspace, "src/value.ts", "value\n");
  let mutated = false;

  assert.throws(
    () =>
      captureHkVisualizationReleaseSourceSnapshot({
        workspace,
        afterRegularFileRead({ relativePath }) {
          if (!mutated && relativePath === "src/value.ts") {
            mutated = true;
            write(workspace, "src/late.ts", "late\n");
          }
        },
      }),
    /directory-mutated-during-enumeration/,
  );
});

test("rejects secret or ambiguous local payloads without retaining their names or contents", async () => {
  const { captureHkVisualizationReleaseSourceSnapshot } =
    await loadSourceFreezeApi();
  for (const [name, contents] of [
    [".env.local", "super-secret-env-marker"],
    ["credentials.json", "super-secret-credential-marker"],
    ["private-key.pem", "super-secret-key-marker"],
  ]) {
    const workspace = makeWorkspace("secret");
    write(workspace, name, contents);
    let message = "";
    assert.throws(
      () => captureHkVisualizationReleaseSourceSnapshot({ workspace }),
      (error) => {
        message = String(error?.message);
        return message.includes("forbidden-secret-local-payload");
      },
    );
    assert.equal(message.includes(name), false);
    assert.equal(message.includes(contents), false);
    assert.match(message, /length=[0-9]+,sha256=[a-f0-9]{64}/);
  }
});

test("rejects a workspace-root symlink alias", async () => {
  const { captureHkVisualizationReleaseSourceSnapshot } =
    await loadSourceFreezeApi();
  const workspace = makeWorkspace("root-physical");
  write(workspace, "source.ts", "source\n");
  const alias = `${workspace}-alias`;
  symlinkSync(workspace, alias);
  assert.throws(
    () => captureHkVisualizationReleaseSourceSnapshot({ workspace: alias }),
    /workspace-root-must-be-physical/,
  );
});

test("rejects symlink escapes, generated targets, and broken targets without raw target disclosure", async () => {
  const { captureHkVisualizationReleaseSourceSnapshot } =
    await loadSourceFreezeApi();

  const outsideWorkspace = makeWorkspace("outside-target");
  const outsideTarget = write(outsideWorkspace, "outside.ts", "outside\n");
  const escapeWorkspace = makeWorkspace("symlink-escape");
  symlinkSync(outsideTarget, join(escapeWorkspace, "escape.ts"));
  let escapeMessage = "";
  assert.throws(
    () => captureHkVisualizationReleaseSourceSnapshot({ workspace: escapeWorkspace }),
    (error) => {
      escapeMessage = String(error?.message);
      return escapeMessage.includes("symlink-target-outside-workspace");
    },
  );
  assert.equal(escapeMessage.includes(outsideTarget), false);

  const generatedWorkspace = makeWorkspace("symlink-generated");
  const generatedTarget = write(
    generatedWorkspace,
    ".tmp/hidden.ts",
    "hidden\n",
  );
  symlinkSync(generatedTarget, join(generatedWorkspace, "generated-alias.ts"));
  assert.throws(
    () =>
      captureHkVisualizationReleaseSourceSnapshot({
        workspace: generatedWorkspace,
      }),
    /symlink-target-excluded/,
  );

  const brokenWorkspace = makeWorkspace("symlink-broken");
  symlinkSync("missing.ts", join(brokenWorkspace, "broken.ts"));
  assert.throws(
    () => captureHkVisualizationReleaseSourceSnapshot({ workspace: brokenWorkspace }),
    /symlink-target-unresolvable/,
  );
});

test("validator rejects count, policy, entry, aggregate, and physical-root tampering", async () => {
  const {
    captureHkVisualizationReleaseSourceSnapshot,
    validateHkVisualizationReleaseSourceSnapshot,
  } = await loadSourceFreezeApi();
  const workspace = makeWorkspace("validation");
  write(workspace, "source.ts", "source\n");
  const snapshot = captureHkVisualizationReleaseSourceSnapshot({ workspace });

  for (const mutate of [
    (value) => {
      value.entryCount += 1;
    },
    (value) => {
      value.policy.rawSecretRetention = "allowed";
    },
    (value) => {
      value.entries[0].sha256 = "0".repeat(64);
    },
    (value) => {
      value.sourceAggregateSha256 = "0".repeat(64);
    },
    (value) => {
      value.receiptAggregateSha256 = "0".repeat(64);
    },
    (value) => {
      value.workspaceIdentity.ino = "1";
    },
  ]) {
    const tampered = clone(snapshot);
    mutate(tampered);
    assert.throws(
      () => validateHkVisualizationReleaseSourceSnapshot(tampered),
      /invalid source-freeze receipt/,
    );
  }
});

test("rejects unsafe toolchain inputs without retaining raw paths or names", async () => {
  const { captureHkVisualizationReleaseSourceSnapshot } =
    await loadSourceFreezeApi();
  const workspace = makeWorkspace("toolchain-negative");
  write(workspace, "source.ts", "source\n");
  const directoryTool = join(workspace, "tool-directory");
  mkdirSync(directoryTool);
  let message = "";
  assert.throws(
    () =>
      captureHkVisualizationReleaseSourceSnapshot({
        workspace,
        toolchainInputs: [
          {
            name: "unsafe tool name with spaces",
            path: directoryTool,
            version: "v1",
          },
        ],
      }),
    (error) => {
      message = String(error?.message);
      return message.includes("invalid-toolchain-input");
    },
  );
  assert.equal(message.includes(directoryTool), false);
  assert.equal(message.includes("unsafe tool name with spaces"), false);
});
