import { execFile as nodeExecFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import DESIGN from "../../research/mais-natural-ca60-v1/versions/design-v5/design-registration.json" with { type: "json" };
import SEQUENCING from "../../research/mais-natural-ca60-v1/authorization-requests/2026-08-26-provider-authorization-sequencing.json" with { type: "json" };
import OWNER_DECISION from "../../research/mais-natural-ca60-v1/owner-decisions/2026-08-26-frame-rights-lineage/owner-decision-receipt.json" with { type: "json" };
import V5_R3_REGISTRATION from "../../research/mais-natural-ca60-v1/runner-registrations/v5-r3/runner-registration.json" with { type: "json" };
import {
  calculateArtifactHash,
} from "../../research/mais-natural-ca60-v1/versions/design-v2/design-contract.mjs";
import {
  calculateSampleSelectionContentRootV3,
  deriveSamplePseudonymMappingV4,
} from "./sample-contract-v5.mjs";
import {
  canonicalJsonV5R3,
  sealV5R3Artifact,
  sha256V5R3,
  validateSelfHashV5R3,
} from "./execution-integrity-v5-r3.mjs";
import {
  assertClosedSelfHashedArtifactV5R4,
  validateClosedSelfHashedArtifactV5R4,
} from "./schema-contract-v5-r4.mjs";
import { SCORER_METHOD_KERNEL_V5_R4 } from "./method-kernel-v5-r4.mjs";

const execFileAsync = promisify(nodeExecFile);
const HASH = /^[0-9a-f]{64}$/u;
const COMMIT = /^[0-9a-f]{40}$/u;
const FIXED_REGISTRATION_PATH = "coordination/research/mais-natural-ca60-v1/runner-registrations/v5-r4/runner-registration.json";
export const V5_R3_A11_REVIEW_COMMIT = "1bada03e41f140233fd49c2f7ebdbabf77c1dce0";
export const V5_R3_A11_REVIEW_HASH = "2b8307b6547762499795952a2d4251cca033d70c6868586eb41bbc1409859faa";

function codePointCompare(left, right) { return left < right ? -1 : left > right ? 1 : 0; }

function sourceRoot(manifest) {
  return sha256V5R3(canonicalJsonV5R3(manifest));
}

function componentHash(manifest, paths) {
  const expected = [...new Set(paths)].sort(codePointCompare);
  const selected = manifest.filter(({ path: sourcePath }) => expected.includes(sourcePath));
  return selected.length === expected.length ? sha256V5R3(canonicalJsonV5R3(selected)) : null;
}

function validateRegisteredComponents(registration) {
  const errors = [];
  const manifest = registration?.productionSourceManifest ?? [];
  const core = "coordination/content-qa/mais-natural-ca60-v1/";
  const requestConstructionHash = componentHash(manifest, [`${core}provider-request-v5-r4.mjs`]);
  const authorizationGuardHash = componentHash(manifest, [`${core}route-authorization-v5-r4.mjs`, `${core}schema-contract-v5-r4.mjs`]);
  const transportHash = componentHash(manifest, [`${core}guarded-provider-attempt-v5-r4.mjs`]);
  const atomicLedgerHash = componentHash(manifest, [`${core}atomic-execution-ledger-v5-r4.mjs`, `${core}protected-storage-v5-r4.mjs`]);
  const routeEvidenceValidatorHash = componentHash(manifest, [`${core}route-authorization-v5-r4.mjs`]);
  const resumeAndCanaryHash = componentHash(manifest, [`${core}deepseek-execution-control-v5-r4.mjs`, `${core}execution-state-v5-r4.mjs`]);
  const runnerHash = componentHash(manifest, [
    `${core}execution-evidence-v5-r4.mjs`, `${core}reference-label-seal-v5-r4.mjs`, `${core}runner-v5-r4-cli.mjs`,
    `${core}runner-v5-r4-runtime.mjs`, `${core}verification-publication-v5-r4.mjs`,
  ]);
  const scorerHash = componentHash(manifest, [`${core}scorer-v5-r4.mjs`]);
  const common = { requestConstructionHash, authorizationGuardHash, transportHash, atomicLedgerHash,
    routeEvidenceValidatorHash, resumeAndCanaryHash, runnerHash, scorerHash };
  const openAI = registration?.providerImplementations?.openAI ?? {};
  const deepSeek = registration?.providerImplementations?.deepSeek ?? {};
  if (Object.entries(common).some(([field, value]) => value === null || openAI[field] !== value || deepSeek[field] !== value)
    || openAI.adapterHash !== componentHash(manifest, [`${core}openai-reference-adapter-v5.mjs`])
    || deepSeek.adapterHash !== componentHash(manifest, [`${core}deepseek-evaluation-adapter-v5-r2.mjs`])) {
    errors.push("registered provider component hashes do not recompute from the exact production source manifest");
  }
  const method = registration?.methodKernel ?? {};
  if (method.inheritedStatisticalMethodHash !== SCORER_METHOD_KERNEL_V5_R4.inheritedStatisticalMethodHash
    || method.bootstrapGoldenVectorHash !== SCORER_METHOD_KERNEL_V5_R4.bootstrapGoldenVectorHash
    || method.missingDataMethodHash !== SCORER_METHOD_KERNEL_V5_R4.missingDataMethodHash
    || method.c0TriggerEngineHash !== SCORER_METHOD_KERNEL_V5_R4.c0TriggerEngineHash
    || method.providerRequestConstructionHash !== requestConstructionHash
    || method.protectedStorageHash !== componentHash(manifest, [`${core}protected-storage-v5-r4.mjs`])) {
    errors.push("registered method-kernel hashes do not equal the frozen method and exact source components");
  }
  return errors;
}

export function validateRunnerRegistrationV5R4(registration) {
  const errors = [...validateClosedSelfHashedArtifactV5R4(registration, "NaturalCaExecutionRunnerRegistrationV3")];
  if (registration?.supersedesRunnerRegistrationHash !== V5_R3_REGISTRATION.selfHash) errors.push("V5-R4 does not supersede the exact immutable V5-R3 registration");
  if (registration?.discrepancyReviewHash !== V5_R3_A11_REVIEW_HASH || registration?.previousReceiptHash !== V5_R3_A11_REVIEW_HASH
    || registration?.discrepancyReviewCommit !== V5_R3_A11_REVIEW_COMMIT) errors.push("V5-R4 does not bind the frozen V5-R3 A11 discrepancy receipt");
  const frame = registration ?? {};
  if (frame.designRegistrationHash !== DESIGN.registrationHash
    || frame.taxonomyHash !== DESIGN.frozenContractHashes.taxonomy
    || frame.labelingAndAdjudicationHash !== DESIGN.frozenContractHashes.labeling
    || frame.thresholdsDecisionAndPowerHash !== DESIGN.frozenContractHashes.analysis
    || frame.decisionCeiling !== "INCONCLUSIVE_MACHINE_REFERENCE") errors.push("V5 frozen design, taxonomy, labeling, thresholds, or decision ceiling drifted");
  if (frame.ownerDecisionRequestHash !== OWNER_DECISION.ownerDecisionRequestHash
    || frame.ownerDecisionReceiptHash !== OWNER_DECISION.ownerDecisionReceiptHash
    || frame.rightsPolicyHash !== OWNER_DECISION.rightsPolicyHash
    || frame.lineageRuleHash !== OWNER_DECISION.lineageRuleHash) {
    errors.push("V5 owner decision request/receipt, rights policy, or lineage rule binding drifted");
  }
  if (sourceRoot(registration?.productionSourceManifest ?? []) !== registration?.productionSourceRootHash
    || sourceRoot(registration?.testSourceManifest ?? []) !== registration?.testSourceRootHash) errors.push("V5-R4 registered source manifest root is invalid");
  if (registration?.providerContractErratumHash !== V5_R3_REGISTRATION.providerContractErratumHash) errors.push("V5-R4 provider contract erratum binding drifted");
  const openAI = registration?.providerImplementations?.openAI;
  const deepSeek = registration?.providerImplementations?.deepSeek;
  if (openAI?.provider !== "OPENAI_DIRECT" || openAI?.model !== "gpt-5.6-luna"
    || openAI?.endpoint !== "https://us.api.openai.com/v1/responses" || openAI?.projectResidency !== "US_STORAGE_PROCESSING"
    || deepSeek?.provider !== "DEEPSEEK_DIRECT" || deepSeek?.model !== "deepseek-v4-pro"
    || deepSeek?.endpoint !== "https://api.deepseek.com/chat/completions" || deepSeek?.projectResidency !== "UNKNOWN_PENDING_ROUTE_PROBE_EVIDENCE") {
    errors.push("V5-R4 registered provider tuple or residency classification drifted");
  }
  const authority = registration?.authorizationState ?? {};
  const falseFields = ["credentialReadAuthorized", "providerExecutionAuthorized", "naturalQuestionEgressAuthorized", "tokenAuthorizationCreated", "attemptAuthorizationCreated", "usdAuthorizationCreated"];
  const zeroFields = ["credentialReadCount", "providerEventCount", "naturalQuestionEgressCount", "tokenCount", "attemptCount", "usdSpent", "referenceLabelCount", "naturalQuestionResultCount"];
  if (!falseFields.every((field) => authority[field] === false) || !zeroFields.every((field) => authority[field] === 0)
    || openAI?.providerCallsMade !== 0 || deepSeek?.providerCallsMade !== 0) errors.push("V5-R4 registration exceeds its offline zero-authority boundary");
  return Object.freeze([...new Set(errors)]);
}

export function validateProductionRunnerRegistrationV5R4(registration) {
  const errors = [...validateRunnerRegistrationV5R4(registration)];
  const frame = registration ?? {};
  const frozenFrame = SEQUENCING.frameSampleEvidence;
  if (frame.frameRegistrationHash !== frozenFrame.frameRegistrationHash
    || frame.samplingFrameHash !== frozenFrame.samplingFrameHash
    || frame.sampleManifestHash !== frozenFrame.sampleManifestHash
    || frame.samplePayloadSetHash !== frozenFrame.samplePayloadSetHash
    || frame.sampleSelectionContentRootHash !== frozenFrame.sampleSelectionContentRootHash
    || frame.c0RandomAuditHash !== frozenFrame.c0RandomAuditHash
    || frame.privacyScreenHash !== frozenFrame.selectedPrivacyScreenRootHash
    || frame.rightsScreenHash !== frozenFrame.selectedRightsScreenRootHash) {
    errors.push("V5 frozen frame, sample, C0 audit, privacy, or rights-screen root drifted");
  }
  errors.push(...validateRegisteredComponents(registration));
  return Object.freeze([...new Set(errors)]);
}

function roots(items) {
  const ordered = [...items].sort((left, right) => codePointCompare(left.itemHash, right.itemHash));
  return Object.freeze({
    samplePayloadSetHash: sha256V5R3(canonicalJsonV5R3(ordered.map(({ itemHash }) => itemHash))),
    privacyScreenHash: sha256V5R3(canonicalJsonV5R3(ordered.map(({ itemHash, privacyScreenEvidenceHash }) => [itemHash, privacyScreenEvidenceHash]))),
    rightsScreenHash: sha256V5R3(canonicalJsonV5R3(ordered.map(({ itemHash, rightsScreenEvidenceHash }) => [itemHash, rightsScreenEvidenceHash]))),
  });
}

function validateHashArtifact(artifact, hashField, label) {
  if (!artifact || typeof artifact !== "object" || artifact[hashField] !== calculateArtifactHash(artifact, hashField)) throw new TypeError(`${label} self-hash is invalid`);
}

export function buildSampleExecutionInventoryV2({ registration, sampleManifest, c0RandomAudit, screenEvidence }) {
  const registrationErrors = validateRunnerRegistrationV5R4(registration);
  if (registrationErrors.length > 0) throw new TypeError(registrationErrors.join("; "));
  validateHashArtifact(sampleManifest, "sampleManifestHash", "sample manifest");
  validateHashArtifact(c0RandomAudit, "auditHash", "C0 random audit");
  if (sampleManifest.sampleManifestHash !== registration.sampleManifestHash
    || calculateSampleSelectionContentRootV3(sampleManifest) !== registration.sampleSelectionContentRootHash
    || c0RandomAudit.auditHash !== registration.c0RandomAuditHash
    || c0RandomAudit.sampleManifestHash !== sampleManifest.sampleManifestHash
    || c0RandomAudit.sampleSelectionContentRootHash !== sampleManifest.sampleSelectionContentRootHash) {
    throw new TypeError("sample manifest or registered C0 audit does not bind the V5-R4 registration");
  }
  const mapping = deriveSamplePseudonymMappingV4(sampleManifest);
  const selectedRows = sampleManifest.selectedRows;
  if (!Array.isArray(selectedRows) || selectedRows.length !== 60 || mapping.mappings.length !== 60) throw new TypeError("inventory requires the complete frozen 60-row manifest");
  if (!Array.isArray(c0RandomAudit.selectedRows) || c0RandomAudit.selectedRows.length !== 12) throw new TypeError("registered C0 random audit must contain exactly 12 rows");
  const screenByHash = new Map((screenEvidence ?? []).map((entry) => [entry?.itemHash, entry]));
  if (screenByHash.size !== 60) throw new TypeError("inventory requires exactly 60 rights/privacy screen leaves");
  const c0Hashes = new Set(c0RandomAudit.selectedRows.map((row) => row.itemHash));
  const items = selectedRows.map((row, index) => {
    const mapped = mapping.mappings.find((entry) => entry.itemId === row.itemId);
    const screen = screenByHash.get(row.itemHash);
    if (!mapped || mapped.itemHash !== row.itemHash || mapped.clusterId !== row.clusterId || mapped.itemIdPseudonym !== row.itemIdPseudonym) throw new TypeError(`manifest row ${index + 1} pseudonym or cluster mapping is invalid`);
    if (!screen || !HASH.test(screen.privacyScreenEvidenceHash ?? "") || !HASH.test(screen.rightsScreenEvidenceHash ?? "") || screen.egressEligible !== true) throw new TypeError(`manifest row ${index + 1} screen evidence is missing or ineligible`);
    return Object.freeze({
      manifestOrdinal: index + 1,
      itemHash: row.itemHash,
      itemIdPseudonym: row.itemIdPseudonym,
      clusterId: row.clusterId,
      stratum: row.stratum ?? row.assignedClusterStratum,
      primaryAnalysisWeight: row.primaryAnalysisWeight ?? row.analysisWeight,
      secondaryAnalysisWeight: row.secondaryAnalysisWeight,
      inclusionProbability: row.inclusionProbability,
      privacyScreenEvidenceHash: screen.privacyScreenEvidenceHash,
      rightsScreenEvidenceHash: screen.rightsScreenEvidenceHash,
      egressEligible: true,
      registeredRandomAudit: c0Hashes.has(row.itemHash),
    });
  });
  const computed = roots(items);
  if (computed.samplePayloadSetHash !== registration.samplePayloadSetHash
    || computed.privacyScreenHash !== registration.privacyScreenHash
    || computed.rightsScreenHash !== registration.rightsScreenHash) throw new TypeError("inventory payload or screen roots do not equal the frozen registration");
  const inventory = sealV5R3Artifact({
    schemaVersion: "SampleExecutionInventoryV2",
    designId: "MAIS-NATURAL-CA60-V5",
    runnerRegistrationHash: registration.selfHash,
    sampleManifestHash: sampleManifest.sampleManifestHash,
    sampleSelectionContentRootHash: sampleManifest.sampleSelectionContentRootHash,
    samplePayloadSetHash: computed.samplePayloadSetHash,
    privacyScreenHash: computed.privacyScreenHash,
    rightsScreenHash: computed.rightsScreenHash,
    c0RandomAuditHash: c0RandomAudit.auditHash,
    canaryItemHash: items[0].itemHash,
    itemCount: items.length,
    items,
  });
  assertClosedSelfHashedArtifactV5R4(inventory, "SampleExecutionInventoryV2");
  const semanticErrors = validateSampleExecutionInventoryV2({ registration, inventory });
  if (semanticErrors.length > 0) throw new TypeError(semanticErrors.join("; "));
  return inventory;
}

export function validateSampleExecutionInventoryV2({ registration, inventory }) {
  const errors = [...validateRunnerRegistrationV5R4(registration), ...validateClosedSelfHashedArtifactV5R4(inventory, "SampleExecutionInventoryV2")];
  if (inventory?.runnerRegistrationHash !== registration?.selfHash
    || inventory?.sampleManifestHash !== registration?.sampleManifestHash
    || inventory?.sampleSelectionContentRootHash !== registration?.sampleSelectionContentRootHash
    || inventory?.samplePayloadSetHash !== registration?.samplePayloadSetHash
    || inventory?.privacyScreenHash !== registration?.privacyScreenHash
    || inventory?.rightsScreenHash !== registration?.rightsScreenHash
    || inventory?.c0RandomAuditHash !== registration?.c0RandomAuditHash) errors.push("sample execution inventory registration roots are invalid");
  const items = inventory?.items ?? [];
  if (!Array.isArray(items) || items.length !== 60 || inventory?.itemCount !== 60) errors.push("inventory must contain exactly 60 ordered items");
  for (const field of ["itemHash", "itemIdPseudonym", "clusterId", "manifestOrdinal"]) {
    if (new Set(items.map((item) => item[field])).size !== 60) errors.push(`inventory ${field} values are not exactly unique`);
  }
  if (items.some((item, index) => item.manifestOrdinal !== index + 1)) errors.push("inventory order differs from the frozen manifest order");
  if (items[0]?.itemHash !== inventory?.canaryItemHash) errors.push("registered canary is not manifest row one");
  if (items.filter(({ registeredRandomAudit }) => registeredRandomAudit).length !== 12) errors.push("inventory random C0 selection is not exactly 12 items");
  const computed = roots(items);
  if (computed.samplePayloadSetHash !== inventory?.samplePayloadSetHash || computed.privacyScreenHash !== inventory?.privacyScreenHash
    || computed.rightsScreenHash !== inventory?.rightsScreenHash) errors.push("inventory roots do not recompute from ordered row identities and screens");
  return Object.freeze([...new Set(errors)]);
}

async function defaultGitReader(repoRoot, commit, relativePath) {
  const { stdout } = await execFileAsync("git", ["show", `${commit}:${relativePath}`], { cwd: repoRoot, encoding: "buffer", maxBuffer: 64 * 1024 * 1024 });
  return Buffer.from(stdout);
}

async function defaultGitRevParse(repoRoot, revision) {
  const { stdout } = await execFileAsync("git", ["rev-parse", revision], { cwd: repoRoot, encoding: "utf8" });
  return stdout.trim();
}

async function verifyManifestBytes(manifest, commit, repoRoot, gitReader) {
  const recomputed = [];
  for (const row of manifest) {
    const bytes = Buffer.from(await gitReader(repoRoot, commit, row.path));
    recomputed.push({ path: row.path, byteLength: bytes.byteLength, sha256: sha256V5R3(bytes) });
  }
  return canonicalJsonV5R3(recomputed) === canonicalJsonV5R3(manifest);
}

export async function loadExactTrackedRunnerRegistrationV5R4({
  repoRoot,
  gitReader = defaultGitReader,
  gitRevParse = defaultGitRevParse,
  registrationPath = FIXED_REGISTRATION_PATH,
} = {}) {
  if (!path.isAbsolute(repoRoot ?? "")) throw new TypeError("exact registration loader requires an absolute repository root");
  if (registrationPath !== FIXED_REGISTRATION_PATH) throw new TypeError("production registration path is fixed and cannot be caller-selected");
  const workingBytes = await readFile(path.join(repoRoot, registrationPath));
  const registration = JSON.parse(workingBytes.toString("utf8"));
  const errors = validateProductionRunnerRegistrationV5R4(registration);
  if (errors.length > 0) throw new Error(errors.join("; "));
  const registrationCommit = await gitRevParse(repoRoot, "HEAD");
  const sourceCommit = await gitRevParse(repoRoot, "HEAD^");
  if (!COMMIT.test(registrationCommit) || sourceCommit !== registration.runnerSourceCommit) throw new Error("execution checkout is not the exact registration commit whose parent is the bound runner source commit");
  const trackedBytes = await gitReader(repoRoot, registrationCommit, registrationPath);
  if (!Buffer.from(trackedBytes).equals(workingBytes)) throw new Error("working registration bytes differ from the exact Git object");
  if (!await verifyManifestBytes(registration.productionSourceManifest, sourceCommit, repoRoot, gitReader)
    || !await verifyManifestBytes(registration.testSourceManifest, sourceCommit, repoRoot, gitReader)) throw new Error("exact Git-object runner source manifests do not recompute");
  return sealV5R3Artifact({
    schemaVersion: "ExactRunnerRegistrationEvidenceV1",
    registrationCommit,
    registrationPath,
    registrationHash: registration.selfHash,
    runnerSourceCommit: sourceCommit,
    productionSourceRootHash: registration.productionSourceRootHash,
    testSourceRootHash: registration.testSourceRootHash,
    verifiedFromGitObjects: true,
    registration,
  });
}

export function validateExactRunnerRegistrationEvidenceV5R4(evidence) {
  const errors = [];
  if (!validateSelfHashV5R3(evidence) || evidence?.schemaVersion !== "ExactRunnerRegistrationEvidenceV1" || evidence?.verifiedFromGitObjects !== true) errors.push("exact runner registration evidence is invalid");
  // The production loader above has already applied the exact frozen-root and
  // component checks before constructing this evidence. Keeping this structural
  // validator side-effect free permits fixture-only dependency injection without
  // weakening the default loader's production boundary.
  errors.push(...validateRunnerRegistrationV5R4(evidence?.registration));
  if (evidence?.registrationHash !== evidence?.registration?.selfHash || evidence?.runnerSourceCommit !== evidence?.registration?.runnerSourceCommit
    || evidence?.productionSourceRootHash !== evidence?.registration?.productionSourceRootHash || evidence?.testSourceRootHash !== evidence?.registration?.testSourceRootHash
    || evidence?.registrationPath !== FIXED_REGISTRATION_PATH || !COMMIT.test(evidence?.registrationCommit ?? "")) errors.push("exact runner registration evidence bindings are invalid");
  return Object.freeze([...new Set(errors)]);
}

export const V5_R4_REGISTRATION_PATH = FIXED_REGISTRATION_PATH;
