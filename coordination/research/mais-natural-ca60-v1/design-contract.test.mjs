import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  canonicalJson,
  buildDesignRegistration,
  calculateRegistrationHash,
  TAXONOMY,
  sha256Hex,
} from "./design-contract.mjs";

test("canonical JSON is stable across object insertion order and hashes identically", () => {
  const left = { z: 1, a: { beta: true, alpha: "数学" }, list: [3, null, 1] };
  const right = { list: [3, null, 1], a: { alpha: "数学", beta: true }, z: 1 };

  assert.equal(canonicalJson(left), canonicalJson(right));
  assert.equal(sha256Hex(canonicalJson(left)), sha256Hex(canonicalJson(right)));
});

test("canonical JSON rejects values outside the supported RFC 8785 domain", () => {
  for (const value of [NaN, Infinity, undefined, 1n, new Date(0), { missing: undefined }]) {
    assert.throws(() => canonicalJson(value), TypeError);
  }
  const sparse = [];
  sparse[1] = "present";
  assert.throws(() => canonicalJson(sparse), /sparse/u);
  const cyclic = {};
  cyclic.self = cyclic;
  assert.throws(() => canonicalJson(cyclic), /cycle/u);
  assert.throws(() => canonicalJson({ [Symbol("not-json")]: true }), /symbol keys/u);
});

test("taxonomy codes are complete and each has exactly one frozen severity", () => {
  assert.deepEqual(Object.keys(TAXONOMY), [
    "CORRECT",
    "FINAL_ANSWER_ERROR",
    "MATHEMATICAL_REASONING_ERROR",
    "INCOMPLETE_JUSTIFICATION",
    "INSTRUCTION_NONCOMPLIANCE",
    "AMBIGUOUS_OR_UNSCORABLE",
    "LANGUAGE_OR_NOTATION_ERROR",
    "SAFETY_OR_PRIVACY_ERROR",
    "MACHINE_REFERENCE_UNRESOLVED",
  ]);
  assert.equal(Object.values(TAXONOMY).every((severity) => ["NONE", "MINOR", "MAJOR", "CRITICAL", "UNRESOLVED"].includes(severity)), true);
});

test("power artifact proves the CA60 structural ceiling with code-derived values", async () => {
  const power = JSON.parse(await readFile(new URL("./statistical-power.json", import.meta.url), "utf8"));

  assert.equal(power.designRegistrationHash, calculateRegistrationHash(buildDesignRegistration()));
  assert.equal(power.binaryThresholdOpportunity.minimumAllSuccessPositiveN, 25);
  assert.equal(power.binaryThresholdOpportunity.minimumAllSuccessNegativeN, 52);
  assert.equal(power.binaryThresholdOpportunity.requiredTotal, 77);
  assert.equal(power.binaryThresholdOpportunity.structurallyPossibleWithin60, false);
  assert.equal(power.ca60Conclusion, "LIMITED_UNAVAILABLE_INCONCLUSIVE_MACHINE_REFERENCE");
  assert.deepEqual(power.zeroMissOpportunity.map((row) => row.requiredN), [59, 149, 299]);
});

test("the frozen registration exactly matches the deterministic builder and self-hash", async () => {
  const saved = JSON.parse(await readFile(new URL("./design-registration.json", import.meta.url), "utf8"));
  const expected = buildDesignRegistration();

  assert.deepEqual({ ...saved, registrationHash: undefined }, { ...expected, registrationHash: undefined });
  assert.match(saved.registrationHash, /^[0-9a-f]{64}$/u);
  assert.equal(saved.registrationHash, calculateRegistrationHash(saved));
});

test("registration hash omits registrationHash without mutating the source", () => {
  const registration = { schemaVersion: "NaturalCaPilotDesignRegistrationV1", registrationHash: "old", nested: { a: 1 } };
  const expected = sha256Hex(canonicalJson({ schemaVersion: "NaturalCaPilotDesignRegistrationV1", nested: { a: 1 } }));

  assert.equal(calculateRegistrationHash(registration), expected);
  assert.equal(registration.registrationHash, "old");
});
