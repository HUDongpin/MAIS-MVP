#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
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

async function writeDirtyTreeMap(options) {
  const paths = outputPathsForRun(options);

  await writeOutputs(await buildDirtyTreeMap(options.reason, options.ownerPathspecs, paths), paths, options.noReport);
  const finalMap = await buildDirtyTreeMap(options.reason, options.ownerPathspecs, paths);
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
  await fs.mkdir(path.dirname(paths.latestJson), { recursive: true });
  await fs.writeFile(paths.latestJson, `${JSON.stringify(map, null, 2)}\n`);

  if (noReport) return;

  const markdown = formatMarkdown(map);
  await fs.mkdir(path.dirname(paths.latestMarkdown), { recursive: true });
  await fs.mkdir(path.dirname(paths.reportJson), { recursive: true });
  await fs.writeFile(paths.latestMarkdown, markdown);
  await fs.writeFile(paths.reportJson, `${JSON.stringify(map, null, 2)}\n`);
  await fs.writeFile(paths.reportMarkdown, markdown);
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
  const raw = await fs.readFile(latestJson, "utf8").catch((error) => {
    throw new Error(
      [
        `A25 dirty-tree map is missing: ${toRepoRelativePath(latestJson)}`,
        "Run `npm run release:dirty-map -- --reason \"runtime release preflight\"` before any runtime release.",
        error.message
      ].join("\n")
    );
  });

  const saved = JSON.parse(raw);
  const current = await buildDirtyTreeMap(
    "runtime release dirty-tree assertion",
    options.ownerPathspecs,
    {
      latestJson,
      latestMarkdown: options.latestMarkdown
    }
  );

  if (saved.statusSignature !== current.statusSignature) {
    throw new Error(
      [
        "A25 dirty-tree map is stale; current git status no longer matches the latest map.",
        `Latest map: ${toRepoRelativePath(latestJson)}`,
        `Saved signature: ${saved.statusSignature}`,
        `Current signature: ${current.statusSignature}`,
        `Saved expanded entries: ${saved.statusCounts?.expandedStatusEntries ?? "unknown"}`,
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
    const generatedAt = Date.parse(saved.generatedAt);
    const ageMs = Date.now() - generatedAt;
    const maxAgeMs = options.maxAgeMinutes * 60 * 1000;
    if (!Number.isFinite(generatedAt) || ageMs > maxAgeMs) {
      throw new Error(
        [
          `A25 dirty-tree map is older than ${options.maxAgeMinutes} minutes.`,
          `Latest map: ${toRepoRelativePath(latestJson)}`,
          `Generated at: ${saved.generatedAt ?? "unknown"}`,
          "Refresh it immediately before runtime release."
        ].join("\n")
      );
    }
  }

  return {
    latestJson: toRepoRelativePath(latestJson),
    generatedAt: saved.generatedAt,
    statusSignature: saved.statusSignature,
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
