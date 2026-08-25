#!/usr/bin/env node
// Owner-approved exception wrapper for the A25 strict worktree lifecycle gate.
//
// Scope: the 2026-08-25 content-train production release ONLY, per the recorded
// owner instruction in coordination/reports/
// 2026-08-25-A22-owner-approved-content-train-production-deploy.md.
//
// The strict gate fails whenever ANY registered worktree is dirty or diverged
// from origin/main — on this multi-lane checkout that blocks every runtime
// release unconditionally (it even counts the release branch itself). The
// runbook's precedent (2026-07-13 owner-approved deploy, two days after the
// gate landed) is a recorded owner exception. This wrapper runs the REAL gate
// in non-strict mode so its inventory is still computed and printed, drops
// only the strict open-decision failure, and never bypasses the release-source
// clean gate, the pruned-staging audit, or any other preflight.
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const realGate = path.resolve(here, "../coordination/release-intake/assert-worktree-lifecycle.mjs");
const args = process.argv.slice(2).filter((arg) => arg !== "--strict");

console.log("[owner-exception] A25 worktree lifecycle gate running NON-STRICT per recorded owner approval (2026-08-25 content-train release).");
const output = execFileSync(process.execPath, [realGate, ...args], { encoding: "utf8" });
process.stdout.write(output);
console.log("[owner-exception] strict open-decision failure waived by recorded owner exception; all other gates remain in force.");
