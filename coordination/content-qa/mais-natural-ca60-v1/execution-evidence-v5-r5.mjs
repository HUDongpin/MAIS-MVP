import { execFile as nodeExecFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import V5_R4_REGISTRATION from "../../research/mais-natural-ca60-v1/runner-registrations/v5-r4/runner-registration.json" with { type: "json" };
import {
  canonicalJsonV5R3,
  sealV5R3Artifact,
  sha256V5R3,
  validateSelfHashV5R3,
} from "./execution-integrity-v5-r3.mjs";
import {
  validateClosedSelfHashedArtifactV5R5,
} from "./schema-contract-v5-r5.mjs";
import {
  validateClosedSelfHashedArtifactV5R4,
} from "./schema-contract-v5-r4.mjs";
import {
  calculateArtifactHash,
} from "../../research/mais-natural-ca60-v1/versions/design-v2/design-contract.mjs";
import {
  calculateSampleSelectionContentRootV3,
} from "./sample-contract-v5.mjs";

function add(errors, condition, message) { if (!condition && !errors.includes(message)) errors.push(message); }
const execFileAsync = promisify(nodeExecFile);
const FIXED_ACTIVE_REGISTRATION_PATH = "coordination/research/mais-natural-ca60-v1/runner-registrations/v5-r5/runner-registration.json";
const COMMIT = /^[0-9a-f]{40}$/u;

export const V5_R4_REGISTRATION_HASH = "2dd4b0e17d577f085aee33f9ada3a2de0f7db79b02b32524e9d6a05858a61dc6";
export const V5_R4_REGISTRATION_COMMIT = "6ded6504318c044ddec4b262bb053143a2aec802";
export const V5_R4_SOURCE_COMMIT = "63fc224c0b67d6b26e5713938f33ccda6fe998b1";
export const V5_R4_A11_REVIEW_HASH = "32a59ad2dd12a80cf772acb1be1110683f5b56d718c66681426eef0c739e6abc";
export const V5_R4_A11_REVIEW_COMMIT = "2bfd5ba703ecf1509a3ac47430fe6f06b80077f7";
export const V5_R5_OWNER_RUNNER_IMPLEMENTATION_AUTHORIZATION_TEXT_HASH = "8f9767f1bb087656d57ab7885f621ef449eff61ea89aaead8bd34bf27f30f74f";

function sourceRoot(manifest) { return sha256V5R3(canonicalJsonV5R3(manifest ?? [])); }
function codePointCompare(left, right) { return left < right ? -1 : left > right ? 1 : 0; }
function componentHash(manifest, paths) {
  const expected = [...new Set(paths)].sort(codePointCompare);
  const selected = (manifest ?? []).filter(({ path: sourcePath }) => expected.includes(sourcePath));
  return selected.length === expected.length ? sha256V5R3(canonicalJsonV5R3(selected)) : null;
}

function validateR5RegisteredComponents(activeRegistration) {
  const errors = [];
  const manifest = activeRegistration?.productionSourceManifest ?? [];
  const root = "coordination/content-qa/mais-natural-ca60-v1/";
  const schemaPaths = (activeRegistration?.productionSourceManifest ?? [])
    .map(({ path: sourcePath }) => sourcePath)
    .filter((sourcePath) => sourcePath.startsWith(`${root}schemas/`) && /V\d+\.schema\.json$/u.test(sourcePath));
  const expected = {
    stateBoundDispatchHash: componentHash(manifest, [`${root}state-bound-dispatch-v5-r5.mjs`, `${root}activation-guard-v5-r5.mjs`]),
    authenticatedRouteEvidenceHash: componentHash(manifest, [`${root}route-authorization-v5-r5.mjs`]),
    inventoryReconstructionHash: componentHash(manifest, [`${root}execution-evidence-v5-r5.mjs`]),
    costPreviewHash: componentHash(manifest, [`${root}route-authorization-v5-r5.mjs`]),
    executionIntegrityHash: componentHash(manifest, [`${root}scorer-v5-r5.mjs`]),
    recoveryHash: componentHash(manifest, [`${root}recovery-v5-r5.mjs`]),
    workflowIndexHash: componentHash(manifest, [`${root}workflow-index-v5-r5.mjs`]),
    schemaValidatorHash: componentHash(manifest, [`${root}schema-contract-v5-r5.mjs`, ...schemaPaths]),
    referenceAgreementHash: componentHash(manifest, [`${root}reference-agreement-v5-r5.mjs`, `${root}reference-label-seal-v5-r5.mjs`]),
    c0TriggerHash: componentHash(manifest, [`${root}c0-trigger-v5-r5.mjs`]),
    guardedTransportHash: componentHash(manifest, [`${root}guarded-provider-attempt-v5-r5.mjs`]),
    atomicLedgerHash: componentHash(manifest, [`${root}atomic-execution-ledger-v5-r5.mjs`, `${root}recovery-v5-r5.mjs`]),
    nativeScoringAndVerificationHash: componentHash(manifest, [`${root}scorer-v5-r5.mjs`, `${root}verification-publication-v5-r5.mjs`]),
    runtimeCliHash: componentHash(manifest, [`${root}runner-v5-r5-runtime.mjs`, `${root}runner-v5-r5-cli.mjs`]),
  };
  add(errors, Object.entries(expected).every(([field, value]) => value !== null && activeRegistration?.closureKernels?.[field] === value),
    "active registration closure-kernel hashes do not recompute from the exact production manifest");
  const coreGuardHash = componentHash(manifest, [
    `${root}activation-guard-v5-r5.mjs`, `${root}state-bound-dispatch-v5-r5.mjs`, `${root}guarded-provider-attempt-v5-r5.mjs`,
  ]);
  for (const [name, expectedProvider, expectedModel, expectedEndpoint, expectedResidency] of [
    ["openAI", "OPENAI_DIRECT", "gpt-5.6-luna", "https://us.api.openai.com/v1/responses", "US_STORAGE_PROCESSING"],
    ["deepSeek", "DEEPSEEK_DIRECT", "deepseek-v4-pro", "https://api.deepseek.com/chat/completions", "UNRESOLVED"],
  ]) {
    const entry = activeRegistration?.providerEntrypoints?.[name];
    add(errors, entry?.provider === expectedProvider && entry?.model === expectedModel && entry?.endpoint === expectedEndpoint
      && entry?.projectResidency === expectedResidency
      && entry?.registeredCli === "runner-v5-r5-cli.mjs" && entry?.coreGuardHash === coreGuardHash
      && entry?.providerCallsMade === 0, `active registration ${name} entrypoint binding is invalid`);
  }
  return errors;
}

export function validateActiveRunnerRegistrationV5R5({ activeRegistration, baseRegistration }) {
  const errors = [...validateClosedSelfHashedArtifactV5R5(activeRegistration, "NaturalCaExecutionRunnerSupersedingRegistrationV1")];
  add(errors, validateSelfHashV5R3(activeRegistration), "active V5-R5 registration self-hash is invalid");
  add(errors, activeRegistration?.schemaVersion === "NaturalCaExecutionRunnerSupersedingRegistrationV1"
    && activeRegistration?.runnerVersion === "V5-R5" && activeRegistration?.designId === "MAIS-NATURAL-CA60-V5",
  "active registration schema, runner version, or design identity is invalid");
  add(errors, validateSelfHashV5R3(baseRegistration) && baseRegistration?.selfHash === V5_R4_REGISTRATION_HASH,
    "active registration compatibility base is not the immutable V5-R4 registration");
  add(errors, activeRegistration?.supersedesRunnerRegistrationHash === V5_R4_REGISTRATION_HASH
    && activeRegistration?.supersededRunnerRegistrationCommit === V5_R4_REGISTRATION_COMMIT
    && activeRegistration?.compatibilityBaseSourceCommit === V5_R4_SOURCE_COMMIT,
  "active registration does not supersede the exact V5-R4 registration/source commit");
  add(errors, activeRegistration?.discrepancyReviewHash === V5_R4_A11_REVIEW_HASH
    && activeRegistration?.discrepancyReviewCommit === V5_R4_A11_REVIEW_COMMIT
    && activeRegistration?.previousReceiptHash === V5_R4_A11_REVIEW_HASH,
  "active registration does not bind the immutable V5-R4 A11 discrepancy receipt");
  add(errors, activeRegistration?.ownerRunnerImplementationAuthorizationTextHash
    === V5_R5_OWNER_RUNNER_IMPLEMENTATION_AUTHORIZATION_TEXT_HASH,
  "active registration does not bind the exact owner offline-runner implementation authorization text hash");
  const frozenFields = ["designRegistrationHash", "frameRegistrationHash", "samplingFrameHash", "sampleManifestHash",
    "samplePayloadSetHash", "sampleSelectionContentRootHash", "c0RandomAuditHash", "privacyScreenHash", "rightsScreenHash",
    "ownerDecisionRequestHash", "ownerDecisionReceiptHash", "rightsPolicyHash", "lineageRuleHash", "taxonomyHash",
    "labelingAndAdjudicationHash", "thresholdsDecisionAndPowerHash", "decisionCeiling", "providerContractErratumHash"];
  add(errors, frozenFields.every((field) => activeRegistration?.[field] === baseRegistration?.[field]),
    "active registration changed a frozen frame/sample/screen/method/decision binding");
  add(errors, activeRegistration?.decisionCeiling === "INCONCLUSIVE_MACHINE_REFERENCE", "active registration decision ceiling drifted");
  add(errors, sourceRoot(activeRegistration?.productionSourceManifest) === activeRegistration?.productionSourceRootHash
    && sourceRoot(activeRegistration?.testSourceManifest) === activeRegistration?.testSourceRootHash,
  "active registration exact source manifest roots are invalid");
  const allPaths = [...(activeRegistration?.productionSourceManifest ?? []), ...(activeRegistration?.testSourceManifest ?? [])].map(({ path: sourcePath }) => sourcePath);
  add(errors, new Set(allPaths).size === allPaths.length && allPaths.every((sourcePath) => typeof sourcePath === "string"
    && !path.isAbsolute(sourcePath) && !path.normalize(sourcePath).split(path.sep).includes("..")),
  "active registration source manifests contain duplicate or unsafe paths");
  add(errors, activeRegistration?.compatibilityBaseProductionSourceRootHash === baseRegistration?.productionSourceRootHash
    && activeRegistration?.compatibilityBaseTestSourceRootHash === baseRegistration?.testSourceRootHash,
  "active registration compatibility source roots differ from V5-R4");
  errors.push(...validateR5RegisteredComponents(activeRegistration));
  add(errors, /^[0-9a-f]{40}$/u.test(activeRegistration?.runnerSourceCommit ?? ""), "active registration runner source commit is invalid");
  const authority = activeRegistration?.authorizationState ?? {};
  const falseFields = ["credentialReadAuthorized", "providerExecutionAuthorized", "naturalQuestionEgressAuthorized", "tokenAuthorizationCreated", "attemptAuthorizationCreated", "usdAuthorizationCreated"];
  const zeroFields = ["credentialReadCount", "providerEventCount", "naturalQuestionEgressCount", "tokenCount", "attemptCount", "usdSpent", "referenceLabelCount", "naturalQuestionResultCount"];
  add(errors, falseFields.every((field) => authority[field] === false) && zeroFields.every((field) => authority[field] === 0),
    "active registration exceeds the pre-first-provider zero-authority boundary");
  add(errors, activeRegistration?.status === "OFFLINE_IMPLEMENTED_PENDING_FRESH_A11_V5_R5_REVIEW_PROVIDER_EXECUTION_BLOCKED"
    && activeRegistration?.claimCeiling === "FRAME_AND_SAMPLE_FROZEN_RUNNER_OFFLINE_IMPLEMENTED_NOT_EXECUTED",
  "active registration status or claim ceiling is invalid");
  return Object.freeze([...new Set(errors)]);
}

export function validateFreshRunnerReviewV5R5({ activeRegistration, freshReview }) {
  const errors = [...validateClosedSelfHashedArtifactV5R5(freshReview, "IndependentExecutionRunnerReviewReceiptV3")];
  add(errors, validateSelfHashV5R3(freshReview), "fresh V5-R5 A11 review self-hash is invalid");
  add(errors, freshReview?.schemaVersion === "IndependentExecutionRunnerReviewReceiptV3"
    && freshReview?.designId === "MAIS-NATURAL-CA60-V5" && freshReview?.runnerVersion === "V5-R5"
    && freshReview?.reviewerLane === "A11" && freshReview?.independentImplementation === true,
  "fresh V5-R5 A11 review identity or independence is invalid");
  add(errors, freshReview?.decision === "CONCURRED" && freshReview?.findingCount === 0,
    "fresh V5-R5 A11 review must be CONCURRED with zero findings");
  add(errors, freshReview?.reviewedRunnerRegistrationHash === activeRegistration?.selfHash
    && freshReview?.reviewedRunnerSourceCommit === activeRegistration?.runnerSourceCommit
    && freshReview?.reviewedProductionSourceRootHash === activeRegistration?.productionSourceRootHash
    && freshReview?.reviewedTestSourceRootHash === activeRegistration?.testSourceRootHash,
  "fresh V5-R5 review does not bind the exact active registration and source roots");
  add(errors, Number.isFinite(Date.parse(freshReview?.reviewedAt)) && Number.isFinite(Date.parse(activeRegistration?.registeredAt))
    && Date.parse(freshReview.reviewedAt) > Date.parse(activeRegistration.registeredAt),
  "fresh V5-R5 review must strictly postdate the active registration");
  return Object.freeze([...new Set(errors)]);
}

async function defaultGitReader(repoRoot, commit, relativePath) {
  const { stdout } = await execFileAsync("git", ["show", `${commit}:${relativePath}`], { cwd: repoRoot, encoding: "buffer", maxBuffer: 64 * 1024 * 1024 });
  return Buffer.from(stdout);
}

async function defaultRegistrationCommitResolver(repoRoot, relativePath) {
  const { stdout } = await execFileAsync("git", ["log", "-n", "1", "--format=%H", "--", relativePath], { cwd: repoRoot, encoding: "utf8" });
  return stdout.trim();
}

async function defaultParentResolver(repoRoot, commit) {
  const { stdout } = await execFileAsync("git", ["rev-parse", `${commit}^`], { cwd: repoRoot, encoding: "utf8" });
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

export async function loadExactTrackedRunnerRegistrationV5R5({
  repoRoot,
  gitReader = defaultGitReader,
  registrationCommitResolver = defaultRegistrationCommitResolver,
  parentResolver = defaultParentResolver,
  registrationPath = FIXED_ACTIVE_REGISTRATION_PATH,
} = {}) {
  if (!path.isAbsolute(repoRoot ?? "")) throw new TypeError("exact R5 registration loader requires an absolute repository root");
  if (registrationPath !== FIXED_ACTIVE_REGISTRATION_PATH) throw new TypeError("R5 production registration path is fixed and cannot be caller-selected");
  const workingBytes = await readFile(path.join(repoRoot, registrationPath));
  const activeRegistration = JSON.parse(workingBytes.toString("utf8"));
  const errors = validateActiveRunnerRegistrationV5R5({ activeRegistration, baseRegistration: V5_R4_REGISTRATION });
  if (errors.length > 0) throw new Error(errors.join("; "));
  const registrationCommit = await registrationCommitResolver(repoRoot, registrationPath);
  const sourceCommit = COMMIT.test(registrationCommit) ? await parentResolver(repoRoot, registrationCommit) : null;
  if (!COMMIT.test(registrationCommit) || sourceCommit !== activeRegistration.runnerSourceCommit) {
    throw new Error("R5 registration commit or its exact runner-source parent is invalid");
  }
  const trackedBytes = await gitReader(repoRoot, registrationCommit, registrationPath);
  if (!Buffer.from(trackedBytes).equals(workingBytes)) throw new Error("working R5 registration bytes differ from the exact Git object");
  if (!await verifyManifestBytes(activeRegistration.productionSourceManifest, sourceCommit, repoRoot, gitReader)
    || !await verifyManifestBytes(activeRegistration.testSourceManifest, sourceCommit, repoRoot, gitReader)) {
    throw new Error("R5 exact Git-object source manifests do not recompute");
  }
  const evidence = sealV5R3Artifact({
    schemaVersion: "ExactRunnerSupersedingRegistrationEvidenceV1",
    registrationCommit,
    registrationPath,
    registrationHash: activeRegistration.selfHash,
    runnerSourceCommit: sourceCommit,
    productionSourceRootHash: activeRegistration.productionSourceRootHash,
    testSourceRootHash: activeRegistration.testSourceRootHash,
    compatibilityBaseRunnerRegistrationHash: V5_R4_REGISTRATION_HASH,
    discrepancyReviewHash: V5_R4_A11_REVIEW_HASH,
    verifiedFromGitObjects: true,
    activeRegistration,
  });
  const evidenceErrors = validateClosedSelfHashedArtifactV5R5(evidence, "ExactRunnerSupersedingRegistrationEvidenceV1");
  if (evidenceErrors.length > 0) throw new Error(`exact R5 registration evidence schema failed: ${evidenceErrors.join("; ")}`);
  return evidence;
}

export function validateExactRunnerRegistrationEvidenceV5R5(evidence) {
  const errors = [...validateClosedSelfHashedArtifactV5R5(evidence, "ExactRunnerSupersedingRegistrationEvidenceV1")];
  add(errors, validateSelfHashV5R3(evidence) && evidence?.schemaVersion === "ExactRunnerSupersedingRegistrationEvidenceV1"
    && evidence?.verifiedFromGitObjects === true, "exact R5 registration evidence is invalid");
  errors.push(...validateActiveRunnerRegistrationV5R5({ activeRegistration: evidence?.activeRegistration, baseRegistration: V5_R4_REGISTRATION }));
  add(errors, evidence?.registrationPath === FIXED_ACTIVE_REGISTRATION_PATH && COMMIT.test(evidence?.registrationCommit ?? "")
    && evidence?.registrationHash === evidence?.activeRegistration?.selfHash
    && evidence?.runnerSourceCommit === evidence?.activeRegistration?.runnerSourceCommit
    && evidence?.productionSourceRootHash === evidence?.activeRegistration?.productionSourceRootHash
    && evidence?.testSourceRootHash === evidence?.activeRegistration?.testSourceRootHash
    && evidence?.compatibilityBaseRunnerRegistrationHash === V5_R4_REGISTRATION_HASH
    && evidence?.discrepancyReviewHash === V5_R4_A11_REVIEW_HASH,
  "exact R5 registration evidence bindings are invalid");
  return Object.freeze([...new Set(errors)]);
}

function expectedInventoryRows({ sampleManifest, c0RandomAudit, screenEvidence }) {
  if (!Array.isArray(sampleManifest?.selectedRows) || sampleManifest.selectedRows.length !== 60) throw new TypeError("sample manifest must contain exactly 60 ordered rows");
  if (!Array.isArray(c0RandomAudit?.selectedRows) || c0RandomAudit.selectedRows.length !== 12) throw new TypeError("registered random C0 audit must contain exactly 12 rows");
  const randomHashes = new Set(c0RandomAudit.selectedRows.map(({ itemHash }) => itemHash));
  if (randomHashes.size !== 12) throw new TypeError("registered random C0 audit item hashes are not unique");
  const screenByHash = new Map((screenEvidence ?? []).map((entry) => [entry?.itemHash, entry]));
  if (screenByHash.size !== 60) throw new TypeError("rights/privacy screen evidence must contain exactly 60 unique item leaves");
  return sampleManifest.selectedRows.map((row, index) => {
    const screen = screenByHash.get(row.itemHash);
    if (!screen || screen.egressEligible !== true) throw new TypeError(`manifest row ${index + 1} has no eligible rights/privacy screen`);
    return {
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
      registeredRandomAudit: randomHashes.has(row.itemHash),
    };
  });
}

export function validateManifestBoundInventoryV5R5({ registration, inventory, sampleManifest, c0RandomAudit, screenEvidence }) {
  const errors = [
    ...validateClosedSelfHashedArtifactV5R4(registration, "NaturalCaExecutionRunnerRegistrationV3"),
    ...validateClosedSelfHashedArtifactV5R4(inventory, "SampleExecutionInventoryV2"),
  ];
  try {
    add(errors, c0RandomAudit?.auditHash === calculateArtifactHash(c0RandomAudit, "auditHash"),
      "registered random audit artifact hash is invalid");
    add(errors, inventory?.runnerRegistrationHash === registration?.selfHash, "inventory runner-registration binding is invalid");
    add(errors, sampleManifest?.sampleManifestHash === registration?.sampleManifestHash
      && inventory?.sampleManifestHash === sampleManifest?.sampleManifestHash, "inventory sample-manifest binding is invalid");
    add(errors, c0RandomAudit?.auditHash === registration?.c0RandomAuditHash
      && inventory?.c0RandomAuditHash === c0RandomAudit?.auditHash, "inventory random audit binding is invalid");
    const sampleContentRoot = calculateSampleSelectionContentRootV3(sampleManifest);
    add(errors, sampleContentRoot === registration?.sampleSelectionContentRootHash
      && inventory?.sampleSelectionContentRootHash === sampleContentRoot,
    "inventory sample-selection content root differs from the exact manifest");
    add(errors, c0RandomAudit?.sampleManifestHash === sampleManifest?.sampleManifestHash
      && c0RandomAudit?.sampleSelectionContentRootHash === sampleContentRoot,
    "random audit does not bind the exact sample manifest and content root");
    const expected = expectedInventoryRows({ sampleManifest, c0RandomAudit, screenEvidence });
    add(errors, canonicalJsonV5R3(expected) === canonicalJsonV5R3(inventory?.items),
      "inventory differs from exact reconstruction of ordered manifest, random audit, and screen leaves");
    add(errors, inventory?.itemCount === 60 && inventory?.canaryItemHash === expected[0]?.itemHash,
      "inventory count or manifest-row-one canary differs from exact reconstruction");
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  return Object.freeze([...new Set(errors)]);
}

export function assertManifestBoundInventoryV5R5(input) {
  const errors = validateManifestBoundInventoryV5R5(input);
  if (errors.length > 0) throw new TypeError(errors.join("; "));
  return input.inventory;
}
