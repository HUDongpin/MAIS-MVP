/**
 * Generates the client-safe topic-metadata snapshot consumed by @/data/topicsMetadata.
 *
 * Why this exists: `@/data/topics` aggregates the per-region topic modules, and each
 * of those statically imports its multi-MB question-bank JSON to *derive* topic
 * metadata at module-eval. Any client component that imports `@/data/topics` therefore
 * ships tens of MB of question banks to the browser. The roadmap components only need
 * the derived `Topic[]` metadata (id / title / grade / status / mastery / …), never the
 * questions, so we snapshot that metadata here and let the client import the snapshot
 * instead of the bank-deriving graph.
 *
 * Regenerate after changing any region topic module:
 *   node --import tsx scripts/generate-topics-metadata.mts
 *
 * `data/topicsMetadata.test.ts` fails if this snapshot drifts from the live `topics`.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_PATH = path.join(REPO_ROOT, "data/generated-content/topics-metadata/topics-metadata.json");

async function main() {
  const { topics } = await import("@/data/topics");
  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(topics, null, 2)}\n`, "utf8");
  console.log(`Wrote ${topics.length} topics to ${path.relative(REPO_ROOT, OUTPUT_PATH)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
