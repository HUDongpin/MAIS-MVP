import { execFileSync, spawn } from "node:child_process";
import { lstat, readFile, realpath, mkdtemp, writeFile, rm } from "node:fs/promises";
import { devNull, tmpdir } from "node:os";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import YAML from "yaml";
import {
  fingerprint, stableJson, sha256, readAuthoritativeFile, assertSafeRepoRelativePath,
  observeCanonicalRuntimePolicy, auditCanonicalLegacyConflictUnion, RUNTIME_RESOLVER_CONFIG_PATHS
} from "../promotion-gate-lib.mjs";
import { collectV2RuntimeAndLegacyProof, projectV2RuntimePolicy, PROMOTION_V2_CHECKER_BUNDLE_PATHS } from "../v2/promotion-gate-v2-lib.mjs";
import { parsePromotionWorkflowJsonBytes } from "../../../scripts/promotion-workflow-json-guard.mjs";
import { dependencyBindings } from "./dependencies.mjs";
import { validateV2ShadowClosure, validateV2LifecycleRegistry } from "../finalization/promotion-shadow-finalization-v2-lib.mjs";

export const VERSION = "promotion-legacy-successor-v1";
export const ROOT = "coordination/integration/legacy-successor";
export const PACK = "data/generated-content/us-ar-math-g6-g12-generated-bank-v1-1500/question-pack.json";
export const SOURCE_PATHS = [PACK, "lib/fullQuestionBankSolvability.test.ts", "scripts/arkansas-correctness-solvers.mjs", "scripts/audit-us-math-item-quality.mjs"].sort();
export const ROLES = ["A18", "A11", "A23", "A22", "A25"];
export const REVIEWERS = Object.freeze({ A18: "/root/a18_pr172_copy_review", A11: "/root/a11_pr172_copy_verify", A23: "/root/a23_successor_design_review" });
export const IMPORT_COMMIT = "fc6c24446659c54f92482cffd2de6e180bbb03c2";
export const COMMON_BASE = "4834189e63d74f0e1a27475d9968f5c88c2bc78f";
export const ORIGINAL_PACK_HASH = "72513886e6b52a253e598c744ae1d4a5bedfe5ebf6f8d6c544fc51904a555452";
export const BUNDLE_PATHS = [...new Set([
  `${ROOT}/contract.mjs`, `${ROOT}/promotion.mjs`, `${ROOT}/contract.test.mjs`, `${ROOT}/dependencies.mjs`, `${ROOT}/observer.mjs`, `${ROOT}/bootstrap.mjs`, `${ROOT}/frozen-dependency-bindings.v1.json`,
  `${ROOT}/schemas/manifest.v1.schema.json`, `${ROOT}/schemas/receipt.v1.schema.json`,
  `${ROOT}/schemas/evidence.v1.schema.json`, `${ROOT}/schemas/successor.v1.schema.json`,
  "coordination/integration/promotion-gate-lib.mjs", "coordination/integration/v2/promotion-gate-v2-lib.mjs",
  "coordination/integration/finalization/promotion-shadow-finalization-v2-lib.mjs",
  "coordination/integration/finalization/schemas/promotion-shadow-closure.v2.schema.json",
  "coordination/integration/finalization/schemas/promotion-lifecycle-registry.v2.schema.json",
  "scripts/promotion-workflow-json-guard.mjs", "package.json", "package-lock.json", ...SOURCE_PATHS,
  ...PROMOTION_V2_CHECKER_BUNDLE_PATHS
])].sort();
const HEX = /^[a-f0-9]{64}$/u;
const COMMIT = /^[a-f0-9]{40}$/u;
const UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;
const receiptSchemaPath = fileURLToPath(new URL("./schemas/receipt.v1.schema.json", import.meta.url));

export class SuccessorError extends Error {
  constructor(code) { super(code); this.name = "SuccessorError"; this.code = code; }
}
function requireThat(condition, code) { if (!condition) throw new SuccessorError(code); }
function exact(object, keys, code = "SUCCESSOR_SCHEMA_INVALID") {
  requireThat(object && typeof object === "object" && !Array.isArray(object), code);
  requireThat(stableJson(Object.keys(object).sort()) === stableJson([...keys].sort()), code);
}
function hash(value) { requireThat(typeof value === "string" && HEX.test(value), "SUCCESSOR_HASH_INVALID"); }
function commit(value) { requireThat(typeof value === "string" && COMMIT.test(value), "SUCCESSOR_COMMIT_INVALID"); }
function reference(value) {
  exact(value, ["path", "rawSha256"]); assertSafeRepoRelativePath(value.path); hash(value.rawSha256);
}
function sortedUnique(values, code) {
  requireThat(Array.isArray(values) && values.every(x => typeof x === "string") && stableJson(values) === stableJson([...new Set(values)].sort()), code);
}
export async function loadSchemas(repo) {
  const ajv = new Ajv2020({ strict: true, allErrors: false });
  const validators = {};
  for (const name of ["manifest", "evidence", "successor", "receipt"]) {
    const bound = await repo.working(`${ROOT}/schemas/${name}.v1.schema.json`);
    const schema = parsePromotionWorkflowJsonBytes(bound.bytes);
    validators[name] = ajv.compile(schema);
  }
  return (name, value) => requireThat(validators[name](value), "SUCCESSOR_CLOSED_SCHEMA_INVALID");
}
function cleanChildEnvironment() {
  return { PATH: "/usr/bin:/bin:/usr/sbin:/sbin", GIT_GRAFT_FILE: devNull, GIT_CONFIG_GLOBAL: devNull, GIT_CONFIG_NOSYSTEM: "1" };
}

export async function repository(root) {
  const physical = await realpath(root);
  requireThat(physical === root, "SUCCESSOR_REPOSITORY_ALIAS");
  const entry = await lstat(path.join(root, ".git"));
  requireThat(!entry.isSymbolicLink(), "SUCCESSOR_GIT_POINTER_UNSAFE");
  let gitDir = path.join(root, ".git");
  if (entry.isFile()) {
    const text = await readFile(gitDir, "utf8");
    const match = text.match(/^gitdir: ([^\r\n\0]+)\n?$/u);
    requireThat(match, "SUCCESSOR_GIT_POINTER_UNSAFE");
    gitDir = await realpath(path.resolve(root, match[1]));
  } else requireThat(entry.isDirectory(), "SUCCESSOR_GIT_POINTER_UNSAFE");
  const args = ["--no-replace-objects", "--literal-pathspecs", "--no-optional-locks", `--git-dir=${gitDir}`, `--work-tree=${root}`, "-c", `core.worktree=${root}`, "-c", "core.fsmonitor=false"];
  const git = (...commands) => {
    try { return execFileSync("/usr/bin/git", [...args, ...commands], { cwd: root, env: cleanChildEnvironment(), maxBuffer: 64 * 1024 * 1024, timeout: 30000 }); }
    catch { throw new SuccessorError("SUCCESSOR_GIT_PROOF_FAILED"); }
  };
  const head = git("rev-parse", "HEAD").toString().trim(); commit(head);
  requireThat(git("rev-parse", "--is-shallow-repository").toString().trim() === "false", "SUCCESSOR_HISTORY_SHALLOW");
  const ancestor = (a, b) => { commit(a); commit(b); git("merge-base", "--is-ancestor", a, b); };
  const blob = (at, file) => {
    commit(at); assertSafeRepoRelativePath(file);
    const row = git("ls-tree", "-z", at, "--", file).toString();
    const match = row.match(/^([0-7]{6}) blob ([a-f0-9]{40})\t([^\0]+)\0$/u);
    requireThat(match && match[3] === file && ["100644", "100755"].includes(match[1]), "SUCCESSOR_REGULAR_BLOB_REQUIRED");
    return { mode: match[1], objectId: match[2], bytes: git("show", `${at}:${file}`) };
  };
  const working = async (file, expected = null) => {
    const value = await readAuthoritativeFile(root, file);
    const tracked = blob(head, file);
    requireThat(tracked.bytes.equals(value.bytes), "SUCCESSOR_WORKING_BYTES_DRIFT");
    const mode = ((await lstat(path.join(root, file))).mode & 0o111) ? "100755" : "100644";
    requireThat(mode === tracked.mode, "SUCCESSOR_WORKING_MODE_DRIFT");
    if (expected !== null) requireThat(sha256(value.bytes) === expected, "SUCCESSOR_AUTHORITY_DIGEST_MISMATCH");
    return { ...tracked, rawSha256: sha256(value.bytes) };
  };
  return { root, head, gitDir, gitArgs: args, git, ancestor, blob, working };
}

export function contentDelta(original, candidate) {
  requireThat(original?.packageId === candidate?.packageId && Array.isArray(original.questions) && Array.isArray(candidate.questions), "SUCCESSOR_PACK_INVALID");
  requireThat(original.questions.length === 1500 && candidate.questions.length === 1500, "SUCCESSOR_PACK_COUNT_INVALID");
  const top = value => Object.fromEntries(Object.entries(value).filter(([key]) => key !== "questions"));
  requireThat(stableJson(top(original)) === stableJson(top(candidate)), "SUCCESSOR_PACKAGE_IDENTITY_DRIFT");
  const beforeIds = original.questions.map(q => q.id), afterIds = candidate.questions.map(q => q.id);
  requireThat(new Set(beforeIds).size === 1500 && stableJson(beforeIds) === stableJson(afterIds), "SUCCESSOR_ID_SET_DRIFT");
  const changed = [];
  const identity = ["id", "type", "grade", "topicId", "curriculumTrack", "curriculumProfile", "publisher", "standardIds"];
  for (let index = 0; index < original.questions.length; index++) {
    const before = original.questions[index], after = candidate.questions[index];
    requireThat(identity.every(key => stableJson(before[key] ?? null) === stableJson(after[key] ?? null)), "SUCCESSOR_ROW_IDENTITY_DRIFT");
    if (stableJson(before) !== stableJson(after)) changed.push({ id: after.id, beforeDigest: fingerprint(before), afterDigest: fingerprint(after) });
  }
  changed.sort((a, b) => a.id.localeCompare(b.id, "en"));
  requireThat(changed.length === 22, "SUCCESSOR_CHANGED_SCOPE_INVALID");
  return { changed, changedIds: changed.map(x => x.id), unchangedCount: 1478, contentChanged: true, wholePackAccepted: false, changeDigest: fingerprint(changed) };
}

export function validateManifest(m) {
  exact(m, ["schemaVersion", "gateId", "attemptId", "mode", "checkerVersion", "checkerRelease", "candidate", "source", "historical", "targetBaselineCommit", "successor", "legacyResolution", "liveReachability", "evidenceIndex", "descriptor", "canonicalReceiptPath", "lifecycleState", "liveAllowed"]);
  requireThat(m.schemaVersion === "promotion-legacy-successor-manifest.v1" && m.gateId === "legacy-content-successor-nonlive" && m.attemptId === "attempt-008" && m.mode === "shadow" && m.checkerVersion === VERSION, "SUCCESSOR_IDENTITY_INVALID");
  requireThat(m.lifecycleState === "shadow_ready" && m.liveAllowed === false, "SUCCESSOR_LIVE_AUTHORITY_FORBIDDEN");
  exact(m.checkerRelease, ["ledgerPath", "ledgerRawSha256", "releaseCommit", "bundleDigest"]);
  requireThat(m.checkerRelease.ledgerPath === `${ROOT}/checker-releases.v1.json`, "SUCCESSOR_LEDGER_PATH_INVALID");
  hash(m.checkerRelease.ledgerRawSha256); hash(m.checkerRelease.bundleDigest); commit(m.checkerRelease.releaseCommit); commit(m.targetBaselineCommit);
  exact(m.candidate, ["path", "rawSha256", "packageId", "version", "status"]);
  requireThat(m.candidate.path === PACK && m.candidate.packageId === "us-ar-math-g6-g12-generated-bank-v1-1500" && m.candidate.version === "1.1.0-correctness.22" && m.candidate.status === "candidate-only", "SUCCESSOR_CANDIDATE_INVALID"); hash(m.candidate.rawSha256);
  exact(m.source, ["importCommit", "commonBaseCommit", "importedPaths", "originalPack", "reviewedSourceCommit"]);
  commit(m.source.importCommit); commit(m.source.commonBaseCommit); commit(m.source.reviewedSourceCommit); reference(m.source.originalPack);
  requireThat(m.source.importCommit === IMPORT_COMMIT && m.source.commonBaseCommit === COMMON_BASE && m.source.originalPack.rawSha256 === ORIGINAL_PACK_HASH && m.source.reviewedSourceCommit === m.targetBaselineCommit && m.targetBaselineCommit === m.checkerRelease.releaseCommit, "SUCCESSOR_REVIEWED_PILOT_SOURCE_INVALID");
  requireThat(m.source.originalPack.path === PACK, "SUCCESSOR_ORIGINAL_PATH_INVALID");
  requireThat(Array.isArray(m.source.importedPaths) && stableJson(m.source.importedPaths.map(x => x.path)) === stableJson(SOURCE_PATHS), "SUCCESSOR_IMPORT_SCOPE_INVALID");
  for (const item of m.source.importedPaths) { exact(item, ["path", "rawSha256", "mode", "objectId"]); hash(item.rawSha256); commit(item.objectId); requireThat(item.mode === "100644", "SUCCESSOR_IMPORT_MODE_INVALID"); }
  exact(m.historical, ["commit", "manifest", "receipt", "registry", "closure", "lifecycle"]); commit(m.historical.commit);
  for (const key of ["manifest", "receipt", "registry", "closure", "lifecycle"]) reference(m.historical[key]);
  exact(m.successor, ["resolutionId", "decision", "contentChanged", "baselineOnly", "wholePackAccepted", "changedIds", "unchangedCount", "changeDigest"]);
  requireThat(m.successor.resolutionId === "de-reach-arkansas-g6-g12-questions-v1" && m.successor.decision === "de-reached" && m.successor.contentChanged === true && m.successor.baselineOnly === false && m.successor.wholePackAccepted === false && m.successor.unchangedCount === 1478, "SUCCESSOR_DISPOSITION_INVALID");
  sortedUnique(m.successor.changedIds, "SUCCESSOR_CHANGED_SCOPE_INVALID"); requireThat(m.successor.changedIds.length === 22, "SUCCESSOR_CHANGED_SCOPE_INVALID"); hash(m.successor.changeDigest);
  exact(m.legacyResolution, ["registryPath", "rawSha256"]); assertSafeRepoRelativePath(m.legacyResolution.registryPath); hash(m.legacyResolution.rawSha256);
  exact(m.liveReachability, ["compatibilityManifestPath", "compatibilityManifestRawSha256", "expectedRuntimePolicy"]); assertSafeRepoRelativePath(m.liveReachability.compatibilityManifestPath); hash(m.liveReachability.compatibilityManifestRawSha256);
  exact(m.evidenceIndex, ["path", "rawSha256", "evidenceCommit"]); assertSafeRepoRelativePath(m.evidenceIndex.path); hash(m.evidenceIndex.rawSha256); commit(m.evidenceIndex.evidenceCommit);
  exact(m.descriptor, ["path"]); assertSafeRepoRelativePath(m.descriptor.path); assertSafeRepoRelativePath(m.canonicalReceiptPath);
  const parent = path.posix.dirname(m.canonicalReceiptPath);
  requireThat(parent === `${ROOT}/attempt-008` && m.descriptor.path === `${parent}/successor.v1.json` && m.evidenceIndex.path === `${parent}/inputs/evidence-index.v1.json` && m.legacyResolution.registryPath === `${parent}/inputs/legacy-resolution-registry.v1.json`, "SUCCESSOR_ATTEMPT_PATH_INVALID");
  return m;
}

export function validateDescriptor(d, m, manifestRef) {
  exact(d, ["schemaVersion", "relation", "manifest", "evidenceCommit", "historicalManifest", "historicalReceipt", "candidateChanged", "checkerChanged", "baselineOnly", "liveAllowed"]);
  requireThat(d.schemaVersion === "promotion-legacy-successor-descriptor.v1" && d.relation === "immutable-content-successor" && d.candidateChanged === true && d.checkerChanged === true && d.baselineOnly === false && d.liveAllowed === false, "SUCCESSOR_DESCRIPTOR_INVALID");
  for (const key of ["manifest", "historicalManifest", "historicalReceipt"]) reference(d[key]); commit(d.evidenceCommit);
  requireThat(stableJson(d.manifest) === stableJson(manifestRef) && stableJson(d.historicalManifest) === stableJson(m.historical.manifest) && stableJson(d.historicalReceipt) === stableJson(m.historical.receipt) && d.evidenceCommit === m.evidenceIndex.evidenceCommit, "SUCCESSOR_DESCRIPTOR_BINDING_INVALID");
}

export function validateEvidence(e, m, delta) {
  exact(e, ["schemaVersion", "role", "reviewer", "reviewedAt", "result", "candidateRawSha256", "changeDigest", "report", "details", "liveAllowed"]);
  exact(e.reviewer, ["sessionId", "identity", "independence"]);
  requireThat(e.schemaVersion === "promotion-legacy-successor-evidence.v1" && ROLES.includes(e.role) && e.result === "pass" && e.liveAllowed === false && e.candidateRawSha256 === m.candidate.rawSha256 && e.changeDigest === delta.changeDigest, "SUCCESSOR_EVIDENCE_INVALID");
  requireThat(UTC.test(e.reviewedAt) && Number.isFinite(Date.parse(e.reviewedAt)) && new Date(e.reviewedAt).toISOString() === e.reviewedAt && Date.parse(e.reviewedAt) <= Date.now() && e.reviewer.sessionId.length > 0 && e.reviewer.identity.length > 0, "SUCCESSOR_REVIEW_IDENTITY_INVALID"); reference(e.report);
  const independent = ["A18", "A11", "A23"].includes(e.role);
  requireThat(e.reviewer.independence === (independent ? "independent-review" : "coordinator-execution"), "SUCCESSOR_REVIEW_INDEPENDENCE_INVALID");
  requireThat(independent ? e.reviewer.sessionId === REVIEWERS[e.role] && e.reviewer.identity === REVIEWERS[e.role] : e.reviewer.sessionId === "/root" && e.reviewer.identity === "/root", "SUCCESSOR_AUTHENTIC_REVIEWER_REQUIRED");
  if (e.role === "A18") {
    exact(e.details, ["reviewedRows", "wholePackAccepted", "limitations"]);
    requireThat(e.details.wholePackAccepted === false && Array.isArray(e.details.limitations) && e.details.limitations.length > 0, "SUCCESSOR_QA_SCOPE_INVALID");
    requireThat(Array.isArray(e.details.reviewedRows) && stableJson(e.details.reviewedRows.map(x => x.id)) === stableJson(delta.changedIds), "SUCCESSOR_QA_SCOPE_INVALID");
    for (const [i, row] of e.details.reviewedRows.entries()) {
      exact(row, ["id", "recordDigest", "verdict"]);
      requireThat(row.recordDigest === delta.changed[i].afterDigest && row.verdict === "approved-bounded-correction", "SUCCESSOR_QA_ROW_BINDING_INVALID");
    }
  } else if (e.role === "A11") {
    exact(e.details, ["checkerBundleDigest", "negativeChecks", "sourceRegression"]);
    requireThat(e.details.checkerBundleDigest === m.checkerRelease.bundleDigest && e.details.sourceRegression === "pass", "SUCCESSOR_A11_BINDING_INVALID");
    sortedUnique(e.details.negativeChecks, "SUCCESSOR_A11_NEGATIVE_SCOPE_INVALID");
    for (const required of ["changed-qa-row", "changed-release-code", "duplicate-json-key", "fake-baseline-only", "future-receipt", "live-admission", "non-ar-registry-change", "same-reviewer"]) requireThat(e.details.negativeChecks.includes(required), "SUCCESSOR_A11_NEGATIVE_SCOPE_INVALID");
  } else if (e.role === "A23") {
    exact(e.details, ["checkerBundleDigest", "disposition", "otherResolutionsPreserved", "approvedProjectionsPreserved", "historicalCustody"]);
    requireThat(e.details.checkerBundleDigest === m.checkerRelease.bundleDigest && e.details.disposition === "de-reached-successor" && e.details.otherResolutionsPreserved === 17 && e.details.approvedProjectionsPreserved === 3 && e.details.historicalCustody === "preserved", "SUCCESSOR_A23_BINDING_INVALID");
  } else if (e.role === "A22") {
    exact(e.details, ["sourceCommit", "sourceTree", "buildExitCode", "buildLog", "sourceArchiveDigest"]); commit(e.details.sourceCommit); commit(e.details.sourceTree); reference(e.details.buildLog); hash(e.details.sourceArchiveDigest);
    requireThat(e.details.sourceCommit === m.targetBaselineCommit && e.details.buildExitCode === 0, "SUCCESSOR_BUILD_BINDING_INVALID");
  } else {
    exact(e.details, ["historicalReferencesDigest", "sourcePathsDigest", "custody"]);
    requireThat(e.details.historicalReferencesDigest === fingerprint(m.historical) && e.details.sourcePathsDigest === fingerprint(m.source.importedPaths) && e.details.custody === "preserved", "SUCCESSOR_CUSTODY_INVALID");
  }
  return e;
}

export function assertRegistrySuccessor(original, next, m) {
  const expected = structuredClone(original);
  expected.targetBaselineCommit = m.targetBaselineCommit;
  const row = expected.resolutions.find(x => x.resolutionId === m.successor.resolutionId);
  requireThat(row?.decision === "de-reached" && row.liveProjection === null && row.approvalReferences.length === 0, "SUCCESSOR_OLD_DISPOSITION_INVALID");
  requireThat(row.candidate.path === PACK && row.candidate.rawSha256 === m.source.originalPack.rawSha256, "SUCCESSOR_OLD_PACK_BINDING_INVALID");
  row.candidate.rawSha256 = m.candidate.rawSha256;
  requireThat(stableJson(expected) === stableJson(next), "SUCCESSOR_UNREVIEWED_REGISTRY_DELTA");
}

async function currentJson(repo, ref) {
  reference(ref); const bound = await repo.working(ref.path, ref.rawSha256);
  return { ...bound, value: parsePromotionWorkflowJsonBytes(bound.bytes) };
}
async function historicalJson(repo, at, ref) {
  reference(ref); const bound = repo.blob(at, ref.path);
  requireThat(sha256(bound.bytes) === ref.rawSha256, "SUCCESSOR_HISTORICAL_DIGEST_INVALID");
  return { ...bound, value: parsePromotionWorkflowJsonBytes(bound.bytes) };
}

export async function collectAuthority(repo, m) {
  const ledger = await currentJson(repo, { path: m.checkerRelease.ledgerPath, rawSha256: m.checkerRelease.ledgerRawSha256 });
  exact(ledger.value, ["schemaVersion", "entries"]);
  requireThat(ledger.value.schemaVersion === "promotion-checker-releases.legacy-successor.v1" && ledger.value.entries.length === 1, "SUCCESSOR_RELEASE_LEDGER_INVALID");
  const entry = ledger.value.entries[0]; exact(entry, ["version", "bundleAlgorithm", "bundlePaths", "bundleDigest", "releaseCommit", "reviewReferences", "dependencyBindings"]);
  requireThat(entry.version === VERSION && entry.bundleAlgorithm === "sha256-stable-json-path-raw-v1" && entry.releaseCommit === m.checkerRelease.releaseCommit && entry.bundleDigest === m.checkerRelease.bundleDigest && stableJson(entry.bundlePaths) === stableJson(BUNDLE_PATHS), "SUCCESSOR_RELEASE_BINDING_INVALID");
  repo.ancestor(entry.releaseCommit, m.targetBaselineCommit);
  const bindings = [];
  for (const file of BUNDLE_PATHS) {
    const now = await repo.working(file), frozen = repo.blob(entry.releaseCommit, file);
    requireThat(now.mode === frozen.mode && now.bytes.equals(frozen.bytes), "SUCCESSOR_RELEASE_BYTES_DRIFT");
    bindings.push({ path: file, rawSha256: now.rawSha256 });
  }
  requireThat(fingerprint(bindings) === entry.bundleDigest, "SUCCESSOR_RELEASE_DIGEST_INVALID");
  const frozenDependencies = parsePromotionWorkflowJsonBytes((await repo.working(`${ROOT}/frozen-dependency-bindings.v1.json`)).bytes);
  exact(frozenDependencies, ["schemaVersion", "packages"]);
  requireThat(frozenDependencies.schemaVersion === "promotion-frozen-dependency-bindings.v1" && stableJson(entry.dependencyBindings) === stableJson(frozenDependencies.packages), "SUCCESSOR_FROZEN_DEPENDENCY_BINDING_INVALID");
  const dependencies = await dependencyBindings(repo.root);
  requireThat(stableJson(dependencies) === stableJson(entry.dependencyBindings), "SUCCESSOR_LOADED_DEPENDENCY_DRIFT");
  requireThat(Array.isArray(entry.reviewReferences) && stableJson(entry.reviewReferences.map(x => x.role)) === stableJson(["A11", "A23"]), "SUCCESSOR_FREEZE_REVIEW_MISSING");
  const reviewers = new Set();
  for (const review of entry.reviewReferences) {
    exact(review, ["role", "path", "rawSha256"]); const artifact = await historicalJson(repo, entry.releaseCommit, { path: review.path, rawSha256: review.rawSha256 });
    exact(artifact.value, ["schemaVersion", "role", "reviewerSessionId", "reviewerIdentity", "bundleDigest", "verdict", "report"]);
    requireThat(artifact.value.schemaVersion === "promotion-checker-freeze-review.v1" && artifact.value.role === review.role && artifact.value.bundleDigest === entry.bundleDigest && artifact.value.verdict === "approved-for-checker-freeze", "SUCCESSOR_FREEZE_REVIEW_INVALID");
    requireThat(artifact.value.reviewerSessionId === REVIEWERS[review.role] && artifact.value.reviewerIdentity === REVIEWERS[review.role], "SUCCESSOR_FREEZE_REVIEW_IDENTITY_INVALID");
    reviewers.add(artifact.value.reviewerSessionId); await historicalJsonReport(repo, entry.releaseCommit, artifact.value.report);
  }
  requireThat(reviewers.size === 2, "SUCCESSOR_FREEZE_REVIEW_INDEPENDENCE_INVALID");
  return { releaseCommit: entry.releaseCommit, bundleDigest: entry.bundleDigest, dependenciesDigest: fingerprint(dependencies), reviewedByIndependentSessions: 2 };
}
async function historicalJsonReport(repo, at, ref) {
  reference(ref); const file = repo.blob(at, ref.path);
  requireThat(sha256(file.bytes) === ref.rawSha256, "SUCCESSOR_REVIEW_REPORT_DIGEST_INVALID");
}

function completed(child, code) {
  return new Promise((resolve, reject) => {
    child.on("error", () => reject(new SuccessorError(code)));
    child.on("close", (status, signal) => status === 0 ? resolve() : reject(new SuccessorError(signal === "SIGTERM" ? "SUCCESSOR_CHILD_EXECUTION_TIMEOUT" : code)));
  });
}

/** Materialize only immutable Git objects into a new private short-path root. */
export async function sealedRuntimeProof(repo, m, registry, executionCommit) {
  const selectors = new Set(["app", "components", "data", "lib", "public", "middleware.ts", "next.config.ts", "tsconfig.json", ...RUNTIME_RESOLVER_CONFIG_PATHS, "pages", "src", "jsconfig.json", "coordination/content-qa", m.liveReachability.compatibilityManifestPath, m.legacyResolution.registryPath]);
  for (const file of repo.git("ls-tree", "--name-only", repo.head).toString().trim().split("\n")) if (/^(?:proxy|middleware|instrumentation|instrumentation-client)\.[cm]?[jt]sx?$/u.test(file) || /^next\.config\.(?:[cm]?[jt]s)$/u.test(file) || /^jsconfig(?:\.[^.]+)?\.json$/u.test(file)) selectors.add(file);
  for (const row of registry.resolutions) for (const ref of row.approvalReferences) selectors.add(ref.path);
  const tree = repo.git("ls-tree", "-r", "-z", repo.head, "--", ...[...selectors].sort()).toString().split("\0").filter(Boolean);
  const records = [];
  for (const row of tree) {
    const match = row.match(/^([0-7]{6}) blob ([a-f0-9]{40})\t(.+)$/u);
    requireThat(match && ["100644", "100755"].includes(match[1]), "SUCCESSOR_SNAPSHOT_BLOB_INVALID");
    const file = match[3], now = await readAuthoritativeFile(repo.root, file);
    const objectId = createHash("sha1").update(`blob ${now.bytes.length}\0`).update(now.bytes).digest("hex");
    const mode = ((await lstat(path.join(repo.root, file))).mode & 0o111) ? "100755" : "100644";
    requireThat(objectId === match[2] && mode === match[1], "SUCCESSOR_INPUT_BYTES_DRIFT");
    records.push({ path: file, mode, rawSha256: sha256(now.bytes) });
  }
  // Long historical pathnames make ordinary macOS TMPDIR roots unsuitable.
  const base = await realpath("/tmp");
  const owned = await mkdtemp(path.join(base, "LS-"));
  requireThat(!owned.startsWith(`${repo.root}/`) && owned !== repo.root, "SUCCESSOR_SNAPSHOT_INSIDE_REPOSITORY");
  try {
    const git = spawn("/usr/bin/git", [...repo.gitArgs, "archive", "--format=tar", repo.head, "--", ...[...selectors].filter(selector => records.some(row => row.path === selector || row.path.startsWith(`${selector}/`))).sort()], { cwd: repo.root, env: cleanChildEnvironment(), stdio: ["ignore", "pipe", "ignore"], timeout: 60000 });
    const tar = spawn("/usr/bin/tar", ["-xf", "-", "-C", owned], { env: cleanChildEnvironment(), stdio: ["pipe", "ignore", "ignore"], timeout: 60000 });
    const gitDone = completed(git, "SUCCESSOR_SNAPSHOT_EXPORT_FAILED"), tarDone = completed(tar, "SUCCESSOR_SNAPSHOT_EXPORT_FAILED");
    git.stdout.on("error", () => tar.stdin.destroy()); tar.stdin.on("error", () => git.stdout.destroy());
    git.stdout.pipe(tar.stdin);
    const archiveResults = await Promise.allSettled([gitDone, tarDone]);
    const failedArchive = archiveResults.find(result => result.status === "rejected");
    if (failedArchive) throw failedArchive.reason;
    // The frozen v2 Git helper intentionally drops inherited Git environment.
    // Give it private metadata and a read-only alternate object store instead.
    const metadata = path.join(owned, ".git");
    execFileSync("/usr/bin/git", ["init", "-q", "--bare", metadata], { env: cleanChildEnvironment(), stdio: "ignore" });
    const common = repo.git("rev-parse", "--path-format=absolute", "--git-common-dir").toString().trim();
    const objects = await realpath(path.join(common, "objects"));
    await writeFile(path.join(metadata, "objects", "info", "alternates"), `${objects}\n`, { flag: "wx", mode: 0o600 });
    await writeFile(path.join(metadata, "HEAD"), `${repo.head}\n`, { mode: 0o600 });
    for (const row of registry.resolutions) for (const resolutionCommit of row.resolutionCommits) repo.ancestor(resolutionCommit, executionCommit);
    const config = { records, executionCommit, observerManifest: { targetBaselineCommit: m.targetBaselineCommit, legacyResolution: m.legacyResolution, liveReachability: m.liveReachability } };
    const input = path.join(owned, "observer-input.json"); await writeFile(input, `${JSON.stringify(config)}\n`, { flag: "wx", mode: 0o600 });
    const worker = fileURLToPath(new URL("./observer.mjs", import.meta.url));
    const bytes = execFileSync(process.execPath, [worker, owned, input], {
      cwd: owned, env: cleanChildEnvironment(), timeout: 60000, maxBuffer: 32 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"]
    });
    const value = parsePromotionWorkflowJsonBytes(bytes);
    requireThat(value.result === "pass" && value.liveAllowed === false, value.code ?? "SUCCESSOR_OBSERVER_FAILED");
    return value;
  } finally { await rm(owned, { recursive: true }); }
}

async function historicalFinalization(repo, m, history) {
  const closure = history.closure.value;
  const artifacts = {};
  for (const [key, ref] of Object.entries(closure.artifacts)) {
    artifacts[key] = { path: ref.path, ...await historicalJson(repo, m.historical.commit, ref) };
    await repo.working(ref.path, ref.rawSha256);
  }
  validateV2ShadowClosure(closure, artifacts);
  validateV2LifecycleRegistry(history.lifecycle.value, { manifest: artifacts.manifest, evidenceIndex: artifacts.evidenceIndex, closure, closurePath: m.historical.closure.path, closureArtifacts: artifacts });
  const a = artifacts.manifest.value, b = history.manifest.value;
  for (const key of ["candidateDigest", "sourceCommit", "checkerVersion"]) requireThat(a[key] === b[key], "SUCCESSOR_HISTORICAL_PARENT_IDENTITY_DRIFT");
  requireThat(stableJson(a.checkerRelease) === stableJson(b.checkerRelease), "SUCCESSOR_HISTORICAL_CHECKER_DRIFT");
  const release = b.checkerRelease;
  const ledger = await historicalJson(repo, m.historical.commit, { path: release.ledgerPath, rawSha256: release.ledgerRawSha256 });
  await repo.working(release.ledgerPath, release.ledgerRawSha256);
  const matches = ledger.value.entries.filter(x => x.version === release.version);
  requireThat(matches.length === 1 && matches[0].releaseCommit === release.releaseCommit && matches[0].bundleDigest === release.bundleDigest && stableJson(matches[0].bundlePaths) === stableJson(PROMOTION_V2_CHECKER_BUNDLE_PATHS), "SUCCESSOR_HISTORICAL_RELEASE_INVALID");
  repo.ancestor(release.releaseCommit, m.historical.commit);
  for (const file of PROMOTION_V2_CHECKER_BUNDLE_PATHS) requireThat((await repo.working(file)).bytes.equals(repo.blob(release.releaseCommit, file).bytes), "SUCCESSOR_HISTORICAL_RELEASE_REWRITTEN");
  const workflowBlob = repo.blob(m.historical.commit, ".github/workflows/promotion-shadow.yml");
  const text = new TextDecoder("utf-8", { fatal: true }).decode(workflowBlob.bytes);
  const document = YAML.parseDocument(text, { uniqueKeys: true, maxAliasCount: 0 });
  requireThat(document.errors.length === 0, "SUCCESSOR_HISTORICAL_WORKFLOW_INVALID");
  const selected = document.toJS().jobs?.["promotion-shadow-gate"]?.env;
  requireThat(selected?.PROMOTION_MANIFEST === m.historical.manifest.path && selected?.PROMOTION_CANONICAL_RECEIPT === m.historical.receipt.path, "SUCCESSOR_HISTORICAL_SELECTOR_INVALID");
  return { closureDigest: closure.closureDigest, registryDigest: history.lifecycle.value.registryDigest, scope: "historical-only", authorityTransferred: false };
}

export function assertEvidenceOnlyDelta(repo, baseline, head) {
  const files = repo.git("diff", "--name-only", baseline, head).toString().trim().split("\n").filter(Boolean);
  requireThat(files.every(file => file.startsWith(`${ROOT}/`)), "SUCCESSOR_PROTECTED_BASELINE_DRIFT");
}

export async function validateAttempt(root, manifestPath, { allowStoredReceipt = false } = {}) {
  const repo = await repository(root);
  requireThat(repo.git("status", "--porcelain=v1", "--untracked-files=all").length === 0, "SUCCESSOR_WORKTREE_DIRTY");
  requireThat(manifestPath === `${ROOT}/attempt-008/promotion-manifest.v1.json`, "SUCCESSOR_MANIFEST_PATH_INVALID");
  const manifestFile = await repo.working(manifestPath);
  const m = validateManifest(parsePromotionWorkflowJsonBytes(manifestFile.bytes));
  repo.ancestor(m.targetBaselineCommit, m.evidenceIndex.evidenceCommit); repo.ancestor(m.evidenceIndex.evidenceCommit, repo.head);
  const bindingRows = repo.git("log", "--format=%H", "--diff-filter=A", "--", manifestPath).toString().trim().split("\n");
  requireThat(bindingRows.length === 1 && COMMIT.test(bindingRows[0]), "SUCCESSOR_BINDING_HISTORY_INVALID");
  const executionCommit = bindingRows[0];
  const parents = repo.git("rev-list", "--parents", "-n", "1", executionCommit).toString().trim().split(" ");
  requireThat(parents.length === 2 && parents[1] === m.evidenceIndex.evidenceCommit, "SUCCESSOR_EVIDENCE_ORDER_INVALID");
  const descriptorAdds = repo.git("log", "--format=%H", "--diff-filter=A", "--", m.descriptor.path).toString().trim().split("\n");
  requireThat(descriptorAdds.length === 1 && descriptorAdds[0] === executionCommit, "SUCCESSOR_ATOMIC_BINDING_REQUIRED");
  const boundStatus = repo.git("diff-tree", "--no-commit-id", "--name-status", "-r", executionCommit, "--", manifestPath, m.descriptor.path).toString().trim().split("\n");
  requireThat(boundStatus.length === 2 && boundStatus.every(row => row.startsWith("A\t")), "SUCCESSOR_ATOMIC_BINDING_REQUIRED");
  for (const file of [manifestPath, m.descriptor.path]) {
    const frozen = repo.blob(executionCommit, file), now = await repo.working(file);
    requireThat(frozen.objectId === now.objectId && frozen.mode === now.mode, "SUCCESSOR_BINDING_BYTES_DRIFT");
  }
  const descriptorBytes = await repo.working(m.descriptor.path);
  const descriptor = { value: parsePromotionWorkflowJsonBytes(descriptorBytes.bytes) };
  validateDescriptor(descriptor.value, m, { path: manifestPath, rawSha256: manifestFile.rawSha256 });
  const receiptAtExecution = repo.git("ls-tree", "-z", executionCommit, "--", m.canonicalReceiptPath);
  requireThat(receiptAtExecution.length === 0, "SUCCESSOR_FUTURE_RECEIPT_ALREADY_BOUND");
  const receiptAtHead = repo.git("ls-tree", "-z", repo.head, "--", m.canonicalReceiptPath);
  requireThat(allowStoredReceipt || receiptAtHead.length === 0, "SUCCESSOR_RECEIPT_STORAGE_CHECKOUT");
  requireThat(allowStoredReceipt || repo.head === executionCommit, "SUCCESSOR_EXECUTION_CHECKOUT_REQUIRED");
  assertEvidenceOnlyDelta(repo, m.targetBaselineCommit, repo.head);
  const authority = await collectAuthority(repo, m);
  const schema = await loadSchemas(repo); schema("manifest", m); schema("successor", descriptor.value);
  repo.ancestor(m.source.commonBaseCommit, m.source.importCommit); repo.ancestor(m.source.commonBaseCommit, m.targetBaselineCommit); repo.ancestor(m.source.reviewedSourceCommit, m.targetBaselineCommit);
  const importedDelta = repo.git("diff", "--name-only", m.source.commonBaseCommit, m.source.importCommit).toString().trim().split("\n").sort();
  requireThat(stableJson(importedDelta) === stableJson(SOURCE_PATHS), "SUCCESSOR_IMPORT_DELTA_INVALID");
  for (const imported of m.source.importedPaths) {
    const blob = repo.blob(m.source.importCommit, imported.path);
    requireThat(blob.objectId === imported.objectId && blob.mode === imported.mode && sha256(blob.bytes) === imported.rawSha256, "SUCCESSOR_IMPORT_BLOB_INVALID");
  }
  // The reviewed source commit includes any fresh QA repair after exact import.
  const currentPack = await repo.working(PACK, m.candidate.rawSha256);
  const reviewedPack = repo.blob(m.source.reviewedSourceCommit, PACK);
  requireThat(reviewedPack.bytes.equals(currentPack.bytes), "SUCCESSOR_REVIEWED_SOURCE_DRIFT");
  for (const file of SOURCE_PATHS) requireThat(repo.blob(m.source.reviewedSourceCommit, file).bytes.equals((await repo.working(file)).bytes), "SUCCESSOR_REVIEWED_SOURCE_DRIFT");
  const originalBlob = repo.blob(m.source.commonBaseCommit, PACK);
  requireThat(sha256(originalBlob.bytes) === m.source.originalPack.rawSha256, "SUCCESSOR_ORIGINAL_DIGEST_INVALID");
  const delta = contentDelta(parsePromotionWorkflowJsonBytes(originalBlob.bytes), parsePromotionWorkflowJsonBytes(currentPack.bytes));
  requireThat(stableJson(delta.changedIds) === stableJson(m.successor.changedIds) && delta.changeDigest === m.successor.changeDigest, "SUCCESSOR_CONTENT_DIFF_BINDING_INVALID");
  repo.ancestor(m.historical.commit, m.targetBaselineCommit);
  const historical = {};
  for (const key of ["manifest", "receipt", "registry", "closure", "lifecycle"]) {
    historical[key] = await historicalJson(repo, m.historical.commit, m.historical[key]);
    const now = await repo.working(m.historical[key].path, m.historical[key].rawSha256);
    requireThat(now.bytes.equals(historical[key].bytes), "SUCCESSOR_HISTORY_REWRITTEN");
  }
  requireThat(historical.manifest.value.legacyResolution.registryPath === m.historical.registry.path && historical.manifest.value.legacyResolution.rawSha256 === m.historical.registry.rawSha256 && historical.receipt.value.manifest.rawSha256 === m.historical.manifest.rawSha256, "SUCCESSOR_HISTORICAL_LINEAGE_INVALID");
  await historicalFinalization(repo, m, historical);
  const registry = await currentJson(repo, { path: m.legacyResolution.registryPath, rawSha256: m.legacyResolution.rawSha256 });
  assertRegistrySuccessor(historical.registry.value, registry.value, m);
  const evidenceIndex = await currentJson(repo, { path: m.evidenceIndex.path, rawSha256: m.evidenceIndex.rawSha256 });
  exact(evidenceIndex.value, ["schemaVersion", "entries"]);
  requireThat(evidenceIndex.value.schemaVersion === "promotion-legacy-successor-evidence-index.v1" && stableJson(evidenceIndex.value.entries.map(x => x.role)) === stableJson(ROLES), "SUCCESSOR_EVIDENCE_INDEX_INVALID");
  const evidence = [], independentSessions = new Set();
  for (const ref of evidenceIndex.value.entries) {
    exact(ref, ["role", "path", "rawSha256"]);
    const bound = await currentJson(repo, { path: ref.path, rawSha256: ref.rawSha256 });
    const reviewed = repo.blob(m.evidenceIndex.evidenceCommit, ref.path);
    requireThat(reviewed.bytes.equals(bound.bytes), "SUCCESSOR_EVIDENCE_COMMIT_INVALID");
    schema("evidence", bound.value); const record = validateEvidence(bound.value, m, delta); requireThat(record.role === ref.role, "SUCCESSOR_EVIDENCE_ROLE_INVALID");
    const report = await repo.working(record.report.path, record.report.rawSha256);
    requireThat(repo.blob(m.evidenceIndex.evidenceCommit, record.report.path).bytes.equals(report.bytes), "SUCCESSOR_REPORT_COMMIT_INVALID");
    if (["A18", "A11", "A23"].includes(record.role)) independentSessions.add(record.reviewer.sessionId);
    if (record.role === "A22") {
      requireThat(repo.git("rev-parse", `${record.details.sourceCommit}^{tree}`).toString().trim() === record.details.sourceTree, "SUCCESSOR_BUILD_TREE_INVALID");
      requireThat(sha256(repo.git("ls-tree", "-r", "-z", record.details.sourceCommit)) === record.details.sourceArchiveDigest, "SUCCESSOR_BUILD_INVENTORY_INVALID");
      const log = await repo.working(record.details.buildLog.path, record.details.buildLog.rawSha256);
      requireThat(repo.blob(m.evidenceIndex.evidenceCommit, record.details.buildLog.path).bytes.equals(log.bytes), "SUCCESSOR_BUILD_LOG_BINDING_INVALID");
    }
    evidence.push(record);
  }
  requireThat(independentSessions.size === 3, "SUCCESSOR_REVIEWER_COLLISION");
  await currentJson(repo, { path: m.liveReachability.compatibilityManifestPath, rawSha256: m.liveReachability.compatibilityManifestRawSha256 });
  const runtime = await sealedRuntimeProof(repo, m, registry.value, executionCommit);
  requireThat(runtime.proof.resolutionCount === 18 && runtime.proof.approvedProjectionCount === 3 && runtime.proof.dereachedCount === 15 && runtime.proof.liveAllowed === false, "SUCCESSOR_RUNTIME_DISPOSITION_INVALID");
  requireThat(repo.git("rev-parse", "HEAD").toString().trim() === repo.head && repo.git("status", "--porcelain=v1", "--untracked-files=all").length === 0, "SUCCESSOR_INPUT_MUTATED_DURING_RUN");
  await collectAuthority(repo, m);
  const proof = {
    manifest: { path: manifestPath, rawSha256: manifestFile.rawSha256 }, executionCommit,
    sourceCommit: m.source.reviewedSourceCommit, importedSourceCommit: m.source.importCommit, targetBaselineCommit: m.targetBaselineCommit,
    candidateDigest: currentPack.rawSha256, checkerVersion: VERSION, checkerBundleDigest: authority.bundleDigest, checkerReleaseCommit: authority.releaseCommit,
    changeDigest: delta.changeDigest, changedRowCount: 22, unchangedRowCount: 1478, wholePackAccepted: false,
    runtimePolicyDigest: runtime.proof.runtimePolicyDigest, legacyProofDigest: runtime.proof.resolutionProofsDigest,
    sourceSnapshotDigest: runtime.sourceSnapshotDigest, dependenciesDigest: authority.dependenciesDigest,
    evidenceRecordCount: evidence.length, independentReviewSessionCount: 3, coordinatorRoleRecordCount: 2,
    historicalAuthorityTransferred: false, historicalClosureOverwritten: false, lifecycleState: "shadow_ready", liveAllowed: false
  };
  return { schemaVersion: "promotion-legacy-successor-validation.v1", result: "pass", proof, proofDigest: fingerprint(proof), liveAllowed: false };
}

export async function observePreparation(root, historicalManifest) {
  const repo = await repository(root);
  const compatibility = await readAuthoritativeFile(root, historicalManifest.liveReachability.compatibilityManifestPath);
  const value = parsePromotionWorkflowJsonBytes(compatibility.bytes);
  const policy = projectV2RuntimePolicy(await observeCanonicalRuntimePolicy(root, value));
  const audit = await auditCanonicalLegacyConflictUnion(root, value);
  return { expectedRuntimePolicy: policy, canonicalAudit: audit, canonicalAuditDigest: audit.auditDigest };
}

export async function shadowAttempt(root, manifestPath, runId) {
  requireThat(/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u.test(runId), "SUCCESSOR_RUN_ID_INVALID");
  const validation = await validateAttempt(root, manifestPath);
  const physicalTemp = await realpath(tmpdir());
  requireThat(!physicalTemp.startsWith(`${root}/`) && physicalTemp !== root, "SUCCESSOR_TEMP_INSIDE_REPOSITORY");
  const owned = await mkdtemp(path.join(physicalTemp, "mais-legacy-successor-"));
  let outputDigest, outputRehearsed = false, rolledBack = false;
  try {
    const bytes = Buffer.from(stableJson({ candidateDigest: validation.proof.candidateDigest, changedRowCount: 22, disposition: "de-reached", liveAllowed: false }));
    const output = path.join(owned, "nonlive-review-packet.json");
    await writeFile(output, bytes, { flag: "wx", mode: 0o600 });
    requireThat((await readFile(output)).equals(bytes), "SUCCESSOR_OUTPUT_REHEARSAL_FAILED"); outputDigest = sha256(bytes); outputRehearsed = true;
  } finally {
    await rm(owned, { recursive: true });
    try { await lstat(owned); } catch (error) { if (error.code === "ENOENT") rolledBack = true; else throw error; }
  }
  requireThat(outputRehearsed && rolledBack, "SUCCESSOR_TEMP_ROLLBACK_UNPROVEN");
  const after = await validateAttempt(root, manifestPath);
  requireThat(validation.proofDigest === after.proofDigest, "SUCCESSOR_SHADOW_INPUT_DRIFT");
  // Zero external effects are a frozen capability-boundary proof: only fixed
  // read-only Git, local tar export, the read-only worker and owned-temp IO are
  // reachable. Candidates/app/provider code are never loaded or executed.
  const capabilityPolicyDigest = fingerprint({ checkerBundleDigest: validation.proof.checkerBundleDigest, dependenciesDigest: validation.proof.dependenciesDigest, policy: "fixed-readonly-subprocesses-and-owned-temp.v1", inheritedSecrets: false, liveAllowed: false });
  const semantics = { ...validation.proof, outputDigest, capabilityPolicyDigest, externalSideEffects: { network: 0, provider: 0, database: 0, deployment: 0, production: 0 }, temporaryOutputRehearsed: outputRehearsed, temporaryRollbackOnly: rolledBack, lifecycleState: "shadow_ready", liveAllowed: false };
  const receipt = { schemaVersion: "promotion-legacy-successor-receipt.v1", result: "pass", mode: "shadow", run: { id: runId, producedAt: new Date().toISOString() }, semantics, semanticDigest: fingerprint(semantics), liveAllowed: false };
  receipt.selfDigest = fingerprint(receipt);
  return verifyReceiptShape(receipt);
}

export function verifyReceiptShape(receipt) {
  const validator = new Ajv2020({ strict: true }).compile(parsePromotionWorkflowJsonBytes(readFileSync(receiptSchemaPath)));
  requireThat(validator(receipt), "SUCCESSOR_CLOSED_SCHEMA_INVALID");
  exact(receipt, ["schemaVersion", "result", "mode", "run", "semantics", "semanticDigest", "liveAllowed", "selfDigest"]);
  requireThat(receipt.schemaVersion === "promotion-legacy-successor-receipt.v1" && receipt.result === "pass" && receipt.mode === "shadow" && receipt.liveAllowed === false && receipt.semantics.liveAllowed === false && receipt.semantics.wholePackAccepted === false && receipt.semantics.historicalAuthorityTransferred === false && receipt.semantics.lifecycleState === "shadow_ready", "SUCCESSOR_RECEIPT_INVALID");
  exact(receipt.run, ["id", "producedAt"]); requireThat(UTC.test(receipt.run.producedAt) && Number.isFinite(Date.parse(receipt.run.producedAt)) && new Date(receipt.run.producedAt).toISOString() === receipt.run.producedAt, "SUCCESSOR_RECEIPT_RUN_INVALID");
  requireThat(fingerprint(receipt.semantics) === receipt.semanticDigest, "SUCCESSOR_RECEIPT_SEMANTIC_DIGEST_INVALID");
  const { selfDigest, ...body } = receipt; requireThat(fingerprint(body) === selfDigest, "SUCCESSOR_RECEIPT_SELF_DIGEST_INVALID");
  return receipt;
}

export async function verifyStoredReceipt(root, receiptPath, storageCommit, expectedRawSha256) {
  assertSafeRepoRelativePath(receiptPath); commit(storageCommit); hash(expectedRawSha256);
  const repo = await repository(root);
  requireThat(storageCommit !== repo.head, "SUCCESSOR_RECEIPT_EXECUTION_STORAGE_COLLISION"); repo.ancestor(repo.head, storageCommit);
  const stored = repo.blob(storageCommit, receiptPath);
  requireThat(sha256(stored.bytes) === expectedRawSha256, "SUCCESSOR_RECEIPT_TRANSPORT_DIGEST_INVALID");
  const receipt = verifyReceiptShape(parsePromotionWorkflowJsonBytes(stored.bytes));
  requireThat(receipt.semantics.executionCommit === repo.head, "SUCCESSOR_RECEIPT_EXECUTION_CHECKOUT_REQUIRED");
  const validation = await validateAttempt(root, receipt.semantics.manifest.path);
  requireThat(receiptPath === `${ROOT}/attempt-008/promotion-shadow-receipt.v1.json`, "SUCCESSOR_RECEIPT_STORAGE_PATH_INVALID");
  for (const [key, value] of Object.entries(validation.proof)) requireThat(stableJson(receipt.semantics[key]) === stableJson(value), "SUCCESSOR_RECEIPT_BINDING_INVALID");
  const replay = await shadowAttempt(root, receipt.semantics.manifest.path, `${receipt.run.id}-verify`);
  requireThat(receipt.semanticDigest === replay.semanticDigest, "SUCCESSOR_RECEIPT_REPLAY_MISMATCH");
  return { schemaVersion: "promotion-legacy-successor-verification.v1", result: "pass", semanticDigest: receipt.semanticDigest, receiptRawSha256: expectedRawSha256, storageCommit, executionCommit: repo.head, liveAllowed: false };
}
