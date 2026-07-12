#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const outDir = path.join(root, "coordination", "release-intake");
const outputPath = path.join(outDir, "latest-A25-dirty-worktree-recurrence-prevention-current-gate.json");
const json = process.argv.includes("--json");

const paths = {
  packageJson: "package.json",
  agents: "AGENTS.md",
  releaseEnvGuard: "scripts/release-env-guard.mjs",
  dirtyMapScript: "scripts/refresh-dirty-tree-map.mjs",
  worktreeDashboard: "coordination/release-intake/worktree-hygiene-dashboard.mjs",
  releaseSourceCleanGate: "coordination/release-intake/assert-release-source-clean.mjs",
  worktreeLifecycleGate: "coordination/release-intake/assert-worktree-lifecycle.mjs",
  finalStateSelectionTemplateGenerator: "coordination/release-intake/generate-dirty-worktree-final-state-selection-template.mjs",
  finalStateSelectionTemplateGate: "coordination/release-intake/assert-dirty-worktree-final-state-selection-template-current.mjs",
  finalStateSelectionGate: "coordination/release-intake/assert-dirty-worktree-final-state-selection-current.mjs",
  latestFinalStateSelectionTemplate: "coordination/release-intake/latest-A25-dirty-worktree-final-state-selection-template.json",
  latestWorktreeLifecycleGate: "coordination/release-intake/latest-A25-worktree-lifecycle-gate.json"
};

function git(args, cwd = process.cwd()) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function includesAll(source, needles) {
  return needles.every((needle) => source.includes(needle));
}

function check(name, passed, details = {}) {
  return {
    name,
    passed,
    ...details
  };
}

function assertGitWorktreeCommandAvailable() {
  try {
    git(["worktree", "list", "--porcelain"], root);
    return true;
  } catch {
    return false;
  }
}

function main() {
  const checks = [];
  const missing = Object.entries(paths)
    .filter(([key]) => !key.startsWith("latest"))
    .filter(([, relativePath]) => !exists(relativePath))
    .map(([, relativePath]) => relativePath);

  if (missing.length > 0) {
    checks.push(check("A25 recurrence policy files exist", false, { missing }));
    return finish(checks);
  }

  const packageJson = readJson(paths.packageJson);
  const agents = readText(paths.agents);
  const releaseEnvGuard = readText(paths.releaseEnvGuard);
  const lifecycleGate = readText(paths.worktreeLifecycleGate);

  checks.push(check(
    "A25 daily dirty-map script remains available",
    packageJson.scripts?.["release:dirty-map"] === "node scripts/refresh-dirty-tree-map.mjs",
    {
      expected: "node scripts/refresh-dirty-tree-map.mjs",
      actual: packageJson.scripts?.["release:dirty-map"] ?? null
    }
  ));

  checks.push(check(
    "A25 AGENTS daily release-intake policy remains present",
    includesAll(agents, [
      "A25 daily git hygiene and release intake must run before any release planning",
      "npm run release:dirty-map -- --reason",
      "A25 must not stage, commit, branch, push, reset, delete, revert, or clean files unless the owner explicitly assigns that exact Git operation"
    ]),
    {
      requiredPhrases: [
        "A25 daily git hygiene and release intake",
        "npm run release:dirty-map -- --reason",
        "A25 must not stage, commit, branch, push, reset, delete, revert, or clean"
      ]
    }
  ));

  checks.push(check(
    "A22 clean release-source policy remains present",
    includesAll(agents, [
      "A22 release engineering must build and publish only from a clean worktree, clean clone, reviewed clean release slice, or pruned staging directory",
      "A22 must not publish from the current dirty repository root"
    ]),
    {
      requiredPhrases: [
        "A22 release engineering must build and publish only from a clean worktree",
        "A22 must not publish from the current dirty repository root"
      ]
    }
  ));

  checks.push(check(
    "A25 end-of-session final-state handoff checklist remains present",
    includesAll(agents, [
      "Dirty state final action: reviewed commit | owner-approved discard | evidence archive | blocker",
      "Worktree lifecycle action: retained clean | PR opened | archived | removed | blocker"
    ]),
    {
      requiredPhrases: [
        "Dirty state final action",
        "Worktree lifecycle action"
      ]
    }
  ));

  checks.push(check(
    "A22 release guard calls A22 clean-source and A25 strict lifecycle gates",
    includesAll(releaseEnvGuard, [
      'const RELEASE_SOURCE_CLEAN_GATE = "coordination/release-intake/assert-release-source-clean.mjs"',
      'const WORKTREE_LIFECYCLE_GATE = "coordination/release-intake/assert-worktree-lifecycle.mjs"',
      'runNodeGate(\n    "A22 release-source clean gate"',
      'runNodeGate(\n    "A25 strict worktree lifecycle gate"',
      '["--strict"]'
    ]),
    {
      scripts: [
        paths.releaseSourceCleanGate,
        paths.worktreeLifecycleGate
      ]
    }
  ));

  checks.push(check(
    "A22 release guard wires gates into release and publish modes",
    includesAll(releaseEnvGuard, [
      "function shouldRunReleaseSourceGates(mode)",
      "shouldRunRuntimeRelease(mode)",
      "shouldRunRootDeploy(mode)",
      "shouldRunPublish(mode)",
      "shouldRunStagedPublish(mode)",
      "shouldRunReleaseSourceGates(args.mode) ? assertReleaseSourceGates() : undefined"
    ]),
    {
      guardedModes: [
        "runtime-release",
        "preview-release",
        "production",
        "root-deploy",
        "publish",
        "staged-publish"
      ]
    }
  ));

  checks.push(check(
    "A25 weekly worktree audit commands remain available",
    assertGitWorktreeCommandAvailable()
      && exists(paths.worktreeDashboard)
      && includesAll(lifecycleGate, ["const strict = process.argv.includes(\"--strict\")", "if (strict"]),
    {
      commands: [
        "git worktree list",
        "node coordination/release-intake/worktree-hygiene-dashboard.mjs",
        "node coordination/release-intake/assert-worktree-lifecycle.mjs --strict"
      ]
    }
  ));

  checks.push(check(
    "A25 final-state selection path remains machine-checkable",
    exists(paths.finalStateSelectionTemplateGenerator)
      && exists(paths.finalStateSelectionTemplateGate)
      && exists(paths.finalStateSelectionGate)
      && exists(paths.latestFinalStateSelectionTemplate),
    {
      template: paths.latestFinalStateSelectionTemplate,
      expectedSelection: "coordination/release-intake/latest-A25-dirty-worktree-final-state-selection.json",
      validator: paths.finalStateSelectionGate
    }
  ));

  checks.push(check(
    "A25 worktree lifecycle gate has recent output",
    exists(paths.latestWorktreeLifecycleGate),
    {
      output: paths.latestWorktreeLifecycleGate
    }
  ));

  finish(checks);
}

function finish(checks) {
  const failures = checks.filter((item) => !item.passed).map((item) => item.name);
  const payload = {
    checkedAt: new Date().toISOString(),
    root,
    result: failures.length === 0 ? "pass" : "fail",
    summary: {
      total: checks.length,
      passed: checks.filter((item) => item.passed).length,
      failed: failures.length
    },
    failures,
    checks
  };

  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);

  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log("A25 dirty-worktree recurrence-prevention currentness gate");
    console.log(`Checks: ${payload.summary.passed}/${payload.summary.total}`);
    console.log(`Failures: ${payload.summary.failed}`);
  }

  if (failures.length > 0) {
    console.error("A25 dirty-worktree recurrence-prevention currentness gate failed.");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
