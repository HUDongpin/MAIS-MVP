import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";
import { promisify } from "node:util";

import { canonicalJson } from "./design-contract.mjs";

const execFileAsync = promisify(execFile);
const packageDirectory = new URL("./", import.meta.url);
const repositoryRoot = new URL("../../../../../", import.meta.url);
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const V2_REGISTRATION_HASH = "a1b7d7ac6cf23b059dddc015c75b876d26a3576f9e5e3e07724ef8c5b8429de8";
const V3_REGISTRATION_HASH = "08e89a4d0c6736b48c1dde0048d8f620c35fc486e1d1feaf272e30a1aae4973d";
const V3_REGISTRATION_BYTE_SHA256 = "3299e95244540942ad82f6a616ace4d64be3a74ff1ba78172aeb6a34088f7939";
const V3_PACKAGE_INVENTORY_ROOT = "0aa952f44ee0558b0b5054b04bb669951e63e7c63a74a5a68881e70a3a5da471";

async function listRelativeFiles(directory, prefix = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relative = `${prefix}${entry.name}`;
    const target = new URL(entry.isDirectory() ? `${entry.name}/` : entry.name, directory);
    if (entry.isDirectory()) files.push(...await listRelativeFiles(target, `${relative}/`));
    else if (entry.isFile()) files.push(relative);
  }
  return files.sort();
}

test("every committed V1 and V2 predecessor byte remains equal to its ea67cac golden hash", async () => {
  const ledger = JSON.parse(await readFile(new URL("./predecessor-golden-hashes.json", import.meta.url), "utf8"));
  assert.equal(ledger.capturedFromCommit, "ea67cac702c47b971666766ae13fe2a5494377f1");
  assert.equal(ledger.hashAlgorithm, "SHA-256");
  assert.equal(ledger.immutableFiles.length, 42);
  assert.equal(ledger.immutableFiles.some(({ path }) => path.endsWith("2026-08-24-A16-natural-ca60-registration-v1.md")), true);
  assert.equal(ledger.immutableFiles.some(({ path }) => path.endsWith("2026-08-25-A16-natural-ca60-design-v2.md")), true);
  for (const entry of ledger.immutableFiles) {
    const bytes = await readFile(new URL(entry.path, repositoryRoot));
    assert.equal(sha256(bytes), entry.sha256, entry.path);
  }
  assert.equal(ledger.mutablePointer.excludedFromImmutableSet, true);
  assert.equal(ledger.mutablePointer.predecessorSha256, "40623d7a21740ee4cae9a86ab1821bf4fe52c79d4cbe68a9e369a3eefaa2fb39");
});

test("git reports no V1 or V2 predecessor byte diff while allowing only the mutable active pointer", async () => {
  const ledger = JSON.parse(await readFile(new URL("./predecessor-golden-hashes.json", import.meta.url), "utf8"));
  const { stdout, stderr } = await execFileAsync("git", ["diff", "--exit-code", "HEAD", "--", ...ledger.immutableFiles.map(({ path }) => path)], {
    cwd: new URL(".", repositoryRoot),
    maxBuffer: 1024 * 1024,
  });
  assert.equal(stdout, "");
  assert.equal(stderr, "");
});

test("V4 freezes the exact immutable 45-file V3 predecessor inventory", async () => {
  const inventory = JSON.parse(await readFile(new URL("./predecessor-package-inventory-v3.json", import.meta.url), "utf8"));
  const v3Directory = new URL("../design-v3/", import.meta.url);
  const paths = await listRelativeFiles(v3Directory);
  const liveEntries = await Promise.all(paths.map(async (relativePath) => {
    const bytes = await readFile(new URL(relativePath, v3Directory));
    return { path: relativePath, byteLength: bytes.byteLength, sha256: sha256(bytes) };
  }));
  assert.equal(inventory.inventoryAlgorithm, "SHA256(UTF8(JCS(sorted[{path,byteLength,sha256}])))");
  assert.equal(inventory.fileCount, 45);
  assert.equal(paths.length, 45);
  assert.deepEqual(inventory.entries, liveEntries);
  assert.equal(inventory.registrationHash, V3_REGISTRATION_HASH);
  assert.equal(inventory.registrationByteSha256, V3_REGISTRATION_BYTE_SHA256);
  assert.equal(inventory.inventoryRootHash, sha256(Buffer.from(canonicalJson(liveEntries), "utf8")));
  assert.equal(inventory.inventoryRootHash, V3_PACKAGE_INVENTORY_ROOT);
});

test("mutable active pointer intentionally remains on V3 until the integrator performs the atomic switch", async () => {
  const pointer = JSON.parse(await readFile(new URL("../../ACTIVE-DESIGN-REGISTRATION.json", import.meta.url), "utf8"));
  const registration = JSON.parse(await readFile(new URL("./design-registration.json", import.meta.url), "utf8"));
  assert.equal(pointer.artifactKind, "ACTIVE_DESIGN_POINTER_NOT_A_REGISTRATION");
  assert.equal(pointer.activeDesignId, "MAIS-NATURAL-CA60-V3");
  assert.equal(pointer.activeDesignPath, "versions/design-v3/design-registration.json");
  assert.equal(pointer.activeRegistrationHash, V3_REGISTRATION_HASH);
  assert.equal(pointer.predecessorDesignId, "MAIS-NATURAL-CA60-V2");
  assert.equal(pointer.predecessorRegistrationHash, V2_REGISTRATION_HASH);
  assert.equal(pointer.firstProviderExecutionAllowed, false);
  assert.equal(registration.designId, "MAIS-NATURAL-CA60-V4");
  assert.equal(registration.proposedSupersedes.registrationHash, V3_REGISTRATION_HASH);
  assert.equal(registration.proposedSupersedes.currentDisposition, "ACTIVE_DESIGN_REGISTRATION_V3_NO_PROVIDER_EXECUTION");
  assert.notEqual(pointer.activeRegistrationHash, registration.registrationHash);
});

test("V4 package README states the actual evidence and separate decision/claim-scope ceilings", async () => {
  const readme = await readFile(new URL("./README.md", import.meta.url), "utf8");
  for (const phrase of [
    "labelSourceType=machine_reference_panel",
    "INCONCLUSIVE_MACHINE_REFERENCE",
    "CALIFORNIA_RUNTIME_EGRESS_ELIGIBLE_MACHINE_REFERENCE_PILOT_ONLY",
    "UNKNOWN_PENDING_ROUTE_PROBE_EVIDENCE",
    "FALSE_ACCEPT_CORRECT_RESPONSE",
    "not human gold",
    "no provider call",
    "no frame freeze",
    "no sample freeze",
    "no current provider authorization",
    "no natural-question result",
    "no independent review receipt",
    "BLOCKED_PENDING_A21_PROTECTED_CUSTODY_REGISTRY",
    "EXECUTION_CUSTODY_REGISTRY_NOT_IMPLEMENTED",
    "consistency validator",
    "not publication authorization",
    "V1, V2, and V3 bytes remain unchanged",
  ]) assert.equal(readme.includes(phrase), true, `README missing ${phrase}`);
});

test("V4 adds an append-only pre-execution erratum without rewriting V1, V2, or V3", async () => {
  const erratum = await readFile(new URL("./PRE-EXECUTION-ERRATUM.md", import.meta.url), "utf8");
  assert.match(erratum, /SUPERSEDED_NOT_EXECUTED/u);
  assert.match(erratum, /provider event count is zero/iu);
  assert.match(erratum, new RegExp(V3_REGISTRATION_HASH, "u"));
  assert.match(erratum, new RegExp(V3_REGISTRATION_BYTE_SHA256, "u"));
  assert.match(erratum, new RegExp(V3_PACKAGE_INVENTORY_ROOT, "u"));
  assert.match(erratum, /INCONCLUSIVE_MACHINE_REFERENCE/u);
  assert.match(erratum, /no current provider authorization/iu);
  assert.match(erratum, /isCurrentAuthorization=false/u);
  assert.match(erratum, /BLOCKED_PENDING_A21_PROTECTED_CUSTODY_REGISTRY/u);
  assert.match(erratum, /EXECUTION_CUSTODY_REGISTRY_NOT_IMPLEMENTED/u);
  assert.match(erratum, /consistency validator/iu);
  assert.match(erratum, /not publication authorization/iu);
  assert.match(erratum, /No `PASS`/u);
  assert.doesNotMatch(erratum, /(?:result|status|decision)\s*(?:is|=|:)\s*`?PASS(?:ED)?`?/iu);
});

test("V4 root contains no current authorization or provider attempt artifact", async () => {
  const names = await readdir(packageDirectory);
  assert.equal(names.some((name) => /attempt.*receipt.*\.json$/iu.test(name)), false);
  assert.equal(names.some((name) => /authorization.*\.json$/iu.test(name)), false);
  assert.equal(names.includes("README.md"), true);
  assert.equal(names.includes("design-registration.json"), true);
  assert.equal(names.includes("statistical-power.json"), true);
});

test("V4 candidate wording cannot overclaim an active immutable freeze or current supersession", async () => {
  const [readme, erratum, sessionLog, registration, schema, power] = await Promise.all([
    readFile(new URL("./README.md", import.meta.url), "utf8"),
    readFile(new URL("./PRE-EXECUTION-ERRATUM.md", import.meta.url), "utf8"),
    readFile(new URL("../../../../session-logs/2026-08-25-A16-natural-ca60-design-v4.md", import.meta.url), "utf8"),
    readFile(new URL("./design-registration.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("./schemas/NaturalCaPilotDesignRegistrationV4.schema.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("./statistical-power.json", import.meta.url), "utf8").then(JSON.parse),
  ]);

  assert.match(readme, /DRAFT_OWNER_DECISIONS_PENDING/u);
  assert.match(readme, /ACTIVE[^\n]*V3/iu);
  assert.match(readme, /## Proposed freeze chronology/u);
  assert.match(readme, /precommitted 17-code taxonomy/iu);
  assert.doesNotMatch(readme, /## Chronology:\s*frozen order/iu);
  assert.doesNotMatch(readme, /frozen 17-code taxonomy/iu);
  assert.doesNotMatch(readme, /V4[^\n]*(?:is|as) an immutable pre-execution design registration/iu);
  assert.doesNotMatch(readme, /V4[^\n]*supersedes V3/iu);

  assert.match(erratum, /DRAFT_OWNER_DECISIONS_PENDING/u);
  assert.doesNotMatch(erratum, /Status:\s*`DESIGN_REGISTERED/iu);
  assert.doesNotMatch(erratum, /(?:erratum|V4)[^\n]*supersedes[^\n]*V3/iu);

  assert.match(sessionLog, /stale pre-candidate evidence/iu);
  assert.match(sessionLog, /V3 remains active/iu);
  assert.match(sessionLog, /BLOCKED_PENDING_A21_PROTECTED_CUSTODY_REGISTRY/u);
  assert.match(sessionLog, /EXECUTION_CUSTODY_REGISTRY_NOT_IMPLEMENTED/u);
  assert.match(sessionLog, /consistency validator/iu);
  assert.match(sessionLog, /not publication authorization/iu);
  assert.doesNotMatch(sessionLog, /real freeze timestamps/iu);
  assert.doesNotMatch(sessionLog, /planned ACTIVE switch/iu);
  assert.doesNotMatch(sessionLog, /explicit `SUPERSEDED_NOT_EXECUTED` treatment of design-v3/iu);

  assert.equal(registration.designKind, "PRE_EXECUTION_DESIGN_REGISTRATION_CANDIDATE");
  assert.equal(registration.lifecycleStatus, "DRAFT_OWNER_DECISIONS_PENDING");
  assert.equal(registration.freezeAllowed, false);
  assert.equal(registration.frozenAt, null);
  assert.equal(registration.registrationHash, null);
  assert.equal(registration.proposedSupersedes.registrationHash, V3_REGISTRATION_HASH);
  assert.equal(registration.proposedSupersedes.targetDispositionAfterValidFreeze, "SUPERSEDED_NOT_EXECUTED");
  assert.equal(Object.hasOwn(registration, "supersedes"), false);
  assert.equal(Object.hasOwn(registration, "supersedesRegistrationHash"), false);
  assert.equal(Object.hasOwn(registration, "supersedesDisposition"), false);

  assert.equal(schema.properties.lifecycleStatus.const, "DRAFT_OWNER_DECISIONS_PENDING");
  assert.equal(schema.properties.designKind.const, "PRE_EXECUTION_DESIGN_REGISTRATION_CANDIDATE");
  assert.equal(schema.properties.freezeAllowed.const, false);
  assert.equal(schema.properties.frozenAt.const, null);
  assert.equal(schema.properties.registrationHash.const, null);
  assert.equal(Object.hasOwn(schema.properties, "supersedes"), false);

  assert.equal(power.bindingStatus, "CANDIDATE_UNBOUND_PENDING_REGISTRATION_FREEZE");
  assert.equal(power.designRegistrationHash, null);
  assert.equal(power.powerArtifactHash, null);
});

test("session handoff exact-byte evidence matches the current method and frame contract files", async () => {
  const sessionLog = await readFile(
    new URL("../../../../session-logs/2026-08-25-A16-natural-ca60-design-v4.md", import.meta.url),
    "utf8",
  );
  for (const relativePath of [
    "design-contract.mjs",
    "c0-contracts.test.mjs",
    "review-gate.mjs",
    "review-gate.test.mjs",
    "review-gate-v4-integration.test.mjs",
    "review-test-fixtures.mjs",
    "reference-global.test.mjs",
    "v4-review-findings.test.mjs",
    "sample-contract.mjs",
    "sample-contract.test.mjs",
    "frame-contract-p0.test.mjs",
  ]) {
    const digest = sha256(await readFile(new URL(`./${relativePath}`, import.meta.url)));
    assert.equal(
      sessionLog.includes(`\`${relativePath}\`: \`${digest}\``),
      true,
      `session log must bind current ${relativePath} byte SHA-256 ${digest}`,
    );
  }
  assert.doesNotMatch(sessionLog, /e5a7d5f090c3fefe63fd3c2dca842da7a328c4e94d3613b6e610134af7fc9a17/u);
});
