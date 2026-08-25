import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DRAFT = "https://json-schema.org/draft/2020-12/schema";
const HASH = { type: "string", pattern: "^[0-9a-f]{64}$" };
const GIT_SHA1 = { type: "string", pattern: "^[0-9a-f]{40}$" };
const NULLABLE_HASH = { anyOf: [HASH, { type: "null" }] };
const INSTANT = { type: "string", format: "date-time" };
const NULLABLE_INSTANT = { anyOf: [INSTANT, { type: "null" }] };
const NONEMPTY = { type: "string", minLength: 1 };
const STRING_ARRAY = { type: "array", items: NONEMPTY, uniqueItems: true };

function closedSchema(title, schemaVersion, properties, definitions = undefined) {
  const schema = {
    $schema: DRAFT,
    $id: `https://mais.local/schemas/${title}.schema.json`,
    title,
    type: "object",
    additionalProperties: false,
    required: ["schemaVersion", ...Object.keys(properties)],
    properties: {
      schemaVersion: { const: schemaVersion },
      ...properties,
    },
  };
  if (definitions) schema.$defs = definitions;
  return schema;
}

const anyClosedObject = {
  type: "object",
  additionalProperties: true,
};

const schemas = {
  NaturalCaPilotDesignRegistrationV5: closedSchema(
    "NaturalCaPilotDesignRegistrationV5",
    "NaturalCaPilotDesignRegistrationV5",
    {
      artifactKind: { const: "FROZEN_PRE_EXECUTION_DESIGN_CANDIDATE_NOT_EXECUTION_AUTHORIZATION" },
      designId: { const: "MAIS-NATURAL-CA60-V5" },
      designFamily: { const: "MAIS-NATURAL-CA60" },
      designKind: { const: "APPEND_ONLY_COMPOSITE_PRE_EXECUTION_DESIGN_REGISTRATION" },
      version: { const: 5 },
      candidateRevision: { const: 2 },
      supersedesCandidateRegistrationHash: HASH,
      preIndependentReviewCorrection: anyClosedObject,
      lifecycleStatus: { const: "SEALED_CANDIDATE_PENDING_INDEPENDENT_REVIEW" },
      freezeAllowed: { const: true },
      activationAllowed: { const: false },
      blockingActivationCodes: STRING_ARRAY,
      frozenAt: INSTANT,
      thresholdsFrozenAt: INSTANT,
      implementationBaseline: anyClosedObject,
      ownerProviderDecision: anyClosedObject,
      activeRegistrationAtAssembly: anyClosedObject,
      proposedSupersedesCandidate: anyClosedObject,
      composition: anyClosedObject,
      scope: anyClosedObject,
      runtimePopulation: anyClosedObject,
      eligibility: anyClosedObject,
      stratification: anyClosedObject,
      homologyClustering: anyClosedObject,
      deterministicSelection: anyClosedObject,
      machineReferenceWorkflow: anyClosedObject,
      taxonomy: anyClosedObject,
      labeling: anyClosedObject,
      analysis: anyClosedObject,
      runtimeAccommodation: anyClosedObject,
      providerControls: {
        type: "object",
        required: [
          "firstProviderExecutionAllowed",
          "providerEventCount",
          "requiredAuthorizationSchema",
          "requiredAttemptReceiptSchema",
          "openaiReferenceEnvelope",
          "deepSeekEnvelope",
          "authorizationTemplates",
          "currentOpenAIReferenceAuthorizationHash",
          "currentDeepSeekAuthorizationHash"
        ],
        properties: {
          firstProviderExecutionAllowed: { const: false },
          providerEventCount: { const: 0 },
          requiredAuthorizationSchema: { const: "ProviderAuthorizationV2" },
          requiredAttemptReceiptSchema: { const: "ProviderAttemptReceiptV2" },
          allowedOrigins: { type: "array" },
          egress: anyClosedObject,
          openaiReferenceEnvelope: {
            type: "object",
            required: [
              "provider",
              "projectResidency",
              "region",
              "method",
              "endpoint",
              "requestedOrigin",
              "observedOriginRequired",
              "requestedModel",
              "observedModelRequired",
              "apiSurface",
              "requestTemplate",
              "wireRequestTemplate",
              "logicalRequestTemplateHash",
              "wireRequestTemplateHash",
              "providerEventCount",
              "successfulCallCap",
              "attemptCap",
              "totalTokenCap",
              "usdCap",
              "currency",
              "concurrencyCap",
              "roleAttemptCap",
              "worstCaseBufferGate",
              "currentAuthorizationHash",
              "projectRoutePreflightReceiptHash",
              "credentialReadinessReceiptHash",
              "priceSnapshotHash",
              "priceNotHardcoded",
              "fullAuthorizationAllowed",
              "fullAuthorizationBlockers",
              "officialCapabilityEvidence"
            ],
            properties: {
              provider: { const: "OPENAI_DIRECT" },
              projectResidency: { const: "US_STORAGE_PROCESSING" },
              region: { const: "US" },
              method: { const: "POST" },
              endpoint: { const: "https://us.api.openai.com/v1/responses" },
              requestedOrigin: { const: "https://us.api.openai.com/v1/responses" },
              observedOriginRequired: { const: "https://us.api.openai.com/v1/responses" },
              requestedModel: { const: "gpt-5.6-luna" },
              observedModelRequired: { const: "gpt-5.6-luna" },
              apiSurface: { const: "RESPONSES_API_V1" },
              requestTemplate: anyClosedObject,
              wireRequestTemplate: anyClosedObject,
              logicalRequestTemplateHash: HASH,
              wireRequestTemplateHash: HASH,
              providerEventCount: { const: 0 },
              successfulCallCap: { const: 300 },
              attemptCap: { const: 610 },
              totalTokenCap: { const: 4000000 },
              usdCap: { const: 25 },
              currency: { const: "USD" },
              concurrencyCap: { const: 4 },
              roleAttemptCap: { const: 2 },
              worstCaseBufferGate: { const: 0.2 },
              currentAuthorizationHash: { type: "null" },
              projectRoutePreflightReceiptHash: { type: "null" },
              credentialReadinessReceiptHash: { type: "null" },
              priceSnapshotHash: { type: "null" },
              priceNotHardcoded: { const: true },
              fullAuthorizationAllowed: { const: false },
              fullAuthorizationBlockers: STRING_ARRAY,
              officialCapabilityEvidence: anyClosedObject
            },
            additionalProperties: false
          },
          deepSeekEnvelope: anyClosedObject,
          openaiReferenceRoleContractCatalog: anyClosedObject,
          deepSeekRoleContractCatalog: anyClosedObject,
          combinedEnvelope: anyClosedObject,
          authorizationRequiredBindings: STRING_ARRAY,
          priceRatePolicy: NONEMPTY,
          authorizationSeparation: NONEMPTY,
          attemptStateMachine: STRING_ARRAY,
          attemptGraphPolicy: NONEMPTY,
          authorizationTemplates: anyClosedObject,
          currentOpenAIReferenceAuthorizationHash: { type: "null" },
          currentDeepSeekAuthorizationHash: { type: "null" },
          openaiProjectRoutePreflightAuthorizationHash: { type: "null" },
          openaiProjectRoutePreflightReceiptHash: { type: "null" },
          deepSeekRouteProbeAuthorizationHash: { type: "null" },
          deepSeekRouteProbeReceiptHash: { type: "null" }
        },
        additionalProperties: false
      },
      executionLifecycle: anyClosedObject,
      interfaces: anyClosedObject,
      crossArtifactIntegrity: anyClosedObject,
      independentReview: anyClosedObject,
      publicReport: anyClosedObject,
      artifactStorage: anyClosedObject,
      artifactKinds: anyClosedObject,
      freezeChain: { type: "array", minItems: 17, items: NONEMPTY, uniqueItems: true },
      preExecutionState: anyClosedObject,
      executionChronology: anyClosedObject,
      providerEventCount: { const: 0 },
      firstProviderExecutionAllowed: { const: false },
      frozenContractHashes: { type: "object", minProperties: 10, additionalProperties: HASH },
      frozenContractRootHash: HASH,
      registrationHash: HASH
    }
  ),

  NaturalCaStatisticalPowerV5: closedSchema(
    "NaturalCaStatisticalPowerV5",
    "NaturalCaStatisticalPowerV5",
    {
      artifactKind: { const: "FROZEN_STRUCTURAL_FEASIBILITY_AND_PRECISION_JUDGMENT" },
      designRegistrationHash: HASH,
      sampleSize: { const: 60 },
      confidenceLevel: { const: 0.95 },
      decisionBound: { const: "ONE_SIDED_95_PERCENT_WILSON" },
      perfectPerformanceRequirements: anyClosedObject,
      precisionGuidance: anyClosedObject,
      decisionCeiling: { const: "INCONCLUSIVE_MACHINE_REFERENCE" },
      thresholdReductionAfterLabelsOrResultsAllowed: { const: false },
      selfHash: HASH
    }
  ),

  PredecessorPackageInventoryV2: closedSchema(
    "PredecessorPackageInventoryV2",
    "PredecessorPackageInventoryV2",
    {
      artifactKind: { const: "EXACT_IMMUTABLE_PREDECESSOR_PACKAGE_INVENTORY" },
      designId: { const: "MAIS-NATURAL-CA60-V4" },
      version: { const: 4 },
      disposition: { const: "SUPERSEDED_NOT_EXECUTED" },
      providerEventCount: { const: 0 },
      registrationByteSha256: HASH,
      inventoryAlgorithm: NONEMPTY,
      entries: {
        type: "array",
        minItems: 1,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["path", "byteLength", "sha256"],
          properties: {
            path: NONEMPTY,
            byteLength: { type: "integer", minimum: 0 },
            sha256: HASH
          }
        }
      },
      fileCount: { type: "integer", minimum: 1 },
      inventoryRootHash: HASH,
      recordedAt: INSTANT,
      reasonCode: { const: "OWNER_REPLACED_QWEN_WITH_OPENAI_GPT_5_6_LUNA_BEFORE_ANY_PROVIDER_CALL" }
    }
  ),

  ProviderAuthorizationV2: closedSchema(
    "ProviderAuthorizationV2",
    "ProviderAuthorizationV2",
    {
      authorizationId: NONEMPTY,
      authorizationKind: { enum: ["OPENAI_REFERENCE_LABELING", "DEEPSEEK_EVALUATION", "OPENAI_PROJECT_ROUTE_PREFLIGHT", "DEEPSEEK_ROUTE_PROBE"] },
      designId: { const: "MAIS-NATURAL-CA60-V5" },
      registrationHash: HASH,
      frameRegistrationHash: NULLABLE_HASH,
      samplingFrameHash: NULLABLE_HASH,
      sampleManifestHash: NULLABLE_HASH,
      runtimeConfigHash: NULLABLE_HASH,
      promptSetHash: HASH,
      schemaSetHash: HASH,
      runnerCommit: GIT_SHA1,
      runnerHash: HASH,
      adapterHash: HASH,
      providerRouteDecisionHash: HASH,
      projectRoutePreflightReceiptHash: NULLABLE_HASH,
      provider: { enum: ["OPENAI_DIRECT", "DEEPSEEK_DIRECT"] },
      projectResidency: { enum: ["US_STORAGE_PROCESSING", "UNKNOWN_PENDING_ROUTE_PROBE_EVIDENCE"] },
      dataRegion: NONEMPTY,
      apiSurface: NONEMPTY,
      endpoint: { type: "string", format: "uri" },
      model: NONEMPTY,
      roleSet: STRING_ARRAY,
      logicalRequestTemplateHash: HASH,
      wireRequestTemplateHash: HASH,
      payloadSetHash: HASH,
      allowedOrigin: { type: "string", format: "uri" },
      egressAllowlist: STRING_ARRAY,
      egressDenylist: STRING_ARRAY,
      privacyScreenHash: HASH,
      rightsScreenHash: HASH,
      issuedAt: INSTANT,
      expiresAt: INSTANT,
      maximumAttempts: { type: "integer", minimum: 1 },
      maximumSuccessfulCalls: { type: "integer", minimum: 1 },
      maximumInputTokens: { type: "integer", minimum: 0 },
      maximumOutputTokens: { type: "integer", minimum: 0 },
      maximumTokens: { type: "integer", minimum: 1 },
      maximumEstimatedUsd: { type: "number", exclusiveMinimum: 0 },
      currency: { const: "USD" },
      concurrencyCap: { type: "integer", minimum: 1, maximum: 4 },
      worstCaseCostPreviewUsd: { type: "number", minimum: 0 },
      costBufferMultiplier: { const: 1.2 },
      bufferedWorstCaseUsd: { type: "number", minimum: 0 },
      priceSnapshotHash: HASH,
      authorizedBy: NONEMPTY,
      ownerGrantHash: HASH,
      authorizationEvidenceHash: HASH,
      nonAuthorizations: STRING_ARRAY,
      previousAuthorizationHash: NULLABLE_HASH,
      isCurrentAuthorization: { type: "boolean" },
      referenceSealHash: NULLABLE_HASH,
      referenceAttemptChainHash: NULLABLE_HASH,
      routeProbeAuthorizationHash: NULLABLE_HASH,
      routeProbeReceiptHash: NULLABLE_HASH,
      authorizationHash: HASH
    }
  ),

  ProviderAttemptReceiptV2: closedSchema(
    "ProviderAttemptReceiptV2",
    "ProviderAttemptReceiptV2",
    {
      designId: { const: "MAIS-NATURAL-CA60-V5" },
      runId: NONEMPTY,
      registrationHash: HASH,
      frameRegistrationHash: HASH,
      sampleManifestHash: HASH,
      authorizationHash: HASH,
      referenceSealHash: NULLABLE_HASH,
      executionRegistrationHash: NULLABLE_HASH,
      itemIdPseudonym: NONEMPTY,
      itemHash: HASH,
      clusterId: NONEMPTY,
      role: NONEMPTY,
      attemptId: NONEMPTY,
      sequenceNumber: { type: "integer", minimum: 1 },
      requestedProvider: { enum: ["OPENAI_DIRECT", "DEEPSEEK_DIRECT"] },
      observedProvider: { enum: ["OPENAI_DIRECT", "DEEPSEEK_DIRECT", "UNOBSERVED_REQUEST_NOT_SENT"] },
      requestedModel: NONEMPTY,
      observedModel: { anyOf: [NONEMPTY, { type: "null" }] },
      requestedEndpoint: { type: "string", format: "uri" },
      observedEndpoint: { anyOf: [{ type: "string", format: "uri" }, { type: "null" }] },
      projectResidency: NONEMPTY,
      responseId: { anyOf: [NONEMPTY, { type: "null" }] },
      providerRequestId: { anyOf: [NONEMPTY, { type: "null" }] },
      requestBodyHash: NULLABLE_HASH,
      responseBodyHash: NULLABLE_HASH,
      parsedOutputHash: NULLABLE_HASH,
      logicalRequestHash: HASH,
      wireRequestBodyHash: NULLABLE_HASH,
      reasoningContextRequested: { enum: ["current_turn", "NOT_APPLICABLE"] },
      reasoningContextObserved: { enum: ["current_turn", "all_turns", "auto", "NOT_APPLICABLE", "UNOBSERVED"] },
      storeRequested: { type: "boolean" },
      backgroundRequested: { type: "boolean" },
      startedAt: INSTANT,
      finishedAt: NULLABLE_INSTANT,
      latencyMs: { anyOf: [{ type: "integer", minimum: 0 }, { type: "null" }] },
      httpStatus: { anyOf: [{ type: "integer", minimum: 100, maximum: 599 }, { type: "null" }] },
      finishReason: { anyOf: [NONEMPTY, { type: "null" }] },
      parseStatus: NONEMPTY,
      schemaStatus: NONEMPTY,
      attemptStatus: NONEMPTY,
      inputTokens: { type: "integer", minimum: 0 },
      outputTokens: { type: "integer", minimum: 0 },
      reasoningTokens: { type: "integer", minimum: 0 },
      totalTokens: { type: "integer", minimum: 0 },
      costRateSnapshotHash: HASH,
      estimatedCost: { type: "number", minimum: 0 },
      cumulativeCost: { type: "number", minimum: 0 },
      retryClassification: NONEMPTY,
      redactedError: { anyOf: [NONEMPTY, { type: "null" }] },
      appendOnly: { const: true },
      atomicWrite: { const: true },
      fileMode: { const: "0600" },
      cacheHit: { const: false },
      providerInvoiceAuthoritative: { const: true },
      previousReceiptHash: NULLABLE_HASH,
      selfHash: HASH
    }
  ),

  ProviderLogicalRequestV2: closedSchema(
    "ProviderLogicalRequestV2",
    "ProviderLogicalRequestV2",
    {
      provider: { enum: ["OPENAI_DIRECT", "DEEPSEEK_DIRECT"] },
      role: NONEMPTY,
      endpoint: { type: "string", format: "uri" },
      projectResidency: NONEMPTY,
      model: NONEMPTY,
      systemPrompt: NONEMPTY,
      inputPayload: anyClosedObject,
      responseSchema: anyClosedObject,
      responseSchemaLiteral: NONEMPTY,
      responseSchemaHash: HASH,
      logicalRequestTemplateHash: HASH,
      wireRequestTemplateHash: HASH,
      requestedSeed: { type: "null" },
      previousResponseId: { type: "null" },
      conversation: { type: "null" },
      adapterTransformVersion: NONEMPTY,
      adapterTransformHash: HASH,
      logicalRequestHash: HASH
    }
  ),

  ProviderWireEvidenceV2: closedSchema(
    "ProviderWireEvidenceV2",
    "ProviderWireEvidenceV2",
    {
      provider: { enum: ["OPENAI_DIRECT", "DEEPSEEK_DIRECT"] },
      endpoint: { type: "string", format: "uri" },
      method: { const: "POST" },
      model: NONEMPTY,
      projectResidency: NONEMPTY,
      logicalRequestHash: HASH,
      requestHeadersAllowlistHash: HASH,
      requestBodyHash: HASH,
      responseHeadersAllowlistHash: NULLABLE_HASH,
      rawResponseBodyHash: NULLABLE_HASH,
      parsedEnvelopeHash: NULLABLE_HASH,
      responseId: { anyOf: [NONEMPTY, { type: "null" }] },
      observedModel: { anyOf: [NONEMPTY, { type: "null" }] },
      observedReasoningContext: { anyOf: [NONEMPTY, { type: "null" }] },
      wireEvidenceHash: HASH
    }
  ),

  OpenAIProjectRoutePreflightReceiptV1: closedSchema(
    "OpenAIProjectRoutePreflightReceiptV1",
    "OpenAIProjectRoutePreflightReceiptV1",
    {
      designId: { const: "MAIS-NATURAL-CA60-V5" },
      registrationHash: HASH,
      preflightAuthorizationHash: HASH,
      credentialReadinessReceiptHash: HASH,
      provider: { const: "OPENAI_DIRECT" },
      requestedProjectResidency: { const: "US_STORAGE_PROCESSING" },
      requestedEndpoint: { const: "https://us.api.openai.com/v1/responses" },
      requestedModel: { const: "gpt-5.6-luna" },
      containsNaturalQuestionText: { const: false },
      observedEndpoint: { anyOf: [{ const: "https://us.api.openai.com/v1/responses" }, { type: "null" }] },
      observedModel: { anyOf: [{ const: "gpt-5.6-luna" }, { type: "null" }] },
      projectResidencyConsoleEvidenceHash: HASH,
      projectStorageAndProcessingConfirmed: { type: "boolean" },
      modelAvailableOnProject: { type: "boolean" },
      providerAttemptReceiptHash: HASH,
      priceSnapshotHash: HASH,
      preflightStatus: { enum: ["CONFIRMED", "BLOCKED", "FAILED"] },
      completedAt: INSTANT,
      selfHash: HASH
    }
  ),

  OpenAIReferenceRoleOutputV1: closedSchema(
    "OpenAIReferenceRoleOutputV1",
    "OpenAIReferenceRoleOutputV1",
    {
      designId: { const: "MAIS-NATURAL-CA60-V5" },
      registrationHash: HASH,
      itemIdPseudonym: NONEMPTY,
      itemHash: HASH,
      role: { enum: ["A_SOLVE", "A_LABEL", "B_SOLVE", "B_LABEL", "ADJUDICATOR"] },
      provider: { const: "OPENAI_DIRECT" },
      requestedModel: { const: "gpt-5.6-luna" },
      observedModel: { const: "gpt-5.6-luna" },
      responseId: NONEMPTY,
      attemptReceiptHash: HASH,
      promptHash: HASH,
      responseSchemaHash: HASH,
      structuredPayload: anyClosedObject,
      structuredPayloadHash: HASH,
      selfHash: HASH
    }
  ),

  V5PackageManifestV1: closedSchema(
    "V5PackageManifestV1",
    "V5PackageManifestV1",
    {
      artifactKind: { const: "EXACT_V5_PACKAGE_MANIFEST_EXCLUDING_SELF" },
      designId: { const: "MAIS-NATURAL-CA60-V5" },
      registrationHash: HASH,
      schemaSetHash: HASH,
      providerEventCount: { const: 0 },
      firstProviderExecutionAllowed: { const: false },
      excludedSelfPath: { const: "package-manifest.json" },
      inventoryAlgorithm: NONEMPTY,
      entries: {
        type: "array",
        minItems: 1,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["path", "byteLength", "sha256"],
          properties: {
            path: NONEMPTY,
            byteLength: { type: "integer", minimum: 0 },
            sha256: HASH
          }
        }
      },
      fileCount: { type: "integer", minimum: 1 },
      packageRootHash: HASH,
      generatedAt: INSTANT,
      selfHash: HASH
    }
  )
};

if (!process.argv.includes("--write")) {
  throw new Error("refusing to generate V5 schemas without --write");
}

await mkdir(HERE, { recursive: true });
for (const [title, schema] of Object.entries(schemas)) {
  await writeFile(path.join(HERE, `${title}.schema.json`), `${JSON.stringify(schema, null, 2)}\n`, { mode: 0o644 });
}
