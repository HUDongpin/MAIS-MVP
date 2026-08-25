export const mathSceneV3GateIds = ["A06", "A11", "A18", "A22"] as const;

export type MathSceneV3GateId = (typeof mathSceneV3GateIds)[number];
export type MathSceneV3GateStatus = "failed" | "passed" | "pending";

export type MathSceneV3GateEntry = {
  evidenceIds: string[];
  status: MathSceneV3GateStatus;
};

export type MathSceneV3ReviewLedger = Record<MathSceneV3GateId, MathSceneV3GateEntry>;

export type MathSceneV3ReleaseEvidence = {
  deployed: boolean;
  deploymentEvidenceIds: readonly string[];
  liveBrowserEvidenceIds: readonly string[];
  liveBrowserVerified: boolean;
  mergeEvidenceIds: readonly string[];
  merged: boolean;
  reviewLedger: MathSceneV3ReviewLedger;
};

export type MathSceneV3ProductLabel = "Beta" | "v3 GA" | "v3 RC";

export type MathSceneV3ReleaseStatus = {
  ga: boolean;
  gateConditions: Record<MathSceneV3GateId, { evidencePresent: boolean; passed: boolean }>;
  label: MathSceneV3ProductLabel;
  releaseConditions: {
    deployed: boolean;
    deploymentEvidencePresent: boolean;
    liveBrowserEvidencePresent: boolean;
    liveBrowserVerified: boolean;
    mergeEvidencePresent: boolean;
    merged: boolean;
  };
};

export function emptyMathSceneV3ReviewLedger(): MathSceneV3ReviewLedger {
  return {
    A06: { evidenceIds: [], status: "pending" },
    A11: { evidenceIds: [], status: "pending" },
    A18: { evidenceIds: [], status: "pending" },
    A22: { evidenceIds: [], status: "pending" }
  };
}

function hasEvidence(evidenceIds: readonly string[]) {
  return evidenceIds.some((evidenceId) => evidenceId.trim().length > 0);
}

export function deriveMathSceneV3ReleaseStatus(input: MathSceneV3ReleaseEvidence): MathSceneV3ReleaseStatus {
  const gateConditions = Object.fromEntries(
    mathSceneV3GateIds.map((gateId) => [
      gateId,
      {
        evidencePresent: hasEvidence(input.reviewLedger[gateId].evidenceIds),
        passed: input.reviewLedger[gateId].status === "passed"
      }
    ])
  ) as MathSceneV3ReleaseStatus["gateConditions"];
  const releaseConditions = {
    deployed: input.deployed,
    deploymentEvidencePresent: hasEvidence(input.deploymentEvidenceIds),
    liveBrowserEvidencePresent: hasEvidence(input.liveBrowserEvidenceIds),
    liveBrowserVerified: input.liveBrowserVerified,
    mergeEvidencePresent: hasEvidence(input.mergeEvidenceIds),
    merged: input.merged
  };
  const allGatesComplete = mathSceneV3GateIds.every(
    (gateId) => gateConditions[gateId].passed && gateConditions[gateId].evidencePresent
  );
  const allReleaseConditionsComplete = Object.values(releaseConditions).every(Boolean);
  const ga = allGatesComplete && allReleaseConditionsComplete;

  return {
    ga,
    gateConditions,
    label: ga ? "v3 GA" : allGatesComplete ? "v3 RC" : "Beta",
    releaseConditions
  };
}
