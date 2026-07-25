/**
 * check-port-drift.mjs — has an upstream bench changed since we ported it?
 *
 * Usage:
 *   npm run check:port-drift            # report drift against the manifest
 *   npm run check:port-drift -- --write # re-record the manifest after a port
 *   npm run check:port-drift -- --library "/path/to/Claude Math Visual"
 *
 * WHY THIS EXISTS
 * ---------------
 * Porting a bench is a manual copy: take `<Name>Lab.jsx` from the Claude Math
 * Visual library and delete the standalone `MAIS · Interactive Math Lab` header,
 * because MAIS renders its own chrome. Nothing recorded WHAT was copied, so an
 * upstream edit after the port left no trace.
 *
 * That is not hypothetical. On 2026-07-18 upstream added a 137-line `7.EE.A.2`
 * step to LikeTermsLab. The port was never refreshed, but `labs.json` already
 * carried the `7.EE.A.2` tag — so for a week the catalog advertised a lesson the
 * shipped file did not contain. It was found by hand on 2026-07-25.
 *
 * This records the upstream SHA-256 at port time, so drift is an exact
 * comparison rather than a diff anyone has to remember to run.
 *
 * WHY IT IS NOT A CI GATE
 * -----------------------
 * The upstream library lives outside the repo (on the author's machine), so CI
 * cannot see it — the same reason the CCSS depth gate reads a committed snapshot
 * instead of `labs.json`. Run this locally before trusting an upstream CCSS tag,
 * and after every port. When the library is missing it exits 0 with a notice, so
 * it is harmless to call from a script that also runs elsewhere.
 *
 * It also checks the PORTED side: if a ported file has been edited locally away
 * from its recorded hash, that is reported too — a port is supposed to be the
 * upstream file minus one line, and a local edit silently breaks that contract
 * (and with it the audits, which slice their model out of the shipped file).
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SIGNATURE_DIR = "components/visualizations/signature";
const MANIFEST_PATH = join(SIGNATURE_DIR, "port-manifest.json");
const DEFAULT_LIBRARY = join(process.env.HOME ?? "", "Desktop", "Claude Math Visual");
/**
 * The port transform: drop the standalone MAIS header, at whatever indentation
 * the upstream file happens to use (ShapesLab indents it by 6, most by 8 — an
 * exact-string rule silently mis-reports those as broken ports).
 */
const EYEBROW_LINE = /^[ \t]*<p className="eyebrow">MAIS · Interactive Math Lab<\/p>[ \t]*\r?\n/m;

const args = process.argv.slice(2);
const libIndex = args.indexOf("--library");
const library = libIndex >= 0 ? args[libIndex + 1] : DEFAULT_LIBRARY;
const write = args.includes("--write");

const sha = (text) => createHash("sha256").update(text, "utf8").digest("hex").slice(0, 16);

const portedFiles = readdirSync(SIGNATURE_DIR).filter((f) => f.endsWith(".jsx")).sort();

if (!existsSync(join(library, "labs.json"))) {
  console.log("check-port-drift: the Claude Math Visual library is not on this machine.");
  console.log(`  looked in: ${library}`);
  console.log("  Nothing to compare against — skipping. (Expected in CI; this is not a failure.)");
  process.exit(0);
}

const manifest = existsSync(MANIFEST_PATH)
  ? JSON.parse(readFileSync(MANIFEST_PATH, "utf8"))
  : { note: "", generatedAt: "", benches: {} };

const expectedPort = (upstream) => upstream.replace(EYEBROW_LINE, "");

/**
 * How a port differs from the transform, ignoring blank-line noise. A port that
 * differs only by whitespace is cosmetic and reported separately — conflating it
 * with a CONTENT difference is how a real drift gets lost in a list of shrugs.
 */
function portDifference(upstream, ported) {
  const meaningful = (text) => text.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
  const want = meaningful(expectedPort(upstream));
  const got = meaningful(ported);
  if (want.length === got.length && want.every((l, i) => l === got[i])) {
    return expectedPort(upstream) === ported ? "identical" : "whitespace-only";
  }
  return "content";
}

const rows = [];
for (const file of portedFiles) {
  const name = file.replace(/\.jsx$/, "");
  const portedPath = join(SIGNATURE_DIR, file);
  const upstreamPath = join(library, file);
  const ported = readFileSync(portedPath, "utf8");
  const upstream = existsSync(upstreamPath) ? readFileSync(upstreamPath, "utf8") : null;
  rows.push({
    name,
    portedSha: sha(ported),
    upstreamSha: upstream === null ? null : sha(upstream),
    difference: upstream === null ? null : portDifference(upstream, ported),
  });
}

if (write) {
  const benches = {};
  for (const r of rows) {
    benches[r.name] = r.upstreamSha
      ? { upstreamSha: r.upstreamSha, portedSha: r.portedSha }
      : { upstreamSha: null, portedSha: r.portedSha, authored: true };
  }
  writeFileSync(
    MANIFEST_PATH,
    `${JSON.stringify(
      {
        note:
          "SHA-256 (first 16 hex) of each bench at port time. `upstreamSha: null, authored: true` " +
          "marks a bench written for MAIS rather than ported — it has no upstream to drift from. " +
          "Regenerate with: npm run check:port-drift -- --write",
        generatedAt: new Date().toISOString().slice(0, 10),
        benches,
      },
      null,
      2
    )}\n`
  );
  const authored = rows.filter((r) => !r.upstreamSha).length;
  console.log(`check-port-drift: recorded ${rows.length} benches (${authored} MAIS-authored) to ${MANIFEST_PATH}`);
  process.exit(0);
}

const upstreamDrift = [];
const localEdits = [];
const untracked = [];
const transformBroken = [];
const cosmetic = [];

for (const r of rows) {
  const recorded = manifest.benches?.[r.name];
  if (!recorded) {
    untracked.push(r.name);
    continue;
  }
  if (r.upstreamSha && recorded.upstreamSha && r.upstreamSha !== recorded.upstreamSha) {
    upstreamDrift.push(r.name);
  }
  if (recorded.portedSha && r.portedSha !== recorded.portedSha) {
    localEdits.push(r.name);
  }
  if (r.difference === "content" && r.upstreamSha === recorded.upstreamSha) {
    transformBroken.push(r.name);
  } else if (r.difference === "whitespace-only") {
    cosmetic.push(r.name);
  }
}

console.log(`check-port-drift — ${rows.length} benches in ${SIGNATURE_DIR}`);
console.log(`  library: ${library}`);
console.log(`  manifest recorded ${new Date(manifest.generatedAt || 0).toISOString().slice(0, 10)}\n`);

let failed = false;

if (upstreamDrift.length > 0) {
  failed = true;
  console.log(`UPSTREAM DRIFT — the library changed after these were ported (${upstreamDrift.length}):`);
  for (const n of upstreamDrift) console.log(`  ${n}`);
  console.log("  The shipped file may no longer contain a lesson its CCSS tags claim.");
  console.log("  Re-port, run the bench's audit, then: npm run check:port-drift -- --write\n");
}

if (localEdits.length > 0) {
  failed = true;
  console.log(`PORTED FILE EDITED LOCALLY (${localEdits.length}):`);
  for (const n of localEdits) console.log(`  ${n}`);
  console.log("  A port should be the upstream file minus the MAIS header. If the edit is");
  console.log("  intentional, record it: npm run check:port-drift -- --write\n");
}

if (transformBroken.length > 0) {
  failed = true;
  console.log(`PORT CONTENT MISMATCH (${transformBroken.length}):`);
  for (const n of transformBroken) console.log(`  ${n}`);
  console.log("  Upstream is unchanged, but the port differs by more than whitespace —");
  console.log("  the shipped lesson is not the upstream one.\n");
}

if (untracked.length > 0) {
  console.log(`NOT IN THE MANIFEST (${untracked.length}):`);
  for (const n of untracked) console.log(`  ${n}`);
  console.log("  Record them: npm run check:port-drift -- --write\n");
}

if (cosmetic.length > 0) {
  console.log(`whitespace-only differences, not a concern (${cosmetic.length}): ${cosmetic.join(", ")}\n`);
}

if (!failed && untracked.length === 0) {
  const authored = rows.filter((r) => !r.upstreamSha).length;
  console.log(`OK — no drift. ${rows.length - authored} ports match the library, ${authored} are MAIS-authored.`);
}

process.exit(failed ? 1 : 0);
