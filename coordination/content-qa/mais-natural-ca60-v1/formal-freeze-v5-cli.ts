#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  jcsHash,
} from "../../research/mais-natural-ca60-v1/versions/design-v5/design-contract.mjs";
import {
  runCaliforniaFormalFreezeV5,
} from "./formal-freeze-v5";
import {
  persistCaliforniaFormalFreezeV5,
} from "./formal-freeze-v5-storage";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "../../..");
const APPROVED_READINESS_SOURCE_COMMIT = "bd44971158979b5e31acf5bf0b1fabc360c9a53a";
const REPOSITORY_IDENTITY = "HUDongpin/MAIS-MVP";

export const FORMAL_FREEZE_RUNTIME_SOURCE_PATHS_V5 = Object.freeze([
  "data/generated-content/ccss-textbook-practice-v1/question-pack.json",
  "data/generated-content/us-ca-k5-knowledge-point-practice-v1/question-pack.json",
  "data/generated-content/us-ca-math-g6-g12-generated-bank-v2-1500/question-pack.json",
  "data/generated-content/us-ca-math-k-g5-generated-bank-v3-deepseek-1500/question-pack.json",
  "data/generated-content/us-ca-math-k-g5-textbooks-v1/lessons.json",
  "data/usCaliforniaKnowledgePoints.ts",
  "data/usCaliforniaMathematicalPractices.ts",
  "data/usCaliforniaMicroLessons.ts",
  "data/usCaliforniaPracticeFigures.ts",
  "data/usCaliforniaQuestions.ts",
  "data/usCaliforniaTopics.ts",
  "lib/curriculumProfile.ts",
  "lib/difficulty.ts",
  "lib/server/answerMatching.ts",
  "lib/server/hongKongBaseQuestions.ts",
  "lib/server/questionStore.ts",
  "types/index.ts",
]);

export const FORMAL_FREEZE_RUNNER_SOURCE_PATHS_V5 = Object.freeze([
  "coordination/content-qa/mais-natural-ca60-v1/clustering-audit.mjs",
  "coordination/content-qa/mais-natural-ca60-v1/formal-freeze-v5-cli.ts",
  "coordination/content-qa/mais-natural-ca60-v1/formal-freeze-v5-storage.ts",
  "coordination/content-qa/mais-natural-ca60-v1/formal-freeze-v5.ts",
  "coordination/content-qa/mais-natural-ca60-v1/frame-readiness-v5.ts",
  "coordination/content-qa/mais-natural-ca60-v1/question-store-source.ts",
  "coordination/content-qa/mais-natural-ca60-v1/runtime-extractor.ts",
  "coordination/content-qa/mais-natural-ca60-v1/sample-contract-v5.mjs",
  "coordination/content-qa/mais-natural-ca60-v1/schemas/NaturalCaFormalFreezeCustodyManifestV1.schema.json",
  "coordination/content-qa/mais-natural-ca60-v1/schemas/NaturalCaFormalFreezeReceiptV1.schema.json",
  "coordination/content-qa/mais-natural-ca60-v1/schemas/NaturalCaV5SourceEnumerationHashErratumV1.schema.json",
  "coordination/content-qa/mais-natural-ca60-v1/source-enumeration-hash-erratum-v5.mjs",
  "coordination/research/mais-natural-ca60-v1/errata/2026-08-26-v5-source-enumeration-hash/erratum.json",
  "coordination/research/mais-natural-ca60-v1/owner-decisions/2026-08-26-frame-rights-lineage/build-owner-decision.mjs",
  "coordination/research/mais-natural-ca60-v1/owner-decisions/2026-08-26-frame-rights-lineage/owner-decision-receipt.json",
  "coordination/research/mais-natural-ca60-v1/versions/design-v2/design-contract.mjs",
  "coordination/research/mais-natural-ca60-v1/versions/design-v4/sample-contract.mjs",
  "coordination/research/mais-natural-ca60-v1/versions/design-v5/design-contract.mjs",
  "coordination/research/mais-natural-ca60-v1/versions/design-v5/design-registration.json",
]);

const OWNER_DECISION_PATH = path.join(
  REPO_ROOT,
  "coordination/research/mais-natural-ca60-v1/owner-decisions/2026-08-26-frame-rights-lineage/owner-decision-receipt.json",
);
const SOURCE_ENUMERATION_HASH_ERRATUM_PATH = path.join(
  REPO_ROOT,
  "coordination/research/mais-natural-ca60-v1/errata/2026-08-26-v5-source-enumeration-hash/erratum.json",
);

function git(args: string[], encoding: BufferEncoding | null = "utf8") {
  return execFileSync("git", args, {
    cwd: REPO_ROOT,
    encoding,
    maxBuffer: 256 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function sha256(bytes: Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex");
}

function committedEntry(sourceCommit: string, repoRelativePath: string) {
  const gitBlobOid = String(git(["rev-parse", `${sourceCommit}:${repoRelativePath}`])).trim();
  const bytes = git(["show", `${sourceCommit}:${repoRelativePath}`], null) as Buffer;
  return { repoRelativePath, gitBlobOid, byteLength: bytes.byteLength, sha256: sha256(bytes) };
}

function entryHash(entries: Array<{ repoRelativePath: string; gitBlobOid: string; byteLength: number; sha256: string }>, paths: string[]) {
  const allowed = new Set(paths);
  return jcsHash(entries.filter((entry) => allowed.has(entry.repoRelativePath)));
}

export function buildCommittedFormalFreezeRunnerIdentityV5() {
  const sourceCommit = String(git(["rev-parse", "HEAD"])).trim();
  if (!/^[0-9a-f]{40}$/u.test(sourceCommit)) throw new Error("exact source commit is unavailable");
  const status = String(git(["status", "--porcelain", "--untracked-files=all"]));
  if (status.length > 0) throw new Error("clean exact-SHA worktree is required for formal frame/sample freeze");
  const objectType = String(git(["cat-file", "-t", sourceCommit])).trim();
  if (objectType !== "commit") throw new Error("formal freeze source object is not a commit");

  const sourceModuleEntries = FORMAL_FREEZE_RUNTIME_SOURCE_PATHS_V5.map((repoRelativePath) => (
    committedEntry(sourceCommit, repoRelativePath)
  ));
  const sourceClosureParityEntries = sourceModuleEntries.map((current) => {
    const approved = committedEntry(APPROVED_READINESS_SOURCE_COMMIT, current.repoRelativePath);
    if (approved.gitBlobOid !== current.gitBlobOid || approved.sha256 !== current.sha256) {
      throw new Error(`owner-bound runtime source closure drift at ${current.repoRelativePath}`);
    }
    return {
      repoRelativePath: current.repoRelativePath,
      approvedReadinessGitBlobOid: approved.gitBlobOid,
      currentGitBlobOid: current.gitBlobOid,
      contentSha256: current.sha256,
    };
  });
  const runnerEntries = FORMAL_FREEZE_RUNNER_SOURCE_PATHS_V5.map((repoRelativePath) => (
    committedEntry(sourceCommit, repoRelativePath)
  ));
  const runnerHash = jcsHash(runnerEntries);
  const formalCorePaths = [
    "coordination/content-qa/mais-natural-ca60-v1/formal-freeze-v5.ts",
    "coordination/content-qa/mais-natural-ca60-v1/sample-contract-v5.mjs",
  ];
  const publicProjectionPaths = [
    "coordination/content-qa/mais-natural-ca60-v1/question-store-source.ts",
    "lib/curriculumProfile.ts",
    "lib/server/questionStore.ts",
    "data/usCaliforniaQuestions.ts",
  ];
  const extractorPaths = [
    "coordination/content-qa/mais-natural-ca60-v1/formal-freeze-v5.ts",
    "coordination/content-qa/mais-natural-ca60-v1/runtime-extractor.ts",
  ];
  const clusteringPaths = [
    "coordination/content-qa/mais-natural-ca60-v1/clustering-audit.mjs",
    "coordination/content-qa/mais-natural-ca60-v1/sample-contract-v5.mjs",
  ];
  const allEntries = [...sourceModuleEntries, ...runnerEntries];
  return Object.freeze({
    sourceCommit,
    runnerCommit: sourceCommit,
    runnerHash,
    sourceModuleFiles: sourceModuleEntries.map(({ repoRelativePath, gitBlobOid }) => ({ repoRelativePath, gitBlobOid })),
    sourceClosureParityHash: jcsHash(sourceClosureParityEntries),
    approvedReadinessSourceCommit: APPROVED_READINESS_SOURCE_COMMIT,
    implementationHashes: Object.freeze({
      converterImplementationHash: jcsHash(sourceModuleEntries),
      normalizationImplementationHash: entryHash(allEntries, formalCorePaths),
      publicProjectionImplementationHash: entryHash(allEntries, publicProjectionPaths),
      dependencyClosureExtractorImplementationHash: runnerEntries.find(({ repoRelativePath }) => (
        repoRelativePath.endsWith("formal-freeze-v5-cli.ts")
      ))!.sha256,
      scannerImplementationHash: runnerEntries.find(({ repoRelativePath }) => (
        repoRelativePath.endsWith("frame-readiness-v5.ts")
      ))!.sha256,
      clusteringAlgorithmHash: jcsHash({
        implementationEntriesHash: entryHash(allEntries, clusteringPaths),
        lineageRuleHash: "8130bcd70f3e42332478a284b5a5b54e0c73b9f3696b1c1c06f25254ea0fe449",
        nearDuplicateThresholds: { character3GramJaccard: 0.90, normalizedEditSimilarity: 0.92 },
      }),
      extractorImplementationHash: entryHash(allEntries, extractorPaths),
    }),
  });
}

export function parseFormalFreezeStartedAt(argv: string[]) {
  if (argv.length !== 2 || argv[0] !== "--started-at") {
    throw new TypeError("usage: formal-freeze-v5-cli.ts --started-at RFC3339_UTC_WITH_MILLISECONDS");
  }
  const value = argv[1];
  if (!Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value) {
    throw new TypeError("started-at must be canonical RFC3339 UTC with milliseconds");
  }
  return value;
}

export async function runFormalFreezeCliV5({ argv = [] }: { argv?: string[] } = {}) {
  const startedAt = parseFormalFreezeStartedAt(argv);
  const identity = buildCommittedFormalFreezeRunnerIdentityV5();
  const ownerDecisionReceipt = JSON.parse(await readFile(OWNER_DECISION_PATH, "utf8"));
  const sourceEnumerationHashErratum = JSON.parse(await readFile(SOURCE_ENUMERATION_HASH_ERRATUM_PATH, "utf8"));
  const bundle = await runCaliforniaFormalFreezeV5({
    ...identity,
    repositoryIdentity: REPOSITORY_IDENTITY,
    ownerDecisionReceipt,
    sourceEnumerationHashErratum,
    startedAt,
  });
  const outputRoot = path.join(
    REPO_ROOT,
    ".local",
    "mais-natural-ca60-v1",
    "formal-freeze-v5",
    identity.sourceCommit,
  );
  const persistence = await persistCaliforniaFormalFreezeV5({ outputRoot, bundle });
  return Object.freeze({
    schemaVersion: "NaturalCaFormalFreezeCliResultV1",
    ok: true,
    receipt: persistence.publicReceipt,
    persistence: Object.freeze({
      protectedFileCount: persistence.protectedFileCount,
      custodyManifestHash: persistence.custodyManifestHash,
      finalFormalFreezeReceiptHash: persistence.finalFormalFreezeReceiptHash,
      runCompletionHash: persistence.runCompletionHash,
      providerRequestCount: 0,
      credentialReadCount: 0,
      naturalQuestionEgressCount: 0,
    }),
  });
}

async function main() {
  const result = await runFormalFreezeCliV5({ argv: process.argv.slice(2) });
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error: unknown) => {
    process.stderr.write(`${JSON.stringify({
      schemaVersion: "NaturalCaFormalFreezeCliFailureV1",
      status: "FORMAL_FRAME_SAMPLE_FREEZE_FAILED_CLOSED",
      providerRequestCount: 0,
      credentialReadCount: 0,
      naturalQuestionEgressCount: 0,
      naturalQuestionResultCount: 0,
      redactedError: error instanceof Error ? error.name : "UnknownError",
    })}\n`);
    process.exitCode = 1;
  });
}
