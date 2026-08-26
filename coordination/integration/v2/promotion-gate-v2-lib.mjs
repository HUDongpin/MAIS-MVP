import { execFile as execFileCallback } from "node:child_process";
import { constants as fsConstants } from "node:fs";
import {
  access,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  writeFile
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import {
  PromotionGateError,
  assertSafeRepoRelativePath,
  assertSnapshotsEqual,
  auditCanonicalLegacyConflictUnion,
  classifyRuntimeSurfacePath,
  fingerprint,
  inspectLegacyCandidateDocument,
  observeCanonicalRuntimePolicy,
  parseCanonicalJsonBytes,
  readAuthoritativeFile,
  sha256,
  snapshotRepoPaths,
  stableJson
} from "../promotion-gate-lib.mjs";

const execFile = promisify(execFileCallback);

export const PROMOTION_V2_CHECKER_VERSION = "promotion-gate-shadow-v2.6";
export const PROMOTION_V2_MANIFEST_SCHEMA = "promotion-manifest.v2";
export const PROMOTION_V2_RECEIPT_SCHEMA = "promotion-receipt.v2";
export const PROMOTION_V2_EVIDENCE_SCHEMA = "promotion-evidence.v2";
export const PROMOTION_V2_EVIDENCE_INDEX_SCHEMA = "promotion-evidence-index.v2";
export const PROMOTION_V2_LEGACY_REGISTRY_SCHEMA = "promotion-legacy-resolution-registry.v2";
export const PROMOTION_V2_CHECKER_LEDGER_SCHEMA = "promotion-checker-releases.v2";

export const PROMOTION_V2_CANDIDATE = Object.freeze({
  packageId: "us-ca-math-rag-v2-g6-ratios-v2-candidate",
  parentPackageId: "us-ca-math-rag-v2-candidate",
  candidateVersion: "2.0.0-shadow.1",
  promotionUnitId: "us-ca-math-rag-v2-g6-ratios-v2",
  packagePath:
    "coordination/content-qa/us-ca-math-rag-v2-g6-ratios-v2-candidate/candidate-package.v2.json",
  artifacts: [
    {
      kind: "safe-card",
      id: "ca-rag-v2-cluster-grade-6-6-rp-ratios-v2",
      path: "coordination/content-qa/us-ca-math-rag-v2-g6-ratios-v2-candidate/safe-card.v2.json"
    },
    {
      kind: "practice",
      id: "s04-ca-rag-v2-q031-6-rp-ratios-v2",
      path: "coordination/content-qa/us-ca-math-rag-v2-g6-ratios-v2-candidate/practice-item.v2.json"
    },
    {
      kind: "lesson",
      id: "s05-ca-rag-v2-lesson-031-6-rp-ratios-v2",
      path: "coordination/content-qa/us-ca-math-rag-v2-g6-ratios-v2-candidate/lesson.v2.json"
    }
  ]
});

export const PROMOTION_V2_REQUIRED_OWNER_ROLES = Object.freeze([
  "A21",
  "A18",
  "A23",
  "A04",
  "A05",
  "A11",
  "A22",
  "A24",
  "A25"
]);

export const PROMOTION_V2_REQUIRED_CHECK_IDS = Object.freeze([
  "candidate-binding-v2",
  "git-baseline-v2",
  "owner-evidence-v2",
  "content-qa-v2",
  "shadow-adapter-v2",
  "live-unreachable-v2",
  "legacy-drift-ratchet-v2",
  "source-immutability-v2",
  "output-isolation-v2",
  "rollback-rehearsal-v2",
  "external-side-effects-v2",
  "state-transition-v2",
  "semantic-stability-v2"
]);

export const PROMOTION_V2_CHECKER_BUNDLE_PATHS = Object.freeze([
  "coordination/integration/promotion-gate-lib.mjs",
  "coordination/integration/v2/promotion-gate-v2-lib.mjs",
  "coordination/integration/v2/promotion-gate-v2.mjs",
  "coordination/integration/v2/promotion-gate-v2.test.mjs",
  "coordination/integration/v2/schemas/promotion-manifest.v2.schema.json",
  "coordination/integration/v2/schemas/promotion-receipt.v2.schema.json",
  "coordination/integration/v2/schemas/promotion-evidence.v2.schema.json",
  "coordination/integration/v2/schemas/promotion-legacy-resolution-registry.v2.schema.json"
]);

export const PROMOTION_V2_LIVE_ROOTS = Object.freeze([
  "app",
  "components",
  "data",
  "lib",
  "public"
]);

export const PROMOTION_V2_LIVE_SPECIAL_PATHS = Object.freeze([
  "middleware.ts",
  "next.config.ts",
  "tsconfig.json"
]);

const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const COMMIT_PATTERN = /^[a-f0-9]{40}$/u;
const RUN_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u;

function codePointCompare(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assertExactKeys(value, expected, label) {
  if (!isPlainObject(value)) {
    throw new PromotionGateError("V2_SCHEMA_INVALID", `${label} must be an object.`);
  }
  const actualKeys = Object.keys(value).sort(codePointCompare);
  const expectedKeys = [...expected].sort(codePointCompare);
  if (stableJson(actualKeys) !== stableJson(expectedKeys)) {
    throw new PromotionGateError(
      "V2_SCHEMA_INVALID",
      `${label} has missing or unknown fields.`,
      { expectedKeys, actualKeys }
    );
  }
}

function assertNonEmptyString(value, label) {
  if (typeof value !== "string" || value.trim() === "" || value !== value.trim()) {
    throw new PromotionGateError("V2_SCHEMA_INVALID", `${label} must be a non-empty canonical string.`);
  }
}

function assertSha256(value, label) {
  if (typeof value !== "string" || !SHA256_PATTERN.test(value)) {
    throw new PromotionGateError("V2_SCHEMA_INVALID", `${label} must be a lowercase SHA-256 digest.`);
  }
}

function assertCommit(value, label) {
  if (typeof value !== "string" || !COMMIT_PATTERN.test(value)) {
    throw new PromotionGateError("V2_SCHEMA_INVALID", `${label} must be a lowercase 40-character commit SHA.`);
  }
}

function assertUniqueCanonicalStrings(values, label) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new PromotionGateError("V2_SCHEMA_INVALID", `${label} must be a non-empty array.`);
  }
  const exact = new Set();
  const folded = new Set();
  for (const [index, value] of values.entries()) {
    assertNonEmptyString(value, `${label}[${index}]`);
    const lower = value.toLocaleLowerCase("en-US");
    if (exact.has(value) || folded.has(lower)) {
      throw new PromotionGateError("V2_SCHEMA_INVALID", `${label} contains a duplicate or case collision.`);
    }
    exact.add(value);
    folded.add(lower);
  }
}

function assertCanonicalPathList(values, label, { allowEmpty = false } = {}) {
  if (!Array.isArray(values) || (!allowEmpty && values.length === 0)) {
    throw new PromotionGateError("V2_SCHEMA_INVALID", `${label} must be an array of repository-relative paths.`);
  }
  const exact = new Set();
  const folded = new Set();
  for (const [index, value] of values.entries()) {
    assertSafeRepoRelativePath(value);
    const lower = value.toLocaleLowerCase("en-US");
    if (exact.has(value) || folded.has(lower)) {
      throw new PromotionGateError("V2_PATH_COLLISION", `${label} contains a duplicate or case-colliding path.`);
    }
    exact.add(value);
    folded.add(lower);
    if (value !== values[index]) {
      throw new PromotionGateError("V2_SCHEMA_INVALID", `${label} contains a non-canonical path.`);
    }
  }
}

function assertJsonRoundTrip(value, label) {
  let roundTripped;
  try {
    roundTripped = JSON.parse(JSON.stringify(value));
  } catch {
    throw new PromotionGateError("V2_SCHEMA_INVALID", `${label} must be JSON serializable.`);
  }
  if (stableJson(roundTripped) !== stableJson(value)) {
    throw new PromotionGateError("V2_SCHEMA_INVALID", `${label} must contain only JSON-safe values.`);
  }
}

function ensureNoForbiddenKeys(value, label = "manifest", pathParts = []) {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => ensureNoForbiddenKeys(entry, label, [...pathParts, String(index)]));
    return;
  }
  if (!isPlainObject(value)) return;
  for (const [key, entry] of Object.entries(value)) {
    if (/^(?:command|cmd|shell|script|argv|provider|deployment|databaseWrite)$/iu.test(key)) {
      throw new PromotionGateError(
        "V2_FORBIDDEN_CAPABILITY",
        `${label} may not embed commands or external side-effect capabilities.`,
        { fieldPath: [...pathParts, key].join("/") }
      );
    }
    ensureNoForbiddenKeys(entry, label, [...pathParts, key]);
  }
}

async function readCanonicalJson(repoRoot, relativePath, invalidCode, label) {
  const loaded = await readAuthoritativeFile(repoRoot, relativePath);
  const value = parseCanonicalJsonBytes(loaded.bytes, invalidCode, label);
  return { ...loaded, value };
}

async function runGit(repoRoot, args, { encoding = "utf8", maxBuffer = 32 * 1024 * 1024 } = {}) {
  if (!Array.isArray(args) || args.some((arg) => typeof arg !== "string" || arg.includes("\0"))) {
    throw new PromotionGateError("V2_GIT_PROBE_INVALID", "Git probe arguments are invalid.", {}, "blocked");
  }
  const environment = {
    PATH: process.env.PATH ?? "/usr/bin:/bin",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_OPTIONAL_LOCKS: "0",
    GIT_TERMINAL_PROMPT: "0",
    GIT_PAGER: "cat",
    LC_ALL: "C"
  };
  try {
    return await execFile("git", ["-c", "core.hooksPath=/dev/null", ...args], {
      cwd: repoRoot,
      env: environment,
      encoding,
      maxBuffer,
      windowsHide: true
    });
  } catch (error) {
    throw new PromotionGateError(
      "V2_GIT_PROBE_FAILED",
      "A registered read-only Git probe failed.",
      { gitSubcommand: args[0] ?? null, exitCode: error?.code ?? null },
      "blocked"
    );
  }
}

async function gitBlob(repoRoot, commit, relativePath) {
  assertCommit(commit, "commit");
  assertSafeRepoRelativePath(relativePath);
  const { stdout } = await runGit(repoRoot, ["show", "--no-textconv", `${commit}:${relativePath}`], {
    encoding: null
  });
  return Buffer.from(stdout);
}

async function assertAncestor(repoRoot, ancestor, descendant, label) {
  assertCommit(ancestor, `${label} ancestor`);
  assertCommit(descendant, `${label} descendant`);
  try {
    await runGit(repoRoot, ["merge-base", "--is-ancestor", ancestor, descendant]);
  } catch (error) {
    if (error instanceof PromotionGateError) {
      throw new PromotionGateError(
        "V2_GIT_ANCESTRY_INVALID",
        `${label} is not in the execution commit ancestry.`,
        { ancestor, descendant },
        "blocked"
      );
    }
    throw error;
  }
}

export async function collectV2GitWorktreeProof(repoRoot) {
  const canonicalRoot = await realpath(repoRoot);
  const [{ stdout: headStdout }, { stdout: statusStdout }, { stdout: topStdout }] = await Promise.all([
    runGit(canonicalRoot, ["rev-parse", "HEAD"]),
    runGit(canonicalRoot, ["status", "--porcelain=v1", "--untracked-files=all"]),
    runGit(canonicalRoot, ["rev-parse", "--show-toplevel"])
  ]);
  const headCommit = headStdout.trim();
  const topLevel = await realpath(topStdout.trim());
  assertCommit(headCommit, "worktree HEAD");
  if (topLevel !== canonicalRoot) {
    throw new PromotionGateError(
      "V2_WORKTREE_ROOT_MISMATCH",
      "Promotion Gate must run from the exact clean worktree root.",
      {},
      "blocked"
    );
  }
  const status = statusStdout.trimEnd();
  return {
    schemaVersion: "promotion-git-worktree-proof.v2",
    headCommit,
    clean: status === "",
    statusDigest: fingerprint(status === "" ? [] : status.split("\n"))
  };
}

export function computeV2EvidenceSemanticDigest(evidence) {
  return fingerprint({
    role: evidence.role,
    result: evidence.result,
    candidateDigest: evidence.candidateDigest,
    sourceCommit: evidence.sourceCommit,
    targetBaselineCommit: evidence.targetBaselineCommit,
    checkerVersion: evidence.checkerVersion,
    semanticPayload: evidence.semanticPayload
  });
}

export function validateV2Evidence(evidence) {
  assertExactKeys(
    evidence,
    [
      "schemaVersion",
      "evidenceId",
      "role",
      "result",
      "producedAt",
      "candidateDigest",
      "sourceCommit",
      "targetBaselineCommit",
      "checkerVersion",
      "semanticPayload"
    ],
    "v2 evidence"
  );
  if (evidence.schemaVersion !== PROMOTION_V2_EVIDENCE_SCHEMA) {
    throw new PromotionGateError("V2_EVIDENCE_SCHEMA_UNSUPPORTED", "Unsupported v2 evidence schema.");
  }
  assertNonEmptyString(evidence.evidenceId, "evidenceId");
  if (!PROMOTION_V2_REQUIRED_OWNER_ROLES.includes(evidence.role)) {
    throw new PromotionGateError("V2_EVIDENCE_OWNER_UNKNOWN", "Evidence has an unknown owner role.");
  }
  if (!new Set(["pass", "not_applicable"]).has(evidence.result)) {
    throw new PromotionGateError("V2_EVIDENCE_RESULT_INVALID", "Evidence result must be pass or not_applicable.");
  }
  if (Number.isNaN(Date.parse(evidence.producedAt))) {
    throw new PromotionGateError("V2_EVIDENCE_TIME_INVALID", "Evidence producedAt must be an ISO timestamp.");
  }
  assertSha256(evidence.candidateDigest, "candidateDigest");
  assertCommit(evidence.sourceCommit, "sourceCommit");
  assertCommit(evidence.targetBaselineCommit, "targetBaselineCommit");
  if (evidence.checkerVersion !== PROMOTION_V2_CHECKER_VERSION) {
    throw new PromotionGateError("V2_EVIDENCE_CHECKER_STALE", "Evidence is bound to a different checker version.");
  }
  assertJsonRoundTrip(evidence.semanticPayload, "semanticPayload");
  if (evidence.role === "A24" && evidence.result === "not_applicable") {
    const reason = evidence.semanticPayload?.rationale;
    if (typeof reason !== "string" || reason.trim().length < 20) {
      throw new PromotionGateError(
        "V2_A24_DISPOSITION_MISSING",
        "A24 not_applicable evidence requires a substantive reason."
      );
    }
  } else if (evidence.result !== "pass") {
    throw new PromotionGateError("V2_EVIDENCE_RESULT_INVALID", "Only A24 may use not_applicable in this pilot.");
  }
  return evidence;
}

function validateCheckerReleaseBinding(binding) {
  assertExactKeys(
    binding,
    [
      "ledgerPath",
      "ledgerRawSha256",
      "version",
      "bundleAlgorithm",
      "bundleDigest",
      "releaseCommit"
    ],
    "checkerRelease"
  );
  assertSafeRepoRelativePath(binding.ledgerPath);
  assertSha256(binding.ledgerRawSha256, "checkerRelease.ledgerRawSha256");
  if (
    binding.version !== PROMOTION_V2_CHECKER_VERSION ||
    binding.bundleAlgorithm !== "sha256-stable-json-path-raw-v2"
  ) {
    throw new PromotionGateError("V2_CHECKER_RELEASE_INVALID", "Manifest checker release metadata is unsupported.");
  }
  assertSha256(binding.bundleDigest, "checkerRelease.bundleDigest");
  assertCommit(binding.releaseCommit, "checkerRelease.releaseCommit");
}

function validateCandidateArtifactBinding(artifact, index) {
  assertExactKeys(
    artifact,
    ["kind", "id", "path", "rawFileSha256", "recordSha256"],
    `candidateArtifacts[${index}]`
  );
  const expected = PROMOTION_V2_CANDIDATE.artifacts[index];
  if (
    !expected ||
    artifact.kind !== expected.kind ||
    artifact.id !== expected.id ||
    artifact.path !== expected.path
  ) {
    throw new PromotionGateError(
      "V2_CANDIDATE_SELECTION_INVALID",
      "The manifest must freeze the exact new v2 ratios promotion unit."
    );
  }
  assertSafeRepoRelativePath(artifact.path);
  assertSha256(artifact.rawFileSha256, `candidateArtifacts[${index}].rawFileSha256`);
  assertSha256(artifact.recordSha256, `candidateArtifacts[${index}].recordSha256`);
}

function validateEvidenceBinding(binding, index) {
  assertExactKeys(
    binding,
    [
      "role",
      "evidenceId",
      "evidencePath",
      "rawSha256",
      "semanticDigest",
      "reviewedCommit",
      "expectedResult",
      "currentness"
    ],
    `evidenceBindings[${index}]`
  );
  if (!PROMOTION_V2_REQUIRED_OWNER_ROLES.includes(binding.role)) {
    throw new PromotionGateError("V2_EVIDENCE_OWNER_UNKNOWN", "Manifest contains an unknown evidence role.");
  }
  assertNonEmptyString(binding.evidenceId, `evidenceBindings[${index}].evidenceId`);
  assertSafeRepoRelativePath(binding.evidencePath);
  assertSha256(binding.rawSha256, `evidenceBindings[${index}].rawSha256`);
  assertSha256(binding.semanticDigest, `evidenceBindings[${index}].semanticDigest`);
  assertCommit(binding.reviewedCommit, `evidenceBindings[${index}].reviewedCommit`);
  if (!new Set(["pass", "not_applicable"]).has(binding.expectedResult)) {
    throw new PromotionGateError("V2_EVIDENCE_RESULT_INVALID", "Manifest evidence expectedResult is invalid.");
  }
  assertExactKeys(
    binding.currentness,
    ["candidateDigest", "sourceCommit", "targetBaselineCommit", "checkerVersion"],
    `evidenceBindings[${index}].currentness`
  );
  assertSha256(binding.currentness.candidateDigest, "evidence currentness candidateDigest");
  assertCommit(binding.currentness.sourceCommit, "evidence currentness sourceCommit");
  assertCommit(binding.currentness.targetBaselineCommit, "evidence currentness targetBaselineCommit");
  if (binding.currentness.checkerVersion !== PROMOTION_V2_CHECKER_VERSION) {
    throw new PromotionGateError("V2_EVIDENCE_CHECKER_STALE", "Manifest evidence currentness is stale.");
  }
}

export function validateV2Manifest(manifest) {
  assertExactKeys(
    manifest,
    [
      "schemaVersion",
      "gateId",
      "pilotUnitId",
      "attemptId",
      "mode",
      "checkerVersion",
      "checkerRelease",
      "parentPackage",
      "candidatePackage",
      "sourceCommit",
      "targetBaselineCommit",
      "candidateArtifacts",
      "candidateDigest",
      "accessPolicy",
      "requiredOwners",
      "evidenceIndex",
      "evidenceBindings",
      "allowlistedCheckIds",
      "legacyResolution",
      "liveReachability",
      "lifecycle",
      "operationPlan",
      "authorizations",
      "knownBlockers"
    ],
    "v2 manifest"
  );
  ensureNoForbiddenKeys(manifest);
  if (manifest.schemaVersion !== PROMOTION_V2_MANIFEST_SCHEMA) {
    throw new PromotionGateError("V2_MANIFEST_SCHEMA_UNSUPPORTED", "Unsupported Promotion Gate manifest version.");
  }
  if (
    manifest.gateId !== "promotion-shadow-gate-v2" ||
    manifest.pilotUnitId !== PROMOTION_V2_CANDIDATE.promotionUnitId ||
    manifest.attemptId !== "attempt-007" ||
    manifest.mode !== "shadow" ||
    manifest.checkerVersion !== PROMOTION_V2_CHECKER_VERSION
  ) {
    throw new PromotionGateError(
      "V2_MANIFEST_IDENTITY_INVALID",
      "Manifest identity must describe the immutable attempt-007 shadow pilot."
    );
  }
  validateCheckerReleaseBinding(manifest.checkerRelease);
  assertExactKeys(manifest.parentPackage, ["id", "status"], "parentPackage");
  if (
    manifest.parentPackage.id !== PROMOTION_V2_CANDIDATE.parentPackageId ||
    manifest.parentPackage.status !== "candidate-only"
  ) {
    throw new PromotionGateError("V2_PARENT_STATUS_INVALID", "The parent package must remain candidate-only.");
  }
  assertExactKeys(
    manifest.candidatePackage,
    ["id", "version", "path", "rawSha256", "status"],
    "candidatePackage"
  );
  if (
    manifest.candidatePackage.id !== PROMOTION_V2_CANDIDATE.packageId ||
    manifest.candidatePackage.version !== PROMOTION_V2_CANDIDATE.candidateVersion ||
    manifest.candidatePackage.path !== PROMOTION_V2_CANDIDATE.packagePath ||
    manifest.candidatePackage.status !== "candidate-only"
  ) {
    throw new PromotionGateError("V2_CANDIDATE_PACKAGE_INVALID", "Manifest candidate package binding is invalid.");
  }
  assertSafeRepoRelativePath(manifest.candidatePackage.path);
  assertSha256(manifest.candidatePackage.rawSha256, "candidatePackage.rawSha256");
  assertCommit(manifest.sourceCommit, "sourceCommit");
  assertCommit(manifest.targetBaselineCommit, "targetBaselineCommit");
  if (!Array.isArray(manifest.candidateArtifacts) || manifest.candidateArtifacts.length !== 3) {
    throw new PromotionGateError("V2_CANDIDATE_SELECTION_INVALID", "Manifest must contain exactly three candidate artifacts.");
  }
  manifest.candidateArtifacts.forEach(validateCandidateArtifactBinding);
  assertSha256(manifest.candidateDigest, "candidateDigest");

  assertExactKeys(
    manifest.accessPolicy,
    ["readPaths", "forbiddenModifyPaths", "tempWritePolicy", "forbiddenCapabilities"],
    "accessPolicy"
  );
  assertCanonicalPathList(manifest.accessPolicy.readPaths, "accessPolicy.readPaths");
  assertCanonicalPathList(manifest.accessPolicy.forbiddenModifyPaths, "accessPolicy.forbiddenModifyPaths");
  const expectedReadPaths = [
    "app",
    "components",
    "coordination/content-qa",
    "coordination/integration",
    "coordination/release-intake",
    "coordination/reports",
    "data",
    "lib",
    "middleware.ts",
    "next.config.ts",
    "public",
    "tsconfig.json"
  ];
  if (stableJson(manifest.accessPolicy.readPaths) !== stableJson(expectedReadPaths)) {
    throw new PromotionGateError("V2_READ_POLICY_INVALID", "Manifest read access differs from the frozen safe roots.");
  }
  const expectedForbiddenModifyPaths = [
    manifest.candidatePackage.path,
    ...manifest.candidateArtifacts.map(({ path: artifactPath }) => artifactPath),
    ...PROMOTION_V2_LIVE_ROOTS,
    ...PROMOTION_V2_LIVE_SPECIAL_PATHS
  ];
  if (stableJson(manifest.accessPolicy.forbiddenModifyPaths) !== stableJson(expectedForbiddenModifyPaths)) {
    throw new PromotionGateError(
      "V2_WRITE_POLICY_INVALID",
      "Manifest must forbid changes to every candidate source and live path."
    );
  }
  if (manifest.accessPolicy.tempWritePolicy !== "new-os-temp-root-outside-repository-only") {
    throw new PromotionGateError("V2_WRITE_POLICY_INVALID", "Shadow writes must use a new OS temp root outside the repository.");
  }
  const expectedCapabilities = [
    "database-write",
    "deployment",
    "live-registry-write",
    "network",
    "production-write",
    "provider",
    "vercel"
  ];
  if (stableJson(manifest.accessPolicy.forbiddenCapabilities) !== stableJson(expectedCapabilities)) {
    throw new PromotionGateError("V2_FORBIDDEN_CAPABILITY", "Manifest forbidden capability policy is incomplete.");
  }

  if (stableJson(manifest.requiredOwners) !== stableJson(PROMOTION_V2_REQUIRED_OWNER_ROLES)) {
    throw new PromotionGateError("V2_OWNER_SET_INVALID", "Manifest must require all nine independent owner roles.");
  }
  assertExactKeys(manifest.evidenceIndex, ["path", "rawSha256"], "evidenceIndex");
  assertSafeRepoRelativePath(manifest.evidenceIndex.path);
  assertSha256(manifest.evidenceIndex.rawSha256, "evidenceIndex.rawSha256");
  if (!Array.isArray(manifest.evidenceBindings) || manifest.evidenceBindings.length !== 9) {
    throw new PromotionGateError("V2_EVIDENCE_SET_INVALID", "Manifest must bind exactly nine owner evidence records.");
  }
  manifest.evidenceBindings.forEach((binding, index) => {
    validateEvidenceBinding(binding, index);
    if (stableJson(binding.currentness) !== stableJson({
      candidateDigest: manifest.candidateDigest,
      sourceCommit: manifest.sourceCommit,
      targetBaselineCommit: manifest.targetBaselineCommit,
      checkerVersion: manifest.checkerVersion
    })) {
      throw new PromotionGateError(
        "V2_EVIDENCE_BINDING_MISMATCH",
        "Manifest evidence currentness differs from the immutable candidate, source, baseline, or checker binding."
      );
    }
  });
  const boundRoles = manifest.evidenceBindings.map(({ role }) => role);
  assertUniqueCanonicalStrings(boundRoles, "evidence roles");
  if (stableJson(boundRoles) !== stableJson(PROMOTION_V2_REQUIRED_OWNER_ROLES)) {
    throw new PromotionGateError("V2_OWNER_SET_INVALID", "Evidence bindings must preserve the required owner order.");
  }
  const evidencePaths = manifest.evidenceBindings.map(({ evidencePath }) => evidencePath);
  assertCanonicalPathList(evidencePaths, "evidence paths");

  if (stableJson(manifest.allowlistedCheckIds) !== stableJson(PROMOTION_V2_REQUIRED_CHECK_IDS)) {
    throw new PromotionGateError("V2_CHECK_ID_UNKNOWN", "Manifest check IDs must match the registered v2 checker set.");
  }
  assertExactKeys(manifest.legacyResolution, ["registryPath", "rawSha256"], "legacyResolution");
  assertSafeRepoRelativePath(manifest.legacyResolution.registryPath);
  assertSha256(manifest.legacyResolution.rawSha256, "legacyResolution.rawSha256");
  assertExactKeys(
    manifest.liveReachability,
    ["compatibilityManifestPath", "compatibilityManifestRawSha256", "expectedRuntimePolicy"],
    "liveReachability"
  );
  assertSafeRepoRelativePath(manifest.liveReachability.compatibilityManifestPath);
  assertSha256(
    manifest.liveReachability.compatibilityManifestRawSha256,
    "liveReachability.compatibilityManifestRawSha256"
  );
  validateExpectedRuntimePolicy(manifest.liveReachability.expectedRuntimePolicy);

  assertExactKeys(
    manifest.lifecycle,
    ["priorState", "currentState", "requestedState", "failureStates"],
    "lifecycle"
  );
  if (
    manifest.lifecycle.priorState !== "candidate_hold" ||
    manifest.lifecycle.currentState !== "shadow_ready" ||
    manifest.lifecycle.requestedState !== "shadow_passed" ||
    stableJson(manifest.lifecycle.failureStates) !== stableJson(["repair_required", "rejected"])
  ) {
    throw new PromotionGateError(
      "V2_STATE_TRANSITION_INVALID",
      "Attempt-006 must record candidate_hold -> shadow_ready -> shadow_passed without skipping."
    );
  }
  validateOperationPlan(manifest.operationPlan);
  assertExactKeys(
    manifest.authorizations,
    [
      "shadowAllowed",
      "integrationAllowed",
      "liveAllowed",
      "previewAllowed",
      "deployAllowed"
    ],
    "authorizations"
  );
  if (
    manifest.authorizations.shadowAllowed !== true ||
    manifest.authorizations.integrationAllowed !== false ||
    manifest.authorizations.liveAllowed !== false ||
    manifest.authorizations.previewAllowed !== false ||
    manifest.authorizations.deployAllowed !== false
  ) {
    throw new PromotionGateError("V2_LIVE_AUTHORIZATION_FORBIDDEN", "v2 authorizations must be shadow-only.");
  }
  if (!Array.isArray(manifest.knownBlockers)) {
    throw new PromotionGateError("V2_SCHEMA_INVALID", "knownBlockers must be an array.");
  }
  for (const [index, blocker] of manifest.knownBlockers.entries()) {
    assertExactKeys(blocker, ["scope", "code", "owner", "description"], `knownBlockers[${index}]`);
    if (blocker.scope !== "live") {
      throw new PromotionGateError("V2_SHADOW_BLOCKER_PRESENT", "A non-live blocker may not be hidden in knownBlockers.");
    }
    assertNonEmptyString(blocker.code, "known blocker code");
    assertNonEmptyString(blocker.owner, "known blocker owner");
    assertNonEmptyString(blocker.description, "known blocker description");
  }

  const requiredReadable = [
    manifest.candidatePackage.path,
    ...manifest.candidateArtifacts.map(({ path: artifactPath }) => artifactPath),
    manifest.evidenceIndex.path,
    ...evidencePaths,
    manifest.legacyResolution.registryPath,
    manifest.liveReachability.compatibilityManifestPath,
    manifest.checkerRelease.ledgerPath
  ];
  for (const requiredPath of requiredReadable) {
    if (!manifest.accessPolicy.readPaths.some((allowedPath) =>
      requiredPath === allowedPath || requiredPath.startsWith(`${allowedPath}/`)
    )) {
      throw new PromotionGateError("V2_READ_POLICY_INCOMPLETE", "A required input path is absent from accessPolicy.readPaths.");
    }
  }
  return manifest;
}

function validateExpectedRuntimePolicy(policy) {
  assertExactKeys(
    policy,
    [
      "coveredFileCount",
      "coveredFilesDigest",
      "classificationsDigest",
      "frameworkEntrypointCount",
      "seedCount",
      "reachablePathCount",
      "reachablePathsDigest",
      "edgeCount",
      "edgeDigest",
      "topologyEdgeCount",
      "topologyEdgeDigest",
      "nextDynamicCallCount",
      "nextDynamicLiteralImportCount",
      "nextDynamicNonliteralImportCount",
      "nextDynamicCallsiteDigest",
      "fsReadAllowlistCount",
      "fsReadAllowlistDigest",
      "zeroBaselineCallCount"
    ],
    "expectedRuntimePolicy"
  );
  const integerFields = [
    "coveredFileCount",
    "frameworkEntrypointCount",
    "seedCount",
    "reachablePathCount",
    "edgeCount",
    "topologyEdgeCount",
    "nextDynamicCallCount",
    "nextDynamicLiteralImportCount",
    "nextDynamicNonliteralImportCount",
    "fsReadAllowlistCount",
    "zeroBaselineCallCount"
  ];
  for (const field of integerFields) {
    if (!Number.isSafeInteger(policy[field]) || policy[field] < 0) {
      throw new PromotionGateError("V2_SCHEMA_INVALID", `expectedRuntimePolicy.${field} must be a non-negative integer.`);
    }
  }
  for (const field of Object.keys(policy).filter((field) => field.endsWith("Digest"))) {
    assertSha256(policy[field], `expectedRuntimePolicy.${field}`);
  }
}

function validateOperationPlan(plan) {
  assertExactKeys(
    plan,
    ["adapterId", "operationIds", "expectedOperationCount", "outputContracts", "rollbackPlan"],
    "operationPlan"
  );
  if (plan.adapterId !== "promotion-ratios-shadow-adapter.v2") {
    throw new PromotionGateError("V2_ADAPTER_UNKNOWN", "Manifest references an unknown shadow adapter.");
  }
  const expectedOperations = [
    "map-safe-card",
    "map-practice-item",
    "map-lesson",
    "emit-compatibility-report"
  ];
  if (
    stableJson(plan.operationIds) !== stableJson(expectedOperations) ||
    plan.expectedOperationCount !== expectedOperations.length
  ) {
    throw new PromotionGateError("V2_OPERATION_PLAN_INVALID", "Shadow operation plan is not the registered v2 plan.");
  }
  const expectedContracts = [
    "shadow-standards-dto.v2",
    "shadow-practice-dto.v2",
    "shadow-lesson-dto.v2",
    "shadow-compatibility-report.v2"
  ];
  if (stableJson(plan.outputContracts) !== stableJson(expectedContracts)) {
    throw new PromotionGateError("V2_OPERATION_PLAN_INVALID", "Shadow output contracts are not exact.");
  }
  assertExactKeys(plan.rollbackPlan, ["strategy", "expectedPreimage"], "operationPlan.rollbackPlan");
  if (
    plan.rollbackPlan.strategy !== "remove-new-isolated-temp-root" ||
    plan.rollbackPlan.expectedPreimage !== "absent"
  ) {
    throw new PromotionGateError("V2_ROLLBACK_PLAN_INVALID", "Shadow rollback must restore an absent temp-root preimage.");
  }
}

export async function loadV2Manifest(repoRoot, manifestPath) {
  assertSafeRepoRelativePath(manifestPath);
  const loaded = await readCanonicalJson(repoRoot, manifestPath, "V2_MANIFEST_JSON_INVALID", "v2 manifest");
  validateV2Manifest(loaded.value);
  return { manifest: loaded.value, loaded };
}

export async function loadV2Candidate(repoRoot, manifest) {
  const packageLoaded = await readCanonicalJson(
    repoRoot,
    manifest.candidatePackage.path,
    "V2_CANDIDATE_JSON_INVALID",
    "v2 candidate package"
  );
  if (packageLoaded.rawSha256 !== manifest.candidatePackage.rawSha256) {
    throw new PromotionGateError("V2_CANDIDATE_DIGEST_MISMATCH", "Candidate package bytes drifted.");
  }
  const candidatePackage = packageLoaded.value;
  assertExactKeys(
    candidatePackage,
    [
      "schemaVersion",
      "packageId",
      "parentPackageId",
      "candidateVersion",
      "status",
      "createdAt",
      "promotionUnitId",
      "supersedesAttempt",
      "records",
      "localization",
      "authorizations"
    ],
    "candidate package"
  );
  if (
    candidatePackage.schemaVersion !== "promotion-candidate-package.v2" ||
    candidatePackage.packageId !== PROMOTION_V2_CANDIDATE.packageId ||
    candidatePackage.parentPackageId !== PROMOTION_V2_CANDIDATE.parentPackageId ||
    candidatePackage.candidateVersion !== PROMOTION_V2_CANDIDATE.candidateVersion ||
    candidatePackage.status !== "candidate-only" ||
    candidatePackage.promotionUnitId !== PROMOTION_V2_CANDIDATE.promotionUnitId
  ) {
    throw new PromotionGateError("V2_CANDIDATE_PACKAGE_INVALID", "Candidate package identity or status is invalid.");
  }
  assertExactKeys(
    candidatePackage.supersedesAttempt,
    ["promotionUnitId", "attemptId", "disposition", "reuseReceipt"],
    "candidate supersedesAttempt"
  );
  if (
    candidatePackage.supersedesAttempt.promotionUnitId !== "us-ca-math-rag-v2-g6-ratios-v1" ||
    candidatePackage.supersedesAttempt.attemptId !== "attempt-001" ||
    candidatePackage.supersedesAttempt.disposition !== "repair_required" ||
    candidatePackage.supersedesAttempt.reuseReceipt !== false
  ) {
    throw new PromotionGateError(
      "V2_ATTEMPT_REUSE_FORBIDDEN",
      "The v2 candidate must supersede, never overwrite or reuse, terminal attempt-001."
    );
  }
  if (stableJson(candidatePackage.records) !== stableJson(PROMOTION_V2_CANDIDATE.artifacts.map(
    ({ kind, id, path: artifactPath }) => ({ kind, id, path: artifactPath })
  ))) {
    throw new PromotionGateError("V2_CANDIDATE_SELECTION_INVALID", "Candidate package records drifted.");
  }
  assertExactKeys(candidatePackage.authorizations, [
    "shadowAllowed",
    "integrationAllowed",
    "liveAllowed",
    "previewAllowed",
    "deployAllowed"
  ], "candidate authorizations");
  if (
    candidatePackage.authorizations.shadowAllowed !== true ||
    Object.entries(candidatePackage.authorizations)
      .filter(([key]) => key !== "shadowAllowed")
      .some(([, value]) => value !== false)
  ) {
    throw new PromotionGateError("V2_LIVE_AUTHORIZATION_FORBIDDEN", "Candidate package must remain shadow-only.");
  }

  const records = [];
  const aggregateArtifacts = [];
  for (const [index, binding] of manifest.candidateArtifacts.entries()) {
    const loaded = await readCanonicalJson(
      repoRoot,
      binding.path,
      "V2_CANDIDATE_JSON_INVALID",
      `v2 ${binding.kind}`
    );
    if (loaded.rawSha256 !== binding.rawFileSha256) {
      throw new PromotionGateError("V2_CANDIDATE_DIGEST_MISMATCH", `${binding.kind} raw bytes drifted.`);
    }
    const recordSha256 = fingerprint(loaded.value);
    if (recordSha256 !== binding.recordSha256) {
      throw new PromotionGateError("V2_CANDIDATE_RECORD_DIGEST_MISMATCH", `${binding.kind} semantics drifted.`);
    }
    if (loaded.value.id !== binding.id || loaded.value.packageId !== PROMOTION_V2_CANDIDATE.packageId) {
      throw new PromotionGateError("V2_CANDIDATE_SELECTION_INVALID", `${binding.kind} record identity drifted.`);
    }
    if (records.some(({ value }) => value.id === loaded.value.id)) {
      throw new PromotionGateError("V2_CANDIDATE_DUPLICATE_ID", "Candidate records contain a duplicate id.");
    }
    records.push({ index, binding, loaded, value: loaded.value });
    aggregateArtifacts.push({
      kind: binding.kind,
      id: binding.id,
      path: binding.path,
      rawFileSha256: loaded.rawSha256,
      recordSha256
    });
  }
  const candidateDigest = fingerprint({
    packageId: candidatePackage.packageId,
    candidateVersion: candidatePackage.candidateVersion,
    artifacts: aggregateArtifacts
  });
  if (candidateDigest !== manifest.candidateDigest) {
    throw new PromotionGateError("V2_CANDIDATE_AGGREGATE_MISMATCH", "Aggregate candidate digest drifted.");
  }
  return {
    candidatePackage,
    packageLoaded,
    records,
    aggregateArtifacts,
    candidateDigest,
    paths: [manifest.candidatePackage.path, ...manifest.candidateArtifacts.map(({ path: artifactPath }) => artifactPath)]
  };
}

export async function collectV2ProvenanceProof(repoRoot, manifest, candidate, executionCommit) {
  await assertAncestor(repoRoot, manifest.sourceCommit, executionCommit, "candidate source commit");
  await assertAncestor(repoRoot, manifest.targetBaselineCommit, executionCommit, "target baseline commit");
  const bindings = [
    {
      path: manifest.candidatePackage.path,
      rawSha256: manifest.candidatePackage.rawSha256
    },
    ...manifest.candidateArtifacts.map(({ path: artifactPath, rawFileSha256 }) => ({
      path: artifactPath,
      rawSha256: rawFileSha256
    }))
  ];
  for (const binding of bindings) {
    const sourceBytes = await gitBlob(repoRoot, manifest.sourceCommit, binding.path);
    if (sha256(sourceBytes) !== binding.rawSha256) {
      throw new PromotionGateError(
        "V2_SOURCE_COMMIT_MISMATCH",
        "Candidate bytes do not match the immutable source commit.",
        { pathDigest: fingerprint(binding.path) },
        "blocked"
      );
    }
  }
  return {
    schemaVersion: "promotion-candidate-provenance-proof.v2",
    sourceCommit: manifest.sourceCommit,
    sourceCommitIsAncestor: true,
    candidatePathCount: bindings.length,
    candidatePathDigest: fingerprint(bindings.map(({ path: bindingPath }) => bindingPath)),
    candidateDigest: candidate.candidateDigest,
    sourceBlobAggregateDigest: fingerprint(bindings)
  };
}

export async function collectV2BaselineProof(repoRoot, manifest, executionCommit) {
  const protectedPaths = [...PROMOTION_V2_LIVE_ROOTS, ...PROMOTION_V2_LIVE_SPECIAL_PATHS];
  const { stdout } = await runGit(repoRoot, [
    "diff",
    "--name-only",
    `${manifest.targetBaselineCommit}..${executionCommit}`,
    "--",
    ...protectedPaths
  ]);
  const changedPaths = stdout.trim() === "" ? [] : stdout.trim().split("\n").sort(codePointCompare);
  const classifications = changedPaths.map((changedPath) => ({
    path: changedPath,
    classification: classifyRuntimeSurfacePath(changedPath)
  }));
  const allowedTestOnlyPaths = classifications
    .filter(({ classification }) => classification === "test-code")
    .map(({ path: changedPath }) => changedPath);
  const runtimeChangedPaths = classifications
    .filter(({ classification }) => classification !== "test-code")
    .map(({ path: changedPath }) => changedPath);
  if (runtimeChangedPaths.length > 0) {
    throw new PromotionGateError(
      "V2_TARGET_BASELINE_DRIFT",
      "Live/runtime paths changed after the evidence-bound target baseline.",
      {
        changedPathCount: runtimeChangedPaths.length,
        changedPathsDigest: fingerprint(runtimeChangedPaths),
        allowedTestOnlyPathCount: allowedTestOnlyPaths.length,
        allowedTestOnlyPathsDigest: fingerprint(allowedTestOnlyPaths)
      },
      "blocked"
    );
  }
  return {
    schemaVersion: "promotion-target-baseline-proof.v2",
    targetBaselineCommit: manifest.targetBaselineCommit,
    executionCommit,
    protectedPaths,
    observedChangedPathCount: changedPaths.length,
    observedChangedPathsDigest: fingerprint(changedPaths),
    allowedTestOnlyPathCount: allowedTestOnlyPaths.length,
    allowedTestOnlyPathsDigest: fingerprint(allowedTestOnlyPaths),
    runtimeChangedPathCount: 0,
    runtimeChangedPathsDigest: fingerprint([])
  };
}

export function computeV2CheckerBundleDigest(bindings) {
  return fingerprint(bindings.map(({ path: bundlePath, rawSha256 }) => ({ path: bundlePath, rawSha256 })));
}

export async function collectV2CheckerReleaseProof(repoRoot, manifest, executionCommit) {
  const loaded = await readCanonicalJson(
    repoRoot,
    manifest.checkerRelease.ledgerPath,
    "V2_CHECKER_LEDGER_JSON_INVALID",
    "v2 checker release ledger"
  );
  if (loaded.rawSha256 !== manifest.checkerRelease.ledgerRawSha256) {
    throw new PromotionGateError("V2_CHECKER_LEDGER_DIGEST_MISMATCH", "Checker release ledger bytes drifted.");
  }
  assertExactKeys(loaded.value, ["schemaVersion", "entries"], "checker release ledger");
  if (
    loaded.value.schemaVersion !== PROMOTION_V2_CHECKER_LEDGER_SCHEMA ||
    !Array.isArray(loaded.value.entries)
  ) {
    throw new PromotionGateError("V2_CHECKER_RELEASE_INVALID", "Unsupported checker release ledger.");
  }
  const entry = loaded.value.entries.find(({ version }) => version === PROMOTION_V2_CHECKER_VERSION);
  if (!entry) {
    throw new PromotionGateError("V2_CHECKER_RELEASE_UNKNOWN", "The v2 checker has no immutable release entry.", {}, "blocked");
  }
  assertExactKeys(
    entry,
    ["version", "bundleAlgorithm", "bundlePaths", "bundleDigest", "releaseCommit"],
    "checker release entry"
  );
  if (
    entry.bundleAlgorithm !== "sha256-stable-json-path-raw-v2" ||
    stableJson(entry.bundlePaths) !== stableJson(PROMOTION_V2_CHECKER_BUNDLE_PATHS) ||
    entry.bundleDigest !== manifest.checkerRelease.bundleDigest ||
    entry.releaseCommit !== manifest.checkerRelease.releaseCommit
  ) {
    throw new PromotionGateError("V2_CHECKER_RELEASE_INVALID", "Manifest and checker release ledger disagree.");
  }
  await assertAncestor(repoRoot, entry.releaseCommit, executionCommit, "checker release commit");
  const bindings = [];
  for (const bundlePath of entry.bundlePaths) {
    const current = await readAuthoritativeFile(repoRoot, bundlePath);
    const releasedBytes = await gitBlob(repoRoot, entry.releaseCommit, bundlePath);
    const releasedSha = sha256(releasedBytes);
    if (current.rawSha256 !== releasedSha) {
      throw new PromotionGateError(
        "V2_CHECKER_RELEASE_DRIFT",
        "Checker bundle bytes differ from the immutable release commit.",
        { pathDigest: fingerprint(bundlePath) },
        "blocked"
      );
    }
    bindings.push({ path: bundlePath, rawSha256: current.rawSha256 });
  }
  const bundleDigest = computeV2CheckerBundleDigest(bindings);
  if (bundleDigest !== entry.bundleDigest) {
    throw new PromotionGateError("V2_CHECKER_BUNDLE_MISMATCH", "Checker bundle digest is invalid.", {}, "blocked");
  }
  return {
    schemaVersion: "promotion-checker-release-proof.v2",
    version: entry.version,
    releaseCommit: entry.releaseCommit,
    bundleAlgorithm: entry.bundleAlgorithm,
    bundleDigest,
    bundlePathCount: bindings.length,
    bundlePathsDigest: fingerprint(bindings.map(({ path: bundlePath }) => bundlePath)),
    ledgerRawSha256: loaded.rawSha256
  };
}

function validateV2EvidenceIndex(index, manifest) {
  assertExactKeys(
    index,
    ["schemaVersion", "candidateDigest", "sourceCommit", "targetBaselineCommit", "checkerVersion", "entries"],
    "v2 evidence index"
  );
  if (
    index.schemaVersion !== PROMOTION_V2_EVIDENCE_INDEX_SCHEMA ||
    index.candidateDigest !== manifest.candidateDigest ||
    index.sourceCommit !== manifest.sourceCommit ||
    index.targetBaselineCommit !== manifest.targetBaselineCommit ||
    index.checkerVersion !== manifest.checkerVersion ||
    stableJson(index.entries) !== stableJson(manifest.evidenceBindings)
  ) {
    throw new PromotionGateError("V2_EVIDENCE_INDEX_INVALID", "Evidence index is not an exact manifest projection.");
  }
}

const CONTRACT_VERSION_BY_ROLE = Object.freeze({
  A21: "promotion-a21-candidate.v2",
  A18: "promotion-a18-shadow-qa.v2",
  A23: "promotion-a23-shadow-readiness.v2",
  A04: "promotion-a04-practice-semantics.v2",
  A05: "promotion-a05-lesson-semantics.v2",
  A11: "promotion-a11-shadow-preflight.v2",
  A22: "promotion-a22-shadow-isolation-preflight.v2",
  A24: "promotion-a24-exact-layer.v2",
  A25: "promotion-a25-release-intake.v2"
});

function validateRoleEvidenceSemantics(evidence) {
  if (evidence.semanticPayload?.contractVersion !== CONTRACT_VERSION_BY_ROLE[evidence.role]) {
    throw new PromotionGateError("V2_EVIDENCE_SEMANTICS_INVALID", `${evidence.role} evidence contract is invalid.`);
  }
  if (evidence.role === "A18") {
    if (evidence.semanticPayload.shadowEligible !== true || evidence.semanticPayload.liveEligible !== false) {
      throw new PromotionGateError("V2_EVIDENCE_SEMANTICS_INVALID", "A18 must approve shadow and block live.");
    }
  }
  if (evidence.role === "A21") {
    if (
      evidence.semanticPayload.aggregateCandidateDigest !== evidence.candidateDigest ||
      evidence.semanticPayload.candidatePackage?.id !== PROMOTION_V2_CANDIDATE.packageId ||
      evidence.semanticPayload.candidatePackage?.status !== "candidate-only" ||
      evidence.semanticPayload.candidatePackage?.immutableDuringShadow !== true ||
      evidence.semanticPayload.liveAllowed !== false
    ) {
      throw new PromotionGateError("V2_EVIDENCE_SEMANTICS_INVALID", "A21 candidate provenance evidence is invalid.");
    }
  }
  if (evidence.role === "A04" || evidence.role === "A05") {
    if (evidence.semanticPayload.liveAllowed !== false) {
      throw new PromotionGateError("V2_EVIDENCE_SEMANTICS_INVALID", `${evidence.role} must preserve the non-live boundary.`);
    }
  }
  if (evidence.role === "A23") {
    if (
      evidence.semanticPayload.currentState !== "candidate_hold" ||
      evidence.semanticPayload.authorizedState !== "shadow_ready" ||
      evidence.semanticPayload.liveAllowed !== false
    ) {
      throw new PromotionGateError("V2_EVIDENCE_SEMANTICS_INVALID", "A23 readiness transition is invalid.");
    }
  }
  if (evidence.role === "A11" && evidence.semanticPayload.independentReplayRequired !== true) {
    throw new PromotionGateError("V2_EVIDENCE_SEMANTICS_INVALID", "A11 must require an independent post-run replay.");
  }
  if (evidence.role === "A11" && evidence.semanticPayload.liveAllowed !== false) {
    throw new PromotionGateError("V2_EVIDENCE_SEMANTICS_INVALID", "A11 must preserve the non-live boundary.");
  }
  if (evidence.role === "A22") {
    if (
      evidence.semanticPayload.cleanWorktreeRequired !== true ||
      evidence.semanticPayload.externalSideEffectsAllowed !== false ||
      evidence.semanticPayload.liveAllowed !== false
    ) {
      throw new PromotionGateError("V2_EVIDENCE_SEMANTICS_INVALID", "A22 isolation evidence is invalid.");
    }
  }
  if (
    evidence.role === "A24" &&
    (evidence.semanticPayload.exactLayerDisposition !== "not-applicable" || evidence.semanticPayload.liveAllowed !== false)
  ) {
    throw new PromotionGateError("V2_EVIDENCE_SEMANTICS_INVALID", "A24 disposition must remain non-live.");
  }
  if (evidence.role === "A25" && evidence.semanticPayload.finalDisposition !== "reviewed commit") {
    throw new PromotionGateError("V2_EVIDENCE_SEMANTICS_INVALID", "A25 must record a legal review package disposition.");
  }
  if (evidence.role === "A25" && evidence.semanticPayload.liveAllowed !== false) {
    throw new PromotionGateError("V2_EVIDENCE_SEMANTICS_INVALID", "A25 must preserve the non-live boundary.");
  }
}

export async function loadV2Evidence(repoRoot, manifest, executionCommit) {
  const indexLoaded = await readCanonicalJson(
    repoRoot,
    manifest.evidenceIndex.path,
    "V2_EVIDENCE_INDEX_JSON_INVALID",
    "v2 evidence index"
  );
  if (indexLoaded.rawSha256 !== manifest.evidenceIndex.rawSha256) {
    throw new PromotionGateError("V2_EVIDENCE_INDEX_DIGEST_MISMATCH", "Evidence index bytes drifted.");
  }
  validateV2EvidenceIndex(indexLoaded.value, manifest);
  const evidenceByRole = new Map();
  const proofBindings = [];
  for (const binding of manifest.evidenceBindings) {
    const loaded = await readCanonicalJson(
      repoRoot,
      binding.evidencePath,
      "V2_EVIDENCE_JSON_INVALID",
      `${binding.role} v2 evidence`
    );
    if (loaded.rawSha256 !== binding.rawSha256) {
      throw new PromotionGateError("V2_EVIDENCE_RAW_DIGEST_MISMATCH", `${binding.role} evidence bytes drifted.`);
    }
    const evidence = validateV2Evidence(loaded.value);
    if (
      evidence.evidenceId !== binding.evidenceId ||
      evidence.role !== binding.role ||
      evidence.result !== binding.expectedResult ||
      evidence.candidateDigest !== manifest.candidateDigest ||
      evidence.sourceCommit !== manifest.sourceCommit ||
      evidence.targetBaselineCommit !== manifest.targetBaselineCommit ||
      evidence.checkerVersion !== manifest.checkerVersion ||
      stableJson(binding.currentness) !== stableJson({
        candidateDigest: evidence.candidateDigest,
        sourceCommit: evidence.sourceCommit,
        targetBaselineCommit: evidence.targetBaselineCommit,
        checkerVersion: evidence.checkerVersion
      })
    ) {
      throw new PromotionGateError("V2_EVIDENCE_BINDING_MISMATCH", `${binding.role} evidence is stale or misbound.`);
    }
    const semanticDigest = computeV2EvidenceSemanticDigest(evidence);
    if (semanticDigest !== binding.semanticDigest) {
      throw new PromotionGateError("V2_EVIDENCE_SEMANTIC_DIGEST_MISMATCH", `${binding.role} evidence semantics drifted.`);
    }
    validateRoleEvidenceSemantics(evidence);
    await assertAncestor(repoRoot, binding.reviewedCommit, executionCommit, `${binding.role} reviewed commit`);
    const reviewedBytes = await gitBlob(repoRoot, binding.reviewedCommit, binding.evidencePath);
    if (sha256(reviewedBytes) !== binding.rawSha256) {
      throw new PromotionGateError(
        "V2_EVIDENCE_REVIEW_COMMIT_MISMATCH",
        `${binding.role} evidence was not reviewed at the bound commit.`,
        {},
        "blocked"
      );
    }
    evidenceByRole.set(binding.role, evidence);
    proofBindings.push({
      role: binding.role,
      evidenceId: binding.evidenceId,
      evidencePath: binding.evidencePath,
      rawSha256: binding.rawSha256,
      semanticDigest,
      reviewedCommit: binding.reviewedCommit,
      result: evidence.result
    });
  }
  const a23Payload = evidenceByRole.get("A23")?.semanticPayload;
  const a25Payload = evidenceByRole.get("A25")?.semanticPayload;
  if (
    a23Payload?.legacyResolutionRegistryRawSha256 !== manifest.legacyResolution.rawSha256 ||
    a25Payload?.legacyResolutionRegistryRawSha256 !== manifest.legacyResolution.rawSha256 ||
    a23Payload?.targetBaselineCommit !== manifest.targetBaselineCommit ||
    a25Payload?.targetBaselineCommit !== manifest.targetBaselineCommit
  ) {
    throw new PromotionGateError(
      "V2_LEGACY_REVIEW_BINDING_MISMATCH",
      "A23 and A25 must independently bind the exact legacy registry and runtime baseline."
    );
  }
  return {
    index: indexLoaded.value,
    indexRawSha256: indexLoaded.rawSha256,
    evidenceByRole,
    proof: {
      schemaVersion: "promotion-owner-evidence-proof.v2",
      roleCount: proofBindings.length,
      roles: [...evidenceByRole.keys()],
      bindings: proofBindings,
      bindingsDigest: fingerprint(proofBindings),
      independentFileCount: new Set(proofBindings.map(({ evidencePath }) => evidencePath)).size
    }
  };
}

export function evaluateV2AcceptedAnswer(practice, submitted) {
  if (
    practice?.acceptedAnswerPolicy !== "exact-trimmed-forms-v2" ||
    !Array.isArray(practice.acceptedAnswers) ||
    typeof submitted !== "string"
  ) {
    return false;
  }
  const normalized = submitted.trim();
  return practice.acceptedAnswers.some((answer) => normalized === answer);
}

function collectObjectKeyPaths(value, parent = []) {
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) => collectObjectKeyPaths(entry, [...parent, String(index)]));
  }
  if (!isPlainObject(value)) return [];
  return Object.entries(value).flatMap(([key, entry]) => [
    [...parent, key].join("/"),
    ...collectObjectKeyPaths(entry, [...parent, key])
  ]);
}

export function validateV2ContentSemantics(candidate, evidenceByRole) {
  const byKind = new Map(candidate.records.map(({ binding, value }) => [binding.kind, value]));
  const safeCard = byKind.get("safe-card");
  const practice = byKind.get("practice");
  const lesson = byKind.get("lesson");
  if (!safeCard || !practice || !lesson) {
    throw new PromotionGateError("V2_CANDIDATE_SELECTION_INVALID", "All three v2 candidate records are required.");
  }
  const expectedClusterStandards = ["6.RP.1", "6.RP.2", "6.RP.3"];
  const expectedMaisStandards = [
    "CA.CCSS.Math.G6.RP.1",
    "CA.CCSS.Math.G6.RP.2",
    "CA.CCSS.Math.G6.RP.3"
  ];
  for (const [kind, record] of byKind.entries()) {
    if (
      record.packageId !== PROMOTION_V2_CANDIDATE.packageId ||
      record.parentPackageId !== PROMOTION_V2_CANDIDATE.parentPackageId ||
      record.status !== "candidate-only" ||
      record.curriculumTrack !== "US_CA_MATH" ||
      record.state !== "CA" ||
      record.grade !== "P6" ||
      record.usGradeLabel !== "Grade 6" ||
      record.clusterId !== "6.RP.ratios" ||
      !Array.isArray(record.canonicalStandardIds) ||
      stableJson(record.canonicalStandardIds) !== stableJson(expectedClusterStandards) ||
      !Array.isArray(record.maisStandardIds) ||
      stableJson(record.maisStandardIds) !== stableJson(expectedMaisStandards)
    ) {
      throw new PromotionGateError("V2_CONTENT_ALIGNMENT_INVALID", `${kind} grade, cluster, or standards drifted.`);
    }
    if (
      !Array.isArray(record.localization?.presentLocales) ||
      stableJson(record.localization?.presentLocales) !== stableJson(["en"]) ||
      !Array.isArray(record.localization?.missingLiveLocales) ||
      stableJson(record.localization?.missingLiveLocales) !== stableJson(["zh", "zhHans"])
    ) {
      throw new PromotionGateError(
        "V2_LOCALIZATION_BOUNDARY_INVALID",
        `${kind} must explicitly preserve the English-only live blocker.`
      );
    }
  }
  if (
    safeCard.schemaVersion !== "cluster-safe-card-v2" ||
    !Array.isArray(safeCard.domainIds) ||
    stableJson(safeCard.domainIds) !== stableJson(["6.RP"]) ||
    !Array.isArray(safeCard.maisDomainIds) ||
    stableJson(safeCard.maisDomainIds) !== stableJson(["CA.CCSS.Math.G6.RP"]) ||
    !safeCard.misconceptionTags.includes("ratio order reversed") ||
    !safeCard.misconceptionTags.includes("unit rate not normalized")
  ) {
    throw new PromotionGateError("V2_SAFE_CARD_INVALID", "Safe card semantics are incomplete.");
  }
  if (
    practice.schemaVersion !== "promotion-practice-item.v2" ||
    practice.domainId !== "6.RP" ||
    !Array.isArray(practice.assessedStandardIds) ||
    stableJson(practice.assessedStandardIds) !== stableJson(["6.RP.3"]) ||
    !Array.isArray(practice.prerequisiteStandardIds) ||
    stableJson(practice.prerequisiteStandardIds) !== stableJson(["6.RP.1"]) ||
    !Array.isArray(practice.notDirectlyAssessedStandardIds) ||
    stableJson(practice.notDirectlyAssessedStandardIds) !== stableJson(["6.RP.2"]) ||
    practice.answer !== "12 cups" ||
    stableJson(practice.acceptedAnswers) !== stableJson(["12", "12 cups"]) ||
    practice.validation?.numericOracle !== 12 ||
    practice.validation?.ratioOrderPreserved !== true ||
    !practice.solutionSteps.includes("Compute the scale factor: 20 ÷ 5 = 4.") ||
    !practice.solutionSteps.includes("Scale the oats by the same factor: 3 × 4 = 12.")
  ) {
    throw new PromotionGateError("V2_PRACTICE_MATH_INVALID", "Practice math or standards semantics are invalid.");
  }
  const answerAssertions = [
    ["12", true],
    ["12 cups", true],
    [" 12 ", true],
    ["12.0", false],
    ["twelve", false],
    ["about 12", false],
    ["12 CUPS", false]
  ].map(([submitted, expected]) => ({
    submitted,
    expected,
    observed: evaluateV2AcceptedAnswer(practice, submitted)
  }));
  if (answerAssertions.some(({ expected, observed }) => expected !== observed)) {
    throw new PromotionGateError("V2_ACCEPTED_ANSWER_POLICY_INVALID", "Accepted-answer rules are not exact.");
  }
  if (
    lesson.schemaVersion !== "promotion-lesson.v2" ||
    lesson.domainId !== "6.RP" ||
    !Array.isArray(lesson.assessedStandardIds) ||
    stableJson(lesson.assessedStandardIds) !== stableJson(["6.RP.3"]) ||
    lesson.workedExample?.practiceItemId !== practice.id ||
    lesson.workedExample?.prompt?.en !== practice.prompt?.en ||
    lesson.workedExample?.answer !== practice.answer ||
    !lesson.workedExample?.reasoningSteps?.includes("20 ÷ 5 = 4, so the fruit amount is scaled by 4.") ||
    !lesson.workedExample?.reasoningSteps?.includes("3 × 4 = 12, so the oats amount is 12 cups.") ||
    lesson.guidedPractice?.expectedAnswer !== "8 cups" ||
    lesson.independentPractice?.expectedAnswer !== "12 centimeters" ||
    lesson.independentPractice?.rubric?.length !== 3
  ) {
    throw new PromotionGateError("V2_LESSON_ALIGNMENT_INVALID", "Lesson sequence does not align with the practice record.");
  }
  const remediationTargets = lesson.remediation?.map(({ targetMisconception }) => targetMisconception);
  if (stableJson(remediationTargets) !== stableJson(["ratio order reversed", "unit rate not normalized"])) {
    throw new PromotionGateError("V2_LESSON_REMEDIATION_INVALID", "Lesson remediation does not cover both known misconceptions.");
  }
  const prohibitedFieldPattern = /(?:bitmap|image|illustration|asset|svg|plotly|coordinate|formula-overlay|exact-layer)/iu;
  const exactLayerFieldPaths = candidate.records.flatMap(({ value }) => collectObjectKeyPaths(value))
    .filter((fieldPath) => prohibitedFieldPattern.test(fieldPath));
  if (exactLayerFieldPaths.length > 0) {
    throw new PromotionGateError(
      "V2_A24_DISPOSITION_STALE",
      "A24 not_applicable evidence became stale because an exact-layer field appeared."
    );
  }
  const a24 = evidenceByRole.get("A24");
  if (
    a24?.result !== "not_applicable" ||
    a24.semanticPayload?.exactLayerDisposition !== "not-applicable" ||
    a24.semanticPayload?.matchingFieldPaths?.length !== 0 ||
    a24.semanticPayload?.futureChangeInvalidatesEvidence !== true
  ) {
    throw new PromotionGateError("V2_A24_DISPOSITION_MISSING", "A24 exact-layer disposition is invalid.");
  }
  const a18 = evidenceByRole.get("A18")?.semanticPayload;
  const a04 = evidenceByRole.get("A04")?.semanticPayload;
  const a05 = evidenceByRole.get("A05")?.semanticPayload;
  if (
    a18?.independentMath?.numericAnswer !== 12 ||
    a18?.independentMath?.ratioOrderPreserved !== true ||
    a04?.numericOracle !== 12 ||
    a04?.clusterMapping?.sourceCardKind !== "cluster-safe-card-v2" ||
    a04?.clusterMapping?.runtimeCategory !== "standards" ||
    a04?.clusterMapping?.defaultCardKindUsed !== false ||
    a04?.compatibilityMetadata?.runtimeDisposition !== "preserved-outside-runtime" ||
    a05?.workedExampleBinding?.practiceId !== practice.id ||
    a05?.workedExampleBinding?.numericOracle !== 12 ||
    a05?.workedExampleBinding?.ratioOrderPreserved !== true
  ) {
    throw new PromotionGateError("V2_INDEPENDENT_EVIDENCE_CONFLICT", "Independent content evidence does not agree.");
  }
  return {
    schemaVersion: "promotion-content-semantics-proof.v2",
    recordIds: candidate.records.map(({ value }) => value.id),
    grade: "P6",
    clusterId: "6.RP.ratios",
    clusterStandards: expectedClusterStandards,
    directlyAssessedStandards: ["6.RP.3"],
    numericOracle: 12,
    acceptedAnswerAssertions: answerAssertions,
    ratioOrderPreserved: true,
    misconceptionCoverage: remediationTargets,
    localizationStatus: "blocked-for-live",
    exactLayerFieldPaths,
    liveAllowed: false
  };
}

export function buildV2ShadowDtos(candidate) {
  const byKind = new Map(candidate.records.map(({ binding, value }) => [binding.kind, value]));
  const safeCard = byKind.get("safe-card");
  const practice = byKind.get("practice");
  const lesson = byKind.get("lesson");
  const localizationBoundary = {
    presentLocales: ["en"],
    missingLiveLocales: ["zh", "zhHans"],
    adapterMayInventMissingLocales: false,
    liveDisposition: "blocked"
  };
  const compatibilityMetadata = {
    domainIds: [...safeCard.domainIds],
    maisDomainIds: [...safeCard.maisDomainIds],
    canonicalStandardIds: [...safeCard.canonicalStandardIds],
    maisStandardIds: [...safeCard.maisStandardIds],
    clusterId: safeCard.clusterId,
    runtimeDisposition: "preserved-outside-runtime"
  };
  const outputs = [
    {
      path: "cluster-safe-card.shadow.json",
      dto: {
        schemaVersion: "shadow-standards-dto.v2",
        sourceSchemaVersion: safeCard.schemaVersion,
        id: safeCard.id,
        category: "standards",
        mappingMode: "explicit-shadow-only",
        grade: safeCard.grade,
        title: safeCard.domainTitle,
        summary: safeCard.safeSummary,
        standards: [...safeCard.canonicalStandardIds],
        compatibilityMetadata,
        localizationBoundary,
        liveAllowed: false
      }
    },
    {
      path: "practice.shadow.json",
      dto: {
        schemaVersion: "shadow-practice-dto.v2",
        id: practice.id,
        grade: practice.grade,
        prompt: practice.prompt,
        answer: practice.answer,
        acceptedAnswers: [...practice.acceptedAnswers],
        acceptedAnswerPolicy: practice.acceptedAnswerPolicy,
        solutionSteps: [...practice.solutionSteps],
        misconceptionFeedback: practice.misconceptionFeedback,
        assessedStandardIds: [...practice.assessedStandardIds],
        prerequisiteStandardIds: [...practice.prerequisiteStandardIds],
        compatibilityMetadata,
        localizationBoundary,
        liveAllowed: false
      }
    },
    {
      path: "lesson.shadow.json",
      dto: {
        schemaVersion: "shadow-lesson-dto.v2",
        id: lesson.id,
        grade: lesson.grade,
        title: lesson.title,
        objective: lesson.objective,
        prerequisiteCheck: lesson.prerequisiteCheck,
        conceptExplanation: lesson.conceptExplanation,
        workedExample: lesson.workedExample,
        guidedPractice: lesson.guidedPractice,
        independentPractice: lesson.independentPractice,
        remediation: lesson.remediation,
        assessedStandardIds: [...lesson.assessedStandardIds],
        prerequisiteStandardIds: [...lesson.prerequisiteStandardIds],
        compatibilityMetadata,
        localizationBoundary,
        liveAllowed: false
      }
    },
    {
      path: "compatibility-report.shadow.json",
      dto: {
        schemaVersion: "shadow-compatibility-report.v2",
        promotionUnitId: PROMOTION_V2_CANDIDATE.promotionUnitId,
        explicitMappings: [
          {
            sourceSchemaVersion: "cluster-safe-card-v2",
            targetCategory: "standards",
            mode: "explicit-shadow-only"
          }
        ],
        preservedOutsideRuntime: [
          "domainIds",
          "maisDomainIds",
          "canonicalStandardIds",
          "maisStandardIds",
          "clusterId",
          "localizationBoundary",
          "prerequisiteCheck",
          "conceptExplanation"
        ],
        incompatible: [],
        defaultsUsed: [],
        liveBlockers: ["missing-zh-localization", "missing-zhHans-localization", "live-integration-unproven"],
        liveAllowed: false
      }
    }
  ];
  if (outputs.some(({ dto }) => dto.liveAllowed !== false)) {
    throw new PromotionGateError("V2_LIVE_AUTHORIZATION_FORBIDDEN", "Shadow DTOs may never authorize live use.");
  }
  return outputs;
}

export function projectV2RuntimePolicy(observation) {
  return {
    coveredFileCount: observation.rawObservation.coveredFileCount,
    coveredFilesDigest: observation.rawObservation.coveredFilesDigest,
    classificationsDigest: fingerprint(observation.classifications),
    frameworkEntrypointCount: observation.frameworkEntrypoints.length,
    seedCount: observation.graphPolicy.seedCount,
    reachablePathCount: observation.graphPolicy.reachablePathCount,
    reachablePathsDigest: observation.graphPolicy.reachablePathsDigest,
    edgeCount: observation.graphPolicy.edgeCount,
    edgeDigest: observation.graphPolicy.edgeDigest,
    topologyEdgeCount: observation.graphPolicy.topologyEdgeCount,
    topologyEdgeDigest: observation.graphPolicy.topologyEdgeDigest,
    nextDynamicCallCount: observation.loaderPolicy.nextDynamic.callCount,
    nextDynamicLiteralImportCount: observation.loaderPolicy.nextDynamic.literalImportCount,
    nextDynamicNonliteralImportCount: observation.loaderPolicy.nextDynamic.nonliteralImportCount,
    nextDynamicCallsiteDigest: observation.loaderPolicy.nextDynamic.callsiteDigest,
    fsReadAllowlistCount: observation.loaderPolicy.fsReadAllowlist.length,
    fsReadAllowlistDigest: observation.loaderPolicy.fsReadAllowlistDigest,
    zeroBaselineCallCount: observation.loaderPolicy.zeroBaselineCallCount
  };
}

function validateLegacyCandidateBinding(candidate, label) {
  assertExactKeys(
    candidate,
    ["path", "rawSha256", "packageId", "containerKeys", "idCount", "idSetDigest"],
    `${label}.candidate`
  );
  assertSafeRepoRelativePath(candidate.path);
  assertSha256(candidate.rawSha256, `${label}.candidate.rawSha256`);
  if (candidate.packageId !== null) assertNonEmptyString(candidate.packageId, `${label}.candidate.packageId`);
  if (!Array.isArray(candidate.containerKeys) || candidate.containerKeys.length === 0) {
    throw new PromotionGateError("V2_LEGACY_REGISTRY_INVALID", `${label} has no candidate container keys.`);
  }
  assertUniqueCanonicalStrings(candidate.containerKeys, `${label}.candidate.containerKeys`);
  if (!Number.isSafeInteger(candidate.idCount) || candidate.idCount <= 0) {
    throw new PromotionGateError("V2_LEGACY_REGISTRY_INVALID", `${label} candidate idCount is invalid.`);
  }
  assertSha256(candidate.idSetDigest, `${label}.candidate.idSetDigest`);
}

function validateLegacyLiveProjection(projection, label) {
  assertExactKeys(
    projection,
    ["path", "rawSha256", "packageId", "containerKeys", "idCount", "idSetDigest"],
    `${label}.liveProjection`
  );
  assertSafeRepoRelativePath(projection.path);
  assertSha256(projection.rawSha256, `${label}.liveProjection.rawSha256`);
  if (projection.packageId !== null) assertNonEmptyString(projection.packageId, `${label}.liveProjection.packageId`);
  assertUniqueCanonicalStrings(projection.containerKeys, `${label}.liveProjection.containerKeys`);
  if (!Number.isSafeInteger(projection.idCount) || projection.idCount <= 0) {
    throw new PromotionGateError("V2_LEGACY_REGISTRY_INVALID", `${label} live projection idCount is invalid.`);
  }
  assertSha256(projection.idSetDigest, `${label}.liveProjection.idSetDigest`);
}

function validateLegacyResolutionRegistry(registry, manifest) {
  assertExactKeys(
    registry,
    [
      "schemaVersion",
      "observerVersion",
      "targetBaselineCommit",
      "expectedCanonicalAudit",
      "ratchet",
      "resolutions"
    ],
    "legacy resolution registry"
  );
  if (
    registry.schemaVersion !== PROMOTION_V2_LEGACY_REGISTRY_SCHEMA ||
    registry.observerVersion !== "promotion-legacy-resolution-observer.v2" ||
    registry.targetBaselineCommit !== manifest.targetBaselineCommit
  ) {
    throw new PromotionGateError("V2_LEGACY_REGISTRY_INVALID", "Legacy registry metadata is invalid.");
  }
  assertCommit(registry.targetBaselineCommit, "legacy registry targetBaselineCommit");
  assertExactKeys(
    registry.ratchet,
    [
      "originalPackageId",
      "introducedAt",
      "expiresAt",
      "closedAt",
      "terminalDecision",
      "activeExceptions",
      "remediationOwners",
      "reviewOwners"
    ],
    "legacy ratchet closure"
  );
  const introduced = Date.parse(registry.ratchet.introducedAt);
  const expires = Date.parse(registry.ratchet.expiresAt);
  const closed = Date.parse(registry.ratchet.closedAt);
  if (
    registry.ratchet.originalPackageId !== "us-ca-k5-knowledge-point-practice-v1" ||
    !Number.isFinite(introduced) ||
    !Number.isFinite(expires) ||
    !Number.isFinite(closed) ||
    expires - introduced > 30 * 24 * 60 * 60 * 1000 ||
    expires <= introduced ||
    closed > expires ||
    registry.ratchet.terminalDecision !== "remove-live" ||
    stableJson(registry.ratchet.activeExceptions) !== stableJson([]) ||
    stableJson(registry.ratchet.remediationOwners) !== stableJson(["A04", "A18", "A23", "A11", "A22"]) ||
    stableJson(registry.ratchet.reviewOwners) !== stableJson(["A23", "A25"])
  ) {
    throw new PromotionGateError("V2_LEGACY_RATCHET_INVALID", "The 30-day legacy ratchet is not closed correctly.");
  }
  if (!Array.isArray(registry.resolutions) || registry.resolutions.length !== 18) {
    throw new PromotionGateError("V2_LEGACY_REGISTRY_INVALID", "Legacy registry must dispose exactly 18 historical conflicts.");
  }
  const ids = new Set();
  const candidatePaths = new Set();
  let approvedCount = 0;
  let dereachedCount = 0;
  for (const [index, resolution] of registry.resolutions.entries()) {
    const label = `legacy resolutions[${index}]`;
    assertExactKeys(
      resolution,
      [
        "resolutionId",
        "historicalClass",
        "decision",
        "candidate",
        "liveProjection",
        "approvalReferences",
        "resolutionCommits",
        "enforcement"
      ],
      label
    );
    assertNonEmptyString(resolution.resolutionId, `${label}.resolutionId`);
    if (ids.has(resolution.resolutionId)) {
      throw new PromotionGateError("V2_LEGACY_REGISTRY_INVALID", "Legacy resolution ids must be unique.");
    }
    ids.add(resolution.resolutionId);
    if (!new Set(["new", "opaque", "known", "approved-projection"]).has(resolution.historicalClass)) {
      throw new PromotionGateError("V2_LEGACY_REGISTRY_INVALID", `${label} historical class is invalid.`);
    }
    validateLegacyCandidateBinding(resolution.candidate, label);
    const foldedPath = resolution.candidate.path.toLocaleLowerCase("en-US");
    if (candidatePaths.has(foldedPath)) {
      throw new PromotionGateError("V2_LEGACY_REGISTRY_INVALID", "Legacy candidate paths must be unique.");
    }
    candidatePaths.add(foldedPath);
    if (!Array.isArray(resolution.approvalReferences) || !Array.isArray(resolution.resolutionCommits)) {
      throw new PromotionGateError("V2_LEGACY_REGISTRY_INVALID", `${label} references must be arrays.`);
    }
    for (const [referenceIndex, reference] of resolution.approvalReferences.entries()) {
      assertExactKeys(reference, ["path", "rawSha256", "decision"], `${label}.approvalReferences[${referenceIndex}]`);
      assertSafeRepoRelativePath(reference.path);
      assertSha256(reference.rawSha256, `${label}.approvalReferences[${referenceIndex}].rawSha256`);
      assertNonEmptyString(reference.decision, `${label}.approvalReferences[${referenceIndex}].decision`);
    }
    resolution.resolutionCommits.forEach((commit, commitIndex) => assertCommit(commit, `${label}.resolutionCommits[${commitIndex}]`));
    assertExactKeys(
      resolution.enforcement,
      ["candidateMustBeUnreachable", "liveProjectionMustBeReachable", "liveAllowed"],
      `${label}.enforcement`
    );
    if (resolution.enforcement.candidateMustBeUnreachable !== true || resolution.enforcement.liveAllowed !== false) {
      throw new PromotionGateError("V2_LEGACY_REGISTRY_INVALID", `${label} weakens non-live enforcement.`);
    }
    if (resolution.decision === "approved-projection") {
      approvedCount += 1;
      if (
        resolution.historicalClass !== "approved-projection" ||
        !isPlainObject(resolution.liveProjection) ||
        resolution.enforcement.liveProjectionMustBeReachable !== true ||
        resolution.approvalReferences.length === 0
      ) {
        throw new PromotionGateError("V2_LEGACY_REGISTRY_INVALID", `${label} approved projection is incomplete.`);
      }
      validateLegacyLiveProjection(resolution.liveProjection, label);
    } else if (resolution.decision === "de-reached") {
      dereachedCount += 1;
      if (
        resolution.liveProjection !== null ||
        resolution.enforcement.liveProjectionMustBeReachable !== false ||
        resolution.approvalReferences.length !== 0 ||
        resolution.resolutionCommits.length === 0
      ) {
        throw new PromotionGateError("V2_LEGACY_REGISTRY_INVALID", `${label} de-reach record is incomplete.`);
      }
    } else {
      throw new PromotionGateError("V2_LEGACY_REGISTRY_INVALID", `${label} has an unknown decision.`);
    }
  }
  if (approvedCount !== 3 || dereachedCount !== 15) {
    throw new PromotionGateError("V2_LEGACY_REGISTRY_INVALID", "Legacy registry must contain 3 approved and 15 de-reached records.");
  }
  const known = registry.resolutions.find(({ historicalClass }) => historicalClass === "known");
  const opaque = registry.resolutions.filter(({ historicalClass }) => historicalClass === "opaque");
  if (
    known?.candidate.path !== "data/generated-content/us-ca-k5-knowledge-point-practice-v1/question-pack.json" ||
    known?.decision !== "de-reached" ||
    opaque.length !== 1 ||
    opaque[0].candidate.path !== "coordination/content-qa/us-ca-adaptive-k-g5-beta-seed-v1/question-pack.json" ||
    opaque[0].decision !== "de-reached"
  ) {
    throw new PromotionGateError("V2_LEGACY_RATCHET_INVALID", "Known and opaque legacy conflicts are not terminally disposed.");
  }
  return registry;
}

async function assertReferenceBytes(repoRoot, reference, code, label) {
  const loaded = await readAuthoritativeFile(repoRoot, reference.path);
  if (loaded.rawSha256 !== reference.rawSha256) {
    throw new PromotionGateError(code, `${label} bytes drifted.`, { pathDigest: fingerprint(reference.path) });
  }
  return loaded;
}

export async function collectV2RuntimeAndLegacyProof(repoRoot, manifest, executionCommit) {
  const compatibilityLoaded = await readCanonicalJson(
    repoRoot,
    manifest.liveReachability.compatibilityManifestPath,
    "V2_COMPATIBILITY_MANIFEST_JSON_INVALID",
    "v1 compatibility manifest"
  );
  if (compatibilityLoaded.rawSha256 !== manifest.liveReachability.compatibilityManifestRawSha256) {
    throw new PromotionGateError("V2_COMPATIBILITY_MANIFEST_DIGEST_MISMATCH", "Compatibility manifest bytes drifted.");
  }
  const runtimeObservation = await observeCanonicalRuntimePolicy(repoRoot, compatibilityLoaded.value);
  const runtimePolicy = projectV2RuntimePolicy(runtimeObservation);
  if (stableJson(runtimePolicy) !== stableJson(manifest.liveReachability.expectedRuntimePolicy)) {
    throw new PromotionGateError(
      "V2_RUNTIME_GRAPH_DRIFT",
      "The complete live runtime graph differs from the frozen v2 policy.",
      { observedPolicyDigest: fingerprint(runtimePolicy) },
      "blocked"
    );
  }
  if (
    runtimePolicy.nextDynamicNonliteralImportCount !== 0 ||
    runtimePolicy.zeroBaselineCallCount !== 0
  ) {
    throw new PromotionGateError(
      "V2_RUNTIME_SCAN_INCOMPLETE",
      "An unresolved dynamic import or unregistered runtime loader creates a live scan blind spot.",
      {},
      "blocked"
    );
  }
  const registryLoaded = await readCanonicalJson(
    repoRoot,
    manifest.legacyResolution.registryPath,
    "V2_LEGACY_REGISTRY_JSON_INVALID",
    "legacy resolution registry"
  );
  if (registryLoaded.rawSha256 !== manifest.legacyResolution.rawSha256) {
    throw new PromotionGateError("V2_LEGACY_REGISTRY_DIGEST_MISMATCH", "Legacy resolution registry bytes drifted.");
  }
  const registry = validateLegacyResolutionRegistry(registryLoaded.value, manifest);
  const canonicalAudit = await auditCanonicalLegacyConflictUnion(repoRoot, compatibilityLoaded.value);
  if (stableJson(canonicalAudit) !== stableJson(registry.expectedCanonicalAudit)) {
    throw new PromotionGateError(
      "V2_LEGACY_CONFLICT_DRIFT",
      "A legacy candidate/live conflict was added, removed, or changed outside the resolution registry.",
      { observedAuditDigest: canonicalAudit.auditDigest },
      "fail"
    );
  }
  const reachablePaths = [...runtimeObservation.graph.reachablePaths].sort(codePointCompare);
  const reachableSet = new Set(reachablePaths);
  const searchableRuntimeSources = [];
  for (const runtimePath of reachablePaths) {
    if (!/\.(?:[cm]?[jt]sx?|json)$/u.test(runtimePath)) continue;
    const loaded = await readAuthoritativeFile(repoRoot, runtimePath);
    searchableRuntimeSources.push({ path: runtimePath, text: loaded.bytes.toString("utf8") });
  }
  const resolutionProofs = [];
  for (const resolution of registry.resolutions) {
    const candidateLoaded = await assertReferenceBytes(
      repoRoot,
      resolution.candidate,
      "V2_LEGACY_CANDIDATE_DRIFT",
      "Legacy candidate"
    );
    const candidateValue = parseCanonicalJsonBytes(
      candidateLoaded.bytes,
      "V2_LEGACY_CANDIDATE_JSON_INVALID",
      "legacy candidate"
    );
    const profile = inspectLegacyCandidateDocument(candidateValue).contentProfile;
    if (
      profile === null ||
      profile.packageId !== resolution.candidate.packageId ||
      stableJson(profile.containerKeys) !== stableJson(resolution.candidate.containerKeys) ||
      profile.idCount !== resolution.candidate.idCount ||
      profile.idSetDigest !== resolution.candidate.idSetDigest
    ) {
      throw new PromotionGateError("V2_LEGACY_CANDIDATE_DRIFT", "Legacy candidate semantic identity drifted.");
    }
    if (reachableSet.has(resolution.candidate.path)) {
      throw new PromotionGateError("V2_LEGACY_CANDIDATE_REACHABLE", "A candidate artifact is directly reachable from live code.");
    }
    const needles = [resolution.candidate.path, resolution.candidate.packageId].filter(Boolean);
    const correlatedSources = searchableRuntimeSources
      .filter(({ text: source }) => needles.some((needle) => source.includes(needle)))
      .map(({ path: sourcePath }) => sourcePath)
      .sort(codePointCompare);
    if (resolution.decision === "de-reached" && correlatedSources.length > 0) {
      throw new PromotionGateError(
        "V2_LEGACY_DEREACH_FAILED",
        "A de-reached candidate remains textually correlated from the live runtime graph.",
        { correlatedSourceCount: correlatedSources.length, correlatedSourcesDigest: fingerprint(correlatedSources) },
        "fail"
      );
    }
    let liveProjectionProof = null;
    if (resolution.decision === "approved-projection") {
      if (!reachableSet.has(resolution.liveProjection.path)) {
        throw new PromotionGateError("V2_APPROVED_PROJECTION_UNREACHABLE", "Approved projection is no longer live-reachable.");
      }
      const liveLoaded = await assertReferenceBytes(
        repoRoot,
        resolution.liveProjection,
        "V2_APPROVED_PROJECTION_DRIFT",
        "Approved live projection"
      );
      const liveValue = parseCanonicalJsonBytes(
        liveLoaded.bytes,
        "V2_APPROVED_PROJECTION_JSON_INVALID",
        "approved live projection"
      );
      const liveProfile = inspectLegacyCandidateDocument(liveValue).contentProfile;
      if (
        liveProfile === null ||
        liveProfile.packageId !== resolution.liveProjection.packageId ||
        stableJson(liveProfile.containerKeys) !== stableJson(resolution.liveProjection.containerKeys) ||
        liveProfile.idCount !== resolution.liveProjection.idCount ||
        liveProfile.idSetDigest !== resolution.liveProjection.idSetDigest ||
        liveProfile.idSetDigest !== profile.idSetDigest
      ) {
        throw new PromotionGateError("V2_APPROVED_PROJECTION_DRIFT", "Approved projection no longer matches its candidate identity.");
      }
      for (const reference of resolution.approvalReferences) {
        await assertReferenceBytes(repoRoot, reference, "V2_APPROVAL_REFERENCE_DRIFT", "Approval reference");
      }
      liveProjectionProof = {
        path: resolution.liveProjection.path,
        rawSha256: resolution.liveProjection.rawSha256,
        reachable: true,
        idSetDigest: liveProfile.idSetDigest,
        approvalReferenceDigest: fingerprint(resolution.approvalReferences)
      };
    }
    for (const commit of resolution.resolutionCommits) {
      await assertAncestor(repoRoot, commit, executionCommit, `legacy resolution ${resolution.resolutionId}`);
    }
    resolutionProofs.push({
      resolutionId: resolution.resolutionId,
      historicalClass: resolution.historicalClass,
      decision: resolution.decision,
      candidatePath: resolution.candidate.path,
      candidateRawSha256: resolution.candidate.rawSha256,
      candidateReachable: false,
      correlatedSourceCount: correlatedSources.length,
      liveProjection: liveProjectionProof,
      resolutionCommitsDigest: fingerprint(resolution.resolutionCommits)
    });
  }
  const selectedIdentityNeedles = [
    PROMOTION_V2_CANDIDATE.packageId,
    PROMOTION_V2_CANDIDATE.promotionUnitId,
    ...PROMOTION_V2_CANDIDATE.artifacts.flatMap(({ id, path: artifactPath }) => [id, artifactPath])
  ];
  const selectedReachabilityHits = searchableRuntimeSources.flatMap(({ path: sourcePath, text: source }) =>
    selectedIdentityNeedles.filter((needle) => source.includes(needle)).map((needle) => ({
      sourcePath,
      needleDigest: fingerprint(needle)
    }))
  );
  if (selectedReachabilityHits.length > 0) {
    throw new PromotionGateError(
      "V2_SELECTED_CANDIDATE_LIVE_REACHABLE",
      "A selected v2 candidate identity is reachable from a live entrypoint.",
      { hitCount: selectedReachabilityHits.length, hitDigest: fingerprint(selectedReachabilityHits) },
      "fail"
    );
  }
  return {
    runtimeObservation,
    runtimePolicy,
    reachablePaths,
    canonicalAudit,
    registry,
    proof: {
      schemaVersion: "promotion-runtime-legacy-proof.v2",
      runtimePolicy,
      runtimePolicyDigest: fingerprint(runtimePolicy),
      canonicalAudit,
      canonicalAuditDigest: canonicalAudit.auditDigest,
      legacyRegistryRawSha256: registryLoaded.rawSha256,
      resolutionCount: resolutionProofs.length,
      approvedProjectionCount: resolutionProofs.filter(({ decision }) => decision === "approved-projection").length,
      dereachedCount: resolutionProofs.filter(({ decision }) => decision === "de-reached").length,
      resolutionProofs,
      resolutionProofsDigest: fingerprint(resolutionProofs),
      selectedIdentityNeedleCount: selectedIdentityNeedles.length,
      selectedIdentityHits: 0,
      liveAllowed: false
    }
  };
}

function isPathWithin(candidate, root) {
  const relative = path.relative(root, candidate);
  return relative !== "" && relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

async function assertSafeTempEnvironment(repoRoot) {
  const canonicalRepoRoot = await realpath(repoRoot);
  const variables = ["TMPDIR", "TMP", "TEMP"];
  const candidates = [{ name: "node-os-tmpdir", value: os.tmpdir() }];
  for (const variable of variables) {
    if (Object.hasOwn(process.env, variable) && String(process.env[variable] ?? "") !== "") {
      candidates.push({ name: variable, value: String(process.env[variable]) });
    }
  }
  const proof = [];
  for (const candidate of candidates) {
    if (!path.isAbsolute(candidate.value) || candidate.value.includes("\0")) {
      throw new PromotionGateError(
        "V2_TEMP_ENVIRONMENT_UNSAFE",
        "Temporary environment paths must be absolute and NUL-free.",
        { variableDigest: fingerprint(candidate.name) },
        "blocked"
      );
    }
    const canonical = await realpath(candidate.value);
    const stat = await lstat(canonical);
    if (!stat.isDirectory() || canonical === canonicalRepoRoot || isPathWithin(canonical, canonicalRepoRoot)) {
      throw new PromotionGateError(
        "V2_TEMP_ENVIRONMENT_UNSAFE",
        "Temporary environment points into the repository.",
        { variableDigest: fingerprint(candidate.name) },
        "blocked"
      );
    }
    proof.push({ name: candidate.name, canonicalPathDigest: fingerprint(canonical), outsideRepository: true });
  }
  return proof;
}

export async function collectV2ExternalSideEffectProof(repoRoot, manifest) {
  const forbiddenResolverEnvironment = ["NEXT_TSCONFIG_PATH", "NEXT_DIST_DIR"]
    .filter((name) => Object.hasOwn(process.env, name) && String(process.env[name] ?? "") !== "");
  if (forbiddenResolverEnvironment.length > 0) {
    throw new PromotionGateError(
      "V2_EXECUTION_ENVIRONMENT_UNSAFE",
      "Resolver-affecting environment variables must be unset.",
      { variableDigests: forbiddenResolverEnvironment.map(fingerprint) },
      "blocked"
    );
  }
  const tempEnvironment = await assertSafeTempEnvironment(repoRoot);
  const scannedPaths = [
    "coordination/integration/v2/promotion-gate-v2-lib.mjs",
    "coordination/integration/v2/promotion-gate-v2.mjs"
  ];
  const sourceBindings = [];
  const forbiddenImports = [];
  const forbiddenCallsites = [];
  for (const sourcePath of scannedPaths) {
    const loaded = await readAuthoritativeFile(repoRoot, sourcePath);
    const source = loaded.bytes.toString("utf8");
    sourceBindings.push({ path: sourcePath, rawSha256: loaded.rawSha256 });
    const importPattern = /(?:from\s+|import\s*\(|require\s*\()\s*["']([^"']+)["']/gu;
    for (const match of source.matchAll(importPattern)) {
      const specifier = match[1];
      if (
        /^(?:node:)?(?:http|https|net|tls|dns|dgram|cluster|worker_threads)$/u.test(specifier) ||
        /^(?:undici|vercel|@vercel\/|openai|@anthropic-ai\/|@prisma\/|prisma|pg|postgres|mysql|mongodb|firebase|@supabase\/)/u.test(specifier)
      ) {
        forbiddenImports.push({ sourcePath, specifier });
      }
    }
    const callPattern = /\b(?:fetch|exec|execSync|spawn|spawnSync|fork)\s*\(/gu;
    for (const match of source.matchAll(callPattern)) {
      forbiddenCallsites.push({ sourcePath, offset: match.index, callee: match[0].replace(/\s*\($/u, "") });
    }
    const shellOptionPattern = new RegExp("\\bshell\\s*:\\s*true\\b", "u");
    if (shellOptionPattern.test(source)) {
      forbiddenCallsites.push({ sourcePath, offset: source.search(shellOptionPattern), callee: "enabled-shell-option" });
    }
  }
  if (forbiddenImports.length > 0 || forbiddenCallsites.length > 0) {
    throw new PromotionGateError(
      "V2_FORBIDDEN_CAPABILITY",
      "Checker source contains an unregistered network, provider, deployment, or shell capability.",
      {
        forbiddenImportDigest: fingerprint(forbiddenImports),
        forbiddenCallsiteDigest: fingerprint(forbiddenCallsites)
      },
      "blocked"
    );
  }
  const payload = {
    schemaVersion: "promotion-external-side-effect-proof.v2",
    policy: "read-only-git-local-temp-only.v2",
    checkerBundleDigest: manifest.checkerRelease.bundleDigest,
    registeredOperations: [
      "read-authoritative-repository-file",
      "read-only-git-probe",
      "create-new-os-temp-root",
      "write-shadow-json-exclusively",
      "remove-owned-os-temp-root"
    ],
    sourceBindings,
    sourceBindingsDigest: fingerprint(sourceBindings),
    tempEnvironment,
    networkRequestCount: 0,
    providerCallCount: 0,
    databaseWriteCount: 0,
    deploymentCommandCount: 0,
    productionWriteCount: 0,
    liveRegistryWriteCount: 0
  };
  return { ...payload, digest: fingerprint(payload) };
}

async function createOwnedTempRoot(repoRoot, requestedRoot = null) {
  await assertSafeTempEnvironment(repoRoot);
  const canonicalRepoRoot = await realpath(repoRoot);
  const canonicalOsTemp = await realpath(os.tmpdir());
  let createdRoot;
  if (requestedRoot === null) {
    createdRoot = await mkdtemp(path.join(canonicalOsTemp, "promotion-shadow-v2-"));
  } else {
    if (!path.isAbsolute(requestedRoot) || requestedRoot.includes("\0")) {
      throw new PromotionGateError("V2_TEMP_ROOT_UNSAFE", "Requested temp root must be an absolute NUL-free path.");
    }
    const parent = await realpath(path.dirname(requestedRoot));
    if (parent !== canonicalOsTemp || !path.basename(requestedRoot).startsWith("promotion-shadow-v2-")) {
      throw new PromotionGateError("V2_TEMP_ROOT_UNSAFE", "Requested temp root must be a direct registered OS-temp child.");
    }
    try {
      await mkdir(requestedRoot, { recursive: false });
    } catch (error) {
      throw new PromotionGateError(
        "V2_TEMP_ROOT_CREATION_COLLISION",
        "Shadow temp-root preimage was not absent.",
        { causeCode: error?.code ?? "unknown" }
      );
    }
    createdRoot = requestedRoot;
  }
  const canonicalCreatedRoot = await realpath(createdRoot);
  if (
    !isPathWithin(canonicalCreatedRoot, canonicalOsTemp) ||
    canonicalCreatedRoot === canonicalRepoRoot ||
    isPathWithin(canonicalCreatedRoot, canonicalRepoRoot)
  ) {
    throw new PromotionGateError("V2_TEMP_ROOT_UNSAFE", "Shadow temp root escaped its isolation boundary.");
  }
  return canonicalCreatedRoot;
}

async function writeShadowOutputsExclusive(tempRoot, outputs) {
  const foldedPaths = new Set();
  const fileProofs = [];
  for (const { path: outputPath, dto } of outputs) {
    assertSafeRepoRelativePath(outputPath);
    const folded = outputPath.toLocaleLowerCase("en-US");
    if (foldedPaths.has(folded)) {
      throw new PromotionGateError("V2_OUTPUT_PATH_COLLISION", "Shadow output paths contain a case collision.");
    }
    foldedPaths.add(folded);
    const absolute = path.resolve(tempRoot, ...outputPath.split("/"));
    if (!isPathWithin(absolute, tempRoot)) {
      throw new PromotionGateError("V2_OUTPUT_PATH_ESCAPE", "Shadow output path escaped the owned temp root.");
    }
    const bytes = Buffer.from(`${stableJson(dto)}\n`, "utf8");
    try {
      await writeFile(absolute, bytes, { flag: "wx", mode: 0o600 });
    } catch (error) {
      throw new PromotionGateError(
        "V2_OUTPUT_CREATION_COLLISION",
        "Shadow output creation was not exclusive.",
        { causeCode: error?.code ?? "unknown" }
      );
    }
    const entry = await lstat(absolute);
    const canonical = await realpath(absolute);
    if (!entry.isFile() || !isPathWithin(canonical, tempRoot)) {
      throw new PromotionGateError("V2_OUTPUT_PATH_ESCAPE", "Shadow output is not a regular file inside the temp root.");
    }
    const observedBytes = await readFile(canonical);
    fileProofs.push({
      path: outputPath,
      schemaVersion: dto.schemaVersion,
      rawSha256: sha256(observedBytes),
      semanticDigest: fingerprint(dto),
      bytes: observedBytes.byteLength
    });
  }
  return {
    files: fileProofs,
    aggregateDigest: fingerprint(fileProofs),
    semanticAggregateDigest: fingerprint(outputs.map(({ path: outputPath, dto }) => ({
      path: outputPath,
      semanticDigest: fingerprint(dto)
    })))
  };
}

async function rollbackOwnedTempRoot(tempRoot) {
  const canonicalOsTemp = await realpath(os.tmpdir());
  if (
    path.dirname(tempRoot) !== canonicalOsTemp ||
    !path.basename(tempRoot).startsWith("promotion-shadow-v2-")
  ) {
    throw new PromotionGateError("V2_ROLLBACK_TARGET_UNSAFE", "Rollback target is not an owned v2 temp root.");
  }
  await rm(tempRoot, { recursive: true, force: false, maxRetries: 0 });
  let absent = false;
  try {
    await access(tempRoot, fsConstants.F_OK);
  } catch (error) {
    absent = error?.code === "ENOENT";
  }
  if (!absent) {
    throw new PromotionGateError("V2_ROLLBACK_INCOMPLETE", "Rollback did not restore the absent preimage.");
  }
  return {
    schemaVersion: "promotion-rollback-proof.v2",
    strategy: "remove-new-isolated-temp-root",
    preimage: "absent",
    postimage: "absent",
    exactPreimageRestored: true
  };
}

export async function rehearseV2ShadowOutputs(repoRoot, outputs, { tempRoot = null } = {}) {
  let ownedRoot = null;
  let outputProof = null;
  try {
    ownedRoot = await createOwnedTempRoot(repoRoot, tempRoot);
    outputProof = await writeShadowOutputsExclusive(ownedRoot, outputs);
    const rollbackProof = await rollbackOwnedTempRoot(ownedRoot);
    ownedRoot = null;
    return {
      outputProof,
      rollbackProof,
      isolationProof: {
        schemaVersion: "promotion-output-isolation-proof.v2",
        rootPolicy: "new-os-temp-root-outside-repository-only",
        outputCount: outputProof.files.length,
        allOutputsExclusive: true,
        allOutputsRegularFiles: true,
        repositoryWriteCount: 0
      }
    };
  } finally {
    if (ownedRoot !== null) {
      try {
        await rollbackOwnedTempRoot(ownedRoot);
      } catch {
        // Preserve the original fail-closed error. A dedicated rollback test covers this path.
      }
    }
  }
}

function attachDigest(value) {
  return { ...value, digest: fingerprint(value) };
}

function createCheck(id, result, details) {
  return attachDigest({ id, result, details });
}

function semanticExternalSideEffectProjection(proof) {
  if (!isPlainObject(proof)) return proof;
  const { digest: _rawDigest, tempEnvironment, ...stableProof } = proof;
  const normalized = {
    ...stableProof,
    tempEnvironment: {
      observed: Array.isArray(tempEnvironment) && tempEnvironment.length > 0,
      allOutsideRepository:
        Array.isArray(tempEnvironment) &&
        tempEnvironment.length > 0 &&
        tempEnvironment.every((entry) => isPlainObject(entry) && entry.outsideRepository === true)
    }
  };
  return { ...normalized, digest: fingerprint(normalized) };
}

function semanticChecksProjection(checks, externalSideEffectProof) {
  if (!Array.isArray(checks)) return checks;
  return checks.map((check) => {
    if (!isPlainObject(check) || check.id !== "external-side-effects-v2") return check;
    const { digest: _rawDigest, ...withoutDigest } = check;
    const normalized = {
      ...withoutDigest,
      details: isPlainObject(check.details)
        ? { ...check.details, proofDigest: externalSideEffectProof?.digest ?? check.details.proofDigest }
        : check.details
    };
    return { ...normalized, digest: fingerprint(normalized) };
  });
}

function receiptSemanticProjection(receiptWithoutDigests) {
  const externalSideEffectProof = semanticExternalSideEffectProjection(
    receiptWithoutDigests.externalSideEffectProof
  );
  const projection = {
    ...receiptWithoutDigests,
    run: {
      ...receiptWithoutDigests.run,
      runId: null,
      producedAt: null,
      ciMetadata: null
    }
  };
  if (Object.hasOwn(receiptWithoutDigests, "externalSideEffectProof")) {
    projection.externalSideEffectProof = externalSideEffectProof;
  }
  if (Object.hasOwn(receiptWithoutDigests, "checks")) {
    projection.checks = semanticChecksProjection(receiptWithoutDigests.checks, externalSideEffectProof);
  }
  return projection;
}

export function attachV2ReceiptDigests(receiptWithoutDigests) {
  const semanticReceiptDigest = fingerprint(receiptSemanticProjection(receiptWithoutDigests));
  const rawReceiptDigest = fingerprint({ ...receiptWithoutDigests, semanticReceiptDigest });
  return { ...receiptWithoutDigests, semanticReceiptDigest, rawReceiptDigest };
}

export function validateV2ReceiptStructure(receipt) {
  assertExactKeys(
    receipt,
    [
      "schemaVersion",
      "manifest",
      "run",
      "mode",
      "result",
      "exitReasons",
      "binding",
      "worktreeProof",
      "provenanceProof",
      "baselineProof",
      "checkerReleaseProof",
      "evidenceProof",
      "contentProof",
      "candidateSourceProof",
      "shadowOutputProof",
      "compatibilityReportDigest",
      "runtimeAndLegacyProof",
      "liveReachabilityProof",
      "forbiddenPathDiff",
      "externalSideEffectProof",
      "rollbackProof",
      "checks",
      "lifecycle",
      "unmetConditions",
      "semanticReceiptDigest",
      "rawReceiptDigest"
    ],
    "v2 receipt"
  );
  if (receipt.schemaVersion !== PROMOTION_V2_RECEIPT_SCHEMA) {
    throw new PromotionGateError("V2_RECEIPT_SCHEMA_UNSUPPORTED", "Unsupported v2 receipt schema.");
  }
  if (receipt.mode !== "shadow" || !new Set(["pass", "fail", "blocked"]).has(receipt.result)) {
    throw new PromotionGateError("V2_RECEIPT_RESULT_INVALID", "Receipt mode or result is invalid.");
  }
  assertExactKeys(receipt.manifest, ["path", "rawSha256"], "receipt manifest");
  assertSafeRepoRelativePath(receipt.manifest.path);
  assertSha256(receipt.manifest.rawSha256, "receipt manifest rawSha256");
  assertExactKeys(receipt.run, ["runId", "producedAt", "ciMetadata"], "receipt run");
  if (!RUN_ID_PATTERN.test(receipt.run.runId) || Number.isNaN(Date.parse(receipt.run.producedAt))) {
    throw new PromotionGateError("V2_RECEIPT_RUN_INVALID", "Receipt run metadata is invalid.");
  }
  assertJsonRoundTrip(receipt.run.ciMetadata, "receipt ciMetadata");
  assertSha256(receipt.semanticReceiptDigest, "semanticReceiptDigest");
  assertSha256(receipt.rawReceiptDigest, "rawReceiptDigest");
  const { semanticReceiptDigest, rawReceiptDigest, ...withoutDigests } = receipt;
  const expected = attachV2ReceiptDigests(withoutDigests);
  if (
    semanticReceiptDigest !== expected.semanticReceiptDigest ||
    rawReceiptDigest !== expected.rawReceiptDigest
  ) {
    throw new PromotionGateError("V2_RECEIPT_DIGEST_INVALID", "Receipt digests are invalid.");
  }
  if (receipt.binding.liveAllowed !== false || receipt.lifecycle.liveAllowed !== false) {
    throw new PromotionGateError("V2_LIVE_AUTHORIZATION_FORBIDDEN", "Receipt may not authorize live use.");
  }
  assertExactKeys(
    receipt.binding,
    [
      "gateId",
      "pilotUnitId",
      "attemptId",
      "candidateDigest",
      "sourceCommit",
      "targetBaselineCommit",
      "checkerVersion",
      "checkerBundleDigest",
      "parentPackageId",
      "parentPackageStatus",
      "liveAllowed"
    ],
    "receipt binding"
  );
  assertExactKeys(
    receipt.lifecycle,
    ["priorState", "currentState", "recommendedState", "parentPackageStatus", "maturityClaim", "liveAllowed"],
    "receipt lifecycle"
  );
  if (
    receipt.binding.gateId !== "promotion-shadow-gate-v2" ||
    receipt.binding.pilotUnitId !== PROMOTION_V2_CANDIDATE.promotionUnitId ||
    receipt.binding.attemptId !== "attempt-007" ||
    receipt.binding.parentPackageId !== PROMOTION_V2_CANDIDATE.parentPackageId ||
    receipt.binding.parentPackageStatus !== "candidate-only" ||
    receipt.binding.checkerVersion !== PROMOTION_V2_CHECKER_VERSION ||
    receipt.lifecycle.parentPackageStatus !== "candidate-only"
  ) {
    throw new PromotionGateError("V2_RECEIPT_BINDING_INVALID", "Receipt governance binding is invalid.");
  }
  assertSha256(receipt.binding.candidateDigest, "receipt binding candidateDigest");
  assertSha256(receipt.binding.checkerBundleDigest, "receipt binding checkerBundleDigest");
  assertCommit(receipt.binding.sourceCommit, "receipt binding sourceCommit");
  assertCommit(receipt.binding.targetBaselineCommit, "receipt binding targetBaselineCommit");
  if (receipt.result === "pass") {
    if (
      receipt.exitReasons.length !== 0 ||
      receipt.checks.length !== PROMOTION_V2_REQUIRED_CHECK_IDS.length ||
      stableJson(receipt.checks.map(({ id }) => id)) !== stableJson(PROMOTION_V2_REQUIRED_CHECK_IDS) ||
      receipt.checks.some(({ result }) => result !== "pass") ||
      [
        receipt.worktreeProof,
        receipt.provenanceProof,
        receipt.baselineProof,
        receipt.checkerReleaseProof,
        receipt.evidenceProof,
        receipt.contentProof,
        receipt.candidateSourceProof,
        receipt.shadowOutputProof,
        receipt.runtimeAndLegacyProof,
        receipt.liveReachabilityProof,
        receipt.forbiddenPathDiff,
        receipt.externalSideEffectProof,
        receipt.rollbackProof
      ].some((proof) => proof === null)
    ) {
      throw new PromotionGateError("V2_RECEIPT_PASS_INCOMPLETE", "Pass Receipt is missing one or more hard-gate proofs.");
    }
  } else if (receipt.exitReasons.length === 0) {
    throw new PromotionGateError("V2_RECEIPT_FAILURE_REASON_MISSING", "Non-pass Receipt must include an exit reason.");
  }
  return receipt;
}

async function collectV2Preflight(repoRoot, manifest, manifestLoaded, worktreeProof) {
  if (!worktreeProof.clean) {
    throw new PromotionGateError(
      "V2_WORKTREE_DIRTY",
      "Promotion Gate requires a clean isolated worktree.",
      { statusDigest: worktreeProof.statusDigest },
      "blocked"
    );
  }
  const candidate = await loadV2Candidate(repoRoot, manifest);
  const [provenanceProof, baselineProof, checkerReleaseProof] = await Promise.all([
    collectV2ProvenanceProof(repoRoot, manifest, candidate, worktreeProof.headCommit),
    collectV2BaselineProof(repoRoot, manifest, worktreeProof.headCommit),
    collectV2CheckerReleaseProof(repoRoot, manifest, worktreeProof.headCommit)
  ]);
  const evidence = await loadV2Evidence(repoRoot, manifest, worktreeProof.headCommit);
  const contentProof = validateV2ContentSemantics(candidate, evidence.evidenceByRole);
  const externalSideEffectProof = await collectV2ExternalSideEffectProof(repoRoot, manifest);
  const runtimeAndLegacy = await collectV2RuntimeAndLegacyProof(
    repoRoot,
    manifest,
    worktreeProof.headCommit
  );
  const outputs = buildV2ShadowDtos(candidate);
  if (
    outputs.length !== manifest.operationPlan.expectedOperationCount ||
    stableJson(outputs.map(({ dto }) => dto.schemaVersion)) !== stableJson(manifest.operationPlan.outputContracts)
  ) {
    throw new PromotionGateError("V2_ADAPTER_OUTPUT_INVALID", "Shadow adapter output contracts drifted.");
  }
  const firstSemanticOutputDigest = fingerprint(outputs.map(({ path: outputPath, dto }) => ({
    path: outputPath,
    semanticDigest: fingerprint(dto)
  })));
  const independentlyRebuiltOutputs = buildV2ShadowDtos(candidate);
  const secondSemanticOutputDigest = fingerprint(independentlyRebuiltOutputs.map(({ path: outputPath, dto }) => ({
    path: outputPath,
    semanticDigest: fingerprint(dto)
  })));
  if (firstSemanticOutputDigest !== secondSemanticOutputDigest) {
    throw new PromotionGateError("V2_ADAPTER_NONDETERMINISTIC", "Shadow adapter is not semantically deterministic.");
  }
  return {
    manifest,
    manifestLoaded,
    candidate,
    provenanceProof,
    baselineProof,
    checkerReleaseProof,
    evidence,
    contentProof,
    externalSideEffectProof,
    runtimeAndLegacy,
    outputs,
    semanticStabilityProof: {
      schemaVersion: "promotion-shadow-semantic-stability-proof.v2",
      independentBuildCount: 2,
      firstSemanticOutputDigest,
      secondSemanticOutputDigest,
      equal: true
    }
  };
}

function validationChecks(preflight) {
  return [
    createCheck("candidate-binding-v2", "pass", {
      candidateDigest: preflight.candidate.candidateDigest,
      artifactCount: preflight.candidate.records.length
    }),
    createCheck("git-baseline-v2", "pass", {
      provenanceDigest: fingerprint(preflight.provenanceProof),
      baselineDigest: fingerprint(preflight.baselineProof)
    }),
    createCheck("owner-evidence-v2", "pass", {
      bindingsDigest: preflight.evidence.proof.bindingsDigest,
      independentFileCount: preflight.evidence.proof.independentFileCount
    }),
    createCheck("content-qa-v2", "pass", {
      contentProofDigest: fingerprint(preflight.contentProof),
      numericOracle: 12
    }),
    createCheck("shadow-adapter-v2", "pass", {
      outputContractCount: preflight.outputs.length,
      semanticOutputDigest: preflight.semanticStabilityProof.firstSemanticOutputDigest
    }),
    createCheck("live-unreachable-v2", "pass", {
      runtimePolicyDigest: preflight.runtimeAndLegacy.proof.runtimePolicyDigest,
      selectedIdentityHits: 0
    }),
    createCheck("legacy-drift-ratchet-v2", "pass", {
      canonicalAuditDigest: preflight.runtimeAndLegacy.canonicalAudit.auditDigest,
      resolutionProofsDigest: preflight.runtimeAndLegacy.proof.resolutionProofsDigest,
      activeExceptionCount: 0
    }),
    createCheck("external-side-effects-v2", "pass", {
      proofDigest: preflight.externalSideEffectProof.digest,
      externalSideEffectCount: 0
    }),
    createCheck("state-transition-v2", "pass", {
      priorState: "candidate_hold",
      currentState: "shadow_ready",
      requestedState: "shadow_passed"
    }),
    createCheck("semantic-stability-v2", "pass", preflight.semanticStabilityProof)
  ];
}

export async function validateV2ShadowPilot(repoRoot, {
  manifestPath,
  producedAt = new Date().toISOString()
} = {}) {
  if (Number.isNaN(Date.parse(producedAt))) {
    throw new PromotionGateError("V2_RUN_TIME_INVALID", "producedAt must be an ISO timestamp.");
  }
  const [{ manifest, loaded }, worktreeProof] = await Promise.all([
    loadV2Manifest(repoRoot, manifestPath),
    collectV2GitWorktreeProof(repoRoot)
  ]);
  const preflight = await collectV2Preflight(repoRoot, manifest, loaded, worktreeProof);
  const checks = validationChecks(preflight);
  return {
    schemaVersion: "promotion-validation-result.v2",
    result: "pass",
    mode: "validate",
    manifest: { path: manifestPath, rawSha256: loaded.rawSha256 },
    executionCommit: worktreeProof.headCommit,
    candidateDigest: preflight.candidate.candidateDigest,
    targetBaselineCommit: manifest.targetBaselineCommit,
    checkerBundleDigest: preflight.checkerReleaseProof.bundleDigest,
    checks,
    checkDigest: fingerprint(checks),
    parentPackageStatus: "candidate-only",
    pilotUnitStatus: "shadow_ready",
    liveAllowed: false
  };
}

function buildPassReceipt({
  manifestPath,
  manifest,
  manifestLoaded,
  runId,
  producedAt,
  ciMetadata,
  worktreeProof,
  preflight,
  candidateSnapshotPre,
  candidateSnapshotPost,
  forbiddenSnapshotPre,
  forbiddenSnapshotPost,
  shadowRehearsal,
  worktreePost
}) {
  const compatibilityOutput = preflight.outputs.find(({ dto }) =>
    dto.schemaVersion === "shadow-compatibility-report.v2"
  );
  const checks = [
    ...validationChecks(preflight).filter(({ id }) => !new Set([
      "external-side-effects-v2",
      "semantic-stability-v2"
    ]).has(id)),
    createCheck("source-immutability-v2", "pass", {
      candidatePreSnapshotDigest: candidateSnapshotPre.digest,
      candidatePostSnapshotDigest: candidateSnapshotPost.digest,
      forbiddenPreSnapshotDigest: forbiddenSnapshotPre.digest,
      forbiddenPostSnapshotDigest: forbiddenSnapshotPost.digest,
      changedPathCount: 0
    }),
    createCheck("output-isolation-v2", "pass", {
      isolationProofDigest: fingerprint(shadowRehearsal.isolationProof),
      outputAggregateDigest: shadowRehearsal.outputProof.aggregateDigest
    }),
    createCheck("rollback-rehearsal-v2", "pass", shadowRehearsal.rollbackProof),
    createCheck("external-side-effects-v2", "pass", {
      proofDigest: preflight.externalSideEffectProof.digest,
      externalSideEffectCount: 0
    }),
    createCheck("semantic-stability-v2", "pass", {
      ...preflight.semanticStabilityProof,
      writtenSemanticOutputDigest: shadowRehearsal.outputProof.semanticAggregateDigest
    })
  ];
  const checkById = new Map(checks.map((check) => [check.id, check]));
  const orderedChecks = PROMOTION_V2_REQUIRED_CHECK_IDS.map((id) => checkById.get(id));
  if (orderedChecks.some((check) => check === undefined)) {
    throw new PromotionGateError("V2_CHECK_SET_INCOMPLETE", "Receipt check set is incomplete.");
  }
  const receiptWithoutDigests = {
    schemaVersion: PROMOTION_V2_RECEIPT_SCHEMA,
    manifest: { path: manifestPath, rawSha256: manifestLoaded.rawSha256 },
    run: { runId, producedAt, ciMetadata },
    mode: "shadow",
    result: "pass",
    exitReasons: [],
    binding: {
      gateId: manifest.gateId,
      pilotUnitId: manifest.pilotUnitId,
      attemptId: manifest.attemptId,
      candidateDigest: manifest.candidateDigest,
      sourceCommit: manifest.sourceCommit,
      targetBaselineCommit: manifest.targetBaselineCommit,
      checkerVersion: manifest.checkerVersion,
      checkerBundleDigest: manifest.checkerRelease.bundleDigest,
      parentPackageId: manifest.parentPackage.id,
      parentPackageStatus: "candidate-only",
      liveAllowed: false
    },
    worktreeProof: {
      executionCommit: worktreeProof.headCommit,
      pre: worktreeProof,
      post: worktreePost,
      cleanBeforeAndAfter: true,
      unchangedHead: worktreeProof.headCommit === worktreePost.headCommit
    },
    provenanceProof: preflight.provenanceProof,
    baselineProof: preflight.baselineProof,
    checkerReleaseProof: preflight.checkerReleaseProof,
    evidenceProof: preflight.evidence.proof,
    contentProof: preflight.contentProof,
    candidateSourceProof: {
      paths: preflight.candidate.paths,
      preAggregateDigest: preflight.candidate.candidateDigest,
      postAggregateDigest: preflight.candidate.candidateDigest,
      preSnapshotDigest: candidateSnapshotPre.digest,
      postSnapshotDigest: candidateSnapshotPost.digest,
      byteIdentical: true
    },
    shadowOutputProof: shadowRehearsal.outputProof,
    compatibilityReportDigest: fingerprint(compatibilityOutput.dto),
    runtimeAndLegacyProof: preflight.runtimeAndLegacy.proof,
    liveReachabilityProof: {
      registeredRuntimePathCount: preflight.runtimeAndLegacy.reachablePaths.length,
      registeredRuntimePathsDigest: fingerprint(preflight.runtimeAndLegacy.reachablePaths),
      selectedCandidateIdentityCount: 8,
      selectedCandidateHitCount: 0,
      unresolvedDynamicImportCount: 0,
      unknownLiveRegistryCount: 0,
      scanBlindSpotCount: 0,
      liveAllowed: false
    },
    forbiddenPathDiff: {
      paths: [...PROMOTION_V2_LIVE_ROOTS, ...PROMOTION_V2_LIVE_SPECIAL_PATHS],
      preSnapshotDigest: forbiddenSnapshotPre.digest,
      postSnapshotDigest: forbiddenSnapshotPost.digest,
      changedPathCount: 0,
      changedPathsDigest: fingerprint([])
    },
    externalSideEffectProof: preflight.externalSideEffectProof,
    rollbackProof: shadowRehearsal.rollbackProof,
    checks: orderedChecks,
    lifecycle: {
      priorState: "candidate_hold",
      currentState: "shadow_ready",
      recommendedState: "shadow_passed",
      parentPackageStatus: "candidate-only",
      maturityClaim: "shadow-passed / maturity-pending-independent-replay-and-enforcement",
      liveAllowed: false
    },
    unmetConditions: [
      { scope: "maturity", code: "independent-replay-pending", owner: "A11" },
      { scope: "maturity", code: "ci-required-check-enforcement-pending", owner: "A10" },
      { scope: "maturity", code: "main-postmerge-proof-pending", owner: "A22" },
      { scope: "live", code: "missing-zh-localization", owner: "A09" },
      { scope: "live", code: "missing-zhHans-localization", owner: "A09" },
      { scope: "live", code: "live-integration-and-release-unproven", owner: "A23" }
    ]
  };
  return attachV2ReceiptDigests(receiptWithoutDigests);
}

function buildFailureReceipt({
  manifestPath,
  manifest,
  manifestLoaded,
  runId,
  producedAt,
  ciMetadata,
  worktreeProof,
  error
}) {
  const result = error.outcome === "blocked" ? "blocked" : "fail";
  return attachV2ReceiptDigests({
    schemaVersion: PROMOTION_V2_RECEIPT_SCHEMA,
    manifest: { path: manifestPath, rawSha256: manifestLoaded.rawSha256 },
    run: { runId, producedAt, ciMetadata },
    mode: "shadow",
    result,
    exitReasons: [{ code: error.code, message: error.message }],
    binding: {
      gateId: manifest.gateId,
      pilotUnitId: manifest.pilotUnitId,
      attemptId: manifest.attemptId,
      candidateDigest: manifest.candidateDigest,
      sourceCommit: manifest.sourceCommit,
      targetBaselineCommit: manifest.targetBaselineCommit,
      checkerVersion: manifest.checkerVersion,
      checkerBundleDigest: manifest.checkerRelease.bundleDigest,
      parentPackageId: manifest.parentPackage.id,
      parentPackageStatus: "candidate-only",
      liveAllowed: false
    },
    worktreeProof: worktreeProof === null ? null : {
      executionCommit: worktreeProof.headCommit,
      pre: worktreeProof,
      post: null,
      cleanBeforeAndAfter: false,
      unchangedHead: null
    },
    provenanceProof: null,
    baselineProof: null,
    checkerReleaseProof: null,
    evidenceProof: null,
    contentProof: null,
    candidateSourceProof: null,
    shadowOutputProof: null,
    compatibilityReportDigest: null,
    runtimeAndLegacyProof: null,
    liveReachabilityProof: null,
    forbiddenPathDiff: null,
    externalSideEffectProof: null,
    rollbackProof: null,
    checks: [createCheck("shadow-execution-v2", result, { code: error.code })],
    lifecycle: {
      priorState: "candidate_hold",
      currentState: "shadow_ready",
      recommendedState: result === "blocked" ? "shadow_ready" : "repair_required",
      parentPackageStatus: "candidate-only",
      maturityClaim: "not-mature",
      liveAllowed: false
    },
    unmetConditions: [{ scope: "shadow", code: error.code, owner: "A23" }]
  });
}

export async function runV2ShadowPilot(repoRoot, {
  manifestPath,
  runId,
  producedAt = new Date().toISOString(),
  ciMetadata = null,
  tempRoot = null
} = {}) {
  if (typeof runId !== "string" || !RUN_ID_PATTERN.test(runId)) {
    throw new PromotionGateError("V2_RUN_ID_INVALID", "runId has an invalid format.");
  }
  if (Number.isNaN(Date.parse(producedAt))) {
    throw new PromotionGateError("V2_RUN_TIME_INVALID", "producedAt must be an ISO timestamp.");
  }
  assertJsonRoundTrip(ciMetadata, "ciMetadata");
  const { manifest, loaded } = await loadV2Manifest(repoRoot, manifestPath);
  let worktreeProof = null;
  try {
    worktreeProof = await collectV2GitWorktreeProof(repoRoot);
    if (!worktreeProof.clean) {
      throw new PromotionGateError("V2_WORKTREE_DIRTY", "Shadow execution requires a clean worktree.", {}, "blocked");
    }
    const candidatePaths = [
      manifest.candidatePackage.path,
      ...manifest.candidateArtifacts.map(({ path: artifactPath }) => artifactPath)
    ];
    const forbiddenPaths = [...PROMOTION_V2_LIVE_ROOTS, ...PROMOTION_V2_LIVE_SPECIAL_PATHS];
    const [candidateSnapshotPre, forbiddenSnapshotPre] = await Promise.all([
      snapshotRepoPaths(repoRoot, candidatePaths),
      snapshotRepoPaths(repoRoot, forbiddenPaths)
    ]);
    const preflight = await collectV2Preflight(repoRoot, manifest, loaded, worktreeProof);
    const shadowRehearsal = await rehearseV2ShadowOutputs(repoRoot, preflight.outputs, { tempRoot });
    const [candidateSnapshotPost, forbiddenSnapshotPost, worktreePost] = await Promise.all([
      snapshotRepoPaths(repoRoot, candidatePaths),
      snapshotRepoPaths(repoRoot, forbiddenPaths),
      collectV2GitWorktreeProof(repoRoot)
    ]);
    assertSnapshotsEqual(candidateSnapshotPre, candidateSnapshotPost, "V2_CANDIDATE_SOURCE_MUTATION");
    assertSnapshotsEqual(forbiddenSnapshotPre, forbiddenSnapshotPost, "V2_FORBIDDEN_PATH_MUTATION");
    if (
      !worktreePost.clean ||
      worktreePost.headCommit !== worktreeProof.headCommit ||
      worktreePost.statusDigest !== worktreeProof.statusDigest
    ) {
      throw new PromotionGateError("V2_WORKTREE_DRIFT", "Worktree state changed during Shadow execution.");
    }
    const receipt = buildPassReceipt({
      manifestPath,
      manifest,
      manifestLoaded: loaded,
      runId,
      producedAt,
      ciMetadata,
      worktreeProof,
      preflight,
      candidateSnapshotPre,
      candidateSnapshotPost,
      forbiddenSnapshotPre,
      forbiddenSnapshotPost,
      shadowRehearsal,
      worktreePost
    });
    validateV2ReceiptStructure(receipt);
    return receipt;
  } catch (error) {
    if (!(error instanceof PromotionGateError)) throw error;
    const receipt = buildFailureReceipt({
      manifestPath,
      manifest,
      manifestLoaded: loaded,
      runId,
      producedAt,
      ciMetadata,
      worktreeProof,
      error
    });
    validateV2ReceiptStructure(receipt);
    return receipt;
  }
}

export async function verifyV2PromotionReceipt(repoRoot, receipt, {
  producedAt = new Date().toISOString()
} = {}) {
  validateV2ReceiptStructure(receipt);
  if (receipt.worktreeProof?.executionCommit === undefined) {
    throw new PromotionGateError("V2_RECEIPT_EXECUTION_PROOF_MISSING", "Receipt has no execution commit.");
  }
  const currentWorktree = await collectV2GitWorktreeProof(repoRoot);
  if (
    !currentWorktree.clean ||
    currentWorktree.headCommit !== receipt.worktreeProof.executionCommit
  ) {
    throw new PromotionGateError(
      "V2_RECEIPT_EXECUTION_HEAD_MISMATCH",
      "Receipt verification requires its exact clean execution commit.",
      {
        expectedExecutionCommit: receipt.worktreeProof.executionCommit,
        observedExecutionCommit: currentWorktree.headCommit,
        clean: currentWorktree.clean
      },
      "blocked"
    );
  }
  const loaded = await readAuthoritativeFile(repoRoot, receipt.manifest.path);
  if (loaded.rawSha256 !== receipt.manifest.rawSha256) {
    throw new PromotionGateError("V2_RECEIPT_MANIFEST_DIGEST_MISMATCH", "Receipt manifest bytes drifted.");
  }
  const replay = await runV2ShadowPilot(repoRoot, {
    manifestPath: receipt.manifest.path,
    runId: `verify-${receipt.rawReceiptDigest.slice(0, 16)}`,
    producedAt,
    ciMetadata: null
  });
  if (
    replay.result !== receipt.result ||
    replay.semanticReceiptDigest !== receipt.semanticReceiptDigest
  ) {
    throw new PromotionGateError(
      "V2_RECEIPT_SEMANTIC_REPLAY_MISMATCH",
      "Independent semantic replay does not reproduce the submitted receipt.",
      {
        expectedResult: receipt.result,
        observedResult: replay.result,
        expectedSemanticDigest: receipt.semanticReceiptDigest,
        observedSemanticDigest: replay.semanticReceiptDigest
      }
    );
  }
  return {
    schemaVersion: "promotion-receipt-verification.v2",
    result: receipt.result,
    valid: true,
    manifestPath: receipt.manifest.path,
    manifestRawSha256: receipt.manifest.rawSha256,
    executionCommit: receipt.worktreeProof.executionCommit,
    semanticReceiptDigest: receipt.semanticReceiptDigest,
    rawReceiptDigest: receipt.rawReceiptDigest,
    liveAllowed: false
  };
}

export function renderV2PromotionDecisionMarkdown(receipt) {
  validateV2ReceiptStructure(receipt);
  const transition = receipt.lifecycle.recommendedState;
  const lines = [
    "# Promotion Gate Shadow Decision — attempt-007",
    "",
    "> This file is derived from the machine Receipt. It is not an approval source.",
    "",
    `- Result: \`${receipt.result}\``,
    `- Promotion unit: \`${receipt.binding.pilotUnitId}\``,
    `- Candidate digest: \`${receipt.binding.candidateDigest}\``,
    `- Semantic Receipt digest: \`${receipt.semanticReceiptDigest}\``,
    `- Lifecycle recommendation: \`${receipt.lifecycle.currentState} -> ${transition}\``,
    `- Parent package status: \`${receipt.lifecycle.parentPackageStatus}\``,
    `- Maturity claim: \`${receipt.lifecycle.maturityClaim}\``,
    "- Live allowed: `false`",
    "",
    "## Hard gate checks",
    "",
    ...receipt.checks.map(({ id, result }) => `- \`${id}\`: \`${result}\``),
    "",
    "## Remaining live-only conditions",
    "",
    ...receipt.unmetConditions.map(({ code, owner }) => `- \`${code}\` — owner \`${owner}\``),
    ""
  ];
  return lines.join("\n");
}
