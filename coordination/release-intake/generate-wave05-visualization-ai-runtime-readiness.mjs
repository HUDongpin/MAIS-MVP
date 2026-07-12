#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"], process.cwd());
const date = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Hong_Kong",
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
}).format(new Date());
const waveId = "wave-05-visualization-ai-runtime";
const timeout = 4 * 60 * 1000;

const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  sequence: "coordination/release-intake/latest-A25-dirty-worktree-closure-execution-sequence.json",
  latestJson: "coordination/release-intake/latest-A25-wave05-visualization-ai-runtime-readiness.json",
  latestMd: "coordination/release-intake/latest-A25-wave05-visualization-ai-runtime-readiness.md",
  datedJson: `coordination/release-intake/${date}-A25-wave05-visualization-ai-runtime-readiness.json`,
  datedMd: `coordination/release-intake/${date}-A25-wave05-visualization-ai-runtime-readiness.md`
};

const packages = [
  {
    packageId: "a06-visualization",
    name: "A06 visualization",
    owners: ["A06 visualization lead"],
    approvalIds: ["a06-visualization-lead"],
    worktreePath: "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A06-visualization-closure",
    pathspecs: ["coordination/release-intake/latest-A25-owner-a06-visualization-lead.pathspec"],
    checks: [
      npmCheck("typeCheck", "run", "type-check", "--", "--pretty", "false"),
      nodeCheck("visualizationNodeTests", "--test", "components/visualizations/configuredVisualizationLabRegressions.test.ts", "components/visualizations/three/threeDCanvasContract.test.ts", "components/visualizations/visualizationDiagnostics.test.ts"),
      npxCheck("visualizationPlaywright", "playwright", "test", "tests/e2e/visualization-values.spec.ts", "tests/e2e/visualization-overlap.spec.ts", "--project=desktop-chrome")
    ]
  },
  {
    packageId: "a07-ai-tutor",
    name: "A07 AI tutor",
    owners: ["A07 AI tutor lead"],
    approvalIds: ["a07-ai-tutor-lead"],
    worktreePath: "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A07-ai-tutor-closure",
    pathspecs: ["coordination/release-intake/latest-A25-owner-a07-ai-tutor-lead.pathspec"],
    checks: [
      npmCheck("typeCheck", "run", "type-check", "--", "--pretty", "false"),
      npxCheck("aiTutorPlaywright", "playwright", "test", "tests/e2e/ai-tutor-deepseek.spec.ts", "tests/e2e/ai-tutor-live-text.spec.ts", "--project=desktop-chrome")
    ]
  },
  {
    packageId: "a09-copy-i18n-accessibility",
    name: "A09 copy/i18n/accessibility",
    owners: ["A09 copy, i18n, accessibility"],
    approvalIds: ["a09-copy-i18n-accessibility"],
    worktreePath: "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A09-copy-i18n-accessibility-closure",
    pathspecs: ["coordination/release-intake/latest-A25-owner-a09-copy-i18n-accessibility.pathspec"],
    checks: [npmCheck("typeCheck", "run", "type-check", "--", "--pretty", "false")]
  },
  {
    packageId: "a11-regression-evidence",
    name: "A11 regression evidence",
    owners: ["A11 QA and release quality"],
    approvalIds: ["a11-qa-and-release-quality"],
    worktreePath: "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A11-regression-evidence-closure",
    pathspecs: ["coordination/release-intake/latest-A25-owner-a11-qa-and-release-quality.pathspec"],
    checks: [
      npmCheck("typeCheck", "run", "type-check", "--", "--pretty", "false"),
      npxCheck("regressionPlaywright", "playwright", "test", "tests/e2e/student-smoke.spec.ts", "tests/e2e/backend-api.spec.ts", "--project=desktop-chrome")
    ]
  },
  {
    packageId: "a13-a14-console",
    name: "A13/A14 console",
    owners: ["A13 teacher console", "A14 parent console"],
    approvalIds: ["a13-teacher-console", "a14-parent-console"],
    worktreePath: "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A13-A14-console-closure",
    pathspecs: [
      "coordination/release-intake/latest-A25-owner-a13-teacher-console.pathspec",
      "coordination/release-intake/latest-A25-owner-a14-parent-console.pathspec"
    ],
    checks: [
      npmCheck("typeCheck", "run", "type-check", "--", "--pretty", "false"),
      npxCheck("consolePlaywright", "playwright", "test", "tests/e2e/teacher-workspace.spec.ts", "tests/e2e/parent-console.spec.ts", "tests/e2e/class-forum.spec.ts", "--project=desktop-chrome")
    ]
  },
  {
    packageId: "a16-research-evidence",
    name: "A16 research evidence",
    owners: ["A16 research and learning science"],
    approvalIds: ["a16-research-and-learning-science"],
    worktreePath: "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A16-research-evidence-closure",
    pathspecs: ["coordination/release-intake/latest-A25-owner-a16-research-and-learning-science.pathspec"],
    checks: []
  },
  {
    packageId: "a17-a20-game-motivation",
    name: "A17/A20 games and motivation",
    owners: ["A17 gamification and motivation", "A20 game design and game-based learning"],
    approvalIds: ["a17-gamification-and-motivation", "a20-game-design-and-game-based-learning"],
    worktreePath: "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A17-A20-game-motivation-closure",
    pathspecs: [
      "coordination/release-intake/latest-A25-owner-a17-gamification-and-motivation.pathspec",
      "coordination/release-intake/latest-A25-owner-a20-game-design-and-game-based-learning.pathspec"
    ],
    checks: [
      npmCheck("typeCheck", "run", "type-check", "--", "--pretty", "false"),
      npxCheck("gameMotivationPlaywright", "playwright", "test", "tests/e2e/adventure-island.spec.ts", "tests/e2e/fishing-game.spec.ts", "tests/e2e/gamification.spec.ts", "--project=desktop-chrome")
    ]
  }
];

function npmCheck(name, ...args) {
  return { name, command: "npm", args };
}

function nodeCheck(name, ...args) {
  return { name, command: "node", args };
}

function npxCheck(name, ...args) {
  return { name, command: "npx", args };
}

function git(args, cwd) {
  return execFileSync("git", args, { cwd, encoding: "utf8", maxBuffer: 512 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function readOptionalJson(relativePath) {
  try {
    return readJson(relativePath);
  } catch {
    return null;
  }
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
  return [...lines.slice(0, head), `... ${lines.length - maxLines} lines omitted ...`, ...lines.slice(-(maxLines - head))];
}

function runRaw(command, args, cwd) {
  try {
    const stdout = execFileSync(command, args, {
      cwd,
      encoding: "utf8",
      maxBuffer: 512 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
      timeout
    });
    return { command: [command, ...args].join(" "), status: 0, passed: true, stdout, stderr: "" };
  } catch (error) {
    return {
      command: [command, ...args].join(" "),
      status: typeof error?.status === "number" ? error.status : 1,
      signal: error?.signal ?? null,
      passed: false,
      stdout: error?.stdout?.toString?.() ?? "",
      stderr: error?.stderr?.toString?.() ?? ""
    };
  }
}

function formatResult(result) {
  return {
    command: result.command,
    status: result.status,
    ...(result.signal ? { signal: result.signal } : {}),
    passed: result.passed,
    stdout: compactLines(result.stdout),
    ...(result.stderr ? { stderr: compactLines(result.stderr, 100) } : {})
  };
}

function skippedCheck(check, reason) {
  return {
    command: [check.command, ...check.args].join(" "),
    status: null,
    passed: false,
    skipped: true,
    skipReason: reason,
    stdout: []
  };
}

function statusEntries(cwd) {
  return execFileSync("git", ["status", "--porcelain=v1", "-uall"], {
    cwd,
    encoding: "utf8",
    maxBuffer: 512 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  }).split("\n").filter(Boolean);
}

function statusPath(line) {
  return line.includes(" -> ") ? line.split(" -> ").pop() : line.slice(3);
}

function pathspecInfo(files) {
  const text = files.map((file) => `${file}\n${readText(file)}`).join("\n---\n");
  const allowedPaths = new Set(files.flatMap((file) => readText(file).split("\n").map((line) => line.trim()).filter(Boolean)));
  return { files, checksum: sha256(text), allowedPaths };
}

function commandText(check) {
  return [check.command, ...check.args].join(" ");
}

function statusCoverage(entries, allowedPaths) {
  const uncovered = entries.map((line) => ({ line, path: statusPath(line) })).filter((entry) => !allowedPaths.has(entry.path));
  return {
    statusEntries: entries.length,
    coveredEntries: entries.length - uncovered.length,
    uncoveredEntries: uncovered.length,
    uncovered
  };
}

function sameNumber(left, right) {
  return Number(left) === Number(right);
}

function cachedPackageUsable(config, cached, worktree, pathspec, coverage) {
  if (!cached) return false;
  if (cached.packageId !== config.packageId) return false;
  if (cached.worktree?.exists !== worktree.exists) return false;
  if ((cached.worktree?.branch ?? "") !== worktree.branch) return false;
  if ((cached.worktree?.head ?? "") !== worktree.head) return false;
  if ((cached.worktree?.statusSignature ?? "") !== worktree.statusSignature) return false;
  if (cached.worktree?.nodeModulesPresent !== worktree.nodeModulesPresent) return false;
  if ((cached.pathspecs?.checksum ?? "") !== pathspec.checksum) return false;
  if (!sameNumber(cached.pathspecs?.allowedPaths, pathspec.allowedPaths.size)) return false;
  if (!sameNumber(cached.pathspecCoverage?.statusEntries, coverage.statusEntries)) return false;
  if (!sameNumber(cached.pathspecCoverage?.coveredEntries, coverage.coveredEntries)) return false;
  if (!sameNumber(cached.pathspecCoverage?.uncoveredEntries, coverage.uncoveredEntries)) return false;
  for (const check of config.checks) {
    if ((cached.checks?.[check.name]?.command ?? "") !== commandText(check)) return false;
  }
  return true;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function parseTypeCheck(raw) {
  const text = `${raw.stdout ?? ""}\n${raw.stderr ?? ""}`;
  const errorLines = text.split("\n").filter((line) => /\.tsx?\(\d+,\d+\): error TS/.test(line));
  const byTop = {};
  const byFile = {};
  for (const line of errorLines) {
    const file = line.split("(")[0];
    byTop[file.split("/")[0]] = (byTop[file.split("/")[0]] ?? 0) + 1;
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

function packageReadiness(config, previousPackagesById, previousGeneratedAt) {
  const pathspec = pathspecInfo(config.pathspecs);
  if (!fs.existsSync(config.worktreePath)) {
    const checks = Object.fromEntries(config.checks.map((check) => [check.name, skippedCheck(check, "package worktree is missing")]));
    return {
      packageId: config.packageId,
      name: config.name,
      owners: config.owners,
      approvalIds: config.approvalIds,
      worktree: { path: config.worktreePath, exists: false, branch: "", head: "", statusSignature: "", nodeModulesPresent: false },
      pathspecs: { files: pathspec.files, checksum: pathspec.checksum, allowedPaths: pathspec.allowedPaths.size },
      pathspecCoverage: { statusEntries: 0, coveredEntries: 0, uncoveredEntries: 0, uncovered: [] },
      checks,
      typeCheck: { passed: false, status: null, skipped: true, summary: { errorLines: 0, byTop: {}, topFiles: [], firstErrors: [] } },
      blockingReasons: [`${config.name} package worktree is missing`],
      ready: false
    };
  }

  const entries = statusEntries(config.worktreePath);
  const coverage = statusCoverage(entries, pathspec.allowedPaths);
  const nodeModulesPresent = fs.existsSync(path.join(config.worktreePath, "node_modules"));
  const needsNodeModules = config.checks.length > 0;
  const worktree = {
    path: config.worktreePath,
    exists: true,
    branch: git(["branch", "--show-current"], config.worktreePath),
    head: git(["rev-parse", "--short", "HEAD"], config.worktreePath),
    statusSignature: sha256(entries.slice().sort().join("\0")),
    nodeModulesPresent
  };

  const cached = previousPackagesById.get(config.packageId);
  if (cachedPackageUsable(config, cached, worktree, pathspec, coverage)) {
    const reused = clone(cached);
    reused.worktree = worktree;
    reused.pathspecs = { files: pathspec.files, checksum: pathspec.checksum, allowedPaths: pathspec.allowedPaths.size };
    reused.pathspecCoverage = coverage;
    reused.checkExecutionMode = "reused";
    reused.checkReuseSourceGeneratedAt = previousGeneratedAt;
    reused.checkReuseReason = "worktree head/status, pathspec coverage, node_modules, and check commands are unchanged";
    reused.blockingReasons = [];
    if (coverage.uncoveredEntries > 0) reused.blockingReasons.push(`${config.name} has ${coverage.uncoveredEntries} dirty entries outside its pathspec union`);
    if (needsNodeModules && !nodeModulesPresent) reused.blockingReasons.push(`${config.name} node_modules is missing`);
    for (const [name, check] of Object.entries(reused.checks ?? {})) {
      if (check.skipped) reused.blockingReasons.push(`${config.name} ${name} skipped: ${check.skipReason}`);
      else if (!check.passed) reused.blockingReasons.push(`${config.name} ${name} failed`);
    }
    reused.ready = reused.blockingReasons.length === 0;
    return reused;
  }

  const checks = {};
  let typeCheckRaw = { stdout: "", stderr: "", status: null, passed: false };
  for (const check of config.checks) {
    if (needsNodeModules && !nodeModulesPresent) {
      checks[check.name] = skippedCheck(check, "node_modules is missing");
      continue;
    }
    const raw = runRaw(check.command, check.args, config.worktreePath);
    checks[check.name] = formatResult(raw);
    if (check.name === "typeCheck") typeCheckRaw = raw;
  }

  const blockingReasons = [];
  if (coverage.uncoveredEntries > 0) blockingReasons.push(`${config.name} has ${coverage.uncoveredEntries} dirty entries outside its pathspec union`);
  if (needsNodeModules && !nodeModulesPresent) blockingReasons.push(`${config.name} node_modules is missing`);
  for (const [name, check] of Object.entries(checks)) {
    if (check.skipped) blockingReasons.push(`${config.name} ${name} skipped: ${check.skipReason}`);
    else if (!check.passed) blockingReasons.push(`${config.name} ${name} failed`);
  }

  return {
    packageId: config.packageId,
    name: config.name,
    owners: config.owners,
    approvalIds: config.approvalIds,
    worktree,
    pathspecs: { files: pathspec.files, checksum: pathspec.checksum, allowedPaths: pathspec.allowedPaths.size },
    pathspecCoverage: coverage,
    checkExecutionMode: "fresh",
    checks,
    typeCheck: {
      passed: checks.typeCheck?.passed ?? false,
      status: checks.typeCheck?.status ?? null,
      skipped: checks.typeCheck?.skipped ?? !checks.typeCheck,
      summary: parseTypeCheck(typeCheckRaw)
    },
    blockingReasons,
    ready: blockingReasons.length === 0
  };
}

function summarize(rows) {
  const checks = rows.flatMap((pkg) => Object.values(pkg.checks ?? {}));
  return {
    packages: rows.length,
    readyPackages: rows.filter((pkg) => pkg.ready).length,
    missingWorktrees: rows.filter((pkg) => !pkg.worktree.exists).length,
    statusEntries: rows.reduce((sum, pkg) => sum + pkg.pathspecCoverage.statusEntries, 0),
    coveredEntries: rows.reduce((sum, pkg) => sum + pkg.pathspecCoverage.coveredEntries, 0),
    uncoveredEntries: rows.reduce((sum, pkg) => sum + pkg.pathspecCoverage.uncoveredEntries, 0),
    checkCount: checks.length,
    passedChecks: checks.filter((check) => check.passed).length,
    failedChecks: checks.filter((check) => !check.passed && !check.skipped).length,
    skippedChecks: checks.filter((check) => check.skipped).length,
    typeCheckErrors: rows.reduce((sum, pkg) => sum + (pkg.typeCheck?.summary?.errorLines ?? 0), 0)
  };
}

function markdown(payload) {
  const packageRows = payload.packages.map((pkg) => `| ${pkg.name} | ${pkg.worktree.exists ? "present" : "missing"} | ${pkg.ready ? "yes" : "no"} | ${pkg.pathspecCoverage.statusEntries} | ${pkg.pathspecCoverage.coveredEntries} | ${pkg.pathspecCoverage.uncoveredEntries} | ${pkg.blockingReasons.join("; ") || "none"} |`).join("\n");
  const checkRows = payload.packages.flatMap((pkg) => Object.entries(pkg.checks).map(([name, check]) => `| ${pkg.name} | ${name} | ${check.skipped ? "skipped" : check.passed ? "pass" : "fail"} | ${check.status ?? "n/a"} | \`${check.command}\` |`)).join("\n") || "| none | none | n/a | n/a | n/a |";
  const topErrorRows = payload.packages.flatMap((pkg) => (pkg.typeCheck.summary.topFiles ?? []).slice(0, 8).map((entry) => `| ${pkg.name} | \`${entry.file}\` | ${entry.errors} |`)).join("\n") || "| none | none | 0 |";

  return `# A25 Wave 05 Visualization AI Runtime Readiness

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

This is readiness evidence only. It does not authorize staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, worktree removal, or any other physical cleanup.

## Result

- Commit ready: ${payload.commitReady ? "yes" : "no"}
- Blocking reasons: ${payload.blockingReasons.join("; ") || "none"}
- Ready packages: ${payload.summary.readyPackages}/${payload.summary.packages}
- Missing worktrees: ${payload.summary.missingWorktrees}
- Status entries inspected: ${payload.summary.statusEntries}
- Covered entries: ${payload.summary.coveredEntries}
- Uncovered entries: ${payload.summary.uncoveredEntries}
- Checks: ${payload.summary.passedChecks}/${payload.summary.checkCount} passed, ${payload.summary.failedChecks} failed, ${payload.summary.skippedChecks} skipped
- Type-check errors: ${payload.summary.typeCheckErrors}

## Packages

| Package | Worktree | Ready | Status entries | Covered | Uncovered | Blocking reasons |
| --- | --- | --- | ---: | ---: | ---: | --- |
${packageRows}

## Checks

| Package | Check | Result | Status | Command |
| --- | --- | --- | ---: | --- |
${checkRows}

## Type-Check Hotspots

| Package | File | Errors |
| --- | --- | ---: |
${topErrorRows}
`;
}

function main() {
  const dirtyMap = readJson(paths.dirtyMap);
  const sequence = readJson(paths.sequence);
  const previous = readOptionalJson(paths.latestJson);
  const previousPackagesById = new Map((previous?.packages ?? []).map((pkg) => [pkg.packageId, pkg]));
  const wave = (sequence.waves ?? []).find((item) => item.waveId === waveId);
  if (!wave) throw new Error("Wave 05 is missing from the closure execution sequence.");
  if (sequence.dirtyMapStatusSignature !== dirtyMap.statusSignature) throw new Error("Closure execution sequence is stale relative to dirty map.");

  const readinessPackages = packages.map((config) => packageReadiness(config, previousPackagesById, previous?.generatedAt ?? ""));
  const blockingReasons = readinessPackages.flatMap((pkg) => pkg.blockingReasons);
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
    packages: readinessPackages,
    summary: summarize(readinessPackages),
    commitReady: blockingReasons.length === 0,
    cleanupAuthorized: false,
    executableNow: false,
    blockingReasons
  };

  const json = `${JSON.stringify(payload, null, 2)}\n`;
  write(paths.latestJson, json);
  write(paths.datedJson, json);
  const md = markdown(payload);
  write(paths.latestMd, md);
  write(paths.datedMd, md);
  console.log(JSON.stringify({
    latestJson: paths.latestJson,
    latestMarkdown: paths.latestMd,
    commitReady: payload.commitReady,
    readyPackages: payload.summary.readyPackages,
    missingWorktrees: payload.summary.missingWorktrees,
    statusEntries: payload.summary.statusEntries,
    uncoveredEntries: payload.summary.uncoveredEntries,
    passedChecks: payload.summary.passedChecks,
    failedChecks: payload.summary.failedChecks,
    skippedChecks: payload.summary.skippedChecks,
    typeCheckErrors: payload.summary.typeCheckErrors
  }, null, 2));
}

main();
