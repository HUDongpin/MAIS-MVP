#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"], process.cwd());
const date = hktDateStamp();

const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  executionSequence: "coordination/release-intake/latest-A25-dirty-worktree-closure-execution-sequence.json",
  a25Pathspec: "coordination/release-intake/latest-A25-owner-a25-git-hygiene-and-release-intake.pathspec",
  a10Pathspec: "coordination/release-intake/latest-A25-owner-a10-tooling-docs-and-report.pathspec",
  a22Pathspec: "coordination/release-intake/latest-A25-owner-a22-production-reliability-and-release-engineering.pathspec",
  latestJson: "coordination/release-intake/latest-A25-wave01-governance-readiness.json",
  latestMarkdown: "coordination/release-intake/latest-A25-wave01-governance-readiness.md",
  datedJson: `coordination/release-intake/${date}-A25-wave01-governance-readiness.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-wave01-governance-readiness.md`
};

const worktreePath = "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A25-dirty-closure-governance";
const helperTestArgs = [
  "--test",
  "scripts/cleanup-generated-artifacts.test.mjs",
  "scripts/deploy-vercel-preview.test.mjs",
  "scripts/deploy-vercel-production.test.mjs",
  "scripts/release-build-gate.test.mjs",
  "scripts/release-env-guard.test.mjs"
];

function git(args, cwd) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 512 * 1024 * 1024,
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

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function compactLines(value, maxLines = 40) {
  const lines = String(value ?? "").split("\n").filter(Boolean);
  if (lines.length <= maxLines) return lines;
  const head = Math.floor(maxLines / 2);
  const tail = maxLines - head;
  return [
    ...lines.slice(0, head),
    `... ${lines.length - maxLines} lines omitted ...`,
    ...lines.slice(-tail)
  ];
}

function run(command, args, cwd, options = {}) {
  return formatCommandResult(runRaw(command, args, cwd, options));
}

function runRaw(command, args, cwd, options = {}) {
  const timeoutMs = options.timeoutMs ?? 0;
  try {
    const stdout = execFileSync(command, args, {
      cwd,
      encoding: "utf8",
      maxBuffer: 512 * 1024 * 1024,
      ...(timeoutMs > 0 ? { timeout: timeoutMs } : {}),
      stdio: ["ignore", "pipe", "pipe"]
    });
    return {
      command: [command, ...args].join(" "),
      status: 0,
      passed: true,
      stdout,
      stderr: "",
      timeoutMs,
      timedOut: false
    };
  } catch (error) {
    const stdout = error?.stdout?.toString?.() ?? "";
    const stderr = error?.stderr?.toString?.() ?? "";
    const timedOut = timeoutMs > 0 && (error?.signal === "SIGTERM" || /spawnSync .* ETIMEDOUT/.test(error?.message ?? ""));
    return {
      command: [command, ...args].join(" "),
      status: typeof error?.status === "number" ? error.status : 1,
      passed: false,
      stdout,
      stderr,
      timeoutMs,
      timedOut
    };
  }
}

function formatCommandResult(result) {
  return {
    command: result.command,
    status: result.status,
    passed: result.passed,
    stdout: compactLines(result.stdout),
    ...(result.timeoutMs > 0 ? { timeoutMs: result.timeoutMs } : {}),
    ...(result.timedOut ? { timedOut: true } : {}),
    ...(result.stderr ? { stderr: compactLines(result.stderr, 80) } : {})
  };
}

function statusEntries(cwd) {
  const output = execFileSync("git", ["status", "--porcelain=v1", "-uall"], {
    cwd,
    encoding: "utf8",
    maxBuffer: 512 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  });
  return output.split("\n").filter(Boolean);
}

function statusPath(line) {
  return line.includes(" -> ") ? line.split(" -> ").pop() : line.slice(3);
}

function pathspecInfo() {
  const files = [paths.a25Pathspec, paths.a10Pathspec, paths.a22Pathspec];
  const contents = files.map((file) => `${file}\n${readText(file)}`).join("\n---\n");
  const allowedPaths = new Set(
    files.flatMap((file) => readText(file).split("\n").map((line) => line.trim()).filter(Boolean))
  );
  return {
    files,
    checksum: sha256(contents),
    allowedPaths
  };
}

function statusCoverage(entries, allowedPaths) {
  const uncovered = entries
    .map((line) => ({ line, path: statusPath(line) }))
    .filter((entry) => !allowedPaths.has(entry.path));
  return {
    statusEntries: entries.length,
    coveredEntries: entries.length - uncovered.length,
    uncoveredEntries: uncovered.length,
    uncovered
  };
}

function packageResyncRecommendations(uncovered, dirtyMap) {
  const rootEntriesByPath = new Map((dirtyMap.entries ?? []).map((entry) => [entry.path, entry]));
  return uncovered.map((entry) => {
    const rootEntry = rootEntriesByPath.get(entry.path);
    const rootPath = path.join(root, entry.path);
    const worktreeFilePath = path.join(worktreePath, entry.path);
    const isUntracked = entry.line.startsWith("??");
    const packageOnly = !rootEntry;
    const actionKind = packageOnly
      ? isUntracked
        ? "owner-approved-package-untracked-clean"
        : "owner-approved-package-restore"
      : "refresh-owner-pathspec-or-recopy-current-root-entry";
    const commandHint = packageOnly
      ? isUntracked
        ? `git clean -f -- ${entry.path}`
        : `git restore --source=HEAD -- ${entry.path}`
      : `rsync -R ${entry.path} /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A25-dirty-closure-governance/`;

    return {
      path: entry.path,
      worktreeStatus: entry.line.slice(0, 2),
      rootStatus: rootEntry?.status ?? null,
      rootOwner: rootEntry?.owner ?? null,
      rootSlice: rootEntry?.slice ?? null,
      rootPathExists: fs.existsSync(rootPath),
      worktreePathExists: fs.existsSync(worktreeFilePath),
      packageOnly,
      actionKind,
      commandHint,
      executableNow: false,
      cleanupAuthorized: false,
      approvalNeeded: packageOnly
        ? "Owner must explicitly approve this exact package-worktree resync/discard before any restore, clean, or file deletion."
        : "Refresh owner pathspecs or recopy the current root entry before package review."
    };
  });
}

function packageResyncCoverage(recommendations) {
  const packageOnlyRows = recommendations.filter((entry) => entry.packageOnly);
  const rootMappedRows = recommendations.filter((entry) => !entry.packageOnly);
  return {
    packageOnlyRows: packageOnlyRows.length,
    rootMappedRows: rootMappedRows.length,
    ownerAuthorizationRequiredRows: packageOnlyRows.length,
    rootPathspecOrRecopyRequiredRows: rootMappedRows.length,
    packageOnlyPaths: packageOnlyRows.map((entry) => entry.path),
    rootMappedPaths: rootMappedRows.map((entry) => entry.path),
    cleanupAuthorizedRows: recommendations.filter((entry) => entry.cleanupAuthorized).length,
    executableRows: recommendations.filter((entry) => entry.executableNow).length
  };
}

function parseTypeCheck(result) {
  const text = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  const errorLines = text.split("\n").filter((line) => /\.tsx?\(\d+,\d+\): error TS/.test(line));
  const byTop = {};
  const byFile = {};
  for (const line of errorLines) {
    const file = line.split("(")[0];
    const top = file.split("/")[0];
    byTop[top] = (byTop[top] ?? 0) + 1;
    byFile[file] = (byFile[file] ?? 0) + 1;
  }
  return {
    errorLines: errorLines.length,
    byTop,
    topFiles: Object.entries(byFile)
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .slice(0, 20)
      .map(([file, errors]) => ({ file, errors })),
    firstErrors: errorLines.slice(0, 25)
  };
}

function wave01(sequence) {
  return (sequence.waves ?? []).find((wave) => wave.waveId === "wave-01-governance-release-hygiene");
}

function markdown(payload) {
  const uncoveredRows = payload.pathspecCoverage.uncovered.map((entry) => {
    return `| \`${entry.line.slice(0, 2).trim() || "M"}\` | \`${entry.path}\` |`;
  }).join("\n") || "| none | none |";

  const topErrorRows = payload.typeCheck.summary.topFiles.map((entry) => {
    return `| \`${entry.file}\` | ${entry.errors} |`;
  }).join("\n") || "| none | 0 |";

  const checkRows = Object.entries(payload.checks).map(([name, check]) => {
    return `| ${name} | ${check.passed ? "pass" : "fail"} | ${check.status} | \`${check.command}\` |`;
  }).join("\n");

  return `# A25 Wave 01 Governance Readiness

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

Worktree: \`${payload.worktree.path}\`

Branch: \`${payload.worktree.branch}\`

This is readiness evidence only. It does not authorize staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, worktree removal, or any other physical cleanup.

## Result

- Commit ready: ${payload.commitReady ? "yes" : "no"}
- Blocking reasons: ${payload.blockingReasons.join("; ") || "none"}
- Status entries: ${payload.pathspecCoverage.statusEntries}
- Covered by A25/A10/A22 pathspec union: ${payload.pathspecCoverage.coveredEntries}
- Uncovered entries: ${payload.pathspecCoverage.uncoveredEntries}
- Package-only resync rows waiting for owner authorization: ${payload.packageResyncCoverage.ownerAuthorizationRequiredRows}
- True root/pathspec uncovered rows: ${payload.packageResyncCoverage.rootPathspecOrRecopyRequiredRows}
- Type-check errors: ${payload.typeCheck.summary.errorLines}

## Checks

| Check | Result | Status | Command |
| --- | --- | ---: | --- |
${checkRows}

## Uncovered Entries

| Status | Path |
| --- | --- |
${uncoveredRows}

## Package Resync Recommendations

These recommendations are non-executable. They do not authorize cleanup; they identify exact stale package-worktree entries that need owner approval before any restore, clean, discard, or recopy action.

| Path | Package-only | Action kind | Command hint |
| --- | --- | --- | --- |
${payload.packageResyncRecommendations.map((entry) => `| \`${entry.path}\` | ${entry.packageOnly ? "yes" : "no"} | ${entry.actionKind} | \`${entry.commandHint}\` |`).join("\n") || "| none | n/a | n/a | n/a |"}

## Type-Check Hotspots

| File | Errors |
| --- | ---: |
${topErrorRows}
`;
}

function main() {
  const dirtyMap = readJson(paths.dirtyMap);
  const sequence = readJson(paths.executionSequence);
  const wave = wave01(sequence);
  if (!wave) throw new Error("Wave 01 is missing from the closure execution sequence.");
  if (sequence.dirtyMapStatusSignature !== dirtyMap.statusSignature) {
    throw new Error("Closure execution sequence is stale relative to dirty map.");
  }

  const pathspec = pathspecInfo();
  const entries = statusEntries(worktreePath);
  const coverage = statusCoverage(entries, pathspec.allowedPaths);
  const resyncRecommendations = packageResyncRecommendations(coverage.uncovered, dirtyMap);
  const resyncCoverage = packageResyncCoverage(resyncRecommendations);
  const worktree = {
    path: worktreePath,
    branch: git(["branch", "--show-current"], worktreePath),
    head: git(["rev-parse", "--short", "HEAD"], worktreePath),
    statusSignature: sha256(entries.slice().sort().join("\0")),
    nodeModulesPresent: fs.existsSync(path.join(worktreePath, "node_modules"))
  };

  const checks = {
    highAudit: run("npm", ["audit", "--audit-level=high"], worktreePath, { timeoutMs: 120000 }),
    releaseHelperTests: run(process.execPath, helperTestArgs, worktreePath, { timeoutMs: 120000 }),
    typeCheck: null
  };
  const typeCheckRaw = runRaw("npm", ["run", "type-check", "--", "--pretty", "false"], worktreePath, { timeoutMs: 180000 });
  checks.typeCheck = formatCommandResult(typeCheckRaw);
  const typeCheck = {
    passed: checks.typeCheck.passed,
    status: checks.typeCheck.status,
    summary: parseTypeCheck(typeCheckRaw)
  };

  const blockingReasons = [];
  if (resyncCoverage.rootPathspecOrRecopyRequiredRows > 0) {
    blockingReasons.push(`${resyncCoverage.rootPathspecOrRecopyRequiredRows} dirty entries are outside the A25/A10/A22 pathspec union and require pathspec refresh or root recopy`);
  }
  if (resyncCoverage.ownerAuthorizationRequiredRows > 0) {
    blockingReasons.push(`${resyncCoverage.ownerAuthorizationRequiredRows} package-only dirty entries need owner-approved package resync authorization`);
  }
  if (!checks.highAudit.passed) blockingReasons.push(checks.highAudit.timedOut ? "npm audit --audit-level=high timed out" : "npm audit --audit-level=high failed");
  if (!checks.releaseHelperTests.passed) blockingReasons.push(checks.releaseHelperTests.timedOut ? "release helper tests timed out" : "release helper tests failed");
  if (!checks.typeCheck.passed) blockingReasons.push(checks.typeCheck.timedOut ? "npm run type-check timed out" : "npm run type-check failed");

  const payload = {
    generatedAt: new Date().toISOString(),
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    executionSequenceGeneratedAt: sequence.generatedAt,
    wave: {
      waveId: wave.waveId,
      name: wave.name,
      ownerApprovals: wave.ownerApprovals.map((row) => row.approvalId),
      physicalLifecycleApprovals: wave.physicalLifecycleApprovals.map((row) => row.approvalId)
    },
    worktree,
    pathspecs: {
      files: pathspec.files,
      checksum: pathspec.checksum,
      allowedPaths: pathspec.allowedPaths.size
    },
    pathspecCoverage: coverage,
    packageResyncRecommendations: resyncRecommendations,
    packageResyncCoverage: resyncCoverage,
    checks,
    typeCheck,
    commitReady: blockingReasons.length === 0,
    cleanupAuthorized: false,
    executableNow: false,
    blockingReasons
  };

  const json = `${JSON.stringify(payload, null, 2)}\n`;
  write(paths.latestJson, json);
  write(paths.datedJson, json);
  write(paths.latestMarkdown, markdown(payload));
  write(paths.datedMarkdown, markdown(payload));

  console.log(JSON.stringify({
    latestJson: paths.latestJson,
    latestMarkdown: paths.latestMarkdown,
    commitReady: payload.commitReady,
    statusEntries: coverage.statusEntries,
    uncoveredEntries: coverage.uncoveredEntries,
    packageOnlyResyncRows: resyncCoverage.ownerAuthorizationRequiredRows,
    truePathspecUncoveredRows: resyncCoverage.rootPathspecOrRecopyRequiredRows,
    highAudit: checks.highAudit.passed,
    releaseHelperTests: checks.releaseHelperTests.passed,
    typeCheck: checks.typeCheck.passed,
    typeCheckErrors: typeCheck.summary.errorLines
  }, null, 2));
}

main();
