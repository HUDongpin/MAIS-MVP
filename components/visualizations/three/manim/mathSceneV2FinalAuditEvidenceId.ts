export type MathSceneV2FinalAuditEvidenceIdStatus =
  | "accepted"
  | "blocked";

export type MathSceneV2FinalAuditEvidenceIdInput = {
  evidenceId: string;
  provenRequirementCount: number;
  requirementCount: number;
  status: MathSceneV2FinalAuditEvidenceIdStatus;
};

export function hasCanonicalMathSceneV2FinalAuditEvidenceId(
  input: MathSceneV2FinalAuditEvidenceIdInput
) {
  const acceptedPrefix = "accepted-final-objective-audit-";
  const blockedPrefix = "blocked-final-objective-audit-";
  const expectedAcceptedSuffix = `${input.provenRequirementCount}-of-${input.requirementCount}`;
  const completedProofSuffix = `${input.requirementCount}-of-${input.requirementCount}`;

  if (input.status === "accepted") {
    const suffix = input.evidenceId.slice(acceptedPrefix.length);

    return input.evidenceId.startsWith(acceptedPrefix) &&
      (
        suffix === expectedAcceptedSuffix ||
        (
          suffix.startsWith(`${expectedAcceptedSuffix}-`) &&
          hasDashSeparatedEvidenceSuffix(suffix.slice(expectedAcceptedSuffix.length + 1))
        )
      );
  }

  if (input.status === "blocked") {
    const suffix = input.evidenceId.slice(blockedPrefix.length);

    return input.evidenceId.startsWith(blockedPrefix) &&
      hasDashSeparatedEvidenceSuffix(suffix) &&
      suffix !== completedProofSuffix &&
      !suffix.startsWith(`${completedProofSuffix}-`);
  }

  return false;
}

function hasDashSeparatedEvidenceSuffix(value: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}
