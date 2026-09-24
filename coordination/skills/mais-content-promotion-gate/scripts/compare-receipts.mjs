#!/usr/bin/env node

import { lstat, readFile, realpath } from "node:fs/promises";
import { parse, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import {
  discoverTrustedReceiptSchema,
  fingerprint,
  sha256,
  strictJsonParse,
  summarizeVerifiedReceipt,
} from "./discover-promotion-gate.mjs";

const MAX_FILE_BYTES = 32 * 1024 * 1024;

function fail(code, message, internal = false) {
  throw Object.assign(new Error(message), { code, ...(internal ? { internal: true } : {}) });
}

function printHelp() {
  process.stdout.write(`Usage: node scripts/compare-receipts.mjs --repo ROOT --manifest REPO_PATH --canonical FILE --fresh FILE --replay FILE\n\nOffline, read-only comparison of three native Promotion Receipts. The closed Receipt\nschema is never caller-selected: it is discovered from the tracked/current selected\nManifest, its raw-bound checker ledger entry, immutable checker release bundle, and\nthat bundle's exact Git-bound schema. The comparator then applies the schema plus a\nversion-independent Promotion governance envelope and recomputes every digest.\nProduction, deploy, approval, live, or nonzero side-effect claims are rejected. Run\nIDs must be distinct; raw digests may differ.\n\nExit codes:\n  0  all passing bindings and recomputed semantic digests agree\n  1  native failure, binding mismatch, replay reuse, or semantic mismatch\n  2  blocked, unsafe, malformed, or untrusted authority input\n  3  internal filesystem or Git read failure\n`);
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") return { help: true };
    if (["--repo", "--manifest", "--canonical", "--fresh", "--replay"].includes(arg)) {
      const value = argv[++index];
      if (typeof value !== "string" || value.length === 0) fail("USAGE_INVALID", `${arg} requires a path`);
      options[arg.slice(2)] = value;
    } else {
      fail("USAGE_INVALID", "unsupported argument");
    }
  }
  if (![options.repo, options.manifest, options.canonical, options.fresh, options.replay].every((value) => typeof value === "string" && value.length > 0)) {
    fail("USAGE_INVALID", "repo, selected Manifest, and all three Receipt paths are required");
  }
  return options;
}

async function resolveNoSymlinkReceipt(pathValue, label) {
  if (
    typeof pathValue !== "string" ||
    pathValue.length === 0 ||
    pathValue.length > 1_000 ||
    pathValue.includes("\0") ||
    pathValue.split(/[\\/]/u).includes("..")
  ) {
    fail("UNSAFE_INPUT_PATH", `${label} path is unsafe`);
  }
  const absolute = resolve(pathValue);
  const root = parse(absolute).root;
  const relativeParts = absolute.slice(root.length).split(sep).filter(Boolean);
  let cursor = root;
  for (let index = 0; index < relativeParts.length; index += 1) {
    cursor = resolve(cursor, relativeParts[index]);
    let stat;
    try {
      stat = await lstat(cursor);
    } catch {
      fail("INPUT_READ_FAILED", `${label} cannot be read`, true);
    }
    if (stat.isSymbolicLink()) fail("SYMLINK_COMPONENT_FORBIDDEN", `${label} contains a symlink component`);
    if (index < relativeParts.length - 1 && !stat.isDirectory()) fail("UNSAFE_INPUT_FILE", `${label} has a non-directory component`);
    if (index === relativeParts.length - 1 && (!stat.isFile() || stat.size > MAX_FILE_BYTES)) {
      fail("UNSAFE_INPUT_FILE", `${label} is not a bounded regular file`);
    }
  }
  const resolvedReal = await realpath(absolute);
  if (resolvedReal !== absolute) fail("SYMLINK_COMPONENT_FORBIDDEN", `${label} does not resolve canonically`);
  return absolute;
}

async function loadReceipt(pathValue, label) {
  const absolute = await resolveNoSymlinkReceipt(pathValue, label);
  let bytes;
  try {
    bytes = await readFile(absolute);
  } catch {
    fail("INPUT_READ_FAILED", `${label} cannot be read`, true);
  }
  let value;
  try {
    value = strictJsonParse(bytes, `${label} Receipt`);
  } catch (error) {
    if (error?.code === "JSON_DUPLICATE_KEY") throw error;
    fail("JSON_MALFORMED", `${label} is malformed JSON`);
  }
  return { label, value, receiptSha256: sha256(bytes) };
}

// Pure comparison is intentionally lower-level: callers must supply the exact schema
// artifact returned by trusted repository discovery. It is not a public authority CLI.
export function compareReceiptValues(canonicalArtifact, freshArtifact, replayArtifact, options = {}) {
  if (options.schemaArtifact?.authorityVerified !== true || typeof options.schemaArtifact?.authority !== "object") fail("RECEIPT_SCHEMA_AUTHORITY_REQUIRED", "comparison requires a trusted discovered schema artifact");
  const summarized = [canonicalArtifact, freshArtifact, replayArtifact].map((artifact) => summarizeVerifiedReceipt(artifact, { schema: options.schemaArtifact.schema }));
  if (summarized.some((item) => item.result === "blocked")) {
    return { exitCode: 2, result: "blocked", issues: [{ code: "NATIVE_RECEIPT_BLOCKED" }] };
  }
  if (summarized.some((item) => item.result !== "pass")) {
    return { exitCode: 1, result: "fail", issues: [{ code: "NATIVE_RECEIPT_NOT_PASS" }] };
  }

  const runIdsDistinct = new Set(summarized.map((item) => item.runIdDigest)).size === 3;
  const bindingDigests = summarized.map((item) => item.digest.bindingDigest);
  const semanticDigests = summarized.map((item) => item.digest.semanticDigest);
  const rawDigests = summarized.map((item) => item.digest.rawDigest);
  const bindingsEqual = new Set(bindingDigests).size === 1;
  const semanticDigestsEqual = new Set(semanticDigests).size === 1;
  const rawDigestsEqual = new Set(rawDigests).size === 1;
  const semanticDigestsVerified = summarized.every((item) => item.digest.semanticDigestVerified === true);
  const issues = [];
  if (options.trustedBindingProjection && summarized.some((item) => JSON.stringify(item.bindingProjection) !== JSON.stringify(options.trustedBindingProjection))) {
    fail("BINDING_MISMATCH", "Receipt binding differs from the trusted workflow-selected Manifest and canonical execution projection");
  }
  if (!runIdsDistinct) issues.push({ code: "RUN_ID_NOT_DISTINCT" });
  if (!bindingsEqual) issues.push({ code: "RECEIPT_BINDING_MISMATCH" });
  if (!semanticDigestsVerified) issues.push({ code: "SEMANTIC_RECEIPT_UNVERIFIED" });
  if (!semanticDigestsEqual) issues.push({ code: "SEMANTIC_RECEIPT_MISMATCH" });
  return {
    exitCode: issues.length === 0 ? 0 : 1,
    result: issues.length === 0 ? "pass" : "fail",
    issues,
    comparison: {
      canonical: summarized[0].digest,
      fresh: summarized[1].digest,
      replay: summarized[2].digest,
      bindingsEqual,
      semanticDigestsEqual,
      rawDigestsEqual,
      runIdsDistinct,
      semanticDigestsVerified,
      comparisonDigest: fingerprint({
        bindingDigests,
        semanticDigests,
        rawDigests,
        runIdDigests: summarized.map((item) => item.runIdDigest),
      }),
      comparisonStatus: issues.length === 0 ? "pass" : "fail",
    },
  };
}

export function projectRedactedSchemaAuthority(authority) {
  return {
    repositoryHead: authority.repositoryHead,
    manifest: { rawSha256: authority.manifestSha256, gitObject: authority.manifestGitBlob, gitMode: authority.manifestGitMode },
    ledger: { rawSha256: authority.ledgerRawSha256, gitObject: authority.ledgerGitBlob, gitMode: authority.ledgerGitMode },
    schema: { rawSha256: authority.schemaRawSha256, gitObject: authority.schemaGitBlob, gitMode: authority.schemaGitMode },
    canonicalReceipt: {
      rawSha256: authority.canonicalReceiptRawSha256,
      rawDigest: authority.canonicalReceiptRawDigest,
      gitObject: authority.canonicalReceiptGitBlob,
      gitMode: authority.canonicalReceiptGitMode,
    },
    checker: {
      releaseCommit: authority.checkerReleaseCommit,
      releaseEntryDigest: authority.checkerReleaseEntryDigest,
      bundleDigest: authority.checkerBundleDigest,
      releaseCommitAncestorOfHead: authority.releaseCommitAncestorOfHead,
    },
    comparator: {
      kind: authority.comparatorKind,
      workflowSha256: authority.comparatorWorkflowSha256,
      workflowGitObject: authority.comparatorWorkflowGitBlob,
      workflowGitMode: authority.comparatorWorkflowGitMode,
      programSha256: authority.comparatorProgramSha256,
      entrySha256: authority.comparatorEntrySha256,
    },
    executionCommit: authority.executionCommit,
    manifestBindingDigest: authority.manifestBindingDigest,
  };
}

async function main(argv = process.argv.slice(2)) {
  let options;
  try {
    options = parseArgs(argv);
  } catch (error) {
    process.stdout.write(`${JSON.stringify({ tool: "compare-promotion-receipts", result: "blocked", issues: [{ code: error.code ?? "USAGE_INVALID" }] })}\n`);
    return 2;
  }
  if (options.help) {
    printHelp();
    return 0;
  }
  try {
    const trusted = await discoverTrustedReceiptSchema(options.repo, options.manifest);
    const suppliedArtifacts = await Promise.all([
      loadReceipt(options.canonical, "canonical"),
      loadReceipt(options.fresh, "fresh"),
      loadReceipt(options.replay, "replay"),
    ]);
    const expectedCanonical = resolve(trusted.repoRoot, trusted.receiptSelector);
    if (resolve(options.canonical) !== expectedCanonical) fail("CANONICAL_RECEIPT_AUTHORITY_MISMATCH", "canonical Receipt is not the tracked workflow-selected artifact");
    if (suppliedArtifacts[0].receiptSha256 !== trusted.canonicalReceiptIdentity.rawSha256) fail("CANONICAL_RECEIPT_AUTHORITY_MISMATCH", "supplied canonical Receipt bytes differ from the tracked workflow-selected artifact");
    const result = compareReceiptValues(...suppliedArtifacts, {
      schemaArtifact: { schema: trusted.receiptSchema, authority: trusted.authority, authorityVerified: true },
      trustedBindingProjection: trusted.manifestBindingProjection,
    });
    process.stdout.write(`${JSON.stringify({
      tool: "compare-promotion-receipts",
      contract: "EvidenceEnvelopeV1+Promotion-v1",
      authoritative: false,
      redaction: {
        protectedContentIncluded: false,
        credentialsIncluded: false,
        rawProviderResponsesIncluded: false,
      },
      schemaAuthority: projectRedactedSchemaAuthority(trusted.authority),
      result: result.result,
      issues: result.issues,
      ...(result.comparison ? { comparison: result.comparison } : {}),
    })}\n`);
    return result.exitCode;
  } catch (error) {
    const internal = error?.internal === true;
    process.stdout.write(`${JSON.stringify({
      tool: "compare-promotion-receipts",
      result: internal ? "internal-error" : "blocked",
      issues: [{ code: error?.code ?? "UNEXPECTED_INTERNAL_FAILURE" }],
    })}\n`);
    return internal ? 3 : 2;
  }
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  main().then((code) => { process.exitCode = code; });
}
