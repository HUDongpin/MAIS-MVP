#!/usr/bin/env node
/**
 * Re-points a Promotion pilot at a newer, explicitly re-affirmed runtime baseline.
 *
 * Evidence and its Manifest binding cannot be rewritten atomically: the Manifest
 * must name a commit that already contains the exact evidence bytes it hashes.
 * This tool therefore enforces two committed phases:
 *
 *   1. --write-evidence rewrites only the nine role-owned evidence artifacts.
 *   2. After those exact files are committed, --write-bindings updates the
 *      Manifest and evidence index to that evidence commit.
 *
 * The former monolithic --write mode is rejected. It could recompute raw hashes
 * while leaving semantic digests and reviewedCommit bindings stale, producing a
 * change set that looked complete but could never pass the Promotion Gate.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { computeV2EvidenceSemanticDigest } from "../coordination/integration/v2/promotion-gate-v2-lib.mjs";

const repoRoot = fs.realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."));
const commitPattern = /^[a-f0-9]{40}$/u;

function usage() {
  return [
    "usage:",
    "  rebase-promotion-baseline.mjs --manifest <path> --target <commit>",
    "  rebase-promotion-baseline.mjs --manifest <path> --target <commit> --write-evidence --attested-by <roles> --justification <committed-path>",
    "  rebase-promotion-baseline.mjs --manifest <path> --target <commit> --write-bindings --evidence-commit <commit> --attested-by <roles> --justification <committed-path>"
  ].join("\n");
}

function parseArgs(argv) {
  const options = {
    manifest: null,
    target: null,
    attestedBy: [],
    justification: null,
    evidenceCommit: null,
    writeEvidence: false,
    writeBindings: false,
    rejectedMonolithicWrite: false,
    help: false
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const next = () => argv[++index];
    if (argument === "--manifest") options.manifest = next();
    else if (argument === "--target") options.target = next();
    else if (argument === "--attested-by") {
      options.attestedBy = (next() ?? "").split(",").map((role) => role.trim()).filter(Boolean);
    } else if (argument === "--justification") options.justification = next();
    else if (argument === "--evidence-commit") options.evidenceCommit = next();
    else if (argument === "--write-evidence") options.writeEvidence = true;
    else if (argument === "--write-bindings") options.writeBindings = true;
    else if (argument === "--write") options.rejectedMonolithicWrite = true;
    else if (argument === "--help" || argument === "-h") options.help = true;
    else throw new Error(`Unknown argument: ${argument}`);
  }
  return options;
}

function git(args, encoding = "utf8") {
  return execFileSync("git", args, {
    cwd: repoRoot,
    encoding,
    maxBuffer: 32 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  });
}

function resolveCommit(commitish, label) {
  try {
    const resolved = git(["rev-parse", "--verify", `${commitish}^{commit}`]).trim();
    if (!commitPattern.test(resolved)) throw new Error("invalid commit shape");
    return resolved;
  } catch {
    throw new Error(`${label} cannot be resolved to one commit in this repository.`);
  }
}

function assertAncestor(ancestor, descendant, label) {
  try {
    git(["merge-base", "--is-ancestor", ancestor, descendant]);
  } catch {
    throw new Error(`${label} is not an ancestor of the required execution commit.`);
  }
}

function assertCleanWorktree() {
  if (git(["status", "--porcelain=v1", "--untracked-files=all"]).trim() !== "") {
    throw new Error("A write phase requires an otherwise clean worktree.");
  }
}

function resolveRepositoryFile(input, label) {
  if (!input || path.isAbsolute(input)) throw new Error(`${label} must be repository-relative.`);
  const absolute = path.resolve(repoRoot, input);
  if (absolute === repoRoot || !absolute.startsWith(`${repoRoot}${path.sep}`)) {
    throw new Error(`${label} escapes the repository.`);
  }
  const real = fs.realpathSync(absolute);
  if (real !== absolute || !fs.lstatSync(real).isFile()) {
    throw new Error(`${label} must be one exact regular repository file.`);
  }
  return { absolute, relative: path.relative(repoRoot, absolute).split(path.sep).join("/") };
}

function gitBlob(commit, repositoryPath) {
  return git(["show", `${commit}:${repositoryPath}`], null);
}

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function canonicalJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function rewriteBaseline(bytes, fromCommit, toCommit, label) {
  const original = bytes.toString("utf8");
  if (!original.includes(fromCommit)) {
    throw new Error(`${label} does not contain the baseline it is supposed to re-affirm.`);
  }
  return Buffer.from(original.split(fromCommit).join(toCommit), "utf8");
}

function loadManifest(manifestInput) {
  const file = resolveRepositoryFile(manifestInput, "Manifest");
  const value = JSON.parse(fs.readFileSync(file.absolute, "utf8"));
  if (!commitPattern.test(value?.targetBaselineCommit ?? "") || !Array.isArray(value?.evidenceBindings)) {
    throw new Error("Manifest does not expose a valid target baseline and evidence bindings.");
  }
  return { ...file, value };
}

function requiredRoles(manifest) {
  const roles = manifest.evidenceBindings.map((binding) => binding.role);
  if (roles.length === 0 || new Set(roles).size !== roles.length || roles.some((role) => typeof role !== "string")) {
    throw new Error("Manifest evidence roles are missing or duplicated.");
  }
  return roles;
}

function assertAttestations(manifest, attestedBy) {
  const expected = [...requiredRoles(manifest)].sort();
  const supplied = [...new Set(attestedBy)].sort();
  if (JSON.stringify(expected) !== JSON.stringify(supplied)) {
    const missing = expected.filter((role) => !supplied.includes(role));
    const unexpected = supplied.filter((role) => !expected.includes(role));
    throw new Error(
      `Re-affirmation set is not exact (missing=${missing.join(",") || "none"}; unexpected=${unexpected.join(",") || "none"}).`
    );
  }
}

function assertCommittedJustification(justificationInput, targetCommit, roles) {
  const file = resolveRepositoryFile(justificationInput, "Justification");
  let committed;
  try {
    committed = gitBlob("HEAD", file.relative);
  } catch {
    throw new Error("Justification must already be committed before either write phase.");
  }
  const working = fs.readFileSync(file.absolute);
  if (!working.equals(committed)) throw new Error("Justification bytes differ from committed HEAD.");
  const text = working.toString("utf8");
  if (!text.includes(targetCommit) || roles.some((role) => !text.includes(role))) {
    throw new Error("Committed justification must name the exact target commit and every re-affirming role.");
  }
  return file;
}

function collectEvidenceRewrites(manifest, fromCommit, toCommit) {
  return manifest.evidenceBindings.map((binding) => {
    const file = resolveRepositoryFile(binding.evidencePath, `${binding.role} evidence`);
    const bytes = fs.readFileSync(file.absolute);
    if (sha256(bytes) !== binding.rawSha256) {
      throw new Error(`${binding.role} working evidence does not match its Manifest raw digest.`);
    }
    const reviewed = gitBlob(binding.reviewedCommit, file.relative);
    if (!bytes.equals(reviewed)) {
      throw new Error(`${binding.role} working evidence does not match its reviewed commit.`);
    }
    const updated = rewriteBaseline(bytes, fromCommit, toCommit, `${binding.role} evidence`);
    const parsed = JSON.parse(updated.toString("utf8"));
    if (
      parsed.role !== binding.role ||
      parsed.evidenceId !== binding.evidenceId ||
      parsed.targetBaselineCommit !== toCommit
    ) {
      throw new Error(`${binding.role} rewritten evidence has an invalid identity or target baseline.`);
    }
    return { binding, file, updated };
  });
}

function collectEvidenceFiles(manifest) {
  return manifest.evidenceBindings.map((binding) => ({
    binding,
    file: resolveRepositoryFile(binding.evidencePath, `${binding.role} evidence`)
  }));
}

function loadEvidenceIndex(manifestPath) {
  const input = path.posix.join(path.posix.dirname(manifestPath), "inputs/evidence-index.v2.json");
  const file = resolveRepositoryFile(input, "Evidence index");
  const value = JSON.parse(fs.readFileSync(file.absolute, "utf8"));
  if (!Array.isArray(value?.entries)) throw new Error("Evidence index entries are unavailable.");
  return { ...file, value };
}

function printPlan(manifestFile, manifest, targetCommit, evidenceRewrites, evidenceIndex) {
  process.stdout.write([
    "Promotion baseline two-phase re-affirmation plan",
    `  pilot        : ${path.posix.dirname(manifestFile.relative)}`,
    `  from         : ${manifest.targetBaselineCommit}`,
    `  to           : ${targetCommit}`,
    `  roles        : ${requiredRoles(manifest).join(", ")}`,
    "",
    `Evidence phase (${evidenceRewrites.length} files):`,
    ...evidenceRewrites.map(({ binding, file }) => `  ${binding.role.padEnd(5)} ${file.relative}`),
    "",
    "Binding phase (2 files, only after the evidence commit exists):",
    `  manifest       ${manifestFile.relative}`,
    `  evidence index ${evidenceIndex.relative}`
  ].join("\n") + "\n");
}

function writeEvidencePhase(options, manifestFile, manifest, targetCommit, evidenceRewrites) {
  assertCleanWorktree();
  const roles = requiredRoles(manifest);
  assertAttestations(manifest, options.attestedBy);
  assertCommittedJustification(options.justification, targetCommit, roles);
  for (const { file, updated } of evidenceRewrites) fs.writeFileSync(file.absolute, updated);
  process.stdout.write(
    `Evidence phase written (${evidenceRewrites.length} files). Commit only those evidence files, then run --write-bindings with that commit.\n`
  );
}

function writeBindingPhase(options, manifestFile, manifest, targetCommit, evidenceIndex) {
  assertCleanWorktree();
  const roles = requiredRoles(manifest);
  assertAttestations(manifest, options.attestedBy);
  assertCommittedJustification(options.justification, targetCommit, roles);
  if (!options.evidenceCommit) throw new Error("--write-bindings requires --evidence-commit.");
  const evidenceCommit = resolveCommit(options.evidenceCommit, "Evidence commit");
  assertAncestor(targetCommit, evidenceCommit, "Target baseline");
  assertAncestor(evidenceCommit, resolveCommit("HEAD", "HEAD"), "Evidence commit");

  const refreshedBindings = new Map();
  for (const binding of manifest.evidenceBindings) {
    const file = resolveRepositoryFile(binding.evidencePath, `${binding.role} evidence`);
    const committed = gitBlob(evidenceCommit, file.relative);
    const working = fs.readFileSync(file.absolute);
    if (!working.equals(committed)) {
      throw new Error(`${binding.role} evidence must exactly match --evidence-commit.`);
    }
    const evidence = JSON.parse(committed.toString("utf8"));
    if (
      evidence.role !== binding.role ||
      evidence.evidenceId !== binding.evidenceId ||
      evidence.result !== binding.expectedResult ||
      evidence.candidateDigest !== manifest.candidateDigest ||
      evidence.sourceCommit !== manifest.sourceCommit ||
      evidence.targetBaselineCommit !== targetCommit ||
      evidence.checkerVersion !== manifest.checkerVersion
    ) {
      throw new Error(`${binding.role} committed evidence is not a valid re-affirmation for this Manifest.`);
    }
    refreshedBindings.set(binding.role, {
      rawSha256: sha256(committed),
      semanticDigest: computeV2EvidenceSemanticDigest(evidence),
      reviewedCommit: evidenceCommit,
      currentness: {
        candidateDigest: evidence.candidateDigest,
        sourceCommit: evidence.sourceCommit,
        targetBaselineCommit: evidence.targetBaselineCommit,
        checkerVersion: evidence.checkerVersion
      }
    });
  }

  const nextManifest = structuredClone(manifest);
  nextManifest.targetBaselineCommit = targetCommit;
  for (const binding of nextManifest.evidenceBindings) Object.assign(binding, refreshedBindings.get(binding.role));

  const nextIndex = structuredClone(evidenceIndex.value);
  nextIndex.targetBaselineCommit = targetCommit;
  const indexRoles = nextIndex.entries.map((entry) => entry.role).sort();
  if (JSON.stringify(indexRoles) !== JSON.stringify([...roles].sort())) {
    throw new Error("Evidence index role set does not match the Manifest.");
  }
  for (const entry of nextIndex.entries) Object.assign(entry, refreshedBindings.get(entry.role));

  const nextIndexBytes = Buffer.from(canonicalJson(nextIndex), "utf8");
  nextManifest.evidenceIndex.rawSha256 = sha256(nextIndexBytes);

  fs.writeFileSync(manifestFile.absolute, canonicalJson(nextManifest));
  fs.writeFileSync(evidenceIndex.absolute, nextIndexBytes);
  process.stdout.write(
    `Binding phase written for evidence commit ${evidenceCommit}. Commit only the Manifest and evidence index, then run Promotion validation.\n`
  );
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }
  if (options.rejectedMonolithicWrite) {
    throw new Error("Monolithic --write is disabled; use the committed --write-evidence and --write-bindings phases.");
  }
  if (!options.manifest || !options.target || (options.writeEvidence && options.writeBindings)) {
    process.stderr.write(`${usage()}\n`);
    process.exitCode = 2;
    return;
  }

  const manifestFile = loadManifest(options.manifest);
  const manifest = manifestFile.value;
  const targetCommit = resolveCommit(options.target, "Target baseline");
  const headCommit = resolveCommit("HEAD", "HEAD");
  assertAncestor(targetCommit, headCommit, "Target baseline");
  if (manifest.targetBaselineCommit === targetCommit && !options.writeBindings) {
    process.stdout.write(`Baseline already points at ${targetCommit}. Nothing to do.\n`);
    return;
  }
  const evidenceIndex = loadEvidenceIndex(manifestFile.relative);

  // After phase one is committed, the evidence bytes intentionally no longer
  // match the old Manifest hashes. Binding mode must therefore read and verify
  // those bytes against --evidence-commit, not run the phase-one stale-binding
  // checks again before it has a chance to refresh the Manifest.
  if (options.writeBindings) {
    const evidenceFiles = collectEvidenceFiles(manifest);
    printPlan(manifestFile, manifest, targetCommit, evidenceFiles, evidenceIndex);
    writeBindingPhase(options, manifestFile, manifest, targetCommit, evidenceIndex);
    return;
  }

  const evidenceRewrites = collectEvidenceRewrites(
    manifest,
    manifest.targetBaselineCommit,
    targetCommit
  );
  printPlan(manifestFile, manifest, targetCommit, evidenceRewrites, evidenceIndex);

  if (options.writeEvidence) {
    writeEvidencePhase(options, manifestFile, manifest, targetCommit, evidenceRewrites);
  } else {
    process.stdout.write("\nDRY RUN — no files written.\n");
  }
}

main();
