import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { lstatSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  HONG_KONG_EASE_EXACT3_PHASE2B_CANONICAL241_CANDIDATE_DIRECTORY,
  buildHongKongEaseExact3Phase2BCanonical241Candidate,
  buildHongKongEaseExact3Phase2BCanonical241CandidateFromInputs,
  loadHongKongEaseExact3Phase2BCanonical241CandidateInputs,
  materializeHongKongEaseExact3Phase2BCanonical241Candidate
} from "./build-hk-ease-exact3-phase2b-canonical241-candidate";

const RUNNER_TARGETS = [
  "coordination/content-qa/hk-question-bank-evidence-runner.mjs",
  "coordination/content-qa/hk-question-bank-evidence-runner.test.mjs"
] as const;

const TARGETS = [
  ...RUNNER_TARGETS,
  "lib/hongKongLessonQualityContract.test.ts"
] as const;

const sha256 = (value: string | Buffer) =>
  createHash("sha256").update(value).digest("hex");

const liveInventory = () => Object.fromEntries(
  TARGETS.map((path) => [path, sha256(readFileSync(join(process.cwd(), path)))])
);

test("Phase2B canonical candidate derives exact241 from 167 literal direct names plus the exact74 focused ledgers", () => {
  const candidate = buildHongKongEaseExact3Phase2BCanonical241Candidate();
  assert.equal(candidate.status, "candidate-hold-not-live-promotion");
  assert.equal(candidate.topology.directTestCount, 167);
  assert.equal(
    candidate.topology.directTestNameSha256,
    "660a3780b9dcb8daf5b39ac1d3fb3ada5869a89bfa4b14e932577ffe59c7ff37"
  );
  assert.deepEqual(candidate.topology.directSourceTestCounts, [38, 8, 8, 11, 7, 5, 36, 25, 19, 10]);
  assert.equal(candidate.topology.focusedTestCount, 74);
  assert.deepEqual(candidate.topology.focusedLedgerCounts, [57, 10, 7]);
  assert.equal(candidate.topology.expectedCanonicalTestCount, 241);
  assert.equal(candidate.topology.expectedExpandedTestCount, 308);
  assert.equal(candidate.topology.globallyUniqueTestNameCount, 241);
  assert.deepEqual(candidate.topology.collisions, []);

  const runner = candidate.postimages[TARGETS[0]];
  assert.match(runner, /export const EXPECTED_DIRECT_TEST_COUNT = 167;/);
  assert.match(runner, /export const EXPECTED_EXPANDED_TEST_COUNT = 308;/);
  assert.match(runner, /660a3780b9dcb8daf5b39ac1d3fb3ada5869a89bfa4b14e932577ffe59c7ff37/);
  assert.match(runner, /"lib\/hongKongEaseIndependentOracleV4\.test\.js"/);
  assert.match(runner, /"lib\/hongKongEaseIndependentOracleV4\.test\.ts"/);
  assert.match(runner, /"lib\/hongKongLessonQualityContract\.test\.js"/);
  assert.match(runner, /"lib\/hongKongLessonQualityContract\.test\.ts"/);
  assert.match(runner, /"lib\/questionBankSolvability\.ts"/);
  assert.match(runner, /"lib\/hongKongEaseIndependentOracle\.ts"/);
  assert.match(runner, /8ecfc6570714daa6d35e1c9d1a1f5bee92a0b0b60b3230408e3f9acaaebb12c0/);
  assert.match(runner, /ca64cfd9403206ec5094d170c97f31a2556351e17b6beed7cbdcd11f64dcbe91/);
  assert.match(
    runner,
    /function canonicalCompileArguments\(\) \{[\s\S]*?"--noEmit",[\s\S]*?"--incremental",[\s\S]*?"false"[\s\S]*?\}/
  );
  assert.doesNotMatch(runner, /"--module",\s*"commonjs"/);
  assert.match(runner, /"--import",\s*"tsx"/);
  assert.match(runner, /"--test-concurrency=1"/);
  assert.match(runner, /entry\.replace\(\/\\\.js\$\/, "\.ts"\)/);
  assert.match(runner, /EXECUTING_TSX_MODULE_PATH/);
  assert.match(runner, /EXECUTING_ESBUILD_MODULE_PATH/);
  assert.match(runner, /hk-question-bank-physical-toolchain-binding-v2/);
  assert.match(runner, /packageName:\s*"tsx"/);
  assert.match(runner, /packageName:\s*"esbuild"/);

  const runnerTest = candidate.postimages[TARGETS[1]];
  assert.match(runnerTest, /\[38, 8, 8, 11, 7, 5, 36, 25, 19, 10\]/);
  assert.match(runnerTest, /expectedDirectTestCount: 167/);
  assert.match(runnerTest, /expectedTotalTestCount: 241/);
  assert.match(runnerTest, /expectedExpandedTestCount: 308/);
  assert.match(runnerTest, /tests: 308/);
  assert.match(runnerTest, /pass: 308/);
  assert.match(runnerTest, /# tests 308/);
  assert.match(runnerTest, /"lib\/hongKongEaseIndependentOracleV4\.test\.ts"/);
  assert.match(runnerTest, /"lib\/hongKongLessonQualityContract\.test\.ts"/);
  assert.match(runnerTest, /"lib\/questionBankSolvability\.ts"/);
  assert.match(runnerTest, /"lib\/hongKongEaseIndependentOracle\.ts"/);
  assert.doesNotMatch(runnerTest, /"--module",\s*"commonjs"/);
  assert.match(runnerTest, /"--import",\s*"tsx"/);
  assert.match(runnerTest, /"--test-concurrency=1"/);
  assert.match(runnerTest, /hk-question-bank-physical-toolchain-binding-v2/);
  assert.match(runnerTest, /first\.tsx\.packageName/);
  assert.match(runnerTest, /first\.esbuild\.packageName/);
  assert.doesNotMatch(
    runnerTest,
    /const workspaceRoot = "\/Volumes\/Starship\/MAIS-hk-ease-v2-qa-wt"/
  );

  const lessonContract = candidate.postimages[TARGETS[2]];
  assert.equal(lessonContract, readFileSync(join(process.cwd(), TARGETS[2]), "utf8"));
  assert.equal(
    sha256(candidate.lessonContractTransitionPreimage.bytes),
    "15a54de50c52ac839b01f9560b8ddc475abdcde4163beb6abc9204f68ffdf557"
  );
  assert.equal(
    candidate.lessonContractTransitionPreimage.snapshotPath,
    `${HONG_KONG_EASE_EXACT3_PHASE2B_CANONICAL241_CANDIDATE_DIRECTORY}/lib-hongKongLessonQualityContract.test.ts.preimage.snapshot`
  );
  const lessonBinding = candidate.postimageBindings.find(
    (binding) => binding.logicalTargetPath === TARGETS[2]
  );
  assert.deepEqual(
    lessonBinding && {
      preimageSha256: lessonBinding.preimageSha256,
      sha256: lessonBinding.sha256
    },
    {
      preimageSha256: "15a54de50c52ac839b01f9560b8ddc475abdcde4163beb6abc9204f68ffdf557",
      sha256: "14ed04358cff26d50a60d69437c5d43ca14aba6a744de70645fa7c95fc9eee11"
    }
  );

  for (const binding of candidate.postimageBindings) {
    const bytes = candidate.postimages[binding.logicalTargetPath];
    assert.equal(sha256(bytes), binding.sha256);
    assert.equal(Buffer.byteLength(bytes, "utf8"), binding.byteLength);
    assert.notEqual(binding.preimageSha256, binding.sha256);
  }
});

test("Phase2B canonical candidate binds the exact future direct test bodies and rejects every input drift", () => {
  const candidate = buildHongKongEaseExact3Phase2BCanonical241Candidate();
  const authorityByPath = new Map(candidate.reviewedSourceAuthority.map((entry) => [entry.path, entry]));
  assert.equal(authorityByPath.size, candidate.reviewedTopologySourcePaths.length);
  assert.equal(authorityByPath.get("lib/fullQuestionBankSolvability.test.ts")?.sha256,
    "1d1ed1c4fcaaae556b6ddde0dcdc4bed74f93add4ee2f0d445083672ba72c7f0");
  assert.equal(authorityByPath.get("lib/hongKongEaseIndependentOracleV4.test.ts")?.sha256,
    "459c89f15d073f50927b21605be093543e6e64ffede351734c23f1188251285a");
  assert.equal(authorityByPath.get("lib/hongKongLessonQualityContract.test.ts")?.sha256,
    "14ed04358cff26d50a60d69437c5d43ca14aba6a744de70645fa7c95fc9eee11");
  assert.equal(authorityByPath.get("lib/questionBankSolvability.ts")?.sha256,
    "2b400503b0cb9fb90e4627fd7e285e58c830b78ac2d22839b0fa5a16c0b69e7f");
  assert.equal(authorityByPath.get("lib/hongKongEaseIndependentOracle.ts")?.sha256,
    "08c315e86ec0c0a917c4f7b9f85f6844b25e427807a44bc03ed6d2088a480b6c");

  for (const target of RUNNER_TARGETS) {
    const inputs = structuredClone(loadHongKongEaseExact3Phase2BCanonical241CandidateInputs());
    inputs.runnerPreimages[target] += "\n// drift";
    assert.throws(
      () => buildHongKongEaseExact3Phase2BCanonical241CandidateFromInputs(inputs),
      /PHASE2B6_RUNNER_PREIMAGE_DRIFT/
    );
  }
  for (const authorityName of ["historicalRegression", "v4Lineage", "fullbank"] as const) {
    const inputs = structuredClone(loadHongKongEaseExact3Phase2BCanonical241CandidateInputs());
    inputs.priorAuthorities[authorityName].status = "forged";
    assert.throws(
      () => buildHongKongEaseExact3Phase2BCanonical241CandidateFromInputs(inputs),
      /PHASE2B6_PRIOR_AUTHORITY_DRIFT/
    );
  }
  for (const path of candidate.reviewedTopologySourcePaths.slice(2)) {
    const inputs = structuredClone(loadHongKongEaseExact3Phase2BCanonical241CandidateInputs());
    inputs.futureSourceBytes[path] += " ";
    assert.throws(
      () => buildHongKongEaseExact3Phase2BCanonical241CandidateFromInputs(inputs),
      /PHASE2B6_FUTURE_SOURCE_DRIFT/
    );
  }
});

test("Phase2B canonical candidate materializes two runner postimages, one lesson-contract postimage, and one HOLD authority", () => {
  const before = liveInventory();
  const candidate = materializeHongKongEaseExact3Phase2BCanonical241Candidate();
  const files = readdirSync(HONG_KONG_EASE_EXACT3_PHASE2B_CANONICAL241_CANDIDATE_DIRECTORY).sort();
  assert.deepEqual(
    files,
    [
      ...candidate.postimageBindings.map((binding) => binding.snapshotPath.split("/").at(-1) as string),
      candidate.lessonContractTransitionPreimage.snapshotPath.split("/").at(-1) as string,
      "canonical241-hold-authority-v1.json"
    ].sort()
  );
  for (const file of files) {
    const stat = lstatSync(join(HONG_KONG_EASE_EXACT3_PHASE2B_CANONICAL241_CANDIDATE_DIRECTORY, file));
    assert.equal(stat.isFile(), true, `${file}: regular file`);
    assert.equal(stat.isSymbolicLink(), false, `${file}: no symlink`);
    assert.equal(stat.mode & 0o777, 0o444, `${file}: immutable mode`);
  }
  assert.deepEqual(liveInventory(), before);
});
