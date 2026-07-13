#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import { constants as fsConstants } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  compileOwnerPathspecManifest,
  resolveOwnerPath,
  validateOwnerPathspecManifest
} from "./release-package-gate.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const DEFAULT_REPORT_DIR = path.join(REPO_ROOT, "coordination", "release-intake");
const DEFAULT_OWNER_PATHSPECS = path.join(DEFAULT_REPORT_DIR, "owner-pathspecs.json");
const DEFAULT_LATEST_JSON = path.join(DEFAULT_REPORT_DIR, "latest-A25-dirty-tree-map.json");
const DEFAULT_LATEST_MARKDOWN = path.join(DEFAULT_REPORT_DIR, "latest-A25-dirty-tree-map.md");
const DEFAULT_REASON = "release hygiene dirty-tree refresh";
const MAX_GENERATED_OUTPUT_BYTES = 128 * 1024 * 1024;
const MAX_GENERATED_OUTPUT_BYTES_BIGINT = BigInt(MAX_GENERATED_OUTPUT_BYTES);
const MAX_GENERATED_OUTPUT_AGGREGATE_BYTES = 128 * 1024 * 1024;
const MAX_GENERATED_OUTPUT_AGGREGATE_BYTES_BIGINT = BigInt(
  MAX_GENERATED_OUTPUT_AGGREGATE_BYTES
);
const SAVED_OUTPUT_PATH_KEYS = [
  "latestJson",
  "latestMarkdown",
  "reportJson",
  "reportMarkdown"
];
const LATEST_ONLY_OUTPUT_PATH_KEYS = ["latestJson"];
const STATUS_COUNT_KEYS = [
  "collapsedStatusEntries",
  "expandedStatusEntries",
  "trackedModified",
  "trackedDeleted",
  "untrackedStatusEntries",
  "untrackedFiles",
  "unmappedEntries",
  "unblockedUnmappedEntries",
  "ambiguousOwnerEntries",
  "topSpecificityTies",
  "rawMultiMatchEntries",
  "secretQuarantineEntries"
];
const TIMESTAMPED_REPORT_NAME_PATTERN = /^((\d{4}-\d{2}-\d{2})-A25-dirty-tree-map-([a-zA-Z0-9._-]+))\.(json|md)$/;

const TRANSIENT_DIRTY_PATH_RULES = [
  /\.baiduyun\.uploading\.cfg$/
];

const SLICE_RULES = [
  [/^(?:\.vercelignore|playwright\.config\.ts|tsconfig\.next\.json|package(?:-lock)?\.json|next\.config\.ts|scripts\/(?:release-|deploy-vercel|prepare-vercel|cleanup-generated-artifacts|next-clean-build|refresh-dirty-tree-map))/, "release hygiene tooling/config"],
  [/^(?:tests\/e2e|.*\.test\.(?:ts|tsx|mjs|js)$)/, "tests/regression evidence"],
  [/^(?:coordination\/content-qa|data\/generated-content|data\/rag|lib\/rag|scripts\/(?:build-|audit-mainland|query-us-ca-private))/, "generated/content/RAG backlog"],
  [/^(?:coordination|README\.md|AGENTS\.md|docs|Technical-Review|video-plan)(?:\/|$)/, "docs/coordination evidence"],
  [/^(?:\.local|\.tmp|\.next|node_modules|private|Users)(?:\/|$)/, "local/generated quarantine"],
  [/^(?:app|components|data|lib|public|types|middleware\.ts)(?:\/|$)/, "runtime app/API/data/public"],
  [/^\.env/, "secret/env quarantine"]
];

function parseArgs(argv) {
  const options = {
    action: "write",
    json: false,
    noReport: false,
    runId: undefined,
    reason: DEFAULT_REASON,
    reportDir: DEFAULT_REPORT_DIR,
    ownerPathspecs: DEFAULT_OWNER_PATHSPECS,
    latestJson: process.env.MAIS_DIRTY_TREE_MAP_JSON
      ? resolveFromRepo(process.env.MAIS_DIRTY_TREE_MAP_JSON)
      : DEFAULT_LATEST_JSON,
    latestMarkdown: DEFAULT_LATEST_MARKDOWN,
    maxAgeMinutes: undefined
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--json") {
      options.json = true;
    } else if (arg === "--assert-current") {
      options.action = "assert-current";
    } else if (arg === "--no-report") {
      options.noReport = true;
    } else if (arg === "--run-id") {
      options.runId = argv[++index];
    } else if (arg === "--reason") {
      options.reason = argv[++index] ?? DEFAULT_REASON;
    } else if (arg === "--report-dir") {
      options.reportDir = resolveFromRepo(argv[++index]);
    } else if (arg === "--owner-pathspecs") {
      options.ownerPathspecs = resolveFromRepo(argv[++index]);
    } else if (arg === "--latest-json") {
      options.latestJson = resolveFromRepo(argv[++index]);
    } else if (arg === "--latest-md" || arg === "--latest-markdown") {
      options.latestMarkdown = resolveFromRepo(argv[++index]);
    } else if (arg === "--max-age-minutes") {
      options.maxAgeMinutes = parsePositiveNumber(argv[++index], "max age minutes");
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function resolveFromRepo(value) {
  if (!value) throw new Error("Expected a path value.");
  return path.isAbsolute(value) ? value : path.resolve(REPO_ROOT, value);
}

function parsePositiveNumber(value, label) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${label}: ${value}`);
  }
  return parsed;
}

async function loadOwnerPathspecs(filePath) {
  const manifest = JSON.parse(await fs.readFile(filePath, "utf8"));
  const validation = validateOwnerPathspecManifest(manifest);
  if (!validation.valid) {
    throw new Error(["Owner pathspec manifest is invalid:", ...validation.errors.map((error) => `- ${error}`)].join("\n"));
  }
  return compileOwnerPathspecManifest(manifest);
}

function gitOutput(args) {
  return execFileSync("git", args, {
    cwd: REPO_ROOT,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024
  });
}

function isTransientDirtyPath(filePath) {
  const normalized = toPosix(filePath);
  return TRANSIENT_DIRTY_PATH_RULES.some((pattern) => pattern.test(normalized));
}

function gitStatusEntries(args) {
  const records = gitOutput(args).split("\0");
  const entries = [];

  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    if (!record) continue;

    const status = record.slice(0, 2);
    const filePath = record.slice(3);
    const renameOrCopy = status.includes("R") || status.includes("C");
    const originalPath = renameOrCopy ? records[++index] : undefined;
    entries.push({
      status,
      path: toPosix(filePath),
      originalPath: originalPath ? toPosix(originalPath) : undefined
    });
  }

  return entries;
}

function gitNulPaths(args) {
  return gitOutput(args)
    .split("\0")
    .filter(Boolean)
    .map(toPosix);
}

function filterStatusEntries(entries) {
  return entries.filter((entry) => !isTransientDirtyPath(entry.path));
}

function filterPaths(paths) {
  return paths.filter((filePath) => !isTransientDirtyPath(filePath));
}

function classifyByRules(filePath, rules, fallback) {
  const normalized = toPosix(filePath);
  const match = rules.find(([pattern]) => pattern.test(normalized));
  return match?.[1] ?? fallback;
}

function classifyOwner(filePath, ownerConfig) {
  const resolution = resolveOwnerPath(filePath, ownerConfig);
  const resolved = resolution.status === "resolved";
  return {
    owner: resolved ? resolution.owner : resolution.status === "ambiguous" ? "Ambiguous owner resolution" : "Unmapped owner needed",
    ownerId: resolution.ownerId,
    packageId: resolution.packageId,
    matchedPathspec: resolution.matchedPathspec,
    secretQuarantine: resolution.secretQuarantine,
    resolvedSlice: resolution.slice,
    ownerResolution: {
      status: resolution.status,
      finalOwners: resolution.finalOwners,
      rawMatchCount: resolution.rawMatchCount,
      topCandidateCount: resolution.topCandidateCount,
      specificity: resolution.specificity,
      precedence: resolution.precedence,
      matchedPathspec: resolution.matchedPathspec
    }
  };
}

async function buildDirtyTreeMap(reason, ownerPathspecs, outputPaths = {}) {
  const ownerConfig = await loadOwnerPathspecs(ownerPathspecs);
  const ignoredStatusPaths = ignoredOutputPaths(outputPaths);
  const collapsedStatusEntries = filterStatusEntries(
    gitStatusEntries(["status", "--porcelain=v1", "-z"])
  ).filter((entry) => !ignoredStatusPaths.has(entry.path));
  const expandedStatusEntries = filterStatusEntries(
    gitStatusEntries(["status", "--porcelain=v1", "-z", "-uall"])
  ).filter((entry) => !ignoredStatusPaths.has(entry.path));
  const untrackedFiles = filterPaths(
    gitNulPaths(["ls-files", "--others", "--exclude-standard", "-z"])
  ).filter((filePath) => !ignoredStatusPaths.has(filePath));
  const entries = expandedStatusEntries.map((entry) => {
    const classification = classifyOwner(entry.path, ownerConfig);
    return {
      ...entry,
      ...classification,
      slice: classifyByRules(entry.path, SLICE_RULES, classification.resolvedSlice ?? "unmapped/manual")
    };
  });

  const trackedModified = collapsedStatusEntries.filter((entry) => entry.status !== "??" && !statusHasDeletion(entry)).length;
  const trackedDeleted = collapsedStatusEntries.filter((entry) => entry.status !== "??" && statusHasDeletion(entry)).length;
  const untrackedStatusEntries = collapsedStatusEntries.filter((entry) => entry.status === "??").length;
  const unmappedEntries = entries.filter((entry) => entry.ownerId === "UNMAPPED");
  const ambiguousOwnerEntries = entries.filter((entry) => entry.ownerId === "AMBIGUOUS");
  const rawMultiMatchEntries = entries.filter((entry) => entry.ownerResolution.rawMatchCount > 1);

  return {
    generatedAt: new Date().toISOString(),
    timezone: "Asia/Hong_Kong",
    sessions: [
      "A25 git hygiene and release intake",
      "A22 production reliability and release engineering",
      "A10 tooling, docs, and report"
    ],
    reason,
    statusSignature: hashStatusEntries(expandedStatusEntries),
    ownerPathspecs: toRepoRelativePath(ownerPathspecs),
    outputPaths: relativeOutputPaths(outputPaths),
    policy: ownerConfig.manifest.policy ?? {},
    statusCounts: {
      collapsedStatusEntries: collapsedStatusEntries.length,
      expandedStatusEntries: expandedStatusEntries.length,
      trackedModified,
      trackedDeleted,
      untrackedStatusEntries,
      untrackedFiles: untrackedFiles.length,
      unmappedEntries: unmappedEntries.length,
      unblockedUnmappedEntries: unmappedEntries.length,
      ambiguousOwnerEntries: ambiguousOwnerEntries.length,
      topSpecificityTies: ambiguousOwnerEntries.length,
      rawMultiMatchEntries: rawMultiMatchEntries.length,
      secretQuarantineEntries: entries.filter((entry) => entry.secretQuarantine).length
    },
    ownerBuckets: countBy(entries, "owner"),
    sliceBuckets: countBy(entries, "slice"),
    releaseHygieneEntries: entries.filter((entry) => entry.slice === "release hygiene tooling/config"),
    unmappedEntries,
    unblockedUnmappedEntries: unmappedEntries,
    ambiguousOwnerEntries,
    entries
  };
}

function ignoredOutputPaths(outputPaths) {
  return new Set(
    Object.values(outputPaths)
      .filter(Boolean)
      .map((value) => toRepoRelativePath(path.isAbsolute(value) ? value : path.resolve(REPO_ROOT, value)))
  );
}

function hashStatusEntries(entries) {
  const records = entries.map((entry) =>
    [entry.status, entry.path, entry.originalPath ?? ""].join("\0")
  );
  return crypto.createHash("sha256").update(records.sort().join("\0\0")).digest("hex");
}

function statusHasDeletion(entry) {
  const indexStatus = entry.status[0] ?? " ";
  const worktreeStatus = entry.status[1] ?? " ";
  return indexStatus === "D" || worktreeStatus === "D";
}

function countBy(entries, key) {
  const counts = new Map();
  for (const entry of entries) {
    counts.set(entry[key], (counts.get(entry[key]) ?? 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0])));
}

function relativeOutputPaths(outputPaths) {
  return Object.fromEntries(
    Object.entries(outputPaths)
      .filter(([, value]) => value)
      .map(([key, value]) => [key, toRepoRelativePath(value)])
  );
}

function validateSavedOutputPaths(savedOutputPaths, options) {
  if (
    savedOutputPaths === null ||
    typeof savedOutputPaths !== "object" ||
    Array.isArray(savedOutputPaths) ||
    Object.getPrototypeOf(savedOutputPaths) !== Object.prototype
  ) {
    throwInvalidSavedOutputPaths("Expected an object with the four generated output fields.");
  }

  const actualKeys = Object.keys(savedOutputPaths).sort();
  const expectedKeys = [...SAVED_OUTPUT_PATH_KEYS].sort();
  const latestOnlyKeys = [...LATEST_ONLY_OUTPUT_PATH_KEYS].sort();
  const fourOutputMode =
    actualKeys.length === expectedKeys.length &&
    actualKeys.every((key, index) => key === expectedKeys[index]);
  const latestOnlyMode =
    actualKeys.length === latestOnlyKeys.length &&
    actualKeys.every((key, index) => key === latestOnlyKeys[index]);
  if (!fourOutputMode && !latestOnlyMode) {
    throwInvalidSavedOutputPaths(
      "Expected exactly latestJson for no-report mode or all four generated output fields."
    );
  }

  const mode = fourOutputMode ? "four-output" : "latest-only";
  const modeKeys = fourOutputMode ? SAVED_OUTPUT_PATH_KEYS : LATEST_ONLY_OUTPUT_PATH_KEYS;
  const relativePaths = Object.fromEntries(
    modeKeys.map((key) => [
      key,
      validateCanonicalRepoRelativePath(savedOutputPaths[key], key)
    ])
  );
  if (
    fourOutputMode &&
    new Set(Object.values(relativePaths)).size !== SAVED_OUTPUT_PATH_KEYS.length
  ) {
    throwInvalidSavedOutputPaths("Each generated output field must name a distinct path.");
  }

  const expectedLatestJson = configuredRepoRelativePath(options.latestJson, "latestJson");
  if (relativePaths.latestJson !== expectedLatestJson) {
    throwInvalidSavedOutputPaths("latestJson does not match the configured latest JSON path.");
  }
  if (latestOnlyMode) {
    return {
      mode,
      paths: { latestJson: path.resolve(REPO_ROOT, relativePaths.latestJson) }
    };
  }

  const expectedLatestMarkdown = configuredRepoRelativePath(options.latestMarkdown, "latestMarkdown");
  if (relativePaths.latestMarkdown !== expectedLatestMarkdown) {
    throwInvalidSavedOutputPaths("latestMarkdown does not match the configured latest Markdown path.");
  }

  const reportDir = configuredRepoDirectory(options.reportDir);
  const reportJson = path.resolve(REPO_ROOT, relativePaths.reportJson);
  const reportMarkdown = path.resolve(REPO_ROOT, relativePaths.reportMarkdown);
  if (path.dirname(reportJson) !== reportDir || path.dirname(reportMarkdown) !== reportDir) {
    throwInvalidSavedOutputPaths("Timestamped reports must be direct children of the configured report directory.");
  }

  const reportJsonMatch = path.basename(reportJson).match(TIMESTAMPED_REPORT_NAME_PATTERN);
  const reportMarkdownMatch = path.basename(reportMarkdown).match(TIMESTAMPED_REPORT_NAME_PATTERN);
  if (reportJsonMatch?.[4] !== "json" || reportMarkdownMatch?.[4] !== "md") {
    throwInvalidSavedOutputPaths("Timestamped report names must use the generated A25 JSON/Markdown pattern.");
  }
  if (
    !isValidDateStamp(reportJsonMatch[2]) ||
    !isValidDateStamp(reportMarkdownMatch[2]) ||
    !isProducerValidRunId(reportJsonMatch[3]) ||
    !isProducerValidRunId(reportMarkdownMatch[3])
  ) {
    throwInvalidSavedOutputPaths("Timestamped report names must use a producer-valid date and run id.");
  }
  if (reportJsonMatch[1] !== reportMarkdownMatch[1]) {
    throwInvalidSavedOutputPaths("Timestamped JSON and Markdown reports must use the same generated run id.");
  }

  return {
    mode,
    paths: Object.fromEntries(
      SAVED_OUTPUT_PATH_KEYS.map((key) => [key, path.resolve(REPO_ROOT, relativePaths[key])])
    )
  };
}

function validateCanonicalRepoRelativePath(value, field) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.includes("\0") ||
    value.includes("\\") ||
    path.posix.isAbsolute(value) ||
    path.win32.isAbsolute(value) ||
    path.posix.normalize(value) !== value ||
    value === "." ||
    value === ".." ||
    value.startsWith("../")
  ) {
    throwInvalidSavedOutputPaths(`${field} must be a canonical repository-relative path.`);
  }

  const absolutePath = path.resolve(REPO_ROOT, value);
  if (toRepoRelativePath(absolutePath) !== value) {
    throwInvalidSavedOutputPaths(`${field} must remain inside the repository.`);
  }
  return value;
}

function configuredRepoRelativePath(absolutePath, field) {
  const resolved = path.resolve(absolutePath);
  const relative = toRepoRelativePath(resolved);
  validateCanonicalRepoRelativePath(relative, field);
  if (path.resolve(REPO_ROOT, relative) !== resolved) {
    throwInvalidSavedOutputPaths(`The configured ${field} path must remain inside the repository.`);
  }
  return relative;
}

function configuredRepoDirectory(absolutePath) {
  const resolved = path.resolve(absolutePath);
  const relative = toRepoRelativePath(resolved);
  if (
    relative === ".." ||
    relative.startsWith("../") ||
    path.isAbsolute(relative) ||
    path.resolve(REPO_ROOT, relative) !== resolved
  ) {
    throwInvalidSavedOutputPaths("The configured report directory must remain inside the repository.");
  }
  return resolved;
}

function throwInvalidSavedOutputPaths(detail) {
  throw new Error(
    [
      "A25 dirty-tree map outputPaths is invalid.",
      detail,
      "Refresh the dirty-tree map with the configured output paths before runtime release."
    ].join("\n")
  );
}

function isValidDateStamp(value) {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function isProducerValidRunId(value) {
  try {
    return sanitizePathSegment(value) === value;
  } catch {
    return false;
  }
}

function validateSavedAssertionMetadata(saved) {
  const plainSavedObject =
    saved !== null &&
    typeof saved === "object" &&
    !Array.isArray(saved) &&
    Object.getPrototypeOf(saved) === Object.prototype;
  const plainStatusCounts =
    saved?.statusCounts !== null &&
    typeof saved?.statusCounts === "object" &&
    !Array.isArray(saved?.statusCounts) &&
    Object.getPrototypeOf(saved?.statusCounts) === Object.prototype;
  const signatureValid =
    typeof saved?.statusSignature === "string" &&
    /^[a-f0-9]{64}$/.test(saved.statusSignature);
  const actualCountKeys = plainStatusCounts
    ? Object.keys(saved.statusCounts).sort()
    : [];
  const expectedCountKeys = [...STATUS_COUNT_KEYS].sort();
  const exactCountSchema =
    actualCountKeys.length === expectedCountKeys.length &&
    actualCountKeys.every((key, index) => key === expectedCountKeys[index]);
  const allCountsValid =
    exactCountSchema &&
    STATUS_COUNT_KEYS.every((key) =>
      Number.isSafeInteger(saved.statusCounts[key]) && saved.statusCounts[key] >= 0
    );
  const expandedStatusEntries = saved?.statusCounts?.expandedStatusEntries;
  const generatedAt = saved?.generatedAt;
  const generatedAtMs = typeof generatedAt === "string" ? Date.parse(generatedAt) : Number.NaN;
  const generatedAtValid =
    typeof generatedAt === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(generatedAt) &&
    Number.isFinite(generatedAtMs) &&
    new Date(generatedAtMs).toISOString() === generatedAt;

  if (
    !plainSavedObject ||
    !plainStatusCounts ||
    !signatureValid ||
    !allCountsValid ||
    !generatedAtValid
  ) {
    throw new Error(
      [
        "A25 dirty-tree map assertion metadata is invalid.",
        "Refresh the dirty-tree map before runtime release."
      ].join("\n")
    );
  }

  return {
    statusSignature: saved.statusSignature,
    expandedStatusEntries,
    generatedAt,
    generatedAtMs
  };
}

async function captureGeneratedOutputArtifacts(validatedOutputs) {
  const { mode, paths: outputPaths } = validatedOutputs;
  const presentKeys = mode === "four-output" ? SAVED_OUTPUT_PATH_KEYS : LATEST_ONLY_OUTPUT_PATH_KEYS;
  const artifacts = {};
  let remainingAggregateBytes = MAX_GENERATED_OUTPUT_AGGREGATE_BYTES_BIGINT;
  for (const key of presentKeys) {
    artifacts[key] = await readDirectRegularGeneratedOutput(
      outputPaths[key],
      key,
      false,
      remainingAggregateBytes
    );
    remainingAggregateBytes -= artifacts[key].byteLength;
  }

  if (mode === "four-output") {
    const identities = SAVED_OUTPUT_PATH_KEYS.map((key) => artifacts[key].identity);
    if (new Set(identities).size !== SAVED_OUTPUT_PATH_KEYS.length) {
      throwGeneratedOutputArtifactsInvalid(
        "Each generated output artifact must use a distinct filesystem inode."
      );
    }
    if (!artifacts.latestJson.bytes.equals(artifacts.reportJson.bytes)) {
      throwGeneratedOutputArtifactsInvalid(
        "The timestamped JSON report must be an exact copy of the configured latest JSON map."
      );
    }
    if (!artifacts.latestMarkdown.bytes.equals(artifacts.reportMarkdown.bytes)) {
      throwGeneratedOutputArtifactsInvalid(
        "The timestamped Markdown report must be an exact copy of the configured latest Markdown map."
      );
    }
  }

  return {
    mode,
    ignoredOutputPaths: outputPaths,
    fingerprints: Object.fromEntries(
      presentKeys.map((key) => [key, artifacts[key].fingerprint])
    )
  };
}

async function readDirectRegularGeneratedOutput(
  filePath,
  field,
  allowMissing,
  aggregateBytesRemaining = MAX_GENERATED_OUTPUT_AGGREGATE_BYTES_BIGINT
) {
  let pathStat;
  try {
    pathStat = await fs.lstat(filePath, { bigint: true });
  } catch (error) {
    if (allowMissing && error?.code === "ENOENT") {
      return { present: false };
    }
    throwGeneratedOutputArtifactsInvalid(`${field} must exist as a direct regular file.`);
  }

  if (!pathStat.isFile() || pathStat.nlink !== 1n) {
    throwGeneratedOutputArtifactsInvalid(`${field} must be a direct regular file, not a symlink or special node.`);
  }
  if (pathStat.size > MAX_GENERATED_OUTPUT_BYTES_BIGINT) {
    throwGeneratedOutputArtifactsInvalid(
      "A generated output artifact exceeds the 128 MiB safety limit."
    );
  }
  if (pathStat.size > aggregateBytesRemaining) {
    throwGeneratedOutputAggregateLimit();
  }
  const beforeCanonicalPath = await validateCanonicalGeneratedOutputPath(filePath);

  let handle;
  try {
    handle = await fs.open(filePath, directRegularOpenFlags());
  } catch {
    throwGeneratedOutputArtifactsInvalid(`${field} could not be opened as a direct regular file.`);
  }

  try {
    const openedStat = await handle.stat({ bigint: true });
    if (!openedStat.isFile() || !sameStableFileStat(pathStat, openedStat)) {
      throwGeneratedOutputArtifactsInvalid(`${field} changed before its generated bytes were read.`);
    }
    if (openedStat.size > MAX_GENERATED_OUTPUT_BYTES_BIGINT) {
      throwGeneratedOutputArtifactsInvalid(
        "A generated output artifact exceeds the 128 MiB safety limit."
      );
    }
    if (openedStat.size > aggregateBytesRemaining) {
      throwGeneratedOutputAggregateLimit();
    }

    const bytes = await readExactGeneratedOutputBytes(handle, openedStat.size, field);
    const finalDescriptorStat = await handle.stat({ bigint: true });
    let finalPathStat;
    try {
      finalPathStat = await fs.lstat(filePath, { bigint: true });
    } catch {
      throwGeneratedOutputArtifactsInvalid(`${field} changed while its generated bytes were read.`);
    }
    if (
      !finalPathStat.isFile() ||
      BigInt(bytes.length) !== finalDescriptorStat.size ||
      !sameStableFileStat(openedStat, finalDescriptorStat) ||
      !sameStableFileStat(finalDescriptorStat, finalPathStat)
    ) {
      throwGeneratedOutputArtifactsInvalid(`${field} changed while its generated bytes were read.`);
    }
    const afterCanonicalPath = await validateCanonicalGeneratedOutputPath(filePath);
    if (
      beforeCanonicalPath.repoRoot !== afterCanonicalPath.repoRoot ||
      beforeCanonicalPath.outputPath !== afterCanonicalPath.outputPath
    ) {
      throwGeneratedOutputCanonicalPathInvalid();
    }

    return {
      present: true,
      bytes,
      byteLength: finalDescriptorStat.size,
      identity: `${finalDescriptorStat.dev}:${finalDescriptorStat.ino}`,
      fingerprint: generatedOutputFingerprint(finalDescriptorStat, bytes)
    };
  } finally {
    await handle.close();
  }
}

async function validateCanonicalGeneratedOutputPath(filePath) {
  let canonicalRepoRoot;
  let canonicalOutputPath;
  try {
    canonicalRepoRoot = await fs.realpath(REPO_ROOT);
    canonicalOutputPath = await fs.realpath(filePath);
  } catch {
    throwGeneratedOutputCanonicalPathInvalid();
  }

  const lexicalRepoRoot = path.resolve(REPO_ROOT);
  const lexicalOutputPath = path.resolve(filePath);
  const relativeToRepo = path.relative(canonicalRepoRoot, canonicalOutputPath);
  const contained =
    relativeToRepo !== ".." &&
    !relativeToRepo.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relativeToRepo);
  if (
    canonicalRepoRoot !== lexicalRepoRoot ||
    canonicalOutputPath !== lexicalOutputPath ||
    !contained
  ) {
    throwGeneratedOutputCanonicalPathInvalid();
  }
  return { repoRoot: canonicalRepoRoot, outputPath: canonicalOutputPath };
}

function throwGeneratedOutputCanonicalPathInvalid() {
  throw new Error(
    [
      "A25 dirty-tree map generated output canonical path is invalid.",
      "Generated outputs must resolve directly inside the canonical repository root.",
      "Refresh the dirty-tree map before runtime release."
    ].join("\n")
  );
}

function throwGeneratedOutputAggregateLimit() {
  throwGeneratedOutputArtifactsInvalid(
    "Generated outputs exceed the 128 MiB aggregate buffer limit."
  );
}

async function readExactGeneratedOutputBytes(handle, expectedSize, field) {
  const expectedLength = Number(expectedSize);
  const bytes = Buffer.alloc(expectedLength);
  let offset = 0;
  try {
    while (offset < expectedLength) {
      const result = await handle.read(bytes, offset, expectedLength - offset, offset);
      if (result.bytesRead === 0) {
        throw new Error("short read");
      }
      offset += result.bytesRead;
    }
    const extraByte = Buffer.alloc(1);
    const extra = await handle.read(extraByte, 0, 1, expectedLength);
    if (extra.bytesRead !== 0) {
      throw new Error("file grew during read");
    }
  } catch {
    throwGeneratedOutputArtifactsInvalid(`${field} changed while its generated bytes were read.`);
  }
  return bytes;
}

function directRegularOpenFlags() {
  if (
    !Number.isInteger(fsConstants.O_NOFOLLOW) ||
    !Number.isInteger(fsConstants.O_NONBLOCK)
  ) {
    throwGeneratedOutputArtifactsInvalid(
      "Required no-follow and nonblocking file-open protections are unavailable."
    );
  }
  return fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW | fsConstants.O_NONBLOCK;
}

function sameStableFileStat(left, right) {
  return [
    "dev",
    "ino",
    "mode",
    "nlink",
    "uid",
    "gid",
    "rdev",
    "size",
    "mtimeNs",
    "ctimeNs"
  ].every((field) => left[field] === right[field]);
}

function generatedOutputFingerprint(stat, bytes) {
  const statFingerprint = [
    stat.dev,
    stat.ino,
    stat.mode,
    stat.nlink,
    stat.uid,
    stat.gid,
    stat.rdev,
    stat.size,
    stat.mtimeNs,
    stat.ctimeNs
  ].map(String).join(":");
  const bytesSha256 = crypto.createHash("sha256").update(bytes).digest("hex");
  return `${statFingerprint}:${bytesSha256}`;
}

function assertGeneratedOutputArtifactsUnchanged(before, after) {
  const beforeKeys = Object.keys(before.fingerprints).sort();
  const afterKeys = Object.keys(after.fingerprints).sort();
  if (
    before.mode !== after.mode ||
    beforeKeys.length !== afterKeys.length ||
    beforeKeys.some((key, index) =>
      key !== afterKeys[index] || before.fingerprints[key] !== after.fingerprints[key]
    )
  ) {
    throwGeneratedOutputArtifactsChanged();
  }
}

function throwGeneratedOutputArtifactsInvalid(detail) {
  throw new Error(
    [
      "A25 dirty-tree map generated output artifacts are invalid.",
      detail,
      "Refresh the dirty-tree map before runtime release."
    ].join("\n")
  );
}

function throwGeneratedOutputArtifactsChanged() {
  throw new Error(
    [
      "A25 dirty-tree map generated output artifacts changed during assertion.",
      "Refresh the dirty-tree map and rerun runtime release preflight."
    ].join("\n")
  );
}

async function writeDirtyTreeMap(options) {
  const paths = outputPathsForRun(options);
  const recordedPaths = options.noReport
    ? { latestJson: paths.latestJson }
    : paths;

  await preflightGeneratedOutputWriteSet(paths, options.noReport);

  await writeOutputs(
    await buildDirtyTreeMap(options.reason, options.ownerPathspecs, recordedPaths),
    paths,
    options.noReport
  );
  const finalMap = await buildDirtyTreeMap(options.reason, options.ownerPathspecs, recordedPaths);
  await writeOutputs(finalMap, paths, options.noReport);

  return {
    latestJson: toRepoRelativePath(paths.latestJson),
    latestMarkdown: options.noReport ? undefined : toRepoRelativePath(paths.latestMarkdown),
    reportJson: options.noReport ? undefined : toRepoRelativePath(paths.reportJson),
    reportMarkdown: options.noReport ? undefined : toRepoRelativePath(paths.reportMarkdown),
    statusSignature: finalMap.statusSignature,
    statusCounts: finalMap.statusCounts,
    ownerBuckets: finalMap.ownerBuckets,
    sliceBuckets: finalMap.sliceBuckets
  };
}

function outputPathsForRun(options) {
  const runId = sanitizePathSegment(options.runId ?? timestampRunId());
  const date = hktDateStamp();
  return {
    latestJson: options.latestJson,
    latestMarkdown: options.latestMarkdown,
    reportJson: path.join(options.reportDir, `${date}-A25-dirty-tree-map-${runId}.json`),
    reportMarkdown: path.join(options.reportDir, `${date}-A25-dirty-tree-map-${runId}.md`)
  };
}

async function writeOutputs(map, paths, noReport) {
  const jsonBytes = Buffer.from(`${JSON.stringify(map, null, 2)}\n`);
  const markdownBytes = noReport ? undefined : Buffer.from(formatMarkdown(map));
  const outputs = noReport
    ? [{ key: "latestJson", filePath: paths.latestJson, bytes: jsonBytes }]
    : [
        { key: "reportJson", filePath: paths.reportJson, bytes: jsonBytes },
        { key: "reportMarkdown", filePath: paths.reportMarkdown, bytes: markdownBytes },
        { key: "latestMarkdown", filePath: paths.latestMarkdown, bytes: markdownBytes },
        { key: "latestJson", filePath: paths.latestJson, bytes: jsonBytes }
      ];
  const aggregateBytes = outputs.reduce((total, output) => total + output.bytes.length, 0);
  if (aggregateBytes > MAX_GENERATED_OUTPUT_AGGREGATE_BYTES) {
    throwGeneratedOutputAggregateLimit();
  }

  const writeSet = await preflightGeneratedOutputWriteSet(paths, noReport);
  const staged = [];
  try {
    for (const output of outputs) {
      staged.push(await stageGeneratedOutput(output, writeSet));
    }

    await revalidateGeneratedOutputWriteSet(writeSet);
    for (const artifact of staged) {
      await commitStagedGeneratedOutput(artifact, writeSet);
      artifact.committed = true;
    }
  } catch {
    throwGeneratedOutputWriteTargetInvalid();
  } finally {
    await Promise.all(
      staged
        .filter((artifact) => !artifact.committed)
        .map((artifact) => fs.unlink(artifact.tempPath).catch(() => undefined))
    );
  }
}

function selectedGeneratedOutputPaths(paths, noReport) {
  return noReport
    ? { latestJson: paths.latestJson }
    : Object.fromEntries(SAVED_OUTPUT_PATH_KEYS.map((key) => [key, paths[key]]));
}

async function preflightGeneratedOutputWriteSet(paths, noReport) {
  const selectedPaths = selectedGeneratedOutputPaths(paths, noReport);
  const entries = Object.entries(selectedPaths);
  if (new Set(entries.map(([, filePath]) => filePath)).size !== entries.length) {
    throwGeneratedOutputWriteTargetInvalid();
  }

  const canonicalRepoRoot = await canonicalGeneratedOutputWriteRepoRoot();
  for (const [, filePath] of entries) {
    validateLexicalGeneratedOutputWritePath(filePath, canonicalRepoRoot);
  }

  const parents = new Map();
  for (const [, filePath] of entries) {
    const parentPath = path.dirname(filePath);
    if (!parents.has(parentPath)) {
      parents.set(
        parentPath,
        await ensureDirectGeneratedOutputParent(parentPath, canonicalRepoRoot)
      );
    }
  }

  const targets = new Map();
  for (const [key, filePath] of entries) {
    targets.set(
      filePath,
      await inspectGeneratedOutputWriteTarget(filePath, key, canonicalRepoRoot)
    );
  }

  return { canonicalRepoRoot, parents, targets };
}

async function canonicalGeneratedOutputWriteRepoRoot() {
  let canonicalRepoRoot;
  try {
    canonicalRepoRoot = await fs.realpath(REPO_ROOT);
  } catch {
    throwGeneratedOutputWriteTargetInvalid();
  }
  if (canonicalRepoRoot !== path.resolve(REPO_ROOT)) {
    throwGeneratedOutputWriteTargetInvalid();
  }
  return canonicalRepoRoot;
}

function validateLexicalGeneratedOutputWritePath(filePath, canonicalRepoRoot) {
  if (
    typeof filePath !== "string" ||
    !path.isAbsolute(filePath) ||
    path.resolve(filePath) !== filePath
  ) {
    throwGeneratedOutputWriteTargetInvalid();
  }
  const relative = path.relative(canonicalRepoRoot, filePath);
  if (
    relative === "" ||
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    throwGeneratedOutputWriteTargetInvalid();
  }
}

async function ensureDirectGeneratedOutputParent(parentPath, canonicalRepoRoot) {
  const relative = path.relative(canonicalRepoRoot, parentPath);
  const components = relative === "" ? [] : relative.split(path.sep);
  let currentPath = canonicalRepoRoot;

  let repoRootStat;
  try {
    repoRootStat = await fs.lstat(canonicalRepoRoot, { bigint: true });
  } catch {
    throwGeneratedOutputWriteTargetInvalid();
  }
  validateTrustedGeneratedOutputDirectory(repoRootStat);

  for (const component of components) {
    currentPath = path.join(currentPath, component);
    let currentStat;
    try {
      currentStat = await fs.lstat(currentPath, { bigint: true });
    } catch (error) {
      if (error?.code !== "ENOENT") {
        throwGeneratedOutputWriteTargetInvalid();
      }
      try {
        await fs.mkdir(currentPath, { mode: 0o700 });
      } catch (mkdirError) {
        if (mkdirError?.code !== "EEXIST") {
          throwGeneratedOutputWriteTargetInvalid();
        }
      }
      try {
        currentStat = await fs.lstat(currentPath, { bigint: true });
      } catch {
        throwGeneratedOutputWriteTargetInvalid();
      }
    }

    validateTrustedGeneratedOutputDirectory(currentStat);
    let canonicalCurrentPath;
    try {
      canonicalCurrentPath = await fs.realpath(currentPath);
    } catch {
      throwGeneratedOutputWriteTargetInvalid();
    }
    if (canonicalCurrentPath !== currentPath) {
      throwGeneratedOutputWriteTargetInvalid();
    }
  }

  let parentStat;
  try {
    parentStat = await fs.lstat(parentPath, { bigint: true });
  } catch {
    throwGeneratedOutputWriteTargetInvalid();
  }
  validateTrustedGeneratedOutputDirectory(parentStat);
  return {
    parentPath,
    fingerprint: generatedOutputDirectoryFingerprint(parentStat)
  };
}

async function inspectGeneratedOutputWriteTarget(filePath, field, canonicalRepoRoot) {
  let pathStat;
  try {
    pathStat = await fs.lstat(filePath, { bigint: true });
  } catch (error) {
    if (error?.code === "ENOENT") {
      return { field, filePath, present: false };
    }
    throwGeneratedOutputWriteTargetInvalid();
  }

  if (!pathStat.isFile() || pathStat.nlink !== 1n) {
    throwGeneratedOutputWriteTargetInvalid();
  }
  await validateCanonicalGeneratedOutputWritePath(filePath, canonicalRepoRoot);

  let handle;
  try {
    handle = await fs.open(filePath, directRegularWritePreflightOpenFlags());
  } catch {
    throwGeneratedOutputWriteTargetInvalid();
  }
  try {
    const openedStat = await handle.stat({ bigint: true });
    let finalPathStat;
    try {
      finalPathStat = await fs.lstat(filePath, { bigint: true });
    } catch {
      throwGeneratedOutputWriteTargetInvalid();
    }
    if (
      !openedStat.isFile() ||
      openedStat.nlink !== 1n ||
      !sameStableFileStat(pathStat, openedStat) ||
      !sameStableFileStat(openedStat, finalPathStat)
    ) {
      throwGeneratedOutputWriteTargetInvalid();
    }
  } catch {
    throwGeneratedOutputWriteTargetInvalid();
  } finally {
    try {
      await handle.close();
    } catch {
      throwGeneratedOutputWriteTargetInvalid();
    }
  }

  return {
    field,
    filePath,
    present: true,
    fingerprint: generatedOutputStableStatFingerprint(pathStat),
    permissionMode: Number(pathStat.mode & 0o777n),
    uid: pathStat.uid,
    gid: pathStat.gid
  };
}

async function stageGeneratedOutput(output, writeSet) {
  await revalidateGeneratedOutputParent(
    writeSet.parents.get(path.dirname(output.filePath)),
    writeSet.canonicalRepoRoot
  );
  const target = writeSet.targets.get(output.filePath);
  if (!target) throwGeneratedOutputWriteTargetInvalid();
  const tempPath = path.join(
    path.dirname(output.filePath),
    `.${path.basename(output.filePath)}.a25-${process.pid}-${crypto.randomBytes(16).toString("hex")}.tmp`
  );
  let handle;
  try {
    handle = await fs.open(tempPath, directRegularWriteCreateFlags(), 0o600);
    if (target.present) {
      await handle.chown(Number(target.uid), Number(target.gid));
      await handle.chmod(target.permissionMode);
    } else {
      await handle.chmod(0o600);
    }
    await writeExactGeneratedOutputBytes(handle, output.bytes);
    await handle.sync();
    const descriptorStat = await handle.stat({ bigint: true });
    const pathStat = await fs.lstat(tempPath, { bigint: true });
    const expectedPermissionMode = target.present ? target.permissionMode : 0o600;
    const expectedUid = target.present ? target.uid : descriptorStat.uid;
    const expectedGid = target.present ? target.gid : descriptorStat.gid;
    if (
      !descriptorStat.isFile() ||
      descriptorStat.nlink !== 1n ||
      !sameStableFileStat(descriptorStat, pathStat) ||
      Number(descriptorStat.mode & 0o777n) !== expectedPermissionMode ||
      descriptorStat.uid !== expectedUid ||
      descriptorStat.gid !== expectedGid
    ) {
      throwGeneratedOutputWriteTargetInvalid();
    }
    await validateCanonicalGeneratedOutputWritePath(tempPath, writeSet.canonicalRepoRoot);
    return {
      ...output,
      tempPath,
      stagedIdentity: `${descriptorStat.dev}:${descriptorStat.ino}`,
      expectedPermissionMode,
      expectedUid,
      expectedGid,
      committed: false
    };
  } catch {
    await fs.unlink(tempPath).catch(() => undefined);
    throwGeneratedOutputWriteTargetInvalid();
  } finally {
    if (handle) {
      try {
        await handle.close();
      } catch {
        await fs.unlink(tempPath).catch(() => undefined);
        throwGeneratedOutputWriteTargetInvalid();
      }
    }
  }
}

async function commitStagedGeneratedOutput(artifact, writeSet) {
  await revalidateGeneratedOutputParent(
    writeSet.parents.get(path.dirname(artifact.filePath)),
    writeSet.canonicalRepoRoot
  );
  await revalidateGeneratedOutputDestination(
    writeSet.targets.get(artifact.filePath),
    writeSet.canonicalRepoRoot
  );
  try {
    // Node has no portable dirfd-relative renameat. The verified parent is
    // checked immediately before and after this same-directory rename, while
    // rename itself replaces rather than dereferences a raced final symlink.
    await fs.rename(artifact.tempPath, artifact.filePath);
  } catch {
    throwGeneratedOutputWriteTargetInvalid();
  }

  const committedStat = await fs.lstat(artifact.filePath, { bigint: true }).catch(() => undefined);
  if (
    !committedStat?.isFile() ||
    committedStat.nlink !== 1n ||
    `${committedStat.dev}:${committedStat.ino}` !== artifact.stagedIdentity ||
    Number(committedStat.mode & 0o777n) !== artifact.expectedPermissionMode ||
    committedStat.uid !== artifact.expectedUid ||
    committedStat.gid !== artifact.expectedGid
  ) {
    throwGeneratedOutputWriteTargetInvalid();
  }
  await validateCanonicalGeneratedOutputWritePath(
    artifact.filePath,
    writeSet.canonicalRepoRoot
  );
  await revalidateGeneratedOutputParent(
    writeSet.parents.get(path.dirname(artifact.filePath)),
    writeSet.canonicalRepoRoot
  );
}

async function revalidateGeneratedOutputWriteSet(writeSet) {
  for (const parent of writeSet.parents.values()) {
    await revalidateGeneratedOutputParent(parent, writeSet.canonicalRepoRoot);
  }
  for (const target of writeSet.targets.values()) {
    await revalidateGeneratedOutputDestination(target, writeSet.canonicalRepoRoot);
  }
}

async function revalidateGeneratedOutputParent(parent, canonicalRepoRoot) {
  if (!parent) throwGeneratedOutputWriteTargetInvalid();
  let parentStat;
  let canonicalParent;
  try {
    parentStat = await fs.lstat(parent.parentPath, { bigint: true });
    canonicalParent = await fs.realpath(parent.parentPath);
  } catch {
    throwGeneratedOutputWriteTargetInvalid();
  }
  const relative = path.relative(canonicalRepoRoot, canonicalParent);
  if (
    !isTrustedGeneratedOutputDirectory(parentStat) ||
    canonicalParent !== parent.parentPath ||
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative) ||
    generatedOutputDirectoryFingerprint(parentStat) !== parent.fingerprint
  ) {
    throwGeneratedOutputWriteTargetInvalid();
  }
}

function validateTrustedGeneratedOutputDirectory(stat) {
  if (!isTrustedGeneratedOutputDirectory(stat)) {
    throwGeneratedOutputWriteTargetInvalid();
  }
}

function isTrustedGeneratedOutputDirectory(stat) {
  if (typeof process.geteuid !== "function") return false;
  return (
    stat.isDirectory() &&
    stat.uid === BigInt(process.geteuid()) &&
    (stat.mode & 0o022n) === 0n
  );
}

async function revalidateGeneratedOutputDestination(target, canonicalRepoRoot) {
  let pathStat;
  try {
    pathStat = await fs.lstat(target.filePath, { bigint: true });
  } catch (error) {
    if (error?.code === "ENOENT" && !target.present) return;
    throwGeneratedOutputWriteTargetInvalid();
  }
  if (
    !target.present ||
    !pathStat.isFile() ||
    pathStat.nlink !== 1n ||
    generatedOutputStableStatFingerprint(pathStat) !== target.fingerprint
  ) {
    throwGeneratedOutputWriteTargetInvalid();
  }
  await validateCanonicalGeneratedOutputWritePath(target.filePath, canonicalRepoRoot);
}

async function validateCanonicalGeneratedOutputWritePath(filePath, canonicalRepoRoot) {
  let canonicalPath;
  try {
    canonicalPath = await fs.realpath(filePath);
  } catch {
    throwGeneratedOutputWriteTargetInvalid();
  }
  const relative = path.relative(canonicalRepoRoot, canonicalPath);
  if (
    canonicalPath !== filePath ||
    relative === "" ||
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    throwGeneratedOutputWriteTargetInvalid();
  }
}

async function writeExactGeneratedOutputBytes(handle, bytes) {
  let offset = 0;
  while (offset < bytes.length) {
    const result = await handle.write(bytes, offset, bytes.length - offset, offset);
    if (result.bytesWritten === 0) {
      throwGeneratedOutputWriteTargetInvalid();
    }
    offset += result.bytesWritten;
  }
}

function directRegularWritePreflightOpenFlags() {
  validateGeneratedOutputWriteOpenConstants();
  return fsConstants.O_RDWR | fsConstants.O_NOFOLLOW | fsConstants.O_NONBLOCK;
}

function directRegularWriteCreateFlags() {
  validateGeneratedOutputWriteOpenConstants();
  return (
    fsConstants.O_WRONLY |
    fsConstants.O_CREAT |
    fsConstants.O_EXCL |
    fsConstants.O_NOFOLLOW |
    fsConstants.O_NONBLOCK
  );
}

function validateGeneratedOutputWriteOpenConstants() {
  for (const flag of ["O_WRONLY", "O_RDWR", "O_CREAT", "O_EXCL", "O_NOFOLLOW", "O_NONBLOCK"]) {
    if (!Number.isInteger(fsConstants[flag])) {
      throwGeneratedOutputWriteTargetInvalid();
    }
  }
}

function generatedOutputDirectoryFingerprint(stat) {
  return [stat.dev, stat.ino, stat.mode, stat.uid, stat.gid, stat.rdev]
    .map(String)
    .join(":");
}

function generatedOutputStableStatFingerprint(stat) {
  return [
    stat.dev,
    stat.ino,
    stat.mode,
    stat.nlink,
    stat.uid,
    stat.gid,
    stat.rdev,
    stat.size,
    stat.mtimeNs,
    stat.ctimeNs
  ].map(String).join(":");
}

function throwGeneratedOutputWriteTargetInvalid() {
  throw new Error(
    [
      "A25 dirty-tree map generated output write target is invalid.",
      "Generated outputs must be direct regular files under canonical repository directories.",
      "No generated output was trusted for this refresh."
    ].join("\n")
  );
}

function formatMarkdown(map) {
  const lines = [
    `# ${hktDateStamp()} A25 Dirty-Tree Map`,
    "",
    `Generated at: ${map.generatedAt}`,
    `Agents: ${map.sessions.join("; ")}`,
    `Reason: ${map.reason}`,
    `Status signature: \`${map.statusSignature}\``,
    "",
    "## Counts",
    "",
    `- Collapsed status entries: ${map.statusCounts.collapsedStatusEntries}`,
    `- Expanded status entries: ${map.statusCounts.expandedStatusEntries}`,
    `- Tracked modified: ${map.statusCounts.trackedModified}`,
    `- Tracked deleted: ${map.statusCounts.trackedDeleted}`,
    `- Untracked status entries: ${map.statusCounts.untrackedStatusEntries}`,
    `- Untracked files: ${map.statusCounts.untrackedFiles}`,
    `- Unmapped owner entries: ${map.statusCounts.unmappedEntries}`,
    `- Strict unblocked unmapped entries: ${map.statusCounts.unblockedUnmappedEntries}`,
    `- Ambiguous owner entries: ${map.statusCounts.ambiguousOwnerEntries}`,
    `- Raw multi-match entries resolved by specificity: ${map.statusCounts.rawMultiMatchEntries}`,
    `- Secret quarantine entries: ${map.statusCounts.secretQuarantineEntries}`,
    "",
    "## Owner Buckets",
    "",
    ...formatBucketTable(map.ownerBuckets, "Owner bucket"),
    "",
    "## Slice Buckets",
    "",
    ...formatBucketTable(map.sliceBuckets, "Slice"),
    "",
    "## Release Hygiene Entries",
    "",
    ...formatEntries(map.releaseHygieneEntries),
    "",
    "## Unmapped Owner Entries",
    "",
    ...formatEntries(map.unmappedEntries),
    "",
    "## Runtime Release Rule",
    "",
    "- Runtime preview/production release remains blocked until this map is current at preflight time.",
    "- A22 must use a clean worktree, clean clone, reviewed clean release slice, or pruned staging; direct dirty-root deploy remains forbidden.",
    "- A10/A25 should slice the root inventory into runtime app/API/data, tests/regression evidence, docs/coordination evidence, content/RAG backlog, release hygiene tooling/config, and local/generated quarantine.",
    "- A25 did not stage, commit, branch, push, reset, delete, revert, clean, preview deploy, or production deploy.",
    ""
  ];

  return `${lines.join("\n")}\n`;
}

function formatBucketTable(bucket, label) {
  const rows = [
    `| ${label} | Dirty entries |`,
    "| --- | ---: |"
  ];
  for (const [name, count] of Object.entries(bucket)) {
    rows.push(`| ${name} | ${count} |`);
  }
  return rows;
}

function formatEntries(entries) {
  if (entries.length === 0) {
    return ["No release-hygiene entries detected."];
  }

  const rows = [
    "| Status | Path | Owner |",
    "| --- | --- | --- |"
  ];
  for (const entry of entries.slice(0, 120)) {
    rows.push(`| \`${entry.status.trim() || "M"}\` | \`${entry.path}\` | ${entry.owner} |`);
  }
  if (entries.length > 120) {
    rows.push(`| ... | ${entries.length - 120} additional entries omitted from markdown; see JSON. |  |`);
  }
  return rows;
}

async function assertCurrentDirtyTreeMap(options) {
  const latestJson = options.latestJson;
  const initialLatestArtifact = await readDirectRegularGeneratedOutput(
    latestJson,
    "latestJson",
    true
  );
  if (!initialLatestArtifact.present) {
    throw new Error(
      [
        `A25 dirty-tree map is missing: ${toRepoRelativePath(latestJson)}`,
        "Run `npm run release:dirty-map -- --reason \"runtime release preflight\"` before any runtime release."
      ].join("\n")
    );
  }

  let saved;
  try {
    saved = JSON.parse(initialLatestArtifact.bytes.toString("utf8"));
  } catch {
    throw new Error(
      [
        "A25 dirty-tree map JSON is invalid.",
        "Refresh the dirty-tree map before runtime release."
      ].join("\n")
    );
  }
  const savedMetadata = validateSavedAssertionMetadata(saved);
  const savedOutputPaths = validateSavedOutputPaths(saved?.outputPaths, options);
  const beforeArtifacts = await captureGeneratedOutputArtifacts(savedOutputPaths);
  if (beforeArtifacts.fingerprints.latestJson !== initialLatestArtifact.fingerprint) {
    throwGeneratedOutputArtifactsChanged();
  }
  const current = await buildDirtyTreeMap(
    "runtime release dirty-tree assertion",
    options.ownerPathspecs,
    beforeArtifacts.ignoredOutputPaths
  );
  let afterArtifacts;
  try {
    afterArtifacts = await captureGeneratedOutputArtifacts(savedOutputPaths);
  } catch {
    throwGeneratedOutputArtifactsChanged();
  }
  assertGeneratedOutputArtifactsUnchanged(beforeArtifacts, afterArtifacts);

  if (savedMetadata.statusSignature !== current.statusSignature) {
    throw new Error(
      [
        "A25 dirty-tree map is stale; current git status no longer matches the latest map.",
        `Latest map: ${toRepoRelativePath(latestJson)}`,
        `Saved signature: ${savedMetadata.statusSignature}`,
        `Current signature: ${current.statusSignature}`,
        `Saved expanded entries: ${savedMetadata.expandedStatusEntries}`,
        `Current expanded entries: ${current.statusCounts.expandedStatusEntries}`,
        "Refresh with `npm run release:dirty-map -- --reason \"runtime release preflight\"` before runtime release."
      ].join("\n")
    );
  }

  if (current.statusCounts.unmappedEntries > 0) {
    const samples = current.unmappedEntries
      .slice(0, 20)
      .map((entry) => `- ${entry.path}`);
    throw new Error(
      [
        "A25 dirty-tree map has strict unmapped owner entries.",
        `Unmapped owner entries: ${current.statusCounts.unmappedEntries}`,
        ...samples,
        "Add exact owner pathspecs in coordination/release-intake/owner-pathspecs.json before release intake can pass."
      ].join("\n")
    );
  }

  if (current.statusCounts.ambiguousOwnerEntries > 0) {
    const samples = current.ambiguousOwnerEntries
      .slice(0, 20)
      .map((entry) => `- ${entry.path}: ${entry.ownerResolution.finalOwners.join(", ")}`);
    throw new Error(
      [
        "A25 dirty-tree map has top-specificity owner ties.",
        `Ambiguous owner entries: ${current.statusCounts.ambiguousOwnerEntries}`,
        ...samples,
        "Add a more-specific owner pathspec or explicit precedence before release intake can pass."
      ].join("\n")
    );
  }

  if (options.maxAgeMinutes !== undefined) {
    const ageMs = Date.now() - savedMetadata.generatedAtMs;
    const maxAgeMs = options.maxAgeMinutes * 60 * 1000;
    if (ageMs < 0 || ageMs > maxAgeMs) {
      throw new Error(
        [
          `A25 dirty-tree map is older than ${options.maxAgeMinutes} minutes.`,
          `Latest map: ${toRepoRelativePath(latestJson)}`,
          `Generated at: ${savedMetadata.generatedAt}`,
          "Refresh it immediately before runtime release."
        ].join("\n")
      );
    }
  }

  return {
    latestJson: toRepoRelativePath(latestJson),
    generatedAt: savedMetadata.generatedAt,
    statusSignature: savedMetadata.statusSignature,
    statusCounts: current.statusCounts
  };
}

function timestampRunId() {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function hktDateStamp() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function sanitizePathSegment(value) {
  const sanitized = String(value)
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!sanitized) throw new Error("Run id cannot be empty.");
  return sanitized;
}

function toRepoRelativePath(absolutePath) {
  return toPosix(path.relative(REPO_ROOT, absolutePath));
}

function toPosix(value) {
  return value.split(path.sep).join("/");
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const result =
    options.action === "assert-current"
      ? await assertCurrentDirtyTreeMap(options)
      : await writeDirtyTreeMap(options);

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (options.action === "assert-current") {
    console.log("A25 dirty-tree map is current for runtime release preflight");
    console.log(`Latest map: ${result.latestJson}`);
    console.log(`Expanded status entries: ${result.statusCounts.expandedStatusEntries}`);
    console.log(`Unmapped owner entries: ${result.statusCounts.unmappedEntries}`);
    console.log(`Ambiguous owner entries: ${result.statusCounts.ambiguousOwnerEntries}`);
    return;
  }

  console.log("A25 dirty-tree map refreshed");
  console.log(`Latest map: ${result.latestJson}`);
  if (result.reportMarkdown) console.log(`Report: ${result.reportMarkdown}`);
  console.log(`Expanded status entries: ${result.statusCounts.expandedStatusEntries}`);
  console.log(`Unmapped owner entries: ${result.statusCounts.unmappedEntries}`);
  console.log(`Ambiguous owner entries: ${result.statusCounts.ambiguousOwnerEntries}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
