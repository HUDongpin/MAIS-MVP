/**
 * port-ccss-lessons.mjs — bulk-copy the K–G5 interactive lesson bodies from
 * the CCSS-Math-Textbook app into `components/lesson/ccss/lessons/<slug>.tsx`.
 *
 * Lessons are never edited: the ONLY transform is rewriting the two shared
 * component import paths (Figure, MathCheck) to their ported locations. A
 * reverse-diff fidelity check proves nothing else changed. Slugs come from the
 * committed snapshot (`ccss-textbook-source-v1/source.json`), so the port is
 * reproducible and the copied set always matches the extracted metadata.
 *
 * Run: node scripts/port-ccss-lessons.mjs   (needs the upstream app on disk)
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const maisRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = path.resolve(
  process.env.CCSS_TEXTBOOK_DIR ?? path.join(homedir(), "Desktop", "CCSS-Math-Textbook")
);
const snapshotPath = path.join(maisRoot, "data", "generated-content", "ccss-textbook-source-v1", "source.json");
const outDir = path.join(maisRoot, "components", "lesson", "ccss", "lessons");

const importRewrites = [
  ['@/components/lesson/MathCheck', '@/components/lesson/ccss/MathCheck'],
  ['@/components/lesson/Figure', '@/components/lesson/ccss/Figure']
];

const snapshot = JSON.parse(readFileSync(snapshotPath, "utf8"));
mkdirSync(outDir, { recursive: true });

let ported = 0;
const failures = [];
for (const lesson of snapshot.lessons) {
  const sourcePath = path.join(sourceDir, "src", "lessons", lesson.slug, "Lesson.tsx");
  const targetPath = path.join(outDir, `${lesson.slug}.tsx`);
  let content;
  try {
    content = readFileSync(sourcePath, "utf8");
  } catch {
    failures.push(`${lesson.slug}: missing upstream ${sourcePath}`);
    continue;
  }

  let rewritten = content;
  for (const [from, to] of importRewrites) {
    rewritten = rewritten.split(to).join(from); // idempotence guard: normalize first
    rewritten = rewritten.split(from).join(to);
  }

  // Fidelity: reversing the import rewrite must restore the source bytes.
  let restored = rewritten;
  for (const [from, to] of importRewrites) {
    restored = restored.split(to).join(from);
  }
  if (restored !== content) {
    failures.push(`${lesson.slug}: fidelity check failed (transform is not import-only)`);
    continue;
  }

  writeFileSync(targetPath, rewritten);
  ported += 1;
}

if (failures.length) {
  console.error(failures.join("\n"));
  console.error(`\nport-ccss-lessons: ${failures.length} failure(s).`);
  process.exit(1);
}
console.log(`port-ccss-lessons: ported ${ported}/${snapshot.lessons.length} lesson bodies into ${outDir}`);
