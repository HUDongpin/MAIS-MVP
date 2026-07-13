#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  assertEvidenceRootLayout,
  gitBuffer,
  repositoryIdentity,
  stableJson
} from "./evidence-archive-lib.mjs";
import {
  buildDispositionManifest,
  readEvidenceRootMarkerArtifact,
  resolveDispositionEvidenceRoot
} from "./generate-closure-disposition-manifest.mjs";

function commonDirectory(repoRoot) {
  const value = gitBuffer(["rev-parse", "--git-common-dir"], repoRoot).toString("utf8").trim();
  return fs.realpathSync(path.isAbsolute(value) ? value : path.resolve(repoRoot, value));
}

function readPrivateReport(reportPath) {
  const initial = fs.lstatSync(reportPath, { bigint: true });
  if (!initial.isFile() || initial.isSymbolicLink() || initial.nlink !== 1n || (initial.mode & 0o777n) !== 0o600n) {
    throw new Error("disposition report must be a direct 0600 regular file with one link");
  }
  const descriptor = fs.openSync(reportPath, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
  try {
    const before = fs.fstatSync(descriptor, { bigint: true });
    const bytes = fs.readFileSync(descriptor);
    const after = fs.fstatSync(descriptor, { bigint: true });
    if (
      before.dev !== initial.dev || before.ino !== initial.ino ||
      before.dev !== after.dev || before.ino !== after.ino ||
      before.size !== after.size || before.mtimeNs !== after.mtimeNs || before.ctimeNs !== after.ctimeNs ||
      BigInt(bytes.length) !== before.size
    ) {
      throw new Error("disposition report changed while reading");
    }
    const report = JSON.parse(bytes.toString("utf8"));
    const canonical = Buffer.from(`${JSON.stringify(report, null, 2)}\n`);
    if (!bytes.equals(canonical)) {
      throw new Error("disposition report JSON is not canonical or contains duplicate fields");
    }
    return report;
  } finally {
    fs.closeSync(descriptor);
  }
}

export function assertDispositionManifestCurrent({
  repoRoot,
  evidenceRoot,
  ownerManifestPath,
  policyPath,
  dirtyMapPath,
  clock = () => new Date(),
  maxAgeMinutes = 10
}) {
  try {
    const commonDir = commonDirectory(repoRoot);
    const repositoryId = repositoryIdentity(commonDir);
    const resolvedEvidenceRoot = resolveDispositionEvidenceRoot({
      repoRoot,
      commonDir,
      evidenceRoot
    });
    const markerArtifact = readEvidenceRootMarkerArtifact(resolvedEvidenceRoot, repositoryId);
    assertEvidenceRootLayout(resolvedEvidenceRoot);
    const report = readPrivateReport(
      path.join(resolvedEvidenceRoot, "reports", "mais-closure-disposition-v1.json")
    );
    const generatedAtMs = Date.parse(report.generatedAt);
    const currentTime = typeof clock === "function" ? clock() : null;
    const nowMs = currentTime instanceof Date ? currentTime.getTime() : Number.NaN;
    const maxAgeMs = Number(maxAgeMinutes) * 60 * 1000;
    if (
      !Number.isFinite(generatedAtMs) ||
      !Number.isFinite(nowMs) ||
      !Number.isFinite(maxAgeMs) ||
      maxAgeMs <= 0 ||
      nowMs < generatedAtMs ||
      nowMs - generatedAtMs > maxAgeMs
    ) {
      throw new Error("disposition report age is invalid or stale");
    }
    const current = buildDispositionManifest({
      repoRoot,
      ownerManifestPath,
      policyPath,
      dirtyMapPath,
      repositoryId,
      evidenceRootId: markerArtifact.marker.rootId,
      evidenceRootMarker: markerArtifact.binding,
      generatedAt: report.generatedAt
    });
    const finalMarkerArtifact = readEvidenceRootMarkerArtifact(resolvedEvidenceRoot, repositoryId);
    if (stableJson(finalMarkerArtifact) !== stableJson(markerArtifact)) {
      throw new Error("evidence root marker changed during currentness assertion");
    }
    if (stableJson(current) !== stableJson(report)) {
      throw new Error("current raw status, hashes, policy, or metadata differ");
    }
    return {
      generatedAt: report.generatedAt,
      rawStatusSignature: report.rawStatusSignature,
      dispositionFingerprint: report.dispositionFingerprint,
      rows: report.coverage.inputRows
    };
  } catch (error) {
    throw new Error(`disposition manifest is not current (${error.message})`);
  }
}

const ASSERTION_HELP = `Usage: node coordination/release-intake/assert-closure-disposition-manifest-current.mjs [options]

Options:
  --repo-root <absolute-path>
  --evidence-root <absolute-path>
  --owner-manifest <path>
  --policy <path>
  --dirty-map <path>
  --max-age-minutes <number>
  --help
`;

function requireCliOptionValue(argv, index, option) {
  const value = argv[index + 1];
  if (typeof value !== "string" || value.length === 0 || value.startsWith("--")) {
    throw new Error(`${option} requires a value`);
  }
  return value;
}

function parseAssertionArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help") options.help = true;
    else if (arg === "--repo-root") options.repoRoot = requireCliOptionValue(argv, index++, arg);
    else if (arg === "--evidence-root") options.evidenceRoot = requireCliOptionValue(argv, index++, arg);
    else if (arg === "--owner-manifest") options.ownerManifestPath = requireCliOptionValue(argv, index++, arg);
    else if (arg === "--policy") options.policyPath = requireCliOptionValue(argv, index++, arg);
    else if (arg === "--dirty-map") options.dirtyMapPath = requireCliOptionValue(argv, index++, arg);
    else if (arg === "--max-age-minutes") {
      options.maxAgeMinutes = Number(requireCliOptionValue(argv, index++, arg));
    }
    else throw new Error(`unknown assertion argument: ${arg}`);
  }
  return options;
}

function resolveAssertionOptions(options) {
  const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  const repoRoot = path.resolve(options.repoRoot ?? defaultRoot);
  const commonDir = commonDirectory(repoRoot);
  const evidenceRoot = resolveDispositionEvidenceRoot({
    repoRoot,
    commonDir,
    evidenceRoot: options.evidenceRoot ?? process.env.MAIS_EVIDENCE_ROOT
  });
  const fromRepo = (value, fallback) => path.resolve(repoRoot, value ?? fallback);
  return {
    ...options,
    repoRoot,
    evidenceRoot,
    ownerManifestPath: fromRepo(options.ownerManifestPath, "coordination/release-intake/owner-pathspecs.json"),
    policyPath: fromRepo(options.policyPath, "coordination/release-intake/closure-disposition-policy.json"),
    dirtyMapPath: fromRepo(options.dirtyMapPath, "coordination/release-intake/latest-A25-dirty-tree-map.json"),
    maxAgeMinutes: options.maxAgeMinutes ?? 10
  };
}

function assertionMain(argv) {
  const parsed = parseAssertionArgs(argv);
  if (parsed.help) {
    process.stdout.write(ASSERTION_HELP);
    return;
  }
  const options = resolveAssertionOptions(parsed);
  const result = assertDispositionManifestCurrent(options);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    assertionMain(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
