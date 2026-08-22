import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";

type JsonRecord = Record<string, any>;

const BUILDER_PATH =
  "coordination/content-qa/build-hk-ease-exact3-phase2b-data-plane-candidate.ts";
const RECEIPT_PATH =
  "coordination/content-qa/authoritative/hk-ease-exact3-production-repair/phase2b-independent-oracle-overlay-review-v2.json";
const RECEIPT_SHA256 =
  "0aacfce318a7839f44beba7d3d5f6722e11a129b4ee6f8a3ac770b712382cd2e";
const RECEIPT_DETACHED_SHA256 =
  "c0387a5f0ea824510ab24d84f8e062a289354e8731caa3acde9320f30ecd825b";
const CANDIDATE_DIRECTORY =
  "coordination/content-qa/authoritative/hk-ease-exact3-production-repair/phase2b-data-plane-candidate";
const DATA_OUTPUT_PATHS = [
  `${CANDIDATE_DIRECTORY}/full-question-pack-base-id-v1.json`,
  `${CANDIDATE_DIRECTORY}/full-response-contract-audit-v1.json`,
  `${CANDIDATE_DIRECTORY}/full-strict-response-contracts-v1.json`,
  `${CANDIDATE_DIRECTORY}/full-simple-response-contracts-v1.json`,
  `${CANDIDATE_DIRECTORY}/independent-answer-oracle-exact3-overlay-supplement-v2.json`,
  `${CANDIDATE_DIRECTORY}/v3-history-v1.json`,
  `${CANDIDATE_DIRECTORY}/full-question-version-manifest-v1.json`
] as const;
const AUTHORITY_PATH = `${CANDIDATE_DIRECTORY}/candidate-hold-authority-v1.json`;

const EXPECTED_FIXED_OUTPUTS: Record<string, { sha256: string; byteLength: number }> = {
  [DATA_OUTPUT_PATHS[0]]: {
    sha256: "afed98f9aca07951dffbc6ac8ce93bb6074629298c80ac848842bd7792fd7bdf",
    byteLength: 1_435_398
  },
  [DATA_OUTPUT_PATHS[1]]: {
    sha256: "3f5671299ecb88fd58e0d22c6241737a27cd7d3a1e8332da989eea1f3b15010a",
    byteLength: 890_576
  },
  [DATA_OUTPUT_PATHS[2]]: {
    sha256: "86333f5482a6a90da42c4ae12d575df8e2859409ff12de18032122a6c67c2b2c",
    byteLength: 298_862
  },
  [DATA_OUTPUT_PATHS[3]]: {
    sha256: "d5f226b600e98cd4cfa1df6497137a0844e0f9685d8f87e4a6e1130aaa5c3d41",
    byteLength: 1_259_409
  },
  [DATA_OUTPUT_PATHS[5]]: {
    sha256: "e5a696da5e8d5e1cc31259a6736d6d9974c08fdf25a57298a6958ffcd11b440b",
    byteLength: 13_338
  },
  [DATA_OUTPUT_PATHS[6]]: {
    sha256: "abf8da2300978b554efa07d96c5b70e721a9f0977e190a3f86105388591dfe8d",
    byteLength: 84_368
  }
};

const FORBIDDEN_LIVE_INVENTORY = [
  ["data/generated-content/hk-ease-practice-bank-v2/question-pack.json",
    "fa5b861a84a502725b9286d71961bd27a58bf6bf09e4d2412b7f4b1a1aca03e2"],
  ["data/generated-content/hk-ease-practice-bank-v2/response-contract-audit.json",
    "3ae431cd883638f2a60924816353540bfead2a11463558417b690caf11986a28"],
  ["data/generated-content/hk-ease-practice-bank-v2/response-contracts.json",
    "06c1bc402b6d16b0d453743a001cc164bd68aa9128f6bddd744efabfa8006ab4"],
  ["data/generated-content/hk-ease-practice-bank-v2/simple-response-contracts.json",
    "fdb823e7e0923eff7cabb569e171680965dfa6d1e9edce36567fb4bf24ebc597"],
  ["data/generated-content/hk-ease-practice-bank-v2/independent-answer-oracle.json",
    "8436f0c97fafe803f8fe6930cfa65f6363c4cb05174f7a2e7465d688a29d0d62"],
  ["data/historical/hongKongQuestions-hk-ease-39847.json",
    "8c6fed873fdb520eecf985074fcb5eb32fb36a01c66c48a4afbb394f121f66d1"],
  ["data/historical/hongKongQuestionVersionManifest.json",
    "f0cfaeaf745325d6b8e99353082f7e0be9d63fdb2cb18db0d3b7568c0415af92"],
  ["data/questions.ts",
    "96d90f3c090b14bd7797155ffcbb20edcbf2230147a945f6c02ec32a470dbca8"],
  ["data/hongKongEasePracticeQuestions.ts",
    "01bf8aef5f76dfa46d17b357b110957fa551ba12fd98027315a1a8e825f40137"],
  ["data/generated-content/hk-ease-practice-bank-v2/independent-answer-oracle-v4.json",
    "8f306dc2d34b3595e70c0f8ef55345dc321fdae97278cb404d499d40635e2e9d"],
  ["lib/hongKongEaseIndependentOracleV4.ts",
    "11c46a9ed03fe592065db05e579165c9a5bf65a660be948d6d582cf10dd5be8c"],
  ["lib/hongKongEaseIndependentOracleV4.test.ts",
    "cf8fc58da712b3fa277c34cf940a5c434ab48712ce4932e09e0de987cd945472"],
  ["lib/server/hongKongEaseResponseContracts.ts",
    "1ebefbb799f3f5b64f57ae9beff0f5641939eb5ea6f81aa93f5fe9fc21def3f1"],
  ["lib/fullQuestionBankSolvability.test.ts",
    "f964d1f2d11dbd5eeb8c1ebf2aea5a3bdf73d73189ed511fa68dc09d2ebe984c"],
  ["coordination/content-qa/hk-question-bank-evidence-runner.mjs",
    "7288e9d91fe6e6057b22a2c5d35c2237bd07588ace11d8141729c539f64f052d"]
] as const;

type BuilderModule = {
  HK_EASE_EXACT3_PHASE2B_DATA_OUTPUT_PATHS: readonly string[];
  HK_EASE_EXACT3_PHASE2B_AUTHORITY_PATH: string;
  HK_EASE_EXACT3_PHASE2B_REQUIRED_INPUT_PATHS: readonly string[];
  HK_EASE_EXACT3_PHASE2B_FORBIDDEN_LIVE_PATHS: readonly string[];
  readHongKongEaseExact3Phase2BDataPlaneInputs: (root: string) => JsonRecord;
  buildHongKongEaseExact3Phase2BDataPlaneCandidateFromInputs: (
    root: string,
    inputs: JsonRecord
  ) => JsonRecord;
  buildHongKongEaseExact3Phase2BDataPlaneCandidate: (root: string) => JsonRecord;
  serializeHongKongEaseExact3Phase2BDataPlaneCandidate: (
    root: string
  ) => Record<string, string>;
  verifyHongKongEaseExact3Phase2BForbiddenLiveInventory: (root: string) => void;
};

function sha256(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

async function loadBuilder() {
  const absolute = resolve(process.cwd(), BUILDER_PATH);
  assert.equal(existsSync(absolute), true, "Phase2B.1 data-plane builder must exist");
  if (!existsSync(absolute)) return null;
  return await import(pathToFileURL(absolute).href) as BuilderModule;
}

function assertThrowsCode(callback: () => unknown, code: RegExp) {
  assert.throws(callback, code);
}

test("Phase2B.1 binds the immutable independent receipt with all exact 35 surfaces and 30 negatives", () => {
  const absolute = resolve(process.cwd(), RECEIPT_PATH);
  assert.equal(existsSync(absolute), true);
  const stat = lstatSync(absolute);
  assert.equal(stat.isFile(), true);
  assert.equal(stat.isSymbolicLink(), false);
  assert.equal(stat.mode & 0o777, 0o444);
  const bytes = readFileSync(absolute);
  assert.equal(sha256(bytes), RECEIPT_SHA256);
  const receipt = JSON.parse(bytes.toString("utf8"));
  assert.deepEqual(Object.keys(receipt), [
    "schemaVersion", "status", "detachedPayloadBinding", "reviewPayload"
  ]);
  assert.equal(
    receipt.schemaVersion,
    "hk-ease-exact3-phase2b-independent-oracle-overlay-review-v2"
  );
  assert.equal(
    receipt.status,
    "independent-review-approved-for-candidate-overlay-not-live-promotion"
  );
  const detached = {
    schemaVersion: receipt.schemaVersion,
    status: receipt.status,
    reviewPayload: receipt.reviewPayload
  };
  assert.equal(sha256(JSON.stringify(detached)), RECEIPT_DETACHED_SHA256);
  assert.equal(receipt.detachedPayloadBinding.sha256, RECEIPT_DETACHED_SHA256);
  assert.deepEqual(receipt.reviewPayload.targetCoordinateBinding.orderedBaseIds,
    ["hk-ease-10481", "hk-ease-10496", "hk-ease-1041"]);
  assert.deepEqual(receipt.reviewPayload.targetCoordinateBinding.sourceIndicesZeroBased,
    [187, 188, 693]);
  assert.equal(
    receipt.reviewPayload.rowReviews.reduce(
      (sum: number, row: JsonRecord) => sum + row.acceptedAnswers.length,
      0
    ),
    35
  );
  assert.equal(
    receipt.reviewPayload.rowReviews.reduce(
      (sum: number, row: JsonRecord) => sum + row.negativeProbeReview.probes.length,
      0
    ),
    30
  );
  assert.deepEqual(
    receipt.reviewPayload.rowReviews.map(
      (row: JsonRecord) => row.calculationDisposition.calculationIsStrictNegative
    ),
    [true, true, false]
  );
  assert.equal(receipt.reviewPayload.independencePolicy.selfGeneratedReviewEvidenceForbidden, true);
  assert.equal(receipt.reviewPayload.promotionBoundary.livePromotionAuthorized, false);
  for (const key of ["oldV3Oracle", "oldQuestionPack"]) {
    const binding = receipt.reviewPayload.sourceBindings[key];
    assert.equal(binding.dualKeyResolutionPolicy.preimageAuthority, "immutableSnapshot");
    assert.equal(binding.dualKeyResolutionPolicy.livePathFallbackAllowed, false);
    const snapshot = resolve(process.cwd(), binding.immutableSnapshot.physicalPath);
    assert.equal(lstatSync(snapshot).isSymbolicLink(), false);
    assert.equal(sha256(readFileSync(snapshot)), binding.sha256);
  }
});

test("Phase2B.1 deterministically builds exactly seven data artifacts plus one HOLD authority", async () => {
  const builder = await loadBuilder();
  if (!builder) return;
  assert.deepEqual(builder.HK_EASE_EXACT3_PHASE2B_DATA_OUTPUT_PATHS, DATA_OUTPUT_PATHS);
  assert.equal(builder.HK_EASE_EXACT3_PHASE2B_AUTHORITY_PATH, AUTHORITY_PATH);
  assert.deepEqual(
    builder.HK_EASE_EXACT3_PHASE2B_FORBIDDEN_LIVE_PATHS,
    FORBIDDEN_LIVE_INVENTORY.map(([path]) => path)
  );
  assert.equal(new Set(builder.HK_EASE_EXACT3_PHASE2B_REQUIRED_INPUT_PATHS).size,
    builder.HK_EASE_EXACT3_PHASE2B_REQUIRED_INPUT_PATHS.length);

  const first = builder.buildHongKongEaseExact3Phase2BDataPlaneCandidate(process.cwd());
  const second = builder.buildHongKongEaseExact3Phase2BDataPlaneCandidate(process.cwd());
  assert.deepEqual(second, first);
  const serialized = builder.serializeHongKongEaseExact3Phase2BDataPlaneCandidate(process.cwd());
  assert.deepEqual(Object.keys(serialized), [...DATA_OUTPUT_PATHS, AUTHORITY_PATH]);
  for (const [path, expected] of Object.entries(EXPECTED_FIXED_OUTPUTS)) {
    assert.equal(Buffer.byteLength(serialized[path]), expected.byteLength, path);
    assert.equal(sha256(serialized[path]), expected.sha256, path);
  }

  const pack = JSON.parse(serialized[DATA_OUTPUT_PATHS[0]]);
  assert.equal(pack.questions.length, 701);
  assert.deepEqual([187, 188, 693].map((index) => pack.questions[index].id),
    ["hk-ease-10481", "hk-ease-10496", "hk-ease-1041"]);
  assert.equal(sha256(JSON.stringify(pack.questions)),
    "bc57bebd917273b506f8a778a388995896f7f5e3c063e598e1542a9767837397");

  const audit = JSON.parse(serialized[DATA_OUTPUT_PATHS[1]]);
  assert.equal(audit.entries.length, 344);
  assert.equal(audit.coverage.positiveProbeCount, 584);
  assert.equal(audit.coverage.negativeProbeCount, 581);
  assert.equal(audit.coverage.positiveProbeInventorySha256,
    "af50312a607d02244e3733bfa192a80f5dc5ffd53c1d0e186497a9759de9c2e9");
  assert.equal(audit.coverage.negativeProbeInventorySha256,
    "3463a895a11ec4053753c52aa8cd77e91e992b3107a1c89c05f069a6fcc242ce");

  const strict = JSON.parse(serialized[DATA_OUTPUT_PATHS[2]]);
  assert.equal(strict.strictContractCount, 344);
  assert.equal(strict.positiveProbeCount, 584);
  assert.equal(strict.negativeProbeCount, 581);

  const simple = JSON.parse(serialized[DATA_OUTPUT_PATHS[3]]);
  assert.equal(simple.reviewedSimpleQuestionCount, 357);
  assert.equal(simple.strictQuestionCount, 344);
  assert.equal(simple.declaredSimpleLedgerSha256,
    "11ad86d97706a08379df4b75630bfe35e73a7e2dba257ce0e435044d03784284");
  assert.equal(sha256(JSON.stringify(simple.entries)),
    "ad6d682286d466838772749832917c710567b82933b093077f7c1fca7a1692fa");

  const overlay = JSON.parse(serialized[DATA_OUTPUT_PATHS[4]]);
  assert.equal(overlay.status, "candidate-overlay-approved-not-live-promotion");
  assert.equal(overlay.questions.length, 3);
  assert.equal(sha256(JSON.stringify(overlay.questions)),
    "53029136ba4f0b57a590bd6c1c54df3eff4aef3483cc6e15c68067a6098b79d3");
  assert.deepEqual(overlay.questions.map((row: JsonRecord) => row.questionObjectSha256), [
    "c5f21c907bf74408e75a0ca2237d72d4c859f3cec43b1d4c1b143322b5d1e4f7",
    "04dee736b973cd14cf93a23840b8f4c7301a9db0ec2a0517d1b2382657981bf8",
    "8f7255c66067c2c1b777a4733cea48ad8f5267ebebbc15d51b2b8e62965d2f6e"
  ]);

  const manifest = JSON.parse(serialized[DATA_OUTPUT_PATHS[6]]);
  assert.equal(Object.keys(manifest.activeIdByHistoricalId).length, 1111);
  assert.equal(manifest.retiredHistoricalIds.length, 1112);
  for (const baseId of ["hk-ease-10481", "hk-ease-10496", "hk-ease-1041"]) {
    assert.equal(manifest.activeIdByHistoricalId[baseId], `${baseId}-v3`);
    assert.equal(manifest.activeIdByHistoricalId[`${baseId}-v2`], `${baseId}-v3`);
    assert.equal(manifest.activeIdByHistoricalId[`${baseId}-v3`], undefined);
    assert.equal(manifest.retiredHistoricalIds.includes(`${baseId}-v3`), false);
  }

  assert.equal(first.authority.status, "candidate-hold-not-promotable-until-phase3");
  assert.equal(first.authority.promotion.livePromotionAuthorized, false);
  assert.equal(first.authority.promotion.runtimeDispatchAuthorized, false);
  assert.equal(first.authority.promotion.releaseAuthorized, false);
});

test("Phase2B.1 fails closed on receipt, normalized-row, oracle, audit, and manifest drift", async () => {
  const builder = await loadBuilder();
  if (!builder) return;
  const inputs = builder.readHongKongEaseExact3Phase2BDataPlaneInputs(process.cwd());
  const mutations: Array<[string, (candidate: JsonRecord) => void, RegExp]> = [
    ["receipt reviewer", (candidate) => {
      candidate.independentReceipt.reviewPayload.reviewer.reviewerIsCandidateBuilder = true;
    }, /PHASE2B_INDEPENDENT_RECEIPT_INVALID/],
    ["receipt surface", (candidate) => {
      candidate.independentReceipt.reviewPayload.rowReviews[0].acceptedAnswers.pop();
    }, /PHASE2B_INDEPENDENT_RECEIPT_INVALID/],
    ["raw successor", (candidate) => {
      candidate.phase2aQuestionRows.questions[0].answer = "forged";
    }, /PHASE2B_PINNED_INPUT_DRIFT/],
    ["old oracle preserved field", (candidate) => {
      candidate.oldV3Oracle.questions[187].independentCalculationAnswer = "forged";
    }, /PHASE2B_PINNED_INPUT_DRIFT|PHASE2B_ORACLE_OVERLAY_INVALID/],
    ["old audit", (candidate) => {
      candidate.oldAudit.entries[0].positiveProbes = [];
    }, /PHASE2B_PINNED_INPUT_DRIFT/],
    ["old manifest", (candidate) => {
      candidate.oldVersionManifest.activeIdByHistoricalId["hk-ease-10481"] = "forged";
    }, /PHASE2B_PINNED_INPUT_DRIFT/]
  ];
  for (const [label, mutate, code] of mutations) {
    const candidate = clone(inputs);
    mutate(candidate);
    assertThrowsCode(
      () => builder.buildHongKongEaseExact3Phase2BDataPlaneCandidateFromInputs(
        process.cwd(),
        candidate
      ),
      code
    );
    assert.ok(label);
  }
});

test("Phase2B.1 pure reconstruction never mutates any forbidden live coordinate", async () => {
  const builder = await loadBuilder();
  if (!builder) return;
  const before = Object.fromEntries(FORBIDDEN_LIVE_INVENTORY.map(([path]) => [
    path,
    sha256(readFileSync(resolve(process.cwd(), path)))
  ]));
  builder.verifyHongKongEaseExact3Phase2BForbiddenLiveInventory(process.cwd());
  builder.buildHongKongEaseExact3Phase2BDataPlaneCandidate(process.cwd());
  builder.serializeHongKongEaseExact3Phase2BDataPlaneCandidate(process.cwd());
  builder.verifyHongKongEaseExact3Phase2BForbiddenLiveInventory(process.cwd());
  assert.deepEqual(
    Object.fromEntries(FORBIDDEN_LIVE_INVENTORY.map(([path]) => [
      path,
      sha256(readFileSync(resolve(process.cwd(), path)))
    ])),
    before
  );
});

test("Phase2B.1 checked-in candidate is exact, immutable, and contains no eighth data artifact", async () => {
  const builder = await loadBuilder();
  if (!builder) return;
  const expected = builder.serializeHongKongEaseExact3Phase2BDataPlaneCandidate(process.cwd());
  for (const path of [...DATA_OUTPUT_PATHS, AUTHORITY_PATH]) {
    const absolute = resolve(process.cwd(), path);
    assert.equal(existsSync(absolute), true, path);
    assert.equal(lstatSync(absolute).isSymbolicLink(), false, path);
    assert.equal(lstatSync(absolute).mode & 0o777, 0o444, path);
    assert.equal(readFileSync(absolute, "utf8"), expected[path], path);
  }
  assert.equal(Object.keys(expected).length, 8);
});
