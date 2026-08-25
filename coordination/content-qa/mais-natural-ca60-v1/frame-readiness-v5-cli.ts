#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

import {
  jcsHash,
} from "../../research/mais-natural-ca60-v1/versions/design-v5/design-contract.mjs";
import {
  persistProtectedFrameReadinessV5,
  runCaliforniaFrameReadinessV5,
} from "./frame-readiness-v5";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "../../..");
const RUNNER_SOURCE_PATHS = Object.freeze([
  "coordination/content-qa/mais-natural-ca60-v1/frame-readiness-v5-cli.ts",
  "coordination/content-qa/mais-natural-ca60-v1/frame-readiness-v5.ts",
  "coordination/content-qa/mais-natural-ca60-v1/clustering-audit.mjs",
  "coordination/content-qa/mais-natural-ca60-v1/question-store-source.ts",
  "coordination/content-qa/mais-natural-ca60-v1/runtime-extractor.ts",
  "coordination/research/mais-natural-ca60-v1/versions/design-v4/sample-contract.mjs",
  "coordination/research/mais-natural-ca60-v1/versions/design-v5/design-contract.mjs",
]);

function git(args: string[], encoding: BufferEncoding | null = "utf8") {
  return execFileSync("git", args, {
    cwd: REPO_ROOT,
    encoding,
    maxBuffer: 128 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function sha256(bytes: Buffer) {
  return createHash("sha256").update(bytes).digest("hex");
}

export function buildCommittedFrameRunnerIdentityV5() {
  const sourceCommit = String(git(["rev-parse", "HEAD"])).trim();
  if (!/^[0-9a-f]{40}$/u.test(sourceCommit)) throw new Error("exact source commit is unavailable");
  const status = String(git(["status", "--porcelain", "--untracked-files=all"]));
  if (status.length > 0) throw new Error("clean exact-SHA worktree is required");
  const entries = RUNNER_SOURCE_PATHS.map((repoRelativePath) => {
    const gitBlobOid = String(git(["rev-parse", `${sourceCommit}:${repoRelativePath}`])).trim();
    const bytes = git(["show", `${sourceCommit}:${repoRelativePath}`], null) as Buffer;
    return { repoRelativePath, gitBlobOid, byteLength: bytes.byteLength, sha256: sha256(bytes) };
  });
  return Object.freeze({
    sourceCommit,
    runnerCommit: sourceCommit,
    entries,
    runnerHash: jcsHash(entries),
  });
}

export function parseCreatedAt(argv: string[]) {
  if (argv.length !== 2 || argv[0] !== "--created-at" || !Number.isFinite(Date.parse(argv[1]))) {
    throw new TypeError("usage: frame-readiness-v5-cli.ts --created-at RFC3339_UTC_WITH_MILLISECONDS");
  }
  if (new Date(argv[1]).toISOString() !== argv[1]) {
    throw new TypeError("created-at must be canonical RFC3339 UTC with milliseconds");
  }
  return argv[1];
}

export async function runFrameReadinessCliV5({ argv = [] }: { argv?: string[] } = {}) {
  const createdAt = parseCreatedAt(argv);
  const identity = buildCommittedFrameRunnerIdentityV5();
  const outputRoot = path.join(
    REPO_ROOT,
    ".local",
    "mais-natural-ca60-v1",
    "frame-readiness-v5",
    identity.sourceCommit,
  );
  const result = await runCaliforniaFrameReadinessV5({
    sourceCommit: identity.sourceCommit,
    runnerCommit: identity.runnerCommit,
    runnerHash: identity.runnerHash,
    createdAt,
  });
  const persistence = await persistProtectedFrameReadinessV5({ outputRoot, result });
  return Object.freeze({
    schemaVersion: "NaturalCaFrameReadinessCliResultV1",
    ok: true,
    receipt: persistence.receipt,
    ownerDecisionRequest: persistence.ownerDecisionRequest,
    persistence: Object.freeze({
      custodyManifestHash: persistence.custodyManifestHash,
      persistedReceiptHash: persistence.persistedReceiptHash,
      ownerDecisionRequestHash: persistence.ownerDecisionRequestHash,
      runCompletionHash: persistence.runCompletionHash,
      providerRequestCount: 0,
    }),
  });
}

async function main() {
  const result = await runFrameReadinessCliV5({ argv: process.argv.slice(2) });
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error: unknown) => {
    process.stderr.write(`${JSON.stringify({
      schemaVersion: "NaturalCaFrameReadinessCliFailureV1",
      status: "FRAME_READINESS_FAILED_CLOSED",
      providerRequestCount: 0,
      credentialReadCount: 0,
      naturalQuestionEgressCount: 0,
      redactedError: error instanceof Error ? error.name : "UnknownError",
    })}\n`);
    process.exitCode = 1;
  });
}
