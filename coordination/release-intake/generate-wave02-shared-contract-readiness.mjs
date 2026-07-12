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
  a08Pathspec: "coordination/release-intake/latest-A25-owner-a08-state-and-analytics-lead.pathspec",
  a12Pathspec: "coordination/release-intake/latest-A25-owner-a12-backend-api-platform.pathspec",
  latestJson: "coordination/release-intake/latest-A25-wave02-shared-contract-readiness.json",
  latestMarkdown: "coordination/release-intake/latest-A25-wave02-shared-contract-readiness.md",
  datedJson: `coordination/release-intake/${date}-A25-wave02-shared-contract-readiness.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-wave02-shared-contract-readiness.md`
};

const worktreePath = "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A08-A12-shared-contract-closure";
const commandTimeoutMs = 4 * 60 * 1000;

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

function compactLines(value, maxLines = 50) {
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

function run(command, args, cwd) {
  return formatCommandResult(runRaw(command, args, cwd));
}

function runRaw(command, args, cwd) {
  try {
    const stdout = execFileSync(command, args, {
      cwd,
      encoding: "utf8",
      maxBuffer: 512 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
      timeout: commandTimeoutMs
    });
    return {
      command: [command, ...args].join(" "),
      status: 0,
      passed: true,
      stdout,
      stderr: ""
    };
  } catch (error) {
    const stdout = error?.stdout?.toString?.() ?? "";
    const stderr = error?.stderr?.toString?.() ?? "";
    return {
      command: [command, ...args].join(" "),
      status: typeof error?.status === "number" ? error.status : 1,
      signal: error?.signal ?? null,
      passed: false,
      stdout,
      stderr
    };
  }
}

function formatCommandResult(result) {
  return {
    command: result.command,
    status: result.status,
    ...(result.signal ? { signal: result.signal } : {}),
    passed: result.passed,
    stdout: compactLines(result.stdout),
    ...(result.stderr ? { stderr: compactLines(result.stderr, 100) } : {})
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
  const files = [paths.a08Pathspec, paths.a12Pathspec];
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

function wave02(sequence) {
  return (sequence.waves ?? []).find((wave) => wave.waveId === "wave-02-shared-contracts");
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

  return `# A25 Wave 02 Shared Contract Readiness

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
- Covered by A08/A12 pathspec union: ${payload.pathspecCoverage.coveredEntries}
- Uncovered entries: ${payload.pathspecCoverage.uncoveredEntries}
- Type-check errors: ${payload.typeCheck.summary.errorLines}

## Checks

| Check | Result | Status | Command |
| --- | --- | ---: | --- |
${checkRows}

## Uncovered Entries

| Status | Path |
| --- | --- |
${uncoveredRows}

## Type-Check Hotspots

| File | Errors |
| --- | ---: |
${topErrorRows}
`;
}

function main() {
  const dirtyMap = readJson(paths.dirtyMap);
  const sequence = readJson(paths.executionSequence);
  const wave = wave02(sequence);
  if (!wave) throw new Error("Wave 02 is missing from the closure execution sequence.");
  if (sequence.dirtyMapStatusSignature !== dirtyMap.statusSignature) {
    throw new Error("Closure execution sequence is stale relative to dirty map.");
  }

  const pathspec = pathspecInfo();
  const entries = statusEntries(worktreePath);
  const coverage = statusCoverage(entries, pathspec.allowedPaths);
  const worktree = {
    path: worktreePath,
    branch: git(["branch", "--show-current"], worktreePath),
    head: git(["rev-parse", "--short", "HEAD"], worktreePath),
    statusSignature: sha256(entries.slice().sort().join("\0")),
    nodeModulesPresent: fs.existsSync(path.join(worktreePath, "node_modules"))
  };

  const checks = {
    testAnalytics: run("npm", ["run", "test:analytics"], worktreePath),
    testBackend: run("npm", ["run", "test:backend"], worktreePath),
    typeCheck: null,
    build: null
  };
  const typeCheckRaw = runRaw("npm", ["run", "type-check", "--", "--pretty", "false"], worktreePath);
  checks.typeCheck = formatCommandResult(typeCheckRaw);
  const buildRaw = runRaw("npm", ["run", "build"], worktreePath);
  checks.build = formatCommandResult(buildRaw);

  const typeCheck = {
    passed: checks.typeCheck.passed,
    status: checks.typeCheck.status,
    summary: parseTypeCheck(typeCheckRaw)
  };

  const blockingReasons = [];
  if (coverage.uncoveredEntries > 0) blockingReasons.push(`${coverage.uncoveredEntries} dirty entries are outside the A08/A12 pathspec union`);
  for (const [name, check] of Object.entries(checks)) {
    if (!check.passed) blockingReasons.push(`${name} failed`);
  }

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
    testAnalytics: checks.testAnalytics.passed,
    testBackend: checks.testBackend.passed,
    typeCheck: checks.typeCheck.passed,
    build: checks.build.passed,
    typeCheckErrors: typeCheck.summary.errorLines
  }, null, 2));
}

main();
