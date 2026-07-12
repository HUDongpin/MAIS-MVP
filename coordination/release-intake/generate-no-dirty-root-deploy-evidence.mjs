#!/usr/bin/env node
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const NO_DIRTY_ROOT_DEPLOY_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  latestJson: "coordination/release-intake/latest-A25-no-dirty-root-deploy-evidence.json",
  latestMarkdown: "coordination/release-intake/latest-A25-no-dirty-root-deploy-evidence.md",
  datedJson: `coordination/release-intake/${date}-A25-no-dirty-root-deploy-evidence.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-no-dirty-root-deploy-evidence.md`
};

const guardEnv = {
  MAIS_RELEASE_MIN_FREE_GB: "0.001"
};

const deploymentRecordNames = [
  "vercel-preview-deployment.json",
  "vercel-production-deployment.json"
];

function git(args, cwd = process.cwd()) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();
}

function hktDateStamp() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function write(relativePath, content) {
  fs.writeFileSync(path.join(root, relativePath), content);
}

function splitLines(value) {
  return String(value ?? "").split("\n").filter(Boolean);
}

function compact(value, maxLines = 18) {
  const lines = splitLines(value);
  if (lines.length <= maxLines) return lines;
  const head = Math.floor(maxLines / 2);
  return [
    ...lines.slice(0, head),
    `... ${lines.length - maxLines} lines omitted ...`,
    ...lines.slice(-(maxLines - head))
  ];
}

function formatCommand(bin, args, env) {
  const displayBin = bin === process.execPath ? "node" : bin;
  const prefix = Object.entries(env ?? {})
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`);
  return [...prefix, displayBin, ...args].join(" ");
}

function runCommand(bin, args, options = {}) {
  const env = options.env ?? {};
  const result = spawnSync(bin, args, {
    cwd: root,
    env: { ...process.env, ...env },
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  });
  const status = typeof result.status === "number" ? result.status : 1;
  return {
    command: formatCommand(bin, args, env),
    status,
    passed: status === 0,
    stdout: compact(result.stdout),
    stderr: compact(result.stderr, 24),
    error: result.error?.message
  };
}

function classifyGuardFailure(commandResult) {
  const text = [...(commandResult.stdout ?? []), ...(commandResult.stderr ?? [])].join("\n");
  return {
    hasDirtyMapStaleBlock: (
      text.includes("A25 dirty-tree map is stale") ||
      text.includes("Runtime release preflight requires a fresh A25 dirty-tree map")
    ),
    hasDiskBlock: text.includes("Release guard failed: only"),
    hasReleaseSourceBlock: (
      text.includes("A22 release-source clean gate failed") ||
      text.includes("Release source is dirty") ||
      text.includes("MAIS-MVP root checkout is an integration inventory")
    ),
    hasStrictLifecycleBlock: text.includes("A25 strict worktree lifecycle gate failed"),
    hasDirectDirtyRootBlock: text.includes("Direct root deploy is blocked because the worktree is dirty")
  };
}

function expectedReleaseGuardBlock(commandResult) {
  const classification = classifyGuardFailure(commandResult);
  return !commandResult.passed &&
    !classification.hasDiskBlock &&
    (
      classification.hasDirtyMapStaleBlock ||
      classification.hasReleaseSourceBlock ||
      classification.hasStrictLifecycleBlock ||
      classification.hasDirectDirtyRootBlock
    );
}

function expectedDirtyMapProbeState(commandResult) {
  const text = [...(commandResult.stdout ?? []), ...(commandResult.stderr ?? [])].join("\n");
  return commandResult.passed || text.includes("A25 dirty-tree map is stale");
}

function rootStatusSummary() {
  const statusLines = splitLines(git(["status", "--porcelain=v1", "-uall"], root));
  const untrackedFiles = splitLines(git(["ls-files", "--others", "--exclude-standard"], root));
  const summary = {
    statusEntries: statusLines.length,
    trackedModified: 0,
    trackedDeleted: 0,
    untrackedStatusEntries: 0,
    untrackedFiles: untrackedFiles.length
  };

  for (const line of statusLines) {
    const indexStatus = line[0] ?? " ";
    const worktreeStatus = line[1] ?? " ";
    if (line.startsWith("??")) {
      summary.untrackedStatusEntries += 1;
    } else if (indexStatus === "D" || worktreeStatus === "D") {
      summary.trackedDeleted += 1;
    } else {
      summary.trackedModified += 1;
    }
  }

  return summary;
}

function wrapperChecksFor(relativePath, checks) {
  const source = readText(relativePath);
  const results = checks.map((check) => ({
    id: check.id,
    label: check.label,
    passed: check.needles.every((needle) => source.includes(needle)),
    missingNeedles: check.needles.filter((needle) => !source.includes(needle))
  }));
  return {
    path: relativePath,
    passed: results.every((result) => result.passed),
    checks: results
  };
}

function inspectDeployWrappers() {
  return {
    preview: wrapperChecksFor("scripts/deploy-vercel-preview.mjs", [
      {
        id: "preview-preflight",
        label: "Preview wrapper runs the release-env preview preflight before deploy",
        needles: ["scripts/release-env-guard.mjs", "preview"]
      },
      {
        id: "preview-staging-source",
        label: "Preview wrapper deploys the prepared staging directory",
        needles: ["prepareVercelStaging", "staging.stagingDir", "\"deploy\""]
      },
      {
        id: "preview-target",
        label: "Preview wrapper is constrained to the preview target",
        needles: ["DEFAULT_TARGET = \"preview\"", "\"--target\"", "target !== \"preview\""]
      }
    ]),
    production: wrapperChecksFor("scripts/deploy-vercel-production.mjs", [
      {
        id: "production-preflight",
        label: "Production wrapper runs the staged-publish preflight before deploy",
        needles: ["scripts/release-env-guard.mjs", "staged-publish"]
      },
      {
        id: "production-staging-source",
        label: "Production wrapper deploys the prepared staging directory",
        needles: ["prepareVercelStaging", "staging.stagingDir", "\"deploy\""]
      },
      {
        id: "production-skip-domain",
        label: "Production wrapper deploys with --skip-domain before promotion gates",
        needles: ["\"--prod\"", "\"--skip-domain\"", "\"promote\""]
      }
    ])
  };
}

function isInside(absolutePath, basePath) {
  const relative = path.relative(basePath, absolutePath);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function relativeIfInside(absolutePath, basePath) {
  if (!absolutePath || !isInside(absolutePath, basePath)) return null;
  return path.relative(basePath, absolutePath) || ".";
}

function listDeploymentRecords() {
  const stagingRoot = path.join(root, ".tmp", "vercel-staging");
  const records = [];
  if (!fs.existsSync(stagingRoot)) {
    return {
      stagingRoot: ".tmp/vercel-staging",
      recordCount: 0,
      invalidCount: 0,
      records
    };
  }

  for (const entry of fs.readdirSync(stagingRoot, { withFileTypes: true })) {
    const candidateDir = path.join(stagingRoot, entry.name);
    if (!entry.isDirectory()) continue;
    for (const recordName of deploymentRecordNames) {
      const recordPath = path.join(candidateDir, recordName);
      if (!fs.existsSync(recordPath)) continue;
      records.push(readDeploymentRecord(recordPath));
    }
  }

  const invalidCount = records.filter((record) => !record.valid).length;
  return {
    stagingRoot: ".tmp/vercel-staging",
    recordCount: records.length,
    invalidCount,
    records: records.sort((left, right) => left.recordPath.localeCompare(right.recordPath))
  };
}

function readDeploymentRecord(absoluteRecordPath) {
  const recordPath = relativeIfInside(absoluteRecordPath, root) ?? path.basename(absoluteRecordPath);
  try {
    const parsed = JSON.parse(fs.readFileSync(absoluteRecordPath, "utf8"));
    const stagingDir = typeof parsed.stagingDir === "string" ? path.resolve(parsed.stagingDir) : null;
    const target = parsed.target ?? "(missing)";
    const validTarget = target === "preview" || target === "production";
    const stagingDirIsRepoRoot = stagingDir === root;
    const stagingDirRelative = stagingDir ? relativeIfInside(stagingDir, root) : null;
    const stagingDirLocation = stagingDir
      ? stagingDirIsRepoRoot
        ? "repo-root"
        : stagingDirRelative
          ? "inside-repo"
          : "outside-repo"
      : "missing";
    const valid = Boolean(stagingDir) && !stagingDirIsRepoRoot && validTarget;
    return {
      recordPath,
      target,
      dryRun: parsed.dryRun === true,
      hasDeploymentUrl: typeof parsed.deploymentUrl === "string" && parsed.deploymentUrl.length > 0,
      inspectVerified: parsed.inspectVerified === true,
      promotionVerified: parsed.promotionVerified === true,
      deployedAt: parsed.deployedAt ?? null,
      stagingDirRelative,
      stagingDirLocation,
      stagingDirIsRepoRoot,
      validTarget,
      valid
    };
  } catch (error) {
    return {
      recordPath,
      parseError: error instanceof Error ? error.message : String(error),
      valid: false
    };
  }
}

function summarizeCommands(commands) {
  return Object.fromEntries(Object.entries(commands).map(([key, result]) => {
    const classification = key.endsWith("Guard") ? classifyGuardFailure(result) : undefined;
    return [key, {
      ...result,
      expectedBlocked: key.endsWith("Guard") ? expectedReleaseGuardBlock(result) : undefined,
      expectedSafeState: key === "dirtyMapCurrent" ? expectedDirtyMapProbeState(result) : undefined,
      failureClassification: classification
    }];
  }));
}

function collectFailures(payload) {
  const failures = [];
  if (!payload.commands.dirtyMapCurrent.expectedSafeState) {
    failures.push("A25 dirty-tree map currentness command did not pass or fail closed safely");
  }
  for (const [key, label] of [
    ["rootDeployGuard", "root/direct deploy guard"],
    ["previewGuard", "preview preflight guard"],
    ["stagedPublishGuard", "staged production preflight guard"]
  ]) {
    if (!payload.commands[key].expectedBlocked) {
      failures.push(`${label} did not fail closed on release-source or lifecycle blockers`);
    }
  }
  if (!payload.wrapperChecks.preview.passed) failures.push("preview deploy wrapper staging/preflight invariants failed");
  if (!payload.wrapperChecks.production.passed) failures.push("production deploy wrapper staging/preflight invariants failed");
  if (payload.localDeploymentRecords.invalidCount > 0) {
    failures.push(`local deployment records with invalid staging provenance: ${payload.localDeploymentRecords.invalidCount}`);
  }
  return failures;
}

export function buildNoDirtyRootDeployEvidence() {
  const dirtyMap = readJson(NO_DIRTY_ROOT_DEPLOY_PATHS.dirtyMap);
  const commands = summarizeCommands({
    dirtyMapCurrent: runCommand("npm", ["run", "release:dirty-map", "--", "--assert-current", "--max-age-minutes", "60"]),
    rootDeployGuard: runCommand(process.execPath, ["scripts/release-env-guard.mjs", "root-deploy", "--json"], { env: guardEnv }),
    previewGuard: runCommand(process.execPath, ["scripts/release-env-guard.mjs", "preview", "--json"], { env: guardEnv }),
    stagedPublishGuard: runCommand(process.execPath, ["scripts/release-env-guard.mjs", "staged-publish", "--json"], { env: guardEnv })
  });

  const payload = {
    generatedAt: new Date().toISOString(),
    localEvidenceOnly: true,
    externalVercelAudit: false,
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    rootStatusSummary: rootStatusSummary(),
    commands,
    wrapperChecks: inspectDeployWrappers(),
    localDeploymentRecords: listDeploymentRecords(),
    deployCommandsExecutedByThisScript: [],
    boundary: [
      "A25 evidence only; this script does not run vercel deploy, vercel promote, or vercel inspect.",
      "This is local repository and wrapper evidence, not an external historical Vercel deployment audit.",
      "The real release guard still uses its normal disk threshold; this probe lowers only the probe process threshold so dirty-root/source blockers can be observed."
    ]
  };
  payload.failures = collectFailures(payload);
  payload.passed = payload.failures.length === 0;
  return payload;
}

function markdown(payload) {
  const commandRows = Object.entries(payload.commands).map(([key, command]) => {
    const expected = command.expectedBlocked === undefined ? "n/a" : command.expectedBlocked ? "yes" : "no";
    return `| ${key} | ${command.status} | ${command.passed ? "passed" : "failed"} | ${expected} |`;
  }).join("\n");

  const wrapperRows = Object.entries(payload.wrapperChecks).flatMap(([wrapperName, wrapper]) => {
    return wrapper.checks.map((check) => {
      return `| ${wrapperName} | ${check.id} | ${check.passed ? "pass" : "fail"} | ${check.label} |`;
    });
  }).join("\n");

  const recordRows = payload.localDeploymentRecords.records.length > 0
    ? payload.localDeploymentRecords.records.map((record) => {
        return `| \`${record.recordPath}\` | ${record.target ?? "(unknown)"} | ${record.stagingDirLocation ?? "(unknown)"} | ${record.stagingDirIsRepoRoot ? "yes" : "no"} | ${record.valid ? "yes" : "no"} |`;
      }).join("\n")
    : "| none | n/a | n/a | n/a | n/a |";

  return `# A25 No Dirty Root Deploy Evidence

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

Result: ${payload.passed ? "pass" : "fail"}

This is local evidence only. It does not claim an external historical Vercel audit. It does not authorize staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, worktree removal, or any other physical cleanup.

## Boundary

- A25-owned evidence only; deploy commands executed by this script: ${payload.deployCommandsExecutedByThisScript.length}
- A22-owned release wrappers were inspected as source, and A22/A25 release guards were probed without running \`vercel deploy\`.
- The probe overrides only \`MAIS_RELEASE_MIN_FREE_GB\` inside the guard probe processes so source/lifecycle blockers can be observed despite local disk pressure.

## Guard Probes

| Probe | Exit status | Command result | Failed closed |
| --- | ---: | --- | --- |
${commandRows}

## Wrapper Invariants

| Wrapper | Check | Result | Evidence |
| --- | --- | --- | --- |
${wrapperRows}

## Local Deployment Records

Records inspected under \`${payload.localDeploymentRecords.stagingRoot}\`: ${payload.localDeploymentRecords.recordCount}

| Record | Target | Staging dir location | Staging dir is repo root | Valid |
| --- | --- | --- | --- | --- |
${recordRows}

## Failures

${payload.failures.length > 0 ? payload.failures.map((failure) => `- ${failure}`).join("\n") : "- none"}
`;
}

function writePayload(payload) {
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const md = markdown(payload);
  write(NO_DIRTY_ROOT_DEPLOY_PATHS.latestJson, json);
  write(NO_DIRTY_ROOT_DEPLOY_PATHS.datedJson, json);
  write(NO_DIRTY_ROOT_DEPLOY_PATHS.latestMarkdown, md);
  write(NO_DIRTY_ROOT_DEPLOY_PATHS.datedMarkdown, md);
}

function main() {
  const payload = buildNoDirtyRootDeployEvidence();
  writePayload(payload);
  console.log(JSON.stringify({
    latestJson: NO_DIRTY_ROOT_DEPLOY_PATHS.latestJson,
    latestMarkdown: NO_DIRTY_ROOT_DEPLOY_PATHS.latestMarkdown,
    datedJson: NO_DIRTY_ROOT_DEPLOY_PATHS.datedJson,
    datedMarkdown: NO_DIRTY_ROOT_DEPLOY_PATHS.datedMarkdown,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature,
    expandedStatusEntries: payload.expandedStatusEntries,
    passed: payload.passed,
    failures: payload.failures,
    localDeploymentRecords: payload.localDeploymentRecords.recordCount
  }, null, 2));
  if (!payload.passed) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
