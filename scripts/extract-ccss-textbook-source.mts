/**
 * extract-ccss-textbook-source.mts — snapshot the CCSS-Math-Textbook app's
 * K–G5 lesson metadata, hand-checked practice, and CCSS document structure
 * into `data/generated-content/ccss-textbook-source-v1/source.json`.
 *
 * The snapshot is the committed source of truth for the downstream Phase 1
 * generators (port, registry, assignments, practice pack), so they stay
 * reproducible without the upstream project on disk.
 *
 * Run (needs the upstream app checked out):
 *   CCSS_TEXTBOOK_DIR=~/Desktop/CCSS-Math-Textbook \
 *     npx tsx --cwd "$CCSS_TEXTBOOK_DIR" scripts/extract-ccss-textbook-source.mts
 * or simply, from the MAIS repo root:
 *   cd "$CCSS_TEXTBOOK_DIR" && npx tsx "$MAIS_REPO/scripts/extract-ccss-textbook-source.mts"
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";

const sourceDir = path.resolve(
  process.env.CCSS_TEXTBOOK_DIR ?? path.join(homedir(), "Desktop", "CCSS-Math-Textbook")
);
const maisRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(maisRoot, "data", "generated-content", "ccss-textbook-source-v1");

/** All upstream grades. Phase 1 shipped K–5; Phase 5 extends to 6–8 and HS. */
const PORTED_GRADES = new Set(["K", "1", "2", "3", "4", "5", "6", "7", "8", "HS"]);

const registry = await import(pathToFileURL(path.join(sourceDir, "src/lessons/registry.tsx")).href);
const practice = await import(pathToFileURL(path.join(sourceDir, "src/lessons/practice.ts")).href);
const ccss = await import(pathToFileURL(path.join(sourceDir, "src/data/ccss/index.ts")).href);

type UpstreamLesson = {
  slug: string;
  gradeId: string;
  title: string;
  standardIds: string[];
  summary: string;
  emoji: string;
};

const lessons = (registry.lessons as UpstreamLesson[]).filter((lesson) => PORTED_GRADES.has(lesson.gradeId));
const practiceBySlug = Object.fromEntries(
  lessons
    .map((lesson) => [lesson.slug, practice.practiceBySlug[lesson.slug] ?? []])
    .filter(([, questions]) => (questions as unknown[]).length > 0)
);

/** CCSS document structure for K–5: domain order and in-domain standard order. */
const gradesOut = (ccss.grades as Array<{
  id: string;
  label: string;
  domains: Array<{
    code: string;
    name: string;
    clusters: Array<{ heading: string; standards: Array<{ id: string; description: string }> }>;
  }>;
}>)
  .filter((grade) => PORTED_GRADES.has(grade.id))
  .map((grade) => ({
    id: grade.id,
    label: grade.label,
    domains: grade.domains.map((domain) => ({
      code: domain.code,
      name: domain.name,
      standardIds: domain.clusters.flatMap((cluster) => cluster.standards.map((standard) => standard.id)),
      standards: domain.clusters.flatMap((cluster) =>
        cluster.standards.map((standard) => ({ id: standard.id, description: standard.description }))
      )
    }))
  }));

const snapshot = {
  packageId: "ccss-textbook-source-v1",
  generatedAt: new Date().toISOString().slice(0, 10),
  sourceDir,
  generator: "scripts/extract-ccss-textbook-source.mts",
  scope: { grades: [...PORTED_GRADES], lessonCount: lessons.length },
  lessons,
  practiceBySlug,
  ccssGrades: gradesOut
};

mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, "source.json");
writeFileSync(outPath, `${JSON.stringify(snapshot, null, 2)}\n`);
console.log(`wrote ${outPath}: ${lessons.length} lessons, ${Object.keys(practiceBySlug).length} practice sets, ${gradesOut.length} grades`);
