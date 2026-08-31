import { createHash } from "node:crypto";
import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";

import { assertSafeRepoRelativePath, stableJson } from "../coordination/integration/promotion-gate-lib.mjs";
import { parsePromotionWorkflowJsonBytes } from "./promotion-workflow-json-guard.mjs";

export const PROMOTION_REQUIRED_CHECK_SEMANTIC_RESCOPE_SCHEMA =
  "promotion-required-check-semantic-rescope.v1";

const COMMIT = /^[a-f0-9]{40}$/u;
const SHA256 = /^[a-f0-9]{64}$/u;
const STATIC_PROMOTION_CONTROLLED_PATHS = Object.freeze([
  ".github/workflows/promotion-shadow.yml",
  "package.json",
  "package-lock.json"
]);
const execFile = promisify(execFileCallback);
const GIT_EXECUTABLE = "/usr/bin/git";
const GIT_ENV = Object.freeze({
  PATH: "/usr/bin:/bin",
  GIT_CONFIG_NOSYSTEM: "1",
  GIT_TERMINAL_PROMPT: "0",
  LC_ALL: "C"
});

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function result(input, code, details = {}) {
  const decision = {
    schemaVersion: PROMOTION_REQUIRED_CHECK_SEMANTIC_RESCOPE_SCHEMA,
    result: code === "historical_pilot_intact_semantic_runtime_safe" ? "pass" : "blocked",
    code,
    liveAllowed: false,
    binding: details.binding ?? null,
    promotionControlledPathCount: details.promotionControlledPathCount ?? 0,
    graph: details.graph ?? null,
    reviewQueue: details.reviewQueue ?? [],
    decisionDigest: ""
  };
  const digestPayload = structuredClone(decision);
  delete digestPayload.decisionDigest;
  decision.decisionDigest = sha256(stableJson(digestPayload));
  return decision;
}

function assertCommit(value, code) {
  if (typeof value !== "string" || !COMMIT.test(value)) throw new Error(code);
}

function assertDigest(value, code) {
  if (typeof value !== "string" || !SHA256.test(value)) throw new Error(code);
}

function safePath(value) {
  try {
    assertSafeRepoRelativePath(value);
    return value;
  } catch {
    throw new Error("PROMOTION_PATH_INVALID");
  }
}

function codePointCompare(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function normalizePromotionChangedPaths(rawNul) {
  if (typeof rawNul !== "string" || (rawNul.length > 0 && !rawNul.endsWith("\0"))) {
    throw new Error("GITHUB_DIFF_PATHS_INVALID");
  }
  const paths = rawNul.length === 0 ? [] : rawNul.slice(0, -1).split("\0");
  const exact = new Set();
  const folded = new Set();
  for (const entry of paths) {
    safePath(entry);
    const lowered = entry.toLocaleLowerCase("en-US");
    if (exact.has(entry) || folded.has(lowered)) throw new Error("GITHUB_DIFF_PATHS_INVALID");
    exact.add(entry);
    folded.add(lowered);
  }
  return [...exact].sort(codePointCompare);
}

export function parseStrictGithubEventJson(bytes) {
  const event = parsePromotionWorkflowJsonBytes(bytes);
  const actual = event !== null && typeof event === "object" && !Array.isArray(event)
    ? Object.keys(event).sort(codePointCompare)
    : [];
  if (stableJson(actual) !== stableJson(["base", "head", "number"])) throw new Error("GITHUB_EVENT_INVALID");
  if (!Number.isSafeInteger(event.number) || event.number < 1) throw new Error("GITHUB_EVENT_INVALID");
  for (const key of ["base", "head"]) {
    if (event[key] === null || typeof event[key] !== "object" || Array.isArray(event[key]) ||
      stableJson(Object.keys(event[key]).sort(codePointCompare)) !== stableJson(["sha"])) {
      throw new Error("GITHUB_EVENT_INVALID");
    }
    assertCommit(event[key].sha, "GITHUB_EVENT_INVALID");
  }
  return event;
}

export function parseStrictGithubPushEventJson(bytes) {
  const event = parsePromotionWorkflowJsonBytes(bytes);
  const actual = event !== null && typeof event === "object" && !Array.isArray(event)
    ? Object.keys(event).sort(codePointCompare)
    : [];
  if (stableJson(actual) !== stableJson(["after", "before", "ref"])) throw new Error("GITHUB_EVENT_INVALID");
  assertCommit(event.before, "GITHUB_EVENT_INVALID");
  assertCommit(event.after, "GITHUB_EVENT_INVALID");
  if (event.ref !== "refs/heads/main") throw new Error("GITHUB_EVENT_INVALID");
  return event;
}

function parseGithubEventEnvelope(bytes, eventName) {
  const value = parsePromotionWorkflowJsonBytes(bytes);
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error("GITHUB_EVENT_INVALID");
  if (eventName === "pull_request") {
    const pullRequest = value.pull_request;
    const normalized = {
      number: value.number,
      base: pullRequest?.base,
      head: pullRequest?.head
    };
    return parseStrictGithubEventJson(Buffer.from(JSON.stringify(normalized), "utf8"));
  }
  if (eventName === "push") {
    const normalized = { before: value.before, after: value.after, ref: value.ref };
    return parseStrictGithubPushEventJson(Buffer.from(JSON.stringify(normalized), "utf8"));
  }
  throw new Error("GITHUB_EVENT_INVALID");
}

async function runReadonlyGit({ repoRoot, args }) {
  try {
    const { stdout } = await execFile(GIT_EXECUTABLE, args, {
      cwd: repoRoot,
      shell: false,
      timeout: 10_000,
      maxBuffer: 4 * 1024 * 1024,
      env: GIT_ENV,
      encoding: "buffer"
    });
    return Buffer.from(stdout);
  } catch {
    throw new Error("GITHUB_GIT_EVIDENCE_UNAVAILABLE");
  }
}

async function gitBytes(runner, repoRoot, args) {
  const value = await runner({ repoRoot, args: Object.freeze([...args]), executable: GIT_EXECUTABLE });
  if (!Buffer.isBuffer(value) && !(value instanceof Uint8Array)) throw new Error("GITHUB_GIT_EVIDENCE_UNAVAILABLE");
  return Buffer.from(value);
}

function singleGitLine(bytes, code) {
  const value = bytes.toString("utf8");
  if (!value.endsWith("\n") || value.slice(0, -1).includes("\n")) throw new Error(code);
  return value.slice(0, -1);
}

export async function collectGithubDiffEvidence({ repoRoot, eventName, eventBytes, _gitRunner = runReadonlyGit }) {
  if (typeof repoRoot !== "string" || !Buffer.isBuffer(eventBytes)) throw new Error("GITHUB_EVENT_INVALID");
  const event = parseGithubEventEnvelope(eventBytes, eventName);
  const base = eventName === "pull_request" ? event.base.sha : event.before;
  const head = eventName === "pull_request" ? event.head.sha : event.after;
  const checkoutHead = singleGitLine(await gitBytes(_gitRunner, repoRoot, ["rev-parse", "HEAD"]), "GITHUB_HEAD_BINDING_INVALID");
  assertCommit(checkoutHead, "GITHUB_HEAD_BINDING_INVALID");
  if (checkoutHead !== head) throw new Error("GITHUB_HEAD_BINDING_INVALID");
  const shallow = singleGitLine(await gitBytes(_gitRunner, repoRoot, ["rev-parse", "--is-shallow-repository"]), "GITHUB_DIFF_TRUNCATED");
  if (shallow !== "false") throw new Error("GITHUB_DIFF_TRUNCATED");
  await gitBytes(_gitRunner, repoRoot, ["cat-file", "-e", `${base}^{commit}`]);
  await gitBytes(_gitRunner, repoRoot, ["cat-file", "-e", `${head}^{commit}`]);
  await gitBytes(_gitRunner, repoRoot, ["merge-base", "--is-ancestor", base, head]);
  const diffArgs = ["diff", "--name-only", "--no-renames", "-z", base, head, "--"];
  const treeArgs = ["diff-tree", "--no-commit-id", "-r", "--name-only", "--no-renames", "-z", base, head, "--"];
  const diffBytes = await gitBytes(_gitRunner, repoRoot, diffArgs);
  const treeBytes = await gitBytes(_gitRunner, repoRoot, treeArgs);
  if (!diffBytes.equals(treeBytes)) throw new Error("GITHUB_DIFF_INCONSISTENT");
  const paths = normalizePromotionChangedPaths(diffBytes.toString("utf8"));
  return Object.freeze({
    eventName,
    pullRequestNumber: eventName === "pull_request" ? event.number : null,
    base,
    head,
    checkoutHead,
    shallow: false,
    ancestor: true,
    command: "git diff --name-only --no-renames -z <base> <head> --",
    diffBytes,
    paths
  });
}

function collectArtifactPaths(value, paths = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectArtifactPaths(item, paths);
  } else if (value !== null && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      if (key === "path") {
        if (typeof item !== "string") throw new Error("CANONICAL_BINDING_INVALID");
        safePath(item);
        paths.push(item);
      } else {
        collectArtifactPaths(item, paths);
      }
    }
  }
  return paths;
}

export function buildPromotionControlledPathUnion(canonicalIntegrity) {
  if (canonicalIntegrity === null || typeof canonicalIntegrity !== "object") {
    throw new Error("CANONICAL_BINDING_INVALID");
  }
  const union = new Set(STATIC_PROMOTION_CONTROLLED_PATHS);
  for (const key of ["manifest", "receipt", "checker", "evidence", "registry", "candidate", "approval"]) {
    const artifact = canonicalIntegrity[key];
    if (artifact === null || typeof artifact !== "object") throw new Error("CANONICAL_BINDING_INVALID");
    for (const artifactPath of collectArtifactPaths(artifact)) union.add(artifactPath);
    if (key !== "checker" && typeof artifact.bytes === "string") {
      for (const artifactPath of collectArtifactPaths(parsePromotionWorkflowJsonBytes(Buffer.from(artifact.bytes, "utf8")))) {
        union.add(artifactPath);
      }
    }
  }
  return [...union].sort(codePointCompare);
}

export function isPromotionControlledPath(filePath, canonicalIntegrity) {
  safePath(filePath);
  if (filePath.startsWith("scripts/promotion-") || filePath.startsWith("coordination/integration/")) return true;
  return buildPromotionControlledPathUnion(canonicalIntegrity).includes(filePath);
}

function validateCanonicalIntegrity(canonicalIntegrity) {
  const paths = buildPromotionControlledPathUnion(canonicalIntegrity);
  for (const key of ["manifest", "receipt", "checker", "evidence", "registry", "candidate", "approval"]) {
    const artifact = canonicalIntegrity[key];
    if (typeof artifact.bytes !== "string" || typeof artifact.rawSha256 !== "string") {
      throw new Error("CANONICAL_ARTIFACT_INVALID");
    }
    safePath(artifact.path);
    assertDigest(artifact.rawSha256, "CANONICAL_ARTIFACT_INVALID");
    if (sha256(artifact.bytes) !== artifact.rawSha256) throw new Error("CANONICAL_BYTE_DRIFT");
    if (key !== "checker") parsePromotionWorkflowJsonBytes(Buffer.from(artifact.bytes, "utf8"));
  }
  for (const key of ["replay", "verification"]) {
    const proof = canonicalIntegrity[key];
    if (proof?.result !== "pass") throw new Error("CANONICAL_REPLAY_OR_DIGEST_MISMATCH");
    assertDigest(proof.digest, "CANONICAL_REPLAY_OR_DIGEST_MISMATCH");
  }
  if (canonicalIntegrity.liveAllowed !== false) throw new Error("LIVE_ESCALATION_FORBIDDEN");
  return paths;
}

function validateGithub(github) {
  let base;
  let head;
  let pullRequestNumber = null;
  if (typeof github?.eventBytes !== "string") throw new Error("GITHUB_EVENT_INVALID");
  if (github?.eventName === "pull_request") {
    const event = parseStrictGithubEventJson(Buffer.from(github.eventBytes, "utf8"));
    if (stableJson(event) !== stableJson(github.pullRequest)) throw new Error("GITHUB_EVENT_INVALID");
    base = event.base.sha;
    head = event.head.sha;
    pullRequestNumber = event.number;
  } else if (github?.eventName === "push" && github.ref === "refs/heads/main") {
    const event = parseStrictGithubPushEventJson(Buffer.from(github.eventBytes, "utf8"));
    if (event.before !== github.before || event.after !== github.after || event.ref !== github.ref) {
      throw new Error("GITHUB_EVENT_INVALID");
    }
    base = event.before;
    head = event.after;
  } else {
    throw new Error("GITHUB_EVENT_INVALID");
  }
  assertCommit(github.checkoutHead, "GITHUB_HEAD_BINDING_INVALID");
  if (github.checkoutHead !== head) throw new Error("GITHUB_HEAD_BINDING_INVALID");
  const diff = github.diff;
  if (diff === null || typeof diff !== "object") throw new Error("GITHUB_DIFF_MISSING");
  if (diff.complete !== true || diff.shallow !== false) throw new Error("GITHUB_DIFF_TRUNCATED");
  if (diff.ancestor !== true) throw new Error("GITHUB_DIFF_ANCESTRY_INVALID");
  if (diff.base !== base || diff.head !== head) throw new Error("GITHUB_DIFF_INCONSISTENT");
  if (diff.command !== "git diff --name-only -z <base> <head> --") throw new Error("GITHUB_DIFF_INCONSISTENT");
  const paths = normalizePromotionChangedPaths(diff.rawNul);
  return { eventName: github.eventName, base, head, paths, pullRequestNumber };
}

function validateSemantic(semantic, head) {
  if (semantic?.result === "internal" || semantic?.scanAvailable !== true) {
    throw new Error("SEMANTIC_RUNTIME_SCAN_UNAVAILABLE");
  }
  if (semantic.exactHead !== head) throw new Error("SEMANTIC_HEAD_BINDING_INVALID");
  for (const key of [
    "nonliteralNextDynamic", "zeroBaselineLoaders", "alternateEntrypoints", "unknownClassifications"
  ]) if (!Number.isSafeInteger(semantic[key]) || semantic[key] !== 0) throw new Error("SEMANTIC_RUNTIME_SAFETY_FAILED");
  for (const key of ["selectedCandidateReachable", "legacyCandidateReachable", "approvedProjectionDrift", "canonicalConflictDrift"]) {
    if (semantic[key] !== false) throw new Error("SEMANTIC_RUNTIME_SAFETY_FAILED");
  }
}

function validateGraph(graph) {
  if (graph === null || typeof graph !== "object") throw new Error("GRAPH_DIGEST_UNAVAILABLE");
  assertDigest(graph.digest, "GRAPH_DIGEST_UNAVAILABLE");
  if (typeof graph.targetDrift !== "boolean") throw new Error("GRAPH_DIGEST_UNAVAILABLE");
  return structuredClone(graph);
}

function validateCurrentValidation(currentValidation) {
  if (currentValidation?.liveAllowed !== false) throw new Error("LIVE_ESCALATION_FORBIDDEN");
  if (currentValidation?.result === "pass") return;
  if (currentValidation?.result === "blocked" && ["V2_TARGET_BASELINE_DRIFT", "V2_RUNTIME_GRAPH_DRIFT"].includes(currentValidation?.code)) return;
  throw new Error("CURRENT_VALIDATION_UNACCEPTABLE");
}

export function evaluatePromotionRequiredCheckSemanticRescope(input) {
  try {
    const github = validateGithub(input?.github);
    validateCurrentValidation(input.currentValidation);
    const controlledPaths = validateCanonicalIntegrity(input.canonicalIntegrity);
    validateSemantic(input.semantic, github.head);
    const graph = validateGraph(input.graph);
    const promotionControlledPathCount = github.paths.filter((filePath) =>
      isPromotionControlledPath(filePath, input.canonicalIntegrity)
    ).length;
    const binding = {
      pullRequestNumber: github.pullRequestNumber,
      eventName: github.eventName,
      baseCommit: github.base,
      headCommit: github.head,
      changedPathsDigest: sha256(stableJson(github.paths)),
      canonicalPathUnionDigest: sha256(stableJson(controlledPaths))
    };
    if (promotionControlledPathCount > 0) {
      return result(input, graph.targetDrift
        ? "PROMOTION_CONTROLLED_GRAPH_DRIFT_FULL_VALIDATION_REQUIRED"
        : "PROMOTION_CONTROLLED_FULL_VALIDATION_REQUIRED", {
        binding, promotionControlledPathCount, graph, reviewQueue: ["A23", "A25"]
      });
    }
    return result(input, "historical_pilot_intact_semantic_runtime_safe", {
      binding, promotionControlledPathCount, graph, reviewQueue: ["A23", "A25"]
    });
  } catch (error) {
    return result(input, error instanceof Error ? error.message : "PROMOTION_REQUIRED_CHECK_INTERNAL");
  }
}

export function parseStrictDecisionJson(bytes) {
  const decision = parsePromotionWorkflowJsonBytes(bytes);
  const expectedKeys = [
    "schemaVersion", "result", "code", "liveAllowed", "binding", "promotionControlledPathCount",
    "graph", "reviewQueue", "decisionDigest"
  ].sort(codePointCompare);
  const actualKeys = decision !== null && typeof decision === "object" && !Array.isArray(decision)
    ? Object.keys(decision).sort(codePointCompare)
    : [];
  if (stableJson(actualKeys) !== stableJson(expectedKeys)) throw new Error("PROMOTION_DECISION_INVALID");
  if (decision?.schemaVersion !== PROMOTION_REQUIRED_CHECK_SEMANTIC_RESCOPE_SCHEMA ||
    typeof decision.decisionDigest !== "string" || !SHA256.test(decision.decisionDigest)) {
    throw new Error("PROMOTION_DECISION_INVALID");
  }
  const digestPayload = structuredClone(decision);
  delete digestPayload.decisionDigest;
  const expected = sha256(stableJson(digestPayload));
  if (decision.decisionDigest !== expected) throw new Error("PROMOTION_DECISION_DIGEST_MISMATCH");
  return decision;
}

export function canEnforcePromotionRequiredCheckSuccess(decision, evidence) {
  try {
    if (evidence === undefined) return false;
    const recomputed = evaluatePromotionRequiredCheckSemanticRescope(evidence);
    return decision?.result === "pass" &&
      decision?.code === "historical_pilot_intact_semantic_runtime_safe" &&
      decision?.liveAllowed === false &&
      Array.isArray(decision.reviewQueue) && decision.reviewQueue.includes("A23") && decision.reviewQueue.includes("A25") &&
      typeof decision.graph?.digest === "string" && SHA256.test(decision.graph.digest) &&
      parseStrictDecisionJson(Buffer.from(JSON.stringify(decision), "utf8")).result === "pass" &&
      recomputed.result === "pass" &&
      recomputed.decisionDigest === decision.decisionDigest &&
      recomputed.binding.baseCommit === decision.binding?.baseCommit &&
      recomputed.binding.headCommit === decision.binding?.headCommit &&
      recomputed.binding.changedPathsDigest === decision.binding?.changedPathsDigest;
  } catch {
    return false;
  }
}

export function assertRequiredWorkflowShape(workflow) {
  if (workflow === null || typeof workflow !== "object" || workflow.on === null || typeof workflow.on !== "object") {
    throw new Error("PROMOTION_WORKFLOW_INVALID");
  }
  if (Object.hasOwn(workflow.on, "workflow_dispatch")) throw new Error("PROMOTION_WORKFLOW_DISPATCH_FORBIDDEN");
  for (const trigger of Object.values(workflow.on)) {
    if (trigger !== null && typeof trigger === "object" && (Object.hasOwn(trigger, "paths") || Object.hasOwn(trigger, "paths-ignore"))) {
      throw new Error("PROMOTION_WORKFLOW_PATH_FILTER_FORBIDDEN");
    }
  }
  const job = workflow.jobs?.["promotion-shadow-gate"];
  if (job?.name !== "promotion-shadow-gate" || Object.hasOwn(job, "if")) {
    throw new Error("PROMOTION_REQUIRED_JOB_SKIPPABLE");
  }
}
