#!/usr/bin/env node
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const A22_OWNER_REMEDIATION_CANDIDATE_DIRTY_ALLOWLIST_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  rootParityCandidateMutation: "coordination/release-intake/latest-A22-root-parity-candidate-mutation-dry-run.json",
  latestJson: "coordination/release-intake/latest-A22-owner-remediation-candidate-dirty-allowlist.json",
  latestMarkdown: "coordination/release-intake/latest-A22-owner-remediation-candidate-dirty-allowlist.md",
  datedJson: `coordination/release-intake/${date}-A22-owner-remediation-candidate-dirty-allowlist.json`,
  datedMarkdown: `coordination/release-intake/${date}-A22-owner-remediation-candidate-dirty-allowlist.md`
};

const OWNER_REMEDIATION_RULES = [
  {
    unitId: "a20-math-match-quest-data-parity",
    ownerId: "A20",
    ownerRole: "Game design and game-based learning lead",
    verificationKind: "same-path-copy",
    rootSourcePath: "data/gameBasedLearning.ts",
    candidateTargetPath: "data/gameBasedLearning.ts",
    selectedAction: "same-path-copy",
    reason: "Resolve A20 MathMatchQuestGame import and inferred-any type-check cascade in the A22 clean-source validation candidate."
  },
  {
    unitId: "a10-a22-package-json-dependency-parity",
    ownerId: "A10",
    ownerRole: "Tooling, docs, and report lead",
    coordinationOwnerIds: ["A22"],
    verificationKind: "package-json-dependency-contract",
    rootSourcePath: "package.json",
    candidateTargetPath: "package.json",
    statusRow: " M package.json",
    selectedAction: "package-dependency-parity",
    reason: "Resolve A06 3D visualization type-check cascade by carrying the root package dependency contract into the A22 clean-source validation candidate."
  },
  {
    unitId: "a10-a22-package-lock-dependency-parity",
    ownerId: "A10",
    ownerRole: "Tooling, docs, and report lead",
    coordinationOwnerIds: ["A22"],
    verificationKind: "package-lock-dependency-contract",
    rootSourcePath: "package-lock.json",
    candidateTargetPath: "package-lock.json",
    statusRow: " M package-lock.json",
    selectedAction: "package-dependency-parity",
    reason: "Keep the A22 clean-source validation candidate lockfile consistent with the root package dependency contract needed by the visualization runtime."
  }
];

const PACKAGE_JSON_PARITY_FIELDS = [
  { section: "dependencies", name: "@react-three/drei" },
  { section: "dependencies", name: "@react-three/fiber" },
  { section: "dependencies", name: "pptxgenjs" },
  { section: "dependencies", name: "three" },
  { section: "devDependencies", name: "tsx" }
];

const PACKAGE_JSON_FORBIDDEN_FIELDS = [
  { section: "dependencies", name: "tsx" }
];

const PACKAGE_LOCK_PARITY_PACKAGES = [
  "node_modules/@react-three/drei",
  "node_modules/@react-three/fiber",
  "node_modules/pptxgenjs",
  "node_modules/three",
  "node_modules/tsx"
];

function git(args, cwd = process.cwd()) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();
}

function gitRaw(args, cwd = process.cwd()) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  }).replace(/\n$/u, "");
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

function write(relativePath, content) {
  fs.writeFileSync(path.join(root, relativePath), content);
}

function dirtyMapEntryCount(dirtyMap) {
  return dirtyMap.statusCounts?.expandedStatusEntries ?? (dirtyMap.entries ?? []).length;
}

function dirtyMapSignature(payload) {
  return payload.statusSignature ??
    payload.dirtyMapStatusSignature ??
    payload.baseline?.dirtyMapStatusSignature ??
    payload.dirtyMap?.statusSignature ??
    null;
}

function expandedEntries(payload) {
  return payload.expandedStatusEntries ??
    payload.statusCounts?.expandedStatusEntries ??
    payload.baseline?.expandedStatusEntries ??
    payload.dirtyMapExpandedEntries ??
    payload.summary?.dirtyMapExpandedEntries ??
    payload.dirtyMap?.expandedStatusEntries ??
    null;
}

function artifactStamp(key, relativePath, payload) {
  return {
    key,
    path: relativePath,
    generatedAt: payload.generatedAt ?? payload.generatedAtHkt ?? payload.checkedAt ?? null,
    dirtyMapStatusSignature: dirtyMapSignature(payload),
    expandedStatusEntries: expandedEntries(payload)
  };
}

function sourceArtifacts(artifacts) {
  return Object.fromEntries(Object.entries(artifacts).map(([key, payload]) => [
    key,
    artifactStamp(key, A22_OWNER_REMEDIATION_CANDIDATE_DIRTY_ALLOWLIST_PATHS[key], payload)
  ]));
}

function fileFingerprint(absolutePath) {
  if (!fs.existsSync(absolutePath)) {
    return { exists: false, bytes: 0, sha256: "" };
  }
  const bytes = fs.readFileSync(absolutePath);
  return {
    exists: true,
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex")
  };
}

function ownerScopeAllowed(row) {
  if (row.ownerId === "A20" && row.candidateTargetPath === "data/gameBasedLearning.ts") return true;
  if (
    row.ownerId === "A10" &&
    row.selectedAction === "package-dependency-parity" &&
    ["package.json", "package-lock.json"].includes(row.candidateTargetPath)
  ) {
    return true;
  }
  return false;
}

function statusRows(targetWorktree) {
  if (!targetWorktree) return [];
  const statusText = gitRaw(["-C", targetWorktree, "status", "--short"]);
  return statusText ? statusText.split("\n").filter(Boolean) : [];
}

function readJsonFile(absolutePath) {
  if (!fs.existsSync(absolutePath)) return null;
  return JSON.parse(fs.readFileSync(absolutePath, "utf8"));
}

function packageJsonValue(payload, section, name) {
  return payload?.[section]?.[name] ?? null;
}

function packageJsonContract(targetWorktree) {
  const rootPackage = readJsonFile(path.join(root, "package.json"));
  const candidatePackage = readJsonFile(path.join(targetWorktree, "package.json"));
  const checks = PACKAGE_JSON_PARITY_FIELDS.map((field) => {
    const expected = packageJsonValue(rootPackage, field.section, field.name);
    const actual = packageJsonValue(candidatePackage, field.section, field.name);
    return {
      ...field,
      expected,
      actual,
      passed: expected !== null && actual === expected
    };
  });
  const forbiddenChecks = PACKAGE_JSON_FORBIDDEN_FIELDS.map((field) => {
    const actual = packageJsonValue(candidatePackage, field.section, field.name);
    return {
      ...field,
      actual,
      passed: actual === null
    };
  });
  return {
    kind: "package-json-dependency-contract",
    checks,
    forbiddenChecks,
    passed: rootPackage !== null &&
      candidatePackage !== null &&
      checks.every((check) => check.passed) &&
      forbiddenChecks.every((check) => check.passed)
  };
}

function packageLockVersion(payload, packagePath) {
  return payload?.packages?.[packagePath]?.version ?? null;
}

function packageLockContract(targetWorktree) {
  const rootLock = readJsonFile(path.join(root, "package-lock.json"));
  const candidateLock = readJsonFile(path.join(targetWorktree, "package-lock.json"));
  const checks = PACKAGE_LOCK_PARITY_PACKAGES.map((packagePath) => {
    const expected = packageLockVersion(rootLock, packagePath);
    const actual = packageLockVersion(candidateLock, packagePath);
    return {
      packagePath,
      expected,
      actual,
      passed: expected !== null && actual === expected
    };
  });
  return {
    kind: "package-lock-dependency-contract",
    checks,
    passed: rootLock !== null &&
      candidateLock !== null &&
      checks.every((check) => check.passed)
  };
}

function buildAllowlistRow(rule, targetWorktree, currentCandidateStatusRows) {
  const rootFingerprint = fileFingerprint(path.join(root, rule.rootSourcePath));
  const candidateFingerprint = fileFingerprint(path.join(targetWorktree, rule.candidateTargetPath));
  const statusRow = rule.statusRow ?? `?? ${rule.candidateTargetPath}`;
  const packageContract = rule.verificationKind === "package-json-dependency-contract"
    ? packageJsonContract(targetWorktree)
    : rule.verificationKind === "package-lock-dependency-contract"
      ? packageLockContract(targetWorktree)
      : null;
  const samePathCopyMatchesRoot = rootFingerprint.exists &&
    candidateFingerprint.exists &&
    rootFingerprint.sha256 === candidateFingerprint.sha256;
  const candidateTargetMatchesRoot = packageContract ? packageContract.passed : samePathCopyMatchesRoot;
  const scopeAllowed = ownerScopeAllowed(rule);
  const statusRowPresent = currentCandidateStatusRows.includes(statusRow);
  const verified = rootFingerprint.exists &&
    candidateFingerprint.exists &&
    candidateTargetMatchesRoot &&
    statusRowPresent &&
    scopeAllowed;
  return {
    ...rule,
    statusRow,
    verificationStatus: verified ? "verified" : "blocked",
    matchBasis: packageContract ? packageContract.kind : "sha256-exact",
    ownerScopeAllowed: scopeAllowed,
    statusRowPresent,
    rootSource: {
      exists: rootFingerprint.exists,
      bytes: rootFingerprint.bytes,
      sha256: rootFingerprint.sha256
    },
    candidateTarget: {
      exists: candidateFingerprint.exists,
      bytes: candidateFingerprint.bytes,
      sha256: candidateFingerprint.sha256
    },
    candidateTargetMatchesRoot,
    packageContract,
    boundary: {
      evidenceOnly: true,
      recordsOwnerApproval: false,
      recordsExecutionInstruction: false,
      stagesFiles: false,
      commits: false,
      merges: false,
      deploys: false,
      cleanupAuthorized: false,
      executableNow: false,
      destructiveGitAuthorized: false,
      physicalLifecycleCleanupAuthorized: false
    }
  };
}

export function buildA22OwnerRemediationCandidateDirtyAllowlist() {
  const artifacts = {
    dirtyMap: readJson(A22_OWNER_REMEDIATION_CANDIDATE_DIRTY_ALLOWLIST_PATHS.dirtyMap),
    rootParityCandidateMutation: readJson(A22_OWNER_REMEDIATION_CANDIDATE_DIRTY_ALLOWLIST_PATHS.rootParityCandidateMutation)
  };
  const targetWorktree = artifacts.rootParityCandidateMutation.targetWorktree ?? "";
  const currentCandidateStatusRows = statusRows(targetWorktree);
  const allowlistRows = OWNER_REMEDIATION_RULES.map((rule) =>
    buildAllowlistRow(rule, targetWorktree, currentCandidateStatusRows)
  );
  const verifiedRows = allowlistRows.filter((row) => row.verificationStatus === "verified");
  const allowedDirtyStatusRows = verifiedRows.map((row) => row.statusRow);

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    artifactKind: "a22-owner-remediation-candidate-dirty-allowlist",
    dirtyMapStatusSignature: artifacts.dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMapEntryCount(artifacts.dirtyMap),
    sourceArtifacts: sourceArtifacts(artifacts),
    sourceCurrentnessFailures: [],
    targetWorktree,
    currentCandidateStatusRows,
    allowlistRows,
    allowedDirtyStatusRows,
    authorizedOwnerRemediationUnitIds: verifiedRows.map((row) => row.unitId),
    summary: {
      allowlistRows: allowlistRows.length,
      verifiedRows: verifiedRows.length,
      blockedRows: allowlistRows.length - verifiedRows.length,
      currentCandidateStatusRows: currentCandidateStatusRows.length,
      allowedDirtyStatusRows: allowedDirtyStatusRows.length,
      rootSourcesAvailable: allowlistRows.filter((row) => row.rootSource.exists).length,
      candidateTargetsAvailable: allowlistRows.filter((row) => row.candidateTarget.exists).length,
      candidateTargetsMatchingRoot: allowlistRows.filter((row) => row.candidateTargetMatchesRoot).length,
      ownerScopeAllowedRows: allowlistRows.filter((row) => row.ownerScopeAllowed).length,
      statusRowsPresent: allowlistRows.filter((row) => row.statusRowPresent).length,
      readyForPromotionAllowlist: allowlistRows.length > 0 && verifiedRows.length === allowlistRows.length,
      cleanupAuthorizedRows: 0,
      executableRows: 0
    },
    boundary: {
      evidenceOnly: true,
      createsClone: false,
      createsWorktree: false,
      selectsReleaseSource: false,
      recordsOwnerApproval: false,
      recordsExecutionInstruction: false,
      stagesFiles: false,
      commits: false,
      merges: false,
      pushes: false,
      deploys: false,
      cleanupAuthorized: false,
      executableNow: false,
      destructiveGitAuthorized: false,
      physicalLifecycleCleanupAuthorized: false
    }
  };
}

export function stableA22OwnerRemediationCandidateDirtyAllowlistProjection(payload) {
  return {
    repoRoot: payload.repoRoot,
    artifactKind: payload.artifactKind,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature,
    expandedStatusEntries: payload.expandedStatusEntries,
    sourceArtifacts: payload.sourceArtifacts,
    sourceCurrentnessFailures: payload.sourceCurrentnessFailures,
    targetWorktree: payload.targetWorktree,
    currentCandidateStatusRows: payload.currentCandidateStatusRows,
    allowlistRows: payload.allowlistRows,
    allowedDirtyStatusRows: payload.allowedDirtyStatusRows,
    authorizedOwnerRemediationUnitIds: payload.authorizedOwnerRemediationUnitIds,
    summary: payload.summary,
    boundary: payload.boundary
  };
}

function markdown(payload) {
  const rows = payload.allowlistRows.map((row) => [
    `| \`${row.unitId}\``,
    `\`${row.ownerId}\``,
    `\`${row.verificationKind}\``,
    `\`${row.candidateTargetPath}\``,
    `\`${row.statusRow}\``,
    row.verificationStatus,
    row.candidateTargetMatchesRoot ? "yes" : "no",
    row.ownerScopeAllowed ? "yes" : "no",
    row.statusRowPresent ? "yes" : "no",
    "|"
  ].join(" | ")).join("\n");

  return `# A22 Owner-Remediation Candidate Dirty Allowlist

- Artifact kind: \`${payload.artifactKind}\`
- Target worktree: \`${payload.targetWorktree}\`
- Allowlist rows: ${payload.summary.allowlistRows}
- Verified rows: ${payload.summary.verifiedRows}
- Current candidate status rows: ${payload.summary.currentCandidateStatusRows}
- Allowed dirty status rows: ${payload.summary.allowedDirtyStatusRows}
- Ready for promotion allowlist: ${payload.summary.readyForPromotionAllowlist}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}

## Rows

| Unit ID | Owner | Verification kind | Candidate target | Status row | Verification | Contract/root match | Owner scope allowed | Status row present |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
${rows}

## Boundary

This artifact only explains bounded A20-owned and A10/A22 package-dependency owner-remediation dirty rows already present in the A22 candidate. It does not authorize staging, commit, merge, cleanup, deploy, destructive Git, or physical lifecycle cleanup.
`;
}

function persist(payload) {
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const md = markdown(payload);
  write(A22_OWNER_REMEDIATION_CANDIDATE_DIRTY_ALLOWLIST_PATHS.latestJson, json);
  write(A22_OWNER_REMEDIATION_CANDIDATE_DIRTY_ALLOWLIST_PATHS.datedJson, json);
  write(A22_OWNER_REMEDIATION_CANDIDATE_DIRTY_ALLOWLIST_PATHS.latestMarkdown, md);
  write(A22_OWNER_REMEDIATION_CANDIDATE_DIRTY_ALLOWLIST_PATHS.datedMarkdown, md);
}

function main() {
  const payload = buildA22OwnerRemediationCandidateDirtyAllowlist();
  persist(payload);
  console.log(JSON.stringify({
    artifactKind: payload.artifactKind,
    targetWorktree: payload.targetWorktree,
    allowlistRows: payload.summary.allowlistRows,
    verifiedRows: payload.summary.verifiedRows,
    allowedDirtyStatusRows: payload.summary.allowedDirtyStatusRows,
    readyForPromotionAllowlist: payload.summary.readyForPromotionAllowlist,
    cleanupAuthorizedRows: 0,
    executableRows: 0
  }, null, 2));
  process.exit(payload.summary.readyForPromotionAllowlist ? 0 : 1);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
