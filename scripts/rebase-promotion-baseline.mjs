#!/usr/bin/env node
/**
 * Re-points a Promotion pilot's evidence-bound target baseline at a newer commit.
 *
 * WHY THIS EXISTS
 * ---------------
 * `V2_TARGET_BASELINE_DRIFT` blocks a Promotion Shadow run when live/runtime
 * paths have changed since the commit the pilot's evidence was bound to. The
 * correct response is to re-affirm the evidence against the new runtime — not to
 * exempt a class of change, which would permanently hollow out the control.
 *
 * WHAT A RE-BASE ACTUALLY TOUCHES
 * -------------------------------
 * The baseline commit is pinned in three coupled places, and the third is why
 * this cannot be a hand edit:
 *
 *   1. the manifest's `targetBaselineCommit`
 *   2. every `evidenceBindings[].currentness.targetBaselineCommit`
 *   3. every evidence artifact's own top-level `targetBaselineCommit`
 *
 * Editing (3) changes the artifact's bytes, which invalidates the
 * `evidenceBindings[].rawSha256` that pins it. So a re-base necessarily
 * recomputes those hashes.
 *
 * THAT IS THE HAZARD THIS SCRIPT REFUSES TO HIDE
 * ----------------------------------------------
 * Recomputing `rawSha256` makes a rewritten artifact pass integrity checks. Run
 * blindly, this turns "nobody re-ran the check" into an attestation that looks
 * freshly issued. The A-roles own those judgements, not this script.
 *
 * So: dry-run is the default and prints the exact change set. Writing requires
 * `--attested-by` naming every role that has re-affirmed its finding against the
 * target commit, and `--justification` pointing at the evidence for that.
 *
 * `semanticPayload` does not reference the baseline commit, so `semanticDigest`
 * is unchanged by a re-base: a role is being asked to confirm its existing
 * finding still holds against a new runtime, not to form a new one.
 *
 *   node scripts/rebase-promotion-baseline.mjs --manifest <path> --target <sha>
 *   node scripts/rebase-promotion-baseline.mjs --manifest <path> --target <sha> \
 *     --attested-by A21,A18,A23,A04,A05,A11,A22,A24,A25 \
 *     --justification coordination/integration/pilots/<...>/baseline-rebase-justification.md
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(argv) {
  const options = { manifest: null, target: null, attestedBy: [], justification: null, write: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => argv[++index];
    if (arg === "--manifest") options.manifest = next();
    else if (arg === "--target") options.target = next();
    else if (arg === "--attested-by") options.attestedBy = (next() ?? "").split(",").map((r) => r.trim()).filter(Boolean);
    else if (arg === "--justification") options.justification = next();
    else if (arg === "--write") options.write = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

const sha256 = (buffer) => crypto.createHash("sha256").update(buffer).digest("hex");

function resolveCommit(commitish) {
  try {
    return execFileSync("git", ["rev-parse", commitish], { cwd: repoRoot, encoding: "utf8" }).trim();
  } catch {
    throw new Error(`Cannot resolve --target "${commitish}" to a commit in this repository.`);
  }
}

function assertAncestorOfHead(commit) {
  try {
    execFileSync("git", ["merge-base", "--is-ancestor", commit, "HEAD"], { cwd: repoRoot });
  } catch {
    throw new Error(
      `Target ${commit.slice(0, 12)} is not an ancestor of HEAD. The baseline must name a commit the ` +
      `runtime has actually reached, otherwise the drift check compares against a tree that never shipped.`
    );
  }
}

/** Rewrites one JSON file's targetBaselineCommit, preserving formatting style. */
function rewriteBaseline(absolutePath, fromCommit, toCommit) {
  const original = fs.readFileSync(absolutePath, "utf8");
  if (!original.includes(fromCommit)) return null;
  const updated = original.split(fromCommit).join(toCommit);
  return { original, updated };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help || !options.manifest || !options.target) {
    console.log("usage: rebase-promotion-baseline.mjs --manifest <path> --target <commit> [--attested-by ROLES] [--justification <path>] [--write]");
    process.exit(options.help ? 0 : 2);
  }

  const manifestPath = path.resolve(repoRoot, options.manifest);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const fromCommit = manifest.targetBaselineCommit;
  const toCommit = resolveCommit(options.target);
  assertAncestorOfHead(toCommit);

  if (fromCommit === toCommit) {
    console.log(`Baseline already at ${toCommit}. Nothing to do.`);
    return;
  }

  const bindings = manifest.evidenceBindings ?? [];
  const roles = bindings.map((binding) => binding.role);
  const planned = [];

  // 1 + 2: the manifest itself (targetBaselineCommit and every binding currentness).
  const manifestRewrite = rewriteBaseline(manifestPath, fromCommit, toCommit);
  if (manifestRewrite) planned.push({ file: options.manifest, kind: "manifest + binding currentness" });

  // 3: each evidence artifact, plus the rawSha256 that pins it.
  const hashUpdates = [];
  for (const binding of bindings) {
    const evidenceAbsolute = path.resolve(repoRoot, binding.evidencePath);
    const rewrite = rewriteBaseline(evidenceAbsolute, fromCommit, toCommit);
    if (!rewrite) continue;
    const beforeHash = sha256(Buffer.from(rewrite.original, "utf8"));
    const afterHash = sha256(Buffer.from(rewrite.updated, "utf8"));
    if (beforeHash !== binding.rawSha256) {
      throw new Error(
        `${binding.role}: rawSha256 in the manifest does not match ${binding.evidencePath} as committed. ` +
        `Refusing to proceed — the pilot's integrity is already broken and must be reconciled first.`
      );
    }
    planned.push({ file: binding.evidencePath, kind: `evidence (${binding.role})` });
    hashUpdates.push({ role: binding.role, from: beforeHash, to: afterHash, updated: rewrite.updated, absolute: evidenceAbsolute });
  }

  // Also sweep sibling inputs that pin the same commit (evidence index, registries).
  const inputsDir = path.join(path.dirname(manifestPath), "inputs");
  const sidecars = [];
  if (fs.existsSync(inputsDir)) {
    for (const entry of fs.readdirSync(inputsDir)) {
      const absolute = path.join(inputsDir, entry);
      if (!fs.statSync(absolute).isFile() || !entry.endsWith(".json")) continue;
      if (rewriteBaseline(absolute, fromCommit, toCommit)) {
        const relative = path.relative(repoRoot, absolute);
        planned.push({ file: relative, kind: "pilot input sidecar" });
        sidecars.push(absolute);
      }
    }
  }

  console.log(`Promotion baseline re-base plan`);
  console.log(`  pilot   : ${path.dirname(options.manifest)}`);
  console.log(`  from    : ${fromCommit}`);
  console.log(`  to      : ${toCommit}`);
  console.log(`  roles   : ${roles.join(", ")}`);
  console.log(`\nFiles that would change (${planned.length}):`);
  planned.forEach((entry) => console.log(`  ${entry.kind.padEnd(26)} ${entry.file}`));
  console.log(`\nevidenceBindings[].rawSha256 that would be recomputed (${hashUpdates.length}):`);
  hashUpdates.forEach((entry) => console.log(`  ${entry.role.padEnd(5)} ${entry.from.slice(0, 16)}… -> ${entry.to.slice(0, 16)}…`));

  if (!options.write) {
    console.log(`\nDRY RUN — nothing written. Re-run with --write once the roles above have re-affirmed.`);
    return;
  }

  const missing = roles.filter((role) => !options.attestedBy.includes(role));
  if (missing.length) {
    console.error(
      `\nREFUSING TO WRITE. Re-affirmation missing for: ${missing.join(", ")}.\n` +
      `Recomputing rawSha256 would make these artifacts pass integrity checks while carrying a baseline ` +
      `no role re-affirmed. Pass --attested-by with every role once each has confirmed its finding still ` +
      `holds against ${toCommit.slice(0, 12)}.`
    );
    process.exit(2);
  }
  if (!options.justification || !fs.existsSync(path.resolve(repoRoot, options.justification))) {
    console.error(`\nREFUSING TO WRITE. --justification must point at a committed record of why the evidence still holds.`);
    process.exit(2);
  }

  if (manifestRewrite) fs.writeFileSync(manifestPath, manifestRewrite.updated);
  hashUpdates.forEach((entry) => fs.writeFileSync(entry.absolute, entry.updated));
  sidecars.forEach((absolute) => {
    const rewrite = rewriteBaseline(absolute, fromCommit, toCommit);
    if (rewrite) fs.writeFileSync(absolute, rewrite.updated);
  });

  // rawSha256 must be refreshed after the evidence files are on disk.
  const refreshed = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  for (const binding of refreshed.evidenceBindings ?? []) {
    binding.rawSha256 = sha256(fs.readFileSync(path.resolve(repoRoot, binding.evidencePath)));
  }
  fs.writeFileSync(manifestPath, `${JSON.stringify(refreshed, null, 2)}\n`);
  console.log(`\nWritten. Re-run the Promotion Shadow gate to confirm the pilot validates at the new baseline.`);
}

main();
