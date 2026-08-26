import DESIGN from "../../research/mais-natural-ca60-v1/versions/design-v5/design-registration.json" with { type: "json" };
import { BOOTSTRAP_GOLDEN_VECTORS } from "../../research/mais-natural-ca60-v1/versions/design-v2/design-contract.mjs";
import { canonicalJsonV5R3, sha256V5R3 } from "./execution-integrity-v5-r3.mjs";

export const C0_REASON_CODES_V5_R4 = Object.freeze([
  "POSSIBLE_P0_OR_P1_MATH_OR_ANSWER_KEY",
  "SOURCE_RIGHTS_OR_RECONSTRUCTION_RISK",
  "AGE_GRADE_CURRICULUM_LANGUAGE_OR_REGION_RISK",
  "ANSWER_CRITICAL_VISUAL_OR_EVIDENCE",
  "DETERMINISTIC_VS_B_PRIME_CONFLICT",
  "CRITIQUE_VS_REVISION_CONFLICT",
  "INVALID_TAXONOMY_SCHEMA_OR_ROLE",
  "OUT_OF_SCOPE_METADATA_OR_EVIDENCE",
  "DECLARED_OUT_OF_DISTRIBUTION",
]);

export const C0_TRIGGER_ENGINE_HASH_V5_R4 = sha256V5R3(canonicalJsonV5R3({
  version: "MAIS_NATURAL_CA60_V5_R4_C0_TRIGGER_ENGINE_1",
  reasonCodes: C0_REASON_CODES_V5_R4,
  sourceInputs: ["FROZEN_ITEM_LEAF", "FROZEN_INVENTORY_SCREEN", "AUTHORITATIVE_B_PRIME_CRITIQUE", "AUTHORITATIVE_B_PRIME_REVISION"],
  unknownOrMalformedDisposition: "TRIGGER",
  randomAuditPurpose: "SEPARATE_SELECTION_REASON_ONLY",
  referenceInputCount: 0,
}));

export const SCORER_METHOD_KERNEL_V5_R4 = Object.freeze({
  bootstrapReplicates: 10_000,
  inheritedStatisticalMethodHash: DESIGN.analysis.frozenMethodComponentRootsHash,
  bootstrapGoldenVectorHash: sha256V5R3(canonicalJsonV5R3(BOOTSTRAP_GOLDEN_VECTORS)),
  missingDataMethodHash: sha256V5R3(canonicalJsonV5R3(DESIGN.analysis.missingData)),
  metricDecisionMethodHash: DESIGN.analysis.frozenMethodComponentRoots.metricDecisionMethodHash,
  c0TriggerEngineHash: C0_TRIGGER_ENGINE_HASH_V5_R4,
});
