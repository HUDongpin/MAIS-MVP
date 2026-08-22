import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { lstatSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  HONG_KONG_EASE_EXACT3_PHASE2B_RUNTIME_CANDIDATE_DIRECTORY,
  HONG_KONG_EASE_EXACT3_PHASE2B_RUNTIME_POSTIMAGE_PATHS,
  buildHongKongEaseExact3Phase2BRuntimeCandidate,
  buildHongKongEaseExact3Phase2BRuntimeCandidateFromInputs,
  loadHongKongEaseExact3Phase2BRuntimeCandidateInputs,
  materializeHongKongEaseExact3Phase2BRuntimeCandidate,
  serializeHongKongEaseExact3Phase2BRuntimeCandidate
} from "./build-hk-ease-exact3-phase2b-runtime-candidate";

type JsonRecord = Record<string, any>;

const EXPECTED_TARGETS = [
  "data/hongKongEasePracticeQuestions.ts",
  "lib/hongKongQuestionVersioningContract.ts",
  "lib/hongKongQuestionVersioning.ts",
  "lib/server/hongKongEaseResponseContracts.ts"
] as const;

const EXPECTED_POSTIMAGE_BINDINGS = [
  ["692872955440282bd21426e1fa04e18368ae91b8d3b516bc0fdb97b568cb3dff", 27329],
  ["8c450a89cb767b4864a6c739dd4849c69616245c86f0a36a4db8554a5044fd0a", 558],
  ["43001bbdc9a57db6ef3c90aa8bd42913baea6180653436135d94227258252df4", 25687],
  ["c3f462f619b0b90bf4a5a98475367927a7209a21300d59695b6e0a3ea97f03dd", 80546]
] as const;

const FORBIDDEN_LIVE_PATHS = [
  "data/generated-content/hk-ease-practice-bank-v2/question-pack.json",
  "data/generated-content/hk-ease-practice-bank-v2/response-contract-audit.json",
  "data/generated-content/hk-ease-practice-bank-v2/response-contracts.json",
  "data/generated-content/hk-ease-practice-bank-v2/simple-response-contracts.json",
  "data/generated-content/hk-ease-practice-bank-v2/independent-answer-oracle.json",
  "data/historical/hongKongQuestions-hk-ease-39847.json",
  "data/historical/hongKongQuestionVersionManifest.json",
  ...EXPECTED_TARGETS
] as const;

function sha256(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

function fileSha256(relativePath: string) {
  return sha256(readFileSync(join(process.cwd(), relativePath)));
}

function forbiddenLiveInventory() {
  return Object.fromEntries(FORBIDDEN_LIVE_PATHS.map((path) => [path, fileSha256(path)]));
}

function mutateAndReject(
  mutation: (inputs: ReturnType<typeof loadHongKongEaseExact3Phase2BRuntimeCandidateInputs>) => void,
  expected: RegExp
) {
  const inputs = structuredClone(loadHongKongEaseExact3Phase2BRuntimeCandidateInputs());
  mutation(inputs);
  assert.throws(
    () => buildHongKongEaseExact3Phase2BRuntimeCandidateFromInputs(inputs),
    expected
  );
}

test("Phase2B.2 builds exactly four source-bound serving-runtime postimages", () => {
  const candidate = buildHongKongEaseExact3Phase2BRuntimeCandidate();
  assert.equal(candidate.status, "candidate-hold-not-live-promotion");
  assert.deepEqual(Object.keys(candidate.postimages), [...EXPECTED_TARGETS]);
  assert.deepEqual(
    candidate.postimageBindings.map((binding) => binding.logicalTargetPath),
    [...EXPECTED_TARGETS]
  );
  assert.equal(candidate.dataPlaneAuthoritySha256,
    "572b0c9826db2c11fe3ec235a375676a82e6155283b8fa20a5a78f5f161eba16");
  assert.equal(candidate.dataPlaneAuthorityPayloadSha256,
    "984c473210ca7fa8af6dcd6f90a8d1bb1754189d3986a9a5e58cfc8ff33a4622");

  const loader = candidate.postimages[EXPECTED_TARGETS[0]];
  assert.match(loader, /exact3-independent-oracle-supplement\.json/);
  assert.match(loader, /afed98f9aca07951dffbc6ac8ce93bb6074629298c80ac848842bd7792fd7bdf/);
  assert.match(loader, /3b1b5b5a4e4034712086de8345b04e74e435f58e4c7c8ed73c5d801cfad4b19c/);
  assert.match(loader, /auditSha256,[\s\S]*3f5671299ecb88fd58e0d22c6241737a27cd7d3a1e8332da989eea1f3b15010a/);
  assert.doesNotMatch(loader, /auditSha256,[\s\S]*3ae431cd883638f2a60924816353540bfead2a11463558417b690caf11986a28/);
  assert.match(loader, /positiveProbeCount !== 584/);
  assert.match(loader, /negativeProbeCount !== 581/);
  assert.match(loader, /acceptedAnswerFormsReviewed[^\n]*1912|1912/);
  assert.match(loader, /calculationDifferenceCount[^\n]*167|167/);
  assert.match(loader, /strictNegativeCalculationCount[^\n]*64|64/);
  assert.match(loader, /V3 oracle preimage/i);

  const versionContract = candidate.postimages[EXPECTED_TARGETS[1]];
  assert.match(versionContract, /HONG_KONG_EASE_EXACT3_V3_HISTORY_SOURCE_PACKAGE_SHA256/);
  assert.match(versionContract, /e5a696da5e8d5e1cc31259a6736d6d9974c08fdf25a57298a6958ffcd11b440b/);

  const versioning = candidate.postimages[EXPECTED_TARGETS[2]];
  assert.match(versioning, /hongKongQuestions-hk-ease-exact3-v3\.json/);
  assert.match(versioning, /1791/);
  assert.match(versioning, /hk-ease-exact3-phase2a-v3-history-v1/);

  const responseRuntime = candidate.postimages[EXPECTED_TARGETS[3]];
  assert.match(responseRuntime, /86333f5482a6a90da42c4ae12d575df8e2859409ff12de18032122a6c67c2b2c/);
  assert.match(responseRuntime, /d5f226b600e98cd4cfa1df6497137a0844e0f9685d8f87e4a6e1130aaa5c3d41/);
  assert.match(responseRuntime, /positiveProbeCount:\s*584/);
  assert.match(responseRuntime, /negativeProbeCount:\s*581/);
  assert.match(responseRuntime, /exact3-named-classified-number-groups-v1/);
  assert.match(responseRuntime, /exact3-labelled-divisibility-matrix-v1/);
  assert.match(responseRuntime, /hongKongEaseExact3SemanticResponseDecision/);
  assert.match(responseRuntime, /mixed\\s\+numbers/);
  assert.doesNotMatch(responseRuntime, /mixed\\s\+\(\?:numbers\?\|fractions\?\)/);

  for (const [index, binding] of candidate.postimageBindings.entries()) {
    assert.equal(sha256(candidate.postimages[binding.logicalTargetPath]), binding.sha256);
    assert.equal(Buffer.byteLength(candidate.postimages[binding.logicalTargetPath]), binding.byteLength);
    assert.deepEqual([binding.sha256, binding.byteLength], EXPECTED_POSTIMAGE_BINDINGS[index]);
    assert.notEqual(binding.preimageSha256, binding.sha256);
  }
});

test("Phase2B.2 rejects source, data-plane, overlay, history, and manifest drift", () => {
  mutateAndReject(
    (inputs) => { inputs.sourcePreimages[EXPECTED_TARGETS[0]] += "\n// drift"; },
    /PHASE2B2_SOURCE_PREIMAGE_DRIFT/
  );
  mutateAndReject(
    (inputs) => { (inputs.dataPlaneAuthority as JsonRecord).status = "promotable"; },
    /PHASE2B2_DATA_PLANE_AUTHORITY_DRIFT/
  );
  mutateAndReject(
    (inputs) => { (inputs.dataPlaneArtifacts.strict as JsonRecord).positiveProbeCount = 583; },
    /PHASE2B2_DATA_ARTIFACT_DRIFT/
  );
  mutateAndReject(
    (inputs) => { (inputs.dataPlaneArtifacts.overlay as JsonRecord).questions[0].calculationIsStrictNegative = false; },
    /PHASE2B2_DATA_ARTIFACT_DRIFT/
  );
  mutateAndReject(
    (inputs) => { (inputs.dataPlaneArtifacts.history as JsonRecord).questions[0].id = "hk-ease-10481-v4"; },
    /PHASE2B2_DATA_ARTIFACT_DRIFT/
  );
  mutateAndReject(
    (inputs) => { (inputs.dataPlaneArtifacts.versionManifest as JsonRecord).activeIdByHistoricalId["hk-ease-10481"] = "hk-ease-10481-v2"; },
    /PHASE2B2_DATA_ARTIFACT_DRIFT/
  );
});

test("Phase2B.2 materializes only four immutable postimages plus one HOLD authority", () => {
  const before = forbiddenLiveInventory();
  const built = materializeHongKongEaseExact3Phase2BRuntimeCandidate();
  const serialized = serializeHongKongEaseExact3Phase2BRuntimeCandidate(
    buildHongKongEaseExact3Phase2BRuntimeCandidate()
  );
  assert.deepEqual(built, serialized);
  assert.deepEqual(forbiddenLiveInventory(), before);
  assert.equal(Object.keys(serialized).length, 5);
  assert.deepEqual(
    Object.keys(serialized).sort(),
    [...HONG_KONG_EASE_EXACT3_PHASE2B_RUNTIME_POSTIMAGE_PATHS,
      `${HONG_KONG_EASE_EXACT3_PHASE2B_RUNTIME_CANDIDATE_DIRECTORY}/runtime-hold-authority-v1.json`].sort()
  );
  for (const [path, bytes] of Object.entries(serialized)) {
    const absolutePath = join(process.cwd(), path);
    const stat = lstatSync(absolutePath);
    assert.equal(stat.isFile(), true, `${path}: regular file`);
    assert.equal(stat.isSymbolicLink(), false, `${path}: no symlink`);
    assert.equal(stat.mode & 0o777, 0o444, `${path}: immutable mode`);
    assert.equal(readFileSync(absolutePath, "utf8"), bytes, `${path}: exact bytes`);
  }
});
