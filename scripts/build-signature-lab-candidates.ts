/**
 * build-signature-lab-candidates.ts
 *
 * Joins the MAIS visualization catalog against the Claude Math Visual library
 * on CCSS standard ids, and prints a per-topic candidate shortlist for curation
 * into `data/signatureLabAssignments.ts`.
 *
 * This produces a SHORTLIST, not a mapping. It cuts a 184 x 76 decision down to
 * a handful of candidates per topic; a human still chooses the primary and
 * writes the rationale. Do not auto-generate the assignments file from this.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.json scripts/build-signature-lab-candidates.ts
 *   npx tsx --tsconfig tsconfig.json scripts/build-signature-lab-candidates.ts --json
 *   npx tsx --tsconfig tsconfig.json scripts/build-signature-lab-candidates.ts --library "/path/to/Claude Math Visual"
 *
 * Only California labs join automatically: they are the sole US track carrying
 * CCSS standard ids. Arkansas uses Arkansas codes (K.CAR.1) and Florida is
 * chapter-level, so neither has a join key and both keep the template renderer.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { visualizationLabCatalog } from "@/data/visualizationLabs";
import { signatureLabAssignments } from "@/data/signatureLabAssignments";
import { signatureLabCcssOverrides } from "@/data/signatureLabCcssOverrides";

type ClaudeLabMeta = { ccss?: string[]; domains?: string[]; picture?: string; src?: string };

const DEFAULT_LIBRARY = join(process.env.HOME ?? "", "Desktop", "Claude Math Visual");

function parseArgs() {
  const args = process.argv.slice(2);
  const libraryIndex = args.indexOf("--library");
  return {
    asJson: args.includes("--json"),
    library: libraryIndex >= 0 ? args[libraryIndex + 1] : DEFAULT_LIBRARY
  };
}

/**
 * Normalise CCSS ids so the two libraries agree.
 * MAIS emits "K.CC.1" / "6.NS.7"; the Claude library emits the fuller
 * "6.NS.C.7c" and "A-REI.D.11". Drop the cluster letter and any sub-letter.
 */
export function normalizeCcss(code: string): string {
  const highSchool = code.match(/^([A-Z]+)-([A-Z]+)\.([A-Z])\.(\d+)/);
  if (highSchool) return `${highSchool[1]}-${highSchool[2]}.${highSchool[4]}`;
  const k12 = code.match(/^(K|\d+)\.([A-Z]+)(?:\.([A-Z]))?\.(\d+)/);
  if (k12) return `${k12[1]}.${k12[2]}.${k12[4]}`;
  return code;
}

function main() {
  const { asJson, library } = parseArgs();

  let labs: Record<string, ClaudeLabMeta>;
  try {
    labs = JSON.parse(readFileSync(join(library, "labs.json"), "utf8")) as Record<string, ClaudeLabMeta>;
  } catch (error) {
    console.error(`Could not read labs.json from ${library}`);
    console.error(`Pass --library "<path to Claude Math Visual>" if the library lives elsewhere.`);
    console.error(String(error));
    process.exitCode = 1;
    return;
  }

  // Merge MAIS-side supplemental CCSS tags for benches the upstream library
  // left untagged. This closes the metadata gap without editing labs.json; each
  // override is a standard the bench teaches and a CA topic actually carries.
  for (const [name, codes] of Object.entries(signatureLabCcssOverrides)) {
    const meta = (labs[name] ??= {});
    meta.ccss = [...new Set([...(meta.ccss ?? []), ...codes])];
  }

  const benchesByStandard = new Map<string, string[]>();
  let untagged = 0;
  for (const [name, meta] of Object.entries(labs)) {
    if (!meta.ccss?.length) untagged += 1;
    for (const code of meta.ccss ?? []) {
      const key = normalizeCcss(code);
      benchesByStandard.set(key, [...(benchesByStandard.get(key) ?? []), name]);
    }
  }

  const californiaLabs = visualizationLabCatalog.filter((lab) => lab.californiaAlignment);
  const rows = californiaLabs.map((lab) => {
    const candidates = new Set<string>();
    for (const standardId of lab.californiaAlignment!.standardIds) {
      for (const bench of benchesByStandard.get(normalizeCcss(standardId)) ?? []) candidates.add(bench);
    }
    return {
      labId: lab.labId,
      grade: lab.grade,
      standardIds: lab.californiaAlignment!.standardIds,
      candidates: [...candidates],
      assigned: signatureLabAssignments[lab.topicId]?.primary ?? null
    };
  });

  if (asJson) {
    console.log(JSON.stringify({ generatedAt: new Date().toISOString(), library, rows }, null, 2));
    return;
  }

  const gradeOrder = ["K", "P1", "P2", "P3", "P4", "P5", "P6", "S1", "S2", "S3", "S4", "S5", "S6"];
  rows.sort((a, b) => gradeOrder.indexOf(a.grade) - gradeOrder.indexOf(b.grade) || a.labId.localeCompare(b.labId));

  const matched = rows.filter((row) => row.candidates.length > 0);
  const clean = rows.filter((row) => row.candidates.length === 1);
  const fanOut = rows.filter((row) => row.candidates.length > 1);
  const unmatched = rows.filter((row) => row.candidates.length === 0);
  const reachable = new Set(rows.flatMap((row) => row.candidates));

  console.log("Signature lab candidates (California / CCSS join)\n");
  console.log(`  library                 ${library}`);
  console.log(`  benches in library      ${Object.keys(labs).length} (${untagged} carry no CCSS tags and can never match)`);
  console.log(`  California labs         ${californiaLabs.length}`);
  console.log(`  matched                 ${matched.length}`);
  console.log(`    clean 1:1             ${clean.length}`);
  console.log(`    needs curation        ${fanOut.length}`);
  console.log(`  unmatched               ${unmatched.length}`);
  console.log(`  benches reachable       ${reachable.size} / ${Object.keys(labs).length}`);
  console.log(`  already assigned        ${rows.filter((row) => row.assigned).length}\n`);

  console.log("| grade | lab id | n | assigned | candidates |");
  console.log("| --- | --- | ---: | --- | --- |");
  for (const row of matched) {
    console.log(
      `| ${row.grade} | ${row.labId} | ${row.candidates.length} | ${row.assigned ?? "-"} | ${row.candidates.join(", ")} |`
    );
  }

  if (unmatched.length) {
    console.log("\nUnmatched (no bench carries these standards):");
    for (const row of unmatched) console.log(`  ${row.grade}  ${row.labId}  (${row.standardIds.join(", ")})`);
    console.log("\nNote: an unmatched row may be a metadata gap rather than a coverage gap —");
    console.log("a suitable bench may exist but carry no CCSS tags in labs.json.");
  }
}

main();
