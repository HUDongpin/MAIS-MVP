import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const repositoryRoot = new URL("../../../../../", import.meta.url);
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

test("every predecessor byte remains equal to its b34f92 golden hash", async () => {
  const manifest = JSON.parse(await readFile(new URL("./predecessor-golden-hashes.json", import.meta.url), "utf8"));
  assert.equal(manifest.predecessorCommit, "b34f92a20ca81381a373d720840abfad620f9176");
  assert.equal(manifest.predecessorRegistrationHash, "663303a7331f5c230f3e3238f0253edea81e37dbd9674ab84db28c02d64c6ce7");
  assert.equal(manifest.files.length, 19);
  for (const entry of manifest.files) {
    const bytes = await readFile(new URL(entry.path, repositoryRoot));
    assert.equal(sha256(bytes), entry.sha256, entry.path);
  }
});

test("active pointer binds v2 without pretending to be a frozen registration", async () => {
  const pointer = JSON.parse(await readFile(new URL("../../ACTIVE-DESIGN-REGISTRATION.json", import.meta.url), "utf8"));
  assert.equal(pointer.artifactKind, "ACTIVE_DESIGN_POINTER_NOT_A_REGISTRATION");
  assert.equal(pointer.activeDesignPath, "versions/design-v2/design-registration.json");
  assert.equal(pointer.activeRegistrationHash, "a1b7d7ac6cf23b059dddc015c75b876d26a3576f9e5e3e07724ef8c5b8429de8");
  assert.equal(pointer.predecessorRegistrationHash, "663303a7331f5c230f3e3238f0253edea81e37dbd9674ab84db28c02d64c6ce7");
  assert.equal(pointer.firstProviderExecutionAllowed, false);
});

test("v2 README states the method and execution claim ceilings", async () => {
  const readme = await readFile(new URL("./README.md", import.meta.url), "utf8");
  for (const phrase of ["machine_reference_panel", "INCONCLUSIVE_MACHINE_REFERENCE", "AUTHORIZATION_BLOCKED", "FALSE_ACCEPT_CORRECT_RESPONSE", "SCHEMA_GAP", "No provider call", "not human gold"]) {
    assert.equal(readme.includes(phrase), true, `README missing ${phrase}`);
  }
});
