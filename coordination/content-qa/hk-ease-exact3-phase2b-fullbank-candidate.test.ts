import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { lstatSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  HONG_KONG_EASE_EXACT3_PHASE2B_FULLBANK_CANDIDATE_DIRECTORY,
  buildHongKongEaseExact3Phase2BFullbankCandidate,
  buildHongKongEaseExact3Phase2BFullbankCandidateFromInputs,
  loadHongKongEaseExact3Phase2BFullbankCandidateInputs,
  materializeHongKongEaseExact3Phase2BFullbankCandidate
} from "./build-hk-ease-exact3-phase2b-fullbank-candidate";

const TARGETS = [
  "lib/questionBankSolvability.ts",
  "lib/hongKongEaseIndependentOracle.ts",
  "lib/fullQuestionBankSolvability.test.ts"
] as const;

const immutablePackPath =
  "coordination/content-qa/authoritative/hk-ease-exact3-production-repair/preimages/sha256/fa5b861a84a502725b9286d71961bd27a58bf6bf09e4d2412b7f4b1a1aca03e2.json";
const immutableAuditPath =
  "coordination/content-qa/authoritative/hk-ease-exact3-production-repair/preimages/sha256/3ae431cd883638f2a60924816353540bfead2a11463558417b690caf11986a28.json";
const immutableContractsPath =
  "coordination/content-qa/authoritative/hk-ease-exact3-production-repair/preimages/sha256/06c1bc402b6d16b0d453743a001cc164bd68aa9128f6bddd744efabfa8006ab4.json";

const sha256 = (value: string | Buffer) =>
  createHash("sha256").update(value).digest("hex");

const liveInventory = () => Object.fromEntries(
  TARGETS.map((path) => [path, sha256(readFileSync(join(process.cwd(), path)))])
);

test("Phase2B full-bank candidate closes the exact residual answer and immutable V3 replay gaps", () => {
  const candidate = buildHongKongEaseExact3Phase2BFullbankCandidate();
  assert.equal(candidate.status, "candidate-hold-not-live-promotion");
  assert.deepEqual(Object.keys(candidate.postimages), [...TARGETS]);

  const solvability = candidate.postimages["lib/questionBankSolvability.ts"];
  assert.match(
    solvability,
    /supp-p1-counting-number-bonds-common-check\tCheck whether the question asks for the number before, the number after, or a missing part/
  );
  assert.doesNotMatch(
    solvability,
    /supp-p1-counting-number-bonds-common-check\tCheck whether the missing number is before or after the given number/
  );

  const oracle = candidate.postimages["lib/hongKongEaseIndependentOracle.ts"];
  assert.match(oracle, new RegExp(immutablePackPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(oracle, new RegExp(immutableAuditPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(oracle, new RegExp(immutableContractsPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(
    oracle,
    /const questionPackPath = "data\/generated-content\/hk-ease-practice-bank-v2\/question-pack\.json"/
  );
  assert.match(
    oracle,
    /const physicalPath = HONG_KONG_EASE_INDEPENDENT_EVIDENCE_PHYSICAL_PATH_BY_LOGICAL_PATH\[relativePath\] \?\? relativePath;/
  );
  assert.match(oracle, /const questionPackBytes = evidenceBytes\(questionPackPath\);/);
  assert.doesNotMatch(
    oracle,
    /const questionPackBytes = readFileSync\(join\(process\.cwd\(\), questionPackPath\)\);/
  );

  const fullBank = candidate.postimages["lib/fullQuestionBankSolvability.test.ts"];
  assert.match(
    fullBank,
    /HONG_KONG_EASE_INDEPENDENT_EVIDENCE_PHYSICAL_PATH_BY_LOGICAL_PATH: Readonly<Record<string, string>>;/
  );
  assert.match(
    fullBank,
    /independentOracleBuilder\.HONG_KONG_EASE_INDEPENDENT_EVIDENCE_PHYSICAL_PATH_BY_LOGICAL_PATH\[relativePath\] \?\? relativePath/
  );
  assert.doesNotMatch(fullBank, /readFileSync\(join\(process\.cwd\(\), relativePath\)\)/);
  assert.match(fullBank, /HONG_KONG_EASE_EXACT3_ORACLE_OVERLAY_SHA256/);
  assert.match(fullBank, /const exact3OverlayById = new Map/);
  assert.match(fullBank, /acceptedAnswerFormsReviewed, 1912/);
  assert.match(fullBank, /calculationDifferenceCount, 167/);
  assert.match(fullBank, /strictNegativeCalculationCount, 64/);
  assert.match(fullBank, /structuredClone\(immutableV3QuestionPackJson\)/);
  assert.match(
    fullBank,
    /approved-for-integration-review-semantic-content-boundary\+exact3-independent-overlay-v2/
  );
  assert.match(fullBank, /assert\.equal\(expectedReviewedAnswer, question\.answer\)/);

  for (const binding of candidate.postimageBindings) {
    const bytes = candidate.postimages[binding.logicalTargetPath];
    assert.equal(sha256(bytes), binding.sha256);
    assert.equal(Buffer.byteLength(bytes, "utf8"), binding.byteLength);
    assert.notEqual(binding.preimageSha256, binding.sha256);
  }
});

test("Phase2B full-bank candidate rejects every source, predecessor authority, and immutable preimage drift", () => {
  for (const target of TARGETS) {
    const inputs = structuredClone(loadHongKongEaseExact3Phase2BFullbankCandidateInputs());
    inputs.sourcePreimages[target] += "\n// drift";
    assert.throws(
      () => buildHongKongEaseExact3Phase2BFullbankCandidateFromInputs(inputs),
      /PHASE2B5_SOURCE_PREIMAGE_DRIFT/
    );
  }

  for (const authorityName of ["dataPlane", "runtime", "historicalRegression", "v4Lineage"] as const) {
    const inputs = structuredClone(loadHongKongEaseExact3Phase2BFullbankCandidateInputs());
    inputs.priorAuthorities[authorityName].status = "forged";
    assert.throws(
      () => buildHongKongEaseExact3Phase2BFullbankCandidateFromInputs(inputs),
      /PHASE2B5_PRIOR_AUTHORITY_DRIFT/
    );
  }

  for (const preimageName of ["questionPack", "responseAudit", "responseContracts"] as const) {
    const inputs = structuredClone(loadHongKongEaseExact3Phase2BFullbankCandidateInputs());
    inputs.immutablePreimages[preimageName] += " ";
    assert.throws(
      () => buildHongKongEaseExact3Phase2BFullbankCandidateFromInputs(inputs),
      /PHASE2B5_IMMUTABLE_PREIMAGE_DRIFT/
    );
  }
});

test("Phase2B full-bank candidate materializes only three immutable postimages plus one HOLD authority", () => {
  const before = liveInventory();
  const candidate = materializeHongKongEaseExact3Phase2BFullbankCandidate();
  const files = readdirSync(HONG_KONG_EASE_EXACT3_PHASE2B_FULLBANK_CANDIDATE_DIRECTORY).sort();
  assert.deepEqual(
    files,
    [
      ...candidate.postimageBindings.map((binding) => binding.snapshotPath.split("/").at(-1) as string),
      "fullbank-hold-authority-v1.json"
    ].sort()
  );
  for (const file of files) {
    const stat = lstatSync(join(HONG_KONG_EASE_EXACT3_PHASE2B_FULLBANK_CANDIDATE_DIRECTORY, file));
    assert.equal(stat.isFile(), true, `${file}: regular file`);
    assert.equal(stat.isSymbolicLink(), false, `${file}: no symlink`);
    assert.equal(stat.mode & 0o777, 0o444, `${file}: immutable mode`);
  }
  assert.deepEqual(liveInventory(), before);
});
