import DESIGN from "../../versions/design-v5/design-registration.json" with { type: "json" };
import V5_R2_REGISTRATION from "../v5-r2/runner-registration.json" with { type: "json" };
import {
  canonicalJsonV5R3,
  sealV5R3Artifact,
  sha256V5R3,
} from "../../../../content-qa/mais-natural-ca60-v1/execution-integrity-v5-r3.mjs";

export const V5_R2_A11_DISCREPANCY_RECEIPT_HASH = "82d5e8edca9896f35f5c2271d84e62344a2eeb9b45ba0fa0e86c7fec354be4dd";
export const V5_R2_A11_DISCREPANCY_COMMIT = "916d2430ba7b7b057aea018c68acdf0a9a14b13c";

export function buildProviderContractErratumV5R3({ recordedAt }) {
  if (typeof recordedAt !== "string" || !Number.isFinite(Date.parse(recordedAt))) throw new TypeError("recordedAt must be an explicit ISO timestamp");
  const inherited = DESIGN.providerControls.deepSeekRoleContractCatalog.roles.B_PRIME_REVISION;
  const ownerProviderDecisionHash = sha256V5R3(canonicalJsonV5R3(DESIGN.ownerProviderDecision));
  return sealV5R3Artifact({
    schemaVersion: "NaturalCaProviderContractErratumV1",
    designId: "MAIS-NATURAL-CA60-V5",
    erratumId: "MAIS-NATURAL-CA60-V5-R3-REFERENCE-BLINDNESS-ERRATUM",
    recordedAt,
    ownerProviderDecisionHash,
    designRegistrationHash: DESIGN.registrationHash,
    affectedRole: "B_PRIME_REVISION",
    inheritedPromptHash: inherited.promptHash,
    legacyProviderToken: "Qwen",
    operativeInterpretation: "The inherited proper noun Qwen is a known non-operative legacy token. The operative clause 'or final reference labels' is provider-agnostic and prohibits every OpenAI GPT-5.6 Luna solve, label, adjudication, attempt, and seal artifact from all DeepSeek requests.",
    promptBytesChanged: false,
    referenceProvider: "OPENAI_DIRECT/gpt-5.6-luna",
    referenceInputCountRequiredForDeepSeek: 0,
    deepSeekDenylist: [
      "OPENAI_REFERENCE_SOLVE_ARTIFACT",
      "OPENAI_REFERENCE_LABEL_ARTIFACT",
      "OPENAI_REFERENCE_ADJUDICATION_ARTIFACT",
      "OPENAI_REFERENCE_ATTEMPT_RECEIPT",
      "REFERENCE_LABEL_SEAL",
      "REFERENCE_ATTEMPT_CHAIN",
      "QWEN_REFERENCE_ARTIFACT",
    ],
    supersedesRunnerRegistrationHash: V5_R2_REGISTRATION.registrationHash,
    previousReceiptHash: V5_R2_A11_DISCREPANCY_RECEIPT_HASH,
    status: "ACCEPTED_APPEND_ONLY_NON_SEMANTIC_PROVIDER_NAME_ERRATUM",
  });
}

if (process.argv[1]?.endsWith("build-provider-contract-erratum.mjs")) {
  const recordedAt = process.argv[2];
  process.stdout.write(`${canonicalJsonV5R3(buildProviderContractErratumV5R3({ recordedAt }))}\n`);
}
