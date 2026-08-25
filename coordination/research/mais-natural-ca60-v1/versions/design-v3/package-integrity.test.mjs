import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const packageDirectory = new URL("./", import.meta.url);
const repositoryRoot = new URL("../../../../../", import.meta.url);
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const V2_REGISTRATION_HASH = "a1b7d7ac6cf23b059dddc015c75b876d26a3576f9e5e3e07724ef8c5b8429de8";

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

test("mutable active pointer selects V3 and preserves the V2 predecessor link", async () => {
  const pointer = JSON.parse(await readFile(new URL("../../ACTIVE-DESIGN-REGISTRATION.json", import.meta.url), "utf8"));
  const registration = JSON.parse(await readFile(new URL("./design-registration.json", import.meta.url), "utf8"));
  assert.equal(pointer.artifactKind, "ACTIVE_DESIGN_POINTER_NOT_A_REGISTRATION");
  assert.equal(pointer.activeDesignId, "MAIS-NATURAL-CA60-V3");
  assert.equal(pointer.activeDesignPath, "versions/design-v3/design-registration.json");
  assert.equal(pointer.activeRegistrationHash, registration.registrationHash);
  assert.equal(pointer.predecessorDesignId, "MAIS-NATURAL-CA60-V2");
  assert.equal(pointer.predecessorRegistrationHash, V2_REGISTRATION_HASH);
  assert.equal(pointer.firstProviderExecutionAllowed, false);
});

test("V3 package README states the actual evidence and claim ceilings", async () => {
  const readme = await readFile(new URL("./README.md", import.meta.url), "utf8");
  for (const phrase of [
    "machine_reference_panel",
    "INCONCLUSIVE_MACHINE_REFERENCE",
    "AUTHORIZATION_BLOCKED",
    "FALSE_ACCEPT_CORRECT_RESPONSE",
    "not human gold",
    "No provider call",
    "unified nonresolved",
    "57 complete",
    "structural schema validation alone is insufficient",
    "V2 remains immutable",
  ]) assert.equal(readme.includes(phrase), true, `README missing ${phrase}`);
});

test("V3 adds an append-only pre-execution erratum without rewriting V1 or V2", async () => {
  const erratum = await readFile(new URL("./PRE-EXECUTION-ERRATUM.md", import.meta.url), "utf8");
  assert.match(erratum, /SUPERSEDED_NOT_EXECUTED/u);
  assert.match(erratum, /provider event count:\s*`0`/iu);
  assert.match(erratum, /a1b7d7ac6cf23b059dddc015c75b876d26a3576f9e5e3e07724ef8c5b8429de8/u);
  assert.match(erratum, /INCONCLUSIVE_MACHINE_REFERENCE/u);
  assert.match(erratum, /does not authorize provider execution/iu);
  assert.doesNotMatch(erratum, /\bPASS(?:ED)?\b/iu);
});

test("V3 root contains no provider attempt artifact and exposes only the frozen local package", async () => {
  const names = await readdir(packageDirectory);
  assert.equal(names.some((name) => /attempt.*receipt.*\.json$/iu.test(name)), false);
  assert.equal(names.some((name) => /authorization.*\.json$/iu.test(name)), false);
  assert.equal(names.includes("README.md"), true);
  assert.equal(names.includes("design-registration.json"), true);
  assert.equal(names.includes("statistical-power.json"), true);
});
