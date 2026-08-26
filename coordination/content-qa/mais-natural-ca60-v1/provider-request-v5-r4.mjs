import DESIGN from "../../research/mais-natural-ca60-v1/versions/design-v5/design-registration.json" with { type: "json" };
import {
  calculateArtifactHash,
} from "../../research/mais-natural-ca60-v1/versions/design-v2/design-contract.mjs";
import {
  calculateFrozenNaturalItemLeafHashV4,
  deriveProtectedFrozenItemProjectionV4,
} from "../../research/mais-natural-ca60-v1/versions/design-v4/design-contract.mjs";
import {
  OPENAI_REFERENCE_ADAPTER_TRANSFORM_HASH_V5,
  buildOpenAIReferenceLogicalRequestV5,
  buildOpenAIReferenceWireRequestV5,
  validateOpenAIReferenceWireRequestV5,
} from "./openai-reference-adapter-v5.mjs";
import {
  DEEPSEEK_EVALUATION_ADAPTER_V5_R2_CONSTANTS,
  buildDeepSeekEvaluationRequestV5R2,
} from "./deepseek-evaluation-adapter-v5-r2.mjs";
import { buildSampleBoundProtectedItemEnvelopeV4 } from "./sample-contract-v5.mjs";
import {
  canonicalJsonV5R3,
  sealV5R3Artifact,
  sha256V5R3,
} from "./execution-integrity-v5-r3.mjs";
import {
  assertClosedSelfHashedArtifactV5R4,
  validateClosedSelfHashedArtifactV5R4,
} from "./schema-contract-v5-r4.mjs";
import {
  validateRunnerRegistrationV5R4,
  validateSampleExecutionInventoryV2,
} from "./execution-evidence-v5-r4.mjs";
import { resolveSuccessfulRoleOutputV5R4 } from "./atomic-execution-ledger-v5-r4.mjs";

const OPENAI_PRIORS = Object.freeze({
  A_SOLVE: Object.freeze([]),
  A_LABEL: Object.freeze(["A_SOLVE"]),
  B_SOLVE: Object.freeze([]),
  B_LABEL: Object.freeze(["B_SOLVE"]),
  ADJUDICATOR: Object.freeze(["A_SOLVE", "A_LABEL", "B_SOLVE", "B_LABEL"]),
});
const DEEPSEEK_PRIORS = Object.freeze({
  B_PRIME_CRITIQUE: Object.freeze([]),
  B_PRIME_REVISION: Object.freeze(["B_PRIME_CRITIQUE"]),
  C0_PRIME_ROLE_1: Object.freeze([]),
  C0_PRIME_ROLE_2: Object.freeze([]),
  C0_PRIME_ROLE_3: Object.freeze([]),
  C0_PRIME_ROLE_4: Object.freeze([]),
  C0_PRIME_ROLE_5: Object.freeze([]),
});

function exactProviderTuple(provider) {
  if (provider === "OPENAI_DIRECT") return Object.freeze({
    provider,
    model: "gpt-5.6-luna",
    endpoint: "https://us.api.openai.com/v1/responses",
    projectResidency: "US_STORAGE_PROCESSING",
    roles: OPENAI_PRIORS,
  });
  if (provider === "DEEPSEEK_DIRECT") return Object.freeze({
    provider,
    model: "deepseek-v4-pro",
    endpoint: "https://api.deepseek.com/chat/completions",
    projectResidency: "UNKNOWN_PENDING_ROUTE_PROBE_EVIDENCE",
    roles: DEEPSEEK_PRIORS,
  });
  throw new TypeError("provider request tuple is outside the frozen V5 design");
}

function roleContract(provider, role) {
  const catalog = provider === "OPENAI_DIRECT"
    ? DESIGN.providerControls.openaiReferenceRoleContractCatalog.roles
    : DESIGN.providerControls.deepSeekRoleContractCatalog.roles;
  const contract = catalog?.[role];
  if (!contract) throw new TypeError("provider role is outside the frozen V5 contract catalog");
  return contract;
}

function inventoryItem(inventory, envelope) {
  const rows = inventory.items.filter((item) => item.itemHash === envelope.itemHash);
  if (rows.length !== 1) throw new TypeError("protected item is not exactly one inventory member");
  const row = rows[0];
  if (row.itemIdPseudonym !== envelope.itemPseudonym || row.clusterId !== envelope.homologyClusterId) {
    throw new TypeError("protected item pseudonym or cluster differs from the registered execution inventory");
  }
  return row;
}

function assertRoleOutput(output, expected) {
  assertClosedSelfHashedArtifactV5R4(output, "ProviderRoleOutputV1");
  for (const [field, value] of Object.entries(expected)) {
    if (output[field] !== value) throw new TypeError(`authoritative prior role output ${field} mismatch`);
  }
}

function localOpenAIArtifact({ role, output, itemLeaf, clusterId }) {
  const base = {
    schemaVersion: role.endsWith("SOLVE") ? "MachineReferenceSolveArtifactV1" : "RawMachineReferenceLocalLabelV1",
    role,
    itemId: itemLeaf.itemId,
    itemHash: output.itemHash,
    clusterId,
  };
  if (role.endsWith("SOLVE")) {
    const artifact = { ...base, solveOutput: structuredClone(output.parsedPayload) };
    artifact.artifactHash = calculateArtifactHash(artifact, "artifactHash");
    return artifact;
  }
  const payload = output.parsedPayload;
  const artifact = {
    ...base,
    rawLabel: payload.rawLabel,
    rawTaxonomyCodes: structuredClone(payload.rawTaxonomyCodes),
    rawSeverity: payload.rawSeverity,
    rawFindingFamilies: structuredClone(payload.rawFindingFamilies),
    rawFindings: structuredClone(payload.rawFindings),
    rawUncertain: payload.rawUncertain,
  };
  artifact.labelHash = calculateArtifactHash(artifact, "labelHash");
  return artifact;
}

function localDeepSeekCritiqueArtifact({ output, promptHash, schemaHash }) {
  const artifact = {
    schemaVersion: "BPrimeCritiqueArtifactV1",
    designId: "MAIS-NATURAL-CA60-V4",
    itemHash: output.itemHash,
    role: "B_PRIME_CRITIQUE",
    promptHash,
    schemaHash,
    parsedPayload: structuredClone(output.parsedPayload),
    parsedOutputHash: output.parsedPayloadHash,
    sourceOutputHash: output.selfHash,
  };
  artifact.critiqueArtifactHash = calculateArtifactHash(artifact, "critiqueArtifactHash");
  return artifact;
}

function authoritativePriors({ roles, entries, authorization, inventory, itemHash, itemLeaf, clusterId }) {
  const priorCompletionHashes = [];
  const localArtifacts = {};
  let bPrimeCritiqueArtifact;
  for (const priorRole of roles) {
    const resolved = resolveSuccessfulRoleOutputV5R4({ entries, authorization, inventory, itemHash, role: priorRole });
    assertRoleOutput(resolved.output, {
      runnerRegistrationHash: authorization.runnerRegistrationHash,
      sampleExecutionInventoryHash: inventory.selfHash,
      authorizationHash: authorization.selfHash,
      provider: authorization.provider,
      model: authorization.model,
      endpoint: authorization.endpoint,
      role: priorRole,
      itemHash,
      clusterId,
    });
    priorCompletionHashes.push(resolved.completion.selfHash);
    if (authorization.provider === "OPENAI_DIRECT") {
      const artifact = localOpenAIArtifact({ role: priorRole, output: resolved.output, itemLeaf, clusterId });
      if (priorRole === "A_SOLVE") localArtifacts.aSolve = artifact;
      if (priorRole === "A_LABEL") localArtifacts.aLabel = artifact;
      if (priorRole === "B_SOLVE") localArtifacts.bSolve = artifact;
      if (priorRole === "B_LABEL") localArtifacts.bLabel = artifact;
    } else {
      const contract = roleContract("DEEPSEEK_DIRECT", priorRole);
      bPrimeCritiqueArtifact = localDeepSeekCritiqueArtifact({ output: resolved.output, promptHash: contract.promptHash, schemaHash: contract.schemaHash });
    }
  }
  return Object.freeze({ localArtifacts, bPrimeCritiqueArtifact, priorCompletionHashes: Object.freeze(priorCompletionHashes) });
}

function forbiddenFieldPaths(value, pattern, at = "$") {
  if (Array.isArray(value)) return value.flatMap((entry, index) => forbiddenFieldPaths(entry, pattern, `${at}[${index}]`));
  if (!value || typeof value !== "object") return [];
  const failures = [];
  for (const [key, nested] of Object.entries(value)) {
    const child = `${at}.${key}`;
    if (pattern.test(key)) failures.push(child);
    failures.push(...forbiddenFieldPaths(nested, pattern, child));
  }
  return failures;
}

function exactFields(value, expected) {
  return canonicalJsonV5R3(Object.keys(value).sort()) === canonicalJsonV5R3([...expected].sort());
}

function resolvedStoredAnswerPresence(projection) {
  if (projection.storedAnswer.presence !== "MISSING") return structuredClone(projection.storedAnswer);
  if (projection.answer.presence === "PRESENT") {
    return { presence: "PRESENT", sourceField: "answer", value: structuredClone(projection.answer.value) };
  }
  if (projection.answer.presence === "NULL") return { presence: "NULL", sourceField: "answer" };
  return { presence: "MISSING" };
}

function assertLocalArtifactIdentity(artifact, { role, hashField, projection, itemHash }) {
  if (!artifact || typeof artifact !== "object" || Array.isArray(artifact)
    || artifact.role !== role || artifact.itemId !== projection.itemId
    || artifact.itemHash !== itemHash || artifact.clusterId !== projection.homologyClusterId
    || artifact[hashField] !== calculateArtifactHash(artifact, hashField)) {
    throw new TypeError(`${role} local artifact identity or self-hash mismatch`);
  }
}

function projectOpenAISolveArtifact({ artifact, role, projection, itemHash, itemIdPseudonym }) {
  assertLocalArtifactIdentity(artifact, { role, hashField: "artifactHash", projection, itemHash });
  const solve = artifact.solveOutput;
  if (!solve || typeof solve !== "object" || Array.isArray(solve)) throw new TypeError(`${role} solve output missing`);
  return {
    itemIdPseudonym,
    role,
    solution: solve.solution,
    solvability: solve.solvability,
    uncertain: solve.uncertain,
  };
}

function projectOpenAILabelArtifact({ artifact, role, projection, itemHash, itemIdPseudonym }) {
  assertLocalArtifactIdentity(artifact, { role, hashField: "labelHash", projection, itemHash });
  return {
    itemIdPseudonym,
    role,
    rawLabel: artifact.rawLabel,
    rawTaxonomyCodes: structuredClone(artifact.rawTaxonomyCodes),
    rawSeverity: artifact.rawSeverity,
    rawFindingFamilies: structuredClone(artifact.rawFindingFamilies),
    rawFindings: structuredClone(artifact.rawFindings),
    rawUncertain: artifact.rawUncertain,
  };
}

function buildOpenAIProviderInputV5R4({ role, projection, itemHash, itemIdPseudonym, localArtifacts }) {
  const base = {
    prompt: structuredClone(projection.prompt),
    options: structuredClone(projection.options),
    locale: projection.localePolicy,
    grade: projection.grade,
    topic: structuredClone(projection.topic),
    responseForm: projection.responseForm,
    storedAnswer: resolvedStoredAnswerPresence(projection),
    acceptedAnswers: structuredClone(projection.acceptedAnswers),
    explanation: structuredClone(projection.explanation),
  };
  if (role === "A_LABEL" || role === "B_LABEL") {
    const solveRole = role === "A_LABEL" ? "A_SOLVE" : "B_SOLVE";
    const artifact = role === "A_LABEL" ? localArtifacts.aSolve : localArtifacts.bSolve;
    base.itemSolveArtifact = projectOpenAISolveArtifact({ artifact, role: solveRole, projection, itemHash, itemIdPseudonym });
  }
  if (role === "ADJUDICATOR") {
    base.aSolveArtifact = projectOpenAISolveArtifact({ artifact: localArtifacts.aSolve, role: "A_SOLVE", projection, itemHash, itemIdPseudonym });
    base.aLabelArtifact = projectOpenAILabelArtifact({ artifact: localArtifacts.aLabel, role: "A_LABEL", projection, itemHash, itemIdPseudonym });
    base.bSolveArtifact = projectOpenAISolveArtifact({ artifact: localArtifacts.bSolve, role: "B_SOLVE", projection, itemHash, itemIdPseudonym });
    base.bLabelArtifact = projectOpenAILabelArtifact({ artifact: localArtifacts.bLabel, role: "B_LABEL", projection, itemHash, itemIdPseudonym });
  }
  const fields = roleContract("OPENAI_DIRECT", role).inputFieldNames;
  const providerInput = Object.fromEntries(fields.map((field) => [field, base[field]]));
  if (Object.values(providerInput).some((value) => value === undefined)) throw new TypeError(`${role} provider input is incomplete`);
  return providerInput;
}

function buildDeepSeekProviderInputV5R4({ role, projection, itemHash, itemIdPseudonym, bPrimeCritiqueArtifact }) {
  const base = {
    prompt: structuredClone(projection.prompt),
    options: structuredClone(projection.options),
    storedAnswer: resolvedStoredAnswerPresence(projection),
    acceptedAnswers: structuredClone(projection.acceptedAnswers),
    explanation: structuredClone(projection.explanation),
    rubric: projection.rubric,
    difficulty: projection.difficulty,
    itemPseudonym: itemIdPseudonym,
  };
  if (role === "B_PRIME_REVISION") {
    const critique = bPrimeCritiqueArtifact;
    if (!critique || typeof critique !== "object" || Array.isArray(critique)
      || critique.schemaVersion !== "BPrimeCritiqueArtifactV1" || critique.itemHash !== itemHash
      || critique.role !== "B_PRIME_CRITIQUE"
      || critique.critiqueArtifactHash !== calculateArtifactHash(critique, "critiqueArtifactHash")
      || !critique.parsedPayload || typeof critique.parsedPayload !== "object" || Array.isArray(critique.parsedPayload)) {
      throw new TypeError("B-prime critique provider artifact missing or not sealed to the V5 manifest item");
    }
    base.bPrimeCritiqueArtifact = {
      itemPseudonym: itemIdPseudonym,
      role: "B_PRIME_CRITIQUE",
      critiqueArtifactHash: critique.critiqueArtifactHash,
      parsedPayload: structuredClone(critique.parsedPayload),
    };
  }
  const fields = roleContract("DEEPSEEK_DIRECT", role).inputFieldNames;
  const providerInput = Object.fromEntries(fields.map((field) => [field, base[field]]));
  if (Object.values(providerInput).some((value) => value === undefined)) throw new TypeError(`${role} provider input is incomplete`);
  return providerInput;
}

export function buildProviderRequestArtifactV5R4({
  registration,
  authorization,
  inventory,
  sampleManifest,
  itemLeaf,
  role,
  attemptId,
  ledgerEntries = [],
}) {
  const registrationErrors = validateRunnerRegistrationV5R4(registration);
  if (registrationErrors.length > 0) throw new TypeError(registrationErrors.join("; "));
  assertClosedSelfHashedArtifactV5R4(authorization, "ProviderAuthorizationV4");
  const inventoryErrors = validateSampleExecutionInventoryV2({ registration, inventory });
  if (inventoryErrors.length > 0) throw new TypeError(inventoryErrors.join("; "));
  if (authorization.runnerRegistrationHash !== registration.selfHash
    || authorization.sampleManifestHash !== sampleManifest?.sampleManifestHash
    || authorization.sampleExecutionInventoryHash !== inventory.selfHash) {
    throw new TypeError("request upstream authorization, manifest, or inventory binding is invalid");
  }
  if (typeof attemptId !== "string" || attemptId.length < 1) throw new TypeError("attemptId is required");
  const providerTuple = exactProviderTuple(authorization.provider);
  if (authorization.model !== providerTuple.model || authorization.endpoint !== providerTuple.endpoint
    || authorization.projectResidency !== providerTuple.projectResidency || !Object.hasOwn(providerTuple.roles, role)
    || !authorization.roleSet.includes(role)) throw new TypeError("request provider tuple or role differs from the frozen authorization");
  const projection = deriveProtectedFrozenItemProjectionV4(itemLeaf);
  const itemLeafHash = calculateFrozenNaturalItemLeafHashV4(itemLeaf);
  const envelope = buildSampleBoundProtectedItemEnvelopeV4({ item: itemLeaf, sampleManifest });
  if (envelope.itemHash !== itemLeafHash || projection.homologyClusterId !== envelope.homologyClusterId) throw new TypeError("protected item leaf and sample envelope disagree");
  const item = inventoryItem(inventory, envelope);
  if (item.egressEligible !== true) throw new TypeError("inventory item is not egress eligible");
  const prior = authoritativePriors({
    roles: providerTuple.roles[role],
    entries: ledgerEntries,
    authorization,
    inventory,
    itemHash: item.itemHash,
    itemLeaf,
    clusterId: item.clusterId,
  });
  let providerInput;
  let logicalRequest;
  let wireRequest;
  let logicalRequestHash;
  let adapterTransformHash;
  if (authorization.provider === "OPENAI_DIRECT") {
    providerInput = buildOpenAIProviderInputV5R4({
      role,
      projection,
      itemHash: item.itemHash,
      itemIdPseudonym: item.itemIdPseudonym,
      localArtifacts: prior.localArtifacts,
    });
    logicalRequest = buildOpenAIReferenceLogicalRequestV5({ role, providerInput });
    wireRequest = buildOpenAIReferenceWireRequestV5(logicalRequest);
    const wireErrors = validateOpenAIReferenceWireRequestV5(wireRequest, logicalRequest);
    if (wireErrors.length > 0) throw new TypeError(wireErrors.join("; "));
    logicalRequestHash = logicalRequest.logicalRequestHash;
    adapterTransformHash = OPENAI_REFERENCE_ADAPTER_TRANSFORM_HASH_V5;
    if (forbiddenFieldPaths(providerInput, /deepseek/iu).length > 0) throw new TypeError("OpenAI provider input contains a DeepSeek artifact field");
  } else {
    providerInput = buildDeepSeekProviderInputV5R4({
      role,
      projection,
      itemHash: item.itemHash,
      itemIdPseudonym: item.itemIdPseudonym,
      bPrimeCritiqueArtifact: prior.bPrimeCritiqueArtifact,
    });
    const adapterRequest = buildDeepSeekEvaluationRequestV5R2({ role, providerInput });
    logicalRequest = adapterRequest.logicalRequest;
    wireRequest = adapterRequest.wireRequestBody;
    logicalRequestHash = adapterRequest.logicalRequestHash;
    adapterTransformHash = adapterRequest.adapterTransformHash;
    const leakagePaths = forbiddenFieldPaths(providerInput, /(?:qwen|reference(?:label|seal)|final(?:reference)?label|goldlabel)/iu);
    if (leakagePaths.length > 0 || adapterRequest.referenceInputCount !== 0) throw new TypeError(`DeepSeek reference-label blindness failed: ${leakagePaths.join(", ")}`);
  }
  const contract = roleContract(authorization.provider, role);
  if (!exactFields(providerInput, contract.inputFieldNames)) throw new TypeError("actual provider input fields differ from the frozen role allowlist");
  const wireBytes = Buffer.from(canonicalJsonV5R3(wireRequest), "utf8");
  const reservedInputTokens = wireBytes.byteLength + 2_048;
  const reservedOutputTokens = 8_192;
  const artifact = sealV5R3Artifact({
    schemaVersion: "ProviderRequestArtifactV4",
    designId: "MAIS-NATURAL-CA60-V5",
    runnerRegistrationHash: registration.selfHash,
    authorizationHash: authorization.selfHash,
    sampleManifestHash: sampleManifest.sampleManifestHash,
    sampleExecutionInventoryHash: inventory.selfHash,
    manifestOrdinal: item.manifestOrdinal,
    itemHash: item.itemHash,
    itemIdPseudonym: item.itemIdPseudonym,
    clusterId: item.clusterId,
    provider: providerTuple.provider,
    model: providerTuple.model,
    endpoint: providerTuple.endpoint,
    projectResidency: providerTuple.projectResidency,
    role,
    attemptId,
    itemLeafHash,
    providerInput: structuredClone(providerInput),
    providerInputHash: sha256V5R3(canonicalJsonV5R3(providerInput)),
    providerInputFieldNames: Object.keys(providerInput).sort(),
    rolePromptHash: contract.promptHash,
    roleSchemaHash: contract.schemaHash,
    adapterTransformHash,
    logicalRequest: structuredClone(logicalRequest),
    logicalRequestHash,
    wireRequest: structuredClone(wireRequest),
    wireRequestBodyHash: sha256V5R3(wireBytes),
    wireRequestByteLength: wireBytes.byteLength,
    reservedInputTokens,
    reservedOutputTokens,
    reservedTokens: reservedInputTokens + reservedOutputTokens,
    referenceInputCount: 0,
    deepSeekInputCount: 0,
    priorCompletionHashes: [...prior.priorCompletionHashes],
  });
  assertClosedSelfHashedArtifactV5R4(artifact, "ProviderRequestArtifactV4");
  return artifact;
}

export function validateAndRebuildProviderRequestArtifactV5R4(input) {
  const errors = [...validateClosedSelfHashedArtifactV5R4(input?.requestArtifact, "ProviderRequestArtifactV4")];
  try {
    const rebuilt = buildProviderRequestArtifactV5R4({
      ...input,
      role: input?.requestArtifact?.role,
      attemptId: input?.requestArtifact?.attemptId,
    });
    if (canonicalJsonV5R3(rebuilt) !== canonicalJsonV5R3(input.requestArtifact)) errors.push("provider request artifact differs from exact protected-item reconstruction");
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  return Object.freeze([...new Set(errors)]);
}

export function exactProviderWireBytesV5R4(requestArtifact) {
  assertClosedSelfHashedArtifactV5R4(requestArtifact, "ProviderRequestArtifactV4");
  const bytes = Buffer.from(canonicalJsonV5R3(requestArtifact.wireRequest), "utf8");
  if (bytes.byteLength !== requestArtifact.wireRequestByteLength || sha256V5R3(bytes) !== requestArtifact.wireRequestBodyHash) {
    throw new TypeError("provider request wire bytes do not match their immutable request artifact");
  }
  return bytes;
}

export const PROVIDER_REQUEST_V5_R4_CONSTANTS = Object.freeze({
  openAIPriors: OPENAI_PRIORS,
  deepSeekPriors: DEEPSEEK_PRIORS,
  openAIAdapterTransformHash: OPENAI_REFERENCE_ADAPTER_TRANSFORM_HASH_V5,
  deepSeekAdapterTransformHash: DEEPSEEK_EVALUATION_ADAPTER_V5_R2_CONSTANTS.adapterTransformHash,
  reservedOutputTokens: 8_192,
  inputReservationRule: "UTF8_JCS_WIRE_BYTE_LENGTH_PLUS_2048",
});
