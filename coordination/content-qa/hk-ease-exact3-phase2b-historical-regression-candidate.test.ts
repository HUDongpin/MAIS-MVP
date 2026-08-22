import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { lstatSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  HONG_KONG_EASE_EXACT3_PHASE2B_HISTORICAL_CANDIDATE_DIRECTORY,
  buildHongKongEaseExact3Phase2BHistoricalRegressionCandidate,
  buildHongKongEaseExact3Phase2BHistoricalRegressionCandidateFromInputs,
  loadHongKongEaseExact3Phase2BHistoricalRegressionCandidateInputs,
  materializeHongKongEaseExact3Phase2BHistoricalRegressionCandidate
} from "./build-hk-ease-exact3-phase2b-historical-regression-candidate";

const EXPECTED_TARGETS = [
  "lib/hongKongQuestionVersioning.test.ts",
  "lib/server/hongKongHistoricalQuestionProjection.test.ts",
  "lib/hongKongDisplayed74FigureHistoryContract.test.ts",
  "lib/hongKongResidual47RepairContract.test.ts",
  "lib/server/hongKongEaseResponseContracts.test.ts",
  "lib/hongKongResidual47FocusedTestLedger.ts",
  "coordination/content-qa/authoritative/2026-08-13-hk-residual47-focused-test-ledger.json",
  "coordination/content-qa/authoritative/2026-08-13-hk-ease-response-focused-test-ledger.json"
] as const;

const EXPECTED_POSTIMAGE_BINDINGS = [
  ["4e2640bf0d4fd0b28fb3186e73625022b0d00989e0380ed1a5304e38b64b6128", 11553],
  ["abeb79cb4c2b437bb687ac09b63fd948959ddd30428d0734ce91aabc35c4b963", 15819],
  ["bb77a21004cdfd9eb8eb2d07b37fb134e0c82d19f45e5a0afc605e454cffa869", 41477],
  ["1600b6131f448720223b7ad41592c4912e52f8a08406ce57f590c19fefcde800", 50343],
  ["b71f2b6780895cb303033fbe1879a05515fc174102350d8081c0412c1ac31026", 22626],
  ["2c20817b6c96b42ed5a89972c7ea4d084205538a2d35f5278f2dddd3a38b3c63", 8088],
  ["8ecfc6570714daa6d35e1c9d1a1f5bee92a0b0b60b3230408e3f9acaaebb12c0", 1632],
  ["ca64cfd9403206ec5094d170c97f31a2556351e17b6beed7cbdcd11f64dcbe91", 1307]
] as const;

const FORBIDDEN_LIVE_PATHS = [...EXPECTED_TARGETS] as const;

function sha256(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

function fileSha256(path: string) {
  return sha256(readFileSync(join(process.cwd(), path)));
}

function liveInventory() {
  return Object.fromEntries(FORBIDDEN_LIVE_PATHS.map((path) => [path, fileSha256(path)]));
}

function mutateAndReject(
  mutation: (
    inputs: ReturnType<typeof loadHongKongEaseExact3Phase2BHistoricalRegressionCandidateInputs>
  ) => void,
  expected: RegExp
) {
  const inputs = structuredClone(loadHongKongEaseExact3Phase2BHistoricalRegressionCandidateInputs());
  mutation(inputs);
  assert.throws(
    () => buildHongKongEaseExact3Phase2BHistoricalRegressionCandidateFromInputs(inputs),
    expected
  );
}

test("Phase2B.3 builds exact source-bound historical-regression and focused-ledger postimages", () => {
  const candidate = buildHongKongEaseExact3Phase2BHistoricalRegressionCandidate();
  assert.equal(candidate.status, "candidate-hold-not-live-promotion");
  assert.deepEqual(Object.keys(candidate.postimages), [...EXPECTED_TARGETS]);
  assert.deepEqual(
    candidate.postimageBindings.map((binding) => binding.logicalTargetPath),
    [...EXPECTED_TARGETS]
  );

  const versioning = candidate.postimages[EXPECTED_TARGETS[0]];
  assert.match(versioning, /HONG_KONG_EASE_EXACT3_V3_HISTORY_SOURCE_PACKAGE_SHA256/);
  assert.match(versioning, /easeExact3V3HistoricalHongKongQuestions/);
  assert.match(versioning, /length, 614/);
  assert.match(versioning, /length, 87/);
  assert.match(versioning, /24796d8f24fcf013ab9ff3b41bbb7d5cbf506a14084db44ecd8c0108d45bde35/);

  assert.match(candidate.postimages[EXPECTED_TARGETS[1]], /retiredHongKongQuestionIds\.size, 1112/);
  const displayed = candidate.postimages[EXPECTED_TARGETS[2]];
  assert.match(displayed, /preimages\/sha256\/f0cfaeaf745325d6b8e99353082f7e0be9d63fdb2cb18db0d3b7568c0415af92\.json/);
  assert.doesNotMatch(displayed, /import versionManifest from "@\/data\/historical\/hongKongQuestionVersionManifest\.json"/);

  const residual = candidate.postimages[EXPECTED_TARGETS[3]];
  assert.match(residual, /size, 1111/);
  assert.match(residual, /size, 1112/);
  assert.match(residual, /all 1791 generations/);
  assert.match(residual, /uniqueIds\.size, 1791/);

  const response = candidate.postimages[EXPECTED_TARGETS[4]];
  assert.match(response, /all 584 positive EASE contract probes and all 1912 stored accepted forms/);
  assert.match(response, /all 581 negative EASE contract probes/);
  assert.match(response, /e6704e246a807d176edcea4dde99c9fc834d4400ee1cee1d6f1a675a47b7107b/);
  assert.match(response, /candidateSha256, "afed98f9aca07951dffbc6ac8ce93bb6074629298c80ac848842bd7792fd7bdf"/);
  assert.match(response, /auditSha256, "3f5671299ecb88fd58e0d22c6241737a27cd7d3a1e8332da989eea1f3b15010a"/);

  const registrar = candidate.postimages[EXPECTED_TARGETS[5]];
  assert.match(registrar, /8ecfc6570714daa6d35e1c9d1a1f5bee92a0b0b60b3230408e3f9acaaebb12c0/);
  assert.match(registrar, /d89c4aee3a620ecf6c5ff150b4b29def12b5f53107b41a1478c2cfa2a6437bfd/);

  const residualLedger = JSON.parse(candidate.postimages[EXPECTED_TARGETS[6]]) as {
    testNameSha256: string;
    suites: Array<{ testNames: string[] }>;
  };
  assert.equal(residualLedger.testNameSha256, "d89c4aee3a620ecf6c5ff150b4b29def12b5f53107b41a1478c2cfa2a6437bfd");
  assert.match(residualLedger.suites[0]?.testNames[6] ?? "", /1791/);

  const easeLedger = JSON.parse(candidate.postimages[EXPECTED_TARGETS[7]]) as {
    testNameSha256: string;
    suites: Array<{ testNames: string[] }>;
  };
  assert.equal(easeLedger.testNameSha256, "38d338428107012f5813a051e84afec2c04e8b0a048e54186b419a7475db8b1a");
  assert.match(easeLedger.suites[0]?.testNames[3] ?? "", /584.*1912/);
  assert.match(easeLedger.suites[0]?.testNames[4] ?? "", /581/);

  for (const [index, binding] of candidate.postimageBindings.entries()) {
    const postimage = candidate.postimages[binding.logicalTargetPath];
    assert.equal(sha256(postimage), binding.sha256);
    assert.equal(Buffer.byteLength(postimage), binding.byteLength);
    assert.deepEqual([binding.sha256, binding.byteLength], EXPECTED_POSTIMAGE_BINDINGS[index]);
    assert.notEqual(binding.preimageSha256, binding.sha256);
  }
});

test("Phase2B.3 rejects every source preimage, prior authority, and immutable residual manifest drift", () => {
  for (const target of EXPECTED_TARGETS) {
    mutateAndReject(
      (inputs) => { inputs.sourcePreimages[target] += "\n// drift"; },
      /PHASE2B3_SOURCE_PREIMAGE_DRIFT/
    );
  }
  mutateAndReject(
    (inputs) => { inputs.dataPlaneAuthority.status = "forged"; },
    /PHASE2B3_DATA_AUTHORITY_DRIFT/
  );
  mutateAndReject(
    (inputs) => { inputs.runtimeAuthority.status = "forged"; },
    /PHASE2B3_RUNTIME_AUTHORITY_DRIFT/
  );
  mutateAndReject(
    (inputs) => { inputs.residual28VersionManifestPreimage += "\n"; },
    /PHASE2B3_RESIDUAL28_MANIFEST_PREIMAGE_DRIFT/
  );
});

test("Phase2B.3 materializes only eight immutable postimages plus one HOLD authority", () => {
  const before = liveInventory();
  const built = materializeHongKongEaseExact3Phase2BHistoricalRegressionCandidate();
  const files = readdirSync(HONG_KONG_EASE_EXACT3_PHASE2B_HISTORICAL_CANDIDATE_DIRECTORY).sort();
  assert.equal(files.length, 9);
  assert.deepEqual(
    files,
    [...built.postimageBindings.map((binding) => binding.snapshotPath.split("/").at(-1) as string),
      "historical-regression-hold-authority-v1.json"].sort()
  );
  for (const file of files) {
    const stat = lstatSync(join(HONG_KONG_EASE_EXACT3_PHASE2B_HISTORICAL_CANDIDATE_DIRECTORY, file));
    assert.equal(stat.isFile(), true, `${file}: regular file`);
    assert.equal(stat.isSymbolicLink(), false, `${file}: no symlink`);
    assert.equal(stat.mode & 0o777, 0o444, `${file}: immutable mode`);
  }
  assert.deepEqual(liveInventory(), before);
});
