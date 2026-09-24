import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildSeatbeltProfile,
  runIsolationMatrix,
  sanitizeIsolationEnvironment,
  validateIsolationReceipt,
  writeIsolationReceipt
} from "./isolation-harness.mjs";

const scriptDirectory = path.dirname(fileURLToPath(new URL(import.meta.url)));
const repositoryRoot = path.resolve(scriptDirectory, "../../..");
const candidateSetSha256 = "a".repeat(64);

test("sanitizes the role environment to an explicit non-secret allowlist", () => {
  const sanitized = sanitizeIsolationEnvironment({
    HOME: "/secret/home",
    OPENAI_API_KEY: "secret",
    DEEPSEEK_API_KEY: "secret",
    VERCEL_TOKEN: "secret",
    GITHUB_TOKEN: "secret",
    PATH: "/untrusted/bin"
  }, { roleId: "role-a", temporaryDirectory: "/tmp/role-a" });

  assert.deepEqual(Object.keys(sanitized).sort(), ["LANG", "LC_ALL", "MAIS_ROLE_ID", "NO_PROXY", "TMPDIR"].sort());
  assert.equal(sanitized.MAIS_ROLE_ID, "role-a");
  assert.equal(sanitized.TMPDIR, "/tmp/role-a");
  assert.equal(JSON.stringify(sanitized).includes("secret"), false);
});

test("Seatbelt profile is deny-default and grants only runtime, one input, and one outbox", () => {
  const profile = buildSeatbeltProfile({
    nodeExecutable: "/usr/local/bin/node",
    runtimeDirectory: "/private/tmp/runtime-a",
    inputPath: "/private/tmp/input-a.json",
    ownOutbox: "/private/tmp/outbox-a"
  });

  assert.match(profile, /\(deny default\)/);
  assert.match(profile, /\(import "system\.sb"\)/);
  assert.match(profile, /\(deny process-fork\)/);
  assert.match(profile, /\(allow process-exec\)/);
  assert.doesNotMatch(profile, /\(allow default\)/);
  assert.doesNotMatch(profile, /\(allow process\*\)/);
  for (const allowed of ["/usr/local/bin/node", "/private/tmp/runtime-a", "/private/tmp/input-a.json", "/private/tmp/outbox-a"]) {
    assert.match(profile, new RegExp(allowed.replaceAll("/", "\\/")));
  }
  assert.doesNotMatch(profile, /node_modules|\.git|protected|sibling/);
});

test("macOS deny-default matrix enforces same-UID read, write, chmod, sibling, repository, env, and network isolation", async (t) => {
  if (process.platform !== "darwin") return t.skip("Seatbelt integration proof is macOS-specific.");
  try {
    await access("/usr/bin/sandbox-exec");
  } catch {
    return t.skip("sandbox-exec is unavailable on this host.");
  }

  const receipt = await runIsolationMatrix({ repositoryRoot, roleIds: ["role-a", "role-b"], candidateSetSha256 });

  assert.equal(receipt.status, "isolation-probe-pass");
  assert.equal(receipt.enforcementMode, "macos-seatbelt-deny-default");
  assert.equal(receipt.browserEstimandExcluded, true);
  assert.equal(receipt.liveProviderAuthorized, false);
  assert.equal(receipt.productionAuthorized, false);
  assert.equal(receipt.formalExecutionAuthorized, false);
  assert.equal(receipt.candidateSetSha256, candidateSetSha256);
  assert.deepEqual(receipt.runtimeInventory, ["isolation-probe-worker.mjs"]);
  assert.equal(receipt.roles.length, 2);
  for (const role of receipt.roles) {
    assert.equal(role.inputReadAllowed, true);
    assert.equal(role.ownOutboxWriteAllowed, true);
    assert.equal(role.protectedCanaryReadDenied, true);
    assert.equal(role.protectedCanaryMetadataDenied, true);
    assert.equal(role.protectedSymlinkEscapeDenied, true);
    assert.equal(role.inputWriteDenied, true);
    assert.equal(role.inputChmodDenied, true);
    assert.equal(role.siblingOutboxWriteDenied, true);
    assert.equal(role.siblingSymlinkWriteDenied, true);
    assert.equal(role.repositoryReadDenied, true);
    assert.equal(role.networkDenied, true);
    assert.equal(role.credentialEnvironmentAbsent, true);
    assert.equal(role.childProcessSpawnDenied, true);
    assert.equal(role.inputSha256Before, role.inputSha256After);
    assert.equal(role.exitCode, 0);
  }
  assert.deepEqual(validateIsolationReceipt(receipt, { expectedRoleIds: ["role-a", "role-b"], candidateSetSha256 }), []);

  const outputDirectory = await mkdtemp(path.join(os.tmpdir(), "mais-isolation-receipt-"));
  t.after(() => rm(outputDirectory, { recursive: true, force: true }));
  const receiptPath = path.join(outputDirectory, "receipt.json");
  await writeIsolationReceipt(receiptPath, receipt, { expectedRoleIds: ["role-a", "role-b"], candidateSetSha256 });
  assert.deepEqual(JSON.parse(await readFile(receiptPath, "utf8")), receipt);
});

test("semantic validation rejects a re-signed isolation result with a relaxed invariant", async (t) => {
  if (process.platform !== "darwin") return t.skip("Seatbelt integration proof is macOS-specific.");
  try {
    await access("/usr/bin/sandbox-exec");
  } catch {
    return t.skip("sandbox-exec is unavailable on this host.");
  }
  const receipt = await runIsolationMatrix({ repositoryRoot, roleIds: ["role-a", "role-b"], candidateSetSha256 });
  receipt.roles[0].repositoryReadDenied = false;
  const { receiptSha256: _oldHash, ...body } = receipt;
  receipt.receiptSha256 = createHash("sha256").update(JSON.stringify(body)).digest("hex");

  const findings = validateIsolationReceipt(receipt, { expectedRoleIds: ["role-a", "role-b"], candidateSetSha256 });
  assert.ok(findings.some((row) => row.code === "isolation-invariant"));
});

test("isolation fails closed when the enforcement executable is unavailable", async () => {
  await assert.rejects(
    runIsolationMatrix({
      repositoryRoot,
      roleIds: ["role-a", "role-b"],
      candidateSetSha256,
      sandboxExecutable: "/definitely/not/a/sandbox-executable"
    }),
    /Seatbelt enforcement is unavailable/
  );
});

test("rejects path-like role IDs before creating role paths or invoking Seatbelt", async () => {
  await assert.rejects(
    runIsolationMatrix({
      repositoryRoot,
      roleIds: ["role-a", "../role-outbox-escape"],
      candidateSetSha256,
      sandboxExecutable: "/definitely/not/a/sandbox-executable"
    }),
    /role IDs must be opaque safe identifiers/
  );
});

test("receipt validation rejects path-like role identities even when topology and self-hash are re-signed", async () => {
  const candidateReceipt = JSON.parse(await readFile(path.join(scriptDirectory, "f2-r-isolation-receipt-candidate.json"), "utf8"));
  candidateReceipt.roles[0].roleId = "../role-outbox-escape";
  const expectedRoleIds = candidateReceipt.roles.map((row) => row.roleId);
  const { receiptSha256: _oldReceiptSha256, ...body } = candidateReceipt;
  candidateReceipt.receiptSha256 = createHash("sha256").update(JSON.stringify(body)).digest("hex");

  const findings = validateIsolationReceipt(candidateReceipt, {
    expectedRoleIds,
    candidateSetSha256: candidateReceipt.candidateSetSha256
  });
  assert.ok(findings.some((row) => row.code === "role-id-shape"));
});
