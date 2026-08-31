#!/usr/bin/env node

import { createHash } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import { lstat, open, realpath } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildPromotionRequiredCheckDecision,
  collectCurrentHeadSemanticProof,
  collectGithubDiffEvidence,
  collectTrackedPromotionAuthorities,
  parseStrictDecisionJson,
  verifyPromotionRequiredCheckDecision
} from "./promotion-required-check-semantic-rescope.mjs";
import { parsePromotionWorkflowJsonBytes } from "./promotion-workflow-json-guard.mjs";

const MAX_ARTIFACT_BYTES = 32 * 1024 * 1024;
const MODES = new Set(["evaluate", "verify"]);
const REQUIRED_OPTIONS = Object.freeze([
  "repo",
  "event-name",
  "event-path",
  "manifest",
  "canonical-receipt-path",
  "current-validation",
  "fresh-receipt",
  "replay-receipt",
  "canonical-receipt-copy",
  "fresh-verification",
  "replay-verification",
  "canonical-verification",
  "decision",
  "artifact-root"
]);

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map((entry) => stableJson(entry)).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function parseArgs(argv) {
  const [mode, ...rest] = argv;
  if (!MODES.has(mode) || rest.length % 2 !== 0) throw new Error("PROMOTION_REQUIRED_CHECK_USAGE_INVALID");
  const options = {};
  for (let index = 0; index < rest.length; index += 2) {
    const flag = rest[index];
    const value = rest[index + 1];
    if (!flag.startsWith("--") || value === undefined || value === "" || Object.hasOwn(options, flag.slice(2))) {
      throw new Error("PROMOTION_REQUIRED_CHECK_USAGE_INVALID");
    }
    options[flag.slice(2)] = value;
  }
  const actual = Object.keys(options).sort();
  const expected = [...REQUIRED_OPTIONS].sort();
  if (stableJson(actual) !== stableJson(expected)) throw new Error("PROMOTION_REQUIRED_CHECK_USAGE_INVALID");
  return { mode, options };
}

async function readRegularBytes(filePath) {
  if (typeof filePath !== "string" || !path.isAbsolute(filePath) || filePath.includes("\0")) {
    throw new Error("PROMOTION_EXTERNAL_ARTIFACT_UNSAFE");
  }
  const before = await lstat(filePath, { bigint: true });
  if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1n || before.size <= 0n || before.size > BigInt(MAX_ARTIFACT_BYTES)) {
    throw new Error("PROMOTION_EXTERNAL_ARTIFACT_UNSAFE");
  }
  if (await realpath(filePath) !== filePath) throw new Error("PROMOTION_EXTERNAL_ARTIFACT_UNSAFE");
  const noFollow = typeof fsConstants.O_NOFOLLOW === "number" ? fsConstants.O_NOFOLLOW : 0;
  const handle = await open(filePath, fsConstants.O_RDONLY | noFollow);
  try {
    const openedBefore = await handle.stat({ bigint: true });
    if (openedBefore.dev !== before.dev || openedBefore.ino !== before.ino || openedBefore.size !== before.size) {
      throw new Error("PROMOTION_EXTERNAL_ARTIFACT_UNSAFE");
    }
    const bytes = await handle.readFile();
    const openedAfter = await handle.stat({ bigint: true });
    const after = await lstat(filePath, { bigint: true });
    if (
      openedAfter.dev !== openedBefore.dev ||
      openedAfter.ino !== openedBefore.ino ||
      openedAfter.size !== openedBefore.size ||
      openedAfter.mtimeNs !== openedBefore.mtimeNs ||
      after.dev !== openedBefore.dev ||
      after.ino !== openedBefore.ino ||
      after.size !== openedBefore.size ||
      after.mtimeNs !== openedBefore.mtimeNs ||
      after.nlink !== 1n ||
      after.isSymbolicLink()
    ) {
      throw new Error("PROMOTION_EXTERNAL_ARTIFACT_UNSAFE");
    }
    return bytes;
  } finally {
    await handle.close();
  }
}

async function readStrictJson(filePath) {
  return parsePromotionWorkflowJsonBytes(await readRegularBytes(filePath));
}

async function resolveDecisionPath(options) {
  const artifactRoot = await realpath(options["artifact-root"]);
  const outputPath = options.decision;
  if (
    artifactRoot !== options["artifact-root"] ||
    !path.isAbsolute(outputPath) ||
    path.dirname(outputPath) !== artifactRoot ||
    path.basename(outputPath) !== "promotion-required-check-decision.v1.json"
  ) {
    throw new Error("PROMOTION_DECISION_OUTPUT_UNSAFE");
  }
  return outputPath;
}

async function collectEvidence(options) {
  const repoRoot = await realpath(options.repo);
  if (repoRoot !== options.repo) throw new Error("PROMOTION_REPOSITORY_PATH_UNSAFE");
  const eventBytes = await readRegularBytes(options["event-path"]);
  const githubEvidence = await collectGithubDiffEvidence({
    repoRoot,
    eventName: options["event-name"],
    eventBytes
  });
  const authorities = await collectTrackedPromotionAuthorities({
    repoRoot,
    manifestPath: options.manifest,
    canonicalReceiptPath: options["canonical-receipt-path"]
  });
  const semanticProof = await collectCurrentHeadSemanticProof({
    repoRoot,
    manifestPath: options.manifest,
    exactHead: githubEvidence.head
  });
  const currentValidation = await readStrictJson(options["current-validation"]);
  const receipts = {
    fresh: await readStrictJson(options["fresh-receipt"]),
    replay: await readStrictJson(options["replay-receipt"]),
    canonical: await readStrictJson(options["canonical-receipt-copy"])
  };
  const verifications = {
    fresh: await readStrictJson(options["fresh-verification"]),
    replay: await readStrictJson(options["replay-verification"]),
    canonical: await readStrictJson(options["canonical-verification"])
  };
  return {
    githubEvidence,
    authorities,
    semanticProof,
    currentValidation,
    receiptEvidence: {
      manifestPath: receipts.canonical.manifest?.path,
      manifestRawSha256: receipts.canonical.manifest?.rawSha256,
      receipts,
      verifications
    }
  };
}

function safeFailureCode(error) {
  const candidate = typeof error?.code === "string" ? error.code : error?.message;
  return typeof candidate === "string" && /^[A-Z][A-Z0-9_]{2,95}$/u.test(candidate)
    ? candidate
    : "PROMOTION_REQUIRED_CHECK_INTERNAL";
}

function buildFailureDecision(error) {
  const payload = {
    schemaVersion: "promotion-required-check-error.v1",
    result: "blocked",
    code: safeFailureCode(error),
    errorDigest: sha256(String(error?.code ?? error?.message ?? "unknown")),
    permissions: {
      liveAllowed: false,
      integrationAllowed: false,
      previewAllowed: false,
      deployAllowed: false
    }
  };
  return { ...payload, decisionDigest: sha256(stableJson(payload)) };
}

async function writeDecisionExclusive(options, decision) {
  const outputPath = await resolveDecisionPath(options);
  const handle = await open(outputPath, "wx", 0o600);
  try {
    await handle.writeFile(`${stableJson(decision)}\n`, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
  const entry = await lstat(outputPath, { bigint: true });
  if (!entry.isFile() || entry.isSymbolicLink() || entry.nlink !== 1n || (entry.mode & 0o777n) !== 0o600n) {
    throw new Error("PROMOTION_DECISION_OUTPUT_UNSAFE");
  }
}

export async function evaluateFromPaths(options) {
  try {
    return buildPromotionRequiredCheckDecision(await collectEvidence(options));
  } catch (error) {
    return buildFailureDecision(error);
  }
}

export async function verifyFromPaths(options) {
  const decision = parseStrictDecisionJson(await readRegularBytes(await resolveDecisionPath(options)));
  const evidence = await collectEvidence(options);
  if (!verifyPromotionRequiredCheckDecision(decision, evidence) || decision.result !== "pass") {
    throw new Error("PROMOTION_REQUIRED_CHECK_DECISION_REJECTED");
  }
  return decision;
}

async function main() {
  const { mode, options } = parseArgs(process.argv.slice(2));
  if (mode === "evaluate") {
    const decision = await evaluateFromPaths(options);
    await writeDecisionExclusive(options, decision);
    return;
  }
  await verifyFromPaths(options);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${safeFailureCode(error)}\n`);
    process.exitCode = 1;
  });
}
