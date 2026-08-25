import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  canonicalJson,
  DEEPSEEK_ROLE_CONTRACTS,
  PROVIDER_FIELD_PRESENCE_CONTRACT_V4,
  QWEN_ROLE_CONTRACTS,
  SAMPLE_ITEM_PSEUDONYM_FORMULA_V4,
  providerRequestTemplateHash,
} from "./design-contract.mjs";

const HERE = path.dirname(new URL(import.meta.url).pathname);
const V3 = path.resolve(HERE, "../design-v3");
const V3_REGISTRATION_HASH = "08e89a4d0c6736b48c1dde0048d8f620c35fc486e1d1feaf272e30a1aae4973d";
const V3_REGISTRATION_BYTE_SHA256 = "3299e95244540942ad82f6a616ace4d64be3a74ff1ba78172aeb6a34088f7939";
const V3_PACKAGE_INVENTORY_ROOT = "0aa952f44ee0558b0b5054b04bb669951e63e7c63a74a5a68881e70a3a5da471";

const REQUIRED_V4_SCHEMA_TITLES = [
  "AssetEgressLedgerV1",
  "C0RandomAuditSelectionV1",
  "ClusterAuditReceiptV1",
  "CredentialReadinessReceiptV1",
  "DeepSeekRouteProbeAuthorizationV1",
  "DeepSeekRouteProbeReceiptV1",
  "FrameFailureLedgerV1",
  "LineageRuleApprovalV1",
  "MissingReceiptItemBundleV1",
  "NaturalCaPilotDesignRegistrationV4",
  "PreExecutionStateV1",
  "PredecessorPackageInventoryV1",
  "ProviderLogicalRequestV1",
  "ProviderWireEvidenceV1",
  "RightsDecisionTableV1",
  "RunnerPersistenceProofV1",
  "RuntimeConfigSnapshotV1",
  "RuntimeGradeProjectionInvocationLeafV1",
  "RuntimeSourceEnumerationReceiptV1",
  "RuntimeSourceLeafV1",
  "RuntimeSourceModuleManifestV1",
  "RuntimeThreeRouteParityReceiptV1",
];

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function jcsHash(value) {
  return sha256(Buffer.from(canonicalJson(value), "utf8"));
}

function expectedRoleContractProjection(provider, contracts, presenceContractHash, pseudonymFormulaHash) {
  return Object.fromEntries(Object.entries(contracts).map(([role, contract]) => {
    const roleContractHashPreimage = {
      provider,
      role,
      inputFieldNames: [...contract.inputFieldNames],
      promptHash: contract.promptHash,
      schemaHash: contract.schemaHash,
      presenceContractHash,
      pseudonymFormulaHash,
    };
    return [role, {
      inputFieldNames: [...contract.inputFieldNames],
      promptLiteral: contract.promptLiteral,
      promptHash: contract.promptHash,
      schemaLiteral: contract.schemaLiteral,
      schemaHash: contract.schemaHash,
      roleContractHash: jcsHash(roleContractHashPreimage),
    }];
  }));
}

function expectedProviderProjectionRoots() {
  const fieldPresenceContractHash = jcsHash(PROVIDER_FIELD_PRESENCE_CONTRACT_V4);
  const sampleItemPseudonymFormulaHash = jcsHash(SAMPLE_ITEM_PSEUDONYM_FORMULA_V4);
  const qwen = expectedRoleContractProjection(
    "ALIBABA_CLOUD_MODEL_STUDIO",
    QWEN_ROLE_CONTRACTS,
    fieldPresenceContractHash,
    sampleItemPseudonymFormulaHash,
  );
  const deepSeek = expectedRoleContractProjection(
    "DEEPSEEK_DIRECT",
    DEEPSEEK_ROLE_CONTRACTS,
    fieldPresenceContractHash,
    sampleItemPseudonymFormulaHash,
  );
  const roleRoot = (contracts) => jcsHash(Object.entries(contracts)
    .map(([role, contract]) => [role, contract.roleContractHash])
    .sort(([left], [right]) => left.localeCompare(right)));
  const qwenRoleContractRootHash = roleRoot(qwen);
  const deepSeekRoleContractRootHash = roleRoot(deepSeek);
  const rootSetPreimage = [
    ["ALIBABA_CLOUD_MODEL_STUDIO", qwenRoleContractRootHash],
    ["DEEPSEEK_DIRECT", deepSeekRoleContractRootHash],
    ["FIELD_PRESENCE_CONTRACT", fieldPresenceContractHash],
    ["SAMPLE_ITEM_PSEUDONYM_FORMULA", sampleItemPseudonymFormulaHash],
  ].sort(([left], [right]) => left.localeCompare(right));
  return {
    qwen,
    deepSeek,
    roots: {
      canonicalization: "RFC8785_JCS",
      byteEncoding: "UTF-8",
      digestAlgorithm: "SHA-256",
      roleOrdering: "LEXICOGRAPHIC_ASCENDING_BY_ROLE",
      rootSetOrdering: "LEXICOGRAPHIC_ASCENDING_BY_PREIMAGE_LABEL",
      roleContractHashPreimageFields: [
        "provider",
        "role",
        "inputFieldNames",
        "promptHash",
        "schemaHash",
        "presenceContractHash",
        "pseudonymFormulaHash",
      ],
      fieldPresenceContract: PROVIDER_FIELD_PRESENCE_CONTRACT_V4,
      fieldPresenceContractHash,
      sampleItemPseudonymFormula: SAMPLE_ITEM_PSEUDONYM_FORMULA_V4,
      sampleItemPseudonymFormulaHash,
      qwenRoleContractRootHash,
      deepSeekRoleContractRootHash,
      providerProjectionContractRootSetHash: jcsHash(rootSetPreimage),
    },
  };
}

function expectedProviderRoleContractCatalog() {
  const projection = expectedProviderProjectionRoots();
  const compactRoles = (provider, roles) => Object.fromEntries(Object.entries(roles).map(([role, contract]) => [role, {
    provider,
    role,
    inputFieldNames: contract.inputFieldNames,
    promptHash: contract.promptHash,
    schemaHash: contract.schemaHash,
    roleContractHash: contract.roleContractHash,
  }]));
  return {
    ...projection.roots,
    qwen: compactRoles("ALIBABA_CLOUD_MODEL_STUDIO", projection.qwen),
    deepSeek: compactRoles("DEEPSEEK_DIRECT", projection.deepSeek),
    qwenRequestTemplateHash: providerRequestTemplateHash("ALIBABA_CLOUD_MODEL_STUDIO"),
    deepSeekRequestTemplateHash: providerRequestTemplateHash("DEEPSEEK_DIRECT"),
  };
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

async function liveV3Inventory() {
  const files = (await walkFiles(V3)).sort();
  return Promise.all(files.map(async (absolute) => {
    const bytes = await readFile(absolute);
    return {
      path: path.relative(V3, absolute),
      byteLength: bytes.byteLength,
      sha256: sha256(bytes),
    };
  }));
}

async function loadRegistration() {
  return JSON.parse(await readFile(path.join(HERE, "design-registration.json"), "utf8"));
}

const PRODUCTION_EMITTER_SOURCES = ["design-contract.mjs", "sample-contract.mjs", "review-gate.mjs"];

async function productionSchemaVersionLiterals() {
  const versions = new Set();
  for (const sourceName of PRODUCTION_EMITTER_SOURCES) {
    const source = await readFile(path.join(HERE, sourceName), "utf8");
    for (const pattern of [
      /schemaVersion\s*:\s*["']([A-Za-z0-9_-]+)["']/gu,
      /schemaVersion\s*(?:===|!==)\s*["']([A-Za-z0-9_-]+)["']/gu,
    ]) {
      for (const match of source.matchAll(pattern)) versions.add(match[1]);
    }
  }
  return [...versions].sort();
}

function resolveJsonPointer(document, pointer) {
  if (pointer === "#") return document;
  assert.match(pointer, /^#(?:\/(?:[^/~]|~[01])*)+$/u, `invalid JSON pointer ${pointer}`);
  return pointer.slice(2).split("/").reduce((node, encodedToken) => {
    const token = encodedToken.replaceAll("~1", "/").replaceAll("~0", "~");
    assert.ok(node && Object.hasOwn(node, token), `unresolved JSON pointer ${pointer}`);
    return node[token];
  }, document);
}

test("V4 records an exact immutable 45-file V3 predecessor inventory", async () => {
  const artifact = JSON.parse(await readFile(path.join(HERE, "predecessor-package-inventory-v3.json"), "utf8"));
  const live = await liveV3Inventory();
  assert.equal(live.length, 45);
  assert.deepEqual(artifact.entries, live);
  assert.equal(artifact.fileCount, 45);
  assert.equal(artifact.registrationHash, V3_REGISTRATION_HASH);
  assert.equal(artifact.registrationByteSha256, V3_REGISTRATION_BYTE_SHA256);
  assert.equal(artifact.inventoryAlgorithm, "SHA256(UTF8(JCS(sorted[{path,byteLength,sha256}])))");
  assert.equal(artifact.inventoryRootHash, sha256(Buffer.from(canonicalJson(live), "utf8")));
  assert.equal(artifact.inventoryRootHash, V3_PACKAGE_INVENTORY_ROOT);
});

test("V4 proposes a future V3 supersession but remains owner-decision blocked with no active registration freeze", async () => {
  const registration = await loadRegistration();
  assert.equal(registration.schemaVersion, "NaturalCaPilotDesignRegistrationV4");
  assert.equal(registration.designId, "MAIS-NATURAL-CA60-V4");
  assert.equal(registration.version, 4);
  assert.equal(registration.proposedSupersedesRegistrationHash, V3_REGISTRATION_HASH);
  assert.equal(registration.proposedSupersedesDispositionAfterValidFreeze, "SUPERSEDED_NOT_EXECUTED");
  assert.equal(registration.proposedSupersedes.currentDisposition, "ACTIVE_DESIGN_REGISTRATION_V3_NO_PROVIDER_EXECUTION");
  assert.equal(registration.proposedSupersedes.targetDispositionAfterValidFreeze, "SUPERSEDED_NOT_EXECUTED");
  assert.equal(Object.hasOwn(registration, "supersedes"), false);
  assert.equal(registration.predecessorPackageInventoryRootHash, V3_PACKAGE_INVENTORY_ROOT);
  assert.equal(registration.designKind, "PRE_EXECUTION_DESIGN_REGISTRATION_CANDIDATE");
  assert.equal(registration.lifecycleStatus, "DRAFT_OWNER_DECISIONS_PENDING");
  assert.equal(registration.freezeAllowed, false);
  assert.deepEqual(registration.blockingDecisionCodes, [
    "QWEN_ENDPOINT_AND_DATA_REGION_OWNER_DECISION_PENDING",
  ]);
  assert.equal(registration.frozenAt, null);
  assert.equal(registration.registrationHash, null);
  assert.equal(registration.frozenContractHashes, null);
  assert.match(registration.candidateAssembledAt, /^2026-08-25T/u);
  assert.match(registration.thresholdsFrozenAt, /^2026-08-25T/u);
  assert.equal(Date.parse(registration.thresholdsFrozenAt) <= Date.parse(registration.candidateAssembledAt), true);
  assert.equal(registration.providerEventCount, 0);
  assert.equal(registration.firstProviderExecutionAllowed, false);
  assert.equal(registration.preExecutionState.providerEventCount, 0);
  assert.equal(registration.preExecutionState.firstQwenReferenceAttemptAt, null);
  assert.equal(registration.preExecutionState.deepSeekRouteProbeAttemptCount, 0);
  assert.equal(registration.preExecutionState.deepSeekNaturalItemAttemptCount, 0);
  assert.equal(registration.preExecutionState.firstDeepSeekNaturalItemAttemptAt, null);
  assert.equal(registration.scope.decisionCeiling, "INCONCLUSIVE_MACHINE_REFERENCE");
  assert.equal(registration.scope.claimScopeCeiling, "CALIFORNIA_RUNTIME_EGRESS_ELIGIBLE_MACHINE_REFERENCE_PILOT_ONLY");
  assert.equal(Object.hasOwn(registration.scope, "claimCeiling"), false);
});

test("publication authorization remains separately blocked until A21 exact-pins the protected execution custody registry", async () => {
  const registration = await loadRegistration();
  assert.deepEqual(registration.blockingDecisionCodes, [
    "QWEN_ENDPOINT_AND_DATA_REGION_OWNER_DECISION_PENDING",
  ]);
  assert.equal(
    registration.publicationAuthorizationStatus,
    "BLOCKED_PENDING_A21_PROTECTED_CUSTODY_REGISTRY",
  );
  assert.deepEqual(registration.publicationAuthorizationBlockers, [
    "EXECUTION_CUSTODY_REGISTRY_NOT_IMPLEMENTED",
  ]);
  assert.equal(
    registration.executionLifecycle.publicationAuthorizationStatus,
    "BLOCKED_PENDING_A21_PROTECTED_CUSTODY_REGISTRY",
  );
  assert.equal(registration.executionLifecycle.publicationAuthorizationAvailable, false);
  assert.deepEqual(registration.executionLifecycle.publicationAuthorizationBlockers, [
    "EXECUTION_CUSTODY_REGISTRY_NOT_IMPLEMENTED",
  ]);

  const contract = registration.interfaces.publicationAuthorizationContract;
  assert.equal(contract.statusSchemaVersion, "AggregatePublicationAuthorizationStatusV1");
  assert.equal(contract.allowed, false);
  assert.equal(contract.status, "BLOCKED_PENDING_A21_PROTECTED_CUSTODY_REGISTRY");
  assert.equal(contract.authorizationAvailable, false);
  assert.equal(contract.blockingCode, "EXECUTION_CUSTODY_REGISTRY_NOT_IMPLEMENTED");
  assert.deepEqual(contract.blockerCodes, ["EXECUTION_CUSTODY_REGISTRY_NOT_IMPLEMENTED"]);
  assert.equal(contract.currentGateClassification, "CONSISTENCY_VALIDATOR_ONLY_NOT_PUBLICATION_AUTHORIZATION");
  assert.equal(contract.callerSuppliedCustodyRootsAuthorized, false);
  assert.equal(contract.protectedCustodyRegistryRequired, true);
  assert.equal(contract.protectedCustodyRegistryOwner, "A21");
  assert.equal(contract.requiredCustodyArtifactSchema, "ProtectedExecutionCustodyRegistryV1");
  assert.equal(contract.protectedRegistryRootHash, null);
  assert.equal(contract.runnerHash, null);
  assert.equal(contract.requiredBefore, "AGGREGATE_PUBLICATION_AUTHORIZATION");
  assert.equal(contract.laterBound, true);
  assert.equal(registration.interfaces.strongValidators.includes("canExportAggregateReport"), false);
  assert.equal(registration.interfaces.strongValidators.includes("validateAggregatePublicationConsistencyV1"), true);
  assert.deepEqual(contract.exactPinnedRootFields, [
    "activeDesignRegistrationHash",
    "activeExecutionRegistrationHash",
    "latestFinalEvaluationReceiptHash",
    "referenceSealHash",
    "frameRegistrationHash",
    "sampleManifestHash",
    "thresholdHash",
    "taxonomyHash",
    "labelSchemaHash",
    "adjudicationMethodHash",
    "severityRuleHash",
    "promptSetHash",
    "schemaSetHash",
    "runnerHash",
    "adapterHash",
    "statisticalPowerHash",
    "designSupersedesHash",
    "methodComponentRootSetHash",
    "reviewLedgerHeadHash",
    "finalFinishedAt",
  ]);
  assert.equal(registration.publicReport.publicationAuthorizationStatus, contract.status);
  assert.equal(registration.publicReport.currentGateClassification, contract.currentGateClassification);
  assert.equal(registration.publicReport.aggregateExportAuthorized, false);
});

test("V4 separates the implementation baseline from the later-bound clean runtime source", async () => {
  const registration = await loadRegistration();
  assert.match(registration.implementationBaseline.commit, /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u);
  assert.equal(registration.implementationBaseline.purpose, "DESIGN_IMPLEMENTATION_AND_OFFLINE_TEST_BASELINE_ONLY");
  assert.equal(registration.runtimeSourceBinding.status, "LATER_BIND_REQUIRED");
  assert.equal(registration.runtimeSourceBinding.sourceCommit, null);
  assert.equal(registration.runtimeSourceBinding.runtimeConfigHash, null);
  assert.equal(registration.runtimeSourceBinding.frameFreezeAllowed, false);
  assert.equal(registration.runtimePopulation.sourceCommit, null);
  assert.deepEqual(registration.runtimePopulation.gradeProjections, [
    "K", "P1", "P2", "P3", "P4", "P5", "P6", "S1", "S2", "S3", "S4", "S5", "S6",
  ]);
});

test("replacement authority history root binds the exact append-order history rather than an authority projection", async () => {
  const registration = await loadRegistration();
  assert.equal(
    registration.deterministicSelection.replacementAuthorityHistoryRootFormula,
    "SHA256(JCS(exact full replacementHistory array in append order))",
  );
});

test("every V4 schema filename, title, id, schemaVersion, and emitted-artifact map agree", async () => {
  const registration = await loadRegistration();
  const schemaFiles = (await readdir(path.join(HERE, "schemas"))).filter((name) => name.endsWith(".schema.json")).sort();
  const titles = [];
  for (const filename of schemaFiles) {
    const schema = JSON.parse(await readFile(path.join(HERE, "schemas", filename), "utf8"));
    const title = filename.replace(/\.schema\.json$/u, "");
    titles.push(title);
    assert.equal(schema.title, title, filename);
    assert.equal(schema.$id, `https://mais.hk/schemas/research/${title}.schema.json`, filename);
    assert.equal(schema.properties.schemaVersion.const, title, filename);
    assert.equal(schema.type, "object", filename);
    assert.equal(schema.additionalProperties, false, filename);
    assert.deepEqual(registration.interfaces.emittedArtifactSchemaMap[title], {
      schemaPath: `schemas/${filename}`,
      jsonPointer: "#",
      mappingKind: "STANDALONE_SCHEMA_ROOT",
    }, filename);
  }
  assert.equal(schemaFiles.includes("NaturalCaPilotDesignRegistrationV3.schema.json"), false);
  assert.equal(schemaFiles.includes("NaturalCaPilotDesignRegistrationV4.schema.json"), true);
  assert.deepEqual([...registration.interfaces.schemaTitles].sort(), titles.sort());
  for (const title of REQUIRED_V4_SCHEMA_TITLES) assert.equal(titles.includes(title), true, `${title} schema missing`);
});

test("every production schemaVersion literal and persisted root artifact resolves to a closed mapped schema node", async () => {
  const registration = await loadRegistration();
  const map = registration.interfaces.emittedArtifactSchemaMap;
  const rootJsonNames = (await readdir(HERE)).filter((name) => name.endsWith(".json"));
  const rootVersions = [];
  for (const name of rootJsonNames) {
    const artifact = JSON.parse(await readFile(path.join(HERE, name), "utf8"));
    if (typeof artifact.schemaVersion === "string") rootVersions.push(artifact.schemaVersion);
  }
  const expectedVersions = [...new Set([
    ...await productionSchemaVersionLiterals(),
    ...rootVersions,
    "MachineReferenceSolveV1",
  ])].sort();
  assert.deepEqual(registration.interfaces.productionEmitterSourcePaths, PRODUCTION_EMITTER_SOURCES);
  assert.deepEqual(registration.interfaces.productionSchemaVersionLiterals, await productionSchemaVersionLiterals());
  assert.deepEqual(registration.interfaces.persistedArtifactSchemaVersions, Object.keys(map).sort());
  for (const schemaVersion of expectedVersions) {
    const mapping = map[schemaVersion];
    assert.ok(mapping, `${schemaVersion} has no emitted-artifact schema mapping`);
    assert.deepEqual(Object.keys(mapping).sort(), ["jsonPointer", "mappingKind", "schemaPath"]);
    assert.match(mapping.schemaPath, /^schemas\/[A-Za-z0-9_-]+\.schema\.json$/u);
    assert.ok(["STANDALONE_SCHEMA_ROOT", "CLOSED_PARENT_DEFINITION"].includes(mapping.mappingKind));
    const schema = JSON.parse(await readFile(path.join(HERE, mapping.schemaPath), "utf8"));
    const target = resolveJsonPointer(schema, mapping.jsonPointer);
    assert.equal(target.type, "object", `${schemaVersion} target must be an object`);
    assert.equal(target.additionalProperties, false, `${schemaVersion} target must fail closed`);
    assert.equal(target.properties?.schemaVersion?.const, schemaVersion, `${schemaVersion} identity mismatch`);
    assert.equal(target.required?.includes("schemaVersion"), true, `${schemaVersion} must require schemaVersion`);
    if (mapping.mappingKind === "CLOSED_PARENT_DEFINITION") {
      assert.deepEqual([...target.required].sort(), Object.keys(target.properties).sort(), `${schemaVersion} parent definition must require its complete closed field set`);
    }
  }
  assert.equal(registration.interfaces.unmappedPersistedArtifactDisposition, "FAIL_CLOSED");
  assert.equal(map.UnknownArtifactV99, undefined);
});

test("V4 freezes templates only, keeps authorization absent, and fail-closes unknown DeepSeek route facts", async () => {
  const registration = await loadRegistration();
  for (const provider of ["QWEN_MACHINE_REFERENCE", "DEEPSEEK_EVALUATION"]) {
    assert.equal(registration.providerControls.authorizationTemplates[provider].isCurrentAuthorization, false);
    assert.match(registration.providerControls.authorizationTemplates[provider].templateHash, /^[0-9a-f]{64}$/u);
  }
  assert.equal(registration.providerControls.currentQwenAuthorizationHash, null);
  assert.equal(registration.providerControls.currentDeepSeekAuthorizationHash, null);
  assert.equal(registration.providerControls.deepSeekEnvelope.region, "UNKNOWN_PENDING_ROUTE_PROBE_EVIDENCE");
  assert.equal(registration.providerControls.deepSeekEnvelope.directBillingStatus, "UNKNOWN_PENDING_ROUTE_PROBE_EVIDENCE");
  assert.equal(registration.providerControls.deepSeekEnvelope.fullAuthorizationAllowed, false);
  assert.equal(registration.providerControls.deepSeekEnvelope.priceNotHardcoded, true);
});

test("V4 leaves the Qwen endpoint and region at an explicit owner-decision gate", async () => {
  const qwen = (await loadRegistration()).providerControls.qwenEnvelope;
  assert.equal(qwen.endpoint, null);
  assert.equal(qwen.region, null);
  assert.equal(qwen.endpointDecisionStatus, "OWNER_DECISION_REQUIRED_NOT_FROZEN");
  assert.equal(qwen.regionDecisionStatus, "OWNER_DECISION_REQUIRED_NOT_FROZEN");
  assert.equal(qwen.fullAuthorizationAllowed, false);
  assert.equal(qwen.existingLegacyCandidate.endpoint, "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions");
  assert.equal(qwen.existingLegacyCandidate.region, "cn-beijing");
  assert.equal(qwen.existingLegacyCandidate.ownerApprovedForV4, false);
  assert.equal(qwen.fullAuthorizationBlockers.includes("OWNER_APPROVED_QWEN_ENDPOINT_AND_REGION_DECISION"), true);
});

test("V4 binds each provider role to the frozen presence and pseudonym contracts through sorted JCS roots", async () => {
  const registration = await loadRegistration();
  assert.deepEqual(registration.providerControls.providerRoleContractCatalog, expectedProviderRoleContractCatalog());
  assert.equal(Object.hasOwn(registration.providerControls, "frozenRoleContracts"), false);
  assert.ok(registration.providerControls.staleSupersededProviderRoleContracts);
});

test("V4 freezes separate logical and wire provider templates without unsupported seed n or tools fields", async () => {
  const registration = await loadRegistration();
  const qwen = registration.providerControls.qwenEnvelope;
  assert.deepEqual(qwen.requestTemplate, {
    envelopeStage: "LOGICAL_REQUEST_PRE_ADAPTER_V4",
    model: "qwen3.8-max",
    stream: false,
    enable_thinking: true,
    temperature: 0,
    response_format: { type: "json_object" },
    max_tokens: 8192,
    enable_search: false,
    requestedSeed: null,
  });
  assert.deepEqual(qwen.wireRequestTemplate, {
    model: "qwen3.8-max",
    stream: false,
    enable_thinking: true,
    temperature: 0,
    response_format: { type: "json_object" },
    max_tokens: 8192,
    enable_search: false,
  });
  const deepSeek = registration.providerControls.deepSeekEnvelope;
  assert.deepEqual(deepSeek.requestTemplate, {
    envelopeStage: "LOGICAL_REQUEST_PRE_ADAPTER_V4",
    model: "deepseek-v4-pro",
    stream: false,
    thinking: { type: "enabled" },
    reasoning_effort: "high",
    temperature: 0,
    response_format: { type: "json_object" },
    max_tokens: 8192,
    requestedSeed: null,
  });
  assert.deepEqual(deepSeek.wireRequestTemplate, {
    model: "deepseek-v4-pro",
    stream: false,
    thinking: { type: "enabled" },
    reasoning_effort: "high",
    temperature: 0,
    response_format: { type: "json_object" },
    max_tokens: 8192,
  });
  for (const template of [qwen.requestTemplate, qwen.wireRequestTemplate, deepSeek.requestTemplate, deepSeek.wireRequestTemplate]) {
    for (const forbidden of ["seed", "n", "tools", "top_p"]) assert.equal(Object.hasOwn(template, forbidden), false, forbidden);
  }
});

test("freeze/later-bind DAG requires Qwen history and seal before full DeepSeek authorization", async () => {
  const registration = await loadRegistration();
  assert.deepEqual(registration.freezeChain, [
    "QWEN_ENDPOINT_AND_DATA_REGION_OWNER_DECISION",
    "DESIGN_REGISTRATION_V4",
    "RUNTIME_SOURCE_BINDING",
    "FRAME_REGISTRATION",
    "SAMPLE_REGISTRATION",
    "QWEN_AUTHORIZATION",
    "QWEN_REFERENCE_ATTEMPT_HISTORY_NONZERO",
    "REFERENCE_LABEL_SEAL",
    "DEEPSEEK_ROUTE_PROBE_AUTHORIZATION",
    "DEEPSEEK_ROUTE_PROBE_RECEIPT",
    "DEEPSEEK_AUTHORIZATION",
    "EXECUTION_REGISTRATION",
  ]);
  assert.equal(registration.executionChronology.deepSeekRouteProbe.payloadKind, "STATIC_NON_NATURAL_ROUTE_PROBE");
  assert.equal(registration.executionChronology.deepSeekRouteProbe.containsNaturalItemText, false);
  assert.equal(registration.executionChronology.deepSeekRouteProbe.countsAgainstDeepSeekCaps.attempts, true);
  assert.equal(registration.executionChronology.deepSeekRouteProbe.countsAgainstDeepSeekCaps.tokens, true);
  assert.equal(registration.executionChronology.deepSeekRouteProbe.countsAgainstDeepSeekCaps.usd, true);
  assert.deepEqual(registration.executionChronology.deepSeekFullAuthorizationRequires, [
    "VALID_DEEPSEEK_ROUTE_PROBE_RECEIPT_HASH",
    "SEALED_REFERENCE_LABEL_HASH",
    "NONZERO_QWEN_REFERENCE_ATTEMPT_CHAIN_HASH",
  ]);
});

test("package documents state that frame, sample, authorization, provider execution, results, and review remain absent", async () => {
  const text = `${await readFile(path.join(HERE, "README.md"), "utf8")}\n${await readFile(path.join(HERE, "PRE-EXECUTION-ERRATUM.md"), "utf8")}`;
  for (const phrase of [
    "no frame freeze",
    "no sample freeze",
    "no current provider authorization",
    "no provider call",
    "no natural-question result",
    "no independent review receipt",
  ]) assert.match(text, new RegExp(phrase, "iu"), phrase);
});
