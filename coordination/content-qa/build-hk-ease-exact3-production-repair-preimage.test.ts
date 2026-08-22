import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";

const builderPath = resolve(
  process.cwd(),
  "coordination/content-qa/build-hk-ease-exact3-production-repair-preimage.ts"
);

const PHASE1_SOURCE_PATHS = [
  "data/generated-content/hk-ease-practice-bank-v2/question-pack.json",
  "data/generated-content/hk-ease-practice-bank-v2/response-contracts.json",
  "data/generated-content/hk-ease-practice-bank-v2/response-contract-audit.json",
  "data/historical/hongKongQuestionVersionManifest.json",
  "data/historical/hongKongQuestions-hk-ease-39847.json",
  "data/historical/hongKongQuestions-3f8f12c4.json"
] as const;

const RELOCATED_SOURCE_PATHS = [
  {
    logicalPath: PHASE1_SOURCE_PATHS[0],
    sha256: "fa5b861a84a502725b9286d71961bd27a58bf6bf09e4d2412b7f4b1a1aca03e2"
  },
  {
    logicalPath: PHASE1_SOURCE_PATHS[1],
    sha256: "06c1bc402b6d16b0d453743a001cc164bd68aa9128f6bddd744efabfa8006ab4"
  },
  {
    logicalPath: PHASE1_SOURCE_PATHS[2],
    sha256: "3ae431cd883638f2a60924816353540bfead2a11463558417b690caf11986a28"
  },
  {
    logicalPath: PHASE1_SOURCE_PATHS[3],
    sha256: "f0cfaeaf745325d6b8e99353082f7e0be9d63fdb2cb18db0d3b7568c0415af92"
  }
] as const;

function phase1FixtureRoot() {
  const configured = process.env.TMPDIR;
  assert.ok(configured, "runner must configure a unique Starship TMPDIR");
  const physical = realpathSync(configured);
  assert.match(physical, /^\/Volumes\/Starship\//, "TMPDIR must remain on Starship");
  return mkdtempSync(join(physical, "hk-ease-exact3-phase1-relocation-"));
}

function copyIntoFixture(fixtureRoot: string, relativePath: string) {
  const output = resolve(fixtureRoot, relativePath);
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, readFileSync(resolve(process.cwd(), relativePath)), { flag: "wx" });
}

test("the exact3 preimage authority is deterministic and binds every frozen source", async () => {
  assert.equal(existsSync(builderPath), true, "exact3 preimage builder must exist");
  if (!existsSync(builderPath)) return;

  const builder = await import(pathToFileURL(builderPath).href) as {
    buildHongKongEaseExact3ProductionRepairPreimage: (root: string) => Record<string, unknown>;
    serializeHongKongEaseExact3ProductionRepairPreimage: (root: string) => string;
  };
  assert.equal(typeof builder.buildHongKongEaseExact3ProductionRepairPreimage, "function");
  assert.equal(typeof builder.serializeHongKongEaseExact3ProductionRepairPreimage, "function");

  const first = builder.buildHongKongEaseExact3ProductionRepairPreimage(process.cwd());
  const second = builder.buildHongKongEaseExact3ProductionRepairPreimage(process.cwd());
  assert.deepEqual(second, first);
  assert.equal(
    builder.serializeHongKongEaseExact3ProductionRepairPreimage(process.cwd()),
    `${JSON.stringify(first, null, 2)}\n`
  );

  assert.equal(first.schemaVersion, "hk-ease-exact3-production-repair-preimage-v1");
  assert.equal(first.decision, "needs-repair-do-not-promote-v2");
  assert.equal(
    first.runtimePreRepairSha256,
    "af8679b39dce192bcce8c7c18724e5c6538f56e5ec1ce2529bcdb2a1bd51ee91"
  );
  assert.deepEqual(first.orderedBaseIds, ["hk-ease-10481", "hk-ease-10496", "hk-ease-1041"]);
  assert.deepEqual(first.sourceFileSha256ByPath, {
    "data/generated-content/hk-ease-practice-bank-v2/question-pack.json":
      "fa5b861a84a502725b9286d71961bd27a58bf6bf09e4d2412b7f4b1a1aca03e2",
    "data/generated-content/hk-ease-practice-bank-v2/response-contracts.json":
      "06c1bc402b6d16b0d453743a001cc164bd68aa9128f6bddd744efabfa8006ab4",
    "data/generated-content/hk-ease-practice-bank-v2/response-contract-audit.json":
      "3ae431cd883638f2a60924816353540bfead2a11463558417b690caf11986a28",
    "data/historical/hongKongQuestionVersionManifest.json":
      "f0cfaeaf745325d6b8e99353082f7e0be9d63fdb2cb18db0d3b7568c0415af92",
    "data/historical/hongKongQuestions-hk-ease-39847.json":
      "8c6fed873fdb520eecf985074fcb5eb32fb36a01c66c48a4afbb394f121f66d1",
    "data/historical/hongKongQuestions-3f8f12c4.json":
      "75af1eb004c8834136eed5307b25c229bc050f473638d1cc476dfca7c81593fd"
  });
  assert.deepEqual(first.dependentArtifactPaths, {
    immutablePreimages: [
      "data/historical/hongKongQuestions-3f8f12c4.json",
      "data/historical/hongKongQuestions-hk-ease-39847.json"
    ],
    atomicPhase2Mutation: [
      "data/generated-content/hk-ease-practice-bank-v2/question-pack.json",
      "data/generated-content/hk-ease-practice-bank-v2/response-contracts.json",
      "data/generated-content/hk-ease-practice-bank-v2/response-contract-audit.json",
      "data/historical/hongKongQuestionVersionManifest.json",
      "lib/server/hongKongEaseResponseContracts.ts",
      "lib/server/hongKongEaseResponseContracts.test.ts",
      "lib/hongKongQuestionVersioning.ts",
      "lib/hongKongQuestionVersioning.test.ts",
      "lib/hongKongQuestionVersioningContract.ts"
    ],
    downstreamRebuildAndRegression: [
      "data/hongKongEasePracticeQuestions.ts",
      "data/questions.ts",
      "data/generated-content/hk-ease-practice-bank-v2/independent-answer-oracle-v4.json",
      "coordination/content-qa/build-hk-ease-independent-oracle-v4.ts",
      "lib/hongKongEaseIndependentOracleV4.ts",
      "lib/hongKongEaseIndependentOracleV4.test.ts",
      "lib/server/hongKongHistoricalQuestionProjection.ts",
      "lib/server/hongKongHistoricalQuestionProjection.test.ts",
      "lib/fullQuestionBankSolvability.test.ts",
      "coordination/content-qa/hk-question-bank-evidence-runner.mjs",
      "coordination/content-qa/hk-question-bank-evidence-runner.test.mjs"
    ],
    versionManifestProvenanceConsumers: [
      "coordination/content-qa/hongKongResidual28Provenance.ts",
      "lib/hongKongResidual47RepairContract.test.ts"
    ]
  });

  const rows = first.rows as Array<Record<string, unknown>>;
  assert.equal(rows.length, 3);
  for (const [index, baseId] of (first.orderedBaseIds as string[]).entries()) {
    assert.equal(rows[index].baseId, baseId);
    assert.equal(rows[index].activePreimageId, `${baseId}-v2`);
    assert.equal(rows[index].requiredSuccessorId, `${baseId}-v3`);
    assert.equal(rows[index].frozenV2HistoryStatus, "immutable-do-not-edit");
    assert.match(String(rows[index].rowPreimageSha256), /^[0-9a-f]{64}$/);
  }

  const payload = { ...first };
  delete payload.authorityPayloadSha256;
  assert.equal(
    first.authorityPayloadSha256,
    createHash("sha256").update(JSON.stringify(payload)).digest("hex")
  );
});

test("the exact3 Phase1 authority rebuilds from immutable relocations after live-source drift", async () => {
  assert.equal(existsSync(builderPath), true, "exact3 preimage builder must exist");
  if (!existsSync(builderPath)) return;
  const builder = await import(pathToFileURL(builderPath).href) as {
    serializeHongKongEaseExact3ProductionRepairPreimage: (root: string) => string;
  };
  const expected = builder.serializeHongKongEaseExact3ProductionRepairPreimage(process.cwd());
  const fixtureRoot = phase1FixtureRoot();
  try {
    for (const sourcePath of PHASE1_SOURCE_PATHS) copyIntoFixture(fixtureRoot, sourcePath);
    for (const relocation of RELOCATED_SOURCE_PATHS) {
      const snapshotPath =
        `coordination/content-qa/authoritative/hk-ease-exact3-production-repair/preimages/sha256/${relocation.sha256}.json`;
      copyIntoFixture(fixtureRoot, snapshotPath);
      writeFileSync(resolve(fixtureRoot, relocation.logicalPath), "deliberate live-source drift\n");
    }
    assert.equal(
      builder.serializeHongKongEaseExact3ProductionRepairPreimage(fixtureRoot),
      expected,
      "Phase1 authority must reconstruct from immutable bytes, not mutable live paths"
    );
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: false });
  }
});
