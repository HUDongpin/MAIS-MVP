import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  closeSync,
  constants as fsConstants,
  fstatSync,
  lstatSync,
  openSync,
  readFileSync,
  readdirSync,
} from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  assertExactAuditLabSourceBindings,
  EXPECTED_AUDIT_LAB_PAIR_NAMES_SHA256,
  EXPECTED_AUDIT_LAB_SOURCE_SHA256,
} from "./signature-lab-source-bindings.mjs";
import { runExactBoundSignatureAudit } from "./signature-lab-execution-capsule.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, "..");
const signatureRoot = path.join(
  projectRoot,
  "components/visualizations/signature",
);
const virtualRoot = path.join(projectRoot, ".tmp");

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function stableRead(target, label) {
  const namedBefore = lstatSync(target, { bigint: true });
  assert.equal(namedBefore.isFile(), true, `${label}: expected a regular file`);
  assert.equal(namedBefore.isSymbolicLink(), false, `${label}: rejected symlink`);
  assert.equal(namedBefore.nlink, 1n, `${label}: expected singleton source`);
  const descriptor = openSync(
    target,
    fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW,
  );
  try {
    const openedBefore = fstatSync(descriptor, { bigint: true });
    for (const field of ["dev", "ino", "nlink", "size", "mtimeNs", "ctimeNs"]) {
      assert.equal(openedBefore[field], namedBefore[field], `${label}: ${field} drift`);
    }
    const bytes = readFileSync(descriptor);
    const openedAfter = fstatSync(descriptor, { bigint: true });
    const namedAfter = lstatSync(target, { bigint: true });
    for (const field of ["dev", "ino", "nlink", "size", "mtimeNs", "ctimeNs"]) {
      assert.equal(openedAfter[field], openedBefore[field],
        `${label}: opened ${field} drift`);
      assert.equal(namedAfter[field], openedBefore[field],
        `${label}: named ${field} drift`);
    }
    return Object.freeze({
      bytes,
      identity: openedBefore,
      path: target,
      sha256: sha256(bytes),
    });
  } finally {
    closeSync(descriptor);
  }
}

function assertHeldIdentity(descriptor, record, label) {
  const current = fstatSync(descriptor, { bigint: true });
  for (const field of ["dev", "ino", "nlink", "size", "mtimeNs", "ctimeNs"]) {
    assert.equal(current[field], record.identity[field], `${label}: held ${field} drift`);
  }
}

test("all 192 signature math audits execute from exact bound audit and Lab descriptors", () => {
  const names = readdirSync(signatureRoot).sort();
  const audits = names.filter((name) =>
    name.startsWith("audit-") && name.endsWith(".mjs"));
  const labs = names.filter((name) => name.endsWith("Lab.jsx"));
  assert.equal(audits.length, 192);
  assert.equal(labs.length, 192);
  const records = new Map([...audits, ...labs].map((name) => [
    name,
    stableRead(path.join(signatureRoot, name), name),
  ]));
  const pairs = assertExactAuditLabSourceBindings(audits, labs, records);
  assert.equal(pairs.length, 192);
  assert.equal(typeof EXPECTED_AUDIT_LAB_PAIR_NAMES_SHA256, "string");
  assert.equal(typeof EXPECTED_AUDIT_LAB_SOURCE_SHA256, "string");

  const environment = Object.freeze({
    FORCE_COLOR: "0",
    LANG: "C",
    LC_ALL: "C",
    NODE_DISABLE_COMPILE_CACHE: "1",
    NO_COLOR: "1",
    PATH: "/usr/local/bin:/usr/bin:/bin",
    TSX_DISABLE_CACHE: "1",
  });
  for (const pair of pairs) {
    const auditRecord = records.get(pair.audit);
    const labRecord = records.get(pair.lab);
    const auditVirtualPath = path.join(virtualRoot, pair.audit);
    const labVirtualPath = path.join(virtualRoot, pair.lab);
    for (const target of [auditVirtualPath, labVirtualPath]) {
      assert.throws(
        () => lstatSync(target),
        (error) => error?.code === "ENOENT",
        `${target}: virtual capsule input must remain absent`,
      );
    }
    const auditFd = openSync(
      auditRecord.path,
      fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW,
    );
    const labFd = openSync(
      labRecord.path,
      fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW,
    );
    try {
      assertHeldIdentity(auditFd, auditRecord, pair.audit);
      assertHeldIdentity(labFd, labRecord, pair.lab);
      const execution = runExactBoundSignatureAudit({
        nodePath: process.execPath,
        auditFd,
        labFd,
        auditVirtualPath,
        labVirtualPath,
        expectedLabRead: /\b(?:readFileSync|readFile)\s*\(/u.test(
          auditRecord.bytes.toString("utf8"),
        ),
        expectedAuditSha256: auditRecord.sha256,
        expectedLabSha256: labRecord.sha256,
        cwd: virtualRoot,
        environment,
      });
      assertHeldIdentity(auditFd, auditRecord, `${pair.audit} after execution`);
      assertHeldIdentity(labFd, labRecord, `${pair.lab} after execution`);
      assert.equal(execution.error, undefined, `${pair.audit}: spawn error`);
      assert.equal(execution.signal, null, `${pair.audit}: unexpected signal`);
      assert.equal(
        execution.status,
        0,
        `${pair.audit}: capsule failed\n${execution.stdout.toString("utf8")}\n${
          execution.stderr.toString("utf8")
        }`,
      );
    } finally {
      closeSync(auditFd);
      closeSync(labFd);
    }
  }
  for (const name of [...audits, ...labs]) {
    assert.throws(
      () => lstatSync(path.join(virtualRoot, name)),
      (error) => error?.code === "ENOENT",
      `${name}: descriptor capsule materialized a virtual source path`,
    );
  }
});
