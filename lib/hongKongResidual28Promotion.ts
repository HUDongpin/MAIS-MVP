import residual28PromotionManifestJson from "@/data/historical/hongKongResidual28PromotionManifest.json";

export type HongKongResidual28Promotion = {
  fromId: string;
  baseId: string;
  toId: string;
  preimageQuestionPayloadSha256: string;
  successorQuestionPayloadSha256: string;
  preimageMaterialSha256: string;
  successorMaterialSha256: string;
  allowedPaths: string[];
  replacements: Record<string, string | undefined>;
  materialBindings: {
    question: "question-material-fingerprint-v1";
  };
};

type HongKongResidual28PromotionManifest = {
  schemaVersion: number;
  authority: {
    adjudicationLedgerPath: string;
    adjudicationLedgerSha256: string;
    residualPartitionPath: string;
    residualPartitionSha256: string;
    semanticReauditPath: string;
    semanticReauditSha256: string;
    repairContractPath: string;
    repairContractSha256: string;
    preimageSnapshotPath: string;
    preimageSnapshotSha256: string;
    preimageSourceQuestionsPath: string;
    preimageSourceQuestionsSha256: string;
  };
  preimageVersionManifestReconstruction: {
    classification: "explicitly-reconstructible";
    sourcePostimagePath: string;
    sourcePostimageSha256: string;
    serialization: string;
    byteLength: number;
    sha256: string;
  };
  preimageActiveMappingCount: number;
  preimageRetiredIdCount: number;
  preimageHistoricalUniqueCount: number;
  preExistingHistoricalOverlapIds: string[];
  historyUniqueAdditionCount: number;
  expectedPostActiveMappingCount: number;
  expectedPostRetiredIdCount: number;
  expectedPostHistoricalUniqueCount: number;
  generationDistribution: {
    v2ToV3: number;
    baseToV2: number;
    affectedDirectMappingKeys: number;
  };
  promotions: HongKongResidual28Promotion[];
};

const SHA256 = /^[0-9a-f]{64}$/;
const ALLOWED_NON_OPTION_REPLACEMENT_PATHS = new Set([
  "answer",
  "explanation.en",
  "explanation.zh",
  "prompt.en",
  "prompt.zh"
]);
const ALLOWED_OPTION_REPLACEMENT_PATH = /^options\[(\d+)]\.(en|zh)$/;

function isAllowedReplacementPath(path: string) {
  if (ALLOWED_NON_OPTION_REPLACEMENT_PATHS.has(path)) return true;
  const optionPath = path.match(ALLOWED_OPTION_REPLACEMENT_PATH);
  if (!optionPath) return false;
  const optionIndex = Number(optionPath[1]);
  return Number.isSafeInteger(optionIndex) && optionIndex >= 0;
}

function assertManifest(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Invalid HK residual28 promotion manifest: ${message}`);
}

function expectedGeneration(fromId: string) {
  const v2 = fromId.match(/^(.*)-v2$/);
  return v2
    ? { baseId: v2[1], toId: `${v2[1]}-v3` }
    : { baseId: fromId, toId: `${fromId}-v2` };
}

function validateManifest(candidate: HongKongResidual28PromotionManifest) {
  assertManifest(candidate.schemaVersion === 1, "unsupported schemaVersion");
  assertManifest(
    candidate.authority.adjudicationLedgerPath
      === "coordination/content-qa/authoritative/2026-08-13-hk-residual47-adjudication-ledger-v2.json"
    && candidate.authority.adjudicationLedgerSha256
      === "0879eb17b5c65ac76a38f311972f279e1c47d6c3b2c8dec22aabea6af830716c",
    "adjudication authority drift"
  );
  assertManifest(
    candidate.authority.residualPartitionPath
      === "coordination/content-qa/authoritative/2026-08-13-hk-residual47-partition.json"
    && candidate.authority.residualPartitionSha256
      === "d1f7c2eaeea5deaa41fafcf75be28498e0919ce3eff9eeace55cf7c55baeeb37",
    "residual47 partition authority drift"
  );
  assertManifest(
    candidate.authority.semanticReauditPath
      === "coordination/content-qa/authoritative/2026-08-13-hk-residual28-semantic-reaudit-v3.json"
    && candidate.authority.semanticReauditSha256
      === "e8bbb5926275c612e025c75da1ebb7c63aa35c2f3b753a908948d7a90ad47dc3",
    "semantic re-audit authority drift"
  );
  assertManifest(
    candidate.authority.repairContractPath
      === "coordination/content-qa/authoritative/2026-08-13-hk-residual28-repair-contract.json"
    && candidate.authority.repairContractSha256
      === "89891eb15b8823f29c7ca5c22a1a7f59ad4501d5c7600fea7a2ef82dce72f0b4",
    "repair contract authority drift"
  );
  assertManifest(
    candidate.authority.preimageSnapshotPath
      === "data/historical/hongKongQuestions-residual28-preimage-20260813.json"
    && candidate.authority.preimageSnapshotSha256
      === "8f9cc79f256fec67f1818942c4aaab3d00fbdbb87c465869f4ed4e4675494059"
    && candidate.authority.preimageSourceQuestionsPath
      === "coordination/content-qa/authoritative/2026-08-13-data-questions-residual28-preimage.txt"
    && candidate.authority.preimageSourceQuestionsSha256
      === "24ec6fb77921f0d22a8281179ac3a07f55817351ad31894a94cf72cfa5cc8f7a",
    "preimage source authority drift"
  );
  assertManifest(
    candidate.preimageVersionManifestReconstruction.classification === "explicitly-reconstructible"
    && candidate.preimageVersionManifestReconstruction.sourcePostimagePath
      === "data/historical/hongKongQuestionVersionManifest.json"
    && candidate.preimageVersionManifestReconstruction.sourcePostimageSha256
      === "f0cfaeaf745325d6b8e99353082f7e0be9d63fdb2cb18db0d3b7568c0415af92"
    && candidate.preimageVersionManifestReconstruction.serialization
      === "UTF-8 JSON.stringify({ schemaVersion, historySourceCommit, activeIdByHistoricalId, retiredHistoricalIds }, null, 2) + U+000A after exact28 postimage reversal"
    && candidate.preimageVersionManifestReconstruction.byteLength === 80523,
    "preimage version manifest serialization drift"
  );
  assertManifest(
    candidate.preimageVersionManifestReconstruction.sha256
      === "9f3c9173152b6cf8bd816df1422de4c18858f1c4c9bd0fbff8a95e49e0123ff1",
    "preimage version manifest SHA drift"
  );
  assertManifest(
    candidate.preimageActiveMappingCount === 1080
    && candidate.preimageRetiredIdCount === 1081
    && candidate.preimageHistoricalUniqueCount === 1761,
    "preimage counts drift"
  );
  assertManifest(
    candidate.expectedPostActiveMappingCount === 1108
    && candidate.expectedPostRetiredIdCount === 1109
    && candidate.expectedPostHistoricalUniqueCount === 1788,
    "postimage counts drift"
  );
  assertManifest(
    candidate.historyUniqueAdditionCount === 27
    && JSON.stringify(candidate.preExistingHistoricalOverlapIds)
      === JSON.stringify(["supp-p4-decimals-guided-example"]),
    "history overlap/delta drift"
  );
  assertManifest(
    candidate.generationDistribution.v2ToV3 === 27
    && candidate.generationDistribution.baseToV2 === 1
    && candidate.generationDistribution.affectedDirectMappingKeys === 55,
    "generation distribution drift"
  );
  assertManifest(Array.isArray(candidate.promotions) && candidate.promotions.length === 28, "promotions must be exact28");

  const fromIds = new Set<string>();
  const baseIds = new Set<string>();
  const toIds = new Set<string>();
  for (const promotion of candidate.promotions) {
    const expected = expectedGeneration(promotion.fromId);
    assertManifest(promotion.baseId === expected.baseId, `${promotion.fromId}: baseId drift`);
    assertManifest(promotion.toId === expected.toId, `${promotion.fromId}: toId drift`);
    assertManifest(!fromIds.has(promotion.fromId), `${promotion.fromId}: duplicate fromId`);
    assertManifest(!baseIds.has(promotion.baseId), `${promotion.fromId}: duplicate baseId`);
    assertManifest(!toIds.has(promotion.toId), `${promotion.fromId}: duplicate toId`);
    fromIds.add(promotion.fromId);
    baseIds.add(promotion.baseId);
    toIds.add(promotion.toId);
    assertManifest(
      [
        promotion.preimageQuestionPayloadSha256,
        promotion.successorQuestionPayloadSha256,
        promotion.preimageMaterialSha256,
        promotion.successorMaterialSha256
      ].every((value) => SHA256.test(value)),
      `${promotion.fromId}: malformed SHA`
    );
    assertManifest(
      promotion.preimageMaterialSha256 !== promotion.successorMaterialSha256,
      `${promotion.fromId}: material promotion must change Question semantics`
    );
    assertManifest(
      promotion.materialBindings.question === "question-material-fingerprint-v1",
      `${promotion.fromId}: material binding drift`
    );
    const allowedPaths = [...promotion.allowedPaths].sort();
    const replacementPaths = Object.keys(promotion.replacements).sort();
    assertManifest(
      Object.values(promotion.replacements).every((value) => typeof value === "string"),
      `${promotion.fromId}: replacement value must be a string`
    );
    assertManifest(
      JSON.stringify(allowedPaths) === JSON.stringify(replacementPaths),
      `${promotion.fromId}: replacements do not equal allowed paths`
    );
    assertManifest(
      replacementPaths.every(isAllowedReplacementPath),
      `${promotion.fromId}: unapproved repair path`
    );
  }
  return candidate.promotions;
}

export const hongKongResidual28PromotionManifest =
  residual28PromotionManifestJson as HongKongResidual28PromotionManifest;
export const hongKongResidual28Promotions = validateManifest(hongKongResidual28PromotionManifest);

export const hongKongResidual28PromotionByFromId = new Map(
  hongKongResidual28Promotions.map((promotion) => [promotion.fromId, promotion] as const)
);
export const hongKongResidual28PromotionByBaseId = new Map(
  hongKongResidual28Promotions.map((promotion) => [promotion.baseId, promotion] as const)
);

export function hongKongResidual28PromotionForSourceId(questionId: string) {
  return hongKongResidual28PromotionByBaseId.get(questionId)
    ?? hongKongResidual28PromotionByFromId.get(questionId)
    ?? null;
}

export function reverseResidual28VersionManifestPostimage(
  activeIdByHistoricalId: Record<string, string>,
  retiredHistoricalIds: readonly string[]
) {
  const reversedMap = { ...activeIdByHistoricalId };
  const residualOldIds = new Set(hongKongResidual28Promotions.map((promotion) => promotion.fromId));
  for (const promotion of hongKongResidual28Promotions) {
    assertManifest(reversedMap[promotion.fromId] === promotion.toId, `${promotion.fromId}: postimage mapping drift`);
    delete reversedMap[promotion.fromId];
    if (promotion.fromId.endsWith("-v2")) {
      assertManifest(reversedMap[promotion.baseId] === promotion.toId, `${promotion.baseId}: postimage base mapping drift`);
      reversedMap[promotion.baseId] = promotion.fromId;
    } else {
      assertManifest(promotion.baseId === promotion.fromId, `${promotion.fromId}: base-generation invariant drift`);
      delete reversedMap[promotion.baseId];
    }
  }
  const reversedRetired = retiredHistoricalIds.filter((questionId) => !residualOldIds.has(questionId));
  assertManifest(
    Object.keys(reversedMap).length === hongKongResidual28PromotionManifest.preimageActiveMappingCount,
    "reversed mapping count drift"
  );
  assertManifest(
    reversedRetired.length === hongKongResidual28PromotionManifest.preimageRetiredIdCount,
    "reversed retired count drift"
  );
  return {
    activeIdByHistoricalId: reversedMap,
    retiredHistoricalIds: reversedRetired
  };
}

export function serializeResidual28VersionManifestSnapshot(snapshot: {
  schemaVersion: number;
  historySourceCommit: string;
  activeIdByHistoricalId: Record<string, string>;
  retiredHistoricalIds: readonly string[];
}) {
  return `${JSON.stringify(snapshot, null, 2)}\n`;
}
