import { writeFile } from "node:fs/promises";
import path from "node:path";

import {
  activeHongKongQuestionIdByHistoricalId,
  retiredHongKongQuestionIds
} from "@/data/questions";
import { HONG_KONG_QUESTION_HISTORY_SOURCE_COMMIT } from "@/lib/hongKongQuestionVersioningContract";

async function main() {
  const [outputPath] = process.argv.slice(2);
  if (!outputPath) {
    throw new Error("Usage: generate-hk-question-version-manifest <output-path>");
  }

  const activeEntries = [...activeHongKongQuestionIdByHistoricalId.entries()]
    .sort(([left], [right]) => left.localeCompare(right));
  const payload = {
    schemaVersion: 1,
    historySourceCommit: HONG_KONG_QUESTION_HISTORY_SOURCE_COMMIT,
    activeIdByHistoricalId: Object.fromEntries(activeEntries),
    retiredHistoricalIds: [...retiredHongKongQuestionIds].sort((left, right) => left.localeCompare(right))
  };

  const resolvedOutputPath = path.resolve(outputPath);
  await writeFile(resolvedOutputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  process.stdout.write(
    `wrote ${activeEntries.length} HK ID mappings and ${payload.retiredHistoricalIds.length} retired IDs\n`
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
