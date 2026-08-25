import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildDesignRegistrationV5,
  buildPredecessorPackageInventoryV4,
  buildStatisticalPowerV5,
  buildV5PackageManifest,
  calculateRegistrationHash,
  canonicalJson,
  jcsHash,
} from "./design-contract.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA_DIRECTORY = path.join(HERE, "schemas");
const ACTIVE_POINTER_PATH = path.resolve(HERE, "../../ACTIVE-DESIGN-REGISTRATION.json");

function same(left, right) {
  return canonicalJson(left) === canonicalJson(right);
}

function addCheck(errors, condition, message) {
  if (!condition) errors.push(message);
}

async function readJson(absolute) {
  return JSON.parse(await readFile(absolute, "utf8"));
}

async function loadSchemas() {
  const filenames = (await readdir(SCHEMA_DIRECTORY)).filter((name) => name.endsWith(".schema.json")).sort();
  return Promise.all(filenames.map(async (filename) => ({
    filename,
    schema: await readJson(path.join(SCHEMA_DIRECTORY, filename)),
  })));
}

export async function loadDefaultArtifacts() {
  return {
    registration: await readJson(path.join(HERE, "design-registration.json")),
    inventory: await readJson(path.join(HERE, "predecessor-package-inventory-v4.json")),
    power: await readJson(path.join(HERE, "statistical-power.json")),
    packageManifest: await readJson(path.join(HERE, "package-manifest.json")),
    schemas: await loadSchemas(),
    activePointer: await readJson(ACTIVE_POINTER_PATH),
    independentReviewReceipt: null,
  };
}

function validateClosedRootSchema(schema, filename, errors) {
  addCheck(errors, schema?.$schema === "https://json-schema.org/draft/2020-12/schema", `${filename}: draft mismatch`);
  addCheck(errors, schema?.$id === `https://mais.local/schemas/${schema?.title}.schema.json`, `${filename}: id mismatch`);
  addCheck(errors, schema?.type === "object" && schema?.additionalProperties === false, `${filename}: root must be a closed object`);
  addCheck(errors, schema?.properties?.schemaVersion?.const === schema?.title, `${filename}: schemaVersion identity mismatch`);
  addCheck(errors, same([...(schema?.required ?? [])].sort(), Object.keys(schema?.properties ?? {}).sort()), `${filename}: root required/property set mismatch`);
  addCheck(errors, filename === `${schema?.title}.schema.json`, `${filename}: filename/title mismatch`);
}

function validateRootArtifactAgainstIdentitySchema(artifact, schema, label, errors) {
  addCheck(errors, artifact?.schemaVersion === schema?.title, `${label}: root schemaVersion mismatch`);
  const required = [...(schema?.required ?? [])].sort();
  const actual = Object.keys(artifact ?? {}).sort();
  addCheck(errors, same(actual, required), `${label}: root field set differs from closed schema`);
  for (const [property, definition] of Object.entries(schema?.properties ?? {})) {
    if (Object.hasOwn(definition, "const")) {
      addCheck(errors, same(artifact?.[property], definition.const), `${label}.${property}: const mismatch`);
    }
    if (definition?.pattern && typeof artifact?.[property] === "string") {
      addCheck(errors, new RegExp(definition.pattern, "u").test(artifact[property]), `${label}.${property}: pattern mismatch`);
    }
  }
}

function validateNoSecretMaterial(value, errors, pathParts = []) {
  if (typeof value === "string") {
    if (/\bsk-[A-Za-z0-9_-]{8,}\b/u.test(value)) errors.push(`${pathParts.join(".")}: secret-like value forbidden`);
    if (/\bBearer\s+[A-Za-z0-9._~-]{8,}/iu.test(value)) errors.push(`${pathParts.join(".")}: authorization header value forbidden`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((child, index) => validateNoSecretMaterial(child, errors, [...pathParts, String(index)]));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (/^(apiKey|authorizationHeader|credentialValue|credentialSecret|secretValue|secretKey)$/iu.test(key)) {
      errors.push(`${[...pathParts, key].join(".")}: secret-bearing field forbidden`);
    }
    validateNoSecretMaterial(child, errors, [...pathParts, key]);
  }
}

function validateProviderSemantics(registration, errors) {
  const controls = registration?.providerControls;
  const openai = controls?.openaiReferenceEnvelope;
  addCheck(errors, registration?.providerEventCount === 0
    && controls?.providerEventCount === 0
    && openai?.providerEventCount === 0, "provider event count must remain zero");
  addCheck(errors, registration?.firstProviderExecutionAllowed === false
    && controls?.firstProviderExecutionAllowed === false
    && registration?.executionLifecycle?.firstProviderExecutionAllowed === false, "pre-execution design must fail closed");
  addCheck(errors, registration?.activationAllowed === false, "sealed candidate must not self-activate");
  addCheck(errors, openai?.provider === "OPENAI_DIRECT"
    && openai?.projectResidency === "US_STORAGE_PROCESSING"
    && openai?.endpoint === "https://us.api.openai.com/v1/responses"
    && openai?.requestedOrigin === "https://us.api.openai.com/v1/responses"
    && openai?.observedOriginRequired === "https://us.api.openai.com/v1/responses"
    && openai?.requestedModel === "gpt-5.6-luna"
    && openai?.observedModelRequired === "gpt-5.6-luna"
    && openai?.apiSurface === "RESPONSES_API_V1", "OpenAI route tuple drift");
  addCheck(errors, openai?.requestTemplate?.reasoning?.context === "current_turn"
    && openai?.wireRequestTemplate?.reasoning?.context === "current_turn"
    && openai?.wireRequestTemplate?.store === false
    && openai?.wireRequestTemplate?.background === false
    && openai?.wireRequestTemplate?.stream === false
    && openai?.wireRequestTemplate?.tools?.length === 0
    && !Object.hasOwn(openai?.wireRequestTemplate ?? {}, "seed")
    && !Object.hasOwn(openai?.wireRequestTemplate ?? {}, "temperature")
    && !Object.hasOwn(openai?.wireRequestTemplate ?? {}, "max_tokens"), "OpenAI logical/wire request contract drift");
  addCheck(errors, openai?.logicalRequestTemplateHash === jcsHash(openai?.requestTemplate)
    && openai?.wireRequestTemplateHash === jcsHash(openai?.wireRequestTemplate), "OpenAI request-template hash mismatch");
  addCheck(errors, openai?.fullAuthorizationAllowed === false
    && openai?.currentAuthorizationHash === null
    && openai?.projectRoutePreflightReceiptHash === null
    && openai?.credentialReadinessReceiptHash === null
    && openai?.priceSnapshotHash === null, "OpenAI live authorization was fabricated or prematurely enabled");
  addCheck(errors, controls?.currentOpenAIReferenceAuthorizationHash === null
    && controls?.currentDeepSeekAuthorizationHash === null
    && Object.values(controls?.authorizationTemplates ?? {}).every((template) => template.isCurrentAuthorization === false && template.grantsProviderExecution === false), "authorization templates must not become current grants");
  addCheck(errors, registration?.ownerProviderDecision?.decisionType === "DESIGN_SELECTION_ONLY_NOT_LIVE_EXECUTION_AUTHORIZATION"
    && registration?.ownerProviderDecision?.egressAuthorizationGranted === false
    && registration?.ownerProviderDecision?.providerExecutionAuthorizationGranted === false, "owner provider selection must remain separate from live authorization");
  addCheck(errors, openai?.officialCapabilityEvidence?.projectEntitlementVerified === false
    && openai?.officialCapabilityEvidence?.modelAvailabilityOnOwnerProjectVerified === false
    && openai?.officialCapabilityEvidence?.priceSnapshotCaptured === false
    && openai?.officialCapabilityEvidence?.authorizationEffect === "NONE", "documentation evidence must not be upgraded to project or authorization evidence");
  addCheck(errors, !Object.hasOwn(controls ?? {}, "qwenEnvelope")
    && !JSON.stringify(controls ?? {}).includes("qwen3.8-max"), "superseded Qwen runtime contract leaked into V5 provider controls");
}

function validateFrozenHashes(registration, errors) {
  addCheck(errors, registration?.registrationHash === calculateRegistrationHash(registration), "registration self-hash mismatch");
  for (const [section, expectedHash] of Object.entries(registration?.frozenContractHashes ?? {})) {
    addCheck(errors, Object.hasOwn(registration, section), `${section}: frozen section missing`);
    if (Object.hasOwn(registration, section)) addCheck(errors, expectedHash === jcsHash(registration[section]), `${section}: frozen section hash mismatch`);
  }
  addCheck(errors, registration?.frozenContractRootHash === jcsHash(Object.entries(registration?.frozenContractHashes ?? {})), "frozen contract root mismatch");
  addCheck(errors, registration?.preExecutionState?.designRegistrationHash === null, "embedded pre-execution state must not create a self-hash cycle");
}

function validatePower(registration, power, errors) {
  const expected = buildStatisticalPowerV5(registration?.registrationHash);
  addCheck(errors, same(power, expected), "statistical-power artifact drift");
  const preimage = { ...(power ?? {}) };
  delete preimage.selfHash;
  addCheck(errors, power?.selfHash === jcsHash(preimage), "statistical-power self-hash mismatch");
  addCheck(errors, power?.perfectPerformanceRequirements?.sensitivityMinimumPositiveItems === 25
    && power?.perfectPerformanceRequirements?.specificityMinimumNegativeItems === 52
    && power?.perfectPerformanceRequirements?.combinedMinimumItems === 77
    && power?.perfectPerformanceRequirements?.simultaneousSurfaceGateFeasibleAtN60 === false
    && power?.decisionCeiling === "INCONCLUSIVE_MACHINE_REFERENCE"
    && power?.thresholdReductionAfterLabelsOrResultsAllowed === false, "structural feasibility or decision ceiling drift");
}

function validateSchemaSet(registration, schemas, inventory, power, packageManifest, errors) {
  for (const { filename, schema } of schemas ?? []) validateClosedRootSchema(schema, filename, errors);
  const catalog = Object.fromEntries((schemas ?? []).map(({ filename, schema }) => [schema.title, {
    filename,
    id: schema.$id,
    canonicalHash: jcsHash(schema),
  }]));
  addCheck(errors, Object.keys(catalog).length === 10, "V5 schema count mismatch");
  addCheck(errors, same(registration?.interfaces?.canonicalSchemaCatalog, catalog), "schema catalog mismatch");
  addCheck(errors, registration?.interfaces?.schemaSetHash === jcsHash(catalog), "schema set hash mismatch");
  const byTitle = Object.fromEntries((schemas ?? []).map(({ schema }) => [schema.title, schema]));
  if (byTitle.NaturalCaPilotDesignRegistrationV5) {
    validateRootArtifactAgainstIdentitySchema(registration, byTitle.NaturalCaPilotDesignRegistrationV5, "design-registration.json", errors);
  }
  if (byTitle.PredecessorPackageInventoryV2) {
    validateRootArtifactAgainstIdentitySchema(inventory, byTitle.PredecessorPackageInventoryV2, "predecessor-package-inventory-v4.json", errors);
  }
  if (byTitle.NaturalCaStatisticalPowerV5) {
    validateRootArtifactAgainstIdentitySchema(power, byTitle.NaturalCaStatisticalPowerV5, "statistical-power.json", errors);
  }
  if (byTitle.V5PackageManifestV1) {
    validateRootArtifactAgainstIdentitySchema(packageManifest, byTitle.V5PackageManifestV1, "package-manifest.json", errors);
  }
}

export async function validateArtifacts(artifacts, { requireActive = false } = {}) {
  const errors = [];
  try {
    const { registration, inventory, power, packageManifest, schemas, activePointer, independentReviewReceipt } = artifacts;
    const expectedInventory = await buildPredecessorPackageInventoryV4();
    const expectedRegistration = await buildDesignRegistrationV5();
    addCheck(errors, same(inventory, expectedInventory), "V4 predecessor exact inventory mismatch");
    addCheck(errors, same(registration, expectedRegistration), "generated V5 registration drift");
    validateFrozenHashes(registration, errors);
    validateProviderSemantics(registration, errors);
    validatePower(registration, power, errors);
    validateSchemaSet(registration, schemas, inventory, power, packageManifest, errors);
    addCheck(errors, same(packageManifest, await buildV5PackageManifest()), "V5 package manifest drift");
    validateNoSecretMaterial({ registration, inventory, power, packageManifest, schemas }, errors);

    const active = activePointer?.activeDesignId === "MAIS-NATURAL-CA60-V5"
      && activePointer?.activeRegistrationHash === registration?.registrationHash;
    if (requireActive) {
      addCheck(errors, active, "active V5 design pointer is required");
      addCheck(errors, independentReviewReceipt?.reviewStatus === "CONCURRED"
        && independentReviewReceipt?.designRegistrationHash === registration?.registrationHash, "A11 independent review receipt is required");
    }
    const executionAuthorized = active
      && registration?.firstProviderExecutionAllowed === true
      && registration?.providerControls?.currentOpenAIReferenceAuthorizationHash !== null
      && registration?.providerControls?.currentDeepSeekAuthorizationHash !== null;

    return {
      ok: errors.length === 0,
      errors,
      designId: registration?.designId ?? null,
      registrationHash: registration?.registrationHash ?? null,
      lifecycleStatus: registration?.lifecycleStatus ?? null,
      active,
      executionAuthorized,
      providerEventCount: registration?.providerEventCount ?? null,
      networkRequestCount: 0,
      credentialReadCount: 0,
      naturalQuestionReadCount: 0,
      schemaCount: schemas?.length ?? 0,
      decisionCeiling: registration?.scope?.decisionCeiling ?? null,
    };
  } catch (error) {
    errors.push(`V5 validation failed closed: ${error.message}`);
    return {
      ok: false,
      errors,
      designId: artifacts?.registration?.designId ?? null,
      registrationHash: artifacts?.registration?.registrationHash ?? null,
      lifecycleStatus: artifacts?.registration?.lifecycleStatus ?? null,
      active: false,
      executionAuthorized: false,
      providerEventCount: artifacts?.registration?.providerEventCount ?? null,
      networkRequestCount: 0,
      credentialReadCount: 0,
      naturalQuestionReadCount: 0,
      schemaCount: artifacts?.schemas?.length ?? 0,
      decisionCeiling: artifacts?.registration?.scope?.decisionCeiling ?? null,
    };
  }
}

async function main() {
  const result = await validateArtifacts(await loadDefaultArtifacts(), {
    requireActive: process.argv.includes("--require-active"),
  });
  if (process.argv.includes("--json")) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  else if (result.ok) {
    process.stdout.write(`VALID_SEALED_CANDIDATE ${result.designId}; active=${result.active}; executionAuthorized=${result.executionAuthorized}; providerEvents=${result.providerEventCount}; schemas=${result.schemaCount}; ceiling=${result.decisionCeiling}\n`);
  } else {
    process.stderr.write(`${result.errors.join("\n")}\n`);
  }
  process.exitCode = result.ok ? 0 : 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
