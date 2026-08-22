import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import semanticReauditV3Json from "./authoritative/2026-08-13-hk-residual28-semantic-reaudit-v3.json";
import repairContractJson from "./authoritative/2026-08-13-hk-residual28-repair-contract.json";
import { readHongKongResidual28ReconstructionSource } from "./hongKongResidual28Provenance";

const SUPERSEDED_REPAIR_CONTRACT_SHA256 =
  "3dca07ca1d34af54e09444c462d41671b8dfbc3dd340ea4a24960e1334816235";
const SEMANTIC_REAUDIT_V2_SHA256 =
  "e7770b90edb29e3aa3fea35ab6ded53b84ebaa607122c21ef9a90c96cd23bbec";
const SEMANTIC_REAUDIT_V3_SHA256 =
  "e8bbb5926275c612e025c75da1ebb7c63aa35c2f3b753a908948d7a90ad47dc3";
const QUESTIONS_PREIMAGE_PATH =
  "coordination/content-qa/authoritative/2026-08-13-data-questions-residual28-preimage.txt";
const QUESTIONS_PREIMAGE_SHA256 =
  "24ec6fb77921f0d22a8281179ac3a07f55817351ad31894a94cf72cfa5cc8f7a";
const CURRENT_QUESTIONS_SHA256 =
  "96d90f3c090b14bd7797155ffcbb20edcbf2230147a945f6c02ec32a470dbca8";
const CURRENT_VERSION_MANIFEST_SHA256 =
  "f0cfaeaf745325d6b8e99353082f7e0be9d63fdb2cb18db0d3b7568c0415af92";
const CURRENT_VERSION_MANIFEST_PATH =
  "data/historical/hongKongQuestionVersionManifest.json";
const RESIDUAL47_LEDGER_V2_PATH =
  "coordination/content-qa/authoritative/2026-08-13-hk-residual47-adjudication-ledger-v2.json";
const RESIDUAL47_LEDGER_V2_SHA256 =
  "0879eb17b5c65ac76a38f311972f279e1c47d6c3b2c8dec22aabea6af830716c";
const RESIDUAL28_PREIMAGE_SNAPSHOT_PATH =
  "data/historical/hongKongQuestions-residual28-preimage-20260813.json";
const RESIDUAL28_PREIMAGE_SNAPSHOT_SHA256 =
  "8f9cc79f256fec67f1818942c4aaab3d00fbdbb87c465869f4ed4e4675494059";

type ReplacementRow = {
  fromId: string;
  baseId: string;
  toId: string;
  preimageQuestionPayloadSha256: string;
  allowedPaths: string[];
  replacements: Record<string, string>;
};

type SemanticReauditRow = {
  toId: string;
  semanticCategory: string;
  issueCodes: string[];
  allowedPaths: string[];
  replacements: Record<string, string>;
};

function sha256(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

function fileSha(repositoryRoot: string, relativePath: string) {
  return sha256(readFileSync(join(repositoryRoot, relativePath)));
}

export function buildSupersededHongKongResidual28RepairContract(repositoryRoot?: string) {
  const root = repositoryRoot ?? process.cwd();
  const relativePath =
    "coordination/content-qa/authoritative/2026-08-13-hk-residual28-repair-contract-v1-superseded.json";
  const bytes = readFileSync(join(root, relativePath));
  assert.equal(sha256(bytes), SUPERSEDED_REPAIR_CONTRACT_SHA256);
  return JSON.parse(bytes.toString("utf8"));
}

export function buildHongKongResidual28RepairContract(repositoryRoot?: string) {
  const root = repositoryRoot ?? process.cwd();
  const superseded = buildSupersededHongKongResidual28RepairContract(root);
  const supersededBytes = `${JSON.stringify(superseded, null, 2)}\n`;
  assert.equal(sha256(supersededBytes), SUPERSEDED_REPAIR_CONTRACT_SHA256);
  assert.equal(
    fileSha(root, "coordination/content-qa/authoritative/2026-08-13-hk-residual28-semantic-reaudit-v2.json"),
    SEMANTIC_REAUDIT_V2_SHA256
  );
  assert.equal(
    fileSha(root, "coordination/content-qa/authoritative/2026-08-13-hk-residual28-semantic-reaudit-v3.json"),
    SEMANTIC_REAUDIT_V3_SHA256
  );
  assert.equal(fileSha(root, QUESTIONS_PREIMAGE_PATH), QUESTIONS_PREIMAGE_SHA256);
  assert.equal(fileSha(root, RESIDUAL47_LEDGER_V2_PATH), RESIDUAL47_LEDGER_V2_SHA256);
  assert.equal(fileSha(root, RESIDUAL28_PREIMAGE_SNAPSHOT_PATH), RESIDUAL28_PREIMAGE_SNAPSHOT_SHA256);
  assert.equal(fileSha(root, "data/questions.ts"), CURRENT_QUESTIONS_SHA256);
  const boundVersionManifest = readHongKongResidual28ReconstructionSource({
    repositoryRoot: root,
    sourcePostimagePath: CURRENT_VERSION_MANIFEST_PATH,
    sourcePostimageSha256: CURRENT_VERSION_MANIFEST_SHA256
  });
  assert.equal(
    sha256(boundVersionManifest.bytes),
    CURRENT_VERSION_MANIFEST_SHA256
  );

  const semanticReaudit = semanticReauditV3Json as typeof semanticReauditV3Json & {
    rows: SemanticReauditRow[];
  };
  assert.equal(
    semanticReaudit.supersedes.repairContractPath,
    "coordination/content-qa/authoritative/2026-08-13-hk-residual28-repair-contract-v1-superseded.json"
  );
  assert.equal(
    semanticReaudit.supersedes.repairContractSha256,
    SUPERSEDED_REPAIR_CONTRACT_SHA256
  );
  assert.equal(
    fileSha(root, semanticReaudit.supersedes.repairContractPath),
    semanticReaudit.supersedes.repairContractSha256
  );
  assert.equal(semanticReaudit.rows.length, 11);
  assert.equal(new Set(semanticReaudit.rows.map((row) => row.toId)).size, 11);
  const issueCodes = semanticReaudit.rows.flatMap((row) => row.issueCodes);
  assert.equal(issueCodes.length, 13);
  assert.equal(new Set(issueCodes).size, 13);
  const semanticCategories = semanticReaudit.rows.map((row) => row.semanticCategory);
  assert.equal(semanticCategories.length, 11);
  assert.equal(new Set(semanticCategories).size, 11);
  assert.equal(semanticReaudit.counts.semanticCategories, semanticCategories.length);
  assert.ok(semanticCategories.every((category) => typeof category === "string" && category.trim() === category && category.length > 0));
  const supersessionReason =
    `Independent semantic re-audit corrected exact-eleven successor rows covering ${semanticCategories.join(", ")} while preserving frozen v2 preimages and v3 generation IDs.`;

  const semanticByToId = new Map(semanticReaudit.rows.map((row) => [row.toId, row] as const));
  const repairs = (superseded.repairs as ReplacementRow[]).map((repair) => {
    const semantic = semanticByToId.get(repair.toId);
    if (!semantic) return repair;
    assert.deepEqual([...semantic.allowedPaths].sort(), Object.keys(semantic.replacements).sort());
    semanticByToId.delete(repair.toId);
    return {
      ...repair,
      allowedPaths: semantic.allowedPaths,
      replacements: semantic.replacements
    };
  });
  assert.deepEqual([...semanticByToId.keys()], [], "semantic report contains an unknown or duplicate target");

  const changedPathCount = repairs.reduce((count, repair) => count + repair.allowedPaths.length, 0);
  const answerAndOptionRows = repairs.filter((repair) => repair.allowedPaths.includes("answer")).length;
  const distractorOptionRows = repairs.filter((repair) =>
    repair.allowedPaths.some((path) => /^options\[(?!0\])\d+]\.(?:en|zh)$/.test(path))
  ).length;
  const {
    preimageVersionManifestPath,
    preimageVersionManifestSha256,
    ...supersededSourceSnapshot
  } = superseded.sourceSnapshot;

  return {
    ...superseded,
    authority: {
      adjudicationLedgerPath: RESIDUAL47_LEDGER_V2_PATH,
      adjudicationLedgerSha256: RESIDUAL47_LEDGER_V2_SHA256,
      supersededAdjudicationLedgerPath: superseded.authority.adjudicationLedgerPath,
      supersededAdjudicationLedgerSha256: superseded.authority.adjudicationLedgerSha256,
      semanticReauditPath:
        "coordination/content-qa/authoritative/2026-08-13-hk-residual28-semantic-reaudit-v3.json",
      semanticReauditSha256: SEMANTIC_REAUDIT_V3_SHA256,
      supersededSemanticReauditPath:
        "coordination/content-qa/authoritative/2026-08-13-hk-residual28-semantic-reaudit-v2.json",
      supersededSemanticReauditSha256: SEMANTIC_REAUDIT_V2_SHA256,
      supersededRepairContractPath:
        "coordination/content-qa/authoritative/2026-08-13-hk-residual28-repair-contract-v1-superseded.json",
      supersededRepairContractSha256: SUPERSEDED_REPAIR_CONTRACT_SHA256,
      supersessionReason
    },
    sourceSnapshot: {
      ...supersededSourceSnapshot,
      questionsPath: QUESTIONS_PREIMAGE_PATH,
      questionsSha256: QUESTIONS_PREIMAGE_SHA256,
      preimagePath: superseded.sourceSnapshot.preimagePath,
      preimageSha256: RESIDUAL28_PREIMAGE_SNAPSHOT_SHA256,
      currentQuestionsPath: "data/questions.ts",
      currentQuestionsSha256: CURRENT_QUESTIONS_SHA256,
      preimageVersionManifestReconstruction: {
        classification: "explicitly-reconstructible",
        sourcePostimagePath: preimageVersionManifestPath,
        sourcePostimageSha256: CURRENT_VERSION_MANIFEST_SHA256,
        serialization: "UTF-8 JSON.stringify({ schemaVersion, historySourceCommit, activeIdByHistoricalId, retiredHistoricalIds }, null, 2) + U+000A after exact28 postimage reversal",
        byteLength: 80523,
        sha256: preimageVersionManifestSha256
      }
    },
    counts: {
      residualRows: 47,
      repairRows: 28,
      originalAdjudicationIssueInstances: 29,
      cleanRows: 19,
      commonCheckExplanationRows: 25,
      firstStepExplanationRows: 2,
      answerAndOptionRows,
      distractorOptionRows,
      semanticReauditRows: semanticReaudit.rows.length,
      semanticReauditIssueInstances: issueCodes.length,
      changedPathCount,
      promptRows: 1,
      v2ToV3: 27,
      baseToV2: 1,
      historyIdenticalOverlaps: 1,
      historyUniqueAdditions: 27
    },
    repairs
  };
}

export function assertCheckedInHongKongResidual28RepairContract() {
  const expected = buildHongKongResidual28RepairContract();
  assert.deepEqual(repairContractJson, expected);
  assert.equal(expected.authority.supersessionReason.includes("exact-eight"), false);
  assert.match(expected.authority.supersessionReason, /exact-eleven/);
  const categories = (semanticReauditV3Json.rows as unknown as SemanticReauditRow[]).map(
    (row) => row.semanticCategory
  );
  assert.equal(categories.length, 11);
  assert.equal(new Set(categories).size, 11);
  for (const semanticClass of categories) {
    assert.equal(
      expected.authority.supersessionReason.split(semanticClass).length - 1,
      1,
      `${semanticClass}: semantic category must appear exactly once in the derived supersession reason`
    );
  }
  return expected;
}

if (process.argv[1]?.endsWith("build-hk-residual28-repair-contract.ts")) {
  if (process.argv.includes("--materialize-superseded")) {
    const target = join(
      process.cwd(),
      "coordination/content-qa/authoritative/2026-08-13-hk-residual28-repair-contract-v1-superseded.json"
    );
    const bytes = `${JSON.stringify(buildSupersededHongKongResidual28RepairContract(), null, 2)}\n`;
    assert.equal(sha256(bytes), SUPERSEDED_REPAIR_CONTRACT_SHA256);
    writeFileSync(target, bytes);
    process.stdout.write(`HK residual28 superseded repair contract materialized: ${SUPERSEDED_REPAIR_CONTRACT_SHA256}\n`);
  } else if (process.argv.includes("--write")) {
    const target = join(
      process.cwd(),
      "coordination/content-qa/authoritative/2026-08-13-hk-residual28-repair-contract.json"
    );
    writeFileSync(target, `${JSON.stringify(buildHongKongResidual28RepairContract(), null, 2)}\n`);
    process.stdout.write("HK residual28 repair contract: deterministic bytes regenerated\n");
  } else {
    assertCheckedInHongKongResidual28RepairContract();
    process.stdout.write("HK residual28 repair contract: exact deterministic bytes verified\n");
  }
}
