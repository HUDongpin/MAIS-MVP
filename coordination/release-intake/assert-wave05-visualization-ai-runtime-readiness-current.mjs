#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"], process.cwd());
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-wave05-visualization-ai-runtime-readiness-current-gate.json");
const json = process.argv.includes("--json");
const waveId = "wave-05-visualization-ai-runtime";

const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  sequence: "coordination/release-intake/latest-A25-dirty-worktree-closure-execution-sequence.json",
  readiness: "coordination/release-intake/latest-A25-wave05-visualization-ai-runtime-readiness.json",
  readinessMd: "coordination/release-intake/latest-A25-wave05-visualization-ai-runtime-readiness.md"
};

const packages = [
  {
    packageId: "a06-visualization",
    name: "A06 visualization",
    worktreePath: "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A06-visualization-closure",
    pathspecs: ["coordination/release-intake/latest-A25-owner-a06-visualization-lead.pathspec"],
    checkNames: ["typeCheck", "visualizationNodeTests", "visualizationPlaywright"]
  },
  {
    packageId: "a07-ai-tutor",
    name: "A07 AI tutor",
    worktreePath: "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A07-ai-tutor-closure",
    pathspecs: ["coordination/release-intake/latest-A25-owner-a07-ai-tutor-lead.pathspec"],
    checkNames: ["typeCheck", "aiTutorPlaywright"]
  },
  {
    packageId: "a09-copy-i18n-accessibility",
    name: "A09 copy/i18n/accessibility",
    worktreePath: "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A09-copy-i18n-accessibility-closure",
    pathspecs: ["coordination/release-intake/latest-A25-owner-a09-copy-i18n-accessibility.pathspec"],
    checkNames: ["typeCheck"]
  },
  {
    packageId: "a11-regression-evidence",
    name: "A11 regression evidence",
    worktreePath: "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A11-regression-evidence-closure",
    pathspecs: ["coordination/release-intake/latest-A25-owner-a11-qa-and-release-quality.pathspec"],
    checkNames: ["typeCheck", "regressionPlaywright"]
  },
  {
    packageId: "a13-a14-console",
    name: "A13/A14 console",
    worktreePath: "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A13-A14-console-closure",
    pathspecs: [
      "coordination/release-intake/latest-A25-owner-a13-teacher-console.pathspec",
      "coordination/release-intake/latest-A25-owner-a14-parent-console.pathspec"
    ],
    checkNames: ["typeCheck", "consolePlaywright"]
  },
  {
    packageId: "a16-research-evidence",
    name: "A16 research evidence",
    worktreePath: "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A16-research-evidence-closure",
    pathspecs: ["coordination/release-intake/latest-A25-owner-a16-research-and-learning-science.pathspec"],
    checkNames: []
  },
  {
    packageId: "a17-a20-game-motivation",
    name: "A17/A20 games and motivation",
    worktreePath: "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A17-A20-game-motivation-closure",
    pathspecs: [
      "coordination/release-intake/latest-A25-owner-a17-gamification-and-motivation.pathspec",
      "coordination/release-intake/latest-A25-owner-a20-game-design-and-game-based-learning.pathspec"
    ],
    checkNames: ["typeCheck", "gameMotivationPlaywright"]
  }
];

function git(args, cwd) {
  return execFileSync("git", args, { cwd, encoding: "utf8", maxBuffer: 512 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
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

function coverage(entries, allowedPaths) {
  const uncovered = entries.map((line) => ({ line, path: statusPath(line) })).filter((entry) => !allowedPaths.has(entry.path));
  return {
    statusEntries: entries.length,
    coveredEntries: entries.length - uncovered.length,
    uncoveredEntries: uncovered.length,
    uncovered
  };
}

function sameJson(left, right) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function expectedCoverage(config) {
  const info = pathspecInfo(config.pathspecs);
  if (!fs.existsSync(config.worktreePath)) {
    return {
      pathspec: info,
      worktree: { exists: false, branch: "", head: "", statusSignature: "", nodeModulesPresent: false },
      coverage: { statusEntries: 0, coveredEntries: 0, uncoveredEntries: 0, uncovered: [] }
    };
  }

  const entries = statusEntries(config.worktreePath);
  return {
    pathspec: info,
    worktree: {
      exists: true,
      branch: git(["branch", "--show-current"], config.worktreePath),
      head: git(["rev-parse", "--short", "HEAD"], config.worktreePath),
      statusSignature: sha256(entries.slice().sort().join("\0")),
      nodeModulesPresent: fs.existsSync(path.join(config.worktreePath, "node_modules"))
    },
    coverage: coverage(entries, info.allowedPaths)
  };
}

function expectedReasons(config, pkg, current) {
  const reasons = [];
  if (!current.worktree.exists) return [`${config.name} package worktree is missing`];
  if (current.coverage.uncoveredEntries > 0) reasons.push(`${config.name} has ${current.coverage.uncoveredEntries} dirty entries outside its pathspec union`);
  if (config.checkNames.length > 0 && !current.worktree.nodeModulesPresent) reasons.push(`${config.name} node_modules is missing`);
  for (const checkName of config.checkNames) {
    const check = pkg.checks?.[checkName];
    if (check?.skipped) reasons.push(`${config.name} ${checkName} skipped: ${check.skipReason}`);
    else if (check?.passed === false) reasons.push(`${config.name} ${checkName} failed`);
  }
  return reasons;
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

function main() {
  const failures = [];
  for (const requiredPath of Object.values(paths)) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  for (const config of packages) {
    for (const pathspec of config.pathspecs) {
      if (!exists(pathspec)) failures.push(`missing required file: ${pathspec}`);
    }
  }
  if (failures.length > 0) return finish({ failures, commitReady: false });

  const dirtyMap = readJson(paths.dirtyMap);
  const sequence = readJson(paths.sequence);
  const readiness = readJson(paths.readiness);
  const sequenceWave = (sequence.waves ?? []).find((item) => item.waveId === waveId);

  if (!sequenceWave) failures.push("Wave 05 is missing from the closure execution sequence");
  if (readiness.dirtyMapStatusSignature !== dirtyMap.statusSignature) failures.push("readiness dirty-map signature is stale");
  if (readiness.expandedStatusEntries !== dirtyMap.statusCounts.expandedStatusEntries) failures.push("readiness expanded dirty entry count is stale");
  if (readiness.executionSequenceGeneratedAt !== sequence.generatedAt) failures.push("readiness sequence timestamp is stale");
  if (readiness.wave?.waveId !== waveId) failures.push("readiness wave id is stale");
  if (sequenceWave && !sameJson(readiness.wave?.ownerApprovals, sequenceWave.ownerApprovals.map((row) => row.approvalId))) failures.push("readiness owner approval list is stale");
  if (sequenceWave && !sameJson(readiness.wave?.physicalLifecycleApprovals, sequenceWave.physicalLifecycleApprovals.map((row) => row.approvalId))) failures.push("readiness physical lifecycle approval list is stale");

  const byId = new Map((readiness.packages ?? []).map((pkg) => [pkg.packageId, pkg]));
  const allExpectedReasons = [];
  for (const config of packages) {
    const pkg = byId.get(config.packageId);
    if (!pkg) {
      failures.push(`missing readiness package: ${config.packageId}`);
      continue;
    }

    const current = expectedCoverage(config);
    if (!sameJson(pkg.worktree, { path: config.worktreePath, ...current.worktree })) failures.push(`${config.packageId}: worktree metadata is stale`);
    if (pkg.pathspecs?.checksum !== current.pathspec.checksum) failures.push(`${config.packageId}: pathspec checksum is stale`);
    if (pkg.pathspecs?.allowedPaths !== current.pathspec.allowedPaths.size) failures.push(`${config.packageId}: pathspec allowed path count is stale`);
    if (!sameJson(pkg.pathspecCoverage, current.coverage)) failures.push(`${config.packageId}: pathspec coverage is stale`);

    for (const checkName of config.checkNames) {
      const check = pkg.checks?.[checkName];
      if (!check) failures.push(`${config.packageId}: missing readiness check ${checkName}`);
      if (typeof check?.passed !== "boolean") failures.push(`${config.packageId} ${checkName}: passed must be boolean`);
      if (!check?.skipped && typeof check?.status !== "number") failures.push(`${config.packageId} ${checkName}: status must be numeric unless skipped`);
      if (check?.skipped && typeof check.skipReason !== "string") failures.push(`${config.packageId} ${checkName}: skipped checks need a reason`);
    }
    if (typeof pkg.typeCheck?.summary?.errorLines !== "number") failures.push(`${config.packageId}: typeCheck summary errorLines must be numeric`);

    const reasons = expectedReasons(config, pkg, current);
    allExpectedReasons.push(...reasons);
    if (!sameJson(pkg.blockingReasons, reasons)) failures.push(`${config.packageId}: blocking reasons are stale`);
    if (pkg.ready !== (reasons.length === 0)) failures.push(`${config.packageId}: ready flag is stale`);
  }

  const expectedSummary = summarize(readiness.packages ?? []);
  if (!sameJson(readiness.summary, expectedSummary)) failures.push("readiness summary is stale");
  if (!sameJson(readiness.blockingReasons, allExpectedReasons)) failures.push("readiness blocking reasons are stale");
  if (readiness.commitReady !== (allExpectedReasons.length === 0)) failures.push("readiness commitReady is stale");
  if (readiness.cleanupAuthorized !== false) failures.push("readiness cleanupAuthorized must be false");
  if (readiness.executableNow !== false) failures.push("readiness executableNow must be false");

  const markdown = readText(paths.readinessMd);
  if (markdown.includes("undefined")) failures.push("readiness markdown contains undefined");
  if (!markdown.includes("readiness evidence only")) failures.push("readiness markdown missing non-authorization boundary");

  finish({
    checkedAt: new Date().toISOString(),
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    commitReady: readiness.commitReady,
    readyPackages: readiness.summary?.readyPackages ?? null,
    missingWorktrees: readiness.summary?.missingWorktrees ?? null,
    statusEntries: readiness.summary?.statusEntries ?? null,
    uncoveredEntries: readiness.summary?.uncoveredEntries ?? null,
    passedChecks: readiness.summary?.passedChecks ?? null,
    failedChecks: readiness.summary?.failedChecks ?? null,
    skippedChecks: readiness.summary?.skippedChecks ?? null,
    typeCheckErrors: readiness.summary?.typeCheckErrors ?? null,
    failures
  });
}

function finish(payload) {
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log("A25 Wave 05 visualization AI runtime readiness gate");
    console.log(`Commit ready: ${payload.commitReady ? "yes" : "no"}`);
    console.log(`Failures: ${payload.failures.length}`);
  }
  if (payload.failures.length > 0) {
    console.error("A25 Wave 05 visualization AI runtime readiness gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
