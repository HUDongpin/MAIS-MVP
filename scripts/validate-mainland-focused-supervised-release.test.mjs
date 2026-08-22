import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { EventEmitter } from "node:events";
import { readFileSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  MAINLAND_FOCUSED_SUPERVISED_SOURCE_PATHS,
  assertNoInheritedMainlandFocusedServerOverrides,
  buildMainlandFocusedSupervisedReleaseInvocation,
  executeMainlandFocusedSupervisedRelease,
  executeMainlandFocusedSupervisedReleaseForUntrustedTestOnly,
  normalizeMainlandFocusedSpecFile,
  readNativeExactFileEvidenceForUntrustedTestOnly,
  validateMainlandFocusedSupervisedRelease,
  writeImmutableReceiptProbeForUntrustedTestOnly,
} from "./validate-mainland-focused-supervised-release.mjs";

const repositoryRoot = "/Volumes/Starship/mainland-focused-parent-fixture";
const runId = "focused-final-92";
const intendedPort = 34_192;
const requiredSupervisorChildEnvironmentNames = [
  "NODE_OPTIONS",
  "PATH",
  "PLAYWRIGHT_PORT",
  "STARSHIP_SUPERVISOR_PRELOAD_PATH",
  "STARSHIP_SUPERVISOR_PRELOAD_SHA256",
  "STARSHIP_SUPERVISOR_REGISTRY_DEVICE",
  "STARSHIP_SUPERVISOR_REGISTRY_FD",
  "STARSHIP_SUPERVISOR_REGISTRY_INODE",
  "STARSHIP_SUPERVISOR_RUN_LOCK_PATH",
  "STARSHIP_SUPERVISOR_RUN_NONCE",
  "STARSHIP_SUPERVISOR_RUN_TOKEN",
  "STARSHIP_SUPERVISOR_RUN_TOKEN_SHA256",
  "STARSHIP_SUPERVISOR_RUNNER_PATH",
  "STARSHIP_SUPERVISOR_RUNNER_SHA256",
  "STARSHIP_SUPERVISOR_TSCONFIG_PATH",
  "TEMP",
  "TMP",
  "TMPDIR",
].sort((left, right) => left.localeCompare(right));
const sourceBytes = new Map(
  Object.entries(MAINLAND_FOCUSED_SUPERVISED_SOURCE_PATHS).map(([label, relativePath]) => [
    `${repositoryRoot}/${relativePath}`,
    Buffer.from(`fixture source ${label}\n`, "utf8"),
  ]),
);

const readFixtureArtifact = async (artifactPath) => {
  const bytes = sourceBytes.get(artifactPath);
  if (!bytes) throw new Error(`missing fixture artifact ${artifactPath}`);
  return Buffer.from(bytes);
};

const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");

async function exactFileIdentity(filePath) {
  const value = await fs.lstat(filePath, { bigint: true });
  return {
    ctimeNs: value.ctimeNs.toString(10),
    device: value.dev.toString(10),
    inode: value.ino.toString(10),
    mode: Number(value.mode & 0o7777n).toString(8),
    mtimeNs: value.mtimeNs.toString(10),
    size: value.size.toString(10),
  };
}

test("native exact read rejects pathname replacement after its stable held-descriptor read and preserves the successor", async (t) => {
  const fixtureRoot = await fs.mkdtemp("/Volumes/Starship/mais-binder-c6-read-");
  t.after(async () => fs.rm(fixtureRoot, { force: true, recursive: true }));
  const artifactPath = path.join(fixtureRoot, "artifact.json");
  const archivedPath = path.join(fixtureRoot, "artifact.archived.json");
  const successorPath = path.join(fixtureRoot, "artifact.successor.json");
  await fs.writeFile(artifactPath, "held-A\n", { flag: "wx", mode: 0o600 });
  await fs.writeFile(successorPath, "foreign-B\n", { flag: "wx", mode: 0o600 });

  await assert.rejects(
    readNativeExactFileEvidenceForUntrustedTestOnly(artifactPath, {
      afterStableRead: async () => {
        await fs.rename(artifactPath, archivedPath);
        await fs.rename(successorPath, artifactPath);
      },
    }),
    /pathname no longer names the exact held file at the final linearization point/u,
  );
  assert.equal(await fs.readFile(artifactPath, "utf8"), "foreign-B\n");
  assert.equal(await fs.readFile(archivedPath, "utf8"), "held-A\n");
});

test("immutable seal rejects a swapped parent directory and preserves the foreign destination", async (t) => {
  const fixtureRoot = await fs.mkdtemp("/Volumes/Starship/mais-binder-c6-seal-");
  t.after(async () => fs.rm(fixtureRoot, { force: true, recursive: true }));
  const ownedParent = path.join(fixtureRoot, "owned-parent");
  const archivedParent = path.join(fixtureRoot, "owned-parent-archived");
  const foreignParent = path.join(fixtureRoot, "foreign-parent");
  await fs.mkdir(ownedParent);
  await fs.mkdir(foreignParent);
  const fileName = ".untrusted-parent-seal-probe-receipt.json";
  const receiptPath = path.join(ownedParent, fileName);
  const foreignBytes = Buffer.from("foreign-destination\n", "utf8");
  await fs.writeFile(path.join(foreignParent, fileName), foreignBytes, {
    flag: "wx",
    mode: 0o600,
  });
  const foreignIdentity = await exactFileIdentity(path.join(foreignParent, fileName));

  await assert.rejects(
    writeImmutableReceiptProbeForUntrustedTestOnly(
      receiptPath,
      Buffer.from("candidate-parent-receipt\n", "utf8"),
      {
        afterParentDescriptorOpened: async () => {
          await fs.rename(ownedParent, archivedParent);
          await fs.rename(foreignParent, ownedParent);
        },
      },
    ),
    /parent receipt directory identity drifted before no-replace creation/u,
  );
  assert.deepEqual(await fs.readFile(receiptPath), foreignBytes);
  assert.deepEqual(await exactFileIdentity(receiptPath), foreignIdentity);
  await assert.rejects(fs.access(path.join(archivedParent, fileName)));
});

test("fd-relative no-replace creation cannot create in a foreign parent swapped immediately before open", async (t) => {
  const fixtureRoot = await fs.mkdtemp("/Volumes/Starship/mais-binder-c7-openat-");
  t.after(async () => fs.rm(fixtureRoot, { force: true, recursive: true }));
  const ownedParent = path.join(fixtureRoot, "owned-parent");
  const archivedParent = path.join(fixtureRoot, "owned-parent-archived");
  const foreignParent = path.join(fixtureRoot, "foreign-parent");
  await fs.mkdir(ownedParent);
  await fs.mkdir(foreignParent);
  const fileName = ".untrusted-parent-seal-probe-immediately-before-open.json";
  const receiptPath = path.join(ownedParent, fileName);
  const candidateBytes = Buffer.from("fd-relative-candidate\n", "utf8");
  const sentinelPath = path.join(foreignParent, "foreign-sentinel.txt");
  const sentinelBytes = Buffer.from("foreign-sentinel\n", "utf8");
  await fs.writeFile(sentinelPath, sentinelBytes, { flag: "wx", mode: 0o600 });
  const sentinelIdentity = await exactFileIdentity(sentinelPath);

  await assert.rejects(
    writeImmutableReceiptProbeForUntrustedTestOnly(
      receiptPath,
      candidateBytes,
      {
        immediatelyBeforeFdRelativeOpen: async () => {
          await fs.rename(ownedParent, archivedParent);
          await fs.rename(foreignParent, ownedParent);
        },
      },
    ),
    /parent receipt pathname does not join the held directory and fd-relative created inode/u,
  );
  await assert.rejects(fs.access(receiptPath));
  assert.deepEqual(
    await fs.readFile(path.join(ownedParent, "foreign-sentinel.txt")),
    sentinelBytes,
  );
  assert.deepEqual(
    await exactFileIdentity(path.join(ownedParent, "foreign-sentinel.txt")),
    sentinelIdentity,
  );
  assert.deepEqual(
    await fs.readFile(path.join(archivedParent, fileName)),
    candidateBytes,
  );
});

test("immutable seal keeps its created descriptor owned when the parent is swapped after creation", async (t) => {
  const fixtureRoot = await fs.mkdtemp("/Volumes/Starship/mais-binder-c6-seal-created-");
  t.after(async () => fs.rm(fixtureRoot, { force: true, recursive: true }));
  const ownedParent = path.join(fixtureRoot, "owned-parent");
  const archivedParent = path.join(fixtureRoot, "owned-parent-archived");
  const foreignParent = path.join(fixtureRoot, "foreign-parent");
  await fs.mkdir(ownedParent);
  await fs.mkdir(foreignParent);
  const fileName = ".untrusted-parent-seal-probe-after-create.json";
  const receiptPath = path.join(ownedParent, fileName);
  const foreignBytes = Buffer.from("foreign-after-create\n", "utf8");
  await fs.writeFile(path.join(foreignParent, fileName), foreignBytes, {
    flag: "wx",
    mode: 0o600,
  });
  const foreignIdentity = await exactFileIdentity(path.join(foreignParent, fileName));

  await assert.rejects(
    writeImmutableReceiptProbeForUntrustedTestOnly(
      receiptPath,
      Buffer.from("held-candidate\n", "utf8"),
      {
        afterCreate: async () => {
          await fs.rename(ownedParent, archivedParent);
          await fs.rename(foreignParent, ownedParent);
        },
      },
    ),
    /parent receipt pathname does not join the held directory and fd-relative created inode/u,
  );
  assert.deepEqual(await fs.readFile(receiptPath), foreignBytes);
  assert.deepEqual(await exactFileIdentity(receiptPath), foreignIdentity);
  assert.equal(
    await fs.readFile(path.join(archivedParent, fileName), "utf8"),
    "held-candidate\n",
  );
});

test("immutable seal rejects a parent swap after its held read and preserves both sealed and foreign bytes", async (t) => {
  const fixtureRoot = await fs.mkdtemp("/Volumes/Starship/mais-binder-c6-seal-read-");
  t.after(async () => fs.rm(fixtureRoot, { force: true, recursive: true }));
  const ownedParent = path.join(fixtureRoot, "owned-parent");
  const archivedParent = path.join(fixtureRoot, "owned-parent-archived");
  const foreignParent = path.join(fixtureRoot, "foreign-parent");
  await fs.mkdir(ownedParent);
  await fs.mkdir(foreignParent);
  const fileName = ".untrusted-parent-seal-probe-after-read.json";
  const receiptPath = path.join(ownedParent, fileName);
  const candidateBytes = Buffer.from("held-sealed-candidate\n", "utf8");
  const foreignBytes = Buffer.from("foreign-after-held-read\n", "utf8");
  await fs.writeFile(path.join(foreignParent, fileName), foreignBytes, {
    flag: "wx",
    mode: 0o600,
  });
  const foreignIdentity = await exactFileIdentity(path.join(foreignParent, fileName));

  await assert.rejects(
    writeImmutableReceiptProbeForUntrustedTestOnly(
      receiptPath,
      candidateBytes,
      {
        afterHeldRead: async () => {
          await fs.rename(ownedParent, archivedParent);
          await fs.rename(foreignParent, ownedParent);
        },
      },
    ),
    /parent receipt pathname does not join the held directory and fd-relative created inode/u,
  );
  assert.deepEqual(await fs.readFile(receiptPath), foreignBytes);
  assert.deepEqual(await exactFileIdentity(receiptPath), foreignIdentity);
  assert.deepEqual(
    await fs.readFile(path.join(archivedParent, fileName)),
    candidateBytes,
  );
});

test("immutable seal rejects a parent swap after helper exit and directory fsync at its final success boundary", async (t) => {
  const fixtureRoot = await fs.mkdtemp("/Volumes/Starship/mais-binder-c9-final-parent-");
  t.after(async () => fs.rm(fixtureRoot, { force: true, recursive: true }));
  const ownedParent = path.join(fixtureRoot, "owned-parent");
  const archivedParent = path.join(fixtureRoot, "owned-parent-archived");
  const foreignParent = path.join(fixtureRoot, "foreign-parent");
  await fs.mkdir(ownedParent);
  await fs.mkdir(foreignParent);
  const fileName = ".untrusted-parent-seal-probe-final-parent.json";
  const receiptPath = path.join(ownedParent, fileName);
  const candidateBytes = Buffer.from("final-held-candidate\n", "utf8");
  const foreignBytes = Buffer.from("final-foreign-destination\n", "utf8");
  await fs.writeFile(path.join(foreignParent, fileName), foreignBytes, {
    flag: "wx",
    mode: 0o600,
  });
  const foreignIdentity = await exactFileIdentity(path.join(foreignParent, fileName));

  await assert.rejects(
    writeImmutableReceiptProbeForUntrustedTestOnly(
      receiptPath,
      candidateBytes,
      {
        afterHelperExitAndDirectoryFsyncBeforeFinalJoin: async () => {
          await fs.rename(ownedParent, archivedParent);
          await fs.rename(foreignParent, ownedParent);
        },
      },
    ),
    /final success join no longer names the held parent and created receipt/u,
  );
  assert.deepEqual(await fs.readFile(receiptPath), foreignBytes);
  assert.deepEqual(await exactFileIdentity(receiptPath), foreignIdentity);
  assert.deepEqual(
    await fs.readFile(path.join(archivedParent, fileName)),
    candidateBytes,
  );
  assert.equal((await fs.stat(path.join(archivedParent, fileName))).mode & 0o777, 0o400);
});

test("immutable seal rejects a pathname replacement after helper exit and preserves created and successor files", async (t) => {
  const fixtureRoot = await fs.mkdtemp("/Volumes/Starship/mais-binder-c9-final-path-");
  t.after(async () => fs.rm(fixtureRoot, { force: true, recursive: true }));
  const fileName = ".untrusted-parent-seal-probe-final-path.json";
  const receiptPath = path.join(fixtureRoot, fileName);
  const archivedReceiptPath = path.join(fixtureRoot, `${fileName}.archived`);
  const successorPath = path.join(fixtureRoot, `${fileName}.successor`);
  const candidateBytes = Buffer.from("final-path-held-candidate\n", "utf8");
  const successorBytes = Buffer.from("final-path-successor\n", "utf8");
  await fs.writeFile(successorPath, successorBytes, { flag: "wx", mode: 0o600 });
  const successorIdentity = await exactFileIdentity(successorPath);

  await assert.rejects(
    writeImmutableReceiptProbeForUntrustedTestOnly(
      receiptPath,
      candidateBytes,
      {
        afterHelperExitAndDirectoryFsyncBeforeFinalJoin: async () => {
          await fs.rename(receiptPath, archivedReceiptPath);
          await fs.rename(successorPath, receiptPath);
        },
      },
    ),
    /final success join no longer names the held parent and created receipt/u,
  );
  assert.deepEqual(await fs.readFile(archivedReceiptPath), candidateBytes);
  assert.deepEqual(await fs.readFile(receiptPath), successorBytes);
  const successorAfter = await exactFileIdentity(receiptPath);
  assert.deepEqual(
    { ...successorAfter, ctimeNs: undefined },
    { ...successorIdentity, ctimeNs: undefined },
  );
  assert.equal((await fs.stat(archivedReceiptPath)).mode & 0o777, 0o400);
});

test("test-only exact-read and immutable-seal probes are explicitly untrusted and never release-ready", async (t) => {
  const fixtureRoot = await fs.mkdtemp("/Volumes/Starship/mais-binder-c6-probes-");
  t.after(async () => fs.rm(fixtureRoot, { force: true, recursive: true }));
  const sourcePath = path.join(fixtureRoot, "source.txt");
  const receiptPath = path.join(
    fixtureRoot,
    ".untrusted-parent-seal-probe-success.json",
  );
  await fs.writeFile(sourcePath, "source-bytes\n", { flag: "wx", mode: 0o600 });

  const readResult = await readNativeExactFileEvidenceForUntrustedTestOnly(sourcePath);
  const writeResult = await writeImmutableReceiptProbeForUntrustedTestOnly(
    receiptPath,
    Buffer.from("probe-receipt\n", "utf8"),
  );
  for (const result of [readResult, writeResult]) {
    assert.equal(result.status, "injected-untrusted-test-seam");
    assert.equal(result.releaseReady, false);
    assert.equal(JSON.stringify(result).includes('"releaseReady":true'), false);
    assert.equal(Object.isFrozen(result), true);
  }
  assert.equal(writeResult.artifact.exact, false);
  assert.equal(
    writeResult.artifact.status,
    "blocked-no-held-executable-image-launch",
  );
  assert.equal(writeResult.artifact.mode, "400");
  assert.equal(writeResult.artifact.parent.path, fixtureRoot);
  assert.deepEqual(Object.keys(writeResult.artifact.directoryWalk), [
    "chain",
    "contract",
    "parentDescriptorHeldThroughFinalJoin",
    "rootDescriptorHeldThroughFinalJoin",
    "status",
  ]);
  assert.equal(
    writeResult.artifact.directoryWalk.contract,
    "mainland-starship-root-openat-component-walk-v1",
  );
  assert.equal(
    writeResult.artifact.directoryWalk.status,
    "fd-anchored-components-and-post-exit-parent-continuity-proven",
  );
  assert.equal(writeResult.artifact.directoryWalk.chain[0].component, "/Volumes/Starship");
  assert.equal(
    writeResult.artifact.directoryWalk.chain.at(-1).device,
    writeResult.artifact.parent.device,
  );
  assert.equal(
    writeResult.artifact.directoryWalk.chain.at(-1).inode,
    writeResult.artifact.parent.inode,
  );
  assert.equal(
    writeResult.artifact.finalLinearization.parent.device,
    writeResult.artifact.parent.device,
  );
  assert.equal(
    writeResult.artifact.finalLinearization.parent.inode,
    writeResult.artifact.parent.inode,
  );
  assert.deepEqual(Object.keys(writeResult.artifact.finalLinearization), [
    "created",
    "parent",
    "status",
  ]);
  assert.equal(
    writeResult.artifact.finalLinearization.status,
    "joined-after-helper-exit-and-directory-fsync",
  );
  assert.equal(writeResult.artifact.finalLinearization.created.mode, "400");
  assert.equal(
    writeResult.artifact.finalLinearization.created.sha256,
    digest(Buffer.from("probe-receipt\n", "utf8")),
  );
  assert.deepEqual(Object.keys(writeResult.artifact.helper), [
    "command",
    "commandSha256",
    "invocation",
    "processImageBinding",
    "sourceSha256",
  ]);
  assert.equal(writeResult.artifact.helper.command, "/usr/bin/python3");
  assert.match(writeResult.artifact.helper.commandSha256, /^[0-9a-f]{64}$/u);
  assert.deepEqual(writeResult.artifact.helper.processImageBinding, {
    attestedPath: "/usr/bin/python3",
    heldDescriptorThroughChildExit: true,
    processImageExact: false,
    status: "blocked-no-held-executable-image-launch",
  });
  assert.equal(
    writeResult.artifact.helper.invocation.contract,
    "mainland-fd-relative-openat-helper-invocation-v1",
  );
  assert.equal(writeResult.artifact.helper.invocation.schemaVersion, 1);
  assert.match(writeResult.artifact.helper.invocation.sha256, /^[0-9a-f]{64}$/u);
  assert.match(writeResult.artifact.helper.invocation.argvSha256, /^[0-9a-f]{64}$/u);
  assert.deepEqual(writeResult.artifact.helper.invocation.environment.names, [
    "LANG",
    "LC_ALL",
  ]);
  assert.equal(writeResult.artifact.helper.invocation.environment.valueCount, 2);
  assert.deepEqual(Object.keys(writeResult.artifact.helper.invocation.fdMap), [
    "0",
    "1",
    "2",
    "3",
  ]);
  assert.equal(
    writeResult.artifact.helper.invocation.fdMap[3].role,
    "held-trusted-starship-root-directory",
  );
  assert.equal(
    writeResult.artifact.helper.invocation.protocol.contract,
    "mainland-fd-relative-openat-helper-protocol-v1",
  );
  assert.equal(writeResult.artifact.helper.invocation.protocol.schemaVersion, 1);
  assert.equal(writeResult.artifact.helper.invocation.protocol.phaseCount, 4);
  assert.equal(
    writeResult.artifact.helper.invocation.protocol.maxStderrLineBytes <
      writeResult.artifact.helper.invocation.protocol.maxStderrBytes,
    true,
  );
  assert.match(
    writeResult.artifact.helper.invocation.protocol.nonceSha256,
    /^[0-9a-f]{64}$/u,
  );
  const { argvSha256, sha256: invocationSha256, ...rawInvocation } =
    writeResult.artifact.helper.invocation;
  assert.equal(digest(Buffer.from(JSON.stringify(rawInvocation.argv), "utf8")), argvSha256);
  assert.equal(digest(Buffer.from(JSON.stringify(rawInvocation), "utf8")), invocationSha256);
  assert.equal(rawInvocation.argv[0], writeResult.artifact.helper.command);
  assert.deepEqual(rawInvocation.argv.slice(1, 5), ["-I", "-S", "-B", "-c"]);
  assert.equal(
    digest(Buffer.from(rawInvocation.argv[5], "utf8")),
    writeResult.artifact.helper.sourceSha256,
  );
  const invocationProtocolConfiguration = JSON.parse(
    Buffer.from(rawInvocation.argv.at(-1), "base64").toString("utf8"),
  );
  assert.equal(
    digest(Buffer.from(JSON.stringify(invocationProtocolConfiguration), "utf8")),
    rawInvocation.protocol.configurationSha256,
  );
  assert.equal(
    invocationProtocolConfiguration.nonce,
    rawInvocation.protocol.nonce,
  );
  assert.deepEqual(
    invocationProtocolConfiguration.challenges,
    rawInvocation.protocol.challenges,
  );
  assert.deepEqual(
    invocationProtocolConfiguration.parentComponents,
    rawInvocation.directoryWalk.components,
  );
  assert.equal(rawInvocation.directoryWalk.root.path, "/Volumes/Starship");
  assert.equal(
    rawInvocation.directoryWalk.root.device,
    rawInvocation.fdMap[3].device,
  );
  assert.equal(
    rawInvocation.directoryWalk.root.inode,
    rawInvocation.fdMap[3].inode,
  );
  assert.equal(
    rawInvocation.executable.sha256,
    writeResult.artifact.helper.commandSha256,
  );
  assert.deepEqual(
    rawInvocation.processImageBinding,
    writeResult.artifact.helper.processImageBinding,
  );
  assert.equal(
    rawInvocation.helperSource.sha256,
    writeResult.artifact.helper.sourceSha256,
  );
  assert.deepEqual(rawInvocation.environment.values, [["LANG", "C"], ["LC_ALL", "C"]]);
  assert.match(writeResult.artifact.helper.sourceSha256, /^[0-9a-f]{64}$/u);
  assert.equal(await fs.readFile(receiptPath, "utf8"), "probe-receipt\n");
});

test("immutable seal rejects executable pathname interposition after attestation and never claims an exact process image", async (t) => {
  const fixtureRoot = await fs.mkdtemp("/Volumes/Starship/mais-binder-c9-executable-");
  t.after(async () => fs.rm(fixtureRoot, { force: true, recursive: true }));
  const executablePath = path.join(fixtureRoot, "python-held");
  const archivedExecutablePath = path.join(fixtureRoot, "python-held-archived");
  const successorExecutablePath = path.join(fixtureRoot, "python-successor");
  await fs.copyFile("/usr/bin/python3", executablePath);
  await fs.writeFile(successorExecutablePath, "foreign-executable-image\n", {
    flag: "wx",
    mode: 0o700,
  });
  const attestedBytes = await fs.readFile(executablePath);
  const successorBytes = await fs.readFile(successorExecutablePath);
  const successorIdentity = await exactFileIdentity(successorExecutablePath);
  const receiptPath = path.join(
    fixtureRoot,
    ".untrusted-parent-seal-probe-executable-interposition.json",
  );

  await assert.rejects(
    writeImmutableReceiptProbeForUntrustedTestOnly(
      receiptPath,
      Buffer.from("must-not-spawn-successor\n", "utf8"),
      {
        afterHelperExecutableAttestedBeforeSpawn: async () => {
          await fs.rename(executablePath, archivedExecutablePath);
          await fs.rename(successorExecutablePath, executablePath);
        },
        helperExecutablePathForUntrustedTestOnly: executablePath,
      },
    ),
    /helper executable pathname no longer names the held attested file/u,
  );
  await assert.rejects(fs.access(receiptPath));
  assert.deepEqual(await fs.readFile(archivedExecutablePath), attestedBytes);
  assert.deepEqual(await fs.readFile(executablePath), successorBytes);
  const successorAfter = await exactFileIdentity(executablePath);
  assert.deepEqual(
    { ...successorAfter, ctimeNs: undefined },
    { ...successorIdentity, ctimeNs: undefined },
  );
});

test("untrusted executable-path attestation seam cannot become process launch authority", async (t) => {
  const fixtureRoot = await fs.mkdtemp("/Volumes/Starship/mais-binder-c9-exec-authority-");
  t.after(async () => fs.rm(fixtureRoot, { force: true, recursive: true }));
  const executablePath = path.join(fixtureRoot, "python-copy");
  await fs.copyFile("/usr/bin/python3", executablePath);
  const receiptPath = path.join(
    fixtureRoot,
    ".untrusted-parent-seal-probe-executable-authority.json",
  );

  await assert.rejects(
    writeImmutableReceiptProbeForUntrustedTestOnly(
      receiptPath,
      Buffer.from("must-not-launch-test-selected-image\n", "utf8"),
      { helperExecutablePathForUntrustedTestOnly: executablePath },
    ),
    /untrusted executable attestation path cannot become helper launch authority/u,
  );
  await assert.rejects(fs.access(receiptPath));
});

test("untrusted immutable-seal probe rejects a canonical Users path before any file side effect", async () => {
  const receiptPath = path.join(
    "/Users/dongpinhu",
    `.untrusted-parent-seal-probe-outside-users-${process.pid}-${Date.now()}.json`,
  );
  await assert.rejects(fs.access(receiptPath));

  await assert.rejects(
    writeImmutableReceiptProbeForUntrustedTestOnly(
      receiptPath,
      Buffer.from("must-not-write-outside-starship\n", "utf8"),
    ),
    /strictly below \/Volumes\/Starship/u,
  );
  await assert.rejects(fs.access(receiptPath));
});

test("untrusted immutable-seal probe rejects a Starship parent symlink resolving outside before native open", async (t) => {
  const starshipParent = await fs.mkdtemp(
    "/Volumes/Starship/mais-binder-c10-parent-link-",
  );
  t.after(async () => fs.rm(starshipParent, { force: true, recursive: true }));
  const linkedParent = path.join(starshipParent, "linked-outside-parent");
  await fs.symlink("/Users/dongpinhu", linkedParent);
  const fileName =
    `.untrusted-parent-seal-probe-symlink-outside-${process.pid}-${Date.now()}.json`;
  const outsideTarget = path.join("/Users/dongpinhu", fileName);
  await assert.rejects(fs.access(outsideTarget));
  const receiptPath = path.join(
    linkedParent,
    fileName,
  );

  await assert.rejects(
    writeImmutableReceiptProbeForUntrustedTestOnly(
      receiptPath,
      Buffer.from("must-not-follow-parent-symlink\n", "utf8"),
    ),
    /canonical parent must be strictly below \/Volumes\/Starship and contain no symlink/u,
  );
  await assert.rejects(fs.access(outsideTarget));
});

test("untrusted immutable-seal probe rejects an absolute dot-segment spelling before creating its normalized target", async (t) => {
  const fixtureRoot = await fs.mkdtemp(
    "/Volumes/Starship/mais-binder-c11-dot-segment-",
  );
  t.after(async () => fs.rm(fixtureRoot, { force: true, recursive: true }));
  const receiptPath = `${fixtureRoot}/unused/../.untrusted-parent-seal-probe-dot-segment.json`;
  const normalizedTarget = path.resolve(receiptPath);
  await assert.rejects(fs.access(normalizedTarget));

  await assert.rejects(
    writeImmutableReceiptProbeForUntrustedTestOnly(
      receiptPath,
      Buffer.from("must-not-normalize-and-write\n", "utf8"),
    ),
    /path must use its exact canonical normalized spelling/u,
  );
  await assert.rejects(fs.access(normalizedTarget));
});

test("untrusted immutable-seal probe rejects duplicate path separators before creating the normalized target", async (t) => {
  const fixtureRoot = await fs.mkdtemp(
    "/Volumes/Starship/mais-binder-c11-separators-",
  );
  t.after(async () => fs.rm(fixtureRoot, { force: true, recursive: true }));
  const receiptPath = `${fixtureRoot}//.untrusted-parent-seal-probe-separators.json`;
  const normalizedTarget = path.resolve(receiptPath);
  await assert.rejects(fs.access(normalizedTarget));

  await assert.rejects(
    writeImmutableReceiptProbeForUntrustedTestOnly(
      receiptPath,
      Buffer.from("must-not-collapse-separators\n", "utf8"),
    ),
    /path must use its exact canonical normalized spelling/u,
  );
  await assert.rejects(fs.access(normalizedTarget));
});

test("immutable seal rejects an ancestor swapped to an outside symlink after realpath without touching the outside target", async (t) => {
  const fixtureRoot = await fs.mkdtemp(
    "/Volumes/Starship/mais-binder-c12-ancestor-swap-",
  );
  t.after(async () => fs.rm(fixtureRoot, { force: true, recursive: true }));
  const ancestorPath = path.join(fixtureRoot, "ancestor");
  const archivedAncestorPath = path.join(fixtureRoot, "ancestor-archived");
  const localParent = path.join(ancestorPath, "Desktop");
  await fs.mkdir(localParent, { recursive: true });
  const outsideParent = "/Users/dongpinhu/Desktop";
  await fs.access(outsideParent);
  const fileName =
    `.untrusted-parent-seal-probe-ancestor-swap-${process.pid}-${Date.now()}.json`;
  const receiptPath = path.join(localParent, fileName);
  const outsideTarget = path.join(outsideParent, fileName);
  await assert.rejects(fs.access(receiptPath));
  await assert.rejects(fs.access(outsideTarget));

  await assert.rejects(
    writeImmutableReceiptProbeForUntrustedTestOnly(
      receiptPath,
      Buffer.from("must-not-cross-ancestor-symlink\n", "utf8"),
      {
        afterParentRealpathBeforeAnchoredWalk: async () => {
          await fs.rename(ancestorPath, archivedAncestorPath);
          await fs.symlink("/Users/dongpinhu", ancestorPath);
        },
      },
    ),
    /fd-anchored Starship component walk rejected the parent/u,
  );
  await assert.rejects(fs.access(outsideTarget));
  await assert.rejects(fs.access(path.join(archivedAncestorPath, "Desktop", fileName)));
});

test("untrusted immutable-seal probe rejects relative, tmp, Starship-root, and prefix-lookalike paths without creating targets", async () => {
  const unique = `${process.pid}-${Date.now()}`;
  const prefixParent = "/Volumes/Starship-evil";
  const prefixParentExistedBefore = await fs.access(prefixParent).then(
    () => true,
    () => false,
  );
  const cases = [
    [
      `scripts/.untrusted-parent-seal-probe-relative-${unique}.json`,
      /path must be absolute/u,
    ],
    [
      `/tmp/.untrusted-parent-seal-probe-tmp-${unique}.json`,
      /strictly below \/Volumes\/Starship/u,
    ],
    [
      `/Volumes/Starship/.untrusted-parent-seal-probe-volume-root-${unique}.json`,
      /strictly below \/Volumes\/Starship/u,
    ],
    [
      `${prefixParent}/.untrusted-parent-seal-probe-prefix-${unique}.json`,
      /strictly below \/Volumes\/Starship/u,
    ],
  ];
  for (const [receiptPath, expected] of cases) {
    const resolvedTarget = path.resolve(receiptPath);
    await assert.rejects(fs.access(resolvedTarget));
    await assert.rejects(
      writeImmutableReceiptProbeForUntrustedTestOnly(
        receiptPath,
        Buffer.from("must-not-create-boundary-target\n", "utf8"),
      ),
      expected,
      receiptPath,
    );
    await assert.rejects(fs.access(resolvedTarget));
  }
  assert.equal(
    await fs.access(prefixParent).then(() => true, () => false),
    prefixParentExistedBefore,
  );
});

test("untrusted immutable-seal probe accepts unique canonical Starship direct-child and nested parents", async (t) => {
  const directParent = await fs.mkdtemp(
    "/Volumes/Starship/mais-binder-c10-positive-",
  );
  t.after(async () => fs.rm(directParent, { force: true, recursive: true }));
  const nestedParent = path.join(directParent, "nested", "receipts");
  await fs.mkdir(nestedParent, { recursive: true });
  const cases = [
    [
      path.join(directParent, ".untrusted-parent-seal-probe-direct.json"),
      Buffer.from("direct-starship-probe\n", "utf8"),
    ],
    [
      path.join(nestedParent, ".untrusted-parent-seal-probe-nested.json"),
      Buffer.from("nested-starship-probe\n", "utf8"),
    ],
  ];
  for (const [receiptPath, receiptBytes] of cases) {
    const result = await writeImmutableReceiptProbeForUntrustedTestOnly(
      receiptPath,
      receiptBytes,
    );
    assert.equal(result.releaseReady, false);
    assert.equal(result.artifact.exact, false);
    assert.equal(
      result.artifact.status,
      "blocked-no-held-executable-image-launch",
    );
    assert.deepEqual(await fs.readFile(receiptPath), receiptBytes);
  }
});

test("immutable seal refuses a pre-existing destination without changing its bytes or inode", async (t) => {
  const fixtureRoot = await fs.mkdtemp("/Volumes/Starship/mais-binder-c8-preexisting-");
  t.after(async () => fs.rm(fixtureRoot, { force: true, recursive: true }));
  const receiptPath = path.join(
    fixtureRoot,
    ".untrusted-parent-seal-probe-preexisting.json",
  );
  const foreignBytes = Buffer.from("pre-existing-foreign-receipt\n", "utf8");
  await fs.writeFile(receiptPath, foreignBytes, { flag: "wx", mode: 0o600 });
  const foreignIdentity = await exactFileIdentity(receiptPath);

  await assert.rejects(
    writeImmutableReceiptProbeForUntrustedTestOnly(
      receiptPath,
      Buffer.from("candidate-must-not-overwrite\n", "utf8"),
    ),
    /closed before terminal evidence/u,
  );
  assert.deepEqual(await fs.readFile(receiptPath), foreignBytes);
  assert.deepEqual(await exactFileIdentity(receiptPath), foreignIdentity);
});

test("each immutable-seal helper run uses fresh nonce and phase challenges", async (t) => {
  const fixtureRoot = await fs.mkdtemp("/Volumes/Starship/mais-binder-c8-fresh-");
  t.after(async () => fs.rm(fixtureRoot, { force: true, recursive: true }));
  const first = await writeImmutableReceiptProbeForUntrustedTestOnly(
    path.join(fixtureRoot, ".untrusted-parent-seal-probe-fresh-a.json"),
    Buffer.from("first\n", "utf8"),
  );
  const second = await writeImmutableReceiptProbeForUntrustedTestOnly(
    path.join(fixtureRoot, ".untrusted-parent-seal-probe-fresh-b.json"),
    Buffer.from("second\n", "utf8"),
  );
  const firstProtocol = first.artifact.helper.invocation.protocol;
  const secondProtocol = second.artifact.helper.invocation.protocol;
  assert.notEqual(firstProtocol.nonce, secondProtocol.nonce);
  assert.notEqual(firstProtocol.nonceSha256, secondProtocol.nonceSha256);
  assert.equal(new Set(firstProtocol.challenges).size, 4);
  assert.equal(new Set(secondProtocol.challenges).size, 4);
  for (let index = 0; index < 4; index += 1) {
    assert.notEqual(firstProtocol.challenges[index], secondProtocol.challenges[index]);
  }
});

test("immutable-seal helper fails closed on crash, signal, partial EOF, or phase stall", async (t) => {
  const fixtureRoot = await fs.mkdtemp("/Volumes/Starship/mais-binder-c8-process-");
  t.after(async () => fs.rm(fixtureRoot, { force: true, recursive: true }));
  const cases = [
    ["crash", /closed before terminal evidence/u, undefined],
    ["signal", /closed before terminal evidence/u, undefined],
    ["partial-eof", /partial stdout line/u, undefined],
    ["stall", /deadline/u, 25],
  ];
  for (const [fault, expected, phaseDeadlineMs] of cases) {
    const receiptPath = path.join(
      fixtureRoot,
      `.untrusted-parent-seal-probe-${fault}.json`,
    );
    await assert.rejects(
      writeImmutableReceiptProbeForUntrustedTestOnly(
        receiptPath,
        Buffer.from(`${fault}\n`, "utf8"),
        { helperFault: fault, phaseDeadlineMs },
      ),
      expected,
      fault,
    );
    await assert.rejects(fs.access(receiptPath));
  }
});

test("immutable-seal helper rejects stale nonce and replayed phase evidence", async (t) => {
  const fixtureRoot = await fs.mkdtemp("/Volumes/Starship/mais-binder-c8-replay-");
  t.after(async () => fs.rm(fixtureRoot, { force: true, recursive: true }));
  for (const fault of ["stale-nonce", "replay-phase"]) {
    await assert.rejects(
      writeImmutableReceiptProbeForUntrustedTestOnly(
        path.join(fixtureRoot, `.untrusted-parent-seal-probe-${fault}.json`),
        Buffer.from(`${fault}\n`, "utf8"),
        { helperFault: fault },
      ),
      /protocol drifted/u,
      fault,
    );
  }
});

test("immutable-seal helper requires exact stdout and stderr bounds through terminal EOF", async (t) => {
  const fixtureRoot = await fs.mkdtemp("/Volumes/Starship/mais-binder-c8-eof-");
  t.after(async () => fs.rm(fixtureRoot, { force: true, recursive: true }));
  const cases = [
    ["duplicate-terminal", /surplus terminal evidence/u],
    ["surplus-terminal", /surplus terminal evidence/u],
    ["oversized-stdout", /stdout line bound/u],
    ["oversized-stderr", /stderr line bound/u],
    ["oversized-stderr-total", /total stderr byte bound/u],
  ];
  for (const [fault, expected] of cases) {
    await assert.rejects(
      writeImmutableReceiptProbeForUntrustedTestOnly(
        path.join(fixtureRoot, `.untrusted-parent-seal-probe-${fault}.json`),
        Buffer.from(`${fault}\n`, "utf8"),
        { helperFault: fault },
      ),
      expected,
      fault,
    );
  }
});

test("immutable-seal helper rejects executable, argv, environment, fd3, or inherited-fd drift before spawn", async (t) => {
  const fixtureRoot = await fs.mkdtemp("/Volumes/Starship/mais-binder-c8-plan-");
  t.after(async () => fs.rm(fixtureRoot, { force: true, recursive: true }));
  const cases = [
    ["executable", (plan) => ({ ...plan, command: "/bin/echo" })],
    ["source", (plan) => ({
      ...plan,
      args: plan.args.map((value, index) => index === 4 ? `${value}\n# substituted` : value),
    })],
    ["argv", (plan) => ({ ...plan, args: [...plan.args, "foreign-arg"] })],
    ["environment", (plan) => ({
      ...plan,
      options: { ...plan.options, env: { ...plan.options.env, FOREIGN: "1" } },
    })],
    ["fd3", (plan) => ({
      ...plan,
      options: {
        ...plan.options,
        stdio: [...plan.options.stdio.slice(0, 3), plan.options.stdio[3] + 1],
      },
    })],
    ["extra-fd", (plan) => ({
      ...plan,
      options: { ...plan.options, stdio: [...plan.options.stdio, "ignore"] },
    })],
    ["inherited-shell", (plan) => {
      const options = Object.assign(Object.create({ shell: true }), plan.options);
      return { ...plan, options };
    }],
    ["symbol-option", (plan) => ({
      ...plan,
      options: { ...plan.options, [Symbol("foreign")]: true },
    })],
  ];
  for (const [label, mutate] of cases) {
    const receiptPath = path.join(
      fixtureRoot,
      `.untrusted-parent-seal-probe-plan-${label}.json`,
    );
    await assert.rejects(
      writeImmutableReceiptProbeForUntrustedTestOnly(
        receiptPath,
        Buffer.from(`${label}\n`, "utf8"),
        { prepareFdRelativeSpawnForTest: mutate },
      ),
      /spawn plan drifted from its canonical invocation/u,
      label,
    );
    await assert.rejects(fs.access(receiptPath));
  }
});

function replaceJsonArtifact(artifacts, artifactPath, mutate) {
  const value = JSON.parse(artifacts.get(artifactPath).toString("utf8"));
  mutate(value);
  artifacts.set(artifactPath, Buffer.from(`${JSON.stringify(value)}\n`, "utf8"));
}

const prebuildRuntimeSourceLabels = [
  "innerRunner",
  "pathGate",
  "nextCleanBuild",
  "cleanupGeneratedArtifacts",
  "strayGeneratedTypesGate",
  "playwrightConfig",
  "nextConfig",
  "tsconfig",
  "tsconfigNext",
  "packageJson",
  "packageLock",
  "nextRuntime",
  "typescriptRuntime",
];

function fixtureFileReceipt(artifactPath, bytes, index, { changeTokens = false } = {}) {
  const receipt = {
    device: String(90_000 + index),
    inode: String(190_000 + index),
    mode: index % 2 === 0 ? "600" : "644",
    path: artifactPath,
    sha256: digest(bytes),
    size: bytes.length,
  };
  if (changeTokens) {
    receipt.ctimeNs = String(1_800_000_000_000_000_000n + BigInt(index));
    receipt.mtimeNs = String(1_700_000_000_000_000_000n + BigInt(index));
  }
  return receipt;
}

test("absolute focused spec paths normalize to exactly one tests/e2e prefix", () => {
  const absolute = `${repositoryRoot}/tests/e2e/china-mainland-g03-signed-real-production.spec.ts`;
  assert.equal(
    normalizeMainlandFocusedSpecFile(absolute, repositoryRoot),
    "tests/e2e/china-mainland-g03-signed-real-production.spec.ts",
  );
  assert.equal(
    normalizeMainlandFocusedSpecFile(absolute, `${repositoryRoot}/tests/e2e`),
    "tests/e2e/china-mainland-g03-signed-real-production.spec.ts",
  );
});

async function positiveFixture() {
  const artifacts = new Map(
    [...sourceBytes].map(([artifactPath, bytes]) => [artifactPath, Buffer.from(bytes)]),
  );
  const built = await buildMainlandFocusedSupervisedReleaseInvocation({
    baseEnvironment: { PATH: "/usr/bin:/bin" },
    intendedPort,
    repositoryRoot,
    runId,
  }, {
    readArtifact: async (artifactPath) => Buffer.from(artifacts.get(artifactPath)),
  });
  const envelope = structuredClone(built.evidence);
  const paths = envelope.paths;
  const artifactIdentityIndexes = new Map(
    [...artifacts.keys()].map((artifactPath, index) => [artifactPath, index + 1]),
  );
  let nextArtifactIdentityIndex = artifactIdentityIndexes.size + 1;
  const addArtifact = (artifactPath, bytes) => {
    artifacts.set(artifactPath, Buffer.from(bytes));
    if (!artifactIdentityIndexes.has(artifactPath)) {
      artifactIdentityIndexes.set(artifactPath, nextArtifactIdentityIndex);
      nextArtifactIdentityIndex += 1;
    }
  };
  const artifactEvidence = (artifactPath, { changeTokens = false } = {}) => {
    const bytes = artifacts.get(artifactPath);
    if (!bytes) throw new Error(`missing fixture artifact ${artifactPath}`);
    return {
      bytes: Buffer.from(bytes),
      receipt: fixtureFileReceipt(
        artifactPath,
        bytes,
        artifactIdentityIndexes.get(artifactPath),
        { changeTokens },
      ),
    };
  };
  const signalJournalBytes = Buffer.alloc(0);
  const signalJournalSha256 = digest(signalJournalBytes);
  const serverOwnerPid = 41_002;
  const serverOwnerStartToken = "Wed Aug 20 00:00:02 2026";
  const serverOwnerRegisteredCommandSha256 = "5".repeat(64);
  const serverOwnerObservedCommandSha256 = "6".repeat(64);
  const runnerPid = 31_001;
  const runnerStartToken = "Wed Aug 20 00:00:01 2026";
  const nextDistDir = `${repositoryRoot}/.tmp/e2e-run-${runId}/next-dist`;
  const nextTsconfigPath = `${repositoryRoot}/tsconfig.playwright-${runId}.tmp.json`;
  const report = {
    config: {
      projects: ["desktop-chrome", "mobile-chrome"].map((name) => ({
        id: name,
        name,
        use: { baseURL: `http://127.0.0.1:${intendedPort}` },
      })),
    },
    fixtureMarker: "canonical",
  };
  const manifest = {
    externalEvidencePaths: {
      PLAYWRIGHT_JSON_OUTPUT_FILE: paths.reportPath,
      jsonReportPath: paths.reportPath,
    },
    paths: {
      e2eRunRoot: `${repositoryRoot}/.tmp/e2e-run-${runId}`,
      nextDistDir,
      nextTsconfigPath,
      pathManifestPath: paths.pathManifestPath,
      repositoryRoot,
      serverCommandOwnerPidPath: paths.serverCommandOwnerPidPath,
      serverLogPath: paths.serverLogPath,
    },
    process: { cwd: repositoryRoot, pid: runnerPid, ppid: 31_000 },
    runId,
    schemaVersion: 1,
    status: "preflight-passed",
  };
  const emptyTermination = {
    finalMembers: [],
    processGroupId: runnerPid,
    provenEmpty: true,
  };
  const supervisor = {
    child: {
      argv: [process.execPath, `${repositoryRoot}/${MAINLAND_FOCUSED_SUPERVISED_SOURCE_PATHS.innerRunner}`, "--run-id", runId, "--", ...envelope.innerArgs],
      cwd: repositoryRoot,
      environment: {
        names: requiredSupervisorChildEnvironmentNames,
        sha256: "1".repeat(64),
        valueCount: requiredSupervisorChildEnvironmentNames.length,
      },
      outcome: { code: 0, signal: null, spawnError: null },
      processGroupId: runnerPid,
    },
    cleanup: {
      complete: true,
      detachedProcessGroupTermination: [{ ...emptyTermination, processGroupId: serverOwnerPid }],
      nextEnv: {
        after: { sha256: envelope.sourceSha256.nextEnv, size: 123 },
        before: { sha256: envelope.sourceSha256.nextEnv, size: 123 },
        exact: true,
        restored: false,
        status: "unchanged",
      },
      orphanScan: { finalMembers: [], provenEmpty: true },
      ownedUniverse: { consecutiveZeroScans: 2, finalRows: [], provenEmpty: true },
      processGroupTermination: emptyTermination,
      recordedProcessGroupTermination: [{ ...emptyTermination, processGroupId: serverOwnerPid }],
      validatedDetachedProcessGroups: [serverOwnerPid],
      validatedProcessGroups: [runnerPid, serverOwnerPid],
    },
    contract: "starship-playwright-supervisor-v2",
    paths: {
      e2eRunRoot: `${repositoryRoot}/.tmp/e2e-run-${runId}`,
      nextEnvPath: `${repositoryRoot}/next-env.d.ts`,
      receiptPath: paths.supervisorReceiptPath,
      signalJournalPath: paths.signalJournalPath,
    },
    registry: {
      commandTransitions: [{
        observedCommandSha256: serverOwnerObservedCommandSha256,
        pgid: serverOwnerPid,
        pid: serverOwnerPid,
        reason: "live-registry-command-transition",
        registeredCommandSha256: serverOwnerRegisteredCommandSha256,
        startToken: serverOwnerStartToken,
      }],
      preloadAcks: [{
        eventId: "preload-inner-runner",
        pgid: runnerPid,
        pid: runnerPid,
        processCommandSha256: "3".repeat(64),
        runnerPathSha256: digest(Buffer.from(`${repositoryRoot}/${MAINLAND_FOCUSED_SUPERVISED_SOURCE_PATHS.innerRunner}`, "utf8")),
        runnerSha256: envelope.sourceSha256.innerRunner,
        startToken: runnerStartToken,
      }, {
        eventId: "preload-server-owner",
        pgid: serverOwnerPid,
        pid: serverOwnerPid,
        processCommandSha256: serverOwnerRegisteredCommandSha256,
        runnerPathSha256: digest(Buffer.from(`${repositoryRoot}/${MAINLAND_FOCUSED_SUPERVISED_SOURCE_PATHS.innerRunner}`, "utf8")),
        runnerSha256: envelope.sourceSha256.innerRunner,
        startToken: serverOwnerStartToken,
      }],
      recordedProcessGroups: [serverOwnerPid],
      seenIdentities: [
        { commandSha256: "3".repeat(64), pgid: runnerPid, pid: runnerPid, startToken: runnerStartToken },
        { commandSha256: serverOwnerObservedCommandSha256, pgid: serverOwnerPid, pid: serverOwnerPid, startToken: serverOwnerStartToken },
      ],
    },
    releaseReady: false,
    runner: null,
    schemaVersion: 2,
    signals: {
      forwarded: [],
      journal: {
        deliveredCount: 0,
        deliveredRecords: [],
        errors: [],
        expectedSha256: signalJournalSha256,
        path: paths.signalJournalPath,
        receipt: {
          exact: true,
          final: { sha256: signalJournalSha256, size: 0 },
        },
        snapshotExact: true,
      },
    },
    status: "passed",
    supervisor: null,
    violations: [],
  };
  supervisor.startedAt = "2026-08-20T00:00:00.000Z";
  supervisor.finishedAt = "2026-08-20T00:20:00.000Z";
  const runnerPath = `${repositoryRoot}/${MAINLAND_FOCUSED_SUPERVISED_SOURCE_PATHS.innerRunner}`;
  const supervisorPath = `${repositoryRoot}/${MAINLAND_FOCUSED_SUPERVISED_SOURCE_PATHS.supervisor}`;
  const runnerIdentity = {
    ...fixtureFileReceipt(runnerPath, artifacts.get(runnerPath), artifactIdentityIndexes.get(runnerPath), { changeTokens: true }),
    exists: true,
    pathSha256: digest(Buffer.from(runnerPath, "utf8")),
  };
  const supervisorIdentity = {
    ...fixtureFileReceipt(supervisorPath, artifacts.get(supervisorPath), artifactIdentityIndexes.get(supervisorPath), { changeTokens: true }),
    exists: true,
    pathSha256: digest(Buffer.from(supervisorPath, "utf8")),
  };
  supervisor.runner = { after: structuredClone(runnerIdentity), before: structuredClone(runnerIdentity) };
  supervisor.supervisor = {
    after: structuredClone(supervisorIdentity),
    before: structuredClone(supervisorIdentity),
    nonceSha256: "4".repeat(64),
  };
  const buildOutputEntries = [
    ["buildId", "BUILD_ID", Buffer.from("fixture-build-id\n", "utf8")],
    ["requiredServerFiles", "required-server-files.json", Buffer.from('{"version":1}\n', "utf8")],
    ["buildManifest", "build-manifest.json", Buffer.from('{"pages":{}}\n', "utf8")],
  ];
  const buildOutputs = {};
  for (const [key, fileName, bytes] of buildOutputEntries) {
    const outputPath = `${nextDistDir}/${fileName}`;
    addArtifact(outputPath, bytes);
    buildOutputs[key] = fixtureFileReceipt(
      outputPath,
      bytes,
      artifactIdentityIndexes.get(outputPath),
    );
  }
  const runtimeSources = prebuildRuntimeSourceLabels.map((label) => {
    const sourcePath = `${repositoryRoot}/${MAINLAND_FOCUSED_SUPERVISED_SOURCE_PATHS[label]}`;
    const receipt = artifactEvidence(sourcePath, { changeTokens: true }).receipt;
    return { after: structuredClone(receipt), before: structuredClone(receipt) };
  });
  const nextEnvPath = `${repositoryRoot}/${MAINLAND_FOCUSED_SUPERVISED_SOURCE_PATHS.nextEnv}`;
  const nextEnvReceipt = artifactEvidence(nextEnvPath).receipt;
  const prebuildReceipt = {
    baseURL: `http://127.0.0.1:${intendedPort}`,
    build: { code: 0, signal: null, spawnError: null },
    buildOutputs,
    completedAt: "2026-08-20T00:00:10.000Z",
    contract: "starship-playwright-prebuild-v1",
    nextEnv: {
      after: structuredClone(nextEnvReceipt),
      before: structuredClone(nextEnvReceipt),
    },
    paths: { nextDistDir, nextEnv: nextEnvPath, nextTsconfigPath },
    port: intendedPort,
    repositoryRoot,
    runId,
    runner: { pid: runnerPid, startToken: runnerStartToken },
    runtimeSources,
    schemaVersion: 1,
    status: "build-restored-before-playwright",
  };
  addArtifact(
    paths.prebuildReceiptPath,
    Buffer.from(`${JSON.stringify(prebuildReceipt, null, 2)}\n`, "utf8"),
  );
  artifacts.set(paths.reportPath, Buffer.from(`${JSON.stringify(report)}\n`, "utf8"));
  artifacts.set(paths.pathManifestPath, Buffer.from(`${JSON.stringify(manifest)}\n`, "utf8"));
  artifacts.set(paths.signalJournalPath, signalJournalBytes);
  artifacts.set(paths.supervisorReceiptPath, Buffer.from(`${JSON.stringify(supervisor)}\n`, "utf8"));
  artifacts.set(paths.serverCommandOwnerPidPath, Buffer.from(`${serverOwnerPid}\n`, "utf8"));
  artifacts.set(
    paths.serverLogPath,
    Buffer.from(
      `next build completed\nnext start ready\n- Network: http://127.0.0.1:${intendedPort}\n`,
      "utf8",
    ),
  );
  const focusedSummary = {
    executionCount: 92,
    groupCount: 4,
    projects: ["desktop-chrome", "mobile-chrome"],
    releaseReady: false,
    reportPath: paths.reportPath,
    stateReceiptCount: 2_646,
    status: "inner-report-passed",
  };
  const rawReplaySummary = {
    countsByGroup: { G03: 6, G04: 5, G05: 2, G06: 1 },
    executionCount: 92,
    includedCount: 14,
    representativeCaseIds: Array.from({ length: 14 }, (_, index) => `raw-${index + 1}`),
  };
  const dependencies = {
    deriveRawReplaySummary: async (observedReport) => {
      assert.equal(observedReport.fixtureMarker, "canonical");
      return structuredClone(rawReplaySummary);
    },
    readArtifact: async (artifactPath) => {
      const bytes = artifacts.get(artifactPath);
      if (!bytes) throw new Error(`missing fixture artifact ${artifactPath}`);
      return Buffer.from(bytes);
    },
    readArtifactEvidence: async (artifactPath, options) =>
      artifactEvidence(artifactPath, options),
    validateFocusedReport: async (observedReport, observedPath) => {
      assert.equal(observedReport.fixtureMarker, "canonical");
      assert.equal(observedPath, paths.reportPath);
      return structuredClone(focusedSummary);
    },
  };
  return {
    artifacts,
    dependencies,
    envelope,
    focusedSummary,
    outerExit: { code: 0, signal: null },
    rawReplaySummary,
    report,
    prebuildReceipt,
    supervisor,
  };
}

test("parent invocation rejects inherited base-URL and web-server bypass evidence", () => {
  for (const name of ["PLAYWRIGHT_BASE_URL", "PLAYWRIGHT_SKIP_WEBSERVER"]) {
    assert.throws(
      () => assertNoInheritedMainlandFocusedServerOverrides({ [name]: "1" }),
      new RegExp(name, "u"),
    );
  }
  assert.doesNotThrow(() =>
    assertNoInheritedMainlandFocusedServerOverrides({
      PATH: "/usr/bin:/bin",
      PLAYWRIGHT_BASE_URL: "",
      PLAYWRIGHT_SKIP_WEBSERVER: "",
    })
  );
  assert.deepEqual(Object.keys(MAINLAND_FOCUSED_SUPERVISED_SOURCE_PATHS), [
    "canonicalCli",
    "cleanupGeneratedArtifacts",
    "nextCleanBuild",
    "nextConfig",
    "nextRuntime",
    "focusedValidator",
    "focusedValidatorTest",
    "g03Producer",
    "g04Producer",
    "g05Producer",
    "g06Producer",
    "globalSetup",
    "innerRunner",
    "nextEnv",
    "parentBinder",
    "parentBinderTest",
    "pathGate",
    "packageJson",
    "packageLock",
    "playwrightConfig",
    "prebuildTest",
    "strayGeneratedTypesGate",
    "supervisor",
    "supervisorTest",
    "tsconfig",
    "tsconfigNext",
    "typescriptRuntime",
  ]);
});

test("C5 freezes the approved runner, prebuild test, config, supervisor, supervisor test, and next-env inputs", () => {
  const expected = {
    innerRunner: "a54f85eef8dbac4a9ceb1f4b59218e3b249da6d67624b931a94a96589ccca407",
    nextEnv: "85ae5aee75f011967cf2d25cbc342f62d69314e9d925f7f4aa3456fc2cffcca6",
    playwrightConfig: "a4089612217e0f3dc2cb0629cbd765bdf86ce82266cc1826ab3bb815bf94760c",
    prebuildTest: "d012e24d6570080e56f88e53af1033031510e4ac74892e88b7e100b0acda6f79",
    supervisor: "80f517a83f250dc1ebc15170111b617ee7bdb63a617b7dc300921a5cf05f033d",
    supervisorTest: "67e5ce6707aa9572651a708c1957683b327e02ec4aeae19169657366ff39cc9b",
  };
  for (const [label, expectedSha256] of Object.entries(expected)) {
    const fileUrl = new URL(
      `../${MAINLAND_FOCUSED_SUPERVISED_SOURCE_PATHS[label]}`,
      import.meta.url,
    );
    assert.equal(digest(readFileSync(fileUrl)), expectedSha256, label);
  }
});

test("builder seals the exact focused invocation, paths, port, and raw source hashes", async () => {
  const built = await buildMainlandFocusedSupervisedReleaseInvocation({
    baseEnvironment: { PATH: "/usr/bin:/bin" },
    intendedPort,
    repositoryRoot,
    runId,
  }, { readArtifact: readFixtureArtifact });

  assert.equal(built.command, process.execPath);
  assert.equal(built.cwd, repositoryRoot);
  assert.equal(built.environment.PLAYWRIGHT_PORT, String(intendedPort));
  assert.equal(Object.hasOwn(built.environment, "PLAYWRIGHT_BASE_URL"), false);
  assert.equal(Object.hasOwn(built.environment, "PLAYWRIGHT_SKIP_WEBSERVER"), false);
  const plannedEnvironmentEntries = [
    ["PATH", "/usr/bin:/bin"],
    ["PLAYWRIGHT_PORT", String(intendedPort)],
  ];
  assert.deepEqual(built.evidence.plannedOuterEnvironment, {
    names: plannedEnvironmentEntries.map(([name]) => name),
    sha256: digest(Buffer.from(JSON.stringify(plannedEnvironmentEntries), "utf8")),
    valueCount: plannedEnvironmentEntries.length,
  });
  assert.deepEqual(built.evidence.innerArgs, [
    "test",
    "tests/e2e/china-mainland-g03-signed-real-production.spec.ts",
    "tests/e2e/china-mainland-g04-fraction-operations-production.spec.ts",
    "tests/e2e/china-mainland-g05-percent-applications-production.spec.ts",
    "tests/e2e/china-mainland-g06-ratio-proportion-scale-production.spec.ts",
    "--workers=1",
    "--retries=0",
    "--reporter=list,json",
  ]);
  assert.deepEqual(built.evidence.forbiddenInheritedEnvironment, {
    PLAYWRIGHT_BASE_URL: null,
    PLAYWRIGHT_SKIP_WEBSERVER: null,
  });
  assert.equal(built.evidence.paths.reportPath,
    `${repositoryRoot}/.tmp/e2e-run-${runId}/playwright-report.json`);
  assert.equal(built.evidence.paths.supervisorReceiptPath,
    `${repositoryRoot}/.tmp/starship-playwright-supervisor-${runId}/supervisor-terminal-receipt.json`);
  assert.equal(built.evidence.paths.signalJournalPath,
    `${repositoryRoot}/.tmp/starship-playwright-supervisor-${runId}/delivered-signals.jsonl`);
  assert.equal(built.evidence.paths.parentReceiptPath,
    `${repositoryRoot}/.tmp/starship-playwright-supervisor-${runId}/mainland-focused-final-release-receipt.json`);
  assert.equal(built.evidence.paths.prebuildReceiptPath,
    `${repositoryRoot}/.tmp/e2e-run-${runId}/evidence/next-env-prebuild-receipt.json`);
  assert.deepEqual(Object.keys(built.evidence.sourceSha256),
    Object.keys(MAINLAND_FOCUSED_SUPERVISED_SOURCE_PATHS));
  assert.ok(Object.values(built.evidence.sourceSha256)
    .every((digest) => /^[0-9a-f]{64}$/u.test(digest)));
  assert.deepEqual(built.args, [
    `${repositoryRoot}/scripts/run-starship-playwright-supervised.mjs`,
    "--repository-root",
    repositoryRoot,
    "--inner-runner",
    `${repositoryRoot}/scripts/run-starship-playwright.mjs`,
    "--run-id",
    runId,
    "--",
    ...built.evidence.innerArgs,
  ]);
});

test("public validator joins evidence without granting final release authority", async () => {
  const fixture = await positiveFixture();
  const receipt = await validateMainlandFocusedSupervisedRelease(
    fixture.envelope,
    fixture.outerExit,
    fixture.dependencies,
  );

  assert.equal(receipt.contract, "mainland-focused-supervised-release-receipt-v1");
  assert.equal(receipt.schemaVersion, 1);
  assert.equal(receipt.status, "blocked");
  assert.equal(receipt.releaseReady, false);
  assert.equal(receipt.runId, runId);
  assert.equal(receipt.intendedPort, intendedPort);
  assert.equal(receipt.focusedValidator.status, "inner-report-passed");
  assert.equal(receipt.focusedValidator.releaseReady, false);
  assert.equal(receipt.focusedValidator.executionCount, 92);
  assert.equal(receipt.focusedValidator.stateReceiptCount, 2_646);
  assert.equal(receipt.focusedValidator.groupCount, 4);
  assert.deepEqual(receipt.focusedValidator.projects, ["desktop-chrome", "mobile-chrome"]);
  assert.equal(receipt.focusedValidator.rawReplayIncludedCount, 14);
  assert.deepEqual(receipt.runtimeSourceExecutionHold, {
    releaseReady: false,
    requiredEvidence: "held descriptor identities for every fixed runtime source continuously spanning Playwright/config/spec/helper load through child exit",
    serializedEvidencePresent: false,
    status: "blocked-missing-full-run-runtime-source-hold",
  });
  assert.equal(receipt.artifacts.report.sha256,
    digest(fixture.artifacts.get(fixture.envelope.paths.reportPath)));
  assert.equal(receipt.artifacts.supervisorReceipt.sha256,
    digest(fixture.artifacts.get(fixture.envelope.paths.supervisorReceiptPath)));
  assert.equal(receipt.artifacts.signalJournal.sha256, digest(Buffer.alloc(0)));
  assert.equal(receipt.prebuild.contract, "starship-playwright-prebuild-v1");
  assert.equal(receipt.prebuild.receipt.path, fixture.envelope.paths.prebuildReceiptPath);
  assert.equal(receipt.prebuild.receipt.sha256,
    digest(fixture.artifacts.get(fixture.envelope.paths.prebuildReceiptPath)));
  assert.deepEqual(receipt.prebuild.runner, {
    pid: 31_001,
    startToken: "Wed Aug 20 00:00:01 2026",
  });
  assert.equal(receipt.prebuild.runtimeSources.length, 13);
  assert.deepEqual(Object.keys(receipt.prebuild.buildOutputs), [
    "buildId",
    "requiredServerFiles",
    "buildManifest",
  ]);
  assert.deepEqual(receipt.prebuild.heldFileDispositionEvidence, {
    cleanupClaimed: false,
    reason: "the inner runner does not serialize receipt/path results for its two hidden .disposed-* quarantines",
    receiptCount: 0,
    status: "not-serialized-by-inner-runner",
  });
  assert.equal(receipt.server.baseURL, `http://127.0.0.1:${intendedPort}`);
  assert.equal(receipt.server.commandOwnerPid, 41_002);
  assert.equal(receipt.server.ownerBoundToSupervisor, true);
  assert.deepEqual(receipt.server.commandOwnerBinding, {
    detachedProcessGroupId: 41_002,
    observedCommandSha256: "6".repeat(64),
    pgid: 41_002,
    preloadAckEventId: "preload-server-owner",
    registeredCommandSha256: "5".repeat(64),
    startToken: "Wed Aug 20 00:00:02 2026",
    status: "exact-preload-ack-command-transition-and-detached-group",
  });
  assert.equal(Object.isFrozen(receipt), true);
  assert.equal(Object.isFrozen(receipt.focusedValidator), true);
});

test("transient config, producer, or helper mutate-load-restore remains release-blocked without a serialized full-run hold", async () => {
  for (const label of ["playwrightConfig", "g03Producer", "pathGate"]) {
    const fixture = await positiveFixture();
    const sourcePath = `${repositoryRoot}/${MAINLAND_FOCUSED_SUPERVISED_SOURCE_PATHS[label]}`;
    const original = Buffer.from(fixture.artifacts.get(sourcePath));
    let transientWasLoaded = false;
    const validateFocusedReport = fixture.dependencies.validateFocusedReport;
    fixture.dependencies.validateFocusedReport = async (...args) => {
      fixture.artifacts.set(sourcePath, Buffer.from(`transient-loaded-${label}\n`, "utf8"));
      transientWasLoaded = fixture.artifacts.get(sourcePath).toString("utf8") ===
        `transient-loaded-${label}\n`;
      fixture.artifacts.set(sourcePath, original);
      return validateFocusedReport(...args);
    };

    const receipt = await validateMainlandFocusedSupervisedRelease(
      fixture.envelope,
      fixture.outerExit,
      fixture.dependencies,
    );
    assert.equal(transientWasLoaded, true, label);
    assert.equal(receipt.releaseReady, false, label);
    assert.equal(receipt.status, "blocked", label);
    assert.equal(
      receipt.runtimeSourceExecutionHold.status,
      "blocked-missing-full-run-runtime-source-hold",
      label,
    );
  }
});

test("native final authority contains no releaseReady true path until full-run source-hold evidence is serialized", () => {
  const source = readFileSync(
    new URL("./validate-mainland-focused-supervised-release.mjs", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(source, /releaseReady:\s*true/u);
  assert.match(source, /blocked-missing-full-run-runtime-source-hold/u);
});

test("mutation rejects a nonzero or signaled outer supervisor exit", async () => {
  for (const outerExit of [
    { code: 1, signal: null },
    { code: null, signal: "SIGTERM" },
  ]) {
    const fixture = await positiveFixture();
    await assert.rejects(
      validateMainlandFocusedSupervisedRelease(
        fixture.envelope,
        outerExit,
        fixture.dependencies,
      ),
      /outer supervisor exit was not code 0\/no signal/u,
    );
  }
});

test("same-process executor ignores forged green exit input and never writes after its actual outer failure", async () => {
  for (const actualOutcome of [
    { code: 7, signal: null },
    { code: null, signal: "SIGTERM" },
  ]) {
    const fixture = await positiveFixture();
    let writeCount = 0;
    await assert.rejects(
      executeMainlandFocusedSupervisedReleaseForUntrustedTestOnly(
        {
          baseEnvironment: { PATH: "/usr/bin:/bin" },
          intendedPort,
          outerExit: { code: 0, signal: null },
          repositoryRoot,
          runId,
        },
        {
          ...fixture.dependencies,
          spawnOuter: (command, args, options) => {
            assert.equal(command, process.execPath);
            assert.deepEqual(args, [
              `${repositoryRoot}/scripts/run-starship-playwright-supervised.mjs`,
              "--repository-root",
              repositoryRoot,
              "--inner-runner",
              `${repositoryRoot}/scripts/run-starship-playwright.mjs`,
              "--run-id",
              runId,
              "--",
              ...fixture.envelope.innerArgs,
            ]);
            assert.equal(options.cwd, repositoryRoot);
            assert.equal(options.env.PLAYWRIGHT_PORT, String(intendedPort));
            const child = new EventEmitter();
            child.pid = 52_001;
            queueMicrotask(() => child.emit(
              "exit",
              actualOutcome.code,
              actualOutcome.signal,
            ));
            return child;
          },
          writeReceipt: async () => {
            writeCount += 1;
            throw new Error("must not write");
          },
        },
      ),
      /same-process outer supervisor exit was not code 0\/no signal/u,
    );
    assert.equal(writeCount, 0);
  }
});

test("same-process executor rejects spawn environment drift from its attested plan", async () => {
  const fixture = await positiveFixture();
  let spawnCount = 0;
  let writeCount = 0;
  await assert.rejects(
    executeMainlandFocusedSupervisedReleaseForUntrustedTestOnly(
      {
        baseEnvironment: { PATH: "/usr/bin:/bin" },
        intendedPort,
        repositoryRoot,
        runId,
      },
      {
        ...fixture.dependencies,
        prepareSpawnOptions: (options) => ({
          ...options,
          env: { ...options.env, FOREIGN_ENVIRONMENT_ENTRY: "drift" },
        }),
        spawnOuter: () => {
          spawnCount += 1;
          const child = new EventEmitter();
          child.pid = 52_003;
          queueMicrotask(() => child.emit("exit", 0, null));
          return child;
        },
        writeReceipt: async () => {
          writeCount += 1;
          throw new Error("must not write");
        },
      },
    ),
    /outer supervisor spawn environment drifted from the exact planned digest\/value count/u,
  );
  assert.equal(spawnCount, 0);
  assert.equal(writeCount, 0);
});

test("public native executor rejects a second injected seam bag without invoking it", async () => {
  let injectedCallCount = 0;
  const injected = Object.fromEntries([
    "deriveRawReplaySummary",
    "prepareSpawnOptions",
    "readArtifact",
    "readArtifactEvidence",
    "readNativeExactFileEvidenceForUntrustedTestOnly",
    "spawnOuter",
    "validateFocusedReport",
    "writeImmutableReceiptProbeForUntrustedTestOnly",
    "writeReceipt",
  ].map((name) => [name, () => {
    injectedCallCount += 1;
    throw new Error(`must not invoke ${name}`);
  }]));

  await assert.rejects(
    executeMainlandFocusedSupervisedRelease(
      {
        baseEnvironment: { PATH: "/usr/bin:/bin" },
        intendedPort,
        repositoryRoot,
        runId,
      },
      injected,
    ),
    (error) => {
      assert.match(error.message, /injected-untrusted-test-seam/u);
      assert.equal(error.status, "injected-untrusted-test-seam");
      assert.equal(error.releaseReady, false);
      return true;
    },
  );
  assert.equal(injectedCallCount, 0);
});

test("public native executor rejects injected seam names smuggled inside options", async () => {
  for (const name of [
    "deriveRawReplaySummary",
    "prepareSpawnOptions",
    "readArtifact",
    "readArtifactEvidence",
    "readNativeExactFileEvidenceForUntrustedTestOnly",
    "spawnOuter",
    "validateFocusedReport",
    "writeImmutableReceiptProbeForUntrustedTestOnly",
    "writeReceipt",
  ]) {
    let invoked = false;
    await assert.rejects(
      executeMainlandFocusedSupervisedRelease({
        baseEnvironment: { PATH: "/usr/bin:/bin" },
        intendedPort,
        repositoryRoot,
        runId,
        [name]: () => { invoked = true; },
      }),
      (error) => {
        assert.match(error.message, /injected-untrusted-test-seam/u);
        assert.equal(error.status, "injected-untrusted-test-seam");
        assert.equal(error.releaseReady, false);
        return true;
      },
    );
    assert.equal(invoked, false, name);
  }
});

test("outer supervisor spawn options reject shell, detached, uid, gid, or argv0 extras", async () => {
  for (const [name, value] of [
    ["shell", true],
    ["detached", true],
    ["uid", 501],
    ["gid", 20],
    ["argv0", "forged-supervisor"],
  ]) {
    const fixture = await positiveFixture();
    let spawnCount = 0;
    await assert.rejects(
      executeMainlandFocusedSupervisedReleaseForUntrustedTestOnly(
        {
          baseEnvironment: { PATH: "/usr/bin:/bin" },
          intendedPort,
          repositoryRoot,
          runId,
        },
        {
          ...fixture.dependencies,
          prepareSpawnOptions: (options) => ({ ...options, [name]: value }),
          spawnOuter: () => {
            spawnCount += 1;
            const child = new EventEmitter();
            child.pid = 52_004;
            queueMicrotask(() => child.emit("exit", 0, null));
            return child;
          },
        },
      ),
      /outer supervisor spawn options keys drifted from exact cwd\/env\/stdio/u,
    );
    assert.equal(spawnCount, 0, name);
  }
});

test("CLI rejects the legacy caller-authored invocation-envelope and outer-exit files", () => {
  const result = spawnSync(process.execPath, [
    new URL("./validate-mainland-focused-supervised-release.mjs", import.meta.url).pathname,
    "/Volumes/Starship/forged-invocation.json",
    "/Volumes/Starship/forged-outer-exit.json",
  ], {
    encoding: "utf8",
    env: { PATH: process.env.PATH },
  });

  assert.notEqual(result.status, 0);
  assert.match(
    result.stderr,
    /does not accept caller-authored invocation or outer-exit JSON/u,
  );
});

test("mutation rejects incomplete supervisor cleanup", async () => {
  const fixture = await positiveFixture();
  const receiptPath = fixture.envelope.paths.supervisorReceiptPath;
  const receipt = JSON.parse(fixture.artifacts.get(receiptPath).toString("utf8"));
  receipt.cleanup.complete = false;
  fixture.artifacts.set(receiptPath, Buffer.from(`${JSON.stringify(receipt)}\n`, "utf8"));

  await assert.rejects(
    validateMainlandFocusedSupervisedRelease(
      fixture.envelope,
      fixture.outerExit,
      fixture.dependencies,
    ),
    /cleanup\/owned universe\/process groups are not proven terminally empty/u,
  );
});

test("mutation rejects forged Playwright report bytes before promotion", async () => {
  const fixture = await positiveFixture();
  const reportPath = fixture.envelope.paths.reportPath;
  const forged = JSON.parse(fixture.artifacts.get(reportPath).toString("utf8"));
  forged.fixtureMarker = "forged";
  fixture.artifacts.set(reportPath, Buffer.from(`${JSON.stringify(forged)}\n`, "utf8"));

  await assert.rejects(
    validateMainlandFocusedSupervisedRelease(
      fixture.envelope,
      fixture.outerExit,
      fixture.dependencies,
    ),
    /canonical/u,
  );
});

test("mutation rejects wrong focused-validator execution/state/group/project counts", async () => {
  for (const mutate of [
    (summary) => { summary.executionCount = 91; },
    (summary) => { summary.stateReceiptCount = 2_645; },
    (summary) => { summary.groupCount = 3; },
    (summary) => { summary.projects = ["mobile-chrome", "desktop-chrome"]; },
  ]) {
    const fixture = await positiveFixture();
    mutate(fixture.focusedSummary);
    await assert.rejects(
      validateMainlandFocusedSupervisedRelease(
        fixture.envelope,
        fixture.outerExit,
        fixture.dependencies,
      ),
      /exact inner-report-passed 92\/2646\/4\/desktop-mobile contract/u,
    );
  }
});

test("mutation independently kills rawReplayIncludedCount other than exact 14", async () => {
  for (const mutate of [
    (summary) => { summary.includedCount = 13; summary.representativeCaseIds.pop(); },
    (summary) => { summary.countsByGroup.G04 = 4; },
    (summary) => { summary.executionCount = 91; },
  ]) {
    const fixture = await positiveFixture();
    mutate(fixture.rawReplaySummary);
    await assert.rejects(
      validateMainlandFocusedSupervisedRelease(
        fixture.envelope,
        fixture.outerExit,
        fixture.dependencies,
      ),
      /rawReplayIncludedCount=14 across 92 executions/u,
    );
  }
});

test("mutation rejects wrong parent runId or exact artifact path", async () => {
  for (const mutate of [
    (envelope) => { envelope.runId = "different-run"; },
    (envelope) => { envelope.paths.reportPath = `${repositoryRoot}/.tmp/foreign/report.json`; },
  ]) {
    const fixture = await positiveFixture();
    mutate(fixture.envelope);
    await assert.rejects(
      validateMainlandFocusedSupervisedRelease(
        fixture.envelope,
        fixture.outerExit,
        fixture.dependencies,
      ),
      /runId\/path set drifted/u,
    );
  }
});

test("mutation rejects fixed-source raw-byte drift after invocation capture", async () => {
  const fixture = await positiveFixture();
  const sourcePath = `${repositoryRoot}/${MAINLAND_FOCUSED_SUPERVISED_SOURCE_PATHS.globalSetup}`;
  fixture.artifacts.set(sourcePath, Buffer.from("drifted global setup\n", "utf8"));

  await assert.rejects(
    validateMainlandFocusedSupervisedRelease(
      fixture.envelope,
      fixture.outerExit,
      fixture.dependencies,
    ),
    /fixed source drifted after parent invocation: globalSetup/u,
  );
});

test("mutation independently rejects parent binder or binder-test drift after capture", async () => {
  for (const label of ["parentBinder", "parentBinderTest"]) {
    const fixture = await positiveFixture();
    const sourcePath = `${repositoryRoot}/${MAINLAND_FOCUSED_SUPERVISED_SOURCE_PATHS[label]}`;
    fixture.artifacts.set(sourcePath, Buffer.from(`drifted ${label}\n`, "utf8"));

    await assert.rejects(
      validateMainlandFocusedSupervisedRelease(
        fixture.envelope,
        fixture.outerExit,
        fixture.dependencies,
      ),
      new RegExp(`fixed source drifted after parent invocation: ${label}`, "u"),
    );
  }
});

test("mutation rejects a missing or stale deterministic prebuild receipt", async () => {
  {
    const fixture = await positiveFixture();
    fixture.artifacts.delete(fixture.envelope.paths.prebuildReceiptPath);
    await assert.rejects(
      validateMainlandFocusedSupervisedRelease(
        fixture.envelope,
        fixture.outerExit,
        fixture.dependencies,
      ),
      /missing fixture artifact .*next-env-prebuild-receipt\.json/u,
    );
  }
  {
    const fixture = await positiveFixture();
    replaceJsonArtifact(
      fixture.artifacts,
      fixture.envelope.paths.prebuildReceiptPath,
      (receipt) => { receipt.completedAt = "2026-08-19T23:59:59.999Z"; },
    );
    await assert.rejects(
      validateMainlandFocusedSupervisedRelease(
        fixture.envelope,
        fixture.outerExit,
        fixture.dependencies,
      ),
      /prebuild receipt completion is stale or outside the exact supervisor interval/u,
    );
  }
});

test("mutation rejects stale prebuild runtime-source receipts and live source drift", async () => {
  {
    const fixture = await positiveFixture();
    replaceJsonArtifact(
      fixture.artifacts,
      fixture.envelope.paths.prebuildReceiptPath,
      (receipt) => { receipt.runtimeSources[5].after.inode = "999999"; },
    );
    await assert.rejects(
      validateMainlandFocusedSupervisedRelease(
        fixture.envelope,
        fixture.outerExit,
        fixture.dependencies,
      ),
      /prebuild runtime-source held descriptor drifted for playwrightConfig/u,
    );
  }
  for (const label of ["innerRunner", "playwrightConfig", "supervisor"]) {
    const fixture = await positiveFixture();
    const sourcePath = `${repositoryRoot}/${MAINLAND_FOCUSED_SUPERVISED_SOURCE_PATHS[label]}`;
    fixture.artifacts.set(sourcePath, Buffer.from(`post-capture drift ${label}\n`, "utf8"));
    await assert.rejects(
      validateMainlandFocusedSupervisedRelease(
        fixture.envelope,
        fixture.outerExit,
        fixture.dependencies,
      ),
      new RegExp(`fixed source drifted after parent invocation: ${label}`, "u"),
    );
  }
});

test("mutation rejects foreign prebuild build-output path, identity, or live bytes", async () => {
  for (const mutate of [
    (receipt) => { receipt.buildOutputs.buildId.path = `${repositoryRoot}/foreign/BUILD_ID`; },
    (receipt) => { receipt.buildOutputs.requiredServerFiles.device = "999999"; },
  ]) {
    const fixture = await positiveFixture();
    replaceJsonArtifact(
      fixture.artifacts,
      fixture.envelope.paths.prebuildReceiptPath,
      mutate,
    );
    await assert.rejects(
      validateMainlandFocusedSupervisedRelease(
        fixture.envelope,
        fixture.outerExit,
        fixture.dependencies,
      ),
      /prebuild .*?(?:path\/type\/identity\/mode\/size is invalid|build output path\/identity\/bytes drifted)/u,
    );
  }
  {
    const fixture = await positiveFixture();
    const outputPath = fixture.prebuildReceipt.buildOutputs.buildManifest.path;
    fixture.artifacts.set(outputPath, Buffer.from('{"drifted":true}\n', "utf8"));
    await assert.rejects(
      validateMainlandFocusedSupervisedRelease(
        fixture.envelope,
        fixture.outerExit,
        fixture.dependencies,
      ),
      /live prebuild build output path\/identity\/bytes drifted: buildManifest/u,
    );
  }
});

test("mutation rejects foreign runner PID, start token, registry binding, and terminal source identity", async () => {
  for (const mutate of [
    (prebuild) => { prebuild.runner.pid = 31_002; },
    (prebuild) => { prebuild.runner.startToken = "foreign-start-token"; },
  ]) {
    const fixture = await positiveFixture();
    replaceJsonArtifact(
      fixture.artifacts,
      fixture.envelope.paths.prebuildReceiptPath,
      mutate,
    );
    await assert.rejects(
      validateMainlandFocusedSupervisedRelease(
        fixture.envelope,
        fixture.outerExit,
        fixture.dependencies,
      ),
      /prebuild runner PID\/start token is foreign/u,
    );
  }
  for (const mutate of [
    (receipt) => { receipt.registry.preloadAcks[0].runnerSha256 = "9".repeat(64); },
    (receipt) => { receipt.runner.after.path = `${repositoryRoot}/foreign-runner.mjs`; },
    (receipt) => { receipt.supervisor.after.ctimeNs = "999999"; },
  ]) {
    const fixture = await positiveFixture();
    replaceJsonArtifact(
      fixture.artifacts,
      fixture.envelope.paths.supervisorReceiptPath,
      mutate,
    );
    await assert.rejects(
      validateMainlandFocusedSupervisedRelease(
        fixture.envelope,
        fixture.outerExit,
        fixture.dependencies,
      ),
      /(?:prebuild runner PID\/start token is foreign|supervisor runner after path\/type\/identity\/mode\/size is invalid|runner or supervisor source path identity drifted)/u,
    );
  }
});

test("mutation rejects the stale approved C3 parent binder and binder-test hashes", async () => {
  for (const [label, staleSha256] of [
    ["parentBinder", "5e5842932cbf8aaaf213a9f9e9fa4ba492f9a21e1b8620fbaa7f8a52a4c833d6"],
    ["parentBinderTest", "257c3a101ea0e6951f3e7c750ba11336ed13160150700676929e049ddc000efa"],
  ]) {
    const fixture = await positiveFixture();
    fixture.envelope.sourceSha256[label] = staleSha256;
    await assert.rejects(
      validateMainlandFocusedSupervisedRelease(
        fixture.envelope,
        fixture.outerExit,
        fixture.dependencies,
      ),
      new RegExp(`fixed source drifted after parent invocation: ${label}`, "u"),
    );
  }
});

test("mutation rejects stale or foreign baseURL and managed-server owner evidence", async () => {
  {
    const fixture = await positiveFixture();
    const reportPath = fixture.envelope.paths.reportPath;
    const report = JSON.parse(fixture.artifacts.get(reportPath).toString("utf8"));
    report.config.projects[0].use.baseURL = "http://127.0.0.1:3000";
    fixture.artifacts.set(reportPath, Buffer.from(`${JSON.stringify(report)}\n`, "utf8"));
    await assert.rejects(
      validateMainlandFocusedSupervisedRelease(
        fixture.envelope,
        fixture.outerExit,
        fixture.dependencies,
      ),
      /focused report baseURL\/project evidence is not exact/u,
    );
  }
  for (const ownerPidText of ["99999", "31001"]) {
    const fixture = await positiveFixture();
    fixture.artifacts.set(
      fixture.envelope.paths.serverCommandOwnerPidPath,
      Buffer.from(`${ownerPidText}\n`, "utf8"),
    );
    await assert.rejects(
      validateMainlandFocusedSupervisedRelease(
        fixture.envelope,
        fixture.outerExit,
        fixture.dependencies,
      ),
      /command-owner PID lacks its exact preload ACK\/start token\/PGID\/command transition\/recorded detached-group binding/u,
    );
  }
});

test("mutation rejects incomplete or duplicated exact server-owner provenance", async () => {
  for (const mutate of [
    (receipt) => { receipt.registry.preloadAcks[1].startToken = "foreign-start"; },
    (receipt) => { receipt.registry.commandTransitions[0].registeredCommandSha256 = "7".repeat(64); },
    (receipt) => { receipt.registry.recordedProcessGroups = []; },
    (receipt) => { receipt.cleanup.detachedProcessGroupTermination[0].processGroupId = 31_001; },
    (receipt) => { receipt.registry.preloadAcks.push(structuredClone(receipt.registry.preloadAcks[1])); },
  ]) {
    const fixture = await positiveFixture();
    replaceJsonArtifact(
      fixture.artifacts,
      fixture.envelope.paths.supervisorReceiptPath,
      mutate,
    );
    await assert.rejects(
      validateMainlandFocusedSupervisedRelease(
        fixture.envelope,
        fixture.outerExit,
        fixture.dependencies,
      ),
      /command-owner PID lacks its exact preload ACK\/start token\/PGID\/command transition\/recorded detached-group binding/u,
    );
  }
});

test("mutation rejects live signal-journal drift after outer exit", async () => {
  const fixture = await positiveFixture();
  fixture.artifacts.set(
    fixture.envelope.paths.signalJournalPath,
    Buffer.from('{"signal":"SIGTERM"}\n', "utf8"),
  );

  await assert.rejects(
    validateMainlandFocusedSupervisedRelease(
      fixture.envelope,
      fixture.outerExit,
      fixture.dependencies,
    ),
    /live signal journal drifted/u,
  );
});

test("every injected execution seam is untrusted and cannot write or return a final parent receipt", async () => {
  const fixture = await positiveFixture();
  const calls = {
    deriveRawReplaySummary: 0,
    prepareSpawnOptions: 0,
    readArtifact: 0,
    readArtifactEvidence: 0,
    spawnOuter: 0,
    validateFocusedReport: 0,
    writeReceipt: 0,
  };
  const result = await executeMainlandFocusedSupervisedReleaseForUntrustedTestOnly(
    {
      baseEnvironment: { PATH: "/usr/bin:/bin" },
      intendedPort,
      repositoryRoot,
      runId,
    },
    {
      ...fixture.dependencies,
      deriveRawReplaySummary: async (...args) => {
        calls.deriveRawReplaySummary += 1;
        return fixture.dependencies.deriveRawReplaySummary(...args);
      },
      prepareSpawnOptions: (options) => {
        calls.prepareSpawnOptions += 1;
        return options;
      },
      readArtifact: async (...args) => {
        calls.readArtifact += 1;
        return fixture.dependencies.readArtifact(...args);
      },
      readArtifactEvidence: async (...args) => {
        calls.readArtifactEvidence += 1;
        return fixture.dependencies.readArtifactEvidence(...args);
      },
      spawnOuter: (command, args, options) => {
        calls.spawnOuter += 1;
        const child = new EventEmitter();
        child.pid = 52_002;
        assert.equal(command, process.execPath);
        assert.deepEqual(args, [
          `${repositoryRoot}/scripts/run-starship-playwright-supervised.mjs`,
          "--repository-root",
          repositoryRoot,
          "--inner-runner",
          `${repositoryRoot}/scripts/run-starship-playwright.mjs`,
          "--run-id",
          runId,
          "--",
          ...fixture.envelope.innerArgs,
        ]);
        assert.equal(options.cwd, repositoryRoot);
        queueMicrotask(() => child.emit("exit", 0, null));
        return child;
      },
      validateFocusedReport: async (...args) => {
        calls.validateFocusedReport += 1;
        return fixture.dependencies.validateFocusedReport(...args);
      },
      writeReceipt: async () => {
        calls.writeReceipt += 1;
        throw new Error("untrusted seam must never reach the immutable writer");
      },
    },
  );

  assert.equal(result.status, "injected-untrusted-test-seam");
  assert.equal(result.releaseReady, false);
  assert.equal(result.validation.status, "blocked");
  assert.equal(result.validation.releaseReady, false);
  assert.equal(result.outerSupervisor.pid, 52_002);
  assert.deepEqual(result.outerSupervisor.outcome, {
    code: 0,
    signal: null,
    spawnError: null,
  });
  assert.deepEqual(result.outerSupervisor.argv, [
    process.execPath,
    ...result.outerSupervisor.args,
  ]);
  assert.match(result.outerSupervisor.environment.sha256, /^[0-9a-f]{64}$/u);
  assert.equal(result.outerSupervisor.environment.valueCount, 2);
  assert.deepEqual(result.outerSupervisor.environment.names, [
    "PATH",
    "PLAYWRIGHT_PORT",
  ]);
  assert.deepEqual(calls, {
    deriveRawReplaySummary: 1,
    prepareSpawnOptions: 1,
    readArtifact: 61,
    readArtifactEvidence: 17,
    spawnOuter: 1,
    validateFocusedReport: 1,
    writeReceipt: 0,
  });
  assert.equal(Object.hasOwn(result, "artifact"), false);
  assert.equal(Object.hasOwn(result, "receipt"), false);
  assert.equal(JSON.stringify(result).includes("parentReceipt"), false);
  assert.equal(JSON.stringify(result).includes('"releaseReady":true'), false);
  assert.equal(Object.isFrozen(result), true);
});

test("mutation independently rejects BASE_URL/SKIP_WEBSERVER allowance or supervisor inheritance", async () => {
  for (const name of ["PLAYWRIGHT_BASE_URL", "PLAYWRIGHT_SKIP_WEBSERVER"]) {
    {
      const fixture = await positiveFixture();
      fixture.envelope.forbiddenInheritedEnvironment[name] = "allowed";
      await assert.rejects(
        validateMainlandFocusedSupervisedRelease(
          fixture.envelope,
          fixture.outerExit,
          fixture.dependencies,
        ),
        /does not prove inherited PLAYWRIGHT_BASE_URL\/PLAYWRIGHT_SKIP_WEBSERVER absence/u,
      );
    }
    {
      const fixture = await positiveFixture();
      const receiptPath = fixture.envelope.paths.supervisorReceiptPath;
      const receipt = JSON.parse(fixture.artifacts.get(receiptPath).toString("utf8"));
      receipt.child.environment.names.push(name);
      fixture.artifacts.set(receiptPath, Buffer.from(`${JSON.stringify(receipt)}\n`, "utf8"));
      await assert.rejects(
        validateMainlandFocusedSupervisedRelease(
          fixture.envelope,
          fixture.outerExit,
          fixture.dependencies,
        ),
        /forbidden override absence/u,
      );
    }
  }
});

test("mutation rejects malformed or incomplete observed supervisor child environment receipts", async () => {
  for (const mutate of [
    (environment) => { environment.sha256 = "not-a-digest"; },
    (environment) => { environment.valueCount -= 1; },
    (environment) => {
      environment.names = environment.names.filter(
        (name) => name !== "STARSHIP_SUPERVISOR_RUN_NONCE",
      );
      environment.valueCount = environment.names.length;
    },
  ]) {
    const fixture = await positiveFixture();
    const receiptPath = fixture.envelope.paths.supervisorReceiptPath;
    const receipt = JSON.parse(fixture.artifacts.get(receiptPath).toString("utf8"));
    mutate(receipt.child.environment);
    fixture.artifacts.set(receiptPath, Buffer.from(`${JSON.stringify(receipt)}\n`, "utf8"));
    await assert.rejects(
      validateMainlandFocusedSupervisedRelease(
        fixture.envelope,
        fixture.outerExit,
        fixture.dependencies,
      ),
      /supervisor inner effective environment receipt/u,
    );
  }
});

test("producer-compatible report may omit project.use while the managed log binds baseURL", async () => {
  const fixture = await positiveFixture();
  const reportPath = fixture.envelope.paths.reportPath;
  const report = JSON.parse(fixture.artifacts.get(reportPath).toString("utf8"));
  for (const project of report.config.projects) delete project.use;
  fixture.artifacts.set(reportPath, Buffer.from(`${JSON.stringify(report)}\n`, "utf8"));

  const receipt = await validateMainlandFocusedSupervisedRelease(
    fixture.envelope,
    fixture.outerExit,
    fixture.dependencies,
  );
  assert.equal(receipt.server.baseURL, `http://127.0.0.1:${intendedPort}`);
  assert.equal(receipt.server.baseURLSources.managedWebServerLog, true);
  assert.equal(receipt.server.baseURLSources.reportProjectUse, false);
});
