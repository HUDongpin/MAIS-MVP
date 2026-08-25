import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  DEEPSEEK_ROLE_CONTRACTS,
  QWEN_ROLE_CONTRACTS,
} from "../design-v4/design-contract.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const V4_DIRECTORY = path.resolve(HERE, "../design-v4");
const V4_REGISTRATION_PATH = path.join(V4_DIRECTORY, "design-registration.json");
const SCHEMA_DIRECTORY = path.join(HERE, "schemas");

export const DESIGN_ID_V5 = "MAIS-NATURAL-CA60-V5";
export const DESIGN_SCHEMA_VERSION_V5 = "NaturalCaPilotDesignRegistrationV5";
export const FROZEN_AT_V5 = "2026-08-25T16:39:10.000Z";
export const OWNER_DECISION_RECORDED_AT_V5 = "2026-08-25T16:39:10.000Z";
export const V4_DISPOSITION_REASON = "OWNER_REPLACED_QWEN_WITH_OPENAI_GPT_5_6_LUNA_BEFORE_ANY_PROVIDER_CALL";

export const OPENAI_REFERENCE_ENDPOINT_V5 = "https://us.api.openai.com/v1/responses";
export const OPENAI_REFERENCE_MODEL_V5 = "gpt-5.6-luna";
export const OPENAI_PROJECT_RESIDENCY_V5 = "US_STORAGE_PROCESSING";

export const OPENAI_LOGICAL_REQUEST_TEMPLATE_V5 = Object.freeze({
  envelopeStage: "LOGICAL_REQUEST_PRE_ADAPTER_V5",
  model: OPENAI_REFERENCE_MODEL_V5,
  stream: false,
  store: false,
  background: false,
  reasoning: Object.freeze({ effort: "high", context: "current_turn" }),
  text: Object.freeze({
    verbosity: "medium",
    format: Object.freeze({
      type: "json_schema",
      name: "ROLE_BOUND_AT_DISPATCH",
      strict: true,
      schema: "ROLE_OUTPUT_SCHEMA_BOUND_AT_DISPATCH",
    }),
  }),
  max_output_tokens: 8192,
  tools: Object.freeze([]),
  previous_response_id: null,
  conversation: null,
  requestedSeed: null,
});

export const OPENAI_WIRE_REQUEST_TEMPLATE_V5 = Object.freeze({
  model: OPENAI_REFERENCE_MODEL_V5,
  stream: false,
  store: false,
  background: false,
  reasoning: Object.freeze({ effort: "high", context: "current_turn" }),
  text: Object.freeze({
    verbosity: "medium",
    format: Object.freeze({
      type: "json_schema",
      name: "ROLE_BOUND_AT_DISPATCH",
      strict: true,
      schema: "ROLE_OUTPUT_SCHEMA_BOUND_AT_DISPATCH",
    }),
  }),
  max_output_tokens: 8192,
  tools: Object.freeze([]),
});

const OPENAI_ROLE_PREFIXES = Object.freeze({
  A_SOLVE: "OPENAI_GPT_5_6_LUNA_RATER_A_SOLVE_V5",
  A_LABEL: "OPENAI_GPT_5_6_LUNA_RATER_A_LABEL_V5",
  B_SOLVE: "OPENAI_GPT_5_6_LUNA_RATER_B_SOLVE_ADVERSARIAL_V5",
  B_LABEL: "OPENAI_GPT_5_6_LUNA_RATER_B_LABEL_V5",
  ADJUDICATOR: "OPENAI_GPT_5_6_LUNA_ADJUDICATOR_V5",
});

const INHERITED_METHOD_SECTION_NAMES = Object.freeze([
  "scope",
  "eligibility",
  "stratification",
  "homologyClustering",
  "deterministicSelection",
  "taxonomy",
  "analysis",
  "independentReview",
  "publicReport",
]);

const OFFICIAL_CAPABILITY_URLS = Object.freeze([
  "https://developers.openai.com/api/docs/models/gpt-5.6-luna",
  "https://developers.openai.com/api/docs/guides/your-data",
  "https://developers.openai.com/api/reference/resources/responses/methods/create",
]);

const V5_SCHEMA_TITLES = Object.freeze([
  "NaturalCaPilotDesignRegistrationV5",
  "NaturalCaStatisticalPowerV5",
  "OpenAIProjectRoutePreflightReceiptV1",
  "OpenAIReferenceRoleOutputV1",
  "PredecessorPackageInventoryV2",
  "ProviderAttemptReceiptV2",
  "ProviderAuthorizationV2",
  "ProviderLogicalRequestV2",
  "ProviderWireEvidenceV2",
  "V5PackageManifestV1",
]);

export function canonicalJson(value) {
  if (value === null || typeof value !== "object") {
    if (typeof value === "number" && !Number.isFinite(value)) throw new TypeError("canonical JSON rejects non-finite numbers");
    const encoded = JSON.stringify(value);
    if (encoded === undefined) throw new TypeError("canonical JSON rejects undefined values");
    return encoded;
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
}

export function sha256Hex(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function jcsHash(value) {
  return sha256Hex(Buffer.from(canonicalJson(value), "utf8"));
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function migrateString(value) {
  return value
    .replaceAll("qwen3.8-max", OPENAI_REFERENCE_MODEL_V5)
    .replaceAll("ALIBABA_CLOUD_MODEL_STUDIO", "OPENAI_DIRECT")
    .replaceAll("QWEN", "OPENAI_REFERENCE")
    .replaceAll("Qwen", "OpenAI GPT-5.6 Luna")
    .replaceAll("qwen", "openaiReference")
    .replaceAll("NaturalCaPilotDesignRegistrationV4", DESIGN_SCHEMA_VERSION_V5)
    .replaceAll("MAIS-NATURAL-CA60-V4", DESIGN_ID_V5)
    .replaceAll("DESIGN_REGISTRATION_V4", "DESIGN_REGISTRATION_V5")
    .replaceAll("LOGICAL_REQUEST_PRE_ADAPTER_V4", "LOGICAL_REQUEST_PRE_ADAPTER_V5")
    .replaceAll("FROZEN_FIELD_PRESENCE_V4", "FROZEN_FIELD_PRESENCE_V5");
}

function migrateKey(key) {
  return key
    .replaceAll("Qwen", "OpenAIReference")
    .replaceAll("qwen", "openaiReference")
    .replaceAll("QWEN", "OPENAI_REFERENCE");
}

function migrateProviderVocabulary(value) {
  if (typeof value === "string") return migrateString(value);
  if (Array.isArray(value)) return value.map(migrateProviderVocabulary);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [
      migrateKey(key),
      migrateProviderVocabulary(child),
    ]));
  }
  return value;
}

async function walkFiles(root, directory = root) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walkFiles(root, absolute));
    else if (entry.isFile()) files.push(absolute);
  }
  return files;
}

export async function buildPredecessorPackageInventoryV4() {
  const files = (await walkFiles(V4_DIRECTORY)).sort();
  const entries = await Promise.all(files.map(async (absolute) => {
    const bytes = await readFile(absolute);
    return {
      path: path.relative(V4_DIRECTORY, absolute),
      byteLength: bytes.byteLength,
      sha256: sha256Hex(bytes),
    };
  }));
  const registrationBytes = await readFile(V4_REGISTRATION_PATH);
  return {
    schemaVersion: "PredecessorPackageInventoryV2",
    artifactKind: "EXACT_IMMUTABLE_PREDECESSOR_PACKAGE_INVENTORY",
    designId: "MAIS-NATURAL-CA60-V4",
    version: 4,
    disposition: "SUPERSEDED_NOT_EXECUTED",
    providerEventCount: 0,
    registrationByteSha256: sha256Hex(registrationBytes),
    inventoryAlgorithm: "SHA256(UTF8(JCS(sorted[{path,byteLength,sha256}])))",
    entries,
    fileCount: entries.length,
    inventoryRootHash: jcsHash(entries),
    recordedAt: FROZEN_AT_V5,
    reasonCode: V4_DISPOSITION_REASON,
  };
}

async function loadV4Registration() {
  return JSON.parse(await readFile(V4_REGISTRATION_PATH, "utf8"));
}

function buildOpenAIRoleContracts() {
  const roles = {};
  for (const role of ["A_SOLVE", "A_LABEL", "B_SOLVE", "B_LABEL", "ADJUDICATOR"]) {
    const predecessor = QWEN_ROLE_CONTRACTS[role];
    const colon = predecessor.promptLiteral.indexOf(":");
    const body = colon >= 0 ? predecessor.promptLiteral.slice(colon + 1) : predecessor.promptLiteral;
    const promptLiteral = `${OPENAI_ROLE_PREFIXES[role]}:${body}`
      .replaceAll("FROZEN_FIELD_PRESENCE_V4", "FROZEN_FIELD_PRESENCE_V5")
      .replaceAll("Qwen", "OpenAI GPT-5.6 Luna")
      .replaceAll("QWEN", "OPENAI_REFERENCE");
    const schemaLiteral = predecessor.schemaLiteral;
    const promptHash = sha256Hex(Buffer.from(promptLiteral, "utf8"));
    const schemaHash = sha256Hex(Buffer.from(schemaLiteral, "utf8"));
    const roleContractHash = jcsHash({
      provider: "OPENAI_DIRECT",
      model: OPENAI_REFERENCE_MODEL_V5,
      role,
      inputFieldNames: predecessor.inputFieldNames,
      promptHash,
      schemaHash,
      logicalRequestTemplateHash: jcsHash(OPENAI_LOGICAL_REQUEST_TEMPLATE_V5),
      wireRequestTemplateHash: jcsHash(OPENAI_WIRE_REQUEST_TEMPLATE_V5),
    });
    roles[role] = {
      provider: "OPENAI_DIRECT",
      model: OPENAI_REFERENCE_MODEL_V5,
      role,
      inputFieldNames: [...predecessor.inputFieldNames],
      promptLiteral,
      promptHash,
      schemaLiteral,
      schemaHash,
      roleContractHash,
    };
  }
  const roleContractRootHash = jcsHash(Object.entries(roles).map(([role, contract]) => [
    role,
    contract.roleContractHash,
  ]));
  return {
    canonicalization: "RFC8785_JCS",
    roleOrdering: "A_SOLVE,A_LABEL,B_SOLVE,B_LABEL,ADJUDICATOR",
    logicalRequestTemplateHash: jcsHash(OPENAI_LOGICAL_REQUEST_TEMPLATE_V5),
    wireRequestTemplateHash: jcsHash(OPENAI_WIRE_REQUEST_TEMPLATE_V5),
    roles,
    roleContractRootHash,
  };
}

async function buildSchemaCatalog() {
  const files = (await readdir(SCHEMA_DIRECTORY)).filter((name) => name.endsWith(".schema.json")).sort();
  const catalog = {};
  for (const filename of files) {
    const schema = JSON.parse(await readFile(path.join(SCHEMA_DIRECTORY, filename), "utf8"));
    catalog[schema.title] = {
      filename,
      id: schema.$id,
      canonicalHash: jcsHash(schema),
    };
  }
  return catalog;
}

function buildAuthorizationTemplates() {
  const openaiLiteral = [
    "模板，不构成当前授权：批准 MAIS-NATURAL-CA60-V5 的 OpenAI machine-reference labeling；",
    "provider OPENAI_DIRECT；project residency US_STORAGE_PROCESSING；endpoint https://us.api.openai.com/v1/responses；model gpt-5.6-luna；",
    "允许外发已冻结且通过 rights/privacy screen 的 California 样本题内容；最多 610 attempts、4,000,000 total tokens、USD 25；",
    "只用于 A/B solve、A/B label 和一次条件 adjudication；禁止看到 DeepSeek 输出；",
    "不部署、不修改 live question bank、不授权 Git mutation。",
  ].join("\n");
  const deepSeekLiteral = [
    "模板，不构成当前授权：批准 MAIS-NATURAL-CA60-V5 的 DeepSeek evaluation；",
    "provider DEEPSEEK_DIRECT；endpoint https://api.deepseek.com/chat/completions；model deepseek-v4-pro；",
    "允许外发已冻结且通过 rights/privacy screen 的 California 样本题内容；最多 850 attempts、6,000,000 total tokens、USD 25；",
    "只执行已冻结 B-prime/C0-prime policy；禁止读取 OpenAI reference labels；",
    "不部署、不修改 live question bank、不授权 Git mutation。",
  ].join("\n");
  return {
    OPENAI_MACHINE_REFERENCE: {
      literal: openaiLiteral,
      templateHash: sha256Hex(Buffer.from(openaiLiteral, "utf8")),
      isCurrentAuthorization: false,
      grantsProviderExecution: false,
    },
    DEEPSEEK_EVALUATION: {
      literal: deepSeekLiteral,
      templateHash: sha256Hex(Buffer.from(deepSeekLiteral, "utf8")),
      isCurrentAuthorization: false,
      grantsProviderExecution: false,
    },
  };
}

function calculateSectionHashes(registration) {
  const sectionNames = [
    "scope",
    "runtimePopulation",
    "eligibility",
    "stratification",
    "homologyClustering",
    "deterministicSelection",
    "machineReferenceWorkflow",
    "taxonomy",
    "labeling",
    "analysis",
    "providerControls",
    "interfaces",
    "freezeChain",
    "preExecutionState",
  ];
  return Object.fromEntries(sectionNames.map((name) => [name, jcsHash(registration[name])]));
}

export function calculateRegistrationHash(registration) {
  const copy = deepClone(registration);
  delete copy.registrationHash;
  return jcsHash(copy);
}

export async function buildDesignRegistrationV5() {
  const v4 = await loadV4Registration();
  const inventory = await buildPredecessorPackageInventoryV4();
  const schemaCatalog = await buildSchemaCatalog();
  const openaiRoleCatalog = buildOpenAIRoleContracts();
  const migrated = migrateProviderVocabulary(v4);
  const inheritedMethodSections = Object.fromEntries(INHERITED_METHOD_SECTION_NAMES.map((name) => [
    name,
    jcsHash(v4[name]),
  ]));

  if (Object.keys(schemaCatalog).sort().join("|") !== [...V5_SCHEMA_TITLES].sort().join("|")) {
    throw new Error("V5 schema title set mismatch");
  }

  const registration = {
    schemaVersion: DESIGN_SCHEMA_VERSION_V5,
    artifactKind: "FROZEN_PRE_EXECUTION_DESIGN_CANDIDATE_NOT_EXECUTION_AUTHORIZATION",
    designId: DESIGN_ID_V5,
    designFamily: "MAIS-NATURAL-CA60",
    designKind: "APPEND_ONLY_COMPOSITE_PRE_EXECUTION_DESIGN_REGISTRATION",
    version: 5,
    lifecycleStatus: "SEALED_CANDIDATE_PENDING_INDEPENDENT_REVIEW",
    freezeAllowed: true,
    activationAllowed: false,
    blockingActivationCodes: [
      "A11_INDEPENDENT_REVIEW_REQUIRED",
      "A21_RUNNER_V5_MIGRATION_REQUIRED",
      "OPENAI_PROJECT_ROUTE_PREFLIGHT_REQUIRED",
      "HASH_BOUND_OPENAI_AUTHORIZATION_REQUIRED",
      "HASH_BOUND_DEEPSEEK_AUTHORIZATION_REQUIRED",
    ],
    frozenAt: FROZEN_AT_V5,
    thresholdsFrozenAt: v4.thresholdsFrozenAt,
    implementationBaseline: {
      commit: "07c9a99eb329f253b2aa9ad19f8e8777fa51c656",
      purpose: "V4_METHOD_AND_A21_OFFLINE_RUNNER_BASELINE_ONLY",
      v5ReviewedCommit: null,
      v5RunnerMigrationCommit: null,
      authorizesProviderExecution: false,
    },
    ownerProviderDecision: {
      schemaVersion: "OwnerReferenceProviderDecisionV1",
      decisionType: "DESIGN_SELECTION_ONLY_NOT_LIVE_EXECUTION_AUTHORIZATION",
      recordedAt: OWNER_DECISION_RECORDED_AT_V5,
      provider: "OPENAI_DIRECT",
      projectResidency: OPENAI_PROJECT_RESIDENCY_V5,
      endpoint: OPENAI_REFERENCE_ENDPOINT_V5,
      model: OPENAI_REFERENCE_MODEL_V5,
      egressAuthorizationGranted: false,
      providerExecutionAuthorizationGranted: false,
      credentialReadAuthorizationGranted: false,
      nonAuthorizations: [
        "NO_QUESTION_EGRESS",
        "NO_PROVIDER_CALL",
        "NO_CREDENTIAL_READ",
        "NO_GIT_PUSH_OR_MERGE_BY_THIS_DECISION",
        "NO_LIVE_CONTENT_MUTATION",
      ],
    },
    activeRegistrationAtAssembly: {
      designId: "MAIS-NATURAL-CA60-V3",
      version: 3,
      registrationHash: "08e89a4d0c6736b48c1dde0048d8f620c35fc486e1d1feaf272e30a1aae4973d",
      remainsActiveUntilIndependentReviewAndPointerUpdate: true,
    },
    proposedSupersedesCandidate: {
      designId: "MAIS-NATURAL-CA60-V4",
      version: 4,
      disposition: "SUPERSEDED_NOT_EXECUTED",
      providerEventCount: 0,
      reasonCode: V4_DISPOSITION_REASON,
    },
    composition: {
      compositionVersion: "V4_FULL_METHOD_PLUS_V5_PROVIDER_OVERRIDE_V1",
      predecessorInventoryArtifact: "predecessor-package-inventory-v4.json",
      predecessorPackageInventoryRootHash: inventory.inventoryRootHash,
      predecessorRegistrationByteSha256: inventory.registrationByteSha256,
      inheritedMethodSections,
      inheritedMethodSectionRootHash: jcsHash(Object.entries(inheritedMethodSections)),
      allowedSemanticChanges: [
        "REFERENCE_PROVIDER",
        "REFERENCE_MODEL",
        "REFERENCE_ENDPOINT",
        "REFERENCE_PROJECT_RESIDENCY",
        "RESPONSES_API_REQUEST_ENVELOPE",
        "REFERENCE_ROLE_PROMPT_PREFIXES_AND_HASHES",
        "PROVIDER_AUTHORIZATION_AND_RECEIPT_SCHEMAS",
        "PROVIDER_NAMED_CHRONOLOGY_FIELDS",
      ],
      prohibitedSemanticChanges: [
        "TARGET_POPULATION",
        "INCLUSION_EXCLUSION",
        "SAMPLE_SIZE_OR_STRATIFICATION",
        "HOMOLOGY_CLUSTERING",
        "LABEL_TAXONOMY_OR_SEVERITY",
        "ADJUDICATION_TRIGGER",
        "METRIC_OR_MATCHING_METHOD",
        "DECISION_THRESHOLD",
        "P0_P1_P2_DECISION_PRECEDENCE",
        "DECISION_OR_CLAIM_CEILING",
      ],
    },
    scope: migrated.scope,
    runtimePopulation: migrated.runtimePopulation,
    eligibility: migrated.eligibility,
    stratification: migrated.stratification,
    homologyClustering: migrated.homologyClustering,
    deterministicSelection: migrated.deterministicSelection,
    machineReferenceWorkflow: {
      ...migrated.machineReferenceWorkflow,
      referenceProvider: {
        provider: "OPENAI_DIRECT",
        requestedModel: OPENAI_REFERENCE_MODEL_V5,
        observedModelRequired: OPENAI_REFERENCE_MODEL_V5,
        endpoint: OPENAI_REFERENCE_ENDPOINT_V5,
        projectResidency: OPENAI_PROJECT_RESIDENCY_V5,
        requestedSeed: null,
        role: "MACHINE_REFERENCE_PANEL",
      },
      adjudicationRule: "Any field disagreement, uncertainty, P0, or P1 requires exactly one successful OpenAI GPT-5.6 Luna ADJUDICATOR attempt; no best-of-N and no sixth/reference follow-up call.",
      correlatedSameModelErrorRisk: true,
      agreementDoesNotEstablishHumanValidity: true,
    },
    taxonomy: migrated.taxonomy,
    labeling: {
      ...migrated.labeling,
      adjudication: "The OpenAI GPT-5.6 Luna ADJUDICATOR sees only this item and sealed A/B solve and raw-label receipts, never DeepSeek output.",
    },
    analysis: {
      ...migrated.analysis,
      structuralFeasibility: {
        targetItems: 60,
        perfectSensitivityMinimumPositiveItems: 25,
        perfectSpecificityMinimumNegativeItems: 52,
        minimumCombinedItems: 77,
        ca60CanSimultaneouslyMeetSurfaceConfidenceGates: false,
        normalHighestDecision: "INCONCLUSIVE_MACHINE_REFERENCE",
      },
      decisionVocabulary: [
        "INVALID_FOR_GENERALIZATION",
        "EXECUTION_INTEGRITY_FAILED",
        "POLICY_REVISION_REQUIRED_MACHINE_REFERENCE",
        "LIMITED_GENERALIZATION_EVIDENCE",
        "INCONCLUSIVE_MACHINE_REFERENCE",
      ],
      decisionCeiling: "INCONCLUSIVE_MACHINE_REFERENCE",
      forbiddenOverallOutputs: ["PASS", "APPROVED", "PRODUCTION_READY", "LIMITED_GENERALIZATION_EVIDENCE"],
    },
    runtimeAccommodation: migrated.runtimeAccommodation,
    providerControls: {
      firstProviderExecutionAllowed: false,
      providerEventCount: 0,
      requiredAuthorizationSchema: "ProviderAuthorizationV2",
      requiredAttemptReceiptSchema: "ProviderAttemptReceiptV2",
      allowedOrigins: migrated.providerControls.allowedOrigins,
      egress: migrated.providerControls.egress,
      openaiReferenceEnvelope: {
        provider: "OPENAI_DIRECT",
        projectResidency: OPENAI_PROJECT_RESIDENCY_V5,
        region: "US",
        method: "POST",
        endpoint: OPENAI_REFERENCE_ENDPOINT_V5,
        requestedOrigin: OPENAI_REFERENCE_ENDPOINT_V5,
        observedOriginRequired: OPENAI_REFERENCE_ENDPOINT_V5,
        requestedModel: OPENAI_REFERENCE_MODEL_V5,
        observedModelRequired: OPENAI_REFERENCE_MODEL_V5,
        apiSurface: "RESPONSES_API_V1",
        requestTemplate: deepClone(OPENAI_LOGICAL_REQUEST_TEMPLATE_V5),
        wireRequestTemplate: deepClone(OPENAI_WIRE_REQUEST_TEMPLATE_V5),
        logicalRequestTemplateHash: jcsHash(OPENAI_LOGICAL_REQUEST_TEMPLATE_V5),
        wireRequestTemplateHash: jcsHash(OPENAI_WIRE_REQUEST_TEMPLATE_V5),
        providerEventCount: 0,
        successfulCallCap: 300,
        attemptCap: 610,
        totalTokenCap: 4000000,
        usdCap: 25,
        currency: "USD",
        concurrencyCap: 4,
        roleAttemptCap: 2,
        worstCaseBufferGate: 0.2,
        currentAuthorizationHash: null,
        projectRoutePreflightReceiptHash: null,
        credentialReadinessReceiptHash: null,
        priceSnapshotHash: null,
        priceNotHardcoded: true,
        fullAuthorizationAllowed: false,
        fullAuthorizationBlockers: [
          "ACTIVE_V5_DESIGN_REGISTRATION_REQUIRED",
          "A21_RUNNER_V5_MIGRATION_REQUIRED",
          "FROZEN_FRAME_AND_SAMPLE_REQUIRED",
          "OPENAI_PROJECT_ROUTE_PREFLIGHT_REQUIRED",
          "OPENAI_CREDENTIAL_READINESS_REQUIRED",
          "CURRENT_PRICE_SNAPSHOT_REQUIRED",
          "HASH_BOUND_OWNER_AUTHORIZATION_REQUIRED",
        ],
        officialCapabilityEvidence: {
          evidenceType: "OFFICIAL_DOCUMENTATION_CAPABILITY_ONLY",
          checkedAt: FROZEN_AT_V5,
          urls: [...OFFICIAL_CAPABILITY_URLS],
          supportsResponsesApi: true,
          supportsStructuredOutputs: true,
          supportsReasoningContextCurrentTurn: true,
          usResidencyRouteDocumented: true,
          projectEntitlementVerified: false,
          modelAvailabilityOnOwnerProjectVerified: false,
          priceSnapshotCaptured: false,
          authorizationEffect: "NONE",
        },
      },
      deepSeekEnvelope: migrated.providerControls.deepSeekEnvelope,
      openaiReferenceRoleContractCatalog: openaiRoleCatalog,
      deepSeekRoleContractCatalog: {
        provider: "DEEPSEEK_DIRECT",
        roles: Object.fromEntries(Object.entries(DEEPSEEK_ROLE_CONTRACTS).map(([role, contract]) => [role, {
          provider: "DEEPSEEK_DIRECT",
          role,
          inputFieldNames: [...contract.inputFieldNames],
          promptHash: contract.promptHash,
          schemaHash: contract.schemaHash,
        }])),
        inheritedRoleContractRootHash: v4.providerControls.providerRoleContractCatalog.deepSeekRoleContractRootHash,
        inheritedRequestTemplateHash: v4.providerControls.providerRoleContractCatalog.deepSeekRequestTemplateHash,
      },
      combinedEnvelope: migrated.providerControls.combinedEnvelope,
      authorizationRequiredBindings: [
        ...new Set([
          ...migrated.providerControls.authorizationRequiredBindings,
          "projectResidency",
          "apiSurface",
          "logicalRequestTemplateHash",
          "wireRequestTemplateHash",
          "projectRoutePreflightReceiptHash",
        ]),
      ],
      priceRatePolicy: migrated.providerControls.priceRatePolicy,
      authorizationSeparation: "OpenAI reference and DeepSeek evaluation grants, tokens, attempts, successful calls, and USD caps are separate and nontransferable.",
      attemptStateMachine: migrated.providerControls.attemptStateMachine,
      attemptGraphPolicy: migrated.providerControls.attemptGraphPolicy,
      authorizationTemplates: buildAuthorizationTemplates(),
      currentOpenAIReferenceAuthorizationHash: null,
      currentDeepSeekAuthorizationHash: null,
      openaiProjectRoutePreflightAuthorizationHash: null,
      openaiProjectRoutePreflightReceiptHash: null,
      deepSeekRouteProbeAuthorizationHash: null,
      deepSeekRouteProbeReceiptHash: null,
    },
    executionLifecycle: {
      ...migrated.executionLifecycle,
      firstProviderCallProhibitedByThisDesignArtifact: true,
      firstProviderExecutionAllowed: false,
      v5RunnerImplemented: false,
      activeV5PointerRequired: true,
    },
    interfaces: {
      schemaCanonicalization: "RFC8785_JCS_SHA256",
      schemaTitles: [...V5_SCHEMA_TITLES],
      canonicalSchemaCatalog: schemaCatalog,
      schemaSetHash: jcsHash(schemaCatalog),
      inheritedV4SchemaPackage: {
        inventoryRootHash: inventory.inventoryRootHash,
        reuseStatus: "METHOD_SCHEMAS_INHERITED_EXCEPT_EXPLICIT_V5_PROVIDER_OVERRIDES",
      },
      cliRenameRequired: {
        predecessor: "label-qwen",
        v5: "label-openai",
        implementedInA21Runner: false,
      },
      structuralSchemaValidationAloneSufficient: false,
      semanticValidator: "validate-design-registration.mjs",
    },
    crossArtifactIntegrity: migrated.crossArtifactIntegrity,
    independentReview: migrated.independentReview,
    publicReport: migrated.publicReport,
    artifactStorage: migrated.artifactStorage,
    artifactKinds: migrated.artifactKinds,
    freezeChain: [
      "OWNER_REFERENCE_PROVIDER_DECISION_V5",
      "V4_CANDIDATE_DISPOSITION_SUPERSEDED_NOT_EXECUTED",
      "V5_SEALED_CANDIDATE",
      "A11_V5_INDEPENDENT_REVIEW",
      "ACTIVE_V5_DESIGN_POINTER",
      "CLEAN_RUNTIME_SOURCE_BINDING",
      "FRAME_REGISTRATION",
      "SAMPLE_REGISTRATION",
      "OPENAI_PROJECT_ROUTE_PREFLIGHT_AUTHORIZATION",
      "OPENAI_PROJECT_ROUTE_PREFLIGHT_RECEIPT",
      "OPENAI_REFERENCE_AUTHORIZATION",
      "OPENAI_REFERENCE_ATTEMPT_HISTORY_NONZERO",
      "REFERENCE_LABEL_SEAL",
      "DEEPSEEK_ROUTE_PROBE_AUTHORIZATION",
      "DEEPSEEK_ROUTE_PROBE_RECEIPT",
      "DEEPSEEK_AUTHORIZATION",
      "EXECUTION_REGISTRATION",
    ],
    preExecutionState: {
      schemaVersion: "PreExecutionStateV2",
      designRegistrationHash: null,
      activeDesignId: "MAIS-NATURAL-CA60-V3",
      activeV5Pointer: false,
      providerEventCount: 0,
      firstProviderExecutionAllowed: false,
      openaiReferenceAttemptCount: 0,
      firstOpenAIReferenceAttemptAt: null,
      deepSeekRouteProbeAttemptCount: 0,
      deepSeekNaturalItemAttemptCount: 0,
      firstDeepSeekNaturalItemAttemptAt: null,
      frameRegistrationHash: null,
      sampleManifestHash: null,
      openaiProjectRoutePreflightReceiptHash: null,
      openaiReferenceAuthorizationHash: null,
      referenceLabelSealHash: null,
      deepSeekAuthorizationHash: null,
      executionRegistrationHash: null,
    },
    executionChronology: {
      currentStage: "V5_SEALED_CANDIDATE_PENDING_INDEPENDENT_REVIEW",
      providerExecutionPermittedAtCurrentStage: false,
      nextRequiredStage: "A11_V5_INDEPENDENT_REVIEW",
      referenceLabelsMustPrecedeDeepSeekNaturalEvaluation: true,
      deepSeekBlindToReferenceLabels: true,
      resultDependentPromptOrThresholdMutationAllowed: false,
      anyPostCallContractChangeDisposition: "INVALID_FOR_GENERALIZATION_AND_NEW_REGISTRATION_REQUIRED",
    },
    providerEventCount: 0,
    firstProviderExecutionAllowed: false,
    frozenContractHashes: null,
    frozenContractRootHash: null,
    registrationHash: null,
  };

  registration.frozenContractHashes = calculateSectionHashes(registration);
  registration.frozenContractRootHash = jcsHash(Object.entries(registration.frozenContractHashes));
  registration.registrationHash = calculateRegistrationHash(registration);
  return registration;
}

export function buildStatisticalPowerV5(registrationHash) {
  const artifact = {
    schemaVersion: "NaturalCaStatisticalPowerV5",
    artifactKind: "FROZEN_STRUCTURAL_FEASIBILITY_AND_PRECISION_JUDGMENT",
    designRegistrationHash: registrationHash,
    sampleSize: 60,
    confidenceLevel: 0.95,
    decisionBound: "ONE_SIDED_95_PERCENT_WILSON",
    perfectPerformanceRequirements: {
      sensitivityMinimumPositiveItems: 25,
      specificityMinimumNegativeItems: 52,
      combinedMinimumItems: 77,
      exceedsCa60By: 17,
      simultaneousSurfaceGateFeasibleAtN60: false,
    },
    precisionGuidance: {
      twoSided95ApproximateHalfWidthAtPPoint5PercentagePoints: 12,
      zeroObservedP0MissesForOneSided95UcbBelowPoint05MinimumOpportunities: 59,
      futureWorstCaseFivePointPrecisionIndependentClustersApproximately: 400,
      automaticExpansionAuthorized: false,
    },
    decisionCeiling: "INCONCLUSIVE_MACHINE_REFERENCE",
    thresholdReductionAfterLabelsOrResultsAllowed: false,
    selfHash: null,
  };
  const hashPreimage = { ...artifact };
  delete hashPreimage.selfHash;
  artifact.selfHash = jcsHash(hashPreimage);
  return artifact;
}

export async function buildV5PackageManifest() {
  const files = (await walkFiles(HERE))
    .filter((absolute) => path.relative(HERE, absolute) !== "package-manifest.json")
    .sort();
  const entries = await Promise.all(files.map(async (absolute) => {
    const bytes = await readFile(absolute);
    return {
      path: path.relative(HERE, absolute),
      byteLength: bytes.byteLength,
      sha256: sha256Hex(bytes),
    };
  }));
  const registration = JSON.parse(await readFile(path.join(HERE, "design-registration.json"), "utf8"));
  const artifact = {
    schemaVersion: "V5PackageManifestV1",
    artifactKind: "EXACT_V5_PACKAGE_MANIFEST_EXCLUDING_SELF",
    designId: DESIGN_ID_V5,
    registrationHash: registration.registrationHash,
    schemaSetHash: registration.interfaces.schemaSetHash,
    providerEventCount: 0,
    firstProviderExecutionAllowed: false,
    excludedSelfPath: "package-manifest.json",
    inventoryAlgorithm: "SHA256(UTF8(JCS(sorted[{path,byteLength,sha256}])))",
    entries,
    fileCount: entries.length,
    packageRootHash: jcsHash(entries),
    generatedAt: FROZEN_AT_V5,
    selfHash: null,
  };
  const preimage = { ...artifact };
  delete preimage.selfHash;
  artifact.selfHash = jcsHash(preimage);
  return artifact;
}
