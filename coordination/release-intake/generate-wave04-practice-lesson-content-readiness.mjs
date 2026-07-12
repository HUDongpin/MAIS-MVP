#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"], process.cwd());
const date = hktDateStamp();
const commandTimeoutMs = 4 * 60 * 1000;

const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  executionSequence: "coordination/release-intake/latest-A25-dirty-worktree-closure-execution-sequence.json",
  latestJson: "coordination/release-intake/latest-A25-wave04-practice-lesson-content-readiness.json",
  latestMarkdown: "coordination/release-intake/latest-A25-wave04-practice-lesson-content-readiness.md",
  datedJson: `coordination/release-intake/${date}-A25-wave04-practice-lesson-content-readiness.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-wave04-practice-lesson-content-readiness.md`
};

const packageConfigs = [
  {
    packageId: "a04-practice",
    name: "A04 practice",
    owners: ["A04 practice lead"],
    approvalIds: ["a04-practice-lead"],
    worktreePath: "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A04-practice-closure",
    pathspecs: ["coordination/release-intake/latest-A25-owner-a04-practice-lead.pathspec"],
    checks: [
      { name: "testQuestionBank", command: "npm", args: ["run", "test:question-bank"] },
      { name: "typeCheck", command: "npm", args: ["run", "type-check", "--", "--pretty", "false"] },
      {
        name: "practicePlaywright",
        command: "npx",
        args: ["playwright", "test", "tests/e2e/practice-pager.spec.ts", "tests/e2e/student-smoke.spec.ts", "--project=desktop-chrome"]
      }
    ]
  },
  {
    packageId: "a05-lesson",
    name: "A05 lesson",
    owners: ["A05 lesson lead"],
    approvalIds: ["a05-lesson-lead"],
    worktreePath: "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A05-lesson-closure",
    pathspecs: ["coordination/release-intake/latest-A25-owner-a05-lesson-lead.pathspec"],
    checks: [
      { name: "typeCheck", command: "npm", args: ["run", "type-check", "--", "--pretty", "false"] },
      {
        name: "lessonPlaywright",
        command: "npx",
        args: [
          "playwright",
          "test",
          "tests/e2e/lesson-all.spec.ts",
          "tests/e2e/mainland-pep-high-lessons.spec.ts",
          "tests/e2e/california-k5-textbook-lessons.spec.ts",
          "--project=desktop-chrome"
        ]
      }
    ]
  },
  {
    packageId: "a18-a21-a23-a24-content-evidence",
    name: "A18/A21/A23/A24 content evidence",
    owners: [
      "A18 curriculum QA / A21 content pipeline",
      "A21 content pipeline and RAG operations",
      "A23 integration and promotion lead",
      "A24 illustration exact-layer"
    ],
    approvalIds: [
      "a18-curriculum-qa-a21-content-pipeline",
      "a21-content-pipeline-and-rag-operations",
      "a23-integration-and-promotion-lead",
      "a24-illustration-exact-layer"
    ],
    worktreePath: "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A18-A21-content-evidence-closure",
    pathspecs: [
      "coordination/release-intake/latest-A25-owner-a18-curriculum-qa-a21-content-pipeline.pathspec",
      "coordination/release-intake/latest-A25-owner-a21-content-pipeline-and-rag-operations.pathspec",
      "coordination/release-intake/latest-A25-owner-a23-integration-and-promotion-lead.pathspec",
      "coordination/release-intake/latest-A25-owner-a24-illustration-exact-layer.pathspec"
    ],
    checks: [
      { name: "testRag", command: "npm", args: ["run", "test:rag"] },
      { name: "testQuestionBank", command: "npm", args: ["run", "test:question-bank"] },
      { name: "typeCheck", command: "npm", args: ["run", "type-check", "--", "--pretty", "false"] }
    ]
  }
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
  const tail = maxLines - head;
  return [
    ...lines.slice(0, head),
    `... ${lines.length - maxLines} lines omitted ...`,
    ...lines.slice(-tail)
  ];
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
    return { command: [command, ...args].join(" "), status: 0, passed: true, stdout, stderr: "" };
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

function skippedCheck(config, reason) {
  return {
    command: [config.command, ...config.args].join(" "),
    status: null,
    passed: false,
    skipped: true,
    skipReason: reason,
    stdout: []
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

function pathspecInfo(files) {
  const contents = files.map((file) => `${file}\n${readText(file)}`).join("\n---\n");
  const allowedPaths = new Set(
    files.flatMap((file) => readText(file).split("\n").map((line) => line.trim()).filter(Boolean))
  );
  return { files, checksum: sha256(contents), allowedPaths };
}

function commandText(check) {
  return [check.command, ...check.args].join(" ");
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

function parseTypeCheck(rawResult) {
  const text = `${rawResult.stdout ?? ""}\n${rawResult.stderr ?? ""}`;
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

function wave04(sequence) {
  return (sequence.waves ?? []).find((wave) => wave.waveId === "wave-04-practice-lesson-content");
}

function packageReadiness(config, previousPackagesById, previousGeneratedAt) {
  const pathspec = pathspecInfo(config.pathspecs);
  const worktreeExists = fs.existsSync(config.worktreePath);
  if (!worktreeExists) {
    const checks = Object.fromEntries(config.checks.map((check) => [check.name, skippedCheck(check, "package worktree is missing")]));
    return {
      packageId: config.packageId,
      name: config.name,
      owners: config.owners,
      approvalIds: config.approvalIds,
      worktree: {
        path: config.worktreePath,
        exists: false,
        branch: "",
        head: "",
        statusSignature: "",
        nodeModulesPresent: false
      },
      pathspecs: {
        files: pathspec.files,
        checksum: pathspec.checksum,
        allowedPaths: pathspec.allowedPaths.size
      },
      pathspecCoverage: { statusEntries: 0, coveredEntries: 0, uncoveredEntries: 0, uncovered: [] },
      checks,
      typeCheck: {
        passed: false,
        status: null,
        skipped: true,
        summary: { errorLines: 0, byTop: {}, topFiles: [], firstErrors: [] }
      },
      blockingReasons: [`${config.name} package worktree is missing`],
      ready: false
    };
  }

  const entries = statusEntries(config.worktreePath);
  const coverage = statusCoverage(entries, pathspec.allowedPaths);
  const nodeModulesPresent = fs.existsSync(path.join(config.worktreePath, "node_modules"));
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
    reused.pathspecs = {
      files: pathspec.files,
      checksum: pathspec.checksum,
      allowedPaths: pathspec.allowedPaths.size
    };
    reused.pathspecCoverage = coverage;
    reused.checkExecutionMode = "reused";
    reused.checkReuseSourceGeneratedAt = previousGeneratedAt;
    reused.checkReuseReason = "worktree head/status, pathspec coverage, node_modules, and check commands are unchanged";
    reused.blockingReasons = [];
    if (coverage.uncoveredEntries > 0) reused.blockingReasons.push(`${config.name} has ${coverage.uncoveredEntries} dirty entries outside its pathspec union`);
    if (!nodeModulesPresent) reused.blockingReasons.push(`${config.name} node_modules is missing`);
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
    if (!nodeModulesPresent) {
      checks[check.name] = skippedCheck(check, "node_modules is missing");
      continue;
    }
    const raw = runRaw(check.command, check.args, config.worktreePath);
    checks[check.name] = formatCommandResult(raw);
    if (check.name === "typeCheck") typeCheckRaw = raw;
  }

  const typeCheck = {
    passed: checks.typeCheck?.passed ?? false,
    status: checks.typeCheck?.status ?? null,
    skipped: checks.typeCheck?.skipped ?? false,
    summary: parseTypeCheck(typeCheckRaw)
  };

  const blockingReasons = [];
  if (coverage.uncoveredEntries > 0) blockingReasons.push(`${config.name} has ${coverage.uncoveredEntries} dirty entries outside its pathspec union`);
  if (!nodeModulesPresent) blockingReasons.push(`${config.name} node_modules is missing`);
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
    pathspecs: {
      files: pathspec.files,
      checksum: pathspec.checksum,
      allowedPaths: pathspec.allowedPaths.size
    },
    pathspecCoverage: coverage,
    checkExecutionMode: "fresh",
    checks,
    typeCheck,
    blockingReasons,
    ready: blockingReasons.length === 0
  };
}

function summarize(packages) {
  const checks = packages.flatMap((pkg) => Object.values(pkg.checks ?? {}));
  return {
    packages: packages.length,
    readyPackages: packages.filter((pkg) => pkg.ready).length,
    missingWorktrees: packages.filter((pkg) => !pkg.worktree.exists).length,
    statusEntries: packages.reduce((sum, pkg) => sum + pkg.pathspecCoverage.statusEntries, 0),
    coveredEntries: packages.reduce((sum, pkg) => sum + pkg.pathspecCoverage.coveredEntries, 0),
    uncoveredEntries: packages.reduce((sum, pkg) => sum + pkg.pathspecCoverage.uncoveredEntries, 0),
    checkCount: checks.length,
    passedChecks: checks.filter((check) => check.passed).length,
    failedChecks: checks.filter((check) => !check.passed && !check.skipped).length,
    skippedChecks: checks.filter((check) => check.skipped).length,
    typeCheckErrors: packages.reduce((sum, pkg) => sum + (pkg.typeCheck?.summary?.errorLines ?? 0), 0)
  };
}

function markdown(payload) {
  const packageRows = payload.packages.map((pkg) => {
    return `| ${pkg.name} | ${pkg.worktree.exists ? "present" : "missing"} | ${pkg.ready ? "yes" : "no"} | ${pkg.pathspecCoverage.statusEntries} | ${pkg.pathspecCoverage.coveredEntries} | ${pkg.pathspecCoverage.uncoveredEntries} | ${pkg.blockingReasons.join("; ") || "none"} |`;
  }).join("\n");

  const checkRows = payload.packages.flatMap((pkg) => {
    return Object.entries(pkg.checks).map(([name, check]) => {
      const result = check.skipped ? "skipped" : check.passed ? "pass" : "fail";
      return `| ${pkg.name} | ${name} | ${result} | ${check.status ?? "n/a"} | \`${check.command}\` |`;
    });
  }).join("\n");

  const topErrorRows = payload.packages.flatMap((pkg) => {
    return (pkg.typeCheck.summary.topFiles ?? []).slice(0, 8).map((entry) => `| ${pkg.name} | \`${entry.file}\` | ${entry.errors} |`);
  }).join("\n") || "| none | none | 0 |";

  return `# A25 Wave 04 Practice Lesson Content Readiness

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
  const sequence = readJson(paths.executionSequence);
  const previous = readOptionalJson(paths.latestJson);
  const previousPackagesById = new Map((previous?.packages ?? []).map((pkg) => [pkg.packageId, pkg]));
  const wave = wave04(sequence);
  if (!wave) throw new Error("Wave 04 is missing from the closure execution sequence.");
  if (sequence.dirtyMapStatusSignature !== dirtyMap.statusSignature) {
    throw new Error("Closure execution sequence is stale relative to dirty map.");
  }

  const packages = packageConfigs.map((config) => packageReadiness(config, previousPackagesById, previous?.generatedAt ?? ""));
  const blockingReasons = packages.flatMap((pkg) => pkg.blockingReasons);
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
    packages,
    summary: summarize(packages),
    commitReady: blockingReasons.length === 0,
    cleanupAuthorized: false,
    executableNow: false,
    blockingReasons
  };

  const json = `${JSON.stringify(payload, null, 2)}\n`;
  write(paths.latestJson, json);
  write(paths.datedJson, json);
  const md = markdown(payload);
  write(paths.latestMarkdown, md);
  write(paths.datedMarkdown, md);

  console.log(JSON.stringify({
    latestJson: paths.latestJson,
    latestMarkdown: paths.latestMarkdown,
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
