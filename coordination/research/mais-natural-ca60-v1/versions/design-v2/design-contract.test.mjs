import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  canonicalJson,
  buildDesignRegistration,
  calculateRegistrationHash,
  acceptedCodeSet,
  bootstrapBoundedIndex,
  BOOTSTRAP_GOLDEN_VECTORS,
  computeCapacityConstrainedHamilton,
  TAXONOMY,
  TAXONOMY_FAMILY,
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

test("canonical JSON rejects lone UTF-16 surrogates in values and property names", () => {
  assert.throws(() => canonicalJson("\uD800"), /lone UTF-16 surrogate/u);
  assert.throws(() => canonicalJson("\uDC00"), /lone UTF-16 surrogate/u);
  assert.throws(() => canonicalJson({ ["bad-\uD800-key"]: true }), /lone UTF-16 surrogate/u);
});

test("canonical JSON accepts a valid UTF-16 surrogate pair", () => {
  assert.equal(canonicalJson("\uD83D\uDE80"), '"🚀"');
  assert.equal(canonicalJson({ ["rocket-\uD83D\uDE80"]: true }), '{"rocket-🚀":true}');
});

test("taxonomy codes are complete and each has exactly one frozen severity", () => {
  assert.deepEqual(Object.keys(TAXONOMY), [
    "WRONG_CANONICAL_ANSWER", "UNSOLVABLE_OR_INTERNALLY_INCONSISTENT", "FALSE_ACCEPT_CORRECT_RESPONSE", "FALSE_ACCEPT_NEAR_MISS", "FALSE_REJECT_CORRECT_RESPONSE", "ORACLE_OR_PROMPT_LEAKAGE",
    "EQUIVALENT_ANSWER_NOT_ACCEPTED", "MULTIPLE_CORRECT_OPTIONS", "MISSING_OR_MISMATCHED_OPTIONS", "EXPLANATION_ANSWER_MISMATCH", "EVIDENCE_MISMATCH", "LANGUAGE_SEMANTIC_MISMATCH", "CURRICULUM_OR_METADATA_MISMATCH",
    "MINOR_WORDING_OR_FORMAT", "MINOR_EXPLANATION_WEAKNESS", "REDUNDANT_OR_NEAR_DUPLICATE", "MINOR_METADATA_MISMATCH", "NO_FINDING", "UNASSESSABLE", "SCHEMA_GAP",
  ]);
  assert.equal(Object.values(TAXONOMY).every((severity) => ["NONE", "P2", "P1", "P0", "UNRESOLVED"].includes(severity)), true);
  assert.equal(Object.keys(TAXONOMY_FAMILY).length, Object.keys(TAXONOMY).length);
  assert.throws(() => acceptedCodeSet("FALSE_ACCEPT_CORRECT_RESPONSE"), /ambiguous literal/u);
  assert.deepEqual(acceptedCodeSet("FALSE_ACCEPT_NEAR_MISS"), ["FALSE_ACCEPT_NEAR_MISS"]);
});

test("capacity-constrained Hamilton supports capacity one and deterministic overflow redistribution", () => {
  const result = computeCapacityConstrainedHamilton([1, 2, 3, 4, 5, 6, 7, 50, 100], 60, 2);
  assert.equal(result.finalAllocation[0], 1);
  assert.equal(result.finalAllocation.reduce((sum, value) => sum + value, 0), 60);
  assert.equal(result.finalAllocation.every((value, index) => value <= result.capacities[index]), true);
  assert.ok(result.rounds.length >= 1);
  assert.deepEqual(result.baseAllocation, [1, 2, 2, 2, 2, 2, 2, 2, 2]);
  assert.throws(() => computeCapacityConstrainedHamilton([1, 1, 1, 1, 1, 1, 1, 1, 51], 60, 2), /below target/u);
});

test("counter-based SHA-256 bootstrap PRNG matches frozen golden vectors", () => {
  for (const vector of BOOTSTRAP_GOLDEN_VECTORS) assert.equal(bootstrapBoundedIndex(vector), vector.expectedIndex);
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
  const registration = { schemaVersion: "NaturalCaPilotDesignRegistrationV2", registrationHash: "old", nested: { a: 1 } };
  const expected = sha256Hex(canonicalJson({ schemaVersion: "NaturalCaPilotDesignRegistrationV2", nested: { a: 1 } }));

  assert.equal(calculateRegistrationHash(registration), expected);
  assert.equal(registration.registrationHash, "old");
});
